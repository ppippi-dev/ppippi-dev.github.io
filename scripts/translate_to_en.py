#!/usr/bin/env python3
import os
import re
import argparse
import sys
from pathlib import Path

import frontmatter
import yaml
from slugify import slugify

try:
    from openai import OpenAI
except Exception:
    print("[ERROR] openai package not available. Make sure it's installed.")
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = REPO_ROOT / "_posts"
POSTS_EN_DIR = REPO_ROOT / "_posts_en"


PROMPT_SYSTEM = (
    "You are an expert technical writer and translator. Translate the given Korean Jekyll blog post content into natural, concise American English.\n"
    "- Preserve front matter keys; translate 'title' and any 'description' or 'summary' fields to English.\n"
    "- Keep Markdown structure, headings, code blocks, links, images, and footnotes intact.\n"
    "- Do not hallucinate code or change code semantics.\n"
    "- Maintain YAML front matter formatting.\n"
    "- If there is mixed language, prefer English.\n"
)


def normalize_repo_path(path_like: str | Path) -> Path:
    p = Path(path_like)
    return (REPO_ROOT / p).resolve() if not p.is_absolute() else p.resolve()


def load_korean_posts(only_paths: list[Path] | None = None) -> list[Path]:
    if only_paths:
        results: list[Path] = []
        for p in only_paths:
            abs_p = normalize_repo_path(p)
            try:
                abs_p.relative_to(POSTS_DIR)
            except ValueError:
                # skip files outside _posts
                continue
            if abs_p.exists() and abs_p.suffix == ".md":
                results.append(abs_p)
        # de-duplicate and sort
        return sorted({p for p in results})
    return sorted(POSTS_DIR.glob("*.md"))


def to_en_filename(source_path: Path, en_title: str) -> Path:
    # source: YYYY-MM-DD-title.md -> keep date, replace slug with English slug
    date_prefix = source_path.name.split("-", 3)[:3]
    # Build english slug from translated title
    en_slug = slugify(en_title)
    filename = f"{date_prefix[0]}-{date_prefix[1]}-{date_prefix[2]}-{en_slug}.md"
    return POSTS_EN_DIR / filename


def needs_translation(src_file: Path) -> bool:
    try:
        post = frontmatter.load(src_file)
    except Exception:
        return True
    title = str(post.get("title", ""))
    # If corresponding EN file already exists, skip
    en_filename = to_en_filename(src_file, title or src_file.stem)
    if en_filename.exists():
        return False
    # If any file on the same date exists in _posts_en, we might have different slug; check by date
    date_prefix = "-".join(src_file.name.split("-", 3)[:3])
    matches = list(POSTS_EN_DIR.glob(f"{date_prefix}-*.md"))
    return len(matches) == 0


def build_prompt(post: frontmatter.Post) -> str:
    fm_yaml = yaml.safe_dump(dict(post), allow_unicode=True, sort_keys=False).strip()
    content = post.content
    return (
        "Translate the following Jekyll Markdown post to English.\n\n"
        "---\n" + fm_yaml + "\n---\n\n" + content
    )


def call_openai(model: str, system_prompt: str, user_prompt: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OPENAI_API_KEY is not set. Skipping translation.")
        sys.exit(2)
    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content


def split_front_matter(translated_markdown: str) -> tuple[dict, str]:
    # Expect YAML front matter at the top
    m = re.match(r"^---\n([\s\S]+?)\n---\n?([\s\S]*)$", translated_markdown.strip())
    if not m:
        return {}, translated_markdown
    fm_text, body = m.group(1), m.group(2)
    try:
        fm = yaml.safe_load(fm_text) or {}
        if not isinstance(fm, dict):
            fm = {}
    except Exception:
        fm = {}
    return fm, body


def ensure_posts_en_dir():
    POSTS_EN_DIR.mkdir(parents=True, exist_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Translate Korean _posts to English _posts_en"
    )
    parser.add_argument(
        "--only", nargs="*", help="Only translate these paths under _posts/"
    )
    args = parser.parse_args()

    ensure_posts_en_dir()
    model = os.environ.get("TRANSLATION_MODEL", "gpt-5.1-mini")
    only_files: list[str] = []
    if args.only:
        only_files.extend(args.only)
    env_only = os.environ.get("ONLY_FILES")
    if env_only:
        only_files.extend(
            [line.strip() for line in env_only.splitlines() if line.strip()]
        )

    only_paths = [Path(p) for p in only_files] if only_files else None

    created = 0
    force = only_paths is not None
    for src in load_korean_posts(only_paths):
        if not force and not needs_translation(src):
            continue
        post = frontmatter.load(src)
        prompt = build_prompt(post)
        translated = call_openai(model, PROMPT_SYSTEM, prompt)
        fm, body = split_front_matter(translated)

        # Fallbacks if model didn't preserve FM properly
        if not fm:
            fm = dict(post)
        if "title" not in fm or not fm["title"]:
            fm["title"] = dict(post).get("title", "")

        # Construct english filename from translated title
        en_path = to_en_filename(src, str(fm.get("title", src.stem)))
        en_post = frontmatter.Post(body, **fm)
        with open(en_path, "w", encoding="utf-8") as f:
            f.write(frontmatter.dumps(en_post))
        print(f"[translate] Created: {en_path.relative_to(REPO_ROOT)}")
        created += 1

    print(f"[translate] New English posts: {created}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

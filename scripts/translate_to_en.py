#!/usr/bin/env python3
import os
import re
import argparse
import sys
from pathlib import Path

import frontmatter
import yaml

try:
    from openai import OpenAI
except ImportError:
    print("[ERROR] openai package not available. Make sure it's installed.")
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = REPO_ROOT / "src" / "content" / "blog"
POSTS_EN_DIR = REPO_ROOT / "src" / "content" / "blog-en"


PROMPT_SYSTEM = """You are an expert technical writer and translator specializing in MLOps, LLMOps, and AI infrastructure content.

## Task
Translate the given Korean Astro blog post into professional, SEO-optimized American English.

## SEO & Front Matter Guidelines
- **title**: Create a compelling, keyword-rich title (50-60 characters ideal). Include primary keywords like tool names, technologies, or concepts.
- **description**: Write a clear meta description (150-160 characters) that includes target keywords and encourages clicks. Summarize the value proposition.
- Preserve all other front matter keys (pubDate, tags, etc.) exactly as they are.

## Content Translation Guidelines
- Write in a professional yet approachable tone suitable for a senior engineer audience.
- Preserve technical accuracy - do NOT change code, commands, configurations, or technical terms.
- Keep the author's voice and personal experiences intact (e.g., "In my experience...", "I found that...").
- Maintain all Markdown structure: headings, code blocks, links, images, lists, blockquotes.
- Translate Korean technical jargon to commonly accepted English equivalents.
- Keep product names, tool names, and proper nouns unchanged (e.g., mcp-context-forge, Kubernetes, PostgreSQL).
- For headings, use clear and descriptive phrases that work well for SEO and readability.

## Quality Standards
- Use active voice where possible.
- Be concise - remove filler words common in Korean-to-English translation.
- Ensure the translation reads naturally, as if originally written in English.
- Do NOT add or remove content - translate faithfully.
- Do NOT change the filename or slug.

## Output Format
Return the complete translated Markdown file with YAML front matter.
- IMPORTANT: The title and description MUST be translated to English. Do NOT keep them in Korean.
- Do NOT wrap the output in markdown code blocks (no ``` markers).
- Start directly with --- and the YAML front matter."""


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
                continue
            if abs_p.exists() and abs_p.suffix == ".md":
                results.append(abs_p)
        return sorted({p for p in results})
    return sorted(POSTS_DIR.glob("**/*.md"))


def to_en_filename(source_path: Path) -> Path:
    relative_path = source_path.relative_to(POSTS_DIR)
    return POSTS_EN_DIR / relative_path


def needs_translation(src_file: Path) -> bool:
    en_filename = to_en_filename(src_file)
    return not en_filename.exists()


def build_prompt(post: frontmatter.Post) -> str:
    fm_yaml = yaml.safe_dump(dict(post), allow_unicode=True, sort_keys=False).strip()
    content = post.content
    return (
        "Translate the following Astro Markdown post to English.\n\n"
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


def strip_markdown_codeblock(text: str) -> str:
    """Strip markdown code block wrappers if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return text.strip()


def contains_korean(text: str) -> bool:
    """Check if text contains Korean characters (Hangul)."""
    for char in str(text):
        if "\uac00" <= char <= "\ud7a3" or "\u1100" <= char <= "\u11ff":
            return True
    return False


def split_front_matter(translated_markdown: str) -> tuple[dict, str]:
    text = strip_markdown_codeblock(translated_markdown)

    patterns = [
        r"^---\s*\n([\s\S]+?)\n---\s*\n?([\s\S]*)$",
        r"^---\s*\n([\s\S]+?)\n---\s*([\s\S]*)$",
        r"^-{3,}\s*\n([\s\S]+?)\n-{3,}\s*\n?([\s\S]*)$",
    ]

    m = None
    for pattern in patterns:
        m = re.match(pattern, text)
        if m:
            break

    if not m:
        print(f"[translate] Debug: Could not match frontmatter. First 300 chars:")
        print(text[:300])
        return {}, text

    fm_text, body = m.group(1), m.group(2)
    try:
        fm = yaml.safe_load(fm_text) or {}
        if not isinstance(fm, dict):
            print(f"[translate] Debug: Parsed YAML is not a dict: {type(fm)}")
            fm = {}
    except yaml.YAMLError as e:
        print(f"[translate] Debug: YAML parse error: {e}")
        print(f"[translate] Debug: FM text:\n{fm_text[:300]}")
        fm = {}
    return fm, body


def ensure_posts_en_dir():
    POSTS_EN_DIR.mkdir(parents=True, exist_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Translate Korean blog posts to English"
    )
    parser.add_argument(
        "--only", nargs="*", help="Only translate these paths under src/content/blog/"
    )
    args = parser.parse_args()

    ensure_posts_en_dir()
    model = os.environ.get("TRANSLATION_MODEL", "gpt-4.1-mini")
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
        original_fm = dict(post)

        if not fm:
            print(f"[translate] Warning: Could not parse frontmatter, using original")
            fm = original_fm.copy()

        for key in original_fm:
            if key not in fm:
                fm[key] = original_fm[key]

        if contains_korean(fm.get("title", "")):
            print(f"[translate] Warning: title still contains Korean: {fm.get('title')}")
        if contains_korean(fm.get("description", "")):
            print(f"[translate] Warning: description still contains Korean")

        en_path = to_en_filename(src)
        en_path.parent.mkdir(parents=True, exist_ok=True)

        if en_path.exists():
            try:
                en_path.unlink()
                print(f"[translate] Overwriting existing: {en_path.relative_to(REPO_ROOT)}")
            except OSError:
                pass

        en_post = frontmatter.Post(body, **fm)
        with open(en_path, "w", encoding="utf-8") as f:
            f.write(frontmatter.dumps(en_post))
        print(f"[translate] Created/Updated: {en_path.relative_to(REPO_ROOT)}")
        created += 1

    print(f"[translate] New English posts: {created}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Generate sitemap.xml and feed.xml from local posts."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import List, Optional

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "_config.yml"
POSTS_DIR = ROOT / "_posts"
POSTS_EN_DIR = ROOT / "_posts_en"
OUTPUT_SITEMAP = ROOT / "sitemap.xml"
OUTPUT_FEED = ROOT / "feed.xml"
DEFAULT_FEED_LIMIT = 25


@dataclass
class PageEntry:
    title: str
    url_path: str
    published_at: datetime
    description: str
    lastmod_iso: str
    tags: List[str]
    language: str


@dataclass
class StaticEntry:
    url_path: str
    lastmod_iso: Optional[str]


def strip_quotes(value: str) -> str:
    if not value:
        return ""
    if value[0] in {"'", '"'} and value[-1:] == value[0]:
        return value[1:-1]
    return value


def load_site_config() -> dict:
    url = ""
    baseurl = ""
    title = "Blog"
    description = ""
    in_theme = False
    theme_indent: Optional[int] = None

    with CONFIG_PATH.open(encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.rstrip("\n")
            stripped = line.strip()

            if not stripped or stripped.startswith("#"):
                continue

            indent = len(line) - len(line.lstrip(" "))

            if stripped.startswith("theme_settings:"):
                in_theme = True
                theme_indent = indent
                continue

            if in_theme and indent <= (theme_indent or 0):
                in_theme = False

            if in_theme:
                if ":" not in stripped:
                    continue
                key, value = stripped.split(":", 1)
                key = key.strip()
                value = strip_quotes(value.strip())
                if key == "title" and value:
                    title = value
                elif key == "description" and value:
                    description = value
                continue

            if ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = strip_quotes(value.strip())
            if key == "url" and value:
                url = value.rstrip("/")
            elif key == "baseurl":
                baseurl = value.strip("/")

    if baseurl:
        base_url = f"{url}/{baseurl}" if url else f"/{baseurl}"
    else:
        base_url = url or ""

    return {
        "base_url": base_url.rstrip("/") if base_url else "",
        "title": title,
        "description": description,
    }


def load_post(path: Path) -> tuple[dict, str]:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return {}, raw

    lines = raw.splitlines()
    closing_index: Optional[int] = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            closing_index = idx
            break

    if closing_index is None:
        return {}, raw

    fm_content = "\n".join(lines[1:closing_index])
    body = "\n".join(lines[closing_index + 1 :])

    metadata = parse_simple_front_matter(fm_content)

    return metadata, body


def parse_simple_front_matter(front_matter: str) -> dict:
    if not front_matter.strip():
        return {}

    metadata: dict = {}
    lines = front_matter.splitlines()
    idx = 0
    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            idx += 1
            continue

        if ":" not in stripped:
            idx += 1
            continue

        key_part, value_part = stripped.split(":", 1)
        key = key_part.strip()
        value = value_part.strip()

        # Multiline list support (e.g. tags: \n- item)
        if not value:
            idx += 1
            items: List[str] = []
            while idx < len(lines):
                follower = lines[idx].strip()
                if follower.startswith("- "):
                    items.append(strip_quotes(follower[2:].strip()))
                    idx += 1
                elif not follower:
                    idx += 1
                else:
                    break
            metadata[key] = items
            continue

        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1]
            parts = [part.strip() for part in inner.split(",") if part.strip()]
            metadata[key] = [strip_quotes(part) for part in parts]
        else:
            metadata[key] = strip_quotes(value)

        idx += 1

    return metadata


def parse_post_path(path: Path, prefix: str = "", language: str = "ko") -> Optional[PageEntry]:
    stem = path.stem  # e.g. 2025-05-03-gke-iam-role
    parts = stem.split("-", 3)
    if len(parts) < 4:
        return None
    year, month, day, slug = parts[0], parts[1], parts[2], parts[3]

    try:
        published_at = datetime(
            year=int(year), month=int(month), day=int(day), tzinfo=timezone.utc
        )
    except ValueError:
        return None

    metadata, content = load_post(path)

    title = metadata.get("title") or slug.replace("-", " ").title()
    subtitle = metadata.get("subtitle")
    description = (subtitle or extract_excerpt(content)).strip()

    tags = metadata.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]

    url_path = f"/{published_at:%Y/%m/%d}/{slug}/"
    if prefix:
        url_path = f"/{prefix}{url_path}"

    lastmod_iso = git_last_modified_iso(path)

    return PageEntry(
        title=title.strip(),
        url_path=url_path,
        published_at=published_at,
        description=description,
        lastmod_iso=lastmod_iso,
        tags=[str(tag) for tag in tags],
        language=language,
    )


def extract_excerpt(content: str, max_words: int = 50) -> str:
    text = (content or "").strip()
    if not text:
        return ""

    # Take the first paragraph to avoid overly long excerpts.
    paragraph = text.split("\n\n", 1)[0]
    words = paragraph.split()
    if len(words) <= max_words:
        return paragraph
    return " ".join(words[:max_words]) + "..."


def git_last_modified_iso(path: Path) -> str:
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cI", str(path.relative_to(ROOT))],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    timestamp = (result.stdout or "").strip()
    if timestamp:
        return timestamp
    return datetime.now(timezone.utc).isoformat()


def collect_posts() -> List[PageEntry]:
    entries: List[PageEntry] = []
    for directory, prefix, language in (
        (POSTS_DIR, "", "ko"),
        (POSTS_EN_DIR, "en", "en"),
    ):
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.md")):
            entry = parse_post_path(path, prefix=prefix, language=language)
            if entry:
                entries.append(entry)
    entries.sort(key=lambda item: item.published_at, reverse=True)
    return entries


def collect_static_pages() -> List[StaticEntry]:
    static_files = [
        Path("index.html"),
        Path("tags.html"),
        Path("search.html"),
        Path("en/index.html"),
        Path("en/tags.html"),
    ]
    entries: List[StaticEntry] = []
    for rel_path in static_files:
        absolute_path = ROOT / rel_path
        if not absolute_path.exists():
            continue
        url_path = path_to_url(rel_path)
        lastmod_iso = git_last_modified_iso(absolute_path)
        entries.append(StaticEntry(url_path=url_path, lastmod_iso=lastmod_iso))
    return entries


def path_to_url(path: Path) -> str:
    parts = path.as_posix()
    if parts.endswith("index.html"):
        without_index = parts[: -len("index.html")]
        return f"/{without_index}" if without_index else "/"
    return f"/{parts}"


def absolute_url(base_url: str, path: str) -> str:
    clean_base = (base_url or "").rstrip("/")
    if not path or path == "/":
        return f"{clean_base}/" if clean_base else "/"
    if path.startswith("/"):
        return f"{clean_base}{path}" if clean_base else path
    return f"{clean_base}/{path}" if clean_base else f"/{path}"


def build_sitemap(base_url: str, pages: List[StaticEntry], posts: List[PageEntry]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    for entry in pages:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{escape_xml(absolute_url(base_url, entry.url_path))}</loc>",
                f"    <lastmod>{entry.lastmod_iso}</lastmod>",
                "  </url>",
            ]
        )

    for post in posts:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{escape_xml(absolute_url(base_url, post.url_path))}</loc>",
                f"    <lastmod>{post.lastmod_iso}</lastmod>",
                "  </url>",
            ]
        )

    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def build_feed(base_url: str, title: str, description: str, posts: List[PageEntry]) -> str:
    korean_posts = [post for post in posts if post.language == "ko"]
    latest_updated = (
        korean_posts[0].published_at if korean_posts else datetime.now(timezone.utc)
    )

    lines = ["---", "layout: null", "---"]
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
    lines.append("  <channel>")
    lines.append(f"    <title>{escape_xml(title)}</title>")
    lines.append(
        f"    <atom:link href=\"{escape_xml(absolute_url(base_url, 'feed.xml'))}\" rel=\"self\" type=\"application/rss+xml\"/>"
    )
    home_link = absolute_url(base_url, "/")
    lines.append(f"    <link>{escape_xml(home_link)}</link>")
    lines.append(f"    <description>{escape_xml(description)}</description>")
    lines.append(f"    <lastBuildDate>{format_datetime(latest_updated)}</lastBuildDate>")

    for post in korean_posts[:DEFAULT_FEED_LIMIT]:
        lines.append("    <item>")
        lines.append(f"      <title>{escape_xml(post.title)}</title>")
        item_link = absolute_url(base_url, post.url_path)
        lines.append(f"      <link>{escape_xml(item_link)}</link>")
        lines.append(f"      <guid isPermaLink=\"true\">{escape_xml(item_link)}</guid>")
        if post.description:
            lines.append(f"      <description>{escape_xml(post.description)}</description>")
        lines.append(f"      <pubDate>{format_datetime(post.published_at)}</pubDate>")
        for tag in post.tags:
            lines.append(f"      <category>{escape_xml(tag)}</category>")
        lines.append("    </item>")

    lines.append("  </channel>")
    lines.append("</rss>")
    lines.append("")
    return "\n".join(lines)


def escape_xml(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def write_output(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def main() -> None:
    config = load_site_config()
    base_url = config.get("base_url") or ""
    posts = collect_posts()
    pages = collect_static_pages()

    sitemap = build_sitemap(base_url, pages, posts)
    feed = build_feed(base_url, config.get("title", "Blog"), config.get("description", ""), posts)

    write_output(OUTPUT_SITEMAP, sitemap)
    write_output(OUTPUT_FEED, feed)


if __name__ == "__main__":
    main()

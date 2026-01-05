#!/usr/bin/env python3
"""
Generate redirect mappings from old Jekyll URLs to new Astro URLs.
Parses 404 CSV from Google Search Console and matches with current blog posts.
"""

import csv
import os
import re
from pathlib import Path
from urllib.parse import urlparse, unquote

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
BLOG_DIR = PROJECT_ROOT / "src" / "content" / "blog"
BLOG_EN_DIR = PROJECT_ROOT / "src" / "content" / "blog-en"
CSV_FILE = PROJECT_ROOT / "404" / "테이블.csv"


def get_blog_slugs():
    """Extract slugs from blog markdown files."""
    slugs = set()
    for md_file in BLOG_DIR.glob("*.md"):
        # Remove .md extension to get slug
        slug = md_file.stem
        slugs.add(slug)
    return slugs


def parse_old_url(url: str) -> dict | None:
    """
    Parse old Jekyll URL pattern.
    Examples:
        /2022/01/29/AWS-SAA/ -> {slug: 'AWS-SAA', lang: 'ko'}
        /en/2022/08/17/terraform-3/ -> {slug: 'terraform-3', lang: 'en'}
        /tags.html -> {type: 'static', path: '/tags/'}
    """
    parsed = urlparse(url)
    path = unquote(parsed.path).rstrip("/")

    # Static pages
    if path == "/tags.html":
        return {"type": "static", "old": "/tags.html", "new": "/tags/"}
    if path == "/en/tags.html":
        return {"type": "static", "old": "/en/tags.html", "new": "/en/tags/"}
    if path == "/search.html":
        return {"type": "static", "old": "/search.html", "new": "/search/"}

    # English posts: /en/YYYY/MM/DD/slug
    en_match = re.match(r"^/en/(\d{4})/(\d{2})/(\d{2})/(.+)$", path)
    if en_match:
        slug = en_match.group(4)
        return {"type": "post", "slug": slug, "lang": "en", "old": path + "/"}

    # Korean posts: /YYYY/MM/DD/slug
    ko_match = re.match(r"^/(\d{4})/(\d{2})/(\d{2})/(.+)$", path)
    if ko_match:
        slug = ko_match.group(4)
        return {"type": "post", "slug": slug, "lang": "ko", "old": path + "/"}

    return None


def normalize_slug(slug: str, available_slugs: set) -> str | None:
    """
    Try to match old slug with available slugs.
    Handles various transformations:
    - URL encoding (한글)
    - Hyphen/space variations
    - Case sensitivity
    """
    # Direct match
    if slug in available_slugs:
        return slug

    # Try replacing hyphens with spaces (for filenames with spaces)
    slug_with_spaces = slug.replace("-", " ")
    for avail in available_slugs:
        if avail.lower() == slug_with_spaces.lower():
            return avail
        if avail.lower() == slug.lower():
            return avail

    # Korean slug mappings (manual)
    korean_mappings = {
        "keda-사용하기": "using-keda-pubsub-autoscaling",
        "GKE-워크로드아이덴티티": "gke-workload-identity",
        "GKE업데이트": "gke-automatic-updates",
        "GCP-GKE자동배포": "gcp-gke-automated-deployment",
        "k8s구성하기": "setting-up-kubernetes",
        "pvc용량증축하기": "expanding-pvc-capacity",  # Not found
        "namespace지우기": "deleting-stuck-namespace",  # Not found
        "2022년회고": "2022-retrospective",
        "회고1": "new-developer-retrospective",
        "간단한Git사용법-협업합시다": "basic-git-usage-for-collaboration",  # Not found
        "AWS-웹사이트운영하기(Django)": "aws-deploy-django-website",  # Not found
        "Cloud-Jam-중급반": "cloud-jam-intermediate-notes",  # Not found
        "간단한대쉬보드": "building-simple-dashboard",  # Not found
        "GCP이미지푸쉬": "pushing-gcp-container-images",  # Not found
        "고객을끌어오는구글애널리틱스4": "google-analytics-4-book-review",  # Not found
        "환경변수-추가하기": "managing-env-variables",  # Not found
        "환경변수 추가하기": "managing-env-variables",  # Not found
        "AWS-아마존-웹서비스": "aws-amazon-web-services-cloud-computing",
        "AWS - 아마존 웹서비스": "aws-amazon-web-services-cloud-computing",
        "Github-Action을-이용한-CI구축하기": "building-ci-with-github-actions",
        "Github Action을 이용한 CI구축하기": "building-ci-with-github-actions",
        "keda 사용하기": "using-keda-pubsub-autoscaling",
        "AWS-SAA후기": "aws-saa-exam-review",
        "AWS-RDS구축하기_new": "aws-rds-setup-new",  # Not found
    }

    if slug in korean_mappings:
        mapped = korean_mappings[slug]
        if mapped in available_slugs:
            return mapped

    return None


def generate_redirects():
    """Generate redirect mappings from 404 CSV."""
    available_slugs = get_blog_slugs()
    redirects = {}
    unmatched = []

    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("URL", "")
            if not url:
                continue

            parsed = parse_old_url(url)
            if not parsed:
                continue

            if parsed["type"] == "static":
                redirects[parsed["old"]] = parsed["new"]
            elif parsed["type"] == "post":
                slug = parsed["slug"]
                lang = parsed["lang"]

                matched_slug = normalize_slug(slug, available_slugs)
                if matched_slug:
                    old_path = parsed["old"]
                    if lang == "en":
                        new_path = f"/en/blog/{matched_slug}/"
                    else:
                        new_path = f"/blog/{matched_slug}/"
                    redirects[old_path] = new_path
                else:
                    unmatched.append((url, slug))

    return redirects, unmatched


def format_redirects_for_astro(redirects: dict) -> str:
    """Format redirects as Astro config."""
    lines = []
    for old, new in sorted(redirects.items()):
        # Escape single quotes
        old_escaped = old.replace("'", "\\'")
        new_escaped = new.replace("'", "\\'")
        lines.append(f"    '{old_escaped}': '{new_escaped}',")
    return "\n".join(lines)


if __name__ == "__main__":
    redirects, unmatched = generate_redirects()

    print(f"=== Generated {len(redirects)} redirects ===\n")
    print("// Add to astro.config.mjs:")
    print("redirects: {")
    print(format_redirects_for_astro(redirects))
    print("}")

    if unmatched:
        print(f"\n=== {len(unmatched)} unmatched URLs (may need manual mapping or are deleted posts) ===")
        for url, slug in unmatched:
            print(f"  {slug}")

#!/usr/bin/env python3
"""Create five deep-linkable same-origin staff workspace shells.

Source of truth: staff/index.html. No JS/CSS/application logic is duplicated
manually; every page loads the same authenticated staff app and Google backend.
Run: python3 tools/build-staff-workspaces-v50.py
Check: python3 tools/build-staff-workspaces-v50.py --check
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "staff/index.html"
WORKSPACES = {
    "consult": ("상담·등록", "상담 접수와 아이 등록"),
    "classes": ("클래스 운영", "클래스 일정·출결·보강"),
    "sensory": ("오감놀이 준비", "월간 테마·재료·안전"),
    "fees-documents": ("이용료·문서", "이용료·환불·보호자 서류"),
    "management": ("스튜디오 관리", "운영정보·직원·재무"),
}

def render(staff_source: str, slug: str, label: str) -> str:
    if 'name="bw50-section"' in staff_source:
        raise ValueError("Root staff page must not include a workspace-specific marker")
    original_title = "<title>브릿지 원더 | 직원 운영 관리</title>"
    if staff_source.count(original_title) != 1:
        raise ValueError("Unexpected staff shell title")
    if 'staff-workspace-routes-v50.js?v=50.0.0' not in staff_source:
        raise ValueError("V50 workspace router missing from source shell")
    content = staff_source.replace(
        original_title,
        f'<meta name="bw50-section" content="{slug}">\n'
        f'  <title>브릿지 원더 | {label} · 직원 운영</title>',
        1,
    )
    # New pages are exactly one directory deeper than /staff/index.html.
    content = content.replace('../assets/', '../../assets/')
    return content

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="Verify generated pages match the canonical source")
    args = parser.parse_args()
    source = SOURCE.read_text(encoding="utf-8")
    changed: list[str] = []
    for slug, (label, _) in WORKSPACES.items():
        target = ROOT / "staff" / slug / "index.html"
        generated = render(source, slug, label)
        previous = target.read_text(encoding="utf-8") if target.exists() else ""
        if previous != generated:
            changed.append(target.relative_to(ROOT).as_posix())
            if not args.check:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(generated, encoding="utf-8")
    if args.check and changed:
        raise SystemExit("Outdated workspace entrypoints: " + ", ".join(changed)
                         + ". Run python3 tools/build-staff-workspaces-v50.py")
    print(("Verified" if args.check else "Generated"), len(WORKSPACES),
          "staff workspace routes.")

if __name__ == "__main__":
    main()

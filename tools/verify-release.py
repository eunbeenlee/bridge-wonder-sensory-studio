#!/usr/bin/env python3
"""Offline, read-only release checks. Requires Python 3, Node.js and Git history.

Run from any directory: python3 tools/verify-release.py
CI checkout must include the --theme-base commit (use fetch-depth: 0).
The layout builder runs in an isolated temporary directory, never in the checkout.
"""
from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
THEME_BASE = "f995dff0fad304703ac6e413b0a3c9319d29cfe7"
EXCLUDED = {"node_modules", ".git", "__pycache__", ".venv", "venv", "outputs",
            "test-results", "inputs", "chat_files", "private", ".secrets"}
SCRIPT_SUFFIXES = {".js", ".cjs", ".mjs", ".gs"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".avif"}
ALLOWED_THEME_ADDITIONS = {"assets/css/administration-payroll.css", "assets/css/staff-ux-v31.css", "assets/css/staff-enterprise-v33.css", "assets/css/staff-polish-v34.css", "assets/css/sensory-polish-v35.css", "assets/css/staff-academic-v37.css", "assets/css/staff-compliance-v32.css", "assets/css/staff-sensory-v39.css", "assets/css/staff-enterprise-v40.css", "assets/css/sensory-family-v44.css", "assets/css/staff-finance-v49.css", "assets/css/staff-content-v51.css", "assets/css/staff-content-v52.css", "assets/css/staff-fresh-v52.css", "assets/css/staff-modern-v53.css", "assets/img/staff-v52-beaver.webp", "assets/img/staff-brand-mark.png"}
errors: list[str] = []
stats: Counter = Counter()


def error(where: str, message: str) -> None:
    errors.append(f"{where}: {message}")


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def files() -> list[Path]:
    """Do not descend into dependencies, credentials or uploaded private inputs."""
    found = []
    for directory, children, names in os.walk(ROOT, followlinks=False):
        children[:] = sorted(name for name in children
                             if name not in EXCLUDED and not name.startswith(".")
                             and not (Path(directory) / name).is_symlink())
        found.extend(Path(directory) / name for name in sorted(names)
                     if not name.startswith(".") and not (Path(directory) / name).is_symlink())
    return found


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError) as exc:
        error(relative(path), f"cannot read UTF-8 text: {exc}")
        return ""


def check_json(text: str, label: str) -> None:
    def reject_constant(value):
        raise ValueError(f"non-JSON constant {value}")
    try:
        json.loads(text, parse_constant=reject_constant)
        stats["json"] += 1
    except (ValueError, TypeError) as exc:
        error(label, f"invalid JSON: {exc}")


class Page(HTMLParser):
    def __init__(self, path: Path, host: str):
        super().__init__(convert_charrefs=True)
        self.path, self.label = path, relative(path)
        self.base_url = f"https://{host}/{self.label}"
        self.ids: dict[str, int] = {}
        self.anchors: set[str] = set()
        self.links: list[tuple[str, str, int]] = []
        self.references: list[tuple[str, str, int]] = []
        self.scripts: list[tuple[str, str, str]] = []
        self.current_script = None
        self.feed(read_text(path))
        self.close()

    def handle_starttag(self, tag, attributes):
        line = self.getpos()[0]
        attrs = dict(attributes)
        for key, count in Counter(key for key, _ in attributes).items():
            if count > 1:
                error(f"{self.label}:{line}", f"duplicate {key!r} attribute on <{tag}>")
        classes = (attrs.get("class") or "").split()
        repeated = [name for name, count in Counter(classes).items() if count > 1]
        if repeated:
            error(f"{self.label}:{line}", f"duplicate class tokens: {', '.join(repeated)}")
        if "id" in attrs:
            identity = attrs["id"] or ""
            if not identity or re.search(r"\s", identity):
                error(f"{self.label}:{line}", f"invalid id {identity!r}")
            if identity in self.ids:
                error(f"{self.label}:{line}", f"duplicate id {identity!r} (first at line {self.ids[identity]})")
            self.ids[identity] = line
        if tag == "a" and attrs.get("name"):
            self.anchors.add(attrs["name"])
        if tag == "base" and attrs.get("href"):
            self.base_url = urljoin(self.base_url, attrs["href"])
        for name in ("href", "src", "action", "poster", "xlink:href"):
            if attrs.get(name) and tag != "base":
                self.links.append((attrs[name], f"{tag}[{name}]", line))
        if tag == "object" and attrs.get("data"):
            self.links.append((attrs["data"], "object[data]", line))
        if attrs.get("srcset"):
            # A data URL may contain commas; split candidates only after its descriptor.
            for match in re.finditer(r"(?:^|,\s*)(data:[^\s]+|[^,\s]+)(?:\s+[^,]+)?", attrs["srcset"]):
                self.links.append((match.group(1), f"{tag}[srcset]", line))
        for name in ("aria-controls", "aria-labelledby", "aria-describedby", "aria-owns",
                     "aria-activedescendant", "aria-details", "headers", "for", "list", "form"):
            if attrs.get(name):
                self.references.extend((value, name, line) for value in attrs[name].split())
        if tag == "meta" and (attrs.get("http-equiv") or "").lower() == "refresh":
            match = re.search(r"url\s*=\s*['\"]?(.*?)['\"]?$", attrs.get("content") or "", re.I)
            if match:
                self.links.append((match.group(1), "meta[refresh]", line))
        for name, value in attributes:
            if name.startswith("on") and value:
                self.scripts.append((f"{self.label}:{line} {name}", "commonjs", f"function handler(event){{\n{value}\n}}"))
        if tag == "script":
            self.current_script = {"line": line, "type": (attrs.get("type") or "").lower(),
                                   "src": attrs.get("src"), "chunks": []}

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if self.current_script is not None:
            self.current_script["chunks"].append(data)

    def handle_endtag(self, tag):
        if tag != "script" or self.current_script is None:
            return
        part, self.current_script = self.current_script, None
        body = "".join(part["chunks"])
        label = f"{self.label}:{part['line']} inline script"
        if part["src"] or not body.strip():
            return
        if part["type"] in {"application/ld+json", "application/json", "importmap", "speculationrules"}:
            check_json(body, label)
        elif part["type"] in {"", "text/javascript", "application/javascript", "module"}:
            self.scripts.append((label, "module" if part["type"] == "module" else "commonjs", body))


def check_link(page: Page, raw: str, kind: str, line: int, pages: dict[Path, Page], host: str) -> None:
    raw = raw.strip()
    if not raw or raw.startswith("#:"):
        return
    try:
        url = urlsplit(urljoin(page.base_url, raw))
    except ValueError as exc:
        error(f"{page.label}:{line}", f"invalid {kind} URL: {exc}")
        return
    if url.scheme not in {"http", "https"} or url.hostname != host:
        stats["external_references_skipped"] += 1
        return
    path = (ROOT / unquote(url.path).lstrip("/")).resolve()
    if not path.is_relative_to(ROOT):
        error(f"{page.label}:{line}", f"{kind} escapes the site root")
        return
    if path.is_dir():
        path /= "index.html"
    if not path.is_file():
        error(f"{page.label}:{line}", f"missing {kind} target {raw!r}")
        return
    stats["local_references"] += 1
    fragment = unquote(url.fragment).split(":~:text=", 1)[0]
    if fragment and path in pages:
        target = pages[path]
        if fragment not in target.ids and fragment not in target.anchors and fragment.lower() != "top":
            error(f"{page.label}:{line}", f"missing fragment #{fragment} in {relative(path)}")


def check_pages(paths: list[Path], host: str) -> list[tuple[str, str, str]]:
    pages = {path: Page(path, host) for path in paths if path.suffix.lower() == ".html"}
    scripts = []
    for page in pages.values():
        stats["html"] += 1
        for identity, name, line in page.references:
            if identity not in page.ids:
                error(f"{page.label}:{line}", f"{name} references missing id {identity!r}")
        for url, kind, line in page.links:
            check_link(page, url, kind, line, pages, host)
        scripts.extend(page.scripts)
    # Stylesheet URLs resolve relative to the stylesheet, just like HTML resource URLs.
    for path in paths:
        if path.suffix.lower() != ".css":
            continue
        stub = object.__new__(Page)
        stub.path, stub.label, stub.base_url = path, relative(path), f"https://{host}/{relative(path)}"
        text = re.sub(r"/\*.*?\*/", "", read_text(path), flags=re.S)
        for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", text, re.I):
            if not match.group(2).startswith("#"):
                check_link(stub, match.group(2), "CSS url", text.count("\n", 0, match.start()) + 1, pages, host)
    return scripts


def check_scripts(items: list[tuple[str, str, str]]) -> None:
    node = shutil.which("node")
    if not node:
        error("JavaScript", "Node.js is required for syntax validation")
        return
    def one(item):
        label, mode, text = item
        try:
            result = subprocess.run([node, "--check", f"--input-type={mode}"], input=text,
                                    text=True, capture_output=True, timeout=30, cwd=ROOT)
            if result.returncode:
                return f"{label}: syntax check failed\n{result.stderr.strip()}"
        except (OSError, subprocess.TimeoutExpired) as exc:
            return f"{label}: Node.js check failed: {exc}"
        return None
    with ThreadPoolExecutor(max_workers=min(8, os.cpu_count() or 1)) as pool:
        for result in pool.map(one, items):
            if result:
                errors.append(result)
    stats["javascript_units"] = len(items)


def check_generated_layout() -> None:
    required = [ROOT / "tools/build-administration.py", ROOT / "staff/administration.html",
                ROOT / "assets/js/administration-layout.js"]
    if not all(path.is_file() for path in required):
        error("generated layout", "builder, source template or generated file is missing")
        return
    try:
        with tempfile.TemporaryDirectory(prefix="bridge-wonder-release-") as temp:
            sandbox = Path(temp)
            for path in required[:2]:
                target = sandbox / relative(path)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(path, target)
            (sandbox / "assets/js").mkdir(parents=True)
            result = subprocess.run([sys.executable, str(sandbox / "tools/build-administration.py")],
                                    cwd=sandbox, text=True, capture_output=True, timeout=30)
            generated = sandbox / "assets/js/administration-layout.js"
            if result.returncode or not generated.is_file():
                error("generated layout", f"isolated build failed: {result.stderr.strip()}")
            elif generated.read_bytes() != required[2].read_bytes():
                error("assets/js/administration-layout.js", "stale generated layout; run npm run build")
            else:
                stats["generated_layout_matches"] = 1
    except (OSError, subprocess.TimeoutExpired) as exc:
        error("generated layout", str(exc))


def check_theme(base: str, paths: list[Path]) -> None:
    try:
        result = subprocess.run(["git", "ls-tree", "-rz", base, "--", "assets"], cwd=ROOT,
                                capture_output=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired) as exc:
        error("theme preservation", f"Git is required: {exc}")
        return
    if result.returncode:
        error("theme preservation", f"baseline {base!r} is unavailable; include its Git history in the checkout (CI fetch-depth: 0)")
        return
    baseline = {}
    for entry in result.stdout.split(b"\0"):
        if not entry:
            continue
        metadata, name = entry.split(b"\t", 1)
        path = name.decode("utf-8")
        suffix = Path(path).suffix.lower()
        if suffix == ".css" or suffix in IMAGE_SUFFIXES:
            baseline[path] = metadata.split()[2].decode("ascii")
    if not baseline:
        error("theme preservation", "baseline contains no theme CSS or images")
        return
    for name, expected in baseline.items():
        path = ROOT / name
        if not path.is_file():
            error(name, "original theme asset was removed")
            continue
        data = path.read_bytes()
        actual = hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()
        if actual != expected:
            error(name, f"original theme asset differs from {base[:12]}")
        else:
            stats["unchanged_theme_assets"] += 1
    for path in paths:
        name = relative(path)
        if name.startswith("assets/") and (path.suffix.lower() == ".css" or path.suffix.lower() in IMAGE_SUFFIXES):
            if name not in baseline and name not in ALLOWED_THEME_ADDITIONS:
                error(name, "unexpected theme asset addition; review the preservation allowlist")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme-base", default=THEME_BASE, help="Git commit whose original CSS/images must remain byte-identical")
    args = parser.parse_args()
    paths = files()
    host = read_text(ROOT / "CNAME").strip().lower()
    if not host or "/" in host or re.search(r"\s", host):
        error("CNAME", "expected one hostname for same-site URL validation")
        host = "release-check.invalid"
    for path in paths:
        if path.suffix.lower() == ".json":
            check_json(read_text(path), relative(path))
    scripts = [(relative(path), "module" if path.suffix.lower() == ".mjs" else "commonjs", read_text(path))
               for path in paths if path.suffix.lower() in SCRIPT_SUFFIXES]
    scripts.extend(check_pages(paths, host))
    check_scripts(scripts)
    check_generated_layout()
    check_theme(args.theme_base, paths)
    print(json.dumps({"check": "Bridge Wonder offline release", "passed": not errors,
                      "counts": dict(sorted(stats.items())), "errors": len(errors)}, ensure_ascii=False))
    if errors:
        for message in errors:
            print("ERROR " + message, file=sys.stderr)
        return 1
    print("PASS — syntax, JSON, layout reproducibility, local references and original theme preservation")
    print("External URLs were not fetched. Live Google services and visual rendering are outside this check.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

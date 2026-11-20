#!/usr/bin/env python3
"""Sync the verified @bridgewonder.e Instagram feed to GitHub Pages.

Uses ONLY the official Instagram API with Instagram Login (Professional
Business/Creator accounts). Run in GitHub Actions with:
  BW_INSTAGRAM_ACCESS_TOKEN (Actions secret)
  BW_INSTAGRAM_USER_ID (optional Actions variable, numeric ID or "me")
Never include tokens in public files, logs, URL query strings, or frontend JS.
Images are mirrored as small same-origin WebP thumbnails because Instagram
media_url CDN links are temporary; originals remain at Instagram.
"""
from __future__ import annotations

import io
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

ACCOUNT = "bridgewonder.e"
API_VERSION = "v27.0"
API_BASE = f"https://graph.instagram.com/{API_VERSION}/"
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/data/instagram-feed.json"
IMAGES = ROOT / "assets/img/instagram"
MAX_ITEMS = 9
MAX_SOURCE = 9 * 1024 * 1024
MAX_IMAGE_PIXELS = 18_000_000
POST_RE = re.compile(r"^/(?:p|reel|tv)/[A-Za-z0-9_-]{5,40}/?$")
ID_RE = re.compile(r"^[0-9]{6,30}$")


def safe_error(exc: Exception) -> RuntimeError:
    """Never include token-containing URLs or raw API response in CI logs."""
    if isinstance(exc, HTTPError):
        return RuntimeError(f"Instagram API rejected request (HTTP {exc.code}); check Meta permissions and token expiry")
    if isinstance(exc, URLError):
        return RuntimeError("Instagram API could not be reached; the existing feed remains unchanged")
    return RuntimeError("Instagram feed synchronization failed; the existing feed remains unchanged")


def graph(endpoint: str, token: str, fields: str) -> dict:
    if not (endpoint.startswith("me") or endpoint[:1].isdigit()):
        raise ValueError("Unexpected Instagram API endpoint")
    query = urlencode({"fields": fields, "limit": 20}) if endpoint.endswith("/media") else urlencode({"fields": fields})
    url = API_BASE + endpoint + "?" + query
    request = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json",
                                   "User-Agent": "BridgeWonder-SiteFeed/1.0"})
    try:
        with urlopen(request, timeout=18) as response:
            payload = response.read(1_000_001)
            if len(payload) > 1_000_000:
                raise ValueError("Instagram API response too large")
            parsed = json.loads(payload)
            if not isinstance(parsed, dict):
                raise ValueError("Unexpected Instagram API response")
            return parsed
    except (HTTPError, URLError) as exc:
        raise safe_error(exc) from None


def instagram_link(value: str) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        url = urlsplit(value)
    except ValueError:
        return None
    if url.scheme != "https" or url.hostname not in {"instagram.com", "www.instagram.com"}:
        return None
    if not POST_RE.fullmatch(url.path):
        return None
    return "https://www.instagram.com" + url.path.rstrip("/") + "/"


def safe_cdn(value: str) -> str | None:
    if not isinstance(value, str) or len(value) > 4000:
        return None
    try:
        parts = urlsplit(value)
    except ValueError:
        return None
    if parts.scheme != "https" or parts.username or parts.password or not parts.hostname:
        return None
    host = parts.hostname.lower()
    accepted = (".cdninstagram.com", ".fbcdn.net", ".instagram.com")
    if host not in {"cdninstagram.com", "fbcdn.net"} and not host.endswith(accepted):
        return None
    if parts.port not in (None, 443):
        return None
    return value


def clean_caption(value: str) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", value)).strip()[:145]


def download_thumbnail(url: str) -> bytes:
    checked = safe_cdn(url)
    if not checked:
        raise ValueError("Instagram media URL host is not trusted")
    request = Request(checked, headers={"Accept": "image/*", "User-Agent": "BridgeWonder-SiteFeed/1.0"})
    try:
        with urlopen(request, timeout=20) as response:
            if not response.headers.get("Content-Type", "").lower().startswith("image/"):
                raise ValueError("Instagram thumbnail did not return an image")
            blob = response.read(MAX_SOURCE + 1)
            if len(blob) > MAX_SOURCE:
                raise ValueError("Instagram thumbnail is too large")
            return blob
    except (HTTPError, URLError) as exc:
        raise safe_error(exc) from None


def webp_thumbnail(raw: bytes) -> bytes:
    # Install via GitHub Actions, not in the public site's browser.
    from PIL import Image, ImageOps, UnidentifiedImageError
    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    try:
        with Image.open(io.BytesIO(raw)) as picture:
            if picture.width * picture.height > MAX_IMAGE_PIXELS:
                raise ValueError("Instagram image is larger than the allowed pixel count")
            converted = ImageOps.exif_transpose(picture).convert("RGB")
            converted.thumbnail((900, 1125), Image.Resampling.LANCZOS)
            target = io.BytesIO()
            converted.save(target, format="WEBP", quality=80, method=5)
            return target.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Instagram image could not be decoded") from None


def normalize_items(data: dict, get_media) -> tuple[list[dict], dict[str, bytes]]:
    items: list[dict] = []
    thumbnails: dict[str, bytes] = {}
    known: set[str] = set()
    for entry in data.get("data", [])[:30]:
        if not isinstance(entry, dict):
            continue
        id_ = str(entry.get("id", ""))
        url = instagram_link(entry.get("permalink", ""))
        kind = str(entry.get("media_type", "")).upper()
        if not ID_RE.fullmatch(id_) or id_ in known or not url:
            continue
        if kind not in {"IMAGE", "VIDEO", "CAROUSEL_ALBUM"}:
            continue
        cdn = entry.get("thumbnail_url") if kind == "VIDEO" else entry.get("media_url")
        # The main carousel cover may not be returned by older API versions.
        if not cdn and kind == "CAROUSEL_ALBUM":
            children = entry.get("children", {}).get("data", [])
            if isinstance(children, list) and children:
                child = children[0]
                if isinstance(child, dict):
                    cdn = child.get("thumbnail_url") or child.get("media_url")
        if not safe_cdn(cdn):
            continue
        try:
            content = webp_thumbnail(get_media(cdn))
        except (ValueError, RuntimeError):
            continue  # Some video thumbnails are unavailable; keep other posts.
        if len(content) > 800_000:
            continue
        name = f"ig-{id_}.webp"
        date = str(entry.get("timestamp") or "")
        if not re.match(r"^\d{4}-\d{2}-\d{2}T", date):
            date = ""
        items.append({
            "id": id_,
            "permalink": url,
            "image": "/assets/img/instagram/" + name,
            "media_type": kind,
            "caption": clean_caption(entry.get("caption", "")),
            "timestamp": date,
        })
        thumbnails[name] = content
        known.add(id_)
        if len(items) == MAX_ITEMS:
            break
    return items, thumbnails


def sync() -> int:
    token = os.environ.get("BW_INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not token:
        print("Instagram is not connected yet; keeping the site in its honest placeholder state.")
        return 0
    raw_id = os.environ.get("BW_INSTAGRAM_USER_ID", "me").strip() or "me"
    if raw_id != "me" and not ID_RE.fullmatch(raw_id):
        print("Instagram user ID setting is invalid (only a numeric ID or 'me' is accepted).")
        return 1
    try:
        identity = graph("me", token, "id,username")
        actual = str(identity.get("username", "")).lstrip("@").lower()
        if actual != ACCOUNT:
            print("The authenticated Instagram account is not @bridgewonder.e. Feed was not changed.")
            return 1
        fields = "id,media_type,media_url,thumbnail_url,permalink,timestamp,caption,children{media_type,media_url,thumbnail_url}"
        try:
            feed = graph(raw_id + "/media", token, fields)
        except RuntimeError:
            # Meta omits unsupported fields for some Instagram Login configurations.
            feed = graph(raw_id + "/media", token, "id,media_type,media_url,thumbnail_url,permalink,timestamp")
        posts, pictures = normalize_items(feed, download_thumbnail)
        source_count = len(feed.get("data", []))
        if source_count > 0 and not posts:
            print("No displayable image was returned; retaining previous successful Instagram feed.")
            return 1
    except (RuntimeError, ValueError, TypeError, KeyError) as exc:
        # Do not show secrets or API error response bodies.
        print(str(exc) if isinstance(exc, RuntimeError) else "Instagram feed authentication or data validation failed.")
        return 1
    previous = {}
    if DATA.is_file():
        try:
            previous = json.loads(DATA.read_text("utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}
    if previous.get("status") == "connected" and previous.get("items") == posts:
        print(f"Feed unchanged ({len(posts)} genuine Instagram posts).")
        return 0
    IMAGES.mkdir(parents=True, exist_ok=True)
    for name, data in pictures.items():
        destination = IMAGES / name
        if not destination.exists() or destination.read_bytes() != data:
            destination.write_bytes(data)
    preserved = set(pictures)
    for old in IMAGES.glob("ig-*.webp"):
        if re.fullmatch(r"ig-[0-9]{6,30}\.webp", old.name) and old.name not in preserved:
            old.unlink()
    output = {
        "account": ACCOUNT,
        "status": "connected",
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "items": posts,
    }
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synchronized {len(posts)} verified posts from @{ACCOUNT} (images hosted on same origin).")
    return 0


if __name__ == "__main__":
    sys.exit(sync())

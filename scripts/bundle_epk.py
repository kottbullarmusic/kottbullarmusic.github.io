#!/usr/bin/env python3
"""Extract or rebuild the epk.html bundler payload.

The EPK is a single self-contained HTML page with three inline JSON blocks:
  <script type="__bundler/manifest">       — uuid → {data:b64, mime, compressed}
  <script type="__bundler/template">       — JSON string of the inner HTML
  <script type="__bundler/ext_resources">  — small id→uuid lookup

Three of the manifest entries are human-editable text (the template, the React
app, the tweaks panel). Everything else (fonts, the cover image, React/Babel
vendor blobs) is inert payload that the LLM never needs to see. This script
moves the editable parts out into epk.source/ and reassembles the bundle.

Commands:
    extract    epk.html  -> epk.source/   (only writes editable text files)
    bundle     epk.source/ + epk.html (for binary payload) -> epk.html
"""
from __future__ import annotations

import argparse
import base64
import gzip
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPK = ROOT / "epk.html"
SRC = ROOT / "epk.source"
MAP = SRC / "manifest-map.json"
ENV_FILE = ROOT / ".env"

# Bandsintown — partner-token REST API. The token comes from .env or the
# BANDSINTOWN_API_TOKEN env var; without it, the fetch is skipped and the
# fallback list embedded in app.js is used.
BIT_ARTIST = "id_15633845"
BIT_BASE = f"https://rest.bandsintown.com/artists/{BIT_ARTIST}/events"
DE_MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]
EN_MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
FREE_NOTE = {"en": "free entry", "de": "Eintritt frei"}


def _load_env_token() -> str | None:
    tok = os.environ.get("BANDSINTOWN_API_TOKEN", "").strip()
    if tok:
        return tok
    if not ENV_FILE.exists():
        return None
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() == "BANDSINTOWN_API_TOKEN":
            return value.strip().strip('"').strip("'") or None
    return None

BLOCK = re.compile(
    r'(<script type="__bundler/(manifest|template|ext_resources)">)(\s*)(.*?)(\s*</script>)',
    re.DOTALL,
)
COMMENT = re.compile(r'<!--.*?-->', re.DOTALL)


def _comment_spans(html: str) -> list[tuple[int, int]]:
    return [(m.start(), m.end()) for m in COMMENT.finditer(html)]


def _in_comment(pos: int, spans: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in spans)


def load_blocks(html: str) -> dict[str, str]:
    spans = _comment_spans(html)
    out = {}
    for m in BLOCK.finditer(html):
        if _in_comment(m.start(), spans):
            continue
        out[m.group(2)] = m.group(4)
    missing = {"manifest", "template", "ext_resources"} - out.keys()
    if missing:
        sys.exit(f"epk.html missing bundler blocks: {missing}")
    return out


def replace_block(html: str, name: str, payload: str) -> str:
    spans = _comment_spans(html)

    def repl(m):
        if _in_comment(m.start(), spans) or m.group(2) != name:
            return m.group(0)
        return f"{m.group(1)}{m.group(3)}{payload}{m.group(5)}"
    return BLOCK.sub(repl, html, count=0)


def decode_entry(entry: dict) -> bytes:
    raw = base64.b64decode(entry["data"])
    return gzip.decompress(raw) if entry.get("compressed") else raw


def encode_entry(data: bytes, mime: str, compress: bool) -> dict:
    payload = gzip.compress(data) if compress else data
    return {
        "data": base64.b64encode(payload).decode("ascii"),
        "mime": mime,
        "compressed": bool(compress),
    }


def cmd_extract() -> None:
    html = EPK.read_text(encoding="utf-8")
    blocks = load_blocks(html)
    manifest = json.loads(blocks["manifest"])
    template = json.loads(blocks["template"])

    # Pick out the three text assets we want to surface as editable source.
    # Identified by mime + leading bytes; everything else stays opaque.
    targets: dict[str, str] = {}  # uuid -> filename
    for uuid, entry in manifest.items():
        mime = entry["mime"]
        body = decode_entry(entry).decode("utf-8", errors="replace")
        head = body[:200].lstrip()
        if mime == "text/jsx":
            targets[uuid] = "tweaks-panel.jsx"
        elif mime == "application/javascript":
            targets[uuid] = "app.js"
        # vendor React/Babel and binary assets stay inline

    SRC.mkdir(parents=True, exist_ok=True)
    (SRC / "template.html").write_text(template, encoding="utf-8")

    file_map = {"_template": "template.html"}
    for uuid, name in targets.items():
        body = decode_entry(manifest[uuid]).decode("utf-8")
        (SRC / name).write_text(body, encoding="utf-8")
        file_map[uuid] = name

    MAP.write_text(json.dumps(file_map, indent=2) + "\n", encoding="utf-8")
    print(f"extracted {len(file_map)} files to {SRC.relative_to(ROOT)}/")


def fetch_bandsintown_events(timeout: float = 8.0) -> list[dict] | None:
    """Fetch upcoming events from Bandsintown. Returns None on any failure
    so the caller can fall back to the literal in app.js.

    Tries urllib first; falls back to `curl` (which uses the OS trust store)
    so the build still works on Pythons without a configured CA bundle —
    common on stock-installed macOS Pythons.
    """
    token = _load_env_token()
    if not token:
        print("info: no BANDSINTOWN_API_TOKEN; keeping fallback show list",
              file=sys.stderr)
        return None
    url = (
        f"{BIT_BASE}?"
        + urllib.parse.urlencode({"app_id": token, "date": "upcoming"})
    )

    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except urllib.error.URLError as e:
        urllib_err = e
    except (TimeoutError, json.JSONDecodeError) as e:
        print(f"warn: bandsintown fetch failed ({e}); keeping fallback list",
              file=sys.stderr)
        return None

    try:
        import subprocess
        out = subprocess.run(
            ["curl", "-sSfL", "--max-time", str(int(timeout)),
             "-H", "Accept: application/json", url],
            check=True, capture_output=True, text=True,
        ).stdout
        return json.loads(out)
    except (FileNotFoundError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"warn: bandsintown fetch failed (urllib: {urllib_err}; curl: {e}); "
              "keeping fallback list", file=sys.stderr)
        return None


def _parse_dt(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _format_event(ev: dict, lang: str) -> dict | None:
    dt = _parse_dt(ev.get("datetime", ""))
    if dt is None:
        return None
    venue = ev.get("venue") or {}
    name = (venue.get("name") or "").strip()
    if not name:
        return None
    city = (venue.get("city") or "").strip()
    country = (venue.get("country") or "").strip()
    # Bandsintown country is a full name (e.g. "Germany"); approximate to ISO.
    country_short = {"Germany": "DE", "Deutschland": "DE", "Austria": "AT",
                     "Switzerland": "CH"}.get(country, country[:2].upper())
    city_line = ", ".join(p for p in (city, country_short) if p)

    if lang == "de":
        date_str = f"{dt.day:02d}. {DE_MONTHS[dt.month - 1]} {dt.year}"
    else:
        date_str = f"{dt.day:02d} {EN_MONTHS[dt.month - 1]} {dt.year}"

    note = FREE_NOTE[lang] if ev.get("free") else ""
    return {"date": date_str, "venue": name, "city": city_line, "note": note}


def render_shows_literal(events: list[dict], lang: str) -> str:
    rows = []
    for ev in events:
        formatted = _format_event(ev, lang)
        if formatted is None:
            continue
        rows.append(
            "                 "
            + json.dumps(formatted, ensure_ascii=False)
            + ","
        )
    if not rows:
        return "[]"
    return "[\n" + "\n".join(rows) + "\n               ]"


_SHOWS_RE = re.compile(
    r"/\*EPK_SHOWS_(EN|DE)_BEGIN\*/.*?/\*EPK_SHOWS_\1_END\*/",
    re.DOTALL,
)


def inject_shows(app_js: str, events: list[dict]) -> str:
    def repl(m: re.Match) -> str:
        lang = m.group(1).lower()
        return (
            f"/*EPK_SHOWS_{m.group(1)}_BEGIN*/"
            + render_shows_literal(events, lang)
            + f"/*EPK_SHOWS_{m.group(1)}_END*/"
        )
    return _SHOWS_RE.sub(repl, app_js)


def cmd_bundle(*, fetch_shows: bool = True) -> None:
    if not MAP.exists():
        sys.exit(f"missing {MAP.relative_to(ROOT)}; run `extract` first")

    html = EPK.read_text(encoding="utf-8")
    blocks = load_blocks(html)
    manifest = json.loads(blocks["manifest"])
    file_map = json.loads(MAP.read_text(encoding="utf-8"))

    template = (SRC / file_map["_template"]).read_text(encoding="utf-8")

    events = fetch_bandsintown_events() if fetch_shows else None
    if events is not None:
        print(f"bandsintown: {len(events)} upcoming event(s) injected")

    for uuid, name in file_map.items():
        if uuid == "_template":
            continue
        if uuid not in manifest:
            sys.exit(f"manifest-map references unknown uuid {uuid}")
        entry = manifest[uuid]
        body = (SRC / name).read_text(encoding="utf-8")
        if name == "app.js" and events is not None:
            body = inject_shows(body, events)
        manifest[uuid] = encode_entry(body.encode("utf-8"), entry["mime"], entry.get("compressed", False))

    # Escape `</` so inline `</script>` inside the template doesn't prematurely
    # close the wrapping <script type="__bundler/template"> tag. `\/` decodes
    # to `/` in JSON, so JSON.parse on the browser side sees the same content.
    def js_safe(s: str) -> str:
        return s.replace("</", "<\\/")

    html = replace_block(html, "template", js_safe(json.dumps(template)))
    html = replace_block(html, "manifest", js_safe(json.dumps(manifest)))
    EPK.write_text(html, encoding="utf-8")
    print(f"rebuilt {EPK.relative_to(ROOT)} from {SRC.relative_to(ROOT)}/")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("cmd", choices=["extract", "bundle"])
    ap.add_argument("--no-fetch", action="store_true",
                    help="skip the Bandsintown fetch on bundle (use the fallback literal)")
    args = ap.parse_args()
    if args.cmd == "extract":
        cmd_extract()
    else:
        cmd_bundle(fetch_shows=not args.no_fetch)


if __name__ == "__main__":
    main()

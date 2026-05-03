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
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPK = ROOT / "epk.html"
SRC = ROOT / "epk.source"
MAP = SRC / "manifest-map.json"

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


def cmd_bundle() -> None:
    if not MAP.exists():
        sys.exit(f"missing {MAP.relative_to(ROOT)}; run `extract` first")

    html = EPK.read_text(encoding="utf-8")
    blocks = load_blocks(html)
    manifest = json.loads(blocks["manifest"])
    file_map = json.loads(MAP.read_text(encoding="utf-8"))

    template = (SRC / file_map["_template"]).read_text(encoding="utf-8")

    for uuid, name in file_map.items():
        if uuid == "_template":
            continue
        if uuid not in manifest:
            sys.exit(f"manifest-map references unknown uuid {uuid}")
        entry = manifest[uuid]
        new_body = (SRC / name).read_text(encoding="utf-8").encode("utf-8")
        manifest[uuid] = encode_entry(new_body, entry["mime"], entry.get("compressed", False))

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
    args = ap.parse_args()
    {"extract": cmd_extract, "bundle": cmd_bundle}[args.cmd]()


if __name__ == "__main__":
    main()

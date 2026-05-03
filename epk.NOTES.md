# epk.html — editor / LLM notes

**Do not read `epk.html` end-to-end.** It is a self-contained bundled artifact.
Most of its bytes are inert base64 payload (fonts, the cover image, and
React/Babel vendor blobs) packed into the `<script type="__bundler/manifest">`
block near the bottom of the file.

## Editable source

Live in `epk.source/`:

- `app.js` — the React EPK page (all copy, layout, sections)
- `tweaks-panel.jsx` — the in-page tweaks panel
- `template.html` — the page shell
- `manifest-map.json` — uuid → source-file mapping

## Rebuild after editing

```sh
python3 scripts/bundle_epk.py bundle
```

## Re-extract from the current bundle (rarely needed)

```sh
python3 scripts/bundle_epk.py extract
```

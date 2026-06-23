# Vardøgr — InDesign Layout Project

InDesign layout workspace for the Vardøgr RPG (working title, formerly Skrømt). Uses a custom MCP server to bridge Claude to Adobe InDesign 2026 via osascript + ExtendScript. macOS only.

## What This Is

The production layout project for Vardøgr — an OSE-compatible RPG adventure series set in Norway, 1800. Content source lives in `~/Documents/skromt/`; this project handles InDesign document assembly, styling, and print-ready PDF output.

## Running the MCP Server

The server is configured in `.mcp.json` and runs automatically when Claude Code starts. Manual launch:

```sh
uv run --with "mcp[cli]" mcp run server.py
```

Only dependency: `mcp[cli]>=1.0.0` (installed on-the-fly by `uv`). Requires Python ≥ 3.10.

## Architecture

Single file: `server.py`. The execution path is:

1. Claude calls an MCP tool (e.g. `find_text`, `read_story`)
2. The tool builds an ExtendScript (JavaScript) string
3. `run_jsx()` prepends the JSON polyfill, writes to a temp `.jsx` file
4. `osascript` tells InDesign to `do script` on that file
5. InDesign executes it and returns the result via stdout

All tools return JSON strings. The `run_script` tool is a raw escape hatch for arbitrary ExtendScript.

## Critical: ExtendScript Has No Native JSON

InDesign 2026's ExtendScript engine does not have `JSON.stringify` or `JSON.parse`. The `_JSON_POLYFILL` constant in `server.py` is prepended to every script by `run_jsx()`. If you add new tools or write standalone `.jsx` files, the polyfill must be present.

## Design System

See `~/Documents/skromt/CLAUDE.md` for the full design spec. Key values:

| Element | Value |
|---------|-------|
| Format | 5.5" × 8.5" digest (half-letter) |
| Pages | Light warm cream `#faf8f5` |
| Text | Near-black `#1a1714`, Crimson Text 10pt/14pt |
| Accent | Muted rust `#8b4a2b` |
| Display font | IM Fell English (headings, NPC names, location names) |
| Mechanical font | IBM Plex Mono (stat blocks, labels) |
| Margins | Tschichold: inner 0.7", top 0.8", outer 0.95", bottom 1.2" |
| Baseline grid | 14pt unit — ALL vertical spacing in multiples |

## Reference Material

- `cairn-2e/` — Cairn 2nd Edition reference (InDesign packages, page scans). Template and layout inspiration.
- `cairn_page_*.jpg` — Cairn background/class page scans (layout reference for class entries)
- `noaide_*.jpg` — Skrømt Noaide class layout experiments
- `skromt-noaide.indd` — Working InDesign file with Noaide class proof-of-concept

## Content Source

All manuscript content comes from `~/Documents/skromt/`:
- `skromt-rulebook.en.md` / `.no.md` — Rulebook (primary InDesign target)
- `skromt-01-bleikvik-v2.md` — Adventure 1
- `skromt-02-kvitseter.md` / `.no.md` — Adventure 2
- `skromt-classes.md` — Class design source
- `skromt-magic.md` — Magic system design source
- `portraits/` — NPC portrait images
- `src/map-*.svg` — Village maps

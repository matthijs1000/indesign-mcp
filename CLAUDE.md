# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A custom MCP server that bridges Claude to Adobe InDesign 2026 via osascript + ExtendScript. macOS only. Used for the Silverheart RPG translation (Norwegian → English) on a 184-page InDesign document.

## Running the Server

The server is configured in `.mcp.json` and runs automatically when Claude Code starts. Manual launch:

```sh
uv run --with "mcp[cli]" mcp run server.py
```

Only dependency: `mcp[cli]>=1.0.0` (installed on-the-fly by `uv`).

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

## Adding New Tools

1. Define a function decorated with `@mcp.tool()` in `server.py`
2. Build the ExtendScript as an f-string — use `{{` / `}}` for JS braces inside Python f-strings
3. End the script with a `JSON.stringify(...)` expression (the last expression's value is returned)
4. Use `_escape_jsx()` to sanitize any user-provided strings before embedding in ExtendScript
5. Call `run_jsx(script)` to execute

## Gotchas

- **InDesign must be running** with a document open, or all tools fail.
- **osascript timeout** defaults to 60s in `run_jsx()` — increase for bulk operations on large documents.
- **String escaping**: Always use `_escape_jsx()` for user input embedded in ExtendScript. Raw string interpolation is an injection vector.
- **Result cap**: `find_text` caps results at 100 matches. Other tools may need similar guards for large documents.
- **No git repo** — this project is not version-controlled.

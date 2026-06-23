# InDesign MCP Server

A custom MCP server that lets Claude Code read, search, and manipulate Adobe InDesign documents. macOS only.

Claude connects to InDesign via `osascript` → ExtendScript. No plugins, no UXP — just a single Python file.

## What it can do

- **Read documents** — pages overview, stories (threaded text flows), paragraph styles, character styles
- **Search & replace** — find text across the entire document, bulk replace
- **Inspect structure** — text frames per page with bounds/overflow info, tables with contents
- **Run arbitrary scripts** — raw ExtendScript escape hatch for anything the built-in tools don't cover

## Prerequisites

- **macOS** (uses `osascript`)
- **Adobe InDesign 2025 or 2026** (tested with 2026 v21.4.1)
- **[uv](https://docs.astral.sh/uv/)** — Python package runner (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Claude Code** — [claude.ai/code](https://claude.ai/code) (CLI, desktop app, or IDE extension)

You do NOT need to install Python separately — `uv` handles it.

## Setup

1. **Clone this repo** somewhere on your Mac:
   ```sh
   git clone <repo-url> ~/indesign-mcp
   cd ~/indesign-mcp
   ```

2. **Open InDesign** and open the document you want to work with.

3. **Start Claude Code** in the project directory:
   ```sh
   claude
   ```
   The MCP server starts automatically (configured in `.mcp.json`).

4. **Try it out** — ask Claude to read your document:
   > "What's in this InDesign document?"
   > "Find all instances of 'Chapter' in the document"
   > "Show me the paragraph styles"

That's it. No manual server launch needed.

### If your InDesign version is different

Edit `server.py` line 13 and change the app name:
```python
APP_NAME = "Adobe InDesign 2026"  # Change to match your version
```

### Adjusting the .mcp.json path

The `.mcp.json` file contains an absolute path to `server.py`. After cloning, update it to match your location:
```json
{
  "mcpServers": {
    "indesign": {
      "command": "uv",
      "args": ["run", "--python", "3.13", "--with", "mcp[cli]", "mcp", "run", "/YOUR/PATH/HERE/server.py"]
    }
  }
}
```

## Available tools

| Tool | Description |
|------|-------------|
| `get_document_info` | Document overview: name, pages, layers, story count |
| `get_pages_overview` | All pages with dimensions, item counts, master pages |
| `get_stories_overview` | All text stories with content previews |
| `read_story` | Full text of a story by index |
| `get_story_paragraphs` | Paragraphs with applied styles (paginated) |
| `get_page_text_frames` | Text frames on a page with position, size, overflow status |
| `find_text` | Search for text across the document (max 100 results) |
| `replace_text` | Find and replace text document-wide |
| `get_paragraph_styles` | List all paragraph styles |
| `get_character_styles` | List all character styles |
| `get_tables` | Find all tables in the document |
| `get_table_contents` | Read a table as a 2D array |
| `run_script` | Execute arbitrary ExtendScript — the escape hatch |

## Hard-won lessons (read before extending)

These are things we learned the painful way. Save yourself the debugging.

### ExtendScript has no JSON

InDesign's ExtendScript engine (even in 2026) does **not** have `JSON.stringify` or `JSON.parse`. The server includes a polyfill that gets prepended to every script automatically. If you write standalone `.jsx` files or use `run_script`, the polyfill is already included.

### Units are document units, not points

All geometry values (column widths, cell insets, bounds, positions) use the **document's ruler units** — usually inches. Setting `table.columns[0].width = 48` means 48 *inches*, not 48 points. Check with `doc.viewPreferences.horizontalMeasurementUnits`. Font sizes and leading remain in points (they're typographic units).

### findChangeTextOptions, not findTextPreferences

`wholeWord` and `caseSensitive` go on `app.findChangeTextOptions`, NOT on `app.findTextPreferences`. The API splits *what to find* (findTextPreferences) from *how to find* (findChangeTextOptions).

### Tables: use bodyRowCount for everything

Create tables with `insertionPoint.tables.add({columnCount: N, bodyRowCount: M, headerRowCount: 0})`. Use bodyRowCount for all rows including visual headers — ExtendScript's `headerRows` accessor causes errors. Don't prefix frame contents with `\r` before inserting a table.

### Table styling pattern

```javascript
// Dark header row
cell.fillColor = doc.swatches.itemByName("Black");
cell.texts[0].fillColor = doc.swatches.itemByName("Paper");

// Alternating row shading
cell.fillColor = doc.swatches.itemByName("Black");
cell.fillTint = 10;

// Cell insets (in inches!)
cell.topInset = 0.03;
```

### Text wrap with hand-made contour paths

For wrapping text around an image's actual shape (not its bounding box):

1. Create a polygon that traces the figure silhouette (~60+ anchor points)
2. Place the image INTO the polygon (`polygon.place(File)`)
3. Fit proportionally (`polygon.fit(FitOptions.PROPORTIONALLY)`)
4. Set contour wrap (`polygon.textWrapPreferences.textWrapMode = TextWrapModes.CONTOUR`)

The polygon does double duty: clips the image AND serves as the text wrap contour. Don't use a separate rectangle for the image — its white background will cover text behind it.

**Detect Edges doesn't work** on white-background images. You need transparent PNGs (alpha channel) or hand-made paths.

### Auto-sizing text frames

Set `textFramePreferences.autoSizingType = AutoSizingTypeEnum.HEIGHT_ONLY` on content frames, then read `geometricBounds[2]` to find actual bottom — use that to position subsequent elements.

## Adding new tools

1. Add a function decorated with `@mcp.tool()` in `server.py`
2. Build the ExtendScript as a Python f-string — use `{{` / `}}` for JS braces
3. End the script with a `JSON.stringify(...)` expression (last expression's value is returned)
4. Use `_escape_jsx()` to sanitize any user-provided strings before embedding
5. Call `run_jsx(script)` to execute

## Architecture

```
Claude Code  →  MCP tool call  →  server.py builds ExtendScript string
                                       ↓
                                  run_jsx() prepends JSON polyfill
                                       ↓
                                  writes temp .jsx file
                                       ↓
                                  osascript tells InDesign to execute it
                                       ↓
                                  InDesign returns result via stdout
```

Single file, no build step, no dependencies beyond `mcp[cli]`.

## License

Do what you want with it.

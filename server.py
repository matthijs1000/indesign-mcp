"""InDesign MCP Server — connects Claude to Adobe InDesign 2026 via osascript + ExtendScript."""

import json
import os
import subprocess
import tempfile

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("indesign")

APP_NAME = "Adobe InDesign 2026"

# Minimal JSON polyfill for ExtendScript (which lacks native JSON)
_JSON_POLYFILL = r"""
if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.stringify !== "function") {
    JSON.stringify = function(v, replacer, space) {
        if (v === null) return "null";
        if (typeof v === "undefined") return undefined;
        if (typeof v === "boolean") return v ? "true" : "false";
        if (typeof v === "number") return isFinite(v) ? String(v) : "null";
        if (typeof v === "string") {
            return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                          .replace(/\n/g, '\\n').replace(/\r/g, '\\r')
                          .replace(/\t/g, '\\t') + '"';
        }
        if (v instanceof Array) {
            var items = [];
            for (var i = 0; i < v.length; i++) {
                var item = JSON.stringify(v[i]);
                items.push(item === undefined ? "null" : item);
            }
            return "[" + items.join(",") + "]";
        }
        if (typeof v === "object") {
            var pairs = [];
            for (var k in v) {
                if (v.hasOwnProperty(k)) {
                    var val = JSON.stringify(v[k]);
                    if (val !== undefined) pairs.push('"' + k + '":' + val);
                }
            }
            return "{" + pairs.join(",") + "}";
        }
        return undefined;
    };
}
"""


def _escape_jsx(s: str) -> str:
    """Escape a string for safe embedding in ExtendScript source code."""
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


def run_jsx(script: str, timeout: int = 60) -> str:
    """Execute ExtendScript in InDesign via osascript. Returns the result as a string."""
    full_script = _JSON_POLYFILL + "\n" + script
    with tempfile.NamedTemporaryFile(suffix=".jsx", mode="w", delete=False) as f:
        f.write(full_script)
        tmp_path = f.name
    try:
        applescript = (
            f'tell application "{APP_NAME}" to '
            f'do script (POSIX file "{tmp_path}") language javascript'
        )
        result = subprocess.run(
            ["osascript", "-e", applescript],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            raise RuntimeError(f"ExtendScript error: {stderr}")
        return result.stdout.strip()
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Document overview tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_document_info() -> str:
    """Get overview of the active InDesign document: name, file path, page count, layers, story count."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var info = {
            name: doc.name,
            filePath: doc.filePath ? doc.filePath.fsName : "unsaved",
            pages: doc.pages.length,
            spreads: doc.spreads.length,
            stories: doc.stories.length,
            masterSpreads: doc.masterSpreads.length,
            layers: []
        };
        for (var i = 0; i < doc.layers.length; i++) {
            info.layers.push({
                name: doc.layers[i].name,
                visible: doc.layers[i].visible,
                locked: doc.layers[i].locked
            });
        }
        JSON.stringify(info, null, 2);
    """
    )


@mcp.tool()
def get_pages_overview() -> str:
    """List all pages with their dimensions, item counts, and applied master page."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var pages = [];
        for (var i = 0; i < doc.pages.length; i++) {
            var p = doc.pages[i];
            pages.push({
                index: i,
                name: p.name,
                width: Math.round(p.bounds[3] - p.bounds[1]),
                height: Math.round(p.bounds[2] - p.bounds[0]),
                itemCount: p.allPageItems.length,
                masterPage: p.appliedMaster ? p.appliedMaster.name : "None"
            });
        }
        JSON.stringify(pages, null, 2);
    """
    )


# ---------------------------------------------------------------------------
# Text / story tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_stories_overview() -> str:
    """List all text stories with content previews. A story is a threaded text flow that may span multiple frames."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var stories = [];
        for (var i = 0; i < doc.stories.length; i++) {
            var s = doc.stories[i];
            stories.push({
                index: i,
                id: s.id,
                characters: s.length,
                paragraphs: s.paragraphs.length,
                frames: s.textContainers.length,
                preview: s.contents.substring(0, 200)
            });
        }
        JSON.stringify(stories, null, 2);
    """
    )


@mcp.tool()
def read_story(story_index: int) -> str:
    """Read the full text of a story by its index. Use get_stories_overview first to find the right index."""
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        var story = doc.stories[{story_index}];
        var result = {{
            index: {story_index},
            id: story.id,
            characters: story.length,
            paragraphs: story.paragraphs.length,
            frames: story.textContainers.length,
            contents: story.contents
        }};
        JSON.stringify(result, null, 2);
    """
    )


@mcp.tool()
def get_story_paragraphs(story_index: int, start: int = 0, count: int = 50) -> str:
    """Get paragraphs from a story with their applied styles. Useful for understanding structure.

    Args:
        story_index: Index of the story (from get_stories_overview)
        start: First paragraph index to return (0-based)
        count: Max number of paragraphs to return
    """
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        var story = doc.stories[{story_index}];
        var paras = [];
        var end = Math.min({start} + {count}, story.paragraphs.length);
        for (var i = {start}; i < end; i++) {{
            var p = story.paragraphs[i];
            paras.push({{
                index: i,
                contents: p.contents,
                style: p.appliedParagraphStyle.name
            }});
        }}
        JSON.stringify({{
            storyIndex: {story_index},
            totalParagraphs: story.paragraphs.length,
            from: {start},
            to: end - 1,
            paragraphs: paras
        }}, null, 2);
    """
    )


@mcp.tool()
def get_page_text_frames(page_index: int) -> str:
    """Get all text frames on a specific page with position, size, and content preview.

    Args:
        page_index: 0-based page index
    """
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        var page = doc.pages[{page_index}];
        var frames = [];
        for (var i = 0; i < page.textFrames.length; i++) {{
            var tf = page.textFrames[i];
            frames.push({{
                index: i,
                id: tf.id,
                bounds: tf.geometricBounds,
                contents_preview: tf.contents.substring(0, 300),
                characters: tf.contents.length,
                storyId: tf.parentStory.id,
                overflows: tf.overflows
            }});
        }}
        JSON.stringify(frames, null, 2);
    """
    )


# ---------------------------------------------------------------------------
# Search and replace
# ---------------------------------------------------------------------------


@mcp.tool()
def find_text(
    search_string: str, whole_word: bool = False, case_sensitive: bool = False
) -> str:
    """Find all occurrences of text in the document. Returns location and surrounding context.

    Args:
        search_string: Text to search for
        whole_word: Match whole words only
        case_sensitive: Case-sensitive search
    """
    escaped = _escape_jsx(search_string)
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        app.findTextPreferences = NothingEnum.nothing;
        app.changeTextPreferences = NothingEnum.nothing;
        app.findTextPreferences.findWhat = "{escaped}";
        app.findChangeTextOptions.wholeWord = {str(whole_word).lower()};
        app.findChangeTextOptions.caseSensitive = {str(case_sensitive).lower()};
        var found = doc.findText();
        var results = [];
        for (var i = 0; i < Math.min(found.length, 100); i++) {{
            var f = found[i];
            var story = f.parentStory;
            var storyIdx = -1;
            for (var j = 0; j < doc.stories.length; j++) {{
                if (doc.stories[j].id === story.id) {{ storyIdx = j; break; }}
            }}
            var para = f.paragraphs.length > 0 ? f.paragraphs[0].contents.substring(0, 200) : "";
            results.push({{
                text: f.contents,
                storyIndex: storyIdx,
                characterIndex: f.index,
                paragraphContext: para
            }});
        }}
        app.findTextPreferences = NothingEnum.nothing;
        JSON.stringify({{
            query: "{escaped}",
            totalFound: found.length,
            showing: results.length,
            results: results
        }}, null, 2);
    """
    )


@mcp.tool()
def replace_text(
    find_string: str,
    replace_string: str,
    whole_word: bool = False,
    case_sensitive: bool = False,
) -> str:
    """Find and replace text throughout the document.

    Args:
        find_string: Text to find
        replace_string: Text to replace with
        whole_word: Match whole words only
        case_sensitive: Case-sensitive matching
    """
    escaped_find = _escape_jsx(find_string)
    escaped_replace = _escape_jsx(replace_string)
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        app.findTextPreferences = NothingEnum.nothing;
        app.changeTextPreferences = NothingEnum.nothing;
        app.findTextPreferences.findWhat = "{escaped_find}";
        app.changeTextPreferences.changeTo = "{escaped_replace}";
        app.findChangeTextOptions.wholeWord = {str(whole_word).lower()};
        app.findChangeTextOptions.caseSensitive = {str(case_sensitive).lower()};
        var changed = doc.changeText();
        app.findTextPreferences = NothingEnum.nothing;
        app.changeTextPreferences = NothingEnum.nothing;
        JSON.stringify({{
            find: "{escaped_find}",
            replace: "{escaped_replace}",
            replacements: changed.length
        }});
    """
    )


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------


@mcp.tool()
def get_paragraph_styles() -> str:
    """List all paragraph styles in the document with their font settings."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var styles = [];
        for (var i = 0; i < doc.allParagraphStyles.length; i++) {
            var s = doc.allParagraphStyles[i];
            styles.push({
                name: s.name,
                basedOn: s.basedOn ? s.basedOn.name : null
            });
        }
        JSON.stringify(styles, null, 2);
    """
    )


@mcp.tool()
def get_character_styles() -> str:
    """List all character styles in the document."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var styles = [];
        for (var i = 0; i < doc.allCharacterStyles.length; i++) {
            var s = doc.allCharacterStyles[i];
            styles.push({
                name: s.name
            });
        }
        JSON.stringify(styles, null, 2);
    """
    )


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------


@mcp.tool()
def get_tables() -> str:
    """Find all tables in the document. Returns table dimensions and which story they belong to."""
    return run_jsx(
        """
        var doc = app.activeDocument;
        var result = [];
        for (var i = 0; i < doc.stories.length; i++) {
            var story = doc.stories[i];
            for (var t = 0; t < story.tables.length; t++) {
                var table = story.tables[t];
                result.push({
                    storyIndex: i,
                    tableIndex: t,
                    id: table.id,
                    rows: table.rows.length,
                    columns: table.columns.length,
                    headerRows: table.headerRowCount,
                    footerRows: table.footerRowCount
                });
            }
        }
        JSON.stringify(result, null, 2);
    """
    )


@mcp.tool()
def get_table_contents(story_index: int, table_index: int) -> str:
    """Read the full contents of a table as a 2D array.

    Args:
        story_index: Story containing the table
        table_index: Index of the table within that story
    """
    return run_jsx(
        f"""
        var doc = app.activeDocument;
        var table = doc.stories[{story_index}].tables[{table_index}];
        var data = [];
        for (var r = 0; r < table.rows.length; r++) {{
            var row = [];
            for (var c = 0; c < table.columns.length; c++) {{
                row.push(table.rows[r].cells[c].contents);
            }}
            data.push(row);
        }}
        JSON.stringify({{
            storyIndex: {story_index},
            tableIndex: {table_index},
            rows: table.rows.length,
            columns: table.columns.length,
            data: data
        }}, null, 2);
    """
    )


# ---------------------------------------------------------------------------
# Escape hatch
# ---------------------------------------------------------------------------


@mcp.tool()
def run_script(extendscript_code: str) -> str:
    """Execute arbitrary ExtendScript (JavaScript) in InDesign. The last expression's value is returned.

    The full InDesign scripting DOM is available. Use this for operations not covered by other tools.
    Reference: https://www.indesignjs.de/extendscriptAPI/indesign-latest/

    Args:
        extendscript_code: Valid ExtendScript/JavaScript code to execute in InDesign
    """
    return run_jsx(extendscript_code)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()

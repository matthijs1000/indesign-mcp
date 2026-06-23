/**
 * Vardøgr — InDesign Document Setup
 *
 * Run this script in InDesign to set up a new document (or update an existing one)
 * with all Vardøgr paragraph styles, character styles, master pages, and document settings.
 *
 * Matches the design system in skromt.css:
 *   - 5.5" × 8.5" digest, Tschichold margins
 *   - 14pt baseline grid
 *   - Crimson Text body, IM Fell English display, IBM Plex Mono mechanical
 *   - Muted rust #8b4a2b accent on warm cream #faf8f5
 *
 * Prerequisites: Crimson Text, IM Fell English, and IBM Plex Mono must be installed.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

function hexToRGB(hex) {
    hex = hex.replace("#", "");
    return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
    ];
}

function getOrCreateColor(doc, name, hex) {
    var rgb = hexToRGB(hex);
    try {
        return doc.colors.itemByName(name);
    } catch (e) {}
    // Check if it exists
    for (var i = 0; i < doc.colors.length; i++) {
        if (doc.colors[i].name === name) return doc.colors[i];
    }
    var c = doc.colors.add();
    c.name = name;
    c.model = ColorModel.PROCESS;
    c.space = ColorSpace.RGB;
    c.colorValue = rgb;
    return c;
}

function getOrCreateParagraphStyle(doc, name) {
    for (var i = 0; i < doc.allParagraphStyles.length; i++) {
        if (doc.allParagraphStyles[i].name === name) return doc.allParagraphStyles[i];
    }
    return doc.paragraphStyles.add({name: name});
}

function getOrCreateCharacterStyle(doc, name) {
    for (var i = 0; i < doc.allCharacterStyles.length; i++) {
        if (doc.allCharacterStyles[i].name === name) return doc.allCharacterStyles[i];
    }
    return doc.characterStyles.add({name: name});
}

function getOrCreateStyleGroup(doc, name) {
    for (var i = 0; i < doc.paragraphStyleGroups.length; i++) {
        if (doc.paragraphStyleGroups[i].name === name) return doc.paragraphStyleGroups[i];
    }
    return doc.paragraphStyleGroups.add({name: name});
}

// ─── Colors ────────────────────────────────────────────────────────────────────

var doc = app.activeDocument;

var colorText      = getOrCreateColor(doc, "Vardøgr Text",       "#1a1714");
var colorTextMuted = getOrCreateColor(doc, "Vardøgr Text Muted", "#6b5b4b");
var colorAccent    = getOrCreateColor(doc, "Vardøgr Accent",     "#8b4a2b");
var colorRule      = getOrCreateColor(doc, "Vardøgr Rule",       "#d5cdc0");
var colorBg        = getOrCreateColor(doc, "Vardøgr Background", "#faf8f5");
var colorAccentLt  = getOrCreateColor(doc, "Vardøgr Accent Lt",  "#f5ede6");
var colorCoverBg   = getOrCreateColor(doc, "Vardøgr Cover Dark", "#1a1714");

// ─── Document Settings ────────────────────────────────────────────────────────

with (doc.documentPreferences) {
    pageWidth  = "5.5in";
    pageHeight = "8.5in";
    facingPages = true;
    pagesPerDocument = 1;
}

// Margins (applied to all pages via default)
// Inner 0.7", Top 0.8", Outer 0.95", Bottom 1.2"
with (doc.marginPreferences) {
    top    = "0.8in";
    bottom = "1.2in";
    left   = "0.7in";   // inner (gutter) for facing pages
    right  = "0.95in";  // outer
}

// Baseline grid: 14pt, starting from top margin
with (doc.gridPreferences) {
    baselineDivision      = "14pt";
    baselineStart         = "0.8in";  // match top margin
    baselineGridShown     = true;
    baselineColor         = UIColors.LIGHT_GRAY;
}

// ─── Paragraph Styles ─────────────────────────────────────────────────────────

// --- Body ---
var sBody = getOrCreateParagraphStyle(doc, "Body");
sBody.appliedFont       = "Crimson Text";
sBody.fontStyle          = "Regular";
sBody.pointSize          = 10;
sBody.leading            = 14;  // = baseline grid
sBody.fillColor          = colorText;
sBody.justification      = Justification.LEFT_JUSTIFIED;
sBody.firstLineIndent    = "10pt";  // 1em at 10pt body
sBody.spaceBefore        = 0;
sBody.spaceAfter         = 0;
sBody.hyphenation        = true;
sBody.alignToBaseline    = true;

// --- Body First (no indent, after headings) ---
var sBodyFirst = getOrCreateParagraphStyle(doc, "Body First");
sBodyFirst.basedOn        = sBody;
sBodyFirst.firstLineIndent = 0;

// --- Heading 1 (chapter/section titles) ---
var sH1 = getOrCreateParagraphStyle(doc, "Heading 1");
sH1.appliedFont       = "IM Fell English";
sH1.fontStyle          = "Roman";
sH1.pointSize          = 18;
sH1.leading            = 22;
sH1.fillColor          = colorAccent;
sH1.justification      = Justification.CENTER_JUSTIFIED;
sH1.firstLineIndent    = 0;
sH1.spaceBefore        = 0;
sH1.spaceAfter         = "14pt";  // 1 × baseline
sH1.keepWithNext       = 1;
sH1.alignToBaseline    = false;

// --- Heading 2 (subsection) ---
var sH2 = getOrCreateParagraphStyle(doc, "Heading 2");
sH2.appliedFont       = "IM Fell English";
sH2.fontStyle          = "Roman";
sH2.pointSize          = 13;
sH2.leading            = 16;
sH2.fillColor          = colorAccent;
sH2.justification      = Justification.LEFT_JUSTIFIED;
sH2.firstLineIndent    = 0;
sH2.spaceBefore        = "28pt";  // 2 × baseline
sH2.spaceAfter         = "12pt";
sH2.keepWithNext       = 1;
sH2.alignToBaseline    = false;

// --- Heading 3 (NPC names, sub-subsection) ---
var sH3 = getOrCreateParagraphStyle(doc, "Heading 3");
sH3.appliedFont       = "IM Fell English";
sH3.fontStyle          = "Roman";
sH3.pointSize          = 11;
sH3.leading            = 14;
sH3.fillColor          = colorText;
sH3.justification      = Justification.LEFT_JUSTIFIED;
sH3.firstLineIndent    = 0;
sH3.spaceBefore        = "14pt";  // 1 × baseline
sH3.spaceAfter         = 0;
sH3.keepWithNext       = 1;
sH3.alignToBaseline    = true;

// --- Heading 4 ---
var sH4 = getOrCreateParagraphStyle(doc, "Heading 4");
sH4.appliedFont       = "IM Fell English";
sH4.fontStyle          = "Roman";
sH4.pointSize          = 10;
sH4.leading            = 14;
sH4.fillColor          = colorAccent;
sH4.justification      = Justification.LEFT_JUSTIFIED;
sH4.firstLineIndent    = 0;
sH4.spaceBefore        = "14pt";
sH4.spaceAfter         = 0;
sH4.keepWithNext       = 1;
sH4.alignToBaseline    = true;

// --- NPC Name ---
var sNPCName = getOrCreateParagraphStyle(doc, "NPC Name");
sNPCName.appliedFont       = "IM Fell English";
sNPCName.fontStyle          = "Roman";
sNPCName.pointSize          = 11;
sNPCName.leading            = 14;
sNPCName.fillColor          = colorAccent;
sNPCName.firstLineIndent    = 0;
sNPCName.spaceBefore        = "21pt";  // 1.5 × baseline
sNPCName.spaceAfter         = "7pt";   // 0.5 × baseline
sNPCName.keepWithNext       = 1;
sNPCName.ruleBelow           = false;
// Bottom rule via paragraph rule
sNPCName.ruleAbove           = false;

// --- Gossip Monologue (blockquote italic) ---
var sGossip = getOrCreateParagraphStyle(doc, "Gossip Monologue");
sGossip.appliedFont       = "Crimson Text";
sGossip.fontStyle          = "Italic";
sGossip.pointSize          = 9.5;
sGossip.leading            = "12.6pt";  // baseline * 0.9
sGossip.fillColor          = colorTextMuted;
sGossip.justification      = Justification.LEFT_JUSTIFIED;
sGossip.firstLineIndent    = 0;
sGossip.leftIndent         = "10.5pt"; // baseline * 0.75
sGossip.spaceBefore        = 0;
sGossip.spaceAfter         = "7pt";

// --- Stat Block Name ---
var sStatName = getOrCreateParagraphStyle(doc, "Stat Block Name");
sStatName.appliedFont       = "IM Fell English";
sStatName.fontStyle          = "Roman";
sStatName.pointSize          = 10.5;
sStatName.leading            = 14;
sStatName.fillColor          = colorAccent;
sStatName.firstLineIndent    = 0;
sStatName.spaceBefore        = 0;
sStatName.spaceAfter         = "2pt";

// --- Stat Block Flavor ---
var sStatFlavor = getOrCreateParagraphStyle(doc, "Stat Block Flavor");
sStatFlavor.appliedFont       = "Crimson Text";
sStatFlavor.fontStyle          = "Italic";
sStatFlavor.pointSize          = 9;
sStatFlavor.leading            = 12;
sStatFlavor.fillColor          = colorTextMuted;
sStatFlavor.firstLineIndent    = 0;
sStatFlavor.spaceAfter         = "4pt";

// --- Stat Line (mechanical) ---
var sStatLine = getOrCreateParagraphStyle(doc, "Stat Line");
sStatLine.appliedFont       = "IBM Plex Mono";
sStatLine.fontStyle          = "Regular";
sStatLine.pointSize          = 8.5;
sStatLine.leading            = 14;
sStatLine.fillColor          = colorText;
sStatLine.firstLineIndent    = 0;
sStatLine.spaceBefore        = 0;
sStatLine.spaceAfter         = "2pt";

// --- Knows/Will Block ---
var sKnowsWill = getOrCreateParagraphStyle(doc, "Knows Will");
sKnowsWill.appliedFont       = "Crimson Text";
sKnowsWill.fontStyle          = "Regular";
sKnowsWill.pointSize          = 9.5;
sKnowsWill.leading            = "12.6pt";
sKnowsWill.fillColor          = colorText;
sKnowsWill.firstLineIndent    = 0;
sKnowsWill.leftIndent         = "10.5pt";
sKnowsWill.spaceAfter         = "4pt";

// --- Timeline Day ---
var sTimelineDay = getOrCreateParagraphStyle(doc, "Timeline Day");
sTimelineDay.appliedFont       = "IM Fell English";
sTimelineDay.fontStyle          = "Roman";
sTimelineDay.pointSize          = 10;
sTimelineDay.leading            = 14;
sTimelineDay.fillColor          = colorAccent;
sTimelineDay.firstLineIndent    = 0;
sTimelineDay.spaceAfter         = "2pt";
sTimelineDay.keepWithNext       = 1;

// --- Timeline Body ---
var sTimelineBody = getOrCreateParagraphStyle(doc, "Timeline Body");
sTimelineBody.appliedFont       = "Crimson Text";
sTimelineBody.fontStyle          = "Regular";
sTimelineBody.pointSize          = 9.5;
sTimelineBody.leading            = "13.3pt";  // baseline * 0.95
sTimelineBody.fillColor          = colorText;
sTimelineBody.firstLineIndent    = 0;
sTimelineBody.leftIndent         = "10.5pt";
sTimelineBody.spaceAfter         = 0;

// --- Location Name ---
var sLocationName = getOrCreateParagraphStyle(doc, "Location Name");
sLocationName.appliedFont       = "IM Fell English";
sLocationName.fontStyle          = "Italic";
sLocationName.pointSize          = 10;
sLocationName.leading            = 14;
sLocationName.fillColor          = colorAccent;
sLocationName.firstLineIndent    = 0;
sLocationName.spaceAfter         = "2pt";
sLocationName.keepWithNext       = 1;

// --- Section Intro (italic centered) ---
var sSectionIntro = getOrCreateParagraphStyle(doc, "Section Intro");
sSectionIntro.appliedFont       = "Crimson Text";
sSectionIntro.fontStyle          = "Italic";
sSectionIntro.pointSize          = 10;
sSectionIntro.leading            = 14;
sSectionIntro.fillColor          = colorTextMuted;
sSectionIntro.justification      = Justification.CENTER_JUSTIFIED;
sSectionIntro.firstLineIndent    = 0;
sSectionIntro.spaceAfter         = "14pt";

// --- Table Header ---
var sTableHeader = getOrCreateParagraphStyle(doc, "Table Header");
sTableHeader.appliedFont       = "Crimson Text";
sTableHeader.fontStyle          = "SemiBold";
sTableHeader.pointSize          = 9;
sTableHeader.leading            = 12;
sTableHeader.fillColor          = colorAccent;
sTableHeader.capitalization     = Capitalization.SMALL_CAPS;
sTableHeader.tracking           = 80;  // 0.08em ≈ 80 thousandths
sTableHeader.firstLineIndent    = 0;

// --- Table Cell ---
var sTableCell = getOrCreateParagraphStyle(doc, "Table Cell");
sTableCell.appliedFont       = "Crimson Text";
sTableCell.fontStyle          = "Regular";
sTableCell.pointSize          = 9.5;
sTableCell.leading            = "12.6pt";
sTableCell.fillColor          = colorText;
sTableCell.firstLineIndent    = 0;

// --- Running Head ---
var sRunningHead = getOrCreateParagraphStyle(doc, "Running Head");
sRunningHead.appliedFont       = "Crimson Text";
sRunningHead.fontStyle          = "Regular";
sRunningHead.pointSize          = 7;
sRunningHead.leading            = 10;
sRunningHead.fillColor          = colorTextMuted;
sRunningHead.capitalization     = Capitalization.SMALL_CAPS;
sRunningHead.tracking           = 120;  // 0.12em
sRunningHead.firstLineIndent    = 0;

// --- Folio (page number) ---
var sFolio = getOrCreateParagraphStyle(doc, "Folio");
sFolio.appliedFont       = "Crimson Text";
sFolio.fontStyle          = "Regular";
sFolio.pointSize          = 7;
sFolio.leading            = 10;
sFolio.fillColor          = colorTextMuted;
sFolio.firstLineIndent    = 0;

// --- Folio Center (chapter openers) ---
var sFolioCenter = getOrCreateParagraphStyle(doc, "Folio Center");
sFolioCenter.basedOn        = sFolio;
sFolioCenter.justification   = Justification.CENTER_JUSTIFIED;

// --- Callout Title ---
var sCalloutTitle = getOrCreateParagraphStyle(doc, "Callout Title");
sCalloutTitle.appliedFont       = "IM Fell English";
sCalloutTitle.fontStyle          = "Roman";
sCalloutTitle.pointSize          = 9.5;
sCalloutTitle.leading            = 12;
sCalloutTitle.fillColor          = colorAccent;
sCalloutTitle.firstLineIndent    = 0;
sCalloutTitle.spaceAfter         = "3.5pt";

// --- Callout Body ---
var sCalloutBody = getOrCreateParagraphStyle(doc, "Callout Body");
sCalloutBody.appliedFont       = "Crimson Text";
sCalloutBody.fontStyle          = "Regular";
sCalloutBody.pointSize          = 9.5;
sCalloutBody.leading            = "12.6pt";
sCalloutBody.fillColor          = colorText;
sCalloutBody.firstLineIndent    = 0;
sCalloutBody.spaceAfter         = "4pt";

// --- Bullet List ---
var sBulletList = getOrCreateParagraphStyle(doc, "Bullet List");
sBulletList.basedOn          = sBody;
sBulletList.firstLineIndent  = 0;
sBulletList.leftIndent       = "12pt";  // 1.2em at 10pt body
sBulletList.spaceBefore      = 0;
sBulletList.spaceAfter       = 0;

// --- Class Page: Class Label (e.g., "KLASSE 1 · UHYGGELIG") ---
var sClassLabel = getOrCreateParagraphStyle(doc, "Class Label");
sClassLabel.appliedFont       = "IBM Plex Mono";
sClassLabel.fontStyle          = "Bold";
sClassLabel.pointSize          = 7;
sClassLabel.leading            = 10;
sClassLabel.fillColor          = colorText;
sClassLabel.capitalization     = Capitalization.ALL_CAPS;
sClassLabel.tracking           = 100;
sClassLabel.firstLineIndent    = 0;
sClassLabel.spaceBefore        = 0;
sClassLabel.spaceAfter         = "4pt";

// --- Class Page: Class Title (huge display) ---
var sClassTitle = getOrCreateParagraphStyle(doc, "Class Title");
sClassTitle.appliedFont       = "IM Fell English";
sClassTitle.fontStyle          = "Roman";
sClassTitle.pointSize          = 36;
sClassTitle.leading            = 42;
sClassTitle.fillColor          = colorText;
sClassTitle.firstLineIndent    = 0;
sClassTitle.spaceBefore        = 0;
sClassTitle.spaceAfter         = "4pt";
sClassTitle.alignToBaseline    = false;

// --- Class Page: Class Subtitle (e.g., "samisk utøver") ---
var sClassSubtitle = getOrCreateParagraphStyle(doc, "Class Subtitle");
sClassSubtitle.appliedFont       = "Crimson Text";
sClassSubtitle.fontStyle          = "Italic";
sClassSubtitle.pointSize          = 10;
sClassSubtitle.leading            = 14;
sClassSubtitle.fillColor          = colorTextMuted;
sClassSubtitle.firstLineIndent    = 0;
sClassSubtitle.spaceAfter         = "14pt";

// ─── Character Styles ─────────────────────────────────────────────────────────

// Bold
var cBold = getOrCreateCharacterStyle(doc, "Bold");
cBold.fontStyle = "Bold";

// Italic
var cItalic = getOrCreateCharacterStyle(doc, "Italic");
cItalic.fontStyle = "Italic";

// Accent color (for inline highlights)
var cAccent = getOrCreateCharacterStyle(doc, "Accent");
cAccent.fillColor = colorAccent;

// Mono inline (for dice, mechanical references)
var cMono = getOrCreateCharacterStyle(doc, "Mono");
cMono.appliedFont = "IBM Plex Mono";
cMono.fontStyle = "Regular";
cMono.pointSize = 8.5;

// Mono Bold (for Knows/Will labels)
var cMonoBold = getOrCreateCharacterStyle(doc, "Mono Bold");
cMonoBold.appliedFont = "IBM Plex Mono";
cMonoBold.fontStyle = "SemiBold";
cMonoBold.pointSize = 8;
cMonoBold.capitalization = Capitalization.ALL_CAPS;
cMonoBold.tracking = 80;
cMonoBold.fillColor = colorAccent;

// Small Caps (run-in text)
var cSmallCaps = getOrCreateCharacterStyle(doc, "Small Caps");
cSmallCaps.capitalization = Capitalization.SMALL_CAPS;
cSmallCaps.tracking = 80;

// ─── Master Pages ─────────────────────────────────────────────────────────────

// Helper: create master spread if it doesn't exist
function getOrCreateMaster(doc, prefix, name) {
    for (var i = 0; i < doc.masterSpreads.length; i++) {
        if (doc.masterSpreads[i].namePrefix === prefix) return doc.masterSpreads[i];
    }
    var ms = doc.masterSpreads.add();
    ms.namePrefix = prefix;
    ms.baseName = name;
    return ms;
}

// --- A-Body (standard body pages with running heads + folios) ---
var mBody = getOrCreateMaster(doc, "A", "Body");

// Set margins on master pages
for (var p = 0; p < mBody.pages.length; p++) {
    with (mBody.pages[p].marginPreferences) {
        top    = "0.8in";
        bottom = "1.2in";
        // For facing pages: left = inner, right = outer on recto
        // InDesign handles mirroring automatically
        left   = "0.7in";
        right  = "0.95in";
    }
}

// Add running head text frames to A-Body master
// Verso (left page): running head left, folio left
var versoPage = mBody.pages[0];
var versoHead = versoPage.textFrames.add();
versoHead.geometricBounds = ["0.35in", "0.95in", "0.65in", "4.8in"];  // top, left, bottom, right
versoHead.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
versoHead.contents = "vardøgr";
versoHead.parentStory.texts[0].appliedParagraphStyle = sRunningHead;

var versoFolio = versoPage.textFrames.add();
versoFolio.geometricBounds = ["0.35in", "0.7in", "0.65in", "0.95in"];
versoFolio.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
versoFolio.contents = SpecialCharacters.AUTO_PAGE_NUMBER;
versoFolio.parentStory.texts[0].appliedParagraphStyle = sFolio;

// Recto (right page): running head right, folio right
var rectoPage = mBody.pages[1];
var rectoHead = rectoPage.textFrames.add();
rectoHead.geometricBounds = ["0.35in", "0.7in", "0.65in", "4.1in"];
rectoHead.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
rectoHead.contents = "<Section Title>";
rectoHead.parentStory.texts[0].appliedParagraphStyle = sRunningHead;

var rectoFolio = rectoPage.textFrames.add();
rectoFolio.geometricBounds = ["0.35in", "4.1in", "0.65in", "4.8in"];
rectoFolio.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
rectoFolio.parentStory.texts[0].appliedParagraphStyle = sFolio;
rectoFolio.parentStory.texts[0].justification = Justification.RIGHT_JUSTIFIED;
rectoFolio.contents = SpecialCharacters.AUTO_PAGE_NUMBER;

// Thin rule below running head (both pages)
var versoRule = versoPage.graphicLines.add();
versoRule.geometricBounds = ["0.65in", "0.7in", "0.65in", "4.8in"];
versoRule.strokeWeight = 0.5;
versoRule.strokeColor = colorRule;

var rectoRule = rectoPage.graphicLines.add();
rectoRule.geometricBounds = ["0.65in", "0.7in", "0.65in", "4.8in"];
rectoRule.strokeWeight = 0.5;
rectoRule.strokeColor = colorRule;

// --- B-Chapter Opener (no running head, drop folio at bottom center) ---
var mChapter = getOrCreateMaster(doc, "B", "Chapter Opener");

for (var p = 0; p < mChapter.pages.length; p++) {
    with (mChapter.pages[p].marginPreferences) {
        top    = "0.8in";
        bottom = "1.2in";
        left   = "0.7in";
        right  = "0.95in";
    }
    // Drop folio at bottom center
    var dropFolio = mChapter.pages[p].textFrames.add();
    dropFolio.geometricBounds = ["7.8in", "0.7in", "8.1in", "4.8in"];
    dropFolio.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
    dropFolio.contents = SpecialCharacters.AUTO_PAGE_NUMBER;
    dropFolio.parentStory.texts[0].appliedParagraphStyle = sFolioCenter;
}

// --- C-Frontmatter (no running heads, no folios) ---
var mFront = getOrCreateMaster(doc, "C", "Frontmatter");
for (var p = 0; p < mFront.pages.length; p++) {
    with (mFront.pages[p].marginPreferences) {
        top    = "0.8in";
        bottom = "1.2in";
        left   = "0.7in";
        right  = "0.95in";
    }
}

// --- D-Map (narrow margins, no chrome) ---
var mMap = getOrCreateMaster(doc, "D", "Map");
for (var p = 0; p < mMap.pages.length; p++) {
    with (mMap.pages[p].marginPreferences) {
        top    = "0.4in";
        bottom = "0.5in";
        left   = "0.35in";
        right  = "0.35in";
    }
}

// ─── Swatches ─────────────────────────────────────────────────────────────────

// Paper swatch (warm cream) — modify the default [Paper] swatch
// Note: InDesign's [Paper] swatch can't be renamed but can be recolored
// We'll just ensure our named swatches are available

// ─── Done ─────────────────────────────────────────────────────────────────────

alert("Vardøgr setup complete.\n\n" +
      "Created:\n" +
      "• 7 colors\n" +
      "• 22 paragraph styles\n" +
      "• 6 character styles\n" +
      "• 4 master pages (A-Body, B-Chapter Opener, C-Frontmatter, D-Map)\n" +
      "• 14pt baseline grid\n\n" +
      "Fonts required: Crimson Text, IM Fell English, IBM Plex Mono");

#!/usr/bin/env node
/**
 * flow-class.mjs — Parse a class entry from skromt-classes.md and generate
 * ExtendScript to flow it into InDesign with proper Vardøgr styles.
 *
 * Usage: node flow-class.mjs <class-number> [--dry-run]
 *
 * Outputs an ExtendScript (.jsx) file to stdout or writes to flow-output.jsx.
 * The script can be executed via the InDesign MCP `run_script` tool.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const CLASSES_FILE = join(process.env.HOME, 'Documents/skromt/skromt-classes.md');

// Combat grouping → save/XP data
const GROUPINGS = {
  'Fighter': {
    name: 'Martial',
    saves: [
      { levels: '1–3', d: 12, w: 13, p: 14, b: 15, s: 16 },
      { levels: '4–6', d: 10, w: 11, p: 12, b: 13, s: 14 },
      { levels: '7–9', d: 8, w: 9, p: 10, b: 10, s: 12 },
      { levels: '10+', d: 6, w: 7, p: 8, b: 8, s: 10 },
    ],
    xp: '0 / 2,000 / 4,000 / 8,000 / 16,000 / 32,000 / 64,000 / 120,000 / 240,000 / 360,000',
  },
  'Thief': {
    name: 'Skilled',
    saves: [
      { levels: '1–4', d: 13, w: 14, p: 13, b: 16, s: 15 },
      { levels: '5–8', d: 12, w: 13, p: 11, b: 14, s: 13 },
      { levels: '9–10', d: 10, w: 11, p: 9, b: 12, s: 10 },
    ],
    xp: '0 / 1,200 / 2,400 / 4,800 / 9,600 / 20,000 / 40,000 / 80,000 / 160,000 / 280,000',
  },
  'Cleric': {
    name: 'Faith',
    saves: [
      { levels: '1–4', d: 11, w: 12, p: 14, b: 16, s: 15 },
      { levels: '5–8', d: 9, w: 10, p: 12, b: 14, s: 12 },
      { levels: '9–10', d: 6, w: 7, p: 9, b: 11, s: 9 },
    ],
    xp: '0 / 1,500 / 3,000 / 6,000 / 12,000 / 25,000 / 50,000 / 100,000 / 200,000 / 300,000',
  },
  'Magic-User': {
    name: 'Uncanny',
    saves: [
      { levels: '1–5', d: 13, w: 14, p: 13, b: 16, s: 15 },
      { levels: '6–10', d: 11, w: 12, p: 11, b: 14, s: 12 },
    ],
    xp: '0 / 2,500 / 5,000 / 10,000 / 20,000 / 40,000 / 80,000 / 150,000 / 300,000 / 450,000',
  },
};

// The "Unseen" type labels from the class picker table
const UNSEEN_LABELS = {
  1: 'Negotiator', 2: 'Overlooked', 3: 'Blind', 4: 'Ordinary',
  5: 'Traveller', 6: 'Knows the courtesies', 7: 'Warded', 8: 'Adversary',
  9: 'Indebted', 10: 'At the threshold', 11: 'Overlooked', 12: 'Ordinary',
  13: 'Untested', 14: 'One of theirs', 15: 'Countrywise', 16: 'Courtesies kept',
};

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseClassEntry(md, classNum) {
  // Find the class section: ## <num>. <Name>: <subtitle>
  const pattern = new RegExp(
    `^## ${classNum}\\. (.+?):\\s*(.+?)$`,
    'm'
  );
  const match = md.match(pattern);
  if (!match) throw new Error(`Class ${classNum} not found`);

  const name = match[1].trim();
  const subtitle = match[2].trim();

  // Extract section from ## to next ## or ---
  const startIdx = md.indexOf(match[0]);
  const rest = md.slice(startIdx + match[0].length);
  const endMatch = rest.match(/\n---\n/);
  const section = rest.slice(0, endMatch ? endMatch.index : undefined).trim();

  // Tagline (italic line after heading)
  const taglineMatch = section.match(/^\*(.+?)\*$/m);
  const tagline = taglineMatch ? taglineMatch[1] : '';

  // Requirements line
  const reqLine = section.match(/^\*\*Requirements\*\*\s*(.+)$/m);
  const requirements = reqLine ? reqLine[1] : '';

  // Parse stat fields from requirements line
  const stats = {};
  const statPatterns = [
    [/\*\*Requirements\*\*\s*([\w\s\d]+?)(?:\s*·|\s*$)/, 'requirements'],
    [/\*\*Prime\*\*\s*(\w+)/, 'prime'],
    [/\*\*HD\*\*\s*(\w+)/, 'hd'],
    [/\*\*Max Level\*\*\s*(\d+)/, 'maxLevel'],
    [/\*\*Armor\*\*\s*(.+?)(?:\s*·|\s*$)/, 'armor'],
    [/\*\*Weapons\*\*\s*(.+?)(?:\s*·|\s*$)/, 'weapons'],
    [/\*\*Combat\*\*\s*Attacks as\s*(\S+)/, 'combat'],
  ];
  for (const [pat, key] of statPatterns) {
    const m = (reqLine ? reqLine[0] : '').match(pat);
    stats[key] = m ? m[1].trim() : '';
  }

  // Languages
  const langMatch = section.match(/^\*\*Languages\*\*\s*(.+)$/m);
  const languages = langMatch ? langMatch[1].trim() : '';

  // Standing
  const standingMatch = section.match(/^\*\*Standing\*\*\s*(.+)$/m);
  const standing = standingMatch ? standingMatch[1].trim() : '';

  // The Unseen
  const unseenMatch = section.match(/^\*\*The Unseen\*\*\s*(.+)$/m);
  const unseen = unseenMatch ? unseenMatch[1].trim() : '';

  // Abilities — lines starting with "- **Name.**"
  const abilities = [];
  const abilityPattern = /^- \*\*(.+?)\*\*\s*(.+)$/gm;
  let aMatch;
  while ((aMatch = abilityPattern.exec(section)) !== null) {
    abilities.push({ name: aMatch[1], text: aMatch[2].trim() });
  }

  // Burden
  const burdenMatch = section.match(/^\*\*Burden:\s*(.+?)\.\*\*\s*(.+)$/m);
  const burden = burdenMatch
    ? { name: burdenMatch[1], text: burdenMatch[2].trim() }
    : { name: '', text: '' };

  // Equipment
  const equipMatch = section.match(/^\*\*Equipment\.\*\*\s*(.+)$/m);
  const equipment = equipMatch ? equipMatch[1].trim() : '';

  // Determine grouping from combat
  const grouping = GROUPINGS[stats.combat] || GROUPINGS['Thief'];

  return {
    num: classNum,
    name,
    subtitle,
    tagline,
    stats,
    languages,
    standing,
    unseen,
    abilities,
    burden,
    equipment,
    grouping,
    unseenLabel: UNSEEN_LABELS[classNum] || '',
  };
}

// ─── ExtendScript Generator ──────────────────────────────────────────────────

function escJsx(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\r')
    .replace(/\u2013/g, '\\u2013')  // en-dash
    .replace(/\u2014/g, '\\u2014')  // em-dash
    .replace(/\u2019/g, '\\u2019')  // right single quote
    .replace(/\u2212/g, '\\u2212')  // minus sign
    .replace(/\u00E1/g, '\\u00E1')  // á
    .replace(/\u00B7/g, '\\u00B7'); // middle dot
}

function generateExtendScript(cls) {
  const lines = [];

  lines.push(`// Auto-generated by flow-class.mjs for Class ${cls.num}: ${cls.name}`);
  lines.push(`var doc = app.activeDocument;`);
  lines.push(``);

  // Helper functions
  lines.push(`function ps(name) {`);
  lines.push(`  for (var i = 0; i < doc.allParagraphStyles.length; i++) {`);
  lines.push(`    if (doc.allParagraphStyles[i].name === name) return doc.allParagraphStyles[i];`);
  lines.push(`  }`);
  lines.push(`  return doc.paragraphStyles[0];`);
  lines.push(`}`);
  lines.push(`function cs(name) {`);
  lines.push(`  for (var i = 0; i < doc.allCharacterStyles.length; i++) {`);
  lines.push(`    if (doc.allCharacterStyles[i].name === name) return doc.allCharacterStyles[i];`);
  lines.push(`  }`);
  lines.push(`  return null;`);
  lines.push(`}`);
  lines.push(``);

  // Colors
  lines.push(`var colorAccentLt = doc.colors.itemByName("Vard\\u00F8gr Accent Lt");`);
  lines.push(`var colorRule = doc.colors.itemByName("Vard\\u00F8gr Rule");`);
  lines.push(``);

  // Ensure enough pages
  lines.push(`// Ensure 2 pages`);
  lines.push(`while (doc.pages.length < 2) doc.pages.add();`);
  lines.push(``);

  // Clear existing content on both pages
  lines.push(`// Clear pages`);
  lines.push(`for (var pg = 0; pg < 2; pg++) {`);
  lines.push(`  var page = doc.pages[pg];`);
  lines.push(`  while (page.textFrames.length > 0) page.textFrames[0].remove();`);
  lines.push(`  while (page.rectangles.length > 0) page.rectangles[0].remove();`);
  lines.push(`  while (page.graphicLines.length > 0) page.graphicLines[0].remove();`);
  lines.push(`}`);
  lines.push(``);

  // Apply masters
  lines.push(`doc.pages[0].appliedMaster = doc.masterSpreads[0]; // B-Chapter Opener or A-Body`);
  lines.push(`doc.pages[1].appliedMaster = doc.masterSpreads[0];`);
  lines.push(``);

  // ── PAGE 1: Header + Stats + Intro ──

  // Main text column (left ~60%)
  lines.push(`// === PAGE 1 ===`);
  lines.push(`var page1 = doc.pages[0];`);
  lines.push(`var tf1 = page1.textFrames.add();`);
  lines.push(`tf1.geometricBounds = ["0.8in", "0.7in", "7.0in", "3.1in"];`);
  lines.push(``);

  // Build page 1 content
  const p1Paragraphs = [];
  const p1Styles = [];
  const p1BoldRanges = [];

  // Class label
  const label = `CLASS ${cls.num} \\u00B7 ${cls.unseenLabel.toUpperCase()}`;
  p1Paragraphs.push(label);
  p1Styles.push('Class Label');

  // Title
  p1Paragraphs.push(escJsx(cls.name));
  p1Styles.push('Class Title');

  // Subtitle
  p1Paragraphs.push(escJsx(cls.subtitle));
  p1Styles.push('Class Subtitle');

  // Tagline
  p1Paragraphs.push(escJsx(cls.tagline));
  p1Styles.push('Body First|italic');

  // Languages
  p1Paragraphs.push(`LANGUAGES: ${escJsx(cls.languages)}`);
  p1Styles.push('Body First');
  p1BoldRanges.push({ find: 'LANGUAGES:', style: 'Mono Bold' });

  // Standing
  p1Paragraphs.push(`STANDING: ${escJsx(cls.standing)}`);
  p1Styles.push('Body');
  p1BoldRanges.push({ find: 'STANDING:', style: 'Mono Bold' });

  // The Unseen
  p1Paragraphs.push(`THE UNSEEN: ${escJsx(cls.unseen)}`);
  p1Styles.push('Body');
  p1BoldRanges.push({ find: 'THE UNSEEN:', style: 'Mono Bold' });

  // Equipment
  p1Paragraphs.push(`EQUIPMENT: ${escJsx(cls.equipment)}`);
  p1Styles.push('Body');
  p1BoldRanges.push({ find: 'EQUIPMENT:', style: 'Mono Bold' });

  // Write content
  const p1Content = p1Paragraphs.join('\\r');
  lines.push(`tf1.contents = "${p1Content}";`);
  lines.push(``);

  // Apply styles
  lines.push(`var p1Story = tf1.parentStory;`);
  lines.push(`var p1Paras = p1Story.paragraphs;`);
  for (let i = 0; i < p1Styles.length; i++) {
    const [styleName, modifier] = p1Styles[i].split('|');
    lines.push(`p1Paras[${i}].appliedParagraphStyle = ps("${styleName}");`);
    if (modifier === 'italic') {
      lines.push(`p1Paras[${i}].fontStyle = "Italic";`);
    }
  }
  lines.push(``);

  // Apply char styles for labels
  for (const br of p1BoldRanges) {
    lines.push(`app.findTextPreferences = NothingEnum.NOTHING;`);
    lines.push(`app.changeTextPreferences = NothingEnum.NOTHING;`);
    lines.push(`app.findTextPreferences.findWhat = "${escJsx(br.find)}";`);
    lines.push(`var found = p1Story.findText();`);
    lines.push(`if (found.length > 0) found[0].appliedCharacterStyle = cs("${br.style}");`);
  }
  lines.push(`app.findTextPreferences = NothingEnum.NOTHING;`);
  lines.push(``);

  // Stat sidebar
  lines.push(`// Stat sidebar`);
  lines.push(`var statRule = page1.graphicLines.add();`);
  lines.push(`statRule.geometricBounds = ["1.7in", "3.3in", "1.7in", "4.55in"];`);
  lines.push(`statRule.strokeWeight = 0.5;`);
  lines.push(`statRule.strokeColor = colorRule;`);
  lines.push(``);
  lines.push(`var tfStat = page1.textFrames.add();`);
  lines.push(`tfStat.geometricBounds = ["1.75in", "3.3in", "3.6in", "4.55in"];`);

  const statLines = [
    `HD: ${escJsx(cls.stats.hd)}`,
    `Requirements: ${escJsx(cls.stats.requirements)}`,
    `Prime: ${escJsx(cls.stats.prime)}`,
    `Max Level: ${escJsx(cls.stats.maxLevel)}`,
    `Armor: ${escJsx(cls.stats.armor)}`,
    `Weapons: ${escJsx(cls.stats.weapons)}`,
    `Attacks: as ${escJsx(cls.stats.combat)}`,
  ];
  lines.push(`tfStat.contents = "${statLines.join('\\r')}";`);
  lines.push(`var statParas = tfStat.parentStory.paragraphs;`);
  lines.push(`for (var i = 0; i < statParas.length; i++) statParas[i].appliedParagraphStyle = ps("Stat Line");`);

  // Bold stat labels
  const statLabels = ['HD:', 'Requirements:', 'Prime:', 'Max Level:', 'Armor:', 'Weapons:', 'Attacks:'];
  lines.push(`var statLabels = ${JSON.stringify(statLabels)};`);
  lines.push(`for (var l = 0; l < statLabels.length; l++) {`);
  lines.push(`  app.findTextPreferences = NothingEnum.NOTHING;`);
  lines.push(`  app.changeTextPreferences = NothingEnum.NOTHING;`);
  lines.push(`  app.findTextPreferences.findWhat = statLabels[l];`);
  lines.push(`  var f = tfStat.parentStory.findText();`);
  lines.push(`  if (f.length > 0) f[0].appliedCharacterStyle = cs("Mono Bold");`);
  lines.push(`}`);
  lines.push(`app.findTextPreferences = NothingEnum.NOTHING;`);
  lines.push(``);

  // ── PAGE 2: Abilities + Burden + Table ──

  lines.push(`// === PAGE 2 ===`);
  lines.push(`var page2 = doc.pages[1];`);
  lines.push(`var tf2 = page2.textFrames.add();`);
  lines.push(`tf2.geometricBounds = ["0.8in", "0.95in", "7.3in", "4.8in"];`);
  lines.push(``);

  // Build page 2 content
  const p2Paragraphs = [];
  const p2Styles = [];
  const p2BoldRanges = [];

  // Abilities heading
  p2Paragraphs.push('Abilities');
  p2Styles.push('Heading 1');

  // Each ability
  for (const ability of cls.abilities) {
    p2Paragraphs.push(`${escJsx(ability.name)} ${escJsx(ability.text)}`);
    p2Styles.push('Body First');
    p2BoldRanges.push({ find: escJsx(ability.name), style: 'Bold' });
  }

  // Burden
  p2Paragraphs.push(`Burden: ${escJsx(cls.burden.name)}`);
  p2Styles.push('Heading 2');

  p2Paragraphs.push(escJsx(cls.burden.text));
  p2Styles.push('Body First');

  // Saves heading (table follows inline)
  p2Paragraphs.push(`Saves (${cls.grouping.name})`);
  p2Styles.push('Heading 4');

  const p2Content = p2Paragraphs.join('\\r');
  lines.push(`tf2.contents = "${p2Content}\\r";`);
  lines.push(``);

  // Apply styles
  lines.push(`var p2Story = tf2.parentStory;`);
  lines.push(`var p2Paras = p2Story.paragraphs;`);
  for (let i = 0; i < p2Styles.length; i++) {
    lines.push(`p2Paras[${i}].appliedParagraphStyle = ps("${p2Styles[i]}");`);
  }
  lines.push(``);

  // Bold ability names
  for (const br of p2BoldRanges) {
    lines.push(`app.findTextPreferences = NothingEnum.NOTHING;`);
    lines.push(`app.changeTextPreferences = NothingEnum.NOTHING;`);
    lines.push(`app.findTextPreferences.findWhat = "${br.find}";`);
    lines.push(`var found = p2Story.findText();`);
    lines.push(`if (found.length > 0) found[0].appliedCharacterStyle = cs("${br.style}");`);
  }
  lines.push(`app.findTextPreferences = NothingEnum.NOTHING;`);
  lines.push(``);

  // Inline saves table
  const saves = cls.grouping.saves;
  lines.push(`// Inline saves table`);
  lines.push(`var insertPt = p2Story.insertionPoints[-1];`);
  lines.push(`var table = insertPt.tables.add({`);
  lines.push(`  headerRowCount: 1,`);
  lines.push(`  bodyRowCount: ${saves.length},`);
  lines.push(`  columnCount: 6`);
  lines.push(`});`);
  lines.push(`table.columns[0].width = "0.55in";`);
  lines.push(`for (var c = 1; c < 6; c++) table.columns[c].width = "0.62in";`);
  lines.push(``);

  lines.push(`var hdr = ["Level", "Death", "Wands", "Para.", "Breath", "Spells"];`);
  lines.push(`for (var c = 0; c < 6; c++) {`);
  lines.push(`  table.rows[0].cells[c].contents = hdr[c];`);
  lines.push(`  table.rows[0].cells[c].paragraphs[0].appliedParagraphStyle = ps("Table Header");`);
  lines.push(`}`);

  for (let r = 0; r < saves.length; r++) {
    const s = saves[r];
    const row = [s.levels, s.d, s.w, s.p, s.b, s.s];
    lines.push(`var row${r} = ${JSON.stringify(row.map(String))};`);
    lines.push(`for (var c = 0; c < 6; c++) {`);
    lines.push(`  table.rows[${r + 1}].cells[c].contents = row${r}[c];`);
    lines.push(`  table.rows[${r + 1}].cells[c].paragraphs[0].appliedParagraphStyle = ps("Table Cell");`);
    lines.push(`}`);
  }
  lines.push(``);

  // Style borders
  lines.push(`for (var r = 0; r < table.rows.length; r++) {`);
  lines.push(`  for (var c = 0; c < table.rows[r].cells.length; c++) {`);
  lines.push(`    var cell = table.rows[r].cells[c];`);
  lines.push(`    cell.topEdgeStrokeWeight = 0.5;`);
  lines.push(`    cell.topEdgeStrokeColor = colorRule;`);
  lines.push(`    cell.bottomEdgeStrokeWeight = 0.5;`);
  lines.push(`    cell.bottomEdgeStrokeColor = colorRule;`);
  lines.push(`    cell.leftEdgeStrokeWeight = 0;`);
  lines.push(`    cell.rightEdgeStrokeWeight = 0;`);
  lines.push(`    cell.topInset = "2pt";`);
  lines.push(`    cell.bottomInset = "2pt";`);
  lines.push(`    cell.leftInset = "3pt";`);
  lines.push(`    cell.rightInset = "3pt";`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(`for (var c = 0; c < table.rows[0].cells.length; c++) {`);
  lines.push(`  table.rows[0].cells[c].fillColor = colorAccentLt;`);
  lines.push(`}`);
  lines.push(``);

  // XP line after table
  lines.push(`p2Story.insertionPoints[-1].contents = "\\rXP by level: ${escJsx(cls.grouping.xp)}";`);
  lines.push(`p2Story.paragraphs[-1].appliedParagraphStyle = ps("Stat Line");`);
  lines.push(``);

  lines.push(`"Class ${cls.num}: ${escJsx(cls.name)} flowed \\u2014 " + doc.pages.length + " pages";`);

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const classNum = parseInt(args[0] || '1', 10);
const dryRun = args.includes('--dry-run');

const md = readFileSync(CLASSES_FILE, 'utf-8');
const cls = parseClassEntry(md, classNum);

if (dryRun) {
  console.error(`Parsed class ${cls.num}: ${cls.name} (${cls.subtitle})`);
  console.error(`  Grouping: ${cls.grouping.name} (attacks as ${cls.stats.combat})`);
  console.error(`  Abilities: ${cls.abilities.length}`);
  console.error(`  Burden: ${cls.burden.name}`);
  console.error(`  Equipment: ${cls.equipment.substring(0, 60)}...`);
  process.exit(0);
}

const jsx = generateExtendScript(cls);
process.stdout.write(jsx);

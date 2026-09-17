/**
 * Prints one reference sheet per deck, card by card, saying of each whether the
 * game can deal it today.
 *
 * **Why a generator and not six hand-written files.** Whether a card is built
 * is not an opinion anybody should be typing: it is `orderIsDealt`'s answer,
 * read off the row — a row with a `deferred` sentence and no `effects` is in
 * the data, in the Compendium, and in no pool. The middle column here is the
 * design's own card text and the right-hand one is what the sim actually does
 * with it, taken from the describers' own words (`test/fixtures/cardText.json`,
 * the fixture every card-text test already pins), so the two can be read
 * against each other in one pass. That comparison is the whole point of the
 * sheet, and a hand-kept version of it would be wrong within a batch.
 *
 * **These sheets are a working surface, not a mirror.** The user reads them
 * while playtesting and edits them in place, and an edit here is a spec — so
 * unlike every other doc table that mirrors data, these carry no sync test and
 * this script is run **on request only**, never as a side effect of a batch.
 * Re-running it overwrites the file and every annotation in it.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const DECKS = [
  ['dominion', 'Dominion', 'Recruiting, positioning and using military units', 'Garrisons and disciplined armies; mobile raiding; territorial conquest; naval force'],
  ['expansionist', 'Expansionist', 'Citizens, worker charges, land and settlement geography', 'Population levies; forest management; preservation; worker-led claims and irrigation; complementary provinces'],
  ['commerce', 'Commerce', 'Routes, partnerships, goods and deliberate spending', 'Established domestic partners; overseas posts; manufactured and export goods; reserves versus purchased capability'],
  ['devotion', 'Devotion', 'Sacred buildings, rites, religious units and conversion', 'Local religious communities; missionary expansion; pastoral faith; faith-funded investment'],
  ['scientific', 'Scientific', 'Research detours, deposits, institutions, great people and asset maturity', 'On-draft charters; resource capability; concentrated or distributed works; acts and legacies; mature centres'],
  ['magisterial', 'Magisterial', 'Cultural institutions, wonders, great people and works', 'A monumental capital; distributed patronage; productive great works; military or religious courts'],
];

/** The bands as a player meets them, not as the field spells them. */
const BAND_WORDS = ['Early', 'Middle', 'Late', 'Final'];

const RARITY_WORDS = { common: 'common', uncommon: 'uncommon', rare: 'rare' };

const TITLE_OF = Object.fromEntries(DECKS.map(([id, title]) => [id, title]));

const rows = [];
for (const file of readdirSync('data/decks').sort()) {
  const orders = JSON.parse(readFileSync(`data/decks/${file}`, 'utf8')).orders;
  for (const id of Object.keys(orders)) rows.push({ id, file, ...orders[id] });
}

const printed = JSON.parse(readFileSync('test/fixtures/cardText.json', 'utf8')).order;

/** A table cell: one line, and never a pipe that would end the column early. */
const cell = (s) => String(s ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();

/** What the sim actually does with the row, in the describers' own words. */
const printedWords = (id) => (printed[id] ?? []).map((c) => c.text).join(' · ');

/** `orderIsDealt`'s answer, read the way the sim reads it. */
const isBuilt = (r) => r.deferred === undefined;

/**
 * `partnerOf` names the deck whose sheet this is, and turns on the column
 * saying which *other* deck each shared card belongs to — the fact a reader
 * balancing one shelf needs, since a shared card is spent out of two budgets.
 */
function tableFor(list, partnerOf) {
  const extra = partnerOf === undefined ? '' : ' Also in |';
  const dash = partnerOf === undefined ? '' : '---|';
  const out = [
    `| Card | Rarity |${extra} Status | The card | What the game does, or why not |`,
    `|---|---|${dash}---|---|---|`,
  ];
  for (const r of list) {
    const built = isBuilt(r);
    const name = r.charter === undefined ? r.name : `${r.name} *(charter)*`;
    const intent = r.text ?? (r.deferred ?? []).join(' ');
    // A deferred row with no `note` is one no wave has examined yet — say that
    // rather than echoing the middle column back, so the gap is visible.
    const right = built
      ? printedWords(r.id) || '— nothing printed; look at this row'
      : (r.note ?? '*no blocker recorded on the row*');
    const partner =
      partnerOf === undefined
        ? ''
        : ` ${(r.decks ?? []).filter((d) => d !== partnerOf).map((d) => TITLE_OF[d] ?? d).join(', ')} |`;
    out.push(
      `| **${cell(name)}** | ${RARITY_WORDS[r.rarity] ?? cell(r.rarity)} |${partner} ${built ? 'built' : 'deferred'} | ${cell(intent)} | ${cell(right)} |`,
    );
  }
  return out.join('\n');
}

function countTable(list) {
  const out = ['| Band | Cards | Built | Deferred |', '|---|---|---|---|'];
  for (let band = 0; band < 4; band++) {
    const inBand = list.filter((r) => r.band === band);
    if (inBand.length === 0) continue;
    const built = inBand.filter(isBuilt).length;
    out.push(`| ${BAND_WORDS[band]} | ${inBand.length} | ${built} | ${inBand.length - built} |`);
  }
  const built = list.filter(isBuilt).length;
  out.push(`| **All** | **${list.length}** | **${built}** | **${list.length - built}** |`);
  return out.join('\n');
}

/**
 * The rarity spread, band by band. The draw is rarity-first — 60 / 30 / 10,
 * renormalised when a rarity is absent — so a band holding one rare and
 * fourteen commons deals that rare far more often than a band holding six, and
 * a band with no rare at all pushes its whole tenth into the other two. That is
 * a balance fact about the shelf and not about any card, which is why it sits
 * here rather than in the tables.
 */
function raritySpread(list) {
  const out = ['| Band | Common | Uncommon | Rare |', '|---|---|---|---|'];
  for (let band = 0; band < 4; band++) {
    const inBand = list.filter((r) => r.band === band);
    if (inBand.length === 0) continue;
    const n = (k) => inBand.filter((r) => r.rarity === k).length;
    out.push(`| ${BAND_WORDS[band]} | ${n('common')} | ${n('uncommon')} | ${n('rare')} |`);
  }
  return out.join('\n');
}

const HEAD = (title, reward, directions) => `# The ${title} deck

**What it rewards:** ${reward}. **Directions inside it:** ${directions.toLowerCase()}.

*Generated by \`scripts/deckDocs.mjs\` from \`data/decks/*.json\` and the describers' own words. A card is **built** when the game can deal it — a row carrying a deferred sentence and no effects is in the data and the Compendium and in no pool. **Edit this file freely: your edits are the spec.** The generator is run on request only and overwrites everything here, annotations included.*
`;

mkdirSync('docs/decks', { recursive: true });

const summary = [];
for (const [deck, title, reward, directions] of DECKS) {
  const own = rows.filter((r) => (r.decks ?? []).length === 1 && r.decks[0] === deck);
  const shared = rows.filter((r) => (r.decks ?? []).length === 2 && r.decks.includes(deck));

  const parts = [
    HEAD(title, reward, directions),
    '## What stands\n',
    countTable(own),
    '',
    '### How the shelf is weighted\n',
    raritySpread(own),
    '',
  ];
  for (let band = 0; band < 4; band++) {
    const inBand = own.filter((r) => r.band === band);
    if (inBand.length === 0) continue;
    parts.push(`## ${BAND_WORDS[band]}\n`, tableFor(inBand), '');
  }
  if (shared.length > 0) {
    parts.push(
      `## Cards ${title} shares with another deck\n`,
      `A ${title} seat may draw every one of these, and so may a seat holding the deck named beside it — a shared card is spent out of two shelves, so a change here is felt in two decks. Listed in band order.\n`,
      tableFor([...shared].sort((a, b) => a.band - b.band), deck),
      '',
    );
  }
  writeFileSync(`docs/decks/${deck}.md`, parts.join('\n'));
  summary.push([title, own.length, own.filter(isBuilt).length, shared.length]);
}

// The eighteen any leader may draw belong to no deck, so they would otherwise
// be in no sheet at all; one shared appendix beats printing them six times.
const generic = rows.filter((r) => (r.decks ?? []).length === 0);
const genericParts = [
  `# Cards any leader may draw

These belong to no deck. Every seat may draw them whatever its two decks are, so they are the floor under all six sheets rather than part of any one shelf.

*Generated by \`scripts/deckDocs.mjs\`. The same rules apply as on the six deck sheets: **built** means the game can deal it, and your edits here are the spec.*
`,
  '## What stands\n',
  countTable(generic),
  '',
];
for (let band = 0; band < 4; band++) {
  const inBand = generic.filter((r) => r.band === band);
  if (inBand.length === 0) continue;
  genericParts.push(`## ${BAND_WORDS[band]}\n`, tableFor(inBand), '');
}
writeFileSync('docs/decks/common.md', genericParts.join('\n'));

const all = rows.length;
const allBuilt = rows.filter(isBuilt).length;
for (const [title, own, built, shared] of summary) {
  console.log(`${title.padEnd(14)} ${String(own).padStart(3)} own, ${String(built).padStart(3)} built, ${String(shared).padStart(3)} shared`);
}
console.log(`generic        ${String(generic.length).padStart(3)} own, ${String(generic.filter(isBuilt).length).padStart(3)} built`);
console.log(`all            ${all} rows, ${allBuilt} built, ${all - allBuilt} deferred`);

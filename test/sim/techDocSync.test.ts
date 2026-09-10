/**
 * The doc↔data sync test for the tree, `statecraftDocSync.test.ts`'s pattern one
 * table over (the user's workflow ruling: a doc table that mirrors data carries
 * a sync test) — **and the generator `docs/tech-tree.md` Part 2 has always
 * claimed to have.**
 *
 * Part 2 said "regenerated from the rows — never hand-maintained" while the
 * generator was a throwaway that had been thrown away, and this test pinned only
 * the node names, the costs and the per-age headings. So the three unlock
 * columns and the effect bullets drifted through several batches (R1's trader,
 * batch E's gifts, E4b's returned rows, the renewals, B6's costs) and nobody
 * failed. The fix is not a wider set of assertions about the doc's prose: it is
 * to **generate the prose** and assert the file holds exactly what the rows
 * print, which is the same bargain `cardTextSnapshot.test.ts` strikes with the
 * describers.
 *
 *   TECH_DOC_WRITE=1 npx vitest run test/sim/techDocSync.test.ts
 *
 * rewrites everything from the first `### Æra` heading to the end of the file
 * and leaves the hand-written halves — Part 1's standing determinations and Part
 * 2's preamble — exactly where they were. Read the diff before committing it:
 * the diff *is* the change to the tree, stated in one place.
 *
 * **Core, not slow** (CLAUDE.md's tier rule): it reads the tables and calls the
 * describers, touching no board and no seed. A source-reading register test is
 * always core, and a doc-reading one is the same shape.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef, isWonder } from '../../src/sim/buildingData';
import { improvementDef } from '../../src/sim/improvementData';
import { projectDef } from '../../src/sim/projectData';
import type { CardId } from '../../src/sim/statecraftData';
import { describeCard, stripRefs } from '../../src/sim/statecraft';
import {
  ABILITY_IDS,
  ABILITY_TECH,
  type TechAge,
  TECH_AGES,
  TECH_IDS,
  type TechId,
  abilityDef,
  eraNumeral,
  techDef,
} from '../../src/sim/techData';
import { type TechGift, techGifts } from '../../src/sim/techUnlocks';
import { unitDef } from '../../src/sim/unitData';
import { resourceDef } from '../../src/sim/resourceData';
import { renewalNote } from '../../src/ui/techTree';
import { techRuleNote } from '../../src/ui/techRuleWords';

/**
 * The names the ages are ruled by (Part 1, the tree pass of 2026-08-30). A local
 * table rather than a datum because an age's *name* is a design fact with no row
 * anywhere — the count and the band beside it in the heading are the data's, and
 * those are generated.
 */
const AGE_NAMES: Record<TechAge | 5, string> = {
  1: 'Omens',
  2: 'Heroes',
  3: 'Empire',
  4: 'Cathedrals',
  5: 'Magister',
};

/** The heading that opens one age's section — matched, and generated, as one. */
function ageHeading(age: TechAge): string {
  const live = TECH_IDS.filter((id) => techDef(id).age === age).map((id) => techDef(id));
  const costs = live.map((def) => def.cost);
  const low = Math.min(...costs);
  const high = Math.max(...costs);
  return `### Æra ${eraNumeral(age)} — The Age of ${AGE_NAMES[age]} (${live.length} nodes, ${low}–${high}🔬)`;
}

/**
 * One age's nodes, cheapest first and alphabetical inside a price.
 *
 * The order the table has always been read in, and the one a balance pass wants:
 * a column *is* a price, so a section sorted by price is a section sorted by
 * column, and the name breaks the tie so the row order is the data's rather than
 * the file order of `techs.json`.
 */
function nodesOfAge(age: TechAge): TechId[] {
  return TECH_IDS.filter((id) => techDef(id).age === age).sort((a, b) => {
    const cost = techDef(a).cost - techDef(b).cost;
    return cost !== 0 ? cost : techDef(a).name.localeCompare(techDef(b).name);
  });
}

// --- the marks ---------------------------------------------------------------

/**
 * A unit's name, with the seam it cannot be raised without.
 *
 * `UnitDef.requiresResource` is the whole of it: a chariot with no horses is a
 * row a player can read on the node and never build, and the table would be
 * lying about what the node hands over if it did not say so.
 */
function unitCell(gift: TechGift & { kind: 'unit' }): string {
  const def = unitDef(gift.id);
  const seams: string[] = [];
  if (def.requiresResource !== undefined) {
    seams.push(`needs improved ${resourceDef(def.requiresResource).name}`);
  }
  // The caravan is neither hammered nor bought since R1 (the user's ruling of
  // 2026-09-09, `docs/flags.md` (iii)): it arrives with a route paid for in gold
  // on the trade screen. The row is still Currency's gift and still climbs the
  // columns, so it stays in the table — saying what it is.
  if (def.routeOnly === true) seams.push('never built — comes with a route bought in gold');
  if (def.awaitsTech === true) seams.push('no technology opens it yet');
  return seams.length === 0 ? def.name : `${def.name} *(${seams.join('; ')})*`;
}

/**
 * A building's name wearing the marks its own row declares: **bold** for a
 * wonder, ‡ for a row one to a realm, ◇ for a row that is granted and never
 * built. Each is a field (`isWonder`, `oncePerEmpire`, `grantedOnly`), so the
 * marks cannot drift from what the game refuses.
 */
function buildingCell(gift: TechGift & { kind: 'building' }): string {
  const def = buildingDef(gift.id);
  let cell = isWonder(gift.id) ? `**${def.name}**` : def.name;
  if (def.grantedOnly === true) cell += ' ◇';
  if (def.oncePerEmpire === true) cell += ' ‡';
  return cell;
}

/** A cell's list, or the table's em dash for a node that hands over none. */
function cell(parts: readonly string[], separator = ', '): string {
  return parts.length === 0 ? '—' : parts.join(separator);
}

/**
 * The third column: everything that is not a thing a city builds.
 *
 * Read straight off `techGifts`, in `techGifts`' own order, so the doc lists a
 * node's gifts in the order the star chart's card lists them. A renewal is
 * quoted with `renewalNote` — the star chart's own composer — rather than with a
 * second opinion about what `+1🌾 on fresh water` reads like.
 */
function giftsCell(id: TechId): string {
  const parts: string[] = [];
  const renewals: string[] = [];
  for (const gift of techGifts(id)) {
    switch (gift.kind) {
      case 'improvement':
        // The star chart's own heading for this kind ("Workers may build"), so
        // the reference and the screen name the same gift the same way.
        parts.push(`workers may build ${improvementDef(gift.id).name}`);
        break;
      case 'ability':
        parts.push(gift.name);
        break;
      case 'reveal':
        parts.push(`reveals **${gift.name}**`);
        break;
      case 'renewal':
        renewals.push(`${gift.name} ${renewalNote(gift)}`);
        break;
      case 'buildingTileYield':
        // The one gift the star chart deliberately does not print (the building's
        // own Compendium entry says it). The doc is a designer's reference and
        // not a player's card, so it says it: a building that quietly starts
        // paying on ground of a certain kind is a balance fact.
        parts.push(`${gift.name} wakes on the ground`);
        break;
      // A unit, a building and a project are the two columns to the left, and a
      // node's own rules are the bullets below the table.
      case 'unit':
      case 'building':
      case 'project':
      case 'techEffect':
        break;
      default: {
        const unhandled: never = gift;
        void unhandled;
        break;
      }
    }
  }
  if (renewals.length > 0) parts.push(`renewals: ${renewals.join(', ')}`);
  if (techDef(id).paysBead !== undefined) parts.push('pays a **bead** to every completer');
  return cell(parts, ' · ');
}

/** One node's row of the age table. */
function nodeRow(id: TechId): string {
  const def = techDef(id);
  const name = (def.deferred ?? []).length > 0 ? `${def.name} †` : def.name;
  const prereqs = cell(def.prereqs.map((prereq) => techDef(prereq).name));
  // One walk, switched rather than filtered three times: `TechGift` is a union
  // discriminated by `kind`, and a predicate-less `filter` hands back the whole
  // union, which is a cast waiting to be wrong about later.
  const units: string[] = [];
  const buildings: string[] = [];
  for (const gift of techGifts(id)) {
    if (gift.kind === 'unit') units.push(unitCell(gift));
    else if (gift.kind === 'building') buildings.push(buildingCell(gift));
    else if (gift.kind === 'project') buildings.push(`*${projectDef(gift.id).name}* (project)`);
  }
  return `| ${name} | ${def.cost} | ${prereqs} | ${cell(units)} | ${cell(buildings)} | ${giftsCell(id)} |`;
}

/**
 * What one node says about itself: its **rules** first, in the numbered clauses
 * the star chart and the Compendium print, then its **note** in italics.
 *
 * Both halves, since batch L1 (`docs/audit/legibility.md` §2) split them. A note
 * is hard-rule-7 prose with no numbers in it and a balance pass reads this file
 * for the numbers, so the rules lead; but the note is the only thing several
 * nodes have to say at all — Iron Working's seams and Theology's second bag of
 * beliefs carry no `effects` and are not therefore silent — so dropping it would
 * lose the half of the tree that is a rule the engine keeps elsewhere.
 *
 * Refs are stripped: a keyword mark is four brackets and an id that means
 * nothing in a markdown file.
 */
function nodeBullets(id: TechId): string[] {
  const def = techDef(id);
  const bullets = describeCard(id as CardId).map((clause) => {
    const mark = clause.deferred === true ? '†' : '—';
    return `- **${def.name}** ${mark} ${stripRefs(clause.text)}`;
  });
  const note = techRuleNote(id);
  if (note.length > 0) bullets.push(`- **${def.name}** — *${note.join(' ')}*`);
  return bullets;
}

/** One whole age: the heading, the table, and the rules the age's nodes carry. */
function ageSection(age: TechAge): string {
  const lines: string[] = [ageHeading(age), ''];
  lines.push('| node | 🔬 | prereqs | units | buildings | abilities & gifts |');
  lines.push('|---|---|---|---|---|---|');
  const nodes = nodesOfAge(age);
  for (const id of nodes) lines.push(nodeRow(id));
  const bullets = nodes.flatMap((id) => nodeBullets(id));
  if (bullets.length > 0) {
    lines.push(
      '',
      "What the nodes say (the rules the chart prints, then each node's own note in *italics*):",
      '',
    );
    lines.push(...bullets);
  }
  return lines.join('\n');
}

/**
 * The verbs, in one table of their own.
 *
 * `abilityDef` carries a `summary` — the plain sentence the star chart prints
 * beside a verb that banks nothing — and a name alone in the gifts column above
 * told a reader nothing about what Ancestor Rites *is* (found in live play,
 * 2026-09-03, on the screen; the same is true of the reference). One row per
 * verb, with the node that hands it over.
 */
function verbSection(): string {
  const lines: string[] = [
    '### The verbs the tree hands over',
    '',
    '| verb | node | who gains it | what it does |',
    '|---|---|---|---|',
  ];
  for (const ability of ABILITY_IDS) {
    const def = abilityDef(ability);
    const node = ABILITY_TECH.get(ability);
    lines.push(
      `| ${def.name} | ${node === undefined ? '—' : techDef(node).name} | ${def.bearer ?? 'worker'} | ${def.summary} |`,
    );
  }
  return lines.join('\n');
}

/** Everything from the first `### Æra` heading to the end of the file. */
export function generatePartTwo(): string {
  const sections = [...TECH_AGES.map((age) => ageSection(age)), verbSection()];
  return `${sections.join('\n\n')}\n`;
}

// --- the file ----------------------------------------------------------------

// Declared rather than imported from `node:process` — `vite.config.ts`'s own
// bargain, and for its reason: this project's type surface is `vite/client`
// alone and one environment variable is not worth widening it.
declare const process: { env: Record<string, string | undefined> };

const WRITE = process.env.TECH_DOC_WRITE === '1';

/**
 * `node:fs`, behind a **variable** specifier, so the project's type surface stays
 * `vite/client` alone — `cardTextSnapshot.test.ts`'s bargain, for its reason: a
 * glob cannot write, and this test regenerates its own half of a document.
 */
const FS_SPECIFIER = 'node:fs';

interface MinimalFs {
  readFileSync(path: string, encoding: string): string;
  writeFileSync(path: string, data: string): void;
}

async function fs(): Promise<MinimalFs> {
  return (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
}

const DOC_PATH = new URL('../../docs/tech-tree.md', import.meta.url).pathname;

/** Where the generated half begins. Everything above it is the user's. */
const PART_TWO_MARK = '### Æra ';

/**
 * Where two readings first part company, by line — the failure a doc drift wants
 * to read as, rather than a ten-thousand-character diff of two markdown blobs.
 */
function firstDifference(expected: string, actual: string): string | null {
  const left = expected.split('\n');
  const right = actual.split('\n');
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i] === right[i]) continue;
    return [
      `docs/tech-tree.md Part 2, line ${i + 1} of the generated half:`,
      `  doc:  ${left[i] ?? '(end of file)'}`,
      `  rows: ${right[i] ?? '(end of file)'}`,
      'Regenerate: TECH_DOC_WRITE=1 npx vitest run test/sim/techDocSync.test.ts',
    ].join('\n');
  }
  return null;
}

describe('the tech-tree doc mirrors the rows', () => {
  it('gives every age a table', () => {
    // Derived from the data rather than restated: the day Æra V takes its first
    // node, this fails until somebody names it — which is the failure we want,
    // rather than an age nobody notices is missing from the reference.
    for (const age of TECH_AGES) {
      expect(AGE_NAMES[age], `no name written for age ${age}`).toBeDefined();
    }
  });

  it('prints every node at the price, the prereqs and the gifts the rows carry', async () => {
    const io = await fs();
    const doc = io.readFileSync(DOC_PATH, 'utf8');
    const start = doc.indexOf(PART_TWO_MARK);
    expect(start, 'no age section in docs/tech-tree.md').toBeGreaterThanOrEqual(0);
    const generated = generatePartTwo();
    if (WRITE) {
      io.writeFileSync(DOC_PATH, `${doc.slice(0, start)}${generated}`);
      // A written doc is not an assertion — it is the baseline. Said out loud so
      // a run that quietly rewrote one is visible in the output.
      console.log(`tech-tree: wrote ${DOC_PATH} (${generated.length} bytes generated)`);
      expect(generated.length).toBeGreaterThan(0);
      return;
    }
    expect(firstDifference(doc.slice(start), generated)).toBe(null);
  });

  it('leaves the hand-written halves alone', () => {
    // The generator owns everything below the first age heading and nothing
    // above it: Part 1 is the user's ruling sheet and Part 2's preamble is prose
    // about the batches. A generator that reached higher would eat them.
    expect(generatePartTwo().startsWith(PART_TWO_MARK)).toBe(true);
    expect(generatePartTwo()).not.toContain('## Standing determinations');
  });
});

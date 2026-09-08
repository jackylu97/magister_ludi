/**
 * **Every card's printed text, pinned byte for byte** — the standing gate the
 * describers answer to.
 *
 * Built for batch **E5** (`docs/flags.md` ruling (pp); the user's gate: *"a
 * before/after snapshot of every card's printed text"*), and unlike the parity
 * harness that flew beside it this one **stays**. E5 collapsed eight
 * yield-paying `CardEffect` kinds into one `pays` shape and merged eight
 * describer arms into one; the arithmetic was pinned by the parity boards (four
 * bot games, byte-identical, retired again when the batch landed as ruled), and
 * this pins the *words* — which is the half a player reads and the half no yield
 * fixture could see.
 *
 * What it walks: every id of every card class `anyCardDef` spans — governments,
 * doctrines, Orders, beliefs (pantheon, follower, enhancer), rites,
 * consecrations, buildings and wonders, great people, technologies, the Bead
 * Race's boons — plus the luxuries, whose signatures are written in the same
 * vocabulary and read by `resourceEffects.ts`' own describer. Both readings of
 * each clause are recorded: `raw` (the keyword marks as emitted, so a `ref` that
 * moved is caught) and `text` (`stripRefs`'d, the sentence a player is shown).
 *
 * **A describer change must regenerate this fixture deliberately.** That is the
 * whole point: the file is a decision, not a cache. When a card's words are
 * *meant* to move, run
 *
 *   CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts
 *
 * and read the diff on `test/fixtures/cardText.json` before committing it — the
 * diff is the change to the game's prose, stated in one place. A run with no
 * fixture at all writes one rather than failing, so a new class of card joins by
 * being added to `CLASSES` below.
 *
 * **Core, not slow** (CLAUDE.md's tier rule): it reads the tables and calls the
 * describers, touching no board and no seed. A source-reading register test is
 * always core, and this is that shape with the register written down as JSON.
 */

import { describe, expect, it } from 'vitest';

import { BEAD_ENDEAVOUR_IDS, BEAD_FEAT_IDS, BEAD_GRANT_IDS, BEAD_QUEST_IDS, BEAD_RECKONING_IDS } from '../../src/sim/beadData';
import { BUILDING_IDS } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { ALL_BELIEF_IDS, CONSECRATION_IDS, RITE_IDS } from '../../src/sim/religionData';
import { RESOURCE_IDS } from '../../src/sim/resourceData';
import { describeResourceSignature } from '../../src/sim/resourceEffects';
import { type CardId, DOCTRINE_IDS, GOVERNMENT_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { describeCard, stripRefs } from '../../src/sim/statecraft';
import { TECH_IDS } from '../../src/sim/techData';

// Declared rather than imported from `node:process` — `vite.config.ts`'s own
// bargain, and for its reason: this project's type surface is `vite/client`
// alone and one environment variable is not worth widening it.
declare const process: { env: Record<string, string | undefined> };

const WRITE = process.env.CARD_TEXT_WRITE === '1';

/**
 * The classes, in the order the fixture holds them.
 *
 * Every id list is its table's **file order** (`ORDER_IDS`' docblock), which is
 * the order every draw and every screen already walks, so the fixture's own
 * order is the data's rather than this file's opinion of it.
 */
const CLASSES: readonly { class: string; ids: readonly string[] }[] = [
  { class: 'government', ids: GOVERNMENT_IDS },
  { class: 'doctrine', ids: DOCTRINE_IDS },
  { class: 'order', ids: ORDER_IDS },
  { class: 'belief', ids: ALL_BELIEF_IDS },
  { class: 'rite', ids: RITE_IDS },
  { class: 'consecration', ids: CONSECRATION_IDS },
  { class: 'building', ids: BUILDING_IDS },
  { class: 'greatPerson', ids: GREAT_PERSON_IDS },
  { class: 'tech', ids: TECH_IDS },
  {
    class: 'bead',
    ids: [
      ...BEAD_FEAT_IDS,
      ...BEAD_ENDEAVOUR_IDS,
      ...BEAD_QUEST_IDS,
      ...BEAD_RECKONING_IDS,
      ...BEAD_GRANT_IDS,
    ],
  },
];

/** One card's clauses, both readings, plus the deferred mark each carries. */
function clausesOf(id: string): Record<string, unknown>[] {
  return describeCard(id as CardId).map((clause) => ({
    raw: clause.text,
    text: stripRefs(clause.text),
    ...(clause.deferred === true ? { deferred: true } : {}),
  }));
}

/**
 * The whole snapshot — every class, then the luxuries.
 *
 * A luxury is not a card class and its signature is read by its own evaluator
 * (`resourceEffects.ts`), but it is written in the cards' vocabulary and E5
 * migrated its rows with theirs, so its words belong in the same gate. Its
 * `fromAge` rides beside the text because a locked tier is styled off that field
 * rather than off the sentence.
 */
export function takeSnapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const group of CLASSES) {
    const cards: Record<string, unknown> = {};
    for (const id of group.ids) cards[id] = clausesOf(id);
    out[group.class] = cards;
  }
  const luxuries: Record<string, unknown> = {};
  for (const id of RESOURCE_IDS) {
    const lines = describeResourceSignature(id);
    if (lines.length === 0) continue;
    luxuries[id] = lines.map((line) => ({
      text: line.text,
      ...(line.fromAge === undefined ? {} : { fromAge: line.fromAge }),
    }));
  }
  out.resource = luxuries;
  return out;
}

// --- the fixture -------------------------------------------------------------

/**
 * `node:fs`, behind a **variable** specifier, so the project's type surface stays
 * `vite/client` alone — the same bargain `vite.config.ts` strikes with
 * `declare const process`. A glob cannot write, and this test writes its own
 * baseline.
 */
const FS_SPECIFIER = 'node:fs';

interface MinimalFs {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
  writeFileSync(path: string, data: string): void;
}

async function fs(): Promise<MinimalFs> {
  return (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
}

const FIXTURE_PATH = new URL('../fixtures/cardText.json', import.meta.url).pathname;

/**
 * Where two readings first part company, by path.
 *
 * Depth-first in the fixture's own key order, so the path a failure names is the
 * outermost thing that moved (class → card → clause → reading) rather than the
 * last leaf a diff happened to visit. `null` when the two agree.
 */
function firstDifference(expected: unknown, actual: unknown, path = ''): string | null {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return `${path}: ${JSON.stringify(expected)} — now ${JSON.stringify(actual)}`;
    }
    const shared = Math.min(expected.length, actual.length);
    for (let i = 0; i < shared; i++) {
      const found = firstDifference(expected[i], actual[i], `${path}[${i}]`);
      if (found) return found;
    }
    if (expected.length !== actual.length) {
      return `${path}.length: ${expected.length} — now ${actual.length}`;
    }
    return null;
  }
  const bothObjects =
    typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null;
  if (bothObjects) {
    const left = expected as Record<string, unknown>;
    const right = actual as Record<string, unknown>;
    const keys = [...Object.keys(left)];
    for (const key of Object.keys(right)) if (!keys.includes(key)) keys.push(key);
    for (const key of keys) {
      if (!(key in left) || !(key in right)) {
        return `${path}.${key}: ${JSON.stringify(left[key])} — now ${JSON.stringify(right[key])}`;
      }
      const found = firstDifference(left[key], right[key], `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }
  if (expected !== actual) return `${path}: ${JSON.stringify(expected)} — now ${JSON.stringify(actual)}`;
  return null;
}

describe("every card's printed text", () => {
  it('reads exactly as the committed snapshot', async () => {
    const snapshot = takeSnapshot();
    const io = await fs();
    const text = `${JSON.stringify(snapshot, null, 1)}\n`;
    if (WRITE || !io.existsSync(FIXTURE_PATH)) {
      io.writeFileSync(FIXTURE_PATH, text);
      // A written fixture is not an assertion — it is the baseline. Said out
      // loud so a run that quietly rewrote one is visible in the output.
      console.log(`cardText: wrote ${FIXTURE_PATH} (${text.length} bytes)`);
      expect(text.length).toBeGreaterThan(0);
      return;
    }
    const fixture = JSON.parse(io.readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;
    expect(firstDifference(fixture, snapshot, 'cardText')).toBe(null);
  });

  it('has words for every class it walks', () => {
    const snapshot = takeSnapshot();
    for (const group of CLASSES) {
      const cards = snapshot[group.class] as Record<string, unknown>;
      expect(Object.keys(cards).length, group.class).toBeGreaterThan(0);
    }
    expect(Object.keys(snapshot.resource as Record<string, unknown>).length).toBeGreaterThan(0);
  });
});

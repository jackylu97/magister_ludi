/**
 * **The leaders' two screens** — batch L2b, re-aimed at the second cut in L6b
 * (`docs/flags.md` (xxxx); `docs/leaders.md` "The second cut — fixed identity"
 * and the mockup are the specs of record).
 *
 * The new game's leader half and the leader's own record. Pure builders and
 * `?raw` source reading, no jsdom: this suite's discipline
 * (`wagerSheet.test.ts`'s). Everything that can be quietly wrong is a fold —
 * which figure a rival sits under, what a face says, which lines of the empire's
 * books carry the leader's name, whether a unique is open — and the drawing is
 * `append` calls that fail loudly.
 *
 * The claims, one section each:
 *
 *   · the landing **walks** the leader table, names no figure, prints **four
 *     lines** a face and names what opens each unique; the chosen figure lands
 *     in the config with the rivals behind it;
 *   · the draft is **gone** — no sheet, no overlay, no command, no blocker;
 *   · the leader sheet is the record of what your civ does: both rules with the
 *     ledger's own lines under them, both uniques with their open-or-coming
 *     state, and the towns the figure founds;
 *   · the sheet is on the shell and in the disposal register;
 *   · no surface prints a raw `[[`.
 */

import { describe, expect, it } from 'vitest';

import { createGame } from '../../src/sim/game';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { buildingDef } from '../../src/sim/buildingData';
import { unitDef } from '../../src/sim/unitData';
import { gatingTech, isUnlocked } from '../../src/sim/tech';
import { techDef } from '../../src/sim/techData';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import { stripRefs } from '../../src/sim/statecraft';
import { firstBlocker } from '../../src/ui/turnBlockers';
import {
  LEADER_FACE_LINES,
  LEADER_ROW_WORD,
  NO_LEADER,
  leaderFaceLines,
  leaderFaces,
  leaderOpeningWords,
  rivalLeaders,
  seatLeaders,
} from '../../src/ui/leaderSelect';
import {
  LEADER_PLAIN_SEAT,
  LEADER_SOURCE_WORD,
  LEADER_UNIQUE_OPEN,
  foldLeaderLedger,
  leaderAbilityRows,
  leaderCityRows,
  leaderLedgerLines,
  leaderUniqueRows,
} from '../../src/ui/leaderSheet';
import { DEFAULT_SEATS, rosterFor } from '../../src/ui/gameSetup';
import { uiSource } from './sourceHelpers';

const EVALUATOR = (
  import.meta.glob('../../src/sim/statecraft/evaluator.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/statecraft/evaluator.ts']!;

/** Every source under `src/`, for the sweeps that read outside `src/ui`. */
function srcFiles(): Record<string, string> {
  return import.meta.glob('../../src/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}

/** The first figure the sheet lists — never named here, so a rename is free. */
const FIRST: LeaderId = LEADER_IDS[0]!;
const SECOND: LeaderId = LEADER_IDS[1]!;

/** A two-seat game under two figures, with both capitals founded. */
function bench(seed = 11) {
  const g = createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: FIRST },
      { name: 'Bors', color: '#3a7fe8', leader: SECOND },
    ],
  });
  for (const playerId of [0, 1]) {
    const settler = g.state.units.find(
      (unit) => unit.ownerId === playerId && unitDef(unit.type).foundsCity,
    )!;
    foundCityAt(g.state, playerId, getTileAt(g.state.map, settler.col, settler.row)!);
  }
  return g;
}

// --- 1 · the new game's leader half -----------------------------------------

describe('the new game screen', () => {
  it('walks the leader table rather than listing it', () => {
    const faces = leaderFaces();
    expect(faces).toHaveLength(LEADER_IDS.length);
    expect(faces.map((face) => face.id)).toEqual([...LEADER_IDS]);
    for (const face of faces) {
      const def = leaderDef(face.id);
      expect(face.name).toBe(def.name);
      // Two abilities, in the sheet's own order, and the two rows off the row.
      expect(face.abilities.map((ability) => ability.id)).toEqual(
        def.abilities.map((ability) => ability.id),
      );
      expect(face.unit.id).toBe(def.unit);
      expect(face.building.id).toBe(def.building);
      expect(face.unit.name).toBe(unitDef(def.unit).name);
      expect(face.building.name).toBe(buildingDef(def.building).name);
    }
  });

  it('prints a whole figure in four lines: two rules, one soldier, one building', () => {
    // The second cut's own claim, drawn (`docs/leaders.md`, "The shape").
    expect(LEADER_FACE_LINES).toBe(4);
    for (const face of leaderFaces()) {
      const lines = leaderFaceLines(face);
      expect(lines, face.id).toHaveLength(LEADER_FACE_LINES);
      expect(lines.map((line) => line.kind)).toEqual(['ability', 'ability', 'unit', 'building']);
      // The rows' eyebrows are the kind, not the name — the name is inside the
      // clause, where it carries its keyword ref.
      expect(lines[2]!.label).toBe(LEADER_ROW_WORD.unit);
      expect(lines[3]!.label).toBe(LEADER_ROW_WORD.building);
      // Every one of the four says something.
      for (const line of lines) {
        expect(line.clauses.length, `${face.id} · ${line.label}`).toBeGreaterThan(0);
        for (const clause of line.clauses) expect(stripRefs(clause.text).length).toBeGreaterThan(0);
      }
    }
  });

  it('names what opens each unique — the technology, or the age of its column', () => {
    for (const face of leaderFaces()) {
      for (const row of [face.unit, face.building]) {
        expect(row.opens.length, `${face.id} · ${row.id}`).toBeGreaterThan(0);
        // The line is the row's name and its opening, and the name is a ref so
        // the reader is one press from the Compendium page.
        expect(row.text).toContain(`[[${row.kind}:${row.id}|${row.name}]]`);
        expect(row.text).toContain(row.opens);
        const gate = gatingTech(row.kind, row.id);
        if (gate !== null) expect(stripRefs(row.opens)).toContain(techDef(gate).name);
        else expect(row.opens).toMatch(/Æra/);
      }
    }
    // And a row the tree *does* name is named by its technology — the clause
    // that no unique exercises today, pinned against a row that does.
    const gated = gatingTech('unit', 'warrior')!;
    expect(gated).not.toBeNull();
    expect(stripRefs(leaderOpeningWords('unit', 'warrior'))).toContain(techDef(gated).name);
    expect(leaderOpeningWords('unit', 'warrior')).toContain(`[[tech:${gated}|`);
  });

  it('names no figure, no card and no knob in the page or its module', () => {
    // The arena panel's rule, one screen over: a fourteenth leader appears with
    // no page edit, which is only true while nothing on the page holds a name.
    // Whole words: `modu` is a leader id and also the first four letters of
    // "module", and a substring search would fail on English rather than on a
    // hard-coded figure.
    const names = (source: string, word: string): boolean =>
      new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(source);
    for (const name of ['leaderSelect.ts', 'index.html', 'style.css']) {
      const source = uiSource(name);
      for (const id of LEADER_IDS) {
        expect(names(source, id), `${name} names ${id}`).toBe(false);
        const written = leaderDef(id).name;
        expect(names(source, written), `${name} names ${written}`).toBe(false);
      }
    }
  });

  it('seats every rival under a distinct figure from the sheet minus yours', () => {
    const cast = rivalLeaders(FIRST, 5, 1234);
    expect(cast).toHaveLength(5);
    expect(cast.every((id) => id !== undefined)).toBe(true);
    expect(new Set(cast).size).toBe(cast.length);
    expect(cast).not.toContain(FIRST);
    for (const id of cast) expect(LEADER_IDS, String(id)).toContain(id);
    // A table with more chairs than the sheet has figures runs out rather than
    // repeating: the seats past the end sit under none.
    const overfull = rivalLeaders(FIRST, LEADER_IDS.length + 2, 1234);
    expect(overfull.slice(-3)).toEqual([undefined, undefined, undefined]);
    expect(new Set(overfull.filter((id) => id !== undefined)).size).toBe(LEADER_IDS.length - 1);
  });

  it('makes a seed a cast: the same seed deals the same figures, another may not', () => {
    expect(rivalLeaders(FIRST, 5, 99)).toEqual(rivalLeaders(FIRST, 5, 99));
    // Not a promise that every pair of seeds differs — a promise that the seed
    // is read at all. Two known-different casts, so a hash that ignored its seed
    // would fail here rather than passing on sheet order forever.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => rivalLeaders(FIRST, 5, seed).join(','));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('gives the rivals their figures even when you take none', () => {
    // *No leader* is an answer about your own seat, not about the world: it used
    // to empty the whole table, which drew a world with nobody in it.
    const seated = seatLeaders(rosterFor(6), NO_LEADER, 4242);
    expect('leader' in seated[0]!).toBe(false);
    const rivals = seated.slice(1).map((spec) => spec.leader);
    expect(rivals.every((id) => id !== undefined)).toBe(true);
    expect(new Set(rivals).size).toBe(rivals.length);
  });

  it('deals the default table six seats and six figures, no two the same', () => {
    // The board's own pin (`docs/flags.md` (nnnn)): the game the landing opens
    // on, with a figure taken, is six empires each under one of their own.
    const seated = seatLeaders(rosterFor(DEFAULT_SEATS), FIRST, 2026);
    expect(seated).toHaveLength(6);
    const figures = seated.map((spec) => spec.leader);
    expect(figures.every((id) => id !== undefined)).toBe(true);
    expect(new Set(figures).size).toBe(figures.length);
    expect(figures[0]).toBe(FIRST);
  });

  it('writes the chosen figure onto seat 0 and the rest behind it', () => {
    const seated = seatLeaders(rosterFor(4), FIRST, 7);
    expect(seated[0]!.leader).toBe(FIRST);
    expect(seated.slice(1).map((spec) => spec.leader)).toEqual(rivalLeaders(FIRST, 3, 7));
    // And nothing else on a spec moved.
    expect(seated.map((spec) => spec.name)).toEqual(rosterFor(4).map((spec) => spec.name));
  });

  it('leaves a seat under no figure byte-identical to one from before leaders', () => {
    // The solo table: one chair, nobody chosen, and therefore no `leader` key
    // anywhere in the config.
    const plain = rosterFor(1);
    expect(seatLeaders(plain, NO_LEADER, 5)).toEqual(plain);
    for (const spec of seatLeaders(plain, NO_LEADER, 5)) {
      expect('leader' in spec).toBe(false);
    }
  });

  it('draws its cast in the interface own arithmetic, never the sim seeded stream', () => {
    const source = uiSource('leaderSelect.ts');
    expect(source).toContain('hash3');
    expect(source).not.toContain('webciv:gameplay:');
    expect(source).not.toContain('hashSeed');
    expect(source).not.toMatch(/\bstate\.rng\b/);
    expect(source).not.toContain('Math.random');
  });

  it('is wired into the config and repainted on every showing of the landing', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('players: seatLeaders(');
    expect(main).toContain('leaderSelect.chosen,');
    // The seed the world is drawn from is the seed the cast is dealt from.
    expect(main).toContain('const seed = parseSeed(seedInput.value);');
    expect(main).toContain('leaderSelect.render();');
  });
});

// --- 2 · the draft is gone ---------------------------------------------------

describe("the leaders' draft", () => {
  it('raises no blocker: a figure is two rules and owes the turn nothing', () => {
    const g = bench();
    // Turn one, both capitals founded — the very board the draft used to stop.
    expect(firstBlocker(g.state, 0)?.kind).not.toBe('leaderDraft');
    // And the discriminant itself is gone from the union.
    expect(uiSource('turnBlockers.ts')).not.toContain("kind: 'leaderDraft'");
  });

  it('leaves no sheet, no overlay and no command anywhere in the tree', () => {
    for (const [path, source] of Object.entries(srcFiles())) {
      expect(source, `${path} names the draft sheet`).not.toContain('leaderDraftSheet');
      // Nothing *issues* the retired command. A docblock in the simulation may
      // still say the name out loud — `state.ts`'s schema paragraph records that
      // there is no such command — and that is a record, not a dispatch.
      expect(source, `${path} dispatches the retired command`).not.toContain(
        "type: 'chooseLeaderCard'",
      );
    }
    const html = uiSource('index.html');
    expect(html).not.toContain('leader-draft-overlay');
    expect(html).not.toContain('leader-draft-body');
    // `closePopovers` and the open-screen guards lost their entry with it.
    expect(uiSource('main.ts')).not.toContain('leaderDraft');
    expect(uiSource('style.css')).not.toContain('leader-draft-foot');
  });

  it('takes the dot off the fifth door: nothing behind it is ever owed', () => {
    const dock = uiSource('hudDock.ts');
    expect(dock).toContain('leaderButton');
    expect(dock).not.toContain('leaderBlocker');
  });
});

// --- 3 · your civ ------------------------------------------------------------

describe('the leader sheet', () => {
  it('lists both rules with the empire’s own lines under them', () => {
    const g = bench();
    const rows = leaderAbilityRows(g.state, 0);
    const def = leaderDef(FIRST);
    expect(rows.map((row) => row.id)).toEqual(def.abilities.map((ability) => ability.id));
    for (const row of rows) {
      expect(row.name).toBe(def.abilities.find((ability) => ability.id === row.id)!.name);
      expect(row.clauses.length, row.id).toBeGreaterThan(0);
      // Every line under a rule is one of the books' own, carrying that rule's
      // id and labelled with the class word the evaluator writes.
      for (const line of row.lines) {
        expect(line.card).toBe(row.id);
        expect(line.source.startsWith(`${LEADER_SOURCE_WORD} · `)).toBe(true);
      }
    }
    // Every gathered line belongs to one of the two rules or to the figure
    // itself (the unique's own row effects ride the figure's id).
    const all = leaderLedgerLines(g.state, 0);
    const owned = new Set<string>([...def.abilities.map((ability) => ability.id), FIRST]);
    for (const line of all) expect(owned.has(line.card), line.source).toBe(true);
    // And the fold is the fold of the list, never a figure beside it.
    const total = foldLeaderLedger(all);
    for (const key of Object.keys(total)) {
      const summed = all.reduce(
        (at, line) => at + ((line.yields as Record<string, number>)[key] ?? 0),
        0,
      );
      expect(total[key as keyof typeof total]).toBe(summed);
    }
  });

  it('lists both uniques with the simulation’s own open-or-coming state', () => {
    const g = bench();
    const rows = leaderUniqueRows(g.state, 0);
    const def = leaderDef(FIRST);
    expect(rows.map((row) => row.id)).toEqual([def.unit, def.building]);
    expect(rows.map((row) => row.kind)).toEqual(['unit', 'building']);
    for (const row of rows) {
      // The gate is asked of the simulation, never re-derived here.
      expect(row.open).toBe(isUnlocked(g.state, 0, row.kind, row.id));
      expect(row.word).toBe(LEADER_ROW_WORD[row.kind]);
      expect(row.note).toBe(row.open ? LEADER_UNIQUE_OPEN : `Not yet — it comes ${row.opens}.`);
      // A "coming at" sentence names the opening and carries no numeral.
      if (!row.open) expect(stripRefs(row.note)).not.toMatch(/[0-9]/);
    }
    // A rival's row is not this seat's: the gate's first question is the figure.
    for (const row of leaderUniqueRows(g.state, 0)) {
      expect(isUnlocked(g.state, 1, row.kind, row.id)).toBe(false);
    }
  });

  it('lists the towns the figure founds, in order, with the standing ones marked', () => {
    const g = bench();
    const rows = leaderCityRows(g.state, 0);
    expect(rows.map((row) => row.name)).toEqual([...leaderDef(FIRST).cities]);
    // The capital founded on the bench wears the first name on the list.
    expect(rows[0]!.founded).toBe(true);
    expect(rows.filter((row) => row.founded)).toHaveLength(1);
  });

  it('pins the class word against the evaluator’s own table', () => {
    // `MeterContribution` carries no id, so the meter half of the ledger keys
    // on the label's head. This is the pin that keeps the two names meeting.
    expect(EVALUATOR).toContain(`leader: '${LEADER_SOURCE_WORD}',`);
    expect(uiSource('leaderSheet.ts')).toContain('readEmpire');
    expect(uiSource('leaderSheet.ts')).toContain('isUnlocked(state, playerId, row.kind, row.id)');
  });

  it('answers a seat under no figure with a sentence rather than a blank page', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    expect(leaderAbilityRows(g.state, 0)).toEqual([]);
    expect(leaderUniqueRows(g.state, 0)).toEqual([]);
    expect(leaderCityRows(g.state, 0)).toEqual([]);
    expect(leaderLedgerLines(g.state, 0)).toEqual([]);
    expect(LEADER_PLAIN_SEAT).not.toMatch(/[0-9]/);
    expect(uiSource('leaderSheet.ts')).toContain('LEADER_PLAIN_SEAT');
  });
});

// --- 4 · the furniture -------------------------------------------------------

describe('the sheet’s furniture', () => {
  it('builds on the shell and hands the keyboard back to the door', () => {
    expect(uiSource('leaderSheet.ts')).toContain('createModalShell({');
    expect(uiSource('leaderSheet.ts')).toContain('trigger,');
    expect(uiSource('main.ts')).toContain('trigger: hudDock.leaderButton');
  });

  it('wears the overlay class the cap rule reads, and is hidden at rest', () => {
    const html = uiSource('index.html');
    const at = html.indexOf('id="leader-overlay"');
    expect(at).toBeGreaterThan(0);
    const block = html.slice(at, at + 400);
    expect(block).toContain('class="statecraft-overlay"');
    expect(block).toContain('hidden');
  });

  it('registers in the disposal register and nowhere by name', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('gameDisposers.push(() => leaderSheet?.dispose());');
    // And it is taken down by `closePopovers`, so it cannot stand over the
    // landing screen after a restart.
    expect(main).toContain('leaderSheet?.close();');
  });

  it('gives the dock a fifth door wearing the seat’s own charge', () => {
    const dock = uiSource('hudDock.ts');
    expect(dock).toContain('leaderButton');
    expect(dock).toContain('heraldryFor(localPlayerId(), player?.charge)');
    expect(uiSource('main.ts')).toContain('hudDock.leaderButton.addEventListener');
  });
});

// --- 5 · the sweep -----------------------------------------------------------

describe('the descriptor sweep', () => {
  it('prints no raw keyword marker on either surface', () => {
    const g = bench();
    const texts: string[] = [];
    for (const face of leaderFaces()) {
      for (const line of leaderFaceLines(face)) {
        texts.push(...line.clauses.map((clause) => clause.text));
      }
    }
    for (const row of leaderAbilityRows(g.state, 0)) {
      texts.push(...row.clauses.map((clause) => clause.text));
    }
    for (const row of leaderUniqueRows(g.state, 0)) texts.push(row.text, row.note);
    // Every one of them goes through `setDescriptorText`, which is what turns a
    // `[[kind:id|Name]]` into a drawn name — and `stripRefs` is the proof that
    // what is left after the markers is a sentence rather than a hole.
    for (const text of texts) {
      expect(stripRefs(text)).not.toContain('[[');
      expect(stripRefs(text).length, text).toBeGreaterThan(0);
    }
    for (const name of ['leaderSelect.ts', 'leaderSheet.ts']) {
      expect(uiSource(name)).toContain('setDescriptorText');
    }
  });
});

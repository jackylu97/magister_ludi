/**
 * **The leaders' three screens** — batch L2b, `docs/flags.md` (dddd); the
 * mockup of 2026-09-10 and `docs/leaders.md` are the specs of record.
 *
 * The new game's leader half, the age's draft sheet and the leader's own
 * record. Pure builders and `?raw` source reading, no jsdom: this suite's
 * discipline (`wagerSheet.test.ts`'s). Everything that can be quietly wrong is a
 * fold — which figure a rival sits under, what a card's face says, which lines
 * of the empire's books carry the leader's name — and the drawing is `append`
 * calls that fail loudly.
 *
 * The claims, one section each:
 *
 *   · the landing **walks** the leader table and names no figure, and the chosen
 *     figure lands in the config with the rivals behind it;
 *   · the draft sheet is raised by the blocker, prints the row's three faces
 *     with their "today" lines, and carries the simulation's own refusal;
 *   · the leader sheet lists what is held, what was left and what is locked, and
 *     its ledger is the empire's own lines filtered by the card on them;
 *   · both sheets are on the shell and in the disposal register;
 *   · no surface prints a raw `[[`.
 */

import { describe, expect, it } from 'vitest';

import { createGame, dispatch } from '../../src/sim/game';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { unitDef } from '../../src/sim/unitData';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import { leaderBlocker } from '../../src/sim/leaders';
import { stripRefs } from '../../src/sim/statecraft';
import { playerById } from '../../src/sim/state';
import { firstBlocker } from '../../src/ui/turnBlockers';
import {
  LEADER_FIRST_ROW_NOTE,
  LEADER_KIND_WORD,
  NO_LEADER,
  leaderFaces,
  rivalLeaders,
  seatLeaders,
} from '../../src/ui/leaderSelect';
import {
  LEADER_BOON_MOMENT,
  LEADER_DRAFT_LEAD,
  LEADER_DRAFT_WAITING,
  leaderDraftFaces,
  leaderDraftHeadline,
} from '../../src/ui/leaderDraftSheet';
import {
  LEADER_SOURCE_WORD,
  foldLeaderLedger,
  leaderHoldRows,
  leaderLedgerLines,
  leaderRowReach,
} from '../../src/ui/leaderSheet';
import { rosterFor } from '../../src/ui/gameSetup';
import { uiSource } from './sourceHelpers';

const EVALUATOR = (
  import.meta.glob('../../src/sim/statecraft/evaluator.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/statecraft/evaluator.ts']!;

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

/** The same game before anybody founds anything — the wait's own bench. */
function unfounded(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: FIRST },
      { name: 'Bors', color: '#3a7fe8', leader: SECOND },
    ],
  });
}

// --- 1 · the new game's leader half -----------------------------------------

describe('the new game screen', () => {
  it('walks the leader table rather than listing it', () => {
    const faces = leaderFaces();
    expect(faces).toHaveLength(LEADER_IDS.length);
    expect(faces.map((face) => face.id)).toEqual([...LEADER_IDS]);
    for (const face of faces) {
      expect(face.name).toBe(leaderDef(face.id).name);
      // Three cards in Æra I, in the sheet's own columns.
      expect(face.first.map((card) => card.kind)).toEqual(['passive', 'boon', 'unique']);
      expect(face.first.map((card) => card.word)).toEqual([
        LEADER_KIND_WORD.passive,
        LEADER_KIND_WORD.boon,
        LEADER_KIND_WORD.unique,
      ]);
    }
  });

  it('names no figure, no card and no knob in the page or its module', () => {
    // The arena panel's rule, one screen over: a seventh leader appears with no
    // page edit, which is only true while nothing on the page holds a name.
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

  it('says the one rule the sheet did not name, in plain words and with no figure', () => {
    expect(LEADER_FIRST_ROW_NOTE).toMatch(/capital/);
    expect(LEADER_FIRST_ROW_NOTE).not.toMatch(/[0-9]/);
  });

  it('seats the rivals from the remaining figures, in sheet order', () => {
    expect(rivalLeaders(FIRST, 3)).toEqual([LEADER_IDS[1], LEADER_IDS[2], LEADER_IDS[3]]);
    expect(rivalLeaders(SECOND, 2)).toEqual([LEADER_IDS[0], LEADER_IDS[2]]);
    // A table with more chairs than the sheet has figures runs out rather than
    // repeating: the seats past the end sit under none.
    expect(rivalLeaders(FIRST, LEADER_IDS.length + 2).slice(-2)).toEqual([undefined, undefined]);
  });

  it('writes the chosen figure onto seat 0 and the rest behind it', () => {
    const seated = seatLeaders(rosterFor('full'), FIRST);
    expect(seated[0]!.leader).toBe(FIRST);
    expect(seated.slice(1).map((spec) => spec.leader)).toEqual(rivalLeaders(FIRST, 3));
    // And nothing else on a spec moved.
    expect(seated.map((spec) => spec.name)).toEqual(rosterFor('full').map((spec) => spec.name));
  });

  it('leaves a leaderless roster byte-identical to one from before leaders', () => {
    const plain = rosterFor('bot', 'balanced');
    expect(seatLeaders(plain, NO_LEADER)).toEqual(plain);
    for (const spec of seatLeaders(plain, NO_LEADER)) {
      expect('leader' in spec).toBe(false);
    }
  });

  it('is wired into the config and repainted on every showing of the landing', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('seatLeaders(rosterFor(seatsSelect.value, personaSelect.value), leaderSelect.chosen)');
    expect(main).toContain('leaderSelect.render();');
  });
});

// --- 2 · the age's draft -----------------------------------------------------

describe("the leader's draft sheet", () => {
  it('prints the row the blocker is holding out, three faces in three inks', () => {
    const g = bench();
    expect(firstBlocker(g.state, 0)).toEqual({ kind: 'leaderDraft' });
    const offer = leaderBlocker(g.state, 0)!;
    const faces = leaderDraftFaces(g.state, 0, offer);
    expect(faces).toHaveLength(3);
    expect(faces.map((face) => face.kind)).toEqual(['passive', 'boon', 'unique']);
    expect(faces.map((face) => face.index)).toEqual([0, 1, 2]);
    for (const face of faces) expect(face.rejected).toBeNull();
    // The headline names the seat and the age, and nothing about how an age
    // turns over — the wager sheet's own absence, kept.
    expect(leaderDraftHeadline(g.state, 0, offer)).toContain('Ada');
  });

  it('gives every face something to read: a clause, a lump or a row', () => {
    const g = bench();
    const offer = leaderBlocker(g.state, 0)!;
    for (const face of leaderDraftFaces(g.state, 0, offer)) {
      const said = face.clauses.length + face.boon.length + face.row.length;
      expect(said, `${face.id} says nothing`).toBeGreaterThan(0);
    }
  });

  it("says what a boon hands over at this card's own moment, not a wonder's", () => {
    const g = bench();
    const offer = leaderBlocker(g.state, 0)!;
    const withGrant = leaderDraftFaces(g.state, 0, offer).flatMap((face) => face.boon);
    for (const clause of withGrant) {
      expect(clause.text).not.toContain('on completion');
    }
    // And the moment itself is a phrase with no figure in it.
    expect(LEADER_BOON_MOMENT).not.toMatch(/[0-9]/);
  });

  it("folds the passive's today line out of the empire's own ledger", () => {
    const g = bench();
    const offer = leaderBlocker(g.state, 0)!;
    const faces = leaderDraftFaces(g.state, 0, offer);
    // At least one of the three moves the books as the board stands — a figure
    // whose whole first row were silent would be a row nobody could compare.
    const speaks = faces.filter((face) => face.todayText !== null);
    expect(speaks.length + faces.filter((face) => face.row.length > 0).length).toBeGreaterThan(0);
    // Nothing on the sheet computes a yield: the reading is the ghost-diff's.
    expect(uiSource('leaderDraftSheet.ts')).toContain('explainCardImpact');
  });

  it('carries the simulation’s own refusal while there is no town', () => {
    const g = unfounded();
    const offer = playerById(g.state, 0)!.leaderOffer!;
    for (const face of leaderDraftFaces(g.state, 0, offer)) {
      expect(face.rejected).not.toBeNull();
    }
    // And the blocker holds its tongue, so the sheet is not raised at the
    // player — the row waits, and the sentence says it is not lost.
    expect(leaderBlocker(g.state, 0)).toBeNull();
    expect(LEADER_DRAFT_WAITING).toMatch(/still here/);
    expect(LEADER_DRAFT_WAITING).not.toMatch(/[0-9]/);
  });

  it('asks twice: a card is picked up, and the foot spends it', () => {
    // The mockup's own gesture, and the reason the card is not the button: the
    // two cards beside the one taken are gone the instant one is taken.
    const sheet = uiSource('leaderDraftSheet.ts');
    expect(sheet).toContain("card.setAttribute('aria-pressed', String(picked === face.index));");
    expect(sheet).toContain('picked = face.index;');
    expect(sheet).toContain('take.textContent = chosen === undefined');
    // And a fresh sheet forgets: a card picked up in one age is not a card
    // picked up in the next.
    expect(sheet).toContain('onShow: () => {');
  });

  it('issues the command and closes on Take, and is raised by the blocker', () => {
    const sheet = uiSource('leaderDraftSheet.ts');
    expect(sheet).toContain('if (!options.take(chosen.index)) return;');
    expect(sheet).toContain('shell.close();');
    const main = uiSource('main.ts');
    expect(main).toContain("type: 'chooseLeaderCard', playerId: seat, index");
    expect(main).toContain('onOfferLeaderDraft: () => leaderDraft?.open()');
    expect(uiSource('controls.ts')).toContain('onOfferLeaderDraft?.();');
  });

  it('leaves no lead prose with a figure in it', () => {
    expect(LEADER_DRAFT_LEAD).not.toMatch(/[0-9]/);
  });
});

// --- 3 · your leader ---------------------------------------------------------

describe('the leader sheet', () => {
  it('lists one row an age, in age order, with the three cards of each', () => {
    const g = bench();
    const rows = leaderHoldRows(g.state, 0);
    expect(rows.map((row) => row.age)).toEqual([1, 2, 3, 4]);
    for (const row of rows) expect(row.cards).toHaveLength(3);
    // Æra I is on the table on turn one; the three after it are out of reach.
    expect(rows[0]!.state).toBe('offered');
    expect(rows.slice(1).map((row) => row.state)).toEqual(['locked', 'locked', 'locked']);
    for (const row of rows.slice(1)) expect(row.reach).not.toBeNull();
  });

  it('marks the card taken and greys the two left beside it', () => {
    const g = bench();
    expect(dispatch(g, { type: 'chooseLeaderCard', playerId: 0, index: 0 }).ok).toBe(true);
    const row = leaderHoldRows(g.state, 0)[0]!;
    expect(row.state).toBe('taken');
    expect(row.cards.map((card) => card.taken)).toEqual([true, false, false]);
  });

  it('says how a locked row is reached, in plain words with no figure', () => {
    const reach = leaderRowReach(2);
    expect(reach).not.toMatch(/[0-9]/);
    expect(reach.length).toBeGreaterThan(0);
  });

  it('gathers the empire’s own lines, filtered by the card on them', () => {
    const g = bench();
    dispatch(g, { type: 'chooseLeaderCard', playerId: 0, index: 0 });
    const lines = leaderLedgerLines(g.state, 0);
    // Every gathered line is one the books already carry, labelled by the class
    // word the evaluator writes — the only handle a meter line offers.
    for (const line of lines) {
      expect(line.source.startsWith(`${LEADER_SOURCE_WORD} · `)).toBe(true);
    }
    // And the fold is the fold of the list, never a figure beside it.
    const total = foldLeaderLedger(lines);
    for (const key of Object.keys(total)) {
      const summed = lines.reduce(
        (at, line) => at + ((line.yields as Record<string, number>)[key] ?? 0),
        0,
      );
      expect(total[key as keyof typeof total]).toBe(summed);
    }
  });

  it('pins the class word against the evaluator’s own table', () => {
    // `MeterContribution` carries no id, so the meter half of the ledger keys
    // on the label's head. This is the pin that keeps the two names meeting.
    expect(EVALUATOR).toContain(`leader: '${LEADER_SOURCE_WORD}',`);
    expect(uiSource('leaderSheet.ts')).toContain('readEmpire');
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
    expect(leaderHoldRows(g.state, 0)).toEqual([]);
    expect(leaderLedgerLines(g.state, 0)).toEqual([]);
    expect(uiSource('leaderSheet.ts')).toContain('This seat sits under no leader');
  });
});

// --- 4 · the furniture -------------------------------------------------------

describe('the two sheets’ furniture', () => {
  it('builds both on the shell and hands the keyboard back to the door', () => {
    for (const name of ['leaderDraftSheet.ts', 'leaderSheet.ts']) {
      expect(uiSource(name)).toContain('createModalShell({');
    }
    expect(uiSource('leaderSheet.ts')).toContain('trigger,');
    expect(uiSource('main.ts')).toContain('trigger: hudDock.leaderButton');
  });

  it('wears the overlay class the cap rule reads, and is hidden at rest', () => {
    const html = uiSource('index.html');
    for (const id of ['leader-draft-overlay', 'leader-overlay']) {
      const at = html.indexOf(`id="${id}"`);
      expect(at, id).toBeGreaterThan(0);
      const block = html.slice(at, at + 400);
      expect(block, id).toContain('class="statecraft-overlay"');
      expect(block, id).toContain('hidden');
    }
  });

  it('registers both in the disposal register and nowhere by name', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('gameDisposers.push(() => leaderDraft?.dispose());');
    expect(main).toContain('gameDisposers.push(() => leaderSheet?.dispose());');
    // And both are taken down by `closePopovers`, so neither can stand over the
    // landing screen after a restart.
    expect(main).toContain('leaderDraft?.close();');
    expect(main).toContain('leaderSheet?.close();');
  });

  it('gives the record a way back to a row the seat still owes', () => {
    // A figure's row never expires, so the sheet that says what the row is for
    // is where it is found again — the claim the draft sheet's docblock makes.
    const sheet = uiSource('leaderSheet.ts');
    expect(sheet).toContain('onOpenDraft');
    expect(sheet).toContain('leaderBlocker(state, seat)');
    expect(uiSource('main.ts')).toContain('onOpenDraft: () => leaderDraft?.open()');
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
  it('prints no raw keyword marker on any of the three surfaces', () => {
    const g = bench();
    const offer = leaderBlocker(g.state, 0)!;
    const texts: string[] = [];
    for (const face of leaderFaces()) {
      texts.push(...face.bonus.map((clause) => clause.text));
      for (const card of face.first) texts.push(...card.clauses.map((clause) => clause.text));
    }
    for (const face of leaderDraftFaces(g.state, 0, offer)) {
      texts.push(...face.clauses.map((clause) => clause.text));
      texts.push(...face.boon.map((clause) => clause.text));
    }
    for (const row of leaderHoldRows(g.state, 0)) {
      for (const card of row.cards) texts.push(...card.clauses.map((clause) => clause.text));
    }
    // Every one of them goes through `setDescriptorText`, which is what turns a
    // `[[kind:id|Name]]` into a drawn name — and `stripRefs` is the proof that
    // what is left after the markers is a sentence rather than a hole.
    for (const text of texts) {
      expect(stripRefs(text)).not.toContain('[[');
      expect(stripRefs(text).length, text).toBeGreaterThan(0);
    }
    for (const name of ['leaderSelect.ts', 'leaderDraftSheet.ts', 'leaderSheet.ts']) {
      expect(uiSource(name)).toContain('setDescriptorText');
    }
  });
});

/**
 * The Diplomacy screen: every empire, where this seat stands with each, and the
 * two verbs that change it.
 *
 * `test/sim/war.test.ts` covers the rules; this covers the surface, and what a
 * surface can be *quietly* wrong about is its own:
 *
 *   1. **Which relation a row claims.** Peace, war and truce are exclusive and
 *      each has one sentence, so a row that said "at peace" through a truce
 *      would be offering a button the reducer refuses.
 *   2. **Which verb it offers, and why it is greyed.** Both come out of the
 *      simulation's own gates (`declareWarError`, `proposePeaceError`,
 *      `withdrawPeaceError`), so an offered button is a command the reducer
 *      takes — this interface's bargain everywhere a gate exists.
 *   3. **What the offer line says.** The peace mechanism has one surprising
 *      half — an offer stands and nothing happens until both do — and this is
 *      the one place the screen has to *explain* rather than report.
 *   4. **Who is on the sheet at all**: `diplomaticSeats`, so the wild and the
 *      fallen are not, and this file has no roster filter of its own.
 *   5. **Who you have met.** The user's ruling of 2026-09-03: an empire appears
 *      only once you have seen its land, its town or its pieces — or signed
 *      something with it. The reading is `hasMetSeat` (`src/sim/diplomacy.ts`),
 *      derived and stored nowhere, and the sheet applies it through
 *      `metDiplomacyRows`. A gate this quiet is exactly the kind a surface can
 *      be wrong about in both directions: an empire nobody has met on the sheet
 *      is a leak, and an empire that has declared war left off it is a peace a
 *      player cannot sue for.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sheet itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `seatRoster.test.ts` reads its
 * rule, the wirings that span files.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { hasMetSeat } from '../../src/sim/diplomacy';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { closeWar, openWar } from '../../src/sim/wars';
import { EXPLORED, recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { RULES } from '../../src/sim/rulesData';
import {
  declareConfirm,
  diplomacyRows,
  metDiplomacyRows,
  offerSentence,
  peaceButtonLabel,
  relationSentence,
  rosterNote,
} from '../../src/ui/diplomacyScreen';

function bench(seats = 2, wild = false): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors', 'Cyra'][index]!,
      color: colors[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(12 * 8).fill(null);
  state.units = [];
  state.cities = [];
  return state;
}

describe('the sheet’s rows', () => {
  it('lists every other real empire and nobody else', () => {
    const state = bench(3, true);
    const rows = diplomacyRows(state, 0);
    expect(rows.map((row) => row.playerId)).toEqual([1, 2]);
    // The wild has no seat at any table and never appears.
    expect(rows.some((row) => row.name === 'Barbarians')).toBe(false);
  });

  it('drops an empire that is gone', () => {
    const state = bench(3);
    state.players[2]!.eliminated = true;
    expect(diplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });

  it('reads peace, war and truce as three exclusive relations', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.relation).toBe('peace');
    expect(diplomacyRows(state, 0)[0]!.status).toBe('At peace');

    state.turn = 41;
    openWar(state, 0, 1);
    const atWarRow = diplomacyRows(state, 0)[0]!;
    expect(atWarRow.relation).toBe('war');
    expect(atWarRow.since).toBe(41);
    expect(atWarRow.status).toContain('41');

    closeWar(state, 0, 1);
    const truced = diplomacyRows(state, 0)[0]!;
    expect(truced.relation).toBe('truce');
    expect(truced.truceLeft).toBe(RULES.war.truceTurns);
    expect(truced.status).toContain(String(RULES.war.truceTurns));
  });

  it('greys the declare button with the reducer’s own sentence', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.declareError).toBeNull();
    openWar(state, 0, 1);
    expect(diplomacyRows(state, 0)[0]!.declareError).toContain('already at war');
    closeWar(state, 0, 1);
    expect(diplomacyRows(state, 0)[0]!.declareError).toContain('holds');
  });

  it('offers no peace where there is no war to sue over', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.peaceError).toContain('not at war');
  });

  it('shows both sides’ offers, and flips its own button to a withdrawal', () => {
    const state = bench();
    openWar(state, 0, 1);
    expect(peaceButtonLabel(diplomacyRows(state, 0)[0]!)).toBe('Offer peace');

    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const theirs = diplomacyRows(state, 0)[0]!;
    expect(theirs.theyOffered).toBe(true);
    expect(theirs.weOffered).toBe(false);
    // The one face that matters: their offer standing makes this the button
    // that ends the war, and it says so.
    expect(peaceButtonLabel(theirs)).toBe('Accept peace');
    expect(offerSentence(theirs)).toBe('They have offered peace.');

    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    const both = diplomacyRows(state, 0)[0]!;
    expect(both.weOffered).toBe(true);
    expect(peaceButtonLabel(both)).toBe('Withdraw offer');
    expect(offerSentence(both)).toContain('the war ends this turn');
    // And the button is still offered, because withdrawing is legal.
    expect(both.peaceError).toBeNull();
  });

  it('says nothing about offers on a row that is not a war', () => {
    const state = bench();
    expect(offerSentence(diplomacyRows(state, 0)[0]!)).toBeNull();
  });
});

describe('the met gate', () => {
  function town(state: GameState, seat: number, col: number, row: number): City {
    const tile = getTileAt(state.map, col, row);
    if (!tile) throw new Error('no tile');
    return foundCityAt(state, seat, tile);
  }

  /** One of that empire's owned hexes that is not the town square itself. */
  function ownedTileOf(state: GameState, city: City): number {
    const centre = tileIndex(state.map, city.col, city.row);
    const index = state.tileOwner.findIndex(
      (owner, at) => owner === city.id && at !== centre,
    );
    if (index < 0) throw new Error('the town claimed nothing');
    return index;
  }

  it('leaves an empire nobody has seen off the sheet, while the world still knows it', () => {
    const state = bench();
    town(state, 1, 10, 4);
    // The world's own list is unchanged — the gate is a *reading* of it, so a
    // test, a spectator or a bot can still ask about a relation nobody has met.
    expect(diplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
    expect(diplomacyRows(state, 0)[0]!.met).toBe(false);
    expect(metDiplomacyRows(state, 0)).toEqual([]);
    expect(hasMetSeat(state, 0, 1)).toBe(false);
  });

  it('meets an empire whose land is on your chart', () => {
    const state = bench();
    const theirs = town(state, 1, 10, 4);
    const index = ownedTileOf(state, theirs);
    state.visibility[0]![index] = EXPLORED;
    // Remembered ground, not watched ground: the territory layer draws the
    // current owner on any explored hex, so this is what the player can see.
    expect(hasMetSeat(state, 0, 1)).toBe(true);
    expect(metDiplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });

  it('meets an empire whose town you remember, and keeps it after the scout goes home', () => {
    const state = bench();
    town(state, 1, 10, 4);
    createUnit(state, 0, 'warrior', 9, 4);
    recomputeVisibility(state, 0);
    expect(state.citySightings[0]!.some((sighting) => sighting.ownerId === 1)).toBe(true);

    // The scout is recalled and every hex it lit is forgotten — the memory of
    // the town is the one thing that survives, and it is enough.
    state.units = [];
    recomputeVisibility(state, 0);
    state.visibility[0] = state.visibility[0]!.map(() => 0);
    expect(hasMetSeat(state, 0, 1)).toBe(true);
  });

  it('meets an empire whose piece is under your eye — and forgets it when it goes', () => {
    const state = bench();
    createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    recomputeVisibility(state, 0);
    expect(hasMetSeat(state, 0, 1)).toBe(true);

    // The stated gap (`hasMetSeat`'s docblock): nothing in this simulation
    // remembers a column that walked past and walked away, so a meeting made by
    // a fleeting sighting lasts as long as the sighting. Closing it honestly
    // means new state and a schema bump — a ruling, not a patch.
    theirs.col = 11;
    recomputeVisibility(state, 0);
    expect(hasMetSeat(state, 0, 1)).toBe(false);
  });

  it('meets an empire that has declared war, so the peace can be sued for', () => {
    const state = bench();
    // Nothing seen, nothing owned: only the war row stands between them.
    openWar(state, 1, 0);
    const rows = metDiplomacyRows(state, 0);
    expect(rows.map((row) => row.playerId)).toEqual([1]);
    expect(rows[0]!.relation).toBe('war');
    expect(rows[0]!.peaceError).toBeNull();
  });

  it('meets an empire that has put a paper on the table', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    expect(metDiplomacyRows(state, 0)).toEqual([]);
    state.players[1]!.gold = 50;
    applyCommand(state, {
      type: 'proposeDeal',
      playerId: 1,
      targetId: 0,
      give: { gold: 20 },
      take: {},
    } as never);
    expect(state.dealProposals).toHaveLength(1);
    expect(metDiplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });
});

describe('the roster’s second line', () => {
  it('says the one thing that must not need a click, and never a figure', () => {
    const state = bench();
    openWar(state, 0, 1);
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const row = diplomacyRows(state, 0)[0]!;
    expect(rosterNote(row)).toBe('They have offered peace.');
    // Counts are marks beside the name, never words in a sentence (rule 7).
    expect(/\d/.test(rosterNote(row) ?? '')).toBe(false);
  });

  it('says nothing at all about a quiet peace', () => {
    const state = bench();
    expect(rosterNote(diplomacyRows(state, 0)[0]!)).toBeNull();
  });
});

describe('the sentences', () => {
  it('names the turn a war opened, and never prints a bare "at war" with one', () => {
    expect(relationSentence('war', 41, 0)).toBe('At war since turn 41');
    expect(relationSentence('war', null, 0)).toBe('At war');
  });

  it('says "one turn" rather than a figure of one', () => {
    expect(relationSentence('truce', null, 1)).toBe('Truce — one turn left');
    expect(relationSentence('truce', null, 4)).toContain('4');
  });

  it('asks the confirm card a question with a verb on it, never "OK"', () => {
    const request = declareConfirm('Bors');
    expect(request.title).toContain('Bors');
    expect(request.confirmLabel).toBe('Declare war');
    // Escape and Cancel mean no, so the harmless answer says what it protects.
    expect(request.cancelLabel).toBe('Keep the peace');
    // No numbers in player prose (hard rule 7): the truce's length is on the
    // row's own countdown, not in a sentence.
    expect(/\d/.test(request.body)).toBe(false);
  });
});

describe('the wiring that spans files', () => {
  const sources = import.meta.glob('../../src/{main,ui/hudDock,ui/diplomacyScreen}.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const source = (name: string): string => {
    const key = Object.keys(sources).find((k) => k.endsWith(`/${name}`));
    if (!key) throw new Error(`source not globbed: ${name}`);
    return sources[key]!;
  };

  it('gives the dock a third button and mounts all three', () => {
    const dock = source('hudDock.ts');
    expect(dock).toContain("buildButton(\n    'hud-dock-diplomacy'");
    expect(dock).toContain('container.append(statecraftButton, religionButton, diplomacyButton);');
  });

  it('opens the sheet from that button, through the same door the other two use', () => {
    const main = source('main.ts');
    expect(main).toContain('hudDock.diplomacyButton.addEventListener');
    expect(main).toContain('openScreen(() => diplomacy?.open())');
  });

  it('sends every write as a command, and never touches the state itself', () => {
    const screen = source('diplomacyScreen.ts');
    expect(screen).not.toContain('applyCommand');
    expect(screen).not.toContain('dispatch(');
    // And never the platform's own dialog — `confirmCard.ts`'s standing rule,
    // which `confirmCard.test.ts` pins across the whole of `src/ui`. The
    // confirm step is handed in as `askConfirm`, so this file has no opinion
    // about where the card lives.
    expect(screen).toContain('askConfirm(declareConfirm(row.name)');
  });

  it('closes every other surface when it opens, and is closed by the sweep', () => {
    const main = source('main.ts');
    expect(main).toContain('diplomacy?.close();');
    expect(main).toContain('(diplomacy?.isOpen ?? false) ||');
    expect(main).toContain('gameDisposers.push(() => diplomacy?.dispose());');
  });
});

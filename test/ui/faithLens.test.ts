/**
 * The faith lens's two halves, ruled on 2026-08-28: **a religious piece raises
 * it**, and **hovering a town under it prints that town's pressure ledger**.
 *
 * Two kinds of test, this suite's usual split (`religionV2.test.ts`). The rule
 * that decides a lens and the reading that decides what a seat may know are
 * pure, exported, and driven for real against a world with two faiths in it;
 * the *wiring* — a renderer, a pointer, an `infoCard` — is asserted by reading
 * the source, because its failure mode is a surface asking the wrong function
 * and that is visible in which name a file called, never in a rendered output.
 *
 * The claim worth the most here is the **leak**. `explainPressure` is omniscient
 * and a hover card is not: a town the seat has sighted and cannot currently see
 * must not report its congregation, its banner, or any faith but the seat's own.
 * That is one filter in one function, it is silent when it is wrong, and no
 * behavioural test in this repo would notice — so it is pinned three ways here,
 * on a fixture built by driving visibility rather than by writing grids.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import {
  type GameState,
  type Religion,
  createUnit,
  newGame,
  removeUnit,
} from '../../src/sim/state';
import { explainPressure, foundReligion } from '../../src/sim/religion';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { unitDef } from '../../src/sim/unitData';
import { lensForSelection } from '../../src/ui/controls';
import { faithHoverReading, faithHoverText } from '../../src/ui/faithHover';

const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** One file's source with its comments taken out. `seatRoster.test.ts`'s. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceOf(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(SOURCE[key!]!);
}

/** The body of one `function name(` in a module, braces balanced. */
function fn(file: string, name: string): string {
  const text = sourceOf(file);
  const at = text.indexOf(`function ${name}(`);
  expect(`${file}:${name}`).toBe(at < 0 ? `${file}: no ${name}` : `${file}:${name}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`${file}'s ${name} never closes`);
}

// --- which lens a piece raises ----------------------------------------------

describe('lensForSelection', () => {
  /**
   * The ruling's own three cases, plus the one it implies. Asked of the roster's
   * markers so a second prophet or a second augur inherits the lens with its
   * data row — which is the whole reason the rule reads `prophesies` and
   * `consecrates` rather than two names.
   */
  it('raises the faith lens for a prophet', () => {
    expect(unitDef('prophet').prophesies).toBe(true);
    expect(lensForSelection(unitDef('prophet'), 'none')).toBe('faith');
  });

  it('raises it for an augur too — the Preaching is a pulse laid on the board', () => {
    expect(unitDef('augur').consecrates).toBe(true);
    expect(lensForSelection(unitDef('augur'), 'none')).toBe('faith');
  });

  /**
   * A warrior raises **no faith lens**. It raises the explorer lens, which is
   * the rule that predates this ruling and is untouched by it — "→ none" in the
   * ruling means "nothing religious", and asserting both halves is what keeps a
   * future edit from buying one at the cost of the other.
   */
  it('raises nothing religious for a fighting piece', () => {
    expect(lensForSelection(unitDef('warrior'), 'none')).not.toBe('faith');
    expect(lensForSelection(unitDef('warrior'), 'none')).toBe('explorer');
  });

  /** And a piece that asks no question of its own leaves the player's choice. */
  it('leaves an ordinary civilian alone', () => {
    expect(lensForSelection(unitDef('worker'), 'none')).toBe('none');
    expect(lensForSelection(unitDef('worker'), 'explorer')).toBe('explorer');
  });

  it('is the settler lens for a settler, which still wins', () => {
    expect(lensForSelection(unitDef('settler'), 'none')).toBe('settler');
  });

  /**
   * The half of the old "faith is never auto-raised" note that survives: a
   * player who went to the menu for it has not stopped asking because they
   * clicked a warrior. It is a rule about the *manual* lens alone, so dropping
   * the piece puts the automatic set straight back.
   */
  it('lets a manual faith lens beat every piece', () => {
    for (const type of ['warrior', 'settler', 'worker', 'prophet'] as const) {
      expect(lensForSelection(unitDef(type), 'faith')).toBe('faith');
    }
    expect(lensForSelection(null, 'faith')).toBe('faith');
    // And it is the manual lens that is beaten back, never overwritten: with the
    // menu on `none`, the piece rules answer as they always did.
    expect(lensForSelection(unitDef('settler'), 'none')).toBe('settler');
  });
});

// --- a world with two faiths in it ------------------------------------------

/**
 * Three seats, three towns, two religions, and a seat-0 holy site pressing on
 * all of them.
 *
 *   Uruk    (4,4)   seat 0's capital, watched — it is its own.
 *   Lagash  (10,6)  seat 1's capital, **watched** by a seat-0 scout standing
 *                   beside it.
 *   Nippur  (13,9)  seat 1's, **remembered**: a scout stood on it, was seen to,
 *                   and left. The sighting survives; the sight does not.
 *
 * Visibility is *driven* rather than written — a scout placed, a recompute, the
 * scout removed, a second recompute — because the rule under test is "what may
 * this seat read", and a hand-written grid would be the test agreeing with
 * itself about the very thing that is meant to be checked.
 */
function faithWorld(): { state: GameState; ours: Religion; theirs: Religion } {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Azure', color: '#2a4d8f', isHuman: true },
      { name: 'Crimson', color: '#8f2a2a', isHuman: false },
      { name: 'Verdant', color: '#2a8f4d', isHuman: false },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  state.cities[0]!.name = 'Uruk';
  foundCityAt(state, 1, getTileAt(state.map, 10, 6)!);
  state.cities[1]!.name = 'Lagash';
  foundCityAt(state, 1, getTileAt(state.map, 13, 9)!);
  state.cities[2]!.name = 'Nippur';

  const ours = found(state, 0);
  const theirs = found(state, 1);

  // Seat 0's holy site, on ground Uruk claimed — what its faith presses on the
  // near half of the world (`siteRange` 6).
  getTileAt(state.map, 5, 4)!.improvement = 'holySite';
  // And a proclamation standing over Nippur, so the far town has one of the
  // seat's *own* sources on it. That is the whole point of the remembered
  // reading: a line the seat can account for without seeing the place.
  // Crimson has preached there too, which is what makes the leak test a filter
  // doing work rather than a world with nothing in it to leak.
  for (const religion of [ours, theirs]) {
    religion.pulses.push({
      col: 13,
      row: 9,
      strength: 12,
      range: 2,
      startTurn: state.turn,
      expiresTurn: state.turn + 10,
    });
  }

  // Who follows what. Uruk is split — the case a count has to survive — and
  // Lagash flies Crimson's banner outright.
  state.cities[0]!.population = 5;
  state.cities[0]!.followers = { [ours.id]: 3, [theirs.id]: 1 };
  state.cities[1]!.population = 4;
  state.cities[1]!.followers = { [theirs.id]: 3 };
  state.cities[2]!.population = 3;
  state.cities[2]!.followers = { [theirs.id]: 2 };

  // A scout beside Lagash, and one on Nippur that then leaves.
  createUnit(state, 0, 'scout', 10, 5);
  const wanderer = createUnit(state, 0, 'scout', 13, 9);
  recomputeVisibility(state, 0);
  removeUnit(state, wanderer.id);
  recomputeVisibility(state, 0);
  return { state, ours, theirs };
}

/** Founds a faith for one seat, out of one god, the way the verb does. */
function found(state: GameState, seat: number): Religion {
  const player = state.players[seat]!;
  player.pantheon.beliefs.push(BELIEF_IDS[0]!);
  return foundReligion(state, player);
}

describe('the fixture itself', () => {
  it('is watched, watched and remembered — the three readings the card has', () => {
    const { state } = faithWorld();
    expect(faithHoverReading(state, state.cities[0]!, 0)?.knowledge).toBe('watched');
    expect(faithHoverReading(state, state.cities[1]!, 0)?.knowledge).toBe('watched');
    expect(faithHoverReading(state, state.cities[2]!, 0)?.knowledge).toBe('remembered');
  });
});

// --- what the card says ------------------------------------------------------

describe('faithHoverText, on the seat’s own town', () => {
  it('names the town, its size, its banner, and every faith with a claim', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[0]!, 0);
    expect(text.split('\n')).toEqual([
      'Uruk ✶ · Azure · 5 citizens · follows the Grain Cult',
      'the Grain Cult · 3 of 5 — Holy site +6 · Your capital +4 — 10 a turn',
      // A faith with followers and no pressure — the tide carried it here and
      // has since receded. Not "Nothing presses here.", which is the *card's*
      // sentence for a town nothing has reached.
      'the Way of the Hearth · 1 of 5 — nothing presses',
      '1 of 5 follow the old gods.',
    ]);
  });
});

describe('faithHoverText, on a foreign town the seat can see', () => {
  it('reports the whole tide, its own faith and the rival’s alike', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[1]!, 0);
    expect(text.split('\n')).toEqual([
      'Lagash ✶ · Crimson · 4 citizens · follows the Way of the Hearth',
      // Founding order, `state.religions`' own — never "mine first". A faith
      // with no followers here and real pressure is exactly the reading a
      // player raises this lens to get.
      'the Grain Cult · 0 of 4 — Holy site +6 — 6 a turn',
      'the Way of the Hearth · 3 of 4 — Your capital +4 — 4 a turn',
      '1 of 4 follow the old gods.',
    ]);
  });
});

describe('faithHoverText, on a foreign town the seat only remembers', () => {
  /**
   * **The leak test.** A sighting is a name, an owner and a position
   * (`CitySighting`) — nothing about belief — so the card prints the one half
   * the seat genuinely owns: what its *own* faith presses there.
   */
  it('says only what the seat’s own faith presses, and says it is a memory', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[2]!, 0);
    expect(text.split('\n')).toEqual([
      'Nippur · Crimson · last seen',
      // No count, because a sighting holds none. No banner, for the same
      // reason. And no rival faith at all — see below.
      'the Grain Cult — Proclamation +12 — 12 a turn',
    ]);
  });

  it('leaks no congregation, no banner and no rival faith', () => {
    const { state, theirs } = faithWorld();
    // The rival genuinely presses here — this is a filter doing work, not a
    // world in which there was nothing to leak.
    expect(
      explainPressure(state, state.cities[2]!).some((line) => line.religion === theirs.id),
    ).toBe(true);
    const reading = faithHoverReading(state, state.cities[2]!, 0)!;
    expect(reading.population).toBeNull();
    expect(reading.majority).toBeNull();
    expect(reading.unconverted).toBeNull();
    expect(reading.faiths.map((faith) => faith.religion)).not.toContain(theirs.id);
    for (const faith of reading.faiths) expect(faith.following).toBeNull();
  });

  /**
   * And no temple line. It is a percentage taken because *that town* built a
   * temple, and which way the multiplier falls turns on the banner the town
   * currently flies — both of them facts a seat who cannot see the place does
   * not have. Dropping the line rather than the ledger keeps rule 5 intact: the
   * total printed is the fold of the lines printed.
   */
  it('drops the temple’s line, which is a fact about the town', () => {
    const { state } = faithWorld();
    state.cities[2]!.buildings.push('temple');
    const reading = faithHoverReading(state, state.cities[2]!, 0)!;
    for (const faith of reading.faiths) {
      expect(faith.ledger.map((line) => line.source)).not.toContain('Temple');
    }
    // Still the fold of what it shows.
    expect(faithHoverText(state, state.cities[2]!, 0)).toContain('Proclamation +12 — 12 a turn');
  });

  it('has nothing to say when the seat has founded no faith at all', () => {
    const { state } = faithWorld();
    // Seat 2 has walked nowhere, so it may not read the town at all…
    expect(faithHoverReading(state, state.cities[2]!, 2)).toBeNull();
    // …and a seat that remembers it but keeps no faith says exactly that.
    state.visibility[2] = state.visibility[0]!.slice();
    const reading = faithHoverReading(state, state.cities[2]!, 2);
    expect(reading).toBeNull();
  });
});

describe('faithHoverReading, on ground nobody has walked', () => {
  it('is null — the readout’s own Terra Incognita rule', () => {
    const { state } = faithWorld();
    // Seat 1 has never seen Uruk: no card, not an empty one.
    expect(faithHoverReading(state, state.cities[0]!, 1)).toBeNull();
  });
});

// --- the wiring --------------------------------------------------------------

describe('the card is the faith lens’s and nothing else’s', () => {
  const main = sourceOf('main.ts');

  const card = fn('main.ts', 'updateFaithCard');

  it('is raised only while the faith lens is the one on the board', () => {
    expect(card).toContain("controls.boardLens() !== 'faith'");
  });

  /**
   * `boardLens`, never `lens()`. The menu's answer is what the player *chose*;
   * a prophet raises the lens without the menu, and a card that read the menu
   * would go dark in exactly the case this pass exists for.
   */
  it('asks the board’s lens rather than the menu’s', () => {
    expect(sourceOf('controls.ts')).toContain('boardLens: () => effectiveLens().mode');
    expect(card).not.toContain('controls.lens()');
  });

  it('is the shared hover card, non-sticky, anchored to the hex', () => {
    expect(main).toContain("createInfoCard({ className: 'info-card is-board' })");
    expect(main).not.toContain("className: 'info-card is-board', sticky");
    // Anchored through the renderer's own projection, which is the inverse of
    // picking — the city banners' mechanism, one card over.
    expect(card).toContain('renderer.projectCell?.(city.col, city.row)');
    expect(card).toContain('faithInfo.showAt(');
  });

  /**
   * The tile readout is untouched. The two **stack**: the readout is pinned to
   * its corner and the card is anchored to the hex, so a player under the faith
   * lens still reads the terrain, the yields and what is standing there.
   */
  it('does not replace the ordinary tile readout', () => {
    const context = main.slice(
      main.indexOf('function updateContext('),
      main.indexOf('function updateFaithCard('),
    );
    for (const row of ['infoTerrain', 'infoFeature', 'infoUnit', 'infoImprovement']) {
      expect(context).toContain(row);
    }
    expect(context).toContain('updateFaithCard(hover, true)');
  });

  it('rides the renderer’s frame beat, so a pan moves it with its hex', () => {
    const beat = main.slice(main.indexOf('renderer.setFrameListener?.('));
    expect(beat.slice(0, 600)).toContain('updateFaithCard(renderer.getHover(), false)');
  });
});

describe('the faith lens’s rack row', () => {
  const main = sourceOf('main.ts');

  /**
   * It looks like the other two: a name and a tick. The `tail` clause was the
   * one thing making it odd, and it is gone from the record as well as from the
   * row — an optional field with no reader is an invitation to make one row
   * strange again (user, 2026-08-28).
   */
  it('is label-only, with no tail clause on it or in the record', () => {
    expect(main).not.toContain('tail:');
    expect(main).not.toContain('lens-option-tail');
    const rack = main.slice(main.indexOf('interface LensOption'), main.indexOf('const LENS_OPTIONS'));
    expect(rack).not.toContain('tail');
  });

  it('still carries the key to its three marks, and now the gesture too', () => {
    expect(main).toContain('wash = the founder’s ink, darker is stronger; tight ring = holy site;');
    expect(main).toContain('hover a city for its pressure');
  });
});

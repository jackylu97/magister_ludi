/**
 * The unit sheet's two promises about a standing order (playtest batch two).
 *
 *   1. **A selected piece says what it has been told to do.** `unit.path` *is*
 *      the orders, and the sheet's line names where they end — a town if this
 *      seat knows there is one there, otherwise the ground — and prices the rest
 *      of the march with the movement evaluator rather than with a loop of its
 *      own. The naming is `marchDestination`, and it is asserted here because
 *      the failure is never a thrown error: it is a sentence that is merely
 *      wrong, or one that names a city nobody has seen.
 *   2. **A spent piece is still an orderable one.** The reducer stopped refusing
 *      a march at zero movement, and nothing in `src/ui/` ever refused one — but
 *      the *board* said otherwise, because a highlight of "where can this end
 *      the turn" is empty for a piece with nothing left. So the move-mode line
 *      carries the other half, and the register below is what keeps a
 *      `movesLeft <= 0` guard from being added back to the move path by
 *      somebody who reads that empty ring as a bug.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sheet itself is not
 * rendered here: what is covered is the pure naming, and — through the source,
 * exactly as `cityScreen.test.ts` and `seatRoster.test.ts` read theirs — the two
 * rules that span files.
 */

import { describe, expect, it } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, type Unit, newGame } from '../../src/sim/state';
import { recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { IMPROVEMENT_IDS, improvementDef } from '../../src/sim/improvementData';
import type { UnitTypeId } from '../../src/sim/unitData';
import { unitUpkeep } from '../../src/sim/upkeep';
import { moveModeNotice } from '../../src/ui/controls';
import {
  disbandHint,
  disbandPrompt,
  marchDestination,
  upkeepNote,
} from '../../src/ui/unitPanel';

const SOURCES = import.meta.glob(
  ['../../src/ui/controls.ts', '../../src/ui/unitPanel.ts', '../../src/main.ts'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** A two-player state on a blank grassland rectangle, as `turnBlockers` uses. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

describe('marchDestination', () => {
  it('names the ground and keeps the hex beside it', () => {
    // The coordinates stay because two meadows are identical in a sentence, and
    // the piece is somewhere specific.
    const state = flatState();
    expect(marchDestination(state, 0, { col: 4, row: 5 })).toBe('Grassland (4, 5)');
  });

  it('leads with the feature, which is what the eye sees first', () => {
    const state = flatState();
    at(state.map, 4, 5).feature = 'forest';
    expect(marchDestination(state, 0, { col: 4, row: 5 })).toBe('Forest (4, 5)');
  });

  it('says hills on bare ground, because that is what the route will cost', () => {
    const state = flatState();
    at(state.map, 6, 6).hills = true;
    expect(marchDestination(state, 0, { col: 6, row: 6 })).toBe('Grassland hills (6, 6)');
  });

  it('names a town this seat can see', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 7, 7));
    recomputeVisibility(state, 0);
    // The capital star comes through `cityDisplayName`, the one formatter a
    // city's name reaches a player through, so a march reads the same way a
    // banner does.
    expect(marchDestination(state, 0, { col: 7, row: 7 })).toBe(`${city.name} ✶`);
  });

  it('will not name a town the seat has never laid eyes on', () => {
    // "Marching to Uruk" about a city on ground nobody has explored is the unit
    // sheet leaking the map. The rule is the banners' own (`knowsCity`), which
    // is why it is borrowed rather than restated here.
    const state = flatState();
    foundCityAt(state, 1, at(state.map, 12, 3));
    recomputeVisibility(state, 0);
    expect(marchDestination(state, 0, { col: 12, row: 3 })).toBe('Grassland (12, 3)');
  });

  it('answers an order aimed off the map with the coordinates alone', () => {
    // Only reachable from a hand-edited save or a stale path — the reducer takes
    // no such order — and the coordinates are still the truth.
    const state = flatState();
    expect(marchDestination(state, 0, { col: 3, row: 99 })).toBe('(3, 99)');
  });
});

describe('the Orders line', () => {
  it('prices the rest of the march with the movement evaluator', () => {
    // `pathTurns` re-walks the stored waypoints through the very `stepCost` the
    // turn change will spend the points with. The panel kept its own copy of
    // that loop once and it was the copy that was wrong; there must not be a
    // second one here again.
    const text = source('unitPanel.ts');
    expect(text).toContain('pathTurns(getGame().state, unit, unit.path ?? [])');
    expect(text).toContain('Orders: marching to ${target}');
    // One caller of the evaluator, one place the number is composed.
    expect(text.match(/pathTurns\(/g)?.length).toBe(1);
  });

  it('names the destination through the one namer', () => {
    const text = source('unitPanel.ts');
    expect(text).toContain('marchDestination(getGame().state, unit.ownerId,');
  });

  it('answers itself with a button that reads as its answer', () => {
    // The line says "Orders"; the button says "Cancel Orders". A verb in the
    // singular beside a line in the plural reads as a control for something else.
    expect(source('unitPanel.ts')).toContain("label: 'Cancel Orders'");
  });
});

describe('an order given at zero movement', () => {
  it('gets a line of its own rather than a dead-looking board', () => {
    // The reachable ring is empty for a spent piece — honestly so; it reports
    // where the *turn* can end — so the notice carries what the ring cannot.
    expect(moveModeNotice(1)).not.toBe(moveModeNotice(0));
    expect(moveModeNotice(0)).toContain('next');
    expect(moveModeNotice(2)).toBe(moveModeNotice(1));
  });

  it('is refused nowhere on the move path', () => {
    // The register. `controls.ts` compares a unit's movement against zero
    // **nowhere** now: the one place that used to (Skip Turn) asks the sim's
    // `unitAwaitsOrders` instead, so "nothing left to wave off" and "this piece
    // needs a decision" are the same reading — and a second comparison is how a
    // spent piece becomes unorderable again without anybody deciding it should be.
    const text = source('controls.ts');
    const guards = [...text.matchAll(/unit\.movesLeft\s*<=\s*0/g)];
    expect(guards.length).toBe(0);
    expect(text).toContain('unitAwaitsOrders(');
  });

  it('leaves the committed route on the board for the piece in hand', () => {
    // A spent piece walks nothing this turn, so the route drawn under it is the
    // only thing on the board that moved. It is the selected unit's own path and
    // goes through the optional `MapView` hook, never a renderer reached into.
    expect(source('controls.ts')).toContain('renderer.setCommittedPath?.(unit?.path ?? [])');
  });
});

/**
 * A trader's sheet, after the user's ruling of 2026-08-28 ("I want to remove all
 * micromanagement of units").
 *
 * The claim is a *subtraction*: an idle trader has **one** trade verb and it
 * opens a screen, there is no send mode to toggle it into, no clause about
 * standing in a city, and the ordinary civilian verbs below are neither hidden
 * nor treated specially. Read off the source for this file's stated reason —
 * there is no jsdom here, and what distinguishes a correct sheet from a
 * nearly-correct one is which rows it pushed.
 */
describe('an idle trader’s sheet', () => {
  const panel = source('unitPanel.ts');
  const block = panel.slice(panel.indexOf('// An **idle** caravan'));
  const arm = block.slice(0, block.indexOf('if (unitDef(unit.type).foundsCity)'));

  it('is one trade verb, and it is Start route', () => {
    expect(arm).toContain("label: 'Start route'");
    // The old mode's two faces are gone: there is nothing to toggle into.
    expect(arm).not.toContain('Send Caravan');
    expect(arm).not.toContain('Choosing a Partner');
    expect(panel).not.toContain('isSendMode');
    // And exactly one row is pushed for a trader carrying no route.
    expect(arm.match(/actions\.push\(\{/g) ?? []).toHaveLength(1);
  });

  it('opens the Trade screen rather than arming the board', () => {
    expect(arm).toContain('run: onStartRoute');
    expect(arm).toContain('Choose a route in the Trade screen');
  });

  it('greys on the empire’s ledger and prints the figure beside the verb', () => {
    expect(arm).toContain('const blocker = startRouteBlocker();');
    expect(arm).toContain('note: routeSlotsLine()');
    expect(arm).toContain("blocked: blocker === undefined ? 'No unit selected' : blocker,");
  });

  it('falls through to the ordinary civilian verbs rather than returning', () => {
    // A *routed* caravan's sheet is its route and returns early; an idle one is
    // a civilian that happens to have a screen to open, so Cancel Orders and
    // Sleep are offered to it exactly as they are to a worker.
    expect(arm).not.toContain('return actions;');
  });
});

/**
 * The worker's verbs are the improvement **table**, and adding a row to the
 * table is the whole of adding a verb.
 *
 * The occasion is the lumbermill (user, 2026-08-27: "add ability to build
 * lumbermills at construction"), and the point of the test is that the
 * interface needed no pass at all for it: `improvementOptions` walks
 * `IMPROVEMENT_IDS` and gates every row on the reducer's own `improvementError`
 * / `improvementTechError`, so a new row appears the moment it is in the JSON,
 * greyed until its technology, and pressable exactly when the command would be
 * accepted. What this pins is the *genericity* — a hand-written list of ids at
 * the surface, or one id skipped, is a verb the player can never reach.
 */
describe('the worker offers every improvement the table names', () => {
  const controls = source('controls.ts');
  const options = controls.slice(controls.indexOf('function improvementOptions('));
  const body = options.slice(0, options.indexOf('\n  }\n'));

  it('walks the table rather than a list of its own', () => {
    expect(body).toContain('for (const id of IMPROVEMENT_IDS)');
    // No id is named at the surface: the two `continue`s below are the
    // reducer's refusals, never "not this one".
    for (const id of IMPROVEMENT_IDS) {
      expect(body).not.toContain(`'${id}'`);
    }
  });

  it('hides only what the ground refuses, and greys only what the tree does', () => {
    expect(body).toContain('const blocked = improvementTechError(state, unit.ownerId, id);');
    expect(body).toContain('const problem = improvementError(state, unit.id, id);');
    expect(body).toContain('if (problem !== null && problem !== blocked) continue;');
  });

  it('has the lumbermill in it, on the terrain and the technology the ruling named', () => {
    // The row itself is the sim batch's; this is the interface's half of the
    // claim — that the row is all there was to it.
    expect(IMPROVEMENT_IDS).toContain('lumbermill');
    const def = improvementDef('lumbermill');
    expect(def.requiresTech).toBe('engineering');
    expect(def.yields.production).toBe(1);
    expect(def.validFeatures).toEqual(['forest', 'jungle']);
  });
});

/**
 * A greyed row's refusal, on a hover card rather than a printed line or a
 * native `title` (playtest, 2026-08-28: "I have my first prophet and I can't
 * create a religion with it" first put the sentence on the sheet; a second
 * ruling the same day moved it off the sheet and off the native tooltip
 * entirely — "a refusal should appear only on hover, and in a custom hover
 * card"). It applies to every verb on the sheet at once — the prophet's four
 * rows and the augur's rites included — through the one fallback,
 * `refusalCard`, that a row without a richer card of its own raises.
 */
describe('a greyed row’s refusal', () => {
  const panel = source('unitPanel.ts');
  const body = panel.slice(
    panel.indexOf('function renderActions('),
    panel.indexOf('function render(): void {'),
  );

  it('raises a card rather than a printed line, and carries no title', () => {
    expect(body).toContain(
      'info.bind(button, action.card ?? (() => refusalCard(action.blocked!)));',
    );
    expect(body).not.toContain('unit-action-blocked');
    // The one `title` assignment left lives in the *live* branch only.
    expect(body).toContain('button.title = action.title ?? action.hint;');
  });

  it('is gated on the same field that disables the button', () => {
    expect(body).toContain('button.disabled = action.blocked !== null;');
    expect(body).toContain('if (action.blocked !== null) {');
  });

  it("falls back to the sim's own sentence, in the card's usual voice", () => {
    const card = panel.slice(
      panel.indexOf('function refusalCard('),
      panel.indexOf('function renderActions('),
    );
    expect(card).toContain("element('h4', 'unit-card-title', 'Why not')");
    expect(card).toContain("element('p', 'unit-card-blocked', text)");
  });

  it("a row rich enough for its own card — a rite — folds the refusal into it, not a second card", () => {
    expect(panel).toContain('if (rite.blocked !== null) card.append');
    // `renderActions` prefers `action.card` over the fallback exactly when one
    // exists, so a rite's card is never wrapped in `refusalCard` too.
    expect(body).toContain('action.card ??');
  });
});

/**
 * The augur's Recasting the Omens row (user, 2026-08-29: "could we give augurs
 * the ability to reroll a pantheon belief… it should give the option to choose
 * which belief to reroll").
 *
 * The row itself needs no code of its own — `riteOptions` walks the whole rite
 * table and the sheet prints what comes back — which is exactly the property
 * worth pinning: what a player reads on that row is the *simulation's* sentence
 * for it (`ritePreview`, and for a redraw that is the data row's own plain
 * prose), never a wording composed in the panel. The other half is the belief
 * the command names, which the sheet cannot supply and must be asked for.
 */
describe('the rite row that gives a belief back', () => {
  const panel = source('unitPanel.ts');
  const controls = source('controls.ts');

  it('is printed off the table like every other rite, with the sim’s own hint', () => {
    // The loop that draws them is the whole implementation of "a new rite is a
    // JSON row": nothing here names one.
    expect(panel).toContain('for (const rite of riteOptions())');
    expect(panel).toContain('`Spend a rite: ${rite.name.toLowerCase()}`');
    expect(panel).toContain('(rite.preview ? ` · ${rite.preview}` : \'\')');
    expect(panel).not.toContain('recastingTheOmens');
    // And the preview is asked of the simulation, per rite.
    expect(controls).toContain('preview: ritePreview(state, unit.id, id)');
  });

  it('carries the god back to the command, and writes nothing when there is none', () => {
    // A rite that gives nothing back logs exactly the command it always did —
    // `undefined` is never written into a command, so an old log replays.
    expect(controls).toContain('function performRite(id: RiteId, belief?: BeliefId): void');
    expect(controls).toContain('...(belief === undefined ? {} : { belief })');
  });

  it('answers the sheet with the seat’s own pantheon, and only for a redraw rite', () => {
    // `recastChoices` is what the picker is built from: empty for every rite
    // that redraws nothing, so the branch costs the other six nothing.
    expect(controls).toContain('function recastChoices(rite: RiteId): BeliefId[]');
    expect(controls).toContain('if (riteDef(rite).redraws === undefined) return [];');
    expect(controls).toContain('[...player.pantheon.beliefs]');
  });
});

/**
 * The Disband row (user, 2026-08-29: "we need a way to delete units too …and an
 * indicator of the current upkeep on the unit").
 *
 * Three promises, and each fails silently rather than loudly:
 *
 *   1. **It is last.** The one verb here that cannot be undone sits below
 *      everything a player came to this sheet to do, so nothing they reach for
 *      by reflex is on the way to it.
 *   2. **The hint quotes the upkeep**, in `unitUpkeepOf`'s figure — the piece's,
 *      never the type's, so a granted or captured unit does not promise a saving
 *      the treasury will never see.
 *   3. **It is greyed with `disbandError`'s own sentence**, through the same
 *      blocker/hover-card mechanism every other row uses — so an offered button
 *      is a command the reducer takes.
 */
describe('the Disband row', () => {
  const panel = source('unitPanel.ts');
  const actions = panel.slice(
    panel.indexOf('function actionsFor('),
    panel.indexOf('function riteCard('),
  );

  it('is the last row pushed, after every other verb', () => {
    const disband = actions.indexOf("label: 'Disband'");
    expect(disband).toBeGreaterThan(0);
    // Nothing else is pushed after it — the next thing in the function is the
    // return.
    expect(actions.slice(disband)).not.toContain('actions.push(');
    expect(actions.slice(disband)).toContain('return actions;');
  });

  it('is greyed with the gate’s own sentence, like every other verb', () => {
    expect(actions).toContain('const blocker = disbandBlocker();');
    expect(actions).toContain("blocked: blocker === undefined ? 'No unit selected' : blocker,");
    // And the gate is the reducer's, reached through `controls`, never a rule
    // this file writes.
    expect(source('controls.ts')).toContain('return disbandError(getGame().state, localPlayerId, unit.id);');
  });

  it('quotes the upkeep in its hint', () => {
    expect(actions).toContain('hint: disbandHint(unit),');
  });

  it('has no hot-key — a destructive verb is reached through a card', () => {
    const row = actions.slice(actions.indexOf("label: 'Disband'"));
    expect(row.slice(0, row.indexOf('});'))).not.toContain('key:');
  });
});

describe('the upkeep the sheet and the row agree on', () => {
  /** A bare unit of a type, as `upkeepPanels.test.ts` builds one. */
  function piece(type: UnitTypeId): Unit {
    return { id: 1, ownerId: 0, type, col: 0, row: 0, hp: 100, movesLeft: 2 } as Unit;
  }

  it('names the saving on a piece that costs something', () => {
    const warrior = piece('warrior');
    expect(disbandHint(warrior)).toBe(`Let this unit go · saves ${unitUpkeep('warrior')} gold a turn`);
    expect(disbandPrompt(warrior)).toEqual({
      title: 'Disband the Warrior?',
      body: `It leaves the board for good. It costs ${unitUpkeep('warrior')} gold a turn to keep.`,
    });
  });

  it('says so plainly when there is nothing to save', () => {
    const settler = piece('settler');
    expect(disbandHint(settler)).toBe('Let this unit go · it costs nothing to keep');
    expect(disbandPrompt(settler).body).toBe(
      'It leaves the board for good. It costs nothing to keep.',
    );
  });

  it('asks the *piece*, not the type — a granted warrior saves nothing', () => {
    const granted = piece('warrior');
    granted.freeUpkeep = true;
    expect(disbandHint(granted)).toBe('Let this unit go · it costs nothing to keep');
    expect(disbandPrompt(granted).body).toContain('nothing to keep');
    // The sheet's own note already said so; the row must not disagree with it.
    expect(upkeepNote(granted)).toBe('Free — granted');
  });

  it('is the card main.ts actually raises, with the sheet’s own words', () => {
    const main = source('main.ts');
    expect(main).toContain('disbandPrompt(unit)');
    expect(main).toContain("confirmLabel: 'Disband', cancelLabel: 'Keep'");
    expect(main).toContain('controls.disbandUnit();');
  });
});

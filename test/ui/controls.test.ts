/**
 * The number-key lens hotkeys' pure half: which lens a digit selects.
 *
 * `lensForDigit` was written to take the menu's own order and the manual lens
 * as plain arguments precisely so this could be pinned without a keyboard or a
 * `window` (no jsdom in this suite, as with every other UI pass) — the actual
 * `keydown` wiring in `createGameControls` is one line that calls this and
 * `setLens`, and is covered by inspection the way the rest of that file's DOM
 * glue is.
 *
 * Three claims:
 *
 *   1. **`0` always clears**, independent of `order` — even an `order` whose
 *      first entry is not `'none'`.
 *   2. **`1..9` count the lenses**, not the menu's rows: the `'none'` row is
 *      struck out wherever it sits and the digits run down what is left — so a
 *      lens appended to the menu's list gets a working hotkey with nothing here
 *      to update, and a digit past the end of a short list names nothing. This
 *      is the off-by-one that shipped: `LENS_OPTIONS` opens with the "None" row,
 *      so a positional reading made `1` mean *off* — `0`'s job, and one lens
 *      short of a digit at the far end.
 *   3. **The active lens toggles off; a different one switches** — read off
 *      `current`, which the caller must pass as the *manual* lens, never
 *      `effectiveLens`'s answer.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type PillageReport, chopBaseFor } from '../../src/sim/improvements';
import { createMap } from '../../src/sim/map';
import { type GameState, newGame, playerById } from '../../src/sim/state';
import { statecraftBlocker } from '../../src/sim/statecraft';
import { ORDER_IDS, type OrderId } from '../../src/sim/statecraftData';
import { resetVisibility } from '../../src/sim/visibility';
import { at } from '../sim/improvementHelpers';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { type LensMode } from '../../src/ui/mapView';
import { type StarvationReport } from '../../src/sim/cities';
import {
  cityPhaseLine,
  lensForDigit,
  lensShowsYields,
  pillageSentence,
  pillageVictimSentence,
  pillagedThing,
  starvationSentence,
  statecraftPause,
  statecraftPauseNotice,
  wantsNativeContextMenu,
} from '../../src/ui/controls';

// The rack's own order (`LENS_OPTIONS` in `main.ts`), which is the one source
// the digit hotkeys read. Faith is appended rather than inserted, which is all a
// new lens costs: the mapping is a *position*, never a table.
const ORDER: readonly LensMode[] = ['none', 'settler', 'explorer', 'faith'];

describe('lensForDigit', () => {
  it('always clears on 0, whatever lens is active', () => {
    expect(lensForDigit(0, ORDER, 'none')).toBe('none');
    expect(lensForDigit(0, ORDER, 'settler')).toBe('none');
    expect(lensForDigit(0, ORDER, 'explorer')).toBe('none');
  });

  it('numbers the lenses, one-indexed, with the None row struck out', () => {
    expect(lensForDigit(1, ORDER, 'none')).toBe('settler');
    expect(lensForDigit(2, ORDER, 'none')).toBe('explorer');
    // Three is the faith lens, and it is the only one no piece raises — a
    // settler and a scout bring their own up by being picked up, and this is one
    // the player goes and asks for.
    expect(lensForDigit(3, ORDER, 'none')).toBe('faith');
  });

  it('never lets a digit mean "off" — that is 0 and only 0', () => {
    // The bug: `LENS_OPTIONS` opens with the None row, so a positional reading
    // gave `1` away to it. No digit in range may resolve to 'none' from a lens
    // that is not itself already up.
    for (let digit = 1; digit <= 9; digit++) {
      expect(lensForDigit(digit, ORDER, 'none')).not.toBe('none');
    }
  });

  it('strikes the None row out wherever the menu happens to put it', () => {
    // The rule is about the *entry*, not about position 0 — a menu that listed
    // "None" last would number its lenses exactly the same way.
    const trailing: readonly LensMode[] = ['settler', 'explorer', 'none'];
    expect(lensForDigit(1, trailing, 'none')).toBe('settler');
    expect(lensForDigit(2, trailing, 'none')).toBe('explorer');
    expect(lensForDigit(3, trailing, 'none')).toBeNull();
  });

  it('names nothing past the end of the list', () => {
    expect(lensForDigit(4, ORDER, 'none')).toBeNull();
    expect(lensForDigit(9, ORDER, 'none')).toBeNull();
  });

  it('rejects anything that is not a single decimal digit', () => {
    expect(lensForDigit(-1, ORDER, 'none')).toBeNull();
    expect(lensForDigit(10, ORDER, 'none')).toBeNull();
    expect(lensForDigit(1.5, ORDER, 'none')).toBeNull();
  });

  it('toggles the active manual lens off (Civ-style)', () => {
    // Pressing 1 while the settler lens (the first lens) is already up clears it.
    expect(lensForDigit(1, ORDER, 'settler')).toBe('none');
    expect(lensForDigit(2, ORDER, 'explorer')).toBe('none');
    // And 0, itself always 'none', "toggles off" the none lens into itself.
    expect(lensForDigit(0, ORDER, 'none')).toBe('none');
  });

  it('switches straight to a different lens without needing a second press', () => {
    expect(lensForDigit(2, ORDER, 'settler')).toBe('explorer');
    expect(lensForDigit(1, ORDER, 'explorer')).toBe('settler');
  });

  it('follows a grown order with no change to the mapping itself', () => {
    // A hypothetical further lens appended to the menu's list — the whole point
    // of reading `order` rather than a hardcoded table, and the mechanism the
    // faith lens actually arrived by.
    const grown: readonly LensMode[] = [...ORDER, 'settler'];
    expect(lensForDigit(4, grown, 'none')).toBe('settler');
  });
});

/**
 * `effectiveLens`'s glyph rule, pulled out pure: the settler lens forces the
 * yield glyphs on regardless of the player's own switch, the same way an open
 * city panel already does — a settler player judging a site without yields
 * under the wash is the report that sent this in (`lensShowsYields`'s own
 * docblock has the reasoning). Neither the player's switch nor `effectiveLens`
 * itself is touched by this: dropping the settler or closing the panel must
 * restore exactly what the player had chosen, so the mode/city inputs here
 * stand in for "is a settler or a panel making the ask right now", never for a
 * write to `yieldsOn`.
 */
describe('lensShowsYields', () => {
  it('follows the switch when nothing else is asking', () => {
    expect(lensShowsYields('none', false, false)).toBe(false);
    expect(lensShowsYields('none', true, false)).toBe(true);
    expect(lensShowsYields('explorer', false, false)).toBe(false);
  });

  it('forces the glyphs on for the settler lens, switch off', () => {
    expect(lensShowsYields('settler', false, false)).toBe(true);
  });

  it('does not force the glyphs on for the explorer lens', () => {
    expect(lensShowsYields('explorer', false, false)).toBe(false);
  });

  it('an open city panel still forces the glyphs on, settler or not', () => {
    expect(lensShowsYields('none', false, true)).toBe(true);
    expect(lensShowsYields('settler', false, true)).toBe(true);
  });

  it('the switch alone is enough under any mode', () => {
    expect(lensShowsYields('settler', true, false)).toBe(true);
    expect(lensShowsYields('explorer', true, false)).toBe(true);
  });
});

/**
 * The right button belongs to the game, and `wantsNativeContextMenu` is the one
 * exemption from that.
 *
 * The bug this replaced was a `contextmenu` listener on the **viewport**: right
 * click pans with the pointer captured, but `contextmenu` is hit-tested like any
 * mouse event, so a pan that came to rest over a banner, a price tag, a toast or
 * the unit sheet handed the player the browser's Back/Forward menu. The fix is a
 * document-level suppression in `main.ts` gated on `landingEl.hidden`; what is
 * pinned here is the *predicate*, because a rule about which surfaces keep the
 * native menu is the half that can quietly grow wrong.
 *
 * The claim is narrow on purpose: **text a player might paste keeps its menu,
 * and nothing else does.** A checkbox is a control, a button is a control, and
 * the board is emphatically not text.
 */
describe('wantsNativeContextMenu', () => {
  it('keeps the native menu for the text fields a player types into', () => {
    expect(wantsNativeContextMenu({ tagName: 'TEXTAREA' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'search' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'number' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'password' })).toBe(true);
  });

  it('reads a bare <input> as text, the way the platform does', () => {
    expect(wantsNativeContextMenu({ tagName: 'INPUT' })).toBe(true);
  });

  it('is case-insensitive about both the tag and the type', () => {
    expect(wantsNativeContextMenu({ tagName: 'input', type: 'TEXT' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'textarea' })).toBe(true);
  });

  it('takes the menu away from every control that holds no text', () => {
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'button' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'SELECT' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'BUTTON' })).toBe(false);
  });

  it('keeps it inside an editable region, which the DOM inherits for us', () => {
    expect(wantsNativeContextMenu({ tagName: 'SPAN', isContentEditable: true })).toBe(true);
  });

  it('takes it away from every surface the board is made of', () => {
    // The five that leaked: the canvas itself and the four DOM layers over it.
    expect(wantsNativeContextMenu({ tagName: 'CANVAS' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'DIV' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'SPAN' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'P' })).toBe(false);
    expect(wantsNativeContextMenu(null)).toBe(false);
  });
});

/**
 * Every pillage the sim now reports (`CommandResult.pillages`), the pair of
 * sentences it is announced in: the raider's own line — the actual salvage
 * and heal a raid paid, never the rules constant — and the victim's toast,
 * read off `endTurn`'s resolution where the wild raids. Both are pure
 * functions of a `PillageReport` (plus, for the victim's line, the board they
 * are read against for a name), which is what lets them be pinned with no
 * jsdom in this suite (module docblock).
 */

/** A minimal report, overridable per test — a farm alone, nothing paid. */
function baseReport(overrides: Partial<PillageReport> = {}): PillageReport {
  return {
    ownerId: 0,
    fromOwnerId: 1,
    col: 6,
    row: 5,
    improvement: 'farm',
    road: false,
    gold: 0,
    heal: 0,
    warning: null,
    ...overrides,
  };
}

/** Two named seats plus a seated barbarian, on a blank grassland rectangle. */
function raidState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Beru', color: '#00a', isHuman: true },
    ],
    barbarians: true,
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  return state;
}

describe('pillagedThing', () => {
  it('names the improvement alone', () => {
    expect(pillagedThing(baseReport())).toBe('Farm');
  });

  it('names a bare road when there was no improvement', () => {
    expect(pillagedThing(baseReport({ improvement: undefined, road: true }))).toBe('Road');
  });

  it('names both when a road went with the improvement', () => {
    expect(pillagedThing(baseReport({ road: true }))).toBe('Farm and road');
  });
});

describe('pillageSentence', () => {
  it('prints the subject, the salvage and the heal together', () => {
    expect(pillageSentence(baseReport({ gold: 35, heal: 25 }))).toBe(
      '✶ Farm pillaged · +35💰 · healed 25',
    );
  });

  it('omits the gold clause when nothing was banked', () => {
    expect(pillageSentence(baseReport({ gold: 0, heal: 25 }))).toBe('✶ Farm pillaged · healed 25');
  });

  it('omits the heal clause when the unit took no heal', () => {
    expect(pillageSentence(baseReport({ gold: 35, heal: 0 }))).toBe('✶ Farm pillaged · +35💰');
  });

  it('is the bare subject when the raid paid nothing at all — the wild forfeits the gold', () => {
    expect(pillageSentence(baseReport({ gold: 0, heal: 0 }))).toBe('✶ Farm pillaged');
  });

  it('names a bare road when there was no improvement', () => {
    expect(pillageSentence(baseReport({ improvement: undefined, road: true, gold: 12 }))).toBe(
      '✶ Road pillaged · +12💰',
    );
  });
});

describe('pillageVictimSentence', () => {
  it('names the wild raider and the nearest owned city', () => {
    const state = raidState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const barbarianId = state.players.length - 1;
    const report = baseReport({ ownerId: barbarianId, fromOwnerId: 0 });
    expect(pillageVictimSentence(state, report)).toBe(
      `Barbarians pillaged the Farm at (6, 5) near ${cityDisplayName(state, city)}`,
    );
  });

  it("names another empire's seat instead of the wild", () => {
    const state = raidState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const report = baseReport({ ownerId: 1, fromOwnerId: 0 });
    expect(pillageVictimSentence(state, report)).toBe(
      `Beru pillaged the Farm at (6, 5) near ${cityDisplayName(state, city)}`,
    );
  });

  it('falls back to the bare hex when the victim holds no city at all', () => {
    const state = raidState();
    const barbarianId = state.players.length - 1;
    const report = baseReport({ ownerId: barbarianId, fromOwnerId: 0 });
    expect(pillageVictimSentence(state, report)).toBe('Barbarians pillaged the Farm at (6, 5)');
  });

  it('includes the road when one was torn out alongside the improvement', () => {
    const state = raidState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const barbarianId = state.players.length - 1;
    const report = baseReport({ ownerId: barbarianId, fromOwnerId: 0, road: true });
    expect(pillageVictimSentence(state, report)).toBe(
      `Barbarians pillaged the Farm and road at (6, 5) near ${cityDisplayName(state, city)}`,
    );
  });
});

/**
 * The user's ruling of 2026-08-29 and its same-day addendum: `starvationSentence`
 * is `disbandSentence`'s pure shape, so this suite is `pillageVictimSentence`'s
 * neighbour rather than `disbandSentence`'s (`upkeepPanels.test.ts`, off-fence).
 */
describe('starvationSentence', () => {
  function report(over: Partial<StarvationReport> = {}): StarvationReport {
    return {
      cityId: 0,
      ownerId: 0,
      lost: 4,
      shrank: false,
      population: 3,
      ejected: [],
      ...over,
    };
  }

  it('names the city and stops there when it merely lost food', () => {
    expect(starvationSentence(report(), 'Uruk')).toBe('Uruk is starving!');
  });

  it('adds the new size when the deficit shrank the city', () => {
    expect(starvationSentence(report({ shrank: true, population: 2 }), 'Uruk')).toBe(
      'Uruk is starving! It has shrunk to size 2.',
    );
  });

  it('names what was set aside when the shrink also ejected a queue row', () => {
    expect(
      starvationSentence(
        report({ shrank: true, population: 1, ejected: ['Settler'] }),
        'Uruk',
      ),
    ).toBe('Uruk is starving! It has shrunk to size 1 and its Settler is set aside.');
  });
});

/**
 * The wiring these two sentences are read from — `pillage()`'s own line and
 * `reportPillages`' place in the commit funnel beside `reportSieges` — read
 * straight off the source, `seatRoster.test.ts`'s and `cityCombat.test.ts`'s
 * technique for a closure this suite has no jsdom to drive (module docblock).
 */
describe('pillage news in the commit funnel', () => {
  const SOURCE = (
    import.meta.glob('../../src/ui/controls.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>
  )['../../src/ui/controls.ts'];

  it('the raider announces its own pillage off the reducer\'s report, never the rules constant', () => {
    expect(SOURCE).toMatch(
      /announce\(pillageSentence\(report\), \{ cell: \{ col: unit\.col, row: unit\.row \} \}\);/,
    );
    expect(SOURCE).not.toMatch(/RULES\.improvements\.pillageGold/);
  });

  it("toasts the victim off endTurn's resolution, filtered to this seat as the ground", () => {
    expect(SOURCE).toMatch(/function reportPillages\(/);
    expect(SOURCE).toMatch(/reportPillages\(result\);/);
    expect(SOURCE).toMatch(/report\.fromOwnerId !== localPlayerId/);
    expect(SOURCE).toMatch(/pillageVictimSentence\(state, report\)/);
  });
});

/**
 * The three siege-beat sentences the combat forecast card prints
 * (`main.ts`'s `showCombatForecast`), off a fixture shaped like the field the
 * card actually reads — `CombatForecast.cityPhase` — rather than a whole
 * `previewCombat` result, since the phase alone is all the sentence is a
 * function of (ruling, 2026-08-28).
 */
describe('cityPhaseLine', () => {
  it('says the three siege beats in the user’s own wording', () => {
    const fixtures: { cityPhase: 'walls' | 'garrison' | 'capture'; line: string }[] = [
      { cityPhase: 'walls', line: 'Beats the walls down — the garrison holds' },
      { cityPhase: 'garrison', line: 'The walls are down — attacking the garrison' },
      { cityPhase: 'capture', line: 'Captures the city' },
    ];
    for (const fixture of fixtures) {
      expect(cityPhaseLine(fixture.cityPhase)).toBe(fixture.line);
    }
  });

  it('is null for a fight on open ground, where the field is undefined', () => {
    expect(cityPhaseLine(undefined)).toBeNull();
  });
});

/**
 * The chop preview's figure is `chopBaseFor`'s, never the raw table lookup
 * (ruling, 2026-08-28: the chop now scales with the chopping empire's
 * technologies). `controls.ts`'s `chopPreview` and `improvements.ts`'s
 * `chopFeatureAt` — the actual payout — must read the same function or a
 * preview and a completed chop can quote different numbers; this pins the
 * wiring (no jsdom to build a `GameControls` and press the button with) and,
 * beside it, the arithmetic itself off the same fixture shape
 * `improvements.test.ts` uses, so this file's claim that they *agree* is
 * more than a name match.
 */
describe('chopPreview reads chopBaseFor, not the unscaled table figure', () => {
  const SOURCE = (
    import.meta.glob('../../src/ui/controls.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>
  )['../../src/ui/controls.ts'];
  const body = SOURCE.slice(
    SOURCE.indexOf('function chopPreview('),
    SOURCE.indexOf('function chopTechName('),
  );

  it('computes production and label off chopBaseFor(state, unit.ownerId, tile.feature)', () => {
    expect(body).toContain(
      'const base = chopBaseFor(state, unit.ownerId, tile.feature);',
    );
    expect(body).toContain('const production = base.production;');
    expect(body).toContain('label: base.label,');
    // The unscaled lookup is gone from this function entirely — a stray
    // `chopYield(...)` call here would be the old bug creeping back.
    expect(body).not.toContain('chopYield(');
  });

  it("the figure it would show is exactly chopBaseFor's, at a tech count that actually scales it", () => {
    const state = raidState();
    const forestTechs = ['mining', 'bronzeWorking', 'ironWorking', 'construction'] as const;
    state.players[0]!.techsResearched = [...forestTechs];
    const base = chopBaseFor(state, 0, 'forest');
    // What `chopPreview` would return for this player and this feature is, by
    // construction (the source pin above), exactly this call — so pinning the
    // scaled figure here pins the preview's figure too.
    expect(base.production).toBeGreaterThan(0);
    expect(base.label).toContain('Forest');
    expect(base.label).toContain(`${forestTechs.length} technologies`);
  });
});

/**
 * End Turn's **soft** gate (user ruling, 2026-08-29: "'end turn' should pause
 * play when a new order or government has been drafted").
 *
 * The sim rule is untouched and that is the load-bearing part: a banked charter
 * still does not block (`statecraftBlocker`, Entry XV — adoption is bankable),
 * and this is the interface saying the sentence once before letting the turn go.
 * So what is asserted here is the predicate's three answers and the fact that
 * `endTurn` consults it *before* it commits to ending the turn.
 */
describe('the Statecraft pause', () => {
  function seatState(): GameState {
    const state = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#a00', isHuman: true },
        { name: 'Cobalt', color: '#00a', isHuman: true },
      ],
    });
    state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
    resetVisibility(state);
    return state;
  }

  /** The first Order in the pool, so nothing here names a card by hand. */
  function anyOrder(): OrderId {
    return ORDER_IDS[0]!;
  }

  it('says nothing when there is nothing waiting', () => {
    expect(statecraftPause(seatState(), 0)).toBeNull();
  });

  it('pauses on a banked charter, which the simulation deliberately never blocks', () => {
    const state = seatState();
    const player = playerById(state, 0)!;
    player.statecraft.pendingGovernment = { tier: 1, options: [] };
    // The whole point: the sim lets this seat end its turn, and the interface
    // still mentions it once.
    expect(statecraftBlocker(player)).toBeNull();
    expect(statecraftPause(state, 0)).toBe('government');
  });

  it('pauses on an Order held outside a slot it fits', () => {
    const state = seatState();
    const sc = playerById(state, 0)!.statecraft;
    sc.orders.push({ id: anyOrder(), level: 1 });
    expect(statecraftPause(state, 0)).toBe('order');
  });

  it('says nothing once every slot the card fits is taken', () => {
    const state = seatState();
    const sc = playerById(state, 0)!.statecraft;
    sc.orders.push({ id: anyOrder(), level: 1 });
    // Filled with *other* cards, so the held one is genuinely unslottable rather
    // than already slotted — `slotOrderError` distinguishes the two and so must
    // this. Every slot, because a wildcard takes anything.
    for (let index = 0; index < sc.slots.length; index++) {
      sc.slots[index] = { card: ORDER_IDS[index + 1]!, sealedUntil: 0 };
      sc.orders.push({ id: ORDER_IDS[index + 1]!, level: 1 });
    }
    expect(statecraftPause(state, 0)).toBeNull();
  });

  it('lets the charter win when both are waiting', () => {
    const state = seatState();
    const sc = playerById(state, 0)!.statecraft;
    sc.orders.push({ id: anyOrder(), level: 1 });
    sc.pendingGovernment = { tier: 1, options: [] };
    // Adoption rebuilds the slot spread wholesale, so an Order slotted first is
    // slotted into a layout that is about to stop existing.
    expect(statecraftPause(state, 0)).toBe('government');
  });

  it('names the thing and both ways out of it', () => {
    for (const kind of ['government', 'order'] as const) {
      const line = statecraftPauseNotice(kind);
      expect(line.startsWith('☞ ')).toBe(true);
      expect(line).toContain('press C');
      expect(line).toContain('End Turn again');
    }
    expect(statecraftPauseNotice('government')).toContain('government');
    expect(statecraftPauseNotice('order')).toContain('Order');
  });

  /**
   * The interface's own text, read the way the sim's register tests read theirs
   * (`test/sim/cities.test.ts`) — a claim about *where* a call sits cannot be
   * made behaviourally without a DOM, and this suite has none.
   */
  const UI_SOURCE = import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('is consulted by endTurn before it commits to ending the turn', () => {
    const text = Object.entries(UI_SOURCE).find(([path]) => path.endsWith('/controls.ts'))?.[1];
    expect(typeof text).toBe('string');
    const start = text!.indexOf('function endTurn(force = false)');
    expect(start).toBeGreaterThan(-1);
    // Everything from the declaration to the point of no return. A pause asked
    // *after* `cancelHandOver` would be a pause that had already dropped the
    // hand-over of a turn it then refused to end.
    const head = text!.slice(start, text!.indexOf('cancelHandOver();', start));
    expect(head).toContain('statecraftPause(');
    expect(head).toContain('statecraftPauseNotice(');
    // And it is skipped by the same Shift override the hard blockers are.
    expect(head).toContain('if (!force)');
  });
});

/**
 * A pointer move is not a state change (2026-08-29).
 *
 * `refreshHover` used to end in `onUpdate`, which is `main.ts`'s `updatePanel`
 * — the whole right-hand screen, the seat strip, the top bar's totals, the
 * research card and every open panel, torn down and rebuilt. With a city screen
 * up that ran on every `pointermove` over the board, so merely *looking around*
 * rebuilt a few hundred nodes a frame. The fix is a second, narrow hook:
 * `onHover`, which may refresh only what the pointer is over.
 *
 * The claim is about *where a call sits* and this suite has no DOM, so it is
 * read off the source the way the sim's register tests read theirs.
 */
describe('a hover refreshes the readout, never the panels', () => {
  const UI_SOURCES = import.meta.glob('../../src/{ui/*.ts,main.ts}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  function source(name: string): string {
    const key = Object.keys(UI_SOURCES).find((path) => path.endsWith(name));
    const text = key === undefined ? undefined : UI_SOURCES[key];
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error(`${name} came back empty`);
    }
    return text;
  }

  /** The text between two landmarks, with both of them checked for existence. */
  function between(text: string, from: string, to: string): string {
    const start = text.indexOf(from);
    expect(start, from).toBeGreaterThan(-1);
    const end = text.indexOf(to, start + from.length);
    expect(end, to).toBeGreaterThan(-1);
    return text.slice(start, end);
  }

  it('offers `onHover` beside `onUpdate` on the options', () => {
    const text = source('controls.ts');
    const options = between(text, 'export interface GameControlsOptions', 'export function createGameControls');
    expect(options).toContain('onHover?: () => void;');
    // Destructured with the rest, so a listener that is not passed is simply
    // absent rather than a crash on the first mouse move.
    expect(text).toMatch(/const \{[\s\S]*?\n {4}onHover,[\s\S]*?\n {2}\} = options;/);
  });

  it('ends `refreshHover` on `onHover` and never on `onUpdate`', () => {
    const text = source('controls.ts');
    const body = between(text, 'function refreshHover(): void {', '// --- wiring');
    expect(body).toContain('onHover?.();');
    expect(body).not.toContain('onUpdate');
  });

  it('never reaches `onUpdate` from the viewport pointer handlers', () => {
    const text = source('controls.ts');
    const move = between(text, "viewport.addEventListener('pointermove'", '/**\n   * Ends a press.');
    expect(move).toContain('refreshHover();');
    expect(move).not.toContain('onUpdate');

    // Leaving the board is still only a fact about where the pointer is: the
    // hover is set to `null` and the same narrow hook takes the readout down.
    const leave = between(text, "viewport.addEventListener('pointerleave'", "viewport.addEventListener(");
    expect(leave).toContain('renderer.setHover(null);');
    expect(leave).toContain('onHover?.();');
    expect(leave).not.toContain('onUpdate');
  });

  it('wires the hook to the tile readout alone, and leaves `onUpdate` the panels', () => {
    const text = source('main.ts');
    const wiring = between(text, 'const controls = createGameControls({', 'onNotice: showNotice,');
    expect(wiring).toContain('onUpdate: updatePanel,');
    // `updateContext` is the tile readout (and, on its last line, the faith
    // hover card); the previews that follow the pointer are pushed straight at
    // the renderer by `controls` itself, so this is the whole of the listener.
    expect(wiring).toContain('onHover: () => updateContext(renderer.getHover()),');
    expect(wiring).not.toContain('onHover: updatePanel');
  });

  /**
   * The reason the split is worth a test rather than a comment: `updatePanel`
   * rebuilds the two big screens, and neither can have changed because a cursor
   * crossed a hex.
   */
  it('keeps the city and unit sheets inside `updatePanel`, where a hover can no longer reach them', () => {
    const text = source('main.ts');
    const body = between(text, 'function updatePanel(_selected: Unit | null, hover: HoverInfo | null): void {', '// --- lifecycle');
    expect(body).toContain('cityPanel.render();');
    expect(body).toContain('unitPanel.render();');
    expect(body).toContain('updateContext(hover);');
  });
});

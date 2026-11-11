/**
 * The worker's improvement rows (batch W1, `docs/flags.md` item (lllllll)).
 *
 * The user, 2026-11-11: *"workers action menu should not show improvements
 * that haven't been unlocked (i.e. charter improvements). also, please have
 * the tooltip show the proper yields, i think the preview yields for an
 * improvement dont factor religious beliefs or orders"*.
 *
 * No jsdom in this suite, so the sheet is not mounted. What is asked instead is
 * the pure function the sheet's rows come from (`improvementOptionsFor`,
 * `controls.ts`) and the two text composers the rows and their hover card are
 * built from (`improvementHint`, `improvementChangeWords`, `unitPanel.ts`; and
 * `yieldDeltaFigures`, `figures.ts`), over real boards.
 */

import { describe, expect, it } from 'vitest';
import { foundCityAt, refreshCityDerived, tileOwnerPlayerId } from '../../src/sim/cities';
import { type Tile, tileNeighbors } from '../../src/sim/map';
import { foundReligion } from '../../src/sim/religion';
import { type City, type GameState, type Unit, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { emptyTileYield } from '../../src/sim/terrainData';
import { improvementOptionsFor } from '../../src/ui/controls';
import { YIELD_GLYPH, yieldDeltaFigures } from '../../src/ui/figures';
import { improvementChangeWords, improvementHint } from '../../src/ui/unitPanel';
import { at, bareState } from '../sim/improvementHelpers';

/** A town for seat 0 at (5, 5), and a hex beside it inside its borders. */
function townAndHex(): { state: GameState; city: City; hex: Tile } {
  const state = bareState();
  const city = foundCityAt(state, 0, at(state, 5, 5));
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  const hex = tileNeighbors(state.map, at(state, 5, 5)).find(
    (tile) => tileOwnerPlayerId(state, tile.col, tile.row) === 0,
  )!;
  return { state, city, hex };
}

/** A worker of seat 0 on this hex. */
function workerOn(state: GameState, hex: Tile): Unit {
  const worker = createUnit(state, 0, 'worker', hex.col, hex.row);
  bumpRevision(state);
  return worker;
}

/** The ids the sheet lists for this worker. */
function listed(state: GameState, worker: Unit): string[] {
  return improvementOptionsFor(state, worker).map((option) => option.id);
}

/** Adds or takes away a technology for seat 0. */
function know(state: GameState, tech: string, known: boolean): void {
  const player = playerById(state, 0)!;
  player.techsResearched = player.techsResearched.filter((id) => id !== tech);
  if (known) player.techsResearched.push(tech as never);
  bumpRevision(state);
}

describe('the worker lists only what the empire has unlocked', () => {
  it('hides a charter improvement until its technology is known: the Qanat', () => {
    // `bareState` holds every technology whose gift is a thing, and none whose
    // gift is a rule, so Surveying (a charter technology) is not held.
    const { state, hex } = townAndHex();
    const worker = workerOn(state, hex);
    expect(playerById(state, 0)!.techsResearched).not.toContain('surveying');
    expect(listed(state, worker)).not.toContain('qanat');
    know(state, 'surveying', true);
    expect(listed(state, worker)).toContain('qanat');
  });

  it('hides a charter improvement until its technology is known: the Physic Garden', () => {
    const { state, hex } = townAndHex();
    hex.freshwater = true;
    const worker = workerOn(state, hex);
    expect(listed(state, worker)).not.toContain('physicGarden');
    know(state, 'herbals', true);
    expect(listed(state, worker)).toContain('physicGarden');
  });

  it('hides an ordinary improvement until its technology is known: the Mine', () => {
    const { state, hex } = townAndHex();
    hex.hills = true;
    know(state, 'mining', false);
    const worker = workerOn(state, hex);
    expect(listed(state, worker)).not.toContain('mine');
    know(state, 'mining', true);
    expect(listed(state, worker)).toContain('mine');
  });

  it('still lists an unlocked row the worker cannot lay this turn, greyed and with its figure', () => {
    const { state, hex } = townAndHex();
    const worker = workerOn(state, hex);
    worker.movesLeft = 0;
    bumpRevision(state);
    const farm = improvementOptionsFor(state, worker).find((option) => option.id === 'farm');
    expect(farm?.blocked).toBe('This worker has no movement left');
    expect(farm?.delta.food).toBe(1);
  });

  it('lists nothing on a town’s own hex', () => {
    const { state } = townAndHex();
    const worker = workerOn(state, at(state, 5, 5));
    expect(listed(state, worker)).toEqual([]);
  });
});

describe('the figures on a row', () => {
  it('count a follower belief: Harvest Blessing makes the farm +2 food', () => {
    const { state, city, hex } = townAndHex();
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push('keeperOfTheHearth');
    const religion = foundReligion(state, player);
    const worker = workerOn(state, hex);
    const farm = (): ReturnType<typeof improvementOptionsFor>[number] =>
      improvementOptionsFor(state, worker).find((option) => option.id === 'farm')!;
    expect(farm().delta.food).toBe(1);
    religion.follower = ['harvestBlessing'];
    city.followers = { [religion.id]: city.population };
    bumpRevision(state);
    expect(farm().delta.food).toBe(2);
    expect(improvementHint(farm())).toBe(`Spend a charge: farm on this tile · +2${YIELD_GLYPH.food}`);
    // The hover card's lines name the belief.
    expect(farm().lines.some((line) => line.source.includes('Harvest Blessing'))).toBe(true);
  });

  it('show faith: Herd Gods makes a pasture pay +1 faith, and the row says so', () => {
    const { state, hex } = townAndHex();
    hex.resource = 'cattle';
    playerById(state, 0)!.pantheon.beliefs.push('herdGods');
    bumpRevision(state);
    const worker = workerOn(state, hex);
    const pasture = improvementOptionsFor(state, worker).find((option) => option.id === 'pasture')!;
    expect(pasture.delta.faith).toBe(1);
    expect(improvementHint(pasture)).toContain(`+1${YIELD_GLYPH.faith}`);
    expect(improvementChangeWords(pasture.delta)).toContain(`+1${YIELD_GLYPH.faith} on this hex`);
  });

  it('show science: a Physic Garden is +2 science', () => {
    const { state, hex } = townAndHex();
    hex.freshwater = true;
    know(state, 'herbals', true);
    const worker = workerOn(state, hex);
    const garden = improvementOptionsFor(state, worker).find((option) => option.id === 'physicGarden')!;
    expect(garden.delta.science).toBe(2);
    expect(improvementHint(garden)).toContain(`+2${YIELD_GLYPH.science}`);
  });
});

describe('yieldDeltaFigures', () => {
  it('prints every voice that shows, in the table’s order', () => {
    const delta = { ...emptyTileYield(), food: 1, gold: -1, science: 2, culture: 1, faith: 1 };
    expect(yieldDeltaFigures(delta)).toBe(
      `+1${YIELD_GLYPH.food} −1${YIELD_GLYPH.gold} +2${YIELD_GLYPH.science} +1${YIELD_GLYPH.culture} +1${YIELD_GLYPH.faith}`,
    );
  });

  it('leaves out a voice that rounds to nothing', () => {
    expect(yieldDeltaFigures({ ...emptyTileYield(), food: 0.4, production: 1 })).toBe(`+1${YIELD_GLYPH.production}`);
    expect(yieldDeltaFigures(emptyTileYield())).toBe('');
    expect(improvementChangeWords(emptyTileYield())).toBe('No change to this hex’s yield');
  });
});

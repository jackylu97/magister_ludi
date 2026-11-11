/**
 * The worker sheet's preview of a build: `explainImprovementPreview`
 * (`src/sim/improvements.ts`, batch W1, `docs/flags.md` item (lllllll)).
 *
 * The user, 2026-11-11: *"please have the tooltip show the proper yields, i
 * think the preview yields for an improvement dont factor religious beliefs or
 * orders"*. Before batch W1 the sheet read `improvementYieldDelta` in the
 * empire's context (`yieldContextFor`), so every line that only a town can
 * answer for was missing. These tests hold the four things the new reading
 * promises:
 *
 *   1. a follower belief and an Order with a scope are in the figure;
 *   2. a fact the build itself changes on the board is in the figure (a farm
 *      beside a Qanat is watered once it stands);
 *   3. a hex outside the borders is read in the context of the town that
 *      claims it;
 *   4. the reading writes nothing, and its lines are what the board's hover
 *      card prints after the build is really made.
 */

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived, tileContextAt, tileOwnerPlayerId } from '../../src/sim/cities';
import { snapshotState } from '../../src/sim/game';
import { explainImprovementPreview, improvementYieldDelta } from '../../src/sim/improvements';
import { type Tile, raiseImprovement, tileNeighbors } from '../../src/sim/map';
import { foundReligion } from '../../src/sim/religion';
import { type City, type GameState, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { explainTileYield, foldTileLines, yieldContextFor } from '../../src/sim/yields/hex';
import { at, bareState } from './improvementHelpers';

/** A town for seat 0, with its derived state refreshed and the revision moved. */
function town(state: GameState, col: number, row: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Puts an Order in one of seat 0's chairs. */
function seat(state: GameState, id: string): void {
  const sc = playerById(state, 0)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A hex beside the town's own, inside its borders, that is not the centre. */
function besideTown(state: GameState, city: City): Tile {
  const hex = tileNeighbors(state.map, at(state, city.col, city.row)).find(
    (tile) => tileOwnerPlayerId(state, tile.col, tile.row) === 0,
  );
  if (!hex) throw new Error('the town owns no hex beside its centre');
  return hex;
}

describe('explainImprovementPreview', () => {
  it('counts a follower belief on the new farm, which the empire context missed', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push('keeperOfTheHearth');
    const religion = foundReligion(state, player);
    religion.follower = ['harvestBlessing'];
    city.followers = { [religion.id]: city.population };
    bumpRevision(state);
    const hex = besideTown(state, city);
    expect(hex.freshwater).toBe(false);

    const preview = explainImprovementPreview(state, 0, hex, 'farm');
    // The farm's own food, and Harvest Blessing's on a farm worked by a town
    // that follows.
    expect(preview.delta.food).toBe(2);
    expect(preview.lines.some((line) => line.source.includes('Harvest Blessing'))).toBe(true);
    // The reading the sheet used before batch W1.
    expect(improvementYieldDelta(hex, 'farm', yieldContextFor(state, 0)).food).toBe(1);
  });

  it('counts an Order whose scope names the town', () => {
    // The Provincial Fair: +2 gold on plantations, camps and pastures in a town
    // with a Market. A scope is a question about a town, so only the town's
    // context can answer it.
    const state = bareState();
    const city = town(state, 5, 5);
    city.buildings.push('market');
    const hex = besideTown(state, city);
    hex.resource = 'cattle';
    seat(state, 'theProvincialFair');

    const preview = explainImprovementPreview(state, 0, hex, 'pasture');
    const old = improvementYieldDelta(hex, 'pasture', yieldContextFor(state, 0));
    expect(preview.delta.gold).toBe(old.gold + 2);
    expect(preview.lines.some((line) => line.source.includes('The Provincial Fair'))).toBe(true);
  });

  it('counts a pantheon belief in every voice it pays, faith included', () => {
    // Herd Gods: +1 production and +1 faith on a pasture. The sim's figure
    // always had the faith; the sheet printed food, production and gold only.
    const state = bareState();
    const city = town(state, 5, 5);
    const hex = besideTown(state, city);
    hex.resource = 'cattle';
    const before = explainImprovementPreview(state, 0, hex, 'pasture').delta;
    playerById(state, 0)!.pantheon.beliefs.push('herdGods');
    bumpRevision(state);
    const after = explainImprovementPreview(state, 0, hex, 'pasture').delta;
    expect(after.faith).toBe(before.faith + 1);
    expect(after.production).toBe(before.production + 1);
  });

  it('reads the board as it will stand: a new farm beside a Qanat is watered', () => {
    // The Qanat waters the farms beside it, and the field that says so is read
    // off the farms on the board. A hex that holds no farm yet is not in it, so
    // only the ghost board, with the farm standing, sees the Irrigation food.
    const state = bareState();
    const city = town(state, 5, 5);
    const well = besideTown(state, city);
    raiseImprovement(well, 'qanat', 0);
    const dry = tileNeighbors(state.map, well).find(
      (tile) =>
        tileOwnerPlayerId(state, tile.col, tile.row) === 0 &&
        (tile.col !== city.col || tile.row !== city.row),
    )!;
    bumpRevision(state);
    expect(dry.freshwater).toBe(false);
    expect(playerById(state, 0)!.techsResearched).toContain('irrigation');

    const preview = explainImprovementPreview(state, 0, dry, 'farm');
    expect(preview.delta.food).toBe(2);
    expect(preview.lines.some((line) => line.source === 'Irrigation')).toBe(true);
    // The old reading in the town's own context still missed it.
    expect(improvementYieldDelta(dry, 'farm', tileContextAt(state, 0, dry)).food).toBe(1);
  });

  it('reads a hex beyond the borders in the context of the town that claims it', () => {
    // An outpost goes up on unowned desert and the hex joins the nearest town,
    // which holds Petra: +1 food and +1 production on its desert.
    const state = bareState(16, 10);
    const home = town(state, 2, 5);
    home.buildings.push('petra');
    seat(state, 'outposts');
    const hex = at(state, 5, 5);
    hex.terrain = 'desert';
    bumpRevision(state);
    expect(tileOwnerPlayerId(state, 5, 5)).toBeNull();

    const preview = explainImprovementPreview(state, 0, hex, 'outpost');
    expect(preview.lines.some((line) => line.source.includes('Petra'))).toBe(true);
    expect(preview.delta.food).toBe(1);
    expect(preview.delta.production).toBe(1);
    // Read in the hex's context as it stands, the work adds nothing.
    expect(improvementYieldDelta(hex, 'outpost', tileContextAt(state, 0, hex)).food).toBe(0);
    // The hex is still nobody's: the claim was the ghost's.
    expect(tileOwnerPlayerId(state, 5, 5)).toBeNull();
  });

  it('writes nothing, and its lines are what the hover card prints after the build', () => {
    const state = bareState();
    const city = town(state, 5, 5);
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push('keeperOfTheHearth');
    const religion = foundReligion(state, player);
    religion.follower = ['harvestBlessing'];
    city.followers = { [religion.id]: city.population };
    const hex = besideTown(state, city);
    bumpRevision(state);

    const snapshot = snapshotState(state);
    const preview = explainImprovementPreview(state, 0, hex, 'farm');
    expect(snapshotState(state)).toBe(snapshot);
    expect(hex.improvement).toBeUndefined();

    // Now build it for real, through the reducer, and read the hex the way the
    // board's hover card does.
    const worker = createUnit(state, 0, 'worker', hex.col, hex.row);
    bumpRevision(state);
    const result = applyCommand(state, { type: 'buildImprovement', playerId: 0, unitId: worker.id, improvement: 'farm' });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    const built = explainTileYield(hex, tileContextAt(state, 0, hex));
    expect(preview.lines.map((line) => line.source)).toEqual(built.map((line) => line.source));
    expect(foldTileLines(preview.lines)).toEqual(foldTileLines(built));
  });
});

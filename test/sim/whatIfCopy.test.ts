/**
 * **A what-if that copies the town's plain reading** (batch BPS,
 * `docs/plans/performance-pass-2026-11-06.md`).
 *
 * `explainCity` takes the town's plain reading as `standing` and copies the parts
 * a candidate building cannot change: steps 3 to 7 always, steps 1 and 2 when
 * `candidateReachesGround` says the candidate cannot change the ground, step 9
 * when no card's share on buildings reaches the candidate, and the percentages.
 * The bot's what-if grid (`townFolds.ts`) asks this for every building it
 * weighs. If the copy ever gave a different list from a full walk, the bot would
 * price a building wrongly and decide differently, so these tests compare the
 * two, line for line and fold for fold:
 *
 *   - for every building row in every town of a played duel;
 *   - after a seat slots an Order whose share reaches some buildings;
 *   - after a seat takes a Doctrine whose hex line counts the town's buildings,
 *     which is the one way the cards make the ground read a candidate.
 *
 * Core tier: one duel played forward once for the file.
 */
import { describe, expect, it } from 'vitest';

import { BUILDING_IDS } from '../../src/sim/buildingData';
import { getTileAt } from '../../src/sim/map';
import { readCity, readEmpirePercents } from '../../src/sim/readings';
import { setSlateShadow, slateShadow } from '../../src/sim/slate';
import { type GameConfig, type GameState, bumpRevision, realPlayers } from '../../src/sim/state';
import { cardBuildingPercents, cardCountsTownGround } from '../../src/sim/statecraft/evaluator';
import type { DoctrineId, OrderId } from '../../src/sim/statecraftData';
import { candidateReachesGround, cityContext } from '../../src/sim/yields/hex';
import { explainCity, foldCity } from '../../src/sim/yields/town';
import { grownGames } from './grownGameHelpers';

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/** The duel played forward once for the whole file (`grownGameHelpers.ts`). */
const growDuel = grownGames(CONFIG);

/** How many pairs took each branch, so a test can say both were exercised. */
interface Tally {
  pairs: number;
  groundCopied: number;
  groundWalked: number;
}

/**
 * Every building row in every town of the real seats: the what-if with the plain
 * reading handed in, against the full walk. Fails on the first pair that differs.
 */
function compareEveryRow(state: GameState): Tally {
  const tally: Tally = { pairs: 0, groundCopied: 0, groundWalked: 0 };
  const seats = new Set(realPlayers(state).map((player) => player.id));
  for (const city of state.cities) {
    if (!seats.has(city.ownerId)) continue;
    const empire = readEmpirePercents(state, city.ownerId);
    const standing = readCity(state, city);
    for (const id of BUILDING_IDS) {
      const full = explainCity(state, city, [id], empire);
      const copied = explainCity(state, city, [id], empire, standing);
      expect({ town: city.name, id, reading: copied }).toStrictEqual({ town: city.name, id, reading: full });
      expect({ town: city.name, id, fold: foldCity(state, city, [id], null, copied) }).toStrictEqual({
        town: city.name,
        id,
        fold: foldCity(state, city, [id], null, full),
      });
      tally.pairs += 1;
      if (candidateReachesGround(state, city, [id])) tally.groundWalked += 1;
      else tally.groundCopied += 1;
    }
  }
  return tally;
}

describe('a what-if handed the town’s plain reading', () => {
  it('keeps the held building lines and appends only new candidates in their original order', () => {
    const { state } = growDuel(30);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    city.buildings = ['granary'];
    bumpRevision(state);
    const empire = readEmpirePercents(state, 0);
    const standing = readCity(state, city);
    const candidates = ['library', 'granary', 'library'] as const;
    const preview = explainCity(state, city, candidates, empire, standing);
    expect(preview).toStrictEqual(explainCity(state, city, candidates, empire));
    expect(preview.lines.find((line) => line.step === 8)).toBe(standing.lines.find((line) => line.step === 8));
  });

  it('reuses fixed building yields across a population change and updates science per citizen', () => {
    const { state } = growDuel(30);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    const before = slateShadow();
    setSlateShadow(false);
    try {
      city.buildings = ['granary'];
      bumpRevision(state);
      const fixed = readCity(state, city).lines.find((line) => line.step === 8)!;
      city.population += 1;
      bumpRevision(state);
      expect(readCity(state, city).lines.find((line) => line.step === 8)).toBe(fixed);

      city.buildings.push('museion');
      bumpRevision(state);
      const scienceAt = () => readCity(state, city).lines.find((line) => line.building === 'museion')!.science;
      const science = scienceAt();
      city.population += 1;
      bumpRevision(state);
      expect(scienceAt()).toBe(science + 0.5);
      expect(readCity(state, city)).toStrictEqual(explainCity(state, city));

      city.buildings.reverse();
      bumpRevision(state);
      expect(readCity(state, city)).toStrictEqual(explainCity(state, city));
      city.buildings.pop();
      bumpRevision(state);
      expect(readCity(state, city)).toStrictEqual(explainCity(state, city));
    } finally {
      setSlateShadow(before);
    }
  });

  it('gives the list a full walk gives, for every building in every town', () => {
    const { state } = growDuel(30);
    const tally = compareEveryRow(state);
    // Both branches ran: rows with no tile line copy the ground, and the rows
    // with one (the lighthouse, the cistern, the stable) walk it.
    expect(tally.pairs).toBeGreaterThan(BUILDING_IDS.length);
    expect(tally.groundCopied).toBeGreaterThan(0);
    expect(tally.groundWalked).toBeGreaterThan(0);
  });

  it('copies nothing into a real reading', () => {
    // With no candidate the plain reading is the answer, and a caller that hands
    // one in gets a fresh walk, never the object it passed.
    const { state } = growDuel(30);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    const standing = readCity(state, city);
    const again = explainCity(state, city, [], readEmpirePercents(state, city.ownerId), standing);
    expect(again).toStrictEqual(standing);
    expect(again.lines).not.toBe(standing.lines);
  });

  it('walks step 9 for a candidate a card’s share on buildings reaches', () => {
    // The Bourse gives the gold buildings three quarters again, so a market
    // candidate is reached by the share and a library candidate is not.
    const { state } = growDuel(30);
    const seat = state.players[0]!;
    seat.statecraft.slots[0] = { card: 'theBourse' as OrderId, sealedUntil: state.turn };
    bumpRevision(state);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    const shares = cardBuildingPercents(state, city);
    expect(shares.length).toBeGreaterThan(0);
    expect(BUILDING_IDS.some((id) => shares.some((share) => share.matches(id)))).toBe(true);
    compareEveryRow(state);
  });

  it('walks the ground for every candidate while the law counts the town’s buildings on it', () => {
    const { state } = growDuel(30);
    const seat = state.players[0]!;
    seat.statecraft.doctrines.push('theHydraulicEmpire' as DoctrineId);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    // The Doctrine pays on worked hexes with fresh water, once for each public
    // work in the town, so a public work as a candidate changes what they pay.
    for (const cell of city.workedTiles) getTileAt(state.map, cell.col, cell.row)!.freshwater = true;
    bumpRevision(state);
    expect(cardCountsTownGround(state, 0)).toBe(true);
    // A row with no tile line of its own still reaches the ground through the count.
    expect(candidateReachesGround(state, city, ['library'])).toBe(true);
    compareEveryRow(state);
  });
});

describe('whether a candidate reaches the ground', () => {
  it('answers no only where the town’s context is the same with the candidate', () => {
    const { state } = growDuel(30);
    let checked = 0;
    const seats = new Set(realPlayers(state).map((player) => player.id));
    for (const city of state.cities) {
      if (!seats.has(city.ownerId)) continue;
      const plain = cityContext(state, city);
      for (const id of BUILDING_IDS) {
        if (candidateReachesGround(state, city, [id])) continue;
        const ghost = cityContext(state, city, [id]);
        // The two fields `cityContext` adds to the empire's context.
        expect({ id, lines: ghost?.lines, irrigates: ghost?.irrigates }).toStrictEqual({
          id,
          lines: plain?.lines,
          irrigates: plain?.irrigates,
        });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('answers yes for a tile line the town lacks, and for water', () => {
    const { state } = growDuel(30);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    // The lighthouse pays on water hexes, and the cistern waters the fields.
    if (!city.buildings.includes('lighthouse')) {
      expect(candidateReachesGround(state, city, ['lighthouse'])).toBe(true);
    }
    if (!city.buildings.includes('cistern')) {
      expect(candidateReachesGround(state, city, ['cistern'])).toBe(true);
    }
    expect(candidateReachesGround(state, city, [])).toBe(false);
  });
});

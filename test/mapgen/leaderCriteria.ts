/**
 * What each figure's start is measured against — one list, two sweeps, and the
 * cast the two of them seat.
 *
 * The M1 verification (`test/stress/leaderStarts.slow.test.ts`) asks how often a
 * seat gets the ground its figure wants, with the figures on and with the chairs
 * empty. The M2 sweep (`test/mapgen/startSpacing.slow.test.ts`) asks what raising
 * the floor and reordering the seating ladder cost those same rates. Two
 * questions, one list of claims — so the list lives here rather than in either,
 * because a criterion edited in one sweep and not the other is two measurements
 * that look comparable and are not.
 *
 * **Six chairs, whoever is in them** (L6a, `docs/flags.md` (xxxx)). The second
 * cut grew the roster to thirteen figures, and the obvious sweep — one chair a
 * figure — measures a game nobody plays: thirteen capitals on a standard board
 * cannot all stand `starts.minDistance` apart, so both sweeps' claims would be
 * about a crowded map rather than about the biases. The claims stay about the
 * product's six-seat table; the *cast* rotates instead, so every figure is
 * measured over several boards without any board seating more than six. See
 * `castFor`.
 *
 * A non-test module for the reason CLAUDE.md gives: importing a `.test.ts` file
 * re-registers its tests.
 */

import type { GameMap, Tile } from '../../src/sim/map';
import { mapRange, tileHex, tileNeighbors } from '../../src/sim/map';
import { improvementForResource } from '../../src/sim/improvementData';
import { LEADER_IDS, type LeaderId } from '../../src/sim/leaderData';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import type { StartSeat } from '../../src/sim/startPositions';

/** How many seeds both sweeps run. Their tables are shares over these boards. */
export const SWEEP_SEEDS = 24;

/** How many chairs a board seats — the product's table, not the roster's size. */
export const CAST_SIZE = 6;

/**
 * The figure every cast carries.
 *
 * The (uuuu) measurement — how much sand Akhenaten is actually standing in — is
 * a per-seed reading of *him*, so he cannot be a figure who is only at the table
 * on some boards or the reading would be a different question on every row.
 */
export const CAST_ANCHOR: LeaderId = 'akhenaten';

/** Everybody the rotation draws from, in sheet order. */
const ROTATION: readonly LeaderId[] = LEADER_IDS.filter((id) => id !== CAST_ANCHOR);

/**
 * The six figures seated on one seed's board: the anchor, and five drawn by
 * rotating a window of five through the rest of the sheet.
 *
 * A rotation rather than a draw, because a sweep's cast must be a pure function
 * of the seed the way the map is (rule 2): a reader who reruns seed 9 gets the
 * same table, and a row of the table below is a claim about a stated set of
 * boards rather than about whatever the dice gave. The window advances by its
 * own width, so over twelve consecutive seeds it lands on every offset and every
 * figure is seated exactly five times — over `SWEEP_SEEDS` boards, ten each.
 * That is the whole point of the shape: the roster is measured, not sampled.
 *
 * The cast is returned in sheet order, so the seat a figure sits in is its
 * position among those drawn and is found with `cast.findIndex`, never assumed.
 */
export function castFor(seed: number): StartSeat[] {
  const seated = new Set<LeaderId>([CAST_ANCHOR]);
  for (let step = 0; step < CAST_SIZE - 1; step++) {
    const at = ((seed - 1) * (CAST_SIZE - 1) + step) % ROTATION.length;
    seated.add(ROTATION[at]!);
  }
  // Iterated off the sheet rather than out of the Set, for rule 2's reason.
  return LEADER_IDS.filter((id) => seated.has(id)).map((leader) => ({ leader }));
}

/** Where `leader` sits in this seed's cast, or −1 when it is not at the table. */
export function seatOf(cast: readonly StartSeat[], leader: LeaderId): number {
  return cast.findIndex((seat) => seat.leader === leader);
}

/** How many of `SWEEP_SEEDS` boards seat each figure. The denominator of a share. */
export function appearances(seeds: number = SWEEP_SEEDS): Map<LeaderId, number> {
  const counts = new Map<LeaderId, number>(LEADER_IDS.map((id) => [id, 0]));
  for (let seed = 1; seed <= seeds; seed++) {
    for (const seat of castFor(seed)) counts.set(seat.leader!, counts.get(seat.leader!)! + 1);
  }
  return counts;
}

/**
 * A held count as the percentage of the boards that figure was actually at.
 *
 * Rounded to a whole percent so a pinned floor is a comparison of integers: a
 * share held as a float would pin a rounding artefact and fail on nothing.
 */
export function shareOf(held: number, seated: number): number {
  return seated === 0 ? 0 : Math.round((100 * held) / seated);
}

/** Hexes within `radius` of a start, the start itself included. */
export function near(map: GameMap, start: Tile, radius: number): Tile[] {
  return mapRange(map, tileHex(start), radius);
}

export function hasRiver(map: GameMap, start: Tile, radius: number): boolean {
  return near(map, start, radius).some((tile) => tile.riverEdges !== 0);
}

export function countTerrain(
  map: GameMap,
  start: Tile,
  radius: number,
  what: (tile: Tile) => boolean,
): number {
  return near(map, start, radius).filter(what).length;
}

/** Dry country, the three faces of it — `hexAnswers`' own sentence. */
export function isArid(tile: Tile): boolean {
  return tile.terrain === 'desert' || tile.feature === 'oasis' || tile.feature === 'floodplain';
}

/** How many of the six hexes touching a start are dry country. The (uuuu) figure. */
export function aridNeighbours(map: GameMap, start: Tile): number {
  return tileNeighbors(map, start).filter(isArid).length;
}

/** A hex a pasture could ever stand on — the ground Modu's herds need. */
export function pastureGround(tile: Tile): boolean {
  return ['horses', 'cattle', 'bison'].some((id) =>
    tileSuitsResource(tile, resourceDef(id as never)),
  );
}

/**
 * Salt water — `hexAnswers`' own sentence for `coastalWithin`. A lake is
 * deliberately not it: the figures who want a basin say `lakeWithin`.
 */
export function isSaltWater(tile: Tile): boolean {
  return tile.terrain === 'coast' || tile.terrain === 'ocean';
}

/** Is a resource opened by this improvement kind standing in reach? */
export function hasKind(map: GameMap, start: Tile, radius: number, kind: string): boolean {
  return near(map, start, radius).some(
    (tile) => tile.resource !== undefined && improvementForResource(tile.resource) === kind,
  );
}

/** One measurable claim about a seat's ground. */
export interface Criterion {
  leader: LeaderId;
  label: string;
  /**
   * True when the row's own sheet **backs** this claim with a hard want
   * (`startBias.wants`) or a furnishing — the two halves of M1b. A backed claim
   * is held on all but a seed or two and is asserted at a floor; an unbacked one
   * rides the soft score alone and is only asked to improve.
   */
  backed?: true;
  holds(map: GameMap, start: Tile): boolean;
}

export const CRITERIA: Criterion[] = [
  {
    leader: 'pachacuti',
    label: 'a mountain within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'mountain') > 0,
  },
  {
    leader: 'pachacuti',
    label: 'three hills within 2',
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.hills) >= 3,
  },
  {
    leader: 'pachacuti',
    label: 'a river within 1',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 1),
  },
  {
    leader: 'taizong',
    label: 'grassland within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'grassland') > 0,
  },
  {
    leader: 'modu',
    label: 'horses within 4',
    backed: true,
    holds: (map, start) => near(map, start, 4).some((tile) => tile.resource === 'horses'),
  },
  {
    leader: 'modu',
    label: 'two pasture hexes within 3',
    holds: (map, start) => countTerrain(map, start, 3, pastureGround) >= 2,
  },
  {
    leader: 'akhenaten',
    label: 'river or floodplain within 1',
    backed: true,
    holds: (map, start) =>
      hasRiver(map, start, 1) ||
      countTerrain(map, start, 1, (tile) => tile.feature === 'floodplain') > 0,
  },
  {
    // Ruled 2026-09-11, `docs/flags.md` (uuuu): the old claim was one arid hex
    // within two rings, which a river valley with a dune in sight answers. The
    // ask was the sand itself, so the claim is now the neighbours.
    leader: 'akhenaten',
    label: 'three arid neighbours',
    backed: true,
    holds: (map, start) => aridNeighbours(map, start) >= 3,
  },
  {
    leader: 'almamun',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a camp kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'camp'),
  },
  {
    leader: 'mithridates',
    label: 'a plantation kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'plantation'),
  },
  // The second cut's seven (L6a). Five of them carry wants and are measured for
  // the same reason the first six are; Joan and Ibn Battuta ask the map for
  // nothing at all, so there is nothing here to hold them to — a criterion with
  // no want behind it would be measuring the unbiased chooser and calling it a
  // bias.
  {
    leader: 'mansaMusa',
    label: 'arid within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, isArid) > 0,
  },
  {
    leader: 'zhengHeOfMing',
    label: 'the sea within 1',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 1, isSaltWater) > 0,
  },
  {
    leader: 'nezahualcoyotl',
    label: 'a lake within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'lake') > 0,
  },
  {
    leader: 'nezahualcoyotl',
    label: 'river or floodplain within 1',
    backed: true,
    holds: (map, start) =>
      hasRiver(map, start, 1) ||
      countTerrain(map, start, 1, (tile) => tile.feature === 'floodplain') > 0,
  },
  {
    leader: 'hypatiaOfAlexandria',
    label: 'the sea within 1',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 1, isSaltWater) > 0,
  },
  {
    leader: 'hypatiaOfAlexandria',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'hildegard',
    label: 'a river within 1',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 1),
  },
];

/**
 * Every criterion's rate before M2 and after it, as a **share of the boards the
 * figure was at** — a whole percent, `shareOf`'s reading.
 *
 * A share and not a count, since L6a: a figure is seated on ten of the
 * twenty-four boards and Akhenaten on all of them, so "held 9" means two
 * different things on two rows and "held 90%" means one. The M1 column is the
 * same measurement restated — those rows were counts out of twenty-four with all
 * six figures at every table, which is a share of the boards they were at, so
 * the comparison survives the change of denominator intact.
 *
 * `m1` is what `test/stress/leaderStarts.slow.test.ts` measured when the wants
 * shipped (`docs/mapgen.md`'s own table, the seated column); `m2` is what the
 * sweeps measure now and is the floor they pin. Both columns are here because
 * the interesting number is the difference: a want that fell tells a designer
 * the spacing is now buying the distance out of somebody's ground, and a table
 * that only carried today's rate would hide that. `m1: null` is a row M1 never
 * asked — the second cut's figures, who did not exist then.
 *
 * A criterion with no row fails the sweep — the two lists are kept in step the
 * way every doc table in this tree is.
 */
export const RATES: Record<string, { m1: number | null; m2: number }> = {
  'pachacuti · a mountain within 2': { m1: 100, m2: 100 },
  'pachacuti · three hills within 2': { m1: 100, m2: 100 },
  'pachacuti · a river within 1': { m1: 100, m2: 100 },
  'taizong · grassland within 2': { m1: 100, m2: 100 },
  'modu · horses within 4': { m1: 100, m2: 100 },
  'modu · two pasture hexes within 3': { m1: 100, m2: 100 },
  'akhenaten · river or floodplain within 1': { m1: 100, m2: 100 },
  // New with (uuuu): M1 had no such claim, so its column is the rate the old
  // sheet happened to deliver — Akhenaten stood in three hexes of sand on none
  // of the twenty-four boards, which is the measurement the ruling exists
  // because of.
  'akhenaten · three arid neighbours': { m1: 0, m2: 63 },
  'almamun · a river within 2': { m1: 100, m2: 100 },
  'mithridates · a river within 2': { m1: 100, m2: 90 },
  'mithridates · a camp kind within 3': { m1: 100, m2: 100 },
  'mithridates · a plantation kind within 3': { m1: 100, m2: 100 },
  // The second cut's five with wants (L6a). No M1 column — they did not exist
  // when it was measured — and the two low rows are the ruling working, not
  // failing: dry country and a salt-water shore are the two grounds a standard
  // board grows least of and refuses starts on most often, so a figure that
  // asks for one is the first to be told there is none left once the spacing
  // has been paid. They are pinned where they land rather than where anybody
  // would like them, which is what makes the number worth printing.
  'mansaMusa · arid within 2': { m1: null, m2: 30 },
  'zhengHeOfMing · the sea within 1': { m1: null, m2: 50 },
  'nezahualcoyotl · a lake within 2': { m1: null, m2: 100 },
  'nezahualcoyotl · river or floodplain within 1': { m1: null, m2: 100 },
  'hypatiaOfAlexandria · the sea within 1': { m1: null, m2: 100 },
  'hypatiaOfAlexandria · a river within 2': { m1: null, m2: 100 },
  'hildegard · a river within 1': { m1: null, m2: 70 },
};

/**
 * **The two war benches, played** — the slow half of `aiWar.test.ts`.
 *
 * Both lived in `aiBot.slow.test.ts` until the test-speed pass of 2026-09-09
 * (see that file's docblock for the split and the reasoning), beside a third —
 * a hundred-and-seventy-turn arena on a generated map — that the same pass
 * retired; the note where it stood says why.
 *
 * What is left are two **arranged** boards, and together they cost about two
 * seconds. Neither is a pacing measurement: each asserts an **operational**
 * fact about the war policy that no arranged single decision can — an army that
 * is at war actually marches and the walls come down, and a peace needs two
 * signatures, one of them the other empire's own.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { createGame } from '../../src/sim/game';
import { type GameConfig, bumpRevision, createUnit } from '../../src/sim/state';
import { atWar, openWar } from '../../src/sim/wars';
import { cityMaxHp } from '../../src/sim/combat';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileHex, wrappedDistance } from '../../src/sim/map';
import { isCombatant, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { strikeForce } from '../../src/ai/campaign';
import { PATIENCE } from './aiBotHelpers';

/**
 * **The 170-turn war arena was retired here** (the user, 2026-09-09). It drove a
 * warmonger and a balanced neighbour on a generated duel map for a hundred and
 * seventy turns — some hundred and sixteen seconds, the longest file in the
 * tier — and its only pin was a *negative*: no declaration was ever issued on a
 * turn when the strike force was short. That rule is pinned positively on the
 * war-loop bench at the foot of this file (every declaration carries `armed`)
 * and five times over on arranged boards in `aiWar.test.ts`, and the arena's
 * own replay claim is the long game's in `aiBot.slow.test.ts`. What it printed
 * — a strike force held on seventy of the hundred and seventy turns — was a
 * measurement, and the bot is not a measuring instrument.
 * `docs/audit/test-suite-speed.md` records it.
 */

/**
 * **The siege arena** (W1, `docs/war-diplomacy.md` §13): a force on a board with
 * a war already open, driven for forty turns, and *measured*.
 *
 * The war loop at the foot of this file asks whether the diplomatic loop closes
 * — somebody declares, somebody sues, somebody signs. This one asks the question
 * §13 was written about, which the loop cannot answer: **does the army actually
 * go**.
 * The user's finding was a pair of seats at war who never sent anybody
 * (2026-09-07), and every clause of the batch is an operational one, so the
 * measurement has to be operational too: a piece of the attacker's force stands
 * at the walls, and the walls come down.
 *
 * Four things about the bench are deliberate:
 *
 *   · **the attacker is balanced**, not the warmonger. §13.2's whole ruling is
 *     that the war is the permission and the temperament only loosens an
 *     exchange, so a campaign only a warmonger prosecuted would be the old
 *     behaviour wearing a new name;
 *   · **the ground is flat and the two towns are placed.** Where a generated
 *     duel map puts two capitals is a fact about the mapgen, and a march that
 *     has to be measured in turns cannot be measured against a distance nobody
 *     chose. `aiWar.test.ts`' bench, played rather than asked;
 *   · **the force and the war are injected** rather than played into being. The
 *     declaration has its own five tests and forty turns is not enough of a game
 *     to raise an army *and* march it. The cost of injecting is that this game
 *     is not byte-replayable — pieces conjured onto the board are in no log — so,
 *     unlike the long game in `aiBot.slow.test.ts`, it makes no replay claim;
 *   · **no barbarians.** The camp hunt runs ahead of the campaign (a town of
 *     one's own outranks a town of somebody else's), and a raider in the hills
 *     would make this a measurement of the hunt.
 *
 * The assertion is **damage, not capture**. Taking a town needs the walls down,
 * the garrison beaten and a melee piece with movement left on the same turn;
 * that is a real outcome and not one to pin a test on. Hit points off a town's
 * walls is the thing that could not happen at all before this batch — the old
 * `warMarch` could not even path at a town, because a foreign town's own hex is
 * refused by `canStopOn` and it never asked about the ring.
 */
const SIEGE_CONFIG: GameConfig = {
  seed: 20260907,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: false,
};

const SIEGE_TURNS = 40;

interface SiegeStory {
  warnings: string[];
  stalls: number;
  target: string;
  targetMaxHp: number;
  arrivedTurn: number | null;
  closestEver: number;
  lowestHp: number;
  lowestHpTurn: number | null;
  mostAtTheWalls: number;
}

let siegeGame: SiegeStory | null = null;
function theSiege(): SiegeStory {
  if (siegeGame !== null) return siegeGame;
  const game = createGame(SIEGE_CONFIG);
  const width = 30;
  const height = 16;
  game.state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(game.state);
  game.state.tileOwner = new Array<number | null>(width * height).fill(null);
  game.state.units = [];
  game.state.cities = [];
  game.state.camps = [];
  const ours = foundCityAt(game.state, 0, getTileAt(game.state.map, 4, 8)!);
  const theirs = foundCityAt(game.state, 1, getTileAt(game.state.map, 18, 8)!);
  // A garrison apiece, plus a bow for the defence: a town nobody is holding is
  // not a siege, it is a walk-in.
  createUnit(game.state, 0, 'warrior', ours.col, ours.row);
  createUnit(game.state, 1, 'warrior', theirs.col, theirs.row);
  createUnit(game.state, 1, 'archer', theirs.col + 1, theirs.row);
  // The strike force, in the field: eight spears and three bows, one to a hex.
  let placed = 0;
  for (let dc = 0; dc < 4 && placed < 11; dc++) {
    for (let dr = 0; dr < 3 && placed < 11; dr++, placed++) {
      const type = placed < 8 ? 'warrior' : 'archer';
      createUnit(game.state, 0, type, 7 + dc, 6 + dr);
    }
  }
  // Solvent on purpose: an empire in arrears disbands soldiers before it does
  // anything else (`disbandCommand`), and this bench is about the campaign
  // rather than about the treasury.
  game.state.players[0]!.gold = 3000;
  game.state.players[1]!.gold = 300;
  openWar(game.state, 0, 1);
  bumpRevision(game.state);

  const warnings: string[] = [];
  let stalls = 0;
  const walls = tileHex(getTileAt(game.state.map, theirs.col, theirs.row)!);
  const targetMaxHp = cityMaxHp(theirs);
  let arrivedTurn: number | null = null;
  let closestEver = Number.POSITIVE_INFINITY;
  let lowestHp = theirs.hp;
  let lowestHpTurn: number | null = null;
  let mostAtTheWalls = 0;
  for (let turn = 0; turn < SIEGE_TURNS; turn++) {
    for (const report of driveBots(game, { warn: (message) => warnings.push(message) })) {
      if (report.refused > 0) {
        warnings.push(
          `seat ${report.playerId} had ${report.refused} refusals on turn ${game.state.turn}`,
        );
      }
      if (!report.ended) stalls += 1;
    }
    const town = game.state.cities.find((city) => city.id === theirs.id);
    if (town === undefined) break;
    let closest = Number.POSITIVE_INFINITY;
    let atTheWalls = 0;
    for (const unit of game.state.units) {
      if (unit.ownerId !== 0) continue;
      if (!isCombatant(unitDef(unit.type))) continue;
      const tile = getTileAt(game.state.map, unit.col, unit.row);
      if (!tile) continue;
      const distance = wrappedDistance(game.state.map, walls, tileHex(tile));
      if (distance < closest) closest = distance;
      if (distance <= 2) atTheWalls += 1;
    }
    if (closest < closestEver) closestEver = closest;
    if (atTheWalls > mostAtTheWalls) mostAtTheWalls = atTheWalls;
    if (arrivedTurn === null && closest <= 1) arrivedTurn = game.state.turn;
    if (town.hp < lowestHp) {
      lowestHp = town.hp;
      lowestHpTurn = game.state.turn;
    }
  }
  siegeGame = {
    warnings,
    stalls,
    target: theirs.name,
    targetMaxHp,
    arrivedTurn,
    closestEver,
    lowestHp,
    lowestHpTurn,
    mostAtTheWalls,
  };
  return siegeGame;
}

describe('the siege arena: a balanced seat prosecutes a war it is in', () => {
  it(
    'marches a force to the enemy town and takes its walls down',
    () => {
      const story = theSiege();
      expect(story.warnings).toEqual([]);
      expect(story.stalls).toBe(0);
      // It arrived. Before W1 a balanced seat's soldiers never left home at all
      // (`military.aggression > 0` gated the march) and a warmonger's walked at
      // the nearest enemy *piece*, never at a town.
      expect(story.arrivedTurn).not.toBeNull();
      // It arrived as a force rather than one piece at a time — the muster.
      expect(story.mostAtTheWalls).toBeGreaterThanOrEqual(aiConfigFor(undefined).war.strikeForce);
      // And it hit what it came for. Damage rather than capture — see the
      // docblock — and a good deal of it.
      expect(story.lowestHp).toBeLessThan(story.targetMaxHp);
    },
    PATIENCE,
  );

  it(
    'reports the siege story',
    () => {
      // A measurement of the machinery rather than of the game's pacing: how
      // close the force got and how far the walls came down.
      const story = theSiege();
      /* eslint-disable no-console */
      console.log(
        `[siege] ${story.target} · arrived t${story.arrivedTurn ?? '—'} · closest ${story.closestEver} hexes · ` +
          `up to ${story.mostAtTheWalls} pieces within 2 of the walls`,
      );
      console.log(
        `[siege] walls: ${story.targetMaxHp} at the start, low of ${story.lowestHp}` +
          (story.lowestHpTurn === null ? '' : ` at t${story.lowestHpTurn}`),
      );
      /* eslint-enable no-console */
      expect(story.targetMaxHp).toBeGreaterThan(0);
    },
    PATIENCE,
  );
});

/**
 * **The war loop, on a bench where the force exists** — the positive half W1
 * took off the generated-map arena this file used to hold.
 *
 * The whole P3 chain in one game and in a handful of turns: a warmonger with a
 * strike force **declares** by its own policy (nothing here opens a war), the
 * neighbour's warscore falls under its floor and it **sues**, the warmonger's
 * reading of the same war is inside the ceiling it presses on at so it
 * **signs**, and `closeWar` writes the **truce**. Not one of those four can be
 * faked by a single seat: a peace needs both signatures and the second is the
 * other empire's own decision.
 *
 * The armies are chosen so the window is open rather than by luck. The warscore
 * is an exact mirror between two seats, so a peace closes only where one seat's
 * `sueFloor` and the other's `acceptCeiling` overlap — which for a balanced
 * neighbour (−12) and a warmonger (25) is a standing army difference of roughly
 * thirty to sixty strength. Six warriors and two bows against two warriors sits
 * in it.
 *
 * The board is `aiWar.test.ts`' flat bench, played rather than asked, for the
 * siege arena's reason: where a generated map puts two capitals is a fact about
 * the mapgen. Injected pieces are in no log, so this game makes no replay claim
 * either — the long game in `aiBot.slow.test.ts` keeps that.
 */
const LOOP_TURNS = 24;

interface LoopStory {
  warnings: string[];
  stalls: number;
  /** Each declaration, and whether the declarer held its strike force that turn. */
  declarations: { turn: number; by: number; armed: boolean }[];
  offers: number;
  truces: number;
  everAtWar: boolean;
  closedTurn: number | null;
}

let loopGame: LoopStory | null = null;
function theWarLoop(): LoopStory {
  if (loopGame !== null) return loopGame;
  const game = createGame({
    seed: 20260907,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e', persona: 'warmonger' },
      { name: 'Teal', color: '#1f8a85' },
    ],
    barbarians: false,
  });
  const width = 30;
  const height = 16;
  game.state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(game.state);
  game.state.tileOwner = new Array<number | null>(width * height).fill(null);
  game.state.units = [];
  game.state.cities = [];
  game.state.camps = [];
  const ours = foundCityAt(game.state, 0, getTileAt(game.state.map, 4, 8)!);
  const theirs = foundCityAt(game.state, 1, getTileAt(game.state.map, 18, 8)!);
  createUnit(game.state, 0, 'warrior', ours.col, ours.row);
  createUnit(game.state, 1, 'warrior', theirs.col, theirs.row);
  let placed = 0;
  for (let dc = 0; dc < 4 && placed < 8; dc++) {
    for (let dr = 0; dr < 3 && placed < 8; dr++, placed++) {
      createUnit(game.state, 0, placed < 6 ? 'warrior' : 'archer', 7 + dc, 6 + dr);
    }
  }
  game.state.players[0]!.gold = 2000;
  game.state.players[1]!.gold = 200;
  bumpRevision(game.state);

  const warnings: string[] = [];
  const declarations: { turn: number; by: number; armed: boolean }[] = [];
  let stalls = 0;
  let truces = 0;
  let everAtWar = false;
  let closedTurn: number | null = null;
  for (let turn = 0; turn < LOOP_TURNS; turn++) {
    const before = game.log.length;
    // The force as the policy saw it, read before the seat is asked.
    const seat = game.state.players[0]!;
    const sheet = aiConfigFor(seat.persona);
    const force = strikeForce(game.state, seat, sheet);
    const armed = force.spare >= sheet.war.strikeForce && force.siege !== null;
    for (const report of driveBots(game, { warn: (message) => warnings.push(message) })) {
      if (report.refused > 0) {
        warnings.push(
          `seat ${report.playerId} had ${report.refused} refusals on turn ${game.state.turn}`,
        );
      }
      if (!report.ended) stalls += 1;
    }
    for (const command of game.log.slice(before)) {
      if (command.type === 'declareWar') {
        declarations.push({ turn: game.state.turn, by: command.playerId, armed });
      }
    }
    if (atWar(game.state, 0, 1)) everAtWar = true;
    if (everAtWar && closedTurn === null && !atWar(game.state, 0, 1)) closedTurn = game.state.turn;
    truces = Math.max(truces, game.state.truces.length);
  }
  loopGame = {
    warnings,
    stalls,
    declarations,
    offers: game.log.filter((command) => command.type === 'proposePeace').length,
    truces,
    everAtWar,
    closedTurn,
  };
  return loopGame;
}

describe('the war loop: declared with a force, fought, and signed', () => {
  it(
    'declares by its own policy once it has a force and a road',
    () => {
      const story = theWarLoop();
      expect(story.warnings).toEqual([]);
      expect(story.stalls).toBe(0);
      expect(story.declarations.length).toBeGreaterThan(0);
      expect(story.declarations[0]!.by).toBe(0);
      expect(story.everAtWar).toBe(true);
      // And every one of them stood on a force — the arena's pin, made here on
      // a board where declarations actually happen.
      for (const row of story.declarations) {
        expect({ turn: row.turn, armed: row.armed }).toEqual({ turn: row.turn, armed: true });
      }
    },
    PATIENCE,
  );

  it(
    'reaches a peace, which needs both empires to sign',
    () => {
      const story = theWarLoop();
      expect(story.offers).toBeGreaterThan(0);
      // A truce exists only where a war was closed (`closeWar` writes it), so
      // this is the whole loop asserted in one figure.
      expect(story.truces).toBeGreaterThan(0);
    },
    PATIENCE,
  );

  it(
    'reports the loop',
    () => {
      const story = theWarLoop();
      /* eslint-disable no-console */
      console.log(
        `[loop] declared ${story.declarations.map((row) => `t${row.turn} by seat ${row.by}`).join(' | ')} · ` +
          `offers ${story.offers} · truces ${story.truces} · closed t${story.closedTurn ?? '—'}`,
      );
      /* eslint-enable no-console */
      expect(story.declarations.length).toBeGreaterThan(0);
    },
    PATIENCE,
  );
});

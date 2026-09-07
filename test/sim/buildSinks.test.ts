/**
 * The build-sink pass: **a queue is never idle** (design ledger, Entry XXVI).
 *
 * Three things landed together because they are one playtest finding — "the
 * early game runs out of things to build, and units are too cheap against the
 * tech pace" — and this file holds all three:
 *
 *   1. **Repeatable projects.** Tithes and Scholarship: a queue row that costs
 *      hammers, pays a printed conversion, and never leaves the queue.
 *   2. **The roster's prices**, up ~40% in Age I with a mounted premium, and an
 *      age band on the later rosters so a late empire's science pace does not
 *      buy it units that are nearly free.
 *   3. **Two Age I building sinks**, the palisade and the funeral games, each
 *      declaring an effect through the generic vocabulary rather than a case.
 *
 * The measurements at the bottom are the pass's argument and are pinned as
 * bands rather than as memorised numbers, for `statecraftPacing.test.ts`'s
 * reason: a curve that got cheaper is as much a regression as one that got
 * dearer.
 */

import { describe, expect, it } from 'vitest';

import { buildingCityStat, buildingHappiness, foldBuildingCityStat } from '../../src/sim/buildingEffects';
import { BUILDING_IDS, buildingDef, isWonder } from '../../src/sim/buildingData';
import { type Command, applyCommand } from '../../src/sim/commands';
import { previewCombat } from '../../src/sim/combat';
import {
  advanceProduction,
  buildingProductionCost,
  centreYield,
  cityYields,
  explainBuildingCost,
  explainUnitCost,
  foldUnitCost,
  foundCityAt,
  planProduction,
  productionModifiers,
  queueItemCost,
  queueItemName,
  settleProductionWindfall,
  turnsToBuild,
  unitProductionCost,
} from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { explainHappiness, happinessOf, tierPercent } from '../../src/sim/meters';
import { PROJECT_IDS, projectDef, projectRate } from '../../src/sim/projectData';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import {
  BUILDING_UNLOCK_TECH,
  PROJECT_UNLOCK_TECH,
  UNIT_UNLOCK_TECH,
  techDef,
} from '../../src/sim/techData';
import { buildError, gatingTech, isUnlocked } from '../../src/sim/tech';
import { techGifts } from '../../src/sim/techUnlocks';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openEveryWar } from './warHelpers';

// --- the bench --------------------------------------------------------------

/**
 * The rules module's own text, for the age band's sync test.
 *
 * Read through Vite's raw import rather than through `node:fs`, which is
 * `barbarians.test.ts`' reason said again: this project has no node typings and
 * one source assertion is not worth a dependency.
 */
const RULES_SOURCE = (
  import.meta.glob('../../src/sim/rulesData.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/rulesData.ts']!;

function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
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
  state.nextEntityId = 1;
  // Every pair of real seats declares (schema 56): a blow between two empires
  // at peace is refused, and this bench is not about the refusal. See
  // `test/sim/warHelpers.ts`.
  openEveryWar(state);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A city with every technology in the game, so no gate is in the way. */
function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

/** Hands a seat the four Age I nodes this pass hangs its content off. */
function knowEverything(state: GameState, playerId: number): void {
  const player = state.players[playerId]!;
  for (const tech of ['earthenware', 'calendar', 'letters', 'stonecraft', 'bronzeWorking'] as const) {
    if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  }
}

// --- 1. projects ------------------------------------------------------------

describe('a project is a queue row that never leaves', () => {
  it('completes without being spliced out, and is charged again next turn', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    const cost = projectDef('tithes').cost;

    // One completion: the hammers go, the gold arrives, the row stays.
    city.hammerBasket = cost;
    const before = state.players[0]!.gold;
    const done = settleProductionWindfall(state, city);
    expect(done?.name).toBe('Tithes');
    expect(city.queue).toEqual([{ kind: 'project', id: 'tithes' }]);
    expect(city.hammerBasket).toBe(0);
    expect(state.players[0]!.gold).toBe(before + projectDef('tithes').pays.gold!);

    // And again, from a fresh basket, with no re-queueing anywhere.
    city.hammerBasket = cost;
    expect(settleProductionWindfall(state, city)?.name).toBe('Tithes');
    expect(city.queue).toHaveLength(1);
    expect(state.players[0]!.gold).toBe(before + 2 * projectDef('tithes').pays.gold!);
  });

  it('banks Pageants’ culture through the basket’s own settlement', () => {
    // The third conversion (batch E, Code of Laws). Culture is a **basket**
    // rather than a bank, so `payProject` ends with `settleCultureWindfall` — the
    // one wrapper that pays that debt — which is the door `projectData.ts`'s
    // docblock left open rather than a second path into the pool.
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const player = state.players[0]!;
    city.queue = [{ kind: 'project', id: 'pageants' }];
    city.hammerBasket = projectDef('pageants').cost;
    const before = player.culturePool;
    expect(settleProductionWindfall(state, city)?.name).toBe('Pageants');
    expect(city.queue).toEqual([{ kind: 'project', id: 'pageants' }]);
    expect(player.culturePool).toBe(before + projectDef('pageants').pays.culture!);
    // Gold, science and faith are untouched: the row names one voice.
    expect(player.gold).toBe(0);
    expect(player.sciencePool).toBe(0);
    expect(player.faithPool).toBe(0);
  });

  it('holds when the basket is short, and never drops', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'scholarship' }];
    city.hammerBasket = projectDef('scholarship').cost - 1;

    expect(planProduction(state, city)).toBeNull();
    const before = state.players[0]!.sciencePool;
    advanceProduction(state);
    expect(city.queue).toHaveLength(1);
    expect(state.players[0]!.sciencePool).toBe(before);
    expect(city.hammerBasket).toBe(projectDef('scholarship').cost - 1);
  });

  it('keeps its remainder as the next conversion\'s down payment', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    const cost = projectDef('tithes').cost;

    // A very good turn: two conversions' worth in the basket. At most **one**
    // completes per call — the phase's rule, which a project does not escape —
    // and the change is kept.
    city.hammerBasket = cost * 2 + 3;
    advanceProduction(state);
    expect(city.hammerBasket).toBe(cost + 3);
    expect(state.players[0]!.gold).toBe(projectDef('tithes').pays.gold!);
    advanceProduction(state);
    expect(city.hammerBasket).toBe(3);
    expect(state.players[0]!.gold).toBe(2 * projectDef('tithes').pays.gold!);
  });

  it('pays the printed figure and nothing multiplies it', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'scholarship' }];

    // Entry XVIII.5's discipline, read for a conversion: the hammers were
    // already staged on their way into the basket (Entry XVII), so the payout
    // is immune to everything that stages a yield. Put the empire deep into a
    // happiness bonus — the empire-stage tier that multiplies science — and the
    // beakers must not move.
    // Asked of the **rung** rather than of the total, because the rung is what
    // multiplies a yield: a one-city empire clears the first bonus step by its
    // palace alone, and how far past the step it stands is a playtest lever
    // (the palace went 9 → 6 on 2026-09-03) rather than part of this claim.
    const contented = happinessOf(state, 0);
    expect(tierPercent(contented)).toBeGreaterThan(0);
    city.hammerBasket = projectDef('scholarship').cost;
    advanceProduction(state);
    expect(state.players[0]!.sciencePool).toBe(projectDef('scholarship').pays.science!);
  });

  it('carries no category bonus: a project is not a ProductionCategory', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.buildings.push('barracks');
    // The barracks pays toward units and only toward units. A project is not a
    // category a bonus may name, so the list is empty rather than matched.
    expect(productionModifiers(state, city, { kind: 'unit', id: 'warrior' })).toHaveLength(1);
    expect(productionModifiers(state, city, { kind: 'project', id: 'tithes' })).toEqual([]);
    const plain = cityYields(state, city).production;
    expect(cityYields(state, city, [], { kind: 'project', id: 'tithes' }).production).toBe(plain);
  });

  it('prices and estimates through the same two evaluators every row uses', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];

    const cost = queueItemCost(state, 0, city.queue[0]!)!;
    expect(cost).toBe(projectDef('tithes').cost);
    expect(queueItemName(city.queue[0]!)).toBe('Tithes');

    // `turnsToBuild` needs no project clause: the interval between payouts and
    // "how long until this completes" are the same question for a repeatable
    // item, and the front row is the one that counts the basket.
    const rate = cityYields(state, city, [], city.queue[0]).production;
    expect(rate).toBeGreaterThan(0);
    city.hammerBasket = 0;
    expect(turnsToBuild(state, city, city.queue[0]!, 0)).toBe(Math.ceil(cost / rate));
    city.hammerBasket = cost - rate;
    expect(turnsToBuild(state, city, city.queue[0]!, 0)).toBe(1);
    // A row behind the front is quoted at full price, project or not.
    expect(turnsToBuild(state, city, city.queue[0]!, 1)).toBe(Math.ceil(cost / rate));
  });

  it('is reached by a windfall exactly as a building is', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    // The preview half: what would this grant finish?
    const grant = projectDef('tithes').cost;
    expect(planProduction(state, city, city.hammerBasket + grant)?.kind).toBe('project');
  });
});

describe('a project is gated, once, by the tree', () => {
  it('names its technology and refuses a queue without it', () => {
    // Tithes went home to the Calendar with the age-1 restoration of
    // 2026-09-02 — it was Earthenware's only while the Calendar was pruned.
    expect(PROJECT_UNLOCK_TECH.get('tithes')).toBe('calendar');
    expect(PROJECT_UNLOCK_TECH.get('scholarship')).toBe('letters');
    // Every *conversion* is gated by the tree: one available on turn one is a
    // capital that never has to choose what to do with its hammers. A **race
    // project** is the deliberate exception — no technology names an endeavour,
    // and what gates it is the Bead Race (the card must be face up in its age's
    // hand, unclaimed, and the empire must meet its prerequisite), asked in
    // `isUnlocked`'s project arm exactly as the Gilded Hall's card gate is.
    for (const id of PROJECT_IDS) {
      if (projectDef(id).finishes === true) {
        expect(gatingTech('project', id), id).toBeNull();
        expect(isUnlocked(flatState(), 0, 'project', id), id).toBe(false);
        continue;
      }
      expect(gatingTech('project', id), id).not.toBeNull();
    }

    const state = flatState();
    const city = plant(state, 0, 5, 5);
    expect(isUnlocked(state, 0, 'project', 'tithes')).toBe(false);
    expect(buildError(state, 0, 'project', 'tithes')).toBe('Tithes needs Calendar');

    const refused = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'project', id: 'tithes' }],
    } as Command);
    expect(refused.ok).toBe(false);

    state.players[0]!.techsResearched.push('calendar');
    expect(buildError(state, 0, 'project', 'tithes')).toBeNull();
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [{ kind: 'project', id: 'tithes' }],
      } as Command).ok,
    ).toBe(true);
    expect(city.queue).toEqual([{ kind: 'project', id: 'tithes' }]);
  });

  it('refuses the same project twice: the second copy could never be reached', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const refused = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [
        { kind: 'project', id: 'tithes' },
        { kind: 'project', id: 'tithes' },
      ],
    } as Command);
    expect(refused.ok).toBe(false);
    expect(city.queue).toEqual([]);
    // Two *different* projects are fine — the second is simply never reached
    // while the first stands, which is the player's own arrangement.
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [
          { kind: 'project', id: 'tithes' },
          { kind: 'project', id: 'scholarship' },
        ],
      } as Command).ok,
    ).toBe(true);
  });

  it('rejects an unknown project id without touching the state', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const before = JSON.stringify(state);
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [{ kind: 'project', id: 'alchemy' }],
      } as unknown as Command).ok,
    ).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('shows up on its tech\'s gift list, as its own kind', () => {
    const tithes = techGifts('calendar').filter((gift) => gift.kind === 'project');
    expect(tithes.map((gift) => gift.id)).toEqual(['tithes']);
    expect(tithes[0]).toMatchObject({ name: 'Tithes', glyph: '↻' });
    // Two buildings on Letters since the wonders' roster: the library, and the
    // Great Ziggurat standing on the same node — a wonder is an ordinary
    // `unlocks.buildings` entry, which is the whole of how it is homed. The
    // rites moved to Divination with the re-cut of 2026-09-02, so scholarship
    // was the last thing the node handed over until deals arrived (schema 57):
    // Writing now also hands over the *verb* two empires need to write a right
    // of way into a bargain, which is an `ability` gift like embarkation's.
    expect(techGifts('letters').map((gift) => gift.kind)).toEqual([
      'building',
      'building',
      'project',
      'ability',
    ]);
  });

  it('states its rate in one place', () => {
    // The label the panel and the star chart both print, so a retuned cost
    // cannot leave a stale sentence behind it.
    const glyphs = { gold: 'G', science: 'S', faith: 'F', culture: 'C' };
    expect(projectRate('tithes', glyphs)).toBe('5G');
    expect(projectRate('scholarship', glyphs)).toBe('5S');
    expect(projectRate('pageants', glyphs)).toBe('5C');
    // The rate the design ratified: four hammers to the coin.
    expect(projectDef('tithes').cost / projectDef('tithes').pays.gold!).toBe(4);
    expect(projectDef('scholarship').cost / projectDef('scholarship').pays.science!).toBe(4);
    // The third conversion trades at the same rate as its two siblings (batch E,
    // `docs/history/tech-gifts.md` §7 — Code of Laws' pageants).
    expect(projectDef('pageants').cost / projectDef('pageants').pays.culture!).toBe(4);
  });
});

// --- 2. what a unit costs ---------------------------------------------------

describe('the roster is priced in the money of its own age', () => {
  it('multiplies a unit by the band of the technology that unlocks it', () => {
    const state = flatState();
    // One factor per Æra since H11 (2026-09-07, `docs/flags.md` item aa — the
    // user's own curve, 1.25 · 2.5 · 4.5 · 8.5), and **Æra I is inside the rule**
    // rather than exempt at ×1, which H10 settled a day earlier. The band used
    // to be a four-entry authored ladder that only units read; it is a
    // four-entry authored table again, asked of every hammer price.
    const band = RULES.production.costAgeBand;
    expect(band).toHaveLength(4);
    for (const factor of band) expect(factor).toBeGreaterThan(1);
    for (const id of UNIT_TYPE_IDS) {
      // A great person is neither built nor bought, so it is not priced in
      // hammers at all — see `tech.test.ts`'s reading of the same exception.
      if (unitDef(id).greatWork === true) continue;
      // And the Æra V hulls, which shipped ahead of the age that opens them
      // (`UnitDef.awaitsTech`, temporary by construction): no technology names
      // them, `buildError` and `purchaseError` refuse them outright, and the
      // tree pass deletes the marker from three rows and adds them to a node.
      if (unitDef(id).awaitsTech === true) continue;
      const gate = UNIT_UNLOCK_TECH.get(id);
      // Every unit in the roster is gated; an ungated one would take band 1.
      expect(gate, id).toBeDefined();
      const age = techDef(gate!).age;
      expect(unitProductionCost(state, 0, id), id).toBe(
        Math.floor(unitDef(id).cost * band[age - 1]!),
      );
    }
  });

  it('prices the opening in its own money and lifts the later rosters', () => {
    const state = flatState();
    // **Re-aimed 2026-09-06** (`docs/flags.md`, rulings "late — early
    // production", item y: "production costs ×1.25 across the board, and rising
    // by age"). The title of this case used to be "leaves Age I where the
    // opening is balanced", and that clause is the thing the ruling withdrew:
    // Æra I paid ×1 while every later age paid a band, and the user's reading
    // after the second playthrough was that hammers had stopped meaning
    // anything by Æra III. So the opening lifts a quarter with everything else.
    //
    // The printed `cost` on each row is untouched — this is the fold's second
    // line, the era's entry in `costAgeBand`, floored once. **H11 (2026-09-07,
    // item aa) left every figure in the Æra I block below exactly where H10 put
    // it** and moved the later blocks: the ruling was "4–5× what they are now in
    // age 4 only", drawn out as 1.25 · 2.5 · 4.5 · 8.5.
    expect(unitProductionCost(state, 0, 'scout')).toBe(16);
    expect(unitProductionCost(state, 0, 'warrior')).toBe(12);
    expect(unitProductionCost(state, 0, 'worker')).toBe(17);
    expect(unitProductionCost(state, 0, 'spearman')).toBe(13);
    expect(unitProductionCost(state, 0, 'archer')).toBe(13);
    // The mounted premium, which is the earlier pass's own half: a horse is a
    // decision arrived at sooner and priced like one. The chariot is still Æra
    // I's (The Wheel); **the horseman is Æra III's** since tree revision 4
    // (2026-09-02) gave it to The Saddle, so its printed 17 carries the third
    // power — the band is read off the unlocking node and nothing on the row
    // changed.
    expect(unitProductionCost(state, 0, 'horseman')).toBe(76);
    expect(unitProductionCost(state, 0, 'chariot')).toBe(30);
    expect(unitProductionCost(state, 0, 'chariotArcher')).toBe(25);
    // Æra II at ×2.5, III at ×4.5, IV at ×8.5 (H11). The curve is the user's,
    // and it is steep on purpose: a closing-age unit costs three and a half
    // times what H10's power asked and about four times the live build the
    // complaint was about, while the opening age is untouched.
    //
    // The re-cut of 2026-09-02 moved rows between ages, so these figures carry
    // that too: the swordsman is Æra II's (Bronze Panoply) rather than Æra
    // III's, the Bowman is new at Siegecraft, and the pikeman is Castellany's in
    // Æra IV rather than the Æra III spear it used to be.
    expect(unitProductionCost(state, 0, 'phalanx')).toBe(35);
    expect(unitProductionCost(state, 0, 'swordsman')).toBe(35);
    expect(unitProductionCost(state, 0, 'bowman')).toBe(35);
    expect(unitProductionCost(state, 0, 'catapult')).toBe(67);
    expect(unitProductionCost(state, 0, 'pikeman')).toBe(178);
    expect(unitProductionCost(state, 0, 'knight')).toBe(187);
    expect(unitProductionCost(state, 0, 'trebuchet')).toBe(204);
  });

  it('is the fold of its own labelled lines, escalation included', () => {
    const state = flatState();
    for (const id of UNIT_TYPE_IDS) {
      expect(foldUnitCost(explainUnitCost(state, 0, id)), id).toBe(
        unitProductionCost(state, 0, id),
      );
    }
    // The settler's whole ladder, line by line. **The band's line is there now**
    // (H10, item y): a settler is Æra I and Æra I is ×1.25, where it used to
    // multiply by one and print no line at all.
    const settler = explainUnitCost(state, 0, 'settler');
    expect(settler.map((line) => line.source)).toEqual(['Settler', 'Age band · Æra I ×1.25']);
    expect(settler[0]!.amount).toBe(unitDef('settler').cost);
    state.players[0]!.unitsBuilt.settler = 3;
    const escalated = explainUnitCost(state, 0, 'settler');
    expect(escalated.map((line) => line.source)).toEqual([
      'Settler',
      '3 already built',
      'Age band · Æra I ×1.25',
    ]);
    // The band multiplies the *escalated* figure, which is the order the lines
    // are printed in and therefore the order the arithmetic runs in.
    expect(foldUnitCost(escalated)).toBe(
      Math.floor(
        (unitDef('settler').cost + 3 * unitDef('settler').escalation!) *
          RULES.production.costAgeBand[0]!,
      ),
    );
    // And a later-age unit says which band it is in — one line, whatever the
    // table says (H11: the era's factor prints, never the designer's
    // arithmetic).
    expect(explainUnitCost(state, 0, 'knight').map((line) => line.source)).toEqual([
      'Knight',
      'Age band · Æra IV ×8.5',
    ]);
  });

  it('leaves a non-escalating type immovable by the settler ladder', () => {
    const state = flatState();
    for (const id of UNIT_TYPE_IDS) {
      if (unitDef(id).escalation !== undefined) continue;
      const priced = unitProductionCost(state, 0, id);
      state.players[0]!.unitsBuilt.settler = 9;
      expect(unitProductionCost(state, 0, id), id).toBe(priced);
      state.players[0]!.unitsBuilt.settler = 0;
    }
  });
});

// --- 2b. what a building costs ----------------------------------------------

/**
 * **One rule for every hammer price** (the user, 2026-09-06, `docs/flags.md`
 * rulings "late — early production", item y: "my cities had way more production
 * than things cost by age 3 … Age 3 buildings and units should probably be ~2×
 * as expensive").
 *
 * The band above priced the roster and nothing else, which is the asymmetry the
 * ruling named: a late empire paid twice over for its army and the printed base
 * for every building and every wonder it could raise, so hammers stopped meaning
 * anything by Æra III. `explainBuildingCost` is the unit fold's shape one grade
 * over — the row's figure, then the band, floored once — and it takes no player,
 * because nothing an empire does changes what a building costs to *build*.
 */
describe('a building is priced in the money of its own age', () => {
  it('is the fold of its own labelled lines, for every row in the table', () => {
    for (const id of BUILDING_IDS) {
      expect(foldUnitCost(explainBuildingCost(id)), id).toBe(buildingProductionCost(id));
    }
  });

  it('multiplies by the band of the technology that unlocks it', () => {
    const band = RULES.production.costAgeBand;
    for (const id of BUILDING_IDS) {
      const gate = BUILDING_UNLOCK_TECH.get(id);
      // A row no technology unlocks is Æra I — the granted and the
      // card-unlocked rows are priced in the opening's money rather than free
      // of the rule.
      const age = gate === undefined ? 1 : techDef(gate).age;
      expect(buildingProductionCost(id), id).toBe(
        Math.floor(buildingDef(id).cost * band[age - 1]!),
      );
    }
  });

  it('carries the four figures the ruling names, and the doc that mirrors them', () => {
    // The band is a **table the user tunes** since H11 (2026-09-07, item aa:
    // "the curve needs to be fairly exponential"), so the spec of record is four
    // numbers rather than a rule — and a table that mirrors data carries a sync
    // test. Three witnesses in one: the data row, the docblock on
    // `ProductionRules.costAgeBand` that prints the same table for whoever tunes
    // it, and the ruling's own worked examples.
    expect(RULES.production.costAgeBand).toEqual([1.25, 2.5, 4.5, 8.5]);
    expect(RULES_SOURCE).toContain('| ×1.25 | ×2.5 | ×4.5 | ×8.5 |');
    // The four rows the user priced by hand when the curve was drawn.
    expect(buildingProductionCost('library')).toBe(35);
    expect(buildingProductionCost('market')).toBe(147);
    expect(buildingProductionCost('workshop')).toBe(310);
    expect(buildingProductionCost('university')).toBe(1139);
  });
  it('names the band on its own line, wonders included', () => {
    // The Æra I row: two lines, and the second is the band — where before this
    // ruling an Æra I row had one line and no band at all.
    expect(explainBuildingCost('granary').map((line) => line.source)).toEqual([
      buildingDef('granary').name,
      'Age band · Æra I ×1.25',
    ]);
    expect(buildingProductionCost('granary')).toBe(Math.floor(buildingDef('granary').cost * 1.25));
    // A wonder is a building row and takes the same rule: `wonder` is a
    // production category, never a pricing exception.
    const wonder = BUILDING_IDS.find((id) => isWonder(id) && BUILDING_UNLOCK_TECH.has(id))!;
    expect(explainBuildingCost(wonder)).toHaveLength(2);
    expect(explainBuildingCost(wonder)[1]!.source).toContain('Age band');
  });

  it('is what the basket is charged and what the queue is quoted', () => {
    // The one evaluator, asked the three ways the game asks it: the queue's
    // quote, the plan the phase settles off, and the basket after it lands.
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    const cost = buildingProductionCost('monument');
    city.queue = [{ kind: 'building', id: 'monument' }];
    expect(queueItemCost(state, 0, city.queue[0]!)).toBe(cost);
    city.hammerBasket = cost - 1;
    expect(planProduction(state, city, city.hammerBasket)).toBeNull();
    city.hammerBasket = cost + 5;
    expect(planProduction(state, city, city.hammerBasket)).toMatchObject({ id: 'monument', cost });
    advanceProduction(state);
    expect(city.buildings).toEqual(['monument']);
    expect(city.hammerBasket).toBe(5);
  });

  it('leaves a project flat, because a conversion is not a thing', () => {
    // The one row the band deliberately does not touch: a project's cost is the
    // size of one turn of the conversion, and it is charged again the moment it
    // is paid. See `queueItemCost`.
    const state = flatState();
    plant(state, 0, 8, 5);
    for (const id of PROJECT_IDS) {
      expect(queueItemCost(state, 0, { kind: 'project', id }), id).toBe(projectDef(id).cost);
    }
  });
});

// --- 2c. what a unique costs an empire of its size --------------------------

/**
 * **The once-per-empire rows scale in cost with the realm** (the user,
 * 2026-09-07, `docs/flags.md` item dd: "the once-per-empire buildings scale in
 * COST with the number of cities, not in effect"). One more line in the fold,
 * `√(cities ÷ uniqueCostBreakeven)`, after the age band and floored with it.
 *
 * The shape of the pin is the ruling's own reading: a unique at one, four and
 * nine cities costs a half, the whole and one and a half of its banded price,
 * and no ordinary row ever carries the line at all.
 */
describe('a unique is priced against the empire it will serve', () => {
  const UNIQUE = BUILDING_IDS.find((id) => buildingDef(id).oncePerEmpire === true)!;

  /** A seat holding exactly `count` cities, far enough apart to found. */
  function empireOf(count: number): GameState {
    const state = flatState(24, 20);
    for (let i = 0; i < count; i++) plant(state, 0, 2 + (i % 5) * 4, 2 + Math.floor(i / 5) * 5);
    expect(state.cities.filter((city) => city.ownerId === 0)).toHaveLength(count);
    return state;
  }

  it('halves it for one city, prints the banded figure at the breakeven, and climbs', () => {
    const breakeven = RULES.production.uniqueCostBreakeven;
    expect(breakeven).toBe(4);
    // The context-less asking IS the breakeven reading, which is what the
    // Compendium prints — so it is also the figure the ratios below are of.
    const banded = buildingProductionCost(UNIQUE);
    expect(banded).toBe(buildingProductionCost(UNIQUE, empireOf(breakeven), 0));
    expect(buildingProductionCost(UNIQUE, empireOf(1), 0)).toBe(Math.floor(banded * 0.5));
    expect(buildingProductionCost(UNIQUE, empireOf(9), 0)).toBe(Math.floor(banded * 1.5));
  });

  it('names the empire on its own line, and folds to the price', () => {
    const state = empireOf(9);
    const lines = explainBuildingCost(UNIQUE, state, 0);
    expect(lines.map((line) => line.source)).toEqual([
      buildingDef(UNIQUE).name,
      expect.stringContaining('Age band'),
      'Empire of 9 cities ×1.50',
    ]);
    expect(foldUnitCost(lines)).toBe(buildingProductionCost(UNIQUE, state, 0));
  });

  it('never touches a row that is not one of a kind', () => {
    const state = empireOf(9);
    for (const id of BUILDING_IDS) {
      if (buildingDef(id).oncePerEmpire === true) continue;
      expect(buildingProductionCost(id, state, 0), id).toBe(buildingProductionCost(id));
      for (const line of explainBuildingCost(id, state, 0)) {
        expect(line.source, id).not.toContain('Empire of');
      }
    }
  });

  it('is the price the queue quotes and the basket is charged', () => {
    // The seam that matters: `queueItemCost` carries the owner through, so a
    // one-city seat is quoted the half price and charged it.
    const state = empireOf(1);
    const city = state.cities[0]!;
    city.queue = [{ kind: 'building', id: UNIQUE }];
    const cost = buildingProductionCost(UNIQUE, state, 0);
    expect(queueItemCost(state, 0, city.queue[0]!)).toBe(cost);
    expect(cost).toBeLessThan(buildingProductionCost(UNIQUE));
  });
});

// --- 3. the two Age I building sinks ---------------------------------------

describe('the funeral games pay a meter, generically', () => {
  it('folds into the happiness ledger as its own line', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const before = happinessOf(state, 0);

    city.buildings.push('funeralGames');
    const supplied = buildingDef('funeralGames').happiness!;
    expect(supplied).toBe(3);
    expect(happinessOf(state, 0)).toBe(before + supplied);

    // The line, and the fold identity the meter is built on: the total is the
    // sum of the list and there is no second arithmetic beside it.
    const list = explainHappiness(state, 0);
    const line = list.find((entry) => entry.source === `${city.name} · Funeral Games`);
    expect(line).toEqual({ source: `${city.name} · Funeral Games`, part: 'gain', value: 3 });
    expect(buildingHappiness(state, 0)).toEqual([
      { source: `${city.name} · Funeral Games`, amount: 3 },
    ]);
  });

  it('pays the empire that holds the town, and stops when it does not', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.buildings.push('funeralGames');
    expect(buildingHappiness(state, 0)).toHaveLength(1);
    expect(buildingHappiness(state, 1)).toEqual([]);
    city.ownerId = 1;
    expect(buildingHappiness(state, 0)).toEqual([]);
    expect(buildingHappiness(state, 1)).toHaveLength(1);
  });
});

describe('the palisade is a wall the town built', () => {
  it('joins the forecast beside the walls a card would raise', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const attacker = createUnit(state, 1, 'warrior', 5, 6);

    const bare = previewCombat(state, attacker.id, { col: 5, row: 5 });
    if (!bare.ok) throw new Error(bare.error);
    city.buildings.push('palisade');
    const walled = previewCombat(state, attacker.id, { col: 5, row: 5 });
    if (!walled.ok) throw new Error(walled.error);

    const added = buildingDef('palisade').cityStat!.amount;
    expect(added).toBe(5);
    expect(walled.defenderStrength).toBe(bare.defenderStrength + added);
    // A list, never a number: "+5" beside the walls with no reason is exactly
    // what a breakdown exists to prevent.
    expect(walled.defenderLines).toContainEqual({ source: 'Palisade', amount: added });
    expect(buildingCityStat(city, 'defense')).toEqual([{ source: 'Palisade', amount: added }]);
    expect(foldBuildingCityStat(buildingCityStat(city, 'defense'))).toBe(added);
    // And it says nothing about sight, which is the other half of the shape.
    expect(buildingCityStat(city, 'sight')).toEqual([]);
  });

  it('is handed over by Stonecraft, on the same list the monument is', () => {
    // The wonders homed on each node are on the same list and after the
    // ordinary rows, because that is the order `unlocks.buildings` carries.
    const gifts = techGifts('stonecraft').filter((gift) => gift.kind === 'building');
    expect(gifts.map((gift) => gift.id)).toEqual([
      'monument',
      'palisade',
      'stonehenge',
      'pyramids',
    ]);
    const games = techGifts('bronzeWorking').filter((gift) => gift.kind === 'building');
    // The Funeral Games left this list on 2026-09-07: batch D retired the row,
    // and `techGifts` reads the live lists now — a retired row is not a gift
    // (the row itself stays, and its cost is still pinned below).
    expect(games.map((gift) => gift.id)).toEqual(['barracks', 'wallsOfUruk']);
  });

  it('costs what an Age I sink should: a real decision against a settler', () => {
    // Re-pinned 2026-08-28: every non-wonder building's `cost` rose ×1.4.
    expect(buildingDef('palisade').cost).toBe(42);
    expect(buildingDef('funeralGames').cost).toBe(49);
    // Both dearer than the opening settler, which is the point of a sink: it is
    // the thing a town does when expansion is no longer the obvious answer.
    expect(buildingDef('palisade').cost).toBeGreaterThan(unitDef('settler').cost);
  });
});

// --- 4. the measurements ----------------------------------------------------

describe('what the pass did to the opening', () => {
  it('leaves what ground is worth untouched: this was a price pass', () => {
    // The other half of "the opening did not move": nothing here touched what
    // ground is worth, so a city centre pays exactly what it paid.
    const state = flatState();
    const city = plant(state, 0, 5, 5);
    expect(centreYield(state, city).production).toBe(RULES.cities.baseCityYields.production);
  });
});

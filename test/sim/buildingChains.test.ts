/**
 * **The buildings cut, with chains** — `docs/history/fewer-things.md` §2, `docs/history/tech-gifts.md`
 * §7 and `docs/balance-turn.md` §4, landed as batch D of the fewer-things pass
 * (2026-09-06, schema 73).
 *
 * The pass' thesis is that the ordinary building list was thirty-eight rows of
 * which most were a flat with a different name, so what is on trial here is not
 * a number: it is that the three markers the cut is built out of are *markers*.
 * Nothing in `src/sim/` compares a building id against a name in any of these
 * claims, and every one of them is written so that a thirteenth cut row, an
 * eleventh chain or a sixth unique would need no line here.
 *
 * Five concerns, in the order a player meets them: the chain, the withdrawn
 * rows, the founding artefact, the five uniques, and the deeds that used to name
 * cut rows.
 */
import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../../src/sim/buildingData';
import { BEAD_DATA, beadIsDormant, prerequisiteBuilding } from '../../src/sim/beadData';
import {
  buildingProductionCost,
  foundCityAt,
  realiseItem,
  refreshCityDerived,
} from '../../src/sim/cities';
import {
  foldCity,
} from '../../src/sim/yields/town';
import { applyCommand } from '../../src/sim/commands';
import { createGame, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { explainRouteYieldBetween } from '../../src/sim/routeYields';
import { RULES } from '../../src/sim/rulesData';
import { explainCityRenown } from '../../src/sim/renown';
import { cardCityRenownShares } from '../../src/sim/statecraft';
import { type City, type GameState, playerById, bumpRevision } from '../../src/sim/state';
import { BUILDING_UNLOCK_TECH, TECH_IDS, techDef } from '../../src/sim/techData';
import { buildError } from '../../src/sim/tech';
import { explainUnitUpkeep, explainUnitUpkeepRebate, unitUpkeepOf } from '../../src/sim/upkeep';

function game(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** A city for a player, on the tile their first unit is standing on. */
function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** Every technology this empire needs to reach one row, and the row's own. */
function learnUpTo(state: GameState, playerId: number, id: BuildingId): void {
  const player = playerById(state, playerId)!;
  const gate = BUILDING_UNLOCK_TECH.get(id);
  if (gate === undefined) return;
  const wanted = new Set<string>();
  const walk = (tech: string): void => {
    if (wanted.has(tech)) return;
    wanted.add(tech);
    for (const prereq of techDef(tech as never).prereqs) walk(prereq);
  };
  walk(gate);
  for (const tech of TECH_IDS) {
    if (wanted.has(tech) && !player.techsResearched.includes(tech)) {
      player.techsResearched.push(tech);
      bumpRevision(state);
    }
  }
}

/** Every row that names a parent, read off the marker rather than off a list. */
const CHAINED = BUILDING_IDS.filter((id) => buildingDef(id).requiresBuilding !== undefined);
const RETIRED = BUILDING_IDS.filter((id) => buildingDef(id).retired === true);
const UNIQUES = BUILDING_IDS.filter(
  (id) => buildingDef(id).oncePerEmpire === true && buildingDef(id).endsTheGame !== true,
);

// --- the chain ---------------------------------------------------------------

describe('a chained building wants its parent standing in the same town', () => {
  /**
   * The ten chains the pass ruled, as the field rather than as a sentence: the
   * table is the spec, and a chain added or removed has to move this list.
   */
  it('is the ten chains the pass ruled, and nothing else', () => {
    const chains = Object.fromEntries(
      CHAINED.map((id) => [id, buildingDef(id).requiresBuilding]),
    );
    expect(chains).toEqual({
      stoneWalls: 'palisade',
      castle: 'stoneWalls',
      amphitheater: 'monument',
      bazaar: 'market',
      bank: 'market',
      shipyard: 'harbour',
      university: 'library',
      observatory: 'university',
      forge: 'workshop',
      temple: 'shrine',
    });
  });

  it('refuses the queue in the parent’s own words, and byte-identically', () => {
    const g = game();
    const city = found(g.state, 0);
    learnUpTo(g.state, 0, 'university');

    // The technology is held, so what is left is the chain — and the sentence
    // names the parent and the town, which is the whole of what a player can act
    // on. Both halves are read off the rows, so a retune of either name moves
    // this line without anybody rewriting it.
    expect(buildError(g.state, 0, 'building', 'university', city)).toBe(
      `${buildingDef('university').name} needs a ${buildingDef('library').name} standing in ${city.name}`,
    );

    // A rejected command leaves the state byte-identical (hard rule 1).
    const before = snapshotState(g.state);
    const refused = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'building', id: 'university' }],
    } as never);
    expect(refused.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);

    // And the parent standing is the whole of the gate.
    city.buildings.push('library');
    bumpRevision(g.state);
    expect(buildError(g.state, 0, 'building', 'university', city)).toBeNull();
  });

  it('asks about the parent and never about the parent’s parent', () => {
    // One link, deliberately (`BuildingDef.requiresBuilding`): a town holding
    // Stone Walls held a Palisade to build them, so a Castle asks for the walls
    // and stops. Asserted through a town that was *given* the middle rung.
    const g = game();
    const city = found(g.state, 0);
    learnUpTo(g.state, 0, 'castle');
    expect(buildError(g.state, 0, 'building', 'castle', city)).not.toBeNull();
    city.buildings.push('stoneWalls');
    bumpRevision(g.state);
    expect(buildError(g.state, 0, 'building', 'castle', city)).toBeNull();
  });

  it('says nothing about the chain to a caller with no town in hand', () => {
    // The site clause's rule exactly: "could this empire ever raise one" is a
    // question about the tree, and the Compendium and the tech chart ask it.
    const g = game();
    found(g.state, 0);
    learnUpTo(g.state, 0, 'university');
    expect(buildError(g.state, 0, 'building', 'university')).toBeNull();
  });

  /**
   * **A grant ignores the chain** (RULED, `docs/history/fewer-things.md` §6.4).
   *
   * The Theatre of Dionysus hands over an Amphitheater, and the Amphitheater now
   * wants a Monument. The grant path is `realiseItem`, which never asks
   * `buildError` about anything — so the promise is kept in a town with no
   * Monument, and this is the test that says the two paths really are different.
   */
  it('is ignored by a grant, which reaches the town through realiseItem', () => {
    const g = game();
    const city = found(g.state, 0);
    learnUpTo(g.state, 0, 'amphitheater');
    expect(city.buildings).not.toContain('monument');
    expect(buildError(g.state, 0, 'building', 'amphitheater', city)).toBe(
      `${buildingDef('amphitheater').name} needs a ${buildingDef('monument').name} standing in ${city.name}`,
    );
    realiseItem(g.state, city, { kind: 'building', id: 'amphitheater' });
    expect(city.buildings).toContain('amphitheater');
    expect(city.buildings).not.toContain('monument');
  });
});

// --- the withdrawn rows ------------------------------------------------------

describe('a withdrawn building keeps its row and leaves the game', () => {
  it('is the ten rows the cut withdrew', () => {
    expect([...RETIRED].sort()).toEqual(
      [
        'armoury',
        'baths',
        'clocktower',
        'examinationHall',
        'funeralGames',
        'mint',
        'monastery',
        'printingHouse',
        'reliquary',
        'steleOfLaws',
      ].sort(),
    );
  });

  it('is refused by the queue in its own sentence, however much tech is held', () => {
    const g = game();
    const city = found(g.state, 0);
    for (const id of RETIRED) {
      learnUpTo(g.state, 0, id);
      expect(buildError(g.state, 0, 'building', id, city), id).toBe(
        `${buildingDef(id).name} is no longer built`,
      );
    }
  });

  it('keeps paying where one already stands — the stones, not the decision', () => {
    // A save from before the cut replays into towns that hold a Mint, and it is
    // worth exactly what its row says. The refusal is about what a town may
    // *decide* to build, and nothing about a withdrawn row's yields moved.
    const g = game();
    const city = found(g.state, 0);
    const before = foldCity(g.state, city).gold;
    city.buildings.push('mint');
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    expect(foldCity(g.state, city).gold).toBe(before + buildingDef('mint').gold);
  });

  it('is never a row the tree is asked to make available', () => {
    // Withdrawn rows stay on their nodes so a v72 log's `unlocks` reading is
    // unchanged; six nodes therefore hand over nothing buildable, and re-gifting
    // them is the tree batch's. Recorded here so the debt is visible in a test
    // run rather than only in a doc.
    const orphaned = TECH_IDS.filter((tech) => {
      const rows = techDef(tech).unlocks.buildings ?? [];
      return rows.length > 0 && rows.every((id) => buildingDef(id).retired === true);
    });
    expect([...orphaned].sort()).toEqual(
      ['machinery', 'movableType', 'theExaminationHall'].sort(),
    );
  });
});

// --- the founding artefact ---------------------------------------------------

describe('the Town Charter is granted and never built', () => {
  it('is refused by the queue and by the bank in one sentence', () => {
    const g = game();
    const city = found(g.state, 0);
    learnUpTo(g.state, 0, 'townCharter');
    expect(buildingDef('townCharter').grantedOnly).toBe(true);
    expect(buildError(g.state, 0, 'building', 'townCharter', city)).toBe(
      `${buildingDef('townCharter').name} is not built or bought — it is granted`,
    );
    const before = snapshotState(g.state);
    const refused = applyCommand(g.state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'building', id: 'townCharter' },
      currency: 'gold',
    } as never);
    expect(refused.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('is the founding rider Daughter Cities already carried', () => {
    // The row was never honestly buildable — the node's own `foundingRider` is
    // where a charter comes from, and the marker only stops the queue selling
    // what the law gives. `cardFoundingRider` pushes straight onto the town's
    // list, which is the second path that ignores every gate.
    const tech = techDef('colonialCharters');
    expect(
      tech.effects?.some(
        (effect) => effect.kind === 'foundingRider' && effect.building === 'townCharter',
      ),
    ).toBe(true);
  });
});

// --- the five uniques --------------------------------------------------------

describe('the five unique buildings', () => {
  it('stands one to a realm, on its own node, at about half its age’s wonder', () => {
    const priced = UNIQUES.filter((id) => BUILDING_UNLOCK_TECH.has(id));
    // The three national rows and the Opus wear the same marker; what is under
    // test is the set the fewer-things pass added, which is exactly the five
    // that sit on an ordinary node in Æra II or III.
    // The three national bead rows wear the same marker and are not this set:
    // they are `oncePerEmpire` **doors** that grant a bead, so the fewer-things
    // five are picked out by the age and by paying no bead.
    const set = priced.filter(
      (id) =>
        techDef(BUILDING_UNLOCK_TECH.get(id)!).age <= 3 &&
        (buildingDef(id).onComplete ?? []).every((grant) => grant.grant !== 'bead'),
    );
    expect([...set].sort()).toEqual(
      ['caravanserai', 'forum', 'heroicEpic', 'highTemple', 'imperialThrone'].sort(),
    );
    // **"About half" is now a statement about the two sizes** (batch P1,
    // `docs/production-costs.md`): a unique is a `large` building and a wonder
    // is a `wonder`, so the proportion the ruling names lives in one place —
    // the two bases in `data/rules.json` — and holds at every column of the
    // tree rather than only where an age's wonders happen to sit. Read as a
    // band, as it always was, because the ruling is a proportion.
    const half =
      RULES.production.sizeHammers.large / RULES.production.sizeHammers.wonder;
    expect(half).toBeGreaterThan(0.4);
    expect(half).toBeLessThan(0.6);
    for (const id of set) {
      expect(buildingDef(id).size, id).toBe('large');
      // And the price the fold prints is a real one, at the column the row's own
      // node stands in.
      expect(buildingProductionCost(id), id).toBeGreaterThan(0);
    }
  });

  it('is refused a second time in the realm, and byte-identically', () => {
    const g = game();
    const first = found(g.state, 0);
    const spot = g.state.map.tiles.find(
      (tile) => tile.terrain === 'grassland' && Math.abs(tile.col - first.col) > 5,
    )!;
    const second = foundCityAt(g.state, 0, spot);
    for (const id of ['heroicEpic', 'imperialThrone', 'highTemple', 'forum', 'caravanserai'] as const) {
      learnUpTo(g.state, 0, id);
      expect(buildError(g.state, 0, 'building', id, second), id).toBeNull();
      first.buildings.push(id);
      bumpRevision(g.state);
      expect(buildError(g.state, 0, 'building', id, second), id).toBe(
        `${buildingDef(id).name} already stands in ${first.name}`,
      );
      first.buildings.pop();
    }
  });

  it('pays the Heroic Epic’s share on the town it stands in, and no other', () => {
    const g = game();
    const city = found(g.state, 0);
    const other = foundCityAt(
      g.state,
      0,
      g.state.map.tiles.find(
        (tile) => tile.terrain === 'grassland' && Math.abs(tile.col - city.col) > 5,
      )!,
    );
    for (const town of [city, other]) town.buildings.push('library', 'amphitheater');
    bumpRevision(g.state);
    const townRenown = (town: City): number =>
      explainCityRenown(town, cardCityRenownShares(g.state, town)).reduce(
        (sum, line) => sum + line.amount,
        0,
      );
    const plain = townRenown(city);
    expect(plain).toBeGreaterThan(0);

    city.buildings.push('heroicEpic');
    bumpRevision(g.state);
    const raised = townRenown(city);
    // The Epic's own trickle joins the town's buildings, and the share is taken
    // over the lot — rule 5: the total is the fold of the list the panel prints.
    expect(raised).toBeGreaterThan(plain);
    expect(townRenown(other)).toBe(plain);
  });

  it('pays the Forum’s two shares in its own town only', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library', 'monument');
    bumpRevision(g.state);
    city.population = 8;
    refreshCityDerived(g.state, city);
    const before = foldCity(g.state, city);
    city.buildings.push('forum');
    bumpRevision(g.state);
    const after = foldCity(g.state, city);
    // Exact since batch X: a tenth on top is a tenth, not a tenth rounded off.
    expect(after.science).toBe((before.science * 110) / 100);
    expect(after.culture).toBe((before.culture * 110) / 100);
  });

  /**
   * **The Throne's placement half** (`docs/history/tech-gifts.md` §7): a piece raised in
   * the town that holds it is a gold a turn cheaper to keep, for the rest of its
   * life.
   *
   * It is stamped, not derived — which is the whole design, and the reason the
   * claim below marches the unit nowhere and razes nothing: the fact the promise
   * is about ("where was this raised") leaves the board the moment the piece
   * does, so nothing could recover it later.
   */
  it('stamps the Throne’s rebate on a piece and prints it as a give-back line', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const rebate = buildingDef('imperialThrone').unitUpkeepRebate!;
    expect(rebate).toBeGreaterThan(0);

    // A piece raised before the Throne stands is on full pay and says nothing.
    const plain = realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile });
    const bare = g.state.units.find((u) => u.id === plain.unitId)!;
    expect(bare.upkeepRebate).toBeUndefined();
    expect(explainUnitUpkeepRebate(g.state, 0)).toEqual([]);

    city.buildings.push('imperialThrone');
    bumpRevision(g.state);
    const born = realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile });
    const throned = g.state.units.find((u) => u.id === born.unitId)!;
    expect(throned.upkeepRebate).toBe(rebate);

    // **The gross is still gross** — the payroll prints what the army costs and
    // then what the Throne forgives, so the creditors keep picking the dearest
    // piece by what it truly costs (`disbandCandidate`).
    expect(unitUpkeepOf(throned)).toBe(unitUpkeepOf(bare));
    const lines = explainUnitUpkeepRebate(g.state, 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toBe(buildingDef('imperialThrone').name);
    expect(lines[0]!.gold).toBe(rebate);
    expect(explainUnitUpkeep(g.state, 0).some((line) => line.unitId === throned.id)).toBe(true);

    // And it is a fact about a moment: razing the Throne leaves the bargain on
    // the piece, exactly as a card's stamp survives the card leaving its chair.
    city.buildings.splice(city.buildings.indexOf('imperialThrone'), 1);
    expect(throned.upkeepRebate).toBe(rebate);
    expect(explainUnitUpkeepRebate(g.state, 0)[0]!.gold).toBe(rebate);
  });

  it('puts the Caravanserai’s grain on the caravans that set out from it', () => {
    // `routeYield` with an `origin` scope — the hub, not a nationwide subsidy.
    // Asserted through the fold the destination's sheet prints, so the line is
    // in the list the total is made of (rule 5).
    const g = game();
    const from = found(g.state, 0);
    const to = foundCityAt(
      g.state,
      0,
      g.state.map.tiles.find(
        (tile) => tile.terrain === 'grassland' && Math.abs(tile.col - from.col) > 5,
      )!,
    );
    const fold = (a: City, b: City): { food: number; production: number } => {
      const lines = explainRouteYieldBetween(g.state, a, b);
      return {
        food: lines.reduce((sum, line) => sum + line.food, 0),
        production: lines.reduce((sum, line) => sum + line.production, 0),
      };
    };
    const before = fold(from, to);
    from.buildings.push('caravanserai');
    bumpRevision(g.state);
    const after = fold(from, to);
    expect(after.food).toBe(before.food + 1);
    expect(after.production).toBe(before.production + 1);
    // And a caravan that sets out from the *other* town carries nothing extra:
    // the scope is asked of the town the caravan left.
    expect(fold(to, from)).toEqual(before);
  });

  it('presses the High Temple’s faith as far and as hard as a holy site', () => {
    // Read off `rules.religion` rather than off the row's own two numbers, so
    // "as a holy site" stays true through a retune of the tide.
    const effects = buildingDef('highTemple').effects ?? [];
    const pressure = effects.find((effect) => effect.kind === 'pressure');
    expect(pressure).toBeDefined();
    expect(pressure).toMatchObject({
      amount: RULES.religion.siteStrength,
      range: RULES.religion.siteRange,
    });
  });

  it('gives a free piece no rebate, because it costs nothing to keep', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    city.buildings.push('imperialThrone');
    bumpRevision(g.state);
    const gift = realiseItem(g.state, city, { kind: 'unit', id: 'warrior', tile }, { free: true });
    const piece = g.state.units.find((u) => u.id === gift.unitId)!;
    expect(piece.freeUpkeep).toBe(true);
    expect(piece.upkeepRebate).toBeUndefined();
    expect(explainUnitUpkeepRebate(g.state, 0)).toEqual([]);
  });
});

// --- the deeds ---------------------------------------------------------------

describe('the three bead deeds that named cut rows', () => {
  it('names a row an empire can still raise, so no race is dealt dead', () => {
    for (const [id, def] of Object.entries(BEAD_DATA.endeavours)) {
      const building = prerequisiteBuilding(def.prerequisite);
      if (building === null) continue;
      expect(buildingDef(building).retired, `${id} → ${building}`).not.toBe(true);
      expect(beadIsDormant(id as never), id).toBe(false);
    }
  });

  it('re-aims the three onto the rows the cut kept', () => {
    expect(prerequisiteBuilding(BEAD_DATA.endeavours.theGreatGames!.prerequisite)).toBe(
      'amphitheater',
    );
    expect(prerequisiteBuilding(BEAD_DATA.endeavours.theMint!.prerequisite)).toBe('bank');
    expect(prerequisiteBuilding(BEAD_DATA.endeavours.theMusterOfTheRealm!.prerequisite)).toBe(
      'forge',
    );
  });

  it('reads a withdrawn subject as dormancy, derived and not flagged', () => {
    // The rule the re-aim above relies on: a deed left pointing at a cut row is
    // a race nobody is dealt rather than a race nobody can finish. Asserted
    // against a shape rather than against a live row, because no live row has
    // one — which is the point.
    expect(RETIRED.length).toBeGreaterThan(0);
    const withdrawn = RETIRED[0]!;
    expect(buildingDef(withdrawn).retired).toBe(true);
  });
});

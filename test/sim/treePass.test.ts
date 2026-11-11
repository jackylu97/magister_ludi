/**
 * **The user's tree pass** — `docs/flags.md` (uuu), 2026-09-10: *"could you fold
 * in my changes to the tech tree, so we have a clean slate to rework the
 * ordering of units?"*
 *
 * Eleven marks, and most of them are figures on rows that already had figures:
 * a percentage doubled, a food line turned into a coin, a building hung on a
 * node whose whole gift was a rule. Those are the doc sync tests' and the
 * production-costs register's business and are not repeated here.
 *
 * What **is** here is the batch's own discipline — one behavioural test per new
 * member of the vocabulary, because the kind-level register only proves a
 * *shape* is named by a row and a field nobody reads sails straight through it:
 *
 *   · `UnitFilter.modelClasses` — the Barracks' two silhouettes said once;
 *   · `CardPaysEffect.crossing` — the one narrowing that is a fact about the
 *     *pair* of towns rather than about either of them;
 *   · `BehaviorRuleId`'s `routesImportLuxuries` — a foreign road bringing a
 *     luxury home at `rules.trade.importedLuxuryPercent` of what a seam pays;
 *   · The Saddle's beakers and songs for a burnt field, which is a rider on an
 *     occasion that already paid coin and a bandage;
 *   · `CardCityStatEffect.count` — Siegecraft's walls counted in townsfolk.
 *
 * Batch TT1 (`docs/flags.md` (iiiiiii), 2026-11-10) cut most of the passive
 * bonuses on technologies. The Silk Road's gold and its luxury loan, Daughter
 * Cities' home-route pay, The Saddle's pillage riders and Siegecraft's walls
 * are gone, and so is the `routesImportLuxuries` rule. The tests of those rows
 * now check that they are gone. `crossing` and the counted city stat are still
 * live on other rows, and the tests below read them there.
 *
 * The pass also added `BuildingDef.routeSlotsPerPopulation`, a route slot that
 * grew with the town. Batch TR1 (`docs/flags.md` (ggggggg), 2026-11-10) removed
 * it, and the tests of it here now test the flat figures that replaced it.
 *
 * Plus the member register, naming exactly what this pass declared, so a field
 * that stops being written fails here rather than going quietly dead.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { RULES } from '../../src/sim/rulesData';
import { unitMatches } from '../../src/sim/statecraft';
import { describeBuildingRow, describeCard, stripRefs } from '../../src/sim/statecraft';
import { explainRouteSenderYieldBetween, explainRouteYieldBetween, foldRouteYield } from '../../src/sim/routeYields';
import { explainRouteSlots, routeSlots } from '../../src/sim/trade';
import { cardCityStat } from '../../src/sim/statecraft';
import { improvementDef } from '../../src/sim/improvementData';
import { orderDef } from '../../src/sim/statecraftData';
import { importedLuxuries } from '../../src/sim/resourceEffects';
import { bumpRevision, createUnit } from '../../src/sim/state';
import { foundCityAt } from '../../src/sim/cities';
import { explainHappiness } from '../../src/sim/meters';
import { applyCommand } from '../../src/sim/commands';
import { at, bareState } from './improvementHelpers';
import { game, found } from './statecraftHelpers';

describe('the Barracks drills the foot and nothing else', () => {
  it('reads two silhouettes off one filter', () => {
    const bonus = buildingDef('barracks').productionBonus!;
    expect(bonus.percent).toBe(25);
    const filter = bonus.class!;
    expect(filter.modelClasses).toEqual(['melee', 'ranged']);
    // The predicate, and it is the roster's own: every live row whose silhouette
    // is in the list is admitted and every other row is refused, so the rule
    // reaches the swordsman a later age adds without the card being touched.
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      const foot = def.modelClass === 'melee' || def.modelClass === 'ranged';
      expect(unitMatches(id, filter), id).toBe(foot);
    }
    // And the horse is the Stable's, at the same quarter — the pass moved both.
    expect(buildingDef('stable').productionBonus!.percent).toBe(25);
    expect(unitMatches('chariot', filter)).toBe(false);
  });

  it('says both silhouettes in one sentence', () => {
    expect(describeBuildingRow('barracks').map((clause) => stripRefs(clause.text))).toContain(
      '+25% production toward melee and ranged units',
    );
  });

  it('admits nothing at all on an empty list', () => {
    // The honest reading of a row that named no silhouette, rather than a guard
    // that would quietly admit every piece — see `UnitFilter.modelClasses`.
    expect(unitMatches('warrior', { modelClasses: [] })).toBe(false);
  });
});

describe('a route row may name the crossing', () => {
  /** Two towns of one empire, and the same pair with the far one handed over. */
  function pair() {
    const g = game(5101);
    const from = found(g.state, 0);
    const to = found(g.state, 1);
    return { g, from, to };
  }

  it('pays a foreign-road row only on the road that leaves the realm', () => {
    // The Funduq's grain and hammers are paid on a road abroad from the town
    // that holds one (a leader's building, standing here by hand).
    const { g, from, to } = pair();
    from.buildings.push('funduq');
    to.ownerId = 0;
    bumpRevision(g.state);
    const home = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    from.buildings.splice(from.buildings.indexOf('funduq'), 1);
    bumpRevision(g.state);
    const homeBare = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    // **Domestic**: the clause is silent, so the Funduq changes nothing.
    expect(home.food).toBe(homeBare.food);
    expect(home.production).toBe(homeBare.production);

    // **Abroad**: the grain and hammers land in the *sender's* books.
    to.ownerId = 1;
    bumpRevision(g.state);
    const awayBare = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    from.buildings.push('funduq');
    bumpRevision(g.state);
    const away = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    expect(away.food).toBe(awayBare.food + 2);
    expect(away.production).toBe(awayBare.production + 2);
  });

  it('pays a home-road row only on the road that stays at home', () => {
    // The Tambo's grain and hammers, on a road between two of the seat's towns.
    const { g, from, to } = pair();
    to.ownerId = 0;
    bumpRevision(g.state);
    const before = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    from.buildings.push('tambo');
    bumpRevision(g.state);
    const after = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    expect(after.food).toBe(before.food + 1);
    expect(after.production).toBe(before.production + 1);

    // The same building, the same caravan, one border: nothing.
    to.ownerId = 1;
    bumpRevision(g.state);
    const abroad = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    from.buildings.splice(from.buildings.indexOf('tambo'), 1);
    bumpRevision(g.state);
    const abroadBare = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    expect(abroad.food).toBe(abroadBare.food);
    expect(abroad.production).toBe(abroadBare.production);
  });

  it('no longer pays The Silk Road or Daughter Cities on a road (batch TT1)', () => {
    for (const id of ['silkRoad', 'colonialCharters'] as const) {
      const routeRows = (techDef(id).effects ?? []).filter(
        (effect) => effect.kind === 'pays' && effect.where === 'route',
      );
      expect(routeRows, id).toEqual([]);
    }
  });
});

describe('a foreign road brings no luxury home (batch TT1)', () => {
  /**
   * Two empires, a road between them, and one improved seam of wine in the far
   * town's ground. The caravan is teleported onto its route through the reducer
   * (`startRoute`), because a route is the piece's own field and there is no
   * register to write instead.
   */
  function abroad(): { state: ReturnType<typeof bareState>; home: ReturnType<typeof foundCityAt> } {
    const state = bareState(16, 9);
    // At peace with no truce, and **met** by the one clause that needs no paper
    // — a piece of theirs standing where this seat can see it. Both are
    // `foreignWorld`'s in `trade.test.ts`, which owns the gate itself.
    state.wars = [];
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const partner = foundCityAt(state, 1, at(state, 10, 4));
    createUnit(state, 1, 'worker', 3, 3);
    // A seam the far town works and this empire has none of, opened by the one
    // rule that opens one — a city standing on it is enough.
    const seam = at(state, 10, 4);
    seam.resource = 'wine';
    home.buildings.push('market');
    const trader = createUnit(state, 0, 'trader', 3, 4);
    state.players[0]!.techsResearched.push('silkRoad', 'sailing', 'currency', 'wayfinding');
    bumpRevision(state);
    expect(
      applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: partner.id,
      }).ok,
    ).toBe(true);
    return { state, home };
  }

  it('lends nothing, even with The Silk Road known and a road running abroad', () => {
    const { state } = abroad();
    expect(importedLuxuries(state, 0)).toEqual([]);
    expect(explainHappiness(state, 0).some((line) => line.source.includes('on loan'))).toBe(false);
  });

  it('leaves no row in the tree that names the rule', () => {
    // The rule left the union, so a row naming it would be a word nothing reads.
    for (const id of TECH_IDS) {
      expect(JSON.stringify(techDef(id).effects ?? []), id).not.toContain('routesImportLuxuries');
    }
    // The posts' loan is the one left. It lent at a share until batch DS4
    // dropped The Capitulations' "half value" clause, so a loan is a whole copy.
    expect(RULES.trade.importedLuxuryPercent).toBe(100);
  });
});

describe('The Saddle no longer pays for a burnt field (batch TT1)', () => {
  it('carries no rider, and keeps its pasture bonus', () => {
    expect(techDef('theCataphract').effects).toBeUndefined();
    const pasture = improvementDef('pasture').upgrades ?? [];
    expect(pasture.some((upgrade) => upgrade.tech === 'theCataphract')).toBe(true);
  });
});

describe('the pass’s two new houses', () => {
  it('hangs the Garden on the water and the Bath on the road', () => {
    // Neither row carries a figure — a size and a node, and the standard prices
    // it (`docs/production-costs.md`). A row with `cost` on it fails the
    // register test one file over; this is the other half of that claim.
    for (const id of ['garden', 'publicBath'] as const) {
      expect(BUILDING_IDS).toContain(id);
      expect(Object.keys(buildingDef(id))).not.toContain('cost');
      expect(buildingDef(id).size).toBeTruthy();
    }
    expect(techDef('irrigation').unlocks.buildings ?? []).toContain('garden');
    expect(techDef('stateWorkforce').unlocks.buildings ?? []).toContain('publicBath');
  });

  it('prints the Garden’s two clauses and the Bath’s one', () => {
    const said = (id: string): string[] =>
      describeBuildingRow(id as never).map((clause) => stripRefs(clause.text));
    expect(said('garden')).toContain('+1 happiness per 5 citizens in this city');
    expect(said('garden')).toContain('+15% renown in this city');
    expect(said('publicBath')).toContain('+3 food');
    // One point since batch TT1 (`docs/flags.md` (iiiiiii)), not two.
    expect(said('publicBath')).toContain(
      '+1 happiness while this city is joined to your capital by road',
    );
  });
});

// --- the eight marks that followed ------------------------------------------

/**
 * The user's second pass over the same chart, the same afternoon
 * (`docs/flags.md` (uuu), "eight more marks"). Two of them declared a member.
 * One of the two, the route slot that grew with the town, was removed by batch
 * TR1, so the tests below now check the flat figures that replaced it.
 */
describe('route capacity is a flat figure per building (batch TR1)', () => {
  it('gives the Market and the Lighthouse one route, and the Caravanserai three', () => {
    // The user's ruling of 2026-11-10, `docs/flags.md` (ggggggg).
    expect(buildingDef('market').routeSlots).toBe(1);
    expect(buildingDef('lighthouse').routeSlots).toBe(1);
    expect(buildingDef('caravanserai').routeSlots).toBe(3);
    // The readings taken without a ruling: the Harbour's route moved to the
    // Lighthouse, and the Colossus and the three leaders' rows keep their one.
    expect(buildingDef('harbour').routeSlots).toBeUndefined();
    for (const id of ['colossus', 'tambo', 'longjiangDockyard', 'funduq'] as const) {
      expect(buildingDef(id).routeSlots, id).toBe(1);
    }
  });

  it('leaves no building row with a slot that grows with its town', () => {
    // The field left the type, so a row that still carried it would be a key
    // that nothing reads. Read the raw keys to catch one.
    for (const id of BUILDING_IDS) {
      expect(Object.keys(buildingDef(id)), id).not.toContain('routeSlotsPerPopulation');
    }
  });

  it('gives a Market in a large town the same one route as in a small town', () => {
    const g = game(5103);
    const town = found(g.state, 0);
    town.buildings.push('market');
    town.population = 1;
    bumpRevision(g.state);
    const small = routeSlots(g.state, 0);
    town.population = 40;
    bumpRevision(g.state);
    expect(routeSlots(g.state, 0)).toBe(small);
    // One line for the Market, and it is worth one route at any size.
    const market = explainRouteSlots(g.state, 0).filter((line) => line.source.startsWith('Market'));
    expect(market).toEqual([{ source: `Market \u00b7 ${town.name}`, slots: 1 }]);
  });

  it('prints the Caravanserai as one line worth three routes', () => {
    const g = game(5104);
    const town = found(g.state, 0);
    town.buildings.push('caravanserai');
    town.population = 40;
    bumpRevision(g.state);
    const lines = explainRouteSlots(g.state, 0).filter((line) => line.source.startsWith('Caravanserai'));
    expect(lines).toEqual([{ source: `Caravanserai \u00b7 ${town.name}`, slots: 3 }]);
  });
});

describe('a city stat counted in citizens', () => {
  it('no longer puts Siegecraft\u2019s townsfolk on the walls (batch TT1)', () => {
    // The count stays live on The Theodosian Walls, whose behaviour is pinned in
    // `decks/expansionistCards.test.ts`. Siegecraft carries no rule now.
    const g = game(5105);
    const town = found(g.state, 0);
    g.state.players[0]!.techsResearched.push('siegecraft');
    town.population = 8;
    bumpRevision(g.state);
    expect(cardCityStat(g.state, town, 'defense').some((line) => /Siegecraft/.test(line.source))).toBe(false);
    expect(techDef('siegecraft').effects).toBeUndefined();
    // And a row with no count still pays its flat once: the Palisade's stones
    // are a building field, and the walls of the empire's law are unchanged.
    expect(buildingDef('palisade').cityStat!.amount).toBeGreaterThan(0);
  });

  it('says what buys a helping, in the count\u2019s own noun', () => {
    expect(describeCard('theTheodosianWalls').map((clause) => stripRefs(clause.text))).toContain(
      'every city: +1 city defence per 2 citizens',
    );
  });
});

describe('the second pass\u2019s rows', () => {
  it('turns the plantation from a field into a market garden', () => {
    const plantation = improvementDef('plantation');
    expect(plantation.yields.food).toBe(0);
    expect(plantation.yields.gold).toBe(2);
  });

  it('brings the Smithy into the tree and shuts the door it came through', () => {
    // **No new id.** The Æra II hearth is a row that already existed behind The
    // Toolmakers' Charter, so the pass moved it into the tree rather than
    // minting a second forge: `unlockedByCard` is off, the authored `column` is
    // gone (the node is where "when does this belong" is written down), and the
    // Order that was its only door is retired with the door.
    const smithy = buildingDef('smithy');
    expect(smithy.unlockedByCard).toBeUndefined();
    expect(smithy.column).toBeUndefined();
    expect(techDef('bronzePanoply').unlocks.buildings ?? []).toContain('smithy');
    // The Order that was the Smithy's only door kept its id for saves and was
    // retired with the door. Batch S2 re-opened the row as **The Vizierate**
    // over a building the tree does not carry, so what the tree pass settled is
    // the *Smithy's* door and not the card's: whatever that row is called now,
    // it must not be a second way to the Smithy.
    expect(
      orderDef('toolmakersCharter').effects.some(
        (effect) => effect.kind === 'unlocksBuilding' && effect.building === 'smithy',
      ),
    ).toBe(false);
    // Steel's Forge is untouched: two hearths, two ages, two rows.
    expect(buildingDef('forge').name).toBe('Forge');
    expect(describeBuildingRow('smithy').map((clause) => stripRefs(clause.text))).toContain(
      '+1 production on every hex with a Mine or Quarry carrying a resource',
    );
  });

  it('takes the Shipyard off the trade-route fold', () => {
    // Mark 8: the slips are not a reason to run more caravans. Mark 8 left the
    // Harbour's route in place, but batch TR1 later moved it to the Lighthouse.
    // The test of that is in the route capacity block above.
    expect(buildingDef('shipyard').routeSlots).toBeUndefined();
  });
});

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
 *   · `BuildingDef.routeSlotsPerPopulation` — the Market's and the
 *     Caravanserai's slot that grows with the town;
 *   · `CardCityStatEffect.count` — Siegecraft's walls counted in townsfolk.
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
import { cardCityStat, foldCityStat } from '../../src/sim/statecraft';
import { improvementDef } from '../../src/sim/improvementData';
import { orderDef } from '../../src/sim/statecraftData';
import { importedLuxuries, resourceHappiness } from '../../src/sim/resourceEffects';
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

  it('pays The Silk Road only on the road that leaves the realm', () => {
    const { g, from, to } = pair();
    const owner = g.state.players[0]!;
    owner.techsResearched.push('silkRoad');
    bumpRevision(g.state);

    // **Domestic**: the two towns are one empire's, so the clause is silent and
    // the caravan's fold is the fold it always was.
    to.ownerId = 0;
    bumpRevision(g.state);
    const home = foldRouteYield(explainRouteYieldBetween(g.state, from, to));

    // **Abroad**: the coin lands in the *sender's* books, which is where an
    // international route's whole worth to the seat that sent it lives.
    to.ownerId = 1;
    bumpRevision(g.state);
    const away = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    const flat = RULES.trade.international;
    expect(away.gold).toBe(Math.floor(flat.gold) + 3 + Math.floor((from.population + to.population) / flat.goldPerCombinedPop));
    // And the domestic fold never saw it: the two are the same row asked twice.
    expect(home.gold).toBe(
      foldRouteYield(explainRouteYieldBetween(g.state, from, { ...to, ownerId: 0 })).gold,
    );
  });

  it('pays Daughter Cities only on the road that stays at home', () => {
    const { g, from, to } = pair();
    to.ownerId = 0;
    bumpRevision(g.state);
    const before = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    g.state.players[0]!.techsResearched.push('colonialCharters');
    bumpRevision(g.state);
    const after = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    expect(after.food).toBe(before.food + 1);
    expect(after.production).toBe(before.production + 1);

    // The same law, the same caravan, one border: nothing.
    to.ownerId = 1;
    bumpRevision(g.state);
    const abroad = foldRouteYield(explainRouteSenderYieldBetween(g.state, from, to));
    expect(abroad.food).toBe(0);
    expect(abroad.production).toBe(0);
  });

  it('says which roads it means, in words a first-time player has', () => {
    const said = (id: string): string[] =>
      describeCard(id as never).map((clause) => stripRefs(clause.text));
    expect(said('silkRoad')).toContain(
      '+3 gold on every trade route that ends in another empire’s city',
    );
    expect(said('colonialCharters')).toContain(
      '+1 food, +1 production on every trade route between two of your own cities',
    );
  });
});

describe('a foreign road brings a luxury home', () => {
  it('lends nothing at all without the rule', () => {
    const g = game(5102);
    found(g.state, 0);
    expect(importedLuxuries(g.state, 0)).toEqual([]);
  });

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

  it('brings one kind home, and only one the empire has not already dug', () => {
    const { state } = abroad();
    expect(importedLuxuries(state, 0)).toEqual(['wine']);
    // The far empire lends nothing: the rule is the *sender's*, and a road it
    // did not send is not its road.
    expect(importedLuxuries(state, 1)).toEqual([]);
    // Cut the road and the loan lapses with it — nothing was written down, so
    // there is nothing to keep in step.
    const trader = state.units.find((unit) => unit.trade !== undefined)!;
    delete trader.trade;
    bumpRevision(state);
    expect(importedLuxuries(state, 0)).toEqual([]);
  });

  it('pays half of what a seam of its own would', () => {
    const { state } = abroad();
    const share = RULES.trade.importedLuxuryPercent / 100;
    // **The flat every unique luxury pays**, at the share, as its own labelled
    // line of the meter's list — never a total computed beside it (rule 5).
    const flat = explainHappiness(state, 0).filter((line) => line.source === 'Wine \u00b7 on loan');
    expect(flat).toHaveLength(1);
    expect(flat[0]!.value).toBe(Math.floor(RULES.meters.happiness.perUniqueLuxury * share));
    // Every line the loan pays says so, so a player reading the meter can see
    // which of their contentment a cut road would take away.
    for (const line of explainHappiness(state, 0)) {
      if (!line.source.startsWith('Wine')) continue;
      expect(line.source, line.source).toContain('on loan');
    }
    // **And the row's own signature with it**: wine's extra contentment is
    // halved by the same multiplication, because the share *is* the copy count.
    const signature = resourceHappiness(state, 0).filter((line) => line.resource === 'wine');
    for (const line of signature) expect(line.source).toContain('on loan');
  });

  it('is worth the share the data sets, and never a whole seam', () => {
    // The rule is one number and it is read as the **copy count**, so the whole
    // of "every effect halved" is that multiplication. A share of nothing would
    // be a rule that pays nothing; a share of one would be a loan worth as much
    // as digging.
    expect(RULES.trade.importedLuxuryPercent).toBeGreaterThan(0);
    expect(RULES.trade.importedLuxuryPercent).toBeLessThan(100);
  });

  it('names the rule on the node that carries it, and nowhere else', () => {
    const carriers = TECH_IDS.filter((id) =>
      (techDef(id).effects ?? []).some(
        (effect) => effect.kind === 'rule' && effect.rule === 'routesImportLuxuries',
      ),
    );
    expect(carriers).toEqual(['silkRoad']);
    expect(describeCard('silkRoad').map((clause) => stripRefs(clause.text))).toContain(
      'a trade route ending in another empire’s city lends you one luxury resource ' +
        'that city has improved, worth a share of your own',
    );
  });
});

describe('The Saddle pays for a burnt field', () => {
  it('rides the pillage occasion with beakers and songs', () => {
    const riders = (techDef('theCataphract').effects ?? []).filter(
      (effect) => effect.kind === 'windfallRider',
    );
    expect(riders).toHaveLength(2);
    for (const rider of riders) {
      expect(rider.kind === 'windfallRider' && rider.occasion).toBe('pillage');
    }
    expect(describeCard('theCataphract').map((clause) => stripRefs(clause.text))).toEqual([
      'pillaging grants +15 science',
      'pillaging grants +15 culture',
    ]);
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
    expect(said('publicBath')).toContain(
      '+2 happiness while this city is joined to your capital by road',
    );
  });
});

// --- the eight marks that followed ------------------------------------------

/**
 * The user's second pass over the same chart, the same afternoon
 * (`docs/flags.md` (uuu), "eight more marks"). Two of them declared a member.
 */
describe('a route slot that grows with the town', () => {
  it('pays a further route per so-many citizens, as its own line', () => {
    const g = game(5103);
    const town = found(g.state, 0);
    town.buildings.push('market');
    town.population = 1;
    bumpRevision(g.state);
    const per = buildingDef('market').routeSlotsPerPopulation!;
    expect(per).toBeGreaterThan(0);
    const flat = routeSlots(g.state, 0);

    // A town two citizens short of the next helping runs the routes it has
    // grown: the division is floored, exactly as `sciencePerPop` floors.
    town.population = per - 1;
    bumpRevision(g.state);
    expect(routeSlots(g.state, 0)).toBe(flat);
    town.population = per * 2;
    bumpRevision(g.state);
    expect(routeSlots(g.state, 0)).toBe(flat + 2);

    // **Its own labelled line** (rule 5 for a slot): the total is the fold of
    // the list, and a player watching a route appear is owed the reason.
    const grown = explainRouteSlots(g.state, 0).filter((line) => /people/.test(line.source));
    expect(grown).toHaveLength(1);
    expect(grown[0]!.slots).toBe(2);
  });

  it('is the holding town\u2019s size, never the realm\u2019s', () => {
    const g = game(5104);
    const one = found(g.state, 0);
    one.buildings.push('market');
    one.population = 4;
    const two = found(g.state, 1);
    two.ownerId = 0;
    two.population = 40;
    bumpRevision(g.state);
    // Forty citizens next door buy nothing: the market's slot counts the people
    // who walk past it. See `BuildingDef.routeSlotsPerPopulation`.
    expect(explainRouteSlots(g.state, 0).some((line) => /people/.test(line.source))).toBe(false);
  });
});

describe('a city stat counted in citizens', () => {
  it('puts Siegecraft\u2019s townsfolk on the walls, a helping at a time', () => {
    const g = game(5105);
    const town = found(g.state, 0);
    g.state.players[0]!.techsResearched.push('siegecraft');
    town.population = 1;
    bumpRevision(g.state);
    const small = foldCityStat(cardCityStat(g.state, town, 'defense'));
    town.population = 8;
    bumpRevision(g.state);
    const lines = cardCityStat(g.state, town, 'defense');
    expect(foldCityStat(lines)).toBe(small + 2);
    // One labelled line, and it says how many helpings it counted — a forecast
    // that printed a bare number is the one thing rule 5 forbids in a fight.
    const said = lines.find((line) => /Siegecraft/.test(line.source))!;
    expect(said.source).toContain('×2');
    // And a row with no count still pays its flat once: the Palisade's stones
    // are a building field, and the walls of the empire's law are unchanged.
    expect(buildingDef('palisade').cityStat!.amount).toBeGreaterThan(0);
  });

  it('says what buys a helping, in the count\u2019s own noun', () => {
    expect(describeCard('siegecraft').map((clause) => stripRefs(clause.text))).toContain(
      'every city: +1 city defence per 4 citizens',
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
    expect(orderDef('toolmakersCharter').retired).toBe(true);
    // Steel's Forge is untouched: two hearths, two ages, two rows.
    expect(buildingDef('forge').name).toBe('Forge');
    expect(describeBuildingRow('smithy').map((clause) => stripRefs(clause.text))).toContain(
      '+1 production on every hex with a Mine or Quarry carrying a resource',
    );
  });

  it('takes the Shipyard off the trade-route fold, and leaves the Harbour on it', () => {
    // Mark 8, and only mark 8: the slips are not a reason to run more caravans,
    // and the wharf still is.
    expect(buildingDef('shipyard').routeSlots).toBeUndefined();
    expect(buildingDef('harbour').routeSlots).toBe(1);
  });
});

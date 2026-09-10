/**
 * **The seven shapes the great-person pass added** — batch GP2
 * (`docs/flags.md` item (lll)).
 *
 * The pass split in three: GP1 retunes the roster in the existing vocabulary,
 * **GP2 builds the vocabulary the retuned rows need**, and GP3 writes the rows.
 * So every fixture below is a *synthetic* card standing in for the legacy that
 * will use the shape — which is the file's whole point. A shape tested only
 * through the row that happens to use it is a shape whose rules nobody wrote
 * down, and the row lands a batch later than the rules do.
 *
 * One block a shape, in the ruling's own order:
 *
 *   (a) `buildingYieldPercent`'s two new selectors — one named row, and the
 *       marvels (Rūmī, Dürer);
 *   (b) the `vsWiderEmpire` combat condition (Spartacus);
 *   (c) `tradersUnplunderable` (Pytheas), at both seams;
 *   (d) `faithBuysScienceBuildings` (al-Khwārizmī);
 *   (e) the four counts — trade partners, spare authority, the almoner's
 *       ledger, a road's own length (Ibn Baṭṭūṭa, Gracia, Cosimo, Marco Polo);
 *   (f) a scoped `happinessDemand` (Epicurus);
 *   (g) the science houses' happiness, counted empire-wide (Maimonides) — a
 *       shape that turned out to be **already sayable**, pinned here so it stays
 *       that way.
 *
 * `withCards` swaps a live Order's effects for the duration of one test and puts
 * them back, which is `statecraft.test.ts`' own harness for the same job: it is
 * the shortest way to get an arbitrary effect in front of the one evaluator
 * without inventing a card class the game does not have.
 */

import { describe, expect, it } from 'vitest';

import { arriveOnTile } from '../../src/sim/arrival';
import {
  type BuildingId,
  buildingDef,
  buildingPaysVoice,
} from '../../src/sim/buildingData';
import { attackTargetAt, previewCombat } from '../../src/sim/combat';
import { getTileAt } from '../../src/sim/map';
import { explainAuthority, explainHappiness, foldMeter } from '../../src/sim/meters';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { routeHexes } from '../../src/sim/routes';
import {
  explainRouteSenderYieldBetween,
  explainRouteYieldBetween,
} from '../../src/sim/routeYields';
import { explainCardBuildingYields, foldCity } from '../../src/sim/yields/town';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
  spendGold,
} from '../../src/sim/state';
import {
  GREAT_PERSON_IDS,
  type GreatPersonId,
  LIVE_GREAT_PERSON_IDS,
  greatPersonDef,
} from '../../src/sim/greatPeopleData';
import {
  type PlayerStatecraft,
  cardHappiness,
  cardUnitStat,
  countOf,
  describeEffects,
  explainCardEmpireYields,
  foldCardYields,
  stripRefs,
  unitMatches,
} from '../../src/sim/statecraft';
import type { CardEffect, CardPaysEffect, OrderId } from '../../src/sim/statecraftData';
import { orderDef } from '../../src/sim/statecraftData';
import { startRouteAt } from '../../src/sim/trade';
import { found, game } from './statecraftHelpers';

// --- harness ----------------------------------------------------------------

/** Swaps a live Order's effects for the body of one test, then puts them back. */
function withCards(
  rows: readonly (readonly [OrderId, CardEffect[]])[],
  body: () => void,
): void {
  const held = rows.map(([id]) => [id, orderDef(id).effects] as const);
  try {
    for (const [id, effects] of rows) {
      (orderDef(id) as { effects: CardEffect[] }).effects = effects;
    }
    body();
  } finally {
    for (const [id, effects] of held) {
      (orderDef(id) as { effects: CardEffect[] }).effects = effects as CardEffect[];
    }
  }
}

function grant(sc: PlayerStatecraft, id: OrderId): void {
  if (!sc.orders.includes(id)) sc.orders.push(id);
}

/** Seats a card in a chair, sealed and free. Test scaffolding only. */
function seat(state: GameState, playerId: number, index: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  grant(sc, id);
  sc.slots[index] = { card: id, sealedUntil: state.turn };
  bumpRevision(state);
}

/** A `pays` count row, so the blocks below read as one line each. */
function counts(count: CardPaysEffect['count'], rest: Partial<CardPaysEffect> = {}): CardPaysEffect {
  return { kind: 'pays', where: 'empire', basis: 'count', count, ...rest } as CardPaysEffect;
}

// --- (a) the building share's two new selectors ------------------------------

describe('a share on one named building, and on the marvels', () => {
  it('reaches the row it names and nothing else — Rūmī’s temples', () => {
    withCards(
      [['waysideShrines', [{ kind: 'buildingYieldPercent', building: 'temple', percent: 100 }]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.buildings.push('temple', 'shrine');
        bumpRevision(g.state);
        seat(g.state, 0, 0, 'waysideShrines');
        const lines = explainCardBuildingYields(g.state, city);
        // One line, and it is worth the Temple's own faith doubled — the Shrine
        // pays faith too and is not a Temple, which is the whole of the test.
        expect(lines).toHaveLength(1);
        // Doubled, off the Temple's **own row** — the share is taken before the
        // stages, so the row is the honest figure to compare against.
        expect(lines[0]!.faith).toBe(buildingDef('temple').faith);
      },
    );
  });

  it('reaches the marvels alone — Dürer’s wonders', () => {
    withCards(
      [['waysideShrines', [{ kind: 'buildingYieldPercent', wonder: true, percent: 50 }]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        // A marvel and an ordinary house, both paying culture.
        city.buildings.push('theOracle', 'monument');
        bumpRevision(g.state);
        seat(g.state, 0, 0, 'waysideShrines');
        const lines = explainCardBuildingYields(g.state, city);
        expect(lines).toHaveLength(1);
        // Half again of the **Oracle's own row**, and nothing of the Monument's
        // — both pay culture and only one of them is a marvel. Read off the row
        // rather than off the town's total, because the share is taken before
        // Entry XVII's stages and the town's total is after them.
        const oracle = buildingDef('theOracle');
        expect(lines[0]!.culture).toBeCloseTo(oracle.culture / 2, 6);
        // Its faith is worth **more** than half the row, and deliberately: the
        // Oracle's own card line stands on the Oracle by name, and a share is
        // taken of the row *plus what the law put on it* (`cardLinesOnBuilding`,
        // the user's Synod ruling of 2026-09-07). So the marvel selector rides
        // that reading rather than replacing it.
        expect(lines[0]!.faith).toBeGreaterThan(oracle.faith! / 2);
      },
    );
  });

  it('folds every selector a row names — a wonder that is also a culture house', () => {
    withCards(
      [[
        'waysideShrines',
        [{ kind: 'buildingYieldPercent', wonder: true, category: 'military', percent: 100 }],
      ]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.buildings.push('theOracle');
        bumpRevision(g.state);
        seat(g.state, 0, 0, 'waysideShrines');
        // The Oracle is a marvel, but not a military one — both selectors have
        // to hold, so the share reaches nothing at all.
        expect(explainCardBuildingYields(g.state, city)).toHaveLength(0);
      },
    );
  });

  it('names the building in plain words, as a keyword ref', () => {
    const clauses = describeEffects([
      { kind: 'buildingYieldPercent', building: 'temple', percent: 100 },
    ]);
    expect(clauses).toHaveLength(1);
    // The row's own name, and no category word beside it — "your faith Temples"
    // says the same thing twice.
    expect(stripRefs(clauses[0]!.text)).toContain('Temples');
    expect(stripRefs(clauses[0]!.text)).not.toContain('faith Temples');
    expect(stripRefs(clauses[0]!.text).includes('[[')).toBe(false);
    const marvels = describeEffects([{ kind: 'buildingYieldPercent', wonder: true, percent: 50 }]);
    expect(stripRefs(marvels[0]!.text)).toContain('wonders');
  });


});

// --- (b) the wider empire ----------------------------------------------------

describe('a strength line against a wider empire', () => {
  it('pays only while the other realm holds more cities', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'combatLine', amount: 7, side: 'attack', when: { test: 'vsWiderEmpire' } },
      ]]],
      () => {
        const g = game();
        seat(g.state, 0, 0, 'waysideShrines');
        // One town each: nobody is wider, so the line is silent.
        const home = found(g.state, 0);
        const theirs = found(g.state, 1);
        const mine = createUnit(g.state, 0, 'warrior', home.col + 2, home.row);
        const target = createUnit(g.state, 1, 'warrior', mine.col + 1, mine.row);
        bumpRevision(g.state);
        const even = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
        expect(lineOf(even, 'attacker')).toBe(false);

        // A second town for them, and the same blow now carries it.
        g.state.cities.push({ ...theirs, id: theirs.id + 500, name: 'Second' });
        bumpRevision(g.state);
        const wider = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
        expect(lineOf(wider, 'attacker')).toBe(true);
      },
    );
  });

  it('says it in a first-time player’s words', () => {
    const clauses = describeEffects([
      { kind: 'combatLine', amount: 7, side: 'attack', when: { test: 'vsWiderEmpire' } },
    ]);
    expect(stripRefs(clauses[0]!.text)).toContain('more cities than you');
  });

  function lineOf(preview: ReturnType<typeof previewCombat>, side: 'attacker' | 'defender'): boolean {
    if (!preview.ok) return false;
    const lines = side === 'attacker' ? preview.attackerLines : preview.defenderLines;
    return lines.some((line) => line.amount === 7);
  }
});

// --- (c) the caravans nobody can take ----------------------------------------

describe('trade units that cannot be plundered', () => {
  it('leaves a laden cart off the target list entirely', () => {
    withCards(
      [['waysideShrines', [{ kind: 'rule', rule: 'tradersUnplunderable' }]]],
      () => {
        const g = game();
        const from = found(g.state, 0);
        const to = found(g.state, 1);
        // **Off the town hex**: an unbeaten city outranks everything standing
        // in it, so a cart in its own gates is never the target anyway.
        const cart = createUnit(g.state, 0, 'trader', from.col + 2, from.row);
        startRouteAt(g.state, cart, from, to, 'land');
        bumpRevision(g.state);
        // Without the law, the cart is a target: plunder is the standing rule.
        expect(attackTargetAt(g.state, cart.col, cart.row, 1)?.unit?.id).toBe(cart.id);
        seat(g.state, 0, 0, 'waysideShrines');
        // With it, there is nothing on the hex to attack at all.
        const after = attackTargetAt(g.state, cart.col, cart.row, 1);
        expect(after?.unit ?? null).toBeNull();
      },
    );
  });

  it('leaves an unladen trader alone — the rule is about the cargo', () => {
    withCards(
      [['waysideShrines', [{ kind: 'rule', rule: 'tradersUnplunderable' }]]],
      () => {
        const g = game();
        const home = found(g.state, 0);
        const idle = createUnit(g.state, 0, 'trader', home.col + 2, home.row);
        seat(g.state, 0, 0, 'waysideShrines');
        // No route on it, so it is an ordinary civilian and is captured like one.
        expect(attackTargetAt(g.state, idle.col, idle.row, 1)?.unit?.id).toBe(idle.id);
      },
    );
  });

  it('leaves the cart standing when somebody comes to rest on its hex', () => {
    withCards(
      [['waysideShrines', [{ kind: 'rule', rule: 'tradersUnplunderable' }]]],
      () => {
        const g = game();
        const from = found(g.state, 0);
        const to = found(g.state, 1);
        const cart = createUnit(g.state, 0, 'trader', from.col + 2, from.row);
        startRouteAt(g.state, cart, from, to, 'land');
        seat(g.state, 0, 0, 'waysideShrines');
        const raider = createUnit(g.state, 1, 'warrior', cart.col, cart.row);
        bumpRevision(g.state);
        const report = arriveOnTile(g.state, raider, getTileAt(g.state.map, cart.col, cart.row)!);
        // Neither plundered nor captured, which is the third thing that could
        // have happened and would have been worse than either.
        expect(report.plundered).toHaveLength(0);
        expect(report.captured).toHaveLength(0);
        expect(g.state.units.find((u) => u.id === cart.id)?.ownerId).toBe(0);
      },
    );
  });

  it('says it as what cannot be done to them', () => {
    const clauses = describeEffects([{ kind: 'rule', rule: 'tradersUnplunderable' }]);
    expect(stripRefs(clauses[0]!.text)).toContain('trade units');
  });

  it('lets a stat row name the trader class, off the filter that already could', () => {
    // Pytheas' other half is a sight bonus on the carts, and `UnitFilter`
    // needed nothing: a trader is its own `UnitCategory`, so `unitMatches`
    // answers the question already. Pinned rather than added, so nobody adds a
    // second way to name the class.
    expect(unitMatches('trader', { category: 'trader' })).toBe(true);
    expect(unitMatches('warrior', { category: 'trader' })).toBe(false);
    const clauses = describeEffects([
      { kind: 'unitStat', stat: 'sight', amount: 2, class: { category: 'trader' } },
    ]);
    expect(clauses.length).toBeGreaterThan(0);
    expect(stripRefs(clauses[0]!.text)).toBeTruthy();
  });
});

// --- (d) the faith bank on the science houses --------------------------------

describe('faith buying a building that supplies science', () => {
  it('opens the faith bank for the science houses and for nothing else', () => {
    withCards(
      [['waysideShrines', [{ kind: 'rule', rule: 'faithBuysScienceBuildings' }]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        const player = playerById(g.state, 0)!;
        player.faithPool = 5000;
        // The **tree** still gates the row: the law widens which bank may pay
        // and never what may be built, so a Library that nobody has invented is
        // refused in faith exactly as it is refused in gold.
        // The Library waits on Writing — `letters` in the tree's own ids.
        if (!player.techsResearched.includes('letters' as never)) {
          player.techsResearched.push('letters' as never);
        }
        bumpRevision(g.state);
        // Before the law, a building is bought with gold and nothing else.
        expect(
          explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: 'library' }, 'faith'),
        ).toBeNull();
        seat(g.state, 0, 0, 'waysideShrines');
        const price = explainPurchaseCost(
          g.state,
          0,
          city.id,
          { kind: 'building', id: 'library' },
          'faith',
        );
        expect(price?.currency).toBe('faith');
        expect(price!.total).toBeGreaterThan(0);
        // The gate says the same thing the price does.
        expect(
          purchaseError(g.state, 0, city.id, { kind: 'building', id: 'library' }, 'faith'),
        ).toBeNull();
        // A house that supplies no science is still gold's.
        expect(buildingPaysVoice('monument', 'science')).toBe(false);
        expect(
          explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: 'monument' }, 'faith'),
        ).toBeNull();
      },
    );
  });

  it('reads "a science building" the way the shares do — the per-citizen line counts', () => {
    // One predicate, two readers: the share that raises the science houses and
    // the law that sells them cannot disagree about which houses those are.
    expect(buildingPaysVoice('library', 'science')).toBe(true);
  });
});

// --- (e) the four counts -----------------------------------------------------

describe('the counts the pass added', () => {
  it('counts trade partners once each, however many roads run to them', () => {
    const g = game();
    const mine = found(g.state, 0);
    const theirs = found(g.state, 1);
    const probe = counts('tradePartnerEmpires');
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(0);
    for (let i = 0; i < 2; i++) {
      const cart = createUnit(g.state, 0, 'trader', mine.col, mine.row);
      startRouteAt(g.state, cart, mine, theirs, 'land');
    }
    bumpRevision(g.state);
    // Two caravans, one court.
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(1);
    expect(countOf(g.state, 0, 'waysideShrines', counts('foreignTradeRoutes'))).toBe(2);
  });

  it('counts the spare writ off the meter’s own fold, floored at nothing', () => {
    const g = game();
    found(g.state, 0);
    const probe = counts('authoritySurplus');
    // The meter's own fold, so the count cannot drift from the sheet a player
    // reads — which is the whole claim the count makes about itself.
    const standing = foldMeter(explainAuthority(g.state, 0));
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(Math.max(0, standing));
    // Six more towns than the writ covers, and the count is nought rather than
    // a negative helping.
    for (let i = 0; i < 8; i++) {
      g.state.cities.push({ ...g.state.cities[0]!, id: 900 + i, name: `Town ${String(i)}` });
    }
    bumpRevision(g.state);
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(0);
  });

  it('counts the coin an empire has spent, raised at the seam it leaves by', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const probe = counts('goldSpent');
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(0);
    player.gold = 500;
    spendGold(g.state, player, 120);
    expect(player.gold).toBe(380);
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(120);
    // Nothing lowers it: coin arriving is not coin unspent.
    player.gold += 1000;
    expect(countOf(g.state, 0, 'waysideShrines', probe)).toBe(120);
  });

  it('pays a caravan by the mile, off the distance between its two towns', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'pays', where: 'route', basis: 'count', count: 'routeLength', per: 2, gold: 1 },
      ]]],
      () => {
        const g = game();
        const from = found(g.state, 0);
        const to = found(g.state, 1);
        seat(g.state, 0, 0, 'waysideShrines');
        const hexes = routeHexes(g.state, from, to);
        expect(hexes).toBeGreaterThan(1);
        // The pair is international, so the sender's own fold is where its
        // cards' lines land (`explainRouteSenderYieldBetween`) — same helper,
        // same helpings, the other empire's books.
        const line = explainRouteSenderYieldBetween(g.state, from, to).find((row) =>
          row.source.includes('hex'),
        );
        expect(line, 'the road prints its own length').toBeDefined();
        expect(line!.gold).toBe(Math.floor(hexes / 2));
        // A **domestic** pair prints the same helpings in the destination's own
        // fold, off the same helper — one reading, two books.
        const near: City = { ...from, id: from.id + 300, name: 'Nearby', col: from.col + 3 };
        g.state.cities.push(near);
        bumpRevision(g.state);
        const home = explainRouteYieldBetween(g.state, from, near).find((row) =>
          row.source.includes('hex'),
        );
        expect(home!.gold).toBe(Math.floor(routeHexes(g.state, from, near) / 2));
        // And the count itself answers nothing to a reader with no road in hand:
        // only the fold that holds both ends can measure one.
        expect(countOf(g.state, 0, 'waysideShrines', counts('routeLength'))).toBe(0);
      },
    );
  });

  it('words all four in a first-time player’s terms', () => {
    const fixtures: CardEffect[] = [
      counts('tradePartnerEmpires', { to: 'culture', percent: 5, stage: 'empire' }),
      counts('authoritySurplus', { to: 'happiness', amount: 1 }),
      counts('goldSpent', { to: 'science', amount: 1, per: 100 }),
      { kind: 'pays', where: 'route', basis: 'count', count: 'routeLength', per: 2, gold: 1 },
    ];
    for (const effect of fixtures) {
      const clauses = describeEffects([effect]);
      expect(clauses.length, JSON.stringify(effect)).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text).toBeTruthy();
        expect(stripRefs(clause.text).includes('[[')).toBe(false);
      }
      // **And it says its own figure.** The (route, count) pair is the one count
      // that pays the *bag* rather than a `to` and an `amount`, and the words
      // printed "+0 " for it until GP3 taught `payoutWords` to read the bag —
      // a clause that was truthy, ref-free and wrong. So the sweep asks for the
      // number as well as for the sentence.
      expect(stripRefs(clauses[0]!.text), clauses[0]!.text).not.toContain('+0 ');
    }
    // The pair by name, since it is the one the gap was in.
    expect(
      stripRefs(
        describeEffects([
          { kind: 'pays', where: 'route', basis: 'count', count: 'routeLength', per: 2, gold: 1 },
        ])[0]!.text,
      ),
    ).toBe('+1 gold per 2 hexes between the two cities');
  });

  it('lands an empire count’s percentage at the empire stage, in every town', () => {
    withCards(
      [['waysideShrines', [
        counts('tradePartnerEmpires', { to: 'culture', percent: 50, stage: 'empire' }),
      ]]],
      () => {
        const g = game();
        const mine = found(g.state, 0);
        const theirs = found(g.state, 1);
        seat(g.state, 0, 0, 'waysideShrines');
        const before = foldCity(g.state, mine).culture;
        const cart = createUnit(g.state, 0, 'trader', mine.col, mine.row);
        startRouteAt(g.state, cart, mine, theirs, 'land');
        bumpRevision(g.state);
        // One partner, so half again on the town's song. A percentage and not a
        // flat: the figure moves with what the town already makes.
        expect(foldCity(g.state, mine).culture).toBeGreaterThan(before);
      },
    );
  });
});

// --- (f) a demand rate that lands in some towns and not others ---------------

describe('a scoped happiness demand', () => {
  it('forgives the big towns and leaves the small ones charged', () => {
    withCards(
      [['waysideShrines', [
        {
          kind: 'rulePercent',
          rule: 'happinessDemand',
          percent: -15,
          scope: { test: 'populationAtLeast', value: 10 },
        },
      ]]],
      () => {
        const g = game();
        const big = found(g.state, 0);
        big.population = 10;
        const small = { ...big, id: big.id + 400, name: 'Hamlet', population: 4 };
        g.state.cities.push(small);
        bumpRevision(g.state);
        const plain = costOf(g.state, 'Hamlet');
        const before = costOf(g.state, big.name);
        seat(g.state, 0, 0, 'waysideShrines');
        // The big town's citizens ask for less; the hamlet's ask for exactly
        // what they always did.
        expect(costOf(g.state, big.name)).toBeCloseTo(before * 0.85, 6);
        expect(costOf(g.state, 'Hamlet')).toBeCloseTo(plain, 6);
      },
    );
  });

  it('leaves the unscoped rate exactly where it was', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'rulePercent', rule: 'happinessDemand', percent: -15 },
      ]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.population = 10;
        bumpRevision(g.state);
        const before = costOf(g.state, city.name);
        seat(g.state, 0, 0, 'waysideShrines');
        expect(costOf(g.state, city.name)).toBeCloseTo(before * 0.85, 6);
      },
    );
  });

  /** What one town's citizens cost this empire, off the meter's own list. */
  function costOf(state: GameState, name: string): number {
    const line = explainHappiness(state, 0).find(
      (entry) => entry.part === 'cost' && entry.source.startsWith(`${name} ·`),
    );
    return line === undefined ? 0 : -line.value;
  }
});

// --- (g) the science houses' happiness, empire-wide --------------------------

describe('happiness per science building across the realm', () => {
  it('sums a town-scoped count over every town the empire holds', () => {
    withCards(
      [['waysideShrines', [
        counts('scienceBuildings', { to: 'happiness', amount: 1 }),
      ]]],
      () => {
        const g = game();
        const first = found(g.state, 0);
        first.buildings.push('library');
        const second: City = {
          ...first,
          id: first.id + 700,
          name: 'Second',
          buildings: ['library' as BuildingId],
        };
        g.state.cities.push(second);
        seat(g.state, 0, 0, 'waysideShrines');
        bumpRevision(g.state);
        const line = cardHappiness(g.state, 0).find((row) => row.card === 'waysideShrines');
        // **Already sayable** — `isCityScopedCount` sums a town count across the
        // realm at `where: 'empire'`, so Maimonides needed no new arm. Pinned so
        // that stays true.
        expect(line?.amount).toBe(2);
      },
    );
  });
});

// --- GP3: the rows themselves ------------------------------------------------

/**
 * **The twelve halves the roster was waiting on** — batch GP3.
 *
 * Everything above is a *synthetic* card standing in for a shape, which is how a
 * shape earns its rules a batch before a row uses them. This block is the other
 * claim and it is the one a balance pass reads: the **roster row** now folds to
 * the figure the user wrote in `docs/great-people.md`'s Legacy column. So each
 * test bears the real legacy — nothing swapped, nothing synthesised — and pins
 * the number.
 *
 * Three of the twelve are pinned in `greatPeople.test.ts` instead, beside the
 * deferral tests they replace: Ibn Baṭṭūṭa's share of song, Spartacus' attack
 * line, and Marco Polo's coin by the mile.
 */
describe('the twelve legacies GP3 wired', () => {
  /** A legacy attached to a seat, without spending a piece to do it. */
  function bear(state: GameState, playerId: number, id: GreatPersonId): void {
    playerById(state, playerId)!.legacies.push({ id, age: 1 });
    bumpRevision(state);
  }

  /** What the law's building shares are worth in this town, by voice. */
  function buildingShare(state: GameState, city: City) {
    return explainCardBuildingYields(state, city);
  }

  it('Rūmī doubles what a temple pays, and leaves the shrine beside it alone', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('temple', 'shrine');
    bumpRevision(g.state);
    expect(buildingShare(g.state, city)).toHaveLength(0);
    bear(g.state, 0, 'rumi');
    const lines = buildingShare(g.state, city);
    expect(lines).toHaveLength(1);
    // The Temple's own faith over again — the Shrine pays faith too and is not
    // a Temple, which is what naming one row buys over naming a category.
    expect(lines[0]!.faith).toBe(buildingDef('temple').faith);
  });

  it('Aristotle takes half again off every house that supplies science', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library', 'monument');
    bumpRevision(g.state);
    bear(g.state, 0, 'aristotle');
    const lines = buildingShare(g.state, city);
    expect(lines).toHaveLength(1);
    // Half again of what the Library pays *this town*, **its per-citizen line
    // included** — which is the shape's own claim and the reason the figure is
    // not simply half the row — and nothing of the Monument's song: the
    // selector is the voice a row **pays**, not the shelf it sits on.
    const library = buildingDef('library');
    const paid = library.science + (library.sciencePerPop ?? 0) * city.population;
    expect(lines[0]!.science).toBeCloseTo(paid / 2, 6);
    expect(lines[0]!.culture ?? 0).toBe(0);
  });

  it('al-Jazarī doubles the houses that supply work', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('workshop', 'monument');
    bumpRevision(g.state);
    bear(g.state, 0, 'alJazari');
    const lines = buildingShare(g.state, city);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.production).toBe(buildingDef('workshop').production);
  });

  it('Dürer keeps his song per marvel and takes half again off the marvels', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('theOracle', 'monument');
    bumpRevision(g.state);
    bear(g.state, 0, 'durer');
    // The half he already had: two song for the one wonder standing.
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).culture).toBe(2);
    // And the half GP2 built: the Oracle's own song raised by half, the
    // Monument's untouched.
    const lines = buildingShare(g.state, city);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.culture).toBeCloseTo(buildingDef('theOracle').culture / 2, 6);
  });

  it('Pytheas takes his laden carts off the target list, and lends them an eye', () => {
    const g = game();
    const from = found(g.state, 0);
    const to = found(g.state, 1);
    const cart = createUnit(g.state, 0, 'trader', from.col + 2, from.row);
    startRouteAt(g.state, cart, from, to, 'land');
    bumpRevision(g.state);
    // Plunder is the standing rule, so without the legacy the cart is a target.
    expect(attackTargetAt(g.state, cart.col, cart.row, 1)?.unit?.id).toBe(cart.id);
    bear(g.state, 0, 'pytheas');
    expect(attackTargetAt(g.state, cart.col, cart.row, 1)?.unit ?? null).toBeNull();
    // The other half of the row, untouched by GP3 and pinned beside it.
    const soldier = createUnit(g.state, 0, 'warrior', from.col + 3, from.row);
    bumpRevision(g.state);
    expect(cardUnitStat(g.state, cart, 'sight')).toBe(1);
    expect(cardUnitStat(g.state, soldier, 'sight')).toBe(0);
  });

  it('al-Khwārizmī opens the faith bank to the science houses, and keeps his tithe', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 5000;
    if (!player.techsResearched.includes('letters' as never)) {
      player.techsResearched.push('letters' as never);
    }
    bumpRevision(g.state);
    const library = { kind: 'building', id: 'library' } as const;
    // Without him a building is bought with gold and nothing else.
    expect(explainPurchaseCost(g.state, 0, city.id, library, 'faith')).toBeNull();
    bear(g.state, 0, 'alKhwarizmi');
    const price = explainPurchaseCost(g.state, 0, city.id, library, 'faith');
    expect(price?.currency).toBe('faith');
    expect(price!.total).toBeGreaterThan(0);
    expect(purchaseError(g.state, 0, city.id, library, 'faith')).toBeNull();
    // A house that supplies no science is still gold's.
    expect(
      explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: 'monument' }, 'faith'),
    ).toBeNull();
  });

  it('Gracia widens the writ, then pays for every point of it left spare', () => {
    const g = game();
    found(g.state, 0);
    const bare = foldMeter(explainAuthority(g.state, 0));
    bear(g.state, 0, 'graciaMendesNasi');
    // The half GP1 shipped: eight more points of writ.
    const widened = foldMeter(explainAuthority(g.state, 0));
    expect(widened).toBe(bare + 8);
    const spare = Math.max(0, widened);
    expect(spare).toBeGreaterThan(0);
    // And the two halves GP3 wired, off that same fold: gladness a point, gold
    // ten. The count cannot feed the meter it reads, which is why neither of
    // these pays authority.
    const glad = cardHappiness(g.state, 0)
      .filter((line) => String(line.card) === 'graciaMendesNasi')
      .reduce((sum, line) => sum + line.amount, 0);
    expect(glad).toBe(spare);
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).gold).toBe(spare * 10);
  });

  it('Cosimo is paid a song for every hundred the treasury has let go', () => {
    const g = game();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    bear(g.state, 0, 'cosimoDeMedici');
    const song = (): number => foldCardYields(explainCardEmpireYields(g.state, 0)).culture;
    expect(song()).toBe(0);
    player.gold = 500;
    spendGold(g.state, player, 200);
    bumpRevision(g.state);
    // Two hundred out of the purse, two songs — and **culture**, which is the
    // user's mark on the row rather than the coin the shape's example paid.
    expect(song()).toBe(2);
    // The ninety-nine over buy nothing until they are a hundred.
    spendGold(g.state, player, 99);
    bumpRevision(g.state);
    expect(song()).toBe(2);
  });

  it('Epicurus forgives a town of ten and charges a town of nine', () => {
    const g = game();
    const big = found(g.state, 0);
    big.population = 10;
    const small = { ...big, id: big.id + 400, name: 'Hamlet', population: 9 };
    g.state.cities.push(small);
    bumpRevision(g.state);
    const plain = costOf(g.state, 'Hamlet');
    const before = costOf(g.state, big.name);
    bear(g.state, 0, 'epicurus');
    expect(costOf(g.state, big.name)).toBeCloseTo(before * 0.85, 6);
    // Nine is one short of the scope's own figure, and inclusive means ten.
    expect(costOf(g.state, 'Hamlet')).toBeCloseTo(plain, 6);
  });

  /** What one town's citizens cost this empire, off the meter's own list. */
  function costOf(state: GameState, name: string): number {
    const line = explainHappiness(state, 0).find(
      (entry) => entry.part === 'cost' && entry.source.startsWith(`${name} ·`),
    );
    return line === undefined ? 0 : -line.value;
  }

  it('leaves no roster row deferred', () => {
    // The pass's own closing claim: GP1 struck twelve halves through and GP3
    // wired every one, so nothing on the roster is waiting on a shape any more.
    const waiting = GREAT_PERSON_IDS.filter((id) => (greatPersonDef(id).deferred?.length ?? 0) > 0);
    expect(waiting).toEqual([]);
    // And nothing live is silent: every drawable name leaves something behind.
    const silent = LIVE_GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).legacy.length === 0);
    expect(silent).toEqual([]);
  });
});

// --- the register ------------------------------------------------------------

describe('every shape the pass declared is read somewhere', () => {
  it('words each of them without a silent clause', () => {
    const unread: string[] = [];
    const fixtures: CardEffect[] = [
      { kind: 'buildingYieldPercent', building: 'temple', percent: 100 },
      { kind: 'buildingYieldPercent', wonder: true, percent: 50 },
      { kind: 'combatLine', amount: 3, side: 'attack', when: { test: 'vsWiderEmpire' } },
      { kind: 'rule', rule: 'tradersUnplunderable' },
      { kind: 'rule', rule: 'faithBuysScienceBuildings' },
      {
        kind: 'rulePercent',
        rule: 'happinessDemand',
        percent: -15,
        scope: { test: 'populationAtLeast', value: 10 },
      },
    ];
    for (const effect of fixtures) {
      const clauses = describeEffects([effect]);
      if (clauses.length === 0) unread.push(effect.kind);
      for (const clause of clauses) {
        expect(clause.text, effect.kind).toBeTruthy();
        expect(stripRefs(clause.text).includes('[['), clause.text).toBe(false);
      }
    }
    expect(unread).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  cardBuildingYields,
  cityContext,
  cityQuote,
  cityYields,
  empirePercents,
  explainEmpireLines,
  explainTileYield,
  foldEmpireLines,
  foldTileYield,
  ownedTiles,
  stageEmpireFold,
} from '../../src/sim/cities';
import { explainEmpireGold } from '../../src/sim/empireGold';
import { cardCityYields, cardYieldConversions } from '../../src/sim/statecraft';
import type { City, GameState } from '../../src/sim/state';
import type { Tile } from '../../src/sim/map';
import { createUnit, playerById, bumpRevision } from '../../src/sim/state';
import type { CityYieldPercent } from '../../src/sim/cities';
import type { DoctrineId, OrderId } from '../../src/sim/statecraftData';
import { found, game } from './statecraftHelpers';

/**
 * **The order suite** — one test per boundary of `docs/yields.md`'s sequence,
 * asserting the order *by the numbers* rather than by the totals.
 *
 * The user's ruling (`docs/flags.md` pp, 2026-09-07): *"Let's also include a
 * suite of tests to ensure that these calculations are happening in the correct
 * order."* The failure mode the user named is **a town bonus applied before a
 * hex bonus** — an ordering bug that no total-equality test can see, because a
 * fold in the wrong order still sums to *a* number. So every assertion here is
 * a figure that would be a *different* figure under a different order, on a
 * bench built from **real rows** (`data/statecraft.json`) — never a synthetic
 * card, because a synthetic card proves a shape works and not that the table
 * uses it.
 *
 * The worked example is `docs/audit/evaluations.md` §2c's probe: seed 905, one
 * hill hex, which folds to 3🌾 before the town ever reads it.
 *
 * **The eight boundaries, and where each is pinned:**
 *
 *   a. a hex bonus and a hex amplifier land inside `explainTileYield` — HERE.
 *   b. the hex's two percentages are over their subsets — HERE; the ground half
 *      is also pinned by `statecraft.test.ts` ("basePercent — The Old Ways
 *      doubles the ground and never the works"), which is why this one leads
 *      with the *works* half and asserts both against a card that pays the hex
 *      food the shares must not see.
 *   c. a building share is over the row **plus the law's lines on it**, and
 *      lands as a flat — HERE. `cardImpact.test.ts` ("reads The Synod off the
 *      faith shelves the town has raised") pins the ghost-diff's reading of the
 *      same rule; this pins the fold's.
 *   d. an `appliedLast` share is over the ordinary shares — HERE, on the live
 *      pair (The Counting Houses, The Exchange Charter). The *shape* is pinned
 *      with synthetic cards by `statecraft.test.ts` ("raises a class of
 *      buildings, and takes the doubler over what the first share left").
 *   e. a conversion is a share of the **running** flats — HERE. Its exactness
 *      is pinned by `exactYields.test.ts` ("pays a share of seven food as a
 *      fraction of a point"); what is new here is that the share moves when a
 *      *step 9* line moves, which is what makes it downstream of the buildings.
 *   f. the two stages, in order, additive within each — HERE, on a town. The
 *      arithmetic of `applyStages` alone is pinned by `modifiers.test.ts`
 *      ("Entry XVII: the two stages, as arithmetic").
 *   g. the empire's additive lines fold before the empire stage, and a bill is
 *      never multiplied — HERE.
 *   h. the negative pin: a town percentage never reaches a hex's fold — HERE.
 *
 * The two-pass tile lines (a paying line before an asking one) are pinned by
 * `statecraft.test.ts` ("reads a belief's faith on the hex — the asking lines
 * land after the paying ones") and are not duplicated.
 */

/** Puts a card in the collection and in a chair, as `statecraft.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A Doctrine is held rather than chaired — presence is the state. */
function hold(state: GameState, playerId: number, id: DoctrineId): void {
  playerById(state, playerId)!.statecraft.doctrines.push(id);
  bumpRevision(state);
}

/**
 * The bench: seed 905's duel, one town, and its owned hexes scrubbed to bare
 * ground so the *board* cannot decide an answer this file is about.
 */
function bench(): { state: GameState; city: City; hexes: Tile[] } {
  const g = game(905);
  const city = found(g.state, 0);
  const hexes = ownedTiles(g.state, city).filter(
    (tile) => tile.col !== city.col || tile.row !== city.row,
  );
  return { state: g.state, city, hexes };
}

/** A hex made into bare grassland hill — §2c's worked example. */
function bareHill(tile: Tile): Tile {
  tile.terrain = 'grassland';
  tile.hills = true;
  tile.feature = 'none';
  delete tile.resource;
  delete tile.improvement;
  return tile;
}

/** The named line of a breakdown, or a failure that says which one was missing. */
function lineOf<T extends { source: string }>(lines: readonly T[], name: string): T {
  const found = lines.find((line) => line.source.includes(name));
  expect(found, `no line for "${name}" in [${lines.map((l) => l.source).join(' | ')}]`)
    .toBeDefined();
  return found!;
}

describe('the hex is folded before the town reads it', () => {
  it('a. lands a hex bonus and the amplifier over it inside explainTileYield', () => {
    const { state, city, hexes } = bench();
    const hill = bareHill(hexes[0]!);
    // Terraced Hillsides pays the hill; The Harvest Home pays *your Orders that
    // give food* one more food — an engine reading the line beside it.
    slot(state, 0, 'terracedHillsides');
    slot(state, 0, 'theHarvestHome');

    const lines = explainTileYield(hill, cityContext(state, city));
    const sources = lines.map((line) => line.source);
    const terraced = sources.findIndex((s) => s.includes('Terraced Hillsides'));
    const home = sources.findIndex((s) => s.includes('The Harvest Home'));
    // Both are hex lines, and the engine reads the card it amplifies — so it is
    // written **after** it in the breakdown. An amplifier ahead of its subject
    // would be an engine paying on a line that had not been written yet.
    expect(terraced).toBeGreaterThanOrEqual(0);
    expect(home).toBeGreaterThan(terraced);
    expect(lineOf(lines, 'Terraced Hillsides').food).toBe(2);
    expect(lineOf(lines, 'The Harvest Home').food).toBe(1);

    // §2c's figure: grassland 2 → the hill overrides it to 0 → +2 → +1 = 3.
    expect(foldTileYield(lines).food).toBe(3);

    // And neither is a town line. If either had landed at step 3 the town would
    // still have banked the food — with the hex reading 0, which is the failure
    // mode the user named.
    const town = cardCityYields(state, city).map((line) => line.source);
    expect(town.some((s) => s.includes('Terraced Hillsides'))).toBe(false);
    expect(town.some((s) => s.includes('The Harvest Home'))).toBe(false);
  });

  it('b. takes the works share over the works and the ground share over the ground', () => {
    const { state, city, hexes } = bench();
    const mined = bareHill(hexes[0]!);
    const bare = bareHill(hexes[1]!);
    mined.improvement = 'mine';

    // Terraced Hillsides puts 2 food on **both** hexes as an ordinary card line.
    // It is the trap in this test: a share taken over the hex's total would
    // pick it up, and neither share may.
    slot(state, 0, 'terracedHillsides');
    slot(state, 0, 'theDeepSeams'); // +100% on a mine's own entries
    slot(state, 0, 'theOldWays'); // +100% on an unimproved hex's ground

    const worked = explainTileYield(mined, cityContext(state, city));
    const worksShare = lineOf(worked, 'The Deep Seams');
    // The mine pays 1⚙ and nothing else, so the share is 1⚙ and **no food** —
    // not the 2⚙ the hill pays, and not the 2🌾 the card put beside it.
    expect([worksShare.production, worksShare.food]).toEqual([1, 0]);
    // The hex: 0🌾/2⚙ from the hill, +1⚙ the mine, +2🌾 the card, +1⚙ the share.
    expect(foldTileYield(worked)).toMatchObject({ food: 2, production: 4 });

    const ground = explainTileYield(bare, cityContext(state, city));
    const groundShare = lineOf(ground, 'The Old Ways');
    // The ground is the hill's own 0🌾/2⚙ (the grassland it overrode included),
    // so the share is 2⚙ and no food — the card's 2🌾 is a line *after* the
    // works bracket and out of reach of both shares.
    expect([groundShare.production, groundShare.food]).toEqual([2, 0]);
    // The hex: 0🌾/2⚙ from the hill, +2🌾 the card, +2⚙ the share. Same fold as
    // the mined hex above, by two different routes and neither of them the
    // card's food — which is the claim.
    expect(foldTileYield(ground)).toMatchObject({ food: 2, production: 4 });
  });

  it('h. never lets a town percentage reach a hex’s fold', () => {
    const { state, city, hexes } = bench();
    const hill = bareHill(hexes[0]!);
    slot(state, 0, 'terracedHillsides');
    const before = explainTileYield(hill, cityContext(state, city));

    // Two live percentage cards, one of them on **every** voice of the capital.
    // If a `percentYields` ever leaked into the ground the breakdown would grow
    // a line or move a figure; it does neither, and that is the structural fact
    // `cityQuote` rests on — `explainTileYield` takes no percent list at all.
    slot(state, 0, 'printingHouses');
    hold(state, 0, 'theWanderingCourt');
    expect(explainTileYield(hill, cityContext(state, city))).toEqual(before);

    // The percentages are real: they are in the town's list, waiting for step 12.
    const percents = cityQuote(state, city).percents.map((line) => line.source);
    expect(percents.some((s) => s.includes('Printing Houses'))).toBe(true);
    expect(percents.some((s) => s.includes('The Wandering Court'))).toBe(true);
  });
});

describe('the town folds its flats before it meets a percentage', () => {
  it('c. takes a building share over the row plus the law’s lines on it, as a flat', () => {
    const { state, city } = bench();
    city.buildings.push('temple');
    bumpRevision(state);
    // The Choir pays +3 culture in a town with a Temple — a `cityYields` line
    // whose scope names the building, which is what `cardLinesOnBuilding`
    // widens the share to cover (the user, 2026-09-07: the Synod "should count
    // my religion bonuses on my temples").
    slot(state, 0, 'theChoir');
    slot(state, 0, 'theSynod');

    const share = lineOf(cardBuildingYields(state, city), 'The Synod');
    // Half of the Temple's 2 faith, and half of The Choir's 3 culture — §2c's
    // figures. Over the row alone the culture would be 0.
    expect([share.faith, share.culture]).toEqual([1, 1.5]);

    const quote = cityQuote(state, city);
    // A **flat**: it is in the flats and it is not in the percent list. A share
    // of a building's own figure is not a percentage on the town, and a card
    // that joined step 11 instead would have raised the hexes and the caravans
    // with it.
    expect(quote.percents.some((line) => line.source.includes('The Synod'))).toBe(false);
    const withoutSynod = (() => {
      const g = bench();
      g.city.buildings.push('temple');
      bumpRevision(g.state);
      slot(g.state, 0, 'theChoir');
      return cityQuote(g.state, g.city).flats;
    })();
    expect(quote.flats.faith - withoutSynod.faith).toBe(1);
    expect(quote.flats.culture - withoutSynod.culture).toBe(1.5);
  });

  it('d. takes an appliedLast share over what the ordinary shares just added', () => {
    const { state, city } = bench();
    city.buildings.push('market'); // 2 gold
    slot(state, 0, 'theCountingHouses'); // ordinary, +50% of a gold building
    slot(state, 0, 'theExchangeCharter'); // appliedLast, +50%

    const lines = cardBuildingYields(state, city);
    bumpRevision(state);
    // Order is the arithmetic's: the ordinary shares, then the ones taken last.
    expect(lines.map((line) => line.source.includes('The Counting Houses'))).toEqual([true, false]);
    expect(lineOf(lines, 'The Counting Houses').gold).toBe(1); // half of 2
    // Half of 2 **+ 1**, not half of 2 — the whole of `appliedLast`.
    expect(lineOf(lines, 'The Exchange Charter').gold).toBe(1.5);
    expect(lineOf(lines, 'The Exchange Charter').gold).not.toBe(1);
  });

  it('e. takes a conversion as a share of the flats as they stand after step 9', () => {
    const bare = bench();
    bare.city.buildings.push('market');
    bumpRevision(bare.state);
    slot(bare.state, 0, 'theExchangeCharter');
    slot(bare.state, 0, 'theGoldenScales'); // 20% of gold, paid as science
    const withoutOrdinary = cityQuote(bare.state, bare.city);

    const raised = bench();
    raised.city.buildings.push('market');
    bumpRevision(raised.state);
    slot(raised.state, 0, 'theCountingHouses');
    slot(raised.state, 0, 'theExchangeCharter');
    slot(raised.state, 0, 'theGoldenScales');
    const quote = cityQuote(raised.state, raised.city);

    // The conversion is a fifth of the town's **running** gold, exactly.
    const paid = lineOf(cardYieldConversions(raised.state, raised.city, quote.flats), 'Golden Scales');
    expect(paid.science).toBeCloseTo((quote.flats.gold * 20) / 100, 9);

    // And the running gold includes step 9: adding the ordinary building share
    // raises the market's gold by 1 and the doubler's by 0.5, so the conversion
    // is worth 0.3 more. A conversion taken before the building shares would be
    // unmoved by both.
    const goldDelta = quote.flats.gold - withoutOrdinary.flats.gold;
    expect(goldDelta).toBe(1.5);
    const paidBefore = lineOf(
      cardYieldConversions(bare.state, bare.city, withoutOrdinary.flats),
      'Golden Scales',
    );
    expect(paid.science - paidBefore.science).toBeCloseTo(0.3, 9);

    // The conversion is itself a flat, staged with everything else at step 12 —
    // it is in the flats, never in the percent list.
    expect(quote.percents.some((line) => line.source.includes('Golden Scales'))).toBe(false);
    expect(quote.flats.science).toBeGreaterThan(paid.science);
  });

  it('f. multiplies the city stage and then the empire stage, additive within each', () => {
    const { state, city } = bench();
    slot(state, 0, 'printingHouses'); // +10% science, city stage
    slot(state, 0, 'theLampKeptLit'); // +25% science in the capital, city stage
    hold(state, 0, 'theAcademyOfDeeds'); // +20% science, empire stage

    const quote = cityQuote(state, city);
    const sum = (stage: CityYieldPercent['stage']): number =>
      quote.percents
        .filter((line) => line.yield === 'science' && line.stage === stage)
        .reduce((total, line) => total + line.percent, 0);
    // 10 + 25 in the town's own stage; The Academy's 20 plus the contentment
    // tier's 10 in the empire's. Both stages are non-empty, which is what makes
    // the three formulae below distinguishable at all.
    const city$ = sum('city');
    const empire$ = sum('empire');
    expect(city$).toBe(35);
    expect(empire$).toBe(30);

    const total = cityYields(state, city, [], null, quote).science;
    const base = quote.flats.science;
    // The doctrine: additive within a stage, multiplicative across the pair,
    // exact (batch X floors nothing).
    expect(total).toBeCloseTo(base * 1.35 * 1.3, 9);
    // Not one pool — that would be ×1.65.
    expect(total).not.toBeCloseTo(base * (1 + (city$ + empire$) / 100), 9);
    // Not four multiplications either — that would be ×1.1 × 1.25 × 1.2 × 1.1.
    expect(total).not.toBeCloseTo(base * 1.1 * 1.25 * 1.2 * 1.1, 9);
    // And nothing was floored on the way.
    expect(total).not.toBe(Math.floor(total));
  });
});

describe('the empire folds its own lines before its own stage', () => {
  it('g. stages the additive fold once, and never a bill', () => {
    const { state, city } = bench();
    // A faith rate for the conversion to read, an empire card that reads it,
    // and a payroll the treasury cannot pay: one income line and one bill.
    city.buildings.push('shrine', 'temple');
    bumpRevision(state);
    hold(state, 0, 'theTithe'); // +1 gold per faith per turn, at empire scale
    for (let i = 0; i < 8; i++) createUnit(state, 0, 'warrior', city.col, city.row);
    expect(explainEmpireGold(state, 0).some((line) => line.kind === 'bill')).toBe(true);

    // The stage is **lent**, which is `explainEmpireLines`' own seam (a
    // ghost-diff lends its meters the same way). A meter tier is lent here
    // rather than earned because no live tier touches gold — and gold is the
    // only voice a bill speaks, so it is the only voice that can show a bill
    // being left out of the multiplication.
    const lent = {
      meters: [
        { source: 'Test tier', yield: 'gold', percent: 100, stage: 'empire' },
      ] as CityYieldPercent[],
      arrears: [],
    };
    const lines = explainEmpireLines(state, 0, lent);
    const bill = lineOf(lines, 'Unit maintenance');
    expect(bill.bill).toBe(true);
    expect(bill.gold).toBeLessThan(0);
    const income = lineOf(lines, 'The Tithe');
    expect(income.gold).toBeGreaterThan(0);

    const stage = lineOf(lines, 'Empire stage');
    // Doubled: the income, and only the income. Had the bill joined the fold the
    // gain would have been `income + bill` — a smaller figure, and on this bench
    // a negative one.
    expect(stage.gold).toBeCloseTo(income.gold, 9);
    expect(stage.gold).not.toBeCloseTo(income.gold + bill.gold, 9);

    // The bill is still banked, at face value: the fold is the whole list.
    expect(foldEmpireLines(lines).gold).toBeCloseTo(income.gold * 2 + bill.gold, 9);

    // And the stage is one multiplication over one fold — the same function a
    // caller holding a subset would use, which is why the reconciliation line
    // can be one line a voice rather than one per source.
    const additive = lines
      .filter((line) => line.origin !== 'stage' && line.bill !== true)
      .reduce((total, line) => total + line.gold, 0);
    expect(stageEmpireFold({ ...foldEmpireLines([]), gold: additive }, lent).gold).toBeCloseTo(
      additive + stage.gold,
      9,
    );
  });

  it('g. leaves the city stage out of the empire’s own fold', () => {
    const { state, city } = bench();
    city.buildings.push('shrine', 'temple');
    bumpRevision(state);
    hold(state, 0, 'theTithe');
    // A card's `stage: 'empire'` percentage is written about a **town** and is
    // never the empire's own stage; a city-stage percentage is not either. The
    // empire's stage is `empirePercents` and nothing else, so a town card can
    // move a town's basket and leave the empire's lines exactly where they were.
    const before = foldEmpireLines(explainEmpireLines(state, 0));
    slot(state, 0, 'printingHouses');
    hold(state, 0, 'theAcademyOfDeeds');
    expect(foldEmpireLines(explainEmpireLines(state, 0))).toEqual(before);
    // The lent-stage seam agrees with the real reading, which is what makes the
    // test above a statement about the sim rather than about its own fixture.
    expect(explainEmpireLines(state, 0, empirePercents(state, 0))).toEqual(
      explainEmpireLines(state, 0),
    );
  });
});

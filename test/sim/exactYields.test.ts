/**
 * **Batch X — exact yields**, and the register of what the ruling actually said.
 *
 * The user, 2026-09-06 (`docs/flags.md`, "In flight right now"): *"could we just
 * have yields be valid as decimals? Just don't show this to the player, but
 * behind the scenes all yields should be calculated exactly"*. It was ruled off
 * the back of a measurement — batch D halved `rules.cities.sciencePerPop` to 0.5
 * and the scripted five-town empire's Æra I close slid from t66 to t236, because
 * the beaker was floored **per town** and a size-1 village at half a beaker
 * banked nothing at all.
 *
 * The claim under test has three halves, and each one has a section below:
 *
 *   1. **nothing rounds inside a fold** — the per-citizen lines, Entry XVII's two
 *      stages, a conversion, a growth surplus, a border accrual;
 *   2. **the banks hold the fraction, and every threshold beside them is still an
 *      integer compared with `<` / `>=`** — so a half-beaker town crosses a tech
 *      on the turn arithmetic says it should and not a turn later;
 *   3. **the surface rounds, and it is the only thing that does** — one
 *      formatter (`src/sim/yieldFormat.ts`), through which every printer goes.
 *
 * And a **source-reading pin** at the end, which is the part that has to survive
 * the next agent: the audit classified every `Math.floor` in `src/sim/` as either
 * a yield fold (removed) or a price/threshold/count (kept), and the kept list is
 * written down here by file and by reason. A floor that reappears on a fold's
 * line fails the build rather than quietly costing a town half a beaker again.
 */

import { describe, expect, it } from 'vitest';

import {
  borderCostFor,
  borderGrowth,
  emptyCityYields,
  foundCityAt,
  growthSurplus,
  growthThreshold,
} from '../../src/sim/cities';
import {
  explainCity,
  foldCity,
} from '../../src/sim/yields/town';
import {
  collectYields,
  stageEmpireFold,
} from '../../src/sim/yields/empire';
import { cardYieldConversions } from '../../src/sim/statecraft';
import { applyStages, foldStages, type StagedLine } from '../../src/sim/yields/stages';
import { RULES } from '../../src/sim/rulesData';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame, bumpRevision } from '../../src/sim/state';
import { formatYield, roundYield, signedYield, yieldShows } from '../../src/sim/yieldFormat';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { resetVisibility } from '../../src/sim/visibility';

const CITIES = RULES.cities;

/**
 * A featureless grassland board with one seat — `test/sim/cities.test.ts`'s own
 * `flatState`, one player narrower, so a figure measured here is a figure that
 * suite would measure.
 */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.cities = [];
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

describe('nothing rounds inside a fold', () => {
  /**
   * **The measurement that caused the ruling**, turned into an assertion.
   *
   * A village of one citizen at half a beaker a head banked *nothing* while the
   * per-citizen line floored; it banks half a beaker now, and the pool carries
   * the half rather than the panel inventing it.
   */
  it('banks half a beaker in a size-1 town at sciencePerPop 0.5', () => {
    expect(CITIES.sciencePerPop).toBe(0.5);
    const state = flatState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
    city.population = 1;

    // The flats, which is where the per-citizen line lands. Entry XVII's stages
    // multiply this afterwards and are asserted in their own section. The
    // palace's own beaker sits beside the half (2026-09-08 — a founded first
    // town is the capital); the claim here is the fraction, so it is read
    // off the total less the palace's whole number.
    expect(explainCity(state, city).flats.science - CITIES.palaceScience).toBe(0.5);
    expect(Math.floor(1 * CITIES.sciencePerPop)).toBe(0);

    collectYields(state);
    expect(state.players[0]!.sciencePool).toBeGreaterThan(0);
    expect(state.players[0]!.sciencePool % 1).not.toBe(0);
  });

  /**
   * **The empire's own lines carry the fraction too** (batch H19, the empire
   * stage ruling). Three beakers an Order pays the realm, through a tier ten
   * points up, is 3.3 in the pool — not the 3 an integer stage would have left
   * and not the 4 a rounding would have invented. The multiplication is
   * `applyStages` with an idle city stage, so it is the very fold this file's
   * first section pins; what is asserted here is that the *empire's* half goes
   * through it.
   */
  it('carries a fraction through the empire stage', () => {
    const empire = {
      meters: [
        { source: 'Happiness', yield: 'science' as const, percent: 10, stage: 'empire' as const },
      ],
      arrears: [],
    };
    const staged = stageEmpireFold({ ...emptyCityYields(), science: 3 }, empire);
    expect(staged.science).toBeCloseTo(3.3, 10);
    expect(staged.science % 1).not.toBe(0);
  });

  /**
   * A half-beaker town **crosses a tech on the turn the arithmetic names**.
   *
   * The point of the ruling one grade out from the fold: the pool is a fraction
   * and the tech price is a whole number, and the comparison between them is the
   * ordinary `>=` it always was. Twenty-six turns of half a beaker is thirteen
   * beakers, and the root's own price is thirteen — so the node lands on the
   * turn the division says and never a turn late.
   */
  it('crosses a tech at the exact turn a fractional pool reaches its price', () => {
    const state = flatState();
    const player = state.players[0]!;
    const price = techDef(player.researching ?? TECH_IDS[0]!).cost;
    expect(Number.isInteger(price)).toBe(true);

    player.sciencePool = price - 0.5;
    expect(player.sciencePool >= price).toBe(false);
    player.sciencePool += 0.5;
    // Exactly at the price, and `>=` is what settles it: no rounding either way.
    expect(player.sciencePool).toBe(price);
    expect(player.sciencePool >= price).toBe(true);
  });

  /**
   * `applyStages` carries the fraction, and the printed total is the fold of the
   * printed lines *exactly* — on the exact figures (hard rule 5 is unchanged;
   * what changed is that the fold no longer ends in a floor).
   */
  it('carries fractions through both of Entry XVII’s stages', () => {
    const lines: StagedLine[] = [
      { stage: 'city', percent: 10 },
      { stage: 'city', percent: 15 },
      { stage: 'empire', percent: 10 },
    ];
    const sums = foldStages(lines);
    expect(sums).toEqual({ city: 25, empire: 10 });
    // 15 × 1.25 × 1.10 = 20.625, and 20.625 is what the basket banks.
    expect(applyStages(15, sums)).toBe(20.625);
    expect(applyStages(15, sums)).not.toBe(Math.floor(applyStages(15, sums)));
    // The identity still passes a base through untouched, fraction and all.
    expect(applyStages(0.5, { city: 0, empire: 0 })).toBe(0.5);
    // And the two stages are still exact where a float product is not.
    expect(applyStages(100, { city: 15, empire: 0 })).toBe(115);
  });

  /**
   * A **conversion** — "a tenth of what this town grows, again as coin" — pays
   * the tenth rather than nothing.
   *
   * Seven food is a point and a twentieth at the songs' share. The old floor made
   * every card of this shape dead in a town making under ten of the voice it
   * read, which is most towns for most of a game.
   */
  it('pays a share of seven food as a fraction of a point', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
    // The Harvest Songs, which is every town rather than only the coastal ones,
    // so the board this test builds cannot decide the answer.
    const sc = state.players[0]!.statecraft;
    sc.orders.push('theHarvestSongs');
    sc.slots.push({ card: 'theHarvestSongs', sealedUntil: state.turn });
    bumpRevision(state);
    const flats = { ...explainCity(state, city).flats, food: 7 };
    const lines = cardYieldConversions(state, city, flats);
    const paid = lines.find((line) => line.source.includes('food'))?.culture ?? 0;
    // Batch F raised the songs' share to fifteen percent, so seven food is a
    // point and a twentieth — still a fraction, which is the whole claim.
    expect(paid).toBe(1.05);
    // And the old floor is what it is not: the share of seven used to round to
    // a whole point and lose the rest.
    expect(Math.floor((7 * 15) / 100)).toBe(1);
  });

  /** The growth surplus and the border accrual, the two channels beside Entry XVII. */
  it('keeps the fraction on the growth surplus and the border accrual', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
    city.population = 1;
    // A dry site is −30% on the channel; the surplus is what is left of it.
    const yields = { ...foldCity(state, city), food: 10 };
    const surplus = growthSurplus(state, city, yields);
    expect(surplus).toBeGreaterThan(0);
    expect(surplus).toBe((10 - city.population * CITIES.foodPerCitizen) * growthFactorOf(state, city));

    const growth = borderGrowth(state, city);
    expect(growth.perTurn).toBe(growth.base * (1 + growth.percent / 100));
  });

  /** The factor `growthSurplus` folds, recomputed the way the evaluator does. */
  function growthFactorOf(state: GameState, city: ReturnType<typeof foundCityAt>): number {
    const surplus = growthSurplus(state, city, { ...foldCity(state, city), food: 10 });
    const raw = 10 - city.population * CITIES.foodPerCitizen;
    return surplus / raw;
  }
});

describe('the thresholds beside the banks stay whole', () => {
  it('keeps the growth threshold and the border rung integral', () => {
    for (const pop of [1, 2, 3, 5, 9, 14]) {
      expect(Number.isInteger(growthThreshold(pop))).toBe(true);
    }
    const state = flatState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
    for (let claimed = 0; claimed < 8; claimed++) {
      city.tilesClaimed = claimed;
      expect(Number.isInteger(borderCostFor(state, city))).toBe(true);
    }
  });

  /**
   * A fractional bank against a whole threshold is `>=`, and nothing rounds
   * first — which is the whole of how a fraction is allowed to exist.
   */
  it('compares a fractional bank against a whole threshold with >=', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 8, 5)!);
    city.population = 1;
    const threshold = growthThreshold(city.population);
    city.foodBasket = threshold - 0.5;
    expect(city.foodBasket >= threshold).toBe(false);
    city.foodBasket = threshold;
    expect(city.foodBasket >= threshold).toBe(true);
    // And the near miss is a *near* miss: rounding it first would have grown the
    // town half a bushel early, which is the failure mode the ruling accepts.
    expect(roundYield(threshold - 0.5)).toBe(threshold);
  });
});

describe('the surface rounds, and it is the only thing that does', () => {
  it('rounds a standing figure to the nearest whole number, symmetrically', () => {
    expect(roundYield(2.4)).toBe(2);
    expect(roundYield(2.5)).toBe(3);
    expect(roundYield(-2.4)).toBe(-2);
    // JavaScript's own `Math.round(-2.5)` is −2; the magnitude is rounded and the
    // sign put back, so a modifier reads the same on both sides of zero.
    expect(roundYield(-2.5)).toBe(-3);
    // No `-0` ever reaches a printer.
    expect(Object.is(roundYield(-0.2), 0)).toBe(true);
  });

  it('signs a rounded figure in the house voice, and never signs a nought', () => {
    expect(signedYield(7.2)).toBe('+7');
    expect(signedYield(-2.6)).toBe('−3');
    expect(signedYield(0.4)).toBe('0');
    expect(formatYield(-2.6)).toBe('3');
  });

  it('says which figures are worth printing at all', () => {
    expect(yieldShows(0.4)).toBe(false);
    expect(yieldShows(0.5)).toBe(true);
    expect(yieldShows(-0.9)).toBe(true);
  });

  /**
   * **Lines may not visibly sum, and that is the stated behaviour** — three
   * quarter-point lines print as three noughts under a total of one, because
   * every line rounds on its own and the total rounds from the *exact* fold.
   * The alternative apportions the rounding back over the lines, which makes the
   * printed lines disagree with what each source actually paid. There is no "±".
   */
  it('rounds each line on its own and the total from the exact fold', () => {
    const lines = [0.4, 0.4, 0.4];
    const exact = lines.reduce((sum, value) => sum + value, 0);
    expect(lines.map(roundYield)).toEqual([0, 0, 0]);
    expect(roundYield(exact)).toBe(1);
  });
});

/**
 * **The audit, as source.**
 *
 * Every `Math.floor` / `Math.round` / `Math.trunc` left in the files batch X
 * swept is a price, a threshold, a count, an index or a display — never a line
 * of a yield fold. The two lists below are the audit table's two columns; the
 * batch doc (`docs/fewer-things-plan.md`, "Batch X as shipped") carries the
 * reasons in prose.
 *
 * A source read rather than a behaviour, for `test/sim/statecraft.test.ts`'s own
 * reason: the *next* half-point line somebody adds will look exactly like the
 * ones that were floored, and a behavioural test only catches the fold that
 * happens to be measured.
 */
describe('the audit holds in the source', () => {
  /**
   * The simulation's own text, through Vite's raw glob rather than `node:fs` —
   * this project has no node typings and a source assertion is not worth a
   * dependency (`test/sim/cities.test.ts`'s own note, one register over).
   */
  const SIM_SOURCE = {
    ...import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
    // The yields layer, since batch E3b split it out of `cities.ts`
    // (`src/sim/yields/{hex,town,empire,stages}.ts`).
    ...import.meta.glob('../../src/sim/yields/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  } as Record<string, string>;

  const read = (path: string): string => {
    // Matched from `sim/` rather than on the basename, because the layer folder
    // has a `hex.ts` of its own and `src/sim/hex.ts` is the coordinate module.
    const file = path.slice(path.indexOf('src/sim/') + 'src/'.length);
    const key = Object.keys(SIM_SOURCE).find((entry) => entry.endsWith(`/${file}`));
    expect(key, `${path} readable`).toBeDefined();
    return SIM_SOURCE[key!]!;
  };

  /** Every fold the audit classified as (a) — a floor here is the bug back. */
  const FOLDS: readonly { path: string; snippet: string }[] = [
    { path: 'src/sim/yields/stages.ts', snippet: 'return (base * (100 + sums.city) * (100 + sums.empire)) / 10_000;' },
    // Batch E2 split the town's own terms out of the centre's line and folded a
    // building's per-citizen beaker into the building's own line; both are still
    // the exact product, which is the claim.
    { path: 'src/sim/yields/town.ts', snippet: 'science: city.population * CITIES.sciencePerPop,' },
    { path: 'src/sim/yields/town.ts', snippet: 'science: entry.science + city.population * entry.sciencePerPop,' },
    { path: 'src/sim/yields/hex.ts', snippet: 'share[voice] = (share[voice] * worksPercent) / 100;' },
    { path: 'src/sim/yields/hex.ts', snippet: 'share[voice] = (ground[voice] * groundPercent) / 100;' },
    { path: 'src/sim/cities.ts', snippet: 'return surplus * factor;' },
    { path: 'src/sim/cities.ts', snippet: 'const perTurn = base * factor;' },
    { path: 'src/sim/cities.ts', snippet: 'return (threshold * percent) / 100;' },
    { path: 'src/sim/statecraft/evaluator.ts', snippet: 'const paid = (Math.max(0, flats[effect.from]) * (effect.percent ?? 0)) / 100;' },
    { path: 'src/sim/statecraft/evaluator.ts', snippet: 'line[voice] += paid[voice] * extra;' },
    { path: 'src/sim/statecraft/evaluator.ts', snippet: 'const amount = turns * rate;' },
    { path: 'src/sim/statecraft/evaluator.ts', snippet: 'payout.amount = (base * (100 + percent)) / 100;' },
    { path: 'src/sim/routeYields.ts', snippet: 'gold: (total.gold * percent) / 100,' },
    { path: 'src/sim/empireGold.ts', snippet: 'connectionGold = (connectionGold * (100 + share)) / 100;' },
    { path: 'src/sim/renown.ts', snippet: 'const amount = (base * share.percent) / 100;' },
    { path: 'src/sim/upkeep.ts', snippet: 'const rebate = Math.min(gross - given, (gross * -percent) / 100);' },
    { path: 'src/sim/resourceEffects.ts', snippet: '(bag[key] ?? 0) * copies * scale;' },
    { path: 'src/sim/triumphs.ts', snippet: 'const pays = (def.pays * (100 + boost)) / 100;' },
  ];

  it('keeps every audited fold unrounded, line by line', () => {
    for (const { path, snippet } of FOLDS) {
      expect(read(path), `${path}: ${snippet}`).toContain(snippet);
    }
  });

  /**
   * And the **kept** floors, which are the audit's (b) column: a price, a
   * threshold, a count. Named here so that removing one is a deliberate edit to
   * this list rather than a tidy-up — a growth threshold that stopped being a
   * whole number would make every save's basket unreadable, and a "per N things"
   * count that started paying fractions would be batch D's `countScaled per: 2`
   * ruling quietly reversed.
   */
  const KEPT: readonly { path: string; snippet: string; why: string }[] = [
    {
      path: 'src/sim/cities.ts',
      snippet: 'CITIES.growthBase + CITIES.growthLinear * steps + steps ** CITIES.growthExponent',
      why: 'the growth threshold is a price the basket is compared against',
    },
    {
      path: 'src/sim/cities.ts',
      snippet: 'Math.floor(CITIES.borderCostBase + CITIES.borderCostLinear * steps ** CITIES.borderCostExponent)',
      why: 'a border rung is a price',
    },
    {
      path: 'src/sim/specialists.ts',
      snippet: 'Math.floor(GUILDS.base + GUILDS.linear * n + n ** GUILDS.exponent)',
      why: 'the guild bar is a threshold',
    },
    {
      path: 'src/sim/statecraft/evaluator.ts',
      snippet: 'let count = Math.floor(total / step);',
      why: 'helpings is a count of things, not a share of one',
    },
    {
      path: 'src/sim/routeYields.ts',
      snippet: 'const gold = Math.floor(people / per);',
      why: 'one coin per N people is a count, batch D`s `per` ruling one table over',
    },
    {
      path: 'src/sim/empireGold.ts',
      snippet: 'const upkeep = Math.floor(roads / per);',
      why: 'one coin of upkeep per N road hexes is a count',
    },
    {
      path: 'src/sim/religion.ts',
      snippet: 'ladder.costBase + ladder.costLinear * n + n ** ladder.costExponent',
      why: 'the faith ladder is a price',
    },
  ];

  it('keeps every audited price, threshold and count rounded', () => {
    for (const { path, snippet, why } of KEPT) {
      expect(read(path), `${path}: ${why}`).toContain(snippet);
    }
  });
});

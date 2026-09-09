/**
 * **The want book, the shadow prices, and the spend arms that read them** —
 * batch 1 of `docs/bot-priorities.md`.
 *
 * What is under test is a *replacement*, and the tests are shaped by what was
 * replaced. Six thresholds decided every spending decision this bot made
 * (`spending.goldSpendAbove`, `goldReserve`, `faithSpendAbove`, `faithReserve`,
 * `religion.pantheonSpendAbove`, `prophetSpendAbove`); the audit measured the
 * knob *being* the behaviour, at 0 buying thirteen buildings a game and at 400
 * buying two. So the first thing asserted here is that none of those names
 * survives anywhere in `src/ai`, and everything after it is the arithmetic that
 * stands where they stood.
 *
 * The pins the spec asks for, in its own words:
 *
 *   · the book is **deterministic** — two builds off one board are identical,
 *     which is principle 3 (no stored goal state) said as an assertion;
 *   · the **faith case**, both ends: a live founder want over a thin faith rate
 *     rides the band's ceiling, an empire with nothing to buy sits on its floor;
 *   · **saving beats buying when a big want is close** — the three-turn case,
 *     with the arithmetic written out;
 *   · every worth is the **fold of its printed terms**, exactly (`===`), which
 *     is `decision.ts`' contract and the reason a printed breakdown and the
 *     bot's own comparison can never disagree;
 *   · the price is always **inside the band**.
 */

import { describe, expect, it } from 'vitest';

import {
  AI,
  type BotDecision,
  botSitting,
  chooseProduction,
  explainCard,
  nextBotCommand,
  nextBotDecision,
  valueContext,
} from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { createBotStepper } from '../../src/ai/stepper';
import { type ValueTerm, foldTerms } from '../../src/ai/decision';
import { incumbentGoal, racePays, raceTerm } from '../../src/ai/chain';
import {
  deckMargin,
  explainBuildingRow,
  explainCardEffects,
  explainEffects,
  explainYields,
  hammerPrice,
  hammerTerm,
  hasFoldReadEngine,
  meterWeight,
  bagOfTileYield,
  realmResources,
  voiceWeight,
  yieldWeight,
} from '../../src/ai/value';
import { caravanRefusal, explainCaravan } from '../../src/ai/routes';
import { type Want, expectedBestOrder, hexDoor, savingRows, worthPerCoin } from '../../src/ai/wants';
import { type Game, createGame, dispatch, restoreState, snapshotState } from '../../src/sim/game';
import type { City } from '../../src/sim/state';
import {
  type EarnedBead,
  type GameConfig,
  type GameState,
  type Player,
  realPlayers,
  bumpRevision,
} from '../../src/sim/state';
import { BEAD_FEAT_IDS, beadFeatDef } from '../../src/sim/beadData';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { gatingTech, researchExpansion } from '../../src/sim/tech';
import { BELIEF_IDS, poolBeliefs } from '../../src/sim/religionData';
import {
  beliefPool,
  foundReligion,
  nextBeliefRerollCost,
  openFaithLadder,
  rerollKindFor,
  riteCostFor,
  riteError,
} from '../../src/sim/religion';
import { improvementYield, workForFamily } from '../../src/sim/improvementData';
import { livePool, slotTypesOf } from '../../src/sim/statecraft';
import {
  ORDER_IDS,
  type OrderId,
  orderDef,
  orderFitsSlot,
  poolDoctrines,
} from '../../src/sim/statecraftData';
import {
  foundCityAt,
  hasResource,
  mirrorRowFor,
  purchasableTiles,
  refreshCityDerived,
  tilePurchaseError,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { unitDef, unitStampStrength } from '../../src/sim/unitData';
import {
  foldEmpireRates,
} from '../../src/sim/yields/empire';
import { authorityOf, happinessOf } from '../../src/sim/meters';
import { renownPerTurn } from '../../src/sim/renown';
import { createMap, getTileAt } from '../../src/sim/map';
import { newGame } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';

/**
 * **A bench** — `aiAppraisal.test.ts`' and `aiWar.test.ts`' board, for its
 * reason: the claims below are about *one book on a board somebody arranged*,
 * and a generated map would arrange it differently every time the mapgen moves.
 *
 * Every hex is hilly and every town is grown, so a row's build turns are a
 * handful rather than a whole horizon and a chain's delays mean something.
 */
function benchState(towns: number, seats: readonly string[] = ['Ada']): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: seats.map((name) => ({ name, color: '#a00' })),
  });
  state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  for (const tile of state.map.tiles) tile.hills = true;
  const made = [];
  for (let index = 0; index < towns; index++) {
    made.push(foundCityAt(state, 0, getTileAt(state.map, 2 + index * 4, 5)!));
  }
  recomputeAllVisibility(state);
  for (const city of made) {
    city.population = 6;
    refreshCityDerived(state, city);
  }
  return state;
}

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

/**
 * Turns enough that the tree has opened a building or two — a book on a board
 * where nothing is for sale is a book with nothing in it, and the first ten
 * turns of a duel are exactly that.
 */
const RIPE = 20;

/**
 * A board with towns, citizens and a queue — the state a book is interesting on.
 *
 * **Played once and shared** (2026-09-09, the test-speed pass). Twenty cases in
 * this file open on a grown board and eleven of them want the same twenty
 * turns, so the file used to drive something like two hundred and fifty bot
 * turns to reach five distinct boards. Driving is a pure function of the state,
 * so the second board at twenty turns is the first one again bought at full
 * price: one game is played *forward* here and every horizon it passes through
 * is remembered as a snapshot.
 *
 * The contract is `test/mapgen/fixtures.ts`' and it is a sharp one: a caller
 * gets a **private** copy (a JSON round trip through `restoreState` — the state
 * is plain data), because half the cases here poke the board they are handed.
 * The game the memo plays forward is never handed out.
 *
 * An unseen horizon *behind* the one already played rewinds to the nearest
 * remembered board rather than replaying from turn nought, so a case added
 * later costs the turns nobody has played yet and no more.
 */
interface GrownBench {
  config: GameConfig;
  state: string;
  log: string;
}

const grownBenches = new Map<number, GrownBench>();
let grownLive: Game | null = null;
let grownLiveTurns = 0;

function benchOf(game: Game): GrownBench {
  return { config: game.config, state: snapshotState(game.state), log: JSON.stringify(game.log) };
}

function copyOf(bench: GrownBench): Game {
  return {
    config: JSON.parse(JSON.stringify(bench.config)) as GameConfig,
    state: restoreState(bench.state),
    log: JSON.parse(bench.log) as Game['log'],
  };
}

function grownGame(turns = 8): Game {
  const held = grownBenches.get(turns);
  if (held !== undefined) return copyOf(held);
  if (grownLive === null || grownLiveTurns > turns) {
    const nearest = [...grownBenches.entries()]
      .filter(([at]) => at <= turns)
      .sort((a, b) => b[0] - a[0])[0];
    grownLive = nearest === undefined ? createGame(CONFIG) : copyOf(nearest[1]);
    grownLiveTurns = nearest === undefined ? 0 : nearest[0];
  }
  while (grownLiveTurns < turns) {
    driveBots(grownLive, { warn: () => {} });
    grownLiveTurns += 1;
  }
  const bench = benchOf(grownLive);
  grownBenches.set(turns, bench);
  return copyOf(bench);
}

function seat(state: GameState, id: number): Player {
  return realPlayers(state).find((player) => player.id === id)!;
}

/** Grants a technology and everything it stands on. The tree's own expansion. */
function grant(state: GameState, player: Player, tech: string | undefined): void {
  if (tech === undefined) return;
  for (const step of researchExpansion(state, player.id, tech as never)) {
    if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    bumpRevision(state);
  }
}

describe('the knobs the book replaced', () => {
  it('names none of them anywhere in src/ai', () => {
    // The audit's finding 2, closed. A threshold that survived as a *reader*
    // would be a threshold still deciding, whatever the data file says.
    const sources = import.meta.glob('../../src/ai/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const retired = [
      'goldSpendAbove',
      'faithSpendAbove',
      'goldReserve',
      'faithReserve',
      'pantheonSpendAbove',
      'prophetSpendAbove',
      // Batch 2's flat potential weight, and batch 3's beeline divisor.
      'potentialWeight',
      'costDivisor',
      // **Batch 4's gate pile** (`docs/history/bot-audit.md`'s inventory table). Each is
      // a price now: the citizen `explainCitizen` charges, the writ and the
      // contentment the expansion chain charges, the settle table's floor
      // replaced by the build arm's own competition, and three quotas replaced by
      // the cravings and the route pay that already price what they were about.
      'settlerCityPop',
      'settlerAuthorityFloor',
      'siteScoreMin',
      'tradersPerCity',
      // **Batch 7's prune.** The last two "loose sanity caps" (the falloff and a
      // chain whose realised steps drop out are what stop a ninth settler now;
      // a caravan's wage is what stops a fifth caravan), the last hard income
      // floor (every candidate and every want charges upkeep at gold's shadow
      // price), and the two merges — one horizon (`priorities.horizonTurns`) and
      // one nominal stand-in (`score.unknownEffect × nominalCount`).
      'settlerCap',
      'traderCap',
      'stopMaintainedBelow',
      'maxTurns',
      'nominalYield',
      // `maintenanceAffordable` was `stopMaintainedBelow`'s only reader and went
      // with it; a helper left behind is a threshold still deciding.
      'maintenanceAffordable',
    ];
    const offenders: string[] = [];
    for (const path of Object.keys(sources).sort()) {
      // Comments stripped: the docblocks *say* what was retired, and a rule
      // about code must never be satisfied — or broken — by prose about it.
      const code = sources[path]!
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const name of retired) {
        // Word-bounded: `goldReserveFor` is the surviving *function* — the sized
        // wage cover — and its name is not the retired knob's.
        if (new RegExp(`\\b${name}\\b`).test(code)) offenders.push(`${path}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('deletes both worker quotas, and leaves the craving to decide', () => {
    // `workers.perCity` and `workers.cap` both went in batch 4, and the second
    // one only because the acceptance said it was never deciding anything: with
    // the cap removed entirely, no seat in twenty-two measured t75 games held
    // more than two spades against a ceiling of six. The pin is on the *shape* —
    // the block that used to carry two quotas carries neither.
    expect('cap' in AI.workers).toBe(false);
    expect('perCity' in (AI.workers as Record<string, unknown>)).toBe(false);
    // Batch 7 took the last two loose sanity caps with them — `settlerCap` and
    // `traderCap` — and the block they lived in went with the caravan's
    // (`trade` held nothing else). What stands is the honest kind of cap: a
    // bound on compute, and the scout's glut, which is a printed *charge*.
    expect('trade' in (AI as unknown as Record<string, unknown>)).toBe(false);
    expect('settlerCap' in (AI.expansion as Record<string, unknown>)).toBe(false);
    expect(AI.military.scoutCap).toBeGreaterThan(0);
    expect(AI.expansion.siteSearchRadius).toBeGreaterThan(0);
  });

  it('leaves the sized wage cover standing, because a floor is a fact', () => {
    // `solvency.reserveTurnsOfUpkeep` is the one survivor the spec names. It is
    // still a number of *turns of the real bill* rather than a flat purse.
    expect(AI.solvency.reserveTurnsOfUpkeep).toBeGreaterThan(0);
  });
});

describe('the book', () => {
  it('is built from the board and nothing else — two readings are identical', () => {
    const game = grownGame();
    const player = seat(game.state, 0);
    const first = valueContext(game.state, player).wants;
    const second = valueContext(game.state, player).wants;
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('folds every worth out of its own printed terms, exactly', () => {
    const game = grownGame(12);
    for (const player of realPlayers(game.state)) {
      const book = valueContext(game.state, player).wants;
      for (const want of [...book.gold, ...book.faith]) {
        // `===`, not `toBeCloseTo`: a regrouped sum is a different number and
        // the bot's contract is that the same board produces the same command.
        expect({ label: want.label, folds: foldTerms(want.terms) === want.worth }).toEqual({
          label: want.label,
          folds: true,
        });
      }
    }
  });

  it('holds a want the purse cannot reach, so that saving has something to aim at', () => {
    // The coupling `reachOf` documents: the simulation asks about the bank
    // *last*, so "legal but for the price" is read back off its own sentence. If
    // that sentence ever changes, this is the test that says so — the book would
    // quietly hold nothing out of reach and the bot would stop saving.
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    grant(game.state, player, gatingTech('building', 'granary') ?? undefined);
    player.gold = 0;
    const book = valueContext(game.state, player).wants;
    const reaching = book.gold.filter((want) => want.outOfReach && want.holding === undefined);
    expect(reaching.length).toBeGreaterThan(0);
    for (const want of reaching) expect(want.buy).toBeUndefined();
  });

  it('prices the wage cover at exactly what the table says a coin is worth', () => {
    // The anchor the whole comparison hangs off: holding a coin against the
    // standing bill is worth the prior, so anything the book can buy is measured
    // against the table itself rather than against a number somebody chose.
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    const wages = ctx.wants.gold.find((want) => want.holding === 'wages');
    if (wages === undefined) return; // an empire that owes nothing keeps no cover
    const prior = yieldWeight(AI, 'gold', ctx.age) * ctx.goldPressure;
    expect(worthPerCoin(wages) * AI.score.lumpTurns).toBeCloseTo(prior, 6);
  });
});

describe('the shadow prices', () => {
  it('rides the ceiling while a founder want stands over a thin faith rate', () => {
    // **The user's case, pinned.** A god in hand, no religion, the prophet's
    // door open and a bank far short of its price: the want is out of reach and
    // the rate will not close it quickly, and faith is nonetheless the dearest
    // thing this empire has — six hundred points of appetite for a hundred and
    // twenty faith is a price no weight table would have said.
    const game = grownGame(10);
    const player = seat(game.state, 0);
    player.pantheon.beliefs = [BELIEF_IDS[0] as never];
    grant(game.state, player, UNIT_UNLOCK_TECH.get('prophet'));
    player.faithPool = 10;
    const ctx = valueContext(game.state, player);
    const founder = ctx.wants.faith.find((want) => want.worth >= AI.religion.prophetTechValue);
    expect(founder).toBeDefined();
    expect(founder!.outOfReach).toBe(true);
    expect(ctx.prices.faith).toBe(
      yieldWeight(AI, 'faith', ctx.age) * AI.priorities.priceBandHigh,
    );
    expect(ctx.priceNotes.faith).toContain('capped by the band');
  });

  it('sits on the floor in an empire with nothing left to buy', () => {
    // The other end. A young seat has no faith-priced row open to it at all, so
    // there is nothing a point of faith could do and the arms stop chasing it.
    const game = createGame(CONFIG);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    expect(ctx.wants.faith).toEqual([]);
    expect(ctx.prices.faith).toBe(yieldWeight(AI, 'faith', ctx.age) * AI.priorities.priceBandLow);
    expect(ctx.priceNotes.faith).toContain('nothing this empire could buy');
  });

  it('never leaves the band, in either bank, at any point of a game', () => {
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 25; turn++) {
      driveBots(game, { warn: () => {} });
      for (const player of realPlayers(game.state)) {
        const ctx = valueContext(game.state, player);
        for (const currency of ['gold', 'faith'] as const) {
          const prior =
            yieldWeight(AI, currency, ctx.age) * (currency === 'gold' ? ctx.goldPressure : 1);
          expect(ctx.prices[currency]).toBeGreaterThanOrEqual(prior * AI.priorities.priceBandLow);
          expect(ctx.prices[currency]).toBeLessThanOrEqual(prior * AI.priorities.priceBandHigh);
        }
      }
    }
  });

  it('is what every fold prices a coin at — the one door', () => {
    // Touch point (a) of the spec: the arms read the live price, not the table.
    // Asserted through the arithmetic rather than through a source rule — a
    // town's gold yield is worth the price, whatever the table says.
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    const printed = ctx.wants.gold.find((want) => want.holding === undefined);
    if (printed === undefined) return;
    expect(ctx.prices.gold).not.toBe(0);
    // The label carries the price and its reason, so a reader of the feed sees
    // the number the bot actually used.
    const text = JSON.stringify(printed.terms);
    if (text.includes('gold ')) expect(text).toContain('the gold price');
  });
});

describe('saving is a row', () => {
  it('beats a trinket bought now when a big want is three turns out', () => {
    // **The spec's own case, with the arithmetic written out.** A four-hundred
    // coin want worth eight hundred, sixty coins short at twenty a turn, is
    // three turns away; over the horizon (60 since the 2026-09-05 retune) that
    // discounts it to 800 × 57/60 = 760, which is 1.9 a coin. A sixty-coin
    // trinket worth sixty is 1.0 a coin. The bot holds.
    const game = grownGame(6);
    const ctx = valueContext(game.state, seat(game.state, 0));
    expect(ctx.ai.priorities.horizonTurns).toBe(60); // retuned 2026-09-05, the OFAT pass
    const big: Want = {
      label: 'a big want',
      currency: 'gold',
      price: 400,
      worth: 800,
      delay: 0,
      terms: [{ label: 'what it is worth', value: 800 }],
      outOfReach: true,
    };
    const trinket: Want = {
      label: 'a trinket',
      currency: 'gold',
      price: 60,
      worth: 60,
      delay: 0,
      terms: [{ label: 'what it is worth', value: 60 }],
      outOfReach: false,
    };
    const rows = savingRows([big], ctx, 340, 20);
    expect(rows.length).toBe(1);
    const hold = rows[0]!;
    expect(hold.holding).toBe('saving');
    expect(hold.buy).toBeUndefined();
    expect(hold.delay).toBe(3);
    expect(hold.worth).toBeCloseTo(760, 6);
    expect(foldTerms(hold.terms)).toBe(hold.worth);
    expect(worthPerCoin(hold)).toBeCloseTo(1.9, 6);
    expect(worthPerCoin(hold)).toBeGreaterThan(worthPerCoin(trinket));
  });

  it('drops a want no rate can reach inside the horizon', () => {
    // `max(0, H − delay)`, said as a filter: a want forty turns out is worth
    // nothing to save for, and a row folding to nothing is a row that should not
    // be in the book arguing with anything.
    const game = grownGame(6);
    const ctx = valueContext(game.state, seat(game.state, 0));
    const far: Want = {
      label: 'a want the books cannot reach',
      currency: 'gold',
      price: 4000,
      worth: 800,
      delay: 0,
      terms: [{ label: 'what it is worth', value: 800 }],
      outOfReach: true,
    };
    expect(savingRows([far], ctx, 0, 1)).toEqual([]);
  });
});

describe('the spend arm', () => {
  it('buys the best-ranked want it can reach, and consults no threshold', () => {
    // A treasury no threshold would have opened past — and no threshold is
    // consulted. What decides is the comparison: the best want beats the best
    // reason to hold, so the coin moves. Driven for a few turns rather than
    // asked once, because *which* turn a row clears the bar on is the board's
    // business and the claim here is about the ranking.
    const game = grownGame(RIPE);
    // A row worth wanting, granted rather than waited for: what is under test is
    // the *comparison*, and whether a duel map has opened Pottery by turn twenty
    // is the board's business rather than the arm's.
    grant(game.state, seat(game.state, 0), gatingTech('building', 'granary') ?? undefined);
    const bought: BotDecision[] = [];
    for (let turn = 0; turn < 4; turn++) {
      for (const player of realPlayers(game.state)) player.gold = 5000;
      for (let step = 0; step < 200; step++) {
        const decision = nextBotDecision(game.state, 0);
        if (decision === null) break;
        if (decision.kind === 'purchase') bought.push(decision);
        dispatch(game, decision.command);
      }
      driveBots(game, { warn: () => {} });
    }
    expect(bought.length).toBeGreaterThan(0);
    for (const decision of bought) {
      // The chosen candidate is the *top* of the table it printed.
      const weighed = decision.candidates.filter((candidate) => candidate.rejected === undefined);
      const chosen = weighed.find((candidate) => candidate.chosen);
      expect(chosen).toBeDefined();
      for (const candidate of weighed) {
        expect(chosen!.score).toBeGreaterThanOrEqual(candidate.score);
      }
      // And every printed score is its own arithmetic — the slow tier's rule,
      // said here for the arm that changed.
      for (const candidate of weighed) expect(foldTerms(candidate.terms)).toBe(candidate.score);
    }
  });

  it('holds instead when the wages are worth more than anything for sale', () => {
    // The other half of the same comparison, and the replacement for the hard
    // threshold: an empire whose books are bleeding prices its coins at the
    // pressure, the wage row rises with them, and nothing for sale clears it.
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    player.gold = 0;
    const ctx = valueContext(game.state, player);
    const buyable = ctx.wants.gold.filter((want) => want.buy !== undefined);
    // With an empty purse nothing is affordable at all, so the arm must be
    // silent about the treasury rather than proposing a command the reducer
    // would refuse.
    expect(buyable).toEqual([]);
  });
});

// --- batch 3: the chain reaches the book ------------------------------------

/**
 * **Batch 3 of `docs/bot-priorities.md`** where it touches the book: gold's
 * bridge role, the augur's rites, and the margin's effect on how often the
 * beeline changes its mind.
 *
 * The two deferrals batch 1 wrote down are closed here — *"gold's bridge role …
 * it needs the chain, which is batch 3's template"* and *"what an augur's rites
 * are worth"* — and each is asserted where it lands: as a printed term on the
 * row it is about.
 */
describe('the chain in the book', () => {
  /** A blank board with towns, hammers under them, and a granted technology. */
  function chained(count: number, tech: string): { state: GameState; player: Player } {
    const state = benchState(count);
    const player = seat(state, 0);
    for (const step of researchExpansion(state, 0, tech as never)) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    return { state, player };
  }

  /**
   * A live chain, one of its building steps, and the gold want that buys it.
   *
   * **Read off the board rather than named** (batch P1): which engine is worth
   * running is a balance reading that moves with every price pass — the
   * production standard moved it again, and the Writing engine these two cases
   * used to name stopped clearing its own hammers — while what is under test is
   * the bridge itself.
   */
  function bridgeable(
    ctx: ReturnType<typeof valueContext>,
  ): { goal: string; id: string; label: string } | null {
    for (const chain of ctx.chains) {
      for (const step of chain.steps) {
        if (step.kind !== 'building') continue;
        const want = ctx.wants.gold.find((row) => row.label.startsWith(`${step.name} at `));
        if (want !== undefined) {
          return { goal: techDef(chain.goal).name, id: step.id, label: want.label };
        }
      }
    }
    return null;
  }

  it('prints what buying a chain’s row buys the chain, in turns', () => {
    // **Gold's bridge role.** A row bought is a row nobody has to spend a dozen
    // turns raising, so every step of that chain from this one on starts paying
    // sooner. The row is the ordinary purchase want; what the bridge adds is a
    // term saying what the delivery bought.
    const { state, player } = chained(2, 'letters');
    player.gold = 4000;
    const ctx = valueContext(state, player);
    const found = bridgeable(ctx);
    expect(found, 'no live chain has a building step for sale on this board').not.toBeNull();
    const row = ctx.wants.gold.find((want) => want.label === found!.label)!;
    const bridge = row.terms.find((term) =>
      new RegExp(`buys the ${found!.goal} engine the turns`).test(term.label),
    );
    expect(bridge).toBeDefined();
    expect(bridge!.value).toBeGreaterThan(0);
    // Its parts name the steps the delivery hurried, and the turns it bought.
    expect(JSON.stringify(bridge!.parts)).toMatch(/pays [\d.]+ turns sooner/);
    // And the want still folds to the arithmetic it printed, bridge included.
    expect(foldTerms(row.terms)).toBe(row.worth);
  });

  it('carries no bridge term on a row no chain owes', () => {
    // The other half: the term is a *reading of a live chain*, not a bonus for
    // being for sale. A town that already holds the row owes the chain nothing.
    const { state, player } = chained(2, 'letters');
    player.gold = 4000;
    const found = bridgeable(valueContext(state, player));
    expect(found).not.toBeNull();
    for (const city of state.cities) city.buildings.push(found!.id as never);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    for (const want of ctx.wants.gold) {
      expect(
        want.terms.some((term) =>
          new RegExp(`buys the ${found!.goal} engine`).test(term.label),
        ),
      ).toBe(false);
    }
  });

  it('prices a rite as a want of its own — the town, the rite and the price', () => {
    // **The rites became a city's verb** (schema 74), so the bot no longer
    // prices a *piece* by what its charges would do: it prices the act itself,
    // in the bank that pays for it, ranked against every other faith row by
    // worth per coin. That is the ruled shape ("a per-city purchase-shaped
    // want") and it is what lets a rite lose to a prophet honestly.
    //
    // **The row read is the best of the book and no longer the first of it**
    // (batch X2's re-aim). This bench's ground is hills to the horizon, and a
    // hill feeds nobody — so the Rite of the Harvest, whose whole text is *"every
    // hex this city works that feeds it"*, lands on **no hex at all here** and is
    // correctly worth nought. That is the batch's reading working rather than
    // failing: before it, a hex clause was priced at a flat three hexes whatever
    // the ground was. The claim under test is about the *shape* of a rite want —
    // its town, its price and its blessing over ten turns — so it is asked of
    // whichever rite this board actually pays, which here is Omen Reading.
    const { state, player } = chained(1, 'divination');
    player.pantheon.beliefs = [BELIEF_IDS[0] as never];
    player.faithPool = 500;
    for (const city of state.cities) city.buildings.push('chapel');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rites = ctx.wants.faith.filter((want) => want.rite !== undefined);
    expect(rites.length).toBeGreaterThan(0);
    const rite = rites.reduce((best, row) => (row.worth > best.worth ? row : best));
    expect(rite).toBeDefined();
    // The price is the simulation's own, and the act is a command the reducer
    // would take.
    expect(rite!.price).toBe(riteCostFor(state, player.id));
    expect(riteError(state, player.id, rite!.rite!.cityId, rite!.rite!.rite)).toBeNull();
    expect(rite!.worth).toBeGreaterThan(0);
    expect(foldTerms(rite!.terms)).toBe(rite!.worth);
    // And its worth is the blessing over the turns it runs — never a grant,
    // because a rite pays nothing the instant it lands any more.
    expect(rite!.terms[0]!.label).toMatch(/^its blessing, for 10 turns$/);
  });

  it('leaves the withdrawn augur out of the faith book entirely', () => {
    const { state, player } = chained(1, 'divination');
    player.faithPool = 500;
    const ctx = valueContext(state, player);
    expect(ctx.wants.faith.some((want) => want.label.startsWith('Augur at '))).toBe(false);
  });

  it('changes its mind about the plan far less often, now the margin defends it', () => {
    // **The wobble, measured.** Batch 1's own report put `chooseResearch` at 31
    // commands over the first forty turns of this duel, up from 15 before it —
    // an empire re-aiming its beeline most turns of the game. The margin is what
    // stops that, and this is the number pinned as a ceiling.
    //
    // Measured 2026-09-05, this exact board: **31 before batch 3, 10 after**,
    // and the ceiling was 16 — set where a real regression would trip it and
    // ordinary board-level movement would not.
    //
    // **Re-aimed 2026-09-09 to 19** (batch X7, the march re-asked), and the
    // reason is worth writing down because a raised ceiling always looks like a
    // ceiling that gave up. This one board reads **14 on the tree X7 was built
    // on**, 18 with X7 alone, and 19 with the four batches of that day together
    // — so the pin had already drifted from 10 to 14 without X7 in it. What X7
    // does is move the *board*: a settler that re-aims mid-walk founds somewhere
    // else, and forty turns of a different game re-aim a different number of
    // times.
    //
    // Diagnosed before it was re-aimed, because a wobble and a divergence look
    // identical in one number (`docs/bot-priorities.md`, "Batch X7 as shipped"):
    //
    //   · **the oscillation is older than the batch.** Seat 1 flips between the
    //     same two goals on this board with X7 *shut* (t22 → t23 → t28), and
    //     with it on it runs two more cycles of that same pair;
    //   · **the flip rate does not move.** Over ten boards, an A → B → A
    //     flip-back is 31% of re-aims shut and 31% on. A margin that had stopped
    //     holding would show here and does not;
    //   · **ten boards, paired: +1.0 ± 1.2 re-aims** (means 10.3 → 11.3), and
    //     the per-board deltas run **both ways** — seed 42 falls 15 → 8 and 4242
    //     falls 13 → 10 while this seed rises 14 → 18;
    //   · **the arm cannot perturb the read.** Moving `reaskTheMarch` to the
    //     other side of `reaimBeeline` in `housekeeping` leaves all ten boards'
    //     counts **byte-identical**, which is the experiment that rules out "the
    //     re-asked march changes what the beeline reads mid-turn".
    //
    // So the ceiling is re-aimed rather than the batch reverted, and it is set
    // at the four-batch gate's own reading with no slack in it: the next thing
    // that moves this number is meant to be looked at.
    const game = createGame(CONFIG);
    let aims = 0;
    for (let turn = 0; turn < 40; turn++) {
      driveBots(game, {
        warn: () => {},
        report: (command) => {
          if (command.type === 'chooseResearch') aims += 1;
        },
      });
    }
    expect(aims).toBeLessThanOrEqual(19);
  });
});

// --- batch 5: the bead race -------------------------------------------------

/**
 * **Batch 5 of `docs/bot-priorities.md`** — the win-condition template: *"the
 * bead race and the Opus as chains with huge terminal values and honest delays —
 * they take the book over in the late game because the numbers say so, not
 * because a rule fires."*
 *
 * Four claims, and the first two are the ones that matter most:
 *
 *   · **the fold** — `worth === foldTerms(terms)`, exactly, like every other
 *     appraisal in the bot, and every nested part folds to the term above it;
 *   · **the null half** — an early-game seat prices the whole race at *nothing*
 *     and no candidate anywhere carries its term, which is why the t75 acceptance
 *     reads identically to batch 4's;
 *   · **the takeover** — a rod nearly full over a world that has reached the
 *     closing technology puts the great work and the rows that pay beads above
 *     everything an ordinary town would raise;
 *   · **the printed zero** — a rival who would close first holding more beads
 *     zeroes the chain, and the chain says whose name is on it.
 */
describe('the bead race', () => {
  /** One earned bead, of a row whose boon pays no lasting step. See the docblock. */
  function rod(count: number): EarnedBead[] {
    const id = BEAD_FEAT_IDS[0]!;
    const family = beadFeatDef(id).family;
    return Array.from({ length: count }, () => ({ id, kind: 'feat' as const, family, turn: 1 }));
  }

  /**
   * The bench, arranged as a late game: a turn on the clock (so the crude bead
   * rate reads off a real number of turns rather than off turn one), a rod part
   * filled, and — when asked — the closing technology in the world's hands.
   */
  function raceBench(options: {
    towns: number;
    turn: number;
    beads: number;
    rivalBeads?: number;
    alchemy?: boolean;
  }): { state: GameState; player: Player } {
    const state = benchState(options.towns, options.rivalBeads === undefined ? ['Ada'] : ['Ada', 'Brun']);
    state.turn = options.turn;
    const player = seat(state, 0);
    player.beads = rod(options.beads);
    bumpRevision(state);
    if (options.rivalBeads !== undefined) seat(state, 1).beads = rod(options.rivalBeads);
    bumpRevision(state);
    if (options.alchemy === true) grant(state, player, 'alchemy');
    return { state, player };
  }

  /** Every nested part folds to the term above it — `aiDecision.test.ts`' walk. */
  function partFailures(terms: readonly ValueTerm[], where: string): string[] {
    const failures: string[] = [];
    for (const term of terms) {
      if (term.parts === undefined) continue;
      if (foldTerms(term.parts) !== term.value) {
        failures.push(`${where} → "${term.label}": parts fold to ${foldTerms(term.parts)}`);
      }
      failures.push(...partFailures(term.parts, `${where} → ${term.label}`));
    }
    return failures;
  }

  it('folds its worth out of its own printed terms, exactly, on every board', () => {
    // The contract every appraisal in this bot keeps, said for the last chain.
    // Both a played board and an arranged one, because the arranged one is the
    // only place the terms that only fire late are ever exercised.
    const game = grownGame(12);
    for (const player of realPlayers(game.state)) {
      const race = valueContext(game.state, player).race;
      expect(race).not.toBeNull();
      expect(foldTerms(race!.terms)).toBe(race!.worth);
      expect(partFailures(race!.terms, 'race')).toEqual([]);
    }
    for (const arrangement of [
      { towns: 3, turn: 120, beads: 16, alchemy: true },
      { towns: 3, turn: 120, beads: 3, rivalBeads: 19 },
      { towns: 2, turn: 60, beads: 0 },
    ]) {
      const { state, player } = raceBench(arrangement);
      const race = valueContext(state, player).race!;
      expect(foldTerms(race.terms)).toBe(race.worth);
      expect(partFailures(race.terms, 'race')).toEqual([]);
    }
  });

  it('is a reading of the board and nothing else — two readings are identical', () => {
    const { state, player } = raceBench({ towns: 3, turn: 120, beads: 16, alchemy: true });
    const first = valueContext(state, player).race;
    const second = valueContext(state, player).race;
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('prices the race at nothing in the early game, and nothing carries its term', () => {
    // **The null half of the acceptance.** Twenty beads owed at a bead every
    // forty turns is eight hundred turns of rod against a forty-turn horizon: the
    // curtain discounts to nothing, the beads still owed discount to nothing, and
    // the chain is not live — so no build candidate, no purchase want and no
    // beeline gift anywhere carries a race term. This is why the t75 table reads
    // exactly as batch 4 left it.
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 20; turn++) driveBots(game, { warn: () => {} });
    for (const player of realPlayers(game.state)) {
      const ctx = valueContext(game.state, player);
      const race = ctx.race!;
      expect(race.open).toBe(false);
      expect(race.live).toBe(false);
      expect(race.worth).toBe(0);
      expect(race.needed).toBe(race.threshold - player.beads.length);
      // The door itself, asked of the one row that closes the game.
      expect(raceTerm(ctx, { kind: 'building', id: race.opus })).toBeNull();
      // And the book it feeds: not a want in either bank mentions the race.
      expect(JSON.stringify(ctx.wants)).not.toContain('bead race');
    }
    // Nor does any decision the seats actually take over the next few turns.
    const stepper = createBotStepper(game, { warn: () => {} });
    for (let turn = 0; turn < 3; turn++) {
      for (const step of stepper.playTurn()) {
        expect(JSON.stringify(step.decision?.candidates ?? [])).not.toContain('bead race');
      }
    }
  });

  it('prices the whole road once the work is open, and shares it over what is left', () => {
    // **The takeover, on an arranged board.** Sixteen beads at turn a hundred and
    // twenty is a rate the last four are reachable at; the world holds the closing
    // technology, so the race is *on* and the planning horizon stops applying —
    // what is left is whether this empire can get there before anybody else, and
    // on this board there is nobody else.
    const { state, player } = raceBench({ towns: 3, turn: 120, beads: 16, alchemy: true });
    const ctx = valueContext(state, player);
    const race = ctx.race!;
    expect(race.open).toBe(true);
    expect(race.live).toBe(true);
    expect(race.lost).toBe(false);
    // The curtain, undiscounted, plus what the four beads still owed are worth.
    expect(race.worth).toBeGreaterThan(AI.weights.victory);
    expect(race.terms.map((term) => term.label)).toContain(
      'closing the great work — the realm that finishes it takes the game',
    );
    expect(JSON.stringify(race.terms)).toContain('the 4 beads still owed for the rod');

    // And a row that pays a bead outbids what the same town would otherwise
    // raise. The comparison is the build arm's own, off the same context.
    const town = state.cities.find((city) => city.ownerId === player.id)!;
    const term = raceTerm(ctx, { kind: 'building', id: race.opus });
    expect(term).not.toBeNull();
    expect(term!.value).toBeGreaterThan(0);
    expect(term!.label).toContain('one of 5 things still to happen');
    // A row that pays nothing toward the race carries no term at all.
    expect(raceTerm(ctx, { kind: 'building', id: 'granary' })).toBeNull();
    expect(town).toBeDefined();
  });

  it('takes the book over when the rod is full: the work, then the rows that pay beads', () => {
    // **The takeover, measured on an arranged board.** A full rod over an open
    // work: the busiest town starts the great work itself, and every other town
    // starts a row that pays a bead over the soldier and the caravan it would
    // otherwise have raised — because the race is now one thing away and its
    // whole worth is on that one thing (`stepsRemaining` is 1).
    //
    // Measured on this board (2026-09-05): the Magnum Opus scores 333 against
    // 150 for the next candidate, and Chart the Stars 169 against the same 150.
    // The race term is 150 of that 169 — the whole race over one remaining
    // thing, divided by the ten turns of patience a bead row is read at — so
    // without it Chart the Stars scores 19 and the soldier wins, which is what
    // the bot did before this batch.
    const { state, player } = raceBench({ towns: 3, turn: 120, beads: 20, alchemy: true });
    // A library apiece, so the age-four rows that pay beads are legal at all:
    // what is under test is the *ranking*, not whether a bench has a site.
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      city.buildings.push('library');
      bumpRevision(state);
      refreshCityDerived(state, city);
    }
    const ctx = valueContext(state, player);
    const race = ctx.race!;
    expect(race.needed).toBe(0);
    expect(race.live).toBe(true);
    expect(race.stepsRemaining).toBe(1);

    const started: string[] = [];
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      const item = chooseProduction(state, player, city);
      expect(item).not.toBeNull();
      expect(item!.kind).toBe('building');
      started.push(item!.id);
      // Every row chosen is a row that carries the race forward.
      expect(racePays({ kind: 'building', id: item!.id as never })).toBe(true);
    }
    // Exactly one town raises the work — the busiest, `isOpusTown`'s reading —
    // and the others take rows that pay beads.
    expect(started.filter((id) => id === race.opus).length).toBe(1);

    // And the winning candidate prints the race as one of its reasons.
    const decision = nextBotDecision(state, player.id);
    expect(decision?.kind).toBe('build');
    const chosen = decision!.candidates.find((candidate) => candidate.chosen)!;
    expect(JSON.stringify(chosen.terms)).toContain('a step of the bead race');
  });

  it('prints its zero when a rival holds the race whatever this empire builds', () => {
    // **Out of reach.** Nineteen beads against three, on a rate five times ours:
    // the rival closes long before this empire could, and since the victory
    // ruling of 2026-09-05 (schema 69) that is the whole of the reading —
    // whoever finishes the work wins it, so a rod this empire might still fill
    // behind them buys nothing. The chain is worth nothing and names them rather
    // than merely reading low, because a bot pouring hammers into a lost race is
    // the failure this clause exists to prevent.
    const { state, player } = raceBench({ towns: 3, turn: 120, beads: 3, rivalBeads: 19 });
    const ctx = valueContext(state, player);
    const race = ctx.race!;
    expect(race.rival?.beads).toBe(19);
    expect(race.rival!.close).toBeLessThan(race.delay);
    expect(race.lost).toBe(true);
    expect(race.live).toBe(false);
    expect(race.worth).toBe(0);
    // The *last* multiplication, which is the lost clause: the delay discount
    // ahead of it has already read zero on its own, and that is not the same
    // sentence — one says "not in this lifetime", the other names the winner.
    const zero = race.terms[race.terms.length - 1]!;
    expect(zero.op).toBe('mul');
    expect(zero.value).toBe(0);
    expect(zero.label).toContain('Brun');
    expect(zero.label).toContain('19 beads');
    expect(raceTerm(ctx, { kind: 'building', id: race.opus })).toBeNull();
  });
});

// --- batch 6 -----------------------------------------------------------------

/**
 * **The sitting** — one appraisal context per seat per turn (part 1 of batch 6).
 *
 * The claim is not "it is faster"; a clock is not a test. What is pinned is the
 * *shape* the speed comes from — one book per turn rather than one per decision
 * — and the two properties that make the shape safe: a seat never reads another
 * seat's sitting, and the spend arm asks the rules again at the moment it fires
 * rather than trusting a book that a purchase has since made stale.
 */
describe('the sitting', () => {
  it('builds one context for a seat’s whole turn, and one per seat', () => {
    const game = grownGame(6);
    // The context itself is the pin: a sitting holds exactly one, built by the
    // first arm that asks for it, and **the same object** is handed to every arm
    // after it. A per-decision build would hand out a new one each time.
    const sitting = botSitting(0);
    expect(sitting.ctx).toBeNull();
    const seen = new Set<unknown>();
    for (let ask = 0; ask < 8; ask++) {
      const command = nextBotCommand(game.state, 0, sitting);
      // The context is recorded before the break: a seat content to hand the
      // turn over has still *opened its books* to decide that it is content.
      if (sitting.ctx !== null) seen.add(sitting.ctx);
      if (command === null) break;
      dispatch(game, command);
    }
    expect(sitting.ctx).not.toBeNull();
    expect(sitting.ctx!.playerId).toBe(0);
    expect(seen.size).toBe(1);

    // A sitting opened for one seat is never read by another: the guard is the
    // seat id, and an arm handed a mismatched sitting builds a fresh context
    // rather than appraising one empire's board with another's book.
    const other = botSitting(1);
    nextBotCommand(game.state, 1, other);
    expect(other.ctx === null || other.ctx.playerId === 1).toBe(true);
    expect(other.ctx).not.toBe(sitting.ctx);
  });

  it('does not buy twice off a book a purchase has made stale', () => {
    // The half of the bargain that keeps "a refusal is a bug" true. The book is
    // built once; a purchase then stands the building up, and the very same book
    // still lists it. The arm asks `purchaseError` again at the moment it fires,
    // strikes the row, and hands the bank to the next want.
    const game = grownGame(RIPE);
    for (const player of realPlayers(game.state)) player.gold = 4000;
    const sitting = botSitting(0);
    const bought = new Set<string>();
    let refusals = 0;
    for (let ask = 0; ask < 60; ask++) {
      const decision = nextBotDecision(game.state, 0, sitting);
      if (decision === null) break;
      const result = dispatch(game, decision.command);
      if (!result.ok) refusals += 1;
      if (decision.command.type === 'purchaseItem') {
        const key = JSON.stringify(decision.command);
        // The same purchase is never proposed twice off the one book.
        expect(bought.has(key)).toBe(false);
        bought.add(key);
      }
      if (decision.kind === 'endTurn') break;
    }
    expect(refusals).toBe(0);
    expect(sitting.ctx).not.toBeNull();
  });
});

/**
 * **The negative-chain floor** (part 2). A held technology whose unbuilt rows owe
 * more hammers than finishing them would pay is *advice*, and advice worth less
 * than nothing is advice to withhold — its rows must never appraise worse than
 * they would in an empire that had never researched the node.
 */
describe('the negative-chain floor', () => {
  it('drops a held engine whose remaining worth has gone under, so its rows read chainless', () => {
    // **A marginal engine**: a held technology whose rows are dear in hammers and
    // thin in payoff, in a town too small to make the raising worth it. Before
    // the floor its chain sat in the book at a negative worth and every one of
    // its rows folded a share of that negative — so a library in an empire that
    // held Letters appraised *worse* than the same library in an empire that did
    // not, which is an empire punished for holding a technology.
    const bench = (population: number): { state: GameState; player: Player } => {
      const state = benchState(1);
      const player = seat(state, 0);
      grant(state, player, gatingTech('building', 'library') ?? undefined);
      // No plan at all, so every chain in the book is a held-tech chain and the
      // incumbent's exemption cannot be what is being observed. `researching` is
      // `null` for a seat aiming at nothing (presence-is-state, `tech.ts`).
      player.researching = null;
      delete player.researchQueue;
      for (const city of state.cities) {
        if (city.ownerId !== player.id) continue;
        city.population = population;
        refreshCityDerived(state, city);
      }
      return { state, player };
    };

    for (const population of [1, 2, 6]) {
      const { state, player } = bench(population);
      const ctx = valueContext(state, player);
      expect(incumbentGoal(player)).toBeNull();
      // Nothing negative survives in the book, at any size of town.
      for (const chain of ctx.chains) expect(chain.worth).toBeGreaterThan(0);
      // And no candidate anywhere reads worse for a chain than it would with no
      // chain at all: the share a build candidate folds is never negative.
      const decision = nextBotDecision(state, player.id);
      if (decision !== null && decision.kind === 'build') {
        for (const candidate of decision.candidates) {
          for (const term of candidate.terms) {
            if (!term.label.includes('engine —')) continue;
            expect(term.value).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('keeps the research goal’s honest negative — the margin is what abandons a plan', () => {
    // The other half, and it is deliberately the opposite rule: the incumbent is
    // a *plan*, and a plan whose worth has turned is a plan to abandon rather
    // than a term to hide. `techGoalTable`'s margin multiplies, so holding makes
    // it worse and the beeline is displaced.
    const game = grownGame(RIPE);
    for (const player of realPlayers(game.state)) {
      const ctx = valueContext(game.state, player);
      const incumbent = incumbentGoal(player);
      if (incumbent === null) continue;
      const first = ctx.chains[0];
      if (first === undefined) continue;
      // The plan is always first in the book when there is one, negative or not.
      expect(first.goal).toBe(incumbent);
    }
  });
});

/**
 * **The draft plan** (part 3) — culture as a priced currency, the expected best
 * of a dealt hand, and the pass.
 */
describe('the draft plan', () => {
  it('estimates the best of a hand from the draw’s own shape, with no roll at all', () => {
    // The estimator's three properties, each on a pool whose answer can be
    // written down by hand rather than measured.
    const pool = livePool(seat(benchState(1), 0).statecraft);
    expect(pool.length).toBeGreaterThan(3);

    // 1. **A one-card hand is that card.** One draw from one bag whose only
    //    member scores 10 is worth exactly 10.
    const one = expectedBestOrder([pool[0]!], 1, 0, () => 10);
    expect(one).toBe(10);

    // 2. **A wider hand is never worth less than a narrower one.** More draws
    //    can only raise a maximum, whatever the weights.
    const score = (id: string): number => id.length;
    let previous = -Infinity;
    for (const size of [1, 2, 3, 4, 5]) {
      const value = expectedBestOrder(pool, size, 0, score as never);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }

    // 3. **It lies between the pool's worst and its best**, always — an
    //    expectation of a maximum over cards drawn from that pool cannot leave
    //    the pool's own range.
    const values = pool.map((id) => score(id));
    const hand = expectedBestOrder(pool, 4, 0, score as never);
    expect(hand).toBeGreaterThanOrEqual(Math.min(...values));
    expect(hand).toBeLessThanOrEqual(Math.max(...values));

    // 4. **Nothing is rolled.** The same question twice is the same number, and
    //    an empty pool or an empty hand is nought rather than a throw.
    expect(expectedBestOrder(pool, 4, 0, score as never)).toBe(hand);
    expect(expectedBestOrder([], 4, 0, score as never)).toBe(0);
    expect(expectedBestOrder(pool, 0, 0, score as never)).toBe(0);
  });

  it('reads the pity: a passed draft makes the next hand worth more, never less', () => {
    // The whole reason a pass is worth anything. `rarityDrawWeight` adds
    // `skipPity` to the uncommon and rare rungs, so a bag drawn with a pass
    // banked leans toward the rarer cards — and if the rarer cards are the
    // better ones, the expected best of the hand rises.
    const pool = livePool(seat(benchState(1), 0).statecraft);
    const rarity = (id: string): number =>
      ({ common: 1, uncommon: 5, rare: 20 })[orderDef(id as never).rarity] ?? 0;
    const plain = expectedBestOrder(pool, 4, 0, rarity as never);
    const pitied = expectedBestOrder(pool, 4, 3, rarity as never);
    expect(pitied).toBeGreaterThan(plain);
  });

  it('prices culture off the draft, inside the band, and folds its worth from its terms', () => {
    const game = grownGame(RIPE);
    for (const player of realPlayers(game.state)) {
      const ctx = valueContext(game.state, player);
      const prior = yieldWeight(ctx.ai, 'culture', ctx.age);
      // The band, exactly as gold's and faith's.
      expect(ctx.prices.culture).toBeGreaterThanOrEqual(prior * ctx.ai.priorities.priceBandLow);
      expect(ctx.prices.culture).toBeLessThanOrEqual(prior * ctx.ai.priorities.priceBandHigh);
      expect(ctx.priceNotes.culture.length).toBeGreaterThan(0);
      // The book's culture plan is one row — the next draft — and its worth is
      // the fold of its own printed terms.
      expect(ctx.wants.culture.length).toBe(1);
      for (const want of ctx.wants.culture) {
        expect(want.currency).toBe('culture');
        expect(foldTerms(want.terms)).toBe(want.worth);
        // A want that names a purchase would be a want the arms could spend, and
        // nothing sells anything for culture.
        expect(want.buy).toBeUndefined();
      }
    }
  });

  it('is the one door every fold prices a point of culture at', () => {
    // Touch point (a), said for the third currency: `voiceWeight` answers the
    // price and not the table, so a culture yield is worth the same number
    // wherever in the bot it is read.
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    expect(voiceWeight(ctx, 'culture')).toBe(ctx.prices.culture);
    const printed = explainYields({ culture: 3 }, ctx);
    expect(printed.total).toBe(3 * ctx.prices.culture);
    expect(printed.terms[0]!.label).toContain('the culture price');
  });

  it('puts the pass on the table beside the cards, folded like any other candidate', () => {
    // The batch's other half of part 3: a draft arm that can only ever take a
    // card is an arm with one option. The pass is a candidate, its score folds
    // from its own terms, and it is compared against the best card on the table
    // by the ordinary argmax.
    const state = benchState(2);
    const player = seat(state, 0);
    player.statecraft.pendingOrder = { options: livePool(player.statecraft).slice(0, 3) };
    const decision = nextBotDecision(state, player.id);
    expect(decision?.kind).toBe('draft');
    const pass = decision!.candidates.find((candidate) => candidate.label === 'pass the hand');
    expect(pass).toBeDefined();
    expect(foldTerms(pass!.terms)).toBe(pass!.score);
    expect(pass!.terms.some((term) => term.label.includes('pity'))).toBe(true);
    // Whichever wins, the command matches the candidate that carries the mark.
    const chosen = decision!.candidates.find((candidate) => candidate.chosen)!;
    expect(decision!.command.type).toBe(
      chosen.label === 'pass the hand' ? 'skipOrderOffer' : 'chooseOrder',
    );
  });

  it('passes a hand it does not want — the bot’s first, and the reducer takes it', () => {
    // **The first pass this bot has ever taken.** Measured on the standard duel
    // (2026-09-05): three of the eight drafts inside sixty turns are passed, and
    // every one of them is a hand whose best card scored under what the
    // pity-improved next hand is worth. Before batch 6 the arm could not pass at
    // all — the comment above `orderDecision` said so, and said why.
    const game = createGame(CONFIG);
    const stepper = createBotStepper(game, { warn: () => {} });
    const passes: BotDecision[] = [];
    let drafts = 0;
    for (let turn = 0; turn < 60; turn++) {
      for (const step of stepper.playTurn()) {
        if (step.decision.command.type === 'chooseOrder') drafts += 1;
        if (step.decision.command.type !== 'skipOrderOffer') continue;
        // A pass this bot proposes is a pass the rules take.
        expect(step.result.ok).toBe(true);
        passes.push(step.decision);
      }
    }
    expect(drafts).toBeGreaterThan(0);
    expect(passes.length).toBeGreaterThan(0);
    for (const decision of passes) {
      const pass = decision.candidates.find((candidate) => candidate.label === 'pass the hand')!;
      const cards = decision.candidates.filter((candidate) => candidate.label !== 'pass the hand');
      expect(pass.chosen).toBe(true);
      // It won on the arithmetic, not on a rule: the pass beat every card.
      for (const card of cards) expect(pass.score).toBeGreaterThan(card.score);
      expect(foldTerms(pass.terms)).toBe(pass.score);
      expect(decision.summary).toContain('Passes the whole hand');
    }
  });
});

describe('the hammer price', () => {
  it('rides its band: dear while an engine waits, at the floor when none does', () => {
    const state = benchState(2);
    const player = seat(state, 0);
    grant(state, player, gatingTech('building', 'library') ?? undefined);
    const ctx = valueContext(state, player);
    const prior = yieldWeight(ctx.ai, 'production', ctx.age);
    const price = hammerPrice(ctx);
    expect(price).toBeGreaterThanOrEqual(prior * ctx.ai.priorities.priceBandLow);
    expect(price).toBeLessThanOrEqual(prior * ctx.ai.priorities.priceBandHigh);
    // A town that already holds every row its engines owe waits on nothing, and
    // its hammers price at the band's floor.
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      for (const chain of ctx.chains) {
        for (const step of chain.steps) {
          if (step.kind !== 'building') continue;
          if (!city.buildings.includes(step.id as never)) city.buildings.push(step.id as never);
          bumpRevision(state);
        }
      }
      refreshCityDerived(state, city);
      const floor = prior * ctx.ai.priorities.priceBandLow;
      expect(hammerPrice(ctx, city)).toBe(floor);
      // And at the floor the printed term is a **charge**, not a credit: hammers
      // nobody is waiting on are worth less than the table says they are.
      const term = hammerTerm(2, ctx, city)!;
      expect(term.value).toBe(2 * (floor - prior));
      expect(term.value).toBeLessThan(0);
      expect(term.label).toContain('nothing much waiting on them');
    }
  });

  it('folds as a difference from the table, so nothing pays for a hammer twice', () => {
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    const term = hammerTerm(2, ctx);
    if (term !== null) {
      const prior = yieldWeight(ctx.ai, 'production', ctx.age);
      // The term is the difference between the price and the table, times the
      // hammers — never the whole price, because `explainYields` has already
      // paid the table for them.
      expect(term.value).toBe(2 * (hammerPrice(ctx) - prior));
      expect(term.label).toContain('against the table');
    }
    // No hammers, no term. Ever.
    expect(hammerTerm(0, ctx)).toBeNull();
    expect(hammerTerm(-3, ctx)).toBeNull();
  });
});

describe('the focus arm', () => {
  /**
   * **The arm, on a board nobody arranged.** A bench of identical hills cannot
   * exercise this: the two sheets pick the same hexes when every hex is the
   * same, so the difference the arm exists to price is nought by construction.
   * The standard duel is where the two sheets actually disagree, and the arm is
   * reached there in both directions inside `FOCUS_TURNS`.
   */
  function playFocusSteps(turns: number): { decision: BotDecision; turn: number; ok: boolean }[] {
    const game = createGame(CONFIG);
    const stepper = createBotStepper(game, { warn: () => {} });
    const found: { decision: BotDecision; turn: number; ok: boolean }[] = [];
    for (let turn = 0; turn < turns; turn++) {
      for (const step of stepper.playTurn()) {
        if (step.decision.kind === 'focus') {
          found.push({ decision: step.decision, turn: step.turn, ok: step.result.ok });
        }
      }
    }
    return found;
  }

  /**
   * The one game, played once for the three claims below.
   *
   * Deterministic (`createGame` off a fixed config, `createBotStepper`'s own
   * loop), so three tests reading one run read exactly what three runs would
   * have said — and the window is long enough now that playing it three times is
   * a third of this file's wall clock for nothing.
   */
  let cached: { decision: BotDecision; turn: number; ok: boolean }[] | null = null;
  function focusSteps(turns: number): { decision: BotDecision; turn: number; ok: boolean }[] {
    if (cached === null) cached = playFocusSteps(turns);
    return cached;
  }

  // Re-aimed 2026-09-05 (the levy's own count, `isFieldSoldier`, and the focus
  // arm's idempotence pass): seat 0 leans its capital on the hammers at t29 and
  // its two other towns at t33 and t39, the first town is put back at t53, and
  // seat 1's town is told the balanced ordering at t44. The window is what the
  // two directions need on this board, not a number with an opinion — it was 40
  // while the arm's story ran from t32 to t35.
  const FOCUS_TURNS = 56;

  it('points a town at the hammers and takes it back, and the rules accept both', () => {
    // Measured on this board (2026-09-05): seat 0 leans its capital on the
    // hammers at t29 while an engine is waiting on them and puts a town back at
    // t53 when the engine is standing — which is the whole of the arm's
    // sentence, in both directions, on a board nobody arranged.
    const steps = focusSteps(FOCUS_TURNS);
    expect(steps.length).toBeGreaterThan(0);
    const words = steps.map((step) => (step.decision.command as { focus?: string }).focus);
    expect(words).toContain('production');
    expect(words).toContain('default');
    // A command this bot proposes is a command the rules take — the discipline
    // every arm keeps, and the reason `driver.ts` treats a refusal as a bug.
    for (const step of steps) expect(step.ok).toBe(true);
  });

  /** Every focus order on one played board must be a town's first that turn. */
  function expectOneOrderPerTownPerTurn(
    steps: readonly { decision: BotDecision; turn: number; ok: boolean }[],
  ): void {
    const last = new Map<number, string>();
    const perTurn = new Set<string>();
    for (const step of steps) {
      const command = step.decision.command as { cityId: number; focus: string };
      expect(last.get(command.cityId)).not.toBe(command.focus);
      last.set(command.cityId, command.focus);
      const key = `${step.turn}:${command.cityId}`;
      expect(perTurn.has(key)).toBe(false);
      perTurn.add(key);
    }
  }

  it('never asks the same town for the focus it already has, in one turn or across two', () => {
    // Idempotence by construction — the research plan's lesson, and what keeps
    // the driver's loop finite. It stands on three things, and all three are
    // `focusCommand`'s docblock:
    //
    //   · the appraisal is a function of the ground and of the sitting's frozen
    //     readings, never of the focus it is about — the two live readings go
    //     through `foodUnder`, which shifts the town's quote to the sheet in
    //     question rather than patching a staged total by a raw tile difference;
    //   · the seats it fills are `chooseCitizens`' own cap rather than the
    //     length of an assignment the arm's own command is about to refresh;
    //   · and the sitting will not ask a town twice, so a board that genuinely
    //     moves mid-turn (a card slotted, a hex bought) is re-read next turn
    //     rather than re-ordered this one.
    expectOneOrderPerTownPerTurn(focusSteps(FOCUS_TURNS));
  });

  it('holds its word on the board that used to burn a seat\'s whole command budget', () => {
    // The regression, pinned on the board it was measured on (2026-09-05, seed
    // 20260904 at t51): one town, six citizens, a quarter's worth of food
    // percentages on it — so eight bushels of ground moved the town's staged
    // food by ten, the growth charge read −3.1 with the town standing balanced
    // and −11.3 with it standing on the hammers, and the arm ordered it back and
    // forth until `driver.commandsPerSeat` cut the seat off. Fifty-two turns is
    // what it takes to reach; the claim is the same one the test above makes.
    //
    // Seed 20260903, not 20260905, since 2026-09-07: H11's cost scale (every
    // hammer price ×5 in Æra I) moved the board out from under its seed a second
    // time — 20260905 now raises no focus order inside fifty-two turns, exactly
    // as 20260904 stopped doing when H9 moved the start chooser, and a test that
    // pins nothing pins nothing. The neighbouring seed raises eighteen from turn
    // forty-one, every one accepted, and the claim is unchanged. (Measured with
    // the faith book's own batch held out: the same board raises them at HEAD
    // with H12 in and H11 out.)
    //
    // **Back to 20260905 on 2026-09-08**: batch S1 re-anchored the tech ladder
    // at 10 (`docs/flags.md` item (vv)), so every column above the second is
    // cheaper, the tree opens sooner and the boards moved a third time —
    // 20260903 now raises no focus order inside fifty-two turns and 20260905,
    // which stopped raising them under H11, raises six again from turn thirty,
    // every one accepted. Measured across eight neighbouring seeds under the new
    // ladder: 20260901 ten, 20260902 fourteen, 20260905 six, 20260908 eight,
    // 20260903 and 20260904 none. The seed is only the board this claim is
    // measurable on; the claim is the one the test above makes and has not
    // moved.
    const game = createGame({ ...CONFIG, seed: 20260905 });
    const stepper = createBotStepper(game, { warn: () => {} });
    const steps: { decision: BotDecision; turn: number; ok: boolean }[] = [];
    for (let turn = 0; turn < 52; turn++) {
      for (const step of stepper.playTurn()) {
        if (step.decision.kind === 'focus') {
          steps.push({ decision: step.decision, turn: step.turn, ok: step.result.ok });
        }
      }
    }
    expect(steps.length).toBeGreaterThan(0);
    expectOneOrderPerTownPerTurn(steps);
    for (const step of steps) expect(step.ok).toBe(true);
  });

  it('prints both readings and folds each candidate from its own terms', () => {
    const steps = focusSteps(FOCUS_TURNS);
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.decision.candidates.length).toBe(2);
      expect(step.decision.candidates.filter((candidate) => candidate.chosen).length).toBe(1);
      for (const candidate of step.decision.candidates) {
        expect(foldTerms(candidate.terms)).toBe(candidate.score);
        expect(partFailures(candidate.terms, candidate.label)).toEqual([]);
      }
      // The lean's own arithmetic: what the hexes pay, the hammer price's
      // difference from the table, and the growth it delays.
      const lean = step.decision.candidates.find((candidate) => candidate.label === 'work the hammers')!;
      expect(lean.terms[0]!.label).toContain('what the people would make');
      expect(step.decision.summary.length).toBeGreaterThan(0);
    }
  });

  it('charges the growth it delays the keep of the citizen it delays (batch X5b)', () => {
    // The arithmetic is pinned on an arranged bench in `aiAppraisal.test.ts`;
    // what this asks is that the line is *there* on a board the bot actually
    // played — a charge that only appears on an arranged bench is a charge no
    // game ever pays. Every growth term found carries the ground and the keep,
    // and the citizen's worth is the fold of the two.
    const steps = focusSteps(FOCUS_TURNS);
    const growths = steps
      .flatMap((step) => step.decision.candidates)
      .flatMap((candidate) => candidate.terms)
      .filter((term) => term.label.includes('the next citizen arrives in'));
    expect(growths.length).toBeGreaterThan(0);
    for (const growth of growths) {
      const printed = JSON.stringify(growth);
      expect(printed).toContain('the ground it would work');
      expect(printed).toContain('the contentment one more citizen demands');
      const worth = growth.parts!.find((part) => part.label.includes('what the next citizen is worth'))!;
      const keep = worth.parts!.find((part) => part.label.includes('contentment'))!;
      expect(keep.value).toBeLessThan(0);
      expect(foldTerms(worth.parts!)).toBe(worth.value);
      expect(foldTerms(growth.parts!)).toBe(growth.value);
    }
  });

  it('never points a puppet — the town that chooses for itself', () => {
    // `citizenFocusError` is the whole gate, and it refuses a puppet outright.
    const state = benchState(2);
    const player = seat(state, 0);
    for (const city of state.cities) {
      if (city.ownerId !== player.id) continue;
      city.puppet = true;
      refreshCityDerived(state, city);
    }
    for (let ask = 0; ask < 30; ask++) {
      const decision = nextBotDecision(state, player.id);
      if (decision === null) break;
      expect(decision.kind).not.toBe('focus');
      if (!applyOne(state, decision)) break;
    }
  });

  /** Applies one decision the way the driver would, and says whether it took. */
  function applyOne(state: GameState, decision: BotDecision): boolean {
    const game: Game = { state, config: CONFIG, log: [] };
    return dispatch(game, decision.command).ok;
  }

  /** Every nested part folds to the term above it — the race suite's walk. */
  function partFailures(terms: readonly ValueTerm[], where: string): string[] {
    const failures: string[] = [];
    for (const term of terms) {
      if (term.parts === undefined) continue;
      if (foldTerms(term.parts) !== term.value) {
        failures.push(`${where} → "${term.label}": parts fold to ${foldTerms(term.parts)}`);
      }
      failures.push(...partFailures(term.parts, `${where} → ${term.label}`));
    }
    return failures;
  }
});

/**
 * **The fold audit over batch 6's own terms.**
 *
 * `aiPersona.test.ts` pins that every candidate's score is the fold of its
 * terms; this is the other half of `decision.ts`' contract for the arithmetic
 * this batch added — every *nested* part folds to the term above it — and it is
 * asked only of the candidates that actually carry a new term, so a pass that
 * quietly stopped emitting them would fail the count rather than the fold.
 */
describe('batch 6’s terms', () => {
  it('fold to their own values wherever they are printed', () => {
    const marks = [
      'buy the engines', // the hammer premium
      'the culture price', // culture's shadow price, in a printed yield
      'pity', // the pass
      'what the people would make on the other hexes', // the focus arm
    ];
    const game = createGame(CONFIG);
    const stepper = createBotStepper(game, { warn: () => {} });
    const seen = new Set<string>();
    const failures: string[] = [];
    // Forty rather than thirty since batch 8: on the retuned sheet the focus arm
    // (and with it the hammer premium's positive face) is first reached at t32.
    for (let turn = 0; turn < 40; turn++) {
      for (const step of stepper.playTurn()) {
        for (const candidate of step.decision.candidates) {
          if (candidate.rejected !== undefined) continue;
          const printed = JSON.stringify(candidate.terms);
          for (const mark of marks) if (printed.includes(mark)) seen.add(mark);
          if (foldTerms(candidate.terms) !== candidate.score) {
            failures.push(`${step.decision.kind}/${candidate.label}: score is not its fold`);
          }
          failures.push(...auditParts(candidate.terms, `${step.decision.kind}/${candidate.label}`));
        }
      }
    }
    expect(failures).toEqual([]);
    // Every term this batch added is actually printed somewhere in forty turns
    // of a duel — the claim that keeps the audit above from being vacuous. The
    // hammer premium's *negative* face is not on the list and deliberately: a
    // duel's first thirty turns never run out of engines to raise, so the charge
    // for hammers nobody is waiting on is pinned directly instead (see 'folds as
    // a difference from the table').
    expect([...seen].sort()).toEqual([...marks].sort());
  });

  function auditParts(terms: readonly ValueTerm[], where: string): string[] {
    const failures: string[] = [];
    for (const term of terms) {
      if (term.parts === undefined) continue;
      if (foldTerms(term.parts) !== term.value) {
        failures.push(`${where} → "${term.label}": parts fold to ${foldTerms(term.parts)}`);
      }
      failures.push(...auditParts(term.parts, `${where} → ${term.label}`));
    }
    return failures;
  }
});

/**
 * **Batch 8 — the connection pass** (`docs/bot-priorities.md`).
 *
 * Four rulings, four claims, and every one of them is about a number the bot
 * used to *guess*: what a caravan is worth, what a market opens, which name in a
 * hand to call, and what a hex at the frontier is worth. The tests are shaped by
 * what they replaced — a flat weight, a first-legal pick, an arrangement nothing
 * ever revisited, and a gold sink the bot could not see at all.
 */
describe('batch 8 — the caravan and the route it would run', () => {
  /** The row that carries route slots, read off the marker exactly as the bot does. */
  const MARKET = BUILDING_IDS.find((id) => (buildingDef(id).routeSlots ?? 0) > 0)!;

  it('prices a caravan at the best route no caravan of this empire is running', () => {
    const state = benchState(2);
    const player = seat(state, 0);
    // A slot, so a caravan built today would have something to carry.
    const town = state.cities[0]!;
    town.buildings.push(MARKET);
    bumpRevision(state);
    refreshCityDerived(state, town);

    const ctx = valueContext(state, player);
    expect(ctx.routes.slots).toBeGreaterThan(0);
    expect(ctx.routes.free).toBeGreaterThan(0);
    expect(ctx.routes.open).not.toBeNull();
    const caravan = explainCaravan(ctx)!;
    expect(caravan).not.toBeNull();
    // The worth is the offer's pay times the stand-in for what the route reading
    // leaves unread (`score.caravanScale`, read off the sheet — the 2026-09-05
    // sweep put it at 3), and the fold is the computation.
    expect(caravan.total).toBe(ctx.routes.open!.pay.total * ctx.ai.score.caravanScale);
    expect(foldTerms(caravan.terms)).toBe(caravan.total);

    // **It moves with the route.** A destination with more people banks more off
    // the origin's shelves, so the same caravan is worth more to the same empire
    // — which is the whole of what the flat `weights.trader` guess could not say.
    const before = caravan.total;
    for (const city of state.cities) {
      city.population += 8;
      refreshCityDerived(state, city);
    }
    const richer = explainCaravan(valueContext(state, player))!;
    expect(richer.total).toBeGreaterThan(before);
  });

  it('refuses a caravan where there is no route for one, and names the rule that refused', () => {
    // A lone town has nowhere to send a route — the one refusal batch 4 left
    // standing — and an empire with no market has no slot to fill. Both are
    // *rules* rather than caps, and both are read off the board.
    const lone = benchState(1);
    const one = seat(lone, 0);
    expect(explainCaravan(valueContext(lone, one))).toBeNull();

    const pair = benchState(2);
    const two = seat(pair, 0);
    const ctx = valueContext(pair, two);
    expect(ctx.routes.slots).toBe(0);
    expect(explainCaravan(ctx)).toBeNull();
    expect(caravanRefusal(ctx)).toContain('market');
  });

  it('folds the route a market opens into its row, and only while every route is running', () => {
    const state = benchState(2);
    const player = seat(state, 0);
    // No market at all: every route this empire may run (none) is running, so
    // the row that opens the first one carries what that route would pay.
    const bound = valueContext(state, player);
    expect(bound.routes.bound).toBe(true);
    expect(bound.routes.next).not.toBeNull();
    const opened = explainBuildingRow(MARKET, bound);
    const term = opened.terms.find((row) => row.label.includes('it opens a route'));
    expect(term).toBeDefined();
    expect(term!.value).toBeGreaterThan(0);
    expect(foldTerms(opened.terms)).toBe(opened.total);

    // A slot standing free says nothing: the route is not waiting on a market,
    // it is waiting on a wagon, and the wagon has its own candidate.
    const town = state.cities[0]!;
    town.buildings.push(MARKET);
    bumpRevision(state);
    refreshCityDerived(state, town);
    const free = valueContext(state, player);
    expect(free.routes.bound).toBe(false);
    const quiet = explainBuildingRow(MARKET, free);
    expect(quiet.terms.find((row) => row.label.includes('it opens a route'))).toBeUndefined();
  });
});

describe('batch 8 — the name a hand calls', () => {
  it('calls the same person whichever order the hand deals it', () => {
    // **The first-legal pick, retired.** A bot that took the first name would
    // answer these two hands differently; a bot that appraises them answers the
    // same, because the hand's order is not a fact about either name.
    const state = benchState(2);
    const player = seat(state, 0);
    const families = new Map<string, string>();
    for (const id of GREAT_PERSON_IDS) {
      const family = greatPersonDef(id).family;
      if (!families.has(family)) families.set(family, id);
    }
    const [first, second] = [...families.values()];
    player.greatPersonOffer = { options: [first, second] as never };
    const forward = nextBotDecision(state, player.id)!;
    player.greatPersonOffer = { options: [second, first] as never };
    const reversed = nextBotDecision(state, player.id)!;
    const named = (decision: BotDecision, options: string[]): string =>
      options[(decision.command as { optionIndex: number }).optionIndex]!;
    expect(named(forward, [first!, second!])).toBe(named(reversed, [second!, first!]));

    // And the pick is the argmax of the printed table, so the feed and the
    // decision cannot disagree about why.
    const best = Math.max(...forward.candidates.map((row) => row.score));
    const chosen = forward.candidates.find((row) => row.chosen)!;
    expect(chosen.score).toBe(best);
    for (const row of forward.candidates) expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('still sends the first option when every name in the hand is spent', () => {
    // The redraw, byte-identical: the reducer's one refusal that mutates is what
    // an all-spent hand is *for*, and this batch left it alone.
    const state = benchState(1);
    const player = seat(state, 0);
    const options = GREAT_PERSON_IDS.slice(0, 2);
    player.greatPersonOffer = { options: [...options] as never };
    for (const id of options) state.recruited.push(id);
    const decision = nextBotDecision(state, player.id)!;
    expect((decision.command as { optionIndex: number }).optionIndex).toBe(0);
    expect(decision.summary).toContain('redraw');
    for (const row of decision.candidates) expect(row.rejected).toBeDefined();
  });
});

describe('batch 8 — the arrangement, improved once a turn', () => {
  /**
   * Two cards that fit the same office, one seated and one on the bench. Which
   * of the two is *better* is `explainCard`'s to say and not this test's, so
   * both arrangements are played and the claim is about the pair: the arm fires
   * for exactly one of them, and it fires in the direction the printed table
   * says.
   */
  function playArrangement(seated: OrderId, bench: OrderId, turns: number): BotDecision[] {
    const game = grownGame(6);
    const player = seat(game.state, 0);
    const sc = player.statecraft;
    const layout = slotTypesOf(sc);
    // Every other chair is **full and sealed**, so the only move on the board is
    // the swap: an empty chair anywhere would be `slottingDecision`'s to fill,
    // and a wildcard chair fits everything.
    const packing = ORDER_IDS.filter(
      (id) => id !== seated && id !== bench && orderDef(id).retired !== true,
    );
    sc.orders = [seated, bench];
    for (let index = 0; index < sc.slots.length; index++) {
      if (index === 0) continue;
      const filler = packing.find(
        (id) => orderFitsSlot(id, layout[index]!) && !sc.orders.includes(id),
      )!;
      sc.orders.push(filler);
      sc.slots[index] = { card: filler, sealedUntil: game.state.turn + 99 };
      bumpRevision(game.state);
    }
    // Unsealed by construction: an absolute turn already past.
    sc.slots[0] = { card: seated, sealedUntil: 0 };
    bumpRevision(game.state);
    const stepper = createBotStepper(game, { warn: () => {} });
    const found: BotDecision[] = [];
    for (let turn = 0; turn < turns; turn++) {
      for (const step of stepper.playTurn()) {
        const command = step.decision.command as { type: string; playerId: number };
        if (command.type === 'unslotOrder' && command.playerId === player.id) {
          found.push(step.decision);
        }
      }
    }
    return found;
  }

  function twoThatFit(): [OrderId, OrderId] {
    const game = createGame(CONFIG);
    const player = seat(game.state, 0);
    const type = slotTypesOf(player.statecraft)[0]!;
    const fitting = ORDER_IDS.filter(
      (id) => orderFitsSlot(id, type) && orderDef(id).retired !== true,
    );
    return [fitting[0]!, fitting[1]!];
  }

  it('swaps the better card in exactly once, and stays silent the other way round', () => {
    const [a, b] = twoThatFit();
    const forward = playArrangement(a, b, 1);
    const backward = playArrangement(b, a, 1);
    // One of the two arrangements is the wrong way round and exactly one is.
    expect(forward.length + backward.length).toBe(1);
    const moved = forward.length === 1 ? forward[0]! : backward[0]!;
    // The command names the chair the arrangement seated, and the chosen row is
    // the best of a table whose every score is its own fold.
    expect((moved.command as { slotIndex: number }).slotIndex).toBe(0);
    const chosen = moved.candidates.find((row) => row.chosen)!;
    expect(chosen.label).toContain('takes slot 1');
    for (const row of moved.candidates) {
      if (row.rejected !== undefined) continue;
      expect(foldTerms(row.terms)).toBe(row.score);
    }
  });

  it('does not oscillate: the swap is made, and the next turn asks nothing', () => {
    // The idempotence half of the ruling, and it is two rules at once: the card
    // that moved in is sealed (the gate refuses), and the card that came out is
    // not strictly better than the one that displaced it (the fold refuses).
    const [a, b] = twoThatFit();
    const forward = playArrangement(a, b, 2);
    const backward = playArrangement(b, a, 2);
    expect(forward.length + backward.length).toBe(1);
  });
});

describe('batch 8 — the hexes a town would buy', () => {
  const SILK = 'silk' as never;

  /** A bench of one town, a full purse, and the two frontier hexes it may buy. */
  function frontier(): {
    state: GameState;
    player: Player;
    city: City;
    offers: { col: number; row: number }[];
  } {
    const state = benchState(1);
    const player = seat(state, 0);
    player.gold = 2000;
    const city = state.cities[0]!;
    const offers = purchasableTiles(state, city)
      .filter((offer) => offer.error === null)
      .map((offer) => ({ col: offer.col, row: offer.row }));
    return { state, player, city, offers };
  }

  function wantAt(state: GameState, player: Player, at: { col: number; row: number }): Want {
    const book = valueContext(state, player).wants.gold;
    return book.find((row) => row.label.includes(`(${at.col},${at.row})`))!;
  }

  it('prices a hex whose luxury this empire owns no copy of above a plain one', () => {
    const { state, player, offers } = frontier();
    expect(offers.length).toBeGreaterThan(1);
    const seam = offers[1]!;
    // The plain hex is worth nothing at all on this bench and is *not* a want:
    // every hex here is the same grassland hill, so no citizen would move to it
    // and the book does not carry a row worth nought. That is the comparison —
    // the seam is the whole of the difference between the two hexes.
    const before = wantAt(state, player, seam);
    expect(before).toBeUndefined();
    getTileAt(state.map, seam.col, seam.row)!.resource = SILK;
    const second = wantAt(state, player, seam);
    expect(second).toBeDefined();
    expect(second.worth).toBeGreaterThan(0);
    expect(JSON.stringify(second.terms)).toContain('owns no copy of');
    // Every want in this book folds out of its own printed terms, tiles included.
    expect(foldTerms(second.terms)).toBe(second.worth);
    // And it is a want the arm could actually fire: the ground's own verb.
    expect(second.ground).toBeDefined();
    expect(second.buy).toBeUndefined();
  });

  it('reads uniqueness off the ground, never off access — an unimproved copy is a copy', () => {
    // **The ruling, pinned at the point the two readings disagree.** A silk
    // standing on this empire's own land with no plantation on it is a silk
    // nobody can draw on — `hasResource` says so — and it is nonetheless a copy,
    // because the value the bonus expresses is *potential* and the investment
    // that opens it is one this empire may make whenever it likes.
    const { state, player, city, offers } = frontier();
    const seam = offers[1]!;
    getTileAt(state.map, seam.col, seam.row)!.resource = SILK;
    expect(JSON.stringify(wantAt(state, player, seam).terms)).toContain('owns no copy of');

    // One copy inside the borders, unimproved, unworked, unrevealed by anything.
    const owned = state.map.tiles.find(
      (tile) =>
        state.tileOwner[state.map.width * tile.row + tile.col] === city.id &&
        tile.resource === undefined,
    )!;
    owned.resource = SILK;
    expect(hasResource(state, player.id, SILK)).toBe(false);
    expect(realmResources(state, player.id).has(SILK)).toBe(true);
    // The seam was the whole of what that hex was worth on this bench, so with
    // a copy owned the row is not merely cheaper: it is not a want at all.
    expect(wantAt(state, player, seam)).toBeUndefined();
  });

  it('gives the site scorer and the tile want one door onto that reading', () => {
    // A source pin, because the two arms are in two files and the ruling is that
    // they cannot disagree: the two bonuses are named in exactly one module —
    // the leaf that owns the reading — and everything else asks it.
    const sources = import.meta.glob('../../src/ai/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const naming: string[] = [];
    for (const path of Object.keys(sources).sort()) {
      const code = sources[path]!
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (/\bnewLuxuryBonus\b|\bnewStrategicBonus\b/.test(code)) {
        naming.push(path.slice(path.lastIndexOf('/') + 1));
      }
    }
    // `aiConfig.ts` *declares* the two numbers, which is the tuning surface's
    // job; `value.ts` is the only module that reads them.
    expect(naming).toEqual(['aiConfig.ts', 'value.ts']);
  });
});

/**
 * **Batch X6 — the hexes worth asking about.**
 *
 * `docs/audit/bot-pass-2.md`, Part 3: `tileWants` was 21% of a turn and bought
 * six hexes in a hundred and fifty, because it put every unowned frontier hex of
 * every town to `tilePurchaseError`, whose writ clause reads the empire's whole
 * happiness. The batch asks the rule about fewer hexes and changes what a quoted
 * hex is worth by nothing at all, and these are the three claims that says:
 *
 *   · a hex outside the bound is not priced — and *which* hexes fall outside it
 *     is the book's own ordering, worth per coin;
 *   · a hex still priced folds **identically**, term for term, with the door shut
 *     or open;
 *   · the town's own readings are taken once a town, not once a hex.
 */
describe('batch X6 — the hexes worth asking about', () => {
  const LUXURIES = ['silk', 'gold', 'gems', 'wine', 'ivory', 'furs', 'incense'] as never[];

  /**
   * A town with a full purse and a frontier of seams — one unheld luxury a hex,
   * so every offer is worth *something* and the offers are worth different
   * somethings (a seam's yields differ by kind). The bound has to choose.
   */
  function seamedFrontier(): { state: GameState; player: Player } {
    const state = benchState(1);
    const player = seat(state, 0);
    player.gold = 5000;
    const city = state.cities[0]!;
    // A small town rather than the bench's grown one, and the reason is X5b's
    // line: a town of six on a board at the happiness ceiling charges a citizen
    // more keep than a seam is worth, and every offer folds to nought. The claim
    // here is about *which* offers the bound keeps, so the bench is a town whose
    // next citizen is affordable.
    city.population = 2;
    refreshCityDerived(state, city);
    const offers = purchasableTiles(state, city).filter((offer) => offer.error === null);
    expect(offers.length).toBeGreaterThan(LUXURIES.length);
    for (let index = 0; index < LUXURIES.length; index++) {
      const offer = offers[index]!;
      getTileAt(state.map, offer.col, offer.row)!.resource = LUXURIES[index]!;
    }
    return { state, player };
  }

  /** Every hex row of a seat's gold book, in the order the book carries them. */
  function hexRows(state: GameState, player: Player, bound: boolean): Want[] {
    hexDoor.bound = bound;
    try {
      bumpRevision(state);
      return valueContext(state, player).wants.gold.filter((row) => row.ground !== undefined);
    } finally {
      hexDoor.bound = true;
    }
  }

  it('prices only the best few of a town’s frontier, and drops the rows it ranked last', () => {
    const { state, player } = seamedFrontier();
    const cap = AI.expansion.hexOffersPriced;
    const shut = hexRows(state, player, false);
    const open = hexRows(state, player, true);

    expect(shut.length).toBeGreaterThan(cap);
    expect(open.length).toBe(cap);

    // The kept rows are exactly the top of the shut book by worth per coin, ties
    // broken by the board's own order — `pricedOffers`' comparison, read back off
    // the unbounded book rather than typed in.
    const ranked = shut
      .map((row, index) => ({ row, index }))
      .sort((a, b) => worthPerCoin(b.row) - worthPerCoin(a.row) || a.index - b.index)
      .slice(0, cap)
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.row.label);
    expect(open.map((row) => row.label)).toEqual(ranked);
  });

  it('folds a hex it still prices exactly as it did unbounded — price, worth and every term', () => {
    const { state, player } = seamedFrontier();
    const shut = hexRows(state, player, false);
    const open = hexRows(state, player, true);
    expect(open.length).toBeGreaterThan(0);
    for (const row of open) {
      const before = shut.find((one) => one.label === row.label)!;
      expect(before).toBeDefined();
      expect(row.price).toBe(before.price);
      expect(row.worth).toBe(before.worth);
      expect(JSON.stringify(row.terms)).toBe(JSON.stringify(before.terms));
      expect(row.ground).toEqual(before.ground);
      // …and it still folds out of its own printed terms, which is the claim the
      // whole book is asked for elsewhere, asked again of the bounded walk.
      expect(foldTerms(row.terms)).toBe(row.worth);
    }
  });

  it('carries no want the rules would strike — the bound narrows, the rule refuses', () => {
    const { state, player } = seamedFrontier();
    const city = state.cities[0]!;
    for (const row of hexRows(state, player, true)) {
      const ground = row.ground!;
      expect(tilePurchaseError(state, player.id, city.id, { col: ground.col, row: ground.row })).toBe(
        null,
      );
    }
    // A frozen writ is the simulation's refusal and the bound does not step round
    // it: no purse and no ranking makes a hex buyable while the borders are shut.
    player.gold = 0;
    expect(hexRows(state, player, true)).toEqual([]);
  });

  it('takes the town’s own readings once a town, and the hex’s once a hex', () => {
    // A source pin, the register kind. The batch's other half is a *hoist*, and a
    // hoist is a claim about where a call sits rather than about a number: the
    // five town-level readings are taken in `tileWants`' own body, above the
    // walk, and the walk that prices hexes may not name them.
    const source = (
      import.meta.glob('../../src/ai/wants.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../src/ai/wants.ts']!
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    const body = (name: string): string => {
      const at = source.indexOf(`function ${name}(`);
      expect(at).toBeGreaterThan(0);
      const open = source.indexOf('\n}', at);
      return source.slice(at, open);
    };
    const count = (text: string, call: string): number =>
      text.split(`${call}(`).length - 1;

    const arm = body('tileWants');
    for (const reading of ['cityContext', 'citizenKeepTerm', 'bestExpansionTile', 'borderGrowth']) {
      expect([reading, count(arm, reading)]).toEqual([reading, 1]);
    }
    // The walk itself names none of them: it asks the ladder and the rule, and
    // spends the readings the arm handed it.
    const walk = body('pricedOffers');
    for (const reading of ['cityContext', 'citizenKeepTerm', 'bestExpansionTile', 'borderGrowth']) {
      expect([reading, count(walk, reading)]).toEqual([reading, 0]);
    }
    // And the expensive question is asked in exactly one place in the module.
    expect(count(source, 'tilePurchaseError')).toBe(1);
    expect(count(walk, 'tilePurchaseError')).toBe(1);
  });

  it('ships the door open, and it is not a knob', () => {
    // `scopeDoor`'s and `keepDoor`'s sentence a third time: the switch exists for
    // the acceptance bench, it is not in `data/ai.json`, no persona reads it and
    // the arena cannot see it. The *bound* is the knob beside it.
    expect(hexDoor).toEqual({ bound: true });
    expect(AI.expansion.hexOffersPriced).toBeGreaterThan(0);
  });
});

/**
 * **The marginal reading — batch F2 of `docs/fewer-things-plan.md`.**
 *
 * The debt batch A and batch F both wrote down: an engine is a card whose whole
 * text is a *multiplier* on something the empire already has — the other slotted
 * Orders' lines, the shelves a category of buildings stands on, the caravans on
 * the road — and a reading taken off the row alone is a number about nothing. So
 * such a row is priced by the difference the board itself reads,
 * `V(deck ∪ card) − V(deck)`, over the simulation's own per-turn books.
 *
 * The claims below are the batch's own, in its own order: the difference is
 * exactly what the books say it is; an engine is taken beside two flats when the
 * deck makes it worth taking and passed over when the deck is empty; a category
 * payoff is priced with the buildings it would multiply; and **every row that is
 * not an engine is appraised by exactly the walk it always was**, which is what
 * makes a board where no engine is offered byte-identical.
 */
describe('the marginal draft reading', () => {
  /**
   * A bench with a government, its chairs, and a deck arranged in them.
   *
   * The chairs are `councilOfElders`' — two economic and three wildcard — because
   * a wildcard admits any card, so a fourth Order joins the deck without having
   * to bench one of the three the case is about.
   */
  function deckBench(deck: readonly OrderId[], towns = 3): { state: GameState; player: Player } {
    const state = benchState(towns);
    const player = seat(state, 0);
    const sc = player.statecraft;
    sc.government = 'councilOfElders' as never;
    bumpRevision(state);
    sc.slots = slotTypesOf(sc).map(() => null);
    bumpRevision(state);
    sc.orders = [...deck];
    const layout = slotTypesOf(sc);
    for (const id of deck) {
      const chair = layout.findIndex(
        (type, index) => sc.slots[index] === null && orderFitsSlot(id, type),
      );
        bumpRevision(state);
      expect(chair, id).toBeGreaterThanOrEqual(0);
      sc.slots[chair] = { card: id, sealedUntil: 0 };
      bumpRevision(state);
    }
    for (const city of state.cities) refreshCityDerived(state, city);
    return { state, player };
  }

  /** The nine channels the reading weighs, off the board as it stands. */
  function reading(state: GameState, playerId: number): Record<string, number> {
    const rates = foldEmpireRates(state, playerId);
    return {
      food: rates.foodPerTurn ?? 0,
      production: rates.productionPerTurn ?? 0,
      gold: rates.goldPerTurn ?? 0,
      science: rates.sciencePerTurn ?? 0,
      culture: rates.culturePerTurn ?? 0,
      faith: rates.faithPerTurn ?? 0,
      renown: renownPerTurn(state, playerId),
      happiness: happinessOf(state, playerId),
      authority: authorityOf(state, playerId),
    };
  }

  it('is exactly the difference the simulation’s own books read', () => {
    // A deck that pays food off the hills every town of this bench stands on,
    // and the food amplifier offered into an empty wildcard chair.
    const { state, player } = deckBench(['terracedHillsides'] as OrderId[]);
    const ctx = valueContext(state, player);
    const margin = deckMargin(ctx, 'theHarvestHome' as never)!;
    expect(margin).not.toBeNull();

    // Now play the card for real — the same chair the reading chose, which is the
    // first one that admits it — and ask the books again.
    const sc = player.statecraft;
    const before = reading(state, player.id);
    const layout = slotTypesOf(sc);
    const chair = layout.findIndex(
      (type, index) => sc.slots[index] === null && orderFitsSlot('theHarvestHome' as never, type),
    );
      bumpRevision(state);
    sc.slots[chair] = { card: 'theHarvestHome' as never, sealedUntil: 0 };
    bumpRevision(state);
    const after = reading(state, player.id);

    // The expectation is folded in the reading's own order — the six voices, the
    // renown, the two meters, then the hammer premium — because a regrouped sum
    // is a different number and this test is an `===`.
    const terms: ValueTerm[] = [];
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      const delta = after[voice]! - before[voice]!;
      if (delta === 0) continue;
      terms.push({ label: voice, value: delta * voiceWeight(ctx, voice) });
    }
    const renown = after.renown! - before.renown!;
    if (renown !== 0) terms.push({ label: 'renown', value: renown * ctx.ai.weights.renown });
    for (const meter of ['happiness', 'authority'] as const) {
      const delta = after[meter]! - before[meter]!;
      if (delta === 0) continue;
      terms.push({ label: meter, value: delta * meterWeight(ctx, meter) });
    }
    const hammers = hammerTerm(after.production! - before.production!, ctx);
    if (hammers !== null) terms.push(hammers);

    expect(margin.total).toBe(foldTerms(terms));
    // And the appraisal's own contract: the number IS the fold of what it prints.
    expect(foldTerms(margin.terms)).toBe(margin.total);
    // The amplifier really did something on this board, or the case is vacuous.
    expect(after.food!).toBeGreaterThan(before.food!);
    expect(margin.total).toBeGreaterThan(0);
  });

  it('takes the food amplifier beside two flats when the deck pays food, and not when it is empty', () => {
    const deck = ['terracedHillsides', 'theUnbrokenLand', 'theFoundingOath'] as OrderId[];
    const flats = ['waysideShrines', 'firstRites'] as OrderId[];
    const engine = 'theHarvestHome' as OrderId;

    // The full deck: three food-paying Orders in their chairs, and the ground and
    // the shelves that make each of them pay.
    const loaded = deckBench(deck);
    for (const tile of loaded.state.map.tiles) tile.feature = 'forest' as never;
    for (const city of loaded.state.cities) {
      city.buildings.push('granary' as never, 'monument' as never, 'shrine' as never);
      bumpRevision(loaded.state);
      refreshCityDerived(loaded.state, city);
    }
    const withDeck = valueContext(loaded.state, loaded.player);
    const engineWorth = explainCard(loaded.player, engine, withDeck).total;
    for (const flat of flats) {
      expect(engineWorth, flat).toBeGreaterThan(explainCard(loaded.player, flat, withDeck).total);
    }

    // The same board, the same two flats, and no deck at all: the amplifier has
    // nothing to amplify and is worth exactly nothing.
    const bare = deckBench([]);
    for (const tile of bare.state.map.tiles) tile.feature = 'forest' as never;
    for (const city of bare.state.cities) {
      city.buildings.push('granary' as never, 'monument' as never, 'shrine' as never);
      bumpRevision(loaded.state);
      refreshCityDerived(bare.state, city);
    }
    const empty = valueContext(bare.state, bare.player);
    expect(deckMargin(empty, engine)!.total).toBe(0);
    const bareEngine = explainCard(bare.player, engine, empty).total;
    for (const flat of flats) {
      expect(bareEngine, flat).toBeLessThan(explainCard(bare.player, flat, empty).total);
    }
  });

  it('prices a category payoff with the buildings it would multiply', () => {
    const shelves = ['library', 'granary', 'monument'] as const;
    const bare = deckBench([]);
    const without = valueContext(bare.state, bare.player);
    expect(deckMargin(without, 'theScriveners' as never)!.total).toBe(0);

    const stocked = deckBench([]);
    for (const city of stocked.state.cities) {
      for (const id of shelves) city.buildings.push(id as never);
      bumpRevision(stocked.state);
      refreshCityDerived(stocked.state, city);
    }
    const with_ = valueContext(stocked.state, stocked.player);
    const margin = deckMargin(with_, 'theScriveners' as never)!;
    // Half of what the science shelves pay, through the town's own staged fold —
    // and it is a *reading*, so it folds out of its own printed terms exactly.
    expect(margin.total).toBeGreaterThan(0);
    expect(foldTerms(margin.terms)).toBe(margin.total);
    expect(margin.terms.some((term) => term.label.startsWith('science'))).toBe(true);
  });

  it('leaves every row that is not an engine appraised by exactly the walk it always was', () => {
    const game = grownGame(RIPE);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    let engines = 0;
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      const marginal = explainCardEffects(id, def.effects, ctx);
      const walked = explainEffects(def.effects, ctx, id);
      if (hasFoldReadEngine(def.effects)) {
        engines += 1;
        continue;
      }
      expect(marginal.total, id).toBe(walked.total);
      expect(marginal.terms, id).toEqual(walked.terms);
    }
    // The register: fourteen rows in the whole table carry a shape the fold reads,
    // and they are the only rows whose appraisal this batch moved.
    expect(engines).toBe(14);
    // Batch F named The Exchequer the deck's clearest trade payoff and the one
    // the bot most under-priced — `effectAmplifier` fell to `score.unknownEffect`,
    // six points for doubling every caravan in the realm. It is read by the books
    // now, and this is where that is written down.
    expect(hasFoldReadEngine(orderDef('theExchequer' as OrderId).effects)).toBe(true);
    // And the one target the books genuinely cannot carry keeps the stand-in: a
    // rite's duration is a stamp, not a rate.
    expect(hasFoldReadEngine([{ kind: 'effectAmplifier', target: 'riteDuration', percent: 50 }]))
      .toBe(false);
  });

  it('reads a card already in its chair as what it pays there, not as nothing', () => {
    // `reslotDecision` weighs the sitting card against the challenger in one
    // table, so a card that answered "nothing, I am already played" would be
    // swapped out of its chair for anything at all.
    const { state, player } = deckBench(['terracedHillsides', 'theHarvestHome'] as OrderId[]);
    const ctx = valueContext(state, player);
    const seated = deckMargin(ctx, 'theHarvestHome' as never)!;
    expect(seated.total).toBeGreaterThan(0);
  });

  it('rerolls exactly one draft, and never a paid one — the belief hand, free', () => {
    // **Re-aimed by batch H12** (ruling i, schema 80). The absence this pinned was
    // honest while every reroll cost faith; the pantheon's hand now asks nothing
    // the *first* time, so a bad hand is free to send back and a bot that never
    // sent one back was leaving a draw on the table. What is still pinned as an
    // absence is the paid half: the draft plan prices a *hand*, not a second one,
    // and no arm anywhere may pay for a redeal.
    const sources = import.meta.glob('../../src/ai/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const asking = Object.keys(sources).filter((path) => sources[path]!.includes("'rerollOffer'"));
    expect(asking.map((path) => path.split('/').pop())).toEqual(['bot.ts']);
    // The one arm that asks is gated on the asking being free — the sentence, in
    // the source, beside the command.
    expect(sources[asking[0]!]!).toContain('nextBeliefRerollCost(state, player.id) > 0');
  });
});

// --- batch H12: the faith book ----------------------------------------------

/**
 * **Batch H12 of `docs/bot-priorities.md`** — the faith book learns the faith
 * that shipped: a prophet priced by what it would actually do, a rite the bank
 * cannot yet pay kept in the book so there is something to save toward, the
 * ladder's own claim on the bank, the apostle's relic, and the free redeal.
 *
 * Every claim here is about *arithmetic printed on a row*, in the shape the rest
 * of this file uses: the worth is the fold of the terms, the price is the
 * simulation's own, and the acts are commands the reducer would take.
 */
describe('the faith book', () => {
  /** A bench with towns, a god in hand and a technology granted. */
  function faithful(towns: number, tech: string): { state: GameState; player: Player } {
    const state = benchState(towns);
    const player = seat(state, 0);
    for (const step of researchExpansion(state, 0, tech as never)) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    player.pantheon.beliefs = [BELIEF_IDS[0] as never];
    return { state, player };
  }

  it('prices a prophet by the faith it would found — the stones, the rungs, the trickle', () => {
    // **The ruling of 2026-09-07 (item bb).** A prophet used to meet one
    // constant; what it is worth now is the best act it has in it, and for a
    // seat with a god and no faith that act is the founding — read off the
    // improvement table, the belief bag and the trickle's own rows.
    const { state, player } = faithful(2, UNIT_UNLOCK_TECH.get('prophet' as never)!);
    player.faithPool = 900;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Prophet at '));
    expect(row).toBeDefined();
    expect(foldTerms(row!.terms)).toBe(row!.worth);
    const act = row!.terms[0]!;
    expect(act.label).toBe('the best act this prophet has in it — the faith it would found');
    const named = (act.parts ?? []).map((term) => term.label);
    expect(named).toContain('the stones it raises');
    expect(named).toContain('the rungs the founding deals');
    // The stones are the improvement's own row — every voice it pays, priced,
    // and nothing this file spelled by hand. (The value itself is folded at the
    // **prior**, which is the book's own standing bargain: a book priced at the
    // shadow prices it is about to set would be a fixed point.)
    const stones = (act.parts ?? []).find((term) => term.label === 'the stones it raises')!;
    const paid = bagOfTileYield(improvementYield(workForFamily('prophet')!));
    const voices = (['food', 'production', 'gold', 'science', 'culture', 'faith'] as const).filter(
      (voice) => (paid[voice] ?? 0) !== 0,
    );
    expect(voices.length).toBeGreaterThan(0);
    for (const voice of voices) {
      expect((stones.parts ?? []).some((term) => term.label.startsWith(voice)), voice).toBe(true);
    }
    expect(stones.value).toBeGreaterThan(0);
    // And it is the **two** rungs the founding deals — the hand it deals and the
    // hand it owes — best first, out of a bag `poolBeliefs` says has them.
    const rungs = (act.parts ?? []).find((term) => term.label === 'the rungs the founding deals')!;
    expect(poolBeliefs('follower').length).toBeGreaterThan(1);
    expect((rungs.parts ?? []).map((term) => term.label)).toEqual([
      'the best follower belief the founding could take',
      'the next best, for the hand the founding owes',
    ]);
    expect(rungs.parts![0]!.value).toBeGreaterThanOrEqual(rungs.parts![1]!.value);
    expect(rungs.value).toBeCloseTo(rungs.parts![0]!.value + rungs.parts![1]!.value, 9);
  });

  it('keeps the appetite as the floor under a founding, never as a second payment', () => {
    // The knob is the design addendum and the beeline leans on it; the board's
    // reading is a rate of a dozen points a turn. Adding them would pay twice for
    // one religion, so the appetite is printed as the *difference* — and vanishes
    // the day the board reads higher.
    const { state, player } = faithful(2, UNIT_UNLOCK_TECH.get('prophet' as never)!);
    player.faithPool = 900;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Prophet at '))!;
    const floor = row.terms.find((term) => /stated appetite for a first faith/.test(term.label));
    expect(floor).toBeDefined();
    expect(row.worth).toBeCloseTo(AI.religion.prophetTechValue, 9);
    expect(row.terms[0]!.value + floor!.value).toBeCloseTo(row.worth, 9);
  });

  it('prices a prophet in a founded empire by the rung it would draw', () => {
    // The other act, and the one the old book had no reading of at all: an empire
    // that has founded is buying a belief, out of the pool the simulation would
    // draw from.
    const { state, player } = faithful(2, UNIT_UNLOCK_TECH.get('prophet' as never)!);
    const religion = foundReligion(state, player);
    player.faithPool = 900;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Prophet at '))!;
    expect(row.terms[0]!.label).toBe(
      `the best act this prophet has in it — another rung of ${religion.name}`,
    );
    expect(foldTerms(row.terms)).toBe(row.worth);
    // No appetite floor once the faith is founded: the appetite is about the
    // *first* one, and `ValueContext.faithAppetite` switches off with it.
    expect(row.terms.some((term) => /stated appetite/.test(term.label))).toBe(false);
  });

  it('keeps a rite the bank cannot yet pay in the book, and saves toward it', () => {
    // **The finding this batch was aimed at.** `riteError` asks about the bank
    // last, exactly as `purchaseError` does, so a rite two turns of faith away was
    // falling out of the book entirely: the empire then had no faith want at all,
    // priced its bank at the band's floor, and banked a currency it had told
    // itself was worthless.
    const { state, player } = faithful(1, 'divination');
    for (const city of state.cities) city.buildings.push('chapel');
    bumpRevision(state);
    player.faithPool = 0;
    const ctx = valueContext(state, player);
    const rite = ctx.wants.faith.find((want) => /^Omen Reading at |^Blessing/.test(want.label));
    expect(rite).toBeDefined();
    expect(rite!.outOfReach).toBe(true);
    // A row the rules would refuse today carries no command, which is the spend
    // arm's contract.
    expect(rite!.rite).toBeUndefined();
    expect(rite!.price).toBe(riteCostFor(state, player.id));
    // And it is what the bank is now being held for.
    const holding = ctx.wants.faith.find((want) => want.holding === 'saving');
    expect(holding).toBeDefined();
    expect(ctx.priceNotes.faith).not.toContain('nothing this empire could buy');
  });

  it('does not save faith the ladder is about to spend at the deal', () => {
    // **Ruling i, schema 80**: the pantheon's hand opens by itself and takes its
    // rung the moment the bank covers it. Faith spoken for is not faith a prophet
    // may be saved toward, and the hold row's wait says so.
    const { state, player } = faithful(2, UNIT_UNLOCK_TECH.get('prophet' as never)!);
    // Short of the prophet's price (so the row is one to save toward) and well
    // clear of the rung's (so the ladder's claim is what moves the wait).
    player.faithPool = 110;
    const ctx = valueContext(state, player);
    const rung = ctx.wants.faith.find((want) => want.label.startsWith('the next consecration'));
    expect(rung).toBeDefined();
    const holding = ctx.wants.faith.find((want) => want.holding === 'saving' && want.label.includes('Prophet'));
    expect(holding).toBeDefined();
    const rate = foldEmpireRates(state, player.id).faithPerTurn ?? 0;
    const spare = Math.max(0, player.faithPool - rung!.price);
    expect(holding!.delay).toBeCloseTo((holding!.price - spare) / Math.max(1, rate), 9);
  });

  it('prices an apostle by the relic it would leave, and walks it there', () => {
    // A relic is a placed shelf paying a standing trickle in a town that has
    // topped out its cathedral, so it is priced exactly as a bought shelf is —
    // the town's own yields asked hypothetically — and the piece has an arm of
    // its own for the first time.
    const { state, player } = faithful(2, UNIT_UNLOCK_TECH.get('apostle' as never)!);
    const town = state.cities[0]!;
    town.buildings.push('cathedral');
    bumpRevision(state);
    refreshCityDerived(state, town);
    player.faithPool = 900;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Apostle at '));
    expect(row).toBeDefined();
    expect(row!.terms[0]!.label).toBe(`the relic it would leave at ${town.name}`);
    expect(row!.terms[0]!.value).toBeGreaterThan(0);
    expect(foldTerms(row!.terms)).toBe(row!.worth);
  });

  it('takes the free redeal of a below-average belief hand, and pays for none', () => {
    // The pantheon's hand asks nothing the first time (`explainBeliefRerollCost`),
    // so a hand whose best god is below what an average draw from the bag would
    // give is a hand worth sending back for nothing.
    const { state, player } = faithful(1, 'divination');
    player.pantheon.beliefs = [];
    player.faithPool = 400;
    openFaithLadder(state);
    const offer = player.pantheon.pending;
    expect(offer).toBeDefined();
    const ctx = valueContext(state, player);
    // Deal it the worst gods in the bag, so the redeal is the honest answer.
    const ranked = [...beliefPool(state, player)].sort(
      (a, b) => explainCard(player, a as never, ctx).total - explainCard(player, b as never, ctx).total,
    );
    offer!.options = ranked.slice(0, offer!.options.length) as never;
    const asked = nextBotDecision(state, player.id);
    expect(asked?.command.type).toBe('rerollOffer');
    expect(nextBeliefRerollCost(state, player.id)).toBe(0);
    // The best gods, and it takes one instead — the arm is a comparison, not a
    // habit.
    offer!.options = ranked.slice(-offer!.options.length).reverse() as never;
    expect(nextBotDecision(state, player.id)?.command.type).toBe('chooseBelief');
    // And a hand already asked again costs faith, so the arm stands down — which
    // is what keeps the driver's loop finite.
    offer!.options = ranked.slice(0, offer!.options.length) as never;
    offer!.rerolls = 1;
    expect(nextBeliefRerollCost(state, player.id)).toBeGreaterThan(0);
    expect(nextBotDecision(state, player.id)?.command.type).toBe('chooseBelief');
  });

  it('holds the free redeal while a Doctrine stands, and takes it the step after', () => {
    // **Batch H5, handed over from H14.** `rerollOffer` is one verb over four
    // hands and it answers the heaviest on the table (`rerollKindFor`): since the
    // Doctrine draft joined that ladder, a seat holding a Doctrine *and* a belief
    // hand that sent the command would be buying a **Doctrine** redeal, for
    // faith, off the arm that decided a belief was worth sending back.
    //
    // So the arm holds — and holding costs it nothing, which is the point.
    // `firstBlocker` raises the same four hands in the same order and the bot
    // answers one per step, so the Doctrine goes on this step and the free redeal
    // on the next, with the hand untouched and its first asking still free.
    const { state, player } = faithful(1, 'divination');
    player.pantheon.beliefs = [];
    player.faithPool = 400;
    openFaithLadder(state);
    const offer = player.pantheon.pending;
    expect(offer).toBeDefined();
    const ctx = valueContext(state, player);
    const ranked = [...beliefPool(state, player)].sort(
      (a, b) => explainCard(player, a as never, ctx).total - explainCard(player, b as never, ctx).total,
    );
    // The worst gods in the bag: on its own this is the hand the arm sends back.
    offer!.options = ranked.slice(0, offer!.options.length) as never;
    expect(nextBeliefRerollCost(state, player.id)).toBe(0);
    expect(nextBotDecision(state, player.id)?.command.type).toBe('rerollOffer');

    // Now put a Doctrine draft on the table beside it. The verb would redeal
    // *that*, so the belief arm stands down and the seat answers the Doctrine.
    player.statecraft.pendingDoctrine = { options: poolDoctrines(4).slice(0, 3) };
    expect(player.statecraft.pendingDoctrine.options.length).toBeGreaterThan(0);
    expect(rerollKindFor(player)).toBe('doctrine');
    const first = nextBotDecision(state, player.id);
    expect(first?.command.type).toBe('chooseDoctrine');

    // And the step after — the Doctrine answered, the hand as bad as it was, the
    // first asking still free — the redeal is back.
    delete player.statecraft.pendingDoctrine;
    expect(nextBeliefRerollCost(state, player.id)).toBe(0);
    expect(nextBotDecision(state, player.id)?.command.type).toBe('rerollOffer');
  });
});

// --- batch X3: the faith book prices the piece -------------------------------

/**
 * **The audit's finding 3** (`docs/audit/bot-pass-2.md`): *"faith rides its
 * ceiling and buys nothing."* Measured at t120 on the audit's own bench, all
 * four seats read a faith price of **9.00 — the band's ceiling — with 29 to 55
 * faith banked and nothing bought at all**, because the only rows cheaper than a
 * rite were priced wrong in three different ways. The three are one sentence
 * each and they are three separate claims below:
 *
 *   · a **faith house** (the Mosque, the Wat, the Gurdwara, the Dar-e Mehr —
 *     batch B3, bought with faith and only in a town that keeps the faith that
 *     opened it) folded `explainBuildingRow`, which is *what a row gives beyond
 *     a yield*, and not the `foldCity` delta its gold-bought sibling has folded
 *     since batch 1. A Gurdwara's kitchen, school and faith priced at **zero**;
 *   · a **Knights Templar** — a twelve-strength heavy horse that fights as
 *     whatever mounted row the age has taught this empire (`UnitDef.mirrors`) —
 *     fell to *"worth at least the faith it costs"*, so the piece was priced as a
 *     function of its own price and of nothing else;
 *   · `ownsAny` barred a **second** copy of any faith row for ever, whatever the
 *     levy looked like.
 *
 * The bench itself is recorded in `docs/bot-priorities.md` under "Batch X3", and
 * with it the honest reading these four cases exist because of: on the two audit
 * seeds no seat ever opens a faith house or a Templar at all, so the boards that
 * *found* the defect cannot measure the fix. These are the arranged boards where
 * the rows exist.
 */
describe('batch X3 — the faith book prices the piece', () => {
  /**
   * A founded faith with the beliefs named, and towns that keep it.
   *
   * The congregation is set the way `cathedral.test.ts` sets one — every citizen
   * of the town follows, so the majority `cityReligion` asks for is strict — and
   * the religion itself is the simulation's own (`foundReligion`), so the
   * follower and enhancer bags are the ones the rules read.
   */
  function keeping(
    towns: number,
    tech: string,
    follower: readonly string[],
    enhancer: readonly string[],
  ): { state: GameState; player: Player } {
    const state = benchState(towns);
    const player = seat(state, 0);
    grant(state, player, tech);
    const religion = foundReligion(state, player);
    for (const id of follower) religion.follower.push(id as never);
    for (const id of enhancer) religion.enhancer.push(id as never);
    for (const city of state.cities) city.followers = { [religion.id]: city.population };
    bumpRevision(state);
    return { state, player };
  }

  /**
   * A technology that has taught this empire a horse — the mirror measures a
   * Templar against the best **mounted** row the age has opened, and a bank that
   * has no such row to measure against refuses the sale outright
   * (`mirrorRowFor` answers `null`, `explainPurchaseCost` prices nothing). Read
   * off the roster's own unlock table rather than named, so the day the tree
   * moves the horse under it the case follows.
   */
  const MOUNTED = UNIT_UNLOCK_TECH.get('horseman' as never) ?? 'divination';

  it('prices a following town’s Gurdwara by the five yields it would bank', () => {
    const { state, player } = keeping(2, 'divination', ['theOpenKitchen'], []);
    player.faithPool = 2000;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Gurdwara at '));
    expect(row).toBeDefined();
    expect(foldTerms(row!.terms)).toBe(row!.worth);
    // The first term is the gold loop's own first term, word for word: what the
    // town would actually make with it, staged by the real arithmetic.
    const made = row!.terms[0]!;
    expect(made.label).toBe('what this town would actually make with it');
    // Its five yields, by voice — the row pays +3 food, +2 science and +3 faith,
    // and every one of them is named in the parts rather than folded away.
    const voices = (made.parts ?? []).map((term) => term.label);
    expect(voices.some((label) => /^food \+3 /.test(label))).toBe(true);
    expect(voices.some((label) => /^science \+2 /.test(label))).toBe(true);
    expect(voices.some((label) => /^faith \+3 /.test(label))).toBe(true);
    expect(made.value).toBeGreaterThan(0);
    // **And what it was worth before.** The row carries no happiness, no writ, no
    // renown and no effects at all, so everything the old loop could read about it
    // — `explainBuildingRow` less the upkeep — folds to nothing, and a want worth
    // nothing is a want no bank ever spends on.
    const beyond = explainBuildingRow('gurdwara' as never, ctx).total;
    expect(beyond).toBe(0);
    expect(row!.worth).toBeGreaterThan(beyond);
  });

  it('prices a Templar as the horse it fights as, not as the faith it costs', () => {
    const { state, player } = keeping(1, MOUNTED, [], ['holyOrder']);
    player.faithPool = 2000;
    const ctx = valueContext(state, player);
    const row = ctx.wants.faith.find((want) => want.label.startsWith('Knights Templar at '));
    expect(row).toBeDefined();
    expect(foldTerms(row!.terms)).toBe(row!.worth);
    // Not the lump. That clause is the floor under a row nothing can read, and a
    // heavy horse is not one.
    expect(row!.terms.some((term) => /worth at least the faith it costs/.test(term.label))).toBe(
      false,
    );
    const soldier = row!.terms[0]!;
    expect(soldier.label).toBe('what this soldier is worth');
    const parts = soldier.parts ?? [];
    expect(parts[0]!.label).toBe('what this piece is worth as a soldier');
    // **The mirror names the horse, and the strength it lends.** `mirrorRowFor`
    // is the simulation's own answer to "which row does this one shadow for this
    // empire today", so the term prints a roster name rather than a guess.
    const mirrored = mirrorRowFor(state, player.id, 'knightsTemplar' as never)!;
    expect(mirrored).not.toBeNull();
    const lift =
      unitDef(mirrored).combatStrength - unitDef('knightsTemplar' as never).combatStrength;
    const mirror = parts[1]!;
    expect(mirror.label).toContain(`it rides as the ${unitDef(mirrored).name}`);
    expect(mirror.label).toContain(`${lift > 0 ? '+' : ''}${lift} strength`);
    expect(mirror.value).toBe(lift * ctx.ai.weights.military);

    // **And the strength it prints is the strength the simulation stamps.** The
    // one clause of the rules `mirrorTerm` restates is the stamp `realiseItem`
    // composes, so the coupling is pinned by buying the piece and reading what the
    // board actually put on it.
    const bought = applyCommand(state, {
      type: 'purchaseItem',
      playerId: player.id,
      cityId: row!.buy!.cityId,
      item: row!.buy!.item,
      currency: 'faith',
    } as never);
    expect(bought.ok).toBe(true);
    const piece = state.units.find((unit) => unit.type === ('knightsTemplar' as never))!;
    expect(piece).toBeDefined();
    expect(unitStampStrength(piece)).toBe(lift);
  });

  it('prices a second Templar against the levy rather than refusing it', () => {
    const { state, player } = keeping(1, MOUNTED, [], ['holyOrder']);
    player.faithPool = 2000;
    const first = valueContext(state, player).wants.faith.find((want) =>
      want.label.startsWith('Knights Templar at '),
    )!;
    expect(first).toBeDefined();
    // One called. Before this batch `ownsAny` struck the row out of the book for
    // the rest of the game; now it stays, and what it is worth falls by what the
    // levy already has standing.
    const bought = applyCommand(state, {
      type: 'purchaseItem',
      playerId: player.id,
      cityId: first.buy!.cityId,
      item: first.buy!.item,
      currency: 'faith',
    } as never);
    expect(bought.ok).toBe(true);
    // A turn on: a town buys one unit of a class a turn (`City.purchasedUnitTurns`,
    // absolute stamps), and that refusal is the simulation's own rather than the
    // book's — what is under test is what the row is *worth* once the rules will
    // sell a second one at all.
    state.turn += 1;
    bumpRevision(state);
    const second = valueContext(state, player).wants.faith.find((want) =>
      want.label.startsWith('Knights Templar at '),
    );
    expect(second).toBeDefined();
    expect(foldTerms(second!.terms)).toBe(second!.worth);
    const levy = second!.terms.find((term) => /of a levy already standing/.test(term.label));
    expect(levy).toBeDefined();
    expect(levy!.label).toMatch(/and holds 1 —/);
    expect(levy!.value).toBeLessThan(0);
    expect(second!.worth).toBeLessThan(first.worth);
  });

  it('spends a faith bank the old book would have held', () => {
    // The acceptance, on a board where the rows exist: the first thing this seat
    // does with its faith is buy the house, where before the batch the want was
    // worth nothing and every point of the bank was held against a rite.
    const { state, player } = keeping(2, 'divination', ['theOpenKitchen'], []);
    player.faithPool = 400;
    const decision = nextBotDecision(state, player.id);
    expect(decision?.command.type).toBe('purchaseItem');
    expect((decision!.command as { currency?: string }).currency).toBe('faith');
    expect((decision!.command as { item?: { id?: string } }).item?.id).toBe('gurdwara');
    const spent = applyCommand(state, decision!.command as never);
    expect(spent.ok).toBe(true);
    expect(player.faithPool).toBeLessThan(400);
  });
});

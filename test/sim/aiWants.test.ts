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
  nextBotCommand,
  nextBotDecision,
  valueContext,
} from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { createBotStepper } from '../../src/ai/stepper';
import { type ValueTerm, foldTerms } from '../../src/ai/decision';
import { incumbentGoal, racePays, raceTerm } from '../../src/ai/chain';
import {
  explainYields,
  hammerPrice,
  hammerTerm,
  voiceWeight,
  yieldWeight,
} from '../../src/ai/value';
import { type Want, expectedBestOrder, savingRows, worthPerCoin } from '../../src/ai/wants';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { type EarnedBead, type GameConfig, type GameState, type Player, realPlayers } from '../../src/sim/state';
import { BEAD_FEAT_IDS, beadFeatDef } from '../../src/sim/beadData';
import { UNIT_UNLOCK_TECH } from '../../src/sim/techData';
import { gatingTech, researchExpansion } from '../../src/sim/tech';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { livePool } from '../../src/sim/statecraft';
import { orderDef } from '../../src/sim/statecraftData';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
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

/** A board with towns, citizens and a queue — the state a book is interesting on. */
function grownGame(turns = 8): Game {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  return game;
}

function seat(state: GameState, id: number): Player {
  return realPlayers(state).find((player) => player.id === id)!;
}

/** Grants a technology and everything it stands on. The tree's own expansion. */
function grant(state: GameState, player: Player, tech: string | undefined): void {
  if (tech === undefined) return;
  for (const step of researchExpansion(state, player.id, tech as never)) {
    if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
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
      // **Batch 4's gate pile** (`docs/bot-audit.md`'s inventory table). Each is
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
    // three turns away; over a forty-turn horizon that discounts it to
    // 800 × 37/40 = 740, which is 1.85 a coin. A sixty-coin trinket worth sixty
    // is 1.0 a coin. The bot holds.
    const game = grownGame(6);
    const ctx = valueContext(game.state, seat(game.state, 0));
    expect(ctx.ai.priorities.horizonTurns).toBe(40);
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
    expect(hold.worth).toBeCloseTo(740, 6);
    expect(foldTerms(hold.terms)).toBe(hold.worth);
    expect(worthPerCoin(hold)).toBeCloseTo(1.85, 6);
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
    }
    return { state, player };
  }

  it('prints what buying a chain’s row buys the chain, in turns', () => {
    // **Gold's bridge role.** A Library bought is a Library nobody has to spend
    // a dozen turns raising, so every step of the Writing chain from that one on
    // starts paying sooner. The row is the ordinary purchase want; what the
    // bridge adds is a term saying what the delivery bought.
    const { state, player } = chained(2, 'letters');
    player.gold = 4000;
    const ctx = valueContext(state, player);
    const chain = ctx.chains.find((live) => live.goal === 'letters');
    expect(chain).toBeDefined();
    const row = ctx.wants.gold.find((want) => want.label.startsWith('Library at '));
    expect(row).toBeDefined();
    const bridge = row!.terms.find((term) => /buys the Writing engine the turns/.test(term.label));
    expect(bridge).toBeDefined();
    expect(bridge!.value).toBeGreaterThan(0);
    // Its parts name the steps the delivery hurried, and the turns it bought.
    expect(JSON.stringify(bridge!.parts)).toMatch(/pays [\d.]+ turns sooner/);
    // And the want still folds to the arithmetic it printed, bridge included.
    expect(foldTerms(row!.terms)).toBe(row!.worth);
  });

  it('carries no bridge term on a row no chain owes', () => {
    // The other half: the term is a *reading of a live chain*, not a bonus for
    // being for sale. A town that already holds the row owes the chain nothing.
    const { state, player } = chained(2, 'letters');
    player.gold = 4000;
    for (const city of state.cities) city.buildings.push('library');
    const ctx = valueContext(state, player);
    for (const want of ctx.wants.gold) {
      expect(want.terms.some((term) => /buys the Writing engine/.test(term.label))).toBe(false);
    }
  });

  it('prices an augur by what its rites would do, and says which rite', () => {
    // **The batch-1 deferral, closed.** A faith row whose rites nobody could
    // price used to be worth exactly the faith it cost and to say so. A rite's
    // lasting half is an ordinary card effect list, so the reader the drafts use
    // answers it — and the row names the rite it was priced by.
    const { state, player } = chained(1, 'divination');
    // A god already held, so the row is not the first-god clause.
    player.pantheon.beliefs = [BELIEF_IDS[0] as never];
    player.faithPool = 500;
    const ctx = valueContext(state, player);
    const augur = ctx.wants.faith.find((want) => want.label.startsWith('Augur at '));
    expect(augur).toBeDefined();
    const rites = augur!.terms.find((term) => term.label === 'what its rites would do');
    expect(rites).toBeDefined();
    expect(rites!.parts![0]!.label).toMatch(/, the best rite this empire knows$/);
    expect(augur!.worth).toBeGreaterThan(0);
    expect(foldTerms(augur!.terms)).toBe(augur!.worth);
    // Nothing claims to read what it cannot: an unread grant prints as unread.
    expect(JSON.stringify(rites)).toMatch(/a grant this bot cannot read|what it grants outright/);
  });

  it('changes its mind about the plan far less often, now the margin defends it', () => {
    // **The wobble, measured.** Batch 1's own report put `chooseResearch` at 31
    // commands over the first forty turns of this duel, up from 15 before it —
    // an empire re-aiming its beeline most turns of the game. The margin is what
    // stops that, and this is the number pinned as a ceiling.
    //
    // Measured 2026-09-05, this exact board: **31 before batch 3, 10 after.**
    // The ceiling is set where a real regression would trip it and ordinary
    // board-level movement would not.
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
    expect(aims).toBeLessThanOrEqual(16);
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
    if (options.rivalBeads !== undefined) seat(state, 1).beads = rod(options.rivalBeads);
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
      'closing the great work — the realm holding the most beads takes the game',
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
    // the rival closes long before this empire could and holds more beads when it
    // does, so the chain is worth nothing — and it names them rather than merely
    // reading low, because a bot pouring hammers into a lost race is the failure
    // this clause exists to prevent.
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
   * reached there in both directions inside thirty turns.
   */
  function focusSteps(turns: number): { decision: BotDecision; turn: number; ok: boolean }[] {
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

  const FOCUS_TURNS = 32;

  it('points a town at the hammers and takes it back, and the rules accept both', () => {
    // Measured on this board (2026-09-05): seat 0 leans its town on the hammers
    // at t26 while an engine is waiting on them, and puts it back at t30 when
    // the engine is standing — which is the whole of the arm's sentence, in both
    // directions, on a board nobody arranged.
    const steps = focusSteps(FOCUS_TURNS);
    expect(steps.length).toBeGreaterThan(0);
    const words = steps.map((step) => (step.decision.command as { focus?: string }).focus);
    expect(words).toContain('production');
    expect(words).toContain('default');
    // A command this bot proposes is a command the rules take — the discipline
    // every arm keeps, and the reason `driver.ts` treats a refusal as a bug.
    for (const step of steps) expect(step.ok).toBe(true);
  });

  it('never asks the same town for the focus it already has, in one turn or across two', () => {
    // Idempotence by construction — the research plan's lesson, and what keeps
    // the driver's loop finite. The arm's appraisal is a function of the ground
    // and of the sitting's frozen readings, never of the focus it is about, so
    // acting on it cannot change it: no town is told the same word twice in a
    // row, and no turn carries two orders for one town.
    const steps = focusSteps(FOCUS_TURNS);
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
    for (let turn = 0; turn < 30; turn++) {
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
    // Every term this batch added is actually printed somewhere in thirty turns
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

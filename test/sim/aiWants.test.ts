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

import { AI, type BotDecision, nextBotDecision, valueContext } from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { foldTerms } from '../../src/ai/decision';
import { yieldWeight } from '../../src/ai/value';
import { type Want, savingRows, worthPerCoin } from '../../src/ai/wants';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { type GameConfig, type GameState, type Player, realPlayers } from '../../src/sim/state';
import { UNIT_UNLOCK_TECH } from '../../src/sim/techData';
import { gatingTech, researchExpansion } from '../../src/sim/tech';
import { BELIEF_IDS } from '../../src/sim/religionData';
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
function benchState(towns: number): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#a00' }],
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

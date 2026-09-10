/**
 * **The bot's wager** — which of the three bars a seat stakes, and what having
 * staked one does to everything else it decides (batch **W2**, `docs/wager.md`
 * §6, `docs/bot-priorities.md`).
 *
 * What was here before
 * --------------------
 * Batch G2 left a placeholder with a date on it: `wagerDecision` staked **index
 * nought**, the same card the phase's own default would give an empty chair.
 * Measured on the turn-100 bench that is a seat which mostly misses — a quarter
 * of a wager kept per seat and three eighths of a malice seated — so the Æra II
 * judgement seated a malice in most bot councils, and a council with a
 * vermilion chair in it makes a fifth less culture than one without.
 *
 * The stake, in one sentence
 * --------------------------
 * A stake is worth **the extra bead it pays over clearing the same card
 * unstaked** (`stakeBeads` less `otherBeads`) if the bar is reached, and costs
 * **a malice** if it is not — so the appraisal is one expected value over a
 * probability-like margin:
 *
 *     margin(i) = min(1, projected(i) ÷ bar(i))
 *     value(i)  = margin × (stakeBeads − otherBeads) × weights.bead
 *                 − (1 − margin) × what a malice costs
 *
 * The other two cards are worth the same to this seat whichever one it stakes —
 * a wager is a bar any number of seats may clear, and clearing one you did not
 * stake still pays `otherBeads` — so they fall out of the comparison entirely
 * and what is left is exactly the two lines above. Highest wins, ties by the
 * order the cards were dealt in, and the whole thing is a pure function of the
 * board (hard rule 2: no `Math.random`, arrays in file order).
 *
 * What `projected` is, and the two crudenesses in it
 * -------------------------------------------------
 * A **flow** card counts from the deal, so on the one turn a seat may answer the
 * table its standing is nought by construction and there is nothing to
 * extrapolate from. What the bot reads instead is the realm's own books —
 * `turnReadings`' twelve accumulators, taken again here off the same Ledger fold
 * the phase takes them off (`ledgerFold.ts`) — and projects `standing + rate ×
 * turns left`. The two flow readings that are **not** accumulators (renown, the
 * kill ledger) are real lifetime counters, so those are projected off the pace
 * the realm has actually kept.
 *
 * A **standing** card reads the board now, and what it is projected forward by
 * is the realm's own drift: `standing ÷ turns played`, the pace it has managed
 * so far, times `ai.wager.driftWeight`. Floored at the standing, because a bar
 * a realm has already cleared is cleared whatever its pace says next.
 *
 * Both are crude and both are written down as crude. The drift on a **clause**
 * card is the crudest of the lot — "two of three clauses in sixty turns" is not
 * really a rate — and it is kept because the alternative is a per-reading model
 * of what makes a realm grow, which is the whole bot said again inside a corner
 * of it.
 *
 * `turnReadings` is not exported from `src/sim/wagers.ts` and this file may not
 * reach into the phase, so the flow bag below is a **second reading of the same
 * folds**, deliberately: it is the bot's own estimate of its own books, exactly
 * as `explainEffects` is the bot's own opinion about a card, and the opinion
 * never leaves `src/ai/`.
 *
 * The lean
 * --------
 * A staked bar joins the want book as a **stock** — the bar less the standing,
 * priced at what closing it is worth per unit (`WantBook.wager`) — and the
 * appraisal spends it two ways, both bounded and both printed:
 *
 *   · **the voice**, through `voiceWeight`: a card quoted in gold, in beakers,
 *     in culture or in faith raises what one more point of that voice a turn is
 *     worth, up to the same band ceiling every other price is clamped into;
 *   · **the appetite**, through `wagerAppetiteTerm`: a standing card counting
 *     towns, buildings or wonders adds one line to the arm that would raise one.
 *
 * It is a **lean and never a lock**. Nothing here refuses anything, nothing
 * gates a verb, and `ai.wager.leanWeight: 0` plays exactly the bot that shipped
 * before this batch — which is what makes the whole of it an arena A/B.
 *
 * It is a leaf on purpose: `value.ts` owns the two levers and knows nothing
 * about the deck, `wants.ts` puts the stock in the book, and `bot.ts` sends the
 * command. Nothing imports this back.
 */

import { type Appraisal, type ValueTerm, appraise, foldTerms } from './decision';
import {
  type ValueContext,
  type Voice,
  type WagerAppetite,
  type WagerLean,
  delayDiscount,
  explainEffects,
} from './value';

import { capitalCityOf } from '../sim/cities';
import { explainEmpireGold } from '../sim/empireGold';
import { foldLedgerClass, ledgerBagOfCity, ledgerBagOfEmpire } from '../sim/ledgerFold';
import { MALICE_IDS, maliceDef } from '../sim/maliceData';
import { happinessOf } from '../sim/meters';
import type { GameState, Player, WagerDeal } from '../sim/state';
import {
  type WagerCount,
  type WagerId,
  WAGER_RULES,
  isWagerId,
  wagerBar,
  wagerDef,
} from '../sim/wagerData';
import {
  chooseWagerError,
  openWagerDeal,
  wagerClaimedBy,
  wagerCount,
  wagerStakeOf,
  wagerStanding,
} from '../sim/wagers';
import { foldEmpireRates } from '../sim/yields/empire';
import { worldAgeCountdown } from '../sim/worldClock';

// --- what a reading is asking for --------------------------------------------

/** Which voices a reading is quoted in, and which appetite it raises. */
interface WagerAim {
  voices: readonly Voice[];
  appetite: WagerAppetite | null;
}

const NO_AIM: WagerAim = { voices: [], appetite: null };
const ALL_VOICES: readonly Voice[] = ['food', 'production', 'gold', 'science', 'culture', 'faith'];

/**
 * **What each reading is a reading of** — the lean's whole vocabulary, and a
 * `Record` rather than a `switch` for the reason the phase's own `switch` exists:
 * the day the deck learns a new reading this stops compiling until somebody says
 * what leaning toward it would even mean.
 *
 * Most rows aim at nothing, and that is the honest answer rather than a gap. A
 * bar counting citizens in the capital is not a bar one more coin a turn brings
 * closer, and a lean that pretended otherwise would be the bot leaning on
 * whatever it happened to have an arm for.
 *
 * **A row names a voice only where the voice's own coin *accumulates into the
 * bar*** — which is the units rule, and the first cut of this table got it
 * wrong. The premium a voice earns is "one more point a turn banks `turnsLeft`
 * of them by the close", and that sentence is only true of a lifetime flow and
 * of the treasury. It is *not* true of a bar quoted as a **rate** (the food a
 * realm spares in one turn, learning per citizen, what its buildings pay) and it
 * is not true of a bar counting **things** (towns, wonders, clauses held): one
 * more hammer a turn does not raise a third of a wonder. Measured, the wrong
 * version cost the mean seat nine per cent of its production and a fifth of its
 * gold, because five of the eight bench seeds deal a clause row and every one of
 * them pegged a voice at the band's ceiling for forty turns. Those rows lean
 * through the **appetite** instead, or through nothing at all.
 */
const WAGER_AIM: Record<WagerCount, WagerAim> = {
  capitalCitizens: NO_AIM,
  capitalBuildings: { voices: [], appetite: 'building' },
  capitalWonders: { voices: [], appetite: 'wonder' },
  cities: { voices: [], appetite: 'city' },
  armyStrength: NO_AIM,
  treasury: { voices: ['gold'], appetite: null },
  foodSurplus: NO_AIM,
  sciencePerCitizen: NO_AIM,
  wondersOfThisAge: { voices: [], appetite: 'wonder' },
  happiness: NO_AIM,
  authority: NO_AIM,
  buildingYields: { voices: [], appetite: 'building' },
  capturedThisAge: NO_AIM,
  farmFood: NO_AIM,
  capitalTileYields: NO_AIM,
  tradeYields: { voices: ['gold'], appetite: null },
  religionYields: { voices: ['faith'], appetite: null },
  peopleYields: NO_AIM,
  wonderYields: { voices: [], appetite: 'wonder' },
  deckYields: { voices: ['culture'], appetite: null },
  connectionGold: { voices: ['gold'], appetite: null },
  science: { voices: ['science'], appetite: null },
  culture: { voices: ['culture'], appetite: null },
  gold: { voices: ['gold'], appetite: null },
  renown: NO_AIM,
  allVoices: { voices: ALL_VOICES, appetite: null },
  happinessSurplus: NO_AIM,
  unitHammers: NO_AIM,
  killsMinusLosses: NO_AIM,
};

/** Every reading one card asks for — one for a plain row, all of them for a clause row. */
function countsOf(id: WagerId): readonly WagerCount[] {
  const reads = wagerDef(id).reads;
  if (reads.shape === 'count') return [reads.count];
  return reads.clauses.map((clause) => clause.count);
}

/**
 * The readings that count only the **seat of government**. Three of them, and
 * they are told apart by name because that is what the deck calls them — a
 * capital-scoped bar is not a bar a second town can help with.
 */
const CAPITAL_COUNTS: readonly WagerCount[] = [
  'capitalCitizens',
  'capitalBuildings',
  'capitalWonders',
  'capitalTileYields',
];

/** Does this card count only the capital? Then the appetite names one town. */
function isCapitalScoped(id: WagerId): boolean {
  const counts = countsOf(id);
  return counts.length > 0 && counts.every((count) => CAPITAL_COUNTS.includes(count));
}

/**
 * One card's aim: the union of its clauses', first appetite winning.
 *
 * **A clause row names no voice at all**, and that is the units rule again: its
 * standing is *how many clauses hold* and its bar is the clause count, so its
 * shortfall is quoted in clauses and no amount of gold a turn is one of them.
 */
function aimOf(id: WagerId): WagerAim {
  const clauses = wagerDef(id).reads.shape === 'clauses';
  const voices: Voice[] = [];
  let appetite: WagerAppetite | null = null;
  for (const count of countsOf(id)) {
    const aim = WAGER_AIM[count];
    if (!clauses) for (const voice of aim.voices) if (!voices.includes(voice)) voices.push(voice);
    if (appetite === null) appetite = aim.appetite;
  }
  return { voices, appetite };
}

// --- the rates a projection is made on ---------------------------------------

/**
 * **One turn's figure for the twelve kept readings**, taken in one pass — the
 * phase's own `turnReadings` (`src/sim/wagers.ts`), said again on this side of
 * the fence because the phase does not export it.
 *
 * One pass rather than twelve calls for the phase's stated reason: six of the
 * twelve are classes of the same Ledger bag, and that bag is the most expensive
 * reading in the game outside a pathfind. It is asked **once per age per seat**
 * — the stake is answered on the deal turn and never again — so the cost lands
 * on three turns of a whole game.
 */
function flowRates(state: GameState, playerId: number): Partial<Record<WagerCount, number>> {
  const bag = ledgerBagOfEmpire(state, playerId);
  const seat = capitalCityOf(state, playerId);
  const rates = foldEmpireRates(state, playerId);

  let connections = 0;
  for (const line of explainEmpireGold(state, playerId)) {
    if (line.source.split(' · ')[0] === 'City connections') connections += line.gold;
  }

  const food = rates.foodPerTurn ?? 0;
  const production = rates.productionPerTurn ?? 0;
  const gold = rates.goldPerTurn ?? 0;
  const science = rates.sciencePerTurn ?? 0;
  const culture = rates.culturePerTurn ?? 0;
  const faith = rates.faithPerTurn ?? 0;

  return {
    capitalTileYields: seat ? foldLedgerClass(ledgerBagOfCity(state, seat), 'tiles') : 0,
    tradeYields: foldLedgerClass(bag, 'trade'),
    religionYields: foldLedgerClass(bag, 'religion'),
    peopleYields: foldLedgerClass(bag, 'people'),
    wonderYields: foldLedgerClass(bag, 'wonders'),
    deckYields: foldLedgerClass(bag, 'deck'),
    connectionGold: Math.max(0, connections),
    science,
    culture,
    gold,
    allVoices: food + production + gold + science + culture + faith,
    happinessSurplus: Math.max(0, happinessOf(state, playerId)),
  };
}

// --- what a malice costs -----------------------------------------------------

const MALICE_MEMO = new WeakMap<ValueContext, number>();

/**
 * **What the mean malice would cost this empire** — the deck priced through the
 * appraisal's own fold of a slotted card.
 *
 * A malice *is* a card: twelve rows of the very effect vocabulary
 * `explainEffects` already reads, seated in a chair for an age. So the price is
 * the mean of what the deck's rows would do to this board, taken as a **rate**
 * and turned into a stock by `score.lumpTurns` — the one exchange rate this bot
 * quotes a stock at, the same twenty turns that turn a great person's purse into
 * an income. Negated, because what the stake buys is the *avoidance*.
 *
 * The mean rather than the worst, and rather than a draw: the deck is drawn from
 * at the judgement and the seat has no say in which row it takes, so the honest
 * figure at the moment of staking is the expectation over the whole deck.
 *
 * `ai.wager.malicePenalty` overrides it with a flat figure when a sheet sets one
 * — the arena's way of asking how afraid of the chair a seat should be without
 * changing what the deck holds.
 *
 * Memoised on the context, `faithPrice`'s bargain exactly: twelve appraisals is
 * a real cost and every candidate on the table wants the same answer.
 */
export function malicePrice(ctx: ValueContext): number {
  const flat = ctx.ai.wager.malicePenalty;
  if (flat > 0) return flat;
  const held = MALICE_MEMO.get(ctx);
  if (held !== undefined) return held;
  // Set before the walk: `explainEffects` reads a voice weight, and a voice
  // weight reads the lean, and a lean that asked for this again would recurse.
  MALICE_MEMO.set(ctx, 0);
  let sum = 0;
  for (const id of MALICE_IDS) sum += explainEffects(maliceDef(id).effects, ctx).total;
  const mean = MALICE_IDS.length === 0 ? 0 : sum / MALICE_IDS.length;
  const price = Math.max(0, -mean) * Math.max(1, ctx.ai.score.lumpTurns);
  MALICE_MEMO.set(ctx, price);
  return price;
}

// --- the projection ----------------------------------------------------------

/** How long until the age closes — the clock's own figure, or the sheet's assumption. */
export function turnsToClose(state: GameState, ctx: ValueContext, deal: WagerDeal): number {
  const countdown = worldAgeCountdown(state);
  if (countdown !== null) return Math.max(1, countdown.turnsLeft);
  const elapsed = Math.max(0, state.turn - deal.dealtOn);
  return Math.max(1, Math.floor(ctx.ai.wager.ageTurns) - elapsed);
}

/** One card, as this seat reads it: where it stands, where it would end, and how near. */
export interface WagerReading {
  id: WagerId;
  name: string;
  bar: number;
  standing: number;
  /** The figure this seat would reach by the close, on its own books. */
  projected: number;
  /** `min(1, projected ÷ bar)` — the probability-like margin the stake is scored on. */
  margin: number;
  /** What the projection was made on, in the reading's own coin. */
  rate: number;
  /** The bar less the standing, never below nought. */
  shortfall: number;
}

/**
 * **Where one card would end up**, on this seat's own books.
 *
 * `rates` is handed in rather than taken here, because the flow bag is one
 * Ledger fold and all three cards on the table share it.
 */
export function readWager(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  id: WagerId,
  age: number,
  turnsLeft: number,
  rates: Partial<Record<WagerCount, number>>,
): WagerReading {
  const def = wagerDef(id);
  const bar = wagerBar(id, age);
  const standing = wagerStanding(state, player.id, id, age);
  const rate = rateOf(state, player, ctx, def.kind, id, age, rates);
  const grown = standing + rate * turnsLeft;
  const projected = def.kind === 'flow' ? grown : Math.max(standing, grown);
  const margin = bar <= 0 ? 0 : Math.min(1, Math.max(0, projected / bar));
  return {
    id,
    name: def.name,
    bar,
    standing,
    projected,
    margin,
    rate,
    shortfall: Math.max(0, bar - standing),
  };
}

/**
 * **The pace one card is projected forward at**, in the reading's own coin a
 * turn.
 *
 * Three arms, and the split is the module docblock's: a flow whose reading is
 * one of the phase's accumulators is projected off the realm's books; a flow
 * whose reading is a lifetime counter a *verb* keeps (renown, the kill ledger)
 * is projected off the pace that counter has actually kept; and a standing card
 * is projected off the drift of the board itself.
 */
function rateOf(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  kind: 'flow' | 'standing',
  id: WagerId,
  age: number,
  rates: Partial<Record<WagerCount, number>>,
): number {
  const drift = ctx.ai.wager.driftWeight;
  const played = Math.max(1, state.turn);
  if (kind === 'flow') {
    const reads = wagerDef(id).reads;
    if (reads.shape !== 'count') return 0;
    const kept = rates[reads.count];
    if (kept !== undefined) return kept;
    // A lifetime counter a **verb** keeps (renown, the kill ledger): the phase
    // never samples it, so the pace this realm has actually kept is the reading.
    return (wagerCount(state, player.id, reads.count) / played) * drift;
  }
  return (wagerStanding(state, player.id, id, age) / played) * drift;
}

// --- the stake ---------------------------------------------------------------

/** One card on the table, appraised — or refused by the rules before it was. */
export interface WagerOption extends WagerReading {
  index: number;
  /** The fold of `terms`. */
  score: number;
  terms: ValueTerm[];
  /** The simulation's own refusal (`chooseWagerError`), when there is one. */
  rejected: string | null;
}

/** The three cards, appraised, and the one this seat would stake. */
export interface WagerStake {
  deal: WagerDeal;
  age: number;
  turnsLeft: number;
  malice: number;
  options: WagerOption[];
  best: WagerOption | null;
}

/**
 * **What this seat would stake, and why** — the whole of the decision, exported
 * so the feed, the tests and `bot.ts` all read the one appraisal.
 *
 * `null` when there is no table to answer: no deal open, or a deal this seat has
 * already answered. Every option carries `chooseWagerError`'s own sentence when
 * the rules refuse it, so the arm can never propose a command the reducer would
 * turn down — the driver's rule that a refusal is a bug.
 */
export function appraiseWagers(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): WagerStake | null {
  const deal = openWagerDeal(state);
  if (deal === null) return null;
  const age = deal.age;
  const turnsLeft = turnsToClose(state, ctx, deal);
  const rates = flowRates(state, player.id);
  const malice = malicePrice(ctx);
  const bead = ctx.ai.weights.bead;
  // **The stake's own premium**: a card cleared pays `otherBeads` whether or not
  // it was staked, so what staking buys is the difference and nothing more.
  const premium = Math.max(0, WAGER_RULES.stakeBeads - WAGER_RULES.otherBeads) * bead;

  const options: WagerOption[] = [];
  for (let index = 0; index < deal.dealt.length; index += 1) {
    const id = deal.dealt[index];
    const rejected = chooseWagerError(state, player.id, index);
    if (id === undefined || !isWagerId(id)) {
      options.push({
        index,
        id: 'unknown' as WagerId,
        name: `card ${index + 1}`,
        bar: 0,
        standing: 0,
        projected: 0,
        margin: 0,
        rate: 0,
        shortfall: 0,
        score: 0,
        terms: [],
        rejected: rejected ?? 'that card is not in this build',
      });
      continue;
    }
    const reading = readWager(state, player, ctx, id, age, turnsLeft, rates);
    const terms: ValueTerm[] = [
      {
        label:
          `${round(reading.margin * 100)}% of the way to ${round(reading.bar)} by the close — ` +
          `${round(reading.standing)} now, ${round(reading.rate)} a turn for ${turnsLeft} turns`,
        value: reading.margin * premium,
      },
      {
        label: `and ${round((1 - reading.margin) * 100)}% of a malice in the council if it is not`,
        value: (1 - reading.margin) * malice,
        op: 'sub',
      },
    ];
    options.push({
      ...reading,
      index,
      score: foldTerms(terms),
      terms,
      rejected,
    });
  }

  let best: WagerOption | null = null;
  for (const option of options) {
    if (option.rejected !== null) continue;
    // **Ties by the order the cards were dealt in** — a strict `>` and a walk in
    // index order, which is the tie-break every sweep in this game uses.
    if (best === null || option.score > best.score) best = option;
  }
  return { deal, age, turnsLeft, malice, options, best };
}

// --- the lean ----------------------------------------------------------------

/**
 * **The bar this seat has staked, priced as a stock** — `ValueContext.wager`,
 * built once per sitting and spent by `voiceWeight` and `wagerAppetiteTerm`.
 *
 * `null` on every seat with no live stake, and — this is the half that takes the
 * lean off the board rather than leaving it running for ever — on a seat whose
 * staked card is **already claimed**. A bar that is met is a bar that pays
 * whatever the empire does next, so leaning on it after the fact would be the
 * bot chasing a bead it has already banked.
 *
 * Cheap on purpose: one `wagerStanding` for one card. It is asked of every
 * sitting, where the stake's own appraisal is asked three times a game.
 */
export function wagerLeanOf(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): WagerLean | null {
  if (ctx.ai.wager.leanWeight <= 0) return null;
  const deal = openWagerDeal(state);
  if (deal === null) return null;
  const index = wagerStakeOf(player, deal.age);
  if (index === null) return null;
  if (wagerClaimedBy(deal, player.id, index)) return null;
  const id = deal.dealt[index];
  if (id === undefined || !isWagerId(id)) return null;
  const def = wagerDef(id);
  const bar = wagerBar(id, deal.age);
  if (bar <= 0) return null;
  const standing = wagerStanding(state, player.id, id, deal.age);
  const shortfall = Math.max(0, bar - standing);
  if (shortfall <= 0) return null;
  const turnsLeft = turnsToClose(state, ctx, deal);
  const premium = Math.max(0, WAGER_RULES.stakeBeads - WAGER_RULES.otherBeads) * ctx.ai.weights.bead;
  // **Discounted once, here**, so both levers spend the same number: the bead is
  // minted the turn the bar is met and the malice is dodged at the close, and
  // neither is a thing this turn.
  const worth = (premium + malicePrice(ctx)) * delayDiscount(turnsLeft, ctx);
  const aim = aimOf(id);
  return {
    id,
    name: def.name,
    index,
    age: deal.age,
    bar,
    standing,
    shortfall,
    turnsLeft,
    worth,
    voices: aim.voices,
    appetite: aim.appetite,
    capitalId: isCapitalScoped(id) ? (capitalCityOf(state, player.id)?.id ?? null) : null,
    note:
      `staked on ${def.name}: ${round(standing)} of ${round(bar)}, ` +
      `${turnsLeft} turns to the close`,
  };
}

/**
 * **The staked bar as the want book's own row** — the stock, its price in the
 * reading's coin, and what closing it is worth (`WantBook.wager`).
 *
 * It is a row of the book and **not** of either bank's array, and the difference
 * is a rule rather than a filing decision: every other row in this book is a
 * thing the simulation will *sell* the empire, and two folds downstream read
 * `Want.price` as coins in a named bank (`faithPrice`'s saving delay,
 * `cheapestWantPrice`). A bar quoted in beakers or in towns sitting in the gold
 * array would be those two folds quietly answering nonsense. So the wager keeps
 * its own field, prints beside the banks, and pays its lean through the two
 * doors that are actually about prices.
 */
export interface WagerWant {
  label: string;
  /** The stock still owed, in the reading's own coin. */
  price: number;
  /** What closing the whole of it is worth. */
  worth: number;
  /** `worth ÷ price` — the ranking every other row in the book is ranked by. */
  perUnit: number;
  /** Turns until it pays — the close. */
  delay: number;
  terms: ValueTerm[];
}

export function wagerWantOf(lean: WagerLean | null): WagerWant | null {
  if (lean === null) return null;
  const terms: ValueTerm[] = [
    {
      label:
        `${lean.name} — ${round(lean.shortfall)} still owed on a bar of ${round(lean.bar)}, ` +
        `and keeping it is worth ${round(lean.worth)}`,
      value: lean.worth,
    },
  ];
  const folded: Appraisal = appraise(terms);
  return {
    label: `the wager: ${lean.name}`,
    price: lean.shortfall,
    worth: folded.total,
    perUnit: folded.total / Math.max(1, lean.shortfall),
    delay: lean.turnsLeft,
    terms: folded.terms,
  };
}

// --- small shared shapes ------------------------------------------------------

/** One decimal, the voice every printed figure in this bot speaks. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

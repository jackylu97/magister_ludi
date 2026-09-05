/**
 * Every tuned number the bot has, in one place, read off `data/ai.json`.
 *
 * The project's oldest rule (`CLAUDE.md`): code holds algorithms, data holds
 * constants. A settler cap, a search radius, a build order and — since tier 1 —
 * a whole **value vector** are all opinions about balance, and an opinion about
 * balance in a `const` is an opinion nobody can retune without a rebuild.
 *
 * It is a module of its own rather than the top of `bot.ts` for one reason:
 * `value.ts` (the appraisal) and `bot.ts` (the policy) both read it, and a
 * config that lived in either would make the other import a module it has no
 * business depending on. This file imports nothing but the JSON at runtime — the
 * one other import is a **type**, erased at build, so the module is still the
 * leaf both of them stand on, which is `roads.ts`' bargain one system over.
 *
 * `bot.ts` re-exports `AI`, so every existing reader keeps its import site.
 *
 * **Personas** (ruled 2026-09-03) sit at the bottom of the file: `data/ai.json`
 * carries a `personas` sheet of *sparse deep-overrides* of everything above, and
 * `aiConfigFor(persona)` merges one and memoises it. A seat names its persona in
 * the game's config (`PlayerSpec.persona`), every reader takes the merged view
 * through `ValueContext.ai` or `aiFor`, and nothing anywhere swaps a global —
 * two seats appraise in the same turn, and whichever asked last must not be able
 * to change what the other decided.
 *
 * **The tuning seam** (`setAiTuning` / `withAiTuning`, at the foot of the file) is
 * the one thing that may change what the *base* sheet says, and it exists for the
 * arena page (`arena.html`): a sheet of edited knobs, folded under every persona,
 * constant for a run and never written into a save. Untuned it is identity — see
 * its docblock for why that is not the swap the paragraph above forbids. Since
 * batch 7 a sheet may also name **one seat** (`{playerId}`), which is how the grid
 * search sits a candidate down opposite the default in one game; that is a table
 * keyed by seat rather than a variable that changes between two seats' readings,
 * so the promise above holds unchanged.
 */

import aiJson from '../../data/ai.json';

import type { TallyOccasion } from '../sim/statecraftData';

/**
 * The four trades a land soldier can be, for the **unit mix** (`military.mix`).
 *
 * The ruling's own four words — melee, ranged, mounted, siege — and they are a
 * bot's reading rather than a rule: the simulation's `UnitCategory` answers
 * *where a piece may stand and what it stacks with*, which is a different
 * question and deliberately a coarser one. The mapping from a roster row to one
 * of these lives in `bot.ts` (`mixRoleOf`), beside the appraisal that uses it.
 *
 * Declared here rather than there because this is the file the *numbers* live
 * in, and a `Record` keyed by a type nobody can see is a sheet nobody can check.
 */
export type MixRole = 'melee' | 'ranged' | 'mounted' | 'siege';

export interface AiConfig {
  driver: {
    /** Hard ceiling on commands one seat may emit in one turn. A guard, not a rule. */
    commandsPerSeat: number;
    /** How many times the driver re-runs the bot after a refused `endTurn`. */
    endTurnAttempts: number;
    /** How many `chooseGreatPerson` redraws the driver will ride out. */
    greatPersonRedraws: number;
  };
  search: {
    /**
     * How many ranked destinations a decision will pay for a route to before it
     * settles for standing still.
     *
     * A* over a full map is the most expensive question this bot asks, and the
     * shape that makes it expensive is *unreachable* ground: a high-scoring city
     * site across a strait is refused by the pathfinder only after a complete
     * search, and a bot that walked its whole candidate list would pay for one
     * of those per candidate, every turn, forever. Four is enough that the
     * ordinary case — the best site, and it is walkable — is never missed, and
     * bounded enough that a coastline cannot make a turn quadratic.
     *
     * It is a *cap on effort*, not a rule, which is why it lives here: raising
     * it makes the bot slower and very slightly better, and that is exactly the
     * kind of dial a data file is for.
     */
    pathProbes: number;
  };
  /**
   * **The priority system's own dials** — the want book and the shadow prices
   * (`wants.ts`, `docs/bot-priorities.md`).
   *
   * This block replaces the four `spending` thresholds it was written over
   * (`goldSpendAbove`, `goldReserve`, `faithSpendAbove`, `faithReserve`) and the
   * two religious ones beside them. The audit's finding 2 was that those knobs
   * *were* the behaviour — "spend above 150" is a policy wearing a constant, and
   * nothing anywhere priced *is this purchase worth more than holding the coin*.
   * The book answers that question instead, and these four numbers are what it
   * is answered against.
   */
  priorities: {
    /**
     * **H** — how far ahead a plan is worth making. A chain that starts paying
     * in `delay` turns is worth `(H − delay)/H` of what it would be worth
     * paying today, so a want a whole horizon away is worth nothing and a want
     * in hand is worth all of itself.
     *
     * It started beside `score.maxTurns`' forty and, since batch 7, **is** it:
     * the two were the same number saying the same thing from two ends — how
     * long a town will spend building, and how long an empire will plan — and
     * an arena that swept them apart would be sweeping one horizon against
     * itself. `push`' build-effort cap reads this now, so there is one H.
     */
    horizonTurns: number;
    /**
     * **The switching margin** — how much better a challenger chain must be
     * than the incumbent before the empire changes its mind (1.1 = ten per
     * cent).
     *
     * Read by `techGoalTable` (batch 3): the goal the seat is already aiming at
     * — the last node of `researchPlan`, derived and never stored — carries a
     * printed `× switchMargin` term, so the ordinary argmax over the table keeps
     * the plan unless a challenger beats it by that much. It is what stops a
     * beeline changing its mind every turn on a board that moved a hair, and it
     * is the whole of "greedy with a margin" (principle 1 of the spec).
     */
    switchMargin: number;
    /**
     * The band a shadow price may move in, as multiples of what the weight
     * table says the voice is worth (`priceBandLow × prior` … `priceBandHigh ×
     * prior`).
     *
     * The band is the damping. A price computed straight off the book would
     * swing with whatever happened to be for sale this turn, and every arm in
     * the bot reads it; these two say *the designer's table is still the
     * anchor, and the board may argue with it by a factor of three*. See
     * `shadowPrices`.
     */
    priceBandLow: number;
    priceBandHigh: number;
    /**
     * **How many horizons out the bead race is still worth arguing about**
     * (batch 5 of `docs/bot-priorities.md`).
     *
     * The win condition is the one chain whose delay is routinely longer than a
     * plan: a rod twenty beads short, the road to the closing technology and a
     * twelve-hundred-hammer raising are not forty turns of work, and a chain the
     * horizon zeroed outright would never take the book over at all. So the race
     * is *live* — its candidates carry its share — while its whole delay is
     * inside this many horizons, and its worth is discounted by the ordinary
     * `(H − delay)/H` throughout, so being live is permission to argue rather
     * than a bonus.
     *
     * Once the great work is **open** this stops applying: the race then runs
     * against the nearest rival's clock instead, which is `beadChain`'s stated
     * reading of what an open race is.
     */
    raceLiveHorizons: number;
  };
  expansion: {
    /**
     * How far a settler looks for ground, **as a bound on compute**: the
     * expansion chain probes for the nearest legal site inside it, and the
     * settler's own march ranks every legal hex inside it. The audit's one
     * honest use for a cap.
     */
    siteSearchRadius: number;
    /**
     * **The honest tall lever.** Each town already held multiplies what the next
     * one is worth: a settler is `weights.city × falloff^towns`, so a wide
     * empire at 1 never tires of expanding, a balanced one at 0.9 slows, and a
     * tall one at 0.6 stops wanting a fourth town long before the cap would stop
     * it. Before this the settler was a flat 88 for every empire on every board,
     * and "tall" could only be spelled as a cap — which is a *feasibility*
     * sentence, not a preference (see `buildCandidates`).
     */
    cityValueFalloff: number;
  };
  site: {
    /**
     * How many rings of neighbours a site's appraisal folds. Two since P3: a
     * town works a radius the first ring does not cover, and a bot that could
     * only see one ring picked a hill with three good hexes over a river bend
     * with nine.
     */
    ringRadius: number;
    /**
     * What each further ring is worth against the one inside it — a hex two
     * away is `ringFalloff` of a hex next door, and so on outward. It is a
     * *falloff* rather than a second weight table because the honest statement
     * is "further ground is worth less", not "further ground is worth
     * differently": a town works its inner ring first and may never reach the
     * outer one at all.
     */
    ringFalloff: number;
    freshWaterBonus: number;
    coastBonus: number;
    /**
     * A luxury **kind** this empire holds none of, standing in the site's rings.
     * Read off the resource row's `kind` and never off a name, and asked of the
     * kind rather than the tile: a second silk is worth what its yields are
     * worth, and the *first* silk is worth a happiness signature nothing else
     * on the board can pay.
     */
    newLuxuryBonus: number;
    /** The same sentence for a strategic kind — iron an empire cannot field. */
    newStrategicBonus: number;
    yieldWeights: Record<string, number>;
  };
  /**
   * What a worker is for, and how far ahead the **improvement plan** looks.
   *
   * `improvements` is still the roster of what a spade may lay; what changed
   * with the plan (`plan.ts`) is that it is no longer a *preference order* — the
   * plan scores every legal pairing of a workable hex and a row in this list
   * through the simulation's own `improvementYieldDelta`, and the order of the
   * list decides nothing but a tie.
   */
  workers: {
    searchRadius: number;
    improvements: string[];
    /** How many unclaimed plan entries near a town its craving for workers folds. */
    planTopN: number;
    /** Each further entry in that fold is worth this much of the one before it. */
    planFalloff: number;
    /** Hexes from a town an entry has to be inside to count toward its craving. */
    planRadius: number;
    /** How much a hex of walking discounts an entry: `value / (1 + d × this)`. */
    walkDiscount: number;
    /**
     * What an unread seam under a marked hill is worth per turn, as a stand-in
     * for the resource nobody has named yet. The assay is priced separately and
     * exactly (`RULES.improvements.assayGold`); this is the *seam*.
     */
    veinValue: number;
    /**
     * What **one point** of a work's flat defender line is worth per turn — the
     * citadel's eight, and whatever a second work with a `defense` on its row
     * carries (`ImprovementDef.defense`, read off the marker rather than a name).
     *
     * Modest on purpose, and a good deal under `weights.military`: a citadel
     * priced at what eight points of a soldier's strength are worth would beat
     * every farm on the board, and a general's citadel is a *hex* that defends
     * itself rather than an army. It is the same kind of stand-in `veinValue` is
     * — a number nobody can derive, written down where a tuner can reach it.
     */
    workDefenseValue: number;
  };
  /**
   * What a citizen is worth beyond the ground it works — the compounding half.
   *
   * The user's ruling (2026-09-03): *"a citizen should be valued as a science
   * yield too … alongside a premium (citizens compound over time), so cities
   * with fewer than some X citizens weight citizens more heavily. Maybe start
   * with a value of 9."* The 9 is read here as the **threshold** and the premium
   * is a knob of its own, so the other reading is one edit away.
   */
  growth: {
    /** Towns below this population pay the premium. */
    smallCityPop: number;
    /** What that premium is worth, in the one currency. */
    smallCityPremium: number;
  };
  military: {
    campHuntRadius: number;
    garrisonPerCity: number;
    armyPerCity: number;
    /**
     * **The warmonger's one capability.** Zero is the peaceful bot this file
     * shipped with: it hunts the wild, garrisons its towns and never once
     * targets another nation. Above zero a soldier will hunt a rival's pieces
     * and push at their cities inside `huntRadius`, and the exchange it will
     * accept loosens with the number — at 1 any blow that deals more than
     * nothing, at 0.5 only a blow that deals half again what it takes. See
     * `soldierCommand`.
     */
    aggression: number;
    /** Hexes an aggressive seat will look for a rival's piece or town in. */
    huntRadius: number;
    /**
     * **The opening's scouts, and the glut that followed them** (the user's
     * notes, `docs/bot-notes.md`: *"ai needs to prioritize early scouts"*; the
     * ruling of 2026-09-04 after the t75 diagnostics found twelve to forty
     * rangers a seat: *"sharply deprioritize having more than 3 scouts at a
     * time, and deprioritize as turns go on"*).
     *
     * Five knobs rather than a rule, because how many rangers an empire wants
     * and for how long are balance opinions:
     *
     *   · `scoutBonus` is paid on top of what the piece is worth as a soldier
     *     while the game is younger than `scoutEarlyTurns` and the empire holds
     *     fewer than `scoutCap` rangers — the opening's appetite for eyes;
     *   · `scoutCap` is now **the number this empire keeps at a time**, not
     *     just the bonus' gate: holding that many, the next one is charged
     *     `scoutGlutPenalty`, which is steep enough to drive the candidate
     *     below every ordinary row rather than merely behind them. It is a
     *     charge and not a `null` because a bot that silently drops a candidate
     *     cannot be read on the spectate page — the collapse is a printed term;
     *   · `scoutDecayPerTurn` fades the **whole** explorer value with the turn
     *     count (`÷ 1 + turn × this`), so even the first three stop competing
     *     as the map lights up. A rate rather than a cut-off for the reason
     *     everything else here is: a cliff at turn forty is a cliff a tuner
     *     cannot soften.
     *
     * The **first** scout is not decided here at all — it is the opening book
     * (`openingScout`), which is a hard-coded ruling rather than a weight.
     */
    scoutCap: number;
    scoutEarlyTurns: number;
    scoutBonus: number;
    /** Charged against a further ranger once `scoutCap` are already ranging. */
    scoutGlutPenalty: number;
    /** How fast an explorer's whole value fades with `state.turn`. */
    scoutDecayPerTurn: number;
    /**
     * **The army this empire wants to be made of** — the shares of the four
     * soldiers' trades, read by the build arm's mix term (ruled 2026-09-04:
     * *"it should also prioritize a mix of units (unless it has clear bonuses
     * for a certain type)"*).
     *
     * Proportions rather than counts, so the same sheet describes a two-piece
     * levy and a twenty-piece army; they are not required to sum to one and
     * nothing normalises them, because what the term actually compares is
     * *this share against that share* and a designer who writes four numbers
     * summing to 1.2 has simply made every trade a little hungrier.
     *
     * The parenthesis in the ruling — *unless it has clear bonuses for a
     * certain type* — is why this is a **term and not a gate**: a persona's
     * `weights.military`, an escalation ladder already climbed and the piece's
     * own strength all fold beside it, so an empire whose one good row is a
     * bowman still builds bowmen. See `explainMixCraving`.
     */
    mix: Record<MixRole, number>;
    /**
     * What a full share of the mix is worth, in the one currency — the term is
     * `mixBonus × (target − share)`, so a trade the army has none of is paid
     * its whole target and a trade that is the *entire* army is charged the
     * rest. Symmetric on purpose: "crave what is missing" and "stop building
     * the ninth spearman" are one sentence read from two ends.
     */
    mixBonus: number;
    /**
     * **Rest below this fraction of a piece's hit points** (ruled 2026-09-04:
     * *"try to heal units that are weak"*). A soldier under it, standing on
     * ground this empire owns, digs in and mends rather than swinging or
     * marching — unless the blow in front of it would kill or capture, which
     * is the one exception the ruling names. See `restAndHeal`.
     */
    healBelowHealth: number;
    /**
     * What a melee piece's exchange is charged when **a bowman of ours can hit
     * the same target and has not shot yet** (ruled 2026-09-04: *"prioritize
     * ranged attacks for melee attacks"*).
     *
     * A printed charge rather than a silent skip, for `scoutGlutPenalty`'s
     * reason: a reader of the spectate feed has to be able to see that the
     * spearman held, and why. The blow is refused outright for this turn — the
     * charge is what the candidate table shows — unless it kills or captures.
     */
    rangedDeferral: number;
    /**
     * Hexes a bowman looks for a sighted hostile in before it starts caring
     * where it stands. Small: this is a *skirmish* rule, not a doctrine.
     */
    screenRadius: number;
    /** What one friendly melee piece screening a hex is worth to a bowman. */
    screenBonus: number;
    /** What one hex of distance from the nearest sighted hostile is worth. */
    screenExposure: number;
  };
  /**
   * **What a seat will go to war over, and what it will sign to stop.**
   *
   * Everything the diplomatic policy reads (`src/ai/diplomacy.ts`), and every
   * figure here is a *tuning* opinion rather than a rule: the rules are
   * `declareWarError`, `proposePeaceError`, `answerDealError` and
   * `dealSideError`, and the bot never proposes anything one of them refuses.
   */
  war: {
    /**
     * The army ratio a **warlike** seat needs before it declares — its own
     * strength over the target's, loosened by its appetite for a fight. 1.4
     * says: a warmonger wants half again the army it is looking at.
     */
    declareThreshold: number;
    /**
     * The same bar for a seat with **no appetite** (`military.aggression` 0),
     * which is every persona but one. High on purpose: a peaceful empire
     * declares only at an advantage nobody could mistake for a fair fight, and
     * `tall` and `zealot` set it out of reach entirely (the ruling: they never
     * declare in v1).
     */
    declareThresholdPeaceful: number;
    /** A target town has to stand this near one of this seat's pieces. */
    reachRadius: number;
    /**
     * What "a hostile is about" means to a settler, and how near a soldier has
     * to be to count as its escort. One radius for both halves deliberately:
     * they are the same question asked of two different pieces.
     */
    escortRadius: number;
    /** Warscore below which this seat starts putting peace on the table. */
    sueFloor: number;
    /**
     * Warscore at or below which it will **sign** a fair paper. Above it the
     * seat is winning enough to press on and declines. A warmonger's is high —
     * it keeps fighting while it is ahead; a tall seat's is out of reach, which
     * is to say it takes any fair peace it is offered.
     */
    acceptCeiling: number;
    /** Warscore below which a suing seat offers **tribute** rather than a white peace. */
    tributeFloor: number;
    /** Coin a point of warscore is worth, both as tribute offered and as tribute accepted. */
    goldPerScorePoint: number;
    /** What one soldier raised and no longer standing is worth in the warscore. */
    unitLossWeight: number;
    /** What one town taken by force is worth in the warscore. */
    cityWeight: number;
    /** What one point of standing army strength is worth in the warscore. */
    strengthWeight: number;
    /**
     * The coin a **lent luxury** is priced at — the baseline a gold-for-luxury
     * offer has to clear, and the figure a peace paper's seams are valued with.
     * Authored 2026-09-03 and flagged for tuning: nothing has played against a
     * human yet.
     */
    luxuryGoldBaseline: number;
    /** The same for a tribute: coin **a turn** a luxury is worth lending for. */
    luxuryGptBaseline: number;
  };
  /**
   * **The value vector**: what one per-turn point of each voice is worth, per
   * age, and what everything that is not a yield is worth beside it.
   *
   * The whole of tier 1's premise (design ledger Entry LIII's ladder). A fixed
   * priority list cannot trade a library against a swordsman; a vector can,
   * because both are appraised in the same currency. It is deliberately **flat**
   * — six arrays of four and a page of scalars, no nesting, no conditionals —
   * because the next rung on the ladder is self-play parameter tuning, and a
   * tuner rewrites a flat file.
   *
   * The six arrays are indexed by `TechAge − 1`. The defaults are the user's
   * ruling of 2026-09-04 — *"prioritize food, then science/culture, then
   * production/gold; food importance should decrease as time goes on"* — read
   * straight off as a table: **food leads and falls** (7→4) because a young
   * town's whole future is its next citizen and a grown one's is not;
   * **science rises and stays** and **culture is level**, both of them above
   * **production and gold**, which are flat and modest; gold still ticks up
   * once with the age, which is Entry LIX's first finding (late upkeep is what
   * bankrupted both seats in the arena) surviving at a smaller size; faith
   * opens the early door and quietens after.
   *
   * The previous sheet had production level with science and culture at two,
   * and the arena's seats built hammers and let the tree and the drafts go by.
   */
  weights: {
    food: number[];
    production: number[];
    gold: number[];
    science: number[];
    culture: number[];
    faith: number[];
    /** One glass bead. The endgame's currency (Entry LVIII). */
    bead: number;
    /** Finishing the Magnum Opus — the curtain, over and above its bead. */
    victory: number;
    /** One great-person die. */
    die: number;
    /** Holding one more technology, over and above what it unlocks. */
    tech: number;
    /**
     * One more town, **before** `expansion.cityValueFalloff` is applied for the
     * towns this empire already holds.
     */
    city: number;
    /** One point of combat strength. */
    military: number;
    /** One point of happiness. */
    happiness: number;
    /** One point of authority (capacity or supply). */
    authority: number;
    /** One point of renown. */
    renown: number;
    /** A worker, flat — the improvements it will lay, priced as one number. */
    worker: number;
    /** A caravan, flat. Multiplied by the gold pressure: a broke empire trades. */
    trader: number;
    /**
     * How much dearer a coin gets when the books are bleeding, at full strain.
     *
     * **The collapse lever.** `goldPressure` runs from 1 (healthy) to this
     * (in arrears), and multiplies both the value of a gold *gain* and the cost
     * of an ongoing gold *bill* — one number, so the two halves can never
     * disagree about how bad the debt is.
     */
    debtAversion: number;
  };
  /**
   * When an empire is solvent, when it is strained, and when it starts letting
   * pieces go — design ledger Entry LIX, finding 1.
   *
   * The arena found both seats at −125💰 a turn and −1,642 in the treasury by
   * t160, with the creditors' sweep unable to right it. The scoring above is the
   * *soft* half of the answer (a maintained building simply stops winning); what
   * survives here is the **arrears** half — the disband floor, the grace and the
   * wage cover — which is about a treasury that has already run out rather than
   * about a comparison.
   *
   * `stopMaintainedBelow` — the hard income floor that struck every upkeep-bearing
   * row out of the build arm and out of the book — is **retired** (batch 7). It was
   * written before the book existed, when nothing anywhere priced a bill; now every
   * candidate and every want carries `explainUpkeepCost` at **gold's shadow price**,
   * so a bleeding empire charges a library's wage four times over and the comparison
   * refuses it without a threshold saying so. A floor over the top of that is the
   * audit's finding 2 twice — a policy wearing a constant, ahead of arithmetic that
   * already says the same thing.
   */
  solvency: {
    /** Net gold per turn at or above which the empire is healthy: pressure 1. */
    healthyIncome: number;
    /** How far below `healthyIncome` the strain ramps to full aversion. */
    strainSpan: number;
    /** Treasury below which the empire is in arrears and starts disbanding. */
    arrearsTreasury: number;
    /** Turns of the standing maintenance bill kept back as reserve. */
    reserveTurnsOfUpkeep: number;
    /** Soldiers the empire never goes below, however deep the arrears. */
    minArmy: number;
    /** Net gold per turn below which a redundant piece may be let go. */
    disbandBelowIncome: number;
    /**
     * **The opening grace.** A fresh empire has one town, no market and no
     * caravan, so its net gold reads as a deficit long before it means anything
     * — the pressure pinned at full aversion by turn six of every game, which
     * made the first twenty turns of every seat a bookkeeper's. While the
     * treasury is at or above this figure *and* the game is younger than
     * `graceTurns` *and* the books are not actually falling (net ≥ 0), the
     * pressure is 1. See `goldPressure`.
     */
    graceTreasury: number;
    /** Turns of a game the grace applies for. Absolute, never a countdown. */
    graceTurns: number;
  };
  /** The nominal stand-ins an appraisal uses where a row states a rate. */
  score: {
    /**
     * **The nominal helping** — what one thing this bot cannot read is worth.
     *
     * Two jobs since batch 7, because they were one number wearing two names.
     * It is what a `CardEffect` shape nobody has taught the bot prices at (never
     * zero: an unreadable card must still beat a blank one), and — times
     * `nominalCount`, which is exactly the arithmetic `offerRider` already did
     * with the pair — it is **the per-turn yield a percentage is assumed to be a
     * percentage of**. `score.nominalYield` is retired into it at that reading,
     * and its six was `unknownEffect × nominalCount` to the point, so the merge
     * moved no number: what it moved is the count of knobs a tuner has to keep
     * consistent from two to one.
     */
    unknownEffect: number;
    /** How many things a `countScaled` — or an unread rate — is assumed to count. */
    nominalCount: number;
    /** How many hexes a `tileYield` is assumed to land on. */
    nominalTiles: number;
    /** Per already-held card sharing an option's `line`. See `scoreCard`. */
    synergyBonus: number;
    /** Soldiers a completion grant of one unit is worth. */
    combatScale: number;
    /**
     * **Wonder patience.** The amortiser (`÷ turnsToBuild`) buries a row that
     * cannot be finished this decade: a 109-point wonder over 32 turns loses to
     * an 80-point worker over 6, so the endgame rows never started. A row that
     * is one-of-a-kind, or that carries a bead or the curtain, is amortised over
     * `min(turnsToBuild, this)` instead — the empire is *patient* about the
     * things there is only one of. Ordinary rows are untouched.
     */
    patienceTurns: number;
    /**
     * What a **one-time lump** is worth against a per-turn point of the same
     * voice. A great person's act pays once; a farm pays forever. Dividing the
     * lump by this is the exchange rate between the two, and it is the only
     * thing that lets "act now" and "plant the work" sit in one scored table.
     */
    lumpTurns: number;
    /**
     * **What a growing card is assumed still to watch happen**, per occasion —
     * the potential half of a `tally` count (`CountKind`'s `tally`).
     *
     * A growing card's *realized* value is its own counter, which is a fact and
     * is read off the empire's books. Its potential is the rest of the game, and
     * that cannot be read off anything: a card drafted on turn 10 will watch
     * hundreds of barbarians fall and a card drafted on turn 400 will not. So it
     * is stated here, per `TallyOccasion`, and it is the estimate itself: no
     * delay discount rides on a forecast, because "occasions still expected over
     * the horizon" already carries its own doubt (batch 2 of
     * `docs/bot-priorities.md` — the flat λ that used to multiply it was
     * discounting the same uncertainty twice).
     *
     * **Per occasion and never one blind number**, because the occasions are not
     * commensurable: a wonder finished anywhere in the world is a rare event and
     * gold out of the treasury is thousands of coins. The unit is *whatever the
     * counter stores* — `goldSpent` accumulates the raw coin (the card's own
     * `per` divides it), so its forecast is raw gold and not a count of
     * purchases.
     *
     * An occasion **absent from this table forecasts nothing** and says so in
     * the fold ("no forecast"), which is the honest failure: a growing card
     * nobody has priced is visibly unpriced rather than quietly guessed at.
     */
    tallyForecast: Partial<Record<TallyOccasion, number>>;
  };
  /** What "an enemy is near my towns" means, and what it is worth. */
  threat: {
    /** Hexes from one of this empire's towns that counts as near. */
    radius: number;
    /** Added to a soldier's value per threat, in the one currency. */
    militaryBonus: number;
    /** Added to a soldier's value when its town stands ungarrisoned. */
    garrisonValue: number;
    /** Extra soldiers wanted per threat, over the standing army cap. */
    extraArmyPerThreat: number;
    /** How much a threat multiplies a unit unlock when picking a research goal. */
    techMilitaryFactor: number;
    /**
     * **What the seat has actually SIGHTED, as an appetite for soldiers**
     * (ruled 2026-09-04: *"there should also be some prioritization around
     * units based on the number of sighted camps/barbarian units"*).
     *
     * `extraArmyPerThreat` above is the *adjacency* reading — an enemy column
     * standing next to a town, which is an emergency. These two are the wider
     * one: the wild's camps this seat has charted and the hostile pieces it can
     * see right now, anywhere on its map. They add to the wanted army rather
     * than replacing anything, because "a raider is at my gate" and "there are
     * four camps in my hills" are two different sentences and an empire that
     * only answered the first would be an empire that never raises a levy until
     * it is too late.
     *
     * Both are *fractions of a soldier* on purpose: two camps is one more
     * warrior, and a knob a tuner can move without the appetite jumping by a
     * whole piece. `sightedArmyCap` is the ceiling on the pair together — a
     * scout that lit up half a continent must not talk this empire into
     * twenty soldiers.
     *
     * The reading itself is seat-scoped and is the whole point: see
     * `sightedThreat` in `bot.ts`.
     */
    armyPerSightedCamp: number;
    armyPerSightedHostile: number;
    sightedArmyCap: number;
  };
  /** The beeline: how far ahead a goal may sit, and what its gifts are worth. */
  research: {
    /** Nodes a goal's prerequisite closure may hold before it is too far. */
    goalHorizon: number;
    /** What one unlocked ability (embarkation) is worth. */
    abilityValue: number;
    /** What one unlocked project is worth. */
    projectValue: number;
  };
  /**
   * The early-game appetite for gods — design addendum 5.
   *
   * It used to be two lowered faith thresholds; it is now **one worth**, and the
   * faith book does the rest. A seat with no pantheon prices the first god at
   * `prophetTechValue` and a seat with no religion prices the first prophet
   * there too, so both ride to the top of the book on their own arithmetic
   * rather than on a threshold that had been lowered for them. See
   * `faithPlan` (`wants.ts`).
   */
  religion: {
    /**
     * What the node that unlocks the prophet is worth to a seat that holds a god
     * and no religion — the **beeline's** half of the appetite.
     *
     * Without it the arena's story was exact and absurd: both seats consecrated
     * a pantheon by t60, then banked faith for eighty turns (one reached 820)
     * because the prophet's gate is a technology the goal scorer never wanted,
     * and no empire in the world founded a faith. It is large on purpose — it
     * has to outrank a whole age's worth of ordinary nodes for the few turns it
     * applies — and it switches itself off the moment a religion exists, which
     * is what `ValueContext.faithAppetite` is.
     *
     * **It is now the faith book's price for the thing itself as well** (batch
     * 1): the first god and the first prophet are both worth this to a seat
     * that lacks them, which is what makes faith dear in exactly the window the
     * beeline is already leaning toward the node. One number for one appetite,
     * rather than a worth here and two thresholds elsewhere.
     */
    prophetTechValue: number;
  };
}

// --- personas ---------------------------------------------------------------

/**
 * A **sparse deep-override of the whole configuration**: every key optional, at
 * every depth, and an array or a scalar replaces rather than merges.
 *
 * Sparse is the whole point. A persona that had to restate the config would be
 * five copies of one file drifting apart the first time a knob was retuned; this
 * way `tall` says *a steep falloff, city weight eighty, hold the citizens dear*
 * and inherits every other opinion the balanced seat has, including the ones
 * added after it was written.
 *
 * An **array replaces wholesale** because the arrays here are the age-banded
 * weight rows, and half a row is not a weight table. A scalar replaces for the
 * obvious reason. Only a plain object merges.
 */
export type PersonaOverride = DeepPartial<AiConfig>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/** The JSON as it is on disk: the balanced config, plus the two override sheets. */
interface AiData extends AiConfig {
  personas: Record<string, PersonaOverride>;
  puppetProfile: PersonaOverride;
}

const DATA = aiJson as unknown as AiData;

const { personas: PERSONAS, puppetProfile: PUPPET, ...BASE } = DATA;

/**
 * The balanced configuration — what a seat with no persona plays, and the base
 * every persona is a sparse override of.
 *
 * It is `BASE` rather than the raw import so that the `personas` sheet is not
 * hanging off the object every appraisal reads: a config is a page of numbers,
 * and a page of numbers carrying four other pages of numbers is a shape
 * somebody would eventually read the wrong one out of.
 *
 * `bot.ts` re-exports it, so every existing reader keeps its import site.
 */
export const AI: AiConfig = BASE as AiConfig;

/**
 * The sheet the arena page is currently trying, and `AI` with it folded in.
 *
 * `TUNED` is `AI` **by identity** while nothing is installed, which is what makes
 * the untuned path byte-identical to the one that existed before the seam: every
 * `aiConfigFor` below returns the very object it used to. See `setAiTuning`.
 */
let TUNING: PersonaOverride | null = null;
let TUNED: AiConfig = AI;

/**
 * **The sheets one seat each is trying** (batch 7), and the merged base each of
 * them reads — `TUNED` with that seat's sheet folded over it.
 *
 * Empty in every game the product plays; the grid search fills it with one entry
 * so that a candidate and the default can sit at one table. A seat with no entry
 * reads `TUNED` **by identity**, which is what keeps the untuned path the path
 * that existed before this map did.
 */
const SEATS = new Map<number, PersonaOverride>();
const SEAT_BASES = new Map<number, AiConfig>();

/** The base one seat's persona is merged over: the page's sheet, plus the seat's. */
function seatBase(playerId?: number): AiConfig {
  if (playerId === undefined || SEATS.size === 0) return TUNED;
  const sheet = SEATS.get(playerId);
  if (sheet === undefined) return TUNED;
  const held = SEAT_BASES.get(playerId);
  if (held !== undefined) return held;
  const merged = deepMerge(TUNED, sheet);
  SEAT_BASES.set(playerId, merged);
  return merged;
}

/** The seat half of a memo key. Empty unless this seat has a sheet of its own. */
function seatKey(playerId?: number): string {
  if (playerId === undefined || !SEATS.has(playerId)) return '';
  return String(playerId);
}

function clearMemos(): void {
  SEAT_BASES.clear();
  MERGED.clear();
  PUPPETS.clear();
}

/** What a seat with nothing said about it plays as. */
export const DEFAULT_PERSONA = 'balanced';

/**
 * Every persona the sheet declares, in file order — which is data order and
 * therefore the order a dropdown lists them in on every machine.
 */
export const PERSONA_IDS: readonly string[] = Object.keys(PERSONAS);

export function isPersonaId(value: unknown): value is string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PERSONAS, value);
}

/** A persona's name as a dropdown prints it. The id, capitalised — no second table. */
export function personaLabel(id: string): string {
  return id.length === 0 ? id : id[0]!.toUpperCase() + id.slice(1);
}

/**
 * `base` with `override` folded into it — a fresh object, nothing mutated.
 *
 * Plain objects merge key by key; arrays and scalars replace. The result keeps
 * **the base's key order**, with any key the override invents appended, which is
 * what makes a merged config's own iteration order (`site.yieldWeights` is
 * walked by `explainSite`) a fact about the data file rather than about which
 * persona is playing.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    merged[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
  }
  return merged as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The configuration one seat appraises with — **memoised**, because two seats
 * with two personas ask for theirs on every candidate of every decision.
 *
 * The cache is a pure function's table, not state: `aiConfigFor('tall')` is the
 * same object every time in a process and the same *numbers* in every process,
 * so nothing about a replay turns on whether it was warm. An unknown persona
 * falls back to balanced rather than throwing — a save from a build that knew a
 * persona this one does not must still replay, and a persona drives the bot
 * rather than the reducer, so the fallback costs a replay nothing.
 *
 * The key is `seat|persona`, where the seat half is empty for every reader that
 * names no seat and for every seat with no sheet of its own — so a game nobody
 * has tuned per seat has exactly the keys it had before the per-seat seam
 * existed, and the whole table is still one pure function's.
 */
const MERGED = new Map<string, AiConfig>();

/**
 * @param persona the seat's persona, from `PlayerSpec.persona`.
 * @param playerId the seat asking, when the caller knows it. It is only ever
 *   consulted for a **per-seat tuning sheet** (`setAiTuning(sheet, {playerId})`,
 *   the grid search's door); a seat nobody has tuned answers exactly as it does
 *   without the argument, by identity.
 */
export function aiConfigFor(persona?: string, playerId?: number): AiConfig {
  const base = seatBase(playerId);
  if (persona === undefined || persona === DEFAULT_PERSONA || !isPersonaId(persona)) return base;
  const key = `${seatKey(playerId)}|${persona}`;
  const held = MERGED.get(key);
  if (held !== undefined) return held;
  const merged = deepMerge(base, PERSONAS[persona]);
  MERGED.set(key, merged);
  return merged;
}

/**
 * **The puppet's sheet**: this seat's own configuration with the puppet profile
 * folded over the top of it (ruled 2026-09-03, `docs/flags.md`).
 *
 * A puppet builds what the seat's own appraisal picks — that is the ruling — so
 * it is emphatically *not* a sixth persona: a warmonger's puppet is still a
 * warmonger's town, and the profile only leans it toward coin. It is a
 * persona-shaped override applied on top of the seat's persona for that one
 * city's `chooseProduction`, which is exactly the shape `PersonaOverride`
 * already is, so there is one merge in this file and not two.
 *
 * What the profile cannot say is *never a wonder, never a settler, never a
 * unit*: those are feasibility rather than preference (`buildCandidates`' own
 * distinction), read off the rows' markers in the policy. A weight can only ever
 * make something less attractive, and "an uncontrollable town does not raise
 * armies" is not a matter of degree.
 *
 * Memoised on the persona's key like every other merged sheet, with the empty
 * string standing for the balanced seat — a pure function's table, not state.
 */
const PUPPETS = new Map<string, AiConfig>();

export function aiConfigForPuppet(persona?: string, playerId?: number): AiConfig {
  const key = `${seatKey(playerId)}|${persona !== undefined && isPersonaId(persona) ? persona : ''}`;
  const held = PUPPETS.get(key);
  if (held !== undefined) return held;
  const merged = deepMerge(aiConfigFor(persona, playerId), PUPPET);
  PUPPETS.set(key, merged);
  return merged;
}

// --- the tuning seam ---------------------------------------------------------

/**
 * **What the arena page is trying instead of `data/ai.json`** — one sheet, folded
 * under every persona, installed for the length of a run and never serialised.
 *
 * Why a module-level install rather than a parameter on `driveBots`
 * ----------------------------------------------------------------
 * The configuration is not read by the driver. It is read by the *appraisal*, at
 * the bottom of a call graph five modules deep (`aiFor` in `bot.ts`,
 * `ValueContext.ai` in `value.ts`, the plan, the diplomacy), and every one of
 * those readers takes it through `aiConfigFor` here. Threading an override from
 * `driveBots` would mean adding a parameter to every scoring function in
 * `src/ai/` for the benefit of one dev page — the seam has to be where the
 * *reading* is, and the reading is this file's two functions.
 *
 * Why swapping this global is safe, when the file's own docblock says nothing
 * anywhere swaps one
 * ------------------------------------------------------------------------
 * That rule is about **per-seat** configuration: two seats appraise inside one
 * turn, and whichever asked last must not be able to change what the other
 * decided. This is the opposite shape and keeps that promise intact — it is a
 * page-level dial that is *constant for a whole run*, applied identically to
 * every seat, and folded **under** the personas, so the per-seat differences are
 * still the persona sheets and still resolve independently. The arena runs each
 * game in its own Web Worker, which is its own module instance, so two runs with
 * two sheets never share this variable at all.
 *
 * Three properties keep it out of the game's way:
 *
 *   · **Untuned is identity.** With nothing installed `TUNED` *is* `AI`, so
 *     `aiConfigFor(undefined) === AI` exactly as before (pinned by
 *     `test/sim/aiPersona.test.ts`), and a run without a sheet replays
 *     byte-for-byte.
 *   · **It never reaches a save.** A save is `{config, log}`; a sheet is neither.
 *     A tuned bot emits different commands, and *those* are in the log — so the
 *     game a tuned run produced still replays from its own log on a build that
 *     never heard of the sheet, exactly as a persona does.
 *   · **The memo tables are the same pure function's table.** Both are cleared
 *     when the sheet changes, so `aiConfigFor('tall')` is never a stale merge.
 *
 * **Per seat, since batch 7** (`{ playerId }`)
 * --------------------------------------------
 * The grid search (`scripts/gridSearch.ts`) asks a question the page-level dial
 * cannot: *is this sheet better than the file?* — which needs one seat playing
 * the candidate and another playing the default **in the same game**, mirrored
 * across two games so the map cannot be the answer. So a sheet may name a seat,
 * and then it is folded for that seat only, over the global sheet and **under**
 * the persona, in that order: the file, what the page is trying, what this seat
 * is trying, what this seat's persona says.
 *
 * That is emphatically not the swap the file's docblock forbids. The forbidden
 * shape is one variable that *changes* between two seats' readings inside a turn;
 * this is a **table keyed by seat**, installed before the run and constant
 * through it, so every seat's answer is a function of the seat and of nothing
 * else. It is a persona nobody had to name in the roster, and it inherits every
 * property the global sheet has: never serialised, never in a save, and identity
 * for every seat nobody tuned.
 */
export function setAiTuning(sheet: PersonaOverride | null, options: TuningScope = {}): void {
  const live = sheet !== null && Object.keys(sheet).length > 0 ? sheet : null;
  if (options.playerId === undefined) {
    TUNING = live;
    TUNED = live === null ? AI : deepMerge(BASE as AiConfig, live);
  } else if (live === null) {
    SEATS.delete(options.playerId);
  } else {
    SEATS.set(options.playerId, live);
  }
  clearMemos();
}

/** Which seat a sheet is for. Absent is the page-level dial every seat reads. */
export interface TuningScope {
  playerId?: number;
}

/**
 * The installed sheet, or `null` — which is what "the data file, untouched" is.
 * With a `playerId`, that seat's own sheet rather than the page's.
 */
export function aiTuning(options: TuningScope = {}): PersonaOverride | null {
  if (options.playerId === undefined) return TUNING;
  return SEATS.get(options.playerId) ?? null;
}

/**
 * `run` with `sheet` installed, and the previous sheet back afterwards whatever
 * happens — the scoped form, and the one an in-process caller should reach for.
 *
 * `setAiTuning` on its own is for a worker that owns its whole module instance
 * and exits when the game is over. Anything sharing a process with the rest of
 * the product (a test, a headless bench, a page that also renders a live game)
 * uses this instead, so a thrown exception cannot leave a dial turned.
 */
export function withAiTuning<T>(
  sheet: PersonaOverride | null,
  run: () => T,
  options: TuningScope = {},
): T {
  const held = aiTuning(options);
  setAiTuning(sheet, options);
  try {
    return run();
  } finally {
    setAiTuning(held, options);
  }
}

/**
 * **Every per-seat sheet off at once** — what a harness calls between two games
 * so that a seat tuned in one cannot be tuned in the next. The page-level dial is
 * untouched, because it is the *run's* and the seats are the *game's*.
 */
export function clearSeatTuning(): void {
  if (SEATS.size === 0) return;
  SEATS.clear();
  clearMemos();
}

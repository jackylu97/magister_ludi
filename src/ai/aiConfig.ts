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
 * business depending on. This file imports nothing but the JSON — it is the leaf
 * both of them stand on, which is `roads.ts`' bargain one system over.
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
 */

import aiJson from '../../data/ai.json';

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
   * When the two banks are opened, and what is never taken out of them.
   *
   * **A hoarding bot is a dead bot**: gold and faith have no automatic sink in
   * this game — nothing spends them but a decision — so a seat that never
   * decides ends the game with a treasury and an empty board. The threshold is
   * what stops it going the other way and buying a warrior the turn it can
   * afford one; the reserve is what it keeps back, because buildings cost gold
   * to *maintain* (`explainEmpireGold`) and an empire at zero is an empire
   * disbanding units next resolution.
   */
  spending: {
    /** Gold above this, over and above the reserve, is surplus. */
    goldSpendAbove: number;
    /** Gold never spent. Upkeep is a standing bill, not a one-off. */
    goldReserve: number;
    /** Faith above this, over and above its reserve, is surplus. */
    faithSpendAbove: number;
    faithReserve: number;
  };
  expansion: {
    settlerCap: number;
    settlerCityPop: number;
    settlerAuthorityFloor: number;
    siteSearchRadius: number;
    siteScoreMin: number;
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
    perCity: number;
    cap: number;
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
     * **The opening's scouts** (the user's notes, `docs/bot-notes.md`): *"ai
     * needs to prioritize early scouts"*. Three knobs rather than a rule,
     * because how many rangers an opening wants is a balance opinion: a seat
     * pays `scoutBonus` on top of what the piece is worth as a soldier while
     * the game is younger than `scoutEarlyTurns`, up to `scoutCap` of them.
     * The **first** one is not decided here at all — it is the opening book
     * (`openingScout`), which is a hard-coded ruling rather than a weight.
     */
    scoutCap: number;
    scoutEarlyTurns: number;
    scoutBonus: number;
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
  trade: {
    tradersPerCity: number;
    traderCap: number;
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
   * The six arrays are indexed by `TechAge − 1`. The hand-picked defaults say:
   * food matters most while towns are small and least once they are grown;
   * production never stops mattering; **gold rises with the age**, which is the
   * whole of Entry LIX's first finding written as a number (late upkeep is what
   * bankrupted both seats in the arena); science peaks mid-game; **culture falls
   * late**, because the arena found it flooding at 200–400 a turn with nothing
   * to buy; faith opens the early door and quietens after.
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
   * *soft* half of the answer (a maintained building simply stops winning); this
   * block is the **hard** half, and a hard floor is needed because a score can
   * always be outweighed by a big enough yield and a bankrupt empire is not a
   * trade-off.
   */
  solvency: {
    /** Net gold per turn at or above which the empire is healthy: pressure 1. */
    healthyIncome: number;
    /** How far below `healthyIncome` the strain ramps to full aversion. */
    strainSpan: number;
    /**
     * Net gold per turn below which **nothing that costs upkeep is queued or
     * bought** — the hard floor, and the one rule here that is not a weight.
     */
    stopMaintainedBelow: number;
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
    /** Turns of build effort past which a candidate stops looking better. */
    maxTurns: number;
    /** What a `CardEffect` shape this bot cannot read is worth. Never zero. */
    unknownEffect: number;
    /** The per-turn yield a percentage is assumed to be a percentage *of*. */
    nominalYield: number;
    /** How many things a `countScaled` is assumed to count. */
    nominalCount: number;
    /** How many hexes a `tileYield` is assumed to land on. */
    nominalTiles: number;
    /** Cities past which "in every city" stops scaling. */
    cityCap: number;
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
  };
  /** The beeline: how far ahead a goal may sit, and what its gifts are worth. */
  research: {
    /** Nodes a goal's prerequisite closure may hold before it is too far. */
    goalHorizon: number;
    /** What one unlocked ability (embarkation) is worth. */
    abilityValue: number;
    /** What one unlocked project is worth. */
    projectValue: number;
    /** Beakers per unit of "how far" in the goal score's denominator. */
    costDivisor: number;
  };
  /**
   * The early-game appetite for gods — design addendum 5.
   *
   * Two lowered faith thresholds rather than a priority list: a seat with no
   * pantheon opens its faith bank at almost nothing, because the first god is
   * worth more than any amount of banked faith, and a seat with no religion
   * opens it nearly as early for the prophet. Once both are had, the ordinary
   * `spending.faithSpendAbove` applies again.
   */
  religion: {
    /** Faith spend threshold while this empire holds no belief at all. */
    pantheonSpendAbove: number;
    /** Faith spend threshold while this empire has founded no religion. */
    prophetSpendAbove: number;
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
 * way `tall` says *settler cap two, city weight eighty, hold the citizens dear*
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
 */
const MERGED = new Map<string, AiConfig>();

export function aiConfigFor(persona?: string): AiConfig {
  if (persona === undefined || persona === DEFAULT_PERSONA || !isPersonaId(persona)) return AI;
  const held = MERGED.get(persona);
  if (held !== undefined) return held;
  const merged = deepMerge(BASE as AiConfig, PERSONAS[persona]);
  MERGED.set(persona, merged);
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

export function aiConfigForPuppet(persona?: string): AiConfig {
  const key = persona !== undefined && isPersonaId(persona) ? persona : '';
  const held = PUPPETS.get(key);
  if (held !== undefined) return held;
  const merged = deepMerge(aiConfigFor(persona), PUPPET);
  PUPPETS.set(key, merged);
  return merged;
}

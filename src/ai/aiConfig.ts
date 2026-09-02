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
  };
  site: {
    ringRadius: number;
    freshWaterBonus: number;
    coastBonus: number;
    yieldWeights: Record<string, number>;
  };
  workers: {
    perCity: number;
    cap: number;
    searchRadius: number;
    improvements: string[];
  };
  military: {
    campHuntRadius: number;
    garrisonPerCity: number;
    armyPerCity: number;
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
    /** One citizen — what a settler costs its town, and what a rite grants. */
    citizen: number;
    /** One more town. */
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

export const AI: AiConfig = aiJson as AiConfig;

/**
 * Renown: the **fifth Entry XVIII bucket**, and the ladder it fills toward
 * (`docs/great-people.md`).
 *
 * Four buckets came before it and each taught this one something. Production is
 * a basket a city spends on a queue; food is a basket that buys a citizen;
 * science is a pool that buys a technology; culture is a pool that buys a
 * *decision*. Renown is culture's shape exactly — a pool on the player, an
 * escalating threshold, and an **offer** on the far side of it — and it is
 * deliberately written that way rather than better, because "how close am I to
 * the next great person" and "how close am I to the next draft" should be one
 * idea a player learns once.
 *
 * What fills it, and why the answer is a list
 * -------------------------------------------
 * Five sources: a **trickle** from buildings, a lump and a trickle from
 * **wonders**, a trickle from whatever **cards** say so (the Council of Elders'
 * counsel — `CardRenownEffect`, read by the one evaluator like every other
 * clause), lumps from **Triumphs**, and — since Entry XLVIII — a point a turn
 * from every **specialist**, into its own family's feed. That last one is the
 * loop the guild system was built to close: a scholarly city recruits great
 * scholars faster because its scholars say so. Rule 5 applies to a count exactly as it
 * applies to a yield, so `explainRenown` is the ordered list — one line per
 * building, per wonder, per card and per triumph earned this turn — and every
 * total is a fold of it. The HUD's hover prints those lines verbatim; nothing
 * composes a second sentence about a library.
 *
 * The feed record
 * ---------------
 * Every line carries a **family**, and the phase banks it into
 * `Player.renownByFamily` as well as into the pool. That record is never spent
 * and never decays: it is a *history*, and its one reader is the weighting in
 * `drawGreatPersonOffer` — which is how "a science-heavy empire sees more
 * scholars" is true without any rule saying so.
 *
 * Where the phase sits, and why
 * -----------------------------
 * `renown` runs directly after `statecraft` in `END_OF_TURN_PHASES`, and the
 * position is a rules decision like every other entry in that array. It is the
 * same shape one currency over — an empire spending a pool that the top of this
 * resolution filled, on a board that has already grown, built and learnt this
 * turn — so a great person is dealt from the world the turn produced rather than
 * from the one it started in. It is *after* `advanceProduction`, which is what
 * lets a wonder finished this turn pay its ten renown into the same sweep that
 * banks the trickle, and *after* `statecraft`, so an empire crossing both
 * thresholds at once answers its draft and its recruitment in the order a player
 * reads them.
 *
 * It skips the wild, exactly as `advanceResearch` and `runStatecraft` do: the
 * wild has no screen to be offered a name on, so an offer left on that seat would
 * hang forever behind a blocker nobody can answer.
 */

import { BUILDING_IDS, buildingDef } from './buildingData';
import type { Family } from './greatPeopleData';
import { drawGreatPersonOffer } from './greatPeople';
import { RULES } from './rulesData';
import { techsGrant } from './techData';
import { citySpecialistYields } from './specialists';
import {
  type City,
  type GameState,
  type GreatPersonOffer,
  type Player,
  realPlayers,
} from './state';
import { cardRenownLines } from './statecraft';
import { triumphDef } from './triumphData';
import { awardCountTriumphs } from './triumphs';

const RENOWN = RULES.renown;
/** What one standing specialist pays its own family's feed every turn. */
const RENOWN_PER_SPECIALIST = RULES.cities.guilds.renownPerSpecialist;

// --- the ledger -------------------------------------------------------------

/**
 * One contribution to what an empire's renown did this turn. Rule 5, for a
 * count.
 *
 * `perTurn` is what separates the two halves of the list and it is the reason
 * this is one list rather than two: the trickle is what the phase *banks*, and a
 * triumph's lump was banked the instant it was earned — but a player looking at
 * the hover wants to see both, because between them they are the whole answer to
 * "where did this turn's renown come from".
 */
export interface RenownLine {
  /** "Library at Ur", "Wonder · The Oracle", "Triumph · The Third Hearth". */
  source: string;
  /** Which family this fed. The bias in `Player.renownByFamily`. */
  family: Family | null;
  amount: number;
  /** True for the recurring half — what the phase banks. False for a lump. */
  perTurn: boolean;
}

/**
 * Everything paying this empire renown, as the ordered list every total is the
 * fold of.
 *
 * The order is the one every other sweep in this game uses — `state.cities` is
 * founding order, `BUILDING_IDS` is table order — so the list a player reads
 * this turn is the list they read last turn with one more line on it.
 *
 * The **card** lines sit between the two halves rather than at the end, because
 * everything recurring belongs together: a player scanning the hover reads what
 * their empire earns every turn as one block and what it happened to earn today
 * as another. They are asked of the one evaluator (`cardRenownLines`), so a
 * government, an Order, a belief, a wonder's clause and a legacy all arrive by
 * the same road and this file has no idea which was which.
 *
 * Triumph lines are the ones **earned this turn**, read off `Player.triumphs`
 * where the stamp matches `state.turn`. They are already banked by the time
 * anything reads this (a triumph settles the instant it is earned, Entry XVIII),
 * which is exactly what `perTurn: false` says.
 */
export function explainRenown(state: GameState, playerId: number): RenownLine[] {
  const lines: RenownLine[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const line of explainCityRenown(city)) lines.push(line);
    // And what its guilds pay back (Entry XLVIII). *Beside* the buildings rather
    // than inside `explainCityRenown`, and the separation is load-bearing: that
    // list is what fills this town's guild bar, and a specialist feeding the bar
    // that made it is a loop with no brake on it. Here it feeds the empire's
    // pool and its family's record — which is the design's whole point, the
    // specialist system paying into the great-person system.
    for (const line of citySpecialistYields(city)) {
      lines.push({
        source: `${city.name} · ${line.source}`,
        family: line.family,
        amount: RENOWN_PER_SPECIALIST * line.count,
        perTurn: true,
      });
    }
  }
  for (const line of cardRenownLines(state, playerId)) {
    lines.push({ source: line.source, family: line.family, amount: line.amount, perTurn: true });
  }
  const player = state.players[playerId];
  for (const earned of player?.triumphs ?? []) {
    if (earned.turn !== state.turn) continue;
    const def = triumphDef(earned.id);
    lines.push({
      source: `Triumph · ${def.name}`,
      family: def.family ?? null,
      amount: def.pays,
      perTurn: false,
    });
  }
  return lines;
}

/**
 * What **one city's buildings** earn their empire in renown every turn.
 *
 * Split out of `explainRenown` rather than copied out of it (Entry XLVIII), and
 * that is the whole reason it exists: the guild bar in `guilds.ts` is filled by
 * this figure, and a second sweep over `city.buildings` reading the same rows
 * would be two answers to "what is this town worth" that agree until somebody
 * edits one. The empire's building half is now the fold of this over its cities,
 * so the two cannot drift by construction and the total is unchanged.
 *
 * `BUILDING_IDS` order, which is table order — the same walk this list has
 * always had, one city in rather than the whole empire.
 *
 * Buildings **only**: a specialist's own point of renown is added by
 * `explainRenown` beside this call and deliberately not here. See there.
 */
export function explainCityRenown(city: City): RenownLine[] {
  const lines: RenownLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    const renown = buildingDef(id).renown;
    if (renown === undefined || renown.perTurn === 0) continue;
    lines.push({
      source: `${buildingDef(id).name} at ${city.name}`,
      family: renown.family,
      amount: renown.perTurn,
      perTurn: true,
    });
  }
  return lines;
}

/** The fold of a renown list — everything on it. The only sum of one. */
export function foldRenown(lines: readonly RenownLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * What this empire earns **every turn**, which is the figure the phase banks and
 * the one the top bar prints beside the pool.
 *
 * The fold of the recurring half of `explainRenown`, never a second sweep: a
 * lump earned this turn is on that list so the hover can show it, and adding it
 * here would pay a triumph twice.
 */
export function renownPerTurn(state: GameState, playerId: number): number {
  return foldRenown(explainRenown(state, playerId).filter((line) => line.perTurn));
}

// --- the ladder -------------------------------------------------------------

/**
 * What this empire's next great person costs.
 *
 * The settler ladder's shape one currency over: `first + step × recruited`, read
 * off a counter on the player because a recruited person is *consumed* by its
 * act or its work and the board therefore cannot be counted (see
 * `Player.greatPeopleRecruited`).
 */
export function renownThreshold(player: Player): number {
  const taken = Math.max(0, Math.floor(player.greatPeopleRecruited));
  return Math.floor(RENOWN.first + RENOWN.step * taken);
}

/** What a fill would do, without doing it. `planDraft`'s twin one bucket over. */
export interface RenownPlan {
  /** Renown the pool gives up: the threshold exactly. */
  cost: number;
  /** Renown left over, which stays in the pool toward the recruitment after. */
  overflow: number;
}

export function planRecruitment(player: Player, renown = player.renownPool): RenownPlan | null {
  const cost = renownThreshold(player);
  if (renown < cost) return null;
  return { cost, overflow: renown - cost };
}

/**
 * A lump of renown, and which family paid it.
 *
 * A list rather than a number because a turn's trickle comes from five families
 * at once, and the feed record has to learn all of them. A `null` family is
 * legal and means the pool grows without any family growing with it — a triumph
 * that names none.
 */
export interface RenownGrant {
  family: Family | null;
  amount: number;
}

/**
 * Banks renown and opens a great-person offer the instant the ladder is covered.
 *
 * **The Entry XVIII seam for this bucket**, and the only way renown is ever
 * added: the end-of-turn trickle, a wonder's lump on completion and every
 * Triumph all come through here, so "what does a renown payment owe" is answered
 * in one place. `settleCultureWindfall`'s twin, clause for clause:
 *
 *   · it **loops**, because one lump can cross two thresholds and a payment that
 *     paid only the first would leave the empire owed a recruitment it earned;
 *   · it refuses while an offer is **outstanding**, which is the rule
 *     `settleDraft` and `discoveryClaimError` both state — an offer is a decision
 *     the player owes the game, and a second one dealt on top of it would
 *     silently destroy the first. The renown stays in the pool and the offer
 *     opens the moment the outstanding one is answered;
 *   · it owes the **stale-yields register nothing**, exactly as
 *     `settleCultureWindfall` owes it nothing: a recruitment mutates no city's
 *     derived state — it puts a *decision* on the empire, and the piece it
 *     eventually mints goes through `createUnit` like any other. It is entry 13
 *     of that register anyway, so the register stays the complete answer to
 *     "what settles".
 *
 * **A spent roster banks rather than blocks.** If the draw comes back empty —
 * every name in the world already recruited — nothing is deducted and no offer
 * is opened. The renown simply accumulates, which is the honest end state: there
 * is nothing left to buy, and an empty offer sitting on a seat would be a blocker
 * nobody could answer.
 */
export function settleRenownWindfall(
  state: GameState,
  player: Player,
  grants: readonly RenownGrant[],
): GreatPersonOffer | null {
  for (const grant of grants) {
    if (grant.amount === 0) continue;
    player.renownPool += grant.amount;
    if (grant.family !== null) {
      player.renownByFamily[grant.family] = (player.renownByFamily[grant.family] ?? 0) + grant.amount;
    }
  }

  // **The gate** (the tree pass of 2026-08-30): until an empire keeps the
  // ancestor rites, nobody answers its renown. The pool still fills — that is
  // the point, and it is why the gate sits *after* the grants are banked rather
  // than at the top: a realm that reaches the rites late finds a great person
  // waiting the moment it does, instead of having thrown away the renown it
  // earned getting there. Read through `techsGrant`, the one register for "may
  // this empire do that", so moving the gate is one line of `data/techs.json`.
  if (!techsGrant(player.techsResearched, 'ancestorRites')) return null;

  let first: GreatPersonOffer | null = null;
  for (;;) {
    if (player.greatPersonOffer !== undefined) return first;
    const plan = planRecruitment(player);
    if (!plan) return first;
    const offer = drawGreatPersonOffer(state, player);
    // The whole roster is spent. Nothing is deducted — see the docblock.
    if (offer.options.length === 0) return first;
    player.renownPool = plan.overflow;
    player.greatPersonOffer = offer;
    if (first === null) first = offer;
  }
}

/** What a lump of renown would open, in words, or `null`. The card's preview. */
export function recruitmentSettledBy(player: Player, grant: number): string | null {
  return planRecruitment(player, player.renownPool + grant) === null ? null : 'a great person';
}

// --- the phase --------------------------------------------------------------

/**
 * The renown phase: every empire banks what its buildings and wonders earned,
 * claims whatever standing Triumphs it now qualifies for, and recruits if the
 * ladder is covered.
 *
 * The **standing** triumphs are swept here rather than hooked at a seam, and
 * that is a deliberate simplification rather than a shortcut: "a city of yours
 * reaches population 10" is a fact about the board, not an event, and a city
 * that starves back to nine and grows again has still reached ten. Reading it
 * off the state once a turn is simpler than four hooks and **cannot miss**. They
 * are claimed *before* the trickle is banked, so a threshold crossed by a
 * triumph and by a library on the same turn is crossed once.
 */
export function runRenown(state: GameState): void {
  for (const player of realPlayers(state)) {
    awardCountTriumphs(state, player.id);
    const grants: RenownGrant[] = [];
    for (const line of explainRenown(state, player.id)) {
      if (!line.perTurn) continue;
      grants.push({ family: line.family, amount: line.amount });
    }
    settleRenownWindfall(state, player, grants);
  }
}

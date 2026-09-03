/**
 * **The seat's diplomatic policy: who it fights, and what it signs.**
 *
 * `bot.ts` answers *what would this seat like to do next?* about its own board —
 * its towns, its pieces, its purse. This module answers the four questions that
 * are about somebody *else*, and it is a module of its own for the reason
 * `plan.ts` is: they are one subject with one vocabulary, they are asked in one
 * place in the policy's order, and the file that owns them can be read on its
 * own by whoever is tuning them.
 *
 * The four, in the order they are asked (`diplomacyDecision`):
 *
 *   · **A paper somebody put to me.** Answered before anything else, because a
 *     proposal is another empire waiting on this one — and because acceptance is
 *     the only decision here that can be taken away by a rival's next command.
 *   · **A war I am already in.** Sue for peace below the seat's floor, sign a
 *     paper the warscore says is fair, and press on otherwise.
 *   · **A war I could start.** Army ratio against a threshold, a town in reach,
 *     and the truce respected — all three printed.
 *   · **A bargain I could offer.** One 1:1 luxury swap: a kind I hold twice for
 *     a kind I hold none of.
 *
 * Three disciplines hold, and they are the same three the rest of `src/ai/`
 * keeps:
 *
 *   · **It never reimplements a rule.** Every command goes to the simulation's
 *     own gate first — `declareWarError`, `proposePeaceError`, `proposeDealError`,
 *     `answerDealError` — so a refusal from this file is a bug, not a strategy.
 *     The truce, the "one paper at a time" rule and the idempotence of a
 *     standing offer are all *theirs*, and none of them is restated here.
 *   · **Every decision is monotone**, which is what keeps `driveSeat`'s loop
 *     finite: a declaration makes `declareWarError` say "already at war", an
 *     offer makes `proposePeaceError` say "already stands", and answering a
 *     proposal takes it off the table. Nothing here can be proposed twice about
 *     the same thing.
 *   · **A score is the fold of its terms** (`decision.ts`). Every number below
 *     is built as a `ValueTerm[]` and folded by `appraise`, never computed and
 *     then described.
 *
 * **The warscore is a comparison of standing, not a history.** The doc asks for
 * "the difference in units/cities lost as well as the difference in military
 * strength", and the state carries no register of losses to difference against
 * `declaredTurn` — a bot is a pure function of the board (`bot.ts`' creed) and
 * has no memory between calls. So the losses are read off the two facts the
 * board does carry: **soldiers raised and no longer standing** (`unitsBuilt`
 * against what is on the map) and **towns standing in somebody's hands that were
 * taken by force** (`City.captured`). Both are lifetime readings rather than
 * war-scoped ones, and in a two-empire war they say very nearly the right thing;
 * in a three-way they can credit a seat for a town it took from somebody else.
 * That is the doc's "dumb logic" said out loud, and the honest fix is a register
 * in the state, which is a schema decision nobody has taken.
 */

import { type AiConfig } from './aiConfig';
import {
  type Appraisal,
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  appraise,
  nest,
} from './decision';
import type { ValueContext } from './value';

import { controlledResources, hasResource, resourceCopies } from '../sim/cities';
import type { Command } from '../sim/commands';
import { type DealTerms, proposalsFor } from '../sim/deals';
import {
  answerDealError,
  bargainSeatError,
  declareWarError,
  proposeDealError,
  proposePeaceError,
} from '../sim/diplomacy';
import { getTileAt, tileHex, wrappedDistance } from '../sim/map';
import { type ResourceId, resourceDef } from '../sim/resourceData';
import type { City, GameState, Player } from '../sim/state';
import { playerById, realPlayers } from '../sim/state';
import { type UnitTypeId, isCombatant, unitDef } from '../sim/unitData';
import { hasPeaceOffer, peaceTermsOn, warBetween } from '../sim/wars';

/**
 * The one entry point: what this seat wants to say to somebody else, or `null`
 * when it has nothing to say.
 *
 * Called from `nextBotDecision` after the purse and **before** the board, which
 * is deliberate: a declaration changes what every piece of this empire is
 * looking at, and a surprise war is legal (the ruling, section 2), so a seat
 * that declares this turn gets to march on the same turn it declared.
 */
export function diplomacyDecision(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): BotDecision | null {
  const answered = answerProposals(state, player, ctx);
  if (answered !== null) return answered;
  const peace = peaceDecision(state, player, ctx);
  if (peace !== null) return peace;
  const war = declareDecision(state, player, ctx);
  if (war !== null) return war;
  return swapDecision(state, player, ctx);
}

// --- who counts -------------------------------------------------------------

/**
 * Every empire this seat could have diplomacy with: a real seat, not itself, not
 * the wild, not eliminated.
 *
 * `realPlayers` is the register for "who counts" (CLAUDE.md), and the wild falls
 * out of it by construction rather than by a hand-rolled `!barbarian` — a
 * barbarian has no seat at any table and `atWar` already answers *true* for it
 * without a row.
 */
function rivalsOf(state: GameState, player: Player): Player[] {
  const list: Player[] = [];
  for (const other of realPlayers(state)) {
    if (other.id === player.id) continue;
    if (other.eliminated) continue;
    list.push(other);
  }
  return list;
}

/**
 * The standing army, as the user's own sentence puts it: *"the sum of combat
 * strength of all units"*.
 *
 * The roster's own figure (`UnitDef.combatStrength`) rather than a fought
 * strength: `planCombat` prices terrain, fortification and an aura for one blow
 * on one hex, and a *war* is not a hex. What is wanted here is how much army
 * there is, which is what the roster says.
 */
export function armyStrength(state: GameState, playerId: number): number {
  let strength = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const def = unitDef(unit.type);
    if (!isCombatant(def)) continue;
    strength += def.combatStrength;
  }
  return strength;
}

/**
 * Soldiers this empire raised that are no longer standing — the losses proxy.
 *
 * `Player.unitsBuilt` is the escalation ladder's own counter (raised in
 * `realiseItem`, never for a free unit), so this reads *built or bought, minus
 * alive*. It counts a piece the creditors took and a piece an enemy killed the
 * same way, and it misses the free ones an empire opened with — which is why it
 * is called a proxy in the module docblock and not a casualty list.
 */
function soldiersLost(state: GameState, player: Player): number {
  let raised = 0;
  for (const [type, count] of Object.entries(player.unitsBuilt)) {
    if (!isCombatant(unitDef(type as UnitTypeId))) continue;
    raised += count ?? 0;
  }
  let standing = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== player.id) continue;
    if (isCombatant(unitDef(unit.type))) standing += 1;
  }
  return Math.max(0, raised - standing);
}

/** Towns in this empire's hands that were taken by force. See the docblock. */
function townsTaken(state: GameState, playerId: number): number {
  let count = 0;
  for (const city of state.cities) {
    if (city.ownerId === playerId && city.captured) count += 1;
  }
  return count;
}

// --- the warscore -----------------------------------------------------------

/**
 * How this war is going for `player`, in points: **positive is winning**.
 *
 * Six lines and no more, which is the doc's whole specification — their losses
 * against mine, their conquests against mine, their army against mine — every
 * weight in `data/ai.json` and every line printed. See the module docblock for
 * what "losses" is actually read off, and why.
 */
export function explainWarScore(
  state: GameState,
  player: Player,
  enemy: Player,
  ai: AiConfig,
): Appraisal {
  const { unitLossWeight, cityWeight, strengthWeight } = ai.war;
  const theirLosses = soldiersLost(state, enemy);
  const myLosses = soldiersLost(state, player);
  const theirTaken = townsTaken(state, enemy.id);
  const myTaken = townsTaken(state, player.id);
  const mine = armyStrength(state, player.id);
  const theirs = armyStrength(state, enemy.id);
  return appraise([
    {
      label: `${theirLosses} of their soldiers raised and no longer standing × ${unitLossWeight}`,
      value: theirLosses * unitLossWeight,
    },
    {
      label: `${myLosses} of ours × ${unitLossWeight}`,
      value: myLosses * unitLossWeight,
      op: 'sub',
    },
    {
      label: `${myTaken} town${myTaken === 1 ? '' : 's'} in our hands taken by force × ${cityWeight}`,
      value: myTaken * cityWeight,
    },
    {
      label: `${theirTaken} in theirs × ${cityWeight}`,
      value: theirTaken * cityWeight,
      op: 'sub',
    },
    {
      label: `our army stands at ${mine} strength × ${strengthWeight}`,
      value: mine * strengthWeight,
    },
    { label: `theirs at ${theirs} × ${strengthWeight}`, value: theirs * strengthWeight, op: 'sub' },
  ]);
}

/** `explainWarScore`'s number alone. */
export function warScore(state: GameState, player: Player, enemy: Player, ai: AiConfig): number {
  return explainWarScore(state, player, enemy, ai).total;
}

// --- what a paper is worth --------------------------------------------------

/**
 * What one half of a bargain is worth **to the empire receiving it**, in coin.
 *
 * Coin rather than the value vector's currency, and deliberately: every term a
 * deal can carry is already a payment (`DealTerms` — coin, tribute, seams,
 * passage, towns), so pricing them against each other in coin is the one
 * conversion that needs no weight table at all. The two figures that are not
 * coin are read off the two baselines the ruling asked for, and they are the
 * *same statement in two currencies* by construction: `luxuryGptBaseline` a turn
 * is worth exactly `luxuryGoldBaseline`, so an offer that clears either bar
 * clears the other.
 *
 * **A seam is priced at the baseline whichever way it moves**, and what a
 * *duplicate* buys is not a discount but permission: a luxury this empire holds
 * only one copy of is simply not for sale (`asksOurLastCopy`), and one it holds
 * twice may be sold at the baseline like any other. Written that way round
 * because the two ruled rules then fall out exactly — a duplicate swapped for a
 * kind we lack is 120 against 120 and signs, a duplicate sold for the gold
 * baseline is 120 against 120 and signs, and the same duplicate sold for a coin
 * is 1 against 120 and does not.
 *
 * `lacking` is the *receiving* side's clause: a luxury is a signature and a
 * second copy of one pays nothing new (`resourceEffects.ts`), so a kind already
 * in hand arrives worth nothing however many tiles of it change hands.
 */
function explainSide(
  terms: DealTerms,
  ctx: ValueContext,
  lacking: ((id: ResourceId) => boolean) | null,
  what: string,
): Appraisal {
  const ai = ctx.ai;
  const lines: ValueTerm[] = [];
  const gold = terms.gold ?? 0;
  if (gold !== 0) lines.push({ label: `${gold} coin ${what}`, value: gold });
  const perTurn = terms.goldPerTurn ?? 0;
  if (perTurn !== 0) {
    const rate = ai.war.luxuryGoldBaseline / Math.max(1, ai.war.luxuryGptBaseline);
    lines.push({
      label: `${perTurn} coin a turn ${what} × ${rate} (this seat's price for a turn's tribute)`,
      value: perTurn * rate,
    });
  }
  for (const id of terms.luxuries ?? []) {
    // `null` is the giving side: what leaves is priced at the baseline whatever
    // this empire already holds, because that is what a seam costs.
    const wanted = lacking === null || lacking(id);
    lines.push({
      label: wanted
        ? `${resourceDef(id).name} ${what} — at this seat's price for a seam`
        : `${resourceDef(id).name} ${what} — a kind already in hand, so its signature pays nothing new`,
      value: wanted ? ai.war.luxuryGoldBaseline : 0,
    });
  }
  if (terms.openBorders === true) {
    lines.push({ label: `a right of way ${what}, which this bot does not price`, value: 0 });
  }
  for (const cityId of terms.cities ?? []) {
    lines.push({ label: `a town ${what} (${cityId}) × the city weight`, value: ctx.ai.weights.city });
  }
  return appraise(lines);
}

/**
 * A whole paper from one seat's side: what arrives, less what leaves.
 *
 * The two sides ask different questions of the board and that asymmetry is the
 * design: what **arrives** is worth something only if this empire lacks the
 * kind, and what **leaves** costs the baseline whatever it is. Whether a seam
 * may leave at all is a separate, harder clause — see `asksOurLastCopy`.
 */
function explainPaper(
  state: GameState,
  player: Player,
  take: DealTerms,
  give: DealTerms,
  ctx: ValueContext,
): { appraisal: Appraisal; taken: number; given: number } {
  const gained = explainSide(take, ctx, (id) => !hasResource(state, player.id, id), 'to us');
  const lost = explainSide(give, ctx, null, 'from us');
  return {
    appraisal: appraise([
      { label: 'what we take', value: gained.total, parts: gained.terms },
      { label: 'what we give', value: lost.total, op: 'sub', parts: lost.terms },
    ]),
    taken: gained.total,
    given: lost.total,
  };
}

/**
 * The seam a paper asks for that this empire holds only one copy of, or `null`.
 *
 * **A hard clause rather than a price**, and that is what makes the ruled swap
 * rule exact: the ruling is *"accept trades for 1:1 luxuries for copies that it
 * has duplicates of"*, which is a sentence about what may leave rather than
 * about what it is worth. Priced instead, a big enough pile of coin would always
 * buy an empire's only silk — and the happiness it pays goes with it.
 *
 * `resourceCopies` counts tiles (and a lent seam as one), which is the same
 * reading `dealSideError` gates the term with, so "we hold two" here and "they
 * may lend it" there cannot disagree.
 */
function asksOurLastCopy(
  state: GameState,
  player: Player,
  asked: DealTerms,
): ResourceId | null {
  for (const id of asked.luxuries ?? []) {
    if (resourceCopies(state, player.id, id) <= 1) return id;
  }
  return null;
}

// --- answering a paper somebody put to us -----------------------------------

/**
 * The standing proposals put to this seat, answered — accepted when the paper
 * pays and declined when it does not.
 *
 * **Both answers are commands and both are logged**, which is the whole reason
 * this arm can print its reasoning: a decline is a decision the feed can show,
 * where "did not declare" and "did not sue" are simply absences.
 *
 * The bar is three clauses: the paper must not cost more than it brings,
 * something must actually arrive, and it must not ask for a seam this empire
 * holds only one copy of. The second refuses a bargain that hands over nothing
 * of value — an empire that swapped a kind it lacked for a kind it lacked would
 * be signing a paper for the sake of signing — and the third is the ruled swap
 * rule (see `asksOurLastCopy`).
 */
function answerProposals(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): BotDecision | null {
  for (const row of proposalsFor(state, player.id)) {
    if (row.to !== player.id) continue;
    // From this seat's side the proposer's `give` is what arrives.
    const read = explainPaper(state, player, row.give, row.take, ctx);
    const paper = read.appraisal;
    const arriving = read.taken;
    const lastCopy = asksOurLastCopy(state, player, row.take);
    const accepting = paper.total >= 0 && arriving > 0 && lastCopy === null;
    const refusal = answerDealError(state, player.id, row.id, accepting);
    // A decline is always legal for the seat that was asked, so a refusal here
    // is only ever the acceptance's — the coin was spent, the mine was
    // pillaged. Answered by declining, with the rules' own sentence on the row.
    const verb: Command =
      refusal === null && accepting
        ? { type: 'acceptDeal', playerId: player.id, dealId: row.id }
        : { type: 'declineDeal', playerId: player.id, dealId: row.id };
    const them = playerById(state, row.by)?.name ?? 'them';
    const candidates: BotCandidate[] = [
      {
        label: `sign the ${them}' paper`,
        score: paper.total,
        chosen: verb.type === 'acceptDeal',
        terms: paper.terms,
      },
    ];
    if (verb.type === 'declineDeal') {
      candidates.push({
        label: 'send it back',
        score: 0,
        chosen: true,
        terms: [
          {
            label:
              refusal !== null
                ? `the rules refuse the signing: ${refusal}`
                : lastCopy !== null
                  ? `it asks for the only ${resourceDef(lastCopy).name.toLowerCase()} this empire holds`
                  : arriving <= 0
                    ? 'nothing on the table arrives worth anything here'
                    : 'it costs more than it brings',
            value: 0,
          },
        ],
      });
    }
    return {
      kind: 'deal',
      command: verb,
      subject: them,
      summary:
        verb.type === 'acceptDeal'
          ? `Signs the ${them}' bargain — it brings ${round1(arriving)} coin of value against ${round1(read.given)} given.`
          : `Sends the ${them}' bargain back — ` +
            (refusal !== null
              ? refusal
              : lastCopy !== null
                ? `it asks for the only ${resourceDef(lastCopy).name.toLowerCase()} this empire holds.`
                : `it is worth ${round1(paper.total)} to this empire.`),
      candidates,
    };
  }
  return null;
}

// --- a war already on -------------------------------------------------------

/**
 * Sue for peace, or sign the paper on the table — or `null` when every war this
 * seat is in is one it would rather go on fighting.
 *
 * Both halves are the same command (`proposePeace`), which is the shape the
 * simultaneous turn model gave peace: a bare offer means *sign whatever is on
 * the table* and an offer with terms writes a new paper, so "accept" and "sue"
 * differ only in whether this seat brings its own paper. `settleDiplomacy`
 * closes the war at the end of the turn once both flags stand.
 *
 * The candidate table carries **every** war this seat is in, so the wars it
 * decided to go on fighting are visible beside the one it sued over. That is the
 * only place a "decline" can be printed: declining a peace is not a command.
 */
function peaceDecision(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): BotDecision | null {
  const ai = ctx.ai;
  const rows: BotCandidate[] = [];
  let taken: { command: Command; summary: string; enemy: Player } | null = null;

  for (const enemy of rivalsOf(state, player)) {
    if (warBetween(state, player.id, enemy.id) === undefined) continue;
    const score = explainWarScore(state, player, enemy, ai);
    const theirs = hasPeaceOffer(state, enemy.id, player.id);
    const mine = hasPeaceOffer(state, player.id, enemy.id);
    const paper = peaceTermsOn(state, player.id, enemy.id);
    const owed = Math.max(0, -score.total) * ai.war.goldPerScorePoint;
    const label = `the ${enemy.name}`;

    if (taken !== null) {
      rows.push({ label, score: score.total, chosen: false, terms: score.terms });
      continue;
    }

    if (mine) {
      rows.push({
        label: `${label} — our offer already stands`,
        score: score.total,
        chosen: false,
        terms: score.terms,
      });
      continue;
    }

    if (theirs) {
      // Their flag is up. What is on the table is *their* paper (or nothing at
      // all, which is a white peace), read from this seat's side.
      const value =
        paper === null
          ? appraise([{ label: 'a white peace: nothing changes hands', value: 0 }])
          : explainPaper(
              state,
              player,
              sideOf(paper, enemy.id, player.id),
              sideOf(paper, player.id, enemy.id),
              ctx,
            ).appraisal;
      const fair = value.total >= -owed;
      const winning = score.total > ai.war.acceptCeiling;
      const refusal = proposePeaceError(state, player.id, enemy.id);
      if (fair && !winning && refusal === null) {
        // **The one row whose score is not the warscore alone**, and it is built
        // by `appraise` rather than described beside a number so the fold is the
        // computation (`decision.ts`): what signing is worth is the war as it
        // stands plus whatever the paper moves.
        const signing = appraise([
          nest('the war as it stands', score),
          { label: 'the paper, from our side', value: value.total, parts: value.terms },
        ]);
        rows.push({
          label: `${label} — sign what is on the table`,
          score: signing.total,
          chosen: true,
          terms: signing.terms,
        });
        taken = {
          enemy,
          command: { type: 'proposePeace', playerId: player.id, targetId: enemy.id },
          summary:
            `Signs the peace the ${enemy.name} put up: the war reads ${round1(score.total)} for this empire, ` +
            `under the ${ai.war.acceptCeiling} it would press on at, and the paper is worth ` +
            `${round1(value.total)} against the ${round1(-owed)} the score says it owes.`,
        };
        continue;
      }
      rows.push({
        label: `${label} — their offer stands, and this seat will not sign`,
        score: score.total,
        chosen: false,
        terms: [
          ...score.terms,
          {
            label: winning
              ? `the war reads over the ${ai.war.acceptCeiling} this seat presses on at`
              : refusal !== null
                ? `the rules refuse it: ${refusal}`
                : `the paper is worth ${round1(value.total)}, under the ${round1(-owed)} the score says it owes`,
            value: 0,
          },
        ],
      });
      continue;
    }

    if (score.total < ai.war.sueFloor) {
      // Losing badly enough to bring coin: the tribute is the score, priced.
      const tribute =
        score.total < ai.war.tributeFloor ? Math.min(player.gold, Math.floor(owed)) : 0;
      const offered =
        tribute > 0 ? { give: { gold: tribute } as DealTerms, take: {} as DealTerms } : undefined;
      const refusal = proposePeaceError(state, player.id, enemy.id, offered);
      if (refusal === null) {
        rows.push({
          label: `${label} — sue for peace`,
          score: score.total,
          chosen: true,
          terms: [
            ...score.terms,
            {
              label:
                tribute > 0
                  ? `${tribute} coin offered with it — the score says this empire owes ${round1(owed)}`
                  : `under the ${ai.war.sueFloor} this seat sues at, and with nothing to offer but a white peace`,
              value: 0,
            },
          ],
        });
        taken = {
          enemy,
          command: {
            type: 'proposePeace',
            playerId: player.id,
            targetId: enemy.id,
            ...(offered === undefined ? {} : { give: offered.give, take: offered.take }),
          },
          summary:
            `Sues the ${enemy.name} for peace: the war reads ${round1(score.total)} for this empire, under the ` +
            `${ai.war.sueFloor} it sues at` +
            (tribute > 0 ? `, and ${tribute} coin goes with the paper.` : ' — a white peace, nothing offered.'),
        };
        continue;
      }
      rows.push({ label: `${label} — cannot sue: ${refusal}`, score: 0, chosen: false, terms: [], rejected: refusal });
      continue;
    }

    rows.push({
      label: `${label} — fights on`,
      score: score.total,
      chosen: false,
      terms: [
        ...score.terms,
        { label: `over the ${ai.war.sueFloor} this seat sues at`, value: 0 },
      ],
    });
  }

  if (taken === null) return null;
  return {
    kind: 'war',
    command: taken.command,
    subject: taken.enemy.name,
    summary: taken.summary,
    candidates: rows,
  };
}

/**
 * One side of a peace paper.
 *
 * `PeaceTerms.a`/`b` are keyed to the **war row's** two ids (`wars.ts`), whose
 * `a` is the lower of the pair — so whose half is whose is decided by that one
 * comparison and never by who wrote the paper. `whose` is the seat wanted and
 * `other` the seat across the table; both are needed because the key is the
 * pair rather than either seat alone.
 */
function sideOf(paper: { a: DealTerms; b: DealTerms }, whose: number, other: number): DealTerms {
  return whose < other ? paper.a : paper.b;
}

// --- a war this seat could start --------------------------------------------

/**
 * The declaration, or `null` — the policy the ruling asked for (section 8):
 * *"declare when army advantage × aggression clears a threshold and a target
 * city is in reach"*.
 *
 * Three clauses, all printed:
 *
 *   · **the ratio** — this seat's standing army over the target's, which is the
 *     "army advantage"; a target with no army at all reads as a ratio against
 *     one, so an empire with a single warrior is not infinitely inviting;
 *   · **the appetite** — `1 + military.aggression`, the seat's taste for a
 *     fight. It *loosens* the bar rather than multiplying it to nothing, and
 *     that is a deliberate reading of the ruling: a bare multiplication by an
 *     aggression of zero could never express "a peaceful empire that declares
 *     only at overwhelming advantage", which is exactly the behaviour the flags
 *     ask of a wide seat. A seat that must never declare says so with an
 *     unreachable `declareThresholdPeaceful` instead (tall and zealot both do);
 *   · **the reach** — one of their towns within `war.reachRadius` of one of this
 *     seat's pieces. An empire cannot be invaded across an ocean by a policy
 *     that has no navy.
 *
 * The truce is not a clause here at all: `declareWarError` refuses through one
 * and its sentence carries the countdown, so a target inside a truce appears in
 * the table as a candidate the *rules* removed.
 */
function declareDecision(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): BotDecision | null {
  const ai = ctx.ai;
  const warlike = ai.military.aggression > 0;
  const threshold = warlike ? ai.war.declareThreshold : ai.war.declareThresholdPeaceful;
  const appetite = 1 + Math.max(0, ai.military.aggression);
  const mine = armyStrength(state, player.id);
  const rows: BotCandidate[] = [];
  let best: { enemy: Player; score: number; target: City; distance: number; row: number } | null = null;

  for (const enemy of rivalsOf(state, player)) {
    const label = `the ${enemy.name}`;
    const refusal = declareWarError(state, player.id, enemy.id);
    if (refusal !== null) {
      rows.push({ label, score: 0, chosen: false, terms: [], rejected: refusal });
      continue;
    }
    const theirs = armyStrength(state, enemy.id);
    const ratio = mine / Math.max(1, theirs);
    const appraisal = appraise([
      { label: `our ${mine} strength against their ${theirs}`, value: ratio },
      { label: `× ${round1(appetite)} — this seat's appetite for a fight`, value: appetite, op: 'mul' },
    ]);
    const reach = nearestTownInReach(state, player, enemy, ai);
    const terms: ValueTerm[] = [
      { label: 'the army advantage, with appetite', value: appraisal.total, parts: appraisal.terms },
      {
        label:
          reach === null
            ? `no town of theirs within ${ai.war.reachRadius} hexes of anything of ours`
            : `${reach.city.name} stands ${reach.distance} hexes from one of our pieces`,
        value: 0,
      },
      { label: `(the bar is ${threshold})`, value: 0 },
    ];
    if (reach === null || appraisal.total < threshold) {
      rows.push({ label, score: appraisal.total, chosen: false, terms });
      continue;
    }
    rows.push({ label, score: appraisal.total, chosen: false, terms });
    if (best === null || appraisal.total > best.score) {
      best = {
        enemy,
        score: appraisal.total,
        target: reach.city,
        distance: reach.distance,
        row: rows.length - 1,
      };
    }
  }

  if (best === null) return null;
  rows[best.row]!.chosen = true;
  return {
    kind: 'war',
    command: { type: 'declareWar', playerId: player.id, targetId: best.enemy.id },
    subject: best.enemy.name,
    summary:
      `Declares war on the ${best.enemy.name}: the army ratio with this seat's appetite reads ` +
      `${round1(best.score)} against a bar of ${threshold}, and ${best.target.name} stands ` +
      `${best.distance} hexes from one of its pieces.`,
    candidates: rows,
    focus: { col: best.target.col, row: best.target.row },
  };
}

/** The nearest town of `enemy` to any piece of `player`'s, inside the reach. */
function nearestTownInReach(
  state: GameState,
  player: Player,
  enemy: Player,
  ai: AiConfig,
): { city: City; distance: number } | null {
  let best: { city: City; distance: number } | null = null;
  for (const city of state.cities) {
    if (city.ownerId !== enemy.id) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    const here = tileHex(tile);
    for (const unit of state.units) {
      if (unit.ownerId !== player.id) continue;
      if (!isCombatant(unitDef(unit.type))) continue;
      const from = getTileAt(state.map, unit.col, unit.row);
      if (!from) continue;
      const distance = wrappedDistance(state.map, here, tileHex(from));
      if (distance > ai.war.reachRadius) continue;
      if (best === null || distance < best.distance) best = { city, distance };
    }
  }
  return best;
}

// --- a bargain this seat could offer ----------------------------------------

/**
 * One 1:1 luxury swap put to a peer — a kind this empire holds **twice** for a
 * kind it holds **none** of (the ruled rule, section 7).
 *
 * Small on purpose: this is the whole of what a v1 bot proposes. The throttle is
 * the reducer's own — `bargainSeatError` refuses a second standing proposal from
 * one seat to the same seat — so there is no register here and no memory to keep,
 * which is what lets a stateless policy offer a bargain at all.
 *
 * Seats in roster order and resources in the table's own order, so which of two
 * equally good swaps is offered is a fact the replay reproduces.
 */
function swapDecision(state: GameState, player: Player, ctx: ValueContext): BotDecision | null {
  const spare = controlledResources(state, player.id, 'luxury').filter(
    (id) => resourceCopies(state, player.id, id) >= 2,
  );
  if (spare.length === 0) return null;
  const rows: BotCandidate[] = [];
  for (const enemy of rivalsOf(state, player)) {
    const seats = bargainSeatError(state, player.id, enemy.id);
    if (seats !== null) {
      rows.push({ label: `the ${enemy.name}`, score: 0, chosen: false, terms: [], rejected: seats });
      continue;
    }
    for (const wanted of controlledResources(state, enemy.id, 'luxury')) {
      if (hasResource(state, player.id, wanted)) continue;
      for (const offered of spare) {
        if (hasResource(state, enemy.id, offered)) continue;
        const give: DealTerms = { luxuries: [offered] };
        const take: DealTerms = { luxuries: [wanted] };
        const label = `${resourceDef(offered).name} for the ${enemy.name}' ${resourceDef(wanted).name.toLowerCase()}`;
        const refusal = proposeDealError(state, player.id, enemy.id, give, take);
        if (refusal !== null) {
          rows.push({ label, score: 0, chosen: false, terms: [], rejected: refusal });
          continue;
        }
        const paper = explainPaper(state, player, take, give, ctx).appraisal;
        rows.push({ label, score: paper.total, chosen: true, terms: paper.terms });
        return {
          kind: 'deal',
          command: { type: 'proposeDeal', playerId: player.id, targetId: enemy.id, give, take },
          subject: enemy.name,
          summary:
            `Offers the ${enemy.name} a swap: ${resourceDef(offered).name.toLowerCase()} it holds twice for ` +
            `${resourceDef(wanted).name.toLowerCase()} it holds none of.`,
          candidates: rows,
        };
      }
    }
  }
  return null;
}

/** One decimal place, for a summary sentence. `bot.ts`' own `round1`. */
function round1(value: number): string {
  const fixed = Math.round(value * 10) / 10;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(1);
}


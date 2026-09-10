/**
 * **The bot's leader draft** — which of the three cards a figure's row a seat
 * takes (batch L2a, `docs/leaders.md` "The draft").
 *
 * The three columns are three different kinds of thing and the whole of this
 * file is the one exchange that lets them be compared:
 *
 *   · a **passive** is a *rate* — a list of card effects, live for the rest of
 *     the game — and is priced by `explainEffects`, the bot's own flat opinion
 *     about a card, exactly as an Order in a draft is;
 *   · a **boon** is a *stock* — one lump, once — and is converted into a rate by
 *     `score.lumpTurns`, the one exchange between the two in the whole bot;
 *   · a **unique** is a *row*, and is priced by the row's own appraiser —
 *     `explainSoldier` for a soldier, `explainBuildingRow` for a building — plus
 *     whatever standing effects the card carries beside the row.
 *
 * Highest wins, ties by the order the row was written in, and the whole thing is
 * a pure function of the board (hard rule 2: no `Math.random`, arrays in file
 * order). Every option carries `chooseLeaderCardError`'s own sentence when the
 * rules refuse it, so the arm can never propose a command the reducer would turn
 * down — the driver's standing rule that a refusal is a bug.
 *
 * **What it is deliberately not.** A leader card is held for the rest of the
 * game and a good appraisal of one would ask what the realm will look like in
 * forty turns; this asks what the card is worth on the board in front of it,
 * which is `explainEffects`' own stated crudeness one scale out. A card whose
 * whole text is deferred appraises at nothing and is passed over, which is the
 * honest answer rather than a special case.
 *
 * A leaf on purpose: `value.ts` owns the prices and knows nothing about the
 * decks, and `bot.ts` sends the command. Nothing imports this back.
 */

import { chooseLeaderCardError, leaderBlocker } from '../sim/leaders';
import { type LeaderCard, type LeaderCardId, leaderCard } from '../sim/leaderData';
import type { GameState, LeaderOffer, Player } from '../sim/state';
import { buildingDef, isBuildingId } from '../sim/buildingData';
import { isUnitTypeId, unitDef } from '../sim/unitData';
import { citiesOf } from '../sim/state';
import type { TechAge } from '../sim/techData';

import { type ValueTerm, foldTerms, nest } from './decision';
import {
  type ValueContext,
  type YieldBag,
  VOICES,
  explainBuildingRow,
  explainEffects,
  explainLump,
  explainSoldier,
  lumpOfPoints,
} from './value';

/** One card of the row, appraised — or refused by the rules before it was. */
export interface LeaderOption {
  index: number;
  id: LeaderCardId;
  name: string;
  kind: LeaderCard['kind'];
  /** The fold of `terms`. Never a number computed beside them. */
  score: number;
  terms: ValueTerm[];
  /** The simulation's own refusal (`chooseLeaderCardError`), when there is one. */
  rejected: string | null;
}

/** The three cards, appraised, and the one this seat would take. */
export interface LeaderPickPlan {
  offer: LeaderOffer;
  age: TechAge;
  options: LeaderOption[];
  best: LeaderOption | null;
}

/**
 * What a boon is worth, converted into a rate.
 *
 * The lump half goes through `explainLump` for the six voices — one exchange,
 * `score.lumpTurns`, shared with every other gift in the game — and through
 * `lumpOfPoints` for the two figures that are not voices at all: renown, priced
 * by its own weight, and a citizen, priced as the town it makes. A `where` of
 * `'every'` multiplies by the towns that would take it, which is the difference
 * between "a citizen in your capital" and "a citizen in every city" and is the
 * one board reading this appraisal makes.
 *
 * The grants are priced by the thing granted: a piece by `explainSoldier`, a
 * name by what one more great person is worth to this seat. A grant this seat
 * could not take — a name while a name is already waiting — is not discounted
 * here, because the bot cannot know that until it asks and the answer would be a
 * second copy of `payGrants`' own refusals.
 */
function explainBoon(card: LeaderCard, ctx: ValueContext): ValueTerm[] {
  const boon = card.boon;
  if (boon === undefined) return [];
  const terms: ValueTerm[] = [];

  const windfall = boon.windfall;
  if (windfall !== undefined) {
    const towns = windfall.where === 'every' ? Math.max(1, citiesOf(ctx.state, ctx.playerId).length) : 1;
    const total = windfall.amount * towns;
    const voice = VOICES.find((name) => name === windfall.yield);
    if (voice !== undefined) {
      const bag: YieldBag = { [voice]: total };
      terms.push(nest(`${total} ${voice}, once`, explainLump(bag, ctx)));
    } else if (windfall.yield === 'renown') {
      terms.push(nest(`${total} renown, once`, lumpOfPoints(total * ctx.ai.weights.renown, ctx)));
    } else if (windfall.yield === 'population') {
      // A citizen is not a lump of anything — it is a worked tile for the rest
      // of the game — so it is priced as a share of what a whole town is worth
      // and *not* divided by `lumpTurns`. `weights.city` is the one figure the
      // bot has for "a town", and a citizen is a fraction of one.
      terms.push({
        label: `${total} more citizens`,
        value: (total * ctx.ai.weights.city) / 10,
      });
    }
  }

  for (const grant of boon.grants ?? []) {
    if (grant.grant === 'unit' && grant.unit !== 'bestMelee' && isUnitTypeId(grant.unit)) {
      const name = unitDef(grant.unit).name;
      const soldier = explainSoldier(grant.unit, ctx);
      // `explainSoldier` answers a card-shaped nothing for a piece that does not
      // fight — a prophet, a settler — because it prices strength and threat and
      // neither is a thing a prophet has. A gift that is worth nothing to the
      // appraisal would rank below a card with no gift at all, which is wrong,
      // so an uncounted piece takes the nominal every unpriced clause takes.
      terms.push(
        soldier.terms.length > 0
          ? nest(`a free ${name}`, soldier)
          : { label: `a free ${name}`, value: ctx.ai.score.unknownEffect },
      );
      continue;
    }
    if (grant.grant === 'greatPerson') {
      terms.push({
        label: 'a great person, called',
        value: ctx.ai.weights.renown * ctx.ai.score.lumpTurns,
      });
      continue;
    }
    if (grant.grant === 'tech') {
      terms.push({ label: 'a technology', value: ctx.ai.weights.tech });
      continue;
    }
    // Everything else the union can carry — a bead, a building, a draft, a rung
    // — is worth *something* and the bot has no honest figure for it, so it
    // takes the same nominal every unpriced effect takes. Said out loud rather
    // than left at nought: a card whose only clause the bot cannot read must not
    // rank below a card with no clauses at all.
    terms.push({ label: `${grant.grant}, granted`, value: ctx.ai.score.unknownEffect });
  }
  return terms;
}

/** What the row a unique opens is worth, on the board in front of this seat. */
function explainUnique(card: LeaderCard, ctx: ValueContext): ValueTerm[] {
  const terms: ValueTerm[] = [];
  const unit = card.unlocks?.unit;
  if (unit !== undefined && isUnitTypeId(unit)) {
    terms.push(nest(`the ${unitDef(unit).name} it opens`, explainSoldier(unit, ctx)));
  }
  const building = card.unlocks?.building;
  if (building !== undefined && isBuildingId(building)) {
    terms.push(nest(`the ${buildingDef(building).name} it opens`, explainBuildingRow(building, ctx)));
  }
  return terms;
}

/**
 * **What this seat would take, and why** — the whole of the decision, exported
 * so the feed, the tests and `bot.ts` all read the one appraisal.
 *
 * `null` when there is no row to answer. Ties go to the column the sheet wrote
 * first, which is the tie-break every sweep in this game uses.
 */
export function appraiseLeaderCards(
  state: GameState,
  player: Player,
  ctx: ValueContext,
): LeaderPickPlan | null {
  const offer = leaderBlocker(state, player.id);
  if (offer === null) return null;

  const options: LeaderOption[] = [];
  for (let index = 0; index < offer.cards.length; index += 1) {
    const id = offer.cards[index]!;
    const rejected = chooseLeaderCardError(state, player.id, index);
    const card = leaderCard(id);
    if (rejected !== null) {
      options.push({
        index,
        id,
        name: card.name,
        kind: card.kind,
        score: 0,
        terms: [],
        rejected,
      });
      continue;
    }
    const terms: ValueTerm[] = [];
    // The standing half is asked of the card's *own* effects rather than of
    // `leaderCardEffects`, so a unique's `unlocksUnit` is not priced twice —
    // once as an effect the bot cannot read and once as the row it opens.
    const standing = card.effects ?? [];
    if (standing.length > 0) {
      terms.push(nest('what it pays for the rest of the game', explainEffects(standing, ctx, id)));
    }
    terms.push(...explainBoon(card, ctx));
    terms.push(...explainUnique(card, ctx));
    options.push({
      index,
      id,
      name: card.name,
      kind: card.kind,
      score: foldTerms(terms),
      terms,
      rejected: null,
    });
  }

  let best: LeaderOption | null = null;
  for (const option of options) {
    if (option.rejected !== null) continue;
    if (best === null || option.score > best.score) best = option;
  }
  return { offer, age: offer.age, options, best };
}

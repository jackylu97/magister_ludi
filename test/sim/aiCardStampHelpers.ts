/**
 * **The bot's card price against the card's stamp** — the readings both tiers
 * of the bot batch BP3 checks share (`aiCardStamp.test.ts` and
 * `aiCardStamp.slow.test.ts`). The ruling is `docs/flags.md` (ooooooo), B8:
 * where the sim can stamp a card on a copy of the seat's state, the bot takes
 * that figure as the card's pay now, and keeps its own readings only for what a
 * stamp cannot see.
 *
 * A helper module and not a test file, so importing it registers no test
 * (CLAUDE.md, "Commands & test discipline").
 */

import { hammerTerm, meterWeight, voiceWeight } from '../../src/ai/prices';
import { type ValueContext, explainCardStamp } from '../../src/ai/value';
import {
  type CardImpactSubject,
  cardImpactWorlds,
  explainCardImpact,
  foldCardImpact,
} from '../../src/sim/cardImpact';
import { authorityOf, happinessOf } from '../../src/sim/meters';
import { BELIEF_IDS, beliefDef, beliefPoolOf, isBeliefId } from '../../src/sim/religionData';
import { renownPerTurn } from '../../src/sim/renown';
import { discardSlates } from '../../src/sim/slate';
import type { GameState, Player } from '../../src/sim/state';
import { expectedHandBags } from '../../src/sim/statecraft';
import { neverSeatedError } from '../../src/sim/statecraft/council';
import {
  type CardEffect,
  type CardId,
  DECK_IDS,
  DOCTRINE_IDS,
  doctrineDef,
  isDoctrineId,
  isOrderId,
  orderDef,
} from '../../src/sim/statecraftData';

const VOICES = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;

/** The stamp's subject for a card of one of the three classes the bot stamps. */
export function subjectOf(id: CardId): CardImpactSubject {
  if (isOrderId(id)) return { kind: 'order', id };
  if (isDoctrineId(id)) return { kind: 'doctrine', id };
  if (isBeliefId(id)) return { kind: 'belief', id };
  throw new Error(`${id} is not a card the bot stamps`);
}

/**
 * **Every card a seat could be asked to price at this moment**, of the three
 * classes the bot stamps: the Orders its decks could deal next and the Orders it
 * holds that may take a chair, every live Doctrine of its decks, and every live
 * pantheon god. In the order the data lists them, so two runs read the same list.
 */
export function cardsToPrice(state: GameState, player: Player): CardId[] {
  const sc = player.statecraft;
  const decks = player.decks.length > 0 ? player.decks : [...DECK_IDS];
  const ids: CardId[] = [];
  const seen = new Set<CardId>();
  const add = (id: CardId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const bag of expectedHandBags(state, player)) for (const id of bag) add(id);
  for (const id of sc.orders) add(id);
  for (const id of DOCTRINE_IDS) {
    const def = doctrineDef(id);
    if (def.retired === true || !def.decks.some((deck) => decks.includes(deck))) continue;
    add(id);
  }
  for (const id of BELIEF_IDS) {
    if (beliefDef(id).retired === true || beliefPoolOf(id) !== null) continue;
    add(id);
  }
  return ids.filter((id) => !isOrderId(id) || neverSeatedError(sc, id) === null);
}

/**
 * **The sim's own stamp of a card, in the bot's currency** — the figure the
 * bot's price must equal.
 *
 * The six voices are `foldCardImpact` of `explainCardImpact`, the stamp a card's
 * face prints. The two meters are what the meters' own folds read on the stamp's
 * two boards; the face prints them to a tenth (`meterMoved`), and the check holds
 * the printed line to that tenth separately. Renown is read on the same two boards,
 * because the face does not print it. The hammer premium is the bot's own rule for
 * every candidate that raises production (`hammerTerm`).
 *
 * `null` where the sim has no pair for the card.
 */
export function stampOfTheSim(
  state: GameState,
  playerId: number,
  id: CardId,
  ctx: ValueContext,
): { worth: number; meterLinesOff: string[] } | null {
  const subject = subjectOf(id);
  const worlds = cardImpactWorlds(state, playerId, subject);
  if (worlds === null) return null;
  const lines = explainCardImpact(state, playerId, subject);
  const fold = foldCardImpact(lines);
  let worth = 0;
  for (const voice of VOICES) worth += fold[voice] * voiceWeight(ctx, voice);
  const meterLinesOff: string[] = [];
  for (const meter of ['happiness', 'authority'] as const) {
    const read = meter === 'happiness' ? happinessOf : authorityOf;
    const moved = read(worlds.with, playerId) - read(worlds.without, playerId);
    const printed = lines.find((line) => line.kind === 'meter' && line.meter === meter)?.amount ?? 0;
    if (Math.abs(moved - printed) > 0.05 + 1e-9) meterLinesOff.push(`${meter} ${moved} against ${printed}`);
    worth += moved * meterWeight(ctx, meter);
  }
  worth += (renownPerTurn(worlds.with, playerId) - renownPerTurn(worlds.without, playerId)) * ctx.ai.weights.renown;
  const hammers = hammerTerm(fold.production, ctx);
  if (hammers !== null) worth += hammers.value;
  return { worth, meterLinesOff };
}

/** The row a card's effects live on, for the three classes the bot stamps. */
function rowOf(id: CardId): { effects: CardEffect[] } {
  if (isOrderId(id)) return orderDef(id);
  if (isDoctrineId(id)) return doctrineDef(id);
  if (isBeliefId(id)) return beliefDef(id);
  throw new Error(`${id} is not a card the bot stamps`);
}

/**
 * **Lends a card's row other effects, until the returned function is called.**
 * The swap announces itself to the slate both ways (`discardSlates`), because the
 * bot's stamp is remembered on the board's clock and a row is not the board.
 */
export function lendCardEffects(id: CardId, effects: readonly CardEffect[]): () => void {
  const row = rowOf(id);
  const before = row.effects;
  row.effects = [...effects];
  discardSlates();
  return () => {
    row.effects = before;
    discardSlates();
  };
}

/**
 * **What one effect alone puts on the empire's books**, in the bot's currency:
 * the card's stamp with only that effect on its row, less its stamp with no
 * effect at all. The card's own chair and every other card's reading of it are on
 * both sides, so they cancel, and what is left is the effect's own footprint.
 */
export function footprintOf(ctx: ValueContext, id: CardId, effect: CardEffect): number {
  let bare = 0;
  let undo = lendCardEffects(id, []);
  try {
    bare = explainCardStamp(ctx, id)?.total ?? 0;
  } finally {
    undo();
  }
  let alone = 0;
  undo = lendCardEffects(id, [effect]);
  try {
    alone = explainCardStamp(ctx, id)?.total ?? 0;
  } finally {
    undo();
  }
  return alone - bare;
}

/**
 * A short name for an effect's shape, for a failure message and for the count of
 * shapes the slow check has seen: the kind, and for the kinds that hold a family
 * of rules, the rule.
 */
export function shapeOf(effect: CardEffect): string {
  if (effect.kind === 'pays') {
    return `pays/${effect.where}/${effect.basis ?? 'flat'}${effect.stage !== undefined ? '/stage' : ''}`;
  }
  if (
    effect.kind === 'rule' ||
    effect.kind === 'rulePercent' ||
    effect.kind === 'metaRule' ||
    effect.kind === 'meterRule'
  ) {
    return `${effect.kind}/${effect.rule}`;
  }
  if (effect.kind === 'effectAmplifier') return `${effect.kind}/${effect.target}`;
  return effect.kind;
}

/** The effects on a card's row. */
export function effectsOf(id: CardId): readonly CardEffect[] {
  return rowOf(id).effects ?? [];
}

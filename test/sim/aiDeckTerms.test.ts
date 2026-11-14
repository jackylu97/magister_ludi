/**
 * **Bot batch BP6 of bot pass 3, B1: the deck bonus is gone.** The spec is
 * `docs/flags.md` item (ooooooo), entry B1; the audit is
 * `docs/audit/bot-pass-3-card-values.md` fault 1.
 *
 * The bonus added 14 points for each held card of an offered card's deck, with
 * a seated card counted twice and no cap. It decided 42% of Order picks. The
 * user asked why a greedy pick on the cards' own prices would need it, and
 * ruled it out. Pinned here:
 *
 *   - a card's own price (`explainCard`), which the chair arms read, has no deck
 *     term at all;
 *   - a pick (`explainDraftCard`) adds a tie-break of at most
 *     `score.deck.tieBreak`, the knob times the share of held cards of the deck;
 *   - a common card and a card already held get no deck term;
 *   - the progress toward a Doctrine still to come that counts the seat's Orders
 *     (The Magnaura counts seated Civic Orders) is priced on a pick of a card
 *     that joins the count, and on no other card;
 *   - the cautious version behind `score.deck.sharePerCard`: a share of the
 *     card's own price for each held card of its deck, capped, and nothing for
 *     a card worth nothing.
 */
import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { explainCard, explainDraftCard, slottingDecision } from '../../src/ai/council';
import { type ValueTerm, foldTerms } from '../../src/ai/decision';
import { explainForecastCount, explainDoctrineProgress } from '../../src/ai/value';
import aiJson from '../../data/ai.json';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { doctrineBagFor, draftCostFor } from '../../src/sim/statecraft/draft';
import { neverSeatedError } from '../../src/sim/statecraft';
import {
  type CardPaysEffect,
  type DeckId,
  type DoctrineId,
  type OrderId,
  ORDER_IDS,
  doctrineDef,
  isBoon,
  isCharter,
  orderDef,
  orderType,
} from '../../src/sim/statecraftData';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const DECK = aiJson.score.deck;
const MAGNAURA = 'theMagnaura' as DoctrineId;

const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);
/** A plain card of one deck that can sit: no Boon, no charter, no commission. */
const plainOf = (deck: DeckId, type?: string): OrderId[] =>
  LIVE.filter(
    (id) =>
      orderDef(id).decks.length === 1 &&
      orderDef(id).decks[0] === deck &&
      !isBoon(id) &&
      !isCharter(id) &&
      orderDef(id).commission === undefined &&
      (type === undefined || orderType(id) === type),
  );

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** One town for seat 0 on a blank board, seat 0 holding the two decks named. */
function bench(decks: DeckId[]): { state: GameState; player: Player } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 14).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.turn = 30;
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 5;
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  const player = playerById(state, 0)!;
  player.decks = decks as never;
  bumpRevision(state);
  return { state, player };
}

/** Every term of an appraisal, nested parts included. */
function allTerms(terms: readonly ValueTerm[]): ValueTerm[] {
  return terms.flatMap((term) => [term, ...allTerms(term.parts ?? [])]);
}

const deckLabel = /deck/i;

describe('a card’s own price', () => {
  it('reads no deck: holding cards of its deck moves nothing', () => {
    const { state, player } = bench(['dominion', 'magisterial']);
    const [card, ...mates] = plainOf('dominion');
    const ctx = valueContext(state, player);
    const before = explainCard(player, card!, ctx);
    player.statecraft.orders = mates.slice(0, 6);
    bumpRevision(state);
    const after = explainCard(player, card!, valueContext(state, player));
    expect(after.total).toBe(before.total);
    expect(allTerms(after.terms).some((term) => deckLabel.test(term.label))).toBe(false);
  });

  it('is what the chair arms read, with no tie-break', () => {
    const { state, player } = bench(['dominion', 'magisterial']);
    const cards = plainOf('dominion');
    player.statecraft.orders = cards.slice(0, 4);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const decision = slottingDecision(state, player)!;
    for (const row of decision.candidates) {
      if (row.rejected !== undefined) continue;
      const card = cards.slice(0, 4).find((id) => row.label.startsWith(orderDef(id).name))!;
      expect(row.terms[0]!.label).toBe('what the card is worth');
      expect(row.terms[0]!.value).toBeCloseTo(explainCard(player, card, ctx).total, 9);
      expect(allTerms(row.terms).some((term) => /tie-break|deck share|toward the Doctrines/.test(term.label))).toBe(false);
    }
  });
});

describe('a pick', () => {
  it('adds a tie-break of the knob times the share of held cards of its deck', () => {
    // No culture: no adoption is ahead, so no Doctrine progress is priced and
    // the pick is the card's own price plus the tie-break alone.
    const { state, player } = bench(['dominion', 'magisterial']);
    const dominion = plainOf('dominion');
    const magisterial = plainOf('magisterial');
    const offered = dominion[0]!;
    player.statecraft.orders = [...dominion.slice(1, 4), magisterial[0]!];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const own = explainCard(player, offered, ctx).total;
    const pick = explainDraftCard(player, offered, ctx);
    expect(foldTerms(pick.terms)).toBe(pick.total);
    const tie = pick.terms.find((term) => term.label.startsWith('the deck tie-break'))!;
    expect(tie.value).toBeCloseTo((DECK.tieBreak * 3) / 4, 12);
    expect(pick.total).toBeCloseTo(own + (DECK.tieBreak * 3) / 4, 9);
    // The other deck's card breaks a tie by its own, smaller share.
    const other = explainDraftCard(player, magisterial[1]!, ctx);
    const otherTie = other.terms.find((term) => term.label.startsWith('the deck tie-break'))!;
    expect(otherTie.value).toBeCloseTo((DECK.tieBreak * 1) / 4, 12);
    // No pick moves by more than the knob.
    expect(tie.value).toBeLessThanOrEqual(DECK.tieBreak);
  });

  it('adds nothing to a common card or to a card already held', () => {
    const { state, player } = bench(['dominion', 'magisterial']);
    const dominion = plainOf('dominion');
    const common = LIVE.find((id) => orderDef(id).decks.length === 0 && !isBoon(id) && !isCharter(id))!;
    player.statecraft.orders = dominion.slice(0, 3);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(explainDraftCard(player, common, ctx).total).toBe(explainCard(player, common, ctx).total);
    expect(explainDraftCard(player, dominion[0]!, ctx).total).toBe(explainCard(player, dominion[0]!, ctx).total);
  });
});

describe('the progress toward a Doctrine still to come', () => {
  /** A Magisterial seat one draft below the tier-10 adoption, with culture to buy hands. */
  function nearTheAdoption(decks: DeckId[]): { state: GameState; player: Player } {
    const bench0 = bench(decks);
    bench0.player.statecraft.drafts = 9;
    bench0.player.culturePool = 5000;
    bumpRevision(bench0.state);
    return bench0;
  }

  /** The hands the seat's culture buys over the horizon, walked as the bot walks them. */
  function draftsAheadOf(state: GameState, player: Player): number {
    const income = Math.max(0, foldEmpireRates(state, player.id).culturePerTurn ?? 0);
    let budget = Math.max(0, player.culturePool) + income * HORIZON;
    let drafts = 0;
    while (drafts < HORIZON) {
      const price = draftCostFor(state, player, player.statecraft.drafts + drafts);
      if (price > budget) break;
      budget -= Math.max(0, price);
      drafts += 1;
    }
    return drafts;
  }

  it('prices what a Civic Order adds to The Magnaura’s count, at the chance and the wait of the adoption', () => {
    const { state, player } = nearTheAdoption(['magisterial', 'dominion']);
    const bag = doctrineBagFor(state, player, 10);
    expect(bag).toContain(MAGNAURA);
    const civic = LIVE.find(
      (id) =>
        orderType(id) === 'civic' && orderDef(id).decks.length > 0 && neverSeatedError(player.statecraft, id) === null,
    )!;
    expect(civic).toBeDefined();
    const ctx = valueContext(state, player);
    const progress = explainDoctrineProgress(civic, ctx)!;
    expect(progress).not.toBeNull();
    const [line] = doctrineDef(MAGNAURA).effects as CardPaysEffect[];
    const onePays = explainForecastCount([line!], 1, 'one', ctx).total;
    const pace = draftsAheadOf(state, player) / HORIZON;
    const delay = 1 / pace;
    const discount = Math.max(0, (HORIZON - delay) / HORIZON);
    const magnaura = progress.terms.find((term) => term.label.startsWith(doctrineDef(MAGNAURA).name))!;
    expect(magnaura.value).toBeCloseTo((onePays * discount) / bag.length, 9);
    // The pick carries it beside the tie-break.
    const pick = explainDraftCard(player, civic, ctx);
    expect(pick.terms.some((term) => term.label === 'progress toward the Doctrines its decks still offer')).toBe(true);
  });

  it('prices nothing for a card that joins no count, a card already held, or a seat whose decks have no such Doctrine', () => {
    const near = nearTheAdoption(['magisterial', 'dominion']);
    const military = plainOf('dominion', 'military')[0]!;
    expect(explainDoctrineProgress(military, valueContext(near.state, near.player))).toBeNull();
    const civic = LIVE.find((id) => orderType(id) === 'civic' && !isBoon(id) && !isCharter(id))!;
    near.player.statecraft.orders = [civic];
    bumpRevision(near.state);
    expect(explainDoctrineProgress(civic, valueContext(near.state, near.player))).toBeNull();
    const other = nearTheAdoption(['commerce', 'devotion']);
    expect(explainDoctrineProgress(civic, valueContext(other.state, other.player))).toBeNull();
  });
});

describe('the cautious version', () => {
  it('adds a share of the card’s own price for each held card of its deck, up to the cap, in place of the tie-break', () => {
    const { state, player } = bench(['dominion', 'magisterial']);
    const dominion = plainOf('dominion');
    const sheet = { score: { deck: { sharePerCard: 0.05 } } } as never;
    withAiTuning(sheet, () => {
      // Pick a card that pays something, so the share has a price to take.
      player.statecraft.orders = [];
      bumpRevision(state);
      const ctx0 = valueContext(state, player);
      const offered = dominion.find((id) => explainCard(player, id, ctx0).total > 0)!;
      expect(offered).toBeDefined();
      for (const held of [3, 14]) {
        player.statecraft.orders = dominion.filter((id) => id !== offered).slice(0, held);
        bumpRevision(state);
        const ctx = valueContext(state, player);
        const own = explainCard(player, offered, ctx).total;
        const pick = explainDraftCard(player, offered, ctx);
        const share = Math.min(DECK.shareCap, 0.05 * player.statecraft.orders.length);
        expect(pick.total).toBeCloseTo(own * (1 + share), 9);
        expect(pick.terms.some((term) => term.label.startsWith('the deck tie-break'))).toBe(false);
      }
    });
  });

  it('adds nothing to a card worth nothing or less', () => {
    const { state, player } = bench(['dominion', 'magisterial']);
    const dominion = plainOf('dominion');
    withAiTuning({ score: { deck: { sharePerCard: 0.05 } } } as never, () => {
      player.statecraft.orders = dominion.slice(0, 5);
      bumpRevision(state);
      const ctx = valueContext(state, player);
      let asked = 0;
      for (const id of dominion.slice(5)) {
        const own = explainCard(player, id, ctx).total;
        if (own > 0) continue;
        asked += 1;
        expect(explainDraftCard(player, id, ctx).total).toBe(own);
      }
      expect(asked).toBeGreaterThan(0);
    });
  });
});

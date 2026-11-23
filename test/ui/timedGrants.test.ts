/**
 * A card whose pay is a timed grant: The Golden Age (the user, 2026-11-22, from
 * a playtest: "'the golden age' is showing no yields in my playtest, is it
 * applying properly? Also, for cards that have a time duration, could we add
 * an indicator for how much longer it will be active ('6 turns left'). I'd
 * also like to combine card effect clauses").
 *
 * The card did apply. Its bonus is its own piece in the Temporary stack of the
 * In play screen, and the user chose to keep it there: "it's added as a
 * temporary ability ... I like this better actually, in that it implies the
 * bonus will persist even if i take the card out". These tests hold each route
 * that starts the bonus, that it outlasts the card's chair, the words for the
 * turns left, and the card's one sentence.
 */

import { describe, expect, it } from 'vitest';

import { buildingProductionCost, foundCityAt, realiseItem, settleProduction } from '../../src/sim/cities';
import { settleGreatPersonChoice } from '../../src/sim/greatPeople';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { describeCard, explainCardPercentYields, stripRefs } from '../../src/sim/statecraft';
import type { OrderId } from '../../src/sim/statecraftData';
import { inPlayLayout, piecesFigures } from '../../src/ui/inPlayPieces';
import { turnsLeftOn, turnsLeftWords } from '../../src/ui/turnsLeft';
import { at, bareState } from '../sim/improvementHelpers';

const CARD = 'theGoldenAge' as OrderId;

function seated(): { state: GameState; city: City } {
  const state = bareState(20, 10);
  const city = foundCityAt(state, 0, at(state, 3, 5));
  city.population = 3;
  city.queue = [];
  const sc = playerById(state, 0)!.statecraft;
  sc.orders.push(CARD);
  sc.slots.push({ card: CARD, sealedUntil: state.turn });
  bumpRevision(state);
  return { state, city };
}

/** The percent the card puts on one of a town's yields. */
function percent(state: GameState, city: City, voice: 'production' | 'culture'): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === CARD && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

function row(state: GameState): ReturnType<typeof inPlayLayout>['stacks'][number]['entries'][number] {
  const council = inPlayLayout(state, 0).stacks.find((stack) => stack.id === 'council')!;
  return council.entries.find((entry) => entry.card === CARD)!;
}

describe('The Golden Age applies by each of its two moments', () => {
  it('starts when a wonder is finished', () => {
    const { state, city } = seated();
    expect(percent(state, city, 'production')).toBe(0);
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    bumpRevision(state);
    expect(percent(state, city, 'production')).toBe(25);
    expect(percent(state, city, 'culture')).toBe(25);
  });

  it('starts when a great person is gained, by the one route a great person arrives', () => {
    // A called person, a bought one and one a card or a wonder grants all end
    // in an offer, and `settleGreatPersonChoice` is the one function that
    // settles an offer. It announces the moment.
    const { state, city } = seated();
    const player = playerById(state, 0)!;
    const person = GREAT_PERSON_IDS.find((id) => greatPersonDef(id).family === 'scholar')!;
    player.greatPersonOffer = { options: [person] };
    settleGreatPersonChoice(state, player, 0);
    bumpRevision(state);
    expect((player.timed ?? []).filter((entry) => entry.card === CARD)).toHaveLength(2);
    expect(percent(state, city, 'production')).toBe(25);
    expect(percent(state, city, 'culture')).toBe(25);
  });
});

describe('which wonders start it', () => {
  it('starts for a wonder a city finishes with its production', () => {
    const { state, city } = seated();
    city.queue = [{ kind: 'building', id: 'pyramids' as never }];
    city.hammerBasket = buildingProductionCost('pyramids' as never, state, 0);
    settleProduction(state, city);
    bumpRevision(state);
    expect(city.buildings).toContain('pyramids');
    expect(percent(state, city, 'production')).toBe(25);
    expect(percent(state, city, 'culture')).toBe(25);
  });

  it('does not start for a wonder finished before the card was seated', () => {
    // The card pays on the moment, so it must be in a chair when the wonder is
    // finished. A wonder that already stands starts nothing.
    const state = bareState(20, 10);
    const city = foundCityAt(state, 0, at(state, 3, 5));
    city.queue = [];
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    const sc = playerById(state, 0)!.statecraft;
    sc.orders.push(CARD);
    sc.slots.push({ card: CARD, sealedUntil: state.turn });
    bumpRevision(state);
    expect(percent(state, city, 'production')).toBe(0);
    expect(temporary(state)).toBeUndefined();
  });
});

/** The card's bonus, as the piece of the Temporary stack. */
function temporary(state: GameState): ReturnType<typeof row> | undefined {
  const stack = inPlayLayout(state, 0).stacks.find((one) => one.id === 'temporary')!;
  return stack.entries.find((entry) => entry.card === CARD);
}

describe('the bonus on the In play screen', () => {
  it('is its own temporary piece, named for the card, with the turns left', () => {
    const { state, city } = seated();
    expect(temporary(state)).toBeUndefined();
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    bumpRevision(state);
    const piece = temporary(state)!;
    expect(piece.name).toBe('The Golden Age');
    expect(piece.turnsLeft).toBe(10);
    expect(piece.endsTurn).toBe(state.turn + 10);
    expect(piecesFigures(state, 0, piece.subject!).production).toBeGreaterThan(0);
    // Four turns on, six are left: derived from the turn the bonus ends on.
    state.turn += 4;
    bumpRevision(state);
    expect(temporary(state)!.turnsLeft).toBe(6);
    state.turn += 6;
    bumpRevision(state);
    expect(temporary(state)).toBeUndefined();
  });

  it('stays for its full time when the card leaves the council', () => {
    // The user reads the temporary piece this way: "it implies the bonus will
    // persist even if i take the card out". It does.
    const { state, city } = seated();
    realiseItem(state, city, { kind: 'building', id: 'pyramids' as never });
    const sc = playerById(state, 0)!.statecraft;
    sc.slots = sc.slots.map(() => null);
    bumpRevision(state);
    expect(percent(state, city, 'production')).toBe(25);
    expect(temporary(state)!.turnsLeft).toBe(10);
    state.turn += 9;
    bumpRevision(state);
    expect(percent(state, city, 'culture')).toBe(25);
    state.turn += 1;
    bumpRevision(state);
    expect(percent(state, city, 'production')).toBe(0);
  });

  it('leaves the card’s own row with one line that points at the Temporary stack', () => {
    const { state } = seated();
    const entry = row(state);
    expect(entry.waiting).toBe('Its bonus shows under Temporary while it runs');
    expect(entry.turnsLeft).toBeUndefined();
    expect(entry.subject).toEqual({ kind: 'order', id: CARD });
  });
});

describe('the words for the turns left', () => {
  it('are derived from the turn a thing ends on, with one turn said as one turn', () => {
    expect(turnsLeftOn(12, 18)).toBe(6);
    expect(turnsLeftOn(18, 18)).toBe(0);
    expect(turnsLeftOn(20, 18)).toBe(0);
    expect(turnsLeftWords(6)).toBe('6 turns left');
    expect(turnsLeftWords(1)).toBe('1 turn left');
  });
});

describe('the card’s text', () => {
  it('is one sentence: both moments, both yields, the length said one time', () => {
    expect(describeCard(CARD).map((clause) => stripRefs(clause.text))).toEqual([
      'completing a wonder or gaining a great person grants +25% production and +25% culture in every city for 10 turns, restarted each time',
    ]);
  });
});

/**
 * **The card faces** (batch C1): the A3 board, drawn by the game's own builders.
 *
 * An Order's face says three things: the suit shows the deck, the ink shows the
 * type, and the rank shows the rarity (`src/ui/suitFace.ts`). The board
 * (`docs/plans/mockups/card-faces/SuitsRevised.dc.html`) shows a handful of
 * combinations; this section shows every one of them on demand, and the cards
 * the data actually holds.
 *
 * Nothing is reproduced. The hand card is the draft's own (`suitHandCard`,
 * `offerCard.ts`), the seated card and the row are `dressSuitFace` and
 * `suitRowNode`, the inks are `style.css`'s tokens through `data-ink`, and a
 * real card's face is `orderSuitFace`, the one function every surface draws an
 * Order from.
 */

import { describeCard } from '../sim/statecraft';
import {
  DECK_IDS,
  DECK_WORDS,
  ORDER_IDS,
  type OrderId,
  orderDef,
  orderIsDealt,
  orderType,
} from '../sim/statecraftData';
import { DECK_SUIT, orderSuitFace } from '../ui/deckBadges';
import { type OfferOption, suitHandCard } from '../ui/offerCard';
import {
  INK_IDS,
  type InkId,
  RANK_IDS,
  type RankId,
  SUIT_IDS,
  SUIT_WORD,
  type SuitFace,
  type SuitId,
  dressSuitFace,
  suitMarksNode,
  suitRankMarkNode,
  suitRowNode,
} from '../ui/suitFace';
import { block, controls, element, select, slider } from './sheet';

/** The inks in words, as the board's key prints them. */
const INK_LABEL: Readonly<Record<InkId, { type: string; colour: string }>> = {
  military: { type: 'Military', colour: 'Vermilion' },
  economic: { type: 'Economic', colour: 'Ochre' },
  civic: { type: 'Civic', colour: 'Lapis' },
  wildcard: { type: 'Wildcard', colour: 'Purple' },
};

/** The ranks in words, with the board's name for each ornament. */
const RANK_LABEL: Readonly<Record<RankId, { rarity: string; ornament: string }>> = {
  common: { rarity: 'Common', ornament: 'Pip' },
  uncommon: { rarity: 'Uncommon', ornament: 'Court' },
  rare: { rarity: 'Rare', ornament: 'Trump' },
};

/** What the specimen's suit knob can be: one suit, a pair, or no deck. */
const SUIT_CHOICES: readonly (readonly [string, string])[] = [
  ...SUIT_IDS.map((suit) => [suit, SUIT_WORD[suit]] as const),
  ['pair', 'Two decks (Swords and Cups)'],
  ['none', 'No deck (the seal)'],
];

/** The suits a choice of the knob stands for. */
function suitsOf(choice: string): SuitId[] {
  if (choice === 'pair') return ['swords', 'cups'];
  if (choice === 'none') return [];
  return [choice as SuitId];
}

/** The deck each suit belongs to, in the deck's own word, read off the one table that pairs them. */
const DECK_WORD_OF_SUIT: Readonly<Record<SuitId, string>> = Object.fromEntries(
  DECK_IDS.map((deck) => [DECK_SUIT[deck], DECK_WORDS[deck]]),
) as Record<SuitId, string>;

/** A sample face for the specimen, with the caption a real card would carry. */
function specimenFace(suits: readonly SuitId[], ink: InkId, rank: RankId): SuitFace {
  const deck =
    suits.length === 0 ? 'Generic' : suits.map((suit) => DECK_WORD_OF_SUIT[suit]).join(' · ');
  return {
    suits,
    ink,
    rank,
    numeral: 'III',
    deck,
    caption: `${INK_LABEL[ink].type} · ${RANK_LABEL[rank].rarity} · ${deck} · Tier III`,
  };
}

/** A hand card for the specimen, with the board's own sample words. */
function specimenOption(): OfferOption {
  return {
    title: 'The Tagmata',
    payoff: '',
    note: 'Veteran and Elite units gain +5 strength.',
    flavor: 'The emperor’s own regiments, paid in gold and in land.',
  };
}

/** A real card as the draft deals it: the same words `main.ts` hands the offer. */
function realOption(id: OrderId): OfferOption {
  return {
    title: orderDef(id).name,
    payoff: '',
    note: describeCard(id)
      .map((clause) => clause.text)
      .join(' · '),
    flavor: orderDef(id).flavor,
  };
}

/** A seated card, as the council draws one. */
function seatCard(face: SuitFace, name: string): HTMLElement {
  const card = element('span', 'face-seat');
  dressSuitFace(card, face, 'seat', [element('span', 'suit-name', name)]);
  return card;
}

/** A host the draft's rules recognise, so a hand card is drawn as the draft draws it. */
function handHost(into: HTMLElement): HTMLElement {
  const host = element('div', 'offer-options face-row');
  host.dataset.face = 'tarot';
  into.append(host);
  return host;
}

/**
 * The live rows this section shows: one of each deck, cycling the rarities so
 * all three ranks appear, then a card two decks share and a card of no deck.
 * Read off the data by what each row is, never by id, so a renamed card cannot
 * take the section down.
 */
function realCards(): OrderId[] {
  const dealt = ORDER_IDS.filter((id) => orderIsDealt(id));
  const picks: OrderId[] = [];
  DECK_IDS.forEach((deck, index) => {
    const rank = RANK_IDS[index % RANK_IDS.length]!;
    const ofDeck = dealt.filter(
      (id) => orderDef(id).decks.length === 1 && orderDef(id).decks[0] === deck,
    );
    const pick = ofDeck.find((id) => orderDef(id).rarity === rank) ?? ofDeck[0];
    if (pick !== undefined) picks.push(pick);
  });
  const shared = dealt.filter((id) => orderDef(id).decks.length > 1);
  const sharedPick = shared.find((id) => orderType(id) !== 'unsorted') ?? shared[0];
  if (sharedPick !== undefined) picks.push(sharedPick);
  const generic = dealt.find((id) => orderDef(id).decks.length === 0);
  if (generic !== undefined) picks.push(generic);
  return picks;
}

export function drawCardFaces(into: HTMLElement): void {
  // --- the key ---------------------------------------------------------------
  const key = block(
    into,
    'The key — src/ui/suitFace.ts and style.css',
    'The ink is the type: the frame, the suit and its medallion. A card of a deck not sorted yet is drawn in the Wildcard ink. The rank is the rarity, in ink and pewter only, so it never meets a type’s ink; the small mark beside it is what a list row prints.',
  );
  const keyRow = element('div', 'face-key-row');
  for (const ink of INK_IDS) {
    const cell = element('div', 'face-key');
    const swatch = element('span', 'face-swatch');
    swatch.dataset.ink = ink;
    cell.append(swatch, element('b', undefined, INK_LABEL[ink].type));
    cell.append(element('span', 'face-key-sub', INK_LABEL[ink].colour));
    keyRow.append(cell);
  }
  for (const rank of RANK_IDS) {
    const cell = element('div', 'face-key');
    const card = seatCard(
      { suits: [], ink: 'wildcard', rank, numeral: '0', deck: '', caption: RANK_LABEL[rank].rarity },
      RANK_LABEL[rank].rarity,
    );
    card.classList.add('face-key-card');
    const label = element('b');
    label.append(suitRankMarkNode(rank), document.createTextNode(` ${RANK_LABEL[rank].rarity}`));
    cell.append(card, label, element('span', 'face-key-sub', RANK_LABEL[rank].ornament));
    keyRow.append(cell);
  }
  key.append(keyRow);

  // --- one card, every way ---------------------------------------------------
  const specimen = block(
    into,
    'One card, every way',
    'The draft’s own hand card, the council’s seated card and the collection’s row, for any suit, ink and rank. The suit knob includes the two cases the board leaves open: a card two decks share shows both suits, and a card of no deck shows the seal.',
  );
  const knobs = controls(specimen);
  const stage = element('div', 'face-stage');
  specimen.append(stage);
  let suitChoice = 'swords';
  let ink: InkId = 'military';
  let rank: RankId = 'rare';
  let scale = 1;
  const redraw = (): void => {
    const face = specimenFace(suitsOf(suitChoice), ink, rank);
    stage.replaceChildren();
    const host = handHost(stage);
    host.style.setProperty('--offer-suit-scale', String(scale));
    host.append(suitHandCard(specimenOption(), face, 0));
    const seats = element('div', 'face-row');
    seats.append(seatCard(face, 'The Tagmata'));
    stage.append(seats);
    const list = element('div', 'face-list');
    list.append(suitRowNode(face, 'The Tagmata'));
    stage.append(list);
    const narrow = element('div', 'face-list is-narrow');
    narrow.append(suitRowNode(face, 'Honours of the Legion', true));
    const mark = element('span', 'cmp-mark cmp-mark-suit');
    mark.append(suitMarksNode(face));
    narrow.append(mark);
    stage.append(narrow);
  };
  select(knobs, 'suit', SUIT_CHOICES, suitChoice, (value) => {
    suitChoice = value;
    redraw();
  });
  select(
    knobs,
    'ink',
    INK_IDS.map((one) => [one, INK_LABEL[one].type] as const),
    ink,
    (value) => {
      ink = value as InkId;
      redraw();
    },
  );
  select(
    knobs,
    'rank',
    RANK_IDS.map((one) => [one, RANK_LABEL[one].rarity] as const),
    rank,
    (value) => {
      rank = value as RankId;
      redraw();
    },
  );
  slider(knobs, 'hand scale', { min: 0.74, max: 1.4, step: 0.02, value: 1 }, (v) => v.toFixed(2), (v) => {
    scale = v;
    redraw();
  });

  // --- the cards the data holds ----------------------------------------------
  const real = block(
    into,
    'The cards the data holds',
    'One live card of each deck (the rarities cycle so every rank shows), then a card two decks share and a card of no deck, each drawn from its own row by orderSuitFace. Only Dominion and the cards it shares are sorted, so the rest are drawn in the Wildcard ink.',
  );
  const picks = realCards();
  const hands = handHost(real);
  picks.forEach((id, index) => hands.append(suitHandCard(realOption(id), orderSuitFace(id), index)));
  const seats = element('div', 'face-row');
  for (const id of picks) seats.append(seatCard(orderSuitFace(id), orderDef(id).name));
  real.append(seats);
  const list = element('div', 'face-list');
  for (const id of picks) list.append(suitRowNode(orderSuitFace(id), orderDef(id).name));
  real.append(list);
}

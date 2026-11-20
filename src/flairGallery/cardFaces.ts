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
 *
 * **The council** (batch C2b) is drawn the same way: the chairs are the
 * Statecraft screen's own (`chairNode` and `emptyChairNode`, `chairs.ts`), in
 * the four types, with the lit and the refusing states the screen puts on them
 * while a card is in hand. A government is drawn on its banner, the offer's
 * and the Council's own (`governmentBannerNode`, `governmentBanner.ts`).
 */

import { describeCard } from '../sim/statecraft';
import {
  CHAIR_TYPES,
  DECK_IDS,
  DECK_WORDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  ORDER_KEYWORDS,
  type OrderId,
  governmentDef,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  orderKeyword,
  orderType,
} from '../sim/statecraftData';
import { FAMILIES, LIVE_GREAT_PERSON_IDS, greatPersonDef } from '../sim/greatPeopleData';
import { emptyCityYields } from '../sim/cities';
import { beliefDef, type BeliefId } from '../sim/religionData';
import { type BonusCard, drawCard, drawGhost } from '../ui/bonusesTab';
import { holdCardStamp, stampOfYields } from '../ui/cardStamp';
import { type OfferBackMark, offerBackNode } from '../ui/cardDeal';
import { beliefCardType } from '../ui/faithReading';
import { leaderFaces, leaderPortraitNode } from '../ui/leaderSelect';
import { fitGreatPersonCard, greatPersonCardNode, greatPersonPicture } from '../ui/greatPersonCard';
import { greatPersonCard } from '../ui/greatPersonFace';
import { scalerStartFace } from '../ui/scalerValue';
import { chairNode, chairWord, emptyChairNode } from '../ui/chairs';
import { DECK_SUIT, orderSuitFace } from '../ui/deckBadges';
import { type OfferOption, suitHandCard } from '../ui/offerCard';
import { fitGovernmentBanner, fitGovernmentHand, governmentBannerNode } from '../ui/governmentBanner';
import { wonderPaintingUrl } from '../ui/wonderPaintings';
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

/**
 * A real card as the draft deals it: the same words `main.ts` hands the offer,
 * and a Scaler's starting value as its figure (batch DS8).
 */
function realOption(id: OrderId): OfferOption {
  const scaler = scalerStartFace(id);
  return {
    title: orderDef(id).name,
    payoff: '',
    note: describeCard(id)
      .map((clause) => clause.text)
      .join(' · '),
    flavor: orderDef(id).flavor,
    ...(scaler === null ? {} : { scaler }),
  };
}

/**
 * One live card of each keyword (batch DS8), in the keywords' own order, read
 * off the data by `orderKeyword` and never by id.
 */
function keywordCardIds(): OrderId[] {
  const dealt = ORDER_IDS.filter((id) => orderIsDealt(id) && orderDef(id).retired !== true);
  return ORDER_KEYWORDS.flatMap((keyword) => {
    const pick = dealt.find((id) => orderKeyword(id) === keyword);
    return pick === undefined ? [] : [pick];
  });
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

  // --- the four keywords (batch DS8) ------------------------------------------
  const keywords = block(
    into,
    'The four keywords — describeCard, keywordCards.ts and scalerFigure.ts',
    'One live card of each keyword: Commission, Charter, Scaler and Boon. The keyword is the first clause, in bold; point at it, or focus the card with the keyboard, to read its rule. A Scaler shows its value under its rules, here the value before its first gain.',
  );
  const keywordHands = handHost(keywords);
  keywordCardIds().forEach((id, index) =>
    keywordHands.append(suitHandCard(realOption(id), orderSuitFace(id), index)),
  );

  drawCouncil(into, picks);
}

/**
 * **The council's chairs** (batch C2b): the four types empty, then a chair
 * holding a real card, then the two states a chair takes while a card is in
 * hand, then each live government's chairs as its card draws them.
 */
function drawCouncil(into: HTMLElement, picks: readonly OrderId[]): void {
  const council = block(
    into,
    'The council — src/ui/chairs.ts and style.css',
    'The four chair types, drawn by the council’s own builders: an empty chair keeps its type’s ink and shows its type’s mark faint inside the ghost of a card, and the Wildcard chair’s plate is purple. Then a chair holding a real card at the council’s compact size, and the two states a chair takes while a card is in hand: lit where the card fits, dimmed where it does not.',
  );
  const empties = element('div', 'face-council');
  for (const type of CHAIR_TYPES) empties.append(chairNode(type, emptyChairNode(type, 'empty')).button);
  council.append(empties);

  const states = element('div', 'face-council');
  // A real card in a chair of its own type: the first typed card of the picks,
  // or the first card at all, seated in the first chair it fits.
  const sample = picks.find((id) => orderType(id) !== 'unsorted') ?? picks[0];
  if (sample !== undefined) {
    const type = CHAIR_TYPES.find((one) => orderFitsSlot(sample, one)) ?? 'wildcard';
    const card = element('span', 'sc-chair-card');
    dressSuitFace(card, orderSuitFace(sample), 'seat', [element('span', 'sc-slot-card suit-name', orderDef(sample).name)]);
    const seated = chairNode(type, card);
    seated.button.classList.add('sc-slot-filled');
    states.append(seated.button);
    // The same card in hand: lit over a chair it fits, dimmed over one it does not.
    const fits = CHAIR_TYPES.find((one) => one !== 'wildcard' && orderFitsSlot(sample, one)) ?? 'wildcard';
    const lit = chairNode(fits, emptyChairNode(fits, 'empty'));
    lit.button.classList.add('sc-slot-open');
    lit.button.title = `${orderDef(sample).name} fits this ${chairWord(fits)} chair`;
    states.append(lit.button);
    const refuses = CHAIR_TYPES.find((one) => !orderFitsSlot(sample, one));
    if (refuses !== undefined) {
      const dim = chairNode(refuses, emptyChairNode(refuses, 'won’t fit'));
      dim.button.classList.add('sc-slot-refuses');
      dim.button.title = `${orderDef(sample).name} does not fit this ${chairWord(refuses)} chair`;
      states.append(dim.button);
    }
  }
  council.append(states);

  drawGovernmentBanners(into);
  drawGreatPeople(into);
  drawOfferBacks(into);
  drawLeaderPortraits(into);
  drawFaithTablets(into);
}

/**
 * **The government banner** (`governmentBanner.ts`; Quiet Table, frame 7),
 * through the game's own builder. The offer's row for one tier, the first
 * with a stand-in painting so the painted window can be seen before any
 * government has its own, then the Council's narrow card for every government
 * a seat can hold, on the Council's dark cloth.
 */
function drawGovernmentBanners(into: HTMLElement): void {
  const banners = block(
    into,
    'The government banner: governmentBanner.ts',
    'The form a government wears on the offer and on the Council screen: a 3:1 window with the government’s painting, or the engraved seal with the crown while it has none; its rules; its chairs in their types’ inks and marks; and the figure. The first row shows a wonder painting as a stand-in. The cards under the rows are the Council’s seat form, for every government a seat can hold.',
  );
  const knobs = controls(banners);
  const live = GOVERNMENT_IDS.filter((id) => governmentDef(id).retired !== true);
  const tiers = [...new Set(live.map((id) => governmentDef(id).tier))];
  const rows = element('div', 'face-banners');
  const cloth = element('div', 'face-banner-cloth');
  banners.append(rows, cloth);
  let width = 856;
  let tier = tiers.find((one) => one > 0) ?? tiers[0] ?? 0;
  const redraw = (): void => {
    rows.replaceChildren();
    rows.style.setProperty('--gov-width', `${width}px`);
    live
      .filter((id) => governmentDef(id).tier === tier)
      .forEach((id, index) => {
        const { banner } = governmentBannerNode(id, {
          form: 'row',
          ...(index === 0 ? { picture: { kind: 'painted' as const, url: wonderPaintingUrl('forbiddenCity') ?? '' } } : {}),
        });
        rows.append(banner);
      });
    const hand = [...rows.querySelectorAll<HTMLElement>('.gov-banner')];
    for (const banner of hand) fitGovernmentBanner(banner);
    // One size for the hand, as the offer fits it.
    fitGovernmentHand(hand);
  };
  slider(knobs, 'row width', { min: 560, max: 900, step: 4, value: width }, (v) => `${v}px`, (v) => {
    width = v;
    redraw();
  });
  select(
    knobs,
    'tier',
    tiers.map((one) => [String(one), `tier ${one}`] as const),
    String(tier),
    (value) => {
      tier = Number(value);
      redraw();
    },
  );
  redraw();
  for (const id of live) {
    const { banner } = governmentBannerNode(id, { form: 'seat' });
    cloth.append(banner);
    fitGovernmentBanner(banner);
  }
}

/**
 * **The great person card** (Quiet Table, build stage 2), through the game's
 * own builder: one card a family (the first live name with a portrait, or the
 * first live name), one card with no portrait, and the same card as a
 * thumbnail, as the Reliquary's fan draws it.
 */
function drawGreatPeople(into: HTMLElement): void {
  const people = block(
    into,
    'The great person card: greatPersonCard.ts',
    'The form a great person wears on the offer and in the Reliquary: the sun and the moon, the family on its tab, the round-arched picture window, the name, the kernel, the legacy, and the flavour with the tier mark. One card a family with its portrait, one card with no portrait (the family emblem in the window), and a thumbnail.',
  );
  const knobs = controls(people);
  const row = element('div', 'face-people');
  people.append(row);
  let width = 214;
  const redraw = (): void => {
    row.replaceChildren();
    row.style.setProperty('--gp-card-width', `${width}px`);
    for (const family of FAMILIES) {
      const ofFamily = LIVE_GREAT_PERSON_IDS.filter((one) => greatPersonDef(one).family === family);
      const id = ofFamily.find((one) => greatPersonPicture(one).kind === 'painted') ?? ofFamily[0];
      if (id === undefined) continue;
      const { card } = greatPersonCardNode(greatPersonCard(id));
      row.append(card);
    }
    // A card with no portrait: the same arch with the family emblem.
    const plain = LIVE_GREAT_PERSON_IDS.find((one) => greatPersonPicture(one).kind === 'emblem');
    if (plain !== undefined) row.append(greatPersonCardNode(greatPersonCard(plain)).card);
    const first = LIVE_GREAT_PERSON_IDS[0];
    if (first !== undefined) {
      const mini = greatPersonCardNode(greatPersonCard(first), { mini: true }).card;
      mini.style.setProperty('--gp-card-width', '84px');
      row.append(mini);
    }
    for (const card of row.querySelectorAll<HTMLElement>('.gp-card')) fitGreatPersonCard(card);
  };
  slider(knobs, 'card width', { min: 140, max: 300, step: 2, value: width }, (v) => `${v}px`, (v) => {
    width = v;
    redraw();
  });
  redraw();
}

/**
 * **The offer backs** (`offerBackNode`, `cardDeal.ts`): the draft pile's
 * colours with the mark each offer's cards lie on while they wait to turn.
 */
function drawOfferBacks(into: HTMLElement): void {
  const backs = block(
    into,
    'The offer backs: offerBackNode in cardDeal.ts',
    'The cards of an offer lie face down for a moment, then turn over one by one. The Order draft lies on the draft pile’s sun, the great person offer on the laurel and the government offer on the crown.',
  );
  const row = element('div', 'face-backs');
  const marks: readonly [OfferBackMark, string][] = [
    ['sun', 'The Order draft'],
    ['laurel', 'The great person offer'],
    ['crown', 'The government offer'],
  ];
  for (const [mark, words] of marks) {
    const cell = element('div', 'face-back');
    const card = element('div', 'face-back-card');
    card.append(offerBackNode(mark));
    cell.append(card, element('b', undefined, words));
    row.append(cell);
  }
  backs.append(row);
}

/**
 * **The leader's portrait window** (Quiet Table, build stage 3), through the
 * setup step's own builder (`leaderPortraitNode`): three leaders, the leader
 * who holds every deck, and the window under no leader. No portrait exists
 * yet, so each window shows the seat's charge on its ink.
 */
function drawLeaderPortraits(into: HTMLElement): void {
  const portraits = block(
    into,
    'The leader portrait window: leaderPortraitNode in leaderSelect.ts',
    'The 3:4 window beside the setup step’s list of leaders. When a portrait is in public/art/splash/leaders/ and named in leaderPortraits.ts, the window shows it. Until then it shows the seat’s charge on a parchment plate over the seat’s ink.',
  );
  const knobs = controls(portraits);
  const row = element('div', 'face-portraits');
  row.style.display = 'flex';
  row.style.flexWrap = 'wrap';
  row.style.gap = '18px';
  portraits.append(row);
  let width = 200;
  const redraw = (): void => {
    row.replaceChildren();
    const faces = leaderFaces();
    const every = faces.find((face) => face.rainbow);
    const shown = [...faces.filter((face) => !face.rainbow).slice(0, 3), ...(every === undefined ? [] : [every]), null];
    for (const face of shown) {
      const cell = element('figure');
      cell.style.margin = '0';
      cell.style.width = `${width}px`;
      cell.append(leaderPortraitNode(face, { color: '#5a4a7a' }));
      cell.append(element('figcaption', undefined, face === null ? 'No leader' : face.name));
      row.append(cell);
    }
  };
  slider(knobs, 'window width', { min: 120, max: 330, step: 2, value: width }, (v) => `${v}px`, (v) => {
    width = v;
    redraw();
  });
  redraw();
}

/** A tablet for a belief, as the Bonuses tab builds one, with a figure on its stamp. */
function tabletOf(id: BeliefId, kind: BonusCard['kind'], faith: number): BonusCard {
  const def = beliefDef(id);
  return {
    key: `card:${id}`,
    kind,
    eyebrow: beliefCardType(kind === 'follower' || kind === 'enhancer' ? kind : undefined),
    name: def.name,
    axis: def.axis,
    clauses: describeCard(id),
    notes: [],
    chips: [],
    where: null,
    quiet: null,
    paid: { ...emptyCityYields(), faith },
    parts: [],
    wide: false,
  };
}

/**
 * **The faith tablets** (Quiet Table, build stage 3), through the Bonuses
 * tab's own drawers: a god, a follower belief, the holy city, and an empty
 * place as a dashed tablet. No vignette exists yet, so each round window shows
 * the drawn belief mark (the holy city's own mark on the holy city).
 */
function drawFaithTablets(into: HTMLElement): void {
  const tablets = block(
    into,
    'The faith tablets: drawCard and drawGhost in bonusesTab.ts',
    'The form a god, a belief and the holy city wear on the Faith sheet’s Bonuses tab: an arched tablet with a round window, the name, and the kind of card under it. When a vignette is in public/art/splash/beliefs/ and named in beliefPictures.ts, the window shows it.',
  );
  const row = element('div', 'faith-cards');
  row.style.maxWidth = '820px';
  const cards: BonusCard[] = [
    tabletOf('sacredFire' as BeliefId, 'god', 2),
    tabletOf('feastDays' as BeliefId, 'follower', 3),
    {
      ...tabletOf('feastDays' as BeliefId, 'holyCity', 4),
      key: 'founderShare:0',
      eyebrow: 'the holy city',
      name: 'Uruk',
      clauses: [],
      notes: ['The founder’s share of what each follower town pays.'],
    },
  ];
  for (const card of cards) {
    const { face, stamp } = drawCard(card);
    holdCardStamp(stamp, stampOfYields(card.paid), 'figure');
    row.append(face);
  }
  row.append(drawGhost({ key: 'ghost:god', title: 'A god', text: 'waits for faith', progress: 0.4 }));
  tablets.append(row);
}

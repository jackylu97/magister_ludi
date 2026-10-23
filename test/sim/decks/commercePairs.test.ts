/**
 * **Commerce batch T7, the pair cards** (`docs/plans/commerce-themes-
 * triage.md`, questions 3 and 4, answered yes). The sheets' sync tests
 * (`commerce.test.ts`, `dominion.test.ts`) check the two rows against both
 * sheets. This file checks what the batch built:
 *
 *   · the `cardDrafted` moment: which seams fire it, and which do not;
 *   · The Art Dealers, a shared Commerce and Magisterial card that pays on it;
 *   · The Standing Army, moved from the Dominion file to the shared file and
 *     now dealt to Commerce seats too;
 *   · every pair of decks that holds Commerce keeps a shared card at Tier I or
 *     earlier (ruling (qqqqqq) 14).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { bumpEconomy } from '../../../src/sim/slate';
import { type GameState, type Player, bumpRevision, playerById } from '../../../src/sim/state';
import { describeCard, stripRefs, windfallPayout } from '../../../src/sim/statecraft';
import { openFreeDraft } from '../../../src/sim/statecraft/draft';
import {
  type DeckId,
  type DoctrineId,
  type OrderId,
  DECK_FILE_ORDERS,
  DECK_IDS,
  orderDef,
  orderIsDealt,
  orderType,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { newGame } from '../newGameHelpers';

const ART_DEALERS = 'theArtDealers' as OrderId;
const STANDING_ARMY = 'dominionTheStandingArmy' as OrderId;

/** One seat with a capital on a flat grassland board, beside a second seat. */
function board(): { state: GameState; player: Player } {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  return { state, player: playerById(state, 0)! };
}

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
  bumpEconomy(state);
}

/** Puts an Order in a chair for seat 0, the way the reading sees it. */
function seat(state: GameState, player: Player, id: OrderId): void {
  const sc = player.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  touch(state);
}

/** Lays an Order hand of the given cards in front of seat 0. */
function offer(player: Player, ...ids: OrderId[]): void {
  player.statecraft.pendingOrder = { options: ids };
}

/** Takes the first card of the hand, through the reducer. */
function pick(state: GameState): void {
  expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
}

// --- the moment --------------------------------------------------------------

describe('the card-drafted moment', () => {
  it('pays The Art Dealers 15 gold when a card is picked from a draft', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    offer(player, 'marketDay' as OrderId);
    const gold = player.gold;
    const culture = player.culturePool;
    const science = player.sciencePool;
    pick(state);
    expect(player.statecraft.orders).toContain('marketDay');
    expect(player.gold - gold).toBe(15);
    // Gold only: the card pays nothing else.
    expect(player.culturePool).toBe(culture);
    expect(player.sciencePool).toBe(science);
  });

  it('counts a charter, after its grant is applied', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    offer(player, 'thePlantersCharter' as OrderId);
    const gold = player.gold;
    pick(state);
    expect(player.charteredBuildings).toContain('plantationHouse');
    expect(player.gold - gold).toBe(15);
  });

  it('counts a pick from a free draft, which is the same pick', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    expect(openFreeDraft(state, player)).toBe(true);
    const gold = player.gold;
    pick(state);
    expect(player.gold - gold).toBe(15);
  });

  it('pays once for each card drafted', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    const gold = player.gold;
    offer(player, 'marketDay' as OrderId);
    pick(state);
    offer(player, 'theMineralTrade' as OrderId);
    pick(state);
    expect(player.gold - gold).toBe(30);
  });

  it('pays nothing for a pass, a Doctrine or a refused pick', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    const gold = player.gold;
    // A pass is its own moment (`draftPassed`).
    offer(player, 'marketDay' as OrderId);
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(player.gold).toBe(gold);
    // A Doctrine is held, not drafted into the collection.
    player.statecraft.pendingDoctrine = { options: ['theSteppeConfederacy' as DoctrineId] };
    expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(player.statecraft.doctrines).toContain('theSteppeConfederacy');
    expect(player.gold).toBe(gold);
    // A refused pick changes nothing.
    offer(player, 'marketDay' as OrderId);
    expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 3 }).ok).toBe(false);
    expect(player.gold).toBe(gold);
  });

  it('pays nothing while The Art Dealers sits in the collection and not in a chair', () => {
    const { state, player } = board();
    player.statecraft.orders.push(ART_DEALERS);
    touch(state);
    offer(player, 'marketDay' as OrderId);
    const gold = player.gold;
    pick(state);
    expect(player.gold).toBe(gold);
  });

  it('does not pay The Art Dealers for drafting itself', () => {
    const { state, player } = board();
    offer(player, ART_DEALERS);
    const gold = player.gold;
    pick(state);
    expect(player.statecraft.orders).toContain(ART_DEALERS);
    expect(player.gold).toBe(gold);
  });

  it('is a payout of 15 gold and nothing else, read off the seated card', () => {
    const { state, player } = board();
    seat(state, player, ART_DEALERS);
    const payout = windfallPayout(state, 0, 'cardDrafted');
    expect(payout.grants).toHaveLength(1);
    expect(payout.grants[0]).toMatchObject({ yield: 'gold', amount: 15 });
    // A different moment is not this one.
    expect(windfallPayout(state, 0, 'draftPassed').grants).toHaveLength(0);
  });
});

// --- the seams, pinned by source --------------------------------------------

/** Every `src/sim` file, with its comments taken out. */
const SIM = import.meta.glob('../../../src/sim/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** The files of `src/sim` whose code (not comments) holds `needle`, by short path. */
function filesWith(needle: string): string[] {
  return Object.entries(SIM)
    .filter(([, text]) => code(text).includes(needle))
    .map(([path]) => path.replace('../../../src/sim/', ''))
    .sort();
}

describe('the seams of the card-drafted moment', () => {
  it('is named in code by its declaration and by one helper, and nowhere else', () => {
    expect(filesWith("'cardDrafted'")).toEqual(['statecraft/draft.ts', 'statecraftData.ts']);
    const draft = code(SIM['../../../src/sim/statecraft/draft.ts']!);
    const helper = /export function payCardDrafted\([\s\S]*?\n\}/.exec(draft)?.[0] ?? '';
    expect(helper, 'payCardDrafted found').toContain("'cardDrafted'");
    expect(draft.split("'cardDrafted'")).toHaveLength(2);
  });

  it('is paid by one seam, the pick, after the card, its charter and its units', () => {
    // `payCardDrafted` is called from the reducer's pick and from nowhere else
    // in the sim. A new way to add a card to the collection joins this list.
    expect(filesWith('payCardDrafted(')).toEqual(['commands.ts', 'statecraft/draft.ts']);
    const commands = code(SIM['../../../src/sim/commands.ts']!);
    expect(commands.split('payCardDrafted(')).toHaveLength(2);
    const body = /function applyChooseOrder\([\s\S]*?\n\}/.exec(commands)?.[0] ?? '';
    expect(body.length, 'applyChooseOrder found').toBeGreaterThan(100);
    const settled = body.indexOf('settleOrderChoice(');
    const units = body.indexOf('raiseOnDraft(');
    const law = body.indexOf('forgetTheLaw(state)');
    const paid = body.indexOf('payCardDrafted(');
    expect(settled, 'the card is settled').toBeGreaterThan(-1);
    expect(units, 'the on-draft units are raised after it').toBeGreaterThan(settled);
    expect(law, 'the law is dropped for a charter after it').toBeGreaterThan(settled);
    expect(paid, 'and the moment is paid last').toBeGreaterThan(Math.max(units, law));
    // In draft.ts the only call is the definition itself.
    const draft = code(SIM['../../../src/sim/statecraft/draft.ts']!);
    expect(draft.split('payCardDrafted(')).toHaveLength(2);
    expect(draft).toContain('export function payCardDrafted(');
  });

  it('is not paid by a pass or a Doctrine', () => {
    const draft = code(SIM['../../../src/sim/statecraft/draft.ts']!);
    for (const name of ['settleOrderSkip', 'settleDoctrineChoice', 'settleDoctrineSkip']) {
      const body = new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}`).exec(draft)?.[0] ?? '';
      expect(body.length, `${name} found`).toBeGreaterThan(50);
      expect(body, name).not.toContain('payCardDrafted');
      expect(body, name).not.toContain('cardDrafted');
    }
  });
});

// --- the two rows ------------------------------------------------------------

describe('The Art Dealers', () => {
  it('is a shared Commerce and Magisterial row, Tier I, common and Economic, and dealt', () => {
    expect(DECK_FILE_ORDERS.common).toContain(ART_DEALERS);
    const def = orderDef(ART_DEALERS);
    expect(def.name).toBe('The Art Dealers');
    expect(def.decks).toEqual(['commerce', 'magisterial']);
    expect(def.band).toBe(1);
    expect(def.rarity).toBe('common');
    expect(orderType(ART_DEALERS)).toBe('economic');
    expect(def.text).toBe('Each card you draft grants 15 gold.');
    expect(def.effects).toEqual([
      { kind: 'windfallRider', occasion: 'cardDrafted', grant: { yield: 'gold', amount: 15 } },
    ]);
    expect(orderIsDealt(ART_DEALERS)).toBe(true);
    expect(ordersForDecks(['commerce', 'dominion'])).toContain(ART_DEALERS);
    expect(ordersForDecks(['magisterial', 'devotion'])).toContain(ART_DEALERS);
    expect(ordersForDecks(['dominion', 'scientific'])).not.toContain(ART_DEALERS);
  });

  it('says what it does in words', () => {
    const words = describeCard(ART_DEALERS).map((clause) => stripRefs(clause.text));
    expect(words).toEqual(['drafting a card grants +15 gold']);
  });
});

describe('The Standing Army', () => {
  it('moves to the shared file for Dominion and Commerce, with its id, text, tier and type', () => {
    expect(DECK_FILE_ORDERS.common).toContain(STANDING_ARMY);
    expect(DECK_FILE_ORDERS.dominion).not.toContain(STANDING_ARMY);
    const def = orderDef(STANDING_ARMY);
    expect(def.name).toBe('The Standing Army');
    expect(def.decks).toEqual(['dominion', 'commerce']);
    expect(def.band).toBe(0);
    expect(def.rarity).toBe('uncommon');
    expect(orderType(STANDING_ARMY)).toBe('military');
    expect(def.text).toBe(
      'Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units.',
    );
    expect(orderIsDealt(STANDING_ARMY)).toBe(true);
  });

  it('is dealt to a Commerce seat and still to a Dominion seat', () => {
    expect(ordersForDecks(['commerce', 'expansionist'])).toContain(STANDING_ARMY);
    expect(ordersForDecks(['dominion', 'magisterial'])).toContain(STANDING_ARMY);
    expect(ordersForDecks(['devotion', 'scientific'])).not.toContain(STANDING_ARMY);
  });
});

describe('each Commerce pair keeps an early shared card (ruling (qqqqqq) 14)', () => {
  it('holds a live shared card at Tier I or earlier for Commerce and every other deck', () => {
    const early = (other: DeckId): string[] =>
      DECK_FILE_ORDERS.common
        .filter((id) => {
          const def = orderDef(id);
          return (
            orderIsDealt(id) &&
            def.band <= 1 &&
            def.decks.includes('commerce') &&
            def.decks.includes(other)
          );
        })
        .map((id) => orderDef(id).name);
    for (const other of DECK_IDS) {
      if (other === 'commerce') continue;
      expect(early(other).length, `Commerce and ${other}`).toBeGreaterThan(0);
    }
    expect(early('dominion')).toContain('The Standing Army');
    expect(early('magisterial')).toContain('The Art Dealers');
  });
});

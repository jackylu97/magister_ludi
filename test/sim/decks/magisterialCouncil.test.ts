/**
 * **The council's moments** (batch MG7 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG7 builds three cards that read the council, and the shapes under
 * them:
 *
 *   · feature G: adopting a government is a moment the cards are paid at
 *     (`governmentAdopted`, a `WindfallOccasion`). `adoptGovernmentAt` pays it
 *     through `payOccasionRiders`, at the capital, after the council is
 *     re-seated and the Triumph is awarded, and before the Doctrine offer is
 *     drawn. So only a card in a chair of the new council pays (the triage's
 *     reading 17). Card: The Sed Festival, a great person at each adoption;
 *   · a count of the Doctrines held (`doctrinesHeld`), of any deck (reading
 *     20). Card: The Pandects;
 *   · a commission figure for a council in order (`councilInOrder`, reading
 *     18) and a commission reward that opens a Doctrine offer of the
 *     government's tier (`doctrineOffer`), through `openDoctrineOffer`, the
 *     helper a building's `doctrineDraft` grant uses too. While no such offer
 *     can open, the card waits in its chair (reading 19 and question 3's
 *     recommended answer). Card: Commission: The Golden Bull.
 *
 * The figure's own cases (a malice, an unsorted card) are pinned in
 * `test/sim/typedChairs.test.ts`, and the helper's in
 * `test/sim/doctrineOffer.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure, commissionRewardWaits, runCommissions } from '../../../src/sim/commissions';
import { snapshotState } from '../../../src/sim/game';
import { renownThreshold } from '../../../src/sim/renown';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../../src/sim/state';
import {
  type SlottedOrder,
  commissionFulfilledTurn,
  describeCard,
  explainCardPercentYields,
  slotTypesOf,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CardTypeReading,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  DOCTRINE_IDS,
  ORDER_IDS,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isCharter,
  orderDef,
  orderIsDealt,
  orderType,
  ordersForDecks,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { ABILITY_TECH, type TechId } from '../../../src/sim/techData';
import { at, bareState } from '../improvementHelpers';

const SED = 'theSedFestival' as OrderId;
const PANDECTS = 'thePandects' as OrderId;
const BULL = 'magisterialTheGoldenBull' as OrderId;

/** The three rows batch MG7 dealt, with the tier, rarity and type the sheet gives each. */
const MG7_ROWS: readonly [OrderId, number, string, string][] = [
  [SED, 2, 'rare', 'civic'],
  [PANDECTS, 3, 'uncommon', 'civic'],
  [BULL, 3, 'uncommon', 'wildcard'],
];

/** The technology that lets a seat call great people. */
const RITES = ABILITY_TECH.get('ancestorRites');

/** Gives seat 0 a technology, or takes it away. */
function know(state: GameState, tech: TechId | undefined, held: boolean): void {
  expect(tech).toBeDefined();
  const player = playerById(state, 0)!;
  player.techsResearched = player.techsResearched.filter((id) => id !== tech);
  if (held) player.techsResearched.push(tech!);
  bumpRevision(state);
}

/** One town of three citizens for seat 0, with an empty queue. The first is the capital. */
function town(state: GameState, col: number, row: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = 3;
  city.largestSize = 3;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * A board with a capital for seat 0, whose decks are Dominion's and
 * Magisterial's, so its Doctrine offers hold Dominion's Doctrines. The
 * renown pool is empty, so the Triumph of an adoption (ten renown) opens no
 * great person by itself.
 */
function board(): { state: GameState; player: Player; capital: City } {
  const state = bareState(20, 10);
  const capital = town(state, 3, 5);
  const player = playerById(state, 0)!;
  player.decks = ['dominion', 'magisterial'];
  player.renownPool = 0;
  bumpRevision(state);
  return { state, player, capital };
}

/** A chair's record, free to move. */
function sitting(card: OrderId): SlottedOrder {
  return { card, sealedUntil: 0 };
}

/** Lays out this government's council for seat 0, with these cards in these chairs. */
function council(state: GameState, government: GovernmentId, cards: readonly (OrderId | null)[]): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.government = government;
  sc.slots = cards.map((card) => (card === null ? null : sitting(card)));
  for (const card of cards) if (card !== null && !sc.orders.includes(card)) sc.orders.push(card);
  bumpRevision(state);
}

/** The first `count` dealt cards of one type that neither are a commission nor a charter, in table order. */
function cardsOf(type: CardTypeReading, count: number): OrderId[] {
  const ids = ORDER_IDS.filter(
    (id) =>
      orderIsDealt(id) &&
      !isCharter(id) &&
      orderDef(id).commission === undefined &&
      orderType(id) === type &&
      !MG7_ROWS.some(([row]) => row === id),
  ).slice(0, count);
  expect(ids, `${count} dealt ${type} card(s)`).toHaveLength(count);
  return ids;
}

/** Banks this tier's government offer on seat 0, as a draft reaching the rung does. */
function bank(state: GameState, tier: number): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.drafts = Math.max(sc.drafts, tier);
  sc.pendingGovernment = { tier, options: governmentsAtTier(tier) };
  bumpRevision(state);
}

/** Seat 0 adopts this government of the banked offer, through the reducer. */
function adopt(state: GameState, id: GovernmentId): void {
  const options = playerById(state, 0)!.statecraft.pendingGovernment!.options;
  const index = options.indexOf(id);
  expect(index, id).toBeGreaterThanOrEqual(0);
  const result = applyCommand(state, { type: 'adoptGovernment', playerId: 0, choiceIndex: index });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(
  state: GameState,
  city: City,
  card: OrderId,
  voice: 'science' | 'production' | 'culture',
): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG7: the rows', () => {
  it('deals all three from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG7_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
  });

  it('carries the shapes the triage names', () => {
    expect(orderDef(SED).text).toBe('Each time you adopt a government, gain a free great-person draft.');
    expect(orderDef(SED).effects).toEqual([
      { kind: 'windfallRider', occasion: 'governmentAdopted', grant: { greatPerson: 'any' } },
    ]);
    expect(orderDef(PANDECTS).text).toBe('+5% science and production for each Doctrine you hold.');
    expect(orderDef(PANDECTS).effects).toEqual(
      (['science', 'production'] as const).map((to) => ({
        kind: 'pays',
        where: 'city',
        basis: 'count',
        count: 'doctrinesHeld',
        to,
        percent: 5,
        stage: 'city',
      })),
    );
    expect(orderDef(BULL).text).toBe(
      "Commission. Have every Military, Economic and Civic chair hold a card of its own type. Then you are offered a Doctrine of your government's tier. The card leaves its chair.",
    );
    expect(orderDef(BULL).effects).toEqual([]);
    expect(orderDef(BULL).commission).toEqual({
      goals: [{ kind: 'reached', figure: 'councilInOrder', count: 1 }],
      reward: [{ doctrineOffer: true }],
    });
  });

  it('prints each card in plain words', () => {
    const words = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words(SED)).toEqual(['adopting a government grants a great person to call']);
    expect(words(PANDECTS)).toEqual([
      '+5% science in every city per Doctrine you hold',
      '+5% production in every city per Doctrine you hold',
    ]);
    expect(words(BULL)).toEqual([
      'Commission. Goal: have every Military, Economic and Civic chair hold a card of its own type, while this card is seated',
      "Reward: a Doctrine draft of your government's tier",
      'then this card leaves its chair and is never seated again',
    ]);
  });
});

// --- The Sed Festival ------------------------------------------------------------

describe('The Sed Festival (feature G, reading 17)', () => {
  /** A board at the Chiefdom with The Sed Festival in its Wildcard chair and the tier-4 offer banked. */
  function seated(): { state: GameState; player: Player } {
    const { state, player } = board();
    council(state, 'chiefdom', [null, null, SED]);
    bank(state, 4);
    return { state, player };
  }

  it('deals a great-person offer when a government is adopted, and the Doctrine offer still opens', () => {
    const { state, player } = seated();
    know(state, RITES, true);
    expect(player.greatPersonOffer).toBeUndefined();
    adopt(state, 'councilOfElders');
    // The card kept a chair in the new council: the Civic chair.
    const chairs = slotTypesOf(player.statecraft);
    const at = player.statecraft.slots.findIndex((slot) => slot?.card === SED);
    expect(chairs[at]).toBe('civic');
    expect(player.greatPersonOffer).toBeDefined();
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
    // The Doctrine offer still opens, of the adopted government's tier.
    expect(player.statecraft.pendingDoctrine).toBeDefined();
    for (const id of player.statecraft.pendingDoctrine!.options) {
      expect(poolDoctrines(4), id).toContain(id);
    }
  });

  it('pays the renown still needed for the next great person when the seat cannot call one yet', () => {
    const { state, player } = seated();
    know(state, RITES, false);
    adopt(state, 'councilOfElders');
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownPool).toBe(renownThreshold(state, player));
  });

  /**
   * The renown an adoption of this government pays seat 0 when The Sed
   * Festival sits in no chair: the Triumph's, and nothing else. The council
   * holds `cards` under the Chiefdom, and the offer of `tier` is banked.
   */
  function renownOfAdoption(cards: readonly (OrderId | null)[], tier: number, id: GovernmentId): number {
    const { state, player } = board();
    know(state, RITES, true);
    council(state, 'chiefdom', cards);
    bank(state, tier);
    adopt(state, id);
    expect(player.greatPersonOffer).toBeUndefined();
    return player.renownEarned;
  }

  it('pays nothing from the collection', () => {
    const plain = renownOfAdoption([null, null, null], 4, 'councilOfElders');
    // Held and not seated.
    const { state, player } = board();
    know(state, RITES, true);
    council(state, 'chiefdom', [null, null, null]);
    player.statecraft.orders.push(SED);
    bank(state, 4);
    adopt(state, 'councilOfElders');
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownEarned).toBe(plain);
  });

  it('pays nothing when the re-seating returns it to the collection', () => {
    // The Chiefdom's chairs, and one more Wildcard chair past them: The Sed
    // Festival and a Wildcard card. Tyranny has no Civic chair and one
    // Wildcard chair, and the re-seating places the Wildcard card first, so
    // The Sed Festival fits no chair left.
    const [wild] = cardsOf('wildcard', 1);
    const plain = renownOfAdoption([null, null, null, wild!], 10, 'tyranny');
    const { state, player } = board();
    know(state, RITES, true);
    council(state, 'chiefdom', [null, null, SED, wild!]);
    bank(state, 10);
    adopt(state, 'tyranny');
    expect(player.statecraft.slots.some((slot) => slot?.card === SED)).toBe(false);
    expect(player.statecraft.orders).toContain(SED);
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownEarned).toBe(plain);
  });

  it('pays again at the next adoption', () => {
    const { state, player } = seated();
    know(state, RITES, true);
    adopt(state, 'councilOfElders');
    expect(player.greatPersonOffer).toBeDefined();
    // Answer both offers.
    expect(applyCommand(state, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(applyCommand(state, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(player.greatPersonOffer).toBeUndefined();
    // The next tier's government pays a second great person.
    bank(state, 10);
    adopt(state, 'theocracy');
    expect(player.statecraft.slots.some((slot) => slot?.card === SED)).toBe(true);
    expect(player.greatPersonOffer).toBeDefined();
  });

  it('gives the same board twice from the same adoption', () => {
    const run = (): string => {
      const { state } = seated();
      know(state, RITES, true);
      adopt(state, 'priestKing');
      return snapshotState(state);
    };
    expect(run()).toBe(run());
  });
});

// --- The Pandects ----------------------------------------------------------------

describe('The Pandects (reading 20)', () => {
  it('gives every town +5% science and production for each Doctrine held', () => {
    const { state, player, capital } = board();
    const other = town(state, 12, 5);
    council(state, 'chiefdom', [null, null, PANDECTS]);
    expect(townPercent(state, capital, PANDECTS, 'science')).toBe(0);
    const live = DOCTRINE_IDS.filter((id) => doctrineDef(id).retired !== true);
    player.statecraft.doctrines.push(live[0]!, live[1]!);
    bumpRevision(state);
    for (const city of [capital, other]) {
      expect(townPercent(state, city, PANDECTS, 'science')).toBe(10);
      expect(townPercent(state, city, PANDECTS, 'production')).toBe(10);
      expect(townPercent(state, city, PANDECTS, 'culture')).toBe(0);
    }
  });

  it('counts a Doctrine of any deck, and not one still on offer', () => {
    const { state, player, capital } = board();
    council(state, 'chiefdom', [null, null, PANDECTS]);
    // A Doctrine of a deck this seat does not hold still counts.
    const foreign = DOCTRINE_IDS.find((id) => !doctrineDef(id).decks.some((deck) => player.decks.includes(deck)));
    const own = DOCTRINE_IDS.find((id) => doctrineDef(id).decks.includes('dominion'));
    expect(foreign).toBeDefined();
    expect(own).toBeDefined();
    player.statecraft.doctrines.push(foreign!);
    // A Doctrine on the table is not held.
    player.statecraft.pendingDoctrine = { options: [own!] };
    bumpRevision(state);
    expect(townPercent(state, capital, PANDECTS, 'science')).toBe(5);
    expect(townPercent(state, capital, PANDECTS, 'production')).toBe(5);
  });
});

// --- Commission: The Golden Bull ---------------------------------------------------

describe('Commission: The Golden Bull (readings 18 and 19)', () => {
  /**
   * Imperium's chairs (three Military, two Economic, one Civic and two
   * Wildcard), each typed chair holding a card of its own type, and The
   * Golden Bull in the first Wildcard chair.
   */
  function inOrder(): { state: GameState; player: Player } {
    const { state, player } = board();
    const military = cardsOf('military', 3);
    const economic = cardsOf('economic', 2);
    const [civic] = cardsOf('civic', 1);
    expect(slotTypesOf({ ...player.statecraft, government: 'imperium', slots: [] })).toEqual([
      'military',
      'military',
      'military',
      'economic',
      'economic',
      'civic',
      'wildcard',
      'wildcard',
    ]);
    council(state, 'imperium', [...military, ...economic, civic!, BULL, null]);
    return { state, player };
  }

  it('reads a council in order as 1 and anything else as 0', () => {
    const { state, player } = inOrder();
    expect(commissionFigure(state, 0, 'councilInOrder')).toBe(1);
    // An empty Wildcard chair does not matter; an empty typed chair does.
    const civic = player.statecraft.slots[5];
    player.statecraft.slots[5] = null;
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'councilInOrder')).toBe(0);
    // A card of another type in a typed chair is not in order.
    player.statecraft.slots[5] = player.statecraft.slots[0]!;
    player.statecraft.slots[0] = civic!;
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'councilInOrder')).toBe(0);
  });

  it('opens a Doctrine offer of the government’s tier, and leaves its chair', () => {
    const { state, player } = inOrder();
    const tier = governmentDef('imperium').tier;
    expect(commissionRewardWaits(player, orderDef(BULL).commission!)).toBe(false);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([BULL]);
    expect(reports[0]!.lines).toEqual(["a Doctrine draft of your government's tier"]);
    const offer = player.statecraft.pendingDoctrine;
    expect(offer).toBeDefined();
    expect(offer!.options.length).toBeGreaterThan(0);
    for (const id of offer!.options) {
      expect(poolDoctrines(tier), id).toContain(id);
      expect(doctrineDef(id).decks.some((deck) => player.decks.includes(deck)), id).toBe(true);
    }
    expect(player.statecraft.slots.some((slot) => slot?.card === BULL)).toBe(false);
    expect(commissionFulfilledTurn(player.statecraft, BULL)).toBe(state.turn);
    // Met once: the next phase pays nothing more.
    expect(runCommissions(state)).toEqual([]);
  });

  it('pays nothing while the council is out of order', () => {
    const { state, player } = inOrder();
    player.statecraft.slots[3] = null;
    bumpRevision(state);
    expect(runCommissions(state)).toEqual([]);
    expect(player.statecraft.pendingDoctrine).toBeUndefined();
    expect(player.statecraft.slots.some((slot) => slot?.card === BULL)).toBe(true);
  });

  it('waits in its chair while a Doctrine offer is waiting, and pays once it is answered', () => {
    const { state, player } = inOrder();
    const [waiting] = poolDoctrines(4).filter((id) => doctrineDef(id).decks.includes('dominion'));
    player.statecraft.pendingDoctrine = { options: [waiting!] };
    bumpRevision(state);
    expect(commissionRewardWaits(player, orderDef(BULL).commission!)).toBe(true);
    const before = snapshotState(state);
    expect(runCommissions(state)).toEqual([]);
    // Nothing moved, the random number generator included.
    expect(snapshotState(state)).toBe(before);
    expect(applyCommand(state, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(runCommissions(state).map((report) => report.card)).toEqual([BULL]);
    expect(player.statecraft.pendingDoctrine).toBeDefined();
  });

  it('waits in its chair while no Doctrine of the tier is left to offer', () => {
    const { state, player } = inOrder();
    const tier = governmentDef('imperium').tier;
    const left = poolDoctrines(tier).filter((id) => doctrineDef(id).decks.some((deck) => player.decks.includes(deck)));
    expect(left.length).toBeGreaterThan(0);
    // Every one of them held already.
    player.statecraft.doctrines.push(...(left as DoctrineId[]));
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'councilInOrder')).toBe(1);
    expect(commissionRewardWaits(player, orderDef(BULL).commission!)).toBe(true);
    expect(runCommissions(state)).toEqual([]);
    expect(player.statecraft.slots.some((slot) => slot?.card === BULL)).toBe(true);
    expect(commissionFulfilledTurn(player.statecraft, BULL)).toBeUndefined();
    // A seat whose decks hold no Doctrine waits the same way.
    player.statecraft.doctrines = [];
    player.decks = ['magisterial', 'scientific'];
    bumpRevision(state);
    expect(runCommissions(state)).toEqual([]);
  });
});

// --- the seams, pinned by source ---------------------------------------------------

const SOURCES = import.meta.glob(['../../../src/sim/**/*.ts', '../../../src/ui/*.ts', '../../../src/ai/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** A file's code with its comments taken out. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** The body of a top-level function in a file under `src/`: its signature to its closing brace. */
function bodyOf(file: string, name: string): string {
  const text = code(SOURCES[`../../../src/${file}`] ?? '');
  return new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`).exec(text)?.[0] ?? '';
}

describe('the seams of the council', () => {
  it('pays the adoption moment in one place, after the re-seating and the Triumph and before the Doctrine draw', () => {
    const payers = Object.entries(SOURCES).filter(([, text]) =>
      /payOccasionRiders\([^)]*'governmentAdopted'/.test(code(text)),
    );
    expect(payers.map(([path]) => path.replace('../../../src/', ''))).toEqual(['sim/statecraft/draft.ts']);
    const adopt = bodyOf('sim/statecraft/draft.ts', 'adoptGovernmentAt');
    const reseat = adopt.indexOf('reseatCouncil(player, previous, state.turn)');
    const triumph = adopt.indexOf("awardOccasion(state, player.id, 'governmentAdopted')");
    const riders = adopt.search(/payOccasionRiders\(\s*state,\s*player,\s*'governmentAdopted'/);
    const draw = adopt.indexOf('drawDoctrineOffer(state, player, offer.tier)');
    expect(reseat).toBeGreaterThan(0);
    expect(triumph).toBeGreaterThan(reseat);
    expect(riders).toBeGreaterThan(triumph);
    expect(draw).toBeGreaterThan(riders);
  });

  it('opens a Doctrine offer outside an adoption through one helper', () => {
    // The building's grant and the commission's reward both call it, and the
    // helper is the one place in `cities.ts` that draws a Doctrine offer.
    expect(bodyOf('sim/cities.ts', 'payGrants')).toContain('openDoctrineOffer(state, player)');
    expect(bodyOf('sim/commissions.ts', 'payCommission')).toContain('openDoctrineOffer(state, player)');
    const cities = code(SOURCES['../../../src/sim/cities.ts']!);
    expect(cities.split('drawDoctrineOffer(')).toHaveLength(2);
    expect(bodyOf('sim/cities.ts', 'openDoctrineOffer')).toContain('drawDoctrineOffer(');
  });
});

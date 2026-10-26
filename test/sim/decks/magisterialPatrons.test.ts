/**
 * **Great people spent** (batch MG8 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG8 builds the cards about spending great people, and the shapes
 * under them:
 *
 *   · a windfall moment for a great person spent (`greatPersonSpent`). It is
 *     paid in `spendGreatPerson`, the one place a person is spent, so an act
 *     and a work both reach it, once for each person. It is paid at the
 *     capital and carries the work, if one was laid (the triage's reading
 *     21);
 *   · a rider filter, `whileRaisingOpus`: the rider pays only while one of the
 *     empire's towns has the Magnum Opus at the front of its queue. Card: The
 *     Last Commission, 150 production into that town, at most once a turn;
 *   · the shared Sacred Patronage: faith buys a great-person draft (the rule
 *     that existed) and spending a person pays 30 faith, at most once a turn;
 *   · a meta rule, `legaciesCountTwice`, read at the legacy source of
 *     `liveEffects`: each legacy that is not revoked is read twice (reading
 *     22). Card: The Immortals;
 *   · a commission figure, `workFamilies`: the families of the great-person
 *     works in the empire's borders (reading 32). Card: Commission: The
 *     Patron's Gallery, a great-person draft and 200 culture.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionFigure, runCommissions, workFamiliesHeld } from '../../../src/sim/commissions';
import { snapshotState } from '../../../src/sim/game';
import {
  greatPersonActAt,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
  greatPersonPurchaseOpen,
  greatPersonWorkAt,
} from '../../../src/sim/greatPeople';
import { type Family, GREAT_PERSON_IDS, type GreatPersonId, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type ImprovementId } from '../../../src/sim/improvementData';
import { type Tile, raiseImprovement } from '../../../src/sim/map';
import { renownThreshold } from '../../../src/sim/renown';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  commissionFulfilledTurn,
  describeCard,
  explainCardCityYields,
  explainCardPercentYields,
  liveEffects,
  stripRefs,
} from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { ABILITY_TECH, type TechId } from '../../../src/sim/techData';
import { at, bareState } from '../improvementHelpers';

const LAST = 'theLastCommission' as OrderId;
const PATRONAGE = 'sacredPatronage' as OrderId;
const IMMORTALS = 'theImmortals' as OrderId;
const GALLERY = 'magisterialThePatronsGallery' as OrderId;

/** The four rows batch MG8 dealt, with the decks, tier, rarity and type the sheets give each. */
const MG8_ROWS: readonly [OrderId, readonly string[], number, string, string][] = [
  [LAST, ['magisterial'], 4, 'rare', 'economic'],
  [PATRONAGE, ['devotion', 'magisterial'], 3, 'rare', 'civic'],
  [IMMORTALS, ['magisterial'], 4, 'rare', 'civic'],
  [GALLERY, ['magisterial'], 2, 'uncommon', 'wildcard'],
];

/** The Magnum Opus as the front row of a queue. */
const OPUS = { kind: 'building', id: 'theMagnumOpus' } as City['queue'][number];

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

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function seat(state: GameState, card: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
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

/** A board with a capital for seat 0 and an empty renown pool. */
function board(): { state: GameState; player: Player; capital: City } {
  const state = bareState(20, 10);
  const capital = town(state, 3, 5);
  const player = playerById(state, 0)!;
  player.renownPool = 0;
  bumpRevision(state);
  return { state, player, capital };
}

/** The first great person of this family in the roster, in table order. */
function personOf(family: Family): GreatPersonId {
  const id = GREAT_PERSON_IDS.find((person) => greatPersonDef(person).family === family);
  expect(id, family).toBeDefined();
  return id!;
}

/** A great person of this family for seat 0, standing on this town. */
function person(state: GameState, city: City, family: Family): Unit {
  const unit = createUnit(state, 0, 'greatPerson', city.col, city.row, personOf(family));
  bumpRevision(state);
  return unit;
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

/** A merchant spends themselves on their act. A merchant's act pays gold and needs no town. */
function spendMerchant(state: GameState, player: Player, city: City): void {
  greatPersonActAt(state, player, person(state, city, 'merchant'));
}

/** Ends the turn as far as the riders' stamps are concerned. */
function nextTurn(state: GameState): void {
  state.turn += 1;
  bumpRevision(state);
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG8: the rows', () => {
  it('deals all four from the decks, tier, rarity and type the sheets name', () => {
    for (const [id, decks, band, rarity, type] of MG8_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.decks, id).toEqual(decks);
      for (const deck of decks) expect(ordersForDecks([deck as never]), `${id} for ${deck}`).toContain(id);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
  });

  it('carries the shapes the triage names', () => {
    expect(orderDef(LAST).text).toBe(
      'Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once.',
    );
    expect(orderDef(LAST).effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'greatPersonSpent',
        whileRaisingOpus: true,
        oncePerTurn: true,
        grant: { yield: 'production', amount: 150, toOpus: true },
      },
    ]);
    expect(orderDef(PATRONAGE).text).toBe(
      'Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn.',
    );
    expect(orderDef(PATRONAGE).effects).toEqual([
      { kind: 'rule', rule: 'buyGreatPersonWithFaith' },
      { kind: 'windfallRider', occasion: 'greatPersonSpent', oncePerTurn: true, grant: { yield: 'faith', amount: 30 } },
    ]);
    expect(orderDef(IMMORTALS).text).toBe('The legacies of your great people count twice.');
    expect(orderDef(IMMORTALS).effects).toEqual([{ kind: 'metaRule', rule: 'legaciesCountTwice', value: 2 }]);
    expect(orderDef(GALLERY).text).toBe(
      "Commission. Have great-person works of three different families in your borders. Then gain a free great-person draft and 200 culture. The card leaves its chair.",
    );
    expect(orderDef(GALLERY).effects).toEqual([]);
    expect(orderDef(GALLERY).commission).toEqual({
      goals: [{ kind: 'reached', figure: 'workFamilies', count: 3 }],
      reward: [{ greatPerson: 'any' }, { yield: 'culture', amount: 200 }],
    });
  });

  it('prints each card in plain words', () => {
    const words = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words(LAST)).toEqual([
      'spending a great person (at most once a turn, only while you are building the Magnum Opus) grants +150 production to your city raising the Magnum Opus',
    ]);
    expect(words(PATRONAGE)).toEqual([
      'a great person waiting to be called may be bought with faith',
      'spending a great person (at most once a turn) grants +30 faith',
    ]);
    expect(words(IMMORTALS)).toEqual(['the legacy of each great person you have spent counts twice']);
    expect(words(GALLERY)).toEqual([
      'Commission. Goal: have great-person works of 3 different families in your borders, while this card is seated',
      'Reward: a great person to call, and +200 culture',
      'then this card leaves its chair and is never seated again',
    ]);
  });
});

// --- the moment ------------------------------------------------------------------

describe('a great person spent is a moment (reading 21)', () => {
  it('pays once for an act and once for a work', () => {
    const { state, player, capital } = board();
    seat(state, PATRONAGE);
    const before = player.faithPool;
    spendMerchant(state, player, capital);
    expect(player.faithPool - before).toBe(30);
    // A work spends the person too. The card pays once a turn, so the work is
    // laid on the next turn.
    nextTurn(state);
    const tile = ring(state, capital)[0]!;
    const scholar = createUnit(state, 0, 'greatPerson', tile.col, tile.row, personOf('scholar'));
    bumpRevision(state);
    const middle = player.faithPool;
    greatPersonWorkAt(state, player, scholar, tile);
    expect(tile.improvement).toBe('academy');
    expect(player.faithPool - middle).toBe(30);
  });

  it('carries the work a person laid, and no work for an act', () => {
    // A rider hung on the realm for the length of the test, narrowed to a work
    // laid as an Academy. A timed effect is one of the walk's sources, so it
    // reads as a card's rider does.
    const { state, player, capital } = board();
    player.timed = [
      {
        card: IMMORTALS,
        effect: {
          kind: 'windfallRider',
          occasion: 'greatPersonSpent',
          improvement: 'academy',
          grant: { yield: 'gold', amount: 7 },
        },
        expiresTurn: state.turn + 10,
      },
    ];
    bumpRevision(state);
    // An act lays no work: the merchant's own gold is all that moves.
    const plainGold = (): number => {
      const fresh = board();
      const before = fresh.player.gold;
      spendMerchant(fresh.state, fresh.player, fresh.capital);
      return fresh.player.gold - before;
    };
    const before = player.gold;
    spendMerchant(state, player, capital);
    expect(player.gold - before).toBe(plainGold());
    // A scholar's Academy is the work the rider names.
    const tile = ring(state, capital)[0]!;
    const scholar = createUnit(state, 0, 'greatPerson', tile.col, tile.row, personOf('scholar'));
    bumpRevision(state);
    const middle = player.gold;
    greatPersonWorkAt(state, player, scholar, tile);
    expect(player.gold - middle).toBe(7);
    // An artist's Landmark is not.
    const other = ring(state, capital)[1]!;
    const artist = createUnit(state, 0, 'greatPerson', other.col, other.row, personOf('artist'));
    bumpRevision(state);
    const after = player.gold;
    greatPersonWorkAt(state, player, artist, other);
    expect(other.improvement).toBe('landmark');
    expect(player.gold - after).toBe(0);
  });

  it('pays nothing from the collection', () => {
    const { state, player, capital } = board();
    player.statecraft.orders.push(PATRONAGE);
    bumpRevision(state);
    const before = player.faithPool;
    spendMerchant(state, player, capital);
    expect(player.faithPool).toBe(before);
  });
});

// --- Sacred Patronage ----------------------------------------------------------

describe('Sacred Patronage', () => {
  it('pays 30 faith at most once a turn, and again the next turn', () => {
    const { state, player, capital } = board();
    seat(state, PATRONAGE);
    const start = player.faithPool;
    spendMerchant(state, player, capital);
    spendMerchant(state, player, capital);
    expect(player.faithPool - start).toBe(30);
    nextTurn(state);
    spendMerchant(state, player, capital);
    expect(player.faithPool - start).toBe(60);
  });

  it('lets faith buy a great person waiting to be called, at the rule’s flat price', () => {
    const { state, player } = board();
    know(state, RITES, true);
    expect(greatPersonPurchaseOpen(state, 0, 'faith')).toBe(false);
    seat(state, PATRONAGE);
    expect(greatPersonPurchaseOpen(state, 0, 'faith')).toBe(true);
    player.faithPool = 10_000;
    bumpRevision(state);
    expect(greatPersonPurchaseError(state, 0, 'faith')).toBeNull();
    // The card plays as built: the price is the rule's own, the same each
    // time. What rises is the renown each later great person needs.
    const result = applyCommand(state, { type: 'purchaseGreatPersonOffer', playerId: 0, buys: 'faith' });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(player.faithPool).toBe(10_000 - greatPersonOfferPrice('faith'));
    expect(player.greatPersonOffer).toBeDefined();
  });
});

// --- The Last Commission ---------------------------------------------------------

describe('The Last Commission', () => {
  it('pays 150 production into the town raising the Magnum Opus, not the capital', () => {
    const { state, player, capital } = board();
    const raiser = town(state, 12, 5);
    raiser.queue = [OPUS];
    bumpRevision(state);
    seat(state, LAST);
    const capitalBasket = capital.hammerBasket;
    const basket = raiser.hammerBasket;
    spendMerchant(state, player, capital);
    expect(raiser.hammerBasket - basket).toBe(150);
    expect(capital.hammerBasket).toBe(capitalBasket);
    expect(player.opusBank).toBeUndefined();
  });

  it('pays at most once a turn', () => {
    const { state, player, capital } = board();
    capital.queue = [OPUS];
    bumpRevision(state);
    seat(state, LAST);
    const basket = capital.hammerBasket;
    spendMerchant(state, player, capital);
    spendMerchant(state, player, capital);
    expect(capital.hammerBasket - basket).toBe(150);
    nextTurn(state);
    spendMerchant(state, player, capital);
    expect(capital.hammerBasket - basket).toBe(300);
  });

  it('pays nothing and keeps nothing while no town raises the Opus', () => {
    const { state, player, capital } = board();
    seat(state, LAST);
    // The Opus second in the queue is not raised: the front row is.
    capital.queue = [{ kind: 'building', id: 'monument' } as City['queue'][number], OPUS];
    bumpRevision(state);
    const basket = capital.hammerBasket;
    spendMerchant(state, player, capital);
    expect(capital.hammerBasket).toBe(basket);
    expect(player.opusBank).toBeUndefined();
    // The once-a-turn stamp was not spent on a moment that paid nothing.
    capital.queue = [OPUS];
    bumpRevision(state);
    spendMerchant(state, player, capital);
    expect(capital.hammerBasket - basket).toBe(150);
  });

  it('gives the same board twice from the same spending', () => {
    const run = (): string => {
      const { state, player, capital } = board();
      capital.queue = [OPUS];
      seat(state, LAST);
      seat(state, PATRONAGE);
      spendMerchant(state, player, capital);
      return snapshotState(state);
    };
    expect(run()).toBe(run());
  });
});

// --- The Immortals ---------------------------------------------------------------

describe('The Immortals (reading 22)', () => {
  /** A board whose seat has spent Copernicus: +2 science in every city. */
  function honoured(): { state: GameState; player: Player; capital: City } {
    const made = board();
    made.player.legacies.push({ id: 'copernicus' as GreatPersonId, age: 1 });
    bumpRevision(made.state);
    return made;
  }

  /** The science Copernicus' legacy pays this town, read off the town's own list. */
  function legacyScience(state: GameState, city: City): number {
    return explainCardCityYields(state, city)
      .filter((line) => line.card === 'copernicus')
      .reduce((sum, line) => sum + line.science, 0);
  }

  it('reads each live legacy twice, the second time under the card’s name', () => {
    const { state, capital } = honoured();
    const other = town(state, 12, 5);
    expect(legacyScience(state, capital)).toBe(2);
    seat(state, IMMORTALS);
    expect(legacyScience(state, capital)).toBe(4);
    expect(legacyScience(state, other)).toBe(4);
    const sources = liveEffects(state, 0)
      .filter((entry) => entry.card === 'copernicus')
      .map((entry) => entry.source);
    expect(sources).toEqual(['Legacy · Copernicus', 'Legacy · Copernicus · The Immortals']);
  });

  it('reads a revoked legacy not at all, and does nothing from the collection', () => {
    const { state, player, capital } = honoured();
    player.statecraft.orders.push(IMMORTALS);
    bumpRevision(state);
    expect(legacyScience(state, capital)).toBe(2);
    seat(state, IMMORTALS);
    player.legacies[0]!.revoked = true;
    bumpRevision(state);
    expect(legacyScience(state, capital)).toBe(0);
  });

  it('leaves the counts of people and families alone', () => {
    const { state, player, capital } = honoured();
    seat(state, 'theLivingCanon' as OrderId);
    const canon = (): number =>
      explainCardPercentYields(state, capital)
        .filter((line) => line.card === 'theLivingCanon' && line.yield === 'food')
        .reduce((sum, line) => sum + line.percent, 0);
    const plain = canon();
    expect(plain).toBeGreaterThan(0);
    seat(state, IMMORTALS);
    expect(canon()).toBe(plain);
    expect(player.legacies).toHaveLength(1);
  });
});

// --- Commission: The Patron's Gallery ----------------------------------------------

describe("Commission: The Patron's Gallery (reading 32)", () => {
  /** Lays this work on a hex, as a great person's work does. */
  function lay(state: GameState, tile: Tile, work: string): void {
    raiseImprovement(tile, work as ImprovementId, state.turn);
    bumpRevision(state);
  }

  it('counts each family of work in the borders once, whoever laid it', () => {
    const { state, capital } = board();
    const hexes = ring(state, capital);
    expect(hexes.length).toBeGreaterThanOrEqual(5);
    expect(commissionFigure(state, 0, 'workFamilies')).toBe(0);
    lay(state, hexes[0]!, 'academy');
    lay(state, hexes[1]!, 'academy');
    expect(commissionFigure(state, 0, 'workFamilies')).toBe(1);
    lay(state, hexes[2]!, 'landmark');
    expect(commissionFigure(state, 0, 'workFamilies')).toBe(2);
    // A Holy Site is the prophet's family.
    lay(state, hexes[3]!, 'holySite');
    expect(workFamiliesHeld(state, 0)).toEqual(['scholar', 'artist', 'prophet']);
    // A work outside the borders does not count, and neither does a rival's.
    const far = at(state, 18, 9);
    expect(state.tileOwner[state.map.tiles.indexOf(far)]).toBeNull();
    lay(state, far, 'citadel');
    expect(commissionFigure(state, 0, 'workFamilies')).toBe(3);
  });

  it('pays a great person and 200 culture, and leaves its chair', () => {
    const { state, player, capital } = board();
    know(state, RITES, true);
    seat(state, GALLERY);
    const hexes = ring(state, capital);
    lay(state, hexes[0]!, 'academy');
    lay(state, hexes[1]!, 'landmark');
    expect(runCommissions(state)).toEqual([]);
    lay(state, hexes[2]!, 'manufactory');
    const culture = player.culturePool;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([GALLERY]);
    expect(player.greatPersonOffer).toBeDefined();
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
    // The culture may open an Order hand at once, so the pool and the hand's
    // price together hold the 200.
    const spent = player.statecraft.pendingOrder?.price ?? 0;
    expect(player.culturePool + spent - culture).toBe(200);
    expect(player.statecraft.slots.some((slot) => slot?.card === GALLERY)).toBe(false);
    expect(commissionFulfilledTurn(player.statecraft, GALLERY)).toBe(state.turn);
    expect(runCommissions(state)).toEqual([]);
  });

  it('pays the renown for the next great person when the seat cannot call one yet', () => {
    const { state, player, capital } = board();
    know(state, RITES, false);
    seat(state, GALLERY);
    const hexes = ring(state, capital);
    lay(state, hexes[0]!, 'academy');
    lay(state, hexes[1]!, 'landmark');
    lay(state, hexes[2]!, 'citadel');
    expect(runCommissions(state).map((report) => report.card)).toEqual([GALLERY]);
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownPool).toBe(renownThreshold(state, player));
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

describe('the seams of a great person spent', () => {
  it('pays the moment in one place, after the legacy, the tally and the removal', () => {
    const payers = Object.entries(SOURCES).filter(([, text]) =>
      /payOccasionRiders\([^)]*'greatPersonSpent'/.test(code(text)),
    );
    expect(payers.map(([path]) => path.replace('../../../src/', ''))).toEqual(['sim/greatPeople.ts']);
    const spend = bodyOf('sim/greatPeople.ts', 'spendGreatPerson');
    const legacy = spend.indexOf('player.legacies.push(');
    const tally = spend.indexOf("recordScalingOccasion(state, player.id, 'greatPersonSpent'");
    const removed = spend.indexOf('removeUnit(state, unit.id)');
    const riders = spend.search(/payOccasionRiders\(\s*state,\s*player,\s*'greatPersonSpent'/);
    expect(legacy).toBeGreaterThan(0);
    expect(tally).toBeGreaterThan(legacy);
    expect(removed).toBeGreaterThan(tally);
    expect(riders).toBeGreaterThan(removed);
    // Both verbs reach it.
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonActAt')).toContain('spendGreatPerson(');
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonWorkAt')).toContain('spendGreatPerson(');
  });

  it('reads the second legacy reading at the legacy source and nowhere else', () => {
    const files = Object.entries(SOURCES).filter(([, text]) => code(text).includes("'legaciesCountTwice'"));
    expect(files.map(([path]) => path.replace('../../../src/', '')).sort()).toEqual([
      'ai/value.ts',
      'sim/statecraft/describers.ts',
      'sim/statecraft/evaluator.ts',
      'sim/statecraftData.ts',
    ]);
    expect(bodyOf('sim/statecraft/evaluator.ts', 'buildLiveEffects')).toContain('legacyReadings(list)');
  });
});

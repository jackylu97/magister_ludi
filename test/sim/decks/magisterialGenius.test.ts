/**
 * **The Universal Genius** (batch MG13 of
 * `docs/plans/magisterial-themes-triage.md`; the triage's reading 23).
 *
 * The card holds one action rule, `actThenWork`. What this file pins:
 *
 *   · the row, and its words. The text says what the card does. The old
 *     sheet's "arrive with two charges" is gone, because the card builds a
 *     mark on the person, not a second charge;
 *   · the rule is read when the person acts. While it holds, the act pays,
 *     with its riders, and the person stays on the board, marked
 *     `Unit.acted`. The act uses none of the person's movement;
 *   · a marked person cannot act again. The refusal and the command say so,
 *     and the refused command leaves the state as it was;
 *   · the work spends a marked person, even after the card has left its
 *     chair. The legacy, the `greatPersonSpent` tally and the spent moment
 *     come once, at the work (reading 21);
 *   · a person that lays its work first is spent as before, and without the
 *     card an act spends the person as before;
 *   · the seams, read off the source: one writer and one reader of the mark,
 *     the rule read only in the act, and the unit sheet's ceremony raised
 *     only for a person who is spent.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { snapshotState } from '../../../src/sim/game';
import {
  greatPersonActAt,
  greatPersonActError,
  greatPersonWorkAt,
  greatPersonWorkError,
} from '../../../src/sim/greatPeople';
import { type Family, GREAT_PERSON_IDS, type GreatPersonId, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { type Tile } from '../../../src/sim/map';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  captureUnit,
  createUnit,
  playerById,
  unitById,
} from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const GENIUS = 'theUniversalGenius' as OrderId;
/** Sacred Patronage: 30 faith when a great person is spent, at most once a turn. */
const PATRONAGE = 'sacredPatronage' as OrderId;
/** The Honoured Dead: a growing card that counts the `greatPersonSpent` tally. */
const HONOURED = 'theHonouredDead' as OrderId;

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function seat(state: GameState, card: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes a card out of its chair for seat 0. It stays in the collection. */
function unseat(state: GameState, card: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.slots = sc.slots.filter((slot) => slot?.card !== card);
  bumpRevision(state);
}

/** A board with a capital of three citizens for seat 0. */
function board(): { state: GameState; player: Player; capital: City } {
  const state = bareState(20, 10);
  const capital = foundCityAt(state, 0, at(state, 3, 5));
  capital.population = 3;
  capital.largestSize = 3;
  capital.queue = [];
  refreshCityDerived(state, capital);
  const player = playerById(state, 0)!;
  bumpRevision(state);
  return { state, player, capital };
}

/** The first great person of this family in the roster, in table order. */
function personOf(family: Family): GreatPersonId {
  const id = GREAT_PERSON_IDS.find((person) => greatPersonDef(person).family === family);
  expect(id, family).toBeDefined();
  return id!;
}

/** A hex the capital owns, its own centre left out: ground a work may stand on. */
function site(state: GameState, capital: City, index = 0): Tile {
  const ring = ownedTiles(state, capital).filter((tile) => !(tile.col === capital.col && tile.row === capital.row));
  expect(ring.length).toBeGreaterThan(index);
  return ring[index]!;
}

/** A great person of this family for seat 0, standing on this hex. */
function person(state: GameState, where: { col: number; row: number }, family: Family): Unit {
  const unit = createUnit(state, 0, 'greatPerson', where.col, where.row, personOf(family));
  bumpRevision(state);
  return unit;
}

/** The count The Honoured Dead holds on the `greatPersonSpent` tally, or 0. */
function spentTally(player: Player): number {
  return player.statecraft.tallies.find((row) => row.card === HONOURED)?.count ?? 0;
}

// --- the row -----------------------------------------------------------------

describe('The Universal Genius: the row', () => {
  it('is dealt from Tier III as a rare Civic card, with the shape the triage names', () => {
    const def = orderDef(GENIUS);
    expect(orderIsDealt(GENIUS)).toBe(true);
    expect(ordersForDecks(['magisterial'])).toContain(GENIUS);
    expect(def.decks).toEqual(['magisterial']);
    expect(def.band).toBe(3);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('civic');
    expect(def.deferred).toBeUndefined();
    expect(def.text).toBe('Your great people may act, and then still lay their work. Each leaves one legacy.');
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'actThenWork' }]);
  });

  it('prints the card in plain words, and says nothing about charges', () => {
    expect(describeCard(GENIUS).map((clause) => stripRefs(clause.text))).toEqual([
      'your great people may act, and then still lay their work',
    ]);
    // The old sheet said "arrive with two charges". The card builds a mark on
    // the person (reading 23), so no player-facing word names a charge.
    expect(orderDef(GENIUS).text).not.toMatch(/charge/i);
    expect(orderDef(GENIUS).note ?? '').not.toMatch(/charge/i);
  });
});

// --- the act -------------------------------------------------------------------

describe('acting while the card is seated (reading 23)', () => {
  it('pays the act and keeps the person on the board, marked, with no legacy yet', () => {
    // A merchant's act pays gold and needs no town. The same act without the
    // card pays the same gold.
    const plain = board();
    const plainBefore = plain.player.gold;
    greatPersonActAt(plain.state, plain.player, person(plain.state, plain.capital, 'merchant'));
    const plainGold = plain.player.gold - plainBefore;
    expect(plainGold).toBeGreaterThan(0);

    const { state, player, capital } = board();
    seat(state, GENIUS);
    const merchant = person(state, capital, 'merchant');
    const before = player.gold;
    const done = greatPersonActAt(state, player, merchant);
    expect(player.gold - before).toBe(plainGold);
    expect(unitById(state, merchant.id)).toBe(merchant);
    expect(merchant.acted).toBe(true);
    expect(player.legacies).toEqual([]);
    // The result still names the legacy the person will leave.
    expect(done.legacy).toBe(personOf('merchant'));
  });

  it('uses none of the person’s movement', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    const merchant = person(state, capital, 'merchant');
    const moves = merchant.movesLeft;
    expect(moves).toBeGreaterThan(0);
    greatPersonActAt(state, player, merchant);
    expect(merchant.movesLeft).toBe(moves);
  });

  it('pays the act’s riders at the act, and the spent moment and tally only at the work', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    seat(state, PATRONAGE);
    seat(state, HONOURED);
    // A rider on the act, hung on the realm for the length of the test. A
    // timed effect is one of the walk's sources, so it reads as a card's
    // rider does. A general's own act pays no yield, so the gold is the
    // rider's alone.
    player.timed = [
      {
        card: GENIUS,
        effect: { kind: 'windfallRider', occasion: 'greatPersonAct', grant: { yield: 'gold', amount: 7 } },
        expiresTurn: state.turn + 10,
      },
    ];
    bumpRevision(state);
    const hex = site(state, capital);
    const general = person(state, hex, 'general');
    const gold = player.gold;
    const faith = player.faithPool;
    greatPersonActAt(state, player, general);
    expect(player.gold - gold).toBe(7);
    expect(player.faithPool).toBe(faith);
    expect(spentTally(player)).toBe(0);
    expect(player.legacies).toEqual([]);
    // The work spends the person: the legacy, the tally and the moment, once.
    expect(greatPersonWorkError(state, 0, general.id)).toBeNull();
    greatPersonWorkAt(state, player, general, hex);
    expect(hex.improvement).toBe('citadel');
    expect(unitById(state, general.id)).toBeUndefined();
    expect(player.legacies.map((held) => held.id)).toEqual([personOf('general')]);
    expect(spentTally(player)).toBe(1);
    expect(player.faithPool - faith).toBe(30);
  });

  it('reads the rule when the person acts, not when the person was called', () => {
    // Called before the card was seated, acting while it is: the person stays.
    const { state, player, capital } = board();
    const early = person(state, capital, 'merchant');
    seat(state, GENIUS);
    greatPersonActAt(state, player, early);
    expect(unitById(state, early.id)).toBe(early);
    expect(early.acted).toBe(true);
    // Held in the collection and not seated, the card does nothing: the act
    // spends the person.
    const held = board();
    held.player.statecraft.orders.push(GENIUS);
    bumpRevision(held.state);
    const merchant = person(held.state, held.capital, 'merchant');
    greatPersonActAt(held.state, held.player, merchant);
    expect(unitById(held.state, merchant.id)).toBeUndefined();
    expect(held.player.legacies.map((record) => record.id)).toEqual([personOf('merchant')]);
  });
});

// --- one act -------------------------------------------------------------------

describe('a person acts once', () => {
  it('refuses a second act by the refusal and by the command, and leaves the state as it was', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    const hex = site(state, capital);
    const merchant = person(state, hex, 'merchant');
    expect(greatPersonActError(state, 0, merchant.id)).toBeNull();
    expect(applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: merchant.id }).ok).toBe(true);
    expect(unitById(state, merchant.id)).toBe(merchant);

    const refusal = `${greatPersonDef(personOf('merchant')).name} has already acted, and can now only lay their work`;
    expect(greatPersonActError(state, 0, merchant.id)).toBe(refusal);
    const before = snapshotState(state);
    const result = applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: merchant.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(refusal);
    expect(snapshotState(state)).toBe(before);
    // The work is still open to them.
    expect(greatPersonWorkError(state, 0, merchant.id)).toBeNull();
    expect(player.legacies).toEqual([]);
  });

  it('lets a marked person lay their work after the card has left its chair', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    const hex = site(state, capital);
    // An engineer's act pours hammers into the nearest town.
    const engineer = person(state, hex, 'engineer');
    expect(greatPersonActError(state, 0, engineer.id)).toBeNull();
    greatPersonActAt(state, player, engineer);
    expect(engineer.acted).toBe(true);
    unseat(state, GENIUS);
    // The mark, not the rule, decides: still no second act, and the work.
    expect(greatPersonActError(state, 0, engineer.id)).toContain('has already acted');
    expect(greatPersonWorkError(state, 0, engineer.id)).toBeNull();
    expect(applyCommand(state, { type: 'greatPersonWork', playerId: 0, unitId: engineer.id }).ok).toBe(true);
    expect(hex.improvement).toBe('manufactory');
    expect(unitById(state, engineer.id)).toBeUndefined();
    expect(player.legacies.map((held) => held.id)).toEqual([personOf('engineer')]);
  });

  it('keeps the mark when the person changes hands', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    const merchant = person(state, capital, 'merchant');
    greatPersonActAt(state, player, merchant);
    captureUnit(state, merchant, 1);
    expect(merchant.acted).toBe(true);
    expect(greatPersonActError(state, 1, merchant.id)).toContain('has already acted');
  });
});

// --- as before -------------------------------------------------------------------

describe('what the card leaves as it was', () => {
  it('spends a person that lays their work first, at once', () => {
    const { state, player, capital } = board();
    seat(state, GENIUS);
    seat(state, HONOURED);
    const hex = site(state, capital);
    const artist = person(state, hex, 'artist');
    greatPersonWorkAt(state, player, artist, hex);
    expect(hex.improvement).toBe('landmark');
    expect(unitById(state, artist.id)).toBeUndefined();
    expect(artist.acted).toBeUndefined();
    expect(player.legacies.map((held) => held.id)).toEqual([personOf('artist')]);
    expect(spentTally(player)).toBe(1);
  });

  it('spends the person at the act without the card', () => {
    const { state, player, capital } = board();
    seat(state, HONOURED);
    const merchant = person(state, capital, 'merchant');
    greatPersonActAt(state, player, merchant);
    expect(unitById(state, merchant.id)).toBeUndefined();
    expect(merchant.acted).toBeUndefined();
    expect(player.legacies.map((held) => held.id)).toEqual([personOf('merchant')]);
    expect(spentTally(player)).toBe(1);
  });

  it('writes no mark on a person that has not acted', () => {
    const { state, capital } = board();
    seat(state, GENIUS);
    const merchant = person(state, capital, 'merchant');
    // Presence is the state: the key is absent, so a game without the card
    // writes the same units as before.
    expect('acted' in merchant).toBe(false);
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

/** The files under `src/` whose code matches, by path. */
function filesMatching(pattern: RegExp): string[] {
  return Object.entries(SOURCES)
    .filter(([, text]) => pattern.test(code(text)))
    .map(([path]) => path.replace('../../../src/', ''))
    .sort();
}

describe('the seams of The Universal Genius', () => {
  it('writes the mark in the act and reads it only in the act’s refusal', () => {
    expect(filesMatching(/\.acted\b/)).toEqual(['sim/greatPeople.ts']);
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonActAt')).toContain('unit.acted = true;');
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonActError')).toContain('unit.acted === true');
    // The work does not ask: a marked person lays its work like any other.
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonWorkError')).not.toContain('acted');
    expect(bodyOf('sim/greatPeople.ts', 'greatPersonWorkAt')).not.toContain('acted');
  });

  it('reads the rule in the act and nowhere else in the simulation', () => {
    expect(filesMatching(/'actThenWork'/)).toEqual(['ai/value.ts', 'sim/greatPeople.ts', 'sim/statecraftData.ts']);
    const act = bodyOf('sim/greatPeople.ts', 'greatPersonActAt');
    // Read before the act pays, and the spending skipped while it holds.
    const rule = act.indexOf("cardActionRule(state, player.id, 'actThenWork')");
    const riders = act.indexOf('payActRiders(');
    const kept = act.indexOf('if (stays)');
    const spent = act.indexOf('spendGreatPerson(');
    expect(rule).toBeGreaterThan(0);
    expect(riders).toBeGreaterThan(rule);
    expect(kept).toBeGreaterThan(riders);
    expect(spent).toBeGreaterThan(kept);
  });

  it('raises the unit sheet’s ceremony only for a person who is spent', () => {
    const controls = code(SOURCES['../../../src/ui/controls.ts'] ?? '');
    const at = controls.indexOf("function spendGreatPerson(verb: 'act' | 'work')");
    expect(at).toBeGreaterThan(-1);
    const body = controls.slice(at, controls.indexOf('function chopBlocker(', at));
    const stays = body.indexOf('if (unitById(getGame().state, unit.id)) {');
    const otherwise = body.indexOf('} else {', stays);
    const legacy = body.indexOf("legacy stands with your government");
    const ceremony = body.indexOf('onGreatPersonSpent?.(');
    expect(stays).toBeGreaterThan(-1);
    expect(otherwise).toBeGreaterThan(stays);
    expect(legacy).toBeGreaterThan(otherwise);
    expect(ceremony).toBeGreaterThan(otherwise);
  });
});

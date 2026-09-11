/**
 * **The halves the vocabulary could not say, said** — batch L3a,
 * `docs/flags.md` (iiii), spec of record `docs/leaders.md`.
 *
 * L2a built thirty-nine of the seventy-two cards whole and left twenty-nine
 * carrying a plain "not yet" line. This file is the evaluator's share of the
 * repair: eight cards whose missing half was a **shape** — a scope, a gate, an
 * amplifier's narrowing, a chair. `leaders.test.ts` beside it pins the system
 * (the draft, the debt, the pick, the register); this pins the *rules*.
 *
 * Every claim below is written the same way, because it is the way a deferred
 * half fails: **it fires where it should, and not where it should not.** A road
 * town and a town off the road; a river town and a dry one; a puppet and a
 * province; a rite burning and no rite; a wonder that sings and one that is
 * silent; a share and a count. A rule that pays everywhere is exactly the bug
 * these cards were deferred for.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createGame } from '../../src/sim/game';
import { greatPersonActAt } from '../../src/sim/greatPeople';
import { type Tile, getTileAt } from '../../src/sim/map';
import type { LeaderCardId, LeaderId } from '../../src/sim/leaderData';
import { performRiteAt } from '../../src/sim/religion';
import { LIVE_RITE_IDS } from '../../src/sim/religionData';
import { layRoad } from '../../src/sim/roads';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import {
  cardAmplifier,
  cardAuthority,
  cardCombatLines,
  chairCount,
  cityScopeAdmits,
  refitSlots,
  slotTypesOf,
} from '../../src/sim/statecraft';
import { GOVERNMENT_IDS, STARTING_GOVERNMENT, slotCount } from '../../src/sim/statecraftData';
import { explainCity } from '../../src/sim/yields/town';
import { unitDef } from '../../src/sim/unitData';

// --- the bench --------------------------------------------------------------

/** A one-seat game whose capital is founded. `leaders.test.ts`' bench, narrowed. */
function game(leader: LeaderId, seed = 11) {
  const g = createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const settler = g.state.units.find(
    (unit) => unit.ownerId === 0 && unitDef(unit.type).foundsCity,
  )!;
  foundCityAt(g.state, 0, getTileAt(g.state.map, settler.col, settler.row)!);
  return g;
}

/**
 * Puts a card in a seat's hand **by fiat**, and announces it.
 *
 * The command path is `leaders.test.ts`' subject; here the card is a *premise*,
 * and a test that had to walk a seat into Æra IV to ask what a puppet pays would
 * be testing the ladder. `bumpRevision` is what the reducer does on the way out:
 * the law is memoised per seat and per revision, so a hand changed without one
 * would be a hand nothing reads.
 */
function hold(state: GameState, playerId: number, age: '1' | '2' | '3' | '4', card: LeaderCardId) {
  const player = playerById(state, playerId)!;
  const picks = player.leaderPicks ?? {};
  picks[Number(age) as 1 | 2 | 3 | 4] = card;
  player.leaderPicks = picks;
  bumpRevision(state);
}

/** Drops a card out of a seat's hand again — the revocation half of `hold`. */
function drop(state: GameState, playerId: number, age: 1 | 2 | 3 | 4) {
  const player = playerById(state, playerId)!;
  delete player.leaderPicks?.[age];
  bumpRevision(state);
}

/** A land hex this empire owns nothing near, `away` rings from its capital. */
function landAway(state: GameState, from: City, away: number): Tile {
  for (const tile of state.map.tiles) {
    if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'mountain') continue;
    const dc = Math.abs(tile.col - from.col);
    const dr = Math.abs(tile.row - from.row);
    if (dc + dr < away) continue;
    if (dc + dr > away + 2) continue;
    return tile;
  }
  throw new Error('no ground far enough from the capital');
}

/** Every line of this town's science, the card's own included. */
function scienceHere(state: GameState, city: City): number {
  let total = 0;
  for (const line of explainCity(state, city).lines) total += line.science;
  return total;
}

/** What one card's lines pay this town in one voice. Rule 5: the list, not a total. */
function paidHere(state: GameState, city: City, card: string, voice: 'culture' | 'science'): number {
  let total = 0;
  for (const line of explainCity(state, city).lines) {
    if ((line as { card?: string }).card !== card) continue;
    total += (line as unknown as Record<string, number>)[voice] ?? 0;
  }
  return total;
}

// --- the writ ---------------------------------------------------------------

describe('the writ a road and a river carry', () => {
  it('The Tribute Road counts the towns joined to the capital and no others', () => {
    const g = game('pachacuti');
    const capital = g.state.cities[0]!;
    // A town on the capital's doorstep is joined by the fill's own rule — a city
    // centre is a junction (`connectedCities`) — and one out in the country is
    // not, because no road reaches it.
    const next = getTileAt(g.state.map, capital.col + 1, capital.row)!;
    foundCityAt(g.state, 0, next);
    const far = landAway(g.state, capital, 6);
    foundCityAt(g.state, 0, far);

    hold(g.state, 0, '3', 'pachacutiTribute');
    const lines = cardAuthority(g.state, 0).filter((line) => line.card === 'pachacutiTribute');
    expect(lines).toHaveLength(1);
    // One town, not three: the capital is what connection is measured *from*,
    // and the far town has no road home.
    expect(lines[0]!.amount).toBe(1);

    // Pave the way and the far town joins the count — the same fill the treasury
    // reads, so a road that pays gold pays writ.
    for (const tile of g.state.map.tiles) {
      const between =
        Math.abs(tile.col - capital.col) + Math.abs(tile.row - capital.row) <=
        Math.abs(far.col - capital.col) + Math.abs(far.row - capital.row);
      if (between) layRoad(tile, 0);
    }
    bumpRevision(g.state);
    const paved = cardAuthority(g.state, 0).filter((line) => line.card === 'pachacutiTribute');
    expect(paved[0]!.amount).toBeGreaterThan(1);
  });

  it('The Great Yangtze counts a river town and not a town that merely drinks', () => {
    const g = game('taizong');
    const capital = g.state.cities[0]!;
    const wet = getTileAt(g.state.map, capital.col, capital.row)!;
    // **The mask, not the water.** The capital is given a river edge and the
    // second town is given fresh water with no river in it — which is exactly
    // the pair the scope exists to tell apart (a lake is not the Yangtze).
    wet.riverEdges = 1;
    const dry = getTileAt(g.state.map, capital.col + 2, capital.row)!;
    dry.riverEdges = 0;
    dry.freshwater = true;
    foundCityAt(g.state, 0, dry);

    hold(g.state, 0, '1', 'taizongYangtze');
    const lines = cardAuthority(g.state, 0).filter((line) => line.card === 'taizongYangtze');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amount).toBe(1);

    // And the reading is the ground's: give the dry town a river and it counts.
    dry.riverEdges = 1;
    bumpRevision(g.state);
    expect(
      cardAuthority(g.state, 0).find((line) => line.card === 'taizongYangtze')!.amount,
    ).toBe(2);
  });
});

// --- the vassals ------------------------------------------------------------

describe('what a puppet sends', () => {
  it('The Heavenly Khagan pays in the puppets and nowhere else', () => {
    const g = game('taizong');
    const capital = g.state.cities[0]!;
    const other = getTileAt(g.state.map, capital.col + 2, capital.row)!;
    foundCityAt(g.state, 0, other);
    const vassal = g.state.cities[1]!;
    vassal.puppet = true;

    hold(g.state, 0, '3', 'taizongKhagan');
    expect(paidHere(g.state, vassal, 'taizongKhagan', 'culture')).toBe(5);
    expect(paidHere(g.state, capital, 'taizongKhagan', 'culture')).toBe(0);

    // **Annexing ends the tribute**, which is the whole difference between this
    // scope and `captured`: a province is not a vassal.
    delete vassal.puppet;
    bumpRevision(g.state);
    expect(paidHere(g.state, vassal, 'taizongKhagan', 'culture')).toBe(0);
  });

  it('The Tribute of the Han is a share of what a puppet makes, not a head count', () => {
    const g = game('modu');
    const capital = g.state.cities[0]!;
    const other = getTileAt(g.state.map, capital.col + 2, capital.row)!;
    foundCityAt(g.state, 0, other);
    const vassal = g.state.cities[1]!;
    vassal.puppet = true;

    hold(g.state, 0, '4', 'moduTribute');
    const paid = paidHere(g.state, vassal, 'moduTribute', 'science');
    expect(paid).toBeGreaterThan(0);
    // A **share**, and the claim is arithmetic rather than a magnitude: what the
    // card pays is thirty percent of what the town made *without* it. A count
    // would have been a figure with no relation to the fold at all.
    expect(paid).toBeCloseTo((scienceHere(g.state, vassal) - paid) * 0.3, 9);
    // And nothing in the province next door.
    expect(paidHere(g.state, capital, 'moduTribute', 'science')).toBe(0);

    // The share **follows the fold**: a bigger town makes more, so the tribute
    // grows with it — which is exactly what a per-citizen count could not say
    // about a town whose books changed for any other reason.
    vassal.population += 4;
    bumpRevision(g.state);
    const grown = paidHere(g.state, vassal, 'moduTribute', 'science');
    expect(grown).toBeGreaterThan(paid);
    expect(grown).toBeCloseTo((scienceHere(g.state, vassal) - grown) * 0.3, 9);
  });
});

// --- the fires --------------------------------------------------------------

describe('The Rite of the Sky', () => {
  it('is kept only while a rite burns in the empire', () => {
    const g = game('modu');
    const player = playerById(g.state, 0)!;
    const capital = g.state.cities[0]!;
    const unit = createUnit(g.state, 0, 'warrior', capital.col, capital.row);
    const situation = {
      unit,
      side: 'attack' as const,
      tile: getTileAt(g.state.map, capital.col, capital.row)!,
      vsBarbarians: false,
      vsCity: false,
      targetHp: 10,
      targetMaxHp: 10,
    };

    hold(g.state, 0, '3', 'moduSkyRite');
    // No fire, no line — the gate is the whole card.
    expect(cardCombatLines(g.state, situation).some((line) => line.card === 'moduSkyRite')).toBe(
      false,
    );

    performRiteAt(g.state, player, capital, LIVE_RITE_IDS[0]!);
    bumpRevision(g.state);
    const lit = cardCombatLines(g.state, situation).filter((line) => line.card === 'moduSkyRite');
    expect(lit).toHaveLength(1);
    expect(lit[0]!.amount).toBe(1);

    // **Nothing ticks.** The rite's expiry is an absolute turn, so walking the
    // clock past it closes the gate with no broom having run.
    g.state.turn += 99;
    bumpRevision(g.state);
    expect(cardCombatLines(g.state, situation).some((line) => line.card === 'moduSkyRite')).toBe(
      false,
    );
  });
});

// --- the works --------------------------------------------------------------

describe('The House of Millions of Years', () => {
  it('counts a wonder that sings, and not one that is silent', () => {
    const g = game('akhenaten');
    const capital = g.state.cities[0]!;
    const scope = { test: 'hasBuildingYielding', yields: 'culture', wonder: true } as const;

    // The Pyramids pay no culture on their row and none through a clause: a
    // wonder, and not a work that sings.
    capital.buildings.push('pyramids');
    bumpRevision(g.state);
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(false);

    // The Theatre of Dionysus carries its culture in its own column.
    capital.buildings.push('theatreOfDionysus');
    bumpRevision(g.state);
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(true);
  });

  it('counts a wonder that sings through a clause, in the towns it sings in', () => {
    // **The reading L3a repaired.** The Hagia Sophia's culture is not in her
    // row's column at all — it is a `pays` clause that lands in the towns with a
    // temple in them — so a scope that asked the column alone counted a wonder
    // built to be sung in as silent everywhere.
    const g = game('akhenaten');
    const capital = g.state.cities[0]!;
    const scope = { test: 'hasBuildingYielding', yields: 'culture', wonder: true } as const;

    capital.buildings.push('hagiaSophia');
    bumpRevision(g.state);
    // No temple, no song: the clause's own scope is asked, which is what keeps
    // the answer local rather than making it universal.
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(false);

    capital.buildings.push('temple');
    bumpRevision(g.state);
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(true);
  });
});

// --- the poets --------------------------------------------------------------

describe('The Great Poets', () => {
  it('leaves a merchant’s purse exactly as it found it', () => {
    // **The narrowing, from the side that must not move.** A merchant's gold is
    // an aged flat figure with nothing random in it, so the same act on the same
    // board pays the same coin with the card held and without it — which is the
    // whole claim: the hundred percent is the artists'.
    const bare = game('taizong');
    const withCard = game('taizong');
    hold(withCard.state, 0, '4', 'taizongPoets');

    const plain = purseFrom(bare, 'eaNasir');
    expect(plain).toBeGreaterThan(0);
    expect(purseFrom(withCard, 'eaNasir')).toBe(plain);
  });

  it('lifts the artists’ share alone, family by family', () => {
    const g = game('taizong');
    hold(g.state, 0, '4', 'taizongPoets');
    // The reading the act itself takes (`greatPersonActAt` hands its own family
    // in). Asked family by family, because that is exactly what the row narrows.
    expect(cardAmplifier(g.state, 0, 'greatPersonAct', 'artist')).toBe(100);
    for (const family of ['scholar', 'engineer', 'merchant', 'general'] as const) {
      expect(cardAmplifier(g.state, 0, 'greatPersonAct', family), family).toBe(0);
    }
    // And a reader with no family in hand takes nothing, which is the safe half
    // of the rule: a clause that reaches one of five is not a clause a seam that
    // cannot tell them apart may read.
    expect(cardAmplifier(g.state, 0, 'greatPersonAct', undefined)).toBe(0);
  });

  it('hangs the quickened years on the realm when an artist spends themselves', () => {
    const withCard = game('taizong');
    hold(withCard.state, 0, '4', 'taizongPoets');
    songFrom(withCard, 'homer');

    // **The second clause**: five turns of quickened work and song, hung on the
    // realm as an ordinary timed effect with an absolute expiry.
    const hung = playerById(withCard.state, 0)!.timed ?? [];
    const mine = hung.filter((entry) => entry.card === 'taizongPoets');
    expect(mine).toHaveLength(2);
    expect(new Set(mine.map((entry) => entry.expiresTurn))).toEqual(
      new Set([withCard.state.turn + 5]),
    );
    expect(mine.map((entry) => (entry.effect as { yield?: string }).yield).sort()).toEqual([
      'culture',
      'production',
    ]);

    // And nothing at all follows a merchant.
    const merchant = game('taizong');
    hold(merchant.state, 0, '4', 'taizongPoets');
    purseFrom(merchant, 'eaNasir');
    expect(playerById(merchant.state, 0)!.timed ?? []).toHaveLength(0);
  });
});

// --- the chair --------------------------------------------------------------

describe('The King’s Friends', () => {
  it('opens one more chair, under this government and the next', () => {
    const g = game('mithridates');
    const player = playerById(g.state, 0)!;
    const base = slotCount(STARTING_GOVERNMENT);
    expect(player.statecraft.slots).toHaveLength(base);

    hold(g.state, 0, '2', 'mithridatesFriends');
    refitSlots(g.state, player);
    expect(player.statecraft.slots).toHaveLength(base + 1);
    // **The extra chair is a wildcard**, appended, so no position renumbers.
    const layout = slotTypesOf(player.statecraft);
    expect(layout).toHaveLength(base + 1);
    expect(layout[base]).toBe('wildcard');
    expect(layout.slice(0, base)).toEqual(slotTypesOf({
      ...player.statecraft,
      slots: new Array(base).fill(null),
    }));

    // And under every government, which is what the card says out loud.
    for (const id of GOVERNMENT_IDS) {
      expect(chairCount(g.state, 0, id), id).toBe(slotCount(id) + 1);
    }

    // **And it is lost with the card.** Nothing in the game revokes a leader's
    // row today; the pin is that the council is a fact about the law rather than
    // a number written down once, so a hand that stopped holding it narrows
    // again on the next refit.
    drop(g.state, 0, 2);
    refitSlots(g.state, player);
    expect(player.statecraft.slots).toHaveLength(base);
  });
});

/** A great person of this id, standing in the capital, spent on its family's boon. */
function act(state: GameState, player: Player, city: City, person: string) {
  const unit = createUnit(state, player.id, 'greatPerson', city.col, city.row, person as never);
  return greatPersonActAt(state, player, unit);
}

/** What a merchant's afternoon put in the treasury. */
function purseFrom(g: { state: GameState }, person: string): number {
  const player = playerById(g.state, 0)!;
  const before = player.gold;
  act(g.state, player, g.state.cities[0]!, person);
  return player.gold - before;
}

/** What an artist's festival put in the culture pool. */
function songFrom(g: { state: GameState }, person: string): number {
  const player = playerById(g.state, 0)!;
  const before = player.culturePool;
  act(g.state, player, g.state.cities[0]!, person);
  return player.culturePool - before;
}

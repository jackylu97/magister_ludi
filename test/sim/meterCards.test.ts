/**
 * A meter line carries the card that paid it (batch UX8b,
 * `docs/plans/faith-screen-audit.md` §6), so happiness and authority can be
 * split by source the way the Ledger splits a yield.
 *
 * What is pinned here: a card's own line names its card; a building's line
 * names the cards standing on it and what each paid, with its label and figure
 * unchanged; a line no card paid names none; and `meterCardShares` is the one
 * reading of all three.
 *
 * Core: one small board.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { explainAuthority, explainHappiness, meterCardShares } from '../../src/sim/meters';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { createGame } from './newGameHelpers';

/** Seat 0 with one town and the Keeper of the Hearth, whose happiness is the capital's. */
function world(): { state: GameState; capital: City } {
  const g = createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const state = g.state;
  const capital = foundCityAt(state, 0, getTileAt(state.map, 6, 6)!);
  playerById(state, 0)!.pantheon.beliefs.push('keeperOfTheHearth');
  bumpRevision(state);
  return { state, capital };
}

describe('a meter line names the card that paid it', () => {
  it("names a card's own happiness line, and no card on a line nobody paid", () => {
    const { state } = world();
    const player = playerById(state, 0)!;
    player.statecraft.orders = ['theSettledRealm'];
    player.statecraft.slots = [{ card: 'theSettledRealm', sealedUntil: 0 }];
    bumpRevision(state);
    const lines = explainHappiness(state, 0);
    const line = lines.find((entry) => entry.card === 'theSettledRealm');
    expect(line?.value).toBe(2);
    expect(meterCardShares(line!)).toEqual([{ card: 'theSettledRealm', value: 2 }]);
    const palace = lines.find((line) => line.source === 'Palace')!;
    expect(palace.card).toBeUndefined();
    expect(palace.cards).toBeUndefined();
    expect(meterCardShares(palace)).toEqual([]);
  });

  it("names the cards standing on a building, and leaves the building's line as it was", () => {
    const { state, capital } = world();
    capital.timed = [
      { card: 'feastDays', expiresTurn: state.turn + 1, effect:
      { kind: 'happiness', amount: 1, per: 'city', scope: { test: 'hasBuilding', building: 'temple' }, building: 'temple' } },
      { card: 'feastDays', expiresTurn: state.turn + 1, effect: { kind: 'happiness', amount: 1, per: 'city' } },
    ];
    capital.buildings.push('temple');
    bumpRevision(state);
    const temple = explainHappiness(state, 0).find(
      (line) => line.source.includes(buildingDef('temple').name) && line.cards !== undefined,
    );
    expect(temple).toBeDefined();
    expect(temple!.cards).toEqual([{ card: 'feastDays', value: 1 }]);
    expect(temple!.value).toBe((buildingDef('temple').happiness ?? 0) + 1);
    expect(temple!.card).toBeUndefined();
    expect(meterCardShares(temple!)).toEqual(temple!.cards);
    // Feast Days' other half, a point in every town that follows, is a line of
    // its own under its card.
    expect(
      explainHappiness(state, 0).some((line) => line.card === 'feastDays' && line.cards === undefined),
    ).toBe(true);
  });

  it("names a card's own authority line", () => {
    const { state } = world();
    const card = 'localClerks' as OrderId;
    const player = playerById(state, 0)!;
    player.statecraft.orders = [card];
    player.statecraft.slots = [{ card, sealedUntil: 0 }];
    bumpRevision(state);
    const clerks = explainAuthority(state, 0).find((line) => line.card === card);
    expect(clerks?.value).toBe(3);
    expect(meterCardShares(clerks!)).toEqual([{ card, value: 3 }]);
  });
});

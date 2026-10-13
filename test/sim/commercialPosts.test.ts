import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { dispatch, replay, saveGame, snapshotState } from '../../src/sim/game';
import { explainCity } from '../../src/sim/yields/town';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { type OrderId, orderDef } from '../../src/sim/statecraftData';
import { cityHoldsPost, cityPostPays, foreignPostCities, postSince } from '../../src/sim/routes';
import { RULES } from '../../src/sim/rulesData';
import { cityRouteYields, explainRouteSenderYield, foldRouteYield } from '../../src/sim/trade';
import { cardCombatLines, cardHappiness, explainCardCityYields } from '../../src/sim/statecraft';
import { closeWar, openWar } from '../../src/sim/wars';
import { at, bareState } from './improvementHelpers';
import { game } from './statecraftHelpers';

/**
 * Batch D2e — the two systems, and only what is new about them.
 *
 * **The trading post** is a per-empire fact on a town (`City.posts`), which is
 * the thing `City.tradingPost` could never be: both ends of a route write that
 * flag, so it can say "caravans have been here" and never "mine". A post
 * ripens after a full route term of unbroken trading and is then permanent.
 *
 * **The bilateral grant** is a card of empire A putting a yield in empire B's
 * books (`CardPaysEffect.payee`). Two things are worth defending and the file
 * is organised around them: the coin lands in the *payee's own explanation*
 * (rule 5 across a border, not a transfer written beside the ledger), and two
 * empires paying each other cannot race, because every town is priced before
 * any bank is credited.
 *
 * What is deliberately not re-tested here: everything a route already paid.
 * `trade.test.ts` owns the caravan and `routeTally.test.ts` owns the counts.
 */

const TERM = Math.floor(RULES.trade.routeTurns);

/**
 * Two empires at peace, one town each, a trader standing in A's town — and no
 * war register, because a declaration is a thing three tests here make and a
 * truce would refuse it.
 *
 * `foreignWorld` in `trade.test.ts` is the same fixture; it is rebuilt rather
 * than imported because importing a `.test.ts` re-registers its tests.
 */
function pair(): { state: GameState; home: City; partner: City; trader: Unit } {
  const state = bareState(16, 9);
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 1, at(state, 10, 4));
  home.buildings.push('market');
  bumpRevision(state);
  const trader = createUnit(state, 0, 'trader', 3, 4);
  // Met by the one clause that needs no paper: a piece of theirs in sight.
  createUnit(state, 1, 'worker', 3, 3);
  return { state, home, partner, trader };
}

function send(playerId: number, unitId: number, fromCityId: number, toCityId: number): Command {
  return { type: 'startRoute', playerId, unitId, fromCityId, toCityId };
}

/**
 * Seats a card in a chair, which is what makes it live — holding a row is not
 * the same as slotting one, and only a slotted row reaches `liveEffects`.
 */
function holds(state: GameState, playerId: number, ...ids: string[]): void {
  const seat = playerById(state, playerId)!;
  for (const id of ids as OrderId[]) {
    seat.statecraft.orders.push(id);
    seat.statecraft.slots.push({ card: id, sealedUntil: state.turn });
  }
  bumpRevision(state);
}

describe('a trading post belongs to one empire', () => {
  it('ripens after a route term, at both ends, and says whose it is', () => {
    const { state, home, partner, trader } = pair();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    // The record opens the turn the route does — a date, not a flag, so nothing
    // has to visit it again for it to ripen.
    expect(postSince(home, 0)).toBe(state.turn);
    expect(postSince(partner, 0)).toBe(state.turn);
    expect(cityHoldsPost(state, partner, 0)).toBe(false);

    state.turn += TERM - 1;
    expect(cityHoldsPost(state, partner, 0)).toBe(false);
    state.turn += 1;
    expect(cityHoldsPost(state, partner, 0)).toBe(true);
    expect(cityHoldsPost(state, home, 0)).toBe(true);

    // **Per empire, which is the whole point.** The town the caravan reached is
    // player 1's, and player 1 has no post of its own there — the road was not
    // theirs. The old shared flag cannot tell these two apart and still says
    // yes to both.
    expect(cityHoldsPost(state, partner, 1)).toBe(false);
    expect(partner.tradingPost).toBe(true);

    // And it is foreign, which is what the empire count is about.
    expect(foreignPostCities(state, 0)).toBe(1);
    expect(foreignPostCities(state, 1)).toBe(0);
  });

  it('is not bought by starting and cancelling, and is never lost once earned', () => {
    const { state, home, partner, trader } = pair();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    state.turn += TERM - 2;

    // Cancelled a turn short: the record goes with the route, which is the
    // design's "starting/cancelling does not qualify".
    expect(
      applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: trader.id }).ok,
    ).toBe(true);
    expect(postSince(partner, 0)).toBeUndefined();
    expect(partner.posts).toBeUndefined();

    // Run it again and let it stand the full term.
    const again = createUnit(state, 0, 'trader', 3, 4);
    expect(applyCommand(state, send(0, again.id, home.id, partner.id)).ok).toBe(true);
    state.turn += TERM;
    expect(cityHoldsPost(state, partner, 0)).toBe(true);

    // Now cancel it. An established post is history and stays.
    expect(
      applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: again.id }).ok,
    ).toBe(true);
    expect(cityHoldsPost(state, partner, 0)).toBe(true);
  });

  it('survives a war, and the war suspends only what it pays', () => {
    const { state, home, partner, trader } = pair();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    state.turn += TERM;
    expect(cityHoldsPost(state, partner, 0)).toBe(true);
    expect(cityPostPays(state, partner, 0)).toBe(true);

    // A declaration ends the route and sweeps it (`cancelRoutesBetween` goes
    // through `endRoute`, which is where a post would be dropped if war could
    // drop one). Entrenched Interests' second sentence is that it cannot.
    openWar(state, 0, 1);
    expect(
      applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: trader.id }).ok,
    ).toBe(true);
    expect(cityHoldsPost(state, partner, 0)).toBe(true);
    // The income stops, and stops for the stated reason rather than by the
    // record going away.
    expect(cityPostPays(state, partner, 0)).toBe(false);
    expect(foreignPostCities(state, 0)).toBe(0);

    // Peace restores it with no new term to serve.
    closeWar(state, 0, 1);
    expect(cityPostPays(state, partner, 0)).toBe(true);
  });

  it('carries into a save and replays to the same bytes', () => {
    const g = game(11);
    const before = dispatch(g, { type: 'endTurn', playerId: 0 });
    expect(before.ok).toBe(true);
    // Posts are written by a command, so they are in the log and never in the
    // file: a save is `{config, log}` and replays. The claim under test is that
    // nothing about a post is read off anything but the log.
    const saved = JSON.parse(saveGame(g)) as { config: typeof g.config; log: Command[] };
    const again = replay(saved.config, saved.log);
    expect(snapshotState(again)).toBe(snapshotState(g.state));
  });
});

describe('a card may pay another empire', () => {
  it('puts The Common Road’s coin in the host’s own explanation, not beside it', () => {
    const { state, home, partner, trader } = pair();
    holds(state, 0, 'theCommonRoad');
    expect(orderDef('theCommonRoad' as OrderId).deferred).toBeUndefined();
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);

    // **The host's list.** `cityRouteYields` is what `explainCity` step 6
    // folds, so the line is on the foreign town's own sheet and its total is
    // still the fold of its own list — rule 5 across a border.
    const hostLines = cityRouteYields(state, partner);
    const named = hostLines.filter((line) => line.source.includes('The Common Road'));
    expect(named).toHaveLength(1);
    expect(named[0]!.gold).toBe(3);
    // And it really reaches the town's fold rather than sitting in a list
    // nobody adds up.
    const sheet = explainCity(state, partner);
    expect(sheet.lines.some((line) => line.source.includes('The Common Road'))).toBe(true);

    // **The sender's half is the sender's**, in a different fold entirely, and
    // the host's coin is not in it.
    const mine = explainRouteSenderYield(state, trader);
    const totals = foldRouteYield(mine);
    expect(totals.gold).toBeGreaterThanOrEqual(3);
    expect(totals.science).toBeGreaterThanOrEqual(3);
    expect(totals.culture).toBeGreaterThanOrEqual(3);

    // The host gets exactly the flat grant and no share of the crossing: a
    // premium on the sender's goods is not a premium on a gift.
    expect(foldRouteYield(named).gold).toBe(3);
  });

  it('pays nobody else’s town on a road that never leaves home', () => {
    // The row says `crossing: 'international'`, so a domestic road carries
    // neither half. Written because the host grant is paid on both branches of
    // the destination fold and only the crossing keeps it honest.
    const state = bareState(16, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const inland = foundCityAt(state, 0, at(state, 10, 4));
    home.buildings.push('market');
    bumpRevision(state);
    const trader = createUnit(state, 0, 'trader', 3, 4);
    holds(state, 0, 'theCommonRoad');
    expect(applyCommand(state, send(0, trader.id, home.id, inland.id)).ok).toBe(true);
    expect(
      cityRouteYields(state, inland).some((line) => line.source.includes('The Common Road')),
    ).toBe(false);
  });

  it('pays The Foreign Factor to both sides off the same posts, and stops for war', () => {
    const { state, home, partner, trader } = pair();
    holds(state, 0, 'theForeignFactor');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    state.turn += TERM;

    // The host's gold arrives in the host's own card lines, named for the card
    // and for the empire that pays it.
    const hostLines = explainCardCityYields(state, partner);
    const grant = hostLines.filter((line) => line.source.includes('The Foreign Factor'));
    expect(grant).toHaveLength(1);
    expect(grant[0]!.gold).toBe(2);
    expect(grant[0]!.source).toContain(playerById(state, 0)!.name);

    // And the payer's own town is untouched by it: the row is foreign-only, so
    // the empire that holds the card does not pay itself twice.
    expect(
      explainCardCityYields(state, home).some((line) =>
        line.source.includes('The Foreign Factor'),
      ),
    ).toBe(false);

    // Both halves count the same houses.
    expect(foreignPostCities(state, 0)).toBe(1);

    // War silences both halves at once, and neither the record nor the card
    // moves — which is the point of putting the suspension in the reading.
    openWar(state, 0, 1);
    expect(
      explainCardCityYields(state, partner).some((line) =>
        line.source.includes('The Foreign Factor'),
      ),
    ).toBe(false);
    expect(foreignPostCities(state, 0)).toBe(0);
    expect(cityHoldsPost(state, partner, 0)).toBe(true);
  });

  it('lets two empires pay each other, in an order neither of them sets', () => {
    // The determinism claim, stated as the thing that could go wrong: A's card
    // pays B's town and B's card pays A's town in the same turn. Each town's
    // fold reads only the other empire's *cards*, never the other town's
    // totals, so there is nothing for an order to change.
    const { state, home, partner, trader } = pair();
    const theirs = createUnit(state, 1, 'trader', 10, 4);
    partner.buildings.push('market');
    bumpRevision(state);
    holds(state, 0, 'theCommonRoad');
    holds(state, 1, 'theCommonRoad');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    expect(applyCommand(state, send(1, theirs.id, partner.id, home.id)).ok).toBe(true);

    const toThem = cityRouteYields(state, partner).filter((line) =>
      line.source.includes('The Common Road'),
    );
    const toUs = cityRouteYields(state, home).filter((line) =>
      line.source.includes('The Common Road'),
    );
    expect(toThem).toHaveLength(1);
    expect(toUs).toHaveLength(1);
    expect(toThem[0]!.gold).toBe(3);
    expect(toUs[0]!.gold).toBe(3);

    // Read twice with the units walked to the other order: the same two lines.
    const first = JSON.stringify([toThem, toUs]);
    state.units.reverse();
    bumpRevision(state);
    const second = JSON.stringify([
      cityRouteYields(state, partner).filter((line) =>
        line.source.includes('The Common Road'),
      ),
      cityRouteYields(state, home).filter((line) => line.source.includes('The Common Road')),
    ]);
    expect(second).toBe(first);
  });
});

describe('the two cards that read a post without reading its income', () => {
  it('pays Entrenched Interests in a rival’s streets, and goes on paying at war', () => {
    const { state, home, partner, trader } = pair();
    holds(state, 0, 'entrenchedInterests');
    expect(applyCommand(state, send(0, trader.id, home.id, partner.id)).ok).toBe(true);
    state.turn += TERM;

    const soldier = createUnit(state, 0, 'warrior', partner.col, partner.row);
    const situation = {
      unit: soldier,
      side: 'attack' as const,
      tile: at(state, partner.col, partner.row),
      vsBarbarians: false,
      vsCity: false,
      targetHp: 10,
      targetMaxHp: 10,
    };
    const named = () =>
      cardCombatLines(state, situation).filter((line) =>
        line.source.includes('Entrenched Interests'),
      );
    expect(named()).toHaveLength(1);
    expect(named()[0]!.amount).toBe(3);

    // Whose town it is was never asked — the card says "including foreign
    // cities" — and war does not take the factors away. This is the one reading
    // that goes through `cityHoldsPost` rather than `cityPostPays`.
    openWar(state, 0, 1);
    expect(named()).toHaveLength(1);

    // A town with no post of yours pays nothing, which is what makes it a post
    // test and not a "standing in any town" test.
    const elsewhere = foundCityAt(state, 1, at(state, 13, 6));
    const away = createUnit(state, 0, 'warrior', elsewhere.col, elsewhere.row);
    expect(
      cardCombatLines(state, { ...situation, unit: away, tile: at(state, 13, 6) }).filter(
        (line) => line.source.includes('Entrenched Interests'),
      ),
    ).toHaveLength(0);
  });

  it('asks The Merchant Commonwealth for both the post and the road', () => {
    // Two of this empire's own towns: the post ripens at both ends, and only
    // the town a domestic route *ends* at answers yes to both questions.
    const state = bareState(16, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const inland = foundCityAt(state, 0, at(state, 10, 4));
    home.buildings.push('market');
    bumpRevision(state);
    const trader = createUnit(state, 0, 'trader', 3, 4);
    holds(state, 0, 'theMerchantCommonwealth');
    expect(applyCommand(state, send(0, trader.id, home.id, inland.id)).ok).toBe(true);

    // Before the term: the road is there and the house is not.
    expect(cardHappiness(state, 0).some((line) => line.source.includes('Commonwealth'))).toBe(
      false,
    );
    state.turn += TERM;
    // A post ripens at exactly the moment the first term runs out, so a card
    // that wants both the house and a live road wants the road renewed — which
    // is what auto-resend does for a player and what this does for the test.
    trader.trade!.expiresTurn = state.turn + TERM;
    const paid = cardHappiness(state, 0).filter((line) => line.source.includes('Commonwealth'));
    expect(paid).toHaveLength(1);
    // One town, not two: the origin holds a post but no route ends there.
    expect(paid[0]!.amount).toBe(2);
  });
});

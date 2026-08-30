/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — religion, played
 * by a real empire.
 *
 * Both tests here run `playFaithful(90)`: a scripted empire that settles a few
 * towns, researches toward Divination first, puts a shrine in every town, and
 * then spends faith on augurs the moment the pool covers one. Ninety turns is
 * the measurement, not an implementation detail — "the first augur lands on turn
 * N" is a sentence about an opening, and the determinism claim is only worth
 * making over a log that actually *contains* a purchase, a rite and a god.
 *
 * `religion.test.ts` keeps everything a two-city bench answers, which is nearly
 * all of the concern: the table's integrity, the purchase's validation matrix
 * and price ladder, the draft's without-replacement dealing, every rite carried
 * end to end into the ledger it touches, the timed effects' expiry and broom,
 * and the panel's previews. What is here is only what needs a *game*.
 */
import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { foundingErrorAt } from '../../src/sim/cities';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { mapRange, tileHex } from '../../src/sim/map';
import { availableRites, consecrateError, isAugur, riteError } from '../../src/sim/religion';
import { type PurchasableItem, explainPurchaseCost } from '../../src/sim/purchase';
import { type GameState, SCHEMA_VERSION, playerById } from '../../src/sim/state';
import { availableTechs, buildError } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';

/** The one thing faith sells. Named once, so the shape reads out of the way. */
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
/** The other thing faith sells, since religion v2. */
const PROPHET: PurchasableItem = { kind: 'unit', id: 'prophet' };


/**
 * A scripted **faithful** empire, and the pacing measurement Entry XXVIII's open
 * numbers rest on.
 *
 * `playWarband`'s shape (`buildSinks.test.ts`) with a different appetite: settle
 * a few towns, research toward Divination first, put a shrine in every town, and
 * then spend faith on augurs the moment the pool covers one — a rite when there
 * is a use for one, a god when a slot is open. Deliberately conservative and
 * deliberately scripted, because the number it produces ("the first augur lands
 * on turn N") is only worth anything if the same script always produces it.
 *
 * Every act is a **command**, which is what lets the determinism test above
 * replay the whole thing: the harness never reaches into the state.
 */
function playFaithful(maxTurns: number): {
  game: ReturnType<typeof createGame>;
  firstAugurTurn: number | null;
  ritesPerformed: number;
  augursBought: number;
} {
  const g = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const CITY_TARGET = 3;
  // The road to the augur, cheapest-first inside the prerequisites the tree
  // already enforces: this is a *pious* opening, not an optimal one.
  const ROAD = ['husbandry', 'divination', 'earthenware', 'letters', 'stonecraft', 'calendar'];
  let firstAugurTurn: number | null = null;
  let ritesPerformed = 0;
  let augursBought = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = playerById(g.state, 0)!;

    // Answer whatever is owed, always option 0 — this measures the price, not
    // the choices.
    if (player.pantheon.pending !== undefined) {
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingOrder !== undefined) {
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingGovernment !== undefined) {
      dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    }
    if (player.statecraft.pendingDoctrine !== undefined) {
      dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.pendingDiscovery !== undefined) {
      dispatch(g, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.researching === null) {
      const next =
        ROAD.find((id) => !player.techsResearched.includes(id as never)) ??
        [...availableTechs(g.state, 0)].sort(
          (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
        )[0];
      if (next && dispatch(g, { type: 'chooseResearch', playerId: 0, techId: next } as Command).ok) {
        // taken
      } else {
        const fallback = [...availableTechs(g.state, 0)][0];
        if (fallback) {
          dispatch(g, { type: 'chooseResearch', playerId: 0, techId: fallback } as Command);
        }
      }
    }

    // Settle.
    for (const unit of [...g.state.units]) {
      if (!unitDef(unit.type).foundsCity) continue;
      if (g.state.cities.length >= CITY_TARGET) continue;
      if (dispatch(g, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
      if (unit.path && unit.path.length > 0) continue;
      const target = nearestSite(g.state, unit.col, unit.row);
      if (target) dispatch(g, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
    }

    // Buy an augur whenever the pool covers one, in the biggest town.
    const home = g.state.cities.find((city) => city.ownerId === 0);
    const price = home ? explainPurchaseCost(g.state, 0, home.id, AUGUR, 'faith') : null;
    if (price && home && player.faithPool >= price.total) {
      if (
        dispatch(g, {
          type: 'purchaseItem',
          playerId: 0,
          cityId: home.id,
          item: { kind: 'unit', id: 'augur' },
          currency: 'faith',
        } as Command).ok
      ) {
        augursBought += 1;
        if (firstAugurTurn === null) firstAugurTurn = g.state.turn;
      }
    }

    // Spend the augurs, in the order a player weighing the two would: **one
    // rite first** — an augur is worth more having done something than having
    // done nothing — and then the whole of what is left on a god, while a slot
    // is open. An augur with no slot to fill keeps working through its charges.
    //
    // Since 2026-08-28 that is a **two-turn** plan rather than a same-turn one:
    // a rite is the augur's whole turn (`augurHasActed`) and consecration is
    // held to the same sentence, so the god is asked for on a *later* pass, off
    // an augur that has already done a day's work. Asked first for that reason
    // — after the rite below the piece has no day left — and gated on a spent
    // charge so the "one rite first" reading survives the reordering.
    const charges = unitDef('augur').charges ?? 0;
    for (const unit of [...g.state.units]) {
      if (unit.ownerId !== 0 || !isAugur(unit)) continue;
      if ((unit.chargesLeft ?? charges) < charges && consecrateError(g.state, 0, unit.id) === null) {
        if (dispatch(g, { type: 'consecrate', playerId: 0, unitId: unit.id } as Command).ok) continue;
      }
      for (const rite of availableRites(g.state, 0)) {
        if (riteError(g.state, 0, unit.id, rite) !== null) continue;
        if (dispatch(g, { type: 'performRite', playerId: 0, unitId: unit.id, rite } as Command).ok) {
          ritesPerformed += 1;
        }
        break;
      }
    }

    // Keep every queue full: a shrine first, then whatever the town can make.
    for (const city of g.state.cities) {
      if (city.queue.length > 0) continue;
      const queue: { kind: string; id: string }[] = [];
      if (!city.buildings.includes('shrine') && buildError(g.state, 0, 'building', 'shrine') === null) {
        queue.push({ kind: 'building', id: 'shrine' });
      } else if (
        !city.buildings.includes('monument') &&
        buildError(g.state, 0, 'building', 'monument') === null
      ) {
        queue.push({ kind: 'building', id: 'monument' });
      } else if (g.state.cities.length < CITY_TARGET && city.population >= unitDef('settler').minCityPop) {
        queue.push({ kind: 'unit', id: 'settler' });
      } else {
        queue.push({ kind: 'unit', id: 'warrior' });
      }
      dispatch(g, { type: 'setCityProduction', playerId: 0, cityId: city.id, queue } as Command);
    }

    dispatch(g, { type: 'endTurn', playerId: 0 });
  }
  return { game: g, firstAugurTurn, ritesPerformed, augursBought };
}

/** The nearest tile a city could legally stand on, or null. `tech.test.ts`'s. */
function nearestSite(
  state: GameState,
  col: number,
  row: number,
): { col: number; row: number } | null {
  const from = state.map.tiles.find((tile) => tile.col === col && tile.row === row);
  if (!from) return null;
  let best: { col: number; row: number } | null = null;
  let bestDistance = Infinity;
  for (const tile of mapRange(state.map, tileHex(from), 8)) {
    if (foundingErrorAt(state, 0, tile) !== null) continue;
    const distance = Math.abs(tile.col - col) + Math.abs(tile.row - row);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { col: tile.col, row: tile.row };
    }
  }
  return best;
}

describe('determinism', () => {
  it('round-trips a schema 36 save with augurs, rites and beliefs in the log', () => {
    expect(SCHEMA_VERSION).toBe(36);
    const played = playFaithful(90);
    // The empire actually got there: an augur was bought out of faith it earned,
    // rites were performed, and a god was named. A determinism test over a log
    // with none of those in it would be a determinism test of nothing.
    expect(played.firstAugurTurn).not.toBeNull();
    expect(played.ritesPerformed).toBeGreaterThan(0);
    expect(playerById(played.game.state, 0)!.pantheon.beliefs.length).toBeGreaterThan(0);
    // The whole claim: `{config, log}` replays byte for byte.
    const replayed = replay(played.game.config, played.game.log);
    expect(snapshotState(replayed)).toEqual(snapshotState(played.game.state));
  });

});

/**
 * **Two empires, two faiths, and a bomb** — the religion-v2 half of the
 * determinism claim.
 *
 * `playFaithful`'s shape with two seats and a longer horizon, because the thing
 * being replayed is the *whole* subsystem: a generated name (which spends the
 * generator), a follower draft, a holy site on the board, a proclamation with an
 * absolute expiry, and a hundred turns of the tide converting citizens one at a
 * time. Every act is a command, so `{config, log}` is the whole of it.
 */
function playTwoFaiths(maxTurns: number): {
  game: ReturnType<typeof createGame>;
  religionsFounded: number;
  bombs: number;
  converts: number;
} {
  const g = createGame({
    seed: 8181,
    sizeName: 'standard',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const CITY_TARGET = 3;
  const ROAD = [
    'husbandry',
    'divination',
    'earthenware',
    'stonecraft',
    'theHighTemple',
    'letters',
    'calendar',
  ];
  let bombs = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    for (const seat of [0, 1]) {
      const player = playerById(g.state, seat)!;
      if (player.pantheon.pending !== undefined) {
        dispatch(g, { type: 'chooseBelief', playerId: seat, optionIndex: 0 } as Command);
      }
      if (player.statecraft.pendingOrder !== undefined) {
        dispatch(g, { type: 'chooseOrder', playerId: seat, optionIndex: 0 } as Command);
      }
      if (player.statecraft.pendingGovernment !== undefined) {
        dispatch(g, { type: 'adoptGovernment', playerId: seat, choiceIndex: 0 } as Command);
      }
      if (player.statecraft.pendingDoctrine !== undefined) {
        dispatch(g, { type: 'chooseDoctrine', playerId: seat, optionIndex: 0 } as Command);
      }
      if (player.pendingDiscovery !== undefined) {
        dispatch(g, { type: 'chooseDiscovery', playerId: seat, optionIndex: 0 } as Command);
      }
      if (player.greatPersonOffer !== undefined) {
        dispatch(g, { type: 'chooseGreatPerson', playerId: seat, optionIndex: 0 } as Command);
      }
      if (player.researching === null) {
        const next =
          ROAD.find((id) => !player.techsResearched.includes(id as never)) ??
          [...availableTechs(g.state, seat)].sort(
            (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
          )[0];
        if (
          !next ||
          !dispatch(g, { type: 'chooseResearch', playerId: seat, techId: next } as Command).ok
        ) {
          const fallback = [...availableTechs(g.state, seat)][0];
          if (fallback) {
            dispatch(g, { type: 'chooseResearch', playerId: seat, techId: fallback } as Command);
          }
        }
      }

      const mine = g.state.cities.filter((city) => city.ownerId === seat);
      for (const unit of [...g.state.units]) {
        if (unit.ownerId !== seat || !unitDef(unit.type).foundsCity) continue;
        if (mine.length >= CITY_TARGET) continue;
        if (dispatch(g, { type: 'foundCity', playerId: seat, settlerUnitId: unit.id }).ok) continue;
        if (unit.path && unit.path.length > 0) continue;
        const target = nearestSite(g.state, unit.col, unit.row);
        if (target) dispatch(g, { type: 'moveUnit', playerId: seat, unitId: unit.id, target });
      }

      // The prophet first, then the augur: a religion is worth more than a rite,
      // and a seat that saved for one should not spend the faith on three.
      const home = g.state.cities.find((city) => city.ownerId === seat);
      if (home) {
        for (const item of [PROPHET, AUGUR]) {
          const price = explainPurchaseCost(g.state, seat, home.id, item, 'faith');
          // Save for the second prophet rather than spend the faith on augurs:
          // since founding consumes the founder (2026-08-29), the bomb this
          // test is about needs a prophet of its own, and a policy that bought
          // an augur every time the prophet was out of reach never had one.
          if (!price || player.faithPool < price.total) {
            if (item === PROPHET && player.prophetsPurchased < 2) break;
            continue;
          }
          dispatch(g, {
            type: 'purchaseItem',
            playerId: seat,
            cityId: home.id,
            item,
            currency: 'faith',
          } as Command);
          break;
        }
      }

      // Spend the prophets: the site first (which founds), and the bomb after.
      // Only the *founding* site is planted here — since 2026-08-29 founding
      // spends the whole prophet and a later site costs a charge, so a policy
      // that planted with every prophet would spend the second one on stones
      // and never throw the bomb this test is about.
      const hasFaith = g.state.religions.some((religion) => religion.founderId === seat);
      for (const unit of [...g.state.units]) {
        if (unit.ownerId !== seat || unitDef(unit.type).prophesies !== true) continue;
        if (
          !hasFaith &&
          dispatch(g, { type: 'plantHolySite', playerId: seat, unitId: unit.id } as Command).ok
        ) {
          continue;
        }
        if (dispatch(g, { type: 'proclaim', playerId: seat, unitId: unit.id } as Command).ok) {
          bombs += 1;
          continue;
        }
        // Nowhere to plant: walk one hex and try again next turn.
        const target = nearestSite(g.state, unit.col, unit.row);
        if (target) dispatch(g, { type: 'moveUnit', playerId: seat, unitId: unit.id, target });
      }

      const charges = unitDef('augur').charges ?? 0;
      for (const unit of [...g.state.units]) {
        if (unit.ownerId !== seat || !isAugur(unit)) continue;
        if (
          (unit.chargesLeft ?? charges) < charges &&
          consecrateError(g.state, seat, unit.id) === null
        ) {
          if (dispatch(g, { type: 'consecrate', playerId: seat, unitId: unit.id } as Command).ok) {
            continue;
          }
        }
        for (const rite of availableRites(g.state, seat)) {
          if (riteError(g.state, seat, unit.id, rite) !== null) continue;
          dispatch(g, { type: 'performRite', playerId: seat, unitId: unit.id, rite } as Command);
          break;
        }
      }

      for (const city of g.state.cities) {
        if (city.ownerId !== seat || city.queue.length > 0) continue;
        const queue: { kind: string; id: string }[] = [];
        if (
          !city.buildings.includes('shrine') &&
          buildError(g.state, seat, 'building', 'shrine') === null
        ) {
          queue.push({ kind: 'building', id: 'shrine' });
        } else if (
          !city.buildings.includes('temple') &&
          buildError(g.state, seat, 'building', 'temple') === null
        ) {
          queue.push({ kind: 'building', id: 'temple' });
        } else if (
          g.state.cities.filter((town) => town.ownerId === seat).length < CITY_TARGET &&
          city.population >= unitDef('settler').minCityPop
        ) {
          queue.push({ kind: 'unit', id: 'settler' });
        } else {
          queue.push({ kind: 'unit', id: 'warrior' });
        }
        dispatch(g, { type: 'setCityProduction', playerId: seat, cityId: city.id, queue } as Command);
      }

      dispatch(g, { type: 'endTurn', playerId: seat });
    }
  }
  let converts = 0;
  for (const city of g.state.cities) {
    for (const count of Object.values(city.followers ?? {})) converts += count ?? 0;
  }
  return { game: g, religionsFounded: g.state.religions.length, bombs, converts };
}

describe('two faiths and a bomb', () => {
  it('replays byte for byte over a game with religions, sites and a proclamation', () => {
    const played = playTwoFaiths(170);
    // eslint-disable-next-line no-console
    console.log(
      `[religion v2] ${played.religionsFounded} religions founded, ${played.bombs} ` +
        `proclamations made, ${played.converts} citizens converted in 170 turns`,
    );
    // The log actually contains the subsystem. A determinism test over a game
    // where nobody founded anything would be a determinism test of nothing.
    expect(played.religionsFounded).toBe(2);
    expect(played.bombs).toBeGreaterThan(0);
    expect(played.converts).toBeGreaterThan(0);
    const replayed = replay(played.game.config, played.game.log);
    expect(snapshotState(replayed)).toEqual(snapshotState(played.game.state));
  });
});

describe('what an augur costs a real empire', () => {
  it('lands the first one in the window the design predicted', () => {
    const played = playFaithful(90);
    // eslint-disable-next-line no-console
    console.log(
      `[religion] first augur on turn ${String(played.firstAugurTurn)} — ` +
        `${played.augursBought} bought, ${played.ritesPerformed} rites performed in 90 turns`,
    );
    expect(played.firstAugurTurn).not.toBeNull();
    // A **band**, not a memorised number, for `statecraftPacing.test.ts`'s
    // reason: a curve that got cheaper is as much a regression as one that got
    // dearer. `docs/religion.md` predicts "the first augur ~turn 15–20 after
    // Divination"; this pious opening reaches Divination around turn 10, so the
    // window is generous on both sides and would catch a retune that made faith
    // free or made it unreachable.
    expect(played.firstAugurTurn!).toBeGreaterThan(10);
    expect(played.firstAugurTurn!).toBeLessThan(75);
    // And the agent is actually *spent* rather than accumulated: the whole
    // anti-spam structure is that an augur is three rites or one god.
    expect(played.ritesPerformed + playerById(played.game.state, 0)!.pantheon.beliefs.length)
      .toBeGreaterThan(0);
  });
});

/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — religion, played
 * by a real empire.
 *
 * The scripts here play a real opening: an empire that settles a few towns,
 * beelines the prerequisite closure of The High Temple, puts a shrine in every
 * town, and then spends faith on prophets and augurs the moment the pool covers
 * one. The horizon is the measurement, not an implementation detail — the
 * determinism claim is only worth making over a log that actually *contains* a
 * purchase, a rite and a god, so each test asserts that its own game reached
 * them before it asserts that the replay is byte-identical.
 *
 * **The horizons doubled on 2026-09-02**, with the column-formula costs: 90 →
 * **200** for the one-seat game and 170 → **340** for the two-seat one. Nothing
 * about faith moved — the beeline did. `closureOf('theHighTemple')` is seven
 * nodes now and they are priced off their chart columns, so the road to the
 * first prophet costs 1244 beakers where it cost 249, and a ninety-turn game no
 * longer reaches the subsystem it is meant to be testing. That is exactly the
 * failure mode the beeline was derived rather than written down for.
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
import { TECH_IDS,
  type TechId, techDef } from '../../src/sim/techData';
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

/**
 * The prereq closure of a node, cheapest-first — the beeline the scripts walk.
 * Derived rather than listed (the promise the old hand list kept breaking every
 * time the tree was re-cut): a pruned id can no longer strand a script on a
 * refused chooseResearch.
 */
function closureOf(target: TechId): TechId[] {
  const seen = new Set<TechId>();
  const walk = (id: TechId): void => {
    if (seen.has(id)) return;
    for (const parent of techDef(id).prereqs ?? []) walk(parent as TechId);
    seen.add(id);
  };
  walk(target);
  return [...seen];
}
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
  const ROAD: TechId[] = closureOf('theHighTemple' as TechId);
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

    // Spend the augurs. **One charge, one deed** since Entry LVIII, so the
    // "one rite first, then a god with what is left" policy this script used to
    // run is no longer a thing a single piece can do: an augur is a rite *or* a
    // god, and the price ladder is the whole of the question.
    //
    // The script therefore **alternates**, keeping the gods one behind the
    // rites — the order a player weighing the two would take them in, and the
    // one policy that guarantees the log this test replays contains both. The
    // preference is a preference, not a rule: an augur that cannot do the
    // preferred thing does the other rather than standing idle, which is what
    // keeps a full pantheon from stalling the script.
    for (const unit of [...g.state.units]) {
      if (unit.ownerId !== 0 || !isAugur(unit)) continue;
      if (
        player.pantheon.beliefs.length < ritesPerformed &&
        consecrateError(g.state, 0, unit.id) === null &&
        dispatch(g, { type: 'consecrate', playerId: 0, unitId: unit.id } as Command).ok
      ) {
        continue;
      }
      let acted = false;
      for (const rite of availableRites(g.state, 0)) {
        if (riteError(g.state, 0, unit.id, rite) !== null) continue;
        if (dispatch(g, { type: 'performRite', playerId: 0, unitId: unit.id, rite } as Command).ok) {
          ritesPerformed += 1;
          acted = true;
        }
        break;
      }
      if (acted) continue;
      if (consecrateError(g.state, 0, unit.id) === null) {
        dispatch(g, { type: 'consecrate', playerId: 0, unitId: unit.id } as Command);
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
  it('round-trips a schema 40 save with augurs, rites and beliefs in the log', () => {
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
    // v42: the faith rework of Entry LVIII — one-charge agents, the founding's
    // double draft and The Holy Office's tenants move every replay with a
    // prophet or an augur in it.
    // v44: the age-1 restoration and the deepened chains — Calendar is a node
    // again, Currency and Irrigation trade places, and Æra III/IV are re-chained,
    // so a v43 log aims research at a tree this build does not have.
    // v45: the endgame of Entry LVIII — the Magnum Opus, the three bead-paying
    // great works, the Long Count's die and Alchemy's closing bead. A v44 log
    // reaches a winner it never reached, and spends rolls it never spent.
    // v46: the card pools of Entry LVIII — nineteen new Orders, a Doctrine, two
    // beliefs and a sixth consecration join the bags a draft draws from, and The
    // Laureate's once-per-game great person becomes a renown trickle. A v45 log
    // names indices of hands this build does not deal.
    // v47: the timeline reshape and the column-formula costs — seventeen
    // prerequisite edges moved so every column earns its width, and every cost
    // is rewritten off the node's own column. A v46 log aims research at a tree
    // this build does not have, and pays prices it never paid.
    // v48: the user's balance pass — the authored Order deepening ladder, the
    // Order and Doctrine retunes, and the reworked luxury signatures. A v47 log
    // drafts from a deck this build does not deal, and deepens by numbers it
    // does not carry.
    // v49: the cost ladder re-anchored at the first *paid* tier — the root is
    // not a tier. Column 0 holds Agriculture alone and Agriculture is granted,
    // so every column now takes the price the column to its left used to carry
    // (Fletching 13 where it was 30) and a v48 log pays the wrong beakers from
    // the first technology anybody researches.
    // v50: tree revision 4 — the user's hand-drawn tree transcribed. Fourteen
    // nodes renamed with their ids kept, three ids cut (`ancestorRites`,
    // `chivalry`, `fortification`) and three added, almost every prerequisite
    // re-hung, twelve columns and a truncated cost ladder — and, beside it, the
    // one-unit-a-turn purchase rule widened to one *per class*.
    // v55 (2026-09-03, the playtest notes): two table deletions — the Standing
    // Stones improvement and the Terraces — so a v54 log that built either has
    // no row to replay into.
    // v57 (war & diplomacy, phase two): deals exist. Two registers, four
    // verbs and a widened `proposePeace`, a luxury that may be lent across a
    // table, and one technology that hands over a verb it did not — so a v56
    // log knows no deal commands and replays into a different world.
    expect(SCHEMA_VERSION).toBe(66);
    const played = playFaithful(200);
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
  // Re-derived for the tree pass of 2026-08-30: the beeline is the prereq
  // closure of The High Temple in display order, so a re-cut chain cannot
  // silently strand the script on a refused chooseResearch again.
  const ROAD: TechId[] = closureOf('theHighTemple' as TechId);
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
          // founding consumes the founder, so the bomb this test is about needs
          // a prophet of its own, and a policy that bought an augur every time
          // the prophet was out of reach never had one.
          //
          // **Unless there is no god yet** (2026-09-02). Saving is only sound
          // once the seat can actually *use* a prophet, and a prophet is useless
          // without a pantheon — `plantHolySite` refuses with "You have no gods
          // to found a religion on". The column-formula costs pushed The High
          // Temple far enough down the game that this seat reached it holding
          // one prophet and never afforded a second, so it saved for ever,
          // never bought an augur, never took a god, and founded nothing in
          // three hundred and forty turns. The policy deadlocked on itself; the
          // clause below is the fix, and it is the same preference the "a god
          // first, here" comment further down already states.
          if (!price || player.faithPool < price.total) {
            if (
              item === PROPHET &&
              player.prophetsPurchased < 2 &&
              player.pantheon.beliefs.length > 0
            ) {
              break;
            }
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

      // Spend the prophets: the founding first, and the bomb after. There is no
      // second site to plant any more (Entry LVIII — one prophet, one deed), so
      // the `hasFaith` gate is now the *rule* rather than a policy: a seat that
      // has founded is refused the ground and proclaims instead.
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
        // Nowhere to plant HERE: walk home. `nearestSite` is a settler's
        // heuristic and marched prophets out of their own territory (where
        // planting refuses) — re-learned on the Entry LVIII re-cut, when the
        // niter re-roll moved the ground enough to expose it. The capital is
        // always owned ground, and the plant is retried before every step, so
        // the first in-territory stop founds.
        const home2 = g.state.cities.find((city) => city.ownerId === seat);
        if (home2 && (unit.col !== home2.col || unit.row !== home2.row)) {
          dispatch(g, {
            type: 'moveUnit',
            playerId: seat,
            unitId: unit.id,
            target: { col: home2.col, row: home2.row },
          });
        }
      }

      // **A god first, here.** This script is about founding, and a religion is
      // founded out of the pantheon — so a seat with an open slot spends its
      // augur on a god and only preaches with what is left over. Under the
      // one-charge rule (Entry LVIII) that is a *choice between pieces* rather
      // than a plan for one, which is exactly why the preference has to be
      // stated: an augur spent on a rite is a god this seat will never have.
      for (const unit of [...g.state.units]) {
        if (unit.ownerId !== seat || !isAugur(unit)) continue;
        if (
          consecrateError(g.state, seat, unit.id) === null &&
          dispatch(g, { type: 'consecrate', playerId: seat, unitId: unit.id } as Command).ok
        ) {
          continue;
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
    const played = playTwoFaiths(340);
    // eslint-disable-next-line no-console
    console.log(
      `[religion v2] ${played.religionsFounded} religions founded, ${played.bombs} ` +
        `proclamations made, ${played.converts} citizens converted in 340 turns`,
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
    const played = playFaithful(200);
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
    // anti-spam structure is that an augur is one rite or one god.
    expect(played.ritesPerformed + playerById(played.game.state, 0)!.pantheon.beliefs.length)
      .toBeGreaterThan(0);
  });
});

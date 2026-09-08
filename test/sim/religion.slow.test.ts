/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — religion, played
 * by a real empire.
 *
 * The scripts here play a real opening: an empire that settles a few towns,
 * beelines the prerequisite closure of The High Temple, puts a shrine in every
 * town, and then banks the faith that comes back out of it. The horizon is the
 * measurement, not an implementation detail — the determinism claim is only
 * worth making over a log that actually *contains* a consecration, a rite and a
 * god, so each test asserts that its own game reached them before it asserts
 * that the replay is byte-identical.
 *
 * **Repaired 2026-09-06, batch C2's debt.** The one-seat script used to buy an
 * augur the moment the pool covered one and spend it on a rite or a god. The
 * augur is **retired** (C2) and the consecration is the faith ladder's (C1), so
 * the script measured nothing at all: a refused purchase every turn, no augur,
 * no rite, no god. What replaced it is the game as it is played now — faith
 * banks, `openFaithLadder` deals the belief hand when the bank crosses a rung,
 * the pick pays for it, and a **rite is a town's verb** any town may say once
 * the tree has taught it (the user, 2026-09-06: "have the rites unlock in the
 * tech tree where they used to be" — no building gates the verb; the Chapel
 * only pays culture on one). See `test/sim/faithLadder.test.ts` for the ladder's own rules
 * and `docs/religion-v2.md` for the shape.
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
import { availableRites, empireRiteError, riteError } from '../../src/sim/religion';
import { type PurchasableItem, explainPurchaseCost } from '../../src/sim/purchase';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { type OrderId, orderDef } from '../../src/sim/statecraftData';
import { type GameState, SCHEMA_VERSION, playerById } from '../../src/sim/state';
import { availableTechs, buildError } from '../../src/sim/tech';
import { TECH_IDS,
  type TechId, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';

/** The thing faith sells, since religion v2 — the augur's row is retired. */
const PROPHET: PurchasableItem = { kind: 'unit', id: 'prophet' };


/**
 * The rite-bonus row — the building whose marker says a rite performed in its
 * town pays culture too (`BuildingDef.ritePays`, the Chapel). Found by its
 * **marker** rather than its name, `src/sim/`'s discipline. It gates nothing:
 * the tree is the rites' only door (the user, 2026-09-06 — C2's door lasted an
 * afternoon). A pious script still wants one in every town, for its faith line
 * and the culture it pays on each rite, so the script prefers the charter that
 * hands it over and queues it wherever it may.
 */
const RITE_HOUSE = BUILDING_IDS.find((id) => (buildingDef(id).ritePays ?? 0) > 0)!;

/** Does this Order hand over the rite-bonus row? */
function opensTheRiteHouse(id: OrderId): boolean {
  for (const effect of orderDef(id).effects ?? []) {
    if (effect.kind !== 'unlocksBuilding') continue;
    if ((buildingDef(effect.building).ritePays ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Which of an offered hand this pious script takes: option 0, as everywhere
 * else — the cadence is measured elsewhere and the choices are not what these
 * tests are about — except the charter that hands over the rite house, which a
 * faithful seat takes whenever the deck shows it.
 */
function orderPick(options: readonly OrderId[]): number {
  const wanted = options.findIndex(opensTheRiteHouse);
  return wanted >= 0 ? wanted : 0;
}


/**
 * A scripted **faithful** empire, and the pacing measurement Entry XXVIII's open
 * numbers rest on.
 *
 * `playWarband`'s shape (`buildSinks.test.ts`) with a different appetite: settle
 * a few towns, research toward Divination first, put a shrine in every town, and
 * then let the faith bank — the ladder deals a god the moment the bank crosses a rung, and a
 * town says a rite whenever it can pay for one. Deliberately conservative and
 * deliberately scripted, because the number it produces ("the first god is
 * consecrated on turn N") is only worth anything if the same script always
 * produces it.
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
  /** The turn the faith ladder's first rung was climbed, or `null`. */
  firstConsecrationTurn: number | null;
  ritesPerformed: number;
  rungsClimbed: number;
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
  let firstConsecrationTurn: number | null = null;
  let ritesPerformed = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = playerById(g.state, 0)!;

    // Answer whatever is owed, always option 0 — this measures the price, not
    // the choices. The belief hand is the **faith ladder's** now (schema 71):
    // it is dealt by the bank rather than by an errand, and the pick is what
    // spends the rung.
    if (player.pantheon.pending !== undefined) {
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingOrder !== undefined) {
      dispatch(g, {
        type: 'chooseOrder',
        playerId: 0,
        optionIndex: orderPick(player.statecraft.pendingOrder.options),
      } as Command);
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

    // **The consecration is not an errand any more** — nothing is bought for
    // it. The bank fills, `openFaithLadder` deals the belief hand the moment it
    // crosses the next rung, and the `chooseBelief` at the top of the loop pays
    // for it. The **prophet** is what faith still sells, and this pious seat
    // buys one whenever the bank covers it.
    const home = g.state.cities.find((city) => city.ownerId === 0);
    const price = home ? explainPurchaseCost(g.state, 0, home.id, PROPHET, 'faith') : null;
    if (home && price && player.faithPool >= price.total) {
      dispatch(g, {
        type: 'purchaseItem',
        playerId: 0,
        cityId: home.id,
        item: PROPHET,
        currency: 'faith',
      } as Command);
    }

    // **A rite over the whole realm, then the ground.** A prophet has two
    // charges and `plantHolySite` spends the *piece*, so the order matters: the
    // realm-wide rite takes one charge and the founding takes what is left.
    // This is the one rite a scripted seat can be *sure* of — `empireRite`
    // needs no Chapel anywhere, and the Chapel is behind an uncommon wildcard
    // Order (see the note on the determinism test).
    for (const unit of [...g.state.units]) {
      if (unit.ownerId !== 0 || unitDef(unit.type).prophesies !== true) continue;
      for (const rite of availableRites(g.state, 0)) {
        if (empireRiteError(g.state, 0, unit.id, rite) !== null) continue;
        if (dispatch(g, { type: 'empireRite', playerId: 0, unitId: unit.id, rite } as Command).ok) {
          ritesPerformed += 1;
        }
        break;
      }
      dispatch(g, { type: 'plantHolySite', playerId: 0, unitId: unit.id } as Command);
    }

    // **And a rite is a town's verb** (schema 74): the seat says one in
    // whichever of its towns can pay, one town a turn, and the ten turns of
    // the blessing are its own seal. No building gates it — the tree taught
    // the rite, the town says it (the door C2 first built is gone, 2026-09-06).
    for (const city of g.state.cities) {
      if (city.ownerId !== 0) continue;
      let said = false;
      for (const rite of availableRites(g.state, 0)) {
        if (riteError(g.state, 0, city.id, rite) !== null) continue;
        if (dispatch(g, { type: 'performRite', playerId: 0, cityId: city.id, rite } as Command).ok) {
          ritesPerformed += 1;
          said = true;
        }
        break;
      }
      if (said) break;
    }

    // Keep every queue full: a shrine first, then the rite house if the deck has
    // handed it over, then whatever the town can make.
    for (const city of g.state.cities) {
      if (city.queue.length > 0) continue;
      const queue: { kind: string; id: string }[] = [];
      if (!city.buildings.includes('shrine') && buildError(g.state, 0, 'building', 'shrine') === null) {
        queue.push({ kind: 'building', id: 'shrine' });
      } else if (
        !city.buildings.includes(RITE_HOUSE) &&
        buildError(g.state, 0, 'building', RITE_HOUSE) === null
      ) {
        queue.push({ kind: 'building', id: RITE_HOUSE });
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
    if (firstConsecrationTurn === null && playerById(g.state, 0)!.pantheon.rungs > 0) {
      firstConsecrationTurn = g.state.turn;
    }
  }
  return {
    game: g,
    firstConsecrationTurn,
    ritesPerformed,
    rungsClimbed: playerById(g.state, 0)!.pantheon.rungs,
  };
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
  it('round-trips a save with a consecration, a rite and a belief in the log', () => {
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
    // v68 (2026-09-05, the cards pass): Government IV and V become Order pools
    // of their own and twenty-seven rows join them, so a v67 log's `chooseOrder`
    // names indices into hands this build does not deal.
    // **Caught up 2026-09-06** (a repair, not a re-aim): this pin had stood at
    // 70 since before C1 and the file simply never ran green long enough for
    // anybody to move it. What landed on top of it, in order — v71 the faith
    // ladder and the reroll (a consecration is dealt by the bank, not walked
    // over by an augur), v72–v74 the rites becoming a town's verb, v75 exact yields (nothing rounds inside a fold, so every
    // pool a replay banks is a different number), v76 the tree's gifts (ten
    // nodes hand over different rows and a Machinery army marches further on
    // the same paving). A v70 log replays into a different world at every one
    // of those, which is what a schema number is for.
    expect(SCHEMA_VERSION).toBe(89);
    const played = playFaithful(200);
    // The empire actually got there: the faith ladder dealt a god and the bank
    // paid for it, a town said a rite, and a belief is held. A determinism test
    // over a log with none of those in it would be a determinism test of
    // nothing.
    expect(played.firstConsecrationTurn).not.toBeNull();
    expect(played.rungsClimbed).toBeGreaterThan(0);
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

      // **The prophet is the only thing faith buys** since C2 retired the
      // augur; the gods this seat needs before it can found anything come off
      // the faith ladder, which is dealt by the bank at the top of the loop.
      const home = g.state.cities.find((city) => city.ownerId === seat);
      if (home) {
        for (const item of [PROPHET]) {
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

      // **A god first, here** — and the ladder is what sees to it. This script
      // is about founding, and a religion is founded out of the pantheon, so
      // the seat that has not banked a rung yet has nothing to found with. The
      // bank is left alone above for exactly that reason, and **a seat that has
      // not founded says no rite** (2026-09-06): now that the tree is the rites'
      // only door every town may say one, and a script that spent its faith on
      // blessings never saved the prophet's price — the two-faiths game founded
      // nothing. After the founding, what is left over pays for a rite, in
      // whichever town can.
      //
      // **And the rite comes out of the surplus, never out of the prophet's
      // price** (re-aimed 2026-09-06, `docs/flags.md` item y). The saving clause
      // above could never actually save: every turn's leftover faith went into a
      // rite, so the pool was empty again by the top of the next turn. It did not
      // show while the faith economy ran ahead of the prophet's ladder — the age
      // band made shrines and temples dearer, their faith arrives later, and this
      // seat reached turn three hundred and forty holding fourteen faith and one
      // prophet. No second prophet is no proclamation, and a determinism test
      // over a game with no proclamation in it is a determinism test of nothing.
      // The purchase above runs before this loop, so a pool that reaches the
      // price is spent on the prophet first and the rites resume after.
      const saving = home ? explainPurchaseCost(g.state, seat, home.id, PROPHET, 'faith') : null;
      const keepSaving =
        saving !== null && player.prophetsPurchased < 2 && player.faithPool < saving.total;
      for (const city of g.state.cities) {
        if (!hasFaith || keepSaving) break;
        if (city.ownerId !== seat) continue;
        for (const rite of availableRites(g.state, seat)) {
          if (riteError(g.state, seat, city.id, rite) !== null) continue;
          dispatch(g, { type: 'performRite', playerId: seat, cityId: city.id, rite } as Command);
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

describe('what a god costs a real empire', () => {
  it('lands the first consecration in the window the design predicted', () => {
    const played = playFaithful(200);
    // eslint-disable-next-line no-console
    console.log(
      `[religion] first consecration on turn ${String(played.firstConsecrationTurn)} — ` +
        `${played.rungsClimbed} rungs climbed, ${played.ritesPerformed} rites performed in 200 turns`,
    );
    expect(played.firstConsecrationTurn).not.toBeNull();
    // A **band**, not a memorised number, for `statecraftPacing.test.ts`'s
    // reason: a curve that got cheaper is as much a regression as one that got
    // dearer. `docs/religion-v2.md` prices the ladder's first rung at forty
    // faith and this pious opening reaches Divination — which is what opens the
    // first pantheon slot — around turn ten, so the window is generous on both
    // sides and would catch a retune that made faith free or made it
    // unreachable.
    //
    // **Re-aimed 2026-09-06** with the same window the augur's purchase had.
    // The two prices are deliberately the same number (the ladder "wears the
    // augur's old price ladder" — `faithLadder.test.ts`), so what moved is the
    // errand and not the arithmetic, and the band did not have to move with it.
    expect(played.firstConsecrationTurn!).toBeGreaterThan(10);
    expect(played.firstConsecrationTurn!).toBeLessThan(75);
    // And the bank is actually *spent* rather than hoarded: a rung climbed is a
    // god held, and the ladder is what turns one into the other.
    expect(playerById(played.game.state, 0)!.pantheon.beliefs.length)
      .toBeGreaterThanOrEqual(played.rungsClimbed);
  });
});

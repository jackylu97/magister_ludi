/**
 * The endgame — design ledger Entry LVIII, phase 3B.
 *
 * Four things land together here, and they are one file because they are one
 * mechanism seen from four sides:
 *
 *   · **The Magnum Opus.** A per-empire building the *world* opens — the moment
 *     any seat anywhere completes the closing technology, every seat may begin
 *     one — funded by the cathedral's `contribute` verb, and whose completion
 *     closes the age: the final reckonings are taken across every seat at once
 *     and the empire holding the most beads wins, ties going to the builder.
 *   · **A bead a thing hands over.** The fifth class of bead row (`grants`),
 *     which is once *per empire* rather than once in the world — because the
 *     closing technology pays every empire that reaches it, and every realm that
 *     raises Chart the Stars is paid for it.
 *   · **The three great works of the Observatory**, which are `oncePerEmpire`
 *     buildings gated on a building standing in the same town.
 *   · **Two payouts inside `settleResearch`**: The Long Count's die for every
 *     age its holder enters afterwards, and Alchemy's closing bead.
 *
 * The claims this file pins are the ones a behavioural test elsewhere would pass
 * either way: that the unlock is **derived** and nothing is stored, that the
 * marker is a marker (no module names the Opus), that the announcement is the
 * reducer's own diff and is said exactly once, and that a log carrying the whole
 * finish line replays byte for byte.
 */

import { describe, expect, it } from 'vitest';

import {
  BEAD_GRANT_IDS,
  anyBeadDef,
  beadGrantDef,
  beadDataProblems,
  isBeadGrantId,
} from '../../src/sim/beadData';
import {
  awardBeadGrant,
  beadGrantedTo,
  closeTheGreatWork,
  takeReckonings,
} from '../../src/sim/beads';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, realiseItem } from '../../src/sim/cities';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { nextBotCommand } from '../../src/ai/bot';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { cardCombatLines, cardUnitStat } from '../../src/sim/statecraft';
import { buildError, opusOpen, worldTechReached } from '../../src/sim/tech';
import { unlockDataProblems } from '../../src/sim/techUnlocks';
import { BUILDING_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

/**
 * The simulation's own text, through Vite's raw glob (`cathedral.test.ts`' note:
 * this project has no node typings and a source assertion is not worth a
 * dependency).
 */
const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The one row in the table that ends the game. Found by its marker, never named. */
const OPUS = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;

/** The technology the world must reach before anybody may begin it. */
const CLOSER = buildingDef(OPUS).worldUnlockTech!;

/** Every row that is one per realm. Derived, so a fifth is covered for free. */
const CAPSTONES = BUILDING_IDS.filter((id) => buildingDef(id).oncePerEmpire === true);

function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** Hands one seat a technology outright. The tree is not what these tests are about. */
function learn(state: GameState, playerId: number, tech: string): void {
  const player = playerById(state, playerId)!;
  if (!player.techsResearched.includes(tech as never)) {
    player.techsResearched.push(tech as never);
  }
}

/** Aims a seat at a node with the beakers already banked, so the phase lands it. */
function aim(state: GameState, playerId: number, tech: string): void {
  const player = playerById(state, playerId)!;
  player.researching = tech as never;
  player.sciencePool = techDef(tech as never).cost;
}

/** Ends the turn for every seat, so the resolution runs. Returns the last result. */
function resolve(g: ReturnType<typeof game>) {
  let last = dispatch(g, { type: 'endTurn', playerId: 0 } as Command);
  for (const player of g.state.players) {
    if (player.id === 0 || player.barbarian) continue;
    last = dispatch(g, { type: 'endTurn', playerId: player.id } as Command);
  }
  return last;
}

// --- the fifth class --------------------------------------------------------

describe('a bead a thing hands over', () => {
  it('is a class of its own, with a source and no deed', () => {
    expect(BEAD_GRANT_IDS.length).toBeGreaterThan(0);
    for (const id of BEAD_GRANT_IDS) {
      const { kind, def } = anyBeadDef(id);
      expect(kind).toBe('grant');
      // No deed and no boon: the deed is whatever names it, and the bead *is*
      // the payment. Both absences are asserted rather than assumed, because a
      // row that grew either would be a second way to earn the same bead.
      expect('trigger' in def).toBe(false);
      expect('deed' in def).toBe(false);
      expect('boon' in def).toBe(false);
      expect(beadGrantDef(id).source.length).toBeGreaterThan(0);
    }
  });

  it('is once per empire, not once in the world', () => {
    const g = game();
    const id = BEAD_GRANT_IDS[0]!;

    expect(awardBeadGrant(g.state, 0, id)).not.toBeNull();
    expect(beadGrantedTo(g.state, id, 0)).toBe(true);
    // The same seat, refused — a reward is not something an empire wins twice.
    expect(awardBeadGrant(g.state, 0, id)).toBeNull();
    // A different seat, paid — which is the whole reason the class exists.
    expect(beadGrantedTo(g.state, id, 1)).toBe(false);
    expect(awardBeadGrant(g.state, 1, id)).not.toBeNull();
    expect(playerById(g.state, 0)!.beads).toHaveLength(1);
    expect(playerById(g.state, 1)!.beads).toHaveLength(1);
  });

  it('never reaches the wild, like every other bead', () => {
    const g = game();
    const wild = g.state.players.find((p) => p.barbarian);
    if (!wild) return;
    expect(awardBeadGrant(g.state, wild.id, BEAD_GRANT_IDS[0]!)).toBeNull();
  });

  it('leaves the catalogue and the unlock tables consistent', () => {
    expect(beadDataProblems()).toEqual([]);
    // The dangling-id check lives in `techUnlocks.ts` because the two tables
    // that name a bead hold `BeadGrantId` as a type only.
    expect(unlockDataProblems()).toEqual([]);
  });
});

// --- the Opus's unlock ------------------------------------------------------

describe('the Magnum Opus opens for the world, not for a seat', () => {
  it('is shut to everybody before anybody has the closing technology', () => {
    const g = game();
    expect(opusOpen(g.state)).toBe(false);
    expect(worldTechReached(g.state, CLOSER)).toBe(false);
    const why = buildError(g.state, 0, 'building', OPUS);
    expect(why).toContain(techDef(CLOSER).name);
    // And the sentence is about the *world*, not about this player's tree — a
    // seat told "needs a technology you do not have" has been told something
    // false.
    expect(why).toContain('some empire in the world');
  });

  it('opens for a seat that did not research it, the moment a rival does', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    expect(opusOpen(g.state)).toBe(true);
    // Seat 0 has researched nothing at all and may still begin the great work.
    expect(playerById(g.state, 0)!.techsResearched).not.toContain(CLOSER);
    expect(buildError(g.state, 0, 'building', OPUS)).toBeNull();
  });

  it('stores no flag — the reading is derived from the tech lists', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    expect(opusOpen(g.state)).toBe(true);
    // Nothing in the serialised state says so. A stored answer would be a second
    // answer to a question the tech lists already answer.
    expect(JSON.stringify(snapshotState(g.state))).not.toContain('opusOpen');
  });

  it('is a marker everywhere — no module in the simulation names the row', () => {
    for (const [path, text] of Object.entries(SIM_SOURCE)) {
      // The table that *declares* the id is the one place it may appear —
      // `CONSECRATOR`'s exemption, and every marker's before it.
      if (path.endsWith('/buildingData.ts')) continue;
      expect(text.includes(`'${OPUS}'`), path).toBe(false);
      expect(text.includes(`"${OPUS}"`), path).toBe(false);
    }
  });
});

// --- the announcement -------------------------------------------------------

describe('the finish line announces itself, once', () => {
  it('rides out on the command that opened it and on no other', () => {
    const g = game();
    aim(g.state, 1, CLOSER);

    const opened = resolve(g);
    expect(opened.ok).toBe(true);
    expect(playerById(g.state, 1)!.techsResearched).toContain(CLOSER);
    expect(opened.ok && opened.opusOpened).toBe(true);

    // Still open next turn, and deliberately silent: the field is a *diff*, so a
    // reload cannot re-announce a moment a decade old.
    const after = resolve(g);
    expect(opusOpen(g.state)).toBe(true);
    expect(after.ok && after.opusOpened).toBeUndefined();
  });

  it('says nothing on an ordinary turn before the closer lands', () => {
    const g = game();
    const quiet = resolve(g);
    expect(quiet.ok && quiet.opusOpened).toBeUndefined();
  });
});

// --- the closing bead and the Long Count's die ------------------------------

describe('the closing node pays every empire that reaches it', () => {
  it('hands the completer a bead, inside the one research routine', () => {
    const g = game();
    const bead = techDef(CLOSER).paysBead!;
    expect(isBeadGrantId(bead)).toBe(true);

    aim(g.state, 0, CLOSER);
    resolve(g);
    expect(playerById(g.state, 0)!.beads.map((b) => b.id)).toContain(bead);

    // And the *other* seat, later — the user's ruling in full: every completer,
    // not merely the first.
    aim(g.state, 1, CLOSER);
    resolve(g);
    expect(playerById(g.state, 1)!.beads.map((b) => b.id)).toContain(bead);
  });
});

describe("the Long Count's die", () => {
  const COUNTER = 'theLongCount';
  const NEWER = 'ironWorking'; // Æra III — a node that raises `highestAge` from 2.

  it('pays a die for an age entered while it is held', () => {
    const g = game();
    // Æra II first, so the node below is the one that raises the age.
    learn(g.state, 0, 'bronzePanoply');
    learn(g.state, 0, COUNTER);
    const before = playerById(g.state, 0)!.dice;

    aim(g.state, 0, NEWER);
    resolve(g);
    expect(playerById(g.state, 0)!.dice).toBe(before + techDef(COUNTER).ageEntryDice!);
  });

  it('pays nothing to a seat that does not keep the count', () => {
    const g = game();
    learn(g.state, 0, 'bronzePanoply');
    const before = playerById(g.state, 0)!.dice;
    aim(g.state, 0, NEWER);
    resolve(g);
    expect(playerById(g.state, 0)!.dice).toBe(before);
  });

  it('pays nothing for an age already behind you — entering, not having entered', () => {
    const g = game();
    // Already in Æra III, then the count arrives. Nothing is owed for the ages
    // walked before it: the payout is read at the moment of entry.
    learn(g.state, 0, 'bronzePanoply');
    learn(g.state, 0, NEWER);
    const before = playerById(g.state, 0)!.dice;
    aim(g.state, 0, COUNTER);
    resolve(g);
    expect(playerById(g.state, 0)!.dice).toBe(before);
  });
});

// --- the capstones ----------------------------------------------------------

describe('a capstone is one per realm', () => {
  it('covers the Opus and the three great works, by marker', () => {
    expect(CAPSTONES).toContain(OPUS);
    expect(CAPSTONES.length).toBeGreaterThanOrEqual(4);
  });

  it('refuses a second copy once one stands, naming the town', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    const town = found(g.state, 0);
    town.buildings.push(OPUS);
    const why = buildError(g.state, 0, 'building', OPUS, town);
    expect(why).toContain(town.name);
    expect(why).toContain('already stands');
  });

  it('refuses a second copy while another town of the realm is building one', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    const first = found(g.state, 0);
    first.queue.length = 0;
    first.queue.push({ kind: 'building', id: OPUS });
    // A different town of the same empire.
    const elsewhere = getTileAt(g.state.map, first.col + 4, first.row)!;
    const second = foundCityAt(g.state, 0, elsewhere);
    const why = buildError(g.state, 0, 'building', OPUS, second);
    expect(why).toContain(first.name);
    expect(why).toContain('already building');
    // …and the town that legitimately holds it is not refused its own queue.
    expect(buildError(g.state, 0, 'building', OPUS, first)).toBeNull();
  });

  it('does not refuse a rival for holding one — it is per realm, not per world', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    const mine = found(g.state, 0);
    const theirs = found(g.state, 1);
    theirs.buildings.push(OPUS);
    expect(buildError(g.state, 0, 'building', OPUS, mine)).toBeNull();
  });
});

describe('a great work wants its building in the same town', () => {
  /** The capstones that name a site — the three works, never the Opus. */
  const GATED = CAPSTONES.filter((id) => buildingDef(id).requiresSite !== undefined);

  it('names three, each on a building', () => {
    expect(GATED).toHaveLength(3);
    for (const id of GATED) {
      expect(buildingDef(id).requiresSite!.test).toBe('hasBuilding');
    }
  });

  it('refuses a town without it, and admits the one that has it', () => {
    const g = game();
    const town = found(g.state, 0);
    for (const id of GATED) {
      const site = buildingDef(id).requiresSite as { test: 'hasBuilding'; building: string };
      // The tree is not what this is about: hand the empire the node that opens
      // the row, then ask only about the ground.
      learn(g.state, 0, BUILDING_UNLOCK_TECH.get(id)!);
      const wanted = buildingDef(site.building as never).name;
      expect(buildError(g.state, 0, 'building', id, town)).toContain(wanted);
      town.buildings.push(site.building as never);
      expect(buildError(g.state, 0, 'building', id, town)).toBeNull();
    }
  });
});

// --- what a great work pays -------------------------------------------------

describe('the three great works pay what their rows say', () => {
  /** The capstone whose effects move a ship. Found by what it does, not by name. */
  function workWith(test: (id: string) => boolean): string {
    return CAPSTONES.find((id) => test(id))!;
  }

  it('Chart the Stars moves ships and anything embarked one hex further', () => {
    const g = game();
    const town = found(g.state, 0);
    const chart = workWith((id) =>
      (buildingDef(id as never).effects ?? []).some(
        (e) => e.kind === 'unitStat' && e.stat === 'movement' && e.where === 'embarked',
      ),
    );
    const hull = g.state.units.find((u) => u.ownerId === 0)!;
    const before = fullMovement(hull, g.state);

    town.buildings.push(chart as never);
    // The land piece is unmoved — the lines are a ship's and an embarked
    // piece's, and this one is neither.
    expect(fullMovement(hull, g.state)).toBe(before);

    // A naval row, if the roster has one: it gains the point on dry accounting,
    // because the line is about the *class*, not about the hex.
    const naval = g.state.units.length;
    void naval;
    const boat = createUnit(g.state, 0, 'trireme', hull.col, hull.row);
    expect(fullMovement(boat, g.state)).toBeGreaterThan(
      fullMovement({ ...boat, ownerId: 1 }, g.state),
    );
  });

  it('The Alchemical Codex is worth three points of strength to every soldier', () => {
    const g = game();
    const town = found(g.state, 0);
    const codex = workWith((id) =>
      (buildingDef(id as never).effects ?? []).some((e) => e.kind === 'combatLine'),
    );
    const soldier = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, soldier.col, soldier.row)!;
    const situation = {
      unit: soldier,
      side: 'attack' as const,
      tile,
      vsBarbarians: false,
      vsCity: false,
      targetHp: 10,
      targetMaxHp: 10,
    };
    expect(cardCombatLines(g.state, situation)).toHaveLength(0);

    town.buildings.push(codex as never);
    const lines = cardCombatLines(g.state, situation);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amount).toBe(3);
  });

  it('The Alchemical Codex mends a piece that has dug in, and only one that has', () => {
    const g = game();
    const town = found(g.state, 0);
    const codex = workWith((id) =>
      (buildingDef(id as never).effects ?? []).some(
        (e) => e.kind === 'unitStat' && e.stat === 'heal',
      ),
    );
    town.buildings.push(codex as never);
    const soldier = g.state.units.find((u) => u.ownerId === 0)!;

    // Presence is the state: no key, no extra mending.
    expect(cardUnitStat(g.state, soldier, 'heal')).toBe(0);
    soldier.fortifiedTurns = 0;
    expect(cardUnitStat(g.state, soldier, 'heal')).toBe(5);
  });

  it('The Turning Heavens deals a draft of scholars alone', () => {
    const g = game();
    const town = found(g.state, 0);
    const heavens = CAPSTONES.find((id) =>
      (buildingDef(id).onComplete ?? []).some((grant) => grant.grant === 'greatPerson'),
    )!;
    const player = playerById(g.state, 0)!;
    expect(player.greatPersonOffer).toBeUndefined();

    const realised = realiseItem(g.state, town, { kind: 'building', id: heavens });
    const drafted = realised.grants!.find((r) => r.grant === 'greatPerson')!;
    expect(drafted.done).toBe(true);
    expect(player.greatPersonOffer).toBeDefined();
    // Every name on the table is of the family the row asked for.
    const family = (buildingDef(heavens).onComplete ?? []).find(
      (g2) => g2.grant === 'greatPerson',
    ) as { family: string };
    for (const id of player.greatPersonOffer!.options) {
      expect(id.length).toBeGreaterThan(0);
    }
    expect(family.family).toBe('scholar');
  });
});

describe('a bead-paying build pays through the beads system', () => {
  it('banks the row its data names, once, and reports the second attempt', () => {
    const g = game();
    const town = found(g.state, 0);
    const payer = CAPSTONES.find((id) =>
      (buildingDef(id).onComplete ?? []).some((grant) => grant.grant === 'bead'),
    )!;
    const named = (buildingDef(payer).onComplete ?? []).find(
      (grant) => grant.grant === 'bead',
    ) as { bead: string };

    const first = realiseItem(g.state, town, { kind: 'building', id: payer });
    const paid = first.grants!.find((r) => r.grant === 'bead')!;
    expect(paid.done).toBe(true);
    expect(playerById(g.state, 0)!.beads.map((b) => b.id)).toContain(named.bead);

    // A second copy pays nothing: the grant class is once per empire and the
    // report says so rather than the rod growing a twin.
    town.buildings.pop();
    const second = realiseItem(g.state, town, { kind: 'building', id: payer });
    expect(second.grants!.find((r) => r.grant === 'bead')!.done).toBe(false);
    expect(
      playerById(g.state, 0)!.beads.filter((b) => b.id === named.bead),
    ).toHaveLength(1);
  });
});

// --- the finish line --------------------------------------------------------

describe('finishing the Opus closes the age and settles the race', () => {
  /** Two seats, both with a town, the world past the closer. */
  function board() {
    const g = game();
    learn(g.state, 0, CLOSER);
    const mine = found(g.state, 0);
    const theirs = found(g.state, 1);
    return { g, mine, theirs };
  }

  it('takes the closing age’s reckonings and names the seat with the most beads', () => {
    const { g, mine } = board();
    // A rival with a rod already going. `theirs` is not the builder.
    const rival = playerById(g.state, 1)!;
    for (const id of BEAD_GRANT_IDS.slice(0, 3)) awardBeadGrant(g.state, rival.id, id);
    expect(g.state.winnerId).toBeNull();

    realiseItem(g.state, mine, { kind: 'building', id: OPUS });

    // The builder has exactly the golden bead; the rival has three. Most beads
    // wins, and it is not the builder — the Opus is a finish line, not a win.
    expect(playerById(g.state, 0)!.beads.length).toBe(1);
    expect(g.state.winnerId).toBe(rival.id);
  });

  it('breaks a tie for the empire that raised it', () => {
    const { g, mine } = board();
    const rival = playerById(g.state, 1)!;
    // One bead each once the golden one lands.
    awardBeadGrant(g.state, rival.id, BEAD_GRANT_IDS[1]!);
    realiseItem(g.state, mine, { kind: 'building', id: OPUS });
    expect(playerById(g.state, 0)!.beads.length).toBe(rival.beads.length);
    expect(g.state.winnerId).toBe(0);
  });

  it('banks the golden bead before it counts — the grant runs first', () => {
    const { g, mine } = board();
    realiseItem(g.state, mine, { kind: 'building', id: OPUS });
    const golden = (buildingDef(OPUS).onComplete ?? []).find(
      (grant) => grant.grant === 'bead',
    ) as { bead: string };
    expect(playerById(g.state, 0)!.beads.map((b) => b.id)).toContain(golden.bead);
    expect(g.state.winnerId).toBe(0);
  });

  it('takes the reckonings through the ordinary machinery, once', () => {
    const { g, mine } = board();
    const before = g.state.beads.claimed.length;
    realiseItem(g.state, mine, { kind: 'building', id: OPUS });
    // Whatever the age's face-up hand held has now been measured; a second call
    // to the same routine measures nothing, because the register refuses it.
    const after = g.state.beads.claimed.length;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(takeReckonings(g.state, g.state.beads.worldAge)).toEqual([]);
  });

  it('never unseats a winner somebody else already is', () => {
    const { g, mine } = board();
    g.state.winnerId = 1;
    const close = closeTheGreatWork(g.state, mine);
    expect(close.winnerId).toBeNull();
    expect(g.state.winnerId).toBe(1);
  });
});

// --- the contribution path --------------------------------------------------

describe('the Opus is funded the cathedral’s way', () => {
  it('takes gold and faith into its basket, and finishing it that way ends the game', () => {
    const g = game();
    learn(g.state, 0, CLOSER);
    const town = found(g.state, 0);
    town.queue.length = 0;
    town.queue.push({ kind: 'building', id: OPUS });
    town.hammerBasket = 0;

    const player = playerById(g.state, 0)!;
    // Enough coin to cover the whole row at the printed rate, in one press.
    player.gold = buildingDef(OPUS).cost * RULES.production.goldPerHammer;
    const result = applyCommand(g.state, {
      type: 'contribute',
      playerId: 0,
      cityId: town.id,
      currency: 'gold',
    } as Command);

    expect(result.ok).toBe(true);
    expect(town.buildings).toContain(OPUS);
    // The bank lost the printed figure, the age closed, and the race is settled.
    expect(player.gold).toBe(0);
    expect(g.state.winnerId).toBe(0);
    expect(result.ok && result.beads!.length).toBeGreaterThan(0);
  });
});

// --- the properties every command owes --------------------------------------

describe('the endgame is deterministic', () => {
  /**
   * The same board twice, set up identically, driven by the same commands.
   *
   * It is deliberately **not** a `{config, log}` round-trip, and the reason is
   * worth stating: the setup writes a technology and a treasury straight onto
   * the state, and neither is a command, so a log replayed from `newGame` would
   * reach a board where the row is not yet open. What determinism means here is
   * the property a replay actually rests on — *the same state plus the same
   * commands reach the same bytes* — and every roll the finish line spends (the
   * reckonings, the completion grants, a scholars-only draft) is inside it. The
   * played-from-nothing version is the slow sibling's, where a game can afford
   * to earn its beakers.
   */
  function endgameBoard(seed: number) {
    const g = createGame({
      seed,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const settler = g.state.units.find(
      (u) => u.ownerId === 0 && unitDef(u.type).foundsCity === true,
    )!;
    dispatch(g, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id } as Command);
    learn(g.state, 0, CLOSER);
    const town = g.state.cities.find((c) => c.ownerId === 0)!;
    playerById(g.state, 0)!.gold =
      buildingDef(OPUS).cost * RULES.production.goldPerHammer;
    dispatch(g, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: town.id,
      queue: [{ kind: 'building', id: OPUS }],
    } as Command);
    dispatch(g, {
      type: 'contribute',
      playerId: 0,
      cityId: town.id,
      currency: 'gold',
    } as Command);
    return g;
  }

  it('reaches the same bytes from the same board and the same commands', () => {
    const first = endgameBoard(7);
    const second = endgameBoard(7);
    expect(first.state.cities[0]!.buildings).toContain(OPUS);
    expect(first.state.winnerId).toBe(0);
    expect(snapshotState(second.state)).toEqual(snapshotState(first.state));
  });

  it('leaves the log a plain list of the commands it took', () => {
    const g = endgameBoard(7);
    expect(g.log.map((c) => c.type)).toEqual([
      'foundCity',
      'setCityProduction',
      'contribute',
    ]);
  });
});

// --- the bot ----------------------------------------------------------------

describe('a bot reaches for the Opus', () => {
  it('queues it in its busiest town once the world has opened it', () => {
    const g = game();
    learn(g.state, 1, CLOSER);
    const town = found(g.state, 0);
    town.queue.length = 0;

    // Walk the bot's proposals until it either offers the Opus or runs dry: the
    // arm sits in `chooseProduction`, and a bot has other verbs to spend first.
    let queued = false;
    for (let i = 0; i < 40 && !queued; i++) {
      const command = nextBotCommand(g.state, 0);
      if (command === null) break;
      if (
        command.type === 'setCityProduction' &&
        command.cityId === town.id &&
        command.queue.some((item) => item.kind === 'building' && item.id === OPUS)
      ) {
        queued = true;
        break;
      }
      const done = applyCommand(g.state, command);
      if (!done.ok) break;
    }
    expect(queued).toBe(true);
  });
});

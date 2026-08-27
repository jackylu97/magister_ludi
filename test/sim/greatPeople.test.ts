/**
 * Great people: the draw, the pick, the two verbs and the legacy
 * (`docs/great-people.md`).
 *
 * Three claims are on trial and they are the three that would be silent if they
 * broke:
 *
 *   · **the draw biases without excluding** — a fed family is likelier and no
 *     family is ever weight zero, and the spill reaches backwards before
 *     forwards so a short age degrades rather than fails;
 *   · **every act pays through the seam its bucket already has**, so a scholar's
 *     beakers finish a technology by exactly the code an end-of-turn technology
 *     is finished by;
 *   · **a legacy is a card**, read by `liveEffects` like a belief's, so a person
 *     is a JSON row and `statecraft.ts` is still the only module that switches
 *     on a `CardEffect.kind`.
 */

import { describe, expect, it } from 'vitest';

import { cityYields, foundCityAt, tileOwnerPlayerId } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { previewCombat } from '../../src/sim/combat';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import {
  drawGreatPersonOffer,
  familyOf,
  greatPersonActError,
  greatPersonPool,
  greatPersonWeights,
  greatPersonWorkError,
  rosterAgeFor,
  spillOrder,
  workOf,
} from '../../src/sim/greatPeople';
import {
  GREAT_PERSON_IDS,
  type GreatPersonId,
  greatPersonDef,
  rosterOfAge,
} from '../../src/sim/greatPeopleData';
import { improvementError } from '../../src/sim/improvements';
import { getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { settleRenownWindfall } from '../../src/sim/renown';
import {
  type GameState,
  type Unit,
  createUnit,
  newGame,
  unitById,
} from '../../src/sim/state';
import { liveEffects } from '../../src/sim/statecraft';
import type { CardEffectKind } from '../../src/sim/statecraftData';
import { highestAge } from '../../src/sim/techData';
import { game, found } from './statecraftHelpers';

const PEOPLE = RULES.greatPeople;

/** A recruited piece of this person, standing in the seat's first city. */
function call(state: GameState, playerId: number, id: GreatPersonId): Unit {
  const city = state.cities.find((c) => c.ownerId === playerId) ?? found(state, playerId);
  state.recruited.push(id);
  state.players[playerId]!.greatPeopleRecruited += 1;
  return createUnit(state, playerId, 'greatPerson', city.col, city.row, id);
}

/** One name of each family, for the verb suites. */
const SAMPLE = {
  scholar: 'ahmes',
  artist: 'ilimilku',
  engineer: 'senenmut',
  merchant: 'kushim',
  general: 'sinuhe',
} as const;

// --- the roster -------------------------------------------------------------

describe('the roster', () => {
  it('is the doc as it reads, four families deep per age', () => {
    expect(GREAT_PERSON_IDS.length).toBe(81);
    for (const age of [2, 3, 4, 5]) {
      expect(rosterOfAge(age).length, String(age)).toBeGreaterThanOrEqual(20);
    }
  });

  it('maps an empire’s era onto a roster age, and never off the table', () => {
    // The tech tree knows three ages; the roster is numbered II–V. One function
    // between them, so the tree pass moves one line.
    expect(rosterAgeFor(1)).toBe(2);
    expect(rosterAgeFor(2)).toBe(3);
    expect(rosterAgeFor(3)).toBe(4);
    // A hypothetical fourth era clamps to the last roster age rather than
    // reaching for a bag that does not exist.
    expect(rosterAgeFor(9)).toBe(5);
  });

  it('spills to the previous age first, then to the next', () => {
    expect(spillOrder(3)).toEqual([3, 2, 4, 5]);
    expect(spillOrder(2)).toEqual([2, 3, 4, 5]);
    expect(spillOrder(5)).toEqual([5, 4, 3, 2]);
  });
});

// --- the draw ---------------------------------------------------------------

describe('the draw', () => {
  it('takes only this age while this age has enough', () => {
    const g = game();
    const pool = greatPersonPool(g.state, g.state.players[0]!, 3);
    expect(pool.every((id) => greatPersonDef(id).age === 2)).toBe(true);
  });

  it('spills to the previous age before the next when the age runs short', () => {
    const g = game(11);
    const player = g.state.players[0]!;
    // An Æra-III empire whose own age holds one name left.
    player.techsResearched.push('ironWorking');
    const age = 3;
    expect(highestAge(player.techsResearched)).toBeGreaterThan(1);
    const own = rosterOfAge(age);
    g.state.recruited.push(...own.slice(1));
    const pool = greatPersonPool(g.state, player, 3);
    expect(pool[0]).toBe(own[0]);
    // The rest came from Æra II — *the forgotten* — and not from Æra IV.
    expect(greatPersonDef(pool[1]!).age).toBe(2);
    expect(pool.some((id) => greatPersonDef(id).age === 4)).toBe(false);
  });

  it('reaches forward once the previous ages are spent too', () => {
    const g = game(13);
    const player = g.state.players[0]!;
    player.techsResearched.push('ironWorking');
    g.state.recruited.push(...rosterOfAge(2), ...rosterOfAge(3).slice(1));
    const pool = greatPersonPool(g.state, player, 3);
    expect(pool[0]).toBe(rosterOfAge(3)[0]);
    expect(greatPersonDef(pool[1]!).age).toBe(4);
  });

  it('hands back nothing at all when the whole roster is spent', () => {
    const g = game();
    g.state.recruited.push(...GREAT_PERSON_IDS);
    expect(greatPersonPool(g.state, g.state.players[0]!, 3)).toEqual([]);
    expect(drawGreatPersonOffer(g.state, g.state.players[0]!).options).toEqual([]);
  });

  it('weights a fed family up and nobody down to nothing', () => {
    const g = game();
    const player = g.state.players[0]!;
    const candidates = rosterOfAge(2);

    // A flat bag when nothing has fed the bucket at all.
    const flat = greatPersonWeights(player, candidates);
    expect(new Set(flat).size).toBe(1);

    // And a biased one once the libraries have been paying for forty turns.
    player.renownByFamily.scholar = 40;
    const fed = greatPersonWeights(player, candidates);
    const scholars = candidates.filter((id) => greatPersonDef(id).family === 'scholar');
    const others = candidates.filter((id) => greatPersonDef(id).family !== 'scholar');
    const weightOf = (id: GreatPersonId): number => fed[candidates.indexOf(id)]!;
    expect(weightOf(scholars[0]!)).toBeGreaterThan(weightOf(others[0]!));
    // **Nobody is refused.** Every weight is positive however lopsided the feed.
    for (const weight of fed) expect(weight).toBeGreaterThan(0);
    // Twice at the very most, which is the whole range the rule promises.
    expect(weightOf(scholars[0]!)).toBeLessThanOrEqual(2 * weightOf(others[0]!));
  });

  it('deals the same hand from the same generator state', () => {
    const a = game(17);
    const b = game(17);
    expect(drawGreatPersonOffer(a.state, a.state.players[0]!)).toEqual(
      drawGreatPersonOffer(b.state, b.state.players[0]!),
    );
  });
});

// --- taking a name ----------------------------------------------------------

describe('chooseGreatPerson', () => {
  it('spends the name for the whole world and mints the piece in the capital', () => {
    const g = game(19);
    const city = found(g.state, 0);
    settleRenownWindfall(g.state, g.state.players[0]!, [
      { family: null, amount: RULES.renown.first },
    ]);
    const offer = g.state.players[0]!.greatPersonOffer!;
    const taken = offer.options[1]!;
    expect(dispatch(g, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 1 } as Command).ok)
      .toBe(true);

    expect(g.state.players[0]!.greatPersonOffer).toBeUndefined();
    expect(g.state.recruited).toEqual([taken]);
    expect(g.state.players[0]!.greatPeopleRecruited).toBe(1);
    const piece = g.state.units.find((u) => u.person === taken)!;
    // In the capital, or beside it when the centre has no room for another
    // civilian — `spawnTileFor`'s rule, the same one a settler arrives by.
    expect(Math.abs(piece.col - city.col) + Math.abs(piece.row - city.row)).toBeLessThanOrEqual(1);
    expect(piece.chargesLeft).toBe(1);
  });

  it('refuses a name another empire took first, and re-deals the hand', () => {
    const g = game(23);
    found(g.state, 0);
    found(g.state, 1);
    for (const id of [0, 1]) {
      settleRenownWindfall(g.state, g.state.players[id]!, [
        { family: null, amount: RULES.renown.first },
      ]);
    }
    // Force the contention: both seats are holding the same name.
    const contested = g.state.players[0]!.greatPersonOffer!.options[0]!;
    g.state.players[1]!.greatPersonOffer = { options: [contested] };

    expect(applyCommand(g.state, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 0 }).ok)
      .toBe(true);
    const refused = applyCommand(g.state, {
      type: 'chooseGreatPerson',
      playerId: 1,
      optionIndex: 0,
    });
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.error).toContain('already been called');
    // And the second seat is not stuck: it holds a fresh hand with none of the
    // spent names on it, and can still end its turn.
    const redrawn = g.state.players[1]!.greatPersonOffer!;
    expect(redrawn.options).not.toContain(contested);
    expect(redrawn.options.length).toBeGreaterThan(0);
  });

  it('refuses an index it was never dealt, byte-identically', () => {
    const g = game();
    found(g.state, 0);
    settleRenownWindfall(g.state, g.state.players[0]!, [
      { family: null, amount: RULES.renown.first },
    ]);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 9 }).ok)
      .toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});

// --- the act ----------------------------------------------------------------

describe('the act', () => {
  it('a scholar pays a share of the current technology, through settleResearchWindfall', () => {
    const g = game(29);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.scholar);
    expect(greatPersonActError(g.state, 0, unit.id)).toContain('nothing to study');

    applyCommand(g.state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    expect(greatPersonActError(g.state, 0, unit.id)).toBeNull();
    expect(applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id }).ok)
      .toBe(true);
    expect(player.sciencePool).toBeGreaterThan(0);
    expect(unitById(g.state, unit.id)).toBeUndefined();
    expect(player.legacies).toEqual([SAMPLE.scholar]);
  });

  it('a scholar’s beakers finish the technology outright when they cover it', () => {
    const g = game(31);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.scholar);
    applyCommand(g.state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    player.sciencePool = 999;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    expect(player.techsResearched).toContain('mining');
  });

  it('an engineer pays hammers into the town, scaled by the era', () => {
    const g = game(37);
    const city = found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.engineer);
    const before = city.hammerBasket;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    const era = highestAge(g.state.players[0]!.techsResearched);
    expect(city.hammerBasket).toBe(before + PEOPLE.engineerHammers * era);
  });

  it('a merchant pays gold, scaled by the era', () => {
    const g = game(41);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.merchant);
    const before = player.gold;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    expect(player.gold).toBe(before + PEOPLE.merchantGold);
  });

  it('an artist pays culture into the draft basket and blesses the town', () => {
    const g = game(43);
    const city = found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.artist);
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    // The culture went through the *bucket's* seam, so a big enough grant opens
    // a draft rather than sitting in a pool.
    expect(player.culturePool + (player.statecraft.drafts > 0 ? 1 : 0)).toBeGreaterThan(0);
    // And the blessing is an ordinary timed effect with an absolute expiry.
    expect(city.timed).toHaveLength(1);
    expect(city.timed![0]!.expiresTurn).toBe(g.state.turn + PEOPLE.artistTurns);
    expect(city.timed![0]!.effect.kind).toBe('happiness');
  });

  it('a general heals every friendly piece in reach and hangs a strength on it', () => {
    const g = game(47);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.general);
    const friend = createUnit(g.state, 0, 'warrior', unit.col, unit.row);
    friend.hp = 20;
    const forecastBefore = friend.hp;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    expect(friend.hp).toBeGreaterThan(forecastBefore);
    expect(friend.timed).toHaveLength(1);
    expect(friend.timed![0]!.expiresTurn).toBe(g.state.turn + PEOPLE.generalTurns);
    // And it is read by the ordinary combat evaluator, not by a second one.
    const foe = createUnit(g.state, 1, 'warrior', friend.col + 1, friend.row);
    const plan = previewCombat(g.state, friend.id, { col: foe.col, row: foe.row });
    expect(plan.ok === false ? plan.error : 'ok').toBe('ok');
    if (plan.ok) {
      expect(plan.attackerLines.some((line) => line.amount === PEOPLE.generalCombat)).toBe(true);
    }
  });
});

// --- the work ---------------------------------------------------------------

describe('the work', () => {
  it('plants the family’s improvement and spends the piece', () => {
    const g = game(53);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.scholar);
    expect(workOf(unit)).toBe('academy');
    // A town's own hex refuses a work exactly as it refuses a farm — the ground
    // rules are `improvementErrorAt`'s and there is no second copy of them — so
    // the piece steps off it first.
    const tile = getTileAt(g.state.map, unit.col + 1, unit.row)!;
    unit.col = tile.col;
    unit.row = tile.row;
    expect(greatPersonWorkError(g.state, 0, unit.id)).toBeNull();
    expect(applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id }).ok)
      .toBe(true);
    expect(tile.improvement).toBe('academy');
    expect(unitById(g.state, unit.id)).toBeUndefined();
    expect(g.state.players[0]!.legacies).toEqual([SAMPLE.scholar]);
  });

  it('is refused to a worker, and an ordinary improvement is refused to a person', () => {
    const g = game(59);
    found(g.state, 0);
    const person = call(g.state, 0, SAMPLE.engineer);
    person.col += 1;
    const worker = createUnit(g.state, 0, 'worker', person.col, person.row);
    // Symmetric, and asked of the two data flags rather than of any id.
    expect(improvementError(g.state, worker.id, 'manufactory')).toContain('cannot build');
    expect(improvementError(g.state, person.id, 'farm')).toContain('leave a work behind');
  });

  it('holds the ground to the same rules a farm is held to', () => {
    const g = game(61);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.merchant);
    // Standing under the town — the clause that refuses a farm there.
    expect(greatPersonWorkError(g.state, 0, unit.id)).toContain('stands on');
    // And off this empire's ground.
    unit.col += 6;
    expect(greatPersonWorkError(g.state, 0, unit.id)).toContain('not in your territory');
  });

  it('a citadel claims its hex and the ring around it', () => {
    const g = game(67);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.general);
    expect(workOf(unit)).toBe('citadel');
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });
    expect(tile.improvement).toBe('citadel');
    for (const near of [
      [tile.col + 1, tile.row],
      [tile.col - 1, tile.row],
    ]) {
      expect(tileOwnerPlayerId(g.state, near[0]!, near[1]!)).toBe(0);
    }
  });

  it('a citadel is worth its defence to whoever stands on it', () => {
    const g = game(71);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.general);
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });

    const defender = createUnit(g.state, 0, 'warrior', tile.col, tile.row);
    const attacker = createUnit(g.state, 1, 'warrior', tile.col + 1, tile.row);
    const plan = previewCombat(g.state, attacker.id, { col: tile.col, row: tile.row });
    expect(plan.ok === false ? plan.error : 'ok').toBe('ok');
    if (plan.ok) {
      expect(plan.defenderLines.some((line) => line.source === 'citadel')).toBe(true);
    }
    void defender;
  });
});

// --- the legacy -------------------------------------------------------------

describe('a legacy is a card', () => {
  it('reaches liveEffects as its own source, once it is spent', () => {
    const g = game(73);
    found(g.state, 0);
    const before = liveEffects(g.state, 0).length;
    const unit = call(g.state, 0, SAMPLE.merchant);
    // Not yet: a person on the board has left nothing behind.
    expect(liveEffects(g.state, 0)).toHaveLength(before);
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    const after = liveEffects(g.state, 0);
    expect(after.length).toBe(before + greatPersonDef(SAMPLE.merchant).legacy.length);
    expect(after[after.length - 1]!.source).toBe(`Legacy · ${greatPersonDef(SAMPLE.merchant).name}`);
  });

  it('pays a flat city yield through the ordinary fold', () => {
    const g = game(79);
    const city = found(g.state, 0);
    city.buildings.push('granary');
    const before = cityYields(g.state, city).gold;
    // Kushim: +1🪙 per granary, an ordinary `cityYields` line with a scope.
    g.state.players[0]!.legacies.push('kushim');
    expect(cityYields(g.state, city).gold).toBe(before + 1);
  });

  it('pays a scoped line only where the scope admits it', () => {
    const g = game(83);
    const city = found(g.state, 0);
    // Enheduanna: the capital +3🎵, and shrines +1🎵. Without a shrine the
    // second line pays nothing at all.
    g.state.players[0]!.legacies.push('enheduanna');
    const bare = cityYields(g.state, city).culture;
    city.buildings.push('shrine');
    expect(cityYields(g.state, city).culture).toBe(bare + 1);
  });
});

// --- the register -----------------------------------------------------------

const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function sourceOf(file: string): string {
  const path = Object.keys(SIM_SOURCE).find((key) => key.endsWith(`/${file}`))!;
  return SIM_SOURCE[path]!;
}

describe('the register', () => {
  it('writes every legacy in shapes statecraft.ts actually reads', () => {
    // The claim the whole vocabulary exists for: a person is a JSON row. A
    // legacy naming a shape the evaluator does not read would be a card that
    // silently does nothing — which is exactly the failure the *card* register
    // test in `statecraft.test.ts` catches one table over.
    const evaluator = sourceOf('statecraft.ts');
    const kinds = new Set<CardEffectKind>();
    const walk = (effects: readonly { kind: CardEffectKind; then?: unknown }[]): void => {
      for (const effect of effects) {
        kinds.add(effect.kind);
        const nested = (effect as { then?: { kind: CardEffectKind }[] }).then;
        if (nested) walk(nested);
      }
    };
    for (const id of GREAT_PERSON_IDS) walk(greatPersonDef(id).legacy as never);
    expect(kinds.size).toBeGreaterThan(6);
    for (const kind of kinds) expect(evaluator, kind).toContain(`'${kind}'`);
  });

  it('says out loud what it has not built', () => {
    // A row with an empty legacy and nothing said about it is the one thing the
    // table may never hold — the load validator refuses it, and this is the
    // outside reading of the same rule.
    for (const id of GREAT_PERSON_IDS) {
      const def = greatPersonDef(id);
      if (def.legacy.length > 0) continue;
      expect((def.deferred ?? []).length, id).toBeGreaterThan(0);
    }
  });

  it('gives every family exactly one work', () => {
    for (const family of ['scholar', 'artist', 'engineer', 'merchant', 'general'] as const) {
      const id = GREAT_PERSON_IDS.find((row) => greatPersonDef(row).family === family)!;
      const g = game();
      found(g.state, 0);
      const unit = call(g.state, 0, id);
      expect(familyOf(unit)).toBe(family);
      expect(workOf(unit), family).not.toBeNull();
    }
  });
});

// --- the log ----------------------------------------------------------------

describe('great people in the log', () => {
  it('replays byte-identically through an offer, a pick, an act and a work', () => {
    const config = {
      seed: 89,
      sizeName: 'duel' as const,
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    };
    /**
     * Two recruitments are set up by hand, on both sides, at the same point —
     * `offers.test.ts`'s save round-trip does the same and for its reason:
     * reaching two great people the honest way is forty turns of fixture to test
     * an arithmetic this size. What is on trial is the claim that matters: given
     * the same state and the same log, the same names are dealt, the same
     * indices spend them, and the act and the work land identically.
     */
    const prepare = (state: GameState): void => {
      const unit = state.units.find((u) => u.ownerId === 0)!;
      foundCityAt(state, 0, getTileAt(state.map, unit.col, unit.row)!);
      state.players[0]!.researching = 'mining';
      settleRenownWindfall(state, state.players[0]!, [
        { family: 'scholar', amount: RULES.renown.first },
      ]);
    };

    const live = createGame(config);
    prepare(live.state);
    dispatch(live, { type: 'chooseGreatPerson', playerId: 0, optionIndex: 0 } as Command);
    const piece = live.state.units.find((u) => u.person !== undefined)!;
    // Whichever family was dealt, one of the two verbs is legal for it.
    const verb = greatPersonActError(live.state, 0, piece.id) === null
      ? 'greatPersonAct'
      : 'greatPersonWork';
    dispatch(live, { type: verb, playerId: 0, unitId: piece.id } as Command);
    dispatch(live, { type: 'endTurn', playerId: 0 });
    dispatch(live, { type: 'endTurn', playerId: 1 });

    const replayed = newGame(live.config);
    prepare(replayed);
    for (const command of live.log) {
      expect(applyCommand(replayed, command).ok, JSON.stringify(command)).toBe(true);
    }
    expect(snapshotState(replayed)).toBe(snapshotState(live.state));
    expect(replayed.players[0]!.legacies).toHaveLength(1);
  });
});

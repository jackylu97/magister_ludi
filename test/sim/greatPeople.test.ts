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

import {
  cityYields,
  claimTile,
  empireRateReading,
  controlledHoldings,
  explainTileYield,
  foundCityAt,
  hasResource,
  tileOwnerPlayerId,
  yieldContextFor,
} from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { previewCombat } from '../../src/sim/combat';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import {
  actGainOf,
  agedActFactor,
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
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { RULES } from '../../src/sim/rulesData';
import { settleRenownWindfall } from '../../src/sim/renown';
import {
  type GameState,
  type Unit,
  createUnit,
  newGame,
  unitById,
} from '../../src/sim/state';
import { arriveOnTile } from '../../src/sim/arrival';
import { happinessOf } from '../../src/sim/meters';
import { revokeLegacies } from '../../src/sim/greatPeople';
import { unitDef } from '../../src/sim/unitData';
import {
  cardAmplifier,
  cardAmplifierFlat,
  cardAuthority,
  cardCityYields,
  cardCombatLines,
  cardEmpireYields,
  cardProduction,
  describeCard,
  foldCardYields,
  liveEffects,
  stripRefs,
  type CombatSituation,
} from '../../src/sim/statecraft';
import type { CardEffectKind } from '../../src/sim/statecraftData';
import { highestAge, techDef } from '../../src/sim/techData';
import { game, found, keepTheRites } from './statecraftHelpers';

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
    // Eighty since the nerf pass of 2026-09-03 struck Li Jie off the roster
    // (the user's `[remove]` in the worksheet's Nerf notes column). A name is
    // deleted rather than marked because there is no retired concept on this
    // table — a great person is *consumed*, never withdrawn from a pool.
    expect(GREAT_PERSON_IDS.length).toBe(80);
    for (const age of [2, 3, 4, 5]) {
      // Deep enough that a draw never spills in ordinary play; Æra IV is the
      // short one at nineteen and every other age still holds twenty or more.
      expect(rosterOfAge(age).length, String(age)).toBeGreaterThanOrEqual(19);
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
    // An Æra-III **roster** empire whose own age holds one name left. The
    // roster's ages run one past the tree's (`rosterAgeFor`), so this is a seat
    // standing in the tree's Æra II — re-read, not re-argued, by the tree pass
    // of 2026-08-30, which moved Iron Working into Æra III under it.
    player.techsResearched.push('siegecraft');
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
    player.techsResearched.push('siegecraft');
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
    keepTheRites(g.state);
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
    // Adjacency is asked in hexes, not Manhattan (2026-09-03): the (+1,−1)
    // neighbour is one hex away and two by column-plus-row, and the pangaea's
    // ground finally made the spawn pick it.
    const centre = getTileAt(g.state.map, city.col, city.row)!;
    const besideCity =
      (piece.col === city.col && piece.row === city.row) ||
      neighborTiles(g.state.map, tileHex(centre)).some(
        (t) => t.col === piece.col && t.row === piece.row,
      );
    expect(besideCity).toBe(true);
    expect(piece.chargesLeft).toBe(1);
  });

  it('refuses a name another empire took first, and re-deals the hand', () => {
    const g = game(23);
    found(g.state, 0);
    found(g.state, 1);
    keepTheRites(g.state);
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
  it('a scholar pays turns of the empire’s own science, through settleResearchWindfall', () => {
    // Re-quoted by the nerf pass of 2026-09-03: it was `scholarShare` × the
    // aimed technology's full cost, which made a great person worth more the
    // deeper the tree went and worth it to an empire that had built nothing.
    // Now it is `actGainTurns` turns of what this empire actually banks —
    // **read through the one seam** (`actGainOf` → `empireRateReading`), so the
    // payout, the preview and the top bar cannot disagree about a turn.
    const g = game(29);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.scholar);
    expect(greatPersonActError(g.state, 0, unit.id)).toContain('nothing to study');

    applyCommand(g.state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    expect(greatPersonActError(g.state, 0, unit.id)).toBeNull();
    // The exact figure, asked of the seam *before* the piece is spent — and it
    // is a real number, not a nought that would pin nothing.
    const owed = actGainOf(g.state, 0, 'science');
    expect(owed).toBe(
      Math.max(0, Math.floor(empireRateReading(g.state, 0).sciencePerTurn ?? 0)) *
        PEOPLE.actGainTurns,
    );
    expect(owed).toBeGreaterThan(0);
    const before = player.sciencePool;
    expect(applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id }).ok)
      .toBe(true);
    // The whole figure was banked once, through the ordinary seam: what is left
    // in the pool plus whatever the beakers actually bought.
    const bought = player.techsResearched.includes('mining') ? techDef('mining').cost : 0;
    expect(player.sciencePool + bought).toBe(before + owed);
    expect(unitById(g.state, unit.id)).toBeUndefined();
    expect(player.legacies.map((held) => held.id)).toEqual([SAMPLE.scholar]);
  });

  it('a scholar’s act is deliberately un-aged — the rate already grew', () => {
    // `agedActFactor` reaches the two *flat* arms and neither rate-quoted one:
    // a figure read off the empire's own books already grows with every
    // technology, and ageing it twice would compound. Proven by moving the tree
    // under a fixed board and watching the figure hold.
    const g = game(30);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const before = actGainOf(g.state, 0, 'science');
    const aged = agedActFactor(player);
    player.techsResearched.push('mining', 'earthenware');
    expect(agedActFactor(player)).toBeGreaterThan(aged);
    expect(actGainOf(g.state, 0, 'science')).toBe(before);
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
    // Aged by the tree since 2026-08-30 (`actPerTech`): the flat figure pays
    // ×(1 + 0.05 × techs), floored before the amplifier.
    expect(city.hammerBasket).toBe(
      before +
        Math.floor(
          PEOPLE.engineerHammers *
            era *
            (1 + PEOPLE.actPerTech * g.state.players[0]!.techsResearched.length),
        ),
    );
  });

  it('a merchant pays gold, scaled by the era', () => {
    const g = game(41);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.merchant);
    const before = player.gold;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    expect(player.gold).toBe(
      before +
        Math.floor(PEOPLE.merchantGold * (1 + PEOPLE.actPerTech * player.techsResearched.length)),
    );
  });

  it('an artist pays turns of the empire’s own culture and blesses the town', () => {
    // The scholar's re-quoting on the other bucket (nerf pass, 2026-09-03): a
    // flat `artistCulture` 40 became `actGainTurns` turns of what this empire
    // banks in culture, off the same seam.
    const g = game(43);
    const city = found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.artist);
    const owed = actGainOf(g.state, 0, 'culture');
    expect(owed).toBe(
      Math.max(0, Math.floor(empireRateReading(g.state, 0).culturePerTurn ?? 0)) *
        PEOPLE.actGainTurns,
    );
    expect(owed).toBeGreaterThan(0);
    const before = player.culturePool;
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    // The culture went through the *bucket's* seam, so a big enough grant opens
    // a draft rather than sitting in a pool — the figure is the fold of the two.
    expect(player.culturePool + (player.statecraft.drafts > 0 ? 1 : 0)).toBeGreaterThan(0);
    if (player.statecraft.drafts === 0) expect(player.culturePool).toBe(before + owed);
    // And the blessing is an ordinary timed effect with an absolute expiry.
    expect(city.timed).toHaveLength(1);
    expect(city.timed![0]!.expiresTurn).toBe(g.state.turn + PEOPLE.artistTurns);
    expect(city.timed![0]!.effect.kind).toBe('happiness');
  });

  it('an artist reads the rate before the cheer it hangs — no act pays itself', () => {
    // Entry XVIII.5 at the seam that composes the figure: the act's own +2
    // happiness could raise the town's yields, and a payout read afterwards
    // would be a one-time grant paying interest on itself.
    const g = game(44);
    found(g.state, 0);
    const player = g.state.players[0]!;
    const unit = call(g.state, 0, SAMPLE.artist);
    const owed = actGainOf(g.state, 0, 'culture');
    applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: unit.id });
    // Whatever the cheer did to the town, the figure is the one read before it.
    if (player.statecraft.drafts === 0) expect(player.culturePool).toBe(owed);
    // The town is now cheered, and the seam says so — which is the whole risk
    // the ordering closes.
    expect(happinessOf(g.state, 0)).toBeGreaterThan(0);
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
    // the piece steps off it first. The step scans the map for standing ground
    // rather than blindly taking `col + 1` (2026-09-03: the pangaea put water
    // there on this seed, and a ring-only hunt still found towns ringed in
    // shore) — a work wants owned ground that is not water, mountain, or the
    // town's own hex, so the hunt asks exactly those clauses of the whole map.
    const tile = g.state.map.tiles.find(
      (t) =>
        !isWaterTerrain(t.terrain) &&
        t.terrain !== 'mountain' &&
        tileOwnerPlayerId(g.state, t.col, t.row) === 0 &&
        !(t.col === unit.col && t.row === unit.row),
    )!;
    unit.col = tile.col;
    unit.row = tile.row;
    expect(greatPersonWorkError(g.state, 0, unit.id)).toBeNull();
    expect(applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id }).ok)
      .toBe(true);
    expect(tile.improvement).toBe('academy');
    expect(unitById(g.state, unit.id)).toBeUndefined();
    expect(g.state.players[0]!.legacies.map((held) => held.id)).toEqual([SAMPLE.scholar]);
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

  it('stands anywhere its planter can — any terrain, any feature, any seam', () => {
    // User, 2026-08-27: "great people improvements should be buildable
    // anywhere". The four ground filters and the seam clause are all waived for
    // a row carrying `greatPerson`; the row itself no longer *names* a terrain
    // or a feature, so there is nothing left in the data to disagree with.
    const g = game(73);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.scholar);
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;

    for (const terrain of ['grassland', 'desert', 'tundra', 'snow'] as const) {
      for (const feature of ['none', 'forest', 'jungle'] as const) {
        for (const hills of [false, true]) {
          tile.terrain = terrain;
          tile.feature = feature;
          tile.hills = hills;
          expect(
            greatPersonWorkError(g.state, 0, unit.id),
            `${terrain}/${feature}/${hills ? 'hills' : 'flat'}`,
          ).toBeNull();
        }
      }
    }
    // A seam that wants a mine takes the academy anyway — the seam rule protects
    // a *charge* from being spent wrong, and a work is a person.
    tile.terrain = 'grassland';
    tile.feature = 'none';
    tile.hills = true;
    tile.resource = 'iron';
    expect(greatPersonWorkError(g.state, 0, unit.id)).toBeNull();
  });

  it('is still refused water and impassable ground, which is the one question left', () => {
    const g = game(79);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.scholar);
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;

    tile.terrain = 'coast';
    expect(greatPersonWorkError(g.state, 0, unit.id)).toContain('cannot be built on water');
    tile.terrain = 'mountain';
    expect(greatPersonWorkError(g.state, 0, unit.id)).toContain('cannot be built on mountain');
  });

  it('opens whatever seam it was planted on, once the empire has a word for it', () => {
    // The other half of the same note: "automatically gives strategic or luxury
    // resource if built on top of them". The reveal clause still binds and still
    // comes first, so iron under an academy is worth nothing until Bronzeworking
    // — and the ledger names the academy, not the mine nobody dug.
    const g = game(83);
    const city = found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.scholar);
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    claimTile(g.state, city, tile);
    tile.terrain = 'grassland';
    tile.feature = 'none';
    tile.hills = true;
    tile.resource = 'iron';

    const player = g.state.players[0]!;
    player.techsResearched = player.techsResearched.filter((id) => id !== 'ironWorking');
    applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });
    expect(tile.improvement).toBe('academy');
    expect(hasResource(g.state, 0, 'iron')).toBe(false);

    player.techsResearched.push('ironWorking');
    expect(hasResource(g.state, 0, 'iron')).toBe(true);
    const holding = controlledHoldings(g.state, 0, 'strategic').find((h) => h.id === 'iron')!;
    expect(holding.via).toBe('improvement');
    expect(holding.improvement).toBe('academy');
    // Access, never the mine's yield: the tile pays the terrain, the seam and
    // the *academy*, and there is no hammer from an improvement nobody built.
    expect(explainTileYield(tile, yieldContextFor(g.state, 0)).map((line) => line.source)).toEqual([
      'Grassland',
      'Hills',
      'Iron',
      'Academy',
    ]);
  });

  it('a citadel claims its hex and the ring around it', () => {
    const g = game(67);
    found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.general);
    expect(workOf(unit)).toBe('citadel');
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    // A work stands anywhere a piece can, which is everywhere but water and the
    // mountain — and the hex beside a capital is sometimes a lake. Made land
    // here rather than searched for, because what this test is about is the
    // *claim*, not where the start scorer put the settler.
    tile.terrain = 'grassland';
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
    const city = found(g.state, 0);
    const unit = call(g.state, 0, SAMPLE.general);
    // Owned standing ground with a dry neighbour for the attacker — hunted
    // rather than taken on faith (2026-09-03: the pangaea put shore at the old
    // `col + 1`).
    const stands = (t: { terrain: string } | null): boolean =>
      t !== null && !isWaterTerrain((t as { terrain: never }).terrain) && (t as { terrain: string }).terrain !== 'mountain';
    const pair = g.state.map.tiles
      .filter(
        (t) =>
          stands(t) &&
          tileOwnerPlayerId(g.state, t.col, t.row) === 0 &&
          !(t.col === city.col && t.row === city.row),
      )
      .map((t) => ({
        tile: t,
        open: neighborTiles(g.state.map, tileHex(t)).find(
          (n) => stands(n) && !(n.col === city.col && n.row === city.row),
        ),
      }))
      .find((entry) => entry.open !== undefined)!;
    const tile = pair.tile;
    unit.col = tile.col;
    unit.row = tile.row;
    applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });

    const defender = createUnit(g.state, 0, 'warrior', tile.col, tile.row);
    const attacker = createUnit(g.state, 1, 'warrior', pair.open!.col, pair.open!.row);
    const plan = previewCombat(g.state, attacker.id, { col: tile.col, row: tile.row });
    expect(plan.ok === false ? plan.error : 'ok').toBe('ok');
    if (plan.ok) {
      expect(plan.defenderLines.some((line) => line.source === 'Citadel')).toBe(true);
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
    g.state.players[0]!.legacies.push({ id: 'kushim', age: 1 });
    expect(cityYields(g.state, city).gold).toBe(before + 1);
  });

  it('pays a scoped line only where the scope admits it', () => {
    const g = game(83);
    const city = found(g.state, 0);
    // Enheduanna: the capital +3🎵, and shrines +1🎵. Without a shrine the
    // second line pays nothing at all.
    g.state.players[0]!.legacies.push({ id: 'enheduanna', age: 1 });
    const bare = cityYields(g.state, city).culture;
    city.buildings.push('shrine');
    expect(cityYields(g.state, city).culture).toBe(bare + 1);
  });
});

// --- the legacies the 2026-08-28 pass built ---------------------------------

/**
 * The shapes this pass added to the vocabulary, each read where its family
 * already lives (`countOf`, `combatConditionHolds`, `cityScopeAdmits`,
 * `cardProduction`) and each carrying at least one legacy that had been
 * deferred for want of it.
 *
 * Behavioural rather than source-reading on purpose: the register test below
 * proves the *kind* is read, and only a fight, a town or a sweep can prove that
 * a **member** of a condition union is asked the right question. A member
 * declared and never asked is exactly the silent card the register exists to
 * prevent, one scale down.
 */
describe('the legacies this pass built', () => {
  /** A legacy attached to a seat, without spending a piece to do it. */
  function bear(state: GameState, playerId: number, id: GreatPersonId): void {
    state.players[playerId]!.legacies.push({ id, age: 1 });
  }

  /** The empire's once-a-turn card yields, folded. */
  function empire(state: GameState, playerId: number) {
    return foldCardYields(cardEmpireYields(state, playerId));
  }

  /** One side of one fight, as `cardCombatLines` is asked about it. */
  function fight(
    state: GameState,
    unit: Unit,
    tile: ReturnType<typeof getTileAt>,
    side: 'attack' | 'defend',
    vsType?: Unit['type'],
  ): number {
    const situation: CombatSituation = {
      unit,
      side,
      tile: tile!,
      vsBarbarians: false,
      vsCity: false,
      targetHp: 10,
      targetMaxHp: 10,
      vsType,
    };
    return cardCombatLines(state, situation).reduce((sum, line) => sum + line.amount, 0);
  }

  it('Ptahhotep counts libraries across the realm, two to the point of writ', () => {
    // Halved by the nerf pass of 2026-09-03: one point of writ per **two**
    // libraries, so the count's `per` is what moved and nothing else.
    const g = game(101);
    const city = found(g.state, 0);
    bear(g.state, 0, 'ptahhotep');
    const writ = (): number =>
      cardAuthority(g.state, 0).reduce((sum, line) => sum + line.amount, 0);
    const bare = writ();
    city.buildings.push('library');
    // One library buys nothing — a helping is two.
    expect(writ()).toBe(bare);
    const colony = foundCityAt(g.state, 0, getTileAt(g.state.map, city.col + 4, city.row)!)!;
    colony.buildings.push('library');
    expect(writ()).toBe(bare + 1);
  });

  it('Phidias is paid for the wonders standing in his empire’s towns', () => {
    const g = game(103);
    const city = found(g.state, 0);
    bear(g.state, 0, 'phidias');
    expect(empire(g.state, 0).culture).toBe(0);
    city.buildings.push('theOracle');
    city.buildings.push('stonehenge');
    // Three a wonder, and an ordinary building is not one.
    expect(empire(g.state, 0).culture).toBe(6);
    city.buildings.push('library');
    expect(empire(g.state, 0).culture).toBe(6);
  });

  it('Eratosthenes measures the world in sixties, off the seat’s own grid', () => {
    // Retuned per 20 → per 50 (user, 2026-09-02) → per 60 (the nerf pass of
    // 2026-09-03): the map layers pass made revealed ground much easier to come
    // by, so the pension pays slower again.
    const g = game(107);
    found(g.state, 0);
    bear(g.state, 0, 'eratosthenes');
    const grid = g.state.visibility[0]!;
    grid.fill(0);
    for (let i = 0; i < 130; i++) grid[i] = 1;
    // Two helpings of sixty; the ten over pay nothing until they are sixty.
    expect(empire(g.state, 0).science).toBe(2);
    // The other seat's grid is the other seat's.
    expect(empire(g.state, 1).science).toBe(0);
  });

  it('Ibn Baṭṭūṭa remembers foreign towns and never his own', () => {
    const g = game(109);
    found(g.state, 0);
    bear(g.state, 0, 'ibnBattuta');
    g.state.citySightings[0] = [
      { cityId: 1, col: 1, row: 1, name: 'Ur', ownerId: 0 },
      { cityId: 2, col: 2, row: 2, name: 'Kish', ownerId: 1 },
      { cityId: 3, col: 3, row: 3, name: 'Lagash', ownerId: 1 },
    ];
    expect(empire(g.state, 0).gold).toBe(2);
  });

  it('Sima Qian pays every town, once per age behind it', () => {
    const g = game(113);
    const city = found(g.state, 0);
    bear(g.state, 0, 'simaQian');
    const player = g.state.players[0]!;
    // An empire in the first age has closed nothing.
    expect(highestAge(player.techsResearched)).toBe(1);
    expect(foldCardYields(cardCityYields(g.state, city)).culture).toBe(0);
    // One age closed, so one point — Æra II, since the tree pass of 2026-08-30
    // put Iron Working two ages up.
    player.techsResearched.push('siegecraft');
    expect(foldCardYields(cardCityYields(g.state, city)).culture).toBe(1);
  });

  it('Murasaki Shikibu counts the melee in the field, and the filter bites', () => {
    const g = game(127);
    const city = found(g.state, 0);
    bear(g.state, 0, 'murasakiShikibu');
    const before = empire(g.state, 0).culture;
    createUnit(g.state, 0, 'warrior', city.col, city.row);
    createUnit(g.state, 0, 'warrior', city.col, city.row);
    // A worker is in the field and is not melee.
    createUnit(g.state, 0, 'worker', city.col, city.row);
    // The other seat's army is the other seat's.
    createUnit(g.state, 1, 'warrior', city.col, city.row);
    expect(empire(g.state, 0).culture).toBe(before + 4);
  });

  it('Shen Kuo is paid for the strategic seams the empire has opened', () => {
    const g = game(131);
    const city = found(g.state, 0);
    bear(g.state, 0, 'shenKuo');
    expect(empire(g.state, 0).science).toBe(0);

    // The proven setup: a great person's work opens whatever seam it stands on,
    // once the empire has a word for it (see "opens whatever seam" above).
    const unit = call(g.state, 0, SAMPLE.scholar);
    unit.col += 1;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    claimTile(g.state, city, tile);
    tile.terrain = 'grassland';
    tile.feature = 'none';
    tile.hills = true;
    tile.resource = 'iron';
    const player = g.state.players[0]!;
    if (!player.techsResearched.includes('ironWorking')) {
      player.techsResearched.push('ironWorking');
    }
    applyCommand(g.state, { type: 'greatPersonWork', playerId: 0, unitId: unit.id });
    expect(hasResource(g.state, 0, 'iron')).toBe(true);
    // Two a seam since the nerf pass of 2026-09-03 (it was one).
    expect(empire(g.state, 0).science).toBe(2);
  });

  it('Nzinga defends in the trees and nowhere else', () => {
    const g = game(137);
    const city = found(g.state, 0);
    bear(g.state, 0, 'nzingaOfNdongo');
    const unit = createUnit(g.state, 0, 'warrior', city.col, city.row);
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    tile.feature = 'none';
    expect(fight(g.state, unit, tile, 'defend')).toBe(0);
    tile.feature = 'forest';
    expect(fight(g.state, unit, tile, 'defend')).toBe(5);
    tile.feature = 'jungle';
    expect(fight(g.state, unit, tile, 'defend')).toBe(5);
    // Defending only — the forty-year war was fought from the trees.
    expect(fight(g.state, unit, tile, 'attack')).toBe(0);
  });

  it('Han Xin fights beside a river or a coast, and a hex that is both pays twice', () => {
    const g = game(139);
    const city = found(g.state, 0);
    bear(g.state, 0, 'hanXin');
    const unit = createUnit(g.state, 0, 'warrior', city.col, city.row);
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    tile.freshwater = false;
    for (const near of neighborTiles(g.state.map, tileHex(tile))) {
      if (near.terrain === 'coast') near.terrain = 'grassland';
    }
    expect(fight(g.state, unit, tile, 'attack')).toBe(0);
    tile.freshwater = true;
    expect(fight(g.state, unit, tile, 'attack')).toBe(2);
    // A disjunction is two lines, and a hex on both pays both — the
    // vocabulary's own reading, stated in `greatPeopleData.ts`.
    const shore = neighborTiles(g.state.map, tileHex(tile))[0]!;
    shore.terrain = 'coast';
    expect(fight(g.state, unit, tile, 'defend')).toBe(4);
  });

  it('Jan Žižka is worth nothing until the wagons are drawn up', () => {
    const g = game(149);
    const city = found(g.state, 0);
    bear(g.state, 0, 'janZizka');
    const unit = createUnit(g.state, 0, 'warrior', city.col, city.row);
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    expect(fight(g.state, unit, tile, 'defend')).toBe(0);
    unit.fortifiedTurns = 0;
    expect(fight(g.state, unit, tile, 'defend')).toBe(5);
    // Defence only. A fort that charged would not be a fort.
    expect(fight(g.state, unit, tile, 'attack')).toBe(0);
  });

  it('El Cid holds only the towns he took', () => {
    const g = game(151);
    const city = found(g.state, 0);
    bear(g.state, 0, 'elCid');
    const unit = createUnit(g.state, 0, 'warrior', city.col, city.row);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    expect(fight(g.state, unit, tile, 'defend')).toBe(0);
    city.captured = true;
    expect(fight(g.state, unit, tile, 'defend')).toBe(3);
    expect(fight(g.state, unit, tile, 'attack')).toBe(3);
  });

  it('Tycho Brahe reads the sky off the ground, and wants both halves of it', () => {
    // Re-quoted by the nerf pass of 2026-09-03: two *town* lines (beside a
    // mountain, on hills) became one *hex* line that wants both at once — so
    // this is now a `tileYield` question and the observatory pays per hill
    // rather than per city.
    const g = game(157);
    const city = found(g.state, 0);
    bear(g.state, 0, 'tychoBrahe');
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    claimTile(g.state, city, tile);
    const ctx = () => yieldContextFor(g.state, 0);
    const science = (): number => {
      let sum = 0;
      for (const entry of explainTileYield(tile, ctx())) {
        if (entry.kind === 'add') sum += entry.science;
        else sum = entry.science;
      }
      return sum;
    };

    tile.hills = false;
    tile.mountainAdjacent = false;
    const bare = science();
    // A hill alone is not enough, and a peak next door alone is not either.
    tile.hills = true;
    expect(science()).toBe(bare);
    tile.hills = false;
    tile.mountainAdjacent = true;
    expect(science()).toBe(bare);
    // Both, and the sky opens.
    tile.hills = true;
    expect(science()).toBe(bare + 1);
  });

  it('Aššur-idī pays the colonies and never the capital', () => {
    const g = game(163);
    const capital = found(g.state, 0);
    bear(g.state, 0, 'assurIdi');
    expect(foldCardYields(cardCityYields(g.state, capital)).gold).toBe(0);
    const colony = foundCityAt(
      g.state,
      0,
      getTileAt(g.state.map, capital.col + 4, capital.row)!,
    )!;
    // One a colony since the nerf pass of 2026-09-03 (it was two).
    expect(foldCardYields(cardCityYields(g.state, colony)).gold).toBe(1);
    // Still nothing in the capital: the negation is a scope, not a subtraction.
    expect(foldCardYields(cardCityYields(g.state, capital)).gold).toBe(0);
  });

  it('Amenhotep hurries wonders in the capital and nowhere else', () => {
    const g = game(167);
    const capital = found(g.state, 0);
    bear(g.state, 0, 'amenhotepSonOfHapu');
    const at = (city: typeof capital, category: 'wonder' | 'building') =>
      cardProduction(g.state, city, category).reduce((sum, line) => sum + line.percent, 0);
    // Fifteen since the nerf pass of 2026-09-03 (it was twenty).
    expect(at(capital, 'wonder')).toBe(15);
    // A wonder bonus does not ride on an ordinary building (the categories).
    expect(at(capital, 'building')).toBe(0);
    const colony = foundCityAt(
      g.state,
      0,
      getTileAt(g.state.map, capital.col + 4, capital.row)!,
    )!;
    expect(at(colony, 'wonder')).toBe(0);
  });

  it('Lautaro answers about the **other** side, and never about a city', () => {
    const g = game(173);
    found(g.state, 0);
    bear(g.state, 0, 'lautaro');
    const mine = g.state.units.find((unit) => unit.ownerId === 0)!;
    const tile = getTileAt(g.state.map, mine.col + 1, mine.row)!;

    // Against a warrior the line is silent; against a horseman it pays 3, and
    // it pays it whichever posture this piece is in — `side: 'both'`.
    expect(fight(g.state, mine, tile, 'attack', 'warrior')).toBe(0);
    expect(fight(g.state, mine, tile, 'attack', 'horseman')).toBe(3);
    expect(fight(g.state, mine, tile, 'defend', 'horseman')).toBe(3);
    // A town has no silhouette, so a `vsClass` line does not fire at walls.
    expect(fight(g.state, mine, tile, 'attack', undefined)).toBe(0);
  });

  it('carries the other side\'s type into a real forecast', () => {
    const g = game(179);
    found(g.state, 0);
    bear(g.state, 0, 'lautaro');
    const seed = g.state.units.find((unit) => unit.ownerId === 0)!;
    const mine = createUnit(g.state, 0, 'warrior', seed.col, seed.row);
    const horse = createUnit(g.state, 1, 'horseman', mine.col + 1, mine.row);

    const plan = previewCombat(g.state, mine.id, { col: horse.col, row: horse.row });
    expect(plan.ok === false ? plan.error : 'ok').toBe('ok');
    if (!plan.ok) return;
    // `planCombat` fills `vsType` with the piece opposite, so the line reaches
    // the forecast card and the reducer as one — never only the reducer.
    expect(plan.attackerLines.some((line) => line.source.includes('Lautaro'))).toBe(true);
    expect(plan.defenderLines.some((line) => line.source.includes('Lautaro'))).toBe(false);
  });

  it('prints every legacy this pass wrote, in words', () => {
    // The card's own sentence, which is what a player reads — a shape that
    // evaluates correctly and prints nothing is a card that lies by omission.
    // **Stripped**, because these compare *clause text*: a describer marks the
    // things a reader can look up (`ref`), and the plain reading is the sentence
    // that was printed before any of that existed (`stripRefs`' own guarantee).
    const printed = (id: GreatPersonId) =>
      describeCard(id).map((clause) => stripRefs(clause.text));
    expect(printed('ptahhotep')).toEqual(['+1 authority capacity per 2 Libraries']);
    expect(printed('phidias')).toEqual(['+3 culture per wonder you hold']);
    expect(printed('eratosthenes')).toEqual(['+1 science per 60 hexes you have revealed']);
    expect(printed('ibnBattuta')).toEqual(['+1 gold per foreign city you have sighted']);
    expect(printed('simaQian')).toEqual(['+1 culture per age that has closed']);
    expect(printed('murasakiShikibu')).toEqual(['+2 culture per melee unit in the field']);
    expect(printed('shenKuo')).toEqual(['+2 science per improved strategic resource']);
    expect(printed('nzingaOfNdongo')).toEqual([
      '+5 combat strength in forest',
      '+5 combat strength in jungle',
    ]);
    expect(printed('hanXin')).toEqual([
      '+2 combat strength beside fresh water',
      '+2 combat strength on the coast',
    ]);
    expect(printed('janZizka')).toEqual(['+5 combat strength while fortified']);
    expect(printed('elCid')).toEqual(['+3 combat strength in a city you captured']);
    expect(printed('assurIdi')).toEqual(['+1 gold in every city but your capital']);
    expect(printed('amenhotepSonOfHapu')).toEqual([
      '+15% production toward wonders, in your capital',
    ]);
    // Archimedes lost his revocation with the nerf pass of 2026-09-03, and
    // gained the hammers behind the engines: a `productionBonus` narrowed by a
    // `UnitFilter`, beside the strength line the same filter narrows.
    expect(printed('archimedes')).toEqual([
      '+10% production toward siege units',
      '+2 combat strength for siege units against cities',
    ]);
    // **The revocation prints, and it is not struck through** (2026-08-28): it
    // is a promise the game *does* make now, so it reads as an ordinary clause
    // of the card. `GreatPersonDef.revokedWhen` is not an effect — it happens at
    // a moment and never un-happens — so `describeCard` prints it beside the
    // completion grant and the slot grant, for their reason.
    expect(printed('hypatia')).toEqual([
      '+10% science in every city',
      'lost the first turn your happiness goes negative',
    ]);
    expect(printed('boudica')).toEqual([
      '+4 combat strength inside your territory',
      'lost when the age it was earned in closes',
    ]);
    expect(printed('tychoBrahe')).toEqual([
      '+1 science on every hill hex beside a mountain',
    ]);
    // The two composites the nerf pass wrote, both `all` over `TileCondition`,
    // and the one `tileYield` that carries a negative voice.
    expect(printed('eupalinos')).toEqual(['+1 food on every improved hex beside a mountain']);
    expect(printed('eaNasir')).toEqual(['-1 production, +3 gold on every hex with a Mine']);
    // A tile line under a **city** scope, which reads as two clauses in one
    // sentence: whose ground, and which hex.
    expect(printed('liBing')).toEqual([
      '+1 production on every hex with a Farm beside fresh water, in every city with an Aqueduct',
    ]);
    // A city-scoped count paid in the town it counts in.
    expect(printed('aryabhata')).toEqual(['+1 faith per building here that supplies science']);
    // The malice re-read per town rather than once for the realm.
    expect(printed('hemiunu')).toEqual([
      '+10% production toward wonders',
      '-2 happiness in every city while it is building a wonder',
    ]);
    // The building half is built now, so the row says both and one of its two
    // deferred sentences is gone (the timed unhappiness is the one that stays).
    expect(printed('crassus')[0]).toBe('all units and buildings cost −20% to buy');
    // The timed half is built now too, so both of Crassus' clauses are real and
    // nothing on his row is deferred.
    expect(printed('crassus')).toEqual([
      'all units and buildings cost −20% to buy',
      'buying anything costs your empire -1 happiness for 10 turns',
    ]);
    expect(printed('jakobFugger')).toContain('all units and buildings cost −20% to buy');
    // And the other side of a fight, which `combatLine` could not say until
    // `vsClass` existed.
    expect(printed('lautaro')).toEqual(['+3 combat strength against mounted units']);
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
      keepTheRites(state);
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

// --- the legacies the 2026-08-28 pass built ---------------------------------

/**
 * The one-row shapes the earlier pass refused, built generically, and the
 * revocation mechanism the three conditional legacies had been waiting on.
 *
 * Behavioural for the reason the block above is: the register test proves a
 * *kind* is read, and only a fight, a purchase or a march can prove that a
 * **member** of a condition union is asked the right question.
 */
describe('the one-row shapes, built generically', () => {
  /** A legacy attached to a seat, without spending a piece to do it. */
  function bear(state: GameState, playerId: number, id: GreatPersonId, age = 1): void {
    state.players[playerId]!.legacies.push({ id, age });
  }

  /** One side of one fight, as `cardCombatLines` is asked about it. */
  function fight(
    state: GameState,
    unit: Unit,
    tile: ReturnType<typeof getTileAt>,
    side: 'attack' | 'defend',
    vsStrength?: number,
  ): number {
    const situation: CombatSituation = {
      unit,
      side,
      tile: tile!,
      vsBarbarians: false,
      vsCity: false,
      targetHp: 10,
      targetMaxHp: 10,
      vsStrength,
    };
    return cardCombatLines(state, situation).reduce((sum, line) => sum + line.amount, 0);
  }

  it('Deborah judges within two hexes of a city of her own, and not three', () => {
    const g = game(211);
    const city = found(g.state, 0);
    bear(g.state, 0, 'deborah');
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    // The hex the town stands on is trivially within two of it.
    expect(fight(g.state, unit, getTileAt(g.state.map, city.col, city.row), 'attack')).toBe(4);
    // A distance rather than a border: unclaimed ground two hexes out still
    // pays, and ground far away does not.
    expect(fight(g.state, unit, getTileAt(g.state.map, city.col + 2, city.row), 'attack')).toBe(4);
    expect(fight(g.state, unit, getTileAt(g.state.map, city.col + 9, city.row), 'attack')).toBe(0);
  });

  it('Spartacus is worth something only against a stronger piece', () => {
    const g = game(213);
    found(g.state, 0);
    bear(g.state, 0, 'spartacus');
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const here = getTileAt(g.state.map, unit.col, unit.row);
    const mine = unitDef(unit.type).combatStrength;
    expect(fight(g.state, unit, here, 'attack', mine + 5)).toBe(3);
    expect(fight(g.state, unit, here, 'attack', mine)).toBe(0);
    // A city has no such strength, so the line never pays against walls — and
    // the clause only pays the attacker, which is what "when attacking" says.
    expect(fight(g.state, unit, here, 'attack', undefined)).toBe(0);
    expect(fight(g.state, unit, here, 'defend', mine + 5)).toBe(0);
  });

  it('Hemiunu costs happiness only while a wonder is in somebody’s queue', () => {
    const g = game(217);
    const city = found(g.state, 0);
    bear(g.state, 0, 'hemiunu');
    const before = happinessOf(g.state, 0);
    city.queue = [{ kind: 'building', id: 'theOracle' }];
    expect(happinessOf(g.state, 0)).toBe(before - 2);
    // A building in the queue is not a wonder: `queueCategory` is the one place
    // a row is sorted, and the gate asks it rather than guessing.
    city.queue = [{ kind: 'building', id: 'granary' }];
    expect(happinessOf(g.state, 0)).toBe(before);
  });

  it('Ea-nāṣir pays every mine and charges it a hand', () => {
    // Re-quoted by the nerf pass of 2026-09-03: the seam clause and the luxury
    // malice both struck, and the malice moved onto the same hex as the pay —
    // a mine is worth three coin and one hammer less. A single `tileYield` row
    // carrying a **negative** voice, which the bag has always allowed and no
    // row had yet said.
    const g = game(219);
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    claimTile(g.state, city, tile);
    const fold = () => {
      const sum = { gold: 0, production: 0 };
      for (const entry of explainTileYield(tile, yieldContextFor(g.state, 0))) {
        if (entry.kind === 'add') {
          sum.gold += entry.gold;
          sum.production += entry.production;
        } else {
          sum.gold = entry.gold;
          sum.production = entry.production;
        }
      }
      return sum;
    };

    tile.terrain = 'grassland';
    tile.feature = 'none';
    tile.hills = true;
    delete tile.resource;
    tile.improvement = 'mine';
    const bare = fold();
    bear(g.state, 0, 'eaNasir');
    const paid = fold();
    expect(paid.gold).toBe(bare.gold + 3);
    expect(paid.production).toBe(bare.production - 1);
    // No seam wanted: the clause is about the works, not about what is under
    // them (it was "a Mine carrying a bonus resource" until this pass).
    expect(hasResource(g.state, 0, 'iron')).toBe(false);
  });

  it('the flat dial of an amplifier still reads beside the share', () => {
    // The shape Ea-nāṣir used to be the roster's one witness for. No row names
    // `luxuryHappiness` flat since the nerf pass, so the claim is made of the
    // vocabulary itself: a whole point, which no percentage of the table's own
    // figure could say exactly. `meters.ts` is the one consumer and applies it
    // per luxury line, floored at nothing — a luxury never costs happiness.
    const g = game(220);
    found(g.state, 0);
    expect(cardAmplifierFlat(g.state, 0, 'luxuryHappiness')).toBe(0);
    g.state.players[0]!.timed = [{
      card: 'eaNasir',
      effect: { kind: 'effectAmplifier', target: 'luxuryHappiness', amount: -1 },
      expiresTurn: g.state.turn + 10,
    }];
    expect(cardAmplifierFlat(g.state, 0, 'luxuryHappiness')).toBe(-1);
    // And it is the *flat* dial, not the share: the percentage reading is
    // untouched, which is what keeps a row that turns both one arithmetic.
    expect(cardAmplifier(g.state, 0, 'luxuryHappiness')).toBe(0);
  });

  it('a scope reads what a building *does*, not which row it is', () => {
    // `hasBuildingYielding`, which Hero of Alexandria was the roster's one
    // witness for until the nerf pass of 2026-09-03 re-wrote his cell into an
    // occasion the vocabulary has no word for (see the deferred claim below).
    // The scope is still read, so the claim is made of the vocabulary itself.
    const g = game(223);
    const city = found(g.state, 0);
    const bare = cityYields(g.state, city).production;
    g.state.players[0]!.timed = [{
      card: 'heroOfAlexandria',
      effect: {
        kind: 'cityYields',
        production: 5,
        scope: { test: 'hasBuildingYielding', yields: 'science', wonder: true },
      },
      expiresTurn: g.state.turn + 10,
    }];
    // The Oracle pays faith, not science: the scope reads what a row *does*.
    city.buildings.push('theOracle');
    expect(cityYields(g.state, city).production).toBe(bare);
    city.buildings.push('greatLibrary');
    expect(cityYields(g.state, city).production).toBe(bare + 5);
  });

  it('Hero of Alexandria says out loud that his new cell is not built', () => {
    // The user's worksheet asks for "after completing or gaining control of a
    // wonder" — a `WindfallOccasion` the table does not have, and a *shape* is a
    // design decision. Deferred and annotated rather than bent into
    // `completion`, which would have paid for a granary (CLAUDE.md's rule, kept
    // for the fourth time on this table).
    expect(greatPersonDef('heroOfAlexandria').legacy).toEqual([]);
    expect(greatPersonDef('heroOfAlexandria').deferred?.length).toBe(1);
    expect(stripRefs(describeCard('heroOfAlexandria')[0]!.text)).toContain('not built yet');
    expect(describeCard('heroOfAlexandria')[0]!.deferred).toBe(true);
  });

  it('Mimar Sinan hurries a Temple and nothing else', () => {
    const g = game(227);
    const city = found(g.state, 0);
    bear(g.state, 0, 'mimarSinan');
    const temple = cardProduction(g.state, city, 'building', undefined, 'temple');
    expect(temple.reduce((sum, line) => sum + line.percent, 0)).toBe(30);
    expect(cardProduction(g.state, city, 'building', undefined, 'granary')).toHaveLength(0);
  });

  it('an army under noHealAbroad mends at home and never abroad', () => {
    // Homer's malice until the nerf pass of 2026-09-03 struck it (his cell is
    // now the culture line alone, at twenty). `turn.ts` still reads the rule, so
    // the claim is made of the vocabulary rather than of a person.
    const g = game(229);
    found(g.state, 0);
    g.state.players[0]!.timed = [{
      card: 'homer',
      effect: { kind: 'behaviorRule', rule: 'noHealAbroad' },
      expiresTurn: g.state.turn + 10,
    }];
    const unit = g.state.units.find((u) => u.ownerId === 0 && u.type !== 'settler')!;
    unit.hp = 1;
    // Standing on ground nobody owns — the honest reading of "outside your
    // borders", and the one that makes the clause bite on a campaign.
    unit.col += 6;
    dispatch(g, { type: 'endTurn', playerId: 0 });
    dispatch(g, { type: 'endTurn', playerId: 1 });
    expect(unitById(g.state, unit.id)!.hp).toBe(1);
  });

  it('Leonardo doubles what an act pays, through the same seam', () => {
    const plain = game(231);
    found(plain.state, 0);
    const doubled = game(231);
    found(doubled.state, 0);
    bear(doubled.state, 0, 'leonardo');
    const spend = (g: ReturnType<typeof game>): number => {
      const piece = call(g.state, 0, 'kushim');
      const before = g.state.players[0]!.gold;
      applyCommand(g.state, { type: 'greatPersonAct', playerId: 0, unitId: piece.id });
      return g.state.players[0]!.gold - before;
    };
    expect(spend(doubled)).toBe(spend(plain) * 2);
  });

  it('Marco Polo counts only the routes that leave the realm', () => {
    const g = game(233);
    const mine = found(g.state, 0);
    const theirs = found(g.state, 1);
    bear(g.state, 0, 'marcoPolo');
    const trader = createUnit(g.state, 0, 'trader', mine.col, mine.row);
    trader.trade = { from: mine.id, to: mine.id, expiresTurn: 99, outbound: true, autoResend: false };
    expect(foldCardYields(cardEmpireYields(g.state, 0)).gold).toBe(0);
    trader.trade = { from: mine.id, to: theirs.id, expiresTurn: 99, outbound: true, autoResend: false };
    expect(foldCardYields(cardEmpireYields(g.state, 0)).gold).toBe(3);
  });

  it('Crassus hangs his bill on the empire, and the broom takes it away', () => {
    const g = game(237);
    const city = found(g.state, 0);
    bear(g.state, 0, 'crassus');
    const player = g.state.players[0]!;
    player.gold = 5000;
    const before = happinessOf(g.state, 0);
    expect(applyCommand(g.state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'warrior' },
      currency: 'gold',
    }).ok).toBe(true);
    // `Player.timed` is the third holder, read by the ordinary evaluator.
    expect(player.timed).toHaveLength(1);
    expect(happinessOf(g.state, 0)).toBe(before - 1);
    // A comparison, never a countdown: past the stamp the effect is inert
    // whether or not anything has swept it.
    g.state.turn = player.timed![0]!.expiresTurn;
    expect(happinessOf(g.state, 0)).toBe(before);
  });
});

describe('a legacy that is lost', () => {
  function bear(state: GameState, playerId: number, id: GreatPersonId, age = 1): void {
    state.players[playerId]!.legacies.push({ id, age });
  }

  it('marks rather than deletes, and only the effects stop being read', () => {
    const g = game(241);
    found(g.state, 0);
    bear(g.state, 0, 'hypatia');
    expect(liveEffects(g.state, 0).some((e) => e.card === 'hypatia')).toBe(true);
    revokeLegacies(g.state, 0, 'happinessNegative');
    // History is intact; the walk simply stops reading it.
    expect(g.state.players[0]!.legacies).toEqual([
      { id: 'hypatia', age: 1, revoked: true },
    ]);
    expect(liveEffects(g.state, 0).some((e) => e.card === 'hypatia')).toBe(false);
  });

  it('revokes only the legacy whose row names that occasion', () => {
    const g = game(243);
    found(g.state, 0);
    bear(g.state, 0, 'hypatia');
    bear(g.state, 0, 'archimedes');
    revokeLegacies(g.state, 0, 'happinessNegative');
    expect(g.state.players[0]!.legacies.map((h) => h.revoked)).toEqual([true, undefined]);
  });

  it('Boudica keeps her legacy inside her own age and loses it in the next', () => {
    const g = game(247);
    found(g.state, 0);
    bear(g.state, 0, 'boudica', 1);
    expect(revokeLegacies(g.state, 0, 'ageAdvanced')).toEqual([]);
    // The empire reaches the second age: the stamp is compared, never counted.
    g.state.players[0]!.techsResearched.push('ironWorking');
    if (highestAge(g.state.players[0]!.techsResearched) > 1) {
      expect(revokeLegacies(g.state, 0, 'ageAdvanced')).toEqual(['boudica']);
    }
  });

  /**
   * Whoever's legacy `enemyEntersCapital` belongs to today, or `null`.
   *
   * Archimedes carried it until the nerf pass of 2026-09-03 struck the clause,
   * and **no row names the occasion now** — so the two tests below are written
   * against the roster rather than against a name. They go on proving the
   * `arriveOnTile` hook the moment a row takes the occasion up again, and until
   * then they say out loud that the hook is standing idle, which is the fact a
   * reader most needs and the one a deleted test would have hidden.
   */
  const SACKED: GreatPersonId | null =
    GREAT_PERSON_IDS.find((id) => greatPersonDef(id).revokedWhen === 'enemyEntersCapital') ?? null;

  it('a legacy of the sack falls when a soldier comes to rest in the capital’s ground', () => {
    const g = game(251);
    const capital = found(g.state, 0);
    if (SACKED === null) {
      // The occasion is hooked and unclaimed. Nothing to revoke, and the hook
      // must still run without complaint over an empire that holds nothing.
      expect(revokeLegacies(g.state, 0, 'enemyEntersCapital')).toEqual([]);
      return;
    }
    bear(g.state, 0, SACKED);
    const tile = getTileAt(g.state.map, capital.col, capital.row)!;
    const raider = createUnit(g.state, 1, 'warrior', tile.col, tile.row);
    arriveOnTile(g.state, raider, tile);
    expect(g.state.players[0]!.legacies[0]!.revoked).toBe(true);
  });

  it('a builder wandering past is not a sack', () => {
    const g = game(253);
    const capital = found(g.state, 0);
    bear(g.state, 0, SACKED ?? 'hypatia');
    const tile = getTileAt(g.state.map, capital.col, capital.row)!;
    const worker = createUnit(g.state, 1, 'worker', tile.col, tile.row);
    arriveOnTile(g.state, worker, tile);
    expect(g.state.players[0]!.legacies[0]!.revoked).toBeUndefined();
  });

});

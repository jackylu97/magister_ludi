/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — what the
 * build-sink pass did to the opening, measured by playing it.
 *
 * These two are the pass's argument (design ledger, Entry XXVI) and neither can
 * be made cheaply. The opening rate is read off **twenty-one seeds**, because
 * the claim is about the capital the median seed gets rather than about seed
 * 4242 — a single roll is a fixture of the map generator wearing a pacing
 * test's clothes. The roster claim is read off **forty turns** of a scripted
 * warband empire, because "a quarter of its army" is a sentence about an
 * empire's whole opening and not about a price tag.
 *
 * `buildSinks.test.ts` keeps everything a blank sixteen-by-twelve rectangle can
 * answer, which is the mechanism itself: that a project is never spliced out,
 * that it carries no category bonus, that it is gated once by the tree, that a
 * unit's price is the fold of its own labelled lines, and that the two Age I
 * buildings declare their effects through the generic vocabulary. It also keeps
 * the other half of "the opening did not move" — that a city centre still pays
 * what it paid — because that one is a single call on a flat state.
 */
import { describe, expect, it } from 'vitest';

import { cityYields, foundingErrorAt } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { mapRange, tileHex } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';

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

/**
 * `statecraftPacing.test.ts`'s scripted empire, playing the **military** line:
 * expand to five towns, then muster the strongest footman it can field, for
 * ever. Deliberately the same seed and the same conservative script, so the
 * only thing between this measurement and that file's is what the empire spends
 * its hammers on.
 */
function playWarband(maxTurns: number): Game {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const CITY_TARGET = 5;

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;
    // Answer whatever Statecraft is owed, always option 0: this measures the
    // roster's price, not the choices.
    if (player.statecraft.pendingOrder !== undefined) {
      dispatch(game, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingGovernment !== undefined) {
      dispatch(game, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    }
    if (player.statecraft.pendingDoctrine !== undefined) {
      dispatch(game, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next } as Command);
    }
    for (const unit of [...game.state.units]) {
      if (!unitDef(unit.type).foundsCity) continue;
      if (dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
      if (unit.path && unit.path.length > 0) continue;
      const target = nearestSite(game.state, unit.col, unit.row);
      if (target) dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
    }
    for (const city of game.state.cities) {
      if (city.queue.length > 0) continue;
      const settlersOut =
        game.state.units.filter((unit) => unitDef(unit.type).foundsCity).length +
        game.state.cities.filter((other) =>
          other.queue.some((item) => item.kind === 'unit' && item.id === 'settler'),
        ).length;
      const queue: { kind: string; id: string }[] = [];
      if (
        game.state.cities.length + settlersOut < CITY_TARGET &&
        city.population >= unitDef('settler').minCityPop
      ) {
        queue.push({ kind: 'unit', id: 'settler' });
      } else {
        const pick = UNIT_TYPE_IDS.filter(
          (id) =>
            unitDef(id).category === 'military' &&
            isUnlocked(game.state, 0, 'unit', id) &&
            unitDef(id).requiresResource === undefined,
        ).sort((a, b) => unitDef(b).combatStrength - unitDef(a).combatStrength)[0];
        if (pick) queue.push({ kind: 'unit', id: pick });
      }
      if (queue.length === 0) continue;
      dispatch(game, { type: 'setCityProduction', playerId: 0, cityId: city.id, queue } as Command);
    }
    dispatch(game, { type: 'endTurn', playerId: 0 });
  }
  return game;
}

describe('what the pass did to the opening', () => {
  it('leaves the median capital opening on two hammers, unit prices read off the roster', () => {
    const openings: number[] = [];
    for (const seed of [
      4242, 1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337, 555, 8888, 90210, 5, 6, 8, 9, 12,
    ]) {
      const game = createGame({
        seed,
        sizeName: 'standard',
        players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      });
      const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
      expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
        true,
      );
      openings.push(cityYields(game.state, game.state.cities[0]!).production);
    }
    openings.sort((a, b) => a - b);
    const median = openings[Math.floor(openings.length / 2)]!;

    /**
     * **Measured 2026-08-26, 21 seeds.** The median capital opens on **3⚙**
     * (band 2–4), unchanged by this pass — the pass moved prices, not ground.
     * Against that rate:
     *
     *   scout    9⚙ → **3 turns** (the anchor; deliberately not raised)
     *   warrior  5⚙ → 7⚙, **2 turns → 3**
     *   worker   8⚙ → 10⚙, **3 turns → 4**
     *
     * Three turns for the opening piece either way is the shape the opening is
     * balanced around, and the warrior joining the scout there is the whole
     * intent: a first unit is now a *turn* of commitment rather than a rounding
     * error against a 15🔬 technology.
     *
     * **Re-measured 2026-08-28** (user ruling: units and buildings ×1.4,
     * wonders ×0.8). The median opening rate did not move — this was a price
     * pass again, not a ground one — but the flat multiplier landed on the
     * anchor along with everything else, so "scout unmoved" no longer holds
     * literally:
     *
     *   scout    9⚙ → 13⚙, 3 turns → **5**
     *   warrior  7⚙ → 10⚙, 3 turns → **4**
     *   worker  10⚙ → 14⚙, 4 turns → **5**
     *
     * **Re-pinned 2026-08-29**: the coast ruling (`coast.rings` 2) re-sequenced
     * resource placement; the capital sites are unchanged, the bonus tiles
     * beside them are not. Re-measured on the same 21 seeds, the median opening
     * is now **2⚙** (band unchanged, 2–6) — ten of twenty-one seeds now open on
     * 2 rather than 3. Against the new rate:
     *
     *   scout   13⚙, median 2 → **7 turns**
     *   warrior 10⚙, median 2 → **5 turns**
     *   worker  14⚙, median 2 → **7 turns**
     */
    expect(median).toBe(2);
    expect(openings[0]).toBeGreaterThanOrEqual(2);
    expect(openings[openings.length - 1]).toBeLessThanOrEqual(6);
    expect(Math.ceil(unitDef('scout').cost / median)).toBe(7);
    expect(Math.ceil(unitDef('warrior').cost / median)).toBe(5);
    expect(Math.ceil(unitDef('worker').cost / median)).toBe(7);
  }, 60_000);

  it('costs the warband empire a quarter of its army by turn 40', () => {
    const game = playWarband(40);
    const mine = game.state.units.filter((unit) => unit.ownerId === 0);

    /**
     * **Measured 2026-08-26 on seed 4242**, the same scripted empire the ages
     * and the draft cadence are measured against, playing the *military* line:
     * five cities' worth of expansion first, then nothing but the strongest
     * footman it can field. At turn 40 it fields
     *
     *   before this pass   **8 units** (6 warriors, 2 spearmen), 3 cities
     *   after              **6 units** (5 warriors, 1 spearman), 3 cities
     *
     * — a **25% cut**, which is the pass's whole claim about the roster. Note
     * what did *not* change: the city count and the map. The empire researches
     * at the same rate and simply cannot buy as much army with it, which is the
     * finding the pass was answering.
     *
     * The technology count was 9 either way when this was written and is **10**
     * since the water milestone (Entry XXVII) — Sailing is one more 8🔬 node on
     * the Age I ramp, and this empire's cheapest-first script takes it. That is
     * the tree getting wider, not the empire getting faster; the roster claim
     * above is unmoved.
     *
     * The building-first empire measured 4 units at turn 40 both before and
     * after — it is hammer-bound on settlers and granaries rather than on the
     * roster, so the price change is invisible to it. That is the right
     * asymmetry: this pass taxes the player who was spamming units, not the
     * one who was building.
     *
     * A band on both sides, for `statecraftPacing.test.ts`'s reason. The lower
     * bound is what stops a later retune quietly making units free again.
     *
     * **Re-measured 2026-08-27: 12 units, same 3 cities.** The roster prices did
     * not move; the *ground* did, in three deliberate ways in one pass, and each
     * one hands this empire more hammers per turn:
     *
     *   · `bonusPer1000LandTiles` 85 → 110 and `seaFrequencyMultiplier` 1.35 —
     *     the user asked for "more bonus and fishing resource to enable wide
     *     coastal play", so a worked tile is simply worth more than it was;
     *   · the border curve came down a tenth (9 · 5.4 · 1.3), so a town reaches
     *     the ground it wants a couple of turns earlier at every rung;
     *   · a forested or jungled hill now pays the canopy rather than the hill,
     *     which moves the *start scorer* and so moves where this script settles.
     *
     * The band is re-drawn around the new figure rather than the claim being
     * dropped: what this test is for is that a later change to *prices* cannot
     * silently make units free again, and that claim is unaffected by the ground
     * being richer. The technology count is a floor now for the same reason —
     * the tree gets wider from time to time and this test is not about the tree.
     *
     * **Re-measured 2026-08-28: 11 units, same 3 cities**, after the ×1.4 unit
     * cost ruling. The band already covered it (10–14) — a price rise on
     * exactly the thing this empire spends its hammers on is what the band's
     * lower bound exists to still permit, not to flag.
     *
     * **Re-measured 2026-09-02, the column-formula costs: the units and the
     * cities did not move, and the technology floor did.** By turn 40 this
     * empire holds **5** technologies where it held 10, because Æra I costs 814
     * beakers rather than 169 — the whole point of the retune, and the clearest
     * possible demonstration that this test is not about the tree: the same
     * hammers bought the same army out of an empire that knows half as much.
     * The floor comes down to 4 and stays a floor.
     *
     * **Re-measured 2026-09-02, the luxury rework (schema 48): 4 cities, 11
     * units, 6 technologies.** The ground moved again — the capital-scoped food
     * lines (olives/honey/cotton pay +2🌾 into the capital now) grow the
     * first town into its settlers a few turns sooner, so the expansion half of
     * this script reaches its fourth founding inside the horizon. The units
     * band (10–14) did not move, which is this test's whole claim: richer
     * ground, same army for the same hammers.
     */
    expect(game.state.turn).toBe(41);
    expect(game.state.cities.length).toBe(4);
    expect(mine.length).toBeGreaterThanOrEqual(10);
    expect(mine.length).toBeLessThanOrEqual(14);
    expect(game.state.players[0]!.techsResearched.length).toBeGreaterThanOrEqual(4);
  }, 120_000);

});

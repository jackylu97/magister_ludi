/**
 * The measurement Entry XV calls load-bearing: **how often does a draft land.**
 *
 * The target is "~5 turns per draft early", and it is a pacing number rather
 * than a rule — so this file measures it on the same scripted empire the tech
 * tree's ages are measured against (`test/sim/tech.test.ts`), and asserts a band
 * around the measurement rather than the measurement itself. A band on *both*
 * sides, for that file's reason: a curve that got cheaper is as much a
 * regression as one that got dearer, and an upper bound alone would not see it.
 *
 * The empire is deliberately conservative — it never fights, never trades, and
 * builds culture buildings only when the tree hands them over — so a real player
 * chasing culture should beat these numbers rather than miss them. That is the
 * right direction for the one number the whole system's feel rests on.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame, dispatch } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { foundingErrorAt } from '../../src/sim/cities';
import { mapRange, tileHex } from '../../src/sim/map';
import { draftCost } from '../../src/sim/statecraft';
import { GOVERNMENT_TIERS } from '../../src/sim/statecraftData';
import type { GameState } from '../../src/sim/state';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';

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

/** When each draft landed, by tier. `tech.test.ts`'s `playEmpire`, culture-aware. */
function playEmpire(maxTurns: number): { game: Game; draftTurn: number[] } {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const draftTurn: number[] = [];
  const wanted: string[] = ['granary', 'monument', 'shrine', 'library', 'temple', 'market',
    'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university'];
  const CITY_TARGET = 5;

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;

    // Answer whatever Statecraft is owed, first, so the next draft is not held
    // up behind an unanswered one (`settleDraft` refuses while an offer stands).
    // Always option 0 — this measures the *cadence*, not the choices.
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
      const queue: { kind: 'unit' | 'building'; id: string }[] = [];
      for (const id of wanted) {
        if (city.buildings.includes(id as never)) continue;
        if (!isUnlocked(game.state, 0, 'building', id)) continue;
        queue.push({ kind: 'building', id });
      }
      const settlersOut =
        game.state.units.filter((unit) => unitDef(unit.type).foundsCity).length +
        game.state.cities.filter((other) =>
          other.queue.some((item) => item.kind === 'unit' && item.id === 'settler'),
        ).length;
      if (
        game.state.cities.length + settlersOut < CITY_TARGET &&
        city.population >= unitDef('settler').minCityPop
      ) {
        queue.length = 0;
        queue.push({ kind: 'unit', id: 'settler' });
      }
      if (queue.length === 0) continue;
      dispatch(game, { type: 'setCityProduction', playerId: 0, cityId: city.id, queue } as Command);
    }

    const before = player.statecraft.drafts;
    dispatch(game, { type: 'endTurn', playerId: 0 });
    for (let tier = before + 1; tier <= player.statecraft.drafts; tier++) {
      draftTurn[tier - 1] = game.state.turn;
    }
  }
  return { game, draftTurn };
}

describe('the culture ladder', () => {
  it('escalates by draft count and by nothing else', () => {
    // Entry I's third commitment, restated by Entry XV: authority is the only
    // lawful width tax. The curve takes one argument, so a city count cannot
    // reach it — this asserts the shape rather than the promise, because the
    // promise is enforced by the signature.
    expect(draftCost(0)).toBeLessThan(draftCost(1));
    expect(draftCost(1)).toBeLessThan(draftCost(2));
    // Superlinear: the gap between consecutive drafts widens.
    expect(draftCost(10) - draftCost(9)).toBeGreaterThan(draftCost(1) - draftCost(0));
    // Whole numbers all the way down — a pool of integers wants an integer
    // threshold. See `draftCost`.
    for (let n = 0; n < 20; n++) expect(Number.isInteger(draftCost(n))).toBe(true);
  });

  it('hands the scripted empire a draft about every five turns early on', () => {
    const { draftTurn } = playEmpire(120);
    /**
     * **Measured on seed 4242 at `costBase 6 / costLinear 3 / costExponent 2`,
     * re-measured 2026-08-26 after the shrine and the temple moved off culture
     * onto faith:** drafts land on turns 7, 16, 24, 32, 38, 43, 49, 56, 64, 72,
     * 81, 88, 96, 102, 109, 116 — so the three governments are offered on turns
     * **24 / 49 / 109**, against the tech tree's three ages closing on 41 / 80 /
     * 120. Each government still arrives ahead of the age it belongs to, which
     * is Entry XV's "even turn-time between governments" holding on both ladders
     * at once, but the third one now arrives with the age rather than well
     * before it.
     *
     * The early cadence comes out at **7.0 turns per draft** across drafts 1–8
     * (6.6 before the shrine and temple moved), against Entry XV's stated target
     * of ~5, and the gap is worth writing down rather than tuning away. The
     * binding constraint is not the curve: this empire makes about **one culture
     * a turn for its first thirty turns** (one per city, plus a monument it
     * builds behind the granary), so *any* escalating cost yields a 6–7 turn
     * opening cadence for it. Pulling the curve down far enough to hit 5 would
     * make the mid-game cadence 2–3 turns, which is a worse game than a slightly
     * slow opening.
     *
     * **What the faith move cost, exactly.** The first five drafts are
     * *unmoved* (7 / 16 / 24 / 32 / 38): the shrine and the temple are not
     * standing that early under this build order, so the opening is untouched.
     * The drift starts at draft 6 and compounds — draft 6 slips 1 turn, draft 8
     * slips 3, draft 12 slips 9, draft 15 slips 12. Each town that finishes both
     * gives up 3 culture a turn, and an escalating cost turns a constant loss of
     * income into a widening gap rather than a fixed one. Monument and
     * amphitheater are untouched and are now the *whole* of a town's built
     * culture.
     *
     * The five-turn target is reachable, and reaching it is the point: it is
     * what a *culture-focused* empire gets — Boundary Stones, Land Grants and a
     * monument-first build order roughly double this empire's early culture, and
     * doubling the income halves the cadence. Entry XV's own words are that
     * "culture-heavy play races them — that is culture's payoff", so a
     * deliberately conservative scripted empire *should* sit above the target
     * and a player chasing it should land on it.
     */
    expect(draftTurn.length).toBeGreaterThanOrEqual(GOVERNMENT_TIERS.length);

    const first = draftTurn[0]!;
    const eighth = draftTurn[7]!;
    // The opening draft: soon enough that the first government is a real
    // mid-opening decision rather than a late-game footnote. Measured 7.
    expect(first).toBeGreaterThan(3);
    expect(first).toBeLessThan(12);
    // The early cadence — drafts 1 through 8, the stretch Entry XV's "~5 turns
    // per draft early" is about. Measured 7.0; the band is two-sided, because a
    // curve that got cheaper is as much a regression as one that got dearer.
    const earlyCadence = (eighth - first) / 7;
    expect(earlyCadence).toBeGreaterThan(4);
    expect(earlyCadence).toBeLessThan(9);
    // The three government tiers all arrive, and they arrive spread out.
    // Measured 24 / 49 / 109.
    const tiers = GOVERNMENT_TIERS.map((tier) => draftTurn[tier - 1]);
    for (const [index, turn] of tiers.entries()) {
      expect(turn, `government ${index + 1}`).toBeDefined();
    }
    expect(tiers[0]!).toBeGreaterThan(14);
    expect(tiers[0]!).toBeLessThan(34);
    expect(tiers[1]!).toBeGreaterThan(36);
    expect(tiers[1]!).toBeLessThan(60);
    expect(tiers[2]!).toBeGreaterThan(80);
    expect(tiers[2]!).toBeLessThan(115);
  });
});

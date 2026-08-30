/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the measurement
 * Entry XV calls load-bearing: **how often does a draft land.**
 *
 * The target is "~5 turns per draft early", and it is a pacing number rather
 * than a rule — so it is measured on the same scripted empire the tech tree's
 * ages are measured against (`tech.slow.test.ts`), and asserted as a band around
 * the measurement rather than as the measurement itself. A band on *both* sides,
 * because a curve that got cheaper is as much a regression as one that got
 * dearer, and an upper bound alone would not see it.
 *
 * The empire is deliberately conservative — it never fights, never trades, and
 * builds culture buildings only when the tree hands them over — so a real player
 * chasing culture should beat these numbers rather than miss them. That is the
 * right direction for the one number the whole system's feel rests on, and
 * eighty turns of it is why this half of the concern is slow-tier: the ladder's
 * *arithmetic* is a pure function and stays in `statecraftPacing.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame, dispatch } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { foundingErrorAt } from '../../src/sim/cities';
import { mapRange, tileHex } from '../../src/sim/map';
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
  it('hands the scripted empire a draft about every five turns early on', () => {
    // Horizon 140 → 150 (2026-08-29): the coast ruling (`coast.rings` 2)
    // re-sequenced resource placement, and on the re-sequenced map this
    // scripted empire's third government (draft 18) now lands at turn 144 —
    // four turns past the old 140-turn horizon. A modest extension keeps it
    // in view rather than dropping the tier from the measurement.
    const { draftTurn } = playEmpire(150);
    /**
     * **Measured on seed 4242 at `costBase 6 / costLinear 3 / costExponent 2`,
     * re-measured 2026-08-26 after the water milestone (Entry XXVII):** drafts
     * land on turns 7, 16, 24, 31, 38, 46, 52, 59, 66, 74, 83, 92, 101, 112,
     * 124, 134 — so the three governments are offered on turns **24 / 52 /
     * 124**, against the tech tree's three ages closing on 41 / 80 / 120. The
     * first two are where they were; the third has slipped past the close of the
     * age it belongs to, which is why the horizon here is 140 rather than 120.
     *
     * **What moved it, exactly, because it is not what it looks like.** Sailing
     * itself costs this empire almost nothing: with the granary's water line
     * removed and Sailing left in, the ladder measures 7, 16, 24, 31, 37, 42,
     * 48, 55, 63, 70, 80, 87, 95, 101, 108, 115 — the old numbers to within a
     * turn. Nor is it the node's *position*: moving Sailing from third in file
     * order to sixth (the empire breaks cost ties by file order) reproduced the
     * slowed ladder exactly, turn for turn.
     *
     * It is the **granary's point of food on water**. A coastal granary town's
     * citizens move onto the sea — 2🌾1🪙 against bare grassland's 2🌾 — and the
     * hammers they were making on land go with them, so every culture building
     * lands later and an escalating cost turns that into a widening gap. The
     * empire is not poorer; it is *differently* employed, and this scripted one
     * never revisits a build order to notice. That is a real consequence of a
     * real bonus rather than a regression to tune away, and it is written down
     * here because the next person to move these numbers should know which of
     * the three changes did it.
     *
     * **Before this pass**, for the record: 7, 16, 24, 32, 38, 43, 49, 56, 64,
     * 72, 81, 88, 96, 102, 109, 116 — governments on 24 / 49 / 109.
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
    expect(draftTurn.length).toBeGreaterThanOrEqual(3);

    const first = draftTurn[0]!;
    const eighth = draftTurn[7]!;
    // The opening draft: soon enough that the first government is a real
    // mid-opening decision rather than a late-game footnote. Measured 7.
    expect(first).toBeGreaterThan(3);
    expect(first).toBeLessThan(12);
    // The early cadence — drafts 1 through 8, the stretch Entry XV's "~5 turns
    // per draft early" is about. Measured 7.4; the band is two-sided, because a
    // curve that got cheaper is as much a regression as one that got dearer.
    const earlyCadence = (eighth - first) / 7;
    expect(earlyCadence).toBeGreaterThan(4);
    expect(earlyCadence).toBeLessThan(9);
    // The government tiers **this horizon reaches** all arrive, and they arrive
    // spread out. Measured 24 / 52 / 124.
    //
    // Three of five since 2026-08-28: Gov IV and Gov V sit at drafts 29 and 45,
    // which this scripted empire reaches somewhere past turn 250, and a pacing
    // test that played that far would be measuring a build order nobody wrote
    // rather than the opening it exists to pin. The slice is the *measurement's*
    // horizon and not a claim about the ladder — the rungs themselves are pinned
    // in `statecraft.test.ts`, off the rows.
    const REACHED_IN_HORIZON = 3;
    const tiers = GOVERNMENT_TIERS.slice(0, REACHED_IN_HORIZON).map((tier) => draftTurn[tier - 1]);
    for (const [index, turn] of tiers.entries()) {
      expect(turn, `government ${index + 1}`).toBeDefined();
    }
    expect(tiers[0]!).toBeGreaterThan(14);
    expect(tiers[0]!).toBeLessThan(34);
    // **Re-centred 2026-08-28.** Two things had drifted under this band and only
    // one of them is a change: `GOVERNMENT_TIERS` moved to 4 / 10 / 18, which put
    // the second charter on draft 10 rather than draft 7 and the measurement at
    // 63 — one turn inside a bound written for 52 — and then the growth curve
    // came down (10 · 6 · 1.65) and moved it to 64. A single turn of drift is
    // noise, and a band a turn wide is not a band; it is re-centred on the new
    // measurement at the width it always had.
    //
    // **Re-measured again 2026-08-28**, same day, after the unit/building ×1.4
    // cost ruling (wonders ×0.8): this empire's culture buildings are
    // buildings, so the same monument/amphitheater that funds its drafts now
    // takes longer to finish, and an escalating draft cost turns that lag into
    // a widening one exactly as the faith move did above. Full draft ladder,
    // before → after this ruling (`GOVERNMENT_TIERS` unchanged at 4/10/18):
    //
    //   before  7,15,21,28,33,38,44,50,56,64,71,77,84,90,97,104,112,121,130,140
    //   after   7,16,24,32,38,44,50,57,65,73,80,87,94,103,110,118,127,135
    //
    // — governments (drafts 4/10/18) at 28/64/130 before this ruling and
    // 32/73/135 after it. `tiers[2]` landed exactly on the old upper bound, so
    // the band is re-centred rather than merely widened.
    //
    // **Re-pinned 2026-08-29**: the coast ruling (`coast.rings` 2) re-sequenced
    // resource placement; the capital site is unchanged, the bonus tiles beside
    // it are not. This seed's ladder now measures governments (drafts 4/10/18)
    // at **31 / 72 / 144**, against 32/73/135 before. `tiers[0]` and `tiers[1]`
    // still sit inside their existing bands; `tiers[2]`'s band is re-centred on
    // the new measurement, widened to keep the horizon extension's four turns
    // of headroom on the top side.
    expect(tiers[1]!).toBeGreaterThan(48);
    expect(tiers[1]!).toBeLessThan(84);
    expect(tiers[2]!).toBeGreaterThan(118);
    expect(tiers[2]!).toBeLessThan(170);
  });
});

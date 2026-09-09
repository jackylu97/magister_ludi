/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — what the
 * build-sink pass did to the opening, measured over a sweep of seeds.
 *
 * The opening rate is read off **twenty-one seeds**, because the claim is about
 * the capital the median seed gets rather than about seed 4242 — a single roll
 * is a fixture of the map generator wearing a pacing test's clothes. A sweep is
 * slow *by kind* (CLAUDE.md's tier rule), which is what puts it on this side of
 * the line.
 *
 * **The warband measurement is gone** (the user, 2026-09-09: "axe the pacing
 * claims"). It played a scripted empire forty turns and then asserted that it
 * held five towns and between twelve and twenty pieces by turn 40 — a script
 * read as a yardstick for how fast the game moves, which is the thing the
 * ruling axed. Its stated subject, "a later retune may not quietly make units
 * free again", is a claim about **prices** and is made where prices are:
 * `productionCosts.test.ts` and `buildSinks.test.ts` fold every unit's cost out
 * of its own labelled lines, off the roster, with no turns played at all.
 * `docs/audit/test-suite-speed.md` records the deletion.
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

import { unitProductionCost } from '../../src/sim/cities';
import { foldCity } from '../../src/sim/yields/town';
import { createGame, dispatch } from '../../src/sim/game';
import { unitDef } from '../../src/sim/unitData';

describe('what the pass did to the opening', () => {
  it('leaves the median capital opening on three hammers, unit prices read off the roster', () => {
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
      openings.push(foldCity(game.state, game.state.cities[0]!).production);
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
     *
     * **Re-measured 2026-09-03, the 9/3 wave (schema 60).** A price pass this is
     * not — the roster is byte-identical — so everything here is the *ground*
     * moving, and it moved for one reason: the map generator now draws a pangaea
     * with an island belt, its ridges are broken rather than solid
     * (`mountainShare` 0.08), and a start must sit on at least a hundred tiles
     * of land. A capital picked out of that is a hillier capital. Over the same
     * twenty-one seeds the whole distribution shifts up by one — 2,2,2,2,2 then
     * thirteen 3s then four 4s, a band of **2..4** inside the 2..6 the assertions
     * allow — and the median comes back to **3⚙**, where it sat before the coast
     * ruling took it to 2. Against the new rate:
     *
     *   scout   13⚙, median 3 → **5 turns**
     *   warrior 10⚙, median 3 → **4 turns**
     *   worker  14⚙, median 3 → **5 turns**
     *
     * — which is the shape the opening was balanced around in the first place: a
     * first piece is a handful of turns of real commitment, and the warrior sits
     * one turn inside the scout rather than level with it.
     *
     * **Re-aimed 2026-09-06** (`docs/flags.md`, rulings "late — early
     * production", item y: "production costs ×1.25 across the board, and rising
     * by age"). The rows below still print 13 / 10 / 14; the Æra I band, which
     * the opening used to be exempt from at ×1, is ×1.25 now, so what a capital
     * actually pays is 16 / 12 / 17 and the turn counts are **6 / 4 / 6**. The
     * ground did not move again — the median is still 3 — and this suite was
     * dividing the row's printed figure rather than the price, which was the
     * same number until this ruling and is not any more. It asks
     * `unitProductionCost` now, so it cannot come apart from the fold again.
     *
     * **Re-aimed 2026-09-08, the production standard (batch P1,
     * `docs/production-costs.md`).** The rows carry no figure at all now: the
     * three opening pieces are all *light* — ten hammers at the first column,
     * where the curve multiplies by one — so a capital pays 10 / 10 / 10 and
     * the turn counts are **4 / 4 / 4**. The scout and the worker came down
     * from 16 and 17, the warrior from 12; the sizes are the user's own
     * ("this is ok, lets playtest first"), and the scout no longer sits a
     * turn outside the warrior. If the playtest wants the opening dearer, the
     * lever is `unitSizeHammers.light`, not this pin.
     *
     * **Re-measured 2026-09-08 (ruling ddd — the writ).** The palace supplies
     * six authority where it supplied four, so every one-town empire in this
     * sweep clears the authority meter's first bonus rung, and a rung is a
     * percent stage: the same median capital on the same ground now reports
     * **3.3⚙**, and the band it is drawn from is 2.2..6.6. The ground did not
     * move and neither did a price — the turn counts below are unchanged,
     * because ten light hammers over three and a third is still four turns.
     * `tech.slow.test.ts` reads the same sweep from the tree's side.
     */
    expect(median).toBeCloseTo(3.3, 10);
    expect(openings[0]).toBeGreaterThanOrEqual(2.2);
    expect(openings[openings.length - 1]).toBeLessThanOrEqual(6.6);
    const priced = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const turns = (id: 'scout' | 'warrior' | 'worker'): number =>
      Math.ceil(unitProductionCost(priced.state, 0, id) / median);
    expect(turns('scout')).toBe(4);
    expect(turns('warrior')).toBe(4);
    expect(turns('worker')).toBe(4);
  }, 60_000);
});

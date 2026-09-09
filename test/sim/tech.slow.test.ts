/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the opening
 * priced by playing it, and the tree's long replay.
 *
 * Two shapes put a test here (CLAUDE.md's tier rule): a **sweep** over
 * twenty-one seeds, because the opening kit's claim is about the capital the
 * median seed gets rather than about seed 4242; and a long **byte-for-byte
 * replay**, which is slow-tier by shape so that the next one lands here without
 * anybody having to time it. `tech.test.ts` keeps the twenty-turn save
 * round-trip and the stale-command refusal, which is the replay coverage that
 * belongs in the after-every-change gate.
 *
 * **The age-closing measurement is gone** (the user, 2026-09-09: "axe the
 * pacing claims"). It played a scripted one-player empire for eleven hundred
 * turns and asserted that all four ages closed inside that horizon and that the
 * chart ran out — a script read as a yardstick for how fast the game moves,
 * plus a reachability claim `tech.test.ts` already makes off the table itself
 * ("is a DAG: every tech is reachable from the empty set"). Its turn figures
 * had been printed rather than asserted since 2026-09-06 for the same reason
 * the user has now stated in full. `docs/audit/test-suite-speed.md` records the
 * deletion; it cost the suite twenty-four seconds of the slow tier.
 *
 * The two build measurements that remain grow one capital and run its queue
 * out: what they assert is **arithmetic** — a price divided by an income — not
 * a turn some empire reached.
 */
import { describe, expect, it } from 'vitest';

import { unitProductionCost, unitRosterCost } from '../../src/sim/cities';
import { foldCity } from '../../src/sim/yields/town';
import type { Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { RULES } from '../../src/sim/rulesData';
import { availableTechs } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';
import { choose, researchingGame } from './techHelpers';

const RESEARCH = RULES.research;

describe('research in the log', () => {
  it('replays forty turns of research byte for byte', () => {
    const game = researchingGame();
    for (let turn = 0; turn < 40; turn++) {
      for (const player of game.state.players) {
        // Pick something new the moment the last choice lands, so the log
        // carries research commands from every point in the turn cycle.
        if (player.researching === null) {
          const next = availableTechs(game.state, player.id)[0];
          if (next) dispatch(game, choose(player.id, next));
        }
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    // The game actually researched something worth replaying.
    expect(game.state.players[0]!.techsResearched.length).toBeGreaterThan(
      RESEARCH.startingTechs.length,
    );
    expect(game.log.some((command) => command.type === 'chooseResearch')).toBe(true);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

});

describe('pacing', () => {

  /**
   * A one-player standard map with its capital already planted on turn 1 — the
   * board both opening measurements start from.
   */
  function freshCapital(): Game {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(dispatch(game, {
      type: 'foundCity',
      playerId: 0,
      settlerUnitId: founder.id,
    }).ok).toBe(true);
    expect(game.state.cities).toHaveLength(1);
    return game;
  }

  /**
   * The opening, measured rather than asserted from taste.
   *
   * A capital founded on turn 1 makes two production a turn plus whatever its
   * single citizen is sent to work: `baseCityYields`' floor of two, and one
   * tile. Across the seed sweep below the opening runs 2–4 hammers with a
   * **median of three**, and three is the number the scout's price of nine was
   * set against: nine hammers is three turns of three, because the scout is
   * what the opening actually wants and three turns is what "immediately"
   * feels like. A warrior at five is therefore two turns of the same rate.
   *
   * **The city-centre re-base did not move this**, which is worth writing down
   * because it was expected to. `baseCityYields` dropped from 3🌾/2⚙ to 2🌾/2⚙
   * on 2026-08-25 (user decision; see `explainCentreYield`), and the floor that
   * moved was the *food* one: measured over this same sweep the opening's food
   * median went 5 → 4 while its production median stayed 3 and its band stayed
   * 2..4. So the anchor below holds unchanged — what the re-base costs an
   * opening is a turn or two of growth, not a slower first scout.
   *
   * Asserted over a sweep rather than off one roll, and that is a deliberate
   * rewrite. It used to pin one seed's opening to an exact number, which made
   * it a fixture of the map generator wearing a pacing test's clothes: every
   * change to the ground moved it, and what moved was never the *design* claim
   * — the price against the rate — but which hex one capital's first citizen
   * happened to draw. The claim is now stated the way the design ledger states
   * it, and the single-seed run below checks the arithmetic that follows from
   * it rather than a memorised answer.
   */
  it('prices the opening kit against the capital the median seed gets', () => {
    const openings: number[] = [];
    // An odd number of seeds, so the median is a value the sweep actually
    // produced rather than an average of two.
    for (const seed of [
      4242, 1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337, 555, 8888, 90210, 5, 6, 8, 9, 12,
    ]) {
      const game = createGame({
        seed,
        sizeName: 'standard',
        players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      });
      const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
      expect(dispatch(game, {
        type: 'foundCity',
        playerId: 0,
        settlerUnitId: founder.id,
      }).ok).toBe(true);
      openings.push(foldCity(game.state, game.state.cities[0]!).production);
    }
    openings.sort((a, b) => a - b);
    const median = openings[Math.floor(openings.length / 2)]!;

    // The band: a capital that opens on one hammer is unplayable and one that
    // opens on eight has been handed a mountain range.
    //
    // **Re-aimed 2026-09-08 (ruling ddd — the writ).** The palace supplies six
    // authority where it supplied four, so every one-town empire in this sweep
    // stands on the authority meter's first bonus rung and its opening hammers
    // are read through that tenth: the band the ground draws is unchanged at
    // 2..6, and what the fold *reports* is 2.2..6.6. The bounds carry the rung
    // rather than being widened past it, and they are written out because
    // `applyStages` multiplies both percentages in one expression over 10 000
    // — 2.2 and 6.6 land exactly, where `2 * 1.1` written here would not.
    expect(`opening ${openings[0]}..${openings[openings.length - 1]}`).toBe(
      `opening ${Math.max(openings[0]!, 2.2)}..${Math.min(openings[openings.length - 1]!, 6.6)}`,
    );
    // And the prices, read straight off it.
    // **Re-pinned 2026-08-29**: the coast ruling (`coast.rings` 2) re-sequenced
    // resource placement; the capital sites are unchanged, the bonus tiles
    // beside them are not. The median across this seed set is now **2⚙**
    // (previously 3), with the same 2..6 band above.
    //
    // **Re-measured 2026-09-03, the 9/3 wave (schema 60): back to 3⚙.** No
    // price moved; the ground did. The generator draws a pangaea with an island
    // belt, its ridges are broken rather than solid (`mountainShare` 0.08), and
    // a start must sit on a hundred land tiles — a capital picked out of that
    // is a hillier capital, and the whole distribution over these twenty-one
    // seeds shifts up by one to **2..4**, inside the 2..6 the band above
    // allows. `buildSinks.slow.test.ts` reads the same sweep from the roster's
    // side and carries the turn counts.
    //
    // **Re-measured 2026-09-08 (ruling ddd — the writ): 3⚙ reads as 3.3⚙.** No
    // price moved and the ground did not move either; the palace's six
    // authority puts a one-town empire on the meter's first bonus rung, and a
    // rung is a percent stage, so the same median capital reports a tenth more.
    // `toBeCloseTo` because the figure is a product.
    expect(median).toBeCloseTo(3.3, 10);
    // **Re-pinned batch P1** (2026-09-07, the production standard): the scout
    // and the warrior are `light` pieces opened at the first column, so what
    // they cost is the light base itself — the anchor is now one number in
    // `data/rules.json` rather than two figures on two rows.
    expect(unitRosterCost('scout')).toBe(RULES.production.unitSizeHammers.light);
    expect(unitRosterCost('warrior')).toBe(RULES.production.unitSizeHammers.light);
    // Four turns, at the re-measured median of 3 and at the writ's 3.3 alike:
    // ten light hammers over three and a third is still a fourth turn, so the
    // rung moved the reading without moving the opening's shape.
    expect(Math.ceil(unitRosterCost('warrior') / median)).toBe(4);
  }, 30_000);

  it('turns a fresh capital into a scout at exactly its own rate', () => {
    // The arithmetic the price implies, on one seed: a city banks its
    // production every turn and the scout arrives the turn the basket covers
    // the cost. What is asserted is that relation, not a memorised turn count —
    // the turn count is what the relation *predicts* from the rate this seed
    // happens to open on.
    const game = freshCapital();
    const capital = game.state.cities[0]!;
    expect(game.state.turn).toBe(1);

    const opening = foldCity(game.state, capital).production;
    expect(dispatch(game, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: capital.id,
      queue: [{ kind: 'unit', id: 'scout' }],
    } as Command).ok).toBe(true);

    // A **second** scout, because the opening kit is a settler and a scout since
    // the maintenance ruling (2026-08-28) — "does a scout exist" was true before
    // the first turn resolved and the loop measured nothing at all. Counting is
    // the fix rather than naming the piece: the claim is about the capital's
    // rate, and the capital's output is the scout that was not there before.
    const scouts = (): number => game.state.units.filter((unit) => unit.type === 'scout').length;
    const started = scouts();
    const built = (): boolean => scouts() > started;
    // The **priced** figure, not the row's: since 2026-09-06 (`docs/flags.md`
    // item y) every hammer price wears its age band, so the row's 13 is not what
    // the basket pays for a scout — `unitProductionCost` is, and it is what the
    // relation below has to be read against.
    const cost = unitProductionCost(game.state, 0, 'scout');
    // **Measured against the accumulated bank, not against one rate** — the
    // correction the settler case below already carries, and which this one now
    // needs for the same reason. A build long enough for the borders to reach a
    // new tile is a build in which the citizen assigner legitimately steps the
    // rate, and dividing by the first turn's figure would be asserting that
    // borders are slow. At the pre-ruling price of 13 the build was short enough
    // that the two readings agreed; at 16 they do not, and the accumulated one is
    // the honest half of the pair.
    const income: number[] = [];
    while (!built() && income.length < 10) {
      const banked = capital.hammerBasket;
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      income.push(capital.hammerBasket - banked + (built() ? cost : 0));
    }
    const turns = income.length;
    // The first turn's bank *is* the opening yield — if those two ever disagree
    // the production pipeline has grown a second opinion about a city's rate.
    expect(income[0]).toBe(opening);
    // The first turn on which the banked income covers the price, which is the
    // turn the scout arrives.
    let banked = 0;
    let expected = Infinity;
    for (let turn = 1; turn <= turns; turn++) {
      banked += income[turn - 1]!;
      if (banked >= cost && expected === Infinity) expected = turn;
    }
    expect(turns, `${cost}⚙ off ${income.join('+')}`).toBe(expected);
    // A scout inside the first handful of turns, whatever the roll: the opening
    // is not allowed to become a scoutless one. Bound re-pinned 2026-08-28 with
    // the scout's ×1.4 cost rise (9 → 13⚙); it survives the Æra I band of
    // 2026-09-06 unmoved, because this capital's rate steps inside the build.
    expect(`scout on turn ${turns}`).toBe(`scout on turn ${Math.min(turns, 7)}`);
  }, 30_000);

  /**
   * The settler, measured the same way, and deliberately the expensive end of
   * the same scale: expansion is the strongest move in the game and it is meant
   * to cost a real share of the opening.
   *
   * The one thing the target has to bend around is `minCityPop`: a settler
   * cannot be *queued* in a size-1 city at all (`validateQueue` refuses it, and
   * a size-1 city with a settler at the front of its queue could never grow to
   * lift its own gate, because a settler halts growth). So "a fresh capital"
   * here means the earliest turn the game will actually accept the order — a
   * size-2 city.
   *
   * What is asserted is that the settler costs **exactly its price in hammers**
   * and not one turn more — the build ends on the first turn the city's own
   * banked income covers the cost. That is the design claim; an exact turn count
   * would be a fixture of the map generator, for the reason the scout test above
   * gives at length.
   *
   * It is phrased against the *accumulated* income rather than against a single
   * measured rate, and that is the correction Territory & gold forced. The rate
   * used to hold for the whole build because a queued settler halts growth, so
   * nothing could move the citizens; borders on Civ 6's curve now reach a new
   * tile inside a settler's build, the assigner re-seats a citizen onto it the
   * next turn, and the rate legitimately steps. A test that divided by the first
   * turn's rate would be asserting that borders are slow.
   */
  it('turns a size-2 capital into its first settler at exactly its own rate', () => {
    const game = freshCapital();
    const capital = game.state.cities[0]!;

    // Grow to the smallest size that may build one. Nothing is queued while it
    // grows, so the hammers it banks in the meantime are cleared first: this
    // test is about the settler's own build time, not about a head start.
    const minimum = unitDef('settler').minCityPop;
    let grew = 0;
    while (capital.population < minimum && grew < 30) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      grew += 1;
    }
    expect(capital.population).toBe(minimum);
    // A band rather than a number, for the same reason as the ages. Over a
    // twenty-four seed sweep the capital reaches size 2 on a median of turn 9
    // and never later than 16 — the spread is the trade the start chooser now
    // makes, weighting production heavily enough (`starts.productionWeight`)
    // that a capital has hills in its inner ring, which is a food-poorer ring.
    expect(game.state.turn, `size ${minimum} on turn ${game.state.turn}`).toBeLessThanOrEqual(20);
    capital.hammerBasket = 0;

    /**
     * Queues a settler and runs until it is out, reporting the turns it took and
     * the hammers the city actually banked on each of them.
     *
     * The income is read off the *basket*, as the difference it moved by across
     * the resolution plus whatever the finished settler took out of it — never
     * off `foldCity` before the turn. That is the trap this test walked into
     * once already, twice over: a queued settler halts growth, and the citizen
     * assigner runs at the *top* of the resolution, so a figure taken a moment
     * earlier is a figure for the city as it was assigned last turn. The bank is
     * what actually paid for the unit, so the bank is what is measured.
     */
    const buildSettler = (cost: number): { turns: number; income: number[] } => {
      expect(dispatch(game, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: capital.id,
        queue: [{ kind: 'unit', id: 'settler' }],
      } as Command).ok).toBe(true);
      const built = game.state.players[0]!.unitsBuilt.settler ?? 0;
      const income: number[] = [];
      while ((game.state.players[0]!.unitsBuilt.settler ?? 0) === built && income.length < 30) {
        const banked = capital.hammerBasket;
        expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
        const paid = (game.state.players[0]!.unitsBuilt.settler ?? 0) === built ? 0 : cost;
        income.push(capital.hammerBasket - banked + paid);
      }
      return { turns: income.length, income };
    };

    /** The first turn on which the banked income covers the price. */
    const turnsFor = (cost: number, income: number[]): number => {
      let banked = 0;
      for (let turn = 1; turn <= income.length; turn++) {
        banked += income[turn - 1]!;
        if (banked >= cost) return turn;
      }
      return Infinity;
    };

    const first = unitProductionCost(game.state, 0, 'settler');
    // Re-pinned batch P1: the settler is its own size at 28 hammers and stands
    // at the first column, so the first one a city raises costs the base.
    expect(first).toBe(RULES.production.unitSizeHammers.settler);
    const firstBuild = buildSettler(first);
    expect(firstBuild.income.every((rate) => rate > 0)).toBe(true);
    expect(firstBuild.turns, `${first}⚙ off ${firstBuild.income.join('+')}`).toBe(
      turnsFor(first, firstBuild.income),
    );
    expect(game.state.players[0]!.unitsBuilt.settler).toBe(1);

    // And the second is a whole increment dearer — the brake the escalation is
    // there to be, and it pays for that increment in hammers too.
    // The ladder climbs on the settler's own sized figure (batch P1): the
    // settler is opened at the first column, so the curve multiplies by one and
    // a rung is the base plus the increments, exactly.
    const rung = (built: number): number =>
      RULES.production.unitSizeHammers.settler + built * unitDef('settler').escalation!;
    const second = unitProductionCost(game.state, 0, 'settler');
    expect(second).toBe(rung(1));
    // The first settler's overflow is cleared for the reason the basket was
    // cleared before the first: this measures the second settler at *exactly*
    // its own rate, and a head start banked by the last one is not its rate.
    // The old prices happened to leave nothing over; the standard's do not
    // (batch P1, 2026-09-08 — 28 and 35 against the same income).
    capital.hammerBasket = 0;
    const secondBuild = buildSettler(second);
    expect(secondBuild.turns, `${second}⚙ off ${secondBuild.income.join('+')}`).toBe(
      turnsFor(second, secondBuild.income),
    );
    // The escalation is a real brake: the second settler costs strictly more
    // hammers than the first, and at an unchanged rate that is strictly more
    // turns — so the comparison is made at a rate held fixed, the first build's.
    expect(second).toBeGreaterThan(first);
    expect(turnsFor(second, firstBuild.income.concat(firstBuild.income))).toBeGreaterThan(
      firstBuild.turns,
    );
    expect(unitProductionCost(game.state, 0, 'settler')).toBe(rung(2));
    // The settler is the expensive end of the opening scale: a real multiple of
    // what the scout costs, whatever the capital's roll.
    expect(first).toBeGreaterThanOrEqual(unitProductionCost(game.state, 0, 'scout') * 2);
  }, 30_000);
});

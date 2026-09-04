/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the tree's
 * pacing, played rather than asserted.
 *
 * Everything here runs a *game*. `playEmpire` scripts two hundred turns of a
 * one-player standard map to ask when the third age closes; the opening kit is
 * priced against a sweep of twenty-one seeds because the claim is about the
 * capital the median seed gets rather than about seed 4242; the two build
 * measurements grow a capital and then run its queue out. A pacing claim cannot
 * be made cheaply — it is a statement about tens of turns — which is exactly
 * what puts it on this side of the line.
 *
 * The forty-turn replay is here for the other reason in the convention: a long
 * byte-for-byte replay is slow-tier by shape, so the *next* one lands here
 * without anybody having to time it. `tech.test.ts` keeps the twenty-turn save
 * round-trip and the stale-command refusal, which is the replay coverage that
 * belongs in the after-every-change gate.
 */
import { describe, expect, it } from 'vitest';

import { cityYields, foundingErrorAt, unitProductionCost } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  replay,
  snapshotState,
} from '../../src/sim/game';
import { type GameMap, type Tile, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import type { GameState } from '../../src/sim/state';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { choose, researchingGame } from './techHelpers';

const RESEARCH = RULES.research;

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

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
  /** How many cities the scripted empire settles before it starts building. */
  const CITY_TARGET = 5;

  /** The nearest tile a city could legally stand on, or null. */
  function nearestSite(
    state: GameState,
    col: number,
    row: number,
  ): { col: number; row: number } | null {
    const from = at(state.map, col, row);
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
   * A scripted empire: found the capital, settle three more cities, always
   * build the most useful thing available, always research the cheapest
   * available node. Crude, but it is the shape of a real game and it is the
   * only honest way to ask when the last age closes.
   *
   * Deliberately conservative — it never fights, never trades and picks tiles
   * by the citizen assigner's own judgement — so a real player should beat
   * these turn numbers rather than miss them.
   */
  function playEmpire(maxTurns: number): { game: Game; ageDone: Map<number, number> } {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const ageDone = new Map<number, number>();
    // Every building with a yield, in rough order of usefulness. The barracks
    // is deliberately absent: it pays nothing but a share of the hammers behind
    // a *unit*, and this empire builds settlers and then nothing but buildings,
    // so queuing one would be eighteen hammers spent on a bonus it would almost
    // never collect. `test/cities.test.ts` is where the barracks is measured.
    const wanted: string[] = ['granary', 'monument', 'shrine', 'library', 'temple', 'market',
      'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university'];

    for (let turn = 0; turn < maxTurns; turn++) {
      // Research: the cheapest thing available, which is roughly how a player
      // sweeps an age.
      const player = game.state.players[0]!;
      if (player.researching === null) {
        const next = [...availableTechs(game.state, 0)].sort(
          (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
        )[0];
        if (next) dispatch(game, choose(0, next));
      }

      // Settlers: found where they stand if the rules allow it, otherwise walk
      // to the nearest legal site — the same question the settler lens asks.
      for (const unit of [...game.state.units]) {
        if (!unitDef(unit.type).foundsCity) continue;
        if (dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
        if (unit.path && unit.path.length > 0) continue;
        const target = nearestSite(game.state, unit.col, unit.row);
        if (target) dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
      }

      // Production: expand while the empire is small, then build everything the
      // tree has handed over.
      for (const city of game.state.cities) {
        if (city.queue.length > 0) continue;
        const queue: { kind: 'unit' | 'building'; id: string }[] = [];
        for (const id of wanted) {
          if (city.buildings.includes(id as never)) continue;
          if (!isUnlocked(game.state, 0, 'building', id)) continue;
          queue.push({ kind: 'building', id });
        }
        // Settlers already *paid for* count toward the target as well as
        // settlers already walking: a settler is five turns of production now,
        // and without this every city in the empire would queue one before the
        // first arrived, overshooting `CITY_TARGET` by two whole cities.
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
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue,
        } as Command);
      }

      dispatch(game, { type: 'endTurn', playerId: 0 });

      for (const age of [1, 2, 3, 4]) {
        if (ageDone.has(age)) continue;
        const all = TECH_IDS.filter((id) => techDef(id).age === age);
        if (all.every((id) => player.techsResearched.includes(id))) {
          ageDone.set(age, game.state.turn);
        }
      }
    }
    return { game, ageDone };
  }

  it('closes its four ages on the Quick-speed schedule (Entry V)', () => {
    const { game, ageDone } = playEmpire(700);
    // Measured on this seed after the city-centre re-base: **41 / 80 / 120**,
    // against 40 / 78 / 118 immediately before it, 37 / 74 / 111 when the Civ
    // 6-style Age I ramp landed, 40 / 68 / 107 with the flat 16–29 Age I costs,
    // 42 / 100 / 167 with the M10 meters, 42 / 90 / 132 before them and
    // 43 / 86 / 128 before the settler retune. Each assertion is a band around the measurement rather
    // than the number itself — the map roll moves it by a handful of turns —
    // but the band is tight enough on *both* sides to catch a regression in
    // either direction, which an upper bound alone would not.
    //
    // The ramp, and why Age I moved. Civ 6's ancient-era techs sit in three
    // tiers roughly 25/50/80 beakers — a 1:2:3.2 ratio — with the cheapest
    // tech costing about 3% of a full game. Age I's old flat 16–29 spread put
    // the first tech at 6–8% of this game's ~160-turn length: nearly a full
    // opening's worth of hammers spent staring at the tree before anything
    // unlocked. The eleven Age I techs (agriculture free-ish at 15, unchanged)
    // are now three tiers on the same 1:2:3 shape — 8 / 16 / 26–24 — which
    // puts the first tech around turn 5–6 and drops the sweepable Age I total
    // (everything but agriculture, which is never actually paid for) from 212
    // to 146 beakers, a third cheaper. Measured close moved from 40 to 37: only
    // three turns, smaller than the beaker cut alone would suggest, because
    // this scripted empire is production- not science-bound early — the
    // opening is capped by the granary/monument/shrine build queue and by
    // when settlers free up citizens to work science tiles, not by the tree's
    // price tag. Ages II and III are untouched, so their closes (74, 111) move
    // only as a downstream echo of Age I finishing sooner and freeing science
    // buildings one city-turn earlier; that shift is well inside the noise the
    // existing bands already tolerated.
    //
    // The city-centre re-base (user decision, 2026-08-25), and why the ages
    // moved by exactly one and two turns. `baseCityYields` went from 3🌾/2⚙ to
    // 2🌾/2⚙, with the centre inheriting the ground per voice where the ground
    // pays more (`explainCentreYield`). Only the **food** floor moved, so every
    // capital on flat ground loses one food a turn until its own tiles beat
    // two: the ages close later because the empire grows later, not because it
    // researches slower — the opening's *production* is untouched (see the
    // measurement below, whose median is still 3⚙ and whose band is still
    // 2..4), so the scout's price of nine hammers is still three turns and the
    // opening kit needed no reprice at all. The whole ripple is 40 → 41,
    // 78 → 80, 118 → 120: one turn of Age I and two of the later two, well
    // inside bands that were already tolerating a handful of turns of map roll.
    // The bands are therefore left where they are; moving them to re-centre on
    // a two-turn shift would be pinning noise.
    //
    // **Re-pinned 2026-08-28**, deliberately, because two knobs moved at once
    // and both were meant to be felt. Age II costs went ×1.3 and Age III ×1.8
    // (user: "science costs need to scale harder"), and the growth curve came
    // down to 10 · 6 · 1.65 (user: "the first few population feel a bit slow").
    // This seed measured **32 / 62 / 97** before and **30 / 67 / 122** after,
    // and the two changes pull in opposite directions on purpose: the cheaper
    // citizens buy Age I two turns *earlier* (science here is pop-based, so a
    // faster basket is a faster tree), and then the ×1.8 on Age III more than
    // spends that back — twenty-five turns of finale, which is the "scale
    // harder" the note asked for. The bands below are re-centred on the new
    // measurements at the widths the old ones had (±7 / ±12 / ±16), so they
    // still catch a regression in either direction without pinning map roll.
    //
    // Upper bound 138 → 142 (2026-08-29, balance rulings): cities costing
    // 3/2/4 authority, Æra II–III buildings priced by hand, crowding
    // softened, the ladders gentler — moved this seed's Age III close from
    // 122 to 139, one turn over a ±16 band; the band moved with it rather
    // than being re-centred on a single roll.
    //
    // **Re-pinned 2026-08-29**: the coast ruling (`coast.rings` 2) re-sequenced
    // resource placement; the capital site is the same hex, the bonus tiles
    // beside it are not. This seed now measures **34 / 81 / 142** (previous
    // centres 30 / 67 / 122, last upper bound 142). All three bands are
    // re-centred on the new measurements at the widths the task calls for
    // (±7 / ±12 / ±18 — Age III's width grows by two to absorb the close
    // landing exactly on the old edge).
    //
    // **Re-pinned 2026-08-30, the tree pass.** Four ages where there were three
    // and fifty-three nodes where there were twenty-six, so every band here is a
    // fresh measurement rather than a moved one. This seed closes at
    // **34 / 64 / 124 / 191**, against 34 / 81 / 142 for the three-age tree —
    // and the two things worth reading off that pair are:
    //
    //   · **Æra I did not move at all** (34 both times). Its twelve nodes and
    //     their costs are untouched, and the opening is production-bound rather
    //     than science-bound, exactly as the ramp note below says.
    //   · **The old Æra II split in two.** What used to be one 47-turn band
    //     (34 → 81) is now Heroes (34 → 64, thirty turns) and Empire
    //     (64 → 124, sixty). The Heroes band is *cheap and quick* on purpose —
    //     it is where trade, the first prophet and the great people open — and
    //     Empire is where the university and the premiere roster are paid for.
    //   · **Cathedrals is the long one** (124 → 191, sixty-seven turns), which
    //     is the objectives age and the one the glass-bead deck is dealt over.
    //
    // The curtain therefore lands around **t190** rather than t142. Whether
    // that is the game's length or whether Heroes and Empire should compress to
    // hold ~t160 is Part 5 of `docs/tech-tree.md` and the user's to rule; this
    // test measures it and does not have an opinion.
    //
    // Bands are ±7 / ±12 / ±18 / ±20 — the widths the three-age pass used, with
    // the fourth given a little more room because it is the longest band and
    // the furthest downstream of a map roll.
    // **Re-pinned 2026-09-01, Entry LIV — the walls go up.** The playtest ruled
    // the tree far too fast, so the costs moved: late Æra II ×1.5, all of
    // Æra III ×2, Æra IV ×1.5. This seed now closes at **34 / 71 / 177 / 265**
    // against 34 / 64 / 124 / 191 before the ruling — Æra I untouched (the
    // opening is production-bound), Heroes seven turns longer, Empire the
    // doubled wall the ruling asked for, and the curtain at ~t265. Bands are
    // re-centred at the widths above; the horizon grew with them.
    //
    // **Re-pinned 2026-09-02, the timeline pass — the costs became a formula.**
    // Every price in the tree is now read off the node's own chart column (the
    // pricing note in `tech.ts` carries the taper and the fourteen figures), so
    // this is a fresh measurement of a tree nothing in which was hand-tuned.
    // This seed closes at **74 / 128 / 252 / 334** against 34 / 71 / 177 / 265.
    // Three things are worth reading off that pair:
    //
    //   · **Æra I finally moved, and it moved the most** (34 → 74). It is the
    //     one age that had never been re-priced, because the opening is
    //     production-bound — but the user's own anchors put a second-column
    //     node at 30 beakers where the old table had 8, so the age costs 814
    //     rather than 169 and the opening is science-bound now too. The first
    //     technology lands around turn 8 rather than turn 5.
    //   · **The two late ages barely moved** (177 → 252 is mostly Æra I and II
    //     arriving late; Æra III itself is 124 turns against 106, and Æra IV 82
    //     against 88). The formula happened to land them near where Entry LIV's
    //     hand-tuning had, which is the honest reason to believe the taper.
    //   · **The proportions are Civ's now**: 22% / 16% / 37% / 25% of the game
    //     against 13% / 14% / 40% / 33%. An opening age a player sweeps before
    //     their second city is what the anchors were aimed at.
    //
    // Bands widen with the horizon — ±10 / ±15 / ±25 / ±30, the same fraction
    // of each band's own length that ±7 / ±12 / ±18 / ±20 were.
    //
    // **Re-pinned 2026-09-02, the ladder re-anchored at the first paid tier.**
    // The user's correction to the pass above: "the first tier should be 13
    // science ... I think the agent skipped a tier". The table had been anchored
    // at column 0, which holds Agriculture alone — and Agriculture is granted at
    // the start and never bought — so the first tier a player actually pays for
    // was priced a rung too high. Every column now takes the price the column to
    // its left used to carry. Nothing else moved: same tree, same edges, same
    // taper, one shift.
    //
    // This seed closes at **46 / 91 / 200 / 273** against 74 / 128 / 252 / 334.
    // What the shift is worth, read off that pair:
    //
    //   · **The opening comes back** (74 → 46). Æra I costs 384 beakers rather
    //     than 814 and the four nodes a player chooses between on turn one are
    //     13 apiece rather than 30, so the age is a ramp rather than a wall —
    //     which is what the anchors were for, and what anchoring them at an
    //     unbought root quietly undid.
    //   · **The later ages keep their shape and arrive earlier.** Æra II is
    //     forty-five turns against fifty-four, Æra III a hundred and nine
    //     against a hundred and twenty-four, Æra IV seventy-three against
    //     eighty-two — every band a little shorter in the same proportion,
    //     because the shift takes one step off a compounding ladder rather than
    //     re-shaping it.
    //   · **The curtain lands around t273** rather than t334, which is nearer
    //     the ~t265 Entry LIV's hand-tuning had settled on than the mis-anchored
    //     ladder ever was.
    //
    // Bands keep the widths above (±10 / ±15 / ±25 / ±30) and are re-centred on
    // the new measurements.
    //
    // **Re-pinned 2026-09-02, tree revision 4 — the user's own redraw.** Not a
    // retune: the ladder is untouched (truncated at the top, because the chart
    // is twelve columns rather than fourteen) and every figure moved because the
    // *shape* did. Æra III grew to seventeen nodes and Æra IV shrank to eleven,
    // and the whole tree costs 17920 beakers where the timeline pass's did
    // 22544 — 345 / 1890 / 7650 / 8035 by age.
    //
    // This seed closes at **44 / 84 / 175 / 236** against 46 / 91 / 200 / 273.
    // What that pair says:
    //
    //   · **The opening is where the redraw was gentlest** (46 → 44). Æra I is
    //     the same twelve nodes, and only the Calendar and Divination came down
    //     a column, so the age costs 345 rather than 384.
    //   · **The middle is a little quicker and the finale a lot** (Æra III is a
    //     ninety-one-turn band against a hundred and nine, Æra IV sixty-one
    //     against seventy-three). Æra III holds a node more and still costs less
    //     because the age is three columns wide rather than four; Æra IV holds a
    //     node fewer over three columns rather than three of a longer ladder.
    //   · **The curtain lands around t236**, which is the earliest the four-age
    //     tree has closed since Entry LIV put the walls up, and inside the
    //     ~t265 the hand-tuning had settled on rather than past it.
    //
    // Bands keep the same widths again (±10 / ±15 / ±25 / ±30), re-centred.
    //
    // **Re-pinned 2026-09-03, the late-cost ruling.** The user, on the cost-knob
    // flag: "technologies should keep the same scaling they had in age 1-2.
    // Technologies should be extremely expensive in age 4-5." So columns 0–5 are
    // exactly the figures they were, columns 6–8 lift a little
    // (335/450/565 → 400/540/680) and columns 9–12 lift hard
    // (665/750/820/875 → 1450/1700/1950/2200) — the tree is 35710 beakers
    // against 19725, the ages 345 / 1665 / 7700 / 26000. The full table is in
    // `tech.test.ts`'s `COLUMN_COSTS`; the ruling is written up in the pricing
    // note in `tech.ts`.
    //
    // This seed closes at **58 / 91 / 207 / 443** against 44 / 84 / 175 / 236.
    // Two of those four numbers are *not* this ruling's doing and it matters
    // that the pin says so:
    //
    //   · **Æra I and Æra II moved without a single one of their prices
    //     moving** (44 → 58, 84 → 91). Their columns are untouched, so what
    //     moved under them is everything that landed between this pin and the
    //     last one — tree revisions 4.1 and 4.2 re-shaped the chart and were
    //     never re-measured here, and the economy batch re-priced what the
    //     empire buys with the hammers it is not spending on science. This is
    //     a fresh measurement of the harness as it stands, not an effect of
    //     the late columns.
    //   · **Æra III and Æra IV are the ruling** (175 → 207, 236 → 443). Æra III
    //     is a hundred and sixteen turns against ninety-one, which is the
    //     little lift; Æra IV is two hundred and thirty-six against sixty-one,
    //     which is "extremely expensive" read literally — the closing age is
    //     now more than half the game, and the curtain lands around **t443**
    //     rather than t236.
    //
    // The horizon grew with the bands: `playEmpire` plays 520 turns rather than
    // 420, because a harness that stops before the tree closes measures nothing
    // (the same reason the linear-taper experiment was thrown out). At 1400
    // turns this empire holds all fifty nodes and banks beakers it has nothing
    // left to buy, so 520 is a horizon with room in it rather than a new wall.
    // Bands keep the widths above (±10 / ±15 / ±25 / ±30), re-centred.
    //
    // **Re-pinned 2026-09-03, the 9/3 wave (schema 60).** The pin above was
    // written by the tree agent against an intermediate tree; the wave landed
    // the late columns *and* seven other rulings on top of it, and this is the
    // first measurement of the four ages as they actually ship. This seed now
    // closes at **66 / 107 / 249 / 586** against 58 / 91 / 207 / 443, and the
    // four numbers split cleanly into two causes:
    //
    //   · **Æra I and Æra II moved with their prices untouched** (58 → 66,
    //     91 → 107). Columns 0–5 are byte-identical, so what moved under them is
    //     the ground and the purse: the map generator draws a pangaea with an
    //     island belt and broken ridges (`mountainShare` 0.08), a dry settle
    //     grows 30% slower until it is watered (`cities.drySettlePercent`), the
    //     palace pays 6 happiness rather than 9 and crowding is switched on.
    //     This empire's science is pop-based, so a slower, unhappier basket is a
    //     slower tree — eight turns of Æra I and eight more of Æra II.
    //   · **Æra III and Æra IV are the late-cost ruling** (207 → 249,
    //     443 → 586). Columns 6–8 lift about a fifth (335/450/565 →
    //     400/540/680) and columns 9–12 lift hard (665/750/820/875 →
    //     1450/1700/1950/2200), which is "extremely expensive in age 4-5" read
    //     literally: Æra IV alone is three hundred and thirty-seven turns, more
    //     than half the game.
    //
    // The curtain lands around **t586**. Whether that is the game's length is
    // Part 5 of `docs/tech-tree.md` and the user's to rule — this test measures
    // it and does not have an opinion — but it is far enough past the ~t265 the
    // hand-tuning settled on that it is written into `docs/flags.md` under the
    // post-wave pacing bullet rather than left in a comment nobody reads.
    //
    // The horizon grows with it: `playEmpire` plays 700 turns rather than 520,
    // for the reason the last pin gives — a harness that stops before the tree
    // closes measures nothing. All fifty nodes are held by t586 and the empire
    // banks beakers it cannot spend after that. Bands keep the widths above
    // (±10 / ±15 / ±25 / ±30), re-centred.
    const first = ageDone.get(1);
    const second = ageDone.get(2);
    const third = ageDone.get(3);
    const fourth = ageDone.get(4);
    expect(first, `age I: ${String(first)}`).toBeDefined();
    expect(second, `age II: ${String(second)}`).toBeDefined();
    expect(third, `age III: ${String(third)}`).toBeDefined();
    expect(fourth, `age IV: ${String(fourth)}`).toBeDefined();

    expect(first!, `age I: ${first}`).toBeGreaterThanOrEqual(56);
    expect(first!, `age I: ${first}`).toBeLessThanOrEqual(76);
    expect(second!, `age II: ${second}`).toBeGreaterThanOrEqual(92);
    expect(second!, `age II: ${second}`).toBeLessThanOrEqual(122);
    expect(third!, `age III: ${third}`).toBeGreaterThanOrEqual(224);
    expect(third!, `age III: ${third}`).toBeLessThanOrEqual(274);
    expect(fourth!, `age IV: ${fourth}`).toBeGreaterThanOrEqual(556);
    expect(fourth!, `age IV: ${fourth}`).toBeLessThanOrEqual(616);
    expect(game.state.players[0]!.techsResearched).toHaveLength(TECH_IDS.length);
  }, 120_000);

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
      openings.push(cityYields(game.state, game.state.cities[0]!).production);
    }
    openings.sort((a, b) => a - b);
    const median = openings[Math.floor(openings.length / 2)]!;

    // The band: a capital that opens on one hammer is unplayable and one that
    // opens on eight has been handed a mountain range.
    expect(`opening ${openings[0]}..${openings[openings.length - 1]}`).toBe(
      `opening ${Math.max(openings[0]!, 2)}..${Math.min(openings[openings.length - 1]!, 6)}`,
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
    expect(median).toBe(3);
    // **Re-pinned 2026-08-28** (user ruling: units and buildings ×1.4, wonders
    // ×0.8). The scout's old anchor — nine hammers set exactly against three
    // turns at the median rate — does not survive a flat multiplier on every
    // roster row: the scout rose with the rest of Age I and is now read off the
    // roster rather than derived from the rate. The warrior rose the same
    // ×1.4 and, at the re-pinned median of 2, now costs five turns.
    expect(unitDef('scout').cost).toBe(13);
    expect(unitDef('warrior').cost).toBe(10);
    // Four turns at the re-measured median of 3, five at the old median of 2.
    expect(Math.ceil(unitDef('warrior').cost / median)).toBe(4);
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

    const opening = cityYields(game.state, capital).production;
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
    let turns = 0;
    let rate = 0;
    while (!built() && turns < 10) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      turns += 1;
      if (turns === 1) rate = capital.hammerBasket;
    }
    // The first turn's bank *is* the opening yield — if those two ever disagree
    // the production pipeline has grown a second opinion about a city's rate.
    expect(rate).toBe(opening);
    const cost = unitDef('scout').cost;
    expect(turns, `${cost}⚙ at ${rate}⚙ a turn`).toBe(Math.ceil(cost / rate));
    // A scout inside the first handful of turns, whatever the roll: the opening
    // is not allowed to become a scoutless one. Bound re-pinned 2026-08-28 with
    // the scout's ×1.4 cost rise (9 → 13⚙): this fixed seed's own opening rate
    // now takes it to turn 7.
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
     * off `cityYields` before the turn. That is the trap this test walked into
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
    // Re-pinned 2026-08-28 with the settler's ×1.4 cost rise (20 → 28⚙).
    expect(first).toBe(28);
    const firstBuild = buildSettler(first);
    expect(firstBuild.income.every((rate) => rate > 0)).toBe(true);
    expect(firstBuild.turns, `${first}⚙ off ${firstBuild.income.join('+')}`).toBe(
      turnsFor(first, firstBuild.income),
    );
    expect(game.state.players[0]!.unitsBuilt.settler).toBe(1);

    // And the second is a whole increment dearer — the brake the escalation is
    // there to be, and it pays for that increment in hammers too.
    const second = unitProductionCost(game.state, 0, 'settler');
    expect(second).toBe(first + unitDef('settler').escalation!);
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
    expect(unitProductionCost(game.state, 0, 'settler')).toBe(
      first + 2 * unitDef('settler').escalation!,
    );
    // The settler is the expensive end of the opening scale: a real multiple of
    // what the scout costs, whatever the capital's roll.
    expect(first).toBeGreaterThanOrEqual(unitDef('scout').cost * 2);
  }, 30_000);
});

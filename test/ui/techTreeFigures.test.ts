/**
 * **Every figure on the star chart is whole** (the user, 2026-09-09,
 * `docs/flags.md` (mmm)): *"I'm not sure what the yields next to the rows mean,
 * but they don't seem to be accurate and are unformatted floating point values.
 * Lets keep values there rounded to the nearest integer, and lets only include
 * yields for technologies that supply yields (like irrigation's food on farms).
 * The buildings don't need yield previews, as they need to be built in your
 * empire."*
 *
 * Three obligations came out of that, and this file is the register of them.
 *
 * 1. **No figure the chart prints has a fraction in it.** After batch X a fold
 *    carries fractions all the way (`src/sim/yieldFormat.ts`), so anything
 *    interpolated raw prints `2.4000000000000004`. That is exactly what the
 *    user met, on the building line, and the rule the whole screen now obeys is
 *    that a number reaches a template through `signedYield`/`yieldShows` or is
 *    an integer the data itself carries — a cost in beakers, a cost in hammers,
 *    a turn count.
 * 2. **A building's row is a price and nothing else.** No yield voice on it,
 *    no sign, no "now".
 * 3. **A technology's own yields still print** — a renewal's delta, an ability
 *    that pays, and the node's `techEffect` rules — because those are what the
 *    node itself hands over, and they are the half the user asked to *keep*.
 *
 * There is no jsdom in this suite (`controls.test.ts`'s note), so the chart is
 * not mounted and walked. What is walked instead is the set of composers the
 * chart's DOM is built out of — `giftNote` and its three helpers, exported from
 * `techTree.ts` for this reason, plus `techRuleClauses`, `turnsToTech`,
 * `researchProgress` and the two production evaluators — over **every gift of
 * every technology** against a real empire. That is a stronger sweep than a
 * rendered chart would give: a rendered chart shows two unlock rows a card and
 * whichever node the pointer happens to be over, and this reads all of them.
 * The one thing it cannot see is a figure composed inline in a template, which
 * is what `techTreeCost.test.ts`'s source pins are for.
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';
import { stripRefs } from '../../src/sim/statecraft';
import { buildingProductionCost, foundCityAt, unitProductionCost } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, bumpRevision, newGame } from '../../src/sim/state';
import { playerScience, turnsToTech } from '../../src/sim/tech';
import { TECH_IDS, type TechId, liveUnlocks, techDef } from '../../src/sim/techData';
import { techGifts } from '../../src/sim/techUnlocks';
import { signedYield } from '../../src/sim/yieldFormat';
import { HAMMER, YIELD_GLYPH } from '../../src/ui/figures';
import { giftNote } from '../../src/ui/techTree';
import { techRuleClauses } from '../../src/ui/techRuleWords';
import { researchProgress } from '../../src/ui/researchProgress';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * An empire with **several towns and a few technologies**, which is the state
 * the user was looking at.
 *
 * Both halves matter. Towns, because the fold that produced the floating point
 * was a sum over cities and one city of size one can sum to a whole number by
 * luck. Technologies, because a held tech is what turns a renewal on and moves
 * a column's prices — an empire that knows nothing prints the cheapest and
 * roundest version of everything.
 */
function empire(): GameState {
  const width = 24;
  const height = 16;
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  let sizes = [7, 4, 3, 5, 2];
  let at = 0;
  for (let row = 3; row < height - 2 && at < sizes.length; row += 5) {
    for (let col = 3; col < width - 2 && at < sizes.length; col += 6) {
      const tile = getTileAt(state.map, col, row);
      if (!tile) continue;
      const city = foundCityAt(state, 0, tile);
      city.population = sizes[at]!;
      // A library and a market in the bigger towns: the per-citizen terms are
      // the ones that divide, and a fraction only appears where something did.
      if (sizes[at]! >= 4) city.buildings.push('library', 'market');
      at += 1;
    }
  }
  expect(state.cities.length).toBe(sizes.length);
  const player = state.players[0]!;
  player.techsResearched.push('agriculture', 'mining', 'earthenware', 'bronzeWorking', 'irrigation');
  player.sciencePool = 41.7;
  bumpRevision(state);
  return state;
}

/** The five voices a building preview used to speak in — the hammer is not one. */
const PREVIEW_GLYPHS = [
  YIELD_GLYPH.food,
  YIELD_GLYPH.gold,
  YIELD_GLYPH.science,
  YIELD_GLYPH.culture,
  YIELD_GLYPH.faith,
];

/**
 * Every number in a printed line, as it was written.
 *
 * Deliberately greedy about the fractional part: the point of the sweep is to
 * *catch* `2.4000000000000004`, so the pattern must be able to match one before
 * the assertion can reject it.
 */
function figuresIn(line: string): string[] {
  return [...stripRefs(line).matchAll(/[+−-]?\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

/** Everything the chart would print about one node, as strings. */
function chartLines(state: GameState, playerId: number, id: TechId): string[] {
  const def = techDef(id);
  const rate = playerScience(state, playerId);
  const turns = turnsToTech(state, playerId, id, rate);
  const progress = researchProgress(state.players[playerId]!.sciencePool, def.cost, rate);
  const lines: string[] = [
    // The node's own face and the hover card's figures row.
    `${def.cost}🔬`,
    turns === null ? '—' : `~${turns}t`,
    `${signedYield(rate)}🔬/t`,
    `${progress.banked}/${progress.cost}`,
  ];
  // The face's unlock rows: a price each, for this player.
  const { units, buildings } = liveUnlocks(id);
  for (const unit of units) lines.push(`${unitProductionCost(state, playerId, unit)}${HAMMER}`);
  for (const building of buildings) {
    lines.push(`${buildingProductionCost(building, state, playerId)}${HAMMER}`);
  }
  // The hover card's gift notes, and the node's own rules.
  for (const gift of techGifts(id)) {
    const note = giftNote(gift, state, playerId);
    if (note) lines.push(note);
    if (gift.kind === 'techEffect') lines.push(...techRuleClauses(gift.id));
  }
  return lines;
}

describe('every figure the star chart prints is whole', () => {
  it('has no fraction anywhere in the sky, for any node', () => {
    const state = empire();
    let counted = 0;
    for (const id of TECH_IDS) {
      for (const line of chartLines(state, 0, id)) {
        for (const figure of figuresIn(line)) {
          counted += 1;
          // The whole rule in one pattern: an optional sign — the house's true
          // minus as well as a hyphen — and then digits, with nothing after
          // them. A decimal point in a figure on this screen is the bug.
          expect(figure, `${id}: ${line}`).toMatch(/^[+−-]?\d+$/);
        }
      }
    }
    // The sweep is only worth anything if it actually read figures: a helper
    // that quietly returned nothing would pass every assertion above.
    expect(counted).toBeGreaterThan(200);
  });

  it('rounds the science rate rather than interpolating the fold', () => {
    // The rate is `playerScience`, a sum over every city, and a sum is a
    // fraction (batch X). An empire of five towns making 12.6 beakers printed
    // "+12.600000000000001/t" until 2026-09-09.
    const state = empire();
    const rate = playerScience(state, 0);
    expect(Number.isInteger(rate)).toBe(false);
    expect(signedYield(rate)).toMatch(/^[+−]?\d+$/);

    // And the screen really does print it that way, in all three of the places
    // it quotes the rate — the hover card's figures row, the HUD research
    // card's figures line, and that card's own tooltip. Read from the source
    // because the sweep above composes its own lines and so cannot see a
    // template change. `${rate}` in a string on this screen is the bug itself.
    const code = uiSource('techTree.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toContain('${rate}');
    expect(code.split('signedYield(rate)').length - 1).toBe(3);
  });

  it('keeps the technology’s own yields, which is the half the ruling kept', () => {
    // Irrigation's food on a farm is the user's own example of a figure that
    // *should* print. A renewal note says what it pays, signed and whole.
    const state = empire();
    const renewals = TECH_IDS.flatMap((id) =>
      techGifts(id).filter((gift) => gift.kind === 'renewal'),
    );
    expect(renewals.length).toBeGreaterThan(0);
    for (const gift of renewals) {
      const note = giftNote(gift, state, 0);
      expect(note, gift.id).toMatch(/[+−]\d+/);
      for (const figure of figuresIn(note)) expect(figure, gift.id).toMatch(/^[+−-]?\d+$/);
    }
  });
});

describe('a building a node unlocks is quoted at its price', () => {
  it('says hammers and names no other voice', () => {
    // The ruling: "The buildings don't need yield previews, as they need to be
    // built in your empire." So the row is the same shape as the unit row above
    // it — a whole number and the hammer — with no sign, no second voice and no
    // "now" to date it.
    const state = empire();
    let seen = 0;
    for (const id of TECH_IDS) {
      for (const gift of techGifts(id)) {
        if (gift.kind !== 'building' && gift.kind !== 'buildingTileYield') continue;
        seen += 1;
        const note = giftNote(gift, state, 0);
        expect(note, gift.id).toBe(`${buildingProductionCost(gift.id, state, 0)}${HAMMER}`);
        expect(note, gift.id).toMatch(/^\d+⚙$/);
        expect(note, gift.id).not.toContain('now');
        for (const glyph of PREVIEW_GLYPHS) expect(note, gift.id).not.toContain(glyph);
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('is the same price the face quotes, for every building in the sky', () => {
    // The two surfaces cannot drift, because there is one composer: the hover
    // card asks `giftNote`, and what the face writes on the row is the
    // expression `giftNote`'s building arm *is*. Asserted over `liveUnlocks`,
    // which is the list the face actually walks (a retired row is not a gift).
    const state = empire();
    let seen = 0;
    for (const id of TECH_IDS) {
      for (const building of liveUnlocks(id).buildings) {
        seen += 1;
        const face = `${buildingProductionCost(building, state, 0)}${HAMMER}`;
        expect(
          giftNote({ kind: 'building', id: building, name: '', glyph: '' }, state, 0),
          building,
        ).toBe(face);
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
});

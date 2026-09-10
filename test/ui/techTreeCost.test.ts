/**
 * What the star chart costs to draw (user, 2026-08-29: "the tech tree is quite
 * laggy … it gets laggier as the game goes on").
 *
 * The complaint had a shape and the shape was arithmetic. Every star quoted
 * "~N turns", every quote went through `turnsToTech`, and `turnsToTech` summed
 * `foldCity` over every city the empire held — twenty-seven sweeps of the
 * empire per render. Every star also listed what its technology unlocks, and a
 * building's line was `buildingYieldDelta`, which prices *every city twice*: at
 * a dozen cities that is a thousand `foldCity` calls to draw one screen. And the
 * whole chart was rebuilt — cards, connectors and two layout passes — on every
 * click, twice over, because the click's own render is followed by the host's.
 * All three get worse with each city founded, which is exactly the report.
 *
 * This file is the register of what fixed it, read out of the source because
 * there is no jsdom in this project (see `techChart.test.ts`, which reads the
 * same file for the same reason):
 *
 *   1. **The rate is read once per render** and handed down — `beginPass`.
 *   2. **A card is built once and repainted after that** — `renderChart` on the
 *      way in, `refreshNodes` for everything after.
 *   3. **The expensive line is gone entirely** — a building's row prints its
 *      price, and the delta, the `cityBaselines` hoist that made it bearable and
 *      the revision-keyed carry-over that cached it all left with it (the user,
 *      2026-09-09, `docs/flags.md` (mmm)). Rules 3 and 4 of this register used
 *      to be those two mechanisms; what is asserted now is their **absence**,
 *      which is the stronger claim — the chart cannot get slow that way twice.
 *
 * The rate hoist still carries its obligation and it is asserted rather than
 * assumed: a rate handed in gives the answer a fetched one gives
 * (`test/sim/tech.test.ts`). Hard rule 5 does not bend for a parameter. The
 * baseline's half of that claim moved to `test/sim/tech.test.ts` along with the
 * two tests that make it, the function it is about having no caller here now.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

/** The star chart's own source. See `sourceHelpers.ts` on why the glob is shared. */
function chartSource(): string {
  return uiSource('techTree.ts');
}

/** The body of one declaration, brace-matched. `techChart.test.ts`'s reader. */
function chartFunction(declaration: string): string {
  return braceBody(chartSource(), declaration);
}

/** How many times a call appears in the whole module. */
function calls(name: string): number {
  return chartSource().split(`${name}(`).length - 1;
}

/**
 * The module with its prose taken out — every block and line comment gone.
 *
 * For the assertions that say a name is **not** in the file. The names retired
 * on 2026-09-09 are still written down all over this module, deliberately: a
 * docblock that says what left and why is the only record a reader has of a
 * mechanism that no longer exists to be read. A `not.toContain` over the raw
 * text would forbid exactly that explanation, which is the wrong incentive —
 * it would make the file forget on purpose. So the absence is asserted against
 * the code and the memory is left in the comments.
 */
function chartCode(): string {
  return chartSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the science rate is summed once a render', () => {
  it('is called in exactly one place, and that place is beginPass', () => {
    // The hard evidence for "one render, one sum". `playerScience` walks every
    // city of the empire, so a second caller is a second sweep — and there used
    // to be four of them (every node, the current node's bar, the strip's
    // schedule, and the HUD's card), which is what made a forty-city chart
    // think before it drew.
    expect(calls('playerScience')).toBe(1);
    expect(chartFunction('function beginPass(')).toContain('rate: playerScience(state, playerId)');
  });

  it('hands the rate to the sim rather than working the estimate out beside it', () => {
    // Hard rule 5 across a parameter: the figure on a star is still
    // `turnsToTech`'s own answer, and the only thing that changed is that the
    // caller had already summed the empire.
    expect(chartFunction('function paintNode(')).toContain(
      'turnsToTech(state, playerId, id, rate)',
    );
    expect(chartFunction('function renderPlanStrip(')).toContain(
      'queueTurns(state, playerId, rate)',
    );
  });

  it('gives every printer the same pass, so no two can quote different rates', () => {
    // The node, the strip, the hover card and the HUD's research card all
    // destructure the one pass. Two of them summing separately would be two
    // answers to "+N a turn" on one screen.
    for (const printer of [
      'function paintNode(',
      'function renderPlanStrip(',
      'function techCard(',
      'function renderStatus(',
    ]) {
      expect(chartFunction(printer), printer).toContain('passNow()');
    }
  });

  it('opens every render with a pass, from the one entry point', () => {
    // A pass opens the render and nothing else opens one: `render` is the only
    // caller, and `passNow` is the fallback for the hover card, which is raised
    // long after the render that drew the star under it.
    expect(chartFunction('function render(')).toContain('beginPass();');
    expect(calls('beginPass')).toBe(3); // the declaration, `render`, `passNow`
  });
});

describe('a click repaints the chart rather than rebuilding it', () => {
  it('lays the sky out on the way in and never again', () => {
    // `renderChart` builds twenty-seven cards, an SVG of connectors and two
    // layout passes with a frame between them. It is called from exactly one
    // place, behind the one condition that means "there is nothing there yet".
    const body = chartFunction('function render(');
    expect(body).toContain('if (field === null) {');
    expect(body).toContain('renderChart();');
    expect(body).toContain('refreshNodes();');
    // The declaration and the one call in `render`.
    expect(calls('renderChart')).toBe(2);
  });

  it('builds no new card on a refresh', () => {
    // The claim in one line: `refreshNodes` never calls `renderNode`. A card
    // that came back new would take the keyboard, the hover and the focus mode
    // with it — which is what the old rebuild did, and why the click handler
    // used to have to hand focus back.
    const body = chartFunction('function refreshNodes(');
    expect(body).not.toContain('renderNode(');
    expect(body).toContain('paintNode(id, face);');
  });

  it('keeps the card the click landed on, so the keyboard is never handed back', () => {
    const handler = chartFunction("card.addEventListener('click'");
    expect(handler).toContain('render();');
    expect(handler).not.toContain('.focus()');
  });

  it('reads a live permission rather than the one the card was built with', () => {
    // A card outlives its render now, so `choosable` had to stop being a
    // closure: the answer captured when the star was drawn is not the answer
    // after the plan has moved twice under it.
    expect(chartFunction("card.addEventListener('click'")).toContain('if (!face.choosable) return');
    expect(chartFunction('function paintNode(')).toContain('face.choosable = choosable;');
  });

  it('re-lights the connectors and re-packs the chart, because a bar moves', () => {
    // The one thing a repaint really does change the *height* of: the progress
    // bar leaves the star that was being researched and joins the one that now
    // is. One pass, not the two-with-a-frame a fresh chart needs — nothing is
    // being waited on. A card whose height moved is a card the pack has to place
    // again, which is why this is the whole layout and not just the lines.
    const body = chartFunction('function refreshNodes(');
    expect(body).toContain('layoutField(field)');
    expect(body).toContain('drawLines(lines)');
    expect(body).not.toContain('requestAnimationFrame');
    expect(body).not.toContain('spaceColumns');
  });
});

describe('the expensive line is gone, and cannot come back quietly', () => {
  it('asks the empire nothing about what a building would be worth', () => {
    // The ruling of 2026-09-09 in one assertion: the delta and its hoist are
    // not on this screen at all. They still exist in `src/sim/tech.ts`, with
    // their tests — what left is the chart's *asking*, which is what the sweep
    // over forty buildings and a dozen cities actually was.
    const chart = chartCode();
    expect(chart).not.toContain('buildingYieldDelta');
    expect(chart).not.toContain('cityBaselines');
    // And the pass carries no baseline to hand one, so a caller cannot be added
    // back without the hoist being rebuilt deliberately.
    expect(chartFunction('function beginPass(')).not.toContain('baselines');
  });

  it('prints a price on a building row and nothing else', () => {
    // The user's words: "The buildings don't need yield previews, as they need
    // to be built in your empire." A row is hammers, like the unit row above it,
    // and the word "now" that labelled the delta as present-state went with it.
    const body = braceBody(chartCode(), 'function renderUnlocks(');
    expect(body).toContain('`${buildingProductionCost(building, state, playerId)}${HAMMER}`');
    expect(body).not.toContain(' now');
    expect(body).not.toContain('is-delta');
    // No yield glyph reaches an unlock row: the table that used to spell them
    // out (`YIELD_GLYPHS`) is gone, and the stylesheet's lit-food rule with it.
    expect(chartCode()).not.toContain('YIELD_GLYPHS');
    expect(uiSource('style.css')).not.toContain('.tech-unlock-note.is-delta');
  });

  it('carries no memo of the lines any more, because there is nothing to cache', () => {
    // The revision-keyed carry-over (`unlocksFrom`) existed for one reason and
    // that reason is retired. A repaint rebuilds every little list outright now,
    // which is two price lookups a card — cheaper than the bookkeeping was.
    const chart = chartCode();
    for (const gone of ['unlocksFrom', 'markUnlocksPriced', 'unlocksAreStale']) {
      expect(chart, gone).not.toContain(gone);
    }
    const body = braceBody(chartCode(), 'function refreshNodes(');
    expect(body).toContain('const list = renderUnlocks(id);');
    expect(body).not.toContain('reprice');
  });

  it('still dispatches from one seam, which is now all `send` is for', () => {
    // `send` used to count its own commands into the memo's revision. With the
    // memo gone it is the dispatch and the report, and it is still the only
    // dispatch in the module — the claim `onCommitted` rests on.
    expect(calls('dispatch')).toBe(1);
    const body = braceBody(chartCode(), 'function send(');
    expect(body).toContain('dispatch(getGame(), command)');
    expect(body).toContain('onCommitted?.(command, result)');
    expect(body).not.toContain('unlocksFrom');
  });
});

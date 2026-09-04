/**
 * Five promises the city screen makes across four files, none of which any one
 * file can keep on its own — which is why they are read here rather than left as
 * comments. All five come from the 2026-08-27 legibility pass, and the first
 * four had already been broken once by an edit that looked local.
 *
 *   1. **One chip per voice, on one row.** `renderYields` prints six figures;
 *      `.city-yields` is a fixed-column grid. It said five for as long as faith
 *      has been a yield, and a fixed grid does not complain — it wraps, so the
 *      panel's headline strip read as five figures and a straggler underneath.
 *      A seventh voice would do it again, silently, so the count is asserted
 *      against the printer rather than written down twice.
 *   2. **The camera bias is half the panel.** `camera.cityFrameBiasPx` exists to
 *      push a framed city clear of `#city-panel`, and the panel's width is a CSS
 *      number in another file. Widening the box without moving the bias hides
 *      the very thing the box is talking about, and nothing about that failure
 *      is loud: the city is *somewhere*, just behind the panel.
 *   3. **The panel has one register of controls.** Buy Tiles was set 10.5px
 *      uppercase on tracked letters while every other control on the screen was
 *      11px face-ui in sentence case — the one shouting button on a parchment
 *      panel, and the specific thing the playtest note called out.
 *   4. **A build row is one row.** The purchase pass put a second control on
 *      every buildable; two columns of those left the name about seventy pixels,
 *      and the name is what the list is read by.
 *   5. **The vignette hangs off "which city is open" and nothing else.** The
 *      wash the board lays over the far country while a city screen is up is
 *      cleared by six different gestures, none of which knows it exists — see
 *      the last block of this file for why that is a property of *where* the
 *      call sits rather than of what it does.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `seatRoster.test.ts` and
 * `cityPurchase.test.ts` read theirs. That is the same instrument these
 * cross-file rules need anyway: the failure is never a thrown error, it is a
 * layout that is merely wrong.
 */

import { describe, expect, it } from 'vitest';

import viewJson from '../../data/view3d.json';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { isPurchaseOnly } from '../../src/sim/purchase';
import { offeredInBuildList } from '../../src/ui/cityPanel';

const SOURCES = import.meta.glob(
  ['../../src/ui/cityPanel.ts', '../../src/ui/controls.ts', '../../src/style.css'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/**
 * The stylesheet with its comments taken out.
 *
 * This file's prose explains the very declarations it sits beside — "half the
 * panel's width", "no tracking" — so a naive scan would keep finding the
 * explanation instead of the rule. Stripping first is also what makes the brace
 * matching below safe, since a comment may contain either brace.
 */
function css(): string {
  return source('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The declarations of one CSS rule, by its exact selector list.
 *
 * Deliberately literal — a selector is matched as written, so a rule renamed out
 * from under one of these assertions fails here rather than quietly passing on
 * an empty string.
 */
function rule(selector: string): string {
  const text = css();
  const at = text.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`style.css has no rule for "${selector}"`);
  const open = text.indexOf('{', at);
  const close = text.indexOf('}', open);
  return text.slice(open + 1, close);
}

/** One declaration's value, or `undefined` if the rule does not set it. */
function declaration(selector: string, property: string): string | undefined {
  const match = new RegExp(`(?:^|[;{\\n])\\s*${property}\\s*:\\s*([^;]+)`).exec(rule(selector));
  return match?.[1]?.trim();
}

/**
 * The body of one top-level `function name(...) { … }` in a UI module —
 * `religionScreen.test.ts`'s reader, borrowed for the same job: several of the
 * claims below are about what one printer asks and nothing else, which no
 * behavioural test can see and no comment can keep.
 */
function fn(file: string, name: string): string {
  const text = source(file);
  const at = text.indexOf(`\n  function ${name}(`);
  if (at < 0) throw new Error(`${file} has no function ${name}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`${file}'s ${name} never closes`);
}

function pixels(selector: string, property: string): number {
  const value = declaration(selector, property);
  const number = Number.parseFloat(value ?? '');
  if (!Number.isFinite(number)) {
    throw new Error(`${selector} { ${property} } is not a pixel length: ${value}`);
  }
  return number;
}

describe('the yield strip', () => {
  it('has exactly one column per voice the panel prints', () => {
    // The printer's own list, read where it is written: `renderYields` builds
    // `entries` as one tuple per chip.
    const entries = /const entries: \[YieldKey, string, number\]\[\] = \[([\s\S]*?)\n {4}\];/.exec(
      source('cityPanel.ts'),
    );
    expect(entries).not.toBeNull();
    const voices = (entries![1]!.match(/^\s*\[/gm) ?? []).length;
    expect(voices).toBe(6);

    const columns = /repeat\((\d+), 1fr\)/.exec(declaration('.city-yields', 'grid-template-columns') ?? '');
    expect(columns).not.toBeNull();
    expect(Number(columns![1])).toBe(voices);
  });

  it("inks every chip's figure in its own voice", () => {
    const text = css();
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith']) {
      const has = text.includes(`.city-yield.is-${key} .city-yield-value {`);
      expect(`${key}: ${has}`).toBe(`${key}: true`);
    }
  });
});

describe('the framed city and the rails that flank it', () => {
  it('biases the camera by half the difference between the two rails', () => {
    // The mode's arithmetic, and it is the old rule generalised rather than a
    // new one: the framed town belongs in the middle of the ground the screen
    // leaves clear, so the bias is half of however much more one side covers
    // than the other. While the city screen was a single right-hand panel the
    // left side covered nothing and this was half the whole panel; with a rail
    // on each side it is half the *difference*, and the day the two rails are
    // the same width it is zero.
    //
    // The widths alone: the two gutters are one symmetric `padding` on
    // `.city-body`, so whatever they are they cancel.
    const left = pixels('.city-rail.is-left', 'width');
    const right = pixels('.city-rail.is-right', 'width');
    const bias = viewJson.camera.cityFrameBiasPx;
    // To the nearest pixel or two — a tolerance is what keeps this a check on
    // the *relationship* rather than a second place the number is written.
    expect(Math.abs(bias - (right - left) / 2)).toBeLessThanOrEqual(2);
  });

  it('leaves the unit sheet the dock the city screen left', () => {
    // The two used to share one rule and one corner. The city became a mode
    // (`docs/city-screen.md`, revision 3); the sheet did not move, and the
    // thing that would break silently is the split taking the sheet's geometry
    // with it — a panel with no width, in no corner, that still renders.
    expect(pixels('#unit-panel', 'width')).toBe(340);
    expect(pixels('#unit-panel', 'right')).toBe(14);
    expect(declaration('#unit-panel', 'position')).toBe('fixed');
  });

  it('takes no pointer events on the mode itself, so the board stays live', () => {
    // The load-bearing declaration of the whole pass: citizens are pinned by
    // clicking ringed hexes and tiles are bought off the board's own price
    // tags, and both happen *under* this container. A mode that caught the
    // pointer would be an overlay sheet with extra steps.
    expect(declaration('.city-mode', 'pointer-events')).toBe('none');
    for (const selector of ['.city-band', '.city-rail', '.city-leave']) {
      expect(`${selector}: ${declaration(selector, 'pointer-events')}`).toBe(
        `${selector}: auto`,
      );
    }
  });

  it('hands the top edge to the band while the mode holds', () => {
    // Derived from the panel's own `hidden`, never stored: every path that
    // closes a city already ends in a render that hides the container, so the
    // bar restores itself with no flag for anybody to forget to clear. What
    // gives way is the whole bar — see the mode's own register below.
    const text = css();
    expect(text).toContain('body:has(.city-mode:not([hidden])) #topbar');
  });
});

describe("the panel's controls", () => {
  it('sets Buy Tiles in the same voice as a build row — no shouting', () => {
    expect(declaration('.city-buy-tiles', 'text-transform')).toBe('none');
    expect(declaration('.city-buy-tiles', 'font-family')).toBe(
      declaration('.city-buildable', 'font-family'),
    );
    expect(declaration('.city-buy-tiles', 'font-size')).toBe(
      declaration('.city-buildable', 'font-size'),
    );
    expect(declaration('.city-buy-tiles', 'font-weight')).toBe(
      declaration('.city-buildable', 'font-weight'),
    );
    expect(declaration('.city-buy-tiles', 'letter-spacing')).toBe('normal');
  });

  it('leaves no uppercased control anywhere on the panel', () => {
    // The eyebrows (`h3`, the citizen line, the size caption) are labels and may
    // shout; a *button* may not. This is the rule the Buy Tiles note is one
    // instance of, written so the next control added inherits it.
    for (const selector of [
      '.city-buy-tiles',
      '.city-buildable',
      '.city-buildable-buy',
      '.city-icon-button',
      '.city-close',
      // The focus pane's two controls, added the day the pane shipped — the
      // note above is written so this list grows rather than the rule bending.
      '.city-focus-choice',
      '.city-focus-avoid',
    ]) {
      const transform = declaration(selector, 'text-transform') ?? 'none';
      expect(`${selector}: ${transform}`).toBe(`${selector}: none`);
    }
  });
});

/**
 * **The mode's own promises** (`docs/city-screen.md`, revision 3, ruled
 * 2026-09-03), and every one of them is a layout that would be merely wrong
 * rather than an error anything throws.
 *
 * The pass moved ink and deleted none: what the screen used to print in fifteen
 * stacked sections it now prints in a band, two rails, a hover and four
 * disclosures. The failure this block guards is the obvious regression — a
 * later edit that "simplifies" a fold back into a deletion — so what is
 * asserted is the *reach* of each thing that moved, never its position.
 */
describe('the city mode', () => {
  const panel = (): string => source('cityPanel.ts');

  it('mounts a band, two rails and one way out', () => {
    const text = panel();
    for (const call of [
      'container.append(renderBand(city, quote));',
      'body.append(renderTownRail(city, locked, quote));',
      'body.append(renderWorkRail(city, locked, puppet, quote));',
      'container.append(renderLeave());',
    ]) {
      expect(`${call}: ${text.includes(call)}`).toBe(`${call}: true`);
    }
  });

  /**
   * **The rails start where the band ends, and no stylesheet says where that
   * is** (playtest, 2026-09-03: "the build queue overlaps with the top bar").
   *
   * The first build hung all three boxes off the viewport with the rails' top
   * at `topbar + --city-band-h`, a constant built from the band's padding and
   * one line of its display face. It was right at the width it was written for
   * and wrong at every other, because the band's contents are a town's name, up
   * to four badges and six chips, and none of those is a number this file
   * knows. The fix is structural: the band is a flow row, the rails are the row
   * under it, and the height is measured by the layout instead of asserted.
   *
   * What is pinned is the *absence* of the assumption as much as the column.
   */
  it('lays the band and the rails out in flow, never off an assumed height', () => {
    expect(declaration('.city-mode', 'display')).toBe('flex');
    expect(declaration('.city-mode', 'flex-direction')).toBe('column');
    // The rails' row takes what the band leaves, and scrolls inside itself.
    expect(declaration('.city-body', 'flex')).toBe('1 1 auto');
    expect(declaration('.city-body', 'min-height')).toBe('0');
    expect(declaration('.city-rail', 'overflow-y')).toBe('auto');
    // No rule anywhere may put a rail at a hand-computed offset again.
    const text = css();
    expect(text).not.toContain('--city-band-h');
    expect(declaration('.city-band', 'position') ?? 'static').toBe('static');
    expect(declaration('.city-rail', 'position') ?? 'static').toBe('static');
  });

  it('keeps the band one row, letting the name and the belief give', () => {
    // A band that wrapped was a band twice as tall, which is what pushed the
    // work rail into the chips in the first place. What gives is the name and
    // the belief line — both ellipsise and both repeat in full on hover — and
    // never the figures.
    expect(declaration('.city-band', 'flex-wrap')).toBe('nowrap');
    expect(declaration('.city-title', 'flex-wrap')).toBe('nowrap');
    expect(declaration('.city-band h2,\n.city-band .city-faith-head', 'text-overflow')).toBe(
      'ellipsis',
    );
    expect(declaration('.city-title > .city-size', 'flex')).toBe('0 0 auto');
    expect(declaration('.city-band .city-yields', 'flex')).toBe('0 0 auto');
  });

  it('stands the empire’s whole chrome down while the mode holds', () => {
    // Two playtest defects, one rule. The research dial sat half-buried behind
    // the band and the dock's buttons floated over the town rail's ground; and
    // the bar was *half* emptied, which read as a bug rather than as a mode.
    // So every card that hangs over the board and is not the mode's own gives
    // way, and so does the bar entire — all of it through the one derived
    // mechanism, so no path can forget to restore it.
    const text = css();
    for (const id of [
      '#topbar',
      '#hud-research',
      '#hud-dock',
      '#hud-dock-popovers',
      '#hud-meters',
      '#hud-popovers',
    ]) {
      const rule = `body:has(.city-mode:not([hidden])) ${id}`;
      expect(`${id}: ${text.includes(rule)}`).toBe(`${id}: true`);
    }
    // The bar goes whole or not at all: a rule naming one of its parts would be
    // the half-emptied strip again, one element at a time.
    expect(text).not.toContain('#civ-yields {\n  visibility: hidden');
    // And the one card that stays, because it is about the hex under the
    // cursor and that is what a player in this mode is doing: it slides clear
    // of the rail rather than standing down.
    expect(text).toContain('body:has(.city-mode:not([hidden])) #hud-context');
    expect(declaration('body:has(.city-mode:not([hidden])) #hud-context', 'left')).toContain(
      '230px',
    );
  });

  it('lets the band take the bar’s place, and only when the bar has gone', () => {
    // The two facts share one condition on purpose: a browser without `:has`
    // keeps the bar *and* keeps the band below it, which is exactly the layout
    // this screen had before the strip stood down. A padding collapsed
    // unconditionally would put the band behind the bar on that browser, which
    // is the one degradation worth designing against.
    expect(declaration('.city-mode', 'padding-top')).toBe('var(--topbar-h)');
    expect(declaration('body:has(.city-mode:not([hidden])) .city-mode', 'padding-top')).toBe('0');
  });

  it('has exactly one exit, and Escape is the same verb', () => {
    // The panel's little × died with the panel — two exits in two corners is
    // the thing one obvious exit was ruled to fix. `onClose` is the option
    // `main.ts` wires to `controls.setOpenCity(null)`, which is precisely what
    // Escape calls, so the button and the key cannot come apart.
    const text = panel();
    expect(text).not.toContain("element('button', 'city-close'");
    expect(text).toContain("leave.addEventListener('click', onClose);");
  });

  it('puts the yield breakdown one hover deeper and nowhere shallower', () => {
    // The ledger the panel used to print under the chips is the card the chips
    // raise — the same five loops, moved rather than rewritten. If a future
    // edit drops the bind, six multiplied figures would be on screen with no
    // reason beside them, which is rule 5's one forbidden shape.
    const text = panel();
    expect(text).toContain('strip.bind(chip, () => yieldLedger(city, quote));');
    for (const fold of [
      'cityResourceYields(state, city)',
      'explainCityBuildings(state, city)',
      'citySpecialistYields(city)',
      'cityRouteYields(state, city)',
      'stageRows(STAGE_LABEL[stage]',
    ]) {
      expect(`${fold}: ${text.includes(fold)}`).toBe(`${fold}: true`);
    }
  });

  it('collapses the four standing facts without emptying any of them', () => {
    // Closed by default with the fold in the summary, and the section's own
    // contents inside. The four printers still exist and are still called.
    const text = panel();
    const rail = fn('cityPanel.ts', 'renderTownRail');
    for (const call of [
      "disclosure('Defence'",
      "disclosure('Built'",
      "disclosure('Routes'",
      "disclosure('Faith'",
    ]) {
      expect(`${call}: ${rail.includes(call)}`).toBe(`${call}: true`);
    }
    for (const printer of [
      'function renderDefense(',
      'function renderBuilt(',
      'function renderRoutes(',
      'function renderFollowers(',
    ]) {
      expect(`${printer}: ${text.includes(printer)}`).toBe(`${printer}: true`);
    }
    // A `<details>` and not a class that hides things: the platform's own
    // disclosure opens on Enter and announces itself as expandable.
    expect(text).toContain("element('details', 'city-disc')");
  });

  it('shelves the add-list by the simulation’s own category, never by a name', () => {
    // `queueCategory` is the one place a queue row is sorted into a production
    // category (`cities.ts`); the tabs read it. Nothing here compares a row
    // against a string name, which is the rule `src/sim` keeps and the panel
    // has to keep to stay correct when the table grows.
    const text = panel();
    expect(text).toContain("queueCategory({ kind: 'building', id })");
    expect(text).toMatch(/import \{[^}]*queueCategory[^}]*\} from '\.\.\/sim\/cities'/s);
    // Four shelves, and the list of them is data rather than a switch.
    const shelves = /export const ADD_SHELVES[\s\S]*?\n\];/.exec(text);
    expect(shelves).not.toBeNull();
    expect((shelves![0].match(/label: '/g) ?? []).length).toBe(4);
  });

  it('remembers the shelf in module state, never in the game', () => {
    // Which tab was last open is a fact about this sitting at the keyboard: a
    // save is `{config, log}` and replays, so a tab in the state would be a
    // save that replayed differently.
    const text = panel();
    expect(text).toMatch(/^let addShelf: AddShelf = 'unit';$/m);
    expect(text).not.toMatch(/city\.addShelf|state\.addShelf/);
  });

  it('prints its one board instruction only when somebody is asking', () => {
    // An instruction that is always on screen is one nobody reads. Two readers
    // are left: a player being taught, and a player who has armed Buy Tiles.
    const printer = fn('cityPanel.ts', 'renderBoardCaption');
    expect(printer).toContain('isBuyMode()');
    expect(printer).toContain('isTutorialActive()');
    expect(printer).toContain('A ringed hex is a tile this city works');
  });
});

describe('the build list', () => {
  it('gives each buildable a whole row', () => {
    // One column, so the row below can be an honest name | cost · turns | buy
    // grid at the panel's ordinary type sizes.
    expect(declaration('.city-buildable-grid', 'grid-template-columns')).toBe('minmax(0, 1fr)');
  });

  it('lays the row and the button as grids, with the buy tag in its own track', () => {
    expect(declaration('.city-buildable-row', 'grid-template-columns')).toBe(
      'minmax(0, 1fr) auto',
    );
    expect(declaration('.city-buildable', 'display')).toBe('grid');
    expect(declaration('.city-buildable', 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
  });

  it('floors the two figure columns so neither steals width from a name', () => {
    // The squeeze that started this pass was the buy tag growing a digit and
    // taking the room out of the name beside it. A floor on each figure column
    // means the name is the only thing that flexes, and it flexes *up*.
    expect(declaration('.city-buildable-cost', 'min-width')).toBeDefined();
    expect(declaration('.city-buildable-buy', 'min-width')).toBeDefined();
    // And the name is still the cell that gives: it, and only it, ellipsises.
    expect(declaration('.city-buildable-name', 'text-overflow')).toBe('ellipsis');
  });

  it('offers no row for a piece that is called rather than built', () => {
    // The playtest's (2026-08-27): "Great Person" sat among the units at
    // 0⚙ · 0t, which reads as the best piece in the game for nothing. It is
    // neither built nor bought — `buildError` and `purchaseError` both refuse
    // the row — so it has no place on a list of things a town can start.
    const called = UNIT_TYPE_IDS.filter((id) => unitDef(id).greatWork === true);
    // The premise: if the roster ever stops marking one, this test is vacuous
    // and should say so rather than pass.
    expect(called.length).toBeGreaterThan(0);
    for (const id of called) expect(offeredInBuildList(id), id).toBe(false);
  });

  it('still offers every ordinary unit, and still hides the ones sold in a bank', () => {
    // The other two arms, so "hide it" cannot quietly become "hide everything".
    expect(offeredInBuildList('warrior')).toBe(true);
    expect(offeredInBuildList('settler')).toBe(true);
    for (const id of UNIT_TYPE_IDS) {
      if (!isPurchaseOnly({ kind: 'unit', id })) continue;
      expect(offeredInBuildList(id), id).toBe(false);
    }
    // And the predicate turns away exactly the two marked classes, no third.
    const hidden = UNIT_TYPE_IDS.filter((id) => !offeredInBuildList(id));
    for (const id of hidden) {
      const def = unitDef(id);
      expect(def.greatWork === true || isPurchaseOnly({ kind: 'unit', id }), id).toBe(true);
    }
  });

  it('drops a superseded row from the list rather than greying it', () => {
    // The obsolescence ruling (user, 2026-09-03: "once a unit is obsolete …
    // please remove it from the build queue"). It is a fact about an *empire*
    // rather than about the roster, so it cannot join `offeredInBuildList` —
    // which is exactly why it is read out of the source here: the panel greys a
    // row it cannot build *yet* and skips a row that has been replaced, and the
    // difference between the two is one `continue` nobody would miss going.
    const panel = source('cityPanel.ts');
    expect(panel).toContain("if (upgradeTargetForType(state, city.ownerId, id) !== null) continue;");
    // Asked of the reducer's own walk, so the list and the gate cannot drift.
    expect(panel).toMatch(/import \{[^}]*upgradeTargetForType[^}]*\} from '\.\.\/sim\/tech'/s);
  });
});

/**
 * The captions under the two lists, and the one thing a caption must be: true.
 *
 * All three from the same playtest note (2026-08-27). Read from the source
 * because a stale sentence throws nothing, renders perfectly, and is only ever
 * caught by somebody reading it — which is exactly what happened.
 */
describe('what the panel says at the foot of a list', () => {
  it('does not say "dots" about a board that draws rings', () => {
    // `overlays.ts` has drawn a *ring* on every worked hex since the overlay
    // pass — bone white for the assignment's choice, the seat's ink for a pin.
    const text = source('cityPanel.ts');
    expect(text).not.toContain('Dots on the map');
    expect(text).toContain('A ringed hex is a tile this city works');
  });

  it('does not print the treasury a second time under the build list', () => {
    // The top bar carries `Player.gold` on a chip a hand's width above this
    // caption; a second copy is a number a player has to check against itself.
    // What is left is the rule a price tag cannot state on its own.
    const text = source('cityPanel.ts');
    expect(text).not.toContain('in the treasury');
    // Cut to a fragment with the rails (2026-09-03), and the claim is the one
    // it always was: what survives is the *conversion* — the rule no single
    // price tag can state for itself — and the treasury is still nowhere.
    expect(text).toContain('A tag buys the row outright');
    expect(text).toContain('banked hammers stay banked');
  });

  it('leaves air between the last build row and the caption', () => {
    // A paragraph after a list gets a list's worth of space, not a row's: at the
    // grid's own gap the caption read as one more row that had lost its button.
    const grid = pixels('.city-buildable-grid', 'gap');
    expect(pixels('.city-buildables .hint', 'margin-top')).toBeGreaterThan(grid);
  });
});

/**
 * The vignette's other half, which is not in the renderer at all: *when* the
 * board is told there is a city screen open.
 *
 * The renderer owns the wash; `controls.ts` owns the answer to "which city is
 * open", and the whole design is that there is only one of those and everything
 * reads it. The failure this guards is the obvious shortcut — arming the wash
 * in `setOpenCity`, where opening happens — because `setOpenCity` is one of the
 * ways a city stops being open and not all of them. A seat change, a new game
 * and a load each clear `openCityId` and refresh, and a city captured under the
 * panel stops resolving with nobody assigning anything. All of those already go
 * through `refreshOverlays`.
 *
 * Read from the source because there is no jsdom here and, more to the point,
 * because the thing being asserted is *where a call sits*, which no behavioural
 * test can see.
 */
describe('the vignette and the open city', () => {
  /** The body of one top-level `function name(...) { … }` in `controls.ts`. */
  function body(name: string): string {
    const text = source('controls.ts');
    const at = text.indexOf(`\n  function ${name}(`);
    if (at < 0) throw new Error(`controls.ts has no function ${name}`);
    const open = text.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(open + 1, i);
      }
    }
    throw new Error(`controls.ts: ${name} never closes`);
  }

  it('tells the board on the same sweep that refreshes every other overlay', () => {
    expect(body('refreshOverlays')).toContain('refreshCityFocus()');
  });

  it('asks the open city, never the spotlit one', () => {
    // `spotlitCity()` answers for a *hovered* banner too, which is right for the
    // worked-tile dots and wrong for this: a wash that swept the board every
    // time the pointer crossed a town would be announcing a screen change that
    // did not happen.
    const focus = body('refreshCityFocus');
    expect(focus).toContain('openCity()');
    expect(focus).not.toContain('spotlitCity');
  });

  it('has exactly one caller, so there is no parallel flag to fall out of step', () => {
    const calls = source('controls.ts').match(/renderer\.setCityFocus\?\./g) ?? [];
    expect(calls.length).toBe(2);
    const focus = body('refreshCityFocus');
    expect((focus.match(/renderer\.setCityFocus\?\./g) ?? []).length).toBe(2);
  });
});

/**
 * A sixth promise, and the one this pass added: **the panel says why the
 * citizens moved.**
 *
 * `assignCitizens` leans on `citizenFocusWeights.production` whenever the front of
 * the queue halts growth (playtest batch two: "a city should auto-work
 * production tiles when creating a settler"), and a panel that showed a
 * different assignment than it did last turn with nothing to account for it
 * reads as the game shuffling citizens at random. The line is one sentence, only
 * on the towns that are actually chasing hammers.
 *
 * Two halves, and the failure is only ever in the join between them: the
 * *decision* is `citizenFocus`, which is asserted against the simulation, and
 * the panel is asserted to ask it — a UI that re-derived "is there a settler at
 * the front" would be a second reading of a rule the sim already owns, and would
 * still be printing the line the day something other than a settler halts a town.
 */

import { citizenFocus, foundCityAt } from '../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';

/** The sentence, written once here and once in the panel — and nowhere else. */
const FOCUS_LINE = 'Working for production — a settler is at the front.';

function focusState(): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function tileAt(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

describe('the citizen focus line', () => {
  it('is silent while the town is simply growing', () => {
    const state = focusState();
    const city = foundCityAt(state, 0, tileAt(state, 6, 6));
    city.queue = [{ kind: 'building', id: 'granary' }];
    expect(citizenFocus(city)).toBe('balanced');
  });

  it('speaks when a settler is at the front of the queue', () => {
    const state = focusState();
    const city = foundCityAt(state, 0, tileAt(state, 6, 6));
    city.queue = [{ kind: 'unit', id: 'settler' }];
    expect(citizenFocus(city)).toBe('production');
  });

  it('is about the *front* of the queue and nothing further back', () => {
    // The halt is a fact about what the hammers are going into right now, so a
    // settler queued behind a granary changes nothing about where the citizens
    // stand this turn.
    const state = focusState();
    const city = foundCityAt(state, 0, tileAt(state, 6, 6));
    city.queue = [
      { kind: 'building', id: 'granary' },
      { kind: 'unit', id: 'settler' },
    ];
    expect(citizenFocus(city)).toBe('balanced');
  });

  it('is printed by the panel off that decision, not off a queue it reads itself', () => {
    const text = source('cityPanel.ts');
    expect(text).toContain(FOCUS_LINE);

    // The printer's own body: it asks `citizenFocus` and asks nothing else. The
    // rule this guards is that nothing here re-derives the halt — not from the
    // queue's front, not from `haltsGrowth`, and certainly not by comparing a
    // type against `"settler"`. The marker belongs to the simulation, and the
    // day something other than a settler halts a town this sentence is the one
    // place that needs a word rather than a second condition.
    const at = text.indexOf('function renderCitizenFocus(');
    expect(at).toBeGreaterThanOrEqual(0);
    let depth = 0;
    let printer = '';
    for (let index = text.indexOf('{', at); index < text.length; index += 1) {
      if (text[index] === '{') depth += 1;
      else if (text[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          printer = text.slice(at, index + 1);
          break;
        }
      }
    }
    expect(printer).toContain(`citizenFocus(city) !== 'production'`);
    expect(printer).not.toContain('haltsGrowth');
    expect(printer).not.toContain('queue');
    // The *quoted* id, not the word: the sentence itself says "a settler", which
    // is prose about the one thing that halts a town today and not a comparison.
    expect(printer).not.toContain("'settler'");
  });

  it('stands directly under the working count, which is what it is a note about', () => {
    // The claim survives the mode; where the three sit does not. The citizens'
    // row was a section of its own with the focus note under it and Growth
    // beneath; the 2026-09-03 revision folds the count *into* the Growth row
    // ("5/7 working") and the note follows it down the town rail. What must
    // stay true is the reading order: the count, then the sentence explaining
    // where those citizens went.
    const text = source('cityPanel.ts');
    const growth = text.indexOf('clocks.append(renderGrowth(city, quote));');
    const focus = text.indexOf('const focus = renderCitizenFocus(city);');
    expect(growth).toBeGreaterThanOrEqual(0);
    expect(focus).toBeGreaterThan(growth);
    // And the count is on the Growth row itself rather than in a section — the
    // one call, inside the one printer.
    expect(source('cityPanel.ts')).toContain('foot.append(renderCitizens(city));');
  });
});

/**
 * **The Growth line prints the fold's own list** (rule 5, and the dry-settle
 * ruling of 2026-09-03 is what made it matter).
 *
 * `growthSurplus` is the fold of `explainGrowthPercent`, so the modifiers under
 * the Growth line have to be that list and not a second reading of one of its
 * sources. The panel used to print the happiness stifle alone — it asked
 * `growthPercent(meterEffects(...))` itself — which was honest while the meters
 * were the only source and quietly wrong from the day an aqueduct, a wonder and
 * a dry site joined the same sum: the number moved and its reason did not print.
 *
 * Read out of the source, because the failure is not an error: a printer that
 * re-derives one line still renders, and the panel simply stops telling a player
 * why their town is slow.
 */
describe('the growth modifiers', () => {
  it('are the list `growthSurplus` folds, not a second reading of the meters', () => {
    const text = source('cityPanel.ts');
    const at = text.indexOf('function renderGrowth(');
    expect(at).toBeGreaterThanOrEqual(0);
    let depth = 0;
    let printer = '';
    for (let index = text.indexOf('{', at); index < text.length; index += 1) {
      if (text[index] === '{') depth += 1;
      else if (text[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          printer = text.slice(at, index + 1);
          break;
        }
      }
    }
    expect(printer).toContain('explainGrowthPercent(');
    // Not one source of the sum, and not the number without its parts.
    expect(printer).not.toContain('growthPercent(');
    expect(printer).not.toContain('meterEffects(');
    // And nothing here knows what fresh water is or what lifts the penalty: the
    // line's words and the condition behind them are the simulation's. The
    // *quoted* id, not the word — the comment above the loop names the aqueduct
    // as prose, which is a sentence about the rule and not a comparison.
    expect(printer).not.toContain('cityHasFreshwater');
    expect(printer).not.toContain("'aqueduct'");
  });
});

/**
 * **The citizen focus pane** (ruled 2026-09-03, `docs/city-screen.md`): four
 * words and a checkbox in the left rail, under the two clocks they move.
 *
 * Read out of the source for this file's usual reason — there is no jsdom here,
 * and every failure this block guards is a control that still renders and simply
 * does the wrong thing: a segment that dispatches nothing, a pane that draws
 * from a variable instead of from the town, a control a puppet can press. The
 * behaviour behind it is pinned in `test/sim/cities.test.ts`; what is asserted
 * here is the wiring only that file can see.
 */
describe('the citizen focus pane', () => {
  const panel = (): string => source('cityPanel.ts');

  it('sits in the left rail, directly under the Growth and Borders meters', () => {
    const rail = fn('cityPanel.ts', 'renderTownRail');
    const growth = rail.indexOf('renderGrowth(city, quote)');
    const borders = rail.indexOf('renderBorders(city, locked, quote)');
    const focus = rail.indexOf('renderFocusPane(city, locked)');
    expect(growth).toBeGreaterThanOrEqual(0);
    expect(borders).toBeGreaterThan(growth);
    // In the clocks card and after both of them — "under the meters" is the
    // ruling's own word, and it is the only thing about the pane's position
    // that a later edit must not quietly undo.
    expect(focus).toBeGreaterThan(borders);
    expect(rail.slice(borders, focus)).toContain('clocks.append(');
  });

  it('offers every focus the simulation knows, in the sim’s own order', () => {
    // The list is `CITIZEN_FOCUSES`, never four literals: a fifth focus is a
    // data change, and a pane that had written the words out would offer three.
    const pane = fn('cityPanel.ts', 'renderFocusPane');
    expect(pane).toContain('for (const focus of CITIZEN_FOCUSES)');
    expect(pane).toContain('focusLabel(focus)');
  });

  it('dispatches one command carrying the whole arrangement', () => {
    const send = fn('cityPanel.ts', 'sendFocus');
    expect(send).toContain("type: 'setCitizenFocus'");
    expect(send).toContain('cityId: city.id');
    expect(send).toContain('focus,');
    expect(send).toContain('avoidGrowth,');
    // The panel's own funnel, so the dispatch is reported like every other.
    expect(send).toContain('report(command, dispatch(getGame(), command))');
    expect(send).toContain('onChanged();');
  });

  it('reflects the town rather than a variable of its own', () => {
    const pane = fn('cityPanel.ts', 'renderFocusPane');
    // Which segment is lit and whether the box is ticked are both read off the
    // city on every render — the panel keeps no state, so a refused command
    // leaves the control showing what the town actually says.
    expect(pane).toContain('const current = cityFocus(city)');
    expect(pane).toContain("button.classList.toggle('is-active', focus === current)");
    expect(pane).toContain('tick.checked = city.avoidGrowth === true');
    expect(panel()).not.toContain('let focusChoice');
  });

  it('greys itself with the sentence the reducer would have returned', () => {
    const pane = fn('cityPanel.ts', 'renderFocusPane');
    expect(pane).toContain('focusBlocker(state, localPlayerId(), city, locked)');
    expect(pane).toContain('button.disabled = blocker !== null');
    expect(pane).toContain('tick.disabled = blocker !== null');
    expect(pane).toContain('button.title = blocker ??');
    // And the blocker asks the simulation first, so a puppet is told it is a
    // puppet rather than something about the turn.
    const blocker = source('cityPanel.ts');
    const at = blocker.indexOf('export function focusBlocker(');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = blocker.slice(at, blocker.indexOf('\n}', at));
    expect(body.indexOf('citizenFocusError(')).toBeLessThan(body.indexOf('locked ?'));
  });

  it('drops the settler note once the player has said something', () => {
    // The two would otherwise both speak: the note explains a lean as a
    // settler's doing, and a town told to chase coin is not leaning for that
    // reason at all. See `citizenLean` — the player's word outranks the guess.
    const note = fn('cityPanel.ts', 'renderCitizenFocus');
    expect(note).toContain("if (cityFocus(city) !== 'default') return null;");
  });

  it('sets the pane in the panel’s own register of controls', () => {
    expect(declaration('.city-focus-choice', 'font-family')).toBe(
      declaration('.city-buy-tiles', 'font-family'),
    );
    expect(declaration('.city-focus-choice', 'letter-spacing')).toBe('normal');
    expect(declaration('.city-focus-avoid', 'letter-spacing')).toBe('normal');
    // Four segments sharing the rail's width, so the row reads as one control.
    expect(declaration('.city-focus-choices', 'grid-template-columns')).toBe('repeat(4, 1fr)');
  });
});

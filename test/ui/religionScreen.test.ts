/**
 * Three promises the Religion sheet makes across two files, none of which
 * either file can keep on its own.
 *
 *   1. **It is a split, and it is the Statecraft sheet's split.** The 2026-08-27
 *      pass gave both parchment screens the same shape — a fixed column of what
 *      your empire *is*, a scrolling pane of what it can *do* — by having the
 *      Religion screen build the very classes the Statecraft one does. The
 *      failure this guards is quiet and total: a `draw()` that goes back to
 *      appending blocks straight onto the body still renders perfectly, in one
 *      column, off the bottom of a 720-tall viewport, which is the thing the
 *      pass existed to fix.
 *   2. **One breakpoint, not two that agree today.** The width at which a split
 *      stops being readable is a fact about the split. Both sheets stack in the
 *      *same* media query, so this asserts there is exactly one `max-width`
 *      query naming either overlay and that it names both.
 *   3. **The sheet has one register of controls.** `cityScreen.test.ts`'s rule
 *      three, one screen over: an eyebrow is a label and may shout, a *control*
 *      may not. The Buy control and the city select are the two on this sheet.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `cityScreen.test.ts` and
 * `seatRoster.test.ts` read theirs — and that is the right instrument anyway,
 * because every failure above is a layout that is merely wrong rather than an
 * error anything throws.
 */

import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/religionScreen.ts',
    '../../src/ui/statecraftScreen.ts',
    '../../src/ui/topBar.ts',
    '../../src/style.css',
    '../../index.html',
  ],
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
 * The prose beside these rules explains the very declarations being asserted —
 * "one media query for both sheets", "sentence case" — so a naive scan keeps
 * finding the explanation instead of the rule.
 */
function css(): string {
  return source('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The declarations of one rule, by its exact selector list. */
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

/** The body of one top-level `function name(...) { … }` in a screen module. */
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

/**
 * The painting itself is `paint`, not `draw`: since batch H18 `draw` is the
 * frame around it — it takes the one reading of the real board every belief on
 * this sheet shares (`cardImpactSheet`) and lets go of it on the way out — and
 * everything about the *layout* is one function in.
 */
describe('the Religion sheet is a split', () => {
  it("builds the Statecraft screen's own four split classes", () => {
    const draw = fn('religionScreen.ts', 'paint');
    for (const className of ['sc-split', 'sc-column', 'sc-column-body', 'sc-pane']) {
      expect(`${className}: ${draw.includes(`'${className}`)}`).toBe(`${className}: true`);
    }
  });

  it('puts the pantheon in the column and the cards above the tide above the clergy', () => {
    // **The ruling of 2026-09-06 as an order**: the sheet's subject is the deck,
    // so the cards lead, the tide reports what they are doing, and the purchases
    // close. The failure this guards is the old sheet's, which led with a price
    // — a player opening the screen met a button before they met their gods.
    const draw = fn('religionScreen.ts', 'paint');
    const column = draw.indexOf('sc-column-body');
    const pantheon = draw.indexOf('drawPantheon');
    const pane = draw.indexOf("'sc-pane'");
    const pool = draw.indexOf('drawPool');
    const religion = draw.indexOf('drawReligion');
    const tide = draw.indexOf('drawTide');
    const rites = draw.indexOf('drawRites');
    const clergy = draw.indexOf('drawClergy');
    // Order in the source is order in the DOM here: every one of these is an
    // `append` onto the node built just above it.
    expect(column).toBeGreaterThan(-1);
    expect(pantheon).toBeGreaterThan(column);
    expect(pane).toBeGreaterThan(pantheon);
    expect(pool).toBeGreaterThan(pane);
    expect(religion).toBeGreaterThan(pool);
    expect(tide).toBeGreaterThan(religion);
    expect(rites).toBeGreaterThan(tide);
    expect(clergy).toBeGreaterThan(rites);
  });

  it('caps every parchment sheet at the viewport, from one rule', () => {
    // The cap is what makes a pane scroll instead of the page: without it the
    // sheet grows and the "fixed" column leaves with it.
    //
    // **The cap belongs to the paper** (batch H5). It used to name the eight
    // overlay ids, on the argument that a later overlay borrowing this paper
    // should be one column until it said otherwise — and eight sheets later the
    // list had been repeated in five places and no sheet had ever wanted the
    // uncapped version. So it is scoped to `.statecraft-overlay`, which is the
    // class every one of them already wears, and a ninth sheet is capped by
    // putting the paper on. What is pinned is that there is exactly **one** cap
    // rule: a second that agreed today would be two the first time either moved.
    //
    // The Reliquary is the only sheet that then *narrows* — it takes the cap and
    // overrides the width to ~30rem, because there is one card on it. Which is
    // the invitation working as intended: borrow the paper, then say what is
    // different.
    expect(declaration('.statecraft-overlay', 'overflow')).toBe('hidden');
    // One selector, one rule: the overlay's half of the cap is set on the paper's
    // own block rather than in a second block with the same selector.
    expect(css().match(/\n\.statecraft-overlay \{/g)).toHaveLength(1);
    expect(declaration('.statecraft-overlay .statecraft-sheet', 'max-height')).toBe('100%');
    const html = source('index.html');
    for (const id of [
      'statecraft',
      'religion',
      'trade',
      'compendium',
      'diplomacy',
      'beads',
      'reliquary',
      'ledger',
    ]) {
      expect(html, id).toMatch(
        new RegExp(`id="${id}-overlay"\\s*\\n\\s*class="statecraft-overlay"`),
      );
    }
    // And no sheet has grown a cap of its own beside the shared one.
    expect(css()).not.toMatch(/#[a-z]+-overlay \.statecraft-sheet \{/);
  });

  it('scrolls the two halves in themselves, not the sheet', () => {
    expect(declaration('.sc-column-body', 'overflow-y')).toBe('auto');
    expect(declaration('.sc-pane', 'overflow-y')).toBe('auto');
  });
});

describe('the breakpoint', () => {
  it('stacks both sheets in one and the same media query', () => {
    const text = css();
    const queries = [...text.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)].filter(
      ([, , body]) => body.includes('.statecraft-overlay'),
    );
    // Exactly one, for the paper every sheet wears: two queries that agree today
    // are two numbers. (Batch H5 — see the cap's own pin above.)
    expect(queries).toHaveLength(1);
    const [, width, body] = queries[0]!;
    expect(Number(width)).toBe(860);
    expect(body).toContain('.statecraft-overlay');
    expect(body).toContain('.statecraft-overlay .statecraft-sheet');
    // And what stacking means: the split becomes a column and the two scrollers
    // give their scrolling back to the sheet.
    expect(body).toContain('.sc-split');
    expect(body).toContain('flex-direction: column');
    expect(body).toContain('overflow-y: visible');
  });
});

describe("the sheet's controls", () => {
  it('leaves no uppercased control on the Religion sheet', () => {
    // The eyebrows are labels and may shout; a button and a select may not.
    // Three now: the religion pane's name field is the third control this
    // sheet builds, and it is the one most likely to be dressed as a form
    // element by accident.
    for (const selector of [
      '.rel-buy',
      '.rel-city-select',
      '.rel-name-field',
      '.btn',
      '.btn-primary',
    ]) {
      const transform = declaration(selector, 'text-transform') ?? 'none';
      expect(`${selector}: ${transform}`).toBe(`${selector}: none`);
    }
  });

  it('never sets a control on this sheet in upper case from its own markup', () => {
    // The other way a control can shout: the label written in capitals. Every
    // button and option this screen builds takes its text from a def's `name`,
    // from the roster's own verb (`UnitDef.purchase.verb`) or from a sentence,
    // and this pins that none of them is typed in caps here.
    const text = source('religionScreen.ts');
    expect(/textContent = '[A-Z ]{4,}'/.test(text)).toBe(false);
  });

  it('takes the clergy row’s words off the roster, never out of this file', () => {
    // A verb typed here would be a second name for a piece — "Call a prophet"
    // lives on `UnitDef.purchase.verb` so a designer renaming the piece renames
    // the button. The price is `explainPurchaseCost`'s total and the refusal is
    // `purchaseError`'s sentence, which is what makes a pressable button a
    // command the reducer takes.
    const row = fn('religionScreen.ts', 'drawClergyRow');
    expect(row).toContain('def.purchase?.verb');
    expect(row).toContain('explainPurchaseCost(state, seat, cityId, item, currency)');
    expect(row).toContain('purchaseError(state, seat, cityId, item, currency)');
  });
});

/**
 * **The retired piece is gone from the sheet, sentence and comment alike**
 * (`docs/flags.md`, rulings of 2026-09-06 evening, item c).
 *
 * The augur is `retired: true` on its roster row: `buildError`, `purchaseError`
 * and `consecrateError` all refuse it, its consecration is the faith ladder's
 * and its rites are a town's verbs. A sheet that still sold it, still explained
 * it, or still carried a comment written around it would be teaching a rule the
 * reducer does not keep — and a comment is the half that rots quietest, which is
 * why this reads the whole source rather than only the strings.
 */
describe('the retired agent', () => {
  it('is named nowhere on the Religion sheet', () => {
    expect(/augur/i.test(source('religionScreen.ts'))).toBe(false);
  });

  it('sells the three pieces that are still called, in the order they are met', () => {
    const text = source('religionScreen.ts');
    expect(text).toContain("const CLERGY: readonly UnitTypeId[] = ['prophet', 'apostle', 'inquisitor']");
  });
});

/**
 * The standing face of a belief, and the ruling that put a figure on it
 * (`docs/flags.md` playthrough note 10, 2026-09-05: the card animations and the
 * yields belong on the religion cards too).
 *
 * Two sizes and no third: the ceremony is the draft, where the card is dealt
 * full-length and the number counts up; the column keeps the compact face, and
 * its stamp **lands**. A screen that replayed the count every time it opened
 * would be celebrating a decision the player made an age ago — the Doctrine
 * shelf's rule, one system over.
 */
describe('the gods in the column wear their figure', () => {
  it('builds the stamp on the compact face and lands it', () => {
    const text = source('religionScreen.ts');
    expect(text).toContain('const stamp = cardStampNode();');
    expect(text).toContain('if (reading) landCardStamp(stamp, reading);');
    // Never played: there is no ceremony on a screen at rest.
    expect(text).not.toContain('playCardStamp');
  });

  it('reads the figure from the sim and shows nothing when there is nothing', () => {
    const text = source('religionScreen.ts');
    // The sheet's shared half rides in as the fourth argument (batch H18) and
    // changes no figure — `test/sim/cardImpact.test.ts` pins that.
    expect(text).toContain(
      "stampReading(explainCardImpact(state, seat, { kind: 'belief', id }, sheet ?? undefined))",
    );
    // A belief that pays nothing standing keeps the flourish rather than a nought.
    expect(text).toContain('stampIsEmpty(reading) ? null : reading');
  });

  it('hands every face on the sheet its own reading', () => {
    const text = source('religionScreen.ts');
    // The pantheon's places and the religion's two houses — a face drawn without
    // a reading is a card wearing the flourish while it is quietly paying.
    const drawn = text.match(/drawBeliefFace\([^)]*\)/g) ?? [];
    expect(drawn.length).toBeGreaterThanOrEqual(2);
    for (const call of drawn) {
      if (call.startsWith('drawBeliefFace(\n')) continue;
      expect(call, call).toContain('beliefStamp(state, seat,');
    }
    // And the house's pool reaches the face, so a follower belief is not
    // announced as a god.
    expect(text).toContain('drawBeliefFace(card, id, house.pool');
  });

  it('keeps the compact stamp compact', () => {
    // The two-sizes rule as a number: the column's seat is the collection's, not
    // the tarot face's 24px — a taller seat would grow every slot on the sheet.
    expect(declaration('.rel-slot .card-stamp', 'min-height')).toBe('20px');
    expect(declaration('.rel-slot .card-stamp', 'line-height')).toBe('20px');
  });

  it('prints every clause of a face through the descriptor writer', () => {
    // Hard rule: a describer emits `[[kind:id|Name]]`, and a clause written with
    // `textContent` would print the brackets. Both writers are asked here — the
    // live one on the face, the stripped one in the platform `title` a wheel
    // house carries.
    const text = source('religionScreen.ts');
    expect(text).toContain('setDescriptorText(item, clause.text, { linked })');
    expect(text).toContain('stripRefs(clause.text)');
    expect(/textContent = `\$\{[^}]*clause/.test(text)).toBe(false);
  });
});

/**
 * **The pantheon is three places, and an empty one says what it is waiting for**
 * (`docs/flags.md`, rulings of 2026-09-06 evening, items b and d).
 *
 * The old sheet drew `pantheonSlots` places and stopped, so an empire before The
 * High Temple saw two places and no third — the slot existed, the tree opened
 * it, and the screen said nothing about either. And an empty place said
 * "unnamed", which answers none of the three questions a player actually has:
 * what does the next god cost, how close am I, and what opens the place after.
 *
 * Every figure in the answer is the **sim's** (`explainNextRung` /
 * `nextRungWords`), and that is the load-bearing half: the faith chip's hover
 * card prints the same sentence off the same reading, and a threshold composed
 * twice is a threshold two surfaces will one day quote differently.
 */
describe('the places at the fire', () => {
  it('walks the sim’s own list of places, not the count of open slots', () => {
    const pantheon = fn('religionScreen.ts', 'drawPantheon');
    expect(pantheon).toContain('pantheonPlaces(state, seat)');
    // The shut place names its technology off the place, never out of this file.
    expect(fn('religionScreen.ts', 'drawEmptyPlace')).toContain('techDef(place.awaits).name');
  });

  it('prints the rung’s price from the sim describer and never composes one', () => {
    const empty = fn('religionScreen.ts', 'drawEmptyPlace');
    expect(empty).toContain('nextRungWords(rung)');
    // The bar is the same two figures the sentence names — `banked / cost` — so
    // a reader of the bar and a reader of the line are told one thing. What must
    // not appear is a threshold arithmetic of this file's own.
    expect(empty).toContain('rung.banked / rung.cost');
    expect(empty).not.toContain('faithRungCost');
  });

  it('leads the pane with the pool and the same ladder sentence', () => {
    const pool = fn('religionScreen.ts', 'drawPool');
    expect(pool).toContain('nextRungWords(explainNextRung(state, seat, rate))');
  });

  it('is the sentence the faith chip’s hover card prints, off one describer', () => {
    // The other surface, read from its own source: two compositions of one
    // reading is how a chip and a sheet come to quote two thresholds.
    const bar = source('topBar.ts');
    expect(bar).toContain("import { explainNextRung, nextRungWords } from '../sim/religion'");
    expect(bar).toContain(
      'nextRungWords(explainNextRung(state, playerId, civYields(state, playerId).faith))',
    );
  });
});

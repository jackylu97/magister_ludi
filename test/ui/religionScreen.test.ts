/**
 * What the Faith sheet promises across its files, none of which one file can
 * keep on its own.
 *
 *   1. **Three tabs, each drawn by its own module.** Rites (`ritesTab.ts`),
 *      Bonuses (`bonusesTab.ts`) and Religion & followers (`followersTab.ts`),
 *      the chosen tab remembered per seat. The third tab keeps the split the
 *      2026-08-27 pass gave both parchment screens: a fixed column of what the
 *      religion is, and a pane that scrolls.
 *   2. **One breakpoint, not two that agree today.** The width at which a split
 *      stops being readable is a fact about the split. Both sheets stack in the
 *      same media query, so this asserts there is exactly one `max-width`
 *      query naming the paper.
 *   3. **The sheet has one register of controls.** An eyebrow is a label and
 *      may shout; a control may not.
 *
 * No document in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `cityScreen.test.ts` and
 * `seatRoster.test.ts` read theirs. Each tab's own behaviour is tested on real
 * boards in its own suite: `ritesTab.test.ts`, `bonusesTab.test.ts` and
 * `followersTab.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import {
  FAITH_TABS,
  chooseFaithTab,
  faithTabFor,
  riteGrantWords,
  riteTeacherName,
} from '../../src/ui/religionScreen';
import { riteTeachingCard } from '../../src/sim/religion';
import { LIVE_RITE_IDS, riteDef } from '../../src/sim/religionData';
import { orderDef } from '../../src/sim/statecraftData';
import { techDef } from '../../src/sim/techData';
import { braceBody } from './sourceHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/religionScreen.ts',
    '../../src/ui/ritesTab.ts',
    '../../src/ui/riteWords.ts',
    '../../src/ui/bonusesTab.ts',
    '../../src/ui/followersTab.ts',
    '../../src/ui/faithReading.ts',
    '../../src/ui/statecraftScreen.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/controls.ts',
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

/** Every file the Faith sheet is drawn from, its shared words included. */
const SHEET_FILES = [
  'religionScreen.ts',
  'ritesTab.ts',
  'riteWords.ts',
  'bonusesTab.ts',
  'followersTab.ts',
  'faithReading.ts',
];

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

/** The body of one function inside `createReligionScreen` (two spaces in). */
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

/** The body of one top-level function in a tab module, from its body's own brace. */
function top(file: string, declaration: string): string {
  return braceBody(source(file), declaration);
}

/**
 * The Faith sheet's own block in `index.html`: the banner comment above the
 * overlay, down to the end of its header (the eyebrow, the title and the hint
 * line). Everything under the header is built by `religionScreen.ts`.
 */
function religionSheetHeader(): string {
  const html = source('index.html');
  const overlay = html.indexOf('id="religion-overlay"');
  if (overlay < 0) throw new Error('index.html has no religion overlay');
  const start = html.lastIndexOf('<!--', overlay);
  const end = html.indexOf('</header>', overlay);
  if (start < 0 || end < 0) throw new Error('index.html has no Religion sheet header');
  return html.slice(start, end);
}

describe('the Faith sheet has three tabs', () => {
  it('draws Rites, Bonuses and Religion & followers, in that order', () => {
    expect(FAITH_TABS.map((entry) => entry.label)).toEqual([
      'Rites',
      'Bonuses',
      'Religion & followers',
    ]);
  });

  it('opens on Rites, and remembers the tab each seat chose', () => {
    // Seats nobody has set yet: the module's map is per page, so these ids are
    // ones no other test touches.
    expect(faithTabFor(901)).toBe('rites');
    chooseFaithTab(901, 'bonuses');
    expect(faithTabFor(901)).toBe('bonuses');
    // Another seat is untouched: hot-seat play passes the keyboard round.
    expect(faithTabFor(902)).toBe('rites');
    chooseFaithTab(902, 'religion');
    expect(faithTabFor(901)).toBe('bonuses');
    expect(faithTabFor(902)).toBe('religion');
  });

  it('paints the head over every tab, then the chosen tab in one panel', () => {
    // `draw` is the frame around `paint` since batch H18: it takes the one
    // reading of the real board the rite previews share (`cardImpactSheet`) and
    // lets go of it on the way out.
    const paint = fn('religionScreen.ts', 'paint');
    const head = paint.indexOf('drawHead(state, seat, tab)');
    const panel = paint.indexOf("`faith-panel is-${tab}`");
    expect(head).toBeGreaterThan(-1);
    expect(panel).toBeGreaterThan(head);
    expect(paint).toContain('const tab = faithTabFor(seat);');
    expect(paint).toContain('drawRites(state, seat)');
    expect(paint).toContain('drawBonuses(state, seat)');
    expect(paint).toContain('drawReligion(state, seat)');
    // Anything the last paint set moving is stopped before the next is built.
    expect(paint.indexOf('stopMotion();')).toBeGreaterThan(-1);
    expect(paint.indexOf('stopMotion();')).toBeLessThan(paint.indexOf('body.replaceChildren();'));
    // The bank over every tab is the shared bank display's, not a figure of
    // this sheet's own.
    expect(fn('religionScreen.ts', 'drawHead')).toContain(
      "bankLineElement([readBank(state, seat, 'faith')])",
    );
  });

  it('remembers a tab press for the seat that pressed it', () => {
    expect(fn('religionScreen.ts', 'drawHead')).toContain('chooseFaithTab(seat, which);');
  });

  it('draws each tab from its own module, model first', () => {
    const sheet = source('religionScreen.ts');
    expect(fn('religionScreen.ts', 'drawBonuses')).toContain('bonusesTabModel(state, seat)');
    expect(fn('religionScreen.ts', 'drawBonuses')).toContain('drawBonusesTab(');
    expect(fn('religionScreen.ts', 'drawReligion')).toContain(
      'followersTabModel(state, seat, religionReading(state, seat), aimedCityId)',
    );
    expect(fn('religionScreen.ts', 'drawReligion')).toContain('drawFollowersTab(state, seat, model, {');
    // The old drawings are gone from the frame, not kept beside the new ones.
    for (const old of ['function drawGods(', 'function drawBeliefs(', 'function drawClergy(', 'function drawWheelBlock(']) {
      expect(sheet, old).not.toContain(old);
    }
  });

  it("builds the Statecraft screen's own four split classes on Religion & followers", () => {
    const tab = top('followersTab.ts', 'export function drawFollowersTab(');
    for (const className of ['sc-split', 'sc-column', 'sc-column-body', 'sc-pane']) {
      expect(`${className}: ${tab.includes(`'${className}`)}`).toBe(`${className}: true`);
    }
  });

  it('puts the religion in the column, and who follows, the rival faiths and the clergy in the pane', () => {
    const tab = top('followersTab.ts', 'export function drawFollowersTab(');
    const column = tab.indexOf('drawColumn(');
    const pane = tab.indexOf("'sc-pane'");
    const follows = tab.indexOf('drawFollows(model)');
    const rivals = tab.indexOf('drawRivals(model)');
    const clergy = tab.indexOf('drawClergy(');
    expect(column).toBeGreaterThan(-1);
    expect(pane).toBeGreaterThan(column);
    expect(follows).toBeGreaterThan(pane);
    expect(rivals).toBeGreaterThan(follows);
    expect(clergy).toBeGreaterThan(rivals);
    // The column, top to bottom: the name and its facts, the wheel, the counts,
    // and the way to Bonuses.
    const left = top('followersTab.ts', 'function drawColumn(');
    const order = ['drawName(', "'faith-facts'", 'drawPantheonWheel(', "'faith-counts'", "'faith-to-bonuses'"].map(
      (landmark) => left.indexOf(landmark),
    );
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('keeps no god or belief card on Religion & followers: the Bonuses tab owns them', () => {
    const tab = source('followersTab.ts');
    expect(tab).not.toContain('cardStampNode');
    expect(tab).not.toContain('explainReligionLedger');
    expect(tab).not.toContain('setDescriptorText(');
  });

  it('keeps no rites reference: the Rites tab is the rites', () => {
    const text = source('religionScreen.ts');
    expect(text).not.toContain('function drawPool(');
    expect(text).not.toContain('rel-rite-list');
  });
});

describe('the opening', () => {
  /**
   * The Bonuses tab deals and counts when it opens (the ruling of 2026-10-15,
   * 4.1): on the sheet's own opening and on a switch to the tab, never on a
   * plain repaint, and never under reduced motion.
   */
  it('is armed by opening the sheet or switching to Bonuses, and spent by the paint', () => {
    const sheet = source('religionScreen.ts');
    expect(sheet).toContain("if (which === 'bonuses' && faithTabFor(seat) !== 'bonuses') bonusesOpening = true;");
    const show = sheet.slice(sheet.indexOf('onShow: () => {'), sheet.indexOf('onClose:'));
    expect(show).toContain('bonusesOpening = true;');
    const bonuses = fn('religionScreen.ts', 'drawBonuses');
    expect(bonuses).toContain('const opening = bonusesOpening && wantsMotion();');
    expect(bonuses).toContain('bonusesOpening = false;');
  });

  it('remembers what each seat last saw, so only a changed figure counts', () => {
    const bonuses = fn('religionScreen.ts', 'drawBonuses');
    expect(bonuses).toContain('figureChanged(seen, key, now.get(key)');
    expect(bonuses).toContain('seenBySeat.set(seat, now);');
  });

  it('stops every timer and count on the next paint, on close and on dispose', () => {
    const stop = fn('religionScreen.ts', 'stopMotion');
    expect(stop).toContain('window.clearTimeout(id)');
    expect(stop).toContain('cancel()');
    const sheet = source('religionScreen.ts');
    expect(sheet).toContain('onClose: () => stopMotion(),');
    expect(sheet).toContain('onDispose: () => stopMotion(),');
  });
});

describe('the paper', () => {
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
  it('leaves no uppercased control on the Faith sheet', () => {
    // The eyebrows are labels and may shout; a button, a field and a select may
    // not.
    for (const selector of [
      '.rel-city-select',
      '.rel-name-field',
      '.btn',
      '.btn-primary',
      // The Faith sheet's own controls since batch UX9: the tabs, the rite
      // chips, a town's menu toggle and its name, which opens the city screen.
      '.faith-tab',
      '.faith-rite-chip',
      '.faith-town-menu-toggle',
      '.faith-town-link',
      // Batch UX11: the way from Religion & followers to Bonuses.
      '.faith-to-bonuses',
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
    for (const file of SHEET_FILES) {
      expect(/textContent = '[A-Z ]{4,}'/.test(source(file)), file).toBe(false);
    }
  });

  it('takes the clergy card’s words off the roster, never out of this file', () => {
    // A verb typed here would be a second name for a piece: "Call a prophet"
    // lives on `UnitDef.purchase.verb` so a designer renaming the piece renames
    // the button. The price and the refusal come off the price cell's look
    // (`explainPurchaseCost`'s total, `purchaseError`'s sentence), so a pressable
    // button is a command the reducer takes, and the gate is asked again at the
    // press.
    const model = top('followersTab.ts', 'export function followersTabModel(');
    expect(model).toContain('def.purchase?.verb');
    expect(model).toContain('purchaseLook(state, seat, aimed, item, currency)');
    expect(model).toContain('explainPurchaseCost(state, seat, aimed, item, currency)');
    const cards = top('followersTab.ts', 'function drawClergy(');
    expect(cards).toContain('purchaseError(state, seat, aimed, item, look.bank)');
    expect(cards).toContain("refusalLineElement(look.refusal, 'row')");
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
  it('is named nowhere on the Faith sheet', () => {
    for (const file of SHEET_FILES) {
      expect(/augur/i.test(source(file)), file).toBe(false);
    }
  });

  it('is named nowhere in the sheet’s header in index.html', () => {
    // The title and the hint line are written in `index.html`, not in the
    // module, so the check above never saw them. They named the augur until
    // batch UX8a.
    const header = religionSheetHeader();
    expect(header).toContain('statecraft-title');
    expect(header).toContain('statecraft-hint');
    expect(/augur/i.test(header)).toBe(false);
  });

  it('calls the sheet Faith (the ruling of 2026-10-15, (ssssss) 4.7)', () => {
    const header = religionSheetHeader();
    expect(header).toContain('<h2 class="statecraft-title">Faith</h2>');
    expect(header).toContain('aria-label="Faith"');
    expect(header).not.toContain('Pantheon &amp; Rites');
  });

  it('sells the three pieces that are still called, in the order they are met', () => {
    expect(source('followersTab.ts')).toContain(
      "export const CLERGY: readonly UnitTypeId[] = ['prophet', 'apostle', 'inquisitor']",
    );
  });
});

/**
 * The rites, as the Rites tab names them (batch UX8a's fixes, items 4, 5 and 7
 * of `docs/plans/faith-screen-audit.md`, kept by UX9): only the rites a town can
 * still keep, each naming what teaches it, and its duration said once with the
 * figure the town would actually be stamped with.
 */
describe('the rites, in words', () => {
  it('lists only the rites the table still teaches', () => {
    const tab = source('ritesTab.ts');
    expect(tab).toContain('LIVE_RITE_IDS.filter((id) => known.has(id))');
    expect(tab).toContain('LIVE_RITE_IDS.filter((id) => !known.has(id))');
    expect(tab).not.toContain('RITE_IDS)');
    expect(tab).not.toContain('RELIGION.rites');
  });

  it('names the Order that teaches a card-taught rite, and the technology for the rest', () => {
    for (const id of LIVE_RITE_IDS) {
      const def = riteDef(id);
      const card = riteTeachingCard(id);
      if (def.byCard === true) {
        expect(card, id).not.toBeNull();
        expect(riteTeacherName(id), id).toBe(`the Order ${orderDef(card!).name}`);
        // The row's `tech` only dates a card-taught rite.
        expect(riteTeacherName(id), id).not.toContain(techDef(def.tech).name);
      } else {
        expect(riteTeacherName(id), id).toBe(techDef(def.tech).name);
      }
    }
  });

  it('asks the same teacher on this sheet and on the city screen', () => {
    expect(source('ritesTab.ts')).toContain('`needs ${riteTeacherName(rite)}`');
    const options = fn('controls.ts', 'riteOptions');
    expect(options).toContain('riteTeacherName(id)');
    expect(options).not.toContain('techDef(riteDef(id).tech)');
    // The city screen imports it from this sheet, which hands it on by name.
    expect(source('religionScreen.ts')).toContain(
      "export { riteGrantWords, riteTeacherName } from './riteWords';",
    );
  });

  it('says the duration once, from the figure the town would be stamped with', () => {
    const says = source('riteWords.ts');
    expect(says).toContain('riteGrantWords(rite, riteTurnsFor(state, seat, rite))');
    // No second "for N turns" composed from the row's base figure.
    expect(says).not.toContain('def.duration}');
    expect(source('ritesTab.ts')).not.toContain('def.duration');
  });

  it('says one turn, not one turns', () => {
    expect(riteGrantWords('votiveOffering')).toBe('Kept for 1 turn');
    expect(riteGrantWords('restoringOfTheHost', 1)).toBe('Kept for 1 turn');
    expect(riteGrantWords('omenReading', 15)).toBe('Kept for 15 turns');
    // Without a figure for an empire, the row's own duration.
    expect(riteGrantWords('omenReading')).toBe(`Kept for ${riteDef('omenReading').duration} turns`);
  });
});

/**
 * The figure a god or belief card wears (`docs/flags.md` (ssssss) 4.2): the
 * Ledger's attribution, which adds up to the Ledger's Religion slice, and not
 * the ghost stamp that measured what removing the card would cost.
 */
describe('the cards on Bonuses wear the Ledger’s figure', () => {
  it('reads the Ledger, place by place, and never the ghost stamp', () => {
    const tab = source('bonusesTab.ts');
    expect(tab).toContain('explainReligionLedgerByPlace(state, seat)');
    expect(tab).toContain('explainFaithLedger(state, seat)');
    expect(tab).not.toContain('explainCardImpact');
    expect(tab).not.toContain('stampReading(');
  });

  it('keeps the compact stamp compact', () => {
    // A Bonuses card is the Statecraft hand's face, so it takes the hand's seat
    // for the stamp: the same height-stable pair and the same smaller digits.
    expect(source('bonusesTab.ts')).toContain("const classes = ['sc-card', 'faith-card', `is-${card.kind}`];");
    expect(declaration('.sc-card .card-stamp', 'min-height')).toBe('20px');
    expect(declaration('.sc-card .card-stamp', 'line-height')).toBe('20px');
  });

  it('prints every clause through the descriptor writer, and the wheel’s tooltip plainly', () => {
    // Hard rule: a describer emits `[[kind:id|Name]]`, and a clause written with
    // `textContent` would print the brackets. Both writers are asked: the live
    // one on a card's face, the stripped one in the platform `title` a wheel
    // house carries.
    expect(source('bonusesTab.ts')).toContain('setDescriptorText(item, clause.text, { linked })');
    expect(source('followersTab.ts')).toContain('stripRefs(clause.text)');
    for (const file of ['bonusesTab.ts', 'followersTab.ts']) {
      expect(/textContent = `\$\{[^}]*clause/.test(source(file)), file).toBe(false);
    }
  });
});

/**
 * **The pantheon is its places, and an empty one says what it is waiting for**
 * (`docs/flags.md`, rulings of 2026-09-06 evening, items b and d), on the Bonuses
 * tab's gods shelf since batch UX10.
 *
 * Every figure in the answer is the **sim's** (`explainNextRung` /
 * `nextRungWords`), and that is the load-bearing half: the faith chip's hover
 * card prints the same sentence off the same reading, and a threshold composed
 * twice is a threshold two surfaces will one day quote differently.
 */
describe('the places at the fire', () => {
  it('walks the sim’s own list of places, not the count of open slots', () => {
    const ghosts = top('bonusesTab.ts', 'function godGhosts(');
    expect(ghosts).toContain('pantheonPlaces(state, seat)');
    // The shut place names its technology off the place, never out of this file.
    expect(ghosts).toContain('techDef(place.awaits).name');
  });

  it('prints the rung’s price from the sim describer and never composes one', () => {
    const ghosts = top('bonusesTab.ts', 'function godGhosts(');
    expect(ghosts).toContain('nextRungWords(rung)');
    // The bar is the same two figures the sentence names — `banked / cost` — so
    // a reader of the bar and a reader of the line are told one thing. What must
    // not appear is a threshold arithmetic of this file's own.
    expect(ghosts).toContain('rung.banked / rung.cost');
    expect(ghosts).not.toContain('faithRungCost');
  });

  it('prints the same ladder sentence under the wheel', () => {
    expect(top('followersTab.ts', 'export function followersTabModel(')).toContain(
      'nextRungWords(explainNextRung(state, seat, readEmpire(state, seat).totals.faith))',
    );
  });

  it('is the sentence the faith chip’s hover card prints, off one describer', () => {
    // The other surface, read from its own source: two compositions of one
    // reading is how a chip and a sheet come to quote two thresholds.
    const bar = source('topBar.ts');
    expect(bar).toContain("import { explainNextRung, nextRungWords } from '../sim/religion'");
    expect(bar).toContain(
      'nextRungWords(explainNextRung(state, playerId, readEmpire(state, playerId).totals.faith))',
    );
  });
});

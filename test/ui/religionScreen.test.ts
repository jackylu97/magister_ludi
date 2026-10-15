/**
 * What the Faith sheet promises across its files, none of which one file can
 * keep on its own.
 *
 *   1. **Three tabs, and the third is the Statecraft sheet's split.** Rites,
 *      Bonuses, and Religion & followers (batch UX9), the chosen tab
 *      remembered per seat. The third tab keeps the split the 2026-08-27 pass
 *      gave both parchment screens: a fixed column of what the religion is,
 *      and a pane that scrolls.
 *   2. **One breakpoint, not two that agree today.** The width at which a split
 *      stops being readable is a fact about the split. Both sheets stack in the
 *      same media query, so this asserts there is exactly one `max-width`
 *      query naming the paper.
 *   3. **The sheet has one register of controls.** An eyebrow is a label and
 *      may shout; a control may not.
 *
 * No document in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `cityScreen.test.ts` and
 * `seatRoster.test.ts` read theirs. The Rites tab's own behaviour (its order,
 * rite mode, the start flow, Escape) is tested on real boards in
 * `ritesTab.test.ts`.
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

const SOURCES = import.meta.glob(
  [
    '../../src/ui/religionScreen.ts',
    '../../src/ui/ritesTab.ts',
    '../../src/ui/riteWords.ts',
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
 * The Religion sheet's own block in `index.html`: the banner comment above the
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
    // reading of the real board the belief stamps and rite previews share
    // (`cardImpactSheet`) and lets go of it on the way out.
    const paint = fn('religionScreen.ts', 'paint');
    const head = paint.indexOf('drawHead(state, seat, tab)');
    const panel = paint.indexOf("`faith-panel is-${tab}`");
    expect(head).toBeGreaterThan(-1);
    expect(panel).toBeGreaterThan(head);
    expect(paint).toContain('const tab = faithTabFor(seat);');
    expect(paint).toContain('drawRites(state, seat)');
    expect(paint).toContain('drawBonuses(state, seat)');
    expect(paint).toContain('drawReligionTab(state, seat)');
    // The bank over every tab is the shared bank display's, not a figure of
    // this sheet's own.
    expect(fn('religionScreen.ts', 'drawHead')).toContain(
      "bankLineElement([readBank(state, seat, 'faith')])",
    );
  });

  it('remembers a tab press for the seat that pressed it', () => {
    expect(fn('religionScreen.ts', 'drawHead')).toContain('chooseFaithTab(seat, which);');
  });

  it("builds the Statecraft screen's own four split classes on Religion & followers", () => {
    const tab = fn('religionScreen.ts', 'drawReligionTab');
    for (const className of ['sc-split', 'sc-column', 'sc-column-body', 'sc-pane']) {
      expect(`${className}: ${tab.includes(`'${className}`)}`).toBe(`${className}: true`);
    }
  });

  it('puts the name and the wheel in the column, and who follows above the clergy in the pane', () => {
    // Today's content where the spec says it will live (F1, Tab 3), until batch
    // UX11 redraws the tab.
    const tab = fn('religionScreen.ts', 'drawReligionTab');
    const column = tab.indexOf('sc-column-body');
    const name = tab.indexOf('drawFaithName');
    const wheel = tab.indexOf('drawWheelBlock');
    const pane = tab.indexOf("'sc-pane'");
    const following = tab.indexOf('drawFollowing');
    const clergy = tab.indexOf('drawClergy');
    expect(column).toBeGreaterThan(-1);
    expect(name).toBeGreaterThan(column);
    expect(wheel).toBeGreaterThan(name);
    expect(pane).toBeGreaterThan(wheel);
    expect(following).toBeGreaterThan(pane);
    expect(clergy).toBeGreaterThan(following);
  });

  it('puts the gods, the beliefs and the holy city’s share on Bonuses', () => {
    // F1, Tab 2's sources, drawn as today's cards until batch UX10.
    const tab = fn('religionScreen.ts', 'drawBonuses');
    const gods = tab.indexOf('drawGods');
    const beliefs = tab.indexOf('drawBeliefs');
    const trickle = tab.indexOf('drawTrickle');
    expect(gods).toBeGreaterThan(-1);
    expect(beliefs).toBeGreaterThan(gods);
    expect(trickle).toBeGreaterThan(beliefs);
  });

  it('keeps no rites reference: the Rites tab is the rites', () => {
    const text = source('religionScreen.ts');
    expect(text).not.toContain('function drawPool(');
    expect(text).not.toContain('rel-rite-list');
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
      // The Faith sheet's own controls since batch UX9: the tabs, the rite
      // chips, a town's menu toggle and its name, which opens the city screen.
      '.faith-tab',
      '.faith-rite-chip',
      '.faith-town-menu-toggle',
      '.faith-town-link',
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
    for (const file of ['religionScreen.ts', 'ritesTab.ts']) {
      expect(/textContent = '[A-Z ]{4,}'/.test(source(file)), file).toBe(false);
    }
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
  it('is named nowhere on the Faith sheet', () => {
    for (const file of ['religionScreen.ts', 'ritesTab.ts', 'riteWords.ts']) {
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
    const text = source('religionScreen.ts');
    expect(text).toContain("const CLERGY: readonly UnitTypeId[] = ['prophet', 'apostle', 'inquisitor']");
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
    const pantheon = fn('religionScreen.ts', 'drawGods');
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

  it('prints the same ladder sentence under the wheel', () => {
    const wheel = fn('religionScreen.ts', 'drawWheelBlock');
    expect(wheel).toContain('nextRungWords(explainNextRung(state, seat, rate))');
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

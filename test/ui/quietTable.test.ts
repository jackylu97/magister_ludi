/**
 * **Quiet Table, build stage 1** (`docs/plans/ui-critique-2026-10-16.md`,
 * "Quiet Table: build stage 1"; the board is
 * `docs/plans/mockups/scholars-study/quiet-table-third-pass/`). Core tier: the
 * kit's sheet head and ×, the button styles, the plain seal of a held thing,
 * the hex card's owner line, the technology hint, the caravans' chips and the
 * title's tag line. Declare war, version A, is pinned in
 * `diplomacyScreen.test.ts` and `confirmCard.test.ts`; the corner panel's
 * row of marks (fourth pass, frame 7) in `empireDrawer.test.ts` and
 * `commissionRail.test.ts`. The fourth pass's rename, "empire building" for
 * "great house", is pinned below, and so are build stages two and three.
 */

/** Every data file a player reads words from: the rows, and the decks. */
const DATA_TEXT = {
  ...(import.meta.glob('../../data/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>),
  ...(import.meta.glob('../../data/decks/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>),
};

import { describe, expect, it } from 'vitest';

import { HELD_MARK } from '../../src/art/newsMarks';
import { BUILDING_IDS, isEmpireBuilding } from '../../src/sim/buildingData';
import { getTileAt } from '../../src/sim/map';
import { EMPIRE_BUILDING_WORDS } from '../../src/sim/statecraft';
import { compendiumSections } from '../../src/ui/compendium';
import { CONCEPT_ENTRIES } from '../../src/ui/compendiumText';
import {
  GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM,
  GREAT_PERSON_CARD_WORDS,
  GREAT_PERSON_NAME_SIZES,
} from '../../src/ui/greatPersonCard';
import { LEADER_STEP_WORDS } from '../../src/ui/leaderSelect';
import { FAITH_HEAD_WORDS, FAITH_TABS } from '../../src/ui/religionScreen';
import { RITES_COLUMN_WORDS } from '../../src/ui/ritesTab';
import { OWN_REALM_WORDS, describeOwner } from '../../src/ui/tileReadout';
import { TRADE_TABS } from '../../src/ui/tradeScreen';
import { found, game } from '../sim/statecraftHelpers';
import { braceBody, uiSource } from './sourceHelpers';

const CSS = uiSource('style.css');
const HTML = uiSource('index.html');

/** One rule's body in a stylesheet, by its exact selector at the start of a line. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`rule not found: ${selector}`);
  return css.slice(at, css.indexOf('}', at));
}

describe('the kit (frame a10)', () => {
  it('rules every sheet head with ink over a gilt hairline, and leaves the two dark sheets their own', () => {
    expect(rule(CSS, '.statecraft-head')).toContain('border-bottom: 1px solid var(--ink);');
    const hairline = rule(CSS, '.statecraft-head::after');
    expect(hairline).toContain('border-bottom: 1px solid var(--gilt);');
    expect(hairline).toContain('bottom: -4px;');
    expect(CSS).toContain('#statecraft-overlay .statecraft-head::after,\n#inplay-overlay .statecraft-head::after {\n  content: none;');
    // The diplomacy head no longer draws its own faint rule over the shared one.
    expect(rule(uiSource('diplomacyScreen.css'), '#diplomacy-overlay .dp-head')).not.toContain('border-bottom');
  });

  it('draws every sheet’s × as the technology screen’s control, in ink', () => {
    const close = rule(CSS, '.statecraft-close');
    expect(close).toContain('width: 26px;');
    expect(close).toContain('height: 26px;');
    expect(close).toContain('border: var(--border-thin) solid currentColor;');
    expect(close).toContain('border-radius: var(--radius-sm);');
    expect(close).toContain('color: var(--ink);');
  });

  it('maps the three button styles onto the classes there are', () => {
    expect(rule(CSS, '.btn')).toContain('border: 1px solid var(--ink);');
    expect(rule(CSS, '.btn')).not.toMatch(/(?:^|[;{])\s*box-shadow\s*:/);
    expect(rule(CSS, '.btn-primary')).toContain('box-shadow: 3px 3px 0 var(--ink);');
    expect(rule(CSS, '.btn-primary')).toContain('border: 2px solid var(--ink);');
    expect(rule(CSS, '.btn-quiet')).toContain('border-color: var(--edge);');
  });

  it('leads news about a held thing with a plain seal, small enough to keep the toast’s size', () => {
    // A ring and a dot, and nothing else.
    expect(HELD_MARK.paths).toHaveLength(2);
    expect(HELD_MARK.paths[1]!.fill).toBe(true);
    expect(rule(CSS, '.news-mark.is-held:not(.is-glyph):not(.is-empty)')).toContain('mask-size: 13px 13px;');
    expect(uiSource('newsMark.ts')).toContain("case 'held':");
    // The fulfilled commission is an Order the seat holds.
    expect(uiSource('controls.ts')).toContain("{ openStatecraft: true, mark: 'held', news: report.name }");
  });
});

describe('the hex card’s owner line (frames a1 and a10)', () => {
  it('names the seat’s own land and says nothing of free ground', () => {
    const made = game();
    const city = found(made.state, 0);
    const home = getTileAt(made.state.map, city.col, city.row)!;
    expect(describeOwner(made.state, 0, home)).toMatchObject({ name: OWN_REALM_WORDS, you: true });
    const free = made.state.map.tiles.find(
      (tile) => made.state.cities.every((town) => Math.abs(town.col - tile.col) + Math.abs(town.row - tile.row) > 8),
    )!;
    expect(describeOwner(made.state, 0, free)).toBeNull();
  });

  it('is a row of the card, cleared with the rest on fog and on no hover', () => {
    expect(HTML).toContain('<dt>Owner</dt>\n        <dd id="info-owner">—</dd>');
    const main = uiSource('main.ts');
    expect(main).toContain('setInfoRow(infoOwner, ownerNodes(describeOwner(game.state, seat, hover.tile)));');
    expect(braceBody(main, 'function clearInfoRows(): void')).toContain('infoOwner,');
  });
});

describe('the words', () => {
  it('says what a click on the chart does, word for word as the user gave it (fourth pass, frame 8)', () => {
    expect(HTML).toContain(
      '<p id="tech-hint" class="tech-hint">click a technology to research it · <kbd>shift</kbd>-click to queue</p>',
    );
    expect(HTML).not.toContain('click a star to aim');
    // Nothing about moving the view.
    expect(HTML).not.toContain('to add it to the plan');
    expect(HTML).not.toContain('drag, scroll');
  });

  it('gives the title its tag line (the user: "a game for the ages")', () => {
    expect(HTML).toContain('<span class="marquee-stamp">a game for the ages</span>');
    expect(HTML).not.toContain('one seed · one world');
  });

  it('keeps the caravans’ tab words, drawn as chips (frame a3)', () => {
    expect(TRADE_TABS.map((tab) => tab.label)).toEqual(['Recommended', 'Running', 'All routes', 'Unavailable']);
    expect(rule(CSS, '.trade-tab')).toContain('border-radius: 999px;');
    expect(CSS).not.toContain('.trade-tab::before');
  });
});

describe('empire buildings (the user, 2026-11-19: "lets label these as empire buildings everywhere in the game")', () => {
  it('uses the new name in every data row a player reads', () => {
    // "The Great Households" is a different card and keeps its name.
    const old = /great house(?!hold)/i;
    const stale = Object.entries(DATA_TEXT).filter(([, text]) => old.test(text)).map(([file]) => file);
    expect(stale).toEqual([]);
  });

  it('says what one is on the Concepts shelf, and on each one\'s own page', () => {
    expect(EMPIRE_BUILDING_WORDS.label).toBe('Empire building');
    const page = CONCEPT_ENTRIES.find((entry) => entry.id === EMPIRE_BUILDING_WORDS.keyword)!;
    expect(page.name).toBe('Empire buildings');
    expect(page.clauses[0]!.text).toContain('may normally have only one of');
    expect(page.clauses[1]!.text).toContain('If you lose the town that holds an empire building, you lose the building too.');
    const book = compendiumSections().flatMap((section) => section.entries);
    const marked = BUILDING_IDS.filter(isEmpireBuilding);
    expect(marked.length).toBeGreaterThan(0);
    // The sentence comes from the row's mark, never from a list of names.
    for (const id of BUILDING_IDS) {
      const entry = book.find((one) => one.id === `building:${id}`);
      if (entry === undefined) continue;
      const says = entry.clauses.some((clause) => clause.text === EMPIRE_BUILDING_WORDS.entry);
      expect(says, id).toBe(isEmpireBuilding(id));
    }
  });

  it('labels one on the technology chart, in the build list and on its In play piece', () => {
    const chart = uiSource('techTree.ts');
    expect(chart).toContain("if (gift.kind === 'building' && isEmpireBuilding(gift.id)) {");
    expect(chart).toContain('kind.append(keywordNode(EMPIRE_BUILDING_WORDS.keyword, EMPIRE_BUILDING_WORDS.label));');
    expect(chart).toContain("empire ? 'tech-mark is-building is-empire' : 'tech-mark is-building'");
    expect(uiSource('inPlayPieces.ts')).toContain(
      'sub: isEmpireBuilding(id) ? EMPIRE_BUILDING_WORDS.inTown(city.name) : IN_PLAY_WORDS.withTown(city.name),',
    );
    expect(EMPIRE_BUILDING_WORDS.inTown('Cusco')).toBe('Empire building, with Cusco');
    // And in the city screen's build list, where a wonder says "wonder".
    expect(uiSource('cityPanel.ts')).toContain(
      "name.append(element('span', 'city-buildable-eyebrow', EMPIRE_BUILDING_WORDS.eyebrow));",
    );
  });
});

describe('build stage 2: the offers (the user: "yeah proceed")', () => {
  it('rules the offer sheet’s head the kit’s way, with the × that is View map', () => {
    const head = rule(CSS, '.offer-head');
    expect(head).toContain('border-bottom: 1px solid var(--ink);');
    expect(rule(CSS, '.offer-head::after')).toContain('border-bottom: 1px solid var(--gilt);');
    // Paper over the map: the boards' lighter veil.
    expect(rule(CSS, '.offer-overlay')).toContain('background: rgba(29, 26, 32, 0.42);');
  });

  it('gives the Ledger the kit’s head by hand: each page ruled, and the kit’s ×', () => {
    expect(rule(CSS, '.ldg-titles')).toContain('border-bottom: 1px solid var(--ink);');
    expect(rule(CSS, '.ldg-open-title')).toContain('border-bottom: 1px solid var(--ink);');
    expect(CSS).toContain('.ldg-titles::after,\n.ldg-open-title::after {');
    // The × keeps only its place: its look is `.statecraft-close`'s.
    const close = rule(CSS, '#ledger-overlay .ledger-close');
    expect(close).not.toContain('width:');
    expect(close).not.toContain('border:');
    expect(close).not.toContain('background:');
    expect(HTML).toContain('class="statecraft-close ledger-close"');
  });

  it('writes the great person card’s words plainly, and does not say what a person does when spent', () => {
    for (const words of Object.values(GREAT_PERSON_CARD_WORDS.family)) expect(words).not.toMatch(/\d|—/);
    // The user, 2026-11-19: "we can cut the 'when spent' clause on the great people cards."
    expect(uiSource('greatPersonCard.ts')).not.toContain('When spent:');
    expect(uiSource('greatPersonCard.css')).not.toContain('.gp-act');
    expect(uiSource('offerFaces.ts')).not.toContain('act:');
  });

  it('shows the new card and the backs in the flair gallery', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/cardFaces.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    )[0] as string;
    expect(gallery).toContain('const { card } = greatPersonCardNode(greatPersonCard(id));');
    expect(gallery).toContain('card.append(offerBackNode(mark));');
    expect(gallery).toContain('drawGreatPeople(into);');
    expect(gallery).toContain('drawOfferBacks(into);');
  });

  it('lays each offer’s cards on a back from marks the game has', () => {
    const deal = uiSource('cardDeal.ts');
    expect(deal).toContain("sun: () => orderFaceMarkUri('sun'),");
    expect(deal).toContain('laurel: () => renownMarkDataUri(),');
    expect(deal).toContain("crown: () => suitMarkDataUri('crowns'),");
    const main = uiSource('main.ts');
    expect(main).toContain("back: () => offerBackNode('sun'),");
    expect(main).toContain("back: () => offerBackNode('laurel'),");
    expect(main).toContain("back: () => offerBackNode('crown'),");
  });
});

describe('build stage 3 (the user: "lets proceed")', () => {
  const GP_CSS = uiSource('greatPersonCard.css');

  it('gives every great person card one height, measured from the whole roster', () => {
    // The card's height is the roster's tallest text, published once; the
    // stylesheet's figure is only the stand-in until the page has measured.
    expect(rule(GP_CSS, '.gp-card')).toContain(`height: calc(var(--gp-height, ${GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM}) * 1em);`);
    expect(GP_CSS).not.toContain('--gp-text');
    const card = uiSource('greatPersonCard.ts');
    expect(braceBody(card, 'function measureRoster(')).toContain('LIVE_GREAT_PERSON_IDS');
    // The name wraps, and steps down one size at most.
    expect(GREAT_PERSON_NAME_SIZES).toHaveLength(2);
    // The Reliquary's desk is the offer card's size.
    expect(CSS).toContain('--rel-card-h: calc(var(--gp-height, 39.2) * 10px);');
    expect(uiSource('main.ts')).toContain('shape: greatPersonOfferShape(),');
  });

  it('draws the great person card quieter: a round arch, no rules by the name, and no visible Flavour label (2026-11-19)', () => {
    const card = uiSource('greatPersonCard.ts');
    // The user's exception for this card alone: the word stays, for a screen
    // reader, and is hidden from sight. Every other surface keeps the label.
    expect(GREAT_PERSON_CARD_WORDS.flavour).toBe('Flavour');
    expect(card).toContain("element('span', 'flavor-label', GREAT_PERSON_CARD_WORDS.flavour)");
    expect(rule(GP_CSS, '.gp-flavour .flavor-label')).toContain('clip-path: inset(50%);');
    // A true round arch: half the width on each side, so no radius is scaled down.
    const window = rule(GP_CSS, '.gp-window');
    expect(window).toContain('border-radius: 50% 50% 0 0 / 46% 46% 0 0;');
    expect(window).toContain('width: 100%;');
    expect(window).toContain('aspect-ratio: 5 / 6;');
    expect(window).not.toContain('repeating-linear-gradient');
    expect(rule(GP_CSS, '.gp-in')).not.toContain('border:');
    // The sun and the moon stay; the rules beside the name go.
    expect(card).toContain("drawn('gp-corner is-sun'), drawn('gp-corner is-moon')");
    expect(card).not.toContain("drawn('gp-rule')");
  });

  it('sets one text size for every card in an Order draft', () => {
    expect(uiSource('main.ts')).toContain('fitHand: fitOrderHand,');
    const offer = uiSource('offerCard.ts');
    expect(offer).toContain('offer.fitHand?.(drawnFaces)');
  });

  it('asks for a leader in plain words, with no face and no colour words in the list', () => {
    expect(LEADER_STEP_WORDS.title).toBe('Choose your leader');
    expect(HTML).toContain('Choose your leader');
    expect(HTML).not.toContain('Choose your civ');
    const select = uiSource('leaderSelect.ts');
    const row = braceBody(select, '  function drawRow(');
    expect(row).toContain("element('span', 'leader-name', name)");
    expect(row).toContain("element('span', 'leader-face-id', line)");
    expect(row).not.toContain('colorWords');
    expect(braceBody(select, '  function render(')).toContain('face.people');
    // The window is one function, which the flair gallery draws too.
    expect(select).toContain('export function leaderPortraitNode(');
    for (const words of Object.values(LEADER_STEP_WORDS)) {
      if (typeof words === 'string') expect(words).not.toMatch(/\d|—/);
    }
  });

  it('names the religion in the faith sheet head, and orders the tabs Rites, Religion and followers, Bonuses', () => {
    expect(FAITH_TABS.map((entry) => entry.tab)).toEqual(['rites', 'religion', 'bonuses']);
    expect(FAITH_HEAD_WORDS.facts('Uruk', 3)).toBe('holy city Uruk · 3 towns follow');
    expect(FAITH_HEAD_WORDS.facts(null, 1)).toBe('1 town follows');
    expect(FAITH_HEAD_WORDS.none).not.toMatch(/\d/);
    expect(RITES_COLUMN_WORDS.wouldAdd('Harvest Rite')).toBe('Harvest Rite would add');
  });

  it('labels the combat forecast You and Them, each with its own health bar', () => {
    const main = uiSource('main.ts');
    expect(main).toContain("const FORECAST_SIDE_WORDS = { you: 'You', them: 'Them' } as const;");
    const you = main.indexOf('      FORECAST_SIDE_WORDS.you,\n      preview.attackerName,');
    const them = main.indexOf('      FORECAST_SIDE_WORDS.them,\n      preview.defenderName,');
    expect(you).toBeGreaterThan(-1);
    expect(them).toBeGreaterThan(you);
    // The bar sits in the side's own column, under its unit.
    const start = main.indexOf('  function sideColumn(');
    const side = main.slice(start, main.indexOf('\n  }\n', start));
    expect(side.indexOf("unit.className = 'combat-unit';")).toBeGreaterThan(-1);
    expect(side.indexOf("unit.className = 'combat-unit';")).toBeLessThan(side.indexOf("bar.className = 'combat-bar';"));
  });

  it('shows the portrait window and the faith tablets in the flair gallery', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/cardFaces.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    )[0] as string;
    expect(gallery).toContain('drawLeaderPortraits(into);');
    expect(gallery).toContain('drawFaithTablets(into);');
    expect(gallery).toContain('leaderPortraitNode(face,');
    expect(gallery).toContain('const { face, stamp } = drawCard(card);');
    expect(gallery).toContain('drawGhost({');
  });
});

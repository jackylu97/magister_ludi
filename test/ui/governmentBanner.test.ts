/**
 * **The government banner** (`src/ui/governmentBanner.ts`; Quiet Table, frame
 * 7: "Three banners" and "The banner with and without a painting", approved by
 * the user: "Great, love it").
 *
 * This suite has no jsdom (`sourceHelpers.ts`), so the banner's model is
 * checked as data, the hand's one size through its pure rule
 * (`governmentHandHeight`), and the wiring is read from the source:
 *
 *   1. **The window** shows the government's painting, or the drawn mark.
 *   2. **The chairs** are the council the seat would have, or the row's own.
 *   3. **The rules** are the describers' clauses, never words of the banner's own.
 *   4. **One size in a hand**: one width, words at one size, and every banner
 *      the tallest one's height.
 *   5. **The offer keeps its behaviour**: the reveal, choose and take, and the
 *      command it sends. Retired governments stay out.
 *   6. **The Council's seat** is the banner, and the flair gallery shows it.
 */
import { describe, expect, it } from 'vitest';

import { describeCard } from '../../src/sim/statecraft';
import {
  type ChairType,
  GOVERNMENT_IDS,
  GOVERNMENT_TIERS,
  governmentDef,
  governmentsAtTier,
  slotCount,
  slotLayout,
} from '../../src/sim/statecraftData';
import { chairMixOfLayout, chairMixWords } from '../../src/ui/chairs';
import {
  GOVERNMENT_BANNER_WORDS,
  GOVERNMENT_NAME_SIZES,
  governmentBannerModel,
  governmentHandHeight,
  governmentPicture,
} from '../../src/ui/governmentBanner';
import { GOVERNMENT_HAND_SHAPE } from '../../src/ui/offerFaces';
import { braceBody, uiSource } from './sourceHelpers';

const BANNER = uiSource('governmentBanner.ts');
const BANNER_CSS = uiSource('governmentBanner.css');
const MAIN = uiSource('main.ts');
const SCREEN = uiSource('statecraftScreen.ts');

/** One rule's body in a stylesheet, by its exact selector at the start of a line. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`rule not found: ${selector}`);
  return css.slice(at, css.indexOf('}', at));
}

const LIVE = GOVERNMENT_IDS.filter((id) => governmentDef(id).retired !== true);

describe('the window', () => {
  it('shows the painting when the list names one, and the drawn mark otherwise', () => {
    for (const id of GOVERNMENT_IDS) {
      const picture = governmentPicture(id);
      expect(['painted', 'mark'], id).toContain(picture.kind);
      expect(governmentBannerModel(id).picture, id).toEqual(picture);
    }
  });

  it('draws the mark as the engraved seal with the crown, the name and the tier, in a window of one size', () => {
    const window = braceBody(BANNER, 'function windowNode(');
    expect(window).toContain('const device = deviceNode([GOVERNMENT_SUIT], true);');
    expect(window).toContain("title.append(element('span', 'gov-name', model.name), tierNode(model.tier));");
    // The painting takes the window's ground, with the name on a fade at its foot.
    expect(window).toContain('window.style.backgroundImage = `url("${picture.url}")`;');
    expect(window).toContain("const foot = element('span', 'gov-fall');");
    // The frame's 330 by 110 window in the row, and 3:1 in the Council's card.
    expect(rule(BANNER_CSS, ".gov-banner[data-form='row'] .gov-window")).toContain('width: 33em;');
    expect(rule(BANNER_CSS, ".gov-banner[data-form='row'] .gov-window")).toContain('height: 11em;');
    expect(rule(BANNER_CSS, ".gov-banner[data-form='seat'] .gov-window")).toContain('aspect-ratio: 3 / 1;');
  });

  it('names the government from its row, with its tier', () => {
    for (const id of GOVERNMENT_IDS) {
      const model = governmentBannerModel(id);
      expect(model.name, id).toBe(governmentDef(id).name);
      expect(model.tier, id).toBe(governmentDef(id).tier);
      expect(model.caption, id).toContain(model.name);
    }
  });
});

describe('the chairs', () => {
  it('lists the row’s own chairs when no council is given', () => {
    for (const id of LIVE) {
      const model = governmentBannerModel(id);
      expect(model.chairs, id).toEqual(slotLayout(id));
      expect(model.chairs, id).toHaveLength(slotCount(id));
      expect(model.chairWords, id).toBe(chairMixWords(chairMixOfLayout(slotLayout(id))));
    }
  });

  it('lists the council the seat would have, a leader’s or a Doctrine’s extra chairs included', () => {
    const layout: ChairType[] = [...slotLayout('warChief'), 'wildcard', 'wildcard'];
    const model = governmentBannerModel('warChief', layout);
    expect(model.chairs).toEqual(layout);
    expect(model.chairWords).toBe('2 Military · 1 Economic · 1 Civic · 3 Wildcard');
  });

  it('draws one chair a chair, grouped by type, each with its type’s own mark', () => {
    const chairs = braceBody(BANNER, 'function chairsNode(');
    expect(chairs).toContain('for (const entry of chairMixOfLayout(model.chairs)) {');
    expect(chairs).toContain('chair.dataset.ink = entry.type;');
    expect(chairs).toContain("mark.style.setProperty('--gov-chair-mark', slotMarkUrl(entry.type));");
    // The shapes are a picture; the words are what a screen reader hears.
    expect(chairs).toContain("row.setAttribute('aria-hidden', 'true');");
  });
});

describe('the rules', () => {
  it('prints the describers’ clauses and nothing else', () => {
    for (const id of GOVERNMENT_IDS) {
      expect(governmentBannerModel(id).clauses, id).toEqual(describeCard(id));
    }
    const rules = braceBody(BANNER, 'function rulesNode(');
    expect(rules).toContain('setDescriptorText(line, clause.text, { linked });');
    expect(rules).toContain('rubricate(line);');
  });

  it('says plainly that a government with no rule has none', () => {
    expect(describeCard('chiefdom')).toEqual([]);
    expect(braceBody(BANNER, 'function rulesNode(')).toContain('GOVERNMENT_BANNER_WORDS.noLaw');
  });

  it('writes its own words plainly, with no number and no dash', () => {
    for (const words of Object.values(GOVERNMENT_BANNER_WORDS)) expect(words).not.toMatch(/\d|—/);
  });
});

describe('one size in a hand', () => {
  it('gives every banner the tallest one’s height, rounded up to a tenth of an em', () => {
    expect(governmentHandHeight([13, 16.27, 14])).toBe(16.3);
    expect(governmentHandHeight([13, 13, 13])).toBe(13);
    // A banner not laid out counts as nothing.
    expect(governmentHandHeight([Number.NaN, 14.01])).toBe(14.1);
    expect(governmentHandHeight([])).toBe(0);
  });

  it('writes the one height on every banner of the hand', () => {
    const fit = braceBody(BANNER, 'export function fitGovernmentHand(');
    expect(fit).toContain("for (const face of faces) face.style.removeProperty('--gov-row-h');");
    expect(fit).toContain('const height = governmentHandHeight(heights);');
    expect(fit).toContain("for (const face of faces) face.style.setProperty('--gov-row-h', `${height}em`);");
    expect(rule(BANNER_CSS, ".gov-banner[data-form='row']")).toContain('min-height: var(--gov-row-h, 13em);');
  });

  it('keeps one width and one text size, which wraps', () => {
    const row = rule(BANNER_CSS, ".gov-banner[data-form='row']");
    expect(row).toContain('width: 85.6em;');
    expect(row).toContain('font-size: calc(var(--gov-width, 856px) / 85.6);');
    // The rules are one size on every banner: no fit writes their size.
    expect(rule(BANNER_CSS, '.gov-rules')).toContain('font-size: 1.3em;');
    expect(BANNER).not.toContain('--gov-text');
    // A long name wraps, and steps down one size at most.
    expect(GOVERNMENT_NAME_SIZES).toHaveLength(2);
    // The row is the frame's 856 by 130.
    expect(GOVERNMENT_HAND_SHAPE.width).toBe(856);
    expect(Math.round(GOVERNMENT_HAND_SHAPE.width * GOVERNMENT_HAND_SHAPE.ratio)).toBe(130);
  });
});

describe('the government offer keeps its behaviour', () => {
  const OFFER = braceBody(MAIN, 'if (sc.pendingGovernment !== undefined) {');

  it('deals the banners on the crown’s back, one under another, and sends the same command', () => {
    expect(OFFER).toContain("back: () => offerBackNode('crown'),");
    expect(OFFER).toContain("takeVerb: 'Swear',");
    expect(OFFER).toContain('shape: GOVERNMENT_HAND_SHAPE,');
    expect(OFFER).toContain('stacked: true,');
    expect(OFFER).toContain('fitHand: fitGovernmentHand,');
    expect(OFFER).toContain('dress: () => governmentOfferFace(id, chairLayoutUnder(game.state, seat, id)),');
    // The stamp is asked once at the deal, as before.
    expect(OFFER).toContain("...cardStamp(seat, { kind: 'government', id }),");
    expect(OFFER).toContain("const result = send({ type: 'adoptGovernment', playerId: seat, choiceIndex: index });");
    expect(OFFER).toContain('if (!result.ok) controls.guide(');
  });

  it('turns the banners over one by one, as every drawn face, and lets a click choose', () => {
    const card = uiSource('offerCard.ts');
    expect(card).toContain('const stacked = dressed && offer.stacked === true;');
    expect(card).toContain('const dealing = (tarot || dressed) && wantsMotion();');
    expect(card).toContain("button.addEventListener('click', () => chooseCard(index));");
    expect(card).toContain('const dressed = (spreadOf.stacked ? stackedSpread : dressedSpread)(spreadOf.count, stage, spreadOf.shape);');
  });

  it('puts the stamp’s seat under “With the cards you keep”, and draws neither when there is no figure', () => {
    const dress = braceBody(BANNER, 'export function dressGovernmentBanner(');
    expect(dress).toContain("keeps.append(element('span', 'gov-label', GOVERNMENT_BANNER_WORDS.keeps), seat);");
    expect(BANNER_CSS).toContain('.gov-keeps:has(> .gov-seat:empty),\n.gov-seat:empty {\n  display: none;');
  });

  it('offers no retired government', () => {
    for (const tier of GOVERNMENT_TIERS) {
      for (const id of governmentsAtTier(tier)) expect(governmentDef(id).retired, id).not.toBe(true);
    }
  });
});

describe('the Council’s seat and the gallery', () => {
  it('draws the held government on its banner, with the council’s chairs and its plate', () => {
    const register = braceBody(SCREEN, 'function drawRegister(');
    expect(register).toContain("dressGovernmentBanner(face, sc.government, { form: 'seat', layout: slotTypesOf(sc), plate });");
    expect(register).not.toContain('dressOrderFace(face, sc.government');
    // The lift shows the banner too, larger than the column holds it.
    expect(braceBody(SCREEN, 'function liftNow(')).toContain('governmentBannerNode(card, {');
    expect(uiSource('statecraftScreen.css')).toContain('.council-gov-card .gov-banner {\n  --gov-width: var(--council-gov-w, 200px);');
  });

  it('shows the banner in the flair gallery, in both forms', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/cardFaces.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    )[0] as string;
    expect(gallery).toContain('drawGovernmentBanners(into);');
    expect(gallery).toContain("form: 'row',");
    expect(gallery).toContain("const { banner } = governmentBannerNode(id, { form: 'seat' });");
    expect(gallery).toContain('fitGovernmentHand(hand);');
  });
});

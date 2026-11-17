/**
 * **The Order card's emblem face** (batch SS10, part 1; `src/ui/orderFace.ts`).
 *
 * The board is `docs/plans/mockups/scholars-study/order-card-faces.html`,
 * "Face 1, the emblem", approved by the user on 2026-11-17. This suite has no
 * DOM (`sourceHelpers.ts`), so the face is checked through its pure model and
 * its stylesheet and gallery are read as text:
 *
 *   1. the first figure, the red ink and the initial are read from the
 *      effect's structure, by small pure functions;
 *   2. every card in the data gives a face with a name, an effect and no
 *      bracket a reader could see, and every live card fits, except a named
 *      few whose effects are longer than the card;
 *   3. the border is the rarity, and a Doctrine has its own frame;
 *   4. the card faces load their own fonts and set two tokens;
 *   5. no row is named in the face or its gallery section, and the flair
 *      gallery shows the face.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { describeCard, stripRefs } from '../../src/sim/statecraft';
import {
  DOCTRINE_IDS,
  ORDER_IDS,
  doctrineDef,
  isDoctrineId,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import { splitDescriptor } from '../../src/ui/keywords';
import {
  type OrderFaceCardId,
  effectInitial,
  estimateOrderFaceFit,
  firstFigure,
  orderFaceFrame,
  orderFaceModel,
  rubricRuns,
} from '../../src/ui/orderFace';

/** The face's own files and its gallery section, as text. */
const FILES = {
  ...(import.meta.glob(
    [
      '../../src/ui/orderFace.ts',
      '../../src/ui/orderFace.css',
      '../../src/cardFaces.css',
      '../../src/art/orderFaceMarks.ts',
      '../../src/flairGallery/orderFaces.ts',
      '../../src/flairGallery/orderFaces.css',
      '../../src/flairGallery/main.ts',
      '../../src/flairGallery/entry.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
  ) as Record<string, string>),
};

function file(tail: string): string {
  const key = Object.keys(FILES).find((path) => path.endsWith(tail));
  const text = key === undefined ? undefined : FILES[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`orderFace test: ${tail} came back empty`);
  return text;
}

/** Every card the face can be asked for, retired rows included. */
const ALL_CARDS: readonly OrderFaceCardId[] = [...ORDER_IDS, ...DOCTRINE_IDS];

/** The cards a player can meet: dealt Orders, and the decks' Doctrines. */
const LIVE_CARDS: readonly OrderFaceCardId[] = [
  ...ORDER_IDS.filter((id) => orderIsDealt(id)),
  ...DOCTRINE_IDS.filter((id) => doctrineDef(id).retired !== true && doctrineDef(id).decks.length > 0),
];

/**
 * **The live cards whose effect is longer than the card**, even at 11 px
 * beside the short picture, by the estimate. The flair gallery measures them
 * on the page ("Every live card, measured"). The Surveyors' Charter does not
 * fit there either: it opens a technology, a building before its time and a
 * work, and it prints what each one does. Songs of the Fallen fits when
 * measured, because the estimate errs on the long side. A card joining this
 * list needs a decision (shorter words, or a different face for long cards),
 * not a smaller font.
 *
 * Ten cards stood here until the describers were given shorter words for a
 * charter technology's gifts and for clauses that share a count or their
 * cities (the ruling at the end of `docs/plans/ui-critique-2026-10-16.md`).
 */
const TOO_LONG: readonly string[] = ['theSurveyorsCharter', 'songsOfTheFallen'];

describe('the first figure, the red ink and the initial', () => {
  it('lifts the first figure the describers print, with the yield word after it', () => {
    expect(firstFigure('+3 gold in every city with a Granary')).toEqual({ figure: '+3', yield: 'gold' });
    expect(firstFigure('+1 food, +1 production on every hex')).toEqual({ figure: '+1', yield: 'food' });
    expect(firstFigure('+50% science on every trade route')).toEqual({ figure: '+50%', yield: 'science' });
    expect(firstFigure('-3 happiness in every city')).toEqual({ figure: '-3', yield: null });
    expect(firstFigure('+2 combat strength for military units')).toEqual({ figure: '+2', yield: null });
    // A figure not followed by a yield word lifts alone, even when one comes later.
    expect(firstFigure('30% of the production in every city is gained again as gold')).toEqual({
      figure: '30%',
      yield: null,
    });
    expect(firstFigure('Goal: clear 2 barbarian camps. Reward: a great general')).toEqual({
      figure: '2',
      yield: null,
    });
  });

  it('finds no figure on a rule card, so the card has no tablet', () => {
    expect(firstFigure('mounted units may move after attacking')).toBeNull();
    expect(firstFigure('killing a unit grants culture equal to its strength')).toBeNull();
    // A digit inside a word is not a figure.
    expect(firstFigure('the B52 line')).toBeNull();
  });

  it('inks the figures and the six yield words, and gives the words back whole', () => {
    const text = 'killing a unit grants culture equal to 2 times its strength, and +1 Gold';
    const runs = rubricRuns(text);
    expect(runs.map((run) => run.text).join('')).toBe(text);
    expect(runs.filter((run) => run.kind === 'figure').map((run) => run.text)).toEqual(['2', '+1']);
    expect(runs.filter((run) => run.kind === 'yield').map((run) => run.text)).toEqual(['culture', 'Gold']);
    // Whole words only: agriculture is not culture, golden is not gold.
    expect(rubricRuns('agriculture and golden roads').every((run) => run.kind === 'plain')).toBe(true);
  });

  it('reads the yield words from the simulation’s own list of yields', () => {
    for (const key of CITY_YIELD_KEYS) {
      expect(rubricRuns(`+1 ${key}`).map((run) => run.kind)).toEqual(['figure', 'plain', 'yield']);
    }
    expect(file('src/ui/orderFace.ts')).toContain('CITY_YIELD_KEYS.map(');
  });

  it('opens a worded effect with its first letter, and an effect that starts with a figure with none', () => {
    expect(effectInitial('pillaging grants +50 gold')).toBe('p');
    expect(effectInitial('Goal: clear 2 barbarian camps')).toBe('G');
    expect(effectInitial('+2 combat strength')).toBeNull();
    expect(effectInitial('30% of the production')).toBeNull();
    expect(effectInitial('')).toBeNull();
  });

  it('sets the initial as a capital in the stylesheet, so the words stay the describer’s', () => {
    const css = file('src/ui/orderFace.css');
    const rule = css.slice(css.indexOf('.order-face .of-initial {'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('text-transform: uppercase;');
  });
});

describe('every card in the data', () => {
  it('gives a face with a name, an effect and no bracket a reader could see', () => {
    for (const id of ALL_CARDS) {
      const model = orderFaceModel(id, { where: 'played' });
      expect(model.name.trim(), id).not.toBe('');
      // A few retired rows say nothing at all (the describers give them no
      // clause). Every card a player can meet has an effect.
      if (LIVE_CARDS.includes(id)) expect(model.clauses.length, id).toBeGreaterThan(0);
      else if (model.clauses.length === 0 && !isDoctrineId(id)) expect(orderDef(id).retired, id).toBe(true);
      for (const clause of [...model.clauses, ...(model.keyword === null ? [] : [model.keyword])]) {
        expect(stripRefs(clause.text).trim(), id).not.toBe('');
        // The keyword renderer prints the text runs and draws each mark as a
        // word, so a bracket left in a run would reach the page.
        for (const part of splitDescriptor(clause.text)) {
          if (part.kind === 'text') expect(part.text, id).not.toMatch(/\[\[|\]\]/);
        }
      }
      for (const words of [model.name, model.plate, model.caption, model.foot]) {
        expect(words, id).not.toMatch(/\[\[|\]\]/);
      }
    }
  });

  it('prints every clause the describers give, in their order, with the keyword in the picture', () => {
    for (const id of ALL_CARDS) {
      const model = orderFaceModel(id, { where: 'hand' });
      const all = describeCard(id);
      expect([...(model.keyword === null ? [] : [model.keyword]), ...model.clauses], id).toEqual([
        ...all.filter((clause) => clause.keyword !== undefined),
        ...all.filter((clause) => clause.keyword === undefined),
      ]);
    }
  });

  it('fits every live card on the face, except the few whose effects are longer than the card', () => {
    const over = LIVE_CARDS.filter((id) => orderFaceModel(id, { where: 'played' }).fit.over);
    expect([...over].sort()).toEqual([...TOO_LONG].sort());
    for (const id of LIVE_CARDS) {
      expect(orderFaceModel(id, { where: 'played' }).fit.size, id).toBeGreaterThanOrEqual(11);
    }
  });

  it('starts at 13 px for a short effect and steps down for a long one, never under 11', () => {
    expect(estimateOrderFaceFit(['+3 gold in every city'], { initial: false, reason: '', doctrine: false })).toEqual({
      size: 13,
      picture: 'full',
      over: false,
    });
    const long = 'once you know the art, the line gains the trait and keeps it through every upgrade';
    const steps = [1, 2, 3, 4].map((count) =>
      estimateOrderFaceFit(Array.from({ length: count }, () => long), { initial: true, reason: '', doctrine: false }),
    );
    expect(steps[0]).toEqual({ size: 13, picture: 'full', over: false });
    expect(steps[3]!.over || steps[3]!.picture === 'short').toBe(true);
    for (const step of steps) expect(step.size).toBeGreaterThanOrEqual(11);
  });

  it('takes the rays off a card that pays nothing now, and keeps them otherwise', () => {
    const id = LIVE_CARDS[0]!;
    expect(orderFaceModel(id, { where: 'played' }).rays).toBe(true);
    expect(orderFaceModel(id, { where: 'played', unmet: {} }).rays).toBe(false);
  });
});

describe('the border is the rarity', () => {
  it('maps every Order’s rarity to its frame, and every Doctrine to the gilt frame', () => {
    for (const id of ORDER_IDS) expect(orderFaceFrame(id), id).toBe(orderDef(id).rarity);
    for (const id of DOCTRINE_IDS) expect(orderFaceFrame(id), id).toBe('doctrine');
  });

  it('draws each frame once in the stylesheet, with its corner marks', () => {
    const css = file('src/ui/orderFace.css');
    expect(css).toContain(".order-face[data-frame='uncommon'] {");
    expect(css).toContain(".order-face[data-frame='rare'],\n.order-face[data-frame='doctrine'] {");
    expect(css).toContain(".order-face[data-frame='doctrine'] {");
    expect(css).toContain(".order-face[data-frame='uncommon'] .of-orn {\n  --of-mark: var(--of-mark-flourish);");
    expect(css).toContain(".order-face[data-frame='rare'] .of-orn {\n  --of-mark: var(--of-mark-star);");
    expect(css).toContain("--of-mark: var(--of-mark-sun);");
    expect(css).toContain("--of-mark: var(--of-mark-moon);");
    // A common card is the plain double rule: no corner marks are drawn.
    expect(file('src/ui/orderFace.ts')).toContain("if (model.frame !== 'common') {");
  });

  it('inks an Order by its type and a Doctrine in gilt', () => {
    const order = ORDER_IDS.find((id) => orderIsDealt(id))!;
    expect(orderFaceModel(order, { where: 'hand' }).ink).not.toBe('gilt');
    const doctrine = DOCTRINE_IDS[0]!;
    expect(orderFaceModel(doctrine, { where: 'hand' }).ink).toBe('gilt');
    expect(orderFaceModel(doctrine, { where: 'hand' }).plate).toBe('Doctrine');
  });
});

describe('the card faces', () => {
  const fonts = file('src/cardFaces.css');
  const faces = Array.from(fonts.matchAll(/@font-face\s*\{([^}]*)\}/g), (match) => match[1]!);

  it('declares EB Garamond and IM Fell English, from Google’s files', () => {
    const families = faces.map((body) => /font-family: '([^']+)';/.exec(body)?.[1]);
    expect(families.filter((name) => name === 'EB Garamond')).toHaveLength(4);
    expect(families.filter((name) => name === 'IM Fell English')).toHaveLength(2);
    expect(families.filter((name) => name === 'IM Fell English SC')).toHaveLength(1);
    for (const body of faces) {
      expect(body).toMatch(/src: url\(https:\/\/fonts\.gstatic\.com\/s\/(ebgaramond|imfellenglish|imfellenglishsc)\//);
      expect(body).toContain('font-display: swap;');
    }
  });

  it('sets the two tokens, each with a real fallback stack', () => {
    expect(fonts).toMatch(/--face-card-text: 'EB Garamond', [^;]*, serif;/);
    expect(fonts).toMatch(/--face-card-title: 'IM Fell English SC', 'IM Fell English', [^;]*, serif;/);
  });

  it('loads them only with the card: the face imports its sheet, and the sheet the fonts', () => {
    expect(file('src/ui/orderFace.ts')).toContain("import './orderFace.css';");
    const css = file('src/ui/orderFace.css');
    expect(css.trimStart().startsWith("@import '../cardFaces.css';")).toBe(true);
    expect(css).toContain('font-family: var(--face-card-text);');
    expect(css).toContain('font-family: var(--face-card-title);');
    expect(css).toContain('font-variant-numeric: lining-nums;');
  });

  it('sizes the whole face from one custom property', () => {
    const css = file('src/ui/orderFace.css');
    expect(css).toContain('--of-width: var(--order-face-width, 210px);');
    expect(css).toContain('font-size: calc(var(--of-width) / 21);');
    expect(css).toContain('width: 21em;');
    expect(css).toContain('height: 25.8em;');
  });
});

describe('no row is named', () => {
  /** Whole words or whole phrases, so a name inside a longer word does not count. */
  const names = (source: string, word: string): boolean =>
    new RegExp(`(?<![\\w'])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'])`).test(source);

  it('writes no card id, card name or leader in the face, its sheets or its gallery section', () => {
    const cardNames = ALL_CARDS.map((id) => (isDoctrineId(id) ? doctrineDef(id) : orderDef(id)).name).filter(
      (name) => name.includes(' '),
    );
    for (const tail of [
      'src/ui/orderFace.ts',
      'src/ui/orderFace.css',
      'src/cardFaces.css',
      'src/art/orderFaceMarks.ts',
      'src/flairGallery/orderFaces.ts',
      'src/flairGallery/orderFaces.css',
    ]) {
      const source = file(tail);
      for (const id of ALL_CARDS) expect(names(source, id), `${tail} names ${id}`).toBe(false);
      for (const name of cardNames) expect(names(source, name), `${tail} names ${name}`).toBe(false);
      for (const id of LEADER_IDS) {
        expect(names(source, id), `${tail} names ${id}`).toBe(false);
        expect(names(source, leaderDef(id).name), `${tail} names a figure`).toBe(false);
      }
    }
  });
});

describe('the flair gallery', () => {
  it('shows the face in the full cabinet and on a page of its own', () => {
    const main = file('src/flairGallery/main.ts');
    expect(main).toContain("import { drawOrderFaces } from './orderFaces';");
    expect(main).toContain("'order-face',");
    const entry = file('src/flairGallery/entry.ts');
    expect(entry).toContain("review === 'order-face'");
    expect(entry).toContain("import('./orderFaces')");
  });

  it('draws real rows in every state, the longest effects, and the corner marks', () => {
    const gallery = file('src/flairGallery/orderFaces.ts');
    for (const piece of [
      'orderFaceNode(',
      'emptyChairFace(',
      'fitOrderFace(',
      "where: 'hand'",
      'sealedTurns:',
      'staged: true',
      'unmet:',
      "kind: 'counter'",
      'The longest effects',
      'markCell(',
      "'card width'",
    ]) {
      expect(gallery, piece).toContain(piece);
    }
    // The board's own cards are read from the board's file, not named here.
    expect(gallery).toContain('order-card-faces.html?raw');
  });
});

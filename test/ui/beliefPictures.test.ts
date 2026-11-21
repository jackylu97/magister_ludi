/**
 * The list of belief pictures (`src/ui/beliefPictures.ts`) against the folder the page loads
 * them from, as `wonderPaintings.test.ts` does for the wonders, and the one
 * window that shows a belief's picture (`beliefWindowNode`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { inPlayMarkDataUri } from '../../src/art/inPlayMarks';
import { BELIEF_IDS, FOLLOWER_BELIEF_IDS } from '../../src/sim/religionData';
import { BELIEF_PICTURES, BELIEF_PICTURES_PATH, beliefPictureUrl } from '../../src/ui/beliefPictures';
import { beliefPicture, beliefWindowNode } from '../../src/ui/beliefPictures';
import { type FakeNode, byClass, installFakeDocument } from './faithTabHelpers';
import { braceBody, uiSource } from './sourceHelpers';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/beliefs/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the belief pictures', () => {
  it('lists exactly the pictures in the folder, which may be none', () => {
    expect([...BELIEF_PICTURES].sort()).toEqual(FILES);
  });

  it('names each picture once, in order, and only a row the table knows', () => {
    expect(new Set(BELIEF_PICTURES).size).toBe(BELIEF_PICTURES.length);
    expect([...BELIEF_PICTURES]).toEqual([...BELIEF_PICTURES].sort());
    for (const id of BELIEF_PICTURES) expect(BELIEF_IDS as readonly string[]).toContain(id);
  });

  it('loads them from the folder under public', () => {
    expect(BELIEF_PICTURES_PATH).toBe('/art/splash/beliefs/');
    expect(beliefPictureUrl('nobodyAtAll')).toBeNull();
  });

  it('answers a vignette where one exists and the drawn mark elsewhere', () => {
    for (const id of BELIEF_IDS) {
      const url = beliefPictureUrl(id);
      expect(beliefPicture(id), id).toEqual(url === null ? { kind: 'mark' } : { kind: 'painted', url });
    }
  });
});

/**
 * **A belief's window is drawn in one place** (the user, 2026-11-21: the
 * belief art belongs on the card where a belief is chosen, and on the In play
 * screen). `beliefWindowNode` fills the window, and the three surfaces that
 * show a belief's picture call it: the Faith sheet's tablets, the In play
 * tablet and the belief offer. So a belief looks the same on all three, and a
 * new vignette needs no change but its line in the list.
 */
describe('the belief window', () => {
  let undo: () => void = () => {};
  beforeEach(() => {
    undo = installFakeDocument();
  });
  afterEach(() => undo());

  const node = (pane: HTMLElement): FakeNode => pane as unknown as FakeNode;

  it('shows the vignette of a belief that has one', () => {
    const id = BELIEF_PICTURES[0]!;
    const drawn = beliefWindowNode(id);
    const pane = node(drawn);
    expect(pane.className).toBe('faith-window');
    expect(pane.dataset.picture).toBe('painted');
    expect(pane.attributes['aria-hidden']).toBe('true');
    expect((drawn.style as unknown as Record<string, unknown>).backgroundImage).toBe(`url("${beliefPictureUrl(id)}")`);
    expect(pane.children).toHaveLength(0);
  });

  it('shows the drawn mark for a belief with no vignette, and for the holy city', () => {
    const plain = FOLLOWER_BELIEF_IDS.find((id) => beliefPictureUrl(id) === null);
    expect(plain).toBeDefined();
    for (const [belief, mark] of [
      [plain!, 'belief'],
      [null, 'holyCity'],
    ] as const) {
      const pane = node(beliefWindowNode(belief, mark));
      expect(pane.dataset.picture, String(belief)).toBe('mark');
      const drawn = byClass(pane, 'faith-window-mark');
      expect(drawn, String(belief)).toHaveLength(1);
      expect(drawn[0]!.props['--faith-mark']).toBe(`url("${inPlayMarkDataUri(mark)}")`);
    }
  });

  it('is the one window the three surfaces draw', () => {
    // Only the window's own module asks which picture a belief has.
    for (const name of ['bonusesTab.ts', 'inPlayForms.ts', 'offerCard.ts', 'offerFaces.ts', 'main.ts']) {
      expect(uiSource(name), name).not.toContain('beliefPicture(');
    }
    expect(braceBody(uiSource('bonusesTab.ts'), 'function windowNode(card: BonusCard): HTMLElement')).toContain(
      'beliefWindowNode(',
    );
    expect(uiSource('inPlayForms.ts')).toContain(
      "beliefWindowNode(holyCity ? null : entry.card, holyCity ? 'holyCity' : 'belief')",
    );
    const main = uiSource('main.ts');
    const offer = main.slice(main.indexOf('function showReligionOffer('), main.indexOf('function showGreatPersonOffer('));
    expect(offer).toContain('picture: () => beliefWindowNode(id),');
  });
});

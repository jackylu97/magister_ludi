/**
 * The title screen's painting, and where the file is.
 *
 * The title screen is drawn as frame a8 of the Quiet Table boards
 * (`docs/plans/mockups/scholars-study/quiet-table-fourth-pass/base.py`,
 * `title()`, with the tag line of `third.py`'s `title3()`). The user approved
 * it on 2026-11-19 ("great, i like this"), and
 * `docs/plans/ui-critique-2026-10-16.md` has the ruling. The frame:
 * - the painting is the full width of the window, and the title is on its sky;
 * - the lapis ribbon is the seam between the painting and the paper;
 * - the menu is one row of plain buttons on the paper, with a panel of recent
 *   worlds beside it.
 *
 * The painting is the user's splash art: one 16:9 JPEG,
 * `public/art/splash/title/title.jpg`. About 5:2 of it shows, cut from the
 * middle, so its subject goes in the middle band
 * (`public/art/splash/README.md`). The file does not exist yet.
 *
 * Until it exists, the page shows a **stand-in**: the game's own title
 * picture, the painted town of the banner the title screen had before
 * (`/art/frontispiece.jpg`). The user, 2026-11-20, on the first stand-in, a
 * wonder's painting: "why not re-use the old banner image?" If no picture
 * loads at all, the page shows that banner in its old form.
 *
 * The list of title paintings is written out, not read from the folder, for
 * the reason `wonderPaintings.ts` gives: a file in `public/` is not part of the
 * module graph, so the page cannot ask which files exist.
 * `test/ui/titlePainting.test.ts` holds the list to the folder in both
 * directions.
 *
 * This module also owns the stylesheet of the whole title step
 * (`titleScreen.css`), because the painting decides its layout.
 */

import './titleScreen.css';

import { orderFaceMarkUri } from '../art/orderFaceMarks';
import { plateRibbonNode } from './plateRibbon';

/**
 * The title paintings in the folder, by file name without `.jpg`. The page
 * shows `title` when it is listed. Empty until the user delivers the file.
 */
export const TITLE_PAINTINGS: readonly string[] = [];

/** The folder the page loads the title painting from (a path under `public/`). */
export const TITLE_PAINTING_PATH = '/art/splash/title/';

/** One picture the title screen can show, and how it is cut. */
export interface TitlePaintingChoice {
  /** The address of the file. */
  url: string;
  /**
   * Where the window sits on the picture, as a CSS `object-position`. The
   * window covers the full width, so this moves it up or down the picture.
   */
  position: string;
  /** True for the stand-in, which is not a title painting. */
  standIn: boolean;
}

/** The title painting, when the file exists. It is cut from the middle. */
const TITLE_PAINTING: TitlePaintingChoice = {
  url: `${TITLE_PAINTING_PATH}title.jpg`,
  position: '50% 50%',
  standIn: false,
};

/**
 * **The stand-in.** The painted town of the old banner, the game's own title
 * picture. It is 7:3, close to the shape of the window, so it covers the
 * window from its middle and loses very little. The page shows it until
 * `title.jpg` exists.
 */
export const TITLE_STAND_IN: TitlePaintingChoice = {
  url: '/art/frontispiece.jpg',
  position: '50% 50%',
  standIn: true,
};

/**
 * The pictures to try, in order: the title painting when it is listed, then
 * the stand-in. `painted` is the list of files in the folder.
 */
export function titlePaintingChoices(painted: readonly string[] = TITLE_PAINTINGS): TitlePaintingChoice[] {
  return painted.includes('title') ? [TITLE_PAINTING, TITLE_STAND_IN] : [TITLE_STAND_IN];
}

/**
 * What the title screen shows after `failures` pictures did not load: the next
 * picture to try, or `'banner'` when there is none left. The banner is the
 * title screen as it was before frame a8.
 */
export function titleArtAfter(
  choices: readonly TitlePaintingChoice[],
  failures: number,
): TitlePaintingChoice | 'banner' {
  return choices[failures] ?? 'banner';
}

/** The elements the title screen fills in. */
interface TitleElements {
  /**
   * `#landing`, or a sample of the title in the flair gallery. Its
   * `data-title-art` is `painting` or `banner`, and the stylesheet reads it to
   * lay out the title step.
   */
  root: HTMLElement;
  /** The band across the top of the window. The picture goes in first. */
  head: HTMLElement;
  /** The place for the ribbon, between the painting and the paper. */
  seam: HTMLElement;
}

/**
 * Puts the painting, the seam and the small star on the title screen. Called
 * once, when the page loads: the painting does not change between showings of
 * the landing.
 *
 * The first picture is tried, and if it does not load, the next. If none loads,
 * `data-title-art` becomes `banner` and the page shows today's banner. A
 * picture that loads gets `is-loaded`, which fades it in.
 *
 * The `<img>` is made here rather than written in the page, because the page
 * cannot know which picture to ask for, and an `<img>` with no address in the
 * markup is a broken picture if this function never runs.
 */
export function dressTitlePainting(elements: TitleElements, painted: readonly string[] = TITLE_PAINTINGS): void {
  const { root, head, seam } = elements;
  const choices = titlePaintingChoices(painted);
  const painting = document.createElement('img');
  painting.className = 'title-painting';
  painting.alt = '';
  painting.decoding = 'async';
  head.prepend(painting);
  seam.replaceChildren(plateRibbonNode('seam'));
  root.style.setProperty('--title-star', `url("${orderFaceMarkUri('star')}")`);

  let failures = 0;
  const show = (): void => {
    const art = titleArtAfter(choices, failures);
    if (art === 'banner') {
      // The painting's place is hidden with the banner up, so the broken
      // picture is left as it is.
      root.dataset.titleArt = 'banner';
      return;
    }
    root.dataset.titleArt = 'painting';
    painting.dataset.standIn = String(art.standIn);
    painting.style.setProperty('--title-painting-position', art.position);
    painting.src = art.url;
  };

  painting.addEventListener('load', () => painting.classList.add('is-loaded'));
  painting.addEventListener('error', () => {
    if (root.dataset.titleArt === 'banner') return;
    painting.classList.remove('is-loaded');
    failures += 1;
    show();
  });
  show();
}

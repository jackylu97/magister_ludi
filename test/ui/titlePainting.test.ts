/**
 * The title screen as frame a8 of the Quiet Table boards draws it
 * (`docs/plans/ui-critique-2026-10-16.md`; the frame is `title()` in
 * `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/base.py`).
 *
 * The claims, one section each:
 * - the list of title paintings matches its folder, and the stand-in is a real
 *   file;
 * - the page tries the title painting, then the stand-in, then falls back to
 *   the earlier banner;
 * - the words: the title, the ornament and the tag line "a game for the ages";
 * - the seam is the plates' own ribbon, not a second one;
 * - each button, and where it leads;
 * - the panel of recent worlds, from the save list;
 * - reduced motion.
 *
 * This suite has no document, so the DOM half is read off the source
 * (`sourceHelpers.ts`), and the choices are pure functions.
 */
import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from '../../src/sim/state';
import { SAVE_FORMAT_VERSION, memorySaveStorage, metaKey, storageKey } from '../../src/ui/saves';
import { recentWorlds } from '../../src/ui/savesPanel';
import {
  TITLE_PAINTINGS,
  TITLE_PAINTING_PATH,
  TITLE_STAND_IN,
  titleArtAfter,
  titlePaintingChoices,
} from '../../src/ui/titlePainting';
import { braceBody, uiSource } from './sourceHelpers';

const INDEX = uiSource('index.html');
const MAIN = uiSource('main.ts');
const MODULE = uiSource('titlePainting.ts');
const CSS = uiSource('titleScreen.css');
const RIBBON = uiSource('plateRibbon.ts');
const RIBBON_CSS = uiSource('plateRibbon.css');

/** The title step's block of the page, from its opening tag to the world step. */
const TITLE = INDEX.slice(INDEX.indexOf('<div class="title-screen'), INDEX.indexOf('data-step-for="world"'));

/** The JPEGs in the title folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/title/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

/** The stand-in's file, if it is in the wonders folder. */
const STAND_IN_FILE = Object.keys(
  import.meta.glob('../../public/art/splash/wonders/hangingGardens.jpg', { query: '?url' }),
);

describe('the title painting and its folder', () => {
  it('lists exactly the paintings in the folder, which may be none', () => {
    expect([...TITLE_PAINTINGS].sort()).toEqual(FILES);
    // The one file the page asks for is `title.jpg`.
    for (const name of TITLE_PAINTINGS) expect(name).toBe('title');
  });

  it('loads it from the folder under public', () => {
    expect(TITLE_PAINTING_PATH).toBe('/art/splash/title/');
  });

  it('names a stand-in that exists, and names it as a stand-in', () => {
    expect(STAND_IN_FILE).toHaveLength(1);
    expect(TITLE_STAND_IN).toEqual({
      url: '/art/splash/wonders/hangingGardens.jpg',
      position: '50% 30%',
      standIn: true,
    });
  });
});

describe('which picture the page shows', () => {
  it('shows the stand-in while there is no title painting', () => {
    expect(titlePaintingChoices([])).toEqual([TITLE_STAND_IN]);
  });

  it('tries the title painting first once it is listed, cut from the middle', () => {
    const choices = titlePaintingChoices(['title']);
    expect(choices).toHaveLength(2);
    expect(choices[0]).toEqual({ url: '/art/splash/title/title.jpg', position: '50% 50%', standIn: false });
    expect(choices[1]).toBe(TITLE_STAND_IN);
  });

  it('moves to the next picture on each failure, then to the banner', () => {
    const choices = titlePaintingChoices(['title']);
    expect(titleArtAfter(choices, 0)).toBe(choices[0]);
    expect(titleArtAfter(choices, 1)).toBe(TITLE_STAND_IN);
    expect(titleArtAfter(choices, 2)).toBe('banner');
    expect(titleArtAfter(titlePaintingChoices([]), 1)).toBe('banner');
  });

  it('wires the failures to the page: an error tries the next, the last sets the banner', () => {
    const dress = braceBody(MODULE, 'export function dressTitlePainting(');
    expect(dress).toContain("painting.addEventListener('error', () => {");
    expect(dress).toContain('failures += 1;');
    expect(dress).toContain("root.dataset.titleArt = 'banner';");
    expect(dress).toContain("root.dataset.titleArt = 'painting';");
    expect(dress).toContain("painting.addEventListener('load', () => painting.classList.add('is-loaded'));");
    // The listeners go on before the first address, so an early failure is heard.
    expect(dress.indexOf("addEventListener('error'")).toBeLessThan(dress.lastIndexOf('show();'));
    // Called once, when the page loads.
    expect(MAIN.match(/dressTitlePainting\(/g)).toHaveLength(1);
    expect(MAIN).toContain("head: requireElement('title-head'),");
    expect(MAIN).toContain("seam: requireElement('title-seam'),");
  });

  it('keeps the earlier banner in the page as the fallback, and hides the one not in use', () => {
    expect(INDEX).toContain('data-title-art="painting"');
    expect(TITLE).toContain('<header class="marquee marquee-poster title-banner">');
    expect(TITLE).toContain('src="/art/frontispiece.jpg"');
    // Lazy, so the banner's picture is not fetched while it is hidden.
    expect(TITLE).toContain('loading="lazy"');
    expect(CSS).toContain("[data-title-art='painting'] .title-banner.marquee-poster,");
    expect(CSS).toContain("[data-title-art='banner'] .title-head,");
    expect(CSS).toContain("[data-title-art='banner'] .title-seam {");
    // No picture in the markup: the module asks for one, so the page fetches
    // one picture only.
    expect(TITLE.slice(TITLE.indexOf('<header id="title-head"'), TITLE.indexOf('</header>'))).not.toContain('<img');
  });

  it('cuts the picture as the frame does: it covers the band at its chosen position', () => {
    const rule = CSS.slice(CSS.indexOf('\n.title-painting {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toContain('object-fit: cover;');
    expect(body).toContain('object-position: var(--title-painting-position, 50% 50%);');
    expect(MODULE).toContain("painting.style.setProperty('--title-painting-position', art.position);");
    // About 5:2 of a 16:9 picture: the width over 2.45, giving way on a short window.
    expect(CSS).toContain('--title-painting-h: max(200px, min(calc(100vw / 2.45), calc(100vh - 240px)));');
  });
});

describe('the words on the sky', () => {
  it('sets the title with Ludi in gilt italic', () => {
    expect(TITLE).toContain('<h1 class="title-word">Magister <em>Ludi</em></h1>');
    const em = CSS.slice(CSS.indexOf('.title-word em {'));
    expect(em.slice(0, em.indexOf('}'))).toContain('font-style: italic;');
    expect(em.slice(0, em.indexOf('}'))).toContain('color: var(--y-gold-lit);');
  });

  it('gives the title its tag line (the user: "a game for the ages")', () => {
    expect(TITLE).toContain('<p class="title-tagline">a game for the ages</p>');
    expect(INDEX).not.toContain('one seed · one world');
  });

  it('draws the small ornament with the card corners’ star', () => {
    expect(TITLE).toContain('<span class="title-ornament" aria-hidden="true"><i></i><b></b><i></i></span>');
    expect(MODULE).toContain("root.style.setProperty('--title-star', `url(\"${orderFaceMarkUri('star')}\")`);");
  });
});

describe('the seam', () => {
  it('is the plates’ own ribbon in its thin form, not a second ribbon', () => {
    expect(MODULE).toContain("seam.replaceChildren(plateRibbonNode('seam'));");
    expect(RIBBON).toContain("export function plateRibbonNode(form: PlateRibbonForm = 'band'): HTMLElement {");
    expect(RIBBON_CSS).toContain('\n.plate-ribbon.is-seam {');
    // The title's sheet writes no ribbon of its own.
    expect(CSS).not.toContain('.plate-ribbon');
    expect(TITLE).toContain('<div id="title-seam" class="title-seam"></div>');
  });
});

describe('the buttons, and where each leads', () => {
  const menu = TITLE.slice(TITLE.indexOf('<div class="title-menu">'), TITLE.indexOf('<p class="title-later">'));

  it('is one row in the frame’s order, with New game as the primary', () => {
    const order = [...menu.matchAll(/<button id="([^"]+)"/g)].map((match) => match[1]);
    expect(order).toEqual(['landing-new', 'continue-game', 'landing-load', 'landing-compendium']);
    expect(menu).toContain('<button id="landing-new" class="btn btn-primary title-button"');
    expect(menu.match(/btn-primary/g)).toHaveLength(1);
    // Continue hides itself when there is nothing to resume.
    expect(menu).toMatch(/id="continue-game"[^>]*hidden>/);
  });

  it('sends New game to the world step, by press and by N', () => {
    expect(MAIN).toContain("newGameButton.addEventListener('click', () => landing.go('world'));");
    expect(MAIN).toContain("else if (action === 'new') landing.go('world');");
  });

  it('sends Continue to the newest save, by press and by Enter', () => {
    expect(MAIN).toContain('loadSlotId(newestSlot(saveStorage)?.id ?? null);');
    expect(MAIN).toContain("if (action === 'continue') continueButton.click();");
  });

  it('opens the load list from Load a game, by press and by L', () => {
    expect(MAIN).toContain("landingLoadButton.addEventListener('click', () => openSaves());");
    expect(MAIN).toContain("else if (action === 'load') openSaves();");
  });

  it('opens the Compendium, by press and by ?', () => {
    expect(MAIN).toContain("compendiumMenuButton.addEventListener('click', () => compendium.open());");
    expect(braceBody(MAIN, 'onKey: (action) => {')).toContain('else compendium.open();');
  });

  it('puts the keyboard on Continue when there is a save, and on New game when not', () => {
    expect(MAIN).toContain('(continueButton.hidden ? newGameButton : continueButton).focus({ preventScroll: true });');
  });
});

describe('the recent worlds', () => {
  /** A save's label, as the shelf stores it beside the save. */
  function shelve(
    storage: ReturnType<typeof memorySaveStorage>,
    id: string,
    label: { name: string; turn: number; savedAt: number; leader?: string },
  ): void {
    storage.setItem(storageKey(id), 'the save itself');
    storage.setItem(
      metaKey(id),
      JSON.stringify({
        formatVersion: SAVE_FORMAT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        seed: 1,
        sizeName: 'standard',
        seats: 6,
        chars: 15,
        ...label,
      }),
    );
  }

  it('lists the newest four saves, newest first, each by its leader and its turn', () => {
    const storage = memorySaveStorage();
    shelve(storage, 'autosave', { name: 'Autosave', turn: 101, savedAt: 5000, leader: 'pachacuti' });
    shelve(storage, 'named:one', { name: 'One', turn: 72, savedAt: 4000, leader: 'taizong' });
    shelve(storage, 'named:two', { name: 'Two', turn: 30, savedAt: 1000, leader: 'modu' });
    shelve(storage, 'named:three', { name: 'Three', turn: 12, savedAt: 3000 });
    shelve(storage, 'quicksave', { name: 'Quicksave', turn: 200, savedAt: 2000, leader: 'pachacuti' });
    const worlds = recentWorlds(storage);
    expect(worlds.map((world) => [world.figure, world.slot.turn])).toEqual([
      ['Pachacuti', 101],
      ['Emperor Taizong', 72],
      // A save with no leader is named by its own name.
      ['Three', 12],
      ['Pachacuti', 200],
    ]);
  });

  it('is empty with no saves, and the panel says so', () => {
    expect(recentWorlds(memorySaveStorage())).toEqual([]);
    expect(TITLE).toMatch(/id="landing-shelf-empty"[^>]*hidden>\s*No worlds yet\. A game autosaves at the end of every turn\./);
    expect(MAIN).toContain('shelfEmptyEl.hidden = worlds.length > 0;');
  });

  it('prints the leader and the turn on a row, and a press loads that world', () => {
    const rows = braceBody(MAIN, 'function refreshResumeRow(): void {');
    expect(rows).toContain('who.textContent = world.figure;');
    expect(rows).toContain('when.textContent = `turn ${world.slot.turn}`;');
    // The save's own name and how long ago are on the tooltip.
    expect(rows).toContain('row.title = `Load “${world.slot.name}” · ${relativeWhen(world.slot.savedAt)}`;');
    expect(rows).toContain('row.addEventListener(\'click\', () => loadSlotId(world.slot.id));');
    expect(TITLE).toContain('<p id="title-worlds-head" class="eyebrow">Recent worlds</p>');
  });

  it('puts the panel under the buttons on a narrow window', () => {
    const narrow = CSS.slice(CSS.indexOf('@media (max-width: 900px)'));
    expect(narrow.slice(0, narrow.indexOf('\n}\n'))).toMatch(/'menu'\s*'later'\s*'worlds'/);
    expect(CSS).toContain('flex-wrap: wrap;');
  });
});

describe('the arrival', () => {
  it('shows everything at once with reduced motion', () => {
    const reduced = CSS.slice(CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.title-name {\n    animation: none;');
    expect(reduced).toContain('.title-painting {\n    transition: none;');
    // The seam's draw is the ribbon's, and the ribbon's own block stops it.
    const ribbonReduced = RIBBON_CSS.slice(RIBBON_CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(ribbonReduced).toContain('.plate-ribbon,');
  });
});

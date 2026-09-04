/**
 * The Pamphlet — the picture-first pager a new player flips through before the
 * tutorial's first step, and a page of the Compendium forever after.
 *
 * The user's ruling (2026-09-03): an introductory pamphlet a new player can
 * skim, shown once, BEFORE the tutorial sequence, and reachable afterwards
 * through the reference book. Re-ruled the same day on seeing the first build
 * ("so that it isn't too text heavy"): the pamphlet is **multiple pages** — a
 * pager with next/back and page dots — and every page **leads with its
 * screenshot**; the words are caption-weight, a heading and at most two short
 * sentences. Everything longer lives in the Compendium's ordinary entries,
 * which is where this pamphlet's first draft moved its paragraphs.
 * `docs/pamphlet.md` is the spec of record.
 *
 * One table, one printer, two mounts
 * ----------------------------------
 * `PAMPHLET_PAGES` is the whole of the content, and `renderPamphletBody` is
 * the one printer — it builds the pager. The first-run overlay
 * (`createPamphletOverlay`, mounted by `main.ts` beside the tutorial) and the
 * Compendium's own page (`pamphletEntry`, on the Introduction shelf at
 * `intro:pamphlet`) both call it, so the leaflet a player flips on their
 * first visit and the page they find in the book later cannot drift apart.
 * The pager's position is DOM state and nothing more: nothing about "which
 * page" is ever persisted — the only memory is `seen`, below.
 *
 * The heroes are photographs, with the marks baked in
 * ---------------------------------------------------
 * Each page's hero is a **screenshot of the real game**, served from
 * `public/pamphlet/`. Cursor indicators and highlight rings are baked into
 * the captures at capture time (the shot list's "mark" column,
 * `docs/pamphlet.md`) — never positioned by this page, because a recapture
 * would orphan positioned marks. A missing file degrades to the panel's
 * caption alone — the `<img>` removes itself on error and the frame shows the
 * caption describing what the shot will hold — so the pamphlet is never a
 * page of broken-image glyphs while a capture lags a UI pass.
 *
 * The voice is `compendiumText.ts`'s
 * ----------------------------------
 * Hard rule 7, same as the tutorial: plain words a first-time player already
 * owns, no identifier on screen, and no digit in the prose — the one figure
 * named is spelled ("twenty beads"), because there the number *is* the rule.
 * A named thing the book has a page about is a keyword ref
 * (`[[kind:id|name]]`), printed through `setDescriptorText` so it comes out
 * bold and linked, never as brackets.
 *
 * First-run memory, the tutorial's mechanism one step earlier
 * -----------------------------------------------------------
 * Whether this browser has read the pamphlet lives in `localStorage` under
 * its own versioned key, read and written with exactly the tutorial's
 * tolerance: a throwing shelf, a missing key and nonsense all read as "never
 * seen", and the worst a broken shelf can cost is one extra showing. The
 * ordering itself — pamphlet, then tutorial step one, and a returning player
 * sees neither — is `main.ts`'s `beginOpening`, built on `shouldShowPamphlet`
 * below.
 */

import type { CompendiumEntry } from './compendium';
import { setDescriptorText } from './keywords';
import type { TutorialStorage } from './tutorial';

// --- the table ---------------------------------------------------------------

/** One page's hero shot: a file under `public/pamphlet/`, captioned. */
export interface PamphletPanel {
  /** The image path, absolute from the site root. The file may not exist yet. */
  image: string;
  /** What the shot holds — shown only while the file is missing. */
  caption: string;
}

/**
 * One page of the pamphlet: the hero, a heading, and at most two short
 * sentences at caption weight. `lines` is the re-ruling's budget and the test
 * pins it — a page that needs a third sentence is a page that belongs in the
 * Compendium instead.
 */
export interface PamphletPage {
  /** Stable, for the shot list and the tests. Never printed. */
  id: string;
  title: string;
  panel?: PamphletPanel;
  /** One or two sentences, each its own line under the hero. */
  lines: readonly string[];
}

/**
 * The pamphlet, in flipping order. The ruled contents plus the orchestrator's
 * additions (`docs/pamphlet.md`), one topic per page — the closing page pairs
 * its two small ones. Trade routes, deep religion and great people are
 * deliberately absent; the book carries those.
 */
export const PAMPHLET_PAGES: readonly PamphletPage[] = [
  {
    id: 'board',
    title: 'Select a unit',
    panel: {
      image: '/pamphlet/select-unit.png',
      caption: 'A settler selected on its hex, with its orders panel open on the right.',
    },
    lines: [
      'Left-click a unit on the board — or its entry in the panel — and the panel on the right is where its orders live.',
      'The game is turn-based: take your time, because the world moves only when every player has ended the turn.',
    ],
  },
  {
    id: 'orders',
    title: 'Move and attack',
    panel: {
      image: '/pamphlet/move-attack.png',
      caption: 'A combat forecast, shown while hovering an enemy with a unit selected.',
    },
    lines: [
      'With a unit selected, right-click a hex to move there, or right-click an enemy to attack.',
      'Hover the enemy first: the forecast shows both sides\' [[concept:combat|strength]] and the damage each would take.',
    ],
  },
  {
    id: 'city',
    title: 'Found cities, build things',
    panel: {
      image: '/pamphlet/city-screen.png',
      caption: 'The city screen, with a build queue being chosen.',
    },
    lines: [
      'A settler founds a [[concept:cities|city]]; click the city to choose what it builds — an empty queue is a wasted turn.',
      'More cities means a stronger empire, so keep settling — grass and fresh water make the best ground.',
    ],
  },
  {
    id: 'banner',
    title: 'Read the banner',
    panel: {
      image: '/pamphlet/city-banner.png',
      caption: 'A city banner up close: the size number, the growth ring, the build line.',
    },
    lines: [
      'The number on a banner is the city\'s size; the ring around it fills as the city grows.',
      'Under the name: what the city is building, and how many turns remain.',
    ],
  },
  {
    id: 'tile',
    title: 'Read a hex',
    panel: {
      image: '/pamphlet/tile-readout.png',
      caption: 'The tile card for a hovered hex, with the yields lens on behind it.',
    },
    lines: [
      'Hover any hex to see its [[concept:yields|yields]] — food grows the city, hammers build, coins keep the army paid.',
      'The yields lens paints every hex\'s pay straight onto the map.',
    ],
  },
  {
    id: 'tree',
    title: 'The technology tree',
    panel: {
      image: '/pamphlet/tech-tree.png',
      caption: 'The technology tree: nodes joined by lines, with a research queue aimed.',
    },
    lines: [
      'Each node on the tree is one [[concept:technology|technology]]; the lines run from what it needs to what it opens.',
      'Click any node to aim at it — the game queues whatever has to come first.',
    ],
  },
  {
    id: 'draft',
    title: 'Statecraft and religion',
    panel: {
      image: '/pamphlet/statecraft.png',
      caption: 'The Statecraft screen: a drafted card going into a government slot.',
    },
    lines: [
      'Culture earns drafts of cards — pick one, then place it in a slot on the [[concept:statecraft|Statecraft]] screen to make it law.',
      'Faith works on the [[concept:religion|Religion]] screen — gods, blessings, and in time a religion of your own.',
    ],
  },
  {
    id: 'workers',
    title: 'Workers improve the land',
    panel: {
      image: '/pamphlet/worker-improve.png',
      caption: 'A worker on an owned hex, offering the improvements that hex can take.',
    },
    lines: [
      'A worker builds [[concept:resources|improvements]] — farms, mines, pastures — and is spent over a few uses, so improve your best hexes first.',
      'Clearing a forest pays production once, but the forest\'s own yield is gone for good — a trade, not a cleanup.',
    ],
  },
  {
    id: 'fog',
    title: 'The fog and the wild',
    panel: {
      image: '/pamphlet/fog-camp.png',
      caption: 'The edge of the known world, with a barbarian camp found in it.',
    },
    lines: [
      'You see only what your units can see — the rest waits under the [[concept:fog|fog of war]], and exploring it pays: ruins reward whoever arrives first.',
      'Barbarian camps raid until somebody burns them out — keep a soldier at home.',
    ],
  },
  {
    id: 'endTurn',
    title: 'End the turn',
    panel: {
      image: '/pamphlet/end-turn.png',
      caption: 'The End Turn button in its waiting state, naming what it still needs.',
    },
    lines: [
      'Press End Turn when you are done; all players move at once, so the world resolves when everyone has pressed it.',
      'If the button balks it is not an error — a unit, a city, or a draft still needs your answer, and pressing it takes you there.',
    ],
  },
  {
    id: 'meters',
    title: 'Happiness and authority',
    panel: {
      image: '/pamphlet/meters.png',
      caption: 'The two meter chips on the top bar, beside the six yield figures.',
    },
    lines: [
      '[[concept:meters|Happiness]] limits how big your cities get; authority limits how many you can hold.',
      'Going over is a cost, not a defeat — hover either number to see where it stands.',
    ],
  },
  {
    id: 'war',
    title: 'War and peace',
    panel: {
      image: '/pamphlet/diplomacy.png',
      caption: 'The Diplomacy screen, where war is declared and peace is made.',
    },
    lines: [
      'You are at peace until somebody declares war — until then their soldiers cannot enter your land, and you cannot [[concept:combat|attack]] them.',
      'War, peace, and deals live on the Diplomacy screen, behind the flag button.',
    ],
  },
  {
    id: 'winning',
    title: 'How you win',
    panel: {
      image: '/pamphlet/abacus.png',
      caption: 'The Abacus: every player\'s beads, strung side by side.',
    },
    lines: [
      'The game is scored in [[bead:about|beads]] — points for doing things first in the world; twenty beads wins on the spot.',
      'Otherwise the Magnum Opus closes the game, and the most beads wins — a tie goes to its builder.',
    ],
  },
  {
    id: 'help',
    title: 'Help, and your first goals',
    lines: [
      'This pamphlet stays in the Compendium — the book button at the top of the screen — where bold words everywhere link to every rule in the game.',
      'First goals: found a second city, finish a technology, build a worker, clear a barbarian camp.',
    ],
  },
];

// --- the Compendium page -----------------------------------------------------

/**
 * The pamphlet's address in the book. A literal rather than `compendiumId`,
 * because importing the composer would make this module's one type-only
 * dependency on `compendium.ts` a runtime one; the compendium test pins that
 * the two spellings agree.
 */
export const PAMPHLET_ENTRY_ID = 'intro:pamphlet';

/**
 * The pamphlet as an entry on the Introduction shelf.
 *
 * `clauses` carries every line so the index's search reaches the prose
 * (the written shelves' bargain, `entryMatches`), but the card itself is drawn
 * by `renderPamphletBody` — the same pager, pages and all — which is what the
 * `pamphlet` flag tells `entryNode`.
 */
export function pamphletEntry(): CompendiumEntry {
  return {
    id: PAMPHLET_ENTRY_ID,
    section: 'intro',
    name: 'The Pamphlet',
    eyebrow: 'the five-minute flip',
    mark: { kind: 'glyph', glyph: '❦' },
    rows: [],
    clauses: PAMPHLET_PAGES.flatMap((page) => page.lines.map((text) => ({ text }))),
    flavor: null,
    written: true,
    pamphlet: true,
  };
}

// --- the pager, pure half ----------------------------------------------------

/**
 * Where next/back lands: clamped, never wrapping. Wrapping is for carousels
 * nobody is reading; a pamphlet has a first page and a last one, and the
 * disabled button at each end is what tells the reader so.
 */
export function pageStep(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, index + delta));
}

// --- the printer -------------------------------------------------------------

/**
 * The pamphlet as a pager, into `root`. The one printer, called by both
 * mounts: pages (hero, heading, the caption-weight lines), then the nav row —
 * back, one dot per page, next. Which page is showing is DOM state here and
 * nowhere else; nothing about it is remembered.
 *
 * A hero is an `<img>` in an ink frame. The files are captured after the fact
 * (see the module docblock), so the error path is a designed state rather
 * than a failure: the image removes itself and the frame shows the caption —
 * never the platform's broken-image glyph.
 */
export function renderPamphletBody(root: HTMLElement): void {
  const doc = root.ownerDocument;
  const pager = doc.createElement('div');
  pager.className = 'pamphlet-pager';

  const sheets: HTMLElement[] = [];
  for (const page of PAMPHLET_PAGES) {
    const box = doc.createElement('section');
    box.className = 'pamphlet-page';
    box.hidden = true;
    if (page.panel !== undefined) {
      const frame = doc.createElement('figure');
      frame.className = 'pamphlet-figure';
      const img = doc.createElement('img');
      img.src = page.panel.image;
      img.alt = '';
      // The designed degradation: no file, no picture, no broken-image glyph —
      // the frame shows the caption saying what the shot will hold.
      img.addEventListener('error', () => {
        frame.classList.add('is-missing');
        img.remove();
      });
      frame.append(img);
      const caption = doc.createElement('figcaption');
      caption.className = 'pamphlet-caption';
      caption.textContent = page.panel.caption;
      frame.append(caption);
      box.append(frame);
    }
    const head = doc.createElement('h3');
    head.className = 'pamphlet-page-title';
    head.textContent = page.title;
    box.append(head);
    for (const text of page.lines) {
      const line = doc.createElement('p');
      line.className = 'pamphlet-line';
      // The descriptor printer, not `textContent`: a line may name a thing the
      // book has a page about, and the mark has to come out as a bold link
      // rather than as brackets (`keywords.ts`' sweep holds every surface to it).
      setDescriptorText(line, text);
      box.append(line);
    }
    pager.append(box);
    sheets.push(box);
  }

  const nav = doc.createElement('div');
  nav.className = 'pamphlet-nav';
  const back = doc.createElement('button');
  back.type = 'button';
  back.className = 'btn btn-quiet pamphlet-back';
  back.textContent = '‹ Back';
  const dots = doc.createElement('div');
  dots.className = 'pamphlet-dots';
  const dotButtons: HTMLButtonElement[] = [];
  for (const [index, page] of PAMPHLET_PAGES.entries()) {
    const dot = doc.createElement('button');
    dot.type = 'button';
    dot.className = 'pamphlet-dot';
    dot.setAttribute('aria-label', `Page ${index + 1}: ${page.title}`);
    dot.addEventListener('click', () => show(index));
    dots.append(dot);
    dotButtons.push(dot);
  }
  const next = doc.createElement('button');
  next.type = 'button';
  next.className = 'btn btn-quiet pamphlet-next';
  next.textContent = 'Next ›';
  nav.append(back, dots, next);
  pager.append(nav);

  let current = 0;
  function show(index: number): void {
    current = pageStep(index, 0, sheets.length);
    for (const [at, sheet] of sheets.entries()) sheet.hidden = at !== current;
    for (const [at, dot] of dotButtons.entries()) {
      dot.classList.toggle('is-current', at === current);
    }
    back.disabled = current === 0;
    next.disabled = current === sheets.length - 1;
    // A flipped page starts at its top — the previous one may have scrolled.
    pager.scrollTop = 0;
  }
  back.addEventListener('click', () => show(pageStep(current, -1, sheets.length)));
  next.addEventListener('click', () => show(pageStep(current, 1, sheets.length)));
  show(0);

  root.append(pager);
}

// --- the memory --------------------------------------------------------------

/** The one key this module owns. Versioned, so a shape change starts fresh. */
export const PAMPHLET_KEY = 'magisterludi:pamphlet:v1';

/**
 * Whether this browser has read the pamphlet. The tutorial memory's tolerance,
 * one step earlier: a throwing shelf, a missing key and nonsense all read as
 * "never seen", because the worst a broken shelf can cost is one extra showing.
 */
export function readPamphletSeen(storage: TutorialStorage): boolean {
  let raw: string | null = null;
  try {
    raw = storage.getItem(PAMPHLET_KEY);
  } catch {
    return false;
  }
  if (raw === null) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>).seen === true
      : false;
  } catch {
    return false;
  }
}

/** Marks it read. A store that will not take it shows the pamphlet once more. */
export function writePamphletSeen(storage: TutorialStorage): void {
  try {
    storage.setItem(PAMPHLET_KEY, JSON.stringify({ seen: true }));
  } catch {
    // A private window, a blocked origin, a full shelf — the next visit reads
    // "never seen" and the pamphlet shows again, which costs one dismissal.
  }
}

/**
 * The first-run decision, pure so the test can hold it still: a new player with
 * the guide on gets the pamphlet; a returning player sees neither it nor the
 * tutorial's opening again; a player who switched the guide off has said they
 * want to be told nothing, and that answer covers the front matter too.
 */
export function shouldShowPamphlet(seen: boolean, tutorialEnabled: boolean): boolean {
  return tutorialEnabled && !seen;
}

// --- the first-run overlay ---------------------------------------------------

export interface PamphletOverlayOptions {
  /** Where the memory lives — the same shelf the tutorial's uses. */
  storage: TutorialStorage;
  /** Where the overlay mounts — `document.body`. */
  root: HTMLElement;
}

export interface PamphletOverlay {
  /** Whether this browser has already read it. */
  seen(): boolean;
  /**
   * Shows the pamphlet; `onDone` runs when it is put away, after the memory is
   * written — which is the seam `main.ts` hangs the tutorial's first step on.
   */
  show(onDone: () => void): void;
}

/**
 * The pamphlet as a first-run screen: the pager on one parchment sheet over a
 * dimmed board, dismissed by its own button or by Escape — both mark it read
 * and both start whatever comes next. Built once, on the first `show`, because
 * for every browser but a brand-new player's it is never shown at all.
 */
export function createPamphletOverlay(options: PamphletOverlayOptions): PamphletOverlay {
  const { storage, root } = options;
  const doc = root.ownerDocument;
  let overlay: HTMLElement | null = null;
  let done: (() => void) | null = null;

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    // Captured and stopped: nothing under this sheet has been introduced yet,
    // and the keystroke that puts the pamphlet away must not also back out a
    // selection or a screen the player has never seen.
    event.preventDefault();
    event.stopPropagation();
    dismiss();
  };

  function build(): HTMLElement {
    const sheet = doc.createElement('div');
    sheet.className = 'pamphlet-overlay';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'The Pamphlet');
    sheet.hidden = true;

    const card = doc.createElement('div');
    card.className = 'pamphlet-sheet';

    const eyebrow = doc.createElement('p');
    eyebrow.className = 'eyebrow pamphlet-eyebrow';
    eyebrow.textContent = 'before your first turn';
    card.append(eyebrow);

    const title = doc.createElement('h2');
    title.className = 'pamphlet-title';
    title.textContent = 'The Pamphlet';
    card.append(title);

    const lede = doc.createElement('p');
    lede.className = 'pamphlet-lede';
    lede.textContent = 'A few pages, once — everything a first game needs, and nothing more.';
    card.append(lede);

    const body = doc.createElement('div');
    body.className = 'pamphlet-body';
    renderPamphletBody(body);
    card.append(body);

    const foot = doc.createElement('div');
    foot.className = 'pamphlet-foot';
    const note = doc.createElement('p');
    note.className = 'pamphlet-note';
    note.textContent =
      'Put it away freely — this whole pamphlet stays in the Compendium, on the Introduction shelf, behind the book button at the top of the screen.';
    foot.append(note);
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary pamphlet-begin';
    button.textContent = 'Begin';
    button.addEventListener('click', dismiss);
    foot.append(button);
    card.append(foot);

    sheet.append(card);
    root.append(sheet);
    return sheet;
  }

  function dismiss(): void {
    writePamphletSeen(storage);
    if (overlay !== null) overlay.hidden = true;
    doc.defaultView?.removeEventListener('keydown', onKey, true);
    const next = done;
    done = null;
    next?.();
  }

  return {
    seen: () => readPamphletSeen(storage),
    show(onDone) {
      done = onDone;
      overlay ??= build();
      overlay.hidden = false;
      overlay.scrollTop = 0;
      doc.defaultView?.addEventListener('keydown', onKey, true);
    },
  };
}

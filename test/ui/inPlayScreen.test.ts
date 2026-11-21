/**
 * **The In play screen's wiring** (stage 3 of the Council and In play board):
 * the sheet's frame, its doors and its key, the arrival, the flair cabinet,
 * and the words. Read off the sources: this suite has no DOM. The pieces and
 * their figures are `inPlayPieces.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { BREAKDOWN_WORDS, IN_PLAY_WORDS, VOICE_WORDS } from '../../src/ui/inPlayPieces';
import { braceBody, uiSource } from './sourceHelpers';

const SCREEN = uiSource('inPlayScreen.ts');
const FORMS = uiSource('inPlayForms.ts');
const MAIN = uiSource('main.ts');
const HTML = uiSource('index.html');
const COUNCIL = uiSource('statecraftScreen.ts');

describe('the sheet', () => {
  it('builds on the shared frame and goes with the boot', () => {
    expect(SCREEN).toContain('const shell = createModalShell({');
    expect(MAIN).toContain('gameDisposers.push(() => inPlay?.dispose());');
    expect(MAIN).toContain("onOpen: () => screens.opening('inPlay'),");
    // It wears the parchment sheets' class, so the board rests under it.
    const overlay = HTML.slice(HTML.indexOf('id="inplay-overlay"') - 20, HTML.indexOf('id="inplay-body"'));
    expect(overlay).toContain('class="statecraft-overlay"');
    expect(overlay).toContain('id="inplay-close"');
  });

  it('reads its figures on an open and on a change of state, never on a frame', () => {
    expect(SCREEN).not.toContain('requestAnimationFrame');
    expect(braceBody(SCREEN, 'function draw(): void')).toContain('reading = beginInPlayReading(state, seat, layout);');
    // The pieces are read in short turns after the first paint.
    expect(braceBody(SCREEN, 'function readOn(')).toContain('continueInPlayReading(state, seat, READ_SLICE_MS)');
  });

  it('closes the sheet of sources, then the tray, then the screen on Esc; C goes to the Council and I closes', () => {
    const keys = braceBody(SCREEN, 'function onKey(event: KeyboardEvent): boolean');
    expect(keys.indexOf('openVoice !== null')).toBeLessThan(keys.indexOf('openStack !== null'));
    expect(keys).toContain("event.key === 'c' || event.key === 'C'");
    expect(keys).toContain("event.key === 'i' || event.key === 'I'");
  });

  it('sends a piece to the screen that owns it, through that screen’s own door', () => {
    const follow = braceBody(SCREEN, 'function follow(entry: InPlayEntry): void');
    for (const door of ['openCouncil', 'openCity', 'openFaith', 'openReliquary', 'openLeader']) expect(follow).toContain(`options.${door}(`);
    const wiring = between(MAIN, 'inPlay = createInPlayScreen({', 'gameDisposers.push(() => inPlay?.dispose());');
    expect(wiring).toContain('statecraft?.openAt(card)');
    expect(wiring).toContain('controls.setOpenCity(cityId)');
    expect(wiring).toContain('religion?.openRitesFor(cityId)');
    expect(wiring).toContain('reliquary?.showPerson(person)');
    expect(wiring).toContain('leaderSheet?.open()');
  });
});

describe('the doors', () => {
  it('opens on I from the map, swept with the boot, and on the corner panel’s fifth mark', () => {
    expect(MAIN).toContain("case 'i': inPlay?.open();");
    expect(MAIN).toContain('inPlay: () => inPlay?.open(),');
    // The help card names the key.
    expect(HTML).toContain('<kbd>I</kbd> In play');
  });

  it('has a link in the Council screen’s head with the count, and the Council claims I to come here', () => {
    expect(COUNCIL).toContain('inPlayLink: (count: number) => `In play · ${count} →`');
    expect(COUNCIL).toContain("head?.querySelector('.statecraft-head-titles')?.after(inPlayLink)");
    const keys = braceBody(COUNCIL, 'function onKey(event: KeyboardEvent): boolean');
    expect(keys).toContain('options.inPlay.open();');
    expect(MAIN).toContain('count: () => inPlayDoorCount(game.state, controls.localPlayerId()),');
  });
});

describe('the arrival', () => {
  it('learns the arrivals on every render of the corner panel, and empties them with the news', () => {
    const glance = between(MAIN, '    inPlay: () => {', '    },\n    // A greyed door');
    expect(glance).toContain('inPlayArrivals.note(seat, layout);');
    expect(glance).toContain('fresh: inPlayFlights === 0 && inPlayArrivals.fresh(seat).size > 0,');
    expect(braceBody(MAIN, 'function clearBeadNews(): void')).toContain('inPlayArrivals.reset();');
  });

  it('flies a chosen belief to the door, and with less motion changes the count and the dot at once', () => {
    expect(MAIN).toContain("if (result.ok && pool !== 'follower') flyToInPlay(seat, `belief:${taken}`, from);");
    expect(braceBody(MAIN, 'function flyToInPlay(')).toContain('wantsMotion()');
    const fly = braceBody(FORMS, 'export function flyToDoor(');
    expect(fly).toContain('if (!motion || to === null || to.width === 0) {');
  });

  it('shows the arrivals on top with the glow until the screen closes', () => {
    expect(braceBody(SCREEN, 'function drawStack(stack: InPlayStack): HTMLElement')).toContain('arrivalsOnTop(stack.entries, fresh)');
    const close = between(SCREEN, 'onClose: () => {', 'onDispose: () => {');
    expect(close).toContain('options.arrivals.seen(options.getPlayerId());');
    expect(close).toContain('options.onSeen?.();');
  });
});

describe('the forms', () => {
  it('takes a wonder’s picture from one function, so a painted picture needs no other change', () => {
    expect([...FORMS.matchAll(/wonderPicture\(/g)]).toHaveLength(2);
    expect(between(FORMS, 'export function wonderPlateNode(', 'export function beliefTabletNode(')).toContain('wonderWindowNode(');
    expect(braceBody(FORMS, 'export function wonderWindowNode(id: BuildingId, className = \'ip-window\'): HTMLElement')).toContain('wonderPicture(id)');
  });

  it('shows a belief’s picture in the window its Faith tablet and its offer card show', () => {
    // The user, 2026-11-21: the belief art "should also show in the 'in play'
    // tab". The tablet asks the one window (`beliefWindowNode`), and the ring
    // it wore before is gone from it.
    const tablet = between(FORMS, 'export function beliefTabletNode(', 'export function legacyMedalNode(');
    expect(tablet).toContain('beliefWindowNode(');
    expect(tablet).not.toContain("'ip-ring'");
    // The window is sized by the In play stylesheet and wears the piece's ink.
    const css = uiSource('inPlayScreen.css');
    expect(css).toContain('.ip-belief > .faith-window {');
    expect(braceBody(css, '.ip-belief > .faith-window {')).toContain('border-color: var(--k);');
  });

  it('joins the flair cabinet', () => {
    const cabinet = uiSource('main.ts');
    expect(cabinet).toBeDefined();
    const flair = import.meta.glob('../../src/flairGallery/main.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
    const text = Object.values(flair)[0]!;
    expect(text).toContain('drawInPlayForms(');
  });
});

describe('every figure at its one size (the user’s comments on stage 3)', () => {
  const CSS = Object.values(
    import.meta.glob('../../src/ui/inPlayScreen.css', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
  )[0]!;

  it('lets an edge grow taller, and never shrinks or cuts a figure', () => {
    const edge = CSS.slice(CSS.indexOf('\n.ip-edge {'), CSS.indexOf('}', CSS.indexOf('\n.ip-edge {')));
    expect(edge).toContain('min-height: 46px;');
    expect(edge).not.toMatch(/\n\s+height:/);
    expect(CSS).not.toContain('data-figures');
    expect(FORMS).not.toContain('dataset.figures');
    // The figures wrap between whole figures: each figure is one unbroken box.
    expect(CSS).toMatch(/\.ip-edge-foot \{[^}]*flex-wrap: wrap;/);
    expect(CSS).toMatch(/\.ip-foot \{[^}]*flex-wrap: wrap;/);
  });

  it('gives every stack head the tallest one’s height, so the piles start on one line', () => {
    expect(CSS).toMatch(/\.ip-stacks \{[^}]*display: grid;/);
    expect(CSS).toMatch(/\.ip-stack \{[^}]*grid-template-rows: subgrid;/);
    // A tall stack scrolls with the cloth rather than run off the window.
    expect(CSS).toMatch(/\.ip-cloth \{[^}]*overflow: hidden auto;/);
  });

  it('closes with the star chart’s ×, as the Council screen does', () => {
    expect(HTML).toContain('<button id="inplay-close" class="tech-close" type="button" aria-label="Close" title="Close (Esc)">');
    expect(SCREEN).not.toContain('council-close');
  });
});

describe('the wonder plate (frame A1)', () => {
  const PLATE = uiSource('wonderPlate.ts');
  const CONTROLS = uiSource('controls.ts');

  it('is news in the pump, last of the pages, held by the sweep, the blocks and the guide', () => {
    expect(braceBody(MAIN, 'function clearBeadNews(): void')).toContain('pendingWonders = [];');
    expect(braceBody(MAIN, 'function clearBeadNews(): void')).toContain('wonderPlate?.clear();');
    expect(braceBody(MAIN, 'function newsBlocked(): boolean')).toContain('(wonderPlate?.isOpen ?? false)');
    const pump = braceBody(MAIN, 'function pumpBeadNews(): void');
    expect(pump.indexOf('pendingCensus')).toBeLessThan(pump.indexOf('pendingWonders'));
    expect(pump).toContain('wonderPlate.show(reading);');
    expect(MAIN).toContain('pendingWonders.length > 0 ||');
    expect(MAIN).toContain("name: 'wonderPlate',\n  kind: 'news',");
  });

  it('is raised for the seat’s own wonder only, which then gets no toast; another seat’s keeps its toast', () => {
    const report = braceBody(CONTROLS, 'function reportWonders(result: CommandResult): void');
    expect(report).toContain('const own = done.playerId === localPlayerId;');
    expect(report).toContain('if (own) onWonderArrived?.(done, plated.find(([wonder]) => wonder === done)?.[1] ?? null);');
    expect(report).toContain("...(own ? { mark: 'wonder' as const } : {})");
    expect(MAIN).toContain("entry.mark !== 'age' && entry.mark !== 'wonder'");
  });

  it('flies the wonder to the door when it closes, and holds the door’s count until it lands', () => {
    const arrived = between(MAIN, 'onWonderArrived: (done, triumph) => {', 'pumpBeadNews();');
    expect(arrived).toContain('inPlayFlights += 1;');
    const land = braceBody(MAIN, 'function landWonder(reading: WonderPlateReading, from: DOMRect | null): void');
    expect(land).toContain('wantsMotion()');
    expect(land).toContain('inPlayFlights = Math.max(0, inPlayFlights - 1);');
    expect(PLATE).toContain("wonderWindowNode(reading.building, 'wonder-plate-window')");
  });

  it('shows the picture at exactly 16:9 on the plate and as a 2:1 band on the piece (docs/splash-art.md, row 3)', () => {
    const plateCss = Object.values(
      import.meta.glob('../../src/ui/wonderPlate.css', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    )[0]!;
    const pieceCss = Object.values(
      import.meta.glob('../../src/ui/inPlayScreen.css', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    )[0]!;
    expect(plateCss).toMatch(/\.wonder-plate-window \{[^}]*aspect-ratio: 16 \/ 9;/);
    expect(pieceCss).toMatch(/\.ip-window \{[^}]*aspect-ratio: 2 \/ 1;/);
    expect(pieceCss).not.toMatch(/\.ip-window \{[^}]*\n  height:/);
    // A painting covers either window from its centre.
    expect(pieceCss).toMatch(/\.wonder-plate-window\[data-picture='painted'\] \{[^}]*background-size: cover;[^}]*\}/);
    expect(pieceCss).toContain('background-position: center;');
  });

  it('says no number inside its sentence', () => {
    expect(PLATE).toContain('finished: (town: string) => `Finished in ${town}.`');
    expect(PLATE).toContain("turn: 'turn',");
    // The Triumph's line in the Triumph and census sheets' words: the renown is a figure.
    expect(PLATE).toContain('triumph: (name: string) => `Triumph · ${name}`,');
    expect(PLATE).toContain("renown: 'renown',");
  });

  // The user, 2026-11-19: "put the renown line on the plate, no second page".
  it('carries the wonder’s Triumph as its renown line, and that Triumph raises no page of its own', () => {
    // The plate draws the line: the laurel, the name, the figure and the word.
    const page = braceBody(PLATE, 'export function wonderPlatePage(reading: WonderPlateReading, go: () => void): HTMLElement');
    expect(page).toContain('renownMarkNode()');
    expect(page).toContain('signedFigure(reading.triumph.pays)');
    // Only the awards paired with the seat’s own wonders skip the Triumph page;
    // the chronicle line is written before the skip, and every other award keeps its page.
    const triumphs = braceBody(CONTROLS, 'function reportTriumphs(result: CommandResult): void');
    expect(triumphs).toContain('wonderTriumphPairs(result, localPlayerId)');
    expect(triumphs.indexOf('announce(')).toBeLessThan(triumphs.indexOf('if (plated.has(triumph)) continue;'));
    expect(triumphs).toContain('mine.push(triumph);');
    // The pump hands the award to the plate, and a plate that cannot be shown
    // gives its Triumph the page it would have had.
    const pump = braceBody(MAIN, 'function pumpBeadNews(): void');
    expect(pump).toContain('next.triumph)');
    expect(pump).toContain('raiseTriumphSheet([next.triumph]);');
    expect(MAIN).toContain('onTriumphs: (awards) => raiseTriumphSheet(awards),');
  });
});

describe('the words', () => {
  it('says no number inside a sentence (rule 7)', () => {
    const strings = (values: readonly unknown[]): string[] =>
      values.flatMap((value) => (typeof value === 'string' ? [value] : []));
    const sentences = [
      ...strings(Object.values(IN_PLAY_WORDS)),
      ...strings(Object.values(IN_PLAY_WORDS.stacks)),
      ...strings(Object.values(BREAKDOWN_WORDS)),
      ...strings(Object.values(BREAKDOWN_WORDS.ledgerClass)),
      ...strings(Object.values(BREAKDOWN_WORDS.favouring)),
    ];
    for (const sentence of sentences) expect(sentence, sentence).not.toMatch(/\d/);
  });

  it('names renown as the meters are named, and keeps the Ledger link to the six yields (stage 7)', () => {
    expect(VOICE_WORDS.renown).toBe('renown');
    expect(SCREEN).toContain("breakdown.voice !== 'happiness' && breakdown.voice !== 'authority' && breakdown.voice !== 'renown'");
    // A section whose rows are another cut of the figure says so once, under its heading.
    expect(SCREEN).toContain("if (section.note !== undefined) part.append(element('p', 'ip-bd-alone', section.note));");
  });

  it('calls the fifth stack Temporary, as the user renamed it', () => {
    expect(IN_PLAY_WORDS.stacks.temporary).toBe('Temporary');
    expect(JSON.stringify(IN_PLAY_WORDS)).not.toMatch(/running out/i);
  });
});

/** The text between two markers, the first marker included. */
function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  if (start < 0) throw new Error(`marker not found: ${from}`);
  return source.slice(start, source.indexOf(to, start));
}

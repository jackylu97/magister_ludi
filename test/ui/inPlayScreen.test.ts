/**
 * **The In play screen's wiring** (stage 3 of the Council and In play board):
 * the sheet's frame, its doors and its key, the arrival, the flair cabinet,
 * and the words. Read off the sources: this suite has no DOM. The pieces and
 * their figures are `inPlayPieces.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { BREAKDOWN_WORDS, IN_PLAY_WORDS } from '../../src/ui/inPlayPieces';
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
    const key = braceBody(MAIN, 'const onInPlayKey = (event: KeyboardEvent): void =>');
    expect(key).toContain("if (event.key !== 'i' && event.key !== 'I') return;");
    expect(key).toContain('if (isInputBlocked()) return;');
    expect(MAIN).toContain("gameDisposers.push(() => window.removeEventListener('keydown', onInPlayKey));");
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
    expect(between(FORMS, 'export function wonderPlateNode(', 'export function beliefTabletNode(')).toContain('wonderPicture(');
  });

  it('joins the flair cabinet', () => {
    const cabinet = uiSource('main.ts');
    expect(cabinet).toBeDefined();
    const flair = import.meta.glob('../../src/flairGallery/main.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
    const text = Object.values(flair)[0]!;
    expect(text).toContain('drawInPlayForms(');
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
    ];
    for (const sentence of sentences) expect(sentence, sentence).not.toMatch(/\d/);
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

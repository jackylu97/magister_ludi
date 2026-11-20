/**
 * **The age plate** (batch SS7, `src/ui/agePlate.ts`): the page raised when the
 * world's age turns over, and once as a new game's opening plate for age I.
 *
 * No jsdom in this suite, so the plate's words, deeds and painting are a pure
 * reading, and the wiring is pinned by reading the source: the plate is news,
 * it is queued in front of the wager sheet, it replaces the age toast, it is
 * torn down by both sweeps, it stands on the ribbon it shares with the painted
 * wonder, it falls back to the lapis page, and the opening plate is queued for
 * a new game and never for a load.
 */

import { describe, expect, it } from 'vitest';

import { RULES } from '../../src/sim/rulesData';
import { bumpRevision, citiesOf } from '../../src/sim/state';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { agePaintingSet, agePaintingUrl } from '../../src/ui/agePaintings';
import { AGE_NAMES } from '../../src/ui/figures';
import { ageLineWords, agePlateLine, agePlateReading, firstTechOfAge } from '../../src/ui/agePlate';
import { found, game } from '../sim/statecraftHelpers';
import { between, braceBody, uiSource } from './sourceHelpers';

/** The plate's own stylesheet, which the shared source glob does not cover. */
const PLATE_CSS = import.meta.glob('../../src/ui/agePlate.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function bench() {
  const { state } = game();
  found(state, 0);
  bumpRevision(state);
  return state;
}

describe('the age plate, as data', () => {
  it('prints the numeral, the age by name, and the line from the age that closes to the one that opens', () => {
    const state = bench();
    const plate = agePlateReading(state, 0, 3);
    expect(plate.numeral).toBe('III');
    expect(plate.name).toBe(`The Age of ${AGE_NAMES[3]}`);
    expect(plate.line).toBe(`The Age of ${AGE_NAMES[2]} closes. The Age of ${AGE_NAMES[3]} opens.`);
  });

  it('promises the wager only when the state holds a deal for that age', () => {
    const state = bench();
    expect(agePlateLine(state, 3)).not.toContain('wager');
    state.wagers.push({ age: 3, dealt: [], dealtOn: state.turn, opening: [], claims: [] } as never);
    expect(agePlateLine(state, 3)).toBe(
      `The Age of ${AGE_NAMES[2]} closes. The Age of ${AGE_NAMES[3]} opens, and its wager is dealt.`,
    );
  });

  it('reads every deed off the reading seat, and puts no figure inside a sentence', () => {
    const state = bench();
    const player = state.players[0]!;
    player.enemiesKilled = 9;
    player.unitsLost = 4;
    const plate = agePlateReading(state, 0, 2);
    const byLabel = new Map(plate.deeds.map((deed) => [deed.label, deed]));
    expect(byLabel.get('towns')?.value).toBe(String(citiesOf(state, 0).length));
    expect(byLabel.get('won · lost')?.value).toBe('9 · 4');
    expect(byLabel.get('orders')?.value).toBe(String(player.statecraft.orders.length));
    // A seat with no god yet shows no god deed rather than a blank one.
    expect(byLabel.has('god named')).toBe(player.pantheon.beliefs.length > 0);
    // Each deed is drawn with a deck's emblem on the lapis page.
    expect(plate.deeds.map((deed) => deed.mark)).toContain('dominion');
    // Hard rule 7: the line is words only.
    expect(plate.line).not.toMatch(/\d/);
  });

  it('names the first technology the seat learned of the closing age, never one it was given', () => {
    const given = RULES.research.startingTechs;
    const ofAgeOne = TECH_IDS.filter((id) => techDef(id).age === 1 && !given.includes(id));
    const [first, second] = ofAgeOne;
    expect(first).toBeDefined();
    // The order is the order learned, so the second one learned first wins.
    expect(firstTechOfAge([...given, second!, first!], 1)).toBe(techDef(second!).name);
    // Only the starting technologies: nothing was learned, so there is no deed.
    expect(firstTechOfAge([...given], 1)).toBeNull();
  });

  it('shows the painting of the game’s set for that age, picked from the seed', () => {
    const state = bench();
    for (const seed of [0, 7, 42]) {
      for (const age of [1, 2, 3, 4]) {
        expect(agePlateReading(state, 0, age, seed).painting).toBe(agePaintingUrl(agePaintingSet(seed), age));
      }
    }
    // One set for the whole game: every age of one seed names the same set.
    const set = agePaintingSet(42);
    const shown = [1, 2, 3, 4].map((age) => agePlateReading(state, 0, age, 42).painting);
    for (const url of shown) expect(url?.startsWith(`/art/splash/ages/${set}`)).toBe(true);
  });

  it('falls back to the lapis page when there is no seed to pick a painting with', () => {
    const state = bench();
    expect(agePlateReading(state, 0, 2).painting).toBeNull();
    expect(agePlateReading(state, 0, 2, null).painting).toBeNull();
  });

  it('opens the game with age I: its name, no closing clause, no wager and no deeds', () => {
    const state = bench();
    const plate = agePlateReading(state, 0, 1, 42);
    expect(plate.numeral).toBe('I');
    expect(plate.name).toBe(`The Age of ${AGE_NAMES[1]}`);
    expect(plate.line).toBe(`The Age of ${AGE_NAMES[1]} opens.`);
    // Age I closes nothing, so a fresh seat has no run to tally.
    expect(plate.deeds).toEqual([]);
    expect(plate.painting).toBe(agePaintingUrl(agePaintingSet(42), 1));
  });

  it('words the line from the age and the deal alone', () => {
    expect(ageLineWords(1, false)).toBe(`The Age of ${AGE_NAMES[1]} opens.`);
    expect(ageLineWords(4, true)).toBe(
      `The Age of ${AGE_NAMES[3]} closes. The Age of ${AGE_NAMES[4]} opens, and its wager is dealt.`,
    );
    for (const age of [1, 2, 3, 4]) {
      expect(ageLineWords(age, true)).not.toMatch(/\d/);
      expect(ageLineWords(age, false)).not.toMatch(/\d/);
    }
  });
});

describe('the age plate, wired', () => {
  const main = uiSource('main.ts');
  const plate = uiSource('agePlate.ts');

  it('is news, queued in front of the wager sheet it announces', () => {
    const pump = main.slice(main.indexOf('function pumpBeadNews(): void {'));
    const plateAt = pump.indexOf('agePlate.show(agePlateReading(');
    const wagerAt = pump.indexOf('wagerSheet.open();');
    expect(plateAt).toBeGreaterThan(0);
    expect(plateAt).toBeLessThan(wagerAt);
    // The game's seed picks the set of paintings.
    expect(pump).toContain('agePlate.show(agePlateReading(game.state, controls.localPlayerId(), age, game.config.seed));');
    expect(main).toContain("onOpen: () => screens.opening('agePlate'),");
    // Its own close calls the pump back, so the wager sheet follows.
    const created = between(main, 'agePlate = createAgePlate({', 'gameDisposers.push(() => agePlate?.dispose());');
    expect(created).toContain('pumpBeadNews();');
    // Blocking the news behind it, as the bead sheet does.
    expect(main).toContain('(agePlate?.isOpen ?? false) ||');
    // The age opening raises both the plate and the wager sheet.
    const opened = main.slice(main.indexOf('onBeadAgeOpened: (age) => {'));
    expect(opened.slice(0, opened.indexOf('},'))).toContain('pendingAgePlate = age;');
  });

  it('replaces the age toast, and the chronicle keeps the line', () => {
    // The seat's own wonder has a page too (stage 4 of the Council and In play
    // board), so it is the second mark that raises no toast.
    expect(main).toContain("if (seatId === controls.localPlayerId() && entry.mark !== 'age' && entry.mark !== 'wonder') toasts?.show(entry);");
    // The log is still written for every entry.
    expect(main).toContain('notificationLog.push(seatId, entry);');
  });

  it('is torn down by both sweeps and unbinds what it binds', () => {
    expect(main).toContain('gameDisposers.push(() => agePlate?.dispose());');
    const suspend = main.slice(main.indexOf('suspendGame = () => {')).split('\n  };')[0]!;
    expect(suspend).toContain('agePlate?.clear();');
    const clear = main.slice(main.indexOf('function clearBeadNews(): void {')).split('\n}')[0]!;
    expect(clear).toContain('agePlate?.clear();');
    expect(plate).toContain("window.addEventListener('keydown', onKeyDown, true);");
    expect(plate).toContain("window.removeEventListener('keydown', onKeyDown, true);");
    expect(plate).toContain("overlay.removeEventListener('mousedown', onGround);");
  });

  it('closes on Continue, Enter and Escape, and starts the keyboard on Continue', () => {
    const keys = braceBody(plate, 'function onKeyDown(event: KeyboardEvent): void');
    expect(keys).toContain("if (event.key !== 'Escape' && event.key !== 'Enter') return;");
    expect(keys).toContain('close();');
    // Space is the focused button's own press.
    expect(braceBody(plate, 'function render(reading: AgePlateReading): void')).toContain(
      "overlay.querySelector<HTMLButtonElement>('.age-plate-continue')?.focus({ preventScroll: true });",
    );
    expect(braceBody(plate, 'function continueButton(go: () => void): HTMLButtonElement')).toContain(
      "button.addEventListener('click', go);",
    );
  });

  it('honours reduced motion with a fade in the same order', () => {
    const css = Object.values(PLATE_CSS)[0]!;
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.age-plate-deed');
    expect(reduced).toContain('age-plate-fade');
    expect(reduced).not.toContain('age-plate-seal');
  });

  it('falls back to a full-screen lapis page, as the Opus close is', () => {
    // The user, 2026-11-18: "can we make both of these full screen? I'm happy
    // to have it be a big moment". Since 2026-11-19 this is the page for a
    // plate without a painting.
    const css = Object.values(PLATE_CSS)[0]!;
    const rule = (selector: string): string => {
      const at = css.indexOf(`${selector} {`);
      return css.slice(at, css.indexOf('}', at));
    };
    expect(rule('.age-plate-overlay')).toContain('inset: 0;');
    expect(rule('.age-plate-overlay')).toContain('background: var(--plate-lapis);');
    expect(rule('.age-plate-overlay')).not.toContain('padding');
    expect(rule('.age-plate')).toContain('width: 100%;');
    expect(rule('.age-plate')).toContain('min-height: 100%;');
    expect(rule('.age-plate')).not.toContain('820px');
  });
});

describe('the age plate on the ribbon', () => {
  const plate = uiSource('agePlate.ts');
  const wonder = uiSource('wonderPlate.ts');
  const ribbon = uiSource('plateRibbon.ts');
  const ribbonCss = uiSource('plateRibbon.css');
  const ageCss = uiSource('agePlate.css');
  const wonderCss = uiSource('wonderPlate.css');

  it('shares the ribbon with the painted wonder: one builder and one set of rules', () => {
    // Both plates put their painting on the ribbon through the one builder.
    expect(braceBody(plate, 'function ribbonPage(')).toContain('placeOnRibbon(plate, inner, picture, words, close);');
    expect(braceBody(wonder, 'export function wonderPlatePage(')).toContain('placeOnRibbon(plate, inner, picture, words, close);');
    expect(braceBody(ribbon, 'export function placeOnRibbon(')).toContain('plate.append(plateRibbonNode());');
    // The ribbon's rules are written once, in the shared sheet: each starts a
    // line there and nowhere else.
    for (const rule of ['\n.plate-ribbon {', '\n.plate-ribbon-edge {', '\n.plate-ribbon-mark {', '\n.plate-caption {', '\n@keyframes plate-ribbon-draw']) {
      expect(ribbonCss, rule).toContain(rule);
      expect(ageCss, rule).not.toContain(rule);
      expect(wonderCss, rule).not.toContain(rule);
    }
    expect(wonderCss).not.toContain('wonder-plate-ribbon');
    expect(ribbonCss).toMatch(/\.age-plate-overlay:has\(\.plate-on-ribbon\) \{[^}]*background: rgba\(14, 12, 17, 0\.4\);/);
    expect(ribbonCss).toMatch(/\.plate-on-ribbon \.plate-painting \{[^}]*aspect-ratio: 16 \/ 9;/);
  });

  it('arrives slowly, and shows at once with reduced motion', () => {
    expect(ribbonCss).toContain('animation: plate-ribbon-draw 760ms var(--plate-ease) 260ms both;');
    expect(ribbonCss).toContain('animation: plate-painting-rise 760ms var(--plate-ease) 780ms both;');
    expect(ribbonCss).toContain('animation: age-plate-fade 460ms ease-out 1380ms both;');
    const reduced = ribbonCss.slice(ribbonCss.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.plate-ribbon,', '.plate-ribbon-mark,', '.plate-on-ribbon .plate-painting,', '.plate-caption {']) {
      expect(reduced, selector).toContain(selector);
    }
    expect(reduced).toContain('animation: none;');
  });

  it('puts the numeral, the name and the line on the foot at the left, the deeds and Continue at the right', () => {
    const page = braceBody(plate, 'function ribbonPage(');
    expect(page).toContain('words.append(numeral, title);');
    expect(page).toContain("title.append(name, element('p', 'age-plate-line', reading.line));");
    expect(page).toContain("const tally = element('ul', 'age-plate-tally');");
    expect(page).toContain('close.append(continueButton(go));');
    // The deeds wrap to at most two rows and a third is hidden, so only the
    // first deeds that fit show, and the foot stays inside the lower third.
    expect(ageCss).toMatch(/\.age-plate-tally \{[^}]*flex-wrap: wrap;[^}]*max-height: calc\([^}]*\* 2 \+ 8px\);[^}]*overflow: hidden;/);
  });

  it('has a sample in the Flair Cabinet, drawn by the game’s own page builder', () => {
    const flair = Object.values(
      import.meta.glob('../../src/flairGallery/{main,agePlate}.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
    ).join('\n');
    expect(flair).toContain('drawAgePlate(');
    expect(flair).toContain('agePlatePage(reading,');
    expect(flair).toContain('AGE_PAINTING_SETS');
  });

  it('falls back to the lapis page when the painting is missing or does not load', () => {
    // No painting: the lapis page.
    const page = braceBody(plate, 'export function agePlatePage(');
    expect(page).toContain('if (reading.painting === null) return lapisPage(reading, go);');
    expect(page).toContain('return ribbonPage(reading, reading.painting, go, unpainted');
    // A painting that does not load: the same plate drawn again with no painting.
    expect(braceBody(plate, 'function ribbonPage(')).toContain("image.addEventListener('error', unpainted, { once: true });");
    expect(braceBody(plate, 'function render(reading: AgePlateReading): void')).toContain(
      'if (shown === reading && isOpen()) render({ ...reading, painting: null });',
    );
  });
});

describe('the opening plate', () => {
  const main = uiSource('main.ts');

  it('is queued for a new game, through the news queue the other plates use', () => {
    const open = braceBody(main, 'function openNewGame(): void');
    expect(open).toContain('pendingAgePlate = 1;');
    expect(open).toContain('afterOpeningPlate = beginOpening;');
    // The last game's guide stops, so no tutorial card stands over the plate.
    expect(open).toContain('tutorial.close();');
    // Both new-game sites, and nothing else, queue it.
    expect([...main.matchAll(/openNewGame\(\);/g)].length).toBe(2);
    expect(main).toMatch(/if \(initial === null\) openNewGame\(\);\s*else tutorial\.resume\(\);/);
    expect(main).toMatch(/if \(next === null\) openNewGame\(\);\s*else tutorial\.resume\(\);/);
    expect([...main.matchAll(/pendingAgePlate = 1;/g)].length).toBe(1);
  });

  it('is never queued for a load: a loaded game resumes the guide, and the sweep drops a queued opening', () => {
    // A loaded game takes the `else` arm of both sites above.
    const clear = braceBody(main, 'function clearBeadNews(): void');
    expect(clear).toContain('pendingAgePlate = null;');
    expect(clear).toContain('afterOpeningPlate = null;');
    // `adoptGame` sweeps the old game's news before it decides, so a load
    // started while an opening plate waits shows no plate.
    const adopt = braceBody(main, 'async function adoptGame(next: Game | null): Promise<void>');
    expect(adopt.indexOf('clearBeadNews();')).toBeGreaterThan(0);
    expect(adopt.indexOf('clearBeadNews();')).toBeLessThan(adopt.indexOf('if (next === null) openNewGame();'));
  });

  it('comes up once the landing is down, and its close begins the pamphlet and the tutorial', () => {
    // The landing holds all news, so `beginGame` asks the queue after it.
    const begin = braceBody(main, 'async function beginGame(');
    expect(begin.indexOf('pumpNews();')).toBeGreaterThan(begin.indexOf('hideLanding();'));
    expect(begin.indexOf('pumpNews();')).toBeGreaterThan(begin.indexOf('loading.finish();'));
    expect(main).toContain('pumpNews = pumpBeadNews;');
    expect(braceBody(main, 'function disposeGameScreens(): void')).toContain('pumpNews = () => {};');
    // The plate's close runs the held opening, then the queue.
    const created = between(main, 'agePlate = createAgePlate({', 'gameDisposers.push(() => agePlate?.dispose());');
    expect(created).toContain('const opening = afterOpeningPlate;');
    expect(created).toContain('afterOpeningPlate = null;');
    expect(created.indexOf('opening?.();')).toBeLessThan(created.lastIndexOf('pumpBeadNews();'));
    // While it waits or is up, a tutorial note waits behind it.
    const waits = between(main, 'tutorialWaits = () =>\n', ';\n');
    expect(waits).toContain('pendingAgePlate !== null ||');
    expect(waits).toContain('(agePlate?.isOpen ?? false) ||');
  });
});

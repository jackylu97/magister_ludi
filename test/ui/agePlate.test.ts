/**
 * **The age plate** (batch SS7, `src/ui/agePlate.ts`): the page raised when the
 * world's age turns over.
 *
 * No jsdom in this suite, so the plate's words and deeds are a pure reading,
 * and the wiring is pinned by reading the source: the plate is news, it is
 * queued in front of the wager sheet, it replaces the age toast, and it is torn
 * down by both sweeps.
 */

import { describe, expect, it } from 'vitest';

import { RULES } from '../../src/sim/rulesData';
import { bumpRevision, citiesOf } from '../../src/sim/state';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { AGE_NAMES } from '../../src/ui/figures';
import { agePlateLine, agePlateReading, firstTechOfAge } from '../../src/ui/agePlate';
import { found, game } from '../sim/statecraftHelpers';
import { uiSource } from './sourceHelpers';

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
    // Each deed is drawn with a deck's emblem.
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
    expect(main).toContain("onOpen: () => screens.opening('agePlate'),");
    expect(main).toContain('onClosed: () => pumpBeadNews(),');
    // Blocking the news behind it, as the bead sheet does.
    expect(main).toContain('(agePlate?.isOpen ?? false) ||');
    // The age opening raises both the plate and the wager sheet.
    const opened = main.slice(main.indexOf('onBeadAgeOpened: (age) => {'));
    expect(opened.slice(0, opened.indexOf('},'))).toContain('pendingAgePlate = age;');
  });

  it('replaces the age toast, and the chronicle keeps the line', () => {
    expect(main).toContain("if (seatId === controls.localPlayerId() && entry.mark !== 'age') toasts?.show(entry);");
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

  it('honours reduced motion with a fade in the same order', () => {
    const css = Object.values(PLATE_CSS)[0]!;
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.age-plate-deed');
    expect(reduced).toContain('age-plate-fade');
    expect(reduced).not.toContain('age-plate-seal');
  });
});

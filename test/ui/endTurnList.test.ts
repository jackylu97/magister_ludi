/**
 * End Turn's waiting list (batch UX4, `src/ui/endTurnList.ts`; the spec is
 * `docs/plans/hud-empire-panel-spec.md` §7).
 *
 * The label names the first item the turn is waiting on; the badge counts the
 * rest; hovering or focusing the button lists every item, each a button to
 * where it is answered. This suite has no DOM, so the rows and their words are
 * driven directly and the wiring is read from the sources:
 *
 *   1. **the rows**: grouping, words, the pause last, and the badge;
 *   2. **the words**: one table for the label and the list, short enough for the
 *      button's steady width;
 *   3. **the wiring**: `main.ts`, `controls.ts`, the markup and the stylesheet.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, createUnit } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import {
  END_TURN_LABELS,
  LIST_DELAY_MS,
  LIST_FOOT,
  LIST_HEADING,
  LIST_LEAVE_MS,
  PAUSE_LABELS,
  moreBadge,
  rowsFingerprint,
  waitingRows,
} from '../../src/ui/endTurnList';
import { type TurnBlocker, allBlockers } from '../../src/ui/turnBlockers';
import { newGame } from '../sim/newGameHelpers';

/** A one-seat state on a blank grass board, nothing on it. */
function flat(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [{ name: 'A', color: '#a00', isHuman: true }],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function plant(state: GameState, col: number, row: number): City {
  return foundCityAt(state, 0, getTileAt(state.map, col, row)!);
}

// --- 1 · the rows ------------------------------------------------------------------

describe('the rows', () => {
  it('are empty when nothing is waiting, and the badge says nothing', () => {
    const rows = waitingRows(flat(), [], null);
    expect(rows).toEqual([]);
    expect(moreBadge(rows)).toBeNull();
  });

  it('fold a run of idle units into one row with a count, going to the first', () => {
    const state = flat();
    const first = createUnit(state, 0, 'warrior', 3, 3);
    const second = createUnit(state, 0, 'scout', 4, 3);
    const blockers: TurnBlocker[] = [
      { kind: 'idleUnit', unitId: first.id },
      { kind: 'idleUnit', unitId: second.id },
    ];
    const rows = waitingRows(state, blockers, null);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.count).toBe(2);
    expect(rows[0]!.words).toBe('2 units need orders');
    expect(rows[0]!.item).toEqual({ kind: 'blocker', blocker: blockers[0] });
  });

  it('name a lone unit by its kind, and a lone town by its name', () => {
    const state = flat();
    const scout = createUnit(state, 0, 'scout', 3, 3);
    const town = plant(state, 6, 6);
    const rows = waitingRows(
      state,
      [
        { kind: 'idleUnit', unitId: scout.id },
        { kind: 'cityProduction', cityId: town.id },
      ],
      null,
    );
    expect(rows.map((row) => row.words)).toEqual([
      `${unitDef('scout').name} needs orders`,
      `Choose production in ${cityDisplayName(state, town)}`,
    ]);
  });

  it('count towns and carts the same way', () => {
    const state = flat();
    const one = plant(state, 4, 4);
    const two = plant(state, 9, 4);
    const rows = waitingRows(
      state,
      [
        { kind: 'idleTrader', unitId: 1 },
        { kind: 'idleTrader', unitId: 2 },
        { kind: 'cityProduction', cityId: one.id },
        { kind: 'cityProduction', cityId: two.id },
      ],
      null,
    );
    expect(rows.map((row) => [row.words, row.count])).toEqual([
      ['Send 2 idle traders', 2],
      ['2 towns need production', 2],
    ]);
  });

  it('say which Statecraft draft is waiting, and keep the label’s words for the rest', () => {
    const rows = waitingRows(
      flat(),
      [
        { kind: 'discovery' },
        { kind: 'statecraft', what: 'doctrine' },
        { kind: 'religion' },
        { kind: 'research' },
      ],
      null,
    );
    expect(rows.map((row) => row.words)).toEqual([
      END_TURN_LABELS.discovery,
      'A Doctrine awaits',
      END_TURN_LABELS.religion,
      END_TURN_LABELS.research,
    ]);
    expect(waitingRows(flat(), [{ kind: 'statecraft', what: 'order' }], null)[0]!.words).toBe(
      END_TURN_LABELS.statecraft,
    );
  });

  it('put the Statecraft pause last, after every blocker', () => {
    const rows = waitingRows(flat(), [{ kind: 'research' }], 'order');
    expect(rows.map((row) => row.item.kind)).toEqual(['blocker', 'pause']);
    expect(rows[1]!.words).toBe(PAUSE_LABELS.order);
    // A pause alone is a list of one: the label says it, the badge says nothing.
    const alone = waitingRows(flat(), [], 'government');
    expect(alone.map((row) => row.words)).toEqual([PAUSE_LABELS.government]);
    expect(moreBadge(alone)).toBeNull();
  });

  it('badge the rows after the first, which is what the label already names', () => {
    const rows = waitingRows(flat(), [{ kind: 'discovery' }, { kind: 'religion' }, { kind: 'research' }], null);
    expect(moreBadge(rows)).toBe('+2');
  });

  it('follow allBlockers on a real board, the label’s first item first', () => {
    const state = flat();
    state.players[0]!.researching = null;
    createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 0, 'warrior', 4, 3);
    plant(state, 8, 8);
    const rows = waitingRows(state, allBlockers(state, 0), null);
    expect(rows.map((row) => row.words)).toEqual([
      '2 units need orders',
      expect.stringMatching(/^Choose production in /),
      END_TURN_LABELS.research,
    ]);
    expect(moreBadge(rows)).toBe('+2');
  });

  it('fingerprint the words and the counts, so a repaint with nothing new rebuilds nothing', () => {
    const one = waitingRows(flat(), [{ kind: 'research' }], null);
    expect(rowsFingerprint(one)).toBe(rowsFingerprint(waitingRows(flat(), [{ kind: 'research' }], null)));
    expect(rowsFingerprint(one)).not.toBe(rowsFingerprint(waitingRows(flat(), [{ kind: 'research' }], 'order')));
  });
});

// --- 2 · the words -----------------------------------------------------------------

describe('the words', () => {
  it('have a label for every kind of blocker, and for both pauses', () => {
    const kinds: TurnBlocker['kind'][] = [
      'idleUnit',
      'idleTrader',
      'cityProduction',
      'research',
      'discovery',
      'statecraft',
      'religion',
      'greatPerson',
      'wager',
      'census',
    ];
    for (const kind of kinds) expect(END_TURN_LABELS[kind], kind).toBeTruthy();
    expect(PAUSE_LABELS.order).toBe('You have a new Order');
    expect(PAUSE_LABELS.government).toBe('A government awaits');
  });

  it('are never longer than the working label, so the steady width holds every one', () => {
    const working = 'The others are moving…';
    expect(uiSource('main.ts')).toContain(`const END_TURN_WORKING_LABEL = '${working}'`);
    for (const label of [...Object.values(END_TURN_LABELS), ...Object.values(PAUSE_LABELS), 'End Turn']) {
      expect(label.length, label).toBeLessThanOrEqual(working.length);
    }
  });

  it('head and foot the list plainly, with no figure in the prose', () => {
    expect(LIST_HEADING).toBe('Still to do this turn');
    expect(LIST_FOOT).not.toMatch(/\d/);
    expect(LIST_HEADING).not.toMatch(/\d/);
  });

  it('wait a beat before opening on hover, and a little longer before closing', () => {
    expect(LIST_DELAY_MS).toBe(150);
    expect(LIST_LEAVE_MS).toBe(300);
  });
});

// --- 3 · the wiring ----------------------------------------------------------------

describe('main.ts', () => {
  const main = uiSource('main.ts');

  it('reads the whole list once, and gives its first item to the label', () => {
    expect(main).toContain('const blockers = controls.endTurnBlockers();');
    expect(main).toContain(
      'showEndTurnState(blockers[0] ?? null, pause, waitingRows(game.state, blockers, pause));',
    );
    // The label still reads the one table, now shared with the list.
    const show = main.slice(main.indexOf('function showEndTurnState('));
    const body = show.slice(0, show.indexOf('\n}'));
    expect(body).toContain('END_TURN_LABELS[blocker.kind]');
    expect(body).toContain('PAUSE_LABELS[pause]');
    expect(body).toContain('endTurnList?.render(rows);');
    // And the working state takes the badge and the list down with it.
    expect(body.slice(body.indexOf('if (endTurnWorking) {'), body.indexOf('return;'))).toContain(
      'endTurnList?.render([]);',
    );
  });

  it('sends a row where a press would go, and repaints after it', () => {
    const at = main.indexOf('endTurnList = createEndTurnList({');
    expect(at).toBeGreaterThan(-1);
    const wiring = main.slice(at, main.indexOf('});', main.indexOf('onPick:', at)) + 3);
    expect(wiring).toContain("if (item.kind === 'pause') openStatecraftPause(item.pause);");
    expect(wiring).toContain('else controls.goToBlocker(item.blocker);');
    expect(wiring).toContain('updatePanel(null, renderer.getHover());');
    expect(main).toContain('gameDisposers.push(() => endTurnList?.dispose());');
  });

  it('opens the pause the same way from a press and from its row', () => {
    expect(main).toContain('onStatecraftPause: (kind) => openStatecraftPause(kind),');
    const opener = braceBody(main, 'function openStatecraftPause(');
    expect(opener).toContain("if (kind === 'government') showStatecraftOffer();");
    expect(opener).toContain('else statecraft?.open();');
  });

  it('no longer keeps the label tables of its own', () => {
    expect(main).not.toContain('const END_TURN_LABELS');
    expect(main).not.toContain('const PAUSE_LABELS');
  });
});

describe('controls.ts', () => {
  const controls = uiSource('controls.ts');

  it('lists what End Turn would stop on past the same skipped units, and goes to any of it', () => {
    expect(controls).toContain('return allBlockers(getGame().state, localPlayerId, { skippedUnitIds });');
    expect(controls).toContain('goToBlocker: focusBlocker,');
    // The label's reading is unchanged.
    expect(controls).toContain('return firstBlocker(getGame().state, localPlayerId, { skippedUnitIds });');
  });
});

describe('the markup', () => {
  const html = uiSource('index.html');
  const corner = html.slice(html.indexOf('<div id="hud-end-turn">'));
  const button = corner.slice(corner.indexOf('id="end-turn"'), corner.indexOf('</button>', corner.indexOf('id="end-turn"')));

  it('puts the badge inside End Turn, hidden from a screen reader, and describes the button by the list', () => {
    expect(button).toContain('aria-describedby="end-turn-list"');
    expect(button).toContain('id="end-turn-more"');
    expect(button).toContain('aria-hidden="true"');
  });

  it('puts the list after the button, so Tab walks from End Turn into its rows', () => {
    expect(corner.indexOf('id="end-turn-list"')).toBeGreaterThan(corner.indexOf('id="end-turn"'));
    const list = corner.slice(corner.indexOf('id="end-turn-list"'));
    expect(list.slice(0, list.indexOf('>'))).toContain('hidden');
  });
});

describe('the stylesheet', () => {
  const css = uiSource('style.css');
  const rule = (selector: string): string => {
    const at = css.indexOf(`\n${selector} {`);
    if (at < 0) throw new Error(`no rule for ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };

  it('gives End Turn one width whatever it says, so the Lens and the chronicle stay put', () => {
    expect(css).toContain('--end-turn-w: 264px;');
    const end = rule('.btn-end');
    expect(end).toContain('min-width: var(--end-turn-w);');
    expect(end).toContain('justify-content: center;');
    expect(end).toContain('white-space: nowrap;');
    expect(end).toContain('position: relative;');
  });

  it('pins the badge to the top-left corner, in vermilion', () => {
    const badge = rule('.end-turn-more');
    expect(badge).toContain('top: -10px;');
    expect(badge).toContain('left: -10px;');
    expect(badge).toContain('background: var(--vermilion);');
  });

  it('opens the list above End Turn, no wider than it, and above the offers button when that stands', () => {
    const list = rule('.end-turn-list');
    expect(list).toContain('right: 0;');
    expect(list).toContain('bottom: calc(100% + 12px);');
    expect(list).toContain('width: var(--end-turn-w);');
    expect(rule('body.has-diplomatic-offers .end-turn-list')).toContain(
      'bottom: calc(100% + 12px + 48px);',
    );
  });

  it('stacks the empire drawer above the toasts, so a toast cannot cover it', () => {
    const z = (selector: string): number => {
      const match = /z-index:\s*(\d+)/.exec(rule(selector));
      if (!match) throw new Error(`no z-index on ${selector}`);
      return Number(match[1]);
    };
    expect(z('.empire-drawer')).toBeGreaterThan(z('.toasts'));
    // And still under the bar.
    expect(z('.empire-drawer')).toBeLessThan(z('#topbar'));
  });
});

describe('the list’s own wiring', () => {
  const list = uiSource('endTurnList.ts');
  const code = list.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('binds every listener to one controller that dispose aborts', () => {
    const binds = [...code.matchAll(/addEventListener\(/g)].length;
    const signalled = [...code.matchAll(/\{ (capture: true, )?signal \},?\s*\)/g)].length;
    expect(binds).toBeGreaterThan(6);
    expect(signalled).toBe(binds);
    expect(braceBody(list, '    dispose(): void {')).toContain('listening.abort();');
  });

  it('opens on focus at once, and on hover after a beat, never for a finger', () => {
    expect(list).toContain("if (!returning && button.matches(':focus-visible')) show();");
    expect(list).toContain("event.pointerType === 'touch'");
    expect(list).toContain('}, LIST_DELAY_MS);');
  });

  it('closes on Escape inside it without dropping the selection, and hands the keyboard back', () => {
    const escape = list.slice(list.indexOf("if (event.key !== 'Escape') return;"));
    expect(escape.slice(0, 260)).toContain('event.stopPropagation();');
    // The keyboard goes back to End Turn without reopening the list it closed.
    expect(escape.slice(0, 260)).toContain(
      'returning = true;\n      button.focus({ preventScroll: true });\n      returning = false;',
    );
  });

  it('never opens while End Turn is working', () => {
    expect(braceBody(list, 'function show(')).toContain('button.disabled');
  });
});

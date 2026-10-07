/**
 * Smaller per-refresh costs (browser performance audit 2026-10-06, finding 12).
 *
 * `updatePanel` in `main.ts` refreshes the top bar, the star chart, the city
 * banners and the holdings rail after every selection, command and screen
 * change, often several times in a row with nothing in the state changed. Each
 * of them now either skips a repeat for the same state object, revision and
 * seat, or reads the town through the revision memo instead of folding it
 * again. The faith lens's hover card is moved without being measured again when
 * its content has not changed.
 *
 * Most of these are pinned by reading the source (the suite has no document);
 * the banner figures and the hover card are checked at runtime.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundCityAt, turnsToBuild } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { readCity } from '../../src/sim/readings';
import { type City, type GameState, bumpRevision, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { cityGrowthRing } from '../../src/ui/cityBanners';
import { createInfoCard } from '../../src/ui/infoCard';
import { braceBody, uiSource } from './sourceHelpers';

afterEach(() => vi.unstubAllGlobals());

function board(): { state: GameState; cities: City[] } {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 20, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 14).fill(null);
  state.units = [];
  const cities = [[0, 4, 4], [0, 12, 4], [1, 8, 10]].map(([owner, col, row]) =>
    foundCityAt(state, owner!, getTileAt(state.map, col!, row!)!));
  cities[0]!.population = 6;
  cities[0]!.buildings.push('granary');
  cities[0]!.queue = [{ kind: 'building', id: 'library' }];
  cities[1]!.queue = [{ kind: 'unit', id: 'warrior' }];
  cities[2]!.population = 4;
  bumpRevision(state);
  return { state, cities };
}

describe('the city banners read each town once per revision', () => {
  it('prints the same growth ring and countdown through the memo as without it', () => {
    const { state, cities } = board();
    for (const city of cities) {
      const quote = readCity(state, city);
      expect(cityGrowthRing(state, city, quote)).toEqual(cityGrowthRing(state, city));
      const item = city.queue[0];
      if (item) expect(turnsToBuild(state, city, item, 0, quote)).toBe(turnsToBuild(state, city, item, 0));
    }
  });

  it('hands the one reading to both the ring and the countdown', () => {
    const body = braceBody(uiSource('cityBanners.ts'), 'function watchedFacts(');
    expect(body).toContain('const quote = readCity(state, city);');
    expect(body).toContain('cityGrowthRing(state, city, quote)');
    expect(body).toContain('turnsToBuild(state, city, item, 0, quote)');
  });
});

describe('a repeat refresh with nothing changed is skipped', () => {
  it('the top bar: state object, revision and seat, checked before any sim read', () => {
    const body = braceBody(uiSource('topBar.ts'), '    render(): void {');
    const gate = body.indexOf('state === drawnState && state.revision === drawnRevision && playerId === drawnSeat');
    expect(gate).toBeGreaterThan(-1);
    expect(body.indexOf('readEmpire(')).toBeGreaterThan(gate);
    expect(body.indexOf('meterEffects(')).toBeGreaterThan(gate);
  });

  it('the holdings rail: the state object as well as the revision, since a loaded game can repeat one', () => {
    const body = braceBody(uiSource('holdingsRail.ts'), 'function render(');
    expect(body).toContain('state === drawnState && state.revision === drawnRevision && seat === drawnSeat');
  });

  it('the star chart: one repaint per click rather than two, and none while closed', () => {
    const body = braceBody(uiSource('techTree.ts'), '  function render(): void {');
    const gate = body.indexOf('drawn.revision === state.revision');
    expect(gate).toBeGreaterThan(-1);
    expect(body).toContain('drawn.state === state');
    expect(body).toContain('drawn.seat === seat');
    expect(body).toContain('drawn.open === open');
    expect(body).toContain('drawn.field === field');
    expect(body.indexOf('beginPass()')).toBeGreaterThan(gate);
    expect(body.indexOf('refreshNodes()')).toBeGreaterThan(gate);
  });

  it('the star chart reads every card box before it adds a connector', () => {
    const body = braceBody(uiSource('techTree.ts'), 'function drawLines(');
    const lastRead = body.lastIndexOf('card.offsetHeight');
    const firstPath = body.indexOf("createElementNS(SVG_NS, 'path')");
    expect(lastRead).toBeGreaterThan(-1);
    expect(firstPath).toBeGreaterThan(lastRead);
    // One append of the whole set, after the loop.
    expect(body).not.toContain('svg.append(path)');
    expect(body).toContain('svg.append(drawnPaths)');
  });
});

/** Just enough of a document for a non-sticky card. */
function fakeDocument() {
  let measures = 0;
  const card = {
    className: '',
    hidden: true,
    style: { left: '', top: '', visibility: '' } as Record<string, string>,
    childNodes: [] as unknown[],
    get firstChild() { return this.childNodes[0] ?? null; },
    setAttribute() {},
    addEventListener() {},
    replaceChildren(...nodes: unknown[]) { this.childNodes = nodes; },
    getBoundingClientRect() { measures += 1; return { width: 200, height: 100 }; },
  };
  vi.stubGlobal('document', { createElement: () => card, body: { append() {} } });
  vi.stubGlobal('window', { addEventListener() {}, innerWidth: 1200, innerHeight: 800 });
  return { card, measures: () => measures };
}

describe('the faith card on a moving board', () => {
  const at = (x: number, y: number) => ({ left: x, top: y, right: x, bottom: y });

  it('is measured when its content is new, and only moved when the same content is shown again', () => {
    const dom = fakeDocument();
    const info = createInfoCard({ className: 'info-card is-board' });
    const ledger = { name: 'ledger' } as unknown as Node;
    info.showAt(at(100, 100), () => ledger);
    expect(dom.measures()).toBe(1);
    const firstLeft = dom.card.style.left;

    // The frame beat: same node, the camera moved the hex.
    info.showAt(at(140, 120), () => ledger);
    expect(dom.measures()).toBe(1);
    expect(dom.card.style.left).not.toBe(firstLeft);
    expect(dom.card.childNodes).toEqual([ledger]);

    // The hover path: a rebuilt ledger is a new node and is measured.
    const rebuilt = { name: 'ledger again' } as unknown as Node;
    info.showAt(at(140, 120), () => rebuilt);
    expect(dom.measures()).toBe(2);

    // Hidden and shown again: measured, since the card was emptied.
    info.hide();
    info.showAt(at(140, 120), () => rebuilt);
    expect(dom.measures()).toBe(3);
  });
});

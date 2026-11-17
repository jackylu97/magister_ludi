import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCityBanners } from '../../src/ui/cityBanners';
import type { MapView } from '../../src/ui/mapView';
import { foundCityAt } from '../../src/sim/cities';
import { createGame } from '../sim/newGameHelpers';
import { createMap, getTileAt } from '../../src/sim/map';
import { createUnit } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';

// Use the roundel's real no-canvas fallback. The core suite shares modules,
// so an import mock cannot reliably replace an already-loaded banner module.

class ElementSurface {
  className = '';
  dataset: Record<string, string> = {};
  getContext() { return null; }
  children: ElementSurface[] = [];
  parent: ElementSurface | null = null;
  style = { setProperty: vi.fn(), removeProperty: vi.fn() };
  classList = { toggle: vi.fn(), add: vi.fn() };
  private handlers = new Map<string, (() => void)[]>();
  setAttribute() {}
  removeAttribute() {}
  append(...children: ElementSurface[]) {
    children.forEach(child => { child.parent = this; this.children.push(child); });
  }
  replaceChildren() { this.children.forEach(child => { child.parent = null; }); this.children = []; }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }
  addEventListener(type: string, callback: () => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), callback]);
  }
  emit(type: string) { this.handlers.get(type)?.forEach(callback => callback()); }
  find(className: string): ElementSurface {
    const found = this.walk().find(child => child.className === className);
    if (!found) throw new Error(`Missing ${className}`);
    return found;
  }
  private walk(): ElementSurface[] { return this.children.flatMap(child => [child, ...child.walk()]); }
}

function fixture() {
  vi.stubGlobal('document', { createElement: () => new ElementSurface(),
    createElementNS: () => new ElementSurface() });
  const game = createGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'Ada', color: '#a00', isHuman: true },
    { name: 'Bors', color: '#00a', isHuman: true },
  ] });
  const state = game.state;
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  state.units = []; state.cities = []; state.tileOwner = state.map.tiles.map(() => null);
  resetVisibility(state);
  const city = foundCityAt(state, 0, getTileAt(state.map, 3, 3)!);
  const other = foundCityAt(state, 0, getTileAt(state.map, 10, 3)!);
  const unit = createUnit(state, 0, 'warrior', 3, 3);
  createUnit(state, 0, 'worker', 10, 3);
  state.visibility[0]!.fill(VISIBLE);
  const container = new ElementSurface(), onHoverPiece = vi.fn(), onHoverCity = vi.fn();
  let onScreen = true;
  let openCity: typeof city | null = null;
  const banners = createCityBanners({ container: container as unknown as HTMLElement,
    renderer: { projectCell: () => ({ x: 100, y: 100, onScreen }) } as unknown as MapView,
    getGame: () => game, localPlayerId: () => 0, onOpenCity: vi.fn(),
    openCity: () => openCity,
    onSelectPiece: vi.fn(), onHoverPiece, onHoverCity });
  const banner = container.children[0]!;
  const enter = () => {
    banner.emit('pointerenter');
    banner.find('city-banner-piece').emit('pointerenter');
  };
  return { state, city, other, unit, banners, banner, enter, onHoverPiece, onHoverCity,
    open: () => { openCity = city; banners.refresh(); },
    hide: () => { onScreen = false; banners.reposition(); } };
}

afterEach(() => vi.unstubAllGlobals());

describe('garrison icon hover lifecycle', () => {
  it('names the selectable piece and clears when the pointer returns to the banner text', () => {
    const f = fixture();
    f.enter();
    expect(f.onHoverCity).toHaveBeenLastCalledWith(f.city.id);
    expect(f.onHoverPiece).toHaveBeenLastCalledWith(f.unit.id);
    f.banner.find('city-banner-piece').emit('pointerleave');
    expect(f.onHoverPiece).toHaveBeenLastCalledWith(null);
    f.banners.dispose();
  });

  it('keeps an unchanged hovered row through refreshes of other cities', () => {
    const f = fixture();
    f.enter(); f.onHoverPiece.mockClear();
    f.other.name = 'New name'; f.banners.refresh();
    expect(f.onHoverPiece).not.toHaveBeenCalled();
    f.unit.hp -= 1; f.banners.refresh();
    expect(f.onHoverPiece).toHaveBeenLastCalledWith(null);
    f.banners.dispose();
  });

  it.each(['leave', 'hide', 'remove', 'dispose'] as const)('clears a hovered icon and city on %s', action => {
    const f = fixture();
    f.enter();
    if (action === 'leave') f.banner.emit('pointerleave');
    if (action === 'hide') f.hide();
    if (action === 'remove') f.open();
    if (action === 'dispose') f.banners.dispose();
    expect(f.onHoverPiece).toHaveBeenLastCalledWith(null);
    expect(f.onHoverCity).toHaveBeenLastCalledWith(null);
    f.banners.dispose();
  });
});

// A projection reads the canvas's size, and a read after a style write makes the browser lay the page out at once.
// With the two interleaved, a pan laid the page out once a town on every frame (render speed pass, third pass).
describe('banner placement on a drawn frame', () => {
  it('projects every banner before it moves any of them, and moves each to its own point', () => {
    vi.stubGlobal('document', { createElement: () => new ElementSurface(), createElementNS: () => new ElementSurface() });
    const game = createGame({ seed: 7, sizeName: 'duel', players: [{ name: 'Ada', color: '#a00', isHuman: true }] });
    const state = game.state;
    state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
    state.units = []; state.cities = []; state.tileOwner = state.map.tiles.map(() => null);
    resetVisibility(state);
    for (const col of [2, 6, 10]) foundCityAt(state, 0, getTileAt(state.map, col, 3)!);
    state.visibility[0]!.fill(VISIBLE);
    const events: string[] = [];
    const container = new ElementSurface();
    const banners = createCityBanners({ container: container as unknown as HTMLElement,
      renderer: { projectCell: (col: number) => { events.push(`read ${col}`); return { x: col * 10, y: 50, onScreen: col !== 10 }; } } as unknown as MapView,
      getGame: () => game, localPlayerId: () => 0, onOpenCity: vi.fn(), openCity: () => null,
      onSelectPiece: vi.fn(), onHoverPiece: vi.fn(), onHoverCity: vi.fn() });
    const roots = [...container.children];
    expect(roots).toHaveLength(3);
    const placed = new Map<ElementSurface, string>();
    for (const root of roots) {
      const style = root.style as unknown as Record<string, unknown>;
      for (const key of ['display', 'transform']) {
        let value = '';
        Object.defineProperty(style, key, { configurable: true, get: () => value,
          set: (next: string) => { events.push(`write ${key}`); value = next; if (key === 'transform') placed.set(root, next); } });
      }
    }
    events.length = 0;
    banners.reposition();
    const firstWrite = events.findIndex(event => event.startsWith('write'));
    expect(events.filter(event => event.startsWith('read'))).toHaveLength(3);
    expect(events.slice(firstWrite).some(event => event.startsWith('read'))).toBe(false);
    const transforms = [...placed.values()].sort();
    expect(transforms).toEqual(['translate(-50%, -100%) translate(20px, 50px)', 'translate(-50%, -100%) translate(60px, 50px)']);
    expect(roots.filter(root => (root.style as unknown as { display: string }).display === 'none')).toHaveLength(1);
    banners.dispose();
  });
});

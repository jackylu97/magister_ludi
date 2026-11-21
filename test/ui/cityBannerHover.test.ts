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

describe('banner placement on a drawn frame', () => {
  it('positions new labels and updates only the pixels and visibility that changed', () => {
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
    let revision = 1, offset = 0, rightEdge = 8;
    let openCity: typeof state.cities[number] | null = null;
    const banners = createCityBanners({ container: container as unknown as HTMLElement,
      renderer: {
        get cityBannerProjectionRevision() { return revision; },
        projectCell: (col: number) => { events.push(`read ${col}`); return { x: col * 10 + offset, y: 50, onScreen: col < rightEdge }; },
      } as unknown as MapView,
      getGame: () => game, localPlayerId: () => 0, onOpenCity: vi.fn(), openCity: () => openCity,
      onSelectPiece: vi.fn(), onHoverPiece: vi.fn(), onHoverCity: vi.fn() });
    const roots = [...container.children];
    expect(roots).toHaveLength(3);
    for (const root of roots) {
      const style = root.style as unknown as Record<string, unknown>;
      for (const key of ['display', 'transform']) {
        let value = style[key];
        Object.defineProperty(style, key, { configurable: true, get: () => value,
          set: (next: string) => { events.push(`write ${key}`); value = next; } });
      }
    }
    events.length = 0;
    for (let frame = 0; frame < 24; frame++) banners.reposition();
    banners.refresh();
    expect(events).toEqual([]);

    offset = 0.2; revision++; banners.reposition();
    expect(events).toEqual(['read 2', 'read 6', 'read 10']);
    events.length = 0;
    offset = 1; rightEdge = 12; revision++; banners.reposition();
    expect(events).toEqual(['read 2', 'read 6', 'read 10', 'write transform', 'write transform', 'write display', 'write transform']);
    expect(roots.map(root => (root.style as unknown as {transform: string}).transform)).toEqual(
      [21, 61, 101].map(x => `translate(-50%, -100%) translate(${x}px, 50px)`));

    openCity = state.cities[0]!; banners.refresh();
    expect(container.children).toHaveLength(2);
    openCity = null; banners.refresh();
    const replacement = container.children[2]!;
    expect(replacement).not.toBe(roots[0]);
    expect((replacement.style as unknown as {transform: string}).transform).toContain('translate(21px, 50px)');
    banners.dispose();
  });
});

/**
 * The world and the stand-in document the Faith sheet's Bonuses and Religion &
 * followers suites share (`bonusesTab.test.ts`, `followersTab.test.ts`).
 *
 * A non-test module on purpose (CLAUDE.md): importing a `.test.ts` file would
 * register its tests twice. The two suites read one world because the two tabs
 * are two readings of one religion, and the claim worth checking is that each
 * reads it the way the simulation does.
 */

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Religion,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { foundReligion, performRiteAt } from '../../src/sim/religion';
import type { OrderId } from '../../src/sim/statecraftData';
import type { TechId } from '../../src/sim/techData';
import { recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { newGame } from '../sim/newGameHelpers';

export interface FaithTabsWorld {
  state: GameState;
  /** Seat 0's capital and holy city: follows the Grain Cult and keeps Omen Reading. */
  uruk: City;
  /** Seat 0's second town: follows seat 1's faith, inside the holy site's reach. */
  eridu: City;
  /** Seat 0's far town, which no faith reaches. */
  ur: City;
  /** Seat 1's capital, following the Grain Cult by majority: what pays the founder's share. */
  lagash: City;
  /** Seat 0's religion. */
  ours: Religion;
  /** Seat 1's religion. */
  theirs: Religion;
}

/**
 * Two seats on a plain grassland map, every way a religion pays seat 0:
 *
 *   - two gods (Keeper of the Hearth, Sacred Fire);
 *   - a religion with a follower belief that pays (The Quiet Hours), one that
 *     only opens a building (Temple Spires), and an enhancer (Pilgrims' Coin),
 *     which leaves one follower place and one enhancer place empty;
 *   - its holy site on Uruk's own hex, and Lagash (seat 1's) following it, so
 *     the founder's share pays;
 *   - Omen Reading kept in Uruk;
 *   - Eridu following seat 1's religion, whose Tithe Houses pay seat 0 there;
 *   - an Order that pays faith (The Camp Chaplains) with two warriors to count,
 *     so the headline has a Statecraft slice.
 *
 * Seat 0 knows Divination and The High Temple, so its pantheon has places and a
 * prophet can be called. The names are set outright, since a generated name is
 * drawn from the game's random stream.
 */
export function faithTabsWorld(): FaithTabsWorld {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Azure', color: '#2a4d8f', isHuman: true },
      { name: 'Crimson', color: '#8f2a2a', isHuman: false },
    ],
  });
  state.map = createMap({ width: 18, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  const uruk = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  uruk.name = 'Uruk';
  const eridu = foundCityAt(state, 0, getTileAt(state.map, 4, 9)!);
  eridu.name = 'Eridu';
  const lagash = foundCityAt(state, 1, getTileAt(state.map, 9, 5)!);
  lagash.name = 'Lagash';
  const ur = foundCityAt(state, 0, getTileAt(state.map, 16, 10)!);
  ur.name = 'Ur';

  const azure = playerById(state, 0)!;
  for (const tech of ['divination', 'theHighTemple'] as TechId[]) azure.techsResearched.push(tech);
  azure.pantheon.beliefs.push('keeperOfTheHearth', 'sacredFire');
  const ours = foundReligion(state, azure);
  ours.name = 'the Grain Cult';
  getTileAt(state.map, 4, 4)!.improvement = 'holySite';
  state.tileOwner[tileIndex(state.map, 4, 4)] = uruk.id;
  ours.holySite = { col: 4, row: 4 };
  ours.follower = ['theQuietHours', 'templeSpires'];
  ours.enhancer = ['pilgrimsCoin'];
  uruk.population = 4;
  uruk.followers = { [ours.id]: 4 };
  lagash.population = 3;
  lagash.followers = { [ours.id]: 3 };

  const crimson = playerById(state, 1)!;
  crimson.pantheon.beliefs.push('herdGods');
  const theirs = foundReligion(state, crimson);
  theirs.name = 'the Way of the Hearth';
  theirs.follower = ['titheHouses'];
  eridu.population = 6;
  eridu.followers = { [theirs.id]: 6 };

  uruk.buildings.push('granary');
  createUnit(state, 0, 'warrior', 3, 3);
  createUnit(state, 0, 'warrior', 5, 5);
  const chaplains = 'dominionTheCampChaplains' as OrderId;
  azure.statecraft.orders = [chaplains];
  azure.statecraft.slots = [{ card: chaplains, sealedUntil: 0 }];
  azure.faithPool = 1000;
  bumpRevision(state);
  performRiteAt(state, azure, uruk, 'omenReading');
  bumpRevision(state);
  recomputeVisibility(state, 0);
  return { state, uruk, eridu, ur, lagash, ours, theirs };
}

// --- a stand-in document -----------------------------------------------------------------

/**
 * Just enough of a document to build a tab and press its controls: elements
 * with classes, attributes, data, style properties, text, children, listeners,
 * and a one-class `querySelector`. Not a layout engine.
 */
export interface FakeNode {
  tagName: string;
  className: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  /** Style properties as written, custom properties included. */
  props: Record<string, string>;
  children: FakeNode[];
  parent: FakeNode | null;
  listeners: Record<string, ((event: unknown) => void)[]>;
  ownText: string;
  disabled?: boolean;
  title?: string;
  type?: string;
  value?: string;
  tabIndex?: number;
}

function fakeNode(tag: string): FakeNode {
  const node: FakeNode = {
    tagName: tag.toUpperCase(),
    className: '',
    dataset: {},
    attributes: {},
    props: {},
    children: [],
    parent: null,
    listeners: {},
    ownText: '',
  };
  const api = node as unknown as Record<string, unknown>;
  const classes = (): string[] => node.className.split(' ').filter(Boolean);
  const adopt = (items: FakeNode[]): FakeNode[] => {
    const flat = items.flatMap((item) => (item.tagName === '#FRAGMENT' ? item.children : [item]));
    for (const item of flat) item.parent = node;
    return flat;
  };
  api.append = (...items: FakeNode[]): void => {
    node.children.push(...adopt(items));
  };
  api.replaceChildren = (...items: FakeNode[]): void => {
    node.ownText = '';
    node.children = adopt(items);
  };
  api.remove = (): void => {
    if (node.parent !== null) node.parent.children = node.parent.children.filter((child) => child !== node);
    node.parent = null;
  };
  api.setAttribute = (name: string, value: string): void => {
    node.attributes[name] = value;
    if (name === 'class') node.className = value;
  };
  api.addEventListener = (name: string, handler: (event: unknown) => void): void => {
    (node.listeners[name] ??= []).push(handler);
  };
  api.classList = {
    add: (...names: string[]): void => {
      node.className = [...classes(), ...names.filter((name) => !classes().includes(name))].join(' ');
    },
    remove: (...names: string[]): void => {
      node.className = classes()
        .filter((name) => !names.includes(name))
        .join(' ');
    },
    toggle: (name: string, on?: boolean): boolean => {
      const want = on ?? !classes().includes(name);
      if (want && !classes().includes(name)) node.className = [...classes(), name].join(' ');
      if (!want) node.className = classes().filter((one) => one !== name).join(' ');
      return want;
    },
    contains: (name: string): boolean => classes().includes(name),
  };
  const style: Record<string, unknown> = {
    setProperty: (name: string, value: string): void => {
      node.props[name] = value;
    },
    removeProperty: (name: string): void => {
      delete node.props[name];
    },
    getPropertyValue: (name: string): string => node.props[name] ?? '',
  };
  Object.defineProperty(style, 'width', {
    get: (): string => node.props.width ?? '',
    set: (value: string): void => {
      node.props.width = value;
    },
  });
  api.style = style;
  const matches = (one: FakeNode, selector: string): boolean =>
    selector.startsWith('.') && one.className.split(' ').includes(selector.slice(1));
  api.querySelectorAll = (selector: string): FakeNode[] => all(node).slice(1).filter((one) => matches(one, selector));
  api.querySelector = (selector: string): FakeNode | null =>
    all(node)
      .slice(1)
      .find((one) => matches(one, selector)) ?? null;
  Object.defineProperty(api, 'textContent', {
    get: (): string =>
      node.ownText + node.children.map((child) => (child as unknown as { textContent: string }).textContent).join(''),
    set: (text: string): void => {
      node.ownText = text;
      node.children = [];
    },
  });
  return node;
}

/** Puts the stand-in document (and a window that asks for no motion) in place; returns the undo. */
export function installFakeDocument(): () => void {
  const global = globalThis as { document?: unknown; window?: unknown };
  const realDocument = global.document;
  const realWindow = global.window;
  global.document = {
    createElement: (tag: string) => fakeNode(tag),
    createElementNS: (_ns: string, tag: string) => fakeNode(tag),
    createTextNode: (text: string) => {
      const node = fakeNode('#text');
      node.ownText = text;
      return node;
    },
    createDocumentFragment: () => fakeNode('#fragment'),
  };
  // A stamp asks the motion setting before it counts; reduced motion lands it
  // at once, which is what a test can read.
  global.window = { matchMedia: () => ({ matches: true }) };
  return () => {
    global.document = realDocument;
    global.window = realWindow;
  };
}

export function textOf(node: FakeNode): string {
  return (node as unknown as { textContent: string }).textContent;
}

export function all(node: FakeNode): FakeNode[] {
  return [node, ...node.children.flatMap(all)];
}

export function byClass(root: FakeNode, name: string): FakeNode[] {
  return all(root).filter((node) => node.className.split(' ').includes(name));
}

export function byKey(root: FakeNode, key: string): FakeNode | undefined {
  return all(root).find((node) => node.dataset.key === key);
}

/** Fires every listener for one event on a node. */
export function fire(node: FakeNode, event: string): void {
  for (const handler of node.listeners[event] ?? []) handler({ preventDefault() {}, stopPropagation() {} });
}

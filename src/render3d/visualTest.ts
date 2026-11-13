/**
 * The switches of the visual test version (batch V1, `docs/flags.md` item
 * (nnnnnnn)).
 *
 * The user asked for a test version of visual changes to the painted board,
 * each with its own switch, so the old look and the new look can be compared
 * in the same view. This module holds which switches are on. It is pure: no
 * three.js, no DOM. The renderer listens for changes and applies them, and the
 * game menu draws one checkbox a switch (`main.ts`, `buildVisualTestPanel`).
 *
 * After the user's first look (2026-11-12) the ground detail, the cleaner fog
 * and the light by age left the test version, and numbers 4 and 5 now name the
 * organic rivers and the organic roads.
 *
 * The URL option `?vtest=` sets the switches when the page loads, for
 * screenshots:
 * - `all` turns every switch on, with the border drawn `wash`;
 * - `none` turns every switch off;
 * - a list of switch numbers, such as `1,3,5`, turns those on and the rest off.
 *   Number 3 takes a border style after a colon: `3:drape`, `3:ruled` or
 *   `3:wash`. `3` alone is `wash`.
 *
 * With no `?vtest=` a browser page starts with everything on.
 */

/** The on/off switches, by key. */
export type VisualSwitch = 'sea' | 'rivers' | 'borders' | 'organicRivers' | 'organicRoads' | 'pins' | 'clouds' | 'idle' | 'grounding' | 'light' | 'tiles' | 'gradient' | 'grade' | 'miniature';

/**
 * How the border line of switch 3 is drawn:
 * - `drape`: laid over the ground relief, bending over every facet of a hill;
 * - `ruled`: straight from hex corner to hex corner at the hex's own height,
 *   like ink ruled on a map;
 * - `wash`: a thin ruled ink line with a soft band of the empire's colour
 *   fading inward, as on a printed atlas.
 */
export type BorderStyleKey = 'drape' | 'ruled' | 'wash';

export type VisualTestState = Record<VisualSwitch, boolean> & { border: BorderStyleKey };

/**
 * What a change to one switch costs the renderer:
 * - `none`: a uniform write, so the next frame shows it;
 * - `board`: the board is built again (the river is in the ground's geometry);
 * - `borders`: the border layers are built again;
 * - `roads`: the road layer is built again;
 * - `lens`: the resource pins are built again;
 * - `smoke`: the town smoke is built again.
 */
export type VisualRebuild = 'none' | 'board' | 'borders' | 'roads' | 'lens' | 'smoke';

export interface VisualSwitchDef {
  /** The number in the flags item and in `?vtest=`. */
  id: number;
  key: VisualSwitch;
  label: string;
  rebuild: VisualRebuild;
}

export const VISUAL_SWITCHES: readonly VisualSwitchDef[] = [
  { id: 1, key: 'sea', label: 'Sea with depth and motion', rebuild: 'none' },
  { id: 2, key: 'rivers', label: 'Thinner rivers with banks', rebuild: 'board' },
  { id: 3, key: 'borders', label: 'One border at the edge', rebuild: 'borders' },
  { id: 4, key: 'organicRivers', label: 'Organic rivers', rebuild: 'board' },
  { id: 5, key: 'organicRoads', label: 'Organic roads', rebuild: 'roads' },
  { id: 6, key: 'pins', label: 'Quieter resource pins', rebuild: 'lens' },
  { id: 7, key: 'clouds', label: 'Drifting cloud shadows', rebuild: 'none' },
  { id: 8, key: 'idle', label: 'Small idle motion', rebuild: 'smoke' },
  { id: 9, key: 'grounding', label: 'Grounding shade', rebuild: 'none' },
  { id: 10, key: 'light', label: 'Rim light and deeper cool shade', rebuild: 'none' },
  { id: 11, key: 'tiles', label: 'Hexes as tiles', rebuild: 'none' },
  { id: 12, key: 'gradient', label: 'Darker foot, lighter top', rebuild: 'none' },
  { id: 13, key: 'grade', label: 'Colour grade', rebuild: 'none' },
  { id: 14, key: 'miniature', label: 'Miniature blur', rebuild: 'none' },
];

/** The border switch's number in `?vtest=`, which takes a style after a colon. */
export const BORDER_SWITCH_ID = 3;

export const BORDER_STYLES: readonly { key: BorderStyleKey; label: string }[] = [
  { key: 'drape', label: 'Draped over the ground' },
  { key: 'ruled', label: 'Ruled, corner to corner' },
  { key: 'wash', label: 'Ruled, with a colour wash' },
];

const BORDER_KEYS = new Set<BorderStyleKey>(BORDER_STYLES.map((style) => style.key));
const DEFAULT_BORDER: BorderStyleKey = 'wash';

/** Every switch on: the test version's default. */
export function allOn(): VisualTestState {
  const state = { border: DEFAULT_BORDER } as VisualTestState;
  for (const def of VISUAL_SWITCHES) state[def.key] = true;
  // The user looked at the new border on 2026-11-12 and asked for the old one
  // back, so the border switch is off unless its number is given.
  state.borders = false;
  return state;
}

/** Every switch off: the board as it was before batch V1. */
export function allOff(): VisualTestState {
  const state = { border: DEFAULT_BORDER } as VisualTestState;
  for (const def of VISUAL_SWITCHES) state[def.key] = false;
  return state;
}

/**
 * Reads the `vtest` URL value. A missing value gives the default (all on).
 * Unknown numbers and unknown styles are ignored, so a typo turns a switch off
 * (or leaves the border style at its default) rather than failing the page.
 */
export function parseVisualTest(value: string | null | undefined): VisualTestState {
  if (value === null || value === undefined) return allOn();
  const text = value.trim().toLowerCase();
  if (text === '' || text === 'all') return allOn();
  if (text === 'none') return allOff();
  const state = allOff();
  for (const part of text.split(',')) {
    const [number, option] = part.trim().split(':');
    const def = VISUAL_SWITCHES.find((one) => one.id === Number(number));
    if (!def) continue;
    state[def.key] = true;
    if (def.id === BORDER_SWITCH_ID && option && BORDER_KEYS.has(option as BorderStyleKey)) state.border = option as BorderStyleKey;
  }
  return state;
}

/** The `vtest` URL value that `parseVisualTest` reads back as this state. */
export function formatVisualTest(state: VisualTestState): string {
  const on = VISUAL_SWITCHES.filter((def) => state[def.key]);
  if (on.length === VISUAL_SWITCHES.length - 1 && !state.borders) return 'all';
  if (on.length === 0) return 'none';
  return on.map((def) => def.id === BORDER_SWITCH_ID && state.border !== DEFAULT_BORDER ? `${def.id}:${state.border}` : String(def.id)).join(',');
}

/** The switches that differ between two states, in switch order. */
export function changedSwitches(a: VisualTestState, b: VisualTestState): VisualSwitchDef[] {
  return VISUAL_SWITCHES.filter((def) => a[def.key] !== b[def.key]);
}

type Listener = (next: VisualTestState, previous: VisualTestState) => void;

/**
 * The switches a page starts with. In a browser page that is the URL option,
 * and all on when there is none. Anywhere else (a test, a worker) there is no
 * page and no player looking, so the board keeps its old picture: every test
 * written before batch V1 still describes the board it was written for.
 */
function startingState(): VisualTestState {
  try {
    if (typeof document === 'undefined' || !globalThis.location) return allOff();
    return parseVisualTest(new URLSearchParams(globalThis.location.search).get('vtest'));
  } catch {
    return allOff();
  }
}

let current: VisualTestState = startingState();
const listeners = new Set<Listener>();

/** The switches as they stand now. A copy, so a caller cannot change them by accident. */
export function visualTest(): VisualTestState {
  return { ...current };
}

/** True when the switch is on. The common read, without a copy. */
export function visualOn(key: VisualSwitch): boolean {
  return current[key];
}

/** The border style as it stands now. It only matters while switch 3 is on. */
export function visualBorder(): BorderStyleKey {
  return current.border;
}

/** Changes some switches and tells every listener. Does nothing if nothing changes. */
export function setVisualTest(patch: Partial<VisualTestState>): void {
  const next = { ...current, ...patch };
  const moved = changedSwitches(current, next).length > 0 || next.border !== current.border;
  if (!moved) return;
  const previous = current;
  current = next;
  for (const listener of [...listeners]) listener({ ...next }, { ...previous });
}

/** Listens for switch changes. Returns the function that stops listening. */
export function onVisualTestChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

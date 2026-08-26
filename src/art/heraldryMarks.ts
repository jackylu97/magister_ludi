/**
 * The heraldic charges: twelve drawn marks, one per seat, in the same hand and
 * on the same grid as `resourceMarks.ts`.
 *
 * Why a seat needs one
 * -------------------
 * A player is currently a *colour* and nothing else — "the blue one", "the red
 * one" — which fails twice. It fails a colourblind player outright, and it fails
 * everybody at a glance on a board where a coloured rim is forty pixels of ink
 * beside a coloured flag and a coloured border. Every real heraldry solves this
 * the same way and has for eight hundred years: a **tincture and a charge**, the
 * colour saying which house and the drawn figure saying it again in a vocabulary
 * that survives being small, being grey, and being printed.
 *
 * So a seat carries a charge, and the charge is printed everywhere the colour is:
 * on the city flag (the fly, on its own little field of parchment — a canton),
 * inside the unit badge's rim as a boss, and beside the seat's swatch in the
 * interface. Same drawing every time, because there is one drawing.
 *
 * Purely presentational, all the way down
 * ---------------------------------------
 * `PlayerSpec.charge` is a string the simulation never interprets — exactly like
 * `color`, and the same sentence is on its docblock. Nothing in `src/sim/` reads
 * this module. That is what lets a charge be *config* (saved with `{config,
 * log}`, so a replayed game flies the same banners) without being a rule.
 *
 * The fallback is the colours' own
 * --------------------------------
 * A seat with no charge named takes one **by seat order**, precisely as a seat
 * with an unrecognised colour takes one from `players.fallbackOrder`
 * (`playerPieceColor` in `src/render3d/lookData.ts`). That is what makes this a
 * pure addition: nothing in setup has to change, no existing config has to grow
 * a field, and seat 0 is the crescent in every game ever started. See
 * `heraldryFor`.
 *
 * One drawing, three printers
 * ---------------------------
 * The board traces these into the icon atlas (`drawChargeCell` in
 * `src/render3d/badges3d.ts`), the DOM masks the same paths as a `data:` URI
 * (`heraldryMarkDataUri`), and a gallery page can do either. The bargain
 * `resourceMarks.ts` explains at length, one set over: a mark that is *data* can
 * be ink on parchment in one surface and parchment on ink in the next, and a
 * mark that is a *file* cannot.
 */

import {
  MARK_BOX,
  MARK_STROKE,
  type MarkPath,
  dot,
  ink,
  leaf,
  markSvg,
  poly,
  solid,
} from './resourceMarks';

/**
 * The twelve charges, in the order a seat takes them.
 *
 * A list rather than a set, because the order **is** the fallback: seat 0 flies
 * the crescent, seat 1 the stag, and so on round the roster. Reordering it
 * re-banners every game that never named a charge, which is every game today —
 * so it is as load-bearing as `players.fallbackOrder` and is not to be tidied.
 *
 * Twelve because `players.fallbackOrder` has twelve colours in it and a seat
 * beyond the twelfth would be sharing both halves of its identity with somebody.
 */
export const HERALDRY_IDS = [
  'crescent',
  'stag',
  'key',
  'wheel',
  'tower',
  'serpent',
  'star',
  'ship',
  'oak',
  'bee',
  'hound',
  'sun',
] as const;

export type HeraldryId = (typeof HERALDRY_IDS)[number];

/**
 * One charge's drawing, plus the sentence that says what it depicts.
 *
 * Structurally `ResourceMark` and `SiteMark`, for the reason those two are
 * structurally each other: all three are fed to the same tracer and the same SVG
 * emitter, so the shape is the interface between the drawing language and its
 * printers. A separate name because the three tables answer different questions,
 * and a shared one would make `heraldryMark('wheat')` typecheck.
 */
export interface HeraldryMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  paths: readonly MarkPath[];
}

/**
 * A ring of rays about a centre, each from `r0` out to `r1`.
 *
 * The sun's, and nothing else's — but written as a helper rather than as twelve
 * hand-typed segments for `poly`'s stated reason: a dropped coordinate in a
 * hand-written star is a mark with a stray spike, and nobody would find it.
 */
function rays(cx: number, cy: number, r0: number, r1: number, count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const angle = ((i / count) * Math.PI * 2) - Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const at = (r: number): string =>
      `${Math.round((cx + c * r) * 100) / 100} ${Math.round((cy + s * r) * 100) / 100}`;
    parts.push(`M${at(r0)}L${at(r1)}`);
  }
  return parts.join('');
}

/**
 * Every charge, keyed by id. Exhaustive by type — a `Record<HeraldryId, …>`
 * rather than the resources' open string table, because the ids are a closed
 * union declared here rather than rows of a JSON file somebody may add to at
 * runtime. Adding a thirteenth charge is a TypeScript edit and is meant to be:
 * it changes which charge every seat past the twelfth flies.
 *
 * The set is chosen for **silhouette spread** first and heraldic plausibility
 * second. Round (crescent, wheel, sun), horned (stag), tall (tower, key),
 * winding (serpent), pointed (star), broad (ship), leafy (oak), small-and-busy
 * (bee), profile (hound): no two of them collapse to the same twenty-pixel blob,
 * which is the only test a charge has to pass.
 */
const HERALDRY_MARKS: Record<HeraldryId, HeraldryMark> = {
  crescent: {
    note: 'a crescent moon, horns up, tapering to points',
    paths: [
      // Two circles of different centres, not one band: the taper to a point at
      // each horn is the whole difference between a heraldic crescent and a
      // croissant, and a `crescent()` band cut on radials cannot have it.
      solid('M12 22A22.4 22.4 0 1 0 52 22A20.1 20.1 0 1 1 12 22Z'),
    ],
  },
  stag: {
    note: "a stag's head caboshed, its attire branching above",
    paths: [
      solid('M32 30C25 30 21 36 21 43C21 51 26 57 32 57C38 57 43 51 43 43C43 36 39 30 32 30Z'),
      // The ears sit *below* the antlers and point out, which is what stops the
      // silhouette reading as a tree.
      ink('M21 38L11 34M43 38L53 34'),
      ink('M26 31L20 19M20 19L13 15M20 19L21 9'),
      ink('M38 31L44 19M44 19L51 15M44 19L43 9'),
      // No eyes. A caboshed head is a *solid* in heraldry and this one is drawn
      // as one, so a pip inside it is ink on ink — it cost two paths and drew
      // nothing, which is exactly the kind of detail a badge-sized mark cannot
      // afford. What carries the animal is the attire, and that is outside the
      // silhouette where it can be seen.
    ],
  },
  key: {
    note: 'a key, bow up, two wards on its stem',
    paths: [ink(dot(32, 17, 9)), ink('M32 26V55'), ink('M32 47H43M32 39H41')],
  },
  wheel: {
    note: 'a spoked wheel',
    paths: [
      ink(dot(32, 32, 22)),
      ink('M32 10V54M15.5 22.5L48.5 41.5M15.5 41.5L48.5 22.5'),
      { d: dot(32, 32, 5), fill: true, width: 0 },
    ],
  },
  tower: {
    note: 'a crenellated tower with an arched door',
    paths: [
      // Walked as one open stroke from the foot up the left side, round the
      // merlons and back down: the crenellation is what makes a rectangle a
      // tower, so it must never be a separate path that can go missing.
      ink('M20 57V17H26V23H29V17H35V23H38V17H44V57'),
      ink('M27 57V47A5 5 0 0 1 37 47V57'),
      { d: dot(32, 33, 3.4), fill: true, width: 0 },
    ],
  },
  serpent: {
    note: 'a serpent gliding, head raised and tongue out',
    paths: [
      // The land serpent, and deliberately not the sea serpent the chart's
      // marginalia draws (`src/art/marginaliaMarks.ts`): a charge is a figure on
      // a shield and that one is a monster in a sea, and printing the same
      // drawing in both places would make a seat's banner read as a warning.
      ink('M11 55C21 55 19 45 26 42C34 38 34 28 30 22C26 16 33 10 40 12'),
      { d: dot(44, 13, 5), fill: true, width: 0 },
      ink('M49 11L56 8M49 15L56 17'),
    ],
  },
  star: {
    note: 'a mullet of five points',
    paths: [
      solid(
        poly(
          32, 9, 37.9, 24.9, 54.8, 25.6, 41.5, 36.1, 46.1, 52.4,
          32, 43, 17.9, 52.4, 22.5, 36.1, 9.2, 25.6, 26.1, 24.9,
        ),
      ),
    ],
  },
  ship: {
    note: 'a single-masted ship on three waves',
    paths: [
      solid('M10 38H54L46 50H18Z'),
      ink('M32 38V8'),
      solid('M33 12C43 16 45 25 43 33H33Z'),
      ink('M7 57C13 52 17 60 23 56C29 52 33 60 39 56C45 52 49 60 57 55'),
    ],
  },
  oak: {
    note: 'an oak, lobed crown over a rooted trunk',
    paths: [
      solid(
        'M32 8C40 8 46 12 46 18C51 20 51 29 45 31C43 38 35 40 32 36C29 40 21 38 19 31C13 29 13 20 18 18C18 12 24 8 32 8Z',
      ),
      ink('M32 36V57M32 48L23 55M32 48L41 55'),
    ],
  },
  bee: {
    note: 'a bee, wings spread, banded, with its head clear of its body',
    paths: [
      ink(leaf(16, 27, 23, 9, -32)),
      ink(leaf(48, 27, 23, 9, 32)),
      // The body is **outlined and not filled**, which is the one decision that
      // makes this a bee rather than an ant: the bands are what say "bee", and a
      // band drawn in the house ink over a solid body in the same ink is ink on
      // ink. Everything else here is a silhouette; this one has to be a drawing.
      ink(leaf(32, 43, 28, 12, 90)),
      ink('M23 40H41M24 48H40'),
      // The head is solid and set clear of the body, so the two read as two
      // masses even when the whole mark is twelve pixels across.
      { d: dot(32, 21, 6.5), fill: true, width: 0 },
      ink('M28 16L24 7M36 16L40 7'),
    ],
  },
  hound: {
    note: "a hound's head in profile, ear pendent",
    paths: [
      // The skull is outlined and the **ear** is the solid, which is the reverse
      // of the stag and is the right way round for a profile: a filled head
      // loses its muzzle into its brow and reads as a bear, while an open one
      // with one dark pendent ear reads as a hound from across the table.
      ink('M20 27C20 19 28 15 36 19L44 25L60 34L47 40C45 48 36 52 28 48C21 45 20 35 20 27Z'),
      // The ear hangs **below** the jaw line, which is the single mark that
      // separates a hound from every other animal head at this size: a pricked
      // ear inside the skull silhouette reads as a bird, and this one did until
      // it was lengthened.
      solid('M27 20C19 23 14 36 19 52C27 48 29 32 28 21Z'),
      { d: dot(40, 28, 2.8), fill: true, width: 0 },
    ],
  },
  sun: {
    note: 'a sun in splendour, eight rays',
    paths: [solid(dot(32, 32, 13)), ink(rays(32, 32, 18, 27, 8))],
  },
};

/** The drawing for one charge. Total, by construction. */
export function heraldryMark(id: HeraldryId): HeraldryMark {
  return HERALDRY_MARKS[id];
}

/**
 * Which charge a seat flies: the one it named, or the one its seat order gives
 * it.
 *
 * The one door into the fallback, and the reason nothing in setup had to change
 * when heraldry arrived. `charge` is a raw string because that is what the
 * simulation stores (`Player.charge`, uninterpreted like `color`), so a
 * misspelling or a charge from a build that had thirteen falls through to the
 * seat's own rather than throwing at draw time — a banner is not worth a crash.
 *
 * The modulo is written the long way for the same reason `playerPieceColor`'s
 * is: a negative index is not reachable today and `%` in this language would
 * return a negative one if it ever were.
 */
export function heraldryFor(playerIndex: number, charge?: string): HeraldryId {
  if (charge !== undefined && (HERALDRY_IDS as readonly string[]).includes(charge)) {
    return charge as HeraldryId;
  }
  const count = HERALDRY_IDS.length;
  return HERALDRY_IDS[((playerIndex % count) + count) % count]!;
}

/**
 * One charge as a standalone SVG document, inked in `color`.
 *
 * `resourceMarkSvg`'s sibling, through the same emitter (`markSvg`) on the same
 * grid at the same weight — which is the whole of why the two sets are one hand.
 */
export function heraldryMarkSvg(id: HeraldryId, color = '#000'): string {
  return markSvg(heraldryMark(id).paths, MARK_BOX, MARK_STROKE, color);
}

/**
 * The same document as a `data:` URI, for a DOM surface that masks it in
 * `currentColor` — the seat strip, a setup picker, a gallery page.
 *
 * Memoised exactly as the resources' is, and for the same reason: a roster
 * rebuilt on every state change would otherwise re-encode twelve SVGs a frame.
 */
const uriCache = new Map<string, string>();

export function heraldryMarkDataUri(id: HeraldryId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(heraldryMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}

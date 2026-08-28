/**
 * The pantheon's ten signs: one drawn mark per `BeliefAxis`, on the **house
 * 64-unit grid** at the house weight.
 *
 * Why the axes get drawings at all
 * --------------------------------
 * The axis has no player-facing *name* and never will (`pantheonWheel.ts`: a
 * printed axis name reads as a category the player is choosing between, which is
 * not what an axis is). The wheel's answer was geometry — gods of one thread sit
 * in adjacent houses — and the wheel also prints a mark on each house, which
 * until now was a **platform emoji** (`AXIS_MARK` in `religionScreen.ts`). An
 * emoji is fine in a DOM panel and is not available to the board at all: the
 * tile atlas is traced from path data and fetches nothing (the trap in
 * `CLAUDE.md`), so a religion that wanted to print its identity on a banner
 * needed the same ten signs as *marks*.
 *
 * So they are drawn here, in the hand `heraldryMarks.ts` and `siteMarks.ts`
 * share, and the board and the screen can both print them. The screen's emoji
 * are not this file's business and are not touched by it.
 *
 * What a religion's device is made of
 * -----------------------------------
 * A religion is named after its founder's axes (`generateReligionName`), and it
 * is **drawn** from them by the same reading: `religionAxes` walks the pantheon
 * in order, keeps the first appearance of each axis, and the device is the first
 * few of those signs laid out together. An empire that consecrated the Hearth
 * Mother and the Standing Stones flies hearth and stone, and looks like what it
 * is made of — which is the whole of the ruling that religions are fluid and
 * never a fixed roster with a fixed badge.
 *
 * The set is drawn as a **set**, which is the only way ten marks at eighteen
 * pixels on a banner can be told apart. Every one of them is a single closed
 * silhouette on the same optical centre, and no two share a family: a roof, a
 * star, a trilithon, a leaf, a wave, two crossed hafts, a fork in a track, a
 * disc with rays, a six-point flake, and a lozenge for the thread that is no
 * thread at all. Nothing here is a tool, a plant a resource already uses, or a
 * letterform.
 */

import { type MarkPath, MARK_BOX, MARK_STROKE, dot, ink, markSvg, poly, solid } from './resourceMarks';
import { type BeliefAxis, type BeliefId, beliefDef } from '../sim/religionData';

/**
 * One axis's drawing, plus the sentence that says what it depicts.
 *
 * `SiteMark`'s shape exactly, and exhaustive by type for its reason: `BeliefAxis`
 * is a closed union declared in TypeScript, so there is no "an axis nobody drew"
 * case to fall back from and the compiler says so.
 */
export interface PantheonMark {
  /** What the mark is a picture of. The row `CREDITS.md` would print. */
  note: string;
  paths: readonly MarkPath[];
}

const PANTHEON_MARKS: Record<BeliefAxis, PantheonMark> = {
  hearth: {
    note: 'a gabled roof over a fire: the household, and the thing at the middle of it',
    paths: [
      // The roof first, because the roof is the silhouette: two rakes and the
      // eaves they land on. A house drawn as a square with a triangle on it
      // reads as a hut at this size and collides with the village site mark, so
      // there are no walls at all — only the cover, and what is under it.
      ink('M8 34L32 12L56 34'),
      ink('M14 34V52H50V34'),
      // The flame, held small and centred: one lick, no fuel. It is the only
      // curve in the mark, which is what stops the whole thing reading as
      // architecture.
      ink('M32 46C27 42 30 36 32 33C34 36 37 42 32 46Z'),
    ],
  },
  sky: {
    note: 'an eight-point star, the long axes vertical and horizontal',
    paths: [
      // A star and not a sun: the rays are drawn as one filled concave figure so
      // it is a solid at any size, where the sun (below) is an outlined disc
      // with spokes. Two marks about light that must not read alike.
      solid(
        poly(
          32, 6, 37, 26, 58, 32, 37, 38, 32, 58, 27, 38, 6, 32, 27, 26,
        ),
      ),
    ],
  },
  stone: {
    note: 'a trilithon: two uprights and the lintel they carry',
    paths: [
      ink('M10 54H54'),
      ink(poly(14, 22, 26, 22, 26, 54, 14, 54)),
      ink(poly(38, 22, 50, 22, 50, 54, 38, 54)),
      // The lintel overhangs both posts, which is what makes three stones read
      // as a *raised* thing rather than as a squared arch.
      ink(poly(10, 12, 54, 12, 54, 22, 10, 22)),
    ],
  },
  wild: {
    note: 'a single antler, three tines off one beam',
    paths: [
      // Deliberately not a tree: the board grows pines by the thousand and a
      // conifer here would be scatter. An antler is the one wild silhouette
      // nothing else in the project uses.
      ink('M32 56V30'),
      ink('M32 34L20 22L18 10'),
      ink('M32 34L44 22L46 10'),
      ink('M20 22L10 18M44 22L54 18'),
    ],
  },
  water: {
    note: 'two crests, the near one full and the far one behind it',
    paths: [
      ink('M6 40C14 28 22 28 32 40C42 52 50 52 58 40'),
      ink('M6 24C14 14 22 14 32 24C42 34 50 34 58 24'),
    ],
  },
  war: {
    note: 'two hafts crossed, each with a leaf head',
    paths: [
      ink('M14 54L50 14M50 54L14 14'),
      // The heads are what say "spear" rather than "cross": a plain saltire is
      // a rejection mark everywhere else in this interface.
      solid(poly(50, 14, 46, 22, 42, 18)),
      solid(poly(14, 14, 22, 18, 18, 22)),
    ],
  },
  road: {
    note: 'a track forking, with a stone at the fork',
    paths: [
      ink('M32 58V36'),
      ink('M32 36L14 14M32 36L50 14'),
      // The waymarker. Without it a fork is an arrow, and an arrow on this board
      // means a march.
      solid(dot(32, 36, 5)),
    ],
  },
  sun: {
    note: 'a disc with eight short rays, none of them touching it',
    paths: [
      ink(dot(32, 32, 13)),
      ink('M32 4V13M32 51V60M4 32H13M51 32H60'),
      ink('M12 12L19 19M45 45L52 52M52 12L45 19M19 45L12 52'),
    ],
  },
  frost: {
    note: 'a six-point flake, each arm barbed once',
    paths: [
      ink('M32 6V58M9 19L55 45M55 19L9 45'),
      ink('M32 18L25 12M32 18L39 12M32 46L25 52M32 46L39 52'),
    ],
  },
  none: {
    note: 'a plain lozenge on point — the thread that is no thread',
    paths: [
      // The neutral pick, and most of the good ones (`BeliefAxis`). It has to
      // read as *deliberately blank* rather than as a mark that failed to load,
      // which is why it is a whole closed figure with a second inside it.
      ink(poly(32, 8, 54, 32, 32, 56, 10, 32)),
      ink(poly(32, 22, 43, 32, 32, 42, 21, 32)),
    ],
  },
};

/** The drawing for one belief axis. Total, by construction. */
export function pantheonMark(axis: BeliefAxis): PantheonMark {
  return PANTHEON_MARKS[axis];
}

/**
 * The axes a religion is made of, in the order its founder consecrated them.
 *
 * **`generateReligionName`'s own derivation** (`src/sim/religion.ts`), read
 * again here rather than imported, because that function does not return the
 * list — it consumes it into a name — and because a religion's *name* and its
 * *device* being made of the same axes in the same order is the whole point. The
 * two are pinned against each other in `test/render/pantheonMarks.test.ts`; if
 * the sim ever exports the derivation this becomes a re-export.
 *
 * First appearance wins and duplicates are dropped, so a pantheon of three
 * hearth gods is one hearth sign rather than three. An empty pantheon — which a
 * religion cannot have, but a hand-edited save can — answers `['none']`, exactly
 * as the name generator falls back to the neutral epithet.
 */
export function religionAxes(pantheon: readonly BeliefId[]): BeliefAxis[] {
  const axes: BeliefAxis[] = [];
  for (const id of pantheon) {
    const axis = beliefDef(id).axis;
    if (!axes.includes(axis)) axes.push(axis);
  }
  if (axes.length === 0) axes.push('none');
  return axes;
}

/**
 * How many signs a device is allowed to carry.
 *
 * Three, and it is a fact about *reading* rather than a taste: the device is
 * printed a fraction of a city flag's width, and a fourth sign at that size is
 * four smudges instead of three marks. A pantheon of seven gods flies the first
 * three threads it took, which is the identity it has had longest.
 */
export const DEVICE_MARKS = 3;

/**
 * The signs one religion's device is drawn from: its axes, at most `DEVICE_MARKS`
 * of them, in consecration order.
 *
 * Pure and total, and it is the whole of "a religion looks like what it is made
 * of". Deterministic by construction — there is no hashing here and no rng —
 * which is what lets two seats' boards, a replay and the gallery all draw the
 * same device for the same pantheon.
 */
export function religionDevice(pantheon: readonly BeliefId[]): BeliefAxis[] {
  return religionAxes(pantheon).slice(0, DEVICE_MARKS);
}

/**
 * One axis sign as a standalone SVG document, inked in `color`.
 *
 * `heraldryMarkSvg`'s sibling through the same emitter on the same grid at the
 * same weight, which is the whole of why the sets are one hand.
 */
export function pantheonMarkSvg(axis: BeliefAxis, color = '#000'): string {
  return markSvg(pantheonMark(axis).paths, MARK_BOX, MARK_STROKE, color);
}

/** The same document as a `data:` URI. Memoised — a gallery asks per repaint. */
export function pantheonMarkDataUri(axis: BeliefAxis, color = '#000'): string {
  const key = `${axis}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(pantheonMarkSvg(axis, color))}`;
  uriCache.set(key, uri);
  return uri;
}

const uriCache = new Map<string, string>();

/**
 * Sections 1, 2 and 8: every drawn mark in the game, the twelve charges as they
 * actually print, and the palette and type ramp the rest of it is judged
 * against.
 *
 * Every specimen here is asked of the module that draws the shipping thing.
 * There is no second copy of a path, a hex or a font stack anywhere on this
 * page: `RESOURCE_MARKS` is the table the tile atlas traces, `HERALDRY_IDS` is
 * the order a seat takes a charge in, and the tinctures are
 * `players.fallbackOrder` read out of `data/view3d.json`. A gallery that
 * transcribed any of them would be a gallery that goes stale silently, which is
 * the one failure mode a reference sheet cannot survive.
 *
 * Why the marks are shown as *masks* and not as pictures
 * -----------------------------------------------------
 * Every emitter here hands out a `data:` URI of an SVG inked in one colour, and
 * every consumer in the game masks `currentColor` through it rather than
 * showing it (`.res-mark` and its five siblings). So the page does the same,
 * which is what lets one drawing be shown in ink and in gilt on the same row
 * without asking for it twice — and it is also the honest test, because masking
 * is what the game does and a mask keeps only the alpha.
 */

import { statecraftMarkDataUri } from '../art/dockMarks';
import { type HeraldryId, HERALDRY_IDS, heraldryMarkDataUri } from '../art/heraldryMarks';
import { CARD_LINE_MARKS, SLOT_MARKS, cardLineMarkDataUri, slotMarkDataUri } from '../art/lineMarks';
import {
  DRACONES_LINES,
  MARGINALIA_MARK_IDS,
  marginaliaMark,
  marginaliaMarkDataUri,
} from '../art/marginaliaMarks';
import { METER_MARKS, RENOWN_MARK, meterMarkDataUri, renownMarkDataUri } from '../art/meterMarks';
import {
  MARK_BOX,
  MARK_STROKE,
  RESOURCE_MARKS,
  RESOURCE_MARK_STROKE,
  markSvg,
  resourceMarkDataUri,
} from '../art/resourceMarks';
import {
  pantheonMark,
  pantheonMarkDataUri,
  pantheonMarkSvg,
  religionDevice,
} from '../art/pantheonMarks';
import {
  NAVAL_CANTONS,
  NAVAL_CANTON_MARKS,
  NAVAL_HULLS,
  NAVAL_MARK_BOX,
  NAVAL_MARK_STROKE,
  NAVAL_RIGS,
} from '../art/navalMarks';
import { siteMark } from '../art/siteMarks';
import { SURVEY_MARK_IDS, surveyMark, surveyMarkDataUri } from '../art/surveyMarks';
import { YIELD_MARKS, yieldMarkDataUri } from '../art/yieldMarks';
import {
  BADGE_ICON_FILES,
  BADGE_LINES,
  type FileBadgeClass,
  drawNavalBadgeCell,
  nationBadgeStyle,
  navalBadgeId,
  wildBadgeStyle,
} from '../render3d/badges3d';
import { deviceLayout } from '../render3d/cities3d';
import { VIEW3D } from '../render3d/lookData';
import { DISCOVERY_KINDS } from '../sim/discoveryData';
import { BELIEF_AXES, type BeliefAxis, type BeliefId } from '../sim/religionData';
import { CORNER_STAR, PRINTER_DEVICE, cornerStarDataUri, printerDeviceDataUri } from '../ui/deviceMarks';
import { CARD_LINE_NAME } from '../ui/cardLine';
import { block, element, markCell, markGrid, uriOf } from './sheet';

/** A `#rrggbb` string for a palette entry, which the data holds as a number. */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * The twelve seat tinctures, paired with the charge that seat flies.
 *
 * `players.fallbackOrder` and `HERALDRY_IDS` are two lists of twelve read by
 * index off the same seat number (`playerPieceColor` and `heraldryFor`), so
 * zipping them here is not an arrangement this page invented — it is what seat
 * 0, seat 1 and seat 7 actually look like in a game nobody configured.
 */
export function seatTinctures(): { name: string; color: string; charge: HeraldryId }[] {
  return VIEW3D.players.fallbackOrder.map((color, index) => ({
    name: paletteNameOf(color),
    color: hex(color),
    charge: HERALDRY_IDS[index % HERALDRY_IDS.length]!,
  }));
}

/**
 * The palette name a colour came from, for the label under a tincture.
 *
 * `fallbackOrder` is parsed into *colours* by `lookData.ts` — the names are
 * checked against the palette at load and then dropped, because nothing in the
 * renderer needs them again. This page does, and the honest way to get one back
 * is the reverse lookup rather than a second list of twelve words that would
 * disagree with the data the first time somebody reordered it.
 */
function paletteNameOf(color: number): string {
  const entry = Object.entries(VIEW3D.palette).find(([, value]) => value === color);
  return entry?.[0] ?? hex(color);
}

// --- section 1: the drawn families -----------------------------------------

/** Every drawn family, each on its own block, each glyph labelled with its id. */
export function drawMarkFamilies(into: HTMLElement): void {
  yieldFamily(into);
  meterFamily(into);
  dockFamily(into);
  lineFamily(into);
  resourceFamily(into);
  siteFamily(into);
  surveyFamily(into);
  pantheonFamily(into);
  deviceFamily(into);
  badgeFamily(into);
  navalFamily(into);
  heraldryFamily(into);
  marginaliaFamily(into);
}

function yieldFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Yields — src/art/yieldMarks.ts',
      'The six voices, on their own 24-unit grid at weight 2.75 (the vendored set is not the house grid). Printed on every figure the game quotes a cost or a surplus in.',
    ),
  );
  for (const [key, mark] of Object.entries(YIELD_MARKS)) {
    markCell(grid, key, yieldMarkDataUri(key as keyof typeof YIELD_MARKS), mark.note);
  }
}

function meterFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Meters — src/art/meterMarks.ts',
      'Happiness, Authority and Renown, on the yields’ grid because they are read in the same strip. All three are vendored: the wreath is the great-person badge’s own Tabler drawing, so the chip and the piece wear one picture.',
    ),
  );
  for (const [key, mark] of Object.entries(METER_MARKS)) {
    markCell(grid, key, meterMarkDataUri(key as keyof typeof METER_MARKS), mark.note);
  }
  // Renown is the family's third member and not a `MeterId` — see the export's
  // docblock — so it is drawn beside the two rather than inside the loop.
  markCell(grid, 'renown', renownMarkDataUri(), RENOWN_MARK.note);
}

function dockFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'The dock — src/art/dockMarks.ts',
      'One mark, and it opens the Statecraft sheet from the HUD dock.',
    ),
  );
  markCell(grid, 'statecraft', statecraftMarkDataUri(), 'the Orders & Doctrines dock button');
}

function lineFamily(into: HTMLElement): void {
  const lines = markGrid(
    block(
      into,
      'Card lines — src/art/lineMarks.ts',
      'The seven archetype threads and the neutral seal, drawn as the tarot emblem in the middle of a card face. `none` is most of a good hand, which is why it is a real drawing rather than an absence.',
    ),
  );
  for (const [id, mark] of Object.entries(CARD_LINE_MARKS)) {
    const line = id as keyof typeof CARD_LINE_MARKS;
    markCell(lines, `${id} · ${CARD_LINE_NAME[line]}`, cardLineMarkDataUri(line), mark.note);
  }

  const slots = markGrid(
    block(into, 'Slot marks — the same file', 'What kind of place a card goes in, on the government’s slot row.'),
  );
  for (const [id, mark] of Object.entries(SLOT_MARKS)) {
    markCell(slots, id, slotMarkDataUri(id as keyof typeof SLOT_MARKS), mark.note);
  }
}

/**
 * The resource marks, which as of the one-hand pass are **one family on one
 * grid** — and the page says where every single drawing came from.
 *
 * They used to be two hands under one weight (thirty-two of ours on the house
 * 64, nine Tabler ports on upstream's 24), which is what the user read off the
 * board: a shared weight is not a shared hand. All forty-one are on the badge
 * roster's 24-unit grid at its 2.75 now, some vendored and some drawn here in
 * that geometry, and `ResourceMark.credit` says which for every row — so the
 * split is read off the marks rather than listed here, and moving a row from one
 * column to the other is an edit to `resourceMarks.ts` alone.
 */
function resourceFamily(into: HTMLElement): void {
  const ids = Object.keys(RESOURCE_MARKS);
  const ported = ids.filter((id) => RESOURCE_MARKS[id]!.credit.startsWith('Tabler')).length;
  const grid = markGrid(
    block(
      into,
      `Resources — src/art/resourceMarks.ts (${ids.length})`,
      `One hand, one grid: all ${ids.length} on Tabler's 24-unit box at weight ${RESOURCE_MARK_STROKE} — ${ported} vendored from Tabler (MIT), ${ids.length - ported} drawn here in that geometry where no icon set has the thing. The badges and the six yield voices are the same box at the same weight; the house 64 at ${MARK_STROKE} is the *other* families below. Printed on the tile roundels, in the readout, the ledgers and the resource lens.`,
    ),
  );
  for (const id of ids) {
    const uri = resourceMarkDataUri(id);
    if (uri === null) continue;
    const mark = RESOURCE_MARKS[id]!;
    const cell = markCell(grid, id, uri, mark.note);
    cell.append(element('div', 'mark-note', mark.credit));
  }
}

function siteFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Sites — src/art/siteMarks.ts',
      'Architecture on a ground line, so a discovery can never be mistaken for an economy. Printed on the hex tablet a ruin or a village stands under.',
    ),
  );
  for (const kind of DISCOVERY_KINDS) {
    const mark = siteMark(kind);
    markCell(grid, kind, uriOf(markSvg(mark.paths, MARK_BOX, MARK_STROKE)), mark.note);
  }
}

/**
 * The survey's notes.
 *
 * Shown in the page's own ink like every other family — `markCell` masks each
 * swatch, so a mark's *drawn* colour never reaches this page anyway — and the
 * one thing that costs is said out loud in the block instead: on the board this
 * is the only family printed in the chart's faded hand rather than in ink,
 * because "faint" in an alpha-tested atlas is a colour and never an opacity.
 */
function surveyFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Survey notes — src/art/surveyMarks.ts',
      `What an empire holding Geomancy sees over a hill with a seam still sleeping under it: the ground line, the hill on it, and two broken courses under both. Drawn bare into the vellum with no paper behind it — a note the surveyor pencilled on his own chart rather than a token laid on the board — and deliberately not a picture of any commodity, because which seam it is costs a worker’s turn. Printed on the hex in ${paletteNameOf(VIEW3D.icons.inscriptionColor)}, the chart’s remark ink, which it shares with the marginalia below.`,
    ),
  );
  for (const id of SURVEY_MARK_IDS) {
    markCell(grid, id, surveyMarkDataUri(id), surveyMark(id).note);
  }
}

/**
 * The naval marks: five hulls, three cantons, and the fifteen composed badges.
 *
 * **Three blocks, because the set answers three questions** — the pantheon's
 * argument one family over. The hulls have to be five things a reader can rank
 * at twelve pixels, which is a question about the row of five. The cantons have
 * to be three things a reader can tell apart in a *corner*, printed at a third
 * the size, which is a question this page answers by showing them at 12 as well
 * as at 64. And the badge is neither of those: it is the two drawings composed
 * on one roundel, and whether a Galley reads as a Galley next to a Tower Ship is
 * a question only the composed cells can answer.
 *
 * The third block is the shipping composition rather than a picture of it — the
 * cells are painted by `drawNavalBadgeCell`, the same function the atlas calls,
 * onto a canvas of the atlas's own cell size — so a nudge to the canton's inset
 * or its heavier stroke shows up here without this file being touched.
 */
function navalFamily(into: HTMLElement): void {
  const hulls = markGrid(
    block(
      into,
      'Naval hulls — src/art/navalMarks.ts',
      'One drawn hull per age, and the rank is what changes the silhouette rather than the detail: oars and a pennant with nothing above the sheer, one square sail, that sail with a fighting castle, two masts, three. Read the row at 12 — a rank a reader cannot count at twelve pixels is a rank the board never says out loud.',
    ),
  );
  for (const rig of NAVAL_RIGS) {
    const mark = NAVAL_HULLS[rig];
    hulls.append();
    markCell(
      hulls,
      `rig ${rig}`,
      uriOf(markSvg(mark.paths, NAVAL_MARK_BOX, NAVAL_MARK_STROKE)),
      mark.note,
    );
  }

  const cantons = markGrid(
    block(
      into,
      'Naval cantons — the three classes',
      'Tabler outline marks (MIT), inlined as path data like every other mark in the atlas. Printed small on the badge’s parchment corner, in the corner a player already reads as “which one of these is it” — the corner a seat’s heraldic charge takes.',
    ),
  );
  for (const canton of NAVAL_CANTONS) {
    const mark = NAVAL_CANTON_MARKS[canton];
    markCell(
      cantons,
      canton,
      uriOf(markSvg(mark.paths, NAVAL_MARK_BOX, NAVAL_MARK_STROKE)),
      `${mark.note} · ${mark.credit}`,
    );
  }

  drawNavalBadges(into);
}

/**
 * The fifteen composed badges, painted by the atlas's own painter.
 *
 * Canvas rather than SVG, and that is the point rather than a shortcut: the
 * composition — the hull's inset, the canton's corner, its heavier stroke at a
 * third the size — lives in `drawNavalBadgeCell`, so a page that re-emitted it
 * as two overlaid SVGs would be a second implementation drifting from the first.
 * Each cell is a one-cell atlas at the shipping cell size, printed in the
 * nation's ink and again in the wild's, which is the only place the barbarian
 * treatment of this set can be judged.
 */
function drawNavalBadges(into: HTMLElement): void {
  const root = block(
    into,
    'Naval badges — hull × canton, composed',
    'The fifteen cells the atlas actually prints, each the age’s hull with its class’s mark on the corner — plus the wild’s second print of the same drawings, which is the whole cost of a barbarian fleet on the board. Painted here by `drawNavalBadgeCell`, the function the atlas calls, so this is the shipping badge rather than a picture of one.',
  );
  for (const rig of NAVAL_RIGS) {
    const grid = markGrid(root);
    for (const canton of NAVAL_CANTONS) {
      const id = navalBadgeId(rig, canton);
      const cell = element('div', 'mark-cell');
      const row = element('div', 'mark-row');
      for (const style of [nationBadgeStyle(), wildBadgeStyle()]) {
        const canvas = document.createElement('canvas');
        const size = VIEW3D.badges.atlasCell;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (context) {
          drawNavalBadgeCell(
            context,
            0,
            { cell: size, columns: 1, rows: 1, width: size, height: size },
            canton,
            rig,
            style,
          );
        }
        canvas.style.width = '64px';
        canvas.style.height = '64px';
        row.append(canvas);
      }
      cell.append(row, element('div', 'mark-id', id));
      grid.append(cell);
    }
  }
}

/**
 * The pantheon's ten threads, and the devices they compose into.
 *
 * Two blocks, because the set answers two questions and only the second one is
 * the point. The signs themselves have to be ten things a player can tell apart
 * at eighteen pixels on a banner; the **devices** have to be things a player can
 * tell apart from each other, which is a question about two or three signs
 * overlapping and cannot be answered by a grid of singles.
 *
 * The sample religions are made up here and are the honest kind of made up: they
 * are `religionDevice` fed real `BeliefId`s, so the arrangement, the cap at three
 * and the first-appearance-wins ordering are all the shipping function's — the
 * only invention is which gods a fictional empire happened to consecrate.
 */
function pantheonFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Pantheon axes — src/art/pantheonMarks.ts',
      'One sign per belief thread, printed on the fly of a city banner when the town follows a faith made of it. The wheel groups gods of one thread into adjacent houses; this is the same thread said as a mark, for the surface that cannot print an emoji.',
    ),
  );
  for (const axis of BELIEF_AXES) {
    const mark = pantheonMark(axis);
    markCell(grid, axis, pantheonMarkDataUri(axis), mark.note);
  }

  const devices = block(
    into,
    'Religion devices — the same signs, composed',
    'A religion is named after its founder’s axes and drawn from them by the same reading: first appearance wins, at most three (`religionDevice`). One sign sits dead centre, two side by side, three in a triangle point-up — `deviceLayout`, which is the arithmetic the banner uses. On the board these print in ink on parchment over a canton in the founder’s tincture.',
  );
  const samples: [string, BeliefId[]][] = [
    ['one thread', ['keeperOfTheHearth']],
    ['two', ['keeperOfTheHearth', 'theStandingStones']],
    ['three', ['keeperOfTheHearth', 'theStandingStones', 'starReaders']],
    // Four gods on three threads: the second hearth god adds nothing to the
    // device, which is the first-appearance rule doing its job.
    ['four gods, three threads', [
      'keeperOfTheHearth',
      'goddessOfTheHarvest',
      'theStandingStones',
      'starReaders',
    ]],
  ];
  const row = markGrid(devices);
  for (const [label, pantheon] of samples) {
    const axes = religionDevice(pantheon);
    markCell(
      row,
      label,
      uriOf(deviceSvg(axes)),
      axes.join(' · '),
    );
  }

  faithLensSwatch(into);
}

/**
 * The faith lens's swatch, which is deliberately a swatch of **nothing of its
 * own**.
 *
 * Every other lens on this board picks its inks and could be shown as a row of
 * chips. This one paints in whoever *founded* the faith that is pressing, so
 * what there is to judge is the **ramp**: how a hex reads at one point of
 * pressure against a hex at saturation, in a tincture that is already carrying
 * a border and a flag. So the row is one seat's ink at both ends of the ramp
 * plus the two ring strengths, over the board's own ground colour — which is
 * the only ground the wash is ever seen on.
 *
 * Read out of `data/view3d.json` rather than written here, this page's standing
 * rule: retune `lens.faithOpacity` and this moves.
 */
function faithLensSwatch(into: HTMLElement): void {
  const LENS = VIEW3D.lens;
  const root = block(
    into,
    'The faith lens — src/render3d/lens3d.ts',
    'Every hex a town owns, washed in the ink of whoever founded the faith pressing hardest on it, at an alpha that is how hard. Unclaimed ground gets nothing: the tide is a fact about towns and this lens does not invent a second reading of it. Over the wash, a holy site is ringed tight and bright; a town that follows a faith rings strong in its founder’s ink, and one merely pressed rings faint.',
  );
  const strip = element('div', 'chart-row');
  const ground = hex(VIEW3D.palette.sage ?? 0x8fa06a);
  const grades: [string, number, string][] = [
    ['1 pressure', LENS.faithMinOpacity, 'the floor — a town one point from turning must still be visible'],
    [
      `${String(Math.round(LENS.faithFullPressure / 2))} pressure`,
      (LENS.faithMinOpacity + LENS.faithOpacity) / 2,
      'halfway up the ramp',
    ],
    [
      `${String(Math.round(LENS.faithFullPressure))}+ pressure`,
      LENS.faithOpacity,
      'saturation — `faithFullPressure`, and no further',
    ],
    ['holy site ring', LENS.faithSiteRingOpacity, 'the anchor, at `faithSiteRingScale` of a hex'],
    ['follows ring', LENS.faithFollowRingOpacity, 'strong — the town’s own majority'],
    ['pressed ring', LENS.faithPressedRingOpacity, 'faint — pressed, not yet turned'],
  ];
  for (const [label, opacity, note] of grades) {
    const cell = element('div', 'mark-cell');
    const chip = element('div', 'palette-chip');
    const ink = element('div', 'palette-ink');
    // The wash as it actually composites: the seat's ink at that alpha, over the
    // board's ground. A chip of the ink alone would be a picture of a colour the
    // player never sees.
    ink.style.background = seatTinctures()[0]!.color;
    ink.style.opacity = String(opacity);
    chip.style.background = ground;
    chip.append(ink);
    cell.append(chip, element('div', 'mark-id', label), element('div', 'mark-note', note));
    strip.append(cell);
  }
  root.append(strip);
}

/**
 * A device as one SVG, laid out by the banner's own arithmetic.
 *
 * `deviceLayout` returns seats in units of `deviceMarkSpread`, which is a world
 * measurement, so the page converts once — the ratio of a sign's size to the
 * spread is the only thing that carries across, and it is read out of
 * `view3d.json` rather than chosen here. Draw the same three arrangements the
 * flag draws, at the same proportions, or the page is a picture of a different
 * device.
 */
function deviceSvg(axes: readonly BeliefAxis[]): string {
  const CITY = VIEW3D.city;
  const spread = (MARK_BOX * CITY.deviceMarkSpread) / CITY.deviceMarkSize;
  const seats = deviceLayout(axes.length);
  const marks = axes
    .map((axis, index) => {
      const seat = seats[index]!;
      // y is up the banner and down the document, which is the one flip. The
      // inner document's own `<svg>` wrapper is stripped and its `<g>` kept —
      // that group is where the weight and the cap style live, so a device is
      // drawn at exactly the hand the singles above it are.
      const body = pantheonMarkSvg(axis).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      return `<g transform="translate(${round(seat.x * spread)} ${round(-seat.y * spread)})">${body}</g>`;
    })
    .join('');
  const box = MARK_BOX + spread * 2;
  const pad = spread;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(-pad)} ${round(-pad)} ${round(box)} ${round(box)}">` +
    `${marks}</svg>`
  );
}

/** Two decimals, for readable path data. `resourceMarks`' own `n`, one page over. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function deviceFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Devices — src/ui/deviceMarks.ts',
      'The corner star every panel wears at ~10px, and the printer’s device under the title at 46px. Neither is ever seen at 64 in the game; that column is the drawing, not the print.',
    ),
  );
  markCell(grid, 'CORNER_STAR', cornerStarDataUri(), CORNER_STAR.note);
  markCell(grid, 'PRINTER_DEVICE', printerDeviceDataUri(), PRINTER_DEVICE.note);
}

/**
 * The badge icons — the one family on this page that is **not** path data in a
 * module.
 *
 * Twenty vendored SVG files under `public/`, rasterised into the unit-badge
 * atlas by the only `loadIcon` call left in the renderer: one mark per roster row
 * since the 2026-08-28 ruling ("could we get unique badges for each unit type").
 * Shown exactly as everything else is, masked through `currentColor`, which is
 * what the atlas does to them too (it recolours them to the badge's ink) — and at
 * the same three sizes, which is the whole point of putting them on this page:
 * **12** is about what a badge is on a zoomed-out board, and a set that dissolves
 * there is a set nobody has checked.
 *
 * Laid out **by line** rather than in atlas order, off `BADGE_LINES`, and that is
 * the change this page owed the ruling. Twenty marks in a grid is twenty marks;
 * the question the ruling actually asks — can a warrior be told from a swordsman
 * from a longswordsman — is a question about three cells beside each other, and
 * it can only be answered by a page that puts them beside each other. The line
 * table is read out of `badges3d.ts` rather than written here, for this page's
 * standing rule: a gallery that transcribed the set would go stale silently.
 *
 * Their being files is the reason there is no note under each *cell*: a file has
 * no `note` field, and inventing one here would be inventing provenance —
 * `public/sprites/CREDITS.md` is where that lives, and there is real provenance
 * to keep straight, because eleven of the twenty-one are somebody else's
 * drawings.
 * What each line gets instead is the sentence saying how its ranks differ, which
 * is a fact about the *set* and lives with the set.
 */
function badgeFamily(into: HTMLElement): void {
  const root = block(
    into,
    'Badge icons — public/sprites/icons/*.svg',
    'One mark per unit type, on the parchment badge that floats over a piece: the family says the line and the axis or the count says the rank, because those are the two things that survive twenty-four pixels. Tabler Icons (MIT) at the yield marks’ weight where Tabler has the shape, drawn here in Tabler’s geometry where it has not — no icon set in the world draws a catapult, a trebuchet, a pike, a chariot, a crossbow, a club, or a caravan that is not a modern trailer. Vendored files rather than path data: the last set in the game that is fetched at all.',
  );
  for (const line of BADGE_LINES) {
    // The naval line is drawn from path data and has its own three blocks
    // (`navalFamily`), which is the whole of `FileBadgeClass`' split made
    // visible: this block is the half of the set that is a *file*, and a cell
    // with no file in it is not missing — it is somewhere else on this page.
    const files = line.members.filter(
      (cls): cls is FileBadgeClass => BADGE_ICON_FILES[cls as FileBadgeClass] !== undefined,
    );
    if (files.length === 0) continue;
    root.append(element('p', 'sheet-note', `${line.line} — ${line.note}`));
    const grid = markGrid(root);
    for (const cls of files) markCell(grid, cls, `/${BADGE_ICON_FILES[cls]}`);
  }
  drawBadgeRoundels(root);
}

/**
 * The roundel itself, printed both ways: a nation's, and the wild's.
 *
 * The row above shows the *drawings*; this one shows the **badge**, which is a
 * different object — parchment, a mark, and a rim of somebody's colour — and it
 * is the only place on this page where the barbarian treatment can be judged,
 * because that treatment is entirely a matter of which three colours the same
 * twenty drawings are printed in (`BadgeSpec.wildPaperColor` and its two
 * siblings; `UnitBadges` prints the atlas twice).
 *
 * Every number and colour is read out of `data/view3d.json` through `VIEW3D` —
 * the disc's diameter as a ratio to its rim's width, the paper, the ink, the two
 * rims — so this is the shipping badge at gallery scale rather than a picture of
 * one.
 *
 * **Three and not two**, and the third is the point of the row. Seat 0's own
 * tincture is crimson, which is close enough to the wild's oxblood that a rim
 * alone would not tell them apart — so the near-miss case is drawn here beside
 * the wild rather than left to be discovered on a board. What separates them is
 * the *paper*, which is most of a roundel's area and the thing the eye reads
 * first, and the mark's ink behind it. A version of this treatment that lost the
 * darkened parchment and kept only the red rim would look right in isolation and
 * fail against exactly one seat.
 */
function drawBadgeRoundels(into: HTMLElement): void {
  const BADGE = VIEW3D.badges;
  const row = element('div', 'mark-grid');
  const tinctures = seatTinctures();
  const specs: { id: string; paper: number; ink: number; rim: string; note: string }[] = [
    {
      id: `a nation · ${tinctures[1]!.name}`,
      paper: BADGE.paperColor,
      ink: BADGE.inkColor,
      rim: tinctures[1]!.color,
      note: 'bone parchment, ink mark, the seat’s own tincture on the rim',
    },
    {
      id: `a nation · ${tinctures[0]!.name}`,
      paper: BADGE.paperColor,
      ink: BADGE.inkColor,
      rim: tinctures[0]!.color,
      note: 'the near miss: seat 0 flies a red of its own, so the rim cannot be the thing that says “wild”',
    },
    {
      id: 'the wild',
      paper: BADGE.wildPaperColor,
      ink: BADGE.wildInkColor,
      rim: hex(BADGE.wildRimColor),
      note: 'darkened parchment and oxblood — a barbarian is a seat the sim needs and not a nation the player negotiates with',
    },
  ];
  for (const spec of specs) {
    const cell = element('div', 'mark-cell');
    const disc = element('div');
    // Sized off the data's own ratio: the rim is `rimWidth` of a `diameter`-wide
    // disc, so a badge redrawn twice as fat in the game gets fatter here too.
    const size = 64;
    disc.style.width = `${size}px`;
    disc.style.height = `${size}px`;
    disc.style.borderRadius = '50%';
    disc.style.background = hex(spec.paper);
    disc.style.border = `${(size * BADGE.rimWidth) / BADGE.diameter}px solid ${spec.rim}`;
    disc.style.boxSizing = 'border-box';
    disc.style.display = 'grid';
    disc.style.placeItems = 'center';
    const mark = element('span', 'mark-swatch');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.setProperty('--mark', `url("/${BADGE_ICON_FILES.melee}")`);
    mark.style.setProperty('--mark-size', `${Math.round(size * BADGE.iconScale)}px`);
    mark.style.color = hex(spec.ink);
    disc.append(mark);
    cell.append(disc, element('div', 'mark-id', spec.id), element('div', 'mark-note', spec.note));
    row.append(cell);
  }
  into.append(row);
}

function heraldryFamily(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Heraldry — src/art/heraldryMarks.ts',
      'Twelve charges, in the order a seat takes them. Section 2 shows them on the ground they actually print on.',
    ),
  );
  for (const id of HERALDRY_IDS) {
    markCell(grid, id, heraldryMarkDataUri(id));
  }
}

function marginaliaFamily(into: HTMLElement): void {
  const root = block(
    into,
    'Marginalia — src/art/marginaliaMarks.ts',
    'The only purely decorative marks in the project: what a cartographer draws in the part of the sea he has never been to. One drawing and one inscription, which is why they are two members of one module and not two rows of one table.',
  );
  const grid = markGrid(root);
  for (const id of MARGINALIA_MARK_IDS) {
    markCell(grid, id, marginaliaMarkDataUri(id), marginaliaMark(id).note);
  }

  // The inscription is *words*, so it is set rather than drawn — and set here in
  // the class the panels use, which is the whole claim `.inscription` makes:
  // one tracked small-cap voice, wherever it lands. The board's own rasteriser
  // sets the same two lines at `icons.inscriptionTracking`; section 7 shows it.
  const plate = element('div', 'mark-cell');
  const lines = element('div', 'inscription');
  lines.style.fontFamily = 'var(--face-display)';
  lines.style.fontSize = '1.5rem';
  lines.style.lineHeight = '1.35';
  lines.style.color = 'var(--ink-soft)';
  lines.style.textAlign = 'center';
  for (const line of DRACONES_LINES) lines.append(element('div', undefined, line));
  plate.append(lines, element('div', 'mark-id', 'DRACONES_LINES'), element('div', 'mark-note', 'set, not drawn — two lines because an atlas cell is square'));
  grid.append(plate);
}

// --- section 2: heraldry as it prints ---------------------------------------

/** The twelve charges on their twelve tinctures, each on its parchment canton. */
export function drawHeraldry(into: HTMLElement): void {
  const root = block(
    into,
    'The canton',
    'Every charge on the tincture the same seat flies, printed the way the board prints it: on parchment, never straight in the seat’s ink. The twelve tinctures run sky to ink and no single ink reads on all of them.',
  );
  const grid = element('div', 'tincture-grid');
  for (const seat of seatTinctures()) {
    const cell = element('div', 'tincture');
    cell.style.setProperty('--seat-tincture', seat.color);
    const canton = element('div', 'tincture-canton');
    const mark = element('span', 'mark-swatch mark-ink');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.setProperty('--mark', `url("${heraldryMarkDataUri(seat.charge)}")`);
    mark.style.setProperty('--mark-size', '30px');
    canton.append(mark);
    cell.append(canton, element('span', 'tincture-label', `${seat.charge} · ${seat.name}`));
    grid.append(cell);
  }
  root.append(grid);
}

/**
 * The seat chip, exactly as the top bar builds it.
 *
 * The markup is `renderSeats`' own — a `button.seat` carrying `--seat-color`,
 * with a `span.seat-charge` prepended — so this row is a genuine test of the
 * thing that ships rather than a picture of it. The last chip wears `is-done`,
 * which inverts the chip to parchment and takes the charge with it: the mark is
 * masked in `currentColor` and that is the whole reason it can be.
 */
export function drawSeatChips(into: HTMLElement): void {
  const root = block(
    into,
    'The seat chip',
    'The top bar’s roster, at 11px on ink. `is-local` is the seat this client plays; `is-done` has ended its turn and inverts — the charge inverts with it, because it is a mask and not a picture.',
  );
  const strip = element('div', 'seat-strip');
  seatTinctures()
    .slice(0, 6)
    .forEach((seat, index) => {
      const chip = element('button', 'seat', `Seat ${index + 1}`);
      chip.type = 'button';
      chip.classList.toggle('is-local', index === 0);
      chip.classList.toggle('is-done', index === 5);
      if (index === 5) chip.textContent = 'Seat 6 ✓';
      chip.style.setProperty('--seat-color', seat.color);
      const charge = element('span', 'seat-charge');
      charge.setAttribute('aria-hidden', 'true');
      charge.style.setProperty('--seat-charge', `url("${heraldryMarkDataUri(seat.charge)}")`);
      chip.prepend(charge);
      strip.append(chip);
    });
  root.append(strip);
}

// --- section 8: palette and ramp -------------------------------------------

/** The world's palette, the seat tinctures, and the four faces at their sizes. */
export function drawPaletteAndRamp(into: HTMLElement): void {
  const palette = block(
    into,
    'The world palette — data/view3d.json',
    'Every colour the diorama is allowed. Terrain, features, pieces and props all resolve through these names, which is what keeps the board one set of paints.',
  );
  const grid = element('div', 'palette-grid');
  for (const [name, color] of Object.entries(VIEW3D.palette)) {
    grid.append(paletteChip(name, hex(color as number)));
  }
  palette.append(grid);

  const seats = block(
    into,
    'The seat tinctures — players.fallbackOrder',
    'Twelve, in the order an unconfigured roster takes them. The order is load-bearing: reordering it re-banners every game that never named a colour.',
  );
  const seatGrid = element('div', 'palette-grid');
  for (const seat of seatTinctures()) seatGrid.append(paletteChip(seat.name, seat.color));
  seats.append(seatGrid);

  const ramp = block(
    into,
    'The type ramp — docs/design-specimen.html',
    'Four faces, one rule each: Instrument Serif announces, Fraunces names, Instrument Sans works, IBM Plex Mono counts. No serif below ~15px.',
  );
  const stack = element('div', 'ramp');
  for (const [cls, label, text] of [
    ['r-display', 'display · Instrument Serif', 'The Age of Omens closes'],
    ['r-city', 'name · Fraunces', 'Uruk ✶'],
    ['r-flavor', 'flavour · Instrument Serif italic', 'Non omnis moriar'],
    ['r-ui', 'ui · Instrument Sans', 'Build a granary'],
    ['r-num', 'figure · IBM Plex Mono', '+12 · −4 · 108 · T 41'],
  ] as const) {
    const row = element('div', 'ramp-row');
    row.append(element('span', 'label', label), element('div', cls, text));
    stack.append(row);
  }
  ramp.append(stack);
}

function paletteChip(name: string, color: string): HTMLElement {
  const chip = element('div', 'palette-chip');
  const ink = element('div', 'palette-ink');
  ink.style.setProperty('--chip-color', color);
  chip.append(ink, element('span', 'palette-name', name), element('span', 'palette-hex', color));
  return chip;
}

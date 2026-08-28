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
import { METER_MARKS, meterMarkDataUri } from '../art/meterMarks';
import {
  MARK_BOX,
  MARK_STROKE,
  RESOURCE_MARKS,
  RESOURCE_MARK_STROKE,
  markSvg,
  resourceMarkDataUri,
} from '../art/resourceMarks';
import { siteMark } from '../art/siteMarks';
import { YIELD_MARKS, yieldMarkDataUri } from '../art/yieldMarks';
import { BADGE_CELLS, BADGE_ICON_FILES } from '../render3d/badges3d';
import { VIEW3D } from '../render3d/lookData';
import { DISCOVERY_KINDS } from '../sim/discoveryData';
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
  deviceFamily(into);
  badgeFamily(into);
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
      'Happiness and Authority, on the yields’ grid because they are read in the same strip.',
    ),
  );
  for (const [key, mark] of Object.entries(METER_MARKS)) {
    markCell(grid, key, meterMarkDataUri(key as keyof typeof METER_MARKS), mark.note);
  }
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
 * The badge-class icons — the one family on this page that is **not** path data
 * in a module.
 *
 * Twelve vendored SVG files under `public/`, rasterised into the unit-badge
 * atlas by the only `loadIcon` call left in the renderer. Twelve and not eight
 * because four of them are not model classes at all (`BadgeClass` in
 * `badges3d.ts`): a great person stands on the settler's sculpt and an augur on
 * the worker's, and neither may wear the name of the body it borrows; the spear
 * line shares the swordsman's sculpt and earns its own mark from the other
 * direction, because sword and spear answer two different threats; and a caravan
 * borrows the worker's body but lays road instead of building on it. Shown exactly
 * as everything else is, masked through `currentColor`, which is what the atlas
 * does to them too (it recolours them to the badge's ink) — and at the same
 * three sizes, which is the whole point of putting them on this page: **12** is
 * about what a badge is on a zoomed-out board, and a set that dissolves there is
 * a set nobody has checked.
 *
 * Their being files is the reason there is no note under them: a file has no
 * `note` field, and inventing one on this page would be inventing provenance —
 * `public/sprites/CREDITS.md` is where that lives, and since the icon pass there
 * is real provenance to keep straight, because nine of the twelve are somebody
 * else's drawings.
 */
function badgeFamily(into: HTMLElement): void {
  const root = block(
    into,
    'Badge classes — public/sprites/icons/*.svg',
    'The eight model classes, the laurel every great person wears, the candle every religious piece does, the spear the anti-cavalry line does, and the crate a caravan does, on the parchment badge that floats over a piece. Tabler Icons (MIT) at the yield marks’ weight, save the horse-archer, the catapult and the spear, which Tabler has not got. Vendored files rather than path data — the last set in the game that is fetched at all.',
  );
  const grid = markGrid(root);
  for (const cls of BADGE_CELLS) markCell(grid, cls, `/${BADGE_ICON_FILES[cls]}`);
  drawBadgeRoundels(root);
}

/**
 * The roundel itself, printed both ways: a nation's, and the wild's.
 *
 * The row above shows the *drawings*; this one shows the **badge**, which is a
 * different object — parchment, a mark, and a rim of somebody's colour — and it
 * is the only place on this page where the barbarian treatment can be judged,
 * because that treatment is entirely a matter of which three colours the same
 * twelve drawings are printed in (`BadgeSpec.wildPaperColor` and its two
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

/**
 * Entry point for The Flair Cabinet — the art inspection gallery.
 *
 * The fourth look-dev page beside `proto3d.html`, `pieces.html` and
 * `mapgen.html`, and it makes the same bargain every one of them does: it
 * exists to answer a question, and it reads the real thing to answer it. The
 * Armory asks "do eight model classes read as eight kinds of thing"; the map
 * page asks "does the generator make a world worth playing". This one asks the
 * question the two art passes could not answer while their work was scattered
 * across a running game:
 *
 *   **does the apparatus hold together, and does each piece of it survive the
 *   size it is actually printed at?**
 *
 * Every ornament in Entry VII's ratified set is a thing you normally meet
 * *behind something else* — a star in the gutter of a card full of numbers, a
 * frame round a proclamation you are reading, a charge at 11px on a chip in a
 * strip of twelve. Half of them are also rare on purpose: the epigraph shows one
 * of six per visit, the marginalia are rolled at three percent on hexes nobody
 * has walked, and a town's third-age roofs need forty turns and a technology.
 * So they are here, all at once, each alone on a surface, with a knob wherever a
 * knob helps.
 *
 * Nothing is reproduced
 * ---------------------
 * There is no second copy of a path, a hex, a font stack or a sculpt on this
 * page. The marks come from `src/art/`, the flourishes wear the game's own
 * classes out of `src/style.css`, the wheel is `drawPantheonWheel` (the religion
 * screen's own, extracted so both callers are one function), and the six cities
 * are six real `GameState`s drawn by the real `CityLayer`. A gallery that
 * transcribed any of it would go stale silently, which is the one failure mode
 * a reference sheet cannot survive.
 *
 * The one thing it does not do is *play*. There is no map, no turn and no
 * command anywhere on this page — the city fixtures found a town and stop.
 */

import '../style.css';
import './style.css';

import { installFlourishMarks } from '../ui/deviceMarks';
import { CityStrip, PART_CAPTIONS, PART_IDS, PartsShelf } from './cityStage';
import { drawMarginaliaSwatches } from './chart';
import { drawFlourishes, drawFrontispiece, drawWheel } from './flourishes';
import {
  drawHeraldry,
  drawMarkFamilies,
  drawPaletteAndRamp,
  drawSeatChips,
  seatTinctures,
} from './marks';
import { block, checkbox, controls, element, section, select } from './sheet';

function requireElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const indexNav = requireElement<HTMLElement>('index');
const sheet = requireElement<HTMLElement>('sheet');

// The corner star is worn by a *pseudo-element*, which has no `style` object
// for a module to write a mask onto — so the picture is handed to the document
// root exactly as `main.ts` hands it to the game. Without this call every
// `.hud-card` on the page would wear an empty box.
installFlourishMarks(document.documentElement);

// --- the index --------------------------------------------------------------

const entries: { id: string; title: string }[] = [];

function open(id: string, title: string, where: string): HTMLElement {
  entries.push({ id, title });
  return section(sheet, id, title, where).root;
}

// --- 1. the marks -----------------------------------------------------------

drawMarkFamilies(
  open(
    'marks',
    'Marks',
    'Every drawn family in the game, at 12 / 24 / 64px in ink and once in gilt. 12 is where a mark dies, 24 is where it works, and 64 is the grid it was drawn on.',
  ),
);

// --- 2. heraldry ------------------------------------------------------------

{
  const root = open(
    'heraldry',
    'Heraldry',
    'A seat’s charge, on the two grounds it actually prints on: the parchment canton of a city flag or a unit badge, and the top bar’s seat chip.',
  );
  drawHeraldry(root);
  drawSeatChips(root);
}

// --- 3. the flourishes ------------------------------------------------------

drawFlourishes(
  open(
    'flourishes',
    'Flourishes',
    'Entry VII’s ratified ornament set, each alone on the surface it wears so nothing else competes for the judgement.',
  ),
);

// --- 4. the frontispiece ----------------------------------------------------

drawFrontispiece(
  open(
    'frontispiece',
    'Frontispiece',
    'The landing screen as a title page. The epigraph is drawn once per visit from a pool of six, so five of them are effectively unreadable in the game — here they cycle.',
  ),
);

// --- 5. the wheel -----------------------------------------------------------

drawWheel(
  open(
    'wheel',
    'The Pantheon Wheel',
    'The religion screen’s belief pool, drawn by the screen’s own builder. Toggle a god to see the lit state against the unlit one; the hub counts the seat’s places.',
  ),
);

// --- 6. cities that age -----------------------------------------------------

const citySection = open(
  'cities',
  'Cities That Age',
  'A town’s sculpt is a function of its owner’s era, its buildings and whether it is the seat of government. Six readings side by side, and the shapes they are built from underneath.',
);

const cityBlock = block(
  citySection,
  'The six readings',
  'Æra I / II / III across capital and town. Each is a real GameState — newGame, a flat table for a map, and the sim’s own foundCityAt — drawn by the board’s own CityLayer.',
);
const cityCanvas = element('canvas', 'city-canvas');
cityBlock.append(cityCanvas);
const cityCaptions = element('ul', 'city-captions');
cityBlock.append(cityCaptions);

const partsBlock = block(
  citySection,
  'The parts shelf',
  'Each shape the ageing pass added, alone, read off the same BoardGeometry the board builds — so a number tuned in view3d.json moves this shelf with it.',
);
const partsCanvas = element('canvas', 'parts-canvas');
partsBlock.append(partsCanvas);
const partsCaptions = element('ul', 'parts-captions');
for (const id of PART_IDS) {
  const item = element('li');
  item.append(element('strong', undefined, id), document.createTextNode(PART_CAPTIONS[id]));
  partsCaptions.append(item);
}
partsBlock.append(partsCaptions);

const tinctures = seatTinctures();
const firstSeat = tinctures[0]!;
// The strip is handed a **seat number** and the shelf a colour, and the
// asymmetry is real rather than sloppy: the strip's towns are drawn from a
// `GameState`, where a tincture is `playerPieceColor(color, index)` and the
// index is the half that decides it; the shelf's flag is one quad this page
// builds itself, with no state behind it to ask.
let seatIndex = 0;
const strip = new CityStrip(cityCanvas, seatIndex);
const shelf = new PartsShelf(
  partsCanvas,
  Number.parseInt(firstSeat.color.slice(1), 16),
  firstSeat.charge,
);

function refreshCityCaptions(): void {
  cityCaptions.replaceChildren();
  for (const panel of strip.panels) {
    const item = element('li');
    item.append(element('strong', undefined, panel.caption), document.createTextNode(panel.detail));
    cityCaptions.append(item);
  }
}
refreshCityCaptions();

{
  const knobs = controls(cityBlock);
  select(
    knobs,
    'seat',
    tinctures.map((seat, index) => [String(index), `${seat.name} · ${seat.charge}`] as const),
    '0',
    (value) => {
      seatIndex = Number(value);
      const seat = tinctures[seatIndex] ?? firstSeat;
      strip.setSeat(seatIndex);
      shelf.setSeat(Number.parseInt(seat.color.slice(1), 16), seat.charge);
      refreshCityCaptions();
    },
  );
  checkbox(knobs, 'shadows', true, (on) => strip.setShadows(on));
  checkbox(knobs, 'turntable', true, (on) => {
    strip.setSpinning(on);
    shelf.setSpinning(on);
  });
}

// --- 7. the marginalia ------------------------------------------------------

const chartSection = open(
  'marginalia',
  'Marginalia on the Chart',
  'What a cartographer draws in the part of the sea he has never been to — hidden hexes only, three percent of them, and gone the moment somebody walks there.',
);
const chartBlock = block(
  chartSection,
  'The vellum',
  'The atlas’s own two cells, blitted onto fog.chartColor over the ghost hexes the fog rules. Not a reproduction: these are the pixels the renderer samples.',
);

// --- 8. palette and ramp ----------------------------------------------------

drawPaletteAndRamp(
  open(
    'palette',
    'Palette & Ramp',
    'The world’s paints, the twelve seat tinctures, and the four faces at the sizes the specimen sets them — the reference on the same page as the assets.',
  ),
);

// --- the index, and the atlas ----------------------------------------------

{
  const title = element('h1');
  title.append(document.createTextNode('The Flair '), element('em', undefined, 'Cabinet'));
  indexNav.append(title);
  indexNav.append(element('p', undefined, 'every drawn thing, out of the game and on the table'));
  const list = element('ol');
  for (const entry of entries) {
    const item = element('li');
    const link = element('a', undefined, entry.title);
    link.href = `#${entry.id}`;
    item.append(link);
    list.append(item);
  }
  indexNav.append(list);
}

/**
 * The atlas is loaded **once** and handed to all three consumers.
 *
 * Rasterising it is the one genuinely expensive thing on this page — every
 * resource, site, charge, yield and numeral traced into a canvas — and three
 * copies would be three of them held in memory for no reason. It also has to
 * arrive *after* the layers that read it exist, which is the same order the
 * game observes: `sites3d` and the city flags are rebuilt in `loadIcons`, or
 * marks placed before the atlas finished stand blank.
 */
void drawMarginaliaSwatches(chartBlock).then((icons) => {
  strip.setIcons(icons);
  shelf.setIcons(icons);
});

window.addEventListener('resize', () => {
  strip.resize();
  shelf.resize();
});

/**
 * Entry point for The Flair Cabinet — the art inspection gallery.
 *
 * A look-dev page beside `pieces.html` and `mapgen.html`, and it makes the
 * same bargain every one of them does: it
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
 * Focused painted reviews run separately from this sheet. The unit review can
 * demonstrate a real movement command in its own fixture; it never touches the
 * player's saved game.
 */

import { charterIconPath, charterWorkIcons } from '../art/charterWorkIcons';
import '../style.css';
import './style.css';

import { installFlourishMarks } from '../ui/deviceMarks';
import { mountKeywordCards } from '../ui/keywordCards';
import { CityStrip, PART_CAPTIONS, PART_IDS, PartsShelf } from './cityStage';
import { drawMarginaliaSwatches } from './chart';
import { VIEW3D } from '../render3d/lookData';
import { drawRouteMedallions } from './route';
import { drawFlourishes, drawFrontispiece, drawWheel } from './flourishes';
import {
  drawHeraldry,
  drawMarkFamilies,
  drawPaletteAndRamp,
  drawSeatChips,
  seatTinctures,
} from './marks';
import { drawCaravan } from './caravan';
import { drawCardFaces } from './cardFaces';
import { drawOrderFaces } from './orderFaces';
import { drawPieceInks } from './pieceInks';
import { drawRankStall } from './ranks';
import { block, checkbox, controls, element, section, select, slider } from './sheet';
import { requireElement } from '../ui/dom';
import { drawCourtMarks } from './courtMarks';
import { drawInPlayForms } from './inPlayForms';
import { drawAgePlate } from './agePlate';
import { drawTitleScreen } from './titleScreen';

const indexNav = requireElement<HTMLElement>('index');
const sheet = requireElement<HTMLElement>('sheet');

// The corner star is worn by a *pseudo-element*, which has no `style` object
// for a module to write a mask onto — so the picture is handed to the document
// root exactly as `main.ts` hands it to the game. Without this call every
// `.hud-card` on the page would wear an empty box.
installFlourishMarks(document.documentElement);

// The keyword hover cards (batch T2), so the card faces below show a card
// keyword's rule on hover and on keyboard focus, as the game does (batch DS8).
mountKeywordCards();

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
    'A seat’s charge, on the two grounds it actually prints on: the parchment canton of a city flag, and the top bar’s seat chip.',
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

// --- 3b. the card faces -----------------------------------------------------

// Batch C1: an Order's A3 face, at the draft's, the council's and the
// collection's sizes, drawn by the game's own builders.
drawCardFaces(
  open(
    'card-faces',
    'Card Faces',
    'An Order as the draft deals it, the council seats it and the collection lists it: the suit shows the deck, the ink shows the type, and the frame and the ornament at the top show the rarity.',
  ),
);

// --- 3c. the Order card's emblem face ---------------------------------------

// Batch SS10: the Order card's new face, the emblem, built from a card's data
// by `src/ui/orderFace.ts`. Not on the live screens yet.
drawOrderFaces(
  open(
    'order-face',
    'Order Card Face',
    'The emblem face the user approved for Orders and Doctrines: the name as the motto, the suit as an engraved device, the effect beneath with a red initial, and the live line at the foot. Built from real rows. The orders screen does not use it yet.',
  ),
);

// --- 4. the title screen and the frontispiece -------------------------------

// Frame a8 of the Quiet Table boards: the title screen the game opens on.
drawTitleScreen(
  open(
    'title-screen',
    'Title Screen',
    'The title screen the game opens on: the painting across the window, the title on its sky with a small ornament and the tag line, the ribbon as the seam, and the paper with the buttons and the recent worlds.',
  ),
);

// The earlier title page's device and epigraphs. The title screen has not
// shown them since 2026-09-14; the marks are kept here.
drawFrontispiece(
  open(
    'frontispiece',
    'Frontispiece',
    'The earlier title page, with the printer’s device and the epigraphs. The title screen has not shown them since 2026-09-14. The six epigraphs cycle here.',
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
  'Each shape the ageing pass added, then the road corner, then the improvement props — the five works a great person plants and the lumbermill — alone, read off the same BoardGeometry the board builds, so a number tuned in view3d.json moves this shelf with it. Eight of them spend gold, and this is where that is checked side by side. Then the Keep, the polder and the outpost that Expansionist cards open, and last the Physic Garden and the Qanat that Scientific charters open, all as placeholder art.',
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
  // **The yoke the flag grew on 2026-09-09** (`docs/flags.md` (hhh) 5). Drawn
  // by the shipping layer off the fixture's own state, so what is on the canvas
  // is what is on the board — which is the only reason a slider under it is
  // worth anything. Its sibling ruling, (hhh) 6, has no knob here and never
  // will: U7 settled it as **geometry** — the banner hangs above the flagpole
  // and every piece keeps its own roundel — so what there is to judge is the
  // plate against the pieces under it, which is the flourishes' own stall (a
  // real board with a real banner over it) rather than a sculpt on this strip.
  checkbox(knobs, 'puppet', false, (on) => strip.setPuppet(on));
  slider(
    knobs,
    'yoke',
    { min: 0.05, max: 0.24, step: 0.005, value: VIEW3D.city.puppetSize },
    (value) => value.toFixed(3),
    (value) => {
      VIEW3D.city.puppetSize = value;
      strip.repaint();
    },
  );
  slider(
    knobs,
    'yoke drop',
    { min: 0.3, max: 1.2, step: 0.02, value: VIEW3D.city.puppetDrop },
    (value) => `${value.toFixed(2)}×flag`,
    (value) => {
      VIEW3D.city.puppetDrop = value;
      strip.repaint();
    },
  );
  // **The torch a town in unrest flies** (batch WC1, `docs/flags.md` (rrrrrr)
  // part 1), under the fly where the yoke hangs under the hoist. Drawn by the
  // shipping layer off the fixture's own state, like the yoke above, so both
  // can be judged together on a puppet in unrest.
  checkbox(knobs, 'unrest', false, (on) => strip.setUnrest(on));
  slider(
    knobs,
    'torch',
    { min: 0.05, max: 0.24, step: 0.005, value: VIEW3D.city.unrestSize },
    (value) => value.toFixed(3),
    (value) => {
      VIEW3D.city.unrestSize = value;
      strip.repaint();
    },
  );
  slider(
    knobs,
    'torch drop',
    { min: 0.3, max: 1.2, step: 0.02, value: VIEW3D.city.unrestDrop },
    (value) => `${value.toFixed(2)}×flag`,
    (value) => {
      VIEW3D.city.unrestDrop = value;
      strip.repaint();
    },
  );
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

// --- 8. the turn medallions -------------------------------------------------

const routeStall = drawRouteMedallions(
  open(
    'medallions',
    'Turn Counters',
    'The mark on the hex each turn of a march ends on — a flat bone gaming counter with one gilt line inside an ink edge and the turn stamped in the middle. On the board it is only ever on screen while a route is: under the cursor, or along the order a selected piece is already walking.',
  ),
);

// --- 9. the wild's red ------------------------------------------------------

const inkStage = drawPieceInks(
  open(
    'piece-inks',
    'The Wild’s Red',
    'The one comparison the board only ever shows you by accident: a barbarian piece beside the crimson seat’s. Both sculpts are painted through the renderer’s own pieceMaterials, both stand half behind a canopy so the x-ray ghost is visible, and the contrast between the two inks is measured under them rather than judged.',
  ),
);

// --- 10. the caravan's own body ---------------------------------------------

const caravanStage = drawCaravan(
  open(
    'caravan',
    'The Caravan’s Own Body',
    'The other comparison the board only makes by accident: a trader beside a soldier. Ruling (iii) asked for a different shape that is still semi-opaque, and both halves are one picture — the melee body, the caravan idle, and the caravan carrying a route, that last one painted through the renderer’s own washedInk with the mix under the canvas as a knob.',
  ),
);

// --- 11. unit ranks --------------------------------------------------------

// Batch WC3 (`docs/flags.md` (rrrrrr) part 3): the rank boss a ranked piece's
// badge carries at its corner, drawn from the atlases' own cells with knobs on
// the four numbers the board reads. The garrison row's rank chip is in the
// flourishes (section 3), on the shipping row.
const rankStall = drawRankStall(
  open(
    'ranks',
    'Unit Ranks',
    'The chevrons a ranked piece wears at the corner of its badge: one for a Veteran, two for an Elite. A piece has to fight and live to earn one, so a fresh board never shows them; here they are, at board size.',
  ),
);

// --- 12. palette and ramp ---------------------------------------------------

drawPaletteAndRamp(
  open(
    'palette',
    'Palette & Ramp',
    'The world’s paints, the twelve seat tinctures, and the four faces at the sizes the specimen sets them — the reference on the same page as the assets.',
  ),
);

// The focused review loads the production renderer without all the other stalls.
{
  const root = open('painted-world', 'Painted World', 'Roads, discoveries and paired empire borders on the live terrain.');
  const movement = element('a', undefined, 'Compare movement highlight treatments');
  movement.href = '/flair.html?review=movement'; root.append(movement, element('br'));
  const link = document.createElement('a');
  link.href = '/flair.html?review=world&view=borders&light=golden';
  link.textContent = 'Open the world-layer review'; root.append(link);
}
{
  const root = open('painted-works', 'Painted Improvements',
    'Everyday works and six special monuments on flat ground, hills and coast, beside the painted city and farm.');
  const link = element('a', undefined, 'Open the painted improvement review');
  link.href = '/flair.html?review=works'; root.append(link);
  const terraces = element('a', undefined, 'Review Pachacuti’s terrace farm');
  terraces.href = '/flair.html?review=works&work=terraces&light=golden&detail=close';
  root.append(element('br'), terraces);
  const approved = element('a', undefined, 'Review the painted improvements');
  approved.href = '/flair.html?review=works&work=approved';
  root.append(element('br'), approved);
  const marks = element('div', 'charter-work-marks');
  for (const [id, name] of Object.entries(charterWorkIcons)) {
    const item = document.createElement('figure');
    const icon = document.createElement('img');
    icon.src = charterIconPath(id);
    icon.alt = '';
    icon.width = icon.height = 40;
    item.append(icon, element('figcaption', undefined, name));
    marks.append(item);
  }
  root.append(marks);
}

{
  const root = open('north-star-kit', 'North-Star Models',
    'The houses of three ages, the hall, the mine, the quarry, the barn and the monuments of the visual test.');
  const link = element('a', undefined, 'Open the north-star model table');
  link.href = '/flair.html?review=northstar'; root.append(link);
  const scene = element('a', undefined, 'See them in the visual test scene');
  scene.href = '/flair.html?review=scene&view=works'; root.append(element('br'), scene);
}

{
  const root = open('painted-units', 'Painted Units',
    'The twelve accepted primitive pieces, five great-person families, owner colours and movement on the painted board.');
  const link = element('a', undefined, 'Open the painted unit review');
  link.href = '/flair.html?review=units&unit=all&light=golden&detail=game'; root.append(link);
  const roster = element('a', undefined, 'View the leader and charter units');
  roster.href = '/flair.html?review=units&unit=roster'; root.append(element('br'), roster);
  // The trait glow (Scientific batch S10) is a moment, not a standing mark, so
  // it lives in the unit review as a button that replays it on the pieces in
  // view, with its three tunables as knobs. Opened on the siege line here,
  // because Mechanics' Onager is the trait the prototype shows it on.
  const glow = element('a', undefined, 'Replay the trait glow on the siege line');
  glow.href = '/flair.html?review=units&unit=siege&group=siege&light=golden&detail=game';
  root.append(element('br'), glow);
}

// --- the Abacus (look B, 2026-11-19) -----------------------------------------

// A link, not a stall: the frame needs a WebGL context of its own, and the
// focused review gives it one without the other stalls beside it.
{
  const root = open('abacus', 'The Abacus',
    'The score frame of the bead page, the Abacus screen and the Opus close: walnut and gilt, the age plaque, a stud in each seat’s colour, and enamel beads.');
  const link = element('a', undefined, 'Open the Abacus review');
  link.href = '/flair.html?review=abacus'; root.append(link);
}

// --- court marks (batch SS6) -------------------------------------------------

drawCourtMarks(
  open(
    'court-marks',
    'Court Marks',
    'The envelope, the crossed blades and the arrow of the diplomacy sheet and the deal notice by the turn button.',
  ),
);

// --- the In play screen's forms (Council and In play board, stage 3) ---------

drawInPlayForms(
  open(
    'in-play-forms',
    'In Play Forms',
    'Everything in force, as the In play screen draws it: a wonder’s plate, a belief’s tablet, a legacy’s medal, a temporary tag, the tucked edge and the “more” edge.',
  ),
);

// --- the age plate on the ribbon, and the age paintings (2026-11-19) ---------

drawAgePlate(
  open(
    'age-plate',
    'The Age Plate',
    'The age plate on the ribbon with each of the three sets of age paintings, the opening plate for age I, and the lapis page a plate without a painting shows.',
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
 * resource, site, charge, yield, numeral and turn medallion traced into a
 * canvas — and four copies would be four of them held in memory for no reason. It also has to
 * arrive *after* the layers that read it exist, which is the same order the
 * game observes: `sites3d` and the city flags are rebuilt in `loadIcons`, or
 * marks placed before the atlas finished stand blank.
 */
void drawMarginaliaSwatches(chartBlock).then((icons) => {
  strip.setIcons(icons);
  shelf.setIcons(icons);
  // The medallions come out of the same atlas and wait for it the same way.
  routeStall.setIcons(icons);
  // And the rank boss (batch WC3), for the same reason.
  rankStall.setIcons(icons);
});

window.addEventListener('resize', () => {
  strip.resize();
  shelf.resize();
  inkStage.resize();
  caravanStage.resize();
});

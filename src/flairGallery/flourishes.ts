/**
 * Sections 3, 4 and 5: the flourishes alone on a surface, the title page, and
 * the pantheon wheel.
 *
 * Entry VII capped and ratified a list of ornaments — corner star, card-back
 * weave, gilt double-frames, letterspaced inscriptions, the ledger's double
 * rule — and every one of them is a thing you normally see *behind something
 * else*: a star in the gutter of a card full of numbers, a frame round a
 * proclamation you are reading. That is exactly why they need a page. A stall
 * here is one flourish on one otherwise-empty surface, which is the only
 * condition under which "is this too loud" can be answered.
 *
 * The knobs, and what they are allowed to be
 * ------------------------------------------
 * Three flourishes get a slider (the star's size and strength, the inscription
 * tracking, the deal). Each slider writes a **CSS custom property**, and every
 * one of them defaults to the number the game ships — so a page nobody touched
 * is a picture of the product, and a knob is a proposal rather than a preview
 * of something that already changed. `--inscription-tracking` is the game's own
 * lever and is written on this section's root; the star's two are gallery-local
 * (`style.css` beside this file), because the shipping star's size and opacity
 * are constants in `.hud-card::after` and putting a variable there would be
 * changing the game to photograph it.
 */

import { EPIGRAPHS } from '../ui/frontispiece';
import { CARD_LINE_ACCENT, cardLineMarkUrl } from '../ui/cardLine';
import { printerDeviceMarkUrl } from '../ui/deviceMarks';
import { AXIS_MARK } from '../ui/religionScreen';
import { drawPantheonWheel, pantheonWheelLayout } from '../ui/pantheonWheel';
import { YIELD_GLYPH, setYieldText } from '../ui/yieldMark';
import { type BeliefId, BELIEF_IDS, beliefDef } from '../sim/religionData';
import { block, button, checkbox, controls, element, slider } from './sheet';

/** One stall: a caption, and a surface with a single flourish on it. */
function stall(into: HTMLElement, title: string, extraClass?: string): HTMLElement {
  const cell = element('div', extraClass ? `stall ${extraClass}` : 'stall');
  cell.append(element('p', 'stall-title', title));
  into.append(cell);
  return cell;
}

function stallGrid(into: HTMLElement): HTMLElement {
  const grid = element('div', 'stall-grid');
  into.append(grid);
  return grid;
}

// --- section 3: the flourishes ---------------------------------------------

export function drawFlourishes(into: HTMLElement): void {
  cornerStarStall(into);
  cardBackStall(into);
  giltFrameStall(into);
  pricePlateStall(into);
  inscriptionStall(into);
  ledgerStall(into);
}

/**
 * The price plate, in its three states, over a scrap of board.
 *
 * It earns a stall for the reason the corner star does: in the game it is only
 * ever seen *on top of a diorama*, three or four at a time, at 11px, while the
 * player is looking at the ground rather than at the plate. That is precisely
 * the condition under which "is the rim too heavy, is the greyed one still
 * readable, does the coin out-shout its own figure" cannot be answered — so it
 * is here, alone, on a ground the same value the board is.
 *
 * The three plates are the real class wearing the real states. The hovered one
 * carries `.is-hovered`, which exists in `style.css` for exactly this: a copy of
 * the hover rule here would be the one thing this page must never do.
 *
 * The knobs write the plate's own custom properties, so each is a proposal
 * against the shipping number rather than a preview of a change already made —
 * the corner star's bargain, one device over.
 */
function pricePlateStall(into: HTMLElement): void {
  const root = block(
    into,
    'The price plate',
    'What a hex costs, while Buy Tiles mode is up. The city panel’s buy tag laid on the ground: parchment under a hairline ink rim, the coin drawn from `src/art/yieldMarks.ts` rather than typed, the figure in tabular mono. A hex the treasury cannot cover keeps its figure and loses its ink — greyed, never struck, because a line through a price says *withdrawn* when it means *not today*.',
  );
  const grid = stallGrid(root);
  const cell = stall(grid, 'three plates, over ground', 'stall-price');
  const ground = element('div', 'price-ground');

  const states: { caption: string; price: number; barred: boolean; hovered: boolean }[] = [
    { caption: 'affordable', price: 50, barred: false, hovered: false },
    { caption: 'hovered', price: 75, barred: false, hovered: true },
    { caption: 'unaffordable', price: 110, barred: true, hovered: false },
  ];
  const plates: HTMLElement[] = [];
  for (const state of states) {
    const slot = element('div', 'price-slot');
    const plate = element('button', 'tile-price');
    plate.type = 'button';
    if (state.barred) {
      plate.classList.add('is-barred');
      plate.disabled = true;
    }
    if (state.hovered) plate.classList.add('is-hovered');
    // The game's own printer, so the coin on this page is the coin on the board.
    setYieldText(plate, `${YIELD_GLYPH.gold} ${state.price}`);
    slot.append(plate, element('span', 'price-caption', state.caption));
    ground.append(slot);
    plates.push(plate);
  }
  cell.append(ground);

  // Written on each plate rather than on the ground under them: the defaults are
  // declared on `.tile-price` itself, so a value inherited from an ancestor
  // would lose to the class every time.
  const dial = (name: string, value: string): void => {
    for (const plate of plates) plate.style.setProperty(name, value);
  };
  const knobs = controls(root);
  slider(knobs, 'size', { min: 8, max: 20, step: 0.5, value: 11 }, (v) => `${v}px`, (v) => {
    dial('--price-size', `${v}px`);
  });
  slider(knobs, 'throw', { min: 0, max: 6, step: 1, value: 2 }, (v) => `${v}px`, (v) => {
    dial('--price-throw', `${v}px`);
  });
}

/**
 * The corner star, on an otherwise empty panel, with its two constants exposed.
 *
 * The star is the flourish most likely to be wrong, because it is worn by
 * *every* panel-class surface at once: a value that reads as a printer's
 * ornament on one card reads as ten pieces of grit when ten cards are up. The
 * two numbers that decide that are its box and its opacity, so both are knobs
 * and both start where `.hud-card::after` has them.
 */
function cornerStarStall(into: HTMLElement): void {
  const root = block(
    into,
    'The corner star',
    'One 10px star in the padding gutter of every `.hud-card`, at 0.32 opacity, masked in the panel’s own ink. Top-left everywhere: the right-hand corners are where close buttons live, and a printer’s ornament sits at the head of the block it opens.',
  );
  const grid = stallGrid(root);
  const cell = stall(grid, 'a panel, empty', 'stall-star');
  const card = element('div', 'hud-card');
  card.style.minHeight = '96px';
  card.append(element('p', 'eyebrow', 'nothing here'));
  cell.append(card);

  const knobs = controls(root);
  slider(knobs, 'size', { min: 4, max: 28, step: 1, value: 10 }, (v) => `${v}px`, (v) => {
    cell.style.setProperty('--star-size', `${v}px`);
  });
  slider(knobs, 'strength', { min: 0, max: 1, step: 0.01, value: 0.32 }, (v) => v.toFixed(2), (v) => {
    cell.style.setProperty('--star-opacity', String(v));
  });
}

/**
 * A card face-down, and a button that turns it over again.
 *
 * The deal is an *animation*, so the only way to inspect it is to be able to
 * replay it — which is what the button does, by removing and re-adding the
 * class the way `offerCard.ts` does between two offers. Reduced motion is
 * honoured the same way the game honours it: the game does not deal a back at
 * all, so neither does this, and the button says so rather than pretending.
 */
function cardBackStall(into: HTMLElement): void {
  const root = block(
    into,
    'The card back, and the deal',
    'A tarot-faced card comes over on its own beat — a real rotation about the card’s vertical axis, the weave visible until it comes round. Every back is identical: the emblem is the neutral lozenge seal, because a back that told you what it was hiding is not a back.',
  );
  const grid = stallGrid(root);
  const cell = stall(grid, 'one card, dealt', 'stall-deal');

  const options = element('div', 'offer-options');
  options.dataset.face = 'tarot';
  const card = element('button', 'offer-option');
  card.type = 'button';
  card.dataset.line = 'star';
  card.style.setProperty('--line-ink', CARD_LINE_ACCENT.star);
  card.append(element('span', 'offer-ordinal', '1'));
  card.append(element('span', 'offer-payoff', 'permanent · 1 economic'));
  const emblem = element('span', 'offer-emblem');
  emblem.setAttribute('aria-hidden', 'true');
  emblem.style.setProperty('--line-mark', cardLineMarkUrl('star'));
  card.append(emblem);
  card.append(element('span', 'offer-option-title', 'Star Tablets'));
  card.append(element('span', 'offer-note', 'completes Writing'));
  card.append(element('span', 'offer-flavor', 'What the sky was doing the year the river rose.'));
  options.append(card);
  cell.append(options);

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const knobs = controls(root);
  // The stagger is the *hand's* beat — `offerCard.ts` writes `index × 90ms` per
  // card — so a single card shows it as the pause before it turns. Held here
  // rather than read off the element, because the replay clears the property
  // the way the game's own teardown does and would otherwise forget it.
  let stagger = 0;
  const replay = (): void => {
    // Exactly `offerCard.ts`'s own teardown: drop the class, drop the stagger,
    // remove the back — then lay it again. A card re-dealt without the teardown
    // keeps the finished animation and never moves.
    card.classList.remove('is-dealing');
    card.style.removeProperty('--deal-delay');
    for (const old of card.querySelectorAll('.card-back')) old.remove();
    if (reduced) return;
    const back = element('span', 'card-back');
    back.setAttribute('aria-hidden', 'true');
    back.style.setProperty('--card-back-emblem', cardLineMarkUrl('none'));
    card.append(back);
    // A reflow between the removal and the re-add, or the browser coalesces the
    // two class writes and the animation never restarts.
    void card.offsetWidth;
    card.style.setProperty('--deal-delay', `${stagger}ms`);
    card.classList.add('is-dealing');
  };
  button(knobs, 'Deal again', replay);
  slider(knobs, 'stagger', { min: 0, max: 600, step: 10, value: 0 }, (v) => `${v}ms`, (v) => {
    stagger = v;
  });
  if (reduced) {
    knobs.append(
      element('span', 'sheet-figure', 'reduced motion: no back is dealt'),
    );
  }
  replay();
}

/** The gilt double frame, on the three surfaces that are allowed to wear one. */
function giltFrameStall(into: HTMLElement): void {
  const root = block(
    into,
    'The gilt double frame',
    'Two hairline gold rules inside the surface’s own ink border, the gap being the surface showing through. Announcement surfaces only — a game where everything is framed in gold has framed nothing.',
  );
  const grid = stallGrid(root);

  const plain = stall(grid, '.gilt-frame — the class an age plate joins by wearing');
  const plate = element('div', 'hud-card gilt-frame');
  plate.style.minHeight = '104px';
  plate.style.display = 'grid';
  plate.style.placeItems = 'center';
  plate.append(element('p', 'inscription', 'The Age of Omens closes'));
  plain.append(plate);

  const victory = stall(grid, '.turn-splash.is-victory — one step further in');
  const victoryCard = element('div', 'turn-splash is-victory');
  victoryCard.append(document.createTextNode('Uruk '), element('em', undefined, 'ascendant'));
  victory.append(victoryCard);

  const seat = stall(grid, '.turn-splash.is-seat — housekeeping, so one rule, not two');
  const seatCard = element('div', 'turn-splash is-seat');
  seatCard.append(element('span', 'turn-splash-name', 'Akkad'));
  seat.append(seatCard);
}

/**
 * The inscription voice at the three sizes it is set at, with the one lever.
 *
 * `--inscription-tracking` is a real custom property on `:root` in the game, so
 * the slider writes it on this section and everything under it moves together —
 * which is the point of the lever existing at all. The eyebrow family multiplies
 * it by 1.7 on its own, so the third sample moves further than the first two and
 * that relationship is the thing worth watching.
 */
function inscriptionStall(into: HTMLElement): void {
  const root = block(
    into,
    'The inscription',
    'Letterspaced small caps in whatever serif the surface already sets. Nothing is upper-cased in the markup, so a screen reader still reads the words — the capitals are a font feature, which is why the letterforms have to be tracked.',
  );
  const grid = stallGrid(root);
  const cell = stall(grid, 'three sizes, one lever');
  const card = element('div', 'hud-card');
  const stack = element('div', 'stall-inscription');
  stack.append(element('div', 'inscription inscription-screen', 'Orders & Doctrines'));
  stack.append(element('p', 'eyebrow', 'faith gathered'));
  stack.append(element('div', 'inscription inscription-aera', 'Æra II'));
  card.append(stack);
  cell.append(card);

  const rule = stall(grid, '.double-rule — the frontispiece’s closing mark');
  const ruleCard = element('div', 'hud-card');
  ruleCard.append(element('p', 'inscription', 'Magister Ludi'));
  ruleCard.append(element('div', 'double-rule marquee-rule'));
  rule.append(ruleCard);

  const knobs = controls(root);
  slider(
    knobs,
    'tracking',
    { min: 0, max: 0.3, step: 0.005, value: 0.09 },
    (v) => `${v.toFixed(3)}em`,
    (v) => root.style.setProperty('--inscription-tracking', `${v}em`),
  );
}

/**
 * A ledger: signed lines, a rule above the total, and the accountant's double
 * rule under it.
 *
 * The figures are invented, and that is the one place on this page where a
 * specimen is not asked of the game — a real breakdown needs a game, and rule
 * 5's *visual* half is about the ruling and the column rather than about the
 * arithmetic. What is real is every class: `.ledger`, `.ledger-total`, and the
 * mono tabular figures, which is what makes the columns line up at all.
 */
function ledgerStall(into: HTMLElement): void {
  const root = block(
    into,
    'The ledger',
    'Every rule-5 breakdown, set the way an account is set: entries ruled off from one another, figures in a tabular column, and two hairlines under the total — the mark that says “this is a sum, and it is closed”.',
  );
  const grid = stallGrid(root);
  const cell = stall(grid, 'a tile yield, closed');
  const card = element('div', 'hud-card');
  card.append(element('p', 'eyebrow', 'grassland · hills · iron'));
  const list = element('ul', 'ledger');
  for (const [label, figure] of [
    ['Grassland', '+2'],
    ['Hills', '+1'],
    ['Mine', '+2'],
    ['Iron · mine', '+1'],
    ['Pillaged', '−2'],
  ] as const) {
    list.append(ledgerLine(label, figure));
  }
  list.append(ledgerLine('Total', '+4', true));
  card.append(list);
  cell.append(card);
}

function ledgerLine(label: string, figure: string, total = false): HTMLElement {
  const row = element('li', total ? 'ledger-total' : undefined);
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.gap = '12px';
  if (total) row.style.fontWeight = '700';
  const figureNode = element('span', undefined, figure);
  figureNode.style.fontFamily = 'var(--face-num)';
  figureNode.style.fontVariantNumeric = 'tabular-nums';
  row.append(element('span', undefined, label), figureNode);
  return row;
}

// --- section 4: the frontispiece --------------------------------------------

/**
 * The landing marquee, reproduced from `index.html`'s own markup, with a button
 * that walks the epigraph pool.
 *
 * The game shows one epigraph per visit and there are six, so five of them are
 * effectively invisible: you would have to restart five times to read the pool.
 * That is precisely the sort of thing a gallery is for, and it is why the
 * control here is a *cycle* rather than another random roll — a second roll
 * would show you the same line half the time.
 */
export function drawFrontispiece(into: HTMLElement): void {
  const root = block(
    into,
    'The title page',
    'Engraved caps, a hairline double rule, the printer’s device — an astrolabe, hung by its throne — and an epigraph in the margin. Every word is the one the landing already had; the device and the epigraph are the whole of what was added.',
  );
  const stage = element('div', 'landing-stage frontispiece-stage');
  const marquee = element('div', 'marquee');
  const title = element('h1', 'marquee-title');
  title.append(document.createTextNode('Magister '), element('em', undefined, 'Ludi'));
  marquee.append(title);
  marquee.append(element('p', 'marquee-sub', 'a game of everything mankind has thought'));
  const rule = element('div', 'double-rule marquee-rule');
  rule.setAttribute('aria-hidden', 'true');
  marquee.append(rule);
  const device = element('span', 'marquee-device');
  device.setAttribute('aria-hidden', 'true');
  device.style.setProperty('--device-mark', printerDeviceMarkUrl());
  marquee.append(device);
  const epigraph = element('p', 'marquee-epigraph');
  marquee.append(epigraph);
  marquee.append(element('span', 'marquee-stamp', 'one seed · one world'));
  stage.append(marquee);
  root.append(stage);

  let index = 0;
  const counter = element('span', 'sheet-figure');
  const show = (): void => {
    epigraph.textContent = EPIGRAPHS[index] ?? '';
    counter.textContent = `${index + 1}/${EPIGRAPHS.length}`;
  };
  const knobs = controls(root);
  button(knobs, 'Next epigraph', () => {
    index = (index + 1) % EPIGRAPHS.length;
    show();
  });
  knobs.append(counter);
  show();
}

// --- section 5: the pantheon wheel ------------------------------------------

/**
 * The wheel, with a checkbox per god and a slider for the seat's places.
 *
 * The drawing is `drawPantheonWheel` — the religion screen's own, extracted so
 * that both callers are the same function (see `src/ui/pantheonWheel.ts`). A
 * reproduction would have been the fastest thing to write here and the least
 * useful: the whole question this stall answers is "do the lit and unlit states
 * read against each other", and the answer only counts if the arcs are the arcs
 * the screen draws.
 *
 * The hub's figure is `held/slots`, so the slider is not decoration either: a
 * seat with more places than gods and a seat with none are two different
 * pictures of the same wheel.
 */
export function drawWheel(into: HTMLElement): void {
  const root = block(
    into,
    'The wheel',
    'One house per god, runs of an axis adjacent — the axes have no printed name, and this is where they come back as geometry. Lit means this seat holds that god; the hub counts the places.',
  );
  const layout = element('div', 'wheel-layout');
  const stage = element('div', 'hud-card');
  const toggles = element('div');
  layout.append(stage, toggles);
  root.append(layout);

  const held = new Set<BeliefId>(BELIEF_IDS.slice(0, 3));
  let slots = 4;

  const redraw = (): void => {
    stage.replaceChildren(
      drawPantheonWheel({
        layout: pantheonWheelLayout(BELIEF_IDS),
        held,
        slots,
        glyph: (axis) => AXIS_MARK[axis].glyph,
        tooltip: (id) => beliefDef(id).name,
      }),
    );
  };

  const knobs = controls(toggles);
  slider(knobs, 'places', { min: 0, max: 8, step: 1, value: slots }, (v) => String(v), (v) => {
    slots = v;
    redraw();
  });
  button(knobs, 'None held', () => {
    held.clear();
    for (const box of boxes) box.checked = false;
    redraw();
  });
  button(knobs, 'All held', () => {
    for (const id of BELIEF_IDS) held.add(id);
    for (const box of boxes) box.checked = true;
    redraw();
  });

  const list = element('div', 'wheel-toggles');
  const boxes: HTMLInputElement[] = [];
  for (const id of BELIEF_IDS) {
    boxes.push(
      checkbox(list, `${AXIS_MARK[beliefDef(id).axis].glyph} ${beliefDef(id).name}`, held.has(id), (on) => {
        if (on) held.add(id);
        else held.delete(id);
        redraw();
      }),
    );
  }
  toggles.append(list);
  redraw();
}

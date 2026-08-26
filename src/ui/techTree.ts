/**
 * The star chart: the technology tree as the magister's sky.
 *
 * A full-screen overlay opened from the HUD's research card (or `T`), and the one
 * deliberately dark surface in a light interface — ink ground, gilt stars,
 * hairline sight-lines between a node and the nodes it depends on (see the
 * flourish set in Entry VII of `docs/design-notes.md`). Everything else on the
 * screen is parchment on a table; this is the table at night.
 *
 * It also fills the HUD's research card, the fixed surface at the top-left that
 * says what the empire is learning (`renderStatus`, at the foot of this file).
 * The card is this screen's handle and its readout at once, and it lives here
 * rather than in a module of its own for the same reason the bar line it
 * replaced did: one file reads `researching`, so the card and the lit node in
 * the chart cannot come to two different conclusions about it.
 *
 * It reads the simulation and sends exactly one command
 * -----------------------------------------------------
 * Every state a node can be in — researched, being researched, available,
 * locked — is derived from `src/sim/tech.ts`, and whether a node can be clicked
 * is `researchError(...) === null`, which is the *same* function the reducer
 * validates `chooseResearch` with. A node this screen lets you press is a node
 * the reducer accepts; a node it dims explains itself with the reducer's own
 * words. There is no second opinion about the rules anywhere in this file.
 *
 * Glanceable numbers (Entry VIII)
 * ------------------------------
 * Each node carries its cost and "~N turns" at the player's *current* science
 * rate, and each building it unlocks carries what that building would add to
 * this empire's yields today — computed by `buildingYieldDelta`, which asks
 * `cityYields` twice rather than reimplementing it. Both are present-state
 * figures and the screen says so ("now"), because a delta that quietly assumed
 * future growth would be a promise the game never made.
 *
 * A chart that travels sideways
 * -----------------------------
 * The screen is a dependency chart on a horizontally scrolling stage, not a
 * list of ages: a node's column is `techDepth` — the longest chain of
 * prerequisites behind it — and its row is the lane hand-authored in
 * `data/techs.json`. So a chain reads as a chain, left to right, and the ages
 * are demoted to what they always were: an annotation, painted as dim gilt
 * numerals behind the columns they happen to own (`techAgeBands`).
 *
 * Travel is by drag, by wheel (a vertical wheel scrolls the chart sideways,
 * because sideways is the only direction it goes), and by the arrow keys. On
 * opening, the stage jumps — no tween; the player asked to see the chart, not
 * to watch it arrive — to whatever they are researching, or to the leftmost
 * thing they *could* research if they are researching nothing.
 *
 * Why the lines are drawn after layout
 * ------------------------------------
 * The connectors are one SVG behind the cards, and they are measured from the
 * cards themselves rather than from a hand-maintained coordinate table: the
 * chart is a grid that reflows with the window and with the length of a
 * building's name, and a diagram that had its own idea of where the nodes were
 * would drift the first time somebody resized. Measurement needs a laid-out
 * DOM, so it happens on the frame after the overlay is shown, and again on
 * resize while it is open. The SVG lives *inside* the scrolling field and is
 * measured in field coordinates, so scrolling moves the lines with the cards
 * for free — a diagram drawn in viewport coordinates would need repainting on
 * every scroll event and would still lag by a frame.
 */

import { buildingDef } from '../sim/buildingData';
import { unitProductionCost } from '../sim/cities';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { improvementDef } from '../sim/improvementData';
import { projectDef, projectRate } from '../sim/projectData';
import { hasEndedTurn } from '../sim/state';
import {
  availableTechs,
  buildingYieldDelta,
  playerScience,
  researchError,
  turnsToTech,
} from '../sim/tech';
import {
  TECH_IDS,
  type TechAge,
  type TechId,
  techAgeBands,
  techColumnCount,
  techDef,
  techDepth,
  techRowCount,
} from '../sim/techData';
import { type TechGift, techGifts } from '../sim/techUnlocks';
import type { TileYield } from '../sim/terrainData';
import { unitDef } from '../sim/unitData';
import { HAMMER, PROJECT_GLYPHS, YIELD_GLYPH, turnsLabel } from './figures';
import { setYieldText } from './yieldMark';
import { createInfoCard } from './infoCard';
import { BEAKER, researchProgress } from './researchProgress';
import { resourceMarkNode } from './resourceMark';

/** ÆRA I / II / III — the ages, in the numerals the specimen sets them in. */
const AGE_NUMERALS: Record<TechAge, string> = { 1: 'I', 2: 'II', 3: 'III' };
const AGE_NAMES: Record<TechAge, string> = {
  1: 'Ancient',
  2: 'Classical',
  3: 'Medieval',
};

/**
 * The yield voices, in the order the city panel lists them. The glyphs are the
 * shared set (`figures.ts`) — an unlock line reads `15⚙`, exactly as the city
 * panel's buttons do, because it is literally the same glyph.
 */
const YIELD_GLYPHS: [keyof ReturnType<typeof buildingYieldDelta>, string][] = [
  ['food', YIELD_GLYPH.food],
  ['production', YIELD_GLYPH.production],
  ['gold', YIELD_GLYPH.gold],
  ['science', YIELD_GLYPH.science],
  ['culture', YIELD_GLYPH.culture],
  ['faith', YIELD_GLYPH.faith],
];

/** How a gift's mark is drawn: which class the small box beside it wears. */
const GIFT_MARK: Record<TechGift['kind'], string> = {
  unit: 'is-unit',
  building: 'is-building',
  // A project is a thing a city builds, so it wears the build mark: what
  // separates it from a building is that it repeats, and the row's own glyph
  // (↻) and note carry that.
  project: 'is-building',
  improvement: 'is-improvement',
  ability: 'is-ability',
  reveal: 'is-reveal',
  renewal: 'is-renewal',
  buildingRenewal: 'is-renewal',
};

/** The sentence each kind of gift is introduced by, in the card's list. */
const GIFT_HEADING: Record<TechGift['kind'], string> = {
  unit: 'Units',
  building: 'Buildings',
  project: 'Repeating projects',
  improvement: 'Workers may build',
  // Deliberately not "Workers may clear": the kind is a *verb* gained, and the
  // gift's own name ("Clear Forest") is where the specifics belong.
  ability: 'Workers may also',
  reveal: 'Reveals on the map',
  renewal: 'Improvements renewed',
  buildingRenewal: 'Buildings renewed',
};

export interface TechTree {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** Rebuilds the chart if it is open, and always refreshes the research card. */
  render(): void;
}

export interface TechTreeOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /**
   * The scrolling stage. Emptied and rebuilt per render; the chart's field is
   * built inside it, and this element is what pans.
   */
  chart: HTMLElement;
  /** The overlay's own × button. */
  closeButton: HTMLElement;
  /**
   * The HUD's research card (top-left, under the bar). The whole card is a
   * button: it opens this screen, and it is where what is being learnt is
   * written between visits. See `renderStatus`.
   */
  statusCard: HTMLButtonElement;
  /** The card's second line: the technology's name, or the prompt to pick one. */
  statusName: HTMLElement;
  /** The dial: its `--progress` custom property is the ring's whole story. */
  statusDial: HTMLElement;
  /** The glyph lit at the centre of the dial's sky. */
  statusGlyph: HTMLElement;
  /** The small parchment boss overlapping the dial's edge — turns left. */
  statusBoss: HTMLElement;
  /** The card's mono figures line — banked over cost. */
  statusFigures: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** Called after a command lands, so the rest of the page catches up. */
  onChanged: () => void;
  /**
   * Called as this screen opens, so whatever else was up can get out of the way.
   *
   * The same hook the HUD's popovers take, and it exists for the same reason:
   * two full-screen surfaces at the same z-index are not a layering question,
   * they are one of them being invisible. There is now a second one (the
   * Abacus), so each closes the other on the way in.
   */
  onOpen?: () => void;
}

/**
 * The chart's element builder, and — since the yield glyphs became drawn marks —
 * its yield printer.
 *
 * `setYieldText` rather than `textContent`, the same one-line change the city
 * panel made and for the same reason: every figure on this screen is composed as
 * text in `YIELD_GLYPH` (`figures.ts`) and lands here — a node's unlock lines, a
 * gift's `40⚙`, a renewal's `+1🌾`. Routing the builder leaves the composition
 * above untouched and makes an emoji impossible to reintroduce by accident.
 */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) setYieldText(el, text);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createTechTree(options: TechTreeOptions): TechTree {
  const {
    overlay,
    chart,
    closeButton,
    statusCard,
    statusName,
    statusDial,
    statusGlyph,
    statusBoss,
    statusFigures,
    getGame,
    localPlayerId,
    onChanged,
    onOpen,
  } = options;

  let open = false;
  let restoreTo: HTMLElement | null = null;
  /** Where each node card ended up, so the sight-lines can be measured. */
  const cards = new Map<TechId, HTMLButtonElement>();

  // --- one node ------------------------------------------------------------

  /**
   * The small marks under a node's name: what it hands over.
   *
   * A unit wears its own glyph — the same letter the board draws on its disc —
   * and a building wears the voice it speaks in, followed by what it would be
   * worth to this empire right now.
   */
  function renderUnlocks(id: TechId): HTMLElement {
    const { state } = getGame();
    const playerId = localPlayerId();
    const list = element('ul', 'tech-unlocks');
    const { units = [], buildings = [] } = techDef(id).unlocks;

    for (const unit of units) {
      const def = unitDef(unit);
      const row = element('li');
      row.append(element('span', 'tech-mark is-unit', def.glyph));
      row.append(element('span', 'tech-unlock-name', def.name));
      // Priced for *this* player, through the simulation's own evaluator: a
      // settler quoted here is quoted at what the next one would actually cost.
      row.append(
        element(
          'span',
          'tech-unlock-note',
          `${unitProductionCost(state, playerId, unit)}${HAMMER}`,
        ),
      );
      list.append(row);
    }

    for (const building of buildings) {
      const def = buildingDef(building);
      const row = element('li');
      row.append(element('span', 'tech-mark is-building', '▣'));
      row.append(element('span', 'tech-unlock-name', def.name));

      // Entry VIII: the actual computed delta, for the cities this player has
      // today. An empire with nowhere to build it says only what it costs.
      const delta = buildingYieldDelta(state, playerId, building);
      const parts = YIELD_GLYPHS.filter(([key]) => delta[key] !== 0).map(
        ([key, glyph]) => `${delta[key] > 0 ? '+' : ''}${delta[key]}${glyph}`,
      );
      row.append(
        element(
          'span',
          parts.length > 0 ? 'tech-unlock-note is-delta' : 'tech-unlock-note',
          parts.length > 0 ? `${parts.join(' ')} now` : `${def.cost}${HAMMER}`,
        ),
      );
      list.append(row);
    }
    return list;
  }

  /**
   * The note that comes up beside a node. `is-night` is the whole difference
   * from the city screen's card: this screen is the one deliberately dark
   * surface in a light interface, and a parchment card glaring over the sky
   * would undo the reason it is dark.
   */
  const info = createInfoCard({ className: 'info-card is-night' });

  /**
   * What a renewal is worth, written as the delta it is: `+1🌾`, and the
   * condition when it has one. Improvements pay in the three tile yields only,
   * so the row is those three and never the five.
   */
  function tileYieldNote(add: TileYield): string {
    const parts: string[] = [];
    if (add.food !== 0) parts.push(`${add.food > 0 ? '+' : ''}${add.food}${YIELD_GLYPH.food}`);
    if (add.production !== 0) {
      parts.push(`${add.production > 0 ? '+' : ''}${add.production}${HAMMER}`);
    }
    if (add.gold !== 0) parts.push(`${add.gold > 0 ? '+' : ''}${add.gold}${YIELD_GLYPH.gold}`);
    return parts.join(' ');
  }

  function renewalNote(gift: TechGift & { kind: 'renewal' }): string {
    const delta = tileYieldNote(gift.add);
    return gift.requiresFreshwater ? `${delta} on fresh water` : delta;
  }

  /**
   * What an ability is worth, in the same three voices — with `once` on the end,
   * because that single word is the whole difference between a chop and a farm
   * and the card would otherwise read as though the forest paid every turn.
   */
  function abilityNote(gift: TechGift & { kind: 'ability' }): string {
    return `${tileYieldNote(gift.pays)} once`;
  }

  /**
   * The same sentence for a building renewal, which pays in six voices rather
   * than three — a building can hand a city beakers, culture and faith, and an
   * improvement never can. Written off the delta's *present* fields, so a
   * renewal that says only `{food: 1}` reads as `+1🌾` and not as four zeroes.
   */
  function buildingRenewalNote(gift: TechGift & { kind: 'buildingRenewal' }): string {
    const add = gift.add;
    const parts: string[] = [];
    const voices: [number | undefined, string][] = [
      [add.food, YIELD_GLYPH.food],
      [add.production, HAMMER],
      [add.gold, YIELD_GLYPH.gold],
      [add.science, YIELD_GLYPH.science],
      [add.culture, YIELD_GLYPH.culture],
      [add.faith, YIELD_GLYPH.faith],
    ];
    for (const [value, glyph] of voices) {
      if (value === undefined || value === 0) continue;
      parts.push(`${value > 0 ? '+' : ''}${value}${glyph}`);
    }
    if (add.sciencePerPop) {
      parts.push(`${add.sciencePerPop > 0 ? '+' : ''}${add.sciencePerPop}${YIELD_GLYPH.science}/pop`);
    }
    return parts.join(' ');
  }

  /**
   * The whole of what a node hands over, which is more than a node card holds.
   *
   * The card in the chart lists the units and buildings, because those are what
   * a player is usually shopping for. This says the rest: the resources the
   * technology reveals (`isResourceVisible` — the ore was always in the ground,
   * and from the moment it is named it is also worth something, on the board and
   * in the panel), and the improvements already on the ground that quietly start
   * paying more. Both are gifts nobody would otherwise find out about except by
   * noticing a number had changed.
   *
   * Every figure in it comes from an evaluator that already exists —
   * `techGifts` for what, `unitProductionCost` for what a unit costs *this*
   * player, `turnsToTech` for the schedule — so this card cannot promise a
   * number some other surface disagrees with.
   */
  function techCard(id: TechId): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    const def = techDef(id);
    const researched = player?.techsResearched.includes(id) ?? false;
    const box = element('div');

    const head = element('div', 'info-card-head');
    const name = element('span', 'info-card-name');
    name.append(element('span', 'info-card-glyph', def.glyph));
    name.append(document.createTextNode(def.name));
    head.append(name);
    head.append(
      element('span', 'info-card-kind', `ÆRA ${AGE_NUMERALS[def.age]} · ${AGE_NAMES[def.age]}`),
    );
    box.append(head);

    const rate = playerScience(state, playerId);
    const figures = element('div', 'info-card-figures');
    figures.append(element('span', 'info-card-cost', `${def.cost}${BEAKER}`));
    // A researched node has no schedule left to quote; everything else is
    // measured against the pool, which is what makes the estimate on a node
    // three columns away an honest answer to "and if I went for that instead?".
    if (!researched) {
      figures.append(
        element('span', 'info-card-turns', turnsLabel(turnsToTech(state, playerId, id))),
      );
      figures.append(element('span', 'info-card-rate', `+${rate}${BEAKER}/t`));
    }
    box.append(figures);

    // The state of the node in one line: done, in hand, or the reducer's own
    // sentence about why not. `researchError` is the same function the node's
    // `disabled` is derived from, so the card and the card's button agree.
    const problem = researchError(state, playerId, id);
    if (researched) {
      box.append(element('p', 'info-card-state', 'Researched'));
    } else if (player?.researching === id) {
      const progress = researchProgress(player.sciencePool, def.cost, rate);
      box.append(
        element('p', 'info-card-state', `Being researched · ${progress.banked}/${progress.cost}`),
      );
    } else if (problem) {
      box.append(element('p', 'info-card-state is-blocked', problem));
    }

    const gifts = techGifts(id);
    if (gifts.length === 0) {
      box.append(element('p', 'info-card-state', 'Hands over nothing on its own'));
    }
    let heading: TechGift['kind'] | null = null;
    let list: HTMLElement | null = null;
    for (const gift of gifts) {
      if (gift.kind !== heading) {
        heading = gift.kind;
        box.append(element('p', 'info-card-heading', GIFT_HEADING[gift.kind]));
        list = element('ul', 'info-card-gifts');
        box.append(list);
      }
      const row = element('li');
      // A reveal names a *resource*, and this interface draws its resources
      // (`src/ui/resourceMark.ts`). Every other gift keeps the glyph its own
      // table declares — `techGifts` still hands over the row's `emoji`, which
      // is the fallback the mark falls back *to*, so a resource nobody has
      // drawn still arrives with something in the box.
      const mark = element('span', `info-card-mark ${GIFT_MARK[gift.kind]}`);
      if (gift.kind === 'reveal') mark.append(resourceMarkNode(gift.id));
      else setYieldText(mark, gift.glyph);
      row.append(mark);
      row.append(element('span', 'info-card-gift-name', gift.name));
      // Units are priced through the simulation's own evaluator; buildings
      // quote their flat cost; a project quotes its *rate*, because a
      // repeatable item has no total; an improvement quotes the charges it
      // spends;
      // a reveal, an ability and the two renewals cost nothing at all, so the
      // ability and the renewals say what they *pay* instead and the reveal
      // says nothing.
      const note =
        gift.kind === 'unit'
          ? `${unitProductionCost(state, playerId, gift.id)}${HAMMER}`
          : gift.kind === 'building'
            ? `${buildingDef(gift.id).cost}${HAMMER}`
            : gift.kind === 'project'
              ? `${projectDef(gift.id).cost}${HAMMER} → ${projectRate(gift.id, PROJECT_GLYPHS)}`
            : gift.kind === 'improvement'
              ? `${improvementDef(gift.id).chargeCost} charge`
              : gift.kind === 'ability'
                ? abilityNote(gift)
                : gift.kind === 'renewal'
                  ? renewalNote(gift)
                  : gift.kind === 'buildingRenewal'
                    ? buildingRenewalNote(gift)
                    : '';
      if (note) row.append(element('span', 'info-card-gift-note', note));
      list?.append(row);
    }

    if (def.flavor) box.append(element('p', 'info-card-flavor', def.flavor));
    return box;
  }

  function renderNode(id: TechId): HTMLElement {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    const def = techDef(id);

    const researched = player?.techsResearched.includes(id) ?? false;
    const current = player?.researching === id;
    const problem = researchError(state, playerId, id);
    // Locked means "not yet, and not next either": the prerequisites are the
    // difference, and they are what the sight-lines are drawn for.
    const choosable = problem === null && !hasEndedTurn(state, playerId);

    const card = element('button', 'tech-node');
    card.type = 'button';
    card.classList.toggle('is-researched', researched);
    card.classList.toggle('is-current', current);
    card.classList.toggle('is-locked', !researched && !current && problem !== null);
    card.disabled = !choosable;
    // Every disabled node says why, in the reducer's own words where there are
    // any: a star you cannot press and cannot ask about is a dead end.
    //
    // It stopped being a `title` when the hover card landed. The card says the
    // same sentence instantly and in this screen's own voice, and a native
    // tooltip would have arrived a second later, on top of it, saying less. So
    // the sentence is carried by a line only a screen reader reads — appended
    // to the card's own content rather than replacing it with an `aria-label`,
    // because a node's cost and its unlocks are worth hearing too.
    const refusal = problem ?? (choosable ? null : `You have ended turn ${state.turn}`);

    const head = element('div', 'tech-node-head');
    // Glyph and name are one group, so `space-between` still puts only the
    // star (when there is one) at the far end rather than fanning three
    // children evenly across the row.
    const title = element('span', 'tech-node-title');
    title.append(element('span', 'tech-node-glyph', def.glyph));
    title.append(element('span', 'tech-node-name', def.name));
    head.append(title);
    if (researched) {
      const star = element('span', 'tech-node-star', '✦');
      star.setAttribute('aria-hidden', 'true');
      head.append(star);
    }
    card.append(head);

    // Cost, and what it would take from here. The pool pays for whichever node
    // it is aimed at, so "~N turns" is honest for a node that is not current.
    const turns = turnsToTech(state, playerId, id);
    const figures = element('div', 'tech-node-figures');
    figures.append(element('span', 'tech-node-cost', `${def.cost}${BEAKER}`));
    if (!researched) {
      figures.append(
        element('span', 'tech-node-turns', turns === null ? '—' : `~${turns}t`),
      );
    }
    card.append(figures);

    if (current && player) {
      // The same arithmetic the HUD's research card draws, from the same
      // helper: the bar on this node and the bar at the top-left of the screen
      // are one fact shown twice, and they must never round differently.
      const progress = researchProgress(
        player.sciencePool,
        def.cost,
        playerScience(state, playerId),
      );
      const track = element('div', 'tech-bar');
      const fill = element('div', 'tech-bar-fill');
      fill.style.width = `${(progress.fraction * 100).toFixed(1)}%`;
      track.append(fill);
      card.append(track);
      card.append(
        element('div', 'tech-node-progress', `${progress.banked} / ${progress.cost}`),
      );
    }

    card.append(renderUnlocks(id));
    if (def.flavor) card.append(element('p', 'tech-node-flavor', def.flavor));
    // Last, so it is heard after the node has been read out rather than before
    // it has been named. See `refusal` above for why it is not a `title`.
    if (refusal) card.append(element('span', 'sr-only', refusal));

    card.addEventListener('click', () => {
      if (!choosable) return;
      const command: Command = { type: 'chooseResearch', playerId, techId: id };
      if (!dispatch(getGame(), command).ok) return;
      render();
      // The card that was clicked no longer exists — the chart is rebuilt from
      // the new state — so the keyboard is handed to the node that replaced it
      // rather than being dropped on the document.
      cards.get(id)?.focus();
      onChanged();
    });

    // Hover, on a node that may well be disabled. A disabled button raises no
    // pointer events in some browsers, so the card is bound and the reading it
    // gives is the whole point of a locked node: a chart you cannot read is not
    // a chart, and `pointer-events: auto` on `.tech-node:disabled` is what lets
    // this fire. It never traps the pointer — see `infoCard.ts`.
    info.bind(card, () => techCard(id));

    cards.set(id, card);
    return card;
  }

  // --- the chart -----------------------------------------------------------

  /** The field the cards are placed on, kept so measurement has an origin. */
  let field: HTMLElement | null = null;

  function renderChart(): void {
    // A rebuild is not a journey: choosing a research redraws every card, and
    // a chart that snapped back to column zero each time would make the player
    // find their place again for nothing.
    const wasAt = { left: chart.scrollLeft, top: chart.scrollTop };

    // Every node is about to be replaced, so an open card would be left
    // pointing at a star that no longer exists. Same reason the city panel
    // does it — see `infoCard.ts`.
    info.hide();
    cards.clear();
    const columns = techColumnCount();
    const rows = techRowCount();

    const built = element('div', 'tech-field');
    // The tracks are written from the data rather than from CSS: the chart is
    // exactly as wide as the deepest chain and as deep as the lanes in use, and
    // both are facts `techData` owns.
    built.style.gridTemplateColumns = `repeat(${columns}, var(--tech-col-w))`;
    // The first track is the age strip; the lanes follow it.
    built.style.gridTemplateRows = `min-content repeat(${rows}, min-content)`;

    // ÆRA I/II/III, painted behind whichever columns their techs settled in.
    // Each age is two pieces: a region spanning every lane, which carries the
    // watermark numeral and the hairline seam where the age changes, and a
    // label in the strip along the top. The age no longer says where a tech
    // goes — it says what to call the ground the tech ended up on.
    for (const [index, band] of techAgeBands().entries()) {
      const span = `${band.from + 1} / ${band.to + 2}`;

      const region = element('div', 'tech-age');
      region.classList.toggle('is-seam', index > 0);
      region.style.gridColumn = span;
      region.style.gridRow = '1 / -1';
      region.setAttribute('aria-hidden', 'true');
      region.append(element('span', 'tech-age-numeral', AGE_NUMERALS[band.age]));
      built.append(region);

      const label = element('div', 'tech-age-label');
      label.style.gridColumn = span;
      label.style.gridRow = '1';
      label.append(element('span', 'tech-era', `ÆRA ${AGE_NUMERALS[band.age]}`));
      label.append(element('span', 'tech-era-name', AGE_NAMES[band.age]));
      built.append(label);
    }

    const lines = document.createElementNS(SVG_NS, 'svg');
    lines.setAttribute('class', 'tech-lines');
    lines.setAttribute('aria-hidden', 'true');
    built.append(lines);

    for (const id of TECH_IDS) {
      const card = renderNode(id);
      card.style.gridColumn = String(techDepth(id) + 1);
      card.style.gridRow = String(techDef(id).row + 2); // past the age strip
      built.append(card);
    }

    field = built;
    chart.replaceChildren(built);
    chart.scrollLeft = wasAt.left;
    chart.scrollTop = wasAt.top;

    // Measured twice, and both are deliberate. Reading `offsetLeft` flushes
    // layout, so the first pass draws lines that are already correct for this
    // paint; the second catches the reflow when a web font finishes loading and
    // every card changes height under them. (A background tab never runs the
    // second, which is exactly right — and why the first is not an animation
    // frame: `requestAnimationFrame` does not fire in a hidden tab at all.)
    drawLines(lines);
    requestAnimationFrame(() => drawLines(lines));
  }

  /**
   * One dotted connector per prerequisite, from the right edge of the earlier
   * node to the left edge of the later one.
   *
   * The curve is a cubic with horizontal handles, so it leaves and arrives flat
   * and a node on the same lane as its prerequisite gets a straight sight-line;
   * the handles are capped, so a connector that spans four columns bends near
   * its ends rather than sagging through the middle of the chart. Because
   * `techDepth` puts every prerequisite in a strictly earlier column, `x2` is
   * always to the right of `x1` and no connector ever doubles back.
   *
   * The SVG sits *behind* the cards, so a line disappears under the two nodes
   * it joins and reads as a sight-line between stars rather than as an arrow.
   */
  function drawLines(svg: SVGSVGElement): void {
    const origin = field;
    if (!origin) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const width = origin.scrollWidth;
    const height = origin.scrollHeight;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const { state } = getGame();
    const player = state.players[localPlayerId()];
    for (const id of TECH_IDS) {
      const to = cards.get(id);
      if (!to) continue;
      const x2 = to.offsetLeft;
      const y2 = to.offsetTop + to.offsetHeight / 2;
      for (const prereq of techDef(id).prereqs) {
        const from = cards.get(prereq);
        if (!from) continue;
        const x1 = from.offsetLeft + from.offsetWidth;
        const y1 = from.offsetTop + from.offsetHeight / 2;
        const reach = Math.max(24, Math.min(90, (x2 - x1) * 0.45));
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute(
          'd',
          `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
            `C ${(x1 + reach).toFixed(1)} ${y1.toFixed(1)}, ` +
            `${(x2 - reach).toFixed(1)} ${y2.toFixed(1)}, ` +
            `${x2.toFixed(1)} ${y2.toFixed(1)}`,
        );
        // A line out of ground the player has already covered is lit; the rest
        // is the faint chart under it.
        const held = player?.techsResearched.includes(prereq) ?? false;
        path.setAttribute('class', held ? 'tech-line is-held' : 'tech-line');
        svg.append(path);
      }
    }
  }

  // --- travelling along it -------------------------------------------------

  /**
   * The node the chart should open on: what is being researched, or failing
   * that the leftmost thing that could be. A chart that opened on column zero
   * would open on ground the player covered an hour ago.
   */
  function anchorCard(): HTMLElement | null {
    const player = getGame().state.players[localPlayerId()];
    const current = player?.researching ?? null;
    if (current !== null) {
      const card = cards.get(current);
      if (card) return card;
    }
    let best: HTMLElement | null = null;
    let bestColumn = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      if (techDepth(id) >= bestColumn) continue;
      best = card;
      bestColumn = techDepth(id);
    }
    return best;
  }

  /**
   * The choosable node nearest the anchor, which is where the keyboard starts.
   *
   * The anchor is often the current research, and the current research is not
   * itself choosable — so the cursor goes to the nearest node that *is*, rather
   * than to the first one in file order, which would be a focus ring parked
   * three columns off the left edge of what the player is looking at.
   */
  function nearestChoosable(anchor: HTMLElement | null): HTMLButtonElement | null {
    const wanted = anchor?.style.gridColumn ? Number(anchor.style.gridColumn) - 1 : 0;
    let best: HTMLButtonElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      const distance = Math.abs(techDepth(id) - wanted);
      if (distance >= bestDistance) continue;
      best = card;
      bestDistance = distance;
    }
    return best;
  }

  /** Puts an element in the middle of the stage, at once and without a tween. */
  function centreOn(card: HTMLElement): void {
    const seen = card.getBoundingClientRect();
    const window_ = chart.getBoundingClientRect();
    const drift = seen.left - window_.left - (chart.clientWidth - seen.width) / 2;
    chart.scrollLeft += drift;
  }

  /** One column-ish, for the arrow keys and for a wheel notch. */
  const NUDGE = 260;

  function nudge(by: number): void {
    chart.scrollLeft += by;
  }

  /**
   * Drag to pan, as one would push a paper chart across a table.
   *
   * The click that ends a drag is swallowed: a player who dragged the chart by
   * grabbing a node did not ask to research it. The threshold is what separates
   * the two gestures, and pointer capture only starts once it is crossed, so a
   * plain click on a card still reaches the card.
   */
  let panFrom: { id: number; x: number; y: number; left: number; top: number } | null = null;
  let panned = false;
  let swallowClick = false;

  chart.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    swallowClick = false;
    panned = false;
    panFrom = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: chart.scrollLeft,
      top: chart.scrollTop,
    };
  });

  chart.addEventListener('pointermove', (event) => {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    const dx = event.clientX - panFrom.x;
    const dy = event.clientY - panFrom.y;
    if (!panned) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      panned = true;
      // Capture keeps a drag that wanders off the stage — or off the window —
      // attached to it. A pointer that has already gone (a synthetic event, a
      // device unplugged mid-drag) refuses to be captured, and that is not a
      // reason to stop panning.
      try {
        chart.setPointerCapture(event.pointerId);
      } catch {
        /* the drag simply loses the pointer if it leaves the stage */
      }
      chart.classList.add('is-panning');
    }
    chart.scrollLeft = panFrom.left - dx;
    chart.scrollTop = panFrom.top - dy;
  });

  function endPan(event: PointerEvent): void {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    if (panned) {
      if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
      chart.classList.remove('is-panning');
      swallowClick = true;
    }
    panFrom = null;
    panned = false;
  }

  chart.addEventListener('pointerup', endPan);
  chart.addEventListener('pointercancel', endPan);

  chart.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  /**
   * The wheel travels sideways, because sideways is the only way this chart
   * goes. A trackpad's horizontal gesture (and the shift-wheel most browsers
   * turn into one) arrives as `deltaX` and is left to the browser; a plain
   * vertical wheel is turned across. Zoom gestures — ctrl or meta held — are
   * never ours to take.
   */
  chart.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (chart.scrollWidth <= chart.clientWidth) return;
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chart.clientWidth : 1;
      event.preventDefault();
      chart.scrollLeft += event.deltaY * unit;
    },
    { passive: false },
  );

  // --- the HUD's research card ---------------------------------------------

  /**
   * The card at the top-left: what this seat is learning, how far along it is,
   * and the way in.
   *
   * Three states, and each is a different sentence rather than a blank field.
   * All three share one dial: its rim is a conic-gradient ring sized by the
   * `--progress` custom property (0–100%, no canvas or SVG), and its sky holds
   * either the tech's own glyph or a stand-in star.
   *
   *   · **Learning something.** The name, the ring at the real fraction, the
   *     tech's glyph lit gilt in the sky, "3t" on the dial's boss, and
   *     "230/250 🔬" below the name.
   *   · **Nothing chosen, and there is still something to choose.** The prompt,
   *     the ring faint and stopped, the sky empty but for one dim ✧, and the
   *     same slow gilt pulse the bar button used to wear — now worn by the
   *     card's border. The nag is a pulse rather than a modal: research is a
   *     decision the player should make, and a screen that demanded it before
   *     the game would continue would be a screen that interrupted the game to
   *     ask. (This is the same condition End Turn's "Choose research" blocker
   *     is derived from — see `firstBlocker` in `turnBlockers.ts`. Both read
   *     `researching` and `availableTechs`, so neither can nag while the other
   *     says all is well.)
   *   · **The tree is finished.** The ring goes fully gilt, the sky keeps a lit
   *     ✦, and the name says so, quietly, and stops asking. The card still
   *     opens the chart, because a finished tree is still worth reading.
   *
   * Always the local seat: this is what *you* are researching, and in a hot-seat
   * session the card follows the chair the same way every other HUD surface
   * does — `localPlayerId()` is asked afresh on every render.
   */
  function renderStatus(): void {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    if (!player) return;

    const current = player.researching;
    const rate = playerScience(state, playerId);

    if (current === null) {
      const remaining = availableTechs(state, playerId).length;
      const prompting = remaining > 0;
      statusCard.classList.toggle('is-prompting', prompting);
      statusCard.classList.toggle('is-done', !prompting);
      statusName.textContent = prompting ? 'Choose research…' : 'Philosophy complete';
      // A stopped ring either way: prompting has no fraction to show, and the
      // finished tree's ring is drawn full by the `.is-done` CSS override on
      // `--ring-color` rather than by a fraction here.
      statusDial.style.setProperty('--progress', prompting ? '0%' : '100%');
      // The sky holds a dim stand-in star while nothing is chosen, and a lit
      // one once the tree is finished — the tech's own glyph belongs to
      // neither state, there being no current tech to draw it for.
      statusGlyph.textContent = prompting ? '✧' : '✦';
      statusGlyph.classList.toggle('is-dim', prompting);
      // Neither state has a turn count: prompting has no denominator to count
      // down, and a finished tree has nothing left to finish.
      statusBoss.textContent = '';
      // With no aim there is no denominator, so the figures line says what the
      // pool *is* — banking is real (see the model in `src/sim/tech.ts`), and a
      // player who has forgotten to choose should see the beakers piling up.
      setYieldText(
        statusFigures,
        prompting
          ? `${Math.floor(player.sciencePool)} ${BEAKER} banked · +${rate}/t`
          : `${player.techsResearched.length}/${TECH_IDS.length} ✦`,
      );
      statusCard.title = prompting
        ? 'Choose what to research (T)'
        : 'Every technology is researched — the star chart is T';
      statusCard.setAttribute(
        'aria-label',
        prompting
          ? `Research: nothing chosen, ${Math.floor(player.sciencePool)} beakers banked. Opens the star chart.`
          : 'Research: every technology is researched. Opens the star chart.',
      );
      return;
    }

    statusCard.classList.remove('is-prompting', 'is-done');
    const def = techDef(current);
    const progress = researchProgress(player.sciencePool, def.cost, rate);
    statusName.textContent = def.name;
    statusDial.style.setProperty('--progress', `${(progress.fraction * 100).toFixed(1)}%`);
    // Through the printer, like every other glyph on this screen: a tech whose
    // own glyph *is* one of the six yield marks — Agriculture, Bronze Working,
    // Drama, Currency — wears the drawn one here as it does on its node, rather
    // than the emoji on one surface and the drawing on the other.
    setYieldText(statusGlyph, def.glyph);
    statusGlyph.classList.remove('is-dim');
    statusBoss.textContent = progress.turns === null ? '' : `${progress.turns}t`;
    // The figures line drops the turn count `progress.figures` carries — the
    // dial's boss says it instead, so the two would otherwise repeat a fact.
    setYieldText(statusFigures, `${progress.banked}/${progress.cost} ${BEAKER}`);
    statusCard.title =
      `${def.name}: ${progress.banked} / ${progress.cost} beakers ` +
      `(+${rate} per turn) — the star chart is T`;
    statusCard.setAttribute(
      'aria-label',
      `Research: ${def.name}, ${progress.banked} of ${progress.cost} beakers, ` +
        `${progress.turns === null ? 'no science being made' : `${progress.turns} turns left`}. ` +
        'Opens the star chart.',
    );
  }

  function render(): void {
    renderStatus();
    if (open) renderChart();
  }

  // --- opening and closing -------------------------------------------------

  function setOpen(next: boolean): void {
    if (open === next) return;
    open = next;
    overlay.hidden = !next;
    statusCard.setAttribute('aria-expanded', String(next));

    if (next) {
      onOpen?.();
      const active = document.activeElement as HTMLElement | null;
      restoreTo = active && active !== document.body ? active : statusCard;
      // A fresh opening starts at the front of the player's own work rather
      // than wherever the last visit was left, so the chart always opens on
      // the decision that is actually in front of them.
      chart.scrollLeft = 0;
      chart.scrollTop = 0;
      renderChart();
      // The current research if there is one, otherwise the first node the
      // player could actually choose: a screen that opens with the cursor on
      // "close" is a screen that opens with nothing to read. The stage travels
      // to the same node, so what has the keyboard is also what is on screen.
      const anchor = anchorCard();
      if (anchor) centreOn(anchor);
      (nearestChoosable(anchor) ?? closeButton).focus({ preventScroll: true });
      return;
    }
    // A card raised over the chart lives on `document.body`, not inside the
    // overlay, so hiding the overlay would not take it with it.
    info.hide();
    restoreTo?.focus();
    restoreTo = null;
    renderStatus();
  }

  closeButton.addEventListener('click', () => setOpen(false));
  statusCard.addEventListener('click', () => setOpen(!open));

  // Escape belongs to whatever is in front, and while this is up that is this.
  // `main.ts` reports the overlay as blocking, so `controls.ts` never sees the
  // key — two listeners racing for one Escape is how a key starts doing two
  // things at once.
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.isContentEditable) return;
    if (event.key === 't' || event.key === 'T') {
      // Like the Escape branch: stop here, or the window listener in
      // controls.ts sees the same press with the overlay now closed and
      // immediately reopens the chart it just shut.
      event.stopPropagation();
      setOpen(false);
      return;
    }
    // The chart only goes sideways, so the sideways keys drive it. Tab still
    // walks the nodes; these are for reading, not for choosing.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      nudge(event.key === 'ArrowLeft' ? -NUDGE : NUDGE);
    }
  });

  // Clicking the ink around the chart closes it, like the popovers do.
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!open) return;
    const svg = chart.querySelector<SVGSVGElement>('svg.tech-lines');
    if (svg) drawLines(svg);
  });

  renderStatus();

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    render,
  };
}

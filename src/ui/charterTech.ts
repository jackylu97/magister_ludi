/**
 * The charter technologies, as the interface shows them (Scientific batch S10).
 *
 * A charter technology is a technology only a charter's holder may research
 * (`TechDef.charter`, batch S0). It is not on the sky the star chart draws. A
 * seat sees one only after it drafts the charter that opens it, and then on a
 * shelf of its own at the foot of the chart. The approved design is
 * `docs/plans/mockups/charter-ux.html`; the rulings on it are
 * `docs/plans/scientific-themes.md` sections 12 to 14.
 *
 * This module holds the pure parts of that design, so the suite (which has no
 * DOM) can test them:
 *
 *   - `shelfTechs`: which charter technologies the shelf holds. Only drafted
 *     ones, and none at all before the first charter (ruled 2026-10-21: "only
 *     show if drafted. Also, if no charters have been drafted, don't show the
 *     section").
 *   - `shelfTab`: whether the tab on the chart's edge shows, on which side,
 *     and which node it points at. The same ruling asked for "some indicator
 *     that it's there for screens that aren't wide enough".
 *   - `chartLead`: the lead, read off feature B (batch S3, `techLead`). It
 *     answers `null` while the seat has met no rival, and the chart then
 *     draws no figure and no corner.
 *   - `charterOfferParts`: the slip of the star chart printed on a charter's
 *     card, and the "Opened" stamp it takes on the pick.
 *   - `traitFaceNote`: the short figure a line trait shows on a node's face.
 *
 * It also builds the one new mark, the charter's seal (`charterSealNode`). The
 * seal says "a charter technology" wherever a technology's name is printed:
 * the node, the plan strip, the drawer's research section, the hover card,
 * the shelf's label and the tab. It is drawn in the charter sepia,
 * `--deck-charter` on parchment and `--deck-charter-lit` on the night chart.
 */

import { type GameState, type Player, playerById } from '../sim/state';
import { metRivals, techLead } from '../sim/rivals';
import { turnsToTech } from '../sim/tech';
import {
  CHARTER_TECH_IDS,
  type TechId,
  type TechTrait,
  eraNumeral,
  isCharterTech,
  isTechId,
  techDef,
} from '../sim/techData';
import { type OrderId, ORDER_IDS, orderDef } from '../sim/statecraftData';
import { openedStamp } from './cardStamp';
import type { OfferOption } from './offerCard';
import { BEAKER } from './researchProgress';
import { priceLineFigure, techPriceList } from './techPrice';

// --- the seal -------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The seal's outline: a sixteen-pointed wax seal with a hole in it. Path data,
 * like every other mark in this interface, so it is drawn at any size and
 * inked by `currentColor`.
 */
export const CHARTER_SEAL_PATH =
  'M8 1.2l1.5 1.3 2-.3.7 1.9 1.9.7-.3 2L15 8l-1.3 1.5.3 2-1.9.7-.7 1.9-2-.3L8 14.8l-1.5-1.3-2 .3-.7-1.9-1.9-.7.3-2L1 8l1.3-1.5-.3-2 1.9-.7.7-1.9 2 .3Z';

/**
 * The charter's seal, as a small inline SVG.
 *
 * Hidden from a screen reader: every surface that draws it also says
 * "charter technology" in words where a reader needs them (the hover card's
 * sub line, the tab's label), so the mark would only be read twice.
 */
export function charterSealNode(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'charter-seal');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(SVG_NS, 'path');
  body.setAttribute('d', CHARTER_SEAL_PATH);
  const hole = document.createElementNS(SVG_NS, 'circle');
  hole.setAttribute('cx', '8');
  hole.setAttribute('cy', '8');
  hole.setAttribute('r', '3.1');
  svg.append(body, hole);
  return svg;
}

// --- the shelf ------------------------------------------------------------------

/**
 * The charter technologies on this seat's shelf, in the file's order.
 *
 * Only the ones the seat has drafted (`Player.charteredTechs`), so a seat with
 * no charter has an empty shelf, and an empty shelf is drawn as nothing at
 * all: no rule, no label and no tab. A rival's charters are never here, and
 * neither is a charter row the seat could draft but has not.
 */
export function shelfTechs(player: Player | undefined): TechId[] {
  if (player === undefined) return [];
  return CHARTER_TECH_IDS.filter((id) => player.charteredTechs.includes(id));
}

// --- the out-of-view tab ----------------------------------------------------------

/** A box in the stage's visible frame: 0,0 is the stage's top-left corner. */
export interface StageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** What the tab says and where it points. */
export interface ShelfTab {
  /** Which part of the chart's foot the tab sits on. */
  side: 'left' | 'right' | 'centre';
  /** One arrow from the eight, pointing at the target node. */
  arrow: string;
  /** The nearest charter node, which a click scrolls to and rings. */
  target: TechId;
  /** How many charter technologies the shelf holds. */
  count: number;
}

/**
 * How much of a node must be in the frame, in pixels each way, for the node
 * to count as seen. A sliver of a card at the frame's edge is not a card the
 * player can read, so the tab stays until a real piece of one is in view.
 */
export const SHELF_TAB_MIN_SEEN = 28;

/** The arrows, keyed by horizontal then vertical direction. */
const TAB_ARROWS: Record<string, string> = {
  '-1,-1': '↖',
  '0,-1': '↑',
  '1,-1': '↗',
  '-1,0': '←',
  '1,0': '→',
  '-1,1': '↙',
  '0,1': '↓',
  '1,1': '↘',
  '0,0': '↓',
};

/**
 * Whether the tab shows, and what it says.
 *
 * `frame` is the stage's visible area and `nodes` are the charter nodes'
 * boxes, both measured in the same frame (the stage's own, so a scrolled or a
 * scaled chart needs no arithmetic here). The answer is `null` when the shelf
 * is empty or when any charter node is in view. Otherwise the tab points at
 * the node nearest the middle of the frame, and sits on the side it is on.
 *
 * A pure function of the measurements, so a test can hold a narrow window
 * still. `techTree.ts` measures and draws; this decides.
 */
export function shelfTab(
  frame: StageBox,
  nodes: readonly { id: TechId; box: StageBox }[],
  minSeen = SHELF_TAB_MIN_SEEN,
): ShelfTab | null {
  if (nodes.length === 0) return null;
  const right = frame.left + frame.width;
  const bottom = frame.top + frame.height;
  const middleX = frame.left + frame.width / 2;
  const middleY = frame.top + frame.height / 2;
  let best: { id: TechId; distance: number; box: StageBox } | null = null;
  for (const node of nodes) {
    const { box } = node;
    const seenX = Math.min(box.left + box.width, right) - Math.max(box.left, frame.left);
    const seenY = Math.min(box.top + box.height, bottom) - Math.max(box.top, frame.top);
    if (seenX >= minSeen && seenY >= minSeen) return null;
    const distance =
      Math.abs(box.left + box.width / 2 - middleX) + Math.abs(box.top + box.height / 2 - middleY);
    // The first of two equal distances wins, so the answer follows the
    // shelf's own order and never the order a browser measured in.
    if (best === null || distance < best.distance) best = { id: node.id, distance, box };
  }
  if (best === null) return null;
  const { box } = best;
  const across = box.left + box.width < frame.left + minSeen ? -1 : box.left > right - minSeen ? 1 : 0;
  const down = box.top + box.height < frame.top + minSeen ? -1 : box.top > bottom - minSeen ? 1 : 0;
  return {
    side: across < 0 ? 'left' : across > 0 ? 'right' : 'centre',
    arrow: TAB_ARROWS[`${across},${down}`] ?? '↓',
    target: best.id,
    count: nodes.length,
  };
}

/** The tab's words for a screen reader: what is out of view and where a click goes. */
export function shelfTabLabel(tab: ShelfTab): string {
  const some = tab.count === 1 ? 'Your charter technology is' : 'Your charter technologies are';
  return `${some} out of view. Scroll to ${techDef(tab.target).name}.`;
}

// --- the lead (feature B) -------------------------------------------------------

/**
 * **The lead**: the technologies this seat knows that no empire it has met
 * knows, its charter technologies included (feature B, the triage's reading
 * 18). The chart prints the count in its head and a gilt corner on each node
 * in it.
 *
 * Read off batch S3's `techLead` (`src/sim/rivals.ts`), which counts met
 * empires only, so the figure leaks nothing about an empire this seat has not
 * met. **`null` while the seat has met no rival**: the lead is then empty by
 * construction (reading 18), and a "lead 0" over a chart nobody else can see
 * would be a figure about nothing. So the chart draws no figure in its head
 * and no corner on any node until the first meeting. After it, the figure is
 * drawn even at nought, because then nought is news: every technology this
 * seat knows, a met empire knows too.
 */
export function chartLead(state: GameState, playerId: number): readonly TechId[] | null {
  if (metRivals(state, playerId).length === 0) return null;
  return techLead(state, playerId);
}

/** What the chart's head prints for the lead: the count, and its words on hover. */
export interface LeadFigure {
  count: number;
  /** The technologies by name, for the figure's title. */
  title: string;
}

/**
 * The head's lead figure, or `null` for no figure at all (a seat that has met
 * no rival). The pure half of `paintLead` in `techTree.ts`.
 */
export function leadFigureOf(lead: readonly TechId[] | null): LeadFigure | null {
  if (lead === null) return null;
  const names = lead.map((id) => techDef(id).name).join(', ');
  return {
    count: lead.length,
    title:
      lead.length === 0
        ? 'Technologies you know that no empire you have met knows: none yet'
        : `Technologies you know that no empire you have met knows: ${names}`,
  };
}

/** Does this node wear the gilt corner of the lead? The pure half of `paintNode`'s mark. */
export function wearsLeadCorner(lead: readonly TechId[] | null, tech: TechId): boolean {
  return lead !== null && lead.includes(tech);
}

// --- a trait on a node's face ---------------------------------------------------

/** The range mark the unit card already prints after a range figure. */
export const RANGE_MARK = '⌖';

/**
 * The short figure a line trait shows on a node's face, where an unlock shows
 * a price: "+1" for a flat strength bonus, "+1⌖" for a range bonus, both
 * together, or nothing for a trait that is all ability (the Repeating
 * Crossbow). The ability itself is on the hover card, in the describers' words.
 *
 * Only the always-on lines are summed. A conditional line (the Maryannu's +5
 * against the wounded, the Hoplite's per citizens) is part of the ability,
 * because a number with a condition is not a bonus the piece always has.
 */
export function traitFaceNote(trait: TechTrait): string {
  let strength = 0;
  let range = 0;
  for (const effect of trait.effects) {
    if (effect.kind === 'combatLine') {
      const always =
        effect.when.test === 'always' &&
        effect.scaled === undefined &&
        effect.side === 'both' &&
        effect.vsClass === undefined;
      if (always) strength += effect.amount;
    } else if (effect.kind === 'unitStat' && effect.stat === 'range') {
      range += effect.amount;
    }
  }
  const parts: string[] = [];
  if (strength !== 0) parts.push(`${strength > 0 ? '+' : '−'}${Math.abs(strength)}`);
  if (range !== 0) parts.push(`${range > 0 ? '+' : '−'}${Math.abs(range)}${RANGE_MARK}`);
  return parts.join(' ');
}

// --- the charter behind a technology ----------------------------------------------

/**
 * The charter technology a card opens, or `null` for a card that opens none.
 *
 * A retired charter may name a technology the tree never held (the
 * Metallurgists' Alloys); that answers `null` too, because there is nothing to
 * draw a slip of.
 */
export function charterTechOf(id: OrderId): TechId | null {
  const tech = orderDef(id).charter?.unlocks.tech;
  if (tech === undefined || !isTechId(tech) || !isCharterTech(tech)) return null;
  return tech;
}

/**
 * The charter that opens this technology, for the hover card's "Opened by"
 * line: the one this seat holds when it holds one, otherwise the first live
 * row that names the technology.
 */
export function charterOpening(tech: TechId, player: Player | undefined): OrderId | null {
  let first: OrderId | null = null;
  for (const id of ORDER_IDS) {
    const def = orderDef(id);
    if (def.retired === true || def.charter?.unlocks.tech !== tech) continue;
    if (player?.statecraft.orders.includes(id)) return id;
    first ??= id;
  }
  return first;
}

// --- the charter card's slip ---------------------------------------------------

/** The words after the turns on a slip: the reason the price is worth paying. */
export const SLIP_NOTE = 'yours alone';

/**
 * **The slip and the stamp for a technology charter's card** (the prototype's
 * step 1 and step 2), or nothing for any other card.
 *
 * The slip is a small piece of the star chart printed on the card face: the
 * technology, its age, its price as a list for this empire, and the turns at
 * the current rate. The choice on a draft is a chair card now or a research
 * path, and the player cannot judge the path without its price, so the price
 * goes where the choice is made.
 *
 * The stamp is "Opened" and the technology's name, dropped on the slip when
 * the card is taken. A charter pays nothing per turn, so a counted figure
 * would be the wrong sentence; a rubber stamp is the right one.
 *
 * Strings only, because `offerCard.ts` takes no simulation type. The caller
 * spreads the answer into the option after `cardStamp`, so the charter's own
 * stamp wins over an empty impact reading.
 */
export function charterOfferParts(
  state: GameState,
  playerId: number,
  id: OrderId,
): Pick<OfferOption, 'slip' | 'stamp'> {
  const tech = charterTechOf(id);
  const player = playerById(state, playerId);
  if (tech === null || player === undefined) return {};
  const def = techDef(tech);
  const price = techPriceList(state, player, tech);
  const turns = turnsToTech(state, playerId, tech);
  return {
    slip: {
      glyph: def.glyph,
      name: def.name,
      age: `ÆRA ${eraNumeral(def.age)}`,
      lines: price.lines.map((line, index) => ({
        label: line.label,
        figure: priceLineFigure(line, index),
        premium: line.premium,
      })),
      total: `${price.total}${BEAKER}`,
      turns: turns === null ? 'no science yet' : `~${turns} turns`,
      note: SLIP_NOTE,
    },
    stamp: openedStamp(def.name),
  };
}

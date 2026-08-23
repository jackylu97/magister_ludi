/**
 * The top bar's left end: what the whole empire earns per turn, and how it feels
 * about it.
 *
 * Five figures — food, production, gold, science, culture — summed across every
 * city the local seat owns, in the colours those yields are always drawn in, and
 * then the two empire meters (Milestone 10): happiness and authority. It is the
 * one place on the screen that answers "how am I doing" without opening
 * anything, which is why it sits before the turn counter in reading order rather
 * than after it.
 *
 * A pure read, and deliberately a UI-layer one. `cityYields` is the same
 * function the city panel, the banners and the turn pipeline use, and
 * `explainHappiness` / `explainAuthority` are the same two the pipeline's
 * multipliers come out of, so the bar can never promise a number the rest of the
 * game disagrees with. The *sum* over cities is a presentation concern (no rule
 * in the game acts on an empire-wide yield total yet), so it lives here and
 * `src/sim/` gains nothing.
 *
 * Three ways to read one number (rule 5, at empire scale)
 * ------------------------------------------------------
 * Every figure in this strip is the fold of a list, and all three ways of asking
 * for that list are the same list:
 *
 *   the chip itself   the total, plus — for a meter that is currently biting —
 *                     its consequence spelled out beside it, so the common case
 *                     needs no gesture at all.
 *   hover             what the number is *doing*: the yields it is multiplying
 *                     and by how much, or, for a yield, which city paid for it.
 *   click (meters)    the whole signed ledger, every line, folding to the
 *                     headline figure.
 *
 * The hover cards are `infoCard.ts`'s, in its `below` placement — a card laid
 * beside a chip in a horizontal strip would cover the chips it is being compared
 * against.
 *
 * Like every other derived readout it is recomputed wherever the rest of the HUD
 * is — after any dispatch and after every turn. The elements are built once and
 * only their text is rewritten: `updatePanel` runs on pointer movement too, and
 * rebuilding a dozen nodes per mouse-move is work nobody asked for. The hover
 * cards are bound once for the same reason; `build` is called at hover time, so
 * a card always quotes the state as it is now.
 */

import { type CityYields, cityYields } from '../sim/cities';
import type { Game } from '../sim/game';
import {
  type MeterContribution,
  type MeterEffect,
  type MeterStanding,
  explainAuthority,
  explainHappiness,
  meterEffects,
  meterStanding,
} from '../sim/meters';
import type { GameState } from '../sim/state';
import { cityDisplayName, starCapitalSource } from './cityDisplay';
import {
  type YieldKey,
  YIELD_GLYPH,
  YIELD_NAME,
  effectFigure,
  figure,
  percentFigure,
  signedFigure,
} from './figures';
import { createInfoCard } from './infoCard';
import { type Popover, createPopover } from './popover';

/**
 * Everything the player's cities make this turn, added up.
 *
 * A player with no cities makes nothing, which is the honest answer for the
 * first few turns of a game rather than a row of em dashes.
 *
 * Each city is asked *toward whatever it is building*, which is the same call
 * `collectYields` banks with: since the Age I rework a barracks puts a share of
 * its city's hammers behind a unit, and a strip that quoted the unmodified rate
 * would be a headline the turn resolution disagrees with.
 */
export function civYields(state: GameState, playerId: number): CityYields {
  const total: CityYields = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(state, city, [], city.queue[0]);
    total.food += yields.food;
    total.production += yields.production;
    total.gold += yields.gold;
    total.science += yields.science;
    total.culture += yields.culture;
  }
  return total;
}

/**
 * The five yields, in the order the city panel's chip row lists them. The
 * glyphs and the names come from `figures.ts`, which is the one table — a
 * second copy in this file is exactly the drift that module exists to stop.
 */
const YIELDS: readonly YieldKey[] = ['food', 'production', 'gold', 'science', 'culture'];

/**
 * The two meters, as the interface says them. Placeholder glyphs by project
 * policy — the ledger wants theatre masks and a wax seal (Entry XIV.C), and
 * those are drawn art rather than a code change.
 */
const HAPPINESS_GLYPH = '☺';
const AUTHORITY_GLYPH = '⚜';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** "science +10%, culture +10%" — an effect in words, for the hover card. */
function effectWords(effect: MeterEffect): string {
  const names = effect.growth ? ['growth'] : effect.yields;
  return names.map((name) => `${name} ${percentFigure(effect.percent)}`).join(', ');
}

export interface CivYieldStrip {
  /** Re-reads the cities and rewrites whichever figures changed. */
  render(): void;
  /** True while either meter's breakdown card is open. */
  readonly isOpen: boolean;
  /** Shuts both breakdown cards and any hover card. Esc, a new game, a screen. */
  close(): void;
}

/** The three elements one meter's click-through breakdown card is made of. */
export interface MeterCardElements {
  panel: HTMLElement;
  closeButton: HTMLElement;
  /** The element the signed ledger is written into. Rewritten on every open. */
  body: HTMLElement;
}

export interface CivYieldStripOptions {
  /** The element the figures live in. Filled once, then only rewritten. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  happiness: MeterCardElements;
  authority: MeterCardElements;
  /** Told whenever one of these cards opens, so the HUD's others can shut. */
  onOpenPopover?: () => void;
}

export function createCivYieldStrip(options: CivYieldStripOptions): CivYieldStrip {
  const { container, getGame, localPlayerId, happiness, authority, onOpenPopover } = options;
  const values = new Map<YieldKey, HTMLElement>();

  /**
   * One card for the whole strip, dropped under whatever is being hovered. The
   * anchors here are permanent — the strip rewrites text and never rebuilds —
   * so unlike the city panel's card this one never needs hiding on a render.
   */
  const info = createInfoCard({ className: 'info-card is-strip', placement: 'below' });

  container.replaceChildren();

  // --- the five yields ------------------------------------------------------

  for (const key of YIELDS) {
    const label = YIELD_NAME[key];
    const item = element('span', `civ-yield is-${key}`);
    const icon = element('span', 'civ-yield-icon', YIELD_GLYPH[key]);
    // The glyph is decoration with a word behind it: a screen reader gets
    // "food 14", not "sheaf of rice 14".
    icon.setAttribute('aria-hidden', 'true');
    const value = element('span', 'civ-yield-value', '0');
    item.append(icon, value);
    item.title = `${label} per turn`;
    item.setAttribute('aria-label', label);
    // Focusable, because the card is the only place the per-city split exists
    // and a keyboard should be able to reach it (see `infoCard.ts`, which binds
    // focus alongside hover).
    item.tabIndex = 0;
    values.set(key, value);
    info.bind(item, () => yieldCard(key, label));
    container.append(item);
  }

  /**
   * Which city paid for a total — one line each, folding to the headline figure.
   *
   * `cityYields` per city, which is exactly what `civYields` sums: the card is
   * the summands of the number beside it, never a second derivation of it.
   */
  function yieldCard(key: YieldKey, label: string): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const box = element('div');
    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', label));
    head.append(
      element('span', 'info-card-kind', `${figure(civYields(state, playerId)[key])} per turn`),
    );
    box.append(head);

    const lines = element('ul', 'meter-lines');
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      lines.append(
        meterLine(
          cityDisplayName(state, city),
          cityYields(state, city, [], city.queue[0])[key],
          false,
        ),
      );
    }
    if (lines.childElementCount === 0) {
      box.append(element('p', 'hint', 'No cities yet.'));
      return box;
    }
    box.append(lines);
    return box;
  }

  // --- the two meters -------------------------------------------------------

  const meters = element('div', 'civ-meters');
  meters.setAttribute('aria-label', 'Empire meters');

  function chip(glyph: string, label: string, controls: string): HTMLButtonElement {
    const button = element('button', 'civ-meter');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', controls);
    const icon = element('span', 'civ-meter-icon', glyph);
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, element('span', 'civ-meter-value', '—'));
    button.title = `${label} — click for the full breakdown`;
    meters.append(button);
    return button;
  }

  const happinessChip = chip(HAPPINESS_GLYPH, 'Happiness', happiness.panel.id);
  const authorityChip = chip(AUTHORITY_GLYPH, 'Authority', authority.panel.id);
  container.append(meters);

  /** The effects one meter is currently applying, in `meterEffects` order. */
  function effectsOf(meter: 'happiness' | 'authority'): MeterEffect[] {
    const { state } = getGame();
    return meterEffects(state, localPlayerId()).filter((effect) => effect.meter === meter);
  }

  /**
   * One line of a ledger: what it is, and what it is worth. Signed for a meter's
   * contributions (where the sign is the whole point) and plain for a yield's.
   */
  function meterLine(source: string, value: number, signed: boolean): HTMLElement {
    const line = element('li', 'meter-line');
    line.append(element('span', 'meter-line-source', source));
    const amount = signed ? signedFigure(value) : figure(value);
    line.append(
      element('span', value < 0 ? 'meter-line-value is-cost' : 'meter-line-value', amount),
    );
    return line;
  }

  /** The signed ledger, as the click-through card shows it. */
  function renderLedger(body: HTMLElement, entries: MeterContribution[], standing: MeterStanding): void {
    body.replaceChildren();
    const { state } = getGame();
    const playerId = localPlayerId();
    const lines = element('ul', 'meter-lines');
    for (const entry of entries) {
      lines.append(meterLine(starCapitalSource(state, playerId, entry.source), entry.value, true));
    }
    if (entries.length === 0) {
      body.append(element('p', 'hint', 'Nothing on either side of the ledger yet.'));
      return;
    }
    body.append(lines);
    const total = element('div', 'meter-total');
    total.append(element('span', 'meter-line-source', 'Total'));
    total.append(element('span', 'meter-line-value', signedFigure(standing.total)));
    body.append(total);
  }

  /**
   * The hover card: what this meter is *doing*, in words.
   *
   * A meter that is doing nothing says so rather than showing an empty card —
   * "nothing yet" is a real answer and the commonest one for the first fifty
   * turns of a game.
   */
  function effectCard(label: string, headline: string, effects: MeterEffect[]): Node {
    const box = element('div');
    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', label));
    head.append(element('span', 'info-card-kind', headline));
    box.append(head);
    if (effects.length === 0) {
      box.append(element('p', 'hint', 'No effect at this level.'));
      return box;
    }
    const lines = element('ul', 'meter-lines');
    for (const effect of effects) {
      const line = element('li', 'meter-line');
      line.append(element('span', 'meter-line-source', effectWords(effect)));
      lines.append(line);
    }
    box.append(lines);
    return box;
  }

  const happinessCard: Popover = createPopover({
    panel: happiness.panel,
    trigger: happinessChip,
    closeButton: happiness.closeButton,
    onOpen: () => {
      authorityCard.close();
      onOpenPopover?.();
      const { state } = getGame();
      const entries = explainHappiness(state, localPlayerId());
      renderLedger(happiness.body, entries, meterStanding(entries));
    },
  });

  const authorityCard: Popover = createPopover({
    panel: authority.panel,
    trigger: authorityChip,
    closeButton: authority.closeButton,
    onOpen: () => {
      happinessCard.close();
      onOpenPopover?.();
      const { state } = getGame();
      const entries = explainAuthority(state, localPlayerId());
      renderLedger(authority.body, entries, meterStanding(entries));
    },
  });

  info.bind(happinessChip, () => {
    const { state } = getGame();
    const standing = meterStanding(explainHappiness(state, localPlayerId()));
    return effectCard('Happiness', signedFigure(standing.total), effectsOf('happiness'));
  });
  info.bind(authorityChip, () => {
    const { state } = getGame();
    const standing = meterStanding(explainAuthority(state, localPlayerId()));
    return effectCard(
      'Authority',
      `${figure(standing.cost)}/${figure(standing.gain)}`,
      effectsOf('authority'),
    );
  });

  /**
   * Writes one chip: the figure, and the consequence when there is one.
   *
   * The consequence is on the chip and not only in a card because it is the
   * thing the player must not miss — Entry XIV.C's "the number and its meaning
   * in one glance, no tooltip required". The alert ink is reserved for a meter
   * in *deficit*: a bonus is also a modifier, and colouring it vermilion would
   * teach the player to flinch at good news.
   */
  function writeChip(
    chipEl: HTMLElement,
    figure: string,
    total: number,
    effects: MeterEffect[],
    label: string,
  ): void {
    const value = chipEl.querySelector('.civ-meter-value') as HTMLElement;
    const tail = effects.map(effectFigure).join(' · ');
    const text = tail ? `${figure} · ${tail}` : figure;
    if (value.textContent !== text) value.textContent = text;
    chipEl.classList.toggle('is-alarm', total < 0);
    chipEl.classList.toggle('is-good', total >= 0 && effects.length > 0);
    const spoken = effects.map(effectWords).join('; ');
    chipEl.setAttribute('aria-label', spoken ? `${label} ${figure}: ${spoken}` : `${label} ${figure}`);
  }

  return {
    render(): void {
      const { state } = getGame();
      const playerId = localPlayerId();
      const totals = civYields(state, playerId);
      for (const key of YIELDS) {
        const el = values.get(key)!;
        const text = String(totals[key]);
        if (el.textContent !== text) el.textContent = text;
      }

      const happinessStanding = meterStanding(explainHappiness(state, playerId));
      writeChip(
        happinessChip,
        signedFigure(happinessStanding.total),
        happinessStanding.total,
        effectsOf('happiness'),
        'Happiness',
      );

      const authorityStanding = meterStanding(explainAuthority(state, playerId));
      writeChip(
        authorityChip,
        `${figure(authorityStanding.cost)}/${figure(authorityStanding.gain)}`,
        authorityStanding.total,
        effectsOf('authority'),
        'Authority',
      );

      // An open card is showing a ledger from before whatever just happened.
      if (happinessCard.isOpen) {
        const entries = explainHappiness(state, playerId);
        renderLedger(happiness.body, entries, meterStanding(entries));
      }
      if (authorityCard.isOpen) {
        const entries = explainAuthority(state, playerId);
        renderLedger(authority.body, entries, meterStanding(entries));
      }
    },
    get isOpen() {
      return happinessCard.isOpen || authorityCard.isOpen;
    },
    close(): void {
      happinessCard.close();
      authorityCard.close();
      info.hide();
    },
  };
}

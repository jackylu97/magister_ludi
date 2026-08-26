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
 *   the chip itself   the total, and the total alone — coloured when a meter is
 *                     in deficit, which is the one thing that has to survive
 *                     with no gesture at all. It used to spell its consequence
 *                     out beside the figure; see `writeChip` for why a sentence
 *                     in glyphs was not carrying its width.
 *   hover             where the number comes from and what it is doing: for a
 *                     meter, its ledger grouped into the two sides it is the
 *                     difference of, then its effects in words; for a yield,
 *                     which city paid for it.
 *   click (meters)    the whole signed ledger, every line in the order the rules
 *                     produced it, folding to the headline figure.
 *
 * The hover cards are `infoCard.ts`'s, in its `below` placement — a card laid
 * beside a chip in a horizontal strip would cover the chips it is being compared
 * against.
 *
 * **Gold and faith** are the exceptions to "the total, and the total alone":
 * they are the two yields the empire *banks* (`Player.gold`, `Player.faithPool`)
 * rather than only earns, and a bank a player cannot see is a discovery's
 * Traders' hoard, a tile purchase that appears to do nothing, or a hundred turns
 * of piety with nothing to show for them. Both chips are pool-first —
 * `poolFigure` (`figures.ts`) — with the per-turn total every other chip shows
 * on its own moved into parens beside it, and both hover cards lead with the
 * banked row before the same per-city breakdown the other four have always had.
 * Which yields those are, and what their pools are called, is the `BANKED`
 * register below rather than a comparison repeated at each of the three sites.
 *
 * Like every other derived readout it is recomputed wherever the rest of the HUD
 * is — after any dispatch and after every turn. The elements are built once and
 * only their text is rewritten: `updatePanel` runs on pointer movement too, and
 * rebuilding a dozen nodes per mouse-move is work nobody asked for. The hover
 * cards are bound once for the same reason; `build` is called at hover time, so
 * a card always quotes the state as it is now.
 */

import { type CityYields, cityYields, emptyCityYields } from '../sim/cities';
import type { Game } from '../sim/game';
import {
  type MeterContribution,
  type MeterEffect,
  type MeterId,
  type MeterStanding,
  explainAuthority,
  explainHappiness,
  meterEffects,
  meterStanding,
} from '../sim/meters';
import { empireResourceYields, foldResourceYields } from '../sim/resourceEffects';
import { type GameState, type Player, playerById } from '../sim/state';
import { cityDisplayName, starCapitalSource } from './cityDisplay';
import {
  type YieldKey,
  YIELD_NAME,
  YIELD_NOTE,
  figure,
  percentFigure,
  poolFigure,
  signedFigure,
} from './figures';
import { hasStatecraftOffer, nextDraftCost, statecraftBlocker } from '../sim/statecraft';
import { createInfoCard } from './infoCard';
import { meterGroups } from './meterBreakdown';
import { meterMarkNode } from './meterMark';
import { type Popover, createPopover } from './popover';
import { yieldMarkNode } from './yieldMark';

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
  const total: CityYields = emptyCityYields();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(state, city, [], city.queue[0]);
    total.food += yields.food;
    total.production += yields.production;
    total.gold += yields.gold;
    total.science += yields.science;
    total.culture += yields.culture;
    total.faith += yields.faith;
  }
  // The empire-scale luxury signatures, which belong to no city and are banked
  // once per turn by `collectYields`. Added here for the same reason they are
  // added there: a headline that left them out would be a headline the turn
  // resolution disagrees with.
  const empire = foldResourceYields(empireResourceYields(state, playerId));
  total.gold += empire.gold;
  total.science += empire.science;
  total.culture += empire.culture;
  total.faith += empire.faith;
  return total;
}

/**
 * The six yields, in the order the city panel's chip row lists them. The
 * glyphs and the names come from `figures.ts`, which is the one table — a
 * second copy in this file is exactly the drift that module exists to stop.
 *
 * Faith is on the strip from the pass that introduced it even though nothing
 * spends it: it is banked every turn and a bank the player cannot see is a bank
 * they cannot plan around. Its card says as much (`YIELD_NOTE`).
 */
const YIELDS: readonly YieldKey[] = ['food', 'production', 'gold', 'science', 'culture', 'faith'];

/**
 * The yields the empire **banks** rather than only earns, and where the pool is.
 *
 * Two of the six, and the register is here rather than as a pair of `key ===`
 * tests because it is read in three places — the chip's figure, the chip's
 * title, and the hover card's leading row — and three hand-rolled comparisons
 * are how gold came to read one way and faith another. A third banked yield
 * joins by adding a row.
 *
 * The rule for membership is a fact about the simulation, not a preference:
 * `Player` carries a running pool for this yield. Gold has `gold`, which
 * `purchaseTile` and the buy buttons check against; faith has `faithPool`, which
 * `collectYields` adds to and — today — nothing spends. Both are banks a player
 * cannot see anywhere else, and a bank a player cannot see is a discovery's
 * Traders' hoard or a hundred turns of piety that appear to do nothing.
 *
 * Faith's card still ends with `YIELD_NOTE.faith` saying that nothing spends it.
 * The two statements are not in tension and both are load-bearing: the pool is
 * real and is *accumulating*, and it has no sink yet. The day something spends
 * it, the note goes (see the trap in `CLAUDE.md`) and this row does not.
 */
const BANKED: Partial<
  Record<YieldKey, { pool: (player: Player) => number; line: string; title: string }>
> = {
  gold: { pool: (player) => player.gold, line: 'On hand', title: 'Gold on hand' },
  faith: { pool: (player) => player.faithPool, line: 'Gathered', title: 'Faith gathered' },
};

/**
 * The two meters, as **text** — the register `YIELD_GLYPH` keeps for the six
 * yields (`figures.ts`), one meter over. `smile` and `stamp` are what a
 * player *sees* now (`src/art/meterMarks.ts`, drawn by `meterMarkNode`);
 * these two characters are what survives everywhere a figure has to be a
 * string and cannot hold an element — today, the chip's own native tooltip,
 * which a mask cannot fill.
 *
 * No longer placeholders: Entry XIV.C's want for theatre masks and a wax seal
 * is answered by a face and a stamp rather than by the literal masks and
 * seal it named, on the squint-test call `src/art/meterMarks.ts` documents.
 */
const METER_GLYPH: Record<MeterId, string> = {
  happiness: '☺',
  authority: '⚜',
};

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

/**
 * "science +10%, culture +10%" — an effect in words, for the hover card.
 *
 * The border freeze is the one effect that reads as a *consequence* rather than
 * as a percentage, and it is written out in full: "borders frozen · purchases
 * barred" is what an overdrawn writ actually does to a player's turn, and
 * "borders −100%" would be arithmetic they then have to translate. Recognised by
 * its own channel and its own magnitude, never by the meter's total — the rung
 * lives in `rules.json` (`meters.borderFreeze`), and a softer table would
 * correctly stop producing this sentence.
 */
function effectWords(effect: MeterEffect): string {
  if (effect.borders && effect.percent <= -100) return 'borders frozen · purchases barred';
  const names = effect.growth ? ['growth'] : effect.yields;
  const words = names.map((name) => `${name} ${percentFigure(effect.percent)}`);
  // A writ that runs speeds the borders as well as the forges, and it says both
  // on the one line, because it is one fact about the empire.
  if (effect.borders) words.push(`borders ${percentFigure(effect.percent)}`);
  return words.join(', ');
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
  /** The chip elements themselves, for the one thing a figure cannot say: a badge. */
  const chips = new Map<YieldKey, HTMLElement>();

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
    // The drawn mark, not the emoji it used to print (`src/ui/yieldMark.ts`).
    // It is already `aria-hidden`, and the word behind it is on the chip: a
    // screen reader gets "food 14", not "sheaf of rice 14".
    const icon = element('span', 'civ-yield-icon');
    icon.append(yieldMarkNode(key, true));
    const value = element('span', 'civ-yield-value', '0');
    item.append(icon, value);
    // Two of the six have a bank behind the rate — the chip leads with the
    // pool and puts the per-turn rate every other yield shows on its own in
    // parens beside it, so the title says that rather than "per turn" alone.
    // See `BANKED` for why these two and not the rest.
    item.title = BANKED[key] ? `${BANKED[key]!.title}, per turn in parens` : `${label} per turn`;
    item.setAttribute('aria-label', label);
    // Focusable, because the card is the only place the per-city split exists
    // and a keyboard should be able to reach it (see `infoCard.ts`, which binds
    // focus alongside hover).
    item.tabIndex = 0;
    values.set(key, value);
    chips.set(key, item);
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

    // A banked yield leads with its pool: what is on hand, which for gold is the
    // figure `purchaseTile` checks against and for faith is the whole of what
    // the yield has ever been. Led before the per-city breakdown for the same
    // reason the chip leads with it — a treasury is read before an income is. It
    // is its own row, ruled off from the breakdown rather than folded into it,
    // because it is not a summand of the "per turn" headline above (rule 5's
    // fold is still exactly the city lines below; this is a second, independent
    // number).
    const banked = BANKED[key];
    if (banked) {
      const player = playerById(state, playerId);
      if (player) {
        const onHand = element('div', 'meter-total');
        onHand.append(element('span', 'meter-line-source', banked.line));
        onHand.append(element('span', 'meter-line-value', figure(banked.pool(player))));
        box.append(onHand);
      }
    }

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
    // One line per empire-scale luxury signature, after the cities, because
    // that is where it is banked and because "Silk +2" belongs to no town.
    for (const line of empireResourceYields(state, playerId)) {
      const value = line[key];
      if (value === 0) continue;
      lines.append(meterLine(`${line.source} · empire`, value, false));
    }
    // Culture's card gains the ladder it now buys (Entry XV): the tier, the
    // basket against the next threshold, and whatever offer is outstanding.
    // Here rather than as a second chip because it is not a second number — it
    // is what this number is *for*, and a player reading their culture rate
    // wants the answer in the same breath.
    if (key === 'culture') {
      const player = playerById(state, playerId);
      if (player) {
        const sc = player.statecraft;
        const ladder = element('div', 'meter-total');
        ladder.append(element('span', 'meter-line-source', `Tier ${sc.drafts} · next draft`));
        ladder.append(
          element(
            'span',
            'meter-line-value',
            `${Math.max(0, Math.floor(player.culturePool))}/${nextDraftCost(player)}`,
          ),
        );
        box.append(ladder);
      }
    }

    const note = YIELD_NOTE[key];
    if (lines.childElementCount === 0) {
      box.append(element('p', 'hint', 'No cities yet.'));
      if (note) box.append(element('p', 'hint', note));
      return box;
    }
    box.append(lines);
    if (note) box.append(element('p', 'hint', note));
    if (key === 'culture') {
      const player = playerById(state, playerId);
      const waiting = player ? statecraftBlocker(player) : null;
      if (waiting !== null) box.append(element('p', 'hint hint-alert', `☞ ${waiting} — press C.`));
      else if (player?.statecraft.pendingGovernment !== undefined) {
        box.append(element('p', 'hint hint-alert', '☞ a charter is ready to be sworn — press C.'));
      }
    }
    return box;
  }

  // --- the two meters -------------------------------------------------------

  const meters = element('div', 'civ-meters');
  meters.setAttribute('aria-label', 'Empire meters');

  function chip(meter: MeterId, label: string, controls: string): HTMLButtonElement {
    const button = element('button', 'civ-meter');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', controls);
    const icon = element('span', 'civ-meter-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.append(meterMarkNode(meter));
    button.append(icon, element('span', 'civ-meter-value', '—'));
    // The glyph survives here, in the one spot on this chip that has to be a
    // string a native tooltip can hold — see `METER_GLYPH`.
    button.title = `${METER_GLYPH[meter]} ${label} — click for the full breakdown`;
    meters.append(button);
    return button;
  }

  /**
   * The click-through card's own header lives in `index.html` as static
   * markup — "Happiness"/"Authority" never changes — so the mark joins it
   * once here rather than being rebuilt on every open the way `meterCard`'s
   * hover header is. Wrapped with the title in one `.popover-head-label` so
   * `.popover-head`'s `justify-content: space-between` keeps treating
   * icon-and-name as a single item against the close button.
   */
  function paintCardHead(elements: MeterCardElements, meter: MeterId): void {
    const title = elements.panel.querySelector<HTMLElement>('.popover-title');
    if (!title) return;
    const wrap = element('span', 'popover-head-label');
    title.replaceWith(wrap);
    wrap.append(meterMarkNode(meter), title);
  }

  const happinessChip = chip('happiness', 'Happiness', happiness.panel.id);
  const authorityChip = chip('authority', 'Authority', authority.panel.id);
  paintCardHead(happiness, 'happiness');
  paintCardHead(authority, 'authority');
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
   * The hover card: where this meter's number comes from, and what it is doing.
   *
   * Two halves, in that order, and the order is the point. Since the chips stopped
   * carrying their effects inline — a chip is a *figure*, and "☺ +8 · 🔬🎭 +10%"
   * was a sentence wearing a number's clothes — this card is where a player goes
   * first, so it opens with the breakdown and closes with the consequence.
   *
   *   the breakdown  the ledger grouped into the two sides the meter is the
   *                  difference of (`meterGroups`), each side carrying its own
   *                  subtotal: supply and demand, capacity and what is spending
   *                  it. Every line of `explainHappiness` / `explainAuthority` is
   *                  in exactly one group, so the card is the summands of the
   *                  figure beside it and never a second derivation of it.
   *   the effects    unchanged, and still last: what the number is currently
   *                  doing to the economy, in words.
   *
   * A meter that is doing nothing still says so rather than showing a card that
   * stops after the ledger — "no effect at this level" is a real answer and the
   * commonest one for the first fifty turns of a game.
   */
  function meterCard(
    meter: MeterId,
    label: string,
    headline: string,
    entries: MeterContribution[],
    effects: MeterEffect[],
  ): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const box = element('div');
    const head = element('div', 'info-card-head');
    const name = element('span', 'info-card-name');
    name.append(meterMarkNode(meter));
    name.append(document.createTextNode(label));
    head.append(name);
    head.append(element('span', 'info-card-kind', headline));
    box.append(head);

    for (const group of meterGroups(meter, entries)) {
      const heading = element('div', 'meter-group');
      heading.append(element('span', 'meter-line-source', group.label));
      heading.append(
        element(
          'span',
          group.total < 0 ? 'meter-line-value is-cost' : 'meter-line-value',
          signedFigure(group.total),
        ),
      );
      box.append(heading);
      const lines = element('ul', 'meter-lines');
      for (const entry of group.lines) {
        lines.append(meterLine(starCapitalSource(state, playerId, entry.source), entry.value, true));
      }
      box.append(lines);
    }

    if (effects.length === 0) {
      box.append(element('p', 'hint', 'No effect at this level.'));
      return box;
    }
    const lines = element('ul', 'meter-lines is-effects');
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
    const entries = explainHappiness(state, localPlayerId());
    const standing = meterStanding(entries);
    return meterCard(
      'happiness',
      'Happiness',
      signedFigure(standing.total),
      entries,
      effectsOf('happiness'),
    );
  });
  info.bind(authorityChip, () => {
    const { state } = getGame();
    const entries = explainAuthority(state, localPlayerId());
    const standing = meterStanding(entries);
    // Used against capacity, which is the reading the *chip* gave up when it
    // went to a net figure: the card is where "six of eight" still lives.
    return meterCard(
      'authority',
      'Authority',
      `${figure(standing.cost)}/${figure(standing.gain)}`,
      entries,
      effectsOf('authority'),
    );
  });

  /**
   * Writes one chip: a glyph and a figure, and nothing else.
   *
   * The effects used to be spelled out beside the number — "☺ +8 · 🔬🎭 +10%" —
   * on Entry XIV.C's reading that the consequence is the thing a player must not
   * miss. Two meters doing that at once is most of a HUD strip spent on two
   * numbers, and the glyph run is unreadable at a glance anyway: it is a
   * *sentence*, and a sentence belongs in the card that has room for words. The
   * chip keeps the half of that decision that works without any gesture at all —
   * the **colour**. Vermilion is still reserved for a meter in deficit, because
   * a bonus is also a modifier and colouring it alarm ink would teach the player
   * to flinch at good news; the good state keeps its own quiet ink.
   *
   * The spoken label keeps the sentence, because a screen reader has no colour
   * and no hover.
   */
  function writeChip(
    chipEl: HTMLElement,
    figure: string,
    total: number,
    effects: MeterEffect[],
    label: string,
  ): void {
    const value = chipEl.querySelector('.civ-meter-value') as HTMLElement;
    if (value.textContent !== figure) value.textContent = figure;
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
      const player = playerById(state, playerId);
      for (const key of YIELDS) {
        const el = values.get(key)!;
        // A banked yield is pool-first: the figure a player acts on is what is
        // on hand, so it leads and the per-turn total — what every other yield
        // chip shows on its own — moves into parens beside it. `totals[key]` is
        // the rate, taken from the same `civYields` fold the card breaks down,
        // so the chip and the card cannot come to disagree about it.
        const banked = BANKED[key];
        const text =
          banked && player ? poolFigure(banked.pool(player), totals[key]) : String(totals[key]);
        if (el.textContent !== text) el.textContent = text;
      }

      // The badge: a small mark on the culture chip while Statecraft owes the
      // player a decision. It rides on the chip rather than on a control of its
      // own for the reason the ladder rides on culture's card — it is a fact
      // about what this number bought.
      const cultureChip = chips.get('culture');
      if (cultureChip) {
        cultureChip.classList.toggle('civ-yield-waiting', player ? hasStatecraftOffer(player) : false);
      }

      const happinessStanding = meterStanding(explainHappiness(state, playerId));
      writeChip(
        happinessChip,
        signedFigure(happinessStanding.total),
        happinessStanding.total,
        effectsOf('happiness'),
        'Happiness',
      );

      // The **net** writ, not "used of capacity". Both meters now read the same
      // way — one signed figure, positive is room to move — and the pair of
      // numbers is a thing the player looks up rather than watches: it lives in
      // the hover card's headline and in its two group subtotals. A chip saying
      // "6/8" also has to be *subtracted* before it means anything, which is
      // work the strip should be saving.
      const authorityStanding = meterStanding(explainAuthority(state, playerId));
      writeChip(
        authorityChip,
        signedFigure(authorityStanding.total),
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

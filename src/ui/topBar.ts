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

import {
  type CityYields,
  cityQuote,
  cityYields,
  emptyCityYields,
  empirePercents,
  explainEmpireCardYields,
} from '../sim/cities';
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
import { empireGold, explainEmpireGold } from '../sim/trade';
import {
  type UpkeepLine,
  explainBuildingUpkeep,
  explainUnitUpkeep,
} from '../sim/upkeep';
import { type GameState, type Player, playerById, realPlayers } from '../sim/state';
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
import { foldCardYields, nextDraftCost, statecraftBlocker } from '../sim/statecraft';
import { greatPersonBlocker } from '../sim/greatPeople';
import { explainRenown, foldRenown, renownPerTurn, renownThreshold } from '../sim/renown';
import { TRIUMPH_IDS, type TriumphScope, triumphDef } from '../sim/triumphData';
import { BEAD_RULES, anyBeadDef } from '../sim/beadData';
import { BEAD_FAMILY_MARK } from './beadsScreen';
import { ABILITY_TECH, highestAge, techDef, techsGrant } from '../sim/techData';
import { createInfoCard } from './infoCard';
import { foldCityHappiness, meterGroups } from './meterBreakdown';
import { meterMarkNode, renownMarkNode } from './meterMark';
import { type Popover, createPopover } from './popover';
import { tradeLedger } from './tradeScreen';
import { YIELD_GLYPH, setYieldText, yieldMarkNode } from './yieldMark';

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
 *
 * **The empire's half of every town's percentages is taken once** (2026-08-29).
 * `cityQuote`'s default is `empirePercents(state, ownerId)`, which sweeps the two
 * meters over every city and every unit the empire holds — a *pure function of
 * the seat*, so asking it once per town was the same answer summed a dozen
 * times, and this strip is redrawn on every accepted command. Hoisted through
 * the parameter the sim already offers rather than worked out beside it (hard
 * rule 5): the figure is still `cityYields`' own fold, and the cost test pins
 * the hoisted reading equal to the unhoisted one, city by city.
 */
export function civYields(state: GameState, playerId: number): CityYields {
  const total: CityYields = emptyCityYields();
  const empirePercent = empirePercents(state, playerId);
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(
      state,
      city,
      [],
      city.queue[0],
      cityQuote(state, city, [], empirePercent),
    );
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
  // The empire-scale gold, banked by `collectYields` in the same pass and for
  // the same reason as the signatures above it: none of its four lines belongs
  // to a town. A city connection is a fact about the *road* between one and the
  // capital, road maintenance is charged on hexes, and a garrison's wages are
  // charged on the army rather than on whichever town it happens to be standing
  // in (Entry XLI — that is what keeps an army out of Entry XVII's staging).
  // Left out, this headline would be a rate the turn resolution disagrees with.
  total.gold += empireGold(state, playerId);
  // The empire-scale Statecraft lines — every `empireYields`/`countScaled` card
  // and every `rateConversion` (The Great Litany's culture off faith, The
  // Tithe's gold off culture, and the rest) — banked by `collectYields` in the
  // same pass as the two totals above. Read through the one helper the phase
  // itself calls, `explainEmpireCardYields`, so a headline that left them out
  // would be a headline the turn resolution disagrees with — the same claim
  // this function has made twice already, now true of the card lines too.
  const cards = foldCardYields(explainEmpireCardYields(state, playerId));
  total.food += cards.food;
  total.production += cards.production;
  total.gold += cards.gold;
  total.science += cards.science;
  total.culture += cards.culture;
  total.faith += cards.faith;
  return total;
}

/**
 * The per-item list behind a maintenance line, as one plain string.
 *
 * "Warrior 1💰 · Swordsman 2💰 · Library · Aldermarch 2💰". A `title` rather
 * than a nested ledger, because the card it hangs off is *already* a hover: a
 * forty-unit army spelled out inline would push the six-voice breakdown off the
 * bottom of the screen, and the question this answers ("which pieces am I
 * paying for") is the second one a player asks, never the first.
 *
 * Capped, and the cap says so. A line that ended mid-army would read as an army
 * that ends there.
 */
function upkeepDetail(lines: readonly UpkeepLine[]): string {
  const CAP = 12;
  const shown = lines
    .slice(0, CAP)
    .map((line) => `${line.source} ${figure(line.gold)}${YIELD_GLYPH.gold}`);
  if (lines.length > CAP) shown.push(`and ${figure(lines.length - CAP)} more`);
  return shown.join(' · ');
}

/**
 * The empire-scale gold lines in the shape the yield card already folds: a
 * source and a figure in each of the six voices.
 *
 * **Four lines** since the maintenance ruling (Entry XLI) — the city
 * connections, the road bill, the army's wages and the institutions' — because
 * that is what `explainEmpireGold` is. Each is a count and a total, and the
 * per-item lists behind them stay where they are: `connectedCities` for the
 * first, `explainUnitUpkeep` and `explainBuildingUpkeep` for the last two.
 * The two maintenance lines carry theirs as a `detail` the card hangs on a
 * `title`; the connections line deliberately does not, because a per-city
 * ledger of the same money is the thing the fold exists to prevent.
 *
 * **`detail` is attached without asking which voice is being shown**, and that
 * is not laziness: a maintenance line is zero in all five other voices, so the
 * card's own zero-skip has already decided. A `key === 'gold'` here would be
 * the hand-rolled comparison `tradePanels.test.ts` refuses.
 *
 * The adapter is here rather than in `trade.ts` because it is a *presentation*
 * fact: the simulation pays this in gold and knows nothing about six voices,
 * and the card wants every empire-scale source to answer the same question
 * ("what do you pay in the voice I am showing").
 */
function empireTradeLines(
  state: GameState,
  playerId: number,
): (CityYields & { source: string; detail?: string })[] {
  // Keyed on the head of the label — everything before the ` · count` tail —
  // because that is the only handle `TradeGoldLine` offers. It degrades to no
  // detail rather than to a wrong one if the simulation ever renames a line,
  // and `test/ui/tradePanels.test.ts` pins that the two names still meet.
  const details = new Map<string, string>([
    ['Unit maintenance', upkeepDetail(explainUnitUpkeep(state, playerId))],
    ['Building maintenance', upkeepDetail(explainBuildingUpkeep(state, playerId))],
  ]);
  return explainEmpireGold(state, playerId).map((line) => {
    const detail = details.get(line.source.split(' · ')[0] ?? '');
    return {
      ...emptyCityYields(),
      source: line.source,
      gold: line.gold,
      ...(detail !== undefined && detail.length > 0 ? { detail } : {}),
    };
  });
}

/**
 * The six yields, in the order the city panel's chip row lists them. The
 * glyphs and the names come from `figures.ts`, which is the one table — a
 * second copy in this file is exactly the drift that module exists to stop.
 *
 * Faith joined the strip in the pass that introduced it, before anything spent
 * it, on the grounds that a bank the player cannot see is a bank they cannot
 * plan around. Augurs spend it now (ledger Entry XXVIII), which changed the
 * argument's premise and not its conclusion — and took the card's explanatory
 * note away with it (`YIELD_NOTE`, now empty).
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
 * `collectYields` adds to and **augurs spend** (ledger Entry XXVIII). Both are
 * banks a player cannot see anywhere else, and a bank a player cannot see is a
 * discovery's Traders' hoard or a hundred turns of piety that appear to do
 * nothing.
 *
 * Faith's card used to end with `YIELD_NOTE.faith` saying that nothing spent it.
 * That entry is **gone**, not reworded, exactly as its docblock and the trap in
 * `CLAUDE.md` said it would be the day something did — and this row did not
 * change, which is what that note predicted too.
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

/**
 * Renown as **text**, the register `METER_GLYPH` and `YIELD_GLYPH` keep for
 * everything else the interface draws.
 *
 * A four-pointed star rather than a laurel character, and the choice is the
 * project's emoji rule read carefully: `🏆`/`🎖` are emoji and the text register
 * forbids them, `❦` is a printer's fleuron nothing in this game means, and there
 * is no laurel in any font this interface can count on. `✦` is what the specimen
 * already uses for a mark of standing, it survives in a `title` attribute and in
 * a screen reader, and the *drawing* — the wreath a player actually sees — is
 * `renownMarkNode` (`src/art/meterMarks.ts`).
 */
const RENOWN_GLYPH = '✦';

/**
 * How often a triumph may be earned, in the words the checklist prints.
 *
 * The interface's half of `TriumphScope`, and it is a table for `CARD_LINE_NAME`'s
 * reason: the same four words are read on the hover and nowhere else, and a
 * `switch` inlined into the row builder is where a fifth scope would silently
 * print nothing. Exhaustive over the union, so a fifth stops this file compiling.
 */
const TRIUMPH_SCOPE_WORD: Record<TriumphScope, string> = {
  once: 'once',
  perAge: 'each age',
  contested: 'first in the world',
  perEvent: 'every time',
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
  /**
   * Opens the Statecraft screen. The culture chip is the one yield chip that
   * is also a button — see the click wiring below — because culture is the
   * one yield with a screen behind it; the other four have nowhere further to
   * go than their own hover card.
   */
  onOpenStatecraft?: () => void;
  /**
   * Opens the Trade screen. The routes chip's own door, and the culture chip's
   * argument one system over: trade is the second thing in this strip with a
   * screen behind it, so it is the second chip that is also a button.
   */
  onOpenTrade?: () => void;
  /**
   * Opens the Beads screen. The bead chip's own door, and the **third** chip
   * that is also a button — culture's argument twice over: the Bead Race is the
   * one thing the whole game is played for, so its figure has somewhere further
   * to go than a hover card.
   */
  onOpenBeads?: () => void;
}

export function createCivYieldStrip(options: CivYieldStripOptions): CivYieldStrip {
  const {
    container,
    getGame,
    localPlayerId,
    happiness,
    authority,
    onOpenPopover,
    onOpenStatecraft,
    onOpenTrade,
    onOpenBeads,
  } = options;
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
    // Culture is the one yield with a screen behind it (Statecraft — see
    // `onOpenStatecraft`), so it is the one chip that is also a button: the
    // `civ-yield-clickable` class carries the same cursor and hover wash the
    // meter buttons use (`.civ-meter:hover`, `style.css`), `role="button"`
    // and a keydown handler give it the same affordance for a keyboard user
    // that its `tabIndex` already gave the hover card, and the title and
    // `aria-label` say what a click does rather than only what the number is.
    // `C` and the culture chip's own hint line ("press C") still work exactly
    // as before — this is a second way in, not a replacement.
    if (key === 'culture' && onOpenStatecraft) {
      item.classList.add('civ-yield-clickable');
      item.setAttribute('role', 'button');
      item.title = 'Open Statecraft';
      item.setAttribute('aria-label', `${label} — open Statecraft`);
      item.addEventListener('click', () => onOpenStatecraft());
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpenStatecraft();
      });
    }
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
        const onHand = element('div', 'meter-total ledger-total');
        onHand.append(element('span', 'meter-line-source', banked.line));
        onHand.append(element('span', 'meter-line-value', figure(banked.pool(player))));
        box.append(onHand);
      }
    }

    const lines = element('ul', 'meter-lines ledger');
    // The empire's half of the percentages once for the whole breakdown, exactly
    // as `civYields` takes it — the card is the summands of that headline, so
    // the two must be the same arithmetic as well as the same figure.
    const empirePercent = empirePercents(state, playerId);
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      lines.append(
        meterLine(
          cityDisplayName(state, city),
          cityYields(
            state,
            city,
            [],
            city.queue[0],
            cityQuote(state, city, [], empirePercent),
          )[key],
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
    // The four empire lines, after the signatures and for their reason: a city
    // connection, a road bill, an army's wages and an institution's belong to no
    // town. Read by voice like the signatures above rather than behind a
    // `key === 'gold'` — the zero-skip is already the gate, and a hand-rolled
    // comparison is exactly the shape the banked register was taken away from
    // (`figures.test.ts`).
    for (const line of empireTradeLines(state, playerId)) {
      const value = line[key];
      if (value === 0) continue;
      // Signed, all four: this is an income and three bills in one list. A cost
      // shown unsigned under a heading that says "per turn" would be the ledger
      // lying about itself.
      const row = meterLine(line.source, value, true);
      // The per-item list, one hover deeper. Plain text, because a `title` is a
      // plain-text sink (`keywords.ts`) and the platform draws it.
      if (line.detail !== undefined) row.title = line.detail;
      lines.append(row);
    }
    // The empire-scale Statecraft lines, after the trade ledger and for the
    // same reason: an Order's `empireYields`, a `countScaled` payout and a
    // `rateConversion` (The Great Litany's culture off faith, The Tithe's gold
    // off culture) belong to no city either. Read off the one list
    // `collectYields` itself banks — `explainEmpireCardYields` — so this row
    // and the figure it sums into can never disagree (rule 5).
    for (const line of explainEmpireCardYields(state, playerId)) {
      const value = line[key];
      if (value === 0) continue;
      lines.append(meterLine(line.source, value, true));
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
        const ladder = element('div', 'meter-total ledger-total');
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

  // --- renown ---------------------------------------------------------------

  /**
   * The renown chip: the fifth Entry XVIII bucket, beside the culture that fills
   * the fourth.
   *
   * It sits at the end of the yield strip rather than with the two meters, and
   * that is a reading rather than a layout: a meter is a *standing* (how the
   * empire feels, what its writ will bear) and renown is a **pool filling toward
   * a threshold**, which is exactly what the culture beside it is. So it wears
   * the yield chip's dress and the `poolFigure` grammar, with the rung on it —
   * `24/40 (+3)` is "twenty-four of the forty this great person costs, and three
   * a turn".
   *
   * The pool, the ladder and the rate all come from `renown.ts`: the chip is the
   * fold of `explainRenown`'s recurring half and the card is its lines, so this
   * strip can never promise a figure the phase disagrees with.
   */
  const renownItem = element('span', 'civ-yield is-renown');
  {
    const icon = element('span', 'civ-yield-icon');
    icon.append(renownMarkNode());
    renownItem.append(icon);
    renownItem.title = `${RENOWN_GLYPH} Renown toward the next great person, per turn in parens`;
    renownItem.setAttribute('aria-label', 'renown');
    renownItem.tabIndex = 0;
  }
  const renownValue = element('span', 'civ-yield-value', '0');
  renownItem.append(renownValue);
  container.append(renownItem);
  info.bind(renownItem, () => renownCard());

  // --- routes ---------------------------------------------------------------

  /**
   * The routes chip: how many caravans are on the road against how many the
   * empire's markets allow.
   *
   * A **ratio**, not a pool — `2 / 3` rather than `2 (+1)` — because that is
   * what a slot is: capacity spoken for, and the interesting number is how much
   * of it is spare. It sits at the end of the strip beside renown for renown's
   * own reason (a fact about the empire that is not one of the six voices), and
   * it is the **second chip that is also a button**, on the culture chip's
   * precedent exactly: trade is the other system with a screen behind it.
   *
   * Its card is `tradeLedger` — every running route's fold on one line, then
   * `explainEmpireGold`'s four, then the total under a double rule — so the
   * chip, the card and the Trade screen's own foot are one arithmetic.
   */
  const routesItem = element('span', 'civ-yield is-routes civ-yield-routes');
  {
    const icon = element('span', 'civ-yield-icon', '⇄');
    icon.setAttribute('aria-hidden', 'true');
    routesItem.append(icon);
    routesItem.tabIndex = 0;
  }
  const routesValue = element('span', 'civ-yield-value', '—');
  routesItem.append(routesValue);
  if (onOpenTrade) {
    routesItem.classList.add('civ-yield-clickable');
    routesItem.setAttribute('role', 'button');
    routesItem.title = 'Open Trade';
    routesItem.setAttribute('aria-label', 'trade routes — open Trade');
    routesItem.addEventListener('click', () => onOpenTrade());
    routesItem.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onOpenTrade();
    });
  } else {
    routesItem.title = '⇄ Trade routes running, against the routes your markets allow';
    routesItem.setAttribute('aria-label', 'trade routes');
  }
  container.append(routesItem);
  info.bind(routesItem, () => routesCard());

  // --- beads ----------------------------------------------------------------

  /**
   * The bead chip: how far this empire is along the one race there is.
   *
   * `4 / 20` in the routes chip's grammar rather than the renown chip's, and
   * that is the reading: a bead count is not a pool filling at a rate — nothing
   * accrues, every bead is an announced event — it is **a claim on the world
   * against the number that wins** (design ledger Entry VI). So it is a ratio,
   * and it is the third chip that is also a button, because the table those
   * beads are dealt on is a screen.
   *
   * The count comes off `Player.beads`, which is append-only and is the only
   * thing on this chip: the threshold is `data/beads.json`'s rules row. Neither
   * is computed here.
   */
  const beadsItem = element('span', 'civ-yield is-beads');
  {
    const icon = element('span', 'civ-yield-icon', '◉');
    icon.setAttribute('aria-hidden', 'true');
    beadsItem.append(icon);
    beadsItem.tabIndex = 0;
  }
  const beadsValue = element('span', 'civ-yield-value', '—');
  beadsItem.append(beadsValue);
  if (onOpenBeads) {
    beadsItem.classList.add('civ-yield-clickable');
    beadsItem.setAttribute('role', 'button');
    beadsItem.title = 'Open the Bead Race';
    beadsItem.setAttribute('aria-label', 'beads earned — open the Bead Race');
    beadsItem.addEventListener('click', () => onOpenBeads());
    beadsItem.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onOpenBeads();
    });
  } else {
    beadsItem.title = '◉ Beads earned, against the number that wins the game';
    beadsItem.setAttribute('aria-label', 'beads earned');
  }
  container.append(beadsItem);
  info.bind(beadsItem, () => beadsCard());

  /**
   * The last three beads, and every seat's standing under them.
   *
   * Three, because the chip's question is "what just happened and who is
   * ahead" — the whole table is a screen away, and a hover card that listed
   * twenty rows would be that screen badly. The standings are `realPlayers`',
   * for `renderSeats`' reason: the wild has no Abacus.
   */
  function beadsCard(): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = playerById(state, playerId);
    const box = element('div');

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', 'The Bead Race'));
    head.append(
      element(
        'span',
        'info-card-kind',
        `${figure(player?.beads.length ?? 0)} of ${figure(BEAD_RULES.threshold)}`,
      ),
    );
    box.append(head);

    const recent = (player?.beads ?? []).slice(-3).reverse();
    if (recent.length === 0) {
      box.append(element('p', 'hint', 'No bead yet. Every bead is a first in the world.'));
    } else {
      const list = element('ul', 'meter-lines ledger');
      for (const earned of recent) {
        const row = element('li', 'meter-line');
        row.append(
          element('span', 'meter-line-source', anyBeadDef(earned.id).def.name),
        );
        row.append(
          element(
            'span',
            'meter-line-value',
            BEAD_FAMILY_MARK[earned.family].word.toLowerCase(),
          ),
        );
        list.append(row);
      }
      box.append(list);
    }

    box.append(element('p', 'eyebrow renown-heading', 'the rods'));
    const rods = element('ul', 'meter-lines ledger');
    for (const seat of realPlayers(state)) {
      const row = element('li', 'meter-line');
      row.classList.toggle('is-earned', seat.id === playerId);
      row.append(element('span', 'meter-line-source', seat.name));
      row.append(element('span', 'meter-line-value', figure(seat.beads.length)));
      rods.append(row);
    }
    box.append(rods);
    if (onOpenBeads) box.append(element('p', 'hint', '☞ Press V for the whole table.'));
    return box;
  }

  /**
   * The summary ledger: what trade is paying, line by line, folding to gold.
   *
   * Gold is the one voice that totals because it is the one all three sources
   * share — a route's food and hammers land in one town's own basket and are
   * quoted on that route's line. See `tradeLedger`.
   */
  function routesCard(): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const ledger = tradeLedger(state, playerId);
    const box = element('div');
    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', 'Trade'));
    head.append(
      element(
        'span',
        'info-card-kind',
        `${figure(ledger.used)} of ${figure(ledger.slots)} route${ledger.slots === 1 ? '' : 's'}`,
      ),
    );
    box.append(head);

    if (ledger.lines.length === 0) {
      box.append(
        element('p', 'hint', 'No caravan is on the road. A market opens a route; a trader carries it.'),
      );
    } else {
      const list = element('ul', 'meter-lines ledger');
      for (const line of ledger.lines) {
        const item = element('li', 'meter-line');
        item.append(element('span', 'meter-line-source', line.source));
        const value = element('span', 'meter-line-value');
        setYieldText(value, line.figures);
        item.append(value);
        list.append(item);
      }
      box.append(list);
    }
    const total = element('div', 'meter-total ledger-total');
    total.append(element('span', 'meter-line-source', 'Treasury, per turn'));
    const value = element('span', 'meter-line-value');
    setYieldText(value, `${signedFigure(ledger.total)}${YIELD_GLYPH.gold}`);
    total.append(value);
    box.append(total);
    return box;
  }

  /**
   * Has this empire already earned this row?
   *
   * `alreadyEarned`'s reading (`triumphs.ts`) at the two scopes where it is a
   * fact a player can see on their own list: a `once` row is earned forever, and
   * a `perAge` or `contested` one is earned *for this era*. `perEvent` is never
   * barred and therefore never greys — a wonder is worth a triumph every time,
   * and a line struck through would be saying the opposite.
   *
   * Deliberately read off `Player.triumphs` rather than by calling into the
   * simulation's own gate, because that gate is a *mutation's* precondition and
   * takes the world's contested register with it; this is a checklist, and the
   * honest thing for a checklist to say is what this empire has done.
   */
  function triumphEarned(player: Player, id: (typeof TRIUMPH_IDS)[number]): boolean {
    const scope = triumphDef(id).scope;
    if (scope === 'perEvent') return false;
    if (scope === 'once') return player.triumphs.some((earned) => earned.id === id);
    const age = highestAge(player.techsResearched);
    return player.triumphs.some((earned) => earned.id === id && earned.age === age);
  }

  /**
   * Where this turn's renown came from, and the whole board of Triumphs beneath
   * it.
   *
   * Two blocks, and they answer two different questions a player has at once:
   *
   *   the ledger     rule 5 for a count — every line of `explainRenown`, the
   *                  trickle and this turn's lumps together, folding to the
   *                  total under the double rule. The lines are the simulation's
   *                  own sentences ("Library at Ur", "Triumph · The Third
   *                  Hearth"); nothing here composes a second one.
   *   the checklist  every row of `TRIUMPH`, in table order, with what it pays
   *                  and how often it may be had. Struck through where this
   *                  empire has already had it, and fainter still where the row
   *                  is *declared and not built* — which is the same two-tier
   *                  greying a card's deferred clause wears, for the same
   *                  reason: a promise the game has not made is said out loud
   *                  rather than quietly left off the list.
   */
  function renownCard(): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = playerById(state, playerId);
    const box = element('div');
    const head = element('div', 'info-card-head');
    const name = element('span', 'info-card-name');
    name.append(renownMarkNode());
    name.append(document.createTextNode('Renown'));
    head.append(name);
    head.append(
      element(
        'span',
        'info-card-kind',
        player
          ? `${figure(player.renownPool)} of ${figure(renownThreshold(player))}`
          : `${figure(0)}`,
      ),
    );
    box.append(head);

    // The pool banks before the door is open, and a full meter with no offer
    // reads as a bug (found in live play, 2026-09-03) — so the closed gate is
    // said out loud, named off the ability's own home so a tree move cannot
    // strand the sentence.
    if (player && !techsGrant(player.techsResearched, 'ancestorRites')) {
      const gate = ABILITY_TECH.get('ancestorRites');
      if (gate !== undefined) {
        box.append(
          element(
            'p',
            'hint',
            `Great people arrive once you have learned ${techDef(gate).name}. Renown banks until then.`,
          ),
        );
      }
    }

    const lines = explainRenown(state, playerId);
    if (lines.length === 0) {
      box.append(
        element('p', 'hint', 'Nothing yet. Libraries, wonders and Triumphs pay renown.'),
      );
    } else {
      const list = element('ul', 'meter-lines ledger');
      for (const line of lines) list.append(meterLine(line.source, line.amount, false));
      box.append(list);
      const total = element('div', 'meter-total ledger-total');
      total.append(element('span', 'meter-line-source', 'This turn'));
      total.append(element('span', 'meter-line-value', figure(foldRenown(lines))));
      box.append(total);
    }

    box.append(element('p', 'eyebrow renown-heading', 'triumphs'));
    const board = element('ul', 'meter-lines ledger renown-triumphs');
    for (const id of TRIUMPH_IDS) {
      const def = triumphDef(id);
      const row = element('li', 'meter-line');
      // A deferred row is fainter than an earned one and says why in its own
      // tooltip: struck through would claim the empire had it.
      if (def.deferred !== undefined) {
        row.classList.add('is-unbuilt');
        row.title = def.deferred;
      } else if (player && triumphEarned(player, id)) {
        row.classList.add('is-earned');
      }
      row.append(
        element('span', 'meter-line-source', `${def.name} · ${TRIUMPH_SCOPE_WORD[def.scope]}`),
      );
      row.append(element('span', 'meter-line-value', signedFigure(def.pays)));
      board.append(row);
    }
    box.append(board);

    const waiting = player ? greatPersonBlocker(player) : null;
    if (waiting !== null) box.append(element('p', 'hint hint-alert', `☞ ${waiting}.`));
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

  /**
   * The happiness ledger as this bar prints it: `explainHappiness`'s lines with
   * each town's own buildings netted into that town's demand line.
   *
   * **The one place the fold is applied**, so the chip, the hover card and the
   * click-through ledger cannot disagree about what a line is — every reader
   * below asks this instead of the evaluator, and `meterStanding` is folded over
   * the result rather than over the raw list. That is safe by construction and
   * not by agreement: `foldCityHappiness` only ever merges two lines it was
   * handed, so the total is untouched and only the supply/demand split moves,
   * which is the entire point (see its docblock, and the user's ruling behind
   * it). Authority has no such fold — it already prices a city as one net line.
   */
  function happinessEntries(state: GameState, playerId: number): MeterContribution[] {
    const towns = state.cities.filter((city) => city.ownerId === playerId);
    return foldCityHappiness(explainHappiness(state, playerId), towns);
  }

  /**
   * The effects one meter is currently applying, in `meterEffects` order.
   *
   * `all` is the sweep, and it is a parameter so a render that needs both
   * meters' effects pays for one (2026-08-29). `meterEffects` folds
   * `explainHappiness` and `explainAuthority` over every city and every unit the
   * empire holds, and the two chips are written in the same breath — the
   * difference between them is a `filter`, never a second sweep. A caller with
   * nothing in hand (each hover card, raised one at a time) still gets the same
   * default it always had.
   */
  function effectsOf(
    meter: 'happiness' | 'authority',
    all: readonly MeterEffect[] = meterEffects(getGame().state, localPlayerId()),
  ): MeterEffect[] {
    return all.filter((effect) => effect.meter === meter);
  }

  /**
   * One line of a ledger: what it is, and what it is worth. Signed for a meter's
   * contributions (where the sign is the whole point) and plain for a yield's.
   *
   * The `ledger` / `ledger-total` tokens the lists and totals below carry are
   * the *typographic* half of rule 5 (art pass A4): entries ruled off from one
   * another, and the accountant's double rule under a closing figure. They are
   * one recipe in `style.css` shared with the tile readout and the city panel's
   * modifier list, so a breakdown looks the same wherever the interface prints
   * one. Nothing about the arithmetic changed — a card that wore the class
   * without folding its own lines would still be the bug the class is dressing.
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
    const lines = element('ul', 'meter-lines ledger');
    for (const entry of entries) {
      lines.append(meterLine(starCapitalSource(state, playerId, entry.source), entry.value, true));
    }
    if (entries.length === 0) {
      body.append(element('p', 'hint', 'Nothing on either side of the ledger yet.'));
      return;
    }
    body.append(lines);
    const total = element('div', 'meter-total ledger-total');
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
      const lines = element('ul', 'meter-lines ledger');
      for (const entry of group.lines) {
        lines.append(meterLine(starCapitalSource(state, playerId, entry.source), entry.value, true));
      }
      box.append(lines);
    }

    if (effects.length === 0) {
      box.append(element('p', 'hint', 'No effect at this level.'));
      return box;
    }
    const lines = element('ul', 'meter-lines is-effects ledger');
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
      const entries = happinessEntries(state, localPlayerId());
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
    const entries = happinessEntries(state, localPlayerId());
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

      // Renown, in the same grammar with its rung: pool over the ladder, rate in
      // parens. A seat that does not exist reads as an empty ladder rather than
      // as an em dash, which is the honest answer on turn one.
      const renown = player
        ? poolFigure(player.renownPool, renownPerTurn(state, playerId), renownThreshold(player))
        : poolFigure(0, 0, 0);
      if (renownValue.textContent !== renown) renownValue.textContent = renown;
      // The one thing on this chip that has to survive with no gesture at all:
      // a name is waiting to be called. `is-good` is the strip's existing quiet
      // ink for "something good is true here" — never the alarm vermilion, which
      // is reserved for a meter in deficit.
      renownItem.classList.toggle(
        'is-good',
        player !== undefined && greatPersonBlocker(player) !== null,
      );

      // Routes: running against allowed. `is-good` when a slot is spare and
      // there is a caravan idle to fill it — the renown chip's own quiet ink,
      // and the same rule for using it: something *actionable* is true here,
      // never the alarm vermilion.
      const ledger = tradeLedger(state, playerId);
      if (routesValue.textContent !== ledger.chip) routesValue.textContent = ledger.chip;
      routesItem.classList.toggle('is-good', ledger.used < ledger.slots);

      // Beads against the threshold. No `is-good`: there is nothing *actionable*
      // about a bead count — a bead is earned by playing, never by pressing —
      // and the quiet ink on this strip means "something you can do is true".
      const beads = player
        ? `${figure(player.beads.length)} / ${figure(BEAD_RULES.threshold)}`
        : '—';
      if (beadsValue.textContent !== beads) beadsValue.textContent = beads;

      // The badge used to ride here — a small mark on the culture chip while
      // Statecraft owed the player a decision. It has moved to the HUD dock's
      // Statecraft button (`src/ui/hudDock.ts`), which is now the louder of
      // the two doors to the same screen: one badge, not two. The chip keeps
      // its click affordance (`civ-yield-clickable`, above) and its own hint
      // line in the card below ("press C") — only the pulsing dot moved.

      // The three empire sweeps behind the two meter chips, taken once for the
      // whole render (2026-08-29). Each of them folds the ledger over every city
      // and every unit the seat holds; the chip, its tier list and an open
      // click-through card are three readings of the *same* ledger, and taking
      // them apart was five sweeps where one pass does. Nothing is cached across
      // renders — this is one render's own arithmetic, handed down.
      const effects = meterEffects(state, playerId);
      const happinessLedger = happinessEntries(state, playerId);
      const authorityLedger = explainAuthority(state, playerId);

      const happinessStanding = meterStanding(happinessLedger);
      writeChip(
        happinessChip,
        signedFigure(happinessStanding.total),
        happinessStanding.total,
        effectsOf('happiness', effects),
        'Happiness',
      );

      // The **net** writ, not "used of capacity". Both meters now read the same
      // way — one signed figure, positive is room to move — and the pair of
      // numbers is a thing the player looks up rather than watches: it lives in
      // the hover card's headline and in its two group subtotals. A chip saying
      // "6/8" also has to be *subtracted* before it means anything, which is
      // work the strip should be saving.
      const authorityStanding = meterStanding(authorityLedger);
      writeChip(
        authorityChip,
        signedFigure(authorityStanding.total),
        authorityStanding.total,
        effectsOf('authority', effects),
        'Authority',
      );

      // An open card is showing a ledger from before whatever just happened —
      // and it is the ledger the chip above was written from, so the two cannot
      // come to disagree and neither pays for a second sweep.
      if (happinessCard.isOpen) {
        renderLedger(happiness.body, happinessLedger, happinessStanding);
      }
      if (authorityCard.isOpen) {
        renderLedger(authority.body, authorityLedger, authorityStanding);
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

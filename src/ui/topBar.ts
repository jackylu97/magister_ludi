/**
 * The top bar: everything on it except the ? and ☰ buttons, which are plain
 * markup in `index.html`.
 *
 * Left to right (batch UX1; the spec is `docs/plans/hud-empire-panel-spec.md`
 * §2, the drawing `docs/plans/mockups/hud-e2-final.html`):
 *
 *   - **The six yields**, summed over every city the local seat owns. Each chip
 *     opens the Ledger on its own yield, culture included: Statecraft has its
 *     own doors (the dock, the ☰ menu and `C`), so one gesture on this row
 *     means one thing.
 *   - **One meters chip**, happiness and authority side by side. Each half is
 *     its own button with its own hover card and its own breakdown card.
 *   - **The turn line**, in the middle: the turn, the world's age and the turns
 *     left before the age closes. Once this seat has ended its turn it names
 *     who the turn is waiting for instead of the age.
 *   - **Three labelled tabs** at the right end, the screens about the other
 *     empires: Diplomacy, Trade (carrying the routes figure) and Standings
 *     (carrying the renown and bead figures). On Standings each figure is its
 *     own button: renown opens the Reliquary, the beads open the bead ledger,
 *     and the tab's label opens the standings sheet.
 *
 * The yields and the meters chip go into `#civ-yields`, the turn line into
 * `#status` and the tabs into `#topbar-tabs`. All three containers outlive a
 * game; each new strip empties and refills them, so a listener bound here dies
 * with the elements it was bound to.
 *
 * A pure read, and deliberately a UI-layer one. `foldCity` is the same
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

// The empire's one reading, remembered on `state.revision` — the single source
// of truth this strip and every other yield surface subscribe to (batch E2).
import { readEmpire } from '../sim/readings';
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
import {
  type UpkeepLine,
  explainBuildingUpkeep,
  explainUnitUpkeep,
} from '../sim/upkeep';
import {
  type GameState,
  type Player,
  hasEndedTurn,
  playerById,
  realPlayers,
} from '../sim/state';
import { cityDisplayName, starCapitalSource } from './cityDisplay';
import {
  type YieldKey,
  METER_GLYPH,
  YIELD_NAME,
  YIELD_NOTE,
  figure,
  meterFigure,
  netFigure,
  percentFigure,
  poolFigure,
  signedFigure,
  signedMeterFigure,
} from './figures';
import { nextDraftCost, statecraftBlocker } from '../sim/statecraft';
import { greatPersonBlocker } from '../sim/greatPeople';
import { explainNextRung, nextRungWords } from '../sim/religion';
import { explainRenown, foldRenown, renownPerTurn, renownThreshold } from '../sim/renown';
import { TRIUMPH_IDS, type TriumphScope, triumphDef } from '../sim/triumphData';
import { BEAD_RULES, anyBeadDef } from '../sim/beadData';
import { BEAD_FAMILY_MARK } from './beadsScreen';
import { ABILITY_TECH, eraNumeral, highestAge, techDef } from '../sim/techData';
import { hasAbility } from '../sim/tech';
import { seatName } from '../sim/leaderData';
import { currentWorldAge, worldAgeCountdown } from '../sim/worldClock';
import {
  diplomacyMarkDataUri,
  standingsMarkDataUri,
  tradeMarkDataUri,
} from '../art/dockMarks';
import { createInfoCard } from './infoCard';
import { foldCityHappiness, meterGroups } from './meterBreakdown';
import { meterMarkNode, renownMarkNode } from './meterMark';
import { type Popover, createPopover } from './popover';
import { tradeLedger } from './tradeScreen';
import { YIELD_GLYPH, setYieldText, yieldMarkNode } from './yieldMark';
import { element } from './dom';

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
 * The per-item list behind each maintenance line, by the **head** of its label —
 * what the yield card hangs on a `title` one hover deeper.
 *
 * The two maintenance lines carry a detail; the connections line deliberately
 * does not, because a per-city ledger of the same money is the thing the fold
 * exists to prevent. `connectedCities` is still the per-city answer for a
 * surface that ever wants it.
 *
 * Keyed on the head of the label — everything before the ` · count` tail —
 * because that is the handle every reader of `explainEmpireGold` uses
 * (`classifyEmpireGold`, `empireLinesOf`). It degrades to no detail rather than
 * to a wrong one if the simulation ever renames a line, and
 * `test/ui/tradePanels.test.ts` pins that the two names still meet.
 *
 * A **lookup rather than an adapter** since batch H19: the empire's lines are
 * one list in the simulation now (`explainEmpireLines`, six voices a line), so
 * the card walks that list and asks this only for the hover text. What used to
 * be a second shape of the same four lines is a map of two strings.
 */
function empireGoldDetail(state: GameState, playerId: number): Map<string, string> {
  return new Map<string, string>([
    ['Unit maintenance', upkeepDetail(explainUnitUpkeep(state, playerId))],
    ['Building maintenance', upkeepDetail(explainBuildingUpkeep(state, playerId))],
  ]);
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
 * Which yields buy a **ladder**, and what its line says — `BANKED`'s twin, and
 * the same discipline: decided here once, never re-asked by key at the site.
 *
 * Culture's card gains the ladder it buys (Entry XV): the tier, the basket
 * against the next threshold. Here rather than as a second chip because it is
 * not a second number — it is what this number is *for*, and a player reading
 * their culture rate wants the answer in the same breath. Faith's (ruled
 * 2026-09-06: the faith hover shows what the next pantheon rung costs) is the
 * **sim's** sentence — `nextRungWords` off `explainNextRung`, which the Religion
 * sheet prints too — so the chip and the sheet cannot quote two thresholds; the
 * rate handed in is the same `readEmpire`’s own fold the head of the card prints.
 */
const LADDERS: Partial<
  Record<
    YieldKey,
    (state: GameState, playerId: number) => { source: string; value?: string } | null
  >
> = {
  culture: (state, playerId) => {
    const player = playerById(state, playerId);
    if (!player) return null;
    return {
      source: `Tier ${player.statecraft.drafts} · next draft`,
      value: `${Math.max(0, Math.floor(player.culturePool))}/${nextDraftCost(player)}`,
    };
  },
  faith: (state, playerId) => ({
    source: nextRungWords(explainNextRung(state, playerId, readEmpire(state, playerId).totals.faith)),
  }),
};

/**
 * The two meters as text now live in `figures.ts` beside `YIELD_GLYPH`, because
 * the card stamp composes them into figures (`+4☺`) exactly as it composes the
 * six — see that table's docblock. `smile` and `stamp` are still what a player
 * *sees* here (`src/art/meterMarks.ts`, drawn by `meterMarkNode`); the character
 * survives for the chip's own native tooltip, which a mask cannot fill.
 *
 * Entry XIV.C's want for theatre masks and a wax seal is answered by a face and
 * a stamp rather than by the literal masks and seal it named, on the squint-test
 * call `src/art/meterMarks.ts` documents.
 */

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
  /**
   * The renown figure on the Standings tab.
   *
   * The spend ceremony's card descends into it (`greatPersonCeremony.ts`), so
   * the ceremony needs the element. It is handed out here rather than looked up
   * by class in `main.ts`, because a class name in a second file can be renamed
   * without anything failing.
   */
  readonly renownChip: HTMLElement;
  /**
   * The Diplomacy tab. The Diplomacy sheet takes it as its trigger, which keeps
   * the tab's `aria-expanded` in step with the sheet and gives the keyboard back
   * to the tab when the sheet closes.
   */
  readonly diplomacyTab: HTMLButtonElement;
  /**
   * The Standings tab's own button: its mark and label, not the two figures
   * beside it. The standings sheet takes it as its trigger, for the Diplomacy
   * tab's reason.
   */
  readonly standingsTab: HTMLButtonElement;
}

/** The three elements one meter's click-through breakdown card is made of. */
export interface MeterCardElements {
  panel: HTMLElement;
  closeButton: HTMLElement;
  /** The element the signed ledger is written into. Rewritten on every open. */
  body: HTMLElement;
}

export interface CivYieldStripOptions {
  /**
   * `#civ-yields`: the six yields and the meters chip. Filled once, then only
   * rewritten.
   */
  container: HTMLElement;
  /**
   * `#status`: the turn line in the middle of the bar. Filled once with one
   * element, whose text is rewritten on each render.
   */
  turnLine: HTMLElement;
  /** `#topbar-tabs`: the Diplomacy, Trade and Standings tabs. Filled once. */
  tabs: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  happiness: MeterCardElements;
  authority: MeterCardElements;
  /** Told whenever one of these cards opens, so the HUD's others can shut. */
  onOpenPopover?: () => void;
  /** Opens the Diplomacy sheet. The Diplomacy tab's door, and `W`'s. */
  onOpenDiplomacy?: () => void;
  /** Opens the Trade sheet. The Trade tab's door, and `E`'s. */
  onOpenTrade?: () => void;
  /**
   * Opens the standings sheet: every empire's score. The Standings tab's own
   * door; the Abacus opens from that sheet and from `A`.
   */
  onOpenStandings?: () => void;
  /** Opens the bead ledger (the Bead Race). The bead figure's door, and `V`'s. */
  onOpenBeads?: () => void;
  /**
   * Opens the Reliquary, the legacies of the great people this empire has spent
   * (`reliquaryScreen.ts`). The renown figure's door: renown calls great
   * people, and great people leave the legacies the Reliquary lists.
   */
  onOpenReliquary?: () => void;
  /**
   * Opens the Ledger on the yield whose chip was pressed: where this turn's
   * figure came from, and which way it is heading (`ledgerScreen.ts`).
   *
   * Every one of the six yield chips takes it, culture included. Culture used
   * to open Statecraft instead, so the same click did different things on
   * neighbouring numbers (`docs/plans/hud-audit.md`, problem 1). Statecraft
   * keeps its own doors: the dock, the ☰ menu and `C`.
   */
  onOpenLedger?: (key: YieldKey) => void;
}

/**
 * What the turn line in the middle of the bar says.
 *
 * Worked out here, with no DOM, so the suite can check it against a real state.
 * The age and its countdown are read off `worldClock.ts` and only formatted
 * here. Once this seat has ended its turn and another has not, the line names
 * who it is waiting for in place of the age: hot-seat play reaches that state
 * today, and a networked game will sit in it every turn. The seats waited for
 * are `realPlayers`, so the barbarians are never on the list.
 */
export interface TurnLine {
  /** "Turn 91". */
  turn: string;
  /** "Æra II": the age the world is in, which every empire shares. */
  age: string;
  /** "9 left" while the age is closing, or `null` when no countdown runs. */
  left: string | null;
  /**
   * "Waiting: Azure, Crimson" once this seat has ended its turn, "resolving"
   * when nobody is left to wait for, and `null` while this seat is playing.
   */
  waiting: string | null;
  /** The whole line as one sentence, for the accessible name. */
  spoken: string;
}

export function turnLineOf(state: GameState, localPlayerId: number): TurnLine {
  const turn = `Turn ${state.turn}`;
  const age = `Æra ${eraNumeral(currentWorldAge(state))}`;
  const countdown = worldAgeCountdown(state);
  const left = countdown ? `${figure(countdown.turnsLeft)} left` : null;
  const local = playerById(state, localPlayerId);
  let waiting: string | null = null;
  if (local !== undefined && hasEndedTurn(state, local.id)) {
    const others = realPlayers(state).filter((seat) => !hasEndedTurn(state, seat.id));
    waiting =
      others.length > 0
        ? `Waiting: ${others.map((seat) => seatName(state, seat.id)).join(', ')}`
        : 'resolving';
  }
  const closes = countdown
    ? `, the age closes in ${figure(countdown.turnsLeft)} turn${countdown.turnsLeft === 1 ? '' : 's'}`
    : '';
  const spoken = waiting !== null ? `${turn}, ${waiting}` : `${turn}, ${age}${closes}`;
  return { turn, age, left, waiting, spoken };
}

/**
 * The figures the Trade and Standings tabs carry, with no DOM.
 *
 * Every number is the simulation's own. The routes count is `tradeLedger`'s,
 * the same ledger the Trade tab's hover card prints. Renown is the seat's
 * banked pool, with `renown.ts`'s rung and rate. The beads are the seat's own
 * record against `data/beads.json`'s threshold. The tabs print them short; the
 * title and the `…Spoken` names say the same numbers in full.
 */
export interface TabFigures {
  /** "1/3": routes running, against the routes the empire's markets allow. */
  routes: string;
  routesSpoken: string;
  /** True while a route slot is free. */
  routeSpare: boolean;
  /** "57": renown banked toward the next great person. */
  renown: string;
  /** "Renown 57/633 (+39)": the pool over its rung, the rate in parens. */
  renownTitle: string;
  renownSpoken: string;
  /** True while a great person is waiting to be called. */
  renownWaiting: boolean;
  /** "2/7": beads earned, against the number that opens the Magnum Opus. */
  beads: string;
  beadsSpoken: string;
}

export function tabFigures(state: GameState, playerId: number): TabFigures {
  const player = playerById(state, playerId);
  const ledger = tradeLedger(state, playerId);
  const pool = player?.renownPool ?? 0;
  const rung = player ? renownThreshold(player) : 0;
  const rate = player ? renownPerTurn(state, playerId) : 0;
  const beadCount = player?.beads.length ?? 0;
  return {
    routes: `${figure(ledger.used)}/${figure(ledger.slots)}`,
    routesSpoken: `Trade: ${figure(ledger.used)} of ${figure(ledger.slots)} routes running`,
    routeSpare: ledger.used < ledger.slots,
    renown: netFigure(pool),
    renownTitle: `${RENOWN_GLYPH} Renown ${poolFigure(pool, rate, rung)}, toward the next great person. Click for the Reliquary`,
    renownSpoken: `Renown: ${netFigure(pool)} of ${figure(rung)}, ${signedFigure(rate)} a turn. Opens the Reliquary`,
    renownWaiting: player !== undefined && greatPersonBlocker(player) !== null,
    beads: `${figure(beadCount)}/${figure(BEAD_RULES.threshold)}`,
    beadsSpoken: `Beads: ${figure(beadCount)} of ${figure(BEAD_RULES.threshold)}. Opens the Bead Race`,
  };
}

/**
 * The two steps down the strip takes when its row no longer fits the space the
 * bar leaves it, widest first. What each one costs in points, in the gap
 * between chips and in the meters' own padding is `style.css`'s to say ("the
 * strip steps down before it would overflow"); this file only names which step
 * is in force, so a retune is a stylesheet edit and no size is written twice.
 */
const STRIP_FIT_STEPS = ['is-tight', 'is-tighter'] as const;

/**
 * The width watcher on a strip container, so a new game replaces the old game's
 * rather than stacking a second one on the same element.
 *
 * `#civ-yields` outlives every game — it is markup in `index.html`, and each
 * `createCivYieldStrip` empties and refills it — so the observer has to be
 * disposed by whoever takes the element over next. That is this map. It is not
 * a window listener, so it is not `main.ts`'s `gameDisposers` business: the
 * thing it is attached to is the very thing being handed over, and handing it
 * over is the only moment it can go stale.
 */
const stripFitObservers = new WeakMap<HTMLElement, ResizeObserver>();

export function createCivYieldStrip(options: CivYieldStripOptions): CivYieldStrip {
  const {
    container,
    turnLine,
    tabs,
    getGame,
    localPlayerId,
    happiness,
    authority,
    onOpenPopover,
    onOpenDiplomacy,
    onOpenTrade,
    onOpenStandings,
    onOpenBeads,
    onOpenReliquary,
    onOpenLedger,
  } = options;
  const values = new Map<YieldKey, HTMLElement>();

  /**
   * One card for the whole strip, dropped under whatever is being hovered. The
   * anchors here are permanent — the strip rewrites text and never rebuilds —
   * so unlike the city panel's card this one never needs hiding on a render.
   */
  const info = createInfoCard({ className: 'info-card is-strip', placement: 'below' });

  container.replaceChildren();
  // The element outlives the game, and so would a step left on it from the last
  // one's late-empire figures. A fresh strip starts at full size and measures
  // its way down again.
  container.classList.remove(...STRIP_FIT_STEPS);

  // --- the six yields -------------------------------------------------------

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
    if (onOpenLedger) {
      // Every yield chip is the Ledger's door, culture's included (see
      // `onOpenLedger`). The class draws the chip as pressable, the role and
      // the Enter/Space handler give a keyboard the same press the pointer
      // has, and `tabIndex` above already lets the keyboard reach the chip.
      item.classList.add('civ-yield-clickable');
      item.setAttribute('role', 'button');
      // The chip's own sentence, kept, with the door added after it: what the
      // figure *is* is still the first thing a hover has to answer, and a
      // banked voice's "on hand, per turn in parens" is the half a player
      // cannot reconstruct.
      item.title = `${item.title} — open the Ledger`;
      item.setAttribute('aria-label', `${label} — open the Ledger`);
      item.addEventListener('click', () => onOpenLedger(key));
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpenLedger(key);
      });
    }
    values.set(key, value);
    info.bind(item, () => yieldCard(key, label));
    container.append(item);
  }

  /**
   * Which city paid for a total — one line each, folding to the headline figure.
   *
   * `foldCity` per city, which is exactly what `readEmpire`’s totals sum: the card is
   * the summands of the number beside it, never a second derivation of it.
   */
  function yieldCard(key: YieldKey, label: string): Node {
    const { state } = getGame();
    const playerId = localPlayerId();
    const box = element('div');
    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', label));
    head.append(
      element(
        'span',
        'info-card-kind',
        // `netFigure`, because a rate goes negative — a starving empire's food, a
        // treasury paying more maintenance than it takes — and a magnitude here
        // would print the loss as a gain.
        `${netFigure(readEmpire(state, playerId).totals[key])} per turn`,
      ),
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
        onHand.append(element('span', 'meter-line-value', netFigure(banked.pool(player))));
        box.append(onHand);
      }
    }

    const lines = element('ul', 'meter-lines ledger');
    // The empire's whole reading once for the breakdown, and it is the very
    // object `readEmpire`’s own folded for the chip above — the card is the summands of
    // that headline, so the two are now the same arithmetic by construction and
    // not merely by inspection (batch E2).
    const reading = readEmpire(state, playerId);
    for (const town of reading.towns) {
      lines.append(meterLine(cityDisplayName(state, town.city), town.total[key], false));
    }
    // Then the empire's own lines, after the cities because that is where they
    // are banked and because "Silk +2" belongs to no town — a luxury's empire
    // signature, a caravan abroad, a city connection, a road bill, an army's
    // wages, an institution's, a card's empire payout, and at the foot the
    // empire stage over the additive fold of them (batch H19). One list, the
    // one `collectYields` banks the fold of, so these rows and the figure they
    // sum into can never disagree (rule 5) — and the per-voice read rather than
    // a `key === 'gold'` for the reason the banked register was taken away from
    // hand-rolled comparisons (`figures.test.ts`): the zero-skip is the gate.
    const details = empireGoldDetail(state, playerId);
    for (const line of reading.lines) {
      const value = line[key];
      if (value === 0) continue;
      // Signed on the treasury's own lines: they are one income and several
      // bills in one list, and a cost shown unsigned under a heading that says
      // "per turn" would be the ledger lying about itself. A luxury's signature
      // reads as a gain, which is what it is.
      const label = line.origin === 'resource' ? `${line.source} · empire` : line.source;
      const row = meterLine(label, value, line.origin !== 'resource');
      // The per-item list, one hover deeper. Plain text, because a `title` is a
      // plain-text sink (`keywords.ts`) and the platform draws it.
      const detail = details.get(line.source.split(' · ')[0] ?? '');
      if (detail !== undefined) row.title = detail;
      lines.append(row);
    }
    // Culture's card gains the ladder it now buys (Entry XV): the tier, the
    // basket against the next threshold, and whatever offer is outstanding.
    // Here rather than as a second chip because it is not a second number — it
    // is what this number is *for*, and a player reading their culture rate
    // wants the answer in the same breath.
    // Faith's card gains its own, for the same reason (ruled 2026-09-06: the
    // faith hover shows what the next pantheon rung costs). Both come off the
    // one `LADDERS` register, `BANKED`'s twin: which yields buy a ladder is
    // decided in one place, never re-asked by key at the site.
    const ladder = LADDERS[key]?.(state, playerId);
    if (ladder) {
      const row = element('div', 'meter-total ledger-total');
      row.append(element('span', 'meter-line-source', ladder.source));
      if (ladder.value !== undefined) row.append(element('span', 'meter-line-value', ladder.value));
      box.append(row);
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

  // --- the three tabs at the right end --------------------------------------

  /**
   * A tab's drawn mark: the drawing the HUD dock wore for the same screen
   * (`src/art/dockMarks.ts`), masked in the bar's own colour like every other
   * mark on it. One drawing per screen wherever its door is.
   */
  function tabMark(uri: string): HTMLElement {
    const mark = element('span', 'topbar-tab-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.setProperty('--tab-mark', `url("${uri}")`);
    return mark;
  }

  /**
   * A tab's printed name. Below about 1200 px wide the stylesheet hides it from
   * sight (the tab keeps its mark and its figures) but not from a screen reader,
   * so every tab keeps its accessible name at every width.
   */
  function tabLabel(text: string): HTMLElement {
    return element('span', 'topbar-tab-label', text);
  }

  /** A button that opens one of the full-screen sheets. */
  function sheetButton(className: string, controls: string): HTMLButtonElement {
    const button = element('button', className);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', controls);
    return button;
  }

  // Diplomacy: a mark and a label. No figure, because how the world stands with
  // this empire is not one number; the sheet lists every empire it has met.
  // The sheet takes this tab as its trigger (handed out as `diplomacyTab`),
  // which keeps `aria-expanded` in step with it.
  const diplomacyTab = sheetButton('topbar-tab is-diplomacy', 'diplomacy-overlay');
  diplomacyTab.setAttribute('aria-expanded', 'false');
  diplomacyTab.setAttribute('aria-keyshortcuts', 'W');
  diplomacyTab.title = 'Diplomacy (W): every empire you have met, and where you stand with each';
  diplomacyTab.append(tabMark(diplomacyMarkDataUri()), tabLabel('Diplomacy'));
  if (onOpenDiplomacy) diplomacyTab.addEventListener('click', () => onOpenDiplomacy());

  // Trade: the label and the routes figure in one button. The figure is the
  // routes running against the routes the empire's markets allow. Its hover
  // card is the trade ledger (`routesCard`), the one the routes chip carried
  // before the chip became this tab.
  const tradeTab = sheetButton('topbar-tab is-trade', 'trade-overlay');
  tradeTab.setAttribute('aria-keyshortcuts', 'E');
  tradeTab.title = 'Trade (E): routes running, against the routes your markets allow';
  const routesValue = element('span', 'topbar-tab-figure', '—');
  tradeTab.append(tabMark(tradeMarkDataUri()), tabLabel('Trade'), routesValue);
  if (onOpenTrade) tradeTab.addEventListener('click', () => onOpenTrade());
  info.bind(tradeTab, () => routesCard());

  // Standings: three buttons inside one outline. A button cannot hold another
  // button, so the tab is a labelled group: the label opens the standings sheet,
  // the renown figure opens the Reliquary, and the bead figure opens the bead
  // ledger. Each part has its own hover state, focus ring and accessible name.
  const standingsGroup = element('div', 'topbar-tab is-standings');
  standingsGroup.setAttribute('role', 'group');
  standingsGroup.setAttribute('aria-label', 'Standings');
  const standingsTab = sheetButton('topbar-tab-part is-sheet', 'victory-overlay');
  standingsTab.setAttribute('aria-expanded', 'false');
  standingsTab.title = 'The standings: every empire\'s score, line by line. The Abacus opens from there, or with A';
  standingsTab.append(tabMark(standingsMarkDataUri()), tabLabel('Standings'));
  if (onOpenStandings) standingsTab.addEventListener('click', () => onOpenStandings());

  // Renown: the pool banked toward the next great person, printed short. The
  // rung and the rate are in the hover card (`renownCard`), the tooltip and the
  // accessible name. The spend ceremony's card lands on this button.
  const renownItem = sheetButton('topbar-tab-part topbar-tab-figure is-renown', 'reliquary-overlay');
  {
    const icon = element('span', 'topbar-figure-mark');
    icon.append(renownMarkNode());
    renownItem.append(icon);
  }
  const renownValue = element('span', 'topbar-figure-value', '0');
  renownItem.append(renownValue);
  if (onOpenReliquary) renownItem.addEventListener('click', () => onOpenReliquary());
  info.bind(renownItem, () => renownCard());

  // Beads: earned against the number that opens the Magnum Opus. A ratio, not a
  // rate: nothing accrues, every bead is an announced event.
  const beadsItem = sheetButton('topbar-tab-part topbar-tab-figure is-beads', 'beads-overlay');
  {
    const icon = element('span', 'topbar-figure-mark', '◉');
    icon.setAttribute('aria-hidden', 'true');
    beadsItem.append(icon);
  }
  const beadsValue = element('span', 'topbar-figure-value', '—');
  beadsItem.append(beadsValue);
  beadsItem.title = 'Beads earned, against the number that opens the Magnum Opus. Click for the bead ledger (V)';
  beadsItem.setAttribute('aria-keyshortcuts', 'V');
  if (onOpenBeads) beadsItem.addEventListener('click', () => onOpenBeads());
  info.bind(beadsItem, () => beadsCard());

  standingsGroup.append(standingsTab, renownItem, beadsItem);
  tabs.replaceChildren(diplomacyTab, tradeTab, standingsGroup);

  // --- the turn line, in the middle -----------------------------------------

  /**
   * The turn, the world's age and its countdown, as one focusable line.
   *
   * One element inside `#status`, made fresh by each strip so the hover card
   * bound to it goes away with it. Focusable because the age card is the only
   * place every empire's own age is printed, and a keyboard should reach it.
   * Not a button: there is no age screen to open.
   *
   * The age is the one thing on the bar that is not about this empire. It is
   * the calendar every empire's wager is judged against (`docs/wager.md` §1),
   * so the countdown has to be readable without a gesture.
   */
  const turnItem = element('span', 'status-line');
  turnItem.tabIndex = 0;
  turnItem.title = 'The turn, the age the world is in, and the turns left before the age closes';
  turnLine.replaceChildren(turnItem);
  info.bind(turnItem, () => ageCard());

  /** The line last written, so a render that changes nothing rebuilds nothing. */
  let writtenTurnLine = '';

  function writeTurnLine(line: TurnLine): void {
    if (line.spoken === writtenTurnLine) return;
    writtenTurnLine = line.spoken;
    const parts: Node[] = [element('span', 'status-turn', line.turn)];
    const part = (className: string, text: string): void => {
      const dot = element('span', 'status-sep', '·');
      dot.setAttribute('aria-hidden', 'true');
      parts.push(dot, element('span', className, text));
    };
    if (line.waiting !== null) {
      part('status-waiting', line.waiting);
    } else {
      part('status-age', line.age);
      if (line.left !== null) part('status-left', line.left);
    }
    turnItem.replaceChildren(...parts);
    turnItem.setAttribute('aria-label', line.spoken);
    turnLine.classList.toggle('is-waiting', line.waiting !== null);
  }

  /**
   * What the age is, what it is waiting on, and where every empire stands in
   * its own tree.
   *
   * The last block is the whole argument for the card: the world's age is a
   * **mean**, so "why has the age not turned over yet" is a question about the
   * other empires, and a card that printed the answer without its summands
   * would be asking to be taken on trust. The bead figure's card prints the
   * same list of empires, with their beads instead of their ages.
   */
  function ageCard(): Node {
    const { state } = getGame();
    const box = element('div');
    const age = currentWorldAge(state);
    const countdown = worldAgeCountdown(state);

    const head = element('div', 'info-card-head');
    head.append(element('span', 'info-card-name', 'The Age of the World'));
    head.append(element('span', 'info-card-kind', `Æra ${eraNumeral(age)}`));
    box.append(head);

    if (countdown) {
      const list = element('ul', 'meter-lines ledger');
      const row = element('li', 'meter-line');
      row.append(element('span', 'meter-line-source', 'This age closes in'));
      row.append(
        element(
          'span',
          'meter-line-value',
          `${figure(countdown.turnsLeft)} turn${countdown.turnsLeft === 1 ? '' : 's'}`,
        ),
      );
      list.append(row);
      box.append(list);
      box.append(
        element(
          'p',
          'hint',
          'The world has moved on. When the count runs out this age ends and the next begins.',
        ),
      );
    } else {
      box.append(
        element(
          'p',
          'hint',
          'The age turns over when most of the world has entered the next one — not when the first empire does.',
        ),
      );
    }

    box.append(element('p', 'eyebrow renown-heading', 'the empires'));
    const seats = element('ul', 'meter-lines ledger');
    for (const seat of realPlayers(state)) {
      const row = element('li', 'meter-line');
      row.classList.toggle('is-earned', seat.id === localPlayerId());
      row.append(element('span', 'meter-line-source', seatName(state, seat.id)));
      row.append(
        element('span', 'meter-line-value', `Æra ${eraNumeral(highestAge(seat.techsResearched))}`),
      );
      seats.append(row);
    }
    box.append(seats);
    return box;
  }

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
      box.append(element('p', 'hint', 'No bead yet. A wager kept is the ordinary way to one.'));
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
      row.append(element('span', 'meter-line-source', seatName(state, seat.id)));
      row.append(element('span', 'meter-line-value', figure(seat.beads.length)));
      rods.append(row);
    }
    box.append(rods);
    if (onOpenBeads) box.append(element('p', 'hint', '☞ Press V for the whole ledger.'));
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
    if (player && !hasAbility(state, playerId, 'ancestorRites')) {
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

    // The door, said once and only where it leads somewhere: an empire that has
    // spent nobody opens an empty sheet, and a hint pointing at one is a hint
    // that teaches the wrong thing on the turn a player first reads it.
    if (onOpenReliquary && player && player.legacies.length > 0) {
      box.append(element('p', 'hint', '☞ Click for the Reliquary — every legacy still in force.'));
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

  // --- the meters chip ------------------------------------------------------
  //
  // Happiness and authority as one chip, `☺ +8 · ♙ 0` (spec §2). Each half is
  // still its own button with its own hover card and its own breakdown card.
  // The stylesheet draws the outline round the pair and the dot between them,
  // so the wrapper's only children are the two buttons: the guide's meters step
  // rings this wrapper (`tutorial.ts`), and it must ring the pair and nothing
  // else.

  const meters = element('div', 'civ-meters');
  // A group, so the label is read out with the two buttons inside it.
  meters.setAttribute('role', 'group');
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
    // A meter's ledger, so `signedMeterFigure` and not the yields' printer —
    // see `figures.ts`. A line a percentage has been taken off is a tenth and
    // stays one.
    const amount = signed ? signedMeterFigure(value) : meterFigure(value);
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
    total.append(element('span', 'meter-line-value', signedMeterFigure(standing.total)));
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
          signedMeterFigure(group.total),
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
      signedMeterFigure(standing.total),
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
      `${meterFigure(standing.cost)}/${meterFigure(standing.gain)}`,
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

  /**
   * The strip fits itself to the bar: **the figures shrink before the row would
   * overflow** (`docs/flags.md`, "From the first full playthrough", note 24).
   *
   * On turn 92 of the first full playthrough the six yields were three digits
   * each, and the row — six yields, renown over its rung, routes, beads, then
   * the two meters — outgrew the space the bar leaves it. The strip's floor
   * took over and it scrolled, and what scrolls out of sight is its right-hand
   * end, which is where the authority meter lives. A meter you have to scroll
   * to is a meter that is gone.
   *
   * Measured, not asked of a container query, and the reason is the thing that
   * overflowed. A container query asks how wide the *container* is; this
   * container is never narrow — it is the window's own bar. What grew is the
   * **content**: the same bar at the same width carries this row easily on turn
   * 20 and cannot fit it on turn 92, because each figure gained a digit. No
   * width breakpoint can tell those two turns apart, and a guess at "how wide
   * six figures are" would be a digit count in a stylesheet, which is the
   * guess the ruling forbids. So the question is asked of the layout that knows
   * the answer: is the content wider than the box.
   *
   * Widest first, and each step is tried on its own rather than accumulated:
   * clear everything, measure, and take the first step that fits. That is a
   * pure function of the width the bar currently leaves and the digits
   * currently printed — no hysteresis to unwind, and a row that shrinks back
   * when a treasury drops a digit. Reading `scrollWidth` flushes layout, so
   * this costs one reflow per step tried and is called only when one of the two
   * inputs actually moved (below), never per frame. The one-pixel slack is the
   * rounding in those two integers, not a fudge: they are rounded to whole
   * pixels from a fractional layout, so an exact fit can read as one over.
   */
  function fitStrip(): void {
    container.classList.remove(...STRIP_FIT_STEPS);
    // Nothing to measure while the bar is stood down — the city screen hides it
    // whole (`style.css`'s "the chrome gives way"). The observer below brings us
    // back the moment it has a width again.
    if (container.clientWidth === 0) return;
    for (const step of STRIP_FIT_STEPS) {
      if (container.scrollWidth - container.clientWidth <= 1) return;
      container.classList.remove(...STRIP_FIT_STEPS);
      container.classList.add(step);
    }
  }

  /**
   * What the strip printed when it was last fitted. The fit depends on exactly
   * two things — the width the bar leaves the strip, and the digits in it — so
   * it is re-taken when either moves and at no other time. Width is the
   * observer's business; this is the digits'. `render` runs on every hover of
   * the board, and three forced reflows per mouse move is not something a
   * figure that has not changed should be paying for.
   */
  let fittedText = '';

  /**
   * What the strip last printed for: the state object, its revision and the
   * seat. Every figure below is a reading of the state for that seat, and
   * `updatePanel` calls this after selections and other refreshes that move
   * neither, so a repeat is skipped (about 2 ms a call on a turn-100 Standard
   * game). The two meter cards fill themselves when opened (`onOpen`), so a
   * skipped render never leaves one empty. `-1` is "nothing drawn yet".
   */
  let drawnState: GameState | null = null;
  let drawnRevision = -1;
  let drawnSeat = -1;

  /**
   * The width half. A `ResizeObserver` on the strip itself rather than a window
   * `resize` listener, because the strip's width moves for reasons the window's
   * does not: a seat joining the bar's seat strip, the tools growing a button,
   * the bar coming back after the city screen stood it down (0 → its width,
   * which the observer reports and a `resize` listener never would). The
   * observer's first delivery is the strip's opening fit, so nothing has to
   * call it here.
   */
  const fitObserver =
    typeof ResizeObserver === 'function' ? new ResizeObserver(() => fitStrip()) : undefined;
  stripFitObservers.get(container)?.disconnect();
  if (fitObserver) {
    stripFitObservers.set(container, fitObserver);
    fitObserver.observe(container);
  }

  return {
    render(): void {
      const { state } = getGame();
      const playerId = localPlayerId();
      if (state === drawnState && state.revision === drawnRevision && playerId === drawnSeat) return;
      drawnState = state;
      drawnRevision = state.revision;
      drawnSeat = playerId;
      const totals = readEmpire(state, playerId).totals;
      const player = playerById(state, playerId);
      for (const key of YIELDS) {
        const el = values.get(key)!;
        // A banked yield is pool-first: the figure a player acts on is what is
        // on hand, so it leads and the per-turn total — what every other yield
        // chip shows on its own — moves into parens beside it. `totals[key]` is
        // the rate, taken from the same `readEmpire`’s own fold the card breaks down,
        // so the chip and the card cannot come to disagree about it.
        const banked = BANKED[key];
        // **Whole, always** (the user, 2026-09-06, `docs/flags.md` item z: every
        // figure in the top bar rounds to the nearest integer for display). Batch
        // X made every fold behind these chips exact, and the strip was printing
        // the fraction raw — `2.6666666666666665` where a player wanted `3`. The
        // pools and the folds keep the fraction; this is a photograph of it.
        const text =
          banked && player ? poolFigure(banked.pool(player), totals[key]) : netFigure(totals[key]);
        if (el.textContent !== text) el.textContent = text;
      }

      // The tabs' figures. Each is written only when its text changed, like the
      // yields above, because this runs after every accepted command.
      const figures = tabFigures(state, playerId);
      if (routesValue.textContent !== figures.routes) routesValue.textContent = figures.routes;
      tradeTab.setAttribute('aria-label', figures.routesSpoken);
      // The quiet good ink while a route slot is free: something the player can
      // act on is true here. Never the alarm vermilion, which is kept for a meter
      // in deficit.
      tradeTab.classList.toggle('is-good', figures.routeSpare);
      if (renownValue.textContent !== figures.renown) renownValue.textContent = figures.renown;
      renownItem.title = figures.renownTitle;
      renownItem.setAttribute('aria-label', figures.renownSpoken);
      // A name waiting to be called is the one thing about renown that has to
      // show without a gesture.
      renownItem.classList.toggle('is-good', figures.renownWaiting);
      if (beadsValue.textContent !== figures.beads) beadsValue.textContent = figures.beads;
      beadsItem.setAttribute('aria-label', figures.beadsSpoken);

      // The turn line: the turn and the world's age, or who the turn is
      // waiting for.
      writeTurnLine(turnLineOf(state, playerId));

      // The three empire sweeps behind the two meter chips, taken once for the
      // whole render (2026-08-29). Each of them folds the ledger over every city
      // and every unit the seat holds; the chip, its tier list and an open
      // click-through card are three readings of the *same* ledger, and taking
      // them apart was five sweeps where one pass does. Nothing is cached across
      // renders — this is one render's own arithmetic, handed down.
      const effects = meterEffects(state, playerId);
      const happinessLedger = happinessEntries(state, playerId);
      const authorityLedger = explainAuthority(state, playerId);

      // The two meters round whole on the **chip** and keep their tenth in the
      // card (item z again, and `signedMeterFigure`'s docblock has the argument):
      // the strip is a glance, the ledger is where a player counts against a rung.
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

      // The digits half of the fit (see `fitStrip`). The yields and the meters
      // are the strip's own text, so the strip is asked rather than a signature
      // being assembled by hand. The tabs' figures and the turn line sit
      // outside it; when they change width the strip's own box changes width,
      // and the observer above re-fits it. Reading text forces no layout; the
      // fit below does, which is why it waits for the text to have changed.
      const printed = container.textContent ?? '';
      if (printed !== fittedText) {
        fittedText = printed;
        fitStrip();
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
    renownChip: renownItem,
    diplomacyTab,
    standingsTab,
  };
}

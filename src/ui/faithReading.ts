/**
 * The religion as the Faith sheet reads it, and the words and marks its tabs
 * share: a belief's axis mark and card type, the religion's houses, every town
 * that follows, the pressure ledger as a hover sentence.
 *
 * Moved out of `religionScreen.ts` in batch UX10 so the two tab modules
 * (`bonusesTab.ts`, `followersTab.ts`) can read them without importing the
 * sheet that imports them. `religionScreen.ts` hands every name on, so the
 * modules that have always imported them from there (`main.ts`,
 * `compendium.ts`, `faithHover.ts`, `cityPanel.ts`) are unchanged.
 *
 * **No retired piece is named here**, in a sentence or in a comment, for the
 * sheet's own reason (`test/ui/religionScreen.test.ts` reads this file too).
 */

import { explainPressure, foundReligionError, holySites, maxReligions, poolHeld, poolSlots, type PressureLine } from '../sim/religion';
import type { PurchasePrice } from '../sim/purchase';
import {
  type BeliefAxis,
  type BeliefId,
  type ReligionBeliefPool,
  RELIGION_BELIEF_POOLS,
} from '../sim/religionData';
import { type CardYieldLine, explainCardEmpireYields } from '../sim/statecraft';
import {
  type GameState,
  type Religion,
  cityReligion,
  followerCount,
  foundedReligion,
  playerById,
} from '../sim/state';
import { seatName } from '../sim/leaderData';
import { gatingTech } from '../sim/tech';
import { type TechId, techDef } from '../sim/techData';
import type { UnitTypeId } from '../sim/unitData';
import { roundYield, signedPlain as signed } from '../sim/yieldFormat';
import { cityDisplayName } from './cityDisplay';

/**
 * The mark each axis wears, and the accent it is drawn in.
 *
 * The glyphs are `docs/deprecated/religion.md`'s own — the table was authored with them,
 * and a screen that renamed the hearth would be a screen disagreeing with the
 * design doc it implements. The accent keys resolve through `style.css`'s
 * `--line-ink` block, exactly as a card's line does, so the frame rule, the
 * glyph and the emblem of one belief are three elements and one colour.
 *
 * **The axis has no player-facing name, and that is deliberate** (playtest,
 * 2026-08-26). It used to print one — "the stone", "the hearth" — in the
 * eyebrow of every belief card and in its tooltip, and it read as a *category
 * the player was choosing between* rather than as what it is: a designer's
 * thread through the pool, there so a second god on the same axis is findable.
 * It stays in the data (`BeliefDef.axis`), it still picks the accent, and the
 * founder amplifiers the Age 2–3 pass will draft from it (Syncretism reads the
 * axis directly) — it simply has no word. So this table is a glyph and nothing
 * else, and there is nowhere left for a name to be printed from.
 */
export const AXIS_MARK: Record<BeliefAxis, { glyph: string }> = {
  hearth: { glyph: '🌾' },
  sky: { glyph: '✶' },
  stone: { glyph: '⛰' },
  wild: { glyph: '🌲' },
  water: { glyph: '🌊' },
  war: { glyph: '⚒' },
  road: { glyph: '🧭' },
  sun: { glyph: '☀' },
  frost: { glyph: '❄' },
  none: { glyph: '◈' },
};

/** The empty slot's ghost — the outline of a god nobody has named. */
export const SLOT_GLYPH = '◇';

/** "Vaelport", "Vaelport and Kestrel", "Vaelport, Kestrel and Larkspur". */
export function listWords(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// --- the religion, as the pane reads it -------------------------------------

/**
 * The technology that opens each drawable pool — the gate a player is told
 * about when a house is standing empty.
 *
 * The **follower** gate is read off the roster (`gatingTech('unit', 'prophet')`)
 * rather than named here, because a house is filled by a prophet's charge and
 * "what teaches a prophet" is already a fact the unit table carries. The
 * **enhancer** gate is the one literal in this file, and it is `religion.ts`'s
 * own `ENHANCER_TECH`, which is private to that module. A copy is a second
 * table, so `test/ui/religionScreen.test.ts` reads it back out of
 * `gainBeliefError`'s own refusal sentence — the day the sim moves the gate, the
 * pane's word for it fails rather than quietly lying.
 */
const ENHANCER_TECH: TechId = 'theology';

/** The technology that opens each pool, or `null` when nothing in the tree gates it. */
export function poolTech(pool: ReligionBeliefPool): TechId | null {
  if (pool === 'enhancer') return ENHANCER_TECH;
  return gatingTech('unit', PROPHET);
}

/** What teaches each pool, as a technology name. */
export function poolTechName(pool: ReligionBeliefPool): string {
  const tech = poolTech(pool);
  return tech === null ? 'the tree' : techDef(tech).name;
}

/** The piece whose charges found and spread a faith. Named once, read twice. */
const PROPHET: UnitTypeId = 'prophet';

/** What each pool is called on the sheet, and what a house of it is for. */
export const POOL_WORD: Readonly<Record<ReligionBeliefPool, { name: string; says: string }>> = {
  follower: {
    name: 'follower belief',
    says: 'Applies in every city that follows your faith, and pays whoever owns that city.',
  },
  enhancer: {
    name: 'enhancer belief',
    says: 'Bends how far and how hard your faith spreads, for whoever holds its holy city.',
  },
};

/** One house of a religion: what it holds, how many it may, and what fills it. */
export interface ReligionHouse {
  pool: ReligionBeliefPool;
  slots: number;
  held: BeliefId[];
  /** How many places are standing empty. */
  empty: number;
  /** What fills one — the sentence an empty house prints. */
  fills: string;
}

/** One city that follows something, as the pane lists it. */
export interface FollowingCityLine {
  cityId: number;
  /** `cityDisplayName`'s answer — the capital keeps its star. */
  name: string;
  /** True when this seat owns the town. */
  ours: boolean;
  /** The owning empire's name, and the ink its banner is drawn in. */
  ownerName: string;
  ownerColor: string;
  /** Citizens of this town that follow **this** religion, of the whole population. */
  following: number;
  population: number;
  /** True when this religion is the one more than half the town follows. */
  majority: boolean;
  /** `explainPressure`'s lines for this religion, for the hover. */
  ledger: PressureLine[];
  /**
   * What this faith presses on this town per turn — the fold of `ledger`,
   * floored at zero exactly as `pressureTotals` floors it.
   *
   * On the row rather than only in the hover (user, 2026-08-28): "how many
   * follow me here" and "am I still gaining here" are two different questions,
   * and a list that answered only the first left a player with no way to tell a
   * town they are taking from one that has stopped moving without hovering forty
   * rows one at a time. The ledger stays on the hover as the argument.
   */
  pressure: number;
}

/** Everything the right pane prints. Pure, and the whole of what a test can pin. */
export interface ReligionReading {
  /**
   * The faith this seat founded, or `null` — `foundedReligion`'s answer.
   *
   * Deliberately **founding** and not `religionFounder`: this pane is "your
   * religion", which is a fact about history and stays yours after a conquest
   * takes the holy city. What that conquest moves is the trickle below, which
   * comes off `explainCardEmpireYields` and so goes to zero on its own.
   */
  religion: Religion | null;
  /** How many religions the world holds, against the cap it will ever hold. */
  count: string;
  /** How to found one, when this seat has not. `null` once it has. */
  found: { blocker: string | null; how: string } | null;
  houses: ReligionHouse[];
  /** The founder's share this seat is paid for its own religion, in the sim's own labelled lines. */
  trickle: CardYieldLine[];
  /** Every town in the world that follows this faith, ours first, then in city order. */
  following: FollowingCityLine[];
}

/**
 * What the pane says, derived and never stored.
 *
 * Every figure on it is somebody else's: the cap is `maxReligions`, the houses
 * are `poolSlots`/`poolHeld`, the trickle is `explainCardEmpireYields` filtered to
 * the lines carrying this religion's founder's share, and each town's ledger is
 * `explainPressure` — the same list the tide folds. Nothing here adds up a
 * number the simulation has not already added up, which is hard rule 5 read for
 * a screen.
 *
 * `holySites` is hoisted **once** for the whole sweep and handed to every town's
 * `explainPressure`, which is that function's own bargain (`zocField`'s): asking
 * per town would be one pass over the map per city on the list.
 */
export function religionReading(state: GameState, seat: number): ReligionReading {
  const mine = foundedReligion(state, seat) ?? null;
  const count = `${state.religions.length} of ${maxReligions(state)} religions founded`;
  const houses: ReligionHouse[] = [];
  const following: FollowingCityLine[] = [];
  let trickle: CardYieldLine[] = [];

  if (mine !== null) {
    for (const pool of RELIGION_BELIEF_POOLS) {
      const slots = poolSlots(pool);
      const held = [...(pool === 'follower' ? mine.follower : mine.enhancer)];
      houses.push({
        pool,
        slots,
        held,
        empty: Math.max(0, slots - poolHeld(mine, pool)),
        fills: `a prophet's charge, once you have ${poolTechName(pool)}`,
      });
    }
    // This religion's founder's share, found by its own field
    // (`CardYieldLine.founderShare`, batch UX8b) rather than by its label.
    trickle = explainCardEmpireYields(state, seat).filter((line) => line.founderShare === mine.id);

    const sites = holySites(state);
    for (const city of state.cities) {
      const held = followerCount(city, mine.id);
      if (held <= 0) continue;
      const owner = playerById(state, city.ownerId);
      const ledger = explainPressure(state, city, sites).filter(
        (line) => line.religion === mine.id,
      );
      following.push({
        cityId: city.id,
        name: cityDisplayName(state, city),
        ours: city.ownerId === seat,
        ownerName: seatName(state, city.ownerId),
        ownerColor: owner?.color ?? 'var(--ink)',
        following: held,
        population: city.population,
        majority: cityReligion(city) === mine.id,
        ledger,
        // The fold of the list beside it, never a second pass over the board:
        // the figure on the row is the figure the hover's ledger sums to.
        pressure: Math.max(
          0,
          ledger.reduce((total, line) => total + line.amount, 0),
        ),
      });
    }
    // Ours first, then `state.cities` order inside each half — founding order,
    // which is an order the state carries. A list sorted by how many follow
    // would reshuffle itself every turn.
    following.sort((a, b) => Number(b.ours) - Number(a.ours));
  }

  return {
    religion: mine,
    count,
    found:
      mine !== null
        ? null
        : {
            blocker: foundReligionError(state, seat),
            how: `A prophet plants the first holy site, and the faith is founded where the stones go up. Prophets are called with faith once you have ${poolTechName('follower')}.`,
          },
    houses,
    trickle,
    following,
  };
}

/**
 * One town's pressure ledger as a hover sentence — the source, its figure, and
 * the total under them.
 *
 * `explainPressure`'s list verbatim, which is the point: the temple's line is a
 * *difference* carried so the list still sums to the total, so a reader who adds
 * the column up gets the figure the bank actually receives.
 */
export function pressureLedgerText(lines: readonly PressureLine[]): string {
  if (lines.length === 0) return 'Nothing presses here.';
  let total = 0;
  const said: string[] = [];
  for (const line of lines) {
    total += line.amount;
    said.push(`${line.source} ${signed(line.amount)}`);
  }
  // Rounded by the rule every printed figure follows, so a total of lines that
  // were each rounded never prints a fraction they did not.
  return `${said.join(' · ')} — ${roundYield(Math.max(0, total))} a turn`;
}

/**
 * A price's ordered lines as one hover sentence — rule 5 for a thing you buy,
 * folded into the plain text a `title` can hold.
 *
 * `explainPurchaseCost`'s list verbatim and in its order, so the sum of the
 * clauses is the figure on the button. It is a hover rather than a block for
 * the clergy row's own reason: three stacked breakdowns of an escalation
 * everybody understands is three blocks of arithmetic where the sheet wants
 * three decisions.
 */
export function priceLedgerText(price: PurchasePrice): string {
  const said = price.lines.map((line) => `${line.source} ${line.amount}`);
  return `${said.join(' · ')} — ${price.total} ${price.currency}`;
}

/**
 * The eyebrow the offer card wears when a belief is dealt, which is the one
 * place a player is told **which bag** the three cards came out of.
 *
 * `BeliefOffer.pool` is absent for the pantheon and named for the two religion
 * pools, so the three drafts read as three different decisions on the same card
 * — which they are: a god is your identity, a follower belief is what every town
 * that keeps your faith gets, an enhancer is how far the faith spreads.
 */
/**
 * What one belief **is**, in the two or three words a card's eyebrow carries.
 *
 * The offer card's per-card line and the compact face's, from one table: a god,
 * a follower belief, an enhancer belief. `beliefOfferEyebrow` says the same
 * thing about the *hand* and says what it costs beside it; this is the card's
 * own half, which is the only thing that fits above a name.
 *
 * Three drafts wear one card (`BeliefOffer.pool`), so the word has to come off
 * the pool rather than be written at the call — a face that said "a god" over a
 * follower belief would be the interface naming the wrong shelf.
 */
export function beliefCardType(pool: ReligionBeliefPool | undefined): string {
  if (pool === undefined) return 'a god';
  return pool === 'follower' ? 'a follower belief' : 'an enhancer belief';
}

export function beliefOfferEyebrow(pool: ReligionBeliefPool | undefined): string {
  if (pool === undefined) return 'a god · permanent, and never converted away';
  if (pool === 'follower') return 'a follower belief · applies in every city that follows';
  return 'an enhancer belief · bends how your faith spreads';
}

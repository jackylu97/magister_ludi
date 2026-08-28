/**
 * The faith lens's map plates: which towns follow you, and what is pressing.
 *
 * The user's ruling of 2026-08-28: *"It's very unclear which cities are
 * following my religion. Cities following my religion need to be highlighted in
 * the faith view; they need indicators for how much pressure is given off by
 * each city / holy site, along with the number of followers the religion has."*
 *
 * The hover card (`faithHover.ts`) answers all of that for **one** town, and it
 * answers it beautifully — but only for the town the pointer happens to be on.
 * "Which of these forty are mine" is a question about the *board*, and a board
 * question wants a mark on every hex at once. So this module is the card's
 * standing half: one plate per town the seat knows, up for as long as the lens
 * is, saying the three things the ruling names and nothing else.
 *
 * One reading, two surfaces
 * -------------------------
 * Every figure here is `faithHoverReading`'s, and that is the load-bearing
 * decision rather than a convenience. That function is where the **leak** is
 * stopped — a town the seat has sighted and cannot currently see reports no
 * congregation, no banner and no faith but the seat's own — and a plate layer
 * that folded `explainPressure` itself would be a second reading of exactly the
 * rule that is silent when it is wrong. The card and the plate therefore cannot
 * come to disagree about a town, and the fog rule is written once.
 *
 * What a plate says, and why it is that short
 * -------------------------------------------
 * A plate is the smallest type in the interface and there are forty of them, so
 * it carries the *answer* and the card carries the argument:
 *
 *   · **the device** — the faith's initial, in its founder's ink. There is no
 *     drawn device for a religion (a religion has a name, a pantheon and a holy
 *     site; it has no charge), so the initial is the mark, and the ink is what
 *     the city panel's faith row and the hover card already colour a foreign
 *     faith with. Two faiths on one plate are two initials.
 *   · **the congregation** — "3 of 5", the count the ruling asked for, with the
 *     ✶ beside it exactly where every other surface puts it: beside the name of
 *     the thing it is about.
 *   · **the tide** — "+10 a turn", your faith's pressure on that town, folded
 *     from the card's own ledger. Omitted at zero rather than printed as "+0",
 *     because a faith that has followers here and no pressure is a real and
 *     common state (the tide carried it and has receded) and "+0 a turn" reads
 *     as a broken figure rather than as a quiet one.
 *
 * A town your faith does not reach is **not** left blank. It wears a neutral
 * plate naming whatever congregations the seat can see, because "this one is not
 * mine, and here is whose it is" is half the answer to the question the lens was
 * raised to ask.
 *
 * The holy site is the other tenant
 * ---------------------------------
 * "How much pressure is given off by each city / holy site" — a site is not a
 * town and has no followers, so it gets its own plate saying what it projects
 * and how far ("Holy site · +6 · range 6"). The figures are asked the way
 * `explainPressure` asks them, riders included, so the number on the anchor is
 * the number the towns in its ring are receiving.
 *
 * There is deliberately **no proclamation plate**. The 2026-08-28 ruling made a
 * proclamation an instant lump banked into every city in range with no pulse
 * left behind, and a plate for a thing that does not persist would be a marker
 * for a hex where something once happened.
 *
 * Pure, and dressed by somebody else
 * ----------------------------------
 * `faithPlates` returns `MapPlate[]` and holds no DOM: the lifecycle — build on
 * demand, rewrite on a changed signature, reposition on the renderer's frame
 * beat — is `createMapPlates`', which is the whole point of the split
 * (`tilePriceTags.ts`). Every plate is `inert`, so the board's own picking and
 * the hover card underneath are untouched: the plates are a caption on the
 * chart, and a caption that swallowed the pointer would have taken the detail
 * view away to print the summary.
 */

import { RULES } from '../sim/rulesData';
import {
  type GameState,
  type Religion,
  foundedReligion,
  playerById,
} from '../sim/state';
import { holySites } from '../sim/religion';
import { cardPressureRule, religionFounder } from '../sim/statecraft';
import { isExploredBy } from '../sim/visibility';
import { type FaithHoverFaith, faithHoverReading } from './faithHover';
import { figure } from './figures';
import type { MapPlate } from './tilePriceTags';

/** The class every plate this module makes wears. Its dress lives in `style.css`. */
export const FAITH_PLATE_CLASS = 'faith-plate';

/** The ink a plate about nobody in particular is drawn in. */
const NEUTRAL_INK = 'var(--ink-faint)';

/** The banner mark, the same one the card and the city panel put beside a name. */
const MAJORITY_MARK = '✶';

/**
 * A religion's device: the first letter of its name, article stripped.
 *
 * "the Grain Cult" is G and "the Way of the Hearth" is W — the initial of the
 * word that actually distinguishes one faith from another, because every name
 * the generator makes starts with "the" and a board of Ts would be no mark at
 * all. Falls back to the first character of whatever is left, so a renamed faith
 * ("Ω") still gets a plate rather than an empty one.
 */
export function religionDevice(name: string): string {
  const trimmed = name.trim().replace(/^the\s+/i, '');
  const letter = /[\p{L}\p{N}]/u.exec(trimmed)?.[0] ?? trimmed[0] ?? '?';
  return letter.toLocaleUpperCase();
}

/**
 * A town's name for a sentence the platform reads aloud, capital star dropped.
 *
 * `cityDisplayName`'s ✶ is a *drawn* fact — it says "capital" to an eye — and a
 * screen reader announces its Unicode name in the middle of the sentence. The
 * `figures.ts` register: a spoken form is words only.
 */
function spokenName(name: string): string {
  return name.replace(/\s*✶$/u, '');
}

/** The fold of one faith's ledger — `pressureTotals`' arithmetic, one religion wide. */
function pressureOf(faith: FaithHoverFaith): number {
  let total = 0;
  for (const line of faith.ledger) total += line.amount;
  return Math.max(0, total);
}

/** "3 of 5", with the banner mark when this faith is the one the town flies. */
function congregation(faith: FaithHoverFaith, population: number): string {
  const mark = faith.majority ? ` ${MAJORITY_MARK}` : '';
  return `${religionDevice(faith.name)}${mark} ${figure(faith.following ?? 0)} of ${figure(
    population,
  )}`;
}

/**
 * One town's plate, or `null` when this seat may read nothing about it at all.
 *
 * Three shapes, and they are the three the ruling names — the seat's own faith
 * has a claim here, it has none, or the town is a memory. Exported because the
 * *words* are the whole of what a test can pin, and a test that had to build a
 * renderer to read them would be pinning the lifecycle instead.
 */
export function faithCityPlate(state: GameState, cityId: number, seat: number): MapPlate | null {
  const city = state.cities.find((town) => town.id === cityId);
  if (city === undefined) return null;
  const reading = faithHoverReading(state, city, seat);
  if (reading === null) return null;
  const mine = foundedReligion(state, seat);
  const ours = mine === undefined ? undefined : reading.faiths.find((f) => f.religion === mine.id);
  const plate = {
    col: city.col,
    row: city.row,
    className: FAITH_PLATE_CLASS,
    disabled: false,
    inert: true,
  };

  // Remembered. No counts — a sighting holds none — so the plate is the one
  // half the seat genuinely owns: what its own faith presses there, and the fact
  // that this is a memory. See `faithHover.ts`'s leak rule, which is where that
  // filter actually lives.
  const town = spokenName(reading.cityName);
  if (reading.knowledge === 'remembered') {
    if (ours === undefined) {
      return {
        ...plate,
        text: 'last seen',
        spoken: `${town} · last seen · nothing of yours presses here`,
        ink: NEUTRAL_INK,
      };
    }
    const tide = pressureOf(ours);
    return {
      ...plate,
      text: `${religionDevice(ours.name)} +${figure(tide)} a turn · last seen`,
      spoken: `${town} · last seen · ${ours.name} presses +${figure(tide)} a turn`,
      ink: ours.founderColor,
    };
  }

  const population = reading.population ?? 0;
  // The **banner clause**: whichever faith more than half the town follows, when
  // that is not yours. It is on the plate for the contrast and only for the
  // contrast — the lens was raised to ask "which of these are mine", and a town
  // your faith is working on that somebody else already holds is the answer that
  // needs two figures rather than one. A town flying *your* banner has no
  // contrast to draw, so the clause is absent there and the plate stays short.
  const banner = reading.faiths.find((faith) => faith.majority && faith !== ours) ?? null;
  const bannerFace = banner === null ? '' : ` · ${congregation(banner, population)}`;
  const bannerSaid =
    banner === null
      ? ''
      : ` · ${figure(banner.following ?? 0)} of ${figure(population)} citizens follow ${
          banner.name
        }`;

  if (ours !== undefined) {
    const tide = pressureOf(ours);
    const face = congregation(ours, population);
    return {
      ...plate,
      text: (tide > 0 ? `${face} · +${figure(tide)} a turn` : face) + bannerFace,
      spoken: watchedSpoken(town, ours, population, tide) + bannerSaid,
      ink: ours.founderColor,
    };
  }

  // Your faith does not reach it at all. Whose congregations the seat *can* see,
  // in founding order — and the plate takes the ink of the one the town flies,
  // because one element carries one ink and the banner is the one that answers
  // "whose town is this, in the way this lens means it".
  const others = reading.faiths.filter((faith) => (faith.following ?? 0) > 0);
  if (others.length === 0) {
    return {
      ...plate,
      text: 'no religion',
      spoken: `${town} · follows no religion${unreachedTail(mine)}`,
      ink: NEUTRAL_INK,
    };
  }
  return {
    ...plate,
    text: others.map((faith) => congregation(faith, population)).join(' · '),
    spoken:
      `${town} · ` +
      others
        .map(
          (faith) =>
            `${figure(faith.following ?? 0)} of ${figure(population)} citizens follow ${faith.name}`,
        )
        .join(' · ') +
      unreachedTail(mine),
    ink: (others.find((faith) => faith.majority) ?? others[0]!).founderColor,
  };
}

/**
 * The sentence a watched town with a claim of yours on it is read aloud as.
 *
 * Three shapes for the head because "follows", "is followed by some" and "is
 * followed by nobody yet" are three different pieces of news, and the third is
 * the one a plate is most often about: a faith with pressure and no converts is
 * a town you are *working on*, which is precisely what "0 of 4 citizens follow"
 * says and "the Grain Cult is followed here" would have got exactly wrong.
 */
function watchedSpoken(
  town: string,
  ours: FaithHoverFaith,
  population: number,
  tide: number,
): string {
  const following = ours.following ?? 0;
  const head = ours.majority
    ? `${town} follows ${ours.name}`
    : `${town} · ${figure(following)} of ${figure(population)} citizens follow ${ours.name}`;
  const press =
    tide > 0 ? `${ours.name} presses +${figure(tide)} a turn` : `${ours.name} presses nothing here`;
  return ours.majority
    ? `${head} · ${figure(following)} of ${figure(population)} citizens · ${press}`
    : `${head} · ${press}`;
}

/** Why a neutral plate is neutral, said in the seat's own terms. */
function unreachedTail(mine: Religion | undefined): string {
  return mine === undefined
    ? ' · you have founded no religion'
    : ` · ${mine.name} does not reach it`;
}

/**
 * Every holy site the seat has explored, as a plate saying what it projects.
 *
 * Explored rather than currently seen, which is the **improvement** rule: a
 * site is an improvement standing on ground, and this codebase draws remembered
 * improvements on remembered hexes (`sites3d.ts`'s one fog rule). A camp's
 * reading — visible only — would be wrong here for the reason it is right
 * there: a site is not an occupation, it is a building.
 *
 * The strength and range are asked exactly the way `explainPressure` asks them,
 * `religionFounder` and all: an enhancer belief that widens a faith's reach must
 * widen the figure on its anchor in the same breath, or the lens promises a ring
 * the tide does not deliver.
 */
export function faithSitePlates(state: GameState, seat: number): MapPlate[] {
  const rules = RULES.religion;
  const plates: MapPlate[] = [];
  for (const site of holySites(state)) {
    if (!isExploredBy(state, seat, site.col, site.row)) continue;
    const religion = state.religions[site.religion];
    if (religion === undefined) continue;
    const holder = religionFounder(state, religion);
    const strength = Math.max(
      0,
      rules.siteStrength + cardPressureRule(state, holder, 'siteStrength'),
    );
    const range = Math.max(0, rules.siteRange + cardPressureRule(state, holder, 'siteRange'));
    plates.push({
      col: site.col,
      row: site.row,
      className: FAITH_PLATE_CLASS,
      disabled: false,
      inert: true,
      text: `Holy site · +${figure(strength)} · range ${figure(range)}`,
      spoken:
        `A holy site of ${religion.name} · presses +${figure(strength)} a turn ` +
        `on every city within ${figure(range)} hexes`,
      // The founder's ink, never the holder's: whose faith this is, is history
      // (`ReligionReading.religion`'s own distinction), and a captured site
      // still presses for the religion whose name is on it.
      ink: playerById(state, religion.founderId)?.color ?? NEUTRAL_INK,
    });
  }
  return plates;
}

/**
 * Every plate the faith lens puts on the board for this seat.
 *
 * Towns first, then sites, and a hex carrying both gets **one** plate with both
 * clauses on it. That merge is not tidiness: `createMapPlates` keys a plate by
 * its hex, so two plates on one hex would silently be one plate showing
 * whichever supplier happened to run last — a site raised on a city's own centre
 * would delete that town's followers from the chart and nothing would say so.
 */
export function faithPlates(state: GameState, seat: number): MapPlate[] {
  if (state.religions.length === 0) return [];
  const plates: MapPlate[] = [];
  for (const city of state.cities) {
    const plate = faithCityPlate(state, city.id, seat);
    if (plate !== null) plates.push(plate);
  }
  plates.push(...faithSitePlates(state, seat));

  const byHex = new Map<string, MapPlate>();
  const order: string[] = [];
  for (const plate of plates) {
    const key = `${plate.col},${plate.row}`;
    const standing = byHex.get(key);
    if (standing === undefined) {
      byHex.set(key, plate);
      order.push(key);
      continue;
    }
    byHex.set(key, {
      ...standing,
      text: `${standing.text} · ${plate.text}`,
      spoken: `${standing.spoken} · ${plate.spoken}`,
    });
  }
  return order.map((key) => byHex.get(key)!);
}

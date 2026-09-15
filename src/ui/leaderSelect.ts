/**
 * **The new game's leader half** — step two of the landing (batch L2b; re-aimed
 * at the second cut in L6b, `docs/flags.md` (xxxx), `docs/leaders.md` "The
 * second cut — fixed identity"; given a screen of its own in L7, (yyyy)).
 *
 * The map card asks what world to draw; this one asks who you are in it. It is
 * **a roster and a detail card** (batch L7, `mockups/new-game-flow.html`): every
 * figure as a face of a name and its two inks, and beside them the whole of the
 * chosen one — the plate, the identity line, **the four lines a figure is** (its
 * two abilities, its unique unit and its unique building, each unique named with
 * the technology or the age that opens it), the pair of colours and the towns it
 * founds. There is nothing else to say about a figure and nothing left to choose
 * after this screen — which is the second cut's own claim, drawn.
 *
 * The four lines moved off the faces and into the detail card for the room:
 * thirteen figures each printing four labelled clauses is a page nobody reads,
 * and a roster of names with one figure open beside it is how a player actually
 * compares two. The fold is the same one (`leaderFaceLines`) either way.
 *
 * **The table is walked, never listed** (CLAUDE.md's rule for the arena's panel,
 * read one screen over): every face below comes out of `LEADER_IDS` and
 * `describeCard`, so a fourteenth figure added to `data/leaders.json` appears
 * here with no edit to this file, to `index.html` or to the stylesheet. Nothing
 * in this module names a leader, a row or a figure.
 *
 * **No number is written in prose.** The clauses are `describeCard`'s — the same
 * describer the Compendium's leader shelf and the Ledger's own lines come out of
 * — so the figures arrive already worded, already marked, and already carrying
 * their `[[kind:id|Name]]` refs for `setDescriptorText` to draw. The two unique
 * lines carry a ref of their own for the same reason.
 *
 * The pure half is above the DOM, as every sheet in this directory keeps it
 * (`wagerSheet.ts`' discipline): what a face says, and which figure each rival
 * seat sits under, are folds a suite with no jsdom can pin. Drawing them is a
 * page of `append` calls that fail loudly or not at all.
 */

import {
  type LeaderAbilityId,
  type LeaderId,
  LEADER_IDS,
  isLeaderId,
  leaderDef,
} from '../sim/leaderData';
import { type CardClause, describeCard, ref } from '../sim/statecraft';
import type { PlayerSpec } from '../sim/state';
import { type BuildingId, buildingDef } from '../sim/buildingData';
import { type ImprovementId, improvementDef } from '../sim/improvementData';
import { type UnitTypeId, unitDef } from '../sim/unitData';
import { gatingTech } from '../sim/tech';
import { techAgeBands, techDef } from '../sim/techData';
import { type SeatInks, seatInks } from '../art/seatInks';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { hash3 } from '../render3d/hash';
import { element } from './dom';
import { eraWord } from './figures';
import { setDescriptorText } from './keywords';

/**
 * What the Seats picker means when nobody is chosen.
 *
 * The **empty string**, so the picker's own "no value" and this one are the same
 * value: a leaderless game writes no key onto any spec and its config is
 * byte-identical to one from before leaders existed (`PlayerSpec.leader`).
 */
export const NO_LEADER = '';

/**
 * Which of a figure's two rows a line is about.
 *
 * The two kinds `isUnlocked` asks, and a third the tree has no queue for: a
 * **work of the ground** (batch L8, `docs/flags.md` (bbbbb)). A figure's second
 * unique may be a hall or a field, and everything a screen does with it — the
 * eyebrow, the keyword ref, the opening words, the gate — is the same question
 * asked one table over.
 */
export type LeaderRowKind = 'unit' | 'building' | 'improvement';

/** The eyebrow over a unique's line, one word per kind. */
export const LEADER_ROW_WORD: Record<LeaderRowKind, string> = {
  unit: 'Unique unit',
  building: 'Unique building',
  improvement: 'Unique improvement',
};

/** The sentence under the whole card, for a table sitting under no figure. */
export const NO_LEADER_NOTE =
  'Every seat plays the plain rules, and the world is drawn without anybody pulling on it.';

/**
 * **What a figure is**, said once under the title (the design pass of
 * 2026-09-10, re-worded for the second cut).
 *
 * Said once, at the top, rather than as an eyebrow over every face: the same
 * sentence repeated thirteen times stops being read, and it made each face twice
 * as tall as the mockup's. The faces below it are then what they should be — a
 * name, a canton and the four lines the figure is.
 */
export const LEADER_LEDE =
  'A figure holds its two rules from its first turn and keeps them for the game, and it ' +
  'alone may raise the one soldier and the one building printed under them — each when its ' +
  'own learning arrives. The world is drawn around the seat it is given.';

/** **How many lines a face prints.** Two abilities, one soldier, one building. */
export const LEADER_FACE_LINES = 4;

/**
 * **What opens a row nobody else may raise**, in the words a face prints.
 *
 * Two clauses, and they are `isUnlocked`'s own two (`tech.ts`, the
 * `unlockedByLeader` arm) said out loud: a row the tree names is opened by *that
 * technology*, and a row the tree names nothing of is opened by the empire
 * reaching the row's **own column** — which is the same field that prices it
 * (`docs/production-costs.md`, "a column IS a price"). The column is printed as
 * the age that owns it, because an age is what a player has a name for and a
 * column is an axis on the star chart.
 *
 * The technology arrives as a keyword ref, so the face and the sheet both put a
 * reader one press from the node that opens their soldier.
 */
export function leaderOpeningWords(kind: LeaderRowKind, id: string): string {
  // **A work of the ground is dated by its own row and nothing else.** An
  // improvement is not a queue item — there is no `gatingTech` for it and no
  // column on it either — so the one field that opens it is the one field that
  // gates it: `ImprovementDef.requiresTech`, the same gate a worker's sheet
  // greys with. A row no technology named would open from the first turn, which
  // is the honest reading and the sentence says so.
  if (kind === 'improvement') {
    const gate = improvementDef(id as ImprovementId).requiresTech;
    return gate === undefined
      ? 'from your first turn'
      : `with ${ref('tech', gate, techDef(gate).name)}`;
  }
  const gate = gatingTech(kind, id);
  if (gate !== null) return `with ${ref('tech', gate, techDef(gate).name)}`;
  const column =
    kind === 'unit'
      ? (unitDef(id as UnitTypeId).column ?? 1)
      : (buildingDef(id as BuildingId).column ?? 1);
  return `with ${eraWord(ageOfColumn(column))}`;
}

/**
 * Which age owns a column of the chart — `techAgeBands` read the way
 * `leaderData.ts`'s own `ageOfColumn` reads it, and for its reason: the ages own
 * disjoint runs of columns by construction, and a column past the last run
 * belongs to the last age there is.
 */
function ageOfColumn(column: number): number {
  const bands = techAgeBands();
  for (const band of bands) if (column >= band.from && column <= band.to) return band.age;
  return bands[bands.length - 1]?.age ?? 1;
}

/** One of a figure's two rows, as a screen prints it. */
export interface LeaderUniqueFace {
  kind: LeaderRowKind;
  id: string;
  /** The row's own name, as the roster prints it. */
  name: string;
  /** "with Steel" · "with Æra IV" — `leaderOpeningWords`. */
  opens: string;
  /** The whole line, the row's keyword ref and its opening: drawn, never raw. */
  text: string;
}

/** One of a figure's two abilities, worded. */
export interface LeaderAbilityFace {
  id: LeaderAbilityId;
  name: string;
  /** `describeCard`'s clauses — the deferred halves struck through. */
  clauses: CardClause[];
}

/** One figure, as the picker prints it. */
export interface LeaderFace {
  id: LeaderId;
  name: string;
  /** The two inks this figure's seat will wear — field, then device. */
  colors: SeatInks;
  /** The pair said in words, for a roster that prints them (the book's shelf). */
  colorWords: [string, string];
  /** Both lines held from the first turn, in the sheet's order. */
  abilities: [LeaderAbilityFace, LeaderAbilityFace];
  /**
   * **The two rows nobody else may raise**, in the sheet's order: the soldier,
   * then the hall or the ground.
   *
   * A pair rather than a field per kind (batch L8), because every screen does
   * the same thing with both and *which kind the second one is* is the figure's
   * business: a face prints two lines here, the Your Civ sheet prints two rows,
   * and neither has to know that one figure keeps his in the fields.
   */
  uniques: [LeaderUniqueFace, LeaderUniqueFace];
}

/** One printed line of a face: an ability, or one of the two rows. */
export interface LeaderFaceLine {
  kind: 'ability' | LeaderRowKind;
  /** The eyebrow: the ability's name, or the kind of row. */
  label: string;
  /** What the line says. One clause for a row; an ability may say two. */
  clauses: CardClause[];
}

/** A figure's row, worded — the same shape for the soldier and the building. */
function uniqueFace(kind: LeaderRowKind, id: string, name: string): LeaderUniqueFace {
  const opens = leaderOpeningWords(kind, id);
  return { kind, id, name, opens, text: `${ref(kind, id, name)} · ${opens}` };
}

/**
 * **Every figure the sheet holds**, in sheet order — the picker's whole reading.
 *
 * An ability's words are `describeCard(ability.id)`: an ability is a card in
 * this vocabulary (`anyCardDef`'s thirteenth class), which is the whole argument
 * for writing one in the card vocabulary at all. A unique's words are its row's
 * name and the gate `isUnlocked` will ask about it — no describer, because a
 * unique is not an effect and saying it were one would claim the technology had
 * already come.
 */
export function leaderFaces(): LeaderFace[] {
  return LEADER_IDS.map((id) => {
    const def = leaderDef(id);
    return {
      id,
      name: def.name,
      // Through `seatInks` rather than off the row, so the picker and the board
      // read a figure's pair through the same one door (batch H7).
      colors: seatInks({ color: def.colors.primary, secondary: def.colors.secondary }),
      colorWords: [...def.colors.names] as [string, string],
      abilities: def.abilities.map((ability) => ({
        id: ability.id,
        name: ability.name,
        clauses: describeCard(ability.id),
      })) as [LeaderAbilityFace, LeaderAbilityFace],
      uniques: [
        uniqueFace('unit', def.unit, unitDef(def.unit).name),
        // **Whichever kind the figure's second row is**, read off the sheet: a
        // hall for most of the roster, a work of the ground for the figure who
        // keeps his second unique in the fields. Nothing here names either.
        // The load validator has already refused a figure carrying neither, so
        // the fallback here is unreachable and says so by being the hall's.
        def.improvement !== undefined
          ? uniqueFace(
              'improvement',
              def.improvement,
              improvementDef(def.improvement).name,
            )
          : uniqueFace('building', def.building!, buildingDef(def.building!).name),
      ],
    };
  });
}

/**
 * **The four lines**, in the order a face prints them.
 *
 * The fold the roster is drawn from, so "a figure fits on the landing screen in
 * four lines" is a claim a suite with no document can hold to. The two abilities
 * first, because they are true from the first turn; the two rows after, because
 * they are promises with a date on them.
 */
export function leaderFaceLines(face: LeaderFace): LeaderFaceLine[] {
  return [
    ...face.abilities.map((ability) => ({
      kind: 'ability' as const,
      label: ability.name,
      clauses: ability.clauses,
    })),
    // Each row's eyebrow is its own kind's word, so the fourth line reads
    // "Unique improvement" for the figure whose second row is a field and
    // nothing on this screen decides which.
    ...face.uniques.map((row) => ({
      kind: row.kind,
      label: LEADER_ROW_WORD[row.kind],
      clauses: [{ text: row.text }],
    })),
  ];
}

/**
 * **The identity line under a name** — the two inks, and nothing else.
 *
 * The mockup prints a family and a spectrum here ("Egypt · tall · faith and
 * wonders"). `data/leaders.json` has no such field and inventing one on a screen
 * would be the interface making a design decision the user has not made
 * (`docs/flags.md` (dddd), the open item), so the line says the one identifying
 * thing a figure genuinely carries beside its name: the pair of colours its seat
 * flies, in the row's own words.
 */
export function leaderIdentity(face: LeaderFace): string {
  return face.colorWords.join(' · ');
}

/** The towns a figure founds first, as the detail card lists them. */
export const LEADER_CITIES_SHOWN = 4;

/** The first towns off the figure's own list, in its own order. */
export function leaderFirstCities(id: LeaderId): string[] {
  return leaderDef(id).cities.slice(0, LEADER_CITIES_SHOWN);
}

/**
 * The stream index the cast is hashed on. Its own number, so that a second
 * seeded question asked on this screen one day cannot deal the same permutation.
 */
const CAST_STREAM = 0x1ea4;

/** The stream *Random* is dealt on — its own, for `CAST_STREAM`'s reason. */
const DEAL_STREAM = 0x0dea;

/**
 * **What Random deals** — a figure, by the seed, and the same seed deals the
 * same one (batch L7, `docs/flags.md` (yyyy)).
 *
 * The screen has no `Rng` and must not borrow the sim's (`rivalLeaders`' note
 * says why at length): this is the interface's own arithmetic over the number in
 * the seed field, so *Random* is a world's figure rather than a coin flip, a
 * player who rerolls the seed is dealt somebody else, and a player who types the
 * seed back gets the same figure a second time.
 *
 * It resolves **at the press**: the chosen value is the dealt figure's id from
 * that moment on, so the config carries a figure and never a marker, and the
 * detail card opens on whoever was dealt.
 */
export function dealtLeader(seed: number): LeaderId {
  const at = Math.abs(hash3(seed, 0, DEAL_STREAM)) % LEADER_IDS.length;
  return LEADER_IDS[at]!;
}

/**
 * **Which figure each rival sits under** — the deterministic rule, said once
 * (batch L4, `docs/flags.md` (nnnn)).
 *
 * **Every rival plays a figure**, and they are **distinct**: the rivals take the
 * sheet minus your own pick, ordered by a hash of the seed. A seed is therefore
 * a *cast* as well as a world — the same seed and the same seats deal the same
 * neighbours, which is the sentence the landing card already prints — and a
 * different seed may deal a different one. Nothing here is a draw: the landing
 * has no `Rng`, and a table dealt from the platform's own unseeded randomness
 * would be a table a save could not replay (hard rule 2; a leader rides into
 * `GameConfig`).
 *
 * The hash is `hash3`, the renderer's own integer scatter — a pure function of
 * `(seed, the figure's place on the sheet, a stream)`. **Never the sim's `Rng`,
 * and never its gameplay hash separator** (the one `src/sim/state.ts` says must
 * never be renamed): this is a question about the interface's own arithmetic,
 * and borrowing the gameplay stream would make a seeded outcome depend on a
 * screen. Ties fall back to sheet order, so the ordering is total and not merely
 * usually total.
 *
 * **Rivals take figures whether or not you do.** *No leader* is an answer about
 * your own seat — you play the plain rules — and it used to empty the whole
 * table, which made the world the one-click game drew a world with nobody in it.
 * Your own seat is still written byte-identically: no `leader` key at all.
 *
 * A table with more seats than the sheet has figures simply runs out, and the
 * seats past the end sit under none — the honest answer rather than a repeat.
 */
export function rivalLeaders(chosen: string, rivals: number, seed = 0): (LeaderId | undefined)[] {
  const rest = LEADER_IDS.map((id, at) => ({ id, at }))
    .filter((entry) => entry.id !== chosen)
    .sort((a, b) => {
      const byHash = hash3(seed, a.at, CAST_STREAM) - hash3(seed, b.at, CAST_STREAM);
      return byHash !== 0 ? byHash : a.at - b.at;
    });
  const seats: (LeaderId | undefined)[] = [];
  for (let at = 0; at < rivals; at += 1) seats.push(rest[at]?.id);
  return seats;
}

/**
 * The roster with its figures written on, **and the colours they bring**.
 *
 * A key is written only where there is one, exactly as `normalizeConfig` writes
 * a charge: a seat under no figure carries no `leader`, keeps the palette's ink
 * and names no `secondary`, and normalises byte for byte as a spec from before
 * leaders existed.
 *
 * A seat *under* a figure takes the figure's pair (batch H7, `docs/flags.md`
 * (oooo)): `colors.primary` onto `color` and `colors.secondary` onto
 * `secondary`, which is the whole of how a figure's colours reach a game. They
 * ride into `GameConfig` here and are read from there by every surface
 * (`seatInks`) — there is no second table anywhere mapping a seat to a pair, and
 * that is what makes a save fly the banners it was started with.
 *
 * The `seed` is the landing's own — the number in the Seed field — so the cast
 * travels with the world rather than beside it.
 */
export function seatLeaders(
  players: readonly PlayerSpec[],
  chosen: string,
  seed = 0,
): PlayerSpec[] {
  const rivals = rivalLeaders(chosen, Math.max(0, players.length - 1), seed);
  const mine: LeaderId | undefined = chosen === NO_LEADER ? undefined : (chosen as LeaderId);
  return players.map((spec, seat) => {
    const leader = seat === 0 ? mine : rivals[seat - 1];
    if (leader === undefined) return { ...spec };
    const colors = leaderDef(leader).colors;
    return { ...spec, leader, color: colors.primary, secondary: colors.secondary };
  });
}

// --- the card ---------------------------------------------------------------

export interface LeaderSelect {
  /** The chosen figure's id, or `NO_LEADER`. What `currentConfig` reads. */
  readonly chosen: string;
  /** Repaints. Called once at boot; the picker keeps its own state after. */
  render(): void;
}

export interface LeaderSelectOptions {
  /** The roster's own card, built once and repainted on every pick. */
  container: HTMLElement;
  /**
   * The card beside it, holding the whole of the chosen figure. Repainted on
   * every pick like the roster — which is why the Begin button is a sibling of
   * this element and never inside it (`index.html`'s note).
   */
  detail: HTMLElement;
  /** The mono line where the masthead would be: `STEP_CRUMB.civ`. */
  crumb: string;
  /**
   * The seat's own charge, for the canton. `undefined` is by seat order
   * (`heraldryFor`) — which is what the landing's roster always leaves it at.
   */
  charge?: string;
  /** The seat's ink, for the canton's field. */
  color: string;
  /**
   * The seat's second ink, for the canton's device. Absent falls back through
   * `seatInks` — which is what a plain seat on the landing always leaves it at.
   */
  secondary?: string;
  /**
   * The seed in the field, read at the press: *Random* deals from the world's
   * own number rather than from a number this module remembers (`dealtLeader`).
   */
  seed?: () => number;
  /** Raised on every pick, so the Start button can say who it begins as. */
  onPick?: (chosen: string) => void;
}

/**
 * The picker, built once at module scope and never rebuilt.
 *
 * It holds the one thing on this screen that is neither a form field nor a save:
 * which figure the seat has taken. `NO_LEADER` is the default and stays the
 * default, so Start is one press away from the game it has always been.
 */
export function createLeaderSelect(options: LeaderSelectOptions): LeaderSelect {
  const { container } = options;
  let chosen: string = NO_LEADER;
  /**
   * The figure the last press of *Random* dealt, or none. Kept only so the
   * Random face can say what it dealt: the *answer* lives in `chosen` with every
   * other pick, because a deal that resolved is a figure and not a mode.
   */
  let dealt: LeaderId | null = null;

  /**
   * The seat's banner, as a canton: **the field in the primary and the device in
   * the secondary** (batch H7, `docs/flags.md` (oooo)).
   *
   * The heraldry rule kept, one ink over: a charge is never printed *in the
   * field's own colour*, which is what a parchment canton was buying and what a
   * second ink buys better — a figure's canton now says which figure it is twice
   * over, by the drawing and by the pair. A face wears the figure's own colours;
   * the *No leader* face wears the seat's, which is the palette's ink with the
   * board's own ink for a device (`seatInks`, the one door into that fallback).
   */
  function canton(inks: SeatInks): HTMLElement {
    const mark = element('span', 'leader-canton');
    mark.setAttribute('aria-hidden', 'true');
    const uri = heraldryMarkDataUri(heraldryFor(0, options.charge), inks.secondary);
    mark.style.setProperty('--canton-mark', `url("${uri}")`);
    mark.style.setProperty('--canton-field', inks.primary);
    mark.style.setProperty('--canton-device', inks.secondary);
    return mark;
  }

  /** The seat's own pair, for the face that takes no figure at all. */
  function seatCanton(): HTMLElement {
    return canton(seatInks({ color: options.color, ...(options.secondary === undefined ? {} : { secondary: options.secondary }) }));
  }

  /**
   * A list of clauses, drawn through the descriptor writer (a raw `[[` never).
   *
   * Only the detail card prints clauses, and it is not a button — so the
   * keywords in them are links, which is `keywordsAllowedIn`'s ruling read the
   * way it is meant to be read: a click here means "tell me more".
   */
  function clauseList(clauses: readonly CardClause[], className: string): HTMLElement {
    const list = element('ul', className);
    for (const clause of clauses) {
      const item = element('li', clause.deferred ? 'leader-clause is-deferred' : 'leader-clause');
      setDescriptorText(item, clause.text);
      list.append(item);
    }
    return list;
  }

  /**
   * A face: the canton, the name, and the identity line under it.
   *
   * One line rather than four (batch L7). The four lines are the detail card's
   * now — thirteen figures each printing four labelled clauses is a page nobody
   * reads — and what a face has to do is let a reader find the figure they are
   * looking for and see, at a glance, which of thirteen is open beside them.
   */
  function drawFaceShell(
    className: string,
    mark: HTMLElement,
    name: string,
    line: string,
    pressed: boolean,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = element('button', className);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(pressed));
    if (pressed) button.classList.add('is-chosen');
    button.append(mark);
    const text = element('span', 'leader-face-text');
    text.append(element('span', 'leader-name', name));
    text.append(element('span', 'leader-face-id', line));
    button.append(text);
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Takes a figure, or puts the one already taken back down.
   *
   * A pick off the roster forgets the last deal: *Random* says what it dealt
   * only while the deal is what is chosen, and a figure taken by name is the
   * player's answer rather than the seed's.
   */
  function take(id: string): void {
    chosen = chosen === id ? NO_LEADER : id;
    dealt = null;
    options.onPick?.(chosen);
    render();
  }

  /**
   * The whole of the chosen figure, beside the roster.
   *
   * The plate is a slot rather than a painting: the two inks as a diagonal, the
   * 3:4 crop the portraits will arrive in, and a label saying what it is (the
   * mockup's own placeholder — the paintings come later, and a blank card in
   * their place would read as a figure with something missing rather than as a
   * frame with nothing in it yet).
   *
   * The clauses are drawn into ordinary elements here rather than into a button,
   * so a keyword in an ability is a **link** into the Compendium: on this card a
   * click means "tell me more", which is exactly the ruling `keywordsAllowedIn`
   * states.
   */
  function drawDetail(faces: readonly LeaderFace[]): void {
    const card = options.detail;
    card.replaceChildren();
    if (!isLeaderId(chosen)) {
      card.append(element('p', 'eyebrow', 'no leader'));
      card.append(element('h3', 'leader-detail-name', 'The plain rules'));
      card.append(element('p', 'leader-note', NO_LEADER_NOTE));
      return;
    }
    const face = faces.find((entry) => entry.id === chosen)!;
    const plate = element('div', 'leader-plate');
    plate.setAttribute('aria-hidden', 'true');
    plate.style.setProperty('--plate-primary', face.colors.primary);
    plate.style.setProperty('--plate-secondary', face.colors.secondary);
    card.append(plate);
    card.append(element('h3', 'leader-detail-name', face.name));
    card.append(element('p', 'leader-detail-id', leaderIdentity(face)));

    const lines = element('ul', 'leader-lines');
    for (const line of leaderFaceLines(face)) {
      const item = element('li', `leader-line leader-line-${line.kind}`);
      item.append(element('span', 'leader-line-label', line.label));
      item.append(clauseList(line.clauses, 'leader-line-clauses'));
      lines.append(item);
    }
    card.append(lines);

    const chips = element('p', 'leader-chips');
    for (const at of [0, 1] as const) {
      const chip = element('span', 'leader-chip');
      const swatch = element('span', 'leader-chip-mark');
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = at === 0 ? face.colors.primary : face.colors.secondary;
      chip.append(swatch, document.createTextNode(face.colorWords[at]));
      chips.append(chip);
    }
    card.append(chips);
    card.append(
      element('p', 'leader-cities', `Cities: ${leaderFirstCities(face.id).join(' · ')} …`),
    );
  }

  function render(): void {
    container.replaceChildren();
    container.append(element('p', 'eyebrow landing-crumb', options.crumb));
    container.append(element('h2', 'leader-title', 'Choose your civ'));
    container.append(element('p', 'landing-hint leader-lede', LEADER_LEDE));
    // Walked once and read twice — the roster and the card beside it are two
    // drawings of one fold.
    const faces = leaderFaces();
    const grid = element('div', 'leader-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Leaders');
    // *No leader* first and default: the game that was one press of Start away
    // is still one press of Start away, and its config is byte for byte what it
    // always was.
    grid.append(
      drawFaceShell(
        'leader-face leader-face-none',
        seatCanton(),
        'No leader',
        'the plain rules',
        chosen === NO_LEADER,
        () => take(NO_LEADER),
      ),
    );
    for (const face of faces) {
      grid.append(
        drawFaceShell(
          'leader-face',
          canton(face.colors),
          face.name,
          leaderIdentity(face),
          chosen === face.id,
          () => take(face.id),
        ),
      );
    }
    // **Random, last.** It deals a figure by the seed and then *is* that figure:
    // the press resolves, the detail card opens on whoever was dealt, and this
    // face says which — so the answer is on the screen before Begin is pressed
    // rather than after the world is drawn.
    const showsDeal = dealt !== null && dealt === chosen;
    grid.append(
      drawFaceShell(
        'leader-face leader-face-random',
        seatCanton(),
        'Random',
        showsDeal ? `dealt ${leaderDef(dealt!).name}` : 'dealt by the seed',
        showsDeal,
        () => {
          dealt = dealtLeader(options.seed?.() ?? 0);
          chosen = dealt;
          options.onPick?.(chosen);
          render();
        },
      ),
    );
    container.append(grid);
    drawDetail(faces);
  }

  return {
    get chosen(): string {
      return chosen;
    },
    render,
  };
}

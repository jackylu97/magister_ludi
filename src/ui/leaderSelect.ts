/**
 * **The new game's leader half** — the second card on the landing screen, beside
 * the map's (batch L2b; re-aimed at the second cut in L6b, `docs/flags.md`
 * (xxxx), `docs/leaders.md` "The second cut — fixed identity").
 *
 * The map card asks what world to draw; this one asks who you are in it. The
 * whole sheet of figures and *No leader*, each a button carrying the seat's
 * canton and **the four lines a figure is**: its two abilities, its unique unit
 * and its unique building, each unique named with the technology or the age that
 * opens it. There is nothing else to say about a figure and nothing left to
 * choose after this screen — which is the second cut's own claim, drawn.
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
  leaderDef,
} from '../sim/leaderData';
import { type CardClause, describeCard, ref } from '../sim/statecraft';
import type { PlayerSpec } from '../sim/state';
import { type BuildingId, buildingDef } from '../sim/buildingData';
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

/** Which of a figure's two rows a line is about. The kinds `isUnlocked` asks. */
export type LeaderRowKind = 'unit' | 'building';

/** The eyebrow over a unique's line, one word per kind. */
export const LEADER_ROW_WORD: Record<LeaderRowKind, string> = {
  unit: 'Unique unit',
  building: 'Unique building',
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
  /** The soldier nobody else may raise. */
  unit: LeaderUniqueFace;
  /** The building nobody else may raise. */
  building: LeaderUniqueFace;
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
      unit: uniqueFace('unit', def.unit, unitDef(def.unit).name),
      building: uniqueFace('building', def.building, buildingDef(def.building).name),
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
    { kind: 'unit' as const, label: LEADER_ROW_WORD.unit, clauses: [{ text: face.unit.text }] },
    {
      kind: 'building' as const,
      label: LEADER_ROW_WORD.building,
      clauses: [{ text: face.building.text }],
    },
  ];
}

/**
 * The stream index the cast is hashed on. Its own number, so that a second
 * seeded question asked on this screen one day cannot deal the same permutation.
 */
const CAST_STREAM = 0x1ea4;

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
  /** The card's own element, built once and repainted on every pick. */
  container: HTMLElement;
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

  /** A list of clauses, drawn through the descriptor writer (a raw `[[` never). */
  function clauseList(clauses: readonly CardClause[], className: string): HTMLElement {
    const list = element('ul', className);
    for (const clause of clauses) {
      const item = element('li', clause.deferred ? 'leader-clause is-deferred' : 'leader-clause');
      // `linked: false` — the host is inside a `<button>`, where a click already
      // means "take this figure" (`keywordsAllowedIn`'s ruling).
      setDescriptorText(item, clause.text, { linked: false });
      list.append(item);
    }
    return list;
  }

  /**
   * A face's four lines: the ability's own name over its clauses, and the kind
   * of row over the row's.
   *
   * The eyebrow is the *line's* name rather than a repeat of what a line is —
   * that sentence is the card's lead above the roster (`LEADER_LEDE`) and is
   * said once — so a reader comparing two figures is comparing four labelled
   * things rather than four paragraphs.
   */
  function drawLines(face: LeaderFace): HTMLElement {
    const list = element('ul', 'leader-lines');
    for (const line of leaderFaceLines(face)) {
      const item = element('li', `leader-line leader-line-${line.kind}`);
      item.append(element('span', 'leader-line-label', line.label));
      item.append(clauseList(line.clauses, 'leader-line-clauses'));
      list.append(item);
    }
    return list;
  }

  function drawFace(face: LeaderFace): HTMLElement {
    const button = element('button', 'leader-face') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(chosen === face.id));
    if (chosen === face.id) button.classList.add('is-chosen');
    button.append(canton(face.colors));
    const text = element('span', 'leader-face-text');
    text.append(element('span', 'leader-name', face.name));
    text.append(drawLines(face));
    button.append(text);
    button.addEventListener('click', () => {
      chosen = chosen === face.id ? NO_LEADER : face.id;
      options.onPick?.(chosen);
      render();
    });
    return button;
  }

  function drawNone(): HTMLElement {
    const button = element('button', 'leader-face leader-face-none') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(chosen === NO_LEADER));
    if (chosen === NO_LEADER) button.classList.add('is-chosen');
    button.append(seatCanton());
    const text = element('span', 'leader-face-text');
    text.append(element('span', 'leader-name', 'No leader'));
    text.append(element('p', 'leader-none-note', NO_LEADER_NOTE));
    button.append(text);
    button.addEventListener('click', () => {
      chosen = NO_LEADER;
      options.onPick?.(chosen);
      render();
    });
    return button;
  }

  function render(): void {
    container.replaceChildren();
    container.append(element('p', 'eyebrow', 'the seat'));
    container.append(element('h2', 'leader-title', 'Choose a leader'));
    container.append(element('p', 'landing-hint leader-lede', LEADER_LEDE));
    const grid = element('div', 'leader-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Leaders');
    grid.append(drawNone());
    for (const face of leaderFaces()) grid.append(drawFace(face));
    container.append(grid);
  }

  return {
    get chosen(): string {
      return chosen;
    },
    render,
  };
}

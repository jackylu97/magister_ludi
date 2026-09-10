/**
 * The Beads screen: **the bead ledger** — who holds how many, what pays one, and
 * whether the door is open.
 *
 * Design ledger Entry VI and `docs/beads.md`. The Bead Race is the game's only
 * victory condition — glass beads across four families, and a threshold that
 * opens the Magnum Opus (schema 64; it used to win outright).
 *
 * It was **the table** until batch Q1 (`docs/wager.md` §5): what was on offer,
 * who had taken what, what was still face down. The deeds are retired — feats,
 * quests and race projects, the old victory conditions — so there is no table,
 * and what is left is the ledger: every seat's rod, the rows that still pay a
 * bead, and the Opus's own line.
 *
 * **Why it is still a screen.** Folding it into the Abacus was the preferred
 * reading of the ruling and is not what this batch did, for one reason on the
 * board rather than a design one: the Abacus is being reworked in the same batch
 * as the wager screen (its band of cards, its measured stage), and a second hand
 * in that file would be two agents editing one layout. The three doors are
 * unchanged — the bead chip, any rod on the Abacus, and `V` — and the fold stays
 * available the day the Abacus is still: the rods are already drawn there, the
 * grants are a short list, and the door is one line.
 *
 * The sibling it is built from
 * ----------------------------
 * The Statecraft and Religion sheets, exactly — same overlay classes, the same
 * keyboard contract, and, since batch H5, literally the same frame:
 * `modalShell.ts` is where `hidden` is the whole of the screen state, where the
 * ×, Escape and a press on the ground arrive at one `close`, and where opening
 * closes whatever else was up. Same split, too: a fixed column on the left for *where everyone
 * stands*, a scrolling pane on the right for *what is on the table*. Three
 * systems that deal cards from a pool must not look like three different games.
 *
 * Derived, never stored
 * ---------------------
 * Nothing on this screen is state of its own. The rods are `Player.beads`, the
 * claimants are `GameState.beads.claimed`, the threshold is `data/beads.json`'s
 * rules row, and the Opus's line is `opusOpen` — the reducer's own reading, so a
 * door this screen calls open is a door `buildError` would let a city through.
 *
 * Pure builders, because this suite has no jsdom
 * ----------------------------------------------
 * Everything that can be *quietly wrong* about a card — which words a face
 * carries, how a face-down pile is counted, how a claimant reads, where the
 * golden slot falls on a rod — is a pure function exported above the DOM, on
 * `triumphFace`'s precedent one sheet over. Drawing them is a page of `append`
 * calls that fail loudly or not at all.
 */

import {
  type BeadCardId,
  type BeadFamily,
  type BeadKind,
  BEAD_GRANT_IDS,
  BEAD_RULES,
  anyBeadDef,
  beadIsDormant,
} from '../sim/beadData';
import { describeBeadBoon } from '../sim/beads';
import {
  type EarnedBead,
  type GameState,
  playerById,
  realPlayers,
} from '../sim/state';
import { opusOpen } from '../sim/tech';
import { eraWord, figure } from './figures';
import { setDescriptorText } from './keywords';
import type { CardClause } from '../sim/statecraft';
import { stripRefs } from '../sim/statecraft';
import { element } from './dom';
import { createModalShell } from './modalShell';

// --- the four families ------------------------------------------------------

/**
 * What a family is called, what it is drawn as, and which ink it is drawn in.
 *
 * **The bead is the one place a saturated colour is allowed** (Entry VI's glass
 * beads), and these are the specimen's own four accents used for what they
 * already mean: vermilion is blood, grape is rite, lapis is knowledge, gilt is
 * money. They are the same four `data/view3d.json` strings the 3D abacus paints
 * its beads with, so the object on the Abacus and the chips on this screen are
 * one palette rather than two.
 *
 * The glyph is borrowed from the interface's existing symbol channel — the
 * sword the unit shelf wears, the fleuron an Order wears, the star the tree
 * wears, the arrows trade wears — rather than drawn new, which is the art
 * pass's standing rule for anything that is not a piece.
 */
export interface BeadFamilyMark {
  /** "Domination". Sentence-cased for a heading; lowercased where a clause wants it. */
  word: string;
  glyph: string;
  /** A CSS custom property name — never a literal colour. */
  ink: string;
}

export const BEAD_FAMILY_MARK: Record<BeadFamily, BeadFamilyMark> = {
  domination: { word: 'Domination', glyph: '⚔', ink: '--vermilion' },
  culture: { word: 'Culture', glyph: '❧', ink: '--grape' },
  science: { word: 'Science', glyph: '✦', ink: '--lapis' },
  economic: { word: 'Economic', glyph: '⇄', ink: '--gilt' },
};

/**
 * The Æra a deck is, in the numerals the player knows.
 *
 * Once a shim: before the tree pass re-banded the ages, deck keys ran one
 * behind the numerals the design doc used, and this helper carried the `+1`
 * with a promise — when the re-banding lands, the shim is deleted and nothing
 * else moves. The re-banding landed (`BEAD_DECK_AGES` is 3 and 4 now),
 * the promise is kept, and the helper survives only as the one name every bead
 * surface asks, so a future re-banding is still a one-line change.
 */
export function deckEraWord(age: number): string {
  return eraWord(age);
}

/** What class of row a card came off, in a player's word. */
const KIND_WORD: Record<BeadKind, string> = {
  feat: 'feat',
  endeavour: 'race project',
  quest: 'quest',
  reckoning: 'reckoning',
  grant: 'reward',
};

// --- one card's face --------------------------------------------------------

/** Who has taken a card, as this screen needs to read it. */
export interface BeadClaimView {
  playerName: string;
  turn: number;
}

/** One card, as words. Everything on it except the DOM that draws it. */
export interface BeadCardFace {
  id: BeadCardId;
  kind: BeadKind;
  name: string;
  family: BeadFamily;
  /** "quest · Æra III", "race project · Æra IV", "feat · always in play". */
  eyebrow: string;
  /** The deed, or the race's prerequisite, in the row's own player-facing words. */
  deed: string;
  /**
   * What it pays, in the simulation's own words (`describeBeadBoon`) — the
   * *same* clauses the award toast prints, so a card can never promise what the
   * settlement does not deliver. Empty for a row that pays nothing.
   */
  boon: CardClause[];
  /** "Taken by Crimson on turn 84", or "Open — nobody has taken it". */
  claim: string;
  /** Halves of the ratified card this build does not implement. */
  deferred: string[];
  /** Why this row cannot be reached at all in this build. */
  dormant: string | null;
}

/** "quest · Æra III". A feat is dealt in no deck and says so. */
function eyebrowFor(kind: BeadKind, age: number | null): string {
  const word = KIND_WORD[kind];
  if (kind === 'feat') return `${word} · always in play`;
  // A reward is never dealt and never contested — it is handed over by whatever
  // names it — so it has neither a deck nor a race to say anything about.
  if (kind === 'grant') return `${word} · handed over, never raced for`;
  if (age === null) return word;
  return `${word} · ${deckEraWord(age)}`;
}

/**
 * "Taken by Crimson on turn 84", or that nobody has.
 *
 * The claimant is read off `GameState.beads.claimed` — the world's own register,
 * which is where contention is settled — rather than by searching every seat's
 * rod, so a card this screen calls open is a card `awardBead` would still give
 * away.
 */
export function beadClaimLine(claim: BeadClaimView | null): string {
  if (claim === null) return 'Open — nobody has taken it';
  return `Taken by ${claim.playerName} on turn ${figure(claim.turn)}`;
}

/**
 * One card's whole face.
 *
 * The one fact about a *game* arrives from the caller rather than being asked
 * for here — the claimant, off the world's register — because asking is the
 * simulation's job and this function is pure, which is what lets the test suite
 * build a face with no game behind it.
 *
 * It carried two more until batch Q1: `met`, off `endeavourPrerequisiteMet`, and
 * `refusal`, off `endeavourError`. Both were the race project's two lines and
 * the races are retired.
 */
export function beadCardFace(
  id: BeadCardId,
  options: {
    claim?: BeadClaimView | null;
  } = {},
): BeadCardFace {
  const { kind, def } = anyBeadDef(id);
  const age = 'age' in def && typeof def.age === 'number' ? def.age : null;
  const boon = 'boon' in def ? def.boon : undefined;
  // A reward has no deed to print — nobody races for it — so its `source` leads
  // and its `text` follows: "Raising the Magnum Opus. The last bead on the rod…"
  const source = 'source' in def && typeof def.source === 'string' ? def.source : null;
  return {
    id,
    kind,
    name: def.name,
    family: def.family,
    eyebrow: eyebrowFor(kind, age),
    deed: source === null ? def.text : `${source} ${def.text}`,
    boon: boon === undefined ? [] : describeBeadBoon(boon),
    claim: beadClaimLine(options.claim ?? null),
    deferred: def.deferred ?? [],
    dormant: def.dormant ?? null,
  };
}

/*
 * `faceDownLine` and `deckLine` stood here and are **gone** (batch Q1). They
 * counted the pile that had not turned over and what was still to be dealt, and
 * a ledger with no deck behind it has neither.
 */

// --- the age opening -------------------------------------------------------

/*
 * The age-opening banner and its two pure builders were retired in batch G2 and
 * the **whole table** followed them in Q1 (`docs/wager.md` §5).
 *
 * The banner was the age-opening draw: this sheet raised itself the turn an age
 * turned over, wearing an index of the new table. What replaced it is the
 * **wager's deal sheet** — three bars the age sets for everybody, which is what
 * an age asks now — and two full-screen sheets on one turn was one too many.
 *
 * What the banner indexed is now gone with the rows behind it: `drawAge`, the
 * per-age tables of quests and race projects; `drawFeats`, the world firsts; and
 * `drawReckonings`, the measures the world had taken. The feats, quests, race
 * projects and reckonings all carry `retired: true` in `data/beads.json` — the
 * wager sets the age's bars and pays for them, for everybody, and a screen that
 * still drew four decks of withdrawn cards would be an index of nothing.
 */


// --- the rods ---------------------------------------------------------------

/**
 * One position on a rod. `golden` is the last one and is **always empty**: only
 * the Magnum Opus mints that bead (Entry VI.3's climax amendment), and it sits
 * on every rod all game as the standing question.
 */
export interface RodSlot {
  kind: 'bead' | 'empty' | 'golden';
  family?: BeadFamily;
}

/**
 * A seat's rod, slot by slot: what it has earned, then what it has not, then the
 * gilt slot at the threshold.
 *
 * The threshold is the rod's *length*, which is the whole reason this is a
 * function of it rather than of a bead count: a rod is "how far to a win", and a
 * rod that stopped at what somebody happened to have earned would be a tally
 * rather than a race. The golden slot wins its position outright — it is the
 * threshold bead, and nothing else may be drawn there.
 */
export function abacusRodSlots(
  beads: readonly EarnedBead[],
  threshold: number = BEAD_RULES.threshold,
): RodSlot[] {
  const length = Math.max(1, Math.floor(threshold));
  const slots: RodSlot[] = [];
  for (let i = 0; i < length; i++) {
    if (i === length - 1) {
      slots.push({ kind: 'golden' });
      continue;
    }
    const earned = beads[i];
    slots.push(earned ? { kind: 'bead', family: earned.family } : { kind: 'empty' });
  }
  return slots;
}

/**
 * Where the Magnum Opus stands, in one line: open to the world, or not yet.
 *
 * A pure function of the one derived reading (`opusOpen`, `tech.ts`) so the
 * screen and the reducer's own announcement cannot disagree about whether the
 * finish line exists — and pure so a test may print the sentence with no game
 * behind it, `beadCardFace`'s bargain.
 */
export function opusStandingLine(open: boolean): string {
  return open
    ? 'The Magnum Opus is open — the first one finished closes the age'
    : 'The Magnum Opus is not yet open — it waits on the world reaching Alchemy';
}

/**
 * "held", "twice", or nothing — what this seat has had out of one grant row.
 *
 * Pure, on `beadClaimLine`'s precedent, because how a repeatable row reads when
 * it has paid twice is exactly the kind of thing that can be quietly wrong.
 * Empty for a row that has never paid, so the column is blank rather than
 * carrying a nought.
 */
export function grantHeldLine(held: number): string {
  if (held <= 0) return '';
  if (held === 1) return 'held';
  return `held ${figure(held)} times`;
}

/** "Crimson 7" — one seat's standing, for the threshold list. */
export function standingLine(name: string, beads: number, threshold: number): string {
  return `${name} ${figure(beads)} of ${figure(threshold)}`;
}

/**
 * What a bead's own chip says when the pointer rests on it: its card, its
 * family, the turn it was clacked, and what it paid.
 *
 * The boon is the *card's* boon rather than a record of what was banked, and
 * that is honest: a bead is a claim on the world and the row is what the world
 * promised for it.
 */
export function beadHoverText(earned: EarnedBead): string {
  const { def } = anyBeadDef(earned.id);
  const mark = BEAD_FAMILY_MARK[earned.family];
  const head = `${def.name} — ${mark.word.toLowerCase()}, turn ${figure(earned.turn)}`;
  const boon = 'boon' in def && def.boon !== undefined ? describeBeadBoon(def.boon) : [];
  // **Stripped**, because a native tooltip is a string the platform draws: a
  // keyword's marks would come out as brackets. `keywords.ts`' plain sink.
  if (boon.length === 0) return head;
  return `${head}\n${boon.map((clause) => stripRefs(clause.text)).join(' · ')}`;
}

// --- the screen -------------------------------------------------------------

export interface BeadsScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /**
   * **An age has opened** — raise this screen with the banner on it.
   *
   * The age-opening sheet *is* this screen (the ruling of this pass): the table
   * already lists every card of the age, every feat and every rod, and a second
   * surface listing the same rows would be a second list to keep true. So the
   * announcement is the screen, opened with a header saying what happened and a
   * grouped index of what the age just put on the table — which also makes it
   * **reopenable** for nothing: `V` brings the table back all game.
   *
   * The banner belongs to the raising and is dropped when the screen closes.
   *
   * **Retired, batch G2** (`docs/wager.md` §5/§11): the sheet no longer raises
   * itself on the age — the wager's deal sheet does, because the three bars are
   * what an age now asks of everybody, and two full-screen sheets on one turn is
   * one sheet too many. Everything it printed is still here and still reachable
   * all game by the table's three ordinary doors: the bead chip in the top bar,
   * any rod on the Abacus, and `V`. The banner is the only thing that went.
   */
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

export interface BeadsScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  /**
   * The control the table is reached from, for the `aria-expanded` mirror and
   * the focus return. Not a door: the doors are `main.ts`'s (`onToggleBeads`
   * from the bar's chip, a rod on the Abacus, `V`), like every other sheet's.
   */
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  onOpen?: () => void;
}

/**
 * A bead chip, in its family's ink. The one saturated colour on the sheet.
 *
 * Exported because the **award sheet** draws the same object (`beadModal.ts`):
 * a bead on a rod is one thing in this interface, and a second drawing of it
 * would be the first place the two palettes drifted apart.
 */
export function beadChipNode(family: BeadFamily, title?: string): HTMLElement {
  const mark = BEAD_FAMILY_MARK[family];
  const chip = element('span', 'bead-chip');
  chip.style.setProperty('--bead-ink', `var(${mark.ink})`);
  chip.setAttribute('aria-hidden', 'true');
  if (title !== undefined) chip.title = title;
  return chip;
}

/** The family's glyph, taking the family's ink. `axisMarkNode`'s twin. */
function familyMarkNode(family: BeadFamily): HTMLElement {
  const mark = BEAD_FAMILY_MARK[family];
  const node = element('span', 'bead-family-mark', mark.glyph);
  node.style.setProperty('--bead-ink', `var(${mark.ink})`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

export function createBeadsScreen(options: BeadsScreenOptions): BeadsScreen {
  const { overlay, body, closeButton, trigger, getState, getPlayerId } = options;

  /**
   * The age this screen is currently announcing, or `null` for the ordinary
   * table. View state and nothing else — it is dropped the moment the screen
   * closes, so a player who comes back to the table by `V` gets the table.
   */

  /*
   * `drawCard` stood here and is **gone** (batch Q1). It was the paper a deed
   * card was printed on — the family mark, the eyebrow, the deed, what it paid,
   * the two race lines and the claimant — and there are no deed cards. The
   * ledger's one table is a list (`drawGrants`), which is what a short list of
   * rows nobody races for should look like.
   */

  /**
   * **The grants — what still hands a bead over.**
   *
   * The one table left on this sheet, and the ledger's other half beside the
   * rods. Every live row of the fifth class, in file order, with the sentence
   * saying where the bead comes from (`BeadGrantDef.source`, which is the field
   * that class carries *because* it has no deed to print) and, on the right,
   * what this seat has had out of it.
   *
   * `beadIsDormant` is the filter, so a row waiting on a technology and a row
   * withdrawn leave by the same door — which since batch Q1 takes the four the
   * Æra V bead Orders minted with it, because the cards that named them are
   * retired in the same pass.
   *
   * The count is read off `Player.beads` rather than off the world's register,
   * and deliberately: a **repeatable** row (the four a wager pays) may pay one
   * seat several times, and "twice" is a fact about a rod. A once-per-empire row
   * reads "held" or nothing at all.
   */
  function drawGrants(state: GameState, seat: number): HTMLElement {
    const section = element('section', 'bead-age');
    section.append(element('h3', 'bead-age-title', 'What pays a bead'));
    section.append(
      element(
        'p',
        'hint',
        'A bead is minted by a wager kept, or handed over by one of these.',
      ),
    );
    const player = playerById(state, seat);
    const list = element('ul', 'bead-feat-list');
    for (const id of BEAD_GRANT_IDS) {
      if (beadIsDormant(id)) continue;
      const face = beadCardFace(id);
      const held = (player?.beads ?? []).filter((earned) => earned.id === id).length;
      const row = element('li', 'bead-feat');
      row.classList.toggle('is-taken', held > 0);
      row.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[face.family].ink})`);
      row.append(familyMarkNode(face.family));
      const words = element('div', 'bead-feat-words');
      words.append(element('span', 'bead-feat-name', face.name));
      const deed = element('span', 'bead-feat-deed');
      setDescriptorText(deed, face.deed, { linked: false });
      words.append(deed);
      row.append(words);
      row.append(element('span', 'bead-feat-claim', grantHeldLine(held)));
      list.append(row);
    }
    section.append(list);
    return section;
  }

  /** The left column: one rod per real seat, and the golden slot on each. */
  function drawRods(state: GameState, seat: number): HTMLElement {
    const column = element('aside', 'bead-rods');
    column.append(element('p', 'eyebrow sc-eyebrow', 'the reckoning'));
    column.append(
      element(
        'p',
        'bead-threshold',
        `${figure(BEAD_RULES.threshold)} beads win — the last is golden`,
      ),
    );
    // The finish line's own line, under the threshold and above the rods,
    // because it is a fact about the *world* rather than about any seat.
    column.append(element('p', 'hint bead-opus-line', opusStandingLine(opusOpen(state))));

    for (const player of realPlayers(state)) {
      const rod = element('div', 'bead-rod');
      rod.classList.toggle('is-local', player.id === seat);
      const head = element('div', 'bead-rod-head');
      head.append(element('span', 'bead-rod-name', player.name));
      head.append(
        element(
          'span',
          'bead-rod-tally',
          standingLine('', player.beads.length, BEAD_RULES.threshold).trim(),
        ),
      );
      rod.append(head);

      const wire = element('div', 'bead-rod-wire');
      const slots = abacusRodSlots(player.beads, BEAD_RULES.threshold);
      slots.forEach((slot, index) => {
        if (slot.kind === 'golden') {
          const golden = element('span', 'bead-slot is-golden');
          golden.title = 'The golden bead — only the Magnum Opus mints it';
          wire.append(golden);
          return;
        }
        if (slot.kind === 'empty') {
          wire.append(element('span', 'bead-slot is-empty'));
          return;
        }
        const earned = player.beads[index]!;
        wire.append(beadChipNode(slot.family!, beadHoverText(earned)));
      });
      rod.append(wire);
      // The rod used to carry a line of dice of the Magister under the wire.
      // The dice went with schema 71 (`docs/history/fewer-things.md` §1 — faith rerolls
      // a draft now), and nothing stands in their place: the rod counts beads,
      // which is the whole of what it was ever for.
      column.append(rod);
    }
    return column;
  }

  function render(): void {
    const state = getState();
    const seat = getPlayerId();
    body.replaceChildren();

    body.append(drawRods(state, seat));

    const pane = element('div', 'bead-pane');
    pane.append(drawGrants(state, seat));
    body.append(pane);
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, the keyboard
   * goes to the × and comes back to the bar, and the disposer is the game's.
   *
   * Nothing per-visit is hung on it any more: the age-opening banner it used to
   * carry is retired with the raising that put it there (batch G2).
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    draw: render,
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}

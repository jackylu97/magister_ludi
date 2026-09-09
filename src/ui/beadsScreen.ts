/**
 * The Beads screen: **the one thing everybody is playing for, on one table.**
 *
 * Design ledger Entry VI and `docs/beads.md`. The Bead Race is the game's only
 * victory condition — glass beads across four families, a threshold that opens
 * the Magnum Opus (schema 64; it used to win outright), and a table of cards
 * every seat can see. The Abacus is the *score*
 * (the object, the rods, who is ahead); this is the **table**: what is on offer,
 * who has taken what, and what is still face down.
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
 * hands are `GameState.beads.hands`, the claimants are
 * `GameState.beads.claimed`, the threshold and the hand sizes are
 * `data/beads.json`'s rules row, and an endeavour's refusal is `endeavourError`
 * — the reducer's own sentence, so a row this screen greys is a row the reducer
 * would refuse.
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
  type BeadAge,
  type BeadCardId,
  type BeadFamily,
  type BeadKind,
  BEAD_DECK_AGES,
  BEAD_FEAT_IDS,
  BEAD_RULES,
  anyBeadDef,
  beadHandSize,
  isBeadEndeavourId,
} from '../sim/beadData';
import {
  beadHandIsShownTo,
  describeBeadBoon,
  endeavourError,
  endeavourPrerequisiteMet,
} from '../sim/beads';
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
  /**
   * For a race project only: does the reading seat meet what the race asks,
   * right now? `null` for every other kind — a quest is not something you
   * qualify for, it is something you do.
   *
   * **`endeavourPrerequisiteMet`'s answer, and nothing else.** It is a different
   * question from `refusal` below and they must not be folded: a race whose
   * prerequisite this empire meets can still be refused because somebody else
   * finished it, and a tick that flipped to a cross the moment a rival won would
   * be telling the player something untrue about their own realm.
   */
  met: boolean | null;
  /** Why the reducer would refuse this race today, in its own sentence. */
  refusal: string | null;
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
 * The three facts about a *game* arrive from the caller rather than being asked
 * for here — the claimant off the world's register, `met` off
 * `endeavourPrerequisiteMet`, `refusal` off `endeavourError` — because asking is
 * the simulation's job and this function is pure, which is what lets the test
 * suite build a face with no game behind it.
 */
export function beadCardFace(
  id: BeadCardId,
  options: {
    claim?: BeadClaimView | null;
    met?: boolean | null;
    refusal?: string | null;
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
    met: options.met ?? null,
    refusal: options.refusal ?? null,
    deferred: def.deferred ?? [],
    dormant: def.dormant ?? null,
  };
}

/**
 * "Three cards face down until the age opens" — the pile, counted.
 *
 * Empty when there is nothing face down, so a caller may print it or not by
 * asking whether it is empty rather than by counting again.
 */
export function faceDownLine(count: number, age: number): string {
  if (count <= 0) return '';
  const what = count === 1 ? 'card' : 'cards';
  return `${figure(count)} ${what} face down until ${deckEraWord(age)} opens`;
}

/**
 * "9 still in the deck" — what has not been dealt yet.
 *
 * A hand is a set of **open slots that refill** (the sim, 2026-08-30): a claimed
 * card leaves the table and the deck fills the gap on the next deal. So "what is
 * on the table" and "what is still to come" are two different numbers and a
 * player planning an age needs both. Empty when the deck is spent, which is an
 * age that has shown everything it holds.
 */
export function deckLine(remaining: number): string {
  if (remaining <= 0) return 'The deck is spent — this is everything the age holds';
  return `${figure(remaining)} still in the deck`;
}

// --- the age opening -------------------------------------------------------

/*
 * The age-opening banner and its two pure builders stood here until batch G2 and
 * are **retired** (`docs/wager.md` §5/§11).
 *
 * They were the age-opening draw: this sheet raised itself the turn an age
 * turned over, wearing a banner that grouped the new table into races and
 * measures. What replaced it is the **wager's deal sheet** — three bars the age
 * sets for everybody, which is what an age asks now — and two full-screen sheets
 * on one turn is one sheet too many.
 *
 * Nothing the banner listed was lost with it. The whole table is still drawn by
 * `drawAge` for every deck age, the feats by `drawFeats` and the measures taken
 * by `drawReckonings`, and all of it is reachable all game by the table's three
 * ordinary doors: the bead chip in the top bar, any rod on the Abacus, and `V`.
 * The **measures themselves** are retired too, one system over — `data/beads.json`'s
 * eight reckonings carry `retired: true` since this batch, because the wager is
 * the age's snapshot now and it is taken for everybody rather than paying the
 * leader alone.
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

  /** Who took this card, or null. Read off the world's register. */
  function claimOf(state: GameState, id: BeadCardId): BeadClaimView | null {
    const claim = state.beads.claimed.find((one) => one.id === id);
    if (!claim) return null;
    const who = playerById(state, claim.playerId);
    return { playerName: who?.name ?? 'An empire', turn: claim.turn };
  }

  /** One card, drawn. The face is pure; this is the paper it is printed on. */
  function drawCard(face: BeadCardFace): HTMLElement {
    const card = element('article', 'bead-card');
    card.id = `bead-card-${face.id}`;
    card.classList.toggle('is-taken', face.claim.startsWith('Taken'));
    card.classList.toggle('is-dormant', face.dormant !== null);
    card.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[face.family].ink})`);

    const head = element('div', 'bead-card-head');
    head.append(familyMarkNode(face.family));
    head.append(element('h4', 'bead-card-name', face.name));
    card.append(head);
    card.append(element('p', 'eyebrow bead-card-eyebrow', face.eyebrow));

    const deed = element('p', 'bead-card-deed');
    setDescriptorText(deed, face.deed, { linked: false });
    card.append(deed);

    for (const clause of face.boon) {
      const paid = element('p', 'bead-card-boon');
      paid.classList.toggle('is-deferred', clause.deferred === true);
      // A boon may name a thing it hands over ("a free [[unit:settler|settler]]
      // at the capital"), so it goes through the one renderer. Unlinked: the
      // card is a face on a screen with its own doors, and a click that opened
      // the Compendium from under it would take the table away.
      setDescriptorText(paid, clause.text, { linked: false });
      card.append(paid);
    }
    for (const line of face.deferred) {
      card.append(element('p', 'bead-card-deferred', line));
    }
    if (face.dormant !== null) {
      card.append(element('p', 'bead-card-deferred', face.dormant));
    }

    // **Two lines, two questions, and they must not be folded.** The tick is
    // `endeavourPrerequisiteMet` — a fact about *this realm*, which does not
    // change because a rival finished first — and the sentence under it is
    // `endeavourError`, which is why the reducer would refuse the row today.
    //
    // The unmet half wears `wanting` and the met half does not: the ruling of
    // 2026-09-08 is that a line naming something the empire has not got looks
    // the same everywhere, and "does not meet what the race asks yet" names
    // exactly that. It supersedes this card's earlier note that the gate is
    // "never vermilion, a plan rather than an alarm" — the plan is still a plan,
    // it is simply said in the interface's one voice for a lack. The tick keeps
    // its teal, because a met condition is not a lack at all.
    if (face.met !== null) {
      const gate = element('p', 'bead-card-gate');
      gate.classList.toggle('is-met', face.met);
      gate.classList.toggle('wanting', !face.met);
      gate.textContent = face.met
        ? '✓ Your empire meets what the race asks'
        : '✗ Your empire does not meet what the race asks yet';
      card.append(gate);
    }
    if (face.refusal !== null) {
      card.append(element('p', 'info-card-state wanting', face.refusal));
    }

    card.append(element('p', 'bead-card-claim', face.claim));
    return card;
  }

  /** The backs of the pile, and what the pile is waiting for. */
  function drawFaceDown(count: number, age: number): HTMLElement | null {
    const line = faceDownLine(count, age);
    if (line.length === 0) return null;
    const box = element('div', 'bead-facedown');
    const backs = element('div', 'bead-backs');
    for (let i = 0; i < count; i++) backs.append(element('span', 'bead-back'));
    backs.setAttribute('aria-hidden', 'true');
    box.append(backs);
    box.append(element('p', 'hint bead-facedown-line', line));
    return box;
  }

  /** One age's table: the cards face up, then the pile that is not. */
  function drawAge(state: GameState, seat: number, age: BeadAge): HTMLElement {
    const section = element('section', 'bead-age');
    const hand = state.beads.hands[String(age)] ?? [];
    const deck = state.beads.decks[String(age)] ?? [];

    const head = element('div', 'bead-age-head');
    head.append(element('h3', 'bead-age-title', `${deckEraWord(age)} — the table`));
    head.append(
      element(
        'p',
        'bead-age-count',
        `${figure(hand.length)} of ${figure(beadHandSize(age))}`,
      ),
    );
    section.append(head);

    // **The Long Count shows the next age's hand a turn early** (the tree pass
    // of 2026-08-30). It is *sight* and never a claim: `faceUp` stays the
    // world's fact — it is what makes a quest claimable — and this seat is
    // simply allowed to read a table that has not turned over yet. So the cards
    // are drawn and the claim state on them is whatever it already was.
    const shown = beadHandIsShownTo(state, seat, age);
    const faceUp = hand.filter((card) => card.faceUp || shown);
    const grid = element('div', 'bead-card-grid');
    for (const card of faceUp) {
      const race = card.id;
      grid.append(
        drawCard(
          beadCardFace(card.id, {
            claim: claimOf(state, card.id),
            met: isBeadEndeavourId(race) ? endeavourPrerequisiteMet(state, seat, race) : null,
            refusal: isBeadEndeavourId(race) ? endeavourError(state, seat, race) : null,
          }),
        ),
      );
    }
    if (faceUp.length === 0) {
      grid.append(
        element('p', 'hint', 'Nothing has turned face up here yet — the age has not opened.'),
      );
    } else if (shown && hand.some((card) => !card.faceUp)) {
      grid.append(
        element('p', 'hint', 'Read ahead of the age, by the long count your scribes keep.'),
      );
    }
    section.append(grid);

    const down = drawFaceDown(hand.length - faceUp.length, age);
    if (down) section.append(down);
    // A hand is open slots that refill, so what is still in the deck is a
    // different question from what is face down on the table.
    section.append(element('p', 'hint bead-deck-line', deckLine(deck.length)));
    return section;
  }

  /** The feats: always in play, never dealt, and every one of them contested. */
  function drawFeats(state: GameState): HTMLElement {
    const section = element('section', 'bead-age');
    section.append(element('h3', 'bead-age-title', 'Feats — always in play'));
    const list = element('ul', 'bead-feat-list');
    for (const id of BEAD_FEAT_IDS) {
      const face = beadCardFace(id, { claim: claimOf(state, id) });
      const row = element('li', 'bead-feat');
      row.classList.toggle('is-dormant', face.dormant !== null);
      row.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[face.family].ink})`);
      row.append(familyMarkNode(face.family));
      const words = element('div', 'bead-feat-words');
      words.append(element('span', 'bead-feat-name', face.name));
      const deed = element('span', 'bead-feat-deed');
      setDescriptorText(deed, face.deed, { linked: false });
      words.append(deed);
      row.append(words);
      row.append(element('span', 'bead-feat-claim', face.claim));
      list.append(row);
    }
    section.append(list);
    return section;
  }

  /**
   * The reckonings the world has already taken.
   *
   * A reckoning is an ordinary card of its age's deck now (the sim, 2026-08-30:
   * four per deck, one per family), so an *undealt* one is drawn with the rest
   * of the table above and an *unresolved* one is sitting face up there. What
   * has no place on the table is a reckoning that has already been taken — it
   * left the hand the moment it resolved — and that is the record this reads:
   * `GameState.beads.claimed`, the world's own register, filtered to the ages
   * that have closed. Nothing at all before the first age turns over.
   */
  function drawReckonings(state: GameState): HTMLElement | null {
    const taken = state.beads.claimed.filter(
      (claim) => anyBeadDef(claim.id).kind === 'reckoning',
    );
    if (taken.length === 0) return null;

    const section = element('section', 'bead-age');
    section.append(element('h3', 'bead-age-title', 'Reckonings taken'));
    const list = element('ul', 'bead-feat-list');
    for (const claim of taken) {
      const face = beadCardFace(claim.id);
      const row = element('li', 'bead-feat');
      row.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[face.family].ink})`);
      row.append(familyMarkNode(face.family));
      const words = element('div', 'bead-feat-words');
      words.append(element('span', 'bead-feat-name', face.name));
      const deed = element('span', 'bead-feat-deed');
      setDescriptorText(deed, face.deed, { linked: false });
      words.append(deed);
      row.append(words);
      row.append(
        element(
          'span',
          'bead-feat-claim',
          `${deckEraWord(claim.age)}: ${playerById(state, claim.playerId)?.name ?? '—'}`,
        ),
      );
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
    for (const age of BEAD_DECK_AGES) pane.append(drawAge(state, seat, age));
    pane.append(drawFeats(state));
    const reckonings = drawReckonings(state);
    if (reckonings) pane.append(reckonings);
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

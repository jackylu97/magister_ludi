/**
 * **The reveal** — what a card shows, and when (`docs/history/fewer-things.md` §1 "The
 * levers", rows *Slot order* and *The reveal*, and §4 "Making the combo
 * visible", all RULED 2026-09-06).
 *
 * The user's words are the spec: *"don't show the yield (on a newly slotted
 * card) until you confirm its placement in the government — hit confirm,
 * locking the card in its slot, aggregate yields fire after hitting confirm"*,
 * and *"the first economic slot = the topmost economic slot arranged
 * visually"*.
 *
 * There is no jsdom in this suite (`test/ui/statecraftCards.test.ts` says why),
 * so this asks the two kinds of question that survive that: the **pure** half —
 * the aggregate's arithmetic and the position words, driven against a real
 * `GameState` — and the **source** half, which is where a ruling about *when* a
 * number appears actually lives. Four things would render perfectly and be
 * wrong:
 *
 *   1. a figure printed on an office nobody has signed — the ceremony gone, and
 *      with it the whole reason Confirm exists;
 *   2. the ceremony and the Ledger reading two different folds, so the band
 *      celebrates a number the sheet contradicts;
 *   3. a position word printed for a rule the game does not have yet;
 *   4. rearranging cut loose from the staging, so a move signs itself or slips
 *      a seal.
 */

import { describe, expect, it } from 'vitest';

import {
  DECK_LABEL,
  foldDeck,
  deckCaption,
  explainLedger,
} from '../../src/ui/ledgerScreen';
import { deckReadsSlotPosition, slotPositionWord } from '../../src/ui/statecraftScreen';
import { GOVERNMENT_IDS, ORDER_IDS, SLOT_TYPES, slotLayout } from '../../src/sim/statecraftData';
import type { OrderId, SlotType } from '../../src/sim/statecraftData';
import { YIELD_GLYPH } from '../../src/ui/figures';
import { playerById } from '../../src/sim/state';
import type { GameState } from '../../src/sim/state';
import { found, game } from '../sim/statecraftHelpers';

const SOURCES = import.meta.glob(['../../src/ui/*.ts', '../../src/style.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function raw(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  if (key === undefined) throw new Error(`${file} was not globbed`);
  return SOURCES[key]!;
}

/** One file's source with its comments taken out — the rule is the code. */
function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const SCREEN = raw('statecraftScreen.ts');
const STYLE = raw('style.css');

/** A seat with a town and a slotted Order — a deck with something in it. */
function bench(): { state: GameState; playerId: number } {
  const made = game();
  const state = made.state;
  const city = found(state, 0);
  city.population = 4;
  city.buildings.push('monument', 'library');
  const player = playerById(state, 0)!;
  const sc = player.statecraft;
  const order = 'weightsAndMeasures' as OrderId;
  if (!sc.orders.includes(order)) sc.orders.push(order);
  sc.slots.push({ card: order, sealedUntil: state.turn });
  return { state, playerId: 0 };
}

// --- the aggregate ----------------------------------------------------------

describe('the aggregate', () => {
  /**
   * **One source, two surfaces.** The ceremony's figure and the Ledger's head
   * are the same function's answer, and that function is band 1's deck slice —
   * so a band that celebrated a number the sheet contradicts is impossible
   * rather than merely unlikely.
   */
  it('is exactly the Ledger’s band-1 deck slice, voice for voice', () => {
    const { state, playerId } = bench();
    const reading = explainLedger(state, playerId);
    const aggregate = foldDeck(state, playerId);
    // Something is the deck's — the bench slots an Order and swears a charter.
    expect(aggregate.figures.length).toBeGreaterThan(0);
    for (const voice of reading) {
      const figure = aggregate.figures.find((entry) => entry.glyph === YIELD_GLYPH[voice.key]);
      expect(figure?.amount ?? 0, voice.key).toBe(voice.byClass.deck);
    }
    // And nothing that pays nothing is printed: a nought on this band would be
    // a voice the deck does not touch, claimed.
    expect(aggregate.figures.every((entry) => entry.amount !== 0)).toBe(true);
  });

  /** It is a standing rate, never an occasion: the band counts, it never thunks. */
  it('carries no occasion, so the band counts rather than thunking', () => {
    const { state, playerId } = bench();
    const aggregate = foldDeck(state, playerId);
    expect(aggregate.occasionFigures).toEqual([]);
    expect(aggregate.knockOn).toEqual([]);
    expect(aggregate.occasion).toBeUndefined();
  });

  /** The user's own words for the line, and a deck with nothing says so. */
  it('writes the line in the ruling’s words, and says “nothing yet” when it is', () => {
    expect(DECK_LABEL).toBe('your cards');
    const { state, playerId } = bench();
    const line = deckCaption(foldDeck(state, playerId));
    expect(line.startsWith('your cards: ')).toBe(true);
    expect(line).not.toContain('[[');
    expect(deckCaption({ figures: [], occasionFigures: [], knockOn: [] })).toBe(
      'your cards: nothing yet',
    );
  });

  /**
   * The Ledger prints it at the head of band 1, from the same call — the other
   * half of ruling 5, and the half a stylesheet change could quietly drop.
   */
  it('stands at the head of the Ledger’s first band', () => {
    const ledger = source('ledgerScreen.ts');
    const band = ledger.slice(ledger.indexOf('function drawThisTurn()'), ledger.indexOf('function drawCurve()'));
    expect(band).toContain('drawDeckLine(');
    const line = ledger.slice(ledger.indexOf('function drawDeckLine('), ledger.indexOf('function drawThisTurn()'));
    expect(line).toContain('foldDeck(state, playerId)');
    // Landed, never played: the ceremony belongs to the moment the law was
    // signed, and this sheet is a place a player comes to read.
    expect(line).toContain('landCardStamp(stamp, reading)');
    expect(line).not.toContain('playCardStamp');
    expect(STYLE).toContain('.ldg-deck {');
  });
});

// --- the reveal -------------------------------------------------------------

describe('the reveal', () => {
  /**
   * The pending mark exists and says **when**, not what. A nought would be a
   * claim about the card; this is a claim about the arrangement.
   */
  it('gives an unconfirmed office a mark of its own', () => {
    const stamp = source('cardStamp.ts');
    expect(stamp).toContain("export const STAMP_PENDING_MARK = '— on Confirm'");
    const writer = stamp.slice(stamp.indexOf('export function pendCardStamp'), stamp.indexOf('export function playCardStamp'));
    // It takes no reading, which is the guarantee: there is no figure in scope.
    expect(writer).toContain('pendCardStamp(stamp: HTMLElement): void');
    expect(writer).not.toContain('StampReading');
    expect(writer).toContain("stamp.dataset.face = 'pending'");
    expect(writer).toContain('parts.figure.replaceChildren()');
    // And the flourish is hidden for the pending face, so an unconfirmed office
    // does not read as a card still on the bench.
    expect(STYLE).toContain(".card-stamp[data-face='pending'] .card-stamp-flourish");
  });

  /**
   * **The draft's own stamp is untouched** — only the *slotting* waits (the
   * ruling's last clause). The offer card still reveals on the pick.
   */
  it('leaves the draft’s per-card stamp alone', () => {
    const offer = source('offerCard.ts');
    expect(offer).toContain('playCardStamp(stampNode, stamp)');
    expect(offer).not.toContain('pendCardStamp');
  });
});

// --- ordered slots ----------------------------------------------------------

describe('the offices are ordered, and the word says which', () => {
  /**
   * **The array index is the position.** `slotLayout` lays a government's spread
   * out grouped by flavour in `SLOT_TYPES` order, so within a flavour the array
   * order *is* the drawn order — which is what makes "the first economic slot"
   * the topmost economic office on the screen and the same office in the sim.
   */
  it('groups every government’s spread by flavour, in the drawn order', () => {
    for (const id of GOVERNMENT_IDS) {
      const layout = slotLayout(id);
      let at = 0;
      for (const type of SLOT_TYPES) {
        while (at < layout.length && layout[at] === type) at++;
      }
      expect(at, `${id} — the spread is not grouped in SLOT_TYPES order`).toBe(layout.length);
    }
  });

  /** And the screen draws that array, by index, with no sort of its own. */
  it('draws the column in array index order', () => {
    const slots = SCREEN.slice(
      SCREEN.indexOf('function drawSlots('),
      SCREEN.indexOf('function drawAggregate('),
    );
    expect(SCREEN).toContain('layout.forEach((type, index) => {');
    expect(slots).not.toContain('.sort(');
  });

  /** The ordinal is counted within the flavour, and the teens are the teens. */
  it('names an office by its rank within its own flavour', () => {
    const layout: SlotType[] = [
      'military',
      'military',
      'economic',
      'economic',
      'economic',
      'wildcard',
    ];
    expect(slotPositionWord(layout, 0)).toBe('1st military');
    expect(slotPositionWord(layout, 1)).toBe('2nd military');
    expect(slotPositionWord(layout, 2)).toBe('1st economic');
    expect(slotPositionWord(layout, 4)).toBe('3rd economic');
    expect(slotPositionWord(layout, 5)).toBe('1st wildcard');
    expect(slotPositionWord(layout, 9)).toBe('');
    const long: SlotType[] = Array.from({ length: 13 }, () => 'wildcard');
    expect(slotPositionWord(long, 10)).toBe('11th wildcard');
    expect(slotPositionWord(long, 12)).toBe('13th wildcard');
  });

  /**
   * **Gated on the reading, not on a constant.** The word appears where a
   * position engine could read it, and batch F is the pass that wrote the first
   * ones — the four chair-readers of `docs/history/orders-pass-3.md` §3. The gate walks
   * this empire's *slotted* Orders and asks the sim's own effect vocabulary, so
   * a fifth chair-reader drafted tomorrow opens the word with no page edit.
   */
  it('prints a position word for exactly the cards that read a chair', () => {
    const { state } = bench();
    const player = playerById(state, 0)!;
    const reads: string[] = [];
    for (const id of ORDER_IDS) {
      player.statecraft.slots = [{ card: id, sealedUntil: 0 }];
      if (deckReadsSlotPosition(player.statecraft)) reads.push(id);
    }
    expect(reads).toEqual([
      'theMusterRolls',
      'theFirstChair',
      'theWildChair',
      'theCompactOfChairs',
    ]);
  });

  it('asks the effects rather than answering false', () => {
    const gate = SCREEN.slice(
      SCREEN.indexOf('export function deckReadsSlotPosition'),
      SCREEN.indexOf('function ordinal('),
    );
    // The walk is over the slotted cards' own effects, through the register of
    // count shapes that read a position — an empty register today, and a
    // `CountKind` list so the compiler refuses a name the union does not have.
    expect(gate).toContain('for (const slot of sc.slots)');
    expect(gate).toContain('orderDef(slot.card).effects');
    expect(gate).toContain('readsSlotPosition(effect)');
    expect(SCREEN).toContain('const POSITION_READING_COUNTS: readonly CountKind[] = []');
    // Batch E5: the count is a `basis` of the one `pays` shape, so the gate asks
    // the pair rather than a kind — and a row that names no count is not one.
    expect(SCREEN).toContain("effect.kind !== 'pays' || effect.basis !== 'count'");
    expect(SCREEN).toContain('return POSITION_READING_COUNTS.includes(effect.count);');
    // Batch A's reader is a modifier, not a count: the gate opens on it by kind.
    expect(SCREEN).toContain("if (effect.kind === 'slotPosition') return true;");
    // And the office line prints it only behind the gate.
    expect(SCREEN).toContain('const positions = deckReadsSlotPosition(sc);');
    expect(SCREEN).toContain('if (positions) {');
    expect(SCREEN).toContain("element('span', 'sc-slot-position', slotPositionWord(layout, index))");
    // Every number in this interface is tabular mono — an ordinal included.
    const rule = STYLE.slice(STYLE.indexOf('.sc-slot-position {'), STYLE.indexOf('.sc-slot-military .sc-slot-type'));
    expect(rule).toContain('font-family: var(--face-num)');
    expect(rule).toContain('font-variant-numeric: tabular-nums');
  });
});

// --- rearranging ------------------------------------------------------------

describe('rearranging is a placement like any other', () => {
  /**
   * The move goes through the staging's two verbs and nothing else, so it is
   * unconfirmed until Confirm signs it as one batch — and the seal's refusal is
   * the reducer's own sentence, which is what keeps a sealed card where it is.
   */
  it('never sends a command of its own', () => {
    const lift = SCREEN.slice(
      SCREEN.indexOf('function lift(id: OrderId)'),
      SCREEN.indexOf('function drop(index: number)'),
    );
    expect(lift).toContain('removeError(');
    expect(lift).toContain('remove(arrangement, index)');
    expect(lift).not.toContain('options.send(');
    // One seam signs anything on this screen, and it is Confirm's.
    expect(source('statecraftScreen.ts').match(/options\.send\(/g) ?? []).toHaveLength(1);
  });
});

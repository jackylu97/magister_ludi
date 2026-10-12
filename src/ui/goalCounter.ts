/**
 * The counter a commission card carries on its face (batch C, ruling (qqqqqq)
 * 15: "a card that counts something shows its count").
 *
 * Plain data in, DOM out, and no simulation import, so the offer card can draw
 * it without crossing its own boundary rule (`offerCard.ts` takes strings and
 * numbers only). `commissionGoal.ts` turns a card into these counters; the
 * card face, the draft hand and the HUD chips all draw them through here, so
 * they cannot disagree about a count.
 *
 * Pips for a small count (two camps), a bar for a larger one (two thousand
 * gold), as the approved mockup draws them. The colour is the card's own deck
 * ink (`--line-ink`), inherited from whatever face the counter sits in.
 */

import { element } from './dom';

/** One part of a goal, as the face prints it. */
export interface GoalCounter {
  /** What is counted, in a few words: "camps cleared". */
  label: string;
  have: number;
  need: number;
}

/** The largest count drawn as pips. Anything above it is drawn as a bar. */
export const MAX_PIPS = 6;

/** "1 / 2", in whole numbers. The figure the face, the chip and the popover share. */
export function counterFigure(counter: GoalCounter): string {
  return `${Math.floor(Math.max(0, counter.have))} / ${counter.need}`;
}

/** How far along a counter is, from 0 to 1. */
export function counterShare(counter: GoalCounter): number {
  if (counter.need <= 0) return 1;
  return Math.min(1, Math.max(0, counter.have / counter.need));
}

/**
 * The counter block: a row of label and figure, then pips or a bar, for each
 * part, and an optional note under them ("Not seated…", "Fulfilled").
 */
export function goalCounterNode(counters: readonly GoalCounter[], note?: string): HTMLElement {
  const block = element('div', 'goal-counter');
  for (const counter of counters) {
    const row = element('div', 'goal-row');
    row.append(element('span', 'goal-label', counter.label));
    row.append(element('span', 'goal-figure', counterFigure(counter)));
    block.append(row);
    if (counter.need <= MAX_PIPS) {
      const pips = element('div', 'goal-pips');
      pips.setAttribute('aria-hidden', 'true');
      const on = Math.min(counter.need, Math.floor(Math.max(0, counter.have)));
      for (let i = 0; i < counter.need; i++) {
        pips.append(element('span', i < on ? 'goal-pip is-on' : 'goal-pip'));
      }
      block.append(pips);
    } else {
      const bar = element('div', 'goal-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = element('i', 'goal-bar-fill');
      fill.style.width = `${Math.round(counterShare(counter) * 100)}%`;
      bar.append(fill);
      block.append(bar);
    }
  }
  if (note !== undefined) block.append(element('p', 'goal-note', note));
  return block;
}

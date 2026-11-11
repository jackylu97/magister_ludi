/**
 * The headings on a technology's hover card (batch W1, `docs/flags.md` item
 * (lllllll)).
 *
 * The user agreed, 2026-11-11, to drop the "… may" headings above abilities
 * ("Workers and settlers may", "Soldiers may", "Your cities may"): since batch
 * TT3 each ability line names its own subject ("Soldiers cross coast and
 * lakes"), so the heading said it twice. Abilities now sit under one heading,
 * "Abilities", which names a kind as "Units" does and names nobody.
 *
 * The card mounts no DOM in this suite, so the claim is asked of `giftHeading`
 * (`techTree.ts`), the one function the card reads its headings from, over
 * every gift of every technology.
 */

import { describe, expect, it } from 'vitest';
import { TECH_IDS } from '../../src/sim/techData';
import { techGifts } from '../../src/sim/techUnlocks';
import { giftHeading } from '../../src/ui/techTree';

const GIFTS = TECH_IDS.flatMap((id) => techGifts(id).map((gift) => ({ id, gift })));

describe('the tech card’s gift headings', () => {
  it('has abilities to ask about, so the sweep is not empty', () => {
    expect(GIFTS.filter(({ gift }) => gift.kind === 'ability').length).toBeGreaterThan(5);
  });

  it('puts every ability under one heading that names nobody', () => {
    for (const { id, gift } of GIFTS) {
      if (gift.kind !== 'ability') continue;
      expect(giftHeading(gift), `${id}: ${gift.name}`).toBe('Abilities');
    }
  });

  it('prints no "… may" heading over an ability, and keeps "Workers may build" over the improvements', () => {
    for (const { id, gift } of GIFTS) {
      const heading = giftHeading(gift);
      if (heading === null) continue;
      if (gift.kind === 'improvement') {
        // An improvement line is the improvement's name and its charges, and
        // names no subject, so the heading still says who builds it.
        expect(heading, `${id}: ${gift.name}`).toBe('Workers may build');
        continue;
      }
      expect(/\bmay\b/.test(heading), `${id}: ${gift.name} under "${heading}"`).toBe(false);
    }
  });
});

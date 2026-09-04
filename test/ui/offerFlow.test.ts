import { describe, expect, it } from 'vitest';

/**
 * The Statecraft offer chain, pinned at the source (the deployed bug of
 * 2026-08-30): a refused pick must say so and must not re-deal the card to a
 * seat whose turn is over — that is the "cannot close the orders menu" loop.
 */
const MAIN = import.meta.glob('../../src/main.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../src/main.ts'] as string;

describe('the statecraft offer chain checks its results', () => {
  it('captures every statecraft pick result and guides on refusal', () => {
    for (const kind of [
      "'chooseOrder'",
      "'adoptGovernment'",
      "'chooseDoctrine'",
      "'chooseDiscovery'",
      "'chooseBelief'",
      "'chooseGreatPerson'",
    ]) {
      const site = MAIN.indexOf(`type: ${kind}`);
      expect(site, kind).toBeGreaterThan(-1);
      const around = MAIN.slice(site - 400, site + 400);
      expect(around, kind).toContain('const result = dispatch(');
      expect(around, kind).toContain('if (!result.ok) controls.guide(');
    }
  });
  it('never re-deals the card to a seat whose turn is over', () => {
    expect(MAIN.match(/if \(!hasEndedTurn\(game\.state, seat\)\) showStatecraftOffer\(\);/g)?.length).toBeGreaterThanOrEqual(2);
    // And no bare chain call survives inside the pick callbacks.
    expect(MAIN).not.toMatch(/statecraft\?\.refresh\(\);\n\s*showStatecraftOffer\(\);/);
  });
});

/**
 * The stamp reaches every tarot-face offer, and reaches it the same way: one
 * adapter spread into the option beside `cardFace`, asked once when the offer
 * opens (`docs/doctrine-ideas.md` Part IV — the design of record).
 */
describe('every offer carries a stamp', () => {
  it('weighs each class of card through the one evaluator', () => {
    for (const subject of [
      "{ kind: 'order', id }",
      "{ kind: 'order', id: upgrade, level: level + 1 }",
      "{ kind: 'government', id }",
      "{ kind: 'doctrine', id }",
      "{ kind: 'belief', id }",
      "{ kind: 'legacy', id }",
    ]) {
      expect(MAIN, subject).toContain(`...cardStamp(seat, ${subject})`);
    }
  });

  /**
   * Asked **once, at the deal**, and off the sim's own evaluator — never
   * composed beside it. A card whose figure moved while the player was reading
   * it would be a different card from the one they were dealt.
   */
  it('reads the figure from explainCardImpact and nowhere else', () => {
    const helper = MAIN.slice(
      MAIN.indexOf('function cardStamp(seat: number'),
      MAIN.indexOf('function governmentEmblem('),
    );
    expect(helper).toContain('stampReading(explainCardImpact(game.state, seat, subject))');
    // Nothing to say is nothing shown: the flourish stands rather than a nought.
    expect(helper).toContain('stampIsEmpty(reading) ? {} : { stamp: reading }');
  });
});

describe('the soft pause lives on the End Turn button (user, 2026-08-30)', () => {
  it('labels the button and opens the waiting thing on click', () => {
    expect(MAIN).toContain("order: 'You have a new Order'");
    expect(MAIN).toContain('PAUSE_LABELS[pause]');
    expect(MAIN).toContain('onStatecraftPause: (kind) =>');
  });
});

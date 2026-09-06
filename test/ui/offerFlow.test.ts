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

const OFFER_CARD = import.meta.glob('../../src/ui/offerCard.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../src/ui/offerCard.ts'] as string;

const STYLE = import.meta.glob('../../src/style.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../src/style.css'] as string;

/** The source of one `function name(` in `main.ts`, up to the next one. */
function offerSource(name: string): string {
  const at = MAIN.indexOf(`function ${name}(`);
  if (at < 0) throw new Error(`main.ts has no function ${name}`);
  const next = MAIN.indexOf('\n  function ', at + 10);
  return MAIN.slice(at, next < 0 ? undefined : next);
}

describe('the statecraft offer chain checks its results', () => {
  it('captures every statecraft pick result and guides on refusal', () => {
    for (const kind of [
      "'chooseOrder'",
      "'skipOrderOffer'",
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
describe('every statecraft offer carries a stamp', () => {
  it('weighs each class of card through the one evaluator', () => {
    for (const subject of [
      "{ kind: 'order', id }",
      "{ kind: 'government', id }",
      "{ kind: 'doctrine', id }",
      "{ kind: 'belief', id }",
    ]) {
      expect(MAIN, subject).toContain(`...cardStamp(seat, ${subject})`);
    }
  });

  /**
   * **And the great-person draft carries none** — the uniformity ruling
   * (`docs/doctrine-ideas.md`, "recruit is a promise", 2026-09-03). It used to:
   * the legacy subject was the sixth line of the list above, and it made the
   * hand ragged in a way that read as a balance statement — a legacy written as
   * flat yields showed a figure and a legacy written as a combat rule showed the
   * flourish, so the first looked like the stronger card. A legacy reaches no
   * ledger until the person is *spent*, turns later, on a verb the player has
   * not chosen yet; the figure is counted at the ceremony
   * (`greatPersonCeremony.ts`) instead, which is when it becomes true.
   *
   * Pinned as an absence because that is the only way an absence stays: the next
   * pass adding a stamp to a new offer will copy the line above, and this is
   * what says the great-person one is not an oversight.
   */
  it('deals every great-person card wearing the flourish, and none wearing a number', () => {
    expect(MAIN).not.toContain("cardStamp(seat, { kind: 'legacy'");
    const site = MAIN.indexOf('function showGreatPersonOffer(');
    expect(site).toBeGreaterThan(-1);
    const card = MAIN.slice(site, MAIN.indexOf('function announceRecruit(', site));
    expect(card).not.toContain('cardStamp(');
    // The words are what sell the name, and they are still all there.
    expect(card).toContain('notes: describeCard(id).map');
    expect(card).toContain('flavor: def.epigram');
    expect(card).toContain('footnote: def.kernel');
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

/**
 * **The reroll prints the next price before the click** (schema 71, ruled
 * 2026-09-06 — `docs/fewer-things.md` §1: *"the button prints the next price so
 * the rise is visible before the click"*).
 *
 * Source-read like the rest of this file: the claim is about where the figure
 * comes from and what the button does with a refusal, and both are one line each
 * in `main.ts` that a future edit could quietly drop.
 */
describe('the reroll button', () => {
  it('takes its figure from the simulation’s own explainer, never composed beside it', () => {
    const control = offerSource('rerollControl');
    expect(control).toContain('explainRerollCost(game.state, seat)');
    expect(control).toContain('price.total');
    // The fold is printed too, line by line, so the rise says where it came from.
    expect(control).toContain('price.lines');
  });

  it('greys the control with the refusal rather than hiding it', () => {
    const control = offerSource('rerollControl');
    expect(control).toContain('rerollError(game.state, seat)');
    expect(control).toContain('disabled: true');
    // And a door that has not opened at all shows no button, not a greyed one —
    // asked as its own question, never read out of a refusal's words.
    expect(control).toContain('if (!rerollDoorOpen(game.state, seat)) return undefined;');
  });

  it('checks the result and re-deals the hand it was given', () => {
    const send = offerSource('rerollOffer');
    expect(send).toContain("type: 'rerollOffer', playerId: seat");
    expect(send).toContain('if (!result.ok) controls.guide(');
    expect(send).toContain('if (!hasEndedTurn(game.state, seat)) again();');
  });

  it('offers the free hand on the votive card and the paid one on the draft', () => {
    expect(MAIN).toContain('rerollOffer(seat, showStatecraftOffer)');
    expect(MAIN).toContain('rerollOffer(seat, showReligionOffer)');
    // The votive card says what it costs, which is nothing.
    expect(MAIN).toContain("label: 'Ask again'");
  });

  it('draws it as a foot control the card component knows about', () => {
    expect(OFFER_CARD).toContain('offer.reroll !== undefined');
    expect(OFFER_CARD).toContain("button.className = 'offer-pass offer-reroll'");
    expect(OFFER_CARD).toContain('button.disabled = offer.reroll.disabled === true');
  });
});

describe('the soft pause lives on the End Turn button (user, 2026-08-30)', () => {
  it('labels the button and opens the waiting thing on click', () => {
    expect(MAIN).toContain("order: 'You have a new Order'");
    expect(MAIN).toContain('PAUSE_LABELS[pause]');
    expect(MAIN).toContain('onStatecraftPause: (kind) =>');
  });
});

/**
 * **Every draft of every card class is dealt as a card** (the ruling of
 * 2026-09-05, `docs/flags.md` playthrough note 10 — the card animations belong
 * on the religion cards too).
 *
 * The tall frame, the backs, the stagger and the turn-over all hang off one
 * flag in `offerCard.ts`: a card with a plate is a card from a deck. So what is
 * pinned here is that each of the four decks hands one over — an Order, a
 * charter and a Doctrine a drawing, a great person the family's drawing, a
 * belief its axis glyph — and that the flag reads both kinds. A class that goes
 * back to dealing a plain face is a draft that no longer turns over, which is
 * exactly the sort of thing that is silently wrong on one screen only.
 */
describe('every draft deals a tarot face', () => {
  it('reads a plate of either kind as a card from a deck', () => {
    const at = OFFER_CARD.indexOf('const tarot = offer.options.some(');
    expect(at).toBeGreaterThan(-1);
    const flag = OFFER_CARD.slice(at, OFFER_CARD.indexOf(';', at));
    expect(flag).toContain('option.emblem !== undefined');
    expect(flag).toContain('option.emblemGlyph !== undefined');
    // And the back rides that same flag, which is what deals the hand face-down.
    expect(OFFER_CARD).toContain('const dealing = tarot && wantsMotion();');
  });

  it('hands the votive deck a plate of its own, and never a Statecraft mark', () => {
    const offer = offerSource('showReligionOffer');
    expect(offer).toContain('emblemGlyph: AXIS_MARK[def.axis].glyph');
    // A belief joins no Statecraft line, so it may not wear one of that deck's
    // seven drawings — the whole reason the glyph plate exists.
    expect(offer).not.toContain('cardLineMarkUrl(');
    // The give-back picker went with Recasting the Omens (2026-09-06): the one
    // rite that asked which god to hand over is withdrawn, so there is no second
    // belief card to keep in the same dress.
    expect(MAIN).not.toContain('showGiveBackPicker');
  });

  it('leaves the other three classes dealing a drawing, as they always have', () => {
    expect(offerSource('showStatecraftOffer')).toContain('...cardFace(orderDef(id))');
    expect(offerSource('showStatecraftOffer')).toContain('...governmentEmblem(id)');
    expect(offerSource('showStatecraftOffer')).toContain('...cardFace(doctrineDef(id))');
    expect(offerSource('showGreatPersonOffer')).toContain(
      'emblem: cardLineMarkUrl(FAMILY_EMBLEM[def.family])',
    );
  });

  it('paints the glyph plate rather than a solid square of accent', () => {
    // The masked plate fills with `currentColor` and shows only what the drawing
    // covers; a plate with no drawing must therefore turn both off, or a belief's
    // card wears a 56px block of ink where its symbol should be.
    const at = STYLE.indexOf('.offer-emblem-glyph {');
    expect(at).toBeGreaterThan(-1);
    const rule = STYLE.slice(at, STYLE.indexOf('}', at));
    expect(rule).toContain('background-color: transparent');
    expect(rule).toContain('mask-image: none');
  });
});

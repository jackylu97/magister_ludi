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
 * opens (`docs/history/doctrine-ideas.md` Part IV — the design of record).
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
   * (`docs/history/doctrine-ideas.md`, "recruit is a promise", 2026-09-03). It used to:
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
 * 2026-09-06 — `docs/history/fewer-things.md` §1: *"the button prints the next price so
 * the rise is visible before the click"*).
 *
 * Source-read like the rest of this file: the claim is about where the figure
 * comes from and what the button does with a refusal, and both are one line each
 * in `main.ts` that a future edit could quietly drop.
 */
describe('the reroll button', () => {
  it('takes its figure from the simulation’s own explainer, never composed beside it', () => {
    const control = offerSource('rerollControl');
    expect(control).toContain('explainRerollCost(game.state, seat, kind)');
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

  /**
   * **One builder for the three paid hands** (ruling q, 2026-09-07): an Order
   * draft, a Doctrine draft and a great-person draft are one ladder, one door and
   * one lifetime count, and the doubling is a line of the same fold. A second
   * builder for the doubled kinds would be a second place that fold is printed,
   * and the one place the two could come to disagree.
   */
  it('prices all three paid hands through the one builder, on the kind it is asked about', () => {
    const control = offerSource('rerollControl');
    expect(control).toContain('kind: RerollKind');
    // It draws nothing for a hand the verb would not answer — `rerollOffer`
    // names no hand, so a control on the wrong card would redeal another one.
    expect(control).toContain('rerollKindFor(player) !== kind');
    for (const site of [
      "rerollControl(seat, 'order')",
      "rerollControl(seat, 'doctrine')",
      "rerollControl(seat, 'greatPerson')",
    ]) {
      expect(MAIN, site).toContain(site);
    }
  });

  it('checks the result and re-deals the hand it was given', () => {
    const send = offerSource('rerollOffer');
    expect(send).toContain("type: 'rerollOffer', playerId: seat");
    expect(send).toContain('if (!result.ok) controls.guide(');
    expect(send).toContain('if (!hasEndedTurn(game.state, seat)) again();');
  });

  it('re-deals each of the four hands onto the card that was showing it', () => {
    expect(MAIN).toContain('rerollOffer(seat, showStatecraftOffer)');
    expect(MAIN).toContain('rerollOffer(seat, showReligionOffer)');
    expect(MAIN).toContain('rerollOffer(seat, showGreatPersonOffer)');
    // The Doctrine card is `showStatecraftOffer`'s third arm, so its redeal
    // re-enters the same function — pinned inside that arm rather than by a
    // count, which would pass on the Order draft's line alone.
    const doctrine = MAIN.slice(MAIN.indexOf('if (sc.pendingDoctrine !== undefined) {'));
    expect(doctrine.slice(0, doctrine.indexOf('function showReligionOffer')))
      .toContain('rerollOffer(seat, showStatecraftOffer)');
  });

  it('offers the free hand on the votive card and the paid one on the draft', () => {
    // The votive card says what it costs: nothing the first time, then the
    // hand's own ladder (`explainBeliefRerollCost`) — never the Order draft's,
    // and never the door (2026-09-06: "the first reroll free and the following
    // ones cost faith… entirely separate from order drafts").
    const votive = offerSource('beliefRerollControl');
    expect(votive).toContain("figure: 'free'");
    expect(votive).toContain('explainBeliefRerollCost(game.state, seat)');
    expect(votive).not.toContain('rerollDoorOpen');
    expect(votive).not.toContain('explainRerollCost(');
    // And it draws nothing while a paid hand is on the table: one verb answers
    // them all and it answers the paid ones first (`rerollKindFor`).
    expect(votive).toContain("rerollKindFor(player) !== 'belief'");
  });

  /**
   * **The two answers are decorated buttons** (the user, 2026-09-07, ruling r —
   * *"meant to be taken sometimes for optimal play"*), not the quiet foot links
   * they were. The house's own `.btn` block, a card wide each, with the figure on
   * the face in tabular mono and the sentence that made it beneath.
   */
  it('draws the two answers as the house’s own button, a card wide', () => {
    expect(OFFER_CARD).toContain('offer.reroll !== undefined || offer.pass !== undefined');
    expect(OFFER_CARD).toContain("button.className = `btn offer-answer ${className}`");
    expect(OFFER_CARD).toContain('button.disabled = spec.disabled === true');
    // The figure is a real line on the face, and it goes through the yield
    // printer like every composed figure that reaches the DOM (`element`).
    expect(OFFER_CARD).toContain("element('span', 'offer-answer-figure', spec.figure)");
    // The refusal answers on hover, which is the whole of the greyed state.
    expect(OFFER_CARD).toContain('button.title = spec.note');
    // A card wide each, off the width the spread dealt the cards at.
    const at = STYLE.indexOf('.offer-answer-cell {');
    expect(at).toBeGreaterThan(-1);
    expect(STYLE.slice(at, STYLE.indexOf('}', at))).toContain('width: var(--offer-card');
    // And the greyed face keeps its ground: `.btn:disabled` would swap it for
    // the table colour and take the price off the sheet.
    const greyed = STYLE.indexOf('.offer-answer:disabled {');
    expect(greyed).toBeGreaterThan(-1);
    expect(STYLE.slice(greyed, STYLE.indexOf('}', greyed))).toContain('background: var(--parchment)');
  });

  /**
   * **The pass prints the bag, not a sentence with a number in it** (ruling r).
   * The pity is `rarityDrawWeight`'s reading asked twice — the weight a rare card
   * carries now, and in the bag the next hand is dealt from — so a retuned
   * `skipPity` moves the button with no edit here.
   */
  it('reads the pity off the simulation’s own bag', () => {
    const figure = offerSource('passFigure');
    expect(figure).toContain("rarityDrawWeight('rare', skips)");
    expect(figure).toContain("rarityDrawWeight('rare', skips + 1)");
    expect(offerSource('passNote')).toContain('leans rarer');
    expect(MAIN).toContain('figure: passFigure(sc.orderSkips)');
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

/**
 * **The pass, at the bottom right and in a player's words** (the user,
 * 2026-09-07: "make the pass button more prominent/decorated and put it in the
 * bottom right … the 'rare 1 -> 2' text isn't informative for a player").
 * The face says the promise, never the bag's weights; the row places the two
 * answers in opposite corners; the pass wears the heavier plate.
 */
describe('the pass at the bottom right', () => {
  const STYLE = (
    import.meta.glob('../../src/style.css', { eager: true, query: '?raw', import: 'default' }) as Record<
      string,
      string
    >
  )['../../src/style.css'];
  const CARD = (
    import.meta.glob('../../src/ui/offerCard.ts', { eager: true, query: '?raw', import: 'default' }) as Record<
      string,
      string
    >
  )['../../src/ui/offerCard.ts'];

  it('says the promise, not the weights', () => {
    const start = MAIN.indexOf('function passFigure(');
    const body = MAIN.slice(start, MAIN.indexOf('\n  }\n', start));
    expect(body).toContain("'See rarer cards next draft'");
    expect(body).toContain("'No rarer cards next draft'");
    expect(body).not.toContain('→');
    // Still the simulation's reading: the knob retuned to nothing prints nothing rarer.
    expect(body).toContain("rarityDrawWeight('rare', skips + 1)");
  });

  it('places the two answers in opposite corners, on one plate, in two colours', () => {
    // Equal emphasis (the user, the same day: "keep the emphasis on the reroll
    // and pass the same — they should be seen as equally important … separate
    // colors for visual distinction"): the decoration is one shared rule, and
    // only the ground differs — vermilion for the spent hand, lapis for the
    // purchase.
    expect(CARD).toContain('`offer-answer-cell ${className}-cell`');
    const answers = STYLE.slice(STYLE.indexOf('.offer-answers {'));
    expect(answers.slice(0, answers.indexOf('}'))).toContain('justify-content: space-between;');
    expect(STYLE).toContain('.offer-answer-pass-cell {\n  margin-left: auto;\n}');
    const plate = STYLE.slice(STYLE.indexOf('.offer-answer-pass,\n.offer-answer-reroll {'));
    const rule = plate.slice(0, plate.indexOf('}'));
    expect(rule).toContain('border-width: 2px;');
    expect(rule).toContain('outline-offset: -5px;');
    expect(STYLE).toContain('.offer-answer-pass {\n  background: var(--vermilion);\n}');
    expect(STYLE).toContain('.offer-answer-reroll {\n  background: var(--lapis);\n}');
  });
});

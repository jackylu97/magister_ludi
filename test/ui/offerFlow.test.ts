import { describe, expect, it } from 'vitest';
import { PAUSE_LABELS } from '../../src/ui/endTurnList';

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
      // `send` rather than a bare `dispatch` since `docs/flags.md` (mmmmmm):
      // the page has one door and it reports every command that leaves through
      // it. The claim here is unchanged — the result is *checked*, and the
      // refusal is the reducer's own sentence on the manicule line.
      expect(around, kind).toContain('const result = send(');
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
    expect(MAIN).toContain("cardStamp(seat, { kind: 'order', id }, sheet)");
    for (const subject of [
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
    // Drawn as the great person card since Quiet Table's build stage 2, whose
    // seat the offer leaves empty.
    expect(card).toContain('dress: () => greatPersonOfferFace(id),');
  });

  /**
   * Asked **once, at the deal**, and off the sim's own evaluator — never
   * composed beside it. A card whose figure moved while the player was reading
   * it would be a different card from the one they were dealt.
   */
  it('reads the figure from explainCardImpact and nowhere else', () => {
    const helper = MAIN.slice(
      MAIN.indexOf('function cardStamp(seat: number'),
      MAIN.indexOf('function slotWords('),
    );
    expect(helper).toContain('stampReading(explainCardImpact(game.state, seat, subject, sheet))');
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
   * **The answers are decorated buttons** (the user, 2026-09-07, ruling r —
   * *"meant to be taken sometimes for optimal play"*), and since Quiet Table's
   * build stage 2 they stand in the sheet's foot as the board draws them: the
   * reroll at the left with its price on its face, Pass and Take at the right.
   */
  it('draws the answers as the house’s own button, in the board’s foot', () => {
    expect(OFFER_CARD).toContain("button.className = `btn offer-answer ${className}`");
    expect(OFFER_CARD).toContain('button.disabled = spec.disabled === true');
    // The reroll's price is a real line on its face, through the yield printer.
    expect(OFFER_CARD).toContain("if (showFigure) button.append(element('span', 'offer-answer-figure', spec.figure));");
    // The fold that made the price, or the refusal, answers on hover; the pass
    // says on hover what it does and leans the next hand to.
    expect(OFFER_CARD).toContain('button.title = showFigure ? spec.note : `${spec.figure}. ${spec.note}`;');
    // The reroll at the left, the pass and the take button at the right.
    expect(OFFER_CARD).toContain("left.append(answer(offer.reroll, 'offer-answer-reroll', REROLL_MARK, true, () => reroll()));");
    expect(OFFER_CARD).toContain("right.append(answer(offer.pass, 'offer-answer-pass', PASS_MARK, false, () => skip()));");
    expect(OFFER_CARD).toContain("takeButton.className = 'btn btn-primary offer-take';");
    expect(OFFER_CARD).toContain("takeButton.addEventListener('click', () => take(chosen));");
    const foot = STYLE.slice(STYLE.indexOf('.offer-foot {'));
    expect(foot.slice(0, foot.indexOf('}'))).toContain('justify-content: space-between;');
    const right = STYLE.slice(STYLE.indexOf('.offer-foot-right {'));
    expect(right.slice(0, right.indexOf('}'))).toContain('margin-left: auto;');
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
    expect(figure).toContain("rarityDrawWeight('rare', skips, rarePercent, base)");
    expect(figure).toContain("rarityDrawWeight('rare', skips + 1, rarePercent, base)");
    expect(offerSource('passNote')).toContain('leans rarer');
    expect(MAIN).toContain('figure: passFigure(game.state, player)');
    expect(figure).toContain('const base = humanOrderRarity(state, player)');
    expect(figure).toContain('const rarePercent = cardRareWeight(state, player.id)');
  });
});

describe('the soft pause lives on the End Turn button (user, 2026-08-30)', () => {
  it('labels the button and opens the waiting thing on click', () => {
    // The label table lives with End Turn's waiting list since batch UX4, so
    // the button and the list read one table.
    expect(PAUSE_LABELS.order).toBe('You have a new Order');
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
 * belief its picture window — and that the flag reads both kinds. A class that goes
 * back to dealing a plain face is a draft that no longer turns over, which is
 * exactly the sort of thing that is silently wrong on one screen only.
 */
describe('every draft deals a tarot face', () => {
  it('reads a plate of either kind as a card from a deck', () => {
    const at = OFFER_CARD.indexOf('const tarot =');
    expect(at).toBeGreaterThan(-1);
    const flag = OFFER_CARD.slice(at, OFFER_CARD.indexOf(';', at));
    expect(flag).toContain('option.emblem !== undefined');
    // The belief offer's picture window is a plate too, so a belief hand is
    // still dealt. The glyph plate it replaced is gone with its last caller.
    expect(flag).toContain('option.picture !== undefined');
    expect(OFFER_CARD).not.toContain('emblemGlyph');
    // A drawn face (Quiet Table, build stage 2) is a third dressing, and is
    // dealt too: the back rides both flags.
    expect(OFFER_CARD).toContain('const dressed = offer.options.some((option) => option.dress !== undefined);');
    expect(OFFER_CARD).toContain('const dealing = (tarot || dressed) && wantsMotion();');
  });

  it('narrows every picture window in a hand that would not fit the screen', () => {
    // A window spans its card's width, so a belief hand can be taller than
    // the spread planned. The fit takes the overflow off every window at once.
    const at = OFFER_CARD.indexOf('function fitPictures(): void {');
    expect(at).toBeGreaterThan(-1);
    const fit = OFFER_CARD.slice(at, OFFER_CARD.indexOf('\n  }\n', at));
    expect(fit).toContain('sheet.scrollHeight - sheet.clientHeight');
    expect(fit).toContain("list.style.setProperty('--offer-picture'");
    // Asked again on a resize, and once the fonts have arrived.
    const resize = OFFER_CARD.slice(
      OFFER_CARD.indexOf('function onResize(): void {'),
      OFFER_CARD.indexOf('function fitPictures(): void {'),
    );
    expect(resize).toContain('fitPictures();');
    expect(OFFER_CARD).toContain('if (drawnFaces.length > 0 || pictured) {');
    // The stylesheet reads the width the fit sets.
    expect(STYLE).toContain('width: var(--offer-picture, 100%);');
  });

  it('hands the votive deck a plate of its own, and never a Statecraft mark', () => {
    const offer = offerSource('showReligionOffer');
    // The plate is the belief's arched window (the user, 2026-11-21): its
    // vignette, or its drawn mark. It replaced the axis glyph.
    expect(offer).toContain('picture: () => beliefWindowNode(id),');
    expect(offer).not.toContain('emblemGlyph:');
    // A belief joins no Statecraft line, so it may not wear one of that deck's
    // seven drawings — the whole reason the glyph plate exists.
    expect(offer).not.toContain('cardLineMarkUrl(');
    // The give-back picker went with Recasting the Omens (2026-09-06): the one
    // rite that asked which god to hand over is withdrawn, so there is no second
    // belief card to keep in the same dress.
    expect(MAIN).not.toContain('showGiveBackPicker');
  });

  it('leaves the other three classes dealing a drawing, as they always have', () => {
    // An Order is dealt as the A3 face since batch C1 (`suitFace.ts`): its
    // suit is its deck's and its ink its type's. `cardFace` reads the archetype
    // thread, and every row written after the decks rework carries none, so it
    // would deal four hundred identical lozenges. The two classes with no deck,
    // a Doctrine and a government, still read the thread.
    // Since Quiet Table's build stage 2 the Order draft draws the Council's
    // engraved face (`orderOfferFace`), a drawn face, which is dealt.
    expect(offerSource('showStatecraftOffer')).toContain('dress: () => orderOfferFace(id),');
    expect(OFFER_CARD).toContain('option.suit !== undefined');
    // A government is offered on its banner since Quiet Table's frame 7, a
    // drawn face, so the charter triple is still dealt; its banners stand one
    // under another.
    expect(offerSource('showStatecraftOffer')).toContain(
      'dress: () => governmentOfferFace(id, chairLayoutUnder(game.state, seat, id)),',
    );
    expect(offerSource('showStatecraftOffer')).toContain('stacked: true,');
    expect(MAIN).not.toContain('function governmentFace(');
    expect(OFFER_CARD).toContain('option.chairs !== undefined');
    // A deck's Doctrine wears its deck's suit and ink (batch C3,
    // `doctrineFaceOf`); a pre-rework Doctrine still reads its thread.
    expect(offerSource('showStatecraftOffer')).toContain('const face = doctrineFaceOf(id);');
    expect(offerSource('showStatecraftOffer')).toContain('? cardFace(doctrineDef(id))');
    expect(offerSource('showGreatPersonOffer')).toContain(
      'emblem: cardLineMarkUrl(FAMILY_EMBLEM[def.family])',
    );
  });

  it('keeps the ordinal on the corner of an emblem card, out of the flow', () => {
    // The user, 2026-11-21: "spacing at the top of the card feels a bit
    // awkward". The rule that lifts a tarot card's children above its ornament
    // also made the ordinal a row of its own above the eyebrow. It stands on
    // the corner again, and the card has one margin all round.
    const at = STYLE.indexOf(".offer-options[data-face='tarot'] .offer-option > .offer-ordinal {");
    expect(at).toBeGreaterThan(-1);
    expect(STYLE.slice(at, STYLE.indexOf('}', at))).toContain('position: absolute;');
    const face = STYLE.indexOf(".offer-options[data-face='tarot'] .offer-option {");
    expect(STYLE.slice(face, STYLE.indexOf('\n}', face))).toContain('padding: calc(16px * var(--offer-scale, 1));');
    expect(STYLE).not.toContain('.offer-emblem-glyph');
  });
});

/**
 * **The pass, in a player's words and beside its twin** (the user, 2026-09-07:
 * "the 'rare 1 -> 2' text isn't informative for a player"; and 2026-09-08, item
 * (ccc): "more center-aligned … their colours also currently feel out of
 * place"). The face says the promise, never the bag's weights.
 *
 * The bottom-right corner and the two poster grounds were the answer for a day
 * and are gone: the row is centred, the two answers are one size, and what tells
 * them apart is a mark and the house's primary/quiet weight. The corner
 * assertions are *replaced* rather than dropped — the same three questions
 * (where the pair sits, how they are told apart, what a greyed one keeps) asked
 * of the arrangement that shipped.
 */
describe('the pass beside its twin', () => {
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
    expect(body).toContain("rarityDrawWeight('rare', skips + 1, rarePercent, base)");
  });

  it('stands the answers in the board’s foot, told apart by mark and place', () => {
    // The reroll at the left, the pass beside the take button at the right
    // (Quiet Table, build stage 2: "Ask again" at the left; Pass and Take at the
    // right, Take the primary, bottom right).
    expect(CARD).not.toContain('offer-answers');
    expect(STYLE).not.toContain('.offer-answers {');
    expect(CARD).toContain("const foot = element('div', 'offer-foot');");
    expect(CARD).toContain('foot.append(left, right);');
    // The mark is the card's own fact, one per answer, hidden from the reading.
    expect(CARD).toContain("const REROLL_MARK = '⟳';");
    expect(CARD).toContain("const PASS_MARK = '⊘';");
    expect(CARD).toContain("mark.setAttribute('aria-hidden', 'true')");
    expect(CARD).toContain("element('span', 'offer-answer-glyph')");
    // No poster colours: the reroll and the pass are the house's plain button,
    // and only the take button is the primary.
    const from = STYLE.indexOf('.offer-answer {');
    const to = STYLE.indexOf('.offer-answer:disabled {');
    const block = STYLE.slice(from, to);
    expect(block).not.toContain('var(--vermilion)');
    expect(block).not.toContain('var(--lapis)');
  });

  it('says what the bank holds beside the reroll, and a refusal in the wanting voice', () => {
    // The board: "Ask again · 56 faith", then "You have 67 faith." A greyed
    // reroll says why there instead, as a lack.
    expect(CARD).toContain("left.append(element('p', greyed ? 'offer-purse wanting' : 'offer-purse', line));");
    expect(MAIN).toContain('purse: `You have ${countFigure(Math.floor(player.faithPool))} faith.`,');
    const at = STYLE.indexOf('.offer-purse {');
    expect(at).toBeGreaterThan(-1);
  });
});

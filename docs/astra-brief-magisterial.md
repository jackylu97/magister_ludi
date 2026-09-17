# Brief for Astra — rebuild the Magisterial deck around the four draws

**Design brief · revised after review, 2026-09-16 · not implemented.** Rewrite the Magisterial section's tier tables in `docs/six-decks-first-cut.md` as a new proposal in the doc's table format. Leave the other five decks, the cross-type table, the generic pool, the governments, live docs and game data untouched. Follow the rules in `docs/astra-brief-expansionist-scientific.md` ("Rules for the eventual rewrite"): lines first, shared cards allowed, plain opening support sparingly, at most one accumulated-income card, two rule-changing cards per tier, one real trade-off per tier, roughly forty cards, respect timing, keep the reading conventions, name new mechanics in brackets, keep prose brief. Charters follow the rule already set there: **"Once drafted, …"**, never seated, never occupying a chair; they count toward the catalogue.

## Why Magisterial is being redone

The rebuilt draft has three real threads — the monumental court, patronage of great people, and civic provinces — and one grid fill wrapped around them: a dozen "culture buildings give +N and +N" rows. Nothing in seventy-odd cards touches drafting, seals, chairs, governments or the great-person draw, which are the deck's whole subject. The user's direction: **this deck values great people, wonders, government lines and culture, plays with the drafting mechanics, and should be thought of as "draft more, gain special abilities"**, while still supplying a real economy and reaching into the other decks' businesses.

## The consumable and the verb

Every other deck plays the map. Magisterial plays the game's four **draws**: the Order draft, the great-person call, the wonder race and the government ladder. Its resource is the **collection**: it drafts more than it can seat, and the surplus pays. Its verb is **shaping the draws**: more to choose from, a free redraw, a shorter seal, an additional chair. Culture must also buy useful things on the map, in competition with obtaining more cards. The aim is flexibility and cultural investment, not reseating the same Orders on a timer.

## Facts to write against

- An Order draft shows three cards plus a pass; passing banks pity; a faith reroll exists and its price resets on adopting a government; the Magisterium government shows one more card on every offer; Ibn Battuta's leader ability gives one free redraw per draft. A newly seated Order is sealed for five turns (an absolute turn on the seat). Chairs come from the government; adopting one rebuilds the seats.
- Great people are called with renown at an escalating price from a shared roster; the draw is weighted by each family's feed share; a called person chooses an act or a work (Academy, Manufactory, Landmark, Customs House, Citadel). **Either expenditure also grants that person's legacy**; leaving a legacy is not a third competing expenditure. The Renaissance Court doctrine shows one more person per offer. The empire's earned people are counted (`greatPeopleOfFamily`).
- A wonder is claimed once for the world; losing the race refunds the front row's hammers in gold. "While producing a wonder" is an existing city predicate.
- Ordinary culture-paid drafts both advance the government ladder and increase the next draft's culture cost. Bonus offers below do neither. Government tiers ride the ordinary draft-count ladder; the current tiers' chair layouts and signatures are being simplified under the decks doc's own proposal. Do not write cards that depend on a particular government's signature.
- The culture meter is the draft currency; border growth is a separate channel. Culture buildings are a data category; the Cathedral is a faith building and the Academy a great-person work — a card may declare that either *counts as* a culture building for the deck's own cards.
- Purchases go through one bank; faith purchases are the precedent for a second currency on a row.
- Multiplayer: nothing that reads another player's consent or changes another empire's decisions; bonuses on shared routes pay both parties.

## Accepted direction and rules

- **Three viable approaches:** a broad collection of Orders; a concentrated court of wonders and great people; or developed cultural provinces that spend culture on infrastructure. Cards can bridge these approaches, but none requires completing all three. Every approach needs common/uncommon support before its rare payoff.
- **The Second Look remains a full free redraw**, rare, a charter, and stacks with Ibn Battuta's ability. The Wider Table and The Constitution remain charters. Once drafted, their privileges need no chair; adoption preserves the Constitution's extra chair on top of the proposed 3/4/6/9 capacities.
- **The Retinue pays for unseated ordinary Orders**, including rares obtained from doctrine drafts. Count distinct owned, seatable cards; exclude charters. This is a capped holding bonus, not an accumulating history counter. The Bonfire of Vanities and The Favoured Family remain cut.
- **Fresh Appointment rewards first use, not repeated rotation.** While active, double another Order's printed additive food, production, gold, science, culture and faith income during the first five turns after that Order was first seated. Conditional and per-tile/per-city income qualifies; percentages, conversions, event windfalls, renown, strength, discounts, unlocks, chairs and rule changes do not. It never amplifies itself. Record each Order's first seating even when Fresh Appointment is inactive; removal, a different chair, government adoption and reseating do not restart or pause the window.
- **A bonus Order offer is a card choice, not a filled culture meter.** It uses the player's current legal pool, age/government gates and normal rarity weights. It spends no culture, advances no government progress, raises no future draft cost and triggers no culture-paid-draft refund. Offer-size and redraw privileges apply. Bonus offers neither use nor build ordinary pass pity; passing declines the reward. Queue simultaneous rewards so one cannot overwrite another. Only completing ordinary culture-paid drafts advances the ladder.
- **One achievement, one reward.** Recruitment means accepting an actual person, not opening/redrawing an offer. Wonder rewards require personal completion, not capture. Cathedral rewards require first production completion of that building type in a city, not purchase, grants, capture or rebuilding. Each requires its card to be active when earned. Keep charters in the legal reward pool, but no reward may generate a further offer merely for drafting, seating or redrawing a card.
- **Court Scribe refunds actual culture spent**, once per paid draft, whether a card is picked or the hand is passed. Bonus offers and redraws pay nothing. Price reductions reduce the refund base.
- **Wonder-building support is finite.** A city can benefit for its first ten turns actually contributing positive production to a particular world wonder. Track those turns even while the card is inactive; queue changes, cancellation, capture and reseating never refresh the city/wonder allowance. No benefit from a later queue entry, zero-production turn or the Magnum Opus. A consolation reward applies only when a rival wins, never for cancelling.
- **Different investments pay different needs.** Culture-to-production supports a principal construction city; provincial institutions support food and administration; patronage or cultural spending supplies science; defending works and wonders supplies military value. Do not make a universal culture-to-everything conversion stack. Conversions exclude conversion outputs and windfalls.
- **The Reforms line stays cut.** Keep a simple seal-reduction card, not a second provincial seal engine. **Festival Levy and its new button are cut for this pass.** If a festival is still needed, trigger it on adopting a new government tier, once per tier, with an explicit duration; it is optional, not another required system.
- **The Living Chronicle is the one accumulated-income card.** Other enduring rewards must be bounded holdings, distinct categories or first achievements, not extra uncapped per-event yield counters. Keep early faith and ordinary opening support; cutting repetitive building bonuses must not leave the deck unable to develop before great-person calls open in age 2.

---

## Six lines, with example cards

All numbers below are proposed tuning values, not tested balance targets. “Keep” retains the concept subject to the rules above.

### 1. The Court of Cards — draft more; what you don't seat still pays

**Loop:** draft → try a useful new Order → keep the strongest court for the situation → the unseated collection pays. Shorter seals make adaptation easier, not compulsory.

- **The Court Scribe** (C, tier 0): Completing a culture-paid draft returns 20% of the culture actually spent. Bonus offers and redraws do not pay. [paid-draft refund]
- **The Fresh Appointment** (C, tier 0): For the first five turns after you first seat another Order, double its printed additive food, production, gold, science, culture and faith income while this card is active. Each Order qualifies once. [first-seating history; amplifier exclusions above]
- **Patience** (C, tier 0): Passing a culture-paid Order offer banks double pity. Bonus offers do not qualify.
- **The Retinue** (U, tier 1): Each distinct unseated Order you hold gives +1 culture and +1 gold, at most +10 of each. Charters do not count. [current collection count]
- **The Wider Table** (charter, U, tier 1): Once drafted, every Order draft shows one more card. [the Magisterium's clause as a card]
- **The Second Look** (charter, R, tier 1): Once drafted, every Order draft may be redrawn once for free. Stacks with Ibn Battuta's redraw. [the reroll seam, at no price]
- **The Chancellor's Seal** (C, tier 1): Seals on newly seated Orders last half as long, rounded up. Existing seals are unchanged.
- **The Constitution** (charter, R, tier 3): Once drafted, one more chair for the rest of the game.
- Candidate trade-off: **The Hungry Court** (U, tier 1): Culture-paid drafts cost 20% less; your cities gain 15% less production while this is seated. [discount versus the means to use your new cards; no new chair-management rule]

### 2. The Patrons — the great-person draw

**Loop:** earn renown → recruit a person and earn a card choice → choose an immediate act or an enduring work → retain the legacy either way. Works and acts remain meaningful alternatives; a legacy is not an extra expenditure trigger.

- **The Court of Names** (C, tier 1): Each distinct family you've recruited this game gives your capital +2 culture and +1 production.
- **The Apprentices** (U, tier 1): The nearest owned city gains +1 of a spent person's family yield, once per distinct family commemorated there; the bonus pays while seated. Scholar: science; artist: culture; merchant: gold; engineer/general: production. [bounded city/family history; five families maximum, not another per-person growing counter]
- **The Second Name** (U, tier 2): Great-person offers show one more card. [the Renaissance Court's clause as a card]
- **The Laureates' Draft** (U, tier 2): Recruiting a great person grants one bonus Order offer. [one reward per accepted person; no ladder progress]
- **The Twice-Told Act** (R, tier 3): Great-person acts grant 50% more science, culture, production or gold. No effect on healing, strength, happiness, duration, radius, works or legacies. [payout amplifier only]
- Keep: Patronage, The Groundskeepers, The Great Exhibition, The Living Canon, The Last Commission.

### 3. The Marvels — the wonder race

**Loop:** start a wonder → the city prospers while it builds → win it and the deck grows; lose it and the culture comes back.

- **The Great Work in Progress** (U, tier 1): During its first ten turns contributing production to each world wonder, a city gains +20% food, gold and culture. [finite city/wonder allowance; no production multiplier or repeatable restart]
- **The Losing Bid** (C, tier 1): When a rival completes your current wonder, receive 1 culture per invested hammer instead of the normal gold refund. No reward for cancellation. [replacement refund; compare the rate against Pageants when balancing]
- **The Marvel's Draft** (U, tier 2): Personally completing a world wonder grants one bonus Order offer.
- **The Second Marvel** (U, tier 2): A city holding a wonder builds its next wonder a quarter faster.
- Keep: The Guild of Masons (the line's trade-off), The Golden Age, The Monumental Court, The Magister's Court. Fold The Wonder-Feasts into Great Work in Progress rather than retaining a second unlimited reward for leaving wonders unfinished.

### 4. The Court's Economy — culture turned into empire

The line that makes the deck a functioning state. Spending culture competes with saving it for the next ordinary draft. Different cards support a principal city, patronage, or provincial development; they should not all reward the same culture total.

- **The Long Borders** (C, tier 0): Borders grow into unclaimed land half again as fast. [the border channel]
- **The Public Commission** (U, tier 1): Eligible ordinary culture buildings may be purchased with banked draft culture, at their quoted gold purchase price. Normal technology and site requirements apply; exclude wonders, empire buildings and great-person works. [culture purchase bank; border culture is not spent]
- **The Chancery** (keep, tier 1): authority from Monuments.
- **The Working Court** (revise, R, tier 1): While your capital produces a building or world wonder, it gains production equal to 25% of its base culture. [a concentrated construction payoff; no conversion inputs or Opus]
- **The Learned Patron** (revise, U, tier 2): Spending a great person grants science equal to two turns of your capital's base culture. Each person pays once. [patronage expenditure, not passive science in every cultural town]
- **The Performers' Treasury** (revise, U, tier 2): Your domestic routes from cities with a Garden and Amphitheater pay you +4 gold and give their destination +2 culture. [a provincial distribution economy, replacing a second generic culture conversion]
- **The Civic Commonwealth** (keep, R, tier 2): three culture buildings, less happiness demanded, less authority.
- **The Provincial Tables** (U, tier 1): Connected noncapital cities with a Garden and Amphitheater gain +4 food and retain 10% more food on natural growth. [ordinary provincial infrastructure; no wonder or rare prerequisite]
- Military support comes from defending works and wonders in Court's Reach, not another culture conversion. The Hungry Court supplies the drafting-versus-production trade-off; retain Guild of Masons and choose further trade-offs that change investments, rather than filling each line with duplicate penalties.

### 5. The Civic Realm — where the culture comes from

The cultural engine itself: culture from growth, founding, provinces, wonders, works and peace, not from buildings sitting there.

- **Festival Commissions** (keep, C, tier 0): natural growth in a Monument town pays culture.
- **The Founding Pageant** (keep, R, tier 0): founding grants a Monument.
- **Provincial Patrons** (keep, C, tier 1): noncapital towns with two culture buildings pay renown and culture.
- **The Wonders' Voice** (C, tier 2): Cities holding a world wonder gain +6 culture, once per city. [no wonders-times-provinces multiplier]
- **The Artists' Landscape** (U, tier 2): Worked Landmarks give adjacent worked tiles +1 culture; a tile benefits from at most one Landmark. [citizen assignments remain necessary]
- **The Provincial Courts** (U, tier 2): Connected noncapital cities with at least two culture buildings gain +2 happiness. If you have at least three such cities, gain +2 authority capacity. [material support for a broad realm; replaces provincial seal reduction]
- Keep the deck's one accumulated-income card here (The Living Chronicle) and cut the other two.
- Cut every plain "culture buildings give +N and +N" row.

### 6. The Court's Reach — one card per neighbour deck

Cross-play in Magisterial's idiom, so the court has a military, a science, a commerce, a faith and a land answer without borrowing another deck.

- Military: **The Ceremonial Army** (keep) — garrisons in wonder cities cost no upkeep; **The Triumphal Column** (U, tier 2): A victory within two hexes of your wonder or great-person work grants culture equal to the loser's strength. [a rider on the kill occasion with a distance predicate]
- Science: **The Academy Court** (C, tier 1): An Academy counts as a culture building for your cards; recruiting a scholar grants 20 culture, once per accepted person.
- Commerce: **The Grand Fairs** (keep); **The Cultural Exchange** (U, tier 2): A route between your wonder city and another player's city pays both players +3 culture.
- Faith: **The Temple of the Muses** (keep); **The Sacred Commission** (U, tier 2): A Cathedral counts as a culture building for your cards; personally producing the first Cathedral in each city grants one bonus Order offer. [history survives rebuilding and ownership changes; purchases and free buildings do not qualify]
- Land: **Garden Cities** (existing cross-type card): farms near Monuments pay culture. Treat this as shared support; do not duplicate its row in the single-type pool or edit the cross-type table in this pass.
- The table: **Cultural Embassies** and **Pageants of Peace** (keep).

### Three ways to build the court

| Approach | Early support and investment | Later payoff and choice |
|---|---|---|
| A broad collection | Culture-paid drafts, Court Scribe, first appointments and Retinue. Normal early faith supports redraws. | Better offer selection and bonus offers let you adapt to the map. Stronger collection income competes with seating another useful Order; Hungry Court trades material output for faster ordinary progression. |
| A monumental centre | Capital development, wonder attempts with finite support, and early renown before calls open. | Spend people on acts or works, collect their legacies, and turn achievements into card choices. Capital construction and patronage rewards supply practical output. A lost race leaves a consolation reward, not a failed whole deck. |
| Cultural provinces | Found towns and develop Gardens, Amphitheaters and connections. Provincial Tables and Patrons support growth and culture without a wonder or particular person. | Provincial Courts and Civic Commonwealth support width; Public Commission spends draft currency on buildings; domestic cultural routes distribute benefits. Saving for cards competes with buying the realm now. |

These approaches may mix. None should require all three charters, a particular great person, or winning multiple wonder races. Retinue and first appointments benefit from achievement offers, but the achievement itself must remain worth pursuing without those cards. More card choices are the goal; “50% more drafts” is a pacing hypothesis to measure, not a promised balance target.

### Cut

The Civic Granaries / Civic Accounts / Civic Stage / Court Archives / Public Gallery / Provincial Chancery / Provincial Stages / National Galleries family (culture buildings paying flats); The Chronicle of Works and The Civic Annals (the two extra growing cards); The Court Stewards, Hearth Ceremonies, The Pageant Fields, The Sculptors' Quarries (tier-0 yields with no line); The Complete Court stays only if a line claims it (The Court's Economy can). Also cut repeatable first-appointment refreshes, provincial seal stacking, indefinite wonder-in-progress bonuses, the wonders-times-cities payout, generic simultaneous culture conversions, and the Festival Levy command.

---

## Systems this draft assumes

**New systems or state:** queued bonus Order offers separated from paid progression; a culture purchase bank and UI quote; first-seating history by owned Order; finite city/wonder support history; bounded city/family apprenticeship history. Charters are already assumed by the broader deck proposal, but drafting privileges and an extra chair are new payloads. These are proposals, not already implemented features.

**Extensions to existing rules:** offer size and redraw allowances; seals written on entry; additive-yield amplification with explicit exclusions; wonder-production eligibility and replacement loss refunds; accepted-person and first-building-completion rewards; existing retained legacies; worked-tile adjacency; collection counts; city connections and border growth. Automatic legacies never count as a second person expenditure. An Academy “counts as” a culture building for presence/type thresholds in its working city, not as several buildings, a purchasable building, or a construction event.

**Not required:** a festival button, card-discard action, a separate legacy choice, extra player-selected branches, or new government signatures. The three proposed charters and every ordinary card remain subject to current availability gates; bonus offers cannot fish from later ages.

## What to hand back

The four Magisterial tier tables in the catalogue's format with a fourth column naming each card's line; approximately forty distinct cards including the three charters; concise card text with bracketed new-shape notes; and the three viable approaches above. Keep the government's 3/4/6/9 baseline, and treat rare doctrine rewards as normal Orders. Update Magisterial's old lifecycle prose when its table is rewritten so it no longer prohibits the approved draft and collection mechanics.

Check early faith, a common/uncommon opening for each approach, age-appropriate buildings, material support for provinces, and a reason to keep culture rather than always spend it. Review the combined power of bonus offers, Retinue, first appointments and redraw charters; verify that reseating, queue changes, rebuilding and simultaneous rewards cannot repeat or erase an earned reward. Mark costs and magnitudes as proposals pending balance testing. Leave the other five decks and live game unchanged.

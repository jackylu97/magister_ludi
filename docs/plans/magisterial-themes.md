# Magisterial: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-23. Nothing here is built. The deck sheet (`docs/decks/magisterial.md`), the data and the code are unchanged. This is the Magisterial deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"), done in the same way as the Scientific, Dominion, Expansionist and Commerce passes (`docs/plans/scientific-themes.md`, `dominion-themes.md`, `expansionist-themes.md`, `commerce-themes.md`). It replaces the five builds of `docs/plans/magisterial-builds.md` (2026-10-17); that file's map of materials still holds, and it is refreshed here. The review list is `docs/plans/magisterial-list-proposed.md`. Facts were checked against the code and data at commit `48f37cf8`.

Your request, 2026-10-23, verbatim:

> *"begin doing a pass on both devotion and magisterial"*

The direction for every pass, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

Your picture of the deck, 2026-10-20, verbatim (`docs/decks/deck-design.md`, "Direction, 2026-10-20"):

> *"magisterial: this focus is on being adaptable to the draft, i.e. being the best magister. historically, this is the faction that gains from strong governance and having the right social institutions to meet the challenges of the time (athenian democracy, the roman republic, the grand vizier). Your description here is more spot on, this player focuses on playing around the draft, the patronage of great people, erecting great monuments, gaining a culture engine. I think both the scientific and magisterial decks can have bonuses towards wonders (the scientific player gets earlier access to technologies, the magisterial player gets bonuses from having them, both gain production towards them). Like the scientific player, gains bonuses from great people works, but should have a separate system of gaining bonuses from them (magisterial: adjacent great works gain X bonus, cities with a great work gain X, the effects of great people are doubled. scientific: a great work adjacent to an academy gain X, all great works gain X science, academies gain X yields, gain X from each academy in your land)."*

The table of 2026-10-20 says Magisterial is paid for governance (drafts, governments, great people), is strongest when its combinations come together, and gives up depth: it depends on what the draft offers. Two rulings of that day shape this pass most:
- **Magisterial owns the government system:** chairs, Doctrines, adoption and re-seating (ruling 4: *"magisterial should own the government system."*).
- **Wonders left Expansionist:** Magisterial gets bonuses for holding them, Scientific gets earlier access, and both get production toward them (ruling 3).

The pass also follows your taste from the four passes before it:
- early cards help a seat develop its towns, and do not wait on a mechanic that opens later (the Commerce revision, 2026-10-21);
- no two cards with the same job; simple, short text;
- commissions give a mix of institutions and one-time rewards (Commerce, 2026-10-23);
- rule-breakers that bend one core rule, and a weaker version when one is too strong (you cut Safe Conduct and halved The Commenda);
- late pay as a percentage; cut what is not impactful, too strong or "win more";
- no new player input: no new button, menu, choice or target.

It does not write Doctrines (Magisterial has none yet).

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Boons and charters take no chair. Magisterial makes the most culture, so it usually reaches each rung first.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **The hand that opens each tier costs** about 38 culture (draft 4), 182 (draft 10), 606 (draft 18) and 1,300 (draft 26) (`draftCost`, 12 + 5n + n^2.2).
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). A *capstone* breaks a rule or doubles a category. *Engine glue* raises or spends the engine itself. A *bridge* serves two themes.
- **Status:**
  - *kept*: on the sheet, unchanged in shape (a number or a word may move, and the row says so);
  - *trimmed*: on the sheet; one clause goes;
  - *reworked*: on the sheet, changed by this pass;
  - *moved*: to another tier;
  - *new*: not on the sheet. "(10-17)" marks a card from the superseded builds pass;
  - *cut*: on the sheet; it leaves the deck, and any data row retires.
- **Shape:** *existing*, *near existing* (one small field), *new shape* (section 7), or *feature G* (section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4). A card that acts on other cards or on the draft is Wildcard, and a Wildcard card fits only a Wildcard chair.
- **"Seated"** means in a chair. A card "you hold" is in your collection, seated or not.
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Magisterial plays the draft and governs. It makes the most culture, so it drafts the most, reaches each government first, and fills the chairs with the right cards for the time. Around that council it calls great people of every family, lays their works on the land in patterns, and raises the world's wonders. Every theme feeds the draft, and the draft brings the next combination.
- It is paid for governance: drafts, governments, great people. It is strongest when its combinations come together. It gives up depth: each theme is thin on its own, and a seat that the draft does not serve plays a pile of modest cards.
- It is the deck that is flexible in which cards it holds (the split of 2026-10-20). Its council grows with every government, its collection pays outside the chairs, and its capstones bend the council's own rules.

### The engine

- **Culture and the draft.** The deck makes culture in bulk and spends it on drafts. Each draft is a card, a step up the ladder toward the next government, and a moment that several cards pay on. Section 3 has the details.

### What changes from the builds

- The pass of 2026-10-17 had five builds: the Salon (rerolls and passes), the Cabinet (the collection and boons), the Patrons (great people), the Marvels (wonders) and the Landscape (works on the land). Each was one loop on one quantity.
- **The Salon and the Cabinet become the engine.** The draft is the deck's currency and its way to spend it, not a theme from one area of the game. Their cards are engine glue, and the pass keeps the best of them: one reroll card, two pass cards, the collection readers and four boons.
- **The government system is a new theme, the council.** Ruling 4 gave it to Magisterial. Its cards read the chairs, their types and the Doctrines, and pay food, strength, authority and production.
- **The Patrons, the Marvels (now the monuments) and the Landscape stay as themes,** with the splits of 2026-10-20: Magisterial is paid for holding wonders and for works side by side, in towns with a work, and for doubled great-person effects.
- **Rerolls go to the Devotion pair.** Faith pays for a reroll, and Devotion's The Penitents' Roll already pays for rerolls while seated, the same job as The Critics' Circle. Magisterial keeps The Second Reading, the free reroll.
- **No new player actions.** The 10-17 pass had five "draft privileges as charters" and four cards that spend culture as a bank. Most add a new action (pay culture into renown, raise a Landmark for culture, pay gold into the draft pool, keep a card from a passed hand). One culture bank stays: Magnificence buys a wonder through the existing purchase.
- **Early cards build towns.** Tier 0 now pays food and production from the council and from Monuments, speeds the first wonders, and claims land with culture buildings.

### Materials

"Self-producing" means a Magisterial game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Culture and the draft pool | Yes; this deck makes the most | `Player.culturePool` is the draft pool; `draftCost`; border culture (`City.culture`) is a separate channel | engine |
| Drafts and passes | Yes: a draft every 7 or 8 turns, about 25 a game for bots; a pass is a choice | `settleDraft`; `settleOrderSkip` pays the `draftPassed` moment; `freeDraft` opens a free hand (The New Code) | engine |
| Rerolls | Partly: faith, from Chronology (The Long Count), or free with the `rerollOffers` rule | `settleReroll`: 35 faith, ×1.35 for each reroll under this government, ×1.6 in age 3 and ×2.2 in age 4; zeroed on adoption; `SlottedOrder.rerollsSeen` | engine (Devotion pair) |
| The collection | Yes: a drafted card never leaves (ruling (qqqqqq) 9) | `PlayerStatecraft.orders`; counts `slottedOrders`, `unslottedOrders`, `chartersDrafted` | engine |
| Culture buildings | Yes, one of each kind a town | Monument (age 1); Amphitheater, Stele of Laws, Garden, Heroic Epic (age 2); Baths, Forum (age 3); `buildingsOfCategory` culture | engine |
| Chairs and their types | From the government | `slotTypesOf`, `chairCount`; counts `slottedOrders` and `slottedOrdersOfSlot` (by card type); `slotPosition` (the card in one chair); `wildcardChairs` (a commission's lasting chair, `chairsWon`); `slotRider` | council |
| Governments and adoption | At most four times a game: tiers 4, 10, 18 and 26, three governments each | `adoptGovernmentAt`, `reseatCouncil`; the offer is banked until claimed; the `governmentAdopted` occasion reaches Triumphs only | council |
| Doctrines | One for each adoption | `drawDoctrineOffer`; `offerRider` with `offer: 'doctrine'` widens the offer; no count reads Doctrines held | council |
| Renown and great people | Yes: wonders and culture buildings pay renown | ladder 75 · 301 · 531 · 771 · 1,023 · 1,290; bots call 2 or 3 by turn 100 and 5 or 6 by turn 150; moments `greatPersonGained`, `greatPersonAct`; counts `greatPeopleGained`, `legacyFamilies`; tally `greatPersonSpent`; `effectAmplifier` on `greatPersonAct` | patrons |
| Great-person works | With great people: Landmark, Academy, Manufactory, Customs House, Citadel, Holy Site | tile test `greatWork`; scopes `workingGreatWork`, `adjacentGreatWork`; counts `tilesInBorders`, `distinctWorkedGreatWorks`; citadels and holy sites already claim the hexes beside them | landscape |
| Borders | Yes, by border culture | `settleBorderWindfall`; rule `borderCulture` | landscape |
| Wonders | With production; races can be lost | 27 world wonders, 8 of them in age 1 at 130 to 223 hammers, each paying renown; counts `wonders`, `worldWonders`; scopes `hasWonder`, `notHasWonder`; the `completion` moment with `wonder`; a lost race refunds 1 gold a hammer on the front row | monuments |
| The Magnum Opus | In age 4 | scope `raisingOpus`; `productionBonus` on the Opus | monuments, engine |

**Moments.** A card can pay on a pass, a great person gained, a great person's act, a wonder completed and a commission met. Commerce batch T7 adds a card drafted (for the shared The Art Dealers), and Magisterial's draft cards read it. No card can read an adoption, a reroll or a seating. This pass proposes one moment, a government adopted (feature G, section 6).

### What a Magisterial player wants in each age

- **Age 1 (Tier 0): culture, Monuments and the first wonder.** Raise a Monument in each town (Master Masons, Civic Granaries), start an age-1 wonder (The Cornerstone), fill the three chairs (The Prytaneion), and draft often. Claim land as the Monuments go up (The Markstones). Find faith for a pantheon (The Temple of the Muses).
- **Late age 1 and age 2 (Tier I): the first government.** Adopt a tier-4 government and take the first Doctrine. Lay the council out by type (The Nomarchs, The Polemarch). Call the first great person and lay the first work (The Laureate, The Landmark Bounds). Raise the second wonder (The Guild of Masons, The Unveiling). Hold ten cards for a sixth chair (The Roll of the Senate).
- **Late age 2 and age 3 (Tier II): the specialised council.** Each tier-10 government lacks one chair type (the Republic has no Military chair, the Theocracy no Economic chair, Tyranny no Civic chair), so the right government matters (The Grand Vizier, The Prefects). Bank the adoption until The Sed Festival is seated. Lay works side by side (The Quarter of Masters). The wonders of age 3 pay as percentages (The Seven Sights).
- **Age 4 (Tiers III and IV): the full court.** Eight and then eleven chairs, and the capstones that bend the council, the great people, the works and the wonders. Pour wonders, works and great people into the Opus (The Magister's Court, The Universal Library, The Last Commission), and guard its town (The Bulwark of Marvels).

### The areas it reaches

All five:
- **the army:** the council's Military chairs (The Polemarch reads every Military card seated, the partner's included), and guards for what it builds (The Ceremonial Guard, The Custodians, The Bulwark of Marvels); the shared The Sword of State;
- **the land:** culture buildings and works that claim hexes (The Markstones, The Landmark Bounds), works in patterns (The Quarter of Masters, The Paradise Garden, The Processional Way), and late pressure on a rival's border (The Pull of the Masters);
- **the economy:** food and production from the council (The Prytaneion, The Prefects, The Privy Council), production from great people and drafts (The Overseers of Works, The Accessions Register), conversion (The Working Court), and wonder towns (The Wonder Commonwealth);
- **civic life:** the government system itself (chairs, Doctrines, adoption), authority (The Nomarchs) and happiness (The Keepers of Wonders, The Senate Charter);
- **great people and wonders:** the patrons and the monuments.

### Its cost

Magisterial gives up depth. The cards show it:
- **Each theme is thin:** 13 or 14 cards, and its capstone needs the theme's other cards to pay. A seat that the draft does not serve plays modest cards (section 9).
- **The council's readers saturate.** A government has a fixed number of chairs, so The Prytaneion, The Nomarchs and The Boule grow only when the government grows, or when the deck wins a chair (The Roll of the Senate, The Wonder of the Age).
- **The chair types bind.** The Grand Vizier pays nothing under the Theocracy (no Economic chair), and The Polemarch counts only Military cards. The Golden Bull asks for a council in order, and The Mixed Constitution is the rare way out.
- **The Wildcard chair is scarce.** Until tier 18 a government has one. The commissions, the chair doubler, the draft rules and the free-hand cards all want it.
- **Great people and wonders come slowly, and races are lost.** The first great person comes at about turn 30 to 60. The Envious Eye softens a lost race; it does not win it.
- **Culture has a second use.** Magnificence buys a wonder with the culture that would buy the next draft.
- **Boons pay once.** Seated, a boon does nothing.

### Pairs

- **Dominion, the triumph** (Emperor Taizong). Dominion gives great generals and citadels (works for the landscape), captured towns with their works and wonders (Looted Art, The New Code), Military cards for the chairs (The Polemarch counts them), and A Victor's Peace's chair. Magisterial gives a council that pays per seated card (the War Chief pays science and culture per seated card on every kill), boons (The Sword of State) and production. Shared: The Sword of State (I), Examinations of State (II), Looted Art (II), The New Code (III). Best with the council and the landscape.
- **Expansionist, shaping territory** (no leader). Expansionist gives room for works, tended hexes (a side of The Paradise Garden), engineers and their Manufactories, and big towns. Magisterial gives culture and land through works, and The Pyramid Builders' job, which moved here with the wonders (The Cornerstone). Shared: Garden Cities (I), Garden Provinces (II), The Sculpted Landscape (III). Best with the landscape and the monuments.
- **Commerce, the art market** (Zheng He). Commerce gives gold for draft actions (The Brokers' Redraw), merchants and customs houses (works), and foreign routes (Travelling Players, The Cosmopolitan Court). Magisterial gives drafts that pay gold (The Art Dealers), Economic chairs for Commerce's Economic cards (The Grand Vizier, The Prefects, the Merchant League), and wonders bought with culture beside Commerce's The Gilded Scaffold, which buys them with gold. Shared: The Art Dealers (I), Travelling Players (II), The Brokers' Redraw (II), The Cosmopolitan Court (III). Best with the council and the engine.
- **Devotion, the cathedral** (Akhenaten, Hildegard of Bingen). Devotion gives faith for rerolls (The Penitents' Roll pays for them), holy sites (works that claim land), and wonders: holy-site towns build them faster (Sacred Commissions, Akhenaten) and faith buys a half-built one (The Pious Masons). Magisterial gives wonders, culture, and Civic chairs (the Theocracy, Divine Mandate, the Curia) for Devotion's Civic cards. Shared: Sacred Commissions (I), Sacred Patronage (III, deferred), The Rising Nave (III). Best with the monuments and the engine.
- **Scientific, the academy** (Hypatia). Scientific gives charters (each is a draft that The Court Painter and The Accessions Register pay on, and an unseated card for The Encyclopedia), scholars and Academies (works), and wonders raised first (The Great Designs). Magisterial gives more drafts, so more charters seen, and pay for holding the wonders Scientific raises early. Shared: Illuminated Treatises (0), The House of Wisdom (III). Best with the patrons, the landscape and the monuments.

### Leaders

- **Hypatia** (Scientific, Magisterial) leads the patrons and the landscape: +25% renown, and a work pays half again. Her cards: The Court Painter, The Overseers of Works, The Symposium, Letters Patent, The Laureate, The Quarter of Masters, The Universal Genius, The Divine Proportion.
- **Akhenaten** (Devotion, Magisterial) leads the monuments: holy-site towns build wonders 20% faster. His cards: The Cornerstone, The Guild of Masons, The Unveiling, The Golden Age, Magnificence. The Sed Festival, Egypt's festival of a renewed reign, suits him too.
- **Hildegard of Bingen** (Devotion, Magisterial) leads the engine: rite towns +20% culture, faith buildings +2 culture and +2 production. Her culture pays The Working Court and The Learned Patron.
- **Emperor Taizong** (Dominion, Magisterial) colours the council: melee strength, and garrisoned towns pay happiness and culture. The Polemarch reads his Military cards.
- **Zheng He** (Commerce, Magisterial) colours the pair: ships, and coastal routes pay gold and culture. His cards are the shared Travelling Players and The Cosmopolitan Court.
- **Ibn Battuta** (every deck) leads the council for any seat: one more chair in every government, and the first redraw of every hand is free (the rule The Second Reading uses).
- **The gap:** no Magisterial leader points at the council. A leader of a Republic or a Divan would. Leaders are tuned later.

## 3. The engine: culture and the draft

### How the engine works

- **Every theme makes culture or a draft.** Culture buildings make culture (The Repertory). The council's chairs pay science and culture (The Boule). Great people deal free hands (The Symposium). Wonders deal free hands (The Unveiling) and wider hands (The Hall of Wonders). Works and wonders pay culture of their own.
- **Culture buys drafts, and drafts bring governments.** A government comes with the draft count, so a seat that drafts more adopts each government sooner, and its council grows sooner. The Open Door makes each hand cheaper.
- **The draft has three verbs, and each has cards:**
  - **draft:** The Court Painter (renown), The Accessions Register (production) and the shared The Art Dealers (gold) pay on each card drafted. Boons pay once when drafted and then sit in the collection;
  - **pass:** The Unwritten Chapter pays science for a passed hand, and The Second Sitting deals a free hand after a paid pass;
  - **reroll:** The Second Reading makes the first reroll of each hand free. Devotion pays for the rest.
- **The collection pays outside the chairs.** The Encyclopedia pays for unseated cards, The Universal Library and The Polymath's Study for every card held. Boons and charters fill the collection without taking a chair.
- **Conversion turns culture into the gaps:** production (The Working Court) and science (The Learned Patron).

### Engine glue

| Card | Tier | Rarity | Job | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Civic Granaries | 0 | common | widen (Monuments build towns) | Monuments give +1 food and +1 production. | food, production | Economic | kept (the sheet's revision: the data pays +2 of each); existing |
| Master Masons | 0 | common | supply (culture buildings) | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. | production | Economic | kept; existing |
| The Temple of the Muses | 0 | common | widen (faith); the early faith | Culture buildings give +2 faith each. | faith | Civic | kept; existing |
| The Repertory | 0 | common | supply (culture) | Culture buildings give +1 culture each. | culture | Civic | kept; existing (`pays` by `buildingsOfCategory`) |
| Gifts at Court | 0 | common | act (boon) | On draft: your capital gains 40 production. Seated, this card does nothing. | production | Economic | kept; new shape (on-draft boons, section 7) |
| The Second Reading | 0 | uncommon | supply (rerolls) | The first reroll of each hand is free. | rerolls | Wildcard | kept (rarity was common; reworded to the built rule's reach); existing (`rule: 'rerollOffers'`, the Rihla's rule, which also opens rerolls before Chronology) |
| The Open Door | I | uncommon | supply (drafts) | Order hands cost 15% less culture. | drafts | Wildcard | kept (10% to 15%, 10-17); new shape (a discount on the draft's price) |
| The Working Court | I | rare | widen (culture into production) | Cities with a Monument gain production equal to 30% of their base culture, excluding conversion outputs. | production | Economic | kept; existing |
| The Encyclopedia | I | common | widen (the collection) | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | science, culture | Civic | moved from Tier II (10-17); existing (`unslottedOrders`) |
| The Accessions Register | II | uncommon | widen (drafts pay production); scaler | Each card you draft grants your capital production equal to half the culture its hand cost. | production | Economic | reworked (was 20 culture and 20 production for each card drafted; type was Civic); moved from Tier I; new shape (the hand's cost on the draft moment) |
| The Learned Patron | II | uncommon | widen (culture into science) | Cities with at least two culture buildings gain science equal to 15% of their base culture, at most +18 science per city. Conversion outputs are excluded. | science | Civic | kept; existing |
| The Unwritten Chapter | II | common | act (the pass) | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. | science | Civic | moved from Tier I; near existing (`draftPassed` rider; the hand's cost is new) |
| Officials by Merit | III | rare | multiply (more choice, no rerolls) | Order hands deal two extra cards. You cannot reroll Order hands. | choice | Wildcard | kept; near existing (`offerRider`; a rule that refuses the reroll is new) |
| The Second Sitting | III | rare | capstone (rule-breaker) | Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once. | a hand | Wildcard | new (10-17); near existing (`draftPassed` rider with `freeDraft`; the test that the hand cost culture is new) |
| The Cabinet of Curiosities | III | rare | act (boon) | On draft: add a random card of your tier from a deck you do not hold to your collection. Seated, this card does nothing. | a card | Wildcard | reworded (was "chosen from the cards the game rates most helpful to you"); new shape |
| The Universal Library | IV | rare | finisher (the Opus) | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. | production toward the Opus | Economic | kept; near existing (a count of Orders held) |
| The Polymath's Study | IV | rare | multiply (breadth) | Your towns gain +8% science and production for each different deck among the cards you hold, at most +40%. | science, production | Civic | shortened (the two counting rules move to a reading); new shape (a count of decks held) |
| The Grand Retrospective | IV | rare | act (boon) | On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing. | culture, science, production | Civic | kept; new shape (a boon read from three counts) |

- **Glue is 18 of 72 seatable cards (25%),** the skill's starting target.
- **The Second Reading** uses the rule the Rihla already uses, so it reaches every hand that rerolls: an Order hand, a Doctrine offer and a great-person draft. The sheet's text said the reroll "costs no faith"; the built rule makes it free in either bank. It opens rerolls before Chronology too. Rarity rises to uncommon, because a free reroll on every hand is worth a chair all game.
- **The Accessions Register** pays from the hand's own price, so it grows with the game: about 90 to 300 production a draft in Tier II (13 to 43 a turn), 300 to 650 in Tier III and more in Tier IV. At Tier I it would have paid 20 to 60 a draft, too little for its tier, so it moves to Tier II. A free hand cost nothing and pays nothing. The museum's register of new accessions is the model.
- **The Unwritten Chapter** moves to Tier II for the same reason: a hand there costs 182 to 606 culture, so a pass pays 90 to 300 science.
- **Capstone: The Second Sitting.** Today a pass gives up the hand's card. With this card a paid pass deals a free hand at once, so passing costs nothing but time. With The Unwritten Chapter, a weak paid hand becomes a lump of science and a second look. The free hand is not counted on the ladder, as The New Code's is not, and passing a free hand deals nothing more.
- **Officials by Merit** trades the reroll for two more cards in every hand: the imperial examinations, which chose officials from a wide field. A hand holds at most five cards (`rules.offers.max`).
- **The Cabinet of Curiosities** no longer asks the bot's appraisal which card is "most helpful". The sim may not read the bot. It deals a random card of the seat's tier from a deck the seat does not hold. That card counts as drafted (ruling (qqqqqq) 8): its own boon fires, a charter grants, and the draft cards pay.
- **The Polymath's Study's reading:** common cards count as one deck, and a shared card counts for both its decks. A seat's own hands reach three decks (its two and the common cards), so +24%. The Cabinet of Curiosities and Scientific's charters add more.

## 4. The themes

### 4.1 The council

**The fantasy:** the Athenian council and its town hall, the Roman Senate and its magistrates, the Grand Vizier and the Ottoman Divan, the Golden Bull that set how an emperor was chosen. A realm that changes its government when the times change, and always has the right people in the right chairs. **The quantity:** the cards seated, their types, the Doctrines held, and the moment a government is adopted. Every seat fills its chairs, so the readers have a high floor; the deck pushes them with more chairs and the right types. **Areas:** civic life (the government, authority, happiness), the economy (food and production), the army (the Military chairs).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Prytaneion | 0 | uncommon | widen (the council feeds the towns); scaler | Each town gains +1 food for every two cards you have seated. | food | Economic | new; existing (`pays` by `slottedOrders`, `per: 2`, in each town) |
| The Polemarch | 0 | common | widen (the army) | Your units gain +2 strength for each Military card you have seated. | strength | Military | new; existing (the retired The War Council's `combatLine`, scaled by `slottedOrdersOfSlot`) |
| The Nomarchs | I | uncommon | widen (authority); scaler | +1 authority for every two cards you have seated. | authority | Civic | new; existing (The Market Writ's `pays` to authority, by `slottedOrders`) |
| Commission: The Roll of the Senate | I | uncommon | act (commission); supply (a chair) | Commission. Hold ten Orders. Then, for the rest of the game, you have one more Wildcard chair. The card leaves its chair. | a chair | Wildcard | new; near existing (`wildcardChairs` exists; a goal figure of Orders held is new) |
| The Grand Vizier | II | rare | multiply (one chair) | The card in your first Economic chair pays its yields twice. | that card's yields | Wildcard | new; existing (`slotPosition`, `slot: 'economic'`, `factor: 2`) |
| The Senate Charter | II | uncommon | widen (a hall that reads the council) | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +30% production toward buildings. | happiness, production | Civic | kept; existing (the Assembly Hall pays science and culture for each Wildcard card seated) |
| The Prefects | II | uncommon | multiply (Economic cards) | +5% production for each Economic card you have seated. | production | Economic | new; existing (`pays` by `slottedOrdersOfSlot`, as a percentage) |
| The Sed Festival | II | rare | act (adoption) | Each time you adopt a government, gain a free great-person draft. | a great person | Civic | new; feature G |
| The Mixed Constitution | III | rare | capstone (rule-breaker) | Your cards fit any chair. | the council | Wildcard | new; new shape |
| The Pandects | III | uncommon | multiply (Doctrines) | +5% science and production for each Doctrine you hold. | science, production | Civic | new; new shape (a count of Doctrines held) |
| Commission: The Golden Bull | III | uncommon | act (commission); supply (a Doctrine) | Commission. Have every Military, Economic and Civic chair hold a card of its own type. Then you are offered a Doctrine of your government's tier. The card leaves its chair. | a Doctrine | Wildcard | new; new shape (a goal figure, and a Doctrine offer as a reward) |
| The Boule | III | uncommon | multiply (the whole council); scaler | +2% science and culture for each card you have seated. | science, culture | Civic | new; existing (`pays` by `slottedOrders`, as a percentage) |
| The Privy Council | IV | rare | finisher (multiply) | Each of your cards that pays production pays +1 more production wherever it pays it. | production | Wildcard | new; existing (`cardYieldAmplifier`, `yield: 'production'`, `amount: 1`) |

**What the deck does with the government system.** Ruling 4 gives Magisterial the chairs, the Doctrines, adoption and re-seating. This theme uses each, and changes none of them for anyone else:
- **Chairs:**
  - the number seated pays every turn (The Prytaneion's food, The Nomarchs' authority, The Boule's science and culture), so the council's cards grow from 3 chairs to 11;
  - the types seated pay (The Polemarch for Military cards, The Prefects for Economic cards; the Senate Charter's Assembly Hall already pays for Wildcard cards);
  - one chair pays twice (The Grand Vizier), so it matters which card sits first among the Economic chairs;
  - the deck wins chairs for good (The Roll of the Senate here, The Wonder of the Age in the monuments; Dominion's A Victor's Peace is the one chair from outside);
  - the capstone lets every card fit any chair (The Mixed Constitution).
- **Doctrines:** a council in order earns a second Doctrine of its tier (The Golden Bull), and the Doctrines held pay (The Pandects). Wider Doctrine offers (`offerRider` with `offer: 'doctrine'`) are not taken: an offer comes at most four times a game, and the card would hold a chair for nothing in between.
- **Adoption:** a government adopted becomes a moment (feature G), and The Sed Festival pays a great person on it. Adoption is bankable, so a seat can hold the tier-10 offer until it has seated The Sed Festival.
- **Re-seating:** the existing rule keeps every card that still fits its chair and lifts every seal. The Mixed Constitution makes it lossless: no card is ever returned to the collection. The Golden Bull rewards re-laying the council by type after an adoption. The Grand Vizier makes the first Economic chair a decision at every adoption.
- **What needs a new shape:** the adoption moment, cards that fit any chair (for the holder only), a count of Doctrines held, two goal figures and a Doctrine offer as a reward. Everything else on the chairs exists today.
- **What the pass does not change:** the chair mixes, the signatures, when governments come, the Doctrine offer's rules and the seal. No card here needs a change to the system itself, so no question is raised about one. The Mixed Constitution bends the chair rule for its holder only, as Bought Swords bent the one-unit-a-turn rule for Commerce; question 4 asks you to confirm that reading.

Notes:
- **The Prytaneion** was the town hall of a Greek city, where the council's executive ate at the common hearth. Three chairs give each town +1 food at turn 30 (three towns: +3, a band 0 regular card); five chairs give +2 a town (six towns: +12 at turn 72); eight give +4 (nine towns: +36 at turn 133); eleven give +5 (twelve towns: +60). It is a Tier 0 opener that keeps paying, because the council grows. It is uncommon for that reason.
- **The Polemarch** was the Athenian archon who led the army. It counts itself, as every card that reads seated types does, so its floor is +2. Under the War Chief +4, under Tyranny or Imperium +6, under the Sultanate +8, about 15% of an age-4 unit. It reads the partner's Military cards too, so a Dominion pair raises it.
- **The Nomarchs** governed Egypt's provinces. Five seated cards give +2 authority, eight give +4, eleven give +5: about what The Market Writ pays a seat with ten Markets.
- **The Roll of the Senate** was the list of senators the censors kept. Ten Orders held come at about draft 10, so a Magisterial seat meets the goal as Tier II opens and seats six cards under a five-chair government. Boons and charters count. It is an institution: the chair stays for good.
- **The Grand Vizier** held the sultan's seal and ran the government in his name. Every government from tier 4 has an Economic chair except the Theocracy. Only the card's yields are doubled: its flat food, production, gold, science, culture and faith (`slotPosition` reads the card's yield lines, never a percentage, a production bonus or a rule). So the first Economic chair wants a card like The Prytaneion or Civic Granaries. Whether a conversion such as The Working Court counts as a yield line is for the triage to check. Under the Republic with six seated cards, The Prytaneion's +3 food in each of seven towns becomes +6. The card is Wildcard, so it takes the Wildcard chair that the commissions and the draft rules also want. Question 3 asks about it.
- **The Prefects** ran Rome's grain, its watch and its provinces. Three Economic cards seated under the Republic give +15% production, about 16 a turn at turn 100 and more as Economic cards fill Wildcard chairs.
- **The Sed Festival** was the Egyptian festival that renewed a pharaoh's reign. It pays at each adoption after it is seated: up to three great people (tiers 10, 18 and 26) if the seat banks the tier-10 offer, two otherwise. A great person sells for 1,000 gold at the counter, so it is rare.
- **Capstone: The Mixed Constitution.** Polybius called Rome's government a mix of kings, nobles and people; Venice ran on the same idea. Today a typed chair takes a card of its own type, and a Wildcard card fits only a Wildcard chair. With this card every card of the holder fits every chair. The holder can adopt a government for its signature and still seat its cards: a Civic card in a Military chair, a commission in an Economic chair. The tier-18 signatures still count cards by their own type. Re-seating returns no card.
- **The Golden Bull** of 1356 fixed how the seven electors chose the emperor. A council in order, with every typed chair holding its own type, is a goal that changes with each government: under Divine Mandate it needs two Military, one Economic and three Civic cards. It pulls against The Mixed Constitution, which is the point. The reward is one-time and large: a second Doctrine of the government's tier.
- **The Pandects**, Justinian's digest of Roman law. Three Doctrines give +15% science and production, about 145 a turn in age 4.
- **The Boule**, the Athenian council of five hundred. Eight seated cards give +16% science and culture at Tier III (about 65 a turn), eleven give +22% at Tier IV (about 200). It is the council's percentage, after the flats of The Prytaneion and The Nomarchs.
- **The Privy Council** raises every production line of every card by one, once for each town or hex it pays in. A council of five cards that pay production in twelve towns gains about +60 production; works and hex lines add more. It is Wildcard, because it acts on other cards.
- **What its widen cards pay:** food (The Prytaneion), strength (The Polemarch), authority (The Nomarchs), happiness and production toward buildings (The Senate Charter), a great person (The Sed Festival).
- **Bridges:** The Sed Festival (to the patrons), The Roll of the Senate (from the engine: it counts the collection), The Wonder of the Age (from the monuments: it wins a chair).
- **Shared cards that serve it:** The Sword of State and The New Code (Dominion), The Brokers' Redraw (Commerce), and every partner card that fills a typed chair.

### 4.2 The patrons

**The fantasy:** the Medici household, Charlemagne's palace scholars, the court of Akbar. A court that calls the great of every kind and makes each one count twice. **The quantity:** renown, great people gained and spent, their acts and legacies. Every empire earns renown, and wonders and culture buildings pay more of it. **Areas:** great people, the economy (production), the draft (free hands).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Court Painter | 0 | common | supply (renown from drafts); bridge from the engine | Each card you draft grants 15 renown. A charter counts. | renown | Civic | kept (5 renown to 15, 10-17); new shape (the draft moment, built in Commerce batch T7) |
| The Wandering Muse | I | uncommon | supply (boon) | On draft: gain a free great-person draft. Seated, this card does nothing. | a great person | Civic | reworked (was a random great person of your age); new shape (on-draft boons) |
| The Workshop at Olympia | I | common | supply (renown from wonders); bridge from the monuments | +2 renown a turn for each wonder you hold. | renown | Civic | new; existing (`renown` with `per: 'wonder'`) |
| The Overseers of Works | I | uncommon | widen (great people pay production) | Each time you gain a great person, your capital gains 100 production for each age you have reached. | production | Economic | new; existing (`greatPersonGained` rider, `perAge`) |
| The Symposium | II | uncommon | widen (great people pay drafts); bridge to the engine | Each time you gain a great person, you are dealt a free Order hand. | a hand | Wildcard | new; existing (`greatPersonGained` rider, `freeDraft`) |
| Letters Patent | II | uncommon | multiply (acts) | Your great people's acts pay 50% more. | an act's pay | Civic | new (10-17, was The Twice-Told Act); existing (`effectAmplifier` on `greatPersonAct`) |
| The Honoured Dead | II | uncommon | widen; scaler (grower) | While seated, this card gains +2 science and +4 production in your capital each time you spend a great person, up to +30 science and +60 production. | science, production | Civic | reworded to what the data counts (a grower on `greatPersonSpent`); moved from Tier III; existing |
| Commission: The Patron's Gallery | II | uncommon | act (commission); bridge to the landscape | Commission. Have great-person works of three different families in your borders. Then gain a free great-person draft and 200 culture. The card leaves its chair. | a great person, culture | Wildcard | reworked (the reward was a great person of your choice); new shape (a goal figure of work families) |
| The Universal Genius | III | rare | capstone (rule-breaker); bridge to the landscape | Your great people arrive with two charges: each may act and then lay a work. Each still leaves one legacy. | an act and a work | Civic | new (10-17); new shape |
| The Roll of Masters | III | uncommon | multiply ("this game") | +3% science and culture for each great person you have gained this game, at most +30%. | science, culture | Civic | new (10-17, was science and production); existing (`greatPeopleGained` as a percentage) |
| The Living Canon | III | rare | multiply (breadth) | Your cities gain +4% food and +4% production per distinct great-person family whose legacy you currently hold, at most +20% each. | food, production | Economic | kept (the sheet's revision: the data pays 8% in towns with three culture buildings); existing |
| The Immortals | IV | rare | finisher (doubler) | The legacies of your great people count twice. | every legacy | Civic | new (10-17); new shape |
| The Last Commission | IV | rare | finisher (the Opus) | Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once. | production toward the Opus | Economic | kept (deferred; data Tier III); new shape (one moment for a great person spent by either verb) |

- **"The effects of great people are doubled"** is your split, and the theme carries it in three steps: an act pays half again (Letters Patent, Tier II), a person acts and also lays a work (The Universal Genius, Tier III), and every legacy counts twice (The Immortals, Tier IV). Scientific's pass gave up its own act doublers (The Professors, The Great Treatises) for this split.
- **Supply comes from the other themes:** drafts (The Court Painter: six Tier 0 drafts pay 90 renown, more than the first person's 75), wonders (The Workshop at Olympia: three wonders give +6 renown a turn, about a third more renown in age 2), a boon (The Wandering Muse), and adoption (The Sed Festival in the council). No card simply adds a percentage of renown: Hypatia has that.
- **The Overseers of Works** were the Egyptian officials who ran the king's building works; Imhotep was one. A great person in age 2 pays 200 production, in age 3 300, in age 4 400: about 13 turns of a band 1 regular card each time, which is the size a lump must reach.
- **The Symposium**, the Greek supper of talk and new ideas. Five or six great people a game deal five or six free hands. The hand opens only when no draft or Doctrine offer waits (`freeDraftCanOpen`), so a person gained while a hand is open deals nothing. The triage may read it as a hand dealt once the open one is answered.
- **Letters Patent** were a ruler's open letter granting a right or a title. A merchant's act of 180 gold pays 270; a scholar's eight turns of science pay twelve.
- **The Honoured Dead** is built as a grower: its data counts the great people spent while it is seated (`greatPersonSpent`), not this game. The text now says so. Five people spent while seated give +10 science and +20 production.
- **Capstone: The Universal Genius.** Today a great person has one charge and two verbs, and the player chooses: an act now, or a work for good. With this card the choice goes: each person acts and then lays a work, and leaves one legacy. It also doubles the landscape's supply of works, the theme's slowest material.
- **The Patron's Gallery** asked for "a great person of the family of your choice", a new choice the player would make. Its reward is now the ordinary great-person draft, and the player chooses there, as today. A partner's work counts: a citadel, a holy site or an Academy.
- **The Last Commission** waits on one moment for a great person spent by an act or a work, which the shared Sacred Patronage also needs.
- **What its widen cards pay:** production (The Overseers of Works, The Honoured Dead), science (The Honoured Dead), free hands (The Symposium), food and production (The Living Canon).
- **Cut:** The Royal Invitation (a new act for every great person, beside a rival's Opus town), The Long Deliberation (a second pass payer; The Unwritten Chapter is the one), and the 10-17 pass's The Prodigy, The Portrait Gallery, The Pension List and The Laurel Crowns (section 8).
- **Shared cards that serve it:** Looted Art (Dominion), The Cosmopolitan Court (Commerce), Sacred Patronage (Devotion), The House of Wisdom (Scientific).

### 4.3 The landscape

**The fantasy:** the Persian paradise garden, the English landscape garden, Babylon's Processional Way. Monuments laid out on the land, so that the land itself becomes the work. **The quantity:** great-person works in your borders, how they stand beside each other, and the hexes that culture and works claim. **Areas:** the land, civic life (culture), the army (guards on the works), and, through the works' own yields, the economy.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Markstones | 0 | common | supply (land from culture buildings) | Completing a culture building claims the next hex its town's borders would take. | land | Economic | kept; new shape (a border windfall the size of the next hex) |
| The Laureate | I | uncommon | widen ("cities with a great work gain X") | Cities working a great-person improvement gain +5 culture, +3 science and +1 renown, once per city. | culture, science, renown | Civic | kept; existing |
| The Landmark Bounds | I | uncommon | supply, act (works claim land) | Laying a great-person work claims every unowned hex beside it. | land | Economic | kept; new shape (the citadel's and holy site's claim, given to every work) |
| The Siting Masters | I | common | widen (where a work stands) | Great-person works gain +1 culture for each hill, mountain, forest or water hex beside them, at most +3. | culture | Civic | moved from Tier II; near existing (`perNeighbour` with an `any` test and a cap) |
| The Quarter of Masters | II | common | multiply ("adjacent great works gain X") | A great-person work beside another great-person work yields its own yield again. This never stacks. | each work's own yield | Civic | kept (wording); new shape (a work's own yield again) |
| The Gazetteers | II | uncommon | multiply; scaler | +3% production and gold for each great-person work in your borders, at most +30%. | production, gold | Economic | new (10-17); existing (`tilesInBorders` with `greatWork`, as a percentage) |
| The Custodians | II | common | widen (the army) | Your units standing on a great-person work gain +4 strength. | strength | Military | new (10-17); new shape (a combat test: standing on a great-person work) |
| The Divine Proportion | III | rare | capstone (doubler) | The bonuses your cards give great-person works are doubled. | every card line on a work | Wildcard | new (10-17); existing (`cardYieldAmplifier`, `percent: 100`, `on: greatWork`, as Expansionist's The Age of Improvement) |
| The Masters' Domain | III | uncommon | widen (works pay food and production) | Worked great-person works give +3 food and +3 production. | food, production | Economic | trimmed (its +20% gold in their towns goes; the data pays +12 of each and +30% gold); existing |
| The Garden Courts | III | uncommon | multiply (towns with works) | Towns working at least two great-person works gain +20% culture and science. | culture, science | Civic | new (10-17); existing (`workingTiles` scope with `atLeast`) |
| Commission: The Paradise Garden | III | rare | act (commission) | Commission. Have a great-person work with three other works or tended hexes beside it. Then every unowned hex within three hexes of it joins your borders. The card leaves its chair. | land | Wildcard | simplified (the fresh water and the 300 culture go); new shape (an arrangement, and a wide claim) |
| The Processional Way | IV | rare | multiply (lines) | Great-person works in a straight line of three or more give +3 culture and +3 science each. | culture, science | Civic | trimmed (its line-of-five production goes); new shape (lines on the hex grid) |
| The Pull of the Masters | IV | rare | act (pressure) | At the start of each turn, each of your great-person works takes one hex beside it that a rival owns and no rival town works. A town centre and a rival's own works are never taken. | land | Economic | kept; new shape (a claim that takes a rival's hex) |
| Commission: The Ideal City | IV | rare | act (commission); bridge to the monuments | Commission. Have one of your towns hold two wonders and work three great-person works. Then, for the rest of the game, that town gains +25% culture, science and production. The card leaves its chair. | culture, science, production | Wildcard | reworked (an institution; the land claim and two free hands go); new shape (a goal figure) |

- **Your split, card by card:** works beside each other (The Quarter of Masters, The Paradise Garden, The Processional Way), towns with a work (The Laureate, The Garden Courts, The Ideal City), and doubled effects (The Divine Proportion doubles every card's bonus on a work; the patrons double the people). No card here pays science on every work or reads an Academy: those are Scientific's.
- **Supply is the theme's weak point.** Works come with great people, and the first comes at about turn 30 to 60. Three things fill the gap: the patrons (more people, and The Universal Genius, a work from every person), the partner's works (citadels, holy sites, Academies, Manufactories and customs houses all count), and land claimed by culture before any work stands (The Markstones). The 10-17 pass's The Office of Works (a Landmark raised for culture) would fill it best, but it adds a new action, so it is not taken.
- **The Markstones** gives a Tier 0 seat land at once: a Monument in each new town claims the hex the town would take next, about 30 to 50 border culture at turn 30.
- **The Landmark Bounds** gives every work the claim a citadel and a holy site already make: up to six hexes for a work laid at the edge.
- **The Siting Masters** moves to Tier I, where the first works are laid, so the first placement is a decision: a Landmark on a hill beside a lake and a forest yields +3 culture more. From Chinese *feng shui*.
- **Capstone: The Divine Proportion.** Every line a card puts on a work pays twice: The Siting Masters, The Masters' Domain, The Processional Way, Hypatia's leader line excepted (it is not a card). It needs no new shape. Ten works carrying about +6 from cards each gain about +60.
- **The Masters' Domain** loses its gold half, so it does one thing. The sheet had cut the data's +12 to +3.
- **The Paradise Garden** keeps one fact: a work with three works or tended hexes beside it. Fresh water was a second narrow fact. The claim is a one-time reward.
- **The Ideal City** becomes an institution (your mix): a town planned whole around its monuments, such as Pienza or Palmanova, pays a quarter more for good.
- **The Pull of the Masters** is the deck's bold late card: works on a shared border pull the land across it, one hex a turn each. It never takes a worked hex, a town centre or a rival's work.
- **What its widen cards pay:** land (The Markstones, The Landmark Bounds), culture, science and renown (The Laureate, The Siting Masters), strength (The Custodians), food and production (The Masters' Domain).
- **Cut:** The Long Borders (10-17), because the common Boundary Stones already speeds borders in Monument towns.
- **Shared cards that serve it:** The Sculpted Landscape (Expansionist: farms beside a work), The Cosmopolitan Court (Commerce: gold on works), and the partners' works themselves (citadels, holy sites, Academies, Manufactories, customs houses).

### 4.4 The monuments

**The fantasy:** the Seven Wonders, Angkor, Hagia Sophia, the Forbidden City. An empire remembered for what it raised, where every wonder finished is a festival and a new hand of cards. **The quantity:** wonders held, the towns that hold them, and a wonder finished. **Areas:** wonders, the economy (wonder towns), civic life (happiness), the army (guards), and the draft.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Cornerstone | 0 | common | supply (the first wonders) | Towns that hold no wonder build wonders 30% faster. | production toward wonders | Economic | reworked (was +25% until your first wonder, and 40 renown on it; takes Expansionist's The Pyramid Builders' job); existing (`productionBonus` with the `notHasWonder` scope) |
| The Guild of Masons | I | uncommon | supply (with a drawback) | Gain +38% production toward wonders. Cities producing a wonder lose 2 gold per turn. | production toward wonders | Economic | kept; existing |
| The Keepers of Wonders | I | common | widen (happiness) | +2 happiness for each wonder you hold. | happiness | Civic | new (10-17, was culture and science in the wonder's town); existing (`pays` to happiness by `wonders`) |
| The Ceremonial Guard | I | common | widen (the army) | Towns holding a wonder gain +5 defence. | defence | Military | new (10-17); existing (`cityStat` with the `hasWonder` scope) |
| The Unveiling | I | uncommon | act (a wonder deals a hand); bridge to the engine | Completing a wonder deals you a free Order hand. | a hand | Wildcard | trimmed (its 30 culture goes, 10-17); existing (`completion` rider with `wonder` and `freeDraft`) |
| The Seven Sights | II | uncommon | multiply; scaler | +5% culture and science for each wonder you hold, at most +30%. | culture, science | Civic | new (10-17, was The Book of Marvels); existing |
| The Golden Age | II | rare | act (the empire's festival) | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. | production, culture | Civic | kept (the sheet's revision; deferred in the data); near existing (a `completion` rider with a `timed` grant that `renews`) |
| The Envious Eye | II | uncommon | supply (a race lost) | When a rival completes a wonder you were building, the production you put into it moves to the next item in that town's queue. | production | Economic | moved from Tier IV; trimmed (its free hand goes, 10-17); new shape |
| Magnificence | III | rare | capstone (rule-breaker) | You may buy a wonder you are building with culture, one culture for each hammer it still needs. | a wonder | Economic | new (10-17); new shape |
| The Wonder Commonwealth | III | rare | multiply (wonder towns) | Cities containing a wonder gain +38% production and +38% food. Your cities without a wonder gain +15% culture instead. | production, food, culture | Economic | kept; existing |
| Commission: The Wonder of the Age | III | uncommon | act (commission); bridge to the council | Commission. Put 1,500 production into wonders or the Magnum Opus while this is seated; production in a wonder a rival finishes first still counts. Then gain 250 culture, and for the rest of the game one more Wildcard chair. The card leaves its chair. | a chair, culture | Wildcard | kept (wording); near existing (the reward exists; the goal figure is new) |
| The Magister's Court | IV | uncommon | finisher (the Opus) | Cities containing a wonder gain +25% production toward the Magnum Opus. | production toward the Opus | Economic | kept (the sheet's revision; deferred in the data, at Tier III); existing |
| The Hall of Wonders | IV | rare | supply (wider hands); bridge to the engine | Order hands deal one more card for every two wonders you hold, at most two more. | choice | Wildcard | cap three to two (a hand holds at most five cards); near existing (`offerRider` with a count) |
| The Bulwark of Marvels | IV | uncommon | widen (the army: defending the win) | The town building your Magnum Opus gains +4 defence for each wonder you hold. | defence | Military | trimmed (its hit points and both caps go); existing (`cityStat` by `wonders`, `raisingOpus` scope) |

- **Your split:** production toward wonders (The Cornerstone, The Guild of Masons, Magnificence) and bonuses for holding them (The Keepers of Wonders, The Seven Sights, The Wonder Commonwealth, The Hall of Wonders, The Bulwark of Marvels, The Magister's Court, and the patrons' The Workshop at Olympia). No Magisterial card opens a wonder early: that is Scientific's.
- **The Cornerstone** takes the job of Expansionist's The Pyramid Builders, which the Expansionist pass offered here. Its new text needs no new shape, and it does what the old one meant without a "first wonder" test: each town builds its first wonder 30% faster, and then the bonus moves to the towns that hold none. Age-1 wonders cost 130 to 223 hammers, about 20 to 30 turns of a capital, so the card is worth five to eight turns on Stonehenge or the Pyramids.
- **The Seven Sights** is renamed from the 10-17 pass's The Book of Marvels: Marco Polo's book is too late for Tier II. Philo of Byzantium called the seven wonders the seven "sights" (*theamata*), the places a traveller came to see. Three wonders give +15% culture and science at Tier II; six reach the cap.
- **The Keepers of Wonders** pays happiness, so the theme reaches civic life: three wonders give +6, about one and a half luxuries. The old text paid culture and science in the town, the same pay as The Seven Sights.
- **The Golden Age** needs no new shape now: a windfall grant can hang timed effects on the empire, and `renews` starts the ten turns again rather than stacking. Ten turns of +20% production and culture is about 200 production and 170 culture in age 3, for each wonder.
- **The Envious Eye** makes racing for every wonder safe. Today a lost race refunds 1 gold a hammer, and only for the front row. With this card the hammers move on, about four times what the refund buys.
- **Capstone: Magnificence.** Today a wonder is never for sale, except through Commerce's The Gilded Scaffold (gold) and Devotion's The Pious Masons (faith, half built). With this card culture finishes it: 1,000 hammers still needed cost 1,000 culture, about one Tier III draft. Each culture spent is a draft delayed. Each deck buys a wonder with its own currency.
- **The Wonder of the Age** is the monuments' bridge to the council: it wins a chair for good. Production put in counts even when a rival finishes first, so it is never a race (ruling (qqqqqq) 6).
- **The Hall of Wonders** loses one card of reach, because a hand holds at most five cards and Officials by Merit already adds two.
- **The Bulwark of Marvels** keeps one line: four wonders give the Opus town +16 defence.
- **What its widen cards pay:** happiness (The Keepers of Wonders), defence (The Ceremonial Guard, The Bulwark of Marvels), free hands (The Unveiling), wider hands (The Hall of Wonders), and food in wonder towns (The Wonder Commonwealth).
- **Not taken from Expansionist:** The Topping Out's wonder version (each town gains production when a wonder is finished), because The Golden Age and The Unveiling are the wonder's moments; and a hex beside a wonder that pays culture, because a wonder stands in a town centre, and The Keepers of Wonders and The Wonder Commonwealth pay its town.
- **Shared cards that serve it:** Sacred Commissions and The Rising Nave (Devotion), The House of Wisdom (Scientific), Looted Art (Dominion).

## 5. Example councils

A Tier 0 card is marked (0). Boons and charters held beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard.

### Council 1: the Medici court (the patrons and the landscape), with Scientific (Hypatia)

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Polemarch; The Markstones; The Court Painter. Held: Gifts at Court.
- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** The Polemarch (0); The Overseers of Works; The Laureate, The Workshop at Olympia; The Court Painter (0). Held: Gifts at Court, The Wandering Muse, a Scientific charter.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** The Custodians; Letters Patent, The Quarter of Masters, The Laureate; The Symposium.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** The Custodians, a Scientific Military card; The Masters' Domain; The Universal Genius, The Roll of Masters, The Garden Courts; The Divine Proportion, The Symposium.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** The Custodians, the Scientific Military card; The Masters' Domain, The Pull of the Masters; The Universal Genius, The Roll of Masters, The Garden Courts, The Immortals; The Divine Proportion, The Symposium, Commission: The Ideal City.
- **How it feels:**
  - Turn 15: the second draft deals Gifts at Court, and the capital's Monument gets 40 production at once. Each draft pays 15 renown (The Court Painter).
  - Turn 40: the first great person, an artist, lays a Landmark beside the capital, on a hill by a lake. The Laureate pays the capital +5 culture, +3 science and +1 renown, and The Overseers of Works pays 200 production.
  - Turn 65: The Wandering Muse's draft brings an engineer. The Manufactory goes beside the Landmark, and The Landmark Bounds claims the hexes around it.
  - Turn 95: Tier II. Under The Quarter of Masters the Landmark and the Manufactory each yield their own yield again. Each new great person deals a free hand (The Symposium).
  - Turn 140: The Universal Genius. A scholar acts for eight turns of science and then lays an Academy beside the Landmark, which Scientific's Academy cards also pay.
  - Turn 165: The Divine Proportion doubles every card's bonus on the six works.
  - Turn 185: the capital holds two wonders and works three works. The Ideal City gives it +25% culture, science and production for good.

### Council 2: the pharaoh's monuments (the monuments and the council), with Devotion (Akhenaten)

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Polemarch; The Cornerstone; The Second Reading.
- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** The Ceremonial Guard; The Guild of Masons, the shared Sacred Commissions; The Keepers of Wonders; The Unveiling.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** Civic Granaries (0), The Guild of Masons, The Envious Eye; The Seven Sights; The Grand Vizier. The Golden Age waits in the collection for a Civic chair.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Ceremonial Guard; Civic Granaries, The Wonder Commonwealth, Magnificence; The Seven Sights, The Golden Age; The Grand Vizier, Commission: The Wonder of the Age.
- **Tier IV, the Estates (2 / 4 / 2 / 3), and the chair The Wonder of the Age won:** The Ceremonial Guard, The Bulwark of Marvels; Civic Granaries, The Wonder Commonwealth, Magnificence, The Magister's Court; The Seven Sights, The Golden Age; The Grand Vizier, The Hall of Wonders, The Privy Council, The Pandects (in the won chair).
- **How it feels:**
  - Turn 25: Stonehenge rises in the capital 30% faster (The Cornerstone). The capital now holds a wonder, so the bonus moves to the river town, which starts the Temple of Artemis.
  - Turn 45: the Pyramids. The Unveiling deals a free hand, and three wonders give +6 happiness (The Keepers of Wonders).
  - Turn 85: a rival finishes the Great Library first. The Envious Eye moves its 300 hammers into the capital's next item.
  - Turn 100: under the Republic, The Grand Vizier doubles Civic Granaries in the first Economic chair, so each Monument gives +2 food and +2 production.
  - Turn 150: Notre-Dame (1,934 hammers) is two-thirds built and a rival is close. Magnificence buys the last third for about 650 culture, and The Golden Age begins.
  - Turn 165: The Wonder of the Age is met: 250 culture, and a twelfth chair for good.
  - Turn 190: the Opus town holds four wonders: +16 defence (The Bulwark of Marvels), and every wonder town builds the Opus a quarter faster (The Magister's Court).

### Council 3: the Senate and the people (the council and the engine), with Dominion (Taizong)

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Polemarch; The Prytaneion; The Second Reading. Held: Gifts at Court.
- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** The Polemarch (0), a Dominion Military card; The Prytaneion (0); The Nomarchs; Commission: The Roll of the Senate.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1), and the chair The Roll of the Senate won:** The Polemarch, two Dominion Military cards; The Prytaneion; The Grand Vizier, The Nomarchs (a Civic card in a Wildcard chair).
- **Tier III, Imperium (3 / 2 / 1 / 2), and the won chair:** The Polemarch, two Dominion Military cards; The Prytaneion, The Prefects; The Pandects; The Grand Vizier, The Boule (a Civic card in a Wildcard chair), Commission: The Golden Bull, which The Mixed Constitution replaces once the Doctrine is taken.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3), and the won chair:** The Polemarch, three Dominion Military cards; The Prytaneion, The Prefects; The Pandects, The Boule; The Grand Vizier, The Mixed Constitution, The Privy Council, The Second Sitting.
- **How it feels:**
  - Turn 12: three seated cards give each town +1 food (The Prytaneion).
  - Turn 35: the War Chief. Each kill pays +5 science and +5 culture for each seated card, 25 of each. The Polemarch reads two Military cards: +4 strength.
  - Turn 70: ten Orders held. The Roll of the Senate is met, and the council seats six cards for good.
  - Turn 80: Tyranny. The Grand Vizier doubles The Prytaneion in the one Economic chair: +3 food in each of seven towns becomes +6.
  - Turn 140: Imperium. Every typed chair holds its own type, so The Golden Bull offers a second Tier III Doctrine.
  - Turn 150: The Mixed Constitution takes the Wildcard chair the commission left. From now on any card fits any chair, and the next adoption returns no card to the collection.
  - Turn 170: the Sultanate. The Privy Council adds +1 production to every production line of every card. The Second Sitting turns each weak paid hand into a free second look.

## 6. Features that would open cards in several decks

None of these adds a player input.

### Features A to D (accepted, in other passes)

- **Feature A, the trades** (Scientific, accepted 2026-10-20). That pass offered Magisterial "artist guildsmen pay +1 renown" and "a town with guildsmen of three families gains +15% culture". Not taken: the patrons' supply comes from drafts, wonders and adoption, and the breadth rewards are The Living Canon (legacy families) and The Patron's Gallery (work families).
- **Feature B, reading rivals** (Scientific, accepted). That pass offered "drafts cost less culture while a met empire knows more technologies than you". Not taken: it is a catch-up rule, and The Open Door is the deck's discount.
- **Feature C, commissions as a keyword** (Dominion, built in D11). That pass offered "+1 renown a turn for each commission met this game". Not taken: Magisterial has six commissions. They feed Dominion's commission readers in a Dominion pair.
- **Feature D, deals** (Commerce, accepted 2026-10-23). That pass offered "+1 renown a turn for each empire you hold a deal with". Not taken, for feature A's reason.

### Feature G (proposed): a government adopted is a moment

- **What it is:** `governmentAdopted` as a `WindfallOccasion`, paid through `payOccasionRiders` in `adoptGovernmentAt`, at the capital, after the re-seating and before the Doctrine draw (where the Triumph's `awardOccasion` already sits).
- **What the game already does:** adoption happens at most four times a game (tiers 4, 10, 18 and 26). It lays out new chairs, re-seats the cards, lifts every seal, zeroes the reroll ladder, opens a Doctrine offer and pays a Triumph. No card can read it.
- **Why it matters:** Magisterial owns adoption, and "the right institutions for the times" needs the change of government to be an event. A new government is also a natural moment for every other deck: an amnesty, a census, a jubilee, a new academy.
- **What it costs:** one `WindfallOccasion` member, one call in `adoptGovernmentAt`, its words in the describers, and a stand-in arm in `src/ai/value.ts`.
- **No exploit:** the ladder caps adoptions at four, and each government offer is claimed once.
- **Cards it opens** (each a lump, because it comes at most four times):
  - Magisterial: The Sed Festival (a free great-person draft).
  - Dominion: "Adopting a government pacifies every town you captured and fully heals your units" (a new regime's amnesty).
  - Expansionist: "Adopting a government grants each of your towns one citizen" (a census of the new realm).
  - Commerce: "Adopting a government grants gold equal to ten turns of your income" (the merchants' gift to a new government).
  - Devotion: "Adopting a government grants faith equal to ten turns of your faith" (a coronation in the cathedral).
  - Scientific: "Adopting a government grants a quarter of your current research" (a new academy charter).
- **Fallback:** The Sed Festival is cut. Nothing else in this pass uses the moment.

## 7. New shapes

Thirty-one new shapes in seven groups. All read what the game tracks, and none adds a player input. Several serve more than one card.

1. **The draft:**
   - the hand's culture cost as a measure on the moment a card is drafted (The Accessions Register). Commerce batch T7 builds the moment itself for The Art Dealers, and The Court Painter reads it as built;
   - the hand's culture cost as a measure on the `draftPassed` moment (The Unwritten Chapter);
   - a free hand only after a paid pass: the `draftPassed` rider with `freeDraft` exists, and the test that the passed hand cost culture is new (The Second Sitting);
   - a discount on the draft's price, read where `draftCost` is asked (The Open Door);
   - a rule that refuses an Order reroll, beside `offerRider`'s extra cards (Officials by Merit);
   - `offerRider` extra cards from a count, with `per` and `max` (The Hall of Wonders).
2. **Boons:**
   - `OrderDef.onDraft` takes the windfall grant spec, not only a unit: a lump to the capital, a great-person draft (Gifts at Court, The Wandering Muse);
   - a card granted from a deck the seat does not hold, at its current tier, counted as drafted (The Cabinet of Curiosities);
   - a lump per wonder, work and Order held (The Grand Retrospective).
3. **The council:**
   - the adoption moment, feature G (The Sed Festival);
   - cards fit any chair for the holder: `orderFitsSlot` and `reseatOrders` read a holder rule (The Mixed Constitution);
   - a count of Doctrines held (The Pandects);
   - a goal figure: Orders held, the same count The Universal Library reads (The Roll of the Senate);
   - a goal figure: every Military, Economic and Civic chair holds a card of its own type (The Golden Bull);
   - a Doctrine offer as a commission reward, dealt by `drawDoctrineOffer` at the government's tier, never over a waiting offer (The Golden Bull).
4. **The collection:** a count of the different decks among the cards held, with a seated-only switch (The Polymath's Study, and the shared Travelling Players).
5. **Great people:**
   - two charges for a great person, the act and then the work, with one legacy (The Universal Genius);
   - legacies count twice (The Immortals);
   - one moment for a great person spent by either verb (The Last Commission, and the shared Sacred Patronage).
6. **Works and land:**
   - a border windfall the size of the town's next hex (The Markstones);
   - the citadel's claim of the hexes beside it, for every work (The Landmark Bounds);
   - a work's own yield again when another work stands beside it, once (The Quarter of Masters);
   - a combat test: standing on a great-person work (The Custodians);
   - a goal figure: a work with three works or tended hexes beside it, and a reward that claims every unowned hex within three (The Paradise Garden);
   - lines of three works on the hex grid (The Processional Way);
   - a claim that takes a rival's unworked hex, swept in tile order (The Pull of the Masters);
   - a goal figure: one town holding two wonders and working three works (The Ideal City; `markTown` and `lasting` exist);
   - a goal figure: the different families of works in your borders (The Patron's Gallery).
7. **Wonders:**
   - a lost race moves its production to the next item, front row only, as the refund reads (The Envious Eye);
   - culture buys a wonder in the purchase list (Magnificence);
   - a goal figure: production put into wonders and the Opus while seated (The Wonder of the Age).

**Near existing:** The Siting Masters (`perNeighbour` with an `any` tile test and a cap per hex), The Golden Age (a `completion` rider whose grant hangs a `timed` effect that `renews`).

**Existing, data only (37 of 72 seatable cards):** The Prytaneion, The Polemarch, The Nomarchs, The Grand Vizier, The Prefects, The Boule, The Privy Council, The Workshop at Olympia, The Overseers of Works, The Symposium, Letters Patent, The Roll of Masters, The Gazetteers, The Divine Proportion, The Garden Courts, The Cornerstone, The Keepers of Wonders, The Ceremonial Guard, The Unveiling, The Seven Sights, The Magister's Court, The Bulwark of Marvels, The Repertory, The Second Reading, The Encyclopedia, and twelve built rows (Civic Granaries, Master Masons, The Temple of the Muses, The Working Court, The Learned Patron, The Senate Charter, The Laureate, The Guild of Masons, The Honoured Dead, The Living Canon, The Masters' Domain, The Wonder Commonwealth), some with a number or a clause to change. Two more are near existing (The Golden Age, The Siting Masters), and seven use one small new field each (The Roll of the Senate, The Wonder of the Age, The Unwritten Chapter, The Second Sitting, Officials by Merit, The Universal Library, The Hall of Wonders).

**For less engine work, cut** The Pull of the Masters, The Processional Way, The Paradise Garden, The Grand Retrospective and The Cabinet of Curiosities first. Each is a new shape for one card. The Mixed Constitution and The Universal Genius are the largest, and each is a capstone.

## 8. The sheet's cards

### The Magisterial cards (61)

| Card | Tier | Fate | Why |
|---|---|---|---|
| The Second Reading | 0 | kept | engine: supply; uncommon; reworded to the built rule's reach |
| The Critics' Circle | 0 | cut | the same job as Devotion's The Penitents' Roll (science and culture for rerolls while seated); rerolls are the Devotion pair's |
| The Patient Eye | 0 | cut | a refund on a pass changes little; the pass keeps The Unwritten Chapter and The Second Sitting |
| Gifts at Court | 0 | kept | engine: boon; early production |
| The Repertory | 0 | kept | engine: supply (culture) |
| Master Masons | 0 | kept | engine: supply (culture buildings) |
| Civic Granaries | 0 | kept | engine: Monuments build towns; the sheet's +1 and +1 |
| The Temple of the Muses | 0 | kept | engine: the early faith |
| The Cornerstone | 0 | reworked | monuments: supply; towns that hold no wonder build wonders faster; takes The Pyramid Builders' job |
| The Court Painter | 0 | kept | patrons: supply; 15 renown |
| The Markstones | 0 | kept | landscape: supply |
| The Unwritten Chapter | I | moved to II | engine: the pass; it pays from the hand's cost |
| The Rotating Chairs | I | cut | shorter seals change little; the seal is a small friction |
| The Swearing-In | I | cut | a seat moment that pays for an act the player does anyway, and needs a record of what each card paid under each government |
| The Landmark Bounds | I | kept | landscape: supply, act |
| The Open Door | I | kept | engine: supply; 15% |
| The Unveiling | I | trimmed | monuments: act; one effect |
| Commission: The Salon Season | I | cut | a goal on rerolls and passes, which are slimmer now; its free hand is The Unveiling's and The Symposium's |
| The Accessions Register | I | reworked, to II | engine: drafts pay production from the hand's price |
| The Wandering Muse | I | reworked | patrons: boon; a great-person draft, the existing offer |
| The Laureate | I | kept | landscape: widen |
| The Guild of Masons | I | kept | monuments: supply |
| The Working Court | I | kept | engine: conversion |
| The Encyclopedia | II | moved to I | engine: the collection |
| The Siting Masters | II | moved to I | landscape: widen; the first works are laid in Tier I |
| The Quarter of Masters | II | kept | landscape: multiply |
| The Salon des Refusés | II | cut | rerolls with culture; rerolls are the Devotion pair's, and culture's one second use is Magnificence |
| The Subscription List | II | cut | paying gold into the draft pool is a new player action; the Commerce pair keeps The Art Dealers and The Brokers' Redraw |
| Commission: The Patron's Gallery | II | reworked | patrons: act; the reward is the ordinary great-person draft, not a family the player names |
| The Learned Patron | II | kept | engine: conversion |
| The Performers' Treasury | II | cut | culture into gold is the Commerce pair's job, and The Art Dealers does it; its row retires |
| The Senate Charter | II | kept | council: widen (its hall reads the Wildcard cards seated) |
| The Archive | II | cut | since the balance pass, a card kept from a passed hand counts as drafted, so the card does what a pick does; The Second Sitting carries the idea of passing without loss |
| The Antechamber | II | cut | The Roll of the Senate gives the chair through a goal, with a shape that exists |
| The Golden Age | II | kept | monuments: act; near existing now |
| The Grand Lottery | III | cut | a random prize; The Cabinet of Curiosities is the engine's random boon |
| The Commissioned Works | III | cut | culture buying buildings; Magnificence is culture's one purchase |
| The Patron's Choice | III | cut | choosing what a card pays is a new player choice |
| Commission: The Wonder of the Age | III | kept | monuments: act; bridge to the council |
| The Masters' Domain | III | trimmed | landscape: widen; the gold half goes |
| The Honoured Dead | III | moved to II | patrons: the grower; reworded to what the data counts |
| Officials by Merit | III | kept | engine: multiply |
| The Cabinet of Curiosities | III | reworded | engine: boon; a random card of your tier from a deck you do not hold |
| Commission: The Paradise Garden | III | simplified | landscape: act; one fact, one reward |
| The Living Canon | III | kept | patrons: breadth; the sheet's revision |
| The Wonder Commonwealth | III | kept | monuments: multiply |
| The Magister's Court | IV | kept | monuments: finisher |
| The Universal Library | IV | kept | engine: finisher |
| The Last Commission | IV | kept | patrons: finisher |
| The Polymath's Study | IV | shortened | engine: breadth |
| The Grand Salon | IV | cut | it doubled the draft-action payers, and the pass keeps four of them; a doubler needs a deep category |
| The Processional Way | IV | trimmed | landscape: lines of three only |
| The Hall of Wonders | IV | kept, cap two | monuments: bridge to the engine; a hand holds at most five cards |
| The Bulwark of Marvels | IV | trimmed | monuments: one line, defence |
| The Pull of the Masters | IV | kept | landscape: act (pressure) |
| The Royal Invitation | IV | cut | a new act for every great person, a new player action |
| The Envious Eye | IV | moved to II, trimmed | monuments: supply; lost races start early |
| Commission: The Ideal City | IV | reworked | landscape and monuments: an institution |
| The Grand Retrospective | IV | kept | engine: boon |
| The Disputation | IV | cut | a reroll payer; rerolls are the Devotion pair's |
| The Long Deliberation | IV | cut | a second pass payer; The Unwritten Chapter is the one |

**Tally:** 44 kept (some trimmed, reworked, reworded or moved), 17 cut. With 28 new cards (13 from the 10-17 pass, 15 from this one) the deck holds 72 seatable cards and no charters.

### The cards of the 2026-10-17 pass (28)

- **Taken (13):** The Keepers of Wonders (reworked to happiness), The Ceremonial Guard, The Book of Marvels (renamed The Seven Sights), The Roll of Masters (moved to Tier III; science and culture), The Twice-Told Act (renamed Letters Patent), The Gazetteers (production and gold), The Custodians, The Universal Genius, The Garden Courts, Magnificence, The Second Sitting, The Divine Proportion, The Immortals.
- **Not taken (15):**
  - a new player action: The Pension List (culture into renown), The Office of Works (a Landmark for culture), The Connoisseurs (a second pick from a hand);
  - rerolls, which are the Devotion pair's: The Atelier, The Jury's Register, The Hanging Committee;
  - the same job as a card kept: The Portrait Gallery (The Honoured Dead), The Laurel Crowns (The Overseers of Works), The Catalogue and The Long Gallery (The Encyclopedia and The Universal Library), The Long Borders (the common Boundary Stones), The Prix de Rome (the pity a pass already buys);
  - waits on a mechanic that opens later: The Prodigy (renown until the first great person);
  - your two ideas from `docs/themes/09-the-court.md`: The Shortlist (the `rerollOffers` rule already makes a great-person draft's first redraw free, through The Second Reading) and The Farewell Games (a timed happiness on spending a person; the moment for a person spent is The Last Commission's).

### The new cards of this pass (15)

The council: The Prytaneion, The Polemarch, The Nomarchs, Commission: The Roll of the Senate, The Grand Vizier, The Prefects, The Sed Festival, The Mixed Constitution, The Pandects, Commission: The Golden Bull, The Boule, The Privy Council. The patrons: The Workshop at Olympia, The Overseers of Works, The Symposium.

Every new name was checked against `data/`, `docs/` and `src/`. "The Proconsuls" (a Dominion card), "The Digest" (a word the bot digest uses), "The Royal Workshops" and "The Palace School" (Scientific cards), "The Kurultai" (wrong era for Tier II), "The Twice-Told Act" (not an institution) and "The Book of Marvels" (too late for Tier II) were changed. The Workshop at Olympia may take over the cut row The Great Patrons (its first clause, "+2 renown for each wonder you hold", is the same card).

### The shared cards (16)

Every pair keeps an early shared card (ruling (qqqqqq) 14): Illuminated Treatises (Scientific, 0), The Sword of State (Dominion, I), Garden Cities (Expansionist, I), Sacred Commissions (Devotion, I), The Art Dealers (Commerce, I).
- **Dominion:** The Sword of State (I), Examinations of State (II), Looted Art (II), The New Code (III): kept. **Retire** The Imperial Examinations and Triumphal Arches: both sheets cut them, and the Dominion pass left them to this one. A Victor's Peace (a Dominion institution that adds a chair) stays Dominion's, as that pass recommended (question 12).
- **Expansionist:** Garden Cities (I), Garden Provinces (II), The Sculpted Landscape (III): kept. This sheet's recommendation to cut Garden Provinces is dropped: the Expansionist pass keeps it for the frontier.
- **Commerce** (the cards the Commerce pass asked this pass to confirm, `docs/plans/commerce-themes-triage.md`, "Shared with another deck"):
  - **The Brokers' Redraw (II): confirmed.** Commerce batch T1 moves it to `common.json`, typed Wildcard. It opens gold for a reroll, beside The Second Reading's free reroll. The gold redraw still has no button (a UI follow-up).
  - **The Art Dealers (I): confirmed.** Commerce batch T7 builds it and the moment a card is drafted. The Court Painter (renown) and The Accessions Register (production) read the same moment and pay different things. A card from The Cabinet of Curiosities enters the collection, so it pays all three.
  - **Travelling Players (II): revised.** The Commerce sheet's text counts the decks seated in your government, which is the council's material. Proposed: "Foreign routes from a town with a Monument gain +2 culture for each different deck among your seated cards." One effect and one condition, in place of two clauses. It shares a count with The Polymath's Study (section 7). Three decks seated give +6 culture a route.
  - The Cosmopolitan Court (III): kept.
- **Devotion:** Sacred Commissions (I), Sacred Patronage (III, deferred), The Rising Nave (III, sheet only): kept, types to reconcile with the Devotion pass. Sacred Patronage shares the moment for a person spent with The Last Commission.
- **Scientific:** Illuminated Treatises (0), The House of Wisdom (III): kept.

### Data rows to retire

- The 61 rows of `data/decks/magisterial.json` that the sheet cut on 2026-10-06 (49 of them still dealt), as the 10-17 pass recommended, and The Performers' Treasury. That leaves 15 live rows.
- In `data/decks/common.json`: The Imperial Examinations and Triumphal Arches.
- A new card may take over a cut row's id where the card is the same, as Dominion's reworks did. The triage decides.

### The Doctrines

Magisterial has no Doctrines yet, so none falls outside a theme. They come after your cuts: one for each theme at most of Tiers I to IV. The council is the natural home of Doctrines that bend a government. Any Doctrine that would change the government system for everyone is a question for you first.

### The type sort

- **Tier 0 (11).** Military (1): The Polemarch. Economic (6): The Prytaneion, The Cornerstone, The Markstones, Civic Granaries, Master Masons, Gifts at Court. Civic (3): The Court Painter, The Temple of the Muses, The Repertory. Wildcard (1): The Second Reading.
- **Tier I (15).** Military (1): The Ceremonial Guard. Economic (4): The Overseers of Works, The Landmark Bounds, The Guild of Masons, The Working Court. Civic (7): The Nomarchs, The Wandering Muse, The Workshop at Olympia, The Laureate, The Siting Masters, The Keepers of Wonders, The Encyclopedia. Wildcard (3): Commission: The Roll of the Senate, The Unveiling, The Open Door.
- **Tier II (17).** Military (1): The Custodians. Economic (4): The Prefects, The Gazetteers, The Envious Eye, The Accessions Register. Civic (9): The Senate Charter, The Sed Festival, Letters Patent, The Honoured Dead, The Quarter of Masters, The Seven Sights, The Golden Age, The Learned Patron, The Unwritten Chapter. Wildcard (3): The Grand Vizier, The Symposium, Commission: The Patron's Gallery.
- **Tier III (17).** Economic (4): The Living Canon, The Masters' Domain, Magnificence, The Wonder Commonwealth. Civic (5): The Pandects, The Boule, The Universal Genius, The Roll of Masters, The Garden Courts. Wildcard (8): The Mixed Constitution, Commission: The Golden Bull, The Divine Proportion, Commission: The Paradise Garden, Commission: The Wonder of the Age, Officials by Merit, The Second Sitting, The Cabinet of Curiosities.
- **Tier IV (12).** Military (1): The Bulwark of Marvels. Economic (4): The Last Commission, The Pull of the Masters, The Magister's Court, The Universal Library. Civic (4): The Immortals, The Processional Way, The Polymath's Study, The Grand Retrospective. Wildcard (3): The Privy Council, Commission: The Ideal City, The Hall of Wonders.

| Tier | Military | Economic | Civic | Wildcard | Seatable | Common / uncommon / rare |
|---|---|---|---|---|---|---|
| 0 | 1 | 6 | 3 | 1 | 11 | 9 / 2 / 0 |
| I | 1 | 4 | 7 | 3 | 15 | 5 / 9 / 1 |
| II | 1 | 4 | 9 | 3 | 17 | 3 / 11 / 3 |
| III | 0 | 4 | 5 | 8 | 17 | 0 / 7 / 10 |
| IV | 1 | 4 | 4 | 3 | 12 | 0 / 2 / 10 |
| **All** | **4** | **22** | **28** | **18** | **72** | **17 / 31 / 24** |

- **Before this pass** the sheet held 61 cards; the 10-17 pass's sort typed them 1 Military, 18 Economic, 24 Civic and 18 Wildcard, and with its new cards 87 cards (3, 23, 39 and 22). Now 72: 4, 22, 28 and 18.
- **Close calls:**
  - The Grand Vizier, The Divine Proportion and The Privy Council are Wildcard: each acts on other cards' lines.
  - The Symposium and The Unveiling are Wildcard: all each does is deal a hand.
  - Letters Patent, The Universal Genius and The Immortals are Civic: they act on great people, not on cards.
  - The Pandects, The Boule, The Roll of Masters, The Honoured Dead and The Seven Sights are Civic: even halves, one of them Civic.
  - The Accessions Register is Economic now that it pays production only.
- **Every government has something to seat,** with three gaps:
  - Tier III has no Military card. Imperium's three Military chairs and Divine Mandate's two take the carried The Polemarch, The Ceremonial Guard and The Custodians, and the partner's cards. The Commerce pass has the same gap.
  - Tier III leans Wildcard (8 of 17). Three are commissions that leave their chair and one is a boon that takes none, so four standing Wildcard cards compete for the tier-18 governments' two Wildcard chairs. That competition is the council's cost.
  - Tier II leans Civic (9 of 17), which suits the Theocracy. The Republic's three Economic chairs take the four Tier II Economic cards and the carried The Prytaneion, Civic Granaries and The Working Court. Tyranny's three Military chairs take the carried Military cards and the partner's.
- **Military is thin** by design: four cards and the shared The Sword of State. Every government but the Republic has a Military chair, and the partner fills most of them. The Polemarch turns that into strength.

## 9. The checks

- **Themes beat a pile.** Each theme has flats, a percentage on them and a capstone:
  - the council: The Prytaneion, The Nomarchs; The Prefects, The Boule, The Pandects; The Mixed Constitution, and The Grand Vizier as its doubler;
  - the patrons: The Overseers of Works, The Honoured Dead; Letters Patent, The Roll of Masters, The Living Canon; The Universal Genius, then The Immortals;
  - the landscape: The Laureate, The Siting Masters, The Masters' Domain; The Gazetteers, The Garden Courts; The Divine Proportion;
  - the monuments: The Keepers of Wonders; The Seven Sights, The Wonder Commonwealth; Magnificence.
  The 10-06 sheet's strongest earners were flat culture-building cards (The National Galleries paid 600 a turn in the bot games). They go because they pay on a count that stops at one building of each kind a town and change no decision, not because they are weak. The capstones and doublers are what put a theme ahead of a pile.
- **Several routes.** Any two cards start a theme: The Prytaneion and The Nomarchs, or The Polemarch and a partner's Military cards, or The Roll of the Senate and The Grand Vizier; The Court Painter and The Overseers of Works, or The Wandering Muse and The Symposium; The Markstones and The Landmark Bounds, or The Laureate and The Siting Masters; The Cornerstone and The Keepers of Wonders, or The Guild of Masons and The Unveiling.
- **A scaler carries over** in every theme: The Prytaneion, The Nomarchs and The Boule (they grow with the chairs), The Honoured Dead and The Roll of Masters, The Gazetteers, The Seven Sights, and the engine's The Accessions Register (it grows with the hand's price) and The Encyclopedia.
- **Every card has a home:** four themes and 18 glue cards (25%). Bridges: The Court Painter, The Wandering Muse, The Symposium, The Sed Festival, The Workshop at Olympia, The Unveiling, The Hall of Wonders, The Roll of the Senate, The Wonder of the Age, The Patron's Gallery, The Universal Genius, The Ideal City. By theme: the council 13, the patrons 13, the landscape 14, the monuments 14.
- **The essentials along the way.** By Tier II:
  - the council: production (The Prefects; The Prytaneion's food), science and culture from the engine (The Repertory, The Encyclopedia, The Learned Patron) until The Boule and The Pandects at Tier III. The council reaches science late;
  - the patrons: production (The Overseers of Works, The Honoured Dead), science (The Honoured Dead; a scholar's act), culture (an artist's act; The Roll of Masters at Tier III);
  - the landscape: culture and science (The Laureate, The Siting Masters), production (The Gazetteers; The Masters' Domain at Tier III);
  - the monuments: production toward wonders (The Cornerstone, The Guild of Masons), culture and science (The Seven Sights, and the wonders' own yields), production (The Golden Age).
- **Culture stays a minority:** 15 of 72 seatable cards pay culture (21%), well under a third, and four of those pay it only as a commission's lump or beside two other yields. Science: 14. Production, or production toward a building, a wonder or the Opus: 26. Happiness or authority: 3. Renown or a great person: 6.
- **Areas:** five of five (section 2).
- **The cost shows** in The Guild of Masons (gold), Officials by Merit (no rerolls), The Cornerstone (it leaves a town once the town holds a wonder), Magnificence (culture for a wonder is a draft delayed), the chair types (The Grand Vizier under the Theocracy, The Golden Bull against The Mixed Constitution), the scarce Wildcard chair, and the boons, which do nothing seated.
- **No new input.** Every card is automatic or uses drafting, passing, rerolling, seating, adopting, building, buying, or a great person's act or work. The cards that added an action are cut (The Pension List, The Office of Works, The Subscription List, The Connoisseurs, The Royal Invitation, The Patron's Choice), and The Patron's Gallery no longer asks for a family. Magnificence adds culture to the existing purchase, as The Gilded Scaffold adds a wonder for gold.
- **The splits are followed:**
  - wonders: production toward them and pay for holding them; no Magisterial card opens one early;
  - great-person works: works side by side, towns with a work, doubled effects; no card pays science on every work or reads an Academy;
  - the government system: every chair, Doctrine and adoption card is here; A Victor's Peace (Dominion's chair) is the one exception, as the Dominion pass asked;
  - flexibility: Magisterial in which cards it holds (the collection readers, The Mixed Constitution);
  - authority and happiness (a proposal): The Nomarchs pays authority from the council and The Keepers of Wonders happiness from wonders. Governance and monuments are Magisterial's own materials. Question 10 asks.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured. Bots pass one hand in 881, never bank an adoption, and pick chairs by their own appraisal, so the council and the pass cards are hard to measure until the bots learn them.
  - Thirty-one new shapes and feature G. The Mixed Constitution and The Universal Genius are the largest.
  - Tier III has no Military card. Tier III leans Wildcard and Tier II leans Civic.
  - The council reaches science late (Tier III).
  - The landscape's supply is slow; it depends on the patrons and the partner's works.
  - No leader points at the council. Doctrines are not in this pass.
  - The deck grows from 61 sheet cards to 72 seatable cards.

## 10. Open questions for the user

1. **The engine and four themes as written:** culture and the draft as the engine; the council, the patrons, the landscape and the monuments as the themes. *Recommended: yes.*
2. **Feature G, a government adopted as a moment** (section 6), with The Sed Festival on it. *Recommended: yes.* It is one occasion, it gives the deck's own system an event, and every deck has a card for it.
3. **The Grand Vizier** ("the card in your first Economic chair pays its yields twice"). On 2026-10-06 you rejected, for this deck, "cards that copy another card's effect" and "cards that affect their neighbours in the government". I read the Vizier as different: it reads a chair, which is the government's own fact, and names no card and no neighbour. *Recommended: keep it.* If you see it as a copy, the fallback is The Prefects alone, and the council has no doubler.
4. **The five capstones:** The Mixed Constitution (your cards fit any chair), The Universal Genius (a great person acts and then lays a work), The Divine Proportion (cards' bonuses on works are doubled), Magnificence (culture buys a wonder), The Second Sitting (a paid pass deals a free hand). *Recommended: yes to all five.* The Mixed Constitution bends the chair rule for its holder only; I read it as a card, not a change to the government system. If you read it as a change to the system, the fallback is "Your Wildcard cards fit any chair."
5. **The Commerce cards:** confirm The Brokers' Redraw's move, confirm The Art Dealers and let The Court Painter and The Accessions Register read its moment, and revise Travelling Players to "Foreign routes from a town with a Monument gain +2 culture for each different deck among your seated cards." *Recommended: yes.*
6. **Rerolls go to the Devotion pair.** Magisterial keeps The Second Reading and cuts its reroll payers (The Critics' Circle, The Disputation) and The Salon des Refusés, because Devotion's The Penitents' Roll pays for rerolls. *Recommended: yes,* to confirm with the Devotion pass, which is running now.
7. **The cuts:** the 17 sheet cards in section 8, with The Performers' Treasury's row retired; the 61 rows the sheet cut on 2026-10-06; and the shared The Imperial Examinations and Triumphal Arches. *Recommended: yes.*
8. **The commissions mix:** three institutions (The Roll of the Senate and The Wonder of the Age win a chair, The Ideal City raises a town for good) and three one-time rewards (The Golden Bull's Doctrine, The Paradise Garden's land, The Patron's Gallery's great person). *Recommended: yes.*
9. **Expansionist's wonder cards:** The Pyramid Builders' job goes to The Cornerstone ("Towns that hold no wonder build wonders 30% faster"); The Topping Out's wonder version and the hex beside a wonder are not taken. *Recommended: yes.*
10. **Authority and happiness:** The Nomarchs (authority from the seated cards) and The Keepers of Wonders (happiness from wonders), under the open split that gives them to Expansionist and Devotion. You ruled for Commerce that "authority is not Expansionist's alone". *Recommended: keep both.* Governing and monuments are this deck's materials.
11. **The deck's size:** 72 seatable cards and no charters. *Recommended: keep it for now and cut by hand on the list.* If you want it smaller, these are the next five cuts, weakest first: The Processional Way, The Pull of the Masters, The Grand Retrospective, The Workshop at Olympia, The Envious Eye.
12. **A Victor's Peace** stays Dominion's one card that adds a chair, as the Dominion pass recommended. *Recommended: yes.*

After your answers: every card onto the sheet as `add` and `modify` rows in the sorted format, with the Type column; then Magisterial's Doctrines; then the triage for the build.

## 11. Where the Devotion and Magisterial passes meet (added 2026-10-23)

The Devotion pass (`docs/plans/devotion-themes.md`) ran at the same time as this one, so neither saw the other. This section lists where they touch. The answers go in both docs.

- **Feature names.** The Devotion pass proposes feature E ("devout towns" as a card word) and feature F (a conversion as a moment). This pass's adoption moment is renamed **feature G** to keep the names apart.
- **Rerolls: the passes agree.** This pass cuts Magisterial's reroll payers and leaves rerolls to the Devotion pair. The Devotion pass moves The Penitents' Roll to the shared cards with Magisterial, so a Magisterial seat can still draw it.
- **Three more cards the Devotion pass shares with Magisterial:** The Painted Chapels (Tier I: religious buildings give +3 culture each), The Festival Calendar (Tier II: towns keeping a rite gain +30% food and culture) and The Penitents' Roll (Tier II). This pass did not list them. *Recommended: take all three.* Each pays culture, which a Magisterial seat wants.
- **Sacred Commissions' tier.** This pass keeps it at Tier I as the pair's early card. The Devotion pass moves it to Tier II, because it pays only in a town with a holy site, and holy sites come with prophets in age 2. *Recommended: the Devotion pass's reading,* as you ruled for Commerce's routes. The Painted Chapels then becomes the pair's early card.
- **Sacred Patronage.** This pass keeps its second clause ("spending a great person grants 30 faith"), which needs the same new moment as The Last Commission. The Devotion pass drops that clause, so the card uses only a rule that exists. *Recommended: keep the clause if you keep The Last Commission,* because the moment is then built anyway. If The Last Commission is cut, take the Devotion pass's text.

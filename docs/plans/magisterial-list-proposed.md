# The Magisterial deck: the full list, with the themes pass folded in

This is a review list, rebuilt on 2026-10-23. It puts every card on the deck sheet (`docs/decks/magisterial.md`) in one list, with every new card and change from the themes pass (`docs/plans/magisterial-themes.md`) folded in. It replaces the list of 2026-10-18, which folded in the superseded builds pass of 2026-10-17 (`docs/plans/magisterial-builds.md`). It is not the spec of record: the sheet is unchanged, and the sheet's text wins wherever the two differ. It is grouped by tier, as the other decks' lists are, so you can cut cards by hand.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changes the card) or `deferred` (not dealt, because it needs a new shape). The Magisterial sheet still uses the older words (built, revised, new, deferred); this list maps them.
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the themes pass, not on the sheet. "(10-17)" marks a card from the superseded builds pass.
  - `proposed: …` after the status names a change the themes pass makes to a sheet card: a tier move, a rarity change, a rework, a trim to one clause, or a revised number. The row already shows the change, and the status says what it was. `wording` marks a tidy that does not change what the card does (a "tile" becomes a "hex"); it is not counted as a change.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the themes pass's type sort. No Magisterial row in the data carries a type yet, so every type here is a proposal. A Wildcard card fits only a Wildcard chair.
- **Build:** the card's theme and role in the themes pass.
  - The four themes are the council (the government system: chairs, Doctrines, adoption), the patrons (great people), the landscape (great-person works on the land) and the monuments (wonders). Engine glue raises or spends the engine (culture and the draft) and serves all four.
  - The roles are supply (more of the thing), widen (it pays something new), multiply (its output grows) and act (a choice or a moment). A capstone breaks a rule or doubles a category.
  - A second theme after a semicolon marks a bridge between two themes.
  - "feature G" marks a card on a government adopted as a moment, which the pass proposes (`docs/plans/magisterial-themes.md` section 6).
- **What this list follows:**
  - the direction of 2026-10-20 (`docs/decks/deck-design.md`): a few themes per deck with varied pay, no more than about a third of the cards paying the deck's own yield, and four of the five areas of the game;
  - your picture of Magisterial: adaptable to the draft, strong governance and the right institutions for the times, the patronage of great people, great monuments and a culture engine; bonuses for holding wonders; works side by side, towns with a work, and doubled great-person effects;
  - the rulings of 2026-10-20: Magisterial owns the government system (ruling 4), and wonders left Expansionist (ruling 3);
  - your taste from the Scientific, Dominion, Expansionist and Commerce passes: early cards that develop towns; no two cards with one job; simple, short text; commissions with a mix of institutions and one-time rewards; rule-breakers that bend one core rule; late pay as a percentage; no new player input.
- **Doctrines:** Magisterial has none yet. They come after your cuts.
- **Cut cards:** the cards the themes pass cuts are in the last section, `## Cut by this pass`, with their sheet text and one line on why, so you can restore any of them.

**By status:**

| Tier | Implemented | Modify | Add | New | All | Proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 2 | 1 | 6 | 2 | 11 | 3 |
| Tier I | 3 | 0 | 6 | 6 | 15 | 5 |
| Tier II | 2 | 2 | 5 | 8 | 17 | 5 |
| Tier III | 1 | 2 | 4 | 10 | 17 | 3 |
| Tier IV | 0 | 2 | 8 | 2 | 12 | 5 |
| **All** | **8** | **7** | **29** | **28** | **72** | **21** |
| Shared | 11 | 3 | 2 | 0 | 16 | 2 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard | All | Common / uncommon / rare |
|---|---|---|---|---|---|---|
| Tier 0 | 1 | 6 | 3 | 1 | 11 | 9 / 2 / 0 |
| Tier I | 1 | 4 | 7 | 3 | 15 | 5 / 9 / 1 |
| Tier II | 1 | 4 | 9 | 3 | 17 | 3 / 11 / 3 |
| Tier III | 0 | 4 | 5 | 8 | 17 | 0 / 7 / 10 |
| Tier IV | 1 | 4 | 4 | 3 | 12 | 0 / 2 / 10 |
| **All** | **4** | **22** | **28** | **18** | **72** | **17 / 31 / 24** |
| Shared | 1 | 2 | 11 | 2 | 16 |  |

All 72 cards take a chair; the deck has no charters. By theme: the council 13, the patrons 13, the landscape 14, the monuments 14, engine glue 18 (25%). Before this pass the sheet held 61 cards, and the list of 2026-10-18 held 89 with the builds pass's cards. Cards that pay culture: 15 of 72 (21%).

**Data notes:**
- `data/decks/magisterial.json` holds 77 rows at commit `48f37cf8`: the 16 the sheet keeps (three of them deferred) and the 61 the sheet cut on 2026-10-06, 49 of which are still dealt. The pass retires the 61 and The Performers' Treasury, which leaves 15 live rows.
- No Magisterial row carries a type, and Magisterial is not a sorted deck yet (`test/sim/decks/sortedSheets.ts`).
- The Honoured Dead's data counts the great people spent while it is seated (the `greatPersonSpent` tally) and pays +6 science and +12 production, at Tier III. The list has it at Tier II, with the sheet's numbers, in words that say what the data counts.
- The Magister's Court and The Last Commission are deferred Tier III rows in the data; the list has them at Tier IV.
- Commerce batch T1 (being built) moves The Brokers' Redraw to `common.json` and Travelling Players to Tier II. Commerce batch T7 builds The Art Dealers and the moment a card is drafted, which The Court Painter and The Accessions Register read.
- The Imperial Examinations and Triumphal Arches are rows in `common.json` naming Dominion and Magisterial; both sheets cut them. The recommendation is to retire them (`## Cut by this pass`).
- Shapes the new cards need: section 7 of the themes pass lists 31 new shapes and feature G. 37 of the 72 cards are data only today.

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Prytaneion** | uncommon | new | Each town gains +1 food for every two cards you have seated. | Economic | council: widen; scaler |
| **The Polemarch** | common | new | Your units gain +2 strength for each Military card you have seated. | Military | council: widen (the army) |
| **The Court Painter** | common | add; proposed: number changed (was 5 renown) | Each card you draft grants 15 renown. A charter counts. | Civic | patrons: supply; engine |
| **The Markstones** | common | add; proposed: wording | Completing a culture building claims the next hex its town's borders would take. | Economic | landscape: supply (land from culture buildings) |
| **The Cornerstone** | common | add; proposed: reworked (was "+25% production toward wonders until you have completed one. Completing your first wonder grants 40 renown."; takes Expansionist's The Pyramid Builders' job) | Towns that hold no wonder build wonders 30% faster. | Economic | monuments: supply (the first wonders) |
| **Civic Granaries** | common | modify: revised (the data pays +2 food and +2 production) | Monuments give +1 food and +1 production. | Economic | engine: Monuments build towns |
| **Master Masons** | common | implemented | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. | Economic | engine: supply (culture buildings) |
| **The Temple of the Muses** | common | implemented | Culture buildings give +2 faith each. | Civic | engine: widen (the early faith) |
| **The Repertory** | common | add | Culture buildings give +1 culture each. | Civic | engine: supply (culture) |
| **Gifts at Court** | common | add | On draft: your capital gains 40 production. Seated, this card does nothing. | Economic | engine: act (boon) |
| **The Second Reading** | uncommon | add; proposed: rarity was common; reworded (was "costs no faith"; the built rule frees the first reroll of every Order, Doctrine and great-person hand) | The first reroll of each hand is free. | Wildcard | engine: supply (rerolls) |

- **Six of the eleven Tier 0 cards build a town or claim land** (your Commerce revision of 2026-10-21): food from the council and from Monuments, production toward Monuments, wonders and the capital, and hexes from culture buildings. The Temple of the Muses is the early faith, The Repertory the culture, The Polemarch the army, and The Court Painter and The Second Reading point at the draft.
- **The Prytaneion** grows with the council: +1 food a town under the Chiefdom, +2 with five chairs, +4 with eight, +5 with eleven.

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Nomarchs** | uncommon | new | +1 authority for every two cards you have seated. | Civic | council: widen (authority); scaler |
| **Commission: The Roll of the Senate** | uncommon | new | Commission. Hold ten Orders. Then, for the rest of the game, you have one more Wildcard chair. The card leaves its chair. | Wildcard | council: act, supply (a chair); engine |
| **The Wandering Muse** | uncommon | add; proposed: reworked (was "On draft: gain a random great person of your age, of any family. This great person counts as called: your next one needs more renown, as usual. Seated, this card does nothing.") | On draft: gain a free great-person draft. Seated, this card does nothing. | Civic | patrons: supply (boon); engine |
| **The Workshop at Olympia** | common | new | +2 renown a turn for each wonder you hold. | Civic | patrons: supply; monuments |
| **The Overseers of Works** | uncommon | new | Each time you gain a great person, your capital gains 100 production for each age you have reached. | Economic | patrons: widen (production) |
| **The Laureate** | uncommon | implemented | Cities working a great-person improvement gain +5 culture, +3 science and +1 renown, once per city. | Civic | landscape: widen (towns with a work); patrons |
| **The Landmark Bounds** | uncommon | add; proposed: wording | Laying a great-person work claims every unowned hex beside it. | Economic | landscape: supply, act (works claim land) |
| **The Siting Masters** | common | add; proposed: moved from Tier II | Great-person works gain +1 culture for each hill, mountain, forest or water hex beside them, at most +3. | Civic | landscape: widen (where a work stands) |
| **The Guild of Masons** | uncommon | implemented | Gain +38% production toward wonders. Cities producing a wonder lose 2 gold per turn. | Economic | monuments: supply (with a drawback) |
| **The Keepers of Wonders** | common | new (10-17), reworked (was "Each town gains +2 culture and +2 science for each wonder in it.") | +2 happiness for each wonder you hold. | Civic | monuments: widen (happiness) |
| **The Ceremonial Guard** | common | new (10-17) | Towns holding a wonder gain +5 defence. | Military | monuments: widen (the army) |
| **The Unveiling** | uncommon | add; proposed: trimmed (its "and grants 30 culture" goes) | Completing a wonder deals you a free Order hand. | Wildcard | monuments: act; engine |
| **The Open Door** | uncommon | add; proposed: number changed (was 10%) | Order hands cost 15% less culture. | Wildcard | engine: supply (drafts) |
| **The Working Court** | rare | implemented | Cities with a Monument gain production equal to 30% of their base culture, excluding conversion outputs. | Economic | engine: widen (culture into production) |
| **The Encyclopedia** | common | add; proposed: moved from Tier II | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | Civic | engine: widen (the collection) |

- **The Roll of the Senate** is met at about draft 10, as Tier II opens. Boons and charters count toward the ten. The chair stays for good (an institution).
- **The Accessions Register and The Unwritten Chapter left this tier for Tier II:** each pays from the hand's culture cost, which is too small in Tier I to pay for a chair.

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Grand Vizier** | rare | new | The card in your first Economic chair pays its yields twice. | Wildcard | council: multiply (one chair) |
| **The Senate Charter** | uncommon | implemented | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +30% production toward buildings. | Civic | council: widen (its hall pays for Wildcard cards seated) |
| **The Prefects** | uncommon | new | +5% production for each Economic card you have seated. | Economic | council: multiply (Economic cards) |
| **The Sed Festival** | rare | new | Each time you adopt a government, gain a free great-person draft. | Civic | council: act (adoption); patrons; feature G |
| **The Symposium** | uncommon | new | Each time you gain a great person, you are dealt a free Order hand. | Wildcard | patrons: widen (great people pay drafts); engine |
| **Letters Patent** (was The Twice-Told Act, 10-17) | uncommon | new (10-17) | Your great people's acts pay 50% more. | Civic | patrons: multiply (acts) |
| **The Honoured Dead** | uncommon | modify: revised (the data pays +6 science and +12 production, at most +90 and +180); proposed: moved from Tier III; reworded to the grower the data counts (was "Your capital gains +2 science and +4 production per distinct great person you have spent this game, at most +30 science and +60 production.") | While seated, this card gains +2 science and +4 production in your capital each time you spend a great person, up to +30 science and +60 production. | Civic | patrons: widen; scaler (grower) |
| **Commission: The Patron's Gallery** | uncommon | add; proposed: reworked (was "Reward: a great person of the family of your choice, and 200 culture") | Commission. Have great-person works of three different families in your borders. Then gain a free great-person draft and 200 culture. The card leaves its chair. | Wildcard | patrons: act; landscape |
| **The Quarter of Masters** | common | add; proposed: wording (was "gain their base yield again") | A great-person work beside another great-person work yields its own yield again. This never stacks. | Civic | landscape: multiply (works side by side) |
| **The Gazetteers** | uncommon | new (10-17) | +3% production and gold for each great-person work in your borders, at most +30%. | Economic | landscape: multiply; scaler |
| **The Custodians** | common | new (10-17) | Your units standing on a great-person work gain +4 strength. | Military | landscape: widen (the army) |
| **The Seven Sights** (was The Book of Marvels, 10-17) | uncommon | new (10-17); renamed (Marco Polo's book is too late for Tier II) | +5% culture and science for each wonder you hold, at most +30%. | Civic | monuments: multiply; scaler |
| **The Golden Age** | rare | modify: deferred, revised (the data reads "Completing a wonder grants your cities +20% food, production, gold and culture for ten turns while this card remains active. Duration refreshes; magnitude does not stack.") | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. | Civic | monuments: act (the empire's festival) |
| **The Envious Eye** | uncommon | add; proposed: moved from Tier IV; proposed: trimmed (its "and you are dealt a free Order hand" goes) | When a rival completes a wonder you were building, the production you put into it moves to the next item in that town's queue. | Economic | monuments: supply (a race lost) |
| **The Accessions Register** | uncommon | add; proposed: moved from Tier I; proposed: reworked (was "Each card you draft while this is seated grants 20 culture and 20 production in your capital. A charter counts."; type was Civic) | Each card you draft grants your capital production equal to half the culture its hand cost. | Economic | engine: widen (drafts pay production); scaler |
| **The Learned Patron** | uncommon | implemented | Cities with at least two culture buildings gain science equal to 15% of their base culture, at most +18 science per city. Conversion outputs are excluded. | Civic | engine: widen (culture into science) |
| **The Unwritten Chapter** | common | add; proposed: moved from Tier I | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. | Civic | engine: act (the pass) |

- **Each tier-10 government lacks one chair type** (the Republic a Military chair, the Theocracy an Economic chair, Tyranny a Civic chair). The Grand Vizier pays nothing under the Theocracy, and The Prefects suit the Republic.
- **The Grand Vizier** doubles only the flat yields of the card in that chair, never a percentage, a production bonus or a rule. Question 3 of the pass asks whether it falls under your rejection of "cards that copy another card's effect" (2026-10-06).
- **The Sed Festival:** adoption is bankable, so a seat may hold the tier-10 government offer until this card is seated. It then pays up to three times (tiers 10, 18 and 26).

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Mixed Constitution** | rare | new | Your cards fit any chair. | Wildcard | council: capstone (rule-breaker) |
| **The Pandects** | uncommon | new | +5% science and production for each Doctrine you hold. | Civic | council: multiply (Doctrines) |
| **Commission: The Golden Bull** | uncommon | new | Commission. Have every Military, Economic and Civic chair hold a card of its own type. Then you are offered a Doctrine of your government's tier. The card leaves its chair. | Wildcard | council: act, supply (a Doctrine) |
| **The Boule** | uncommon | new | +2% science and culture for each card you have seated. | Civic | council: multiply (the whole council); scaler |
| **The Universal Genius** | rare | new (10-17) | Your great people arrive with two charges: each may act and then lay a work. Each still leaves one legacy. | Civic | patrons: capstone (rule-breaker); landscape |
| **The Roll of Masters** | uncommon | new (10-17), revised (was science and production) | +3% science and culture for each great person you have gained this game, at most +30%. | Civic | patrons: multiply ("this game") |
| **The Living Canon** | rare | modify: revised (the data reads "Cities with at least three culture buildings gain +8% food and +8% production per distinct great-person family whose legacy you currently hold, at most +40% each.") | Your cities gain +4% food and +4% production per distinct great-person family whose legacy you currently hold, at most +20% each. | Economic | patrons: multiply (breadth) |
| **The Divine Proportion** | rare | new (10-17) | The bonuses your cards give great-person works are doubled. | Wildcard | landscape: capstone (doubler) |
| **The Masters' Domain** | uncommon | modify: revised (the data pays +12 production and +12 food, and +30% gold); proposed: trimmed (the sheet's "Their cities gain +20% gold, once per city." goes) | Worked great-person works give +3 food and +3 production. | Economic | landscape: widen (works pay food and production) |
| **The Garden Courts** | uncommon | new (10-17) | Towns working at least two great-person works gain +20% culture and science. | Civic | landscape: multiply (towns with works) |
| **Commission: The Paradise Garden** | rare | add; proposed: simplified (was "Goal: have a great-person work beside fresh water with other works or tended tiles on three of its other sides. Reward: claim every tile within three hexes of it, and 300 culture.") | Commission. Have a great-person work with three other works or tended hexes beside it. Then every unowned hex within three hexes of it joins your borders. The card leaves its chair. | Wildcard | landscape: act |
| **Magnificence** | rare | new (10-17) | You may buy a wonder you are building with culture, one culture for each hammer it still needs. | Economic | monuments: capstone (rule-breaker) |
| **The Wonder Commonwealth** | rare | implemented | Cities containing a wonder gain +38% production and +38% food. Your cities without a wonder gain +15% culture instead. | Economic | monuments: multiply (wonder towns) |
| **Commission: The Wonder of the Age** | uncommon | add; proposed: wording | Commission. Put 1,500 production into wonders or the Magnum Opus while this is seated; production in a wonder a rival finishes first still counts. Then gain 250 culture, and for the rest of the game one more Wildcard chair. The card leaves its chair. | Wildcard | monuments: act; council |
| **Officials by Merit** | rare | add | Order hands deal two extra cards. You cannot reroll Order hands. | Wildcard | engine: multiply (more choice) |
| **The Second Sitting** | rare | new (10-17) | Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once. | Wildcard | engine: capstone (rule-breaker) |
| **The Cabinet of Curiosities** | rare | add; proposed: reworded (was "add a random card from any deck's pool to your collection, chosen from the cards the game rates most helpful to you"; the sim may not read the bot's appraisal) | On draft: add a random card of your tier from a deck you do not hold to your collection. Seated, this card does nothing. | Wildcard | engine: act (boon) |

- **Five capstones:** The Mixed Constitution (the council), The Universal Genius (the patrons), The Divine Proportion (the landscape), Magnificence (the monuments) and The Second Sitting (the engine). Question 4 of the pass asks about all five.
- **The Mixed Constitution** bends the chair rule for its holder only. The tier-18 signatures still count cards by their own type, and re-seating never returns a card.
- **The Golden Bull and The Mixed Constitution pull against each other:** one rewards a council in order, the other lets any card sit anywhere.
- **Four standing Wildcard cards** (The Mixed Constitution, The Divine Proportion, Officials by Merit, The Second Sitting) compete for the two Wildcard chairs of a tier-18 government. The three commissions leave their chairs, and the boon takes none.

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Privy Council** | rare | new | Each of your cards that pays production pays +1 more production wherever it pays it. | Wildcard | council: finisher (multiply) |
| **The Immortals** | rare | new (10-17) | The legacies of your great people count twice. | Civic | patrons: finisher (doubler) |
| **The Last Commission** | rare | modify: deferred (the data row is at Tier III) | Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once. | Economic | patrons: finisher (the Opus) |
| **The Processional Way** | rare | add; proposed: trimmed (its "Works in a line of five or more also give +3 production each." goes) | Great-person works in a straight line of three or more give +3 culture and +3 science each. | Civic | landscape: multiply (lines) |
| **The Pull of the Masters** | rare | add; proposed: wording | At the start of each turn, each of your great-person works takes one hex beside it that a rival owns and no rival town works. A town centre and a rival's own works are never taken. | Economic | landscape: act (pressure) |
| **Commission: The Ideal City** | rare | add; proposed: reworked (was "Reward: that city claims every unowned tile within three hexes and gains +25% culture, science and production for the rest of the game; you are dealt two free Order hands.") | Commission. Have one of your towns hold two wonders and work three great-person works. Then, for the rest of the game, that town gains +25% culture, science and production. The card leaves its chair. | Wildcard | landscape: act (an institution); monuments |
| **The Magister's Court** | uncommon | modify: deferred, revised (the data row is at Tier III and reads "Cities containing a wonder gain +25% production toward the Magnum Opus and Cathedrals, once per city.") | Cities containing a wonder gain +25% production toward the Magnum Opus. | Economic | monuments: finisher (the Opus) |
| **The Hall of Wonders** | rare | add; proposed: number changed (was "at most three extra"; a hand holds at most five cards) | Order hands deal one more card for every two wonders you hold, at most two more. | Wildcard | monuments: supply; engine |
| **The Bulwark of Marvels** | uncommon | add; proposed: trimmed (was "+4 strength and +25 hit points for each wonder you hold, at most +24 strength and +150 hit points") | The town building your Magnum Opus gains +4 defence for each wonder you hold. | Military | monuments: widen (the army: defending the win) |
| **The Universal Library** | rare | add | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. | Economic | engine: finisher (the Opus) |
| **The Polymath's Study** | rare | add; proposed: shortened (was "Your cities gain +8% science and +8% production for each different deck among the Orders you hold, seated or not, at most +40%. Common cards count as one deck; a card shared by two decks counts for both.") | Your towns gain +8% science and production for each different deck among the cards you hold, at most +40%. | Civic | engine: multiply (breadth) |
| **The Grand Retrospective** | rare | add | On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing. | Civic | engine: act (boon) |

- **The Polymath's Study's reading** stays: common cards count as one deck, and a shared card counts for both its decks. The words move from the card to the reading.
- **If you want less engine work,** the pass would cut The Pull of the Masters, The Processional Way, The Paradise Garden, The Grand Retrospective and The Cabinet of Curiosities first: each is a new shape for one card.

## Shared with another deck

These rows live in `data/decks/common.json`, except The Brokers' Redraw, which Commerce batch T1 moves there, and The Art Dealers and The Rising Nave, which have no row yet. A seat holding Magisterial, or the deck named beside a card, may draw it, so a change here is felt in two decks. Every pair keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14): Illuminated Treatises, The Sword of State, Garden Cities, Sacred Commissions and The Art Dealers. The types of the cards shared with Dominion, Expansionist and Scientific are in the data; the others are proposals, to reconcile with the Commerce sheet (already sorted by its batch T1) and the Devotion pass.

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | Scientific | 0 | common | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic |
| **The Sword of State** | Dominion | I | common | implemented | On draft: the best melee unit you can build is trained in your capital. It costs no upkeep. Seated, this card does nothing. | Military |
| **Garden Cities** | Expansionist | I | uncommon | implemented | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. | Civic |
| **Sacred Commissions** | Devotion | I | uncommon | implemented | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | Economic (to reconcile) |
| **The Art Dealers** | Commerce | I | common | add; confirmed (Commerce batch T7 builds it and the moment a card is drafted, which The Court Painter and The Accessions Register also read) | Each card you draft grants 15 gold. | Economic |
| **Examinations of State** | Dominion | II | rare | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. | Civic |
| **Garden Provinces** | Expansionist | II | common | implemented; proposed: keep (this sheet recommended a cut; the Expansionist pass keeps it for the frontier) | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **Looted Art** | Dominion | II | uncommon | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **Travelling Players** | Commerce | II | uncommon | modify: revised (the data deals it at Tier 0 with "Foreign routes from a city with a Monument gain +2 culture."; Commerce batch T1 moves it to Tier II); proposed: revised (the Commerce sheet's text was "Foreign routes from a city with a Monument gain +1 culture; additional +2 culture for every unique deck type slotted in your government.") | Foreign routes from a town with a Monument gain +2 culture for each different deck among your seated cards. | Civic |
| **The Brokers' Redraw** | Commerce | II | rare | modify: as built (the rule is live, but no button offers the gold redraw yet); moved to the shared cards by Commerce batch T1; confirmed | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. | Wildcard |
| **The Sculpted Landscape** | Expansionist | III | uncommon | implemented | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. | Civic |
| **The Cosmopolitan Court** | Commerce | III | rare | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic |
| **Sacred Patronage** | Devotion | III | rare | modify: deferred (it shares the moment for a great person spent with The Last Commission) | Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn. | Civic (to reconcile) |
| **The House of Wisdom** | Scientific | III | uncommon | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic |
| **The New Code** | Dominion | III | rare | implemented | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Wildcard |
| **The Rising Nave** | Devotion | III | rare | add | While a city is building a Cathedral or a wonder, it gains +1 faith and +1 culture for every 10% of the work already done. | Civic (to reconcile) |

- **Travelling Players** shares its count, the different decks among your seated cards, with The Polymath's Study (which reads every card held). Common cards count as one deck; a shared card counts for both. Three decks seated give +6 culture a route.
- **The Brokers' Redraw** opens gold for a reroll, beside The Second Reading's free one. Devotion's The Penitents' Roll pays for rerolls in the Devotion pair.
- **A Victor's Peace** (Dominion, an institution that adds a chair) is not shared. It stays Dominion's one card on the chairs, as the Dominion pass recommended.

## Cut by this pass

Every card the themes pass cuts, so you can restore one. The first seventeen rows are sheet cards, with the sheet's text; The Performers' Treasury is the one with a live data row. The next fifteen are cards the 2026-10-17 pass proposed and the themes pass did not take, marked (10-17), with that pass's text. The last two are shared rows both sheets cut.

| Card | Tier | Ability (as on the sheet) | Why |
|---|---|---|---|
| **The Critics' Circle** | 0 | +1 science and +1 culture for each Order hand you have rerolled while this is seated, at most +10 of each. | The same job as Devotion's The Penitents' Roll (science and culture for rerolls while seated). Rerolls are the Devotion pair's; Magisterial keeps The Second Reading. |
| **The Patient Eye** | 0 | Passing on an Order hand returns 25% of the culture it cost to your draft pool. | A refund changes little. The pass keeps The Unwritten Chapter and The Second Sitting. |
| **The Rotating Chairs** | I | Cards you seat are sealed for half as long before they can be moved. | Shorter seals change little; the seal is a small friction, and an adoption lifts it anyway. |
| **The Swearing-In** | I | Each time you seat a card, gain 15 culture. A card pays this once per government. | It pays for an act the player does anyway, and needs a record of what each card paid under each government. The council's cards pay for what is seated instead. |
| **Commission: The Salon Season** | I | Commission. Goal: reroll or pass on four Order hands while this is seated. Reward: a free Order hand and 100 culture. Then it leaves its chair. | Rerolls and passes are slimmer now. Its free hand is The Unveiling's and The Symposium's. |
| **The Salon des Refusés** | II | You may reroll a hand with culture from your draft pool instead of faith, at twice the faith price. | Rerolls are the Devotion pair's, and culture's one second use is Magnificence. |
| **The Subscription List** | II | You may pay gold into your draft pool: every 3 gold counts as 1 culture toward your next Order hand. | Paying gold into the pool is a new player action. The Commerce pair keeps The Art Dealers and The Brokers' Redraw. |
| **The Performers' Treasury** | II | Cities with at least two culture buildings gain gold equal to 30% of their base culture, excluding conversion outputs. | Culture into gold is the Commerce pair's job, and The Art Dealers does it. Its row is live: retire it. |
| **The Archive** | II | When you pass on an Order hand, you may keep one card from it, unseated. If you keep one, the hand counts as drafted, not passed: it refunds nothing, pays no card that pays for passing, and resets your pass count. | Since the balance pass a kept card counts as drafted, so the card does what a pick does. The Second Sitting carries the idea of passing without loss. |
| **The Antechamber** | II | While you hold this card, seated or not, you have one extra wildcard chair. | The Roll of the Senate gives the chair through a goal, with a shape that exists. |
| **The Grand Lottery** | III | On draft: receive one of these at random: a free Order hand, a great-person hand, 150 culture, 150 faith, or 150 production in your capital. Seated, this card does nothing. | The Cabinet of Curiosities is the engine's random boon. |
| **The Commissioned Works** | III | You may buy buildings with culture from your draft pool, at one culture for every two gold of the price. A building bought this way counts as bought for cards that read purchases, but pays nothing to cards that read gold or faith paid. | Magnificence is culture's one purchase. |
| **The Patron's Choice** | III | When you seat this, choose culture, science, production or gold. Your cities gain +10% of that yield while it stays seated. | Choosing what a card pays is a new player choice. |
| **The Grand Salon** | IV | Cards that pay you for rerolling, passing, drafting or seating a card pay 50% more, caps included. Commission rewards are not raised. | It doubled the draft-action payers, and the pass keeps four of them. A doubler needs a deep category. |
| **The Royal Invitation** | IV | Any great person of yours, of any family, may be spent beside a rival city that is building the Magnum Opus. That city puts half as much production toward the Opus for 5 turns. Each rival can be slowed this way once every 15 turns. | A new act for every great person, a new player action. |
| **The Disputation** | IV | Each time you reroll an Order hand, gain science equal to that reroll's faith price, whatever you paid it with, even if it was free. | A reroll payer. Rerolls are the Devotion pair's. |
| **The Long Deliberation** | IV | Each time you pass on an Order hand, gain renown equal to half the culture the hand cost. | A second pass payer; The Unwritten Chapter is the one. |
| **The Prodigy** (10-17) | 0 | +50% renown until you gain your first great person. | It waits on a mechanic that opens later. The Court Painter is the patrons' Tier 0 card. |
| **The Long Borders** (10-17) | 0 | Your borders grow 25% faster. | The common Boundary Stones does the same job in Monument towns. |
| **The Atelier** (10-17) | I | The first time you reroll each Order hand, your capital gains production equal to half the culture the hand cost. | A reroll payer. Rerolls are the Devotion pair's. |
| **The Portrait Gallery** (10-17) | I | While seated, this card gains +2 science and +2 culture each time you spend a great person. It starts at +2 of each. | The same job as The Honoured Dead, which is built. |
| **The Pension List** (10-17) | I | Once drafted, you may pay culture into your renown: every 2 culture counts as 1 renown. No chair required. | A new player action. |
| **The Office of Works** (10-17) | I | Once drafted, each of your towns may raise one Landmark in its borders for culture: 100 for each age you have reached. No chair required. | A new player action. It would fill the landscape's supply best; if you want it, it is the first to restore. |
| **The Jury's Register** (10-17) | II | +1% science and culture for each Order hand you have rerolled or passed this game, at most +30%. | Rerolls are the Devotion pair's; a pass count alone is too slow to scale. |
| **The Catalogue** (10-17) | II | +1% production and gold for each Order you hold, at most +30%. | The Encyclopedia and The Universal Library read the collection. |
| **The Hanging Committee** (10-17) | III | Your capital gains +2 science and +2 culture for each Order hand you have rerolled or passed this game, at most +50 of each. | As The Jury's Register. |
| **The Long Gallery** (10-17) | III | Each town gains +1 science and +1 culture for every four Orders you hold. | As The Catalogue. |
| **The Laurel Crowns** (10-17) | III | When you gain a great person, gain culture equal to half the renown it cost. | The Overseers of Works pays the same moment, in production, the deck's gap. |
| **The Prix de Rome** (10-17) | III | After you pass on two Order hands in a row, your next Order hand deals only rare cards. | The pity a pass already buys does this in part, and it needed a hand of one rarity. |
| **The Connoisseurs** (10-17) | III | You may draft a second card from each Order hand by paying its culture cost again. | A second pick from a hand is a new player action. The Second Sitting gives a second look instead. |
| **The Shortlist** (10-17, no tier) | none | Each great-person hand comes with one free redraw. | The Second Reading's rule already frees the first redraw of a great-person draft. |
| **The Farewell Games** (10-17, no tier) | none | Spending a great person gives +3 happiness for 15 turns. | The moment for a person spent is The Last Commission's, and the patrons' happiness is not needed. |
| **The Imperial Examinations** (shared, Dominion) | I | Garrisoned cities with a Monument gain +3 culture and +1 scholar renown. | Both sheets cut it as a duplicate of Examinations of State. Its row is live: retire it. |
| **Triumphal Arches** (shared, Dominion) | II | Capturing a city grants 40 culture and +1 general renown. Cities containing a wonder gain +5 defence. | Both sheets cut it: two unrelated clauses. Its row is deferred: retire it. |

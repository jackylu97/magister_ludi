# The Magisterial deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/magisterial.test.ts` checks it against `data/decks/magisterial.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/magisterial-themes.md`, the themes pass of 2026-10-23. It designs the deck as a way to play: an engine of culture and the draft, and four themes (the council, the patrons, the landscape and the monuments). Section 12 holds your comments and answers of 2026-10-25, and it outranks the sections before it. `docs/plans/magisterial-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/magisterial-themes-triage.md` (batches MG1 to MG17). Batch MG1 wrote this sheet, put the types into the data, retired the 64 cut rows, changed four cards in place (Civic Granaries, The Honoured Dead, The Living Canon and The Masters' Domain), and gave the three deferred rows their new text and tier. Batch MG2 built the fourteen cards of Tiers 0 and I whose shapes already existed: The Prytaneion, The Polemarch, The Court Painter, The Cornerstone, The Repertory, The Second Reading, The Nomarchs, The Workshop at Olympia, The Overseers of Works, The Siting Masters, The Keepers of Wonders, The Ceremonial Guard, The Unveiling and The Encyclopedia. Batch MG3 built eleven cards of Tiers II to IV: The Prefects, The Symposium, Letters Patent, The Quarter of Masters, The Gazetteers, The Seven Sights, The Boule, The Roll of Masters, The Garden Courts, The Privy Council and The Bulwark of Marvels. It also dealt The Golden Age and The Magister's Court, which had waited for it. Each uses shapes that already existed, except The Bulwark of Marvels, which needed one new field: a town's defence counted from every wonder the empire holds, not only the wonders in that town. The Quarter of Masters is a new data row; the retired Expansionist row of the same name stays as it was. Batch MG4 built the cards that count your collection and the wonder commissions: Commission: The Eighth Wonder, Commission: The Roll of the Senate, Commission: The Wonder of the Age, The Universal Library and The Polymath's Study, and gave the shared Travelling Players its new text. It added two counts (the Orders you hold, and the different decks among them or among your seated cards), one commission figure (the Orders you hold) and two moments a commission counts (a wonder you complete, and the production you put into a wonder or the Magnum Opus). Batch MG5 built the cards that read the price of an Order hand: The Open Door, The Accessions Register and The Unwritten Chapter. A hand now keeps the culture you paid for it, and a reroll keeps that price. The moment you draft a card and the moment you pass on a hand both carry the price, so a card can pay a share of it. A free hand has no price. The Open Door's discount is read in one place, which every screen and bot asks for the price of the next hand. Batch MG6 built the cards that change a hand: The Wandering Muse, Officials by Merit and The Hall of Wonders. A card may now forbid the reroll of an Order hand, a card may widen a hand by a count (one card for every two wonders), and a card may hand over a great person when you draft it. Batch MG7 built the cards that read the council: The Sed Festival, The Pandects and Commission: The Golden Bull. Adopting a government is now a moment a card can pay on, a card can count the Doctrines you hold, a commission can ask for a council in order, and a commission can offer you a Doctrine. Batch MG8 built the cards about great people spent: The Last Commission, The Immortals and Commission: The Patron's Gallery, and the shared Sacred Patronage. Spending a great person, by an act or by a work, is now a moment a card can pay on. A card can pay that moment only while one of your towns builds the Magnum Opus, a card can make each legacy count twice, and a commission can count the families of the great-person works in your borders. Batch MG9 built the cards about works on the land and the wonder towns: The Landmark Bounds, The Custodians, The Envious Eye and Commission: The Ideal City. Laying a great-person work is now a moment a card can test the hex of, and a card can claim the unowned hexes beside it for your nearest city. A unit can gain strength while it stands on a great-person work, a commission can ask for one town that holds wonders and works great-person works, and a card can move the production of a lost wonder race to the town's next item. Batch MG10 built three capstones: The Grand Vizier, The Divine Proportion and The Second Sitting. The first two use shapes that already existed. A card's bonus on a great-person work that is paid for each hex beside the work is now doubled for each such hex, and a card can pay on a pass only when you paid culture for the hand. Batch MG11 built Magnificence. Culture is now a way to pay when you buy something, and a card can let it buy the wonder at the front of a city's queue, for one culture for each hammer the wonder still needs. Batch MG12 built The Mixed Constitution. A card can now let every card you hold fit every chair. Every screen and bot that asks which chair a card fits asks your council first, and when the card leaves its chair your council is seated again at once by the ordinary rule. Batch MG13 built The Universal Genius. A great person who acts while the card is seated now stays on the board, marked as having acted. It cannot act again, and it is spent when it lays its work, so its legacy comes once. The card's text changed from "arrive with two charges" to what the card does. Batch MG14 built the two boons: The Cabinet of Curiosities and The Grand Retrospective. A card can now hand over a random card of your tier from a deck you do not hold, and that card enters your collection as a drafted card does: a charter opens what it opens, its own gift on drafting is paid, and the cards that pay when you draft a card pay for it. A card can also pay yields when you draft it, counted at that moment, and a count of hexes can now name the hexes it counts. Batch MG15 built the two cards about how works stand on the hex grid: Commission: The Paradise Garden and The Processional Way. A card can now pay on a great-person work that stands in a straight line of works, a commission can count the works and tended hexes beside one of your works, and a commission's reward can claim the unowned land around that work, through the same routine The Landmark Bounds uses. Batch MG16 built The Pull of the Masters. At the end of each turn, after borders grow, each great-person work of an empire that holds the card takes one hex beside it from a rival town, if that town does not work it, and the hex joins the empire's nearest town. The card's text changed from "At the start of each turn" to "Each turn", because the hexes move at the end of the turn, when borders grow. A hex is taken only if it is close enough for that town's own borders to reach, so its owner can see it and its citizens can reach it. Each batch set its own rows to `implemented`, and since MG16 every row is.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`, `docs/flags.md` item (hhhhhhh)) retired 7 rows of this deck and 4 shared rows. It moved Civic Granaries and Commission: The Eighth Wonder from Tier 0 to Tier I. A moved row keeps its text until a later batch changes it. "Retired rows" below gives the reason for each cut.
- **Batch DS7** (2026-11-11, the same spec) gave 23 rows of this deck their new, shorter text. No row is held back, and the deck has no new card. A commission's text now reads "Goal: … Reward: …", and a boon's text starts with the keyword "Boon.":
  - **Reworded, same effect:** the seven commissions, the three boons, The Working Court, The Envious Eye, The Senate Charter, The Last Commission and The Pull of the Masters. Each keeps every rule it had. The Wonder of the Age still counts production put into the Magnum Opus. The Grand Retrospective still sends its production to your capital. The Last Commission still pays at most once a turn, and only while a town builds the Opus. The Pull of the Masters still never takes a town centre or a rival's own work.
  - **The Senate Charter** has a text that starts with the keyword "Charter.", but the card still takes a chair. You can build the Assembly Hall, and the hall gives its bonuses, only while the card is seated. Batch DS8 decides how the card face shows the keyword.
  - **Simplified:** Master Masons lost its +25% toward Monuments and its "first time in a town" condition. Now each culture building finished in a town grants that town 30 production (it was 20), whether the building was built, bought or granted, and a culture wonder or empire building counts. The Cornerstone lost its condition: +20% toward wonders in every town (it was +30% in a town with no wonder). The Guild of Masons lost its loss of gold, and gives +30% (it was +38%). The Laureate lost its +1 renown. The Honoured Dead lost its cap of fifteen spends (the spec marks it reworded, and its Note says the cap goes). The Learned Patron lost its cap of +18 science a town. The Wonder Commonwealth lost its +15% culture in towns with no wonder, and gives +35% production and food (it was +38%).
  - **Changed:** The Workshop at Olympia gives +3 renown a turn for each wonder, not +2 (your comment of 2026-11-10).
  - **The Second Reading** keeps its text and its tier. Batch DS9 deals it in Tier 0 and in Tier I.
- **Status:**
  - `implemented`: in the data, dealt, and the data's text is this sheet's text.
  - `modify`: in the data, but not as this sheet writes it. The words after the colon say why. A row can have more than one:
    - `deferred`: not dealt yet, because it needs a new shape or waits for its batch;
    - `revised`: the text and the effect change;
    - `reworked`: a different card takes over the row;
    - `moved`: the card moves to another tier;
    - `rarity`: the rarity changes;
    - `shared`: the row moves to `data/decks/common.json` and becomes a shared card;
    - `as built`: the data's text is this sheet's text, but the game does something slightly different. The list doc's row says what.
  - `add`: not in the data yet.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch MG1 the types are in the data. A Magisterial card fits only a chair of its own type or a Wildcard chair, except while The Mixed Constitution is seated: then every card you hold fits every chair (batch MG12). A card in a Wildcard chair still counts as its own type, so the Assembly Hall of The Senate Charter counts only Wildcard cards (the triage's reading 42). The sync test checks this column for every row in the data, the shared table's included.
- **Charters:** none. Every card takes a chair, The Senate Charter included: its text starts with the keyword "Charter." since batch DS7, but its Assembly Hall works only while the card is seated. The three boons (The Wandering Muse, The Cabinet of Curiosities and The Grand Retrospective) pay when you draft them and do nothing seated. Since batch DS7 their texts start with the keyword "Boon.".
- **Doctrines:** 16 (4 on each of Tiers I to IV), all dealt, after your comments of 2026-11-05 (`docs/plans/doctrine-review-2026-11-05.md`). A Doctrine is held for the whole game and takes no chair. Each tier's Doctrine table sits above its Orders, and the Build column names the theme that each is written for. `docs/plans/doctrines-build-triage.md` gives the batch that built each one. The reasons and pairs are in `docs/plans/magisterial-doctrines.md`.
- **The old sheet** (61 cards, in the old format, last reviewed 2026-10-07) is in git history: `git show 7d4064dc:docs/decks/magisterial.md`.

| Tier | Implemented | Modify | Add | All |
|---|---|---|---|---|
| Tier 0 | 7 | 0 | 0 | 7 |
| Tier I | 16 | 0 | 0 | 16 |
| Tier II | 15 | 0 | 0 | 15 |
| Tier III | 16 | 0 | 0 | 16 |
| Tier IV | 10 | 0 | 0 | 10 |
| **All** | **64** | **0** | **0** | **64** |
| Shared | 14 | 1 | 0 | 15 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 3 | 2 | 1 |
| Tier I | 1 | 5 | 7 | 3 |
| Tier II | 0 | 3 | 9 | 3 |
| Tier III | 0 | 3 | 5 | 8 |
| Tier IV | 0 | 3 | 4 | 3 |
| **All** | **2** | **17** | **27** | **18** |
| Shared | 1 | 2 | 10 | 2 |

The deck holds 64 cards, and every one takes a chair: 7, 16, 15, 16 and 10 across Tiers 0 to IV. By rarity they are 12 common, 29 uncommon and 23 rare. The deck has seven commissions: four leave an institution and three a one-time reward (see "Open for your pass").

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Prytaneion** | uncommon | implemented | Each town gains +1 food for each card you have seated. | Economic |
| **The Polemarch** | common | implemented | Your units gain +2 strength for each Military card you have seated. | Military |
| **The Court Painter** | common | implemented | Each card you draft grants 15 renown. A charter counts. | Civic |
| **The Cornerstone** | common | implemented | Towns build wonders 20% faster. | Economic |
| **Master Masons** | common | implemented | Finishing a culture building grants 30 production in its town. | Economic |
| **The Temple of the Muses** | common | implemented | Culture buildings give +2 faith each. | Civic |
| **The Second Reading** | uncommon | implemented | The first reroll of each hand is free. | Wildcard |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Arthashastra** | council | You have one more Wildcard chair. The card seated in it counts twice. |
| **The Hospitium** | engine | The third card in each of your Order hands comes from a deck you do not hold. |
| **The Choregia** | patrons | Culture buildings give +3 culture and +2 renown each. |
| **The Periclean Works** | monuments | Each wonder you hold gives +2 production in every town. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Nomarchs** | uncommon | implemented | +1 authority for every two cards you have seated. | Civic |
| **Commission: The Roll of the Senate** | uncommon | implemented | Goal: hold ten Orders. Reward: one more Wildcard chair. | Wildcard |
| **The Wandering Muse** | uncommon | implemented | Boon. On draft: gain a free great-person draft. | Civic |
| **The Workshop at Olympia** | common | implemented | +3 renown a turn for each wonder you hold. | Civic |
| **The Overseers of Works** | uncommon | implemented | Each time you gain a great person, your capital gains 100 production for each age you have reached. | Economic |
| **The Laureate** | uncommon | implemented | Towns working a great-person work gain +5 culture and +3 science. | Civic |
| **The Landmark Bounds** | uncommon | implemented | Laying a great-person work claims every unowned hex beside it. | Economic |
| **The Guild of Masons** | uncommon | implemented | +30% production toward wonders. | Economic |
| **The Keepers of Wonders** | common | implemented | +2 happiness for each wonder you hold. | Civic |
| **The Ceremonial Guard** | common | implemented | Towns holding a wonder gain +5 defence. | Military |
| **The Unveiling** | uncommon | implemented | Completing a wonder deals you a free Order hand. | Wildcard |
| **The Open Door** | uncommon | implemented | Order hands cost 15% less culture. | Wildcard |
| **The Working Court** | rare | implemented | Towns with a Monument gain production equal to 30% of their culture. | Economic |
| **The Encyclopedia** | common | implemented | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | Civic |
| **Civic Granaries** | common | implemented | Monuments give +1 food and +1 production. | Economic |
| **Commission: The Eighth Wonder** | uncommon | implemented | Goal: complete a wonder. Reward: each wonder you hold gives +3 culture and +5 renown. | Civic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Magnaura** | council | Each town gains +1 science for each Civic card you have seated. |
| **The Jinshi** | engine | Rare cards come up twice as often in your Order hands. |
| **The Barmakids** | patrons | Each great person you have gained gives every town +1 food and +1 production. |
| **The Peregrini** | landscape | Great-person works give +1 food and +1 production to every hex beside them. Laying a great-person work makes your next great person cost 20% less. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Grand Vizier** | rare | implemented | The card in your first Economic chair pays its yields twice. | Wildcard |
| **The Senate Charter** | uncommon | implemented | Charter. Unlocks the Assembly Hall in your capital: +3 happiness and +30% production toward buildings. | Civic |
| **The Prefects** | uncommon | implemented | +5% production for each Economic card you have seated. | Economic |
| **The Sed Festival** | rare | implemented | Each time you adopt a government, gain a free great-person draft. | Civic |
| **The Symposium** | uncommon | implemented | Each time you gain a great person, you are dealt a free Order hand. | Wildcard |
| **Letters Patent** | uncommon | implemented | Your great people's acts pay 50% more. | Civic |
| **The Honoured Dead** | uncommon | implemented | Gains +2 science and +4 production in your capital each time you spend a great person. | Civic |
| **Commission: The Patron's Gallery** | uncommon | implemented | Goal: hold great-person works of three families. Reward: a free great-person draft and 200 culture. | Wildcard |
| **The Quarter of Masters** | common | implemented | A great-person work beside another great-person work yields its own yield again. This never stacks. | Civic |
| **The Seven Sights** | uncommon | implemented | +5% culture and science for each wonder you hold, at most +30%. | Civic |
| **The Golden Age** | rare | implemented | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. | Civic |
| **The Envious Eye** | uncommon | implemented | When a rival finishes a wonder you were building, your production moves to the next item. | Economic |
| **The Accessions Register** | uncommon | implemented | Each card you draft grants your capital production equal to half the culture its hand cost. | Economic |
| **The Learned Patron** | uncommon | implemented | Towns with two culture buildings gain science equal to 15% of their culture. | Civic |
| **The Unwritten Chapter** | common | implemented | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. | Civic |

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Council of Ten** | council | You have two more Wildcard chairs. |
| **Scutage** | engine | Orders you hold but have not seated pay half their yields. You have one fewer Wildcard chair. |
| **The Bourgs** | landscape | Towns working a great-person work grow 25% faster. |
| **The Carroccio** | monuments | Your units gain +1 strength for each wonder you hold, at most +8. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Mixed Constitution** | rare | implemented | Your cards fit any chair. | Wildcard |
| **The Pandects** | uncommon | implemented | +5% science and production for each Doctrine you hold. | Civic |
| **Commission: The Golden Bull** | uncommon | implemented | Goal: fill every Military, Economic and Civic chair with a card of its type. Reward: a Doctrine offer. | Wildcard |
| **The Boule** | uncommon | implemented | +2% science and culture for each card you have seated. | Civic |
| **The Universal Genius** | rare | implemented | Your great people may act, and then still lay their work. Each leaves one legacy. | Civic |
| **The Roll of Masters** | uncommon | implemented | +3% science and culture for each great person you have gained this game, at most +30%. | Civic |
| **The Divine Proportion** | rare | implemented | The bonuses your cards give great-person works are doubled. | Wildcard |
| **The Masters' Domain** | uncommon | implemented | Worked great-person works give +3 food and +3 production. | Economic |
| **The Garden Courts** | uncommon | implemented | Towns working at least two great-person works gain +20% culture and science. | Civic |
| **Commission: The Paradise Garden** | rare | implemented | Goal: have a great-person work with three works or tended hexes beside it. Reward: every unowned hex within three hexes joins your borders. | Wildcard |
| **Magnificence** | rare | implemented | You may buy a wonder you are building with culture, one culture for each hammer it still needs. | Economic |
| **The Wonder Commonwealth** | rare | implemented | Towns holding a wonder gain +35% production and food. | Economic |
| **Commission: The Wonder of the Age** | uncommon | implemented | Goal: put 1,500 production into wonders. Reward: 250 culture and one more Wildcard chair. | Wildcard |
| **Officials by Merit** | rare | implemented | Order hands deal two extra cards. You cannot reroll Order hands. | Wildcard |
| **The Second Sitting** | rare | implemented | Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once. | Wildcard |
| **The Cabinet of Curiosities** | rare | implemented | Boon. On draft: gain a random card of your tier from a deck you do not hold. | Wildcard |

Tier III has no Military card (section 8 of the themes pass). Since batch DS1, Tiers II and IV have none either. The Military cards of Tiers 0 and I and the partner deck's fill the Military chairs of the later governments.

## Tier IV

**Doctrines,** offered with the tier-26 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Union of Lublin** | council | You also gain the abilities of the other two governments of your tier. |
| **The Kitabkhana** | patrons | Spending a great person grants 200 renown for each age you have reached. |
| **The Gobelins** | landscape | Each great-person work in your borders gives +4% production toward the Magnum Opus, at most +40%. |
| **The Escorial** | monuments | Completing a wonder gives you a free great-person draft. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Privy Council** | rare | implemented | Each of your cards that pays production pays +1 more production wherever it pays it. | Wildcard |
| **The Immortals** | rare | implemented | The legacies of your great people count twice. | Civic |
| **The Last Commission** | rare | implemented | Spending a great person adds 150 production to your Magnum Opus. | Economic |
| **The Processional Way** | rare | implemented | Great-person works in a straight line of three or more give +3 culture and +3 science each. | Civic |
| **The Pull of the Masters** | rare | implemented | Each turn, each great-person work takes one unworked hex beside it from a rival town. | Economic |
| **Commission: The Ideal City** | rare | implemented | Goal: have one town hold two wonders and work three great-person works. Reward: that town gains +25% culture, science and production. | Wildcard |
| **The Hall of Wonders** | rare | implemented | Order hands deal one more card for every two wonders you hold, at most two more. | Wildcard |
| **The Universal Library** | rare | implemented | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. | Economic |
| **The Polymath's Study** | rare | implemented | Your towns gain +8% science and production for each different deck among the cards you hold, at most +40%. | Civic |
| **The Grand Retrospective** | rare | implemented | Boon. On draft: gain 20 culture, science and production for each wonder, great-person work and Order you hold. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Magisterial or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch MG1 every shared row carries the type below. The cards shared with Dominion, Expansionist, Scientific, Commerce and Devotion carry the types those sheets give them. Batch MG1 typed Sacred Commissions (Economic) and Sacred Patronage (Civic) as the Devotion build plan types them (the triage's reading 47). Devotion batch DV1 gave both rows the same types.
- **Retired in batch MG1:** The Imperial Examinations and Triumphal Arches, both shared with Dominion. Both sheets cut them.
- **Changed by other batches:** Commerce batch T1 moved The Brokers' Redraw to the shared file and Travelling Players to Tier II. Batch R1 (2026-10-25) changed The Art Dealers to +3 gold for each card seated in your government.
- **Moved in Devotion batch DV1** (`docs/plans/devotion-themes-triage.md`): The Painted Chapels, The Festival Calendar and The Penitents' Roll came here from the Devotion file, with their ids, texts, tiers and rarities, and are typed Civic. Sacred Commissions moved from Tier I to Tier II, because it pays only in a town with a holy site.
- **Who builds what:** this plan built Travelling Players' new text in batch MG4, and Sacred Patronage, with its second clause, in batch MG8. The Devotion build plan (`docs/plans/devotion-themes-triage.md`) built The Rising Nave in batch DV3. It pays while the front row of a town's queue is a Cathedral or a wonder, the Magnum Opus included (that plan's reading 18). Whichever batch changes a shared row changes it on every sorted sheet that lists it, in the same batch (the triage's reading 47).
- **Each pair's early shared card:** Scientific, Illuminated Treatises (Tier 0); Dominion, The Sword of State (Tier I); Expansionist, Garden Cities (Tier I); Commerce, The Art Dealers (Tier I); Devotion, The Painted Chapels (Tier I).

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | common | Scientific | 0 | implemented | Libraries give +1 culture. Monuments give +1 science. | Civic |
| **The Sword of State** | common | Dominion | I | implemented | Boon. On draft: gain the best melee unit you can build. It costs no upkeep. | Military |
| **Garden Cities** | uncommon | Expansionist | I | implemented | Towns with a Monument gain +1 culture for every three wild tiles they work. | Civic |
| **The Art Dealers** | common | Commerce | I | implemented | +3 gold for each card seated in your government. | Economic |
| **The Painted Chapels** | uncommon | Devotion | I | implemented | Religious buildings give +3 culture each. | Civic |
| **Examinations of State** | rare | Dominion | II | implemented | Garrisoned towns gain +1 science and +1 culture for every three citizens. | Civic |
| **Garden Provinces** | common | Expansionist | II | implemented | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **Looted Art** | uncommon | Dominion | II | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **The Brokers' Redraw** | rare | Commerce | II | modify: as built | You may reroll an Order hand with gold. | Wildcard |
| **The Festival Calendar** | uncommon | Devotion | II | implemented | Cities keeping a rite gain +30% food and +30% culture. | Civic |
| **Sacred Commissions** | uncommon | Devotion | II | implemented | Towns with a Holy Site build wonders 30% faster. | Economic |
| **The Sculpted Landscape** | uncommon | Expansionist | III | implemented | Farms beside a great-person work gain +2 food and +2 culture. | Civic |
| **Sacred Patronage** | rare | Devotion | III | implemented | You may buy a great-person draft for 750 faith. | Civic |
| **The House of Wisdom** | uncommon | Scientific | III | implemented | Towns working an Academy build wonders 30% faster. | Civic |
| **The New Code** | rare | Dominion | III | implemented | Capturing a city deals you a free Order hand, at most once every ten turns. | Wildcard |

- **Travelling Players** took its new text in batch MG4 (the triage's reading 46). It counts the decks among the cards in your chairs: a card that two decks share counts for both, and the cards that belong to no deck count together as one more (reading 8). Batch DS1 retired it, so neither sheet's table lists it now.
- **The Brokers' Redraw** plays as built: the rule is live, but no button offers the gold redraw yet. The rule also lets gold reroll any hand that faith may, not only an Order hand. Commerce batch DS4 removed its surcharge on other purchases.
- **Sacred Patronage** (batch MG8) uses the rule The Magisterium used: a great-person draft bought with faith costs a flat 750 faith each time, and the faith price does not rise. What rises is the renown each later great person needs. Batch Z2 changed its text to say the flat price. Its second clause paid 30 faith once a turn when you spent a great person by an act or a work, until Devotion batch DS5 removed it. The Devotion sheet lists the same row.
- **Sacred Commissions** took its new text in Devotion batch DS5: +30% production toward wonders in a town with a Holy Site (it was +38%). Its 60 faith for each wonder you complete is gone.
- **Illuminated Treatises** took its new effect in Scientific batch DS6: a Library gives +1 culture and a Monument gives +1 science, each without the other. Until then a town needed both to gain +1 science and +1 culture.
- **The House of Wisdom** took its new text in Scientific batch DS6: +30% production toward wonders in a town working an Academy. Its +3 culture on each Academy and its +1 renown in each such town are gone.

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects (the triage's reading 43). The last section of `docs/plans/magisterial-list-proposed.md`, "Cut by this pass", gives the old text of the cards this pass cut and the reason for each cut. The old sheet (`git show 7d4064dc:docs/decks/magisterial.md`) gives the reasons for the cuts of 2026-10-06.

- **Retired in batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`). The reason after each card is the Note column of that file's table. Each data row keeps its text and effects:
  - The Repertory (Tier 0): cut by your comment of 2026-11-10.
  - The Siting Masters (Tier I): four terrain types and a cap.
  - The Custodians (Tier II): too narrow to matter in most games.
  - The Gazetteers (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two. The Seven Sights and The Roll of Masters stay.
  - The Living Canon (Tier III): it reads legacy families, which few players track.
  - The Bulwark of Marvels (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck.
  - The Magister's Court (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck. The Universal Library is Magisterial's.
  - in `data/decks/common.json`, the shared cards:
    - The Penitents' Roll (with Devotion, Tier II): the best play is a dull repeated action. Reroll, collect, reroll.
    - Travelling Players (with Commerce, Tier II): a seat holds two or three decks, so the count barely moves.
    - The Cosmopolitan Court (with Commerce, Tier III): two effects with three conditions.
    - The Rising Nave (with Devotion, Tier III): the yield changes every turn, in tenths.
- **Retired in batch MG1:**
  - fifty live rows: The Civic Accounts, Patronage, The Sculptors' Quarries, The Pageant Fields, Hearth Ceremonies, The Wonder-Feasts, The Chronicle of Works, The Civic Nursery, The Court Stewards, The Founding Pageant, The Capital of Letters, The Chancery, The Civic Stage, The Public Copyists, The Artisan Wages, Provincial Patrons, The Citizens' Watch, The Harbour Festival, The Pageant Schools, The Grand Fairs, The Groundskeepers, The Civic Assemblies, The Patrons' Road, The Master Workshops, The Great Patrons, The Muses' Call, The Artisan Court, The Festival Season, The Court Archives, The Public Gallery, The Monumental Provinces, The Civic Faith, The Provincial Chancery, The Maritime Galleries, The Provincial Stages, The Master's Presence, The Grand Tour, The Performers' Treasury, The Civic Harvest, The Sculptors' Schools, The Patrons' Fleet, The Monumental Court, The Civic Commonwealth, The Laureate Cities, The National Galleries, The Provincial Academies, The Civic Pantheon, The Great Chancery, The Pageants of Peace and The Universal Court;
  - twelve deferred rows: The Civic Guard, Festival Commissions, The Civic Annals, Public Benefactors, The Commemorative Feast, The Living Chronicle, The Complete Court, The Palace Guard, The Cultural Embassies, The Great Exhibition, The Salon and The Imperial Pageant;
  - two shared rows: The Imperial Examinations (live) and Triumphal Arches (deferred).
- The Performers' Treasury is the one card this pass cut that still had a live row. The other 49 live rows and the twelve deferred rows are cards the sheet cut on 2026-10-06.
- Cut cards with no data row (The Markstones, Gifts at Court, the seventeen sheet cards this pass cut, such as The Critics' Circle and The Patient Eye, and the cards of 2026-10-17 that the pass did not take) have nothing to retire.
- No new card takes over a retired row's id (the triage's reading 45). The Workshop at Olympia is a new row, not The Great Patrons.

## Open for your pass

- **Ruled 2026-10-25** (`docs/plans/magisterial-themes.md`, section 12: your comments on the review list and the questions of sections 10 and 11). They are written into the rows above:
  - **Changed:** The Prytaneion pays +1 food in each town for every card you have seated (*"for every card"*).
  - **Cut:** The Markstones and Gifts at Court (*"remove"*). Neither had a data row.
  - **Added:** a Tier 0 commission (*"add commission: build a wonder. Reward: wonders grant +3 culture and +5 renown"*). It leaves an institution: for the rest of the game, each wonder you hold pays +3 culture and +5 renown each turn, whether you built it before or after the goal, and a captured wonder counts (the triage's readings 3 and 4).
  - **The Art Dealers:** +3 gold for each card seated in your government (*"revise: +3 gold for each card slotted in your government"*), built in batch R1. The moment a card is drafted stays, for The Court Painter and The Accessions Register.
  - **Every recommendation of sections 10 and 11 stands:** the engine and the four themes; feature G (a government adopted is a moment) with The Sed Festival; The Grand Vizier kept; the five capstones; the Commerce cards; rerolls left to the Devotion pair; the cuts, with their rows retired; The Cornerstone in place of Expansionist's The Pyramid Builders; The Nomarchs and The Keepers of Wonders kept; the deck at 71 cards; A Victor's Peace stays Dominion's; The Painted Chapels, The Festival Calendar and The Penitents' Roll shared; Sacred Commissions at Tier II; and Sacred Patronage with its second clause.
  - **The commissions** (section 12, item 8, and the triage's "The commissions: the mix"): seven. Four leave an institution, an effect that holds for the rest of the game and takes no chair: Commission: The Eighth Wonder, Commission: The Roll of the Senate, Commission: The Wonder of the Age and Commission: The Ideal City. Three keep a one-time reward: Commission: The Patron's Gallery, Commission: The Golden Bull and Commission: The Paradise Garden.
- **Still open** (the triage's questions):
  - **The Tier 0 commission's name** (question 1). This sheet uses the plan's recommendation, Commission: The Eighth Wonder. The other name offered is Commission: The Builder's Name.
  - **The Mixed Constitution leaving its chair** (question 2). The plan re-seats the council at once by the ordinary rule (reading 24). Batch MG12 built it that way.
  - **The Golden Bull with no Doctrine to offer** (question 3). The plan has the card wait in its chair until a Doctrine of the government's tier can be offered (reading 19). Batch MG7 built it that way.
  - **The readings** (question 4). The build uses readings 1 to 47 until you mark one.
  - **Magisterial's Doctrines:** your review of 2026-11-05 closed the questions on them. All 16 are built (`docs/plans/doctrines-build-triage.md`).

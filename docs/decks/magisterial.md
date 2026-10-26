# The Magisterial deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/magisterial.test.ts` checks it against `data/decks/magisterial.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/magisterial-themes.md`, the themes pass of 2026-10-23. It designs the deck as a way to play: an engine of culture and the draft, and four themes (the council, the patrons, the landscape and the monuments). Section 12 holds your comments and answers of 2026-10-25, and it outranks the sections before it. `docs/plans/magisterial-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/magisterial-themes-triage.md` (batches MG1 to MG17). Batch MG1 wrote this sheet, put the types into the data, retired the 64 cut rows, changed four cards in place (Civic Granaries, The Honoured Dead, The Living Canon and The Masters' Domain), and gave the three deferred rows their new text and tier. Batch MG2 built the fourteen cards of Tiers 0 and I whose shapes already existed: The Prytaneion, The Polemarch, The Court Painter, The Cornerstone, The Repertory, The Second Reading, The Nomarchs, The Workshop at Olympia, The Overseers of Works, The Siting Masters, The Keepers of Wonders, The Ceremonial Guard, The Unveiling and The Encyclopedia. Batch MG3 built eleven cards of Tiers II to IV: The Prefects, The Symposium, Letters Patent, The Quarter of Masters, The Gazetteers, The Seven Sights, The Boule, The Roll of Masters, The Garden Courts, The Privy Council and The Bulwark of Marvels. It also dealt The Golden Age and The Magister's Court, which had waited for it. Each uses shapes that already existed, except The Bulwark of Marvels, which needed one new field: a town's defence counted from every wonder the empire holds, not only the wonders in that town. The Quarter of Masters is a new data row; the retired Expansionist row of the same name stays as it was. Batch MG4 built the cards that count your collection and the wonder commissions: Commission: The Eighth Wonder, Commission: The Roll of the Senate, Commission: The Wonder of the Age, The Universal Library and The Polymath's Study, and gave the shared Travelling Players its new text. It added two counts (the Orders you hold, and the different decks among them or among your seated cards), one commission figure (the Orders you hold) and two moments a commission counts (a wonder you complete, and the production you put into a wonder or the Magnum Opus). Batch MG5 built the cards that read the price of an Order hand: The Open Door, The Accessions Register and The Unwritten Chapter. A hand now keeps the culture you paid for it, and a reroll keeps that price. The moment you draft a card and the moment you pass on a hand both carry the price, so a card can pay a share of it. A free hand has no price. The Open Door's discount is read in one place, which every screen and bot asks for the price of the next hand. Batch MG6 built the cards that change a hand: The Wandering Muse, Officials by Merit and The Hall of Wonders. A card may now forbid the reroll of an Order hand, a card may widen a hand by a count (one card for every two wonders), and a card may hand over a great person when you draft it. Each later batch sets its own rows to `implemented`.
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
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch MG1 the types are in the data. A Magisterial card fits only a chair of its own type or a Wildcard chair. A card in a Wildcard chair still counts as its own type, so the Assembly Hall of The Senate Charter counts only Wildcard cards (the triage's reading 42). The sync test checks this column for every row in the data, the shared table's included.
- **Charters:** none. Every card takes a chair. The three boons (The Wandering Muse, The Cabinet of Curiosities and The Grand Retrospective) pay when you draft them and do nothing seated.
- **Doctrines:** none yet. Each of Tiers I to IV has an empty Doctrine table above its Orders. They are being written in `docs/plans/magisterial-doctrines.md`, and a triage of their own builds them.
- **The old sheet** (61 cards, in the old format, last reviewed 2026-10-07) is in git history: `git show 7d4064dc:docs/decks/magisterial.md`.

| Tier | Implemented | Modify | Add | All |
|---|---|---|---|---|
| Tier 0 | 10 | 0 | 0 | 10 |
| Tier I | 14 | 0 | 1 | 15 |
| Tier II | 12 | 0 | 5 | 17 |
| Tier III | 8 | 0 | 9 | 17 |
| Tier IV | 6 | 1 | 5 | 12 |
| **All** | **50** | **1** | **20** | **71** |
| Shared | 17 | 2 | 0 | 19 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 4 | 4 | 1 |
| Tier I | 1 | 4 | 7 | 3 |
| Tier II | 1 | 4 | 9 | 3 |
| Tier III | 0 | 4 | 5 | 8 |
| Tier IV | 1 | 4 | 4 | 3 |
| **All** | **4** | **20** | **29** | **18** |
| Shared | 1 | 2 | 14 | 2 |

The deck holds 71 cards, and every one takes a chair: 10, 15, 17, 17 and 12 across Tiers 0 to IV. By rarity they are 15 common, 32 uncommon and 24 rare. The deck has seven commissions: four leave an institution and three a one-time reward (see "Open for your pass").

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Prytaneion** | uncommon | implemented | Each town gains +1 food for each card you have seated. | Economic |
| **The Polemarch** | common | implemented | Your units gain +2 strength for each Military card you have seated. | Military |
| **The Court Painter** | common | implemented | Each card you draft grants 15 renown. A charter counts. | Civic |
| **The Cornerstone** | common | implemented | Towns that hold no wonder build wonders 30% faster. | Economic |
| **Civic Granaries** | common | implemented | Monuments give +1 food and +1 production. | Economic |
| **Master Masons** | common | implemented | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. | Economic |
| **The Temple of the Muses** | common | implemented | Culture buildings give +2 faith each. | Civic |
| **The Repertory** | common | implemented | Culture buildings give +1 culture each. | Civic |
| **The Second Reading** | uncommon | implemented | The first reroll of each hand is free. | Wildcard |
| **Commission: The Eighth Wonder** | uncommon | implemented | Commission. Complete a wonder while this is seated. Then, for the rest of the game, each wonder you hold gives +3 culture and +5 renown. The card leaves its chair. | Civic |

## Tier I

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Nomarchs** | uncommon | implemented | +1 authority for every two cards you have seated. | Civic |
| **Commission: The Roll of the Senate** | uncommon | implemented | Commission. Hold ten Orders. Then, for the rest of the game, you have one more Wildcard chair. The card leaves its chair. | Wildcard |
| **The Wandering Muse** | uncommon | implemented | On draft: gain a free great-person draft. Seated, this card does nothing. | Civic |
| **The Workshop at Olympia** | common | implemented | +2 renown a turn for each wonder you hold. | Civic |
| **The Overseers of Works** | uncommon | implemented | Each time you gain a great person, your capital gains 100 production for each age you have reached. | Economic |
| **The Laureate** | uncommon | implemented | Cities working a great-person improvement gain +5 culture, +3 science and +1 renown, once per city. | Civic |
| **The Landmark Bounds** | uncommon | add | Laying a great-person work claims every unowned hex beside it. | Economic |
| **The Siting Masters** | common | implemented | Great-person works gain +1 culture for each hill, mountain, forest or water hex beside them, at most +3. | Civic |
| **The Guild of Masons** | uncommon | implemented | Gain +38% production toward wonders. Cities producing a wonder lose 2 gold per turn. | Economic |
| **The Keepers of Wonders** | common | implemented | +2 happiness for each wonder you hold. | Civic |
| **The Ceremonial Guard** | common | implemented | Towns holding a wonder gain +5 defence. | Military |
| **The Unveiling** | uncommon | implemented | Completing a wonder deals you a free Order hand. | Wildcard |
| **The Open Door** | uncommon | implemented | Order hands cost 15% less culture. | Wildcard |
| **The Working Court** | rare | implemented | Cities with a Monument gain production equal to 30% of their base culture, excluding conversion outputs. | Economic |
| **The Encyclopedia** | common | implemented | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | Civic |

## Tier II

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Grand Vizier** | rare | add | The card in your first Economic chair pays its yields twice. | Wildcard |
| **The Senate Charter** | uncommon | implemented | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +30% production toward buildings. | Civic |
| **The Prefects** | uncommon | implemented | +5% production for each Economic card you have seated. | Economic |
| **The Sed Festival** | rare | add | Each time you adopt a government, gain a free great-person draft. | Civic |
| **The Symposium** | uncommon | implemented | Each time you gain a great person, you are dealt a free Order hand. | Wildcard |
| **Letters Patent** | uncommon | implemented | Your great people's acts pay 50% more. | Civic |
| **The Honoured Dead** | uncommon | implemented | While seated, this card gains +2 science and +4 production in your capital each time you spend a great person, up to +30 science and +60 production. | Civic |
| **Commission: The Patron's Gallery** | uncommon | add | Commission. Have great-person works of three different families in your borders. Then gain a free great-person draft and 200 culture. The card leaves its chair. | Wildcard |
| **The Quarter of Masters** | common | implemented | A great-person work beside another great-person work yields its own yield again. This never stacks. | Civic |
| **The Gazetteers** | uncommon | implemented | +3% production and gold for each great-person work in your borders, at most +30%. | Economic |
| **The Custodians** | common | add | Your units standing on a great-person work gain +4 strength. | Military |
| **The Seven Sights** | uncommon | implemented | +5% culture and science for each wonder you hold, at most +30%. | Civic |
| **The Golden Age** | rare | implemented | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. | Civic |
| **The Envious Eye** | uncommon | add | When a rival completes a wonder you were building, the production you put into it moves to the next item in that town's queue. | Economic |
| **The Accessions Register** | uncommon | implemented | Each card you draft grants your capital production equal to half the culture its hand cost. | Economic |
| **The Learned Patron** | uncommon | implemented | Cities with at least two culture buildings gain science equal to 15% of their base culture, at most +18 science per city. Conversion outputs are excluded. | Civic |
| **The Unwritten Chapter** | common | implemented | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. | Civic |

## Tier III

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Mixed Constitution** | rare | add | Your cards fit any chair. | Wildcard |
| **The Pandects** | uncommon | add | +5% science and production for each Doctrine you hold. | Civic |
| **Commission: The Golden Bull** | uncommon | add | Commission. Have every Military, Economic and Civic chair hold a card of its own type. Then you are offered a Doctrine of your government's tier. The card leaves its chair. | Wildcard |
| **The Boule** | uncommon | implemented | +2% science and culture for each card you have seated. | Civic |
| **The Universal Genius** | rare | add | Your great people arrive with two charges: each may act and then lay a work. Each still leaves one legacy. | Civic |
| **The Roll of Masters** | uncommon | implemented | +3% science and culture for each great person you have gained this game, at most +30%. | Civic |
| **The Living Canon** | rare | implemented | Your cities gain +4% food and +4% production per distinct great-person family whose legacy you currently hold, at most +20% each. | Economic |
| **The Divine Proportion** | rare | add | The bonuses your cards give great-person works are doubled. | Wildcard |
| **The Masters' Domain** | uncommon | implemented | Worked great-person works give +3 food and +3 production. | Economic |
| **The Garden Courts** | uncommon | implemented | Towns working at least two great-person works gain +20% culture and science. | Civic |
| **Commission: The Paradise Garden** | rare | add | Commission. Have a great-person work with three other works or tended hexes beside it. Then every unowned hex within three hexes of it joins your borders. The card leaves its chair. | Wildcard |
| **Magnificence** | rare | add | You may buy a wonder you are building with culture, one culture for each hammer it still needs. | Economic |
| **The Wonder Commonwealth** | rare | implemented | Cities containing a wonder gain +38% production and +38% food. Your cities without a wonder gain +15% culture instead. | Economic |
| **Commission: The Wonder of the Age** | uncommon | implemented | Commission. Put 1,500 production into wonders or the Magnum Opus while this is seated; production in a wonder a rival finishes first still counts. Then gain 250 culture, and for the rest of the game one more Wildcard chair. The card leaves its chair. | Wildcard |
| **Officials by Merit** | rare | implemented | Order hands deal two extra cards. You cannot reroll Order hands. | Wildcard |
| **The Second Sitting** | rare | add | Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once. | Wildcard |
| **The Cabinet of Curiosities** | rare | add | On draft: add a random card of your tier from a deck you do not hold to your collection. Seated, this card does nothing. | Wildcard |

Tier III has no Military card (section 8 of the themes pass). The Military cards of Tiers 0 to II and the partner deck's fill the Military chairs of the tier-18 governments.

## Tier IV

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Privy Council** | rare | implemented | Each of your cards that pays production pays +1 more production wherever it pays it. | Wildcard |
| **The Immortals** | rare | add | The legacies of your great people count twice. | Civic |
| **The Last Commission** | rare | modify: deferred | Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once. | Economic |
| **The Processional Way** | rare | add | Great-person works in a straight line of three or more give +3 culture and +3 science each. | Civic |
| **The Pull of the Masters** | rare | add | At the start of each turn, each of your great-person works takes one hex beside it that a rival owns and no rival town works. A town centre and a rival's own works are never taken. | Economic |
| **Commission: The Ideal City** | rare | add | Commission. Have one of your towns hold two wonders and work three great-person works. Then, for the rest of the game, that town gains +25% culture, science and production. The card leaves its chair. | Wildcard |
| **The Magister's Court** | uncommon | implemented | Cities containing a wonder gain +25% production toward the Magnum Opus. | Economic |
| **The Hall of Wonders** | rare | implemented | Order hands deal one more card for every two wonders you hold, at most two more. | Wildcard |
| **The Bulwark of Marvels** | uncommon | implemented | The town building your Magnum Opus gains +4 defence for each wonder you hold. | Military |
| **The Universal Library** | rare | implemented | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. | Economic |
| **The Polymath's Study** | rare | implemented | Your towns gain +8% science and production for each different deck among the cards you hold, at most +40%. | Civic |
| **The Grand Retrospective** | rare | add | On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Magisterial or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch MG1 every shared row carries the type below. The cards shared with Dominion, Expansionist, Scientific, Commerce and Devotion carry the types those sheets give them. Batch MG1 typed Sacred Commissions (Economic) and Sacred Patronage (Civic) as the Devotion build plan types them (the triage's reading 47). Devotion batch DV1 gave both rows the same types.
- **Retired in batch MG1:** The Imperial Examinations and Triumphal Arches, both shared with Dominion. Both sheets cut them.
- **Changed by other batches:** Commerce batch T1 moved The Brokers' Redraw to the shared file and Travelling Players to Tier II. Batch R1 (2026-10-25) changed The Art Dealers to +3 gold for each card seated in your government.
- **Moved in Devotion batch DV1** (`docs/plans/devotion-themes-triage.md`): The Painted Chapels, The Festival Calendar and The Penitents' Roll came here from the Devotion file, with their ids, texts, tiers and rarities, and are typed Civic. Sacred Commissions moved from Tier I to Tier II, because it pays only in a town with a holy site.
- **Who builds what:** this plan built Travelling Players' new text in batch MG4, and builds Sacred Patronage in batch MG8. The Devotion build plan (`docs/plans/devotion-themes-triage.md`) built The Rising Nave in batch DV3. It pays while the front row of a town's queue is a Cathedral or a wonder, the Magnum Opus included (that plan's reading 18). Whichever batch changes a shared row changes it on every sorted sheet that lists it, in the same batch (the triage's reading 47).
- **Each pair's early shared card:** Scientific, Illuminated Treatises (Tier 0); Dominion, The Sword of State (Tier I); Expansionist, Garden Cities (Tier I); Commerce, The Art Dealers (Tier I); Devotion, The Painted Chapels (Tier I).

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | common | Scientific | 0 | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic |
| **The Sword of State** | common | Dominion | I | implemented | On draft: the best melee unit you can build is trained in your capital. It costs no upkeep. Seated, this card does nothing. | Military |
| **Garden Cities** | uncommon | Expansionist | I | implemented | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. | Civic |
| **The Art Dealers** | common | Commerce | I | implemented | +3 gold for each card seated in your government. | Economic |
| **The Painted Chapels** | uncommon | Devotion | I | implemented | Religious buildings give +3 culture each. | Civic |
| **Examinations of State** | rare | Dominion | II | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. | Civic |
| **Garden Provinces** | common | Expansionist | II | implemented | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **Looted Art** | uncommon | Dominion | II | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **Travelling Players** | uncommon | Commerce | II | implemented | Foreign routes from a town with a Monument gain +2 culture for each different deck among your seated cards. | Civic |
| **The Brokers' Redraw** | rare | Commerce | II | modify: as built | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. | Wildcard |
| **The Festival Calendar** | uncommon | Devotion | II | implemented | Cities keeping a rite gain +30% food and +30% culture. | Civic |
| **The Penitents' Roll** | uncommon | Devotion | II | implemented | +6 science and +6 culture for every Order hand you reroll while this is seated. Rerolls cost 30% less faith while this is seated. | Civic |
| **Sacred Commissions** | uncommon | Devotion | II | implemented | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | Economic |
| **The Sculpted Landscape** | uncommon | Expansionist | III | implemented | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. | Civic |
| **The Cosmopolitan Court** | rare | Commerce | III | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic |
| **Sacred Patronage** | rare | Devotion | III | modify: deferred | Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn. | Civic |
| **The House of Wisdom** | uncommon | Scientific | III | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic |
| **The New Code** | rare | Dominion | III | implemented | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Wildcard |
| **The Rising Nave** | rare | Devotion | III | implemented | While a city is building a Cathedral or a wonder, it gains +1 faith and +1 culture for every 10% of the work already done. | Civic |

- **Travelling Players** took its new text in batch MG4 (the triage's reading 46). It counts the decks among the cards in your chairs: a card that two decks share counts for both, and the cards that belong to no deck count together as one more (reading 8). The Commerce sheet lists the same text.
- **The Brokers' Redraw** plays as built: the rule is live, but no button offers the gold redraw yet.

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects (the triage's reading 43). The last section of `docs/plans/magisterial-list-proposed.md`, "Cut by this pass", gives the old text of the cards this pass cut and the reason for each cut. The old sheet (`git show 7d4064dc:docs/decks/magisterial.md`) gives the reasons for the cuts of 2026-10-06.

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
  - **The Mixed Constitution leaving its chair** (question 2). The plan re-seats the council at once by the ordinary rule (reading 24).
  - **The Golden Bull with no Doctrine to offer** (question 3). The plan has the card wait in its chair until a Doctrine of the government's tier can be offered (reading 19).
  - **The readings** (question 4). The build uses readings 1 to 47 until you mark one.
  - **Magisterial's Doctrines:** none designed yet (`docs/plans/magisterial-doctrines.md`).

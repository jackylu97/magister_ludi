# The Magisterial deck: the full list with the builds pass folded in

This is a review list, made on 2026-10-18. It joins two files:
- the deck sheet, `docs/decks/magisterial.md` (the spec of record);
- the builds pass of 2026-10-17, `docs/plans/magisterial-builds.md`.

It is not the spec of record. The sheet is unchanged. Each row shows the card as the pass proposes it: its tier, its rarity and its text. The Status column says what the pass changed, so you can see both the sheet's version and the proposal.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changed the text, and the data still has the old text), `deferred` (in the data but not dealt), `as built` or `wording`. The ability shown is the target.
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the builds pass, not on the sheet. `new; charter` is a new card that works once drafted and takes no chair.
  - `proposed: …` follows the status when the pass changes a sheet card: `moved from Tier X`, `rarity was Y`, `trimmed` (one effect dropped), `charter` (made into a charter), `number changed`, or `rewritten`. The bracket says what the sheet had.
- **Type:** the chair a card fits (Military, Economic, Civic or Wildcard), from the pass's type sort. A Wildcard card fits only a Wildcard chair.
- **Build:** the build or builds the pass seats the card in: the Salon, the Cabinet, the Patrons, the Marvels, the Landscape, or the base under all five. "Alternative" means the pass names the card as an alternative for that build. A boon is a card that pays once when drafted.
- **Doctrines:** Magisterial has none yet. They come after the sheet, one for each build.
- **Cut cards are not listed.** The sheet cut 61 rows in `data/decks/magisterial.json`, and 49 of them are still dealt. The pass recommends retiring them when the deck is built (its question 2). The sheet also cut two shared rows, The Imperial Examinations and Triumphal Arches, and the pass recommends retiring those too (its question 9).
- **One reading with no row of its own:** a free Order hand pays the Salon's payers nothing, because they pay from the culture the hand cost.

| Tier | Implemented | Modify | Add | New | All | With a proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 2 | 1 | 8 | 2 | 13 | 2 |
| Tier I | 3 | 0 | 11 | 6 | 20 | 4 |
| Tier II | 3 | 1 | 8 | 7 | 19 | 4 |
| Tier III | 1 | 3 | 7 | 10 | 21 | 1 |
| Tier IV | 0 | 2 | 11 | 1 | 14 | 0 |
| No tier yet | 0 | 0 | 0 | 2 | 2 | 0 |
| **All** | **9** | **7** | **45** | **28** | **89** | **11** |
| Shared | 11 | 2 | 2 | 0 | 15 | 1 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard | Not set |
|---|---|---|---|---|---|
| Tier 0 | 0 | 6 | 6 | 1 | 0 |
| Tier I | 1 | 4 | 11 | 4 | 0 |
| Tier II | 1 | 4 | 9 | 5 | 0 |
| Tier III | 0 | 5 | 7 | 9 | 0 |
| Tier IV | 1 | 4 | 6 | 3 | 0 |
| No tier yet | 0 | 0 | 0 | 0 | 2 |
| **All** | **3** | **23** | **39** | **22** | **2** |
| Shared | 1 | 2 | 11 | 1 | 0 |

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Second Reading** | common | add | The first reroll of each hand costs no faith. | Wildcard | Salon |
| **The Critics' Circle** | common | add | +1 science and +1 culture for each Order hand you have rerolled while this is seated, at most +10 of each. | Civic | Salon |
| **The Patient Eye** | common | add | Passing on an Order hand returns 25% of the culture it cost to your draft pool. | Civic | Salon (alternative) |
| **Gifts at Court** | common | add | On draft: your capital gains 40 production. Seated, this card does nothing. | Economic | Cabinet (boon) |
| **The Repertory** | common | add | Culture buildings give +1 culture each. | Civic | base |
| **Master Masons** | common | implemented | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. | Economic | base |
| **Civic Granaries** | common | modify: revised | Monuments give +1 food and +1 production. | Economic | base |
| **The Temple of the Muses** | common | implemented | Culture buildings give +2 faith each. | Civic | base, Salon |
| **The Cornerstone** | common | add; proposed: trimmed (drops 40 renown on the first wonder); proposed: number changed (was +25%) | +30% production toward wonders until you complete your first. | Economic | Marvels |
| **The Court Painter** | common | add; proposed: number changed (was 5 renown) | Each card you draft grants 15 renown. A charter counts. | Civic | Cabinet, Patrons |
| **The Markstones** | common | add | Completing a culture building in a city claims the next tile that city's borders would take. | Economic | Landscape |
| **The Prodigy** | common | new | +50% renown until you gain your first great person. | Civic | Patrons |
| **The Long Borders** | common | new | Your borders grow 25% faster. | Economic | Landscape |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Unwritten Chapter** | common | add | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. | Civic | Salon |
| **The Rotating Chairs** | common | add | Cards you seat are sealed for half as long before they can be moved. | Wildcard | Cabinet (alternative) |
| **The Swearing-In** | common | add | Each time you seat a card, gain 15 culture. A card pays this once per government. | Civic | Cabinet (alternative) |
| **The Landmark Bounds** | uncommon | add | Placing a great-person work of any family claims every unowned tile beside it. | Economic | Landscape |
| **The Open Door** | uncommon | add; proposed: number changed (was 10%) | Order hands cost 15% less culture. | Wildcard | Cabinet |
| **The Unveiling** | uncommon | add; proposed: trimmed (drops the 30 culture) | Completing a wonder deals you a free Order hand. | Wildcard | Marvels |
| **Commission: The Salon Season** | uncommon | add | Commission. Goal: reroll or pass on four Order hands while this is seated. Reward: a free Order hand and 100 culture. Then it leaves its chair. | Wildcard | Salon (alternative) |
| **The Accessions Register** | uncommon | add | Each card you draft while this is seated grants 20 culture and 20 production in your capital. A charter counts. | Civic | Cabinet |
| **The Wandering Muse** | uncommon | add | On draft: gain a random great person of your age, of any family. This great person counts as called: your next one needs more renown, as usual. Seated, this card does nothing. | Civic | Cabinet (boon), Patrons |
| **The Laureate** | uncommon | implemented | Cities working a great-person improvement gain +5 culture, +3 science and +1 renown, once per city. | Civic | Patrons, Landscape |
| **The Guild of Masons** | uncommon | implemented | Gain +38% production toward wonders. Cities producing a wonder lose 2 gold per turn. | Economic | Marvels |
| **The Working Court** | rare | implemented | Cities with a Monument gain production equal to 30% of their base culture, excluding conversion outputs. | Economic | base |
| **The Encyclopedia** | common | add; proposed: moved from Tier II | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | Civic | Cabinet |
| **The Disputation** | uncommon | add; proposed: moved from Tier IV; proposed: rarity was rare; proposed: rewritten (was: science equal to each reroll's faith price, even when free) | The first time you reroll each Order hand, gain science equal to half the culture the hand cost. | Civic | Salon |
| **The Atelier** | common | new | The first time you reroll each Order hand, your capital gains production equal to half the culture the hand cost. | Economic | Salon |
| **The Portrait Gallery** | uncommon | new | While seated, this card gains +2 science and +2 culture each time you spend a great person. It starts at +2 of each. | Civic | Patrons |
| **The Pension List** | uncommon | new; charter | Once drafted, you may pay culture into your renown: every 2 culture counts as 1 renown. No chair required. | Civic | Patrons |
| **The Keepers of Wonders** | common | new | Each town gains +2 culture and +2 science for each wonder in it. | Civic | Marvels |
| **The Ceremonial Guard** | common | new | Towns holding a wonder gain +5 defence. | Military | Marvels |
| **The Office of Works** | uncommon | new; charter | Once drafted, each of your towns may raise one Landmark in its borders for culture: 100 for each age you have reached. No chair required. | Civic | Landscape |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Siting Masters** | common | add | Great-person works gain +1 culture for each hill, mountain, forest or water tile beside them, at most +3. | Civic | Landscape |
| **The Quarter of Masters** | common | add | Great-person works beside another great-person work gain their base yield again. This never stacks. | Civic | Landscape |
| **The Salon des Refusés** | uncommon | add; proposed: charter | Once drafted, you may reroll an Order hand with culture from your draft pool instead of faith, at twice the faith price. No chair required. | Wildcard | Salon |
| **The Subscription List** | uncommon | add; proposed: charter | Once drafted, you may pay gold into your draft pool: every 3 gold counts as 1 culture toward your next Order hand. No chair required. | Wildcard | Cabinet |
| **Commission: The Patron's Gallery** | uncommon | add | Commission. Goal: have great-person works of three different families inside your borders. Reward: a great person of the family of your choice, and 200 culture. Then it leaves its chair. | Wildcard | Patrons |
| **The Learned Patron** | uncommon | implemented | Cities with at least two culture buildings gain science equal to 15% of their base culture, at most +18 science per city. Conversion outputs are excluded. | Civic | base |
| **The Performers' Treasury** | uncommon | implemented | Cities with at least two culture buildings gain gold equal to 30% of their base culture, excluding conversion outputs. | Economic | base |
| **The Senate Charter** | uncommon | implemented | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +30% production toward buildings. | Civic | base, Cabinet (alternative) |
| **The Archive** | rare | add; proposed: charter | Once drafted, when you pass on an Order hand you may keep one card from it, unseated. If you keep one, the hand counts as drafted, not passed: it refunds nothing, pays no card that pays for passing, and resets your pass count. No chair required. | Wildcard | Salon, Cabinet |
| **The Antechamber** | rare | add | While you hold this card, seated or not, you have one extra wildcard chair. | Wildcard | every build |
| **The Golden Age** | rare | modify: deferred, revised | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. | Civic | Marvels |
| **The Envious Eye** | uncommon | add; proposed: moved from Tier IV; proposed: trimmed (drops the free Order hand) | When a rival completes a wonder you were building, the production you had put into it moves to the next item in that city's queue instead of being refunded as gold. | Economic | Marvels |
| **The Jury's Register** | uncommon | new | +1% science and culture for each Order hand you have rerolled or passed this game, at most +30%. | Civic | Salon |
| **The Roll of Masters** | uncommon | new | +3% science and production for each great person you have gained this game, at most +30%. | Civic | Patrons |
| **The Twice-Told Act** | uncommon | new | Your great people's acts pay 50% more. | Civic | Patrons |
| **The Book of Marvels** | uncommon | new | +5% culture and science for each wonder you hold, at most +30%. | Civic | Marvels |
| **The Catalogue** | uncommon | new | +1% production and gold for each Order you hold, at most +30%. | Economic | Cabinet |
| **The Gazetteers** | uncommon | new | +3% production and gold for each great-person work in your borders, at most +30%. | Economic | Landscape |
| **The Custodians** | common | new | Your units standing on a great-person work gain +4 strength. | Military | Landscape |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Grand Lottery** | uncommon | add; proposed: number changed (was 150 of each) | On draft: one of these at random: a free Order hand, a great-person hand, or 500 culture, 500 faith or 500 production in your capital. Seated, this card does nothing. | Civic | Cabinet (boon) |
| **The Commissioned Works** | uncommon | add | You may buy buildings with culture from your draft pool, at one culture for every two gold of the price. A building bought this way counts as bought for cards that read purchases, but pays nothing to cards that read gold or faith paid. | Economic | base |
| **The Patron's Choice** | uncommon | add | When you seat this, choose culture, science, production or gold. Your cities gain +10% of that yield while it stays seated. | Wildcard | Cabinet (alternative) |
| **Commission: The Wonder of the Age** | uncommon | add | Commission. Goal: put 1,500 production into wonders or the Magnum Opus while this is seated. Production in a wonder a rival finishes first still counts. Reward: one extra wildcard chair for the rest of the game, and 250 culture. Then it leaves its chair. | Wildcard | Marvels |
| **The Masters' Domain** | uncommon | modify: revised | Worked great-person improvements give +3 production and +3 food. Their cities gain +20% gold, once per city. | Economic | Patrons, Landscape |
| **The Honoured Dead** | uncommon | modify: revised | Your capital gains +2 science and +4 production per distinct great person you have spent this game, at most +30 science and +60 production. | Civic | Patrons |
| **Officials by Merit** | rare | add | Order hands deal two extra cards. You cannot reroll Order hands. | Wildcard | Cabinet |
| **The Cabinet of Curiosities** | rare | add | On draft: add a random card from any deck's pool to your collection, chosen from the cards the game rates most helpful to you. Seated, this card does nothing. | Wildcard | Cabinet (boon) |
| **Commission: The Paradise Garden** | rare | add | Commission. Goal: have a great-person work beside fresh water with other works or tended tiles on three of its other sides. Reward: claim every tile within three hexes of it, and 300 culture. Then it leaves its chair. | Wildcard | Landscape |
| **The Living Canon** | rare | modify: revised | Your cities gain +4% food and +4% production per distinct great-person family whose legacy you currently hold, at most +20% each. | Economic | Patrons |
| **The Wonder Commonwealth** | rare | implemented | Cities containing a wonder gain +38% production and +38% food. Your cities without a wonder gain +15% culture instead. | Economic | Marvels |
| **The Hanging Committee** | common | new | Your capital gains +2 science and +2 culture for each Order hand you have rerolled or passed this game, at most +50 of each. | Civic | Salon |
| **The Long Gallery** | uncommon | new | Each town gains +1 science and +1 culture for every four Orders you hold. | Civic | Cabinet |
| **The Universal Genius** | rare | new | Each of your great people arrives with a second charge: it may act, and then also lay down a work. | Civic | Patrons |
| **The Laurel Crowns** | uncommon | new | When you gain a great person, gain culture equal to half the renown it cost. | Civic | Patrons |
| **The Garden Courts** | uncommon | new | Towns working at least two great-person works gain +20% culture and science. | Civic | Landscape |
| **Magnificence** | rare | new | You may buy a wonder you are building with culture, at one culture for each hammer it still needs. | Economic | Marvels |
| **The Second Sitting** | rare | new | Each time you pass on an Order hand you paid culture for, a free Order hand opens at once. | Wildcard | Salon |
| **The Prix de Rome** | uncommon | new | After you pass on two Order hands in a row, your next Order hand deals only rare cards. | Wildcard | Salon |
| **The Connoisseurs** | rare | new | You may draft a second card from each Order hand by paying its culture cost again. | Wildcard | Cabinet |
| **The Divine Proportion** | rare | new | The bonuses your Orders give to great-person works are doubled. | Wildcard | Landscape |

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Magister's Court** | uncommon | modify: deferred, revised (the data row is at Tier III) | Cities containing a wonder gain +25% production toward the Magnum Opus. | Economic | Marvels |
| **The Universal Library** | rare | add | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. | Economic | Cabinet |
| **The Last Commission** | rare | modify: deferred (the data row is at Tier III) | Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once. | Economic | Patrons |
| **The Polymath's Study** | rare | add | Your cities gain +8% science and +8% production for each different deck among the Orders you hold, seated or not, at most +40%. Common cards count as one deck; a card shared by two decks counts for both. | Civic | Cabinet |
| **The Grand Salon** | rare | add | Cards that pay you for rerolling, passing, drafting or seating a card pay 50% more, caps included. Commission rewards are not raised. | Wildcard | Salon, Cabinet |
| **The Processional Way** | rare | add | Great-person works of any family standing in a straight line of three or more touching hexes give +3 culture and +3 science each. Works in a line of five or more also give +3 production each. | Civic | Landscape |
| **The Hall of Wonders** | rare | add | Order hands deal one extra card for every two wonders you hold, at most three extra. | Wildcard | Marvels, Cabinet |
| **The Bulwark of Marvels** | uncommon | add | The city building your Magnum Opus gains +4 strength and +25 hit points for each wonder you hold, at most +24 strength and +150 hit points. | Military | Marvels |
| **The Pull of the Masters** | rare | add | At the start of each turn, each of your great-person works takes one tile beside it that belongs to a rival and that no rival city is working. A city centre and a rival's own great-person works are never taken. | Economic | Landscape |
| **The Royal Invitation** | rare | add | Any great person of yours, of any family, may be spent beside a rival city that is building the Magnum Opus. That city puts half as much production toward the Opus for 5 turns. Each rival can be slowed this way once every 15 turns. | Civic | Patrons |
| **Commission: The Ideal City** | rare | add | Commission. Goal: one of your cities holds two wonders and works three great-person works. Reward: that city claims every unowned tile within three hexes and gains +25% culture, science and production for the rest of the game; you are dealt two free Order hands. Then it leaves its chair. | Wildcard | Landscape, Marvels |
| **The Grand Retrospective** | rare | add | On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing. | Civic | Cabinet (boon) |
| **The Long Deliberation** | uncommon | add | Each time you pass on an Order hand, gain renown equal to half the culture the hand cost. | Civic | Salon |
| **The Immortals** | rare | new | The legacies of your great people count twice. | Civic | Patrons |

## No tier yet

The pass names these two of your ideas from `docs/themes/09-the-court.md` as alternatives for the Patrons. It gives them no tier, rarity or type.

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Shortlist** | not set | new | Each great-person hand comes with one free redraw. | not set | Patrons (alternative) |
| **The Farewell Games** | not set | new | Spending a great person gives +3 happiness for 15 turns. | not set | Patrons (alternative) |

## Shared with another deck

These rows live in `data/decks/common.json`, except the two marked `add`, which have no data row yet. A type marked "to reconcile" is the pass's proposal, to settle with that deck's pass.

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Travelling Players** | Commerce | 0 | uncommon | modify: revised | Foreign routes from a city with a Monument gain +1 culture; additional +2 culture for every unique deck type slotted in your government. | Civic (to reconcile) |
| **Illuminated Treatises** | Scientific | 0 | common | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic (to reconcile) |
| **Garden Cities** | Expansionist | I | uncommon | implemented | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. | Civic |
| **Sacred Commissions** | Devotion | I | uncommon | implemented | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | Economic (to reconcile) |
| **The Sword of State** | Dominion | I | common | implemented | On draft: the best melee unit you can build is trained in your capital. It costs no upkeep. Seated, this card does nothing. | Military |
| **The Art Dealers** | Commerce | I | common | add | Each card you draft grants 15 gold. | Economic (to reconcile) |
| **Examinations of State** | Dominion | II | rare | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. | Civic |
| **Garden Provinces** | Expansionist | II | common | implemented; proposed: keep (the sheet recommended a cut) | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **Looted Art** | Dominion | II | uncommon | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **The Sculpted Landscape** | Expansionist | III | uncommon | implemented | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. | Civic |
| **The Cosmopolitan Court** | Commerce | III | rare | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic (to reconcile) |
| **Sacred Patronage** | Devotion | III | rare | modify: deferred | Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn. | Civic (to reconcile) |
| **The House of Wisdom** | Scientific | III | uncommon | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic (to reconcile) |
| **The New Code** | Dominion | III | rare | implemented | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Wildcard |
| **The Rising Nave** | Devotion | III | rare | add | While a city is building a Cathedral or a wonder, it gains +1 faith and +1 culture for every 10% of the work already done. | Civic (to reconcile) |

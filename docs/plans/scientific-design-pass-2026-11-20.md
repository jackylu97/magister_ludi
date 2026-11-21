# Scientific design pass (2026-11-20)

**Status, 2026-11-20, round two:** your rulings on all 68 changes and the five questions are folded in. Fourteen new changes (69 to 82) answer what you asked for, and none of them is ruled. Five questions are open. Nothing is built, and no game data changed in this pass.

Your request, 2026-11-20:

> *"ok lets do a pass on devotion and scientific."*

> *"I think base science and culture is a bit too strong, i think i want to nerf the passive science from population, and the base science and culture buildings that scale off population."*

Your words on round one:

> *"ok i commented on the scientific deck"*

> *"your analysis is good, my immediate reaction is that we need to also add science to this deck."*

> *"this deck seems to have plenty of science now."*

- This file is the current state. Section 1 is round two: what changed, and each open point. Section 2 holds the new changes. Section 3 is the deck after your rulings and round two. Section 4 gives every change of round one with your words.
- The record of round one (the diagnosis, the notes and the 68 entries as first proposed) is at the foot, with the section of your rulings that the coordinator added.
- The base rates changed after round one (`docs/flags.md`, "Base science, culture and unit prices"): a citizen gives 0.25 science, a Library +3, a University +6, an Amphitheater +4 culture, a soldier costs its size plus 80%, and technology prices stay. The arithmetic of this round uses them, and the bot study `docs/plans/benchmarks/base-economy-2026-11-20.md`: a mean seat makes 6 science at turn 50 and 95 at turn 100, and a median seat 483 at turn 150. Seats reach age II at about turn 63, age III at 94 and age IV at 129.
- I ran no bot games in this round. Every number is a first guess to tune in playtest.
- The review page keeps the anchors `change-01` to `change-68`. The new changes are `change-69` to `change-82`, and the open points are `r2-1` to `r2-13` and `r2-q1` to `r2-q5`.

## 1. Round two

### r2-1. Your rulings are folded in

- Of the 68 changes: 42 are approved as proposed, 12 carry your text, 10 are cut by you, 3 are sent back for a new design (08, 24, 41), and 1 is not adopted (53: the price of a charter technology stays).
- **Your lines, word for word:** 05 The Clay Map, 11 The Royal Estates, 18 The Charter Rolls, 26 The Armoury Patterns, 27 The City Architects, 29 The Alfonsine Tables, 36 the Tophane, 37 The Second Seat, 50 The Laboratories, 59 The Volley Fire. 66 moves to Tier III and 68 to Tier I.
- **Cut by you:** the star tower (07), The Summa (30), The Prototype Works (31), The Age of Reason (33), The Foundation Stone (40), The Great Instrument (42), The Republic of Letters (44), charters in two tiers (54), The Natural Histories (55) and The Nassau Reforms (58).
- **The deck:** 71 cards if you approve round two, from 68 today. 12 of today's cards are retired, 8 new cards of round one are approved, and round two proposes 7 more. 17 charters, from 13. 15 Doctrines and 18 shared cards.
- **No card of this deck is a purchase discount,** so the ruling "gold buys more" changes nothing here. The Doctrine The Workshops of Syracuse raises a price, which that ruling does not cover. The lumber mill at +2 production and the coastal rule change no card of the deck.

- **To rule:** Nothing to rule.

### r2-2. 01: should The Herbalists' Charter be shared with Expansionist?

- **Recommended: no** (change 69). A shared card is dealt on one draft in four. Shared, this deck's seat would be offered the garden in about one game in eight, where it is one game in three as the deck's own common.
- The Expansionist seat gains the garden's benefits only when it is paired with this deck, and then the keyword already does the work: the garden is a unique improvement, so The Cadastre and Commission: The Reclaimed Lands read it.
- **What changes on each sheet** is in the entry's notes, for both answers.

- **To rule:** Rule on change 69.

### r2-3. 05: unit abilities

- The Clay Map takes your line: "Scouts gain +1 sight and receive double bonuses from discoveries." A map holds seven or eight ruins and villages on each continent. A find pays 7 science, 7 culture, 15 faith, 20 food, 20 production, 25 gold, or a scout or a worker. A seat that claims four finds with scouts gains about 60 to 80 more yield in Tier 0, which is a Tier 0 lump (50 to 100). A reading to confirm: a find that grants a unit grants two.
- **Three more cards of that kind,** each an ability and not a number:
- **The Corps of Works** (change 70, Tier I): workers build unique improvements for no charge.
- **The Surgeons' Charter** (change 71, Tier II): every unit heals on a turn in which it moves or fights.
- **The Flying Columns** (change 72, Tier III): units of your current age ignore enemy zone of control.
- The deck already holds four abilities from round one and before: the archer line moves after it shoots and catapults gain range (the Mechanists' Charter), research upgrades with no strategic resource and heals (The Model Army), great scholars act twice (The Collected Works), and the archer line attacks twice (the Doctrine The Volley Fire).
- **One I tested and dropped:** siege units that need no line of sight. In this game only mountains block a shot (`blocksLineOfSight`), so the ability would almost never matter.

- **To rule:** Rule on changes 70, 71 and 72.

### r2-4. 08: the qanat as one hex

- **The ground rule:** flat land beside a hill or a mountain, one in each town.
- **The yields:** +2 food and +1 production, and +1 food more for each hill or mountain beside it.
- It waters nothing. It reads the high ground that its water comes from, as the baray reads farms and the hillfort reads farms, pastures and camps.

| Unique improvement | Ground | Its own yield | What it reads beside it |
|---|---|---|---|
| Physic Garden (0) | flat land with fresh water, one in each town | +2 science, +2 happiness | +1 science for each forest or jungle hex |
| Smelter (0, new) | any land, one in each town | +1 production | +1 production and +1 science for each mine or quarry |
| Qanat (I) | flat land beside a hill or a mountain, one in each town | +2 food, +1 production | +1 food for each hill or mountain |
| For comparison: baray (Expansionist, III) | flat land beside a river, one in each town | +2 food | +2 production for each farm |
| For comparison: hillfort (shared, II) | a hill, one in each town | +2 production; a unit on it defends at +5 | +1 production for each farm, pasture or camp |

- **To rule:** Rule on change 73.

### r2-5. 09: a name for the Specularium

- **Recommended: the Glasshouse,** opened by the technology Glassmaking, with the charter's name kept (change 74).
- **The Greenhouse,** your own word. Then the charter is better named The Gardeners' Charter, because a greenhouse does not say glass.
- **The Forcing House,** the old word for a heated glass house. It is exact, and few players know it.

- **To rule:** Pick a name. Question r2-q5.

### r2-6. 24: a charter for a science empire building, and the check with 11 and 37

- **The Archivists' Charter** (change 75) opens the Great Archive, one in your empire: +5 science for each charter technology you know.
- **Why this count.** I tested five. Science for each empire building grows as the square of the copies under The Second Seat. Science for each science building asks the seat to build more Libraries, which is the habit the diagnosis found. A doubler for one town's schools pays about +20. Science for each technology known is the Aldine Press's line for culture. Charter technologies are the deck's own keyword, the seat must choose and research each one, and the count is linear.
- **The three together.** The Royal Estates (11) makes every empire building half as slow to build and pays its town +3 and +3. The Second Seat (37) doubles the buildings. With the Archive: two Archives pay +10 science for each charter technology, 80 for eight. That is strong and not broken.
- **The broken cases are two older cards.** The Invitations grants a great scholar for every empire building completed, so second copies are fourteen more scholars. The Royal Academies pays +5% production and culture for each empire building, so twenty-eight buildings are +140%. Changes 76 and 77 count kinds, not copies.
- **For the builder to check:** that a second Chart the Stars, The Turning Heavens or The Alchemical Codex grants no second bead, and that the Magnum Opus is not a building The Second Seat can copy.

- **To rule:** Rule on changes 75, 76 and 77. Question r2-q3.

### r2-7. 26: timing attacks as a play pattern

- **What a timing attack is in this game.** Research upgrades every unit of a line in place, for no cost. On the turn a military technology lands, the seat's army is one age ahead: +10 to +15 strength. With the new unit prices the free upgrade is worth more: six Legionaries become six Longswordsmen, which is 1,866 hammers of difference. You named the other half yourself: build the cheap unit before the technology lands.
- **What the pattern holds after your rulings:**
- **The strength:** The Armoury Patterns (+3 for units of your current age), The War Manuals (+2 for ranged units), The Edge of the Sword (+3 against an empire that knows less), The Palace Schools (+4 on units from a town with an empire building), and the charters: the Bronze-Founders' (+2 on two lines), the Alchemists' (+1 for each charter technology on the warrior line), the Tophane (+4 and 50% faster).
- **The moment:** The Alfonsine Tables lands a technology on the turn of the draft. The Lodge Books lands one when a wonder completes. The Model Army upgrades with no strategic resource and heals the unit.
- **The reward:** Field Academies (science for a kill, by age) and Carried-Off Scholars (a technology for a captured city, which opens the next window).
- **The abilities:** the Mechanists' Charter (catapults +1 range, archers move after they shoot), and the Doctrines The Volley Fire and The Workshops of Syracuse.
- **What it lacks:** nothing pays on the turn the window opens, and nothing keeps a small army in the field. You cut The Nassau Reforms, The Prototype Works and The Proving Ground, so the pattern has no card that says "now".
- **Two cards and a charter make the window real.** The Ordinance Companies (change 78) grants a melee unit and a ranged unit in the capital when the seat enters an age. The Surgeons' Charter (change 71) heals units that move and fight. The Flying Columns (change 72) lets units of the current age walk past zone of control.
- **One I did not write:** +4 strength against units of an older age. It pays only the seat that is already winning the fight, which is your reason against the first The Edge of the Sword.

- **To rule:** Rule on change 78.

### r2-8. 41: The Closed Book

- **Recommended: make it a charter, at Tier III** (change 79).
- In a chair the card is idle until Alchemy, which is thirty to fifty turns. A charter holds no chair, and its price is a technology of 1,960 science, which the seat pays in this deck's own currency.
- "Keep it as is" leaves it a Tier IV rare. Section 1.8 of the record gives the chance that a seat is offered a named Tier IV rare: 4% of games, and Tier IV would hold six cards and two rares.

- **To rule:** Rule on change 79. Question r2-q2.

### r2-9. 54: more charters

- After your rulings the deck holds 12 charters: you cut the star tower and The Naval Gunners' Charter. Round two adds five: three new charters, the charter for the science empire building, and The Closed Book as a charter.
- Each new charter opens something new: a work (the smelter), a rite (the Night Watch), a building (the Great Archive), an ability for every unit (Surgery), and a rule for the last technology (Ciphers).
- Two charters become common so that they are seen: The Surveyors' Charter (change 73) and the new The Surgeons' Charter.
- A charter technology costs what an ordinary one costs (your ruling on 53). The tree is slower now, so I place each new charter technology in the cheapest column of its age: Smelting 24, Astronomy 100, Record-Keeping and Surgery 360, Ciphers 1,960. The three old fourth-age charter technologies stand at 3,250. That is 7 turns for a median seat at turn 150 and 34 turns at turn 100. If that is too much, your chart can place them at 1,960.

| Tier | Charters today | After your rulings | After round two | A hand shows a charter | The seat sees one in the tier |
|---|---|---|---|---|---|
| 0 | 1 | 1 | 2: the Herbalists', the Smelters' | 20% | 59% of games |
| I | 4 | 4 | 5: the Glassmakers', the Surveyors', the Librarians', the Bronze-Founders', the Observers' | 23% | 79% |
| II | 4 | 4 | 6: the Paper-Makers', the Physicians', the Mechanists', the Printers', the Archivists', the Surgeons' | 30% | 94% |
| III | 2 | 3 | 4: the Military Engineers', the Alchemists', the Gunfounders', The Closed Book | 25% | 90% |
| IV | 2 | 0 | 0 | none | none |
| **All** | 13 | 12 | **17** |  |  |

- The last column uses 4, 6, 8 and 8 hands in Tiers 0 to III. A seat whose game ends early in Tier III has four hands there: 68%.
- Today the same figures are 33%, 60%, 62% and 57%. A seat is offered about 5.4 of the 17 charters, where it is offered 3.0 of 13 today. With The Charter Rolls seated it is offered one in every hand.
- Tier IV has no charter. Its technology would cost 1,960 science or more in the last turns of the game, and you cut two of the three Opus cards that I moved down.

- **To rule:** Rule on changes 80 and 81.

### r2-10. 68: The Blessed Forges stays, at Tier I

- Your ruling overrules the cut in both passes. Change 82 writes the row for both sheets: Tier I, uncommon, Civic, the same text.
- **For the Devotion agent:** your change 58 does not stand. The pair shares six cards: The Monastery Libraries, The Schoolmen's Charter, The Priest-Astronomers and The Blessed Forges in Tier I, The Cloister in Tier II and The Monastic University in Tier III.

- **To rule:** Nothing to rule.

### r2-11. The notes after your rulings

- **A. Discovery: deeds that complete a technology.** You cut The Summa, The Age of Reason, The Great Instrument and The Foundation Stone. What is left: one boon of this deck (The Alfonsine Tables) and two shared cards (The Lodge Books, Carried-Off Scholars). Five cards pay on the moment: The Royal Workshops, The Astronomical Diaries, The Scholars' Fame, The Journeymen and the shared The Royal Patents. **This note is now too thin to draft toward.** I would leave it so: the three deeds are good cards alone, and you found the capstones dull.
- **B. The plan and the window.** This note is the strongest after round two: 14 cards. The plan: The Reform of the Calendar, Commission: The Old Learning, The Translation Movement, The City Architects. The window: The Armoury Patterns, The Ordinance Companies, The Flying Columns, The Model Army, The War Manuals, The Clay Map, The Edge of the Sword, The Palace Schools, The Strategikon, The Breaching Batteries. Six charters serve it.
- **C. The learned land.** You cut the star tower, The Natural Histories and The Republic of Letters. The works are three (the Physic Garden, the qanat, the smelter), and the Glasshouse reads farms. Round the Academy: The Old Academy, The Latin Quarter, The Lecture Halls, The Nizamiyya and Commission: The Lynx-Eyed Academy. With the scholars' cards the note holds 11 cards and four charters. It is sound. You said that the deck has "too many academy synergies", so I add none.
- **Charters,** the engine: 17, with three cards that deal or count them (The Charter Rolls, The Royal Charter Commission, The Great Catalogue), the Great Archive, the Alchemists' trait and The Secret Arts.
- **Schools and institutions:** 11 cards and six charters. It lost Learned Foundations, The Common Tables and Enduring Institutions, and it gained the Great Archive.
- **Great cities: 3 cards** (The Free Cities, The Round City, The Queen of Cities) and two Doctrines. **This note is thin too.** You ruled on 2026-10-20 that the Scientific seat plays tall, and science no longer comes from citizens, so a tall town earns less than it did. If you want one card here, a candidate in one line: *The Tall Houses*, Tier II, common: towns of ten or more citizens gain +1 production and +1 culture for each building in them.
- **The lead:** The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms. Small, as you answered on question 1.

| Note | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| Discovery: the moment and the deeds | 1 | 2 | 1 | 1 | 1 | 6 |
| The plan: the age you are in | 0 | 2 | 2 | 0 | 0 | 4 |
| The window: the army | 2 | 1 | 4 | 2 | 1 | 10 |
| The lead | 0 | 1 | 0 | 0 | 0 | 1 |
| The learned land: works, Academies, scholars | 1 | 1 | 4 | 4 | 1 | 11 |
| Schools and institutions | 0 | 6 | 1 | 3 | 1 | 11 |
| Great cities | 0 | 1 | 1 | 1 | 0 | 3 |
| Towns, buildings and deeds in general | 4 | 1 | 0 | 0 | 0 | 5 |
| Charters dealt or counted | 0 | 1 | 1 | 0 | 1 | 3 |
| Charters | 2 | 5 | 6 | 4 | 0 | 17 |
| **All** | 10 | 21 | 20 | 15 | 5 | **71** |

- Each card is counted once. The Edge of the Sword is counted in the window, and The Sum of Knowledge in discovery.

- **To rule:** Say if you want a card for great cities or for the deeds. I recommend neither now.

### r2-12. Science: what the deck pays, by tier, under the new base rates

- **17 of the 71 cards pay science** (24%), and none of them pays for a citizen.
- **Tier 0 (6):** The Scribes (+1 a town), The Curators of Works (+1 a public work), The Apprentices (a fifth of each building's cost), the Physic Garden (+2, and +1 a wood), the smelter (+1 a mine or quarry beside it), The House of Life (half the capital's production). The Clay Map doubles a find of 7 science.
- **Tier I (5):** The Scribes' Hall (+2 a Library, on a Library that now pays 3), The Sky Watchers (+2 a Shrine), the Glasshouse (+1 a farm), the Night Watch (a town's production), The Forward Plans (a University early, which is +6).
- **Tier II (4):** the Scriptorium (+2, and +10% beside an Academy), The Latin Quarter (+2 on the seven hexes of an Academy), The Lecture Halls (+2 a science building, on each Academy), the Great Archive (+5 a charter technology).
- **Tier III (2):** The Nizamiyya (Academies +50%) and the reward of Commission: The Lynx-Eyed Academy (+5 on each Academy). **Tier IV: none.**
- **Is it enough?** Yes, through Tier II. A mean seat makes 6 science at turn 50. One smelter, two gardens and The House of Life add about +10, so the deck can more than double a seat's science in the first age. At turn 100 a mean seat makes 95. A seat with eight Libraries under The Scribes' Hall (+16), eight gardens (+28), a Great Archive with five charter technologies (+25) and one Academy under The Latin Quarter (+10) adds about +80 before any percentage. So you were right on change 53: the deck has plenty of science in its first three tiers.
- **Tier III and Tier IV add little science of their own,** and both Tier III cards need an Academy. I do not think that is a fault. By then the science is the flat sums of the earlier tiers under the percentages, the scholars (The Collected Works, The Invisible College), and the Doctrine The Universitas, which now doubles flat Libraries and Universities. The base-economy study found a seat at 15,400 science a turn at turn 150 from two cards of other decks, so the top end is the thing to watch, not the bottom.
- **Cards that read science get smaller in the middle game:** The Humanists (a quarter of 95 is +24 culture at turn 100) and a scholar's treatise (eight turns of 95). They are at full size late, when a median seat makes 483.

| Card or rule | What changed | The arithmetic now |
|---|---|---|
| 10 The Scribes' Hall | A Library pays 3 flat | A Library with the card pays 5. Eight Libraries: +16, a sixth of a mean seat at turn 100. Ibn al-Haytham doubles it to 10 each. |
| The Forward Plans | A University pays 6 flat | An early University is +6 science in one town for 520 hammers. It no longer grows with the town. |
| 64 The Founders' Schools | A Library pays 3 flat | A new town starts with +3 science. At turn 60 that is a fifth of a seat's science for each town founded. |
| The Doctrine The Universitas | Flat buildings | In a town of twelve: a Library 6 and a University 12. In a small town: 1.5 and 3. |
| 29 The Alfonsine Tables | The tree is slower | At turn 90 a seat makes about 60 science, and its dearest technology costs 650 to 1,150: 11 to 19 turns of research, where it was 8 to 13. The price is 30% of fifteen turns of gold, about 180 gold for a seat that makes 40. |
| 65 The Lodge Books | The tree is slower | A third-age wonder ends a technology of 360 to 1,150: 4 to 12 turns of a mean seat at turn 100. |
| 66 Carried-Off Scholars | The tree is slower | A fourth-age technology of 1,960 to 5,150 for a captured city: 4 to 11 turns of a median seat at turn 150. |
| 16 The Reform of the Calendar | Ages come later | Seats reach age II at about turn 63, not 45. A seat that drafts the card in Tier I enters all three ages with it: three drafts. |
| 17 Commission: The Old Learning | The tree is slower | The twelve first-age technologies cost 269 science. At 6 science a turn the goal is met at about turn 60 to 75. |
| 25 The Translation Movement | The tree is slower | A third off the old age saves the same science, which is now more turns: about 1,700 science is 18 turns at turn 100. |
| 57 The Jixian Academy | Fewer technologies a turn | In age 3 a technology of about 700 comes every seven turns: +20 culture a turn, where I wrote +40. |
| The Royal Workshops, The Journeymen, The Scholars' Fame | Fewer technologies a turn | Each pays the same for a technology. Technologies come about a fifth less often in the middle game. |
| 34 The Humanists | Science is lower in the middle game | +24 culture at turn 100 and +120 at turn 150. |
| 50 The Laboratories | Your line | A town with a Library, a University and a Scriptorium gains +30% production. |
| 26 and the army cards | A soldier costs 80% more | A Swordsman costs 55 hammers, a Legionary 97, a Longswordsman 408. A free upgrade and a free unit are worth more, and The Workshops of Syracuse (+50% cost) is dearer: a Legionary at 146. |
| 53 Charter technologies | The ordinary price, and a slower tree | Optics (190) is 10 to 19 turns at turn 60. Printing (650) is 7 turns at turn 100. The fourth-age three (3,250) are 7 turns at turn 150. |

- **To rule:** Nothing to rule.

### r2-13. The recount

- 71 cards: 10, 21, 20, 15 and 5 by tier. 16 Military, 18 Economic, 34 Civic and 3 Wildcard. 32 common, 29 uncommon and 10 rare.
- 17 charters, 2 boons, 3 commissions and 1 scaler. 52 cards take a chair.
- **Rares.** A named rare is the deck's card in 10% of Tier 0 hands, 3.3% in Tier I, 5% in Tier II, 3.3% in Tier III and 10% in Tier IV. A seat is offered it at least once in 34%, 18%, 34%, 24% and 27% of games.
- **Tier II has two rares** (The Invitations and The Alfonsine Tables) since you cut The Summa and The Prototype Works. Each is seen a little more often than a Tier II uncommon (5% against 3.3%). I would accept that.
- **Military** is 16 cards, six of them charters. Tier I still has one Military card that takes a chair, The Edge of the Sword.
- **Shared cards: 18.** Dominion 3, Expansionist 3, Commerce 3, Devotion 6, Magisterial 3.
- **Doctrines: 15** (3, 4, 5 and 3). Tier I lost The Peripatetic School to Tier II and did not gain The Natural Histories. Tier II did not gain The Nassau Reforms.
- Section 3 has every table.

- **To rule:** Say if a count looks wrong.

### Questions for you

Five questions change the build. Each has my recommended answer.

- **r2-q1. Is The Herbalists' Charter shared with Expansionist?** Recommended: no. Shared, this deck's seat sees its own garden in one game in eight. The keyword already lets Expansionist's cards read the garden when the decks are paired (change 69).
- **r2-q2. The Closed Book: a charter at Tier III, or as it is?** Recommended: a charter at Tier III (change 79). It then holds no chair for the thirty to fifty turns before Alchemy, and the seat that wants it can find it.
- **r2-q3. May The Invitations and The Royal Academies count kinds of empire building, not copies?** Recommended: yes (changes 76 and 77). With your line for The Second Seat they pay fourteen more scholars and +140%. If you want the large case as a prize for three rares, reject both.
- **r2-q4. May a charter of this deck open a rite, which costs faith?** Recommended: yes (change 81). The price is small, The Blessed Forges and The Sky Watchers pay it, and the rite's real cost is the town's production. If no, the charter opens a project in its place: a town turns two hammers into one science, with no faith.
- **r2-q5. The name: the Glasshouse or the Greenhouse?** Recommended: the Glasshouse, with the technology Glassmaking, so that The Glassmakers' Charter keeps its name (change 74).

## 2. The new changes (69 to 82)

| # | Card | Tier | Change | Answers your comment on | Confidence | Ruling |
|---|---|---|---|---|---|---|
| 69 | The Herbalists' Charter stays in this deck | 0 | keep | 01 | good |  |
| 70 | The Corps of Works | I | new | 05 | good |  |
| 71 | The Surgeons' Charter | II | new | 05 and 54 | good |  |
| 72 | The Flying Columns | III | new | 05 and 26 | speculative |  |
| 73 | The Surveyors' Charter: the qanat as one hex | I | rework | 08 | good |  |
| 74 | The Glassmakers' Charter: the Glasshouse | I | rework | 09 | good |  |
| 75 | The Archivists' Charter | II | new | 24 | good |  |
| 76 | The Invitations | II | rework | 24 and 37 | strong |  |
| 77 | The Royal Academies | III | rework | 37 | good |  |
| 78 | The Ordinance Companies | II | new | 26 | good |  |
| 79 | The Closed Book as a charter | III | rework | 41 | good |  |
| 80 | The Smelters' Charter | 0 | new | 54 | good |  |
| 81 | The Observers' Charter | I | new | 54 | good |  |
| 82 | The Blessed Forges at Tier I | II to I | move | 68 | good |  |

### 69. The Herbalists' Charter stays in this deck (keep)

- **Tier, rarity, type:** 0, common, Civic (Charter)
- **Answers:** your comment on change 01
- **Now:** A card of this deck. You asked: "should this be a shared card with expansionist?"
- **Proposed:** No. It stays this deck's own card, with the text you approved in change 01.
- **Why:** A shared card is dealt in the hand's third position on one draft in four, and Tier 0 has four drafts. So sharing the card takes it away from the seat that needs it. Your ruling of 2026-10-21 made the garden this deck's one source of happiness. The Expansionist seat loses nothing: the garden is a unique improvement by that pass's keyword, so The Cadastre and Commission: The Reclaimed Lands read it whenever the two decks are paired. Expansionist also opens ten works of its own and an eleventh with Dominion.
- **Arithmetic:** As this deck's common, a seat is offered the card in 34% of games. As a shared card it competes with seven or more shared cards for one hand: about one game in eight.
- **Synergy:** **Reads:** forest and jungle beside the garden, with Expansionist's The Totem Poles, The Timber Yards and The Hedgerows, when the two decks are paired.
- **Shape:** No change beyond change 01.
- **Confidence:** good
- **Depends, joins and notes:** **If the answer is yes:** the row moves to `data/decks/common.json` with both decks. This deck's sheet lists it in the shared table, Tier 0 holds nine cards and one charter (the smelter of change 80), and the pair shares four cards. The Expansionist sheet's shared table goes from 17 to 18, and its list of unique improvements gains nothing new, because the garden is on it already. **If the answer is no:** this deck's sheet takes the new text, and the Expansionist sheet does not change.

### 70. The Corps of Works (new)

- **Tier, rarity, type:** I, common, Economic
- **Answers:** your comment on change 05
- **Now:** Not in the deck.
- **Proposed:** Building a unique improvement costs your workers no charge.
- **Why:** You wrote: "I like the idea of having unique abilities for units." This is the worker's ability. A seat of this deck has a garden, a qanat and a smelter to build in each town, and each one takes a charge from a worker that now costs 14 hammers and more. With the card the works are free to place, so the seat places all of them.
- **Arithmetic:** A worker has three charges and costs 14 hammers, and each worker built adds 4. Three works in each of five towns are 15 charges, five workers: about 110 hammers, and the turns to build them. Paired with Expansionist the seat has up to thirteen kinds of work.
- **Synergy:** **Raises:** unique improvements built. **Reads:** the keyword unique improvement. Expansionist's Commission: The Reclaimed Lands (build 8 unique improvements) is met sooner, and its The Cadastre pays each work +3 science. Devotion's stone circle and cliff monastery are works too, if that pass keeps them.
- **Shape:** Small extension: the rule `tendedWorksFree` waived the charge for tended works. It needs the test for a unique improvement in its place.
- **Confidence:** good

### 71. The Surgeons' Charter (new)

- **Tier, rarity, type:** II, common, Military (Charter)
- **Answers:** your comment on change 05 and 54
- **Now:** Not in the deck.
- **Proposed:** Opens Surgery: your units heal every turn, even on a turn in which they move or fight.
- **Why:** This is an ability for every unit, bought with science, and it takes no chair. A unit heals today only on a turn in which it does nothing. A small army that heals while it marches and fights stays in the field for the whole of its window. It is the sustain half of a timing attack.
- **Arithmetic:** A unit heals 10 health a turn if it rested (`healing.perTurnIfRested`). In a five-turn assault each unit gains 50 health of 100, so six units fight like nine. Surgery stands in the cheapest column of the third age: 360 science, four turns for a seat that makes 95.
- **Synergy:** **Raises:** health in the field. It joins The Armoury Patterns, The Model Army (an upgrade heals the unit) and The Ordinance Companies (change 78). Dominion's Field Surgeons heals 10 more while fortified, so the pair heals in both cases. It is one more charter technology for the Alchemists' Charter, The Great Catalogue and the Great Archive (change 75).
- **Shape:** New rule on the technology row: a behaviour rule read in the healing phase (`turn.ts`). A technology may carry card effects. New charter technology row `surgery`.
- **Confidence:** good
- **Depends, joins and notes:** The name is near Dominion's Field Surgeons. If that is a problem: The Bone-Setters' Charter.

### 72. The Flying Columns (new)

- **Tier, rarity, type:** III, uncommon, Military
- **Answers:** your comment on change 05 and 26
- **Now:** Not in the deck.
- **Proposed:** Units of your current age ignore enemy zone of control.
- **Why:** It is an ability, and it works in the window. Zone of control makes a unit stop when it walks beside an enemy unit. An army of the new age that walks past the enemy's line reaches the town and the siege engines behind it.
- **Arithmetic:** A step beside an enemy unit costs 1 more movement (`zocExtraCost`), which stops a unit of 2 movement. With the card it does not. It adds no strength: your line for The Armoury Patterns set the strength at +3.
- **Synergy:** **Reads:** the age of each unit, as The Armoury Patterns does. It joins The Model Army and The Ordinance Companies.
- **Shape:** Existing rule `ignored` (the reward of Dominion's Commission: The Chosen Men), with the unit filter `newestAge` of change 26.
- **Confidence:** speculative
- **Depends, joins and notes:** If zone of control matters less in play than I think, this is the first of the three to drop.

### 73. The Surveyors' Charter: the qanat as one hex (rework)

- **Tier, rarity, type:** I, uncommon to common, Economic (Charter)
- **Answers:** your comment on change 08
- **Now:** Round one: one qanat in each town, on flat land beside a hill or a mountain; every hex within two hexes has fresh water. Your words: "give the qanat yields and change to a single hex. this is easier to read and reason about."
- **Proposed:** Opens Surveying: you may build the Aqueduct early, and workers may dig one qanat in each town, on flat land beside a hill or a mountain: +2 food and +1 production, and +1 food more for each hill or mountain beside it.
- **Why:** A qanat brings water from under the hills to the plain. So the ground rule is flat land at the foot of high ground, and the yield reads the high ground beside it. It is one hex with one line, as the baray and the hillfort are. It waters nothing else, so the player does not have to read two rings.
- **Arithmetic:** A qanat with two hills or mountains beside it pays 4 food and 1 production on top of the ground's own yield: a hex of 6 or 7, where a watered farm is 4. With four beside it: 6 food and 1 production. It works on flat desert, which yields nothing by itself. The Expansionist pass counted hills in the first three rings of 90% of starts. Surveying costs 100 science.
- **Synergy:** **Raises:** food, unique improvements. **Reads:** hills and mountains beside it. Expansionist's The Cadastre gives it +3 science and Commission: The Reclaimed Lands +1 food and +1 production. The Corps of Works (change 70) builds it for no charge. Nezahualcoyotl's seat gains the early Aqueduct and a food hex in each town.
- **Shape:** Data on the row `qanat`: yields, one in each town, a placement test "flat land beside a hill or a mountain", and the yield "for each hex beside it that…" of the Expansionist build. `watersBeside` goes.
- **Confidence:** good
- **Depends, joins and notes:** The card becomes a common, so that the seat sees one more charter in Tier I (block r2-9).

### 74. The Glassmakers' Charter: the Glasshouse (rework)

- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Answers:** your comment on change 09
- **Now:** Opens Optics, which unlocks the Specularium: +3 food, and +1 science for each farm its town works.
- **Proposed:** Opens Glassmaking, which unlocks the Glasshouse: +3 food, and +1 science for each farm its town works.
- **Why:** You asked for a name that says what the building does. Glasshouse is the plain English for a specularium, and glassmakers build it, so the charter keeps its name. Optics is the science of lenses and has nothing to do with a farm, so the technology becomes Glassmaking.
- **Its science rides on:** The land: farms the town works. It does not ride on population.
- **Arithmetic:** No number changes. A town works three to six farms: +3 food and +3 to +6 science for 118 hammers. Glassmaking costs 190 science.
- **Synergy:** No change. It reads farms, and the qanat is not a farm.
- **Shape:** Data only: two display names. The ids `specularium` and `optics` stay for saves.
- **Confidence:** good
- **Depends, joins and notes:** The other candidates: **the Greenhouse**, your own word, with the charter renamed The Gardeners' Charter; and **the Forcing House**, the old word for a heated glass house, which few players know.

### 75. The Archivists' Charter (new)

- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Answers:** your comment on change 24
- **Now:** Enduring Institutions is cut. Your words: "How about we add a charter that unlocks a new type of science based empire building."
- **Proposed:** Opens Record-Keeping, which unlocks the Great Archive, one in your empire: +5 science for each charter technology you know.
- **Why:** The deck's own mechanic is the charter, and no building reads it. The Great Archive makes every charter technology a source of science, so each charter a seat takes is worth two things: its own gift and +5 science. It is science from a choice, which is what you asked the deck to hold. It also answers "lets just add more charters": more charters are more science here.
- **Its science rides on:** A building, counted by charter technologies. It does not ride on population.
- **Arithmetic:** Record-Keeping is itself a charter technology, so the building starts at +5. A seat that knows four: +20 science at turn 100, where a mean seat makes 95. A seat that knows eight: +40. The building costs 231 hammers, and 154 with The Royal Estates' +50%. Record-Keeping stands in the cheapest column of the third age: 360 science.
- **Synergy:** **Raises:** science, empire buildings. **Reads:** charter technologies known. Fed by The Charter Rolls and by all seventeen charters. As an empire building it is read by The Royal Estates (+3 food, +3 production, and +50% toward it), The Royal Academies, The Invitations and the Mouseion.
- **Shape:** New building row `greatArchive` (`oncePerEmpire`): `pays` in its town, basis count, `charterTechsKnown`, which exists. New charter technology row `recordKeeping`.
- **Confidence:** good
- **Depends, joins and notes:** **The check with changes 11 and 37.** The Royal Estates makes the Archive cheap and adds +3 and +3 to its town. The Second Seat allows a second Archive, so each charter technology then pays +10: 80 science for eight. That grows in a straight line and I would leave it. The broken cases are two older cards, in changes 76 and 77.

### 76. The Invitations (rework)

- **Tier, rarity, type:** II, rare, Civic
- **Answers:** your comment on change 24 and 37
- **Now:** Completing an empire building grants a great scholar.
- **Proposed:** The first time you complete each empire building, gain a great scholar.
- **Why:** Your new line for The Second Seat allows a second copy of every empire building. Each copy would grant a scholar: fourteen kinds are in reach, so fourteen more scholars, and each acts twice under The Collected Works. The Doctrine The Mustansiriya has the same fault today, with a copy in every Academy town. One scholar for each kind keeps the card as it plays now.
- **Arithmetic:** A seat builds eight to ten kinds of empire building in a game: eight to ten scholars from one rare, as today. A second copy costs 135 to 680 hammers, and half as many turns with The Royal Estates. A great person costs 500 to 1,000 renown at that time.
- **Synergy:** **Reads:** empire buildings completed, by kind. The Great Archive, the Mouseion, the Bimaristan, the Aldine Press and the Tophane each grant one.
- **Shape:** Small extension: the rider needs a mark for "once for each building kind".
- **Confidence:** strong
- **Depends, joins and notes:** It guards change 37.

### 77. The Royal Academies (rework)

- **Tier, rarity, type:** III, uncommon, Civic
- **Answers:** your comment on change 37
- **Now:** +5% production and culture for each empire building you hold.
- **Proposed:** +5% production and culture for each different empire building you hold.
- **Why:** With second copies, fourteen kinds are twenty-eight buildings: +140% production and culture in every town from one uncommon. Counted by kind it is +70% at the most, and about +40% for a seat that holds eight.
- **Arithmetic:** Eight kinds: +40%. Fourteen kinds: +70%. With second copies and the present text: +80% and +140%.
- **Synergy:** **Reads:** the kinds of empire building held. The second copies still pay The Royal Estates (+3 food and +3 production each) and the Mouseion (+2 culture each).
- **Shape:** Small extension: the count `empireBuildings` read by kind.
- **Confidence:** good
- **Depends, joins and notes:** It guards change 37. The Mouseion pays +2 culture for each empire building, copies included. With a second Mouseion that is 2 times 28 times 2, 112 culture. I would leave it.

### 78. The Ordinance Companies (new)

- **Tier, rarity, type:** II, uncommon, Military
- **Answers:** your comment on change 26
- **Now:** Not in the deck.
- **Proposed:** Entering a new age grants a melee unit and a ranged unit in your capital. They cost no upkeep.
- **Why:** You wrote that timing attacks "should be a play pattern for the scientific player". The window opens on the turn the seat enters an age. This card puts two fresh units in the capital on that turn, when the rest of the army begins to upgrade. Charles VII's ordinance companies of 1445 were the first standing army in Europe, raised by decree in one season.
- **Arithmetic:** Each grant is the strongest unit of its class the seat can build then, and it upgrades with the line. At age III: a Legionary (97 hammers) and a Composite Bowman (126). At age IV: a Longswordsman (408) and a Crossbowman (217). A seat that drafts the card in age II gains about 850 hammers of units in two grants, and pays no upkeep for them. A Tier II lump is 500 to 900.
- **Synergy:** **Raises:** units gained, at the moment `ageEntered`. **Reads:** ages entered, with The Reform of the Calendar. The units take The Armoury Patterns' +3 as soon as their line reaches the age. Fed by The Alfonsine Tables and The Lodge Books, which can land the first technology of an age on a chosen turn.
- **Shape:** The new shape of change 16 (a rider on `ageEntered`) with the unit grant that exists (`bestMelee`, `bestRanged`).
- **Confidence:** good
- **Depends, joins and notes:** Four units in a game are few, so the deck's rule of a small army holds.

### 79. The Closed Book as a charter (rework)

- **Tier, rarity, type:** III, uncommon, Civic (Charter)
- **Answers:** your comment on change 41
- **Now:** Tier IV rare, in a chair: If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. Your words: "lets keep it as is", then "OR: make it a charter so it doesn't need to be slotted, keep at tier 3".
- **Proposed:** Tier III, uncommon, a charter: Opens Ciphers: if you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns.
- **Why:** I recommend the charter. In a chair the card does nothing for thirty to fifty turns and then acts once, so the seat pays a chair for a promise. As a charter it costs a pick and a technology, which is this deck's own price, and it holds no chair. At Tier IV the median seat does not see it at all (section 1.9 of the record). It also gives Tier III a charter that is not about the army.
- **Arithmetic:** Ciphers stands in the first column of the fourth age: 1,960 science, four turns for a median seat at turn 150. Ten turns of a town that makes 150 production are 1,500 hammers of the Opus's 2,535.
- **Synergy:** **Reads:** Alchemy, first. It is one more charter technology for the Great Archive and the cards that count them. The Alfonsine Tables, The Lodge Books and a scholar's two treatises (The Collected Works) help the seat to be first.
- **Shape:** The rule `closedBook` exists. It moves from a card's effect to the effect of a charter technology. New charter technology row `ciphers`.
- **Confidence:** good
- **Depends, joins and notes:** If you keep it as it is, it stays a Tier IV rare in a chair, and Tier IV holds six cards.

### 80. The Smelters' Charter (new)

- **Tier, rarity, type:** 0, uncommon, Economic (Charter)
- **Answers:** your comment on change 54
- **Now:** Not in the deck.
- **Proposed:** Opens Smelting: workers may build one smelter in each town: +1 production, and +1 production and +1 science more for each mine or quarry beside it.
- **Why:** You cut the star tower because it punished building. This work rewards it. A smelter stands among the mines and learns from the ore, so the player puts it where two or three mines meet. It gives Tier 0 a second charter and the deck a third work, and it is science from the map in the first age.
- **Its science rides on:** The map: mines and quarries beside the smelter. It does not ride on population.
- **Arithmetic:** A smelter beside two mines pays 3 production and 2 science for one worker charge, where a mine pays 1 production. Beside three: 4 and 3. A mean seat makes 6 science at turn 50, so one smelter is a third of its science. Smelting stands beside Herbals: 24 science.
- **Synergy:** **Raises:** production and science on the map, unique improvements. **Reads:** mines and quarries beside it. Fed by The Prospectors' Notes (25 production for each mine or quarry built), and by the shared The Assay and The Exchange of Discoveries on the same hills. Expansionist's The Mountain Sluices and Old Workings pay the mines round it, and Commerce's The Mineral Trade adds gold.
- **Shape:** New improvement row `smelter`, one in each town, with the yield "for each hex beside it that…". It needs a model, an icon and a flair-gallery entry. New charter technology row `smelting`.
- **Confidence:** good
- **Depends, joins and notes:** Commerce's Mining Districts was cut because it asked for mines in a cluster and paid +2 gold. This reads the same cluster through one work that the player places once.

### 81. The Observers' Charter (new)

- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Answers:** your comment on change 54
- **Now:** Not in the deck.
- **Proposed:** Opens Astronomy: your towns may keep the Night Watch, a rite: for ten turns the town builds nothing, and gains science equal to its production.
- **Why:** This is the rite of research. It is a thing to do, and it has a real price: a town that watches the sky builds nothing. Devotion's The Sabbath Laws has the same rite for culture. The tree is slower now, so a seat will want to turn one town's hammers into science at the right time: before a new age, or in the last turns before Alchemy.
- **Its science rides on:** A choice: the production of the town that keeps the rite. It does not ride on population.
- **Arithmetic:** A rite costs 20 faith, and 5 more for each rite the seat has started. A capital that makes 15 production at turn 60 gains +15 science, where a mean seat makes about 10 to 20: it doubles research for ten turns and builds nothing. A town of 60 production late gains +60. One town kept on the rite all game costs about 4 faith a turn. Astronomy costs 100 science.
- **Synergy:** **Raises:** science by a choice. **Reads:** a town's production, so The Almanac, The Royal Estates, The Old Academy and The Laboratories feed it. It needs faith: The Sky Watchers, and the shared The Blessed Forges (change 82), The Monastery Libraries and The Priest-Astronomers, which pays for each town keeping a rite. Harun al-Rashid's seat has the faith.
- **Shape:** A rite row with `tech: astronomy` (rite rows name the technology that opens them). Small extension: `productionToScience`, the twin of the Sabbath's `productionToCulture`. New charter technology row `astronomy`.
- **Confidence:** good
- **Depends, joins and notes:** Question r2-q4: a rite costs faith, and this deck makes little. The other form is a project with no faith price, at two hammers for one science.

### 82. The Blessed Forges at Tier I (move)

- **Tier, rarity, type:** II to I, uncommon, Civic (shared with Devotion)
- **Answers:** your comment on change 68
- **Now:** Tier II. Round one proposed to cut it. Your words: "let's move this to tier 1".
- **Proposed:** Tier I, uncommon, Civic, shared with Devotion: Improved strategic resources gain +1 faith and +1 production.
- **Why:** Your ruling. At Tier I the card is early faith for this deck, which has one faith card of its own, and it pays for the first rites.
- **Arithmetic:** Two improved strategic resources at turn 60: +2 faith and +2 production. That is under the Tier I bar of 15 to 25, so the card is a small one. Two faith a turn pays for a Night Watch every ten to fifteen turns.
- **Synergy:** **Reads:** improved strategic resources, with the shared The Assay (+2 science on the same hexes). It feeds the rite of change 81.
- **Shape:** Data only: `band` 2 to 1.
- **Confidence:** good
- **Depends, joins and notes:** **For the Devotion pass:** the user overruled the cut that both passes proposed (this pass's change 68 and the Devotion pass's change 58). The row stays in `data/decks/common.json` with both decks, at Tier I, with its text unchanged. The pair then shares six cards, four of them in Tier I: The Monastery Libraries, The Schoolmen's Charter, The Priest-Astronomers and The Blessed Forges. The Devotion sheet's shared table needs this row at Tier I.

## 3. The deck after your rulings and round two

| Tier | Today | After | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare | Charters |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 10 | 2 | 4 | 4 | 0 | 6 | 3 | 1 | 2 |
| I | 19 | 21 | 2 | 6 | 12 | 1 | 10 | 8 | 3 | 5 |
| II | 17 | 20 | 6 | 3 | 10 | 1 | 9 | 9 | 2 | 6 |
| III | 12 | 15 | 5 | 2 | 7 | 1 | 5 | 7 | 3 | 4 |
| IV | 12 | 5 | 1 | 3 | 1 | 0 | 2 | 2 | 1 | 0 |
| **All** | 68 | **71** | 16 | 18 | 34 | 3 | 32 | 29 | 10 | 17 |

- The table counts changes 69 to 82 as approved. Without them the deck holds 64 cards and 12 charters.
- 17 charters, 2 boons (The Alfonsine Tables, The Invisible College), 3 commissions and 1 scaler. 52 cards take a chair.

**How often each card is seen:**

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare | A named rare is offered in |
|---|---|---|---|---|---|---|---|
| 0 | 6 | 3 | 1 | 10% | 10% | 10% | 34% of games |
| I | 10 | 8 | 3 | 6% | 3.75% | 3.3% | 18% |
| II | 9 | 9 | 2 | 6.7% | 3.3% | 5% | 34% |
| III | 5 | 7 | 3 | 12% | 4.3% | 3.3% | 24% |
| IV | 2 | 2 | 1 | 30% | 15% | 10% | 27% |

### Tier 0 (10 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Herbalists' Charter | Opens Herbals: workers may plant one Physic Garden in each town, on flat land with fresh water: +2 science and +2 happiness, and +1 science more for each forest or jungle hex beside it. | common | Civic (Charter) | approved (01) |
| The Royal Workshops | Completing a technology grants 15 production in your capital. | common | Economic | unchanged |
| The Curators of Works | Public works give +1 science and +1 happiness. | common | Civic | unchanged |
| The Scribes | +1 science in every town. | common | Civic | unchanged |
| The Apprentices | Finishing a building grants science equal to a fifth of its production cost. Wonders do not count. | common | Economic | approved (02) |
| The War Manuals | Your ranged units gain +2 strength. | common | Military | approved (03) |
| The Prospectors' Notes | Building a mine or a quarry grants its town 25 production. | uncommon | Economic | unchanged |
| The Clay Map | Scouts gain +1 sight and receive double bonuses from discoveries. | uncommon | Military | your text (05) |
| The Smelters' Charter | Opens Smelting: workers may build one smelter in each town: +1 production, and +1 production and +1 science more for each mine or quarry beside it. | uncommon | Economic (Charter) | new this round (80) |
| The House of Life | Your capital gains science equal to half its production. | rare | Civic | approved (06) |

### Tier I (21 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Bronze-Founders' Charter | Opens Casting: your spear and chariot lines gain +2 strength for good. | common | Military (Charter) | approved (19) |
| The Surveyors' Charter | Opens Surveying: you may build the Aqueduct early, and workers may dig one qanat in each town, on flat land beside a hill or a mountain: +2 food and +1 production, and +1 food more for each hill or mountain beside it. | common | Economic (Charter) | new this round (73) |
| The Scholars' Fame | Completing a technology grants scholar renown equal to a twentieth of its cost. | common | Civic | unchanged |
| The Royal Estates | Each empire building gives its town +3 food and +3 production. +50% production towards empire buildings. | common | Economic | your text (11) |
| The Edge of the Sword | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. | common | Military | approved (19) |
| The Scribes' Hall | Libraries give +2 science. | common | Civic | approved (10) |
| The Sky Watchers | Shrines give +1 faith and +2 science. | common | Civic | approved (12) |
| The Almanac | Libraries give +2 production. | common | Economic | unchanged |
| The Royal Tutors | +2 scholar renown each turn for each science building. | common | Civic | approved (04) |
| The Corps of Works | Building a unique improvement costs your workers no charge. | common | Economic | new this round (70) |
| The Glassmakers' Charter | Opens Glassmaking, which unlocks the Glasshouse: +3 food, and +1 science for each farm its town works. | uncommon | Civic (Charter) | approved (09); name, new this round (74) |
| The Librarians' Charter | Opens Cataloguing, which unlocks the Mouseion: +4 scholar renown, and +2 culture for each empire building you hold. | uncommon | Civic (Charter) | approved (19) |
| The Observers' Charter | Opens Astronomy: your towns may keep the Night Watch, a rite: for ten turns the town builds nothing, and gains science equal to its production. | uncommon | Civic (Charter) | new this round (81) |
| The Astronomical Diaries | Gains +1 culture and +1 production each time you complete a technology. | uncommon | Civic (Scaler) | unchanged |
| The Dedications | Finishing a science building or an empire building grants culture equal to its production cost. | uncommon | Civic | approved (13) |
| The Free Cities | While you hold at most five towns, your towns build buildings and wonders 20% faster. | uncommon | Economic | unchanged |
| Commission: The Old Learning | Goal: know every technology of the first age. Reward: choose a great scholar. | uncommon | Wildcard | approved (17) |
| The Charter Rolls | Your drafts contain an additional charter if one is available. | uncommon | Civic | your text (18) |
| The Forward Plans | You may build Universities before you know Scholarship. | rare | Civic | unchanged |
| The Reform of the Calendar | Entering a new age opens an Order draft at once. | rare | Civic | approved (16) |
| The Secret Arts | Each town gains +1 production for each technology you know that no empire you have met knows, charter technologies included, at most +5. | rare | Economic | approved (19) |

### Tier II (20 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Paper-Makers' Charter | Opens Papermaking, which unlocks the Scriptorium: +2 science, and +10% science beside an Academy. | common | Civic (Charter) | approved (32) |
| The Physicians' Charter | Opens Medicine, which unlocks the Bimaristan: +25% food in its town. | common | Economic (Charter) | approved (32) |
| The Surgeons' Charter | Opens Surgery: your units heal every turn, even on a turn in which they move or fight. | common | Military (Charter) | new this round (71) |
| The Roll of Scholars | +4% production and culture for each great scholar you have gained this game, at most +28%. | common | Civic | approved (32) |
| The Palace Schools | Units gained in a town with an empire building start with +4 strength. | common | Military | approved (32) |
| The City Architects | +30% production towards buildings and wonders of your current age. | common | Economic | your text (27) |
| The Strategikon | Your units gain +4 strength within two hexes of an Academy. | common | Military | approved (32) |
| The Armoury Patterns | Units of your current age gain +3 strength. | common | Military | your text (26) |
| The Old Academy | Academies gain +3 food and +3 production. | common | Economic | approved (20) |
| The Mechanists' Charter | Opens Mechanics: catapults gain +1 range, and your archer line may move after it shoots. | uncommon | Military (Charter) | approved (32) |
| The Printers' Charter | Opens Printing: +1 trade route, and you may build the Aldine Press, one in your empire: +1 culture for each technology you know. | uncommon | Civic (Charter) | approved (28) |
| The Archivists' Charter | Opens Record-Keeping, which unlocks the Great Archive, one in your empire: +5 science for each charter technology you know. | uncommon | Civic (Charter) | new this round (75) |
| The Royal Charter Commission | Goal: complete a charter technology. Reward: a great scholar and 100 culture. | uncommon | Wildcard | unchanged |
| The Translation Movement | Technologies of an age before your newest cost you a third less research. | uncommon | Civic | approved (25) |
| The Latin Quarter | Hexes on or beside an Academy gain +2 science and +1 culture. | uncommon | Civic | approved (22) |
| The Round City | +1% production and culture for each citizen in your capital, at most +30%. | uncommon | Civic | unchanged |
| The Lecture Halls | An Academy gains +2 science for each science building in its town. | uncommon | Civic | approved (21) |
| The Ordinance Companies | Entering a new age grants a melee unit and a ranged unit in your capital. They cost no upkeep. | uncommon | Military | new this round (78) |
| The Invitations | The first time you complete each empire building, gain a great scholar. | rare | Civic | new this round (76) |
| The Alfonsine Tables | On draft: complete the technology you are researching. −30% gold for fifteen turns. | rare | Civic (Boon) | your text (29) |

### Tier III (15 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Military Engineers' Charter | Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points. | common | Military (Charter) | approved (45) |
| The Journeymen | Completing a technology grants each town production equal to three times its population. | common | Economic | unchanged |
| The Nizamiyya | Academies yield 50% more. | common | Civic | approved (47) |
| The Doctorate | Gaining a great scholar grants culture equal to eight turns of your culture. | common | Civic | unchanged |
| The Humanists | Towns with a Library gain culture equal to a quarter of their science. | common | Civic | approved (34) |
| The Alchemists' Charter | Opens Chemistry: your warrior line gains +1 strength for each charter technology you know. | uncommon | Military (Charter) | unchanged |
| The Gunfounders' Charter | Opens Gunfounding, which unlocks the Tophane: its town builds military units 50% faster, with +4 strength. | uncommon | Military (Charter) | your text (36) |
| The Closed Book | Opens Ciphers: if you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | uncommon | Civic (Charter) | new this round (79) |
| The Royal Academies | +5% production and culture for each different empire building you hold. | uncommon | Civic | new this round (77) |
| The Model Army | Research upgrades your units even when you lack the strategic resource the new unit needs, and an upgrade heals the unit. | uncommon | Military | approved (35) |
| Commission: The Lynx-Eyed Academy | Goal: hold three Academies. Reward: a great scholar, and Academies gain +5 science and +5 culture. | uncommon | Wildcard | approved (43) |
| The Flying Columns | Units of your current age ignore enemy zone of control. | uncommon | Military | new this round (72) |
| The Second Seat | You may build a second copy of all empire buildings, while this is active. | rare | Civic | your text (37) |
| The Queen of Cities | Towns of at least 15 citizens produce twice their food and production. | rare | Economic | unchanged |
| The Collected Works | Your great scholars may act twice. | rare | Civic | approved (39) |

### Tier IV (5 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Great Catalogue | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | common | Economic | approved (52) |
| The Laboratories | Science buildings give +10% production. | common | Economic | your text (50) |
| The Breaching Batteries | Each hit your siege units land on a city removes 5% of its Magnum Opus progress. | uncommon | Military | unchanged |
| The Sum of Knowledge | The town raising your Magnum Opus gains +2 production for each technology you know. | uncommon | Economic | approved (48) |
| The Invisible College | On draft: choose two great scholars. | rare | Civic (Boon) | approved (51) |

Retired rows (12): Learned Foundations and The Common Tables (Tier I); The Quiet Faculties, Enduring Institutions and The Prototype Works; The Proving Ground, The Age of Reason, The Great Instrument, The Foundation Stone and The Republic of Letters; The Naval Gunners' Charter and The Walls of Learning. The Founding Gift's row becomes The Lecture Halls.

### Shared with another deck (18)

| Card | Text | Shared with | Tier | Rarity | Chair | Status |
|---|---|---|---|---|---|---|
| Illuminated Treatises | Libraries give +1 culture. Monuments give +1 science. | Magisterial | 0 | common | Civic | unchanged |
| The Mountain Observatories | Cities with a mountain in their borders gain +3 science. | Expansionist | 0 | common | Civic | unchanged |
| Field Academies | Your first kill each turn grants 25 science for each age you have reached. | Dominion | I | uncommon | Civic | approved (67) |
| The Assay | Hexes with a strategic resource gain +2 science. | Expansionist | I | common | Civic | unchanged |
| The Founders' Schools | Towns you found start with a Library. | Expansionist | I | uncommon | Civic | approved (64) |
| The Exchange of Discoveries | Mines and quarries on a resource gain +2 science. | Commerce | I | uncommon | Civic | unchanged |
| The Monastery Libraries | Libraries give +2 faith. Temples give +2 science. | Devotion | I | common | Civic | unchanged |
| The Schoolmen's Charter | Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | Devotion | I | uncommon | Civic (Charter) | unchanged |
| The Priest-Astronomers | Your capital gains +2 science and +2 faith for each town keeping a rite. | Devotion | I | common | Civic | unchanged |
| The Blessed Forges | Improved strategic resources gain +1 faith and +1 production. | Devotion | I | uncommon | Civic | your text (68): moved from Tier II (82) |
| The Cloister | Towns with a Temple gain science equal to 30% of their faith. | Devotion | II | rare | Civic | unchanged |
| The Merchant Navigators | A town's fishing boats gain +2 science for its Lighthouse and +2 science for its Harbour. | Commerce | II | common | Civic | changed by the Commerce pass |
| The Soldier-Scholars | Each military unit in your towns gives +2 science. | Dominion | II | uncommon | Military | unchanged |
| The Lodge Books | Completing a wonder completes the technology you are researching. | Magisterial | II | rare | Civic | approved (65) |
| Carried-Off Scholars | Capturing a city grants a technology that its owner knows and you do not. If there is none, it grants science equal to thirty times its population. | Dominion | III | uncommon | Civic | your text (66): Tier III |
| The Royal Patents | Researching a technology grants 100 gold for each age you have reached. | Commerce | III | uncommon | Economic | new in the Commerce pass |
| The House of Wisdom | Towns working an Academy build wonders 30% faster. | Magisterial | III | uncommon | Civic | unchanged |
| The Monastic University | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Devotion | III | rare | Civic | unchanged |

- By pair: Dominion 3, Expansionist 3, Commerce 3, Devotion 6, Magisterial 3. The Commerce pass cut Merchant Scholars.
- If you answer yes to question r2-q1, The Herbalists' Charter joins this table and Expansionist has 4.

### Doctrines (15)

| Doctrine | Tier | Theme | Text | Status |
|---|---|---|---|---|
| The Pythagorean Brotherhood | I | engine | +2 science in every city, doubled in cities with a Shrine. | unchanged |
| The Removal to Xianyang | I | great cities | Your towns grow 30% faster. Settlers cost twice as much. | unchanged |
| The Workshops of Syracuse | I | elite army | Your military units gain +5 combat strength. They cost 50% more to build and to buy. | unchanged |
| The Jixian Academy | II | engine | Completing a technology grants culture equal to a fifth of its cost. | approved (57) |
| The Academy of Gondishapur | II | institutions | Towns with an empire building gain +15% science. +20% production toward empire buildings, except the Magnum Opus and its works. | unchanged |
| The Pandidakterion | II | learned land | Hexes with an Academy have double yields, applied after every other change to the hex. | unchanged |
| The Peripatetic School | II | learned land | Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown. | approved (56): from Tier I |
| The Directorate of Arms | III | engine | While no empire you have met knows more technologies than you, your units gain +3 combat strength. | unchanged |
| The Universitas | III | great cities | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. | unchanged |
| The Volley Fire | III | elite army | Your archer line may attack twice a turn. They lose 4 combat strength when defending against a melee attack. | your text (59) |
| The Mustansiriya | III | institutions | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works. | approved (60): was The Külliye |
| The Platonic Academy | III | learned land | Your great people of every family found an Academy as their work, in place of their own. | approved (61): from Tier IV |
| The Court of Rudolf II | IV | engine | The town raising your Magnum Opus gains production equal to a tenth of your science. | approved (62) |
| The Two Capitals | IV | great cities | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. | unchanged |
| The Trace Italienne | IV | elite army | Your towns gain +10 defence, and your units gain +4 strength inside your borders. Your units lose 4 strength outside them. | approved (63) |

- 15 Doctrines: 3, 4, 5 and 3. The Nassau Reforms is retired, and The Natural Histories is not built.
- The Mustansiriya with The Invitations had the fault that change 76 mends: a copy in every Academy town, and a scholar for each.

### New shapes and small extensions, each listed once

| Kind | What is new | Cards that need it |
|---|---|---|
| New shape | A rider on the moment `ageEntered`, with a grant "an Order draft opens" | The Reform of the Calendar, The Ordinance Companies (the same rider, with a unit grant) |
| New shape | A grant "complete the current technology", on a draft and on a wonder; a grant of a technology from a captured city's owner | The Alfonsine Tables, The Lodge Books, Carried-Off Scholars |
| New improvement | `smelter`: a row, a way to open it, a model, an icon | The Smelters' Charter |
| New building | `greatArchive`, one in an empire | The Archivists' Charter |
| New charter technologies | `smelting`, `astronomy`, `recordKeeping`, `surgery`, `ciphers`, each placed on the chart | the five new charters |
| Small extension | A yield "for each hex beside it that…" on an improvement row (the Expansionist build adds it) | the Physic Garden, the qanat, the smelter |
| Small extension | The cost of a finished building as a measure | The Apprentices, The Dedications |
| Small extension | A rite that pays production as science | The Observers' Charter |
| Small extension | A healing rule that does not ask for rest | The Surgeons' Charter |
| Small extension | The unit filter `newestAge` on a strength line, on a zone-of-control rule and on a production bonus for buildings and wonders | The Armoury Patterns, The Flying Columns, The City Architects |
| Small extension | A charge waiver for unique improvements | The Corps of Works |
| Small extension | A scout doubles what a discovery pays | The Clay Map |
| Small extension | An extra card in an Order hand that is a charter | The Charter Rolls |
| Small extension | A count of empire buildings by kind, and a rider that pays once for each kind | The Royal Academies, The Invitations |
| Small extension | A second copy of every empire building, removed from a queue when the card leaves its chair | The Second Seat |
| Small extension | A hex row that counts the buildings of its town (the Commerce build adds it) | The Lecture Halls |
| Small extension | A technology price by the age of the technology | The Translation Movement |
| Small extension | A commission goal "knows every technology of an age" | Commission: The Old Learning |
| Small extension | A boon with a timed effect on gold (the Commerce build adds it); a great scholar acts twice (the Commerce build adds the shape) | The Alfonsine Tables, The Collected Works |
| Small extension | A share of the empire's science paid to the town that raises the Opus | The Court of Rudolf II |
| Data only | Shapes the game has today | every other row |

### What I could not determine in round two

- **How fast the tiers open under the new base rates.** Culture is lower too, since the Amphitheater pays a flat 4. The base-economy study gives ages and science, not drafts. I kept 4, 6, 8 and 8 hands for Tiers 0 to III.
- **Whether zone of control decides fights** often enough for The Flying Columns to matter.
- **How much faith a seat of this deck makes** without Devotion, for the Night Watch.
- **Whether a second copy of an Opus work grants a bead,** and whether The Second Seat can copy the Magnum Opus.
- **What the Devotion pass rules** on the stone circle and the cliff monastery, which are unique improvements that The Corps of Works would build for no charge.
- **The chart.** Five new charter technologies need a place on your star chart.
- **The history is from my own knowledge,** not from a source in the repo.

## 4. Every change of round one, with your ruling

| # | Card | Tier in round one | Ruling | Your words | The line to build |
|---|---|---|---|---|---|
| 01 | The Herbalists' Charter | 0 | approved | "great" and "should this be a shared card with expansionist?" | Approved as proposed. Change 69 answers the question: no. |
| 02 | The Apprentices | 0 | approved | "great" | Tier 0, common, Economic: Finishing a building grants science equal to a fifth of its production cost. Wonders do not count. |
| 03 | The War Manuals | 0 | approved | "great" | Tier 0, common, Military: Your ranged units gain +2 strength. |
| 04 | The Royal Tutors | 0 to I | approved | "great" | The Royal Tutors moves to Tier I, with the same text. |
| 05 | The Clay Map | 0 | approved with your text | "too similar to other cards in the game. I like the idea of having unique abilities for units. how about we rework: scouts gain +1 sight and receive double bonuses from discoveries." | Tier 0, uncommon, Military: Scouts gain +1 sight and receive double bonuses from discoveries. Changes 70, 71 and 72 are three more cards of this kind. |
| 06 | The House of Life | 0 | approved | "good" | Tier 0, rare, Civic: Your capital gains science equal to half its production. |
| 07 | The Astronomers' Charter | I | cut by you | "i think this is quite a steep penalty, cut" | Not built. The star tower leaves the pass. |
| 08 | The Surveyors' Charter | I | reworked | "Rework: give the qanat yields and change to a single hex. this is easier to read and reason about." | Reworked in change 73: the qanat is one hex with its own yields. |
| 09 | The Glassmakers' Charter | I | approved | "great" and "can we rename this to greenhouses, or something more in line with what the specularium does." | Approved: +3 food, and +1 science for each farm its town works. Change 74 names the building the Glasshouse. |
| 10 | The Scribes' Hall | I | approved | "good" | Tier I, common, Civic: Libraries give +2 science. |
| 11 | The Royal Estates | I | approved with your text | "Additional buff: +50% production towards empire buildings." | Tier I, common, Economic: Each empire building gives its town +3 food and +3 production. +50% production towards empire buildings. |
| 12 | The Sky Watchers | I | approved | "good" | Tier I, common, Civic: Shrines give +1 faith and +2 science. |
| 13 | The Dedications | I | approved | "good" | Tier I, uncommon, Civic: Finishing a science building or an empire building grants culture equal to its production cost. |
| 14 | Learned Foundations | I | cut, as proposed | "great" | Cut. Learned Foundations is retired. |
| 15 | The Common Tables | I | cut, as proposed | "great" | Cut. The Common Tables is retired. |
| 16 | The Reform of the Calendar | I | approved | "great" | Tier I, rare, Civic: Entering a new age opens an Order draft at once. |
| 17 | Commission: The Old Learning | I | approved | "great" | Tier I, uncommon, Wildcard: Goal: know every technology of the first age. Reward: choose a great scholar. |
| 18 | The Charter Rolls | II to I | approved with your text | "the wording of this is confusing. I'm not sure how useful this is. Let's add it in for now, with some clearer text: 'your drafts contain an additional charter if one is available' or something along those lines" | Tier I, uncommon, Civic: Your drafts contain an additional charter if one is available. |
| 19 | Tier I rarities | I | approved | "sure" | The Librarians' Charter is uncommon. The Bronze-Founders' Charter and The Edge of the Sword are common. The Secret Arts is rare. |
| 20 | The Old Academy | I to II | approved | "sure" | The Old Academy moves to Tier II and is common, with the same text. |
| 21 | The Lecture Halls (was The Founding Gift) | I to II | approved | "great" | Tier II, uncommon, Civic: An Academy gains +2 science for each science building in its town. It takes the row of The Founding Gift. |
| 22 | The Latin Quarter | II | approved | "sure" | Tier II, uncommon, Civic: Hexes on or beside an Academy gain +2 science and +1 culture. |
| 23 | The Quiet Faculties | II | cut, as proposed | "great" | Cut. The Quiet Faculties is retired. |
| 24 | Enduring Institutions | II | reworked | "this one feels not very impactful. How about we add a charter that unlocks a new type of science based empire building." | Enduring Institutions is retired. Change 75 is the charter and its empire building. |
| 25 | The Translation Movement | II | approved | "that's interesting, i like it" | Tier II, uncommon, Civic: Technologies of an age before your newest cost you a third less research. |
| 26 | The Armoury Patterns | II | approved with your text | "Hmm interesting. This could be really good for timing attacks, which should be a play pattern for the scientific player. lets rephrase it: units of your current age gain +3 strength. (+4 is probably too strong)." | Tier II, common, Military: Units of your current age gain +3 strength. |
| 27 | The City Architects | II | approved with your text | "lets rephrase: '30% production towards buildings and wonders of your current age'" | Tier II, common, Economic: +30% production towards buildings and wonders of your current age. |
| 28 | The Printers' Charter | II | approved | "great" | Tier II, uncommon, Charter: Opens Printing: +1 trade route, and you may build the Aldine Press, one in your empire: +1 culture for each technology you know. |
| 29 | The Alfonsine Tables | II | approved with your text | "i don't like this. How about: complete the technology you are researching, -30% _gold_ for fifteen turns." | Tier II, rare, Boon: On draft: complete the technology you are researching. −30% gold for fifteen turns. |
| 30 | The Summa | II | cut by you | "not very fun, cut" | Not built. The Summa leaves the pass. |
| 31 | The Prototype Works | IV to II | cut by you | "not very useful. you can pre-build units that are cheaper that are automatically upgraded when you finish the tech. cut" | Cut. The Prototype Works is retired. |
| 32 | Tier II rarities | II | approved | "sure" | The Mechanists' Charter is uncommon. The Paper-Makers' Charter, The Physicians' Charter, The Palace Schools, The Strategikon and The Roll of Scholars are common. |
| 33 | The Age of Reason | III | cut by you | "cut" | Cut. The Age of Reason is retired. |
| 34 | The Humanists | III | approved | "sure" | Tier III, common, Civic: Towns with a Library gain culture equal to a quarter of their science. |
| 35 | The Model Army | III | approved | "Ok sure" | Tier III, uncommon, Military: Research upgrades your units even when you lack the strategic resource the new unit needs, and an upgrade heals the unit. |
| 36 | The Gunfounders' Charter | III | approved with your text | "+6 strength is massive, revise: It's town builds military units 50% faster, with +4 strength" | Tier III, uncommon, Charter: Opens Gunfounding, which unlocks the Tophane: its town builds military units 50% faster, with +4 strength. |
| 37 | The Second Seat | III | approved with your text | "lets just remove the library requirement altogether." and "rephrase: you may build a second copy of all empire buildings, while this is active." and "make sure: if this is unslotted while an empire building is in queue, it should remove it from the queue." | Tier III, rare, Civic: You may build a second copy of all empire buildings, while this is active. If the card leaves its chair, a second copy in a queue leaves that queue. Changes 76 and 77 guard two cards against it. |
| 38 | The Proving Ground | III | cut, as proposed | "great" | Cut. The Proving Ground is retired. |
| 39 | The Collected Works | III | approved | "wow thats crazy powerful, ok add it." | Tier III, rare, Civic: Your great scholars may act twice. |
| 40 | The Foundation Stone | IV to III | cut by you | "remove, not very useful." | Cut. The Foundation Stone is retired. |
| 41 | The Closed Book | IV to III | reworked | "wouldn't this show up way too early? lets keep it as is." and "OR: make it a charter so it doesn't need to be slotted, keep at tier 3" | Two readings. Change 79 recommends the charter at Tier III. |
| 42 | The Great Instrument | IV to III | cut by you | "Cut, not impactful enough" | Cut. The Great Instrument is retired. |
| 43 | Commission: The Lynx-Eyed Academy | IV to III | approved | "great" | Tier III, uncommon, Wildcard: Goal: hold three Academies. Reward: a great scholar, and Academies gain +5 science and +5 culture. |
| 44 | The Republic of Letters | IV to III | cut by you | "i think we have too many academy synergies. lets cut this one." | Cut. The Republic of Letters is retired. |
| 45 | The Military Engineers' Charter | IV to III | approved | "sure" | The Military Engineers' Charter moves to Tier III and is common. |
| 46 | The Naval Gunners' Charter | IV | cut, as proposed | "cut" | Cut. The Naval Gunners' Charter is retired. |
| 47 | Tier III rarities | III | approved | "sure" | The Nizamiyya is common. |
| 48 | The Sum of Knowledge | IV | approved | "great" | Tier IV, uncommon, Economic: The town raising your Magnum Opus gains +2 production for each technology you know. |
| 49 | The Walls of Learning | IV | cut, as proposed | "cut" and "great" | Cut. The Walls of Learning is retired. |
| 50 | The Laboratories | IV | approved with your text | "this is too small for a tier 4. Science buildings give +10% production" | Tier IV, common, Economic: Science buildings give +10% production. |
| 51 | The Invisible College | IV | approved | "great" | Tier IV, rare, Boon: On draft: choose two great scholars. |
| 52 | The Great Catalogue | IV | approved | "great" | The Great Catalogue is common. |
| 53 | A charter technology costs half the price of its column | Rule | not adopted | "lets have it cost the same as an ordinary technology. half feels too powerful. this deck seems to have plenty of science now." | No change. A charter technology costs what an ordinary technology of its column costs, as today. |
| 54 | A charter is dealt in its own tier and in the next | Rule | cut by you | "cut, lets just add more charters" | Not built. A charter is dealt in its own tier only. Changes 71, 75, 79, 80 and 81 add charters. |
| 55 | The Natural Histories | Doctrine I | cut by you | "i don't like that this doesn't scale well, cut" | Not built. The Natural Histories leaves the pass. |
| 56 | The Peripatetic School | Doctrine I to II | approved | "sure" | The Peripatetic School moves to Tier II. |
| 57 | The Jixian Academy | Doctrine II | approved | "great" | Tier II Doctrine: Completing a technology grants culture equal to a fifth of its cost. |
| 58 | The Nassau Reforms | Doctrine IV to II | cut by you | "Seems not very good, as you tend to build soldiers later in the game. cut" | Cut. The Nassau Reforms is retired, and is not moved. |
| 59 | The Volley Fire | Doctrine III | approved with your text | "revise: your archer line may attack twice a turn, they lose 4 combat strength when defending against a melee attack (non-ranged attack)" | Tier III Doctrine: Your archer line may attack twice a turn. They lose 4 combat strength when defending against a melee attack. |
| 60 | The Mustansiriya (was The Külliye) | Doctrine III | approved | "sure" | The Doctrine The Külliye is named The Mustansiriya. |
| 61 | The Platonic Academy | Doctrine IV to III | approved | "that's cool, great" | The Platonic Academy moves to Tier III. |
| 62 | The Court of Rudolf II | Doctrine IV | approved | "great" | Tier IV Doctrine: The town raising your Magnum Opus gains production equal to a tenth of your science. |
| 63 | The Trace Italienne | Doctrine IV | approved | "great" | Tier IV Doctrine: Your towns gain +10 defence, and your units gain +4 strength inside your borders. Your units lose 4 strength outside them. |
| 64 | The Founders' Schools | I | approved | "sure" | Tier I, uncommon, Civic, shared with Expansionist: Towns you found start with a Library. |
| 65 | The Lodge Books | II | approved | "cool" | Tier II, rare, Civic, shared with Magisterial: Completing a wonder completes the technology you are researching. |
| 66 | Carried-Off Scholars | II | approved with your text | "Cool, lets make this tier 3" | Tier III, uncommon, Civic, shared with Dominion: Capturing a city grants a technology that its owner knows and you do not. If there is none, it grants science equal to thirty times its population. |
| 67 | Field Academies | I | approved | "cool" | Tier I, uncommon, Civic, shared with Dominion: Your first kill each turn grants 25 science for each age you have reached. |
| 68 | The Blessed Forges | II | approved with your text | "let's move this to tier 1" | Kept, and moved to Tier I. Change 82 writes it for both decks. |

| Question of round one | Your words | Result |
|---|---|---|
| Does the technology lead stay a quantity that cards read? | "yes" | The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms stay. |
| May a card complete a technology? | "yes" | The Alfonsine Tables, The Lodge Books and Carried-Off Scholars do. You cut The Summa. |
| Do the Opus cards move to Tier III, and may Tier IV hold five cards? | "sure" | Tier IV holds five. You cut two of the three Opus cards, and change 79 settles the third. |
| Should a charter technology cost half, and should a charter be dealt in two tiers? | "two tiers sure, charter technology should cost the same, not half" | The price stays. Your later comment on change 54 cut the two tiers ("cut, lets just add more charters"), and that comment stands. |
| Should the science cards be sized for today's rates, or for the cut? | "they're fine as is." | The base rates are now ruled, and block r2-12 gives the arithmetic again. |

## Record: round one, as first written

- This part is the first form of the pass. Its numbers use the base rates of that day: 0.5 science a citizen, and a Library and a University that paid for each citizen.
- Where it and sections 1 to 4 differ, sections 1 to 4 are the spec.

### R1. Why the deck plays as it does

In three sentences:

1. **The deck does not make science. The base game does.** 10 of its 68 cards pay science, 9 of them are in Tiers 0 to II, and 3 of them pay for each citizen. In the bot games, cards supplied 15% of a Scientific seat's flat science at turn 100, and citizens supplied 38%. A Dominion and Magisterial seat drew a larger share of its science from cards than any Scientific seat.
2. **The seat builds one building in each town and waits.** 23 cards read a building that a town builds once: a school, an empire building, or a charter's building. The 7 cards that read a technology pay for any technology, so no card rewards the choice of what to research.
3. **The deck's strongest cards are hidden or dealt too late.** A seat is offered about 3 of its 13 charters in a game. The late charter technologies cost 3,250 to 8,000 science for a small gift. Each Tier IV rare is the deck's card in one hand in seventy, and the bot games ended before the median seat reached Tier IV. The first empire to learn Alchemy opens the Magnum Opus for every empire, so a lead buys no head start.

#### 1.1 The tally: what each card reads, by tier

| What the card reads | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| A school: a Library, a University, science buildings | 2 | 6 | 0 | 1 | 1 | 10 |
| An empire building | 0 | 1 | 3 | 2 | 0 | 6 |
| A charter: the card opens a charter technology | 1 | 4 | 4 | 2 | 2 | 13 |
| Charters counted | 0 | 0 | 2 | 0 | 0 | 2 |
| A technology completed or known | 1 | 2 | 0 | 2 | 2 | 7 |
| The lead over empires you have met | 0 | 2 | 1 | 1 | 0 | 4 |
| Alchemy and the Magnum Opus | 0 | 0 | 0 | 0 | 5 | 5 |
| Great scholars and Academies | 0 | 2 | 4 | 2 | 2 | 10 |
| Big towns | 0 | 1 | 2 | 1 | 0 | 4 |
| Towns, public works, any building, Shrines | 3 | 1 | 0 | 0 | 0 | 4 |
| Mines and quarries | 1 | 0 | 0 | 0 | 0 | 1 |
| Units and their upgrades | 0 | 0 | 1 | 1 | 0 | 2 |
| **All** | 8 | 19 | 17 | 12 | 12 | **68** |

- Each card is counted once, by the thing the player must have or do for it to pay. The 68 are the deck's own live cards. The 16 shared cards are not in the table.
- **No one quantity fills the deck.** The largest group that is not a charter, the schools, is 10 cards of 68 (15%). The themes pass of 2026-10-21 spread the deck well.
- **The share that reads a science building or a technology:** 27 of 68 (40%). That is 10 schools, 7 for a technology, 4 for the lead, 3 for Alchemy (The Great Instrument, The Foundation Stone, The Closed Book), 2 that count charters, and The Great Catalogue. With the 13 charters, each of which is one more technology to research, it is 40 of 68 (59%).
- **The one note is in what the seat does, not in what the cards read.** 23 cards read a building that a town builds once: 10 schools, 6 empire buildings and the 7 charters that open a building. Tier I holds six cards that say "a Library gives its town a thing".
- **Themes that are in `docs/decks/deck-design.md` and have too few cards to draft toward:** being first (no card since The Prize Essay and The Kept Secret left); early access (The Forward Plans and The Prototype Works); the map (two charters, with works that read nothing round them); the moment of a new age (no card); a deed that makes science (The Apprentices at 5 science).

#### 1.2 What a Scientific seat does on the map and in its turns

| What the seat does | How often | Cards that pay for it |
|---|---|---|
| Completes a technology and picks the next | Every 2 to 4 turns, about 50 times | 7, and they pay for any technology |
| Builds a Library, then the later schools, in each town | Once a town for each building | 10 |
| Builds an empire building | About ten times a game | 6 |
| Drafts a charter and researches its technology | Two or three times a game | 13 charters, and 3 cards that count them |
| Calls a great scholar, who founds an Academy or writes a treatise | 2 or 3 great people an age, of every family | 10 |
| Plants a Physic Garden in each town, digs a qanat | Once a town | The two charters themselves |
| Grows a few big towns | All game | 4 |
| Fights with newer units | When at war | 9, with the charter traits |

- Every seat researches, and every seat builds Libraries. So the honest answer to "what does a Scientific seat do that no other seat does" is: it researches two or three more technologies that no other seat may learn, and it plants a garden in each town.
- **Research asks for a decision every three turns, and no card cares what the decision is.** The moment a technology completes carries its cost and its name (`settleResearch`). Two rows read the cost (The Scholars' Fame and the Doctrine The Jixian Academy). None reads the age of the technology, the first technology of an age, or a finished age. The game announces the moment a seat enters an age (`ageEntered`), and no card reads it.
- **Units upgrade by themselves** when research allows. So the army's edge takes no decision, and the cards that pay for it read what rivals know.
- **The map.** The Physic Garden pays +2 science and +2 happiness on any flat hex with fresh water. The qanat has no yield. An Academy pays 3 science on any hex. None of the three asks where it stands, and the Expansionist pass showed that you want works that read their neighbours.

#### 1.3 Where a seat's science came from: three bot games, on the old base rates

| Turn | Science, median seat | Citizens' share of flat science | Cards' share of flat science | Technologies known | Order drafts |
|---|---|---|---|---|---|
| 40 | 9 | 66% (36 to 87) | 0% (0 to 55) | 9 (5 to 12) | 5 (3 to 7) |
| 60 | 26 | 71% (38 to 90) | 0% (0 to 40) | 14 (10 to 23) | 9 (5 to 11) |
| 80 | 85 | 46% (30 to 75) | 17% (0 to 57) | 22 (15 to 30) | 11 or 12 (8 to 16) |
| 100 | 179 | 38% (26 to 44) | 16% (0 to 60) | 28 (21 to 35) | 15 or 16 (11 to 25) |
| 120 | 253 | 35% (21 to 41) | 17% (0 to 48) | 34 (27 to 44) | 18 (14 to 26) |
| 140 | 443 | 40% (20 to 47) | 17% (2 to 55) | 38 (33 to 52) | 24 (19 to 36) |

- **How I measured.** Three bot games on standard maps with six seats (seeds 42, 77 and 11): Nezahualcoyotl, Hypatia and Al-Ma'mun, who hold Scientific, and Pachacuti, Taizong and Mansa Musa. The script reads `explainCity` and `foldEmpireRates` every twenty turns and writes nothing to the game. Science, technologies and drafts are from all three games up to turn 100, from two at turn 120 and from one at turn 140. The shares are from two games (twelve seats), and from one game at turns 120 and 140. Each cell is the median, with the range in brackets.
- **Flat science** is a town's science before any percentage. The citizens' share is the base rate (0.5 a citizen) and the rate of the town's buildings for each citizen (a Library 0.5, a University 0.75). Percentages multiply the citizens' science with the rest, so the share of the final figure is the same.
- **About two fifths of a seat's science comes from its citizens from turn 100 on, and two thirds before turn 60.** A cut to the two rates takes most from the early game.
- **Cards supply about one sixth.** At turn 100 the six Scientific seats drew 7% to 28% of their flat science from cards (median 15%). Taizong's seat, which holds Dominion and Magisterial, drew 29% and 60%.
- **The University is not part of it.** No seat of twelve held a University at turn 100. At the last reading of each game, four seats of eighteen held one. A University costs 520 hammers and needs Scholarship, a fourth-age technology of 1,960 science. So the science of population is the base rate and the Library, at 1 science a citizen together.
- **A seat completes a technology every 2 to 4 turns**, at every reading from turn 60 on.
- **The games ended at turns 118, 137 and 150** with a winner. I did not check how each was won. Two of the three winners held Scientific. The median seat held 18 drafts at turn 120 and 24 at turn 140, and Tier IV opens at 26. Your own recorded win, in September, closed the Opus at turn 164.

#### 1.4 What a technology lead buys, and which cards pay for it

- **Units.** Every unit of a line upgrades in place when its technology lands, with no cost. A third-age unit has 42 to 50 strength and a second-age unit 30 to 35. So one age ahead is worth +12 or more, which is larger than any card. This is the lead's real prize.
- **Wonders.** The seat that learns a wonder's technology first may start it first. No card gives earlier access since The Palace Archive and The Great Designs were cut, and three cards give a percentage toward wonders.
- **Buildings.** The same: a University or an Aqueduct some turns before a rival.
- **The Magnum Opus.** Nothing. `opusOpen` is true for every seat as soon as any seat knows Alchemy. Two cards change that, The Foundation Stone and The Closed Book, and both are Tier IV rares.
- **The cards that pay for the lead:** The Secret Arts (production), The Edge of the Sword and The Proving Ground (strength), and the Doctrine The Directorate of Arms. All four read what the empires you have met know. The star chart shows that count in its head and marks each technology in it, so the player can see it. But a seat that is level gains nothing from the four, and a seat that is far ahead gains most.

#### 1.5 The charters: seldom seen, and the late ones cost too much

| Charter | Tier, rarity | Technology and price | Turns of a median seat's science | What the seat gets | Offered in a game |
|---|---|---|---|---|---|
| The Herbalists' | 0, common | Herbals, 24 | 4 | The Physic Garden, one in each town | 33% |
| The Bronze-Founders' | I, uncommon | Casting, 50 | 2 | +2 strength for two unit lines | 17% |
| The Surveyors' | I, uncommon | Surveying, 100 | 4 | The Aqueduct early, and the qanat | 17% |
| The Librarians' | I, rare | Cataloguing, 100 | 4 | The Mouseion, an empire building | 26% |
| The Glassmakers' | I, uncommon | Optics, 190 | 7 | The Specularium, a building | 17% |
| The Physicians' | II, uncommon | Medicine, 360 | 4 | The Bimaristan, an empire building | 20% |
| The Paper-Makers' | II, uncommon | Papermaking, 650 | 8 | The Scriptorium, a building | 20% |
| The Printers' | II, uncommon | Printing, 650 | 8 | The Aldine Press (+2 culture) and one trade route | 20% |
| The Mechanists' | II, rare | Mechanics, 1,150 | 14 | +1 range for catapults; archers move after they shoot | 24% |
| The Alchemists' | III, uncommon | Chemistry, 3,250 | 13 | +1 strength for each charter technology, on one line | 34% |
| The Gunfounders' | III, uncommon | Gunfounding, 3,250 | 13 | The Tophane, an empire building | 34% |
| The Military Engineers' | IV, uncommon | Military Architecture, 3,250 | 7 | The Bastion, a building | 21% |
| The Naval Gunners' | IV, uncommon | Naval Gunnery, 8,000 | 18 | +3 strength for Gun Galleys, and a blockade | 21% |

- **The price** is the price of the technology's column. A charter technology cost half again until batch DS9 (2026-11-11), and it costs the ordinary price since. The fourth column is the seat's median science at the time the charter is dealt: 6 a turn in Tier 0, 26 in Tier I, 85 in Tier II, 253 in Tier III and 443 in Tier IV.
- **A charter is dealt when its column is the most expensive the seat can research.** So its technology costs about one and a half ordinary technologies of that moment. The four fourth-age charters ask for 7 to 18 turns of all the seat's research during the race to Alchemy. Naval Gunnery costs what Alchemy costs.
- **Offered in a game** is the chance that the card is the deck's card in at least one hand of its tier (section 1.8), with 4, 6, 8 and 8 hands in Tiers 0 to III and 3 in Tier IV. The thirteen chances add up to 3.0. So the deck with the most charters shows its seat three of them, and the seat takes fewer.
- **The cards that count charters count to two.** The Charter Rolls pays +3 and +3 for each charter drafted. The Alchemists' Charter pays +1 strength for each charter technology. The Great Catalogue pays +10% for each, at most +40%, which a seat cannot reach.

#### 1.6 Dead and nearly dead cards

- **The Naval Gunners' Charter (IV):** 8,000 science for +3 strength on one kind of ship.
- **The Royal Tutors and The War Manuals (0):** a Library needs Writing, one of the last two technologies of the first age, and great people open in the second age. Both cards pay nothing in their own tier.
- **The Old Academy and The Founding Gift (I):** the first Academy comes in Tier II. The Founding Gift then pays 150 production, three or four times in a game.
- **The Latin Quarter (II):** it needs two great-person works side by side. A seat holds three or four works at turn 100.
- **The Humanists, The Second Seat and The Walls of Learning** read a University, and four bot seats of eighteen built one.
- **The Great Instrument (IV):** the game does not deal it to a seat that knows Alchemy, and a leading seat reaches Tier IV three technologies from Alchemy.
- **The Foundation Stone and The Closed Book (IV):** rares in a tier that the median seat did not reach.
- **The Sum of Knowledge (IV rare):** +50 production and +50 culture in the capital, the size of Magisterial's Tier 0 rare.
- **The Walls of Learning (IV):** the tier's only common, so it is the deck's card in three hands of five. It pays +6 defence.
- **Learned Foundations (I):** 25% toward about ten buildings in a whole game, about 4 hammers a turn.
- **The Translation Movement (II):** it pays a seat for being behind.
- **Three Doctrines.** The Peripatetic School (I) pays Academies twenty turns before the first one. The Court of Rudolf II and The Nassau Reforms (IV) pay for fourth-age technologies and for upgrades, and both are nearly over when the tier-26 governments come. The Jixian Academy (II) gives and takes about the same culture until age 4.

#### 1.7 Rares that are weaker than commons

| The rare | What it pays | The common or uncommon that beats it |
|---|---|---|
| The Quiet Faculties (II) | +25% food and +20% production in one to three towns | The Round City (uncommon): +1% production and culture in every town for each citizen of the capital |
| The Model Army (III) | Upgrades without the strategic resource | Commerce's Foreign Procurement does the same for bought units and is a common |
| The Sum of Knowledge (IV) | +50 production and +50 culture in the capital | The Astronomical Diaries (uncommon, I): the same count in the same town, from Tier I |
| The Great Catalogue (IV) | +10% to +30% toward the Opus, with the charters a seat is offered | The generic The Grand Design (uncommon): about +75 production toward the Opus |
| The Great Instrument (IV) | 254 hammers, once | Any Tier IV card |
| Commission: The Lynx-Eyed Academy (IV) | A scholar and 1,200 production, once | The Republic of Letters (uncommon), which counts the same Academies every turn |
| The Forward Plans (I) | A University of 520 hammers, when a town makes 10 | The Scribes' Hall (common), which pays in every Library town now |

#### 1.8 How often each card is seen

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare | A named rare is offered in |
|---|---|---|---|---|---|---|---|
| 0 | 7 | 1 | 0 | 9.5% | 33% | none | no rare |
| I | 7 | 10 | 2 | 8.6% | 3% | 5% | 26% of games |
| II | 3 | 11 | 3 | 20% | 2.7% | 3.3% | 24% |
| III | 2 | 6 | 4 | 30% | 5% | 2.5% | 18% |
| IV | 1 | 4 | 7 | 60% | 7.5% | 1.4% | 4% |

- A hand deals one card for each of the seat's decks. The game rolls the rarity first, at 60 / 30 / 10, over the rarities that deck holds in the current tier. Then it picks evenly inside that rarity (`drawRarityFirst`, `src/sim/statecraft/draft.ts`). So the number of cards at each rarity decides how often each card is seen.
- The middle columns give the chance that one named card is the deck's card in a hand. The last column gives the chance that a named rare is offered at least once in its tier, with 4, 6, 8 and 8 hands in Tiers 0 to III and 3 in Tier IV. It leaves out the cards that the seat has taken.
- **Tier 0:** the one uncommon, The Prospectors' Notes, is the deck's card in one hand in three.
- **Tier I:** each of the two rares is seen more often than each of the ten uncommons.
- **Tier II:** each of the three commons is seen seven times as often as each of the eleven uncommons, which hold three of the four charters.
- **Tier III:** The Journeymen and The Doctorate are each the deck's card in three hands of ten.
- **Tier IV:** The Walls of Learning is the deck's card in three hands of five. The seven rares, four of which are the Opus cards, share one hand in ten.

#### 1.9 The tiers come late, and the game ends early

- The draft model of 2026-10-17 puts the first hand of Tiers I to IV at turns 32, 72, 133 and 161. In the three bot games the median seat reached them at about turns 37, 70 and 118, and did not reach Tier IV before the game ended. The leading seat of each game reached Tier III at about turn 90 and Tier IV between turns 100 and 125.
- So Tier II is where a game is shaped, and Tier III is where it is decided. Tier IV is seen by one to three seats of six, for the last 15 to 30 turns.
- The deck's last cards are in Tier IV: five cards for the Opus, both commissions with a large goal, and three of its four Tier IV Doctrines. Changes 40 to 45 move six cards to Tier III. This is the reading that the Commerce pass took for Merchant Princes.
- These are bot games. If your own games run to turn 160 and more, Tier IV is reached more often, and the moves still do no harm.

#### 1.10 Gaps by tier and by chair

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| 0 | 1 | 3 | 4 | 0 |
| I | 2 | 9 | 8 | 0 |
| II | 4 | 4 | 8 | 1 |
| III | 4 | 2 | 5 | 1 |
| IV | 4 | 3 | 3 | 2 |

- The table is the sheet's own count of types, charters included.
- **Boons:** none. Dominion has four and Commerce four. The deck that is weak at tempo has no card that pays on the draft.
- **Commissions:** three, and two of them are Tier IV rares. Tier I has none.
- **Scalers:** one, The Astronomical Diaries.
- **Rares:** Tier 0 has none, and Tier IV has seven of twelve.
- **Science:** no card pays science in Tier IV, and one does in Tier III.

#### 1.11 Doubles

- **The capital gains production and culture for a count, four times:** The Astronomical Diaries (technologies completed), The Charter Rolls (charters), The Sum of Knowledge (technologies known) and The Republic of Letters (Academies). The first and the third count nearly the same thing.
- **Production toward a kind of building, four cards and three Doctrines:** Learned Foundations, The Free Cities, The City Architects, The Great Catalogue, and the Doctrines The Academy of Gondishapur, The Külliye and The Court of Rudolf II for research. The shared The House of Wisdom is a fifth card.
- **An empire building pays production, three times:** The Royal Estates, Enduring Institutions and The Royal Academies.
- **An Academy pays food and production, twice:** The Old Academy on the hex and The Quiet Faculties in the town.
- **The lead pays strength, twice and a Doctrine:** The Edge of the Sword, The Proving Ground and The Directorate of Arms.
- **A Library gives its town a thing, six times in Tier I:** The Scribes' Hall, The Almanac, The Common Tables, Learned Foundations, The Dedications and The Forward Plans, with The War Manuals and The Royal Tutors in Tier 0 and two shared cards.

#### 1.12 Chores

- **The deck has few chores.** It leaves no units on the map, and its works are one to a town.
- **Research is a decision every three turns that the cards make empty.** The player picks what the tree needs next, and no card says otherwise. It is attention with no reward, which the card-design skill says to remove.
- **The lead is a thing to watch that the player cannot push.** Four rows turn on and off as rivals learn. The star chart shows the count, so it is not hidden.
- **A charter technology stops the main tree.** The seat leaves it for 5 to 18 turns of research, and during that time nothing completes.

#### 1.13 Science, culture, production and gold

- **Science:** from the base game, as section 1.3 shows. The deck adds a little in Tiers 0 and I and almost nothing later.
- **Culture:** reachable in every tier. The Dedications, The Astronomical Diaries, The Charter Rolls, The Round City, The Roll of Scholars, The Royal Academies, The Doctorate, The Humanists.
- **Production:** reachable in every tier, and more than the deck design says. 18 of 68 cards pay food or production.
- **Gold:** no card of the deck pays gold. The shared The Royal Patents (with Commerce) is the only one in a Scientific seat's pool, and the great scholar Brahmagupta pays gold for each science building. I think that is right for this deck.
- **Faith:** The Sky Watchers, and the cards shared with Devotion.
- **Happiness and authority:** the Physic Garden and The Curators of Works pay happiness. No card pays authority, and the pass adds none.

### R2. The notes as first proposed

- The core stays: research, charters, scholars and Academies, and the institutions. I tested ten directions against one question: does the way the seat plays produce the quantity by itself, so that a seat which drafts one card of the note is still paid?
- I recommend four. A and B are the main ones. C gives the deck its map. D is small.

#### A. Discovery: a deed can complete a technology (Recommended)

- **The moment:** a technology completes (`tech`, with its cost). It comes about fifty times a game for every seat.
- **The idea:** today the seat waits for the moment. This note lets it make the moment by a deed. A boon completes the technology in hand (change 29). A scholar's treatise completes it (change 30). A wonder completes it (change 65, shared with Magisterial). A captured city gives one (change 66, shared with Dominion). A charter technology at half price is a fifth way (change 53).
- **Who reads it:** The Royal Workshops, The Astronomical Diaries, The Scholars' Fame, The Journeymen, The Age of Reason, the shared The Royal Patents, the Doctrine The Jixian Academy, and the leaders Harun al-Rashid (faith) and Sejong (renown).
- **The floor:** every seat completes technologies, so each of those cards pays with no other card.
- **What it does to play:** before each deed the player aims at the most expensive technology they can research. A treatise that ends a technology of 5,150 is a turn the player remembers.
- **After a cut to passive science** these deeds are worth the same, because each ends one technology whatever the seat's science is.

#### B. The plan: what you research is a choice (Recommended)

- **The quantities:** the newest age the seat knows, the ages it has finished, and the technology in hand. All three are on the seat's own star chart.
- **The idea:** go deep or go wide. A seat that enters an age early gains a draft (change 16), +4 strength for the units of that age (change 26) and 30% toward its buildings and wonders (change 27). Then the old age costs a third less (change 25), and finishing the first age pays a scholar (change 17). The Prototype Works moves to Tier II, where the technology in hand opens its rows (change 31).
- **The floor:** every seat enters three ages and knows its newest age.
- **What it does to play:** the choice of the next technology has a reason beside what it unlocks. The cheapest technology of the next age is worth a draft and a stronger army.
- **What I did not do:** read what rivals know. These cards pay a seat that is level with its rivals.

#### C. The learned land: works that read their neighbours (Recommended)

- **The quantities:** the hexes beside a work. Woods beside a Physic Garden (change 01). Empty hexes beside a star tower, a new work (change 07). The district that a qanat waters (change 08). The hexes round an Academy (change 22), and the schools of its town (change 21). The kinds of work a town holds (the Doctrine of change 55).
- **The idea:** you asked the Expansionist pass for works that read their neighbours, and the keyword unique improvement now covers this deck's two. Scientific's works should make science from where they stand.
- **The floor:** a garden with no wood beside it pays what it pays today. A tower on any hex pays 1 or 2.
- **What it does to play:** the seat keeps some woods, leaves the edge of its land bare for a tower, and plants its Academy in the town with the schools.
- **After a cut to passive science** this is where a seat's science comes from in ages 1 and 2, when the cut takes most.

#### D. Knowledge applied: the newest age (Recommended, small)

- **The idea:** a lead should pay without a card that asks what rivals know. The Armoury Patterns pays units of the newest age (change 26). The Model Army heals on each upgrade (change 35). The Opus cards move to Tier III, so a lead in Alchemy buys ten turns and an early start (changes 40 to 42).
- **The floor:** every seat's units reach the newest age when its research does.
- It is small because the army already has six charter traits and buildings.

#### E. Scholars: the treatise against the Academy (Already in the deck; two capstones)

- The deck has ten cards for scholars and Academies, and Sejong is the leader who calls as many scholars as possible. The pass adds The Summa and The Collected Works (changes 30 and 39) and moves the Academy cards to the tier where Academies exist.

#### F. Experiments with a risk (One card, not a note)

- A loan of science is a good card, and the pass has one (change 29). A whole theme needs many timed drawbacks, and the rule of 2026-11-10 keeps drawbacks to rares. I did not write a card that rolls dice for a technology: a free technology worth 5,000 science on a roll is not a risk that the player takes, it is luck that happens to them.

#### G. The lead over the empires you have met (Keep it small)

- The star chart shows the lead, so the rule of 2026-11-10 about hidden quantities does not apply to it. But a seat cannot push it, and it pays most to the seat that needs least. The pass keeps The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms, and cuts The Proving Ground (change 38). Question 1.

#### H. Exploration and natural features (One light card)

- The deck design gives exploration to Commerce. The Clay Map (change 05) is the one card. The game has no natural wonders to read.

#### I. Observatories as buildings on mountains (Not recommended)

- The Observatory needs a University and The Astrolabe, a technology of 5,150 science. Bot seats do not reach it before the game ends. The star tower does the job on the map from Tier I. If you want the building in play, it needs a base rule: drop the University from its needs.

#### J. Being first to a technology (Not recommended)

- The game records the first empire to each technology (`techWorld`). You cut The Prize Essay, and the simplification cut The Kept Secret and The Great Designs, because the player cannot see a race. The Closed Book keeps the one race that the whole table watches, which is Alchemy.

### R3. What a cut to passive science does to this deck (written before the figures were ruled)

- You wrote: "i want to nerf the passive science from population, and the base science and culture buildings that scale off population". No figure is ruled. Today every citizen gives 0.5 science, a Library gives +2 and 0.5 a citizen, and a University gives 0.75 a citizen.

| If the cut is | Science lost at turn 60 | At turn 80 | At turn 100 |
|---|---|---|---|
| Half the base rate (0.5 to 0.25 a citizen) | 30% | 12% | 10% |
| Half the base rate, and half the rate of each building | 36% | 23% | 19% |
| Half the base rate, and buildings pay no rate | 36% | 33% | 28% |

- Each figure is the median loss of flat science over twelve bot seats, worked out seat by seat from the readings of section 1.3. The percentages on top of the flat science change nothing in the share.
- **The cut takes most in the early game.** At turn 60 half the seats hold no Library, so the base rate is nearly all of their science, and a cut to it takes a third. That is the time of the first charters and the first schools.
- **It slows every seat alike, and the deck does not make up the difference today.** A Scientific seat draws 15% of its science from cards. So after a cut it is as slow as its neighbours, and three of its cards (The Scribes' Hall, the Specularium, The Forward Plans) and the Doctrine The Universitas shrink with the rates.
- **The deck matters more after a cut, if it holds flat science.** A card that pays +10 science at turn 60 is 38% of a seat's 26 today, and 59% of 17 after the middle cut. The same is true of every flat source. This is where the Scientific seat can gain a lead: science that it earns.
- **What the pass does about it.** It moves the deck's science to four places, and none of them is a citizen:

  - **Buildings, as a flat sum on the building:** The Scribes' Hall (Libraries +2), The Sky Watchers (Shrines +2), Enduring Institutions (empire buildings +5), The Curators of Works. A doubler such as Ibn al-Haytham's then reaches the card's science.
  - **The map:** the Physic Garden beside woods, the star tower beside empty land, the hexes round an Academy, The Lecture Halls, The Republic of Letters, the Doctrine The Natural Histories, The Clay Map.
  - **Deeds:** The Apprentices (a fifth of each building's cost), Field Academies (kills), and the four deeds that complete a technology.
  - **Choices:** The House of Life (the capital's production), the plan cards of note B, and the loan of The Alfonsine Tables.

- **What the cut does to the changes.** The deeds that complete a technology keep their size, and they gain against a seat's own research. The cards that read a seat's science shrink with it: The Humanists (change 34), the Doctrine The Court of Rudolf II (change 62), and a scholar's treatise without The Summa. The cards that pay on a completed technology pay as much each time and fire less often.
- **Three things for you to weigh when you set the figure.** They are outside this pass.

  - **If the Library keeps a flat sum, the cards on it still work.** Ibn al-Haytham ("your libraries pay double"), Cai Lun and The Scribes' Hall all pay on the building. If the Library loses its rate, I would raise its flat +2 to +3 or +4, so that a Library is still the first thing a town of this deck builds.
  - **The University is hardly built.** A cut to its rate changes little in bot games. If the cut makes it weaker still, The Forward Plans, The Second Seat and Copernicus's line for the Observatory lose their base.
  - **Leader lines on citizens.** Sejong's The Correct Sounds (+1 science and +1 culture for every four citizens) and Nezahualcoyotl's Flower and Song are the same kind of science and culture. If the cut does not reach them, those two leaders gain against the field.

### R4. Example councils, as first proposed

#### Early, end of Tier I: the garden towns (five chairs, the Priest-King)

- **Chairs:** The War Manuals (0, Military), The Almanac (I, Economic), The House of Life (0, Civic), The Scribes' Hall (I, Civic), Commission: The Old Learning (I, Wildcard). Taken on the way, with no chair: the Herbalists' Charter and the Astronomers' Charter. Doctrine: The Natural Histories.
- **How it plays:** each town gets a Physic Garden beside its woods and a star tower on the bare edge of its land. The workers give each town one farm, one mine and one pasture before a second farm. The capital turns half its hammers into science. The seat goes back for the cheap first-age technologies it left, and the commission pays its first great scholar at about turn 55.

#### Early, end of Tier II: the new age (six chairs, the Aristocracy)

- **Chairs:** The Armoury Patterns (II, Military), The City Architects (II, Economic), The Charter Rolls (I, Civic), The Astronomical Diaries (I, Civic), The Lecture Halls (II, Civic), The Summa (II, in the Wildcard chair). Taken as a boon: The Alfonsine Tables. Doctrine: The Nassau Reforms.
- **How it plays:** the seat learns Rhetoric early to enter age 3. From that turn its age-3 buildings and wonders come 30% faster, and each unit line gains +4 when its technology lands, and +2 for good from the Doctrine. Every hand shows a charter. The first scholar founds an Academy in the town with the Library and the Scriptorium. The second writes a treatise, aimed at a technology of 1,150.

#### Late, Tier III then Tier IV: the race to Alchemy (eight chairs under the Divine Mandate, then eleven under The Curia)

- **Chairs, Tier III:** The Armoury Patterns and The Model Army (Military); The Journeymen (Economic); The Astronomical Diaries, The Summa and The Collected Works (Civic); The Age of Reason and The Closed Book (the Wildcard chairs). Tier IV adds The Foundation Stone, The Republic of Letters and The Sum of Knowledge, and The Invisible College as a boon.
- **How it plays:** every scholar ends two technologies. Each technology pays production in every town twice and heals the army's line. The Opus starts when Alchemy is half done. Two scholars from The Invisible College end Alchemy, and the rivals wait ten turns.

### R5. Pairs, leaders and great people, as first written

- **Dominion, the military edge (3 cards: one in Tier I, two in Tier II).** Field Academies pays science for a kill by the age reached (change 67). Carried-Off Scholars gives a technology for a captured city (change 66). The Soldier-Scholars stays. Dominion raises kills, captures and garrisons, and this deck pays in science and technologies.
- **Expansionist, the engineers (3 cards: one in Tier 0, two in Tier I).** The Mountain Observatories and The Assay stay. The Founders' Schools gives each new town a Library (change 64). Expansionist raises towns founded, mountains and resources. Its The Cadastre and Commission: The Reclaimed Lands count the Physic Garden, the qanat and the star tower.
- **Commerce, the patrons (3 cards, as its pass left them).** The Exchange of Discoveries, The Merchant Navigators and The Royal Patents. I change none. The Royal Patents pays 100 gold for each age on every technology, so the deeds of note A are worth gold to this pair, and The Age of Reason doubles it.
- **Devotion, scholars of the faith (5 cards, from 6).** I cut The Blessed Forges (change 68) and leave the other five to the Devotion pass. If that pass wants three, The Priest-Astronomers and The Monastery Libraries are the two plain ones.
- **Magisterial, the academy (3 cards, from 2).** Illuminated Treatises and The House of Wisdom stay. The Lodge Books turns a wonder into a technology (change 65). Magisterial raises wonders, great people and drafts. The Reform of the Calendar and The Charter Rolls add drafts and cards for its counters.

- **Mehmed the Conqueror (Dominion and Scientific): richer.** The Enderun counts great scholars gained, and the pass gives a scholar earlier (change 17). The Great Bombard's science for a capture adds to the new Carried-Off Scholars. The Janissary stands in the warrior line, which the Alchemists' Charter raises, and the seat now sees its charters. The Tophane is larger. Their building The Külliye shares its name with a Doctrine today (change 60).
- **Nezahualcoyotl (Expansionist and Scientific): richer.** The Dikes pays farms in Aqueduct towns, and the Surveyors' Charter gives the Aqueduct early and a qanat that makes farm land. The Natural Histories suits a seat that improves everything.
- **Cleopatra (Commerce and Scientific): richer.** The Museion pays +2 science for every great person called, in every city. The pass adds two commissions for scholars at lower tiers and The Invisible College. The Queen's Alliances pays for each age reached, which note B asks the seat to raise early. The Printers' Charter still gives a route.
- **Harun al-Rashid (Devotion and Scientific): richer.** The Learned Court pays faith equal to a fifth of each technology's cost, so every deed that completes a technology pays them faith: Alchemy by a treatise is 1,600 faith. The Storehouse of Wisdom pays on the Library and the Shrine, beside The Scribes' Hall and The Sky Watchers.
- **Sejong the Great (Scientific and Magisterial): much richer, and the one to test.** The Royal Lectures gives three turns of renown for each technology. With The Summa and The Collected Works a scholar ends two technologies, which is six turns of renown toward the next scholar. At 100 to 150 renown a turn that is 600 to 900 renown, when the eighth to eleventh person costs 654 to 1,100. So the loop nearly pays for itself for three or four scholars, and then the price of a great person grows faster than the loop. You wrote that you want one leader whose way to play is to call as many scholars as possible. The Correct Sounds pays science for citizens, so the cut to passive science may reach it.
- **Ibn Battuta (every deck):** one more chair and a free redraw. The Charter Rolls gives their hand a fifth card.

- **Ibn al-Haytham** ("your libraries pay double") now doubles The Scribes' Hall's +2 science, The Almanac's +2 production, Cai Lun's line and Harun's.
- **Copernicus** doubles Observatories, which bot seats do not build (note I). No change of this pass helps that.
- **The five legacies that count "buildings that supply science"** (Aristotle, Zhang Heng, Maimonides, Āryabhaṭa, Brahmagupta) lose nothing. The pass cuts one card that counted them (The Common Tables) and adds one (The Laboratories).
- **A scholar's work** pays 4 and grows to 8 under the great-people pass. The Lecture Halls, The Latin Quarter and the commission's reward add to it on the hex, where The Nizamiyya and The Pandidakterion multiply.

- **The Devotion pass** runs beside this one. It may rule on the six shared cards first. Nothing in this pass reads a rite, a follower or faith spent.
- **The Commerce build** adds four things that this pass reuses: a boon with a timed effect, a great person who acts twice, a hex row that counts the buildings of its town, and a grant that counts ages reached.
- **The Expansionist build** adds the yield "for each hex beside it that…" and the keyword unique improvement. The star tower joins that list, with the Physic Garden and the qanat.
- **Three names to settle outside the cards.** The Doctrine and Mehmed's building are both The Külliye. The shared card The House of Wisdom has the name of a wonder. The charter building the Mouseion and Cleopatra's building The Museion are one word in two spellings.
- **One text differs from the game's own words.** The sheet says that the Doctrine The Volley Fire gives the archer line a second attack. The game's words say "ranged units may attack twice a turn".

### R6. The 68 entries, as first proposed

**Tier 0**

#### 01. The Herbalists' Charter (rework)

- **Tier, rarity, type:** 0, common, Civic (Charter)
- **Now:** Opens Herbals, which unlocks the Physic Garden: +2 science and +2 happiness. A town may have one, on flat land with fresh water.
- **Proposed:** Opens Herbals: workers may plant one Physic Garden in each town, on flat land with fresh water: +2 science and +2 happiness, and +1 science more for each forest or jungle hex beside it.
- **Why:** The garden pays the same on every hex that can hold it, so the player puts it anywhere. In the Expansionist pass you asked for works that read their neighbours, and for a reason to keep forest. Herbs come from the woods. Now the best hex for a garden is beside two or three woods, and a chop costs something.
- **Its science rides on:** The map: the woods beside the garden. It does not ride on population.
- **Arithmetic:** A garden beside two woods pays 4 science and 2 happiness for one worker charge. Four towns: 16 science and 8 happiness, where a median bot seat makes 26 science at turn 60. The Expansionist pass counted forest in the first three rings of 79% of starts, 9.7 hexes on average. On a start with no wood the garden pays what it pays today. Herbals costs 24 science, and 12 under change 53.
- **Synergy:** **Raises:** science and happiness on the map, unique improvements. **Reads:** forest and jungle hexes. Expansionist's The Totem Poles, The Timber Yards and The Hedgerows also keep woods standing. Its The Cadastre adds +3 science to each garden, and Commission: The Reclaimed Lands counts it. The qanat of change 08 gives dry land the fresh water that a garden needs.
- **Shape:** Small extension: a yield "for each hex beside it that…" on an improvement row. The Expansionist build adds this shape for Nazca lines and the baray. Data on the row `physicGarden`.
- **Confidence:** good

#### 02. The Apprentices (buff)

- **Tier, rarity, type:** 0, common, Economic
- **Now:** Finishing a building grants 5 science.
- **Proposed:** Finishing a building grants science equal to a fifth of its production cost. Wonders do not count.
- **Why:** 5 science is a tenth of a first-age technology, and it is nothing by the third age. A share of the cost keeps the card the same size against the tree for the whole game. It is science from a deed: the seat that builds more learns more.
- **Its science rides on:** A deed: buildings finished. It does not ride on population.
- **Arithmetic:** Granary, 30 hammers: 6 science. Monument, 39: 8. Library, 51: 10. Market, 90: 18. Forum, 231: 46. Aqueduct, 265: 53. University, 520: 104. A seat finishes about six buildings by turn 40: about 45 science, which is one technology of 24 to 50. In age 3, eight towns finish a building every two turns at about 250 hammers each: 25 science a turn, where the median bot seat makes 179 at turn 100.
- **Synergy:** **Raises:** science. **Reads:** buildings finished: built, bought, or granted. Fed by The Free Cities, The City Architects (change 27), the shared The Founders' Schools (change 64), the generic The Capital's Example, and every building a Commerce partner buys.
- **Shape:** Small extension: the row has `windfallRider` on `buildingCompletion` with `exceptWonders`. The grant needs the measure "the building's cost". `OccasionMeasure` holds `strength`, `population` and `gold`, and the Dominion build adds `unitCost`.
- **Confidence:** good

#### 03. The War Manuals (rework)

- **Tier, rarity, type:** 0, common, Military
- **Now:** Units gained in a town with a Library start with +2 strength.
- **Proposed:** Your ranged units gain +2 strength.
- **Why:** A Library needs Writing, which is one of the last two technologies of the first age. So in Tier 0 the card pays nothing. You cut The Court Painter from Magisterial's Tier 0 for that reason. The deck's army is small and it shoots: the Mechanists' Charter and the Doctrine The Volley Fire both build on the archer line. This card starts that line at turn 1.
- **Arithmetic:** An Archer shoots at 20, so +2 is 10%, which is the regular Tier 0 combat line (+2 to +3). A Bowman shoots at 28 and a Crossbowman at 50. The card fades, as a Tier 0 card should.
- **Synergy:** **Raises:** ranged strength. **Reads:** ranged units. It joins the Mechanists' Charter (the archer line moves after it shoots), The Volley Fire (it attacks twice) and The Armoury Patterns (change 26).
- **Shape:** Existing shape: `combatLine` with a ranged class, as Dominion's The Longbowmen.
- **Confidence:** good
- **Depends, joins and notes:** It takes one card out of the group that reads a Library.

#### 04. The Royal Tutors (move)

- **Tier, rarity, type:** 0 to I, common, Civic
- **Now:** Tier 0: +2 scholar renown each turn for each science building.
- **Proposed:** Tier I, the same text.
- **Why:** A seat has no science building in Tier 0 before Writing, and great people open in the second age with Epic Poetry (about turn 55 for bots). You removed The Court Painter with these words: "its not useful in tier 0 as great people are only unlocked in age 2". In Tier I the card pays from its first hand.
- **Arithmetic:** Four Libraries at turn 60: +8 renown a turn. The first great person costs 75 renown and the second 134, so the card brings the first scholar about nine turns after it is seated. Twelve science buildings at turn 100: +24 a turn.
- **Synergy:** **Raises:** scholar renown. **Reads:** science buildings. It feeds The Lecture Halls (change 21), The Summa (30), The Collected Works (39), The Roll of Scholars and The Doctorate.
- **Shape:** No shape change. `band` 0 to 1.
- **Confidence:** good

#### 05. The Clay Map (new)

- **Tier, rarity, type:** 0, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Your capital gains +1 science for every 100 hexes you have seen.
- **Why:** Tier 0 has no card for the first thing every seat does, which is to explore. The oldest map of the world that we have is a clay tablet from Babylon. The deck design gives exploration to Commerce and says of this deck that "a light version here is fine". This is the light version: science for a deed, and a reason to keep the scout walking.
- **Its science rides on:** The map: hexes seen. It does not ride on population.
- **Arithmetic:** The standard map has 4,160 hexes. I did not measure how many a seat has seen by turn 40. If it is 300 to 600, the card pays 3 to 6 science, where the median bot seat makes 9. When the seat has seen half the map and more, it pays about 20 to 30.
- **Synergy:** **Raises:** science in the capital. **Reads:** hexes seen (`revealedTiles`, a count the game has). Fed by scouts, Commerce's The Pathfinders' Company, the generic Far Runners, ships, and every trade route and war that shows new land. It is a capital card, so The Summer Palace and the shared The League of Cities reach it.
- **Shape:** Existing shape: `pays` in the capital, basis count, `revealedTiles`, `per` 100.
- **Confidence:** speculative
- **Depends, joins and notes:** The count per turn is not measured. If it is too high, the line reads "for every 200 hexes".

#### 06. The House of Life (new)

- **Tier, rarity, type:** 0, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** Your capital gains science equal to half its production.
- **Why:** Tier 0 has no rare. In an Egyptian temple the House of Life was the workshop where scribes copied books and taught. The card says what this pass wants the deck to say: work makes science. It also gives age 1 a new choice. Every hammer the capital makes is half a beaker, so a mine is as good as a school.
- **Its science rides on:** The capital's production. It does not ride on population.
- **Arithmetic:** A capital makes about 8 production at turn 30 and 10 to 15 at turn 60: +4 science, then +5 to +7, where the median bot seat makes 9 and 26. That is the top of the Tier 0 bar (4 to 8), and it keeps its place: 40 production at turn 100 is +20 science, and 100 in age 4 is +50. It never passes a regular card of the later tiers.
- **Synergy:** **Raises:** science. **Reads:** the capital's production. Fed by The Astronomical Diaries (+1 production in the capital for each technology), The Almanac, The Royal Estates, the generic The Threshing Floor, and the Doctrine The Two Capitals, which gives a second town the same line. It is a capital card.
- **Shape:** Existing shape: `pays` in a city, basis share, from production to science, scope capital. Commerce's Financed Industry and this deck's The Humanists use it.
- **Confidence:** good
- **Depends, joins and notes:** You approved rares at Tier 0 in the Dominion, Commerce and Magisterial passes.

**Tier I**

#### 07. The Astronomers' Charter (new)

- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Opens Astronomy: workers may raise one star tower in each town: +1 science for each hex beside it with nothing built on it.
- **Why:** The deck has two works of its own, and neither asks where it stands. A star tower wants dark, empty country. So the player leaves a ring of land alone, or raises the tower at the edge of the borders beside mountains and water, where nothing is ever built. It is a new decision on the map, and it is the opposite of every other work in the game. Cheomseongdae in Korea is the oldest observatory that still stands, and its name means "star-gazing tower".
- **Its science rides on:** The map: empty hexes beside the tower. It does not ride on population.
- **Arithmetic:** A tower beside six empty hexes pays 6 science for one worker charge. A tower among farms pays 1 or 2. Early, most land is empty: four towns at about 4 each are 16 science at turn 60, where the median bot seat makes 26. As the seat improves its land, the towers in the middle fall and the towers on the edge keep their 5 or 6. Astronomy stands beside Casting at 50 science, and 25 under change 53.
- **Synergy:** **Raises:** science on the map, unique improvements. **Reads:** the unimproved hexes, mountains and water beside the tower. Expansionist's The Cadastre gives each tower +3 science, and its The Mountain Terraces works the mountains beside it. The card works against Expansionist's wish to improve every hex, so that seat must choose. The Doctrine The Natural Histories (change 55) counts the tower as a kind of work.
- **Shape:** New improvement `starTower`, one in each town: a data row, a way to open it, a 3D model and an icon. Its yield uses the extension of change 01 with the tile test `unimproved`, which exists. New charter technology row `astronomy`.
- **Confidence:** good
- **Depends, joins and notes:** The names of the technology and of the work are mine. A reading to confirm: a hex with a road counts as empty. A hex with a town, an improvement or a great-person work does not.

#### 08. The Surveyors' Charter (rework)

- **Tier, rarity, type:** I, uncommon, Economic (Charter)
- **Now:** Opens Surveying: you may build the Aqueduct early, and workers may build the Qanat, which waters the farms beside it.
- **Proposed:** Opens Surveying: you may build the Aqueduct early, and workers may dig one qanat in each town, on flat land beside a hill or a mountain. Every hex within two hexes of a qanat has fresh water.
- **Why:** The qanat has no yield, and it waters only the farms that touch it. The Expansionist pass's stepwell does more (+2 food, renown, and water for the hexes beside it), so the qanat is the worse of two works with one job. A real qanat carries water under the ground from the hills to a whole district. At two hexes it turns dry land into farm land, and it decides where a town's fields go.
- **Arithmetic:** Two rings are 18 hexes. Inside them a farm may stand on desert, tundra and hills, and after Irrigation each farm with fresh water gains +1 food. Eight farms: +8 food, and farms where none could stand. A Physic Garden needs fresh water, so the qanat also gives a dry town its garden. Surveying costs 100 science, and 50 under change 53.
- **Synergy:** **Raises:** hexes with fresh water, farms. **Reads:** hills and mountains. It feeds Expansionist's The Watercourses (irrigated farms +2 production) and Commission: Break the Sod, the Doctrine The Hydraulic Empire, Nezahualcoyotl's The Dikes (farms in Aqueduct towns) and Jayavarman VII's farms beside fresh water. It feeds the Specularium of change 09.
- **Shape:** Small extension on the row `qanat`: `watersBeside` gains a radius of 2; one in each town; a placement test "beside a hill or a mountain".
- **Confidence:** good
- **Depends, joins and notes:** A reading to confirm: the town's own hex has fresh water if it is in range.

#### 09. The Glassmakers' Charter (rework)

- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Now:** Opens Optics, which unlocks the Specularium: +3 food, and +1 science for every two citizens.
- **Proposed:** Opens Optics, which unlocks the Specularium: +3 food, and +1 science for each farm its town works.
- **Why:** +1 science for every two citizens is the Library's own rate. So the Specularium is a second Library, and its science rides on population, which is the science you want to cut. A specularium was a Roman glass house for plants. So it reads the fields.
- **Its science rides on:** The land: farms the town works. It follows population only because a town needs citizens to work farms.
- **Arithmetic:** A town works three to six farms: +3 to +6 science. Today a town of eight citizens pays +4. Optics costs 190 science, and 95 under change 53. The building costs 118 hammers.
- **Synergy:** **Raises:** food and science. **Reads:** farms worked. Fed by the qanat (change 08), Expansionist's farm cards and Commission: Break the Sod.
- **Shape:** Data on the building row: `pays` in a city, basis count, the worked hexes of its town that hold a farm.
- **Confidence:** good
- **Depends, joins and notes:** Your line of 2026-10-21 set the present rate. If you do not cut passive science, this change is not needed.

#### 10. The Scribes' Hall (rework)

- **Tier, rarity, type:** I, common, Civic
- **Now:** Towns with a Library gain +1 science for every four citizens.
- **Proposed:** Libraries give +2 science.
- **Why:** It is the second card that pays science for each citizen. The new line puts the science on the Library itself. Then everything that multiplies a Library multiplies it: Ibn al-Haytham ("your libraries pay double"), the Doctrine The Universitas, and Cai Lun's line. If the Library loses its rate for each citizen, this card gives a flat Library back to the seat that drafts it.
- **Its science rides on:** A building: the Library, a flat sum. It does not ride on population.
- **Arithmetic:** Five Libraries at turn 60: +10 science, where the median bot seat makes 26. Today the card pays +1 or +2 in a town of that size, so +5 to +10. Eleven Libraries at turn 100: +22, and +44 with Ibn al-Haytham.
- **Synergy:** **Raises:** science on a building. **Reads:** Libraries. Fed by The Founders' Schools (change 64). Multiplied by Ibn al-Haytham and The Universitas. Harun al-Rashid's The Storehouse of Wisdom pays the same building.
- **Shape:** Existing shape: `pays` in a city on the Library's own line. The rule of batch R2b puts a line counted by a kind of building into that building's package.
- **Confidence:** strong

#### 11. The Royal Estates (buff)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Each empire building gives its town +2 food and +2 production.
- **Proposed:** Each empire building gives its town +3 food and +3 production.
- **Why:** An empire can hold about ten empire buildings in a whole game, and two or three in Tier I. The card counts a thing that comes slowly and pays as if it were plentiful. The Magisterial pass found the same fault in the cards that count great-person works.
- **Arithmetic:** Three empire buildings at the end of Tier I: +9 and +9, which is 18 a turn and inside the Tier I bar of 15 to 25. At +2 it is 12. Ten in age 4: +30 and +30.
- **Synergy:** **Raises:** food and production. **Reads:** empire buildings. In Tier I those are the Heroic Epic, the Imperial Throne, Chart the Stars, the High Temple and the Mouseion. Fed by the Librarians', Physicians' and Printers' Charters (change 28), The Second Seat, and the Doctrines The Academy of Gondishapur and The Mustansiriya.
- **Shape:** Existing shape. A number change.
- **Confidence:** good
- **Depends, joins and notes:** The text is yours, of 2026-10-21. Only the number changes.

#### 12. The Sky Watchers (buff)

- **Tier, rarity, type:** I, common, Civic
- **Now:** Shrines give +1 faith and +1 science.
- **Proposed:** Shrines give +1 faith and +2 science.
- **Why:** It is the deck's only faith card, and it is the weakest card in Tier I. Five Shrines pay +5 and +5.
- **Its science rides on:** A building: the Shrine. It does not ride on population.
- **Arithmetic:** Five Shrines: +5 faith and +10 science, 15 a turn, at the low end of the Tier I bar.
- **Synergy:** **Raises:** faith and science on a building. **Reads:** Shrines. The Doctrine The Pythagorean Brotherhood pays the same towns, and Harun al-Rashid's The Storehouse of Wisdom pays the same building.
- **Shape:** Existing shape. A number change.
- **Confidence:** good

#### 13. The Dedications (rework)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Finishing a science building or an empire building grants culture equal to ten times the town's population.
- **Proposed:** Finishing a science building or an empire building grants culture equal to its production cost.
- **Why:** The present card pays more in a big town and no more for a big building: a Library and the Forum pay the same. The cost is the figure the player reads on the build list, and it grows with the ages by itself. The card then reads the deed and not the town's size.
- **Arithmetic:** A Library pays 51 culture. The Heroic Epic and Chart the Stars pay 135 each, the Mouseion 175, the Forum 231, a Scriptorium 303 and a University 520. In Tier I, four Libraries and two empire buildings: about 475 culture over thirty turns, where a seat makes about 25 culture a turn. Today the same builds pay about 280. It is strong, so it stays uncommon.
- **Synergy:** **Raises:** culture, and so drafts. **Reads:** science buildings and empire buildings finished. It joins The Apprentices (change 02), which pays science for every building. Fed by the building charters, The City Architects (27) and The Founders' Schools (64).
- **Shape:** Existing shape, with the cost measure of change 02.
- **Confidence:** good

#### 14. Learned Foundations (cut)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Cities with a Library build empire buildings 25% faster.
- **Proposed:** Cut. The row is retired.
- **Why:** Four cards and three Doctrines of this deck say "production toward a kind of building". This one reads a Library to speed about ten buildings in a whole game. The Doctrines The Academy of Gondishapur (+20%) and The Mustansiriya (+50%) do the same job.
- **Arithmetic:** Ten empire buildings at about 300 hammers each are 3,000 hammers in a game. 25% faster saves about 600 of them over 150 turns: 4 a turn.
- **Synergy:** Nothing reads it. The Royal Estates (change 11) and Enduring Institutions (24) pay for the same buildings.
- **Shape:** `retired: true`. The row stays for saves.
- **Confidence:** strong

#### 15. The Common Tables (cut)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Towns gain +2 food for each science building in them.
- **Proposed:** Cut. The row is retired.
- **Why:** Tier I holds six cards that say "a Library gives its town a thing": science, production, food, renown, strength and culture. That is the deck's one note at this tier. Food is the yield the deck now gets in other ways: The Royal Estates (change 11), the Specularium (09), the qanat (08) and the Doctrine The Removal to Xianyang.
- **Arithmetic:** Five Libraries: +10 food. With every school in ten towns in age 4 it reaches +60 to +80 food, so a late seat does lose something. The great people Maimonides, Āryabhaṭa and Brahmagupta still pay for each science building.
- **Synergy:** It read science buildings. Four cards of Tier I still read a Library after the pass, and The Royal Tutors reads science buildings.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** If you want one of the Library cards back, this is the first.

#### 16. The Reform of the Calendar (new)

- **Tier, rarity, type:** I, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** Entering a new age opens an Order draft at once.
- **Why:** A new age is the largest moment that research has, and no card of the deck reads it. You liked the new line for the great scholar John Dee: "immediately unlock two order drafts". This card makes the choice of what to research matter. The cheapest technology of the next age is a draft, so a seat may go deep first and learn the old age later.
- **Arithmetic:** A seat that drafts it in Tier I is in age 1 or 2, so it enters two or three ages with the card seated: two or three drafts. The price of a draft climbs: 53 to 183 culture in Tier I, 220 to 620 in Tier II, 680 and more in Tier III (`costBase` 12, `costLinear` 5, `costExponent` 2.2). A seat that enters age 3 at its twelfth draft and age 4 at its twentieth saves about 300 and 840 culture. That is two Tier II lumps (500 to 900 each) for a rare that pays nothing else. A free draft also moves the seat up the ladder, so the next tier opens sooner and the next draft costs more.
- **Synergy:** **Raises:** drafts, Orders held. **Reads:** ages entered. Fed by The Translation Movement (change 25), and by The Alfonsine Tables (29) and The Summa (30), which can finish the first technology of an age at once. It feeds Magisterial's The Twelve Tables, The Encyclopedia and Commission: The Roll of the Senate.
- **Shape:** New shape: a rider on the moment `ageEntered`, which the game announces and no card reads, with the grant "an Order draft opens". The great people John Dee and Aesop need the same grant.
- **Confidence:** good
- **Depends, joins and notes:** It must stay seated to pay. The Doctrine offer of the Magisterial pass's The Lawgiver is the nearest built thing.

#### 17. Commission: The Old Learning (new)

- **Tier, rarity, type:** I, uncommon, Wildcard
- **Now:** Not in the deck.
- **Proposed:** Goal: know every technology of the first age. Reward: choose a great scholar.
- **Why:** Tier I has no commission. The deck also has no card for the other way to research, which is to finish what you started. The first age has twelve technologies, and a seat that hurries on leaves three or four behind. The goal is cheap, and the reward comes at the time great people open.
- **Arithmetic:** The twelve cost 269 science in all. A bot seat knows 10 to 23 technologies at turn 60 (median 14), so the goal is met between turn 50 and turn 70. A scholar then is the first Academy, or a treatise of 8 turns of science (about 200 to 700).
- **Synergy:** **Raises:** great scholars. **Reads:** the technologies of the first age that the seat knows. It feeds The Lecture Halls (change 21), The Latin Quarter (22), The Roll of Scholars, Mehmed's The Enderun and Cleopatra's The Museion. The Translation Movement (25) makes the goal cheaper.
- **Shape:** Small extension: a commission goal "knows every technology of an age". The reward exists (`greatPerson: scholar`).
- **Confidence:** good
- **Depends, joins and notes:** For the builder to check: that a scholar granted before Epic Poetry can be called.

#### 18. The Charter Rolls (rework)

- **Tier, rarity, type:** II to I, uncommon, Civic
- **Now:** Tier II: Your capital gains +3 production and +3 culture for each charter you have drafted.
- **Proposed:** Tier I: Your Order hands hold one more card. It is a charter, while your decks have one to deal.
- **Why:** A seat is offered about three of its thirteen charters in a game (section 1.5). So the player cannot plan for the deck's own mechanic. Four cards pay the capital production and culture for a count: this card, The Astronomical Diaries, The Sum of Knowledge and The Republic of Letters. This one can do a better job. With it seated, every hand shows a charter beside its three cards, and the seat still takes one card.
- **Arithmetic:** Seated at draft 6, it is there for about twenty more hands. Tiers I to III hold twelve charters, so the seat is offered every one of them. Each charter it takes costs a pick and a technology. The card pays no yield: its worth is the charters.
- **Synergy:** **Raises:** charters offered, and so charter technologies known. **Reads:** the charters left in the seat's tiers, in both its decks (Expansionist holds eight). It feeds the Alchemists' Charter (+1 strength for each charter technology), The Great Catalogue, The Royal Charter Commission, and The Secret Arts (no rival can learn a charter technology).
- **Shape:** Small extension: `offerRider` on the Order offer exists (the wonder The Oracle adds one card). The extra card needs a filter that makes it a charter.
- **Confidence:** good
- **Depends, joins and notes:** It joins change 54. The split of 2026-10-20 gives rules about hands to Magisterial. I think a card that deals this deck's own keyword stays inside the deck. Say if you want it shared with Magisterial.

#### 19. Tier I rarities (move)

- **Tier, rarity, type:** I, four cards, all
- **Now:** The Librarians' Charter is rare. The Bronze-Founders' Charter, The Edge of the Sword and The Secret Arts are uncommon.
- **Proposed:** The Librarians' Charter becomes uncommon. The Bronze-Founders' Charter and The Edge of the Sword become common. The Secret Arts becomes rare.
- **Why:** With two rares and ten uncommons, each rare is seen more often than each uncommon. The Mouseion is the deck's supply of scholars and the first building of the institutions theme, so the seat should see it. The Secret Arts pays every town for a lead, and each charter technology adds to that lead for good. It is a card to build round.
- **Arithmetic:** Today: each common is the deck's card in 8.6% of hands, each uncommon in 3%, each rare in 5%. After the pass Tier I holds 8 commons at 7.5%, 9 uncommons at 3.3% and 3 rares at 3.3%.
- **Synergy:** The Secret Arts reads the lead, which the star chart shows. The Edge of the Sword keeps your text of 2026-10-21.
- **Shape:** No shape change. Four rarities.
- **Confidence:** good

**Tier II**

#### 20. The Old Academy (move)

- **Tier, rarity, type:** I to II, uncommon to common, Economic
- **Now:** Tier I, uncommon: Academies gain +3 food and +3 production.
- **Proposed:** Tier II, common, the same text.
- **Why:** Great people open at about turn 55, and Tier II opens at about turn 70 for a median seat. So a seat that drafts this card in Tier I waits twenty turns or more for its first Academy. In Tier II it pays at once.
- **Arithmetic:** An Academy yields 3 science today, and 4 under the great-people pass. With the card the hex yields 10, as much as the best farm. The Nizamiyya makes it 15.
- **Synergy:** **Raises:** food and production on a hex. **Reads:** Academies. Multiplied by The Nizamiyya and the Doctrine The Pandidakterion. It holds the food and production that The Quiet Faculties paid (change 23).
- **Shape:** No shape change. `band` 1 to 2, rarity to common.
- **Confidence:** good

#### 21. The Lecture Halls (was The Founding Gift) (rework)

- **Tier, rarity, type:** I to II, uncommon, Economic to Civic
- **Now:** Tier I: A great scholar who founds an Academy also grants its town 150 production.
- **Proposed:** Tier II: An Academy gains +2 science for each science building in its town.
- **Why:** 150 production three or four times in a game is a one-off that the player does not notice. The new card ties the deck's two oldest themes together, the schools and the Academies. The town with every school is the town to plant in. The science is on the Academy's hex, so The Nizamiyya and the Doctrine The Pandidakterion multiply it.
- **Its science rides on:** The map and buildings: an Academy's hex, counted by the schools of its town. It does not ride on population.
- **Arithmetic:** A town with a Library and a Scriptorium: +4 science on each Academy. A town with a Library, a University, a Scriptorium and a Printing House in age 4: +8 on each, +12 with The Nizamiyya, and twice that with The Pandidakterion. Two Academies in such a town: +16 to +48 science. The Tier II bar is 35 to 60.
- **Synergy:** **Raises:** science on a hex. **Reads:** Academies and the science buildings of their town. Fed by The Royal Tutors, Commission: The Old Learning (change 17), The Invitations, the Paper-Makers' Charter and The Forward Plans. Multiplied by The Nizamiyya, The Pandidakterion and Hypatia's legacy.
- **Shape:** Small extension: a hex row that counts the buildings of its town. The Commerce build adds it for The Patrons' Quarter.
- **Confidence:** good

#### 22. The Latin Quarter (rework)

- **Tier, rarity, type:** II, common to uncommon, Civic
- **Now:** Great-person works beside an Academy gain +2 culture and +1 production.
- **Proposed:** Hexes on or beside an Academy gain +2 science and +1 culture.
- **Why:** The present card needs two works side by side, and a seat holds three or four works at turn 100. You changed Magisterial's The Processional Way for that reason. A quarter is the streets round the school. Now one Academy is enough, and the player plants it where a town can work the six hexes round it.
- **Its science rides on:** The map: the hexes round an Academy, when a town works them. It does not ride on population.
- **Arithmetic:** An Academy and four worked hexes beside it: +10 science and +5 culture. All seven worked: +14 and +7. Two Academies: about +25 science and +12 culture, the low half of the Tier II bar (35 to 60). You approved Commerce's The Bonded Warehouses at +2 and +2 on the same seven hexes.
- **Synergy:** **Raises:** science and culture on hexes. **Reads:** Academies. With the Doctrine The Platonic Academy every work is an Academy. Magisterial's The Processional Way pays hexes beside two works, so the pair wants its works close together.
- **Shape:** Existing shape: `pays` on a hex with the tile tests `improvement` and `beside`. The row has both today.
- **Confidence:** good

#### 23. The Quiet Faculties (cut)

- **Tier, rarity, type:** II, rare, Economic
- **Now:** Towns working an Academy gain +25% food and +20% production.
- **Proposed:** Cut. The row is retired.
- **Why:** After the pass Tier II holds five cards for Academies. This one and The Old Academy both pay food and production. The Old Academy pays on the hex, where the doublers reach it. This card is a percentage in one to three towns, and it is a rare.
- **Arithmetic:** An Academy town that makes 40 food and 30 production gains +10 and +6. The uncommon The Round City pays every town of the empire.
- **Synergy:** The Old Academy (change 20) keeps the job.
- **Shape:** `retired: true`.
- **Confidence:** good

#### 24. Enduring Institutions (rework)

- **Tier, rarity, type:** II, uncommon to common, Economic to Civic
- **Now:** Towns with an empire building gain +20% production.
- **Proposed:** Each empire building gives its town +5 science.
- **Why:** Three cards pay production for empire buildings: this one, The Royal Estates and The Royal Academies. None pays science, and the deck has no science card after Tier II today. An empire building is one to a realm, so the seat must choose to build it. That is science from a deed.
- **Its science rides on:** Buildings: empire buildings, a flat sum. It does not ride on population.
- **Arithmetic:** Four empire buildings at turn 80: +20 science, where the median bot seat makes 85. Ten in age 4: +50. With The Second Seat or the Doctrine The Mustansiriya a second copy pays again.
- **Synergy:** **Raises:** science. **Reads:** empire buildings. Fed by the Librarians', Physicians' and Printers' Charters, The Second Seat (change 37) and the Doctrine The Academy of Gondishapur, which adds +15% science in the same towns.
- **Shape:** Existing shape: `pays` in a city, basis count, the empire buildings of the town. The Royal Estates has it.
- **Confidence:** good

#### 25. The Translation Movement (rework)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Technologies that an empire you have met already knows cost you 20% less research.
- **Proposed:** Technologies of an age before your newest cost you a third less research.
- **Why:** The present card pays a seat for being behind, and a Scientific seat is seldom behind. The new line reads the seat's own chart. It gives the player a plan: go deep to the next age, then learn the old age cheaply. The translators of Baghdad did that with the Greek books.
- **Arithmetic:** The second age costs 1,350 science in all and the third 10,440. A seat that enters age 4 with half of age 3 unlearned saves about 1,700 science, which is one technology. A seat that never leaves a technology behind saves nothing.
- **Synergy:** **Reads:** the age of each technology left. It joins The Reform of the Calendar (change 16), The Armoury Patterns (26) and The City Architects (27): all three pay a seat that enters an age early. It helps Commission: The Old Learning (17).
- **Shape:** Small extension: the rule `techPrice` (the Doctrine The Court of Rudolf II has it) with a selector "an age below the seat's newest".
- **Confidence:** good
- **Depends, joins and notes:** The rule `gapTechCost` then has no live card.

#### 26. The Armoury Patterns (rework)

- **Tier, rarity, type:** II, common, Military
- **Now:** Towns build units of the newest age you know 25% faster.
- **Proposed:** Your units of the newest age you know gain +4 strength.
- **Why:** This is what a technology lead buys in this game: an army one age newer. Today three Orders and a Doctrine pay for that lead only against an empire that knows less, so they pay nothing while the seat is level. This card reads the seat's own tree. Units upgrade when their technology lands, so the card asks the player to research the army's technologies first in each age.
- **Arithmetic:** +4 is 12% of a second-age unit (30 to 35) and 8% of a third-age unit (42 to 50). Tier II's bar is +5 regular and +8 strong. It is under the regular line because the step to a new age already adds 10 to 15 strength.
- **Synergy:** **Raises:** strength. **Reads:** the age of each unit. Fed by research upgrades, The Model Army (change 35) and The Prototype Works (31). It adds to The War Manuals, the charter traits and the Tophane.
- **Shape:** Small extension: the unit filter `newestAge`, which the row has on a production bonus, on a `combatLine`.
- **Confidence:** good

#### 27. The City Architects (rework)

- **Tier, rarity, type:** II, common, Economic
- **Now:** Towns of at least eight citizens build wonders 25% faster.
- **Proposed:** Towns build the buildings and wonders of the newest age you know 30% faster.
- **Why:** Your direction of 2026-10-20 says that Scientific "gets earlier access" to wonders. No card gives that since The Great Designs was cut. This card gives the seat that reaches an age first a head start on everything in it, and it reads no rival. It is the peace half of change 26.
- **Arithmetic:** A third-age wonder costs 501 to 860 hammers: the card saves 115 to 200. A University costs 520: it saves 120. A town that makes 30 production builds the newest things as if it made 39.
- **Synergy:** **Raises:** production toward new buildings and wonders. **Reads:** the age of the row. It joins changes 16 and 25. It adds to The Free Cities (+20%), the shared The House of Wisdom and Magisterial's The Cornerstone. It feeds The Apprentices, The Dedications and The Lodge Books (65).
- **Shape:** Small extension: the `newestAge` filter on a production bonus for buildings and wonders. `buildingTechAge` gives the age of a row.
- **Confidence:** good
- **Depends, joins and notes:** The card no longer reads town size.

#### 28. The Printers' Charter (rework)

- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Opens Printing, which unlocks the Aldine Press: +2 culture and +1 trade route.
- **Proposed:** Opens Printing: +1 trade route, and you may build the Aldine Press, one in your empire: +1 culture for each technology you know.
- **Why:** 650 science and a building for +2 culture is the weakest charter in the deck. A press prints what the realm knows. As an empire building it also joins the institutions.
- **Arithmetic:** 28 technologies at turn 100: +28 culture, where a bot seat makes 50 to 170. 45 late: +45. The building costs 303 hammers. Printing costs 650 science, and 325 under change 53.
- **Synergy:** **Raises:** culture, empire buildings, trade routes. **Reads:** technologies known. As an empire building it is read by The Royal Estates, Enduring Institutions (change 24), The Royal Academies and The Invitations, which grants a scholar when it is built. The route serves a Commerce partner and Cleopatra's Books from the Ships.
- **Shape:** Data on the building row: `oncePerEmpire`, and `pays` with basis count `techsKnown`.
- **Confidence:** good

#### 29. The Alfonsine Tables (new)

- **Tier, rarity, type:** II, rare, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: complete the technology you are researching. Your towns make 30% less science for fifteen turns.
- **Why:** The deck has no boon and no card with a risk. Alfonso X of Castile paid a house of astronomers for ten years to make new tables of the stars. The card is a loan of science. The player chooses what to aim at before they take it: the most expensive technology they can research.
- **Arithmetic:** At the start of Tier II a median bot seat makes about 85 science, and its most expensive open technology costs 650 to 1,150. So the boon is worth 8 to 13 turns of science at once. The cost is 30% of fifteen turns, about 4.5 turns. Late in the tier: 180 science a turn and a technology of 1,960, 11 turns for 4.5. If the technology is nearly finished, the card is a loss.
- **Synergy:** **Raises:** technologies completed, at once. It triggers every card that pays on a technology: The Astronomical Diaries, The Journeymen, The Scholars' Fame, the shared The Royal Patents, and The Reform of the Calendar (change 16) when it is the first of an age. **Reads:** the technology in hand.
- **Shape:** Two small extensions. An on-draft grant "complete the current technology": the wonder The House of Wisdom grants a technology when it is finished. A boon that hangs a timed effect on the player: the Commerce build adds it for Letters of Credit.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. You ruled in the Commerce pass that a boon may carry a timed drawback.

#### 30. The Summa (new)

- **Tier, rarity, type:** II, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** A great scholar's treatise completes the technology you are researching.
- **Why:** A treatise is 8 turns of science. So it is worth less after a cut to science, and most to the seat that is already ahead. This card makes it worth one technology, whatever the technology costs. It gives the scholar's choice a new side: an Academy for the land, or the most expensive technology on the chart, now.
- **Arithmetic:** A treatise at turn 100 is about 1,400 science for a median bot seat (8 times 179). A third-age technology costs 360 to 1,150, so there the card adds little. It matters for the large ones: 1,960 to 5,150 in age 4, and Alchemy at 8,000, which is 18 turns for a seat that makes 440. A seat calls 2 or 3 great people an age, and not all are scholars.
- **Synergy:** **Raises:** technologies completed. **Reads:** treatises (the moment `greatPersonAct`). Fed by The Royal Tutors, The Scholars' Fame, Commission: The Old Learning, The Royal Charter Commission, The Invitations and Sejong's kit. It feeds every card that pays on a technology, and The Closed Book (change 41).
- **Shape:** Small extension: the scholar's act pays at least what the current technology still needs.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. With The Collected Works (change 39) one scholar finishes two technologies.

#### 31. The Prototype Works (move)

- **Tier, rarity, type:** IV to II, rare, Economic
- **Now:** Tier IV: You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted.
- **Proposed:** Tier II: You may build the buildings and train the units of the technology you are researching, at one and a half times their production cost. Wonders are excepted.
- **Why:** At Tier IV almost nothing is left to research. At Tier II the card puts the seat one technology ahead in what it fields, for a price, for the rest of the game. It also makes the choice of research matter each turn: the technology under study is the one whose rows are open.
- **Arithmetic:** A Legionary costs 81 hammers and 122 with the card, while the seat still trains Swordsmen at 46. An Aqueduct costs 265, and 398 with the card. Double (530) is too much for a town that makes 15.
- **Synergy:** **Reads:** the technology in hand. It feeds The Armoury Patterns (change 26): a unit of the next age is of the newest age the day its technology lands. It joins The City Architects (27).
- **Shape:** No shape change. `band` 4 to 2, and the rule's price from 200 to 150.
- **Confidence:** speculative
- **Depends, joins and notes:** On 2026-10-21 you ruled that charters do not open units early, because "the jump from one age of units to the next is too high". This card opens them one technology early at a price. If that is still too much, keep the price at double.

#### 32. Tier II rarities (move)

- **Tier, rarity, type:** II, six cards, all
- **Now:** The Mechanists' Charter is rare. The Paper-Makers' Charter, The Physicians' Charter, The Palace Schools, The Strategikon and The Roll of Scholars are uncommon.
- **Proposed:** The Mechanists' Charter becomes uncommon. The other five become common.
- **Why:** Tier II holds 3 commons and 11 uncommons, so each common is seen seven times as often as each uncommon. The three commons are The Latin Quarter, The City Architects and The Armoury Patterns. The five cards that move are plain and useful to most seats, which is what a common is.
- **Arithmetic:** Today: each common is the deck's card in 20% of hands, each uncommon in 2.7%, each rare in 3.3%. After the pass Tier II holds 9 commons at 6.7%, 7 uncommons at 4.3% and 4 rares at 2.5%.
- **Synergy:** No card changes its text here.
- **Shape:** No shape change. Six rarities.
- **Confidence:** good

**Tier III**

#### 33. The Age of Reason (rework)

- **Tier, rarity, type:** III, rare, Wildcard
- **Now:** Your Orders count each technology you complete twice.
- **Proposed:** Cards that pay when you complete a technology pay twice.
- **Why:** The game already does this. The rule doubles the riders as well as the counters (`techCountsFor` has both readers). The text does not say so, and a player reads "count" as the scaler alone. The new words match The Double Entry, which you approved for Commerce.
- **Arithmetic:** With The Journeymen, The Astronomical Diaries and The Scholars' Fame seated, each technology pays 72 production in a town of twelve, +2 and +2 on the Diaries, and renown equal to a tenth of its cost. With the shared The Royal Patents: 600 gold for each technology in age 3.
- **Synergy:** **Reads:** every card that pays on a technology: The Royal Workshops, The Astronomical Diaries, The Scholars' Fame, The Journeymen, The Royal Patents. The deeds that complete a technology (changes 29, 30, 65, 66) make the moment come more often.
- **Shape:** Wording only. The data row does not change.
- **Confidence:** strong

#### 34. The Humanists (rework)

- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Cities with a University gain culture equal to half their base science.
- **Proposed:** Towns with a Library gain culture equal to a quarter of their science.
- **Why:** In the three bot games I ran, four seats of eighteen held a University at the last reading of their game (turns 100, 120 and 140). So the card paid nothing for most seats. A Library is in every town.
- **Arithmetic:** A seat that makes 179 science at turn 100 gains about +45 culture, and a leading seat with 600 gains +150. The Tier III bar is 60 to 120. Today most seats gain nothing.
- **Synergy:** **Raises:** culture. **Reads:** the science of Library towns. Magisterial's The Learned Patron is the mirror (science equal to 30% of culture in Amphitheater towns). For the builder to check: that the two read base figures and do not feed each other.
- **Shape:** Existing shape: `pays` in a city, basis share, with the scope changed to a Library and the share to 25.
- **Confidence:** good
- **Depends, joins and notes:** The card reads science, so a cut to passive science makes it smaller.

#### 35. The Model Army (buff)

- **Tier, rarity, type:** III, rare to uncommon, Military
- **Now:** Research upgrades your units even when you lack the strategic resource the new unit needs.
- **Proposed:** Research upgrades your units even when you lack the strategic resource the new unit needs, and an upgrade heals the unit.
- **Why:** Commerce's Foreign Procurement does this job for bought units, and that pass made it a common. The rule that heals a unit on its upgrade is built (`upgradeHeals`) and has had no card since The Field Refits was cut.
- **Arithmetic:** A seat with no iron keeps Swordsmen while its rivals field Legionaries. With the card its whole line upgrades. The heal: a technology that lands during a war restores every unit of that line.
- **Synergy:** **Reads:** research upgrades. It feeds The Armoury Patterns (change 26) and the Doctrine The Nassau Reforms (58). A treatise or The Alfonsine Tables can land the upgrade on the turn the player chooses.
- **Shape:** Existing shapes: the rules `upgradeIgnoresResource` and `upgradeHeals`.
- **Confidence:** good

#### 36. The Gunfounders' Charter (buff)

- **Tier, rarity, type:** III, uncommon, Military (Charter)
- **Now:** Opens Gunfounding, which unlocks the Tophane: its town builds military units 25% faster, with +4 strength.
- **Proposed:** Opens Gunfounding, which unlocks the Tophane: its town builds military units 50% faster, with +6 strength.
- **Why:** The seat pays 3,250 science and 681 hammers for a bonus in one town. Mehmed's seat should want this charter, and today it does not pay its price.
- **Arithmetic:** +6 is 8% to 13% of a fourth-age unit (45 to 80). A town with 60 production trains units as if it made 90. Gunfounding costs 3,250 science, and 1,625 under change 53.
- **Synergy:** **Raises:** strong units from one town. **Reads:** the Tophane, an empire building. It adds to The Palace Schools (+4 in a town with an empire building, so +10 here) and The Armoury Patterns.
- **Shape:** Data on the building row `tophane`.
- **Confidence:** speculative
- **Depends, joins and notes:** You set +4 on 2026-10-21. A charter technology cost half again at that time. If you keep +4, raise only the speed.

#### 37. The Second Seat (buff)

- **Tier, rarity, type:** III, rare, Civic
- **Now:** You may build one second copy of an empire building, in a city with a University.
- **Proposed:** You may build one second copy of an empire building, in a city with a Library.
- **Why:** You wrote of this card: "love this one". It needs a University, and in the three bot games four seats of eighteen held one at the last reading of their game. A University costs 520 hammers and needs a fourth-age technology of 1,960 science. So the card is often dead when it is dealt.
- **Arithmetic:** A second Forum, High Temple or Bourse in a second town. With The Royal Estates, Enduring Institutions and The Royal Academies the copy is worth +3 food, +3 production, +5 science, and +5% production and culture for the empire.
- **Synergy:** **Raises:** empire buildings. **Reads:** a Library. It feeds every card of the institutions theme, and The Invitations grants a scholar for the copy.
- **Shape:** Existing shape. The scope of the rule changes from a University to a Library.
- **Confidence:** speculative
- **Depends, joins and notes:** Bots are slow to build Universities. In your own games you may hold several by Tier III. If so, reject this.

#### 38. The Proving Ground (cut)

- **Tier, rarity, type:** III, uncommon, Military
- **Now:** Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8.
- **Proposed:** Cut. The row is retired.
- **Why:** Three Orders and a Doctrine read the lead. This one pays most to the seat that is already furthest ahead. After the pass The Armoury Patterns and the Alchemists' Charter pay the army for the seat's own tree.
- **Arithmetic:** A seat that leads by three technologies gains +3. The Alchemists' Charter gives +4 to +6 to the warrior line once the seat sees its charters, and The Armoury Patterns gives +4 to every unit of the newest age.
- **Synergy:** The lead keeps The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** Question 1.

#### 39. The Collected Works (new)

- **Tier, rarity, type:** III, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** Your great scholars may act twice.
- **Why:** You approved this line for great merchants in Commerce (The Company of the Staple). For a scholar it ends the choice between the treatise and the Academy: they write and then they found, or they write twice. It is the capstone for a seat that calls many scholars, which is Sejong's way to play.
- **Arithmetic:** A second treatise at turn 120 is 8 turns of science, about 2,000 for a median bot seat. A second Academy is 4 science and what the deck's cards put on it, about 15 to 25 a turn. With The Summa a scholar finishes two technologies.
- **Synergy:** **Raises:** treatises and Academies. **Reads:** great scholars. Fed by every way to gain a scholar: The Royal Tutors, The Scholars' Fame, The Invitations, the commissions, The Invisible College (change 51). It feeds The Summa, The Lecture Halls, The Latin Quarter, The Republic of Letters (44) and Commission: The Lynx-Eyed Academy (43).
- **Shape:** The Commerce build's new shape, "a great person of one family acts twice", with the family scholar.
- **Confidence:** good

#### 40. The Foundation Stone (move)

- **Tier, rarity, type:** IV to III, rare, Economic
- **Now:** Tier IV: You may begin the Magnum Opus once Alchemy is half researched.
- **Proposed:** Tier III, the same text.
- **Why:** In the three bot games the median seat held 18 to 24 drafts when the game ended, and Tier IV opens at 26. The leading seats reached Tier IV three technologies from Alchemy. So the card is dealt after its moment. The first empire to learn Alchemy opens the Magnum Opus for every empire. This card and The Closed Book are the only things that turn a lead into a head start.
- **Arithmetic:** Alchemy costs 8,000 science, and half is 4,000. A seat that makes 440 science begins the Opus nine turns early. The Opus costs about 2,535 hammers.
- **Synergy:** **Reads:** the science banked toward Alchemy. It joins The Closed Book (change 41) and The Great Instrument (42). The Summa and The Alfonsine Tables then finish Alchemy on the turn the player chooses.
- **Shape:** No shape change. `band` 4 to 3.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

#### 41. The Closed Book (move)

- **Tier, rarity, type:** IV to III, rare to uncommon, Civic
- **Now:** Tier IV, rare: If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns.
- **Proposed:** Tier III, uncommon, the same text.
- **Why:** The reason of change 40. It also becomes uncommon, because each Tier IV rare is the deck's card in one hand in seventy, and this is the card that makes the last technology a race.
- **Arithmetic:** Ten turns of a town that makes 150 production are 1,500 hammers of the Opus's 2,535.
- **Synergy:** **Reads:** Alchemy, first. Fed by every card that speeds research and by the deeds that complete a technology.
- **Shape:** No shape change. `band` 4 to 3, rarity to uncommon.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

#### 42. The Great Instrument (move)

- **Tier, rarity, type:** IV to III, rare to uncommon, Wildcard
- **Now:** Tier IV, rare: Goal: complete Alchemy. Reward: a tenth of the Magnum Opus.
- **Proposed:** Tier III, uncommon: Goal: complete Alchemy. Reward: a fifth of the Magnum Opus.
- **Why:** The game does not deal this card to a seat that knows Alchemy. At Tier IV a leading seat knows it or is about to. A tenth of the Opus is 254 hammers, less than one fourth-age unit.
- **Arithmetic:** A fifth is about 507 hammers. That is under the Tier III lump bar of 1,000, but it lands on the first turn of the race.
- **Synergy:** **Reads:** Alchemy completed. It joins changes 40 and 41.
- **Shape:** No shape change. `band` 4 to 3, the reward's share from 0.1 to 0.2.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

#### 43. Commission: The Lynx-Eyed Academy (rework)

- **Tier, rarity, type:** IV to III, rare to uncommon, Wildcard
- **Now:** Tier IV, rare: Goal: hold four Academies. Reward: a great scholar, and 300 production in each town with an Academy.
- **Proposed:** Tier III, uncommon: Goal: hold three Academies. Reward: a great scholar, and Academies gain +5 science and +5 culture.
- **Why:** A one-off does not register: 1,200 production at the end of the game, when a unit costs 400 to 580. A lasting reward on the Academy is multiplied by the cards that multiply Academies. Three Academies is what a seat that plants every scholar holds in Tier III.
- **Its science rides on:** The map: Academies. It does not ride on population.
- **Arithmetic:** Four Academies after the reward: +20 science and +20 culture, and +30 and +30 with The Nizamiyya.
- **Synergy:** **Raises:** great scholars, science and culture on a hex. **Reads:** Academies held. Fed by The Collected Works (change 39) and the Doctrine The Platonic Academy.
- **Shape:** Existing shapes: the goal figure `academyHexes` at 3, and a `lasting` hex row as the reward.
- **Confidence:** good

#### 44. The Republic of Letters (rework)

- **Tier, rarity, type:** IV to III, uncommon, Civic
- **Now:** Tier IV: Your capital gains +4 production and +4 culture for each Academy you hold.
- **Proposed:** Tier III: Every town gains +2 science and +2 culture for each Academy you hold.
- **Why:** Your picture of the deck names this card: "gain X from each academy in your land". Today four cards pay the capital production and culture for a count. A republic of letters reaches every town.
- **Its science rides on:** The map: Academies held, paid in every town. It grows with the number of towns, not with citizens.
- **Arithmetic:** Three Academies and eight towns: +48 science and +48 culture, 96 a turn, inside the Tier III bar (60 to 120). Four Academies and twelve towns: +96 and +96. Today: +12 and +12.
- **Synergy:** **Raises:** science and culture in every town. **Reads:** Academies held. Fed by every scholar, The Collected Works and The Platonic Academy.
- **Shape:** Existing shape: `pays` in every city, basis count. The count "Academies in the empire" exists as the commission figure `academyHexes`.
- **Confidence:** good

#### 45. The Military Engineers' Charter (move)

- **Tier, rarity, type:** IV to III, uncommon to common, Military (Charter)
- **Now:** Tier IV, uncommon: Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points.
- **Proposed:** Tier III, common, the same text.
- **Why:** A fortress is a thing to build before the war, and the war for the Opus comes in Tier III.
- **Arithmetic:** Military Architecture costs 3,250 science, and 1,625 under change 53. A Bastion costs 681 hammers.
- **Synergy:** **Raises:** town defence, charter technologies known. It serves the Alchemists' Charter and The Great Catalogue, which count charter technologies.
- **Shape:** No shape change. `band` 4 to 3, rarity to common.
- **Confidence:** good

#### 46. The Naval Gunners' Charter (cut)

- **Tier, rarity, type:** IV, uncommon, Military (Charter)
- **Now:** Opens Naval Gunnery: your Gun Galleys gain +3 strength and may blockade a rival's port.
- **Proposed:** Cut. The row is retired.
- **Why:** Naval Gunnery stands in Alchemy's column and costs 8,000 science: 18 turns of research for +3 strength on one kind of ship and a blockade. It is the fourth army charter, and it needs a coast.
- **Arithmetic:** 8,000 science is the price of Alchemy. At half price it is still the price of two fourth-age technologies.
- **Synergy:** No card reads Gun Galleys.
- **Shape:** `retired: true` on the card. The technology row stays for saves.
- **Confidence:** good
- **Depends, joins and notes:** The other choice: move it to Tier III and place Naval Gunnery at 3,250. Commerce now has fifteen sea cards, so Cleopatra's seat could want it.

#### 47. Tier III rarities (move)

- **Tier, rarity, type:** III, one card, Civic
- **Now:** The Nizamiyya is uncommon. Tier III holds 2 commons, 6 uncommons and 4 rares.
- **Proposed:** The Nizamiyya becomes common. With the other changes Tier III holds 5 commons, 8 uncommons and 5 rares.
- **Why:** Tier III has two commons, The Journeymen and The Doctorate, and each is the deck's card in three hands of ten. "Academies yield 50% more" is a plain multiplier on a thing the seat has, which is what a common is.
- **Arithmetic:** Today: each common 30% of hands, each uncommon 5%, each rare 2.5%. After the pass: each common 12%, each uncommon 3.75%, each rare 2%.
- **Synergy:** No card changes its text here.
- **Shape:** No shape change. One rarity.
- **Confidence:** good

**Tier IV**

#### 48. The Sum of Knowledge (rework)

- **Tier, rarity, type:** IV, rare to uncommon, Civic to Economic
- **Now:** Your capital gains +1 production and +1 culture for each technology you know.
- **Proposed:** The town raising your Magnum Opus gains +2 production for each technology you know.
- **Why:** The Astronomical Diaries counts the same technologies from Tier I and pays the same two yields in the same town. At Tier IV this card pays +50 and +50, which is the size of Magisterial's Tier 0 rare The Twelve Tables. The end of the game is the Opus, so the count goes there.
- **Arithmetic:** 50 technologies: +100 production toward an Opus of about 2,535 hammers. The generic The Grand Design pays about 75. With The Great Catalogue at +40%: 140.
- **Synergy:** **Raises:** production toward the Opus. **Reads:** technologies known, charter technologies included.
- **Shape:** Existing shapes: `pays` with basis count `techsKnown`, in the town that raises the Opus (The Grand Design has that scope).
- **Confidence:** good

#### 49. The Walls of Learning (cut)

- **Tier, rarity, type:** IV, common, Military
- **Now:** Towns with a University gain +6 defence.
- **Proposed:** Cut. The row is retired.
- **Why:** It is the only common of Tier IV, so it is the deck's card in three hands of five. It pays +6 defence in towns with a University, which few seats hold. The generic City Watches gives +8 defence to every town.
- **Arithmetic:** +6 defence on a town of strength 60 to 80.
- **Synergy:** Nothing reads it. The Doctrine The Trace Italienne (change 63) holds the defence of the Opus.
- **Shape:** `retired: true`.
- **Confidence:** strong

#### 50. The Laboratories (new)

- **Tier, rarity, type:** IV, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Science buildings give +2 production.
- **Why:** Tier IV needs a common that a seat is glad to see. After Alchemy science has no use, and the schools are the seat's largest set of buildings. This turns them toward the Opus and the last army.
- **Arithmetic:** Three science buildings in each of ten towns: +60 production, the low end of the Tier IV bar (60 to 120). The production is on each building, so The Universitas doubles it in the big towns.
- **Synergy:** **Raises:** production. **Reads:** science buildings. Fed by the Paper-Makers' Charter, The Forward Plans and The Founders' Schools.
- **Shape:** Existing shape: `pays` in a city, basis count, buildings of the science category. Commerce's The Cloth Halls is the same line for gold buildings.
- **Confidence:** good

#### 51. The Invisible College (new)

- **Tier, rarity, type:** IV, rare, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: choose two great scholars.
- **Why:** Magisterial's The Nine Jewels gives two free great-person drafts. This is the deck's own form: two scholars at the time of Alchemy. The Invisible College was the circle of English scholars that became the Royal Society.
- **Arithmetic:** Two treatises are 16 turns of science, about 7,000 for a seat that makes 440, where Alchemy costs 8,000. With The Summa they are two technologies. A seat that will not finish the tree plants two Academies.
- **Synergy:** **Raises:** great scholars. It feeds The Summa, The Collected Works, The Republic of Letters, The Roll of Scholars and The Doctorate, and it triggers the leaders' lines that count great people.
- **Shape:** Existing shape: the on-draft grant `greatPerson` with the family scholar, twice.
- **Confidence:** good

#### 52. The Great Catalogue (move)

- **Tier, rarity, type:** IV, rare to common, Economic
- **Now:** Rare: +10% production toward the Magnum Opus for each charter technology you know, at most +40%.
- **Proposed:** Common, the same text.
- **Why:** Tier IV holds seven rares today, and each is the deck's card in one hand in seventy. This card is the pay-off for the charters, and the seat that took four of them should see it.
- **Arithmetic:** A seat is offered about three charters today, so the card pays +10% to +30%. With changes 18 and 54 a seat knows four to six charter technologies: +40%.
- **Synergy:** **Reads:** charter technologies known. Fed by every charter and by The Charter Rolls.
- **Shape:** No shape change. One rarity.
- **Confidence:** good

**Rules**

#### 53. A charter technology costs half the price of its column (rule)

- **Tier, rarity, type:** 0 to III, a rule, not a card, the thirteen charters
- **Now:** A charter technology costs the price of its column, as an ordinary technology does (batch DS9). Until 2026-11-11 it cost half again.
- **Proposed:** A charter technology costs half the price of its column.
- **Why:** A charter is dealt when its column is the most expensive the seat can research. So it costs a median seat 5 to 18 turns of all its research (section 1.5), which is about one and a half ordinary technologies. For that the seat gets one building to build or one trait. At half price a charter technology delays the tree by less than one technology. The price list prints the line, as it printed the old premium.
- **Arithmetic:** Herbals 24 to 12. Casting and Astronomy 50 to 25. Surveying and Cataloguing 100 to 50. Optics 190 to 95. Medicine 360 to 180. Papermaking and Printing 650 to 325. Mechanics 1,150 to 575. Gunfounding, Chemistry and Military Architecture 3,250 to 1,625.
- **Synergy:** It makes every charter cheaper, and so it feeds the cards that count charter technologies. Each charter technology is also a technology completed, so it triggers the cards that pay on that moment.
- **Shape:** Small rules change: one line in `explainTechCost`, and a figure in `data/rules.json` where `charterPremiumPercent` stood.
- **Confidence:** good
- **Depends, joins and notes:** Question 4. The other way is to place the fourth-age charter technologies under third-age parents on your chart, which puts them at 1,960.

#### 54. A charter is dealt in its own tier and in the next (rule)

- **Tier, rarity, type:** 0 to III, a rule, not a card, the thirteen charters
- **Now:** A charter is dealt only in its own tier.
- **Proposed:** A charter is dealt in its own tier and in the next one.
- **Why:** A seat is offered about three of its thirteen charters in a game. A charter takes no chair, so a late charter is still useful, and its technology is cheaper against the seat's science by then. The row field exists (`lastBand`): Double Time, The Gathering Grounds and Levy of the Land use it.
- **Arithmetic:** Offered at least once: a Tier I uncommon charter goes from 17% of games to 34%, a Tier II common charter to 70%. The seat is offered about 5.6 of its 13 charters, where it is offered 3.0 today. With The Charter Rolls seated it is offered every charter of Tiers I to III.
- **Synergy:** It feeds every card that counts charters or charter technologies.
- **Shape:** Data only: `lastBand` on thirteen rows.
- **Confidence:** good
- **Depends, joins and notes:** Question 4.

**Doctrines**

#### 55. The Natural Histories (doctrine)

- **Tier, rarity, type:** I, new Doctrine, learned land
- **Now:** Not in the deck.
- **Proposed:** Each town gains +1 science for each different kind of improvement it works.
- **Why:** Tier I's learned-land Doctrine pays Academies, and the first Academy comes twenty turns later (change 56). This one works from the day the seat takes it. It changes how the seat improves land. A farm, a mine, a pasture, a quarry, a Physic Garden and a star tower are six kinds, so a town wants one of each before it wants a second farm. It has no drawback: the cost is the land the seat does not specialise.
- **Its science rides on:** The map and a choice: the kinds of work a town holds. It does not ride on population.
- **Arithmetic:** A town that works five kinds: +5 science. Five towns at turn 60: +25 science, where the median bot seat makes 26. Ten towns with seven kinds in age 3: +70. The kinds are the farm, mine, quarry, pasture, camp, plantation, fishing boats and lumber mill, the deck's three works, an Academy, and the works of the partner deck.
- **Synergy:** **Raises:** science. **Reads:** the different improvements among a town's worked hexes. Fed by the three charters that open works, by Expansionist's eight charters, and by great-person works.
- **Shape:** New count: the different improvements among a town's worked hexes.
- **Confidence:** good

#### 56. The Peripatetic School (doctrine)

- **Tier, rarity, type:** I to II, Doctrine, moved, learned land
- **Now:** Tier I: Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown.
- **Proposed:** Tier II, the same text.
- **Why:** The tier-4 governments offer it at about turn 35, and great people open at about turn 55. A seat that takes it holds no Academy for twenty turns or more.
- **Arithmetic:** One Academy with the Doctrine yields 5 science and 2 production today. Under the great-people pass a work pays 4 and grows to 8, so the hex pays 6 to 10 science.
- **Synergy:** **Reads:** Academies. It adds to The Old Academy, The Lecture Halls and The Latin Quarter, and The Pandidakterion doubles the hex after it.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

#### 57. The Jixian Academy (doctrine)

- **Tier, rarity, type:** II, Doctrine, engine
- **Now:** Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture.
- **Proposed:** Completing a technology grants culture equal to a fifth of its cost.
- **Why:** In ages 2 and 3 the two halves are about equal, so the Doctrine does nothing for forty turns after the seat takes it. You removed the penalty from Commerce's The Delian League because it grew late in the game.
- **Arithmetic:** Age 3: a technology of about 700 every three or four turns is +40 culture a turn, and 25% of a seat's 50 to 170 culture is 12 to 42 lost. Age 4: about +250 a turn against 110 lost. Without the penalty it is +40 a turn in age 3 and +250 in age 4, where a seat makes about 440.
- **Synergy:** **Reads:** technologies completed and their cost. The deeds that complete a technology pay it too: Alchemy by a treatise is 1,600 culture.
- **Shape:** Data only: one effect row goes.
- **Confidence:** good
- **Depends, joins and notes:** If +250 a turn in age 4 is too much, make the share a sixth.

#### 58. The Nassau Reforms (doctrine)

- **Tier, rarity, type:** IV to II, Doctrine, moved, elite army
- **Now:** Tier IV: Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly.
- **Proposed:** Tier II, the same text.
- **Why:** A unit line upgrades three or four times in a game. The tier-26 governments come after the last upgrade for most lines, so the Doctrine pays nothing when it is offered.
- **Arithmetic:** A Swordsman kept from Tier II becomes a Legionary and then a Longswordsman: +4. An Archer becomes a Bowman, a Composite Bowman and a Crossbowman: +6.
- **Synergy:** **Reads:** research upgrades. It rewards a small army that lives, which is the deck's army. The Model Army (change 35) heals each upgrade.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

#### 59. The Volley Fire (doctrine)

- **Tier, rarity, type:** III, Doctrine, elite army
- **Now:** Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength.
- **Proposed:** Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units lose 4 strength.
- **Why:** Your rule of 2026-11-19: no percentages of combat strength. Combat is flat points on one list.
- **Arithmetic:** 10% of a third-age melee unit (42 to 50) is 4 to 5.
- **Synergy:** The first clause does not change. The War Manuals (change 03) gives the archer line +2.
- **Shape:** Existing shape: a negative `combatLine` for the melee class in place of the `unitStat` percentage.
- **Confidence:** strong

#### 60. The Mustansiriya (was The Külliye) (doctrine)

- **Tier, rarity, type:** III, Doctrine, renamed, institutions
- **Now:** The Külliye: Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works.
- **Proposed:** The same text, under the name The Mustansiriya.
- **Why:** In the leader pass you named Mehmed's building The Külliye. Two things with one name confuse the Compendium. The Mustansiriya of Baghdad (1227) taught the four schools of law and the sciences in one house.
- **Arithmetic:** No number changes.
- **Synergy:** No change.
- **Shape:** Data only: the name. The id stays.
- **Confidence:** strong
- **Depends, joins and notes:** The other choice is to rename Mehmed's building.

#### 61. The Platonic Academy (doctrine)

- **Tier, rarity, type:** IV to III, Doctrine, moved, learned land
- **Now:** Tier IV: Your great people of every family found an Academy as their work, in place of their own.
- **Proposed:** Tier III, the same text.
- **Why:** A seat calls two or three great people an age. At the tier-26 governments one or two are left to come.
- **Arithmetic:** Three more people in Tier III are three more Academies, each worth 15 to 25 a turn with the deck's cards, and each counts for The Republic of Letters and The Lynx-Eyed Academy.
- **Synergy:** **Raises:** Academies. It feeds changes 21, 22, 43 and 44.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

#### 62. The Court of Rudolf II (doctrine)

- **Tier, rarity, type:** IV, Doctrine, reworked, engine
- **Now:** Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more.
- **Proposed:** The town raising your Magnum Opus gains production equal to a tenth of your science.
- **Why:** The tier-26 governments come when a leading seat has three to five technologies left, so a discount on the fourth age saves little. Almost every fourth-age technology leads to Alchemy, so the penalty reaches Geomancy alone. Rudolf's court at Prague kept alchemists to make the Great Work. After Alchemy science has no use in this game. This gives it one, and it is the deck's own way to win.
- **Arithmetic:** A seat with 440 science: +44 production. A leading seat with 1,500 to 2,400: +150 to +240 a turn toward an Opus of about 2,535 hammers. Your ruling of 2026-10-12 puts no cap on bonuses toward the Opus.
- **Synergy:** **Raises:** production toward the Opus. **Reads:** the empire's science. Fed by every science card of the deck.
- **Shape:** Small extension: a share that reads the empire's science rate and pays the town that raises the Opus.
- **Confidence:** good
- **Depends, joins and notes:** It reads science, so a cut to passive science makes it smaller.

#### 63. The Trace Italienne (doctrine)

- **Tier, rarity, type:** IV, new Doctrine, elite army
- **Now:** Not in the deck.
- **Proposed:** Your towns gain +10 defence, and your units gain +4 strength inside your borders. Your units lose 4 strength outside them.
- **Why:** With changes 58 and 61 Tier IV holds two Doctrines, and the rule is three to five. The seat that raises the Opus is the seat that every army marches on. The star forts of Italy made a small army safe at home.
- **Arithmetic:** +4 is 5% to 9% of a fourth-age unit, the regular line. The generic City Watches gives +8 defence.
- **Synergy:** **Raises:** defence at home. It joins the Bastion of the Military Engineers' Charter and The Strategikon.
- **Shape:** Existing shapes: `cityStat`, and two `combatLine` rows with `ownTerritory` and `foreignTerritory`.
- **Confidence:** speculative

**Shared cards**

#### 64. The Founders' Schools (new)

- **Tier, rarity, type:** I, uncommon, Civic (shared with Expansionist)
- **Now:** Not in the game.
- **Proposed:** Towns you found start with a Library.
- **Why:** The pair shares two cards, The Mountain Observatories and The Assay, and both are about ground. Expansionist's act is to found towns, and this deck's first building is the Library. It is the sister of The Founders' Stores, which you approved for Expansionist and Commerce.
- **Arithmetic:** A Library costs 51 hammers, about ten turns of a new town. Four towns founded after the card: 204 hammers, and each town starts with the Library's science and renown. The Apprentices and The Dedications pay for each one if a granted building counts as finished.
- **Synergy:** **Raises:** Libraries. **Reads:** towns founded, which Expansionist raises (The Land Hunger, The Colonists, The Seed Grain). It feeds The Scribes' Hall, The Almanac and The Royal Tutors.
- **Shape:** Existing shape: `foundingRider` with a building. The technology Colonial Charters has it.
- **Confidence:** good
- **Depends, joins and notes:** For the builder: a town founded before Writing still gets the Library.

#### 65. The Lodge Books (new)

- **Tier, rarity, type:** II, rare, Civic (shared with Magisterial)
- **Now:** Not in the game.
- **Proposed:** Completing a wonder completes the technology you are researching.
- **Why:** The pair shares two cards. One of them, The House of Wisdom, is one of four cards that say "production toward wonders". Magisterial raises wonders, and this card pays for them in this deck's way. The masons' lodges kept the geometry of their age in their books.
- **Arithmetic:** A third-age wonder costs 501 to 860 hammers, and a third-age technology costs 360 to 1,150 science. A seat that builds three wonders after the card gains three technologies, about 3,000 to 6,000 science. The player aims the most expensive technology before the wonder lands.
- **Synergy:** **Raises:** technologies completed. **Reads:** wonders completed, which Magisterial raises (The Cornerstone, The Friends of Khufu, The Keepers of Wonders). It triggers every card that pays on a technology, and Magisterial's The Golden Age starts on the same turn.
- **Shape:** Small extension: a rider on `buildingCompletion` for a wonder, with the grant of change 29.
- **Confidence:** good
- **Depends, joins and notes:** Question 2.

#### 66. Carried-Off Scholars (rework)

- **Tier, rarity, type:** II, common to uncommon, Civic (shared with Dominion)
- **Now:** Capturing a city grants science equal to ten times its population.
- **Proposed:** Capturing a city grants a technology that its owner knows and you do not. If there is none, it grants science equal to thirty times its population.
- **Why:** A town of eight pays 80 science, when a technology costs 650. Timur carried the scholars of each city he took to Samarkand. Dominion gives up development at home, so it is often behind. This is how its wars close the gap.
- **Arithmetic:** A third-age technology is 360 to 1,150 science, and a fourth-age one is 1,960 to 5,150. A seat that is ahead gains 240 science for a town of eight. Mehmed's own line pays thirty times the population as well.
- **Synergy:** **Raises:** technologies. **Reads:** captures, which Dominion raises, and what the loser knows. It triggers every card that pays on a technology.
- **Shape:** New grant: a technology from the loser's list. `techGap` in `rivals.ts` gives that list. The grant takes the cheapest, so a replay gives the same result.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. The Dominion pass left its shared cards as they were.

#### 67. Field Academies (buff)

- **Tier, rarity, type:** I, uncommon, Civic (shared with Dominion)
- **Now:** Your first kill each turn grants 25 science.
- **Proposed:** Your first kill each turn grants 25 science for each age you have reached.
- **Why:** 25 science is a turn of research in age 2 and nothing in age 4. The Commerce pass sized The Royal Patents by the ages reached, and you set its number.
- **Its science rides on:** A deed: kills. It does not ride on population.
- **Arithmetic:** 50 science in age 2, where a bot seat makes 26 to 85. 75 in age 3 and 100 in age 4. A seat at war kills on perhaps one turn in three.
- **Synergy:** **Raises:** science. **Reads:** kills, which Dominion raises, and ages reached.
- **Shape:** The Commerce build's small extension: a rider's grant that counts the ages reached.
- **Confidence:** good

#### 68. The Blessed Forges (cut)

- **Tier, rarity, type:** II, uncommon, Civic (shared with Devotion)
- **Now:** Improved strategic resources gain +1 faith and +1 production.
- **Proposed:** Cut. The row is retired.
- **Why:** The pair shares six cards, twice the number you set in the Commerce pass. This one pays in neither deck's way: it pays no science and reads no rite or follower. It reads strategic resources, which the shared The Assay reads.
- **Arithmetic:** Three improved strategic resources: +3 faith and +3 production.
- **Synergy:** Five shared cards stay: The Monastery Libraries, The Schoolmen's Charter, The Priest-Astronomers, The Cloister and The Monastic University.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** It is the Devotion pass's card too. If that pass keeps it, this change falls.

## The user's rulings on round one (2026-11-20, comments on the page)

The user: "ok i commented on the scientific deck". A row with no comment is
approved (the user's standing rule). On the notes: "your analysis is good, my
immediate reaction is that we need to also add science to this deck." Later,
on change 53: "this deck seems to have plenty of science now."

| # | Card | The user's words | Result |
|---|---|---|---|
| 01 | The Herbalists' Charter | "great"; on the shape: "should this be a shared card with expansionist?" | Approved. **A question to answer:** whether it is shared with Expansionist. |
| 02 | The Apprentices | "great" | Approved. |
| 03 | The War Manuals | "great" | Approved. |
| 04 | The Royal Tutors | "great" | Approved. |
| 05 | The Clay Map | "too similar to other cards in the game. I like the idea of having unique abilities for units. how about we rework: scouts gain +1 sight and receive double bonuses from discoveries." | The user's line. |
| 06 | The House of Life | "good" | Approved. |
| 07 | The Astronomers' Charter (the star tower) | "i think this is quite a steep penalty, cut" | Cut. |
| 08 | The Surveyors' Charter (the qanat) | "Rework: give the qanat yields and change to a single hex. this is easier to read and reason about." | Rework: the qanat is one hex with its own yields. |
| 09 | The Glassmakers' Charter | "great" and "can we rename this to greenhouses, or something more in line with what the specularium does." | Approved; rename the building (and the charter if needed) to fit what it does. |
| 10 | The Scribes' Hall | "good" | Approved. |
| 11 | The Royal Estates | "Additional buff: +50% production towards empire buildings." | Approved, with +50% production toward empire buildings added. |
| 12 | The Sky Watchers | "good" | Approved. |
| 13 | The Dedications | "good" | Approved. |
| 14 | Learned Foundations | "great" | Cut, as proposed. |
| 15 | The Common Tables | "great" | Cut, as proposed. |
| 16 | The Reform of the Calendar | "great" | Approved. |
| 17 | Commission: The Old Learning | "great" | Approved. |
| 18 | The Charter Rolls | "the wording of this is confusing. I'm not sure how useful this is. Let's add it in for now, with some clearer text: 'your drafts contain an additional charter if one is available' or something along those lines" | Approved with clearer text. |
| 19 | Tier I rarities | "sure" | Approved. |
| 20 | The Old Academy | "sure" | Approved. |
| 21 | The Lecture Halls | "great" | Approved. |
| 22 | The Latin Quarter | "sure" | Approved. |
| 23 | The Quiet Faculties | "great" | Cut, as proposed. |
| 24 | Enduring Institutions | "this one feels not very impactful. How about we add a charter that unlocks a new type of science based empire building." | Replace with a charter that opens a new science empire building. |
| 25 | The Translation Movement | "that's interesting, i like it" | Approved. |
| 26 | The Armoury Patterns | "Hmm interesting. This could be really good for timing attacks, which should be a play pattern for the scientific player. lets rephrase it: units of your current age gain +3 strength. (+4 is probably too strong)." | Units of your current age gain +3 strength. **Timing attacks are a play pattern for the Scientific seat.** |
| 27 | The City Architects | "lets rephrase: '30% production towards buildings and wonders of your current age'" | The user's line. |
| 28 | The Printers' Charter | "great" | Approved. |
| 29 | The Alfonsine Tables | "i don't like this. How about: complete the technology you are researching, -30% _gold_ for fifteen turns." | On draft: complete the technology you are researching. −30% gold for fifteen turns. |
| 30 | The Summa | "not very fun, cut" | Cut. |
| 31 | The Prototype Works | "not very useful. you can pre-build units that are cheaper that are automatically upgraded when you finish the tech. cut" | Cut. |
| 32 | Tier II rarities | "sure" | Approved. |
| 33 | The Age of Reason | "cut" | Cut. |
| 34 | The Humanists | "sure" | Approved. |
| 35 | The Model Army | "Ok sure" | Approved. |
| 36 | The Gunfounders' Charter | "+6 strength is massive, revise: It's town builds military units 50% faster, with +4 strength" | +4 strength. |
| 37 | The Second Seat | "lets just remove the library requirement altogether."; "rephrase: you may build a second copy of all empire buildings, while this is active."; "make sure: if this is unslotted while an empire building is in queue, it should remove it from the queue." | You may build a second copy of every empire building while this is seated. Unseating it removes a second copy from the queue. |
| 38 | The Proving Ground | "great" | Cut, as proposed. |
| 39 | The Collected Works | "wow thats crazy powerful, ok add it." | Approved. |
| 40 | The Foundation Stone | "remove, not very useful." | Cut. |
| 41 | The Closed Book | "wouldn't this show up way too early? lets keep it as is." then "OR: make it a charter so it doesn't need to be slotted, keep at tier 3" | Two readings offered; the pass recommends one. |
| 42 | The Great Instrument | "Cut, not impactful enough" | Cut. |
| 43 | Commission: The Lynx-Eyed Academy | "great" | Approved. |
| 44 | The Republic of Letters | "i think we have too many academy synergies. lets cut this one." | Cut. |
| 45 | The Military Engineers' Charter | "sure" | Approved. |
| 46 | The Naval Gunners' Charter | "cut" | Cut, as proposed. |
| 47 | Tier III rarities | "sure" | Approved. |
| 48 | The Sum of Knowledge | "great" | Approved. |
| 49 | The Walls of Learning | "cut", "great" | Cut, as proposed. |
| 50 | The Laboratories | "this is too small for a tier 4. Science buildings give +10% production" | Science buildings give +10% production. |
| 51 | The Invisible College | "great" | Approved. |
| 52 | The Great Catalogue | "great" | Approved. |
| 53 | A charter technology costs half | "lets have it cost the same as an ordinary technology. half feels too powerful. this deck seems to have plenty of science now." | A charter technology costs what an ordinary technology of its column costs. |
| 54 | A charter is dealt in two tiers | "cut, lets just add more charters" | Cut. Add more charters. (On question 4 the user wrote "two tiers sure": the later, specific comment on the change stands.) |
| 55 | The Natural Histories | "i don't like that this doesn't scale well, cut" | Cut. |
| 56 | The Peripatetic School | "sure" | Approved. |
| 57 | The Jixian Academy | "great" | Approved. |
| 58 | The Nassau Reforms | "Seems not very good, as you tend to build soldiers later in the game. cut" | Cut. |
| 59 | The Volley Fire | "revise: your archer line may attack twice a turn, they lose 4 combat strength when defending against a melee attack (non-ranged attack)" | The user's line. |
| 60 | The Mustansiriya | "sure" | Approved. |
| 61 | The Platonic Academy | "that's cool, great" | Approved. |
| 62 | The Court of Rudolf II | "great" | Approved. |
| 63 | The Trace Italienne | "great" | Approved. |
| 64 | The Founders' Schools | "sure" | Approved. |
| 65 | The Lodge Books | "cool" | Approved. |
| 66 | Carried-Off Scholars | "Cool, lets make this tier 3" | Approved, at Tier III. |
| 67 | Field Academies | "cool" | Approved. |
| 68 | The Blessed Forges | "let's move this to tier 1" | Kept, at Tier I. The Devotion pass's cut of it (its change 58) is overruled. |

Questions: Q1 "yes" (the technology lead stays a quantity cards read). Q2
"yes" (a card may complete a technology). Q3 "sure" (the Opus cards move to
Tier III; Tier IV may hold five). Q4 "two tiers sure, charter technology
should cost the same, not half" (see 53 and 54). Q5 "they're fine as is."

## The user's rulings on round two (2026-11-21, comments on the page)

The user: "commented on the scientific deck". A row with no comment is
approved.

| # | Card | The user's words | Result |
|---|---|---|---|
| 69 | The Herbalists' Charter | "make it shared"; and on r2-2: "lets make it shared, i kind of dont care if scientific has fewer solo cards, i only care about total common/uncommon/rare per deck" | **Shared with Expansionist.** The recommendation was not adopted. **A principle for every deck:** the user counts commons, uncommons and rares a deck, not a deck's own cards against its shared ones. |
| 70 | The Corps of Works | "interesting, but probably not widely applicable enough, cut" | Cut. |
| 71 | The Surgeons' Charter | "this is way too strong i think. How about: your units gain +10 health after killing a unit. needs a new name" | Rework: your units gain +10 health after they kill a unit. A new name. |
| 72 | The Flying Columns | "interesting, not sure if this would be strong enough to take over other options. lets cut for now" | Cut. |
| 73 | The Surveyors' Charter, the qanat | "add: give fresh water to tiles within 1 hex."; on r2-4: "cool" | Approved, and the qanat gives fresh water to the hexes within one hex. |
| 74 | The Glasshouse | "great"; on the name: "glasshouse"; on r2-5: "great" | Approved. The name is the Glasshouse. |
| 75 | The Archivists' Charter | "ok sure" | Approved. |
| 76 | The Invitations | "Ok great" | Approved as written in 76 (the first time you complete each empire building). |
| 77 | The Royal Academies | "keep as is, i like the combo with second copies" | **Not adopted.** It keeps today's text and counts copies. |
| r2-q3 | Kinds or copies | "copies is fine, i do want a few broken combos" and "i will adjust if it feels too abusable" | Copies. **A principle:** the user wants a few broken combinations, and will tune them after play. |
| 78 | The Ordinance Companies | "Add: gain a siege unit as well" | Entering a new age grants a melee unit, a ranged unit and a siege unit in your capital. |
| 79 | The Closed Book as a charter | "Sure. lets make it rare"; r2-q2: "Sure" | A Tier III charter, rare. |
| 80 | The Smelters' Charter | "sure" | Approved. |
| 81 | The Observers' Charter, the Night Watch | "the malice is too high. How about for ten turns: city gains science equal to twice its population. shared with devotion"; r2-q4 (a charter may open a rite): "yes" | The Night Watch: for ten turns the city gains science equal to twice its population, with no drawback. Shared with Devotion. |
| 82 | The Blessed Forges at Tier I | "sure" | **Tier I, kept.** This settles the conflict with the Devotion pass, where the user had written "great" on the cut: the later, specific answer stands. |

The user will comment on unit abilities (r2-3) and on the empire building
(r2-6) "below", which the rows above carry.

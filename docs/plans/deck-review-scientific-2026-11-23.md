# Scientific deck review, 2026-11-23

This is a design review of one deck. It changes no data, no code and no test. No test, bot game or dev server was run for it. Every power figure is arithmetic from the data files.

**How numbers are marked.**
- **(live)**: the number is in the data today.
- **(proposed)**: the number is a suggestion of this review.
- **(estimate)**: the number is my arithmetic from live numbers. It was not measured.
- In a table, the column heading carries the mark for the whole column.

**How proposals are marked:** text or number change, existing shape, small extension, new shape (the same four as `docs/plans/deck-direction-review-2026-11-23.md`).

The user's words for this deck (2026-11-23): "could we look at the strength of the other themes after this latest change? The charter technologies could overall be buffed i think, since the require investment to obtain." The user's questions for all four reviews: "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game?"

---

## F. Summary

### Findings

1. **The Mausoleum nerf does not bring the Academy build down to the other builds.** A committed Academy hex in age 4 still pays about 111 a turn without any wonder (estimate, section A). The Magisterial full set pays 96 for each work after its nerf. The reason is that Scientific keeps two whole-hex multipliers that multiply each other: The Nizamiyya (+50%) and the Doctrine The Pandidakterion (double).
2. **The empire buildings build is now as strong as the Academy build, and stronger in age 4.** The Royal Academies (Tier III, uncommon) pays +5% production and culture for each empire building, with no limit. Six empire buildings in age 4 are about 275 a turn from one card (estimate). With The Second Seat it passes 1,200. This is the combination you asked for on 2026-11-20, so I do not propose a cut. I propose a rarity change.
3. **The technologies build is competitive in a typical seat and about a third behind in a committed seat.** It has no rare and no rule-breaker since you cut The Age of Reason. The Journeymen and The Astronomical Diaries carry it.
4. **Charters are not a build. They are a second layer that needs no chair.** Nine of the 17 charters a Scientific seat can draft are under the bar for their tier (section B). The cost is real: a pick, 24 to 3,250 science, and then 117 to about 1,180 production for the thing itself.
5. **The elite army is the strongest strength stack in the game and pays nothing at peace.** A warrior-line unit can reach about +28 strength abroad in age 4 (estimate). Your ruling on The Armoury Patterns gives it its first pay-off. It has no late rule-breaker.
6. **Most of the deck's utility is sound. Four cards are not worth their chair** (section C): The Forward Plans, The Reform of the Calendar, The Barber-Surgeons and The Closed Book.
7. **Outside the deck, almost nothing reads a technology completed or the count of charters** (section E). Academies and science buildings are well connected already.

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | One rule for every charter technology: completing it grants culture equal to half its price (proposed). | Small extension |
| 2 | The Schoolmen's Charter moves from Tier I to Tier II. Its technology costs 360 (live), which is 24 turns of science when Tier I is dealt (estimate). | Tier move |
| 3 | Cut The Military Engineers' Charter and The Physicians' Charter (retire the rows). 17 charters become 15. | Data |
| 4 | The Great Catalogue loses "at most +40%". | Number change |
| 5 | New Tier III rare, The Countermarch: completing a technology lets your units attack twice a turn for three turns. | Existing shape, one check |
| 6 | New Tier III rare, The Licence to Teach: gaining a great scholar completes the technology you are researching. | Existing shape |
| 7 | The Royal Academies becomes a rare. | Rarity change |
| 8 | Optional: the three cards that count charter technologies count every charter you hold. | Small extension |

Already ruled and queued, so not repeated here: The Armoury Patterns becomes a kill pay-off, The Hanlin Academy becomes a shared Scientific and Magisterial card, and The Pandidakterion stays.

### Decisions for you

1. **Which rule raises the charters?** Recommended: culture equal to half the price when the technology is learned (option A in section B). The other two options are a half price and a lasting bonus for each charter technology.
2. **May two charters go (The Military Engineers' and The Physicians')?** Recommended: yes. Both are the weakest of their tier, and other cards do their job.
3. **The Royal Academies: leave it, make it rare, or lower it to +3%?** Recommended: make it rare. The combination with The Second Seat stays whole, and fewer seats get 275 a turn from an uncommon.
4. **Should charter counts read every charter you hold, from any deck?** Recommended: yes, after change 1 is played. It joins Scientific to the 20 charters of Expansionist and Devotion.
5. **Do you want the two new rares?** Recommended: yes to both. Each joins the technology moment to another theme. Neither is a number card.

---

## A. Strength of each build after the nerf

### The typical seat I used

| | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| Towns (power bar) | 5 | 8 | 12 |
| Science / culture / production a turn, median seat (power bar) | 30 / 25 / 48 | 106 / 83 / 107 | 494 / 442 / 476 |
| Technologies completed (estimate) | one in 5 turns | one in 5 turns | one in 5 turns |
| Regular card of the tier dealt (power bar) | 15 to 25 | 35 to 60 | 60 to 120 |

A committed seat completes about one technology in 3 turns (estimate), because charter technologies, The Alfonsine Tables, The Lodge Books and treatises all add completions. I read in `settleResearch` (`src/sim/tech.ts`) that a charter technology fires the same moment as an ordinary one.

### The yardstick: a Magisterial work seat after its nerf

From `deck-direction-review-2026-11-23.md`, section 1.5 (estimate): a work pays 16 in age 2 and 36 in age 4 in a typical seat, and 96 in the full set. Six works in age 4 are 216 typical and 576 in the full set. For age 3 I use 20 to 32 a work (own yield 6, The Quarter of Masters 8, The Mausoleum 6, and The Masters' Domain 12 once Tier III opens).

### What each build pays a turn (estimate)

| Build | Age 2 typical | Age 2 committed | Age 3 typical | Age 3 committed | Age 4 typical | Age 4 committed |
|---|---|---|---|---|---|---|
| Magisterial works (yardstick) | 48 (3 works) | | about 110 (4 or 5 works) | | 216 (6 works) | 576 (6 works) |
| Academies | 12 (1 hex) | 90 (3 hexes) | 32 to 64 (2 hexes) | 210 to 465 (5 hexes) | 60 to 120 (3 hexes) | 666 (6 hexes) |
| Technologies completed | 23 | 37 | 43 | 137 | 150 | 443 |
| Charters (no chair used) | 30 | 110 | 100 | 280 | 130 | 400 |
| Empire buildings | 18 | 75, and up to 6 free scholars | 77 | 215 | 310 | 755; about 1,500 with The Second Seat |
| The elite army | +5 strength, no yield | +15 to +19 strength | +8 strength | +18 to +22 strength | +10 strength | +28 strength, no yield at peace |

### The arithmetic

**Academies.** An Academy's own yield is 4, 6 and 8 science by age (live, `data/improvements.json`).
- Typical, age 4: own 8, The Old Academy +6 (3 food and 3 production, live), The Lecture Halls +6 (2 science for each of three science buildings, live) = 20. With The Pandidakterion: 40.
- Committed, age 4: own 8, The Old Academy 6, The Lecture Halls 8, The Latin Quarter 3, Commission: The Lynx-Eyed Academy 10, The Hanlin Academy 2 (your new text) = 37. The Nizamiyya is `wholePercent: 50` and The Pandidakterion is `wholePercent: 100, appliedLast` (live). 37 × 1.5 × 2 = 111.
- Before the nerf the same hex with The Mausoleum was 37 × 1.5 × 3 = 166. After it, The Mausoleum adds the own yield once more, so about 120 to 135. The nerf removes about a quarter of the best case and nothing from a seat without the wonder.
- Supply: Commission: The Old Learning, The Royal Charter Commission, The Lynx-Eyed Academy and The Great Library give one scholar each. The Invisible College gives two. The Invitations gives one for each kind of empire building. So six Academies in age 4 is reachable for a committed seat.
- Around the hex: The Roll of Scholars adds up to +28% production and culture for the empire (about 257 in age 4), and The Doctorate pays eight turns of culture for each scholar.
- **Verdict: still the first build in a committed seat, and level with a Magisterial work in a typical seat.** I do not propose a cut. You ruled that The Pandidakterion stays, and the ×3 costs a Doctrine pick and a chair. If the build still wins every game after play, The Nizamiyya is the card to change, on the same principle as The Mausoleum (own yield only).

**Technologies completed.**
- The Royal Workshops: 15 production for each technology (live), so 3 a turn. It is under the bar after age 1.
- The Astronomical Diaries: +2 culture and +2 production in the capital, and +1 of each for each technology completed while seated (live). Seated at turn 40, it pays about 20 in age 2, 40 in age 3 and 64 in age 4. In a committed seat it reaches 90, and 135 with The Summer Palace.
- The Journeymen: each town gains production equal to three times its population (live). Age 4: 144 citizens × 3 = 432 for each technology, so 86 a turn typical and 144 committed.
- The Doctrine The Jixian Academy: culture equal to a fifth of the price (live). That is a fifth of the seat's science as culture: 6, 21 and 99 a turn by age.
- The Sum of Knowledge: +2 production in the Opus town for each technology known (live), about 110 in age 4.
- **Verdict: competitive in a typical seat (150 against 60 to 120 for Academies and 216 for six works). In a committed seat it is about a third behind (443 against 576 and 666).** It has no multiplier and no rare.

**Charters.** The figures are the sums of section B, net of what the hex or the production would have made otherwise. Typical is two charters learned in age 2 and three later. Committed is five, then eight, with The Secret Arts (+1 production in each town for each technology no met empire knows, at most +5, live).
- **Verdict: not competitive as a build, and it does not need to be.** A charter takes no chair, so its pay is on top of the eleven chairs. The problem is the single charter: nine of 17 are under the bar after a pick and the research.

**Empire buildings.** Ten empire buildings are open to every seat by age 4 (live, `data/buildings.json`): Hall of Deeds, Heroic Epic, Chart the Stars, Imperial Throne, High Temple, Forum, Caravanserai, Bourse, The Turning Heavens and The Alchemical Codex. Charters add five: Mouseion, Great Archive, Aldine Press, Bimaristan and Tophane.
- The Royal Estates: +3 food and +3 production for each (live). Three buildings 18, six 36, fourteen 84.
- The Royal Academies: +5% production and culture for each, at the empire stage (live). In age 4, 5% of 476 + 442 is 46 a turn for each building. A typical seat with six: 275. A committed seat with fourteen: 643. With The Second Seat and 28 copies: 1,285.
- The Dedications pays culture equal to the building's production cost (live). A Mouseion in age 2 costs about 194 production with five towns (estimate), so it pays 194 culture, which is eight turns of an age 2 seat's culture.
- The Invitations: one free scholar for each kind (live).
- **Verdict: competitive, and the strongest build of the deck in age 4.** The typical case is the concern, not the combination. One uncommon pays 275 against a Tier III headline of 200. See decision 3.

**The elite army.** Flat strength lines, all live: The War Manuals +2 (ranged), the Bronze-Founders' Charter +2 (two lines), The Edge of the Sword +3, The Armoury Patterns +3 (until your ruling is built), The Strategikon +4 (near an Academy), The Palace Schools +4, the Tophane +4, The Workshops of Syracuse +5, The Directorate of Arms +3, the Alchemists' Charter +1 for each charter technology, The Trace Italienne +4 at home.
- A warrior-line unit from the Tophane town, abroad, in age 4, with six charter technologies: 3 + 4 + 4 + 5 + 3 + 6 = 25, and 28 while The Armoury Patterns still gives +3. Age 4 units have 45 to 80 strength (power bar). A strong Tier III line is +12.
- Pay: Field Academies (shared with Dominion) pays 25 science for each age on the first kill each turn (live). After your ruling The Armoury Patterns pays science equal to twice the dead unit's strength: about 64 a kill in age 2, 92 in age 3 and 125 in age 4 (estimate). In age 2 one kill is two turns of science. In age 4 it is a quarter of a turn.
- **Verdict: it wins fights. It cannot be compared in yield, and it has no late card that changes how the army plays.** Section D proposes one.

**Great cities** is a sixth, thin thread (three cards and three Doctrines). The Queen of Cities and The Round City are strong alone. I propose nothing for it.

---

## B. Charters

### What a charter costs

1. **A pick.** A draft costs `12 + 5n + n^2.2` culture (live, `data/statecraft.json` `meter`): 53 to 178 in Tier I, 220 to 605 in Tier II, 679 to 1,340 in Tier III (estimate from the formula).
2. **The research.** A charter technology costs the price of its column, the same as an ordinary technology (live; `explainTechCost`, `src/sim/tech.ts`). The 50% premium went in batch DS9.
3. **The thing itself.** A building costs `size × 1.31^(column − 1)` production, and an empire building costs `√(cities ÷ 4)` times that (live, `explainBuildingCost`). An improvement costs one worker charge in each town.

The science a seat makes when each tier is dealt (estimate, from the power bar): about 5 in Tier 0, 15 in Tier I, 70 in Tier II and 300 in Tier III.

### Every charter a Scientific seat can draft

| Charter (tier, rarity) | Technology, price (live) | Turns of science when dealt (estimate) | What it opens (live) | Production for the thing (estimate) | Worth a turn in its age, typical seat (estimate) | Against the bar |
|---|---|---|---|---|---|---|
| The Herbalists' (0, common, shared with Expansionist) | Herbals, 24 | 5 | Physic Garden, one in each town: +2 science, +2 happiness, +1 science for each forest or jungle beside it | a worker charge | 8 science and 6 happiness with 3 towns | At the bar |
| The Smelters' (0, uncommon) | Smelting, 24 | 5 | Smelter, one in each town: +1 production, +1 production and +1 science for each mine or quarry beside it | a worker charge | 9 with 3 towns | At the bar |
| The Bronze-Founders' (I, common) | Casting, 50 | 3 | Spear and chariot lines +2 strength | none | +2 on two lines; a regular Tier I line is +3 on all units | Under |
| The Surveyors' (I, common) | Surveying, 100 | 7 | The Aqueduct early; qanat, one in each town: +2 food, +1 production, +1 food for each hill or mountain beside it, fresh water around it | a worker charge; Aqueduct | 20 with 5 towns, and faster growth | Above |
| The Observers' (I, uncommon, shared with Devotion) | Astronomy, 24 | 2 | Night Watch rite: ten turns, +1 science for each citizen | faith for each cast | 12 to 16 with two towns keeping it | At the bar |
| The Librarians' (I, uncommon) | Cataloguing, 100 | 7 | Mouseion, one in the empire: +4 scholar renown, +2 culture for each empire building | about 194 | 6 to 12 culture and 4 renown | Under in a typical seat |
| The Glassmakers' (I, uncommon) | Glassmaking, 190 | 13 | Glasshouse: +3 food, +1 science for each farm worked | 117 in each town | 20 with three built. A Library gives 3 science for 51 production, the same rate | Under: an ordinary building after a pick and 190 science |
| The Schoolmen's (I, uncommon, shared with Devotion) | Scholasticism, 360, needs The High Temple | 24 | Cathedral School: +2 science for each faith building in its town | 154 in each town | Nothing in age 2. About 20 in age 3 with four built | Under: dealt an age before it can be used |
| The Physicians' (II, common) | Medicine, 360 | 5 | Bimaristan, one in the empire: +25% food in its town | about 327 | 10 food, in one town | Under |
| The Archivists' (II, uncommon) | Record-Keeping, 360 | 5 | Great Archive, one in the empire: +5 science for each charter technology | about 327 | 15 to 20 with three or four charter technologies | Under in a typical seat, at the bar with seven |
| The Paper-Makers' (II, common) | Papermaking, 650 | 9 | Scriptorium: +2 science, +2 scholar renown, +10% science in a town with an Academy | 303 in each town | 4 and 2 renown for each. A University gives 6 for 520 | Under |
| The Printers' (II, uncommon) | Printing, 650 | 9 | +1 trade route; Aldine Press, one in the empire: +1 culture for each technology known | about 428 | 35 to 40 culture and a route, about 50 | At the bar |
| The Mechanists' (II, uncommon) | Mechanics, 1,150 | 16 | Catapults +1 range; the archer line moves after it shoots | none | A rule. Strong for any army | At the bar, and dear |
| The Closed Book (III, rare) | Ciphers, 1,960 | 7 | If you are first to Alchemy, other empires may not begin the Opus for 10 turns | none | Nothing, unless you are first to Alchemy (8,000) | Under for most seats |
| The Military Engineers' (III, common) | Military Architecture, 3,250 | 11 | Bastion: +5 defence, +30 hit points | 681 in each town | No yield. Defence only | Under |
| The Alchemists' (III, uncommon) | Chemistry, 3,250 | 11 | Warrior line: +1 strength for each charter technology | none | +4 on one line; a regular Tier III line is +6 on all units | Under in a typical seat |
| The Gunfounders' (III, uncommon) | Gunfounding, 3,250 | 11 | Tophane, one in the empire: its town builds military units 50% faster, with +4 strength | about 1,180 with 12 towns | One town. Good for the army build | At the bar, and dear |

- **Nine are under the bar:** the Bronze-Founders', the Librarians', the Glassmakers', the Schoolmen's, the Physicians', the Archivists', the Paper-Makers', the Military Engineers' and the Alchemists'. The Closed Book is a tenth for any seat that is not first to Alchemy.
- **The pattern:** a charter building pays at the same rate as an ordinary building of its column. So the pick and the research buy only the right to build one more ordinary thing. The improvements are the exception. They cost a worker charge, and they are the charters that feel good.
- **The age 4 charters cost the most and return the least.** 3,250 science is 11 turns in Tier III, for a wall, one town's units or +4 on one line.
- Devotion's The Call to Prayer opens Liturgy, the one other charter technology in the game. Any rule below covers it too.

### The raise: one rule, three options

| Option | The rule (proposed) | What it does | Size |
|---|---|---|---|
| **A (recommended)** | "Completing a charter technology grants culture equal to half its price." | The pick comes back when the research lands. | Small extension: the `tech` moment already carries the price (`techCost`, as The Jixian Academy reads it). It needs one base rule and a test for charter rows. |
| B | "A charter technology costs half the price of its column." | The investment is halved. Nothing new happens on screen. | Small extension: a base line of the `charterTechCost` rule that The Commonplace Book used. |
| C | "Each charter technology you know gives +2 science in every town." | A lasting bonus for the count. | Existing shape: a `pays` line on each of the 18 technology rows. |

**Why A.**
- It grows with the column with no table of numbers. Half the price is 12 culture for Smelting, 50 for Surveying, 180 to 575 in Tier II and 980 to 1,625 in Tier III (estimate). In each tier that is about one draft. So a charter is a pick you get back after you do the research.
- It is a moment the player sees. A one-off grant registers at 200 to 400 in Tier I and 500 to 900 in Tier II (power bar). Culture is scarce early, so 50 culture in age 2 is worth about 150.
- It makes combinations through general moments:
  - The Charter Rolls (every hand holds a charter) becomes an engine: each charter learned pays for about the next draft.
  - The Alfonsine Tables, The Lodge Books and Carried-Off Scholars complete "the technology you are researching". Aimed at Gunfounding they also pay 1,625 culture.
  - The Jixian Academy adds a fifth of the price on top, and The Dedications pays again when the building is finished.
- It leaves the weak unlocks weak. That is acceptable for a charter that costs no chair and returns its pick. The three worst are handled below.

**Why not B or C.** B is sound and the smallest change, but it adds nothing to see or to combine. C pays too much early and too little late: Smelting would pay back in 4 turns and Gunfounding in 135 (estimate, 2 science × towns against the price). C also pays wide empires, and you ruled that Scientific plays tall.

**If you prefer separate numbers** (option D, proposed, sound but sixteen edits in time): Mouseion +3 culture for each empire building; Glasshouse +4 food; Great Archive +8 science for each charter technology; Scriptorium +4 science; Bimaristan +25% food and +25% production; Alchemists' +1 strength for each charter technology on every melee line; the three age 4 technologies moved to the 1,960 column. I recommend A first, then D only for a charter that still feels bad in play.

### Cut, merge or move

You said: "I'm realizing the game has so many mechanics, i'd love to simplify wherever we can."

| Charter | Recommendation | Why |
|---|---|---|
| The Military Engineers' | **Cut.** | 3,250 science and 681 production a town for defence. The Trace Italienne (+10 defence) and Stone Walls and the Castle do this job. |
| The Physicians' | **Cut.** | One building, +25% food in one town. The Glasshouse, the qanat and the early Aqueduct already feed a great city. |
| The Schoolmen's | **Move to Tier II.** | Its technology is an age 3 technology. In Tier I it sits unused for about 40 turns. |
| The Paper-Makers' and The Printers' | Merge only if you want fewer: Printing would open the Aldine Press and the Scriptorium. | Both hang from the same parent at the same price (650). The Scriptorium alone is the weakest building charter. I recommend keeping both for now, because the Academy theme reads science buildings. |
| The Closed Book | Keep, as your ruled card. It is a cut candidate if you want one fewer rule. | It adds one rule (`closedBook`) that only this card uses. |

After the two cuts the deck has 12 own charters and three shared ones.

---

## C. Utility

"Worth a chair" is for a seated card. "Worth a pick" is for a charter, a commission or an on-draft card, which need no chair.

| Card (tier) | What it does (live text, shortened) | Worth it? | When |
|---|---|---|---|
| The Clay Map (0) | Scouts +1 sight, double bonuses from discoveries | Yes, a chair for the first 30 turns | Only while ruins are left. Swap it out in Tier I. |
| The Prospectors' Notes (0) | A mine or quarry built grants its town 25 production | Yes | Age 1. Four mines are 100 production, when a Settler costs 28. |
| The Royal Workshops (0) | A technology grants 15 production in the capital | Age 1 only | 3 a turn later. It is a small first piece of the technology theme. |
| The Charter Rolls (I) | Drafts contain an additional charter | Not today. Yes with rule A | Today it spends a chair to offer more cards that are under the bar. |
| The Forward Plans (I, rare) | Universities before Scholarship | No | A University costs about 520 production (estimate). An age 2 town makes 10 a turn. It works in the capital only. |
| The Reform of the Calendar (I, rare) | Entering an age opens a draft | No, as a chair | At most three payouts in 100 turns. The best play is to seat it just before each new age, and that is a chore. |
| Commission: The Old Learning (I) | Know all first-age technologies: a scholar | Yes | Always. About 256 science of work the seat does in any case. |
| The Free Cities (I) | At most five towns: buildings and wonders 20% faster | Yes for a tall seat | Tiers I and II. |
| The Alfonsine Tables (II, rare) | On draft: complete the current technology; −30% gold for fifteen turns | Yes, always | Best aimed at a dear technology. The gold loss is about 210 in age 3 (estimate). |
| The Translation Movement (II) | Technologies of an older age cost a third less | Only for a seat that runs ahead to the next age | It saves about 1,800 science across age 3 (estimate). It also makes old technologies cheap triggers for the technology moment. |
| The City Architects (II) | +30% toward buildings and wonders of your age | Yes | A plain, good card. |
| The Royal Charter Commission (II) | Complete a charter technology: a scholar and 100 culture | Yes, always | The easiest scholar in the deck. |
| The Ordinance Companies (II) | Entering an age grants a melee, a ranged and a siege unit | Yes | Two payouts (ages 3 and 4). The age 4 one is 1,094 production of units (design pass figure). |
| The Barber-Surgeons (II) | +10 health after a kill | No | A combat line does more for the same chair. |
| The Model Army (III) | Upgrades need no strategic resource, and heal | Only on a map without iron or horses | A safety net. |
| The Doctorate (III, common) | A scholar gained grants eight turns of culture | Yes, and it is strong | In age 4 eight turns of culture is about 3,500 (estimate), more than two drafts. With The Invisible College it pays twice at once. |
| The Collected Works, The Second Seat (III, rares) | Scholars act twice; a second copy of empire buildings | Yes, inside their themes | They are the deck's rule-breakers today. |
| The Closed Book (III, rare, charter) | Ten turns of Opus lock if you are first to Alchemy | Only for the science leader | See section B. |
| The Invisible College (IV, rare) | On draft: two scholars | Yes, always | |
| The Breaching Batteries (IV) | Siege hits remove 5% of a city's Opus progress | Only against an Opus builder you are at war with | Narrow, but it can decide a game. |
| The Founders' Schools (I, shared) | Founded towns start with a Library | Yes | For a seat that still settles. |

**Suggested fixes, small.** The Reform of the Calendar and The Forward Plans are rares that read as utility. If they became cards that need no chair (the charter keyword already means that), both would be fair picks. That is a text change on each, and a decision for a later pass.

---

## D. Late game

### Is there a satisfying late option for each theme?

| Theme | Tier III | Tier IV | Verdict |
|---|---|---|---|
| Academies and scholars | The Nizamiyya, The Collected Works (rare), The Doctorate, The Lynx-Eyed Academy | The Invisible College (rare) | Yes |
| Empire buildings | The Royal Academies, The Second Seat (rare), the Doctrine The Mustansiriya | none | Yes |
| Great cities | The Queen of Cities (rare), the Doctrine The Universitas | the Doctrine The Two Capitals | Yes, thin |
| Technologies completed | The Journeymen (common) | The Sum of Knowledge | **No rule-breaker.** You cut The Age of Reason on 2026-11-20, so I do not bring it back. |
| Charters | three charters that are under the bar | The Great Catalogue, with a limit | **No.** |
| The elite army | The Model Army, two charters | The Breaching Batteries | **No.** |

Tier IV holds five cards of this deck. A seat that reaches it sees them all in two hands.

### Proposal 1: The Countermarch (new)

| Field | |
|---|---|
| Name | The Countermarch |
| Band, rarity | Tier III, rare |
| Text (proposed) | "Completing a technology lets your units attack twice a turn for three turns." |
| Age goal | Age 4, "the decisive army", and the timing attack you described on 2026-11-20. The design pass found that "nothing pays on the turn the window opens". |
| Theme and role | The elite army: act. It is also a bridge to technologies completed. |
| Role | Build-defining. Floor: a seat that researches at the median has it for three turns in five. Ceiling: a seat that lands technologies on purpose has it for the whole siege. |
| Councils | Late army council under Imperium or The Sultanate, with The Edge of the Sword, The Palace Schools and The Ordinance Companies. |
| Attention | The player plans the assault for the turn a technology lands. Nothing is left on the map. The game must show the turns left, as it does for any timed effect. High attention, high impact. |
| Power | Age 4 units have 45 to 80 strength and cost 181 to 583 production. Two attacks a turn roughly halve the time a siege takes, which meets the war card target of "a siege 30 to 50% faster". It adds no strength, so it is not a percentage of combat strength. |
| Synergy | Reads: a technology completed. Raised by research, The Alfonsine Tables, The Lodge Books, Carried-Off Scholars (a captured city grants a technology, which restarts the three turns), The Translation Movement, every charter technology, and proposal 2. A cheap charter technology left unlearned is a window the player opens when they choose. Feeds: every kill reader (The Armoury Patterns after your ruling, Field Academies, The Barber-Surgeons, Dominion's kill cards). More than eight raisers exist before Tier III. |
| Displaces | One of the flat strength cards. It gives the stack something to do. |
| Condition | The moment itself. A seat that stops researching loses it. It does not read the technology lead, so it does not pay only the seat that is already ahead. |
| Shape | Existing shape, one check. A `windfallRider` on `tech` with a `timed` grant of three turns (Roger Bacon's legacy is written this way) that holds the rule `secondAttack` (The Varangian Guard, The Volley Fire). To check: that combat reads a rule from a timed effect, and that it gives no third attack with The Volley Fire. |
| Type | Military |

### Proposal 2: The Licence to Teach (new)

| Field | |
|---|---|
| Name | The Licence to Teach (the medieval *licentia docendi*, the degree that let a master lecture anywhere) |
| Band, rarity | Tier III, rare |
| Text (proposed) | "Gaining a great scholar completes the technology you are researching." |
| Age goal | Age 4, the Opus race: Alchemy costs 8,000. |
| Theme and role | Technologies completed: the rule-breaker the theme lacks. It is a bridge from scholars and from empire buildings (The Invitations). It adds nothing to the Academy hex, so it does not add to the "too many academy synergies" you named. |
| Role | Build-defining. Floor: one or two scholars after Tier III opens, so one or two age 4 technologies, each 4 to 10 turns of science. Ceiling: nine scholars, about 35,000 science (estimate), which is most of age 4. |
| Councils | Late technology council under The Curia, with The Journeymen, The Astronomical Diaries, The Doctorate and The Invitations. |
| Attention | The player chooses what to research before a scholar arrives. That is one interesting choice. Nothing to track. |
| Power | Typical: two technologies of about 3,250 over 60 turns is about 108 science a turn, a regular Tier III card. Committed: it is a broken combination on purpose. The Lodge Books (Tier II, rare) does the same for each wonder, so the size has a precedent. |
| Synergy | Reads: a great scholar gained (The Doctorate reads the same moment). Raises: technologies completed. Scholar suppliers at or before Tier III: Commission: The Old Learning, The Royal Tutors, The Scholars' Fame, the Mouseion, The Royal Charter Commission, The Invitations, The Lynx-Eyed Academy, The Hanlin Academy (shared), The Great Library, and Sejong, Hypatia and Mehmed. Each completion then pays The Journeymen (432 production in age 4), the Diaries, The Royal Patents, rule A for a charter technology, and three turns of The Countermarch. |
| Displaces | The Doctorate or a flat science card. |
| Condition | It needs a scholar, and each great person raises the price of the next. A scholar who arrives while nothing is being researched gives nothing. |
| Shape | Existing shape: `windfallRider` on `greatPersonGained` with `family: scholar` (The Doctorate) and the grant `completeResearch` (The Lodge Books). |
| Type | Civic |

### Proposal 3: The Great Catalogue (revision)

| Field | |
|---|---|
| Live text | "+10% production toward the Magnum Opus for each charter technology you know, at most +40%." (Tier IV, common, Economic) |
| Text (proposed) | "+10% production toward the Magnum Opus for each charter technology you know." |
| Why | It is the charter build's way to win, and the limit is reached with four charters, which a typical seat has. You dislike limits. Without it a typical seat is unchanged at +40%, a committed seat with eight has +80%, and a seat that held The Charter Rolls all game can pass +100%. |
| Against the others | Commission: The Master Plan gives +40%. The Gobelins gives +10% for each work, at most +50%. |
| Shape | Number change: remove `max: 4` from the row. |

### What the three open, through general quantities

- **A technology completed is now a moment for the army.** Research, a wonder (The Lodge Books), a captured city (Carried-Off Scholars), a draft (The Alfonsine Tables) and a scholar all start the three turns.
- **A scholar is now a technology.** Empire buildings give scholars (The Invitations), scholars give technologies, and technologies give every town production (The Journeymen) for the next empire building.
- **A charter is a draft, a technology and a tenth of the Opus.** With rule A, The Charter Rolls and The Great Catalogue, a seat can aim at charters and win with them.

---

## E. Synergy across the whole game

### What outside the deck raises or reads each theme (all live)

| Theme | Other decks and shared cards | Generic cards and governments | Leaders | Wonders and buildings | Beliefs, legacies, luxuries |
|---|---|---|---|---|---|
| A technology completed | The Royal Patents (Commerce: 100 gold for each age), The Lodge Books (Magisterial), Carried-Off Scholars (Dominion) | The Learned Embassy (on draft: eight turns of science) | Sejong (three turns of renown), Harun al-Rashid (faith equal to a fifth of the price) | Aldine Press | Legacies: Pāṇini (30 culture), Roger Bacon (+15% food and production for three turns) |
| Charters | none reads the count. Expansionist has 10 live charters and Devotion has 10, with no technology | Cistern Works | none | Great Archive | none |
| Empire buildings | The Capitolia (Expansionist: +1 culture in each town for each) | none | none | Each partner deck has reasons to build some: High Temple (Devotion), Caravanserai and Bourse (Commerce), Imperial Throne and Hall of Deeds (Dominion), Heroic Epic and Forum (Magisterial). The Valley of Kings | none |
| Science buildings | Illuminated Treatises, The Monastery Libraries, The Founders' Schools, The Cloister | Priest-King, Aristocracy (+2 science in every town), The Curia (Civic cards pay 30% more; 32 of the deck's 67 cards are Civic) | Harun, Al-Ma'mun, Nezahualcoyotl | The House of Wisdom, The Temple of Thoth, Observatory, Printing House | Lamps of the Shrine, Cathedrals of the Sky, The Scriptoria, The Vigil, Omen Reading. Legacies: Aristotle, Ibn al-Haytham, Copernicus, Cai Lun, Zhang Heng, Maimonides. Tea |
| Academies and scholars | The whole Magisterial work theme, The Hanlin Academy (shared by your ruling), The House of Wisdom, The Monastic University | The Hall of Fame, Aristocracy | Sejong, Hypatia (a work pays half again), Mehmed | The Great Library, The Mausoleum, The Library of Ashurbanipal | Cult of Heroes. Legacies: Homer, Kidinnu. Lapis |
| The elite army | Kill readers: The Bards' Praise, Songs of the Fallen, The Melted Arms, The Sacred Host, Field Academies. Unit stamps that add to The Palace Schools: The Training Cadre, The Ribats, The Fetials, The Ten Thousand, Professional Soldiers, The Soldiers of God | War Chief, The Sultanate (Military cards 30% stronger) | Mehmed, Joan of Arc | Tophane, War Hall, The Terracotta Army | Rites of Blood. Obsidian |
| Great cities | The Megalopolis, The Grain Dole, Synoecism (Expansionist), Commission: The Master Plan | The capital cards of Tier 0, The Summer Palace (cards that pay the capital pay 50% more: it raises the Diaries and The House of Life) | Nezahualcoyotl, Sejong | The Hanging Gardens | Legacy: Omar Khayyam |

### The gaps

1. **A technology completed is the deck's engine, and the rest of the game hardly reads it.** One shared card pays on it (The Royal Patents). No government, wonder, belief, luxury or generic card does.
2. **Nothing outside the deck reads charters.** A Scientific and Expansionist seat can hold a dozen charters, and the Great Archive counts only the Scientific ones.
3. **"Units of your current age" has one reader,** and your ruling changes that card. After it, nothing rewards keeping the army current.
4. **Academies have too much outside support, not too little.** I add none.

### Connections, through general quantities

| # | Connection (proposed) | What it joins | Size |
|---|---|---|---|
| 1 | Rule A makes every charter technology pay culture. Culture is what every deck drafts with, so a charter helps any partner deck. | Charters to all five partners | In change 1 |
| 2 | The Great Archive, the Alchemists' trait and The Great Catalogue count "charters you hold", from any deck. Text: "for each charter you hold". | Scientific to Expansionist, Devotion and Commerce (their improvements, rites, buildings and units) | Small extension: one new count. It also removes a term, "charter technology", from three texts. |
| 3 | The Countermarch joins a technology completed to every kill card in Dominion and Devotion. | The technology moment to the kill moment | In proposal 1 |
| 4 | The Licence to Teach joins a scholar gained to the technology moment. Magisterial supplies scholars in bulk (The Wandering Muse, The Nine Jewels, the free drafts). | Magisterial's great people to Scientific's engine | In proposal 2 |
| 5 | When a wonder is reworked (you asked for that pass), give one age 3 wonder a line on the technology moment. Suggestion for The Library of Ashurbanipal, which you called not useful: "Completing a technology grants renown equal to a tenth of its price." | Wonders to the technology moment; it also feeds Sejong's and Hypatia's seats | Existing shape (The Scholars' Fame's grant). For the wonders pass, not this one. |

With connection 2, a seat with Nezahualcoyotl (Expansionist and Scientific) that holds twelve charters would have a Great Archive of +60 science and a warrior line at +12 (estimate). That is strong, and it costs twelve picks. Play change 1 first.

---

## G. What I could not verify

- **All power figures.** Nothing was measured. The power bar is from 2026-10-13 and predates the changes of November. The cadence of one technology in five turns is my estimate.
- **How the nerfed Mausoleum folds with The Nizamiyya and The Pandidakterion.** The figure of 120 to 135 for an Academy with the wonder assumes its own-yield doubling is taken before the two whole-hex percentages.
- **The ×3 on an Academy.** I took "×1.5, then ×2" from the direction review's reading of `wholePercent` and `appliedLast`. I did not trace the fold in `src/sim/yields/hex.ts`.
- **How many scholars a seat gains.** Six Academies in age 4 is arithmetic from the cards that grant one.
- **Charter building costs.** I computed them from `sizeHammers` and `columnRate` and took the column of the charter technology. I did not call `explainBuildingCost`.
- **Net yields of the charter improvements.** I subtracted what a farm would pay on the same hex. Real maps differ.
- **The price of Astronomy.** The data says 24. The design pass of 2026-11-20 says 50 in one place and 100 in another.
- **The Cathedral School.** Its data row has a second line (+2 science more for each faith building while the town keeps a rite) that the charter's text does not print.
- **Whether The Royal Academies counts second copies.** The design pass says it does. I did not read the count.
- **Whether The Charter Rolls must be seated.** I read it as a seated card because it carries an effect.
- **The Barber-Surgeons.** I did not find a unit's full health in `data/rules.json`, so "+10 health" is judged against combat lines only.
- **The Countermarch's shape.** I did not check that combat reads a rule held by a timed effect, or what happens with The Volley Fire and The Varangian Guard.
- **Rule A's effect on draft pacing.** About five more half-drafts a game is an estimate. It moves the tier rungs a little earlier.
- **The draft price formula.** I read `12 + 5n + n^2.2` from the `meter` row. It matches the 12, 18, 26 and 38 of the power bar.
- **Names.** "The Countermarch" and "The Licence to Teach" have no match in `data/` or `docs/`. "The Disputation" was my first name for proposal 2, and an old Magisterial doc uses it.

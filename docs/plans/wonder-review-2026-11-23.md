# Wonder review, 2026-11-23

This is a design review of the 34 live wonders. It changes no code, no data and no test. No test, bot game or dev server was run for it.

The user's words that started it: "I also think a bunch of the wonders could use a re-work, i found them generally not useful, like library of ashurbanipal."

How to read the numbers:
- **(live)** means the number is in the data or a doc of record today.
- **(proposed)** means this review suggests it.
- **(estimate)** means arithmetic on a typical seat, not a measurement.

Sources:
- Wonder rows: `data/buildings.json`. The quoted text is what `describeBuildingRow` prints for each row (the Compendium's own words).
- Costs: `docs/production-costs.md`, section 5 (sync-tested against the data).
- Typical seats: `.claude/skills/card-design/references/power-bar.md`.
- Earlier rulings: `docs/plans/wonders-review-2026-11-18.md` (the user's four rounds of 2026-11-19) and `docs/plans/deck-direction-review-2026-11-23.md` (The Mausoleum and Solomon's Temple).

---

## The user's comments, 2026-11-24

The user commented on the review page (12 comments). **Where this section and the text below disagree, this section is right.** Each row's "Today" text is in the table "The ten reworks that matter most" below.

The user in chat, 2026-11-24: "ok commented on the wonders doc. i want to have these changes in for the playtest, i changed my mind". So the settled changes of all the reviews are to be built for the playtest build. This reverses "let's queue these items" of 2026-11-23.

| # | Wonder | Proposed in this review | The user's words | Result |
|---|---|---|---|---|
| 1 | The Library of Ashurbanipal | "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars." | "great" | Settled as proposed. |
| 2 | The Pyramids | "+3 production in this city for each wonder you hold. +20% production toward wonders." | "great" | Settled as proposed. |
| 3 | The Terracotta Army | "Each time this city gains a unit, a second unit of the same kind joins you." | "wow, great" and "great" | Settled as proposed. It is a broken combo on purpose. |
| 4 | Solomon's Temple | "+2 culture, +2 faith. +2 renown a turn in every city with a Temple. +1 name in every great-person offer." | "let's keep the percentage, +15% renown." and "instead of the temple clause, everything else stays" | "+2 culture, +2 faith. +15% renown. +1 name in every great-person offer." This replaces the +10% renown of the first review. |
| 5 | The Walls of Uruk | "Every city with a Palisade gains +2 production and +2 culture. On completion, a Palisade is raised here." | "Add: +2 authority capacity" | "Every city with a Palisade gains +2 production and +2 culture. +2 authority capacity. On completion, a Palisade is raised here." |
| 6 | The Great Wall | "Every garrisoned city gains +2 production and +2 culture. Enemy units in your territory have -1 movement." | "Great, lets change to +3 production and +3 culture." | "Every garrisoned city gains +3 production and +3 culture. Enemy units in your territory have -1 movement." |
| 7 | Notre-Dame | The same text. It moves to an age 4 technology of column 9, so it costs 1,127 (today 1,934). | "great" | Settled as proposed. The technology is still to choose. |
| 8 | Machu Picchu | "+2 gold. +2 trade routes for your empire. +2 gold on every hex beside a mountain, once for each mountain." It moves to an age 3 technology of column 8, so it costs 860 (today 1,477). | "great" | Settled as proposed. The technology is still to choose. |
| 9 | The Pyramid of the Sun | The same text, with 10 faith for each citizen in place of 5. | "let's rework this. How about the levy gives a burst of science, faith and renown?" | The number change is dropped. New direction: when its city spends a citizen, the levy pays science, faith and renown. The numbers are open. A first suggestion (proposed, not the user's): 5 faith, 5 science and 3 renown for each citizen the city had before the levy. |
| 10 | Chichen Itza | "+2 culture, +2 faith. Rites last twice as long. +2 happiness and +20% culture in every city while it is keeping a rite." | "sure" | Settled as proposed. |

The user did not comment on these, so they are not ruled and are not built: the two smaller changes of the summary, The Great Mosque of Djenné, the cut candidates, and the question whether the other five decks get cards that read wonders held.

---

## Summary

### Findings

1. **A wonder costs 20 to 55 turns of an ordinary town, and most rows pay a card's worth or less.**
   - An ordinary town makes about 5, 10, 15 and 35 production a turn in the four ages (live, power bar).
   - A wonder costs 130 to 223 in age 1, 292 to 382 in age 2, 501 to 860 in age 3 and 1,127 to 1,934 in age 4 (live).
   - In age 1 the same hammers buy four settlers. No age 1 wonder is worth four towns.
2. **Outside Magisterial, nothing pays you for holding a wonder.**
   - About 20 Magisterial cards count wonders or towns with a wonder. Examples (live): The Workshop at Olympia ("+3 renown a turn for each wonder you hold") and The Keepers of Wonders ("Each wonder you hold gives +2 happiness, and +1 food, production, science, culture and faith in its town"). For that seat any wonder is worth about 18 yield a turn in age 2 and about 85 in age 4 (estimate, direction review section 1.1), whatever its row says.
   - In the other five decks I found about 17 cards, leader abilities, beliefs and luxuries that name wonders. About ten of them only make a wonder faster to build. The rest pay once on completion, or pay a town, or pay for a captured wonder (Dominion's Commission: The Captured Marvel: captured cities that hold a wonder gain +30% science and +30% culture). None counts the wonders you hold except Expansionist's The Builder Kings ("Manufactories gain +2 production for each wonder in the town working them").
   - So the row matters least for the one deck that builds wonders, and it is all that the other five decks get.
3. **Twelve of the 34 wonders are weak or pay nothing in most games.** Six pay too little for anyone. Six need a condition that few seats meet: a city under attack, a captured city, a rite kept, or prophets. Section B names each one with its live text.
4. **The wonders that feel good do something on the turn they finish.** Eight rows have a completion grant (a free god, a great person, a Doctrine draft, three units, a prophet, a technology, five rerolls). Four of the seven strong wonders are among them. None of the twelve weak ones is.
5. **Too many rows pay in a quantity the player does not see move.** Renown, city defence, authority, religious pressure and happiness above the top step change no number on the yield bar. The Library of Ashurbanipal is the clearest case (age 2, 382 production: "+2 science", "+10 renown per turn, favouring scholars", and more renown for each captured city).
6. **Three wonders are about defence.** They pay only when an enemy attacks you. A player who is ahead never sees them work.
   - The Walls of Uruk (age 1, 170): +10 city defence and +50 hit points in its city, +2 strength in your territory, +2 authority.
   - The Terracotta Army (age 3, 501): +2 production, +6 strength for a defender in your cities, +2 strength on units made in its city, +2 authority.
   - The Great Wall (age 3, 657): +2 production, +5 defence and +25 hit points in every city, enemy units in your territory have -1 movement.
7. **Most rows have three to five clauses.** The card measurements found that one-effect cards paid more per card than cards with three effects (live, power bar). The same is likely true here. Two of the best wonders have one clear effect each:
   - The Forbidden City (age 3, 657): "you have one more wildcard chair", and +5 authority.
   - The Oracle (age 1, 170): "+1 card in every Order hand" and in every Doctrine draft, with +2 culture and +2 faith.
8. **A name is used twice.** "The House of Wisdom" is a wonder (age 4: +4 science, +50% science in its city, and the current technology finished on completion) and also a shared Scientific and Magisterial card (Tier III: "Towns working an Academy build wonders 30% faster"). One of them needs a new name.

### The ten reworks that matter most, in order

The "Today" column is the game's own text for the row (live). The two renown lines that every wonder has are left out, unless the row's figure is unusual.

| # | Wonder (age, technology, cost; live) | Today (live) | Proposed (proposed) | Size |
|---|---|---|---|---|
| 1 | The Library of Ashurbanipal (age 2, Code of Laws, 382) | "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars." | "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars." | Existing shapes |
| 2 | The Pyramids (age 1, Stonecraft, 170) | "Newly created workers gain +1 charge. +20% production toward wonders." | "+3 production in this city for each wonder you hold. +20% production toward wonders." | Existing shape |
| 3 | The Terracotta Army (age 3, Iron Working, 501) | "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity." | "Each time this city gains a unit, a second unit of the same kind joins you." (broken combo) | Small extension |
| 4 | Solomon's Temple (age 2, The High Temple, 382) | "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." Ruled today: the last line becomes +10% renown. | "+2 culture, +2 faith. +2 renown a turn in every city with a Temple. +1 name in every great-person offer." | Existing shape |
| 5 | The Walls of Uruk (age 1, Bronzeworking, 170) | "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take." | "Every city with a Palisade gains +2 production and +2 culture. On completion, a Palisade is raised here." | Existing shapes |
| 6 | The Great Wall (age 3, The Civil Service, 657) | "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one." | "Every garrisoned city gains +2 production and +2 culture. Enemy units in your territory have -1 movement." | Existing shape |
| 7 | Notre-Dame (age 4, The Holy Office, column 11, 1,934) | "+2 culture. +1 happiness per building in your cities that supplies faith." | The same text. It moves to an age 4 technology of column 9, so it costs 1,127. | Number change |
| 8 | Machu Picchu (age 4, Natural Philosophy, column 10, 1,477; beside a mountain) | "+2 gold. +2 trade routes for your empire. +1 gold on every hex beside a mountain, once for each mountain." | "+2 gold. +2 trade routes for your empire. +2 gold on every hex beside a mountain, once for each mountain." It moves to an age 3 technology of column 8, so it costs 860. | Number change |
| 9 | The Pyramid of the Sun (age 2, Chronology, 292) | "+2 faith. A city with The Pyramid of the Sun may spend one citizen for 5 faith per citizen before the levy (once every 5 turns). +2 culture on every hex with a Holy Site." | The same text, with 10 faith for each citizen in place of 5. | Number change |
| 10 | Chichen Itza (age 3, Horology, 860) | "+2 culture, +2 faith. Rites last +50% longer. +2 happiness and +20% culture in every city while it is keeping a rite." | "+2 culture, +2 faith. Rites last twice as long. +2 happiness and +20% culture in every city while it is keeping a rite." | Number change |

Two smaller changes are in section C:
- The Great Lighthouse (age 1, Sailing, 130; coastal city). Today: "+2 gold. +1 gold on every hex with a Fishing Boat. +3 combat strength for ships. Ships: +1 movement." Proposed: "+1 food and +1 gold on every hex with a Fishing Boat. Ships: +1 movement."
- The Great Mosque of Djenné (age 3, Guildhalls, 860). Today: "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot." Proposed: the same text, and "On completion, an Apostle joins you."

### Decisions for the user

1. **The Library of Ashurbanipal (age 2, 382 production) carries your own text of 2026-11-19.**
   - Today: "+2 science. +10 renown per turn, favouring scholars. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder."
   - Proposed: "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars."
   - May the captured-city renown become the capture line, with the Library line as the base? Recommended: yes. The other option is in section B.
2. **On 2026-11-19 you ruled that three wonders are "fine as they are". Does that ruling still stand after your playtest?** Recommended: change the first two and leave the third.
   - The Terracotta Army (age 3, 501). Today: "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity." Proposed: "Each time this city gains a unit, a second unit of the same kind joins you."
   - The Walls of Uruk (age 1, 170). Today: "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take." Proposed: "Every city with a Palisade gains +2 production and +2 culture. On completion, a Palisade is raised here."
   - The Great Mosque of Djenné (age 3, 860). Today: "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot." Proposed: the same, and an Apostle on completion.
3. **Do you want The Terracotta Army as a broken combo?** Recommended: yes.
   - Today: the text in decision 2 (defence, and +2 strength on units from one city).
   - Proposed: "Each time this city gains a unit, a second unit of the same kind joins you."
   - It is the one wonder that the Dominion cards on units gained would race for. An example of those cards (live): The Gathering Host, "Gains +1 science and +1 culture each time you gain a military unit."
4. **Solomon's Temple (age 2, 382 production): may its renown line change again?** Recommended: yes.
   - Today (live): "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." You ruled this morning that the last line becomes +10% renown.
   - Proposed: the last line becomes "+2 renown a turn in every city with a Temple".
   - The +10% is about 3 renown a turn in age 2 (estimate). A Garden (an ordinary building, 117 production) gives +15% renown in its city (live).
5. **Should each of the other five decks get one or two cards that read wonders held?** Recommended: yes, as part of the deck passes, not in the wonder build.
   - Today only Magisterial cards count wonders, for example The Workshop at Olympia ("+3 renown a turn for each wonder you hold") and the Doctrine The Periclean Works ("Each wonder you hold gives +2 production in every town").
   - It is the direct answer to "more synergy through all decks". Reworks 1 to 6 go the other way: they make a wonder supply a quantity that two decks already read.

---

## A. Every live wonder

### Method, shown once

**Cost.** `price = 130 × 1.31 ^ (column - 1)`, floored (live, `docs/production-costs.md`). The column is the column of the technology that opens the wonder. Example: The Library of Ashurbanipal opens with Code of Laws, column 5. `130 × 1.31^4 = 382`.

**The typical seat (estimate, from the power bar).**

| Age | Towns | Seat yield a turn (median, live) | Production in one town (live) | What I assumed (estimate) |
|---|---|---|---|---|
| 1 | 3 | 44 | 5 | A Shrine in each town. Three Camps or Pastures. |
| 2 | 5 | 225 | 10 | Two faith buildings and one military building in each town. Two trade routes. One Holy Site. Two great-person works. |
| 3 | 8 | 543 | 15 | Two or three faith buildings in each town. Four routes. Two Holy Sites. Four works. Two improved resource hexes in each town. |
| 4 | 12 | 2,450 | 35 | Three faith buildings in each town. Six routes. Six works. |

**Pay a turn.** I add the six yields together at face value. Renown, happiness, units and one-time grants are named beside the sum, not added to it.

**Payback.** Cost divided by pay a turn in the wonder's own age.

**The ordinary column.** What the same hammers pay if the town builds ordinary buildings of that age (estimate):

| Age | Ordinary buildings (live rows) | Hammers for one yield a turn (estimate) |
|---|---|---|
| 1 | Monument 30 for 2 culture. Library 51 for 3 science. | 16 |
| 2 | Amphitheater 89 for 4 culture. Smithy 89 for 2 production and more on mines. | 25 |
| 3 | Public Bath 154 for 3 food and 1 happiness. Cathedral 397 for 4 yield and 3 happiness. | 60 |
| 4 | University 520 for 6 science. | 90 |

Late ordinary buildings look poor here because their value is a percentage or a requirement, which this column does not count. Read the ordinary column as a floor, not as a fair price.

**What every wonder gives on top (live).**
- +10 renown on completion and +2 renown a turn. Four rows differ (each row's full text is in the table below): The Mausoleum +5, The Library of Ashurbanipal +10, The Oracle +3 with no family, and Stonehenge, The Temple of Artemis and The Statue of Zeus +1.
- What 2 renown a turn is worth: great people 2 to 5 cost 134, 197, 267 and 346 renown (live). So 2 a turn is one more great person in about 100 turns (estimate). It is small.
- A place in three wagers: wonders in the capital, three wonders of the current age, and the total pay of your wonders in an age (live, `data/wagers.json`).
- 20 score for each wonder (live, `rules.score`).

**What cards add for each wonder held.**

| Seat | Readers, with what each does (live) | Worth for each wonder (estimate) |
|---|---|---|
| Magisterial | The Keepers of Wonders: each wonder gives +2 happiness, and +1 food, production, science, culture and faith in its town. The Workshop at Olympia: +3 renown a turn for each wonder. The Periclean Works (Doctrine): each wonder gives +2 production in every town. The Seven Sights: +5% culture and science for each wonder, at most +30%. The Spirit Way: wonders count as great-person works. Commission: The Eighth Wonder: +3 culture and +5 renown a turn for each wonder (ruled today: a free great-person draft and +3 culture for each wonder). About 14 more are in the direction review, "Sources that pay for wonders". | About 18 yield a turn and 2 happiness in age 2. About 85 in age 4. Up to 10 renown a turn before the nerf. |
| Magisterial, on completion | The Unveiling: a free Order hand. The Ceremonial Guard: two units. The Golden Age: +25% production and culture for ten turns. The Escorial (Doctrine): "Completing a wonder gives you a free great-person draft." | Once for each wonder |
| Scientific pair | The Lodge Books: "Completing a wonder completes the technology you are researching." The Peripatetic School: "Science buildings and wonders give +30% renown." | One technology for each wonder |
| Expansionist pair | The Builder Kings: "+25% production toward wonders. Manufactories gain +2 production for each wonder in the town working them." | 2 to 10 a turn for each Manufactory |
| Justinian (leader) | "Completing a wonder grants faith equal to its production cost." | 130 to 1,934 faith, once |
| Government | Divine Mandate: "Every town with a wonder gains +20% culture and +20% faith." | By town, not by wonder |
| Dominion | Commission: The Captured Marvel: captured cities that hold a wonder gain +30% science and +30% culture. | Only for a wonder you take |
| Any other seat | Only faster building. The Free Cities: buildings and wonders 20% faster with at most five towns. The City Architects: +30% toward buildings and wonders of your current age. Sacred Commissions: towns with a Holy Site build wonders 30% faster. The House of Wisdom (the card): towns working an Academy build wonders 30% faster. The Cathedral Lodges: towns with a Manufactory +30% toward wonders. The Merchant Works: towns building a wonder gain production equal to 25% of their gold. Qin Shi Huang: garrisoned cities build wonders 25% faster. Lorenzo: 10% faster for each gold building in the city. The Masons' Chapel (belief): +10% toward wonders in its city. Marble (luxury): +10% toward wonders. | Nothing for holding the wonder |

### The table

"Later" is two ages after the wonder's own age, or age 4 for an age 3 wonder. Every figure in the last three columns is an estimate. The first three columns are live.

| Wonder | Age, technology, cost | Text (live, quoted) | Pays in its own age | Pays later | Payback in turns; ordinary buildings for the same hammers |
|---|---|---|---|---|---|
| The Great Sphinx | 1, Mining, 130 | "+2 faith. +1 culture per building in your cities that supplies faith. On completion, gain 5 free draft rerolls." | 5, and 5 rerolls | 22 | 26; ordinary 8. Early culture is worth more than its face value. |
| The Hanging Gardens | 1, Calendar, 130 | "+3 food. +25% food surplus stored toward growth. +1 food on every hex with a Farm beside fresh water, in every city with The Hanging Gardens." | 7 | 12 | 19; ordinary 8 |
| The Great Lighthouse | 1, Sailing, 130. Coastal city. | "+2 gold. +1 gold on every hex with a Fishing Boat. +3 combat strength for ships. Ships: +1 movement." | 4 | 7 | 33; ordinary 8 |
| The Temple of Artemis | 1, Husbandry, 130 | "+2 food, +1 faith. +1 food on every hex with a Camp. +1 food on every hex with a Pasture. +2 happiness." | 6, and 2 happiness | 9 | 22; ordinary 8 |
| The Oracle | 1, Divination, 170 | "+2 culture, +2 faith. +1 card in every Order hand. +1 card in every Doctrine draft. +3 renown per turn." | 4, and a fourth card in every hand | 4, and the card | 43 on yield; ordinary 11. The extra card is the value. |
| Stonehenge | 1, Stonecraft, 170 | "+3 faith. +1 pantheon slot. +1 faith on every hex carrying Stone or Marble. On completion, a god is named, and your faith is not spent." | 4, and a free god (worth about 6) | 12 | 17; ordinary 11 |
| The Pyramids | 1, Stonecraft, 170 | "Newly created workers gain +1 charge. +20% production toward wonders." | 0 | 0 | No yield. It returns its cost after about 1,000 more hammers of wonders. |
| The Walls of Uruk | 1, Bronzeworking, 170 | "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take." | 0 | 0 | No yield. 2 authority is two thirds of one founded town (3, live). |
| The Temple of Thoth | 1, Divination, 170. Fresh water. | "+2 faith. 50% of the faith in every city with The Temple of Thoth is gained again as science." | 4 | 12 | 43; ordinary 11 |
| The Great Ziggurat | 1, Writing, 223 | "+2 science, +2 faith. +2 science in every city with a Shrine. Rites cost 30% less faith, in every city with The Great Ziggurat." | 10 | 20 | 22; ordinary 14 |
| The Theatre of Dionysus | 2, Epic Poetry, 292 | "+4 culture. +1 happiness per Amphitheater. On completion, a Doctrine draft opens. On completion, an Amphitheater is raised here as well." | 8 culture, 3 happiness, a Doctrine, a building worth 89 | 8, and 10 happiness | 37 on yield; ordinary 12 |
| The Mausoleum | 2, Currency, 292 | Live: "the yields of every hex carrying a great person's work are doubled, after every other change to the hex". Ruled today: it doubles a work's own yields only. "+5 renown per turn." | 8 with two works (ruled text) | 48 with six works | 37; ordinary 12 |
| The Statue of Zeus | 2, Bronze Panoply, 292 | "+1 culture. +4 combat strength when attacking cities. On completion, 3 melee units join you." | 1, and three Swordsmen (138 hammers, live price 46 each) | 1 | About half the cost comes back as units at once. |
| The Pyramid of the Sun | 2, Chronology, 292 | "+2 faith. A city with The Pyramid of the Sun may spend one citizen for 5 faith per citizen before the levy (once every 5 turns). +2 culture on every hex with a Holy Site." | 4, and about 8 faith a turn from the levy at the cost of a citizen | 6, and about 16 from the levy | 73 without the levy, 24 with it; ordinary 12 |
| The Colossus | 2, Wayfinding, 382. Coastal city. | "+3 gold. +1 trade route for your empire. +1 production, +1 gold on every water hex carrying a resource." | 15 | 30 | 25; ordinary 15 |
| Petra | 2, Irrigation, 382. Beside desert. | "+2 gold. +1 food, +1 production on every desert hex. +1 gold on every floodplain hex." | 16 with six worked desert hexes | 29 | 24; ordinary 15 |
| Solomon's Temple | 2, The High Temple, 382 | Live: "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." Ruled today: the discount becomes +10% renown. | 4, and about 3 renown | 4, and about 8 renown | 96; ordinary 15 |
| The Iron Pillar | 2, Siegecraft, 382 | "+2 production. Your production buildings pay +50%. +1 production on every hex carrying a strategic resource." | 10 | 40 | 38; ordinary 15 |
| The Library of Ashurbanipal | 2, Code of Laws, 382 | "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars." | 2, and 10 renown | 2, and 10 renown, more with captures | 191 on yield; ordinary 15 |
| The Weiyang Palace | 2, Code of Laws, 382 | "+2 culture. +25% production toward buildings, in your capital. +1 culture per building in this city, your capital." | 9 | 22 | 42; ordinary 15 |
| The Great Library | 3, Rhetoric, 501 | "+8 science. +2 science on every hex with an Academy, for each great scholar you have gained this game. On completion, a great person of the scholars is offered." | 22 with two scholars and two Academies | 40 with four scholars and three Academies | 23; ordinary 8 |
| The Terracotta Army | 3, Iron Working, 501 | "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity." | 2 | 2 | 250; ordinary 8 |
| Angkor Wat | 3, State Workforce, 501 | "+2 faith. +1 faith on every improved hex carrying a resource. +3 faith on every hex with a Holy Site." | 24 | 32 | 21; ordinary 8. The median age 3 seat makes 36 faith (live). |
| The Great Stelae of Aksum | 3, The Silk Road, 501 | "+2 gold. +2 culture, +2 faith on every trade route you send." | 18 with four routes | 26 | 28; ordinary 8 |
| The Great Wall | 3, The Civil Service, 657 | "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one." | 2 | 2 | 330; ordinary 11 |
| The Forbidden City | 3, Satrapies, 657 | "You have one more wildcard chair. +5 authority capacity." | One seated card: 18 to 25 (live median, turns 101 to 150) | 40 to 62 | 26 to 36; ordinary 11 |
| The Circus Maximus | 3, Engineering, 860 | "+1 happiness per military building. +4 happiness." | 0 yield, 12 happiness (20 or more for Dominion) | 0 yield, 22 happiness | No yield. See the note on happiness below. |
| Chichen Itza | 3, Horology, 860 | "+2 culture, +2 faith. Rites last +50% longer. +2 happiness and +20% culture in every city while it is keeping a rite." | 4. About 15 for a seat that keeps rites in three towns. | 4, or about 40 | 215, or 57 with rites; ordinary 14 |
| Hagia Sophia | 3, Theology, 860 | "+3 faith. +1 culture, +1 faith in every city with a Temple. Spreads your religion +4 faith to every city within 8 hexes. On completion, a Prophet joins you." | 15 with six Temples, and a Prophet (120 faith or more, live) | 27 | 57; ordinary 14 |
| The Great Mosque of Djenné | 3, Guildhalls, 860 | "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot." | 3. For a seat with a religion: half as many acts again from every prophet and apostle (2 charges become 3, live). | 3 | 287 on yield; ordinary 14 |
| The House of Wisdom | 4, Scholarship, 1,127 | "+4 science. +50% science in every city with The House of Wisdom. On completion, the technology you are researching is finished." | About 64, and a technology worth 2,000 to 5,000 science | none | 18; ordinary 13 |
| Machu Picchu | 4, Natural Philosophy, 1,477. Beside a mountain. | "+2 gold. +2 trade routes for your empire. +1 gold on every hex beside a mountain, once for each mountain." | About 32 | none | 46; ordinary 16 |
| Notre-Dame | 4, The Holy Office, 1,934 | "+2 culture. +1 happiness per building in your cities that supplies faith." | 2, and about 30 happiness | none | No yield to speak of; ordinary 21 |
| The Alhambra | 4, Militant Orders, 1,934 | "+10 culture. You have one more military chair. On completion, a great person of the generals is offered." | 10, a Military chair (a card of about 40), a great general | none | About 39; ordinary 21 |

**A note on happiness.** At 5 happiness a seat gains +10% and at 10 it gains +20% (live, `rules.meters.tiers`). Above 10, one happiness only makes room for one more citizen. So The Circus Maximus and Notre-Dame are strong for a seat that sits below 10 and weak for a seat that is already above it. I could not find the typical happiness of a human seat.

---

## B. The sort

Each wonder below carries a short form of its live text. The full text is in the table of section A.

### The Library of Ashurbanipal

**What it does (live).** Age 2, Code of Laws, 382 production. Text: "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars."
- +2 science in its city. A Library (an ordinary age 1 building) gives 3 science for 51 production (live).
- +10 renown a turn. The draw of the next great person leans toward scholars.
- +5 renown a turn for each captured city you hold, and +20 in total if that city holds a wonder.
- 382 production is about 38 turns of an ordinary age 2 town.

**Why it felt useless.**

| Reason | Detail |
|---|---|
| It pays in renown, and renown shows no change on the turn you finish it | The yield bar moves by 2 science. The renown arrives as a great person 13 to 35 turns later (134 to 346 renown at 10 a turn, estimate). The player does not connect that person to this wonder. |
| Renown became cheap and plentiful a week before | A Magisterial seat with The Workshop at Olympia (+3 renown a turn for each wonder) and Commission: The Eighth Wonder (+5 renown a turn for each wonder, live) makes about 52 renown a turn in age 2 (estimate, direction review). The wonder adds a fifth to that. For a seat that makes 20 it adds a half, which is fair on paper. So it is weakest for the deck that races for wonders. |
| Two of its three lines need a captured city | A peaceful seat never uses them. A conquering seat spends its production on units and rarely wins a wonder race in age 2. |
| It does nothing on completion | No scholar, no technology, no draft. |
| "Favouring scholars" is a weight on a draw | It does not promise a scholar. |
| The name promises a library | It has less science than a Library. |
| It changes nothing about how you play | You hold it and wait. |

**What would make it worth the race.** Three things: a line the player sees at once, a moment, and a reason to play differently.

- Today (live): "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars."
- Proposed (recommended): "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars."

Why:
- The Library line pays 15 science in age 2 with five towns, where the median seat makes 30 science (live). It pays 36 in age 4. Payback is about 25 turns.
- The capture line is the reason to play differently. A technology costs 190 to 1,150 science in ages 2 and 3 and 1,960 to 5,150 in age 4 (live). A capture is then worth 5 to 10 turns of science (estimate).
- It gives Scientific's army cards and Dominion's conquest cards one thing to race for. The direction review found that Scientific's army thread has no pay-off.
- It is a broken combo with Carried-Off Scholars (a shared Tier III card: "Capturing a city grants a technology that its owner knows and you do not"). The two give two technologies for each capture. I recommend that you keep it.
- The +10 renown stays as you wrote it. The two captured-city renown lines go.

The other option keeps your design and makes it visible:
- Proposed (second option): "+2 science. +10 renown a turn toward scholars. On completion, a great scholar is offered. Each captured city gives +5 renown a turn."
- It adds a moment and nothing else. The Great Library (age 3: +8 science, and "on completion, a great person of the scholars is offered") already offers a scholar, so the two wonders would feel alike.

### Strong (7)

| Wonder (age, cost; live) | What it does today (live, short) | Why it is strong |
|---|---|---|
| The Great Sphinx (1, 130) | +2 faith. +1 culture for each building that supplies faith. Five free draft rerolls on completion. | The cheapest wonder. It doubles an age 1 seat's culture and grows with every faith building. |
| The Oracle (1, 170) | +2 culture, +2 faith. +1 card in every Order hand and every Doctrine draft. +3 renown a turn. | One more card in every hand for the whole game. |
| The Theatre of Dionysus (2, 292) | +4 culture. +1 happiness for each Amphitheater. On completion, a Doctrine draft and a free Amphitheater. | Two things at once on completion, and 8 culture where the median seat makes 25. |
| The Great Library (3, 501) | +8 science. Each Academy gives +2 science for each great scholar you have gained. A great scholar is offered on completion. | A scholar at once, and Academy science that has no limit. A deliberate broken combo for the Academy build. |
| Angkor Wat (3, 501) | +2 faith. +1 faith on every improved hex with a resource. +3 faith on every Holy Site. | It adds two thirds to a median seat's faith. |
| The Forbidden City (3, 657) | One more Wildcard chair. +5 authority capacity. | A chair is a whole card, and the row has one clear effect. |
| The House of Wisdom (4, 1,127) | +4 science. +50% science in its city. The technology you are researching is finished on completion. | A technology at once and half as much science again in the best city. |

### Fair (15)

Each pays about what an ordinary building pays for the same hammers, or better, and each has a clear owner (a deck or a kind of map).

| Wonder (age, cost; live) | What it does today (live, short) |
|---|---|
| Stonehenge (1, 170) | +3 faith. +1 pantheon slot. +1 faith on Stone and Marble hexes. A free god on completion. |
| The Hanging Gardens (1, 130) | +3 food. +25% food stored toward growth. +1 food on river farms in its city. |
| The Temple of Artemis (1, 130) | +2 food, +1 faith, +2 happiness. +1 food on every Camp and Pasture. |
| The Great Ziggurat (1, 223) | +2 science, +2 faith. +2 science in every city with a Shrine. Rites cost 30% less in its city. |
| The Temple of Thoth (1, 170; fresh water) | +2 faith. Half of its city's faith is gained again as science. At the low end of fair. |
| The Colossus (2, 382; coastal city) | +3 gold. +1 trade route. +1 production and +1 gold on every water hex with a resource. |
| Petra (2, 382; beside desert) | +2 gold. +1 food and +1 production on every desert hex. +1 gold on every floodplain hex. |
| The Mausoleum (2, 292) | Live: every hex with a great-person work yields double, after every other change. Ruled today: it doubles the work's own yields only. +5 renown a turn. |
| The Statue of Zeus (2, 292) | +1 culture. +4 strength when attacking cities. Three melee units on completion. |
| The Iron Pillar (2, 382) | +2 production. Production buildings pay +50%. +1 production on every hex with a strategic resource. |
| The Weiyang Palace (2, 382) | +2 culture. +25% production toward buildings in the capital. +1 culture for each building in the capital. |
| The Great Stelae of Aksum (3, 501) | +2 gold. +2 culture and +2 faith on every trade route you send. |
| Hagia Sophia (3, 860) | +3 faith. +1 culture and +1 faith in every city with a Temple. Religious pressure within 8 hexes. A Prophet on completion. At the low end of fair. |
| The Circus Maximus (3, 860) | +4 happiness. +1 happiness for each military building. |
| The Alhambra (4, 1,934) | +10 culture. One more Military chair. A great general is offered on completion. Fair for Dominion, weak for a seat with few military cards. |

### Weak (6): too small for anyone

| Wonder (age, cost; live) | What it does today (live) | Why it is weak |
|---|---|---|
| The Pyramids (1, 170) | "Newly created workers gain +1 charge. +20% production toward wonders." | No yield. One worker charge saves about 5 production for each worker (estimate). The +20% returns the cost only after about 1,000 more hammers of wonders. |
| Solomon's Temple (2, 382) | "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." (Ruled today: +10% renown.) | 4 yield and about 3 renown a turn for 382 production. |
| The Pyramid of the Sun (2, 292) | "+2 faith. A city with The Pyramid of the Sun may spend one citizen for 5 faith per citizen before the levy (once every 5 turns). +2 culture on every hex with a Holy Site." | 4 yield. The levy is fair, but it costs a citizen, and a seat has one or two Holy Sites. |
| The Great Lighthouse (1, 130; coastal city) | "+2 gold. +1 gold on every hex with a Fishing Boat. +3 combat strength for ships. Ships: +1 movement." | 4 gold. Two of its four lines are for ships, and naval war is a minor thread on most maps. |
| Machu Picchu (4, 1,477; beside a mountain) | "+2 gold. +2 trade routes for your empire. +1 gold on every hex beside a mountain, once for each mountain." | About 32 gold in age 4, where the median seat makes 2,450 a turn. A Market (89 production: +2 gold and one route) and a Caravanserai (231 production: three routes) give routes for far less (live). |
| Notre-Dame (4, 1,934) | "+2 culture. +1 happiness per building in your cities that supplies faith." | It opens with one of the last technologies. The Magnum Opus, the building that wins the game, costs 2,534 (live). A seat that can build Notre-Dame should build the Opus. |

### Does nothing in most games (6): a condition few seats meet

| Wonder (age, cost; live) | What it does today (live) | The condition |
|---|---|---|
| The Library of Ashurbanipal (2, 382) | "+2 science. +5 renown per turn in every captured city. +15 renown per turn in every captured city containing a wonder. +10 renown per turn, favouring scholars." | Captured cities, for two of its three lines. |
| The Walls of Uruk (1, 170) | "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take." | An enemy must attack this city or fight in your territory. |
| The Terracotta Army (3, 501) | "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity." | An enemy must attack your cities. The +2 strength is 4% of an age 3 unit (42 to 50, live), and only for units from one city. |
| The Great Wall (3, 657) | "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one." | An enemy must enter your territory. |
| Chichen Itza (3, 860) | "+2 culture, +2 faith. Rites last +50% longer. +2 happiness and +20% culture in every city while it is keeping a rite." | You must keep rites in several towns. |
| The Great Mosque of Djenné (3, 860) | "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot." | You must have a religion and buy prophets and apostles. |

---

## C. One rework for each weak wonder

The aim for each: the wonder makes the player want to play differently, or it supplies a quantity that cards of at least two decks read.

Size marks: **number change**, **existing shape** (the effect vocabulary writes it today), **small extension** (one new field on an existing shape), **new shape**. No rework below needs a new shape or a new mechanic.

Each wonder is a block: its live age, technology and cost, then Today, Proposed, the reasoning, the decks it joins and the size. "Today" is the game's own text. The two renown lines that every wonder has are left out.

**1. The Library of Ashurbanipal** (live: age 2, Code of Laws, 382)
- Today: "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars."
- Proposed: "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars."
- Reasoning: section B. A visible line, a moment, and a reason to go to war.
- Decks: Scientific (Libraries, technologies), Dominion (captures).
- Size: existing shapes. A `pays` line with a `hasBuilding` scope, as The Great Ziggurat has ("+2 science in every city with a Shrine"). A `windfallRider` on `capture` with `completeResearch`, the grant that The Lodge Books uses ("Completing a wonder completes the technology you are researching").

**2. The Pyramids** (live: age 1, Stonecraft, 170)
- Today: "Newly created workers gain +1 charge. +20% production toward wonders."
- Proposed: "+3 production in this city for each wonder you hold. +20% production toward wonders."
- Reasoning: each wonder makes the next one faster, so the Pyramids starts a wonder city for any deck. Four wonders give +12 production where an age 2 town makes 10. The worker charge goes.
- Decks: Magisterial (wonders held), Expansionist (The Builder Kings: Manufactories gain +2 production for each wonder in the town).
- Size: existing shape. It is the line of the Doctrine The Periclean Works ("Each wonder you hold gives +2 production in every town": `pays`, `count: wonders`, to production) with a `hasBuilding` scope.

**3. The Terracotta Army** (live: age 3, Iron Working, 501)
- Today: "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity."
- Proposed: "Each time this city gains a unit, a second unit of the same kind joins you."
- Reasoning: **a deliberate broken combo.** One city makes two units for the price of one. Every Dominion card that pays on a unit gained fires twice, for example The Gathering Host ("Gains +1 science and +1 culture each time you gain a military unit"). All four live lines go.
- Decks: Dominion (units gained), the shared levy cards (a citizen spent for a unit gives two).
- Size: small extension. A `windfallRider` on `unitCompletion` grants a unit today, but only "best melee" and similar. It needs "the same unit". The second unit must not fire the rider again.

**4. Solomon's Temple** (live: age 2, The High Temple, 382)
- Today: "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." Ruled today: the last line becomes +10% renown.
- Proposed: "+2 culture, +2 faith. +2 renown a turn in every city with a Temple. +1 name in every great-person offer."
- Reasoning: Temples (an ordinary age 2 building: +2 faith, 117 production) become a supply of great people. Five Temples give +10 renown in age 2 and twelve give +24 in age 4. It replaces the +10% of today's ruling.
- Decks: Devotion (Temples), Magisterial and every deck that wants great people.
- Size: existing shape. The `renown` effect with `per: city` and a scope, as The Library of Ashurbanipal uses today for captured cities.

**5. The Walls of Uruk** (live: age 1, Bronzeworking, 170)
- Today: "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take."
- Proposed: "Every city with a Palisade gains +2 production and +2 culture. On completion, a Palisade is raised here."
- Reasoning: a Palisade (an ordinary age 1 building: +5 city defence and +15 hit points) costs 52 and pays no yield (live). With the wonder it pays 4 yield, so the player builds walls and gets the defence with them. Three towns give +6 culture where an age 1 seat makes 4. All four live lines go.
- Decks: Dominion (about 23 cards read military buildings), and The Circus Maximus (the age 3 wonder: +1 happiness for each military building).
- Size: existing shapes. The scoped `pays` line, and the `building` completion grant of The Theatre of Dionysus ("on completion, an Amphitheater is raised here as well").

**6. The Great Wall** (live: age 3, The Civil Service, 657)
- Today: "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one."
- Proposed: "Every garrisoned city gains +2 production and +2 culture. Enemy units in your territory have -1 movement."
- Reasoning: the wall pays in peace for an army that stays home. Eight garrisoned towns give +32 in age 3 (median seat 543). The slow-down stays as its one rule. The flat +2 production, the defence and the hit points go.
- Decks: Dominion (garrisons), Qin Shi Huang (the leader: "Garrisoned cities build wonders and buildings 25% faster"), Expansionist (many towns).
- Size: existing shape. `pays` with the city scope `garrisoned`.

**7. Notre-Dame**
- Today: age 4, The Holy Office, column 11, 1,934 production. "+2 culture. +1 happiness per building in your cities that supplies faith."
- Proposed: the same text. It moves to an age 4 technology of column 9, so it costs 1,127.
- Reasoning: it then arrives while happiness still decides something. It stays in age 4, so the wager The Wonder of the Age (hold three wonders of the current age) still has four wonders there.
- Decks: Devotion (faith buildings), Expansionist (many citizens).
- Size: number change (a move on the tree).

**8. Machu Picchu**
- Today: age 4, Natural Philosophy, column 10, 1,477 production, beside a mountain. "+2 gold. +2 trade routes for your empire. +1 gold on every hex beside a mountain, once for each mountain."
- Proposed: an age 3 technology of column 8, so 860 production, still beside a mountain. "+2 gold. +2 trade routes for your empire. +2 gold on every hex beside a mountain, once for each mountain."
- Reasoning: like Petra (age 2: +1 food and +1 production on every desert hex), it is a wonder for one kind of land. It needs to arrive while the towns beside mountains are still growing. Age 4 would then have three wonders, which the wager still allows.
- Decks: Commerce (routes, gold), Expansionist (land).
- Size: number change. The 2026-11-19 review warned that this line may be the largest gold source on a mountain map. Watch it.

**9. The Pyramid of the Sun** (live: age 2, Chronology, 292)
- Today: "+2 faith. A city with The Pyramid of the Sun may spend one citizen for 5 faith per citizen before the levy (once every 5 turns). +2 culture on every hex with a Holy Site."
- Proposed: the same text, with 10 faith for each citizen in place of 5.
- Reasoning: a city of eight then gives 80 faith for one citizen, which is most of a prophet (120, live). The levy is a keyword you asked more cards to share, so it stays.
- Decks: Devotion (faith, Holy Sites), Expansionist and Dominion (levy cards).
- Size: number change.

**10. Chichen Itza** (live: age 3, Horology, 860)
- Today: "+2 culture, +2 faith. Rites last +50% longer. +2 happiness and +20% culture in every city while it is keeping a rite."
- Proposed: "+2 culture, +2 faith. Rites last twice as long. +2 happiness and +20% culture in every city while it is keeping a rite."
- Reasoning: "always keep a rite" becomes a plan a seat can hold, since a rite's price rises by 5 faith for each rite started (live).
- Decks: Devotion (rites), any seat with spare faith.
- Size: number change (50 becomes 100).

**11. The Great Lighthouse** (live: age 1, Sailing, 130, coastal city)
- Today: "+2 gold. +1 gold on every hex with a Fishing Boat. +3 combat strength for ships. Ships: +1 movement."
- Proposed: "+1 food and +1 gold on every hex with a Fishing Boat. Ships: +1 movement."
- Reasoning: one clear owner, a seat with towns on the coast. The +2 gold and the +3 strength go.
- Decks: Commerce (gold, sea routes), Expansionist (coast towns).
- Size: number change.

**12. The Great Mosque of Djenné** (live: age 3, Guildhalls, 860)
- Today: "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot."
- Proposed: the same text, and "On completion, an Apostle joins you."
- Reasoning: it is a Devotion wonder by design, and you ruled it fine. A completion grant gives it a moment and shows the extra charge at once.
- Decks: Devotion.
- Size: existing shape. The `unit` completion grant of Hagia Sophia ("on completion, a Prophet joins you").

### The broken combos, named

| Combo, with what each part does | What happens | Keep? |
|---|---|---|
| The Terracotta Army (proposed: "Each time this city gains a unit, a second unit of the same kind joins you") with cards that pay on a unit gained, such as The Gathering Host (live: "+1 science and +1 culture each time you gain a military unit"), and with levies (a town spends a citizen for a unit) | Every unit from one city arrives twice, and every such card pays twice | Yes. It needs the wonder, a production city and the cards. |
| The Library of Ashurbanipal (proposed: "Each time you capture a city, the technology you are researching is finished") with Carried-Off Scholars (live, shared Tier III: "Capturing a city grants a technology that its owner knows and you do not") | Two technologies for each captured city | Yes. It needs a war that is going well. |
| The Pyramids (proposed: "+3 production in this city for each wonder you hold") with The Periclean Works (live Doctrine: each wonder gives +2 production in every town) and The Builder Kings (live: Manufactories gain +2 production for each wonder in the town) | Each wonder raises production in the wonder city three times over | Yes, but measure it. It feeds the Magisterial loop that the nerf is cutting. |
| The Great Library (live: each Academy gives +2 science for each great scholar gained) with the Scientific Academy cards (live), for example The Peripatetic School ("Academies gain +2 science and +2 production") | Academy science with no limit | Yes. It is live and you have not complained about it. |
| The Great Sphinx (live: +1 culture for each building that supplies faith, 130 production) with a wide Devotion seat | 30 or more culture a turn from the cheapest wonder | Yes. |

---

## D. Leave alone, and what could be cut

### Leave alone

No change is proposed for these, so each has only its live text (short form).

| Wonder (age, cost; live) | What it does today (live, short) | Why leave it |
|---|---|---|
| The Great Sphinx (1, 130) | +2 faith. +1 culture for each faith building. Five free rerolls on completion. | One clear effect, and strong. A pattern for the others. |
| The Oracle (1, 170) | +1 card in every Order hand and Doctrine draft. +2 culture, +2 faith. | One clear effect, and strong. |
| The Forbidden City (3, 657) | One more Wildcard chair. +5 authority. | One clear effect, and strong. |
| The Theatre of Dionysus (2, 292) | +4 culture. A Doctrine draft and a free Amphitheater on completion. +1 happiness for each Amphitheater. | A moment on completion. |
| The Great Library (3, 501) | +8 science. Academies gain +2 science for each great scholar gained. A scholar on completion. | A moment on completion. |
| The House of Wisdom (4, 1,127) | +4 science. +50% science in its city. A technology on completion. | A moment on completion. |
| Hagia Sophia (3, 860) | +3 faith. +1 culture and +1 faith in every Temple city. A Prophet on completion. | A moment on completion. |
| The Statue of Zeus (2, 292) | +1 culture. +4 strength against cities. Three melee units on completion. | A moment on completion. |
| The Mausoleum (2, 292) | Great-person works yield double (ruled today: their own yields only). +5 renown a turn. | You ruled on it today. Measure it after the nerf. |
| Petra (2, 382) | +1 food and +1 production on every desert hex. +1 gold on floodplains. +2 gold. | A map wonder. A seat on that land wants it. |
| The Colossus (2, 382) | +3 gold. +1 trade route. +1 production and +1 gold on water resources. | A map wonder (coast). |
| The Hanging Gardens (1, 130) | +3 food. +25% growth. +1 food on river farms in its city. | A map wonder (rivers). |
| The Temple of Artemis (1, 130) | +1 food on every Camp and Pasture. +2 food, +1 faith, +2 happiness. | A map wonder (animals). |
| Angkor Wat (3, 501) | +1 faith on every improved resource hex. +3 faith on Holy Sites. +2 faith. | It reads improved resources, which every deck raises. |
| The Great Stelae of Aksum (3, 501) | +2 culture and +2 faith on every trade route you send. +2 gold. | It reads routes, which Commerce raises. |
| The Iron Pillar (2, 382) | Production buildings pay +50%. +1 production on strategic resources. +2 production. | It reads production buildings. |
| The Weiyang Palace (2, 382) | +1 culture for each building in the capital. +25% toward buildings there. +2 culture. | It reads buildings in the capital. |
| Stonehenge (1, 170) | +1 pantheon slot and a free god. +3 faith. +1 faith on Stone and Marble. | A fair faith wonder. Look again in the Devotion review. |
| The Great Ziggurat (1, 223) | +2 science in every Shrine city. +2 science, +2 faith. Rites 30% cheaper in its city. | The same. |
| The Temple of Thoth (1, 170) | Half of its city's faith is gained again as science. +2 faith. | The same. |
| The Circus Maximus (3, 860) | +4 happiness. +1 happiness for each military building. | Fair for Dominion. |
| The Alhambra (4, 1,934) | One more Military chair. +10 culture. A great general on completion. | Fair for Dominion. It is late, but the chair and the general arrive at once. |

Three small points on wonders I would leave alone:
- The Great Ziggurat's third clause ("rites cost 30% less faith, in every city with The Great Ziggurat") works in one city only. Few players will notice it. It could go.
- Eleven of the 34 wonders are in the faith category. A seat with no interest in faith has 23 to choose from.
- The Great Library (+8 science, a scholar, Academy science) is an age 3 wonder, opened by Rhetoric. The 2026-11-18 review suggested age 2. That is still open.

### What could be cut

You ruled on 2026-11-19 that every existing wonder stays. I recommend no cut. If you want fewer wonders as part of "simplify wherever we can", these are the candidates, in order. Each shows the text that would be lost.

1. **One of the three defence wonders.** If reworks 3, 5 and 6 are built, none of them is a defence wonder any more, and no cut is needed. The text lost would be one of:
   - The Walls of Uruk (age 1, 170): "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take."
   - The Terracotta Army (age 3, 501): "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity."
   - The Great Wall (age 3, 657): "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one."
2. **The Great Mosque of Djenné** (age 3, 860). Text lost: "+3 faith. Newly created prophets gain +1 charge. Newly created apostles gain +1 charge. +1 pantheon slot." It serves one deck, and its pantheon slot is the effect of Stonehenge (age 1: "+1 pantheon slot", and a free god) a second time.
3. **The Temple of Thoth** (age 1, 170). Text lost: "+2 faith. 50% of the faith in every city with The Temple of Thoth is gained again as science." It is a small line in one city. The Great Ziggurat (age 1: "+2 science in every city with a Shrine") already joins faith and science in age 1.

---

## What I could not verify

- **No number in the "pays" columns is measured.** I ran no game. The typical seat is my assumption from the power bar, and that bar was measured from bot games before several later changes.
- **The typical happiness of a human seat.** The worth of The Circus Maximus (+4 happiness, and +1 for each military building) and Notre-Dame (+1 happiness for each building that supplies faith) depends on it.
- **What a trade route pays.** I used about 5 to 10 yield a turn for a route. `docs/trade.md` gives the formula, and I did not work a full example.
- **How often a bot attacks a human's cities.** If it happens often, the three defence wonders (The Walls of Uruk, The Terracotta Army and The Great Wall: city defence, hit points and strength at home) are worth more than I say.
- **The value of a free god from Stonehenge** (age 1: +1 pantheon slot, and a god named for free on completion)**.** I took it as one band 0 card (about 6 a turn).
- **Shapes.** I checked each "existing shape" by reading `src/sim/statecraftData.ts` and the data rows named in section C. I did not check that every reader walks a wonder row. In detail:
  - a `windfallRider` on a wonder row: one building row carries one today (on `death`), so the kind reaches a building, but I did not test `capture` or `unitCompletion` from a wonder;
  - `pays` with `count: wonders` and a `hasBuilding` scope together (The Pyramids, proposed: "+3 production in this city for each wonder you hold");
  - the city scope `garrisoned` on a wonder's `pays` line (The Great Wall, proposed: "Every garrisoned city gains +2 production and +2 culture");
  - a scoped `renown` line with `hasBuilding: temple` (Solomon's Temple, proposed: "+2 renown a turn in every city with a Temple").
- **The technology moves** (Notre-Dame from column 11 to column 9 of age 4; Machu Picchu from column 10 of age 4 to column 8 of age 3)**.** I did not check the tree chart, the lanes or the column of each target technology beyond `data/techs.json` costs and the cost table. The 2026-11-19 review asked for one wonder for each technology where possible.
- **The wager "The Wonder of the Age".** I read its row (three wonders of the current age) and did not read its code.
- **The count of cards that read wonders.** I searched the data for the wonder scopes and counts. The Magisterial list comes from the direction review, which was written before today's rulings.
- **The quoted text** is the output of `describeBuildingRow`, read through a short script. I joined each row's clauses into one cell and left out the two renown lines that every row has. The Mausoleum (great-person works yield double) and Solomon's Temple (great people cost 10% less renown) will print new text after today's rulings are built.
- **Bots.** Every rework changes what a wonder is worth to a bot. Astra needs a line for each one that is built.

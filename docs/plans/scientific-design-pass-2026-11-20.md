# Scientific design pass (2026-11-20)

**Status, 2026-11-20:** nothing here is ruled yet. This is a proposal for the user to approve or reject, one change at a time. Nothing is built, and no game data changed.

The user, 2026-11-20:

> *"ok lets do a pass on devotion and scientific."*

> *"I think base science and culture is a bit too strong, i think i want to nerf the passive science from population, and the base science and culture buildings that scale off population."*

- This pass covers Scientific. Another pass covers Devotion. Section 9 lists the places where the two meet.
- It proposes 68 changes. You asked the earlier passes to go for more changes than needed, and this pass does the same.
- The method is the card-design skill. "Now" is the card's text in `data/decks/scientific.json`, which equals the sheet `docs/decks/scientific.md`. I checked each one against the game's own words (`describeCard`, in `test/fixtures/cardText.json`).
- The shared cards start from the state that the Commerce, Expansionist, Dominion and Magisterial passes left. No card reads wild or tended land.
- Every number is a first guess against the power bar, to tune in playtest. I ran three bot games to read where science comes from (section 1.3). They read the state and changed nothing.
- No figure is ruled for the cut to passive science. Section 3 says what a cut does to the deck. Every science card in the pass says what its science rides on.
- The review page keeps the anchors `change-01` to `change-68` and `question-1` to `question-5`.

**The proposal by kind:** 7 buff, 20 rework, 7 cut, 11 move, 12 new, 9 doctrine, 2 rule.

## 1. Why the deck plays as it does

In three sentences:

1. **The deck does not make science. The base game does.** 10 of its 68 cards pay science, 9 of them are in Tiers 0 to II, and 3 of them pay for each citizen. In the bot games, cards supplied 15% of a Scientific seat's flat science at turn 100, and citizens supplied 38%. A Dominion and Magisterial seat drew a larger share of its science from cards than any Scientific seat.
2. **The seat builds one building in each town and waits.** 23 cards read a building that a town builds once: a school, an empire building, or a charter's building. The 7 cards that read a technology pay for any technology, so no card rewards the choice of what to research.
3. **The deck's strongest cards are hidden or dealt too late.** A seat is offered about 3 of its 13 charters in a game. The late charter technologies cost 3,250 to 8,000 science for a small gift. Each Tier IV rare is the deck's card in one hand in seventy, and the bot games ended before the median seat reached Tier IV. The first empire to learn Alchemy opens the Magnum Opus for every empire, so a lead buys no head start.

### 1.1 The tally: what each card reads, by tier

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

**What the cards pay:**

| What the card pays | Today | After the pass |
|---|---|---|
| Science | 10 | 17 |
| Food and production | 18 | 15 |
| Culture, alone or with production | 13 | 9 |
| Renown, great scholars, drafts | 5 | 9 |
| Strength and units | 15 | 12 |
| A rule, an unlock, or a technology | 7 | 10 |
| **All** | **68** | **72** |

- Today 10 cards of 68 pay science (15%): The Herbalists' Charter, The Curators of Works, The Scribes, The Apprentices, The Glassmakers' Charter, The Forward Plans, The Scribes' Hall, The Sky Watchers, The Paper-Makers' Charter and The Nizamiyya. Tier III has one and Tier IV has none.
- After the pass 17 of 72 pay science (24%), under the rule of a third. One of the 17 rides on population (The Forward Plans, through the University).

### 1.2 What a Scientific seat does on the map and in its turns

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

### 1.3 Where a seat's science comes from: three bot games

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
- **The University is not part of it.** No seat of twelve held a University at turn 100. At the last reading of each game, four seats of eighteen held one. A University costs 520 hammers and needs Education, a fourth-age technology of 1,960 science. So the science of population is the base rate and the Library, at 1 science a citizen together.
- **A seat completes a technology every 2 to 4 turns**, at every reading from turn 60 on.
- **The games ended at turns 118, 137 and 150** with a winner. I did not check how each was won. Two of the three winners held Scientific. The median seat held 18 drafts at turn 120 and 24 at turn 140, and Tier IV opens at 26. Your own recorded win, in September, closed the Opus at turn 164.

### 1.4 What a technology lead buys, and which cards pay for it

- **Units.** Every unit of a line upgrades in place when its technology lands, with no cost. A third-age unit has 42 to 50 strength and a second-age unit 30 to 35. So one age ahead is worth +12 or more, which is larger than any card. This is the lead's real prize.
- **Wonders.** The seat that learns a wonder's technology first may start it first. No card gives earlier access since The Palace Archive and The Great Designs were cut, and three cards give a percentage toward wonders.
- **Buildings.** The same: a University or an Aqueduct some turns before a rival.
- **The Magnum Opus.** Nothing. `opusOpen` is true for every seat as soon as any seat knows Alchemy. Two cards change that, The Foundation Stone and The Closed Book, and both are Tier IV rares.
- **The cards that pay for the lead:** The Secret Arts (production), The Edge of the Sword and The Proving Ground (strength), and the Doctrine The Directorate of Arms. All four read what the empires you have met know. The star chart shows that count in its head and marks each technology in it, so the player can see it. But a seat that is level gains nothing from the four, and a seat that is far ahead gains most.

### 1.5 The charters: seldom seen, and the late ones cost too much

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

### 1.6 Dead and nearly dead cards

- **The Naval Gunners' Charter (IV):** 8,000 science for +3 strength on one kind of ship.
- **The Royal Tutors and The War Manuals (0):** a Library needs Letters, one of the last two technologies of the first age, and great people open in the second age. Both cards pay nothing in their own tier.
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

### 1.7 Rares that are weaker than commons

| The rare | What it pays | The common or uncommon that beats it |
|---|---|---|
| The Quiet Faculties (II) | +25% food and +20% production in one to three towns | The Round City (uncommon): +1% production and culture in every town for each citizen of the capital |
| The Model Army (III) | Upgrades without the strategic resource | Commerce's Foreign Procurement does the same for bought units and is a common |
| The Sum of Knowledge (IV) | +50 production and +50 culture in the capital | The Astronomical Diaries (uncommon, I): the same count in the same town, from Tier I |
| The Great Catalogue (IV) | +10% to +30% toward the Opus, with the charters a seat is offered | The generic The Grand Design (uncommon): about +75 production toward the Opus |
| The Great Instrument (IV) | 254 hammers, once | Any Tier IV card |
| Commission: The Lynx-Eyed Academy (IV) | A scholar and 1,200 production, once | The Republic of Letters (uncommon), which counts the same Academies every turn |
| The Forward Plans (I) | A University of 520 hammers, when a town makes 10 | The Scribes' Hall (common), which pays in every Library town now |

### 1.8 How often each card is seen

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

### 1.9 The tiers come late, and the game ends early

- The draft model of 2026-10-17 puts the first hand of Tiers I to IV at turns 32, 72, 133 and 161. In the three bot games the median seat reached them at about turns 37, 70 and 118, and did not reach Tier IV before the game ended. The leading seat of each game reached Tier III at about turn 90 and Tier IV between turns 100 and 125.
- So Tier II is where a game is shaped, and Tier III is where it is decided. Tier IV is seen by one to three seats of six, for the last 15 to 30 turns.
- The deck's last cards are in Tier IV: five cards for the Opus, both commissions with a large goal, and three of its four Tier IV Doctrines. Changes 40 to 45 move six cards to Tier III. This is the reading that the Commerce pass took for Merchant Princes.
- These are bot games. If your own games run to turn 160 and more, Tier IV is reached more often, and the moves still do no harm.

### 1.10 Gaps by tier and by chair

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

### 1.11 Doubles

- **The capital gains production and culture for a count, four times:** The Astronomical Diaries (technologies completed), The Charter Rolls (charters), The Sum of Knowledge (technologies known) and The Republic of Letters (Academies). The first and the third count nearly the same thing.
- **Production toward a kind of building, four cards and three Doctrines:** Learned Foundations, The Free Cities, The City Architects, The Great Catalogue, and the Doctrines The Academy of Gondishapur, The Külliye and The Court of Rudolf II for research. The shared The House of Wisdom is a fifth card.
- **An empire building pays production, three times:** The Royal Estates, Enduring Institutions and The Royal Academies.
- **An Academy pays food and production, twice:** The Old Academy on the hex and The Quiet Faculties in the town.
- **The lead pays strength, twice and a Doctrine:** The Edge of the Sword, The Proving Ground and The Directorate of Arms.
- **A Library gives its town a thing, six times in Tier I:** The Scribes' Hall, The Almanac, The Common Tables, Learned Foundations, The Dedications and The Forward Plans, with The War Manuals and The Royal Tutors in Tier 0 and two shared cards.

### 1.12 Chores

- **The deck has few chores.** It leaves no units on the map, and its works are one to a town.
- **Research is a decision every three turns that the cards make empty.** The player picks what the tree needs next, and no card says otherwise. It is attention with no reward, which the card-design skill says to remove.
- **The lead is a thing to watch that the player cannot push.** Four rows turn on and off as rivals learn. The star chart shows the count, so it is not hidden.
- **A charter technology stops the main tree.** The seat leaves it for 5 to 18 turns of research, and during that time nothing completes.

### 1.13 Science, culture, production and gold

- **Science:** from the base game, as section 1.3 shows. The deck adds a little in Tiers 0 and I and almost nothing later.
- **Culture:** reachable in every tier. The Dedications, The Astronomical Diaries, The Charter Rolls, The Round City, The Roll of Scholars, The Royal Academies, The Doctorate, The Humanists.
- **Production:** reachable in every tier, and more than the deck design says. 18 of 68 cards pay food or production.
- **Gold:** no card of the deck pays gold. The shared The Royal Patents (with Commerce) is the only one in a Scientific seat's pool, and the great scholar Brahmagupta pays gold for each science building. I think that is right for this deck.
- **Faith:** The Sky Watchers, and the cards shared with Devotion.
- **Happiness and authority:** the Physic Garden and The Curators of Works pay happiness. No card pays authority, and the pass adds none.

### 1.14 The pairs, in one line each

- **Dominion** (3 shared cards): Scientific gives an army that upgrades in place and charter traits for its lines. It takes science from kills and captures.
- **Expansionist** (2): Scientific gives early Aqueducts and works that the land theme counts. It takes mountains, improved land and big towns.
- **Commerce** (3, after its pass): Scientific gives a technology every three turns, which The Royal Patents turns into gold. It takes gold that buys schools, and routes that pay science.
- **Devotion** (6): Scientific gives science from Temples and from faith. It takes faith that buys science buildings. Six is twice the number you set for Commerce.
- **Magisterial** (2): Scientific gives charters and scholars. It takes more drafts and wonders. One of the two cards is a fourth "production toward wonders".

## 2. The notes: what I tested, and what I recommend

- The core stays: research, charters, scholars and Academies, and the institutions. I tested ten directions against one question: does the way the seat plays produce the quantity by itself, so that a seat which drafts one card of the note is still paid?
- I recommend four. A and B are the main ones. C gives the deck its map. D is small.

### A. Discovery: a deed can complete a technology (Recommended)

- **The moment:** a technology completes (`tech`, with its cost). It comes about fifty times a game for every seat.
- **The idea:** today the seat waits for the moment. This note lets it make the moment by a deed. A boon completes the technology in hand (change 29). A scholar's treatise completes it (change 30). A wonder completes it (change 65, shared with Magisterial). A captured city gives one (change 66, shared with Dominion). A charter technology at half price is a fifth way (change 53).
- **Who reads it:** The Royal Workshops, The Astronomical Diaries, The Scholars' Fame, The Journeymen, The Age of Reason, the shared The Royal Patents, the Doctrine The Jixian Academy, and the leaders Harun al-Rashid (faith) and Sejong (renown).
- **The floor:** every seat completes technologies, so each of those cards pays with no other card.
- **What it does to play:** before each deed the player aims at the most expensive technology they can research. A treatise that ends a technology of 5,150 is a turn the player remembers.
- **After a cut to passive science** these deeds are worth the same, because each ends one technology whatever the seat's science is.

### B. The plan: what you research is a choice (Recommended)

- **The quantities:** the newest age the seat knows, the ages it has finished, and the technology in hand. All three are on the seat's own star chart.
- **The idea:** go deep or go wide. A seat that enters an age early gains a draft (change 16), +4 strength for the units of that age (change 26) and 30% toward its buildings and wonders (change 27). Then the old age costs a third less (change 25), and finishing the first age pays a scholar (change 17). The Prototype Works moves to Tier II, where the technology in hand opens its rows (change 31).
- **The floor:** every seat enters three ages and knows its newest age.
- **What it does to play:** the choice of the next technology has a reason beside what it unlocks. The cheapest technology of the next age is worth a draft and a stronger army.
- **What I did not do:** read what rivals know. These cards pay a seat that is level with its rivals.

### C. The learned land: works that read their neighbours (Recommended)

- **The quantities:** the hexes beside a work. Woods beside a Physic Garden (change 01). Empty hexes beside a star tower, a new work (change 07). The district that a qanat waters (change 08). The hexes round an Academy (change 22), and the schools of its town (change 21). The kinds of work a town holds (the Doctrine of change 55).
- **The idea:** you asked the Expansionist pass for works that read their neighbours, and the keyword unique improvement now covers this deck's two. Scientific's works should make science from where they stand.
- **The floor:** a garden with no wood beside it pays what it pays today. A tower on any hex pays 1 or 2.
- **What it does to play:** the seat keeps some woods, leaves the edge of its land bare for a tower, and plants its Academy in the town with the schools.
- **After a cut to passive science** this is where a seat's science comes from in ages 1 and 2, when the cut takes most.

### D. Knowledge applied: the newest age (Recommended, small)

- **The idea:** a lead should pay without a card that asks what rivals know. The Armoury Patterns pays units of the newest age (change 26). The Model Army heals on each upgrade (change 35). The Opus cards move to Tier III, so a lead in Alchemy buys ten turns and an early start (changes 40 to 42).
- **The floor:** every seat's units reach the newest age when its research does.
- It is small because the army already has six charter traits and buildings.

### E. Scholars: the treatise against the Academy (Already in the deck; two capstones)

- The deck has ten cards for scholars and Academies, and Sejong is the leader who calls as many scholars as possible. The pass adds The Summa and The Collected Works (changes 30 and 39) and moves the Academy cards to the tier where Academies exist.

### F. Experiments with a risk (One card, not a note)

- A loan of science is a good card, and the pass has one (change 29). A whole theme needs many timed drawbacks, and the rule of 2026-11-10 keeps drawbacks to rares. I did not write a card that rolls dice for a technology: a free technology worth 5,000 science on a roll is not a risk that the player takes, it is luck that happens to them.

### G. The lead over the empires you have met (Keep it small)

- The star chart shows the lead, so the rule of 2026-11-10 about hidden quantities does not apply to it. But a seat cannot push it, and it pays most to the seat that needs least. The pass keeps The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms, and cuts The Proving Ground (change 38). Question 1.

### H. Exploration and natural features (One light card)

- The deck design gives exploration to Commerce. The Clay Map (change 05) is the one card. The game has no natural wonders to read.

### I. Observatories as buildings on mountains (Not recommended)

- The Observatory needs a University and The Astrolabe, a technology of 5,150 science. Bot seats do not reach it before the game ends. The star tower does the job on the map from Tier I. If you want the building in play, it needs a base rule: drop the University from its needs.

### J. Being first to a technology (Not recommended)

- The game records the first empire to each technology (`techWorld`). You cut The Prize Essay, and the simplification cut The Kept Secret and The Great Designs, because the player cannot see a race. The Closed Book keeps the one race that the whole table watches, which is Alchemy.

## 3. What a cut to passive science does to this deck

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

## 4. Index

| # | Card | Tier | Change | Confidence | Ruling |
|---|---|---|---|---|---|
| 01 | The Herbalists' Charter | 0 | rework | good |  |
| 02 | The Apprentices | 0 | buff | good |  |
| 03 | The War Manuals | 0 | rework | good |  |
| 04 | The Royal Tutors | 0 to I | move | good |  |
| 05 | The Clay Map | 0 | new | speculative |  |
| 06 | The House of Life | 0 | new | good |  |
| 07 | The Astronomers' Charter | I | new | good |  |
| 08 | The Surveyors' Charter | I | rework | good |  |
| 09 | The Glassmakers' Charter | I | rework | good |  |
| 10 | The Scribes' Hall | I | rework | strong |  |
| 11 | The Royal Estates | I | buff | good |  |
| 12 | The Sky Watchers | I | buff | good |  |
| 13 | The Dedications | I | rework | good |  |
| 14 | Learned Foundations | I | cut | strong |  |
| 15 | The Common Tables | I | cut | good |  |
| 16 | The Reform of the Calendar | I | new | good |  |
| 17 | Commission: The Old Learning | I | new | good |  |
| 18 | The Charter Rolls | II to I | rework | good |  |
| 19 | Tier I rarities | I | move | good |  |
| 20 | The Old Academy | I to II | move | good |  |
| 21 | The Lecture Halls (was The Founding Gift) | I to II | rework | good |  |
| 22 | The Latin Quarter | II | rework | good |  |
| 23 | The Quiet Faculties | II | cut | good |  |
| 24 | Enduring Institutions | II | rework | good |  |
| 25 | The Translation Movement | II | rework | good |  |
| 26 | The Armoury Patterns | II | rework | good |  |
| 27 | The City Architects | II | rework | good |  |
| 28 | The Printers' Charter | II | rework | good |  |
| 29 | The Alfonsine Tables | II | new | good |  |
| 30 | The Summa | II | new | good |  |
| 31 | The Prototype Works | IV to II | move | speculative |  |
| 32 | Tier II rarities | II | move | good |  |
| 33 | The Age of Reason | III | rework | strong |  |
| 34 | The Humanists | III | rework | good |  |
| 35 | The Model Army | III | buff | good |  |
| 36 | The Gunfounders' Charter | III | buff | speculative |  |
| 37 | The Second Seat | III | buff | speculative |  |
| 38 | The Proving Ground | III | cut | good |  |
| 39 | The Collected Works | III | new | good |  |
| 40 | The Foundation Stone | IV to III | move | good |  |
| 41 | The Closed Book | IV to III | move | good |  |
| 42 | The Great Instrument | IV to III | move | good |  |
| 43 | Commission: The Lynx-Eyed Academy | IV to III | rework | good |  |
| 44 | The Republic of Letters | IV to III | rework | good |  |
| 45 | The Military Engineers' Charter | IV to III | move | good |  |
| 46 | The Naval Gunners' Charter | IV | cut | good |  |
| 47 | Tier III rarities | III | move | good |  |
| 48 | The Sum of Knowledge | IV | rework | good |  |
| 49 | The Walls of Learning | IV | cut | strong |  |
| 50 | The Laboratories | IV | new | good |  |
| 51 | The Invisible College | IV | new | good |  |
| 52 | The Great Catalogue | IV | move | good |  |
| 53 | A charter technology costs half the price of its column | Rule | rule | good |  |
| 54 | A charter is dealt in its own tier and in the next | Rule | rule | good |  |
| 55 | The Natural Histories | Doctrine I | doctrine | good |  |
| 56 | The Peripatetic School | Doctrine I to II | doctrine | good |  |
| 57 | The Jixian Academy | Doctrine II | doctrine | good |  |
| 58 | The Nassau Reforms | Doctrine IV to II | doctrine | good |  |
| 59 | The Volley Fire | Doctrine III | doctrine | strong |  |
| 60 | The Mustansiriya (was The Külliye) | Doctrine III | doctrine | strong |  |
| 61 | The Platonic Academy | Doctrine IV to III | doctrine | good |  |
| 62 | The Court of Rudolf II | Doctrine IV | doctrine | good |  |
| 63 | The Trace Italienne | Doctrine IV | doctrine | speculative |  |
| 64 | The Founders' Schools | I | new | good |  |
| 65 | The Lodge Books | II | new | good |  |
| 66 | Carried-Off Scholars | II | rework | good |  |
| 67 | Field Academies | I | buff | good |  |
| 68 | The Blessed Forges | II | cut | good |  |

## 5. The changes

**Tier 0**

### 01. The Herbalists' Charter (rework)

- **Tier, rarity, type:** 0, common, Civic (Charter)
- **Now:** Opens Herbals, which unlocks the Physic Garden: +2 science and +2 happiness. A town may have one, on flat land with fresh water.
- **Proposed:** Opens Herbals: workers may plant one Physic Garden in each town, on flat land with fresh water: +2 science and +2 happiness, and +1 science more for each forest or jungle hex beside it.
- **Why:** The garden pays the same on every hex that can hold it, so the player puts it anywhere. In the Expansionist pass you asked for works that read their neighbours, and for a reason to keep forest. Herbs come from the woods. Now the best hex for a garden is beside two or three woods, and a chop costs something.
- **Its science rides on:** The map: the woods beside the garden. It does not ride on population.
- **Arithmetic:** A garden beside two woods pays 4 science and 2 happiness for one worker charge. Four towns: 16 science and 8 happiness, where a median bot seat makes 26 science at turn 60. The Expansionist pass counted forest in the first three rings of 79% of starts, 9.7 hexes on average. On a start with no wood the garden pays what it pays today. Herbals costs 24 science, and 12 under change 53.
- **Synergy:** **Raises:** science and happiness on the map, unique improvements. **Reads:** forest and jungle hexes. Expansionist's The Totem Poles, The Timber Yards and The Hedgerows also keep woods standing. Its The Cadastre adds +3 science to each garden, and Commission: The Reclaimed Lands counts it. The qanat of change 08 gives dry land the fresh water that a garden needs.
- **Shape:** Small extension: a yield "for each hex beside it that…" on an improvement row. The Expansionist build adds this shape for Nazca lines and the baray. Data on the row `physicGarden`.
- **Confidence:** good

### 02. The Apprentices (buff)

- **Tier, rarity, type:** 0, common, Economic
- **Now:** Finishing a building grants 5 science.
- **Proposed:** Finishing a building grants science equal to a fifth of its production cost. Wonders do not count.
- **Why:** 5 science is a tenth of a first-age technology, and it is nothing by the third age. A share of the cost keeps the card the same size against the tree for the whole game. It is science from a deed: the seat that builds more learns more.
- **Its science rides on:** A deed: buildings finished. It does not ride on population.
- **Arithmetic:** Granary, 30 hammers: 6 science. Monument, 39: 8. Library, 51: 10. Market, 90: 18. Forum, 231: 46. Aqueduct, 265: 53. University, 520: 104. A seat finishes about six buildings by turn 40: about 45 science, which is one technology of 24 to 50. In age 3, eight towns finish a building every two turns at about 250 hammers each: 25 science a turn, where the median bot seat makes 179 at turn 100.
- **Synergy:** **Raises:** science. **Reads:** buildings finished: built, bought, or granted. Fed by The Free Cities, The City Architects (change 27), the shared The Founders' Schools (change 64), the generic The Capital's Example, and every building a Commerce partner buys.
- **Shape:** Small extension: the row has `windfallRider` on `buildingCompletion` with `exceptWonders`. The grant needs the measure "the building's cost". `OccasionMeasure` holds `strength`, `population` and `gold`, and the Dominion build adds `unitCost`.
- **Confidence:** good

### 03. The War Manuals (rework)

- **Tier, rarity, type:** 0, common, Military
- **Now:** Units gained in a town with a Library start with +2 strength.
- **Proposed:** Your ranged units gain +2 strength.
- **Why:** A Library needs Letters, which is one of the last two technologies of the first age. So in Tier 0 the card pays nothing. You cut The Court Painter from Magisterial's Tier 0 for that reason. The deck's army is small and it shoots: the Mechanists' Charter and the Doctrine The Volley Fire both build on the archer line. This card starts that line at turn 1.
- **Arithmetic:** An Archer shoots at 20, so +2 is 10%, which is the regular Tier 0 combat line (+2 to +3). A Bowman shoots at 28 and a Crossbowman at 50. The card fades, as a Tier 0 card should.
- **Synergy:** **Raises:** ranged strength. **Reads:** ranged units. It joins the Mechanists' Charter (the archer line moves after it shoots), The Volley Fire (it attacks twice) and The Armoury Patterns (change 26).
- **Shape:** Existing shape: `combatLine` with a ranged class, as Dominion's The Longbowmen.
- **Confidence:** good
- **Depends, joins and notes:** It takes one card out of the group that reads a Library.

### 04. The Royal Tutors (move)

- **Tier, rarity, type:** 0 to I, common, Civic
- **Now:** Tier 0: +2 scholar renown each turn for each science building.
- **Proposed:** Tier I, the same text.
- **Why:** A seat has no science building in Tier 0 before Letters, and great people open in the second age with Epic Poetry (about turn 55 for bots). You removed The Court Painter with these words: "its not useful in tier 0 as great people are only unlocked in age 2". In Tier I the card pays from its first hand.
- **Arithmetic:** Four Libraries at turn 60: +8 renown a turn. The first great person costs 75 renown and the second 134, so the card brings the first scholar about nine turns after it is seated. Twelve science buildings at turn 100: +24 a turn.
- **Synergy:** **Raises:** scholar renown. **Reads:** science buildings. It feeds The Lecture Halls (change 21), The Summa (30), The Collected Works (39), The Roll of Scholars and The Doctorate.
- **Shape:** No shape change. `band` 0 to 1.
- **Confidence:** good

### 05. The Clay Map (new)

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

### 06. The House of Life (new)

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

### 07. The Astronomers' Charter (new)

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

### 08. The Surveyors' Charter (rework)

- **Tier, rarity, type:** I, uncommon, Economic (Charter)
- **Now:** Opens Surveying: you may build the Aqueduct early, and workers may build the Qanat, which waters the farms beside it.
- **Proposed:** Opens Surveying: you may build the Aqueduct early, and workers may dig one qanat in each town, on flat land beside a hill or a mountain. Every hex within two hexes of a qanat has fresh water.
- **Why:** The qanat has no yield, and it waters only the farms that touch it. The Expansionist pass's stepwell does more (+2 food, renown, and water for the hexes beside it), so the qanat is the worse of two works with one job. A real qanat carries water under the ground from the hills to a whole district. At two hexes it turns dry land into farm land, and it decides where a town's fields go.
- **Arithmetic:** Two rings are 18 hexes. Inside them a farm may stand on desert, tundra and hills, and after Irrigation each farm with fresh water gains +1 food. Eight farms: +8 food, and farms where none could stand. A Physic Garden needs fresh water, so the qanat also gives a dry town its garden. Surveying costs 100 science, and 50 under change 53.
- **Synergy:** **Raises:** hexes with fresh water, farms. **Reads:** hills and mountains. It feeds Expansionist's The Watercourses (irrigated farms +2 production) and Commission: Break the Sod, the Doctrine The Hydraulic Empire, Nezahualcoyotl's The Dikes (farms in Aqueduct towns) and Jayavarman VII's farms beside fresh water. It feeds the Specularium of change 09.
- **Shape:** Small extension on the row `qanat`: `watersBeside` gains a radius of 2; one in each town; a placement test "beside a hill or a mountain".
- **Confidence:** good
- **Depends, joins and notes:** A reading to confirm: the town's own hex has fresh water if it is in range.

### 09. The Glassmakers' Charter (rework)

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

### 10. The Scribes' Hall (rework)

- **Tier, rarity, type:** I, common, Civic
- **Now:** Towns with a Library gain +1 science for every four citizens.
- **Proposed:** Libraries give +2 science.
- **Why:** It is the second card that pays science for each citizen. The new line puts the science on the Library itself. Then everything that multiplies a Library multiplies it: Ibn al-Haytham ("your libraries pay double"), the Doctrine The Universitas, and Cai Lun's line. If the Library loses its rate for each citizen, this card gives a flat Library back to the seat that drafts it.
- **Its science rides on:** A building: the Library, a flat sum. It does not ride on population.
- **Arithmetic:** Five Libraries at turn 60: +10 science, where the median bot seat makes 26. Today the card pays +1 or +2 in a town of that size, so +5 to +10. Eleven Libraries at turn 100: +22, and +44 with Ibn al-Haytham.
- **Synergy:** **Raises:** science on a building. **Reads:** Libraries. Fed by The Founders' Schools (change 64). Multiplied by Ibn al-Haytham and The Universitas. Harun al-Rashid's The Storehouse of Wisdom pays the same building.
- **Shape:** Existing shape: `pays` in a city on the Library's own line. The rule of batch R2b puts a line counted by a kind of building into that building's package.
- **Confidence:** strong

### 11. The Royal Estates (buff)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Each empire building gives its town +2 food and +2 production.
- **Proposed:** Each empire building gives its town +3 food and +3 production.
- **Why:** An empire can hold about ten empire buildings in a whole game, and two or three in Tier I. The card counts a thing that comes slowly and pays as if it were plentiful. The Magisterial pass found the same fault in the cards that count great-person works.
- **Arithmetic:** Three empire buildings at the end of Tier I: +9 and +9, which is 18 a turn and inside the Tier I bar of 15 to 25. At +2 it is 12. Ten in age 4: +30 and +30.
- **Synergy:** **Raises:** food and production. **Reads:** empire buildings. In Tier I those are the Heroic Epic, the Imperial Throne, Chart the Stars, the High Temple and the Mouseion. Fed by the Librarians', Physicians' and Printers' Charters (change 28), The Second Seat, and the Doctrines The Academy of Gondishapur and The Mustansiriya.
- **Shape:** Existing shape. A number change.
- **Confidence:** good
- **Depends, joins and notes:** The text is yours, of 2026-10-21. Only the number changes.

### 12. The Sky Watchers (buff)

- **Tier, rarity, type:** I, common, Civic
- **Now:** Shrines give +1 faith and +1 science.
- **Proposed:** Shrines give +1 faith and +2 science.
- **Why:** It is the deck's only faith card, and it is the weakest card in Tier I. Five Shrines pay +5 and +5.
- **Its science rides on:** A building: the Shrine. It does not ride on population.
- **Arithmetic:** Five Shrines: +5 faith and +10 science, 15 a turn, at the low end of the Tier I bar.
- **Synergy:** **Raises:** faith and science on a building. **Reads:** Shrines. The Doctrine The Pythagorean Brotherhood pays the same towns, and Harun al-Rashid's The Storehouse of Wisdom pays the same building.
- **Shape:** Existing shape. A number change.
- **Confidence:** good

### 13. The Dedications (rework)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Finishing a science building or an empire building grants culture equal to ten times the town's population.
- **Proposed:** Finishing a science building or an empire building grants culture equal to its production cost.
- **Why:** The present card pays more in a big town and no more for a big building: a Library and the Forum pay the same. The cost is the figure the player reads on the build list, and it grows with the ages by itself. The card then reads the deed and not the town's size.
- **Arithmetic:** A Library pays 51 culture. The Heroic Epic and Chart the Stars pay 135 each, the Mouseion 175, the Forum 231, a Scriptorium 303 and a University 520. In Tier I, four Libraries and two empire buildings: about 475 culture over thirty turns, where a seat makes about 25 culture a turn. Today the same builds pay about 280. It is strong, so it stays uncommon.
- **Synergy:** **Raises:** culture, and so drafts. **Reads:** science buildings and empire buildings finished. It joins The Apprentices (change 02), which pays science for every building. Fed by the building charters, The City Architects (27) and The Founders' Schools (64).
- **Shape:** Existing shape, with the cost measure of change 02.
- **Confidence:** good

### 14. Learned Foundations (cut)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Cities with a Library build empire buildings 25% faster.
- **Proposed:** Cut. The row is retired.
- **Why:** Four cards and three Doctrines of this deck say "production toward a kind of building". This one reads a Library to speed about ten buildings in a whole game. The Doctrines The Academy of Gondishapur (+20%) and The Mustansiriya (+50%) do the same job.
- **Arithmetic:** Ten empire buildings at about 300 hammers each are 3,000 hammers in a game. 25% faster saves about 600 of them over 150 turns: 4 a turn.
- **Synergy:** Nothing reads it. The Royal Estates (change 11) and Enduring Institutions (24) pay for the same buildings.
- **Shape:** `retired: true`. The row stays for saves.
- **Confidence:** strong

### 15. The Common Tables (cut)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Towns gain +2 food for each science building in them.
- **Proposed:** Cut. The row is retired.
- **Why:** Tier I holds six cards that say "a Library gives its town a thing": science, production, food, renown, strength and culture. That is the deck's one note at this tier. Food is the yield the deck now gets in other ways: The Royal Estates (change 11), the Specularium (09), the qanat (08) and the Doctrine The Removal to Xianyang.
- **Arithmetic:** Five Libraries: +10 food. With every school in ten towns in age 4 it reaches +60 to +80 food, so a late seat does lose something. The great people Maimonides, Āryabhaṭa and Brahmagupta still pay for each science building.
- **Synergy:** It read science buildings. Four cards of Tier I still read a Library after the pass, and The Royal Tutors reads science buildings.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** If you want one of the Library cards back, this is the first.

### 16. The Reform of the Calendar (new)

- **Tier, rarity, type:** I, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** Entering a new age opens an Order draft at once.
- **Why:** A new age is the largest moment that research has, and no card of the deck reads it. You liked the new line for the great scholar John Dee: "immediately unlock two order drafts". This card makes the choice of what to research matter. The cheapest technology of the next age is a draft, so a seat may go deep first and learn the old age later.
- **Arithmetic:** A seat that drafts it in Tier I is in age 1 or 2, so it enters two or three ages with the card seated: two or three drafts. The price of a draft climbs: 53 to 183 culture in Tier I, 220 to 620 in Tier II, 680 and more in Tier III (`costBase` 12, `costLinear` 5, `costExponent` 2.2). A seat that enters age 3 at its twelfth draft and age 4 at its twentieth saves about 300 and 840 culture. That is two Tier II lumps (500 to 900 each) for a rare that pays nothing else. A free draft also moves the seat up the ladder, so the next tier opens sooner and the next draft costs more.
- **Synergy:** **Raises:** drafts, Orders held. **Reads:** ages entered. Fed by The Translation Movement (change 25), and by The Alfonsine Tables (29) and The Summa (30), which can finish the first technology of an age at once. It feeds Magisterial's The Twelve Tables, The Encyclopedia and Commission: The Roll of the Senate.
- **Shape:** New shape: a rider on the moment `ageEntered`, which the game announces and no card reads, with the grant "an Order draft opens". The great people John Dee and Aesop need the same grant.
- **Confidence:** good
- **Depends, joins and notes:** It must stay seated to pay. The Doctrine offer of the Magisterial pass's The Lawgiver is the nearest built thing.

### 17. Commission: The Old Learning (new)

- **Tier, rarity, type:** I, uncommon, Wildcard
- **Now:** Not in the deck.
- **Proposed:** Goal: know every technology of the first age. Reward: choose a great scholar.
- **Why:** Tier I has no commission. The deck also has no card for the other way to research, which is to finish what you started. The first age has twelve technologies, and a seat that hurries on leaves three or four behind. The goal is cheap, and the reward comes at the time great people open.
- **Arithmetic:** The twelve cost 269 science in all. A bot seat knows 10 to 23 technologies at turn 60 (median 14), so the goal is met between turn 50 and turn 70. A scholar then is the first Academy, or a treatise of 8 turns of science (about 200 to 700).
- **Synergy:** **Raises:** great scholars. **Reads:** the technologies of the first age that the seat knows. It feeds The Lecture Halls (change 21), The Latin Quarter (22), The Roll of Scholars, Mehmed's The Enderun and Cleopatra's The Museion. The Translation Movement (25) makes the goal cheaper.
- **Shape:** Small extension: a commission goal "knows every technology of an age". The reward exists (`greatPerson: scholar`).
- **Confidence:** good
- **Depends, joins and notes:** For the builder to check: that a scholar granted before Epic Poetry can be called.

### 18. The Charter Rolls (rework)

- **Tier, rarity, type:** II to I, uncommon, Civic
- **Now:** Tier II: Your capital gains +3 production and +3 culture for each charter you have drafted.
- **Proposed:** Tier I: Your Order hands hold one more card. It is a charter, while your decks have one to deal.
- **Why:** A seat is offered about three of its thirteen charters in a game (section 1.5). So the player cannot plan for the deck's own mechanic. Four cards pay the capital production and culture for a count: this card, The Astronomical Diaries, The Sum of Knowledge and The Republic of Letters. This one can do a better job. With it seated, every hand shows a charter beside its three cards, and the seat still takes one card.
- **Arithmetic:** Seated at draft 6, it is there for about twenty more hands. Tiers I to III hold twelve charters, so the seat is offered every one of them. Each charter it takes costs a pick and a technology. The card pays no yield: its worth is the charters.
- **Synergy:** **Raises:** charters offered, and so charter technologies known. **Reads:** the charters left in the seat's tiers, in both its decks (Expansionist holds eight). It feeds the Alchemists' Charter (+1 strength for each charter technology), The Great Catalogue, The Royal Charter Commission, and The Secret Arts (no rival can learn a charter technology).
- **Shape:** Small extension: `offerRider` on the Order offer exists (the wonder The Oracle adds one card). The extra card needs a filter that makes it a charter.
- **Confidence:** good
- **Depends, joins and notes:** It joins change 54. The split of 2026-10-20 gives rules about hands to Magisterial. I think a card that deals this deck's own keyword stays inside the deck. Say if you want it shared with Magisterial.

### 19. Tier I rarities (move)

- **Tier, rarity, type:** I, four cards, all
- **Now:** The Librarians' Charter is rare. The Bronze-Founders' Charter, The Edge of the Sword and The Secret Arts are uncommon.
- **Proposed:** The Librarians' Charter becomes uncommon. The Bronze-Founders' Charter and The Edge of the Sword become common. The Secret Arts becomes rare.
- **Why:** With two rares and ten uncommons, each rare is seen more often than each uncommon. The Mouseion is the deck's supply of scholars and the first building of the institutions theme, so the seat should see it. The Secret Arts pays every town for a lead, and each charter technology adds to that lead for good. It is a card to build round.
- **Arithmetic:** Today: each common is the deck's card in 8.6% of hands, each uncommon in 3%, each rare in 5%. After the pass Tier I holds 8 commons at 7.5%, 9 uncommons at 3.3% and 3 rares at 3.3%.
- **Synergy:** The Secret Arts reads the lead, which the star chart shows. The Edge of the Sword keeps your text of 2026-10-21.
- **Shape:** No shape change. Four rarities.
- **Confidence:** good

**Tier II**

### 20. The Old Academy (move)

- **Tier, rarity, type:** I to II, uncommon to common, Economic
- **Now:** Tier I, uncommon: Academies gain +3 food and +3 production.
- **Proposed:** Tier II, common, the same text.
- **Why:** Great people open at about turn 55, and Tier II opens at about turn 70 for a median seat. So a seat that drafts this card in Tier I waits twenty turns or more for its first Academy. In Tier II it pays at once.
- **Arithmetic:** An Academy yields 3 science today, and 4 under the great-people pass. With the card the hex yields 10, as much as the best farm. The Nizamiyya makes it 15.
- **Synergy:** **Raises:** food and production on a hex. **Reads:** Academies. Multiplied by The Nizamiyya and the Doctrine The Pandidakterion. It holds the food and production that The Quiet Faculties paid (change 23).
- **Shape:** No shape change. `band` 1 to 2, rarity to common.
- **Confidence:** good

### 21. The Lecture Halls (was The Founding Gift) (rework)

- **Tier, rarity, type:** I to II, uncommon, Economic to Civic
- **Now:** Tier I: A great scholar who founds an Academy also grants its town 150 production.
- **Proposed:** Tier II: An Academy gains +2 science for each science building in its town.
- **Why:** 150 production three or four times in a game is a one-off that the player does not notice. The new card ties the deck's two oldest themes together, the schools and the Academies. The town with every school is the town to plant in. The science is on the Academy's hex, so The Nizamiyya and the Doctrine The Pandidakterion multiply it.
- **Its science rides on:** The map and buildings: an Academy's hex, counted by the schools of its town. It does not ride on population.
- **Arithmetic:** A town with a Library and a Scriptorium: +4 science on each Academy. A town with a Library, a University, a Scriptorium and a Printing House in age 4: +8 on each, +12 with The Nizamiyya, and twice that with The Pandidakterion. Two Academies in such a town: +16 to +48 science. The Tier II bar is 35 to 60.
- **Synergy:** **Raises:** science on a hex. **Reads:** Academies and the science buildings of their town. Fed by The Royal Tutors, Commission: The Old Learning (change 17), The Invitations, the Paper-Makers' Charter and The Forward Plans. Multiplied by The Nizamiyya, The Pandidakterion and Hypatia's legacy.
- **Shape:** Small extension: a hex row that counts the buildings of its town. The Commerce build adds it for The Patrons' Quarter.
- **Confidence:** good

### 22. The Latin Quarter (rework)

- **Tier, rarity, type:** II, common to uncommon, Civic
- **Now:** Great-person works beside an Academy gain +2 culture and +1 production.
- **Proposed:** Hexes on or beside an Academy gain +2 science and +1 culture.
- **Why:** The present card needs two works side by side, and a seat holds three or four works at turn 100. You changed Magisterial's The Processional Way for that reason. A quarter is the streets round the school. Now one Academy is enough, and the player plants it where a town can work the six hexes round it.
- **Its science rides on:** The map: the hexes round an Academy, when a town works them. It does not ride on population.
- **Arithmetic:** An Academy and four worked hexes beside it: +10 science and +5 culture. All seven worked: +14 and +7. Two Academies: about +25 science and +12 culture, the low half of the Tier II bar (35 to 60). You approved Commerce's The Bonded Warehouses at +2 and +2 on the same seven hexes.
- **Synergy:** **Raises:** science and culture on hexes. **Reads:** Academies. With the Doctrine The Platonic Academy every work is an Academy. Magisterial's The Processional Way pays hexes beside two works, so the pair wants its works close together.
- **Shape:** Existing shape: `pays` on a hex with the tile tests `improvement` and `beside`. The row has both today.
- **Confidence:** good

### 23. The Quiet Faculties (cut)

- **Tier, rarity, type:** II, rare, Economic
- **Now:** Towns working an Academy gain +25% food and +20% production.
- **Proposed:** Cut. The row is retired.
- **Why:** After the pass Tier II holds five cards for Academies. This one and The Old Academy both pay food and production. The Old Academy pays on the hex, where the doublers reach it. This card is a percentage in one to three towns, and it is a rare.
- **Arithmetic:** An Academy town that makes 40 food and 30 production gains +10 and +6. The uncommon The Round City pays every town of the empire.
- **Synergy:** The Old Academy (change 20) keeps the job.
- **Shape:** `retired: true`.
- **Confidence:** good

### 24. Enduring Institutions (rework)

- **Tier, rarity, type:** II, uncommon to common, Economic to Civic
- **Now:** Towns with an empire building gain +20% production.
- **Proposed:** Each empire building gives its town +5 science.
- **Why:** Three cards pay production for empire buildings: this one, The Royal Estates and The Royal Academies. None pays science, and the deck has no science card after Tier II today. An empire building is one to a realm, so the seat must choose to build it. That is science from a deed.
- **Its science rides on:** Buildings: empire buildings, a flat sum. It does not ride on population.
- **Arithmetic:** Four empire buildings at turn 80: +20 science, where the median bot seat makes 85. Ten in age 4: +50. With The Second Seat or the Doctrine The Mustansiriya a second copy pays again.
- **Synergy:** **Raises:** science. **Reads:** empire buildings. Fed by the Librarians', Physicians' and Printers' Charters, The Second Seat (change 37) and the Doctrine The Academy of Gondishapur, which adds +15% science in the same towns.
- **Shape:** Existing shape: `pays` in a city, basis count, the empire buildings of the town. The Royal Estates has it.
- **Confidence:** good

### 25. The Translation Movement (rework)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Technologies that an empire you have met already knows cost you 20% less research.
- **Proposed:** Technologies of an age before your newest cost you a third less research.
- **Why:** The present card pays a seat for being behind, and a Scientific seat is seldom behind. The new line reads the seat's own chart. It gives the player a plan: go deep to the next age, then learn the old age cheaply. The translators of Baghdad did that with the Greek books.
- **Arithmetic:** The second age costs 1,350 science in all and the third 10,440. A seat that enters age 4 with half of age 3 unlearned saves about 1,700 science, which is one technology. A seat that never leaves a technology behind saves nothing.
- **Synergy:** **Reads:** the age of each technology left. It joins The Reform of the Calendar (change 16), The Armoury Patterns (26) and The City Architects (27): all three pay a seat that enters an age early. It helps Commission: The Old Learning (17).
- **Shape:** Small extension: the rule `techPrice` (the Doctrine The Court of Rudolf II has it) with a selector "an age below the seat's newest".
- **Confidence:** good
- **Depends, joins and notes:** The rule `gapTechCost` then has no live card.

### 26. The Armoury Patterns (rework)

- **Tier, rarity, type:** II, common, Military
- **Now:** Towns build units of the newest age you know 25% faster.
- **Proposed:** Your units of the newest age you know gain +4 strength.
- **Why:** This is what a technology lead buys in this game: an army one age newer. Today three Orders and a Doctrine pay for that lead only against an empire that knows less, so they pay nothing while the seat is level. This card reads the seat's own tree. Units upgrade when their technology lands, so the card asks the player to research the army's technologies first in each age.
- **Arithmetic:** +4 is 12% of a second-age unit (30 to 35) and 8% of a third-age unit (42 to 50). Tier II's bar is +5 regular and +8 strong. It is under the regular line because the step to a new age already adds 10 to 15 strength.
- **Synergy:** **Raises:** strength. **Reads:** the age of each unit. Fed by research upgrades, The Model Army (change 35) and The Prototype Works (31). It adds to The War Manuals, the charter traits and the Tophane.
- **Shape:** Small extension: the unit filter `newestAge`, which the row has on a production bonus, on a `combatLine`.
- **Confidence:** good

### 27. The City Architects (rework)

- **Tier, rarity, type:** II, common, Economic
- **Now:** Towns of at least eight citizens build wonders 25% faster.
- **Proposed:** Towns build the buildings and wonders of the newest age you know 30% faster.
- **Why:** Your direction of 2026-10-20 says that Scientific "gets earlier access" to wonders. No card gives that since The Great Designs was cut. This card gives the seat that reaches an age first a head start on everything in it, and it reads no rival. It is the peace half of change 26.
- **Arithmetic:** A third-age wonder costs 501 to 860 hammers: the card saves 115 to 200. A University costs 520: it saves 120. A town that makes 30 production builds the newest things as if it made 39.
- **Synergy:** **Raises:** production toward new buildings and wonders. **Reads:** the age of the row. It joins changes 16 and 25. It adds to The Free Cities (+20%), the shared The House of Wisdom and Magisterial's The Cornerstone. It feeds The Apprentices, The Dedications and The Lodge Books (65).
- **Shape:** Small extension: the `newestAge` filter on a production bonus for buildings and wonders. `buildingTechAge` gives the age of a row.
- **Confidence:** good
- **Depends, joins and notes:** The card no longer reads town size.

### 28. The Printers' Charter (rework)

- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Opens Printing, which unlocks the Aldine Press: +2 culture and +1 trade route.
- **Proposed:** Opens Printing: +1 trade route, and you may build the Aldine Press, one in your empire: +1 culture for each technology you know.
- **Why:** 650 science and a building for +2 culture is the weakest charter in the deck. A press prints what the realm knows. As an empire building it also joins the institutions.
- **Arithmetic:** 28 technologies at turn 100: +28 culture, where a bot seat makes 50 to 170. 45 late: +45. The building costs 303 hammers. Printing costs 650 science, and 325 under change 53.
- **Synergy:** **Raises:** culture, empire buildings, trade routes. **Reads:** technologies known. As an empire building it is read by The Royal Estates, Enduring Institutions (change 24), The Royal Academies and The Invitations, which grants a scholar when it is built. The route serves a Commerce partner and Cleopatra's Books from the Ships.
- **Shape:** Data on the building row: `oncePerEmpire`, and `pays` with basis count `techsKnown`.
- **Confidence:** good

### 29. The Alfonsine Tables (new)

- **Tier, rarity, type:** II, rare, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: complete the technology you are researching. Your towns make 30% less science for fifteen turns.
- **Why:** The deck has no boon and no card with a risk. Alfonso X of Castile paid a house of astronomers for ten years to make new tables of the stars. The card is a loan of science. The player chooses what to aim at before they take it: the most expensive technology they can research.
- **Arithmetic:** At the start of Tier II a median bot seat makes about 85 science, and its most expensive open technology costs 650 to 1,150. So the boon is worth 8 to 13 turns of science at once. The cost is 30% of fifteen turns, about 4.5 turns. Late in the tier: 180 science a turn and a technology of 1,960, 11 turns for 4.5. If the technology is nearly finished, the card is a loss.
- **Synergy:** **Raises:** technologies completed, at once. It triggers every card that pays on a technology: The Astronomical Diaries, The Journeymen, The Scholars' Fame, the shared The Royal Patents, and The Reform of the Calendar (change 16) when it is the first of an age. **Reads:** the technology in hand.
- **Shape:** Two small extensions. An on-draft grant "complete the current technology": the wonder The House of Wisdom grants a technology when it is finished. A boon that hangs a timed effect on the player: the Commerce build adds it for Letters of Credit.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. You ruled in the Commerce pass that a boon may carry a timed drawback.

### 30. The Summa (new)

- **Tier, rarity, type:** II, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** A great scholar's treatise completes the technology you are researching.
- **Why:** A treatise is 8 turns of science. So it is worth less after a cut to science, and most to the seat that is already ahead. This card makes it worth one technology, whatever the technology costs. It gives the scholar's choice a new side: an Academy for the land, or the most expensive technology on the chart, now.
- **Arithmetic:** A treatise at turn 100 is about 1,400 science for a median bot seat (8 times 179). A third-age technology costs 360 to 1,150, so there the card adds little. It matters for the large ones: 1,960 to 5,150 in age 4, and Alchemy at 8,000, which is 18 turns for a seat that makes 440. A seat calls 2 or 3 great people an age, and not all are scholars.
- **Synergy:** **Raises:** technologies completed. **Reads:** treatises (the moment `greatPersonAct`). Fed by The Royal Tutors, The Scholars' Fame, Commission: The Old Learning, The Royal Charter Commission, The Invitations and Sejong's kit. It feeds every card that pays on a technology, and The Closed Book (change 41).
- **Shape:** Small extension: the scholar's act pays at least what the current technology still needs.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. With The Collected Works (change 39) one scholar finishes two technologies.

### 31. The Prototype Works (move)

- **Tier, rarity, type:** IV to II, rare, Economic
- **Now:** Tier IV: You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted.
- **Proposed:** Tier II: You may build the buildings and train the units of the technology you are researching, at one and a half times their production cost. Wonders are excepted.
- **Why:** At Tier IV almost nothing is left to research. At Tier II the card puts the seat one technology ahead in what it fields, for a price, for the rest of the game. It also makes the choice of research matter each turn: the technology under study is the one whose rows are open.
- **Arithmetic:** A Legionary costs 81 hammers and 122 with the card, while the seat still trains Swordsmen at 46. An Aqueduct costs 265, and 398 with the card. Double (530) is too much for a town that makes 15.
- **Synergy:** **Reads:** the technology in hand. It feeds The Armoury Patterns (change 26): a unit of the next age is of the newest age the day its technology lands. It joins The City Architects (27).
- **Shape:** No shape change. `band` 4 to 2, and the rule's price from 200 to 150.
- **Confidence:** speculative
- **Depends, joins and notes:** On 2026-10-21 you ruled that charters do not open units early, because "the jump from one age of units to the next is too high". This card opens them one technology early at a price. If that is still too much, keep the price at double.

### 32. Tier II rarities (move)

- **Tier, rarity, type:** II, six cards, all
- **Now:** The Mechanists' Charter is rare. The Paper-Makers' Charter, The Physicians' Charter, The Palace Schools, The Strategikon and The Roll of Scholars are uncommon.
- **Proposed:** The Mechanists' Charter becomes uncommon. The other five become common.
- **Why:** Tier II holds 3 commons and 11 uncommons, so each common is seen seven times as often as each uncommon. The three commons are The Latin Quarter, The City Architects and The Armoury Patterns. The five cards that move are plain and useful to most seats, which is what a common is.
- **Arithmetic:** Today: each common is the deck's card in 20% of hands, each uncommon in 2.7%, each rare in 3.3%. After the pass Tier II holds 9 commons at 6.7%, 7 uncommons at 4.3% and 4 rares at 2.5%.
- **Synergy:** No card changes its text here.
- **Shape:** No shape change. Six rarities.
- **Confidence:** good

**Tier III**

### 33. The Age of Reason (rework)

- **Tier, rarity, type:** III, rare, Wildcard
- **Now:** Your Orders count each technology you complete twice.
- **Proposed:** Cards that pay when you complete a technology pay twice.
- **Why:** The game already does this. The rule doubles the riders as well as the counters (`techCountsFor` has both readers). The text does not say so, and a player reads "count" as the scaler alone. The new words match The Double Entry, which you approved for Commerce.
- **Arithmetic:** With The Journeymen, The Astronomical Diaries and The Scholars' Fame seated, each technology pays 72 production in a town of twelve, +2 and +2 on the Diaries, and renown equal to a tenth of its cost. With the shared The Royal Patents: 600 gold for each technology in age 3.
- **Synergy:** **Reads:** every card that pays on a technology: The Royal Workshops, The Astronomical Diaries, The Scholars' Fame, The Journeymen, The Royal Patents. The deeds that complete a technology (changes 29, 30, 65, 66) make the moment come more often.
- **Shape:** Wording only. The data row does not change.
- **Confidence:** strong

### 34. The Humanists (rework)

- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Cities with a University gain culture equal to half their base science.
- **Proposed:** Towns with a Library gain culture equal to a quarter of their science.
- **Why:** In the three bot games I ran, four seats of eighteen held a University at the last reading of their game (turns 100, 120 and 140). So the card paid nothing for most seats. A Library is in every town.
- **Arithmetic:** A seat that makes 179 science at turn 100 gains about +45 culture, and a leading seat with 600 gains +150. The Tier III bar is 60 to 120. Today most seats gain nothing.
- **Synergy:** **Raises:** culture. **Reads:** the science of Library towns. Magisterial's The Learned Patron is the mirror (science equal to 30% of culture in Amphitheater towns). For the builder to check: that the two read base figures and do not feed each other.
- **Shape:** Existing shape: `pays` in a city, basis share, with the scope changed to a Library and the share to 25.
- **Confidence:** good
- **Depends, joins and notes:** The card reads science, so a cut to passive science makes it smaller.

### 35. The Model Army (buff)

- **Tier, rarity, type:** III, rare to uncommon, Military
- **Now:** Research upgrades your units even when you lack the strategic resource the new unit needs.
- **Proposed:** Research upgrades your units even when you lack the strategic resource the new unit needs, and an upgrade heals the unit.
- **Why:** Commerce's Foreign Procurement does this job for bought units, and that pass made it a common. The rule that heals a unit on its upgrade is built (`upgradeHeals`) and has had no card since The Field Refits was cut.
- **Arithmetic:** A seat with no iron keeps Swordsmen while its rivals field Legionaries. With the card its whole line upgrades. The heal: a technology that lands during a war restores every unit of that line.
- **Synergy:** **Reads:** research upgrades. It feeds The Armoury Patterns (change 26) and the Doctrine The Nassau Reforms (58). A treatise or The Alfonsine Tables can land the upgrade on the turn the player chooses.
- **Shape:** Existing shapes: the rules `upgradeIgnoresResource` and `upgradeHeals`.
- **Confidence:** good

### 36. The Gunfounders' Charter (buff)

- **Tier, rarity, type:** III, uncommon, Military (Charter)
- **Now:** Opens Gunfounding, which unlocks the Tophane: its town builds military units 25% faster, with +4 strength.
- **Proposed:** Opens Gunfounding, which unlocks the Tophane: its town builds military units 50% faster, with +6 strength.
- **Why:** The seat pays 3,250 science and 681 hammers for a bonus in one town. Mehmed's seat should want this charter, and today it does not pay its price.
- **Arithmetic:** +6 is 8% to 13% of a fourth-age unit (45 to 80). A town with 60 production trains units as if it made 90. Gunfounding costs 3,250 science, and 1,625 under change 53.
- **Synergy:** **Raises:** strong units from one town. **Reads:** the Tophane, an empire building. It adds to The Palace Schools (+4 in a town with an empire building, so +10 here) and The Armoury Patterns.
- **Shape:** Data on the building row `tophane`.
- **Confidence:** speculative
- **Depends, joins and notes:** You set +4 on 2026-10-21. A charter technology cost half again at that time. If you keep +4, raise only the speed.

### 37. The Second Seat (buff)

- **Tier, rarity, type:** III, rare, Civic
- **Now:** You may build one second copy of an empire building, in a city with a University.
- **Proposed:** You may build one second copy of an empire building, in a city with a Library.
- **Why:** You wrote of this card: "love this one". It needs a University, and in the three bot games four seats of eighteen held one at the last reading of their game. A University costs 520 hammers and needs a fourth-age technology of 1,960 science. So the card is often dead when it is dealt.
- **Arithmetic:** A second Forum, High Temple or Bourse in a second town. With The Royal Estates, Enduring Institutions and The Royal Academies the copy is worth +3 food, +3 production, +5 science, and +5% production and culture for the empire.
- **Synergy:** **Raises:** empire buildings. **Reads:** a Library. It feeds every card of the institutions theme, and The Invitations grants a scholar for the copy.
- **Shape:** Existing shape. The scope of the rule changes from a University to a Library.
- **Confidence:** speculative
- **Depends, joins and notes:** Bots are slow to build Universities. In your own games you may hold several by Tier III. If so, reject this.

### 38. The Proving Ground (cut)

- **Tier, rarity, type:** III, uncommon, Military
- **Now:** Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8.
- **Proposed:** Cut. The row is retired.
- **Why:** Three Orders and a Doctrine read the lead. This one pays most to the seat that is already furthest ahead. After the pass The Armoury Patterns and the Alchemists' Charter pay the army for the seat's own tree.
- **Arithmetic:** A seat that leads by three technologies gains +3. The Alchemists' Charter gives +4 to +6 to the warrior line once the seat sees its charters, and The Armoury Patterns gives +4 to every unit of the newest age.
- **Synergy:** The lead keeps The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** Question 1.

### 39. The Collected Works (new)

- **Tier, rarity, type:** III, rare, Civic
- **Now:** Not in the deck.
- **Proposed:** Your great scholars may act twice.
- **Why:** You approved this line for great merchants in Commerce (The Company of the Staple). For a scholar it ends the choice between the treatise and the Academy: they write and then they found, or they write twice. It is the capstone for a seat that calls many scholars, which is Sejong's way to play.
- **Arithmetic:** A second treatise at turn 120 is 8 turns of science, about 2,000 for a median bot seat. A second Academy is 4 science and what the deck's cards put on it, about 15 to 25 a turn. With The Summa a scholar finishes two technologies.
- **Synergy:** **Raises:** treatises and Academies. **Reads:** great scholars. Fed by every way to gain a scholar: The Royal Tutors, The Scholars' Fame, The Invitations, the commissions, The Invisible College (change 51). It feeds The Summa, The Lecture Halls, The Latin Quarter, The Republic of Letters (44) and Commission: The Lynx-Eyed Academy (43).
- **Shape:** The Commerce build's new shape, "a great person of one family acts twice", with the family scholar.
- **Confidence:** good

### 40. The Foundation Stone (move)

- **Tier, rarity, type:** IV to III, rare, Economic
- **Now:** Tier IV: You may begin the Magnum Opus once Alchemy is half researched.
- **Proposed:** Tier III, the same text.
- **Why:** In the three bot games the median seat held 18 to 24 drafts when the game ended, and Tier IV opens at 26. The leading seats reached Tier IV three technologies from Alchemy. So the card is dealt after its moment. The first empire to learn Alchemy opens the Magnum Opus for every empire. This card and The Closed Book are the only things that turn a lead into a head start.
- **Arithmetic:** Alchemy costs 8,000 science, and half is 4,000. A seat that makes 440 science begins the Opus nine turns early. The Opus costs about 2,535 hammers.
- **Synergy:** **Reads:** the science banked toward Alchemy. It joins The Closed Book (change 41) and The Great Instrument (42). The Summa and The Alfonsine Tables then finish Alchemy on the turn the player chooses.
- **Shape:** No shape change. `band` 4 to 3.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

### 41. The Closed Book (move)

- **Tier, rarity, type:** IV to III, rare to uncommon, Civic
- **Now:** Tier IV, rare: If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns.
- **Proposed:** Tier III, uncommon, the same text.
- **Why:** The reason of change 40. It also becomes uncommon, because each Tier IV rare is the deck's card in one hand in seventy, and this is the card that makes the last technology a race.
- **Arithmetic:** Ten turns of a town that makes 150 production are 1,500 hammers of the Opus's 2,535.
- **Synergy:** **Reads:** Alchemy, first. Fed by every card that speeds research and by the deeds that complete a technology.
- **Shape:** No shape change. `band` 4 to 3, rarity to uncommon.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

### 42. The Great Instrument (move)

- **Tier, rarity, type:** IV to III, rare to uncommon, Wildcard
- **Now:** Tier IV, rare: Goal: complete Alchemy. Reward: a tenth of the Magnum Opus.
- **Proposed:** Tier III, uncommon: Goal: complete Alchemy. Reward: a fifth of the Magnum Opus.
- **Why:** The game does not deal this card to a seat that knows Alchemy. At Tier IV a leading seat knows it or is about to. A tenth of the Opus is 254 hammers, less than one fourth-age unit.
- **Arithmetic:** A fifth is about 507 hammers. That is under the Tier III lump bar of 1,000, but it lands on the first turn of the race.
- **Synergy:** **Reads:** Alchemy completed. It joins changes 40 and 41.
- **Shape:** No shape change. `band` 4 to 3, the reward's share from 0.1 to 0.2.
- **Confidence:** good
- **Depends, joins and notes:** Question 3.

### 43. Commission: The Lynx-Eyed Academy (rework)

- **Tier, rarity, type:** IV to III, rare to uncommon, Wildcard
- **Now:** Tier IV, rare: Goal: hold four Academies. Reward: a great scholar, and 300 production in each town with an Academy.
- **Proposed:** Tier III, uncommon: Goal: hold three Academies. Reward: a great scholar, and Academies gain +5 science and +5 culture.
- **Why:** A one-off does not register: 1,200 production at the end of the game, when a unit costs 400 to 580. A lasting reward on the Academy is multiplied by the cards that multiply Academies. Three Academies is what a seat that plants every scholar holds in Tier III.
- **Its science rides on:** The map: Academies. It does not ride on population.
- **Arithmetic:** Four Academies after the reward: +20 science and +20 culture, and +30 and +30 with The Nizamiyya.
- **Synergy:** **Raises:** great scholars, science and culture on a hex. **Reads:** Academies held. Fed by The Collected Works (change 39) and the Doctrine The Platonic Academy.
- **Shape:** Existing shapes: the goal figure `academyHexes` at 3, and a `lasting` hex row as the reward.
- **Confidence:** good

### 44. The Republic of Letters (rework)

- **Tier, rarity, type:** IV to III, uncommon, Civic
- **Now:** Tier IV: Your capital gains +4 production and +4 culture for each Academy you hold.
- **Proposed:** Tier III: Every town gains +2 science and +2 culture for each Academy you hold.
- **Why:** Your picture of the deck names this card: "gain X from each academy in your land". Today four cards pay the capital production and culture for a count. A republic of letters reaches every town.
- **Its science rides on:** The map: Academies held, paid in every town. It grows with the number of towns, not with citizens.
- **Arithmetic:** Three Academies and eight towns: +48 science and +48 culture, 96 a turn, inside the Tier III bar (60 to 120). Four Academies and twelve towns: +96 and +96. Today: +12 and +12.
- **Synergy:** **Raises:** science and culture in every town. **Reads:** Academies held. Fed by every scholar, The Collected Works and The Platonic Academy.
- **Shape:** Existing shape: `pays` in every city, basis count. The count "Academies in the empire" exists as the commission figure `academyHexes`.
- **Confidence:** good

### 45. The Military Engineers' Charter (move)

- **Tier, rarity, type:** IV to III, uncommon to common, Military (Charter)
- **Now:** Tier IV, uncommon: Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points.
- **Proposed:** Tier III, common, the same text.
- **Why:** A fortress is a thing to build before the war, and the war for the Opus comes in Tier III.
- **Arithmetic:** Military Architecture costs 3,250 science, and 1,625 under change 53. A Bastion costs 681 hammers.
- **Synergy:** **Raises:** town defence, charter technologies known. It serves the Alchemists' Charter and The Great Catalogue, which count charter technologies.
- **Shape:** No shape change. `band` 4 to 3, rarity to common.
- **Confidence:** good

### 46. The Naval Gunners' Charter (cut)

- **Tier, rarity, type:** IV, uncommon, Military (Charter)
- **Now:** Opens Naval Gunnery: your Gun Galleys gain +3 strength and may blockade a rival's port.
- **Proposed:** Cut. The row is retired.
- **Why:** Naval Gunnery stands in Alchemy's column and costs 8,000 science: 18 turns of research for +3 strength on one kind of ship and a blockade. It is the fourth army charter, and it needs a coast.
- **Arithmetic:** 8,000 science is the price of Alchemy. At half price it is still the price of two fourth-age technologies.
- **Synergy:** No card reads Gun Galleys.
- **Shape:** `retired: true` on the card. The technology row stays for saves.
- **Confidence:** good
- **Depends, joins and notes:** The other choice: move it to Tier III and place Naval Gunnery at 3,250. Commerce now has fifteen sea cards, so Cleopatra's seat could want it.

### 47. Tier III rarities (move)

- **Tier, rarity, type:** III, one card, Civic
- **Now:** The Nizamiyya is uncommon. Tier III holds 2 commons, 6 uncommons and 4 rares.
- **Proposed:** The Nizamiyya becomes common. With the other changes Tier III holds 5 commons, 8 uncommons and 5 rares.
- **Why:** Tier III has two commons, The Journeymen and The Doctorate, and each is the deck's card in three hands of ten. "Academies yield 50% more" is a plain multiplier on a thing the seat has, which is what a common is.
- **Arithmetic:** Today: each common 30% of hands, each uncommon 5%, each rare 2.5%. After the pass: each common 12%, each uncommon 3.75%, each rare 2%.
- **Synergy:** No card changes its text here.
- **Shape:** No shape change. One rarity.
- **Confidence:** good

**Tier IV**

### 48. The Sum of Knowledge (rework)

- **Tier, rarity, type:** IV, rare to uncommon, Civic to Economic
- **Now:** Your capital gains +1 production and +1 culture for each technology you know.
- **Proposed:** The town raising your Magnum Opus gains +2 production for each technology you know.
- **Why:** The Astronomical Diaries counts the same technologies from Tier I and pays the same two yields in the same town. At Tier IV this card pays +50 and +50, which is the size of Magisterial's Tier 0 rare The Twelve Tables. The end of the game is the Opus, so the count goes there.
- **Arithmetic:** 50 technologies: +100 production toward an Opus of about 2,535 hammers. The generic The Grand Design pays about 75. With The Great Catalogue at +40%: 140.
- **Synergy:** **Raises:** production toward the Opus. **Reads:** technologies known, charter technologies included.
- **Shape:** Existing shapes: `pays` with basis count `techsKnown`, in the town that raises the Opus (The Grand Design has that scope).
- **Confidence:** good

### 49. The Walls of Learning (cut)

- **Tier, rarity, type:** IV, common, Military
- **Now:** Towns with a University gain +6 defence.
- **Proposed:** Cut. The row is retired.
- **Why:** It is the only common of Tier IV, so it is the deck's card in three hands of five. It pays +6 defence in towns with a University, which few seats hold. The generic City Watches gives +8 defence to every town.
- **Arithmetic:** +6 defence on a town of strength 60 to 80.
- **Synergy:** Nothing reads it. The Doctrine The Trace Italienne (change 63) holds the defence of the Opus.
- **Shape:** `retired: true`.
- **Confidence:** strong

### 50. The Laboratories (new)

- **Tier, rarity, type:** IV, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Science buildings give +2 production.
- **Why:** Tier IV needs a common that a seat is glad to see. After Alchemy science has no use, and the schools are the seat's largest set of buildings. This turns them toward the Opus and the last army.
- **Arithmetic:** Three science buildings in each of ten towns: +60 production, the low end of the Tier IV bar (60 to 120). The production is on each building, so The Universitas doubles it in the big towns.
- **Synergy:** **Raises:** production. **Reads:** science buildings. Fed by the Paper-Makers' Charter, The Forward Plans and The Founders' Schools.
- **Shape:** Existing shape: `pays` in a city, basis count, buildings of the science category. Commerce's The Cloth Halls is the same line for gold buildings.
- **Confidence:** good

### 51. The Invisible College (new)

- **Tier, rarity, type:** IV, rare, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: choose two great scholars.
- **Why:** Magisterial's The Nine Jewels gives two free great-person drafts. This is the deck's own form: two scholars at the time of Alchemy. The Invisible College was the circle of English scholars that became the Royal Society.
- **Arithmetic:** Two treatises are 16 turns of science, about 7,000 for a seat that makes 440, where Alchemy costs 8,000. With The Summa they are two technologies. A seat that will not finish the tree plants two Academies.
- **Synergy:** **Raises:** great scholars. It feeds The Summa, The Collected Works, The Republic of Letters, The Roll of Scholars and The Doctorate, and it triggers the leaders' lines that count great people.
- **Shape:** Existing shape: the on-draft grant `greatPerson` with the family scholar, twice.
- **Confidence:** good

### 52. The Great Catalogue (move)

- **Tier, rarity, type:** IV, rare to common, Economic
- **Now:** Rare: +10% production toward the Magnum Opus for each charter technology you know, at most +40%.
- **Proposed:** Common, the same text.
- **Why:** Tier IV holds seven rares today, and each is the deck's card in one hand in seventy. This card is the pay-off for the charters, and the seat that took four of them should see it.
- **Arithmetic:** A seat is offered about three charters today, so the card pays +10% to +30%. With changes 18 and 54 a seat knows four to six charter technologies: +40%.
- **Synergy:** **Reads:** charter technologies known. Fed by every charter and by The Charter Rolls.
- **Shape:** No shape change. One rarity.
- **Confidence:** good

**Rules**

### 53. A charter technology costs half the price of its column (rule)

- **Tier, rarity, type:** 0 to III, a rule, not a card, the thirteen charters
- **Now:** A charter technology costs the price of its column, as an ordinary technology does (batch DS9). Until 2026-11-11 it cost half again.
- **Proposed:** A charter technology costs half the price of its column.
- **Why:** A charter is dealt when its column is the most expensive the seat can research. So it costs a median seat 5 to 18 turns of all its research (section 1.5), which is about one and a half ordinary technologies. For that the seat gets one building to build or one trait. At half price a charter technology delays the tree by less than one technology. The price list prints the line, as it printed the old premium.
- **Arithmetic:** Herbals 24 to 12. Casting and Astronomy 50 to 25. Surveying and Cataloguing 100 to 50. Optics 190 to 95. Medicine 360 to 180. Papermaking and Printing 650 to 325. Mechanics 1,150 to 575. Gunfounding, Chemistry and Military Architecture 3,250 to 1,625.
- **Synergy:** It makes every charter cheaper, and so it feeds the cards that count charter technologies. Each charter technology is also a technology completed, so it triggers the cards that pay on that moment.
- **Shape:** Small rules change: one line in `explainTechCost`, and a figure in `data/rules.json` where `charterPremiumPercent` stood.
- **Confidence:** good
- **Depends, joins and notes:** Question 4. The other way is to place the fourth-age charter technologies under third-age parents on your chart, which puts them at 1,960.

### 54. A charter is dealt in its own tier and in the next (rule)

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

### 55. The Natural Histories (doctrine)

- **Tier, rarity, type:** I, new Doctrine, learned land
- **Now:** Not in the deck.
- **Proposed:** Each town gains +1 science for each different kind of improvement it works.
- **Why:** Tier I's learned-land Doctrine pays Academies, and the first Academy comes twenty turns later (change 56). This one works from the day the seat takes it. It changes how the seat improves land. A farm, a mine, a pasture, a quarry, a Physic Garden and a star tower are six kinds, so a town wants one of each before it wants a second farm. It has no drawback: the cost is the land the seat does not specialise.
- **Its science rides on:** The map and a choice: the kinds of work a town holds. It does not ride on population.
- **Arithmetic:** A town that works five kinds: +5 science. Five towns at turn 60: +25 science, where the median bot seat makes 26. Ten towns with seven kinds in age 3: +70. The kinds are the farm, mine, quarry, pasture, camp, plantation, fishing boats and lumber mill, the deck's three works, an Academy, and the works of the partner deck.
- **Synergy:** **Raises:** science. **Reads:** the different improvements among a town's worked hexes. Fed by the three charters that open works, by Expansionist's eight charters, and by great-person works.
- **Shape:** New count: the different improvements among a town's worked hexes.
- **Confidence:** good

### 56. The Peripatetic School (doctrine)

- **Tier, rarity, type:** I to II, Doctrine, moved, learned land
- **Now:** Tier I: Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown.
- **Proposed:** Tier II, the same text.
- **Why:** The tier-4 governments offer it at about turn 35, and great people open at about turn 55. A seat that takes it holds no Academy for twenty turns or more.
- **Arithmetic:** One Academy with the Doctrine yields 5 science and 2 production today. Under the great-people pass a work pays 4 and grows to 8, so the hex pays 6 to 10 science.
- **Synergy:** **Reads:** Academies. It adds to The Old Academy, The Lecture Halls and The Latin Quarter, and The Pandidakterion doubles the hex after it.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

### 57. The Jixian Academy (doctrine)

- **Tier, rarity, type:** II, Doctrine, engine
- **Now:** Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture.
- **Proposed:** Completing a technology grants culture equal to a fifth of its cost.
- **Why:** In ages 2 and 3 the two halves are about equal, so the Doctrine does nothing for forty turns after the seat takes it. You removed the penalty from Commerce's The Delian League because it grew late in the game.
- **Arithmetic:** Age 3: a technology of about 700 every three or four turns is +40 culture a turn, and 25% of a seat's 50 to 170 culture is 12 to 42 lost. Age 4: about +250 a turn against 110 lost. Without the penalty it is +40 a turn in age 3 and +250 in age 4, where a seat makes about 440.
- **Synergy:** **Reads:** technologies completed and their cost. The deeds that complete a technology pay it too: Alchemy by a treatise is 1,600 culture.
- **Shape:** Data only: one effect row goes.
- **Confidence:** good
- **Depends, joins and notes:** If +250 a turn in age 4 is too much, make the share a sixth.

### 58. The Nassau Reforms (doctrine)

- **Tier, rarity, type:** IV to II, Doctrine, moved, elite army
- **Now:** Tier IV: Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly.
- **Proposed:** Tier II, the same text.
- **Why:** A unit line upgrades three or four times in a game. The tier-26 governments come after the last upgrade for most lines, so the Doctrine pays nothing when it is offered.
- **Arithmetic:** A Swordsman kept from Tier II becomes a Legionary and then a Longswordsman: +4. An Archer becomes a Bowman, a Composite Bowman and a Crossbowman: +6.
- **Synergy:** **Reads:** research upgrades. It rewards a small army that lives, which is the deck's army. The Model Army (change 35) heals each upgrade.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

### 59. The Volley Fire (doctrine)

- **Tier, rarity, type:** III, Doctrine, elite army
- **Now:** Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength.
- **Proposed:** Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units lose 4 strength.
- **Why:** Your rule of 2026-11-19: no percentages of combat strength. Combat is flat points on one list.
- **Arithmetic:** 10% of a third-age melee unit (42 to 50) is 4 to 5.
- **Synergy:** The first clause does not change. The War Manuals (change 03) gives the archer line +2.
- **Shape:** Existing shape: a negative `combatLine` for the melee class in place of the `unitStat` percentage.
- **Confidence:** strong

### 60. The Mustansiriya (was The Külliye) (doctrine)

- **Tier, rarity, type:** III, Doctrine, renamed, institutions
- **Now:** The Külliye: Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works.
- **Proposed:** The same text, under the name The Mustansiriya.
- **Why:** In the leader pass you named Mehmed's building The Külliye. Two things with one name confuse the Compendium. The Mustansiriya of Baghdad (1227) taught the four schools of law and the sciences in one house.
- **Arithmetic:** No number changes.
- **Synergy:** No change.
- **Shape:** Data only: the name. The id stays.
- **Confidence:** strong
- **Depends, joins and notes:** The other choice is to rename Mehmed's building.

### 61. The Platonic Academy (doctrine)

- **Tier, rarity, type:** IV to III, Doctrine, moved, learned land
- **Now:** Tier IV: Your great people of every family found an Academy as their work, in place of their own.
- **Proposed:** Tier III, the same text.
- **Why:** A seat calls two or three great people an age. At the tier-26 governments one or two are left to come.
- **Arithmetic:** Three more people in Tier III are three more Academies, each worth 15 to 25 a turn with the deck's cards, and each counts for The Republic of Letters and The Lynx-Eyed Academy.
- **Synergy:** **Raises:** Academies. It feeds changes 21, 22, 43 and 44.
- **Shape:** Data only: the Doctrine's tier.
- **Confidence:** good

### 62. The Court of Rudolf II (doctrine)

- **Tier, rarity, type:** IV, Doctrine, reworked, engine
- **Now:** Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more.
- **Proposed:** The town raising your Magnum Opus gains production equal to a tenth of your science.
- **Why:** The tier-26 governments come when a leading seat has three to five technologies left, so a discount on the fourth age saves little. Almost every fourth-age technology leads to Alchemy, so the penalty reaches Prospecting alone. Rudolf's court at Prague kept alchemists to make the Great Work. After Alchemy science has no use in this game. This gives it one, and it is the deck's own way to win.
- **Arithmetic:** A seat with 440 science: +44 production. A leading seat with 1,500 to 2,400: +150 to +240 a turn toward an Opus of about 2,535 hammers. Your ruling of 2026-10-12 puts no cap on bonuses toward the Opus.
- **Synergy:** **Raises:** production toward the Opus. **Reads:** the empire's science. Fed by every science card of the deck.
- **Shape:** Small extension: a share that reads the empire's science rate and pays the town that raises the Opus.
- **Confidence:** good
- **Depends, joins and notes:** It reads science, so a cut to passive science makes it smaller.

### 63. The Trace Italienne (doctrine)

- **Tier, rarity, type:** IV, new Doctrine, elite army
- **Now:** Not in the deck.
- **Proposed:** Your towns gain +10 defence, and your units gain +4 strength inside your borders. Your units lose 4 strength outside them.
- **Why:** With changes 58 and 61 Tier IV holds two Doctrines, and the rule is three to five. The seat that raises the Opus is the seat that every army marches on. The star forts of Italy made a small army safe at home.
- **Arithmetic:** +4 is 5% to 9% of a fourth-age unit, the regular line. The generic City Watches gives +8 defence.
- **Synergy:** **Raises:** defence at home. It joins the Bastion of the Military Engineers' Charter and The Strategikon.
- **Shape:** Existing shapes: `cityStat`, and two `combatLine` rows with `ownTerritory` and `foreignTerritory`.
- **Confidence:** speculative

**Shared cards**

### 64. The Founders' Schools (new)

- **Tier, rarity, type:** I, uncommon, Civic (shared with Expansionist)
- **Now:** Not in the game.
- **Proposed:** Towns you found start with a Library.
- **Why:** The pair shares two cards, The Mountain Observatories and The Assay, and both are about ground. Expansionist's act is to found towns, and this deck's first building is the Library. It is the sister of The Founders' Stores, which you approved for Expansionist and Commerce.
- **Arithmetic:** A Library costs 51 hammers, about ten turns of a new town. Four towns founded after the card: 204 hammers, and each town starts with the Library's science and renown. The Apprentices and The Dedications pay for each one if a granted building counts as finished.
- **Synergy:** **Raises:** Libraries. **Reads:** towns founded, which Expansionist raises (The Land Hunger, The Colonists, The Seed Grain). It feeds The Scribes' Hall, The Almanac and The Royal Tutors.
- **Shape:** Existing shape: `foundingRider` with a building. The technology Colonial Charters has it.
- **Confidence:** good
- **Depends, joins and notes:** For the builder: a town founded before Letters still gets the Library.

### 65. The Lodge Books (new)

- **Tier, rarity, type:** II, rare, Civic (shared with Magisterial)
- **Now:** Not in the game.
- **Proposed:** Completing a wonder completes the technology you are researching.
- **Why:** The pair shares two cards. One of them, The House of Wisdom, is one of four cards that say "production toward wonders". Magisterial raises wonders, and this card pays for them in this deck's way. The masons' lodges kept the geometry of their age in their books.
- **Arithmetic:** A third-age wonder costs 501 to 860 hammers, and a third-age technology costs 360 to 1,150 science. A seat that builds three wonders after the card gains three technologies, about 3,000 to 6,000 science. The player aims the most expensive technology before the wonder lands.
- **Synergy:** **Raises:** technologies completed. **Reads:** wonders completed, which Magisterial raises (The Cornerstone, The Friends of Khufu, The Keepers of Wonders). It triggers every card that pays on a technology, and Magisterial's The Golden Age starts on the same turn.
- **Shape:** Small extension: a rider on `buildingCompletion` for a wonder, with the grant of change 29.
- **Confidence:** good
- **Depends, joins and notes:** Question 2.

### 66. Carried-Off Scholars (rework)

- **Tier, rarity, type:** II, common to uncommon, Civic (shared with Dominion)
- **Now:** Capturing a city grants science equal to ten times its population.
- **Proposed:** Capturing a city grants a technology that its owner knows and you do not. If there is none, it grants science equal to thirty times its population.
- **Why:** A town of eight pays 80 science, when a technology costs 650. Timur carried the scholars of each city he took to Samarkand. Dominion gives up development at home, so it is often behind. This is how its wars close the gap.
- **Arithmetic:** A third-age technology is 360 to 1,150 science, and a fourth-age one is 1,960 to 5,150. A seat that is ahead gains 240 science for a town of eight. Mehmed's own line pays thirty times the population as well.
- **Synergy:** **Raises:** technologies. **Reads:** captures, which Dominion raises, and what the loser knows. It triggers every card that pays on a technology.
- **Shape:** New grant: a technology from the loser's list. `techGap` in `rivals.ts` gives that list. The grant takes the cheapest, so a replay gives the same result.
- **Confidence:** good
- **Depends, joins and notes:** Question 2. The Dominion pass left its shared cards as they were.

### 67. Field Academies (buff)

- **Tier, rarity, type:** I, uncommon, Civic (shared with Dominion)
- **Now:** Your first kill each turn grants 25 science.
- **Proposed:** Your first kill each turn grants 25 science for each age you have reached.
- **Why:** 25 science is a turn of research in age 2 and nothing in age 4. The Commerce pass sized The Royal Patents by the ages reached, and you set its number.
- **Its science rides on:** A deed: kills. It does not ride on population.
- **Arithmetic:** 50 science in age 2, where a bot seat makes 26 to 85. 75 in age 3 and 100 in age 4. A seat at war kills on perhaps one turn in three.
- **Synergy:** **Raises:** science. **Reads:** kills, which Dominion raises, and ages reached.
- **Shape:** The Commerce build's small extension: a rider's grant that counts the ages reached.
- **Confidence:** good

### 68. The Blessed Forges (cut)

- **Tier, rarity, type:** II, uncommon, Civic (shared with Devotion)
- **Now:** Improved strategic resources gain +1 faith and +1 production.
- **Proposed:** Cut. The row is retired.
- **Why:** The pair shares six cards, twice the number you set in the Commerce pass. This one pays in neither deck's way: it pays no science and reads no rite or follower. It reads strategic resources, which the shared The Assay reads.
- **Arithmetic:** Three improved strategic resources: +3 faith and +3 production.
- **Synergy:** Five shared cards stay: The Monastery Libraries, The Schoolmen's Charter, The Priest-Astronomers, The Cloister and The Monastic University.
- **Shape:** `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** It is the Devotion pass's card too. If that pass keeps it, this change falls.

## 6. The deck if every change is approved

| Tier | Today | After | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare | Charters |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 9 | 1 | 3 | 5 | 0 | 6 | 2 | 1 | 1 |
| I | 19 | 20 | 2 | 5 | 12 | 1 | 8 | 9 | 3 | 5 |
| II | 17 | 20 | 4 | 4 | 11 | 1 | 9 | 7 | 4 | 4 |
| III | 12 | 18 | 4 | 3 | 8 | 3 | 5 | 8 | 5 | 3 |
| IV | 12 | 5 | 1 | 3 | 1 | 0 | 2 | 2 | 1 | 0 |
| **All** | 68 | **72** | 12 | 18 | 37 | 5 | 30 | 28 | 14 | 13 |

- 68 cards today. Six are cut and ten are new: 72. Six cards move from Tier IV to Tier III, and The Prototype Works moves to Tier II. The Charter Rolls moves from Tier II to Tier I, The Royal Tutors from Tier 0 to Tier I, and two Academy cards from Tier I to Tier II.
- Keywords: 13 charters, 2 boons (The Alfonsine Tables, The Invisible College), 4 commissions, 1 scaler. 57 cards take a chair, where 55 do today.
- Today the deck holds 20 commons, 32 uncommons and 16 rares. After the pass: 30, 28 and 14.
- **The deck leans Civic:** 37 of 72, where it is 28 of 68 today. The new science cards are Civic by the sorting rule. Of the 37, six are charters and two are boons, which take no chair.
- **Military is thin in Tier I, as it is today:** one card that takes a chair (The Edge of the Sword) and one charter. The War Manuals is seated from Tier 0, and the shared and generic cards fill the War Chief's second Military chair.
- **Tier IV holds five cards on purpose.** A seat that reaches it sees most of them in three or four hands. When the deck has no card left to deal, the hand's position falls back to the seat's whole pool, which is the rule the game has.
- Shared cards: 17 (Dominion 3, Expansionist 3, Commerce 3, Devotion 5, Magisterial 3). Doctrines: 17 (4, 5, 5 and 3), from 15.

**What each card reads, after the changes:**

| What the card reads | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The moment a technology completes | 1 | 2 | 0 | 2 | 0 | 5 |
| A deed that completes a technology | 0 | 0 | 2 | 0 | 0 | 2 |
| The age you are in, and the plan | 0 | 2 | 4 | 0 | 0 | 6 |
| Alchemy and the Magnum Opus | 0 | 0 | 0 | 3 | 3 | 6 |
| A charter: the card opens a charter technology | 1 | 5 | 4 | 3 | 0 | 13 |
| Charters dealt or counted | 0 | 1 | 1 | 0 | 0 | 2 |
| The lead over empires you have met | 0 | 2 | 0 | 0 | 0 | 2 |
| A school: a Library, science buildings | 0 | 5 | 0 | 1 | 1 | 7 |
| An empire building | 0 | 1 | 3 | 2 | 0 | 6 |
| Great scholars and Academies | 0 | 0 | 5 | 5 | 1 | 11 |
| Big towns | 0 | 1 | 1 | 1 | 0 | 3 |
| Towns, public works, any building, Shrines, the capital | 4 | 1 | 0 | 0 | 0 | 5 |
| The map: hexes seen, mines and quarries | 2 | 0 | 0 | 0 | 0 | 2 |
| Units and their upgrades | 1 | 0 | 0 | 1 | 0 | 2 |
| **All** | 9 | 20 | 20 | 18 | 5 | **72** |

- **A school:** 7 of 72 (10%), from 10 of 68 (15%). Tier I holds four cards that read a Library, and The Royal Tutors, where it holds six today.
- **Research:** the first four rows are 19 of 72 (26%), from 12 of 68 (18%). The share is higher, and I say so plainly. The cards now read four different things: the moment, a deed, the age, and Alchemy. Today five of the seven cards outside the Opus read "any technology completed".
- **A building that a town builds once** (a school, an empire building, a charter's building): 20 of 72 (28%), from 23 of 68 (34%).
- **The map** is larger than its row shows. Three charters open works, and five Academy cards and a Doctrine now read hexes.
- **The share that reads a science building or a technology,** counted as in section 1.1: 29 of 72 (40%), the same share as today. With the 13 charters it is 42 of 72 (58%), from 40 of 68 (59%). The deck stays a deck about research. What changes is that the seat does things to earn it.

**How often each card is seen, after the changes:**

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare | A named rare is offered in |
|---|---|---|---|---|---|---|---|
| 0 | 6 | 2 | 1 | 10% | 15% | 10% | 34% of games |
| I | 8 | 9 | 3 | 7.5% | 3.3% | 3.3% | 18% |
| II | 9 | 7 | 4 | 6.7% | 4.3% | 2.5% | 18% |
| III | 5 | 8 | 5 | 12% | 3.75% | 2% | 15% |
| IV | 2 | 2 | 1 | 30% | 15% | 10% | 27% |

- No rare is seen more often than an uncommon of its tier, and no common is the deck's card in more than one hand in eight outside Tier IV.
- The table leaves out change 54, which adds the charters of the tier before to each bag. With it a seat is offered about 5.6 of its 13 charters, where it is offered 3.0 today. With The Charter Rolls seated it is offered every charter of Tiers I to III.
- Tier III's rares are still seen in one game in seven. Five rares is one too many for eight hands. If you want one fewer, The Queen of Cities is the plainest of the five and can be an uncommon.

### Tier 0 (9 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Herbalists' Charter | Opens Herbals: workers may plant one Physic Garden in each town, on flat land with fresh water: +2 science and +2 happiness, and +1 science more for each forest or jungle hex beside it. | common | Civic (Charter) | changed (01) |
| The Royal Workshops | Completing a technology grants 15 production in your capital. | common | Economic | unchanged |
| The Curators of Works | Public works give +1 science and +1 happiness. | common | Civic | unchanged |
| The Scribes | +1 science in every town. | common | Civic | unchanged |
| The Apprentices | Finishing a building grants science equal to a fifth of its production cost. Wonders do not count. | common | Economic | changed (02) |
| The War Manuals | Your ranged units gain +2 strength. | common | Military | changed (03) |
| The Prospectors' Notes | Building a mine or a quarry grants its town 25 production. | uncommon | Economic | unchanged |
| The Clay Map | Your capital gains +1 science for every 100 hexes you have seen. | uncommon | Civic | new (05) |
| The House of Life | Your capital gains science equal to half its production. | rare | Civic | new (06) |

### Tier I (20 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Bronze-Founders' Charter | Opens Casting: your spear and chariot lines gain +2 strength for good. | common | Military (Charter) | common (19) |
| The Scholars' Fame | Completing a technology grants scholar renown equal to a twentieth of its cost. | common | Civic | unchanged |
| The Royal Estates | Each empire building gives its town +3 food and +3 production. | common | Economic | changed (11) |
| The Edge of the Sword | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. | common | Military | common (19) |
| The Scribes' Hall | Libraries give +2 science. | common | Civic | changed (10) |
| The Sky Watchers | Shrines give +1 faith and +2 science. | common | Civic | changed (12) |
| The Almanac | Libraries give +2 production. | common | Economic | unchanged |
| The Royal Tutors | +2 scholar renown each turn for each science building. | common | Civic | moved from Tier 0 (04) |
| The Glassmakers' Charter | Opens Optics, which unlocks the Specularium: +3 food, and +1 science for each farm its town works. | uncommon | Civic (Charter) | changed (09) |
| The Surveyors' Charter | Opens Surveying: you may build the Aqueduct early, and workers may dig one qanat in each town, on flat land beside a hill or a mountain. Every hex within two hexes of a qanat has fresh water. | uncommon | Economic (Charter) | changed (08) |
| The Librarians' Charter | Opens Cataloguing, which unlocks the Mouseion: +4 scholar renown, and +2 culture for each empire building you hold. | uncommon | Civic (Charter) | uncommon (19) |
| The Astronomers' Charter | Opens Astronomy: workers may raise one star tower in each town: +1 science for each hex beside it with nothing built on it. | uncommon | Civic (Charter) | new (07) |
| The Astronomical Diaries | Gains +1 culture and +1 production each time you complete a technology. | uncommon | Civic (Scaler) | unchanged |
| The Dedications | Finishing a science building or an empire building grants culture equal to its production cost. | uncommon | Civic | changed (13) |
| The Free Cities | While you hold at most five towns, your towns build buildings and wonders 20% faster. | uncommon | Economic | unchanged |
| Commission: The Old Learning | Goal: know every technology of the first age. Reward: choose a great scholar. | uncommon | Wildcard | new (17) |
| The Charter Rolls | Your Order hands hold one more card. It is a charter, while your decks have one to deal. | uncommon | Civic | changed, from Tier II (18) |
| The Forward Plans | You may build Universities before you know Scholarship. | rare | Civic | unchanged |
| The Reform of the Calendar | Entering a new age opens an Order draft at once. | rare | Civic | new (16) |
| The Secret Arts | Each town gains +1 production for each technology you know that no empire you have met knows, charter technologies included, at most +5. | rare | Economic | rare (19) |

### Tier II (20 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Paper-Makers' Charter | Opens Papermaking, which unlocks the Scriptorium: +2 science, and +10% science beside an Academy. | common | Civic (Charter) | common (32) |
| The Physicians' Charter | Opens Medicine, which unlocks the Bimaristan: +25% food in its town. | common | Economic (Charter) | common (32) |
| Enduring Institutions | Each empire building gives its town +5 science. | common | Civic | changed (24) |
| The Roll of Scholars | +4% production and culture for each great scholar you have gained this game, at most +28%. | common | Civic | common (32) |
| The Palace Schools | Units gained in a town with an empire building start with +4 strength. | common | Military | common (32) |
| The City Architects | Towns build the buildings and wonders of the newest age you know 30% faster. | common | Economic | changed (27) |
| The Strategikon | Your units gain +4 strength within two hexes of an Academy. | common | Military | common (32) |
| The Armoury Patterns | Your units of the newest age you know gain +4 strength. | common | Military | changed (26) |
| The Old Academy | Academies gain +3 food and +3 production. | common | Economic | moved from Tier I (20) |
| The Mechanists' Charter | Opens Mechanics: catapults gain +1 range, and your archer line may move after it shoots. | uncommon | Military (Charter) | uncommon (32) |
| The Printers' Charter | Opens Printing: +1 trade route, and you may build the Aldine Press, one in your empire: +1 culture for each technology you know. | uncommon | Civic (Charter) | changed (28) |
| The Royal Charter Commission | Goal: complete a charter technology. Reward: a great scholar and 100 culture. | uncommon | Wildcard | unchanged |
| The Translation Movement | Technologies of an age before your newest cost you a third less research. | uncommon | Civic | changed (25) |
| The Latin Quarter | Hexes on or beside an Academy gain +2 science and +1 culture. | uncommon | Civic | changed (22) |
| The Round City | +1% production and culture for each citizen in your capital, at most +30%. | uncommon | Civic | unchanged |
| The Lecture Halls | An Academy gains +2 science for each science building in its town. | uncommon | Civic | changed, was The Founding Gift (21) |
| The Invitations | Completing an empire building grants a great scholar. | rare | Civic | unchanged |
| The Alfonsine Tables | On draft: complete the technology you are researching. Your towns make 30% less science for fifteen turns. | rare | Civic (Boon) | new (29) |
| The Summa | A great scholar's treatise completes the technology you are researching. | rare | Civic | new (30) |
| The Prototype Works | You may build the buildings and train the units of the technology you are researching, at one and a half times their production cost. Wonders are excepted. | rare | Economic | moved from Tier IV (31) |

### Tier III (18 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Military Engineers' Charter | Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points. | common | Military (Charter) | moved from Tier IV (45) |
| The Journeymen | Completing a technology grants each town production equal to three times its population. | common | Economic | unchanged |
| The Nizamiyya | Academies yield 50% more. | common | Civic | common (47) |
| The Doctorate | Gaining a great scholar grants culture equal to eight turns of your culture. | common | Civic | unchanged |
| The Humanists | Towns with a Library gain culture equal to a quarter of their science. | common | Civic | changed (34) |
| The Alchemists' Charter | Opens Chemistry: your warrior line gains +1 strength for each charter technology you know. | uncommon | Military (Charter) | unchanged |
| The Gunfounders' Charter | Opens Gunfounding, which unlocks the Tophane: its town builds military units 50% faster, with +6 strength. | uncommon | Military (Charter) | changed (36) |
| The Royal Academies | +5% production and culture for each empire building you hold. | uncommon | Civic | unchanged |
| The Model Army | Research upgrades your units even when you lack the strategic resource the new unit needs, and an upgrade heals the unit. | uncommon | Military | changed (35) |
| The Great Instrument | Goal: complete Alchemy. Reward: a fifth of the Magnum Opus. | uncommon | Wildcard | moved from Tier IV (42) |
| The Closed Book | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | uncommon | Civic | moved from Tier IV (41) |
| Commission: The Lynx-Eyed Academy | Goal: hold three Academies. Reward: a great scholar, and Academies gain +5 science and +5 culture. | uncommon | Wildcard | changed, from Tier IV (43) |
| The Republic of Letters | Every town gains +2 science and +2 culture for each Academy you hold. | uncommon | Civic | changed, from Tier IV (44) |
| The Second Seat | You may build one second copy of an empire building, in a city with a Library. | rare | Civic | changed (37) |
| The Age of Reason | Cards that pay when you complete a technology pay twice. | rare | Wildcard | reworded (33) |
| The Queen of Cities | Towns of at least 15 citizens produce twice their food and production. | rare | Economic | unchanged |
| The Foundation Stone | You may begin the Magnum Opus once Alchemy is half researched. | rare | Economic | moved from Tier IV (40) |
| The Collected Works | Your great scholars may act twice. | rare | Civic | new (39) |

### Tier IV (5 cards)

| Card | Text | Rarity | Chair | Status |
|---|---|---|---|---|
| The Great Catalogue | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | common | Economic | common (52) |
| The Laboratories | Science buildings give +2 production. | common | Economic | new (50) |
| The Breaching Batteries | Each hit your siege units land on a city removes 5% of its Magnum Opus progress. | uncommon | Military | unchanged |
| The Sum of Knowledge | The town raising your Magnum Opus gains +2 production for each technology you know. | uncommon | Economic | changed (48) |
| The Invisible College | On draft: choose two great scholars. | rare | Civic (Boon) | new (51) |

Cut: Learned Foundations and The Common Tables (Tier I), The Quiet Faculties (Tier II), The Proving Ground (Tier III), The Naval Gunners' Charter and The Walls of Learning (Tier IV).

### Shared with another deck (17)

| Card | Text | Shared with | Tier | Rarity | Chair | Status |
|---|---|---|---|---|---|---|
| Illuminated Treatises | Libraries give +1 culture. Monuments give +1 science. | Magisterial | 0 | common | Civic | unchanged |
| The Mountain Observatories | Cities with a mountain in their borders gain +3 science. | Expansionist | 0 | common | Civic | unchanged |
| Field Academies | Your first kill each turn grants 25 science for each age you have reached. | Dominion | I | uncommon | Civic | changed (67) |
| The Assay | Hexes with a strategic resource gain +2 science. | Expansionist | I | common | Civic | unchanged |
| The Founders' Schools | Towns you found start with a Library. | Expansionist | I | uncommon | Civic | new (64) |
| The Exchange of Discoveries | Mines and quarries on a resource gain +2 science. | Commerce | I | uncommon | Civic | unchanged |
| The Monastery Libraries | Libraries give +2 faith. Temples give +2 science. | Devotion | I | common | Civic | unchanged |
| The Schoolmen's Charter | Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | Devotion | I | uncommon | Civic (Charter) | unchanged |
| The Priest-Astronomers | Your capital gains +2 science and +2 faith for each town keeping a rite. | Devotion | I | common | Civic | unchanged |
| The Cloister | Towns with a Temple gain science equal to 30% of their faith. | Devotion | II | rare | Civic | unchanged |
| The Merchant Navigators | A town's fishing boats gain +2 science for its Lighthouse and +2 science for its Harbour. | Commerce | II | common | Civic | changed by the Commerce pass |
| Carried-Off Scholars | Capturing a city grants a technology that its owner knows and you do not. If there is none, it grants science equal to thirty times its population. | Dominion | II | uncommon | Civic | changed (66) |
| The Soldier-Scholars | Each military unit in your towns gives +2 science. | Dominion | II | uncommon | Military | unchanged |
| The Lodge Books | Completing a wonder completes the technology you are researching. | Magisterial | II | rare | Civic | new (65) |
| The Royal Patents | Researching a technology grants 100 gold for each age you have reached. | Commerce | III | uncommon | Economic | new in the Commerce pass |
| The House of Wisdom | Towns working an Academy build wonders 30% faster. | Magisterial | III | uncommon | Civic | unchanged |
| The Monastic University | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Devotion | III | rare | Civic | unchanged |

- Cut: The Blessed Forges (with Devotion, change 68). The Commerce pass cut Merchant Scholars.
- **How often a shared card is seen.** A hand's third card is a shared card on one draft in four (`thirdPositionOf`). So a seat sees about one shared card in Tier 0, one in Tier I and two in each later tier, from all the shared cards of its two decks. Three cards a pair is enough: more would only thin each one.

### Doctrines (17)

| Doctrine | Tier | Theme | Text | Status |
|---|---|---|---|---|
| The Pythagorean Brotherhood | I | engine | +2 science in every city, doubled in cities with a Shrine. | unchanged |
| The Removal to Xianyang | I | great cities | Your towns grow 30% faster. Settlers cost twice as much. | unchanged |
| The Workshops of Syracuse | I | elite army | Your military units gain +5 combat strength. They cost 50% more to build and to buy. | unchanged |
| The Natural Histories | I | learned land | Each town gains +1 science for each different kind of improvement it works. | new (55) |
| The Jixian Academy | II | engine | Completing a technology grants culture equal to a fifth of its cost. | changed (57) |
| The Academy of Gondishapur | II | institutions | Towns with an empire building gain +15% science. +20% production toward empire buildings, except the Magnum Opus and its works. | unchanged |
| The Pandidakterion | II | learned land | Hexes with an Academy have double yields, applied after every other change to the hex. | unchanged |
| The Peripatetic School | II | learned land | Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown. | moved from Tier I (56) |
| The Nassau Reforms | II | elite army | Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly. | moved from Tier IV (58) |
| The Directorate of Arms | III | engine | While no empire you have met knows more technologies than you, your units gain +3 combat strength. | unchanged |
| The Universitas | III | great cities | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. | unchanged |
| The Volley Fire | III | elite army | Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units lose 4 strength. | changed (59) |
| The Mustansiriya | III | institutions | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works. | renamed, was The Külliye (60) |
| The Platonic Academy | III | learned land | Your great people of every family found an Academy as their work, in place of their own. | moved from Tier IV (61) |
| The Court of Rudolf II | IV | engine | The town raising your Magnum Opus gains production equal to a tenth of your science. | changed (62) |
| The Two Capitals | IV | great cities | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. | unchanged |
| The Trace Italienne | IV | elite army | Your towns gain +10 defence, and your units gain +4 strength inside your borders. Your units lose 4 strength outside them. | new (63) |

- Eight Doctrines do not change. The Pythagorean Brotherhood pays a flat sum by town, so a cut to passive science makes it worth more. The Universitas doubles and halves science buildings, so it follows whatever the cut does to the Library.
- Each tier holds three to five. Tier I gains a learned-land Doctrine that works on the day it is taken. Tier II holds the two that need a long game after them.

## 7. The themes after the pass

### Discovery and the plan (the engine)

- **Tier 0:** The Royal Workshops
- **Tier I:** The Astronomical Diaries, The Scholars' Fame, The Reform of the Calendar, Commission: The Old Learning; the Doctrine The Pythagorean Brotherhood
- **Tier II:** The Alfonsine Tables, The Summa, The Translation Movement, The City Architects, The Armoury Patterns, The Prototype Works; the shared The Lodge Books and Carried-Off Scholars; the Doctrine The Jixian Academy
- **Tier III:** The Age of Reason, The Journeymen, The Foundation Stone, The Closed Book, The Great Instrument; the shared The Royal Patents
- **Tier IV:** The Sum of Knowledge; the Doctrine The Court of Rudolf II
- **The roles:** supply is the deeds that complete a technology. Widen is what the moment pays: production, culture, renown, gold, drafts. Multiply is The Age of Reason. Act is the aim before each deed and the choice of the next age.

### Charters

- **Thirteen charters,** 1, 5, 4 and 3 in Tiers 0 to III, each dealt in two tiers. They open three works, seven buildings and three unit traits.
- **Cards that deal or count them:** The Charter Rolls (I), The Royal Charter Commission (II), the Alchemists' Charter (III), The Great Catalogue (IV), and The Secret Arts through the lead.

### The learned land

- **Tier 0:** the Physic Garden, The Clay Map, The Prospectors' Notes
- **Tier I:** the star tower, the qanat, the Specularium; the Doctrine The Natural Histories; the shared The Mountain Observatories, The Assay and The Exchange of Discoveries
- **Tier II:** The Old Academy, The Lecture Halls, The Latin Quarter, The Strategikon, The Roll of Scholars; the Doctrines The Pandidakterion and The Peripatetic School
- **Tier III:** The Nizamiyya, The Republic of Letters, Commission: The Lynx-Eyed Academy, The Collected Works, The Doctorate; the Doctrine The Platonic Academy
- **Tier IV:** The Invisible College
- **The roles:** supply is the scholars (The Royal Tutors, the commissions, The Invitations). Widen is food and production (The Old Academy), science (The Lecture Halls, The Latin Quarter) and strength (The Strategikon). Multiply is The Nizamiyya and The Pandidakterion. Act is where each work stands, and The Collected Works.

### Schools and institutions

- **Tier I:** The Scribes' Hall, The Almanac, The Royal Tutors, The Dedications, The Forward Plans, The Royal Estates; the Mouseion; the shared The Founders' Schools
- **Tier II:** Enduring Institutions, The Invitations, The Palace Schools; the Scriptorium, the Bimaristan, the Aldine Press; the Doctrine The Academy of Gondishapur
- **Tier III:** The Second Seat, The Royal Academies, The Humanists; the Tophane; the Doctrines The Mustansiriya and The Universitas
- **Tier IV:** The Laboratories

### Great cities and the army

- **Great cities:** The Free Cities (I), The Round City (II), The Queen of Cities (III); the Doctrines The Removal to Xianyang and The Two Capitals. Three cards, where there are four today. You ruled on 2026-10-20 that the deck may read town size, and I left these alone.
- **The army:** The War Manuals (0), The Edge of the Sword and the Bronze-Founders' Charter (I), The Armoury Patterns, The Palace Schools, The Strategikon and the Mechanists' Charter (II), The Model Army and three charters (III), The Breaching Batteries (IV); the Doctrines The Workshops of Syracuse, The Nassau Reforms, The Volley Fire, The Directorate of Arms and The Trace Italienne.

## 8. Example councils

### Early, end of Tier I: the garden towns (five chairs, the Priest-King)

- **Chairs:** The War Manuals (0, Military), The Almanac (I, Economic), The House of Life (0, Civic), The Scribes' Hall (I, Civic), Commission: The Old Learning (I, Wildcard). Taken on the way, with no chair: the Herbalists' Charter and the Astronomers' Charter. Doctrine: The Natural Histories.
- **How it plays:** each town gets a Physic Garden beside its woods and a star tower on the bare edge of its land. The workers give each town one farm, one mine and one pasture before a second farm. The capital turns half its hammers into science. The seat goes back for the cheap first-age technologies it left, and the commission pays its first great scholar at about turn 55.

### Early, end of Tier II: the new age (six chairs, the Aristocracy)

- **Chairs:** The Armoury Patterns (II, Military), The City Architects (II, Economic), The Charter Rolls (I, Civic), The Astronomical Diaries (I, Civic), The Lecture Halls (II, Civic), The Summa (II, in the Wildcard chair). Taken as a boon: The Alfonsine Tables. Doctrine: The Nassau Reforms.
- **How it plays:** the seat learns Philosophy early to enter age 3. From that turn its age-3 buildings and wonders come 30% faster, and each unit line gains +4 when its technology lands, and +2 for good from the Doctrine. Every hand shows a charter. The first scholar founds an Academy in the town with the Library and the Scriptorium. The second writes a treatise, aimed at a technology of 1,150.

### Late, Tier III then Tier IV: the race to Alchemy (eight chairs under the Divine Mandate, then eleven under The Curia)

- **Chairs, Tier III:** The Armoury Patterns and The Model Army (Military); The Journeymen (Economic); The Astronomical Diaries, The Summa and The Collected Works (Civic); The Age of Reason and The Closed Book (the Wildcard chairs). Tier IV adds The Foundation Stone, The Republic of Letters and The Sum of Knowledge, and The Invisible College as a boon.
- **How it plays:** every scholar ends two technologies. Each technology pays production in every town twice and heals the army's line. The Opus starts when Alchemy is half done. Two scholars from The Invisible College end Alchemy, and the rivals wait ten turns.

## 9. Pairs, leaders and great people

### The pairs and their shared cards

- **Dominion, the military edge (3 cards: one in Tier I, two in Tier II).** Field Academies pays science for a kill by the age reached (change 67). Carried-Off Scholars gives a technology for a captured city (change 66). The Soldier-Scholars stays. Dominion raises kills, captures and garrisons, and this deck pays in science and technologies.
- **Expansionist, the engineers (3 cards: one in Tier 0, two in Tier I).** The Mountain Observatories and The Assay stay. The Founders' Schools gives each new town a Library (change 64). Expansionist raises towns founded, mountains and resources. Its The Cadastre and Commission: The Reclaimed Lands count the Physic Garden, the qanat and the star tower.
- **Commerce, the patrons (3 cards, as its pass left them).** The Exchange of Discoveries, The Merchant Navigators and The Royal Patents. I change none. The Royal Patents pays 100 gold for each age on every technology, so the deeds of note A are worth gold to this pair, and The Age of Reason doubles it.
- **Devotion, scholars of the faith (5 cards, from 6).** I cut The Blessed Forges (change 68) and leave the other five to the Devotion pass. If that pass wants three, The Priest-Astronomers and The Monastery Libraries are the two plain ones.
- **Magisterial, the academy (3 cards, from 2).** Illuminated Treatises and The House of Wisdom stay. The Lodge Books turns a wonder into a technology (change 65). Magisterial raises wonders, great people and drafts. The Reform of the Calendar and The Charter Rolls add drafts and cards for its counters.

### The leaders (`docs/plans/leader-roster-pass-2026-11-19.md`)

- **Mehmed the Conqueror (Dominion and Scientific): richer.** The Enderun counts great scholars gained, and the pass gives a scholar earlier (change 17). The Great Bombard's science for a capture adds to the new Carried-Off Scholars. The Janissary stands in the warrior line, which the Alchemists' Charter raises, and the seat now sees its charters. The Tophane is larger. Their building The Külliye shares its name with a Doctrine today (change 60).
- **Nezahualcoyotl (Expansionist and Scientific): richer.** The Dikes pays farms in Aqueduct towns, and the Surveyors' Charter gives the Aqueduct early and a qanat that makes farm land. The Natural Histories suits a seat that improves everything.
- **Cleopatra (Commerce and Scientific): richer.** The Museion pays +2 science for every great person called, in every city. The pass adds two commissions for scholars at lower tiers and The Invisible College. The Queen's Alliances pays for each age reached, which note B asks the seat to raise early. The Printers' Charter still gives a route.
- **Harun al-Rashid (Devotion and Scientific): richer.** The Learned Court pays faith equal to a fifth of each technology's cost, so every deed that completes a technology pays them faith: Alchemy by a treatise is 1,600 faith. The Storehouse of Wisdom pays on the Library and the Shrine, beside The Scribes' Hall and The Sky Watchers.
- **Sejong the Great (Scientific and Magisterial): much richer, and the one to test.** The Royal Lectures gives three turns of renown for each technology. With The Summa and The Collected Works a scholar ends two technologies, which is six turns of renown toward the next scholar. At 100 to 150 renown a turn that is 600 to 900 renown, when the eighth to eleventh person costs 654 to 1,100. So the loop nearly pays for itself for three or four scholars, and then the price of a great person grows faster than the loop. You wrote that you want one leader whose way to play is to call as many scholars as possible. The Correct Sounds pays science for citizens, so the cut to passive science may reach it.
- **Ibn Battuta (every deck):** one more chair and a free redraw. The Charter Rolls gives their hand a fifth card.

### The great people (`docs/plans/great-people-pass-2026-11-19.md`)

- **Ibn al-Haytham** ("your libraries pay double") now doubles The Scribes' Hall's +2 science, The Almanac's +2 production, Cai Lun's line and Harun's.
- **Copernicus** doubles Observatories, which bot seats do not build (note I). No change of this pass helps that.
- **The five legacies that count "buildings that supply science"** (Aristotle, Zhang Heng, Maimonides, Āryabhaṭa, Brahmagupta) lose nothing. The pass cuts one card that counted them (The Common Tables) and adds one (The Laboratories).
- **A scholar's work** pays 4 and grows to 8 under the great-people pass. The Lecture Halls, The Latin Quarter and the commission's reward add to it on the hex, where The Nizamiyya and The Pandidakterion multiply.

### Where this pass touches other work

- **The Devotion pass** runs beside this one. It may rule on the six shared cards first. Nothing in this pass reads a rite, a follower or faith spent.
- **The Commerce build** adds four things that this pass reuses: a boon with a timed effect, a great person who acts twice, a hex row that counts the buildings of its town, and a grant that counts ages reached.
- **The Expansionist build** adds the yield "for each hex beside it that…" and the keyword unique improvement. The star tower joins that list, with the Physic Garden and the qanat.
- **Three names to settle outside the cards.** The Doctrine and Mehmed's building are both The Külliye. The shared card The House of Wisdom has the name of a wonder. The charter building the Mouseion and Cleopatra's building The Museion are one word in two spellings.
- **One text differs from the game's own words.** The sheet says that the Doctrine The Volley Fire gives the archer line a second attack. The game's words say "ranged units may attack twice a turn".

## 10. What to test first, and what I could not determine

### What to test first

1. The Alfonsine Tables and The Summa: does the player aim at a technology before the deed, and is the turn it lands a good turn?
2. The star tower: does the player leave land empty for it, or does it feel like a penalty for improving land?
3. The Charter Rolls: with a charter in every hand, how many does the seat take, and does the main tree stall?
4. The Reform of the Calendar with The Armoury Patterns and The City Architects: does the seat go to the next age early, and is that fun or only correct?
5. The House of Life in age 1: does the capital build mines for science?
6. Sejong with The Summa and The Collected Works: how many scholars by turn 120?
7. Tier III with the Opus cards: do they come before Alchemy in your games?

### What I could not determine

- **No play evidence from you for this deck since the build.** `docs/playtest_notes.md` holds your September win as Nezahualcoyotl and no later Scientific game. The bot measurements of 2026-10-13 are older than the deck.
- **The bot games are three.** They give medians of 6 to 18 seats. The pacing and the shares can move with more seeds. I did not check how each game was won.
- **How many hexes a seat has seen** at each turn (The Clay Map), and how many wonders a seat builds (The Lodge Books).
- **How fast your own games run.** If you reach Tier IV by turn 130 as a rule, the moves to Tier III matter less.
- **What the cut to passive science will be.** Every science number in the pass is sized for today's rates.
- **Whether a great scholar can be called before Epic Poetry,** for a commission that pays one early.
- **Whether The Humanists and Magisterial's The Learned Patron can feed each other.** Both read a share of a town's yield.
- **The chart.** Astronomy needs a place on your star chart, and the fourth-age charter technologies still stand at placeholder places.
- **The history is from my own knowledge,** not from a source in the repo. Two names are loose fits for their tier: The Alfonsine Tables (13th century) and The Invisible College (17th century) are later than most of the deck's names.

## Questions for the user

Five questions change the build. Each has my recommended answer.

1. **Does the technology lead stay a quantity that cards read?** Recommended: yes, and keep it small. The star chart shows the lead, and each charter technology adds to it for good, so it has a floor. This pass keeps The Secret Arts, The Edge of the Sword and the Doctrine The Directorate of Arms, and cuts The Proving Ground (change 38). If the answer is no, cut the three as well: the plan cards of note B pay the army and the towns without them.
2. **May a card complete a technology?** Recommended: yes. Four changes do it: a boon (29), a treatise (30), a wonder (65) and a captured city (66). They are how the pass answers "builds libraries and waits", and they keep their worth after a cut to passive science. Alchemy is not excepted, so a scholar can end the last technology. If the answer is no, each one pays eight turns of science.
3. **Do the Opus cards move to Tier III, and may Tier IV hold five cards?** Recommended: yes to both. In three bot games the median seat held 18 to 24 drafts when the game ended, and Tier IV opens at 26. Changes 40 to 45 and change 31 move seven cards down, and the Doctrines of changes 58 and 61 follow. If your own games reach Tier IV early, say so and I will keep the commissions there.
4. **Should a charter technology cost half, and should a charter be dealt in two tiers?** Recommended: yes to both (changes 53 and 54). You made charter technologies the ordinary price on 2026-11-10. A charter is dealt when its column is the most expensive on the chart, so its technology still costs one and a half ordinary ones. If you want one of the two and not the other, take the two tiers: a seat that is offered three charters cannot use a lower price.
5. **Should the science cards be sized for today's rates, or for the cut?** Recommended: today's rates, and retune when the figure is ruled. Section 3 shows which cards grow and which shrink. If you already know the cut is deep, tell me, and I will raise the flat sums on buildings and works by about a third in the next round.

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

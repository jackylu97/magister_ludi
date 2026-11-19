# Great people pass, 2026-11-19

A design pass on the great people: everyone in the game, a balance and synergy pass, and people to add. Nothing here is built, and no game data changed. The numbers are first guesses, to tune in playtest. The history is from my own knowledge; I say where it is thin.

The page for review is generated from the same source: `scratchpad/great-people/great-people-pass.html` (`build.mjs` and `source.mjs` beside it). “Now” lines are the game’s own words, from the Compendium’s describers.

## What I found

1. **The roster runs one age ahead of the game.** `rosterAgeFor` (`src/sim/greatPeople.ts`) adds one to the game’s age. A seat in Æra II is dealt the names marked Æra III, and a seat in Æra IV is dealt the names marked Æra V.
2. **So the 19 people of Æra V are in play today.** They are the first names dealt in Æra IV, the last built age. The names that are almost never dealt are the 16 of Æra II: they come only when a later age has fewer names left than the hand shows.
3. **Great people open with Epic Poetry** (Æra II, the ability `ancestorRites`), which bots reach about turn 55. Renown banked before that waits, so the first person comes at once.
4. **A seat calls more people than the deck passes assumed.** On today’s prices, the measured renown banks buy 3 or 4 people by turn 100 and 7 to 9 by turn 150. The Magisterial and Dominion passes used 2 or 3 and 5 or 6, the figures of the old prices.
5. **The act is almost always the right choice.** A scholar’s act is about one technology in every age. A work pays 3 a turn. The work is right only for a seat with cards that read works.
6. **The five acts are not equal.** In Æra IV a scholar’s act is 8 turns of science and a merchant’s is 3 turns of gold.
7. **A general’s legacy starts only when the general is spent,** and six Dominion cards want the general alive beside the army.
8. **A family with more names fills more of each hand,** because each name has its own chance. Æra III has 8 scholars and 2 artists. No card reads a Landmark or a great artist.
9. **Verdicts on the 78 live people:** 7 odd, 49 fine, 14 weak, 5 dull, 3 strong. I propose 32 changes to people, 12 changes to the system and families, and 35 new people. No change needs a new shape; 12 need a small extension or a small code change.
10. **Clashes:** Hypatia and Ibn Battuta are leaders and great people today. Zheng He is a leader and a retired row. There is no faith family: prophets are units of the religion system. But a Holy Site already counts as a great person’s work.

## The system in numbers

### The price of a great person

- Renown is one pool for the empire. The price is `floor(75 + 58 × n + n^2.65)`, where n is the number of people already called (`renownThreshold`, `src/sim/renown.ts`). Every family is on the same ladder.

| Person | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th | 10th |
|---|---|---|---|---|---|---|---|---|---|---|
| Price | 75 | 134 | 197 | 267 | 346 | 436 | 538 | 654 | 786 | 934 |
| Renown in all | 75 | 209 | 406 | 673 | 1019 | 1455 | 1993 | 2647 | 3433 | 4367 |

- Cards cut the price: The Hanlin Academy −20%, Solomon’s Temple −10%, The Peregrini −20% on the next person after a work. The cuts add together.

### How many people a seat calls


| By turn | People called | Where the figure comes from |
|---|---|---|
| 50 | 0 | Epic Poetry opens great people about turn 55 (bots). The renown waits. |
| 100 | 3 or 4 | The measured seats had banked 650 to 980 renown by turn 100 (`docs/great-people.md`). Today’s ladder sells the third at 406 and the fourth at 673. |
| 150 | 7 to 9 | The same seats had banked 2,000 to 3,900. The seventh costs 1,993 in all and the ninth 3,433. |

- These are sums on old measurements, not a new measurement: the games were played on the ladder of September, and play changes when people arrive sooner. To tune in playtest.
- The Magisterial pass used “2 or 3 by turn 100 and 5 or 6 by turn 150”. That is the old ladder (linear 225). Cards that count great people are about half again as strong as that pass worked out: The Hall of Heroes gives +7 to +9 strength by turn 150, and The Honoured Dead +56 to +72 of each yield.

### The draw

- A hand shows 3 names (`rules.offers.greatPerson`), and at most 5 with riders. Every unclaimed name of the seat’s roster age is in the bag. Each name has a weight of 1,000, plus up to 1,000 more by the share of the seat’s renown that its family fed. So the bias is at most two to one, and a family’s share of a hand follows how many names it has.
- If the age has fewer unclaimed names than the hand, the draw adds the age before it, then the ages before that, then the ages after. A name called by one seat is gone for every seat.
- A narrowed hand (a great general to call, A Court of Engineers, the Academy’s scholars) walks the same ages with one family. It spills as soon as that family has fewer than 3 names left in the age.
- **What the draw wants:** at least 5 names for each family in each age, so that a narrowed hand of 3 holds after two seats have taken one each. Scholars and generals have the most narrowed sources, and Æra IV is the longest age, so they want 8 or more there.

| Names today, as the rows are marked | Æra II | Æra III | Æra IV | Æra V |
|---|---|---|---|---|
| Scholars | 3 | 8 | 4 | 4 |
| Artists | 5 | 2 | 3 | 4 |
| Engineers | 2 | 5 | 4 | 3 |
| Merchants | 2 | 5 | 4 | 4 |
| Generals | 4 | 4 | 4 | 4 |
| All | 16 | 24 | 19 | 19 |


| Names after this pass | Æra II | Æra III | Æra IV | Æra V (not built) |
|---|---|---|---|---|
| Scholars | 5 | 8 | 11 | 0 |
| Artists | 5 | 6 | 9 | 2 |
| Engineers | 5 | 7 | 8 | 1 |
| Merchants | 5 | 6 | 10 | 0 |
| Generals | 6 | 7 | 11 | 1 |
| All | 26 | 34 | 49 | 4 |

- Demand, as a first guess: six seats call about 12 people in Æra II, 20 in Æra III and 30 in Æra IV.

### What an act, a work and a legacy are worth

- A person has one charge. The act or the work spends it, and either one leaves the legacy. So the choice is the act against the work; the legacy comes with both. Only The Universal Genius gives both the act and the work.

|  | Æra II (turns 55 to 90) | Æra III (90 to 160) | Æra IV (135 to 200) |
|---|---|---|---|
| Scholar’s act: 8 turns of science | 240 science (a technology costs 100 to 190) | 850 (a technology costs about 650) | 3,950 (about 3,250) |
| Artist’s act: 8 turns of culture, and +2 happiness in one town for 10 turns | 200 culture | 660 | 3,500 |
| Engineer’s act: 40 production × age, +5% for each technology | 160 (a wonder costs 292 to 382) | 330 (501 to 860) | 600 (1,127 to 1,934) |
| Merchant’s act: 60 gold × age, +5% for each technology | 240 gold: 12 turns of gold, or 60 production bought | 495: 10 turns, or 124 production | 900: 3 turns, or 225 production |
| General’s act: full health and +3 strength within 2 hexes for 5 turns | +3 on a strength of 30 to 35 | +3 on 42 to 50 | +3 on 45 to 80 |
| A work, with no card | 3 a turn | 3 a turn | 3 a turn |
| A regular Order of the band (the power bar) | 15 to 25 a turn | 35 to 60 | 60 to 120 |
| The legacy bar of this pass | 8 to 15 a turn | 15 to 30 | 30 to 60 |

- The yields are the bots’ medians from `power-bar.md`. I assumed 20, 35 and 55 technologies known for the three ages.
- **The act against the work.** In Æra II a scholar’s act equals 80 turns of an Academy. From Æra III it equals 280 turns or more. A work wins only where cards pay on it: The Old Academy, The Quiet Faculties, The Masters’ Domain, The Castle Demesne, The Customs Houses and the doublers.
- **The legacy bar.** On 2026-11-12 you made people come almost twice as often and cut the legacies that were strong for everyone. The rows you set then pay about half a regular Order of their band: Copernicus +48, Ibn Sīnā +8, Zhang Heng +10. I measured every row against that. A defining row may reach a regular Order if it carries a cost.
- A seat with eight legacies and eight chairs then gets about a third of its card value from great people.

### The family acts and works, in the game’s words

- **Scholars.** Write a Treatise. Use it once: it adds 8 turns of your empire’s science to the technology you are researching. Found an Academy. Send it to a hex instead and the work stands there for ever — this uses it up too.
- **Artists.** Hold a Festival. Use it once: it adds 8 turns of your empire’s culture toward your next draft, and gives the city +2 happiness for 10 turns. Raise a Landmark. Send it to a hex instead and the work stands there for ever — this uses it up too.
- **Engineers.** Rush the Works. Use it once: it adds 40⚙ to a city’s production, multiplied by the age your empire has reached — and it grows with every technology you research. Raise a Manufactory. Send it to a hex instead and the work stands there for ever — this uses it up too.
- **Merchants.** Strike a Bargain. Use it once: it adds 60💰 to your treasury, multiplied by the age your empire has reached — and it grows with every technology you research. Build a Customs House. Send it to a hex instead and the work stands there for ever — this uses it up too.
- **Generals.** Rally the Army. Use it once: every unit within 2 hexes gains +3 combat strength for 5 turns. Raise a Citadel. Send it to a hex instead and the work stands there for ever — this uses it up too.

### The age a person is dealt in today

| Game age | Roster age dealt first | Then, when that bag is short |
|---|---|---|
| Æra I (no great people yet) | Æra II | Æra III, then Æra IV, then Æra V |
| Æra II | Æra III | Æra II, then Æra IV, then Æra V |
| Æra III | Æra IV | Æra III, then Æra II, then Æra V |
| Æra IV | Æra V | Æra IV, then Æra III, then Æra II |

## Changes to the system and the families

### S1. Deal each roster age in its own game age

- **Now:** The roster age is the game age plus one.
- **Proposed:** A seat in Æra II is dealt the people of Æra II, and so on.
- **Shape:** code: one line in `rosterAgeFor`, and its tests
- **Why:** The rows share their ages’ names with the tree (Heroes, Empire, Cathedrals), and the Compendium prints “scholar, Æra III” on a name dealt in Æra II. The 16 people of Æra II come into play. Every verdict below assumes this change.

### S2. Bring 15 people of Æra V into Æra IV

- **Now:** 19 people are marked Æra V.
- **Proposed:** Fifteen become Æra IV. Bashō, Sor Juana, Vaucanson and Gustavus Adolphus stay in Æra V and wait for it.
- **Shape:** data: `age` on 15 rows
- **Why:** After S1 nobody is dealt Æra V. Æra IV runs to the Printing House, the Caravel and the Gun Galley, so the people of 1400 to 1600 belong in it. The four that stay lived after 1600. They can still come by spill when every earlier name is gone.

### S3. A work grows with your ages

- **Now:** A work pays +3 (a Citadel +2 production).
- **Proposed:** A work pays +3 of its yield for each age you have reached past the first: +3, +6, +9. A Citadel pays +2, +4, +6 production.
- **Shape:** small extension: an improvement’s yield multiplied by the owner’s age
- **Why:** The act grows with the empire and the work does not, so the work is a trap for a seat without work cards. At +9 it is the best hex of a town and still far under the act. The doublers get a larger base: two works under three doublers pay +72, not +24. To tune in playtest.

### S4. The merchant’s act is turns of gold

- **Now:** Strike a Bargain: 60 gold × age, more with each technology.
- **Proposed:** Strike a Bargain: 12 turns of your empire’s gold.
- **Shape:** small extension: `actGainOf` reads gold as it reads science and culture
- **Why:** The scholar and the artist are paid in turns of what the empire makes. In Æra IV the merchant’s 900 gold is 3 turns. At the medians, 12 turns is 228, 564 and 3,576 gold: the same as today early and four times as much late, and more for a Commerce seat.

### S5. The engineer’s act is half a wonder

- **Now:** Rush the Works: 40 production × age.
- **Proposed:** Rush the Works: 60 production × age.
- **Shape:** data: `engineerHammers`
- **Why:** It pays 240, 495 and 900, against wonders of 292 to 382, 501 to 860 and 1,127 to 1,934. Today it is a third of a wonder in the last age.

### S6. The general’s strength keeps up with the armies

- **Now:** The aura and Rally the Army give +3 in every age.
- **Proposed:** +3 in Æra II, +5 in Æra III, +6 in Æra IV, for the aura and for the act.
- **Shape:** small extension: two figures become a list by age
- **Why:** +3 is 10% of a unit in Æra II and 5% in Æra IV. The list is the power bar’s regular war line. The Strategoi and The Marshalate then add to a fair base.

### S7. A general’s legacy starts when you call them

- **Now:** A legacy starts when the person is spent.
- **Proposed:** A great general’s legacy is yours from the turn you call them. The act and the Citadel still spend the piece.
- **Shape:** small code change in the legacy list (`liveEffects`), one family
- **Why:** The Tactica, The Taker of Cities, The Marshalate, The Strategoi, The Landsturm and Total War’s plan want the general alive beside the army. Today the rules pay you to spend them at once.

### S8. A Landmark makes its town happy

- **Now:** A Landmark pays +3 culture.
- **Proposed:** A Landmark pays its culture and gives the empire +2 happiness.
- **Shape:** small extension: happiness on an improvement row, as the Physic Garden has from Herbals
- **Why:** Every other work has cards that read it by name. No card reads a Landmark. Happiness is the artist’s second voice already (the festival), and every seat can use it.

### S9. An ordinary hand shows at most two of one family

- **Now:** A hand may show three scholars.
- **Proposed:** When the third name drawn is of the same family as the first two, draw again once from the other families, if any is left.
- **Shape:** small code change in `drawGreatPersonOffer`; a narrowed hand is not touched
- **Why:** Three names of one family differ only by legacy. Two families in a hand make the pick a choice of act and work too.

### S10. A limit on what multiplies an act

- **Now:** Leonardo +50% and Letters Patent (approved: double) add together; The Immortals counts Leonardo twice.
- **Proposed:** All cards and legacies together raise an act by at most +100%.
- **Shape:** small code change where `greatPersonAct` is summed
- **Why:** Without the limit the three give +200%: a scholar’s act is 24 turns of science, about 3.6 technologies in Æra IV, and The Invitations calls a scholar for every empire building.

### S11. One reading for legacies on works

- **Now:** The Spirit Way’s rule 4 says doublers multiply “what cards put there”. It does not say if a legacy’s line is a card’s line.
- **Proposed:** A legacy’s line on a work is multiplied as a card’s line is. No person of this pass pays on the plain “great person’s work” test except Benjamin of Tudela.
- **Shape:** a ruling for the Spirit Way build; no data
- **Why:** Benjamin of Tudela pays +3 on each wonder under The Spirit Way: +12 on four wonders, +36 under both doublers, on a stack of about +370. Homer names each kind of work and so pays nothing there.

### S12. Ratings that tell the truth

- **Now:** Six people are marked defining and carry no cost: Kidinnu, Homer, Aristotle, Archimedes, Subutai, Leonardo.
- **Proposed:** A defining row always carries a cost. These six become strong.
- **Shape:** data: `tier` (nothing in the rules reads it)
- **Why:** The Compendium prints the rating. “Defining” should mean one thing: a large effect that you pay for.

## Family notes

### Scholars

- **Job:** a technology now, or an Academy. **Deck:** Scientific, which has 17 Orders and 4 Doctrines that read scholars or Academies, and five ways to call a scholar and nobody else.
- **The problem:** the scholar is the pick for every seat. Its act is the largest, and 20 buildings and wonders feed scholar renown, against 9 for generals. S4 to S6 raise the other acts; the scholar does not change.
- **The legacies** lean on “buildings that supply science” five times (Aristotle, Zhang Heng, Maimonides, Āryabhaṭa, and Wang Xizhi if added). That is a theme, and each pays a different yield, so I kept it.
- **Counts:** 3 scholars in Æra II and 8 in Æra III today. After the pass: 5, 8 and 11.

### Artists

- **Job:** culture toward the next draft, a festival, or a Landmark. **Deck:** Magisterial by intent. But Magisterial reads any family, and no card in any deck reads a Landmark or a great artist.
- **So the artist is never the best pick for a plan.** S8 gives the Landmark happiness. The legacies now carry the family’s ties: faith for Devotion (Enheduanna, Dante), wonders for the monuments (Phidias, Dürer, Michelangelo), great people for the patrons (Homer, Ferdowsi), routes for Commerce (Kālidāsa).
- **Counts:** 2 artists in Æra III today, so an Æra III hand almost never shows one. After the pass: 5, 6 and 9.
- A later deck pass can add one Magisterial Order that reads Landmarks. I did not write it here.

### Engineers

- **Job:** half a wonder now, or a Manufactory. **Decks:** Expansionist (The Engineers’ Yards, The Builder Kings, The Cathedral Lodges, A Court of Engineers) and the monuments of Magisterial. The Office of Works and The Mausoleum’s renown supply them.
- **The problem:** five legacies were only “+X% production toward wonders” (Imhotep, Amenhotep, Hemiunu, Villard, Leonardo). A hand with two of them is one choice. The changes to Imhotep, Amenhotep and Villard give three of them a second, plain line; Hemiunu and Leonardo keep the big percentages.
- **Two moves:** Imhotep and Archimedes become engineers. Taqī al-Dīn gets an engineer’s clause.
- **Counts:** 2 in Æra II today. After the pass: 5, 7 and 8. A Court of Engineers takes every person as an engineer, so one seat can use 7 to 9.

### Merchants

- **Job:** gold now, or a Customs House. **Deck:** Commerce (The Customs Houses, The Customs Service, A Court of Merchants, The Strongroom, Merchant Princes).
- **The problem:** the act falls behind (S4). The legacies are sound: hexes, routes, connections and buying, which are the things Commerce does.
- **Changes:** Ea-nāṣir’s bargain was a loss and becomes a real one. Pytheas and Lamassī now read trade routes. Cosimo de’ Medici gets a cap.
- **Counts:** 2 in Æra II today. After the pass: 5, 6 and 10.

### Generals

- **Job:** an aura beside the army, a rally, or a Citadel that takes the ring of hexes around it, from a rival too. **Deck:** Dominion, with 12 Orders and 2 Doctrines, and after its pass about seven ways to call a general.
- **At peace** a general today is a Citadel and nothing else. Three fixes: the legacy starts at the call (S7); the Citadel grows (S3); and more legacies carry a peace line, as Gaius Marius does. New: Fu Hao (faith from garrisons), Zhuge Liang (food from garrisons), Amina (gold from walls), Julius Caesar (gold and culture from a capture). Changed: Ahmose (gold from kills).
- **Counts:** 4 in every age today. After the pass: 6, 7 and 11.

### Prophets and Devotion

- There is no great prophet in this roster. A Prophet is a unit of the religion system: bought with faith, with charges, and it founds the religion and raises the Holy Site (`data/units.json`, `src/sim/religion.ts`). `greatPeopleData.ts` says: “Prophets are religion’s and are deliberately not here.”
- The Holy Site row is marked `greatPerson: "prophet"`, and the test “a hex carrying a great person’s work” reads that mark. So a Holy Site counts as a work today for The Masters’ Domain, The Hanlin Academy, The Laureate, The Quarter of Masters, Benjamin of Tudela and The Gobelins. The Spirit Way’s own table lists the Holy Site among the works.
- A prophet does not count as a great person gained or spent, and takes no step on the price ladder.
- Devotion’s ties to great people today: Sacred Patronage (buy a person with faith; a shared rare), The Monastic University (an Academy beside a Holy Site), and the god Cult of Heroes (+15% renown).
- **Proposal:** no faith family. Devotion already has its own piece with its own price. I propose three smaller things. (1) Say in the Compendium entry for the Holy Site that it is a great person’s work. (2) Give Devotion people to pick: Enheduanna, Bezalel and Homer after their changes, and Fu Hao, Dante and Tlacaelel among the additions, beside al-Khwārizmī, Āryabhaṭa, Rūmī and Mimar Sinan. (3) Leave prophets off the price ladder.

## Synergy with the decks

Every live Order, Doctrine, leader and belief whose printed words name great people, their works, their families or renown (106 rows, from the Compendium). The approved changes that are not built are listed after the table.

| Where | Card | What it says today |
|---|---|---|
| Belief | Cult of Heroes | +15% renown |
| Belief | Ecclesia | +1 faith on every hex with a Holy Site, for each city that follows you |
| Commerce doctrine | The Sogdian Colonies | +3 culture in every city that holds your trading post · +3 renown per turn in every city that holds your trading post, favouring merchants |
| Commerce Tier II | Houses of Account | +2 happiness per gold building · +1 renown per turn per gold building you hold |
| Commerce Tier III | A Court of Merchants | +50% renown · every great-person offer shows only great merchants, until there are none left to call |
| Commerce Tier III | A Guild Commission | Commission · Goal: buy 5 buildings with gold. Reward: a great person to call |
| Commerce Tier III | The Customs Service | +3 gold, +3 culture on every trade route sent from every city with a Customs House |
| Commerce Tier III | The Strongroom | Commission · Goal: end a turn with at least 1500 gold in your treasury. Reward: culture equal to 20% of the gold in your treasury at that moment, and a great merchant to call |
| Commerce Tier II | The Customs Houses | +4 science and +4 culture in every city per hex with a Customs House there |
| Commerce Tier IV | Merchant Princes | a great person waiting to be called may be bought with gold |
| Common Tier III | Merchant Scholars | +2 science per hex with an Academy in the origin city, on trade routes that end in another empire’s city |
| Common Tier III | Sacred Patronage | a great person waiting to be called may be bought with faith |
| Common Tier III | The House of Wisdom | +30% production toward wonders, in every city working an Academy |
| Common Tier III | The Monastic University | +5 science, +3 faith on every hex with a Holy Site beside an Academy · +5 science, +3 faith on every hex with an Academy beside a Holy Site |
| Common Tier III | The Office of Works | Boon · On draft: you gain a great engineer to call |
| Common Tier III | The Sculpted Landscape | +2 food, +2 culture on every hex with a Farm beside a great person's work |
| Common Tier II | Looted Art | capturing a city grants +20 renown for each great-person work and wonder inside its borders |
| Common Tier II | Pilgrim Markets | +3 gold, +3 faith on every trade route with either end in a city with a Holy Site |
| Common Tier II | Sacred Commissions | +30% production toward wonders, in every city with a Holy Site |
| Common Tier I | The Hall of Fame | +30% renown in your capital |
| Devotion doctrine | The Canons of the Holy Sepulchre | all units and buildings cost −30% to buy with faith, in every city with a Holy Site |
| Devotion doctrine | The Two Sanctuaries | the yields of every hex with a Holy Site are doubled, after every other change to the hex |
| Devotion Tier III | The Abbeys | your apostles may raise a further holy site, as your prophets do, once you have founded a religion |
| Devotion Tier III | The Pilgrim Towns | +20% culture in every city working a Holy Site |
| Devotion Tier II | Temple Estates | +2 food, +2 faith on every hex beside a Holy Site |
| Devotion Tier II | The Anchorites | raising a further holy site costs 1 charge |
| Devotion Tier II | The Old Holy Places | +3 culture, +3 faith on every hex with a Holy Site |
| Devotion Tier II | The Saints' Fields | +5 food, +8 gold on every hex with a Holy Site |
| Devotion Tier IV | The Seven Pilgrimages | +1 science and +1 culture in every city working a Holy Site per hex with a Holy Site in your borders (at most +5 each) |
| Doctrine — withdrawn | The Academy | Withdrawn: this Doctrine is from before the decks and is offered to nobody. An empire that took it keeps it, and it still pays what it says. · -10% culture and +20% science in every city · a draft of great scholars may be bought with faith |
| Doctrine — withdrawn | The Gilded Court | Withdrawn: this Doctrine is from before the decks and is offered to nobody. An empire that took it keeps it, and it still pays what it says. · unlocks the Gilded Hall — +6 gold, +2 culture; it is bought with gold and never built; +1 renown per turn, favouring merchants · +1 science, +1 culture on every hex that yields gold · +2 authority capacity |
| Doctrine — withdrawn | The Grand Tour | Withdrawn: this Doctrine is from before the decks and is offered to nobody. An empire that took it keeps it, and it still pays what it says. · +3 renown per turn per wonder you hold · +1 culture per wonder in the world |
| Doctrine — withdrawn | The Muses' Call | Withdrawn: this Doctrine is from before the decks and is offered to nobody. An empire that took it keeps it, and it still pays what it says. · renown earns great people without waiting for Epic Poetry · +1 production on every hex carrying a great person's work |
| Dominion doctrine | The Landsturm | passing on an Order hand grants the best melee unit you can build in every city of 5 or more citizens · +3 combat strength for melee units · +3 combat strength for melee units beside a great general |
| Dominion doctrine | The Strategoi | +30% renown · the yields of every hex with a Citadel are doubled · the strength aura of your great generals is doubled |
| Dominion Tier I | Commission: Clear the Frontier | Commission · Goal: clear 2 barbarian camps. Reward: a great general to call |
| Dominion Tier II | Commission: The Border Fortress | Commission · Goal: spend 1 great person on a Citadel. Reward: +2 food, +2 production on every hex with a Citadel |
| Dominion Tier III | The Bakufu | +25% science and +25% culture in every city with a great general standing in it |
| Dominion Tier III | The Mural Crown | gaining a great person grants +200 science for each great general you have gained this game · gaining a great person grants +200 culture for each great general you have gained this game |
| Dominion Tier III | Up Through the Ranks | one of your units becoming an Elite grants +250 renown, favouring a great general |
| Dominion Tier II | The Citadel Works | +5 science on every hex with a Citadel · +3 renown per turn per hex with a Citadel in your borders, favouring generals |
| Dominion Tier II | The Tactica | your combat units on or beside the hex of one of your great generals gain 1 experience at the end of every turn |
| Dominion Tier II | The Taker of Cities | +5 combat strength for military units when attacking cities and beside a great general |
| Dominion Tier I | The Castle Demesne | +3 food, +3 production on every hex with a Citadel |
| Dominion Tier I | The General Staff | +5 production in every city with a Barracks · +2 renown per turn in every city with a Barracks, favouring generals |
| Dominion Tier IV | Commission: Hold the Capitals | Commission · Goal: hold 2 original capitals other than your own at the same time. Reward: for 20 turns, +25% production in every city, and a great general to call |
| Dominion Tier IV | Commission: The Grand Campaign | Commission · Goal: capture 3 cities. Reward: a great general to call, and science equal to 10 times those cities' total population, and culture equal to 10 times those cities' total population |
| Dominion Tier IV | The Marshalate | your great generals' aura gives +1 more strength for each great general you have gained this game (at most +5) |
| Expansionist doctrine | The Builder Kings | +25% production toward wonders · +2 production on every hex with a Manufactory, for each wonder standing in its town |
| Expansionist doctrine | The Cathedral Lodges | the yields of every hex with a Manufactory are doubled · +30% production toward wonders, in every city with a Manufactory · +30% production toward The Magnum Opus, in every city with a Manufactory |
| Expansionist doctrine | The Georgics | your improvements, tended works and great people's works count as having stood twice as long for your cards · +1 production on every improved hex that has stood at least 20 turns |
| Expansionist Tier III | A Court of Engineers | +50% renown · every great-person offer shows only great engineers, until there are none left to call |
| Expansionist Tier II | The Engineers' Yards | +2 production on every improved hex beside a Manufactory |
| Leader | Hypatia | +25% renown · the works on every hex carrying a great person's work pay +50% |
| Magisterial doctrine | The Barmakids | +1 food and +1 production in every city per great person you have gained this game |
| Magisterial doctrine | The Bourgs | +25% food surplus stored toward growth, in every city working a great person's work |
| Magisterial doctrine | The Choregia | +3 culture in every city per culture building there · +2 renown per turn per culture building you hold |
| Magisterial doctrine | The Escorial | completing a wonder grants a great person to call |
| Magisterial doctrine | The Gobelins | +4% production toward The Magnum Opus per hex carrying a great person's work in your borders (at most +40%) |
| Magisterial doctrine | The Kitabkhana | spending a great person grants +200 renown for each age you have reached |
| Magisterial doctrine | The Peregrini | +1 food, +1 production on every hex beside a great person's work, once for every adjacent hex carrying a great person's work · laying a great person's work makes your next great person cost 20% less |
| Magisterial Tier 0 | The Second Reading | the first reroll of each hand of Orders, Doctrines or great people costs nothing |
| Magisterial Tier I | Commission: The Eighth Wonder | Commission · Goal: complete 1 wonder. Reward: +3 culture per wonder you hold and +5 renown per turn per wonder you hold |
| Magisterial Tier II | Commission: The Patron's Gallery | Commission · Goal: have great-person works of 3 different families in your borders. Reward: a great person to call, and +200 culture |
| Magisterial Tier III | The Divine Proportion | what your other Orders pay on hexes carrying a great person's work is +100% more |
| Magisterial Tier III | The Garden Courts | +20% culture and +20% science in every city working 2 or more hexes carrying a great person's work |
| Magisterial Tier III | The Masters' Domain | +3 food, +3 production on every hex carrying a great person's work |
| Magisterial Tier III | The Roll of Masters | +3% science and +3% culture in every city per great person you have gained this game (at most +30% each) |
| Magisterial Tier III | The Universal Genius | your great people may act, and then still lay their work |
| Magisterial Tier II | Letters Patent | a great person's act pays +50% |
| Magisterial Tier II | The Honoured Dead | Scaler · Gains +2 science and +4 production in your capital each time you spend a great person |
| Magisterial Tier II | The Quarter of Masters | the works on every hex carrying a great person's work beside a great person's work pay +100% |
| Magisterial Tier II | The Sed Festival | adopting a government grants a great person to call |
| Magisterial Tier II | The Senate Charter | unlocks the Assembly Hall — +1 science and +1 culture per wildcard Order you have seated; +2 authority capacity; +1 renown per turn, favouring scholars · +3 happiness and +30% production toward buildings, in every city with an Assembly Hall |
| Magisterial Tier II | The Symposium | gaining a great person deals you a free Order hand at once |
| Magisterial Tier I | The Landmark Bounds | a great person laying a work claims every unowned hex beside it for your nearest city |
| Magisterial Tier I | The Laureate | +3 science, +5 culture in every city working a great person's work |
| Magisterial Tier I | The Overseers of Works | gaining a great person grants +100 production to your capital for each age you have reached |
| Magisterial Tier I | The Wandering Muse | Boon · On draft: you gain a great person to call |
| Magisterial Tier I | The Workshop at Olympia | +3 renown per turn per wonder you hold |
| Magisterial Tier IV | The Grand Retrospective | Boon · On draft: +20 culture, +20 science and +20 production in your capital for each wonder you hold, each hex carrying a great person's work in your borders and each Order you hold, seated or not |
| Magisterial Tier IV | The Immortals | the legacy of each great person you have spent counts twice |
| Magisterial Tier IV | The Last Commission | spending a great person (at most once a turn, only while you are building the Magnum Opus) grants +150 production to your city raising the Magnum Opus |
| Magisterial Tier IV | The Processional Way | +3 science, +3 culture on every hex carrying a great person's work in a straight line of 3 or more such works in your borders |
| Scientific doctrine | The Külliye | you may build more than one copy of an empire building, in a city with an Academy · +50% production toward empire buildings, except the Magnum Opus and its works |
| Scientific doctrine | The Pandidakterion | the yields of every hex with an Academy are doubled, after every other change to the hex |
| Scientific doctrine | The Peripatetic School | +2 production, +2 science on every hex with an Academy · science buildings and wonders give +30% renown |
| Scientific doctrine | The Platonic Academy | your great people of every family found an Academy as their work, in place of their own |
| Scientific Tier 0 | The Royal Tutors | +2 renown per turn in every city, per building there that supplies science, favouring scholars |
| Scientific Tier III | The Doctorate | gaining a great scholar grants 8 extra turns of culture |
| Scientific Tier III | The Nizamiyya | the yields of every hex with an Academy are +50% |
| Scientific Tier II | The Invitations | completing a building (an empire building) grants a great scholar to call |
| Scientific Tier II | The Latin Quarter | +1 production, +2 culture on every hex carrying a great person's work beside an Academy |
| Scientific Tier II | The Paper-Makers' Charter | Charter · opens Papermaking for you to research · Papermaking lets you build the Scriptorium: +2 science; +10% science in every city with a Scriptorium with an Academy; +2 renown per turn, favouring scholars |
| Scientific Tier II | The Quiet Faculties | +25% food and +20% production in every city working an Academy |
| Scientific Tier II | The Roll of Scholars | +4% production and +4% culture per great scholar you have gained this game (at most +28% each) |
| Scientific Tier II | The Royal Charter Commission | Commission · Goal: complete 1 charter technology. Reward: a great scholar to call, and +100 culture |
| Scientific Tier II | The Strategikon | +4 combat strength while within 2 hexes of your Academy |
| Scientific Tier I | The Forward Plans | unlocks the University — +1 science for every citizen; +2 renown per turn, favouring scholars |
| Scientific Tier I | The Founding Gift | a great scholar founding an Academy grants +150 production |
| Scientific Tier I | The Librarians' Charter | Charter · opens Cataloguing for you to research · Cataloguing lets you build the Mouseion: +4 renown per turn, favouring scholars; +2 culture per empire building you hold |
| Scientific Tier I | The Old Academy | +3 food, +3 production on every hex with an Academy |
| Scientific Tier I | The Scholars' Fame | completing a technology grants renown equal to 5% of the science it cost you, favouring a great scholar |
| Scientific Tier IV | The Lynx-Eyed Academy | Commission · Goal: hold 4 Academies inside your borders. Reward: a great scholar to call, and +300 production in every city with an Academy |
| Scientific Tier IV | The Military Engineers' Charter | Charter · opens Military Architecture for you to research · Military Architecture lets you build the Bastion: +5 to the city’s defence strength; +30 to how much punishment the city can take; +1 renown per turn, favouring engineers |
| Scientific Tier IV | The Republic of Letters | +4 production and +4 culture in your capital per hex with an Academy in your borders |

- Magisterial pass (ready for the build): The Hanlin Academy (people cost 20% less renown; works +2 science), The Spirit Way (wonders count as works), Letters Patent (acts pay double), The Honoured Dead (+8 science and +8 production in the capital for each person gained), The Encyclopedia, The Golden Age, The Hall of Heroes (+1 strength for each person gained), The Last Commission (150 production to the Opus for each age), The Nine Jewels, Commission: The Paradise Garden (work yields doubled), The Processional Way.
- Dominion pass: The Castle Demesne (+5 food, +5 production), The Citadel Works (+8 science, +8 general renown), Commission: The Border Fortress (reward: a great general), The Grass Crown (200 renown toward generals on a capture, doubled for a wonder city), The Bakufu (a town with a Citadel: +25% production, science and culture), The Master of Soldiers (boon: a great general).
- Generic set: The Office of Works (boon: a great engineer).
- Wonders: Solomon’s Temple (+1 choice in every great person offer; people cost 10% less renown), The Great Library (a great scholar; Academies +2 science for each scholar gained), The Mausoleum (work yields doubled; +5 renown toward engineers), The Library of Ashurbanipal (renown toward scholars), The Alhambra (a great general), The Oracle (+3 renown, no family).

### Is each reader fed?

| What is read | By | Supply |
|---|---|---|
| Any person gained or spent | The Encyclopedia, The Honoured Dead, The Golden Age, The Hall of Heroes, The Overseers of Works, The Symposium, The Roll of Masters, The Last Commission, The Immortals, The Barmakids, The Kitabkhana, The Mural Crown | 7 to 9 people by turn 150. Enough. Two cards are now stronger than their pass worked out: The Hall of Heroes and The Honoured Dead. |
| Scholars and Academies | 17 Orders and 4 Doctrines of Scientific, The Great Library, The Monastic University, The House of Wisdom, Merchant Scholars | 19 scholars today (3 in Æra II). 24 after the pass. The Invitations can use them fastest. |
| Generals and Citadels | 12 Orders and 2 Doctrines of Dominion, The Alhambra | 16 generals today, 4 in each age: a second narrowed hand in an age spills. 24 after the pass. |
| Engineers and Manufactories | The Engineers’ Yards, The Builder Kings, The Cathedral Lodges, A Court of Engineers, The Office of Works | 14 engineers today (2 in Æra II). 20 after the pass. A Court of Engineers can use 7 to 9 in one seat. |
| Merchants and Customs Houses | The Customs Houses, The Customs Service, A Court of Merchants, The Strongroom, Merchant Princes, The Sogdian Colonies | 15 merchants today (2 in Æra II). 21 after the pass. |
| Artists and Landmarks | none | 14 artists today (2 in Æra III). 20 after the pass. See S8. |
| Works of any kind | The Masters’ Domain, The Laureate, The Quarter of Masters, The Garden Courts, The Divine Proportion, The Processional Way, The Sculpted Landscape, The Latin Quarter, Looted Art, The Peregrini, The Bourgs, The Gobelins, The Georgics, Hypatia the leader, The Mausoleum | A seat lays few works, because the act is better. S3 and The Universal Genius are the supply. Holy Sites count, so Devotion with Magisterial has the most works. |

### Does anything run away?

- **The Spirit Way stack** (about +370 a turn at its top). One person adds to it: Benjamin of Tudela, +3 on each wonder, so +12 on four wonders and +36 if both doublers reach a legacy’s line (S11). The Immortals doubles that. No other person pays on the plain work test. Under S3 the real works in the stack pay more, about +50 for two works under three doublers.
- **The act stack.** Letters Patent, Leonardo and The Immortals together triple an act. S10 limits it to double.
- **The Immortals** counts every legacy twice. With eight legacies at this pass’s bar it pays about +240 to +480 a turn in Æra IV, for a rare of the last tier whose headline is 200 or more. It is the reason not to raise the legacy bar further.
- **The price cuts.** The Hanlin Academy, Solomon’s Temple and The Peregrini together cut a person’s price by half: about 12 people by turn 150 for one seat. Six seats can then empty today’s 78 names. With the additions the roster has 113.

## Everyone in the game

Verdicts: fine, weak, strong, odd (the effect does not fit the person or the family), dull (a plain effect with no character). The arithmetic uses the bots’ medians for the age the person is dealt in after S1 and S2. “Ruled 2026-11-12” marks a row you set in batch GP1; I left those alone unless I say why.

| Person | Family | Age | Rating | Who they were | Legacy today | Verdict | Change |
|---|---|---|---|---|---|---|---|
| Imhotep | Scholar, moves to engineer | Æra II | ◆ strong | Vizier, physician, the first architect with a name. | +10% production toward wonders | odd | C01 |
| Ahmes | Scholar | Æra II | ○ situational | The scribe of the Rhind papyrus, and its opening line. | +2 science in every city on fresh water | fine |  |
| Kidinnu | Scholar | Æra II | ● defining | Babylonian astronomer; the lunar tables. | +15% science in your capital | weak | C02 |
| Enheduanna | Artist | Æra II | ◆ strong | The first author to sign her name. | +1 culture in every city with a Shrine | weak | C03 |
| Homer | Artist | Æra II | ● defining | The bard. | +2 on every hex carrying a great person's work — science on an Academy, culture on a Landmark, production on a Manufactory, gold on a Customs House and production on a Citadel | weak | C04 |
| Sin-lēqi-unninni | Artist | Æra II | ◆ strong | Compiler of the standard Gilgamesh. | +50% production toward Amphitheaters | dull | C05 |
| Ilimilku | Artist | Æra II | ○ situational | The Ugaritic scribe of the Baal cycle. | +1 production, +1 culture in every coastal city | fine |  |
| Amenhotep son of Hapu | Engineer | Æra II | ○ situational | The deified overseer of works. | +15% production toward wonders, in your capital | weak | C06 |
| Bezalel | Engineer | Æra II | ○ situational | The tabernacle's artisan. | +1 production in every city with a Temple | weak | C07 |
| Ea-nāṣir | Merchant | Æra II | ● defining | The complaint tablets; the wunderkammer's patron. | -1 production, +3 gold on every hex with a Mine | odd | C08 |
| Lamassī | Merchant | Æra II | ○ situational | The merchant's wife whose letters survive. | +1 gold on every hex with a Pasture | weak | C09 |
| Ahmose son of Ebana | General | Æra II | ◆ strong | The soldier's tomb autobiography. | +10% combat strength for melee units | dull | C10 |
| Piyamaradu | General | Æra II | ● defining | The Hittite-Mycenaean freebooter. | +3 combat strength outside your territory · -2 authority capacity | weak | C11 |
| Sinuhe | General | Æra II | ○ situational | The exile who fought for Retjenu and came home. | all units: +5 healing per turn | fine |  |
| Deborah | General | Æra II | ○ situational | The judge who led at Kishon. | +4 combat strength within 2 hexes of one of your cities | fine | C12 |
| Sappho | Artist | Æra II | ◆ strong | The fragment. | +3 culture in your capital · +1 happiness | fine |  |
| Epicurus | Scholar | Æra III | ◆ strong | Athenian of the Garden; pleasure read as the absence of pain. | -15% happiness demanded per citizen, in every city of 10 or more citizens | weak | C13 |
| Aristotle | Scholar | Æra III | ● defining | Founder of the Lyceum; logic, physics, politics, the first library of everything. | your buildings that supply science pay +25% | fine |  |
| Hemiunu | Engineer | Æra III | ● defining | The Great Pyramid's overseer. | +25% production toward wonders · -2 happiness in every city while it is building a wonder | fine |  |
| Ptahhotep | Scholar | Æra III | ○ situational | The Maxims, the oldest book of advice. | +1 authority capacity per 2 Libraries | fine |  |
| Archimedes | Scholar, moves to engineer | Æra III | ● defining | Syracuse. | siege units: +1 movement · +3 combat strength for siege units | odd | C14 |
| Hypatia | Scholar | Æra III | ● defining | Alexandria. | +10% science in every city · lost the first turn your happiness goes negative | fine | C15 |
| Zhang Heng | Scholar | Æra III | ◆ strong | The seismoscope. | +1 gold per building in your cities that supplies science | fine |  |
| Eratosthenes | Scholar | Æra III | ○ situational | The circumference. | +1 science per 80 hexes you have revealed | fine |  |
| Qu Yuan | Artist | Æra III | ● defining | The poet of the Chu Ci. | +10% culture in every city · -5 happiness in your capital | weak | C16 |
| Phidias | Artist | Æra III | ○ situational | The Parthenon's sculptor. | +3 culture per wonder you hold | fine |  |
| Li Bing | Engineer | Æra III | ○ situational | Dujiangyan. | +1 production on every hex with a Farm beside fresh water, in every city with an Aqueduct | odd | C17 |
| Dinocrates | Engineer | Æra III | ◆ strong | The planner of impossible wonders; Alexandria laid out in a cloak-sweep. | completing a wonder grants +3 production in every city for 10 turns | fine |  |
| Vitruvius | Engineer | Æra III | ◆ strong | The ten books. | Aqueducts supply +1 happiness · Granaries supply +1 happiness | strong | C18 |
| Eupalinos | Engineer | Æra III | ○ situational | Samos. | +1 food on every improved hex beside a mountain | fine |  |
| Zhang Qian | Merchant | Æra III | ◆ strong | The Silk Road's envoy. | +2 gold per 80 hexes you have revealed | fine |  |
| Nanaivandak | Merchant | Æra III | ◆ strong | The Sogdian Ancient Letters, found sealed at Dunhuang. | each connected city pays +2 gold | fine |  |
| Hippalus | Merchant | Æra III | ○ situational | The monsoon. | +1 gold on every hex with a Fishing Boat | weak | C19 |
| Crassus | Merchant | Æra III | ● defining | The fire brigade; Carrhae. | all units and buildings cost −20% to buy · buying anything costs your empire -1 happiness for 10 turns | fine |  |
| Pytheas | Merchant | Æra III | ○ situational | Massalia to Thule. | trader units: +1 sight · your trade units cannot be attacked or plundered | dull | C20 |
| Hannibal | General | Æra III | ● defining | The Alps. | +5 combat strength when attacking outside your territory · -4 combat strength when defending inside your territory | fine |  |
| Gaius Marius | General | Æra III | ◆ strong | Consul seven times; the legions that shouldered their own kit. | all units: +1 movement inside your territory | fine |  |
| Boudica | General | Æra III | ○ situational | The rising. | +4 combat strength when defending inside your territory · lost when the age it was earned in closes | weak | C21 |
| Spartacus | General | Æra III | ○ situational | Vesuvius. | +5 combat strength when attacking an empire with more cities than you | fine |  |
| Ibn Sīnā | Scholar | Æra III | ◆ strong | The Canon of Medicine. | +1 happiness in every city | fine |  |
| al-Khwārizmī | Scholar | Æra IV | ◆ strong | al-jabr. | +10% faith in every city with a University · you may buy buildings that supply science with faith | fine |  |
| Maimonides | Scholar | Æra IV | ◆ strong | Physician to a sultan's court, and the Guide for the Perplexed. | +1 happiness per 2 buildings in your cities that supply science | strong | C22 |
| Roger Bacon | Scholar | Æra IV | ◆ strong | Franciscan friar of Oxford; optics, the calendar, and a plea for experiment. | completing a technology grants +15% food in every city; +15% production in every city for 3 turns | fine |  |
| Āryabhaṭa | Scholar | Æra IV | ○ situational | The Āryabhaṭīya. | +1 faith in every city per building there that supplies science | fine |  |
| Murasaki Shikibu | Artist | Æra IV | ◆ strong | The Tale of Genji. | +4 culture per melee unit in the field | odd | C23 |
| Rūmī | Artist | Æra IV | ○ situational | The Masnavi. | your Temples pay +100%, counted after every other bonus on them | fine |  |
| Sei Shōnagon | Artist | Æra IV | ○ situational | The Pillow Book. | +5% culture in every city per unique luxury there | fine |  |
| al-Jazarī | Engineer | Æra IV | ◆ strong | The automata. | your buildings that supply production pay +40%, counted after every other bonus on them | fine |  |
| Su Song | Engineer | Æra IV | ○ situational | The water clock. | +1 production, +1 science on every hex with a Mine, in every city with a Workshop | fine |  |
| Villard de Honnecourt | Engineer | Æra IV | ◆ strong | The sketchbook. | +15% production toward wonders | dull | C24 |
| Benjamin of Tudela | Merchant | Æra IV | ◆ strong | The Itinerary. | +2 gold, +1 culture on every hex carrying a great person's work | fine |  |
| Ibn Baṭṭūṭa | Merchant | Æra IV | ○ situational | The Rihla. | +5% culture per other empire you trade with | fine | C25 |
| Marco Polo | Merchant | Æra IV | ○ situational | The Travels. | +1 gold per 5 hexes between the two cities | weak | C26 |
| Francesco Datini | Merchant | Æra IV | ◆ strong | The merchant of Prato's ledgers. | +2 gold on every hex carrying a resource, in every city with a Bank | fine |  |
| Subutai | General | Æra IV | ● defining | The Mongol strategist. | mounted units: +1 movement · +2 combat strength for mounted units | fine |  |
| Tomoe Gozen | General | Æra IV | ◆ strong | The Heike. | +3 combat strength for mounted units · +3 combat strength for ranged units | fine |  |
| Jan Žižka | General | Æra IV | ○ situational | The Hussite wars. | +5 combat strength when defending while fortified | fine |  |
| El Cid | General | Æra IV | ○ situational | Valencia. | +6 combat strength in a city you captured | weak | C27 |
| Mimar Sinan | Engineer | Æra IV | ○ situational | The Süleymaniye. | +2 production, +2 culture in every city with a Temple | fine |  |
| Paracelsus | Scholar | Æra V, moves to Æra IV (S2) | ● defining | The alchemist-physician. | +15% science and -1 happiness in every city | fine |  |
| Tycho Brahe | Scholar | Æra V, moves to Æra IV (S2) | ○ situational | Uraniborg. | +2 science on every hill hex beside a mountain | fine |  |
| John Dee | Scholar | Æra V, moves to Æra IV (S2) | ◆ strong | The magister's own magister. | +1 card in every offer of every kind | odd | C28 |
| Copernicus | Scholar | Æra V, moves to Æra IV (S2) | ◆ strong | De revolutionibus. | +4 science in every city | dull | C29 |
| Christine de Pizan | Artist | Æra V, moves to Æra IV (S2) | ◆ strong | The first professional woman of letters. | +3 culture in your capital · +1 authority capacity | weak | C30 |
| Dürer | Artist | Æra V, moves to Æra IV (S2) | ○ situational | The woodcuts. | +2 culture per wonder you hold · your wonders pay +50% | fine |  |
| Bashō | Artist | Æra V | ○ situational | The narrow road. | +1 culture on every forest or jungle hex | fine |  |
| Sor Juana | Artist | Æra V | ○ situational | The tenth muse of Mexico. | +1 science, +1 culture on every hex carrying a resource, in every city with a University | fine |  |
| Leonardo | Engineer | Æra V, moves to Æra IV (S2) | ● defining | The notebooks. | +20% production toward wonders · a great person's act pays +50% | fine |  |
| Taqī al-Dīn | Engineer | Æra V, moves to Æra IV (S2) | ◆ strong | The Istanbul observatory. | +20% science in your capital | odd | C31 |
| Vaucanson | Engineer | Æra V | ○ situational | The mechanical duck. | newly created workers gain +2 charges | fine |  |
| Jakob Fugger | Merchant | Æra V, moves to Æra IV (S2) | ● defining | The Fugger bank. | +20% gold in every city · -1 authority capacity per 3 cities you hold · all units and buildings cost −10% to buy | fine |  |
| Willem Beukelszoon | Merchant | Æra V, moves to Æra IV (S2) | ◆ strong | The Zeeland fisherman said to have taught the herring its barrel. | the works on every hex with a Fishing Boat pay +100% | fine |  |
| Gracia Mendes Nasi | Merchant | Æra V, moves to Æra IV (S2) | ◆ strong | The House of Mendes. | +3 authority capacity · +1 happiness per spare authority · +5 gold per spare authority | fine |  |
| Cosimo de' Medici | Merchant | Æra V, moves to Æra IV (S2) | ○ situational | The bank that bought a Renaissance. | +1 culture per 100 gold you have spent buying | strong | C32 |
| Gustavus Adolphus | General | Æra V | ◆ strong | Breitenfeld. | +15% combat strength for ranged units · siege units: +1 movement | fine |  |
| Nzinga of Ndongo | General | Æra V, moves to Æra IV (S2) | ○ situational | The forty-year war. | +5 combat strength when defending in forest · +5 combat strength when defending in jungle | fine |  |
| Yi Sun-sin | General | Æra V, moves to Æra IV (S2) | ○ situational | Myeongnyang. | +5 combat strength for ships | fine |  |
| Lautaro | General | Æra V, moves to Æra IV (S2) | ○ situational | The Mapuche toqui. | +5 combat strength against mounted units | fine |  |
| Senenmut (retired) | Engineer | Æra II | ◆ strong | Hatshepsut's architect. | +10% production toward buildings | retired |  |
| Kushim (retired) | Merchant | Æra II | ◆ strong | The first named person in writing — an accountant. | +1 gold in every city with a Granary | retired |  |
| Aššur-idī (retired) | Merchant | Æra II | ○ situational | Old Assyrian trader of the Kanesh letters. | +1 gold in every city but your capital | retired |  |
| Sima Qian (retired) | Artist | Æra III | ○ situational | The Grand Historian. | +1 culture in every city per age that has closed | retired |  |
| Han Xin (retired) | General | Æra III | ◆ strong | Jingxing. | +2 combat strength beside fresh water · +2 combat strength on the coast | retired |  |
| Shen Kuo (retired) | Scholar | Æra IV | ○ situational | The Dream Pool Essays. | +2 science per improved strategic resource | retired |  |
| Snorri Sturluson (retired) | Artist | Æra IV | ● defining | The Edda, the Heimskringla. | losing a unit grants +15 culture · losing a unit grants +15 faith · -2 authority capacity | retired |  |
| Zheng He (retired) | Merchant | Æra V | ◆ strong | The treasure fleet. | +3 gold in every coastal city · all units: +2 movement while embarked | retired |  |

Every person also has the family’s act and work, printed above.

### The arithmetic, one line a person

- **Imhotep** (odd). One wonder of 292 to 382 production about every 30 turns: 10% is 1 to 2 production a turn. A builder’s clause on a scholar; four engineers carry the same clause.
- **Ahmes** (fine). Four to six towns, about two in three on fresh water: +6 to +8 science, when a seat makes 30.
- **Kidinnu** (weak). The capital makes about 15 science in Æra II: +15% is +2. Marked defining, and it has no cost.
- **Enheduanna** (weak). Four to six Shrines: +4 to +6 culture.
- **Homer** (weak). A seat has one or two works in Æra II: +2 to +4. Six or more works late: +12. It names five kinds of work, so it pays nothing on a Holy Site.
- **Sin-lēqi-unninni** (dull). An Amphitheater costs about 80 to 100 production: five of them save 200 to 250 over the game, 2 or 3 a turn. Approved on 2026-11-12, but then it was never dealt in the age it belongs to.
- **Ilimilku** (fine). Two to four coastal towns: +4 to +8. Right for a situational row on a coast.
- **Amenhotep son of Hapu** (weak). +15% toward wonders in one town: about 1.5 production a turn. The fourth legacy that only adds a wonder percentage.
- **Bezalel** (weak). Three to five Temples: +3 to +5 production.
- **Ea-nāṣir** (odd). Ten Mines: −10 production, +30 gold. Gold buys at 4 for 1 production, so the trade loses about 2 production in buying power. The joke is right; the deal is a trap.
- **Lamassī** (weak). Three to five Pastures: +3 to +5 gold.
- **Ahmose son of Ebana** (dull). +10% of 30 to 35 strength is +3: a regular war line for the age.
- **Piyamaradu** (weak). +3 is 10% of the age’s strength, and only abroad. −2 authority is most of a town.
- **Sinuhe** (fine). Every unit heals 5 more a turn, at war and at peace. Useful and plain.
- **Deborah** (fine). +4 near your own cities is 12% of the age’s strength: a strong home line.
- **Sappho** (fine). +3 culture is 12% of a seat’s 25 culture, and +1 happiness. Right for the age.
- **Epicurus** (weak). Few towns reach 10 citizens in Æra III. A town of 10 asks for about 10 happiness: −15% is 1.5.
- **Aristotle** (fine). Science buildings supply about 25 to 30 science in Æra III: +7. In Æra IV about 150: +37. Ruled 2026-11-12. It grows into its rating.
- **Hemiunu** (fine). A wonder of 501 to 860 about every 30 turns: +25% is 5 or 6 production a turn, and a town that builds one loses 2 happiness. Ruled 2026-11-12.
- **Ptahhotep** (fine). Six to eight Libraries: +3 or +4 authority, which is most of one more town.
- **Archimedes** (odd). A fair war row. But a scholar writes a treatise and founds an Academy, and this man built the engines of Syracuse.
- **Hypatia** (fine). +10% of 106 science is +10 in Æra III and +49 in Æra IV, lost if happiness goes negative. A fair bargain.
- **Zhang Heng** (fine). Eight to twelve science buildings: about +10 gold, and +30 in Æra IV. Your wording of 2026-11-12.
- **Eratosthenes** (fine). 400 to 800 hexes revealed: +5 to +10 science. You ruled “keep at 80”.
- **Qu Yuan** (weak). +10% of 83 culture is +8, for −5 happiness in the capital. The cost is larger than the gain until Æra IV.
- **Phidias** (fine). Two to four wonders: +6 to +12 culture; six wonders late: +18. It feeds the monuments theme.
- **Li Bing** (odd). Three conditions in one line: a Farm, fresh water, and an Aqueduct in the town. About ten such hexes once the Aqueducts stand.
- **Dinocrates** (fine). Eight towns × 3 production × 10 turns is 240 for each wonder, about 8 a turn. Note: the row’s id is heroOfAlexandria and its name is Dinocrates.
- **Vitruvius** (strong). Six to eight towns with both buildings: +12 to +16 happiness. Ibn Sīnā gives +6 to +10 with no building.
- **Eupalinos** (fine). From 0 to about 10 hexes, by the map. A fair situational row.
- **Zhang Qian** (fine). 400 to 800 hexes revealed: +10 to +20 gold. You ruled “keep at 80”.
- **Nanaivandak** (fine). Five to nine connected towns: +10 to +18 gold.
- **Hippalus** (weak). Three to six Fishing Boats: +3 to +6 gold.
- **Crassus** (fine). A seat that spends 47 gold a turn saves about 9; in Æra IV about 60. Each purchase costs 1 happiness for 10 turns. Ruled 2026-11-12.
- **Pytheas** (dull). +1 sight on a trader changes nothing a player does. The second clause matters only when someone raids.
- **Hannibal** (fine). +5 is the age’s regular line, on the attack abroad; −4 at home is a true cost.
- **Gaius Marius** (fine). +1 movement at home for every unit, workers and settlers too. The one general who helps at peace.
- **Boudica** (weak). +4 is under the age’s regular +5, only on defence, and it is lost at the next age: about 40 to 60 turns.
- **Spartacus** (fine). +5 on the attack against a wider empire. Ruled 2026-11-12.
- **Ibn Sīnā** (fine). Six to ten towns: +6 to +10 happiness. Plain, and every seat wants it.
- **al-Khwārizmī** (fine). +10% of 128 faith is about +8, and faith may buy Libraries and Universities. A bridge between Devotion and Scientific.
- **Maimonides** (strong). Twelve towns with three science buildings each: 36 buildings, +18 happiness. Ibn Sīnā gives +12 at the same size.
- **Roger Bacon** (fine). A technology about every 7 turns, so it is on for 3 turns in 7: about +6% food and production, 55 to 65 a turn. Ruled 2026-11-12.
- **Āryabhaṭa** (fine). About 36 science buildings: +36 faith, when a seat makes 128. Ruled 2026-11-12.
- **Murasaki Shikibu** (odd). Six to ten melee units: +24 to +40 culture. The author of a court romance pays for soldiers, and your Dominion ruling avoids pay that grows with an army held at peace.
- **Rūmī** (fine). Twelve Temples at about 4 yield each: +48, most of it faith.
- **Sei Shōnagon** (fine). One or two luxuries near a town: +5% or +10% culture there, about +15 in all.
- **al-Jazarī** (fine). Twelve towns × about 8 production from buildings × 40%: +38. Ruled 2026-11-12.
- **Su Song** (fine). About 20 Mines in Workshop towns: +20 production and +20 science. The wonder The Water Clock of Su Song shares his name; the wonders review marks it outdated.
- **Villard de Honnecourt** (dull). A wonder of 1,127 to 1,934 about every 30 turns: +15% is 7 a turn. The fifth legacy that only adds a wonder percentage.
- **Benjamin of Tudela** (fine). Four to six works: +12 to +18. It reads Holy Sites, and wonders under The Spirit Way, at +3 each.
- **Ibn Baṭṭūṭa** (fine). Two or three trading partners: +10% to +15% of 442 culture, +44 to +66. At the top of the bar.
- **Marco Polo** (weak). Routes of 10 to 20 hexes: +2 to +4 gold each, +8 to +24 in all, when a seat makes 298 gold.
- **Francesco Datini** (fine). About 30 resource hexes in Bank towns: +60 gold.
- **Subutai** (fine). Your figures of 2026-11-12. +1 movement on the fastest units is the strong half.
- **Tomoe Gozen** (fine). Your figures of 2026-11-12: +3 on two kinds of unit.
- **Jan Žižka** (fine). +5 on a fortified defender, against the age’s regular +6. The wagon fort.
- **El Cid** (weak). It reads only a unit that stands in a captured city: one or two units, and only if that city is attacked. Ruled 2026-11-12 at +6.
- **Mimar Sinan** (fine). Twelve Temples: +24 production and +24 culture. Ruled 2026-11-12.
- **Paracelsus** (fine). +15% of 494 science is +74, for −1 happiness in each of 12 towns. Above the bar, and paid for. Ruled 2026-11-12.
- **Tycho Brahe** (fine). From 0 to 10 hexes, by the map: up to +20 science.
- **John Dee** (odd). One more card in every offer of every kind. It changes hands of cards, not the board, and Solomon’s Temple now widens great person offers too.
- **Copernicus** (dull). Twelve towns: +48 science. Right for the age, and it says nothing about him. Ruled 2026-11-12.
- **Christine de Pizan** (weak). +3 culture when a seat makes 442. The authority is the real half.
- **Dürer** (fine). Six wonders: +12 culture, and wonders that pay 8 to 10 each pay half again, about +25.
- **Bashō** (fine). About 30 forest and jungle hexes: +30 culture. Stays in Æra V (S2).
- **Sor Juana** (fine). About 30 resource hexes in University towns: +30 science and +30 culture. Stays in Æra V (S2).
- **Leonardo** (fine). +20% toward wonders is about 10 a turn. The act clause is worth four turns of science or culture for each later person. See S10 for the stack with Letters Patent.
- **Taqī al-Dīn** (odd). A capital that makes 80 to 100 science: +18. A scholar’s clause on an engineer, and under the bar. Ruled 2026-11-12.
- **Vaucanson** (fine). Workers with two more charges. Plain and useful. Stays in Æra V (S2).
- **Jakob Fugger** (fine). +20% of 298 gold is +60, and purchases cost 10% less. −4 authority at twelve towns is a town or more. Ruled 2026-11-12.
- **Willem Beukelszoon** (fine). Six Fishing Boats that pay 2 each: +12. Small for the age, and you cut it to this on 2026-11-12. With Hippalus a coast seat has a pair.
- **Gracia Mendes Nasi** (fine). With three spare authority: +3 happiness and +15 gold. With six: +6 and +30. It rewards a small empire. Ruled 2026-11-12.
- **Cosimo de' Medici** (strong). A Commerce seat spends 300 gold a turn: +3 culture more every turn, +60 after 20 turns, +150 after 50, with no limit.
- **Gustavus Adolphus** (fine). +15% on ranged units is +7 to +12. Stays in Æra V (S2).
- **Nzinga of Ndongo** (fine). +5 on defence in forest and jungle. A fair situational row.
- **Yi Sun-sin** (fine). +5 on every ship: a fair line for a sea war, and nothing without one.
- **Lautaro** (fine). +5 against mounted units. Ruled 2026-11-12.

### The retired rows

- **Senenmut** (engineer, Æra II): +10% production toward buildings. Cut by the user in the pass of 2026-09-09 (flags-log, item (lll)). No reason is written down.
- **Kushim** (merchant, Æra II): +1 gold in every city with a Granary. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Aššur-idī** (merchant, Æra II): +1 gold in every city but your capital. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Sima Qian** (artist, Æra III): +1 culture in every city per age that has closed. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Han Xin** (general, Æra III): +2 combat strength beside fresh water · +2 combat strength on the coast. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Shen Kuo** (scholar, Æra IV): +2 science per improved strategic resource. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Snorri Sturluson** (artist, Æra IV): losing a unit grants +15 culture · losing a unit grants +15 faith · -2 authority capacity. Cut by the user in the pass of 2026-09-09. No reason is written down.
- **Zheng He** (merchant, Æra V): +3 gold in every coastal city · all units: +2 movement while embarked. Cut by the user in the pass of 2026-09-09. No reason is written down. Zheng He is a leader today, which may be the reason.

## The numbered changes to people

### C01. Imhotep (odd)

- **Now:** +10% production toward wonders
- **Proposed:** Engineer family. +15% production toward wonders · +3 science per wonder you hold
- **Shape:** existing (productionBonus; pays, empire, count wonders)
- **Why:** The first architect belongs with the builders. Two wonders pay 6 science and about 2 production; it grows with the wonder plan.

### C02. Kidinnu (weak)

- **Now:** +15% science in your capital
- **Proposed:** +4 science in your capital · +15% science in your capital
- **Shape:** existing (pays, city, trueCapital; percentYields)
- **Why:** About +7 science. Rating becomes strong, since nothing is paid for it.

### C03. Enheduanna (weak)

- **Now:** +1 culture in every city with a Shrine
- **Proposed:** +1 culture and +1 faith in every city with a Shrine
- **Shape:** existing (pays, city, hasBuilding)
- **Why:** She was high priestess of Ur. About +10, and the first artist that Devotion wants.

### C04. Homer (weak)

- **Now:** +2 on every hex carrying a great person's work — science on an Academy, culture on a Landmark, production on a Manufactory, gold on a Customs House and production on a Citadel
- **Proposed:** +3 on every hex carrying a great person’s work, in the work’s own yield (faith on a Holy Site)
- **Shape:** existing (pays, hex; one more row for the Holy Site)
- **Why:** Keeps your reading of “each work’s own voice”. It still names each kind, so it never pays on a wonder under The Spirit Way.

### C05. Sin-lēqi-unninni (dull)

- **Now:** +50% production toward Amphitheaters
- **Proposed:** +2 culture in every city with an Amphitheater
- **Shape:** existing (pays, city, hasBuilding)
- **Why:** Five Amphitheaters pay +10 culture for the rest of the game. The player sees it on every city.

### C06. Amenhotep son of Hapu (weak)

- **Now:** +15% production toward wonders, in your capital
- **Proposed:** +4 production in your capital · +15% production toward wonders, in your capital
- **Shape:** existing (pays, city, trueCapital; productionBonus)
- **Why:** About +6 production, in a capital that makes 15 to 20. It now helps a seat that builds no wonder.

### C07. Bezalel (weak)

- **Now:** +1 production in every city with a Temple
- **Proposed:** +1 production and +1 faith in every city with a Temple
- **Shape:** existing (pays, city, hasBuilding)
- **Why:** About +8 to +10. A second early row for Devotion.

### C08. Ea-nāṣir (odd)

- **Now:** -1 production, +3 gold on every hex with a Mine
- **Proposed:** +2 gold on every hex with a Mine · −2 happiness
- **Shape:** existing (pays, hex; happiness)
- **Why:** The copper sells, and the complaints arrive. About +20 gold when a seat makes 19, with a cost a player can read.

### C09. Lamassī (weak)

- **Now:** +1 gold on every hex with a Pasture
- **Proposed:** +1 gold on every hex with a Pasture · +2 gold on every trade route you send
- **Shape:** existing (pays, hex; pays, route)
- **Why:** Her cloth went to Kanesh by caravan. About +8, and it reads the routes that Commerce builds from this age.

### C10. Ahmose son of Ebana (dull)

- **Now:** +10% combat strength for melee units
- **Proposed:** +10% combat strength for melee units · each kill grants +10 gold
- **Shape:** existing (unitStat; windfallRider, kill, gold)
- **Why:** “I took a hand. I was given gold.” The second clause is the man.

### C11. Piyamaradu (weak)

- **Now:** +3 combat strength outside your territory · -2 authority capacity
- **Proposed:** +4 combat strength outside your territory · −2 authority capacity
- **Shape:** existing (combatLine; authority)
- **Why:** A defining row with a real cost must beat the regular line of +3.

### C12. Deborah (fine)

- **Now:** +4 combat strength within 2 hexes of one of your cities
- **Proposed:** No change to the effect. A question of the name only: see “Names to check”.
- **Shape:** data (name, epigram, kernel)
- **Why:** Jewish tradition counts Deborah among the prophetesses. I held my additions to “no prophet of a living faith”; you decide if that rule reaches this row.

### C13. Epicurus (weak)

- **Now:** -15% happiness demanded per citizen, in every city of 10 or more citizens
- **Proposed:** −15% happiness demanded per citizen, in every city of 8 or more citizens
- **Shape:** data (the scope’s value, 10 to 8)
- **Why:** Your row and your figure; only the size of town moves, so that it pays in the age it is dealt.

### C14. Archimedes (odd)

- **Now:** siege units: +1 movement · +3 combat strength for siege units
- **Proposed:** Engineer family. The legacy does not change.
- **Shape:** data (family)
- **Why:** Æra III has eight scholars and five engineers. The move mends both counts.

### C15. Hypatia (fine)

- **Now:** +10% science in every city · lost the first turn your happiness goes negative
- **Proposed:** If Hypatia stays a leader: rename the row Ptolemy, +8% science in every city, with no loss clause
- **Shape:** data (name, epigram, kernel, percent, revokedWhen)
- **Why:** One person cannot be a leader and a great scholar in the same game. If Sejong takes her leader’s place, nothing changes here.

### C16. Qu Yuan (weak)

- **Now:** +10% culture in every city · -5 happiness in your capital
- **Proposed:** +10% culture in every city · −3 happiness in your capital
- **Shape:** data (amount, −5 to −3)
- **Why:** The cost stays; it now fits the gain in the age the row is dealt.

### C17. Li Bing (odd)

- **Now:** +1 production on every hex with a Farm beside fresh water, in every city with an Aqueduct
- **Proposed:** +1 production on every hex with a Farm beside fresh water
- **Shape:** existing (pays, hex; the town scope goes)
- **Why:** One condition a player can see on the map. About +10 to +15 production for a river seat.

### C18. Vitruvius (strong)

- **Now:** Aqueducts supply +1 happiness · Granaries supply +1 happiness
- **Proposed:** Aqueducts supply +1 happiness · Public Baths supply +1 happiness
- **Shape:** data (the second building)
- **Why:** Every town has a Granary from Æra I, so the second line is free. A Public Bath is a building of this age that a player must choose to build.

### C19. Hippalus (weak)

- **Now:** +1 gold on every hex with a Fishing Boat
- **Proposed:** +2 gold on every hex with a Fishing Boat
- **Shape:** data (amount)
- **Why:** +6 to +12 gold. Still a coast row, now worth a pick.

### C20. Pytheas (dull)

- **Now:** trader units: +1 sight · your trade units cannot be attacked or plundered
- **Proposed:** your trade units cannot be attacked or plundered · +3 gold on every trade route that ends in another empire’s city
- **Shape:** existing (rule; pays, route, as Merchant Scholars scopes it)
- **Why:** He sailed to Thule to trade. Three or four far routes pay +9 to +12 gold.

### C21. Boudica (weak)

- **Now:** +4 combat strength when defending inside your territory · lost when the age it was earned in closes
- **Proposed:** +8 combat strength when defending inside your territory · lost when the age it was earned in closes
- **Shape:** data (amount)
- **Why:** A short legacy can be a loud one. +8 is the age’s strong line.

### C22. Maimonides (strong)

- **Now:** +1 happiness per 2 buildings in your cities that supply science
- **Proposed:** +1 happiness per 3 buildings in your cities that supply science
- **Shape:** data (per, 2 to 3)
- **Why:** +12 at twelve towns. It still beats Ibn Sīnā for a Scientific seat.

### C23. Murasaki Shikibu (odd)

- **Now:** +4 culture per melee unit in the field
- **Proposed:** +2 culture for every citizen in your capital
- **Shape:** existing (pays, empire, count capitalPopulation)
- **Why:** The Tale of Genji is the life of one court. A capital of 15 to 20 citizens pays +30 to +40, the same size as today.

### C24. Villard de Honnecourt (dull)

- **Now:** +15% production toward wonders
- **Proposed:** +15% production toward buildings and wonders
- **Shape:** existing (productionBonus, two rows)
- **Why:** A master mason builds the whole town. About +19 production, and every seat can use it.

### C25. Ibn Baṭṭūṭa (fine)

- **Now:** +5% culture per other empire you trade with
- **Proposed:** If Ibn Battuta stays a leader: rename the row Ibn Jubayr. The legacy does not change.
- **Shape:** data (name, epigram, kernel)
- **Why:** Ibn Jubayr of Valencia wrote the first famous Rihla, 150 years earlier. The kernel “The Rihla” stays true.

### C26. Marco Polo (weak)

- **Now:** +1 gold per 5 hexes between the two cities
- **Proposed:** +2 gold per 5 hexes between the two cities
- **Shape:** data (amount)
- **Why:** +16 to +48 gold. Long routes become the plan, which is his whole story.

### C27. El Cid (weak)

- **Now:** +6 combat strength in a city you captured
- **Proposed:** +6 combat strength inside the borders of a city you captured
- **Shape:** small extension (a combat condition: the hex belongs to a captured city)
- **Why:** The army that holds the province gets the line, not only the one unit behind the wall.

### C28. John Dee (odd)

- **Now:** +1 card in every offer of every kind
- **Proposed:** +20% production toward the Magnum Opus · +10% science in your capital
- **Shape:** existing (productionBonus on the Opus, as The Cathedral Lodges; percentYields)
- **Why:** “The magister’s own magister” should help with the Great Work. Plain, on the board, and it matters in the last age.

### C29. Copernicus (dull)

- **Now:** +4 science in every city
- **Proposed:** +2 science in every city · +2 more in every city with an Observatory
- **Shape:** existing (pays, city; pays, city, hasBuilding)
- **Why:** The same +48 once the Observatories stand, and a reason to build them.

### C30. Christine de Pizan (weak)

- **Now:** +3 culture in your capital · +1 authority capacity
- **Proposed:** +8 culture in your capital · +1 authority capacity
- **Shape:** data (amount)
- **Why:** Sappho’s +3 belongs to Æra II. This row is dealt two ages later.

### C31. Taqī al-Dīn (odd)

- **Now:** +20% science in your capital
- **Proposed:** +3 science in every city with a Workshop
- **Shape:** existing (pays, city, hasBuilding)
- **Why:** A clockmaker’s science comes out of the workshop. Twelve towns pay +36, and the row reads a production building.

### C32. Cosimo de' Medici (strong)

- **Now:** +1 culture per 100 gold you have spent buying
- **Proposed:** +1 culture per 100 gold you have spent buying (at most +60)
- **Shape:** existing (pays, count goldSpent, with the cap other rows use)
- **Why:** It still grows as you buy. The cap is the top of the bar for the age.

## Additions

### The gaps

- **By family and age:** see “The draw” above. Æra II has 2 engineers and 2 merchants; Æra III has 2 artists; generals have 4 in each age.
- **By region** (the 78 live people, then the 35 additions):

| Region | Today | Added | After |
|---|---|---|---|
| Egypt | 7 | 1 | 8 |
| Mesopotamia, the Levant and Anatolia | 9 | 1 | 10 |
| Greece, Rome and the Hellenistic world | 16 | 6 | 22 |
| North Africa (Carthage, the Maghreb) | 2 | 3 | 5 |
| Celtic and northern Europe (ancient) | 1 | 0 | 1 |
| China | 5 | 10 | 15 |
| Persia, Central Asia and the Islamic Near East | 8 | 3 | 11 |
| Jewish scholars and merchants of the Mediterranean | 3 | 0 | 3 |
| India | 1 | 3 | 4 |
| Japan and Korea | 5 | 1 | 6 |
| Medieval and Renaissance Europe | 18 | 3 | 21 |
| Africa south of the Sahara | 1 | 1 | 2 |
| The Americas | 2 | 1 | 3 |
| Southeast Asia and the Pacific | 0 | 2 | 2 |

- **Women:** 13 of 78 today. 7 of the 35 additions. Named women in these families and ages are few in the record; I chose ones with a real story.
- **By fame:** a player would look for Sun Tzu, Julius Caesar, Virgil, Michelangelo, Dante, Gutenberg and Li Bai and not find them.
- Left out on purpose: Pythagoras (the religion names plan has “Pythagoreans”), Confucius and Laozi (founders that living traditions revere), Khadija and Khalid ibn al-Walid (companions of the Prophet), Guan Yu and Trần Hưng Đạo (worshipped today), and every leader and leader candidate.
- Held in reserve, with no effect written: Euclid, Hippocrates, Leonidas, Hero of Alexandria (the id heroOfAlexandria is taken by Dinocrates), Ban Zhao, Omar Khayyam, Li Qingzhao, Brunelleschi, Anna Komnene, Yue Fei, Afanasy Nikitin, Jacques Cœur.

### The new people (35; ★ marks the 15 strongest)

| No. | Name | Family | Age | Rating | Effect | Shape |
|---|---|---|---|---|---|---|
| A01 | Thales of Miletus | Scholar | Æra II | ◆ strong | +2 science in every coastal city · +1 gold on every hex with a Plantation | existing (pays, city, coastal; pays, hex) |
| A02 | Tapputi | Scholar | Æra II | ○ situational | +2 science and +1 gold on every hex with a luxury resource | existing (pays, hex, resourceKind) |
| A03 | Pāṇini | Scholar | Æra II | ◆ strong | +2 science in your capital · completing a technology grants +30 culture | existing (pays, city, trueCapital; windfallRider, tech) |
| A04 | Lu Ban | Engineer | Æra II | ◆ strong | +15% production toward buildings · Workers +1 charge | existing (productionBonus; unitStat, charges) |
| A05 | Theodorus of Samos | Engineer | Æra II | ○ situational | +2 production in every city with a Smithy | existing (pays, city, hasBuilding) |
| A06 | ★ Hanno the Navigator | Merchant | Æra II | ◆ strong | +2 gold in every coastal city · founding a city grants +60 gold | existing (pays, city, coastal; windfallRider, found) |
| A07 | Fan Li | Merchant | Æra II | ○ situational | buildings cost 15% less to buy | existing (purchaseRider on buildings) |
| A08 | Harkhuf | Merchant | Æra II | ○ situational | +2 gold per unique luxury you hold | existing (pays, empire, count uniqueLuxuries) |
| A09 | ★ Fu Hao | General | Æra II | ◆ strong | +3 combat strength inside your territory · +2 faith in every city with a garrison | existing (combatLine, ownTerritory; pays, city, garrisoned) |
| A10 | ★ Sun Tzu | General | Æra II | ◆ strong | military units: +1 sight · +4 combat strength against wounded units | existing (unitStat, sight; combatLine, targetWounded) |
| A11 | ★ Virgil | Artist | Æra III | ◆ strong | +2 culture in every city · founding a city grants +100 culture | existing (pays, city; windfallRider, found) |
| A12 | ★ Kālidāsa | Artist | Æra III | ◆ strong | +3 culture on every trade route you send · +2 happiness | existing (pays, route; happiness) |
| A13 | Wang Xizhi | Artist | Æra III | ○ situational | +1 culture per building in your cities that supplies science | existing (pays, empire, count buildingsSupplying) |
| A14 | Cai Yan | Artist | Æra III | ○ situational | +3 culture in every city with a garrison | existing (pays, city, garrisoned) |
| A15 | ★ Julius Caesar | General | Æra III | ● defining | capturing a city grants +200 gold and +200 culture · −3 happiness in your capital | existing (windfallRider, capture; happiness, trueCapital) |
| A16 | ★ Zhuge Liang | General | Æra III | ◆ strong | +3 combat strength for ranged units · +2 food in every city with a garrison | existing (combatLine with a class; pays, city, garrisoned) |
| A17 | ★ Trưng Trắc | General | Æra III | ○ situational | +6 combat strength when defending against an empire with more cities than you | small extension (the vsWiderEmpire condition on the defending side) |
| A18 | Lü Buwei | Merchant | Æra III | ◆ strong | +2 authority capacity · you gain culture equal to 10% of your gold per turn | existing (authority; pays, empire, share): the builder confirms the share reads gold |
| A19 | ★ Cai Lun | Engineer | Æra III | ◆ strong | +2 science and +1 culture in every city with a Library | existing (pays, city, hasBuilding) |
| A20 | Maria Hebraea | Scholar | Æra III | ○ situational | +1 science on every hex with a Mine | existing (pays, hex) |
| A21 | ★ Li Bai | Artist | Æra IV | ◆ strong | +5 culture in every city on a river · +2 happiness | existing (pays, city, riverside; happiness) |
| A22 | ★ Dante Alighieri | Artist | Æra IV | ◆ strong | you gain culture equal to 25% of your faith per turn | existing (pays, empire, share): the builder confirms the share reads faith |
| A23 | Ferdowsi | Artist | Æra IV | ○ situational | +4 culture for each great person you have gained | existing (pays, empire, count greatPeopleCalled) |
| A24 | ★ Michelangelo | Artist | Æra IV | ◆ strong | +3 culture on every hex with a Quarry · +15% production toward wonders | existing (pays, hex; productionBonus) |
| A25 | Ibn al-Haytham | Scholar | Æra IV | ◆ strong | +2 science in every city with a University · +2 science in every city with an Observatory | existing (pays, city, hasBuilding, two rows) |
| A26 | ★ Ibn Khaldun | Scholar | Æra IV | ◆ strong | +3 authority capacity · +2 science in every city | existing (authority; pays, city) |
| A27 | Brahmagupta | Scholar | Æra IV | ○ situational | your buildings that supply science cost no gold to maintain | small extension (upkeepRebate, which today filters buildings by age, filtered by yield) |
| A28 | Belisarius | General | Æra IV | ◆ strong | +4 combat strength when attacking cities · capturing a city grants the best melee unit you can build | small extension (windfallRider, capture, with the free unit grant the commissions use) |
| A29 | Gajah Mada | General | Æra IV | ● defining | +4 combat strength for military units · −3 happiness while you are at peace | existing (combatLine; conditionRule, atPeace, with happiness) |
| A30 | ★ Amina of Zazzau | General | Æra IV | ◆ strong | +5 to the defence of your cities · +3 gold in every city with Stone Walls | existing (cityStat, defense; pays, city, hasBuilding) |
| A31 | Tlacaelel | General | Æra IV | ◆ strong | each kill grants +20 faith and +20 culture | existing (windfallRider, kill, two rows) |
| A32 | ★ Johannes Gutenberg | Engineer | Æra IV | ◆ strong | +2 science and +2 culture in every city with a Printing House | existing (pays, city, hasBuilding) |
| A33 | Jang Yeong-sil | Engineer | Æra IV | ◆ strong | +1 food and +1 science on every hex with a Farm beside fresh water | existing (pays, hex, as Li Bing) |
| A34 | Aḥmad ibn Mājid | Merchant | Æra IV | ○ situational | you may send 1 more trade route · all units: +1 movement while embarked | existing (routeRider; unitStat, embarked) |
| A35 | Fatima al-Fihri | Merchant | Æra IV | ◆ strong | buildings that supply science or faith cost 30% less to buy | small extension (purchaseRider on buildings, filtered by yield) |

#### A01. Thales of Miletus

- Scholar, Æra II, ◆ strong. Ionia, about 624 to 546 BC.
- **Who:** The first Greek to explain nature without gods. He is said to have foretold an eclipse, and to have grown rich by renting every olive press before a good harvest.
- **Flavour:** He looked at the stars and fell in the well.
- **Effect:** +2 science in every coastal city · +1 gold on every hex with a Plantation
- **Shape:** existing (pays, city, coastal; pays, hex)
- **Feeds:** Scientific and Commerce on a coast. About +8 science and +4 gold.

#### A02. Tapputi

- Scholar, Æra II, ○ situational. Babylon, about 1200 BC.
- **Who:** A perfume maker and overseer in a royal palace, and the first chemist whose name we have. My knowledge is thin: she is known from one clay tablet.
- **Flavour:** Flowers, oil and water, and then again.
- **Effect:** +2 science and +1 gold on every hex with a luxury resource
- **Shape:** existing (pays, hex, resourceKind)
- **Feeds:** Commerce and Expansionist: luxuries. Four luxury hexes pay +12. She fits the alchemy of the frame.

#### A03. Pāṇini

- Scholar, Æra II, ◆ strong. Gandhara, about the 5th or 4th century BC (the date is not certain).
- **Who:** He wrote the grammar of Sanskrit in about 4,000 short rules. Linguists still study it.
- **Flavour:** Four thousand rules, and not one word wasted.
- **Effect:** +2 science in your capital · completing a technology grants +30 culture
- **Shape:** existing (pays, city, trueCapital; windfallRider, tech)
- **Feeds:** Scientific into the draft. A technology every six turns is +5 culture a turn, when a seat makes 25.

#### A04. Lu Ban

- Engineer, Æra II, ◆ strong. State of Lu, about 507 to 444 BC.
- **Who:** A master carpenter. Chinese tradition gives him the saw, the plane and the siege ladder, and builders honour him as the patron of their trade.
- **Flavour:** Do not show your axe at Lu Ban’s door.
- **Effect:** +15% production toward buildings · Workers +1 charge
- **Shape:** existing (productionBonus; unitStat, charges)
- **Feeds:** Expansionist: improvements and towns. Useful to every seat.

#### A05. Theodorus of Samos

- Engineer, Æra II, ○ situational. Samos, 6th century BC.
- **Who:** An architect and bronze caster. The Greeks credited him with the level, the lathe and the key. My knowledge is thin: later writers are the only source.
- **Flavour:** He made the lock, and then the key.
- **Effect:** +2 production in every city with a Smithy
- **Shape:** existing (pays, city, hasBuilding)
- **Feeds:** Dominion and Expansionist: the Smithy is the age’s production building. Five towns pay +10.

#### A06. ★ Hanno the Navigator

- Merchant, Æra II, ◆ strong. Carthage, about 500 BC.
- **Who:** He took sixty ships out past the Pillars of Hercules and down the coast of West Africa to found trading towns. His report survives in Greek.
- **Flavour:** Past the Pillars the coast keeps going.
- **Effect:** +2 gold in every coastal city · founding a city grants +60 gold
- **Shape:** existing (pays, city, coastal; windfallRider, found)
- **Feeds:** Expansionist and Commerce. He was on the old leader shelf in docs/leaders.md, not on today’s candidate list.

#### A07. Fan Li

- Merchant, Æra II, ○ situational. Yue and Qi, 5th century BC.
- **Who:** A minister who helped his king win a war, then left court and made three fortunes in trade. China remembers him as the model merchant.
- **Flavour:** When the birds are gone, the bow is put away.
- **Effect:** buildings cost 15% less to buy
- **Shape:** existing (purchaseRider on buildings)
- **Feeds:** Commerce: buying. It saves 3 or 4 gold a turn now and 40 in Æra IV.

#### A08. Harkhuf

- Merchant, Æra II, ○ situational. Elephantine, about 2280 BC.
- **Who:** A governor who led four donkey caravans south into Nubia and came back with incense, ebony and ivory. He had the story cut on his tomb.
- **Flavour:** Three hundred donkeys, loaded.
- **Effect:** +2 gold per unique luxury you hold
- **Shape:** existing (pays, empire, count uniqueLuxuries)
- **Feeds:** Commerce and Expansionist: luxuries. Four luxuries pay +8 gold; eight pay +16.

#### A09. ★ Fu Hao

- General, Æra II, ◆ strong. Shang China, died about 1200 BC.
- **Who:** A queen who led armies of thousands and made the royal sacrifices. The oracle bones name her, and her tomb was found whole in 1976.
- **Flavour:** The bones asked: should Fu Hao lead? The bones said yes.
- **Effect:** +3 combat strength inside your territory · +2 faith in every city with a garrison
- **Shape:** existing (combatLine, ownTerritory; pays, city, garrisoned)
- **Feeds:** Dominion and Devotion. She pairs with the proposed wonder The Oracle Pits of Yin. The faith pays at peace.

#### A10. ★ Sun Tzu

- General, Æra II, ◆ strong. State of Wu, by tradition 544 to 496 BC.
- **Who:** The general to whom The Art of War is credited. Historians are not sure that he lived; the book is real and still read.
- **Flavour:** Know them and know yourself.
- **Effect:** military units: +1 sight · +4 combat strength against wounded units
- **Shape:** existing (unitStat, sight; combatLine, targetWounded)
- **Feeds:** Dominion. The Order The Art of War exists: a pair, not a clash of names. The name players expect most.

#### A11. ★ Virgil

- Artist, Æra III, ◆ strong. Rome, 70 to 19 BC.
- **Who:** The poet of the Aeneid, the story of how a band of exiles founded Rome, and of the Georgics, a poem about farming.
- **Flavour:** So great a labour it was to found the Roman people.
- **Effect:** +2 culture in every city · founding a city grants +100 culture
- **Shape:** existing (pays, city; windfallRider, found)
- **Feeds:** Expansionist with an artist. Eight towns pay +16. The Doctrine The Georgics is named for his poem.

#### A12. ★ Kālidāsa

- Artist, Æra III, ◆ strong. Gupta India, about the 4th or 5th century AD (the date is not certain).
- **Who:** The great poet and playwright of Sanskrit. In The Cloud Messenger an exile asks a cloud to carry word to his wife across all of India.
- **Flavour:** Go, cloud, and tell her I am alive.
- **Effect:** +3 culture on every trade route you send · +2 happiness
- **Shape:** existing (pays, route; happiness)
- **Feeds:** Commerce and Magisterial. Five routes pay +15. Tradition counts him among the nine jewels, the court the Order The Nine Jewels is named for.

#### A13. Wang Xizhi

- Artist, Æra III, ○ situational. Eastern Jin China, 303 to 361.
- **Who:** The Sage of Calligraphy. His Preface to the Orchid Pavilion is the most copied piece of writing in China; the original is lost.
- **Flavour:** Later men will look at us as we look at the past.
- **Effect:** +1 culture per building in your cities that supplies science
- **Shape:** existing (pays, empire, count buildingsSupplying)
- **Feeds:** Scientific and Magisterial. Ten to fourteen buildings now, about 36 in Æra IV.

#### A14. Cai Yan

- Artist, Æra III, ○ situational. Han China, born about 177.
- **Who:** A poet and musician taken north by Xiongnu raiders for twelve years, then ransomed home. She wrote out her father’s lost library from memory. Which poems are hers is disputed.
- **Flavour:** Twelve years, and I knew every scroll.
- **Effect:** +3 culture in every city with a garrison
- **Shape:** existing (pays, city, garrisoned)
- **Feeds:** Dominion with an artist. Six garrisons pay +18. A garrison is one unit a town, so it does not grow with the army.

#### A15. ★ Julius Caesar

- General, Æra III, ● defining. Rome, 100 to 44 BC.
- **Who:** He conquered Gaul, wrote the book about it, crossed the Rubicon and ruled Rome until the senators killed him.
- **Flavour:** The die is cast.
- **Effect:** capturing a city grants +200 gold and +200 culture · −3 happiness in your capital
- **Shape:** existing (windfallRider, capture; happiness, trueCapital)
- **Feeds:** Dominion: the provinces. A general with no combat line, paid for with trouble at home. Augustus, his heir, is a leader candidate: a pair, not a clash.

#### A16. ★ Zhuge Liang

- General, Æra III, ◆ strong. Shu Han, 181 to 234.
- **Who:** Chancellor and strategist of the Three Kingdoms. He fed his armies from soldier farms, and tradition gives him the repeating crossbow.
- **Flavour:** I gave everything, until the end.
- **Effect:** +3 combat strength for ranged units · +2 food in every city with a garrison
- **Shape:** existing (combatLine with a class; pays, city, garrisoned)
- **Feeds:** Dominion, and a general who pays at peace. Six garrisons give +12 food.

#### A17. ★ Trưng Trắc

- General, Æra III, ○ situational. Northern Vietnam, died 43 AD.
- **Who:** With her sister Trưng Nhị she raised the country against Han rule and held sixty-five towns for three years. Vietnam honours the sisters as national heroes.
- **Flavour:** Sixty-five towns rose in one season.
- **Effect:** +6 combat strength when defending against an empire with more cities than you
- **Shape:** small extension (the vsWiderEmpire condition on the defending side)
- **Feeds:** Dominion and any small empire. The mirror of Spartacus. The first name from Southeast Asia.

#### A18. Lü Buwei

- Merchant, Æra III, ◆ strong. Zhao and Qin, died 235 BC.
- **Who:** A merchant who backed a hostage prince as “goods worth hoarding”, put him on the throne of Qin and became chancellor.
- **Flavour:** A rare thing. Worth keeping.
- **Effect:** +2 authority capacity · you gain culture equal to 10% of your gold per turn
- **Shape:** existing (authority; pays, empire, share): the builder confirms the share reads gold
- **Feeds:** Commerce and Magisterial. +5 culture now and +30 in Æra IV. Qin Shi Huang, a leader candidate, was that prince’s son: a pair.

#### A19. ★ Cai Lun

- Engineer, Æra III, ◆ strong. Han China, about 50 to 121.
- **Who:** A court official who showed the emperor paper made from bark, rags and old nets in 105. The world wrote on it afterwards.
- **Flavour:** Bark, rags and old fishing nets.
- **Effect:** +2 science and +1 culture in every city with a Library
- **Shape:** existing (pays, city, hasBuilding)
- **Feeds:** Scientific with an engineer. Eight Libraries pay +24. The charter technology Papermaking is the same story.

#### A20. Maria Hebraea

- Scholar, Æra III, ○ situational. Alexandria, between the 1st and 3rd centuries AD.
- **Who:** The first alchemist whose apparatus we know: the still and the water bath that cooks still call a bain-marie. Later writers quote her; no work of hers survives.
- **Flavour:** One becomes two, two becomes three.
- **Effect:** +1 science on every hex with a Mine
- **Shape:** existing (pays, hex)
- **Feeds:** Expansionist and Scientific. Sixteen Mines pay +16. An alchemist for a game that ends with the Magnum Opus.

#### A21. ★ Li Bai

- Artist, Æra IV, ◆ strong. Tang China, 701 to 762.
- **Who:** The most loved poet of China: wine, the moon, rivers and friends who leave. Legend says he drowned reaching for the moon in the water.
- **Flavour:** I raise my cup and ask the moon to drink.
- **Effect:** +5 culture in every city on a river · +2 happiness
- **Shape:** existing (pays, city, riverside; happiness)
- **Feeds:** Magisterial and Expansionist. Six river towns pay +30.

#### A22. ★ Dante Alighieri

- Artist, Æra IV, ◆ strong. Florence, 1265 to 1321.
- **Who:** An exile who wrote the Divine Comedy: a walk through Hell, Purgatory and Heaven, in the language people spoke.
- **Flavour:** In the middle of the road of our life.
- **Effect:** you gain culture equal to 25% of your faith per turn
- **Shape:** existing (pays, empire, share): the builder confirms the share reads faith
- **Feeds:** Devotion and Magisterial. A seat with 128 faith gains +32 culture; a Devotion seat gains much more.

#### A23. Ferdowsi

- Artist, Æra IV, ○ situational. Tus, Persia, about 940 to 1020.
- **Who:** He gave thirty years to the Shahnameh, the Book of Kings: every hero of Persia in fifty thousand couplets.
- **Flavour:** I have sown the seeds of the word.
- **Effect:** +4 culture for each great person you have gained
- **Shape:** existing (pays, empire, count greatPeopleCalled)
- **Feeds:** Magisterial: the patrons theme. Eight people pay +32, and each new one adds 4.

#### A24. ★ Michelangelo

- Artist, Æra IV, ◆ strong. Florence and Rome, 1475 to 1564.
- **Who:** The sculptor of David, the painter of the Sistine ceiling and the architect of the dome of St Peter’s. He chose his own marble at the quarry.
- **Flavour:** The figure was in the stone already.
- **Effect:** +3 culture on every hex with a Quarry · +15% production toward wonders
- **Shape:** existing (pays, hex; productionBonus)
- **Feeds:** Magisterial: monuments. Eight Quarries pay +24. It answers The Quarry Gangs at Tier 0.

#### A25. Ibn al-Haytham

- Scholar, Æra IV, ◆ strong. Basra and Cairo, about 965 to 1040.
- **Who:** He proved by experiment that we see because light enters the eye, and wrote the Book of Optics. Europe called him Alhazen.
- **Flavour:** Doubt the old books. Then test.
- **Effect:** +2 science in every city with a University · +2 science in every city with an Observatory
- **Shape:** existing (pays, city, hasBuilding, two rows)
- **Feeds:** Scientific. Twelve towns with both pay +48.

#### A26. ★ Ibn Khaldun

- Scholar, Æra IV, ◆ strong. Tunis and Cairo, 1332 to 1406.
- **Who:** A judge and historian. His Muqaddimah explains why states rise, grow soft and fall, and many call it the first work of social science.
- **Flavour:** The past is like the future, as water is like water.
- **Effect:** +3 authority capacity · +2 science in every city
- **Shape:** existing (authority; pays, city)
- **Feeds:** Every wide seat. +24 science at twelve towns, and room for most of one more town.

#### A27. Brahmagupta

- Scholar, Æra IV, ○ situational. Bhinmal, India, 598 to 668.
- **Who:** The first to write rules for zero as a number, and for debts and fortunes: negative and positive numbers.
- **Flavour:** A debt taken from nothing is a fortune.
- **Effect:** your buildings that supply science cost no gold to maintain
- **Shape:** small extension (upkeepRebate, which today filters buildings by age, filtered by yield)
- **Feeds:** Scientific. About 36 buildings: 36 to 70 gold a turn. Zero, as a rule a player can read.

#### A28. Belisarius

- General, Æra IV, ◆ strong. Byzantine Empire, about 500 to 565.
- **Who:** Justinian’s general. With small armies he took back North Africa and Italy, and he fed his wars from the towns he won.
- **Flavour:** Give me the few, and the city.
- **Effect:** +4 combat strength when attacking cities · capturing a city grants the best melee unit you can build
- **Shape:** small extension (windfallRider, capture, with the free unit grant the commissions use)
- **Feeds:** Dominion: the provinces. Justinian is a leader candidate: a pair.

#### A29. Gajah Mada

- General, Æra IV, ● defining. Majapahit, Java, about 1290 to 1364.
- **Who:** Prime minister of Majapahit. He swore to taste no spice until the whole archipelago was one, and nearly kept the oath.
- **Flavour:** No spice until the islands are one.
- **Effect:** +4 combat strength for military units · −3 happiness while you are at peace
- **Shape:** existing (combatLine; conditionRule, atPeace, with happiness)
- **Feeds:** Dominion. A strong line on every unit, and an empire that is restless when it stops.

#### A30. ★ Amina of Zazzau

- General, Æra IV, ◆ strong. Zazzau (Zaria), Hausaland, 16th century (the dates are disputed).
- **Who:** A warrior queen who walled every camp she made and opened the trade roads north. Hausa towns still call old walls “Amina’s walls”. The sources are later chronicles and oral tradition.
- **Flavour:** Where she camped, a wall stood.
- **Effect:** +5 to the defence of your cities · +3 gold in every city with Stone Walls
- **Shape:** existing (cityStat, defense; pays, city, hasBuilding)
- **Feeds:** Dominion and Commerce. A general whose whole legacy pays at peace. Twelve walled towns pay +36 gold.

#### A31. Tlacaelel

- General, Æra IV, ◆ strong. Tenochtitlan, about 1397 to 1487.
- **Who:** Chief counsellor to three Mexica rulers. He shaped the Triple Alliance and the wars fought to take captives. The sources are from after the conquest.
- **Flavour:** Three kings ruled. One man stayed.
- **Effect:** each kill grants +20 faith and +20 culture
- **Shape:** existing (windfallRider, kill, two rows)
- **Feeds:** Dominion and Devotion. Nezahualcoyotl, a leader, was his ally: a pair.

#### A32. ★ Johannes Gutenberg

- Engineer, Æra IV, ◆ strong. Mainz, about 1400 to 1468.
- **Who:** He cast metal type, built the press and printed the Bible. He lost the workshop to his lender before the books sold.
- **Flavour:** One letter, cast a thousand times.
- **Effect:** +2 science and +2 culture in every city with a Printing House
- **Shape:** existing (pays, city, hasBuilding)
- **Feeds:** Scientific and Magisterial. Twelve Printing Houses pay +48, and a reason to build them.

#### A33. Jang Yeong-sil

- Engineer, Æra IV, ◆ strong. Joseon Korea, about 1390 to after 1442.
- **Who:** Born a slave, raised to court by King Sejong for his skill. He built the rain gauge, a water clock that struck its own hours and star globes.
- **Flavour:** The rain was measured, and the harvest known.
- **Effect:** +1 food and +1 science on every hex with a Farm beside fresh water
- **Shape:** existing (pays, hex, as Li Bing)
- **Feeds:** Expansionist and Scientific. About 20 such Farms pay +40. Sejong is a leader candidate: a pair.

#### A34. Aḥmad ibn Mājid

- Merchant, Æra IV, ○ situational. Julfar, on the Gulf, about 1432 to 1500.
- **Who:** The master pilot of the Indian Ocean, called the Lion of the Sea. His book of winds, stars and coasts guided ships for centuries.
- **Flavour:** The sea has roads for those who can read.
- **Effect:** you may send 1 more trade route · all units: +1 movement while embarked
- **Shape:** existing (routeRider; unitStat, embarked)
- **Feeds:** Commerce. One more route is worth 15 to 30 gold in this age.

#### A35. Fatima al-Fihri

- Merchant, Æra IV, ◆ strong. Kairouan and Fez, about 800 to 880.
- **Who:** A merchant’s daughter who spent her inheritance to found the mosque and school of al-Qarawiyyin in Fez, which still teaches. The story comes from later writers.
- **Flavour:** She spent it all on one door that stays open.
- **Effect:** buildings that supply science or faith cost 30% less to buy
- **Shape:** small extension (purchaseRider on buildings, filtered by yield)
- **Feeds:** Commerce with Scientific or Devotion: gold becomes Universities and Temples.

Additions by family and age:

|  | Æra II | Æra III | Æra IV | All |
|---|---|---|---|---|
| Scholars | 3 | 1 | 3 | 7 |
| Artists | 0 | 4 | 4 | 8 |
| Engineers | 2 | 1 | 2 | 5 |
| Merchants | 3 | 1 | 2 | 6 |
| Generals | 2 | 3 | 4 | 9 |

### People to retire or move

- **Retire:** nobody. Every live row has a use after its change.
- **Move family:** Imhotep and Archimedes to the engineers.
- **Move age:** the 15 people of S2. I left your moves of 2026-09-09 alone (Sappho, Hemiunu, Ptahhotep, Ibn Sīnā, Mimar Sinan), though Ptahhotep and Ibn Sīnā sit far from their own centuries.
- **The 19 of Æra V:** 15 come forward (S2); 4 wait.

## Clashes with leaders, and names to check

- **Hypatia** is a leader (`hypatiaOfAlexandria`) and a great scholar (`hypatia`). The leader review may replace her with Sejong. If she stays a leader, change C15 renames the scholar row.
- **Ibn Battuta** is a leader (`ibnBattutaOfTangier`) and a great merchant (`ibnBattuta`). He is not on the candidate list, so he may leave the leaders. If he stays, change C25 renames the merchant row.
- **Zheng He** is a leader today and a retired great merchant row. Nothing to do: the row is out of every draw.
- **Cosimo de’ Medici** is a great merchant and **Lorenzo de’ Medici** is a leader candidate. They are two men of one house, so this is not a clash. If you want only one Medici, keep Lorenzo and rename the merchant row Giovanni di Bicci.
- **No other leader or candidate is a great person row.** I checked Alexander, Genghis Khan, Saladin, Joan of Arc, Mehmed II, Qin Shi Huang, Augustus, Isabella, Cyrus, Cleopatra, Lorenzo de’ Medici, Hatshepsut, Harun al-Rashid, Justinian, Ashoka, Sejong, Pachacuti, Nezahualcoyotl, Mansa Musa, Taizong, Modu Chanyu, Akhenaten, Al-Ma’mun, Mithridates, Hildegard and Zheng He against all 86 rows and the 35 additions.
- **Pairs, which I think are good:** Subutai with Genghis Khan; Maimonides with Saladin, whose court he served; Dinocrates with Alexander; al-Khwārizmī with Al-Ma’mun. Among the additions: Belisarius with Justinian, Jang Yeong-sil with Sejong, Lü Buwei with Qin Shi Huang, Julius Caesar with Augustus, Tlacaelel with Nezahualcoyotl, Cai Yan with Modu Chanyu’s people.
- **Other names:** the wonder The Water Clock of Su Song shares a name with the great engineer Su Song. The Order The Art of War pairs with Sun Tzu. The religion names plan has “Pythagoreans”, so I left Pythagoras out. Sun Tzu and Hanno are on the old leader shelf in `docs/leaders.md`, not on the candidate list.
- **Names to check for respect:** Deborah is a prophetess in Jewish tradition (change C12; if you rename her, Tomyris fits the effect). Rūmī is a poet whom Sufi orders revere as a teacher, not as a prophet or founder; I would keep him. Lu Ban and Fan Li are honoured in Chinese folk tradition, and the Trưng sisters in Vietnam, as heroes and patrons.

## What a builder needs

- **Order of work.** S1 and S2 first, with the tests and `docs/great-people.md`. Then the changes to people (data). Then the additions (data and portraits). Then S3 to S10, each a small batch.
- **Data rows** (`data/greatPeople.json`): 35 new rows; 15 rows change `age` from 5 to 4; 2 rows change `family` (Imhotep, Archimedes); 30 rows change `legacy`, a figure or a name; 6 rows change `tier`. Add new rows at the end of the file: the file order is the draw order and the index of the piece’s fingerprint, so rows must not move.
- **A new id for Hero of Alexandria.** The id `heroOfAlexandria` holds Dinocrates. If Hero is ever added, he needs another id.
- **S1 in code:** `rosterAgeFor` in `src/sim/greatPeople.ts` returns the game age, held between the first and last roster ages. Tests to change: `test/sim/greatPeople.test.ts` (“maps an empire’s era onto a roster age”, and the spill tests that say the roster runs one past the tree). Text to change: the docblocks in `greatPeopleData.ts` and `greatPeople.ts` that say the tree has three ages.
- **Saves and replays.** A change to the roster changes every seeded draw. This needs a schema step, as every roster change has.
- **Small extensions and small code changes (12):** S3 (a work’s yield by age; a row in `docs/yields.md` and its sync test), S4 (`actGainOf` for gold; the bot’s act pricing), S6 (aura and rally by age), S7 (a general’s legacy from the call), S8 (happiness on the Landmark row), S9 (the hand rule), S10 (the act limit); and in the rows: C27 El Cid, A17 Trưng Trắc, A27 Brahmagupta, A28 Belisarius, A35 Fatima al-Fihri.
- **New shapes:** none.
- **Shapes to confirm.** I read `statecraftData.ts` and the live deck rows. I did not run any row. The builder confirms the exact fields for: `pays` with a share of gold or faith (Lü Buwei, Dante), `routeRider` on a legacy (Ibn Mājid), `conditionRule` on a legacy (Gajah Mada), and the route scope of Pytheas.
- **Tests.** `test/sim/greatPeopleDocSync.test.ts` needs every live row in its age’s table in `docs/great-people.md`. The register test in `test/sim/statecraft.test.ts` covers any new option. Each small extension gets its own narrow test.
- **Docs.** `docs/great-people.md`: the roster tables, the count of names, the figures table (S4 to S6) and one line on the roster ages. `docs/flags.md`: the ruling, before any agent builds.
- **The Compendium** prints each row from the data, so new people need no text there. The Holy Site entry gets one line (it is a great person’s work).
- **Portraits:** 35 new people: Thales of Miletus, Tapputi, Pāṇini, Lu Ban, Theodorus of Samos, Hanno the Navigator, Fan Li, Harkhuf, Fu Hao, Sun Tzu, Virgil, Kālidāsa, Wang Xizhi, Cai Yan, Julius Caesar, Zhuge Liang, Trưng Trắc, Lü Buwei, Cai Lun, Maria Hebraea, Li Bai, Dante Alighieri, Ferdowsi, Michelangelo, Ibn al-Haytham, Ibn Khaldun, Brahmagupta, Belisarius, Gajah Mada, Amina of Zazzau, Tlacaelel, Johannes Gutenberg, Jang Yeong-sil, Aḥmad ibn Mājid, Fatima al-Fihri. Also Ptolemy and Ibn Jubayr if the two rows are renamed. I did not check which of the 86 present rows have portraits.
- **Bots.** `src/ai/value.ts` prices acts and works. S3 to S6 change those prices; the arena panel needs no edit.

## What I could not determine

- How many great people a human seat calls. The figures are sums on bot games of September.
- How much of a seat’s renown each family feeds in a real game, so how far the draw leans.
- The exact fields of four shapes (listed under “Shapes to confirm”).
- Why each of the eight retired rows was cut.
- Which portraits exist.
- Whether the bots lay works at all today; I did not run a game.

## Questions

1. **The ages.** Do you approve S1 and S2: each roster age is dealt in its own game age, and 15 people of Æra V come into Æra IV? Recommended: yes. The other choice is to leave the code and move the marks on the rows down by one age, which leaves the 16 early people out.
2. **The size of a legacy.** I held every legacy to about half a regular Order of its band (8 to 15, 15 to 30, 30 to 60 a turn), from your ruling of 2026-11-12. Is that the size you want, now that a seat gets 7 to 9 people by turn 150?
3. **Works.** Should a work grow with the ages (S3), or stay at +3 as a thing only the work cards make good?
4. **The two leaders in the roster.** Rename the great person rows for Hypatia and Ibn Battuta now, or wait for the leader decision? And does the rule on prophets reach Deborah?

## The user's first rulings (2026-11-19)

- On the finding that the roster runs one age ahead of the game: "ah i see,
  it's because you unlock great people in age 2. great people should be
  drafted from the age of the player, remove the +1 age thing." So **S1 is
  approved**: a seat is dealt people of its own age.
- In chat: "i haven't looked at the great people yet, could we have ~10 of
  each type in each age?" So **the target is about ten people of each family
  in each age** in which great people can be called (ages 2, 3 and 4: about
  150 in all, where the pass as written reaches 109).
- The leader roster is now chosen
  (`docs/plans/leader-roster-pass-2026-11-19.md`, "The user's ruling on the
  roster"): Alexander, Genghis Khan, Joan of Arc, Mehmed the Conqueror, Qin Shi
  Huang, Pachacuti, Jayavarman VII, Nezahualcoyotl, Cyrus, Mansa Musa,
  Cleopatra, Lorenzo de' Medici, Harun al-Rashid, Justinian, Sejong, and Ibn
  Battuta. None of them may be a great person. Hypatia leaves the leaders, so
  her great person row keeps its name. Ibn Battuta stays a leader, so his
  great person row is renamed.
- The user has not yet read the verdicts, the other changes or the additions.

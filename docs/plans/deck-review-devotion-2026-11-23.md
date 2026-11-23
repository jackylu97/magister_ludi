# Devotion deck review, 2026-11-23

This is a design review. It changes no data, no code and no test. No test, bot game or dev server was run for it. All power figures are arithmetic from the data files.

**The user's words for this review (2026-11-23).**
- "could we take a look at the religious beliefs and the synergy with the devotion cards? I think it's missing some cohesion."
- "I'm kind of liking this authority-based religious play."
- "rites aren't available in tier 0, i think tier 0 is probably fine for now."
- For all four reviews: "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game?"

**How numbers are marked.** **(live)**: the number is in the data today. **(proposed)**: a suggestion of this review. **(estimate)**: my arithmetic from live numbers, not measured.

**How proposals are marked.** Text change, existing shape, small extension, or new shape. The meanings are those of `docs/plans/deck-direction-review-2026-11-23.md`.

**The four builds** are those of section 2.4 of that review: rites, faith spent, devout towns and authority, faith buildings. Three smaller threads are outside them: the spreading faith (foreign towns), holy ground (holy sites) and the army.

---

## Summary

### Findings

1. **Only 21 of the 56 live beliefs serve one of the four builds.** Of the 23 gods, one does (The Vigil). Ten gods supply faith, and that is all the pantheon gives the deck.
2. **The rites build has 14 cards and one belief.** No follower belief and no enhancer belief reads a rite. Feast Days was written to be the rites belief on 2026-11-10 and was held back for a missing shape. That shape exists now.
3. **Beliefs and cards often print the same line. They seldom raise what the other reads.** Seven beliefs are a card's effect a second time (Reliquaries and The Theoric Fund, Rites of Blood and The Sacred Host, Inquisition and The Holy Inquisition, and four more). That adds numbers. It does not make a combination.
4. **Three counts carry one idea, under several names.** "A town that follows" (any owner), "a devout town" (yours) and "a town following your religion" (the world, and only for a founder) are three different counts. "Faith building" is two different counts. Section A.4 has the list.
5. **Rites and devout towns do not touch.** No card or belief joins them. Authority touches no other build except through the Mosque.
6. **The builds scale well.** By my arithmetic each committed build pays more in age 4 than the full Magisterial set after its nerf (576 a turn for six works, estimate). After that nerf Devotion may be the strongest deck. Measure it.
7. **The authority path is real from Tier III, and thin before.** It has five sources of authority and three readers. It has no card in Tier II except a commission with a hard goal, and it pays no production and no science.
8. **The utility is mostly useful.** Three cards are weak: The Octave and The Votive Gifts are not worth a chair, and The Hallowed Ground's rite is seldom the best rite.
9. **Two stacks reach or pass 100%.** "Your faith buys more" from four sources adds to 97% off an apostle. The belief Inquisition and the Order The Holy Inquisition add to 110% less rival pressure. Both are in "What I could not verify".

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | One word for each count: "devout" in the belief Inquisition, "in the world" on every founder count, "building that supplies faith" for the one count. | Text change, about eight rows |
| 2 | The follower belief Feast Days becomes the rites belief: "A town that follows gains +1 faith for every two citizens while it keeps a rite." | Existing shape |
| 3 | New Tier II card, The Truce of God: "+1 authority for each town keeping a rite." It starts the authority path a tier earlier and joins it to rites. | Existing shape |
| 4 | New Tier III card, The Patriarchate: "Your holy city gains +2 production and +2 science for each point of spare authority." | Existing shape |

A separate simplification pass (section F) would fold four of the seven card rites and the Bell Tower into plain cards.

### Decisions for you

1. **Wording (change 1).** Recommended: yes. It changes no rule.
2. **Feast Days.** Recommended: the faith line of change 2. The other option is your text of 2026-11-10 ("Rites in a town that follows last 5 turns longer"), which can be built now as "last 50% longer". It only saves a little faith.
3. **The two authority cards (changes 3 and 4).** Recommended: build both. They add supply that the seat earns, and no cut in a town's price. That follows your ruling "Authority needs to be a limiting factor for growth."
4. **Fold four rites and the Bell Tower into plain cards (section F)?** Recommended: yes, in the simplification pass. You wrote three of those rite texts on 2026-11-20, so this is yours to decide.
5. **The stacks of "faith buys more".** Recommended: leave them as a broken combo, and check that a price cannot reach zero.

---

## A. The belief map

### A.1 Every live belief

- The Text column is the row's `text` in `data/religion.json`. The game prints the describers' sentences, which say the same rule.
- Class: P is a pantheon belief (a god), F a follower belief, E an enhancer belief.
- Build: R rites, S faith spent, D devout towns and authority, B faith buildings. A word in brackets is a thread outside the four builds.
- Every god also counts for The Creed, The Paean and The Serapeum. Every follower belief also counts for The Doctors of the Church, The Apostolic Camera and The Seven Councils. The table does not repeat this.

| Belief | Class | Text (live) | Build | Devotion cards on the same quantity |
|---|---|---|---|---|
| Goddess of the Harvest | P | Bonus resources that give food gain +1 food. | none | none |
| Keeper of the Hearth | P | Granaries give +2 faith and +1 happiness. | none (faith supply) | The Tithe Barns (Granaries) |
| Star Readers | P | +4 science in every town with a mountain in its borders. | none | The Holy Spring and The Cliff Monasteries read mountains in other ways |
| Keeper of the Calendar | P | Plantations gain +1 science. | none | Lay Offerings, The Temple Herds (plantations) |
| The Standing Stones | P | Monuments give +2 culture and +1 faith. | none (faith supply) | none |
| Ancestor Worship | P | +1 culture for every 4 citizens in a town. | none | none. Choirs is the same line. |
| Lady of the Hunt | P | Camps gain +1 food and +1 gold. | none | Lay Offerings, The Temple Herds (camps) |
| Spirits of the Wood | P | Unimproved forest and jungle hexes gain +1 faith and +1 culture. | none (faith supply) | Sacred Groves (worked forests) |
| River Mother | P | Towns on fresh water gain +2 food. | none | none |
| Lord of the Sea | P | +1 production and +1 gold on every hex with a Fishing Boat. | none | none |
| God of the Forge | P | Each military building gives +2 production. | none | none |
| Rites of Blood | P | Killing a unit grants faith equal to its strength. | none (army) | The Sacred Host is the same line |
| Oracle of the Crossroads | P | Scouts and settlers gain +1 movement and +1 sight. | none | none |
| Sacred Fire | P | +2 production in every town. | none | none |
| Desert Fathers | P | Desert hexes gain +1 food and +1 faith. | none (faith supply) | none |
| Winter Mother | P | +1 food and +1 faith on every tundra hex. | none (faith supply) | none |
| The Stone Hoard | P | Mines and quarries on a resource gain +1 culture and +1 faith. | none (faith supply) | The Blessed Forges (improved strategic resources) |
| The Vigil | P | A town keeping a rite gains +15% science and culture. | R | The Rites of Zhou, The Festival Calendar, The Priest-Astronomers, The Fetials (the same scope) |
| Vineyard Rites | P | +1 food and +1 culture on every hex with a Plantation. | none | Lay Offerings, The Temple Herds |
| Cult of Heroes | P | +15% renown. | none | Sacred Patronage (its price falls as renown rises) |
| Herd Gods | P | +1 production and +1 faith on every hex with a Pasture. | none (faith supply) | Lay Offerings, The Temple Herds (pastures) |
| Patron of Merchants | P | +1 faith and +2 gold for each different luxury you hold. | none (faith supply) | The Incense Road is the same count |
| The Muses | P | +1 faith for every 3 culture you make each turn. | none (faith supply) | The readers of faith income: The Zealots, The Learned Clergy, The Poor Tables |
| Cathedrals of the Sky | F | Temples supply +2 science and +2 culture. | B | The Temple Storehouses, The Monastery Libraries, The Cloister, The Tithe (Temples) |
| Pilgrimage | F | A town that follows gains +1 faith for every 3 followers. | D, weak | none. No card counts followers. Cards count citizens. |
| Feast Days | F | +1 happiness for every city that follows, and Temples supply +1 happiness. | D, B | The Deaconries, The Temple Storehouses (happiness a second and third time) |
| Holy Water | F | Towns that follow and stand on fresh water gain +10% food. | none | none |
| Lamps of the Shrine | F | Shrines in towns that follow give +2 science. | B | First Rites, The Temenos (Shrines) |
| Choirs | F | +1 culture for every 4 citizens of a city that follows. | D | The Deaconries (citizens of a devout town) |
| Tithe Houses | F | +1 gold for every 3 citizens of a city that follows. | D | The Deaconries |
| The Quiet Hours | F | In towns that follow, each building that supplies faith gives +2 culture and +1 happiness. | B | The Temple Workshops, The Temple Herds, The House of Worship (the same count) |
| Warrior Monks | F | +10 combat strength for units defending a city that follows. | none (army) | The Spiritual Host |
| Harvest Blessing | F | +1 food on every farm worked by a city that follows. | none | none |
| Guild of the Faithful | F | +15% production toward buildings in every town that follows. | B, weak | none reads it |
| Common Table | F | A city that follows keeps a quarter of its stored food when it grows. | D, weak | The Imarets (growth in devout towns) |
| Minarets | F | Unlocks the Mosque: +3 faith, +2 production and +1 authority. | B, S, D | The Offered Stones, The Fabric Fund, The Consecration Feast, The Book of Life (bought with faith); The Two Swords, The Commander of the Faithful (authority) |
| Temple Spires | F | Unlocks the Wat: +3 happiness, and +1 faith for every 2 citizens. | B, S | the same purchase readers |
| The Open Kitchen | F | Unlocks the Gurdwara: +3 food, +3 faith, and +1 science for every 3 citizens. | B, S | the same purchase readers |
| The Eternal Flame | F | Unlocks the Dar-e Mehr: +25% faith in its town. | B, S | the same purchase readers |
| The Alms Box | F | Your faith buys 25% more in towns that follow this religion. | S | The Offering Chests, The Canons of the Holy Sepulchre (the same rider) |
| Reliquaries | E | +1 culture for every 3 faith you make each turn. | none (faith income) | The Theoric Fund is the same line |
| Inquisition | E | Rival religions press your towns at 70% strength. +1 authority for every two of your cities that follow your religion. | D | Commission: The State Church (the same count), The Holy Inquisition (the same two effects) |
| The Long Road | E | Your religion presses 2 harder along trade routes. | none (spread) | Pilgrim Markets (routes) |
| Itinerant Preachers | E | Towns that follow press your religion 5 hexes further. | none (spread) | none |
| The Pulse of Bells | E | A proclamation reaches 4 hexes further and presses 20 faith harder. | none (spread) | Mission Houses, The Second Prophet, The Field Mass |
| Ecclesia | E | Each holy site gives +1 faith for each town in the world that follows your religion. | none (holy ground) | The Pilgrim Towns (the same count on the same hex) |
| Apostles | E | Your faith buys 40% more when you buy an apostle. | S | The Second Prophet, The Mission, The Offering Chests |
| Sacred Cartography | E | Your trade routes press your religion at both ends. | none (spread) | none |
| Holy Order | E | Unlocks Knights Templar, bought with faith. They gain +6 strength in land that follows your religion. | S (army) | The Soldiers of God |
| Congregation | E | +2 faith for every town in the world that follows your religion. | D in part | The Living Hymnal, The Defenders of the Faith, The Great Commission (the same count) |
| Pilgrims' Coin | E | +4 gold for every city in the world that follows. | D in part | the same |
| World Church | E | +15% culture for every empire in the world that follows you. | none (spread) | none |
| The Long Prayer | E | +1 culture for every 4 citizens in the world who follow you. | none (spread) | The Tithe of Nations (the same count) |
| The Crusade | E | Your units gain +6 strength in foreign land that follows your religion. | none (army) | The Spiritual Host, The Crusader Orders |
| Marvels of the Faith | E | +5 science and +5 culture for every city in the world that follows you and holds a wonder. | none | Sacred Commissions, The Pious Masons (wonders) |
| The Scriptoria | E | +1 science for every faith building in a city that follows you. | B | The Temple Workshops and others, but it uses a different count (A.4) |

### A.2 For each build, the beliefs that feed it

| Build | Beliefs that feed it | Count | What is missing |
|---|---|---|---|
| Rites (14 cards and more) | The Vigil | 1 of 56 | A follower belief and an enhancer belief. A seat that does not draw The Vigil in age 1 has no rites belief for the whole game. |
| Faith spent (12 cards) | The Alms Box, Apostles, Holy Order, and the four faith houses as things to buy | 7 | No belief reads faith spent or pays when faith is spent. The seven give discounts and things to buy. |
| Devout towns and authority (12 cards) | Choirs, Tithe Houses, Pilgrimage, Feast Days, Common Table, Minarets, Inquisition, and in part Congregation and Pilgrims' Coin | 9 | Only Minarets and Inquisition touch authority. Inquisition arrives last: it is an enhancer, drawn after three follower beliefs and Theology. |
| Faith buildings (9 cards) | Cathedrals of the Sky, Lamps of the Shrine, The Quiet Hours, Feast Days, Guild of the Faithful, the four faith houses, The Scriptoria | 10 | No god. Nothing in age 1 points at Shrines or Temples. |

- The faith buildings build has the best belief support. The Quiet Hours and the four houses raise or read the exact count the cards use.
- Minarets is the best single belief for cohesion. The Mosque is a faith building, it is bought with faith, and it gives authority. It serves three builds.
- 35 beliefs serve none of the four builds: 22 gods, 3 follower beliefs and 10 enhancer beliefs.

### A.3 Beliefs with no card, and cards that assume a belief

**Beliefs that connect to no Devotion card.** Goddess of the Harvest, The Standing Stones, River Mother, Lord of the Sea, God of the Forge, Oracle of the Crossroads, Sacred Fire, Desert Fathers, Winter Mother, Holy Water, Harvest Blessing, Itinerant Preachers, Sacred Cartography, World Church. This is acceptable for gods, which every deck draws. It is weaker for Holy Water and Harvest Blessing, which take one of three follower places and join nothing.

**Beliefs that are a card's line a second time.**

| Belief | The card or Doctrine with the same line |
|---|---|
| Reliquaries | The Theoric Fund (the same shape and the same numbers) |
| Rites of Blood | The Sacred Host |
| Patron of Merchants | The Incense Road |
| Inquisition | The Holy Inquisition (both effects), Commission: The State Church (the authority) |
| The Alms Box | The Offering Chests |
| Ecclesia | The Pilgrim Towns |
| The Long Prayer | The Tithe of Nations |
| Choirs | Ancestor Worship (a belief, not a card) |

A seat that holds both gets a bigger number and no new decision. A belief should raise a count that a card reads, or read a count that a card raises.

**Cards that assume a belief that may not be chosen.**
- **The Doctors of the Church** (III, rare: "Follower beliefs pay 150% more in your towns") and **The Apostolic Camera** (Doctrine IV). Eight of the 17 follower beliefs pay no yield line: Warrior Monks, Guild of the Faithful, Common Table, The Alms Box and the four house beliefs. A religion that holds three of those gives the rare nothing to raise. The beliefs are chosen long before Tier III.
- **The Soldiers of God** (IV) needs a way to buy military units with faith: a Cathedral, The Shrine Guards (a Dominion shared card) or the belief Holy Order.
- **Mission Houses** and **The Pulse of Bells** both need prophets or apostles to proclaim. Neither helps a seat that does not buy clergy.
- **The cards that count "towns following your religion"** need a religion that the seat founded: The Living Hymnal, The Defenders of the Faith, The Pilgrim Towns, The Tithe of Nations, The Great Commission, The Mass Baptisms, Pentecost and The Mission. The world holds at most two religions for every three players (live, `rules.religion.maxReligions`). A seat that misses a founding holds these as dead cards. The "devout" cards still work for that seat, because the religion its capital follows counts (ruled 2026-11-20).
- **The House of Worship** (Doctrine III) opens all four houses. A seat that chose a house belief already has one of them, so the Doctrine and the belief overlap in part.

### A.4 Quantities that beliefs and cards count differently

| Idea | The counts in the data | Who uses which | The problem |
|---|---|---|---|
| A town of the faith | (a) `follows`: the town follows this religion, whoever owns it. (b) `ownersFaith`: a town of yours that follows a religion you are paid by, or your capital's religion if you founded none. (c) `followingCities`: every town in the world that follows the religion you founded. | (a) every follower belief. (b) every card that says "devout", and the belief Inquisition. (c) Congregation, Pilgrims' Coin, Ecclesia, Marvels of the Faith, The Living Hymnal, The Defenders of the Faith, The Pilgrim Towns, The Great Commission. | Three rules, and the texts do not keep them apart. Inquisition says "your cities that follow your religion" for count (b), which every card calls "devout". The Living Hymnal says "every city following your religion" for count (c). The Defenders of the Faith says "towns that follow your religion" for count (c) too. |
| The people of the faith | Followers in a town (`followersHere`), or all citizens of a following town (`population`). | Followers: Pilgrimage and three consecrations. Citizens: Choirs, Tithe Houses, The Deaconries, the Wat, the Gurdwara. | Two counts for "the faithful in a town". A town that is 60% converted pays Choirs in full and Pilgrimage at 60%. No card reads followers. |
| A faith building | (a) a building that supplies faith: its category is faith, or its row or any card line on it pays faith (`buildingsSupplying`). (b) a building of the faith category. | (a) The Temple Workshops, The Temple Herds, The Quiet Hours, The House of Worship, The Bell Tower, the Cathedral School, Notre-Dame, The Great Sphinx. (b) The Scriptoria, The Treasury of Relics, Harun al-Rashid, Hildegard. | The texts say "faith buildings", "buildings that supply faith" and "religious buildings" without a rule. Under count (a) a Library counts while The Monastery Libraries is seated. Under count (b) it does not. |
| Town or city | One thing. | Both words, in beliefs and in cards. | CLAUDE.md asks for one word for one thing. |
| Faith | Faith made each turn, and faith spent this game. | Made: Reliquaries, The Muses, The Theoric Fund, The Zealots, The Learned Clergy, The Poor Tables. Spent: The Book of Life, The Pilgrim Staff, The Sacred Bequests. | These are named clearly, and they work together. No change is needed. |

Count (a) of the faith building is a hidden strength of the deck. A card or a luxury that puts faith on other buildings makes them count: The Temple of the Muses (culture buildings), The Monastery Libraries (Libraries), Jade from age 3 (production buildings), and the legacy of Āryabhaṭa (science buildings). This is my reading of `buildingSuppliesFrom`. I did not test it.

---

## B. Scaling

**The yardsticks.**
- The power bar: a regular card pays 15 to 25 a turn at Tier I, 35 to 60 at Tier II and 60 to 120 at Tier III. A headline card pays 40 to 50, 100 or more, and 200 or more (`references/power-bar.md`).
- The median seat makes 225 a turn in age 2, 543 in age 3 and 2,450 in age 4. Its faith is 14, 36 and 128 a turn (power bar).
- A Magisterial seat after the nerf (estimate, from the direction review): a work pays 16 in age 2 and 36 in age 4 in a typical seat, and 96 in the full set. Three works in age 2 pay 48. Six works in age 4 pay 216 typical and 576 in the full set.

**What faith buys (live).**
- 2 faith buys 1 production (`production.faithPerHammer`). Gold is 4 for 1, so 1 faith is worth 2 gold.
- A rite costs 20 faith, plus 5 for each rite started before it. The age does not change it.
- A prophet costs 120 faith and 60 more each time. An apostle costs 90 and 40 more each time. An inquisitor costs 200.
- A faith house costs about 235 faith.
- A great-person draft under Sacred Patronage costs 5 faith for each point of renown. The eighth great person costs 654 renown, so 3,270 faith.
- The riders add: The Offering Chests (25% more), The Alms Box (25% more) and The Canons of the Holy Sepulchre (40% more) are −20, −20 and −28.6 on the price. Together 1 faith buys about 1.6 production in a town with a holy site (estimate).

**The seats I assume (estimate).** Age 2: 5 towns of 6 citizens. Age 3: 8 towns of 9. Age 4: 11 towns of 12. A committed Devotion seat makes 30, 90 and 300 faith a turn. "Typical" holds two of the build's cards. "Committed" holds the build's full set.

| Build | Age 2 typical | Age 2 committed | Age 3 typical | Age 3 committed | Age 4 typical | Age 4 committed |
|---|---|---|---|---|---|---|
| Rites | 24 | 90 | 81 | 392 | 144 | about 700, and about 1,000 with The Rogations seated since Tier I |
| Faith spent | 11 | 26 | 38 | 195 | 376 | 770 |
| Devout towns and authority | 5 | 44 | 50 | 180, and three more towns | 300 | 775, and many more towns |
| Faith buildings | 30 | 115 | 80 | 440 | 440 | 1,640 |
| Magisterial works after the nerf | 48 (three works) | | | | 216 (six works) | 576 (the full set) |

**The arithmetic (all estimates from live card numbers).**

*Rites.*
- Age 2 typical: the Rite of Fasting in two towns by hand. 2 towns × 6 citizens × 2 yields = 24. Those towns do not grow.
- Age 2 committed: The Rites Commonwealth puts the Fast in 5 towns (60). The Priest-Astronomers pays 5 × 4 = 20. The Rites of Zhou adds 10 food and 10 happiness. Total 90. One rite each ten turns costs about 3 faith a turn.
- Age 3 committed: The Double Feast adds the Night Watch. 8 towns × 9 × 3 = 216. The Psalter pays 5 × 9 science and culture for each town and each rite, each ten turns: 2 × 8 × 45 × 2 ÷ 10 = 144. The Priest-Astronomers pays 32. Total 392, before The Festival Calendar's +30%.
- Age 4 committed: 11 × 12 × 3 = 396. The Psalter 264. The Priest-Astronomers 44. Total about 700. The Rogations has no limit. With two realm rites it gains about 16 faith and 16 culture each ten turns, so about 300 a turn after 100 turns.
- Age 4 typical: the Fast by hand in four towns (96) and The Psalter (48).

*Faith spent.*
- Each faith spent buys 0.5 production. The Pilgrim Staff adds 0.25 culture, The Sacred Bequests 0.25 science, The Fabric Fund 0.25 production on a building. So a full set makes each faith worth about 1.4 yield, where it was 0.5.
- Age 3 committed: 90 faith a turn. 56 production with The Offering Chests, 22 culture, 22 science, 22 production. The Book of Life at about 2,500 faith spent gives +16% science and culture, about 40. The Offered Stones with 8 buildings gives 32. Total 195.
- Age 4 typical: 128 faith a turn gives 64 production and 32 culture. The Book of Life at its limit (+30%, 4,500 faith spent) is about 280 on a median seat. Total 376. The Book of Life is most of it.
- Age 4 committed: 300 faith a turn gives 187 + 75 + 75 + 75. The Book of Life 280. The Offered Stones with 20 buildings 80. Total about 770.
- The weak point is age 2. A typical seat makes 14 faith a turn, which buys 7 production.

*Devout towns and authority.*
- Age 2: a religion is new, and three of five towns are devout. The Settled Faith pays about 5. A committed seat adds The Living Hymnal: 6 following towns × 6 = 36.
- Age 3 committed, from the table of the design pass of 2026-11-20 (section r3-9): 10 devout towns under The Caliphate, The Holy Inquisition and the commission give about 18 spare authority. The game's own bonus is +20% production at 10 spare (about 21 on a median seat). Commission: The Anointing pays 60. The Living Hymnal pays 72. The Settled Faith pays 28. Total about 180, and +9 happiness from The Two Swords.
- The larger pay is width. A town of five or six citizens is worth 40 to 80 a turn in age 3 (power bar). Three more towns are worth about 180.
- Age 4 committed: 20 devout towns with Mosques give 45 spare. The Commander of the Faithful pays 270. The Anointing 120. The Living Hymnal 150. The Settled Faith 140. The production step 95. Total about 775, and +22 happiness.

*Faith buildings.*
- Age 2 typical: 5 towns with a Shrine and a Temple are 10 buildings. The Temple Workshops pays 20. First Rites pays 10.
- Age 3 committed: 8 towns × 5 buildings = 40. The Temple Workshops (2 each), The Painted Chapels (3 each) and The Quiet Hours (2 culture each) pay 280. The Prince-Bishops doubles the Workshops' line and the buildings' own faith (about 160 more). Total 440, and +40 happiness.
- Age 4 typical: 44 buildings. The Temple Workshops 88, The Cathedral Works 88, The Chapter Houses 264. Total 440.
- Age 4 committed: The House of Worship gives 9 buildings a town, 99 in all. The Temple Workshops doubled 396, the Doctrine's own line doubled 396, The Painted Chapels 297, The Quiet Hours 198, The Chapter Houses 264, The Cathedral Works 88. Total about 1,640. It costs about 944 faith a town.

**What the table says.**
- In age 2 a typical Devotion seat is at or below three Magisterial works. Only faith buildings keep pace. This is acceptable: the deck founds its religion in age 2.
- From age 3 every committed build passes the regular bar, and three pass the headline bar.
- In age 4 every committed build pays more than the full Magisterial set after the nerf. All four grow with towns × citizens or towns × buildings, so they favour a wide seat.
- The faith buildings build is the strongest, and it is also the largest sink for faith. It and the faith spent build are one plan in practice.

---

## C. Utility

A card is sealed for five turns when it is seated (live rule), so a utility card can be seated for one job and then replaced. Charters and "on draft" cards need no chair.

| Card | Tier | What it does | Worth a pick or a chair? | When |
|---|---|---|---|---|
| The First Offering | 0 | On draft: 60 faith. | A pick. | In the first three drafts. It buys the first god early. |
| The Healer-Priests | 0 | +10 healing in own territory. | A chair early, not later. | Against barbarians in age 1. |
| The Megaliths | 0 | Charter: stone circles. | A pick. | Any time. It needs no chair. |
| Consecrated Labor | I | Buy settlers and workers with faith in Shrine towns. | A chair. One of the deck's best. | While the seat founds towns. A settler costs about 72 faith. |
| The Gifts of the Faithful | I | Buy culture and faith buildings with faith. | A chair for the whole game in a faith spent or faith buildings seat. | It is the only card that lets faith buy ordinary buildings, and it is dealt only in Tier I. |
| The Shrine Guards (shared, Dominion) | I | Buy melee units with faith. | A chair in a war. | A safety net when a town is attacked. |
| The Founding Vows | I | Commission: three rites, then 250 faith. | A pick. | 250 is a lump that registers at Tier I (200 to 400). |
| The Fast, The Chantries | I | Charters: the Rite of Fasting, the Chapel. | Picks. | The Fast is the best rite for a wide seat. |
| The Hallowed Ground | I | Charter: the Rite of Hallowing (+1 faith on improved hexes). | Weak. | A town keeps one rite, and the Fast or a tree rite is better. |
| The Votive Gifts | I | While seated, a rite: production equal to the town's faith. | Not worth a chair. | A town makes 5 to 15 faith. Only a capital with The Royal Cult and The Creed gains much. |
| The Octave | I | Rites last twice as long. | Not worth a chair. | A kept rite counts again each ten turns, so length adds no pay. It saves about 3 to 10 faith a turn and half the clicks. |
| The Rites Commonwealth | I | The capital's rite is kept by every town. | A chair for the whole game. | It is build-defining, and it also removes the work of starting rites town by town. |
| The Anchorites, The Second Prophet | II | A further holy site for one charge. One more charge on bought clergy. | A chair for a few turns. | Seat it, buy the prophets, replace it. |
| The Parishes | II | Founded towns start devout. | A chair only while the seat still founds towns. | With Consecrated Labor it is strong. In a seat that has stopped founding it does nothing. |
| Mission Houses | II | Proclamations reach farther and press harder abroad. | A chair only in a spreading seat. | |
| The Fetials | II | Units from a town keeping a rite start as Veterans. | A chair in a war. | |
| The Offering Chests | II | Faith buys 25% more. | Weak alone, strong in the stack. | At 90 faith a turn it adds about 11 production. With The Alms Box and The Canons it is part of a combo. |
| The Double Feast | II | Two rites in a town. | A chair for the whole game in a rites seat. | |
| The Holy Inquisition | III | Rivals press 80% less. Each devout town gives +1 authority. | A chair. | The pressure half is the deck's safety net: it keeps towns devout. |
| The Pious Masons | III | Buy a half-built wonder with faith in a Cathedral town. | A chair for a few turns. | Seat it when a wonder is half built. |
| The Mission, The Conversion of Kings | II, III | Commissions: an Apostle and 300 culture; a Prophet and 1,000 culture. | Picks in a spreading seat. | 1,000 culture registers at Tier III (500 to 900). |
| The Year of Release | IV | On draft: ten turns of faith. | A pick. | 1,300 to 3,000 faith at once, and it counts as spent when it is used. |
| The Host Restored | IV | While seated, a rite: units near the town heal 25 a turn. | A chair only when a town is under attack. | It takes the town's rite place. |
| The Last Offering, The Interdict | IV | Faith buys 50% more Opus production in the holy city. A rival's following town adds nothing to its Opus. | Chairs in the endgame. | The Interdict is the deck's answer to a rival's Opus, and it rewards the spread. |

**Answer.** The utility is useful. The permissions (Consecrated Labor, The Gifts of the Faithful, The Pious Masons) are the strongest part. Two risks:
- **Tier I holds two cards that later builds need and cannot get again:** The Gifts of the Faithful and The Rites Commonwealth. Only the current tier is dealt. A seat that misses them cannot run those builds at full size. A prophet's realm rite and the faith houses are the partial replacements.
- **Three cards are weak:** The Octave, The Votive Gifts and The Hallowed Ground. Section F proposes what to do with two of them.

---

## D. Late game

### D.1 Does each theme have a satisfying Tier III or IV option?

| Theme | Tier III | Tier IV | Early cards still seated | Verdict |
|---|---|---|---|---|
| Rites | The Psalter, The Naming Feasts | The Host Restored (a war rite only) | The Rites Commonwealth, The Double Feast, The Rogations (no limit) | Yes. The rule-breakers come early, and The Rogations and The Psalter grow with towns. Tier IV adds nothing, and it does not need to. |
| Faith spent | The Sacred Bequests, The Fabric Fund, The Offered Stones, The Pious Masons (rare) | The Year of Release, The Soldiers of God, The Last Offering | The Book of Life (reaches its limit at 4,500 faith), The Pilgrim Staff | Yes. The Pious Masons and The Last Offering are the late prizes. |
| Devout towns and authority | The Caliphate (rare), The Holy Inquisition, The Two Swords, Commission: The Anointing | The Commander of the Faithful, The Great Commission | The Living Hymnal (no limit), The Settled Faith | Yes for width. Thin for authority as its own path (D.2). |
| Faith buildings | The Prince-Bishops, The Cathedral Works, the Doctrine The House of Worship | The Chapter Houses | The Temple Workshops, The Painted Chapels | Yes. It is the strongest. |

### D.2 The authority path

Your picture of the deck is "faith allows greater authority and wider empires". Your ruling in the Commerce pass was: "I don't like too many cards that lower authority on a per-city level", and "Authority needs to be a limiting factor for growth." So the path gives authority as a figure that the seat earns.

**The path today, by role.**

| Role | Tier I | Tier II | Tier III | Tier IV | Beliefs |
|---|---|---|---|---|---|
| Supply: religion gives authority | none | Commission: The State Church (goal: six towns, all devout) | The Holy Inquisition, The Caliphate | none | Inquisition (enhancer), Minarets (the Mosque) |
| Widen: spare authority pays something | none | none | The Two Swords (happiness), Commission: The Anointing (faith and culture in devout towns) | The Commander of the Faithful (faith and culture) | none |
| Multiply | none | none | none | none | none |
| Act: a choice or a moment | none | none | none | none | none |

**What is missing.**
1. **Tier II has only a commission.** A religion is founded at about the start of Tier II. The seat then waits for Tier III, or needs six towns that are all devout.
2. **Spare authority pays faith, culture and happiness only.** The path never reaches production or science. The game's own bonus stops at 10 spare (+20% production, live), and the path makes 20 to 45 (the table in section r3-9 of the design pass).
3. **No act.** The path is set up once, and then it pays with no further decision.
4. **It touches no other build.** Only the Mosque joins it to anything.

**The path after changes 3 and 4.**

| Tier | Cards |
|---|---|
| II | **The Truce of God (new)**, Commission: The State Church, The Parishes |
| III | The Holy Inquisition, The Caliphate, The Two Swords, Commission: The Anointing, **The Patriarchate (new)** |
| IV | The Commander of the Faithful |
| Beliefs | Inquisition, Minarets, and Feast Days after change 2 (rites that pay for themselves keep The Truce of God running) |

No multiply card is proposed. The Sovereign Writ (Expansionist, III, rare: "Spare authority's bonus has no ceiling.") is that card, and with 45 spare it gives +90% production (estimate). One such card in the game is enough.

### D.3 The four changes

**Change 1. One word for each count.** Text change.
- The belief Inquisition: "Rival religions press your towns at 70% strength. +1 authority for every two devout towns." The count is already the one that "devout" names.
- Every count of the world says "in the world": The Living Hymnal, The Defenders of the Faith and The Pilgrim Towns gain those words. Congregation and Ecclesia have them.
- "Town" replaces "city" in belief and card texts.
- "Building that supplies faith" becomes the one term for the count that grows. The Compendium's faith page says what it means, as it does for "devout".
- No rule changes. The sheet rows whose text changes become `modify: wording`, and `docs/beliefs.md` changes with the data.

**Change 2. Feast Days becomes the rites belief.**

| Field | |
|---|---|
| Name | Feast Days (follower belief, a revision) |
| Text | "A town that follows gains +1 faith for every two citizens while it keeps a rite." (proposed) |
| Live text | "+1 happiness for every city that follows, and Temples supply +1 happiness." |
| Age goal | Age 2, commit: the first follower beliefs are chosen when the religion is founded. |
| Theme and role | Rites, widen: a rite pays faith, which only the Rite of Hallowing does today. It fills the largest gap in the map: no follower belief reads a rite. It is a bridge to devout towns ("a town that follows") and to faith spent (a rite is faith spent). |
| Role | Pay-off. Floor: one town of 6 keeping a rite gains +3 faith. Ceiling: under The Rites Commonwealth in age 4, 11 towns of 12 gain +66 faith. |
| Councils | Early: The Rites Commonwealth, The Fast, The Rogations, The Pilgrim Staff. Late: the same with The Double Feast and The Psalter. |
| Attention | None added. The player already chooses which towns keep rites. |
| Power | A rite costs 20 faith and 5 more each time (live). A town of 6 gets 30 faith back in ten turns, and a town of 12 gets 60 (estimate). So a rite in a following town about pays for itself. Median faith in age 3 is 36 a turn, and eight towns of 9 add 32. |
| Synergy | Raises: faith made, and so faith spent. Reads: towns keeping a rite, towns that follow, citizens. Fed by: The Rites Commonwealth, The Double Feast, The Octave, the Chapel, Chichen Itza, and every card that grows towns. Feeds: The Book of Life, The Pilgrim Staff, The Sacred Bequests, The Learned Clergy, The Zealots, The Poor Tables. |
| Displaces | The happiness line, which The Deaconries, The Temple Storehouses and the Wat already give. |
| Condition | The town must follow, and it must keep a rite. |
| Shape | **Existing shape:** `pays`, `where: city`, `basis: count`, `count: population`, `per: 2`, with the scope `all` of `follows` and `keepingRite`. Cathedrals of the Sky uses the same compound scope, and The Deaconries the same count. |

Your text of 2026-11-10 was "Rites in a town that follows last 5 turns longer". It was held back because the rite length asked no town. Since the Chapel (2026-11-20), `riteTurnsFor` takes the town. So "Rites in a town that follows last 50% longer" is now a small extension. I do not recommend it: a kept rite already counts again each ten turns, so length only saves faith.

**Change 3. The Truce of God** (new).

| Field | |
|---|---|
| Name | The Truce of God. The medieval Church named holy days on which nobody might fight. The name is not used in `data/` or `docs/`. |
| Band, rarity | Tier II, uncommon |
| Text | "+1 authority for each town keeping a rite." (proposed) |
| Age goal | Age 2 and 3: authority binds at five or six towns. |
| Theme and role | Devout towns and authority: supply, and the path's first act card, because the authority lasts only while rites are kept. It joins rites to authority, which nothing does today. |
| Role | Pay-off. Floor: two or three towns keep a rite, so +2 or +3, which is Local Clerks (generic, Tier II, common: "Gain +3 authority."). Ceiling: every town under The Rites Commonwealth, +8 in age 3 and +11 in age 4. |
| Councils | Early: The Rites Commonwealth, The Fast, The Rogations, The Truce of God, The Settled Faith. Late: it gives way to The Holy Inquisition, or stays beside it for The Commander of the Faithful. |
| Attention | The player keeps rites running, which a rites seat does already. The authority screen shows the line. If the rites end, the authority falls, and that is the decision. |
| Power | +8 authority in age 3 holds two or three more towns, each worth 40 to 80 a turn (power bar), or it reaches the +20% production step. A regular Tier II card pays 35 to 60. |
| Synergy | Raises: authority. Reads: towns keeping a rite. Fed by: The Rites Commonwealth, The Double Feast, The Octave, the Chapel, Chichen Itza, the Doctrine The Capitulary of Herstal, a prophet's realm rite, and Feast Days after change 2. More than three exist at or before Tier II. Feeds: The Two Swords, Commission: The Anointing, The Commander of the Faithful, The Patriarchate, and outside the deck The Sovereign Writ, The Mandarinate and The Nomarchs. |
| Displaces | A flat faith card of Tier 0 or I. |
| Condition | It pays only while rites are kept. It lowers no town's price. |
| Shape | **Existing shape:** `authority`, `amount: 1`, `per: city`, with the scope `keepingRite`. The Holy Inquisition is the same shape with the scope `ownersFaith`. |
| Type | Civic |

**Change 4. The Patriarchate** (new).

| Field | |
|---|---|
| Name | The Patriarchate. The seat of a patriarch, as at Constantinople. The name is not used in `data/` or `docs/`. |
| Band, rarity | Tier III, uncommon |
| Text | "Your holy city gains +2 production and +2 science for each point of spare authority." (proposed) |
| Age goal | Age 3 into age 4: turn a wide empire into the Magnum Opus. |
| Theme and role | Devout towns and authority: widen. Spare authority pays production and science, which the path does not reach today. |
| Role | Pay-off. Floor: 5 spare gives +10 and +10. Ceiling: 45 spare gives +90 and +90 in one town. |
| Councils | Late: The Caliphate, The Holy Inquisition, The Two Swords, The Patriarchate, then The Commander of the Faithful and The Last Offering at Tier IV. The holy city builds the Opus. |
| Attention | None added. The count is on the card (`showCountValue`, as on The Two Swords). |
| Power | At 20 spare (10 devout towns, r3-9) it pays 80. At 45 it pays 180. A regular Tier III card pays 60 to 120, and a headline card 200. The Commander of the Faithful pays 3 and 3 at Tier IV, so 2 and 2 is one step below it. |
| Synergy | Raises: production and science in the holy city. Reads: spare authority, the holy city. Fed by: Inquisition, the Mosque, Commission: The State Church, The Holy Inquisition, The Caliphate, The Truce of God, and outside the deck Local Clerks, The Founders' Rights, Tyranny, The Forbidden City and several legacies. Feeds: The Last Offering, The Saint Peter's Indulgence, and wonders in the holy city (Sacred Commissions, The Pious Masons). |
| Displaces | A flat science and culture card of Tier II. |
| Condition | The seat must hold a holy city. A seat with no religion of its own gains nothing. |
| Shape | **Existing shape:** `pays`, `where: city`, `basis: count`, `count: authoritySurplus`, with the scope `holyCity`. The Creed uses `where: city` with a count and a scope, and The Nomarchs pays the capital for each point of spare authority. To check in the build: that the `holyCity` scope reads correctly on a `pays` line. |
| Type | Civic (the halves are even, and one is Civic) |

**The combinations these open, each through a general quantity.**
- **Towns keeping a rite → authority → the holy city.** A realm rite gives one authority for each town, and that spare authority becomes production in one town.
- **Rites that pay for themselves.** Feast Days returns a rite's price, so the count of faith spent rises at no cost, and every reader of faith spent or faith made gains.
- **Spare authority across decks.** Every source of authority in the game now feeds a Tier III reader in Devotion, and Devotion's supply feeds The Sovereign Writ and The Mandarinate.
- **The Mandarinate and The Universal Monarchy with The Caliphate.** Both Doctrines raise the price of a town. The Caliphate sets a devout town's price to 1, and a set price is not changed by a delta or a percentage (the `cityCost` docblock in `statecraftData.ts`). So the drawback goes. Two Doctrines whose drawbacks cancel are intended (ruled 2026-10-16).

---

## E. Synergy across the whole game

| Theme | What outside the deck raises or reads the same quantity | Gaps |
|---|---|---|
| Rites (towns keeping a rite, rites started) | The Festival Calendar (shared, Magisterial). The Priest-Astronomers, The Observers' Charter and the Cathedral School (shared, Scientific). The Votive Accounts (shared, Commerce: it gains on each rite started). Human Sacrifice (Expansionist Doctrine: the capital levies a citizen for a realm rite). Chichen Itza, The Great Ziggurat. Hildegard of Bingen ("Cities keeping a rite pay +20% culture."). The Long Memory (generic: scalers gain twice, so The Rogations). The Curia (Civic cards pay 30% more). | Dominion has only the Vigil of Arms and The Fetials, both inside Devotion. Commerce has no reader except The Votive Accounts, although the Rite of Plenty pays gold. No legacy and no luxury reads a rite. |
| Faith spent (faith spent, things bought with faith) | The Votive Accounts. Sacred Patronage (shared, Magisterial). Rerolls cost faith, so the Magisterial reroll card queued on 2026-11-23 raises faith spent. Fatima al-Fihri (buildings that supply science or faith cost 30% less). al-Khwārizmī (faith buys science buildings). The Valley of Kings and The Sainte-Chapelle (leader buildings that open faith purchases). The Pyramid of the Sun (a levy for faith). Justinian (a wonder completed pays faith). Harun al-Rashid (a technology pays faith). Rites of Passage and The Sacred Host (shared, Dominion: units and kills pay faith). The Great Sphinx (free rerolls). | Expansionist has no faith sink of its own. No wonder reads faith spent. Professional Soldiers and Mercenary Contracts read "units you purchase", but they are Dominion and Commerce shared cards, and a Devotion seat sees them only with Dominion. |
| Devout towns and authority (devout towns, spare authority) | The Sovereign Writ and The Mandarinate (Expansionist). The Nomarchs (Magisterial). The legacies of Ibn Khaldun (+2 science for each spare point), Gracia Mendes Nasi (happiness and gold for each spare point), Solon, Chanakya, Lü Buwei and Ptahhotep (authority). Tyranny (+5). The Forbidden City (+5), the Imperial Throne, Monuments (+1 each). The Market Writ, The Horrea, The Pacified Marches, Local Clerks, The Founders' Rights, Empire Without End. The Good Years (generic: the bonus for spare happiness is doubled, which The Two Swords and The Deaconries feed). The Ribats (a captured town is converted, so The Caliphate prices it at 1). | Commerce and Scientific have no reader of spare authority among their cards. No wonder reads devout towns. No luxury gives authority to this build. |
| Faith buildings (buildings that supply faith) | The Builders' Lodge (generic, Tier I: "Orders that add yields to buildings pay double."). The Painted Chapels (shared, Magisterial). The Schoolmen's Charter, The Monastery Libraries, The Sky Watchers and The Pythagorean Brotherhood (Scientific). The Hearth Fire (shared, Expansionist). The Temple of the Muses (Magisterial: culture buildings give faith, so they count). Notre-Dame and The Great Sphinx (happiness and culture for each). Hildegard, Harun al-Rashid and Al-Ma'mun (leaders). Jade from age 3. The legacies of Bezalel, Enheduanna, Āryabhaṭa and Hildegard. The consecration The Treasury of Relics. | Dominion and Commerce have none. |

**Connections worth making later, each through a general quantity.**
- **Commerce and rites.** A Commerce card could read "towns keeping a rite" for gold or for trade routes. The Rite of Plenty is in the technology tree, so every seat can keep a rite.
- **Dominion and devout towns.** A captured town that is devout could pay a Dominion card. The Ribats already converts on capture, so the quantity exists.
- **Scientific or Commerce and spare authority.** One reader in either deck would give the authority path a partner beyond Expansionist and Magisterial.

These are for the other decks' passes. I propose no card for them here.

**Strong combinations that exist today across decks.** The list in `docs/plans/devotion-design-pass-2026-11-20.md` ("Known strong combinations") is still correct. Three more:
- **The Caliphate with The Sovereign Writ** (Expansionist and Devotion, Jayavarman VII): 45 spare authority gives +90% production (estimate).
- **The stack of "faith buys more".** The Offering Chests, The Alms Box, The Canons and Apostles add to 97% off an apostle (estimate). With Fatima al-Fihri a faith building passes 98% off.
- **The count of buildings that supply faith with The Temple of the Muses or Jade** (A.4). Every culture or production building then pays The Temple Workshops, The Quiet Hours and The House of Worship.

---

## F. Simplification

Your words: "I'm realizing the game has so many mechanics, i'd love to simplify wherever we can."

The game has 13 live rites: five from the technology tree, seven from Devotion cards and one from a shared card. A town keeps one rite, or two with The Double Feast. So most rites are never chosen.

| Mechanic | What it does (live) | Fold it? | The plain card it becomes (proposed) | What is lost |
|---|---|---|---|---|
| Rite of Fasting (The Fast) | No growth; +1 science and +1 culture for each citizen. | Keep | | It is a real choice with a cost. |
| Rite of the Sabbath (The Sabbath Laws) | Builds nothing; production becomes culture. | Keep | | The same. |
| Vigil of Arms (The Vigil of Arms) | +4 strength for units within three hexes. | Keep | | It is the deck's one war rite. |
| Rite of Hallowing (The Hallowed Ground) | +1 faith on improved hexes. | Fold | "Towns keeping a rite gain +1 faith on each improved hex." | Little. The rite is the weakest choice, and as a card it adds to any rite. Existing shape (`pays` on `improved` hexes with the scope `keepingRite`). |
| Rite of Naming (The Naming Feasts) | +2 food for each citizen. | Fold | "Towns keeping a rite gain +1 food for each citizen." | The tree's Rite of the Harvest is already the food rite. Existing shape. |
| Votive Offering (The Votive Gifts) | Production equal to the town's faith. | Fold | "Towns keeping a rite gain production equal to half their faith." | Little. Today it needs a chair and the town's rite place. Existing shape (a share of faith with the scope `keepingRite`, as The Cloister has for Temples). |
| Restoring of the Host (The Host Restored) | Units within three hexes heal 25 a turn. | Fold | "Your units heal 25 more each turn in land that follows your religion." | The link to a town. Small extension (the healing line of The Healer-Priests with a "follows" ground test). |
| Chapel (The Chantries) | +2 faith, +2 culture, rites in its city last 50% longer. | Keep | | You wrote its text, and it is one more building for the count. |
| Bell Tower (The Bell Towers) | +1 faith; presses +1 harder for each faith building. | Fold or cut | "Each building that supplies faith presses your religion +1 harder in its town." | Since 2026-11-23 a Temple doubles the pressure of its town's own religion, so the Bell Tower's job is mostly done by the Temple. To check: that a card can carry a `pressure` line. |
| The four faith houses | Mosque, Wat, Gurdwara, Dar-e Mehr: bought with faith in a town that follows. | Keep all four | | They are the deck's best bridge: a faith building, a faith sink and (the Mosque) authority. Without them the faith spent build has little to buy late. |

**Result.** Four rites and one building leave. The rites fall from 13 to 9. Four more cards then read "towns keeping a rite", which is the theme's own quantity. The choice of a rite becomes simpler, and the rites that stay are the ones with a cost or a clear use.

The Octave is weak (section C), and it is not a mechanic. If a card must leave Tier I, it is my first choice.

---

## What I could not verify

- **All power figures.** No test, bot game or measurement was run. The seat sizes and the faith income of a committed seat are my assumptions. The power bar predates the changes of November.
- **Whether a purchase price has a floor.** The riders add (`cardPurchaseRiders` docblock). I did not read what happens at or past 100% off.
- **Whether rival pressure can go below zero.** Inquisition (−30) and The Holy Inquisition (−80) add to −110%. I did not read `rivalShare`.
- **What The Prince-Bishops doubles.** I took the reading of the design pass of 2026-11-20: a building's own faith and the card lines that are marked `onCountedBuilding`. I did not read the amplifier.
- **Which card lines make a building "supply faith".** The docblock of `buildingSuppliesFrom` says every line a card or a luxury puts on the building counts. I did not check The Temple of the Muses, Jade or The Tithe Barns one by one.
- **The game's own bonus for spare authority.** I used the design pass's words (+10% production and border growth at 5, +20% at 10) and did not read `meters.ts` past the tier function.
- **`docs/religion-v2.md` disagrees with the data on rites.** It says four rites are taught by an Order, that The Octave adds 50%, and that the Votive Offering lasts one turn. The data has seven rites marked `byCard`, The Octave at 100, and every rite at ten turns. I followed the data and `docs/beliefs.md`.
- **Whether the Almshouse is reachable.** Its row is live and `unlockedByCard`, and I found no live card that opens it.
- **The shapes of changes 2, 3 and 4.** I read the effect rows that use the same fields. I did not read the evaluator arm for each, so "existing shape" means the vocabulary can write it, not that it was run.
- **How often a Devotion seat fails to found a religion.** The limit is two religions for every three players. I have no bot figure for it.
- **Leaders, generic Doctrines and luxuries.** I searched their data for faith, rites, religion and authority by keyword. A row that touches a theme in other words may be missing from section E.

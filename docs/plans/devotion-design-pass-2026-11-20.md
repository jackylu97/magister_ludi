# Devotion design pass (2026-11-20)

**Status, 2026-11-21: the pass is CLOSED. Nothing is open.** Every ruling of the three rounds is applied, with your five comments on the closing round (changes 89 to 93). You made no comment on the five open points, so each default stands. Nothing is built, and no game data changed in this pass.

Your request, 2026-11-20:

> *"ok lets do a pass on devotion and scientific."*

Your words that shaped this round, 2026-11-21:

> *"my thinking with rites: we should add a rule that rites can't be activated once one has already started (this might already be in). Rite should ideally give a bonus throughout the rite so it doesn't have anti-synergy with longer rites, and rites that have been started should count as having been started to avoid anti-synergy with active rite abilities."*

> *"For now, i want the game to be fun over balanced for playtesters."*

- This file is the current state. Section 1 says where the pass stands. Section 2, "Ready for the build", and section 3, the final deck, are the whole list a builder follows.
- The deck goes from 63 cards to 78, with 27 shared cards and 17 Doctrines.
- I added no cap and no drawback that you did not ask for. Section 2 names the strong combinations and leaves them.
- Every number is a first guess against the power bar, to tune in playtest. I ran no bot games and no tests.
- The review page keeps the anchors `change-01` to `change-88`. Your last five comments are `change-89` to `change-93`, and the points are `r3-1` to `r3-11`.

## 1. Where the pass stands

### r3-1. The deck in numbers

**This deck's own cards**

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare | Need a religion |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 1 | 3 | 4 | 0 | 6 | 2 | 0 | 0 |
| I | 17 | 1 | 6 | 9 | 1 | 7 | 9 | 1 | 0 |
| II | 22 | 3 | 5 | 12 | 2 | 8 | 11 | 3 | 14 |
| III | 21 | 2 | 7 | 10 | 2 | 5 | 11 | 5 | 9 |
| IV | 10 | 2 | 1 | 6 | 1 | 3 | 5 | 2 | 4 |
| **All** | **78** | **9** | **22** | **41** | **6** | **29** | **38** | **11** | **27** |

**Own and shared together** (you count the commons, uncommons and rares of a deck, not its own cards against its shared ones)

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|---|---|
| 0 | 13 | 1 | 3 | 9 | 0 | 10 | 3 | 0 |
| I | 29 | 4 | 7 | 17 | 1 | 11 | 17 | 1 |
| II | 29 | 4 | 7 | 16 | 2 | 9 | 15 | 5 |
| III | 24 | 3 | 7 | 12 | 2 | 5 | 12 | 7 |
| IV | 10 | 2 | 1 | 6 | 1 | 3 | 5 | 2 |
| **All** | **105** | **14** | **25** | **60** | **6** | **38** | **52** | **15** |

**By note**

| Note | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The spreading faith: pressure, proclamations, followers abroad | 0 | 0 | 7 | 3 | 3 | 13 |
| The purse of faith: faith spent and what it buys | 1 | 4 | 2 | 4 | 2 | 13 |
| Rites as acts | 0 | 7 | 2 | 2 | 0 | 11 |
| The army of the faith | 1 | 2 | 3 | 2 | 2 | 10 |
| The temple economy: faith buildings | 1 | 3 | 1 | 3 | 1 | 9 |
| Holy ground: holy sites, sacred works, the herds | 2 | 0 | 4 | 1 | 0 | 7 |
| The faith and the crown: authority | 0 | 0 | 1 | 4 | 1 | 6 |
| Faith income (glue) | 3 | 0 | 0 | 1 | 1 | 5 |
| Devout towns and beliefs | 0 | 1 | 2 | 1 | 0 | 4 |
| **All** | 8 | 17 | 22 | 21 | 10 | 78 |

**How often each card is seen** (the chance that a named card is the Devotion card of a hand)

| Tier | Commons / uncommons / rares | Each common | Each uncommon | Each rare | A seat is offered a named rare in |
|---|---|---|---|---|---|
| 0 | 6 / 2 / 0 | 11% | 17% | none | none |
| I | 7 / 9 / 1 | 8.6% | 3.3% | 10% | 50% |
| II | 8 / 11 / 3 | 7.5% | 2.7% | 3.3% | 25% |
| III | 5 / 11 / 5 | 12% | 2.7% | 2.0% | 16% |
| IV | 3 / 5 / 2 | 20% | 6.0% | 5.0% | 23% |

- **78 cards:** 22 as they are today, 34 changed or moved, and 22 new. 7 of today's 63 cards are retired.
- **10 charters** take no chair (2 today). 2 boons, 6 commissions and 2 scalers. 68 cards take a chair.
- **Cards that need a founded religion: 27 of 78 (35%).** Today it is 30 of 63 (48%). In Tiers II to IV it is 27 of 53 (51%), from 30 of 43 (70%).
- **Cards that pay faith: 19 of 78 (24%).** Cards that pay "science and culture" as a pair: 9, from 12.
- **Shared cards: 27.** Dominion 6, Expansionist 5, Commerce 5, Scientific 7, Magisterial 4. I checked each against `data/decks/common.json` as Astra built it.
- **Doctrines: 17** (5, 4, 5 and 3).
- **The spreading faith is 13 cards** after the cut of The Processions: six that spread the religion and seven that pay for the towns that follow. **Holy ground is 7** and is still the thin note. I add nothing to it.
- **Tier 0 has no rare,** and Tier I has one, The Rites Commonwealth, which you confirmed.
- **Chairs:** eight cards moved from Civic to Economic after your comment (change 89). The deck was 49 Civic and 14 Economic, and it is 41 and 22.
- **Nothing in the deck needs a fifth age.** Every Order, Doctrine, rite and charter sits in Tiers 0 to IV, which need the four ages of the beta. The latest technology that a card of this deck needs is The Holy Office, in the fourth age.

- **To rule:** Nothing to rule.

### r3-2. Your round-two rulings are in

- **Cut:** The Processions (64).
- **Charters now:** The Bell Towers (65) and The Call to Prayer (66). Section r3-7 says what each opens.
- **Your lines:** The Hallowed Ground (67): the town's improved hexes gain +1 faith while the rite lasts. The Vigil of Arms (68): all units within three hexes gain +4 strength and keep it while the rite lasts.
- **The Consecration Feast (69)** pays for a faith building that is bought too.
- **No cap:** The Poor Tables (71), The Two Swords (75) and The Commander of the Faithful (76).
- **The Blessed Forges (73)** is Tier I and is kept, as in the Scientific pass.
- **The Caliphate (78):** devout towns cost 1 authority.
- **Approved as written:** 62, 63, 70, 72, 74, 77, 79 and 80. You said that The Offered Stones (70) is the first card to cut after the playtest.
- **Your answers:** The Megaliths is this deck's own card, in two tiers. The Offering Chests is a Tier II rare. The Rites Commonwealth stays the only rare of Tier I.

- **To rule:** Nothing to rule.

### r3-3. The three rite rules, and every rite under them

- **Rule 1: a town that keeps a rite cannot start another.** This is in the game today. The rite gate refuses a town with no free place (`riteClausesBeforeTheBank`, `src/sim/religion.ts`). A town has one place, and two with The Double Feast. Only the realm's rite takes the place of a rite that a town keeps.
- **Rule 2: a rite pays through its whole length.** Two live rites act at once today, and round two proposed three more that did. Change 81 makes the rule, and the table shows each rite under it.
- **Rule 3: a rite that is kept counts as started.** Section r3-4 has the form.

| Rite | Opened by | What it pays while it lasts | Under rule 2 |
|---|---|---|---|
| Rite of the Harvest | Divination | Hexes that give food give +1 more. | It lasts already. No change. |
| Omen Reading | Divination | +1 science for each building in the town. | No change. |
| Consecration of the Bounds | Stonecraft | Resource hexes gain +1 culture, and this town's borders grow 30% faster. | Your line (90). The border clause stays (the user, 2026-11-21: "keep the faster borders"). |
| Blessing of Arms | Bronze Working | +10 defence for the town. | No change. |
| Rite of Plenty | Currency | The town gains +1 gold for each citizen. | Your line (91). |
| Rite of Fasting | The Fast, a charter | The town does not grow, and gains +1 science and +1 culture for each citizen. | No change. |
| Rite of the Sabbath | The Sabbath Laws, a charter | The town builds nothing, and gains its production as culture. | No change. |
| Rite of Hallowing | The Hallowed Ground, a charter (67) | The town's improved hexes gain +1 faith. | Your line. It replaces the rite that claimed three hexes at once. |
| Vigil of Arms | The Vigil of Arms, a charter (68) | All your units within three hexes of the town gain +4 strength, and keep it while the rite lasts. | Your line. It replaces +5 for five turns. |
| Rite of Naming | The Naming Feasts, a charter (40, 82) | The town gains +2 food for each citizen. | Reworked (82). You ruled two citizens at once; over ten turns this gives about two. |
| Night Watch | The Observers' Charter, shared with Scientific | The city gains +1 science for each citizen. | It lasts. Your ruling in the Scientific pass. |
| Votive Offering | The Votive Gifts, while it is seated | The town gains production equal to its faith. | Reworked (83). Today it turns faith into production at once. |
| Restoring of the Host | The Host Restored, while it is seated | Your units within three hexes of the town heal 25 health each turn. | Reworked (84), with a town's own reach by your comment (92). |

- The Preaching and Recasting the Omens are retired rows, and they stay retired.
- The Rite of Procession is cut with its card.
- **The Votive Offering is the rite that rule 1 hurts most.** Today it holds the town's rite place for one turn, so a town that keeps any rite can never make the offering. Under long rites the card is dead. Changes 83 and 84 give the two rites that act at once a form that lasts.
- **Lengths.** Every rite above is ten turns. The Octave, the Chapel and Chichen Itza lengthen all of them by the rule of change 63.

- **To rule:** Nothing to rule. Changes 81 to 84 and 90 to 92 are in the build list.

### r3-4. Rule 3: the cards that read a rite started

- **The one form: the card pays when the rite starts, and again for each ten turns the town keeps it.** A rite of ten turns counts once. A rite of thirty turns counts three times: at the start, at turn 10 and at turn 20.
- I chose this over "a tenth each turn". A scaler gains whole steps, and a commission counts whole rites, so a tenth does not fit them.
- **The price of a rite rises only when a rite really starts.** So a long rite is the cheap one, and it loses nothing.

| Card | Text now | Eight towns, ten-turn rites | Eight towns, thirty-turn rites |
|---|---|---|---|
| The Rogations | Gains +1 faith and +1 culture each time a town starts a rite, and again for each ten turns it keeps one. | +8 of each for every ten turns; a price each ten turns | +8 of each for every ten turns; a price each thirty turns |
| The Psalter | Each rite a town starts grants science and culture equal to five times the town's population, and again for each ten turns it keeps the rite. | towns of 10: 400 science and 400 culture each ten turns | the same, each ten turns |
| The Founding Vows | Goal: start three rites. Reward: 250 faith. (The text does not change.) | met by three rites | met by one rite kept for twenty turns |
| The Votive Accounts (shared with Commerce) | The text does not change. It gains +1 for a rite started, at most +20. | +8 each ten turns, to its cap | the same |

- Before rule 3, eight towns under thirty-turn rites gave The Rogations +8 once in thirty turns. Now a longer rite never makes such a card worse.
- The Rites Commonwealth's shared rite counts once for each town it reaches, at the start and at each ten turns, as a prophet's rite over the realm counts today.

- **To rule:** Nothing to rule. The form stands (85).

### r3-5. One rite at a time: what a town chooses among

- With rule 1 a town picks one rite and keeps it to its end. A seat has the five rites of the technology tree, and each charter rite that it drafted.

| What the town wants | Rites that compete for the one place |
|---|---|
| To grow | Rite of the Harvest; Rite of Naming |
| Science | Omen Reading; Rite of Fasting; Night Watch |
| Culture | Rite of the Sabbath; Rite of Fasting; Consecration of the Bounds |
| Faith | Rite of Hallowing |
| Gold | Rite of Plenty |
| Production | Votive Offering |
| War | Blessing of Arms; Vigil of Arms; Restoring of the Host |

- **Are the new rites too many? No.** The deck opens six rites by charter (Fasting, the Sabbath, Hallowing, the Vigil, Naming, and the Night Watch with Scientific) and two with a seated card. A charter is drafted, so a seat holds two or three of them in most games, and its towns choose among seven or eight rites.
- A charter rite should beat the free rite of the same kind, because it cost a draft. Naming beats the Harvest in any town of four or more, and the Night Watch beats Omen Reading in a town with more citizens than buildings. That is right.
- **The Double Feast** gives a second place, and it is the card that makes the menu a pairing: Naming with the Night Watch, or the Vigil with the Restoring of the Host.
- **No rite takes the place of The Processions.** The round has three new rites without it: Hallowing, the Vigil and Naming. I named a candidate, the Rite of Pilgrimage (the town presses your religion twice as hard), and you did not ask for it.
- Four rites now pay for each citizen: Fasting (science and culture), Naming (food), the Night Watch (science) and, by your line, Plenty (gold).

- **To rule:** Nothing to rule.

### r3-6. The Fast and the Night Watch

| Rite | Card | For ten turns | A town of 12 |
|---|---|---|---|
| Rite of Fasting | The Fast (this deck, Tier I, a charter) | The town does not grow, and gains +1 science and +1 culture for each citizen. | +12 science and +12 culture; it gives up about one citizen |
| Night Watch | The Observers' Charter (shared with Scientific, Tier I) | The city gains +1 science for each citizen. | +12 science |

- **I agree with the advice: leave both.** The Fast pays twice as much, and half of it is culture, which buys drafts. Its price is the town's growth. The Night Watch pays less and costs nothing.
- With rule 1 they compete for one place. A seat that holds both uses the Fast in a town that has stopped growing, and the Night Watch in a town that still grows. With The Double Feast a town keeps both: +24 science and +12 culture.
- You revised The Fast yourself on 2026-10-25, with its growth stop. If you find that you never take it beside the Night Watch, the fix is one line: the fast pays +2 culture for each citizen and no science.

- **To rule:** Nothing to rule.

### r3-7. The two charters: what each opens

- A charter in this game opens a thing and takes no chair. The data has five kinds of thing: a rite, an improvement, a building, a unit, or a charter technology (`charter.unlocks`).
- **The Bell Towers (86) opens a building, the Bell Tower:** a small faith building, +1 faith, and its town presses your religion +1 harder for each faith building it holds. A bell tower is a building, and it is one more faith building for the temple economy.
- **The Call to Prayer (87) is a rule with nothing to build, so it opens a technology, Liturgy,** and the technology carries the rule: your holy sites press your religion twice as far. This is how The Closed Book works in Scientific: its rule moved to the technology Ciphers. Mechanics and Casting carry rules the same way.
- Liturgy costs 360 science, in the third age, under The High Temple. The star chart needs a place for it.
- One difference for The Bell Towers: your first line reached every town that follows your religion. The building reaches the towns that hold a Bell Tower. You left the default, so the building stands.

- **To rule:** Nothing to rule. Changes 86 and 87 are in the build list.

### r3-8. The House of Worship: what the phrase meant

- Each of the four faith houses is opened by one follower belief: **Minarets** opens the Mosque, **Temple Spires** the Wat, **The Open Kitchen** the Gurdwara, and **The Eternal Flame** the Dar-e Mehr.
- A religion holds three follower beliefs of seventeen. So a religion has the house of each such belief that it chose, and many religions have none.
- **The Doctrine gives your devout towns all four,** and it does not ask which beliefs your religion chose. That was the meaning of "whatever beliefs your religion holds".
- The text now (changes 88 and 93): "Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith. Buildings that supply faith give +1 science and +1 culture."
- **Your added bonus (93)** pays every building that supplies faith, in any town. A town with nine such buildings gains +9 science and +9 culture, and The Prince-Bishops doubles it. It is in the list of strong combinations.

- **To rule:** Nothing to rule.

### r3-9. Authority with no caps

- The Caliphate is at 1 authority for each devout town. The Two Swords and The Commander of the Faithful have no cap.

| Spare authority | The game's own bonus | The Two Swords | The Commander of the Faithful | Commission: The Anointing |
|---|---|---|---|---|
| 5 | +10% production and border growth | +2 happiness | +15 faith and +15 culture | not met |
| 10 | +20% | +5 happiness | +30 faith and +30 culture | met: each devout town +3 faith and +3 culture |
| 20 | +20% | +10 happiness | +60 faith and +60 culture | met |

| A realm of devout towns, in age 4 | Capacity | Cost | Spare |
|---|---|---|---|
| 10 towns: The Caliphate, The Holy Inquisition, the commission of The State Church | 29 | 9 | 20 |
| The same, with a Mosque in each town | 39 | 9 | 30 |
| 20 towns, with the three cards | 44 | 19 | 25 |
| 20 towns, with a Mosque in each | 64 | 19 | 45 |

- **With all the pieces, a new devout town adds spare authority.** It costs 1, and it gives 1 through The Holy Inquisition, a half through the commission, and 1 with a Mosque. So growth pays this seat.
- At 45 spare the two readers give +22 happiness, +135 faith and +135 culture. It is in the list of strong combinations, and I leave it, as you asked.
- It needs a rare and an uncommon of Tier III, a commission, and for the Mosques a Doctrine and 236 faith a town. A town that is not devout costs its full 3.

- **To rule:** Nothing to rule.

### r3-10. Nothing is open

You made no comment on the five open points, so each default stands. They are in "Ready for the build".

1. **The two rites that acted at once (83 and 84)** become rites that last. The Votive Offering: the town gains production equal to its faith. The Restoring of the Host: units heal 25 each turn, within three hexes of the town by your comment (92).
2. **The Rite of Naming (82):** for ten turns the town gains +2 food for each citizen.
3. **The form for rule 3 (85):** a card that reads a rite started pays at the start, and again for each ten turns the rite is kept.
4. **The Bell Towers (86)** opens the Bell Tower, a building.
5. **The Vigil of Arms:** your units that stand within three hexes of the town when the rite starts gain +4, and keep it until the rite ends.

- **To rule:** Nothing to rule.

### r3-11. Your five comments on the closing round

| Where | Your words | Result |
|---|---|---|
| The deck in numbers, the Civic count of 49 | "could we move a few civics to economic" | Eight cards move to the Economic chair (89). 41 Civic and 22 Economic. |
| The rites table, Consecration of the Bounds | "modify: resource hexes gain +1 culture" | The rite reads: Resource hexes gain +1 culture, and this town's borders grow 30% faster. (90). The user confirmed that the border clause stays. |
| The rites table, Rite of Plenty | "gains +1 gold for every population in the city." | The rite reads: This town gains +1 gold for each citizen (91). |
| The rites table, Restoring of the Host | "this needs to be a city-wide bonus, not an empire wide bonus" | Units within three hexes of the town heal 25 health each turn (92). The Vigil of Arms has the same reach. |
| The House of Worship | "let's add an addtional bonus: buildings that supply faith give +1 science and +1 culture." | Added, with no cap (93). |

**The eight chair moves**

| Card | Tier | Why it is Economic |
|---|---|---|
| Lay Offerings | 0 | It pays on pastures, camps and plantations: the land. |
| The Megaliths | 0 | It opens a work that workers build, as Expansionist's charters do. |
| The Hallowed Ground | I | Its rite pays the town's improved hexes. |
| The Cliff Monasteries | II | It opens a work on the land. |
| The Old Holy Places | II | It pays on the holy site's hex. |
| The Pilgrim Towns | III | It pays production and culture on the holy site's hex. |
| The Consecration Feast | III | It pays food, and it pays for a building bought. |
| The Prince-Bishops | III | It doubles what buildings yield, as Expansionist's The Water Boards does. |

| Tier | Military | Economic | Civic | Wildcard | Economic and Civic cards that take a chair |
|---|---|---|---|---|---|
| 0 | 1 | 3 | 4 | 0 | 2 and 3 |
| I | 1 | 6 | 9 | 1 | 5 and 7 |
| II | 3 | 5 | 12 | 2 | 4 and 10 |
| III | 2 | 7 | 10 | 2 | 6 and 9 |
| IV | 2 | 1 | 6 | 1 | 1 and 5 |

- Every tier has a card for the Economic chair and a card for the Civic chair. Tier IV has one Economic card that takes a chair, The Last Offering, as it has today.
- I left the purse cards that pay culture or science for faith spent as Civic, as Commerce's Civic Receipts is.
- **A fifth age:** no card, Doctrine, rite or charter of this deck needs one.

- **To rule:** Nothing to rule. The user confirmed on 2026-11-21 that the border clause of the Consecration of the Bounds stays.

## 2. Ready for the build

- This section and section 3 are the whole list a builder follows. A number in brackets is the change it comes from.
- The Commerce and Expansionist builds are in the data. So these exist today and need nothing new: `perNeighbour` and `onePerTown` on an improvement row, `requiresAdjacentMountain`, `perNeighbour` on a card's hex row, a hex row that counts the buildings of its town, `foundingRider` with a building, the count `publicWorks`, `purchaseRider` on every purchase, a rank stamp for bought units, and a combat line scaled by an income.
- A retired row keeps its row with `retired: true`, so that a save which holds it still loads. Every new row needs a `flavor` line, and none is written here.

### Cuts

- **Retire 7 rows of `data/decks/devotion.json`:** The Saints' Fields (15), The Abbeys (18), The Lay Brothers (19), The Confessors (21), The Seven Pilgrimages (42), The Apostolic Succession (43), The Treasury of Merit (44).
- **`data/decks/common.json`:** no row is retired by this pass.
- Never built, so nothing to retire: The Saturnalia, The City of God, The Garrison Chapels, The Processions.
- The rule `followersShareSight` then has no live card. Keep it for saves.

### Text changes on a row that stays

| Card | Tier | The text to build | Change |
|---|---|---|---|
| The First Offering | 0 | On draft: gain 60 faith. | 02 |
| Consecrated Labor | I | Towns with a Shrine may buy settlers and workers with faith. | 05 |
| The Temple Workshops | I | Faith buildings give +1 food and +1 production each. | 12 |
| The Votive Gifts | I | Towns may keep the Votive Offering, a rite: for ten turns the town gains production equal to its faith. | 83 |
| The Octave | I | Your rites last twice as long. | 10, 63 |
| The Founding Vows | I | Goal: start three rites. Reward: 250 faith. | 11, 85 |
| The Rogations | I | Gains +1 faith and +1 culture each time a town starts a rite, and again for each ten turns it keeps one. | 85 |
| The Gifts of the Faithful | I | Towns with a Shrine may buy culture and faith buildings with faith. | 06 |
| The Rites Commonwealth | I | A rite your capital starts is kept by every town you hold. | 08 |
| Temple Estates | II | A holy site gains +2 food and +2 production for each improved hex beside it. | 14 |
| Mission Houses | II | Your proclamations reach 50% farther and are 50% more effective in foreign cities. | 20, 80 |
| Commission: The State Church | II | Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns. | 23 |
| The Old Holy Places | II | Holy sites gain +1 faith and +1 culture for every ten turns they have stood. | 16, 89 |
| The Offering Chests | II | Your faith buys 25% more. | 07, 79 |
| The Holy Inquisition | III | Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included. | 35 |
| The Psalter | III | Each rite a town starts grants science and culture equal to five times the town's population, and again for each ten turns it keeps the rite. | 32, 85 |
| The Consecration Feast | III | Finishing or buying a faith building grants its town food and culture equal to ten times its population. | 33, 69, 89 |
| The Pilgrim Towns | III | Holy sites gain +1 production and +1 culture for each town that follows your religion. | 31, 89 |
| The Offered Stones | III | +4 culture for each building you have bought with faith. | 34, 70 |
| The Caliphate | III | Devout towns cost 1 authority. | 78 |
| The Conversion of Kings | III | Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture. | 41 |
| The Host Restored | IV | Towns may keep the Restoring of the Host, a rite: for ten turns your units within three hexes of the town heal 25 health each turn. | 45, 84, 92 |
| The Great Commission | IV | Goal: more than half the world's cities follow your religion. Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture. | 46 |

- The Temple Workshops is the row `theWaysideShrines`, renamed. Its id stays.
- The Founding Vows keeps its new text (three rites, 250 faith), and its goal reads the count of rule 3.
- The cards in the next list change tier or rarity only.

### Moves and rarity changes

- **Tier:** The Offering Chests to Tier II (07). The Double Feast to Tier II (30). Pentecost to Tier II (29). The Megaliths is dealt in Tier 0 and in Tier I (`lastBand: 1`, 62).
- **To common:** The Anchorites (17); The Deaconries, The Parishes, The Spiritual Host (25); Mission Houses (80); The Chapter Houses (45).
- **To uncommon:** The Gifts of the Faithful (06); The Settled Faith (24); The Old Holy Places (16); The Tithe of Nations, The Host Restored, The Last Offering (45).
- **To rare:** The Offering Chests (07).
- **Chair:** Temple Estates is Economic (14). The Offering Chests is Economic (07). Eight cards move from Civic to Economic (89): Lay Offerings, The Megaliths, The Hallowed Ground, The Cliff Monasteries, The Old Holy Places, The Pilgrim Towns, The Consecration Feast and The Prince-Bishops.

### New cards of this deck (22)

- **Tier 0:** The Healer-Priests (04), The Megaliths (03, 62, 89).

- **Tier I:** The Zealots (13), The Chantries (09, 63), The Hallowed Ground (67, 89).

- **Tier II:** The Temple Herds (28), The Bell Towers (65, 86), The Fetials (22), The Cliff Monasteries (26, 89), The Vigil of Arms (68).

- **Tier III:** The Sacred Bequests (36), The Fabric Fund (37), The Defenders of the Faith (39), The Two Swords (75), The Prince-Bishops (38, 89), The Naming Feasts (40, 82), The Call to Prayer (66, 87), Commission: The Anointing (77).

- **Tier IV:** The Poor Tables (48, 71), The Soldiers of God (49), The Year of Release (47), The Commander of the Faithful (76).

- Section 3 has each card's text, rarity and chair.

### Shared cards, and what changes on other decks' sheets

- All shared rows live in `data/decks/common.json`.
- **Dominion** (`docs/decks/dominion.md`): The Sacred Host becomes an uncommon with the new text (51). The Field Mass is new (72): Tier III, uncommon, Military. The Oriflamme does not change.
- **Expansionist** (`docs/decks/expansionist.md`): The Hearth Fire is new (54): Tier I, uncommon, Economic. The Temple Baths is new (55): Tier II, common, Civic. Its list of unique improvements names the stone circle and the cliff monastery as works of this deck.
- **Commerce:** nothing. The Votive Accounts and The Incense Road are built. The Votive Accounts reads the rite count of rule 3.
- **Scientific** (`docs/decks/scientific.md`): The Blessed Forges moves to Tier I (73), as that pass says. The Observers' Charter joins this deck's shared table, and the Night Watch follows the three rite rules.
- **Magisterial** (`docs/decks/magisterial.md`): Sacred Patronage takes its price by renown (57). Sacred Commissions does not change.

### Doctrines

- The Temenos is new, at Tier I (59): The hexes beside your towns with a Shrine gain +1 food and +1 faith.
- The House of Worship moves to Tier III and takes the new text (60, 74, 88). Its four `unlocksBuilding` effects do not change. It gains your bonus (93): buildings that supply faith give +1 science and +1 culture.
- The Canons of the Holy Sepulchre: In towns with a holy site, your faith buys 40% more (79).
- 17 Doctrines: 5, 4, 5 and 3 by tier.

### The rite rules, and each rite's row

- **Rule 1** is built. No change.
- **Rule 2:** no rite row carries `atOnce` after this build. The two rows that have it change (83, 84).
- **The Vigil of Arms:** your units that stand within three hexes of the town when the rite starts gain +4 strength, and keep it until the rite ends.
- **Rule 3:** the tally `riteStarted` and the moment `rite` fire at a rite's start and again on each tenth turn of a live rite. `Player.ritesStarted`, which sets the price, rises only at a real start (81).
- **Lengths (63):** the percentages add. The Octave is +100% (from +50%). The Chapel is +50% for a rite started in its town. Chichen Itza stays +50%. The realm's rite has the length it has in the capital.

| Rite row | State | The row's text | Opened by |
|---|---|---|---|
| `riteOfHallowing` | new | This town's improved hexes gain +1 faith. | The Hallowed Ground |
| `vigilOfArms` | new | All your units within three hexes of this town gain +4 strength, and keep it while the rite lasts. | The Vigil of Arms |
| `riteOfNaming` | new | This town gains +2 food for each citizen. | The Naming Feasts |
| `nightWatch` | new, from the Scientific pass | This city gains +1 science for each citizen. | The Observers' Charter |
| `votiveOffering` | changed (83) | This town gains production equal to its faith. | The Votive Gifts, while seated |
| `restoringOfTheHost` | changed (84, 92) | Your units within three hexes of this town heal 25 health each turn. | The Host Restored, while seated |
| `consecrationOfTheBounds` | changed (90) | Resource hexes gain +1 culture, and this town's borders grow 30% faster. | Stonecraft |
| `riteOfPlenty` | changed (91) | This town gains +1 gold for each citizen. | Currency |
| the five other live rites | unchanged |  |  |

### Charters

| Charter | Tier | What it opens | Data | Model and icon |
|---|---|---|---|---|
| The Megaliths (new) | 0 and I | the stone circle, an improvement | `charter.unlocks.improvement: stoneCircle` | needed: a board model, an icon and a flair-gallery entry |
| The Fast | I | the Rite of Fasting | as today | none |
| The Chantries (new) | I | the Chapel, a building | `charter.unlocks.building: chapel`; the row gives +2 faith and +2 culture, and +50% rite length in its city; `ritePays` goes | the row exists; confirm that its icon does |
| The Hallowed Ground (new) | I | the Rite of Hallowing | `charter.unlocks.rites` | none: a rite has no prop |
| The Bell Towers (new) | II | the Bell Tower, a building | `charter.unlocks.building: bellTower`; a new row | needed: a building icon |
| The Sabbath Laws | II | the Rite of the Sabbath | as today | none |
| The Cliff Monasteries (new) | II | the cliff monastery, an improvement | `charter.unlocks.improvement: cliffMonastery` | needed: a board model, an icon and a flair-gallery entry |
| The Vigil of Arms (new) | II | the Vigil of Arms, a rite | `charter.unlocks.rites` | none |
| The Naming Feasts (new) | III | the Rite of Naming | `charter.unlocks.rites` | none |
| The Call to Prayer (new) | III | Liturgy, a charter technology that carries the rule | `charter.unlocks.tech: liturgy`; a new technology row: age III, 360, under The High Temple; it carries `pressureRule` `siteRange` | a place on the star chart |
| The Schoolmen's Charter (shared) | I | Scholasticism, which unlocks the Cathedral School | as today | exists |
| The Observers' Charter (shared, new) | I | Astronomy, which opens the Night Watch | the Scientific pass's build list | a place on the star chart |

### New improvements

- **Each needs four things: a data row, a way to build it, an icon and a board model.** A work with no board prop stops the game at load. So the model and the icon land in the same batch as the row, with a flair-gallery entry.
- `stoneCircle`: flat land with no feature; `onePerTown`; +2 faith and +1 culture; `perNeighbour` on a pasture, a camp or a plantation: +1 faith. Workers build it once The Megaliths is drafted.
- `cliffMonastery`: `requiresAdjacentMountain` (the terraces' row has it); `onePerTown`; +3 faith and +3 science; `perNeighbour` on a mountain: +1 faith and +1 science. Workers build it once The Cliff Monasteries is drafted.
- Both are unique improvements by Expansionist's keyword, so Commission: The Reclaimed Lands and The Cadastre read them.

### New and changed buildings

- `chapel` (changed): +2 faith and +2 culture; rites started in its city last 50% longer; buildable, and bought with faith under The Gifts of the Faithful.
- `bellTower` (new): a small faith building of the second age, about 67 hammers; +1 faith; its town presses your religion +1 harder for each faith building it holds.

### Base rules

- **The three rite rules** (81) and **rite lengths add** (63).
- **"Devout" for a seat with no religion of its own** (61): the religion its capital follows counts.
- **Faith buys more** (79, and `docs/flags.md`): The Offering Chests 25%, the Doctrine The Canons 40%, the beliefs The Alms Box 25% and Apostles 40%.
- **A great person's faith price** (57): 5 faith for each point of renown that the next great person costs.

### Every new shape and small extension, once

| Kind | What is new | Cards that need it |
|---|---|---|
| Rule | the rite count of rule 3: the tally and the moment fire again on each tenth turn of a live rite | The Rogations, The Psalter, The Founding Vows, The Votive Accounts |
| Rule | a rite length modifier that belongs to one town; one clock for the realm's rite | the Chapel; The Rites Commonwealth |
| Small extension | the capital's rite goes down the realm's path (`empireRiteAt`) | The Rites Commonwealth |
| New rite effect | a strength line on the units within range of a town, stamped with the rite's own last turn (`Unit.timed`) | the Vigil of Arms |
| New rite effect | a heal each turn for your units within three hexes of the town, read in `healUnits` | the Restoring of the Host |
| Small extension | a `pays` line on every building that supplies faith (`buildingSupplies`) | the Doctrine The House of Worship |
| Data only | rite rows with `pays` lines: +1 faith on improved hexes; +2 food for each citizen; production as a share of faith; +1 culture on resource hexes; +1 gold for each citizen | Hallowing, Naming, the Votive Offering, the Consecration of the Bounds, the Rite of Plenty |
| New improvements | `stoneCircle`, `cliffMonastery` (shapes exist) | The Megaliths, The Cliff Monasteries |
| New building | `bellTower`, with `pressure` counted by the faith buildings of its town | The Bell Towers |
| New charter technology | `liturgy`, with a `pressureRule` key `siteRange` | The Call to Prayer |
| Small extension | a rider on the moment `proclamationMade` that heals your units in range | The Field Mass |
| Small extension | a proclamation's reach, and its strength in foreign towns, as percentages | Mission Houses |
| Small extension | a rank stamp under a town scope (`keepingRite`); a stamp for units bought with faith | The Fetials, The Soldiers of God |
| Small extension | a combat line scaled by faith income, and by towns that follow | The Zealots, The Defenders of the Faith |
| Small extension | a hex row that counts the tens of turns a work has stood, or the towns that follow | The Old Holy Places, The Pilgrim Towns |
| Small extension | buildings bought with faith, counted for the whole empire (the gold count exists) | The Offered Stones |
| Small extension | a faith-building selector on `buildingYieldPercent`, and on the rider for a building finished or bought | The Prince-Bishops, The Consecration Feast |
| Small extension | a heal bonus in `healUnits` for units in your own territory | The Healer-Priests |
| Small extension | a tile test for the hexes beside a town that holds a building | The Temenos |
| Small extension | a commission goal that reads `authoritySurplus` | Commission: The Anointing |
| Small extension | happiness and yields by `authoritySurplus` or by faith income, with no cap | The Two Swords, The Commander of the Faithful, The Poor Tables |
| Small extension | `purchaseRider` on every purchase in the faith bank; a rider that pays a share of the faith paid | The Offering Chests, The Fabric Fund |
| Small extension | `offerPriceFaith` as a rate read with the renown ladder | Sacred Patronage |
| Small extension | one clause in the scope `ownersFaith` | change 61 |
| Data only | shapes the game has today | every other row |

### Known strong combinations

You asked for fun before balance, so none of these has a cap. Tune them after play.

| The combination | What it does | Its size | What it needs |
|---|---|---|---|
| The Rites Commonwealth with long rites | One rite in the capital is kept by every town, for up to 30 turns. | Two rites in eight towns for about 13 faith a turn, where it costs about 120 with no card. | A Tier I rare, The Octave, a Chapel in the capital, Chichen Itza, The Double Feast. |
| The Rites Commonwealth with the Rite of Naming | Every town gains +2 food for each citizen. | Eight towns of 12: +192 food a turn. | A rare and a Tier III charter. |
| The Rites Commonwealth with the Night Watch or the Fast | Every town gains +1 science for each citizen, and +1 culture with the Fast. | Eight towns of 12: +96 science, when a mean seat makes about 95 at turn 100. | A rare and a charter. It is Harun al-Rashid's seat. |
| The Rites Commonwealth with the Vigil of Arms | Every unit within three hexes of any town gains +4 for the whole rite. | +4 on the whole army for 10 to 30 turns, for one rite price. | A rare and a Tier II charter. |
| The Rogations and The Psalter under the realm's rite | Each town counts every ten turns. | Eight towns: The Rogations gains +8 faith and +8 culture each ten turns, with no cap. The Psalter pays 400 science and 400 culture each ten turns. | A rare and two uncommons. |
| The Caliphate, The Holy Inquisition, the commission and Mosques | A new devout town adds spare authority. | Twenty towns: 45 spare. With The Two Swords and The Commander of the Faithful: +22 happiness, +135 faith and +135 culture, and +20% production. | A rare and an uncommon of Tier III, a commission, a Doctrine, and two readers. |
| Consecrated Labor, The Hearth Fire, The Parishes and The Caliphate | A town is bought with faith, starts with a Shrine, is devout at once, and costs 1 authority. | A settler costs 72 faith, and 18 more for each one. | Two commons, a shared uncommon and a rare. |
| The House of Worship with the temple economy | Up to nine faith buildings in a town. Each gives +1 science and +1 culture by the Doctrine, and each is paid by five cards. | A town: +9 science and +9 culture, and +9 food and +9 production with The Temple Workshops. The Prince-Bishops doubles all of it. Twelve towns: +216 science and +216 culture, when a median seat makes about 480 science at turn 150. | A Tier III Doctrine, an uncommon, and 944 faith a town. |
| The Rites Commonwealth with the Rite of Plenty | Every town gains +1 gold for each citizen. | Eight towns of 12: +96 gold a turn. | A rare. The rite is in the technology tree. |
| The Defenders of the Faith, The Zealots, The Spiritual Host and the Doctrine The Paean | Flat strength from four sources, and the Vigil on top. | With 24 towns that follow: +8, +5, +4, up to +9, and +4: +30. | Three Military chairs and a Doctrine. |
| The Field Mass, The Oriflamme and The Second Prophet | An apostle with the army gives +4, and heals 25 three times. | About 450 health given back for one apostle. | Two shared cards and an uncommon. |
| The Poor Tables with The Prince-Bishops | Happiness from faith, with no cap. | 600 faith a turn: +30 happiness. | A Tier IV common. |
| Justinian with The Pious Masons | A finished wonder pays faith equal to its cost, and that faith buys the next half-built wonder. | Each wonder pays for most of the next. | The leader and a Tier III rare. |

### UI asked for

- **A rite's row** shows its length as a sum: "10 turns, +100% The Octave, +50% the Chapel: 25 turns".
- **A kept rite** shows the turns left, and the turn of its next ten-turn count.
- **The realm's rite:** the capital's rite button says how many towns it reaches, and each town shows that it keeps the realm's rite.
- **The Rogations, The Offered Stones, The Two Swords, The Commander of the Faithful and The Poor Tables** print what they pay now. The Scaler keyword does this for The Rogations.
- **The stone circle and the cliff monastery:** the build highlight shows the hexes that qualify, and what each would count beside it.
- **The Vigil of Arms:** the rite's preview marks the units that will gain the strength.
- **The Field Mass:** the proclamation's preview marks the units that will be healed.
- **Faith buys more:** the price chip shows the full price struck through beside the final one (`docs/flags.md`).
- **The star chart:** a place for Liturgy.

### For the builder to check

- That a rite's start turn can be read from its timed entry, so that the ten-turn count is a comparison and not a countdown.
- That a Rite of Fasting or a Sabbath kept for 30 turns over the realm can be replaced by a new realm rite when the capital's ends, and by nothing sooner.
- That the Bell Tower counts itself, and that a foreign religion's Temple does not count for your pressure.
- That a town which buys a faith building under The Gifts of the Faithful fires The Consecration Feast once, and not once for the purchase and once for the completion.
- That The Gurdwara's science for each citizen is listed in the build report, as the ruling on base science asks.
- `docs/decks/devotion.md` and `test/sim/decks/devotion.test.ts` change with the data. The four partner sheets change for their shared rows. `test/fixtures/cardText.json` holds the text of every changed, new and retired row.
- That a unit which leaves the three hexes of a town stops healing under the Restoring of the Host, and that the Vigil of Arms stamps units once, at the start.
- The bots price a charter at nothing today (`src/ai/value.ts`). They need a price for the stone circle, the cliff monastery, the Chapel, the Bell Tower and the new rites.

## 3. The final deck

- Each tier lists this deck's own cards, then the shared cards dealt in that tier. Status says what the pass did. A number in brackets is the change.

### Tier 0 (8 own cards and 5 shared)

| Card | Rarity | Chair | Text | Status | Shared with |
|---|---|---|---|---|---|
| Lay Offerings | common | Economic | Pastures, camps and plantations gain +1 faith and +1 food. | changed (89) |  |
| The Calling | common | Civic | Your capital gains +3 faith. | unchanged |  |
| The Tithe Barns | common | Economic | Cities with a Granary gain +1 faith and +1 production. | unchanged |  |
| The Household Gods | common | Civic | +2 faith in every town. | unchanged |  |
| The First Offering | common | Civic (Boon) | On draft: gain 60 faith. | changed (02) |  |
| The Healer-Priests | common | Military | Your units heal twice as fast in your own territory. | new (04) |  |
| The Royal Cult | uncommon | Civic | Your capital gains +1 faith for each citizen. | unchanged |  |
| The Megaliths | uncommon | Economic (Charter) | Workers may raise one stone circle in each town, on flat land: +2 faith and +1 culture, and +1 faith more for each pasture, camp or plantation beside it. | new (03, 62, 89); also dealt in Tier I |  |
| Rites of Passage | common | Civic | Gaining a military unit grants 12 faith. | unchanged | Dominion |
| Sacred Groves | uncommon | Civic | Worked forests gain +1 food and +1 faith. | unchanged (built by the Expansionist pass) | Expansionist |
| The Ambarvalia | common | Civic | Each town gains +1 faith for every two improved tiles. | unchanged | Expansionist |
| The Holy Spring | common | Civic | Towns beside a mountain or a lake gain +2 faith and +1 culture. | unchanged | Expansionist |
| The Merchant Shrines | common | Civic | Towns working an improved luxury gain +2 faith. | unchanged | Commerce |

### Tier I (17 own cards and 12 shared)

| Card | Rarity | Chair | Text | Status | Shared with |
|---|---|---|---|---|---|
| Consecrated Labor | common | Economic | Towns with a Shrine may buy settlers and workers with faith. | changed (05) |  |
| The Temple Storehouses | common | Economic | Temples give +2 food and +2 happiness. | unchanged |  |
| First Rites | common | Civic | Shrines give +2 faith. | unchanged |  |
| The Temple Workshops | common | Economic | Faith buildings give +1 food and +1 production each. | changed (12); was The Wayside Shrines |  |
| The Votive Gifts | common | Economic | Towns may keep the Votive Offering, a rite: for ten turns the town gains production equal to its faith. | changed (83) |  |
| The Pilgrim Staff | common | Civic | Spending faith grants culture equal to a fourth of it. | unchanged |  |
| The Zealots | common | Military | Your units gain +1 strength for every 10 faith you make each turn, at most +5. | new (13) |  |
| The Octave | uncommon | Civic | Your rites last twice as long. | changed (10, 63) |  |
| The Fast | uncommon | Civic (Charter) | Unlocks the Rite of Fasting: for ten turns a town does not grow, and gains science and culture equal to its population. | unchanged |  |
| The Creed | uncommon | Civic | Your capital gains +3 faith and +3 culture for every god and belief you hold. | unchanged |  |
| The Founding Vows | uncommon | Wildcard (Commission) | Goal: start three rites. Reward: 250 faith. | changed (11, 85) |  |
| The Rogations | uncommon | Civic (Scaler) | Gains +1 faith and +1 culture each time a town starts a rite, and again for each ten turns it keeps one. | changed (85) |  |
| The Gifts of the Faithful | uncommon | Economic | Towns with a Shrine may buy culture and faith buildings with faith. | changed (06) |  |
| The Martyrology | uncommon | Civic (Scaler) | Gains +2 faith and +2 culture each time one of your units dies in battle. | unchanged |  |
| The Chantries | uncommon | Civic (Charter) | Unlocks the Chapel: +2 faith and +2 culture, and rites in its city last 50% longer. | new (09, 63) |  |
| The Hallowed Ground | uncommon | Economic (Charter) | Unlocks the Rite of Hallowing: for ten turns the town's improved hexes gain +1 faith. | new (67, 89) |  |
| The Rites Commonwealth | rare | Civic | A rite your capital starts is kept by every town you hold. | changed (08) |  |
| The Shrine Guards | common | Military | Towns with a Shrine may buy melee units with faith. | unchanged | Dominion |
| The Sacred Host | uncommon | Military | Kills grant faith equal to the strength of the unit you killed. | changed (51) | Dominion |
| The Oriflamme | uncommon | Military | Military units beside one of your religious units gain +4 strength. | unchanged (52 not adopted) | Dominion |
| The Hearth Fire | uncommon | Economic | Towns you found start with a Shrine. | new (54) | Expansionist |
| The Votive Accounts | uncommon | Civic (Scaler) | Starts at +2 culture and +2 faith for your empire. Gains +1 of each every time you buy something with gold or faith, or start a rite, at most +20. | unchanged (built by the Commerce pass); rite rule 3 applies | Commerce |
| The Incense Road | common | Civic | +2 faith for each different luxury you hold. | unchanged (built by the Commerce pass) | Commerce |
| The Monastery Libraries | common | Civic | Libraries give +2 faith. Temples give +2 science. | unchanged | Scientific |
| The Schoolmen's Charter | uncommon | Civic (Charter) | Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | unchanged | Scientific |
| The Priest-Astronomers | common | Civic | Your capital gains +2 science and +2 faith for each town keeping a rite. | unchanged | Scientific |
| The Blessed Forges | uncommon | Civic | Improved strategic resources gain +1 faith and +1 production. | moved from Tier II (73; the Scientific pass's 82) | Scientific |
| The Observers' Charter | uncommon | Civic (Charter) | Opens Astronomy: your towns may keep the Night Watch, a rite: for ten turns the city gains +1 science for each citizen. | new in the Scientific pass (its 81) | Scientific |
| The Painted Chapels | uncommon | Civic | Religious buildings give +3 culture each. | unchanged | Magisterial |

### Tier II (22 own cards and 7 shared)

| Card | Rarity | Chair | Text | Status | Shared with |
|---|---|---|---|---|---|
| Temple Estates | common | Economic | A holy site gains +2 food and +2 production for each improved hex beside it. | changed (14) |  |
| The Anchorites | common | Civic | Your prophets raise a further holy site for one charge instead of two. | changed (17) |  |
| The Deaconries | common | Civic | Devout towns gain +1 happiness for every four citizens. | changed (25) |  |
| The Parishes | common | Civic | Each town you found starts out devout. | changed (25) |  |
| The Spiritual Host | common | Military | Military units gain +4 strength in land that follows your religion. | changed (25) |  |
| The Temple Herds | common | Economic | Pastures, camps and plantations gain +1 food and +1 production for each faith building in their town, at most +3 of each. | new (28) |  |
| Mission Houses | common | Civic | Your proclamations reach 50% farther and are 50% more effective in foreign cities. | changed (20, 80) |  |
| The Bell Towers | common | Civic (Charter) | Unlocks the Bell Tower, a faith building: +1 faith, and its town presses your religion +1 harder for each faith building it holds. | new (65, 86) |  |
| Commission: The State Church | uncommon | Wildcard (Commission) | Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns. | changed (23) |  |
| The Settled Faith | uncommon | Civic | Devout towns gain +15% science and culture. | changed (24) |  |
| The Sabbath Laws | uncommon | Civic (Charter) | Unlocks the Rite of the Sabbath: for ten turns a town builds nothing, and gains culture equal to its production. | unchanged |  |
| The Old Holy Places | uncommon | Economic | Holy sites gain +1 faith and +1 culture for every ten turns they have stood. | changed (16, 89) |  |
| The Second Prophet | uncommon | Civic | Prophets and apostles you buy start with one extra charge. | unchanged |  |
| The Living Hymnal | uncommon | Civic | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | unchanged |  |
| The Mission | uncommon | Wildcard (Commission) | Goal: convert two foreign cities. Reward: an Apostle and 300 culture. | unchanged |  |
| The Book of Life | uncommon | Civic | +1% science and culture for every 150 faith you have spent this game, at most +30%. | unchanged |  |
| The Fetials | uncommon | Military | Military units you gain in a town keeping a rite start as Veterans. | new (22) |  |
| The Cliff Monasteries | uncommon | Economic (Charter) | Workers may build one cliff monastery in each town, on a hex beside a mountain: +3 faith and +3 science, and +1 of each more for each mountain beside it. | new (26, 89) |  |
| The Vigil of Arms | uncommon | Military (Charter) | Unlocks the Vigil of Arms, a rite: all your units within three hexes of the town gain +4 strength, and keep it while the rite lasts. | new (68) |  |
| The Double Feast | rare | Civic | Your towns may keep two rites at once. | changed (30) |  |
| Pentecost | rare | Civic | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | changed (29) |  |
| The Offering Chests | rare | Economic | Your faith buys 25% more. | changed (07, 79) |  |
| The Crusader Orders | uncommon | Military | Military units gain +3 strength in land that does not follow your religion. | unchanged | Dominion |
| The Temple Baths | common | Civic | Each public work gives its town +2 faith and +1 happiness. | new (55) | Expansionist |
| Pilgrim Markets | uncommon | Civic | Trade routes to or from a town with a Holy Site gain +3 gold and +3 faith. | unchanged | Commerce |
| The Tithe | rare | Economic | Towns with a Temple gain gold equal to 25% of their faith. | unchanged | Commerce |
| The Cloister | rare | Civic | Towns with a Temple gain science equal to 30% of their faith. | unchanged | Scientific |
| The Festival Calendar | uncommon | Civic | Cities keeping a rite gain +30% food and +30% culture. | unchanged | Magisterial |
| Sacred Commissions | uncommon | Economic | Towns with a Holy Site build wonders 30% faster. | unchanged (56 not adopted) | Magisterial |

### Tier III (21 own cards and 3 shared)

| Card | Rarity | Chair | Text | Status | Shared with |
|---|---|---|---|---|---|
| The Cathedral Works | common | Civic | Cathedrals give +8 science and +2 happiness. | unchanged |  |
| The Sacred Bequests | common | Civic | Spending faith grants science equal to a fourth of it. | new (36) |  |
| The Fabric Fund | common | Economic | Buying a building with faith grants its town production equal to a quarter of the faith paid. | new (37) |  |
| The Defenders of the Faith | common | Military | Your units gain +1 strength for every three towns that follow your religion. | new (39) |  |
| The Two Swords | common | Civic | +1 happiness for every two points of spare authority. | new (75) |  |
| The Holy Inquisition | uncommon | Civic | Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included. | changed (35) |  |
| The Psalter | uncommon | Civic | Each rite a town starts grants science and culture equal to five times the town's population, and again for each ten turns it keeps the rite. | changed (32, 85) |  |
| The Consecration Feast | uncommon | Economic | Finishing or buying a faith building grants its town food and culture equal to ten times its population. | changed (33, 69, 89) |  |
| The Pilgrim Towns | uncommon | Economic | Holy sites gain +1 production and +1 culture for each town that follows your religion. | changed (31, 89) |  |
| The Mass Baptisms | uncommon | Civic | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | unchanged |  |
| The Offered Stones | uncommon | Economic | +4 culture for each building you have bought with faith. | changed (34, 70) |  |
| The Learned Clergy | uncommon | Civic | +2 science and +2 culture for every 10 faith your empire makes each turn. | unchanged |  |
| The Prince-Bishops | uncommon | Economic | Your faith buildings yield twice as much. | new (38, 89) |  |
| The Naming Feasts | uncommon | Economic (Charter) | Unlocks the Rite of Naming: for ten turns the town gains +2 food for each citizen. | new (40, 82) |  |
| The Call to Prayer | uncommon | Civic (Charter) | Opens Liturgy: your holy sites press your religion twice as far. | new (66, 87) |  |
| Commission: The Anointing | uncommon | Wildcard (Commission) | Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture. | new (77) |  |
| The Caliphate | rare | Civic | Devout towns cost 1 authority. | changed (78) |  |
| The Doctors of the Church | rare | Civic | Follower beliefs pay 150% more in your towns. | unchanged |  |
| The Conversion of Kings | rare | Wildcard (Commission) | Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture. | changed (41) |  |
| The Turning of Swords | rare | Military | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. | unchanged |  |
| The Pious Masons | rare | Economic | Towns with a Cathedral may buy a half-built wonder with faith. | unchanged |  |
| The Field Mass | uncommon | Military | Your proclamations heal your units within three hexes by 25 health. | new (72) | Dominion |
| The Monastic University | rare | Civic | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | unchanged | Scientific |
| Sacred Patronage | rare | Civic | You may buy a great-person draft with faith, at 5 faith for each point of renown the next great person costs. | changed (57) | Magisterial |

### Tier IV (10 own cards and 0 shared)

| Card | Rarity | Chair | Text | Status | Shared with |
|---|---|---|---|---|---|
| The Chapter Houses | common | Civic | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. | changed (45) |  |
| The Poor Tables | common | Civic | +1 happiness for every 20 faith you make each turn. | new (48, 71) |  |
| The Soldiers of God | common | Military | Military units you buy with faith gain +6 strength. | new (49) |  |
| The Tithe of Nations | uncommon | Civic | Gain 1 faith each turn for every two citizens in the world who follow your religion. | changed (45) |  |
| The Host Restored | uncommon | Military | Towns may keep the Restoring of the Host, a rite: for ten turns your units within three hexes of the town heal 25 health each turn. | changed (45, 84, 92) |  |
| The Last Offering | uncommon | Economic | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | changed (45) |  |
| The Year of Release | uncommon | Civic (Boon) | On draft: gain faith equal to ten turns of your faith. | new (47) |  |
| The Commander of the Faithful | uncommon | Civic | +3 faith and +3 culture for each point of spare authority. | new (76) |  |
| The Great Commission | rare | Wildcard (Commission) | Goal: more than half the world's cities follow your religion. Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture. | changed (46) |  |
| The Interdict | rare | Civic | A rival's town that follows your religion adds no production toward a Magnum Opus. | unchanged |  |

### Doctrines (17)

| Doctrine | Tier | Written for | Text | Status |
|---|---|---|---|---|
| The Theoric Fund | I | the purse | +1 culture for every 3 faith your empire makes. | unchanged |
| The Rites of Zhou | I | rites | Each town holding a rite gains +2 food and +2 happiness. | unchanged |
| The Serapeum | I | devout towns and beliefs | Each of your gods gives twice its effects. | unchanged |
| The Paean | I | the army | Your military units gain +1 strength for every god and belief you hold. | unchanged |
| The Temenos | I | holy ground | The hexes beside your towns with a Shrine gain +1 food and +1 faith. | new (59) |
| The Capitulary of Herstal | II | rites | Rites cost half as much. | unchanged |
| The Seven Councils | II | devout towns and beliefs | Your religion may hold one more follower belief and one more enhancer belief. | unchanged |
| The Patrimony of Peter | II | devout towns and beliefs | Your holy city's citizens demand no happiness. | unchanged |
| The Ribats | II | the army | Military units created in a town following your religion gain +3 strength for good. Conquering a town converts it to your religion. | unchanged |
| The Imarets | III | devout towns and beliefs | Your devout towns grow 25% faster. | unchanged |
| Canossa | III | the spreading faith | You and an empire whose capital follows your religion cannot declare war on each other. | unchanged |
| The Canons of the Holy Sepulchre | III | the purse | In towns with a holy site, your faith buys 40% more. | changed (79) |
| The Martyr's Crown | III | the spreading faith | Each of your units that dies in battle presses your religion on every town within three hexes. | unchanged |
| The House of Worship | III | the temple economy | Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith. Buildings that supply faith give +1 science and +1 culture. | changed (60, 74, 88, 93): Tier III, a clearer text and your bonus |
| The Saint Peter's Indulgence | IV | the purse | +1% production toward the Magnum Opus for every 150 faith you have spent this game. | unchanged |
| The Apostolic Camera | IV | the spreading faith | Your follower beliefs also pay you in every foreign town that follows your religion. | unchanged |
| The Two Sanctuaries | IV | holy ground | Hexes with a holy site have double yields, applied after every other change to the hex. | unchanged |

### The rites, and what each pays

- Section r3-3 has the table of all thirteen rites. Each lasts ten turns before the length modifiers, and each pays through its length.

### The unique improvements

| Work | Ground | Opened by | Its own yield | What it reads beside it |
|---|---|---|---|---|
| Stone circle | flat land, one in each town | The Megaliths (Tier 0 and I) | +2 faith, +1 culture | +1 faith for each pasture, camp or plantation |
| Cliff monastery | a hex beside a mountain, one in each town | The Cliff Monasteries (Tier II) | +3 faith, +3 science | +1 faith and +1 science for each mountain |

- A holy site is a great person's work, not a unique improvement. A prophet raises it.

## 4. Every change, with your ruling

| # | Card | Tier | Ruling | Your words | The line to build |
|---|---|---|---|---|---|
| 01 | The Calling | 0 | not adopted | "Way too strong, keep as is." | Not built. The Calling stays as it is today: Tier 0, common: Your capital gains +3 faith. |
| 02 | The First Offering | 0 | approved | "sure" | On draft: gain 60 faith. |
| 03 | The Megaliths | 0 | approved | "cool, should this be shared with expansionist?" | Tier 0, uncommon, Charter, as proposed. The answer to your question is change 62: not shared, and also dealt in Tier I. |
| 04 | The Healer-Priests | 0 | approved | "sure" | Tier 0, common, Military: Your units heal twice as fast in your own territory. |
| 05 | Consecrated Labor | I | approved | "great" | Towns with a Shrine may buy settlers and workers with faith. With the new base prices a first settler costs 72 faith and a first worker 28 (section r2-11). |
| 06 | The Gifts of the Faithful | I | your text | "this seems too strong. Lets make it culture and faith buildings instead of all buildings." | Tier I, uncommon, Economic: Towns with a Shrine may buy culture and faith buildings with faith. |
| 07 | The Offering Chests | III to I | your text | "age 1 seems too strong, how about age 2." | Tier II, rare, Economic: Your faith buys 25% more. It takes the "buys more" form of `docs/flags.md` (change 79). I read "age 2" as Tier II; question r2-q4. |
| 08 | The Rites Commonwealth | I | approved | "this is extremely powerful but i like it." | Tier I, rare, Civic: A rite your capital starts is kept by every town you hold. |
| 09 | The Chantries | I | your text | "that's too strong. How about chapel: +2 faith +2 culture, rites in this city last 50% longer" | Tier I, uncommon, Charter: Unlocks the Chapel: +2 faith and +2 culture, and rites in its city last 50% longer. The rule for lengths is change 63. |
| 10 | The Octave | I | approved | "Sure, lets make sure rite duration modifiers properly stack." | Your rites last twice as long. The rule for stacking is change 63. |
| 11 | The Founding Vows | I | approved | "sure" | Goal: start three rites. Reward: 250 faith. |
| 12 | The Temple Workshops (was The Wayside Shrines) | I | approved | "sure" | The row of The Wayside Shrines, renamed The Temple Workshops: Faith buildings give +1 food and +1 production each. |
| 13 | The Zealots | I | approved | "sure" | Tier I, common, Military: Your units gain +1 strength for every 10 faith you make each turn, at most +5. |
| 14 | Temple Estates | II | approved | "oh thats great, i like it" | Common, Economic: A holy site gains +2 food and +2 production for each improved hex beside it. |
| 15 | The Saints' Fields | II | cut | "Ok sure" | Cut. The Saints' Fields is retired. |
| 16 | The Old Holy Places | II | your text | "i like this, lets remove the cap" | Uncommon: Holy sites gain +1 faith and +1 culture for every ten turns they have stood. No cap. |
| 17 | The Anchorites | II | approved | "sure" | The Anchorites becomes a common, with the same text. |
| 18 | The Abbeys | III to II | cut | "lets cut this, i'm realizing the ability to purchase prophets with faith already give the deck reliable great works." | Cut by you. The Abbeys is retired, and it does not move to Tier II. |
| 19 | The Lay Brothers | II | cut | "great" | Cut. The Lay Brothers is retired. |
| 20 | Mission Houses | II | your text | "i think the deck needs modifiers for spreading religion. how about your proclomations reach 50% farther and are 50% more effective in foreign cities." | Kept, with your line: Your proclamations reach 50% farther and are 50% more effective in foreign cities. Changes 64 to 66 add three cards for the spread, and change 80 makes this one a common. |
| 21 | The Confessors | II | cut | "sure" | Cut. The Confessors is retired. |
| 22 | The Fetials | II | approved | "sure" | Tier II, uncommon, Military: Military units you gain in a town keeping a rite start as Veterans. |
| 23 | Commission: The State Church | II | approved | "sure" | Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns. |
| 24 | The Settled Faith | II | approved | "sure" | The Settled Faith becomes an uncommon, with the same text. |
| 25 | Tier II rarities | II | approved | "sure" | The Deaconries, The Parishes and The Spiritual Host become commons. |
| 26 | The Cliff Monasteries | II | approved | "great" | Tier II, uncommon, Charter, as proposed. |
| 27 | The Saturnalia | II | cut | "Hmm, the drawback is too high for this, and it doesn't fit the play patterns i like. lets cut. I like the idea of additional rites though." | Cut by you. The Saturnalia is not built. Changes 64, 67 and 68 are three new rites. |
| 28 | The Temple Herds | II | approved | "great" | Tier II, common, Economic, as proposed. |
| 29 | Pentecost | III to II | approved | "great" | Pentecost moves to Tier II. |
| 30 | The Double Feast | IV to II | approved | "great" | The Double Feast moves to Tier II. |
| 31 | The Pilgrim Towns | III | approved | "wow thats strong, great" | Holy sites gain +1 production and +1 culture for each town that follows your religion. |
| 32 | The Psalter | III | approved | "great" | Each rite a town starts grants science and culture equal to five times the town's population. |
| 33 | The Consecration Feast | III | your text | "Production feels too strong, lets have it give food and culture?" | Finishing a faith building grants its town food and culture. The figures are change 69: ten times its population, of each. |
| 34 | The Offered Stones | III | sent back | "this needs to be stronger probably, there's not too many ways to buy buildings iwth faith currently." | Stronger in change 70: +4 culture for each building you have bought with faith. |
| 35 | The Holy Inquisition | III | your text | "lets rework: +1 authority in devout towns. -80% to foreign religion's pressure on your cities (this includes proclamations)." | Tier III, uncommon, Civic: Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included. The move to common is withdrawn (change 80). |
| 36 | The Sacred Bequests | III | approved | "sure" | Tier III, common, Civic: Spending faith grants science equal to a fourth of it. |
| 37 | The Fabric Fund | III | approved | "Sure" | Tier III, common, Economic, as proposed. |
| 38 | The Prince-Bishops | III | approved | "great" | Tier III, uncommon, Civic: Your faith buildings yield twice as much. |
| 39 | The Defenders of the Faith | III | your text | "how about +1 strength for every 3 towns, no cap." | Tier III, common, Military: Your units gain +1 strength for every three towns that follow your religion. No cap. |
| 40 | The Naming Feasts | III | your text | "let's buff this to two citizens." | Tier III, uncommon, Charter: Unlocks the Rite of Naming: the town gains two citizens at once, and may start no other rite for ten turns. |
| 41 | The Conversion of Kings | III | approved | "great" | Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture. |
| 42 | The Seven Pilgrimages | IV | cut | "sure" | Cut. The Seven Pilgrimages is retired. |
| 43 | The Apostolic Succession | IV | cut | "sure" | Cut. The Apostolic Succession is retired. |
| 44 | The Treasury of Merit | IV | cut | "sure" | Cut. The Treasury of Merit is retired. |
| 45 | Tier IV rarities | IV | approved | "sure" | The Chapter Houses becomes a common. The Tithe of Nations, The Host Restored and The Last Offering become uncommons. |
| 46 | The Great Commission | IV | approved | "sure" | Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture. |
| 47 | The Year of Release | IV | approved | "sure" | Tier IV, uncommon, Boon: On draft: gain faith equal to ten turns of your faith. |
| 48 | The Poor Tables | IV | sent back | "probably don't need food this late in the game, let's modify" | Reworked in change 71: +1 happiness for every 20 faith you make each turn, at most +20. |
| 49 | The Soldiers of God | IV | approved | "great" | Tier IV, common, Military: Military units you buy with faith gain +6 strength. |
| 50 | The City of God | IV | cut | "this feels not very impactful, you tend to build cities around your holy city. cut" | Cut by you. The City of God is not built. |
| 51 | The Sacred Host (shared with Dominion) | I | approved | "great" | Uncommon: Kills grant faith equal to the strength of the unit you killed. |
| 52 | The Oriflamme (shared with Dominion) | I | not adopted | "lets keep this, i like the idea of a player marching apostles with their army, and i think +4 is significant." | Not cut. The Oriflamme stays as it is today. |
| 53 | The Garrison Chapels (shared with Dominion) | III | cut | "Not very strong, lets cut. Lets add a card in it's place: proclamations heal all units within 3 hexes, 25 health." | Cut by you. The Garrison Chapels is not built. Your card in its place is change 72, The Field Mass. |
| 54 | The Hearth Fire (shared with Expansionist) | I | approved | "sure" | Tier I, uncommon, Economic, shared with Expansionist: Towns you found start with a Shrine. |
| 55 | The Temple Baths (shared with Expansionist) | II | approved | "sure" | Tier II, common, Civic, shared with Expansionist: Each public work gives its town +2 faith and +1 happiness. |
| 56 | Sacred Commissions (shared with Magisterial) | II | not adopted | "i think as it was is better. holy sites are easily purchaseable with faith" | Not built. Sacred Commissions stays as it is today: Towns with a Holy Site build wonders 30% faster. |
| 57 | Sacred Patronage (shared with Magisterial) | III | approved | "Yeah lets do it" | A great-person draft costs 5 faith for each point of renown the next great person costs. |
| 58 | The Blessed Forges (shared with Scientific) | II | open | "great" | Open. You wrote "let's move this to tier 1" on the same card in the Scientific pass the day before. Change 73 writes both outcomes for you to choose. |
| 59 | The Temenos (Doctrine) | I | approved | "great" | Tier I Doctrine: The hexes beside your towns with a Shrine gain +1 food and +1 faith. |
| 60 | The House of Worship (Doctrine) | IV to III | answered | "does this unlock these buildings or just allow you to buy them with gold. If the latter, this is too weak." | It unlocks them. Change 74 has the answer from the data and a clearer text. The move to Tier III stands. |
| 61 | A seat with no religion of its own (rule) | all | approved | "yeah sounds good, great change." | If you have founded no religion, the religion your capital follows is yours for the word "devout". |
| 62 | The Megaliths stays in this deck | 0 and I | approved | "y" | The Megaliths stays this deck's own card. It is dealt in Tier 0 and in Tier I (`lastBand: 1`). |
| 63 | Rite lengths add up | all | approved | "y" | Rite lengths add into one sum: The Octave +100%, the Chapel +50% in its city, Chichen Itza +50%. The realm's rite has the capital's length. |
| 64 | The Processions | II | cut | "cut" | Cut by you. The Processions is not built. |
| 65 | The Bell Towers | II | your text | "make this a charter" | Tier II, common, a charter. It opens the Bell Tower, a faith building (change 86). |
| 66 | The Call to Prayer | III | your text | "great, make this a charter, because its hard to slot" | Tier III, uncommon, a charter. It opens the technology Liturgy, which carries the rule (change 87). |
| 67 | The Hallowed Ground | I | your text | "maybe rework: improved tiles gain +1 faith." | Tier I, uncommon, Civic, a charter: Unlocks the Rite of Hallowing: for ten turns the town's improved hexes gain +1 faith. |
| 68 | The Vigil of Arms | II | your text | "Rework: All units within three hexes of this town gain +4 strength. They keep this bonus while the rite is active." | Tier II, uncommon, Military, a charter: Unlocks the Vigil of Arms, a rite: all your units within three hexes of the town gain +4 strength, and keep it while the rite lasts. |
| 69 | The Consecration Feast: the figures | III | your text | "Sure. should apply to purchased buildings too." | Finishing or buying a faith building grants its town food and culture equal to ten times its population. |
| 70 | The Offered Stones: stronger | III | approved | "Ok sure, this will be first on my list of cards to cut after playtesting though if we need to cut cards" | +4 culture for each building you have bought with faith. First to cut after the playtest. |
| 71 | The Poor Tables: happiness | IV | your text | "no cap." | Tier IV, common, Civic: +1 happiness for every 20 faith you make each turn. |
| 72 | The Field Mass (shared with Dominion) | III | approved | "great" | Tier III, uncommon, Military, shared with Dominion: Your proclamations heal your units within three hexes by 25 health. |
| 73 | The Blessed Forges: two outcomes | I or cut | your text | "tier 1 is fine" | The Blessed Forges moves to Tier I and is kept, on both sheets. |
| 74 | The House of Worship: the answer, and a clearer text (Doctrine) | III | approved | "what does the 'whatever beliefs your religion holds' line mean? I like this doctrine, great card for faith building builds." | Approved at Tier III. The answer and the text without that phrase are change 88. |
| 75 | The Two Swords | III | your text | "sure. no cap" | Tier III, common, Civic: +1 happiness for every two points of spare authority. |
| 76 | The Commander of the Faithful | IV | your text | "no cap" | Tier IV, uncommon, Civic: +3 faith and +3 culture for each point of spare authority. |
| 77 | Commission: The Anointing | III | approved | "Sure" | Tier III, uncommon, Wildcard: Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture. |
| 78 | The Caliphate: one authority, not none | III | approved | "ok i like this change" | Devout towns cost 1 authority. |
| 79 | Faith discounts take the "buys more" form | all | approved | "great" | The Offering Chests: Your faith buys 25% more. The Canons of the Holy Sepulchre and the belief Apostles: 40% more. The belief The Alms Box: 25% more. |
| 80 | Rarities after your rulings | II and III | approved | "great" | Mission Houses is a common. The Holy Inquisition stays an uncommon. |
| 81 | The three rite rules | all | approved |  | (1) A town that keeps a rite cannot start another until it ends. (2) Every rite pays through its whole length, and no rite acts at once. (3) A rite counts as started on the turn it starts, and again for each ten turns that the town keeps it. |
| 82 | The Naming Feasts: a rite that lasts | III | approved |  | Unlocks the Rite of Naming: for ten turns the town gains +2 food for each citizen. |
| 83 | The Votive Gifts: the Votive Offering lasts | I | approved |  | Towns may keep the Votive Offering, a rite: for ten turns the town gains production equal to its faith. |
| 84 | The Host Restored: the rite lasts | IV | approved |  | Towns may keep the Restoring of the Host, a rite: for ten turns your units in land that follows your religion heal 25 health each turn. |
| 85 | The cards that read a rite started: one form | I and III | approved |  | The Rogations: Gains +1 faith and +1 culture each time a town starts a rite, and again for each ten turns it keeps one. The Psalter: Each rite a town starts grants science and culture equal to five times the town's population, and again for each ten turns it keeps the rite. |
| 86 | The Bell Towers: what the charter opens | II | approved |  | Unlocks the Bell Tower, a faith building: +1 faith, and its town presses your religion +1 harder for each faith building it holds. |
| 87 | The Call to Prayer: what the charter opens | III | approved |  | Opens Liturgy: your holy sites press your religion twice as far. |
| 88 | The House of Worship: the text (Doctrine) | III | approved |  | Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith. |
| 89 | Eight cards move from the Civic chair to the Economic chair | 0 to III | your text | "could we move a few civics to economic" | Lay Offerings, The Megaliths, The Hallowed Ground, The Cliff Monasteries, The Old Holy Places, The Pilgrim Towns, The Consecration Feast and The Prince-Bishops are Economic. The deck has 41 Civic cards and 22 Economic cards. |
| 90 | Consecration of the Bounds: your line | a rite | your text | "modify: resource hexes gain +1 culture" | Resource hexes gain +1 culture, and this town's borders grow 30% faster. |
| 91 | Rite of Plenty: your line | a rite | your text | "gains +1 gold for every population in the city." | This town gains +1 gold for each citizen. |
| 92 | The Restoring of the Host: a town's own ground | IV | your text | "this needs to be a city-wide bonus, not an empire wide bonus" | Towns may keep the Restoring of the Host, a rite: for ten turns your units within three hexes of the town heal 25 health each turn. |
| 93 | The House of Worship: one more bonus (Doctrine) | III | your text | "let's add an addtional bonus: buildings that supply faith give +1 science and +1 culture." | Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith. Buildings that supply faith give +1 science and +1 culture. |

### Your comments on the closing round (89 to 93)

#### 89. Eight cards move from the Civic chair to the Economic chair (move)

- **Ruling:** your text. Your words: *"could we move a few civics to economic"*
- **Answers:** your comment on the Civic count of 49
- **Tier, rarity, type:** Eight cards
- **Now:** The deck has 49 Civic cards and 14 Economic cards.
- **Proposed:** Lay Offerings, The Megaliths, The Hallowed Ground, The Cliff Monasteries, The Old Holy Places, The Pilgrim Towns, The Consecration Feast and The Prince-Bishops are Economic. The deck has 41 Civic cards and 22 Economic cards.
- **Why:** I followed the split of the two decks that are built. In Expansionist a card that works the land is Economic whatever it pays: The Totem Poles pays culture, and The Desert and the Snow pays faith and culture. A card that changes what buildings yield is Economic too: The Water Boards. Each move, with its reason: **Lay Offerings** pays on pastures, camps and plantations. **The Megaliths** and **The Cliff Monasteries** open a work that workers build. **The Hallowed Ground**'s rite pays the town's improved hexes. **The Old Holy Places** and **The Pilgrim Towns** pay on the holy site's hex. **The Consecration Feast** pays food, and it pays for a building bought. **The Prince-Bishops** doubles what buildings yield.
- **Arithmetic:** By tier, Economic and Civic: Tier 0, 3 and 4; Tier I, 6 and 9; Tier II, 5 and 12; Tier III, 7 and 10; Tier IV, 1 and 6. Cards that take a chair, Economic and Civic: 2 and 3; 5 and 7; 4 and 10; 6 and 9; 1 and 5. So every tier has a card for each of the two chairs.
- **Synergy:** No card changes what it does.
- **Shape:** Data only: the `type` of eight rows.
- **Confidence:** good
- **Depends, joins and notes:** Tier IV has one Economic card that takes a chair, The Last Offering, as it has today. The purse cards that pay culture or science for faith spent stay Civic, as Commerce's Civic Receipts is.

#### 90. Consecration of the Bounds: your line (rework)

- **Ruling:** your text. Your words: *"modify: resource hexes gain +1 culture"*
- **Answers:** your comment on the rites table
- **Tier, rarity, type:** A rite of the technology tree (Stonecraft)
- **Now:** Luxury hexes gain +1 culture, and this town's borders grow 30% faster.
- **Proposed:** Resource hexes gain +1 culture, and this town's borders grow 30% faster.
- **Why:** Your line. It reaches every resource, not only a luxury.
- **Arithmetic:** A town works three or four resource hexes: +3 or +4 culture for ten turns, where it had +1 or +2.
- **Synergy:** It is a rite of every seat, not only of this deck.
- **Shape:** Data only: the hex test of the rite's `pays` line. The border line goes from the row.
- **Confidence:** good
- **Depends, joins and notes:** The user confirmed on 2026-11-21: "nope, keep the faster borders". Only the first half changed: luxury hexes became resource hexes.

#### 91. Rite of Plenty: your line (rework)

- **Ruling:** your text. Your words: *"gains +1 gold for every population in the city."*
- **Answers:** your comment on the rites table
- **Tier, rarity, type:** A rite of the technology tree (Currency)
- **Now:** Hexes with a resource give +1 gold.
- **Proposed:** This town gains +1 gold for each citizen.
- **Why:** Your line. It joins the rites that pay for each citizen: Fasting, Naming and the Night Watch.
- **Arithmetic:** A town of 12: +12 gold a turn, where it had about +3. Under The Rites Commonwealth, eight towns of 12: +96 gold a turn.
- **Synergy:** It is a rite of every seat.
- **Shape:** Data only: a `pays` line by the town's population.
- **Confidence:** good

#### 92. The Restoring of the Host: a town's own ground (rework)

- **Ruling:** your text. Your words: *"this needs to be a city-wide bonus, not an empire wide bonus"*
- **Answers:** your comment on the rites table
- **Tier, rarity, type:** IV, uncommon, Military
- **Now:** Round three: for ten turns your units in land that follows your religion heal 25 health each turn.
- **Proposed:** Towns may keep the Restoring of the Host, a rite: for ten turns your units within three hexes of the town heal 25 health each turn.
- **Why:** Your comment: the rite is for one city, not for the empire. I use the same reach as the Vigil of Arms: three hexes from the town, which is also as far as a town works.
- **Arithmetic:** A unit that stands within three hexes of the town heals 25 a turn, and it may fight. A unit that leaves the ground stops healing. The card no longer needs a religion.
- **Synergy:** With the Vigil of Arms, a town on the border is a place to gather and to heal: both rites reach three hexes. A town keeps one of them at a time, or both with The Double Feast.
- **Shape:** A rite row with a heal each turn for your units within three hexes of the town, read in `healUnits`.
- **Confidence:** good
- **Depends, joins and notes:** The Vigil of Arms keeps its default: your units that stand within three hexes when the rite starts gain +4 and keep it until the rite ends.

#### 93. The House of Worship: one more bonus (Doctrine) (doctrine)

- **Ruling:** your text. Your words: *"let's add an addtional bonus: buildings that supply faith give +1 science and +1 culture."*
- **Answers:** your comment on change 88
- **Tier, rarity, type:** Doctrine, Tier III
- **Now:** Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith.
- **Proposed:** Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith. Buildings that supply faith give +1 science and +1 culture.
- **Why:** Your line. It pays every building that supplies faith, in any town, on the building's own line.
- **Arithmetic:** A town with a Shrine, a Temple and a Cathedral: +3 science and +3 culture. With a Chapel, a Bell Tower and the four houses: nine buildings, +9 and +9. Twelve such towns: +108 science and +108 culture. The Prince-Bishops doubles it, because the line is on the building: +216 and +216. A median seat makes about 480 science at turn 150.
- **Synergy:** It adds to The Cathedral Works (+8 science), the Cathedral School (+2 science for each building that supplies faith) and the shared The Painted Chapels (+3 culture each). With the shared The Monastery Libraries a Library supplies faith, so it counts too.
- **Shape:** A `pays` line on each building that supplies faith (`buildingSupplies` is the one reading of "supplies"). Small extension if no row pays a building by that test today.
- **Confidence:** good
- **Depends, joins and notes:** No cap, as you asked. It is in the list of strong combinations.

### The changes of round three (81 to 88)

#### 81. The three rite rules (rule)

- **Ruling:** approved.
- **Answers:** your comment on change 67
- **Tier, rarity, type:** A rule for every rite
- **Now:** Rule 1 is in the game: a town with no free rite place cannot start a rite (`riteClausesBeforeTheBank` in `src/sim/religion.ts`). A town has one place, or two with The Double Feast. Rule 2 is not: two live rites act at once. Rule 3 is not: a rite counts as started once, on the turn it starts.
- **Proposed:** (1) A town that keeps a rite cannot start another until it ends. (2) Every rite pays through its whole length, and no rite acts at once. (3) A rite counts as started on the turn it starts, and again for each ten turns that the town keeps it.
- **Why:** Your three rules. Together they make a longer rite better in every case: it pays for more turns, it costs one price, and the cards that count a rite started count it once for each ten turns.
- **Arithmetic:** The Rogations with eight towns. Ten-turn rites: +8 for each ten turns, and a price each time. Thirty-turn rites: +8 at the start, +8 at turn 10 and +8 at turn 20, for one price. The Psalter in a town of 10: 50 science and 50 culture for each ten turns in both cases. A Chapel town's rite of 15 turns counts at the start and at turn 10.
- **Synergy:** **Reads:** every rite. Rule 3 feeds The Rogations, The Psalter, The Founding Vows and the shared The Votive Accounts. The price of a rite rises only when a rite really starts, so a long rite stays the cheap one.
- **Shape:** One new seam: the tally `riteStarted` and the moment `rite` fire again on each tenth turn of a live rite. It is a comparison of turn numbers against the rite's start, so nothing counts down. The price ladder (`Player.ritesStarted`) is not raised there.
- **Confidence:** good
- **Depends, joins and notes:** With rule 1 a rite cannot be ended early. Only the realm's rite takes the place of a rite that a town keeps, as the code has it today for a prophet's rite.

#### 82. The Naming Feasts: a rite that lasts (rework)

- **Ruling:** approved.
- **Answers:** rule 2, and your ruling on change 40 ("let's buff this to two citizens")
- **Tier, rarity, type:** III, uncommon, Economic (Charter)
- **Now:** Unlocks the Rite of Naming: the town gains two citizens at once, and may start no other rite for ten turns.
- **Proposed:** Unlocks the Rite of Naming: for ten turns the town gains +2 food for each citizen.
- **Why:** Under rule 2 the rite cannot act at once. This form gives about two citizens over ten turns in a town of any size, and more over a longer rite.
- **Arithmetic:** A town of 6 gains 12 food a turn: 120 in ten turns, and its next citizens cost 65 and 77. A town of 12 gains 240, and its next citizens cost 142 and 158. A town of 20 gains 400, and its next citizen costs 270. So ten turns give about 1.5 to 1.8 citizens, and twenty turns give 3 or more.
- **Synergy:** **Raises:** food and citizens. **Reads:** citizens. With Expansionist's levies, The Royal Cult, The Deaconries and Jayavarman VII's The Great City.
- **Shape:** A rite row with a `pays` line by the town's population (the Rite of Fasting has the same line for science). Data only.
- **Confidence:** good
- **Depends, joins and notes:** The other form I tested was "the town grows twice as fast". It gives nothing to a town with no food surplus, so I chose food for each citizen.

#### 83. The Votive Gifts: the Votive Offering lasts (rework)

- **Ruling:** approved.
- **Answers:** rule 2 ("an offering")
- **Tier, rarity, type:** I, common, Economic
- **Now:** Towns may spend faith to add production to what they are building. Not wonders. The offering acts at once and holds the town's rite place for one turn. A town that keeps a rite cannot offer.
- **Proposed:** Towns may keep the Votive Offering, a rite: for ten turns the town gains production equal to its faith.
- **Why:** Under rule 1 a town that keeps a rite can never make the offering, so with long rites the card is dead. As a rite that lasts, it is one of the town's choices, and it needs no amount to type.
- **Arithmetic:** A town makes 5 to 8 faith in age 2, when it makes about 10 production: +5 to +8. In age 4 it makes about 25 faith and 35 production: +25. The town keeps its faith. The price is the price of any rite.
- **Synergy:** **Raises:** production. **Reads:** a town's faith. Fed by every faith building and by The Prince-Bishops.
- **Shape:** A rite row with a `pays` line as a share of the town's faith (the shared The Tithe has the shape). `atOnce` goes from the row.
- **Confidence:** fair
- **Depends, joins and notes:** The other choice keeps the offering as an act: it takes no rite place, so rule 1 does not block it, and nothing else changes. Open point r3-10.

#### 84. The Host Restored: the rite lasts (rework)

- **Ruling:** approved.
- **Answers:** rule 2
- **Tier, rarity, type:** IV, uncommon, Military
- **Now:** Towns may spend faith to heal every unit of yours in land that follows your religion. The rite acts at once, and the town waits five turns.
- **Proposed:** Towns may keep the Restoring of the Host, a rite: for ten turns your units in land that follows your religion heal 25 health each turn.
- **Why:** Under rule 2 the rite pays through its length. An army that fights on the faith's ground is healed each turn while the rite lasts, and a longer rite heals for longer.
- **Arithmetic:** A unit heals 10 a turn, and only when it rests. With the rite it heals 25 a turn while it fights: a unit at 30 health is whole in three turns. Over ten turns that is up to 250 health for each unit, where the rite gives at most 100 once today.
- **Synergy:** **Raises:** units kept alive. **Reads:** land that follows your religion. It works with The Spiritual Host, The Turning of Swords and The Field Mass.
- **Shape:** A rite row with a heal each turn for units on following land, read in `healUnits`. `atOnce` goes from the row.
- **Confidence:** fair
- **Depends, joins and notes:** Open point r3-10, with change 83.

#### 85. The cards that read a rite started: one form (rework)

- **Ruling:** approved.
- **Answers:** rule 3
- **Tier, rarity, type:** The Rogations, The Psalter, The Founding Vows, and the shared The Votive Accounts
- **Now:** The Rogations: Gains +1 faith and +1 culture each time a town starts a rite. The Psalter: Each rite a town starts grants science and culture equal to five times the town's population.
- **Proposed:** The Rogations: Gains +1 faith and +1 culture each time a town starts a rite, and again for each ten turns it keeps one. The Psalter: Each rite a town starts grants science and culture equal to five times the town's population, and again for each ten turns it keeps the rite.
- **Why:** One form for every such card: the card pays at the start, and again for each ten turns the rite is kept. I chose it over "a tenth each turn" because a scaler and a commission count whole steps.
- **Arithmetic:** See change 81. A rite of ten turns pays once. A rite of thirty turns pays three times, at turns 0, 10 and 20.
- **Synergy:** The Founding Vows (start three rites) and the shared The Votive Accounts keep their text. They read the same count, so one rite kept for twenty turns meets two thirds of the vow.
- **Shape:** No shape beyond change 81.
- **Confidence:** good

#### 86. The Bell Towers: what the charter opens (rework)

- **Ruling:** approved.
- **Answers:** your ruling on change 65: "make this a charter"
- **Tier, rarity, type:** II, common, Civic (Charter)
- **Now:** A seated card: A town that follows your religion presses it +1 harder for each faith building it holds.
- **Proposed:** Unlocks the Bell Tower, a faith building: +1 faith, and its town presses your religion +1 harder for each faith building it holds.
- **Why:** A charter in this game opens a thing: a rite, an improvement, a building, a unit or a technology. A bell tower is a building, so the charter opens one. It is also one more faith building in each town, which the temple economy pays.
- **Arithmetic:** The Bell Tower is a small building of the second age: about 67 hammers, or 134 faith. A town with a Shrine, a Temple and a Bell Tower presses 5, where it presses 2 today. The tower counts itself.
- **Synergy:** **Raises:** pressure, and faith buildings. It feeds The Temple Workshops, The Temple Herds, The Prince-Bishops and the shared The Painted Chapels. The Gifts of the Faithful buys it with faith.
- **Shape:** `charter.unlocks.building` exists (the generic Cistern Works). A new building row `bellTower` with a `pressure` line that counts the faith buildings of its town, and an icon.
- **Confidence:** good
- **Depends, joins and notes:** One difference from the line you approved: the rule now works in a town that holds a Bell Tower, so a foreign town that follows does not press harder. If you want the exact rule with nothing to build, the charter opens a technology in its place (Bell-Founding, age II, 100 science). Open point r3-10.

#### 87. The Call to Prayer: what the charter opens (rework)

- **Ruling:** approved.
- **Answers:** your ruling on change 66: "make this a charter, because its hard to slot"
- **Tier, rarity, type:** III, uncommon, Civic (Charter)
- **Now:** A seated card: Your holy sites press your religion twice as far.
- **Proposed:** Opens Liturgy: your holy sites press your religion twice as far.
- **Why:** The card is a rule with no thing to build. This game lets a charter carry a rule through a charter technology: the technology holds the rule, and the seat has it from the turn it knows the technology. The Closed Book in Scientific works this way (its technology Ciphers), and so do Mechanics and Casting.
- **Arithmetic:** Liturgy is a technology of the third age: 360 science, beside Scholasticism and Medicine under The High Temple. That is three or four turns of a mean seat's science at turn 110.
- **Synergy:** **Raises:** towns that follow your religion. **Reads:** holy sites.
- **Shape:** A charter technology row `liturgy` that carries a `pressureRule` with a new key `siteRange`. `charter.unlocks.tech` exists.
- **Confidence:** good

#### 88. The House of Worship: the text (Doctrine) (doctrine)

- **Ruling:** approved.
- **Answers:** your question on change 74
- **Tier, rarity, type:** Doctrine, Tier III
- **Now:** Unlocks the Mosque, the Wat, the Gurdwara and the Dar-e Mehr in your devout towns, whatever beliefs your religion holds. Each is bought with faith.
- **Proposed:** Your devout towns may hold all four faith houses: the Mosque, the Wat, the Gurdwara and the Dar-e Mehr. Each is bought with faith.
- **Why:** **What the phrase meant.** Each faith house is opened by one follower belief: Minarets opens the Mosque, Temple Spires the Wat, The Open Kitchen the Gurdwara and The Eternal Flame the Dar-e Mehr. A religion holds three follower beliefs, so it has the house of each such belief it chose, and often it has none. The Doctrine gives all four, and it does not ask which beliefs the religion chose. The new text says that with "all four".
- **Arithmetic:** As change 74: four houses in a devout town of 12 give about 15 faith, 4 science, 3 food, 2 production, 3 happiness and 1 authority, for about 944 faith.
- **Synergy:** It feeds the temple economy and the authority theme.
- **Shape:** A text change only.
- **Confidence:** good

## Record: round two, as first written

- Round two proposed 19 changes (62 to 80). Its points r2-1 to r2-13 and its five questions follow as first written. Your rulings on them are in the table of section 4 and at the foot.

### r2-1. Your rulings are folded in

- Of the 61 changes: 35 are approved as proposed, 9 carry your text, 10 are cut, 3 are not adopted (01, 52 and 56), 2 are sent back for more (34 and 48), 1 is a question that I answer (60), and 1 is open (58).
- **Your lines:** 06 The Gifts of the Faithful, 07 The Offering Chests, 09 the Chapel, 16 The Old Holy Places, 20 Mission Houses, 33 The Consecration Feast, 35 The Holy Inquisition, 39 The Defenders of the Faith and 40 the Rite of Naming.
- **Cut as I proposed:** The Saints' Fields, The Lay Brothers, The Confessors, The Seven Pilgrimages, The Apostolic Succession and The Treasury of Merit. **Cut by you:** The Abbeys (18), The Saturnalia (27), The City of God (50) and The Garrison Chapels (53).
- **Not adopted:** The Calling stays as it is today. The Oriflamme stays. Sacred Commissions stays.
- **Your answers:** Q1 yes (change 61). Q2 keep The Caliphate, and make authority a theme (section r2-10). Q3 yes, the deck may open unique improvements. Q4 change 05 is approved and 06 is narrowed. Q5 yes, the pass may change shared cards.
- **Round two:** 19 changes. 9 are new cards: three for the spread, three rites (one of them is also a spread card), three for authority, and your card for Dominion.
- **The deck:** 79 cards if you approve round two, from 63 today. 7 of today's cards are retired, 15 new cards of round one are approved, and round two proposes 8 more. 26 shared cards and 17 Doctrines.

- **To rule:** Nothing to rule.

### r2-2. 03: should The Megaliths be shared with Expansionist?

- **Recommended: no** (change 62). A shared card is dealt in one hand of four. Shared, a Devotion seat would be offered the stone circle in about 1 game of 6. As the deck's own uncommon it is offered in about 5 games of 10.
- The Expansionist seat gains the stone circle's benefits only when it is paired with this deck. Then the keyword does the work: the stone circle and the cliff monastery are unique improvements, so Commission: The Reclaimed Lands and The Cadastre read them.
- I propose one thing more: deal the card in Tier 0 and in Tier I, as Expansionist's The Gathering Grounds is. A seat is then offered it in about 6 games of 10.
- What changes on each sheet, for both answers, is in the notes of change 62.

- **To rule:** Rule on change 62. Question r2-q3.

### r2-3. 09 and 10: how rite lengths stack

- **The rule (change 63): the modifiers add into one sum.** Each is a percentage of the rite's own length. The Octave is +100%, the Chapel is +50% in its town, and the wonder Chichen Itza is +50%. Twice as long and 50% longer is two and a half times, never three times.
- This is the rule that the code has today for The Octave and Chichen Itza, and it is the rule you chose for purchase bonuses. The one new thing is a modifier that belongs to one town.

| What the seat holds | Sum | A rite of ten turns lasts |
|---|---|---|
| Nothing | 0% | 10 |
| The Chapel, in that town | +50% | 15 |
| Chichen Itza | +50% | 15 |
| The Octave | +100% | 20 |
| The Chapel and Chichen Itza | +100% | 20 |
| The Octave and the Chapel | +150% | 25 |
| The Octave and Chichen Itza | +150% | 25 |
| All three | +200% | 30 |

- **With The Rites Commonwealth, the realm's rite has one clock.** It lasts in every town as long as it lasts in the capital. So a Chapel in the capital lengthens the realm's rite, and a Chapel in another town lengthens only the rites that the town starts itself. The other choice is a length for each town, and then the towns fall out of step.
- **The strongest case:** The Octave, Chichen Itza, a Chapel in the capital, The Rites Commonwealth and The Double Feast. Every town keeps two rites for 30 turns. Eight towns over 150 turns cost about 2,000 faith, which is 13 a turn. With no modifier the same cover costs about 18,000. Long rites are cheap rites, because fewer casts climb fewer steps of the price. The effect of the rites does not grow, and the cards that pay for a rite started pay a third as often. I call it strong and not broken.
- **No belief and no Doctrine changes a rite's length.** The Capitulary of Herstal halves the price.
- **A rite that acts at once has a wait, not a length.** The modifiers do not lengthen the wait.
- **A correction to round one.** I wrote that the game has no renewal for a rite. It has one: End Turn offers "Renew rites" when a rite ends. The click is still one a town, so the diagnosis stands.

- **To rule:** Rule on change 63.

### r2-4. 20: the spreading faith

- Mission Houses takes your line. Before the rulings, four cards helped a religion spread: Mission Houses (+18 on a proclamation), The Second Prophet, Pentecost and The Parishes. The Abbeys is cut.
- Round two adds three: **The Processions** (64), a rite by which a town proclaims; **The Bell Towers** (65), which makes a town press harder for each faith building; and **The Call to Prayer** (66), which doubles the reach of a holy site. None of them moves a unit.

| How the religion spreads | Cards of the deck | Outside the deck |
|---|---|---|
| The tide: pressure each turn | The Bell Towers (65), The Call to Prayer (66), The Parishes | Temples, the High Temple, the beliefs Itinerant Preachers and The Long Road; the Doctrines The Martyr's Crown and The Ribats |
| A proclamation | Mission Houses (20), The Processions (64), The Second Prophet | the shared The Field Mass (72); the belief The Pulse of Bells |
| A conversion as a moment | Pentecost, The Mass Baptisms, The Mission, The Conversion of Kings |  |
| The towns that follow, counted | The Living Hymnal, The Pilgrim Towns, The Defenders of the Faith, The Tithe of Nations, The Great Commission, The Interdict | the Doctrines Canossa and The Apostolic Camera |
| Defence against a rival's religion | The Holy Inquisition (35) | the belief Inquisition, the inquisitor |

- **The spread is now a note a seat can lean into:** 14 cards, 7 that make the religion spread and 7 that pay for it. Section r2-12 has the count by tier.
- **The floor for a small religion.** The Bell Towers pays from the seat's own Shrines and Temples. The Call to Prayer pays from the one holy site of the founding. The Processions needs only faith and a border town.
- **No chore.** A Procession is a rite, in the menu the towns have. The other two ask for nothing after the card is seated.

- **To rule:** Rule on changes 64, 65 and 66.

### r2-5. 27: three new rites

- The Saturnalia is cut. You wrote: "the drawback is too high for this, and it doesn't fit the play patterns i like." So each new rite does one clear thing on the turn it is said, and it has no drawback. Its only cost is its price and the town's rite place for ten turns.
- **Each is opened by a card, as a charter.** A charter takes no chair. A rite that every Devotion seat has would need a new kind of thing, a rite that a deck holds, so I did not use that.

| Rite | Card | Tier | What it does at once | Needs a religion |
|---|---|---|---|---|
| Rite of Hallowing | The Hallowed Ground (67) | I | The town claims three unowned hexes beside its borders. | no |
| Rite of Procession | The Processions (64) | II | The town proclaims your religion, as an apostle does. | yes |
| Vigil of Arms | The Vigil of Arms (68) | II | Your units within three hexes of the town gain +5 strength for five turns. | no |
| Rite of Naming | The Naming Feasts (40, approved) | III | The town gains two citizens. | no |

- With these the deck opens six rites by charter: Fasting, the Sabbath, Hallowing, the Procession, the Vigil and Naming. Two more come with a seated card (the Votive Offering and the Restoring of the Host). The Scientific pass proposes a seventh on its side, the Night Watch (its change 81).
- **The price.** A rite costs 20 faith, and 5 more for each rite the empire has started (`data/religion.json`). Each of the four rites above counts as a rite started. Today the code does not count a rite that acts at once, so this is a small change, and it is what limits them.
- **The Rites Commonwealth does not carry them.** A rite that acts at once is said by one town, and the code refuses to say one over the realm today.
- For ten turns after it, the town counts as keeping a rite, as the code has it for the Restoring of the Host. So The Fetials and the shared The Festival Calendar read that town.

- **To rule:** Rule on changes 64, 67 and 68.

### r2-6. 33, 34 and 48: the figures

| Card | Your words | The line now | What it pays |
|---|---|---|---|
| The Consecration Feast (69) | "lets have it give food and culture?" | Finishing a faith building grants its town food and culture equal to ten times its population. | A town of 10: 100 food and 100 culture. The next citizen costs 115 food. |
| The Offered Stones (70) | "this needs to be stronger probably" | +4 culture for each building you have bought with faith. | 15 bought when Tier III opens: +60 culture. 30 late: +120. |
| The Poor Tables (71) | "probably don't need food this late in the game" | +1 happiness for every 20 faith you make each turn, at most +20. | 300 faith a turn: +15 happiness. |

- **The recount for The Offered Stones.** After your ruling on 06 a seat buys these buildings with faith: culture and faith buildings in a Shrine town, the faith houses, science buildings with one great person, and one wonder with The Pious Masons. A town can hold nine culture and faith buildings by age 3. A seat of eight towns holds about 45 when Tier III opens and has bought about a third of them.
- The card leans on The Gifts of the Faithful. The notes of change 70 give a form that stands alone.

- **To rule:** Rule on changes 69, 70 and 71.

### r2-7. 53: The Field Mass, and the clergy with the army

- Your card is change 72: **The Field Mass**, Tier III, uncommon, Military, shared with Dominion: "Your proclamations heal your units within three hexes by 25 health."
- I read "all units" as all your units. A unit of another empire is not healed.
- With The Oriflamme, which you kept, and The Healer-Priests, the deck has a small theme, and the three are not copies:

| Card | Tier | Where it works | What the player does | What it gives |
|---|---|---|---|---|
| The Healer-Priests (04) | 0 | your own territory | nothing | units heal 20 a turn, not 10 |
| The Oriflamme (52, kept) | I | beside a religious unit | walks an apostle with the army | +4 strength |
| The Field Mass (72) | III | within three hexes of a proclamation | spends a charge, or a town says the Rite of Procession | 25 health, and the proclamation's pressure |
| The Host Restored | IV | all land that follows your religion | a town spends faith | every unit there is healed |

- So an apostle with the army gives +4 while it walks and 25 health when it speaks. A Rite of Procession (64) heals the units round the town that says it.
- The apostle's own heal reaches only the hexes beside it. While The Field Mass is seated, a proclamation is the better act.

- **To rule:** Rule on change 72.

### r2-8. 58: The Blessed Forges

- You wrote "great" on my cut on this page. The day before, in the Scientific pass, you wrote "let's move this to tier 1" on the same card. I do not decide. Change 73 writes both outcomes.
- **A: Tier I, on both sheets.** The Scientific pass has written it so (its change 82), and its rite of research needs the faith. The pair shares six cards.
- **B: cut, on both sheets.** The pair shares five cards.
- **Recommended: A.** At Tier I it is a Scientific seat's first faith, and for a Devotion seat it is small in either tier.

- **To rule:** Choose A or B. Question r2-q2.

### r2-9. 60: The House of Worship

- **It unlocks the buildings.** The Doctrine's row has four `unlocksBuilding` effects, one for each house, in every devout town.
- Without it, a town can hold a faith house only if its religion holds that house's follower belief. A religion holds three follower beliefs of seventeen, so most religions have one house or none.
- The four houses are never built and never bought with gold. Their rows say `purchaseOnly`, in the faith bank. That is why the text said "may buy".
- So the Doctrine gives every devout town four new buildings: about 15 faith, 4 science, 3 food, 2 production, 3 happiness and 1 authority in a town of 12, for about 944 faith. I think that is worth a Doctrine. Change 74 only makes the text say it.

- **To rule:** Rule on change 74.

### r2-10. Authority: the faith and the crown

- Your words: "religious builds can break the authority rules, and maybe there could be some interaction with spare authority?"
- **What authority is.** The palace gives 6 and each age 2. A founded town costs 3 and a captured town 4. Spare authority of 5 gives +10% production and border growth, and 10 gives +20%. Below zero, borders stop.
- **The theme has two halves.** Devout towns give authority. Three cards then read the authority that the seat does not use, and pay in faith, culture and happiness.

| Card | Tier | What it does | State |
|---|---|---|---|
| Commission: The State Church | II | +1 authority and +1 happiness for every two devout towns | approved (23) |
| The Holy Inquisition | III | +1 authority for each devout town | your line (35) |
| The Caliphate | III, rare | devout towns cost no authority; change 78 proposes 1 | kept; question r2-q1 |
| The Mosque | a belief, or the Doctrine The House of Worship | +1 authority in its town | live |
| The Two Swords | III | +1 happiness for every two points of spare authority, at most +8 | new (75) |
| Commission: The Anointing | III | Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture | new (77) |
| The Commander of the Faithful | IV | +3 faith and +3 culture for each point of spare authority, at most +60 of each | new (76) |

**Ten towns, all devout, in age 4.** Nine are founded, so they cost 27, and the palace and the ages give 14.

| What the seat holds | Capacity | Cost | Spare |
|---|---|---|---|
| No card | 14 | 27 | -13 |
| The Holy Inquisition | 24 | 27 | -3 |
| The Holy Inquisition and the commission | 29 | 27 | 2 |
| Those two and a Mosque in each town | 39 | 27 | 12 |
| The Caliphate as it is today, alone | 14 | 0 | 14 |
| The Caliphate at 1 a town (78), alone | 14 | 9 | 5 |
| The Caliphate at 1 a town and The Holy Inquisition | 24 | 9 | 15 |
| The Caliphate today, The Holy Inquisition and the commission | 29 | 0 | 29 |

- **The readers are a choice, and that keeps authority a limit.** Each town the seat founds takes 3 from its spare authority until the town is devout. So a seat with The Two Swords and The Commander of the Faithful chooses each time between one more town and the pay for the spare.
- **How far the theme may go.** Three lines hold it. Only a devout town gives authority or costs less, so a new or captured town costs its full price until the religion turns it. Every card that reads spare authority has a cap. And the theme stays in this deck: no shared card and no generic card gives or reads authority this way.
- **Where it breaks.** A seat that holds The Caliphate as it is today pays nothing for a devout town. With The Parishes, a town is devout when it is founded, so that seat founds towns with no authority cost at all. One rare then removes the limit, and only happiness and land are left.
- **My recommendation is change 78:** The Caliphate reads "Devout towns cost 1 authority." Your line for The Holy Inquisition gives 1 back. So the limit is removed only for a seat that holds both, a rare and an uncommon of Tier III, which open at about turn 133. That is a religious build that breaks the rule, late, with two cards.
- **What I did not do:** a card that turns spare authority into authority for something else, or into towns. Spare authority pays yields and happiness only.

- **To rule:** Rule on changes 75 to 78. Question r2-q1.

### r2-11. What the base rulings change in this deck

| Ruling | What it changes here |
|---|---|
| A settler costs 36 hammers, and 9 more for each one built. A worker costs 14, and 4 more. | Consecrated Labor (05): the first settler costs 72 faith, then 90, 108 and 126. The first worker costs 28. A seat that makes 8 to 10 faith a turn at turn 40 buys its first settler with eight turns of faith. Faith still pays 2 a hammer, which is half the gold price, and I leave it. With The Offering Chests a settler of 72 costs 58. |
| A soldier costs its size plus 80%. | A Legionary is 97 hammers, so 194 faith. A Longswordsman is 408, so 816. The Soldiers of God, the shared The Shrine Guards and The Field Mass are worth more, because each soldier is dearer. |
| Science for each citizen is 0.25. A Library gives +3 and a University +6. The tree is slower on purpose. | Science from a card is worth more. The Cathedral Works (+8 science for each Cathedral) now beats a University. A cliff monastery (+3 science) equals a Library. The Sacred Bequests pays +25 science at 100 faith spent a turn, which is a quarter of a mean seat's science at turn 100. |
| The same ruling, with rites. | The Rite of Fasting pays +1 science for each citizen, four times what a citizen makes. Under The Rites Commonwealth a realm of 50 citizens gains +50 science for a rite, when a mean seat makes about 60 at turn 90. The Psalter pays 400 science for one cast over eight towns of 10. The Cathedral School (the shared charter) pays +2 science for each faith building, and twice that in a town that keeps a rite. These are the cases to watch. |
| A purchase discount is "buys more". | Change 79 converts four rows: The Offering Chests, the Doctrine The Canons of the Holy Sepulchre, and the beliefs The Alms Box and Apostles. |
| No percentage of combat strength. | No card of this deck has one. Every strength line here is flat points. |
| The coastal rule and the lumber mill. | No card of this deck reads a coast or a lumber mill. |
| Expansionist's keyword "unique improvement". | The stone circle and the cliff monastery are unique improvements. Commission: The Reclaimed Lands counts them and gives them +1 food and +1 production, and The Cadastre gives them +3 science. |
| The Scientific pass's rite of research (its change 81). | The Night Watch is a season, so The Rites Commonwealth carries it, and The Rogations and The Psalter count it. A seat of both decks can set the whole realm to research for a rite. That seat is Harun al-Rashid's. |

- The Gurdwara pays +1 science for every three citizens. The ruling on base science asks the build report to list such rows, and this is the deck's one.

- **To rule:** Nothing to rule.

### r2-12. The notes after your rulings

| Note | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The spreading faith: pressure, proclamations, followers abroad | 0 | 0 | 8 | 3 | 3 | 14 |
| The purse of faith: faith spent and what it buys | 1 | 4 | 2 | 4 | 2 | 13 |
| Rites as acts | 0 | 7 | 2 | 2 | 0 | 11 |
| The army of the faith | 1 | 2 | 3 | 2 | 2 | 10 |
| The temple economy: faith buildings | 1 | 3 | 1 | 3 | 1 | 9 |
| Holy ground: holy sites, sacred works, the herds | 2 | 0 | 4 | 1 | 0 | 7 |
| The faith and the crown: authority | 0 | 0 | 1 | 4 | 1 | 6 |
| Faith income (glue) | 3 | 0 | 0 | 1 | 1 | 5 |
| Devout towns and beliefs | 0 | 1 | 2 | 1 | 0 | 4 |
| **All** | 8 | 17 | 23 | 21 | 10 | 79 |

- **The spreading faith: 14 cards.** It was the core, with too little to do. It now has seven cards that spread the religion and seven that pay for the towns that follow.
- **The purse of faith: 13.** You narrowed 06 to culture and faith buildings and moved The Offering Chests to Tier II. The note still has a card in every tier.
- **Rites as acts: 11,** with four of the six charter rites. The Processions is counted with the spread and The Vigil of Arms with the army.
- **The army of the faith: 10,** with a Military card in every tier, and The Oriflamme and The Field Mass among the shared cards.
- **The temple economy: 9.** All approved. The Bell Towers reads faith buildings too, and it is counted with the spread.
- **Holy ground: 7. This note is now thin.** You cut The Abbeys and The City of God, and Tier I and Tier IV have no Order of it. I would leave it so. Your reason for the cut is sound: prophets are bought with faith, so sites are reliable. The Anchorites is a common, the Doctrines The Temenos and The Two Sanctuaries sit in the empty tiers, and The Call to Prayer reads holy sites from the spread.
- **The faith and the crown: 6.** New. It has no card before Tier II, which is right: authority binds from age 2.
- **Devout towns and beliefs: 4,** and **faith income: 5.** These are glue. The Calling stays among them, with no change.
- **Tier 0 has no rare again,** because 01 is not adopted. I propose none: you called the last one too strong, and Expansionist's Tier 0 has one rare.

- **To rule:** Say if you want a card for holy ground. I recommend none now.

### r2-13. The recount

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare | Need a religion |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 1 | 1 | 6 | 0 | 6 | 2 | 0 | 0 |
| I | 17 | 1 | 6 | 9 | 1 | 7 | 9 | 1 | 0 |
| II | 23 | 3 | 3 | 15 | 2 | 8 | 12 | 3 | 15 |
| III | 21 | 2 | 4 | 13 | 2 | 5 | 11 | 5 | 9 |
| IV | 10 | 2 | 1 | 6 | 1 | 3 | 5 | 2 | 5 |
| **All** | **79** | **9** | **15** | **49** | **6** | **29** | **39** | **11** | **29** |

| Tier | Commons / uncommons / rares | Each common | Each uncommon | Each rare | A seat is offered a named rare in |
|---|---|---|---|---|---|
| 0 | 6 / 2 / 0 | 11% | 17% | none | none |
| I | 7 / 9 / 1 | 8.6% | 3.3% | 10% | 50% |
| II | 8 / 12 / 3 | 7.5% | 2.5% | 3.3% | 25% |
| III | 5 / 11 / 5 | 12% | 2.7% | 2.0% | 16% |
| IV | 3 / 5 / 2 | 20% | 6.0% | 5.0% | 23% |

- **79 cards:** 8, 17, 23, 21 and 10 by tier. 9 Military, 15 Economic, 49 Civic and 6 Wildcard.
- **9 charters,** from 2 today: 2 boons, 6 commissions and 2 scalers. 70 cards take a chair.
- **Cards that need a founded religion: 29 of 79 (37%).** Today it is 30 of 63 (48%). In Tiers II to IV it is 29 of 54 (54%), from 30 of 43 (70%). The three new spread cards need a religion, as they must.
- **Cards that pay faith: 18 of 79 (23%).** Cards that pay "science and culture" as a pair: 9, from 12.
- **Rares.** Tier I has one rare, The Rites Commonwealth, which you called "extremely powerful". A seat is offered it in about half its games. Question r2-q5 asks if that is how often you want it.
- **Tier II is the largest tier:** 23 cards and 12 uncommons. Four of the uncommons are charters, and a charter leaves the draw when the seat takes it.
- **Tier IV has one Economic card,** The Last Offering, as it has today.
- **Shared cards: 26.** Dominion 6, Expansionist 5, Commerce 5, Scientific 6 (5 if you cut The Blessed Forges), Magisterial 4.
- **Doctrines: 17** (5, 4, 5 and 3).

- **To rule:** Say if a count looks wrong.

### Questions for you (round two)

Five questions change the build. Each has my recommended answer.

- **r2-q1. The Caliphate: "Devout towns cost 1 authority"?** Recommended: Yes (change 78). Your line for The Holy Inquisition gives +1 authority for each devout town. With today's Caliphate one rare removes the limit, and with The Parishes a new town never costs authority. At a cost of 1 the limit goes only for a seat that holds both cards.
- **r2-q2. The Blessed Forges: Tier I, or cut?** Recommended: Tier I (outcome A of change 73). It is your earlier ruling, the Scientific pass is written on it, and at Tier I the card is a Scientific seat's first faith.
- **r2-q3. The Megaliths: this deck's own card, dealt in Tier 0 and in Tier I?** Recommended: Yes, and not shared (change 62). Shared, a Devotion seat sees its own stone circle in 1 game of 6. The keyword already lets Expansionist's cards read it when the decks are paired.
- **r2-q4. The Offering Chests: is "age 2" Tier II?** Recommended: Yes, Tier II, as a rare. Tier I is dealt from about turn 32, late in the first age. Tier II opens at about turn 72, in the second age. If you meant Tier I, say so, and the card moves back.
- **r2-q5. The Rites Commonwealth is the only rare of Tier I. Is one game in two how often you want it?** Recommended: Yes, for the first builds. It is the card that removes the deck's chore, so I would rather see it tested often. If it is too strong so often, The Double Feast can move from Tier II to Tier I beside it, and each is then offered in about one game in three.

### The entries of round two (62 to 80), as first proposed

#### 62. The Megaliths stays in this deck (keep)

- **Ruling:** approved. Your words: *"y"*
- **Answers:** your question on change 03
- **Tier, rarity, type:** 0 and also I, uncommon, Civic (Charter)
- **Now:** A card of this deck, approved. You asked: "should this be shared with expansionist?"
- **Proposed:** No. It stays this deck's own card. It is dealt in Tier 0 and also in Tier I, as Expansionist's The Gathering Grounds is.
- **Why:** A shared card is dealt in one hand of four, from every shared card of the seat's two decks. So sharing takes the stone circle away from the seat that needs it: it is this deck's only work on the map before the prophet. The Expansionist seat loses nothing. The stone circle is a unique improvement, so that deck's Commission: The Reclaimed Lands and The Cadastre read it when the two decks are paired, and Expansionist opens ten works of its own.
- **Arithmetic:** As this deck's uncommon, the card is the Devotion card of 17% of Tier 0 hands: a seat is offered it in about 5 games of 10 in the four hands of Tier 0, and in about 6 of 10 if it is also dealt in Tier I. As a shared card it is in one hand of Tier 0, in a bag of about nine cards: about 1 game in 6 for either seat, and about 1 game in 4 if it is dealt in both tiers.
- **Synergy:** **Reads:** pastures, camps and plantations. It works with Expansionist's The Three Sisters and The Hillforts (which count the same hexes) when the decks are paired.
- **Shape:** `lastBand: 1` on the row (the field that deals The Gathering Grounds in two tiers).
- **Confidence:** good
- **Depends, joins and notes:** **If you say yes:** the row goes in `data/decks/common.json` with both decks. This deck's Tier 0 holds seven cards and no charter, and the pair shares six. The Expansionist sheet's shared table goes from 17 to 18, and its list of unique improvements gains the stone circle. **If you say no:** only this deck's sheet changes, and the Expansionist list of unique improvements names the stone circle and the cliff monastery as works of another deck.

#### 63. Rite lengths add up (rule)

- **Ruling:** approved. Your words: *"y"*
- **Answers:** your comment on change 10: "lets make sure rite duration modifiers properly stack"
- **Tier, rarity, type:** A rule for The Octave, the Chapel and Chichen Itza
- **Now:** `riteTurnsFor` in `src/sim/religion.ts` adds the percentages of every card and wonder that lengthens a rite, applies the sum once to the rite's ten turns, and rounds down once. The Octave and Chichen Itza give +50% each today, so both together give 20 turns. No row lengthens a rite in one town only.
- **Proposed:** Every modifier of a rite's length is a percentage of the rite's own length, and the percentages add into one sum. The Octave is +100%. The Chapel is +50% for a rite started in its town. Chichen Itza is +50%. So twice as long and 50% longer is two and a half times, never three times.
- **Why:** It is the rule that the code has, and it is the rule you chose for purchases ("faith buys 25% more": the bonuses add). One sum is easy to print: the rite's row can show "10 turns, +100% The Octave, +50% the Chapel: 25 turns".
- **Arithmetic:** A rite of ten turns: with the Chapel 15; with The Octave 20; with Chichen Itza 15; The Octave and the Chapel 25; The Octave and Chichen Itza 25; the Chapel and Chichen Itza 20; all three 30. No belief and no Doctrine changes a rite's length. The length is fixed on the turn the rite starts, so a card seated later does not change a rite that is running.
- **Synergy:** **With The Rites Commonwealth (08):** the realm's rite has one clock. It lasts in every town as long as it lasts in the capital, so a Chapel in the capital lengthens the realm's rite, and a Chapel in another town lengthens only the rites that town starts itself. **The strongest case** is The Octave, Chichen Itza, a Chapel in the capital and The Double Feast: two rites of 30 turns in every town. Eight towns over 150 turns need ten casts, at 20 to 380 faith: about 2,000 faith, or 13 a turn. With no modifier the same cover takes thirty casts and about 18,000 faith. So long rites make the realm's rite cheap, because fewer casts climb fewer steps of the price. The effect of the rites does not grow, and The Rogations and The Psalter gain a third as often. It is strong and it is not broken: it needs a rare, an uncommon, a charter building and a wonder.
- **Shape:** One addition: a town's own row joins the sum (`riteDuration` under a town scope). Today the amplifier is read for the empire only.
- **Confidence:** good
- **Depends, joins and notes:** Two readings for the builder. A rite that acts at once has a wait, not a length, and the modifiers do not lengthen its wait. Today `riteTurnsFor` would lengthen it, so the builder must leave out rows with `atOnce`. A correction to round one: End Turn already offers "Renew rites" when a rite ends (`ritesEndedAt`), so I was wrong to write that the game has no renewal. The click is still one a town.

#### 64. The Processions (new)

- **Ruling:** cut. Your words: *"cut"*
- **Answers:** your comments on changes 20 and 27
- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Rite of Procession: the town proclaims your religion, as an apostle does, and may start no other rite for ten turns.
- **Why:** It is a rite, and it is the act of the spreading faith. A town makes the proclamation, so no unit walks. It makes the moment that your own two lines read: Mission Houses makes it reach farther, and The Field Mass makes it heal.
- **Arithmetic:** An apostle's proclamation presses 30 on every town within six hexes, which turns three citizens in each (`pressurePerConvert` 10). An apostle costs 90 faith, and 40 more each time, for two of them: 45 to 85 faith each. A rite costs 60 to 120 faith in Tier II. So the rite costs what an apostle's charge costs, with no walk, and only from the seat's own towns. With Mission Houses it reaches nine hexes and presses 45 on a foreign town.
- **Synergy:** **Raises:** towns that follow your religion, rites started. **Reads:** a religion that you hold. It feeds Pentecost, The Mass Baptisms, The Mission, The Living Hymnal, The Pilgrim Towns and The Defenders of the Faith. Fed by Mission Houses and The Field Mass (72). **The floor:** a seat with one border town and a young religion presses its neighbours every ten turns.
- **Shape:** A new kind of `atOnce`: a proclamation from the town, through `pressLump`. CLAUDE.md pins `pressLump` to two callers, so the pin gains a third. `RiteDef.byCard` exists.
- **Confidence:** good
- **Depends, joins and notes:** It counts as a rite started, so the next rite costs 5 more. One town says it, never the realm. A larger form is possible: "as a prophet does" (60 within ten hexes). I chose the apostle's size so that apostles stay worth buying.

#### 65. The Bell Towers (new)

- **Ruling:** your text. Your words: *"make this a charter"*
- **Answers:** your comment on change 20
- **Tier, rarity, type:** II, common, Civic
- **Now:** Not in the deck.
- **Proposed:** A town that follows your religion presses it +1 harder for each faith building it holds.
- **Why:** It is a modifier for the tide, and it ties the spread to the temple economy. The player does nothing new: the Shrines and Temples that the seat builds anyway carry the faith.
- **Arithmetic:** A town presses 2 on the towns within three hexes (`cityStrength`, `cityRange`). A holy site presses 6. With a Shrine, a Temple and a Cathedral a town presses 5, and with a Chapel and a faith house 7. A neighbour pressed by two such towns banks 10 a turn and turns a citizen a turn. Today it banks 4, and turns a citizen in two and a half turns.
- **Synergy:** **Raises:** pressure. **Reads:** faith buildings in towns that follow. Fed by The Gifts of the Faithful, The Chantries, the shared The Hearth Fire and the Doctrine The House of Worship. **The floor:** three towns with two faith buildings each press twice as hard.
- **Shape:** `pressure` with a count exists on the High Temple's row (it counts citizens). A count of the faith buildings of the town that presses is a small extension.
- **Confidence:** good

#### 66. The Call to Prayer (new)

- **Ruling:** your text. Your words: *"great, make this a charter, because its hard to slot"*
- **Answers:** your comment on change 20
- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Your holy sites press your religion twice as far.
- **Why:** It makes the place of a holy site a decision for the spread. A site on the border now reaches a neighbour's heartland. After the site is raised the card asks for nothing.
- **Arithmetic:** A holy site presses 6 on every town within six hexes (`siteRange`). At twelve hexes it covers almost four times the ground: about 18 towns where it reaches 5 today. A town of ten citizens turns when six follow, which takes ten turns at 6 a turn.
- **Synergy:** **Raises:** towns that follow your religion. **Reads:** holy sites. Fed by The Anchorites and by every prophet. It feeds The Pilgrim Towns, The Defenders of the Faith, The Living Hymnal and The Great Commission. **The floor:** the one holy site of the founding.
- **Shape:** `pressureRule` names `cityRange` and `bombRange` today. A key for `siteRange` is a small extension.
- **Confidence:** good

#### 67. The Hallowed Ground (new)

- **Ruling:** your text. Your words: *"maybe rework: improved tiles gain +1 faith."*
- **Answers:** your comment on change 27: "I like the idea of additional rites though"
- **Tier, rarity, type:** I, uncommon, Economic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Rite of Hallowing: the town claims three unowned hexes beside its borders at once, and may start no other rite for ten turns.
- **Why:** A rite to do, with a result on the map on the same turn. It needs no religion. The game picks the hexes by the rule that border growth uses, so the screen gains no new choice.
- **Arithmetic:** The eighth hex of a town costs 51 border culture and the fifteenth costs 104 (`borderCost` in `data/rules.json`). A bought hex costs 40 to 60 gold, and 4 more for each one bought. So three hexes are about 150 gold. The rite costs 20 to 50 faith in Tier I. It limits itself in three ways: each use makes every later rite cost 5 more, the town waits ten turns, and a town has only three rings to claim.
- **Synergy:** **Raises:** hexes owned. It reaches a resource, or the ground for a stone circle or a cliff monastery. With Expansionist: The Quitrents and The Measure of the Land count hexes. **Reads:** rites. It feeds The Rogations, The Psalter and the shared The Votive Accounts.
- **Shape:** A new kind of `atOnce`: claim hexes with the picker of border growth. Small extension.
- **Confidence:** good on the idea, fair on the size
- **Depends, joins and notes:** It counts as a rite started. If three hexes is too much at turn 20, two is the next figure.

#### 68. The Vigil of Arms (new)

- **Ruling:** your text. Your words: *"Rework: All units within three hexes of this town gain +4 strength. They keep this bonus while the rite is active."*
- **Answers:** your comment on change 27
- **Tier, rarity, type:** II, uncommon, Military (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Vigil of Arms, a rite: your units within three hexes of the town gain +5 strength for five turns. The town may start no other rite for ten turns.
- **Why:** A rite to do before a battle. The army gathers at a border town, keeps the vigil, and marches. It is flat points, and it has no drawback.
- **Arithmetic:** +5 is the regular Tier II line, for five turns, on every unit that stands within three hexes on that turn. An army of six gains 30 points for one rite price (60 to 120 faith). A town keeps one vigil in ten turns. The Commerce pass's The Epibatai gives units a timed strength in the same way (+5 for three turns after a landing), and you approved it.
- **Synergy:** **Raises:** strength, for a time. **Reads:** rites, and units near a town. It adds to The Zealots and The Spiritual Host. With The Fetials, a unit bought in that town in those turns is a Veteran.
- **Shape:** A new kind of `atOnce`: a timed combat line on the units in range (`Unit.timed` exists). Small extension.
- **Confidence:** good
- **Depends, joins and notes:** It counts as a rite started. The duration modifiers of change 63 do not lengthen the five turns.

#### 69. The Consecration Feast: the figures (rework)

- **Ruling:** your text. Your words: *"Sure. should apply to purchased buildings too."*
- **Answers:** your comment on change 33: "Production feels too strong, lets have it give food and culture?"
- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Round one: Finishing a faith building grants its town production equal to ten times its population.
- **Proposed:** Finishing a faith building grants its town food and culture equal to ten times its population.
- **Why:** Your line. Food is what a feast gives, and the town grows on the day its church is finished.
- **Arithmetic:** A town of 10 citizens gains 100 food and 100 culture. Its next citizen costs 115 food, so a faith building is almost a citizen. A town of 14 gains 140 of each. A seat finishes about ten faith buildings in the tier: about 1,200 food and 1,200 culture over 30 turns, which is 40 a turn of each. The 18th draft costs 606 culture, so one feast is a fifth of a draft. With the Doctrine The House of Worship a seat can finish four more in each town.
- **Synergy:** **Raises:** food, citizens and culture. **Reads:** faith buildings finished. Fed by The Gifts of the Faithful and the Doctrine The House of Worship.
- **Shape:** Existing shape: `windfallRider` on `buildingCompletion` with two grants from the town's population. A building category on the rider is a small extension.
- **Confidence:** good

#### 70. The Offered Stones: stronger (buff)

- **Ruling:** approved. Your words: *"Ok sure, this will be first on my list of cards to cut after playtesting though if we need to cut cards"*
- **Answers:** your comment on change 34
- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Round one: +2 culture for each building you have bought with faith.
- **Proposed:** +4 culture for each building you have bought with faith.
- **Why:** You are right that few things let a seat buy a building with faith. After your ruling on change 06 the list is: culture and faith buildings in a Shrine town (The Gifts of the Faithful), the four faith houses (a belief opens one, and the Doctrine opens all four), science buildings (the great person al-Khwārizmī), and a wonder (The Pious Masons). Units and clergy are not buildings.
- **Arithmetic:** A town can hold nine culture and faith buildings by age 3: Monument, Hall of Deeds, Amphitheater, Garden, Courthouse, Shrine, Temple, Cathedral and a Chapel. A seat of eight towns holds about 45 of them when Tier III opens, and it has bought about a third with faith: 15. At +4 that is +60 culture, the low end of a regular Tier III card (60 to 120). At 30 bought, late: +120. A seat with no Gifts of the Faithful has bought only faith houses: 0 to 8.
- **Synergy:** **Raises:** culture. **Reads:** buildings bought with faith, this game. Fed by The Gifts of the Faithful (06), the Doctrine The House of Worship and The Offering Chests.
- **Shape:** The count of round one, with a larger figure.
- **Confidence:** fair
- **Depends, joins and notes:** The card leans on one other card, The Gifts of the Faithful. If you want it to stand alone, the other form is "+3 culture for each thing you have bought with faith": units, clergy and buildings.

#### 71. The Poor Tables: happiness (rework)

- **Ruling:** your text. Your words: *"no cap."*
- **Answers:** your comment on change 48
- **Tier, rarity, type:** IV, common, Economic to Civic
- **Now:** Round one: Towns gain food equal to a quarter of their faith.
- **Proposed:** +1 happiness for every 20 faith you make each turn, at most +20.
- **Why:** A late seat is short of happiness, not food: its towns are large and each citizen asks for 1. Your picture of the deck says that faith lets large towns stay happy. The poor tables fed the poor of a parish.
- **Arithmetic:** 300 faith a turn gives +15 happiness. Spare happiness of 5 gives +10% science and culture, and 10 gives +20%, so for a seat near zero the card is worth both steps. A seat of twelve towns makes about 500 science and 450 culture at Tier IV: +20% is about 190 a turn.
- **Synergy:** **Raises:** happiness. **Reads:** faith income. Fed by every faith card. It works with The Deaconries and the generic The Good Years.
- **Shape:** Existing shape: happiness by a rate, as The Learned Clergy reads `faithPerTurn`.
- **Confidence:** good
- **Depends, joins and notes:** The card is now Civic, so Tier IV has one Economic card of the deck's own, The Last Offering, as it has today.

#### 72. The Field Mass (shared with Dominion) (new)

- **Ruling:** approved. Your words: *"great"*
- **Answers:** your comment on change 53: "proclamations heal all units within 3 hexes, 25 health"
- **Tier, rarity, type:** III, uncommon, Military
- **Now:** Not in the deck. It takes the place of The Garrison Chapels, which you cut.
- **Proposed:** Your proclamations heal your units within three hexes by 25 health.
- **Why:** Your line. An apostle that marches with the army now has a reason to proclaim at the front: the proclamation presses the faith and heals the army in one act.
- **Arithmetic:** A unit has 100 health, and it heals 10 a turn only when it rests. One proclamation near six units gives back 150 health, which is a unit and a half. A Legionary costs 97 hammers since the new prices. An apostle has two charges for 90 faith, so 45 faith buys about 145 hammers of soldiers back. The apostle's own heal reaches the hexes beside it only.
- **Synergy:** **Raises:** units kept alive. **Reads:** proclamations. Fed by apostles and prophets, The Second Prophet (one more charge), and the Rite of Procession (64), which heals the units round the town that says it. It works with Dominion's kill and rank cards.
- **Shape:** The game has the moment `proclamationMade` (`proclaimAt` announces it for beads). A rider on it that heals the units in range is a small extension; the apostle's heal exists.
- **Confidence:** good
- **Depends, joins and notes:** A reading: "all units" means all your units. Units of another empire are not healed. **The three clergy cards make one small theme and not three copies.** The Healer-Priests (04) heals at home, with no act. The Oriflamme (52) gives +4 to the units beside a religious unit that walks with them. The Field Mass heals round a proclamation, which costs a charge. The Host Restored at Tier IV heals the whole army for a rite. So an apostle with the army gives +4 while it walks and 25 health when it speaks.

#### 73. The Blessed Forges: two outcomes (open)

- **Ruling:** your text. Your words: *"tier 1 is fine"*
- **Answers:** your two comments on this card
- **Tier, rarity, type:** Shared with Scientific, uncommon, Civic
- **Now:** Tier II, shared with Scientific: Improved strategic resources gain +1 faith and +1 production. In the Scientific pass, 2026-11-20, you wrote: "let's move this to tier 1". On this page, 2026-11-21, you wrote "great" on my cut.
- **Proposed:** Choose one. **A: Tier I,** with the same text, on both sheets. **B: cut,** on both sheets.
- **Why:** I recommend A. The Scientific pass has already written the card at Tier I (its change 82), and it rests its rite of research on it (its change 81, the Night Watch, costs faith). Scientific has one faith card of its own. A shared card must pay a seat with no faith engine, and at Tier I this one does: it is that seat's first faith. For a Devotion seat the card is small in either tier.
- **Arithmetic:** Two improved strategic resources at turn 60 give +2 faith and +2 production. That is under the Tier I bar of 15 to 25. Two faith a turn pays for a Night Watch every ten to fifteen turns.
- **Synergy:** **Under A** the pair shares six cards, four of them in Tier I. **Under B** it shares five, and the Scientific seat's faith comes from The Sky Watchers, The Monastery Libraries and The Priest-Astronomers.
- **Shape:** A: `band` 2 to 1. B: `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** Question r2-q2.

#### 74. The House of Worship: the answer, and a clearer text (Doctrine) (doctrine)

- **Ruling:** approved. Your words: *"what does the 'whatever beliefs your religion holds' line mean? I like this doctrine, great card for faith building builds."*
- **Answers:** your question on change 60
- **Tier, rarity, type:** Doctrine, Tier III
- **Now:** Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds.
- **Proposed:** Unlocks the Mosque, the Wat, the Gurdwara and the Dar-e Mehr in your devout towns, whatever beliefs your religion holds. Each is bought with faith.
- **Why:** **It unlocks them.** The row has four `unlocksBuilding` effects. Without the Doctrine a town can hold a faith house only if its religion holds that house's follower belief, and a religion holds three follower beliefs of seventeen. So most religions have one house or none. The four houses are never built with production and never bought with gold: their rows say `purchaseOnly` with the faith bank. The word "buy" in the text made it read as a permission. The new text says what it does.
- **Arithmetic:** Each house is about 118 hammers, so about 236 faith. A devout town of 12 with all four gains: the Mosque +3 faith, +2 production and +1 authority; the Wat +3 happiness and +6 faith; the Gurdwara +3 food, +3 faith and +4 science; the Dar-e Mehr +25% faith. That is about 15 faith, 4 science, 3 food, 2 production, 3 happiness and 1 authority for 944 faith in each town. Each house is also a faith building for The Temple Workshops, The Temple Herds, The Bell Towers, The Prince-Bishops and the shared The Painted Chapels.
- **Synergy:** **Raises:** faith buildings, authority (the Mosque), happiness (the Wat). It feeds the authority theme of section r2-10.
- **Shape:** A text change. The effects do not change. The move to Tier III is `band` 4 to 3.
- **Confidence:** good
- **Depends, joins and notes:** The Gurdwara pays science for each citizen (+1 for every three). The ruling on base science asks the build report to list such rows.

#### 75. The Two Swords (new)

- **Ruling:** your text. Your words: *"sure. no cap"*
- **Answers:** your answer to question 2: "maybe there could be some interaction with spare authority?"
- **Tier, rarity, type:** III, common, Civic
- **Now:** Not in the deck.
- **Proposed:** +1 happiness for every two points of spare authority, at most +8.
- **Why:** It reads spare authority and pays in this deck's way. It ties the two limits together: a realm that rules less than it could is a content realm. So the seat chooses each time: found one more town, or keep the spare and be paid for it. The two swords were the pope's and the emperor's.
- **Arithmetic:** A seat with eight spare gains +4 happiness, and with sixteen the cap of +8. Spare authority of 5 also gives +10% production by itself, and 10 gives +20%. A founded town costs 3, so one new town takes away 1 or 2 happiness.
- **Synergy:** **Raises:** happiness. **Reads:** spare authority. Fed by The Holy Inquisition (+1 for each devout town), Commission: The State Church, the Mosque, The Caliphate, and the generic Local Clerks.
- **Shape:** Existing shape: the count `authoritySurplus` (Expansionist's The Mandarinate reads it), paid as happiness.
- **Confidence:** good

#### 76. The Commander of the Faithful (new)

- **Ruling:** your text. Your words: *"no cap"*
- **Answers:** your answer to question 2
- **Tier, rarity, type:** IV, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** +3 faith and +3 culture for each point of spare authority, at most +60 of each.
- **Why:** It is the late pay-off of the authority theme. It pays a seat that has more authority than towns, which only a devout realm has.
- **Arithmetic:** Ten spare gives +30 faith and +30 culture. Twenty gives the cap, +60 and +60. A regular card of the tier before pays 60 to 120.
- **Synergy:** **Raises:** faith and culture. **Reads:** spare authority. Fed by the same cards as The Two Swords.
- **Shape:** Existing shape: `pays` for the empire by the count `authoritySurplus`, with a cap.
- **Confidence:** good

#### 77. Commission: The Anointing (new)

- **Ruling:** approved. Your words: *"Sure"*
- **Answers:** your answer to question 2
- **Tier, rarity, type:** III, uncommon, Wildcard (Commission)
- **Now:** Not in the deck.
- **Proposed:** Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture.
- **Why:** It gives the seat a goal that is not "one more town". To meet it, the seat stops growing for a time or makes its towns devout. Tier III has one Wildcard card today.
- **Arithmetic:** Ten devout towns: +30 faith and +30 culture for the rest of the game, with no chair. A founded town costs 3 authority, so the goal is three or four towns that the seat does not found.
- **Synergy:** **Raises:** faith and culture in devout towns. **Reads:** spare authority. Fed by The Holy Inquisition, Commission: The State Church and The Caliphate.
- **Shape:** A commission whose goal reads the count `authoritySurplus`. Small extension if a goal cannot read that count today.
- **Confidence:** fair

#### 78. The Caliphate: one authority, not none (rework)

- **Ruling:** approved. Your words: *"ok i like this change"*
- **Answers:** your answer to question 2, and your rule that authority stays a limit
- **Tier, rarity, type:** III, rare, Civic
- **Now:** Devout towns cost no authority. You answered "Sure" to keeping it.
- **Proposed:** Devout towns cost 1 authority.
- **Why:** Your line for The Holy Inquisition now gives +1 authority for each devout town. With that card beside it, today's Caliphate would make each devout town a gain of 1. At a cost of 1 the two cards together make a devout town free, and neither card does it alone. So the rule is still broken, as you want, but it takes a rare and an uncommon to break it.
- **Arithmetic:** Ten towns, nine of them founded, cost 27. The palace and four ages give 14. With The Caliphate today: cost 0, spare 14. With the proposed line: cost 9, spare 5. With The Holy Inquisition too: spare 15. With the commission of change 23 as well: spare 20. A new town costs 3 until it turns devout, and then 1.
- **Synergy:** **Reads:** devout towns. It feeds The Two Swords, The Commander of the Faithful and Commission: The Anointing.
- **Shape:** Existing shape: `meterRule` `cityCost` with a value of 1 under the scope `ownersFaith`.
- **Confidence:** fair
- **Depends, joins and notes:** Question r2-q1. If you keep "no authority", the theme still works, and one rare removes the limit by itself.

#### 79. Faith discounts take the "buys more" form (rule)

- **Ruling:** approved. Your words: *"great"*
- **Answers:** the ruling in `docs/flags.md`: "A purchase discount is 'gold buys more'" ("devotion can take this too")
- **Tier, rarity, type:** One Order, one Doctrine and two beliefs
- **Now:** The Offering Chests (07): everything you buy with faith costs 20% less. The Doctrine The Canons of the Holy Sepulchre: towns with a holy site buy with faith at 30% less. The belief The Alms Box: towns that follow buy with faith for 20% less. The belief Apostles: apostles cost 30% less faith.
- **Proposed:** The Offering Chests: Your faith buys 25% more. The Canons of the Holy Sepulchre: In towns with a holy site, your faith buys 40% more. The Alms Box: In towns that follow, your faith buys 25% more. Apostles: Your faith buys 40% more when you buy an apostle.
- **Why:** Your ruling. The bonuses add, the price is the full price divided by one plus the sum, and no cap is needed.
- **Arithmetic:** "25% more" is the same price as "20% less". "30% less" is exactly 43% more; I wrote 40% more, which is 29% less. A settler of 72 faith costs 58 with The Offering Chests. In a town with a holy site that follows, with all three: 90% more, so 38 faith, which is 47% less. An apostle of 90 costs 55 with The Offering Chests and the belief.
- **Synergy:** It reads every purchase with faith: 05, 06, the shared The Shrine Guards, clergy, the faith houses.
- **Shape:** The shape of the gold ruling, in the faith bank. The four rows are listed for the build report.
- **Confidence:** good
- **Depends, joins and notes:** The two beliefs are outside the deck. I list them so that the builder converts them in the same batch.

#### 80. Rarities after your rulings (move)

- **Ruling:** approved. Your words: *"great"*
- **Answers:** your lines for changes 20 and 35
- **Tier, rarity, type:** Two cards
- **Now:** Mission Houses is an uncommon. Change 35 of round one made The Holy Inquisition a common, because it was a plain percentage.
- **Proposed:** Mission Houses becomes a common. The Holy Inquisition stays an uncommon.
- **Why:** Mission Houses is now a plain modifier that any seat with a religion can use, and the spread needs a card that is seen. The Holy Inquisition is now two strong effects, which is not a common.
- **Arithmetic:** Tier II then holds 8 commons, 12 uncommons and 3 rares: a common is the Devotion card of 7.5% of hands, an uncommon 2.5% and a rare 3.3%. Four of the twelve uncommons are charters, and a charter leaves the draw when the seat takes it. Tier III holds 5, 11 and 5: 12%, 2.7% and 2.0%.
- **Synergy:** The other commons of Tier II for the spread are The Parishes and The Bell Towers (65).
- **Shape:** No shape change.
- **Confidence:** good

## Record: round one, as first written

- Round one proposed 61 changes: 7 buff, 15 rework, 9 cut, 8 move, 20 new and 2 doctrine.
- One statement of R1 is wrong: section 1.4 says that the game has no renewal for a rite. End Turn offers one.

### R1. Why the deck plays as it does

In three sentences:

1. **From Tier II on, the deck asks one question: is your religion here?** 30 of the 43 cards in Tiers II to IV pay nothing until the seat has founded a religion. After that the religion spreads by itself, so most of those cards ask the player to do nothing.
2. **The deck pays the same reward too often, and it hides its best cards.** 12 cards pay "science and culture" as a pair, and all six Tier 0 cards pay faith. Tier III has seven rares that are each seen in 1 hand of 70, and Tier IV is nine rares and one uncommon.
3. **The acts that are Devotion's own are thin, or they are chores.** A rite is one click a town every ten turns, at a price that rises all game. Faith buys a short list of things, and the wide permission is a Tier II rare. Seven cards pay a holy site, and a seat has one.

#### 1.1 The tally: what each card reads, by tier

| What the card reads | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The religion: a god, a devout town, a follower, the clergy | 0 | 1 | 10 | 6 | 6 | 23 |
| Holy sites | 0 | 0 | 4 | 2 | 1 | 7 |
| Faith spent, and purchases with faith | 0 | 4 | 2 | 3 | 0 | 9 |
| Rites | 0 | 5 | 1 | 1 | 1 | 8 |
| Faith buildings, and the Granary | 1 | 3 | 0 | 2 | 1 | 7 |
| Faith income and the faith you hold | 4 | 0 | 0 | 2 | 1 | 7 |
| The land: pastures, camps, plantations | 1 | 0 | 0 | 0 | 0 | 1 |
| The army: units lost | 0 | 1 | 0 | 0 | 0 | 1 |
| **All** | 6 | 14 | 17 | 16 | 10 | 63 |

- Each card is counted once, by the thing the player must have or do for it to pay. The 63 are the deck's own live cards. The shared cards are not in the table.
- **The religion and its holy sites are 30 of 63 cards (48%).** A holy site needs a founded religion, so the two rows are one bet. The Creed is in the first row and needs only a god. The Psalter is in the rites row and needs a devout town. So 30 cards wait for the founding: 14 of 17 in Tier II, 9 of 16 in Tier III and 7 of 10 in Tier IV.
- **What the cards pay is the second note.** 16 of 63 pay faith (25%), so the rule "no more than a third pay the deck's own yield" holds. But 12 cards pay "science and culture" in equal parts, and their texts read alike: The Fast, The Settled Faith, The Living Hymnal, The Book of Life, The Psalter, The Consecration Feast, The Mass Baptisms, The Learned Clergy, The Chapter Houses, The Seven Pilgrimages, The Apostolic Succession and The Treasury of Merit.
- **Themes that are in the deck's picture but have too few cards to draft toward:** the land (1 card, at Tier 0); the army (5 Military cards, and none before Tier II); faith buildings in Tier II (no card); rites after Tier I (3 cards in three tiers); great people and wonders (1 card, The Pious Masons).

#### 1.2 What a Devotion seat does on the map and in its turns

| What the seat does | How often | Cards of the deck that pay for it |
|---|---|---|
| Nothing: the religion spreads to the towns in range (the tide) | every turn, with no input | about 20 |
| Starts a rite in a town | every ten turns, for each town | 8 |
| Buys with faith: clergy, and what a card opens | every few turns | 9 |
| Builds a Shrine, a Temple and a Cathedral in each town | once a town each | 7 |
| Buys a prophet and founds the religion | once | the 30 cards above |
| Buys a prophet and raises a further holy site | once or twice a game | 7 |
| Takes a god or a belief | five to eight times a game | 2 |
| Walks an apostle to a town and proclaims | when the player wants to | 1 directly, 5 through a conversion |

- Any seat builds Shrines, and any seat with faith can say a rite. So the honest answer to "what does a Devotion seat do that no other seat does" is: it founds a religion, and then it waits for the religion to spread.
- **A devout town has one dimension.** A town follows your religion or it does not. The tide decides it, and the player's only tools are a proclamation and patience.
- **A holy site is the best act in the deck, and the rarest.** The player picks a hex, and seven cards pay that hex. But a further site costs a whole prophet (180 faith, then 240), and the same prophets are needed for beliefs.
- **Nothing on the map belongs to this deck before the prophet.** Expansionist has ten unique improvements and Scientific has two. Devotion has none.

#### 1.3 What faith buys, and whether spending is a choice

| What faith buys | Price | Who can buy it |
|---|---|---|
| A god | 40, 56, 72, 90 faith | every seat; three or four in a game |
| A rite, for ten turns in one town | 20 faith, and 5 more for each rite the empire has started | every seat with Divination |
| A prophet (two charges) | 120 faith, and 60 more each time | every seat with The High Temple |
| An apostle (two charges) | 90 faith, and 40 more each time | a seat with a religion and Theology |
| An inquisitor | 200 faith | age 4 |
| A faith house of a follower belief | 2 faith a hammer | a seat whose religion holds the belief |
| Any unit, in a town with a Cathedral | 2 faith a hammer | every seat, from age 3 |
| Hammers for a Cathedral or the Magnum Opus | 2 faith a hammer | every seat |
| Workers; religious buildings; melee units | 2 faith a hammer | Consecrated Labor; The Gifts of the Faithful; the shared The Shrine Guards |
| Any building, in a town with a Temple | 2 faith a hammer | The Lay Brothers, a Tier II rare |
| A half-built wonder; a great person | 2 faith a hammer; 750 faith | The Pious Masons and the shared Sacred Patronage, both Tier III rares |

- **Faith is a strong currency.** It buys a hammer for 2, and gold pays 4. The deck's design doc says that spending faith in place of production "should be the core of the deck".
- **Before age 3 the core is behind cards, and the cards are narrow.** Four cards each open one class of thing. The one that opens all buildings is a rare that a seat is offered in about one game of three.
- **Spending is a choice only between the gods, the rites and the clergy.** That choice is real in ages 1 and 2. After the religion is founded and the beliefs are full, faith has no large use until the Cathedral, and a seat holds hundreds of it.
- **The price of a rite rises for the whole game** (your rule of 2026-10-28). The 20th rite costs 115 faith and the 40th costs 215. A seat of eight towns that keeps a rite in each starts 40 rites in 50 turns. So the cards that pay for rites pay less and less for each point of faith.
- **One card pays the seat to hold faith** (The Treasury of Merit), against five that pay it to spend.

#### 1.4 Chores: what the cards ask the player to do

- **Rites.** A town's rite ends after ten turns, and the game has no renewal. Six towns are six clicks every ten turns. Five Tier I cards and two shared cards pay for it (The Rogations, The Founding Vows, The Rites Commonwealth, The Fast, The Octave, The Priest-Astronomers, The Festival Calendar). The Octave is the only card that lowers the count of clicks. This is the real chore in the deck.
- **Prophets.** A prophet walks 2 hexes a turn from the town that bought it. Founding, a further holy site and a belief each use the whole prophet. A seat buys four to six in a game. Each is a short walk and one decision, and I count the holy site as a decision on the map.
- **Apostles.** An apostle walks 4 hexes a turn and has two charges: a proclamation, a heal, or a relic for a Cathedral town. The Mission, The Conversion of Kings, Pentecost and The Mass Baptisms pay for conversions, but the tide makes most conversions with no apostle. Mission Houses makes a proclamation 30% stronger, and nothing on the screen shows it.
- **The Oriflamme** (shared with Dominion) asks the player to walk a religious unit beside the army every turn. The unit is a civilian, and an enemy captures it.
- **Remembering.** The Offered Stones counts the buildings bought with faith in each town. You cut the shared The Waqf for that reason.
- **Inquisitors.** No card reads them. I leave them alone.

#### 1.5 The seat that founds late, or not at all

- The world holds religions for two thirds of its seats, rounded up (`maxReligions`): four in a game of six, three in a game of four. A prophet needs The High Temple and 120 faith, after the first gods have taken 96.
- A seat with no religion is paid by 3 of the 17 cards of Tier II (The Sabbath Laws, The Lay Brothers, The Book of Life), 7 of 16 in Tier III and 3 of 10 in Tier IV. A seat that founds twenty turns after Tier II opens has those hands for twenty turns.
- "Devout" asks for a religion whose holy city you hold. So a seat whose towns all follow a neighbour's religion has no devout town, though the follower beliefs pay it.
- Tiers 0 and I are safe: none of their 20 cards needs a religion. That was your ruling of 2026-10-25, and it works.
- No card helps a seat win the race except The Calling, which pays +3 faith.
- I could not measure how often a Devotion seat loses the race or founds late. No bot games have been measured since the deck was rebuilt.

#### 1.6 Dead and nearly dead cards

- **The Offering Chests (Tier III, common)** discounts soldiers bought with faith. A seat buys soldiers with faith only in a Cathedral town, with the shared The Shrine Guards, or as Joan of Arc. It is the Devotion card of 3 hands in 10 at Tier III.
- **The Seven Pilgrimages (Tier IV)** pays +2 science and +2 culture in two towns for a seat with two holy sites. It is the Devotion card of 3 hands in 4 at Tier IV.
- **Mission Houses (Tier II)** adds 18 to a lump of 60.
- **The Confessors (Tier II)** shares sight that no card reads.
- **The Pilgrim Towns (Tier III)** pays about 6 culture.
- **The Saints' Fields and The Old Holy Places (Tier II)** pay 9 and 6 on one hex. A regular Tier II card pays 35 to 60.
- **The First Offering (Tier 0)** is 25 faith once. **The Founding Vows (Tier I)** is 100 faith and 40 food for two rites. Both are under the size at which a lump is noticed.
- **The Sacred Host (shared, Tier I, rare)** pays 15 faith a kill in every age.
- **The Tithe (shared, Tier II, rare)** paid nothing in 27 samples of the bot games of 2026-10-13. I did not check if that is still so.

#### 1.7 Rares that are weaker than commons

| The rare | Pays | The common or uncommon that beats it |
|---|---|---|
| The Rites Commonwealth (I) | about +2 happiness in each town that keeps a rite | The Temple Storehouses (common): +2 food and +2 happiness in each Temple town, with no rite |
| The Sacred Host (shared, I) | 15 faith a kill | Rites of Passage (common, Tier 0): 12 faith for each military unit gained |
| The Settled Faith (II) | +15% science and culture in devout towns: about +28 in age 3 | The Living Hymnal (uncommon): +30 science and +30 culture with ten towns that follow |
| The Apostolic Succession (IV) | at most +24 science and +24 culture, eighty turns after the founding | The Cathedral Works (common, Tier III): +64 science in eight Cathedral towns |
| The Treasury of Merit (IV) | +20 science and +20 culture for 1,000 faith held | The Learned Clergy (uncommon, Tier III): +60 and +60 at 300 faith a turn |
| The Tithe of Nations (IV) | +75 faith with 150 followers in the world | The Holy Inquisition (uncommon, Tier III): +105 faith at 300 a turn |
| The Great Commission (IV) | after half the world follows: +36 faith and +36 culture in twelve devout towns | The Chapter Houses: +96 and +96 in eight Cathedral towns |

#### 1.8 How often each card is seen

- A hand holds one card for each of the seat's two decks, and a third card that goes round four kinds: generic, shared, generic, and one more from a deck (`drawHandPositions` in `src/sim/statecraft/draft.ts`). The game rolls a rarity first, at 60 / 30 / 10, over the rarities the deck holds in the current tier. Then it picks evenly inside that rarity.
- The table gives the chance that one named card is the Devotion card of a hand, before the seat holds any card of the tier.

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare |
|---|---|---|---|---|---|---|
| 0 | 5 | 1 | 0 | 13% | 33% | none |
| I | 7 | 6 | 1 | 8.6% | 5.0% | 10% |
| II | 3 | 12 | 2 | 20% | 2.5% | 5.0% |
| III | 2 | 7 | 7 | 30% | 4.3% | 1.4% |
| IV | 0 | 1 | 9 | none | 75% | 2.8% |

- **Tier 0** has no rare. The one uncommon, The Royal Cult, is the Devotion card of 1 hand in 3.
- **Tier I:** the one rare, The Rites Commonwealth, is seen more often than any other card of the tier.
- **Tier II:** all three commons pay a holy site (Temple Estates, The Saints' Fields, The Old Holy Places). So 6 Devotion hands in 10 show a holy-site card, to a seat that has one site. Each of the two rares is seen twice as often as each of the twelve uncommons.
- **Tier III:** two commons take 6 hands in 10 (The Offering Chests and The Cathedral Works). The seven rares share 1 hand in 10. They are the capstones of every theme: The Caliphate, The Abbeys, Pentecost, The Turning of Swords, The Pious Masons, The Doctors of the Church and The Conversion of Kings. A seat is offered each of them in about one game of nine.
- **Tier IV** has no common. The Seven Pilgrimages is shown in 3 hands of 4 until the seat takes it. The nine rares share the rest.
- The pass moves rarities so that each tier has commons that any seat can use, and no tier has more rares than it can show. Section 5 has the table after the changes.

#### 1.9 Gaps by tier and by chair

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| 0 | 0 | 1 | 5 | 0 |
| I | 0 | 5 | 8 | 1 |
| II | 2 | 2 | 11 | 2 |
| III | 2 | 2 | 11 | 1 |
| IV | 1 | 1 | 7 | 1 |

- **Military:** five cards in the deck, and none in Tiers 0 and I. Every government seats a Military chair. A seat paired with Dominion has four shared Military cards; any other seat fills the chair from the generic cards.
- **Economic:** 11 cards of 63, and two or fewer in each of Tiers II, III and IV.
- **Civic:** 42 of 63 (67%). A government with few Civic chairs leaves most Devotion hands with nothing to seat.
- **Rares:** none in Tier 0. **Commons:** none in Tier IV, and two in Tier III.
- **Boons:** one, at Tier 0. **Charters:** two.
- **The map:** no improvement of the deck's own before the prophet.

#### 1.10 Doubles

- **A flat faith figure for the capital or for every town, three times in Tier 0:** The Calling, The Royal Cult and The Household Gods.
- **Faith buys one class of thing, four times:** Consecrated Labor (workers), The Gifts of the Faithful (religious buildings), The Lay Brothers (other buildings) and the shared The Shrine Guards (melee units).
- **A holy site's own hex, twice, and its neighbours once:** The Saints' Fields, The Old Holy Places and Temple Estates. All three are Tier II commons.
- **A town with a Shrine or a Temple gains food and happiness, twice:** The Wayside Shrines and The Temple Storehouses.
- **Devout towns cost less authority, twice:** Commission: The State Church (1 less) and The Caliphate (none).
- **Towns that work a holy site, twice:** The Pilgrim Towns and The Seven Pilgrimages.
- **Faith into science and culture, twice, in opposite directions:** The Learned Clergy reads faith income, and The Treasury of Merit reads faith held.
- **Years since the founding:** The Apostolic Succession counts turns, in the same tier where The Book of Life has reached its cap.

#### 1.11 Science, culture and production

- **Culture:** reachable in every tier from Tier I: The Creed, The Rogations, The Pilgrim Staff, The Sabbath Laws, The Living Hymnal, The Offered Stones.
- **Science:** none in Tier 0. In Tier I only The Fast, which stops a town's growth. From Tier II it comes as half of a "science and culture" pair, in the cards that need the religion.
- **Production:** The Tithe Barns (+1 in a Granary town) and The Votive Gifts (faith into a build) are the deck's only production. The deck is meant to buy in place of building, and the cards that let it buy are narrow or rare (1.3).
- **Food and happiness:** this is what the deck does well early: The Wayside Shrines, The Temple Storehouses, Lay Offerings, The Deaconries.

#### 1.12 Authority

- Your ruling in the Commerce pass: *"I don't like too many cards that lower authority on a per-city level"*, and *"Authority needs to be a limiting factor for growth."*
- Devotion has two such cards: Commission: The State Church (devout towns cost 1 less) and The Caliphate (devout towns cost none). The Mosque of the belief Minarets gives +1 authority in each town that holds one.
- Your picture of the deck says that "faith allows greater authority and wider empires". So the deck should give authority, but as a figure that the seat earns, not as a cut for each town.
- Change 23 rewrites the commission in the words of your own line for The Market Writ. The Caliphate stays as the deck's one rule-breaker, as The Imperial Roads stays in Expansionist. Question 2 asks if you want it changed too.

#### 1.13 The pairs in one line each, and how a shared card is seen

- **Dominion:** Devotion gives faith that buys and heals an army, and strength on the faith's ground. It takes kills, garrisons and captured towns. Five shared cards, none after Tier II.
- **Expansionist:** Devotion gives happiness for large towns. It takes citizens, public works and new towns. Three shared cards, all in Tier 0.
- **Commerce:** Devotion gives a second bank. It takes luxuries, routes and purchases. Five shared cards after the Commerce pass, in Tiers 0 to II.
- **Scientific:** Devotion gives faith buildings that teach. It takes Libraries and Academies. Six shared cards, in Tiers I to III.
- **Magisterial:** Devotion gives faith for great people and wonders. It takes wonders, works and festivals. Four shared cards, in Tiers I to III.
- **A shared card is in one hand of four.** It is drawn from every two-deck card that names either of the seat's decks, so a seat sees about two shared cards in each of Tiers I to III. More shared cards do not make any one of them more likely. So I add shared cards only where a pair has an empty tier.

### R2. The notes: what I tested, and what I recommend

- The religion stays the core. The aim is range: other things for the cards to read, which the playstyle makes by itself.
- I tested ten notes against one question: does a seat that drafts one card of the note still get paid?
- I recommend five. A, B and C are new notes. D is the deck's engine made wider and earlier. E is small.

#### A. The temple economy: faith buildings (Recommended)

- **The quantity:** the faith buildings a town holds: a Shrine, a Temple, a Cathedral, a Chapel, a faith house, and a leader's building.
- **Who raises it:** every seat builds a Shrine and a Temple. A Devotion seat buys them with faith.
- **Who reads it today:** First Rites, The Temple Storehouses, The Cathedral Works, The Chapter Houses, the shared The Painted Chapels and the Cathedral School. You wrote two of its cards yourself (The Tithe Barns and The Temple Storehouses). Tier II has no card of it.
- **The changes:** each faith building pays food and production (12). The herds and gardens of a town count its faith buildings (28). A finished faith building pays production (33). Faith buildings yield twice (38). Towns start with a Shrine (54). The Doctrine for four more faith houses comes a tier sooner (60).
- **The floor:** a seat with a Shrine and a Temple in four towns gains +8 food and +8 production from The Temple Workshops alone.
- **What it does to play:** a faith building becomes the first thing a new town wants, and buying one with faith starts the town's economy.
- **The partner decks:** Harun al-Rashid's line pays the same buildings. Magisterial's The Painted Chapels pays culture on them. Expansionist's new towns start with one.

#### B. Rites as acts (Recommended)

- **The moment and the quantity:** a rite started, and the towns that keep a rite. Both are built.
- **The problem:** a rite is a click a town every ten turns, at a rising price, for +1 food on a few hexes. The cards pay for the clicks.
- **The changes:** the capital's rite is kept by the whole realm (08). A Chapel makes a town's rite last for ever (09). Rites last twice as long (10). Two new rites do things no building does: the Saturnalia halves a town's happiness demand and stops its gold (27), and the Rite of Naming adds a citizen at once (40). The Double Feast comes down from Tier IV to Tier II (30). Units gained in a rite town start as Veterans (22). The Psalter loses its second condition (32).
- **The floor:** rites need Divination and faith, and no religion. A seat that drafts only The Rites Commonwealth gains about +20 food or +16 science in age 2 for one click every ten turns.
- **What it does to play:** the realm's rite is one decision every ten turns: grow, study, feast, or rest. The new rites are things to do that no other deck has, and they use the rite menu that exists.
- **The partner decks:** Expansionist spends the citizens that the Rite of Naming makes. Dominion gains Veterans. The shared The Festival Calendar and The Priest-Astronomers read rite towns.

#### C. Holy ground: holy sites and sacred works on the map (Recommended)

- **The quantities:** holy sites, and two new unique improvements: the stone circle and the cliff monastery.
- **The problem:** seven cards pay a holy site and a seat has one. The deck has nothing to build on the map before the prophet.
- **The changes:** a stone circle at Tier 0 that counts the herds and plantations beside it (03). A cliff monastery at Tier II that counts mountains (26). A holy site that counts the improved hexes beside it (14), grows with age (16), and is paid by every town that follows (31). Two cards that supply sites become easier to see (17, 18). Three flat cards go (15, 42, 43). A Doctrine for the ring round each Shrine town (59).
- **The floor:** the stone circle and the cliff monastery need no religion and no chair. A seat that takes only The Megaliths gains about 4 faith and 1 culture a turn from one hex in age 1.
- **What it does to play:** where the seat puts a pasture, a town and a holy site becomes a choice. The site is worth more each age.
- **The partner decks:** both new works are unique improvements, so Expansionist's The Reclaimed Lands and The Cadastre pay them. Justinian and Mansa Musa read holy sites. A holy site is a great person's work, so Magisterial's cards for works pay it.

#### D. The purse of faith: wider and earlier (Recommended)

- **The moment:** faith spent, and a purchase with faith. Both are built.
- **The problem:** the deck's way round its production gap is a Tier II rare, and the large purchases are Tier III and IV rares.
- **The changes:** Shrine towns buy settlers and workers (05) and all buildings (06) from Tier I. Everything bought with faith costs 20% less (07). Two more cards pay when faith is spent (36, 37), and one counts what was bought (34). A boon gives ten turns of faith at Tier IV (47). The card that pays the seat to hold faith goes (44). A great person's faith price follows renown, as the gold price does (57).
- **The floor:** every seat with faith spends it. A seat that drafts only The Gifts of the Faithful turns 30 faith a turn into 15 hammers a turn, in the town of its choice.
- **What it does to play:** each turn the seat chooses between a settler, a building, a rite and the prophet. A threat on the border is answered with faith.
- **The partner decks:** Commerce buys beside it with gold, and its The Double Entry doubles the purchase cards. Mansa Musa is the seat to test.

#### E. The army of the faith (Recommended, small)

- **The problem:** five Military cards, none before Tier II, and one of them shares sight.
- **The changes:** one Military card that takes a chair in each of Tiers 0, I, III and IV (04, 13, 39, 49), The Fetials in place of The Confessors (21, 22), and flat points only.
- **The floor:** each card pays a seat at peace: healing, and strength from faith income.
- **The partner deck:** Dominion. The shared cards change in three places (51, 52, 53).

#### F. Relics (Not recommended now)

- A relic is one a Cathedral town, placed by an apostle. It comes late and it stops at one a town. You rejected The Relic Trade in the Commerce pass. I would come back to relics with a new act for them, not with a card that counts them.

#### G. The clergy's acts as a moment (Not recommended)

- A card that pays for each charge spent would pay the player to walk units. The deck has enough walking.

#### H. Defending the faith: inquisitors and purges (Not recommended)

- It reads what a rival's religion does, which the player cannot raise. The rule of 2026-11-10 asks that no card reads what a rival does.

#### I. Pilgrim routes (Leave to the shared cards)

- Routes are Commerce's material. Pilgrim Markets and Mansa Musa's The Hajj hold this note, and the Commerce pass ruled on it.

#### J. Followers abroad (The core: no new cards)

- The spread has cards in every tier from II. The pass moves one earlier (29), cuts two (20, 21), and ties the count of towns that follow to the holy sites (31), the army (39) and the last commission (46).

### R3. The 61 entries, as first proposed

#### 01. The Calling (rework)

- **Ruling:** not adopted. Your words: *"Way too strong, keep as is."*
- **Tier, rarity, type:** 0, common to rare, Civic (Boon)
- **Now:** Your capital gains +3 faith.
- **Proposed:** On draft: your first prophet costs no faith.
- **Why:** Three Tier 0 cards pay a flat faith figure to the capital or to every town (The Calling, The Royal Cult, The Household Gods), and none of them changes a decision. The race to found a religion decides whether 30 later cards pay. This card settles the race for the seat that drafts it, and it lets the seat spend its first faith on rites, Shrines and settlers.
- **Arithmetic:** A prophet costs 120 faith. A Devotion seat makes about 8 faith a turn at turn 40, and the first two gods take 96, so the first prophet comes at about turn 60 to 70 today. With the card the seat buys the prophet on the turn it learns The High Temple. A Tier 0 lump registers at 50 to 100. This one is 120 faith (60 at the half rate), and it arrives ten to twenty turns sooner. It is a boon, so it takes no chair while the seat waits.
- **Synergy:** **Raises:** the religion, and how early it comes. It feeds every card of Tiers II to IV that needs a religion. With Consecrated Labor (05) and The Gifts of the Faithful (06) the early faith goes to settlers and buildings, and the founding still happens.
- **Shape:** Small extension: a boon that leaves a lasting effect (the Commerce pass asks for the same for The First Caravan). The effect is a `purchaseRider` of 100% off the prophet, for the first one only.
- **Confidence:** good
- **Depends, joins and notes:** Tier 0 has no rare today. The Commerce and Dominion passes both gave Tier 0 a rare that changes a rule, and you approved them.

#### 02. The First Offering (buff)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** 0, common, Civic (Boon)
- **Now:** On draft: gain 25 faith.
- **Proposed:** On draft: gain 60 faith.
- **Why:** 25 faith is less than half the price of the first god. It is the weakest card in Tier 0.
- **Arithmetic:** The gods cost 40, 56 and 72 faith (`ladder` in `data/religion.json`). A Tier 0 lump registers at 50 to 100. 60 faith pays the first god and a third of the second, or a settler under change 05.
- **Synergy:** **Raises:** faith held, and faith spent. It feeds The Pilgrim Staff and The Book of Life when it is spent.
- **Shape:** Existing shape: a number change on the boon's grant.
- **Confidence:** good

#### 03. The Megaliths (new)

- **Ruling:** approved. Your words: *"cool, should this be shared with expansionist?"*
- **Tier, rarity, type:** 0, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Workers may raise one stone circle in each town, on flat land: +2 faith and +1 culture, and +1 faith more for each pasture, camp or plantation beside it.
- **Why:** You liked the Nazca lines: a named work that reads the hexes beside it. `docs/decks/deck-design.md` gives Devotion the pastures, camps and plantations, and only Lay Offerings reads them today. The stone circle gives the seat a holy place on the map in age 1, before any prophet, and it makes the place of each herd matter. Megaliths belong to the first age: Carnac, Stonehenge, Göbekli Tepe.
- **Arithmetic:** A stone circle with two herds or plantations beside it yields 4 faith and 1 culture, on top of the ground's own 2 food: 7 on one hex, against 3 or 4 for a farm. Culture counts three times in Tier 0. A median seat makes no faith at all in age 1 (the power bar), so 4 faith a turn from one hex at turn 30 is a strong Tier 0 card (4 to 8), for one worker charge and no chair. Three towns late: 12 to 15 faith and 3 culture.
- **Synergy:** **Raises:** faith with no religion, and unique improvements (the Expansionist pass's keyword), so that deck's Commission: The Reclaimed Lands and The Cadastre pay it. **Reads:** pastures, camps and plantations. Fed by Lay Offerings, The Temple Herds (28), Dominion's herd cards and Commerce's The Planters' Charter.
- **Shape:** New improvement row `stoneCircle`: flat land, one in each town. The yield "for each hex beside it that…" is the new shape of the Expansionist pass (Nazca lines, the baray, the hillfort), so it is built once. `charter.unlocks` exists. The work needs a model, an icon and a flair-gallery entry in the same batch as its row.
- **Confidence:** good
- **Depends, joins and notes:** The god The Standing Stones and the wonder Stonehenge have names near this one. The work itself is called a stone circle. Question 3 asks if Devotion may open unique improvements.

#### 04. The Healer-Priests (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** 0, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units heal twice as fast in your own territory.
- **Why:** Tiers 0 and I have no Military card of the deck's own, and every government seats a Military chair. Healing is the way this deck helps an army: the apostle heals, and The Host Restored heals at Tier IV. The card is useful at peace, against barbarians.
- **Arithmetic:** A rested unit heals 10 health a turn (`healing.perTurnIfRested`). With the card it heals 20 inside your borders. A Warrior at 40 health is back in three turns, not six. For a seat with three Warriors in age 1 that is about one more Warrior on the frontier (15 hammers), with nothing more to order. It adds no combat points; the regular Tier 0 line is +2 or +3.
- **Synergy:** **Raises:** units kept alive. **Reads:** your own territory. It works with the shared Rites of Passage and The Shrine Guards, and with Dominion's garrison cards. It works against The Martyrology, which pays for units lost.
- **Shape:** Small extension: a heal bonus read in `healUnits` (`src/sim/turn.ts`), where the rule `noHealAbroad` is read today.
- **Confidence:** fair
- **Depends, joins and notes:** A plain card for an empty chair. If you want none, the generic The Marchmen and Far Runners fill the chair.

#### 05. Consecrated Labor (buff)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** I, common, Economic
- **Now:** Cities with a Shrine may buy workers with faith.
- **Proposed:** Towns with a Shrine may buy settlers and workers with faith.
- **Why:** A worker costs 20 faith, so the card is a small permission today. Your picture of the deck says that faith allows wider empires. With settlers, the seat chooses each time between a new town now and the prophet later. That is the first real choice of how to spend faith, and it comes in age 1.
- **Arithmetic:** A settler is 28 hammers before its ladder: 56 faith, against 112 gold. A seat that makes 8 to 10 faith a turn at turn 40 buys a settler every six or seven turns if it buys nothing else, when a town makes about 5 production. That is about twice the rate at which a seat settles in age 1. Two things limit it: authority (a founded town costs 3) and the 120 faith for the prophet. A town buys one unit of each class a turn.
- **Synergy:** **Raises:** towns founded, improvements built, faith spent. **Reads:** Shrines. It feeds The Pilgrim Staff, The Book of Life, the shared The Votive Accounts, The Parishes and the shared The Hearth Fire (54). Fed by every faith card of Tier 0.
- **Shape:** Existing shape: `faithBuysUnits` with a class. One more row for the settler. Data only.
- **Confidence:** good on the shape, fair on the size
- **Depends, joins and notes:** If it is too fast, the price of a settler bought with faith can rise with each one bought. Question 4 asks about the size of this card and of change 06.

#### 06. The Gifts of the Faithful (rework)

- **Ruling:** your text. Your words: *"this seems too strong. Lets make it culture and faith buildings instead of all buildings."*
- **Tier, rarity, type:** I, common to uncommon, Economic
- **Now:** Religious buildings may be bought with faith.
- **Proposed:** Towns with a Shrine may buy buildings with faith. Not wonders.
- **Why:** `docs/decks/deck-design.md` says that spending faith in place of production "should be the core of the deck". Today four narrow cards each open one class (workers, religious buildings, melee units, and ordinary buildings in a Temple town), and the wide one is The Lay Brothers, a Tier II rare that a seat is offered in one game of three. This change makes one card of two, an uncommon at Tier I.
- **Arithmetic:** Faith buys a hammer for 2 (`faithPerHammer`); gold pays 4. Age 2: 30 faith a turn buys 15 hammers a turn in any Shrine town, when a town makes about 10. Age 3: 100 faith buys 50 hammers, against about 15 a town. Age 4: 300 faith buys 150, against about 35 a town. So the card is worth one town's production when drafted and four towns' late, if all the faith goes to buildings. A regular Tier I card pays 15 to 25. Faith spent here is not spent on rites, clergy or settlers.
- **Synergy:** **Raises:** buildings, faith spent, buildings bought with faith. **Reads:** Shrines. It feeds The Pilgrim Staff (a fourth comes back as culture), The Book of Life, The Offered Stones (34), The Fabric Fund (37), The Consecration Feast (33), the shared The Votive Accounts and the generic The Brick Kilns. Commerce's The Double Entry doubles the cards that pay on a purchase.
- **Shape:** Existing shape: `faithBuysBuildings` with the Shrine scope and no category. Data only.
- **Confidence:** good
- **Depends, joins and notes:** You removed The Monastic Builders (science buildings for faith) as "kind of boring". That card was one more narrow key. This is the whole door. The great person al-Khwārizmī's clause (science buildings for faith) becomes a part of it. Change 19 cuts The Lay Brothers.

#### 07. The Offering Chests (rework)

- **Ruling:** your text. Your words: *"age 1 seems too strong, how about age 2."*
- **Tier, rarity, type:** III to I, common to rare, Military to Economic
- **Now:** Military units bought with faith cost 30% less.
- **Proposed:** Everything you buy with faith costs 20% less.
- **Why:** You approved The Open Market for gold with the words "Wow thats crazy, lets add this". This is the same rule for the other bank. Today's card discounts a purchase that few seats can make, and it is the Devotion card of 3 hands in 10 at Tier III.
- **Arithmetic:** It reaches units, buildings, prophets, apostles and inquisitors. A prophet costs 96 and an apostle 72. With change 05 a settler costs 45. Age 2: a seat that spends 30 faith a turn saves 6. Age 3: 20. Age 4: 60. It is small when drafted, as The Open Market is, and the seat plans around it for the whole game. With the Commerce pass's change 118, discounts on one purchase add up to half at most: The Alms Box (a belief, 20%) makes 40%, and the Doctrine The Canons of the Holy Sepulchre (30%) makes 50%.
- **Synergy:** **Raises:** what each point of faith buys. **Reads:** every purchase with faith. Fed by 05, 06, the shared The Shrine Guards, Cathedral towns, and Joan of Arc's Sainte-Chapelle.
- **Shape:** Small extension: a `purchaseRider` in the faith bank that reaches every purchase. The Open Market asks for the same in the gold bank.
- **Confidence:** good
- **Depends, joins and notes:** A reading: "buy" means a purchase. A rite, a god and a redraw are not purchases, and the card does not change their prices. To confirm.

#### 08. The Rites Commonwealth (rework)

- **Ruling:** approved. Your words: *"this is extremely powerful but i like it."*
- **Tier, rarity, type:** I, rare, Civic
- **Now:** Cities keeping a rite demand 25% less population happiness.
- **Proposed:** A rite your capital starts is kept by every town you hold.
- **Why:** A rite is one click a town every ten turns, and five Tier I cards pay for those clicks. With this card the realm makes one decision every ten turns: which rite now? The rare of today gives about 2 happiness in each rite town, which is less than the common The Temple Storehouses gives.
- **Arithmetic:** Four towns in age 2. One price buys four rites: 20 faith for the first rite, and 5 more for each rite started. The Rite of the Harvest gives +1 food on about 5 hexes a town: +20 food. Omen Reading gives +1 science for each building: about +16 science. A regular Tier I card pays 15 to 25, and this one costs 4 to 8 faith a turn. The price rises one step for each town the rite reaches, as a prophet's rite over the realm does today, so with six towns each cast makes the next one cost 30 more. It limits itself. Every card that reads "a town keeping a rite" then pays in every town.
- **Synergy:** **Raises:** towns keeping a rite, rites started. **Reads:** the capital's rite. It feeds The Rogations and the shared The Votive Accounts (one step for each town), The Psalter (32), The Fetials (22), the Doctrine The Rites of Zhou, and the shared The Festival Calendar and The Priest-Astronomers.
- **Shape:** Small extension: the capital's rite goes down the realm's path, which exists for the prophet's rite and for the Doctrine Human Sacrifice (`empireRiteAt`, `sayRiteOverRealm`).
- **Confidence:** good on the idea, fair on the size
- **Depends, joins and notes:** Readings: the cast counts as a rite started in each town it reaches (the ruling of batch DV4 for the prophet's rite). A rite that acts at once is said by one town only, as the code has it today. A season that a card opens is carried too, so the whole realm may fast or keep the Sabbath. The Rogations has no cap, and it is the card to watch.

#### 09. The Chantries (new)

- **Ruling:** your text. Your words: *"that's too strong. How about chapel: +2 faith +2 culture, rites in this city last 50% longer"*
- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Chapel, a building you may buy with faith: +1 faith, and the rite its town keeps does not end.
- **Why:** You like a named building that a card opens. The Chapel's row is in the data, and no live card opens it (its charter was retired with the old pool). A chantry was a gift of money that paid for masses to be said for ever. The card turns a rite from a click every ten turns into a town's standing choice.
- **Arithmetic:** The Chapel is a medium building in column 2: 52 hammers, or 104 faith. After that the town pays no more rite prices. In the middle game the tenth to the thirtieth rite costs 65 to 165 faith, so a town saves 4 to 10 faith a turn. The town keeps what its rite gives (about 5 food, or 5 to 10 science) and every "keeping a rite" card, for good. The cost: a chantry town starts no new rites, so The Rogations, The Psalter and The Votive Accounts stop counting there.
- **Synergy:** **Raises:** towns keeping a rite, and faith buildings (one more in each town, for The Temple Workshops, The Prince-Bishops, the shared The Painted Chapels and the Cathedral School). **Reads:** rites.
- **Shape:** `unlocksBuilding` exists (the retired row `ritesCharter` used it). New: a mark on a building that stops its town's rite from ending. The row's `ritePays: 5` goes. Small extension.
- **Confidence:** fair
- **Depends, joins and notes:** To change its rite, a chantry town starts another at the ordinary price. With change 08, a chantry town keeps its own rite and takes the realm's rite only if it has a free place, which is the rule The Double Feast uses. To confirm. The first thing to test is the shared The Festival Calendar (+30% food and culture) in a town that keeps a rite for ever.

#### 10. The Octave (buff)

- **Ruling:** approved. Your words: *"Sure, lets make sure rite duration modifiers properly stack."*
- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Your rites last 50% longer.
- **Proposed:** Your rites last twice as long.
- **Why:** It is the one card that makes rites less of a chore, and at 50% it is hard to feel.
- **Arithmetic:** Ten turns become twenty. The clicks halve, and so does the faith spent on rites: about 3 to 8 faith a turn saved for each rite town in ages 2 and 3. The cards that count rites started gain half as often, which is a real cost. The wonder Chichen Itza gives +50% more, and the two add up to 25 turns.
- **Synergy:** **Raises:** the turns a rite lasts. **Reads:** rites. It works with 08 and The Double Feast, and against The Rogations and The Psalter.
- **Shape:** Existing shape: `effectAmplifier` on `riteDuration`, a number change.
- **Confidence:** good

#### 11. The Founding Vows (buff)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** I, uncommon, Wildcard (Commission)
- **Now:** Goal: start two rites. Reward: 100 faith, and 40 food in your capital.
- **Proposed:** Goal: start three rites. Reward: 250 faith.
- **Why:** The reward is under the size at which a lump is noticed. A vow should pay for the founding.
- **Arithmetic:** Three rites cost 20, 25 and 30 faith: 75. A Tier I lump registers at 200 to 400. 250 faith is a prophet (120) and most of an apostle, or four settlers under change 05.
- **Synergy:** **Raises:** faith held. **Reads:** rites started. Fed by 08 (one cast in a realm of three towns meets the goal) and The Fast.
- **Shape:** Existing shape: a number change on the commission. The food grant goes.
- **Confidence:** good

#### 12. The Temple Workshops (was The Wayside Shrines) (rework)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** I, common, Economic
- **Now:** The Wayside Shrines: Cities with a Shrine gain +2 food and +1 happiness.
- **Proposed:** Faith buildings give +1 food and +1 production each.
- **Why:** The Wayside Shrines and The Temple Storehouses do one job on two buildings. This card pays every faith building, on the building's own line, so that modifiers multiply it (your rule for the customs house). Production is the deck's gap. Here it comes from what the deck builds in any game. The model is your line for Magisterial's Civic Granaries: "culture buildings grant +1 food and +2 production each."
- **Arithmetic:** Age 2: a Shrine and a Temple in four towns: +8 food and +8 production. A regular Tier I card pays 15 to 25. Age 3: three buildings in eight towns: +24 and +24. Age 4, with a Chapel and a faith house: five buildings in twelve towns: +60 and +60. The old card's +1 happiness in a Shrine town is lost. The Temple Storehouses keeps +2 for each Temple.
- **Synergy:** **Raises:** food and production. **Reads:** faith buildings. Fed by 06, The Chantries (09), the shared The Hearth Fire (54), the faith houses of the follower beliefs, and the Doctrine The House of Worship. The Prince-Bishops (38) and the generic The Builders' Lodge double it. Harun al-Rashid's line sits on the same buildings.
- **Shape:** Existing shape: `pays` for each building of a category (the shared The Painted Chapels pays +3 culture for each faith building). Data only. The row `theWaysideShrines` keeps its id.
- **Confidence:** good
- **Depends, joins and notes:** The sheet's older word is "religious buildings". Your lines for the leaders say "faith buildings", and I use that.

#### 13. The Zealots (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** I, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 strength for every 10 faith you make each turn, at most +5.
- **Why:** Tier I has no Military card of the deck's own. This one needs no religion and no war building, and it pays in flat points. The model is Commerce's The Stipendium (+1 for every 50 gold, at most +8), which you approved.
- **Arithmetic:** Age 2: 30 faith a turn gives +3, the regular Tier I line. From 50 faith a turn it gives +5, which is 10% of a unit of age 3 (42 to 50). A strong Tier I line is +6.
- **Synergy:** **Raises:** strength. **Reads:** faith income. Fed by every faith card. It adds to the Doctrine The Paean, The Spiritual Host and Joan of Arc's The Maid.
- **Shape:** Small extension: strength scaled by an income (the Commerce pass lists it for The Stipendium), read from the faith rate.
- **Confidence:** good

#### 14. Temple Estates (rework)

- **Ruling:** approved. Your words: *"oh thats great, i like it"*
- **Tier, rarity, type:** II, common, Civic to Economic
- **Now:** Hexes beside a Holy Site gain +2 food and +2 faith.
- **Proposed:** A holy site gains +2 food and +2 production for each improved hex beside it.
- **Why:** A named thing that reads its neighbours. The pay is on the site, so one citizen collects all of it and every modifier of the hex multiplies it. Today six citizens must work six hexes to collect the same amount. It also makes the place of a holy site a decision on the map.
- **Arithmetic:** Four improved hexes beside the site: +8 food and +8 production on one hex. Six: +12 and +12. With one site that is 16 to 24, and a regular Tier II card pays 35 to 60, so the card wants a second site (change 17). The Doctrine The Two Sanctuaries doubles it.
- **Synergy:** **Raises:** food and production on a great person's work. **Reads:** improved hexes beside a holy site. Fed by any worker, by Expansionist, and by The Anchorites and The Abbeys. Justinian adds +5 production on the same hex.
- **Shape:** The yield "for each hex beside it that…" of the Expansionist pass, on a card's hex row (that pass's The Mountain Sluices is the model). The type changes from Civic to Economic.
- **Confidence:** good

#### 15. The Saints' Fields (cut)

- **Ruling:** cut. Your words: *"Ok sure"*
- **Tier, rarity, type:** II, common, Economic
- **Now:** Holy Sites gain +5 food and +8 gold.
- **Proposed:** Cut. The row is retired.
- **Why:** All three commons of Tier II pay a holy site, so 6 Devotion hands in 10 show a holy-site card to a seat that has one site. Change 14 pays the site its food. The gold was there for Mansa Musa, and The Hajj pays him gold already.
- **Arithmetic:** It pays 9 a turn at the half rate for gold, on one hex. A regular Tier II card pays 35 to 60.
- **Synergy:** The holy places keep Temple Estates (14), The Old Holy Places (16), The Anchorites (17), The Abbeys (18) and The Pilgrim Towns (31).
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

#### 16. The Old Holy Places (rework)

- **Ruling:** your text. Your words: *"i like this, lets remove the cap"*
- **Tier, rarity, type:** II, common to uncommon, Civic
- **Now:** Holy Sites gain +3 faith and +3 culture.
- **Proposed:** Holy sites gain +1 faith and +1 culture for every ten turns they have stood, at most +10 of each.
- **Why:** Your picture of the deck is an early investment that pays back late. A holy place grows greater with age. The card takes over the job of The Apostolic Succession (43), and it pays on the site, where modifiers multiply it.
- **Arithmetic:** A site raised on turn 60 pays +1 and +1 on turn 70, +7 and +7 when Tier III opens (turn 133), and +10 and +10 from turn 160. Two more sites raised on turn 90 bring the total to 24 faith and 24 culture on turn 160. Today the card pays 3 and 3 a site. It is small when drafted, and it is the theme's scaler.
- **Synergy:** **Raises:** faith and culture on the site. **Reads:** the age of each holy site. The Doctrine The Two Sanctuaries doubles it. Fed by The Calling (01), which founds sooner.
- **Shape:** The tile test `standingSince` exists (Expansionist's Dark Earth). A hex row that counts the tens of turns a work has stood is a small extension.
- **Confidence:** fair

#### 17. The Anchorites (move)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, uncommon to common, Civic
- **Now:** Uncommon: Your prophets raise a further holy site for one charge instead of two.
- **Proposed:** Common, the same text.
- **Why:** Seven Orders, three shared cards and two Doctrines pay a holy site, and a seat has one. A further site costs a whole prophet today: 180 faith for the second prophet and 240 for the third. The card that supplies sites must be seen.
- **Arithmetic:** As a common it is the Devotion card of 1 hand in 10, against 1 in 40 today. One prophet then raises two sites, at 90 faith each. With The Second Prophet it raises three.
- **Synergy:** **Raises:** holy sites. It feeds 14, 16 and 31, the shared Pilgrim Markets, the Doctrines The Canons of the Holy Sepulchre and The Two Sanctuaries, Mansa Musa's The Hajj and Justinian's One Faith, One Empire.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good
- **Depends, joins and notes:** Justinian gains +2 happiness for each holy site, so this is also a happiness card for him. To watch.

#### 18. The Abbeys (move)

- **Ruling:** cut. Your words: *"lets cut this, i'm realizing the ability to purchase prophets with faith already give the deck reliable great works."*
- **Tier, rarity, type:** III to II, rare, Civic
- **Now:** Tier III: Your apostles may raise holy sites, as prophets do.
- **Proposed:** Tier II, the same text.
- **Why:** A card that supplies a theme's material belongs early. Apostles come with Theology in age 3, and Tier II runs through most of age 3. Tier III has seven rares today, so the card is offered in about one game of nine.
- **Arithmetic:** An apostle has two charges and costs 90 faith, and 40 more each time. A holy site costs two charges, or one with The Anchorites. So a site costs 90 to 130 faith, or 45 to 65 with both cards.
- **Synergy:** **Raises:** holy sites. It feeds the same cards as change 17.
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

#### 19. The Lay Brothers (cut)

- **Ruling:** cut. Your words: *"great"*
- **Tier, rarity, type:** II, rare, Economic
- **Now:** Cities with a Temple may buy ordinary buildings with faith, at the faith rate.
- **Proposed:** Cut. The row is retired. The Gifts of the Faithful (06) does its job from Tier I.
- **Why:** It is the same permission as change 06, one tier later, behind a Temple and a rare.
- **Arithmetic:** Each of the two rares of Tier II is the Devotion card of 1 hand in 20. A seat sees eight or nine Devotion cards in the tier, so it is offered this one in about one game of three.
- **Synergy:** Nothing is lost: every card it fed is fed by 06.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** It depends on change 06. If you reject 06, keep this card and make it an uncommon.

#### 20. Mission Houses (cut)

- **Ruling:** your text. Your words: *"i think the deck needs modifiers for spreading religion. how about your proclomations reach 50% farther and are 50% more effective in foreign cities."*
- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Your proclamations press 30% harder.
- **Proposed:** Cut. The row is retired.
- **Why:** The game builds it as +18 on a lump of 60. Nothing on the screen shows the difference, no card counts it, and it asks the player to walk an apostle to use it.
- **Arithmetic:** A proclamation of 60 turns six citizens (`pressurePerConvert` 10). With the card it turns seven or eight.
- **Synergy:** The spread keeps The Second Prophet, The Mission, Pentecost and The Mass Baptisms.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

#### 21. The Confessors (cut)

- **Ruling:** cut. Your words: *"sure"*
- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Towns that follow your religion share their sight with you.
- **Proposed:** Cut. The row is retired. The Fetials (22) takes its chair.
- **Why:** No card reads sight. A seat that has converted a neighbour's towns has met that neighbour and seen the towns. It is one of the deck's five Military cards, and it helps no fight.
- **Arithmetic:** It pays nothing a turn.
- **Synergy:** Nothing reads it.
- **Shape:** No shape. `retired: true`. The rule `followersShareSight` stays for saves.
- **Confidence:** good

#### 22. The Fetials (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Not in the deck.
- **Proposed:** Military units you gain in a town keeping a rite start as Veterans.
- **Why:** It ties the rites to the army. The fetials were the Roman priests whose rite opened a war. The model is Commerce's The Ten Thousand (units bought with gold start as Veterans), which you approved.
- **Arithmetic:** A Veteran has +3 strength (`ranks.ladder.veteran`) and is on the way to Elite (+6). The regular Tier II line is +5. With change 08 or 09 every town keeps a rite, so every unit gained starts as a Veteran.
- **Synergy:** **Raises:** ranks. **Reads:** towns keeping a rite, and units gained. A Veteran start earns a rank (your ruling in the Dominion pass: "yes"), so Dominion's cards for a rank earned pay. Fed by 08, 09, the shared The Shrine Guards and The Muster of the Fields.
- **Shape:** Small extension: the rank stamp (`unitStamp`) narrowed by a town scope (`keepingRite`). The Ten Thousand asks for the same stamp narrowed to gold purchases.
- **Confidence:** good

#### 23. Commission: The State Church (rework)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, uncommon, Wildcard (Commission)
- **Now:** Goal: hold six towns, all devout. Reward: devout towns cost 1 less authority.
- **Proposed:** Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns.
- **Why:** Your ruling in the Commerce pass: "I don't like too many cards that lower authority on a per-city level", and "Authority needs to be a limiting factor for growth." The new reward uses your own line for The Market Writ. The deck also has two cards for one job today: this one, and The Caliphate.
- **Arithmetic:** Six devout towns: +3 authority and +3 happiness (today 6 authority). Twelve: +6 and +6 (today 12). A founded town costs 3 authority, so the reward pays for one town in six.
- **Synergy:** **Raises:** authority and happiness. **Reads:** devout towns. Fed by The Parishes and the tide.
- **Shape:** Existing shapes: `authority` and `happiness` by a count of towns under the scope `ownersFaith`, as a commission's lasting reward. Data only.
- **Confidence:** good
- **Depends, joins and notes:** Question 2 asks about The Caliphate, which this pass leaves as it is.

#### 24. The Settled Faith (move)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, rare to uncommon, Civic
- **Now:** Rare: Devout towns gain +15% science and culture.
- **Proposed:** Uncommon, the same text.
- **Why:** A plain percentage is not a rare. You approved the same move for Commerce's Private Patronage.
- **Arithmetic:** A seat of age 3 makes about 106 science and 83 culture: +28 if every town is devout. A regular Tier II card pays 35 to 60, so it is a little under when drafted, and it grows with every flat card.
- **Synergy:** **Raises:** science and culture. **Reads:** devout towns, and every flat science and culture line in them.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

#### 25. Tier II rarities (move)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, three cards, uncommon to common
- **Now:** The Deaconries, The Parishes and The Spiritual Host are uncommons. Tier II holds 3 commons, 12 uncommons and 2 rares.
- **Proposed:** The Deaconries, The Parishes and The Spiritual Host become commons. With the other changes Tier II holds 6 commons, 11 uncommons and 3 rares.
- **Why:** Each of the three is a plain card that pays any seat with a religion. Today each uncommon of Tier II is seen in 1 hand of 40, and each rare in 1 of 20, so the rares are seen twice as often as the uncommons.
- **Arithmetic:** Today: a common 20% of hands, an uncommon 2.5%, a rare 5%. After the pass: a common 10%, an uncommon 2.7%, a rare 3.3%.
- **Synergy:** The sixth common is The Temple Herds (28), which needs no religion.
- **Shape:** No shape change. Three rarities change.
- **Confidence:** good

#### 26. The Cliff Monasteries (new)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Workers may build one cliff monastery in each town, on a hex beside a mountain: +3 faith and +3 science, and +1 of each more for each mountain beside it.
- **Why:** A second sacred work for the map, and it needs no religion. Monks built where the rock was: Meteora, Sumela, the Tiger's Nest. It gives the deck a reason to settle under mountains, where the shared The Holy Spring already pays.
- **Arithmetic:** It yields 3 faith and 3 science. Mountains stand in ranges, so one or two more are beside it: 8 to 10 on one hex, on top of the ground's own yield. 63% of capitals have land beside a mountain (the Expansionist pass's count of 48 starts). A seat of six towns has the ground in about four of them: 32 to 40 a turn for four worker charges and no chair. A regular Tier II card pays 35 to 60.
- **Synergy:** **Raises:** faith, science, and unique improvements. **Reads:** mountains. It works with the shared The Holy Spring, the god Star Readers, Expansionist's high-country cards, The Reclaimed Lands and The Cadastre (+3 science), and Harun al-Rashid's science.
- **Shape:** New improvement row `cliffMonastery`: beside a mountain (the terraces' row has `mountainFoot`), one in each town. The yield for each mountain beside it exists for the Doctrine The High Towns. It needs a model, an icon and a flair-gallery entry.
- **Confidence:** good
- **Depends, joins and notes:** It can stand on the ground that Pachacuti's terraces use. He holds Expansionist and Commerce, so the two do not meet, except for Ibn Battuta.

#### 27. The Saturnalia (new)

- **Ruling:** cut. Your words: *"Hmm, the drawback is too high for this, and it doesn't fit the play patterns i like. lets cut. I like the idea of additional rites though."*
- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Saturnalia: for ten turns a town's citizens demand half as much happiness, and the town makes no gold.
- **Why:** `docs/decks/deck-design.md` asks for rites with real trade-offs. Your picture says that faith lets large towns stay happy. In the Saturnalia the shops shut and the masters served the slaves. The rite gives the seat a tool for the turns when happiness binds, at a price it can see.
- **Arithmetic:** A town of 12 citizens demands 12 happiness. The rite gives back 6 for ten turns, for one rite price (45 to 100 faith in ages 2 and 3) and the town's gold (5 to 10 a turn). Under change 08 the whole realm keeps it: eight towns of 10 give +40 happiness and no town makes gold for ten turns. That is two tiers of the happiness bonus (+10% at 5 spare, +20% at 10), and it costs 50 to 100 gold a turn while upkeep is still due.
- **Synergy:** **Raises:** happiness, for a season. **Reads:** rites. It feeds every card that counts a rite started or a town keeping a rite. It works against the shared The Tithe.
- **Shape:** `RiteDef.byCard` exists. The rite's effects are `rulePercent` on `happinessDemand` (the old Rites Commonwealth's shape) and a percentage on the town's gold. Data only, I think.
- **Confidence:** fair

#### 28. The Temple Herds (new)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** II, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Pastures, camps and plantations gain +1 food and +1 production for each faith building in their town, at most +3 of each.
- **Why:** `docs/decks/deck-design.md` gives Devotion the pastures, camps and plantations. One card reads them today, at Tier 0. This card ties them to the faith buildings: the temple's flocks and gardens. It is also a Tier II common that needs no religion.
- **Arithmetic:** A town has one or two such hexes. With a Shrine and a Temple each gains +2 and +2. Six towns and nine hexes: +18 food and +18 production. A regular Tier II card pays 35 to 60. With a third building: +27 and +27.
- **Synergy:** **Raises:** food and production, on the hexes that a stone circle counts (03). **Reads:** pastures, camps and plantations, and faith buildings. Fed by Lay Offerings, Dominion's pastures, Commerce's plantations (The Latifundia doubles a luxury hex) and 06.
- **Shape:** Small extension: a hex row that counts the buildings of its town. The Commerce pass asks for it for The Patrons' Quarter.
- **Confidence:** good

#### 29. Pentecost (move)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** III to II, rare, Civic
- **Now:** Tier III: When a foreign town turns to your religion, your religion presses every town within four hexes of it.
- **Proposed:** Tier II, the same text.
- **Why:** It supplies the spread, and supply belongs early. Tier III has seven rares today.
- **Arithmetic:** Each rare of Tier III is the Devotion card of 1.4% of hands, so Pentecost is offered in about one game of nine. At Tier II, with three rares, it is 3.3% of hands: about one game in four.
- **Synergy:** **Raises:** towns that follow your religion. It feeds The Living Hymnal, The Mission, The Mass Baptisms, The Pilgrim Towns (31) and The Defenders of the Faith (39).
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

#### 30. The Double Feast (move)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** IV to II, rare, Civic
- **Now:** Tier IV: Your towns may keep two rites at once.
- **Proposed:** Tier II, the same text.
- **Why:** It is the rule-breaker of the rites, and it waits at Tier IV, which half the seats reach, as one of nine rares. A seat should be able to build around it.
- **Arithmetic:** Two rites in a town: the Harvest and Omen Reading together give about +5 food and +8 science. Under change 08 the capital starts two rites for the realm. The price rises twice as fast. The shared The Festival Calendar reads whether a town keeps a rite, not how many, so it does not double.
- **Synergy:** **Raises:** rites started, and what a rite town makes. Fed by 08, 09, The Octave, The Fast, The Sabbath Laws and The Saturnalia (27).
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

#### 31. The Pilgrim Towns (rework)

- **Ruling:** approved. Your words: *"wow thats strong, great"*
- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Towns working a holy site gain +20% culture.
- **Proposed:** Holy sites gain +1 production and +1 culture for each town that follows your religion.
- **Why:** It ties the spread of the religion to the holy places: the pilgrims come from every town that follows. Production reaches the deck through its faith, which is how the deck is meant to cover its gap. Today the card pays about 6 culture.
- **Arithmetic:** Ten towns follow at Tier III (eight of yours and two abroad): +10 and +10 on each site. Two sites: 40. Twenty towns and three sites late: 120. A regular Tier III card pays 60 to 120. The Doctrine The Two Sanctuaries doubles it. The belief Ecclesia pays +1 faith on the same count.
- **Synergy:** **Raises:** production and culture on the site. **Reads:** towns that follow your religion, and holy sites. Fed by the tide, Pentecost, The Parishes, The Anchorites and The Abbeys.
- **Shape:** `pays` on a hex by the count `followingCities`. The belief Ecclesia does this for a belief; for a card's hex row it may be a small extension.
- **Confidence:** good

#### 32. The Psalter (buff)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Each rite started in a devout town grants science and culture equal to five times the town's population.
- **Proposed:** Each rite a town starts grants science and culture equal to five times the town's population.
- **Why:** The card has two conditions. Without "devout" it pays a seat with no religion, and the text is shorter.
- **Arithmetic:** A town of 10 citizens: 50 science and 50 culture for each rite. Eight towns under change 08: 400 and 400 every ten turns, which is 80 a turn. A regular Tier III card pays 60 to 120. The Octave halves how often it pays.
- **Synergy:** **Raises:** science and culture. **Reads:** rites started, and citizens. Fed by 08, The Double Feast and The Naming Feasts (40).
- **Shape:** Existing shape: remove `inTown` from the two riders.
- **Confidence:** good

#### 33. The Consecration Feast (rework)

- **Ruling:** your text. Your words: *"Production feels too strong, lets have it give food and culture?"*
- **Tier, rarity, type:** III, uncommon, Civic to Economic
- **Now:** Finishing a Cathedral grants science and culture equal to twenty times the town's population.
- **Proposed:** Finishing a faith building grants its town production equal to ten times its population.
- **Why:** Twelve cards of the deck pay "science and culture" as a pair, and one building is a narrow moment. A consecration that pays production starts the town's next building. A building bought with faith counts, because a purchase finishes the thing.
- **Arithmetic:** A town of 10 that buys a Chapel for 104 faith gains 100 production. A Cathedral in a town of 14 gives 140. A seat finishes about ten faith buildings in the tier (Cathedrals, Chapels, faith houses, and the Shrines and Temples of new towns): about 1,200 production over 30 turns, which is 40 a turn. That is under the regular bar of 60 to 120, and it lands in lumps where the player chooses.
- **Synergy:** **Raises:** production. **Reads:** faith buildings finished, and citizens. Fed by 06, 09, the shared The Hearth Fire, and the Doctrine The House of Worship (60).
- **Shape:** Existing shape: `windfallRider` on `buildingCompletion`, with production from the town's population. The rider names one building today; a category is a small extension.
- **Confidence:** fair

#### 34. The Offered Stones (rework)

- **Ruling:** sent back. Your words: *"this needs to be stronger probably, there's not too many ways to buy buildings iwth faith currently."*
- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Buildings you bought with faith give +2 culture each.
- **Proposed:** +2 culture for each building you have bought with faith.
- **Why:** The card counts the bought buildings town by town. You cut the shared The Waqf because "the player must remember which buildings they bought". The Commerce pass changed Bought and Paid For in the same way.
- **Arithmetic:** With change 06 a seat buys about two buildings every three turns in age 3. 30 bought when Tier III opens: +60 culture. 60 late: +120. A regular Tier III card pays 60 to 120.
- **Synergy:** **Raises:** culture. **Reads:** buildings bought with faith, this game. Fed by 06 and 07.
- **Shape:** Small extension: buildings bought, counted for the whole empire, in the faith bank. The Commerce pass asks for the same in the gold bank. The seated card prints its total.
- **Confidence:** good

#### 35. The Holy Inquisition (move)

- **Ruling:** your text. Your words: *"lets rework: +1 authority in devout towns. -80% to foreign religion's pressure on your cities (this includes proclamations)."*
- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Uncommon: +35% faith.
- **Proposed:** Common, the same text.
- **Why:** A plain percentage of the deck's own yield is a common. Tier III has two commons today, and each is the Devotion card of 3 hands in 10.
- **Arithmetic:** 100 faith a turn in age 3: +35. 300 in age 4: +105. At the half rate that is 17 and 52.
- **Synergy:** **Raises:** faith. **Reads:** every flat faith line. It feeds The Zealots, The Learned Clergy and The Poor Tables (48).
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

#### 36. The Sacred Bequests (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** III, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Spending faith grants science equal to a fourth of it.
- **Why:** It is the partner of The Pilgrim Staff. Commerce has the same pair for gold (Civic Receipts and The Endowment). It gives the purse a plain common at Tier III.
- **Arithmetic:** 100 faith spent a turn in age 3: +25 science. 300 in age 4: +75. With The Pilgrim Staff, half of the faith comes back as culture and science. Every way to spend counts, by your ruling of 2026-11-11 for the Staff: the gods, a rite, clergy, a purchase, and faith given to a build.
- **Synergy:** **Raises:** science. **Reads:** faith spent. Fed by 05, 06, the rites, The Year of Release (47). Commerce's The Double Entry does not double it, because it pays on any spending and not only on a purchase. To confirm.
- **Shape:** Existing shape: `windfallRider` on `faithSpent`. Data only.
- **Confidence:** good

#### 37. The Fabric Fund (new)

- **Ruling:** approved. Your words: *"Sure"*
- **Tier, rarity, type:** III, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Buying a building with faith grants its town production equal to a quarter of the faith paid.
- **Why:** Production through the purse. The model is the shared The Army Contractors ("ok sure"). The fabric fund was the account that paid for a cathedral's building.
- **Arithmetic:** A building of 300 hammers costs 600 faith and gives its town 150 production. So faith buys a hammer for about 1.3, not 2. A seat that spends 100 faith a turn on buildings gains +25 production. A regular Tier III card pays 60 to 120, so it is small, and it lands in the town that the player chose.
- **Synergy:** **Raises:** production. **Reads:** buildings bought with faith. Fed by 06 and the Cathedral's faith bank. Commerce's The Double Entry doubles it.
- **Shape:** `windfallRider` on `purchase`, in the faith bank, for buildings, with production from the price. The Army Contractors needs the same rider for gold and units.
- **Confidence:** good
- **Depends, joins and notes:** The pass of 2026-10-23 declined a card of this name. That card was a discount; this one is not.

#### 38. The Prince-Bishops (new)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Your faith buildings yield twice as much.
- **Why:** It is the multiply card of the temple economy. The model is Expansionist's The Water Boards ("Your public works yield twice as much"), which you called "great".
- **Arithmetic:** A town with a Shrine (1 faith), a Temple (2) and a Cathedral (2 faith and 2 culture) gains +5 faith and +2 culture. Ten towns: +70. That is the floor, and a regular Tier III card pays 60 to 120. What cards put on a building is part of the building (batch R2b), so it doubles too: The Temple Workshops (+3 food and +3 production a town), First Rites (+2 faith), The Temple Storehouses (+2 food), The Cathedral Works (+8 science) and the shared The Painted Chapels (+9 culture). That is about 30 more a town: 300 a turn in a seat that built the theme.
- **Synergy:** **Raises:** everything a faith building makes. **Reads:** faith buildings and the cards on them. Fed by 06, 09, 12, the Doctrine The House of Worship, and the great people Bezalel and Hildegard of Bingen.
- **Shape:** `buildingYieldPercent` with a category. The Water Boards asks for the same selector for public works.
- **Confidence:** good on the idea, fair on the size
- **Depends, joins and notes:** A reading: happiness is not a yield, and the card does not double it. To confirm.

#### 39. The Defenders of the Faith (new)

- **Ruling:** your text. Your words: *"how about +1 strength for every 3 towns, no cap."*
- **Tier, rarity, type:** III, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 strength for every two towns that follow your religion, at most +8.
- **Why:** The Offering Chests leaves Tier III, and the tier needs a Military card that takes a chair. This one pays the spread in flat points, on any ground.
- **Arithmetic:** Ten towns follow: +5. Sixteen: +8. The regular Tier III line is +6 and a strong one is +12. The Spiritual Host pays +4 only on the faith's own ground.
- **Synergy:** **Raises:** strength. **Reads:** towns that follow your religion. Fed by the tide, Pentecost and the Doctrine The Ribats.
- **Shape:** Existing shape: `combatLine` by a count (the Doctrine The Paean counts beliefs), with `followingCities`, one for every two, and a cap. Data only, I think.
- **Confidence:** good
- **Depends, joins and notes:** A holy-war seat can add The Zealots (+5), The Spiritual Host (+4), this card (+8) and the Doctrine The Paean (up to +9). The chairs limit it: a government seats two to four Military cards.

#### 40. The Naming Feasts (new)

- **Ruling:** your text. Your words: *"let's buff this to two citizens."*
- **Tier, rarity, type:** III, uncommon, Economic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Rite of Naming: the town gains a citizen at once, and may start no other rite for ten turns.
- **Why:** Faith buys people. Your picture says that the deck lets large towns stay large and happy. You asked on 2026-10-12 for rites that pay out at once. This one uses the rite menu, so it adds no new button.
- **Arithmetic:** A citizen in a town of 12 costs 142 food, and in a town of 16 it costs 203. The rite price at Tier III is 100 to 200 faith (the 16th to the 36th rite). Each Naming is a rite started, so the next rite costs 5 more. A seat of eight towns that names in each every ten turns raises the price by 40 a round. It limits itself.
- **Synergy:** **Raises:** citizens, and rites started. It feeds The Psalter (50 science and 50 culture in a town of 10), The Royal Cult, The Deaconries, and Jayavarman VII's The Great City. With Expansionist: a levy spends a citizen for production equal to the food it took to grow, so 150 faith becomes about 170 production. Both cards read citizens, and neither names the other.
- **Shape:** A new kind of `atOnce`: a citizen. `RiteDef.byCard` exists, and the rite's ten turns are its wait (the Restoring of the Host works this way). Small extension.
- **Confidence:** fair
- **Depends, joins and notes:** Readings: it counts as a rite started. The code does not count a rite that acts at once today, so this is a change for this rite. One town says it, never the realm. Another price is possible: faith equal to the food the town still needs.

#### 41. The Conversion of Kings (buff)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** III, rare, Wildcard (Commission)
- **Now:** Goal: convert a rival's capital. Reward: a Prophet and 500 culture.
- **Proposed:** Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture.
- **Why:** The goal is the hardest act of the spread, and the reward is under the size at which a Tier III lump is noticed.
- **Arithmetic:** A Tier III lump registers at 1,000. The 18th draft costs 606 culture, so 1,000 is one and a half drafts. The prophet is worth 240 to 360 faith by then.
- **Synergy:** **Raises:** culture, and a prophet for a belief or a holy site. **Reads:** a rival's capital that follows your religion.
- **Shape:** Existing shape: a number change on the commission.
- **Confidence:** good

#### 42. The Seven Pilgrimages (cut)

- **Ruling:** cut. Your words: *"sure"*
- **Tier, rarity, type:** IV, uncommon, Civic
- **Now:** A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each.
- **Proposed:** Cut. The row is retired.
- **Why:** With two sites it pays +2 and +2 in two towns: 8 a turn, at Tier IV. It is the only uncommon of the tier, so it is the Devotion card of 3 hands in 4 until the seat takes it. The Pilgrim Towns (31) is the pay-off of the holy places.
- **Arithmetic:** At its cap, five sites and five towns: 50 a turn. A regular card of the tier before it pays 60 to 120.
- **Synergy:** The holy places keep 14, 16, 17, 18, 31 and the Doctrine The Two Sanctuaries.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

#### 43. The Apostolic Succession (cut)

- **Ruling:** cut. Your words: *"sure"*
- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each.
- **Proposed:** Cut. The row is retired. The Old Holy Places (16) does its job on the site.
- **Why:** It is a rare that pays at most 48 a turn, eighty turns after the founding. Change 16 counts the same years on the holy site, where modifiers multiply the pay.
- **Arithmetic:** A religion founded on turn 60 pays +24 and +24 from turn 140. The common The Cathedral Works pays +64 science in eight towns.
- **Synergy:** The Book of Life stays as the deck's capped count of this game.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

#### 44. The Treasury of Merit (cut)

- **Ruling:** cut. Your words: *"sure"*
- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap.
- **Proposed:** Cut. The row is retired.
- **Why:** It pays the seat to hold faith. Every other card of the purse pays the seat to spend it. On 2026-11-10 the Commerce cards that read the treasury changed to read income for the same reason. The Learned Clergy reads faith income.
- **Arithmetic:** 1,000 faith held: +20 and +20. The Learned Clergy pays +60 and +60 at 300 faith a turn.
- **Synergy:** Nothing else in the deck reads faith held.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

#### 45. Tier IV rarities (move)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** IV, four cards
- **Now:** Tier IV holds 9 rares, 1 uncommon and no common. The Chapter Houses, The Tithe of Nations, The Host Restored and The Last Offering are rares.
- **Proposed:** The Chapter Houses becomes a common. The Tithe of Nations, The Host Restored and The Last Offering become uncommons. With the other changes Tier IV holds 3 commons, 4 uncommons and 3 rares.
- **Why:** Each of the four is a count or a permission, and none changes a rule. Today a seat is shown The Seven Pilgrimages in three hands of four, and each rare in 1 hand of 36.
- **Arithmetic:** Today: the uncommon 75% of hands, a rare 2.8%. After the pass: a common 20%, an uncommon 7.5%, a rare 3.3%.
- **Synergy:** The three rares are The Great Commission, The Interdict and The City of God (50).
- **Shape:** No shape change. Four rarities change.
- **Confidence:** good

#### 46. The Great Commission (buff)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** IV, rare, Wildcard (Commission)
- **Now:** Goal: more than half the world's cities follow your religion. Reward: devout towns gain +3 faith and +3 culture.
- **Proposed:** Goal: more than half the world's cities follow your religion. Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture.
- **Why:** It has the hardest goal in the deck, and the reward pays 72 a turn in twelve devout towns. The reward should count the world that the seat converted.
- **Arithmetic:** More than half of the towns of a six-seat game is about 30 of 55: +90 science and +90 culture. A Tier IV headline card pays 200 or more.
- **Synergy:** **Raises:** science and culture. **Reads:** towns that follow your religion. Fed by Pentecost, the tide and the apostles.
- **Shape:** Existing shape: `pays` for the empire by the count `followingCities`, as a commission's lasting reward. Data only.
- **Confidence:** good

#### 47. The Year of Release (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** IV, uncommon, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: gain faith equal to ten turns of your faith.
- **Why:** The deck has no boon after Tier 0. Your picture says that faith should feel like a win condition. This lump goes into the Magnum Opus, an army, or a great person, on the turn it is drafted. The model is the generic The Learned Embassy (eight turns of science).
- **Arithmetic:** 300 faith a turn gives 3,000 faith. That is 1,500 hammers at 2 faith a hammer, placed anywhere at once, or 2,250 in the holy city with The Last Offering. A Tier IV lump registers at 1,000 or more. As it is spent, The Pilgrim Staff and The Sacred Bequests pay 750 culture and 750 science.
- **Synergy:** **Raises:** faith held, then faith spent. It feeds The Book of Life, the Doctrine The Saint Peter's Indulgence and every card of the purse.
- **Shape:** Existing shape: a boon that grants turns of a yield.
- **Confidence:** good
- **Depends, joins and notes:** The jubilee was the year of release, when debts were forgiven. The old pool has a retired card called The Jubilee, so this one has another name.

#### 48. The Poor Tables (new)

- **Ruling:** sent back. Your words: *"probably don't need food this late in the game, let's modify"*
- **Tier, rarity, type:** IV, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Towns gain food equal to a quarter of their faith.
- **Why:** Tier IV has no common and one Economic card today. Food from faith keeps the large towns growing, which is your picture of the deck.
- **Arithmetic:** A town makes about 25 faith at Tier IV: +6 food. Twelve towns: +75 food. With The Prince-Bishops a town makes more faith, and more food.
- **Synergy:** **Raises:** food, and through it citizens. **Reads:** the faith of each town. Fed by every faith card.
- **Shape:** Existing shape: `pays` in a town as a share of its faith (the shared The Tithe and The Cloister). Data only.
- **Confidence:** fair
- **Depends, joins and notes:** It reads faith income, the deck's main quantity. I kept it because the tier needs a plain Economic common.

#### 49. The Soldiers of God (new)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** IV, common, Military
- **Now:** Not in the deck.
- **Proposed:** Military units you buy with faith gain +6 strength.
- **Why:** It ties the purse to the army, in flat points. Tier IV has one Military card today.
- **Arithmetic:** The regular Tier IV line is +6. A Knight of 445 hammers costs 890 faith, so a seat that makes 300 faith a turn buys one every three turns. A seat buys soldiers with faith in a Cathedral town, in a Shrine town with the shared The Shrine Guards, or as Joan of Arc.
- **Synergy:** **Raises:** strength. **Reads:** units bought with faith. The shared Professional Soldiers (+3 for a unit you purchase) adds to it. Fed by 07 and The Year of Release (47).
- **Shape:** The stamp of Professional Soldiers, narrowed to the faith bank. Small extension.
- **Confidence:** good

#### 50. The City of God (new)

- **Ruling:** cut. Your words: *"this feels not very impactful, you tend to build cities around your holy city. cut"*
- **Tier, rarity, type:** IV, rare, Economic
- **Now:** Not in the deck.
- **Proposed:** Your holy city works hexes one ring further out.
- **Why:** Your picture of the deck names Constantinople. This card makes one great city. The model is Commerce's The Sea Lords (coastal towns work water one ring further), which you called interesting.
- **Arithmetic:** The fourth ring has 24 hexes. A holy city of 25 citizens takes the best eight or ten of them, each worth 2 to 4 more than the worst hex it works today, and it can reach a holy site, a stone circle or a wonder's ground that lay outside. About 40 to 80 a turn. The Doctrine The Patrimony of Peter removes the city's happiness demand, so the city can grow into the ring.
- **Synergy:** **Raises:** the hexes one town works. **Reads:** the holy city. Fed by The Naming Feasts (40), The Poor Tables (48) and the Doctrine The Imarets.
- **Shape:** `worksBeyond` under the scope `holyCity`. The Sea Lords asks for the same effect on water. A town claims hexes out to three today (`claimRadius`), so the builder must check that the city can own the fourth ring.
- **Confidence:** fair

#### 51. The Sacred Host (shared with Dominion) (rework)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** I, rare to uncommon, Military
- **Now:** Rare: Kills grant 15 faith.
- **Proposed:** Uncommon: Kills grant faith equal to the strength of the unit you killed.
- **Why:** 15 faith is fixed in age 1 terms. It is a rare that pays less than the common Rites of Passage (12 faith for each military unit gained).
- **Arithmetic:** A Warrior of age 1 gives 20. A Legionary of age 3 gives about 45. A Knight of age 4 gives 70 or more. The god Rites of Blood and Joan of Arc's The Voices pay the same amount, and the three add up.
- **Synergy:** **Raises:** faith. **Reads:** kills, which Dominion makes. It feeds The Zealots and every purchase with faith.
- **Shape:** Existing shape: the god's own row (`windfallRider` on `kill`, faith from the strength).
- **Confidence:** good
- **Depends, joins and notes:** The Dominion pass says its 22 shared cards do not change. This change and the next two need a line on that sheet. Question 5.

#### 52. The Oriflamme (shared with Dominion) (cut)

- **Ruling:** not adopted. Your words: *"lets keep this, i like the idea of a player marching apostles with their army, and i think +4 is significant."*
- **Tier, rarity, type:** I, uncommon, Military
- **Now:** Military units beside one of your religious units gain +4 strength.
- **Proposed:** Cut. The row is retired.
- **Why:** It asks the player to walk a prophet or an apostle beside the army every turn. A religious unit is a civilian, and an enemy captures it. It is a chore with a risk, for +4.
- **Arithmetic:** The regular Tier I line is +3. The Zealots (13) gives up to +5 with no unit to move.
- **Synergy:** The Garrison Chapels (53) is the pair's new card, at another tier.
- **Shape:** No shape. `retired: true`.
- **Confidence:** fair
- **Depends, joins and notes:** The pair grid in `docs/decks/deck-design.md` lists relics carried into battle. If you like the picture, the card can stay.

#### 53. The Garrison Chapels (shared with Dominion) (new)

- **Ruling:** cut. Your words: *"Not very strong, lets cut. Lets add a card in it's place: proclamations heal all units within 3 hexes, 25 health."*
- **Tier, rarity, type:** III, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Garrisoned towns gain +1 faith for every two citizens.
- **Why:** The pair shares nothing after Tier II. Garrisons are a quantity that Dominion raises, and faith is how Devotion pays. The model is The Sutlers ("wow thats strong, i like it"), which pays gold for each citizen of a garrisoned town.
- **Arithmetic:** Ten garrisoned towns of 12 citizens: +60 faith. Faith buys a hammer at half the price of gold, so this is the size of The Sutlers one tier later. For a Dominion seat with no other faith, 60 a turn buys a Legionary in a Cathedral town every three turns.
- **Synergy:** **Raises:** faith. **Reads:** garrisons and citizens. Fed by Dominion's garrison cards (The Amabutho, The Field of Mars, The Drill Masters).
- **Shape:** Existing shape: `pays` in a town by its citizens, under the scope `garrisoned`. Data only.
- **Confidence:** good

#### 54. The Hearth Fire (shared with Expansionist) (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** I, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Towns you found start with a Shrine.
- **Why:** The pair shares three cards, and all three are in Tier 0. New towns are what Expansionist makes. The model is The Founders' Stores (towns start with a Granary), which you approved. Greek colonists carried fire from the mother city's hearth to the new town.
- **Arithmetic:** A Shrine is 30 hammers, which is six turns of a new town's production. It makes 1 faith, and it opens Consecrated Labor, The Shrine Guards and The Gifts of the Faithful in that town from its first turn. A seat that founds six towns after the draft saves 180 hammers. A Tier I lump registers at 200 to 400. For an Expansionist seat with no faith, six Shrines make 6 faith a turn, which buys the first gods.
- **Synergy:** **Raises:** Shrines, faith buildings. **Reads:** towns founded. Fed by Expansionist's settling cards and by Consecrated Labor (05). It feeds The Temple Workshops, First Rites and the Doctrine The Temenos (59).
- **Shape:** Existing shape: `foundingRider` with a building, as The Founders' Stores.
- **Confidence:** good

#### 55. The Temple Baths (shared with Expansionist) (new)

- **Ruling:** approved. Your words: *"sure"*
- **Tier, rarity, type:** II, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Each public work gives its town +2 faith and +1 happiness.
- **Why:** Public works are a quantity that Expansionist raises. Faith and happiness are what Devotion pays. Jayavarman VII leads this pair, and both of his lines read public works.
- **Arithmetic:** Two or three public works a town at Tier II, in six towns: 15 works, +30 faith and +15 happiness. That is a regular Tier II card for a seat that built them.
- **Synergy:** **Raises:** faith and happiness. **Reads:** public works. Fed by the shared The Founders' Stores, Commission: Bread and Water and the Doctrine The Curator of Waters (+2 happiness for each work).
- **Shape:** Existing shapes: `pays` and `happiness` by the count of public works in a town (The Thermae pays +2 science the same way). Data only.
- **Confidence:** fair
- **Depends, joins and notes:** With The Curator of Waters a public work gives +3 happiness. To watch.

#### 56. Sacred Commissions (shared with Magisterial) (rework)

- **Ruling:** not adopted. Your words: *"i think as it was is better. holy sites are easily purchaseable with faith"*
- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Towns with a Holy Site build wonders 30% faster.
- **Proposed:** Towns with a Temple build wonders 25% faster.
- **Why:** A shared card is dealt to a Magisterial seat that does not hold Devotion. That seat has no holy site, so the card pays it nothing. The sheet's own rule is that a shared card must pay a seat with no faith engine.
- **Arithmetic:** A wonder town makes 30 to 60 production in ages 3 and 4: +8 to +15 toward the wonder. Justinian's Basilica gives +20% in a town that works a holy site, and the two add up.
- **Synergy:** **Raises:** production toward wonders. **Reads:** Temples. Fed by 06 and by any seat that builds a Temple in its wonder town.
- **Shape:** Existing shape: a scope change on `productionBonus`. Data only.
- **Confidence:** good

#### 57. Sacred Patronage (shared with Magisterial) (rework)

- **Ruling:** approved. Your words: *"Yeah lets do it"*
- **Tier, rarity, type:** III, rare, Civic
- **Now:** You may buy a great-person draft for 750 faith.
- **Proposed:** You may buy a great-person draft with faith. It costs 5 faith for each point of renown the next great person costs.
- **Why:** You set the gold price at 10 gold a point in the Commerce pass ("lets do 10 gold for now", and "they need to be quite expensive"). Faith buys a hammer at half the price of gold, so 5 faith a point is the same price. 750 is far below it.
- **Arithmetic:** At Tier III the fifth and sixth great people cost 346 and 436 renown. Today each costs 750 faith. At 5 a point they cost 1,730 and 2,180, and the eighth (654 renown) costs 3,270. A seat that makes 300 faith a turn buys the sixth in seven turns. Today it takes two and a half.
- **Synergy:** **Raises:** great people. **Reads:** faith held, and the renown ladder. Fed by The Year of Release (47). It feeds Magisterial's cards for a great person gained.
- **Shape:** `offerPriceFaith` becomes a rate read with the ladder, as the Commerce pass's change 115 does for gold. The Academy's scholar draft (1,000 faith) is another price, and I leave it.
- **Confidence:** good

#### 58. The Blessed Forges (shared with Scientific) (cut)

- **Ruling:** open. Your words: *"great"*
- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Improved strategic resources gain +1 faith and +1 production.
- **Proposed:** Cut. The row is retired.
- **Why:** It pays +2 on two or three hexes: about 6 a turn, where a regular Tier II card pays 35 to 60. No theme of either deck reads a strategic hex with faith.
- **Arithmetic:** Three improved strategic hexes: +3 faith and +3 production.
- **Synergy:** The pair still shares five cards after the cut.
- **Shape:** No shape. `retired: true`.
- **Confidence:** fair
- **Depends, joins and notes:** Another agent runs the Scientific pass beside this one. This cut is for that pass to settle.

#### 59. The Temenos (Doctrine) (doctrine)

- **Ruling:** approved. Your words: *"great"*
- **Tier, rarity, type:** Doctrine, Tier I, new
- **Now:** Not in the deck. Tier I has four Doctrines, and none of them is about the land.
- **Proposed:** The hexes beside your towns with a Shrine gain +1 food and +1 faith.
- **Why:** A temenos was the ground cut off for a god around a shrine. The Doctrine makes the first ring of every Shrine town sacred ground. It needs no religion, and it is the land Doctrine that Tier I lacks. The model is Commerce's The Potters' Quarter (the hexes beside your capital).
- **Arithmetic:** A town works the six hexes beside it first. Four towns at the tier-4 government: about 16 worked hexes, +16 food and +16 faith, which is more than any Tier I Order, as a Doctrine should be. It is held all game: twelve towns late give about +60 and +60.
- **Synergy:** **Raises:** food and faith on the first ring. **Reads:** Shrines. Fed by the shared The Hearth Fire (54). It feeds The Zealots, The Poor Tables and every purchase with faith.
- **Shape:** Small extension: a tile test for a hex beside a town centre that holds a building. The Potters' Quarter asks for the ring round the capital, and this is the same test for every Shrine town.
- **Confidence:** fair
- **Depends, joins and notes:** It has no drawback, as the deck's other sixteen Doctrines have none.

#### 60. The House of Worship (Doctrine) (doctrine)

- **Ruling:** answered. Your words: *"does this unlock these buildings or just allow you to buy them with gold. If the latter, this is too weak."*
- **Tier, rarity, type:** Doctrine, Tier IV to Tier III
- **Now:** Tier IV: Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds.
- **Proposed:** Tier III, the same text.
- **Why:** It is the capstone of the temple economy: four more faith buildings in every devout town. A capstone should sit where most seats reach it, and half the seats reach the Tier IV governments.
- **Arithmetic:** Each faith house is one more building for The Temple Workshops (+1 food and +1 production), The Temple Herds, The Prince-Bishops and the shared The Painted Chapels (+3 culture). Four houses in ten towns are 40 buildings. Tier III then has five Doctrines and Tier IV has three.
- **Synergy:** **Raises:** faith buildings. Fed by 06, which buys them with faith.
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** fair
- **Depends, joins and notes:** The Mosque gives +1 authority, so ten devout towns gain +10 authority. To watch, under your rule that authority stays a limit.

#### 61. A seat with no religion of its own (rule) (rework)

- **Ruling:** approved. Your words: *"yeah sounds good, great change."*
- **Tier, rarity, type:** A rule, not a card
- **Now:** A devout town is one of your towns that follows a religion whose holy city you hold (`heldReligions`). A seat that founded no religion has no devout town.
- **Proposed:** If you have founded no religion, the religion your capital follows is yours for the word "devout".
- **Why:** The world holds religions for two thirds of its seats, so a Devotion seat can lose the race, and a seat that founds late has no devout town for many turns. Today its "devout" cards are dead. A realm that takes its neighbour's religion is also good history: most kingdoms did.
- **Arithmetic:** With this rule, The Deaconries, The Settled Faith, Commission: The State Church and The Caliphate pay such a seat. The cards that say "follows your religion" do not change: they still need a religion that you hold. The Doctrines marked `needsReligion` stay as they are: a seat is offered them only if it holds a religion. The founder still gains the founder's share of your towns.
- **Synergy:** It gives a floor to four Orders. It does not change a seat that has founded.
- **Shape:** One clause in the scope `ownersFaith` in `src/sim/statecraft/evaluator.ts`.
- **Confidence:** fair
- **Depends, joins and notes:** Question 1.

### R4. The five questions of round one, and your answers

| Question | My recommendation | Your words |
|---|---|---|
| 1. A seat with no religion of its own: may the religion of its capital count for "devout"? | Yes (change 61). | "yes" |
| 2. The Caliphate: keep "Devout towns cost no authority"? | Keep it, as the deck's one rule-breaker for authority, and change the commission (23). | "Sure. maybe that could be a good theme, religious builds can break the authority rules, and maybe there could be some interaction with spare authority?" |
| 3. May Devotion open unique improvements: the stone circle (03) and the cliff monastery (26)? | Yes, these two and no more. | "great" |
| 4. Faith buys settlers and every building from Tier I (05 and 06). Is that the size you want? | Yes, and test it first. | "see above" |
| 5. May this pass change shared cards on four other decks' sheets? | Yes. | "great" |

Review page: one self-contained HTML file, `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/deckpass-devotion/devotion-design-pass.html`, built by `build3.py` in the same folder.

## The user's rulings on round one (2026-11-21, comments on the page)

The user: "ok i've added comments to the devotion doc". A row with no comment
is approved (the user's standing rule).

| # | Card | The user's words | Result |
|---|---|---|---|
| 01 | The Calling | "Way too strong, keep as is." | Not adopted. The card stays as it is today. |
| 02 | The First Offering | "sure" | Approved. |
| 03 | The Megaliths (the stone circle) | "cool, should this be shared with expansionist?" | Approved. **A question to answer.** |
| 04 | The Healer-Priests | "sure" | Approved. |
| 05 | Consecrated Labor | "great" | Approved. |
| 06 | The Gifts of the Faithful | "this seems too strong. Lets make it culture and faith buildings instead of all buildings." | Towns with a Shrine may buy culture and faith buildings with faith. |
| 07 | The Offering Chests | "age 1 seems too strong, how about age 2." | Approved, moved to the tier of the second age. It takes the "faith buys more" form (`docs/flags.md`). |
| 08 | The Rites Commonwealth | "this is extremely powerful but i like it." | Approved. |
| 09 | The Chantries (the Chapel) | "that's too strong. How about chapel: +2 faith +2 culture, rites in this city last 50% longer" | The Chapel: +2 faith, +2 culture, and rites in its city last 50% longer. |
| 10 | The Octave | "Sure, lets make sure rite duration modifiers properly stack." | Approved. The build must say how the duration modifiers stack (The Octave with the Chapel). |
| 11 | The Founding Vows | "sure" | Approved. |
| 12 | The Temple Workshops | "sure" | Approved. |
| 13 | The Zealots | "sure" | Approved. |
| 14 | Temple Estates | "oh thats great, i like it" | Approved. |
| 15 | The Saints' Fields | "Ok sure" | Cut, as proposed. |
| 16 | The Old Holy Places | "i like this, lets remove the cap" | Approved, with no cap. |
| 17 | The Anchorites | "sure" | Approved. |
| 18 | The Abbeys | "lets cut this, i'm realizing the ability to purchase prophets with faith already give the deck reliable great works." | Cut. |
| 19 | The Lay Brothers | "great" | Cut, as proposed. |
| 20 | Mission Houses | "i think the deck needs modifiers for spreading religion. how about your proclomations reach 50% farther and are 50% more effective in foreign cities." | Kept and reworked: your proclamations reach 50% farther and are 50% more effective in foreign cities. **The deck needs cards that help a religion spread.** |
| 21 | The Confessors | "sure" | Cut, as proposed. |
| 22 | The Fetials | "sure" | Approved. |
| 23 | Commission: The State Church | "sure" | Approved. |
| 24 | The Settled Faith | "sure" | Approved. |
| 25 | Tier II rarities | "sure" | Approved. |
| 26 | The Cliff Monasteries | "great" | Approved. |
| 27 | The Saturnalia | "Hmm, the drawback is too high for this, and it doesn't fit the play patterns i like. lets cut. I like the idea of additional rites though." | Cut. **More new rites are wanted.** |
| 28 | The Temple Herds | "great" | Approved. |
| 29 | Pentecost | "great" | Approved. |
| 30 | The Double Feast | "great" | Approved. |
| 31 | The Pilgrim Towns | "wow thats strong, great" | Approved. |
| 32 | The Psalter | "great" | Approved. |
| 33 | The Consecration Feast | "Production feels too strong, lets have it give food and culture?" | Finishing a faith building grants food and culture, not production. |
| 34 | The Offered Stones | "this needs to be stronger probably, there's not too many ways to buy buildings iwth faith currently." | Make it stronger. |
| 35 | The Holy Inquisition | "lets rework: +1 authority in devout towns. -80% to foreign religion's pressure on your cities (this includes proclamations)." | The user's line. |
| 36 | The Sacred Bequests | "sure" | Approved. |
| 37 | The Fabric Fund | "Sure" | Approved. |
| 38 | The Prince-Bishops | "great" | Approved. |
| 39 | The Defenders of the Faith | "how about +1 strength for every 3 towns, no cap." | +1 strength for every 3 towns that follow your religion, with no cap. |
| 40 | The Naming Feasts | "let's buff this to two citizens." | The Rite of Naming gives two citizens. |
| 41 | The Conversion of Kings | "great" | Approved. |
| 42 | The Seven Pilgrimages | "sure" | Cut, as proposed. |
| 43 | The Apostolic Succession | "sure" | Approved. |
| 44 | The Treasury of Merit | "sure" | Cut, as proposed. |
| 45 | Tier IV rarities | "sure" | Approved. |
| 46 | The Great Commission | "sure" | Approved. |
| 47 | The Year of Release | "sure" | Approved. |
| 48 | The Poor Tables | "probably don't need food this late in the game, let's modify" | Rework: it must pay something other than food. |
| 49 | The Soldiers of God | "great" | Approved. |
| 50 | The City of God | "this feels not very impactful, you tend to build cities around your holy city. cut" | Cut. |
| 51 | The Sacred Host | "great" | Approved. |
| 52 | The Oriflamme (the pass proposed a cut) | "lets keep this, i like the idea of a player marching apostles with their army, and i think +4 is significant." | Kept as it is. |
| 53 | The Garrison Chapels | "Not very strong, lets cut. Lets add a card in it's place: proclamations heal all units within 3 hexes, 25 health." | Cut. In its place, a card shared with Dominion: proclamations heal all units within 3 hexes by 25 health. |
| 54 | The Hearth Fire | "sure" | Approved. |
| 55 | The Temple Baths | "sure" | Approved. |
| 56 | Sacred Commissions | "i think as it was is better. holy sites are easily purchaseable with faith" | Not adopted. The card stays as it is today. |
| 57 | Sacred Patronage | "Yeah lets do it" | Approved. |
| 58 | The Blessed Forges (the pass proposed a cut) | "great" | **In conflict with the Scientific pass,** where the user wrote "let's move this to tier 1" on the same card the day before. To settle with the user. |
| 59 | The Temenos | "great" | Approved. |
| 60 | The House of Worship (Doctrine) | "does this unlock these buildings or just allow you to buy them with gold. If the latter, this is too weak." | **A question to answer,** and a rework if it only allows the purchase. |
| 61 | A seat with no religion of its own | "yeah sounds good, great change." | Approved. |

Questions: Q1 "yes". Q2, The Caliphate: "Sure. maybe that could be a good
theme, religious builds can break the authority rules, and maybe there could
be some interaction with spare authority?" Q3 "great" (Devotion may open
unique improvements). Q4 "see above" (05 approved, 06 narrowed). Q5 "great"
(the pass may change shared cards on other decks' sheets).

## The user's rulings on round two (2026-11-21, comments on the page)

The user: "ok commented on devotion." A row with no comment is approved. In
chat on the same day: "For now, i want the game to be fun over balanced for
playtesters."

| # | Card | The user's words | Result |
|---|---|---|---|
| 62 | The Megaliths stays this deck's own card, in two tiers | "y"; on the question: "sg" | Approved. |
| 63 | Rite lengths add | "y"; on r2-3: "lgtm" | Approved. |
| 64 | The Processions | "cut" | Cut. |
| 65 | The Bell Towers | "make this a charter" | A charter. |
| 66 | The Call to Prayer | "great, make this a charter, because its hard to slot" | A charter. |
| 67 | The Hallowed Ground | "maybe rework: improved tiles gain +1 faith." | Rework: a rite under which the town's improved hexes gain +1 faith. |
| 67, on rites as a whole | | "my thinking with rites: we should add a rule that rites can't be activated once one has already started (this might already be in). Rite should ideally give a bonus throughout the rite so it doesn't have anti-synergy with longer rites, and rites that have been started should count as having been started to avoid anti-synergy with active rite abilities." | **Three rules for every rite.** (1) A town that keeps a rite cannot start another. (2) A rite pays through its whole length, not once at its start, so that a longer rite is always better. (3) A rite that is kept counts as started for every card that reads "starting a rite", so that longer rites and such cards do not work against each other. |
| 68 | The Vigil of Arms | "Rework: All units within three hexes of this town gain +4 strength. They keep this bonus while the rite is active." | The user's line. |
| 69 | The Consecration Feast | "Sure. should apply to purchased buildings too." | Approved; it pays for a faith building that is bought too. |
| 70 | The Offered Stones | "Ok sure, this will be first on my list of cards to cut after playtesting though if we need to cut cards" | Approved. First to cut after playtest. |
| 71 | The Poor Tables | "no cap." | +1 happiness for every 20 faith a turn, with no cap. |
| 72 | The Field Mass | "great" | Approved. |
| 73 | The Blessed Forges | "tier 1 is fine" | Tier I, kept. The same as the Scientific pass. |
| 74 | The House of Worship | "what does the 'whatever beliefs your religion holds' line mean? I like this doctrine, great card for faith building builds." | Approved. **A question to answer,** and the phrase to make plain. |
| 75 | The Two Swords | "sure", "no cap" | +1 happiness for every two points of spare authority, with no cap. |
| 76 | The Commander of the Faithful | "no cap" | +3 faith and +3 culture for each point of spare authority, with no cap. |
| 77 | Commission: The Anointing | "Sure" | Approved. |
| 78 | The Caliphate | "ok i like this change"; on the question: "y" | Devout towns cost 1 authority. |
| 79 | Faith discounts as "faith buys more" | "great" | Approved. |
| 80 | Rarities | "great" | Approved. |

Questions: The Megaliths "sg"; The Offering Chests at Tier II as a rare "y";
The Rites Commonwealth as the only rare of Tier I "y"; The Caliphate "y".

## The user's comments on the closing round (2026-11-21, comments on the page)

The coordinator passed these on, word for word. The user made no comment on
the five open points of the closing round, so each default stands (the
user's rule: no comment means approved).

| Where | The user's words | Result |
|---|---|---|
| "The deck in numbers", the Civic count of 49 | "could we move a few civics to economic" | Eight cards move from the Civic chair to the Economic chair (change 89). |
| The rites table, Consecration of the Bounds | "modify: resource hexes gain +1 culture" | The rite reads: Resource hexes gain +1 culture, and this town's borders grow 30% faster. (change 90). The user then confirmed: "nope, keep the faster borders". |
| The rites table, Rite of Plenty | "gains +1 gold for every population in the city." | The rite reads: This town gains +1 gold for each citizen (change 91). |
| The rites table, Restoring of the Host | "this needs to be a city-wide bonus, not an empire wide bonus" | Units within three hexes of the town heal 25 health each turn (change 92). |
| The House of Worship | "let's add an addtional bonus: buildings that supply faith give +1 science and +1 culture." | Added to the Doctrine, with no cap (change 93). |

The pass is closed. Nothing waits on the user.

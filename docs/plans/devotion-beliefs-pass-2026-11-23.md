# Devotion and the beliefs: second pass, 2026-11-23

This is a design proposal. It changes no data, no code and no test. No test, bot game or dev server was run for it. It follows `docs/plans/deck-review-devotion-2026-11-23.md` and the user's rulings at the top of that file, which stand: the wording change, Feast Days, The Patriarchate at Tier II, the three rite folds, the healing card, and the cut of the Bell Tower.

**The user's words for this pass (2026-11-23).**
- "i think all the points it brought up were very good, but the revisions didn't really address them."
- "I think the religious beliefs need a bit more synergy with the devotion deck and are not very impactful, could you have the devotion agent work on both in conjunction?"
- "I'm also not sure if faith as a resource has enough utility in the game; for the things it can purchase its very strong, but devotion needs a way to convert faith into economy outside of simple conversions (X% of faith becomes culture)."
- "I also think there's currently not a strong incentive to spread your faith, or produce faith units in general."
- On authority: "i think we need more payoff cards for empires with lots of authority".

**How numbers are marked.** **(live)**: in the data today. **(proposed)**: a suggestion of this pass. **(estimate)**: my arithmetic, not measured.

**How proposals are marked.** Text change, existing shape, small extension, or new shape. "Existing shape" means that a live row uses the same fields. I did not run any of them.

---

## Summary

### The idea in four sentences

1. A belief is chosen once and held for the whole game, so it should set a direction. Today most beliefs are small flat yields, and seven print a card's line a second time.
2. Faith becomes economy in three ways that the player does on the map: a religious unit acts, a town turns, or faith buys a lasting thing. The passive lines ("X% of faith becomes Y") go.
3. A foreign town that follows pays its founder by its size. Today it pays 1 faith.
4. Authority from religion is supply that the belief Inquisition and the Mosque give. The cards become the pay-offs.

### What changes, in order

| # | Today (live), in short | Change | Size |
| --- | --- | --- | --- |
| 1 | 56 live beliefs: 23 gods, 17 follower beliefs, 16 enhancer beliefs. Seven print a card's line. 21 serve one of the four builds. Section 1.3 has each live text. | The belief list goes from 56 to 46. Ten rows are cut or merged, twelve are re-aimed, and the rest stay. Each of the four builds gets a god, a follower belief and an enhancer belief. No belief prints a card's line. | Mostly existing shapes; three small extensions |
| 2 | +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle` in `data/religion.json`). | The founder's share: each foreign town that follows pays its founder +1 gold for every two citizens. | Existing shape, one data row |
| 3 | The Pulse of Bells: "A proclamation reaches 4 hexes further and presses 20 faith harder." Reliquaries: "+1 culture for every 3 faith you make each turn." Congregation: "+2 faith for every town in the world that follows your religion." Ecclesia: "Each holy site gives +1 faith for each town in the world that follows your religion." | Four enhancer beliefs pay for acts and moments: The Pulse of Bells (a proclamation speeds your towns), Reliquaries (relics), Congregation (a town turned brings a citizen), Ecclesia (a rite presses your religion). | Two existing shapes, two small extensions |
| 4 | Patron of Merchants: "+1 faith and +2 gold for each different luxury you hold." The Alms Box: "Your faith buys 25% more in towns that follow this religion." | Two beliefs make faith a currency of its own: the god Patron of Merchants counts faith spent this game, and the follower belief The Alms Box lets a town that follows buy food and production buildings with faith. | Existing shape; small extension |
| 5 | The Holy Inquisition (III, uncommon): "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." Commission: The Anointing (III, uncommon): "Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture." The Second Prophet (II, uncommon): "Prophets and apostles you buy start with one extra charge." Ancestor Worship: "+1 culture for every 4 citizens in a town." | Authority pay-offs: The Holy Inquisition, Commission: The Anointing and The Second Prophet each lose a plain line and gain a pay-off for spare authority. The god Ancestor Worship widens the game's own bonus. | One existing shape, three small extensions |
| 6 | Mission Houses (II, common): "Your proclamations reach 50% farther and are 50% more effective in foreign cities." | Mission Houses becomes the grower of the spreading faith. | Existing shape |
| 7 | The Learned Clergy (III): "+2 science and +2 culture for every 10 faith your empire makes each turn." The Sacred Bequests (III): "Spending faith grants science equal to a fourth of it." The Tithe of Nations (IV): "Gain 1 faith each turn for every two citizens in the world who follow your religion." The Theoric Fund (Doctrine I): "+1 culture for every 3 faith your empire makes." Commission: The State Church (II) reward: +1 authority and +1 happiness for every two devout towns. | To pay for it: retire The Learned Clergy, The Sacred Bequests, The Tithe of Nations and the Doctrine The Theoric Fund. The Holy Inquisition and Commission: The State Church lose their authority. Commission: The Anointing loses its flat yields. | Retired rows and text changes |

No Tier 0 card changes. Nothing adds a player action: every proposal uses purchases, rites, proclamations, relics and commissions that exist.

### Decisions for you

1. **A smaller belief list (46 rows) with re-aimed beliefs.** Today the list has 56 rows, and 21 of them serve one of the four builds. Recommended: yes. Section 1.3 has every row with its live text.
2. **The founder's share by citizens (change 2).** Today the share is +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle` in `data/religion.json`). Recommended: yes, at +1 gold for every two foreign citizens. It is the one base rule that this pass changes.
3. **Should The Holy Inquisition and The State Church stop giving authority?** Today The Holy Inquisition says "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." The commission's reward today is "+1 authority and +1 happiness for every two devout towns." Recommended: yes. Your belief Inquisition and the Mosque are then the supply, and authority stays "a limiting factor for growth". A realm of 20 devout towns with Mosques falls from about 45 spare authority to about 25 (estimate).
4. **Retire the four passive conversion rows (change 7).** Their live texts are in the summary table above and in section 2.3. Recommended: yes. They are the "X% of faith becomes Y" lines, and they pay for what this pass adds.
5. **The Pulse of Bells: a proclamation gives your towns in its reach +25% production for ten turns.** Today: "A proclamation reaches 4 hexes further and presses 20 faith harder." Recommended: yes. It is the strongest reason in this pass to buy an apostle, and it is the largest number, so it is yours to decide.
6. **Commission: The Anointing gives the realm rite** (the rule of The Rites Commonwealth) as its reward for 10 spare authority. Today its reward is "each devout town gains +3 faith and +3 culture." The Rites Commonwealth (Tier I, rare) says "A rite your capital starts is kept by every town you hold." Recommended: yes. It gives a second way to that rule, which today is dealt only in Tier I.

---

## 1. The beliefs

### 1.1 The quantities that beliefs and cards share

Every belief below raises or reads one of these. The Devotion cards do the same, so a belief and a card make a combination.

| Quantity | Build | Cards that raise it | Cards that read it |
|---|---|---|---|
| Towns keeping a rite | Rites | The Rites Commonwealth, The Double Feast, The Octave, the charters | The Priest-Astronomers, The Festival Calendar, The Fetials, The Psalter, The Rogations, the three folded rite cards |
| Faith spent | Faith spent | every purchase, rite, god, reroll and religious unit | The Book of Life, The Pilgrim Staff, The Fabric Fund, The Offered Stones, The Saint Peter's Indulgence |
| Devout towns | Devout towns and authority | The Parishes, the tide | The Settled Faith, The Deaconries, The Caliphate, The Imarets |
| Spare authority | Devout towns and authority | the belief Inquisition, the Mosque, The Caliphate | The Patriarchate, The Two Swords, The Commander of the Faithful, Commission: The Anointing |
| Buildings that supply faith | Faith buildings | The Chantries, The House of Worship, the four faith houses | The Temple Workshops, The Temple Herds, The Prince-Bishops, The Painted Chapels |
| Towns in the world that follow | The spreading faith | proclamations, Pentecost, holy sites | The Living Hymnal, The Pilgrim Towns, The Defenders of the Faith, The Great Commission |
| A religious unit acts; a town turns | The spreading faith | prophets, apostles | The Field Mass, Pentecost, The Mass Baptisms, The Mission |

### 1.2 What a belief should be worth

- **A god** is chosen in age 1 or 2 and costs 40 to 90 faith (live: 40 + 15 for each god held, a little more each time). It takes no chair. It should be worth a headline Tier 0 card (10 to 15 a turn by turn 40, power bar) or grow into more.
- **A follower belief** is chosen at the founding in age 2. It should be worth a regular Tier I or II card in a seat of five to eight towns: 20 to 50 a turn.
- **An enhancer belief** comes in age 3 and costs a whole prophet (240 to 300 faith, estimate). It should be worth a regular Tier III card: 60 to 120 a turn, or it should change how the seat plays.
- **A seat without the Devotion deck must still want it.** Every god below pays with no card. The follower beliefs keep four plain rows for any founder (Harvest Blessing, Guild of the Faithful, Warrior Monks, Common Table).

### 1.3 Every belief, with its verdict

- Class: P pantheon (a god), F follower, E enhancer. Build: R rites, S faith spent, D devout towns and authority, B faith buildings, W the spreading faith. A dash means a plain row for any seat.
- "Today (live)" is the row's `text` in `data/religion.json`, word for word. The game prints the describers' sentences, which say the same rule. "Proposed" is the new text, or "No change", or "Cut".

**Gods (23 today, 19 after).**

| God | Verdict | Today (live) | Proposed | Build | Makes a combination with | Shape |
|---|---|---|---|---|---|---|
| Goddess of the Harvest | Keep | "Bonus resources that give food gain +1 food." | No change. | - | land cards of any deck | none needed |
| Keeper of the Hearth | Re-aim; it takes in The Standing Stones | "Granaries give +2 faith and +1 happiness." | "Granaries and Monuments give +1 faith, and count as buildings that supply faith." | B | It raises the count that The Temple Workshops, The Temple Herds, The Quiet Hours, The Painted Chapels and The House of Worship read. Two more buildings a town from age 1. | Existing shape if a line written on the building counts for `buildingsSupplying`. To check (see the last section). |
| The Standing Stones | Cut, merged above | "Monuments give +2 culture and +1 faith." | Cut. Its line moves into the row above. |  |  |  |
| Star Readers | Keep | "+4 science in every town with a mountain in its borders." | No change. | - |  |  |
| Keeper of the Calendar | Cut | "Plantations gain +1 science." | Cut. Vineyard Rites is the plantation god. |  |  |  |
| Ancestor Worship | Re-aim | "+1 culture for every 4 citizens in a town." | "The bonus for spare authority also raises faith and culture." | D | The live bonus is +10% production at 5 spare and +20% at 10. Every source of authority now also pays faith and culture. With The Sovereign Writ the bonus has no ceiling. | Small extension: one more meter rule beside `writUncapped`, naming the yields the authority bonus raises. |
| Lady of the Hunt | Keep | "Camps gain +1 food and +1 gold." | No change. | - | Lay Offerings, The Temple Herds (the same hexes) |  |
| Spirits of the Wood | Keep | "Unimproved forest and jungle hexes gain +1 faith and +1 culture." | No change. | - | Sacred Groves |  |
| River Mother | Keep | "Towns on fresh water gain +2 food." | No change. | - |  |  |
| Lord of the Sea | Keep | "+1 production and +1 gold on every hex with a Fishing Boat." | No change. | - |  |  |
| God of the Forge | Keep | "Each military building gives +2 production." | No change. | - |  |  |
| Rites of Blood | Re-aim. It was The Sacred Host's line. | "Killing a unit grants faith equal to its strength." | "A unit of yours that dies in battle grants faith equal to twice its strength." | S | The Sacred Host pays on a kill, and this pays on a loss. The Martyrology and the Doctrine The Martyr's Crown read the same moment. | Existing shape: `windfallRider` on `death` with `fromOccasion: strength` (the Hall of Deeds). |
| Oracle of the Crossroads | Keep | "Scouts and settlers gain +1 movement and +1 sight." | No change. | - |  |  |
| Sacred Fire | Keep | "+2 production in every town." | No change. It is the plain yardstick for a god. | - |  |  |
| Desert Fathers | Merge with Winter Mother | "Desert hexes gain +1 food and +1 faith." | "Desert and tundra hexes gain +1 food and +1 faith." A name for both is needed, for example The Hermits. | - |  | Existing shape: a hex line on `any` of two terrains. |
| Winter Mother | Cut, merged above | "+1 food and +1 faith on every tundra hex." | Cut. Its line moves into the row above. |  |  |  |
| The Stone Hoard | Keep | "Mines and quarries on a resource gain +1 culture and +1 faith." | No change. | - | The Blessed Forges |  |
| The Vigil | Keep | "A town keeping a rite gains +15% science and culture." | No change. | R | every card that reads a town keeping a rite |  |
| Vineyard Rites | Keep | "+1 food and +1 culture on every hex with a Plantation." | No change. | - | Lay Offerings, The Temple Herds |  |
| Cult of Heroes | Keep | "+15% renown." | No change. | - | Sacred Patronage |  |
| Herd Gods | Keep | "+1 production and +1 faith on every hex with a Pasture." | No change. | - | Lay Offerings, The Temple Herds |  |
| Patron of Merchants | Re-aim. It was The Incense Road's count. | "+1 faith and +2 gold for each different luxury you hold." | "+1 gold each turn for every 50 faith you have spent this game." | S | Every sink raises it for good: gods, rites, religious units, rerolls, purchases. The Book of Life reads the same count for science and culture. The Offering Chests does not lower the count, because the count takes what was paid. | Existing shape: `pays`, `where: empire`, `basis: count`, `count: faithSpent`, `per: 50`. The Book of Life uses the count. |
| The Muses | Cut | "+1 faith for every 3 culture you make each turn." | Cut. It turns culture into faith, which is a plain conversion. |  |  |  |

**Follower beliefs (17 today, 13 after).** A follower belief acts in the town, for whoever owns the town. None below pays an empire.

| Belief | Verdict | Today (live) | Proposed | Build | Makes a combination with | Shape |
|---|---|---|---|---|---|---|
| Cathedrals of the Sky | Keep | "Temples supply +2 science and +2 culture." | No change. | B | The Prince-Bishops, The Builders' Lodge |  |
| Pilgrimage | Cut | "A town that follows gains +1 faith for every 3 followers." | Cut. It is the third "faith for each citizen" line, after the Wat and Feast Days. |  |  |  |
| Feast Days | Settled (first pass) | "+1 happiness for every city that follows, and Temples supply +1 happiness." | "A town that follows gains +1 faith for every two citizens while it keeps a rite." | R | the rites cards; the readers of faith spent | Existing shape |
| Holy Water | Cut | "Towns that follow and stand on fresh water gain +10% food." | Cut. A narrow flat that joins nothing. |  |  |  |
| Lamps of the Shrine | Cut | "Shrines in towns that follow give +2 science." | Cut. The Sky Watchers (Scientific) prints nearly the same line. |  |  |  |
| Choirs | Keep; it takes in Tithe Houses | "+1 culture for every 4 citizens of a city that follows." | "A town that follows gains +1 culture and +1 gold for every three citizens." | D | The Deaconries and The Imarets (citizens of a devout town); every card that grows a town | Existing shape: the two live lines, with `per: 3`. |
| Tithe Houses | Cut, merged above | "+1 gold for every 3 citizens of a city that follows." | Cut. Its line moves into the row above. |  |  |  |
| The Quiet Hours | Keep | "In towns that follow, each building that supplies faith gives +2 culture and +1 happiness." | No change. | B | It reads the count that Keeper of the Hearth, The Chantries and the faith houses raise. |  |
| Warrior Monks | Keep | "+10 combat strength for units defending a city that follows." | No change. | - | The Spiritual Host |  |
| Harvest Blessing | Keep | "+1 food on every farm worked by a city that follows." | No change. | - |  |  |
| Guild of the Faithful | Keep | "+15% production toward buildings in every town that follows." | No change. | - |  |  |
| Common Table | Keep | "A city that follows keeps a quarter of its stored food when it grows." | No change. | D | The Imarets |  |
| Minarets | Keep | "Unlocks the Mosque: +3 faith, +2 production and +1 authority." | No change. | D, B, S | It is supply for every authority pay-off in section 4. |  |
| Temple Spires | Keep | "Unlocks the Wat: +3 happiness, and +1 faith for every 2 citizens." | No change. | B, S |  |  |
| The Open Kitchen | Keep | "Unlocks the Gurdwara: +3 food, +3 faith, and +1 science for every 3 citizens." | No change. | B, S |  |  |
| The Eternal Flame | Keep | "Unlocks the Dar-e Mehr: +25% faith in its town." | No change. | B, S |  |  |
| The Alms Box | Re-aim. It was The Offering Chests' line. | "Your faith buys 25% more in towns that follow this religion." | "A town that follows may buy food and production buildings with faith." | S | The Gifts of the Faithful opens culture and faith buildings, so the two open four kinds. The Fabric Fund, The Offered Stones, The Consecration Feast and Patron of Merchants pay on each purchase. | Small extension: the rule `faithBuysBuildings` read from a town's follower beliefs. The purchase riders already read them (The Alms Box today). |

**Enhancer beliefs (16 today, 14 after).** An enhancer pays the founder, who is the holder of the holy site.

| Belief | Verdict | Today (live) | Proposed | Build | Makes a combination with | Shape |
|---|---|---|---|---|---|---|
| Reliquaries | Re-aim. It was The Theoric Fund's line. | "+1 culture for every 3 faith you make each turn." | "An apostle may leave a relic in a town of yours with a Temple. Each of your towns that holds a relic gives +4 science and +4 culture." | S, B | A relic is a building that supplies faith (+3 faith, live), so every reader of that count gains. Each relic is one apostle charge, so The Second Prophet and Apostles feed it. | The pay is an existing shape (`count: followingWithBuilding` with the relic). The Temple in place of the Cathedral is a small extension. |
| Inquisition | Keep (your text), with the wording of the first pass | "Rival religions press your towns at 70% strength. +1 authority for every two of your cities that follow your religion." | "Rival religions press your towns at 70% strength. +1 authority for every two devout towns." | D | The pay-offs of section 4. The cards no longer print this line. |  |
| The Long Road | Keep; it takes in Sacred Cartography | "Your religion presses 2 harder along trade routes." | "Your trade routes press your religion at both ends, and 2 harder." | W | Pilgrim Markets, and every Commerce card that adds routes | Existing shape: the two live rules on one row. |
| Sacred Cartography | Cut, merged above | "Your trade routes press your religion at both ends." | Cut. Its line moves into the row above. |  |  |  |
| Itinerant Preachers | Keep | "Towns that follow press your religion 5 hexes further." | No change. | W |  |  |
| The Pulse of Bells | Re-aim. Mission Houses printed nearly the same line. | "A proclamation reaches 4 hexes further and presses 20 faith harder." | "A proclamation gives each of your towns in its reach +25% production for ten turns. A later one restarts the ten turns." | W, S | The Field Mass (a proclamation heals), The Second Prophet (more charges), Apostles (cheaper apostles). It is the reason to walk an apostle through your own towns. | Small extension: the `timed` grant, given to each own town in a proclamation's reach. `proclamationMade` is a live moment, and `healNearby` already walks the reach. |
| Ecclesia | Re-aim. It was The Pilgrim Towns' count on the same hex. | "Each holy site gives +1 faith for each town in the world that follows your religion." | "A town that starts a rite presses your religion on every town within four hexes." (proposed: 20 pressure, which turns two citizens) | R, W | It joins rites to the spread, which nothing does today. Under The Rites Commonwealth every town presses each time. Pentecost and The Mass Baptisms then fire from rites. | Existing shape: `windfallRider` on `rite` with a `pressure` grant (Pentecost has the grant, and The Psalter the moment). |
| Apostles | Keep | "Your faith buys 40% more when you buy an apostle." | No change. | S, W | Reliquaries, The Pulse of Bells |  |
| Holy Order | Keep | "Unlocks Knights Templar, bought with faith. They gain +6 strength in land that follows your religion." | No change. | S | The Soldiers of God |  |
| Congregation | Re-aim. It paid faith for following towns. | "+2 faith for every town in the world that follows your religion." | "The first time a foreign town turns to your religion, your capital gains a citizen." | W | The Royal Cult, The Patrimony of Peter when the capital is the holy city, and every card that counts citizens. Each first conversion is a lasting gain, not a rate. | Existing shape: `windfallRider` on `townConverted` with `first: conversion` (The Mass Baptisms) and the grant `citizens` with `toCapital` (a live Dominion row). |
| Pilgrims' Coin | Cut | "+4 gold for every city in the world that follows." | Cut. The founder's share of section 3 is this belief as a base rule. |  |  |  |
| World Church | Keep | "+15% culture for every empire in the world that follows you." | No change. | W | It is a deliberate strong pay-off for reaching other empires. |  |
| The Long Prayer | Keep, a little larger | "+1 culture for every 4 citizens in the world who follow you." | "+1 culture for every 3 citizens in the world who follow you." (live: every 4) | W, D | The Tithe of Nations read the same count and is retired. | Number change |
| The Crusade | Keep | "Your units gain +6 strength in foreign land that follows your religion." | No change. | W | A reason for a Dominion seat to convert a town before it attacks. |  |
| Marvels of the Faith | Keep | "+5 science and +5 culture for every city in the world that follows you and holds a wonder." | No change. | W | Sacred Commissions, The Pious Masons |  |
| The Scriptoria | Keep | "+1 science for every faith building in a city that follows you." | No change. | B | It counts the faith category in every following town, at home and abroad. |  |

### 1.4 The check

| Build | God | Follower belief | Enhancer belief |
|---|---|---|---|
| Rites | The Vigil | Feast Days | Ecclesia |
| Faith spent | Patron of Merchants, Rites of Blood | The Alms Box, the four house beliefs | Reliquaries, Apostles, Holy Order |
| Devout towns and authority | Ancestor Worship | Choirs, Common Table, Minarets | Inquisition, The Long Prayer |
| Faith buildings | Keeper of the Hearth | The Quiet Hours, Cathedrals of the Sky, the four house beliefs | The Scriptoria, Reliquaries |
| The spreading faith | none, because a god is chosen before a religion exists | none, because a follower belief acts inside a town | The Pulse of Bells, Congregation, Ecclesia, The Long Road, Itinerant Preachers, World Church, The Crusade, Marvels of the Faith |

**The seven duplicates of the first pass.**

| Belief | Today (live): the belief | Today (live): the card with the same line | What happens |
|---|---|---|---|
| Reliquaries | "+1 culture for every 3 faith you make each turn." | The Theoric Fund: "+1 culture for every 3 faith your empire makes." | The belief is re-aimed, and the Doctrine is retired. |
| Rites of Blood | "Killing a unit grants faith equal to its strength." | The Sacred Host: "Kills grant faith equal to the strength of the unit you killed." | The belief pays on a loss, and the card on a kill. |
| Patron of Merchants | "+1 faith and +2 gold for each different luxury you hold." | The Incense Road: "+2 faith for each different luxury you hold." | The belief counts faith spent. |
| Inquisition | "Rival religions press your towns at 70% strength. +1 authority for every two of your cities that follow your religion." | The Holy Inquisition: "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." Commission: The State Church: "Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns." | The belief keeps the line. The two cards lose it (section 4). |
| The Alms Box | "Your faith buys 25% more in towns that follow this religion." | The Offering Chests: "Your faith buys 25% more." | The belief opens purchases. |
| Ecclesia | "Each holy site gives +1 faith for each town in the world that follows your religion." | The Pilgrim Towns: "Holy sites gain +1 production and +1 culture for each town that follows your religion." | The belief reads rites. |
| The Long Prayer | "+1 culture for every 4 citizens in the world who follow you." | The Tithe of Nations: "Gain 1 faith each turn for every two citizens in the world who follow your religion." | The belief keeps the line, and the card is retired. |

**Size, three examples (estimate).**
- Keeper of the Hearth, age 1: three towns with a Granary and a Monument give +6 faith. With The Temple Workshops those six buildings give +6 food and +6 production more. A headline Tier 0 card pays 10 to 15.
- Patron of Merchants: a seat that buys three gods and a prophet has spent about 290 faith in age 2, so +5 gold. A committed seat has spent about 2,500 in age 3 (+50 gold) and 10,000 in age 4 (+200 gold). The median seat makes 47 gold in age 3 and 298 in age 4.
- Choirs: eight towns of 9 citizens give +24 culture and +24 gold. A regular Tier II card pays 35 to 60.

---

## 2. Faith as an economy

### 2.1 What faith buys today (all live)

| Sink | Price | Who can use it |
|---|---|---|
| A god | 40 faith, then 56, 72 and 90 (`40 + 15n + n^1.5`) | every seat, for two to four gods |
| A prophet | 120, and 60 more each time | every seat, from The High Temple (age 2) |
| An apostle | 90, and 40 more each time | every seat, from Theology (age 3) |
| An inquisitor | 200 | every seat, from The Holy Office (age 4) |
| A rite | 20, and 5 more for each rite started | every seat; five rites are in the technology tree |
| A reroll of a hand | 35, times 1.6 in age 3 and 2.2 in age 4, times 1.35 for each reroll taken | every seat |
| A unit in a town with a Cathedral | 2 faith for each point of production | every seat, in age 3 |
| A faith house (Mosque, Wat, Gurdwara, Dar-e Mehr) | about 235 | a town that follows a religion with the house's belief, or a devout town under The House of Worship |
| Knights Templar | about 475 (estimate, from its size and column) | the belief Holy Order |
| Settlers and workers | a settler costs about 72, and 18 more each time | Consecrated Labor (Tier I) |
| Culture and faith buildings | 2 faith for each point of production | The Gifts of the Faithful (Tier I) |
| Melee units in a Shrine town | 2 for 1 | The Shrine Guards (shared with Dominion) |
| Science buildings | 2 for 1 | the legacy of al-Khwārizmī |
| A half-built wonder | 2 for 1 on the rest | The Pious Masons (Tier III), The Valley of Kings (a leader's building) |
| A great-person draft | 5 faith for each point of renown: 375 for the first, 3,270 for the eighth | Sacred Patronage (Tier III, shared with Magisterial) |
| The Magnum Opus and the Cathedral | faith poured into the build | every seat for the Cathedral; The Last Offering raises the Opus rate |

**What this shows.**
- A seat with no card can spend faith on gods, religious units, rites and rerolls, and on units once it has a Cathedral. After its gods, the cheap sinks are done. Religious units are the only large sink that every seat has, and today they pay almost nothing (section 3).
- The strong sinks are opened by cards, and most are in Tier I. Your words fit this: "for the things it can purchase its very strong".
- Ten live rows turn faith into another yield with no play at all. Seven read faith made: The Theoric Fund, Reliquaries, The Learned Clergy, The Poor Tables, The Zealots, The Cloister and The Tithe. Three read faith spent: The Pilgrim Staff, The Sacred Bequests and The Fabric Fund. These are the "simple conversions".

### 2.2 Four directions

| Direction | What it means here | Verdict |
|---|---|---|
| (a) Spreading is the conversion | Faith buys an apostle. Its acts turn towns. Each town that follows pays by its size. | **Yes, the main one.** It is open to every seat, and it puts the conversion on the map. Section 3. |
| (b) Faith buys lasting things only it can buy, in any town that follows | The four faith houses do this already. The Alms Box (re-aimed) adds food and production buildings in a town that follows. Reliquaries adds relics. | **Yes, with what exists.** No new kind of thing is added. |
| (c) Rites as the engine | A rite is the cheapest sink (20 to 100 faith), and under The Rites Commonwealth one payment covers the realm. So rites cannot absorb a large income. | **In part.** Rites stay the timed effect that the player aims. Ecclesia makes each rite press the religion, so a rite is also a small proclamation. |
| (d) Faith spent as a count | The Book of Life has it. Patron of Merchants adds a god with no limit. | **Yes, as the glue.** It makes every sink in the table above worth a little for good. |
| (e) Mine: a religious unit's act leaves a timed effect at home | The Pulse of Bells. An apostle rings through your towns each ten turns. | **Yes, one row.** It gives the unit a use that is not pressure. |

**Recommended: (a) as the engine, (b) and (e) as the sinks, (d) as the glue.** A Devotion seat then turns faith into economy like this:
- early: gods, rites, settlers and buildings (Tier I cards);
- from age 2: prophets for beliefs that matter (section 1);
- from age 3: apostles, which leave relics, speed production at home and turn towns abroad, and each town turned pays gold by its size;
- all game: every point spent raises Patron of Merchants and The Book of Life.

### 2.3 What leaves, to pay for it

| Row | Today (live) | Why it goes | What a committed age 4 seat loses (estimate) |
|---|---|---|---|
| The Learned Clergy (III) | "+2 science and +2 culture for every 10 faith your empire makes each turn." | A plain conversion of faith made. | 120 a turn at 300 faith |
| The Sacred Bequests (III) | "Spending faith grants science equal to a fourth of it." | The Pilgrim Staff a second time, with another yield. | 75 a turn |
| The Tithe of Nations (IV) | "Gain 1 faith each turn for every two citizens in the world who follow your religion." | The Long Prayer's count, and it pays faith for followers. The founder's share now pays gold for the same thing. | about 150 faith a turn |
| The Theoric Fund (Doctrine I) | "+1 culture for every 3 faith your empire makes." | A plain conversion with no chair. Tier I keeps four Doctrines. | 100 culture a turn |
| The beliefs Pilgrims' Coin, Congregation, Ecclesia, Pilgrimage, The Muses, Reliquaries (old texts) | Pilgrims' Coin: "+4 gold for every city in the world that follows." Congregation: "+2 faith for every town in the world that follows your religion." Ecclesia: "Each holy site gives +1 faith for each town in the world that follows your religion." Pilgrimage: "A town that follows gains +1 faith for every 3 followers." The Muses: "+1 faith for every 3 culture you make each turn." Reliquaries: "+1 culture for every 3 faith you make each turn." | Cut or re-aimed in section 1. | about 100 a turn together |

The Pilgrim Staff, The Fabric Fund, The Poor Tables and The Zealots stay. The Cloister and The Tithe are shared rares of other decks and are not mine to change here.

---

## 3. A reason to spread, and to make religious units

### 3.1 What the units do today (live)

| Unit | Price | Charges | Acts |
|---|---|---|---|
| Prophet | 120, +60 each time | 2 | Found the religion (2 charges). Gain a belief (2). Raise a further holy site (2). Proclaim (1): 60 pressure on every town within 10 hexes, which turns six citizens in each. Say a rite over every town (1). |
| Apostle | 90, +40 each time | 2, movement 4 | Proclaim (1): 30 pressure within 6 hexes, three citizens in each town. Heal 25 on its hex and the six beside it (1). Leave a relic in an own town with a Cathedral (1): +3 faith. |
| Inquisitor | 200 | 1 | Purge: remove 60 of rival pressure within 5 hexes. It also gives +2 strength to units beside it. |

- The tide since 2026-11-23 has three sources: a holy site (6 pressure within 6 hexes), each town that follows (2 within 3) and each trade route (3). A Temple doubles the pressure of the religion its town follows. Ten pressure turns one citizen.
- A religion holds two follower beliefs from its founding, and needs one more prophet for each further belief: about three prophets, 180 + 240 + 300 = 720 faith (estimate).

### 3.2 What one more following town pays today

| Where | With no card or belief | With the live cards and beliefs for it |
|---|---|---|
| A town of yours turns devout | Your follower beliefs act in it. | The Settled Faith (+15% science and culture), The Deaconries, The Holy Inquisition (+1 authority), The Caliphate (it costs 1 authority). About 40 a turn in age 3 (estimate). |
| A foreign town turns | +1 faith, and +1 gold for each two such towns (live, `founderTrickle`). | The Living Hymnal +6. Pilgrims' Coin +4 gold. Congregation +2 faith. The Long Prayer about +2 culture. About 16 a turn with a Tier II card and three enhancer beliefs (estimate). Once: The Mass Baptisms, 20 times its citizens in science and culture. |
| What the foreign town's owner gains | All your follower beliefs, in that town. Choirs, Cathedrals of the Sky and The Quiet Hours are worth about 15 to 25 a turn to the rival in age 3 (estimate). | |

### 3.3 Why it is not worth it now

1. **At home the tide does the work for nothing.** A town within six hexes of the holy site, with a Temple, takes about 12 pressure a turn. A town of eight turns in about four turns. No unit is needed.
2. **Abroad the founder gets 1.5 a turn and the rival gets 15 to 25.** One apostle (about 110 faith) turns the two or three foreign towns near one spot. That pays the founder about 4 a turn. The same 110 faith buys 55 production of buildings, which pay more and cannot be undone.
3. **A unit's act is pressure and nothing else,** except the apostle's heal. So a unit has no use when no town is left to turn.
4. **The beliefs a prophet buys are weak,** so the third and fourth prophets are not worth 240 and 300 faith.
5. **The price rises with each unit** (60 or 40 more), and the reward for each does not.

### 3.4 The incentive

**1. The founder's share (base rule).**
- Today: +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle` in `data/religion.json`). A foreign town of any size pays the same.
- Proposed: "Each foreign town that follows your religion pays you +1 gold for every two citizens."
- Existing shape: the `founderTrickle` row with `count: followingForeignPop` and `per: 2`.
- Size (estimate): a foreign town of 8 pays 4 gold. Ten foreign towns in age 3 pay 40 gold, when the median seat makes 47. Twenty-five towns of 12 in age 4 pay 150, when the median seat makes 298.
- It pays gold, not faith, so faith is turned into another currency through the map.
- The rival still gains your follower beliefs. That stays: it is why a rival may let the town follow, and it is what The Apostolic Camera (Doctrine IV) pays you for.
- Every seat has it, so a seat without the Devotion deck also has a reason to buy an apostle.

**2. An act gives more than pressure (beliefs).**

| Act or moment | Today (live) | What it gives after this pass | From |
|---|---|---|---|
| A proclamation | Pressure (60 from a prophet within 10 hexes, 30 from an apostle within 6). The Field Mass: "Your proclamations heal your units within three hexes by 25 health." The Pulse of Bells: "A proclamation reaches 4 hexes further and presses 20 faith harder." | Your towns in its reach build 25% faster for ten turns. Your units near it heal. | The Pulse of Bells (belief), The Field Mass (live card) |
| A relic left | The relic gives +3 faith in its town. The building's note: "An apostle leaves one in a city that has a Cathedral. A city can hold only one." Reliquaries: "+1 culture for every 3 faith you make each turn." | +3 faith in the town (live), +4 science and +4 culture to the founder, and one more building that supplies faith. From a Temple, not a Cathedral. | Reliquaries (belief) |
| A foreign town turns for the first time | The Mass Baptisms: "The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population." Pentecost: "When a foreign town turns to your religion, your religion presses every town within four hexes of it." Congregation: "+2 faith for every town in the world that follows your religion." | A citizen in your capital. Science and culture equal to 20 times its citizens. Your religion presses every town within four hexes. | Congregation (belief), The Mass Baptisms, Pentecost (live cards) |
| A foreign town turns, each time | The founder's share only: +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle` in `data/religion.json`). Mission Houses: "Your proclamations reach 50% farther and are 50% more effective in foreign cities." | The grower gains +3 gold and +3 culture. | Mission Houses (re-aimed, section 5) |
| A town starts a rite | No pressure. Ecclesia: "Each holy site gives +1 faith for each town in the world that follows your religion." | Your religion presses every town within four hexes. | Ecclesia (belief) |
| A unit is bought | The Second Prophet: "Prophets and apostles you buy start with one extra charge." | More charges for each ten points of spare authority. | The Second Prophet (re-aimed, section 5) |

**3. What one apostle is worth after the changes (estimate, age 3, about 130 faith).**
- Two proclamations in a cluster of five own towns under The Pulse of Bells: 5 towns × 15 production × 25% × 20 turns = 375 production. The same faith buys 65 production at the base rate.
- Or two relics under Reliquaries: +6 faith, +8 science and +8 culture a turn for good.
- Or two proclamations abroad that turn three towns of 8: +12 gold a turn from the share, three citizens under Congregation, and 960 science and culture under The Mass Baptisms.

**4. Tedium.** The pass adds no unit and no act. An apostle keeps two charges and four movement. The price ladder (+40 each) holds the number of units down, so the changes raise what each act is worth. The Pulse of Bells asks for one aimed walk each ten turns, and the result is on the map.

**5. Not proposed.** Moving The Apostolic Camera to an earlier tier would be the strongest single push to spread. It would leave Tier IV with two Doctrines, so it waits for a Doctrine pass.

---

## 4. The authority path

Your rulings: "I'm kind of liking this authority-based religious play", "we need more payoff cards for empires with lots of authority", and from the Commerce pass, "Authority needs to be a limiting factor for growth."

### 4.1 Supply and pay-off today

- **The Caliphate (Tier III, rare) does not change:** "Devout towns cost 1 authority."
- **Supply (live):** the belief Inquisition (+1 for two devout towns), the Mosque (+1), The Holy Inquisition (+1 for each devout town), Commission: The State Church (+1 for two devout towns), The Caliphate (a devout town costs 1).
- **Pay-off (live):** the game's own bonus (+10% production at 5 spare, +20% at 10, and no more after that), The Two Swords (III), Commission: The Anointing (III, a goal of 10 spare), The Commander of the Faithful (IV).
- **Settled or proposed elsewhere:** The Patriarchate (Tier II, settled), The Missi Dominici (Expansionist and Dominion, proposed in the Expansionist review).

Five sources and three readers is the wrong way round. Three of the five sources print the same line.

### 4.2 The path after this pass

| Tier | Supply | Pay-off for spare authority | Today (live) | What the pay-off gives after this pass |
| --- | --- | --- | --- | --- |
| Gods |  | Ancestor Worship | "+1 culture for every 4 citizens in a town." | The game's bonus also raises faith and culture. |
| Beliefs | Inquisition, Minarets (the Mosque) |  | No change. Inquisition: "Rival religions press your towns at 70% strength. +1 authority for every two of your cities that follow your religion." Minarets: "Unlocks the Mosque: +3 faith, +2 production and +1 authority." |  |
| II |  | The Patriarchate | New (settled in the first pass). | +2 production and +2 science in the holy city for each point. |
| II |  | The Second Prophet (re-aimed) | "Prophets and apostles you buy start with one extra charge." | One more charge on prophets and apostles for each ten points. |
| III | The Caliphate (a rule) | The Two Swords | No change. "+1 happiness for every two points of spare authority." | +1 happiness for each two points. |
| III |  | Commission: The Anointing (re-aimed) | "Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture." | At 10 spare: the capital's rite is kept by every town. |
| III |  | The Holy Inquisition (re-aimed) | "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." | Holy sites press 1 harder for each four points. |
| IV |  | The Commander of the Faithful | No change. "+3 faith and +3 culture for each point of spare authority." | +3 faith and +3 culture for each point. |

- Each pay-off gives a different thing: yields in one town, unit charges, happiness, a rule, pressure, and faith with culture. They add to each other and do not repeat.
- Three of them tie authority to religion in play: more acts for each unit, the realm rite, and a stronger tide.
- With The Missi Dominici in a Dominion or Expansionist pair, Tier II has three readers.

**Spare authority after the change (estimate, from the table of section r3-9 of the design pass of 2026-11-20).**

| A realm of devout towns in age 4 | Today | After |
|---|---|---|
| 10 towns under The Caliphate | 20 spare | 10 |
| 10 towns, a Mosque in each | 30 | 20 |
| 20 towns, a Mosque in each | 45 | 25 |

At 20 spare the pay-offs give: +40 production and +40 science in the holy city, two more charges on each prophet and apostle, +10 happiness, the realm rite, +5 pressure from each holy site, +60 faith and +60 culture, and +20% production, faith and culture. That is more to do with less authority.

---

## 5. The cards that change

### 5.1 The Holy Inquisition (re-aim)

| Field | |
|---|---|
| Name | The Holy Inquisition (Tier III, uncommon; no change) |
| Today (live) | "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." |
| Proposed | "Rival religions press your towns 80% less. Your holy sites press 1 harder for every four points of spare authority." (proposed) |
| Age goal | Age 3: hold a wide empire together, and push the religion past its borders. |
| Theme and role | Devout towns and authority: a pay-off (multiply). It was the third copy of the belief's supply line. |
| Role | Pay-off. Floor: the 80% is the deck's safety net with no authority at all. Ceiling: 20 spare gives +5 on a base of 6 for each holy site. |
| Councils | Late: The Caliphate, The Two Swords, The Holy Inquisition, The Living Hymnal, Pentecost. The state pushes the faith abroad. |
| Attention | None added. The pressure list shows the line. |
| Power | A holy site turns a citizen in each town in range every 1.7 turns today, and every 0.9 turns at 20 spare (estimate). It is worth what the towns turned are worth: 4 gold each from the share, and the cards that count them. |
| Synergy | Raises: towns that follow, at home and abroad. Reads: spare authority, holy sites. Fed by: Inquisition, the Mosque, The Caliphate, Local Clerks, Tyranny, The Forbidden City, The Anchorites (more sites). Feeds: The Living Hymnal, The Pilgrim Towns, The Defenders of the Faith, Mission Houses, Congregation, the founder's share. |
| Displaces | Its own old text. A seat loses about 10 authority at 10 towns. |
| Condition | It needs a holy site and spare authority. |
| Shape | **Small extension:** the pressure rule `siteStrength` with a scale by a count. The Zealots' combat line has the same kind of scale. |
| Type | Civic |

### 5.2 Commission: The Anointing (re-aim)

| Field | |
|---|---|
| Name | Commission: The Anointing (Tier III, uncommon; no change) |
| Today (live) | "Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture." |
| Proposed | "Goal: hold 10 spare authority. Reward: a rite your capital starts is kept by every town you hold." (proposed) |
| Age goal | Age 3: the tall-or-wide step. |
| Theme and role | Authority: a pay-off that is a rule. It is also a bridge to rites, which authority does not touch today. |
| Role | Build-defining. Floor: one rite price for the whole realm, in any seat that reaches 10 spare. Ceiling: every card that reads towns keeping a rite, in every town. |
| Councils | Late: it stands in for The Rites Commonwealth in a seat that missed it in Tier I, and it frees that chair in a seat that has it. A commission leaves its chair. |
| Attention | None added. The capital starts the rite, as under The Rites Commonwealth. |
| Power | The first pass priced the realm rite at 392 a turn in a committed age 3 seat (estimate). The old reward paid 60 at 10 towns. |
| Synergy | Raises: towns keeping a rite. Reads: spare authority. Fed by: every source of authority. Feeds: The Psalter, The Rogations, The Priest-Astronomers, The Festival Calendar, Feast Days, Ecclesia, The Vigil. |
| Displaces | Nothing: it leaves its chair. |
| Condition | 10 spare authority. After section 4 that is 10 devout towns, or fewer with Mosques. |
| Shape | **Existing shape:** a lasting reward that carries the rule `capitalRiteOverRealm`. To check: that a commission's lasting list accepts a rule. |
| Type | Wildcard |

### 5.3 The Second Prophet (re-aim)

| Field | |
|---|---|
| Name | The Second Prophet (Tier II, uncommon; no change) |
| Today (live) | "Prophets and apostles you buy start with one extra charge." |
| Proposed | "Prophets and apostles you buy start with one more charge, and one more again for every ten points of spare authority." (proposed) |
| Age goal | Age 2 and 3: commit to the religion. |
| Theme and role | The spreading faith: supply of acts. Authority: a pay-off. It is the join between the two. |
| Role | Pay-off. Floor: today's card. Ceiling: at 20 spare an apostle has five charges. |
| Councils | Early: The Patriarchate, The Second Prophet, Mission Houses, The Living Hymnal, The Settled Faith. |
| Attention | Fewer units do more acts, which is the direction the skill asks for. |
| Power | At 20 spare one apostle (about 130 faith) does five acts where it did two. Under Reliquaries that is five relics. |
| Synergy | Raises: acts by religious units. Reads: spare authority. Fed by: the sources of authority. Feeds: The Pulse of Bells, Reliquaries, The Field Mass, Pentecost, The Mission, The Anchorites (a prophet with four charges founds two further holy sites). |
| Displaces | Its own old text. |
| Condition | None beyond the price of the units. |
| Shape | **Small extension:** the `unitStat` charges line with a scale by a count. |
| Type | Civic |

A prophet with four charges can gain two beliefs. That is intended: authority then buys a religion faster.

### 5.4 Mission Houses (re-aim)

| Field | |
|---|---|
| Name | Mission Houses (Tier II, common; no change) |
| Today (live) | "Your proclamations reach 50% farther and are 50% more effective in foreign cities." |
| Proposed | "Gains +3 gold and +3 culture each time a foreign town turns to your religion." (proposed) |
| Age goal | Age 2 and 3: commit to the spread. |
| Theme and role | The spreading faith: the scaler that the theme lacks in Tiers I and II. |
| Role | Pay-off. Floor: two towns turned give +6 and +6. Ceiling: twenty give +60 and +60, with no limit. |
| Councils | Early and late: it stays seated, and The Long Memory (generic) doubles each gain. |
| Attention | The card shows its count. The player already chooses where to proclaim. |
| Power | A regular Tier II card pays 35 to 60. It reaches that at six to ten towns turned. |
| Synergy | Raises: gold and culture. Reads: foreign towns turned (the tally that The Mission counts). Fed by: proclamations, holy sites, trade routes under The Long Road, rites under Ecclesia, Pentecost, The Holy Inquisition (re-aimed), Joan of Arc's kills. |
| Displaces | Its own old text, which The Pulse of Bells (old) nearly repeated. |
| Condition | It counts a town once a turn at most (the live limit on the moment). A town that is purged and turned again counts again. |
| Shape | **Existing shape:** `pays` on the `tally` count with `foreignCityConverted`, as The Rogations has for rites. |
| Type | Civic |

### 5.5 Smaller changes

| Card | Today (live) | Proposed | Size |
|---|---|---|---|
| Commission: The State Church (II, uncommon) | "Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns." | Reward: "+1 happiness for every devout town." The authority half goes, because the belief Inquisition is that line. | Text and number change |
| The Learned Clergy (III, uncommon), The Sacred Bequests (III, common), The Tithe of Nations (IV, uncommon), The Theoric Fund (Doctrine I) | The Learned Clergy: "+2 science and +2 culture for every 10 faith your empire makes each turn." The Sacred Bequests: "Spending faith grants science equal to a fourth of it." The Tithe of Nations: "Gain 1 faith each turn for every two citizens in the world who follow your religion." The Theoric Fund: "+1 culture for every 3 faith your empire makes." | Retired (section 2.3). | Retired rows |
| The Patriarchate (II) | New | "Your holy city gains +2 production and +2 science for each point of spare authority." Settled in the first pass. | Existing shape |
| The Bell Towers (II, common) | "Unlocks the Bell Tower, a faith building: +1 faith, and its town presses your religion +1 harder for each faith building it holds." | Retired, settled in the first pass. | Retired row |
| The founder's share | +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle` in `data/religion.json`). | "Each foreign town that follows your religion pays you +1 gold for every two citizens." Section 3.4. | Data row |

**Tier counts after both passes.** Tier II stays at 22 (The Patriarchate in, The Bell Towers out). Tier III goes from 21 to 19. Tier IV goes from 10 to 9.

### 5.6 Combinations this opens, each through a general quantity

- **Rites that spread.** A realm rite under Ecclesia presses from every town at once, each ten turns. With Feast Days the rites pay for themselves. With Pentecost each town turned presses again.
- **Authority that preaches.** Spare authority gives charges (The Second Prophet) and pressure (The Holy Inquisition). Towns turned at home are devout, and they give authority through Inquisition.
- **A wide church pays twice.** Each foreign town pays gold by its size, raises Mission Houses, and brings a citizen home once.
- **The count of faith spent.** Every apostle, rite and purchase raises Patron of Merchants and The Book of Life for good.
- **Buildings that supply faith from age 1.** Keeper of the Hearth, then The Temple Workshops, then The Quiet Hours at the founding, then relics, then the faith houses.
- **Deliberately strong:** The Pulse of Bells with five-charge apostles; Ancestor Worship with The Sovereign Writ (the bonus with no ceiling on production, faith and culture); Congregation in a world of many small towns.

---

## What I could not verify

- **All power figures.** Nothing was run. The seat sizes are those of the first pass.
- **Keeper of the Hearth.** `buildingSuppliesFrom` counts a building whose "package" pays faith. I did not check which form of card line joins a building's package: The Monastery Libraries pays a town that has a Library, and that may not be a line on the Library. If it does not join, the god needs the form that does, or a small extension.
- **The Alms Box.** The purchase riders read a town's follower beliefs. I did not check that the rule `faithBuysBuildings` can be read the same way.
- **The Pulse of Bells.** `proclamationMade` and the `timed` grant both exist. I did not check that a timed grant can land on every own town in the reach.
- **Reliquaries.** A relic is left only in the owner's town (the live refusal says so). I did not read how the Cathedral requirement is written.
- **Congregation.** The grant `citizens` with `toCapital` is live on a Dominion row. I did not check it on the `townConverted` moment, or what happens when the capital has no room to work another hex.
- **Ecclesia, Congregation and The Pulse of Bells are enhancer rows that carry a windfall rider.** No live enhancer does. I did not check that the founder's rows reach the windfall reader.
- **Ancestor Worship.** I read the tier function in `meters.ts`, not the place where the authority bonus picks its yields.
- **The scaled lines of The Holy Inquisition and The Second Prophet.** The scale exists on combat lines. I did not check that a pressure rule or a unit stat can take one.
- **Commission: The Anointing.** I did not check that a commission's lasting reward can carry a rule.
- **Whether rival pressure can go below zero, and whether a price has a floor.** Both are open from the first pass.
- **The price of Knights Templar and of the third and fourth prophets.** Both are my arithmetic from the data.
- **How the bots value any of this.** Every re-aimed row needs a value from Astra.
- **The sync tests.** `docs/beliefs.md` and the Devotion sheet mirror the data, so each change here is a row change in both.

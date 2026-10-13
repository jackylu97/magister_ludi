# The Dominion deck

**What it rewards:** An army that pays for itself. Training, keeping and using units sustains a working state, and peace, defence, raiding and conquest are different ways of using the same strength. **Directions inside it:** garrisons and military buildings as the civic base; training and fighting that teach; the barbarian frontier and raiding; conquest and holding provinces; unit quality and logistics; great generals and citadels; naval force; a won war that ends in reparations.

**Gap:** developing its own cities, because its production goes into the army. It plays around the gap in two ways: its military buildings pay civic yields, and conquest brings in cities other empires have already developed.

This sheet is the design of record for the deck: what is in the game today, and what is not in yet. History lives in git. `test/sim/decks/dominion.test.ts` checks the five tier tables against `data/decks/dominion.json`, card for card (name, rarity, tier, and the text in the "In the game" column), and that every row left off the sheet is retired.

**Status:**
- **live**: in the game as the "In the game" column prints it. A "Built as" note says where the game does something slightly different from the text.
- **changing**: in the game, with a revision by the user (2026-10-13) that is not built yet, or one that follows from a ruling of theirs. The "In the game" column is what plays today; the revision is in the last column.
- **deferred**: in the data but not dealt, because the effect needs something the game does not have yet (the last column says what).
- **new**: designed but not in the data at all.

Ideas under discussion that are not yet part of the deck (the 2026-10-13 proposal, the five-card draft, the brainstorm) are in `docs/plans/dominion-ideas.md`. The design method is the `card-design` skill (`.claude/skills/card-design/`).

## What stands

| Tier | Cards | Live | Changing | Deferred | New |
|---|---|---|---|---|---|
| Tier 0 | 16 | 5 | 6 | 0 | 5 |
| Tier I | 13 | 11 | 2 | 0 | 0 |
| Tier II | 14 | 12 | 0 | 2 | 0 |
| Tier III | 8 | 7 | 0 | 1 | 0 |
| Tier IV | 15 | 13 | 0 | 2 | 0 |
| **All** | **66** | **48** | **8** | **5** | **5** |

Plus 24 cards shared with another deck (below): 17 live, 1 changing, 1 deferred, 5 new.

### How the shelf is weighted (cards in the data)

| Tier | Common | Uncommon | Rare |
|---|---|---|---|
| Tier 0 | 8 | 0 | 3 |
| Tier I | 7 | 3 | 3 |
| Tier II | 6 | 6 | 2 |
| Tier III | 2 | 4 | 2 |
| Tier IV | 0 | 3 | 12 |

## Tier 0

| Card | Rarity | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|
| **Blooded Spears** | common | changing | +4 strength against barbarians. Clearing a camp grants 25 production and 25 food to your nearest city. | **Changing to:** Military units gain +2 strength, doubled against barbarians. |
| **Martial Law** | common | changing | Each garrisoned unit grants its city +1 happiness and +2 food. | **Changing to:** Each garrisoned unit grants its city +1 happiness and +3 food. |
| **Muster Rites** | common | changing | Training a unit grants 6 faith and 6 food. | **Changing to:** Gaining a unit grants 8 faith and 8 food. |
| **Commission: Clear the Frontier** | common | live | Commission. Clear two barbarian camps while this card is seated. Then gain 60 production in your capital and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. |  |
| **The Standing Army** | rare | live | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |  |
| **Blood Brothers** | rare | live | A barbarian unit you kill joins your side. |  |
| **The King's Levy** | rare | live | Every fifteen turns your capital raises a melee unit for free. It counts as trained and costs no upkeep. | Wording: "counts as trained" becomes unnecessary under the "gained" ruling (2026-10-13). |
| **The Horse Herds** | common | changing | Worked pastures and camps give +1 production. +20% production toward mounted units. | **Changing to:** Worked pastures and camps give +1 food and +1 production. |
| **Battle Honours** | common | changing | Your first kill each turn grants 6 renown, and clearing a barbarian camp grants 12 renown, both favouring great generals. | **Changing to:** Commission. Kill ten units while this card is seated. Then choose a great general from a draft. The card leaves its chair. |
| **Sword and Plough** | common | changing | While at peace, each city with a garrison gains +2 culture. While at war, each gains +2 production instead. | **Changing to:** Each city with a garrison gains +2 culture and +2 production. |
| **The Camp Chaplains** | common | live | +1 faith for every unit you control. |  |

## Tier I

| Card | Rarity | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|
| **March Discipline** | common | live | Military units gain +1 movement when starting their turn in your territory. |  |
| **The Quartermasters** | common | live | Worked strategic resources gain +3 food and +3 production. |  |
| **The Soldiers' Purse** | common | live | Military units cost 1 less upkeep. |  |
| **The War Hall Schools** | common | live | War Halls give +5 science and +5 culture. |  |
| **Drill Manuals** | common | live | Barracks and Stables give +3 science. +30% production toward Barracks and Stables. |  |
| **The General Staff** | common | live | Cities with a Barracks give +2 renown a turn, favouring great generals. |  |
| **The Soldier-Farmers** | common | live | While at peace, garrisoned cities gain +2 food and +2 production on each worked pasture and camp. |  |
| **The Marshals** | uncommon | live | +2 strength per adjacent friendly combat unit, at most +6. |  |
| **The Pacified Marches** | uncommon | changing | While slotted, gains +1 authority capacity and +5 culture for every barbarian camp cleared, at most +8 authority and +40 culture. | **Changing to:** Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. |
| **The Art of War** | uncommon | changing | Training a unit grants science equal to three quarters of its strength. | **Changing to:** Gaining a unit grants science equal to three quarters of its strength. ("Gained" ruling, 2026-10-13.) |
| **War Foundries** | rare | live | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. |  |
| **Songs of the Fallen** | rare | live | Killing a unit grants science and culture equal to twice its strength. Losing a unit while it defends grants the same. |  |
| **Horse Lords** | rare | live | Mounted units gain +3 strength and +1 movement. |  |

## Tier II

| Card | Rarity | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|
| **Siege Works** | common | live | +38% production toward siege units. Siege units gain +4 strength against cities. |  |
| **Armoury Guilds** | common | live | Armouries give +5 science and +5 culture. Cities with one gain +15% production toward buildings. |  |
| **Conquered Archives** | common | live | Captured cities gain +6 science and +6 culture. |  |
| **Stockpiles** | common | live | Cities gain +8 food per defensive building. |  |
| **Triumphs** | common | live | Capturing a city grants culture equal to fifteen times its population. |  |
| **The Citadel Works** | common | live | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. |  |
| **Marine Drill** | uncommon | live | Naval melee units gain +4 strength. Land units attacking on the turn they disembark gain +3 strength. |  |
| **Riders of the Steppe** | uncommon | live | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |  |
| **Spoils of War** | uncommon | live | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. |  |
| **The Relay Stations** | uncommon | deferred | Once a turn, a military unit that starts its turn in a city connected to your capital may move to any other connected city, ending its move there. | Needs a new order on the map: moving a unit between two connected cities. |
| **War Reparations** | uncommon | deferred | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. | Needs an occasion when peace is signed, and a record of the cities each side took during a war. |
| **Commission: Take the City** | uncommon | live | Commission. Capture a city with at least five citizens. Then gain culture and science equal to twenty-three times its population, and a free Barracks in that city. The card leaves its chair. | Built as: any city captured by force counts (the five-citizen floor is not checked), the pay is fifteen times the citizens of the cities captured that turn, and the free Barracks is not given. |
| **Hegemony** | rare | live | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. |  |
| **Master Bowyers** | rare | live | Ranged and siege units gain +1 range. |  |

## Tier III

| Card | Rarity | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|
| **Standing Garrisons** | common | live | Per garrisoned unit, the city gains +12% production and +12% culture. |  |
| **Arsenals** | common | live | Cities with an Armoury gain +30% production and produce ships 75% faster. |  |
| **The Siege Train** | uncommon | live | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |  |
| **Reserve Officers** | uncommon | live | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. |  |
| **Defensive Lines** | uncommon | live | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. |  |
| **Naval Supremacy** | uncommon | live | Naval units gain +1 sight and +1 range. Coastal cities gain +30% gold; coastal captured cities +60%. |  |
| **Total War** | rare | live | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. |  |
| **Commission: A Victor's Peace** | rare | deferred | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain 300 gold and 300 culture, and every city gains +2 happiness for twenty turns. The card leaves its chair. | Needs occasions when peace is signed and when an empire is destroyed, and the record of cities taken that War Reparations needs. |

## Tier IV

| Card | Rarity | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|
| **Imperium** | rare | live | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. |  |
| **Commission: Hold the Capitals** | rare | live | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. | Built as: an empire's own first city, lost and retaken, also counts as an original capital held. |
| **Spolia** | rare | live | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. | Built as: the production goes to your city raising the Opus, or to your capital if none is, instead of being kept for later. |
| **The Legions' Labour** | rare | deferred | Disbanding a military unit in a city building a wonder or the Magnum Opus adds half the unit's production cost toward it. Units raised for free add nothing. | Needs disbanding a unit to pay into the city's current wonder or Opus (it pays nothing today). |
| **The Praetorian Guard** | rare | live | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. |  |
| **The Grand Army** | rare | live | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. |  |
| **The Annexed Provinces** | rare | live | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. |  |
| **The Marshalate** | rare | live | Each great general you have called gives your military units +1 strength, at most +5. Citadels give +3 culture and +3 production. |  |
| **The Military Frontier** | rare | live | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. |  |
| **The Nation in Arms** | rare | live | Every ten turns, each city with an Armoury raises the best melee unit you can build. They count as trained and cost no upkeep. | Wording: "counts as trained" becomes unnecessary under the "gained" ruling (2026-10-13). |
| **Circumvallation** | uncommon | deferred | While a rival city is under siege with at least one of your units beside it, it adds no production toward a Magnum Opus. You can see which rival cities are raising one. | Needs a rival city's Opus production to stop while it is besieged, and sight of which rival cities are raising one. |
| **The Grand Coalition** | rare | live | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. |  |
| **The Proconsuls** | uncommon | live | Captured cities with a garrison cost no authority and gain +10 defence. | Built as: each captured city with a garrison gives +4 authority capacity, which cancels what it costs. |
| **Commission: The Grand Campaign** | uncommon | live | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. | Built as: the reward reads the citizens of every captured city you hold when the goal is met, not only the three captured while seated. |
| **Commission: The Captured Marvel** | rare | live | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then gain science and culture each equal to twenty times its population, plus 200 of each for every world wonder in it. The card leaves its chair. | Built as: the population and wonders are those of the cities captured on the turn the goal is met; your own first city retaken also counts as an original capital. |
## New cards, not yet in the game

The user's ideas (2026-10-13), not named yet. None is in the data.

| Card | Tier | Text | Notes |
|---|---|---|---|
| *unnamed* | 0 | +1 authority for each garrisoned unit. | |
| *unnamed* | 0 | Scouts gain +1 sight. Discoveries grant +8 production to every city. | Two effects as written. |
| *unnamed* | 0 | +30% production toward first- and second-age military units. | Fades as the army moves on to later ages' units. |
| *unnamed* | 0 | While slotted, this card gains +1 science and +1 culture each time you gain a unit. It starts at +2 science and +2 culture. | A card that grows while seated. Reads every unit gained, under the "gained" ruling (2026-10-13). |
| *unnamed* | 0 | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 15 culture. | Two effects as written. |

## Cards Dominion shares with another deck

The shared rows live in `data/decks/common.json`; the "In the game" column is their text there. A Dominion seat may draw every one of these, and so may a seat holding the deck named beside it, so a change here is felt in two decks. Listed in tier order.

| Card | Rarity | Also in | Tier | Status | In the game | Not yet in, or how it was built |
|---|---|---|---|---|---|---|
| **Rites of Passage** | common | Devotion | 0 | changing | Completing a military unit grants 12 faith. | **Changing to:** Gaining a military unit grants 12 faith. ("Gained" ruling, 2026-10-13.) |
| **Military Colonies** | uncommon | Expansionist | I | live | Cities with a Barracks gain +45% production toward settlers and workers. |  |
| **The Escorted Roads** | uncommon | Commerce | I | live | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. |  |
| **The Sacred Host** | rare | Devotion | I | live | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. |  |
| **Field Academies** | uncommon | Scientific | I | live | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. |  |
| **Copying the Enemy** | uncommon | Scientific | I | new | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. | Not in the data yet. Needs a kill payout that reads the defeated unit and pays toward the technology that unlocks it. |
| **The Barbarian Frontier** | uncommon | Expansionist | I | live | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. |  |
| **The Oriflamme** | uncommon | Devotion | I | live | Military units beside one of your religious units gain +4 strength. |  |
| **The Sword of State** | common | Magisterial | I | new | On draft: the best melee unit you can build is trained in your capital. Seated, this card does nothing. | Not in the data yet. Needs on-draft boons (shared with Magisterial). |
| **Carried-Off Scholars** | common | Scientific | II | new | Capturing a city grants science equal to ten times its population. | Not in the data yet. Fits existing effects (the capture payout Triumphs uses). |
| **Examinations of State** | rare | Magisterial | II | live | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. |  |
| **The Road Garrisons** | uncommon | Expansionist | II | live | Garrisoned cities with a road to your capital gain +5 food and +5 defence. |  |
| **Marcher Lords** | uncommon | Expansionist | II | live | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. |  |
| **The Crusader Orders** | uncommon | Devotion | II | live | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | Built as: capturing a city presses 30 of your religion's pressure into it at once; whether it converts depends on the faith already there. |
| **Convert It or Tax It** | uncommon | Devotion | II | live | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. |  |
| **Looted Art** | uncommon | Magisterial | II | new | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Not in the data yet. Needs a capture payout counted on the works and wonders inside the captured town. |
| **Letters of Marque** | rare | Commerce | III | live | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. |  |
| **The Engineer Corps** | uncommon | Scientific | III | live | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. |  |
| **Mercenary Contracts** | uncommon | Commerce | III | deferred | Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns. | Needs a hired unit that leaves the game on its own after a set number of turns. |
| **War Bonds** | uncommon | Commerce | III | live | Military units gain +1 strength for every 150 gold in your treasury, at most +5. |  |
| **Professional Soldiers** | uncommon | Commerce | III | live | Units you purchase gain +3 combat strength. | Built as: a unit bought while this card is held gains the strength when it is created and keeps it for life. |
| **The Chartered Company *(charter)*** | uncommon | Commerce | III | live | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Built as: the Company Guard is a melee unit of strength 66, sold for a flat 1,600 gold in a city with a Barracks, opening late in the last age. |
| **The Holy Army** | uncommon | Devotion | III | live | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. |  |
| **The New Code** | rare | Magisterial | III | new | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Not in the data yet. Needs a draft opened by an occasion (Magisterial's reward hands). |

## Synergies with other decks

Dominion's currency is units, spent on garrisons, raids and conquest. Its hooks for partners are captured cities, cleared camps, kills and battles won, reparations, garrisons, and great generals with their citadels. Its main improvement family is strategic resources (on mines, pastures and camps), camps and pastures.

### Dominion · Expansionist (the frontier)
- **Dominion gives** cleared ground: burnt barbarian camps and captured towns leave land to claim. **It gets back** levies (citizens turned into soldiers) and newly founded towns that need garrisons.
- **Hooks Dominion creates:** cleared camps (Blooded Spears, Blood Brothers, The Pacified Marches, Commission: Clear the Frontier, The Barbarian Frontier) and captured towns (Triumphs, Hegemony). **Hooks it reads:** towns founded near a border (Marcher Lords), settlers trained at a Barracks (Military Colonies) and garrisoned towns on a road to the capital (The Road Garrisons). Veteran colonies (a unit retiring into a town) is left to Expansionist's own Veteran Colonies, since it pays the town in food, Expansionist's currency.
- **Shared improvements:** mines on strategic resources. Expansionist works them for production; Dominion counts them for its army (The Quartermasters). Pastures and camps sit on both families' edges through The Soldier-Farmers.
- **Cards serving the pair:** The Barbarian Frontier (shared, new), The Road Garrisons (shared, new), Military Colonies, Marcher Lords, The Soldier-Farmers, The Relay Stations, The Pacified Marches, The Quartermasters.

### Dominion · Commerce (merchants and their guards)
- **Dominion gives** protected trade routes, gold from naval raids, and reparations from defeated empires. **It gets back** purchases: gold buys the buildings an army has no production to spare for, and units in an emergency.
- **Hooks Dominion creates:** reparations paid in gold (War Reparations, Commission: A Victor's Peace), naval kills paid in gold (Letters of Marque), guarded routes (The Escorted Roads), and Barracks that turn production into gold (War Foundries). **Hooks it reads:** a gold reserve (the shared War Bonds) and units bought with gold (the shared Mercenary Contracts and The Chartered Company).
- **Shared improvements:** mines on strategic resources: iron and copper are an army's metal for Dominion and a source of gold for Commerce.
- **Cards serving the pair:** The Escorted Roads, Letters of Marque, War Bonds, Mercenary Contracts, The Chartered Company, War Foundries, War Reparations, Commission: A Victor's Peace, Naval Supremacy.

### Dominion · Devotion (the holy war)
- **Dominion gives** spread by conquest: captured cities and battles won, with religious units travelling beside the army. **It gets back** targets (cities following Devotion's religion) and faith that buys and supplies the army.
- **Hooks Dominion creates:** captured cities and battles won (every capture card on the sheet). **Hooks it reads:** cities following your religion (Convert It or Tax It, The Crusader Orders), religious units (The Oriflamme), holy sites beside citadels (The Holy Army) and faith purchases (The Sacred Host).
- **Shared improvements:** camps and pastures, including horses, camels and ivory (The Soldier-Farmers, The Quartermasters, The Horse Herds).
- **Cards serving the pair:** The Oriflamme, Convert It or Tax It and The Holy Army (all three shared since the balance pass), Muster Rites, The Camp Chaplains, The Sacred Host, Rites of Passage, The Crusader Orders.

### Dominion · Scientific (the military edge)
- **Dominion gives** science from fighting, and captured cities with their libraries and universities. **It gets back** units ahead of their age from Scientific's charters.
- **Hooks Dominion creates:** science from kills and training (Songs of the Fallen, The Art of War, Field Academies) and captured cities that keep paying science (Conquered Archives). The shared Copying the Enemy and Carried-Off Scholars read these kills and captures.
- **Shared improvements:** strategic resources, all of them. Dominion builds its army on them (The Quartermasters); Scientific's charters unlock the units that use them.
- **Cards serving the pair:** Field Academies, The Engineer Corps, Copying the Enemy, Carried-Off Scholars, Drill Manuals, The War Hall Schools, Armoury Guilds, Conquered Archives, Songs of the Fallen, The Art of War, Siege Works, The Annexed Provinces. The "siege engineers for hire" line is carded on Scientific's sheet.

### Dominion · Magisterial (the triumph)
- **Dominion gives** great generals and the citadels they build, which Magisterial's any-family cards reward like any other work, and conquests that are moments worth marking. **It gets back** draft boons that fill an army's gaps and wonders that pay out across the empire.
- **Hooks Dominion creates:** generals (Battle Honours, The General Staff, The Citadel Works, The Marshalate, Commission: Hold the Capitals, Commission: The Grand Campaign), citadels (The Citadel Works, The Marshalate), and captures, which the shared The New Code and Looted Art read. **Hooks it reads:** garrisoned towns with a Monument (Examinations of State) and Magisterial's on-draft boons (the shared The Sword of State, a unit on draft that counts as trained).
- **Shared improvements:** citadels, which are Dominion's fortress and one of Magisterial's works.
- **Cards serving the pair:** The Sword of State (shared, new; the pair's Tier I card), The General Staff, The Citadel Works, The New Code, Looted Art, Examinations of State, Triumphs, Commission: Hold the Capitals, The Marshalate, Commission: The Captured Marvel (captured wonders, the same reading Looted Art needs).

## Open questions

- **The Engineer Corps** (shared with Scientific): Scientific recommends cutting it, or cutting it to its first clause, because its three clauses are unrelated and its faster siege production repeats Field Academies. Dominion keeps it.
- **The Imperial Examinations** and **Triumphal Arches** (shared with Magisterial) were cut on both sheets at the 2026-10-06 reconciliation, but they are still in the data: The Imperial Examinations is live and dealt, and Triumphal Arches is deferred. They wait on the user's review of the Magisterial sheet, then either return to this sheet or are retired.

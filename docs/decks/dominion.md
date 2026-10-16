# The Dominion deck

The deck's cards, by tier: name, rarity, status and ability. This sheet is the spec of record for the deck, and `test/sim/decks/dominion.test.ts` checks it against `data/decks/dominion.json`.

- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (your revision), `replaced` (a new card takes over the row), `reworked` (ruling 6 of 2026-10-15), `wording` (the text changes, the effect does not), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text). The ability shown is the target.
  - `add`: not in the data yet. `add: reworked` is one of your ideas reworked for ruling 6; `add: rule-breaker` is one of the rule-breaking cards added for ruling 4.
  - **(was …)** names the data row a renamed card takes over, or your earlier name for a reworked idea.
- **Doctrines:** tiers I to IV each list Dominion's Doctrines for one government tier. A Doctrine is held for the whole game and takes no chair. Adopting a government offers Doctrines of that government's tier, drawn from both of the seat's decks (ruled 2026-10-15, `docs/flags.md` (vvvvvv)). Since 2026-10-16 that offer is all a new government brings: it no longer comes with a hand of rare cards. Tier I's Doctrines come with the tier-4 governments, Tier II's with tier 10, Tier III's with tier 18 and Tier IV's with tier 29. The tier-38 governments were meant for a fifth age and are left unimplemented (ruled 2026-10-16, and the pairing confirmed the same day). None is in the data yet. Their tables have three columns, and the sync test skips rows with fewer than four cells, so it reads only the card tables.
- **Type:** the last column of each card table says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard**. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. The sorting rules and every government's chairs are in `docs/plans/doctrines-governments-chairs.md`, section 4. The sync test checks this column against each card's `type` in the data, the shared table's cards included.
- **Why each card is here:** `docs/plans/dominion-builds.md`: the four builds, the rulings of 2026-10-15, and the reworks and new rule-breakers.
- **The long form** (the old notes, the "built as" details, the synergy section): `docs/decks/reference/dominion-2026-10-15.md`. Ideas not on the sheet: `docs/plans/dominion-ideas.md`.

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 18 | 1 | 7 | 26 | none |
| Tier I | 17 | 0 | 5 | 22 | 5 |
| Tier II | 18 | 4 | 9 | 31 | 5 |
| Tier III | 17 | 1 | 6 | 24 | 3 |
| Tier IV | 12 | 7 | 2 | 21 | 3 |
| **All** | **82** | **13** | **29** | **124** | **16** |
| Shared | 20 | 1 | 6 | 27 |  |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 10 | 6 | 8 | 2 |
| Tier I | 7 | 7 | 8 | 0 |
| Tier II | 12 | 7 | 10 | 2 |
| Tier III | 11 | 3 | 9 | 1 |
| Tier IV | 9 | 3 | 5 | 4 |
| **All** | **49** | **26** | **40** | **9** |
| Shared | 11 | 8 | 7 | 1 |

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Blood Brothers** | rare | implemented | A barbarian unit you kill joins your side. | Military |
| **Commission: Clear the Frontier** | common | modify: revised | Commission. Clear two barbarian camps while this card is seated. Then gain 2 population in your capital, and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. | Wildcard |
| **Blooded Spears** | common | implemented | Military units gain +2 strength, doubled against barbarians. | Military |
| **Muster Rites** | common | implemented | Gaining a unit grants 8 faith and 8 food. | Civic |
| **The Horse Herds** | common | implemented | Worked pastures and camps give +1 food and +1 production. | Economic |
| **Battle Honours** | common | implemented | Commission. Kill ten units while this card is seated. Then choose a great general from a draft. The card leaves its chair. | Wildcard |
| **Sword and Plough** | common | implemented | Each city with a garrison gains +1 culture and +2 production. | Economic |
| **The Camp Chaplains** | common | implemented | Killing a unit grants faith equal to its strength. | Civic |
| **The Standing Army** | uncommon | implemented | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. | Military |
| **The King's Levy** | rare | implemented | Every fifteen turns your capital raises a melee unit for free. It costs no upkeep. | Military |
| **The Grain Tribute** | common | implemented | +1 food and +1 production in every city. | Economic |
| **The Drill Grounds** | common | implemented | Units standing in your towns gain 1 experience every 4 turns. | Military |
| **The Scaling Ladders** | common | implemented | Melee units gain +4 strength against towns. | Military |
| **The Funeral Games** | common | implemented | When one of your units falls, gain faith equal to its strength. | Civic |
| **The Bards' Praise** | common | implemented | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 15 culture. | Civic |
| **The Cattle Raid** | common | implemented | Clearing a barbarian camp gives every city +3 food for ten turns. Clearing another restarts the ten turns. | Economic |
| **The Garrison Captains** | common | add | +1 authority for each garrisoned unit. | Civic |
| **The Spear Makers** | common | add | +30% production toward first- and second-age military units. | Military |
| **The Armed Colony** | common | implemented | A town founded beside one of your military units starts with three extra hexes, and that unit becomes a Veteran. | Economic |
| **The Outriders** | common | implemented | Claiming a discovery or clearing a barbarian camp grants 8 production to every town. | Economic |
| **The Captured Arms** | common | add: reworked | +1 science for every unit you have killed this game, no cap. | Civic |
| **The Gathering Host** | uncommon | add | While seated, this card gains +1 science and +1 culture each time you gain a unit. It starts at +2 science and +2 culture. | Civic |
| **The Armourers' Secret** | uncommon | add | While seated, researching a technology that unlocks a military unit grants one of that unit. | Military |
| **The Defiant Kingdom** | uncommon | add | While another empire holds more towns than you, you train military units 25% faster. | Military |
| **The Hunting Grounds** | uncommon | add | Barbarian camps within ten hexes of your cities spawn 50% faster. Your units gain +4 strength in your own territory. | Military |
| **The Campaign Annals** | rare | implemented | While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science. | Civic |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Marian Reforms** | drilled legions | Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected. |
| **The Steppe Confederacy** | steppe raiders | Negative authority no longer stops your borders growing. While authority is negative, gain +50% production toward mounted units. |
| **The Soldiers' Share** | conqueror | Capturing a town fully heals every unit of yours within three hexes and raises each by one rank. You can no longer found new cities. |
| **The Consular Roads** | conqueror | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. |
| **The Servian Reforms** | endless host | Your military units are 25% cheaper to build and to buy. Your units never gain experience. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Quartermasters** | common | implemented | Worked strategic resources gain +3 food and +3 production. | Economic |
| **The Soldier-Farmers** | common | implemented | While at peace, garrisoned cities gain +2 food and +2 production on each worked pasture and camp. | Economic |
| **The Marshals** | uncommon | implemented | +2 strength per adjacent friendly combat unit, at most +6. | Military |
| **War Foundries** | rare | implemented | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. | Economic |
| **Horse Lords** | rare | implemented | Mounted units gain +3 strength and +1 movement. | Military |
| **Martial Law** | common | implemented | Each garrisoned unit grants its city +2 happiness and +4 food. | Civic |
| **The General Staff** | common | implemented | Cities with a Barracks give +3 production and +2 renown a turn, favouring great generals. | Economic |
| **The Training Cadre** | common | implemented | Units gained in a town with a Barracks start with 2 experience. | Military |
| **The Marching Camps** | common | implemented | Attacking does not break your units' fortification. | Military |
| **The Soldiers' Purse** | common | implemented | Military units cost 1 less upkeep for each rank they hold. | Military |
| **Honours of the Legion** | uncommon | implemented | Each time one of your units earns a rank, gain science and culture equal to its strength. | Civic |
| **The Pacified Marches** | uncommon | implemented | Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. | Civic |
| **The Art of War** | uncommon | implemented | Gaining a unit grants science equal to three quarters of its strength. | Civic |
| **Songs of the Fallen** | rare | implemented | Killing or losing a unit grants science and culture equal to twice its strength. | Civic |
| **Walled Towns** | common | implemented | Towns with a defensive building, such as a Palisade or walls, gain +15% food. | Economic |
| **The Swift Riders** | uncommon | implemented | Mounted units may move after attacking. | Military |
| **The Open Muster** | uncommon | add | Passing a draft hand grants the best melee unit you can build in your capital. | Military |
| **The Captive Craftsmen** | uncommon | implemented | Gains +1 science and +1 production each time you pillage a hex. | Civic |
| **The Satraps** | uncommon | add | Garrisoned towns in unrest pacify twice as fast. | Civic |
| **The Sack** | uncommon | add | Razing a town you captured grants production, gold and culture equal to fifteen times its population. | Economic |
| **The Cleruchy** | uncommon | add | When drafted, gain a free settler in your capital. | Economic |
| **The Acropolis** | uncommon | add | +1 authority for each building in your capital. | Civic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Centurions** | drilled legions | Each Elite unit gives +3 strength to your units beside it, and costs 2 more upkeep. |
| **The Plunder Economy** | steppe raiders | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. |
| **The Strategoi** | drilled legions | +30% renown. Citadel yields and your great generals' strength aura are doubled. |
| **Weight of Numbers** | endless host | Your units gain +3 strength for each attack your units have already made on the same target this turn, at most +12. Your units cannot fortify. |
| **The Laws of Lord Shang** | endless host | While a town builds a military unit, its surplus food goes into the unit instead of into growth. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Siege Works** | common | implemented | +38% production toward siege units. Siege units gain +4 strength against cities. | Military |
| **Conquered Archives** | common | implemented | Captured cities gain +6 science and +6 culture. | Civic |
| **Stockpiles** | common | implemented | Cities gain +8 food per defensive building. | Economic |
| **Triumphs** | common | implemented | Capturing a city grants culture equal to fifteen times its population. | Civic |
| **The Citadel Works** | common | implemented | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. | Civic |
| **Riders of the Steppe** | uncommon | implemented | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. | Military |
| **Spoils of War** | uncommon | implemented | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. | Economic |
| **Hegemony** | rare | implemented | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. | Economic |
| **Master Bowyers** | rare | implemented | Ranged and siege units gain +1 range. | Military |
| **Armoury Guilds** | common | implemented | When one of your units falls, your nearest town with an Armoury gains production equal to its strength. | Economic |
| **The Longships** (was Marine Drill) | uncommon | modify: reworked | Your ships may pillage improvements on the shore beside them. | Military |
| **The Relay Stations** | uncommon | modify: deferred | Once a turn, a military unit that starts its turn in a city connected to your capital may move to any other connected city, ending its move there. | Military |
| **War Reparations** | uncommon | modify: deferred | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. | Economic |
| **Commission: Take the City** | uncommon | modify: as built | Commission. Capture a city with at least five citizens. Then gain culture and science equal to twenty-three times its population, and a free Barracks in that city. The card leaves its chair. | Wildcard |
| **The Fabricae** | common | implemented | Towns whose garrison is a Veteran or Elite gain +25% production. | Economic |
| **The Valetudinaria** | common | implemented | Units in your territory heal 15 more hit points a turn. | Military |
| **Living off the Land** | common | implemented | Military units outside your territory cost no upkeep. | Military |
| **The Longbowmen** | common | add | Ranged units gain +4 strength and +4 ranged strength. +5 culture each time they attack from range. | Military |
| **The Serried Ranks** | rare | implemented | Melee units beside another melee unit gain +10 strength when defending. | Military |
| **The Veterans' Roll** | uncommon | implemented | +1% science and culture for every rank your units have earned this game, at most +30%. | Civic |
| **The Conscription Rolls** | uncommon | implemented | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. | Military |
| **The Hall of the Slain** | uncommon | add | +1% production and culture for every two units you have lost this game, at most +30%. | Civic |
| **The Funeral Oration** | uncommon | add | Units you lose count half toward war weariness. | Civic |
| **The Sagas** | uncommon | implemented | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. | Civic |
| **The Provincial Census** | uncommon | add | Pacifying a town grants science equal to twenty times its population. | Civic |
| **Spear-won Land** | uncommon | add | +3% production and science for every town you have captured this game, at most +30%. | Civic |
| **The Castra** | uncommon | add | Your own hexes with a fortified military unit gain +1 science and +1 production. Citadels gain +3 production and +3 science. | Civic |
| **The Tactica** | uncommon | implemented | At the end of your turn, great generals give 1 experience to every unit beside them. Each time one of your units earns a rank, gain 15 science. | Military |
| **Double Time** | rare | add | Your Orders' effects that happen at the end of a turn or every few turns trigger twice. | Wildcard |
| **The State Forges** | rare | add | Each time you research a technology, your capital raises the best melee unit you can build. | Military |
| **War Feeds Itself** | rare | add | At the end of your turn, each of your units in enemy territory yields you its hex's yields. | Economic |

**Double Time** is also dealt in Tier III (ruled 2026-10-16).

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Total Mobilisation** | endless host | While at war, each town of six or more citizens raises the best melee unit you can build every five turns, for a citizen. While at peace, your towns grow 25% faster. |
| **Combined Arms** | conqueror | Your units gain +3 strength, doubled beside one of your siege units. Siege units beside one of your melee units cannot be attacked in melee. |
| **The Universal Monarchy** | conqueror | Towns you capture cost no authority. Towns you found cost twice as much. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Standing Garrisons** | common | implemented | Per garrisoned unit, the city gains +12% production and +12% culture. | Civic |
| **The Siege Train** | uncommon | implemented | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. | Military |
| **Reserve Officers** | uncommon | implemented | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. | Military |
| **Total War** | rare | implemented | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. | Military |
| **Commission: A Victor's Peace** | rare | modify: deferred | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain one extra Wildcard chair for the rest of the game. | Wildcard |
| **The Drill Masters** | common | implemented | Units you gain start as Veterans. | Military |
| **The Plunder Trains** | common | implemented | Pillaging grants 30 production and 15 food to your capital. | Economic |
| **The Yam** | uncommon | implemented | Mounted units heal fully when they pillage. | Military |
| **The Tagmata** | uncommon | implemented | Veteran and Elite units gain +5 strength. | Military |
| **Up Through the Ranks** | uncommon | implemented | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. | Civic |
| **The Arrière-ban** | uncommon | implemented | Declaring war gives every city +50% production for ten turns. Declaring war again restarts the ten turns. | Economic |
| **The Keshik** | uncommon | implemented | Mounted Veteran and Elite units gain +1 movement. | Military |
| **The Mural Crown** | uncommon | add | +10 renown each turn, favouring great generals. Each time you gain a great person, gain 100 science and 100 culture for each great general you have gained this game. | Civic |
| **The Victory Mint** | uncommon | implemented | Capturing a city grants gold equal to thirty times its population. | Economic |
| **The Bakufu** (was The King's Peace) | uncommon | add | A great general standing in a town gives it +25% science and +25% culture, and pacifies it at once. | Civic |
| **Interior Lines** | uncommon | implemented | A step along a road costs 40% less movement. A unit that has not moved this turn gains +4 strength when attacking. | Military |
| **Rally to the Standard** | uncommon | add: rule-breaker | Units you gain may appear beside any of your great generals. | Military |
| **Valhalla** | rare | add | When one of your units dies, gain 25 culture for each Monument in your empire. | Civic |
| **The Chevauchée** | rare | implemented | Pillaging a hex damages enemy cities within three hexes with 50% of the pillaging unit's strength. | Military |
| **Danegeld** | rare | add | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. | Civic |
| **The Devshirme** | rare | implemented | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. | Military |
| **Pax Romana** | rare | add | Towns you capture are pacified at once, and each costs 1 less authority to hold. | Civic |
| **The Regimental Schools** | common | implemented | At the end of your turn, each garrisoned unit gains 1 experience and gives its town +2 science. | Civic |
| **The Board of Ordnance** | common | implemented | While at war, each city with a Barracks gains +1 production and +1 science for every three citizens. | Civic |

**Also dealt here:** Double Time, from Tier II (ruled 2026-10-16).

## Tier IV

**Doctrines,** offered with the tier-29 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Fortress Empire** | drilled legions | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. |
| **The Scourge of God** | steppe raiders | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. |
| **The Landsturm** | endless host | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. Melee units gain +3 strength, doubled beside a great general. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Imperium** | rare | implemented | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. | Economic |
| **The Praetorian Guard** | rare | implemented | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. | Military |
| **The Grand Army** | rare | implemented | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. | Civic |
| **The Annexed Provinces** | rare | implemented | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. | Civic |
| **The Marshalate** | rare | implemented | Each great general you have called gives your military units +1 strength, at most +5. Citadels give +3 culture and +3 production. | Military |
| **The Military Frontier** | rare | implemented | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. | Civic |
| **The Grand Coalition** | rare | implemented | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. | Military |
| **The Proconsuls** | uncommon | modify: as built | Captured cities with a garrison cost no authority and gain +10 defence. | Civic |
| **Commission: The Grand Campaign** | uncommon | modify: as built | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. | Wildcard |
| **Circumvallation** | uncommon | modify: deferred | While a rival city is under siege with at least one of your units beside it, it adds no production toward a Magnum Opus. You can see which rival cities are raising one. | Military |
| **Commission: Hold the Capitals** | rare | modify: as built | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. | Wildcard |
| **Spolia** | rare | modify: as built | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. | Economic |
| **The Legions' Labour** | rare | modify: deferred | Disbanding a military unit in a town building a wonder or the Magnum Opus adds half its production cost toward it. Units raised for free add nothing, but units raised by a levy count. | Economic |
| **The Nation in Arms** | rare | implemented | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. | Military |
| **Commission: The Captured Marvel** | rare | modify: as built | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then gain science and culture each equal to twenty times its population, plus 200 of each for every world wonder in it. The card leaves its chair. | Wildcard |
| **The Horde** | rare | implemented | Pillaging a hex also pillages every enemy improvement beside it. | Military |
| **Vae Victis** | rare | add | Your capture rewards are paid twice. | Wildcard |
| **The Varangian Guard** | rare | implemented | Elite units may attack twice a turn. | Military |
| **The Glorious Dead** | rare | add: rule-breaker | Your losses never count toward war weariness. | Civic |
| **The Harrying** | rare | implemented | Pillaging a hex beside a rival town with no garrison throws that town into unrest. | Military |
| **The Great Bombards** | rare | implemented | Your siege units break a town's walls in one blow. | Military |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Dominion or the deck named beside each one may draw it, so a change here is felt in two decks.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Rites of Passage** | common | Devotion | 0 | implemented | Gaining a military unit grants 12 faith. | Civic |
| **Military Colonies** | uncommon | Expansionist | I | implemented | Cities with a Barracks gain +45% production toward settlers and workers. | Economic |
| **The Escorted Roads** | uncommon | Commerce | I | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | Economic |
| **Field Academies** | uncommon | Scientific | I | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. | Civic |
| **The Barbarian Frontier** | uncommon | Expansionist | I | implemented | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. | Economic |
| **The Oriflamme** | uncommon | Devotion | I | implemented | Military units beside one of your religious units gain +4 strength. | Military |
| **The Sacred Host** | rare | Devotion | I | implemented | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. | Military |
| **The Sword of State** | common | Magisterial | I | add | On draft: the best melee unit you can build is trained in your capital. Seated, this card does nothing. | Military |
| **Copying the Enemy** | uncommon | Scientific | I | add | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. | Civic |
| **The Muster of the Fields** | uncommon | Expansionist | I | implemented | Cities of at least five citizens may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. The unit counts as trained. | Military |
| **The Frontier Militia** | common | Expansionist | 0 | add | Each town you found starts with the best melee unit you can build standing in it. | Military |
| **The Farming Garrisons** | common | Expansionist | I | add | Hexes with a fortified military unit gain +1 food and +1 production. Fortified units gain +2 strength. | Economic |
| **The Road Garrisons** | uncommon | Expansionist | II | implemented | Garrisoned cities with a road to your capital gain +5 food and +5 defence. | Economic |
| **Marcher Lords** | uncommon | Expansionist | II | implemented | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. | Economic |
| **Convert It or Tax It** | uncommon | Devotion | II | implemented | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. | Economic |
| **Examinations of State** | rare | Magisterial | II | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. | Civic |
| **The Crusader Orders** | uncommon | Devotion | II | implemented | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | Military |
| **Carried-Off Scholars** | common | Scientific | II | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **Looted Art** | uncommon | Magisterial | II | add | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **The Engineer Corps** | uncommon | Scientific | III | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | Military |
| **War Bonds** | uncommon | Commerce | III | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | Military |
| **Professional Soldiers** | uncommon | Commerce | III | implemented | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** | uncommon | Commerce | III | implemented | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Military |
| **The Holy Army** | uncommon | Devotion | III | implemented | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. | Civic |
| **Letters of Marque** | rare | Commerce | III | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. | Economic |
| **Mercenary Contracts** | uncommon | Commerce | III | modify: deferred | Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns. | Military |
| **The New Code** | rare | Magisterial | III | add | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Wildcard |

## Open for your pass

New names are placeholders; rename freely.

- **Still open:**
  - **Combined Arms' second clause** (my proposal, since the old one repeated The Siege Train and The Engineer Corps): siege units beside one of your melee units cannot be attacked in melee. The infantry screens the guns. It is the same kind of rule as The Testudo's.
  - **The endless host's new Doctrines** (my proposal): The Servian Reforms at Tier I, and Weight of Numbers and The Laws of Lord Shang at Tier II. The reasoning is in `docs/plans/doctrines-governments-chairs.md`, section 2.
  - **The Plunder Economy and The Consular Roads** are unchanged since my notes of 2026-10-15: the first pays every city for every pillage, and the second's "pacified at once" does Pax Romana's job from Tier I.
  - **The Art of War duplicate** (ruling 7): your "gaining a unit grants science equal to its strength" did the same job as The Art of War. It is reworked above as The Captured Arms (science from kills this game). Say if you would rather keep yours and change The Art of War instead.
  - **The Grain Tribute** had no rarity; it is set to common.
- **Answered in your pass of 2026-10-16** (written into the rows above):
  - **The Longbowmen** gain +5 culture each time they attack from range.
  - **Interior Lines:** the +4 is for a unit that has not moved this turn.
  - **The Steppe Confederacy** lifts the border freeze, not a population rule: negative authority no longer stops your borders growing.
  - **The Strategoi** doubles only the great generals' +3 strength aura. The rally you asked about is "Rally the Army", a general's one-time act: the general is spent, and your units within two hexes gain +3 strength for five turns. It does not double.
  - **The Call to the Spear and The Muster of the Fields** become one card shared by Dominion and Expansionist (*"Have these two be a single card that's shared between the two decks."*). The built Expansionist card is kept and is now in the shared table, and The Call to the Spear leaves Tier I.
  - **A unit that starts as a Veteran counts as earning a rank,** so The Drill Masters and The Devshirme feed Honours of the Legion, The Veterans' Roll and The Campaign Annals.
  - **The Engineer Corps** stays as it is.
  - **The Imperial Examinations and Triumphal Arches** wait for the Magisterial sheet.
- **Your Tier III pass of 2026-10-16** (written into the rows above):
  - **Cut:** Defensive Lines, The Captured Arsenals, The Landing Parties, The Feudal Obligation, The Testudo and Knightly Ransom. The first three had data rows, which are now retired.
  - **Revised:** Total War to +5 strength. A Victor's Peace now pays a Wildcard chair for the rest of the game. New texts for The Plunder Trains, The Arrière-ban, The Mural Crown, Valhalla, The Chevauchée and Pax Romana. The Yam is uncommon.
  - **Named:** your unnamed general card is The Bakufu (Japan's military government, literally "tent government"), and your two new commons are The Regimental Schools (the schools British regiments ran for their soldiers) and The Board of Ordnance (England's arms office, which also ran the Woolwich military academy).
  - **Types:** The Mural Crown and Valhalla moved to Civic as you set them. The Arrière-ban is Economic, as the sort's rules make a production card (you agreed in chat).
  - **The Chevauchée,** as I read it: each enemy city within three hexes takes a strike at half the pillaging unit's strength, with no damage back.
- **Ruled in chat on 2026-10-16** (written into the rows above):
  - The Serried Ranks and Double Time are rare, and Double Time is dealt in Tiers II and III.
  - The Marian Reforms makes towns build military units at half speed, instead of doubling their cost.
  - Doctrine pairs that cancel each other's drawbacks are intended (*"#3 is intentional"*).
  - A new government brings only its Doctrine offer, with no hand of rare cards.
  - Every card is sorted into Military, Economic, Civic or Wildcard (the Type column).
  - Double Time repeats only what Orders do: their effects at the end of a turn or every few turns, with the yields those effects pay (*"the smaller reading, it should only affect orders"*). The empire's own yields are not doubled.
  - A Wildcard card fits only a Wildcard chair.
  - The tier-38 governments were meant for a fifth age and are left unimplemented (*"just leave the last tier as unimplemented"*). Tier IV's cards still open at draft 38.
  - Interior Lines takes Machinery's road rule at Machinery's size: a step along a road costs 40% less movement. Machinery's discount is 40%, not 50%. The two add, so with both a road step costs a fifteenth of a move instead of a fifth.
  - The merged levy keeps The Call to the Spear's floor of five citizens.
  - Divine Mandate counts Civic Orders, and the Chiefdom keeps its old chairs (`docs/plans/doctrines-governments-chairs.md`).
  - The Fyrd is removed for now (*"let's remove the fyrd for now"*): beside The Muster of the Fields and its five-citizen floor, it added nothing.
  - The five cards that wait on a UX decision stay deferred, for you to rework later (*"Defer all 5 UX cards, i'll probably rework them later"*): The Longships, The Relay Stations, Rally to the Standard, Circumvallation and Mercenary Contracts.
  - Doctrine tiers pair one to one with the four government tiers left: Tier I with tier 4, Tier II with tier 10, Tier III with tier 18 and Tier IV with tier 29, as Doctrine pools were paired before the decks rework (*"2 yes"*). Each Doctrine arrives one card tier earlier than the table it sits in.
  - A unit raised by The General Levy counts as gained (*"conscripts should pay cards that pay 'gaining a unit'"*), so Muster Rites, The Art of War and Rites of Passage pay for it. It still does not count as trained.
  - A second declaration of war restarts The Arrière-ban's ten turns instead of stacking (*"just have arriere-ban refresh after declaring war twice instead of stacking"*).
  - Walled Towns counts any defensive building, the Palisade included (*"have it read defensive buildings (to include palisades and other defensive structures)"*).
  - The Farming Garrisons also gives fortified units +2 strength, and becomes a card shared by Dominion and Expansionist, with The Frontier Militia (your notes on both sheets). Both are now in the shared table.

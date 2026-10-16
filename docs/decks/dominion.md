# The Dominion deck

The deck's cards, by tier: name, rarity, status and ability. This sheet is the spec of record for the deck, and `test/sim/decks/dominion.test.ts` checks it against `data/decks/dominion.json`.

- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (your revision), `replaced` (a new card takes over the row), `reworked` (ruling 6 of 2026-10-15), `wording` (the text changes, the effect does not), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text). The ability shown is the target.
  - `add`: not in the data yet. `add: reworked` is one of your ideas reworked for ruling 6; `add: rule-breaker` is one of the rule-breaking cards added for ruling 4.
  - **(was …)** names the data row a renamed card takes over, or your earlier name for a reworked idea.
- **Doctrines:** tiers I to IV open with Dominion's Doctrines for that tier. A Doctrine is held for the whole game and takes no chair. Adopting a government offers Doctrines of that government's tier, drawn from both of the seat's decks (ruled 2026-10-15, `docs/flags.md` (vvvvvv)). None is in the data yet. Their tables have three columns, and the sync test reads only the four-column card tables.
- **Why each card is here:** `docs/plans/dominion-builds.md`: the four builds, the rulings of 2026-10-15, and the reworks and new rule-breakers.
- **The long form** (the old notes, the "built as" details, the synergy section): `docs/decks/reference/dominion-2026-10-15.md`. Ideas not on the sheet: `docs/plans/dominion-ideas.md`.

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 1 | 9 | 16 | 26 | none |
| Tier I | 5 | 9 | 10 | 24 | 4 |
| Tier II | 9 | 5 | 17 | 31 | 3 |
| Tier III | 5 | 3 | 21 | 29 | 3 |
| Tier IV | 7 | 8 | 6 | 21 | 3 |
| **All** | **27** | **34** | **70** | **131** | **13** |
| Shared | 16 | 3 | 5 | 24 | |

## Tier 0

| Card | Rarity | Status | Ability |
|---|---|---|---|
| **Blood Brothers** | rare | implemented | A barbarian unit you kill joins your side. |
| **Commission: Clear the Frontier** | common | modify: revised | Commission. Clear two barbarian camps while this card is seated. Then gain 2 population in your capital, and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. |
| **Blooded Spears** | common | modify: revised | Military units gain +2 strength, doubled against barbarians. |
| **Muster Rites** | common | modify: revised | Gaining a unit grants 8 faith and 8 food. |
| **The Horse Herds** | common | modify: revised | Worked pastures and camps give +1 food and +1 production. |
| **Battle Honours** | common | modify: revised | Commission. Kill ten units while this card is seated. Then choose a great general from a draft. The card leaves its chair. |
| **Sword and Plough** | common | modify: revised | Each city with a garrison gains +1 culture and +2 production. |
| **The Camp Chaplains** | common | modify: reworked | Killing a unit grants faith equal to its strength. |
| **The Standing Army** | uncommon | modify: revised | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |
| **The King's Levy** | rare | modify: wording | Every fifteen turns your capital raises a melee unit for free. It costs no upkeep. |
| **The Grain Tribute** | common | add | +1 food and +1 production in every city. |
| **The Drill Grounds** | common | add | Units standing in your towns gain 1 experience every 4 turns. |
| **The Scaling Ladders** | common | add | Melee units gain +4 strength against towns. |
| **The Funeral Games** | common | add | When one of your units falls, gain faith equal to its strength. |
| **The Bards' Praise** | common | add | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 15 culture. |
| **The Cattle Raid** | common | add | Clearing a barbarian camp gives every city +3 food for ten turns. Clearing another restarts the ten turns. |
| **The Garrison Captains** | common | add | +1 authority for each garrisoned unit. |
| **The Spear Makers** | common | add | +30% production toward first- and second-age military units. |
| **The Armed Colony** | common | add: reworked | A town founded beside one of your military units starts with three extra hexes, and that unit becomes a Veteran. |
| **The Outriders** | common | add: reworked | Claiming a discovery or clearing a barbarian camp grants 8 production to every town. |
| **The Captured Arms** | common | add: reworked | +1 science for every unit you have killed this game, no cap. |
| **The Gathering Host** | uncommon | add | While seated, this card gains +1 science and +1 culture each time you gain a unit. It starts at +2 science and +2 culture. |
| **The Armourers' Secret** | uncommon | add | While seated, researching a technology that unlocks a military unit grants one of that unit. |
| **The Defiant Kingdom** | uncommon | add | While another empire holds more towns than you, you train military units 25% faster. |
| **The Hunting Grounds** | uncommon | add | Barbarian camps within ten hexes of your cities spawn 50% faster. Your units gain +4 strength in your own territory. |
| **The Campaign Annals** (was The Bronze Smiths) | rare | add: reworked | While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science. |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Marian Reforms** | drilled legions | Your military units cost no upkeep, but cost 100% more to produce. Buying them, levies and units granted by cards are unaffected, so the army is bought more than built. |
| **The Steppe Confederacy** | steppe raiders | Negative authority no longer stops your towns growing. While authority is negative, gain +50% production toward mounted units. |
| **The Soldiers' Share** | conqueror | Capturing a town fully heals every unit of yours within three hexes and raises each by one rank. You can no longer found new cities. |
| **The Consular Roads** | conqueror | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. |

**Orders:**

| Card | Rarity | Status | Ability |
|---|---|---|---|
| **The Quartermasters** | common | implemented | Worked strategic resources gain +3 food and +3 production. |
| **The Soldier-Farmers** | common | implemented | While at peace, garrisoned cities gain +2 food and +2 production on each worked pasture and camp. |
| **The Marshals** | uncommon | implemented | +2 strength per adjacent friendly combat unit, at most +6. |
| **War Foundries** | rare | implemented | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. |
| **Horse Lords** | rare | implemented | Mounted units gain +3 strength and +1 movement. |
| **Martial Law** | common | modify: revised | Each garrisoned unit grants its city +2 happiness and +4 food. |
| **The General Staff** | common | modify: revised | Cities with a Barracks give +3 production and +2 renown a turn, favouring great generals. |
| **The Training Cadre** (was Drill Manuals) | common | modify: replaced | Units gained in a town with a Barracks start with 2 experience. |
| **The Marching Camps** (was March Discipline) | common | modify: reworked | Attacking does not break your units' fortification. |
| **The Soldiers' Purse** | common | modify: reworked | Military units cost 1 less upkeep for each rank they hold. |
| **Honours of the Legion** (was The War Hall Schools) | uncommon | modify: replaced | Each time one of your units earns a rank, gain science and culture equal to its strength. |
| **The Pacified Marches** | uncommon | modify: revised | Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. |
| **The Art of War** | uncommon | modify: revised | Gaining a unit grants science equal to three quarters of its strength. |
| **Songs of the Fallen** | rare | modify: revised | Killing or losing a unit grants science and culture equal to twice its strength. |
| **Walled Towns** | common | add | Towns with walls gain +15% food. |
| **The Farming Garrisons** | common | add | Hexes with a fortified military unit gain +1 food and +1 production. |
| **The Call to the Spear** | uncommon | add | Towns of at least five citizens may spend a citizen to raise the best melee unit you can build. |
| **The Swift Riders** | uncommon | add | Mounted units may move after attacking. |
| **The Open Muster** | uncommon | add | Passing a draft hand grants the best melee unit you can build in your capital. |
| **The Captive Craftsmen** | uncommon | add | Gains +1 science and +1 production each time you pillage a hex. |
| **The Satraps** | uncommon | add | Garrisoned towns in unrest pacify twice as fast. |
| **The Sack** | uncommon | add | Razing a town you captured grants production, gold and culture equal to fifteen times its population. |
| **The Cleruchy** | uncommon | add | When drafted, gain a free settler in your capital. |
| **The Acropolis** | uncommon | add | +1 authority for each building in your capital. |

## Tier II

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Centurions** | drilled legions | Each Elite unit gives +3 strength to your units beside it, and costs 2 more upkeep. |
| **The Plunder Economy** | steppe raiders | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. |
| **The Strategoi** | drilled legions | +30% renown. Citadel yields and great general effects are doubled. |

**Orders:**

| Card | Rarity | Status | Ability |
|---|---|---|---|
| **Siege Works** | common | implemented | +38% production toward siege units. Siege units gain +4 strength against cities. |
| **Conquered Archives** | common | implemented | Captured cities gain +6 science and +6 culture. |
| **Stockpiles** | common | implemented | Cities gain +8 food per defensive building. |
| **Triumphs** | common | implemented | Capturing a city grants culture equal to fifteen times its population. |
| **The Citadel Works** | common | implemented | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. |
| **Riders of the Steppe** | uncommon | implemented | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |
| **Spoils of War** | uncommon | implemented | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. |
| **Hegemony** | rare | implemented | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. |
| **Master Bowyers** | rare | implemented | Ranged and siege units gain +1 range. |
| **Armoury Guilds** | common | modify: reworked | When one of your units falls, your nearest town with an Armoury gains production equal to its strength. |
| **The Longships** (was Marine Drill) | uncommon | modify: reworked | Your ships may pillage improvements on the shore beside them. |
| **The Relay Stations** | uncommon | modify: deferred | Once a turn, a military unit that starts its turn in a city connected to your capital may move to any other connected city, ending its move there. |
| **War Reparations** | uncommon | modify: deferred | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. |
| **Commission: Take the City** | uncommon | modify: as built | Commission. Capture a city with at least five citizens. Then gain culture and science equal to twenty-three times its population, and a free Barracks in that city. The card leaves its chair. |
| **The Fabricae** | common | add | Towns whose garrison is a Veteran or Elite gain +25% production. |
| **The Valetudinaria** | common | add | Units in your territory heal 15 more hit points a turn. |
| **Living off the Land** | common | add | Military units outside your territory cost no upkeep. |
| **The Longbowmen** | common | add | Ranged units gain +4 strength and +4 ranged strength. +5 strength each time they attack from range. |
| **The Serried Ranks** | common | add | Melee units beside another melee unit gain +10 strength when defending. |
| **The Veterans' Roll** | uncommon | add | +1% science and culture for every rank your units have earned this game, at most +30%. |
| **The Conscription Rolls** | uncommon | add | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. |
| **The Hall of the Slain** | uncommon | add | +1% production and culture for every two units you have lost this game, at most +30%. |
| **The Funeral Oration** | uncommon | add | Units you lose count half toward war weariness. |
| **The Sagas** | uncommon | add | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. |
| **The Provincial Census** | uncommon | add | Pacifying a town grants science equal to twenty times its population. |
| **Spear-won Land** | uncommon | add | +3% production and science for every town you have captured this game, at most +30%. |
| **The Castra** | uncommon | add | Your own hexes with a fortified military unit gain +1 science and +1 production. Citadels gain +3 production and +3 science. |
| **The Tactica** | uncommon | add | At the end of your turn, great generals give 1 experience to every unit beside them. Each time one of your units earns a rank, gain 15 science. |
| **Double Time** | uncommon | add | Your end-of-turn effects, and effects that happen every few turns, trigger twice. |
| **The State Forges** | rare | add | Each time you research a technology, your capital raises the best melee unit you can build. |
| **War Feeds Itself** | rare | add | At the end of your turn, each of your units in enemy territory yields you its hex's yields. |

## Tier III

**Doctrines,** offered with the tier-29 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Total Mobilisation** | endless host | While at war, each town of six or more citizens raises the best melee unit you can build every five turns, for a citizen. While at peace, your towns grow 25% faster. |
| **Combined Arms** | conqueror | Your units gain +3 strength, doubled beside one of your siege units. Siege units gain +1 movement. |
| **The Universal Monarchy** | conqueror | Towns you capture cost no authority. Towns you found cost twice as much. |

**Orders:**

| Card | Rarity | Status | Ability |
|---|---|---|---|
| **Standing Garrisons** | common | implemented | Per garrisoned unit, the city gains +12% production and +12% culture. |
| **The Siege Train** | uncommon | implemented | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |
| **Reserve Officers** | uncommon | implemented | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. |
| **Defensive Lines** | uncommon | implemented | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. |
| **Total War** | rare | implemented | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. |
| **The Captured Arsenals** (was Arsenals) | common | modify: reworked | Towns in unrest still build military units. |
| **The Landing Parties** (was Naval Supremacy) | uncommon | modify: reworked | Land units attacking from a ship gain +8 strength. |
| **Commission: A Victor's Peace** | rare | modify: deferred | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain 300 gold and 300 culture, and every city gains +2 happiness for twenty turns. The card leaves its chair. |
| **The Drill Masters** | common | add | Units you gain start as Veterans. |
| **The Fyrd** | common | add | Towns of at least eight citizens may spend a citizen to raise the best melee unit you can build. |
| **The Plunder Trains** | common | add | Pillaging grants 60 production to your town nearest the pillaged hex. |
| **The Yam** | common | add | Mounted units heal fully when they pillage. |
| **The Tagmata** | uncommon | add | Veteran and Elite units gain +5 strength. |
| **Up Through the Ranks** | uncommon | add | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. |
| **The Feudal Obligation** | uncommon | add | Units raised by a levy cost no upkeep. |
| **The Arrière-ban** | uncommon | add | Declaring war makes every town raise military units twice as fast for ten turns. |
| **The Keshik** | uncommon | add | Mounted Veteran and Elite units gain +1 movement. |
| **The Mural Crown** | uncommon | add | The unit that captures a town becomes an Elite. |
| **The Victory Mint** | uncommon | add | Capturing a city grants gold equal to thirty times its population. |
| **The King's Peace** | uncommon | add | A great general standing in a town in unrest pacifies it at the start of the next turn. |
| **Interior Lines** | uncommon | add | Roads are 50% more effective. A unit attacking with movement points left gains +4 strength. |
| **Rally to the Standard** | uncommon | add: rule-breaker | Units you gain may appear beside any of your great generals. |
| **The Testudo** | uncommon | add: rule-breaker | Your units cannot be killed by a ranged attack. |
| **Knightly Ransom** | rare | add | When a Veteran or Elite unit of yours would die, it returns to your nearest town with 1 hit point, for gold equal to half its cost. |
| **Valhalla** | rare | add | When one of your units dies, the best melee unit you can build rises in your town nearest to where it fell, at most twice a turn. |
| **The Chevauchée** | rare | add | Pillaging a hex within three hexes of a rival town also takes 60 production from what that town is building. |
| **Danegeld** | rare | add | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. |
| **The Devshirme** | rare | add | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. |
| **Pax Romana** | rare | add | Towns you capture are pacified at once. |

## Tier IV

**Doctrines,** offered with the tier-38 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Fortress Empire** | drilled legions | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. |
| **The Scourge of God** | steppe raiders | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. |
| **The Landsturm** | endless host | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. Melee units gain +3 strength, doubled beside a great general. |

**Orders:**

| Card | Rarity | Status | Ability |
|---|---|---|---|
| **Imperium** | rare | implemented | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. |
| **The Praetorian Guard** | rare | implemented | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. |
| **The Grand Army** | rare | implemented | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. |
| **The Annexed Provinces** | rare | implemented | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. |
| **The Marshalate** | rare | implemented | Each great general you have called gives your military units +1 strength, at most +5. Citadels give +3 culture and +3 production. |
| **The Military Frontier** | rare | implemented | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. |
| **The Grand Coalition** | rare | implemented | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. |
| **The Proconsuls** | uncommon | modify: as built | Captured cities with a garrison cost no authority and gain +10 defence. |
| **Commission: The Grand Campaign** | uncommon | modify: as built | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. |
| **Circumvallation** | uncommon | modify: deferred | While a rival city is under siege with at least one of your units beside it, it adds no production toward a Magnum Opus. You can see which rival cities are raising one. |
| **Commission: Hold the Capitals** | rare | modify: as built | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. |
| **Spolia** | rare | modify: as built | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. |
| **The Legions' Labour** | rare | modify: deferred | Disbanding a military unit in a town building a wonder or the Magnum Opus adds half its production cost toward it. Units raised for free add nothing, but units raised by a levy count. |
| **The Nation in Arms** | rare | modify: wording | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. |
| **Commission: The Captured Marvel** | rare | modify: as built | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then gain science and culture each equal to twenty times its population, plus 200 of each for every world wonder in it. The card leaves its chair. |
| **The Horde** | rare | add | Pillaging a hex also pillages every enemy improvement beside it. |
| **Vae Victis** | rare | add | Your capture rewards are paid twice. |
| **The Varangian Guard** | rare | add: rule-breaker | Elite units may attack twice a turn. |
| **The Glorious Dead** | rare | add: rule-breaker | Your losses never count toward war weariness. |
| **The Harrying** | rare | add: rule-breaker | Pillaging a hex beside a rival town with no garrison throws that town into unrest. |
| **The Great Bombards** | rare | add: rule-breaker | Your siege units break a town's walls in one blow. |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Dominion or the deck named beside each one may draw it, so a change here is felt in two decks.

| Card | Rarity | Also in | Tier | Status | Ability |
|---|---|---|---|---|---|
| **Rites of Passage** | common | Devotion | 0 | modify: revised | Gaining a military unit grants 12 faith. |
| **Military Colonies** | uncommon | Expansionist | I | implemented | Cities with a Barracks gain +45% production toward settlers and workers. |
| **The Escorted Roads** | uncommon | Commerce | I | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. |
| **Field Academies** | uncommon | Scientific | I | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. |
| **The Barbarian Frontier** | uncommon | Expansionist | I | implemented | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. |
| **The Oriflamme** | uncommon | Devotion | I | implemented | Military units beside one of your religious units gain +4 strength. |
| **The Sacred Host** | rare | Devotion | I | implemented | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. |
| **The Sword of State** | common | Magisterial | I | add | On draft: the best melee unit you can build is trained in your capital. Seated, this card does nothing. |
| **Copying the Enemy** | uncommon | Scientific | I | add | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. |
| **The Road Garrisons** | uncommon | Expansionist | II | implemented | Garrisoned cities with a road to your capital gain +5 food and +5 defence. |
| **Marcher Lords** | uncommon | Expansionist | II | implemented | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. |
| **Convert It or Tax It** | uncommon | Devotion | II | implemented | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. |
| **Examinations of State** | rare | Magisterial | II | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. |
| **The Crusader Orders** | uncommon | Devotion | II | modify: as built | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. |
| **Carried-Off Scholars** | common | Scientific | II | add | Capturing a city grants science equal to ten times its population. |
| **Looted Art** | uncommon | Magisterial | II | add | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. |
| **The Engineer Corps** | uncommon | Scientific | III | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. |
| **War Bonds** | uncommon | Commerce | III | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. |
| **Professional Soldiers** | uncommon | Commerce | III | implemented | Units you purchase gain +3 combat strength. |
| **The Chartered Company** | uncommon | Commerce | III | implemented | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. |
| **The Holy Army** | uncommon | Devotion | III | implemented | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. |
| **Letters of Marque** | rare | Commerce | III | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. |
| **Mercenary Contracts** | uncommon | Commerce | III | modify: deferred | Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns. |
| **The New Code** | rare | Magisterial | III | add | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. |

## Open for your pass

- **From your pass of 2026-10-15** (new names are placeholders; rename freely):
  - **The Longbowmen:** what does "+5 strength each time they attack from range" do? It could add +5 to the shot itself (+9 in all), protect the unit after it shoots (+5 until your next turn), or stack with every shot (a grower).
  - **Interior Lines:** every unit that attacks has some movement left. Did you mean a unit that has not moved this turn, one with at least half its movement left, or one that arrived by road? And for "50% more effective": a road step costs a third of a move today (a fifth after Machinery). Should it cost a fifth (a seventh after Machinery)?
  - **Double Time:** which effects count? Suggested: effects that come every few turns (levies, The Drill Grounds) and the experience a unit gains at the end of a turn (The Tactica). Not yields, which are also paid at the end of a turn.
  - **The Steppe Confederacy:** negative authority does not stop towns growing today; unhappiness does. Below zero, authority freezes borders and bars buying land, and at −5 it cuts production, science and culture. Which of these should the Doctrine lift?
  - **The Strategoi:** "great general effects": the +3 strength aura and the general's rally? Generals also speed pacification; does that double too?
  - **The Grain Tribute** had no rarity; it is set to common.
  - **The tier-10 governments:** governments come at five tiers (4, 10, 18, 29 and 38), and the sheet has Doctrines for four. Does the tier-10 adoption deal from the Tier I Doctrines again, or does tier 10 get its own set?
- **The two duplicates** (ruling 7, not answered yet):
  - your "gaining a unit grants science equal to its strength" did the same job as The Art of War. It is reworked above as The Captured Arms (science from kills this game). Say if you would rather keep yours and change The Art of War instead;
  - The Call to the Spear does the same job as Expansionist's The Muster of the Fields, and a Dominion + Expansionist seat is dealt both in Tier I. One of the two should change.
- **The Imperial Examinations and Triumphal Arches** (shared with Magisterial) were cut on both sheets on 2026-10-06 but are still in the data: The Imperial Examinations is live and dealt, Triumphal Arches is deferred. They wait on your review of the Magisterial sheet.
- **The Engineer Corps** (shared with Scientific): Scientific recommends cutting it, or cutting it to its first clause. Dominion keeps it.
- **A unit that starts as a Veteran** (The Drill Masters, The Devshirme): does it count as earning a rank? It decides whether those cards feed Honours of the Legion, The Veterans' Roll and The Campaign Annals.

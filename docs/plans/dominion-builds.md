# Dominion: four finished builds, early and late (proposal)

**Status:** proposal, 2026-10-15, for the user to react to. It replaces the draft of 2026-10-14, which the user found unsatisfying. The user, verbatim:

> *"i think the builds aren't very satisfying, for the 'builds' lets do two versions, an early game build composed of tier 0/1/2 cards and a late game build composed of tier 3/4 cards (with possibly 1-2 earlier cards that scale throughout the game). You're not limited to cards that already exist or are proposed, focus on creating a satisfying playstyle and synergistic bonuses, with a mix of utility that fits with the build theme"*

The method is the card-design skill's "Finished builds" section. Once the user approves, the builds move into the skill's deck map (`.claude/skills/card-design/references/deck-maps.md`).

## What changed from the first draft

**Why the first draft fell flat:**
- It was assembled from cards already on the sheet, so most chairs were flats that each helped a little and barely touched each other. There was little to watch grow.
- It showed one endgame snapshot that mixed Tier 0 and Tier IV cards. Only the current band is dealt and early cards get pushed out, so it never showed how a build feels while it comes together.
- It had few moments, no capstone that changes how you play, and science and culture mostly from generic cards.

**What this draft does instead:**
- **One loop per build,** said in one line, on a quantity the playstyle produces by itself. Every chair raises that quantity, reads it, or pays an essential or a fitting utility from it.
- **Two versions of each build:** an early build of Tier 0, I and II cards, and a late build of Tier III and IV cards plus the one or two early cards that grew.
- **An early scaler in every build:** a Tier II "this game" counter that pays a percentage on everything the build has done so far. It is the card that carries into the late build. The host and the raiders also have a growing card from Tier 0 or I.
- **A capstone and a moment in every late build,** with percentages on top of the flats so the yield layers multiply each other.
- **Utility from the build's own quantity:** promotions pay science and culture, losses pay production, pillage pays science.
- **New cards wherever the sheet had a gap:** 36 in the builds, marked **new**.
- **The garrison state is reshaped into the drilled legions,** built on the unit ranks added on 2026-10-14 (build 1 says why).

## How to read this

- **Chairs:**
  - 3 at the start, and 5 from draft 4;
  - 8 from draft 18, when Tier II opens;
  - 11 from draft 29, when Tier III opens (`tierLadder` in `data/statecraft.json`).
- **Early build:** the eight chairs at the end of Tier II, about turns 114 to 159 in bot games. Most of the early game is played on five chairs (Tier I, about turns 55 to 114), so each early build also names its **five-chair core**.
- **Late build:** the eleven chairs once Tier III is open. It is made of Tier III and IV cards plus one or two early scalers.
- **Status:**
  - *live*: in the game;
  - *changing*: the user's revision, not built yet;
  - *user pick*: the user's new cards on the sheet;
  - *proposed*: from `docs/plans/dominion-ideas.md`;
  - *deferred*: in the data but not dealt;
  - **new**: this draft.
- **Shape:** *existing* means the effect vocabulary can already say it. *New shape* means it cannot yet; the families of new shapes are listed at the end.
- **Raises / reads:** what the card adds to the build's engine, or what it pays on.
- **Numbers are first guesses** against `references/power-bar.md`. The user's priority is the shape of the cards (2026-10-13).

## Three facts about the draft that shape every build

1. **Tier 0 lasts about six drafts.** Tier I needs age 2, which bots reach around turn 55, so a seat drafts from Tier 0 only about six times. An early build therefore holds two Tier 0 cards, three at most, and each build lists alternatives.
2. **Tier IV is rarely reached.** It opens at draft 45. In the bot games of 2026-10-13, 7 of 30 seats got there, at a median turn of 189. The user's one logged win closed on turn 164. So **each build's capstone is in Tier III**, and Tier IV is the long-game layer. See question 1.
3. **Tier III is thin.** It holds 8 Dominion cards today. These four late builds use 22 different Tier III cards, 16 of them new.

## The four at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The drilled legions** (holding and peace) | garrisons drill → units earn ranks → ranks pay, and win the fights that earn more ranks | a promotion | The Veterans' Roll | Knightly Ransom | the garrison finishers already on the sheet |
| **The endless host** (the host and tempo) | gain units cheaply → every gain and every loss pays → the pay raises the next wave | a unit gained, a unit lost | The Gathering Host, The Hall of the Slain | Valhalla | The Legions' Labour |
| **The steppe raiders** (raiders) | ride out → pillage → plunder pays → riders live to earn ranks → they raid deeper | a pillage | The Captive Craftsmen, The Sagas | The Chevauchée | The Horde |
| **The conqueror** (conquest) | break the walls → take the town → pacify it → it pays for the next siege | a capture, a pacification | Spear-won Land | Pax Romana | Vae Victis, Spolia |

---

## 1. The drilled legions (holding and peace)

**The fantasy.** Sparta's agoge, Rome's legions in their stone forts, the Byzantine tagmata. A small army that is the best in the world. It drills at home in peace and keeps the realm in order. An army that comes at its walls breaks on veterans, and when war comes it marches out with chevrons on every badge.

**The loop:** garrisons drill → units earn ranks → each rank pays science and culture, and ranked soldiers win the fights that earn the next rank.

**What changed from the garrison state.** The old build paid for soldiers standing still:
- one garrison per town paid the same in every Dominion seat;
- nothing grew, and nothing happened.

Ranks give the build a quantity the player pushes by choice (drill, protect, fight carefully) and a moment (a promotion). Two facts from the ranks build shape it:
- **A garrison behind standing walls earns no experience,** because the walls take the blow. So experience at home comes from drilling, and from attacking out of the town (The Sally Port).
- **Fights with barbarians stop at Veteran.** Elites are made in war against empires, which is why this build marches out.

It loses the fewest units of the four, so war weariness falls on whoever attacks it.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| Sword and Plough | 0 | common | Each city with a garrison gains +2 culture and +2 production. | foundation glue | reads garrisons | culture, production | changing; existing |
| The Drill Grounds | 0 | common | Units standing in your towns gain 1 experience every 4 turns, up to Veteran. | opener | raises ranks | defence | **new**; new shape (drill) |
| Honours of the Legion | I | uncommon | Each time one of your units earns a rank, gain science and culture equal to its strength. | pay-off, the moment | reads promotions | science, culture | **new**, replaces The War Hall Schools; new shape (promotion) |
| The Training Cadre | I | common | Units gained in a town with a Barracks start with 2 experience. | engine | raises ranks | — | **new**, replaces Drill Manuals; new shape (experience at birth) |
| The Sally Port | I | rare | Your units attacking out of a town stay inside it after a kill. | build-defining: a broken rule | raises kills and ranks | defence | **new**; new shape (unit rule) |
| The Veterans' Roll | II | uncommon | +1% science and culture for every rank your units have earned this game, at most +30%. | early scaler | reads ranks earned this game | science, culture | **new**; new shape (this-game count) |
| The Fabricae | II | common | Towns whose garrison is a Veteran or Elite gain +25% production. | pay-off | reads ranked garrisons | production | **new**; new shape (rank test on a town) |
| The Valetudinaria | II | common | Units in your territory heal 15 more hit points a turn. | utility | keeps ranks alive | — | **new**; existing (`unitStat` heal) |

- **Five-chair core** (Tier I): Sword and Plough, The Drill Grounds, Honours of the Legion, The Training Cadre, The Sally Port.
- **Sizing:**
  - **The Drill Grounds:** a garrison posted on turn 10 is a Veteran by turn 26. That is +3 strength on a defender of 20 to 27; band 0's strong combat line is +4.
  - **Honours of the Legion:** in age 2 a promotion pays about 33 science and 33 culture. This build promotes about one unit every three turns (each garrison once by drill, plus the wars). That is about 10 science and 10 culture a turn, with early culture worth about three times its face value: band 1's headline.
  - **The Veterans' Roll:** about +12% (about 25 a turn) when Tier II opens. By turn 160 it is about +25%.
  - **The Fabricae:** about 30 production a turn in age 3, and 85 in age 4.
- **How a few turns feel:**
  - Turn 20: the Spearman in your second town earns its first chevron from the drill. A barbarian Warrior attacks it and dies.
  - Turn 70: two enemy Swordsmen besiege the border town, and the walls hold them for two turns. Your Veteran Phalanx attacks out, kills one and stays inside. Next turn it kills the other and becomes an Elite. Honours pays 35 science and 35 culture, and the losses count as war weariness for the enemy, not for you.
  - Turn 120: your units have earned twelve ranks this game, so the Roll pays +12%. Every town with a Veteran garrison builds a quarter faster.
- **Also fits:**
  - Tier 0: Martial Law, The Standing Army, the user's "+1 authority per garrisoned unit", The Farming Garrisons, Blooded Spears;
  - Tier I: Walled Towns, The Soldier-Farmers, The General Staff;
  - Tier II: Stockpiles, The Citadel Works;
  - shared: Examinations of State (Magisterial), The Road Garrisons (Expansionist).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| The Veterans' Roll | II | uncommon | (above) | carried scaler | reads ranks earned | science, culture | **new** |
| The Tagmata | III | uncommon | Veteran and Elite units gain +5 strength. | pay-off, for war | reads ranks | combat | **new**; new shape (rank test on a unit) |
| The Drill Masters | III | common | Units you gain start as Veterans. | engine | raises ranks | — | **new**; new shape (experience at birth) |
| Up Through the Ranks | III | uncommon | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. | the moment | reads promotions; raises generals | renown | **new**; new shape (promotion) |
| Knightly Ransom | III | rare | When a Veteran or Elite unit of yours would die, it returns to your nearest town with 1 hit point, for gold equal to half its cost. | capstone: a broken rule | keeps ranks | — | **new**; new shape (death rule) |
| Standing Garrisons | III | common | Per garrisoned unit, the city gains +12% production and +12% culture. | pay-off: town percentages | reads garrisons | production, culture | live |
| Defensive Lines | III | uncommon | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. | utility | — | defence | live |
| Reserve Officers | III | uncommon | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. | utility: tempo both ways | — | production | live |
| The Military Frontier | IV | rare | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. | finisher: flats | reads garrisons | science, culture | live |
| The Marshalate | IV | rare | Each great general you have called gives your military units +1 strength, at most +5. Citadels give +3 culture and +3 production. | pay-off | reads generals | combat, culture, production | live |
| The Praetorian Guard | IV | rare | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. | finisher: the win | — | defence | live |

- **Carried over:** The Veterans' Roll. At about +25% by turn 160 it pays about 120 science and 110 culture a turn in age 4, more than any other card in the seat.
- **The capstone, Knightly Ransom:**
  - An Elite cut down at a siege is carried home and is back in the line a few turns later.
  - Because ranks are hard to lose, the build can attack where it would otherwise hold back.
  - A ransomed unit did not die, so it is not a loss for war weariness.
- **The moment, Up Through the Ranks:**
  - Four or five new Elites earn a great general (the next one costs about 1,000 to 1,300 renown at this point).
  - The general leads the next march (+3 strength nearby), calms a conquest, or plants a citadel for The Marshalate.
- **Sizing:**
  - **The Tagmata:** an Elite fights at +11 over a raw unit (Elite +6, Tagmata +5). That is about 55% more damage dealt and a third less taken, in any age, because the damage curve reads the difference in strength.
  - **Standing Garrisons and The Military Frontier,** at two soldiers in each of ten towns: +24% production and culture in each town, and +60 science and +60 culture, under the Roll's +30%.
- **How a few turns feel:**
  - Turn 165: Knights die one after another against Elite Pikemen fighting at +11. One Elite Longswordsman falls to a Trebuchet and is ransomed home for 170 gold.
  - Turn 172: you march out. Four Elite Longswordsmen and two Veteran Crossbowmen take the border town. Two new Elites bring 500 renown; a general arrives and plants a citadel.
  - Turn 190 (Tier IV): the Opus town is a fortress, and every soldier near it fights at +6.
- **Without Tier IV,** its three chairs hold earlier cards still in the collection (The Fabricae, The Sally Port, Honours of the Legion), and the build keeps its capstone.
- **Also fits:** Total War; the shared War Bonds; Hold the Capitals and The Proconsuls if it turns to conquest.

**Utility mix:**
- production: Sword and Plough's flats, the percentages of The Fabricae and Standing Garrisons, and Reserve Officers;
- science and culture: Honours of the Legion, the Roll, The Military Frontier;
- defence: The Drill Grounds, The Sally Port, Defensive Lines, The Praetorian Guard;
- healing: The Valetudinaria;
- generals: Up Through the Ranks, The Marshalate.

**Gives up:** numbers and speed. It fields few units, slowly, and has no siege card, so it takes towns late and rarely.

**Partners:**
- Magisterial: generals and citadels count as works, and Examinations of State reads garrisons.
- Devotion: The Holy Army pays a holy site beside a citadel.
- Expansionist: walls and wide settling (Marcher Lords, The Road Garrisons).

**Leader:** Emperor Taizong (melee strength; garrisoned towns pay happiness and culture).

---

## 2. The endless host (the host and tempo)

**The fantasy.** Xerxes' army that drank rivers dry, the Mongol tumens, the feudal levy, the einherjar of Valhalla who fall every day and rise again. Numbers, not quality. Every soldier raised pays, every soldier lost pays again, and the host never runs out. This is the build for the user's ruling that feeding units to die is a way to play.

**The loop:** gain units cheaply → every gain and every loss pays science, culture and faith → the pay raises the next wave.

**What changed.** The old draft had the pieces (the user's growing card, The Funeral Games, Songs of the Fallen, the levies) but no late game. Its best finisher was deferred, and the rest was "more units". This version adds:
- a scaler that remembers every loss;
- a capstone that makes the host truly endless;
- an answer to its one real cost, war weariness.

**War weariness is this build's tension.** Losing more units than you kill against an empire costs happiness. The host answers in three ways:
- barbarians cost no weariness, so the early host feeds camps;
- The Funeral Oration halves its own losses;
- the late host kills as much as it loses, because it never stops coming.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| The Gathering Host | 0 | uncommon | While seated, this card gains +1 science and +1 culture each time you gain a unit. It starts at +2 science and +2 culture. | foundation; early scaler | reads units gained | science, culture | user pick (name and rarity suggested); existing (a tally of units gained) |
| The Funeral Games | 0 | common | When one of your units falls, gain faith equal to its strength. | pay-off on losses | reads losses | faith | user pick; existing |
| The Call to the Spear | I | uncommon | Towns of at least five citizens may spend a citizen to raise the best melee unit you can build. | engine: a new action, the levy | raises units gained | — | user pick; existing (levy) |
| The Art of War | I | uncommon | Gaining a unit grants science equal to three quarters of its strength. | pay-off on gains | reads gains | science | changing; existing |
| Songs of the Fallen | I | rare | Killing or losing a unit grants science and culture equal to twice its strength. | build-defining | reads kills and losses | science, culture | changing; existing |
| The Conscription Rolls | II | uncommon | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. | engine | raises gains | — | **new**; existing (a periodic muster with a town-size scope) |
| The Hall of the Slain | II | uncommon | +1% production and culture for every two units you have lost this game, at most +30%. | early scaler | reads units lost this game | production, culture | **new**; new shape (this-game count) |
| The Funeral Oration | II | uncommon | Units you lose count half toward war weariness. | utility: happiness | — | happiness | **new**; new shape (weariness weight) |

- **Five-chair core** (Tier I): The Gathering Host, The Funeral Games, The Call to the Spear, The Art of War, Songs of the Fallen.
- **Sizing:**
  - **The Gathering Host:** +12 science and culture by turn 50 (ten units gained), about +37 by turn 114, about +80 by turn 160.
  - **Songs of the Fallen:** an age 2 death on either side pays about 65 science and 65 culture. A host trading a unit a turn earns twice band 1's headline, which is why it is the rare.
  - **The Conscription Rolls:** five towns of eight citizens raise five Legionaries (81 hammers each) every ten turns. That is about 40 production a turn, band 2's regular card.
  - **The Hall of the Slain:** about +10% when Tier II opens (20 units lost). By turn 160 (50 lost) it is about +25%: about 120 production and 110 culture a turn in age 4.
- **How a few turns feel:**
  - Turn 30: your Warriors throw themselves at a barbarian camp. Each one that dies pays 20 faith, so your pantheon comes early. Each new Warrior adds +1 to The Gathering Host, which reads +9.
  - Turn 80: a five-citizen town levies a Swordsman on the spot. The Art of War pays 26 science and the Host reads +25. Six Swordsmen storm a wall and four die. Songs of the Fallen pays about 260 science and 260 culture, and the wall is down.
  - Turn 130: the big towns muster Legionaries every ten turns. The Hall of the Slain counts 40 dead (+20%), and the Funeral Oration keeps your towns content while you trade bodies for walls.
- **Also fits:**
  - Tier 0: The King's Levy, Muster Rites, the user's "+30% production toward first- and second-age military units", the user's faster camps, The Armourers' Secret;
  - Tier I: The Open Muster, War Foundries;
  - Tier II: Living off the Land;
  - shared: Rites of Passage, The Sacred Host (Devotion), The Sword of State (Magisterial), and Expansionist's levies.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| The Gathering Host | 0 | uncommon | (above) | carried scaler | reads gains | science, culture | user pick |
| The Hall of the Slain | II | uncommon | (above) | carried scaler | reads losses this game | production, culture | **new** |
| Total War | III | rare | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. | pay-off with a drawback | — | combat | live |
| Reserve Officers | III | uncommon | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. | engine | raises gains | production | live |
| The Fyrd | III | common | Towns of at least eight citizens may spend a citizen to raise the best melee unit you can build. | engine: the late levy | raises gains | — | **new**; existing (levy) |
| The Feudal Obligation | III | uncommon | Units raised by a levy cost no upkeep. | utility: upkeep | reads levies | gold | **new**; new shape (a levied mark on units) |
| The Arrière-ban | III | uncommon | Declaring war makes every town raise military units twice as fast for ten turns. | the moment | raises gains | production | **new**; existing (a timed grant on declaring war) |
| Valhalla | III | rare | When one of your units dies, the best melee unit you can build rises in your town nearest to where it fell, at most twice a turn. | capstone: a broken rule | turns losses into gains | — | **new**; new shape (unit rule) |
| The Legions' Labour | IV | rare | Disbanding a military unit in a city building a wonder or the Magnum Opus adds half the unit's production cost toward it. Units raised for free add nothing. | finisher: the win | reads units | production toward the Opus | deferred; new shape (disbanding pays) |
| The Nation in Arms | IV | rare | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. | engine | raises gains | — | live |
| The Grand Army | IV | rare | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. | pay-off | reads units held | science, culture | live |

- **Carried over:** The Gathering Host (about +80 science and +80 culture by turn 160, still growing) and The Hall of the Slain (about +25%).
- **The capstone, Valhalla:**
  - The line breaks and forms again.
  - Every loss still counts for the Hall, and still costs weariness and upkeep, so it is strong but not free.
- **The moment, The Arrière-ban:** a declaration doubles every town's training for ten turns, and the host appears.
- **The win, The Legions' Labour (Tier IV):** the army, disbanded in the Opus town, becomes the Magnum Opus. Question 5 asks whether a levied unit counts.
- **Sizing:**
  - **The Fyrd:** a citizen becomes a Longswordsman (340 hammers), about ten turns of a town's production in age 4.
  - **The Arrière-ban:** twice the training speed in ten towns of about 35 production is about 350 production of units a turn, for ten turns.
- **How a few turns feel:**
  - Turn 165: you declare war on the empire raising the Opus. For ten turns every town turns out Longswordsmen twice as fast, and The Fyrd turns citizens into more, at no upkeep.
  - Turn 170: they hurl themselves at the walls. Each one that falls rises again in your border town, and the Hall of the Slain climbs toward +30%.
  - Turn 190 (Tier IV): peace. You march the survivors home and disband them into the Opus town, each adding half its cost.
- **Without Tier IV,** the build keeps its capstone, and earlier cards still in the collection (The Conscription Rolls, Songs of the Fallen, The Funeral Oration) hold the three chairs. But it loses its way to win, The Legions' Labour; if Tier IV stays rare, that card should move to Tier III (question 1).
- **Also fits:** The Funeral Oration (keep it seated while war weariness bites); the shared Mercenary Contracts (Commerce).

**Utility mix:**
- science and culture: The Gathering Host, The Grand Army;
- production: The Hall of the Slain, Reserve Officers, The Arrière-ban;
- faith, early: The Funeral Games;
- happiness: The Funeral Oration;
- upkeep: The Feudal Obligation.

**Gives up:** quality (its units die before they earn ranks), citizens (levies), and happiness (weariness, Total War).

**Partners:**
- Devotion: faith buys units and losses pay faith (The Sacred Host, Rites of Passage).
- Expansionist: its levies, and the growth that refills the towns.

**Leader:** Joan of Arc (kills pay faith). Mithridates also fits, with the faster camps.

---

## 3. The steppe raiders (raiders)

**The fantasy.** Scythians, Huns, Vikings, Mongols. Riders who strike anywhere and are gone before the defenders arrive, who grow rich on what others built, and who make a rival's Opus town watch its fields burn. They need no one else's towns, only what is in them.

**The loop:** ride out → pillage → plunder pays science, production and culture → riders live to earn ranks → ranked riders raid deeper.

**What changed.** The old draft had no late game at all. This version adds:
- a growing card and a this-game counter, so the plunder of every war keeps paying;
- two Tier III cards that win games: The Chevauchée strikes at a rival's build, and Danegeld pays at the peace;
- ranks as part of the build. Raiders lose few units, so their riders become Veterans and Elites, and pillage kills nobody, so their wars cost them almost no war weariness.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| The Horse Herds | 0 | common | Worked pastures and camps give +1 food and +1 production. | foundation glue | reads pastures and camps | food, production | changing; existing |
| The Bards' Praise | 0 | common | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 15 culture. | pay-off on kills | reads kills and camps | culture | user pick (name suggested; two effects, as the user wrote it); existing |
| The Swift Riders | I | uncommon | Mounted units may move after attacking. | build-defining: a broken rule | raises pillages and kills | — | user pick; new shape (unit rule) |
| Horse Lords | I | rare | Mounted units gain +3 strength and +1 movement. | pay-off: quality | reads mounted units | combat | live |
| The Captive Craftsmen | I | uncommon | Gains +1 science and +1 production each time you pillage a hex. | growing card; early scaler | reads pillages | science, production | **new**; new shape (pillage tally) |
| Riders of the Steppe | II | uncommon | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. | engine | raises pillages | — | live |
| Spoils of War | II | uncommon | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. | pay-off | reads pillages | production, culture | live |
| The Sagas | II | uncommon | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. | early scaler | reads pillages this game | culture, gold | **new**; new shape (this-game count) |

- **The opening** (the first three chairs): Blood Brothers, The Cattle Raid, and The Horse Herds or The Bards' Praise. The barbarian frontier is the first raid: beaten barbarians join the horde, and every camp cleared feeds the towns.
- **Five-chair core** (Tier I): The Horse Herds, The Bards' Praise, The Swift Riders, Horse Lords, The Captive Craftsmen.
- **Sizing:**
  - **The Bards' Praise:** a barbarian kill pays about 20 culture in age 1, when a seat makes about 4 culture a turn.
  - **The Captive Craftsmen:** +15 to +25 science and production after the first raiding war, and +50 to +70 by turn 160.
  - **The Sagas:** about +8% when Tier II opens (25 hexes pillaged). By turn 160 (70 hexes) it is about +23%: about 100 culture and 70 gold a turn in age 4.
- **How a few turns feel:**
  - Turn 25: a barbarian Horseman falls to your Chariots and joins you. The camp burns, and pays 15 culture.
  - Turn 75: at war, four Horsemen cross the border. Each strikes a Spearman, rides on and pillages a farm. Spoils of War pays production and 30 culture, and the Craftsmen gain +4.
  - Turn 120: nothing of theirs can catch you. Your oldest riders are Elites, and the Sagas pay +9% on every raid you have made.
- **Also fits:**
  - Tier 0: Blood Brothers, The Cattle Raid, Clear the Frontier, the user's faster camps;
  - Tier I: The Pacified Marches, The Quartermasters;
  - Tier II: Living off the Land, Master Bowyers;
  - shared: The Barbarian Frontier (Expansionist), Copying the Enemy (Scientific).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| The Captive Craftsmen | I | uncommon | (above) | carried scaler | reads pillages | science, production | **new** |
| The Sagas | II | uncommon | (above) | carried scaler | reads pillages this game | culture, gold | **new** |
| The Chevauchée | III | rare | Pillaging a hex within three hexes of a rival town also takes 60 production from what that town is building. | capstone: denies the Opus | reads pillages | sets a rival back | **new**; new shape (a raid on a rival's build) |
| Danegeld | III | rare | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. | the moment | reads pillages this war | gold, culture | **new**; new shape (peace, and a record of the war) |
| The Plunder Trains | III | common | Pillaging grants 60 production to your town nearest the pillaged hex. | pay-off | reads pillages | production | **new**; existing (Spoils of War's shape) |
| The Yam | III | common | Mounted units heal fully when they pillage. | utility: they stay out | raises pillages | — | **new**; existing (pillaging already heals) |
| The Keshik | III | uncommon | Mounted Veteran and Elite units gain +1 movement. | engine | reads ranks | — | **new**; new shape (rank test on a unit) |
| The Tagmata | III | uncommon | Veteran and Elite units gain +5 strength. | pay-off, for war | reads ranks | combat | **new**; a bridge from the drilled legions |
| Total War | III | rare | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. | pay-off with a drawback | — | combat | live |
| The Grand Coalition | IV | rare | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. | finisher: denies the Opus | — | combat, production | live |
| The Horde | IV | rare | Pillaging a hex also pillages every enemy improvement beside it. | long-game capstone | multiplies every pillage pay-off | — | **new**; new shape |

- **Carried over:** The Captive Craftsmen (+50 to +70 science and production) and The Sagas (about +25%).
- **The capstone, The Chevauchée:**
  - The rival raising the Opus watches its progress fall: six pillages around its Opus town take 360 hammers off the Opus.
  - This is how the raiders win: they stop the leader, while plunder pays for their own research and drafts.
- **The moment, Danegeld:** a raiding war that burned 25 hexes ends in a peace that pays 1,000 gold and 1,000 culture, two drafts at once.
- **How a few turns feel:**
  - Turn 165: three Elite Knights cross the border, ride past the Pikemen on The Keshik's extra move and burn a mine beside the Opus town. The Opus loses 60 hammers, the Knights heal fully and ride on, and the Craftsmen reach +70.
  - Turn 175: the rival sues for peace. Danegeld pays 1,200 gold and 1,200 culture.
  - Turn 190 (Tier IV): one pillage burns the ring of farms around a town.
- **Without Tier IV,** the build keeps its capstone and its moment, and Spoils of War and Riders of the Steppe hold the spare chairs.
- **Also fits:**
  - Living off the Land;
  - Circumvallation (deferred; the same denial, for a siege);
  - with Commerce, the shared War Bonds and Letters of Marque.

**Utility mix:**
- science: The Captive Craftsmen;
- production: the Craftsmen, The Plunder Trains;
- culture and gold: The Sagas, Danegeld;
- staying in the field: The Yam;
- speed: The Swift Riders, The Keshik;
- denial: The Chevauchée, The Grand Coalition.

**Gives up:** holding land, defence, and its own towns' growth. At peace it lives on its scalers, which keep paying for raids already made.

**Partners:**
- Commerce: plunder and Danegeld turn into purchases; War Bonds reads the gold.
- Expansionist: camps and pastures, and The Barbarian Frontier.

**Leader:** Modu Chanyu (mounted movement; pillage pays half again; pastures pay production and faith).

---

## 4. The conqueror (conquest)

**The fantasy.** Alexander, Rome, Assyria, Timur. Every town taken makes the next one easier. The conquered pay for the next war, their scholars fill your libraries and their sons fill your ranks, and the empire ends by taking the Magnum Opus itself.

**The loop:** break the walls → take the town → pacify it → it pays science, production and culture, and soldiers → break the next walls.

**What changed.** The old draft was complete from Tier II up, but it had nothing early, and it had more capture payouts than chairs. Unrest gives the middle game a puzzle: a taken town makes no production, science or culture until it is pacified. So this version adds:
- cards that speed pacification, pay when a town is pacified, or cash a town out instead of keeping it;
- an early siege trick;
- one doubler that makes the many capture payouts worth seating together.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| Battle Honours | 0 | common | Commission. Kill ten units while this card is seated. Then choose a great general from a draft. The card leaves its chair. | opener: the first general | reads kills; raises generals | — | changing; existing |
| The Scaling Ladders | 0 | common | Melee units gain +4 strength against towns. | opener: the early rush | raises captures | combat | **new**; existing (a strength line against towns) |
| The Satraps | I | uncommon | Garrisoned towns in unrest pacify twice as fast. | utility: holding | raises pacification | — | **new**; new shape (pacification rate) |
| The Sack | I | uncommon | Razing a town you captured grants production, gold and culture equal to fifteen times its population. | pay-off: cash it out | reads razing | production, gold, culture | **new**; new shape (razing as a moment) |
| The Wooden Horse | I | rare | Once every twenty turns, one of your units may attack a town as though its walls had fallen. | build-defining: a one-off trick | raises captures | — | **new**; new shape (unit rule) |
| Triumphs | II | common | Capturing a city grants culture equal to fifteen times its population. | pay-off, the moment | reads captures | culture | live |
| The Provincial Census | II | uncommon | Pacifying a town grants science equal to twenty times its population. | pay-off, the second moment | reads pacification | science | **new**; new shape (pacification as a moment) |
| Spear-won Land | II | uncommon | +2% production and science for every town you have captured this game, at most +30%. | early scaler | reads towns captured this game | production, science | **new**; new shape (this-game count) |

- **Five-chair core** (Tier I): Battle Honours, The Scaling Ladders, The Satraps, The Sack, The Wooden Horse.
- **Sizing:**
  - **The Scaling Ladders:** +4 against a town in age 1, when units are 15 to 33 strong, is band 0's strong line: a rush before walls.
  - **The Satraps:** a six-citizen town needs 12 pacification. A garrison makes the rate 2 a turn (six turns); doubled, it takes three. Each turn saved is a whole town's production, science and culture.
  - **The Sack:** a six-citizen town razed pays 90 production, 90 gold and 90 culture: a band 1 lump.
  - **The Provincial Census:** an eight-citizen town pays 160 science when it is pacified, about a turn and a half of age 3 science.
  - **Spear-won Land:** about +8% when Tier II opens (four towns taken). By turn 160 (thirteen) it is about +26%: about 125 production and 130 science a turn in age 4.
- **How a few turns feel:**
  - Turn 25: a neighbour's town sits two hexes past your border with no walls. Spearmen with ladders storm it.
  - Turn 40: Battle Honours is met. You draft a great general, who rides with the army and calms what it takes.
  - Turn 75: the Wooden Horse opens a walled town's gate. Triumphs pays 90 culture. The Satraps settle the town in three turns, and The Provincial Census pays 120 science when they do. A small town you cannot hold is razed for 90 production, gold and culture.
- **Also fits:**
  - Tier 0: The Defiant Kingdom, the user's "+30% production toward first- and second-age military units", The Bards' Praise;
  - Tier I: The Marshals;
  - Tier II: Hegemony, Siege Works, Conquered Archives, Commission: Take the City, Master Bowyers;
  - shared: The Sword of State, Carried-Off Scholars, The Crusader Orders, Convert It or Tax It, Looted Art.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Status, shape |
|---|---|---|---|---|---|---|---|
| Spear-won Land | II | uncommon | (above) | carried scaler | reads towns captured | production, science | **new** |
| The Siege Train | III | uncommon | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. | engine | raises captures | combat | live |
| Total War | III | rare | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. | pay-off with a drawback | — | combat | live |
| The Devshirme | III | rare | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. | build-defining: the conquered fill your ranks | reads captures; raises units and ranks | — | **new**; new shape (a levy for captured towns, with experience at birth) |
| The Mural Crown | III | uncommon | The unit that captures a town becomes an Elite. | the moment | reads captures; raises ranks | — | **new**; new shape (experience granted to the unit that acts) |
| The Victory Mint | III | uncommon | Capturing a city grants gold equal to thirty times its population. | pay-off | reads captures | gold | proposed; existing |
| Pax Romana | III | rare | Towns you capture are pacified at once. | capstone: a broken rule | reads captures | — | **new**; new shape |
| Imperium | IV | rare | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. | finisher: the win | reads captured towns held | production toward the Opus | live |
| Spolia | IV | rare | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. | finisher, a moment | reads the capture of an Opus town | production toward the Opus | live |
| The Annexed Provinces | IV | rare | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. | pay-off: empire percentages | reads captured towns held | science, culture | live |
| Vae Victis | IV | rare | Your capture rewards are paid twice. | doubler | reads captures | doubles every capture payout | **new**; new shape (a doubler on the capture) |

- **Carried over:** Spear-won Land, at about +26%.
- **The capstone, Pax Romana:** a captured town works the turn it falls. The pacification moment fires at once, so The Provincial Census, if it is still held, pays on the capture.
- **The moments:**
  - The Mural Crown: the first soldier over the wall comes out an Elite.
  - Spolia, in Tier IV: take the town raising the Opus, and its progress with it. With Vae Victis, all of its progress.
- **How a few turns feel:**
  - Turn 160: the Siege Train brings Trebuchets to the walls, and the Longswordsmen beside them strike at +6. The one that takes the town becomes an Elite. The town works at once, the Mint pays 300 gold, and Spear-won Land rises to +26%.
  - Turn 165: the captured town levies two Veteran Longswordsmen, and they march on with the army.
  - Turn 190 (Tier IV): you storm the capital of the empire raising the Opus. Spolia, doubled by Vae Victis, moves its whole Opus into yours, and Imperium adds +40% toward finishing it.
- **Without Tier IV,** the build keeps its capstone, and earlier cards still in the collection (Triumphs, The Provincial Census, The Satraps, The Sack) hold the four chairs.
- **Also fits:**
  - The King's Peace (Tier III, uncommon, **new**): "A great general standing in a town in unrest pacifies it at the start of the next turn." It is the uncommon route to what Pax Romana does.
  - Tier IV: Commission: Hold the Capitals, Commission: The Grand Campaign, Commission: The Captured Marvel, The Proconsuls.
  - Shared: The New Code (Magisterial).

**Utility mix:**
- production and science: Spear-won Land;
- science and culture: The Annexed Provinces;
- gold: The Victory Mint;
- soldiers: The Devshirme;
- holding: The Satraps, Pax Romana;
- siege: The Scaling Ladders, The Wooden Horse, The Siege Train.

**Gives up:** its own towns' development, and happiness to unrest and weariness while it learns to hold what it takes. It needs targets: a peaceful neighbourhood leaves it idle.

**Partners:**
- Devotion: the holy war.
- Scientific: Carried-Off Scholars, Copying the Enemy.
- Magisterial: Looted Art, The New Code.
- Commerce: the Mint's gold buys the next army.

**Leader:** Mithridates VI (strength against an empire holding more towns; The Defiant Kingdom).

---

## Across the four builds

### Bridges and pivots

- **Ranks run through three builds:**
  - The Tagmata serves the legions and the raiders.
  - The Training Cadre and The Drill Masters serve the legions, and make a conqueror's assault troops Veterans.
  - The Mural Crown and The Devshirme are conquest cards that make Veterans and Elites.
- **Cards that suit more than one build:**
  - Total War: the host, the raiders and the conqueror.
  - Reserve Officers: the legions and the host.
  - Living off the Land: the host, the raiders and the conqueror.
- **Generals:** Battle Honours and The King's Peace (conqueror), Up Through the Ranks and The Marshalate (legions).
- **Kills:** Songs of the Fallen (host), The Bards' Praise (raiders, conqueror), Battle Honours (conqueror).
- **Razing:** The Sack also gives the raiders a way to cash out a town they will not hold.
- **The pivots this opens:**
  - host → conqueror: numbers break walls, then the conqueror's cards hold the towns;
  - raiders → conqueror: sack first, then keep;
  - conqueror → legions: hold the conquests with ranked garrisons.

### How the war costs pull the builds apart

- **The legions** lose few units and ransom their Elites. War weariness falls on whoever attacks them.
- **The host** pays weariness unless it feeds barbarians, and The Funeral Oration halves it.
- **The raiders** avoid it: pillage kills no one, and their riders live to earn ranks.
- **The conqueror** manages unrest (The Satraps, The Provincial Census, Pax Romana) and the weariness of long sieges.

### New shapes, and the cards that use them

**The count:**
- 36 new cards in the builds, and one alternative (The King's Peace).
- Seven of them use shapes that already exist: The Scaling Ladders, The Conscription Rolls, The Fyrd, The Arrière-ban, The Valetudinaria, The Yam and The Plunder Trains.
- The other 29 need a new shape.

Three families carry most of them. Each reads a mechanic already in the game (ranks, unrest, the moments cards already pay on), so none adds a new mechanic.

1. **Ranks and experience.** The ranks build left "cards that read ranks or grant experience" for later.
   - A moment when a unit earns a rank, as a windfall occasion and a tally: Honours of the Legion, Up Through the Ranks. The Mural Crown fires it.
   - Experience grants:
     - every few turns in a town: The Drill Grounds;
     - at birth: The Training Cadre, The Drill Masters, The Devshirme;
     - to the unit that acts, as pillage's healing works today: The Mural Crown.
   - Rank tests:
     - on a unit: The Tagmata, The Keshik;
     - on a town's garrison: The Fabricae;
     - ranks earned this game: The Veterans' Roll.
   - A ranked unit returned instead of dying: Knightly Ransom.
2. **Pacification.** The unrest build left it for cards.
   - A moment when a town is pacified: The Provincial Census.
   - A card line in the pacification list: The Satraps.
   - Pacification at once: Pax Romana, and the alternative The King's Peace.
3. **"This game" counts.**
   - units lost: The Hall of the Slain;
   - towns captured: Spear-won Land;
   - hexes pillaged: The Sagas;
   - ranks earned: The Veterans' Roll.

   The Pacified Marches' revision needs the same thing for camps.
4. **Pillage.**
   - A tally for a growing card: The Captive Craftsmen.
   - A raid that hits a rival's build: The Chevauchée.
   - Pillage that spreads: The Horde.
5. **The end of a war:** a moment when peace is signed, carrying what that war took (Danegeld). The deferred War Reparations and Commission: A Victor's Peace need the same thing.
6. **Unit rules:**
   - stay in the town after a kill: The Sally Port;
   - ignore walls once: The Wooden Horse;
   - a fallen unit replaced: Valhalla;
   - the user's move after attacking: The Swift Riders.
7. **One card each:**
   - a weight on your own war weariness: The Funeral Oration;
   - razing as a moment: The Sack;
   - a mark on units raised by a levy: The Feudal Obligation;
   - disbanding that pays: The Legions' Labour (deferred).
   - A doubler on every card's payout for a capture: Vae Victis. A windfall rider's `percent` may already do this, but its docblock says it scales only the occasion's own payout.

The one-card shapes and the unit rules are where to cut if the user wants less engine work.

One correction to the sheet: Living off the Land needs no new shape. `upkeepRebate` with `where: 'foreignTerritory'` already says it, and a hex nobody owns counts as abroad.

### Sheet cards no build uses

- **Flat civic riders on military buildings,** which the tempo ruling asked to rework:
  - The War Hall Schools and Drill Manuals are replaced here by Honours of the Legion and The Training Cadre;
  - Armoury Guilds and Arsenals: rework into ranks or training, or cut.
- **Naval:** Marine Drill and Naval Supremacy. Naval play has no build; that is fine if it stays a minor thread.
- **Economy cards with no engine:** The Soldiers' Purse, March Discipline, The Bronze Smiths, The Camp Chaplains, and the user's "scouts gain +1 sight; discoveries grant +8 production".
- **A pair card:** The Armed Colony (Expansionist's side of the frontier).
- **A duplicate:** the user's "gaining a unit grants science equal to its strength" does The Art of War's job (question 7).
- **Capture payouts beyond what a build seats:** Commission: Take the City, Commission: Hold the Capitals, Commission: The Grand Campaign, Commission: The Captured Marvel and The Proconsuls. They stay as the conqueror's alternatives, and Vae Victis makes any of them worth seating beside the others.

Adopting the whole draft adds 36 cards and replaces 2. The list above holds 11 more to rework or cut.

### Questions for the user

1. **Tier IV:** it opens at draft 45, which 7 of 30 bot seats reached (median turn 189). Should the rung come down, to about 38 drafts? Or should each build's capstone stay in Tier III, as drafted here, with The Legions' Labour (the host's way to win) moved down to Tier III as well?
2. **The drilled legions:** the garrison state becomes a build on ranks. Is that the right direction? Should drilling stop at Veteran, so that Elites come only from war against empires?
3. **The three main families** (ranks, pacification, "this game" counts) carry most of the new cards. Should they be built?
4. **The capstones that break rules** (Knightly Ransom, Valhalla, The Chevauchée, Pax Romana in Tier III; The Horde and Vae Victis in Tier IV): are they the right size for "break the game late" (the ruling of 2026-10-12), or too much?
5. **The host's win:** should The Legions' Labour be un-deferred, and should a unit raised by a levy count toward it, so citizens become soldiers and then the Opus?
6. **The cards no build uses:** rework or cut?
7. **Two duplicates:**
   - the user's "gaining a unit grants science equal to its strength" against The Art of War;
   - The Call to the Spear against Expansionist's The Muster of the Fields (already flagged on the sheet).

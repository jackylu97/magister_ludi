# Dominion: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-21. Nothing here is built. The deck sheet (`docs/decks/dominion.md`), the data and the code are unchanged. This is the Dominion deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"), done in the same way as the Scientific pass (`docs/plans/scientific-themes.md`). It revises the four builds of `docs/plans/dominion-builds.md` (2026-10-15), which are built and live. The review list is `docs/plans/dominion-list-proposed.md`.

Your request, 2026-10-21, verbatim:

> *"please do the same type of pass on the dominion deck."*

The direction for every pass, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

The pass reads the sheet as it stands in the working tree, with your removal of The Servian Reforms. It does not change the Doctrines.

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26).
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). A *capstone* breaks a rule or doubles a category. *Engine glue* raises or spends the engine itself.
- **Status:**
  - *kept (built)*: on the sheet and in the data, unchanged;
  - *reworked*: on the sheet, changed by this pass;
  - *deferred*: on the sheet, waiting on your rework because it needed a UX decision; this pass proposes a version with no new input;
  - *new*: not on the sheet;
  - *cut*: on the sheet and in the data; its row is retired.
- **Shape:** *existing*, *new shape* (section 7), or *feature B* / *feature C* (section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **Institution:** an effect that a commission leaves for the rest of the game when it is met. It takes no chair. The shape exists: `CommissionReward.lasting`, built for Expansionist's The Heartland (batch E5).
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Dominion acts. It raises soldiers early and uses them at once: it clears the frontier, garrisons and drills its towns, raids its neighbours and takes their towns. Each deed pays now. The big deeds are its commissions, and most of the middle ones leave a lasting institution behind.
- It is paid for deeds (fights, captures, commissions), it is strongest early as the tempo deck, and it gives up development at home unless it keeps acting.
- Your picture of it, 2026-10-20: *"goal oriented, many of the things in the deck are action oriented (i.e. doing things with your soldiers). I'd like this deck to have a higher percentage of commissions that involve using your soldiers actively. The soldier economy is also useful, gaining and deploying soldiers to cities."* And: *"The late game should have bonuses for captured cities, and involve a mix of economic/civic options for an already large army and taking advantage of shared deck cards."*

### The engine

- **Soldiers and commissions.** The deck makes soldiers in bulk and spends them on deeds. Commissions turn the biggest deeds into rewards now and institutions for later. Section 3 has the details.

### What changes from the four builds

- The four builds of 2026-10-15 were all about the army: the drilled legions, the endless host, the steppe raiders and the conqueror. Each fed one army quantity, and most of them paid science and culture. That is Dominion's one note.
- The themes move the deck into the other areas of the game:
  - the drilled legions become **the garrison state**: soldiers in towns pay the economy and keep order;
  - the steppe raiders become **the marches**: the land the army works, and the land it burns;
  - the conqueror becomes **the provinces**: towns taken and held, with civic life as the puzzle;
  - generals and citadels, a thread in two builds, become **the captains**: great people, and the wonders taken in war;
  - the endless host's gains and losses become engine glue, because every theme gains and loses soldiers.
- Commissions move to the centre. There are 13, against 7 before, and six of them leave an institution.

### Materials

"Self-producing" means a Dominion game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Units gained | Yes | `unitCompletion`, the `unitGained` tally | engine |
| Kills and losses | Yes, while fighting; barbarians count | `kill` and `death` occasions, `Player.enemiesKilled`, `Player.unitsLost` | engine |
| Commissions met | For an active seat | `PlayerStatecraft.commissionsFulfilled`, `CommissionReward.lasting`; no card reads a met commission yet (feature C) | engine |
| War declared, and peace | Every game has both | `declareWar` and `peace` occasions, the `warEnded` tally, `WarState.taken` and `.pillaged` | engine, provinces, marches |
| Soldiers standing in towns | Yes | the `garrison` count, the `garrisoned` scope | garrison state |
| Ranks and experience | Yes, from fights and drill | the `rankEarned` occasion and tally, `ranksEarned`, `holdsRank` | garrison state |
| Military buildings | Mostly | Barracks, walls, Armoury; `defensiveBuildings`, `hasBuilding` | garrison state |
| Fortified units | For a seat that holds | `fortifiedUnits`, the `fortifiedUnit` tile test | garrison state, captains |
| Barbarian camps | Yes, in ages 1 and 2 | the `camp` occasion, `campCleared`, `clearedCamps` | marches |
| Pastures, camps and strategic resources | Depends on the map | Dominion's improvement family; tile tests | marches |
| Mounted units | Depends on horses | `class: mounted` | marches |
| Pillage | Only when raiding | the `pillage` occasion, `hexPillaged`, `hexesPillaged` | marches |
| Captured towns | Only when a war succeeds | the `capture` occasion, `cityCaptured`, `City.capturedOn`, the `captured` scope | provinces |
| Unrest and pacification | After every capture | `City.unrest`, the `pacified` occasion, `explainPacification` | provinces |
| Puppets | After every capture, until annexed | `City.puppet`, `puppetPopulation`, the annex command | provinces |
| Razing | A choice after a capture | the `raze` occasion | provinces |
| Great generals and renown | Slowly: three general triumphs an age, and the cards | `greatPersonGained`, `greatPeopleCalled`, renown with a family | captains |
| Citadels | From generals | the citadel: +2 production, +8 defence, claims its ring of hexes | captains |
| The general's aura and act | While the general lives | +3 strength within two hexes (`generalAuraStrength`); the act heals and gives +3 for five turns | captains |
| Wonders and works in rival towns | When conquering | `wonderOrCapitalCaptured`, Looted Art's measure, Spolia | captains, provinces |

### What a Dominion player wants in each age

- **Age 1 (Tier 0): raise the first soldiers and use them.** Clear camps, garrison the first towns, earn the first ranks, call the first general, meet the first commission. Culture from kills pays for the early drafts.
- **Age 2 (Tier I): found the first institutions.** Meet a commission in the theme you lean on (The Ranks of Merit, Harry the Border, The First Province). Take a first town or burn a border. Plant the first citadel.
- **Age 3 (Tier II): the big war, and making it pay.** Siege, pacify, ransom at the peace. Soldiers in towns drive production (The Fabricae). The scalers grow: The Veterans' Roll, The Sagas, Spear-won Land, The Roll of Triumphs, The Res Gestae.
- **Age 4 (Tiers III and IV): the capstones, then the Opus.** Soldiers work the land (The Limitanei), towns work the turn they fall (Pax Romana), raids strike the walls (The Chevauchée), new soldiers muster at the general (Rally to the Standard). Then take the Opus (Spolia), stop it (The Grand Coalition), or raise it with captured towns and disbanded soldiers (Imperium, The Legions' Labour).

### The areas it reaches

All five:
- **the army:** the engine itself, and ranks in the garrison state;
- **the land:** the marches, and the citadels' rings;
- **the economy:** the garrison state's food, production and gold, the provinces' gold and food, and the ten-turn bursts;
- **civic life:** happiness and authority from soldiers, unrest and pacification, war weariness;
- **great people and wonders:** the captains, and the wonders taken by capture.

Dominion's civic life is order kept by force: soldiers in the towns, and conquests pacified. Devotion reaches the same meters through faith, and Expansionist through public works. Dominion touches the government system only through A Victor's Peace's chair (question 10).

### Its cost

Dominion gives up development at home unless it keeps acting. The cards show it:
- **The bursts lapse.** The Cattle Raid, Hegemony, The Arrière-ban and The Ovation pay for ten turns after a deed. An idle army earns nothing from them.
- **Commissions pay only when met.** Until then the Wildcard chair pays nothing.
- **Buildings come slowly.** The Spartan Discipline builds buildings 15% more slowly. Reserve Officers at peace is the one card that speeds buildings.
- **War cards carry their price.** Total War costs happiness, The Hunting Grounds brings more raiders, and The Defiant Kingdom pays only while a rival is wider.
- **Soldiers cost upkeep.** The garrison state wants soldiers in every town; The Standing Army waives the upkeep only for garrisons.

### Pairs

- **Expansionist, the frontier** (Mithridates VI). Expansionist gives levies (the shared The Muster of the Fields), towns to garrison (the shared The Frontier Militia puts a soldier in each new town, so Commission: Man the Walls meets itself), and land worth holding. Dominion gives cleared ground (The Barbarian Frontier), captured towns, and garrisons that farm (The Farming Garrisons, The Soldier-Farmers). Tension: The Spartan Discipline slows the buildings Expansionist wants. Best with the garrison state and the marches.
- **Commerce, merchants and their guards** (no leader). Commerce gives gold that buys soldiers (Professional Soldiers, War Bonds, The Chartered Company) and raids at sea (Letters of Marque). Dominion gives gold from war (The First Province, The Tributary Kings, The Victory Mint, War Reparations, Danegeld) and garrisons that guard routes (The Escorted Roads). Best with the provinces.
- **Devotion, the holy war** (Modu Chanyu, Joan of Arc). Devotion gives faith that buys soldiers (The Sacred Host), The Oriflamme, The Crusader Orders, and Holy Sites beside citadels (The Holy Army). Dominion gives faith from fighting (The Camp Chaplains, Rites of Passage), captured towns to convert or tax (Convert It or Tax It), and pastures and camps, the shared improvements. Best with the captains and the provinces.
- **Scientific, the military edge** (no leader). Scientific gives line traits, the Tophane, and a strength line near great generals (its reworked The Strategikon). Dominion gives kills and captured schools (Field Academies, Copying the Enemy, Carried-Off Scholars), The Engineer Corps, and The Soldier-Scholars, now shared: soldiers in towns pay science. Feature B puts the two on opposite sides of one measure: Scientific's reworked The Edge of the Sword strikes the empire behind it, and Dominion's The Upstarts strikes the empire ahead. Tension: Scientific wants few units and the garrison state wants many; The Soldier-Scholars pays both. Best with the garrison state and the captains (a Citadel beside an Academy counts as one under The Studium Generale).
- **Magisterial, the triumph** (Emperor Taizong). Magisterial gives governments, Doctrines and draft flexibility (The New Code, The Sword of State), and cards that pay works of any family. Dominion gives generals and citadels (works for Magisterial's arrangements), Looted Art, and Examinations of State. Tension: A Victor's Peace adds a chair, which is government ground. Best with the captains.

### Leaders

- **Emperor Taizong** (Dominion, Magisterial) leads the garrison state: melee strength, and garrisoned towns pay happiness and culture. Their cards: Sword and Plough, Martial Law, The Garrison Captains, Commission: Man the Walls, Standing Garrisons, The Limitanei, The Military Frontier.
- **Modu Chanyu** (Dominion, Devotion) leads the marches: mounted movement, pillage half again, pastures that pay production and faith. Their cards: The Horse Herds, Horse Lords, The Swift Riders, Commission: Harry the Border, The Naadam, The March Revenues, The Chevauchée, The Horde.
- **Mithridates VI** (Dominion, Expansionist) leads the marches' camps (The Horse Herds, The Cattle Raid, The Naadam) and the provinces' underdog (The Defiant Kingdom). The Upstarts reads technologies, not towns, so it is a cousin of their strength line, not a copy.
- **Joan of Arc** (Dominion, Devotion) leads the engine's kills: The Camp Chaplains, Songs of the Fallen, The Bards' Praise, The Champion's Portion. Joan also suits the captains.
- **The gap:** no leader points at the provinces' civic side or at the captains. A general who led a Dominion and Magisterial empire would suit the captains, but Taizong holds that pair. Leaders are tuned later.

## 3. The engine: soldiers and commissions

### How commissions work here

- **Soldiers are the currency.** The deck makes them in bulk (levies, musters, training speed) and spends them on deeds: fights, raids, captures, cleared camps.
- **Commissions are the engine's act.** A commission is a goal for the soldiers. It follows your picture: goals that use the soldiers actively, and value earlier for an adept player.
  - **Early commissions pay at once** (Tier 0): a lump, a unit or a general.
  - **Middle commissions found an institution** (Tiers I to III): an effect held for the rest of the game, with no chair. This is the split in "Direction, 2026-10-20": Dominion's institutions are the lasting effects its commissions leave.
  - **Late commissions win wars and the Opus** (Tier IV).
- **Every theme has two or more.**
- **They stay Wildcard.** A seat runs one at a time until Tier III, two at Tier III and three at Tier IV, plus A Victor's Peace's chair. An adept player meets each one fast and seats the next, and the institutions pile up with no chair. Question 3 asks whether to change this.
- **Feature C** (section 6) adds two cards that read a met commission.

### The commissions

| Commission | Tier | Rarity | Goal | Reward | Theme | Status |
|---|---|---|---|---|---|---|
| Clear the Frontier | 0 | common | clear two barbarian camps | two citizens in the capital, and the best melee unit | marches | kept (built) |
| Battle Honours | 0 | common | kill ten units | a great general from a draft | captains | kept (built) |
| Man the Walls | 0 | common | soldiers standing in three of your towns at once | 30 production in each town with a garrison | garrison state | new |
| The Ranks of Merit | I | uncommon | three ranks earned | **institution:** each rank earned grants 20 production to its nearest town | garrison state | new |
| Harry the Border | I | uncommon | pillage four hexes | **institution:** pillaging costs your mounted units no movement | marches | new |
| The First Province | I | uncommon | capture a town | **institution:** towns you captured gain +3 gold and +2 food | provinces | new |
| Take the City | II | uncommon | capture a town of five citizens or more | science and culture, and a free Barracks in that town | provinces | kept (built) |
| The Border Fortress | II | uncommon | plant a citadel | **institution:** your citadels claim two rings of hexes, not one | captains | new |
| A Victor's Peace | III | rare | peace with, or the end of, an empire after taking two of its towns in that war | **institution:** one more Wildcard chair | provinces | kept (built) |
| The Chosen Men | III | uncommon | three units become Elite | **institution:** your Elite units ignore enemy zone of control | garrison state | new |
| The Grand Campaign | IV | uncommon | capture three towns | a great general, and science and culture | provinces | kept (built) |
| Hold the Capitals | IV | rare | hold two original capitals | +25% production for twenty turns, and a great general | provinces | kept (built) |
| The Captured Marvel | IV | rare | capture a town with a wonder, or a capital | science and culture | captains | kept (built) |

- **13 commissions,** 10% of the 132 seatable cards, against 7 of 124 (6%) before. By theme: garrison state 3, marches 2, provinces 5, captains 3.
- **Sizing the institutions.** They are modest, because they take no chair and last all game:
  - The Ranks of Merit: at one rank every three turns, about 7 production a turn, more with drill and Double Time.
  - The First Province: three captured towns pay 9 gold and 6 food a turn. Unrest stops production, science and culture, but not gold or food, so it pays while the town is still in revolt.
  - Harry the Border and The Chosen Men are rules: a rider burns several hexes in one turn, and an Elite walks through an enemy line.
  - The Border Fortress: a citadel claims 18 hexes instead of 6.
- **Man the Walls** pays 90 production for three towns at Tier 0, the size of band 0's lump (50 to 100). It is easy for a player who garrisons early, which is the point.

### Engine glue

| Card | Tier | Rarity | Job | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Camp Chaplains | 0 | common | early faith | Killing or losing a unit grants faith equal to its strength. | faith | Civic | reworked (absorbs The Funeral Games); existing (a second rider) |
| The King's Levy | 0 | rare | soldiers | Every fifteen turns your capital raises a melee unit for free. It costs no upkeep. | units | Military | kept (built) |
| The Grain Tribute | 0 | common | a basic economy card | +1 food and +1 production in every city. | food, production | Economic | kept (built) |
| The Bards' Praise | 0 | common | kills | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 15 culture. | culture | Civic | kept (built) |
| The Spear Makers | 0 | common | soldiers | +30% production toward first- and second-age military units. | production toward units | Military | kept (built) |
| The Captured Arms | 0 | common | kills (this game) | +1 science for every unit you have killed this game, no cap. | science | Civic | kept (built) |
| The Gathering Host | 0 | uncommon | units gained (grower) | While seated, this card gains +1 science and +1 culture each time you gain a unit. It starts at +2 science and +2 culture. | science, culture | Civic | kept (built) |
| The Art of War | I | uncommon | units gained | Gaining a unit grants science equal to three quarters of its strength. | science | Civic | kept (built) |
| Songs of the Fallen | I | rare | kills and losses | Killing or losing a unit grants science and culture equal to twice its strength. | science, culture | Civic | kept (built) |
| The Ovation | I | uncommon | commissions (momentum) | Completing a commission gives every town +30% production for ten turns. Completing another restarts the ten turns. | production | Economic | new; feature C |
| The Spartan Discipline | I | uncommon | the cost | Towns build military units 30% faster, but buildings 15% more slowly. | production toward units | Military | new; existing |
| Armoury Guilds | II | common | losses | When one of your units falls, your nearest town with an Armoury gains production equal to its strength. | production | Economic | kept (built) |
| The Longbowmen | II | common | a strength line | Ranged units gain +4 strength and +4 ranged strength. +5 culture each time they attack from range. | combat, culture | Military | kept (built) |
| The Hall of the Slain | II | uncommon | losses (this game) | +1% production and culture for every two units you have lost this game, at most +30%. | production, culture | Civic | kept (built) |
| The Funeral Oration | II | uncommon | losses | Units you lose count half toward war weariness. | war weariness | Civic | kept (built) |
| Double Time | II | rare | capstone (doubles) | Your Orders' effects that happen at the end of a turn or every few turns trigger twice. | Orders' turn effects twice | Wildcard | kept (built) |
| The Res Gestae | II | uncommon | commissions (this game) | +4% production and culture for each commission you have completed this game, at most +30%. | production, culture | Civic | new; feature C |
| Total War | III | rare | capstone (a drawback) | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. | combat, movement | Military | kept (built) |
| The Arrière-ban | III | uncommon | momentum | Declaring war gives every city +50% production for ten turns. Declaring war again restarts the ten turns. | production | Economic | kept (built) |
| Valhalla | III | rare | losses | When one of your units dies, gain 25 culture for each Monument in your empire. | culture | Civic | kept (built) |
| The Grand Army | IV | rare | the large army | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. | science, culture | Civic | kept (built) |
| The Grand Coalition | IV | rare | the Opus race | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. | combat, production toward units | Military | kept (built) |
| The Legions' Labour | IV | rare | the way to win | Disbanding a military unit in a town building a wonder or the Magnum Opus adds half its production cost toward it. Units raised for free add nothing, but units raised by a levy count. | production toward the Opus | Economic | kept (built) |
| The Glorious Dead | IV | rare | losses | Your losses never count toward war weariness. | war weariness | Civic | kept (built) |

- **Glue is 24 of 132 seatable cards (18%).**
- **The host stays,** as glue. Gains and losses pay (The Gathering Host, The Art of War, Songs of the Fallen, The Hall of the Slain, Armoury Guilds, Valhalla), and two cards ease war weariness. Feeding units to die is still a way to play (your ruling of 2026-10-13).
- **The Camp Chaplains** takes The Funeral Games' losses, so one card pays the deck's early faith on kills and on losses. Rites of Passage, shared with Devotion, pays it on gains.
- **The bursts:** The Arrière-ban (war declared) and The Ovation (a commission met). The Cattle Raid and Hegemony are the marches' and the provinces' own.
- **The Spartan Discipline** is the cost as a card: soldiers come 30% faster, buildings 15% more slowly. Sparta's whole state was its army.
- **The Ovation and The Res Gestae** read commissions (feature C). With a commission met every ten to fifteen turns, The Ovation keeps +30% production in every town for most of the game: at Tier I, about 15 production a turn while it holds. Five commissions met give The Res Gestae +20% production and culture.

## 4. The themes

### 4.1 The garrison state

**The fantasy:** Qin's ranks of merit, Rome's legions in their stone forts, the soldier-farmers of the Han frontier. Soldiers stand in the towns, keep order, work the land and drill to rank. **The quantity:** soldiers standing in your towns, and the ranks they earn. An army stands in its towns by itself, and garrisons drill. **Areas:** the economy and civic life, with the army through ranks.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Sword and Plough | 0 | common | widen | Each city with a garrison gains +1 culture and +2 production. | culture, production | Economic | kept (built) |
| The Standing Army | 0 | uncommon | supply | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. | upkeep, production toward units | Military | kept (built) |
| The Drill Grounds | 0 | common | supply | Units standing in your towns gain 1 experience every 4 turns. | ranks | Military | kept (built) |
| The Garrison Captains | 0 | common | widen | +1 authority for each garrisoned unit. | authority | Civic | kept (built) |
| The Campaign Annals | 0 | rare | act (grower) | While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science. | science | Civic | kept (built) |
| Commission: Man the Walls | 0 | common | act (commission) | Commission. Have military units standing in three of your towns at the same time. Then each town with a garrison gains 30 production. The card leaves its chair. | production | Wildcard | new; new shape |
| The Soldier-Farmers | I | common | widen | While at peace, garrisoned cities gain +2 food and +2 production on each worked pasture and camp. | food, production | Economic | kept (built) |
| War Foundries | I | rare | widen | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. | gold, production toward units | Economic | kept (built) |
| Martial Law | I | common | widen | Each garrisoned unit grants its city +2 happiness and +4 food. | happiness, food | Civic | kept (built) |
| The Training Cadre | I | common | supply | Units gained in a town with a Barracks start with 2 experience. | ranks | Military | kept (built) |
| The Soldiers' Purse | I | common | multiply | Military units cost 1 less upkeep for each rank they hold. | upkeep | Military | kept (built) |
| Honours of the Legion | I | uncommon | act | Each time one of your units earns a rank, gain science and culture equal to its strength. | science, culture | Civic | kept (built) |
| Walled Towns | I | common | widen | Towns with a defensive building, such as a Palisade or walls, gain +15% food. | food | Economic | kept (built) |
| Commission: The Ranks of Merit | I | uncommon | act (commission, institution) | Commission. Have three of your units earn a rank while this card is seated. Then, for the rest of the game, each rank a unit earns grants 20 production to its nearest town. The card leaves its chair. | production | Wildcard | new; existing |
| Stockpiles | II | common | widen | Cities gain +8 food per defensive building. | food | Economic | kept (built) |
| The Relay Stations | II | uncommon | act | Military units that start their turn in one of your towns connected to your capital gain +2 movement. | movement | Military | deferred; a version with no new input proposed for your rework; new shape |
| The Fabricae | II | common | multiply | Towns whose garrison is a Veteran or Elite gain +25% production. | production | Economic | kept (built) |
| The Serried Ranks | II | rare | defence | Melee units beside another melee unit gain +10 strength when defending. | combat | Military | kept (built) |
| The Veterans' Roll | II | uncommon | multiply (scaler) | +1% science and culture for every rank your units have earned this game, at most +30%. | science, culture | Civic | kept (built) |
| The Conscription Rolls | II | uncommon | supply | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. | units | Military | kept (built) |
| Standing Garrisons | III | common | multiply | Per garrisoned unit, the city gains +12% production and +12% culture. | production, culture | Civic | kept (built) |
| Reserve Officers | III | uncommon | supply | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. | production | Military | kept (built) |
| The Drill Masters | III | common | supply | Units you gain start as Veterans. | ranks | Military | kept (built) |
| The Tagmata | III | uncommon | multiply | Veteran and Elite units gain +5 strength. | combat | Military | kept (built) |
| Interior Lines | III | uncommon | supply | A step along a road costs 40% less movement. A unit that has not moved this turn gains +4 strength when attacking. | movement, combat | Military | kept (built) |
| The Regimental Schools | III | common | supply | At the end of your turn, each garrisoned unit gains 1 experience and gives its town +2 science. | ranks, science | Civic | kept (built) |
| The Board of Ordnance | III | common | widen | While at war, each city with a Barracks gains +1 production and +1 science for every three citizens. | production, science | Civic | kept (built) |
| The Limitanei | III | rare | capstone (rule-breaker) | Each military unit in one of your towns lets that town work one more hex, at most two more. | worked hexes | Economic | new; new shape |
| Commission: The Chosen Men | III | uncommon | act (commission, institution) | Commission. Have three of your units become Elite while this card is seated. Then, for the rest of the game, your Elite units ignore enemy zone of control. The card leaves its chair. | movement | Wildcard | new; new shape |
| The Praetorian Guard | IV | rare | finisher | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. | defence, combat | Military | kept (built) |
| The Military Frontier | IV | rare | finisher | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. | science, culture | Civic | kept (built) |
| The Nation in Arms | IV | rare | supply | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. | units | Military | kept (built) |
| The Varangian Guard | IV | rare | capstone (rule-breaker) | Elite units may attack twice a turn. | a second attack | Military | kept (built) |

- **Scalers:** The Campaign Annals (a grower from Tier 0) and The Veterans' Roll (Tier II).
- **Capstone: The Limitanei.** Rome's frontier soldiers were given land beside their forts and farmed it. Here a soldier in a town lets the town work one more hex, two at most, and the soldier eats no food. That breaks the rule that only citizens work hexes. In age 4, ten towns with two soldiers each work twenty more hexes at about 5 yield each: about 100 a turn, between band 3's regular and headline cards.
- **Ranks earn abilities.** A rank already gives a small strength bonus (+3 for a Veteran, +6 for an Elite). The theme adds abilities on top: The Chosen Men (Elites ignore enemy zone of control), The Varangian Guard (Elites attack twice). This is the shape you chose for Scientific's lines on 2026-10-21: a small bonus and an interesting ability.
- **What its widen cards pay:** production and culture (Sword and Plough), authority (The Garrison Captains), happiness and food (Martial Law), food (Walled Towns, Stockpiles), gold (War Foundries), science (The Soldier-Scholars, The Regimental Schools), and worked hexes (The Limitanei).
- **The Relay Stations,** deferred on its UX: the proposal drops the order to jump between towns. Soldiers that start their turn in a connected town gain +2 movement, so the reserve in one town reaches the next one fast.
- **The split:** ranks and experience are Dominion's. Scientific's elite army uses neither.
- **Bridges:** The Soldier-Farmers (to the marches); The General Staff, The Castra, The Tactica, Up Through the Ranks (to the captains); The Armed Colony and The Devshirme (from the marches and the provinces).
- **Shared cards that serve it:** The Frontier Militia, The Muster of the Fields, The Farming Garrisons, The Road Garrisons, The Escorted Roads, Examinations of State, and The Soldier-Scholars (new on this sheet; your ruling on the Scientific review page).

### 4.2 The marches

**The fantasy:** the Roman frontier and the open steppe, the Scythians and the Mongols, the marcher lords. The army works the open land and burns a rival's. **The quantity:** camps cleared, pastures, camps and strategic resources held, and hexes pillaged. Camps come by themselves in ages 1 and 2, and pillage comes with every raiding war. **Areas:** the land, and the economy.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Blood Brothers | 0 | rare | act | A barbarian unit you kill joins your side. | units | Military | kept (built) |
| Commission: Clear the Frontier | 0 | common | act (commission) | Commission. Clear two barbarian camps while this card is seated. Then gain 2 population in your capital, and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. | citizens, a unit | Wildcard | kept (built) |
| Blooded Spears | 0 | common | supply | Military units gain +2 strength, doubled against barbarians. | combat | Military | kept (built) |
| The Horse Herds | 0 | common | widen | Worked pastures and camps give +1 food and +1 production. | food, production | Economic | kept (built) |
| The Cattle Raid | 0 | common | act (momentum) | Clearing a barbarian camp gives every city +3 food for ten turns. Clearing another restarts the ten turns. | food | Economic | kept (built) |
| The Armed Colony | 0 | common | supply (land) | A town founded beside one of your military units starts with three extra hexes, and that unit becomes a Veteran. | hexes, a rank | Economic | kept (built) |
| The Outriders | 0 | common | widen | Claiming a discovery or clearing a barbarian camp grants 8 production to every town. | production | Economic | kept (built) |
| The Hunting Grounds | 0 | uncommon | supply | Barbarian camps within ten hexes of your cities spawn 50% faster. Your units gain +4 strength in your own territory. | more camps, combat | Military | kept (built) |
| The Quartermasters | I | common | widen | Worked strategic resources gain +3 food and +3 production. | food, production | Economic | kept (built) |
| Horse Lords | I | rare | supply | Mounted units gain +3 strength and +1 movement. | combat, movement | Military | kept (built) |
| The Pacified Marches | I | uncommon | multiply (scaler) | Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. | authority, culture | Civic | kept (built) |
| The Swift Riders | I | uncommon | act | Mounted units may move after attacking. | movement | Military | kept (built) |
| The Captive Craftsmen | I | uncommon | multiply (grower) | Gains +1 science and +1 production each time you pillage a hex. | science, production | Civic | kept (built) |
| Commission: Harry the Border | I | uncommon | act (commission, institution) | Commission. Pillage four hexes while this card is seated. Then, for the rest of the game, pillaging costs your mounted units no movement. The card leaves its chair. | movement | Wildcard | new; new shape |
| Riders of the Steppe | II | uncommon | supply | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. | movement | Military | kept (built) |
| Spoils of War | II | uncommon | widen | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. | production, culture | Economic | kept (built) |
| The Longships (was Marine Drill) | II | uncommon | act | A ship of yours that ends its turn beside an enemy improvement on the shore pillages it. | pillage from the sea | Military | deferred; a version with no new input proposed for your rework; new shape |
| Living off the Land | II | common | supply | Military units outside your territory cost no upkeep. | upkeep | Military | kept (built) |
| The Sagas | II | uncommon | multiply (scaler) | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. | culture, gold | Civic | kept (built) |
| War Feeds Itself | II | rare | widen | At the end of your turn, each of your units in enemy territory yields you its hex's yields. | hex yields | Economic | kept (built) |
| The Naadam | II | common | widen | Towns gain +2 culture and +1 happiness for each pasture and camp in their borders. | culture, happiness | Civic | new; existing |
| The Plunder Trains | III | common | widen | Pillaging grants 30 production and 15 food to your capital. | production, food | Economic | kept (built) |
| The Yam | III | uncommon | supply | Mounted units heal fully when they pillage. | healing | Military | kept (built) |
| The Chevauchée | III | rare | capstone (rule-breaker) | Pillaging a hex damages enemy cities within three hexes with 50% of the pillaging unit's strength. | strikes on towns | Military | kept (built) |
| Danegeld | III | rare | act | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. | gold, culture | Civic | kept (built) |
| The March Revenues | III | uncommon | multiply | +3% production for each pasture, camp and strategic resource inside your borders, at most +30%. | production | Economic | new; existing |
| The Horde | IV | rare | finisher | Pillaging a hex also pillages every enemy improvement beside it. | pillage spreads | Military | kept (built) |
| The Harrying | IV | rare | act | Pillaging a hex beside a rival town with no garrison throws that town into unrest. | unrest | Military | kept (built) |

- **Scalers:** The Pacified Marches and The Captive Craftsmen (Tier I), The Sagas (Tier II).
- **Capstone: The Chevauchée** (kept). The raid strikes the walls of every town nearby.
- **Harry the Border** makes the raid the Mongol way: once it is met, a rider pillages at no cost and rides on, so one Horseman burns several hexes a turn. Each one pays The Captive Craftsmen, Spoils of War, The Plunder Trains and The Sagas.
- **The Naadam** (the Mongol summer festival of horses, archery and wrestling) gives the land a civic pay: culture and happiness from pastures and camps. A town with two pastures and a camp gains +6 culture and +3 happiness.
- **The March Revenues** multiplies the land: eight pastures, camps and strategic resources give +24% production; in age 4 that is about 110 a turn.
- **What its widen cards pay:** food and production (The Horse Herds, The Quartermasters, The Plunder Trains), production and culture (Spoils of War), culture and happiness (The Naadam), a rival's hex yields (War Feeds Itself), and land (The Armed Colony).
- **The Longships,** deferred on its UX: the proposal drops the pick of a target. A ship that ends its turn beside an enemy improvement on the shore burns it.
- **The split:** pastures and camps are shared with Devotion, and strategic resources with Scientific (the pair grid). Dominion pays food, production, culture and happiness on them; Devotion pays faith.
- **Shared cards that serve it:** The Barbarian Frontier, Marcher Lords, Letters of Marque.

### 4.3 The provinces

**The fantasy:** Rome's provinces, the Persian satrapies, the Ottoman devshirme. Towns taken by force are pacified and held, kept as client kingdoms, razed, or ransomed at the peace. **The quantity:** captured towns held, and the moments of capture, pacification and peace. It comes only when a war succeeds. **Areas:** civic life (unrest, authority, war weariness) and the economy (captured towns' gold, food and production).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Scaling Ladders | 0 | common | supply | Melee units gain +4 strength against towns. | combat | Military | kept (built) |
| The Defiant Kingdom | 0 | uncommon | supply | While another empire holds more towns than you, you train military units 25% faster. | production toward units | Military | kept (built) |
| The Satraps | I | uncommon | supply | Garrisoned towns in unrest pacify twice as fast. | pacification | Civic | kept (built) |
| The Sack | I | uncommon | act | Razing a town you captured grants production, gold and culture equal to fifteen times its population. | production, gold, culture | Economic | kept (built) |
| The Upstarts | I | uncommon | supply | Your units gain +3 strength against the units of an empire that knows more technologies than you. | combat | Military | new; feature B |
| Commission: The First Province | I | uncommon | act (commission, institution) | Commission. Capture a town while this card is seated. Then, for the rest of the game, towns you captured gain +3 gold and +2 food. The card leaves its chair. | gold, food | Wildcard | new; existing |
| Siege Works | II | common | supply | +38% production toward siege units. Siege units gain +4 strength against cities. | production toward siege, combat | Military | kept (built) |
| Conquered Archives | II | common | widen | Captured cities gain +6 science and +6 culture. | science, culture | Civic | kept (built) |
| Triumphs | II | common | act | Capturing a city grants culture equal to fifteen times its population. | culture | Civic | kept (built) |
| Hegemony | II | rare | act (momentum) | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. | production, authority | Economic | kept (built) |
| Master Bowyers | II | rare | supply | Ranged and siege units gain +1 range. | range | Military | kept (built) |
| War Reparations | II | uncommon | act | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. | gold, culture | Economic | kept (built) |
| Commission: Take the City | II | uncommon | act (commission) | Commission. Capture a city with at least five citizens. Then gain culture and science equal to twenty-three times its population, and a free Barracks in that city. The card leaves its chair. | science, culture, a Barracks | Wildcard | kept (built) |
| The Provincial Census | II | uncommon | act | Pacifying a town grants science equal to twenty times its population. | science | Civic | kept (built) |
| Spear-won Land | II | uncommon | multiply (scaler) | +3% production and science for every town you have captured this game, at most +30%. | production, science | Civic | kept (built) |
| The Siege Train | III | uncommon | supply | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. | combat, movement | Military | kept (built) |
| Commission: A Victor's Peace | III | rare | act (commission, institution) | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain one extra Wildcard chair for the rest of the game. | a Wildcard chair | Wildcard | kept (built) |
| The Victory Mint | III | uncommon | widen | Capturing a city grants gold equal to thirty times its population. | gold | Economic | kept (built) |
| The Devshirme | III | rare | widen | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. | units, ranks | Military | kept (built) |
| Pax Romana | III | rare | capstone (rule-breaker) | Towns you capture are pacified at once, and each costs 1 less authority to hold. | pacification, authority | Civic | kept (built) |
| The Tributary Kings | III | uncommon | widen | Your capital gains +1 production and +1 gold for each citizen in your puppet towns. | production, gold | Economic | new; existing |
| Imperium | IV | rare | finisher | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. | production toward the Opus | Economic | kept (built) |
| The Annexed Provinces | IV | rare | multiply | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. | science, culture | Civic | kept (built) |
| The Proconsuls | IV | uncommon | supply | Captured cities with a garrison cost no authority and gain +10 defence. | authority, defence | Civic | kept (built) |
| Commission: The Grand Campaign | IV | uncommon | act (commission) | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. | a great general, science, culture | Wildcard | kept (built) |
| Circumvallation | IV | uncommon | act | While a rival town is under siege by your units, it adds no production toward a Magnum Opus. | denies the Opus | Military | deferred; a version with no new input proposed for your rework; new shape |
| Commission: Hold the Capitals | IV | rare | act (commission) | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. | production, a great general | Wildcard | kept (built) |
| Spolia | IV | rare | finisher | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. | production toward the Opus | Economic | kept (built) |
| Vae Victis | IV | rare | doubler | Your capture rewards are paid twice. | capture rewards twice | Wildcard | kept (built) |
| The Great Bombards | IV | rare | rule-breaker | Your siege units break a town's walls in one blow. | walls in one blow | Military | kept (built) |

- **Scaler:** Spear-won Land (Tier II). **Capstone:** Pax Romana (Tier III). **Doubler:** Vae Victis (Tier IV).
- **Keep it or cash it out.** The game already asks this after every capture: keep the town as a puppet, annex it, or raze it. Now each answer has cards. A puppet pays your capital (The Tributary Kings), an annexed town pays itself and the empire (The Annexed Provinces, The Proconsuls), and a razed town pays at once (The Sack). No new input: the annex and raze commands exist.
- **The First Province** is Rome's first province, Sicily, whose grain tithe fed the city. Its gold and food pay even while the town is in unrest.
- **The Tributary Kings:** three puppets of eight citizens give the capital +24 production and +24 gold, and each puppet keeps its own yields.
- **The Upstarts** (feature B) is Macedon against Persia: +3 strength against an empire that knows more technologies. Dominion gives up development at home, so it often faces that empire; the card turns its cost into strength. +3 is band 1's regular combat line.
- **Circumvallation,** deferred on its UX: the proposal drops "you can see which rival cities are raising one", so it needs no new display. The siege alone stops the Opus.
- **The theme is late.** It has two Tier 0 cards and nine Tier IV cards. Your picture asks for captured-town bonuses in the late game, and captures are rare before age 2.
- **Shared cards that serve it:** Convert It or Tax It, The Crusader Orders, Carried-Off Scholars, The Engineer Corps, The New Code.

### 4.4 The captains

**The fantasy:** Rome's triumphs, Japan's shoguns, Napoleon's marshals. Great generals lead, govern and build fortresses, and the fame of each victory raises the next captain. **The quantity:** great generals gained, and their citadels. Renown comes slowly by itself (three general triumphs an age), so the supply cards carry it. **Areas:** great people and wonders.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Battle Honours | 0 | common | supply (commission) | Commission. Kill ten units while this card is seated. Then choose a great general from a draft. The card leaves its chair. | a great general | Wildcard | kept (built) |
| The Champion's Portion | 0 | common | supply | Killing a unit grants renown equal to its strength, favouring great generals. | renown | Civic | new; existing |
| The General Staff | I | common | supply | Cities with a Barracks give +3 production and +2 renown a turn, favouring great generals. | production, renown | Economic | kept (built) |
| The Acropolis | I | uncommon | widen | Citadels give +2 culture and +1 authority each. | culture, authority | Civic | reworked (was +1 authority for each building in your capital); existing |
| The Castle Demesne | I | uncommon | widen | Citadels give +3 food and +3 production. | food, production | Economic | new; existing |
| The Citadel Works | II | common | widen | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. | science, renown | Civic | kept (built) |
| The Castra | II | uncommon | widen | Your own hexes with a fortified military unit gain +1 science and +1 production. Citadels gain +3 production and +3 science. | science, production | Civic | kept (built) |
| The Tactica | II | uncommon | act | At the end of your turn, great generals give 1 experience to every unit beside them. Each time one of your units earns a rank, gain 15 science. | ranks, science | Military | kept (built) |
| Commission: The Border Fortress | II | uncommon | act (commission, institution) | Commission. Plant a citadel while this card is seated. Then, for the rest of the game, your citadels claim the two rings of hexes around them instead of one. The card leaves its chair. | land | Wildcard | new; new shape |
| The Taker of Cities | II | uncommon | widen | Your units beside one of your great generals gain +5 strength against towns. | combat | Military | new; existing |
| The Roll of Triumphs | II | uncommon | multiply (scaler) | +5% production and gold for each great general you have gained this game, at most +30%. | production, gold | Economic | new; existing |
| Up Through the Ranks | III | uncommon | supply | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. | renown | Civic | kept (built) |
| The Mural Crown | III | uncommon | act | +10 renown each turn, favouring great generals. Each time you gain a great person, gain 100 science and 100 culture for each great general you have gained this game. | renown, science, culture | Civic | kept (built) |
| The Bakufu | III | uncommon | act | A great general standing in a town gives it +25% science and +25% culture, and pacifies it at once. | science, culture, pacification | Civic | kept (built) |
| Rally to the Standard | III | rare | capstone (rule-breaker) | A unit you gain appears beside your nearest great general instead of in its town, if that general stands within ten hexes of the town. | where units appear | Military | reworked (was "may appear", a choice that waited on its UX; now automatic; rarity was uncommon); new shape |
| The Marshalate | IV | rare | multiply | Your great generals' aura gives +1 more strength for each great general you have gained this game, at most +5. | the general's aura | Military | reworked (was +1 strength for every military unit per general called, plus citadel culture and production); new shape |
| Commission: The Captured Marvel | IV | rare | act (commission) | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then gain science and culture each equal to twenty times its population, plus 200 of each for every world wonder in it. The card leaves its chair. | science, culture | Wildcard | kept (built) |

- **Your example of a strong theme** (the card-design skill, "Materials, themes and the deck map") is now all on the sheet: a unit standing on a citadel makes science (The Castra), great generals give strength to units attacking cities (The Taker of Cities, new), and citadels gain food and production (The Castle Demesne, new).
- **Scaler:** The Roll of Triumphs. Four generals gained give +20% production and gold: about 30 a turn in age 3.
- **Capstone: Rally to the Standard,** made automatic. A unit you gain appears beside your nearest great general when that general stands within ten hexes of its town. The general becomes the army's mustering point, and the player chooses where by moving the general, an order the game already has.
- **The Marshalate** becomes positional, as you ruled for The Strategikon: +1 to the general's aura for each general gained, so five generals make the aura +8 within two hexes. Its citadel culture and production go, because The Castle Demesne and The Castra pay citadels.
- **The Border Fortress:** a citadel claims 18 hexes instead of 6, so the captains reach the land.
- **The Taker of Cities:** with the aura's +3, a unit beside a general strikes walls at +8, the band 2 strong line.
- **The split:** generals and citadels are Dominion's great-person work. Magisterial's cards for works of any family still read citadels. Doubled great-person effects stay Magisterial's, so no card here repeats a general's act. Wonders: Dominion takes them by capture (The Captured Marvel, Spolia, Looted Art); it neither opens them early nor is paid for holding them.
- **The theme starts slowly.** A citadel needs a general first, so The Castle Demesne and The Acropolis pay little before the first general. Battle Honours, The Champion's Portion and The General Staff are its supply.
- **Shared cards that serve it:** Looted Art, The Holy Army.

## 5. Example councils

A Tier 0 card is marked (0). Chair mixes are written Military / Economic / Civic / Wildcard. An institution is held with no chair.

### Council 1: the drilled realm (the garrison state and the captains)

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Drill Grounds; Sword and Plough; Commission: Man the Walls, then Battle Honours.
- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** The Drill Grounds (0), The Training Cadre; Sword and Plough (0); Martial Law; Commission: The Ranks of Merit.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** The Fabricae, Stockpiles, The Castle Demesne; The Veterans' Roll; Commission: The Border Fortress. Institution: The Ranks of Merit. The Republic seats no Military card, so the drill pauses: the price of an economic government.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Drill Masters; The Fabricae, The Limitanei, The Castle Demesne; The Veterans' Roll, Standing Garrisons; Commission: The Chosen Men, The Regimental Schools. Institutions: The Ranks of Merit, The Border Fortress.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** The Drill Masters, The Varangian Guard; The Fabricae, The Limitanei, The Castle Demesne, Stockpiles; The Veterans' Roll, The Military Frontier; Standing Garrisons, The Regimental Schools, Double Time. Institutions: The Ranks of Merit, The Border Fortress, The Chosen Men.
- **How it feels:**
  - Turn 18: the third town gets its Spearman, and Man the Walls pays 30 production in each garrisoned town.
  - Turn 40: Battle Honours brings a general, who plants a citadel on the hill beside the capital. The Castle Demesne later makes it a farm and a mine.
  - Turn 65: the third chevron of the stretch meets The Ranks of Merit. From then on every rank pays 20 production to its town.
  - Turn 95: a second general plants a citadel on the border, and it claims two rings, eighteen hexes of frontier.
  - Turn 140: The Limitanei. Every town with two soldiers works two more hexes, and The Fabricae adds a quarter in each town with a Veteran garrison.
  - Turn 170: three Elites walk through the enemy's line (The Chosen Men) and strike twice (The Varangian Guard).

### Council 2: the steppe (the marches and the provinces), with Devotion

- **Opening, the Chiefdom:** Blooded Spears; The Horse Herds; Commission: Clear the Frontier.
- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** Horse Lords, Blooded Spears (0); The Horse Herds (0); The Captive Craftsmen; Commission: Harry the Border.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** Horse Lords, The Swift Riders, Riders of the Steppe; Spoils of War; The Captive Craftsmen. Institution: Harry the Border.
- **Tier III, Imperium (3 / 2 / 1 / 2):** Horse Lords, The Chevauchée, the shared The Crusader Orders; The Plunder Trains, The March Revenues; The Sagas; Danegeld, The Captive Craftsmen.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** Horse Lords, The Chevauchée, The Horde, The Harrying; The Plunder Trains, The March Revenues; The Sagas, The Naadam; Danegeld, The Captive Craftsmen, The Crusader Orders.
- **How it feels:**
  - Turn 22: two camps burn. Clear the Frontier pays two citizens and a Spearman.
  - Turn 60: at war, four War Chariots burn four farms in two turns, and Harry the Border is met. From then on a pillage costs a rider nothing, and The Captive Craftsmen reads +6.
  - Turn 100: each rider burns three hexes a turn. Spoils of War pays production and culture, and the rival sues for peace.
  - Turn 145: every farm burnt beside a town strikes its walls (The Chevauchée). At the peace, Danegeld pays 40 gold and 40 culture for each hex.
  - Turn 180: each pillage burns the ring of farms around it (The Horde).

### Council 3: the conqueror's provinces (the provinces and the captains), with Magisterial

- **Opening, the Chiefdom:** The Scaling Ladders; The Grain Tribute; Battle Honours.
- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** The Scaling Ladders (0); The Sack; The Satraps, The Champion's Portion (0); Commission: The First Province.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** Siege Works; Conquered Archives, The Provincial Census, Spear-won Land; Commission: Take the City. Institution: The First Province.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** Siege Works, The Taker of Cities; The Tributary Kings; Spear-won Land, Pax Romana, The Bakufu; Commission: A Victor's Peace, the shared Looted Art.
- **Tier IV, the Curia (2 / 2 / 4 / 3), and the chair A Victor's Peace won (12 chairs):** The Taker of Cities, The Great Bombards; The Tributary Kings, Imperium; Spear-won Land, Pax Romana, The Annexed Provinces, The Proconsuls; Vae Victis, Commission: The Grand Campaign, Spolia, the shared The New Code. Institutions: The First Province, A Victor's Peace.
- **How it feels:**
  - Turn 28: Spearmen with ladders storm a neighbour's town that has no walls.
  - Turn 50: the next capture meets The First Province. Every captured town now pays 3 gold and 2 food, even in revolt.
  - Turn 90: Take the City. The Provincial Census pays 160 science when the town settles.
  - Turn 135: a general stands beside the siege, and the units next to the general strike the walls at +8. The town falls and works at once (Pax Romana), and the general governs it (The Bakufu).
  - Turn 150: two towns taken, then peace. A Victor's Peace gives a Wildcard chair for the rest of the game.
  - Turn 185: the Opus town falls, and Spolia, doubled by Vae Victis, takes its whole Opus.

## 6. Features that would open cards in several decks

None of these adds a player input.

### Features A and B (accepted 2026-10-20)

- **Feature B, reading rivals:** The Upstarts reads "an empire that knows more technologies than you". It is the mirror of Scientific's reworked The Edge of the Sword ("an empire that knows fewer"), so the two decks meet on opposite sides of one measure. The Scientific pass's second Dominion idea (a town captured from a more advanced empire pays science toward a technology it knew) is not taken: Carried-Off Scholars and Copying the Enemy already pay science for conquest.
- **Feature A, the trades:** no Dominion card uses it. Guildsmen come from renown buildings in big towns, and no guild family is Dominion's. A card such as "garrisoned towns fill their guild bar faster" would be filler.

### Feature C (proposed): commissions as a keyword that cards read

- **What it is:** two readings. A moment when a commission of yours is met, and a count of the commissions you have met this game.
- **What the game already does:** `PlayerStatecraft.commissionsFulfilled` records every met commission, `commissions.ts` pays the reward in one place, and rewards may last all game (`CommissionReward.lasting`). No card reads any of it.
- **Why it matters:** your ruling of 2026-10-13 says the fix for the deck keywords (levies, tended works, commissions, charters) is *"more cards that have synergy"*, until each is a keyword many cards share. Every deck has commissions, and today nothing reads one.
- **What it costs:** one `WindfallOccasion` member, fired where the reward is paid; one `CountKind` over the record; and their words in the describers.
- **Cards it opens:**
  - Dominion: The Ovation (a ten-turn burst on a met commission), The Res Gestae (a percentage for each commission met this game).
  - Expansionist: The Harvest Feast (proposed 2026-10-13): a met commission feeds every town.
  - Commerce: a met commission grants gold equal to five turns of income.
  - Devotion: a met commission grants faith equal to ten turns of faith.
  - Magisterial: +1 renown a turn for each commission met this game, favouring no family.
- **Fallback:** The Ovation and The Res Gestae are cut. Nothing else depends on it.

## 7. New shapes

Fourteen, most of them small floors and rule values on shapes that exist.

1. **Commissions (the engine):**
   - feature C: a moment when a commission is met, and a count of commissions met (The Ovation, The Res Gestae);
   - a goal figure for towns with a garrison, and production paid into each such town (Man the Walls);
   - a rank floor on the `rankEarned` tally, so only Elite counts (The Chosen Men);
   - a floor on the `greatPersonSpent` tally: a general spent on a work (The Border Fortress).
2. **The garrison state:**
   - a town's worked hexes raised by the soldiers standing in it, capped at two, and eating no food (The Limitanei). The citizens' assigner (`assignCitizens`) gains slots. It is the largest piece of engine work in this pass;
   - the zone-of-control rule narrowed by rank (The Chosen Men's institution); Riders of the Steppe narrows it by class today;
   - extra movement for a unit that starts its turn in a town connected to the capital (The Relay Stations' proposal).
3. **The marches:**
   - pillage at no movement for a class (Harry the Border's institution); Riders of the Steppe lowers it by one today;
   - a pillage at the end of a ship's turn, beside an enemy improvement on the shore (The Longships' proposal).
4. **The provinces:**
   - feature B: a combat condition against an empire that knows more technologies than you (The Upstarts);
   - Circumvallation's siege half, as it was already triaged.
5. **The captains:**
   - a flat addition to the general's aura, scaled by generals gained (The Marshalate); the aura amplifier exists (The Strategoi doubles it);
   - the citadel's claim radius as a rule value (The Border Fortress' institution);
   - a gained unit placed beside a great general (Rally to the Standard).

**The other new cards use shapes that exist:** The Champion's Portion (a kill rider paying renown by the unit's strength, as Looted Art scales renown); The Castle Demesne and The Acropolis (`pays` on the citadel hex, and authority counted over citadels); The Taker of Cities (`combatLine` against towns with `besideGreatGeneral`, joined by `all`); The Roll of Triumphs (generals gained, The Mural Crown's count); The Ranks of Merit and The First Province (`lasting` rewards with a rider and a `captured` scope); The Tributary Kings (`puppetPopulation`); The Naadam and The March Revenues (`tilesInBorders` with a tile test); The Spartan Discipline (two `productionBonus` lines); The Camp Chaplains (a second rider, on `death`).

**For less engine work, cut** The Longships' proposal, Commission: Man the Walls and Commission: The Chosen Men first. The Limitanei is the most work, but it is the garrison state's capstone.

## 8. The sheet's cards

### The Dominion cards (124)

| Card | Tier | Fate | Why |
|---|---|---|---|
| Blood Brothers | 0 | kept | the marches, act; the barbarian war: beaten raiders join you |
| Commission: Clear the Frontier | 0 | kept | the marches, act (commission); the marches' first goal, paid at once |
| Blooded Spears | 0 | kept | the marches, supply; the barbarian war |
| Muster Rites | 0 | cut | you passed it in play (*"muster rites is pretty bad, opted to pass"*); Rites of Passage, shared with Devotion, does the same job |
| The Horse Herds | 0 | kept | the marches, widen; pastures and camps pay |
| Battle Honours | 0 | kept | the captains, supply (commission); the first general, from a goal |
| Sword and Plough | 0 | kept | the garrison state, widen; the soldier economy's basic card |
| The Camp Chaplains | 0 | reworked | engine glue, early faith; takes The Funeral Games' losses, so one card pays faith on kills and losses |
| The Standing Army | 0 | kept | the garrison state, supply; garrisons cost no upkeep, so soldiers stay in towns |
| The King's Levy | 0 | kept | engine glue, soldiers; free soldiers on a clock |
| The Grain Tribute | 0 | kept | engine glue, a basic economy card; your plain early economy card |
| The Drill Grounds | 0 | kept | the garrison state, supply; garrisons drill to rank |
| The Scaling Ladders | 0 | kept | the provinces, supply; the early rush on a town |
| The Funeral Games | 0 | cut | merged into The Camp Chaplains |
| The Bards' Praise | 0 | kept | engine glue, kills; kills pay culture, the draft currency |
| The Cattle Raid | 0 | kept | the marches, act (momentum); a cleared camp feeds the towns for ten turns |
| The Garrison Captains | 0 | kept | the garrison state, widen; soldiers keep order |
| The Spear Makers | 0 | kept | engine glue, soldiers; cheap early soldiers |
| The Armed Colony | 0 | kept | the marches, supply (land); a town founded beside soldiers claims more land; bridge to the garrison state |
| The Outriders | 0 | kept | the marches, widen; discoveries and camps pay every town |
| The Captured Arms | 0 | kept | engine glue, kills (this game); a scaler on kills |
| The Gathering Host | 0 | kept | engine glue, units gained (grower); the host's grower |
| The Armourers' Secret | 0 | cut | another free unit, paid by research, which is Scientific's lane |
| The Defiant Kingdom | 0 | kept | the provinces, supply; the smaller empire arms faster (Mithridates) |
| The Hunting Grounds | 0 | kept | the marches, supply; more camps to clear, with more raiders as the cost |
| The Campaign Annals | 0 | kept | the garrison state, act (grower); each rank earned grows it |
| The Quartermasters | I | kept | the marches, widen; strategic resources pay |
| The Soldier-Farmers | I | kept | the garrison state, widen; garrisons farm pastures and camps at peace; bridge to the marches |
| The Marshals | I | cut | the same job as The Serried Ranks (strength from standing together), and +6 at Tier I is beyond the strong line |
| War Foundries | I | kept | the garrison state, widen; Barracks pay gold |
| Horse Lords | I | kept | the marches, supply; the raiders' horses |
| Martial Law | I | kept | the garrison state, widen; soldiers keep the town content and fed |
| The General Staff | I | kept | the captains, supply; Barracks raise generals; bridge to the garrison state |
| The Training Cadre | I | kept | the garrison state, supply; soldiers start with experience |
| The Marching Camps | I | cut | not very impactful, and the garrison state is crowded at Tier I |
| The Soldiers' Purse | I | kept | the garrison state, multiply; ranks pay their own upkeep |
| Honours of the Legion | I | kept | the garrison state, act; the promotion moment |
| The Pacified Marches | I | kept | the marches, multiply (scaler); camps cleared this game |
| The Art of War | I | kept | engine glue, units gained; each soldier gained teaches |
| Songs of the Fallen | I | kept | engine glue, kills and losses; the host's rare |
| Walled Towns | I | kept | the garrison state, widen; walls feed the town |
| The Swift Riders | I | kept | the marches, act; strike and ride on |
| The Open Muster | I | cut | it reads a passed draft, which is Magisterial's ground, and is another free unit |
| The Captive Craftsmen | I | kept | the marches, multiply (grower); each pillage grows it |
| The Satraps | I | kept | the provinces, supply; garrisons pacify twice as fast |
| The Sack | I | kept | the provinces, act; cash a town out |
| The Cleruchy | I | cut | founding towns is Expansionist's way to play; The Armed Colony keeps Dominion's angle |
| The Acropolis | I | reworked | the captains, widen; it pushed no theme; now citadels pay culture and authority |
| Siege Works | II | kept | the provinces, supply; the siege |
| Conquered Archives | II | kept | the provinces, widen; captured towns teach |
| Stockpiles | II | kept | the garrison state, widen; defensive buildings feed the town |
| Triumphs | II | kept | the provinces, act; a capture pays culture |
| The Citadel Works | II | kept | the captains, widen; citadels teach and raise generals |
| Riders of the Steppe | II | kept | the marches, supply; the raiders ride through |
| Spoils of War | II | kept | the marches, widen; pillage pays |
| Hegemony | II | kept | the provinces, act (momentum); a capture drives every town for ten turns |
| Master Bowyers | II | kept | the provinces, supply; the bows and engines outrange the walls |
| Armoury Guilds | II | kept | engine glue, losses; the fallen arm the next wave |
| The Longships (was Marine Drill) | II | deferred; a version with no new input proposed | the marches, act; your rework; a version with no new input is proposed |
| The Relay Stations | II | deferred; a version with no new input proposed | the garrison state, act; your rework; a version with no new input is proposed |
| War Reparations | II | kept | the provinces, act; the peace pays |
| Commission: Take the City | II | kept | the provinces, act (commission); the first big capture |
| The Fabricae | II | kept | the garrison state, multiply; ranked garrisons drive production |
| The Valetudinaria | II | cut | filler; the Scientific Bimaristan heals units in your land |
| Living off the Land | II | kept | the marches, supply; the army in the field costs nothing |
| The Longbowmen | II | kept | engine glue, a strength line; your culture clause gives it a second pay |
| The Serried Ranks | II | kept | the garrison state, defence; the realm's defence |
| The Veterans' Roll | II | kept | the garrison state, multiply (scaler); ranks earned this game |
| The Conscription Rolls | II | kept | the garrison state, supply; big towns raise their own garrisons |
| The Hall of the Slain | II | kept | engine glue, losses (this game); the host's scaler |
| The Funeral Oration | II | kept | engine glue, losses; the host's answer to weariness |
| The Sagas | II | kept | the marches, multiply (scaler); hexes pillaged this game |
| The Provincial Census | II | kept | the provinces, act; the pacification moment |
| Spear-won Land | II | kept | the provinces, multiply (scaler); towns captured this game |
| The Castra | II | kept | the captains, widen; citadels and fortified hexes pay; bridge to the garrison state |
| The Tactica | II | kept | the captains, act; generals drill the units beside them; bridge to the garrison state |
| Double Time | II | kept | engine glue, capstone (doubles); doubles every drill, muster and harvest |
| The State Forges | II | cut | a free unit for every technology is too many pieces, and research is Scientific's lane |
| War Feeds Itself | II | kept | the marches, widen; the army lives off a rival's land |
| Standing Garrisons | III | kept | the garrison state, multiply; every soldier in a town drives it |
| The Siege Train | III | kept | the provinces, supply; the siege |
| Reserve Officers | III | kept | the garrison state, supply; Barracks towns, at war or at peace |
| Total War | III | kept | engine glue, capstone (a drawback); every theme's war card |
| Commission: A Victor's Peace | III | kept | the provinces, act (commission, institution); a won war leaves a lasting chair |
| The Drill Masters | III | kept | the garrison state, supply; every soldier starts a Veteran |
| The Plunder Trains | III | kept | the marches, widen; pillage feeds the capital |
| The Yam | III | kept | the marches, supply; raiders stay out |
| The Tagmata | III | kept | the garrison state, multiply; ranked soldiers fight harder |
| Up Through the Ranks | III | kept | the captains, supply; Elites raise generals; bridge from the garrison state |
| The Arrière-ban | III | kept | engine glue, momentum; a declaration drives every town |
| The Keshik | III | cut | two narrow facts (mounted and ranked); Horse Lords and The Swift Riders carry the riders |
| The Mural Crown | III | kept | the captains, act; each great person pays for the generals before it |
| The Victory Mint | III | kept | the provinces, widen; a capture pays gold |
| The Bakufu | III | kept | the captains, act; a general governs a town; bridge to the provinces |
| Interior Lines | III | kept | the garrison state, supply; soldiers move between towns on the roads |
| Rally to the Standard | III | reworked | the captains, capstone (rule-breaker); your rework was pending on its UX; now automatic, and rare |
| Valhalla | III | kept | engine glue, losses; your revision; the host's late culture |
| The Chevauchée | III | kept | the marches, capstone (rule-breaker); the raid hits the walls |
| Danegeld | III | kept | the marches, act; the peace after a raiding war pays |
| The Devshirme | III | kept | the provinces, widen; the conquered fill your ranks |
| Pax Romana | III | kept | the provinces, capstone (rule-breaker); captured towns work at once |
| The Regimental Schools | III | kept | the garrison state, supply; garrisons drill and teach |
| The Board of Ordnance | III | kept | the garrison state, widen; Barracks towns at war |
| Imperium | IV | kept | the provinces, finisher; captured towns raise the Opus |
| The Praetorian Guard | IV | kept | the garrison state, finisher; the Opus town's guard |
| The Grand Army | IV | kept | engine glue, the large army; your picture: civic options for an army already large |
| The Annexed Provinces | IV | kept | the provinces, multiply; captured towns held |
| The Marshalate | IV | reworked | the captains, multiply; an army-wide strength scaler becomes a positional one, as you ruled for The Strategikon |
| The Military Frontier | IV | kept | the garrison state, finisher; soldiers in towns teach |
| The Grand Coalition | IV | kept | engine glue, the Opus race; stop the Opus builder |
| The Proconsuls | IV | kept | the provinces, supply; garrisoned conquests cost nothing to hold |
| Commission: The Grand Campaign | IV | kept | the provinces, act (commission); three captures |
| Circumvallation | IV | deferred; a version with no new input proposed | the provinces, act; your rework; a version with no new input is proposed |
| Commission: Hold the Capitals | IV | kept | the provinces, act (commission); hold two capitals |
| Spolia | IV | kept | the provinces, finisher; take a rival's Opus |
| The Legions' Labour | IV | kept | engine glue, the way to win; the host becomes the Opus |
| The Nation in Arms | IV | kept | the garrison state, supply; Armoury towns raise garrisons |
| Commission: The Captured Marvel | IV | kept | the captains, act (commission); take a wonder or a capital |
| The Horde | IV | kept | the marches, finisher; the long-game raid |
| Vae Victis | IV | kept | the provinces, doubler; the provinces' doubler |
| The Varangian Guard | IV | kept | the garrison state, capstone (rule-breaker); Elites strike twice |
| The Glorious Dead | IV | kept | engine glue, losses; the host's late answer to weariness |
| The Harrying | IV | kept | the marches, act; the raid stops a town |
| The Great Bombards | IV | kept | the provinces, rule-breaker; the guns of the last age |

**Tally:** 107 kept, 3 kept as deferred with a proposal, 4 reworked, 10 cut. With 18 new cards, the deck holds 132 seatable cards.

### The shared cards (27, and one new)

All kept. Each pair keeps an early shared card (ruling (qqqqqq) 14).
- **Garrison state:** The Frontier Militia (0, Expansionist), The Muster of the Fields (I, Expansionist), The Farming Garrisons (I, Expansionist), The Escorted Roads (I, Commerce), The Road Garrisons (II, Expansionist), Examinations of State (II, Magisterial), and **The Soldier-Scholars** (II, Scientific; new on this sheet): "Your military units in your towns gain +5 strength, and each supplies +2 science."
- **Marches:** The Barbarian Frontier (I, Expansionist), Marcher Lords (II, Expansionist), Letters of Marque (III, Commerce).
- **Provinces:** Convert It or Tax It (II, Devotion), The Crusader Orders (II, Devotion), Carried-Off Scholars (II, Scientific), The Engineer Corps (III, Scientific), The New Code (III, Magisterial).
- **Captains:** Looted Art (II, Magisterial), The Holy Army (III, Devotion).
- **Engine glue:** Rites of Passage (0, Devotion), Field Academies (I, Scientific), Copying the Enemy (I, Scientific), The Oriflamme (I, Devotion), The Sacred Host (I, Devotion), The Sword of State (I, Magisterial), War Bonds, Professional Soldiers and The Chartered Company (III, Commerce).
- **No Dominion theme:** Military Colonies (I, Expansionist). It speeds settlers and workers, which is Expansionist's way to play. Its fate is the Expansionist pass's.
- **Deferred, for Commerce to rework:** Mercenary Contracts (III).
- **Not on the sheet:** The Imperial Examinations and Triumphal Arches are rows in `common.json` naming Dominion and Magisterial. They wait for the Magisterial pass.

### Not taken from earlier proposals

- The Garrison Writ (2026-10-13): the shared The Frontier Militia does its job.
- The Old Campaigners: an army-wide strength scaler, the kind you swapped out of The Strategikon.
- Commission: Garrison the Realm: Commission: Man the Walls takes its job at Tier 0.

### The Doctrines

Not changed. The Build column names the old builds, which map as: drilled legions to the garrison state, steppe raiders to the marches, conqueror to the provinces, endless host to the engine glue. Two notes: The Landsturm reads a passed draft, the reason The Open Muster is cut; and the captains' only Doctrine is The Strategoi.

### The type sort

- **Tier 0 (25).** Military (9): Blood Brothers, Blooded Spears, The Standing Army, The King's Levy, The Drill Grounds, The Scaling Ladders, The Spear Makers, The Defiant Kingdom, The Hunting Grounds. Economic (6): The Horse Herds, Sword and Plough, The Grain Tribute, The Cattle Raid, The Armed Colony, The Outriders. Civic (7): The Camp Chaplains, The Bards' Praise, The Garrison Captains, The Captured Arms, The Gathering Host, The Campaign Annals, The Champion's Portion. Wildcard (3): Commission: Clear the Frontier, Battle Honours, Commission: Man the Walls.
- **Tier I (25).** Military (6): Horse Lords, The Training Cadre, The Soldiers' Purse, The Swift Riders, The Spartan Discipline, The Upstarts. Economic (8): The Quartermasters, The Soldier-Farmers, War Foundries, The General Staff, Walled Towns, The Sack, The Ovation, The Castle Demesne. Civic (8): Martial Law, Honours of the Legion, The Pacified Marches, The Art of War, Songs of the Fallen, The Captive Craftsmen, The Satraps, The Acropolis. Wildcard (3): Commission: The Ranks of Merit, Commission: Harry the Border, Commission: The First Province.
- **Tier II (34).** Military (11): Siege Works, Riders of the Steppe, Master Bowyers, The Longships (was Marine Drill), The Relay Stations, Living off the Land, The Longbowmen, The Serried Ranks, The Conscription Rolls, The Tactica, The Taker of Cities. Economic (8): Stockpiles, Spoils of War, Hegemony, Armoury Guilds, War Reparations, The Fabricae, War Feeds Itself, The Roll of Triumphs. Civic (12): Conquered Archives, Triumphs, The Citadel Works, The Veterans' Roll, The Hall of the Slain, The Funeral Oration, The Sagas, The Provincial Census, Spear-won Land, The Castra, The Res Gestae, The Naadam. Wildcard (3): Commission: Take the City, Double Time, Commission: The Border Fortress.
- **Tier III (27).** Military (10): The Siege Train, Reserve Officers, Total War, The Drill Masters, The Yam, The Tagmata, Interior Lines, Rally to the Standard, The Chevauchée, The Devshirme. Economic (6): The Plunder Trains, The Arrière-ban, The Victory Mint, The Limitanei, The March Revenues, The Tributary Kings. Civic (9): Standing Garrisons, Up Through the Ranks, The Mural Crown, The Bakufu, Valhalla, Danegeld, Pax Romana, The Regimental Schools, The Board of Ordnance. Wildcard (2): Commission: A Victor's Peace, Commission: The Chosen Men.
- **Tier IV (21).** Military (9): The Praetorian Guard, The Marshalate, The Grand Coalition, Circumvallation, The Nation in Arms, The Horde, The Varangian Guard, The Harrying, The Great Bombards. Economic (3): Imperium, Spolia, The Legions' Labour. Civic (5): The Grand Army, The Annexed Provinces, The Military Frontier, The Proconsuls, The Glorious Dead. Wildcard (4): Commission: The Grand Campaign, Commission: Hold the Capitals, Commission: The Captured Marvel, Vae Victis.

| Tier | Military | Economic | Civic | Wildcard | Seatable | Common / uncommon / rare |
|---|---|---|---|---|---|---|
| 0 | 9 | 6 | 7 | 3 | 25 | 18 / 4 / 3 |
| I | 6 | 8 | 8 | 3 | 25 | 7 / 15 / 3 |
| II | 11 | 8 | 12 | 3 | 34 | 10 / 19 / 5 |
| III | 10 | 6 | 9 | 2 | 27 | 5 / 13 / 9 |
| IV | 9 | 3 | 5 | 4 | 21 | 0 / 3 / 18 |
| **All** | **45** | **31** | **41** | **15** | **132** | **40 / 54 / 38** |

- **By status (seatable):** 107 kept, 3 deferred with a proposal, 4 reworked, 18 new.
- **Every government has something to seat** at Tiers 0 to III: every type has two or more cards in each tier. At Tier IV the Estates' four Economic chairs see three Dominion Economic cards (Imperium, Spolia, The Legions' Labour), so they lean on the partner and on carried cards (The Limitanei, The Tributary Kings, The Fabricae). That was so before this pass.

## 9. The checks

- **Themes beat a pile.** Each theme has flats, a multiplier on them, and a capstone:
  - garrison state: Sword and Plough, Martial Law, Stockpiles; The Fabricae, Standing Garrisons; The Limitanei;
  - marches: The Horse Herds, The Quartermasters, The Naadam; The March Revenues, The Sagas; The Chevauchée;
  - provinces: Conquered Archives, The First Province, The Tributary Kings; Spear-won Land, The Annexed Provinces; Pax Romana and Vae Victis;
  - captains: The Castle Demesne, The Acropolis, The Citadel Works; The Roll of Triumphs, The Marshalate; Rally to the Standard.
- **Several routes.** Any two cards start a theme: The Drill Grounds and Sword and Plough; The Horse Herds and The Cattle Raid; The Scaling Ladders and The Sack; Battle Honours and The General Staff.
- **Every card has a home:** four themes and 24 glue cards (18%), with ten bridge cards.
- **The essentials along the way.** By Tier II each theme reaches science, culture and production:
  - garrison state: Sword and Plough (production, culture), Honours of the Legion and The Campaign Annals (science);
  - marches: The Horse Herds and The Outriders (production), The Pacified Marches (culture), The Captive Craftsmen (science);
  - provinces: The Sack (production, culture), Conquered Archives and The Provincial Census (science);
  - captains: The General Staff and The Castle Demesne (production), The Acropolis (culture), The Citadel Works (science).
- **Dominion's own output stays near a third:** 45 of 132 seatable cards are Military (34%), against 49 of 124 (40%) before. Science and culture from deeds is still common (40 of 132, 30%), almost all on kept cards; of the 18 new cards, only two pay culture and none pays science.
- **Areas:** five of five.
- **Commissions:** 13 (10%), against 7 (6%). Every theme has two or more.
- **The cost shows** in the bursts, the commissions, The Spartan Discipline, Total War, The Hunting Grounds and The Defiant Kingdom.
- **No new input.** Every card is automatic or uses fighting, training, building, founding beside soldiers, capturing, pillaging, razing, keeping a puppet or annexing it, making peace, or moving a general. The four Dominion cards deferred on their UX get versions with no new input. Mercenary Contracts is Commerce's to rework.
- **The splits are followed:** ranks (Dominion's), generals and citadels (Dominion's), wonders (taken, never opened early or held), elite units (earned by fighting), and governments (Magisterial's, with A Victor's Peace as the one exception, question 10).
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured.
  - The deck is large: 132 seatable cards against Scientific's 77, and Tier II holds 34 (question 8).
  - The garrison state is the largest theme (33 cards) and the captains the smallest (17). The captains start slowly, because a citadel needs a general first.
  - Three Tier I commissions compete for one Wildcard chair.
  - Tier IV is 18 rares of 21, with no common, as before.
  - Science and culture from deeds is still the most common pay among the kept cards.
  - The Limitanei is the largest piece of new engine work.
  - Doctrines are not in this pass.

## 10. Open questions for the user

1. **The four themes and the engine as written:** the garrison state, the marches, the provinces and the captains, with soldiers and commissions as the engine, and institutions as the middle commissions' rewards. *Recommended: yes.*
2. **Feature C, commissions as a keyword that cards read** (a moment when one is met, and a count). *Recommended: yes.* It is small, it serves every deck, and it follows your ruling of 2026-10-13 that the deck keywords need more readers.
3. **Commissions stay Wildcard,** so a seat runs one at a time until Tier III. *Recommended: keep.* An adept player cycles them, and the institutions take no chair. The alternative is that a commission takes the type of what it pays, which changes the type rules for every deck.
4. **The ten cuts** in section 8, with their rows retired. *Recommended: yes.*
5. **The reworks of live cards:** The Camp Chaplains takes The Funeral Games' losses; The Acropolis pays on citadels; The Marshalate becomes a positional aura line, as you ruled for The Strategikon. *Recommended: yes.*
6. **The four cards deferred on their UX:** Rally to the Standard becomes automatic and the captains' capstone, at rare. The Longships, The Relay Stations and Circumvallation get versions with no new input (section 4). *Recommended: take Rally to the Standard as written, and use the other three as drafts for your own rework.*
7. **The Limitanei:** soldiers in a town work extra hexes, which breaks the rule that only citizens work. *Recommended: yes.* It is the soldier economy at full size.
8. **The deck's size:** 132 seatable cards, with 34 at Tier II. *Recommended: keep it for now and cut by hand on the list, as you did for Scientific.* If you want it smaller, these are the next ten cuts, weakest first: The Longbowmen, Master Bowyers, The Serried Ranks, Armoury Guilds, The Funeral Oration, Living off the Land, Walled Towns (Stockpiles does its job at Tier II), The Spear Makers, The Conscription Rolls, Siege Works.
9. **The Soldier-Scholars' type:** *Recommended: Civic* on both sheets. At peace the science is the half that pays; the +5 strength helps only when a town is attacked.
10. **A Victor's Peace touches the government system** (it adds a chair), which Magisterial owns. *Recommended: keep it.* It is Dominion's clearest institution, and one card is not a system.

After your answers: every card onto the sheet as `add` and `modify` rows, then the triage for the build.

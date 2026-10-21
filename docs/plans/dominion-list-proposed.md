# The Dominion deck: the full list, with the themes pass folded in

This is a review list, written on 2026-10-21 and revised the same day to agree with your comments on the review page (the themes doc, section 11). The build plan is `docs/plans/dominion-themes-triage.md`. It puts every card on the deck sheet (`docs/decks/dominion.md`) in one list, with every new card and change from the themes pass (`docs/plans/dominion-themes.md`) folded in. It follows the format of the Scientific list (`docs/plans/scientific-list-proposed.md`). It is not the spec of record: the sheet is unchanged, and the sheet's text wins wherever the two differ. The sheet was read as it stands in the working tree, with your removal of The Servian Reforms.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `reworked` (The Longships' row still plays Marine Drill) or `deferred` (not dealt, because it waits on a UX decision).
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the themes pass, not on the sheet.
  - `proposed: …` after the status names a change the themes pass makes to a sheet card: a rework, a merge, a change of rarity, or a version with no new input. The row already shows the change (the new text and rarity), and the status says what it was.
  - `revised 2026-10-21 (section 11)` after the status: your comment on the review page changed the row. The row already shows the new text. Section 11 of the themes doc has your words and the readings marked "to confirm".
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the sheet, or from the themes pass for a new card.
- **Build:** the card's theme and role in the themes pass.
  - The four themes are the garrison state, the marches, the provinces and the captains. Engine glue raises or spends the engine (soldiers and commissions) and serves all four.
  - The roles are supply (more of the thing), widen (it pays something new), multiply (its output grows) and act (a choice or a moment). A capstone breaks a rule or doubles a category.
  - "Institution" marks a commission whose reward lasts for the rest of the game and takes no chair (`CommissionReward.lasting`).
  - "bridge" marks a card that serves a second theme.
  - "feature B" or "feature C" marks a card that uses a feature in section 6 of the themes pass: reading rivals (accepted 2026-10-20), or commissions as a keyword that cards read (proposed).
- **Rulings this list follows:**
  - "Direction, 2026-10-20" in `docs/decks/deck-design.md`: Dominion is paid for deeds, is strongest early, and gives up development at home unless it keeps acting; and your picture of it, with more commissions that use the soldiers, the soldier economy, and captured-town bonuses late.
  - Dominion is the tempo deck (2026-10-13), feeding units to die is a way to play (2026-10-13), and "a unit gained" covers every source (2026-10-13).
  - Your rulings on the Scientific pass (2026-10-21): The Companions becomes the shared Dominion and Scientific card The Soldier-Scholars, and an army-wide strength scaler gives way to a positional one.
  - Your comments on this list's review page (2026-10-21, the themes doc, section 11). The build uses their readings until you change them, and the recommendations of the themes doc's section 10 stand.
- **Doctrines:** not in this list. The sheet's Doctrines are yours to edit.
- **Cut cards:** the ten cards the themes pass cuts are in the last section, `## Cut by this pass`, with their sheet text and one line on why, so you can restore any of them.

**By status:**

| Tier | Implemented | Modify | Add | New | All | Proposed change | Revised (section 11) |
|---|---|---|---|---|---|---|---|
| Tier 0 | 23 | 0 | 0 | 2 | 25 | 1 | 4 |
| Tier I | 18 | 0 | 0 | 7 | 25 | 1 | 4 |
| Tier II | 27 | 2 | 0 | 5 | 34 | 2 | 2 |
| Tier III | 22 | 0 | 1 | 4 | 27 | 1 | 0 |
| Tier IV | 20 | 1 | 0 | 0 | 21 | 2 | 1 |
| **All** | **110** | **3** | **1** | **18** | **132** | **7** | **11** |
| Shared | 26 | 1 | 0 | 1 | 28 | 0 | 0 |

"Revised (section 11)" counts the eleven rows your comments changed: seven sheet cards and four new cards. The other columns still count each row's status before your comments.

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard | All | Common / uncommon / rare |
|---|---|---|---|---|---|---|
| Tier 0 | 9 | 6 | 7 | 3 | 25 | 18 / 4 / 3 |
| Tier I | 6 | 8 | 8 | 3 | 25 | 7 / 15 / 3 |
| Tier II | 11 | 8 | 12 | 3 | 34 | 10 / 19 / 5 |
| Tier III | 10 | 6 | 9 | 2 | 27 | 5 / 13 / 9 |
| Tier IV | 9 | 3 | 5 | 4 | 21 | 0 / 3 / 18 |
| **All** | **45** | **31** | **41** | **15** | **132** | **40 / 54 / 38** |
| Shared | 12 | 8 | 7 | 1 | 28 | 5 / 19 / 4 |

Seatable cards: 132, that is 25 / 25 / 34 / 27 / 21 across Tiers 0 to IV. By type: 45 Military, 31 Economic, 41 Civic and 15 Wildcard. Commissions: 13, of which eight leave an institution (revised 2026-10-21, section 11). The Soldier-Scholars is counted as Military in the shared row (reading, to confirm; revised 2026-10-21, section 11).

**Data notes:**
- The ten cut rows are live: retire them (`retired: true`). The Funeral Games' faith on a loss moves into The Camp Chaplains' row.
- The Longships' data row (`marineDrill`) still plays Marine Drill. The Relay Stations and Circumvallation are deferred rows. Rally to the Standard has no data row yet.
- The Soldier-Scholars has no row yet. It goes into `data/decks/common.json`, naming Dominion and Scientific.
- The Imperial Examinations and Triumphal Arches are rows in `common.json` that name Dominion and Magisterial, with no type. They wait for the Magisterial pass, so this list leaves them out, as the sheet does.
- The eight institutions use `CommissionReward.lasting`, which Expansionist batch E5 built for The Heartland (revised 2026-10-21, section 11).
- Clear the Frontier and Battle Honours trade rewards and keep their data ids. Take the City drops its Barracks and its one-time payout, and The Captured Marvel its one-time payout (revised 2026-10-21, section 11).

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Blood Brothers** | rare | implemented | A barbarian unit you kill joins your side. | Military | the marches: act |
| **Commission: Clear the Frontier** | common | implemented; revised 2026-10-21 (section 11) | Commission. Clear two barbarian camps while this card is seated. Then choose a great general from a draft. The card leaves its chair. | Wildcard | the marches: act (commission); bridge to the captains |
| **Blooded Spears** | common | implemented | Military units gain +2 strength, doubled against barbarians. | Military | the marches: supply |
| **The Horse Herds** | common | implemented | Worked pastures and camps give +1 food and +1 production. | Economic | the marches: widen |
| **Battle Honours** | common | implemented; revised 2026-10-21 (section 11) | Commission. Kill six units while this card is seated. Then gain 2 population in your capital, and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. | Wildcard | engine glue: kills (commission) |
| **Sword and Plough** | common | implemented | Each city with a garrison gains +1 culture and +2 production. | Economic | the garrison state: widen |
| **The Camp Chaplains** | common | implemented; proposed: reworked (absorbs The Funeral Games) | Killing or losing a unit grants faith equal to its strength. | Civic | engine glue: early faith |
| **The Standing Army** | uncommon | implemented | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. | Military | the garrison state: supply |
| **The King's Levy** | rare | implemented | Every fifteen turns your capital raises a melee unit for free. It costs no upkeep. | Military | engine glue: soldiers |
| **The Grain Tribute** | common | implemented | +1 food and +1 production in every city. | Economic | engine glue: a basic economy card |
| **The Drill Grounds** | common | implemented | Units standing in your towns gain 1 experience every 4 turns. | Military | the garrison state: supply |
| **The Scaling Ladders** | common | implemented | Melee units gain +4 strength against towns. | Military | the provinces: supply |
| **The Bards' Praise** | common | implemented; revised 2026-10-21 (section 11) | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 30 culture. | Civic | engine glue: kills |
| **The Cattle Raid** | common | implemented | Clearing a barbarian camp gives every city +3 food for ten turns. Clearing another restarts the ten turns. | Economic | the marches: act (momentum) |
| **The Garrison Captains** | common | implemented | +1 authority for each garrisoned unit. | Civic | the garrison state: widen |
| **The Spear Makers** | common | implemented | +30% production toward first- and second-age military units. | Military | engine glue: soldiers |
| **The Armed Colony** | common | implemented | A town founded beside one of your military units starts with three extra hexes, and that unit becomes a Veteran. | Economic | the marches: supply (land); bridge to the garrison state |
| **The Outriders** | common | implemented | Claiming a discovery or clearing a barbarian camp grants 8 production to every town. | Economic | the marches: widen |
| **The Captured Arms** | common | implemented | +1 science for every unit you have killed this game, no cap. | Civic | engine glue: kills (this game) |
| **The Gathering Host** | uncommon | implemented; revised 2026-10-21 (section 11) | While seated, this card gains +1 science and +1 culture each time you gain a military unit. It starts at +2 science and +2 culture. | Civic | engine glue: units gained (grower) |
| **The Defiant Kingdom** | uncommon | implemented | While another empire holds more towns than you, you train military units 25% faster. | Military | the provinces: supply |
| **The Hunting Grounds** | uncommon | implemented | Barbarian camps within ten hexes of your cities spawn 50% faster. Your units gain +4 strength in your own territory. | Military | the marches: supply |
| **The Campaign Annals** | rare | implemented | While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science. | Civic | the garrison state: act (grower) |
| **The Champion's Portion** | common | new | Killing a unit grants renown equal to its strength, favouring great generals. | Civic | the captains: supply |
| **Commission: Man the Walls** | common | new | Commission. Have military units standing in three of your towns at the same time. Then each town with a garrison gains 30 production. The card leaves its chair. | Wildcard | the garrison state: act (commission) |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Quartermasters** | common | implemented | Worked strategic resources gain +3 food and +3 production. | Economic | the marches: widen |
| **The Soldier-Farmers** | common | implemented; revised 2026-10-21 (section 11) | Garrisoned towns gain +1 production and +1 gold on each worked hex with a resource. | Economic | the garrison state: widen; bridge to the marches |
| **War Foundries** | rare | implemented | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. | Economic | the garrison state: widen |
| **Horse Lords** | rare | implemented | Mounted units gain +3 strength and +1 movement. | Military | the marches: supply |
| **Martial Law** | common | implemented | Each garrisoned unit grants its city +2 happiness and +4 food. | Civic | the garrison state: widen |
| **The General Staff** | common | implemented | Cities with a Barracks give +3 production and +2 renown a turn, favouring great generals. | Economic | the captains: supply; bridge to the garrison state |
| **The Training Cadre** | common | implemented | Units gained in a town with a Barracks start with 2 experience. | Military | the garrison state: supply |
| **The Soldiers' Purse** | common | implemented | Military units cost 1 less upkeep for each rank they hold. | Military | the garrison state: multiply |
| **Honours of the Legion** | uncommon | implemented | Each time one of your units earns a rank, gain science and culture equal to its strength. | Civic | the garrison state: act |
| **The Pacified Marches** | uncommon | implemented | Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. | Civic | the marches: multiply (scaler) |
| **The Art of War** | uncommon | implemented | Gaining a unit grants science equal to three quarters of its strength. | Civic | engine glue: units gained |
| **Songs of the Fallen** | rare | implemented | Killing or losing a unit grants science and culture equal to twice its strength. | Civic | engine glue: kills and losses |
| **Walled Towns** | common | implemented | Towns with a defensive building, such as a Palisade or walls, gain +15% food. | Economic | the garrison state: widen |
| **The Swift Riders** | uncommon | implemented | Mounted units may move after attacking. | Military | the marches: act |
| **The Captive Craftsmen** | uncommon | implemented | Gains +1 science and +1 production each time you pillage a hex. | Civic | the marches: multiply (grower) |
| **The Satraps** | uncommon | implemented | Garrisoned towns in unrest pacify twice as fast. | Civic | the provinces: supply |
| **The Sack** | uncommon | implemented | Razing a town you captured grants production, gold and culture equal to fifteen times its population. | Economic | the provinces: act |
| **The Acropolis** | uncommon | implemented; proposed: reworked (was +1 authority for each building in your capital) | Citadels give +2 culture and +1 authority each. | Civic | the captains: widen |
| **The Ovation** | uncommon | new | Completing a commission gives every town +30% production for ten turns. Completing another restarts the ten turns. | Economic | engine glue: commissions (momentum); feature C |
| **The Spartan Discipline** | uncommon | new | Towns build military units 30% faster, but buildings 15% more slowly. | Military | engine glue: the cost |
| **Commission: The Ranks of Merit** | uncommon | new; revised 2026-10-21 (section 11) | Commission. Have three of your units earn a rank while this card is seated. Then, for the rest of the game, each rank a unit earns grants science and production equal to its strength in your capital. The card leaves its chair. | Wildcard | the garrison state: act (commission, institution) |
| **Commission: Harry the Border** | uncommon | new; revised 2026-10-21 (section 11) | Commission. Pillage four hexes while this card is seated. Then, for the rest of the game, your mounted units gain +50% yields from pillaging. The card leaves its chair. | Wildcard | the marches: act (commission, institution) |
| **The Upstarts** | uncommon | new | Your units gain +3 strength against the units of an empire that knows more technologies than you. | Military | the provinces: supply; feature B |
| **Commission: The First Province** | uncommon | new; revised 2026-10-21 (section 11) | Commission. Capture a town while this card is seated. Then, for the rest of the game, towns you captured gain +5 food and +5 gold. The card leaves its chair. | Wildcard | the provinces: act (commission, institution) |
| **The Castle Demesne** | uncommon | new | Citadels give +3 food and +3 production. | Economic | the captains: widen |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Siege Works** | common | implemented | +38% production toward siege units. Siege units gain +4 strength against cities. | Military | the provinces: supply |
| **Conquered Archives** | common | implemented | Captured cities gain +6 science and +6 culture. | Civic | the provinces: widen |
| **Stockpiles** | common | implemented | Cities gain +8 food per defensive building. | Economic | the garrison state: widen |
| **Triumphs** | common | implemented | Capturing a city grants culture equal to fifteen times its population. | Civic | the provinces: act |
| **The Citadel Works** | common | implemented | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. | Civic | the captains: widen |
| **Riders of the Steppe** | uncommon | implemented | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. | Military | the marches: supply |
| **Spoils of War** | uncommon | implemented | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. | Economic | the marches: widen |
| **Hegemony** | rare | implemented | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. | Economic | the provinces: act (momentum) |
| **Master Bowyers** | rare | implemented | Ranged and siege units gain +1 range. | Military | the provinces: supply |
| **Armoury Guilds** | common | implemented | When one of your units falls, your nearest town with an Armoury gains production equal to its strength. | Economic | engine glue: losses |
| **The Longships (was Marine Drill)** | uncommon | modify: reworked; proposed: a version with no new input, for your rework | A ship of yours that ends its turn beside an enemy improvement on the shore pillages it. | Military | the marches: act |
| **The Relay Stations** | uncommon | modify: deferred; proposed: a version with no new input, for your rework | Military units that start their turn in one of your towns connected to your capital gain +2 movement. | Military | the garrison state: act |
| **War Reparations** | uncommon | implemented | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. | Economic | the provinces: act |
| **Commission: Take the City** | uncommon | implemented; revised 2026-10-21 (section 11) | Commission. Capture a city with at least eight citizens. Then, for the rest of the game, each city you capture grants 250 science and 250 culture per age. The card leaves its chair. | Wildcard | the provinces: act (commission, institution) |
| **The Fabricae** | common | implemented | Towns whose garrison is a Veteran or Elite gain +25% production. | Economic | the garrison state: multiply |
| **Living off the Land** | common | implemented | Military units outside your territory cost no upkeep. | Military | the marches: supply |
| **The Longbowmen** | common | implemented | Ranged units gain +4 strength and +4 ranged strength. +5 culture each time they attack from range. | Military | engine glue: a strength line |
| **The Serried Ranks** | rare | implemented | Melee units beside another melee unit gain +10 strength when defending. | Military | the garrison state: defence |
| **The Veterans' Roll** | uncommon | implemented | +1% science and culture for every rank your units have earned this game, at most +30%. | Civic | the garrison state: multiply (scaler) |
| **The Conscription Rolls** | uncommon | implemented | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. | Military | the garrison state: supply |
| **The Hall of the Slain** | uncommon | implemented | +1% production and culture for every two units you have lost this game, at most +30%. | Civic | engine glue: losses (this game) |
| **The Funeral Oration** | uncommon | implemented | Units you lose count half toward war weariness. | Civic | engine glue: losses |
| **The Sagas** | uncommon | implemented | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. | Civic | the marches: multiply (scaler) |
| **The Provincial Census** | uncommon | implemented | Pacifying a town grants science equal to twenty times its population. | Civic | the provinces: act |
| **Spear-won Land** | uncommon | implemented | +3% production and science for every town you have captured this game, at most +30%. | Civic | the provinces: multiply (scaler) |
| **The Castra** | uncommon | implemented | Your own hexes with a fortified military unit gain +1 science and +1 production. Citadels gain +3 production and +3 science. | Civic | the captains: widen; bridge to the garrison state |
| **The Tactica** | uncommon | implemented | At the end of your turn, great generals give 1 experience to every unit beside them. Each time one of your units earns a rank, gain 15 science. | Military | the captains: act; bridge to the garrison state |
| **Double Time** | rare | implemented | Your Orders' effects that happen at the end of a turn or every few turns trigger twice. | Wildcard | engine glue: capstone (doubles) |
| **War Feeds Itself** | rare | implemented | At the end of your turn, each of your units in enemy territory yields you its hex's yields. | Economic | the marches: widen |
| **The Res Gestae** | uncommon | new | +4% production and culture for each commission you have completed this game, at most +30%. | Civic | engine glue: commissions (this game); feature C |
| **Commission: The Border Fortress** | uncommon | new; revised 2026-10-21 (section 11) | Commission. Plant a citadel while this card is seated. Then, for the rest of the game, your citadels gain +2 food and +2 production. The card leaves its chair. | Wildcard | the captains: act (commission, institution) |
| **The Naadam** | common | new | Towns gain +2 culture and +1 happiness for each pasture and camp in their borders. | Civic | the marches: widen |
| **The Taker of Cities** | uncommon | new | Your units beside one of your great generals gain +5 strength against towns. | Military | the captains: widen; bridge to the provinces |
| **The Roll of Triumphs** | uncommon | new | +5% production and gold for each great general you have gained this game, at most +30%. | Economic | the captains: multiply (scaler) |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Standing Garrisons** | common | implemented | Per garrisoned unit, the city gains +12% production and +12% culture. | Civic | the garrison state: multiply |
| **The Siege Train** | uncommon | implemented | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. | Military | the provinces: supply |
| **Reserve Officers** | uncommon | implemented | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. | Military | the garrison state: supply |
| **Total War** | rare | implemented | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. | Military | engine glue: capstone (a drawback) |
| **Commission: A Victor's Peace** | rare | implemented | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain one extra Wildcard chair for the rest of the game. | Wildcard | the provinces: act (commission, institution) |
| **The Drill Masters** | common | implemented | Units you gain start as Veterans. | Military | the garrison state: supply |
| **The Plunder Trains** | common | implemented | Pillaging grants 30 production and 15 food to your capital. | Economic | the marches: widen |
| **The Yam** | uncommon | implemented | Mounted units heal fully when they pillage. | Military | the marches: supply |
| **The Tagmata** | uncommon | implemented | Veteran and Elite units gain +5 strength. | Military | the garrison state: multiply |
| **Up Through the Ranks** | uncommon | implemented | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. | Civic | the captains: supply; bridge from the garrison state |
| **The Arrière-ban** | uncommon | implemented | Declaring war gives every city +50% production for ten turns. Declaring war again restarts the ten turns. | Economic | engine glue: momentum |
| **The Mural Crown** | uncommon | implemented | +10 renown each turn, favouring great generals. Each time you gain a great person, gain 100 science and 100 culture for each great general you have gained this game. | Civic | the captains: act |
| **The Victory Mint** | uncommon | implemented | Capturing a city grants gold equal to thirty times its population. | Economic | the provinces: widen |
| **The Bakufu** | uncommon | implemented | A great general standing in a town gives it +25% science and +25% culture, and pacifies it at once. | Civic | the captains: act; bridge to the provinces |
| **Interior Lines** | uncommon | implemented | A step along a road costs 40% less movement. A unit that has not moved this turn gains +4 strength when attacking. | Military | the garrison state: supply |
| **Rally to the Standard** | rare | add: rule-breaker; proposed: reworked (was "may appear", a choice that waited on its UX; now automatic; rarity was uncommon) | A unit you gain appears beside your nearest great general instead of in its town, if that general stands within ten hexes of the town. | Military | the captains: capstone (rule-breaker) |
| **Valhalla** | rare | implemented | When one of your units dies, gain 25 culture for each Monument in your empire. | Civic | engine glue: losses |
| **The Chevauchée** | rare | implemented | Pillaging a hex damages enemy cities within three hexes with 50% of the pillaging unit's strength. | Military | the marches: capstone (rule-breaker) |
| **Danegeld** | rare | implemented | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. | Civic | the marches: act; bridge to the provinces |
| **The Devshirme** | rare | implemented | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. | Military | the provinces: widen; bridge to the garrison state |
| **Pax Romana** | rare | implemented | Towns you capture are pacified at once, and each costs 1 less authority to hold. | Civic | the provinces: capstone (rule-breaker) |
| **The Regimental Schools** | common | implemented | At the end of your turn, each garrisoned unit gains 1 experience and gives its town +2 science. | Civic | the garrison state: supply |
| **The Board of Ordnance** | common | implemented | While at war, each city with a Barracks gains +1 production and +1 science for every three citizens. | Civic | the garrison state: widen |
| **The Limitanei** | rare | new | Each military unit in one of your towns lets that town work one more hex, at most two more. | Economic | the garrison state: capstone (rule-breaker) |
| **Commission: The Chosen Men** | uncommon | new | Commission. Have three of your units become Elite while this card is seated. Then, for the rest of the game, your Elite units ignore enemy zone of control. The card leaves its chair. | Wildcard | the garrison state: act (commission, institution) |
| **The March Revenues** | uncommon | new | +3% production for each pasture, camp and strategic resource inside your borders, at most +30%. | Economic | the marches: multiply |
| **The Tributary Kings** | uncommon | new | Your capital gains +1 production and +1 gold for each citizen in your puppet towns. | Economic | the provinces: widen |

**Also dealt here:** Double Time, from Tier II (ruled 2026-10-16).

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Imperium** | rare | implemented | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. | Economic | the provinces: finisher |
| **The Praetorian Guard** | rare | implemented | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. | Military | the garrison state: finisher |
| **The Grand Army** | rare | implemented | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. | Civic | engine glue: the large army |
| **The Annexed Provinces** | rare | implemented | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. | Civic | the provinces: multiply |
| **The Marshalate** | rare | implemented; proposed: reworked (was +1 strength for every military unit per general called, plus citadel culture and production) | Your great generals' aura gives +1 more strength for each great general you have gained this game, at most +5. | Military | the captains: multiply |
| **The Military Frontier** | rare | implemented | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. | Civic | the garrison state: finisher |
| **The Grand Coalition** | rare | implemented | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. | Military | engine glue: the Opus race |
| **The Proconsuls** | uncommon | implemented | Captured cities with a garrison cost no authority and gain +10 defence. | Civic | the provinces: supply |
| **Commission: The Grand Campaign** | uncommon | implemented | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. | Wildcard | the provinces: act (commission) |
| **Circumvallation** | uncommon | modify: deferred; proposed: a version with no new input, for your rework (the "you can see" clause goes) | While a rival town is under siege by your units, it adds no production toward a Magnum Opus. | Military | the provinces: act |
| **Commission: Hold the Capitals** | rare | implemented | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. | Wildcard | the provinces: act (commission) |
| **Spolia** | rare | implemented | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. | Economic | the provinces: finisher |
| **The Legions' Labour** | rare | implemented | Disbanding a military unit in a town building a wonder or the Magnum Opus adds half its production cost toward it. Units raised for free add nothing, but units raised by a levy count. | Economic | engine glue: the way to win |
| **The Nation in Arms** | rare | implemented | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. | Military | the garrison state: supply |
| **Commission: The Captured Marvel** | rare | implemented; revised 2026-10-21 (section 11) | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then, for the rest of the game, captured cities that hold a world wonder, and captured original capitals, gain +30% science and +30% culture. The card leaves its chair. | Wildcard | the captains: act (commission, institution) |
| **The Horde** | rare | implemented | Pillaging a hex also pillages every enemy improvement beside it. | Military | the marches: finisher |
| **Vae Victis** | rare | implemented | Your capture rewards are paid twice. | Wildcard | the provinces: doubler |
| **The Varangian Guard** | rare | implemented | Elite units may attack twice a turn. | Military | the garrison state: capstone (rule-breaker) |
| **The Glorious Dead** | rare | implemented | Your losses never count toward war weariness. | Civic | engine glue: losses |
| **The Harrying** | rare | implemented | Pillaging a hex beside a rival town with no garrison throws that town into unrest. | Military | the marches: act |
| **The Great Bombards** | rare | implemented | Your siege units break a town's walls in one blow. | Military | the provinces: rule-breaker |

## Shared with another deck

These rows live in `data/decks/common.json`. The Soldier-Scholars has no row yet. A seat holding Dominion, or the deck named beside a card, may draw it, so a change here is felt in two decks. Each pair keeps an early shared card (ruling (qqqqqq) 14).

| Card | Also in | Tier | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|---|---|
| **Rites of Passage** | Devotion | 0 | common | implemented | Gaining a military unit grants 12 faith. | Civic | engine glue: early faith |
| **The Frontier Militia** | Expansionist | 0 | common | implemented | Each town you found starts with the best melee unit you can build standing in it. | Military | the garrison state: supply (each new town garrisoned) |
| **Military Colonies** | Expansionist | I | uncommon | implemented | Cities with a Barracks gain +45% production toward settlers and workers. | Economic | no Dominion theme; for the Expansionist pass |
| **The Escorted Roads** | Commerce | I | uncommon | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | Economic | the garrison state: widen |
| **Field Academies** | Scientific | I | uncommon | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. | Civic | engine glue: kills |
| **The Barbarian Frontier** | Expansionist | I | uncommon | implemented | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. | Economic | the marches: supply (land) |
| **The Oriflamme** | Devotion | I | uncommon | implemented | Military units beside one of your religious units gain +4 strength. | Military | engine glue: a strength line |
| **The Sacred Host** | Devotion | I | rare | implemented | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. | Military | engine glue: soldiers (bought with faith) |
| **The Sword of State** | Magisterial | I | common | implemented | On draft: the best melee unit you can build is trained in your capital. It costs no upkeep. Seated, this card does nothing. | Military | engine glue: soldiers (a unit on draft) |
| **Copying the Enemy** | Scientific | I | uncommon | implemented | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. | Civic | engine glue: kills |
| **The Muster of the Fields** | Expansionist | I | uncommon | implemented | Cities of at least five citizens may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. The unit counts as trained. | Military | the garrison state: supply (a levy) |
| **The Farming Garrisons** | Expansionist | I | common | implemented | Hexes with a fortified military unit gain +1 food and +1 production. Fortified units gain +2 strength. | Economic | the garrison state: widen; bridge to the marches |
| **The Road Garrisons** | Expansionist | II | uncommon | implemented | Garrisoned cities with a road to your capital gain +5 food and +5 defence. | Economic | the garrison state: widen |
| **Marcher Lords** | Expansionist | II | uncommon | implemented | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. | Economic | the marches: supply (border towns) |
| **Convert It or Tax It** | Devotion | II | uncommon | implemented | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. | Economic | the provinces: widen |
| **Examinations of State** | Magisterial | II | rare | implemented | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. | Civic | the garrison state: widen |
| **The Crusader Orders** | Devotion | II | uncommon | implemented | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | Military | the provinces: supply |
| **Carried-Off Scholars** | Scientific | II | common | implemented | Capturing a city grants science equal to ten times its population. | Civic | the provinces: widen |
| **Looted Art** | Magisterial | II | uncommon | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic | the captains: act (works and wonders taken) |
| **The Soldier-Scholars** | Scientific | II | uncommon | new (your ruling on the Scientific review page, 2026-10-21; it replaces the Scientific card The Companions) | Your military units in your towns gain +5 strength, and each supplies +2 science. | Military (revised 2026-10-21, section 11: reading, to confirm; both sheets must agree) | the garrison state: widen |
| **The Engineer Corps** | Scientific | III | uncommon | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | Military | the provinces: supply (siege) |
| **War Bonds** | Commerce | III | uncommon | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | Military | engine glue: a strength line |
| **Professional Soldiers** | Commerce | III | uncommon | implemented | Units you purchase gain +3 combat strength. | Military | engine glue: soldiers (bought with gold) |
| **The Chartered Company** | Commerce | III | uncommon | implemented | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Military | engine glue: soldiers (a charter unit) |
| **The Holy Army** | Devotion | III | uncommon | implemented | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. | Civic | the captains: widen (citadels beside Holy Sites) |
| **Letters of Marque** | Commerce | III | rare | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. | Economic | the marches: act (raids at sea) |
| **Mercenary Contracts** | Commerce | III | uncommon | modify: deferred | Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns. | Military | engine glue: soldiers (hired); Commerce's to rework |
| **The New Code** | Magisterial | III | rare | implemented | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. | Wildcard | the provinces: act (a capture opens a draft) |

## Cut by this pass

Every sheet card the themes pass cuts, with the sheet's text, so you can restore one. Each has a live data row to retire.

| Card | Tier | Ability (as on the sheet) | Why |
|---|---|---|---|
| **Muster Rites** | 0 | Gaining a unit grants 8 faith and 8 food. | You passed it in play (*"muster rites is pretty bad, opted to pass"*); Rites of Passage, shared with Devotion, does the same job. |
| **The Funeral Games** | 0 | When one of your units falls, gain faith equal to its strength. | Merged into The Camp Chaplains. |
| **The Armourers' Secret** | 0 | While seated, researching a technology that unlocks a military unit grants one of that unit in your capital. It costs no upkeep. | Another free unit, paid by research, which is Scientific's lane. |
| **The Marshals** | I | +2 strength per adjacent friendly combat unit, at most +6. | The same job as The Serried Ranks (strength from standing together), and +6 at Tier I is beyond the strong line. |
| **The Marching Camps** | I | Attacking does not break your units' fortification. | Not very impactful, and the garrison state is crowded at Tier I. |
| **The Open Muster** | I | Passing a draft hand grants the best melee unit you can build in your capital. It costs no upkeep. | It reads a passed draft, which is Magisterial's ground, and is another free unit. |
| **The Cleruchy** | I | When drafted, gain a free settler in your capital. Seated, this card does nothing. | Founding towns is Expansionist's way to play; The Armed Colony keeps Dominion's angle. |
| **The Valetudinaria** | II | Units in your territory heal 15 more hit points a turn. | Filler; the Scientific Bimaristan heals units in your land. |
| **The State Forges** | II | Each time you research a technology, your capital raises the best melee unit you can build. It costs no upkeep. | A free unit for every technology is too many pieces, and research is Scientific's lane. |
| **The Keshik** | III | Mounted Veteran and Elite units gain +1 movement. | Two narrow facts (mounted and ranked); Horse Lords and The Swift Riders carry the riders. |

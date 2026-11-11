# The Dominion deck

The deck's cards, by tier: name, rarity, status and ability. This sheet is the spec of record for the deck, and `test/sim/decks/dominion.test.ts` checks it against `data/decks/dominion.json`.

- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (your revision), `replaced` (a new card takes over the row), `reworked` (ruling 6 of 2026-10-15, or a rework in the themes pass of 2026-10-21), `wording` (the text changes, the effect does not), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text). The ability shown is the target.
  - `add`: not in the data yet. `add: reworked` is one of your ideas reworked for ruling 6; `add: rule-breaker` is one of the rule-breaking cards added for ruling 4.
  - **(was …)** names the data row a renamed card takes over, or your earlier name for a reworked idea.
- **Doctrines:** tiers I to IV each list Dominion's Doctrines for one government tier. A Doctrine is held for the whole game and takes no chair. Adopting a government offers Doctrines of that government's tier, drawn from both of the seat's decks (ruled 2026-10-15, `docs/flags.md` (vvvvvv)). Since 2026-10-16 that offer is all a new government brings: it no longer comes with a hand of rare cards. Tier I's Doctrines come with the tier-4 governments, Tier II's with tier 10, Tier III's with tier 18 and Tier IV's with tier 26 (29 until 2026-10-17). The tier-38 governments were meant for a fifth age and are left unimplemented (ruled 2026-10-16, and the pairing confirmed the same day). Thirteen are live and dealt (3, 4, 3 and 3 across Tiers I to IV). You removed The Servian Reforms on 2026-10-21, and Weight of Numbers and Total Mobilisation on 2026-11-05 (`docs/plans/doctrine-review-2026-11-05.md`). Their data rows are retired. Their tables have three columns, and the sync test skips rows with fewer than four cells, so it reads only the card tables.
- **Type:** the last column of each card table says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard**. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. The sorting rules and every government's chairs are in `docs/plans/doctrines-governments-chairs.md`, section 4. The sync test checks this column against each card's `type` in the data, the shared table's cards included.
- **Why each card is here:** `docs/plans/dominion-themes.md`: the themes pass of 2026-10-21, with the four themes (the garrison state, the marches, the provinces and the captains), the engine of soldiers and commissions, and your rulings in section 11. Each card's theme and role are in `docs/plans/dominion-list-proposed.md`, and the build plan is `docs/plans/dominion-themes-triage.md`. The earlier pass, with the four builds and the rulings of 2026-10-15, is `docs/plans/dominion-builds.md`.
- **The long form** (the old notes, the "built as" details, the synergy section): `docs/decks/reference/dominion-2026-10-15.md`. Ideas not on the sheet: `docs/plans/dominion-ideas.md`.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`, `docs/flags.md` item (hhhhhhh)) retired 56 rows of this deck and 7 shared rows. It moved Blood Brothers, Commission: Clear the Frontier and The Gathering Host from Tier 0 to Tier I. A moved row keeps its text until a later batch changes it. Double Time was the one card dealt in two tiers, and it is retired. "Retired rows" below gives the reason for each cut.
- **Batch DS2** (2026-11-10, the same spec) gave 34 rows of this deck and 15 shared rows their new, shorter text, and changed their effects to match. A simplified card lost the clause the spec drops, and a changed card has the new effect. Each card's Note is in the spec. Two readings were taken: The Naadam pays on the pasture or camp hex, so the hex must be worked, and The Limitanei gives a town with any garrison one more hex. Four effect shapes that no row used after this batch are removed: the ranged attack moment (The Longbowmen's old culture), the "has not moved" and "in its own town" combat conditions (Interior Lines and The Soldier-Scholars), and the unit age filter (The Spear Makers).

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 8 | 0 | 0 | 8 | none |
| Tier I | 17 | 0 | 0 | 17 | 3 |
| Tier II | 19 | 0 | 0 | 19 | 4 |
| Tier III | 17 | 0 | 0 | 17 | 3 |
| Tier IV | 12 | 0 | 0 | 12 | 3 |
| **All** | **73** | **0** | **0** | **73** | **13** |
| Shared | 22 | 0 | 0 | 22 |  |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 2 | 4 | 2 | 0 |
| Tier I | 5 | 4 | 6 | 2 |
| Tier II | 8 | 4 | 5 | 2 |
| Tier III | 5 | 3 | 7 | 2 |
| Tier IV | 5 | 0 | 4 | 3 |
| **All** | **25** | **15** | **24** | **9** |
| Shared | 12 | 4 | 5 | 1 |

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Blooded Spears** | common | implemented | Military units gain +2 strength. | Military |
| **The Horse Herds** | common | implemented | Worked pastures and camps give +1 food and +1 production. | Economic |
| **Sword and Plough** | common | implemented | Each city with a garrison gains +1 culture and +2 production. | Economic |
| **The Grain Tribute** | common | implemented | +1 food and +1 production in every city. | Economic |
| **The Bards' Praise** | common | implemented | Killing a unit grants culture equal to its strength. | Civic |
| **The Spear Makers** | common | implemented | +25% production toward military units. | Military |
| **The Outriders** | common | implemented | Clearing a barbarian camp grants 10 production to every town. | Economic |
| **The Captured Arms** | common | implemented | +1 science for every unit you have killed this game, no cap. | Civic |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Marian Reforms** | drilled legions | Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected. |
| **The Steppe Confederacy** | steppe raiders | +50% production toward mounted units. Mounted units gain +3 strength when attacking a wounded unit. |
| **The Soldiers' Share** | conqueror | Melee units gain +1 movement and +3 strength. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Quartermasters** | common | implemented | Worked strategic resources gain +3 food and +3 production. | Economic |
| **War Foundries** | rare | implemented | Towns with a Barracks gain gold equal to 30% of their production. | Economic |
| **Horse Lords** | rare | implemented | Mounted units gain +3 strength and +1 movement. | Military |
| **Martial Law** | common | implemented | Each garrisoned unit grants its city +2 happiness and +4 food. | Civic |
| **The General Staff** | common | implemented | Each Barracks gives +5 production and +2 general renown. | Economic |
| **The Training Cadre** | common | implemented | Units gained in a town with a Barracks start with 2 experience. | Military |
| **Honours of the Legion** | uncommon | implemented | Each time one of your units earns a rank, gain science and culture equal to its strength. | Civic |
| **The Pacified Marches** | uncommon | implemented | +1 authority and +5 culture for each barbarian camp you have cleared, at most +8 and +40. | Civic |
| **Songs of the Fallen** | rare | implemented | Killing or losing a unit grants science and culture equal to twice its strength. | Civic |
| **The Swift Riders** | uncommon | implemented | Mounted units may move after attacking. | Military |
| **The Captive Craftsmen** | uncommon | implemented | Gains +1 science and +1 production each time you pillage a hex. | Civic |
| **The Upstarts** | uncommon | implemented | Your units gain +3 strength against the units of an empire that knows more technologies than you. | Military |
| **Commission: The First Province** | uncommon | implemented | Goal: capture a town. Reward: towns you captured gain +5 food and +5 gold. | Wildcard |
| **The Castle Demesne** | uncommon | implemented | Citadels give +3 food and +3 production. | Economic |
| **Blood Brothers** | rare | implemented | A barbarian unit you kill joins your side. | Military |
| **Commission: Clear the Frontier** | common | implemented | Goal: clear 2 barbarian camps. Reward: choose a great general. | Wildcard |
| **The Gathering Host** | uncommon | implemented | Gains +1 science and +1 culture each time you gain a military unit. | Civic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Centurions** | drilled legions | Each Elite unit gives +3 strength to your units beside it, and costs 1 less upkeep. |
| **The Plunder Economy** | steppe raiders | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. |
| **The Laws of Lord Shang** | endless host | While a town builds a military unit, its surplus food goes into the unit instead of into growth. |
| **The Consular Roads** | conqueror | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Siege Works** | common | implemented | Siege units gain +4 strength against towns. | Military |
| **Conquered Archives** | common | implemented | Captured cities gain +6 science and +6 culture. | Civic |
| **Stockpiles** | common | implemented | Cities gain +8 food per defensive building. | Economic |
| **The Citadel Works** | common | implemented | Citadels gain +5 science and +3 general renown. | Civic |
| **Riders of the Steppe** | uncommon | implemented | Pillaging costs your mounted units one less movement point. | Military |
| **Spoils of War** | uncommon | implemented | Pillaging a hex grants 50 gold and 15 culture. | Economic |
| **Hegemony** | rare | implemented | Towns you captured cost 1 less authority. | Economic |
| **Master Bowyers** | rare | implemented | Ranged and siege units gain +1 range. | Military |
| **Commission: Take the City** | uncommon | implemented | Goal: capture a city of 8 or more citizens. Reward: each city you capture grants 250 science and 250 culture per age. | Wildcard |
| **Living off the Land** | common | implemented | Military units outside your territory cost no upkeep. | Military |
| **The Longbowmen** | common | implemented | Ranged units gain +2 strength and +1 range. | Military |
| **The Serried Ranks** | rare | implemented | Melee units beside another melee unit gain +10 strength when defending. | Military |
| **The Veterans' Roll** | uncommon | implemented | +1% science and culture for every rank your units have earned this game, at most +30%. | Civic |
| **Spear-won Land** | uncommon | implemented | +3% production and science for each town you have captured. | Civic |
| **The Tactica** | uncommon | implemented | Great generals give 1 experience each turn to units beside them. | Military |
| **War Feeds Itself** | rare | implemented | At the end of your turn, each of your units in enemy territory yields you its hex's yields. | Economic |
| **Commission: The Border Fortress** | uncommon | implemented | Goal: plant a citadel. Reward: citadels gain +2 food and +2 production. | Wildcard |
| **The Naadam** | common | implemented | Pastures and camps gain +2 culture. | Civic |
| **The Taker of Cities** | uncommon | implemented | Your units beside one of your great generals gain +5 strength against towns. | Military |

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Combined Arms** | conqueror | Your units gain +3 strength, doubled beside one of your siege units. Siege units beside one of your melee units cannot be attacked in melee. |
| **The Universal Monarchy** | conqueror | Towns you capture cost no authority, including those you already hold. Towns you found from now on cost twice as much authority. |
| **The Strategoi** | drilled legions | +30% renown. Citadel yields and your great generals' strength aura are doubled. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Standing Garrisons** | common | implemented | Per garrisoned unit, the city gains +12% production and +12% culture. | Civic |
| **The Siege Train** | uncommon | implemented | Siege units gain +1 movement, and +5 strength when defending. | Military |
| **Total War** | rare | implemented | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. | Military |
| **Commission: A Victor's Peace** | rare | implemented | Goal: take two cities from an empire, then make peace with it or destroy it. Reward: one more Wildcard chair. | Wildcard |
| **The Drill Masters** | common | implemented | Units you gain start as Veterans. | Military |
| **The Tagmata** | uncommon | implemented | Veteran and Elite units gain +5 strength. | Military |
| **Up Through the Ranks** | uncommon | implemented | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. | Civic |
| **The Mural Crown** | uncommon | implemented | Gaining a great person grants 200 science and culture for each great general you have gained. | Civic |
| **The Victory Mint** | uncommon | implemented | Capturing a city grants gold equal to thirty times its population. | Economic |
| **The Bakufu** | uncommon | implemented | A great general standing in a town gives it +25% science and culture. | Civic |
| **Interior Lines** | uncommon | implemented | Roads cost your units 40% less movement. | Military |
| **Valhalla** | rare | implemented | When one of your units dies, gain 25 culture for each Monument in your empire. | Civic |
| **Pax Romana** | rare | implemented | Towns you capture are pacified at once. | Civic |
| **The Regimental Schools** | common | implemented | Each garrisoned unit gives its town +3 science. | Civic |
| **The Limitanei** | rare | implemented | A garrisoned town works one more hex. | Economic |
| **Commission: The Chosen Men** | uncommon | implemented | Goal: have three units become Elite. Reward: your Elite units ignore enemy zone of control. | Wildcard |
| **The Tributary Kings** | uncommon | implemented | Your capital gains +1 production and +1 gold for each citizen in your puppet towns. | Economic |

## Tier IV

**Doctrines,** offered with the tier-26 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Fortress Empire** | drilled legions | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. |
| **The Scourge of God** | steppe raiders | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. |
| **The Landsturm** | endless host | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Grand Army** | rare | implemented | Your capital gains +3 science and +3 culture for each military unit you have. | Civic |
| **The Annexed Provinces** | rare | implemented | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. | Civic |
| **The Marshalate** | rare | implemented | Your great generals' aura gives +1 more strength for each great general you have gained this game, at most +5. | Military |
| **The Proconsuls** | uncommon | implemented | Captured towns with a garrison cost no authority. | Civic |
| **Commission: The Grand Campaign** | uncommon | implemented | Goal: capture three cities. Reward: a great general, and science and culture equal to ten times their population. | Wildcard |
| **Circumvallation** | uncommon | implemented | While a rival town is under siege by your units, it adds no production toward a Magnum Opus. | Military |
| **Commission: Hold the Capitals** | rare | implemented | Goal: hold two rival capitals. Reward: a great general, and +25% production in every town for twenty turns. | Wildcard |
| **The Horde** | rare | implemented | Pillaging a hex also pillages every enemy improvement beside it. | Military |
| **Vae Victis** | rare | implemented | Your capture rewards are paid twice. | Wildcard |
| **The Varangian Guard** | rare | implemented | Elite units may attack twice a turn. | Military |
| **The Glorious Dead** | rare | implemented | Your losses never count toward war weariness. | Civic |
| **The Great Bombards** | rare | implemented | Your siege units break a town's walls in one blow. | Military |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Dominion or the deck named beside each one may draw it, so a change here is felt in two decks.

**Moved by Commerce batch T7 (2026-10-23).** The Standing Army moved from this deck's file to `data/decks/common.json`, shared with Commerce, with its id, text, tier, rarity and type. It is the early shared card of the Dominion and Commerce pair (ruling (qqqqqq) 14), and a Commerce seat's Military card at Tier 0.

**Changed by batch R1 (2026-10-25).** The Standing Army moved to Tier I in both decks (*"move to tier 1 (barracks appear later)"*). It is still the early shared card of the Dominion and Commerce pair. Copying the Enemy is retired, so it leaves both decks (*"remove"*, your comment on this table). It paid only for kills, so a Scientific seat alone would rarely use it.

**Built by Devotion batch DV2 (2026-10-25).** The Shrine Guards is a new card shared with Devotion, at Tier 0: towns with a Shrine may buy melee units with faith. It is a second early shared card for the Dominion and Devotion pair, beside Rites of Passage (`docs/plans/devotion-themes-triage.md`, the shared table).

**Changed by Devotion batch R2c (2026-10-28).** The Shrine Guards moved to Tier I in both decks (*"move to tier 1"*, your comment on the Devotion sheet; `docs/plans/devotion-review-2026-10-28.md`). It is still an early shared card of the Dominion and Devotion pair.

**Built by Commerce batch T6 (2026-10-23).** Mercenary Contracts takes the Commerce themes pass's text: a military unit bought with gold or faith while the card is seated costs no upkeep for twenty turns, and keeps the waiver if the card leaves its chair (`docs/plans/commerce-themes-triage.md`, reading 27). The hired unit that left after fifteen turns is gone.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Rites of Passage** | common | Devotion | 0 | implemented | Gaining a military unit grants 12 faith. | Civic |
| **The Shrine Guards** | common | Devotion | I | implemented | Towns with a Shrine may buy melee units with faith. | Military |
| **The Standing Army** | uncommon | Commerce | I | implemented | Garrisoned units cost no upkeep. | Military |
| **The Escorted Roads** | uncommon | Commerce | II | implemented | Trade routes from a garrisoned town gain +5 gold. | Economic |
| **Field Academies** | uncommon | Scientific | I | implemented | Your first kill each turn grants 25 science. | Civic |
| **The Barbarian Frontier** | uncommon | Expansionist | I | implemented | Clearing a barbarian camp claims its hex and the unowned hexes around it. | Economic |
| **The Oriflamme** | uncommon | Devotion | I | implemented | Military units beside one of your religious units gain +4 strength. | Military |
| **The Sacred Host** | rare | Devotion | I | implemented | Kills grant 15 faith. | Military |
| **The Sword of State** | common | Magisterial | I | implemented | On draft: gain the best melee unit you can build. It costs no upkeep. | Military |
| **The Muster of the Fields** | uncommon | Expansionist | I | implemented | Towns of 5 or more citizens may spend a citizen to raise a melee unit. | Military |
| **The Frontier Militia** | common | Expansionist | 0 | implemented | Each town you found starts with a melee unit. | Military |
| **The Farming Garrisons** | common | Expansionist | I | implemented | Hexes with a fortified unit gain +1 food and +1 production. | Economic |
| **Examinations of State** | rare | Magisterial | II | implemented | Garrisoned towns gain +1 science and +1 culture for every three citizens. | Civic |
| **The Crusader Orders** | uncommon | Devotion | II | implemented | Military units gain +3 strength in land that does not follow your religion. | Military |
| **Carried-Off Scholars** | common | Scientific | II | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **Looted Art** | uncommon | Magisterial | II | implemented | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. | Civic |
| **The Soldier-Scholars** | uncommon | Scientific | II | implemented | Each military unit in your towns gives +2 science. | Military |
| **Professional Soldiers** | uncommon | Commerce | III | implemented | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** | uncommon | Commerce | III | implemented | Unlocks the Company Guard, a melee unit you buy with gold. | Military |
| **Letters of Marque** | rare | Commerce | III | implemented | Naval kills grant 60 gold. | Economic |
| **Mercenary Contracts** | uncommon | Commerce | III | implemented | Military units you buy cost no upkeep for twenty turns. | Military |
| **The New Code** | rare | Magisterial | III | implemented | Capturing a city deals you a free Order hand, at most once every ten turns. | Wildcard |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects. Batch DS1 added this section. The earlier retirements are under "Open for your pass", with the pass that cut each one.

- **Batch DS8** (2026-11-11, the same spec) put the four keywords on the card face: Commission, Charter, Scaler and Boon. The game reads each from the card's data (`orderKeyword`), prints it as the card's first clause, and shows its rule in a tooltip. So no text below starts with "Charter." or "Boon." any more.
- **Retired in batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`). The reason after each card is the Note column of that file's table. Each data row keeps its text and effects:
  - Battle Honours (Tier 0): a commission with two rewards. Tier 0 keeps plain cards.
  - Commission: Man the Walls (Tier 0): Tier 0 keeps plain cards. Sword and Plough already rewards garrisons.
  - The Armed Colony (Tier 0): three clauses on one card. Doctrine candidate.
  - The Camp Chaplains (Tier 0): Rites of Passage (shared) is the deck's early faith.
  - The Campaign Annals (Tier 0): Honours of the Legion pays for ranks at Tier I.
  - The Champion's Portion (Tier 0): the third kill reward in one tier. The General Staff gives general renown.
  - The Drill Grounds (Tier 0): a timer to track. The Training Cadre does this job at Tier I.
  - The Garrison Captains (Tier 0): cut by your comment of 2026-11-10.
  - The Hunting Grounds (Tier 0): two effects that do not belong together.
  - The Scaling Ladders (Tier 0): age 1 has few sieges. Combat cards were 69% of Dominion's Tier 0 offers.
  - Commission: Harry the Border (Tier I): pillage goes down to a few cards.
  - Commission: The Ranks of Merit (Tier I): its reward is Honours of the Legion again.
  - The Acropolis (Tier I): The Castle Demesne is the citadel card of this tier.
  - The Art of War (Tier I): The Gathering Host does this job as a scaler.
  - The King's Levy (Tier I): it puts free units on the map on a timer, and each one needs orders every turn. The Sword of State (shared) is the one-time version.
  - The Ovation (Tier I): it reads commissions, and the deck now has fewer of them.
  - The Sack (Tier I): too narrow to matter in most games. Triumphs pays for captures.
  - The Satraps (Tier I): too narrow to matter in most games.
  - The Soldier-Farmers (Tier I): it asks for two separate things at once.
  - The Soldiers' Purse (Tier I): the player must track each unit's rank against its upkeep.
  - The Spartan Discipline (Tier I): The Spear Makers does the same with no drawback.
  - Walled Towns (Tier I): Stockpiles (Tier II) is the defensive-building card.
  - Armoury Guilds (Tier II): too narrow to matter in most games.
  - Double Time (Tier II): the player must know which cards are timers. Doctrine candidate.
  - The Castra (Tier II): two effects. The card keeps one. The Farming Garrisons (shared) and The Citadel Works cover both halves.
  - The Conscription Rolls (Tier II): it puts free units on the map on a timer, and each one needs orders every turn.
  - The Fabricae (Tier II): it asks for two separate things at once.
  - The Funeral Oration (Tier II): The Glorious Dead (Tier IV) is the war weariness card.
  - The Hall of the Slain (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Longships (Tier II): pillage goes down to a few cards.
  - The Provincial Census (Tier II): too narrow to matter in most games.
  - The Relay Stations (Tier II): it asks for two separate things at once.
  - The Res Gestae (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Roll of Triumphs (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Sagas (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two. Pillage goes down to a few cards.
  - Triumphs (Tier II): cut by your comment of 2026-11-10.
  - War Reparations (Tier II): Triumphs and The Victory Mint pay for captures.
  - Danegeld (Tier III): pillage goes down to a few cards.
  - Rally to the Standard (Tier III): three conditions to read.
  - Reserve Officers (Tier III): two modes, four numbers.
  - The Arrière-ban (Tier III): the best play is a dull repeated action. Declare war, make peace, declare again.
  - The Board of Ordnance (Tier III): war only, with two conditions.
  - The Chevauchée (Tier III): pillage goes down to a few cards.
  - The Devshirme (Tier III): three conditions to read. Doctrine candidate.
  - The March Revenues (Tier III): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Plunder Trains (Tier III): pillage goes down to a few cards.
  - The Yam (Tier III): pillage goes down to a few cards.
  - Commission: The Captured Marvel (Tier IV): Hold the Capitals is the late conquest goal.
  - Imperium (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck. Circumvallation is Dominion's late Opus card.
  - Spolia (Tier IV): cut by your comment of 2026-11-10.
  - The Grand Coalition (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck.
  - The Harrying (Tier IV): pillage goes down to a few cards.
  - The Legions' Labour (Tier IV): the best play is a dull repeated action. Train a unit, then disband it.
  - The Military Frontier (Tier IV): The Regimental Schools does this job.
  - The Nation in Arms (Tier IV): it puts free units on the map on a timer, and each one needs orders every turn.
  - The Praetorian Guard (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck.
  - in `data/decks/common.json`, the shared cards:
    - Military Colonies (with Expansionist, Tier I): too narrow to matter in most games.
    - Convert It or Tax It (with Devotion, Tier II): two modes on one card.
    - Marcher Lords (with Expansionist, Tier II): four numbers and a distance to check.
    - The Road Garrisons (with Expansionist, Tier II): it asks for two separate things at once.
    - The Engineer Corps (with Scientific, Tier III): three effects, one of them war only.
    - The Holy Army (with Devotion, Tier III): it asks for two separate things at once.
    - War Bonds (with Commerce, Tier III): a treasury threshold to check before each purchase.

## Open for your pass

New names are placeholders; rename freely.

- **Your Doctrine comments of 2026-11-05, built in batch DT1** (`docs/plans/doctrine-review-2026-11-05.md`, written into the rows above):
  - **The Steppe Confederacy** has new text, and the border freeze rule is gone (*"revise: gain +50% production towards mounted units. +3 combat strength to mounted units when attacking wounded units."*). "Wounded" means a unit below its full health, and a town does not count.
  - **The Soldiers' Share** has new text and keeps its name (*"replace: +1 movement and +3 combat strength for melee units."*).
  - **Centurions** now costs 1 less upkeep (*"revise: 'and costs 1 less upkeep'"*). A unit's upkeep does not go below nought.
  - **The Universal Monarchy** (*"revise: captured towns cost no authority. This should apply retroactively to previously captured cities"*, then *"newly founded towns cost double authority, this does not apply retroactively to cities you've already founded"*). A town founded on or after the turn you take the Doctrine doubles. The founding preview now shows the doubled price.
  - **The Consular Roads** moved to Tier II (*"move to tier 2"*), and **The Strategoi** to Tier III (*"move to tier 3"*).
  - **Weight of Numbers and Total Mobilisation** are cut (*"remove"*), and their data rows are retired. A save that holds one keeps it.
- **Your review comments of 2026-10-23, built in batch R1 (2026-10-25)** (`docs/plans/review-revisions-2026-10-25.md`, written into the rows above):
  - **The King's Levy** moved to Tier I, and a drafted copy gives your capital a melee unit at once (*"revise: add "gain a melee unit in your capital". move to tier 1"*). The unit is the one the levy raises every fifteen turns, and it also costs no upkeep.
  - **The Drill Grounds** drills every 3 turns (*"revise: every 3 turns"*).
  - **The Campaign Annals** gains +3 science for each rank (*"revise: this card gains +3 science each time one of your units earns a rank."*). It still starts at +3 science.
  - **The Cattle Raid** is cut, and its data row is retired (*"remove, too similar a shape to the bards' praise"*).
  - **The Defiant Kingdom** is cut, and its data row is retired (*"remove"*).
  - **The Standing Army** (shared) moved to Tier I, and **Copying the Enemy** (shared) is retired. The note above the shared table says more.
  - Tier 0 still has six Military cards after the moves: Blood Brothers, Blooded Spears, The Drill Grounds, The Scaling Ladders, The Spear Makers and The Hunting Grounds.
- **Still open:**
  - **Combined Arms' second clause** (my proposal, since the old one repeated The Siege Train and The Engineer Corps): siege units beside one of your melee units cannot be attacked in melee. The infantry screens the guns. It is the same kind of rule as The Testudo's.
  - **The endless host's new Doctrines** (my proposal): The Laws of Lord Shang at Tier II. The reasoning is in `docs/plans/doctrines-governments-chairs.md`, section 2. You removed the other two: The Servian Reforms at Tier I on 2026-10-21, and Weight of Numbers on 2026-11-05.
  - **The Plunder Economy and The Consular Roads** are unchanged since my notes of 2026-10-15, apart from The Consular Roads' move to Tier II: the first pays every city for every pillage, and the second's "pacified at once" does Pax Romana's job.
  - **The Art of War duplicate** (ruling 7): your "gaining a unit grants science equal to its strength" did the same job as The Art of War. It is reworked above as The Captured Arms (science from kills this game). Say if you would rather keep yours and change The Art of War instead.
  - **The Grain Tribute** had no rarity; it is set to common.
  - **The build plan's questions** (`docs/plans/dominion-themes-triage.md`, "Questions for the user"). Until you answer, the sheet shows the plan's readings:
    - The Longships, The Relay Stations and Circumvallation are built as the themes pass drafted them, and you may rework them after a playtest (question 2, answered).
    - The Limitanei keeps "at most two more", and a ship in a coastal town counts (question 3).
    - Nothing shows the institutions a seat holds after the turn they are met (question 4).
    - The Res Gestae reads "at most +28%", because seven commissions at +4% reach +28% (question 5, reading 19). The themes pass wrote "at most +30%".
    - Rally to the Standard moves only military units, and its text says "a military unit" (question 6, reading 23).
- **Ruled 2026-10-21** (your comments on the themes pass, written into the rows above). Your words and the readings are in section 11 of `docs/plans/dominion-themes.md`. You said: *"ok i've commented on the dominion pass, lets begin working on it."*
  - **The themes pass is on the sheet.** Its new cards are `add` rows, and its changes to live cards are `modify` rows with the target text. The build plan builds them in batches D10 to D15. Batch D9 built five: Clear the Frontier, Battle Honours, The Camp Chaplains, The Bards' Praise and The Champion's Portion. Batch D10 built eleven: The Acropolis, The Castle Demesne, The Spartan Discipline, The Ranks of Merit, The First Province, Take the City, The Naadam, The Taker of Cities, The Roll of Triumphs, The March Revenues and The Tributary Kings. Batch D11 built six: Man the Walls, The Ovation, The Res Gestae, The Border Fortress, The Chosen Men and The Captured Marvel. Meeting any commission, of either of your decks, now counts for The Ovation and The Res Gestae. Batch D12 built five: The Gathering Host, The Soldier-Farmers, Harry the Border, Rally to the Standard and The Marshalate. Since D12 no card pays on a resource you cannot see yet, so The Quartermasters and The March Revenues read only the strategic resources you can see. Batch D13 built The Limitanei: a town works one more hex for each military unit standing in it, ships included, at most two more. The extra hexes eat no food, and they are chosen after the citizens' hexes at the next assignment. Batch D14 built the three drafts as the themes pass wrote them, for you to rework after a playtest. The Longships: at the end of your turn, each of your ships pillages the first enemy improvement on land beside it, a full pillage, and Double Time makes it two. The Relay Stations: a military unit that starts its turn in one of your towns joined to your capital by road has +2 movement for that turn. The capital itself does not count, because it is what the other towns are joined to. Circumvallation: a rival town makes no production while it builds a Magnum Opus, is under siege, and one of your units stands beside it. The town's own breakdown names the card. Batch D15 built The Upstarts: your military units gain +3 strength, in attack and in defence, against the units and towns of an empire that knows more technologies than you, and never against barbarians.
  - **Ten cards are cut** and their data rows are retired: Muster Rites, The Funeral Games, The Armourers' Secret, The Marshals, The Marching Camps, The Open Muster, The Cleruchy, The Valetudinaria, The State Forges and The Keshik. Their old text, and why each was cut, are in `docs/plans/dominion-list-proposed.md`, "Cut by this pass". A save that holds one keeps it.
  - **The Servian Reforms** left the Tier I Doctrines by your edit, and its data row is retired.
  - **Clear the Frontier and Battle Honours trade rewards** and keep their names. Clearing two camps now brings a great general from a draft. Killing six units (not ten) now brings two citizens and the best melee unit you can build in your capital.
  - **The Camp Chaplains** also grants faith when you lose a unit, which was The Funeral Games' job. **The Bards' Praise** grants 30 culture for a camp, not 15.
  - **Your comments also revised** four sheet cards (The Gathering Host, which now grows only for military units, The Soldier-Farmers, Take the City and The Captured Marvel) and four new cards (The Ranks of Merit, Harry the Border, The First Province and The Border Fortress).
  - **Eight commissions leave an institution,** a reward that lasts for the rest of the game and takes no chair: The Ranks of Merit, Harry the Border, The First Province, Take the City, The Border Fortress, A Victor's Peace, The Chosen Men and The Captured Marvel.
  - **Every recommendation of the themes pass's section 10 stands** (a reading, to confirm), feature C included. So Rally to the Standard is now automatic and rare, as the captains' capstone, and The Acropolis and The Marshalate are reworked.
  - **The Soldier-Scholars** (shared with Scientific, typed Military, a reading to confirm) is on the shared table; Scientific batch S9 built it.
- **Answered in your pass of 2026-10-16** (written into the rows above):
  - **The Longbowmen** gain +5 culture each time they attack from range.
  - **Interior Lines:** the +4 is for a unit that has not moved this turn.
  - **The Steppe Confederacy** lifts the border freeze, not a population rule: negative authority no longer stops your borders growing.
  - **The Strategoi** doubles only the great generals' +3 strength aura. The rally you asked about is "Rally the Army", a general's one-time act: the general is spent, and your units within two hexes gain +3 strength for five turns. It does not double.
  - **The Call to the Spear and The Muster of the Fields** become one card shared by Dominion and Expansionist (*"Have these two be a single card that's shared between the two decks."*). The built Expansionist card is kept and is now in the shared table, and The Call to the Spear leaves Tier I.
  - **A unit that starts as a Veteran counts as earning a rank,** so The Drill Masters and The Devshirme feed Honours of the Legion, The Veterans' Roll and The Campaign Annals.
  - **The Engineer Corps** stays as it is.
  - **The Imperial Examinations and Triumphal Arches** are retired. The Magisterial sheet cut them too, and Magisterial batch MG1 retired both rows. A save that holds one keeps it.
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
  - The tier-38 governments were meant for a fifth age and are left unimplemented (*"just leave the last tier as unimplemented"*). Since 2026-10-17 Tier IV's cards open at draft 26, with the tier-26 governments (`docs/flags.md` (ccccccc) and (ddddddd)).
  - Interior Lines takes Machinery's road rule at Machinery's size: a step along a road costs 40% less movement. Machinery's discount is 40%, not 50%. The two add, so with both a road step costs a fifteenth of a move instead of a fifth.
  - The merged levy keeps The Call to the Spear's floor of five citizens.
  - Divine Mandate counts Civic Orders, and the Chiefdom keeps its old chairs (`docs/plans/doctrines-governments-chairs.md`). Batch DS9 (2026-11-11) later made all three of the Chiefdom's chairs Wildcard chairs.
  - The Fyrd is removed for now (*"let's remove the fyrd for now"*): beside The Muster of the Fields and its five-citizen floor, it added nothing.
  - The five cards that wait on a UX decision stay deferred, for you to rework later (*"Defer all 5 UX cards, i'll probably rework them later"*): The Longships, The Relay Stations, Rally to the Standard, Circumvallation and Mercenary Contracts.
  - Doctrine tiers pair one to one with the four government tiers left: Tier I with tier 4, Tier II with tier 10, Tier III with tier 18 and Tier IV with tier 26 (29 until 2026-10-17), as Doctrine pools were paired before the decks rework (*"2 yes"*). Each Doctrine arrives one card tier earlier than the table it sits in.
  - A unit raised by The General Levy counts as gained (*"conscripts should pay cards that pay 'gaining a unit'"*), so Muster Rites, The Art of War and Rites of Passage pay for it. It still does not count as trained.
  - A second declaration of war restarts The Arrière-ban's ten turns instead of stacking (*"just have arriere-ban refresh after declaring war twice instead of stacking"*).
  - Walled Towns counts any defensive building, the Palisade included (*"have it read defensive buildings (to include palisades and other defensive structures)"*).
  - The Farming Garrisons also gives fortified units +2 strength, and becomes a card shared by Dominion and Expansionist, with The Frontier Militia (your notes on both sheets). Both are now in the shared table.

# Deck simplification and governments: the spec of record (2026-11-10)

This file is what the build batches DS1 to DS9 and G1 are built from. The user reviewed the proposal on the review page (https://claude.ai/artifact/3f88ASee5LW3q3Xjx3QRAZ), left 24 comments on 2026-11-10, approved the governments in chat, and then called the deck simplification and the governments rework finalized. `docs/flags.md` item (hhhhhhh) records the rulings and the readings.

## Why

The user, 2026-11-10: *"the cards require too much reading at the moment, and some of the tier 0 cards feel a bit too fancy for me currently. THe doctrines already hold the 'unique,fun ability' funciton in the game, and i think the decks could overall be simpler. I'd like for it to feel like slay the spire, cards with simple abilities but interesting flexible uses."*

## Rules of the pass

- A card has one effect and at most one condition, in one line.
- A Tier 0 card is a plain yield on a thing the player already has or does.
- A common or uncommon Order has no drawback. Seven rares keep theirs.
- No card reads how long a thing has stood, what a rival knows, or a treasury threshold.
- Each deck keeps one or two "for every X this game" counters.
- No card raises free units on a timer.
- The Doctrines do not change.
- A number in a changed row is a first guess. Shape comes first.

## Keywords

The user, 2026-11-10: *"lets change 'grower' to scaler. The keyword should show on the card, and can be moused over regardless of how mnay times they've seen it."*

Four keywords are printed on the card. A player can point at a keyword at any time to read its rule.

- **Commission:** the card sits in a chair until its goal is met. Then it pays its reward and leaves the chair. A lasting reward lasts for the rest of the game. Card text: "Goal: … Reward: …".
- **Charter:** the card takes no chair. It unlocks a thing, and that thing carries its own rules on its own page.
- **Scaler:** the card gains a little each time a thing happens while it is seated. The card face shows its current value. Card text: "Gains +1 … each time …".
- **Boon:** the card pays once, when it is drafted, and needs no chair. Card text: "On draft: …".

Where a new text below begins with "Charter." or "Boon.", that word is the keyword. Batch DS8 decides whether the data text keeps the word or the card frame prints it. Until DS8, keep the word in the text.

## Governments (approved 2026-11-10)

The user: *"divine mandate: Every town with a wonder gains +20% culture and +20% faith. Let's make the tier 26 governments 30%, but otherwise approved."* The tier 4 lines are the user's own examples.

| Tier | Government | Military | Economic | Civic | Wildcard | Signature |
|---|---|---|---|---|---|---|
| 4 | War Chief | 2 | 1 | 1 | 1 | Units gain +4 strength. Kills grant 10 science and 10 culture. |
| 4 | Council of Elders | 1 | 2 | 1 | 1 | Every town gains +2 food and +1 renown. |
| 4 | Priest-King | 1 | 1 | 2 | 1 | Every town gains +1 science and +1 faith. |
| 10 | Tyranny | 3 | 1 | 1 | 1 | +5 authority. Units cost 30% less upkeep. |
| 10 | Republic | 1 | 3 | 1 | 1 | +1 trade route. Towns gain +1 culture for every 5 citizens. |
| 10 | Aristocracy | 1 | 1 | 3 | 1 | Every town gains +2 science. Great people cost 15% less renown. |
| 18 | Imperium | 3 | 2 | 1 | 2 | Units gain +1 movement. Towns you captured gain +10% science and culture. |
| 18 | Merchant League | 1 | 3 | 2 | 2 | +1 trade route. Your trade routes pay 50% more. |
| 18 | Divine Mandate | 2 | 1 | 3 | 2 | Every town with a wonder gains +20% culture and +20% faith. |
| 26 | The Sultanate | 4 | 2 | 2 | 3 | Your Military cards are 30% stronger. |
| 26 | The Estates | 2 | 4 | 2 | 3 | Your Economic cards pay 30% more. |
| 26 | The Curia | 2 | 2 | 4 | 3 | Your Civic cards pay 30% more. |

- **Tier 10 has six chairs.** The chair counts by tier are 3, 5, 6, 8 and 11.
- **Aristocracy replaces Theocracy.** The Theocracy row is retired and kept for saves.
- **The tier 26 line is a new effect shape:** every number a seated card of that type gives is 30% larger, rounded to the nearest whole number, and never less than 1 larger where the base is 1 or more. It applies to yields, percentages and strength. If this reading cannot be built cleanly, stop and report; do not bend it.
- **Readings taken without a ruling:** the War Chief's kill reward is a flat 10 science and 10 culture, and The Curia keeps its name.
- The Chiefdom's own row does not change in batch G1. Batch DS9 changes its chairs.

## Changes outside the cards

- **The Chiefdom's three chairs are all Wildcard** (batch DS9). This is a reading taken without a ruling: the user called the pass finalized and did not rule on this point by name.
- **A charter technology costs the ordinary price** (batch DS9). The two cards that lowered that price are cut.
- **The Second Reading is dealt in Tier 0 and in Tier I** (the user's comment; batch DS9). No card is in two tiers today.

## How to read the tables

- A card that is not in a table does not change.
- **cut:** the row gets `retired: true`, leaves every pool and keeps its body for saves. On the deck sheet it moves to "Retired rows".
- **move:** the row's tier changes. The Tier column says from which tier to which.
- **reword:** the same effect, new text.
- **simplify:** a clause or a number is removed. The effect list changes to match the new text exactly.
- **change:** a different effect.
- **new:** a new row. The type is in brackets before its text. A new card is common unless its text says otherwise.
- A row may carry a mark and a move together.
- The Note column is the reason shown to the user. It is not part of the card.
- "Your comment of 2026-11-10" marks a row the user wrote or changed on the review page. Those rows outrank the rest.
- If a new text needs an effect shape the game does not have, the batch does not bend a near fit. It keeps the old row live, reports the card, and the orchestrator decides (CLAUDE.md, "always defer, never bend").

## Batches

Each batch updates the deck sheets (`docs/decks/*.md`, the specs of record that the sync tests read) in the same pass as the data.

- **DS1:** every cut and every move, in the six decks and the shared file. No text changes.
- **G1:** the governments.
- **DS2 to DS7:** the reword, simplify, change and new rows, one deck a batch in the order Dominion, Expansionist, Commerce, Devotion, Scientific, Magisterial. A shared card goes with the first of its two decks in that order.
- **DS8:** the four keywords on the card face, each with a tooltip that is always available.
- **DS9:** the three changes outside the cards.

## The tables

### Dominion (129 Orders become 73)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| Battle Honours | cut | 0 |  | A commission with two rewards. Tier 0 keeps plain cards. |
| Blood Brothers | move | 0 to I |  | A rule card. Tier 0 keeps plain cards. |
| Blooded Spears | simplify | 0 | Military units gain +2 strength. | The barbarian clause goes. |
| Commission: Clear the Frontier | reword, move | 0 to I | Goal: clear 2 barbarian camps. Reward: choose a great general. | Tier 0 keeps plain cards. Same effect. The card frame carries the standing rules. |
| Commission: Man the Walls | cut | 0 |  | Tier 0 keeps plain cards. Sword and Plough already rewards garrisons. |
| The Armed Colony | cut | 0 |  | Three clauses on one card. Doctrine candidate. |
| The Bards' Praise | simplify | 0 | Killing a unit grants culture equal to its strength. | Two effects. The card keeps one. |
| The Camp Chaplains | cut | 0 |  | Rites of Passage (shared) is the deck's early faith. |
| The Campaign Annals | cut | 0 |  | Honours of the Legion pays for ranks at Tier I. |
| The Champion's Portion | cut | 0 |  | The third kill reward in one tier. The General Staff gives general renown. |
| The Drill Grounds | cut | 0 |  | A timer to track. The Training Cadre does this job at Tier I. |
| The Garrison Captains | cut | 0 |  | Your comment of 2026-11-10. |
| The Gathering Host | reword, move | 0 to I | Gains +1 science and +1 culture each time you gain a military unit. | Same effect. The card frame carries the standing rules. One scaler in Tier 0 is enough (The Captured Arms). |
| The Hunting Grounds | cut | 0 |  | Two effects that do not belong together. |
| The Outriders | simplify | 0 | Clearing a barbarian camp grants 10 production to every town. | Two effects. The card keeps one. |
| The Scaling Ladders | cut | 0 |  | Age 1 has few sieges. Combat cards were 69% of Dominion's Tier 0 offers. |
| The Spear Makers | simplify | 0 | +25% production toward military units. | No age clause. |
| Commission: Harry the Border | cut | I |  | Pillage goes down to a few cards. |
| Commission: The First Province | reword | I | Goal: capture a town. Reward: towns you captured gain +5 food and +5 gold. | Same effect. The card frame carries the standing rules. |
| Commission: The Ranks of Merit | cut | I |  | Its reward is Honours of the Legion again. |
| The Acropolis | cut | I |  | The Castle Demesne is the citadel card of this tier. |
| The Art of War | cut | I |  | The Gathering Host does this job as a scaler. |
| The General Staff | change | I | Each Barracks gives +5 production and +2 general renown. | Your comment of 2026-11-10. I read "+5" as the production. Tell me if you meant the renown. |
| The King's Levy | cut | I |  | It puts free units on the map on a timer, and each one needs orders every turn. The Sword of State (shared) is the one-time version. |
| The Ovation | cut | I |  | It reads commissions, and the deck now has fewer of them. |
| The Pacified Marches | reword | I | +1 authority and +5 culture for each barbarian camp you have cleared, at most +8 and +40. | Same effect. |
| The Sack | cut | I |  | Too narrow to matter in most games. Triumphs pays for captures. |
| The Satraps | cut | I |  | Too narrow to matter in most games. |
| The Soldier-Farmers | cut | I |  | It asks for two separate things at once. |
| The Soldiers' Purse | cut | I |  | The player must track each unit's rank against its upkeep. |
| The Spartan Discipline | cut | I |  | The Spear Makers does the same with no drawback. |
| Walled Towns | cut | I |  | Stockpiles (Tier II) is the defensive-building card. |
| War Foundries | simplify | I | Towns with a Barracks gain gold equal to 30% of their production. | Two effects. The card keeps one. |
| Armoury Guilds | cut | II |  | Too narrow to matter in most games. |
| Commission: Take the City | reword | II | Goal: capture a city of 8 or more citizens. Reward: each city you capture grants 250 science and 250 culture per age. | Same effect. The card frame carries the standing rules. |
| Commission: The Border Fortress | reword | II | Goal: plant a citadel. Reward: citadels gain +2 food and +2 production. | Same effect. The card frame carries the standing rules. |
| Double Time | cut | II |  | The player must know which cards are timers. Doctrine candidate. |
| Hegemony | simplify | II | Towns you captured cost 1 less authority. | Two effects. The card keeps one. |
| Riders of the Steppe | change | II | Pillaging costs your mounted units one less movement point. | Your comment of 2026-11-10. The card keeps its pillage half, not its zone of control half. |
| Siege Works | simplify | II | Siege units gain +4 strength against towns. | Two effects. The card keeps one. |
| Spear-won Land | simplify | II | +3% production and science for each town you have captured. | No cap. Conquest limits itself. |
| Spoils of War | change | II | Pillaging a hex grants 50 gold and 15 culture. | Your comment of 2026-11-10. |
| The Castra | cut | II |  | Two effects. The card keeps one. The Farming Garrisons (shared) and The Citadel Works cover both halves. |
| The Citadel Works | change | II | Citadels gain +5 science and +3 general renown. | Your comment of 2026-11-10. |
| The Conscription Rolls | cut | II |  | It puts free units on the map on a timer, and each one needs orders every turn. |
| The Fabricae | cut | II |  | It asks for two separate things at once. |
| The Funeral Oration | cut | II |  | The Glorious Dead (Tier IV) is the war weariness card. |
| The Hall of the Slain | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Longbowmen | change | II | Ranged units gain +2 strength and +1 range. | Your comment of 2026-11-10. Master Bowyers, a rare in this tier, also gives +1 range. |
| The Longships | cut | II |  | Pillage goes down to a few cards. |
| The Naadam | simplify | II | Pastures and camps gain +2 culture. | Happiness removed. Your note of 9/3: too much happiness. |
| The Provincial Census | cut | II |  | Too narrow to matter in most games. |
| The Relay Stations | cut | II |  | It asks for two separate things at once. |
| The Res Gestae | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Roll of Triumphs | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Sagas | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. Pillage goes down to a few cards. |
| The Tactica | simplify | II | Great generals give 1 experience each turn to units beside them. | Two effects. The card keeps one. |
| Triumphs | cut | II |  | Your comment of 2026-11-10. |
| War Reparations | cut | II |  | Triumphs and The Victory Mint pay for captures. |
| Commission: A Victor's Peace | reword | III | Goal: take two cities from an empire, then make peace with it or destroy it. Reward: one more Wildcard chair. | Same effect. The card frame carries the standing rules. |
| Commission: The Chosen Men | reword | III | Goal: have three units become Elite. Reward: your Elite units ignore enemy zone of control. | Same effect. The card frame carries the standing rules. |
| Danegeld | cut | III |  | Pillage goes down to a few cards. |
| Interior Lines | simplify | III | Roads cost your units 40% less movement. | Two effects. The card keeps one. |
| Pax Romana | simplify | III | Towns you capture are pacified at once. | Two effects. The card keeps one. Hegemony has the authority half. |
| Rally to the Standard | cut | III |  | Three conditions to read. |
| Reserve Officers | cut | III |  | Two modes, four numbers. |
| The Arrière-ban | cut | III |  | The best play is a dull repeated action. Declare war, make peace, declare again. |
| The Bakufu | simplify | III | A great general standing in a town gives it +25% science and culture. | Two effects. The card keeps one. |
| The Board of Ordnance | cut | III |  | War only, with two conditions. |
| The Chevauchée | cut | III |  | Pillage goes down to a few cards. |
| The Devshirme | cut | III |  | Three conditions to read. Doctrine candidate. |
| The Limitanei | simplify | III | A garrisoned town works one more hex. | One number less. |
| The March Revenues | cut | III |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Mural Crown | change | III | Gaining a great person grants 200 science and culture for each great general you have gained. | Your comment of 2026-11-10. |
| The Plunder Trains | cut | III |  | Pillage goes down to a few cards. |
| The Regimental Schools | simplify | III | Each garrisoned unit gives its town +3 science. | Two effects. The card keeps one. |
| The Siege Train | change | III | Siege units gain +1 movement, and +5 strength when defending. | Your comment of 2026-11-10. |
| The Yam | cut | III |  | Pillage goes down to a few cards. |
| Commission: Hold the Capitals | reword | IV | Goal: hold two rival capitals. Reward: a great general, and +25% production in every town for twenty turns. | Same effect. The card frame carries the standing rules. |
| Commission: The Captured Marvel | cut | IV |  | Hold the Capitals is the late conquest goal. |
| Commission: The Grand Campaign | reword | IV | Goal: capture three cities. Reward: a great general, and science and culture equal to ten times their population. | Same effect. The card frame carries the standing rules. |
| Imperium | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. Circumvallation is Dominion's late Opus card. |
| Spolia | cut | IV |  | Your comment of 2026-11-10. |
| The Grand Army | change | IV | Your capital gains +3 science and +3 culture for each military unit you have. | Your comment of 2026-11-10. It has no cap. |
| The Grand Coalition | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Harrying | cut | IV |  | Pillage goes down to a few cards. |
| The Legions' Labour | cut | IV |  | The best play is a dull repeated action. Train a unit, then disband it. |
| The Military Frontier | cut | IV |  | The Regimental Schools does this job. |
| The Nation in Arms | cut | IV |  | It puts free units on the map on a timer, and each one needs orders every turn. |
| The Praetorian Guard | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Proconsuls | simplify | IV | Captured towns with a garrison cost no authority. | Two effects. The card keeps one. |

### Expansionist (113 Orders become 74)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| Sweet Water | simplify | 0 | Tiles beside a river or lake gain +1 food. | Happiness removed. |
| The Fish Traps | reword, move | 0 to I | Charter. Workers may build fish traps on lake and coast tiles: +1 food and +1 production. | A new worker action. Tier 0 keeps plain cards. |
| The Naturalists | cut | 0 |  | The Mountain Observatories (shared) does this job. |
| The Patient Harvest | simplify | 0 | Towns keep 30% of their food when they grow. | The drawback goes, and the number is smaller. |
| The Woodland Bands | simplify | 0 | Your units ignore the movement cost of forest and jungle. | Two effects. The card keeps one. |
| The Work Gangs | cut | 0 |  | A levy before Levy of the Land teaches the levy. |
| Commission: Break the Sod | change | I | Goal: work 12 improved tiles. Reward: farms gain +1 food. | The old reward changed how old your works count as. |
| Dark Earth | simplify | I | Farms that have stood 20 turns gain +2 food. | One step, not two. |
| Levy of the Land | reword | I | A town may spend a citizen for production equal to the food it took to grow. Once every five turns. | Same effect. Your note of 10/12: "soooo good". |
| Outposts | reword | I | Workers may plant an outpost on a wild tile near your border. It claims its hex and the ring around it. | The detail moves to the outpost's own page. |
| Six Gardens | cut | I |  | Your note of 10/12: weak. The Tended Country is the tended pay-off. |
| The Aediles | reword | I | Gains +1 production and +1 culture each time you finish a public work. | Same effect. The card frame carries the standing rules. |
| The Burhs | simplify | I | Towns gain +3 defence for each defensive building. | Two effects. The card keeps one. |
| The Burning Season | cut | I |  | A third tended work with its own terrain rule. Two are enough. |
| The Commons | cut | I |  | Happiness. Your note of 9/3. |
| The Forest Keepers | cut | I |  | It reads how long a thing has stood, which the player must track. |
| The Gleaners | reword | I | After a town levies a citizen, it gains +3 food for ten turns. | Same effect. |
| The Grain Census | reword | I | Gains +1 production and +1 gold each time a town grows past its largest size. | Same effect. The card frame carries the standing rules. |
| The Labour Feasts | cut | I |  | A rider on a levy with three conditions. |
| The Land Hunger | simplify | I | Towns build settlers 25% faster. | The condition and the second effect go. |
| The Local Census | reword | I | A town working four improved tiles costs 1 less authority. | Same effect. |
| The Marl Pits | cut | I |  | The player must track which farm got which bonus. |
| The Master Builders | cut | I |  | Too narrow to matter in most games. |
| The Public Fountains | cut | I |  | Happiness. Your note of 9/3. |
| The Quiet Provinces | cut | I |  | The Sovereign Writ (Tier III) is the spare authority card. |
| The Three Sisters | reword | I | Farms beside a plantation or pasture gain +2 food and +2 production. | Same effect. |
| The Wild Orchards | reword | I | Charter. Workers may tend a forest or jungle tile into an orchard: +1 food and +1 gold. | Same effect. The card frame carries the standing rules. |
| Tinkers' Guild | reword | I | Workers gain +1 charge. | Same effect. |
| Migration | cut | II |  | It acts on a timer with three conditions. Doctrine candidate. |
| Provincial Councils | simplify | II | Towns joined to your capital by road cost 1 less authority. | Two effects. The card keeps one. |
| The Burghers | cut | II |  | It reads the guild bar, which few players watch. |
| The Engineers' Yards | simplify | II | Improvements beside a manufactory gain +2 production. | Two effects. The card keeps one. |
| The Grain Dole | simplify | II | Towns of 10 or more citizens gain +4 happiness. | Two effects. The card keeps one. |
| The Great Households | reword | II | Each town gains +2% production for each citizen, at most +30%. | Same effect. |
| The Labour Rolls | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Many Hands | cut | II |  | Too narrow to matter in most games. |
| The Milestones | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Old Fields | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. It reads how long a thing has stood, which the player must track. |
| The Teeming Realm | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Terraces of Moray | change | II | A levy also grants science equal to half its production. | The old card was a second kind of levy, for towns beside a mountain only. |
| The Watercourses | simplify | II | Irrigated farms gain +2 production. | The relay rule goes. |
| The Waterworks | simplify | II | Aqueducts give +3 happiness. | Two effects. The card keeps one. |
| Veteran Colonies | reword | II | A military unit in one of your towns may retire. The town gains a citizen. | Same effect. |
| Watch and Ward | cut | II |  | It needs a card that raises units by levy. |
| Old Workings | simplify | III | Mines, quarries and lumber mills gain +3 production. | It reads how long a thing has stood, which the player must track. |
| Seasonal Levies | simplify | III | After a town levies a citizen, it gains +60% food for ten turns. | The second limit goes. |
| The Coming of the Water | cut | III |  | Too narrow to matter in most games. |
| The Cura Aquarum | cut | III |  | A "counts as" rule. Doctrine candidate. |
| The Freedom of the City | simplify | III | The first time a town reaches 15 citizens, it gains production equal to forty times its population. | One threshold, not two. |
| The Hallowed Woods | cut | III |  | The Old Songs (Tier I) pays culture for wild tiles. |
| The Long Tending | simplify | III | Tended tiles gain +3 food. | It reads how long a thing has stood, which the player must track. |
| The Mountain Schools | cut | III |  | Two effects. The card keeps one. The Mountain Terraces is the mountain card of this tier. |
| The Opening of the Roads | cut | III |  | A one-time lump. One-off grants paid 0.39 yield a turn in the bot games. |
| The Polders | reword | III | Workers may build a polder on a coast tile beside three of your land tiles. It yields as a farm. | Same effect. |
| The Raising of the Land | cut | III |  | A chain of three things must line up. |
| The Royal Forests | cut | III |  | A threshold on one improvement. |
| The Slack Season | cut | III |  | A timer on a timer. |
| The Sovereign Writ | reword | III | Spare authority's bonus has no ceiling. | Same effect. |
| The Stationes | cut | III |  | It asks for two separate things at once. |
| The Tax Rolls | cut | III |  | It waits on a world event. |
| The Topping Out | cut | III |  | Plenty and The Freedom of the City are the lump cards. |
| The Trained Bands | cut | III |  | It needs a card that raises units by levy. |
| The Water Courts | cut | III |  | An irrigation rule the player must trace on the map. |
| The Wide Country | reword | III | Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 25% faster. | Same effect. The card frame carries the standing rules. |
| The Corvée | simplify | IV | Your towns may levy a citizen toward the Magnum Opus. | Five clauses become one. The levy's own rules apply. |
| The Domesday Survey | reword | IV | Goal: own 120 hexes and work 40 improved or tended tiles. Reward: each town gains +1 science for each improved or tended tile it works. | Same effect. The card frame carries the standing rules. |
| The Encroaching Fields | cut | IV |  | Four conditions. The Great Migration is the late border card. |
| The Garden of the World | simplify | IV | Tended tiles gain +2 food, +1 production and +1 culture. | Two effects. The card keeps one. |
| The General Levy | simplify | IV | Your towns may spend a citizen to raise a melee unit. At war, they may do it every turn. | The upkeep clause goes. |
| The Great Aqueducts | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. The Imperial Highways is Expansionist's. |
| The Great Migration | reword | IV | Every ten turns, each foreign town near your border loses a citizen to your nearest happier town. | Same effect. |
| The Heartland | cut | IV |  | The goal has three numbers to check. |
| The Inheritance of Fields | cut | IV |  | It reads how long a thing has stood, which the player must track. |
| The Keeps | reword | IV | Workers may build one Keep in each town. A Keep gains the yields of every tile around it. | The strength clause goes. |
| The Master of Works | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Public Good | cut | IV |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Two Harvests | cut | IV |  | A "counts as" rule. The Doctrine Arcadia does this job. |

### Commerce (77 Orders become 70)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| Land Speculation | simplify | 0 | Buying a hex grants culture equal to half the gold paid. | The resource condition goes. |
| Salt Tithes | simplify | 0 | +3 gold for each different luxury you have improved. | Two effects. The card keeps one. |
| The Assayer's Rule | cut | 0 |  | The player cannot tell at a glance which tiles count. |
| The First Caravan | new | 0 | (Economic) Boon. On draft: gain a caravan. | An opener that points at routes. |
| The Map Sellers | cut | 0 |  | A counter with a divisor and a cap. |
| The Mineral Trade | simplify | 0 | Mines and quarries gain +1 gold. | The drawback goes, and the number is smaller. |
| The Nest Egg | change | 0 | Your capital gains +1 culture for every 4 gold you make each turn. | It reads income, not the treasury, so it no longer works against the purchase cards. |
| The Pack Trail | new | 0 | (Economic) Your trade routes give +2 gold. | Commerce's identity is routes, and Tier 0 has no route card. |
| Travellers' Letters | simplify | 0 | Your capital gains +2 science and +2 culture for each empire you have met. | One number, not two. |
| Civic Receipts | reword | I | Buying a building grants culture equal to 15% of the gold paid. | Same effect. |
| Financed Industry | simplify | I | Towns gain production equal to 20% of their gold. | The drawback goes, and the number is smaller. |
| Letters of Credit | reword | I | Your treasury may fall to −150 with no penalty. | Same effect. |
| Private Patronage | simplify | I | Towns gain +25% gold. | The drawback goes, and the number is smaller. |
| The Planters' Charter | reword | I | Charter. Unlocks the Plantation House, a building you buy with gold. | Same effect. The card frame carries the standing rules. |
| The Strongbox | change | I | Gains +1 science and +1 culture each time you buy something with gold, up to +15. | It paid you to hold 300 gold. Now it pays you to spend, as the rest of the deck does. |
| Bills of Exchange | change | II | Every town gains +1% production for every 10 gold you make each turn, at most +30%. | It reads income, not the treasury, so it no longer works against the purchase cards. |
| Commission: The Great Fair | reword | II | Goal: have domestic routes arrive in four of your towns. Reward: two more trade routes. | Same effect. The card frame carries the standing rules. |
| Corner the Market | reword | II | Goal: hold four copies of one luxury. Reward: +2 happiness for each luxury you hold two or more copies of. | Same effect. The card frame carries the standing rules. |
| Foreign Procurement | simplify | II | You may buy units without their strategic resource. | The drawback goes, and the number is smaller. |
| Mining Districts | reword | II | Mines gain +2 gold and +2 science for every two mines beside them. | Same effect. |
| Numidian Cavalry | simplify | II | Charter. Unlocks Numidian Cavalry: a Horseman with +1 strength for each luxury you hold. | The Silk Road half-count goes. |
| Provisioning Contracts | move | II to I |  | Tier I had no route card. |
| Royal Assays | cut | II |  | Too narrow to matter in most games. |
| Strategic Exports | simplify | II | Your strategic resources supply twice as many copies. | Two effects. The card keeps one. |
| The Common Road | simplify | II | Your foreign routes give +3 gold, +3 science and +3 culture. | The host's share goes. |
| The Exchange | simplify | II | +5% science and culture for each foreign empire your routes reach. | Two effects. The card keeps one. |
| The Foreign Factor | cut | II |  | The Factors' Houses does this job in one line. |
| The Hanse | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. The Factors' Houses pays for trading posts. |
| The Home Market | simplify | II | Towns that receive two domestic routes gain +30% food and production. | Two effects. The card keeps one. |
| The League of Cities | simplify | II | Towns that send a trade route gain +20% production. | Three clauses become one. |
| A Guild Commission | reword | III | Goal: buy five buildings with gold. Reward: a free great-person draft. | Same effect. The card frame carries the standing rules. |
| Established Routes | cut | III |  | Its condition almost never happened in play. |
| The Capitulations | reword | III | Each foreign town with your trading post lends you a luxury you lack. | The "half value" clause goes. |
| The Chartered Metropolis | simplify | III | Towns that send three trade routes gain +35% food, production and culture. | The drawback goes, and the number is smaller. |
| The Commenda | cut | III |  | Too narrow to matter in most games. |
| The Lingua Franca | cut | III |  | One of the capped "for every X this game" cards. Each deck keeps one or two. |
| The Monopoly | simplify | III | For each luxury that only you hold, every town gains +5 gold and +3 culture. | Fewer numbers. |
| The Scholars' Roads | reword | III | Your routes give +50% science and culture. You run 2 fewer routes. | A rare keeps a short drawback. |
| The Strongroom | reword | III | Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury. | Same effect. The card frame carries the standing rules. The one card that pays you to hoard, with The Money Lenders. |
| Merchant Princes | reword | IV | You may buy great-person drafts with gold. | Same effect. |
| Money at Work | change | IV | Every town gains +1 science for every 20 gold you make each turn. | It reads income, not the treasury, so it no longer works against the purchase cards. |
| The Great Loan | reword | IV | Boon. On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns. | Same effect. The card frame carries the standing rules. |
| The Hired Garrison | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Merchant Works | simplify | IV | Towns building a wonder gain production equal to 25% of their gold. | The drawback goes, and the number is smaller. |
| The World's Fair | reword | IV | Goal: have trade routes to four empires. Reward: your trading post in each of their capitals. | Same effect. The card frame carries the standing rules. |

### Devotion (66 Orders become 64)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| First Rites | simplify, move | 0 to I | Shrines give +2 faith. | Two effects. The card keeps one. Your comment of 2026-11-10. |
| The Calling | change | 0 | Your capital gains +3 faith. | The old card turned itself off when you founded a religion. |
| The First Offering | new | 0 | (Civic) Boon. On draft: gain 25 faith. | Your comment of 2026-11-10. It buys a pantheon at the cost of a draft. |
| The Household Gods | new | 0 | (Civic) +2 faith in every town. | Your comment of 2026-11-10. |
| The Votive Lamp | new | 0 | (Economic) Gains +1 faith each time you finish a building. | A scaler that every plan feeds. |
| The Wayside Shrines | move | 0 to I |  | Your comment of 2026-11-10. |
| The Fast | reword | I | Charter. Unlocks the Rite of Fasting: for ten turns a town does not grow, and gains science and culture equal to its population. | Same effect. The card frame carries the standing rules. |
| The Founding Vows | reword | I | Goal: start two rites. Reward: 100 faith, and 40 food in your capital. | Same effect. The card frame carries the standing rules. |
| The Octave | reword | I | Your rites last 50% longer. | Same effect. |
| The Pilgrim Staff | new | I | (Civic) Spending faith grants culture equal to a fourth of it. | Faith spent is the deck's best quantity. Your comment of 2026-11-10. |
| The Rogations | reword | I | Gains +1 faith and +1 culture each time a town starts a rite. | Same effect. The card frame carries the standing rules. |
| Commission: The State Church | reword | II | Goal: hold six towns, all devout. Reward: devout towns cost 1 less authority. | Same effect. The card frame carries the standing rules. |
| Mission Houses | simplify | II | Your proclamations press 30% harder. | Two effects. The card keeps one. |
| The Cathedral Works | simplify, move | II to III | Cathedrals give +8 science and +2 happiness. | Two effects. The card keeps one. Your comment of 2026-11-10. |
| The Lives of the Saints | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. The Book of Life is Devotion's. |
| The Martyrology | reword, move | II to I | Gains +2 faith and +2 culture each time one of your units dies in battle. | Same effect. The card frame carries the standing rules. Tier I was thin. |
| The Mission | reword | II | Goal: convert two foreign cities. Reward: an Apostle and 300 culture. | Same effect. The card frame carries the standing rules. |
| The Old Holy Places | simplify | II | Holy Sites gain +3 faith and +3 culture. | It reads how long a thing has stood, which the player must track. |
| The Sabbath Laws | reword | II | Charter. Unlocks the Rite of the Sabbath: for ten turns a town builds nothing, and gains culture equal to its production. | Same effect. The card frame carries the standing rules. |
| The Saints' Fields | simplify | II | Holy Sites gain +5 food and +8 gold. | Two effects. The card keeps one. |
| The Settled Faith | simplify | II | Devout towns gain +15% science and culture. | The drawback goes, and the number is smaller. |
| The Spiritual Host | simplify | II | Military units gain +4 strength in land that follows your religion. | Two effects. The card keeps one. |
| The Votive Gifts | reword, move | II to I | Towns may spend faith to add production to what they are building. Not wonders. | A way to spend faith early. Tier I was thin. |
| The Conversion of Kings | reword | III | Goal: convert a rival's capital. Reward: a Prophet and 500 culture. | Same effect. The card frame carries the standing rules. |
| The Doctors of the Church | reword | III | Follower beliefs pay 150% more in your towns. | Same effect. |
| The Holy Inquisition | simplify | III | +35% faith. | Two effects. The card keeps one. |
| The Holy Summons | cut | III |  | It puts free units on the map on a timer, and each one needs orders every turn. The best play is a dull repeated action. |
| The Offered Stones | simplify | III | Buildings you bought with faith give +2 culture each. | Two effects. The card keeps one. |
| The Pious Masons | reword | III | Towns with a Cathedral may buy a half-built wonder with faith. | Same effect. |
| The Great Commission | reword | IV | Goal: more than half the world's cities follow your religion. Reward: devout towns gain +3 faith and +3 culture. | Same effect. The card frame carries the standing rules. |
| The Great Consecration | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Host Restored | reword | IV | Towns may spend faith to heal every unit of yours in land that follows your religion. | Same effect. |
| The Last Crusade | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Peace of God | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Tithe of Nations | simplify | IV | Gain 1 faith each turn for every two citizens in the world who follow your religion. | The Opus condition goes. |
| The Work of God | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. The Last Offering is Devotion's. |

### Scientific (78 Orders become 68)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| The Almanac | simplify, move | 0 to I | Libraries give +2 production. | Two effects. The card keeps one. Your comment of 2026-11-10. |
| The Apprentices | new | 0 | (Economic) Finishing a building grants 5 science. | It pays science for what every plan does. |
| The Bronze-Founders' Charter | simplify, move | 0 to I | Charter. Opens Casting: your spear and chariot lines gain +2 strength for good. | 59 words become 14. Tier 0 keeps plain cards. |
| The Herbalists' Charter | reword | 0 | Charter. Opens Herbals, which unlocks the Physic Garden: +2 science and +2 happiness. | Same effect. The card frame carries the standing rules. The building's rules are on the building. |
| The Kept Secret | cut | 0 |  | It reads what rivals know, which the player cannot see easily. |
| The Royal Tutors | change | 0 | +2 scholar renown each turn for each science building. | Your comment of 2026-11-10. |
| The Scribes | new | 0 | (Civic) +1 science in every town. | A plain opener, as The Grain Tribute is for Dominion. |
| The Astronomical Diaries | reword | I | Gains +1 culture and +1 production each time you complete a technology. | Same effect. The card frame carries the standing rules. |
| The Commonplace Book | cut | I |  | Charter technologies cost the ordinary price (see the system changes). |
| The Field Refits | cut | I |  | Too narrow to matter in most games. |
| The Forward Plans | simplify | I | You may build Universities before you know Scholarship. | It reads how long a thing has stood, which the player must track. |
| The Glassmakers' Charter | reword | I | Charter. Opens Optics, which unlocks the Specularium: +3 food, and +1 science for every two citizens. | Same effect. The card frame carries the standing rules. |
| The Librarians' Charter | reword | I | Charter. Opens Cataloguing, which unlocks the Mouseion: +4 scholar renown, and +2 culture for each empire building you hold. | Same effect. The card frame carries the standing rules. |
| The Long Study | cut | I |  | It reads how long a thing has stood, which the player must track. The Scribes' Hall is the Library card. |
| The Old Academy | simplify | I | Academies gain +3 food and +3 production. | It reads how long a thing has stood, which the player must track. |
| The Scholars' Fame | reword | I | Completing a technology grants scholar renown equal to a twentieth of its cost. | Same effect. |
| The Scribes' Hall | simplify | I | Towns with a Library gain +1 science for every four citizens. | Two effects. The card keeps one. |
| The Surveyors' Charter | reword | I | Charter. Opens Surveying: you may build the Aqueduct early, and workers may build the Qanat, which waters the farms beside it. | Same effect. The card frame carries the standing rules. |
| Enduring Institutions | simplify | II | Towns with an empire building gain +20% production. | It reads how long a thing has stood, which the player must track. |
| The Great Designs | cut | II |  | It reads what rivals know, which the player cannot see easily. The City Architects is the wonder card. |
| The Mechanists' Charter | reword | II | Charter. Opens Mechanics: catapults gain +1 range, and your archer line may move after it shoots. | Same effect. The card frame carries the standing rules. |
| The Paper-Makers' Charter | reword | II | Charter. Opens Papermaking, which unlocks the Scriptorium: +2 science, and +10% science beside an Academy. | Same effect. The card frame carries the standing rules. |
| The Physicians' Charter | simplify | II | Charter. Opens Medicine, which unlocks the Bimaristan: +25% food in its town. | The healing clause goes. |
| The Printers' Charter | simplify | II | Charter. Opens Printing, which unlocks the Aldine Press: +2 culture and +1 trade route. | The route yields go. |
| The Quiet Faculties | simplify | II | Towns working an Academy gain +25% food and +20% production. | The drawback goes, and the number is smaller. |
| The Royal Charter Commission | reword | II | Goal: complete a charter technology. Reward: a great scholar and 100 culture. | Same effect. The card frame carries the standing rules. |
| The Royal Readers | cut | II |  | It changes a price the player rarely looks at. |
| The Scholars' Guild | cut | II |  | Too narrow to matter in most games. |
| The Strategikon | simplify | II | Your units gain +4 strength within two hexes of an Academy. | Three anchors become one. |
| Greek Fire | cut | III |  | It reads what rivals know, which the player cannot see easily. |
| The Alchemists' Charter | simplify | III | Charter. Opens Chemistry: your warrior line gains +1 strength for each charter technology you know. | 62 words become 17. The Niter Beds go. |
| The Gunfounders' Charter | reword | III | Charter. Opens Gunfounding, which unlocks the Tophane: its town builds military units 25% faster, with +4 strength. | Same effect. The card frame carries the standing rules. |
| The Long Inheritance | cut | III |  | It reads how long a thing has stood, which the player must track. |
| The Nizamiyya | reword | III | Academies yield 50% more. | Same effect. |
| The School of Mines | cut | III |  | Too narrow to matter in most games. |
| The Studium Generale | cut | III |  | A "counts as" rule. Doctrine candidate. |
| The Breaching Batteries | simplify | IV | Each hit your siege units land on a city removes 5% of its Magnum Opus progress. | Two effects. The card keeps one. |
| The Foundation Stone | reword | IV | You may begin the Magnum Opus once Alchemy is half researched. | Same effect. |
| The Great Instrument | reword | IV | Goal: complete Alchemy. Reward: a tenth of the Magnum Opus. | Same effect. The card frame carries the standing rules. |
| The Lynx-Eyed Academy | reword | IV | Goal: hold four Academies. Reward: a great scholar, and 300 production in each town with an Academy. | Same effect. The card frame carries the standing rules. |
| The Military Engineers' Charter | reword | IV | Charter. Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points. | Same effect. The card frame carries the standing rules. |
| The Naval Gunners' Charter | reword | IV | Charter. Opens Naval Gunnery: your Gun Galleys gain +3 strength and may blockade a rival's port. | Same effect. The card frame carries the standing rules. |
| The Patent Office | cut | IV |  | Charter technologies cost the ordinary price (see the system changes). |
| The Walls of Learning | simplify | IV | Towns with a University gain +6 defence. | Two effects. The card keeps one. |

### Magisterial (71 Orders become 64)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| Civic Granaries | move | 0 to I |  | Your comment of 2026-11-10. |
| Commission: The Eighth Wonder | reword, move | 0 to I | Goal: complete a wonder. Reward: each wonder you hold gives +3 culture and +5 renown. | Tier 0 keeps plain cards. Same effect. The card frame carries the standing rules. |
| Master Masons | simplify | 0 | Finishing a culture building grants 30 production in its town. | Two effects. The card keeps one. |
| The Cornerstone | simplify | 0 | Towns build wonders 20% faster. | The condition goes. |
| The Repertory | cut | 0 |  | Your comment of 2026-11-10. |
| The Second Reading | change | 0 | The first reroll of each hand is free. | Your comment of 2026-11-10. The card is dealt in Tier 0 and in Tier I. No card is in two tiers today, so the build needs a small change. |
| Commission: The Roll of the Senate | reword | I | Goal: hold ten Orders. Reward: one more Wildcard chair. | Same effect. The card frame carries the standing rules. |
| The Guild of Masons | simplify | I | +30% production toward wonders. | The drawback goes, and the number is smaller. |
| The Laureate | simplify | I | Towns working a great-person work gain +5 culture and +3 science. | Three yields become two. |
| The Siting Masters | cut | I |  | Four terrain types and a cap. |
| The Wandering Muse | reword | I | Boon. On draft: gain a free great-person draft. | Same effect. The card frame carries the standing rules. |
| The Working Court | reword | I | Towns with a Monument gain production equal to 30% of their culture. | Same effect. |
| The Workshop at Olympia | change | I | +3 renown a turn for each wonder you hold. | Your comment of 2026-11-10. |
| Commission: The Patron's Gallery | reword | II | Goal: hold great-person works of three families. Reward: a free great-person draft and 200 culture. | Same effect. The card frame carries the standing rules. |
| The Custodians | cut | II |  | Too narrow to matter in most games. |
| The Envious Eye | reword | II | When a rival finishes a wonder you were building, your production moves to the next item. | Same effect. |
| The Gazetteers | cut | II |  | One of the capped "for every X this game" cards. Each deck keeps one or two. The Seven Sights and The Roll of Masters stay. |
| The Honoured Dead | reword | II | Gains +2 science and +4 production in your capital each time you spend a great person. | Same effect. The card frame carries the standing rules. The cap goes. |
| The Learned Patron | simplify | II | Towns with two culture buildings gain science equal to 15% of their culture. | The cap goes. |
| The Senate Charter | reword | II | Charter. Unlocks the Assembly Hall in your capital: +3 happiness and +30% production toward buildings. | Same effect. The card frame carries the standing rules. |
| Commission: The Golden Bull | reword | III | Goal: fill every Military, Economic and Civic chair with a card of its type. Reward: a Doctrine offer. | Same effect. The card frame carries the standing rules. |
| Commission: The Paradise Garden | reword | III | Goal: have a great-person work with three works or tended hexes beside it. Reward: every unowned hex within three hexes joins your borders. | Same effect. The card frame carries the standing rules. |
| Commission: The Wonder of the Age | reword | III | Goal: put 1,500 production into wonders. Reward: 250 culture and one more Wildcard chair. | Same effect. The card frame carries the standing rules. |
| The Cabinet of Curiosities | reword | III | Boon. On draft: gain a random card of your tier from a deck you do not hold. | Same effect. The card frame carries the standing rules. |
| The Living Canon | cut | III |  | It reads legacy families, which few players track. |
| The Wonder Commonwealth | simplify | III | Towns holding a wonder gain +35% production and food. | Two effects. The card keeps one. |
| Commission: The Ideal City | reword | IV | Goal: have one town hold two wonders and work three great-person works. Reward: that town gains +25% culture, science and production. | Same effect. The card frame carries the standing rules. |
| The Bulwark of Marvels | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. |
| The Grand Retrospective | reword | IV | Boon. On draft: gain 20 culture, science and production for each wonder, great-person work and Order you hold. | Same effect. The card frame carries the standing rules. |
| The Last Commission | reword | IV | Spending a great person adds 150 production to your Magnum Opus. | Same effect. |
| The Magister's Court | cut | IV |  | Tier IV keeps one Magnum Opus card of this kind per deck. The Universal Library is Magisterial's. |
| The Pull of the Masters | reword | IV | Each turn, each great-person work takes one unworked hex beside it from a rival town. | Same effect. |

### Shared cards (70 become 53)

| Card | Mark | Tier | New text | Note |
|---|---|---|---|---|
| Illuminated Treatises | change | 0 | Libraries give +1 culture. Monuments give +1 science. | It asks for two separate things at once. Now each building pays without the other. |
| Market Gardens | change, move | 0 to II | Hexes with a road gain +1 gold. | Your comment of 2026-11-10. The Commerce Doctrine The Turnpike Trusts gives the same +1 gold, so the two add up. |
| The Ambarvalia | simplify | 0 | Each town gains +1 faith for every two improved tiles. | Two effects. The card keeps one. |
| The Frontier Militia | reword | 0 | Each town you found starts with a melee unit. | Same effect. |
| The Holy Spring | reword | 0 | Towns beside a mountain or a lake gain +2 faith and +1 culture. | Same effect. |
| The Merchant Shrines | simplify | 0 | Towns working an improved luxury gain +2 faith. | Two effects. The card keeps one. |
| Cloister Schools | cut | I |  | It asks for two separate things at once. The Monastery Libraries does this job. |
| Field Academies | simplify | I | Your first kill each turn grants 25 science. | Two effects. The card keeps one. |
| Garden Cities | simplify | I | Towns with a Monument gain +1 culture for every three wild tiles they work. | Two effects. The card keeps one. |
| Hydraulic Schools | cut | I |  | It asks for two separate things at once. |
| Military Colonies | cut | I |  | Too narrow to matter in most games. |
| The Barbarian Frontier | reword | I | Clearing a barbarian camp claims its hex and the unowned hexes around it. | Same effect. |
| The Exchange of Discoveries | simplify | I | Mines and quarries on a resource gain +2 science. | Two effects. The card keeps one. |
| The Farming Garrisons | simplify | I | Hexes with a fortified unit gain +1 food and +1 production. | Two effects. The card keeps one. |
| The Flood Festival | cut | I |  | It names one card's action (The Burning Season), which is cut. |
| The Muster of the Fields | reword | I | Towns of 5 or more citizens may spend a citizen to raise a melee unit. | The levy's own rules apply. |
| The Priest-Astronomers | reword | I | Your capital gains +2 science and +2 faith for each town keeping a rite. | The cap goes. |
| The Sacred Host | simplify | I | Kills grant 15 faith. | Two effects. The card keeps one. The Shrine Guards sells units for faith. |
| The Schoolmen's Charter | reword | I | Charter. Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | Same effect. The card frame carries the standing rules. |
| The Standing Army | simplify | I | Garrisoned units cost no upkeep. | Two effects. The card keeps one. |
| The Sword of State | reword | I | Boon. On draft: gain the best melee unit you can build. It costs no upkeep. | Same effect. The card frame carries the standing rules. |
| Books from the Ships | cut | II |  | It reads what rivals know, which the player cannot see easily. |
| Convert It or Tax It | cut | II |  | Two modes on one card. |
| Examinations of State | simplify | II | Garrisoned towns gain +1 science and +1 culture for every three citizens. | It asks for two separate things at once. |
| Marcher Lords | cut | II |  | Four numbers and a distance to check. |
| Pilgrim Markets | reword | II | Trade routes to or from a town with a Holy Site gain +3 gold and +3 faith. | Same effect. |
| Sacred Commissions | simplify | II | Towns with a Holy Site build wonders 30% faster. | Two effects. The card keeps one. |
| The Blessed Forges | simplify | II | Improved strategic resources gain +1 faith and +1 production. | Two effects. The card keeps one. |
| The Brokers' Redraw | simplify | II | You may reroll an Order hand with gold. | The drawback goes, and the number is smaller. |
| The Cloister | simplify | II | Towns with a Temple gain science equal to 30% of their faith. | Two effects. The card keeps one. |
| The Crusader Orders | simplify | II | Military units gain +3 strength in land that does not follow your religion. | Two effects. The card keeps one. |
| The Escorted Roads | simplify | II | Trade routes from a garrisoned town gain +5 gold. | Two effects. The card keeps one. |
| The Grain Exchange | cut | II |  | Provisioning Contracts does this job. |
| The Merchant Navigators | simplify | II | Trade routes from a town with a Harbour gain +5 science. | It asks for two separate things at once. |
| The Penitents' Roll | cut | II |  | The best play is a dull repeated action. Reroll, collect, reroll. |
| The Provincial Fair | simplify | II | Towns with a Market gain +2 gold on plantations, camps and pastures. | Two effects. The card keeps one. |
| The Road Garrisons | cut | II |  | It asks for two separate things at once. |
| The Silk Road Monks | simplify | II | Trade routes to a town that follows your religion gain +3 gold and +3 culture. | Two effects. The card keeps one. |
| The Soldier-Scholars | simplify | II | Each military unit in your towns gives +2 science. | Two effects. The card keeps one. |
| The Tithe | simplify | II | Towns with a Temple gain gold equal to 25% of their faith. | Two effects. The card keeps one. |
| The Waqf | cut | II |  | The player must remember which buildings they bought. |
| Travelling Players | cut | II |  | A seat holds two or three decks, so the count barely moves. |
| Letters of Marque | simplify | III | Naval kills grant 60 gold. | Three effects become one. |
| Sacred Patronage | simplify | III | You may buy a great-person draft for 750 faith. | Two effects. The card keeps one. |
| The Chartered Company | reword | III | Charter. Unlocks the Company Guard, a melee unit you buy with gold. | Same effect. The card frame carries the standing rules. |
| The Cosmopolitan Court | cut | III |  | Two effects with three conditions. |
| The Engineer Corps | cut | III |  | Three effects, one of them war only. |
| The Holy Army | cut | III |  | It asks for two separate things at once. |
| The House of Wisdom | simplify | III | Towns working an Academy build wonders 30% faster. | Three effects become one. |
| The New Code | reword | III | Capturing a city deals you a free Order hand, at most once every ten turns. | Same effect. |
| The Rising Nave | cut | III |  | The yield changes every turn, in tenths. |
| The Sculpted Landscape | reword | III | Farms beside a great-person work gain +2 food and +2 culture. | Same effect. |
| War Bonds | cut | III |  | A treasury threshold to check before each purchase. |

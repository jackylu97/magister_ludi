# Dominion design pass (2026-11-19)

- A design pass on the Dominion deck, asked for on 2026-11-19: *"please run a design pass on the magisterial and dominion decks, they feel underpowered/not as fun... go for more changes than needed, i'll go through and approve or rejct every change."*
- It proposes 50 changes. Each one stands alone unless it says "Depends". Nothing here is built, and no game data changed.
- The method is the card-design skill. "Now" is the card's text in `data/decks/dominion.json`, which equals the sheet `docs/decks/dominion.md`. I checked each one against the game's own words (`describeCard` in `src/sim/statecraft`).
- Every number is a first guess against the power bar, to tune in playtest. No bot games were run.
- The approved generic Orders (39 cards) and the approved wonders are not repeated here. Three changes lean on them: the scaler doubler The Long Memory, the boon The General Summons, and The Royal Annals, which counts commissions met.

**Changes by kind:** 14 buff, 14 rework, 3 cut, 3 move, 12 new, 4 doctrine. **Shapes:** 1 new shape, 5 small extensions; the rest use shapes the game has.

## 1. Why the deck feels weak and flat

1. **Tier II is dead at peace.** Tier II is the longest band (about turns 72 to 133, eight or nine drafts). 13 of its 19 cards pay nothing while the seat is at peace and holds no captured town: Siege Works, Conquered Archives, Riders of the Steppe, Spoils of War, Hegemony, Master Bowyers, Take the City, Living off the Land, The Longbowmen, The Serried Ranks, Spear-won Land, War Feeds Itself and The Taker of Cities. Bot seats were at war on 32% to 45% of their turns, so most Tier II hands are mostly dead.
2. **The province cards are sized for an empire that has already won.** A first conquest is two or three towns. Hegemony (rare) then gives 2 or 3 authority, and the generic common Local Clerks gives +3 with no war. Conquered Archives pays 12 a turn for each captured town against a Tier II bar of 35 to 60. Spear-won Land pays 6% to 9%. The Victory Mint pays about 300 gold at Tier III, where a lump must be 500 to 900 to be noticed. The Grand Campaign pays about 300 science and culture at Tier IV, where a lump must be 1,000 or more.
3. **The citadel cards pay for a thing the seat has one of.** The Castle Demesne (+6), The Citadel Works (+5) and The Border Fortress (+4) pay 15 yield a turn for each citadel, and they are three cards. A seat has one or two citadels, because renown is slow and a planted general is a general who no longer leads. The only supply is The General Staff, The Citadel Works and one commission. The Bakufu then asks the general to stand in a town at home, which is the opposite of what the deck asks.
4. **Several rares are weaker than commons.** War Foundries pays about 14 gold in age 2 (regular Tier I card: 15 to 25). War Feeds Itself pays about 18 a turn, at war only (six units on hexes worth about 3). Total War cost the bots 148 yield a turn: with twelve towns it takes 36 happiness for +5 strength, and the regular Tier III combat card gives +6. The Grand Army pays about 90 (fifteen units) where a Tier IV headline pays 200. Master Bowyers gives +1 range, and the common The Longbowmen gives the same range and +2 strength. Tier 0 has no rare.
5. **The tempo deck has little tempo.** The pool holds one boon (The Sword of State, shared). The only soldier supply in the deck itself is The Spear Makers (+25%); the levies and the purchase cards are all shared, so a seat paired with Scientific or Magisterial has almost none. The Outriders pays 30 production for a camp with three towns, where a Tier 0 lump must be 50 to 100. Kills pay science and culture in every tier and production in none.
6. **There are doubles and chores.** The Regimental Schools (+3 science for each garrison at Tier III) does the job of the shared The Soldier-Scholars (+2 at Tier II). The Proconsuls, Hegemony and the Doctrine The Universal Monarchy all cut the authority of captured towns. Living off the Land and War Feeds Itself both read "units in enemy land". The siege line is four small cards. The Training Cadre gives 2 experience, which is half a rank and shows nowhere.
7. **There are gaps.** Tier IV has no Economic card. The marches (camps, pastures, mounted units) have no card at Tier III. Tier I has no Doctrine for a seat that holds and garrisons. The deck has 8 commissions in 73 cards (11%).

## 2. Index

| # | Card | Tier | Change | Confidence |
|---|---|---|---|---|
| 01 | The Spear Makers | 0 | buff | good |
| 02 | The Outriders | 0 | buff | strong |
| 03 | Blood Brothers | I to 0 | move | good |
| 04 | The Ver Sacrum | 0 | new | good |
| 05 | The Training Cadre | I | rework | good |
| 06 | War Foundries | I | move | good |
| 07 | The Upstarts | I | buff | good |
| 08 | The Captive Craftsmen | I | buff | good |
| 09 | The Castle Demesne | I | buff | good |
| 10 | The Swift Riders | I | rework | good |
| 11 | The Naadam | II to I | move | strong |
| 12 | Riders of the Steppe | II | cut | good |
| 13 | Siege Works | II | rework | strong |
| 14 | Conquered Archives | II | buff | strong |
| 15 | The Citadel Works | II | buff | good |
| 16 | Hegemony | II | buff | strong |
| 17 | The Longbowmen | II | rework | good |
| 18 | Spear-won Land | II | buff | good |
| 19 | War Feeds Itself | II | rework | good |
| 20 | Living off the Land | II | cut | good |
| 21 | Commission: The Border Fortress | II | rework | good |
| 22 | The Amabutho | II | new | strong |
| 23 | The Field of Mars | II | new | good |
| 24 | The Grass Crown | II | new | good |
| 25 | The Melted Arms | II | new | good |
| 26 | The Auxilia | II | new | strong |
| 27 | The Foederati | II | new | speculative |
| 28 | Commission: The Decisive Battle | II | new | good |
| 29 | Total War | III | rework | strong |
| 30 | The Siege Train | III | cut | good |
| 31 | The Drill Masters | III | rework | good |
| 32 | The Victory Mint | III | buff | good |
| 33 | The Bakufu | III | rework | strong |
| 34 | The Regimental Schools | III | buff | good |
| 35 | The Tributary Kings | III | buff | speculative |
| 36 | Commission: The Chosen Men | III | rework | good |
| 37 | The Mesta | III | new | good |
| 38 | The Master of Soldiers | III | new | strong |
| 39 | The Companion Cavalry | III | new | good |
| 40 | The Grand Army | IV | buff | good |
| 41 | The Proconsuls | IV | rework | strong |
| 42 | Commission: The Grand Campaign | IV | buff | strong |
| 43 | Commission: Hold the Capitals | IV | rework | good |
| 44 | Circumvallation | IV | rework | speculative |
| 45 | The Glorious Dead | IV | rework | good |
| 46 | The Castellans | IV | new | good |
| 47 | The Marian Reforms | I | doctrine | good |
| 48 | The Landsturm | IV | doctrine | speculative |
| 49 | The Citizen Phalanx | I | doctrine | good |
| 50 | The Devshirme | IV | doctrine | speculative |

## 3. The changes

### 01. The Spear Makers (buff)

- **Tier, rarity, type:** 0, common, Military
- **Now:** +25% production toward military units.
- **Proposed:** +40% production toward military units.
- **Theme:** Bronze and iron spearheads were the first mass-made weapons. A town with a spear shop arms a levy in days.
- **Play:** It is the only soldier supply in the deck itself, and at 25% it saves 4 hammers on a Warrior. At 40% a seat of three towns gains about one more unit every ten turns in age 1. It feeds every card that reads a unit gained.
- **Shape:** Existing shape: `productionBonus`, a number change.
- **Confidence:** good

### 02. The Outriders (buff)

- **Tier, rarity, type:** 0, common, Economic
- **Now:** Clearing a barbarian camp grants 10 production to every town.
- **Proposed:** Clearing a barbarian camp grants 20 production to every town.
- **Theme:** Outriders scout ahead of a column and bring back what the camp held: tools, stock and captives.
- **Play:** With three towns a camp now pays 60 production, which is a Tier 0 lump that registers (50 to 100). It is about two Warriors or one Monument. Floor: nothing without camps. Ceiling: four camps in age 1. Camps are on every map, so the floor is real.
- **Shape:** Existing shape: `windfallRider` on `camp`, a number change.
- **Confidence:** strong

### 03. Blood Brothers (move)

- **Tier, rarity, type:** I to 0, rare, Military
- **Now:** Tier I, rare: A barbarian unit you kill joins your side.
- **Proposed:** Tier 0, rare, the same text.
- **Theme:** Steppe chiefs swore blood brotherhood (the Mongol *anda*) with men they had fought. Beaten war bands joined the winner.
- **Play:** Tier 0 has no rare, and this card is best in age 1, when camps are everywhere and a free Warrior is a third of an army. At Tier I the units it gives are already old. It reverses batch DS1, which moved it up because "Tier 0 keeps plain cards". The text is one plain line.
- **Shape:** Existing shape: `rule` `barbarianKillsConvert`. Only the band changes.
- **Confidence:** good

### 04. The Ver Sacrum (new)

- **Tier, rarity, type:** 0, rare, Military
- **Now:** Not in the deck.
- **Proposed:** On draft: gain a Settler and the best melee unit you can build.
- **Theme:** The "sacred spring" of the Sabellic peoples of Italy: the children born in one vowed spring were sent out as adults, under arms, to take new land.
- **Play:** A boon, so it takes no chair. It is the tempo opening in one card: a fourth town ten turns early, with its guard. A Settler costs 28 hammers in age 1, when a town makes about 5. It costs a draft that could have been a lasting card. Feeds towns, garrisons and units gained.
- **Shape:** Existing shape: two `onDraft` unit grants (`unit: settler`, `unit: bestMelee`). To confirm: where an on-draft Settler appears.
- **Confidence:** good

### 05. The Training Cadre (rework)

- **Tier, rarity, type:** I, common, Military
- **Now:** Units gained in a town with a Barracks start with 2 experience.
- **Proposed:** Units gained in a town with a Barracks start as Veterans.
- **Theme:** A cadre is the core of experienced soldiers who train the recruits. A unit built around one is steady from its first day.
- **Play:** Two experience is half a rank and shows nowhere. A Veteran has +3 strength, which is the Tier I combat bar, and the player sees the rank on the piece. By your ruling of 2026-10-16 a unit that starts as a Veteran has earned a rank, so each one feeds the cards that read ranks. That loop may be too strong; test it first.
- **Shape:** Existing shape: `unitStamp` with `rank: veteran` and the Barracks scope the row has now.
- **Confidence:** good
- **Depends:** Change 31 (The Drill Masters) gives the Tier III card a new job. If you reject this change, reject 31 too.

### 06. War Foundries (move)

- **Tier, rarity, type:** I, rare to uncommon, Economic
- **Now:** Rare: Towns with a Barracks gain gold equal to 30% of their production.
- **Proposed:** Uncommon: Towns with a Barracks gain gold equal to 40% of their production.
- **Theme:** State foundries sold what the army did not need: tools, nails, bronze. The arms trade paid for the next campaign.
- **Play:** In age 2 a seat makes about 48 production, so the card pays about 14 gold, less than a regular Tier I card. You wrote on 2026-10-12 that it came too early. As an uncommon at 40% it is an honest economy card that grows with production, and the rare place goes to a card that changes play.
- **Shape:** Existing shape: `pays` city, share. A number and a rarity change.
- **Confidence:** good

### 07. The Upstarts (buff)

- **Tier, rarity, type:** I, uncommon, Military
- **Now:** Your units gain +3 strength against the units of an empire that knows more technologies than you.
- **Proposed:** Your units gain +5 strength against an empire that knows more technologies than you.
- **Theme:** Macedon, Qin and the early Arab armies were the rough newcomers who beat older and more learned states.
- **Play:** A conditional combat card must beat the plain one, and +3 is the plain Tier I size. Dominion gives up development at home, so it is often behind in technologies, and this is its answer to a Scientific neighbour. Floor: nothing against a backward rival. The built card already covers towns, so the text says so.
- **Shape:** Existing shape: `combatLine` with `vsMoreTechs`, a number change.
- **Confidence:** good

### 08. The Captive Craftsmen (buff)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Gains +1 science and +1 production each time you pillage a hex.
- **Proposed:** Gains +2 science and +2 production each time you pillage a hex.
- **Theme:** The Mongols spared smiths, weavers and engineers and sent them home to work. Timur filled Samarkand the same way.
- **Play:** Pillage went down to a few cards in batch DS1, so each one must pay for itself. Ten pillaged hexes in a border war now make +20 and +20 for the rest of the game, which is a regular Tier I card. It is a scaler, so it carries into later tiers.
- **Shape:** Existing shape: the scaler rows it has now, a number change.
- **Confidence:** good

### 09. The Castle Demesne (buff)

- **Tier, rarity, type:** I, uncommon, Economic
- **Now:** Citadels give +3 food and +3 production.
- **Proposed:** Citadels give +5 food and +5 production.
- **Theme:** The demesne was the land a lord kept to feed his own castle and household.
- **Play:** A seat has one citadel at this tier, sometimes two. At +6 for one citadel the card is far under the bar of 15 to 25. At +10, with the citadel's own +2 production, one planted general makes a hex worth working for the rest of the game. The Doctrine The Strategoi doubles it later.
- **Shape:** Existing shape: `pays` hex, a number change.
- **Confidence:** good

### 10. The Swift Riders (rework)

- **Tier, rarity, type:** I, uncommon, Military
- **Now:** Mounted units may move after attacking.
- **Proposed:** Mounted units may move after attacking, and pillage without spending movement.
- **Theme:** The steppe raid: strike, burn and be gone before the levy arrives. Scythian, Xiongnu and Comanche riders all fought this way.
- **Play:** It joins two small mounted rule cards into one card that makes riders play differently. A raider can pillage and still retreat, so it feeds every card that reads a pillage. Floor: nothing without horses.
- **Shape:** Existing shapes: `rule` `moveAfterAttack` and `rule` `freePillage`, both live today.
- **Confidence:** good
- **Depends:** Change 12 cuts Riders of the Steppe, whose rule moves here.

### 11. The Naadam (move)

- **Tier, rarity, type:** II to I, common, Civic
- **Now:** Tier II: Pastures and camps gain +2 culture.
- **Proposed:** Tier I, the same text.
- **Theme:** The Mongolian festival of the three games: wrestling, horse racing and archery. The herding camps gather for it.
- **Play:** Three pastures and camps give 6 culture. At Tier II that is a sixth of a regular card. At Tier I culture is scarce (about 14 a turn in age 2), so 6 is a real share of the next draft. It follows The Horse Herds one tier later, on the same hexes.
- **Shape:** Existing shape: `pays` hex. Only the band changes.
- **Confidence:** strong

### 12. Riders of the Steppe (cut)

- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Pillaging costs your mounted units one less movement point.
- **Proposed:** Cut. Its rule joins The Swift Riders (change 10).
- **Theme:** The same raiders as The Swift Riders, so one card can hold both rules.
- **Play:** Alone it is the narrowest card in the deck: it needs horses, a war and a wish to pillage, and then it saves one movement point. The game's own words for it are "mounted units pillage without spending movement", so the sheet text and the built rule differ today.
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends:** Depends on change 10. If you reject 10, keep this card.

### 13. Siege Works (rework)

- **Tier, rarity, type:** II, common, Military
- **Now:** Siege units gain +4 strength against towns.
- **Proposed:** Siege units gain +1 movement and +4 strength against towns.
- **Theme:** Assyrian and Roman engineers moved engines in parts and built roads for them. A siege was won by the army that got its engines there.
- **Play:** Catapults arrive during Tier II and are the slowest pieces on the board. The movement is what shortens a siege, and it comes when the first siege does, not a tier later. +4 alone is under the Tier II combat bar of +5.
- **Shape:** Existing shapes: `combatLine` and `unitStat` (The Siege Train has the movement row today).
- **Confidence:** strong
- **Depends:** Change 30 cuts The Siege Train, whose movement moves here.

### 14. Conquered Archives (buff)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Captured cities gain +6 science and +6 culture.
- **Proposed:** Captured cities gain +10 science and +10 culture.
- **Theme:** Ashurbanipal filled his library with tablets taken from Babylonia. Aemilius Paullus carried the Macedonian royal library to Rome.
- **Play:** Two captured towns now pay 40 a turn, which is a regular Tier II card (35 to 60). At 24 it was not worth a chair until the fourth capture. It is how Dominion reaches science and culture through conquest.
- **Shape:** Existing shape: `pays` city with the `captured` scope, a number change.
- **Confidence:** strong

### 15. The Citadel Works (buff)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Citadels gain +5 science and +3 general renown.
- **Proposed:** Citadels gain +8 science and +8 general renown.
- **Theme:** A great fortress was also a school of engineers and officers. Its works never stopped, and its commanders made their names there.
- **Play:** The renown is the point: +8 a turn is the steady supply of generals that the captains theme lacks, and each new general can plant the next citadel. One citadel pays 16 a turn here, still modest, but it now builds toward something.
- **Shape:** Existing shapes: `pays` hex and `renown`, number changes.
- **Confidence:** good

### 16. Hegemony (buff)

- **Tier, rarity, type:** II, rare, Economic
- **Now:** Towns you captured cost 1 less authority.
- **Proposed:** Towns you captured cost 2 less authority.
- **Theme:** The Greek *hegemon* led a league of subject allies who kept their own councils. They were cheaper to hold than towns ruled directly.
- **Play:** A captured town costs 4 authority and a founded one 3. At 2 less, a conquest costs half, and three captures free 6 authority, enough for two more towns. At 1 less the rare was weaker than a generic common until the fourth capture.
- **Shape:** Existing shape: `meterRule` `capturedCityCost`, a number change.
- **Confidence:** strong

### 17. The Longbowmen (rework)

- **Tier, rarity, type:** II, common, Military
- **Now:** Ranged units gain +2 strength and +1 range.
- **Proposed:** Ranged units gain +4 strength.
- **Theme:** The war bow of Wales and England was a heavy bow. What set it apart was the force of the arrow, from men trained since boyhood.
- **Play:** Today the common gives the same +1 range as the rare Master Bowyers, and strength too, so the rare is the worse card. This gives each one job: the common is strength and the rare is reach. +4 is near the Tier II combat bar.
- **Shape:** Existing shape: `combatLine`. The `unitStat` range row goes.
- **Confidence:** good

### 18. Spear-won Land (buff)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** +3% production and science for each town you have captured.
- **Proposed:** +5% production and science for each town you have captured.
- **Theme:** Alexander's successors held their kingdoms as "spear-won land" (*doriktetos chora*): the right of conquest was their title.
- **Play:** It counts captures this game, so a town lost later still counts. Three captures now give +15% on about 250 production and science in age 3, which is about 37 a turn and a regular card. At 3% it needed five captures.
- **Shape:** Existing shape: `pays` empire, count `citiesCaptured`, a number change.
- **Confidence:** good

### 19. War Feeds Itself (rework)

- **Tier, rarity, type:** II, rare, Economic
- **Now:** At the end of your turn, each of your units in enemy territory yields you its hex's yields.
- **Proposed:** Your units in enemy territory cost no upkeep, and each yields you its hex's yields at the end of your turn.
- **Theme:** *Bellum se ipsum alet*, Cato's rule as Livy gives it. Wallenstein's armies lived by it in the Thirty Years' War.
- **Play:** Six units abroad pay about 18 yield, which is weak for a rare. With the upkeep (1 gold for each unit and age) the army abroad is free and pays, so a long war costs the treasury nothing. Two clauses on one fact. If it is still thin, double the hex yields.
- **Shape:** Existing shapes: `harvest` and `upkeepRebate` `foreignTerritory`, both live today.
- **Confidence:** good
- **Depends:** Change 20 cuts Living off the Land, whose rule moves here.

### 20. Living off the Land (cut)

- **Tier, rarity, type:** II, common, Military
- **Now:** Military units outside your territory cost no upkeep.
- **Proposed:** Cut. Its rule joins War Feeds Itself (change 19).
- **Theme:** It is the same practice as War Feeds Itself: the army eats what the country holds.
- **Play:** Alone it saves about 10 to 20 gold a turn, and only while the army is abroad. Gold counts half, so that is far under the Tier II bar. Two cards that read "units in enemy land" are one job.
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends:** Depends on change 19. If you reject 19, keep this card.

### 21. Commission: The Border Fortress (rework)

- **Tier, rarity, type:** II, uncommon, Wildcard
- **Now:** Goal: plant a citadel. Reward: citadels gain +2 food and +2 production.
- **Proposed:** Goal: plant a citadel. Reward: choose a great general.
- **Theme:** A king who built a march fortress then named a warden for it: the margraves, the Chinese frontier generals, the Byzantine *akritai*.
- **Play:** The reward of +4 for each citadel is the smallest in the deck, and the goal costs a general. Now the general comes back: the seat gets its citadel and keeps a captain in the field. This changes the reward you wrote on 2026-10-21. The other choice is to keep yours at +4 and +4.
- **Shape:** Existing shape: a commission reward `greatPerson: general`, as Clear the Frontier has.
- **Confidence:** good

### 22. The Amabutho (new)

- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Not in the deck.
- **Proposed:** On draft: every town with a Barracks gains the best melee unit you can build.
- **Theme:** The Zulu age regiments: every young man of one age was called up together and quartered at a royal military town. The era is later than this tier, and I have not bent it.
- **Play:** A boon, so it takes no chair. Five Barracks towns give five units at once, which is 230 to 400 hammers in this tier. It is the turn a seat goes to war. The units cost upkeep, and that is the price. It makes units gained in one moment, and rewards Barracks built earlier.
- **Shape:** Small extension: an `onDraft` unit grant goes to the capital today. It needs "every town in a scope", which the windfall grant has (`toEveryTown`, `fromTowns`).
- **Confidence:** strong

### 23. The Field of Mars (new)

- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Not in the deck.
- **Proposed:** On draft: every military unit you have gains 4 experience.
- **Theme:** The Campus Martius, where Rome mustered, counted and drilled its army before each campaign.
- **Play:** A boon, so it takes no chair. Four experience is one rank: a new unit becomes a Veteran, and a seasoned Veteran becomes an Elite. Each rank is a moment that other cards read, so a seat of ten units fires ten of them at peace. It rewards the army the seat already has.
- **Shape:** **New shape:** an `onDraft` grant of experience to units. The `drill` effect gives experience each turn; a one-time grant does not exist.
- **Confidence:** good

### 24. The Grass Crown (new)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Capturing a city grants 200 renown, favouring great generals.
- **Theme:** The *corona graminea* was Rome's rarest honour. The army itself gave it to the commander who saved it, woven from the grass of the field.
- **Play:** It joins the provinces to the captains: towns taken make generals, and generals take towns. 200 renown is a large part of the next great person at this tier. Pays nothing at peace, so it is a card to hold for the war.
- **Shape:** Existing shape: `windfallRider` on `capture` with `renown` and `renownFamily: general` (Looted Art pays renown on a capture today).
- **Confidence:** good

### 25. The Melted Arms (new)

- **Tier, rarity, type:** II, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Killing a unit grants production equal to twice its strength in your capital.
- **Theme:** The First Emperor of Qin gathered the weapons of the states he had beaten, melted them, and cast bells and twelve bronze giants for his capital.
- **Play:** Kills pay science and culture in every tier and production in none. A kill of a 45-strength unit pays 90 hammers, half a Legionary. Barbarians count, so it pays at peace on a wild border. One kill every three turns is 30 a turn.
- **Shape:** Existing shape: `windfallRider` on `kill`, `fromOccasion: strength`, `toCapital` (Songs of the Fallen and The Outriders use the parts).
- **Confidence:** good

### 26. The Auxilia (new)

- **Tier, rarity, type:** II, common, Military
- **Now:** Not in the deck.
- **Proposed:** Capturing a city grants the best melee unit you can build, in that city. It costs no upkeep.
- **Theme:** Rome raised its auxiliary cohorts from the peoples it had just conquered, and often posted them at once.
- **Play:** A captured town needs a garrison to settle, and marching one in stalls the war. Now the town brings its own, and the army moves on. It is a unit gained for each capture, with no orders needed: it stands where it is useful.
- **Shape:** Existing shape: `windfallRider` on `capture` with `unit: bestMelee`. A granted unit goes to the town nearest the occasion and is free of upkeep.
- **Confidence:** strong

### 27. The Foederati (new)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Clearing a barbarian camp adds 2 citizens to your capital.
- **Theme:** Late Rome settled beaten peoples inside its borders as *foederati* and *laeti*: land for them, farmers and recruits for the empire.
- **Play:** The marches meet Dominion's gap, which is growth at home. Two citizens in a capital of ten are about 15 turns of food. Camps still appear in this tier, but fewer, so three or four camps is a good result. To tune in playtest.
- **Shape:** Small extension, to confirm: a population grant exists as a commission reward (the retired Battle Honours). On a `windfallRider` it may need a field.
- **Confidence:** speculative

### 28. Commission: The Decisive Battle (new)

- **Tier, rarity, type:** II, uncommon, Wildcard
- **Now:** Not in the deck.
- **Proposed:** Goal: kill 10 units. Reward: your military units gain +3 strength.
- **Theme:** Gaugamela, Gaixia, Hattin: one won field made an army's name, and the name fought beside it afterwards.
- **Play:** You asked for more commissions that use soldiers. This is the plainest: fight, and the army is better for the rest of the game with no chair spent. Barbarians count, so a peaceful seat can meet it slowly. It does not depend on the wager system.
- **Shape:** Existing shape: a `counted` goal on `unitKilled` and a lasting reward of one `combatLine`.
- **Confidence:** good

### 29. Total War (rework)

- **Tier, rarity, type:** III, rare, Military
- **Now:** All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness.
- **Proposed:** While you are at war: your military units gain +6 strength and +1 movement, and every city demands +2 more happiness.
- **Theme:** A state at total war turns every town to the army, and the towns feel it. At peace the burden lifts.
- **Play:** In the bot games this card cost its seat 148 yield a turn: twelve towns lose 36 happiness in peace and war. Now it costs nothing at peace, so a seat can hold it for the war, and the war has a price that makes the player want to finish it.
- **Shape:** Existing shape: `conditionRule` with `atWar` around the three rows it has now.
- **Confidence:** strong

### 30. The Siege Train (cut)

- **Tier, rarity, type:** III, uncommon, Military
- **Now:** Siege units gain +1 movement, and +5 strength when defending.
- **Proposed:** Cut. Its movement joins Siege Works (change 13).
- **Theme:** The same engineers as Siege Works.
- **Play:** The siege line is four small cards: Siege Works, this one, The Taker of Cities and The Great Bombards. Three is enough. The Doctrine Combined Arms already guards siege units beside melee units.
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends:** Depends on change 13. If you reject 13, keep this card.

### 31. The Drill Masters (rework)

- **Tier, rarity, type:** III, common, Military
- **Now:** Units you gain start as Veterans.
- **Proposed:** Garrisoned units gain 1 experience each turn.
- **Theme:** Rome's *campidoctores* drilled the legions every day in quarters. Vegetius wrote that drill, not numbers, won Rome's wars.
- **Play:** A garrison at peace now does something: in ten turns it is Elite. It gives the garrison theme its choice, which is who stands in the towns, and it makes ranks at peace for every card that reads them. Each unit earns only two ranks, so the loop ends. Nothing to track: it is every turn.
- **Shape:** Existing shape: `drill` with `where: garrison` (the retired The Drill Grounds used it with a timer).
- **Confidence:** good
- **Depends:** Follows change 05, which takes the Veteran start. If you reject 05, keep this card as it is.

### 32. The Victory Mint (buff)

- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Capturing a city grants gold equal to thirty times its population.
- **Proposed:** Capturing a city grants gold equal to sixty times its population.
- **Theme:** Alexander coined the Persian treasure, and Rome struck "Judaea Capta" coins from the spoils. A victory was turned into money at once.
- **Play:** A town of ten now pays 600 gold. At 300 it bought half a unit at this tier, and a lump that registers is 500 to 900. It lets a seat buy the buildings its captured town lacks.
- **Shape:** Existing shape: `windfallRider` on `capture`, `fromOccasion: population`, a number change.
- **Confidence:** good

### 33. The Bakufu (rework)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** A great general standing in a town gives it +25% science and culture.
- **Proposed:** A town with a citadel gains +25% production, science and culture.
- **Theme:** The *bakufu*, "tent government", was rule from the shogun's headquarters. The fortress became the seat of the state.
- **Play:** Today it keeps a general at home, and it pays about 20 a turn. Now it is the multiply card for citadels: plant the citadel beside the best town, and the town pays about 60 more at this tier. The general is free to lead. It makes where to plant a real choice.
- **Shape:** Existing shape: `percentYields` with the `hasImprovement` scope (citadel).
- **Confidence:** strong

### 34. The Regimental Schools (buff)

- **Tier, rarity, type:** III, common, Civic
- **Now:** Each garrisoned unit gives its town +3 science.
- **Proposed:** Each garrisoned unit gives its town +8 science.
- **Theme:** Regiments ran schools for their soldiers and the soldiers' children. For many towns it was the only school.
- **Play:** Twelve garrisoned towns pay 36 science today against a Tier III bar of 60 to 120, and the shared The Soldier-Scholars pays +2 a tier earlier. At +8 the card is the current-tier version: 96 science, which a town percentage then raises.
- **Shape:** Existing shape: `pays` city, count `garrison`, a number change.
- **Confidence:** good

### 35. The Tributary Kings (buff)

- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Your capital gains +1 production and +1 gold for each citizen in your puppet towns.
- **Proposed:** Your capital gains +2 production and +2 gold for each citizen in your puppet towns.
- **Theme:** Client kings kept their thrones and sent tribute: Herod under Rome, the Korean kings under the Ming.
- **Play:** It is the only reason to keep a puppet and not annex it. Two puppets of eight citizens now pay 32 production and 32 gold in the capital, which is near a regular card. I do not know how many puppets players keep.
- **Shape:** Existing shape: `pays` capital, count `puppetPopulation`, a number change.
- **Confidence:** speculative

### 36. Commission: The Chosen Men (rework)

- **Tier, rarity, type:** III, uncommon, Wildcard
- **Now:** Goal: have three units become Elite. Reward: your Elite units ignore enemy zone of control.
- **Proposed:** Goal: have three units become Elite. Reward: your Elite units gain +1 movement and ignore enemy zone of control.
- **Theme:** Picked companies went first into the breach and around the flank, and marched light.
- **Play:** Ignoring zone of control is a small reward for a goal that takes a long war. With +1 movement the Elites become a strike force the player uses differently, and the reward shows every turn.
- **Shape:** Small extension: `unitStat` filters by class today, not by rank. The `hasRank` test exists for combat lines.
- **Confidence:** good

### 37. The Mesta (new)

- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Worked pastures and camps give +4 food, +4 production and +4 gold.
- **Theme:** The Castilian guild of herd owners, chartered by Alfonso X in 1273. Its flocks crossed the kingdom on royal drove roads and paid the crown.
- **Play:** The marches have no card at Tier III. This is the current-tier version of The Horse Herds on the same hexes: four pastures and camps pay 48 a turn. It pays at peace, and a seat that kept its herding land sees those hexes grow again.
- **Shape:** Existing shape: `pays` hex, as The Horse Herds.
- **Confidence:** good

### 38. The Master of Soldiers (new)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** On draft: choose a great general.
- **Theme:** The *magister militum*, the supreme command of the late Roman army. A magister names a magister.
- **Play:** A boon, so it takes no chair. The captains theme has pay-offs in this tier and too few generals to feed them. A general now is +3 strength in a ring of two hexes for the coming war, or a citadel for a card that reads one. The generic set has the same boon for engineers.
- **Shape:** Existing shape: `onDraft` grant `greatPerson` with `family: general`.
- **Confidence:** strong

### 39. The Companion Cavalry (new)

- **Tier, rarity, type:** III, rare, Military
- **Now:** Not in the deck.
- **Proposed:** A unit of yours that kills a unit regains its movement.
- **Theme:** Alexander's Companions broke a line and rode on through it. The pursuit after the charge is what destroyed armies.
- **Play:** A rule-breaker, which you asked for more of. A kill no longer ends a unit's turn in place: it can pull back, or ride on to screen a siege. It does not give a second attack; that stays with The Varangian Guard at Tier IV. Pays nothing at peace.
- **Shape:** Existing shape: `rule` `moveAfterKill`. The rule is read in `combat.ts` and no live card uses it.
- **Confidence:** good

### 40. The Grand Army (buff)

- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Your capital gains +3 science and +3 culture for each military unit you have.
- **Proposed:** Your capital gains +6 science and +6 culture for each military unit you have.
- **Theme:** A great standing army drew engineers, surgeons, map makers and painters to the capital that paid for it.
- **Play:** Fifteen units pay 90 today, under a regular Tier IV card, and a rare should reach 200. At +6 they pay 180. It grows with the army held, which the tempo ruling warns about, but you kept it and asked for late cards for a large army.
- **Shape:** Existing shape: `pays` capital, count `unitsInField`, a number change.
- **Confidence:** good

### 41. The Proconsuls (rework)

- **Tier, rarity, type:** IV, uncommon, Civic to Economic
- **Now:** Captured towns with a garrison cost no authority.
- **Proposed:** Captured towns gain +25% production and +25% gold.
- **Theme:** A proconsul governed a province with a consul's power, and his first duty was its revenue.
- **Play:** Three cards cut the authority of captured towns, and the Doctrine The Universal Monarchy does it a tier earlier with no garrison. This gives Tier IV its first Economic card and gives the provinces a multiply card on yields that the other province cards do not raise.
- **Shape:** Existing shape: `percentYields` with the `captured` scope.
- **Confidence:** strong

### 42. Commission: The Grand Campaign (buff)

- **Tier, rarity, type:** IV, uncommon, Wildcard
- **Now:** Goal: capture three cities. Reward: a great general, and science and culture equal to ten times their population.
- **Proposed:** Goal: capture three cities. Reward: a great general, and science and culture equal to forty times their population.
- **Theme:** A campaign that takes three cities is the kind that was written into the annals and carved on the arch.
- **Play:** Three towns of ten citizens pay 300 science and 300 culture today, when a seat makes about 500 of each every turn. At forty times they pay 1,200 of each: about two technologies and a draft.
- **Shape:** Existing shape: the commission reward it has now, a number change.
- **Confidence:** strong

### 43. Commission: Hold the Capitals (rework)

- **Tier, rarity, type:** IV, rare, Wildcard
- **Now:** Goal: hold two rival capitals. Reward: a great general, and +25% production in every town for twenty turns.
- **Proposed:** Commission: Hold the Capital. Goal: hold a rival capital. Reward: a great general, and +25% production in every town for twenty turns.
- **Theme:** To take the enemy's capital and hold it was the proof of a conquest: Babylon, Chang'an, Constantinople.
- **Play:** A seat that holds two capitals at Tier IV has won, so the reward comes too late to matter. One capital is a goal a strong Dominion seat can meet, and the twenty turns of production then go into the Magnum Opus. A capital already held counts.
- **Shape:** Existing shape: the `reached` goal on `originalCapitalsHeld`, with 1 in place of 2.
- **Confidence:** good

### 44. Circumvallation (rework)

- **Tier, rarity, type:** IV, uncommon, Military
- **Now:** While a rival town is under siege by your units, it adds no production toward a Magnum Opus.
- **Proposed:** A town under siege by your units makes no production and takes twice the siege damage.
- **Theme:** Caesar at Alesia: a ring of works around the town, so that nothing goes in and nothing comes out.
- **Play:** Today it matters only against the one town that raises an Opus. Now every siege is shorter and the town cannot build walls or units under it, and it still stops an Opus. A siege needs every hex around the town held, so it stays hard to do.
- **Shape:** Small extension: the `opusSiege` rule stops Opus production only, and siege damage (5 a turn) is a rule number with no card line.
- **Confidence:** speculative

### 45. The Glorious Dead (rework)

- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Your losses never count toward war weariness.
- **Proposed:** Your losses never count toward war weariness. Losing a unit grants production equal to half its cost in your capital.
- **Theme:** Athens buried its war dead at public cost, raised their orphans, and gave each one a full set of armour when he came of age.
- **Play:** War weariness alone is a thin rare: it saves about 1 happiness for each loss. With half the cost back, a lost Knight returns about 220 hammers toward the next one. It supports feeding units to die, which you wanted as a way to play, and a lost war no longer ruins the seat.
- **Shape:** Existing shape, to confirm: `windfallRider` on `death` with the `unitCost` measure (the retired The Legions' Labour read it), `toCapital`.
- **Confidence:** good

### 46. The Castellans (new)

- **Tier, rarity, type:** IV, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Towns gain +6 production for each military and defensive building.
- **Theme:** A castellan held a castle and ran its district: its workshops, its mills, its labour dues.
- **Play:** Tier IV has no Economic card. Twelve towns with three or four such buildings each pay about 250 production, a headline for a seat that built its Barracks, walls, Armouries and Castles all game. It is the late card for what the garrison theme built, and it pays at peace. To tune in playtest.
- **Shape:** Existing shape: `pays` city with the counts `buildingsOfCategory` (military) and `defensiveBuildings`, as Stockpiles.
- **Confidence:** good

### 47. The Marian Reforms (doctrine)

- **Tier, rarity, type:** I, Doctrine, drilled legions
- **Now:** Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected.
- **Proposed:** Your military units cost no upkeep, but your towns build them 25% more slowly. Buying them is unaffected.
- **Theme:** The reforms that tradition gives to Marius: the state armed and paid long-service soldiers, and the army no longer went home.
- **Play:** Upkeep is 1 gold for each unit and age, so eight units in age 2 cost 16 gold a turn. Half speed on all units is a far larger loss than that, so only a seat that buys its army would take it. At 25% it is a real trade for any seat.
- **Shape:** Existing shape: `productionBonus` at -25 in place of -50.
- **Confidence:** good

### 48. The Landsturm (doctrine)

- **Tier, rarity, type:** IV, Doctrine, endless host
- **Now:** After you pass a draft, each city of five or more citizens raises the best melee unit you can build. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general.
- **Proposed:** When a war begins, each city of five or more citizens raises the best melee unit you can build, at most once every twenty turns. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general.
- **Theme:** The Prussian edict of 1813 called out every man not in the army when the country was invaded.
- **Play:** Passing a draft is a card-table act, and you have been cutting those. A war is the moment the Landsturm was for: the host stands up the turn the war starts, for an attacker or a defender. The twenty turns stop a seat that declares, makes peace and declares again.
- **Shape:** Small extension: `windfallRider` on `declareWar` exists for a war you declare, with `oncePerTurns`. A war declared on you needs the same moment for the defender.
- **Confidence:** speculative

### 49. The Citizen Phalanx (doctrine)

- **Tier, rarity, type:** I, Doctrine (new), garrison state
- **Now:** Not in the deck. Tier I has no Doctrine for a seat that holds and garrisons.
- **Proposed:** Towns of three or more citizens may spend a citizen to raise the best melee unit you can build. It costs no upkeep.
- **Theme:** The Greek city fought with its own citizens: the farmer who could afford a shield stood in the line.
- **Play:** It gives Dominion its own soldier economy for the whole game, with no partner deck: food becomes soldiers when the player chooses. The cost is the citizen, and Dominion's gap is growth at home, so the price is paid where it hurts. It uses the levy menu that exists.
- **Shape:** Existing shape: `levy` with `use: muster` and `minPopulation: 3`, with the upkeep waiver a granted unit has. To confirm: that a levied unit can be free of upkeep.
- **Confidence:** good

### 50. The Devshirme (doctrine)

- **Tier, rarity, type:** IV, Doctrine (new), conqueror
- **Now:** A retired Tier III card, marked in batch DS1 as a Doctrine candidate: "Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran."
- **Proposed:** Captured towns may spend a citizen to raise the best melee unit you can build, as an Elite. Towns you founded build military units 50% more slowly.
- **Theme:** The Ottoman levy of boys from the conquered Balkan provinces, who were trained as the Janissaries, the sultan's best troops.
- **Play:** Tier IV has no Doctrine for a conqueror. The conquered provinces become the army, and the home towns stop making one, so each new war is fought with the last war's gains. An Elite has +6 strength. It uses the levy menu that exists.
- **Shape:** Existing shapes: the retired row's `levy` with the `captured` scope and `rank: elite`, and `productionBonus` with the `notCaptured` scope.
- **Confidence:** speculative

## 4. The deck after the changes

If every change is approved:

| Tier | Cards now | After | Military | Economic | Civic | Wildcard | Rares |
|---|---|---|---|---|---|---|---|
| 0 | 8 | 10 | 4 | 4 | 2 | 0 | 2 |
| I | 17 | 17 | 4 | 4 | 7 | 2 | 2 |
| II | 19 | 23 | 9 | 6 | 5 | 3 | 4 |
| III | 17 | 19 | 5 | 4 | 8 | 2 | 6 |
| IV | 12 | 13 | 5 | 2 | 3 | 3 | 9 |
| All | 73 | 82 | 27 | 20 | 25 | 10 | 23 |

Commissions go from 8 to 9, and boons from none in the deck itself to four (The Ver Sacrum, The Amabutho, The Field of Mars, The Master of Soldiers). Doctrines go from 13 to 15.

## 5. Throughlines

Each theme has a path through the tiers. The cards named are the ones a seat leaning on that theme would look for.

### The garrison state (hold, drill, build)

- **Tier 0:** Sword and Plough, The Grain Tribute, The Spear Makers
- **Tier I:** Martial Law, The General Staff, The Training Cadre (Veterans from a Barracks), Honours of the Legion; the Doctrine The Citizen Phalanx
- **Tier II:** Stockpiles, The Veterans' Roll, The Field of Mars, The Amabutho
- **Tier III:** The Drill Masters (garrisons drill), Standing Garrisons, The Regimental Schools, The Limitanei, The Tagmata
- **Tier IV:** The Castellans, The Grand Army, The Varangian Guard
- **The essentials:** Production from garrisons and military buildings; science from ranks and garrisons; culture from ranks and Standing Garrisons. It pays at peace in every tier.

### The marches (camps, herds, riders)

- **Tier 0:** The Horse Herds, The Outriders, Blood Brothers, The Bards' Praise, The Captured Arms
- **Tier I:** The Naadam, The Quartermasters, The Pacified Marches, Commission: Clear the Frontier, The Swift Riders, The Captive Craftsmen
- **Tier II:** The Foederati, The Melted Arms, Spoils of War, Commission: The Decisive Battle
- **Tier III:** The Mesta, The Companion Cavalry
- **Tier IV:** The Horde
- **The essentials:** Production from camps, kills and herding land; culture from kills and The Naadam; science from kills (The Captured Arms) and pillage. Tier IV is still thin: one card.

### The provinces (take towns, make them pay)

- **Tier 0:** The Ver Sacrum, The Spear Makers
- **Tier I:** Commission: The First Province, The Upstarts
- **Tier II:** The Auxilia, Hegemony, Conquered Archives, Spear-won Land, Siege Works, Commission: Take the City, War Feeds Itself
- **Tier III:** Total War, The Victory Mint, Pax Romana, The Tributary Kings, Commission: A Victor's Peace
- **Tier IV:** The Proconsuls, The Annexed Provinces, Commission: Hold the Capital, Commission: The Grand Campaign, Vae Victis
- **The essentials:** Science and culture from captured towns; production from The Proconsuls and Spear-won Land; gold from The Victory Mint. It still pays little before the first capture, by design, but ten of Tier II's 23 cards now work for a seat at peace while it prepares.

### The captains (generals and citadels)

- **Tier 0:** none (Tier 0 keeps plain cards)
- **Tier I:** Commission: Clear the Frontier, The General Staff, The Castle Demesne
- **Tier II:** Commission: The Border Fortress (the general comes back), The Citadel Works, The Grass Crown, The Tactica, The Taker of Cities
- **Tier III:** The Master of Soldiers, The Bakufu, The Mural Crown, Up Through the Ranks
- **Tier IV:** The Marshalate, Commission: The Grand Campaign, Commission: Hold the Capital
- **The essentials:** Production and food from citadels; science and culture from The Bakufu, The Citadel Works and The Mural Crown. Generals now come from five sources, not three.

## 6. Example councils

### Early, end of Tier I: the drilled frontier (five chairs, a tier-4 government)

- **Chairs:** Sword and Plough (0), The Captured Arms (0), Martial Law (I), The Training Cadre (I), Honours of the Legion (I). Doctrine: The Citizen Phalanx.
- **How it plays:** Every town holds a soldier, and that pays production, culture, food and happiness. Each unit from a Barracks town arrives as a Veteran, and its rank pays science and culture equal to its strength, about 30 of each in age 2. When food is high, a town turns a citizen into a soldier. The seat is ahead on yields by turn 60 and has an army of Veterans to spend.

### Early, end of Tier II: the first conquest (five chairs, a tier-10 government)

- **Chairs:** The Auxilia (II), Hegemony (II), Conquered Archives (II), The Melted Arms (II), Songs of the Fallen (I). Taken on the way and holding no chair: The Amabutho, The Field of Mars, and the lasting reward of Commission: The First Province.
- **How it plays:** The Amabutho puts a unit in every Barracks town, and the war starts that turn. Each kill sends hammers to the capital and science and culture to the empire. Each town taken brings its own garrison, costs 2 authority and pays +10 science, +10 culture, +5 food and +5 gold. Three towns are about 100 yield a turn and 6 authority saved.

### Late, Tier III then Tier IV: the captains' provinces (eight chairs, then eleven)

- **Chairs:** Tier III: The Bakufu, The Mural Crown, The Citadel Works (II), The Castle Demesne (I), Total War, Pax Romana, The Victory Mint, The Veterans' Roll (II, the scaler). Boon: The Master of Soldiers. Tier IV adds The Proconsuls, The Annexed Provinces and Vae Victis.
- **How it plays:** The seat plants its citadels beside its best towns: each such town gains a quarter more production, science and culture, and the citadel hex pays +5 food, +7 production and +8 science. Each new general pays 200 science and culture for every general so far. At war the army has +6 strength and a general's ring; a town taken works the same turn and pays gold at once, twice with Vae Victis.

## 7. What to test first

1. Tier II in a peaceful game: count the cards in each hand that the seat can use. The target is at least half.
2. The Training Cadre with Honours of the Legion: every unit gained pays its strength in science and culture. If that is too much, a rank that a card gives at the start does not count as earned (this would change your ruling of 2026-10-16), or Honours of the Legion pays once a turn.
3. The Amabutho: five or more units in one turn. Check the upkeep after it, and whether the turn feels like a moment or like ten new chores.
4. Hegemony at 2 less authority, alone and with the Doctrine The Universal Monarchy (which makes it dead: that is the Doctrine's price for Hegemony holders).
5. Total War at war only: is +6 strength worth 2 happiness in every town for the length of a war?
6. The Bakufu on a citadel: does the player choose where to plant, and does a second citadel feel as good as the first?
7. The Citizen Phalanx at three citizens: does a seat strip its towns, and does that feel like a choice or a trap?

## 8. What I could not determine

- No measurement exists for this deck since batches DS1 and DS2 (2026-11-10). The power bar comes from bot games of 2026-10-13 on an older tree. Every number here is a first guess, to tune in playtest.
- How many great generals a human seat gains in a game. The renown rule is in `data/rules.json` (`renown`: base 75, linear 58, exponent 2.65) and I did not work the curve through, so "one or two citadels" is my estimate.
- How many puppets players keep, and how often camps appear after turn 100 in a human game. Changes 27 and 35 lean on these.
- Four shape points that the triage must check in code: where an on-draft Settler appears (04), whether a rider can grant citizens (27), whether a death rider can read a unit's cost (45), and whether a levied unit can be free of upkeep (49).
- Whether the Doctrine The Universal Monarchy and the new Hegemony should stack or not. I left them as they fold today.
- The history is from my own knowledge, not from a source in the repo. Two fits are loose and are marked: The Amabutho is a 19th-century institution in a Tier II place, and The Mesta is a sheep guild on a card that also pays for horse pastures.
- Three sheet texts differ from the game's own words for the built card. Riders of the Steppe: the sheet says "one less movement point", the game says "without spending movement". The Sword of State: the game's words leave out "It costs no upkeep". The Upstarts: the sheet says "the units of an empire", and the built card also counts towns.

# Leader roster pass, 2026-11-19

A design pass on every candidate in the ruling "Leaders: a more mainstream roster, one for each pair of decks" (`docs/flags.md`, 2026-11-19). The user chooses among them. Nothing here is built, and no game data or code changed.

- The page for review is generated from the same source (`roster_data.py` and `build.py`, in the session scratchpad).
- History is written from memory and is not checked against sources. Thin points are marked in each block.
- Power bar used below (`.claude/skills/card-design/references/power-bar.md`): a regular new card pays 4 to 8 yield a turn at the end of age 1 and 35 to 60 in age 3; a headline card pays 10 to 15 and 100 or more. Early culture counts three times. A regular combat line is +2 to +3 in age 1 and +5 in age 3. A1 is the end of age 1 (about turn 55, 3 to 4 towns). A3 is the end of age 3 (about turn 150, 8 towns, 70 citizens). Every number is a first guess, to tune in playtest.
- "Existing" on an ability means a live or built row already uses that effect shape. The reader is `src/sim/statecraft/evaluator.ts`.
- The decks are read as they will be after the approved builds: the Dominion and Magisterial passes of 2026-11-19, the generic Orders (section 7), the wonders review and the religion names.

## 1. The structure

This pass designs every candidate in the ruling of 2026-11-19 (`docs/flags.md`, "Leaders: a more mainstream roster, one for each pair of decks"). Nothing here is built or ruled. You choose; the build follows your choice.

### The fifteen pairs today

- Six decks make fifteen pairs. Today ten pairs have a leader and five have none.
- The twelve leaders with two decks: Mithridates VI (Dominion + Expansionist); Modu Chanyu and Joan of Arc (Dominion + Devotion); Emperor Taizong (Dominion + Magisterial); Pachacuti (Expansionist + Commerce); Nezahualcoyotl (Expansionist + Scientific); Mansa Musa (Commerce + Devotion); Zheng He (Commerce + Magisterial); Al-Ma'mun (Devotion + Scientific); Akhenaten and Hildegard of Bingen (Devotion + Magisterial); Hypatia (Scientific + Magisterial).
- The thirteenth, Ibn Battuta, plays every deck (see "Ibn Battuta" below).
- No leader today: Dominion + Commerce, Dominion + Scientific, Expansionist + Devotion, Expansionist + Magisterial, Commerce + Scientific.
- Devotion has six leaders and Commerce three. A player who wants Dominion with Scientific cannot have it.

### The proposal: one leader for each pair

- Fifteen leaders, one a pair, so every pair is playable and no deck has more seats than another (each deck has five).
- Three stay as they are (Pachacuti, Nezahualcoyotl, Mansa Musa). One is reworked (Joan of Arc). Eleven are new.
- Four pairs have two candidates. The page gives a pick for each.

### The alternatives

- **Keep thirteen.** Ten new or reworked leaders and three that stay, with two pairs left empty. It saves about two leaders of work and keeps the hole that the proposal is meant to close. I do not recommend it.
- **Two leaders on the strongest pairs.** Dominion + Devotion, Dominion + Magisterial and Devotion + Magisterial each have two good candidates, and two of those pairs hold two leaders today. Eighteen leaders. The extra three can come later with no change to the first fifteen.
- **Fifteen plus the rainbow seat.** Ibn Battuta, or a successor, stays as a sixteenth seat that plays every deck.

### What fifteen costs to build, against thirteen

- From `docs/leaders.md`, "What it cost to build": the seven leaders of batch L6a were seven rows in `data/leaders.json`, fourteen new unit and building rows, three doc tables with their sync tests, and a handful of new shapes. The screens (L6b) exist and need no work.
- A leader costs: one row with two abilities; a unit row; a building or improvement row; colours, cities and a start bias in the doc tables; a banner drawing; a portrait; a bot persona; and a place in the map seed sweep.
- The recommended fifteen need eleven new leader rows and one reworked row. Three of the eleven take over a whole kit that is already built (Genghis Khan from Modu Chanyu, Cleopatra from Hypatia, Harun al-Rashid from Al-Ma'mun). So eight kits are fully new: eight unit rows, seven building rows and one improvement row, against fourteen rows for L6a.
- One small extension to the effect vocabulary and no new shape (see "For the builder").
- Thirteen would save two of the eight new kits. Fifteen costs about a third more data work than thirteen, and the same code work.
- Art is the larger cost either way: eleven or twelve new portraits, and eight new banners (three are reused).

## 2. The roster by pair

| Pair | Recommended | People | Region | Time | Status | Also designed |
|---|---|---|---|---|---|---|
| Dominion + Expansionist | **Alexander the Great** | Macedonians | Macedon, Greece | 4th century BC | new |  |
| Dominion + Commerce | **Genghis Khan** | Mongols | Mongolia, the steppe | 13th century | new |  |
| Dominion + Devotion | **Joan of Arc** | French | France | 15th century | rework | Saladin |
| Dominion + Scientific | **Mehmed the Conqueror** | Ottomans | Anatolia and the Balkans | 15th century | new |  |
| Dominion + Magisterial | **Qin Shi Huang** | Qin | China | 3rd century BC | new | Augustus |
| Expansionist + Commerce | **Pachacuti** | Inca | the Andes | 15th century | stays |  |
| Expansionist + Devotion | **Isabella of Castile** | Castilians | Spain | 15th century | new |  |
| Expansionist + Scientific | **Nezahualcoyotl** | Texcocans | central Mexico | 15th century | stays |  |
| Expansionist + Magisterial | **Cyrus the Great** | Persians | Persia | 6th century BC | new |  |
| Commerce + Devotion | **Mansa Musa** | Malians | West Africa | 14th century | stays |  |
| Commerce + Scientific | **Cleopatra** | Ptolemies | Egypt (a Greek dynasty) | 1st century BC | new |  |
| Commerce + Magisterial | **Lorenzo de' Medici** | Florentines | Florence, Italy | 15th century | new | Hatshepsut |
| Devotion + Scientific | **Harun al-Rashid** | Abbasids | Iraq | 8th century | new |  |
| Devotion + Magisterial | **Ashoka** | Mauryas | India | 3rd century BC | new | Justinian |
| Scientific + Magisterial | **Sejong the Great** | Joseon | Korea | 15th century | new |  |

| Pair | Leader | Ability I | Ability II |
|---|---|---|---|
| Dominion + Expansionist | Alexander the Great | *The Unbroken Charge*: Your units gain +3 combat strength when they attack. Capturing a city heals all your units. | *The Alexandrias*: Capturing a city grants a Settler. |
| Dominion + Commerce | Genghis Khan | *The Riders of the Steppe*: Mounted units gain +1 movement on grassland and plains. Pillaging pays half again. | *The Pax Mongolica*: Your traders cannot be plundered. Trade routes pay +3 gold. |
| Dominion + Devotion | Joan of Arc | *The Voices*: Killing a unit grants faith equal to its strength. | *The Maid*: Every city may buy military units with faith. Units bought with faith start as Veterans. |
| Dominion + Scientific | Mehmed the Conqueror | *The Enderun*: Military buildings give +2 science each. | *The Great Bombard*: Your units gain +5 combat strength against cities. Capturing a city grants science equal to thirty times its population. |
| Dominion + Magisterial | Qin Shi Huang | *The Great Works of Qin*: Garrisoned cities build wonders and buildings 25% faster. | *The Registered Households*: Every city gains +1 production for every three citizens. |
| Expansionist + Commerce | Pachacuti | *The Qhapaq Ñan*: Every city joined to your capital by road pays +1 happiness and +1 production. | *The Gold of the Peaks*: Farms pay +1 gold for every mountain standing beside them. |
| Expansionist + Devotion | Isabella of Castile | *The Charter Towns*: Cities you found start with a Shrine. | *The Union of Crowns*: Your capital gains +1 faith and +1 gold for each city you hold. |
| Expansionist + Scientific | Nezahualcoyotl | *The Dikes*: Cities with an aqueduct pay +1 culture, and their farms +1 production. | *Flower and Song*: +1 culture for every two citizens in your capital. |
| Expansionist + Magisterial | Cyrus the Great | *The Cyrus Cylinder*: Every city gains +1 culture and +1 happiness. | *The King's Gardeners*: Cities you found start with a Worker. |
| Commerce + Devotion | Mansa Musa | *The Gold of Wangara*: +2 gold on mines and camps, and +1 gold on every desert hex worked. | *The Hajj*: Trade routes that begin or end at a city holding a holy site pay +2 gold and +2 faith. |
| Commerce + Scientific | Cleopatra | *Books from the Ships*: Your trade routes pay +2 science, and your foreign routes +2 more. | *The Queen's Alliances*: Your capital gains +4 gold and +2 culture for each empire you hold a deal with. |
| Commerce + Magisterial | Lorenzo de' Medici | *The Medici Bank*: +1 renown a turn for every 100 gold in your treasury, at most +12. | *Florins*: Gold buildings give +2 culture each. |
| Devotion + Scientific | Harun al-Rashid | *The Storehouse of Wisdom*: Each faith or science building gives its city +1 science and +1 faith. | *The Learned Court*: Completing a technology grants faith equal to a fifth of its cost. |
| Devotion + Magisterial | Ashoka | *The Edicts*: Your capital gains +3 culture and +2 faith for each foreign city that follows your religion. | *The Pillars*: Culture buildings give +2 faith each. |
| Scientific + Magisterial | Sejong the Great | *The Correct Sounds*: Every city gains +1 science and +1 culture for every four citizens. | *The Royal Lectures*: Each time you gain a great person, gain science equal to four turns of your science. |

## 3. The pairs

### Dominion + Expansionist: the frontier

**Today.** **Mithridates VI** (Pontics). *The Poison King*: +2 combat strength against an empire that holds more cities. *The Groves and the Hunt*: +2 food on plantations and camps. Unique unit the Pontic Peltast, unique building the Mountain Hold.

#### Alexander the Great (Macedonians)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Expansionist.
- **Who:** King of Macedon, 356 to 323 BC. In eleven years they took the Persian empire from the Aegean to the Indus and never lost a battle. Most players know the name before any other conqueror.
- **Fit:** **Dominion, the provinces** (captured towns). Their cards read captures, captured towns held, sieges and pacification: a capture pays renown, gold, a free unit and a percentage for each town taken.
- **Fit:** **Expansionist, the frontier** (towns founded). Their cards read each founding: an extra citizen, a road home, culture, claimed hexes, a free Market.
- **Ability I, The Unbroken Charge:** Your units gain +3 combat strength when they attack. Capturing a city heals all your units.
  - Shape: Existing: `combatLine` (`side: attack`, `when: always`) and `windfallRider` on `capture` with `grant: {healAll: true}`.
  - Arithmetic: A1: +3 on strength 15 to 33 is a strong age 1 line, and it works on camps. A3: +3 on 45 is 7%, under the regular +5; the heal after each capture is the late value (it saves about five turns of rest between sieges).
- **Ability II, The Alexandrias:** Capturing a city grants a Settler.
  - Shape: **Small extension.** The windfall unit grant takes `bestMelee`, `randomMilitary` or `unlockedByTech`. It needs a unit id, as the on-draft grant already has (`settler`).
  - Arithmetic: A1: nothing in most games. A3: two to four captures give two to four Settlers; a town of five citizens is worth 40 to 80 yield a turn. Authority still limits founding. This one changes play: each conquest seeds a colony.
- **Unique unit:** **Hypaspist**: stands in the Swordsman line (age 2). +1 movement and +5 strength against cities. The base Swordsman exists.
- **Second unique:** **The Gymnasium** (building): +2 culture, and units gained in its town start with 2 experience. The shape asks for a second unique; this one is modest.
- **Start bias:** Terrain: river 2, hills 0.6, coast 0.4. No hard want. The map script serves it today.
- **Colours:** Tyrian purple, sun gold (`#6b2d7a`, `#e3b93a`).
- **Charge:** The ram's horns of Ammon, from their coin portraits. The Vergina sun is disputed between Greece and North Macedonia, so it is not used.
- **Cities:** Pella · Aigai · Amphipolis · Alexandria Eschate · Bucephala · Kandahar
- **Bot persona:** `warmonger`: attacks early and keeps the army moving.
- **Portrait (3:4, gouache poster):** Young, clean-shaven, a white diadem band, the linen cuirass of the Alexander Mosaic. A long spear in one hand, a rolled map in the other, a dry plain at dusk behind.
- **Overlaps and risks:** The new Dominion card The Companion Cavalry shares their cavalry, so the unit is not the Companions. Aristotle (their tutor) and Dinocrates (who planned Alexandria) are great people. No wonder is theirs. Cleopatra's capital is Alexandria, so this list leaves the Egyptian one out.

### Dominion + Commerce: merchants and their guards

**Today.** No leader today.

#### Genghis Khan (Mongols)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Commerce.
- **Who:** Founder of the Mongol empire, about 1162 to 1227. They joined the steppe tribes and began the largest land empire in history. Under their heirs, trade from China to Europe travelled one protected road.
- **Fit:** **Dominion, the marches** (mounted units, pillage, pastures). Their cards read hexes pillaged, mounted units and worked pastures and camps.
- **Fit:** **Commerce, the far trade and the home market** (trade routes). Their cards read routes run, foreign partners and towns that routes arrive at.
- **Ability I, The Riders of the Steppe:** Mounted units gain +1 movement on grassland and plains. Pillaging pays half again.
  - Shape: Existing and built: this is Modu Chanyu's ability of today, word for word (`unitStat`, and `windfallRider` on `pillage`, `percent: 50`).
  - Arithmetic: A1: little, until the first chariots. A3: a raiding war pillages five to ten hexes, each paying half again; riders at 5 movement reach the hexes that foot soldiers cannot.
- **Ability II, The Pax Mongolica:** Your traders cannot be plundered. Trade routes pay +3 gold.
  - Shape: Existing: `rule: tradersUnplunderable` and `pays` with `where: route`, `gold: 3`.
  - Arithmetic: A1: one or two routes, +3 to +6 gold (a regular card). A3: four to six routes, +12 to +18, under the regular 35; the rest of the value is that a seat at war keeps its routes. To tune: +4.
- **Unique unit:** **Keshig**: stands in the Horse Archer line (age 3) with 5 movement. This is the Xiongnu Horse Archer row with a new name.
- **Second unique:** **The Horde Camp** (building), as built for Modu Chanyu. Its faith on pastures could become gold.
- **Start bias:** Modu Chanyu's row as it is: grassland 0.45, plains 0.4, hills -0.3; wants `pastureGroundWithin 3`; horses furnished. Served today.
- **Colours:** sky blue, bone (`#3a78b5`, `#efe6d2`).
- **Charge:** Modu Chanyu's sun and moon banner can stay: both are steppe signs. Or a horse-tail standard.
- **Cities:** Karakorum · Avarga · Almaliq · Samarkand · Zhongdu · Sarai
- **Bot persona:** `warmonger`, with more mounted units in the army mix and routes kept running at war.
- **Portrait (3:4, gouache poster):** Older, broad-faced, a fur-trimmed robe and a plain cap, after the Yuan court album (painted after their death; no portrait from life exists). A white horse-tail standard, steppe at dawn.
- **Overlaps and risks:** Subutai (general, age 4) is a great person: a Mongol seat can call its own general, which is fine. The Dominion cards The Horde and The Naadam share the subject; none names them. Karakorum was built up by their heir; Avarga was their own camp. The conquests killed millions; the game treats them as it treats every conqueror.

### Dominion + Devotion: the holy war

**Today.** **Modu Chanyu** (Xiongnu). *The Riders of the Steppe*: mounted +1 movement on grassland and plains, pillage pays half again. *The Herds*: +1 production and +1 faith on pastures. **Joan of Arc** (French). *The Voices*: a kill pays 8 faith and presses your faith nearby. *The Maid*: +4 combat strength on ground that follows your faith.

**Pick Joan of Arc, reworked.** They are the best-known figure of a holy war, their unit, building, banner, cities and colours are built, and the roster needs women. Saladin is a good design and the better choice if you want a seat from the Crusader-era Middle East; they are the first alternate if a pair may hold two leaders.

#### Joan of Arc (French)

- **Status:** rework. **Confidence:** strong. **Decks:** Dominion + Devotion.
- **Who:** A farmer's daughter from Domrémy, about 1412 to 1431. At seventeen they led the French army to relieve Orléans and had the king crowned at Reims. They said that voices of saints sent them. Burnt at nineteen, made a saint in 1920.
- **Fit:** **Devotion, the holy war** (soldiers bought with faith, kills, losses). Their cards read units bought with faith, kills and declarations of war.
- **Fit:** **Dominion, the garrison state** (ranks). Their cards read each rank earned, and a rank a unit starts with counts as earned.
- **Ability I, The Voices:** Killing a unit grants faith equal to its strength.
  - Shape: Existing: `windfallRider` on `kill`, `grant: {yield: faith, amount: 1, fromOccasion: strength}`. Today it pays a flat 8 and presses the faith; the pressure goes, because nobody sees it.
  - Arithmetic: A1: a barbarian kill every four turns at strength 20 is about 5 faith a turn (regular). A3: a kill every two turns at strength 45 is about 22 faith a turn, at war on 45% of turns.
- **Ability II, The Maid:** Every city may buy military units with faith. Units bought with faith start as Veterans.
  - Shape: Existing: `rule: faithBuysUnits` with `class: {category: military}` and no scope, and `unitStamp` with `bought: faith`, `rank: veteran`.
  - Arithmetic: Faith buys at 2 a hammer. A1: a Spearman is 54 faith, about one Veteran every ten turns. A3: a Legionary is 162 faith, one every three to five turns at 40 to 60 faith a turn. This one changes play: faith is the army.
- **Unique unit:** **The Gendarme**, as built (age 4, +10 against cities).
- **Second unique:** **The Sainte-Chapelle** (building), as built, with one change: its "soldiers may be bought with faith here" is now the ability, so it gives +3 faith and makes units bought with faith in its city 20% cheaper (`purchaseRider`, `currency: faith`).
- **Start bias:** As today: river 3, no hard want.
- **Colours:** royal azure, gold (`#2c3e9e`, `#d9a521`).
- **Charge:** The single fleur-de-lis, approved 2026-09-19.
- **Cities:** Orléans · Reims · Paris · Bourges · Chinon · Rouen (the list of today)
- **Bot persona:** `zealot` that also attacks: a new persona row, zealot weights with the warmonger's war settings.
- **Portrait (3:4, gouache poster):** A young soldier in plain plate armour, short dark hair, no helmet. A white banner in hand, the walls of Orléans behind, morning light.
- **Overlaps and risks:** **Why rework:** today's The Maid is the Devotion card The Spiritual Host (+4 in territory that follows your religion) and does nothing before a religion spreads. Today's The Voices is the shared card The Sacred Host (kills grant 15 faith) at half the size; the new one stacks with it. The shared card The Shrine Guards (Shrine towns buy melee units with faith) is nearly dead for this seat. Notre-Dame is a wonder. A saint of a living church: the text stays plain and respectful.

#### Saladin (Ayyubids)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Devotion.
- **Who:** Sultan of Egypt and Syria, 1137 to 1193. They joined the two countries, won at Hattin and took Jerusalem back in 1187. Friend and enemy alike wrote of their mercy to the city.
- **Fit:** **Dominion, the garrison state** (garrisons). Their cards read garrisoned towns and garrisoned units: culture, production, authority, happiness, science.
- **Fit:** **Devotion, the holy war and the engine** (faith, defence, captures). Their cards read faith made, towns defended by religious buildings and soldiers bought with faith.
- **Ability I, The Defender:** Your units gain +4 combat strength inside your own borders. Capturing a city grants faith equal to thirty times its population.
  - Shape: Existing: `combatLine` with `when: ownTerritory`, and `windfallRider` on `capture` with `fromOccasion: population` (The Victory Mint's shape, in faith).
  - Arithmetic: A1: +4 at home is a strong age 1 line, for defence only. A3: +4 on 45 is 9% (regular); a city of six pays 180 faith, about five turns of faith.
- **Ability II, The Iqta:** Garrisoned cities gain +2 faith and +1 production.
  - Shape: Existing: `pays` with `where: city`, `scope: garrisoned`.
  - Arithmetic: A1: three towns, +6 faith and +3 production (9 a turn, a headline; early faith wins the race to found a religion). A3: eight towns, +16 and +8 (24, under regular).
- **Unique unit:** **Mamluk**: stands in the Horseman line (age 3). +4 strength on ground that follows your religion (the Khopesh's rule).
- **Second unique:** **The Khanqah** (building): a lodge of the devout, +1 faith and +1 happiness. They founded the first one in Egypt in 1173.
- **Start bias:** Terrain: river 3, oasis 2, desert 1; wants `riverWithin 2`. Served today (Al-Ma'mun's want).
- **Colours:** pine green, Ayyubid yellow (`#1e6a45`, `#ecc94b`).
- **Charge:** A plain eagle, drawn unlike the modern state emblems that carry Saladin's name; or a six-petal rosette.
- **Cities:** Cairo · Damascus · Aleppo · Jerusalem · Hama · Acre
- **Bot persona:** `zealot`: never declares war first, keeps a garrison in every town, and counter-attacks.
- **Portrait (3:4, gouache poster):** A lean man of fifty with a short beard, a yellow silk robe over mail and a plain turban. A hand on a sheathed sword, the walls of Jerusalem in evening light.
- **Overlaps and risks:** The Devotion Doctrine The Ribats converts a captured town and the Dominion card Pax Romana pacifies it, so the abilities do neither. Solomon's Temple (a new age 2 wonder) stands in Jerusalem. The Crusades are still a charged subject. The Ayyubid colour was yellow, which Mansa Musa holds, so yellow is the device here.

### Dominion + Scientific: the military edge

**Today.** No leader today.

#### Mehmed the Conqueror (Ottomans)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Scientific.
- **Who:** Ottoman sultan, 1432 to 1481. At twenty-one they took Constantinople with the largest cannon yet cast, and made it a capital of scholars, soldiers and builders. They knew several languages and kept Italian painters at court.
- **Fit:** **Dominion, the provinces** (sieges, captured towns) and its military buildings. Their cards read siege units, captures and Barracks, walls and Armouries.
- **Fit:** **Scientific, the elite army and institutions**. Their cards read units ahead of their age, a lead in technologies, and empire buildings such as the cannon foundry.
- **Ability I, The Enderun:** Military buildings give +2 science each.
  - Shape: Existing: `pays` with `where: city`, `basis: count`, `count: buildingsOfCategory`, `category: military`, `to: science` (The Choregia's shape).
  - Arithmetic: A1: three Barracks, +6 science against a median of 4: a headline, so +1 may be right. A3: eight towns with two or three each, +32 to +48 (regular).
- **Ability II, The Great Bombard:** Your units gain +5 combat strength against cities. Capturing a city grants science equal to thirty times its population.
  - Shape: Existing: `combatLine` with `when: vsCity`, and `windfallRider` on `capture` with `fromOccasion: population`.
  - Arithmetic: A1: +5 against walls is strong, with few sieges to use it. A3: +5 on 45 is 11%, on top of siege engines; a city of six pays 180 science, under two turns of research, so fifty times may be right.
- **Unique unit:** **Janissary**: stands in the Longswordsman line (age 4). Starts as a Veteran. The base Longswordsman exists; the game has no gunpowder foot unit to stand in for.
- **Second unique:** **The Külliye** (building): a mosque with its school and kitchen, +2 science, +2 food and +1 happiness.
- **Start bias:** Terrain: coast 1.5, hills 0.6, river 2. No hard want (a coast want was served on half of boards for Zheng He).
- **Colours:** Ottoman red, white (`#d81e2c`, `#f5f1e6`).
- **Charge:** The çintamani: three discs over two wavy lines, a pattern of their court robes. It is not the crescent of a modern flag.
- **Cities:** Istanbul · Edirne · Bursa · Thessalonica · Trebizond · Sarajevo
- **Bot persona:** `warmonger` that builds siege engines first and attacks the nearest walled capital.
- **Portrait (3:4, gouache poster):** Thirty, hooked nose, a red robe and a large white turban, after the Bellini portrait and the one where they smell a rose. A bronze bombard behind, sea walls beyond.
- **Overlaps and risks:** The Tophane, the Scientific empire building, is their own cannon foundry: a fit, and nothing requires it. Hagia Sophia (age 3 wonder) is the church they made a mosque. Mimar Sinan and Taqi al-Din are great people of later reigns. The fall of Constantinople is mourned in the Greek and Orthodox world. If Justinian also ships, two seats share a capital: the lists say Istanbul and Constantinople.

### Dominion + Magisterial: the triumph

**Today.** **Emperor Taizong** (Tang). *The Mandate*: melee units +3 combat strength and +1 movement. *The Garrison Towns*: garrisoned cities +1 happiness and +15% culture. Unique unit Tang Heavy Cavalry, unique building the Examination Court.

**Pick Qin Shi Huang.** Your picture of Dominion names "qin china", their wonders are already in the game, and without them East Asia has one seat. Augustus is the better fit for Magisterial's council and is the first alternate; Rome already colours half of Dominion's card names without a seat.

#### Qin Shi Huang (Qin)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Magisterial.
- **Who:** King of Qin, then the first emperor of China, 259 to 210 BC. They ended the Warring States, set one script, one coinage and one measure, and joined the walls of the north. They are buried with an army of clay soldiers.
- **Fit:** **Dominion, the garrison state** (garrisons, ranks). Their cards read garrisoned towns and units; your own note on that theme starts with "Qin's ranks of merit".
- **Fit:** **Magisterial, the monuments** (wonders). Their cards read wonders being built, wonders held and each wonder finished.
- **Ability I, The Great Works of Qin:** Garrisoned cities build wonders and buildings 25% faster.
  - Shape: Existing: two `productionBonus` rows (`category: wonder` and `building`) with `scope: garrisoned`.
  - Arithmetic: A1: a 150-hammer wonder in a town of 5 production comes about six turns sooner. A3: eight garrisoned towns at 15 production, about +30 toward buildings (regular). It changes play: every town wants a soldier before a mason.
- **Ability II, The Registered Households:** Every city gains +1 production for every three citizens.
  - Shape: Existing: `pays` with `where: city`, `basis: count`, `count: population`, `within: city`, `per: 3`.
  - Arithmetic: A1: 12 to 15 citizens, +4 to +5 (regular). A3: about 70 citizens, +23 (under regular). Age 4: 150 citizens, +50.
- **Unique unit:** **Qin Crossbowman**: stands in the Bowman line (age 2). +3 ranged strength, and it costs as an Archer does (size `light`).
- **Second unique:** **The Commandery** (building): the benched Post Station with a new name. Its town builds faster while a road joins it to the capital. Qin built the straight roads.
- **Start bias:** Taizong's row as it is: grassland 0.9, river 2; wants `grasslandWithin 2`. Served today.
- **Colours:** cinnabar, lacquer black (`#a83224`, `#1c1a1a`).
- **Charge:** A round coin with a square hole (the ban liang), the sign of one coinage.
- **Cities:** Xianyang · Yong · Yueyang · Handan · Linzi · Langya
- **Bot persona:** `wide`, with a garrison in every town and wonders high in the build order.
- **Portrait (3:4, gouache poster):** A heavy-set man in black robes with a flat beaded crown (the mianguan), drawn as later ages imagined them; no portrait from life exists. Ranks of clay soldiers behind, lamp light.
- **Overlaps and risks:** The Terracotta Army and The Great Wall (both age 3 wonders) are theirs: a rival may build them, as in any game of this kind. Commission: The Ranks of Merit is their own system as a card. Li Bing is a great person of Qin. Five religion names (Fangshi, Huang-Lao, Mojia, Yinyangjia, Nongjia) are schools their court used or banned. The burning of books and the killing of scholars is told by a historian of the next dynasty and its scale is debated; it sits oddly in a cabal of scholars, which can be character. Their search for the elixir fits the frame well. **Colour:** Qin's own colour was black, which Harun al-Rashid holds, so cinnabar leads here; if Harun is not picked, Qin takes black.

#### Augustus (Romans)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Magisterial.
- **Who:** First emperor of Rome, 63 BC to AD 14. They ended a century of civil war, kept the forms of the Republic and ruled as "first citizen". Their peace lasted two hundred years.
- **Fit:** **Magisterial, the monuments and the council** (wonders, culture buildings, a government that fits the times). Their cards read wonders and culture buildings built and held.
- **Fit:** **Dominion, war and peace**. Its cards pay differently at war and at peace, so an army can choose to stay home.
- **Ability I, City of Marble:** Your capital builds wonders and buildings 30% faster.
  - Shape: Existing: two `productionBonus` rows with `scope: capital`.
  - Arithmetic: A1: a capital of 8 production gains 2.4; a wonder comes about eight turns sooner. A3: a capital of 30 gains 9. Small in yield, large in wonder races.
- **Ability II, The Augustan Peace:** While you are at peace, every city gains +1 culture and +2 gold.
  - Shape: Existing: `conditionRule` with `when: atPeace` around a `pays` row.
  - Arithmetic: A1: three towns, +3 culture (worth about 9) and +6 gold: a headline. A3: eight towns, +8 and +16 (24), on the 55% of turns a Dominion seat is at peace. It changes play: war has a price, so wars are short.
- **Unique unit:** **Centurion**: stands in the Legionary line (age 3). Starts as a Veteran. The card The Praetorian Guard exists, so the unit is not a Praetorian.
- **Second unique:** **The Triumphal Arch** (building): +2 culture and +1 renown a turn, favouring great generals.
- **Start bias:** Terrain: river 3, hills 1, coast 0.4; wants `riverWithin 2`. Served today.
- **Colours:** laurel green, marble (`#5a8f2e`, `#f2eee4`).
- **Charge:** The Capricorn, the sign they claimed, which they struck on their coins.
- **Cities:** Rome · Ostia · Mediolanum · Lugdunum · Augusta Emerita · Nicopolis
- **Bot persona:** `tall` in peace with a large standing army; it answers a war and seldom starts one.
- **Portrait (3:4, gouache poster):** The Prima Porta statue as a living man: about forty, short hair, a muscle cuirass and a red cloak, one arm raised. White marble columns under scaffolding behind.
- **Overlaps and risks:** Rome is in many card names of these two decks (Pax Romana, The Marian Reforms, The Auxilia, The Proconsuls, The Field of Mars, The Grass Crown, The Twelve Tables); none names them. The Circus Maximus is a wonder. Vitruvius, Gaius Marius and Crassus are great people. Four religion names are Roman priesthoods. "Brick to marble" is from Suetonius. Their first ability is close to Qin's; only one of the two is likely to ship.

### Expansionist + Commerce: the land and the market

**Today.** **Pachacuti** (Inca) stays.

#### Pachacuti (Inca)

- **Status:** stays. **Confidence:** strong. **Decks:** Expansionist + Commerce.
- **Who:** Sapa Inca from 1438 to 1471. They turned the valley kingdom of Cusco into an empire held together by forty thousand kilometres of road.
- **Fit:** **Expansionist, the frontier** (towns joined by road) and **the raised land** (farms, terraces).
- **Fit:** **Commerce, the home market** (domestic routes; caravans lay the roads that join the towns).
- **Ability I, The Qhapaq Ñan:** Every city joined to your capital by road pays +1 happiness and +1 production.
  - Shape: Built.
  - Arithmetic: A1: three joined towns, +3 and +3. A3: eight towns, +8 and +8 (under regular). The Expansionist card The Road Home joins each new town at once, so this is on from the founding.
- **Ability II, The Gold of the Peaks:** Farms pay +1 gold for every mountain standing beside them.
  - Shape: Built.
  - Arithmetic: Depends on the map: zero to about +10 gold in age 1, more with Terraces.
- **Unique unit:** **The Slinger**, as built.
- **Second unique:** **Terraces** (improvement), as built. No unique building, by your ruling of 2026-09-15.
- **Start bias:** As built: river 6, hills 1.5, mountain 2.5; wants `mountainWithin 2`, `riverWithin 1`.
- **Colours:** maroon, sun gold (`#8b2635`, `#e0b21a`).
- **Charge:** The sun of Inti, as built.
- **Cities:** Cusco · Quito · Tumebamba · Cajamarca · Vilcashuamán · Huánuco Pampa
- **Bot persona:** `wide`.
- **Portrait (3:4, gouache poster):** A man of forty with the red fringe of the Sapa Inca on the brow, gold ear discs, a checked tunic. A stone road climbing terraces behind, high clear light.
- **Overlaps and risks:** **Note:** both abilities fit the settled decks. The Qhapaq Ñan falls behind in age 3; +2 production would keep it a regular card. Machu Picchu (age 4 wonder) is their estate.

### Expansionist + Devotion: sacred land

**Today.** No leader today.

#### Isabella of Castile (Castilians)

- **Status:** new. **Confidence:** good. **Decks:** Expansionist + Devotion.
- **Who:** Queen of Castile from 1474 to 1504. Their marriage to Ferdinand of Aragon made Spain, their war ended Muslim rule in Granada, and their ships under Columbus reached the Americas in 1492.
- **Fit:** **Expansionist, the frontier** (towns founded). Their cards read each founding and the count of towns.
- **Fit:** **Devotion, the devout realm** (Shrines first, then devout towns). Three Tier 0 and Tier I cards read Shrines: faith, food and happiness in Shrine towns, and soldiers bought there.
- **Ability I, The Charter Towns:** Cities you found start with a Shrine.
  - Shape: Existing: `foundingRider` with `building: shrine` (The Agora's shape).
  - Arithmetic: A1: three new towns save about 25 hammers each and make faith from their first turn, +3 to +6 faith (regular). A3: the hammers no longer matter; the early faith did. It changes play: each town is founded already keeping the faith.
- **Ability II, The Union of Crowns:** Your capital gains +1 faith and +1 gold for each city you hold.
  - Shape: Existing: `pays` with `where: capital`, `basis: count`, `count: cities`.
  - Arithmetic: A1: four cities, +8 (top of regular). A3: eight cities, +16 (under regular). To tune: +2 gold.
- **Unique unit:** **Jinete**: stands in the Horseman line (age 3). +1 movement, and it may move after it attacks. The light horse of the Granada war.
- **Second unique:** **The Hermandad** (building): the town brotherhood they founded in 1476. +1 happiness and +3 city defence.
- **Start bias:** Terrain: coast 1.5, plains 0.4, hills 0.5. No hard want. Served today.
- **Colours:** ermine white, Castile crimson (`#f4f1ea`, `#a8123e`).
- **Charge:** The three-towered castle of Castile. The yoke and arrows, their own badge, was reused by the Falange in the 1930s, so it is not used.
- **Cities:** Segovia · Valladolid · Toledo · Seville · Burgos · Granada
- **Bot persona:** `wide`, with the zealot's faith weights.
- **Portrait (3:4, gouache poster):** A woman of forty, fair, in a dark red gown with a white veil and a plain gold crown, after the portraits of their court. A charter with a seal in hand, a caravel in the harbour behind.
- **Overlaps and risks:** **Read this first.** The Inquisition (1478), the expulsion of the Jews (1492), the forced conversion of Muslims and the start of the conquest of the Americas belong to this reign. Pachacuti and Nezahualcoyotl, who stay, are from peoples that Castile's heirs conquered within forty years. The design names none of this, and no ability or unit uses it, but the choice may still read badly. The Alhambra (age 4 wonder) is the palace they took. The card name The Mission exists, so the building is not a mission. El Cid is a great person. Less charged leaders for this pair are in "Gaps".

### Expansionist + Scientific: the engineers

**Today.** **Nezahualcoyotl** (Texcocans) stays.

#### Nezahualcoyotl (Texcocans)

- **Status:** stays. **Confidence:** strong. **Decks:** Expansionist + Scientific.
- **Who:** Ruler of Texcoco from 1431 to 1472: poet, lawgiver and the engineer of the dike that kept the lake of Mexico sweet.
- **Fit:** **Expansionist, public works** (Aqueducts and the towns that hold them).
- **Fit:** **Scientific, great cities** (a few large towns, the capital first).
- **Ability I, The Dikes:** Cities with an aqueduct pay +1 culture, and their farms +1 production.
  - Shape: Built.
  - Arithmetic: A1: nothing before the first Aqueduct. A3: eight towns, +8 culture and about +20 production.
- **Ability II, Flower and Song:** +1 culture for every two citizens in your capital.
  - Shape: Built.
  - Arithmetic: A1: a capital of 6, +3 culture (worth 9). A3: a capital of 16, +8.
- **Unique unit:** **The Eagle Warrior**, as built.
- **Second unique:** **The Tetzcotzinco** (building), as built.
- **Start bias:** As built: lake 2.5, river 2; wants `riverOrFloodplainWithin 1`, `lakeWithin 2`.
- **Colours:** turquoise, ochre (`#1fb3a5`, `#c98b2e`).
- **Charge:** The Tlaloc mask, approved 2026-09-19.
- **Cities:** Texcoco · Tenochtitlan · Tlacopan · Huexotla · Coatlinchan · Teotihuacan
- **Bot persona:** `tall`.
- **Portrait (3:4, gouache poster):** A man of fifty in a turquoise mosaic diadem and a knotted blue cloak. A codex open on the knee, the hill gardens and the aqueduct of Tetzcotzinco behind, late sun on the lake.
- **Overlaps and risks:** **Note:** both abilities fit. The Dikes does nothing in age 1, and its +1 culture is the kind of small number you called weak on Sword and Plough; +2 culture would fix it. The Pyramid of the Sun (new age 2 wonder) is in their valley.

### Expansionist + Magisterial: shaping territory

**Today.** No leader today.

#### Cyrus the Great (Persians)

- **Status:** new. **Confidence:** good. **Decks:** Expansionist + Magisterial.
- **Who:** Founder of the Persian empire, about 600 to 530 BC. They took Media, Lydia and Babylon, let conquered peoples keep their gods and laws, and laid out at Pasargadae the first known garden in four parts.
- **Fit:** **Expansionist, the raised land and the frontier** (improved tiles, towns founded). Most of the deck reads improved tiles.
- **Fit:** **Magisterial, the landscape** (works laid out on the land, culture from the ground). The pair's own model in `deck-design.md` is the Persian garden.
- **Ability I, The Cyrus Cylinder:** Every city gains +1 culture and +1 happiness.
  - Shape: Existing: `pays` with `where: city`, and `happiness` with `per: city`.
  - Arithmetic: A1: three or four towns, +3 to +4 culture (worth about 10) and the same happiness: a headline. A3: eight towns, +8 and +8. It lets a wide realm stay content and keep drafting.
- **Ability II, The King's Gardeners:** Cities you found start with a Worker.
  - Shape: Existing: `foundingRider` with a unit (The Frontier Militia's shape). For the builder to check: that it takes a civilian id.
  - Arithmetic: A1: three Workers (30 hammers), each improving three tiles sooner, about +6 yield a turn by turn 55 (regular). A3: small. The garden below is the late half.
- **Unique unit:** **Sparabara**: stands in the Phalanx line (age 2). +5 strength when it defends. The card The Immortals exists (it is about great people), so the unit is not an Immortal.
- **Second unique:** **The Paradise Garden** (improvement): a worker lays it on flat land beside a river, a lake or an oasis. +1 food and +2 culture. A bolder option: it counts as a great-person work for your cards, one a city (a small extension on the seam The Spirit Way adds).
- **Start bias:** Terrain: river 4, plains 0.4, oasis 2; wants `riverWithin 2`. Served today.
- **Colours:** Susa glaze teal, gold (`#0f7c8c`, `#dcae3a`).
- **Charge:** A twelve-petal rosette, as on the stone of Persepolis. The winged figure (the Faravahar) is a sign of a living faith, so it is not used.
- **Cities:** Pasargadae · Ecbatana · Susa · Babylon · Sardis · Anshan
- **Bot persona:** `wide`: many towns, workers first, war only when attacked.
- **Portrait (3:4, gouache poster):** A man of fifty with a curled beard, a long pleated robe and a plain fluted crown. A hand on a clay cylinder, a walled garden with water channels behind, soft morning.
- **Overlaps and risks:** The Hanging Gardens and The Great Ziggurat stand in Babylon, which they took in 539 BC. Commission: The Paradise Garden (Magisterial) shares the garden. The Satraps is a retired card and Satrapies a technology. The Royal Road was built by Darius, so no ability claims it. Reading the Cylinder as a charter of rights is modern. Their death in battle with Tomyris is Herodotus's story.

### Commerce + Devotion: pilgrims and markets

**Today.** **Mansa Musa** (Malians) stays.

#### Mansa Musa (Malians)

- **Status:** stays. **Confidence:** strong. **Decks:** Commerce + Devotion.
- **Who:** Ruler of Mali from about 1312 to 1337. Their pilgrimage to Mecca gave away so much gold that its price in Cairo fell for years.
- **Fit:** **Commerce, the goods** (mines, luxuries, gold).
- **Fit:** **Devotion, the holy places** (holy sites as trade destinations).
- **Ability I, The Gold of Wangara:** +2 gold on mines and camps, and +1 gold on every desert hex worked.
  - Shape: Built.
  - Arithmetic: A1: three or four mines and camps, +6 to +8 gold (regular). A3: about +30.
- **Ability II, The Hajj:** Trade routes that begin or end at a city holding a holy site pay +2 gold and +2 faith.
  - Shape: Built.
  - Arithmetic: A1: nothing. A3: three or four such routes, +6 to +8 of each.
- **Unique unit:** **The Mandekalu**, as built.
- **Second unique:** **The Sankore Madrasa** (building), as built.
- **Start bias:** As built: desert 2, river 2, oasis 2; wants `aridWithin 2`; gold furnished. The arid want was served on 30% of boards.
- **Colours:** Wangara gold, indigo (`#e6c419`, `#27306e`).
- **Charge:** The royal parasol, as built.
- **Cities:** Niani · Timbuktu · Djenné · Gao · Walata · Kumbi Saleh
- **Bot persona:** `balanced`, with gold and routes weighted up.
- **Portrait (3:4, gouache poster):** Seated as on the Catalan Atlas: a gold crown, a white robe, a gold nugget held up in one hand. A mud-brick mosque and a camel train behind, noon light.
- **Overlaps and risks:** **Note:** The Hajj is weak. A holy site needs a prophet, so the line pays nothing in age 1 and most of age 2, and then only on routes that touch one town. Counting a city with a Temple as well would switch it on a whole age sooner. The Gold of Wangara stacks with The Mineral Trade, which is intended. The Great Mosque of Djenné is a wonder.

### Commerce + Scientific: the patrons

**Today.** No leader today.

#### Cleopatra (Ptolemies)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Scientific.
- **Who:** Cleopatra VII, last ruler of Ptolemaic Egypt, 69 to 30 BC. They held the richest kingdom of the sea against Rome for twenty years by treaty, grain and nerve. Plutarch says they spoke many languages.
- **Fit:** **Commerce, the far trade** (foreign routes, partners, deals). Your picture of Commerce is "the faction most interested in trade deals".
- **Fit:** **Scientific, great cities and the learned land** (a great capital, its schools, scholars). The pair's model in `deck-design.md` is Ptolemaic Alexandria.
- **Ability I, Books from the Ships:** Your trade routes pay +2 science, and your foreign routes +2 more.
  - Shape: Existing: two `pays` rows with `where: route`, the second with `crossing: international`.
  - Arithmetic: A1: one or two routes, +2 to +8 science against a median of 4. A3: five routes, three foreign, +16 (under regular). To tune: +3.
- **Ability II, The Queen's Alliances:** Your capital gains +4 gold and +2 culture for each empire you hold a deal with.
  - Shape: Existing: `pays` with `where: capital`, `basis: count`, `count: dealPartners` (The Treaty Ports reads the same count).
  - Arithmetic: A1: no deal or one, 0 to 6. A3: two or three partners, +12 to +18. It is low unless you make deals, and that is the point: this seat stays at peace and trades.
- **Unique unit:** **The Alexandrian Galley**, Hypatia's unit as built.
- **Second unique:** **The Museion** (building), Hypatia's as built: +1 science for every great person your realm has called.
- **Start bias:** Hypatia's row as it is: coast 2, river 3; wants `coastalWithin 1`, `riverWithin 2`.
- **Colours:** papyrus, deep lapis (`#e8dcae`, `#1c3f7a`).
- **Charge:** The knot of Isis (the tyet). It stands apart from the ankh.
- **Cities:** Alexandria · Cyrene · Ptolemais · Naucratis · Canopus · Pelusium (Hypatia's list)
- **Bot persona:** `tall`: one great port city, deals accepted readily, war avoided.
- **Portrait (3:4, gouache poster):** A woman of thirty with the broad diadem band and the knot of hair of their coin portraits, a Greek gown, a strong nose. Scrolls and a ship model on a table, the Pharos through the window.
- **Overlaps and risks:** The Great Library and The Great Lighthouse stood in their capital, and earlier kings of the line built them. Hypatia stays a great person (scholar, age 3) and the Mouseion is an empire building, so one city gives the game three things. "Books from the ships" was a rule of earlier Ptolemies, told by Galen. They were Greek by descent and the first of the line to learn Egyptian. Keep clear of the seductress cliché. The second ability needs bots that offer deals often enough: check in play.

### Commerce + Magisterial: the art market

**Today.** **Zheng He** (Ming). *The Treasure Fleet*: ships +2 movement and +1 sight. *Tribute of the Western Ocean*: routes to or from a coastal city pay +2 gold and +1 culture (marked deferred in the data). Unique unit the Treasure Ship, unique building the Longjiang Dockyard.

**Pick Lorenzo de' Medici.** Medici Florence is the pair's own model in `deck-design.md`, the bankers theme has no leader, and their circle translated the Hermetic books, which suits the cabal frame. Hatshepsut costs less (all of Akhenaten's pieces are reused) and adds a woman, but with Cleopatra the roster would hold two queens of Egypt, both in Commerce. If you drop Cleopatra, pick Hatshepsut.

#### Lorenzo de' Medici (Florentines)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Magisterial.
- **Who:** Banker and first citizen of Florence, 1449 to 1492, called "the Magnificent". They paid for Botticelli, the young Michelangelo and the scholars who put Plato and the Hermetic books into Latin. They ruled a republic without a title.
- **Fit:** **Commerce, the bankers** (gold kept, gold buildings, great merchants). Their cards read the treasury and Markets and Banks.
- **Fit:** **Magisterial, the patrons** (renown, great people gained and spent). Their cards read each great person gained.
- **Ability I, The Medici Bank:** +1 renown a turn for every 100 gold in your treasury, at most +12.
  - Shape: Existing: `renown` with `count: bankedGold`, `countPer: 100`, `max: 12`.
  - Arithmetic: The first great person costs 75 renown. A1: 100 to 200 gold kept, +1 to +2 renown. A3: 600 to 1,200 kept, +6 to +12, about one more great person every 25 turns. It changes play: a full treasury draws the great.
- **Ability II, Florins:** Gold buildings give +2 culture each.
  - Shape: Existing: `pays` with `count: buildingsOfCategory`, `category: gold`, `to: culture`.
  - Arithmetic: A1: one or two Markets, +2 to +4 culture (worth 6 to 12): a headline. A3: sixteen gold buildings, +32 (regular).
- **Unique unit:** **Condottiere**: stands in the Longswordsman line (age 4). It costs 40% less to buy with gold (`purchaseRider` on its own type).
- **Second unique:** **The Bottega** (building): a master's workshop. +1 production, +1 culture and +1 renown a turn.
- **Start bias:** Terrain: river 3, hills 1; wants `riverWithin 1`. Served today.
- **Colours:** iris violet, florin gold (`#7b5ea7`, `#e0b548`).
- **Charge:** The Medici balls: six discs on a shield. The Florentine lily is too close to Joan's.
- **Cities:** Florence · Pisa · Arezzo · Volterra · Prato · Pistoia
- **Bot persona:** `tall`: holds a treasury, buys buildings, avoids war.
- **Portrait (3:4, gouache poster):** A dark-haired man of forty with a broken-looking flat nose and a strong jaw, a plain red gown, after the Verrocchio bust and the Vasari portrait. A ledger and a small bronze on the desk, the dome of Florence in the window.
- **Overlaps and risks:** **A clash to settle:** Cosimo de' Medici is a great person (merchant, age 5), so this seat could call their own grandfather. Replace that row (Jacques Cœur suits the age) or accept it. Leonardo is a great person too, which is fine. Magnificence is a Magisterial card and their epithet, so no ability uses the word. The Commerce card that buys great people with gold is their history as a card, so the ability does not copy it. Europe is already the largest group.

#### Hatshepsut (Egyptians)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Magisterial.
- **Who:** Pharaoh of Egypt, about 1479 to 1458 BC. Their fleet sailed to Punt and came home with incense trees, gold and ebony. They raised the terraced temple at Deir el-Bahari and the tallest obelisk still standing in Egypt, at Karnak.
- **Fit:** **Commerce, the goods and the far trade** (luxury kinds held, routes). Their cards read different luxuries and each route.
- **Fit:** **Magisterial, the monuments** (wonders built and held). Their cards read each wonder.
- **Ability I, The Voyage to Punt:** Each different luxury you hold gives +10% production toward wonders, at most +50%.
  - Shape: Existing: `productionBonus` with `category: wonder`, `count: uniqueLuxuries`, `max: 5`.
  - Arithmetic: A1: two or three luxuries, +20% to +30% (Akhenaten has +20% today). A3: five, +50%; the best wonder cards give +25% to +30%. It changes play: trade and claims buy monuments.
- **Ability II, The Obelisks:** You may run one more trade route for each wonder you hold, at most +4.
  - Shape: Existing: `routeRider` with `count: wonders`, `max: 4`.
  - Arithmetic: A1: one wonder, one route, 4 to 8 yield (regular). A3: three wonders, three routes at 10 to 20 each, 30 to 60 (regular).
- **Unique unit:** **The Khopesh**, Akhenaten's unit as built. Its strength on the faith's ground becomes strength inside your own borders.
- **Second unique:** **The Obelisk** (building), Akhenaten's as built.
- **Start bias:** Akhenaten's row as it is: river 4, floodplain 3, oasis 3, desert 2; wants `riverOrFloodplainWithin 1`, `aridBeside 3`.
- **Colours:** sun orange, lapis (`#e0852a`, `#234b9a`).
- **Charge:** Akhenaten's ankh, as built.
- **Cities:** Thebes · Memphis · Heliopolis · Abydos · Elephantine · Coptos (Akhenaten's list without Akhetaten, which was built a century later)
- **Bot persona:** `tall`: wonders first, routes second.
- **Portrait (3:4, gouache poster):** As their own statues show them: the striped headcloth, the broad collar and the false beard of a king on a calm, fine-boned face. Incense trees in baskets, the terraces of Deir el-Bahari behind, hard sun.
- **Overlaps and risks:** Senenmut, their steward, is a retired great-person row. The Great Sphinx, The Pyramids and The Temple of Thoth are Egyptian wonders and none is theirs. With Cleopatra there would be two Egyptian queens in Commerce. Their images were cut away about twenty years after their death; the reason is debated.

### Devotion + Scientific: scholars of the faith

**Today.** **Al-Ma'mun** (Abbasids). *The Mu'tazila*: +1 science for every fifth point of faith a turn. *The House of Wisdom*: +2 food for every faith or science building in a city. Unique unit the Camel Archer, unique building the House of Learning.

#### Harun al-Rashid (Abbasids)

- **Status:** new. **Confidence:** good. **Decks:** Devotion + Scientific.
- **Who:** Caliph in Baghdad from 786 to 809, the caliph of the Thousand and One Nights. Their court was the richest of its age; they sent Charlemagne an elephant and a water clock, and their library grew into the House of Wisdom.
- **Fit:** **Devotion, the engine and the devout realm** (faith made and spent, faith buildings).
- **Fit:** **Scientific, great cities and institutions** (science buildings in a few great towns, technologies finished).
- **Ability I, The Storehouse of Wisdom:** Each faith or science building gives its city +1 science and +1 faith.
  - Shape: Existing and nearly built: Al-Ma'mun's second ability is this row with food (`count: buildingsOfCategories`).
  - Arithmetic: A1: four such buildings, +4 and +4 (regular). A3: eight towns with four each, +32 and +32 (64, the top of regular). To tune.
- **Ability II, The Learned Court:** Completing a technology grants faith equal to a fifth of its cost.
  - Shape: Existing: `windfallRider` on `tech` with `fromOccasion: techCost`, `amount: 0.2`.
  - Arithmetic: A1: technologies cost 13 to 100, so 3 to 20 faith each, one to three a turn. A3: a technology every seven turns pays a large lump, about 20 faith a turn. It changes play: research feeds the rites and the faith purchases.
- **Unique unit:** **The Camel Archer**, Al-Ma'mun's unit as built.
- **Second unique:** **The House of Learning** (building), Al-Ma'mun's as built.
- **Start bias:** Al-Ma'mun's row as it is: river 5, coast 0.6; wants `riverWithin 2`.
- **Colours:** Abbasid black, gold (`#1c1a1a`, `#d4a934`).
- **Charge:** Al-Ma'mun's palmette on the black field, as built.
- **Cities:** Baghdad · Raqqa · Kufa · Basra · Merv · Rayy (Al-Ma'mun's list without Samarra, which was built after them)
- **Bot persona:** `zealot`, with science weighted beside faith.
- **Portrait (3:4, gouache poster):** A man of forty with a full dark beard, a black robe and turban with gold bands. A brass water clock and a pile of books, the round city of Baghdad at night behind, lamp light.
- **Overlaps and risks:** **History, stated plainly:** the House of Wisdom's fame belongs more to their son al-Ma'mun, today's leader of this pair. Harun is the better-known name; al-Ma'mun is the closer fit. The Harun of the Nights is legend. The House of Wisdom is a wonder (age 4) and a shared card name. The Bimaristan, a Scientific empire building, was first raised in Baghdad in their reign. al-Khwarizmi is a great person of the next reign. The cards The Translation Movement and The Round City share the city. **Colour:** black, which Qin Shi Huang also claims.

### Devotion + Magisterial: the cathedral

**Today.** **Akhenaten** (Egyptians). *The Great Works*: cities with a holy site make wonders 20% faster. *The Nile's Gift*: +1 faith on farms that drink fresh water. **Hildegard of Bingen** (Rhinelanders). *The Rites*: cities keeping a rite pay +20% culture. *Symphonia*: +2 culture and +2 production for every faith building in a city.

**Pick Ashoka.** South Asia has no seat without them, and Devotion's themes pass says no leader points at the spreading faith, whose model it names as "Ashoka's missionaries". Justinian is the pair's own model (Byzantium) and a fine design; they are the alternate, and the first to add if a pair may hold two leaders.

#### Ashoka (Mauryas)

- **Status:** new. **Confidence:** strong. **Decks:** Devotion + Magisterial.
- **Who:** Emperor of most of India, about 268 to 232 BC. After the war on Kalinga they turned to the Buddha's teaching, cut their edicts into rocks and pillars, and sent teachers as far as Sri Lanka and the Greek kings.
- **Fit:** **Devotion, the spreading faith** (followers abroad, clergy, conversions). Their cards read foreign cities that follow your religion and each town converted.
- **Fit:** **Magisterial, the engine and the monuments** (culture buildings as the base). Their cards read Monuments and other culture buildings.
- **Ability I, The Edicts:** Your capital gains +3 culture and +2 faith for each foreign city that follows your religion.
  - Shape: Existing: `pays` with `basis: count`, `count: followingForeign`, capital scope (The Living Hymnal's shape, for foreign cities).
  - Arithmetic: A1: nothing. A3: four to six foreign cities, +12 to +18 culture and +8 to +12 faith (low regular), with no cap. It changes play: the faith is sent abroad, not kept at home.
- **Ability II, The Pillars:** Culture buildings give +2 faith each.
  - Shape: Existing: `pays` with `count: buildingsOfCategory`, `category: culture`, `to: faith`.
  - Arithmetic: A1: three Monuments, +6 faith (regular), which wins the race to found a religion. A3: sixteen culture buildings, +32 (regular).
- **Unique unit:** **Envoy of the Law** (their dhamma-mahamatta): an Apostle with one more charge. The Canoness's row is the model.
- **Second unique:** **The Stupa** (building): +2 faith, +1 culture and +1 happiness.
- **Start bias:** Terrain: river 4, forest 1; wants `riverWithin 1`. Served on 70% of boards (Hildegard's want).
- **Colours:** sandstone buff, peacock blue (`#c9a27a`, `#12607a`).
- **Charge:** One pillar with a bell-shaped capital. The lion capital and the 24-spoke wheel are the emblem and flag of India, so they are not used.
- **Cities:** Pataliputra · Taxila · Ujjain · Tosali · Suvarnagiri · Sanchi
- **Bot persona:** `zealot`: spreads the faith with clergy and never declares war.
- **Portrait (3:4, gouache poster):** A man of fifty in a plain white cloth with one shoulder bare, a simple gold band, a calm face; no portrait from life exists. A hand on a polished sandstone pillar, a stupa and a fig tree behind, evening.
- **Overlaps and risks:** Buddhism is a living faith. The game's religions have invented names, so no ability names it; the biography does. The Iron Pillar (new age 2 wonder) is 600 years later and not theirs, though players may link them. Ajivika, a religion name, is a sect they gave caves to. The base War Elephant is the natural Mauryan unit, but a soldier would go against their story.

#### Justinian (Byzantines)

- **Status:** new. **Confidence:** good. **Decks:** Devotion + Magisterial.
- **Who:** Emperor in Constantinople from 527 to 565. They built Hagia Sophia in five years, set Roman law in one code that Europe still uses, and sent Belisarius to take back Africa and Italy.
- **Fit:** **Magisterial, the monuments** (each wonder finished and held).
- **Fit:** **Devotion, the engine and the devout realm** (faith spent, faith buildings, large content cities). Your picture of Devotion names Constantinople.
- **Ability I, Solomon, I Have Surpassed You:** Completing a wonder grants faith equal to its production cost.
  - Shape: Existing: `windfallRider` on `completion` with `wonder: true`, `fromOccasion: production`. For the builder to check: that a completion carries the cost.
  - Arithmetic: A1: one wonder of about 150 hammers pays 150 faith; a religion's first two gods cost 96. A3: 500 to 800 a wonder, the bar's lump for that band. It changes play: every wonder funds the faith.
- **Ability II, One Faith, One Empire:** Faith buildings give +1 happiness and +1 culture each.
  - Shape: Existing: two `pays` rows with `count: buildingsOfCategory`, `category: faith`.
  - Arithmetic: A1: three Shrines, +3 and +3 (culture worth 9). A3: sixteen faith buildings, +16 and +16.
- **Unique unit:** **Cataphract**: the retired row (age 3, +5 against ranged units), opened again for this seat.
- **Second unique:** **The Basilica** (building): +2 faith, +2 culture and +3 city defence.
- **Start bias:** Terrain: coast 2, hills 0.6, river 2. No hard want.
- **Colours:** porphyry, mosaic gold (`#5a1e4a`, `#d9b23c`).
- **Charge:** A dome on four arches. The double-headed eagle is 700 years later.
- **Cities:** Constantinople · Ravenna · Carthage · Thessalonica · Antioch · Justiniana Prima
- **Bot persona:** `tall`: wonders in the capital, walls, a small strong army.
- **Portrait (3:4, gouache poster):** The Ravenna mosaic as a living man: round face, dark eyes, a purple cloak with a gold panel and a jewelled crown. A model of the great church in hand, gold light.
- **Overlaps and risks:** Hagia Sophia (age 3 wonder) is their church, so a rival may build it. The Pandects, a Magisterial card, is their law book. "Justinian and Theodora" are on the shelf as a pair in `docs/leaders.md`; Theodora could share the portrait. They closed the school of Athens in 529 and put down the Nika riot with a massacre. The quote is from a later source. Purple is close to Alexander's.

### Scientific + Magisterial: the academy

**Today.** **Hypatia** (Alexandrians). *The Museion*: +25% renown. *The Commentaries*: a great person's work pays half again of what it makes. Unique unit the Alexandrian Galley, unique building the Museion.

#### Sejong the Great (Joseon)

- **Status:** new. **Confidence:** strong. **Decks:** Scientific + Magisterial.
- **Who:** King of Joseon Korea from 1418 to 1450. They made the Korean alphabet so that common people could read, filled the Hall of Worthies with scholars, and raised an engineer born a slave to build clocks and rain gauges.
- **Fit:** **Scientific, great cities and the learned land** (citizens who feed the schools, scholars).
- **Fit:** **Magisterial, the patrons** (great people of every family gained). Their cards read each great person gained.
- **Ability I, The Correct Sounds:** Every city gains +1 science and +1 culture for every four citizens.
  - Shape: Existing: two `pays` rows with `count: population`, `within: city`, `per: 4` (The Scribes' Hall without the Library).
  - Arithmetic: A1: 12 to 15 citizens, +3 and +3 (culture worth 9): a headline. A3: 70 citizens, +17 and +17 (34, regular). Age 4: 150 citizens, +37 and +37.
- **Ability II, The Royal Lectures:** Each time you gain a great person, gain science equal to four turns of your science.
  - Shape: Existing: `windfallRider` on `greatPersonGained` with `fromRate: sciencePerTurn`, `amount: 4` (The Doctorate's shape, for any family).
  - Arithmetic: A1: at most one great person, about 16 science. A3: one every 20 turns at 106 science a turn is 424 a time, about 21 a turn. It changes play: a science seat wants every family of great person.
- **Unique unit:** **Hwacha**: stands in the Trebuchet line (age 4). +10 ranged strength against units, and no bonus against cities.
- **Second unique:** **The Hall of Worthies** (building): a new row with the Museion's rule, +1 science for every great person your realm has called.
- **Start bias:** Terrain: river 3, hills 1, coast 0.5; wants `riverWithin 2`. Served today.
- **Colours:** ink navy, porcelain white (`#25346b`, `#f3f1ea`).
- **Charge:** The bowl sundial of their reign (the angbuilgu): a half circle with a pointer.
- **Cities:** Hanseong · Gaeseong · Pyongyang · Gyeongju · Jeonju · Hamhung
- **Bot persona:** `tall`: science first, great people of any family taken when offered.
- **Portrait (3:4, gouache poster):** A man of forty in the red dragon robe and the black winged cap of a Joseon king, a gentle scholarly face, after the modern standard portrait (none from life survives). A printed page of the new letters in hand, a water clock behind.
- **Overlaps and risks:** Yi Sun-sin (general, age 5) is a great person of Joseon 150 years later, which is fine. The Magisterial cards The Jinshi and The Hanlin Academy are the Chinese models of their court. Hwarang, a religion name, is from Silla, not Joseon. A much-loved figure in Korea, on the 10,000 won note.

## 4. Ibn Battuta

- **Ibn Battuta is a real, playable leader, and the only one outside the pair grid.** The row in `data/leaders.json` has `rainbow: true` in place of `decks`.
- `leaderDecks` (`src/sim/leaderData.ts`) gives a rainbow seat all six decks, and each hand it is dealt samples two different decks (`src/sim/statecraft/draft.ts`). The leader screen prints "Rainbow · every deck" (`src/ui/leaderSelect.ts`).
- Their abilities are *A Guest at Every Court* (one more chair in every government) and *The Rihla* (the first redraw of every hand costs nothing). Unique unit the Rihla Caravan, unique building the Funduq. No start bias, by design.
- So they are the "no fixed deck" option: the generalist seat you asked for on 2026-09-11 ("the generalist, react to what you're given"). They are not a placeholder.
- Two things to know. Both abilities are draft effects, the kind you now reject. And Ibn Battuta is also a great person (merchant, age 4), which is why the leader's key is `ibnBattutaOfTangier`.
- This pass leaves the seat as it is. If the roster becomes one leader a pair, the rainbow seat is a sixteenth, and a better-known traveller could hold it (Marco Polo is a great person too, so the same clash would follow).

## 5. Gaps in the spread, and three more candidates

The recommended fifteen, by region: Europe four (Alexander, Joan of Arc, Isabella, Lorenzo); the Middle East and Egypt four (Mehmed, Cyrus, Cleopatra, Harun al-Rashid); East Asia and the steppe three (Qin Shi Huang, Sejong, Genghis Khan); the Americas two (Pachacuti, Nezahualcoyotl); South Asia one (Ashoka); sub-Saharan Africa one (Mansa Musa).

- **Women: three of fifteen** (Joan of Arc, Isabella, Cleopatra). Today it is three of thirteen (Joan, Hypatia, Hildegard).
- **Southeast Asia, the Pacific and Japan: none.**
- **Sub-Saharan Africa: Mali only.** North America: none; the two American seats are both from the 15th century.
- **Time: seven of fifteen lived in the 15th century** (Pachacuti, Nezahualcoyotl, Sejong, Joan of Arc, Mehmed, Lorenzo, Isabella). Five are ancient. Only Harun al-Rashid stands between the year 1 and the year 1100.
- East Asia loses a seat if you pick Augustus over Qin Shi Huang. South Asia loses its only seat if you pick Justinian over Ashoka.

Three more mainstream candidates that would each fix a gap. They are not designed here.

- **Wu Zetian** (Zhou (Tang China), ruled 690 to 705). Decks: Dominion + Magisterial, or Devotion + Magisterial.
  - The only woman to rule China in their own name. They widened the examinations and used the Buddhist church to hold the throne.
  - Fixes women and East Asia at once, and reuses all of Taizong's pieces (Tang Heavy Cavalry, the Examination Court, the city list from Luoyang, jade and ivory, the dragon banner).
- **Shaka** (Zulu, about 1787 to 1828). Decks: Dominion + Expansionist.
  - They turned a small clan into a kingdom with age regiments, the short spear and the horns formation.
  - Fixes sub-Saharan Africa beyond Mali. The new Dominion card The Amabutho is their regiments, so the unit would be the Impi. A rival to Alexander for the pair.
- **Jayavarman VII** (Khmer, ruled about 1181 to 1218). Decks: Devotion + Magisterial, or Expansionist + Devotion.
  - Builder of Angkor Thom, the Bayon and 102 hospitals. Already on the shelf in `docs/leaders.md`.
  - Fixes Southeast Asia. On Expansionist + Devotion (temple cities and their reservoirs) they would replace Isabella with a far less charged figure. Angkor Wat is a wonder of an earlier king.

## 6. What a successor can reuse

- **Genghis Khan takes all of Modu Chanyu's kit.** The first ability is Modu's as built. The Xiongnu Horse Archer becomes the Keshig. The Horde Camp, the start bias, the colours and the sun and moon banner stay. New: one ability row, a city list, a portrait.
- **Cleopatra takes all of Hypatia's kit:** the Alexandrian Galley, the Museion, the city list, the colours and the start bias. New: two ability rows, a banner, a portrait. Hypatia stays a great person.
- **Harun al-Rashid takes all of Al-Ma'mun's kit:** the Camel Archer, the House of Learning, the colours, the banner and the start bias. The first ability is Al-Ma'mun's second with other yields. The city list drops Samarra and adds Raqqa.
- **Hatshepsut would take all of Akhenaten's kit:** the Khopesh (with one rule changed), the Obelisk, the ankh banner, the colours and the start bias. The city list drops Akhetaten. The benched Valley of Kings also suits them.
- **Joan of Arc keeps everything** but the two ability rows and one clause of the Sainte-Chapelle.
- **Qin Shi Huang takes part of Taizong's kit:** the start bias, and the benched Post Station as the Commandery. The Examination Court and the Tang Heavy Cavalry do not fit Qin (the examinations are 800 years later). They would fit Wu Zetian whole.
- **Justinian opens the retired Cataphract row.** Basil II, for whom it was meant, stays on the shelf.
- **Sejong's Hall of Worthies is the Museion's rule on a new row.** The Examination Court would also suit Joseon, but its rule reads Military chairs.
- **The bench after the change:** the Pontic Peltast and the Mountain Hold (Mithridates), the Tang Heavy Cavalry and the Examination Court (Taizong), the Treasure Ship and the Longjiang Dockyard (Zheng He), the Canoness and the Scriptorium (Hildegard), and the first cut's pieces. The Canoness's row is the model for Ashoka's envoy.
- **Abilities that leave with their leaders** stay valid rows of effects and can be reused by any later leader: The Mandate, The Garrison Towns, The Herds, The Poison King, The Groves and the Hunt, The Great Works, The Nile's Gift, The Mu'tazila, The Treasure Fleet, The Museion (+25% renown), The Commentaries, The Rites, Symphonia.

## 7. Colours

Two for each leader, as in `docs/leaders.md`, "The colours". The distance is the game's own measure (`inkDistance`, `src/art/seatInks.ts`); the rule is 40 between primaries. Every pair here is over the rule, so any mix of candidates can ship. Reused colours come from the leader who leaves.

| Leader | Status | Primary | Secondary | Words | Nearest primary | Distance |
|---|---|---|---|---|---|---|
| Pachacuti | stays | `#8b2635` | `#e0b21a` | maroon, sun gold | Qin Shi Huang | 59 |
| Nezahualcoyotl | stays | `#1fb3a5` | `#c98b2e` | turquoise, ochre | Cyrus the Great | 120 |
| Mansa Musa | stays | `#e6c419` | `#27306e` | Wangara gold, indigo | Hatshepsut | 129 |
| Ibn Battuta | today | `#b5651d` | `#0d6b78` | ochre, sea teal | Hatshepsut | 98 |
| Alexander the Great | new | `#6b2d7a` | `#e3b93a` | Tyrian purple, sun gold | Justinian | 87 |
| Genghis Khan | new | `#3a78b5` | `#efe6d2` | sky blue, bone | Cyrus the Great | 94 |
| Saladin | new | `#1e6a45` | `#ecc94b` | pine green, Ayyubid yellow | Augustus | 122 |
| Joan of Arc | rework | `#2c3e9e` | `#d9a521` | royal azure, gold | Sejong the Great | 89 |
| Mehmed the Conqueror | new | `#d81e2c` | `#f5f1e6` | Ottoman red, white | Qin Shi Huang | 90 |
| Qin Shi Huang | new | `#a83224` | `#1c1a1a` | cinnabar, lacquer black | Pachacuti | 59 |
| Augustus | new | `#5a8f2e` | `#f2eee4` | laurel green, marble | Saladin | 122 |
| Isabella of Castile | new | `#f4f1ea` | `#a8123e` | ermine white, Castile crimson | Cleopatra | 98 |
| Cyrus the Great | new | `#0f7c8c` | `#dcae3a` | Susa glaze teal, gold | Genghis Khan | 94 |
| Cleopatra | new | `#e8dcae` | `#1c3f7a` | papyrus, deep lapis | Isabella of Castile | 98 |
| Lorenzo de' Medici | new | `#7b5ea7` | `#e0b548` | iris violet, florin gold | Genghis Khan | 115 |
| Hatshepsut | new | `#e0852a` | `#234b9a` | sun orange, lapis | Ibn Battuta | 98 |
| Harun al-Rashid | new | `#1c1a1a` | `#d4a934` | Abbasid black, gold | Justinian | 123 |
| Justinian | new | `#5a1e4a` | `#d9b23c` | porphyry, mosaic gold | Pachacuti | 85 |
| Ashoka | new | `#c9a27a` | `#12607a` | sandstone buff, peacock blue | Hatshepsut | 137 |
| Sejong the Great | new | `#25346b` | `#f3f1ea` | ink navy, porcelain white | Joan of Arc | 89 |

Close to the eye, though over the rule:

- Pachacuti and Qin Shi Huang (59).
- Qin Shi Huang and Harun al-Rashid both have black as their historic colour. Harun keeps it, because the banner is drawn; Qin leads with cinnabar.
- The roster would hold three reds (Pachacuti, Mehmed, Qin) and three blues (Genghis Khan, Joan of Arc, Sejong), told apart by how light they are.

## 8. For the builder

- **Leader rows** (`data/leaders.json`): eleven new rows and one changed row for the recommended fifteen. Each has `name`, `people`, `decks`, two `abilities`, `unit`, `building` or `improvement`, `colors`, `cities`, `startBias`.
- **Leaders that leave.** A save is `{config, log}`, and a config that names a removed leader will not replay. Keep the nine rows and hide them from the leader screen (a `retired` flag on `LeaderDef`, as card rows have), or accept that old saves break. This needs your builder's check of `validateLeaders` (`src/sim/leaderData.ts`).
- **New shapes: none. Small extensions: one.** Alexander's "Capturing a city grants a Settler" needs a unit id on the windfall unit grant (`WindfallGrantSpec.unit` in `src/sim/statecraftData.ts`, read in `payWindfallGrants`). Every other ability of the sixteen candidates uses a shape that a live or built row already uses.
- **Three points to check in the code:** that `foundingRider` takes a civilian unit id (Cyrus); that a `completion` rider can measure `production` (Justinian); that `renown` reads `count: bankedGold` with `countPer` (Lorenzo).
- **Unit rows** (`data/units.json`, `unlockedByLeader: true`): Hypaspist, Janissary, Qin Crossbowman, Jinete, Sparabara, Condottiere, Envoy of the Law, Hwacha; the Keshig is a rename. Each needs a size, a column, a model class and its one rule. A unit's own rule rides its row (`UnitDef.effects`).
- **Building and improvement rows:** the Gymnasium, the Külliye, the Hermandad, the Bottega, the Stupa, the Hall of Worthies, the Commandery (the Post Station renamed, with an earlier column), and the Paradise Garden in `data/improvements.json` (`unlockedByLeader`, as the Terraces).
- **A note on "replaces".** `docs/leaders.md` says a unique building replaces a base one, but the data rows stand beside the base building. The blocks here say what each row gives and leave that as it is.
- **The second unique.** `LeaderDef` asks for a building or an improvement on every row. This pass gives each new leader a modest one. If you would rather drop the rule, six of the eight new building rows can go.
- **Great people:** if Lorenzo ships, replace or keep the Cosimo de' Medici row (`data/greatPeople.json`). No other candidate is a great person.
- **Colours:** the table in "Colours" below. `test/render/seatInks.test.ts` asks for 40 between primaries; the closest pair here is at 59.
- **Banners** (`src/art/leaderBanners.ts`, `public/banners/`): eight new drawings; three reused (Modu's, Al-Ma'mun's, Joan's). Then `flair.html?review=banners`.
- **Bot personas** (`data/ai.json`, `personas`): five exist (balanced, wide, tall, zealot, warmonger). Each block names one. Joan needs a sixth: a zealot that attacks.
- **Start biases:** every bias uses a term the chooser has. Re-run the seed sweep with the new cast (`castFor` in `test/mapgen/leaderCriteria.ts`) and update the rates in `docs/mapgen.md`. That sweep is in the slow tier.
- **Tests and docs:** `test/sim/leaders.test.ts` and `test/render/seatInks.test.ts` hold the doc tables to the data, so `docs/leaders.md` ("The thirteen", "The biases", "The colours", "The cities") changes with the rows. Also `.claude/skills/card-design/SKILL.md` ("Leaders"), `references/deck-maps.md`, the "Leaders" part of each `docs/plans/<deck>-themes.md`, `test/ui/seatRoster.test.ts` if it names leaders, and the Compendium's leader shelf (generated).
- **Card checks after the build:** The Shrine Guards is nearly dead for Joan. Mansa Musa's The Hajj and Nezahualcoyotl's The Dikes are weak early (see their blocks).

## 9. Questions for you

1. **One leader a pair, or two on some pairs?** I recommend fifteen now, one a pair. The alternates (Saladin, Augustus, Justinian) can be added later as second leaders with no change to the fifteen.
2. **The four contested pairs.** My picks are Joan of Arc (over Saladin), Qin Shi Huang (over Augustus), Lorenzo de' Medici (over Hatshepsut) and Ashoka (over Justinian). Which do you change?
3. **Isabella of Castile.** The fit to the decks is good and the history is heavy (the Inquisition, the expulsions, the Americas, with two American leaders in the same roster). Keep them, or take Jayavarman VII for Expansionist + Devotion?
4. **Ibn Battuta.** Keep the seat that plays every deck as a sixteenth leader, with a later rework of its two draft abilities? I recommend yes.

## 10. What I could not check

- No bot game was run, so no number is measured.
- The history is from memory. The points most worth a check before any text ships: the House of Wisdom under Harun, the "books from the ships" story, the Hagia Sophia quote, and the dates of the Hermandad and the first khanqah.
- Whether bots offer deals often enough for Cleopatra's second ability.
- The three code points in "For the builder".
- Whether a portrait in the wonder paintings' style reads well at 3:4: no portrait was drawn.

## The user's comments on the page (2026-11-19)

The user commented on the review page ("ok i commented on the leader page").
The comments below are the user's words. They are the spec. A leader or a line
with no comment is not yet ruled.

| Leader | On | The user's comment |
|---|---|---|
| Alexander the Great | ability two, The Alexandrias (a capture grants a Settler) | "Change: training a military unit gives science equal to half the unit's strength." |
| Alexander the Great | the building, The Gymnasium | "Basilikoi: +2 culture, +1 science and culture on all strategic resources in the city, unlocks with the barracks." and "counts as a military building" |
| Genghis Khan | the building, The Horde Camp | "what does the horde camp do? A better effect for genghis khan: trade routes from this city can travel twice as far. +30% production towards mounted units, counts as a military building." |
| Genghis Khan | the colours (sky blue, bone) | "should the colors change?" |
| Joan of Arc | ability two, The Maid (buy units with faith; they start as Veterans) | "lets revert: units killed spread their faith, your units gain strength in cities that follow your religion." |
| Joan of Arc | the building, The Sainte-Chapelle | "keep it as it was." |
| Mehmed the Conqueror | ability one, The Enderun (military buildings give +2 science each) | "Barracks give +1 science, an additional +1 for every great scholar or great general you've recruited this game." |
| Mehmed the Conqueror | the building, The Külliye | "change: +2 science, +2 faith, +1 happiness." |
| Qin Shi Huang | the leader | "this design is great." |
| Isabella of Castile | the leader | "what does jayavarman look like? i dont like isabella as a pick." |
| Nezahualcoyotl | ability one, The Dikes | "cities with an aqueduct gain +1 science and +1 production on farms. Aqueducts arrive late so this should be stronger." |
| Cyrus the Great | ability one, The Cyrus Cylinder | "revise: cities connected by road gain +1 happiness and +2 culture for every civic and wildcard slot in your government." |
| Cyrus the Great | the improvement, The Paradise Garden | "that's so good. let's say +1 happiness and +1 culture and counts as a great person work." |
| Cleopatra | the leader | "great, i like her kit." |
| Cleopatra | the building, The Museion | "let's buff this to +2 science for every great person called." |
| Cleopatra | ability two, The Queen's Alliances | "lets make this +4 gold and +2 culture per age." |
| Lorenzo de' Medici | ability one, The Medici Bank | "let's change this to +1 renown for every 8 gold per turn you earn." |
| Lorenzo de' Medici | ability two, Florins | "lets change this to: gain 10% production towards wonders for every gold building in a city." |
| Lorenzo de' Medici | the building, The Bottega | "+5 renown towards great engineers and great artists (+10 total). +2 production for every luxury resource or great work in this city." |
| Hatshepsut | the leader | "not needed" |
| Harun al-Rashid | ability one, The Storehouse of Wisdom | "+1 science and +1 faith on faith and science buildings. (these can be multiplied by orders)." |
| Justinian | ability two, One Faith, One Empire | "+2 happiness and +5 production on holy sites." |
| Justinian | the building, The Basilica | "+3 faith and +3 city defense. +20% production towards wonders if the city has a holy site (should unlock in age 2, counts as a defensive building and a faith building)." |
| Sejong the Great | ability two, The Royal Lectures | "Each time you complete a technology, gain an extra turn of renown." |
| Sejong the Great | the building, The Hall of Worthies | "Rework: +5 renown towards scholars. +4 science." |

What follows:
- **Out:** Isabella of Castile and Hatshepsut.
- **Approved as designed:** Qin Shi Huang; Cleopatra with two changes.
- **A design is wanted for Jayavarman VII** (Expansionist + Devotion).
- **No comment yet:** Saladin, Augustus, Ashoka, Pachacuti, Mansa Musa, and the
  lines of the others that have no row above. The user edited Justinian and
  did not comment on Ashoka, so the Devotion + Magisterial pick is open.

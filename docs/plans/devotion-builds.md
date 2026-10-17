# Devotion: the faith economy, and the inward and outward builds with their flavours (proposal)

The user's request, 2026-10-17, verbatim:

> *"could you do the same builds/card-design skill treatment for the remaining decks? commerce science magisterial and devotion"*

This file is Devotion's. Commerce, Scientific and Magisterial each have their own, written at the same time.

**Status:** first draft, 2026-10-17. Nothing here is built, and the deck sheet (`docs/decks/devotion.md`) is unchanged. Once the user rules, the map goes into the skill's deck map (`.claude/skills/card-design/references/deck-maps.md`), and the cards and their types go onto the sheet.

**The method** is the card-design skill's stages 1, 2 and 7: the map, finished builds in an early and a late version, and the card types. The shape follows the Expansionist builds, which the user liked (`docs/plans/expansionist-builds.md`): one build for the deck's core idea, two main builds with shared cards and flavour cards, and the flexing between them. The builds grow out of the sheet's own arcs: faith instead of production, holy sites and rites at home, spreading the faith, and the holy war.

## How to read this

- **Chairs:** 3 at the start (the Chiefdom), 5 from draft 4 (Tier I), still 5 from draft 10 (Tier II), 8 from draft 18 (Tier III) and 11 from draft 26 (Tier IV). The move of Tier IV from 29 to 26 drafts was ruled on 2026-10-17 (`docs/flags.md` (ddddddd)) and is not built yet.
- **Typed chairs:** every government seats a mix of Military, Economic, Civic and Wildcard chairs (`docs/plans/doctrines-governments-chairs.md`, section 4). A card fits a chair of its own type or a Wildcard chair. So each council below names the government that seats it, chair by chair. Where Devotion has no card of a chair's type for that build, the chair goes to the partner deck.
- **Early build:** the five chairs of Tiers I and II. Its **five-chair core** is the council at Tier I; the council at Tier II shows what the five chairs become.
- **Late build:** the eight chairs at Tier III and the eleven at Tier IV, of Tier III and IV cards plus the early cards still seated.
- **Status:** *live* (in the game; *built as* when the game does something slightly different from the text), *deferred* (in the data, not dealt), *sheet only* (on the sheet, with no data row), **new** (this pass), *moved* (a tier change proposed here).
- **Shape:** *existing* names the effect kind that already says it; *nearly existing* names the small gap; *new shape* says what is missing. The families are under "New shapes".
- **Type:** Military, Economic, Civic or Wildcard, by the rules in `docs/plans/doctrines-governments-chairs.md`, section 4. The sheet's cards are typed in "The sort"; the new cards in their tables.
- **Charters take no chair.** The Fast, The Sabbath Laws and The Corpus Christi each open a rite and are held, not seated.
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. The user's priority is shape.

## Six facts that shape every build

1. **Five chairs for two tiers.** Since the rung fix of 2026-10-17, Tier I opens at draft 4 and Tier II at draft 10, and both government tiers seat five. In bot games Tier I runs from about turn 56 to turn 87 (about five drafts) and Tier II from turn 87 to about turn 151 (about nine drafts) (`docs/plans/draft-pacing-2026-10-17.md`). So an early build is five chairs that turn over once.
2. **Tier 0 lasts about six drafts,** so an early build holds two Tier 0 cards, three at most.
3. **Capstones sit in Tier III.** Tier III opens about four turns after research age 4 (about turn 151). Tier IV at 29 drafts was reached by 9 of 30 bot seats; 26 drafts is not measured yet.
4. **A religion is a race.** A world holds ⌈2/3 × players⌉ religions, four in a game of six. A seat that loses the race keeps the faith economy, the liturgical year and the holy war's faith-bought army. The holy places and the missions need a religion of the seat's own, and so do the cards that count followers or beliefs: The Creed counts only the beliefs of a religion the seat founded (`beliefsHeld` reads `heldReligions`).
5. **Devotion is a Civic deck.** Faith, science, culture and happiness are Civic, so most of the deck is Civic: 33 of its 52 cards. The Chiefdom (1 Military, 1 Economic, 1 Wildcard) and Tyranny (3, 1, 0, 1) have no Civic chair. The faith economy is the deck's Economic build and the holy war its Military build.
6. **The measurements read this deck poorly.** In the bot games of 2026-10-13, seated cards paid 1 to 11% of a seat's yield in Devotion + Scientific seats and 6 to 19% in Devotion + Magisterial seats, against 16 to 24% in Dominion + Expansionist (`docs/plans/card-measurements-2026-10-13.md`). The Tithe paid nothing in 27 samples. The per-turn reading counts the faith a card makes, but not what the faith buys or what a rite's season pays.

## The builds at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The faith economy** | earn faith → buy buildings, workers and wonders with it → what you bought pays faith and culture → buy the next | a purchase made with faith | The Book of Life, The Chantries | The Pious Masons (moved from Tier IV) | The Last Offering, The Treasury of Merit |
| **Inward: the liturgical year** | say rites across the realm → each rite said pays, and towns keeping a rite are content and learned → the faith pays for the next round | a rite said; the holy year | The Rogations, The Old Observances | The Double Feast | The Work of God, The Unceasing Prayer |
| **Inward: the holy places** | raise holy sites → they and the land around them pay, more as they age → the faith calls prophets for more sites | a Cathedral finished | Temple Estates, The Old Holy Places | The Abbeys | The Seven Pilgrimages, The Last Offering |
| **Outward: the missions** | buy clergy → proclaim abroad → towns convert and pay the founder → the faith buys more clergy | a foreign town turns to your religion | The Living Hymnal, The Epistles, The Golden Legend | Pentecost | The Great Consecration, The Conversion of Kings |
| **Outward: the holy war** | buy soldiers with faith → they fight best on the faith's ground → kills and captures press the faith → more ground follows | a war declared; a town taken | The Living Hymnal | The Turning of Swords | The Last Crusade, The Host Restored |

The inward builds share The Fortified Churches, The Parish Churches and The Doctors of the Church. The outward builds share The Living Hymnal, The Golden Legend, Peter's Pence and The Great Councils.

---

## 1. The map

### What a Devotion player wants in each age

The skill's age goals (`references/age-goals.md`) are written for Dominion only. These are Devotion's, for the user to check before they are relied on.

| Age | Tier dealt | The Devotion player wants | What faith costs then |
|---|---|---|---|
| 1 | 0 | faith from Shrines and herds; a pantheon from the faith ladder; the first rites; towns beside lakes and mountains; a soldier bought with faith when the barbarians come | a rite 40; the ladder's rungs 40, 56 and 72 |
| 2 | I (about five drafts) | to found a religion before the world runs out of them (prophets come with The High Temple); Temples; the first buildings and workers bought with faith; a rite in most towns | a rite 56; a prophet 120, then 180; a Temple about 234 at 2 faith a hammer |
| 3 | II (about nine drafts, five chairs) | apostles and Cathedrals (Theology); every building bought with faith; the choice between keeping the faith at home and sending it abroad | a rite 72; an apostle 90, then 130; a Cathedral about 680 |
| 4 | III and IV | the Magnum Opus: faith poured into it, wonders finished with faith, followers abroad paying toward it, the Opus town guarded and a rival's stopped | a rite 90; an age 4 University about 1,400 |

The median bot seat banks 14 faith a turn in age 2, 36 in age 3 and 128 in age 4. A Devotion seat should make about twice that (an estimate, not measured).

### Themes: the deck's materials

"Self-producing" means a Devotion game makes it whether or not a card asks for it. These are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Faith a turn** | Yes: every Shrine and Temple, herds, beliefs, holy sites | the faith yield; rates `faithPerTurn`, `followingFaithPerTurn`, `capitalFaithPerTurn` | raised by First Rites, Pastoral Shrines, Lay Offerings, The Holy Spring, The Calling, Temple Estates, The Old Holy Places, The Holy Inquisition; read by The Learned Clergy |
| **Faith banked** | Yes, between purchases | `Player.faithPool`; count `bankedFaith` | The Treasury of Merit |
| **Purchases made with faith** | Clergy and faith houses always; buildings, workers and soldiers only once a card opens the bank | `faithBankOpen` (`purchase.ts`); the `purchase` occasion, which carries the price but not the bank; count `purchasedBuildings` with `bank` | Consecrated Labor, The Monastic Builders, The Lay Brothers, The Offered Stones, The Pious Masons; shared The Sacred Host |
| **Rites** (a town's season) | Yes, if the player spends faith: rites are taught from age 1, and need no religion | `performRiteAt`; `cityRite`; count `citiesKeepingRite`; tally `riteStarted`; occasion `rite`, which no card reads | The Consolation, The Priest-Astronomers, The Octave, The Fast, The Festival Calendar, The Settled Faith, The Rites Commonwealth, The Founding Vows, The Votive Gifts, The Host Restored |
| **The religion founded** | Once, in a race | `plantHolySite`; condition `noReligionFounded`; count `turnsSinceFounded` | The Calling, The Apostolic Succession |
| **Beliefs** | Yes, for a founder: the faith ladder deals the pantheon, prophets the rest | count `beliefsHeld` | The Old Gods Remain, The Creed, The Doctors of the Church |
| **Holy sites** | Only by prophets, one to three a game | the holy-site improvement; `tilesInBorders`; `standingSince` | The Saints' Fields, The Old Holy Places, Temple Estates, The Monastic University, The Seven Pilgrimages; shared The Holy Army, Pilgrim Markets, Sacred Commissions |
| **Religious buildings** | Yes: a Shrine and a Temple in every town; Cathedrals, Chapels, faith houses and relics with effort | building category `faith`; counts `buildingsOfCategory`, `buildingsOfKind` | First Rites, The Wayside Shrines, The Painted Chapels, The Cathedral Works, The Chapter Houses |
| **Following towns** (the tide) | Yes, once founded: holy sites and following towns press by themselves | `explainPressure`; counts `followingCities`, `followingForeign`, `followingPop`, `followingForeignPop`, `followingEmpires`, `firstConversions`; tally `foreignCityConverted` | The Living Hymnal, The Mission, The Great Consecration, The Tithe of Nations, The Great Commission, The Conversion of Kings, The Peace of God |
| **Clergy** | Bought with faith | charges (`chargeCostOf`, `spendCharge`); proclamations (`pressLump`) | The Second Prophet, Mission Houses, The Settled Faith |
| **Herds, camps and plantations** | From the map | pastures, camps, plantations | Pastoral Shrines, Lay Offerings |
| **The holy war** | Only at war | combat conditions `followingTerritory`, `notFollowingTerritory`, `vsOpusBuilder`; kill grants with `pressure` | The Spiritual Host, The Last Crusade, The Host Restored; shared The Oriflamme, The Sacred Host, The Crusader Orders, Convert It or Tax It, Rites of Passage |
| **Happiness from faith** | No | happiness lines; the `happinessDemand` rule | The Consolation, The Rites Commonwealth, Pastoral Shrines, The Wayside Shrines, The Saints' Fields, The Cathedral Works |
| **Pilgrimage** (routes to holy places) | With trade routes | route `pays` with origin and destination scopes | The Alms Roads; shared Pilgrim Markets |
| **The Opus with faith** | Age 4 | faith contributions at 1 faith a hammer; the `faithContribution` rule | The Last Offering, The Great Consecration, The Tithe of Nations, The Pious Masons (wonders), The Peace of God |

### The builds, and how each reaches the three essentials

Each row is a section below, and the sources are its cards, early first.

| Build | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The faith economy** | purchases made with faith | Libraries bought with faith (The Monastic Builders); every purchase (The Book of Life); the faith rate (The Learned Clergy); the faith bank (The Treasury of Merit) | every purchase (The Book of Life, The Votive Tablets); buildings bought with faith (The Chantries, The Offered Stones) | faith in place of hammers (The Gifts of the Faithful, The Lay Brothers, The Votive Gifts, The Pious Masons, The Last Offering) |
| **Inward: the liturgical year** | rites | towns keeping a rite (The Priest-Astronomers, The Settled Faith); rites said (The Psalter); rites this game (The Old Observances) | rites said (The Rogations, The Psalter); production given up (the Rite of the Sabbath) | the Votive Offering; rite towns toward the Opus (The Work of God) |
| **Inward: the holy places** | holy sites, Cathedrals | Cathedral towns (The Cathedral Works); a Cathedral finished (The Consecration Feast); holy sites held (The Seven Pilgrimages) | the sites themselves; old sites (The Old Holy Places); holy-site towns (The Pilgrim Towns) | holy-site towns build wonders faster (Sacred Commissions, Akhenaten); the holy city's faith into the Opus (The Last Offering) |
| **Outward: the missions** | following towns, conversions | following towns (The Living Hymnal); conversions (The Epistles, The Mass Baptisms); first conversions (The Golden Legend) | the same cards; following empires (The Great Councils) | gold from followers abroad (Peter's Pence); foreign followers toward the Opus (The Great Consecration) |
| **Outward: the holy war** | the faith's ground, kills, captures | following towns (The Living Hymnal); following empires (The Great Councils); with Dominion, its kill cards | the same; holy sites beside citadels (the shared The Holy Army) | soldiers bought with faith (The Shrine Guards, The Sacred Host, The Offering Chests); units on a declaration (The Holy Summons); captured towns (Convert It or Tax It) |

### How Devotion pairs with the other five

The currency test (`docs/decks/deck-design.md`): Devotion makes faith and spends it on faith purchases and rites. Every Devotion seat draws all seventeen shared cards that name Devotion, whatever its partner.

- **Dominion** (Joan of Arc, Modu Chanyu): the holy war. Devotion gives the army ground where it fights best, soldiers bought with faith and an army healed by a rite. Dominion gives spread by conquest and kills that pay faith (its own The Camp Chaplains, The Funeral Games and Muster Rites too). Shared: Rites of Passage, The Sacred Host, The Oriflamme, The Crusader Orders, Convert It or Tax It, The Holy Army. Best with the holy war, and with the faith economy buying Dominion's units. Measured: 18 to 23% of seat yield from cards.
- **Expansionist** (no leader): holy land. Wild land and herds pay faith (the shared Sacred Groves and The Flood Festival, Pastoral Shrines, Temple Estates), and big towns pay more faith (The Offertory). Best with the inward builds and the faith economy. The power review called it the weakest pair: no shared improvement, little science. A new card, The Oblates, gives it the levy (question 12).
- **Commerce** (Mansa Musa): pilgrims and markets. Both decks buy instead of build, with faith and with gold; routes carry faith (The Alms Roads, the shared Pilgrim Markets, Commerce's The Silk Road Monks and The Waqf). Best with the faith economy and the holy places. No gap is covered, so the spec names it the first pair to check in playtesting. Measured: 18 to 29%.
- **Scientific** (Al-Ma'mun): scholars of the faith. Science from faith (The Learned Clergy, the shared The Cloister, Cloister Schools and The Monastery Libraries, The Monastic University, The Monastic Builders), and Scientific's The Schoolmen's Charter brings the Cathedral and the apostle early. Best with the inward builds and the faith economy. Measured: the weakest pair, 1 to 11%.
- **Magisterial** (Akhenaten, Hildegard of Bingen): the cathedral. Wonders and holy places (the shared Sacred Commissions and The Rising Nave, The Pious Masons), and faith that pays for rerolls and great people (The Penitents' Roll, the shared Sacred Patronage, Magisterial's The Critics' Circle). Best with the faith economy and the liturgical year. Measured: 6 to 19%.

### Leaders

Devotion has six leaders, more than any other deck.

| Leader | Decks | Ability points at | Builds | Cards behind it |
|---|---|---|---|---|
| Modu Chanyu | Dominion, Devotion | mounted movement; pillage pays half again; pastures pay +1 production and +1 faith | the holy war; faith from herds | Pastoral Shrines, The Shrine Guards, The Sacred Host, The Spiritual Host |
| Joan of Arc | Dominion, Devotion | kills pay faith and press the faith; +4 strength on the faith's ground | the holy war | The Victory Hymns, The Spiritual Host, The Turning of Swords, The Last Crusade |
| Akhenaten | Devotion, Magisterial | holy-site towns build wonders 20% faster; faith on watered farms | the holy places; the faith economy's wonders | Sacred Commissions, The Abbeys, The Pious Masons, The Rising Nave |
| Hildegard of Bingen | Devotion, Magisterial | rite towns pay +20% culture; +2 culture and +2 production for each faith building | the liturgical year; the faith economy | The Rogations, The Double Feast, The Painted Chapels, The Parish Churches, The Gifts of the Faithful |
| Al-Ma'mun | Devotion, Scientific | +1 science for every 5 faith a turn; +2 food for each faith or science building | the faith economy; the inward builds | The Learned Clergy, The Monastic Builders, The Offertory, the shared The Cloister |
| Mansa Musa | Commerce, Devotion | routes to or from a holy-site town pay +2 gold and +2 faith | the holy places' pilgrims; the faith economy's two banks | Pilgrim Markets, The Alms Roads, The Anchorites, the shared The Tithe |

No leader points squarely at the missions. No leader holds Expansionist and Devotion.

### Where the sheet is thin

- **By tier:**
  - Tier 0: 6 of 8 cards are Civic, and the Chiefdom has no Civic chair, so a Devotion seat seats one Civic card in its first four drafts. No Tier 0 card spends faith on a purchase (Consecrated Labor moved to Tier I on 2026-10-12).
  - Tier I is now short: about five drafts, against fourteen own cards and seven shared.
  - Tier II is the long middle: about nine drafts on five chairs. It holds the deck's answer to its production gap, The Lay Brothers, as a rare.
  - Tier III has five own cards and no common, for the band that fills eight chairs. Beside them are three shared cards: one deferred (Sacred Patronage) and one with no data row (The Rising Nave).
  - Tier IV holds fourteen cards, among them the late engines (The Treasury of Merit, The Apostolic Succession, The Chapter Houses, The Seven Pilgrimages) and a capstone (The Pious Masons).
- **By role:**
  - No grower and no "this game" counter before Tier II. The Penitents' Roll counts rerolls while seated; The Old Holy Places reads the age of holy sites; The Apostolic Succession, at Tier IV, the years since founding.
  - No card of Devotion's own pays on a moment. The game announces a rite said (the `rite` occasion, read by no card), a purchase and a conversion (a tally only the commissions read). Only shared cards pay on one: Rites of Passage (a unit gained), The Sacred Host (a kill), The Crusader Orders (a capture), Sacred Commissions (a wonder finished) and The Flood Festival (burned country).
  - Rites are mostly a switch. Five cards pay while a town keeps a rite (The Consolation, The Priest-Astronomers, The Festival Calendar, The Settled Faith, The Rites Commonwealth). Of the eight rites, only the Rite of Fasting asks the town to give something up. The spec asks for rites as decisions.
  - Holy sites are few, so the cards that pay on each one (The Saints' Fields, The Old Holy Places, The Seven Pilgrimages) pay little unless the sites multiply.
  - Few Military and Economic cards: 4 Military (one before Tier IV) and 11 Economic of 52.
  - The Living Hymnal counts the seat's own following towns, with no cap (the user's revision of 2026-10-12). It pays every founder, inward or outward, so it is the likeliest automatic pick in the deck. This pass uses it as the outward builds' shared card; if it proves an automatic take, its earlier reading (foreign towns only) is the fallback.
- **The user's playtest** (Mithridates, 2026-10-12) held no Devotion. The shared Sacred Groves was "very good".

---

## 2. The faith economy

**The fantasy.** The temple estates of Egypt and Sumer, Cluny and Cîteaux, the French cathedral towns where whole parishes hauled the stones. Faith, given freely, raises what other realms raise with hammers. This is the deck's answer to its gap: Devotion is weak at production on purpose, and here faith buys what others build.

**The loop:** earn faith → buy buildings, workers and wonders with faith → what you bought pays faith and culture → buy the next.
- **The quantity:** purchases made with faith, and the buildings they bought (`purchasedBuildings` with `bank: 'faith'`, which The Offered Stones already reads).
- **The moment:** a purchase made with faith (The Votive Tablets).
- **What it spends:** production. Its towns build little with hammers, and their production goes into wonders and the Opus.
- **No religion needed.** It is the build for a seat that loses the race to found one. Only The Last Offering needs a holy city; without one, the Opus still takes faith at 1 faith a hammer.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| First Rites | 0 | common | +25% production toward Shrines. Shrines give +2 faith. | opener | raises faith | faith | Civic | live |
| The Shrine Guards | 0 | common | Towns with a Shrine may buy melee units with faith. | opener; early defence | raises purchases | units | Military | **new**; existing (the `faithBuysUnits` rule with a melee filter and a Shrine scope, as Consecrated Labor) |
| The Gifts of the Faithful | 0 | common | Religious buildings may be bought with faith. | opener: changes what the player does | raises purchases | production (faith in its place) | Economic | **new**; new shape (the `faithBuysBuildings` rule narrowed to one building category) |
| Consecrated Labor | I | common | Cities with a Shrine may buy workers with faith. | engine | raises purchases | land | Economic | live |
| The Monastic Builders | I | uncommon | Science buildings may be bought with faith. | engine | raises purchases | science, through Libraries | Economic | live |
| The Book of Life | I | uncommon | While seated, this card gains +1 science and +1 culture each time you buy something with faith. It starts at +2 of each. | grower; early scaler | reads purchases | science, culture | Civic | **new**; new shape (a tally of purchases made with faith) |
| The Lay Brothers | II | rare | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. | build-defining: a broken rule | raises purchases | production (faith in its place) | Economic | live |
| The Votive Gifts | II | common | While this is seated, your cities know the Votive Offering: a city spends the rite's faith to add that much production, at the faith rate, to whatever it is building. Not toward wonders. Once per city per turn. | engine: hurries a build | raises faith spent | production | Economic | live (built as a rite) |
| The Chantries | II | uncommon | +1% faith and culture for every two buildings you have bought with faith, at most +30%. | early scaler | reads buildings bought with faith | faith, culture | Civic | **new**; existing (empire `pays` percent on `purchasedBuildings` with `bank: 'faith'`) |

- **Tier 0 (the Chiefdom):** Military: The Shrine Guards. Economic: The Gifts of the Faithful. Wildcard: First Rites.
- **Five-chair core, Tier I (Council of Elders: 1 Military, 2 Economic, 1 Civic, 1 Wildcard):** Military: The Shrine Guards. Economic: Consecrated Labor, The Monastic Builders. Civic: The Book of Life. Wildcard: The Gifts of the Faithful.
- **Tier II (the Republic: 0 Military, 3 Economic, 1 Civic, 1 Wildcard):** Economic: The Lay Brothers, The Votive Gifts, Consecrated Labor. Civic: The Chantries. Wildcard: The Book of Life. The Lay Brothers buys in every Temple town what The Monastic Builders and The Gifts of the Faithful bought, so both give way.
- **Sizing:**
  - **The Gifts of the Faithful:** a Shrine costs 30 to 51 hammers in age 1, so 60 to 100 faith. With First Rites it pays 3 faith a turn, so it pays for itself in about 25 turns, and every town has its Shrine before age 2. Later it buys Temples (about 234 faith) and Cathedrals (about 680).
  - **The Book of Life:** about seven purchases by turn 87 (workers, Libraries, a Temple, a prophet) make +9 of each. With The Lay Brothers a purchase comes every two or three turns: about +30 of each by turn 150 and +60 by turn 200. The Gathering Host, Dominion's grower, reaches about +80 by turn 160.
  - **The Lay Brothers:** at 2 faith a hammer, 80 faith a turn in age 3 buys 40 hammers of buildings a turn, about three towns' production.
  - **The Chantries:** about 16 buildings bought by turn 150 (+8%) and 40 by turn 200 (+20%): about 90 faith and culture a turn in age 4.
- **How a few turns feel:**
  - Turn 25: the second town is founded, and its Shrine is bought with faith the same turn. Barbarians come at the third town, which buys a Spearman for 54 faith.
  - Turn 70: a worker bought with faith in a Shrine town and a Library bought in the capital. The Book of Life reads +7.
  - Turn 120: every Temple town buys its next building with faith while its hammers go into a wonder. A town short of hammers says the Votive Offering into its Market. The Chantries reads +7%.
- **Also fits:** Lay Offerings, Pastoral Shrines and The Wayside Shrines (Tier 0); The Oblates (Tier I, **new**, question 12); The Offertory (Tier II, **new**, below); The Penitents' Roll; the shared The Tithe (Commerce) and Sacred Commissions (Magisterial).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Book of Life | I | uncommon | (above) | carried scaler | reads purchases | science, culture | Civic | **new** |
| The Chantries | II | uncommon | (above) | carried scaler | reads buildings bought with faith | faith, culture | Civic | **new** |
| The Pious Masons | III (from IV) | rare | In cities with a Cathedral, a world wonder that is at least half built may be bought with faith. Not the Magnum Opus. | capstone: a broken rule | raises purchases | production toward wonders | Economic | live (built as); *moved* from Tier IV |
| The Offered Stones | III | uncommon | Buildings you bought with faith give +2 culture each, at most +6 per town. You can purchase buildings with faith. | pay-off | reads buildings bought with faith | culture | Economic | live |
| The Votive Tablets | III | uncommon | Each purchase you make with faith grants culture equal to a quarter of its price. | the moment | reads purchases | culture | Civic | **new**; new shape (the `purchase` occasion narrowed to purchases made with faith; the price paid is already its measure) |
| The Fabric Fund | III | common | Purchases made with faith cost 30% less in towns with a Cathedral. | engine | raises purchases | production (faith in its place) | Economic | **new**; new shape (a purchase rider narrowed to the faith bank) |
| The Learned Clergy | III | uncommon | +2 science and +2 culture for every 10 faith your empire makes each turn. | pay-off on the faith rate | reads faith a turn | science, culture | Civic | live |
| The Offering Chests | III | common | Military units bought with faith cost 30% less. | utility: a cheap army | raises purchases | units | Military | **new**; new shape (as The Fabric Fund) |
| The Last Offering | IV | rare | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | finisher: the win | | production toward the Opus | Economic | live |
| The Treasury of Merit | IV | rare | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. | late engine | reads banked faith | science, culture | Civic | live |

- **Tier III (the Merchant League: 1 Military, 3 Economic, 2 Civic, 2 Wildcard):** Military: The Offering Chests. Economic: The Pious Masons, The Offered Stones, The Fabric Fund. Civic: The Votive Tablets, The Learned Clergy. Wildcard: The Book of Life, The Chantries.
- **Tier IV (the Estates: 2 Military, 4 Economic, 2 Civic, 3 Wildcard):** adds The Last Offering (Economic) and The Treasury of Merit (Wildcard). The second Military chair goes to the partner.
- **Carried over:** The Book of Life at about +40 to +60 of each, and The Chantries at +15% to +25%.
- **The capstone, The Pious Masons:** a world wonder half built with hammers is finished at once with faith in a Cathedral town. The race for a wonder becomes a race to its halfway mark. It moves from Tier IV so that the build has its capstone without Tier IV.
- **The moment, The Votive Tablets:** every purchase pays a quarter of its price back as culture. An age 4 University bought for about 1,400 faith pays 350 culture, about a third of a draft.
- **Sizing:**
  - **The Fabric Fund:** 250 faith a turn spent in Cathedral towns saves 75 faith, about 37 hammers a turn.
  - **The Learned Clergy:** 300 faith a turn pays +60 science and +60 culture.
  - **The Treasury of Merit:** 2,000 faith saved for a wonder pays +40 of each while it waits.
- **How a few turns feel:**
  - Turn 155: the Hanging Gardens are half built in a Cathedral town. You buy the rest with about 1,100 faith, and The Votive Tablets pays about 275 culture.
  - Turn 170: each Cathedral town buys a building every few turns at 30% off. The Learned Clergy reads 300 faith a turn.
  - Turn 190 (Tier IV): the holy city pours its faith into the Opus at half again its worth, and The Treasury of Merit pays on the faith saved for it.
- **Without Tier IV,** the eight chairs of Tier III stand, with the capstone and the moment in them. Faith still reaches the Opus as contributions, at 1 faith a hammer.
- **Also fits:** The Holy Inquisition (+38% faith); The Cathedral Works; the shared The Rising Nave and Sacred Patronage (deferred).

**Utility mix:**
- science: The Monastic Builders' Libraries, The Book of Life, The Learned Clergy, The Treasury of Merit;
- culture: The Book of Life, The Chantries, The Offered Stones, The Votive Tablets;
- production: every purchase rule, The Pious Masons, The Last Offering;
- faith: First Rites, The Chantries;
- defence and soldiers: The Shrine Guards, The Offering Chests.

**Gives up:** production of its own, and the religion's reach: faith spent on buildings is not spent on clergy or rites.

**Partners:** Commerce (two banks, so the pair buys everything twice over; the shared The Tithe; Commerce's The Waqf), Magisterial (wonders), Expansionist (workers, and The Oblates).

**Leaders:** Hildegard of Bingen (faith buildings pay culture and production), Al-Ma'mun (science from faith; food from faith and science buildings).

**Alternatives:**
- early: Lay Offerings, Pastoral Shrines, The Wayside Shrines, The Oblates, The Offertory, The Penitents' Roll, the shared The Tithe;
- late: The Holy Inquisition, The Cathedral Works, The Rising Nave, The Chapter Houses (Tier IV).

---

## 3. The inward builds (the devout realm)

**The fantasy.** Byzantium, Tibet, Hildegard's Rhineland, the temple towns of Egypt. The faith stays at home. Every town keeps its temples and its feasts, and a devout realm is content and learned. Two flavours: the liturgical year keeps the feasts, and the holy places gather the faith at its shrines.

**What the two share:** towns full of religious buildings, and the beliefs those towns follow. An inward seat presses less abroad (The Settled Faith) and keeps rival faiths out (The Holy Inquisition).

### The shared cards

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Fortified Churches | I | common | Towns gain +3 defence for every religious building in them. | the inward Military card, kept all game | reads religious buildings | defence | Military | **new**; nearly existing (`cityStat` defence with a count, as The Burhs; the count must carry the building category) |
| The Parish Churches | II | uncommon | +1% science and culture for every two religious buildings you hold, at most +30%. | the shared scaler | reads religious buildings | science, culture | Civic | **new**; existing (empire `pays` percent on `buildingsOfCategory`, `faith`) |
| The Doctors of the Church | III | rare | Follower beliefs pay 150% more in your own cities. | the shared capstone: beliefs amplified | reads follower beliefs | what the beliefs pay | Civic | live (built as) |

- **Also shared:** The Painted Chapels (I), The Creed (I, for a founder), The Learned Clergy (III), The Holy Inquisition (III).
- **Sizing:**
  - **The Fortified Churches:** a Shrine and a Temple give +6 defence in age 2, band 1's strong line. A Cathedral, a Chapel, a faith house and a relic take a town to +18 by age 4.
  - **The Parish Churches:** ten towns with a Shrine and a Temple, five Cathedrals, four faith houses and three relics are 32 religious buildings: +16%.
  - **The Doctors of the Church:** three follower beliefs paying about 3 a town each in ten towns are about 90 a turn; 150% more is about 135. It also raises a rival's follower beliefs in towns of yours that follow them, so it pays a seat with no religion of its own.

### 3a. The liturgical year

**The fantasy.** The church year of feasts and fasts, the Maya and Babylonian temple calendars, Hildegard's convent singing the hours. Every town keeps its seasons, and each season it chooses what to pray for.

**The loop:** say rites across the realm → each rite said pays, and towns keeping a rite are content and learned → their faith pays for the next round of rites.
- **The quantity:** towns keeping a rite (`citiesKeepingRite`), and rites started (the `riteStarted` tally and the `rite` occasion).
- **The moment:** a rite said, and the holy year, when every town says one for free.
- **What it spends:** faith that could buy buildings. A rite costs 40 to 90 faith for ten turns; ten towns keeping rites spend 70 to 90 faith a turn in age 4.
- **No religion needed:** a rite needs only its technology and its price.
- **Rites as decisions.** This flavour pays for saying a rite as well as for keeping one, and adds a rite that asks the town to give something up: the Rite of the Sabbath trades production for culture, as the built Rite of Fasting trades growth for faith.
- **A reading it needs:** a rite started is a season. The Votive Offering and the Restoring of the Host act at once and can be said again and again, so they are not counted (question 5).

#### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Rogations | 0 | uncommon | While seated, this card gains +1 faith and +1 culture each time one of your towns starts a rite. It starts at +2 of each. | grower; early scaler | reads rites started | faith, culture | Civic | **new**; existing (`pays` on the `riteStarted` tally, as The Gathering Host) |
| The Wayside Shrines | 0 | common | Cities with a Shrine gain +2 food and +1 happiness. | glue: the Economic chair | | food, happiness | Economic | live |
| The Fortified Churches | I | common | (shared, above) | the Military chair | reads religious buildings | defence | Military | **new** |
| The Priest-Astronomers | I | common | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. | pay-off: science | reads towns keeping a rite | science, faith | Civic | live |
| The Rites Commonwealth | I | rare | Cities keeping a rite demand 25% less population happiness. Your cities without a rite gain −1 happiness. | build-defining, with a drawback | reads towns keeping a rite | happiness | Civic | live |
| The Fast | I | uncommon | Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains faith equal to its population each turn. No chair required. | charter: a rite with a cost | raises rites | faith | Civic | live (built as) |
| The Old Observances | II | uncommon | +1% science and faith for every three rites your towns have started this game, at most +30%. | early scaler | reads rites started this game | science, faith | Civic | **new**; new shape (a "this game" count of rites started) |
| The Settled Faith | II | rare | Temple cities keeping a rite gain +30% science and +2 happiness. Your proclamations apply 25% less pressure. | percentage on the flats; the faith turned inward | reads towns keeping a rite | science, happiness | Civic | live (built as) |
| The Sabbath Laws | II | uncommon | Once drafted, unlock the Rite of the Sabbath. A town keeping it builds nothing for ten turns and gains culture equal to its production each turn. No chair required. | charter: a rite with a cost | raises rites | culture | Civic | **new**; nearly existing (a rite row: `pays` at `basis: 'share'` from production to culture, and a halt on units, buildings and wonders; the halt must stop projects too) |

- **Tier 0 (the Chiefdom):** Wildcard: The Rogations (or The Founding Vows first, for its goal). Economic: The Wayside Shrines. Military: The Shrine Guards, or the partner's card.
- **Five-chair core, Tier I (Priest-King: 1 Military, 1 Economic, 2 Civic, 1 Wildcard):** Military: The Fortified Churches. Economic: The Wayside Shrines. Civic: The Priest-Astronomers, The Rites Commonwealth. Wildcard: The Rogations. Charter: The Fast.
- **Tier II (Theocracy: 1 Military, 0 Economic, 3 Civic, 1 Wildcard):** Military: The Fortified Churches. Civic: The Rites Commonwealth, The Old Observances, The Settled Faith. Wildcard: The Rogations. Charters: The Fast, The Sabbath Laws.
- **Sizing:**
  - **The Rogations:** a seat says about one rite every eight turns in age 1, and about one a turn by age 3 with eight towns. That is about +7 of each by turn 55, +17 by turn 87 and +60 by turn 150.
  - **The Rites Commonwealth:** a town of twelve keeping a rite asks 9 happiness instead of 12. Ten such towns save about 30, which holds the empire in the top happiness tier (+20% science and culture).
  - **The Old Observances:** about 60 rites by turn 150 (+20%) and 90 by turn 180 (+30%).
  - **The Sabbath:** a town of 15 production gives up 150 production over ten turns for 150 culture, plus the rite's price. It suits a town with nothing worth building, or one whose next building will be bought with faith.
- **How a few turns feel:**
  - Turn 20: the capital says the Rite of the Harvest, and The Rogations gains +1. The Founding Vows is met at the second rite and pays 100 faith.
  - Turn 70: every town keeps a rite. The Rites Commonwealth eases their happiness, and The Priest-Astronomers pays +10 science and +10 faith in the capital.
  - Turn 120: a town with nothing worth building keeps the Sabbath and turns its production into culture. Another fasts for faith. The Old Observances reads +15%.
- **Also fits:** The Founding Vows (Tier 0); The Consolation and The Octave (Tier I; The Octave suits a seat that keeps rites rather than says many); The Festival Calendar, The Votive Gifts and The Parish Churches (Tier II).

#### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Rogations | 0 | uncommon | (above) | carried scaler | reads rites started | faith, culture | Civic | **new** |
| The Old Observances | II | uncommon | (above) | carried scaler | reads rites started this game | science, faith | Civic | **new** |
| The Fortified Churches | I | common | (shared, above) | the Military chair | reads religious buildings | defence | Military | **new** |
| The Votive Gifts | II | common | (the faith economy, above) | the Economic chair: an offering in a town's second rite | raises rites | production | Economic | live |
| The Double Feast | III | rare | Your towns may keep two rites at once. | capstone: a broken rule | raises rites | every rite card twice | Civic | **new**; new shape (a town's rite limit raised to two; the rite menu must show two running rites) |
| The Holy Year | III | uncommon | Every twentieth turn is a holy year: rites your towns start that turn cost no faith. | the moment | raises rites | faith | Civic | **new**; new shape (a rule on a rite's price, on a calendar turn) |
| The Psalter | III | common | Each rite your towns start grants 30 science and 30 culture. | pay-off on the moment | reads rites started | science, culture | Civic | **new**; existing (riders on the `rite` occasion) |
| The Corpus Christi | III | uncommon | Once drafted, unlock the Procession. A town keeping it presses your religion as a holy site does, for ten turns. No chair required. | charter: the rite that spreads the faith | raises following towns | pressure | Civic | **new**; new shape (a rite that is a source of pressure) |
| The Doctors of the Church | III | rare | (shared, above) | the shared capstone | reads follower beliefs | what the beliefs pay | Civic | live |
| The Work of God | IV | rare | The town raising the Magnum Opus gains +4% production toward it for every town of yours keeping a rite, at most +40%. | finisher: the win | reads towns keeping a rite | production toward the Opus | Economic | **new**; existing (`productionBonus` toward the Opus with a count, as The Great Consecration) |
| The Unceasing Prayer | IV | rare | Rites cost no faith in towns with a Cathedral. | long-game rule-breaker | raises rites | faith | Civic | **new**; new shape (the rite price rule, in the towns a scope admits) |
| The Host Restored | IV | rare | While this is seated, your cities know the Restoring of the Host: a city spends the rite's faith to heal every unit of yours standing in territory that follows your religion to full health. A city may say it once every five turns. | the second Military chair: a rite for the army | | healing | Military | live (built as a rite) |

- **Tier III (Divine Mandate: 2 Military, 1 Economic, 3 Civic, 2 Wildcard):** Military: The Fortified Churches and the partner's card. Economic: The Votive Gifts. Civic: The Double Feast, The Holy Year, The Psalter. Wildcard: The Rogations, The Old Observances. Charter: The Corpus Christi.
- **Tier IV (the Curia: 2 Military, 2 Economic, 4 Civic, 3 Wildcard):** Military: The Fortified Churches, The Host Restored. Economic: The Votive Gifts, The Work of God. Civic: The Double Feast, The Holy Year, The Psalter, The Doctors of the Church. Wildcard: The Rogations, The Old Observances, The Unceasing Prayer. All eleven are Devotion's.
- **Carried over:** The Rogations (about +60 of each at turn 150, +100 by turn 190) and The Old Observances (+20%, then +30%). Typed chairs also keep The Fortified Churches and The Votive Gifts seated, because the late tiers hold no Military or Economic card for this flavour before Tier IV.
- **The capstone, The Double Feast:** every town keeps two seasons at once, or a season and an offering, so every rite card pays twice and the faith runs twice as fast. It breaks the one-rite rule that the whole rite system rests on.
- **The moment, The Holy Year:** every twentieth turn, every town starts its rites for nothing. The Psalter and The Rogations jump on the same turn. The game should show the turn of the next holy year.
- **Sizing:**
  - **The Double Feast:** ten towns saying two rites every ten turns are two rites a turn: The Psalter pays 60 science and 60 culture a turn, and The Rogations and The Old Observances grow twice as fast.
  - **The Holy Year:** ten towns at 90 faith save 900 faith every twenty turns, 1,800 under The Double Feast.
  - **The Work of God:** ten rite towns give +40% toward the Opus.
  - **The Unceasing Prayer:** 90 to 180 faith a turn saved in Cathedral towns, which the seat can spend on purchases.
- **How a few turns feel:**
  - Turn 160: The Double Feast. Each town keeps the Rite of the Harvest and Omen Reading at once, or a season and a Votive Offering. The Psalter pays about 60 science and 60 culture a turn.
  - Turn 180: the holy year. Ten towns start twenty rites for nothing, and The Rogations gains twenty.
  - Turn 195 (Tier IV): ten rite towns give the Opus +40%, and the Cathedral towns say their rites for nothing.
- **Without Tier IV,** the Curia's chairs do not come, and the Tier III council stands; The Rites Commonwealth and The Settled Faith wait in the collection for a Civic chair.

**Utility mix:**
- science: The Priest-Astronomers, The Settled Faith, The Psalter, The Old Observances;
- culture: The Rogations, The Psalter, the Rite of the Sabbath;
- production: the Votive Offering, The Work of God;
- faith: The Rogations, The Old Observances, the Rite of Fasting, The Holy Year;
- happiness: The Rites Commonwealth, The Settled Faith;
- defence and healing: The Fortified Churches, The Host Restored.

**Gives up:** purchases, since its faith goes into rites; and attention, since ten towns' seasons are chosen by hand. The city screen's rite mode ranks free towns by what a rite would pay, which keeps this a choice rather than a chore.

**Partners:** Magisterial (culture and the draft), Expansionist (big towns; the Rite of Fasting beside the levies), Scientific (The Settled Faith's science).

**Leader:** Hildegard of Bingen (rite towns pay +20% culture).

**Alternatives:**
- early: The Founding Vows, The Consolation, The Octave, The Festival Calendar, The Parish Churches;
- late: The Learned Clergy, The Holy Inquisition, The Chapter Houses.

### 3b. The holy places

**The fantasy.** Jerusalem, Mecca, Varanasi, Santiago, Bodh Gaya, Akhenaten's Amarna. The faith gathers at its holy places. The oldest shrines are the holiest, the land around them is blessed, and pilgrims come from far away.

**The loop:** raise holy sites → the sites, and the land around them, pay faith and culture, more as they age → the faith calls more prophets for more sites, and buys Cathedrals.
- **The quantity:** holy sites held (`tilesInBorders` with the holy site), their age (`standingSince`), and Cathedrals.
- **The moment:** a Cathedral finished (The Consecration Feast).
- **Needs a religion:** the first holy site founds it, and only a seat with a religion raises more.
- **What it spends:** prophets' charges on sites rather than on proclamations and beliefs.

#### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Holy Spring | 0 | common | Cities whose centre stands beside a mountain or a lake gain +2 faith and +1 culture. | opener: where to settle | | faith, culture | Civic | live |
| The Calling | 0 | common | +25% faith until you have founded a religion. | opener: the race to found | raises faith | faith | Civic | live |
| The Fortified Churches | I | common | (shared, above) | the Military chair | reads religious buildings | defence | Military | **new** |
| Sacred Commissions | I | uncommon | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | the Economic chair: holy-site towns raise wonders | reads holy sites | production toward wonders | Economic | live (shared with Magisterial) |
| The Anchorites | I | uncommon | Your prophets raise a further holy site for one charge instead of two. | engine: changes what the player does | raises holy sites | | Civic | **new**; new shape (a card's price on a prophet's act) |
| The Second Prophet | I | uncommon | Prophets and apostles you buy start with one extra charge. | engine | raises holy sites | | Civic | live |
| Temple Estates | II | common | Hexes beside a Holy Site gain +2 food and +2 faith. | pay-off: the land around | reads holy sites | food, faith | Civic | live |
| The Old Holy Places | II | common | Holy Sites that have stood for 20 turns gain +3 faith. Those that have stood for 40 turns gain +3 faith and +3 culture more. | early scaler: age | reads holy sites' age | faith, culture | Civic | live |
| The Parish Churches | II | uncommon | (shared, above) | the shared scaler | reads religious buildings | science, culture | Civic | **new** |

- **Tier 0 (the Chiefdom):** Wildcard: The Calling (or The Holy Spring). Military: The Shrine Guards. Economic: The Wayside Shrines.
- **Five-chair core, Tier I (Priest-King):** Military: The Fortified Churches. Economic: Sacred Commissions. Civic: The Anchorites, The Second Prophet. Wildcard: The Calling until the faith is founded, then The Holy Spring.
- **Tier II (Theocracy):** Military: The Fortified Churches. Civic: Temple Estates, The Old Holy Places, The Parish Churches. Wildcard: The Anchorites.
- **Sizing:**
  - **The Anchorites:** a prophet's two charges raise two sites. Three prophets by turn 120 give five or six sites instead of three.
  - **Temple Estates:** three sites with six owned hexes each pay +36 food and +36 faith.
  - **The Old Holy Places:** a site raised on turn 65 pays +3 faith from turn 85, and +6 faith and +3 culture from turn 105. Three sites: +18 faith and +9 culture.
- **How a few turns feel:**
  - Turn 15: the capital is founded beside a lake. The Holy Spring pays +2 faith and +1 culture.
  - Turn 70: the first prophet founds the faith and, with The Anchorites, raises a second holy site with its last charge.
  - Turn 120: the oldest site is fifty turns old, and the hexes around three sites are blessed. A town with a holy site raises its wonder 38% faster.
- **Also fits:** The Saints' Fields and The Cathedral Works (Tier II); the shared Pilgrim Markets; The Alms Roads; The Mission Schools.

#### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Temple Estates | II | common | (above) | carried scaler: more sites, more land | reads holy sites | food, faith | Civic | live |
| The Old Holy Places | II | common | (above) | carried scaler: age | reads holy sites' age | faith, culture | Civic | live |
| The Fortified Churches | I | common | (shared, above) | the Military chair | reads religious buildings | defence | Military | **new** |
| The Saints' Fields | II | common | Worked Holy Sites give +5 food and +8 gold. A city working one gains +2 happiness, once per city. | the Economic chair: pays on every site | reads holy sites | food, gold, happiness | Economic | live |
| The Abbeys | III | rare | Your apostles may raise holy sites, as prophets do. | capstone: a broken rule | raises holy sites | | Civic | **new**; new shape (apostles may plant holy sites) |
| The Consecration Feast | III | uncommon | Finishing a Cathedral grants science and culture equal to twenty times the town's population. | the moment | reads Cathedrals finished | science, culture | Civic | **new**; existing (a completion rider with the town's population, as The Topping Out) |
| The Pilgrim Towns | III | uncommon | Towns working a holy site gain +20% culture. | percentage on the flats | reads holy sites | culture | Civic | **new**; existing (`percentYields` with a `workingImprovement` scope) |
| The Doctors of the Church | III | rare | (shared, above) | the shared capstone | reads follower beliefs | what the beliefs pay | Civic | live |
| The Seven Pilgrimages | IV | uncommon | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. | finisher: flats | reads holy sites | science, culture | Civic | live (built as) |
| The Last Offering | IV | rare | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | finisher: the win | | production toward the Opus | Economic | live |

- **Tier III (Divine Mandate):** Military: The Fortified Churches and the partner's card. Economic: The Saints' Fields. Civic: The Abbeys, The Consecration Feast, The Pilgrim Towns. Wildcard: Temple Estates, The Old Holy Places.
- **Tier IV (the Curia):** Military: The Fortified Churches and the partner's card. Economic: The Saints' Fields, The Last Offering. Civic: The Abbeys, The Consecration Feast, The Seven Pilgrimages, The Doctors of the Church. Wildcard: Temple Estates, The Old Holy Places, The Pilgrim Towns.
- **Carried over:** Temple Estates and The Old Holy Places, which grow with every site The Abbeys adds, and The Fortified Churches and The Saints' Fields in the typed chairs.
- **The capstone, The Abbeys:** apostles cost 90 faith and then 130, against a prophet's 120 and 180, and come in age 3. With them a holy site can stand beside most towns, and every card that pays on a site pays several times over.
- **The moment, The Consecration Feast:** a Cathedral topped out in a town of fourteen pays 280 science and 280 culture. The faith economy's purchases make this a moment the seat can choose.
- **Sizing:**
  - **The Abbeys:** eight to ten sites by turn 180. Temple Estates then pays on about fifty hexes: +100 food and +100 faith.
  - **The Seven Pilgrimages:** with five or more sites, every town working one gains +5 of each.
  - **The Pilgrim Towns:** +20% culture in most towns once The Abbeys has spread the sites.
- **How a few turns feel:**
  - Turn 160: three apostles raise holy sites beside the border towns (The Abbeys). Each site blesses six hexes.
  - Turn 170: a Cathedral is finished in a town of fourteen, and The Consecration Feast pays 280 science and 280 culture.
  - Turn 190 (Tier IV): every town works a holy site. The Seven Pilgrimages pays +5 of each in each, and the holy city pours its faith into the Opus.
- **Without Tier IV,** the eight chairs of Tier III stand, with the capstone and the moment in them. The Cathedral Works and The Parish Churches wait in the collection for a Civic chair.

**Utility mix:**
- science: The Cathedral Works, The Consecration Feast, The Seven Pilgrimages;
- culture: the sites themselves, The Old Holy Places, The Pilgrim Towns, The Consecration Feast;
- production: Sacred Commissions (wonders), The Last Offering (the Opus);
- food, faith and gold: Temple Estates, The Saints' Fields.

**Gives up:** the reach of its clergy, since charges go into sites, and width: it pays most in a few towns built around their shrines.

**Partners:** Magisterial (wonders in holy-site towns; the shared The Rising Nave), Commerce (pilgrim routes), Scientific (The Monastic University: a site beside an academy), Dominion (the shared The Holy Army: a site beside a citadel).

**Leaders:** Akhenaten (holy-site towns build wonders 20% faster), Mansa Musa (routes to holy-site towns pay faith and gold).

**Alternatives:**
- early: The Saints' Fields, The Cathedral Works, Pilgrim Markets, The Alms Roads;
- late: The Monastic University, The Chapter Houses, The Apostolic Succession, The Holy Army, The Rising Nave, The Pious Masons.

---

## 4. The outward builds (the spreading faith)

**The fantasy.** Paul's journeys, Ashoka's missionaries, the Irish monks, the monks of the Silk Road, Joan of Arc's France. The faith does not stay home. Two flavours: the missions carry it by the word, and the holy war carries it by the sword.

**What the two share:** towns that follow your religion, at home and abroad, and the founder's pay from every follower. Both need a religion of the seat's own.

### The shared cards

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Living Hymnal | I | uncommon | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | the shared pay-off, carried all game | reads following towns | science, culture | Civic | live |
| The Golden Legend | II | uncommon | +2% science and culture for every foreign town your religion has converted this game, at most +30%. | the shared scaler | reads foreign towns converted this game | science, culture | Civic | **new**; existing (empire `pays` percent on `firstConversions`, the lifetime record of foreign towns the seat's faith has turned) |
| Peter's Pence | III | common | +1 gold for every two citizens abroad who follow your religion. | the Economic card both flavours seat | reads foreign followers | gold | Economic | **new**; existing (empire `pays` count on `followingForeignPop`) |
| The Great Councils | III | uncommon | +5% science and culture for every empire with a town that follows your religion, at most +30%. | percentage on the flats | reads following empires | science, culture | Civic | **new**; existing (empire `pays` percent on `followingEmpires`) |

- **Also shared:** The Calling (0), The Alms Roads (I), The Tithe of Nations and The Great Consecration (IV).
- **Sizing:**
  - **The Living Hymnal:** 12 following towns at turn 120 pay +36 of each; 25 at turn 170 pay +75.
  - **The Golden Legend:** ten foreign towns converted by turn 150 give +20%. A town that later turns away still counts.
  - **Peter's Pence:** 80 foreign followers pay +40 gold; 150 pay +75.
  - **The Great Councils:** four empires with a following town give +20%, about 190 science and culture a turn in age 4.

### 4a. The missions

**The fantasy.** The apostles on the roads of the Empire, the monks who carried the faith from town to town, the conversion of kings. The faith goes where its preachers walk.

**The loop:** buy clergy → proclaim in foreign towns → towns convert and pay the founder → the faith buys more clergy.
- **The quantity:** foreign towns converted (the `foreignCityConverted` tally and the `firstConversions` record), and proclamations.
- **The moment:** a foreign town turns to your religion. The game counts it today but pays nothing on it; Pentecost and The Mass Baptisms need it as a moment (question 7).
- **What it spends:** faith on clergy rather than buildings, and the defence of the faith at home.

#### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Calling | 0 | common | +25% faith until you have founded a religion. | opener: the race | raises faith | faith | Civic | live |
| The Living Hymnal | I | uncommon | (shared, above) | pay-off | reads following towns | science, culture | Civic | live |
| The Epistles | I | uncommon | While seated, this card gains +2 science and +2 culture each time a foreign town turns to your religion. It starts at +3 of each. | grower | reads conversions | science, culture | Civic | **new**; existing (`pays` on the `foreignCityConverted` tally) |
| The Second Prophet | I | uncommon | Prophets and apostles you buy start with one extra charge. | engine | raises proclamations | | Civic | live |
| The Mission | I | uncommon | Commission. Convert two foreign cities to your religion while this is seated. Reward: a free Apostle in your capital and 150 culture. Then this card leaves its chair. | the first goal | reads conversions | an apostle, culture | Wildcard | live (built as) |
| The Golden Legend | II | uncommon | (shared, above) | the shared scaler | reads foreign towns converted this game | science, culture | Civic | **new** |
| Mission Houses | II | uncommon | Your proclamations apply 30% more pressure. Apostles gain +1 movement. | engine | raises conversions | | Civic | live (built as) |
| The Mission Schools | II | uncommon | Prophets and apostles cost 30% less faith. | engine | raises clergy | | Civic | **new**; existing (`purchaseRider` with a religious-unit filter; clergy prices already pass through the riders) |

- **Tier 0 (the Chiefdom):** Wildcard: The Calling. Military: The Shrine Guards. Economic: The Wayside Shrines.
- **Five-chair core, Tier I (Priest-King):** Civic: The Living Hymnal, The Epistles. Wildcard: The Second Prophet, then The Mission once a foreign town is in reach. Military: The Fortified Churches or the partner's card. Economic: the partner's card.
- **Tier II (Theocracy):** Civic: The Living Hymnal, The Epistles, The Golden Legend. Wildcard: Mission Houses or The Mission Schools. Military: The Fortified Churches or the partner's card.
- **Sizing:**
  - **The Epistles:** three or four conversions by turn 100 give +9 to +11 of each; ten by turn 150 give +23.
  - **The Mission Schools:** an apostle costs 63 faith instead of 90, and a prophet 84 instead of 120.
  - **Mission Houses:** a proclamation presses 78 instead of 60.
- **How a few turns feel:**
  - Turn 40: The Calling speeds the faith toward the first prophet.
  - Turn 75: the prophet founds the faith, then proclaims with The Second Prophet's third charge, and a foreign town turns. The Epistles gains +2.
  - Turn 130: apostles proclaim from town to town. Seven foreign towns have turned: The Golden Legend reads +14%, and The Living Hymnal pays for fifteen following towns.
- **Also fits:** The Alms Roads; Pastoral Shrines and Lay Offerings for faith; The Fortified Churches.

#### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Living Hymnal | I | uncommon | (shared, above) | carried scaler | reads following towns | science, culture | Civic | live |
| The Golden Legend | II | uncommon | (shared, above) | carried scaler | reads foreign towns converted this game | science, culture | Civic | **new** |
| Peter's Pence | III | common | (shared, above) | the Economic chair | reads foreign followers | gold | Economic | **new** |
| Pentecost | III | rare | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | capstone: a chain | raises conversions | | Civic | **new**; new shape (a moment when a foreign town converts; the pressure grant exists, as on Joan of Arc's kills) |
| The Mass Baptisms | III | uncommon | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | the moment | reads conversions | science, culture | Civic | **new**; new shape (the same moment, asked as a first: the `conversion` record exists) |
| The Mendicant Friars | III | uncommon | Proclaiming does not end your apostles' turn. | engine: a broken rule | raises conversions | | Civic | **new**; new shape (an act that does not take the apostle's day) |
| The Great Councils | III | uncommon | (shared, above) | percentage on the flats | reads following empires | science, culture | Civic | **new** |
| The Great Consecration | IV | rare | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. | finisher: the win | reads foreign following towns | production toward the Opus | Economic | live |
| The Conversion of Kings | IV | rare | Commission. Have a rival's capital follow your religion while this is seated. Reward: a free Prophet in your capital and 300 culture. Then this card leaves its chair. | the late goal | reads a rival's capital | a prophet, culture | Wildcard | live (built as) |

- **Tier III (Divine Mandate):** Economic: Peter's Pence. Civic: Pentecost, The Mass Baptisms, The Mendicant Friars. Wildcard: The Living Hymnal, The Golden Legend. Military: the partner's two cards, or The Fortified Churches.
- **Tier IV (the Curia):** Economic: Peter's Pence, The Great Consecration. Civic: Pentecost, The Mass Baptisms, The Mendicant Friars, The Great Councils. Wildcard: The Living Hymnal, The Golden Legend, The Conversion of Kings. Military: the partner's two cards.
- **Carried over:** The Living Hymnal (+75 of each at turn 170) and The Golden Legend (+20% to +30%).
- **The capstone, Pentecost:** a conversion presses the towns around it, so one proclamation that turns a town can turn two or three more on the same turn. A chain ends, because a town that already follows cannot turn again. It is a rule-breaker and a visible moment at once.
- **The moment, The Mass Baptisms:** each foreign town that turns for the first time pays twenty times its population in science and culture. Asked as a first, it cannot be farmed by losing a town and winning it back.
- **Sizing:**
  - **Pentecost:** each conversion presses 20 on every town within four hexes, about a third of a prophet's lump.
  - **The Mass Baptisms:** a town of ten pays 200 science and 200 culture.
  - **The Mendicant Friars:** an apostle proclaims, walks on and proclaims again: two towns a turn instead of one.
  - **The Great Consecration:** eight foreign following towns give +40% toward the Opus.
- **How a few turns feel:**
  - Turn 160: an apostle turns a border town. Pentecost presses the towns around it, and two more turn the same turn. The Mass Baptisms pays for all three.
  - Turn 175: two apostles cross a rival's country, each proclaiming twice a turn (The Mendicant Friars).
  - Turn 190 (Tier IV): a rival's capital follows your faith (The Conversion of Kings), and The Great Consecration gives the Opus +40%.
- **Without Tier IV,** the eight chairs of Tier III stand, with the capstone and the moment in them. The Epistles and Mission Houses wait in the collection for a chair.

**Utility mix:**
- science and culture: The Living Hymnal, The Epistles, The Golden Legend, The Mass Baptisms, The Great Councils;
- gold: Peter's Pence;
- production: The Great Consecration, and purchases made with the faith the clergy do not need.

**Gives up:** production, and the defence of the faith at home: its own towns can be turned while its clergy are abroad.

**Partners:** Commerce (routes carry the faith: Commerce's The Silk Road Monks), Scientific (The Schoolmen's Charter brings the apostle early), Magisterial (more drafts, so more clergy cards seen).

**Leaders:** none points squarely here. Joan of Arc's kills press the faith, and Mansa Musa's routes pay faith.

**Alternatives:**
- early: The Alms Roads, The Fortified Churches, Pastoral Shrines;
- late: The Tithe of Nations, The Great Commission, The Corpus Christi, The Learned Clergy, The Interdict (deferred, question 11).

### 4b. The holy war

**The fantasy.** Joan of Arc, the Reconquista, the military orders, the Northern Crusades. The faith marches with the army. Its soldiers fight best on ground that keeps the faith, every battle presses the faith on the land around, and every town taken turns to it.

**The loop:** buy soldiers with faith → they fight best on the faith's ground → kills and captures press the faith on the land → more ground follows, and more faith buys more soldiers.
- **The quantity:** towns that follow your religion (the battlefield), kills, and units bought with faith. "The faith's ground" in this section means land that follows your religion, which is what the combat condition `followingTerritory` asks.
- **The moment:** a war declared (The Holy Summons) and a town taken (The Rededication).
- **Needs a religion** for the faith's ground. Soldiers bought with faith and faith from kills need none.
- **With Dominion** this is the pair grid's holy war, but every Devotion seat draws the shared Dominion · Devotion cards.

#### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Shrine Guards | 0 | common | (the faith economy, above) | opener: soldiers bought with faith | raises purchases | units | Military | **new** |
| Rites of Passage | 0 | common | Gaining a military unit grants 12 faith. | opener: soldiers pay faith back | reads units gained | faith | Civic | live (shared with Dominion) |
| The Sacred Host | I | rare | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. | build-defining | raises purchases; reads kills | units, faith | Military | live (shared with Dominion) |
| The Oriflamme | I | uncommon | Military units beside one of your religious units gain +4 strength. | engine: the clergy march with the army | | strength | Military | live (shared with Dominion) |
| The Living Hymnal | I | uncommon | (outward, above) | pay-off | reads following towns | science, culture | Civic | live |
| The Book of Life | I | uncommon | (the faith economy, above) | grower: every soldier bought with faith counts | reads purchases | science, culture | Civic | **new** |
| The Spiritual Host | II | uncommon | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. | pay-off: the faith's ground | reads following land | strength | Military | live |
| The Crusader Orders | II | uncommon | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | engine: taking ground | raises following towns | strength | Military | live (built as; shared with Dominion) |
| Convert It or Tax It | II | uncommon | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. | the Economic chair | reads captured towns | gold, faith | Economic | live (shared with Dominion) |
| The Victory Hymns | II | uncommon | Killing a unit presses your religion on every town within three hexes. | engine: kills spread the faith | raises following towns | pressure | Civic | **new**; existing (a `kill` rider with a pressure grant, as Joan of Arc's ability) |

- **Tier 0 (the Chiefdom):** Military: The Shrine Guards. Wildcard: Rites of Passage. Economic: the partner's card or The Wayside Shrines.
- **Five-chair core, Tier I (War Chief: 2 Military, 1 Economic, 1 Civic, 1 Wildcard):** Military: The Sacred Host, The Oriflamme. Civic: The Living Hymnal. Wildcard: The Book of Life. Economic: the partner's card or The Wayside Shrines.
- **Tier II (Tyranny: 3 Military, 1 Economic, 0 Civic, 1 Wildcard):** Military: The Sacred Host, The Spiritual Host, The Crusader Orders. Economic: Convert It or Tax It. Wildcard: The Living Hymnal. Under Theocracy instead, The Victory Hymns takes a Civic chair.
- **Sizing:**
  - **The Shrine Guards:** a Spearman (27 hammers) costs 54 faith in age 1, so a town can answer a barbarian raid the turn it comes.
  - **The Sacred Host:** a war of twenty kills pays 300 faith, two age 2 Swordsmen bought with faith.
  - **The Victory Hymns:** each kill presses 20 on every town within three hexes, a third of a prophet's lump, so a frontier war turns the frontier.
- **How a few turns feel:**
  - Turn 30: barbarians come at the third town, which buys a Spearman with faith. Rites of Passage pays 12 faith back.
  - Turn 80: at war, Temple towns buy Swordsmen with faith, kills pay 15 faith, and the prophet marching with the army gives The Oriflamme's +4.
  - Turn 130: the army fights on ground that follows your faith (+4), every kill presses the faith on the towns near the field, and the frontier turns.
- **Also fits:** The Fortified Churches; The Victory Hymns under Theocracy; with Dominion, its kill and loss cards.

#### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Living Hymnal | I | uncommon | (above) | carried scaler | reads following towns | science, culture | Civic | live |
| The Spiritual Host | II | uncommon | (above) | carried: the war line | reads following land | strength | Military | live |
| Convert It or Tax It | II | uncommon | (above) | carried: the Economic chair | reads captured towns | gold, faith | Economic | live |
| The Turning of Swords | III | rare | An enemy unit you kill in land that follows your religion joins your side instead, at most once a turn. | capstone: a broken rule | reads kills on the faith's ground | units | Military | **new**; new shape (Blood Brothers' rule for empires' units, on following ground, once a turn) |
| The Holy Summons | III | uncommon | Declaring war gives every town of yours that follows your religion the best melee unit you can build, at most once every twenty turns. | the moment | reads following towns | units | Military | **new**; existing (a `declareWar` rider granting `bestMelee` to every town the `follows` scope admits, as The Landsturm, with `oncePerTurns`) |
| The Rededication | III | uncommon | Capturing a town turns all its citizens to your religion. | the second moment | raises following towns | | Civic | **new**; new shape (a grant that turns a town) |
| The Offering Chests | III | common | (the faith economy, above) | utility: a cheap army | raises purchases | units | Military | **new** |
| Peter's Pence | III | common | (shared, above) | the second Economic chair | reads foreign followers | gold | Economic | **new** |
| The Great Councils | III | uncommon | (shared, above) | percentage on the flats | reads following empires | science, culture | Civic | **new** |
| The Last Crusade | IV | uncommon | Your military units gain +8 strength against an empire that is building the Magnum Opus, while fighting in territory that follows your religion. | finisher: denies the Opus | | strength | Military | live |
| The Host Restored | IV | rare | (the liturgical year, above) | utility: the army made whole | | healing | Military | live (built as a rite) |

- **Tier III (Imperium: 3 Military, 2 Economic, 1 Civic, 2 Wildcard):** Military: The Turning of Swords, The Holy Summons, The Spiritual Host. Economic: Convert It or Tax It, Peter's Pence. Civic: The Rededication. Wildcard: The Living Hymnal, The Offering Chests.
- **Tier IV (the Sultanate: 4 Military, 2 Economic, 2 Civic, 3 Wildcard):** adds The Last Crusade (Military), The Great Councils (Civic) and The Host Restored (Wildcard). All eleven are Devotion's.
- **Carried over:** The Living Hymnal, which counts every captured town that turns, and The Spiritual Host and Convert It or Tax It in the typed chairs.
- **The capstone, The Turning of Swords:** on the faith's ground, the enemy's army changes sides one soldier a turn. It is Dominion's Blood Brothers taken from the barbarians to the empires, and held to the faith's ground.
- **The moments:** declaring war raises a soldier in every faithful town (The Holy Summons), and every town taken turns at once (The Rededication), so it counts for The Living Hymnal and for Convert It or Tax It's cheaper authority at once.
- **Sizing:**
  - **The Holy Summons:** eight following towns raise eight Longswordsmen (340 hammers each), about 2,700 hammers of army on the turn war is declared. Dominion's The Arrière-ban is of the same size.
  - **The Turning of Swords:** a twenty-turn war on the faith's ground turns up to twenty enemy units.
  - **The Offering Chests:** a Knight (445 hammers) costs 623 faith instead of 890.
  - **The Last Crusade:** +8 is about a tenth to a sixth of an age 4 unit's strength, against the empire raising the Opus.
- **How a few turns feel:**
  - Turn 160: you declare war on the empire raising the Opus, and eight faithful towns each raise a Longswordsman.
  - Turn 165: on your faith's ground an enemy Knight falls, and rides for you the next turn.
  - Turn 175: you take a town. Its people turn to your faith at once, and it costs one less authority.
  - Turn 190 (Tier IV): your army fights at +8 against the Opus builder on ground that follows you, and a town of yours says the Restoring of the Host.
- **Without Tier IV,** the eight chairs of Tier III stand, with the capstone and both moments in them.

**Utility mix:**
- science and culture: The Living Hymnal, The Great Councils; with Dominion, its kill cards;
- production: soldiers bought with faith, The Holy Summons, captured towns;
- faith: Rites of Passage, The Sacred Host's kills;
- gold: Convert It or Tax It, Peter's Pence;
- healing: The Host Restored.

**Gives up:** peace, since its pay-offs need war, and its towns' own buildings, since its faith goes into soldiers.

**Partners:** Dominion (the conqueror takes the towns, the endless host feeds the faith-bought army, and Dominion's kill cards pay the science this flavour lacks).

**Leaders:** Joan of Arc (kills pay faith and press the faith; +4 on the faith's ground), Modu Chanyu (mounted riders; pastures pay faith).

**Alternatives:**
- early: The Fortified Churches, The Victory Hymns, Rites of Passage;
- late: The Peace of God, the shared The Holy Army, The Crusader Orders, The Sacred Host.

---

## 5. Flexing between inward and outward

A seat can lean one way and turn the other as the game goes on. These cards reward the turn.

| Card | Tier | Rarity | The flex | Type | Status, shape |
|---|---|---|---|---|---|
| The Living Hymnal | I | uncommon | both ways: it counts your own following towns, so it pays an inward founder from the start, and an outward one for every town abroad | Civic | live |
| The Second Prophet | I | uncommon | a third charge raises a holy site or proclaims | Civic | live |
| The Settled Faith | II | rare | outward → inward: less pressure abroad for science at home | Civic | live |
| The Mission Schools | II | uncommon | both ways: cheaper prophets for holy sites, cheaper apostles for proclamations | Civic | **new** |
| The Corpus Christi | III | uncommon | inward → outward: a rite that presses the faith like a holy site, so the liturgical year spreads its faith without clergy | Civic | **new** |
| The Abbeys | III | rare | holy places ↔ missions: the apostles that raise sites are the ones that proclaim | Civic | **new** |
| The Holy Inquisition | III | uncommon | outward → inward: keeps rival faiths out of towns the missions have left | Civic | live |

**How a flex plays out over a game:**
- **Age 1 (Tier 0):** faith from Shrines and herds, the first rites, a soldier bought with faith when needed. Nothing is decided yet.
- **Age 2 (Tier I):** the race to found. A seat that wins it raises holy sites and starts The Living Hymnal; a seat that loses it keeps rites and buys with faith.
- **Age 3 (Tier II):** inward. Temples and Cathedrals, The Settled Faith, rites in every town; the faith presses its neighbours by itself.
- **Age 4 (Tiers III and IV):** outward. Apostles raise sites (The Abbeys) and proclaim (Pentecost); Cathedral towns keep processions (The Corpus Christi); the followers abroad pay toward the Opus (The Great Consecration).
- **What a flex gives up:** neither side's capstone comes early, and a council split two ways is never as deep as one built for a single flavour.

**Into the faith economy:** every build buys with faith, whether clergy, soldiers, faith houses or buildings, so The Book of Life and The Chantries pay in each. Late, The Unceasing Prayer frees a rite seat's faith for purchases, and The Pious Masons and The Last Offering are every build's road to the Opus with faith.

**Without a religion:** the faith economy, the liturgical year and the holy war's faith-bought army need none. Of the inward shared cards, The Fortified Churches, The Parish Churches and The Doctors of the Church still pay; The Doctors of the Church raises a rival's follower beliefs in towns of yours that keep them.

---

## 6. Across the builds

### Bridges and pivots

- **The faith economy feeds every build.** The Book of Life counts every purchase made with faith. The Shrine Guards and The Offering Chests are faith purchases and holy war cards at once. The Gifts of the Faithful and The Fabric Fund buy the Cathedrals that the holy places and The Unceasing Prayer read.
- **Inward:** The Fortified Churches, The Parish Churches and The Doctors of the Church in both flavours; The Votive Gifts, a rite that buys production, in the faith economy and the liturgical year.
- **Outward:** The Living Hymnal, The Golden Legend, Peter's Pence and The Great Councils in both flavours.
- **The pivots this opens:**
  - faith economy → holy places: Cathedrals bought with faith feed The Consecration Feast and The Chapter Houses;
  - liturgical year → missions: The Corpus Christi;
  - holy places → missions: The Abbeys;
  - missions → holy war: the ground Pentecost turns is where The Spiritual Host fights;
  - holy war → faith economy: The Offering Chests and The Book of Life.

### The checks

| Check | Faith economy | Liturgical year | Holy places | Missions | Holy war |
|---|---|---|---|---|---|
| **One loop** | purchases made with faith | rites said | holy sites | conversions | the faith's ground |
| **Better together** | The Book of Life pays +2 of each alone, about +30 by turn 150 beside three purchase rules | The Psalter and The Rogations pay twice under The Double Feast | Temple Estates pays on six hexes a site, and The Abbeys multiplies the sites | Pentecost's chains feed The Mass Baptisms, The Epistles and The Golden Legend on one turn | The Spiritual Host's +4 needs the ground The Victory Hymns and The Rededication turn |
| **Several routes** | any two of The Gifts of the Faithful, Consecrated Labor, The Monastic Builders, The Lay Brothers, The Offered Stones | rites need only faith; The Rites Commonwealth, The Fast, The Sabbath Laws and The Founding Vows push them | The Anchorites, The Second Prophet, The Mission Schools, The Abbeys | The Second Prophet, Mission Houses, The Mission Schools, The Mendicant Friars | The Shrine Guards, The Sacred Host, The Offering Chests buy the army; The Victory Hymns, The Crusader Orders, The Rededication turn the ground |
| **A scaler carries over** | The Book of Life, The Chantries | The Rogations, The Old Observances | Temple Estates, The Old Holy Places | The Living Hymnal, The Golden Legend | The Living Hymnal |
| **Essentials, early** | science (Libraries bought, The Book of Life), culture (The Book of Life), production (purchases) | science (The Priest-Astronomers, The Settled Faith), culture (The Rogations, the Sabbath), production (the Votive Offering) | science (The Cathedral Works), culture (the sites, The Old Holy Places), production (Sacred Commissions) | science and culture (The Living Hymnal, The Epistles); production only through purchases | science and culture (The Living Hymnal); production (soldiers bought with faith, captured towns) |
| **Essentials, late** | The Learned Clergy, The Treasury of Merit, The Votive Tablets, The Pious Masons, The Last Offering | The Psalter, The Old Observances, The Rogations, The Work of God | The Consecration Feast, The Seven Pilgrimages, The Pilgrim Towns, The Last Offering | The Mass Baptisms, The Great Councils, The Great Consecration | The Great Councils, The Holy Summons, Convert It or Tax It |
| **Needs a religion** | no (The Last Offering needs a holy city) | no | yes | yes | for the faith's ground |

- **The build beats a pile.** The deck's strongest single cards (The Living Hymnal, The Learned Clergy, The Treasury of Merit, The Chapter Houses, The Creed, The Festival Calendar, The Cathedral Works, Temple Estates, The Saints' Fields, The Holy Inquisition, The Seven Pilgrimages) are flats and percentages on the faith rate, on buildings and on following towns, and none multiplies another. Each late build carries what such a pile lacks: The Double Feast doubles every rite card, The Abbeys multiplies every holy-site card, Pentecost multiplies conversions, The Pious Masons and The Fabric Fund multiply what faith buys, and The Turning of Swords takes the enemy's army. A liturgical council at turn 180 holds The Rogations near +100 of each, The Old Observances at +30% and The Psalter at 60 of each a turn, against a pile in which no card has grown.
- **Every card has a home.** Each card on the sheet sits in a build or among its alternatives ("Sheet cards no build uses", below).
- **Individual usefulness falls with the band.** Tier 0 is openers and glue (First Rites, Pastoral Shrines, Lay Offerings, The Wayside Shrines, The Shrine Guards, The Gifts of the Faithful). The new Tier III and IV cards do little alone: The Double Feast without rites, The Abbeys without a religion, Pentecost without clergy, The Turning of Swords at peace.
- **Glue is a minority.** About fifteen of the deck's 105 cards with this pass are glue: the Tier 0 faith flats, The Consolation, The Alms Roads, The Offertory, The Wayside Shrines, and the shared Sacred Groves, The Flood Festival, Cloister Schools and The Monastery Libraries.

### New shapes, and the cards that use them

**The count:** 36 new cards and one move. 16 use shapes that exist, 2 nearly exist (The Fortified Churches, The Sabbath Laws) and 18 need a new shape. Each family reads a mechanic the game already has.

1. **The bank a purchase was paid from.** The `purchase` occasion already carries the price paid, whichever bank paid it, and `purchasedBuildings` already records the bank. What is missing is the bank as a narrowing in four places:
   - a tally of purchases made with faith: The Book of Life;
   - the `purchase` occasion narrowed to faith: The Votive Tablets;
   - a purchase rider narrowed to the faith bank: The Fabric Fund, The Offering Chests;
   - `faithBuysBuildings` narrowed to one building category: The Gifts of the Faithful.
2. **Rites:**
   - a rule on a rite's price: on a calendar turn (The Holy Year), and in the towns a scope admits (The Unceasing Prayer);
   - two rites in one town: The Double Feast (`cityRite` and `riteError` read one running rite today, and the rite menu shows one);
   - a rite that presses the faith as a holy site does: The Corpus Christi;
   - a "this game" count of rites started: The Old Observances, in the family the user approved for Dominion on 2026-10-15;
   - and a reading, not a shape: a rite started is a season (question 5).
3. **Conversions:**
   - a windfall occasion when a foreign town turns to a religion the seat is paid by, carrying the town's population: Pentecost, The Mass Baptisms. The seam exists, since the `foreignCityConverted` tally and the `conversion` first-record are written there;
   - a grant that turns a town: The Rededication.
4. **Holy sites and clergy:**
   - a card's price on a prophet's act: The Anchorites (`chargeCostOf` is the one reader);
   - apostles may raise holy sites: The Abbeys (`plantingHandOf`);
   - an act that does not end an apostle's turn: The Mendicant Friars (`spendCharge`).
5. **One card each:**
   - an enemy unit killed on the faith's ground joins you, once a turn: The Turning of Swords, Blood Brothers' rule widened;
   - a levy use that pays faith: The Oblates;
   - two small fixes: the `cityStat` count's category (The Fortified Churches), and projects halted by the Rite of the Sabbath.

Where to cut if the user wants less engine work: The Corpus Christi, The Mendicant Friars, The Rededication and The Oblates.

### Moved

- **The Pious Masons,** Tier IV to Tier III, as the faith economy's capstone (question 4).

### The new cards, by tier

- **Tier 0 (3):** The Shrine Guards (holy war, faith economy), The Gifts of the Faithful (faith economy), The Rogations (liturgical year).
- **Tier I (5):** The Book of Life (faith economy, holy war), The Anchorites (holy places), The Epistles (missions), The Fortified Churches (inward), The Oblates (faith economy, alternative).
- **Tier II (8):** The Offertory (faith economy, alternative), The Chantries (faith economy), The Parish Churches (inward), The Old Observances (liturgical year), The Sabbath Laws (liturgical year), The Golden Legend (outward), The Mission Schools (missions), The Victory Hymns (holy war).
- **Tier III (18):**
  - faith economy: The Votive Tablets, The Fabric Fund, The Offering Chests;
  - liturgical year: The Double Feast, The Holy Year, The Psalter, The Corpus Christi;
  - holy places: The Abbeys, The Consecration Feast, The Pilgrim Towns;
  - outward: Peter's Pence, The Great Councils;
  - missions: Pentecost, The Mass Baptisms, The Mendicant Friars;
  - holy war: The Turning of Swords, The Holy Summons, The Rededication.
- **Tier IV (2):** The Work of God (liturgical year), The Unceasing Prayer (liturgical year).

Two cards not yet in a table:
- **The Offertory** (Tier II, common, Civic): *"Each town gains +1 faith for every three citizens."* Existing (city `pays` count `population`). Faith income that needs no religion and grows with towns: glue for any build, and Al-Ma'mun's.
- **The Oblates** (Tier I, uncommon, Civic): *"Towns may spend a citizen to gain faith equal to twice the food it took to grow that citizen."* New shape (a levy use that pays faith). The Expansionist pair's meeting point (question 12).

Every new name was checked against `data/` and `docs/`. The first choices "The Hermitages" (a retired Expansionist row), "The Benefactors" (beside Magisterial's Public Benefactors) and names with "Crusade" (three cards and a belief already) were changed.

### Sheet cards no build uses

Every card has a home. The weakest fits:
- **The Octave:** rites that last 50% longer are said less often, so it works against The Rogations and The Psalter. It suits a seat that keeps rites rather than says many (The Rites Commonwealth, The Festival Calendar).
- **The Consolation:** glue in the liturgical year.
- **The Penitents' Roll:** faith spent on rerolls; the Magisterial pair's card.
- **The Calling:** it pays nothing once the faith is founded, so it leaves its chair early.
- **The Alms Roads:** pilgrimage glue for the holy places and the missions.
- **Deferred for a new interface:** Consecrated Ground (a faith price on the hex purchase) and The Interdict (a rite said over a foreign town; question 11).

### Notes for the sheet (stage 3)

- The sheet is still in the long form of 2026-10-12. Stage 3 rewrites it in the compact form, with a Type column that `test/sim/decks/devotion.test.ts` can check, as Dominion's and Expansionist's tests do.
- The Monastery Libraries' data row is deferred with older text ("Monasteries give +3 science..."); the sheet's revised text is *"Libraries give +2 faith. Temples give +2 science."*
- The Blessed Forges (with Scientific) and The Rising Nave (with Magisterial) are on the sheet with no data row.
- The Tithe paid nothing in 27 bot samples; the measurements flag it as a possible bug.
- The test pins a rule for Tier 0: no Tier 0 text names a prophet, a Temple, a Cathedral, an apostle or a foreign town. The three new Tier 0 cards keep it.

---

## 7. The sort

Every card on the sheet: Devotion's 52 and the 17 in its shared table, by the rules of `docs/plans/doctrines-governments-chairs.md`, section 4. A card is typed by what it pays or does, not by what it reads; a mixed card takes the type of the half that pays more, and even halves with a Civic half go Civic. A charter or commission is typed for its face. A shared card whose other deck is Dominion or Expansionist keeps the type in its data row. The nine shared with Commerce, Scientific or Magisterial get a proposed type here, marked "to reconcile", because those decks' passes are running at the same time; their drafts propose the same nine types (question 13). The new cards are typed in their build tables.

| Card | Tier | Status | Type | Why |
|---|---|---|---|---|
| First Rites | 0 | built | Civic | +2 faith on each Shrine outweighs +25% toward Shrines |
| Pastoral Shrines | 0 | built | Civic | faith and happiness outweigh the food |
| Lay Offerings | 0 | built | Civic | even faith and food |
| The Old Gods Remain | 0 | built | Civic | a belief |
| The Founding Vows | 0 | built as | Wildcard | commission |
| The Calling | 0 | built | Civic | faith |
| The Holy Spring | 0 | built | Civic | faith and culture |
| The Wayside Shrines | 0 | built | Economic | +2 food outweighs +1 happiness |
| The Consolation | I | built | Civic | happiness |
| The Priest-Astronomers | I | built | Civic | science and faith |
| Consecrated Labor | I | built | Economic | faith stands in for production: it buys workers |
| The Octave | I | built | Civic | rites |
| The Fast | I | built as (charter) | Civic | its rite pays faith |
| The Living Hymnal | I | built | Civic | science and culture |
| The Alms Roads | I | built | Civic | faith on routes |
| The Mission | I | built as | Wildcard | commission |
| Consecrated Ground | I | deferred | Economic | land bought with faith |
| The Second Prophet | I | built | Civic | the clergy's acts are the religion's, not the army's |
| The Monastic Builders | I | built | Economic | it buys buildings; faith stands in for production |
| The Creed | I | built | Civic | faith and culture |
| The Painted Chapels | I | built | Civic | culture |
| The Rites Commonwealth | I | built | Civic | happiness |
| The Saints' Fields | II | built | Economic | +5 food and +8 gold outweigh +2 happiness |
| The Cathedral Works | II | built | Civic | +8 science and +2 happiness outweigh production toward one building |
| The Old Holy Places | II | built | Civic | faith and culture |
| Temple Estates | II | built | Civic | even food and faith |
| The Votive Gifts | II | built as (a rite) | Economic | faith into production |
| The Spiritual Host | II | built | Military | +4 strength outweighs +2 happiness at war |
| Mission Houses | II | built as | Civic | pressure; the apostles' movement is the smaller half |
| The Festival Calendar | II | built | Civic | even food and culture |
| The Penitents' Roll | II | built as | Civic | science and culture outweigh the cheaper reroll |
| The Lay Brothers | II | built | Economic | it buys buildings |
| The Settled Faith | II | built as | Civic | science and happiness |
| The Holy Inquisition | III | built | Civic | faith; rival pressure |
| The Learned Clergy | III | built | Civic | science and culture |
| The Offered Stones | III | built | Economic | opening faith purchases in every town outweighs +2 culture a building (question 10) |
| The Doctors of the Church | III | built as | Civic | it raises beliefs, not Orders, so it is not a Wildcard |
| The Monastic University | III | built | Civic | science and faith |
| The Great Consecration | IV | built | Economic | production toward the Opus |
| The Last Offering | IV | built | Economic | production toward the Opus |
| The Great Commission | IV | built as | Wildcard | commission |
| The Tithe of Nations | IV | built | Civic | faith |
| The Treasury of Merit | IV | built | Civic | science and culture |
| The Apostolic Succession | IV | built | Civic | science and culture |
| The Chapter Houses | IV | built | Civic | science and culture |
| The Seven Pilgrimages | IV | built as | Civic | science and culture |
| The Interdict | IV | deferred | Civic | a rite said against a rival town |
| The Peace of God | IV | built | Military | the Opus town's defence outweighs its shelter from pressure |
| The Last Crusade | IV | built | Military | strength |
| The Conversion of Kings | IV | built as | Wildcard | commission |
| The Pious Masons | IV (to III) | built as | Economic | it buys a wonder |
| The Host Restored | IV | built as (a rite) | Military | it heals units |
| Rites of Passage (Dominion) | 0 | built | Civic | as in the data |
| Sacred Groves (Expansionist) | 0 | built | Civic | as in the data |
| The Sacred Host (Dominion) | I | built | Military | as in the data |
| The Oriflamme (Dominion) | I | built | Military | as in the data |
| The Flood Festival (Expansionist) | I | built as | Civic | as in the data |
| Pilgrim Markets (Commerce) | I | built | Civic | even gold and faith; shared, to reconcile |
| Cloister Schools (Scientific) | I | built | Civic | even food and science; shared, to reconcile |
| Sacred Commissions (Magisterial) | I | built | Economic | +38% toward wonders outweighs 60 faith a wonder; shared, to reconcile |
| The Monastery Libraries (Scientific) | I | revised; the data row is deferred | Civic | faith and science; shared, to reconcile |
| The Tithe (Commerce) | II | built | Economic | gold; shared, to reconcile |
| The Cloister (Scientific) | II | built | Civic | science outweighs food; shared, to reconcile |
| The Crusader Orders (Dominion) | II | built as | Military | as in the data |
| Convert It or Tax It (Dominion) | II | built | Economic | as in the data |
| The Blessed Forges (Scientific) | II | sheet only | Civic | even faith and production; shared, to reconcile |
| Sacred Patronage (Magisterial) | III | deferred | Civic | great people and faith; shared, to reconcile |
| The Rising Nave (Magisterial) | III | sheet only | Civic | faith and culture; shared, to reconcile |
| The Holy Army (Dominion) | III | built | Civic | as in the data |

### Counts

| Tier | Military | Economic | Civic | Wildcard | All | Dealt today | With this pass's new cards |
|---|---|---|---|---|---|---|---|
| Tier 0 | 0 | 1 | 6 | 1 | 8 | 8 | 11: 1 M, 2 E, 7 C, 1 W |
| Tier I | 0 | 3 | 10 | 1 | 14 | 13 | 19: 1 M, 3 E, 14 C, 1 W |
| Tier II | 1 | 3 | 7 | 0 | 11 | 11 | 19: 1 M, 3 E, 15 C |
| Tier III | 0 | 1 | 4 | 0 | 5 | 5 | 24: 3 M, 4 E, 17 C |
| Tier IV | 3 | 3 | 6 | 2 | 14 | 13 | 15: 3 M, 3 E, 7 C, 2 W |
| **All** | **4** | **11** | **33** | **4** | **52** | **50** | **88: 9 M, 15 E, 60 C, 4 W** |
| Shared | 3 | 3 | 11 | 0 | 17 | 13 | |

- The two deferred cards are Consecrated Ground (Economic, Tier I) and The Interdict (Civic, Tier IV), so the 50 dealt today are 4 Military, 10 Economic, 32 Civic and 4 Wildcard.
- "With this pass's new cards" adds the 36 new cards (The Oblates and The Offertory included) and moves The Pious Masons to Tier III. The new cards alone are 5 Military, 4 Economic and 27 Civic.
- Of the shared cards, four are not dealt today: The Monastery Libraries and Sacred Patronage (deferred), and The Blessed Forges and The Rising Nave (sheet only).
- Devotion is the mirror of Expansionist: Expansionist is 80 Economic of 120, and Devotion after this pass is 60 Civic of 88.

### Close calls

- **The faith purchases** (Economic): Consecrated Labor, The Monastic Builders, The Lay Brothers, The Votive Gifts, The Offered Stones, The Pious Masons, and two new cards, The Gifts of the Faithful and The Fabric Fund. Each spends faith, but what it does is build, in production's place. The other reading types them Civic and leaves Devotion with almost no Economic card (question 2).
- **The Wayside Shrines** (Economic): +2 food against +1 happiness.
- **The Second Prophet and The Mission Schools** (Civic): a unit's charge or price is a unit rule, which the rules list under Military, but clergy do the religion's work, not the army's.
- **The Doctors of the Church** (Civic): it amplifies lines, which is a Wildcard's job, but the lines are beliefs', not Orders'.
- **The Offered Stones** (Economic): your second sentence, "You can purchase buildings with faith", is the larger effect (question 10).
- **The Peace of God** (Military): +2 defence for each following town, up to +30, against no rival pressure in the Opus town.
- **The Interdict** (Civic): it cuts a rival's production, which is neither a yield of yours nor combat; it is a rite, paid in faith.
- **Sacred Commissions** (Economic, to reconcile): production toward wonders against faith from wonders.

### Where a tier leans, and what it means under each government

- **Tier 0 leans Civic** (6 of 8, and 7 of 11 with the new cards), and the Chiefdom (1 Military, 1 Economic, 1 Wildcard) has no Civic chair. A Devotion seat seats one Civic card in its first four drafts. Two new cards, The Shrine Guards and The Gifts of the Faithful, give the Military and Economic chairs a Devotion card each, beside The Wayside Shrines.
- **Tier I** (the tier-4 governments): Priest-King (2 Civic) seats three Civic cards with its Wildcard; the Council of Elders (2 Economic) seats the faith economy; War Chief (2 Military) seats the holy war's shared Military cards and The Fortified Churches.
- **Tier II** (the tier-10 governments): Theocracy (3 Civic) is Devotion's home and seats four of five chairs; the Republic (3 Economic) seats the faith economy; under Tyranny (3 Military, no Civic) a Devotion seat has The Spiritual Host and the shared The Crusader Orders and The Sacred Host, and leans on its partner.
- **Tier III** (the tier-18 governments): Divine Mandate (3 Civic) seats the inward builds and the missions, and pays +1 faith and +1 culture in the capital for each Civic Order; the Merchant League (3 Economic) seats the faith economy; Imperium (3 Military) seats the holy war's new Military cards.
- **Tier IV** (the tier-26 governments): the Curia (4 Civic) seats any Civic build and pays +6 faith for each Cathedral; the Estates (4 Economic) seat the faith economy's finishers; the Sultanate (4 Military) seats the holy war.
- **Each build leans its own way,** which steers its government: the faith economy Economic, the holy war Military, and the liturgical year, the holy places and the missions Civic.
- **Typed chairs keep early cards seated.** Few late Military and Economic cards fit the Civic builds, so The Fortified Churches, The Votive Gifts and The Saints' Fields hold those chairs into the late game.

---

## 8. Open questions for the user

Each starts with the recommendation.

1. **The shape of the deck.** *Recommended: one build for the core idea (the faith economy) and two main builds with two flavours each: inward (the liturgical year, the holy places) and outward (the missions, the holy war).* Expansionist's main builds have three flavours each. Two more are ready if you want them: the scriptorium (inward: science from faith, with Scientific, for Al-Ma'mun) and the pilgrim roads (outward: routes to holy places, with Commerce, for Mansa Musa). Recommended: not yet, since their cards already serve the shared cards and the holy places.
2. **Faith purchases are Economic.** *Recommended: yes.* Consecrated Labor, The Monastic Builders, The Lay Brothers, The Votive Gifts, The Offered Stones, The Pious Masons, and two new cards, The Gifts of the Faithful and The Fabric Fund, build things in production's place. Typed Civic, they would leave Devotion with seven Economic cards of 88, and the faith economy would have no Economic government to lead.
3. **The Civic lean.** *Recommended: accept it as the deck's steer toward the governments that lead with Civic chairs (Priest-King, Theocracy, Divine Mandate, the Curia), and adopt the new Military and Economic cards so the Chiefdom's and Tyranny's chairs are not forced empty:* The Shrine Guards, The Gifts of the Faithful, The Fortified Churches, The Fabric Fund, The Offering Chests, The Holy Summons, The Turning of Swords, Peter's Pence and The Work of God. After this pass Devotion is 60 Civic of 88. (Expansionist's mirror question was deferred.)
4. **The Pious Masons to Tier III,** as the faith economy's capstone. *Recommended: yes.* Tier IV opens at 26 drafts, which is not measured yet, and the skill keeps capstones in Tier III.
5. **What counts as a rite started.** *Recommended: only a rite that lasts, a season.* The Votive Offering can be said once a turn in every town, and costs only the faith it turns into production. If it counted, The Rogations, The Psalter and The Old Observances would grow every turn for nothing, and under The Unceasing Prayer The Psalter would pay in every Cathedral town every turn. Today the count includes it: The Founding Vows counts any rite.
6. **The rite rule changes.** *Recommended: yes to all three.* Two rites in one town (The Double Feast, the liturgical capstone), free rites on every twentieth turn (The Holy Year, the moment) and free rites in Cathedral towns (The Unceasing Prayer, Tier IV). The Double Feast changes the one-rite rule, and the rite menu must show two running rites.
7. **A conversion as a moment.** *Recommended: yes, a new moment when a foreign town turns to your religion,* for Pentecost and The Mass Baptisms. Pentecost can chain through a crowded region, and needs no turn limit, because a town that already follows cannot turn again. The Mass Baptisms pays only the first time a town turns, so a town lost and won back pays nothing more.
8. **Holy sites.** *Recommended: yes to The Anchorites (a further holy site for one charge) and The Abbeys (apostles raise holy sites).* Today only a prophet raises one, for two charges, and the holy places' cards pay little on the one to three sites a game makes.
9. **The Turning of Swords.** *Recommended: yes, as the holy war's capstone:* an enemy unit killed on your faith's ground joins you, once a turn. It is Blood Brothers' rule, taken from barbarians to empires and held to the faith's ground.
10. **The Offered Stones' second sentence.** *Recommended: keep the card as you wrote it.* Your revision lets faith buy buildings in every town, so for a seat holding The Lay Brothers too, its Temple condition no longer matters. This pass types the card Economic for that sentence and makes it the faith economy's Tier III pay-off.
11. **The Interdict.** *Recommended: rework it so it can be built:* "A rival's town that follows your religion adds 30% less production to the Magnum Opus." As written it needs a rite said over a foreign town, which is a new interface, so it stays deferred. The rework needs the shape Dominion's deferred Circumvallation also needs: a line on a rival's Opus production.
12. **The Oblates.** *Recommended: add it as an alternative in the faith economy:* "Towns may spend a citizen to gain faith equal to twice the food it took to grow that citizen." It gives the Expansionist pair, which has no leader and was called the weakest pair, a meeting point: Expansionist's "Needs a levy" cards are dealt to a seat that holds it.
13. **Shared types to reconcile.** *Recommended: confirm the nine types as proposed.* Nine cards shared with Commerce, Scientific and Magisterial get proposed types in "The sort": seven Civic (Pilgrim Markets, Cloister Schools, The Monastery Libraries, The Cloister, The Blessed Forges, Sacred Patronage, The Rising Nave) and two Economic (Sacred Commissions, The Tithe). The Commerce, Scientific and Magisterial drafts written the same day (`docs/plans/commerce-builds.md`, `scientific-builds.md`, `magisterial-builds.md`) propose the same type for each; the Scientific draft calls The Cloister a close call, because its food on schools can be the larger half.

After these, the deck pass goes on to the sheet in its compact form (stage 3), then Devotion's Doctrines: one direction for each build, so each has a Doctrine at most tiers.

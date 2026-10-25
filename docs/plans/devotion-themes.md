# Devotion: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-23. Nothing here is built. The deck sheet (`docs/decks/devotion.md`), the data and the code are unchanged. This is the Devotion deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"), done in the same way as the Scientific, Dominion, Expansionist and Commerce passes (`docs/plans/scientific-themes.md`, `docs/plans/dominion-themes.md`, `docs/plans/expansionist-themes.md`, `docs/plans/commerce-themes.md`). It replaces the builds of `docs/plans/devotion-builds.md` (2026-10-17). That file's map of materials and its leaders still hold, and they are refreshed here. The review list is `docs/plans/devotion-list-proposed.md`.

Your request, 2026-10-23, verbatim:

> *"begin doing a pass on both devotion and magisterial"*

The direction for every pass, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

Your picture of the deck, 2026-10-20, verbatim (`docs/decks/deck-design.md`, "Direction, 2026-10-20"):

> *"devotion: should make faith feel like a win condition. like civ, i imagine this build to have higher up front costs (investing in faith when other factions don't need to) but having powerful bonuses from the additional investment in faith. thematically with history, faith allows greater authority and wider empires and allows larger population centers to remain happy (constantinople, the umayyad caliphates). This should be a flexible deck, as the faith economy should ostensibly allow you to play for any win condition, and should have the most shared deck cards. Strength from having more followers, performing religious actions, performing actions in devout cities, and playing around the bonuses from your religion."*

The table of 2026-10-20 says Devotion is paid for devotion (faith spent, devout towns, followers), is strongest late, when the investment pays back, and gives up early tempo, because it pays up front. The splits give Devotion flexibility in how it wins, and (as a proposal) the authority and happiness of the towns that follow its religion, paid for with faith.

The pass also follows your taste from the four passes before it:
- early cards help a seat develop its towns, and do not wait on a mechanic that opens later (the Commerce revision, 2026-10-21);
- no two cards do the same job;
- text is short and simple;
- commissions give a mix of institutions and one-time rewards (the Commerce answers, 2026-10-23);
- cut what is not impactful, too strong or "win more";
- prefer a rule-breaker that bends one core rule, and late pay as a percentage;
- make bridging cards shared cards.

It does not write Doctrines (Devotion has none yet).

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Charters take no chair.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161. In bot games age 2 starts at about turn 55, so Tier I often opens before The High Temple (the age-2 technology that brings Temples and prophets).
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). A *capstone* breaks a rule or doubles a category. *Engine glue* raises or spends the engine itself. A *bridge* serves two themes.
- **Status:**
  - *kept*: on the sheet and in the data, unchanged;
  - *reworked*: on the sheet, changed by this pass;
  - *moved*: to another tier, or to the shared cards;
  - *new*: not on the sheet. "(10-17)" marks a card from the superseded builds pass;
  - *cut*: on the sheet; its data row is retired.
- **Shape:** *existing*, *near existing* (one small field, or a fact one seam already holds), *new shape* (section 7), or *feature E* / *feature F* (section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **A devout town** is one of your towns that follows your religion: more than half its citizens follow a religion whose holy city you hold. The game asks it with the town scope `ownersFaith` (`keeps: true`). Feature E proposes "devout" as the card word for it. The card texts below still write it out in full.
- **Numbers are first guesses** against the power bar. The effort went into shape. Faith buys production at 2 faith a hammer, and a rite costs 40, 56, 72 or 90 faith by age.

## 2. The map

### The way to play

- Devotion invests in faith early, when other decks spend nothing on it. In age 1 its towns raise Shrines, say rites and climb the faith ladder to their first gods. In age 2 it races to found a religion. From then on the faith holds the realm together: towns that follow the religion are content, cheap to rule and quick to buy what they cannot build, so the realm can grow wide and its cities can grow great.
- It is paid for devotion: faith spent, devout towns and followers. It is strongest late, when the early investment pays back through the capstones and the scalers. It gives up early tempo, because its first chairs pay faith while other seats take science, culture and production.
- It is a flexible deck in how it wins. Faith converts into everything: buildings and soldiers bought with faith, a half-built wonder bought outright, faith poured into the Magnum Opus, followers abroad who push the Opus, and soldiers who fight best on the faith's ground.

### The engine

- **Faith, and what it buys.** The deck makes faith in bulk and spends it in two ways: on purchases (buildings, workers, soldiers, a wonder, the Opus) and on rites (a town's season). That is the currency table of `deck-design.md`. Section 3 has the details.

### What changes from the builds

- The pass of 2026-10-17 had five builds: the faith economy as the core, two inward builds (the liturgical year, the holy places) and two outward builds (the missions, the holy war). Each was one loop on one quantity, and most cards paid science, culture or faith.
- The themes keep the materials and sort them by what the player does:
  - **the faith economy becomes the engine.** Purchases serve every theme, so their cards are engine glue;
  - **the liturgical year joins the devout towns** as one theme, the devout realm. Rites are the acts of that theme; devout towns are its quantity from Tier II;
  - **the holy places** stay a theme, with an early phase on sacred land (springs, herds, groves) before any prophet;
  - **the missions widen into the spreading faith:** the gods, then the founded religion and its beliefs, then the clergy and the followers abroad;
  - **the holy war** stays a theme, mostly shared with Dominion;
  - **the new cards pay authority, happiness, sight, units and food**, not only science and culture.
- **The religion's cards start at Tier II** (the Commerce lesson). A card that pays nothing until the seat knows The High Temple, or has founded a religion, is dealt from Tier II. Tiers 0 and I read what age 1 has: Shrines, rites, the gods, the land, and faith purchases.

### Materials

"Self-producing" means a Devotion game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Faith a turn | Yes: Shrines, Temples, herds, holy sites, beliefs | the faith yield; rates `faithPerTurn`, `followingFaithPerTurn`, `capitalFaithPerTurn` | engine |
| Faith banked and spent | Yes, between purchases | `Player.faithPool`, count `bankedFaith`. No record of faith spent (section 7) | engine |
| Purchases made with faith | Clergy, faith houses and the gods always; units in a Cathedral town; the rest only with cards | `faithBankOpen` (`purchase.ts`); rules `faithBuysUnits`, `faithBuysBuildings`, `faithBuysScienceBuildings`, `faithBuysWonders`; the `purchase` moment (its price is filled for either bank); count `purchasedBuildings` with `bank` | engine |
| Rites (a town's season) | Yes, if the seat spends faith: Divination teaches the first two in age 1, and no religion is needed | `performRiteAt`, `cityRite`; count `citiesKeepingRite`; scopes `keepingRite`, `notKeepingRite`; tally `riteStarted`; the `rite` moment, which no card reads yet and which carries no town | devout realm |
| Rites opened by cards | Only with cards | `RiteDef.byCard`: the Rite of Fasting (a charter), the Votive Offering and the Restoring of the Host (while a card is seated) | devout realm, engine, holy war |
| Shrines, Temples, Cathedrals and the faith houses | Yes: a Shrine and a Temple in every town | building category `faith`; counts `buildingsOfCategory`, `buildingsOfKind`; the Cathedral sells units for faith and takes contributions | devout realm, holy places |
| Devout towns | Yes, once founded: the tide turns your towns by itself | scope `ownersFaith`; count `citiesAdmitted` with that scope; `explainPressure` | devout realm |
| The gods and the beliefs | Yes: the faith ladder buys the gods, prophets buy the rest | `PlayerPantheon.beliefs`; count `beliefsHeld` (a held religion's beliefs only); follower beliefs pay in every town that follows | spreading faith, devout realm |
| The religion founded | Once, in a race (⌈2/3 × players⌉ religions) | `plantHolySite`; condition `noReligionFounded`; count `turnsSinceFounded`; scope `holyCity` | spreading faith |
| Clergy | Bought with faith | prophets (two charges), apostles (two), inquisitors; `chargeCostOf`, `spendCharge`; proclamations through `pressLump` | spreading faith, holy places |
| Followers abroad | Yes, once founded, by the tide and the clergy | counts `followingCities`, `followingForeign`, `followingPop`, `followingForeignPop`, `followingEmpires`, `firstConversions`; tally `foreignCityConverted`; the founder's share | spreading faith |
| Holy sites | Only by prophets, one to three a game | the holy-site improvement; `tilesInBorders`; tile test `standingSince`; scopes `hasImprovement`, `workingImprovement` | holy places |
| Sacred land: springs, groves, herds, camps, plantations | From the map | scope `terrainBeside`; pastures, camps and plantations | holy places |
| The faith's ground | Only where the religion has spread | combat conditions `followingTerritory`, `notFollowingTerritory`, `vsOpusBuilder`; kill and capture riders with `pressure` (where combat hands in a presser) | holy war |
| Units gained, kills and losses | Yes, for a seat at war | moments `unitCompletion`, `kill`, `capture`, `declareWar`; tally `unitLost` | holy war |
| The Magnum Opus | In age 4 | faith contributions; rule `faithContribution`; rule `opusSiege` (a rival's Opus halted, read in the rival's town) | engine, spreading faith |

**Moments.** A card can pay on a purchase, a rite (a moment no card reads yet), a building finished, a unit gained, a kill, a capture, a war declared and a calendar. No moment fires when a town turns to a religion: the game counts it (`foreignCityConverted`) and records the first time (`conversion`), and pays nothing. Feature F proposes that moment (section 6).

### What a Devotion player wants in each age

- **Age 1 (Tier 0): raise Shrines, say the first rites, find the first gods.** Every town raises a Shrine, built (First Rites) or bought with faith (The Gifts of the Faithful), and grows on it (The Wayside Shrines). The land pays faith (Lay Offerings, the shared Sacred Groves and The Ambarvalia), and towns are founded beside lakes and mountains (the shared The Holy Spring). The first 96 faith buys two gods by itself. The capital says the Rite of the Harvest (The Rogations, The Founding Vows). A Shrine town buys a Spearman with faith when the barbarians come (the shared The Shrine Guards).
- **Late age 1 and age 2 (Tier I): rites in every town, and the race to found.** Towns keep rites (The Rites Commonwealth, The Octave, the shared The Priest-Astronomers), buy workers and Libraries with faith (Consecrated Labor, The Monastic Builders), and wall their sacred precincts (The Sacred Precincts). The Creed pays for every god. The High Temple comes during the tier, and the first prophet founds the religion. The cards that pay on it wait for Tier II.
- **Late age 2 and age 3 (Tier II): the realm turns devout.** The religion spreads through the realm, and devout towns are content (The Deaconries), cheap to rule (Commission: The State Church), founded devout (The Parishes) and learned (The Settled Faith). Temple towns buy every building with faith (The Lay Brothers). Prophets raise more holy sites (The Anchorites), and the land around them is blessed (Temple Estates). Clergy carry the faith abroad (The Second Prophet, Mission Houses, The Mission). The scalers start counting: faith spent (The Book of Life), towns turned (The Lives of the Saints), martyrs (The Martyrology).
- **Age 4 (Tiers III and IV): the investment pays back.** The capstones bend the rules: devout towns cost no authority (The Caliphate), apostles raise holy sites (The Abbeys), a conversion presses the towns around it (Pentecost), an enemy killed on the faith's ground changes sides (The Turning of Swords), faith buys a half-built wonder (The Pious Masons). Then the Opus: faith poured into it (The Last Offering), followers abroad who push it (The Great Consecration), rite towns that push it (The Work of God), or a rival's Opus halted in a town that follows you (The Interdict).

### The areas it reaches

All five:
- **the army:** soldiers bought with faith (The Shrine Guards, the shared The Sacred Host, The Offering Chests), strength on the faith's ground (The Spiritual Host, The Last Crusade), soldiers raised by devout towns (The Holy Summons), an enemy who changes sides (The Turning of Swords), an army healed by a rite (The Host Restored);
- **the land:** sacred land (The Holy Spring, Lay Offerings), holy sites and the hexes around them (The Anchorites, Temple Estates, The Saints' Fields, The Abbeys);
- **the economy:** faith in production's place (the engine), Shrine towns that grow (The Wayside Shrines), new towns founded devout (The Parishes);
- **civic life:** happiness (The Rites Commonwealth, The Deaconries), authority (The State Church, The Caliphate), the religion's beliefs (The Creed, The Doctors of the Church);
- **great people and wonders:** holy sites, the prophet's work (the holy places), a wonder bought with faith (The Pious Masons), wonders raised in holy-site towns (the shared Sacred Commissions), great-person drafts bought with faith (the shared Sacred Patronage, reworked).

### Its cost

Devotion gives up early tempo, because it pays up front. The cards show it:
- **The first faith is not free.** The faith ladder spends the first 96 faith on two gods by itself, so a seat's first faith purchase comes at about turn 30. Its early chairs pay faith, food and happiness, where other decks' early chairs pay science, culture and production.
- **The scalers pay little at first:** The Rogations, The Book of Life, The Lives of the Saints, The Martyrology, The Old Holy Places and The Apostolic Succession grow with what the seat has already done.
- **Rites cost something:** The Rites Commonwealth takes happiness from towns without a rite, the Rite of Fasting stops growth (The Fast), the Rite of the Sabbath stops production (The Sabbath Laws), and every rite costs a turn's worth of faith or more.
- **The religion's cards wait** for Tier II, and the capstones for Tier III.
- **Production stays the gap.** No card pays flat production in a town. Production comes as faith spent at 2 a hammer, or toward the Opus.

**If the race is lost.** A Devotion seat that founds no religion keeps the engine, the rites, the holy war's faith-bought army and The Doctors of the Church (a rival's follower beliefs in your towns pay you). It can still take a religion by force: the religions you are paid by are the ones whose holy city you hold, so a captured holy city makes its religion yours, with all its devout towns. The Calling (Tier 0) is the card that wins the race.

### Pairs

Every Devotion seat draws all the shared cards that name Devotion, whatever its partner. Section 8 lists them.
- **Dominion, the holy war** (Joan of Arc, Modu Chanyu). Devotion gives faith that buys soldiers (The Shrine Guards, The Sacred Host), strength on the faith's ground, and holy sites beside citadels (The Holy Army). Dominion gives kills and captures that press the faith (The Crusader Orders), captured towns to convert or tax (Convert It or Tax It), and its war cards. Shared: Rites of Passage, The Shrine Guards (proposed), The Sacred Host, The Oriflamme, The Crusader Orders, Convert It or Tax It, The Holy Army. Best with the holy war and the spreading faith.
- **Expansionist, sacred land** (no leader). Expansionist founds the towns that Devotion holds; The Parishes founds them devout, and The Caliphate rules them for no authority. Expansionist's land pays faith (Sacred Groves, The Flood Festival, The Ambarvalia). The split on the meters holds: Devotion raises happiness and authority in devout towns, Expansionist through public works. Shared: Sacred Groves, The Flood Festival, The Ambarvalia (proposed), The Holy Spring (proposed). Best with the devout realm and the holy places.
- **Commerce, pilgrims and markets** (Mansa Musa). Neither deck makes production, so the pair buys everything twice over, with gold and with faith. Routes to holy sites pay faith (Pilgrim Markets, Mansa Musa's The Hajj), routes carry the religion (The Silk Road Monks), and gold given to the faith pays faith (The Waqf). Shared: The Merchant Shrines, Pilgrim Markets, The Tithe, The Waqf, The Silk Road Monks. Best with the holy places and the spreading faith.
- **Scientific, scholars of the faith** (Al-Ma'mun). Temples that teach (Cloister Schools, The Cloister, The Monastery Libraries), holy sites beside Academies (The Monastic University), rites that pay science (The Priest-Astronomers), and Scientific's The Schoolmen's Charter brings Cathedrals and apostles early. Shared: those five, The Blessed Forges and The Schoolmen's Charter. Best with the devout realm and the holy places.
- **Magisterial, the cathedral** (Akhenaten, Hildegard of Bingen). Holy sites and wonders (Sacred Commissions, The Rising Nave), faith that buys great people (Sacred Patronage) and rerolls (The Penitents' Roll), and the culture of faith buildings and festivals (The Painted Chapels, The Festival Calendar). Best with the devout realm and the holy places. The Magisterial pass runs at the same time, so every change to these five is "to confirm" there.

### Leaders

Devotion has six leaders, more than any other deck.
- **Joan of Arc** (Dominion, Devotion) leads the holy war: kills pay faith and press the faith, and her units gain +4 on the faith's ground. Her cards: The Spiritual Host, The Martyrology, The Holy Summons, The Turning of Swords, The Last Crusade.
- **Modu Chanyu** (Dominion, Devotion) leads the holy war's horsemen and the sacred herds: pastures pay production and faith. His cards: Lay Offerings, The Shrine Guards, The Sacred Host, The Spiritual Host.
- **Akhenaten** (Devotion, Magisterial) leads the holy places: holy-site towns make wonders 20% faster, and watered farms pay faith. His cards: The Anchorites, The Abbeys, Sacred Commissions, The Pious Masons.
- **Hildegard of Bingen** (Devotion, Magisterial) leads the devout realm's rites: rite towns pay +20% culture, and faith buildings pay culture and production. Her cards: The Rogations, The Rites Commonwealth, The Psalter, The Double Feast, The Gifts of the Faithful, The Sacred Precincts.
- **Al-Ma'mun** (Devotion, Scientific) leads the engine: science from the faith the realm makes, and food from faith and science buildings. His cards: The Learned Clergy, The Monastic Builders, The Gifts of the Faithful, The Book of Life.
- **Mansa Musa** (Commerce, Devotion) leads the pilgrims: routes to or from a holy-site town pay gold and faith. His cards: Pilgrim Markets, The Saints' Fields, Temple Estates, The Anchorites.
- **The gap:** no leader points at the spreading faith. Joan's kills press the faith, and Mansa Musa's routes reach holy sites, but nobody's ability reads followers abroad. Leaders are tuned later.

## 3. The engine: faith, and what it buys

### How the engine works

- **Every theme makes faith.** Shrines and Temples, the sacred land, holy sites, beliefs, the founder's share from followers abroad, and rites such as Fasting.
- **Faith buys.** With no card, faith buys clergy, faith houses and the gods, and in a Cathedral town it buys units. With cards it buys Shrines and Temples (The Gifts of the Faithful), workers (Consecrated Labor), Libraries (The Monastic Builders), every building in a Temple town (The Lay Brothers) or anywhere (The Offered Stones), melee units and soldiers (the shared The Shrine Guards and The Sacred Host), a half-built wonder (The Pious Masons), and great-person drafts (the shared Sacred Patronage). Faith poured into the Opus goes half again as far in the holy city (The Last Offering).
- **Faith says rites.** A rite is a town's season, bought with faith. The devout realm (section 4.1) is where the rites live.
- **Every faith spent is one record** (new shape, section 7). The Book of Life reads the whole engine, whichever theme the seat leans on.
- **Keep or spend.** The Treasury of Merit pays for faith kept, and The Book of Life for faith spent. A seat saving for a wonder or the Opus is paid while it waits, and paid again when it spends.
- **Faith buys the gap.** A hammer costs 2 faith. That is the cost and the strength: the engine trades early tempo for choice.

### Engine glue

| Card | Tier | Rarity | Job | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Gifts of the Faithful | 0 | common | faith buys the faith's buildings | Religious buildings may be bought with faith. | Shrines, Temples, Cathedrals | Economic | new (10-17); new shape (`faithBuysBuildings` narrowed to a building category) |
| Consecrated Labor | I | common | faith buys workers | Cities with a Shrine may buy workers with faith. | workers | Economic | kept; existing |
| The Monastic Builders | I | uncommon | faith buys schools | Science buildings may be bought with faith. | Libraries, Universities | Economic | kept; existing |
| The Lay Brothers | II | rare | faith buys what others build | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. | buildings | Economic | kept; existing |
| The Votive Gifts | II | common | faith hurries a build | While this is seated, your cities know the Votive Offering: a city spends the rite's faith to add that much production, at the faith rate, to whatever it is building. Not toward wonders. Once per city per turn. | production | Economic | kept; existing |
| The Book of Life | II | uncommon | "this game" count (scaler) | +1% science and culture for every 150 faith you have spent this game, at most +30%. | science, culture | Civic | new (the 10-17 name, new text); new shape (a record of faith spent) |
| The Pious Masons | III | rare | capstone: rule-breaker | In cities with a Cathedral, a world wonder that is at least half built may be bought with faith. Not the Magnum Opus. | a wonder | Economic | kept (as built); moved from Tier IV |
| The Offered Stones | III | uncommon | bought buildings pay | Buildings you bought with faith give +2 culture each, at most +6 per town. You can purchase buildings with faith. | culture, purchases | Economic | kept; existing |
| The Learned Clergy | III | uncommon | the faith rate pays | +2 science and +2 culture for every 10 faith your empire makes each turn. | science, culture | Civic | kept; existing |
| The Last Offering | IV | rare | finisher: the Opus | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | production toward the Opus | Economic | kept; existing |
| The Treasury of Merit | IV | rare | the bank pays | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. | science, culture | Civic | kept; existing |

- **Glue is 11 of 64 seatable cards (17%).**
- **The Gifts of the Faithful** is the Tier 0 card that develops towns through faith. A Shrine costs 39 hammers, so 78 faith; a Temple 234; a Cathedral 794. The first Shrine bought comes at about turn 30, after the ladder's two gods, and the card is still buying Temples in Tier II. Hildegard's and Al-Ma'mun's abilities both pay on faith buildings, so it is their opener.
- **The Book of Life** is the engine's scaler, and the up-front investment made visible. Abbeys kept a *liber vitae*, a book of the benefactors who gave to the house, read aloud at the altar. Every faith spent counts: a purchase, a rite, a reroll, a contribution and the ladder's gods (a reading, section 7). A Devotion seat has spent about 700 faith when Tier II opens (+4%), about 1,700 by turn 100 (+11%) and reaches the cap at about 4,500, near turn 135. It is Commerce's Names in Stone on the other bank.
- **The Pious Masons** is the engine's capstone, moved to Tier III so the engine has its rule-breaker without Tier IV. The race for a wonder becomes a race to its halfway mark. It touches the wonder split (section 9).
- **The Lay Brothers and The Votive Gifts** both turn faith into production, but not with the same job: one buys a whole building in a Temple town, the other adds faith to any build, a unit included, in any town, once a turn.
- **Cut from the engine:** Consecrated Ground (faith buys a hex at half its gold price). It waits on a second price and a second button on the city screen, which is a new input, and buying land is Commerce's verb (Land Speculation). Its row retires.

## 4. The themes

### 4.1 The devout realm

**The fantasy:** Constantinople and the Umayyad caliphate. Every town keeps its feasts and fasts; the faith that fills its churches keeps a great city content and a wide realm loyal. First the Shrines and the rites, then a realm in which every town follows the religion. **The quantity:** in Tiers 0 and I, your towns' Shrines and the rites they keep. From Tier II, devout towns (your towns that follow your religion), their citizens, and the beliefs that pay in them. **Areas:** civic life (happiness, authority, the religion's beliefs), the economy (growth, founding).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| First Rites | 0 | common | supply (Shrines) | +25% production toward Shrines. Shrines give +2 faith. | faith | Civic | kept; existing |
| The Wayside Shrines | 0 | common | widen (Shrine towns grow) | Cities with a Shrine gain +2 food and +1 happiness. | food, happiness | Economic | kept; existing |
| The Rogations | 0 | uncommon | act; scaler (grower) | While seated, this card gains +1 faith and +1 culture each time one of your towns starts a rite. It starts at +2 of each. | faith, culture | Civic | new (10-17); existing (`pays` on the `riteStarted` tally); reading (section 7) |
| The Founding Vows | 0 | uncommon | act (commission, one-time) | Commission. Start two rites in your cities while this is seated. Reward: 100 faith and 40 food in your capital. Then this card leaves its chair. | faith, food | Wildcard | kept; existing; reading (section 7) |
| The Priest-Astronomers | I | common | widen (science) | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. | science, faith | Civic | kept; moved to the shared cards with Scientific (proposed, section 8) |
| The Rites Commonwealth | I | rare | widen (happiness), with a cost | Cities keeping a rite demand 25% less population happiness. Your cities without a rite gain −1 happiness. | happiness | Civic | kept; existing |
| The Octave | I | uncommon | supply (rites last) | Rites you start while this is seated last 50% longer. | rite length | Civic | kept; existing |
| The Fast (charter) | I | uncommon | act (a rite with a cost) | Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains faith equal to its population each turn. No chair required. | faith | Civic | kept; existing |
| The Deaconries | II | uncommon | widen (big devout towns stay content) | Towns that follow your religion gain +1 happiness for every four citizens. | happiness | Civic | new; existing (`pays` by `population` to happiness, as The Public Fountains) |
| The Parishes | II | uncommon | supply (devout towns) | Each town you found starts out following your religion. | devout towns | Civic | new; new shape (a founding presses your religion) |
| Commission: The State Church | II | uncommon | act (commission, institution) | Commission. Hold at least six towns, all following your religion, at the same time. Then, for the rest of the game, your towns that follow your religion cost one less authority, minimum one. The card leaves its chair. | authority | Wildcard | new; new shape (a goal figure); the reward exists (a lasting `meterRule` `cityCost`) |
| The Settled Faith | II | rare | multiply (with a cost); bridge to the spreading faith | Towns that follow your religion gain +15% science and culture. Your proclamations press 25% less. | science, culture | Civic | reworked (was +30% science and +2 happiness in Temple towns keeping a rite); existing |
| The Festival Calendar | II | uncommon | multiply (rites) | Cities keeping a rite gain +30% food and +30% culture. | food, culture | Civic | kept; moved to the shared cards with Magisterial (proposed, section 8) |
| The Sabbath Laws (charter) | II | uncommon | act (a rite with a cost) | Once drafted, unlock the Rite of the Sabbath. A town keeping it builds nothing for ten turns, and gains culture equal to its production each turn. No chair required. | culture | Civic | new (10-17); new shape (a rite that pays production as culture) |
| The Caliphate | III | rare | capstone (rule-breaker) | Towns that follow your religion cost no authority. | authority | Civic | new; existing (`meterRule` `cityCost` `value: 0`, scope `ownersFaith`, as The Proconsuls) |
| The Doctors of the Church | III | rare | multiply (beliefs) | Follower beliefs pay 150% more in your own cities. | what the beliefs pay | Civic | kept (as built); existing |
| The Psalter | III | uncommon | act (a rite in a devout town) | Each rite started in a town that follows your religion grants science and culture equal to five times the town's population. | science, culture | Civic | new (10-17, reworked); near existing (the `rite` moment carries its town) |
| The Holy Inquisition | III | uncommon | supply (keeps towns devout) | Rival religions press your cities 40% less. +38% faith. | faith | Civic | kept; existing |
| The Double Feast | IV | rare | rule-breaker (the long game) | Your towns may keep two rites at once. | every rite card twice | Civic | new (10-17; was Tier III); new shape |
| The Work of God | IV | rare | finisher (the Opus) | The town raising the Magnum Opus gains +4% production toward it for every town of yours keeping a rite, at most +40%. | production toward the Opus | Economic | new (10-17); existing (as The Great Consecration) |

- **Rites before the religion.** In Tiers 0 and I no religion exists yet, so the theme reads the rites, which Divination teaches in age 1. The Rogations grows on every rite started: about three by turn 32 (+5 of each), and eight towns each saying a season every ten turns add about +0.8 a turn through Tier II, so it reaches about +55 of each by turn 130. Hildegard's rite towns pay +20% culture on top. The Founding Vows is the first goal.
- **Rites as decisions.** Two charters open rites that cost the town something. The Fast stops growth for faith. The Sabbath Laws (Constantine's Sunday law of 321) stops production for culture: a town of 18 production gives up 180 hammers over ten turns for 180 culture, plus the rite's price. It suits a town that buys its buildings with faith and has nothing worth building. Devotion's charters open rites, as Scientific's open technologies.
- **"Faith allows greater authority and wider empires."** Three cards carry it:
  - **The Parishes:** a new town follows from its first turn, so the cards on devout towns reach it at once, and it presses its neighbours as a following town. In late antiquity the bishops divided the countryside into parishes as the towns spread.
  - **Commission: The State Church,** the theme's act at Tier II. Theodosius made Nicene Christianity the religion of Rome in 380. A realm of six or more towns, all devout at once, is the goal; the institution saves about 8 authority across eight towns, a town costing about 3.
  - **Capstone: The Caliphate.** Devout towns cost no authority at all. Ten devout towns free about 30 authority, so the seat can found and take towns with no limit but the faith: each new town must turn before it is free. Rival faiths, captured towns and the Holy Inquisition's work decide how far the realm can stretch. With The Caliphate seated, The State Church's institution has nothing left to do; that is the upgrade.
- **"Allows larger population centres to remain happy."** The Deaconries were the church's food centres in Rome and Constantinople from the sixth century. +1 happiness for every four citizens is about a quarter off a devout town's demand, so it is worth most in the great cities: eight devout towns of 10 gain +16 at about turn 100, and a capital of 24 gains +6.
- **"Playing around the bonuses from your religion."** Follower beliefs pay in every town that follows, so they pay in devout towns. The Doctors of the Church multiplies them; The Settled Faith multiplies the town itself, and its cost is the spreading faith's (proclamations press less). The Creed, in the spreading faith, pays for each belief held.
- **The Psalter** is the theme's moment, and the answer to "performing actions in devout cities". A rite started in a devout town of 14 pays 70 science and 70 culture. Ten such towns each saying a season every ten turns pay about 140 a turn at Tier III, at 90 faith a rite. The book of psalms was the core of the monastic hours.
- **The Double Feast** is the long game's rule-breaker: every town keeps two seasons, or a season and an offering, so The Rogations, The Psalter, The Festival Calendar and The Work of God pay twice. It moves to Tier IV so the theme's Tier III capstone is The Caliphate.
- **The Work of God** (Benedict's *opus Dei*, the daily round of prayer) is the theme's road to the Opus: ten rite towns give +40%.
- **What its widen cards pay:** food and happiness (The Wayside Shrines), science (The Priest-Astronomers), happiness (The Rites Commonwealth, The Deaconries), authority (The State Church, The Caliphate), and through rites faith (The Fast) and culture (The Sabbath Laws).
- **Cut:** The Consolation ("Cities keeping a rite gain +3 happiness"). Its job, happiness in rite towns, is The Rites Commonwealth's at the same tier.
- **Bridges:** The Settled Faith and the spreading faith's The Living Hymnal (devout towns and followers abroad), the holy war's The Sacred Precincts and The Holy Summons (devout towns that defend and arm themselves).
- **Shared cards that serve it:** The Priest-Astronomers (Scientific), The Festival Calendar and The Painted Chapels (Magisterial), Cloister Schools and The Cloister (Scientific), The Tithe (Commerce).

### 4.2 The holy places

**The fantasy:** Jerusalem, Mecca, Varanasi, Santiago, Amarna. First the gods live in the land: springs, groves and herds. Then a prophet raises a holy site, the oldest shrines become the holiest, the land around them is blessed, a Cathedral rises over the town, and pilgrims come from far away. **The quantity:** in Tiers 0 and I, sacred land (springs, groves, herds, camps and plantations). From Tier II, holy sites (the prophet's work), their age, and Cathedrals. **Areas:** the land, great people and wonders.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Holy Spring | 0 | common | supply (where to settle) | Cities whose centre stands beside a mountain or a lake gain +2 faith and +1 culture. | faith, culture | Civic | kept; moved to the shared cards with Expansionist (proposed, section 8) |
| Lay Offerings | 0 | common | widen (the sacred herds and crops) | Pastures, camps and plantations gain +1 faith and +1 food. | faith, food | Civic | reworked (takes in Pastoral Shrines; was camps and plantations only); existing |
| The Anchorites | II | uncommon | supply (more holy sites) | Your prophets raise a further holy site for one charge instead of two. | holy sites | Civic | new (10-17); new shape (a card's price on a prophet's act) |
| Temple Estates | II | common | widen (the land around) | Hexes beside a Holy Site gain +2 food and +2 faith. | food, faith | Civic | kept; existing |
| The Saints' Fields | II | common | widen (food and gold) | Worked Holy Sites give +5 food and +8 gold. A city working one gains +2 happiness, once per city. | food, gold, happiness | Economic | kept; existing |
| The Old Holy Places | II | common | scaler (age) | Holy Sites that have stood for 20 turns gain +3 faith. Those that have stood for 40 turns gain +3 faith and +3 culture more. | faith, culture | Civic | kept; existing |
| The Cathedral Works | II | common | supply (Cathedrals); widen (science) | Gain +45% production toward Cathedrals. Cities with one gain +8 science and +2 happiness. | science, happiness | Civic | kept; existing |
| The Abbeys | III | rare | capstone (rule-breaker) | Your apostles may raise holy sites, as prophets do. | holy sites | Civic | new (10-17); new shape |
| The Consecration Feast | III | uncommon | act (a Cathedral finished) | Finishing a Cathedral grants science and culture equal to twenty times the town's population. | science, culture | Civic | new (10-17); existing (a `buildingCompletion` rider, as The Dedications) |
| The Pilgrim Towns | III | uncommon | multiply | Towns working a holy site gain +20% culture. | culture | Civic | new (10-17); existing (`percentYields` with `workingImprovement`) |
| The Chapter Houses | IV | rare | multiply (Cathedrals) | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. | science, culture | Civic | kept; existing |
| The Seven Pilgrimages | IV | uncommon | widen (science) | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. | science, culture | Civic | kept (as built); existing |
| The Apostolic Succession | IV | rare | scaler (the holy city's age) | Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each. | science, culture | Civic | kept; existing |

- **Sacred land before the prophets.** The holy places have no Tier I card: holy sites need a prophet, and prophets come with The High Temple. Their Tier 0 cards, and the shared Sacred Groves and The Ambarvalia, pay from turn 1 and choose where the towns stand.
- **Lay Offerings takes in Pastoral Shrines.** The two did one job on different hexes (faith and food on the deck's own improvements). The merged card is one line: three herds and two plantations pay +5 faith and +5 food at turn 40. Pastoral Shrines' happiness clause goes. Modu Chanyu's pastures and Mansa Musa's camps are both on it.
- **More holy sites.** Today a seat raises one to three, so the cards that pay on each site pay little. The Anchorites (the hermits whose cells made a place holy) halves a prophet's price for a further site: three prophets by turn 120 raise five or six sites instead of three. The Second Prophet, in the spreading faith, adds a charge, so it is a bridge.
- **Capstone: The Abbeys.** Apostles cost 90 faith and then 130, against a prophet's 120 and 180, and they come in age 3. With this card a holy site can stand beside most towns, and every card that pays on a site pays several times over: about eight to ten sites by turn 180, and Temple Estates then pays on about fifty hexes. Cluny and Cîteaux spread their houses across Europe the same way. It gives the apostle the prophet's existing verb, which is a button the apostle did not show before (section 9).
- **The Consecration Feast** is the theme's moment: a Cathedral topped out in a town of 14 pays 280 science and 280 culture. With faith purchases (The Gifts of the Faithful, The Lay Brothers) the seat chooses when it comes.
- **Scaler: The Old Holy Places.** A site raised on turn 75 pays +3 faith from turn 95 and +6 faith and +3 culture from turn 115. The oldest shrines are the holiest. The Apostolic Succession does the same for the holy city at Tier IV.
- **What its widen cards pay:** faith and culture (The Holy Spring), food (Lay Offerings, Temple Estates), food, gold and happiness (The Saints' Fields), science and happiness (The Cathedral Works), science and culture (The Seven Pilgrimages).
- **Cut:** The Alms Roads ("Your trade routes from Temple cities gain +5 faith"). It waits on routes, which Commerce deals from Tier II, and its job, faith on routes, is the shared Pilgrim Markets'.
- **Bridges:** The Second Prophet (from the spreading faith), the shared The Holy Army (holy sites beside citadels, to the holy war) and The Monastic University (holy sites beside Academies, to Scientific).
- **Shared cards that serve it:** Sacred Groves and The Ambarvalia (Expansionist), Pilgrim Markets (Commerce), Sacred Commissions and The Rising Nave (Magisterial), The Monastic University (Scientific), The Holy Army (Dominion).

### 4.3 The spreading faith

**The fantasy:** Paul's journeys, Ashoka's missionaries, the Irish monks, Clovis and Vladimir of Kyiv baptised with their peoples. First the gods, then the religion founded and its beliefs written, then the clergy on the roads and the faith in foreign courts. **The quantity:** in Tiers 0 and I, the gods and the race to found. From Tier II, the religion's beliefs, its clergy, and the towns that follow it, at home and abroad. **Areas:** civic life (science and culture from followers), the world beyond the borders, and through one card the army's sight.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Calling | 0 | common | supply (the race) | +25% faith until you have founded a religion. | faith | Civic | kept; existing |
| The Old Gods Remain | 0 | uncommon | supply (gods) | Gain one more pantheon belief. | a god | Civic | kept; existing |
| The Creed | I | uncommon | widen; scaler (beliefs) | Your capital gains +3 faith and +3 culture for every god and belief you hold. | faith, culture | Civic | reworked (was "every belief your religion holds"); near existing (`beliefsHeld` counts the gods before a religion is held) |
| The Second Prophet | II | uncommon | supply (clergy); bridge to the holy places | Prophets and apostles you buy start with one extra charge. | charges | Civic | kept; moved from Tier I |
| Mission Houses | II | uncommon | supply (proclamations) | Your proclamations apply 30% more pressure. Apostles gain +1 movement. | pressure | Civic | kept (as built); existing |
| The Living Hymnal | II | uncommon | widen; bridge to the devout realm | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | science, culture | Civic | kept; moved from Tier I |
| The Lives of the Saints | II | uncommon | scaler ("this game") | +2% science and culture for every foreign town your religion has turned this game, at most +30%. | science, culture | Civic | new (10-17, was The Golden Legend); existing (`firstConversions`) |
| The Mission | II | uncommon | act (commission, one-time) | Commission. Convert two foreign cities to your religion while this is seated. Reward: a free Apostle in your capital and 300 culture. Then this card leaves its chair. | an apostle, culture | Wildcard | revised (150 culture to 300); moved from Tier I |
| The Confessors | II | uncommon | widen (sight); bridge to the holy war | Towns that follow your religion share their sight with you. | sight | Military | new; new shape |
| Pentecost | III | rare | capstone (a chain) | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | following towns | Civic | new (10-17); feature F and a lump at that moment |
| The Mass Baptisms | III | uncommon | act (a town turns) | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | science, culture | Civic | new (10-17); feature F |
| The Conversion of Kings | III | rare | act (commission, one-time) | Commission. Have a rival's capital follow your religion while this is seated. Reward: a free Prophet in your capital and 500 culture. Then this card leaves its chair. | a prophet, culture | Wildcard | revised (300 culture to 500); moved from Tier IV |
| The Great Consecration | IV | rare | finisher (the Opus) | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. | production toward the Opus | Economic | kept; existing |
| The Tithe of Nations | IV | rare | finisher (faith for the Opus) | While one of your cities is building the Magnum Opus, gain 1 faith each turn for every citizen in the world who follows your religion, at home or abroad. | faith | Civic | kept; existing |
| The Great Commission | IV | rare | act (commission, institution) | Commission. Have more than half of the world's cities follow your religion. Then, for the rest of the game, your towns that follow your religion gain +3 faith and +3 culture. The card leaves its chair. | faith, culture | Wildcard | reworked (was 500 faith and thirty turns of the same pay); existing (a lasting reward) |
| The Interdict | IV | rare | denial (a rival's Opus) | A rival's town that follows your religion adds no production toward a Magnum Opus. | a rival's Opus halted | Civic | reworked (was a faith order said over a foreign town; deferred); near existing (a sibling of `opusSiege`) |

- **The race, and the religion's cards at Tier II.** The Calling is the race card and pays from turn 1. The Living Hymnal, The Mission and The Second Prophet move to Tier II, because each pays nothing until The High Temple or a founded religion. The Creed stays at Tier I by counting the gods a seat holds before it founds a religion: two gods at turn 32 pay +6 faith and +6 culture, the founded religion's five beliefs +15 of each, and eight beliefs late +24. Culture is scarce at Tier I, so it is a strong card there, and it grows into a scaler.
- **Followers pay.** The Living Hymnal pays for every following town, yours and foreign: 12 at turn 120 pay +36 science and +36 culture. You revised it on 2026-10-12 to count every town with no cap; it moves to Tier II, where it can pay at once. It is the likeliest automatic pick in the deck, and the reading of 2026-10-06 (foreign towns only) is the fallback.
- **Scaler: The Lives of the Saints.** Ten foreign towns turned by turn 150 give +20%. A town that later turns away still counts, so the count never falls. The lives of the saints were written from the fourth century to carry the faith's stories to new peoples. The 10-17 name, The Golden Legend, is a book of 1260, too late for Tier II.
- **The Confessors** (the confessors of kings, who heard what courts kept secret) let the seat see through every town that follows it, at home and abroad. It is intelligence, not yield: where a rival's army gathers, and which town raises its Opus. It bridges to the holy war, whose cards fight on the same ground.
- **Capstone: Pentecost.** A conversion presses every town within four hexes, so one proclamation that turns a town can turn two or three more on the same turn. A chain ends, because a town that already follows cannot turn again, and the chain resolves in a fixed order (section 7). The Mass Baptisms pays each foreign town the first time it turns: a town of 10 pays 200 science and 200 culture. Asked as a first, it cannot be farmed by losing a town and winning it back.
- **The Interdict,** reworked. As written it needed a faith order said over a town you do not own, which is a new input, so it stayed deferred. Now it is the spreading faith's answer to a rival's Opus: convert the town that raises it, and the town adds nothing more to it. It is the faith's twin of Dominion's Circumvallation, which halts a besieged town's Opus through the same gate (`explainOpusGate`). The rival answers with Temples, inquisitors, The Holy Inquisition or The Peace of God. A medieval interdict closed a realm's churches until its ruler gave way.
- **What its widen cards pay:** faith and culture (The Creed), science and culture (The Living Hymnal, The Lives of the Saints, The Mass Baptisms), sight (The Confessors), production toward the Opus (The Great Consecration), faith for the Opus (The Tithe of Nations).
- **Not taken:** Peter's Pence (gold for foreign followers) repeats the founder's share and the enhancer Pilgrims' Coin; The Great Councils (a percentage for each empire that follows) repeats the enhancer World Church and The Lives of the Saints; The Mendicant Friars (proclaiming does not end an apostle's turn) adds attention for a small gain; The Mission Schools (cheaper clergy) does The Second Prophet's job.
- **Bridges:** The Living Hymnal and The Settled Faith (to the devout realm), The Second Prophet (to the holy places), The Confessors and The Peace of God (to the holy war).
- **Shared cards that serve it:** The Silk Road Monks (Commerce), The Crusader Orders (Dominion).

### 4.4 The holy war

**The fantasy:** Joan of Arc, the Reconquista, the military orders. Faith buys the soldiers, the faithful take up arms when war is declared, the army fights best on ground that keeps the faith, and its dead are remembered as martyrs. **The quantity:** soldiers bought with faith, the ground that follows your religion, and the war itself: kills, losses, captures and declarations. Most of the theme is shared with Dominion. **Area:** the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Shrine Guards | 0 | common | supply (soldiers bought with faith) | Towns with a Shrine may buy melee units with faith. | units | Military | new (10-17); existing (`faithBuysUnits`, as Consecrated Labor); shared with Dominion (proposed, section 8) |
| The Sacred Precincts | I | common | widen (defence); bridge to the devout realm | Towns gain +3 defence for every religious building in them. | defence | Military | new (10-17, was The Fortified Churches); near existing (`cityStat` counted by faith buildings in the town) |
| The Spiritual Host | II | uncommon | multiply (the faith's ground) | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. | strength | Military | kept; existing |
| The Martyrology | II | uncommon | scaler (grower) | While seated, this card gains +2 faith and +2 culture each time one of your units dies in battle. | faith, culture | Civic | new; existing (`pays` on the `unitLost` tally) |
| The Turning of Swords | III | rare | capstone (rule-breaker) | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. | units | Military | new (10-17); new shape |
| The Holy Summons | III | uncommon | act (war declared); bridge to the devout realm | Declaring war gives every town of yours that follows your religion the best melee unit you can build, at most once every twenty turns. | units | Military | new (10-17); existing (a `declareWar` rider granting `bestMelee` to every town a scope admits, as The Landsturm) |
| The Offering Chests | III | common | supply (cheaper soldiers) | Military units bought with faith cost 30% less. | units | Military | new (10-17); new shape (a purchase rider narrowed to the faith bank) |
| The Last Crusade | IV | uncommon | finisher (against the Opus) | Your military units gain +8 strength against an empire that is building the Magnum Opus, while fighting in territory that follows your religion. | strength | Military | kept; existing |
| The Host Restored | IV | rare | act (a rite for the army) | While this is seated, your cities know the Restoring of the Host: a city spends the rite's faith to heal every unit of yours standing in territory that follows your religion to full health. A city may say it once every five turns. | healing | Military | kept; existing |
| The Peace of God | IV | uncommon | finisher (the Opus defended); bridge to the spreading faith | The city building your Magnum Opus cannot be pressed by rival religions, and gains +2 strength for each city that follows your religion, at most +30. | defence | Military | kept; existing |

- **Faith buys the army.** The Shrine Guards lets a Shrine town buy a Spearman (54 faith) the turn the barbarians come, which keeps a young town alive in age 1. The shared The Sacred Host opens every military unit in Temple towns from Tier I, and a Cathedral town sells units for faith by itself. The Offering Chests (Innocent III had chests set in every church to fund the crusade) makes a Knight cost 623 faith instead of 890.
- **The Sacred Precincts** is the deck's Tier I Military card: a Shrine gives +3 defence, a Shrine and a Temple +6, and a Cathedral and a faith house take a town to +12. Every temple precinct of the ancient world was a last refuge with a wall. The 10-17 name, The Fortified Churches, is medieval and too late for Tier I.
- **Scaler: The Martyrology.** A war seat that loses fifteen units by turn 130 holds +30 faith and +30 culture. It pays on every death in battle, so it suits your ruling of 2026-10-13 that feeding units to die is a way to play. The church kept lists of its martyrs from the fourth century.
- **The moment: The Holy Summons** (Urban II at Clermont, 1095). Eight devout towns raise eight Pikemen (238 hammers each), about 1,900 hammers of army, on the turn war is declared, once in twenty turns. Beside Dominion's The Arrière-ban it is a whole realm at arms.
- **Capstone: The Turning of Swords.** On the faith's ground the enemy's army changes sides one soldier a turn, at full health. It is Dominion's Blood Brothers rule (`barbarianKillsConvert`) taken from the barbarians to the empires and held to the faith's ground.
- **What its widen cards pay:** defence (The Sacred Precincts), faith and culture (The Martyrology), sight (the spreading faith's The Confessors), and through the shared cards faith on kills and units gained, gold and faith in captured towns (Convert It or Tax It), and faith and culture where a holy site meets a citadel (The Holy Army).
- **Not taken:** The Victory Hymns (a kill presses the faith on the towns around it) is what Joan of Arc's ability and the enhancer The Crusade already do. The Rededication (a captured town turns at once) is The Crusader Orders' job.
- **Shared cards that serve it:** Rites of Passage, The Sacred Host, The Oriflamme, The Crusader Orders, Convert It or Tax It and The Holy Army (Dominion).

## 5. Example councils

A Tier 0 card is marked (0). Charters drafted beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard. A shared card is marked "shared".

### Council 1: the Queen of Cities (the devout realm and the holy places), with Magisterial

Hildegard of Bingen or Akhenaten. The Civic governments.
- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Shrine Guards (shared); The Wayside Shrines; The Rogations.
- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** The Sacred Precincts; The Gifts of the Faithful (0); The Creed, The Rites Commonwealth; The Rogations (0). Charter: The Fast.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** The Sacred Precincts; The Deaconries, The Settled Faith, The Old Holy Places; The Rogations. Earlier in the tier Commission: The State Church held the Wildcard chair until it was met, and its institution stays. Charter: The Sabbath Laws.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** The Sacred Precincts, The Holy Summons; The Pious Masons; The Caliphate, The Psalter, The Abbeys; The Rogations, The Old Holy Places.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** The Sacred Precincts, The Host Restored; The Pious Masons, The Work of God; The Caliphate, The Psalter, The Abbeys, The Chapter Houses; The Rogations, The Old Holy Places, The Double Feast.
- **How it feels:**
  - Turn 18: the second town buys its Shrine with faith the turn the gods are paid for, and The Wayside Shrines feeds it. The capital says the Rite of the Harvest, and The Rogations gains its first point.
  - Turn 40: the Priest-King. Every town keeps a rite, so The Rites Commonwealth eases their happiness. The Creed pays +6 faith and +6 culture for two gods.
  - Turn 65: the prophet founds the religion beside the capital's lake. The Creed counts five beliefs.
  - Turn 95: seven towns, all devout. The State Church is met, and each costs one less authority for good. The Deaconries keep the capital of 16 content.
  - Turn 120: a town with nothing worth building keeps the Sabbath and turns its production into culture, while the Temple towns buy their buildings with faith.
  - Turn 140: The Caliphate. Devout towns cost no authority, so the realm settles its last free land; each new town costs nothing once it turns.
  - Turn 155: apostles raise holy sites beside four towns (The Abbeys). A rite in a devout town of 16 pays 80 science and 80 culture (The Psalter).
  - Turn 170: a wonder half built in a Cathedral town is bought with faith (The Pious Masons).
  - Turn 185: The Double Feast. Each town keeps two rites, The Psalter pays twice as often, and twelve rite towns push the Opus +40% (The Work of God).

### Council 2: the Umayyads (the spreading faith and the devout realm), with Expansionist

A wide realm. The Economic governments.
- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Shrine Guards (shared); The Seed Grain (Expansionist); The Calling.
- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** The Sacred Precincts; Consecrated Labor, The Seed Grain (0); The Creed; The Calling (0).
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** The Lay Brothers, The Staked Claims, The Book of Settlements (both Expansionist); The Living Hymnal; The Parishes. Earlier in the tier The Mission held the Wildcard chair and brought an apostle.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Confessors; The Lay Brothers, The Offered Stones, The Great Colonies (Expansionist); The Caliphate, Pentecost; The Living Hymnal, The Parishes.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** The Confessors, The Peace of God; The Lay Brothers, The Offered Stones, The Great Colonies, The Great Consecration; The Caliphate, Pentecost; The Living Hymnal, The Parishes, The Lives of the Saints.
- **How it feels:**
  - Turn 30: The Calling speeds the faith toward the first prophet. Every new town starts with a citizen (The Seed Grain).
  - Turn 45: Shrine towns buy their workers with faith (Consecrated Labor).
  - Turn 60: The High Temple, and the prophet founds the religion. The Calling has done its job and leaves its chair.
  - Turn 85: The Mission is met: two neighbouring towns have turned, and an apostle walks out of the capital.
  - Turn 100: every town founded since Tier II followed from its first turn (The Parishes) and claimed its hexes (The Staked Claims). The Living Hymnal pays for 14 following towns: +42 science and +42 culture.
  - Turn 140: The Caliphate. Sixteen devout towns cost no authority, and the realm keeps founding (The Great Colonies).
  - Turn 150: an apostle turns a border town abroad. Pentecost presses the towns around it, and two more turn the same turn. The Confessors show where a rival raises its Opus.
  - Turn 185: eight foreign towns follow, and The Great Consecration gives the Opus +40%.

### Council 3: the Maid (the holy war and the spreading faith), with Dominion

Joan of Arc. The Military governments.
- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Shrine Guards (shared); The Wayside Shrines; Rites of Passage (shared).
- **End of Tier I, War Chief (2 / 1 / 1 / 1):** The Sacred Host (shared), The Sacred Precincts; The Wayside Shrines (0); The Creed; Rites of Passage (0).
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** The Sacred Host, The Spiritual Host, The Crusader Orders (shared); Convert It or Tax It (shared); The Martyrology.
- **Tier III, Imperium (3 / 2 / 1 / 2):** The Turning of Swords, The Spiritual Host, The Holy Summons; Convert It or Tax It, The Arrière-ban (Dominion); The Living Hymnal; The Martyrology, The Offering Chests.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** The Turning of Swords, The Spiritual Host, The Holy Summons, The Last Crusade; Convert It or Tax It, The Arrière-ban; The Living Hymnal, The Holy Army (shared); The Martyrology, The Offering Chests, The Host Restored.
- **How it feels:**
  - Turn 25: barbarians come at the third town, which buys a Spearman with faith (The Shrine Guards). Rites of Passage pays 12 faith back.
  - Turn 70: at war, Temple towns buy Swordsmen with faith, and each kill pays faith and presses the faith on the towns around the field (The Sacred Host, Joan's The Voices).
  - Turn 110: the frontier follows the faith, and the army fights there at +8 (The Spiritual Host and Joan's The Maid). A captured town that follows costs one less authority (Convert It or Tax It). The Martyrology has grown to +24 of each.
  - Turn 140: war is declared on the empire raising the Opus. Eight devout towns each raise a Pikeman (The Holy Summons), and every town builds half again as fast for ten turns (The Arrière-ban).
  - Turn 145: an enemy Knight falls on ground that follows you and rides for you next turn (The Turning of Swords).
  - Turn 180: +8 more against the Opus builder on the faith's ground (The Last Crusade), and after a long siege a town says the Restoring of the Host.

## 6. Features that would open cards in several decks

None of these adds a player input.

### Features A to D

- **Feature A, the trades** (accepted 2026-10-20): no Devotion card. The Scientific pass's Devotion idea, "towns that follow your religion fill their guild bar faster", is not taken: a light rider with no theme to serve.
- **Feature B, reading rivals** (accepted 2026-10-20): no Devotion card. The Scientific pass's idea (Temples pay science for the technologies in the gap) is not taken: Scientific's The Translation Movement holds the gap, and "The Scriptoria" is already an enhancer's name.
- **Feature C, commissions as a keyword** (built in Dominion batch D11): no Devotion card. The Dominion pass's idea, "a met commission grants faith equal to ten turns of faith", is not taken: Devotion has five commissions, too few to read.
- **Feature D, deals** (accepted 2026-10-23): no Devotion card. The Commerce pass's idea, "your religion presses 25% harder in the towns of an empire you hold a deal with", is not taken: it needs a pressure rule of its own for one card, and the spreading faith already has Mission Houses and Pentecost.

### Feature E (proposed): "devout towns" as a card word

- **What it is:** a short word for "your towns that follow your religion". The card text says "devout towns", and the Compendium says once what it means. Your own picture uses it: *"performing actions in devout cities"*.
- **What the game already does:** the town scope `ownersFaith` (`keeps: true`) answers it, and the count `citiesAdmitted` counts the towns it admits. Convert It or Tax It uses the scope today.
- **What it costs:** words only: the scope's phrase in the describers and one Compendium line. No engine work.
- **Why it matters:** eight Devotion cards say it, and the other five decks can use it:
  - Devotion: The Deaconries, The Parishes, The State Church, The Settled Faith, The Caliphate, The Psalter, The Holy Summons, The Great Commission;
  - Dominion: "captured devout towns" (Convert It or Tax It's second clause);
  - Expansionist: the split on the meters is written in devout towns;
  - Commerce: The Silk Road Monks' "a city that follows your religion";
  - Magisterial and Scientific: a work or a school in a devout town.
- **Plain English:** "devout" is a common word, and it saves four words a line. The texts in this pass are written out in full until you rule.

### Feature F (proposed): a conversion as a moment

- **What it is:** a moment when a town turns to a religion the seat is paid by, carrying the town and its citizens.
- **What the game already does:** `noteFirstConversion` (`religion.ts`) already writes the `foreignCityConverted` tally and the `conversion` first-record at that instant. Nothing pays there.
- **What it costs:** one `WindfallOccasion` member, fired at that seam, with the town and its population as facts, and its words. The `first: 'conversion'` narrowing exists.
- **Cards it opens:**
  - Devotion: Pentecost (a lump pressed at the town that turned) and The Mass Baptisms (science and culture by its citizens);
  - Scientific: a town that turns teaches you one technology its owner knows (the Nestorian monks at the Tang court);
  - Magisterial: renown when a town turns (the saints' lives that followed the conversions);
  - Commerce: a town your caravans turn gives your trading post there a head start;
  - Dominion: Joan of Arc's kills press the faith, so a kill that turns a town could pay as a capture does.
- **Fallback:** Pentecost and The Mass Baptisms are cut. The Lives of the Saints still reads the same towns as a count.

### A town's age (the Expansionist pass's candidate)

Its Devotion idea, "the old holy city gains faith for every twenty turns it has stood", is not needed: The Apostolic Succession already reads the religion's age (`turnsSinceFounded`).

## 7. New shapes

Sixteen new shapes in five groups, four of them near existing. All read what the game tracks. None adds a player input, except that The Abbeys gives the apostle a verb the prophet has (section 9).

1. **The engine:**
   - a record of faith spent (`Player.faithSpent`, the twin of `goldSpent`), raised wherever faith leaves the bank, and a count over it (The Book of Life). **Reading, to confirm:** every faith that leaves the bank counts: a purchase, a rite, a reroll, a contribution and the gods the ladder buys;
   - `faithBuysBuildings` narrowed to one building category (The Gifts of the Faithful);
   - a purchase rider narrowed to the faith bank: `purchaseRider` gains a `currency` field (The Offering Chests).
2. **Rites:**
   - the `rite` moment carries its town and the town's citizens, so a rider's `inTown` scope and `fromOccasion: 'population'` can read it (The Psalter; near existing: `payRiteRiders` already has the town in hand);
   - two rites in one town: `cityRite` and `riteError` read one running rite today, and the town's rite panel must show two (The Double Feast);
   - a rite that pays the town's production as culture, and puts nothing into its queue (the Rite of the Sabbath, The Sabbath Laws). The rite row and its charter are data, as the Rite of Fasting is.
   - **Reading, to confirm (question 10):** a rite started is a season. The Votive Offering and the Restoring of the Host act at once and do not count toward The Rogations, The Psalter or The Founding Vows. A prophet's empire rite counts once in each town it reaches.
3. **The religion:**
   - `beliefsHeld` counts the gods a seat holds before it holds a religion (The Creed; near existing);
   - a founding presses the founder's religion on the new town: the founding seam hands `payWindfallGrants` a presser, as `combat.ts` does, so `pressLump` gains a third caller and the pinned count of its callers must allow it (The Parishes);
   - feature F's moment, and a lump pressed at it. A chain resolves in a fixed order: the towns that turned are queued in sweep order and pressed after the tide has moved, and a town that already follows cannot turn again (Pentecost, The Mass Baptisms);
   - sight from towns, yours or foreign, that follow your religion (The Confessors);
   - a commission goal figure: every town of yours follows your religion, and you hold at least the goal's number of towns (Commission: The State Church). The lasting reward exists.
4. **Holy sites and clergy:**
   - a card's price on a prophet's further holy site, read in `chargeCostOf` (The Anchorites);
   - apostles may plant holy sites, read in `plantingHandOf` (The Abbeys).
5. **War and the Opus:**
   - an enemy unit killed on land that follows your religion joins your side, once a turn: Blood Brothers' `barbarianKillsConvert` widened to empires' units (The Turning of Swords);
   - a rival's town that follows your religion adds no production toward the Opus: a sibling of `opusSiege`, read in the rival's town by `explainOpusGate` (The Interdict; near existing);
   - `cityStat` counted by the faith buildings in the town: its `count` gains `category` and `within` (The Sacred Precincts; near existing).

**The other changed and new cards use shapes that exist:** The Caliphate (`meterRule` `cityCost` `value: 0` with the `ownersFaith` scope), The Deaconries (`pays` by `population` to happiness), The Settled Faith (`percentYields` with `ownersFaith`, and the flat proclamation line it has), The Holy Summons (as The Landsturm), The Martyrology (the `unitLost` tally), The Lives of the Saints (`firstConversions` as a percentage), The Consecration Feast (as The Dedications, with `building: 'cathedral'`), The Pilgrim Towns, The Work of God, The Shrine Guards, The Rogations (the `riteStarted` tally), Lay Offerings (one hex line on three improvements), The Great Commission (a lasting reward), and the new figures on The Mission and The Conversion of Kings (data).

**For less engine work, cut** The Confessors, The Sabbath Laws, The Offering Chests and The Parishes first, then The Double Feast. Pentecost, The Abbeys and The Turning of Swords are capstones.

## 8. The sheet's cards

### The Devotion cards (52)

| Card | Tier | Fate | Why |
|---|---|---|---|
| First Rites | 0 | kept | devout realm: supply (Shrines) |
| Pastoral Shrines | 0 | merged | into Lay Offerings: faith and food on the deck's own improvements was one job on two cards |
| Lay Offerings | 0 | reworked | holy places: widen; takes in pastures |
| The Old Gods Remain | 0 | kept | spreading faith: supply (gods) |
| The Founding Vows | 0 | kept | devout realm: act (commission, one-time); counts seasons only (question 10) |
| The Calling | 0 | kept | spreading faith: supply (the race) |
| The Holy Spring | 0 | moved | to the shared cards with Expansionist; holy places: supply |
| The Wayside Shrines | 0 | kept | devout realm: widen |
| The Consolation | I | cut | happiness in rite towns is The Rites Commonwealth's job at the same tier |
| The Priest-Astronomers | I | moved | to the shared cards with Scientific; devout realm: widen (science) |
| Consecrated Labor | I | kept | engine glue |
| The Octave | I | kept | devout realm: supply (rites last) |
| The Fast | I | kept | devout realm: act (charter) |
| The Living Hymnal | I | moved to II | spreading faith: widen; it pays nothing before a religion |
| The Alms Roads | I | cut | it waits on routes, and faith on routes is Pilgrim Markets' job |
| The Mission | I | moved to II, revised | spreading faith: act; it waits on a religion; 300 culture, not 150 |
| Consecrated Ground | I | cut | deferred for a new price and button on the city screen; buying land is Commerce's verb |
| The Second Prophet | I | moved to II | spreading faith: supply; prophets come with The High Temple |
| The Monastic Builders | I | kept | engine glue |
| The Creed | I | reworked | spreading faith: widen; counts the gods before founding, so it stays at Tier I |
| The Painted Chapels | I | moved | to the shared cards with Magisterial; the pair's early card |
| The Rites Commonwealth | I | kept | devout realm: widen, with a cost |
| The Saints' Fields | II | kept | holy places: widen |
| The Cathedral Works | II | kept | holy places: supply and widen |
| The Old Holy Places | II | kept | holy places: scaler |
| Temple Estates | II | kept | holy places: widen |
| The Votive Gifts | II | kept | engine glue |
| The Spiritual Host | II | kept | holy war: multiply |
| Mission Houses | II | kept | spreading faith: supply |
| The Festival Calendar | II | moved | to the shared cards with Magisterial; devout realm: multiply |
| The Penitents' Roll | II | moved | to the shared cards with Magisterial: it acts on the draft, which is Magisterial's way to play |
| The Lay Brothers | II | kept | engine glue |
| The Settled Faith | II | reworked | devout realm: multiply; reads devout towns, pays science and culture |
| The Holy Inquisition | III | kept | devout realm: supply (keeps towns devout) |
| The Learned Clergy | III | kept | engine glue |
| The Offered Stones | III | kept | engine glue |
| The Doctors of the Church | III | kept | devout realm: multiply (beliefs) |
| The Monastic University | III | moved | to the shared cards with Scientific: a holy site beside an Academy is both decks' great-person split |
| The Great Consecration | IV | kept | spreading faith: finisher |
| The Last Offering | IV | kept | engine glue: finisher |
| The Great Commission | IV | reworked | spreading faith: act (commission, institution) |
| The Tithe of Nations | IV | kept | spreading faith: finisher |
| The Treasury of Merit | IV | kept | engine glue |
| The Apostolic Succession | IV | kept | holy places: scaler |
| The Chapter Houses | IV | kept | holy places: multiply |
| The Seven Pilgrimages | IV | kept | holy places: widen |
| The Interdict | IV | reworked | spreading faith: denial; no new input |
| The Peace of God | IV | kept | holy war: finisher |
| The Last Crusade | IV | kept | holy war: finisher |
| The Conversion of Kings | IV | moved to III, revised | spreading faith: act; 500 culture, not 300 |
| The Pious Masons | IV | moved to III | engine glue: capstone |
| The Host Restored | IV | kept | holy war: act |

**Tally:** 32 kept, 5 reworked or revised in their tier, 5 moved within the deck (3 to Tier II, 2 to Tier III), 6 moved to the shared cards, 3 cut and 1 merged. With 24 new cards, the deck holds 64 seatable cards and 2 charters, against 52 before (50 dealt today).

### The shared cards (17 on the sheet, 29 with this pass)

Every Devotion seat draws all of them. A shared card is dealt to a seat holding only the partner deck too, so each one must also pay a seat with no faith engine.
- **Dominion (7):** Rites of Passage (0), The Sacred Host (I), The Oriflamme (I), The Crusader Orders (II), Convert It or Tax It (II), The Holy Army (III): kept. **New: The Shrine Guards (0),** proposed: a Dominion seat makes faith from Rites of Passage and The Camp Chaplains, and buys spears with it.
- **Expansionist (4):** Sacred Groves (0), The Flood Festival (I): kept. **The Ambarvalia (0),** which the Expansionist pass offered (*"The Ambarvalia is the natural card to share with Devotion; that is left for the Devotion pass"*): taken; the Roman rite of the fields is a rite. **The Holy Spring (0),** proposed: an Expansionist town beside a mountain or lake gains faith and the culture that deck lacks.
- **Commerce (5):** The Tithe (II): kept. **Confirmed, as the Commerce pass asked:** The Merchant Shrines (0, the pair's early card), Pilgrim Markets (moved to Tier II), The Waqf (II) and The Silk Road Monks (II), all moved to the shared file in Commerce batch T1.
- **Scientific (7):** Cloister Schools (I), The Monastery Libraries (I), The Cloister (II), The Blessed Forges (II): kept. **Confirmed: The Schoolmen's Charter (I),** as the Scientific pass asked (question 8, ruled yes). **New: The Priest-Astronomers (I) and The Monastic University (III),** proposed: rites are open to every empire, and a Scientific seat saying Omen Reading is paid science in its capital; an Academy beside a holy site is both decks' work.
- **Magisterial (6):** The Rising Nave (III): kept. **Sacred Commissions** moves from Tier I to Tier II, because it pays only in a town with a holy site. **Sacred Patronage (III),** reworked so it can be built: *"Faith may buy great-person drafts at the escalating price."* Its second clause (faith when a great person is spent) needed a moment that pays only some of the ways a person is spent; the rule `buyGreatPersonWithFaith` exists. **New: The Painted Chapels (I, the pair's early card once Sacred Commissions moves), The Festival Calendar (II) and The Penitents' Roll (II),** proposed: faith buildings and festivals that pay culture, and rerolls paid with faith, all serve a Magisterial seat. All six are to confirm in the Magisterial pass, which runs now.
- **Each pair keeps an early shared card** (ruling (qqqqqq) 14): Dominion Rites of Passage and The Shrine Guards; Expansionist Sacred Groves, The Ambarvalia and The Holy Spring; Commerce The Merchant Shrines; Scientific Cloister Schools, The Monastery Libraries, The Schoolmen's Charter and The Priest-Astronomers; Magisterial The Painted Chapels.
- **The most shared cards.** With these, Devotion shares 29 cards, one more than Dominion's 28. You asked for the most (question 9).
- **Four shared Tier I cards wait on The High Temple:** The Sacred Host and Cloister Schools need a Temple, The Oriflamme a prophet beside the army, and half of The Monastery Libraries a Temple. This pass leaves them at Tier I, because the Dominion and Scientific passes kept them there and a Devotion seat has The Shrine Guards and The Sacred Precincts before Temples.

### Not taken from the 2026-10-17 pass

- **The Chantries** (a percentage for buildings bought with faith): The Book of Life reads every faith spent, and The Offered Stones pays the bought buildings.
- **The Votive Tablets** (culture for each purchase with faith): The Offered Stones pays culture on the same purchases.
- **The Fabric Fund** (purchases with faith 30% cheaper in Cathedral towns): The Offering Chests takes the discount for soldiers, and a building discount would cut into the faith rate you set.
- **The Parish Churches** (a percentage for religious buildings held): The Painted Chapels and The Sacred Precincts read the same buildings.
- **The Old Observances** (a percentage for rites this game): The Rogations grows on the same rites.
- **The Holy Year** and **The Unceasing Prayer** (free rites on a calendar, and in Cathedral towns): two new shapes on the rite's price; The Double Feast is the rites' late rule-breaker.
- **The Corpus Christi** (a rite that presses like a holy site): a new shape for one card; Pentecost and The Parishes spread the faith.
- **The Epistles** (a grower on conversions): The Lives of the Saints reads the same conversions for the whole game.
- **Peter's Pence, The Great Councils, The Mendicant Friars, The Mission Schools:** section 4.3.
- **The Victory Hymns, The Rededication:** section 4.4.
- **The Oblates** (a levy that pays faith): the levy is Expansionist's verb, and Devotion spends faith, not citizens.
- **The Offertory** (+1 faith for every three citizens): faith income with no theme; the engine has enough.

### The Doctrines

Devotion has no Doctrines yet, so none falls outside a theme. They come after your cuts: one for each theme at most of Tiers I to IV.

### The type sort

- **Tier 0 (8).** Military (0). Economic (2): The Wayside Shrines, The Gifts of the Faithful. Civic (5): First Rites, The Rogations, Lay Offerings, The Calling, The Old Gods Remain. Wildcard (1): The Founding Vows.
- **Tier I (6, and a charter).** Military (1): The Sacred Precincts. Economic (2): Consecrated Labor, The Monastic Builders. Civic (3): The Rites Commonwealth, The Octave, The Creed. Charter: The Fast (Civic).
- **Tier II (20, and a charter).** Military (2): The Spiritual Host, The Confessors. Economic (3): The Lay Brothers, The Votive Gifts, The Saints' Fields. Civic (13): The Book of Life, The Deaconries, The Parishes, The Settled Faith, The Anchorites, Temple Estates, The Old Holy Places, The Cathedral Works, The Second Prophet, Mission Houses, The Living Hymnal, The Lives of the Saints, The Martyrology. Wildcard (2): Commission: The State Church, The Mission. Charter: The Sabbath Laws (Civic).
- **Tier III (16).** Military (3): The Turning of Swords, The Holy Summons, The Offering Chests. Economic (2): The Pious Masons, The Offered Stones. Civic (10): The Learned Clergy, The Caliphate, The Doctors of the Church, The Psalter, The Holy Inquisition, The Abbeys, The Consecration Feast, The Pilgrim Towns, Pentecost, The Mass Baptisms. Wildcard (1): The Conversion of Kings.
- **Tier IV (14).** Military (3): The Last Crusade, The Host Restored, The Peace of God. Economic (3): The Last Offering, The Work of God, The Great Consecration. Civic (7): The Treasury of Merit, The Double Feast, The Chapter Houses, The Seven Pilgrimages, The Apostolic Succession, The Tithe of Nations, The Interdict. Wildcard (1): The Great Commission.

| Tier | Military | Economic | Civic | Wildcard | Seatable | Charters | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| 0 | 0 | 2 | 5 | 1 | 8 | 0 | 5 / 3 / 0 |
| I | 1 | 2 | 3 | 0 | 6 | 1 | 2 / 3 / 1 |
| II | 2 | 3 | 13 | 2 | 20 | 1 | 5 / 13 / 2 |
| III | 3 | 2 | 10 | 1 | 16 | 0 | 1 / 8 / 7 |
| IV | 3 | 3 | 7 | 1 | 14 | 0 | 0 / 3 / 11 |
| **All** | **9** | **12** | **38** | **5** | **64** | **2** | **13 / 30 / 21** |

The charters are uncommon. The 29 shared cards are 4 Military, 3 Economic and 22 Civic (the review list's shared table).

- **By status:** 32 kept, 16 changed (5 reworked or revised, 5 moved within the deck, 6 moved to the shared cards), 4 cut or merged, 24 new. Before this pass the sheet held 52 cards: 4 Military, 11 Economic, 33 Civic and 4 Wildcard by the builds pass's sort. Now 64 seatable: 9, 12, 38 and 5. Civic falls from 63% to 59%.
- **Every government has something to seat,** with three gaps:
  - Tier 0 has no Military card of its own: the Chiefdom's Military chair takes the shared The Shrine Guards, which every Devotion seat draws.
  - Tier II leans Civic (13 of 20), so the Theocracy suits it, and the Republic's three Economic chairs take The Lay Brothers, The Votive Gifts, The Saints' Fields and the shared The Tithe and Convert It or Tax It. Tyranny's three Military chairs take The Spiritual Host, The Confessors and the shared The Crusader Orders and The Sacred Host.
  - Tier III and IV lean Civic too, but each has three Military and two or three Economic cards, so Imperium, the Merchant League, the Sultanate and the Estates have Devotion cards to seat.
- **Devotion is the Civic deck,** the mirror of Expansionist's Economic lean. The Scientific ruling of 2026-10-20 moved Scientific's Tier 0 away from Civic; Devotion's Tier 0 is 5 Civic of 8, against Scientific's 5 of 9.

## 9. The checks

- **Themes beat a pile.** Each theme has flats, a percentage or a multiplier on them, and a capstone:
  - the devout realm: The Wayside Shrines, The Rogations, The Deaconries; The Settled Faith, The Doctors of the Church; The Caliphate, then The Double Feast;
  - the holy places: Lay Offerings, Temple Estates, The Saints' Fields; The Old Holy Places, The Pilgrim Towns; The Abbeys;
  - the spreading faith: The Creed, The Living Hymnal; The Lives of the Saints; Pentecost;
  - the holy war: The Sacred Precincts, The Martyrology; The Spiritual Host; The Turning of Swords.
  The deck's strongest single cards today (The Living Hymnal, The Learned Clergy, The Treasury of Merit, The Chapter Houses, The Creed) are flats on the faith rate, on buildings and on following towns, and none multiplies another. The capstones and the moments (The Psalter, The Consecration Feast, The Mass Baptisms, The Holy Summons) are what put a theme ahead.
- **Several routes.** Any two cards start a theme: First Rites and The Wayside Shrines, or The Rogations and The Rites Commonwealth, before the religion; The Deaconries and The State Church, or The Parishes and The Settled Faith, after it; Lay Offerings and The Holy Spring, or The Anchorites and Temple Estates; The Calling and The Creed, or The Second Prophet and The Living Hymnal; The Shrine Guards and The Sacred Precincts, or The Spiritual Host and The Martyrology.
- **A scaler carries over** in every theme: The Rogations, The Old Holy Places, The Creed and The Lives of the Saints, The Martyrology, and the engine's The Book of Life.
- **Every card has a home:** four themes and 11 glue cards (17%). By theme: the devout realm 16 and two charters, the holy places 12, the spreading faith 16, the holy war 9, each with shared cards beside it. Bridges: The Settled Faith, The Living Hymnal, The Second Prophet, The Confessors, The Sacred Precincts, The Holy Summons, The Peace of God, and the shared The Holy Army, The Monastic University, The Silk Road Monks and Convert It or Tax It.
- **The essentials along the way** (by Tier II):
  - the devout realm: science (The Priest-Astronomers, The Settled Faith), culture (The Rogations, The Sabbath Laws, The Festival Calendar), production through faith (the engine);
  - the holy places: science (The Cathedral Works), culture (The Holy Spring, The Old Holy Places), production through faith and, with Magisterial, toward wonders (Sacred Commissions);
  - the spreading faith: science and culture (The Creed, The Living Hymnal, The Lives of the Saints), production only through faith;
  - the holy war: culture (The Martyrology), science through The Living Hymnal or the partner, production as soldiers bought with faith.
- **Faith stays a minority:** 12 of 64 seatable cards pay faith (19%). Science: 13 cards. Culture: 21. Production (through faith, or toward the Opus): 10. Happiness or authority: 8. Units, strength, defence or sight: 9.
- **Areas:** five of five (section 2).
- **The cost shows** in the scalers that start small, the rites with a price (The Rites Commonwealth, The Fast, The Sabbath Laws), the religion's cards held to Tier II, and a deck with no flat production.
- **No new input.** Every card is automatic, or uses buying, a rite, a prophet's or apostle's act, a commission, or a declaration of war. Consecrated Ground (a second price and button) is cut, and The Interdict loses its order said over a foreign town. **One edge:** The Abbeys gives the apostle the prophet's verb (raise a holy site), a button the apostle did not show before. The verb, its refusals and its screen exist.
- **The splits are followed:**
  - authority and happiness: Devotion raises them in devout towns (The Deaconries, The State Church, The Caliphate) and in rite towns, which it pays for with faith (The Rites Commonwealth); Expansionist keeps public works and empire buildings;
  - flexibility: Devotion is flexible in how it wins (faith into the Opus, followers abroad, rite towns, a rival's Opus halted, a wonder bought, an army that turns the enemy);
  - great-person works: holy sites only; the shared The Monastic University and The Holy Army pair them with Academies and citadels;
  - population: The Deaconries and The Psalter read citizens as people to keep content and to bless, not as citizens spent (Expansionist) or great cities to school (Scientific);
  - institutions: The State Church and The Great Commission leave lasting effects, as Commerce's commissions now do (your answer of 2026-10-23).
  - **One conflict, named: wonders.** Production toward wonders is Scientific's and Magisterial's. Sacred Commissions (+38% toward wonders in holy-site towns) is shared with Magisterial, so it stays. The Pious Masons buys a half-built wonder with faith, which neither split names, as Commerce's The Gilded Scaffold buys one with gold.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured. The bots say few rites and found religions late, so the devout realm and the spreading faith are hard to measure until they do.
  - A seat that loses the race to found keeps less than half the deck (section 2, "If the race is lost").
  - Tier I holds only six seatable Devotion cards, because the religion's cards wait for Tier II. The eight shared Tier I cards fill it.
  - Sixteen new shapes, and features E and F. Pentecost's chain, The Double Feast and The Turning of Swords are the largest.
  - No leader points at the spreading faith. Doctrines are not in this pass.

## 10. Open questions for the user

1. **The engine and four themes as written:** faith and what it buys as the engine; the devout realm, the holy places, the spreading faith and the holy war as the themes. *Recommended: yes.*
2. **The religion's cards from Tier II.** No card that waits on The High Temple or a founded religion is dealt before Tier II, as you ruled for Commerce's routes. The Living Hymnal, The Mission and The Second Prophet move to Tier II; The Creed stays at Tier I by counting the gods a seat holds before it founds. *Recommended: yes.*
3. **Feature E, "devout towns" as a card word** for "your towns that follow your religion". Words only. *Recommended: yes.*
4. **Feature F, a conversion as a moment,** with Pentecost and The Mass Baptisms on it. *Recommended: yes.*
5. **The rule-breakers:** The Caliphate (devout towns cost no authority), The Abbeys (apostles raise holy sites; the one card that gives a unit a new button), The Turning of Swords (an enemy killed on the faith's ground changes sides), The Double Feast (two rites in a town), The Interdict reworked (a rival's town that follows you adds nothing to its Opus), and The Pious Masons moved to Tier III. *Recommended: yes to all six.* If The Caliphate is too strong, the alternative is "cost half the authority".
6. **Devotion's commissions: two institutions and three one-time rewards.** The State Church (new) and The Great Commission (reworked) leave lasting effects; The Founding Vows, The Mission (300 culture with its move to Tier II) and The Conversion of Kings (500 culture with its move to Tier III) pay once. *Recommended: yes.*
7. **The reworks of live cards:** Lay Offerings takes in Pastoral Shrines' pastures; The Settled Faith reads devout towns and pays +15% science and culture; The Creed counts gods (question 2). *Recommended: yes.*
8. **The cuts:** Pastoral Shrines (merged), The Consolation, The Alms Roads and Consecrated Ground, with their rows retired. *Recommended: yes.*
9. **The shared cards, and "the most shared deck cards".** Confirm Commerce's four (The Merchant Shrines, Pilgrim Markets at Tier II, The Waqf, The Silk Road Monks) and Scientific's The Schoolmen's Charter; take Expansionist's The Ambarvalia; share seven Devotion cards (The Holy Spring with Expansionist, The Shrine Guards with Dominion, The Priest-Astronomers and The Monastic University with Scientific, The Painted Chapels, The Festival Calendar and The Penitents' Roll with Magisterial); move Sacred Commissions to Tier II; drop Sacred Patronage's second clause so it can be built. That makes 29 shared cards, the most of any deck. *Recommended: yes, each to confirm with the partner;* the six Magisterial cards in the Magisterial pass.
10. **What counts as a rite started:** a season. The Votive Offering and the Restoring of the Host act at once and do not count; a prophet's empire rite counts once in each town it reaches. It changes what The Founding Vows counts today. *Recommended: yes.* Without it, a town could say the Votive Offering every turn and grow The Rogations and The Psalter for nothing.
11. **The deck's size:** 64 seatable cards and 2 charters. *Recommended: keep it and cut by hand on the list.* If you want it smaller, these are the next five cuts, weakest first: The Offering Chests, The Confessors, The Octave, The Holy Inquisition, The Sabbath Laws.

After your answers: every card onto the sheet as `add` and `modify` rows, with the Type column, then Devotion's Doctrines, then the triage for the build.

## 11. Where the Devotion and Magisterial passes meet (added 2026-10-23)

The Magisterial pass (`docs/plans/magisterial-themes.md`) ran at the same time as this one. Its section 11 lists where the two touch, with a recommendation for each: the feature names (its adoption moment is renamed feature G, so this pass keeps E and F), rerolls (both passes leave them to the Devotion pair), the three cards this pass shares with Magisterial, Sacred Commissions' tier, and Sacred Patronage's second clause.

## 12. Your comments and answers (2026-10-25)

Your request, 2026-10-25, verbatim:

> *"ok i've commented on both, please fold those in and begin implementing devotion and magisterial. Please do a pass on the doctrines for the remaining decks"*

**Your two comments on the review list.** Both are live cards, so batch R1 changes them (`docs/plans/review-revisions-2026-10-25.md`), and the Devotion build treats them as done:
- **The Fast (charter):** *"gain science and culture instead of faith"*. A town keeping the Rite of Fasting gains science and culture equal to its population each turn, in place of faith.
- **The Rites Commonwealth:** *"remove malice"*. It keeps only "Cities keeping a rite demand 25% less population happiness."

**The questions of section 10.** You asked to begin the build and did not answer them one by one, so the build takes every recommendation, as you did for the Commerce build plan (*"for 1-7, go with the recommendations"*). Each is a reading you can still change:
1. The engine and the four themes: yes.
2. The religion's cards from Tier II: yes.
3. Feature E, "devout towns" as a card word: yes.
4. Feature F, a conversion as a moment, with Pentecost and The Mass Baptisms: yes.
5. The six rule-breakers (The Caliphate, The Abbeys, The Turning of Swords, The Double Feast, The Interdict, The Pious Masons at Tier III): yes.
6. The commissions, two institutions and three one-time rewards: yes.
7. The reworks of live cards: yes.
8. The cuts: yes.
9. The shared cards as listed, 29 in all: yes.
10. A rite started is a season: yes.
11. The deck's size: keep 64 seatable cards and 2 charters.

**Section 11, where the passes meet:** each recommendation is taken. The Painted Chapels, The Festival Calendar and The Penitents' Roll are shared with Magisterial. Sacred Commissions moves to Tier II. Sacred Patronage keeps its second clause, because the Magisterial build keeps The Last Commission and builds the moment for a great person spent.

**Next:** Devotion's Doctrines (`docs/plans/devotion-doctrines.md`) and the build plan (`docs/plans/devotion-themes-triage.md`). The Devotion build makes the cards shared with Magisterial, so the two builds do not make them twice.

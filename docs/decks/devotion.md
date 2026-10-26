# The Devotion deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/devotion.test.ts` checks it against `data/decks/devotion.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/devotion-themes.md`, the themes pass of 2026-10-23. It designs the deck as a way to play: an engine of faith and what faith buys, and four themes (the devout realm, the holy places, the spreading faith and the holy war). Section 12 holds your answers of 2026-10-25, and it outranks the sections before it. `docs/plans/devotion-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/devotion-themes-triage.md` (batches DV1 to DV9). Batch DV1 wrote this sheet, put the types into the data, retired the four cut rows, moved seven rows to the shared file, moved six cards to a new tier, and changed five cards in place: Lay Offerings, The Settled Faith, The Mission, The Conversion of Kings and The Great Commission. The deferred The Interdict took its new text and stays out of every pool. Batch R1 changed The Fast and The Rites Commonwealth before DV1 (`docs/plans/review-revisions-2026-10-25.md`). Batch DV2 built the seven new cards whose shapes already existed (The Deaconries, The Lives of the Saints, The Martyrology, The Consecration Feast, The Pilgrim Towns, The Holy Summons and The Work of God), four shared cards, and the word "devout". Batch DV3 built the engine's shapes: The Gifts of the Faithful, The Sacred Precincts, The Book of Life and The Offering Chests, The Creed's rework, and the shared The Rising Nave. Batch DV4 made a rite started a season (the Votive Offering and the Restoring of the Host do not count, and a prophet's rite over the realm counts once in each town it reaches), and built The Rogations, The Psalter, The Sabbath Laws with its Rite of the Sabbath, and The Founding Vows' narrower count. Batch DV5 built the faith's reach: The Parishes (a town you found is pressed with your religion, enough to turn every citizen), The Confessors (towns that follow your religion are sight sources for you) and Commission: The State Church (a goal that counts only while every town you hold is devout). Batch DV6 made a foreign town turning to your religion a moment that cards can pay on (feature F). The moment comes when the pressing that turned the town is over. It built Pentecost (your religion presses the towns around the town that turned, and a town that turns presses in its turn) and The Mass Baptisms (science and culture the first time a town turns). A town counts at most once a turn for each religion, so a chain always ends.
- **Devout towns:** a devout town is one of your towns that follows a religion you are paid by. The game asks this with the town scope `ownersFaith` (`keeps: true`). A foreign town is never devout. "Devout" is the card word of the triage's feature E (reading 2). Since batch DV2 the describers print the scope as "devout", and the Compendium's faith page says what a devout town is. The cards about every town that follows your religion, foreign towns included, keep the words "follows your religion".
- **Status:**
  - `implemented`: in the data, dealt, and the data's text is this sheet's text.
  - `modify`: in the data, but not as this sheet writes it. The words after the colon say why. A row can have more than one:
    - `deferred`: not dealt yet, because it needs a new shape;
    - `revised`: the text and the effect change;
    - `reworked`: the card keeps its name and does a different job;
    - `moved`: the card moves to another tier;
    - `shared`: the row moves to `data/decks/common.json` and becomes a shared card;
    - `as built`: the data's text is this sheet's text, but the game does something slightly different. The list doc's row says what.
  - `add`: not in the data yet.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch DV1 the types are in the data. A Devotion card fits only a chair of its own type or a Wildcard chair. The sync test checks this column for every row in the data, the shared table's included.
- **Charters:** two, counted in the Charters column below: The Fast (Tier I) and The Sabbath Laws (Tier II). The shared table holds a third, The Schoolmen's Charter (Tier I). A charter never takes a chair. Its type is only for the card's face.
- **Doctrines:** none yet. Each of Tiers I to IV has an empty Doctrine table above its Orders. Sixteen are proposed, four a tier, in `docs/plans/devotion-doctrines.md` (2026-10-25), for your review. A triage of their own builds them. Until then a Devotion seat's Doctrine offer comes only from its partner deck.
- **The sheet of 2026-10-12** (52 cards, in the old format) is in git history: `git show 155106c9:docs/decks/devotion.md`.

| Tier | Implemented | Modify | Add | All | Charters |
|---|---|---|---|---|---|
| Tier 0 | 8 | 0 | 0 | 8 | 0 |
| Tier I | 7 | 0 | 0 | 7 | 1 |
| Tier II | 18 | 2 | 1 | 21 | 1 |
| Tier III | 11 | 2 | 3 | 16 | 0 |
| Tier IV | 12 | 1 | 1 | 14 | 0 |
| **All** | **56** | **5** | **5** | **66** | **2** |
| Shared | 27 | 2 | 0 | 29 | 1 |

**By type** (the chair a card fits; a charter's type is for its face):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 0 | 2 | 5 | 1 |
| Tier I | 1 | 2 | 4 | 0 |
| Tier II | 2 | 3 | 14 | 2 |
| Tier III | 3 | 2 | 10 | 1 |
| Tier IV | 3 | 3 | 7 | 1 |
| **All** | **9** | **12** | **40** | **5** |
| Shared | 4 | 3 | 22 | 0 |

Without the charters, the deck holds 64 cards that take a chair: 8, 6, 20, 16 and 14 across Tiers 0 to IV. By type they are 9 Military, 12 Economic, 38 Civic and 5 Wildcard.

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **First Rites** | common | implemented | +25% production toward Shrines. Shrines give +2 faith. | Civic |
| **The Wayside Shrines** | common | implemented | Cities with a Shrine gain +2 food and +1 happiness. | Economic |
| **The Founding Vows** | uncommon | implemented | Commission. Start two rites in your cities while this is seated. Reward: 100 faith and 40 food in your capital. Then this card leaves its chair. | Wildcard |
| **The Rogations** | uncommon | implemented | While seated, this card gains +1 faith and +1 culture each time one of your towns starts a rite. It starts at +2 of each. | Civic |
| **Lay Offerings** | common | implemented | Pastures, camps and plantations gain +1 faith and +1 food. | Civic |
| **The Calling** | common | implemented | +25% faith until you have founded a religion. | Civic |
| **The Old Gods Remain** | uncommon | implemented | Gain one more pantheon belief. | Civic |
| **The Gifts of the Faithful** | common | implemented | Religious buildings may be bought with faith. | Economic |

## Tier I

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Rites Commonwealth** | rare | implemented | Cities keeping a rite demand 25% less population happiness. | Civic |
| **The Octave** | uncommon | implemented | Rites you start while this is seated last 50% longer. | Civic |
| **The Fast** | uncommon | implemented | Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains science and culture equal to its population each turn. No chair required. | Civic |
| **The Creed** | uncommon | implemented | Your capital gains +3 faith and +3 culture for every god and belief you hold. | Civic |
| **The Sacred Precincts** | common | implemented | Towns gain +3 defence for every religious building in them. | Military |
| **Consecrated Labor** | common | implemented | Cities with a Shrine may buy workers with faith. | Economic |
| **The Monastic Builders** | uncommon | implemented | Science buildings may be bought with faith. | Economic |

## Tier II

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Deaconries** | uncommon | implemented | Devout towns gain +1 happiness for every four citizens. | Civic |
| **The Parishes** | uncommon | implemented | Each town you found starts out devout. | Civic |
| **Commission: The State Church** | uncommon | implemented | Commission. Hold at least six towns, all of them devout, at the same time. Then, for the rest of the game, devout towns cost one less authority, minimum one. The card leaves its chair. | Wildcard |
| **The Settled Faith** | rare | modify: as built | Devout towns gain +15% science and culture. Your proclamations press 25% less. | Civic |
| **The Sabbath Laws** | uncommon | implemented | Once drafted, unlock the Rite of the Sabbath. A town keeping it builds nothing for ten turns, and gains culture equal to its production each turn. No chair required. | Civic |
| **The Anchorites** | uncommon | add | Your prophets raise a further holy site for one charge instead of two. | Civic |
| **Temple Estates** | common | implemented | Hexes beside a Holy Site gain +2 food and +2 faith. | Civic |
| **The Saints' Fields** | common | implemented | Worked Holy Sites give +5 food and +8 gold. A city working one gains +2 happiness, once per city. | Economic |
| **The Old Holy Places** | common | implemented | Holy Sites that have stood for 20 turns gain +3 faith. Those that have stood for 40 turns gain +3 faith and +3 culture more. | Civic |
| **The Cathedral Works** | common | implemented | Gain +45% production toward Cathedrals. Cities with one gain +8 science and +2 happiness. | Civic |
| **The Second Prophet** | uncommon | implemented | Prophets and apostles you buy start with one extra charge. | Civic |
| **Mission Houses** | uncommon | modify: as built | Your proclamations apply 30% more pressure. Apostles gain +1 movement. | Civic |
| **The Living Hymnal** | uncommon | implemented | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | Civic |
| **The Lives of the Saints** | uncommon | implemented | +2% science and culture for every foreign town your religion has turned this game, at most +30%. | Civic |
| **The Mission** | uncommon | implemented | Commission. Convert two foreign cities to your religion while this is seated. Reward: a free Apostle in your capital and 300 culture. Then this card leaves its chair. | Wildcard |
| **The Confessors** | uncommon | implemented | Towns that follow your religion share their sight with you. | Military |
| **The Spiritual Host** | uncommon | implemented | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. | Military |
| **The Martyrology** | uncommon | implemented | While seated, this card gains +2 faith and +2 culture each time one of your units dies in battle. | Civic |
| **The Lay Brothers** | rare | implemented | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. | Economic |
| **The Votive Gifts** | common | implemented | While this is seated, your cities know the Votive Offering: a city spends the rite's faith to add that much production, at the faith rate, to whatever it is building. Not toward wonders. Once per city per turn. | Economic |
| **The Book of Life** | uncommon | implemented | +1% science and culture for every 150 faith you have spent this game, at most +30%. | Civic |

## Tier III

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Caliphate** | rare | add | Devout towns cost no authority. | Civic |
| **The Doctors of the Church** | rare | modify: as built | Follower beliefs pay 150% more in your own cities. | Civic |
| **The Psalter** | uncommon | implemented | Each rite started in a devout town grants science and culture equal to five times the town's population. | Civic |
| **The Holy Inquisition** | uncommon | implemented | Rival religions press your cities 40% less. +38% faith. | Civic |
| **The Abbeys** | rare | add | Your apostles may raise holy sites, as prophets do. | Civic |
| **The Consecration Feast** | uncommon | implemented | Finishing a Cathedral grants science and culture equal to twenty times the town's population. | Civic |
| **The Pilgrim Towns** | uncommon | implemented | Towns working a holy site gain +20% culture. | Civic |
| **Pentecost** | rare | implemented | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | Civic |
| **The Mass Baptisms** | uncommon | implemented | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | Civic |
| **The Conversion of Kings** | rare | implemented | Commission. Have a rival's capital follow your religion while this is seated. Reward: a free Prophet in your capital and 500 culture. Then this card leaves its chair. | Wildcard |
| **The Turning of Swords** | rare | add | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. | Military |
| **The Holy Summons** | uncommon | implemented | Declaring war gives every devout town the best melee unit you can build, at most once every twenty turns. They cost no upkeep. | Military |
| **The Offering Chests** | common | implemented | Military units bought with faith cost 30% less. | Military |
| **The Pious Masons** | rare | modify: as built | In cities with a Cathedral, a world wonder that is at least half built may be bought with faith. Not the Magnum Opus. | Economic |
| **The Offered Stones** | uncommon | implemented | Buildings you bought with faith give +2 culture each, at most +6 per town. You can purchase buildings with faith. | Economic |
| **The Learned Clergy** | uncommon | implemented | +2 science and +2 culture for every 10 faith your empire makes each turn. | Civic |

## Tier IV

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Double Feast** | rare | add | Your towns may keep two rites at once. | Civic |
| **The Work of God** | rare | implemented | The town raising the Magnum Opus gains +4% production toward it for every town of yours keeping a rite, at most +40%. | Economic |
| **The Chapter Houses** | rare | implemented | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. | Civic |
| **The Seven Pilgrimages** | uncommon | implemented | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. | Civic |
| **The Apostolic Succession** | rare | implemented | Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each. | Civic |
| **The Great Consecration** | rare | implemented | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. | Economic |
| **The Tithe of Nations** | rare | implemented | While one of your cities is building the Magnum Opus, gain 1 faith each turn for every citizen in the world who follows your religion, at home or abroad. | Civic |
| **The Great Commission** | rare | implemented | Commission. Have more than half of the world's cities follow your religion. Then, for the rest of the game, devout towns gain +3 faith and +3 culture. The card leaves its chair. | Wildcard |
| **The Interdict** | rare | modify: deferred | A rival's town that follows your religion adds no production toward a Magnum Opus. | Civic |
| **The Last Crusade** | uncommon | implemented | Your military units gain +8 strength against an empire that is building the Magnum Opus, while fighting in territory that follows your religion. | Military |
| **The Host Restored** | rare | implemented | While this is seated, your cities know the Restoring of the Host: a city spends the rite's faith to heal every unit of yours standing in territory that follows your religion to full health. A city may say it once every five turns. | Military |
| **The Peace of God** | uncommon | implemented | The city building your Magnum Opus cannot be pressed by rival religions, and gains +2 strength for each city that follows your religion, at most +30. | Military |
| **The Last Offering** | rare | implemented | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | Economic |
| **The Treasury of Merit** | rare | implemented | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Devotion or the deck named beside each one may draw it, so a change here is felt in two decks. A shared card is also dealt to a seat that holds only the partner deck, so each one must pay a seat with no faith engine. Devotion shares 29 cards, the most of any deck (section 12 of the themes pass, item 9).

- **Types:** since batch DV1 every shared row carries the type below: 4 Military, 3 Economic and 22 Civic. The cards shared with Dominion, Expansionist, Scientific and Commerce carry the types those sheets give them. This sheet typed the cards shared with Magisterial, and Magisterial batch MG1 gave them the same types on its sheet.
- **Moved in batch DV1:** The Holy Spring (with Expansionist), The Priest-Astronomers and The Monastic University (with Scientific), and The Painted Chapels, The Festival Calendar and The Penitents' Roll (with Magisterial) came here from the Devotion file. The Ambarvalia came here from the Expansionist file, and its row keeps the id `theSpiritsOfPlace`. All seven keep their ids, texts, tiers and rarities (reading 8). Sacred Commissions moved from Tier I to Tier II, because it pays only in a town with a holy site.
- **Built in batch DV2:** The Shrine Guards (a new row, with Dominion), The Monastery Libraries (it left `deferred` with its new text), The Blessed Forges and The Schoolmen's Charter (new rows, with Scientific). The charter opens a new charter technology, Scholasticism, at a placeholder place beside Medicine until your chart places it. Knowing Scholasticism opens the Cathedral and the Apostle before Theology, and Theology still opens both for everybody (reading 24).
- **Built in batch DV3:** The Rising Nave (a new row, with Magisterial). It pays while the front row of a town's queue is a Cathedral or a wonder, the Magnum Opus included, and counts the tenths of that row's cost already in the town's basket (reading 18). The Magisterial sheet's shared table lists it too.
- **Built in later batches:** the Magisterial build plan builds Sacred Patronage, which keeps its second clause (reading 10).
- **Each pair's early shared card** (ruling (qqqqqq) 14): Dominion, Rites of Passage, and The Shrine Guards from DV2; Expansionist, Sacred Groves, The Ambarvalia and The Holy Spring; Commerce, The Merchant Shrines; Scientific, Cloister Schools, The Monastery Libraries, The Priest-Astronomers, and The Schoolmen's Charter from DV2; Magisterial, The Painted Chapels.
- **Five shared Tier I cards wait on The High Temple:** The Sacred Host and Cloister Schools need a Temple, The Oriflamme a religious unit beside the army, and half of The Monastery Libraries a Temple. The Schoolmen's Charter opens a technology that comes after The High Temple. They stay at Tier I, because the partner passes kept them there (reading 1).
- **Convert It or Tax It** keeps its Dominion text. Since batch DV2 its printed clause says "devout" (reading 2).

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Rites of Passage** | common | Dominion | 0 | implemented | Gaining a military unit grants 12 faith. | Civic |
| **Sacred Groves** | uncommon | Expansionist | 0 | implemented | Worked, unimproved forests gain +1 food and +1 faith. | Civic |
| **The Merchant Shrines** | common | Commerce | 0 | implemented | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | Civic |
| **The Ambarvalia** | common | Expansionist | 0 | implemented | Your capital gains +1 faith. Each town gains +1 faith for every two improved tiles in its borders. | Civic |
| **The Holy Spring** | common | Expansionist | 0 | implemented | Cities whose centre stands beside a mountain or a lake gain +2 faith and +1 culture. | Civic |
| **The Shrine Guards** | common | Dominion | 0 | implemented | Towns with a Shrine may buy melee units with faith. | Military |
| **The Sacred Host** | rare | Dominion | I | implemented | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. | Military |
| **The Oriflamme** | uncommon | Dominion | I | implemented | Military units beside one of your religious units gain +4 strength. | Military |
| **The Flood Festival** | uncommon | Expansionist | I | implemented | Each tile your workers turn into burned country grants 8 faith. | Civic |
| **Cloister Schools** | uncommon | Scientific | I | implemented | Cities with both a Temple and a Library gain +5 food and +5 science. | Civic |
| **The Monastery Libraries** | common | Scientific | I | implemented | Libraries give +2 faith. Temples give +2 science. | Civic |
| **The Schoolmen's Charter** | uncommon | Scientific | I | implemented | Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral and train the Apostle before Theology. No chair required. | Civic |
| **The Painted Chapels** | uncommon | Magisterial | I | implemented | Religious buildings give +3 culture each. | Civic |
| **The Priest-Astronomers** | common | Scientific | I | implemented | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. | Civic |
| **Pilgrim Markets** | uncommon | Commerce | II | implemented | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. | Civic |
| **The Tithe** | rare | Commerce | II | implemented | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. | Economic |
| **The Waqf** | common | Commerce | II | implemented | Faith buildings you bought with gold provide +3 faith and +2 culture. | Civic |
| **The Silk Road Monks** | uncommon | Commerce | II | modify: as built | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | Civic |
| **The Cloister** | rare | Scientific | II | implemented | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. | Civic |
| **The Blessed Forges** | uncommon | Scientific | II | implemented | Improved strategic resources gain +1 faith and +1 production. Cities with a Temple gain +2 faith and +2 production more. | Civic |
| **The Crusader Orders** | uncommon | Dominion | II | implemented | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | Military |
| **Convert It or Tax It** | uncommon | Dominion | II | implemented | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. | Economic |
| **The Festival Calendar** | uncommon | Magisterial | II | implemented | Cities keeping a rite gain +30% food and +30% culture. | Civic |
| **The Penitents' Roll** | uncommon | Magisterial | II | implemented | +6 science and +6 culture for every Order hand you reroll while this is seated. Rerolls cost 30% less faith while this is seated. | Civic |
| **Sacred Commissions** | uncommon | Magisterial | II | implemented | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | Economic |
| **Sacred Patronage** | rare | Magisterial | III | modify: deferred | Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn. | Civic |
| **The Rising Nave** | rare | Magisterial | III | implemented | While a city is building a Cathedral or a wonder, it gains +1 faith and +1 culture for every 10% of the work already done. | Civic |
| **The Holy Army** | uncommon | Dominion | III | implemented | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. | Civic |
| **The Monastic University** | rare | Scientific | III | implemented | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Civic |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects (the triage's reading 7). The last section of `docs/plans/devotion-list-proposed.md`, "Cut by this pass", gives each card's old text and the reason for its cut.

- **Retired in batch DV1:**
  - three live rows: Pastoral Shrines (merged into Lay Offerings, which now pays on pastures too), The Consolation and The Alms Roads;
  - one deferred row: Consecrated Ground.
- **Retired on 2026-10-06 and 2026-10-12** by the old sheet's cuts: The Monastic Table, The Votive Fields, The Omen Schools, Hearth Blessings, Rites of Labor, The Book of Mercy, Pilgrims' Welcome, Monastic Copyists, The Healing, The Loaves, The Feast Days, The Rites Charter, Missionary Hospitality, The Votive Companies, The Concord, The Parish Rolls, Sainthood, The Pilgrim Road, The Congregation Rolls, The Council, The Consecrated Workshops, Pilgrim Hospices, The Sacred Treasury, The Bishop's Choice and The Cloistered Realm.
- **In `data/decks/common.json`:** the shared Harvest Offerings, cut by both its sheets and retired in batch S.
- The cards of the 2026-10-17 pass that the themes pass did not take have no data row, so there is nothing to retire.

## Open for your pass

- **Ruled 2026-10-25** (`docs/plans/devotion-themes.md`, section 12: your answers to sections 10 and 11, and your two comments on the review list). They are written into the rows above, and the build plan (`docs/plans/devotion-themes-triage.md`) builds them:
  - **Your two comments,** built in batch R1: The Fast's rite gains science and culture in place of faith (*"gain science and culture instead of faith"*), and The Rites Commonwealth loses its −1 happiness (*"remove malice"*).
  - **The religion's cards from Tier II:** The Living Hymnal, The Mission and The Second Prophet moved to Tier II in batch DV1. The Creed stays at Tier I, because since batch DV3 it counts the gods you hold before you found a religion.
  - **Devout towns as a card word** (feature E, batch DV2), and **a conversion as a moment** (feature F, batch DV6, for Pentecost and The Mass Baptisms).
  - **The rule-breakers:** The Caliphate, The Abbeys, The Turning of Swords, The Double Feast, The Interdict reworked, and The Pious Masons at Tier III.
  - **The commissions:** two institutions (Commission: The State Church and The Great Commission) and three one-time rewards (The Founding Vows, The Mission at 300 culture and The Conversion of Kings at 500 culture).
  - **The reworks:** Lay Offerings takes in Pastoral Shrines' pastures. The Settled Faith pays devout towns +15% science and culture, and loses its happiness and its rite. The Creed counts gods (batch DV3).
  - **The cuts:** Pastoral Shrines, The Consolation, The Alms Roads and Consecrated Ground, retired in batch DV1.
  - **The shared cards:** the 29 above. Section 11 (where the Devotion and Magisterial passes meet): Sacred Commissions moves to Tier II, and Sacred Patronage keeps its second clause.
  - **A rite started is a season**, built in batch DV4: the Votive Offering and the Restoring of the Host do not count, and a prophet's empire rite counts once in each town it reaches.
  - **The deck's size:** 64 cards that take a chair, and 2 charters.
- **The build plan's readings:** the batches use readings 1 to 38 of the build plan until you mark one. Fourteen are marked "to confirm": 2, 4, 13, 14, 16, 18, 20, 21, 22, 24, 27, 30, 31 and 32.
- **Still open:**
  - **The build plan's question 1:** The Schoolmen's Charter opens the Apostle before Theology. Your ruling of 2026-10-21 was *"don't open units early, replace them with better versions"*. Recommended: build it as written, because an apostle is clergy and fights nothing (reading 24). The alternative opens only the Cathedral early. Batch DV2 built the recommendation. To take the alternative, remove Scholasticism's `unlocksUnit` effect in `data/techs.json` and the Apostle's `unlockedByCard` marker in `data/units.json`, and drop "and train the Apostle" from the text.
  - **Devotion's Doctrines:** sixteen proposed on 2026-10-25 (`docs/plans/devotion-doctrines.md`), waiting for your review.
  - **Five rows play as built.** The list doc's row for each says what the game does:
    - Mission Houses: a proclamation presses a flat +18 more, which is 30% of the base lump.
    - The Settled Faith: a proclamation presses a flat 15 less, which is 25% of the base lump (reading 38).
    - The Doctors of the Church: the 150% raises what follower beliefs pay a town as town lines, and not their hex lines or percentages.
    - The Pious Masons: faith pays the wonder's full price, and the hammers already banked are refunded the usual way (reading 5).
    - The Silk Road Monks (shared): "follows your religion" means a religion whose holy city you hold.

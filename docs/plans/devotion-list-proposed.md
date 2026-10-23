# The Devotion deck: the full list, with the themes pass folded in

This is a review list, rebuilt on 2026-10-23. It puts every card on the deck sheet (`docs/decks/devotion.md`) in one list, with every new card and change from the themes pass (`docs/plans/devotion-themes.md`) folded in. It replaces the list of 2026-10-18, which folded in the superseded builds pass of 2026-10-17 (`docs/plans/devotion-builds.md`). It is not the spec of record: the sheet is unchanged, and the sheet's text wins wherever the two differ. It is grouped by tier, as you asked for the Scientific list, so you can cut cards by hand.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does. The Devotion sheet still uses the older words (built, revised, deferred); this list maps them as the list of 2026-10-18 did.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changes the card), `deferred` (not dealt, because it needs a new shape or a new input) or `as built` (the game does something slightly different).
  - `add`: on a sheet, not in the data.
  - `new`: proposed by the themes pass, not on the sheet. "(10-17)" marks a card from the superseded builds pass.
  - `proposed: …` after the status names a change the themes pass makes to a sheet card: a tier move, a move to the shared cards, a rework, or a revised number. The row already shows the change (the new tier and text), and the status says what it was.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the themes pass's type sort. The Devotion rows in the data carry no type yet, so every type here is a proposal. Charters take no chair; their type is for their face.
- **Build:** the card's theme and role in the themes pass.
  - The four themes are the devout realm, the holy places, the spreading faith and the holy war. Engine glue raises or spends the engine (faith, and what it buys) and serves all four.
  - The roles are supply (more of the thing), widen (it pays something new), multiply (its output grows) and act (a choice or a moment). A capstone breaks a rule or doubles a category.
  - A second theme after a semicolon marks a bridge between two themes.
  - "feature F" marks a card on a conversion as a moment, which the pass proposes (section 6). Feature E, "devout towns" as a card word, changes no text in this list until you rule.
- **A devout town** is one of your towns that follows your religion.
- **What this list follows:**
  - the direction of 2026-10-20 (`docs/decks/deck-design.md`): a few themes per deck with varied pay, no more than about a third of the cards paying the deck's own yield, and four of the five areas of the game;
  - your picture of Devotion: faith as a way to win, paid for up front; faith that allows greater authority, wider empires and great cities kept content; a flexible deck with the most shared cards; strength from followers, religious actions, actions in devout towns and the religion's own bonuses;
  - your taste from the passes before: early cards that develop towns rather than wait on a later mechanic (the Commerce revision), so the religion's cards are dealt from Tier II; no two cards with one job; short, simple text; commissions that mix institutions and one-time rewards; rule-breakers; late pay as a percentage; bridging cards shared.
- **Doctrines:** Devotion has none yet. They come after your cuts.
- **Cut cards:** the cards the themes pass cuts are in the last section, `## Cut by this pass`, with their sheet text and one line on why, so you can restore any of them. The cards the pass moves to the shared cards are in the shared table.

**By status** (charters included):

| Tier | Implemented | Modify | Add | New | All | Proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 6 | 0 | 0 | 2 | 8 | 2 |
| Tier I | 6 | 0 | 0 | 1 | 7 | 1 |
| Tier II | 10 | 2 | 0 | 9 | 21 | 4 |
| Tier III | 4 | 2 | 0 | 10 | 16 | 2 |
| Tier IV | 11 | 1 | 0 | 2 | 14 | 2 |
| **All** | **37** | **5** | **0** | **24** | **66** | **11** |
| Shared | 22 | 3 | 3 | 1 | 29 | 9 |

**By type** (the chair a card fits; charters take no chair, and their type is for their face):

| Tier | Military | Economic | Civic | Wildcard | All | Charters among them | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| Tier 0 | 0 | 2 | 5 | 1 | 8 | 0 | 5 / 3 / 0 |
| Tier I | 1 | 2 | 4 | 0 | 7 | 1 | 2 / 4 / 1 |
| Tier II | 2 | 3 | 14 | 2 | 21 | 1 | 5 / 14 / 2 |
| Tier III | 3 | 2 | 10 | 1 | 16 | 0 | 1 / 8 / 7 |
| Tier IV | 3 | 3 | 7 | 1 | 14 | 0 | 0 / 3 / 11 |
| **All** | **9** | **12** | **40** | **5** | **66** | **2** | **13 / 32 / 21** |
| Shared | 4 | 3 | 22 | 0 | 29 | 1 | 8 / 15 / 6 |

Seatable cards (charters excluded): 64, that is 8 / 6 / 20 / 16 / 14 across Tiers 0 to IV. By type: 9 Military, 12 Economic, 38 Civic and 5 Wildcard. Before this pass the sheet held 52 cards: 4, 11, 33 and 4 by the builds pass's sort. Cards that pay faith: 12 of 64 (19%).

**Data notes:**
- The Living Hymnal, The Mission and The Second Prophet are Tier I in the data; this list has them at Tier II. The Conversion of Kings and The Pious Masons are Tier IV in the data; this list has them at Tier III.
- Pastoral Shrines, The Consolation, The Alms Roads (live) and Consecrated Ground (deferred) are rows the pass cuts. The recommendation is to retire them (`## Cut by this pass`).
- The Holy Spring, The Priest-Astronomers, The Painted Chapels, The Festival Calendar, The Penitents' Roll and The Monastic University are rows in `data/decks/devotion.json`. If the moves are taken, their rows go to `data/decks/common.json`, with the partner deck added to `decks`. The Ambarvalia's row is `theSpiritsOfPlace` in `data/decks/expansionist.json`; it moves there too.
- At commit `48f37cf8` The Merchant Shrines, The Waqf and The Silk Road Monks are still in `data/decks/commerce.json`, and Pilgrim Markets is Tier I in `common.json`. Commerce batch T1 makes the moves; this list shows them done.
- Sacred Commissions is Tier I in `common.json`; this list has it at Tier II, to confirm in the Magisterial pass.
- The Monastery Libraries' row is deferred and still says "Monasteries give +3 science. Libraries give +2 faith." The Blessed Forges, The Rising Nave and The Schoolmen's Charter have no row.
- The 25 rows the sheet cut on 2026-10-06 and 2026-10-12 are already retired in the data.
- Three 10-17 cards change: The Book of Life keeps its name with new text (faith spent this game), The Golden Legend becomes The Lives of the Saints, and The Fortified Churches becomes The Sacred Precincts. The old names were too late for their tiers or their job changed.
- Shapes the new cards need: section 7 of the themes pass lists sixteen new shapes, four of them near existing, and features E and F.

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **First Rites** | common | implemented | +25% production toward Shrines. Shrines give +2 faith. | Civic | devout realm: supply (Shrines) |
| **The Wayside Shrines** | common | implemented | Cities with a Shrine gain +2 food and +1 happiness. | Economic | devout realm: widen (Shrine towns grow) |
| **The Founding Vows** | uncommon | implemented; proposed: only a season counts toward the goal, not the Votive Offering or the Restoring of the Host (question 10) | Commission. Start two rites in your cities while this is seated. Reward: 100 faith and 40 food in your capital. Then this card leaves its chair. | Wildcard | devout realm: act (commission, one-time) |
| **The Rogations** | uncommon | new (10-17) | While seated, this card gains +1 faith and +1 culture each time one of your towns starts a rite. It starts at +2 of each. | Civic | devout realm: act; scaler (grower) |
| **Lay Offerings** | common | implemented; proposed: reworked, takes in Pastoral Shrines (was "Camps and plantations gain +1 faith and +1 food.") | Pastures, camps and plantations gain +1 faith and +1 food. | Civic | holy places: widen (the sacred herds and crops) |
| **The Calling** | common | implemented | +25% faith until you have founded a religion. | Civic | spreading faith: supply (the race) |
| **The Old Gods Remain** | uncommon | implemented | Gain one more pantheon belief. | Civic | spreading faith: supply (gods) |
| **The Gifts of the Faithful** | common | new (10-17) | Religious buildings may be bought with faith. | Economic | engine glue: faith buys the faith's buildings |

- **Tier 0 has no Military card of its own.** The Chiefdom's Military chair takes the shared The Shrine Guards, which every Devotion seat draws.
- **The Gifts of the Faithful** buys a Shrine for 78 faith, from about turn 30, once the faith ladder has paid for two gods.

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Rites Commonwealth** | rare | implemented | Cities keeping a rite demand 25% less population happiness. Your cities without a rite gain −1 happiness. | Civic | devout realm: widen (happiness), with a cost |
| **The Octave** | uncommon | implemented | Rites you start while this is seated last 50% longer. | Civic | devout realm: supply (rites last) |
| **The Fast** (charter) | uncommon | implemented | Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains faith equal to its population each turn. No chair required. | Civic | devout realm: act (a rite with a cost) |
| **The Creed** | uncommon | implemented; proposed: reworked, counts the gods a seat holds before it founds a religion, so it pays from Tier I (was "...for every belief your religion holds.") | Your capital gains +3 faith and +3 culture for every god and belief you hold. | Civic | spreading faith: widen; scaler (beliefs) |
| **The Sacred Precincts** | common | new (10-17, was The Fortified Churches) | Towns gain +3 defence for every religious building in them. | Military | holy war: widen (defence); devout realm |
| **Consecrated Labor** | common | implemented | Cities with a Shrine may buy workers with faith. | Economic | engine glue: faith buys workers |
| **The Monastic Builders** | uncommon | implemented | Science buildings may be bought with faith. | Economic | engine glue: faith buys schools |

- **Every Tier I card pays from age 1:** Shrines, rites, the gods, Libraries and faith purchases. The cards that wait on The High Temple or a founded religion are dealt from Tier II (themes pass, section 2).
- **The Creed** pays +6 faith and +6 culture for two gods at turn 32, +15 of each once the religion has five beliefs, and +24 late.

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Deaconries** | uncommon | new | Towns that follow your religion gain +1 happiness for every four citizens. | Civic | devout realm: widen (big devout towns stay content) |
| **The Parishes** | uncommon | new | Each town you found starts out following your religion. | Civic | devout realm: supply (devout towns) |
| **Commission: The State Church** | uncommon | new | Commission. Hold at least six towns, all following your religion, at the same time. Then, for the rest of the game, your towns that follow your religion cost one less authority, minimum one. The card leaves its chair. | Wildcard | devout realm: act (commission, institution) |
| **The Settled Faith** | rare | modify: as built (the proclamation half is a flat −15, which is 25% of the base lump); proposed: reworked (was "Temple cities keeping a rite gain +30% science and +2 happiness. Your proclamations apply 25% less pressure.") | Towns that follow your religion gain +15% science and culture. Your proclamations press 25% less. | Civic | devout realm: multiply, with a cost; spreading faith |
| **The Sabbath Laws** (charter) | uncommon | new (10-17) | Once drafted, unlock the Rite of the Sabbath. A town keeping it builds nothing for ten turns, and gains culture equal to its production each turn. No chair required. | Civic | devout realm: act (a rite with a cost) |
| **The Anchorites** | uncommon | new (10-17) | Your prophets raise a further holy site for one charge instead of two. | Civic | holy places: supply (more holy sites) |
| **Temple Estates** | common | implemented | Hexes beside a Holy Site gain +2 food and +2 faith. | Civic | holy places: widen (the land around) |
| **The Saints' Fields** | common | implemented | Worked Holy Sites give +5 food and +8 gold. A city working one gains +2 happiness, once per city. | Economic | holy places: widen |
| **The Old Holy Places** | common | implemented | Holy Sites that have stood for 20 turns gain +3 faith. Those that have stood for 40 turns gain +3 faith and +3 culture more. | Civic | holy places: scaler (age) |
| **The Cathedral Works** | common | implemented | Gain +45% production toward Cathedrals. Cities with one gain +8 science and +2 happiness. | Civic | holy places: supply and widen |
| **The Second Prophet** | uncommon | implemented; proposed: moved from Tier I (prophets come with The High Temple) | Prophets and apostles you buy start with one extra charge. | Civic | spreading faith: supply (clergy); holy places |
| **Mission Houses** | uncommon | modify: as built (a proclamation presses a flat +18 more, which is 30% of the base lump) | Your proclamations apply 30% more pressure. Apostles gain +1 movement. | Civic | spreading faith: supply (proclamations) |
| **The Living Hymnal** | uncommon | implemented; proposed: moved from Tier I (it pays nothing before a religion) | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | Civic | spreading faith: widen; devout realm |
| **The Lives of the Saints** | uncommon | new (10-17, was The Golden Legend) | +2% science and culture for every foreign town your religion has turned this game, at most +30%. | Civic | spreading faith: scaler ("this game") |
| **The Mission** | uncommon | implemented; proposed: moved from Tier I, and revised (150 culture to 300) | Commission. Convert two foreign cities to your religion while this is seated. Reward: a free Apostle in your capital and 300 culture. Then this card leaves its chair. | Wildcard | spreading faith: act (commission, one-time) |
| **The Confessors** | uncommon | new | Towns that follow your religion share their sight with you. | Military | spreading faith: widen (sight); holy war |
| **The Spiritual Host** | uncommon | implemented | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. | Military | holy war: multiply (the faith's ground) |
| **The Martyrology** | uncommon | new | While seated, this card gains +2 faith and +2 culture each time one of your units dies in battle. | Civic | holy war: scaler (grower) |
| **The Lay Brothers** | rare | implemented | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. | Economic | engine glue: faith buys what others build |
| **The Votive Gifts** | common | implemented | While this is seated, your cities know the Votive Offering: a city spends the rite's faith to add that much production, at the faith rate, to whatever it is building. Not toward wonders. Once per city per turn. | Economic | engine glue: faith hurries a build |
| **The Book of Life** | uncommon | new (the 10-17 name, new text) | +1% science and culture for every 150 faith you have spent this game, at most +30%. | Civic | engine glue: scaler ("this game") |

- **The devout realm's turn.** From Tier II the theme reads devout towns: content (The Deaconries), founded devout (The Parishes), cheap to rule (The State Church) and learned (The Settled Faith).
- **The Settled Faith** keeps its cost, weaker proclamations, which is the spreading faith's loss. Its old two-fact condition (a Temple and a rite) goes.
- **The Sabbath Laws** turns a town's production into culture for ten turns: a town of 18 production gives up 180 hammers for 180 culture. It suits a town that buys its buildings with faith.
- **The Mission** moves to Tier II with its religion, and its culture doubles to fit the tier.

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Caliphate** | rare | new | Towns that follow your religion cost no authority. | Civic | devout realm: capstone (rule-breaker) |
| **The Doctors of the Church** | rare | modify: as built (the 150% raises what follower beliefs pay a town as town lines; their hex lines and percentages are not raised) | Follower beliefs pay 150% more in your own cities. | Civic | devout realm: multiply (beliefs) |
| **The Psalter** | uncommon | new (10-17, reworked) | Each rite started in a town that follows your religion grants science and culture equal to five times the town's population. | Civic | devout realm: act (a rite in a devout town) |
| **The Holy Inquisition** | uncommon | implemented | Rival religions press your cities 40% less. +38% faith. | Civic | devout realm: supply (keeps towns devout) |
| **The Abbeys** | rare | new (10-17) | Your apostles may raise holy sites, as prophets do. | Civic | holy places: capstone (rule-breaker) |
| **The Consecration Feast** | uncommon | new (10-17) | Finishing a Cathedral grants science and culture equal to twenty times the town's population. | Civic | holy places: act (a Cathedral finished) |
| **The Pilgrim Towns** | uncommon | new (10-17) | Towns working a holy site gain +20% culture. | Civic | holy places: multiply |
| **Pentecost** | rare | new (10-17) | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | Civic | spreading faith: capstone (a chain); feature F |
| **The Mass Baptisms** | uncommon | new (10-17) | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | Civic | spreading faith: act (a town turns); feature F |
| **The Conversion of Kings** | rare | implemented; proposed: moved from Tier IV, and revised (300 culture to 500) | Commission. Have a rival's capital follow your religion while this is seated. Reward: a free Prophet in your capital and 500 culture. Then this card leaves its chair. | Wildcard | spreading faith: act (commission, one-time) |
| **The Turning of Swords** | rare | new (10-17) | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. | Military | holy war: capstone (rule-breaker) |
| **The Holy Summons** | uncommon | new (10-17) | Declaring war gives every town of yours that follows your religion the best melee unit you can build, at most once every twenty turns. | Military | holy war: act (war declared); devout realm |
| **The Offering Chests** | common | new (10-17) | Military units bought with faith cost 30% less. | Military | holy war: supply (cheaper soldiers) |
| **The Pious Masons** | rare | modify: as built (faith pays the wonder's full purchase price, and the hammers already banked are refunded the usual way); proposed: moved from Tier IV | In cities with a Cathedral, a world wonder that is at least half built may be bought with faith. Not the Magnum Opus. | Economic | engine glue: capstone (rule-breaker) |
| **The Offered Stones** | uncommon | implemented | Buildings you bought with faith give +2 culture each, at most +6 per town. You can purchase buildings with faith. | Economic | engine glue: bought buildings pay |
| **The Learned Clergy** | uncommon | implemented | +2 science and +2 culture for every 10 faith your empire makes each turn. | Civic | engine glue: the faith rate pays |

- **Five capstones, one for each theme and one for the engine:** The Caliphate, The Abbeys, Pentecost, The Turning of Swords and The Pious Masons. So each theme works without Tier IV.
- **The Caliphate** frees about 30 authority in a realm of ten devout towns. Each new town is free once it turns, so the realm can stretch as far as its faith holds. With it seated, The State Church's institution has nothing left to do.
- **The Abbeys** gives the apostle the prophet's verb (raise a holy site), a button the apostle did not show before. It is the pass's one new action on a unit.
- **The Conversion of Kings** moves to Tier III, where a rival's capital is in reach of apostles and Pentecost, and its culture rises to fit the tier.

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Double Feast** | rare | new (10-17; was Tier III) | Your towns may keep two rites at once. | Civic | devout realm: rule-breaker (the long game) |
| **The Work of God** | rare | new (10-17) | The town raising the Magnum Opus gains +4% production toward it for every town of yours keeping a rite, at most +40%. | Economic | devout realm: finisher (the Opus) |
| **The Chapter Houses** | rare | implemented | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. | Civic | holy places: multiply (Cathedrals) |
| **The Seven Pilgrimages** | uncommon | implemented | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. | Civic | holy places: widen (science) |
| **The Apostolic Succession** | rare | implemented | Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each. | Civic | holy places: scaler (the holy city's age) |
| **The Great Consecration** | rare | implemented | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. | Economic | spreading faith: finisher (the Opus) |
| **The Tithe of Nations** | rare | implemented | While one of your cities is building the Magnum Opus, gain 1 faith each turn for every citizen in the world who follows your religion, at home or abroad. | Civic | spreading faith: finisher (faith for the Opus) |
| **The Great Commission** | rare | implemented; proposed: reworked into an institution (was "Reward: 500 faith, and for 30 turns every city that follows your religion gains +3 faith and +3 culture. Then this card leaves its chair.") | Commission. Have more than half of the world's cities follow your religion. Then, for the rest of the game, your towns that follow your religion gain +3 faith and +3 culture. The card leaves its chair. | Wildcard | spreading faith: act (commission, institution) |
| **The Interdict** | rare | modify: deferred; proposed: reworked (was "Spend faith to place an interdict on a foreign city that follows your religion: it makes 50% less production for ten turns. The price is the production it loses, at the faith rate. Once per city every thirty turns.") | A rival's town that follows your religion adds no production toward a Magnum Opus. | Civic | spreading faith: denial (a rival's Opus) |
| **The Last Crusade** | uncommon | implemented | Your military units gain +8 strength against an empire that is building the Magnum Opus, while fighting in territory that follows your religion. | Military | holy war: finisher (against the Opus) |
| **The Host Restored** | rare | implemented | While this is seated, your cities know the Restoring of the Host: a city spends the rite's faith to heal every unit of yours standing in territory that follows your religion to full health. A city may say it once every five turns. | Military | holy war: act (a rite for the army) |
| **The Peace of God** | uncommon | implemented | The city building your Magnum Opus cannot be pressed by rival religions, and gains +2 strength for each city that follows your religion, at most +30. | Military | holy war: finisher (the Opus defended); spreading faith |
| **The Last Offering** | rare | implemented | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | Economic | engine glue: finisher (the Opus) |
| **The Treasury of Merit** | rare | implemented | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. | Civic | engine glue: the bank pays |

- **Every theme has a road to the Opus:** faith poured in (The Last Offering), followers abroad (The Great Consecration, The Tithe of Nations), rite towns (The Work of God), the Opus town defended (The Peace of God), and a rival's Opus halted (The Interdict, The Last Crusade).
- **The Interdict** no longer needs an order said over a town you do not own. It works through the gate that already halts a besieged town's Opus for Dominion's Circumvallation.

## Shared with another deck

These rows live in `data/decks/common.json`, except the cards this pass proposes to move there (marked "proposed") and the three with no row (The Schoolmen's Charter, The Blessed Forges, The Rising Nave). A seat holding Devotion, or the deck named beside a card, may draw it, so a change here is felt in two decks, and each card must also pay a seat with no faith engine. The types of the cards shared with Dominion, Expansionist and Scientific are in the data or their sheets; the types of the cards shared with Commerce follow the Commerce triage; the types of the cards shared with Magisterial are proposals, to reconcile in the Magisterial pass.

With this pass Devotion shares 29 cards, one more than Dominion, as you asked: *"should have the most shared deck cards"* (themes pass, question 9).

| Card | Also in | Tier | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|---|---|
| **Rites of Passage** | Dominion | 0 | common | implemented | Gaining a military unit grants 12 faith. | Civic | holy war: supply |
| **Sacred Groves** | Expansionist | 0 | uncommon | implemented | Worked, unimproved forests gain +1 food and +1 faith. | Civic | holy places: widen (sacred land) |
| **The Merchant Shrines** | Commerce | 0 | common | implemented; moved to the shared cards in Commerce batch T1; confirmed, as the pair's early card | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | Civic | engine glue (faith) |
| **The Ambarvalia** | Expansionist | 0 | common | implemented (row `theSpiritsOfPlace`); proposed: shared with Devotion, as the Expansionist pass offered | Your capital gains +1 faith. Each town gains +1 faith for every two improved tiles in its borders. | Civic | holy places: widen (sacred land) |
| **The Holy Spring** | Expansionist | 0 | common | implemented; proposed: moved from the Devotion cards to the shared cards | Cities whose centre stands beside a mountain or a lake gain +2 faith and +1 culture. | Civic | holy places: supply (where to settle) |
| **The Shrine Guards** | Dominion | 0 | common | new (10-17); proposed: a shared card | Towns with a Shrine may buy melee units with faith. | Military | holy war: supply (soldiers bought with faith) |
| **The Sacred Host** | Dominion | I | rare | implemented | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. | Military | holy war: supply |
| **The Oriflamme** | Dominion | I | uncommon | implemented | Military units beside one of your religious units gain +4 strength. | Military | holy war |
| **The Flood Festival** | Expansionist | I | uncommon | implemented | Each tile your workers turn into burned country grants 8 faith. | Civic | holy places (sacred land) |
| **Cloister Schools** | Scientific | I | uncommon | implemented | Cities with both a Temple and a Library gain +5 food and +5 science. | Civic | devout realm |
| **The Monastery Libraries** | Scientific | I | common | modify: revised (the data row is deferred and still says "Monasteries give +3 science. Libraries give +2 faith.") | Libraries give +2 faith. Temples give +2 science. | Civic | devout realm |
| **The Schoolmen's Charter** (charter) | Scientific | I | uncommon | add (a Scientific sheet row); confirmed, as the Scientific pass asked | Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral and train the Apostle before Theology. No chair required. | Civic | holy places; spreading faith |
| **The Painted Chapels** | Magisterial | I | uncommon | implemented; proposed: moved from the Devotion cards to the shared cards, as the pair's early card; to confirm in the Magisterial pass | Religious buildings give +3 culture each. | Civic | devout realm |
| **The Priest-Astronomers** | Scientific | I | common | implemented; proposed: moved from the Devotion cards to the shared cards | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. | Civic | devout realm: widen (science) |
| **Pilgrim Markets** | Commerce | II | uncommon | implemented; moved from Tier I in Commerce batch T1; confirmed | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. | Civic | holy places (pilgrims) |
| **The Tithe** | Commerce | II | rare | implemented | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. | Economic | engine glue |
| **The Waqf** | Commerce | II | common | implemented; moved to the shared cards in Commerce batch T1; confirmed | Faith buildings you bought with gold provide +3 faith and +2 culture. | Civic | engine glue |
| **The Silk Road Monks** | Commerce | II | uncommon | modify: as built ("follows your religion" means a religion whose holy city you hold); moved to the shared cards in Commerce batch T1; confirmed | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | Civic | spreading faith |
| **The Cloister** | Scientific | II | rare | implemented | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. | Civic | devout realm |
| **The Blessed Forges** | Scientific | II | uncommon | add | Improved strategic resources gain +1 faith and +1 production. Cities with a Temple gain +2 faith and +2 production more. | Civic | engine glue (faith) |
| **The Crusader Orders** | Dominion | II | uncommon | implemented | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. | Military | holy war; spreading faith |
| **Convert It or Tax It** | Dominion | II | uncommon | implemented | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. | Economic | holy war; devout realm |
| **The Festival Calendar** | Magisterial | II | uncommon | implemented; proposed: moved from the Devotion cards to the shared cards; to confirm in the Magisterial pass | Cities keeping a rite gain +30% food and +30% culture. | Civic | devout realm: multiply (rites) |
| **The Penitents' Roll** | Magisterial | II | uncommon | implemented; proposed: moved from the Devotion cards to the shared cards, because it acts on the draft; to confirm in the Magisterial pass | +6 science and +6 culture for every Order hand you reroll while this is seated. Rerolls cost 30% less faith while this is seated. | Civic | engine glue (faith spent) |
| **Sacred Commissions** | Magisterial | II | uncommon | implemented; proposed: moved from Tier I to Tier II, because it pays only in a town with a holy site; to confirm in the Magisterial pass | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. | Economic | holy places |
| **Sacred Patronage** | Magisterial | III | rare | modify: deferred; proposed: reworked so it can be built (drops "Spending a great person grants 30 faith, at most once per turn."); to confirm in the Magisterial pass | Faith may buy great-person drafts at the escalating price. | Civic | engine glue (faith buys great people) |
| **The Rising Nave** | Magisterial | III | rare | add | While a city is building a Cathedral or a wonder, it gains +1 faith and +1 culture for every 10% of the work already done. | Civic | holy places |
| **The Holy Army** | Dominion | III | uncommon | implemented | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. | Civic | holy places; holy war |
| **The Monastic University** | Scientific | III | rare | implemented; proposed: moved from the Devotion cards to the shared cards | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Civic | holy places |

- **Each pair keeps an early shared card** (ruling (qqqqqq) 14): Dominion has Rites of Passage and The Shrine Guards; Expansionist Sacred Groves, The Ambarvalia and The Holy Spring; Commerce The Merchant Shrines; Scientific Cloister Schools, The Monastery Libraries, The Schoolmen's Charter and The Priest-Astronomers; Magisterial The Painted Chapels, once Sacred Commissions moves to Tier II.
- **Four shared Tier I cards wait on The High Temple:** The Sacred Host and Cloister Schools need a Temple, The Oriflamme a prophet beside the army, and half of The Monastery Libraries a Temple. They stay at Tier I, because the Dominion and Scientific passes kept them there.
- **Why each new share pays the partner alone:** a Dominion seat makes faith from Rites of Passage and The Camp Chaplains and buys spears with it (The Shrine Guards); rites are open to every empire, so a Scientific seat saying Omen Reading is paid science in its capital (The Priest-Astronomers) and a Magisterial seat saying rites is paid culture (The Festival Calendar); every empire raises Shrines and Temples (The Painted Chapels); Order hands are rerolled with faith by every deck (The Penitents' Roll); an Expansionist town beside a mountain or lake gains the culture that deck lacks (The Holy Spring); an Academy beside a holy site is both decks' work (The Monastic University).

## Cut by this pass

Every card the themes pass cuts, so you can restore one. The first four rows are sheet cards, with the sheet's text. The rest are cards the 2026-10-17 pass proposed and the themes pass did not take; they are marked (10-17), with that pass's text.

| Card | Tier | Ability (as on the sheet, or the 10-17 text) | Why |
|---|---|---|---|
| **Pastoral Shrines** | 0 | Worked pastures gain +1 faith and +1 food. A city working at least two pastures gains +1 happiness. | Merged into Lay Offerings, which now pays on pastures too. The two did one job on different hexes. Its row is live: retire it. |
| **The Consolation** | I | Cities keeping a rite gain +3 happiness. | Happiness in rite towns is The Rites Commonwealth's job at the same tier. Its row is live: retire it. |
| **The Alms Roads** | I | Your trade routes from Temple cities gain +5 faith. | It waits on routes, which Commerce deals from Tier II, and faith on routes is the shared Pilgrim Markets' job. Its row is live: retire it. |
| **Consecrated Ground** | I | You may buy tiles with faith, at half their gold price. | Deferred for a second price and a second button on the city screen, which is a new input. Buying land is Commerce's verb (Land Speculation). Retire the row. |
| **The Chantries** (10-17) | II | +1% faith and culture for every two buildings you have bought with faith, at most +30%. | The Book of Life reads every faith spent, and The Offered Stones pays the bought buildings. |
| **The Votive Tablets** (10-17) | III | Each purchase you make with faith grants culture equal to a quarter of its price. | The Offered Stones pays culture on the same purchases. |
| **The Fabric Fund** (10-17) | III | Purchases made with faith cost 30% less in towns with a Cathedral. | The Offering Chests takes the discount for soldiers; a building discount would cut into the faith rate you set. |
| **The Parish Churches** (10-17) | II | +1% science and culture for every two religious buildings you hold, at most +30%. | The Sacred Precincts and The Painted Chapels read the same buildings. |
| **The Old Observances** (10-17) | II | +1% science and faith for every three rites your towns have started this game, at most +30%. | The Rogations grows on the same rites. |
| **The Holy Year** (10-17) | III | Every twentieth turn is a holy year: rites your towns start that turn cost no faith. | A new shape on the rite's price; The Double Feast is the rites' late rule-breaker. |
| **The Unceasing Prayer** (10-17) | IV | Rites cost no faith in towns with a Cathedral. | The same new shape, for one card. |
| **The Corpus Christi** (10-17) | III | Once drafted, unlock the Procession. A town keeping it presses your religion as a holy site does, for ten turns. No chair required. | A new shape for one card; Pentecost and The Parishes spread the faith. |
| **The Epistles** (10-17) | I | While seated, this card gains +2 science and +2 culture each time a foreign town turns to your religion. It starts at +3 of each. | The Lives of the Saints reads the same conversions for the whole game. |
| **Peter's Pence** (10-17) | III | +1 gold for every two citizens abroad who follow your religion. | It repeats the founder's share and the enhancer Pilgrims' Coin. |
| **The Great Councils** (10-17) | III | +5% science and culture for every empire with a town that follows your religion, at most +30%. | It repeats the enhancer World Church and The Lives of the Saints. |
| **The Mendicant Friars** (10-17) | III | Proclaiming does not end your apostles' turn. | More orders for the player each turn, for a small gain. |
| **The Mission Schools** (10-17) | II | Prophets and apostles cost 30% less faith. | The Second Prophet does the same job. |
| **The Victory Hymns** (10-17) | II | Killing a unit presses your religion on every town within three hexes. | Joan of Arc's ability and the enhancer The Crusade already do this. |
| **The Rededication** (10-17) | III | Capturing a town turns all its citizens to your religion. | The shared The Crusader Orders presses a captured town. |
| **The Oblates** (10-17) | I | Towns may spend a citizen to gain faith equal to twice the food it took to grow that citizen. | The levy is Expansionist's verb; Devotion spends faith, not citizens. |
| **The Offertory** (10-17) | II | Each town gains +1 faith for every three citizens. | Faith income with no theme; the engine has enough. |
| **The Book of Life, old text** (10-17) | I | While seated, this card gains +1 science and +1 culture each time you buy something with faith. It starts at +2 of each. | The name moves to faith spent this game, which reads rites and rerolls too. |

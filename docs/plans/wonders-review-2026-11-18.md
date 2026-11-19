# Wonders review, 2026-11-18

A review of every wonder in the game, and proposals for new wonders that fit the arcane theme. This is a design note. It changes no data and no code.

**Status, 2026-11-19:** the user has commented on this review three times. The current state is the last section, "Not ready: open questions". The sections before it are the record: Parts 1 to 3 are the review as the user first read it, and "The set after the user's comments" is the sheet before the second round.

## The user's ruling (2026-11-19)

- The user read the first page and ruled on the proposals: *"lets go with wonders that are not solely european, i want a diverse set from other cultures"*.
- The user then set the frame: *"lets assume the game is set in a fantasy world where all the magisters from around the world are playing this game, in some kind of mystical cabal"* (recorded in `docs/flags.md`, last section).
- Part 3 below follows both rulings. The proposed set draws on many cultures, with at most one European or Greco-Roman wonder in each age. Each wonder stands on what it meant to the adepts of its own tradition. No wonder is tested against what Renaissance Europe knew.
- Every existing wonder stays. The Terracotta Army, The Walls of Uruk and The Great Mosque of Djenné are fine as they are. Petra, Angkor Wat, Chichen Itza and Machu Picchu are weak, and each gets a better effect (see its direction), not removal.

## How this was made

- The effect text is the game's own. A script read `compendiumSections()` (`src/ui/compendium.ts`), which prints each row through `describeBuildingRow`, and wrote the lines out. Nothing in the effect columns is a paraphrase.
- Costs are `buildingProductionCost` for each row. Ages and columns are from `data/techs.json` and `techColumn`.
- Verdicts compare each wonder with `.claude/skills/card-design/references/power-bar.md` (seat yields by age, the pay of a regular card) and with ordinary buildings of the same column. No bot game was run.
- Verdicts: **fine**; **weak** (too small to matter for its price); **outdated** (reads a system that changed or was retired); **odd** (works, but does not fit its name, its age or the one-effect rule).

## Summary

- The game has 27 wonders: 8 in age 1, 3 in age 2, 12 in age 3, 4 in age 4. Age 2 and age 4 are thin, and age 3 holds almost half.
- Four wonders open on one technology, Theology (Chichen Itza, Hagia Sophia, Angkor Wat, The Great Mosque of Djenné). Stonecraft, Iron Working and Satrapies open two each. `docs/wonders.md` asks for one wonder for each technology where possible.
- The wager "The Wonder of the Age" asks for three wonders of the current age, held at once. Age 2 has exactly three, so the wager needs all of them. Age 4 has four.
- A wonder costs 130 production at column 1 and 1.31 times more for each column: 170 in most of age 1, 292 to 382 in age 2, 501 to 860 in age 3, and 1,127 to 1,934 in age 4. A town makes about 5, 10, 15 and 35 production a turn in the four ages (bot games), so an age 3 or age 4 wonder is 32 to 57 turns of one ordinary town. At that price, an effect of a few yield a turn in one city is too small.
- A wonder costs 2.2 times a large building of its column, 3.3 times a medium one and 4.3 times a small one. `docs/wonders.md` still says "5 to 7 times the age's best building; hand-tuned rows", which was true before the one cost standard. It also names a Sistine wonder that has no row. The doc needs an update.
- Every wonder also pays +10 renown when it is finished and +1 or +2 renown a turn. The tables leave these lines out.
- Five bead rows that read wonders (The First Marvel, The Exposition, Three of the Age, The Builder, The Most Marvels) are retired with the rest of the feats. No wonder effect reads them.
- The Compendium prints "on completion, a glass bead is yours" for The Magnum Opus, but the bead it grants is the golden bead. That is a wording slip in the describer.
- Only one clause on any wonder is marked deferred: The Alhambra's. Two rows carry a design note: The Great Lighthouse (the trade route) and The Alhambra.

### Flagged wonders (11 of 27)

| Wonder | Age | Verdict | Reason in short | Direction |
|---|---|---|---|---|
| The Great Lighthouse | 1 | **odd** | Five small clauses, one a copy of Chart the Stars, and a row note that says the trade route does not match the design. | Keep the trade route and the fishing-boat gold. Drop the sight and the embarked movement, and settle the note. |
| The Pyramids | 1 | **weak** | One more worker charge saves about 40 production over ten workers, against a price of 170. | Give it one builder effect that lasts, for example faster wonders or cheaper improvements in every city, and drop the charge. |
| The Great Ziggurat | 1 | **outdated** | The discount on religious units reaches only the augur, which is retired. | Point the discount at prophets and apostles (the `religious` filter exists), or replace the clause. |
| The Great Library | 3 | **odd** | The library of antiquity arrives in age 3 with about 10 science a turn, and its free technology is the same grant as The House of Wisdom. | Move it to age 2 (Chronology or Code of Laws have room) and give it one effect of its own, so it is not a smaller House of Wisdom. |
| Petra | 3 | **weak** | About 16 yield a turn in one desert city for 657 production, and two ages late. | Move it to age 2, or make the desert bonus reach every city of the empire. |
| Angkor Wat | 3 | **weak** | About 7 faith a turn and cheaper hexes, for 860 production; two clauses with no link. | Choose one idea. Either a land wonder (cheaper hexes and wider borders for every city) or a faith wonder, not both. |
| Chichen Itza | 3 | **weak** | Longer rites save at most about 12 faith a turn, for 860 production. | Make the rite clause larger and plain: a rite said in this city is also said in the capital, or rites cost less faith. |
| The Circus Maximus | 3 | **weak** | +4 happiness at twice the price of a Cathedral, and it counts the Barracks, an age 1 military building. | Raise the flat happiness, and count a building that towns already want (Amphitheaters are taken, so Public Baths or Stables). |
| The Water Clock of Su Song | 3 | **outdated** | The cadence clause reads Orders that are almost all retired: one of eight is live. | Keep the 7-turn payment as the one effect. Drop the cadence clause and the Scholarship rider. |
| Machu Picchu | 4 | **weak** | +25% gold in one city is 8 to 15 gold a turn for 1,477 production, and the name has no link to gold. | Give it a mountain effect (for example yields on mountain hexes, which nothing else can work) and move it earlier. |
| The Alhambra | 4 | **weak** | +4 strength for mounted units only, below the bar for age 4, at the price of four Knights; the second clause is deferred. | Replace both clauses with one that the game can already do, for example a strength stamp on every unit raised here (the Terracotta Army's shape) at a larger figure. |

## Part 1 and 2: every wonder, with its verdict

### Age 1 (8 wonders)

#### The Temple of Artemis: fine

- Opens with Husbandry (age 1, column 1). Costs 130 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 food, +1 faith
  - +1 food on every hex with a Camp
  - +1 food on every hex with a Pasture
  - +1 happiness per improved bonus resource in this city (at most +4 happiness)
- Verdict: **fine**. The cheapest wonder (130). It pays food on every Camp and Pasture in the empire and up to 4 happiness. That is a good return in age 1, where a seat makes about 44 yield a turn.

#### Stonehenge: fine

- Opens with Stonecraft (age 1, column 2). Costs 170 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 faith
  - +1 pantheon slot
  - +1 faith on every hex carrying Stone or Marble
  - on completion, a god is named, and your faith is not spent
- Verdict: **fine**. A second pantheon slot and a god named for free. Strong and clear.

#### The Great Lighthouse: odd

- Opens with Sailing (age 1, column 2). Costs 170 production. Site: a coastal city. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - all units: +1 movement while embarked
  - +1 gold on every hex with a Fishing Boat
  - every coastal city: +1 city sight
  - +1 trade route
- Row note: "The extra trade route is empire-wide. The design calls for one per coastal city."
- Verdict: **odd**. Five small clauses where a wonder should have one or two. The row's own note says the trade route does not match the design ("one per coastal city"). The +1 movement while embarked is the same effect as Chart the Stars. No trader exists until Currency in age 2, so the route waits.
- Direction: Keep the trade route and the fishing-boat gold. Drop the sight and the embarked movement, and settle the note.

#### The Hanging Gardens: fine

- Opens with Calendar (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +3 food
  - +25% food surplus stored toward growth
  - +1 food on every hex with a Farm beside fresh water, in every city with The Hanging Gardens
- Verdict: **fine**. +3 food, +25% growth, and +1 food on river farms in its city. A clear growth wonder for one big town.

#### The Oracle: fine

- Opens with Divination (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 culture, +2 faith
  - +1 faith in every city with The Oracle
  - +1 card in every Order hand
  - +1 card in every Doctrine draft
- Verdict: **fine**. One more card in every Order hand and every Doctrine draft is a strong effect for the whole game, and +2 culture is large when a seat makes 3 or 4 culture a turn. Small point: "+1 faith in every city with The Oracle" is one city, so it reads bigger than it is. It could join the base faith.

#### The Pyramids: weak

- Opens with Stonecraft (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 production
  - newly created workers gain +1 charge
- Verdict: **weak**. A worker has 3 charges and costs 10 to 13 production. One more charge saves about 4 production for each worker built, so ten workers repay about 40 of the 170 it costs. The +2 production repays the rest in 85 turns.
- Direction: Give it one builder effect that lasts, for example faster wonders or cheaper improvements in every city, and drop the charge.

#### The Walls of Uruk: fine

- Opens with Bronzeworking (age 1, column 2). Costs 170 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +2 culture
  - your capital: +10 city defence
  - +4 combat strength inside your capital’s borders
  - +2 authority capacity
  - +50 to how much punishment the city can take
- Verdict: **fine**. +4 combat strength inside the capital's borders is strong in age 1 (units have 15 to 33 strength), and +2 authority capacity pays for most of a town. I could not judge how often a capital is attacked in age 1 without a game run.

#### The Great Ziggurat: outdated

- Opens with Writing (age 1, column 3). Costs 223 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 science, +2 faith
  - religious units cost −25% to buy
  - +1 science in every city with a Shrine
- Verdict: **outdated**. The clause "religious units cost −25% to buy" reads the `consecrates` marker, and the only unit with that marker is the augur, which is retired. Prophets and apostles do not get the discount, so the clause does nothing. The rest (+2 science, +2 faith, +1 science per Shrine city) still pays well for age 1.
- Direction: Point the discount at prophets and apostles (the `religious` filter exists), or replace the clause.

### Age 2 (3 wonders)

#### The Mausoleum: fine

- Opens with Currency (age 2, column 4). Costs 292 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - +1 gold per building in this city
  - +1 gold on every hex with a Quarry
  - +2 authority capacity
- Verdict: **fine**. +1 gold for each building in its city is about +8 to +12 gold in age 2, where a seat makes about 19 gold a turn, and +2 authority capacity. The name and the effect have little to do with each other, but it pays.

#### The Theatre of Dionysus: fine

- Opens with Epic Poetry (age 2, column 4). Costs 292 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +4 culture
  - +1 happiness per Amphitheater
  - on completion, a Doctrine draft opens
  - on completion, an Amphitheater is raised here as well
- Verdict: **fine**. A Doctrine draft, a free Amphitheater, +4 culture and happiness for each Amphitheater. Age 2 culture is about 25 a turn, so this is a headline wonder.

#### The Colossus: fine

- Opens with Wayfinding (age 2, column 5). Costs 382 production. Site: a coastal city. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +3 gold
  - +1 trade route for your empire
  - +1 production, +1 gold on every water hex carrying a resource
- Verdict: **fine**. +3 gold, a trade route, and +1 production and +1 gold on every water resource in the empire. Good for a coastal empire, small for anyone else, which is right for a site wonder.

### Age 3 (12 wonders)

#### The Great Library: odd

- Opens with Rhetoric (age 3, column 6). Costs 501 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 science
  - +1 science in every city with a Library
  - on completion, the technology you are researching is finished
- Verdict: **odd**. The library of antiquity arrives in age 3, on the same technology as the Forum, and costs 501. Its pay each turn is about +3 and +1 for each Library city, so about 10 science where a seat makes 106. The free technology carries the whole wonder, and The House of Wisdom gives the same grant one age later. I did not price the free technology.
- Direction: Move it to age 2 (Chronology or Code of Laws have room) and give it one effect of its own, so it is not a smaller House of Wisdom.

#### The Statue of Zeus: fine

- Opens with Iron Working (age 3, column 6). Costs 501 production. Site: none. Renown: +1 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +1 culture
  - +15% combat strength for all units against cities
  - on completion, the best melee unit you can build joins you
- Row note: "Your soldiers strike harder at walls than at men."
- Verdict: **fine**. +15% against cities is about +7 strength in age 3, and a free Legionary is worth 81 production. Useful only to an empire at war, which is the point.

#### The Terracotta Army: fine

- Opens with Iron Working (age 3, column 6). Costs 501 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +2 production
  - +6 combat strength when defending while standing in one of your cities
  - newly created units in every city with The Terracotta Army gain +2 combat strength
  - +2 authority capacity
- Row note: "Soldiers raised in this city start out better trained, and keep that training wherever they march."
- Verdict: **fine**. +6 defending in a city is 12% to 14% of age 3 unit strength, and units raised in its city keep +2 strength for life. A good defensive wonder.

#### Petra: weak

- Opens with Mathematics (age 3, column 7). Costs 657 production. Site: a city built on or next to desert. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 gold
  - +1 food, +1 production on every desert hex, in every city with Petra
  - +1 gold on every floodplain hex, in every city with Petra
- Row note: "A caravan city at the edge of the sand: it may be raised in a town standing on desert, or in one with desert beside it."
- Verdict: **weak**. +1 food and +1 production on desert hexes, in one city only, for 657 production. A city that works eight desert hexes gains 16 yield a turn. A regular card of this age pays 35 to 60. It also arrives late: by age 3 a desert town has already been small for a hundred turns.
- Direction: Move it to age 2, or make the desert bonus reach every city of the empire.

#### The Forbidden City: fine

- Opens with Satrapies (age 3, column 7). Costs 657 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward merchants.
- Effect, in the game's words:
  - +2 culture
  - you have one more wildcard chair
  - +5 authority capacity
- Verdict: **fine**. One more Wildcard chair and +5 authority capacity. Probably the strongest wonder in the game for its price (657).

#### The Great Wall: fine

- Opens with Satrapies (age 3, column 7). Costs 657 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 production
  - every hex you own exerts zone of control on enemy units, as a unit of yours would
  - this city: +10 city defence
  - +25 to how much punishment the city can take
- Verdict: **fine**. Every hex you own slows enemy units. I could not judge the size of this without a game run: zone of control is a movement cost, not a block.

#### Angkor Wat: weak

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 faith
  - +1 faith per 2 hexes worked here
  - a hex costs 25% less to buy
- Verdict: **weak**. +1 faith for every 2 worked hexes in one city is about +5 faith, and a hex costs 25% less to buy. With the base +2 faith that is about 7 faith a turn for 860 production. The two clauses have nothing to do with each other.
- Direction: Choose one idea. Either a land wonder (cheaper hexes and wider borders for every city) or a faith wonder, not both.

#### Chichen Itza: weak

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +2 culture, +2 faith
  - rites last +50% longer
  - +1 happiness
- Verdict: **weak**. Rites last 15 turns in place of 10. That saves a third of the faith an empire spends on rites. A seat makes about 36 faith a turn in age 3, so the most it can save is about 12 faith a turn, and only if all its faith goes to rites. With +2 culture, +2 faith and +1 happiness the total is small for 860 production.
- Direction: Make the rite clause larger and plain: a rite said in this city is also said in the capital, or rites cost less faith.

#### Hagia Sophia: fine

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +3 faith
  - +1 culture, +1 faith in every city with a Temple
  - spreads your religion +4 faith to every city within 8 hexes
  - on completion, a Prophet joins you
- Verdict: **fine**. A free Prophet (120 faith or more), +1 culture and +1 faith in every Temple city, and religious pressure on every city within 8 hexes. A full religion wonder.

#### The Circus Maximus: weak

- Opens with Engineering (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +1 happiness per Barracks
  - +4 happiness
- Verdict: **weak**. +4 happiness and +1 for each Barracks, for 860 production. A Cathedral gives +3 happiness with culture and faith for 397. The Barracks is the age 1 drill yard for foot soldiers and pays nothing itself, so the count asks a peaceful empire to build a military building in every town. A circus for chariots would count Stables.
- Direction: Raise the flat happiness, and count a building that towns already want (Amphitheaters are taken, so Public Baths or Stables).

#### The Great Mosque of Djenné: fine

- Opens with Theology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +3 faith
  - newly created prophets gain +1 charge
  - newly created apostles gain +1 charge
  - +1 pantheon slot
- Verdict: **fine**. Prophets and apostles get a third charge, so each one does half as much again, and a pantheon slot opens. Good for a Devotion seat. It is the fourth wonder on Theology.

#### The Water Clock of Su Song: outdated

- Opens with Horology (age 3, column 8). Costs 860 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +3 science
  - Scholarship pays +3 science
  - your Orders that pay on a cadence come round 2 turns sooner
  - every 7 turns, 1 science for every production your empire makes a turn
  - +3 authority capacity
- Row note: "The escapement keeps the realm's whole calendar. Every boon of yours that comes round on a beat comes round sooner, and on the clock's own beat the realm is paid in learning for everything its workshops made."
- Verdict: **outdated**. The clause "your Orders that pay on a cadence come round 2 turns sooner" has almost nothing to read. Seven of the eight Orders with a cadence are retired; only The Champagne Fairs (Commerce) is live. The Clocktower, its sister building on the same technology, is retired too. The clock's own payment (science equal to the empire's production every 7 turns, about 15 science a turn in age 3 and 68 in age 4) is good. Four clauses is too many.
- Direction: Keep the 7-turn payment as the one effect. Drop the cadence clause and the Scholarship rider.

### Age 4 (4 wonders)

#### The House of Wisdom: fine

- Opens with Scholarship (age 4, column 9). Costs 1127 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward scholars.
- Effect, in the game's words:
  - +4 science
  - +50% science in every city with The House of Wisdom
  - on completion, the technology you are researching is finished
- Verdict: **fine**. +50% science in its city and a free technology of the last age. A seat makes about 494 science a turn in age 4, so a science capital gains 40 or more.

#### Machu Picchu: weak

- Opens with Natural Philosophy (age 4, column 10). Costs 1477 production. Site: a city next to a mountain. Renown: +2 per turn and +10 when it is finished, toward engineers.
- Effect, in the game's words:
  - +2 gold
  - +25% gold in every city with Machu Picchu
- Verdict: **weak**. +25% gold in one city, for 1,477 production. A seat makes about 298 gold a turn in age 4 over 10 to 15 towns, so one town gains 8 to 15 gold. A Bank gives +4 gold and +20% for 520 to 680. The mountain city of the Inca also has no link to gold or to Natural Philosophy, the technology that opens it.
- Direction: Give it a mountain effect (for example yields on mountain hexes, which nothing else can work) and move it earlier.

#### Notre-Dame: fine

- Opens with The Holy Office (age 4, column 11). Costs 1934 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward artists.
- Effect, in the game's words:
  - +2 culture
  - +1 happiness per Temple
  - +3 culture and +1 happiness in every city with a Cathedral
- Verdict: **fine**. +1 happiness for each Temple, and +3 culture and +1 happiness in every Cathedral city. A wide Devotion empire of twelve towns gains about 24 happiness and 36 culture. It arrives at column 11 of 12 and costs 1,934, so it may come too late to matter. I could not judge that without a game run.

#### The Alhambra: weak

- Opens with Militant Orders (age 4, column 11). Costs 1934 production. Site: none. Renown: +2 per turn and +10 when it is finished, toward generals.
- Effect, in the game's words:
  - +3 culture
  - +4 combat strength for mounted units
  - +1 happiness
  - units raised here begin dug in, as if they had already fortified — not built yet **(deferred)**
- Row note: "Being dug in is something a piece does and stops doing, not something it is born with, so the second clause is not built."
- Verdict: **weak**. +4 combat strength for mounted units only, in an age where units have 45 to 80 strength, so 5% to 9%. The bar for a regular combat card of this age is +6 for every unit. It costs 1,934, the price of four Knights. Its second clause ("units raised here begin dug in") is marked deferred and is not built.
- Direction: Replace both clauses with one that the game can already do, for example a strength stamp on every unit raised here (the Terracotta Army's shape) at a larger figure.

### The Magnum Opus

- Not a wonder row (`wonder: true` is absent), but it is priced at the wonder size: 2534 production at column 12. It is an empire building, opened for everybody when any empire researches Alchemy, and an empire may begin it only with 7 beads.
  - +4 culture
  - on completion, a glass bead is yours
- Verdict: fine. It is the end of the game and not a wonder to balance here.

### Empire buildings (the "great houses")

- These are not wonders. Each empire may build one of each (a card can lift that limit), they cost the large size and have upkeep, and no other empire can take them from you by building first.
- The game has 15 rows of this class: Forum, Caravanserai, Bourse, Chart the Stars, The Turning Heavens, The Alchemical Codex, The Magnum Opus, Mouseion, Bimaristan, Tophane, Heroic Epic, Imperial Throne, High Temple and The Valley of Kings, and the four below in full.

| Building | Opens with | Cost | Effect, in the game's words |
|---|---|---|---|
| Forum | Rhetoric (age 3, column 6) | 231 | +10% science and +10% culture in every city with a Forum |
| Caravanserai | The Silk Road (age 3, column 6) | 231 | +3 trade routes for your empire; +1 food, +1 production on every trade route sent from every city with a Caravanserai |
| Bourse | Paper Money (age 4, column 9) | 520 | +1 culture per 4 gold gained per turn |
| Chart the Stars | Chronology (age 2, column 4) | 134 | +2 science; ships: +1 movement; all units: +1 movement while embarked; on completion, a glass bead is yours |

- Chart the Stars gives +1 movement while embarked, the same clause as The Great Lighthouse. The two add together.

## Existing wonders that serve the arcane theme

| Wonder | Why it fits |
|---|---|
| The Oracle | A house of divination. Its effect (more cards in each draft) is a good match. |
| Stonehenge | A ring of stones set to the sun at midsummer and midwinter: a calendar keeper's work. |
| The Great Ziggurat | A temple tower where priests watched the sky. Its mix of science and faith fits. |
| Chichen Itza | Its pyramid counts the days of the year in its steps, and its round tower was built for watching Venus. The rite effect fits, but it is too small. |
| The Water Clock of Su Song | An astronomical clock tower with a turning sphere of the heavens. |
| The House of Wisdom | A house of translators, astronomers and alchemists. |
| The Great Library | The library that tried to hold every book. |
| The Great Mosque of Djenné, Hagia Sophia, Angkor Wat, Notre-Dame | Great houses of faith. They serve the faith systems more than the arcane ones, and that is right for them. |
| The Magnum Opus | The centre of the theme. |

- Every existing wonder stays. The Terracotta Army, The Walls of Uruk and The Great Mosque of Djenné are fine as they are. Petra, Angkor Wat, Chichen Itza and Machu Picchu are weak, and each gets a better effect (see its direction), not removal.

## Part 3: proposed wonders

- Each has one effect and at most one condition, as the card-design skill asks.
- 10 of 16 use an existing effect shape. 5 need one new option on an existing kind. 1 needs a new shape.
- 2 depend on the wager system, which is due for a rework: The Oracle Pits of Yin and The Observatory of Ulugh Beg.
- No name is used by a building, Order, belief, great person, wager or bead in `data/`.
- Each entry says what the place meant in its own tradition, then which kind of magister would seek it and for what knowledge.
- Every proposal is a real place, a real work, or a place from a real tradition's legend. A legend is labelled as one. Nothing is invented here.
- No proposal is a place of worship in use today.
- The shape notes say "confirm" where I read the type and not the evaluator.

### Age 1

#### The Pillars of Seth

- Culture and period: Jewish tradition, ancient Near East; told of the time before the Flood. Legendary.
- In its own tradition: Josephus wrote that the children of Seth cut all they knew of the heavens into two pillars, one of brick and one of stone, so that the knowledge would outlast a flood and a fire. The story is about saving knowledge from the end of an age.
- Sought by: The keeper of records, who fears that an age will end and take its knowledge with it. They come to learn what to write down and what to write it on.
- Proposed effect: **When you enter a new age, the technology you are researching is finished.**
- Shape: Existing kind, needs one new option. The `tech` grant exists on completion only. This needs the same grant on the age-entry moment (`ageEntered` is already an announced occasion).
- Site: None.
- Picture: Two tall pillars cut with signs, one of red brick and one of grey stone, standing in water after a flood.
- Note: Kept from the first list. It pays three times in a game, so the figure could become a share of the technology in place of all of it.

#### The Temple of Thoth

- Culture and period: Ancient Egypt; Khemenu (Hermopolis), from the Old Kingdom. Real, now a ruin.
- In its own tradition: Khemenu was the city of Thoth, the god of writing, counting, the moon and magic, and its priests told how the world began there. Egyptian stories speak of a Book of Thoth that held every spell; the book is legendary.
- Sought by: The scribe-priest and the alchemist. They come for the words that give a thing its true name, and for the first book of spells.
- Proposed effect: **This city gains science equal to half of its faith.**
- Shape: Existing shape. `pays` with `where: city` and `basis: share`. Confirm that the pair is live in the register in `docs/yields.md`.
- Site: A city beside fresh water.
- Picture: A hall of papyrus columns at night, an ibis-headed figure writing on a palette, and the moon above the roof.
- Note: This takes the effect proposed for The Emerald Tablet. The temple is the home of the same tradition, and it is a place and not a text.

#### The Oracle Pits of Yin

- Culture and period: Shang China; about 1250 to 1050 BCE. Real.
- In its own tradition: At Yin, the last Shang capital, diviners put questions for the king to his ancestors. They heated ox bones and turtle shells until they cracked, read the cracks, and cut the question and the answer into the bone. The bones were then stored in pits, and they are the oldest Chinese writing we have.
- Sought by: The diviner. They come to learn how to put a question so that the answer can be checked later.
- Proposed effect: **You are dealt one more wager to choose from in each age.**
- Shape: Existing kind, needs one new option. `offerRider` has no wager scope. It needs one. **Depends on wagers.**
- Site: None.
- Picture: A diviner holding a hot bronze point to a turtle shell, cracks spreading, and a pit of stacked shells behind.
- Note: Depends on wagers. Hold it until the wager rework is settled. This takes the effect proposed for The Sibyl's Cave: a question put to the future, with the answer written down and kept.

#### Chavín de Huántar

- Culture and period: Chavín, the Andes; about 1200 to 500 BCE. Real, now a ruin.
- In its own tradition: A temple in a high valley of Peru that drew pilgrims from the coast and the forest. Under it run dark stone galleries with water channels that roar, and at their centre stands the Lanzón, a carved stone god. Priests used shell trumpets and the dark to lead visitors through the rites.
- Sought by: The mystic and the master of rites. They come to learn how sound, water and the dark can change a person who walks through them.
- Proposed effect: **Your rites cost 25% less faith.**
- Shape: Existing kind, needs one new option. `effectAmplifier` has `riteDuration` and no target for the price of a rite. It needs one.
- Site: A city next to a mountain.
- Picture: A narrow stone passage lit by one torch, ending at a tall carved stone with fangs, and a priest with a shell trumpet.
- Note: This takes the effect proposed for The Telesterion of Eleusis: a house of secret rites. Chichen Itza makes rites longer and this makes them cheaper, so the two work together.

### Age 2

#### The Pillars of Hercules

- Culture and period: Phoenician and Greek; classical antiquity. Real place, legendary marker.
- In its own tradition: The two rocks at the Strait of Gibraltar. Phoenician sailors kept a temple of Melqart near them at Gades, and the Greeks said that Hercules set the rocks there to mark the end of the world.
- Sought by: The navigator and the maker of maps. They come to learn what is beyond the last mark on the chart.
- Proposed effect: **Your ships may cross the open ocean.**
- Shape: Existing shape. `grantsAbility` with `oceanGoing`, the door that The Astrolabe opens in age 4.
- Site: A coastal city.
- Picture: Two pillars on two headlands with a banner between them, and one small ship sailing out through the gap.
- Note: Kept from the first list. This opens the ocean two ages early for one empire. I could not judge how much that is worth on each map type without a game run.

#### The Stelae of Aksum

- Culture and period: The Kingdom of Aksum, Ethiopia; third and fourth centuries CE. Real.
- In its own tradition: Aksum was a trading kingdom between Rome and India that struck its own gold coin. Its kings raised single stones up to 33 metres tall over their tombs, each carved as a tower of many floors with a false door at the foot for the dead.
- Sought by: The merchant-magister and the keeper of the royal dead. They come to learn how a kingdom of traders makes its name last in one stone.
- Proposed effect: **+2 gold and +2 faith on every trade route you send to a foreign city.**
- Shape: Existing shape. `pays` with `where: route` and an `admits` test on the crossing (The Champagne Fairs uses the same test for domestic routes).
- Site: None.
- Picture: A field of tall thin stones carved like towers, one fallen and broken, with a caravan passing in front.
- Note: This takes the effect proposed for The Court of Prester John. It is the least arcane of the set: its subject is trade and the royal dead. With six to eight routes it pays 24 to 32 yield a turn.

#### The Academy of Gundeshapur

- Culture and period: Sasanian Persia; third to seventh century CE. Real; its size is disputed.
- In its own tradition: A royal city of the Sasanian kings where Persian, Greek, Syriac and Indian medicine and astronomy met. Tradition gives it a hospital, a library and a school. Historians now think later writers made it larger than it was, but its doctors did serve the first Abbasid caliphs.
- Sought by: The physician and the translator. They come for the medicine of four peoples in one room.
- Proposed effect: **A technology that an empire you have met already knows costs you 15% less research.**
- Shape: Existing kind, needs one new option. A research discount on chosen technologies exists (The Court of Rudolf II). The test "known by an empire you have met" is new.
- Site: None.
- Picture: A courtyard where four scholars in four kinds of dress read from four books at one table, under a Persian arch.
- Note: This takes the effect proposed for The School of Toledo. Gundeshapur did the same work (gathering the learning of other peoples) eight centuries earlier. It serves the empire that is behind in research.

#### The Schools of Taxila

- Culture and period: Gandhara, ancient India; about 500 BCE to 450 CE. Real, now a ruin.
- In its own tradition: Takshashila was a city of teachers. Students came from across India to live in a master's house and learn the Vedas, medicine, law, archery and the reading of signs. Indian tradition names the grammarian Pāṇini, the minister Chanakya and the Buddha's doctor Jīvaka among them.
- Sought by: The student of any art. They come to find the one teacher who knows it best and to live in that teacher's house.
- Proposed effect: **+1 choice in every great person offer.**
- Shape: Existing shape. `offerRider` with `offer: greatPerson`.
- Site: None.
- Picture: A teacher under a tree with students around him, one with a bow and one with a palm-leaf book, and a stupa on the hill behind.
- Note: This takes the effect proposed for Solomon's Temple. A city that tradition credits with so many masters is a good home for a wider choice of great people.

### Age 3

#### Nalanda

- Culture and period: Buddhist India; fifth century to about 1200 CE. Real, now a ruin.
- In its own tradition: A Buddhist monastery in Bihar that became the greatest school in Asia, with thousands of monks and students from China, Korea, Tibet and Java. Tibetan accounts say that its library, the Dharmaganja, had three buildings and that one of them rose nine storeys.
- Sought by: The logician and the monk-scholar. They come to debate at the gate, where a keeper tests each visitor before he lets them in, and to read in the library.
- Proposed effect: **When you recruit a great person, gain +100 science.**
- Shape: Existing kind, needs one new option. `windfallRider` has no occasion for a great person recruited. The moment is already announced (`greatPersonRecruited` in `occasions.ts`), so it needs one new occasion and no new kind.
- Site: None.
- Picture: Rows of red brick courts and cells seen from above, with one tall library tower and monks carrying books.
- Note: This takes the effect proposed for Salomon's House, sized for age 3, where a seat makes about 106 science a turn. Nalanda is a ruin and a museum, not a place of worship today.

#### The Maragheh Observatory

- Culture and period: Ilkhanid Persia; founded 1259. Real, now a ruin.
- In its own tradition: The Mongol ruler Hülegü wanted better star tables for his astrologers, and he paid Naṣīr al-Dīn al-Ṭūsī to build an observatory on a hill at Maragheh. Astronomers came from Syria to China, and its library was said to hold 400,000 books. Its new models of the planets replaced parts of Ptolemy.
- Sought by: The astronomer and the court astrologer. They come for better tables of the planets, and for the geometry that makes them.
- Proposed effect: **This city makes 50% more renown.**
- Shape: Existing shape. `cityRenownPercent`.
- Site: None.
- Picture: A hilltop with a great wall quadrant and brass rings, scholars in Persian and Chinese dress, and a Mongol rider waiting.
- Note: This takes the effect proposed for The Studiolo. It rewards a city that already holds wonders and empire buildings, since each pays renown where it stands.

#### The Hall of Light

- Culture and period: Tang China; built 688 CE. Real, destroyed.
- In its own tradition: The Mingtang was the hall where, in the oldest books, a true ruler matched his acts to the seasons and the stars. Nobody knew its real shape, and scholars argued about it for a thousand years. Empress Wu Zetian built one at Luoyang about 90 metres tall, square below for the earth and round above for heaven. It burned in 695 and she built it again.
- Sought by: The geomancer and the keeper of the calendar. They come to learn the right shape for a hall that joins heaven, earth and the ruler.
- Proposed effect: **When you finish a wonder, gain +120 culture.**
- Shape: Existing shape. `windfallRider` on the `completion` occasion, limited to wonders. Confirm that the rider can filter by category.
- Site: Your capital.
- Picture: A huge hall with a square base and a round upper floor under a gold roof, a phoenix on top, and tiny courtiers below.
- Note: This takes the effect proposed for The Tower of Babel, sized for age 3, where a seat makes about 83 culture a turn. The hall was itself a monument about the right to build monuments.

#### The Brazen Head

- Culture and period: Medieval Latin Europe; told of the tenth to thirteenth centuries. Legendary.
- In its own tradition: A head of brass that could answer any question, said to be the work of Gerbert of Aurillac, of Albertus Magnus or of Roger Bacon. In the best-known story it said "Time is, Time was, Time is past" and broke while its maker slept.
- Sought by: The maker of automata. They come to learn how to build a thing that answers, and how not to sleep through the answer.
- Proposed effect: **Each Order hand you pass counts twice toward rarer cards.**
- Shape: Needs a new shape. New rule: a multiplier on the banked skips that `rarityOdds()` reads (`statecraft/draft.ts`). Small, but no card shape does it today.
- Site: None.
- Picture: A brass head on a workbench with its mouth open, a friar asleep at the table, and an hourglass run out.
- Note: Kept from the first list. Roger Bacon is in the roster. The effect rewards patience in the draft, which fits a head that speaks only once.

### Age 4

#### The Observatory of Ulugh Beg

- Culture and period: Timurid Samarkand, Central Asia; built in the 1420s. Real, now a ruin.
- In its own tradition: Ulugh Beg, grandson of Timur and ruler of Samarkand, was an astronomer first. He built a round observatory of three floors around a stone arc 40 metres in radius, and his school measured 1,018 stars again, the first full new catalogue since Ptolemy. He was murdered in 1449 and the building was torn down.
- Sought by: The astronomer. They come to measure every star again and trust no older book.
- Proposed effect: **On completion, a glass bead is yours.**
- Shape: Existing shape. The `bead` grant on completion, as on Chart the Stars. It needs one new bead row. **Depends on wagers.**
- Site: A city with a University (the "needs standing here" rule).
- Picture: A round tiled building cut open to show a huge curved stone track going down into the rock, with one man taking a sighting.
- Note: This takes the effect proposed for The Vault of Rosenkreuz. A bead is one seventh of the door to the Magnum Opus, so this is a powerful wonder with a condition. The worth of a bead depends on how many the wagers give, so set it after the wager rework.

#### The Libraries of Timbuktu

- Culture and period: Mali and Songhai, West Africa; fifteenth and sixteenth centuries. Real.
- In its own tradition: Timbuktu sat where the Niger meets the desert roads, and its scholar families built private libraries of law, astronomy, medicine and poetry, copied by hand and handed down. The scholar Ahmad Baba owned 1,600 books and said that his was a small collection.
- Sought by: The jurist, the copyist and the collector of books. They come by caravan to buy what no other city has.
- Proposed effect: **+3 science and +3 culture in every city where one of your trade routes ends.**
- Shape: Existing shape. `pays` with `where: city` and the scope `routeEndsHere` (the Bank uses the same scope).
- Site: None.
- Picture: A mud-brick room with open chests of loose-leaf books in leather cases, a scholar reading, and camels at the door.
- Note: New effect. It pays an empire of caravans in knowledge. This is about the family libraries and not the mosques, which are places of worship today.

#### The Stone of the Five Suns

- Culture and period: Mexica (Aztec), Mesoamerica; carved about 1502 to 1520. Real.
- In its own tradition: A basalt disc 3.6 metres wide from the centre of Tenochtitlan. It shows the four worlds that ended before ours, each with its own sun, around the face of the fifth, with the twenty day signs in a ring. It is not a working calendar. Scholars think it was a stage for rites.
- Sought by: The keeper of the calendar and the reader of days. They come to learn how many worlds ended before this one, and on which day this one will.
- Proposed effect: **When you finish a technology, gain +25 faith.**
- Shape: Existing shape. `windfallRider` on the `tech` occasion, with a flat faith grant.
- Site: None.
- Picture: A great carved disc painted red and blue, laid flat on a platform before a twin temple, with a lake city behind.
- Note: New effect. It turns research into faith, the reverse of The Temple of Thoth. A seat makes about 128 faith a turn in age 4, so the figure needs a check against how often a technology falls.

#### The Theatre of Memory

- Culture and period: Renaissance Italy and France; the 1530s. Real, never finished.
- In its own tradition: Giulio Camillo built a wooden theatre for the King of France. A person on its stage was meant to see all knowledge set out in seven rising rows under the seven planets.
- Sought by: The master of memory. They come to hold all knowledge in the mind at one time, each thing in its place.
- Proposed effect: **Your Orders are sealed for 2 turns in place of 5.**
- Shape: Existing shape. `metaRule` with the rule `sealTurns`. Two Orders already use it.
- Site: None.
- Picture: A small wooden half-circle of seven steps covered in painted signs, with one man on the stage looking up at it.
- Note: Kept from the first list. It lets a seat change its council for each new plan, which is worth most with 8 to 11 chairs.

### The whole set by culture area and age

- Proposed wonders are in bold.

| Culture area | Age 1 | Age 2 | Age 3 | Age 4 | Now | Proposed |
|---|---|---|---|---|---|---|
| Europe and Greco-Roman | The Temple of Artemis; Stonehenge; The Great Lighthouse; The Oracle | The Mausoleum; The Theatre of Dionysus; The Colossus; **The Pillars of Hercules** | The Great Library; The Statue of Zeus; Hagia Sophia; The Circus Maximus; **The Brazen Head** | Notre-Dame; **The Theatre of Memory** | 12 | 3 |
| Ancient Near East | The Hanging Gardens; The Walls of Uruk; The Great Ziggurat; **The Pillars of Seth** |   | Petra |   | 4 | 1 |
| Egypt and Africa | The Pyramids; **The Temple of Thoth** | **The Stelae of Aksum** | The Great Mosque of Djenné | **The Libraries of Timbuktu** | 2 | 3 |
| Islamic world |   |   |   | The House of Wisdom; The Alhambra | 2 | 0 |
| Persia and Central Asia |   | **The Academy of Gundeshapur** | **The Maragheh Observatory** | **The Observatory of Ulugh Beg** | 0 | 3 |
| India |   | **The Schools of Taxila** | **Nalanda** |   | 0 | 2 |
| China and East Asia | **The Oracle Pits of Yin** |   | The Terracotta Army; The Forbidden City; The Great Wall; The Water Clock of Su Song; **The Hall of Light** |   | 4 | 2 |
| Southeast Asia |   |   | Angkor Wat |   | 1 | 0 |
| Mesoamerica and the Andes | **Chavín de Huántar** |   | Chichen Itza | Machu Picchu; **The Stone of the Five Suns** | 2 | 2 |

- The Great Lighthouse and The Great Library stood in Egypt and were Greek works, so they are counted as Greco-Roman. The Temple of Artemis and The Mausoleum stood in Anatolia and are counted the same way.
- The Libraries of Timbuktu, The Maragheh Observatory and The Observatory of Ulugh Beg also belong to the Islamic world. They are counted once, under their region.
- Southeast Asia has no proposal. Angkor Wat is there now. The best candidate for the theme, Borobudur, is a place of Buddhist worship today, so I left it out.
- Today 12 of the 27 wonders are European or Greco-Roman. With the 16 proposals the count is 15 of 43.

### Dropped from the first list

| Proposal | Why it was dropped, and where its effect went |
|---|---|
| The Tower of Babel | It is the same tower as The Great Ziggurat, which the game has. Its effect went to The Hall of Light. |
| Solomon's Temple | The Temple Mount is holy ground to three living faiths. Its effect went to The Schools of Taxila. |
| The Emerald Tablet | A text and not a place. Its effect went to The Temple of Thoth, the home of the same tradition. |
| The Sibyl's Cave | Greco-Roman, and age 2 keeps one such wonder. Its effect went to The Oracle Pits of Yin. |
| The Telesterion of Eleusis | Greco-Roman, for the same reason. Its effect went to Chavín de Huántar. |
| The Court of Prester John | A legend told in Europe about a king in Africa or Asia. Its effect went to The Stelae of Aksum, the real kingdom that the legend was later tied to. |
| The School of Toledo | Age 3 keeps one European wonder, The Brazen Head. Its effect went to The Academy of Gundeshapur. |
| Salomon's House | European, and age 4 keeps The Theatre of Memory. Its effect went to Nalanda. |
| The Studiolo | European, for the same reason. Its effect went to The Maragheh Observatory. |
| The Vault of Rosenkreuz | European, for the same reason. Its effect went to The Observatory of Ulugh Beg. |

## What I could not determine

- How much a free technology is worth in turns at each column. I did not read the price table.
- The worth of one point of happiness and one point of authority capacity in yield. Verdicts on Notre-Dame, The Circus Maximus and The Forbidden City rest on comparison with buildings, not on a figure.
- How The Great Wall and The Walls of Uruk play. Both need a game run.
- Whether each "existing shape" in part 3 is read by the evaluator in exactly the form proposed. The notes name the kind to check.

## Rebuild

- The script that printed the game text and the script that built this file and the review page are in the session scratchpad (`wonders/dump.ts`, `wonders/build.mjs`). They are not in the repo.
## The user's comments on the page (2026-11-19)

The user commented on the review page and said: "ok commented, i think we
need more age 2 wonders. assume that i've rejected all non-commented proposed
wonders". The comments below are the user's words. They are the spec. Where a
comment is anchored on one clause, it changes that clause; where it is anchored
on the wonder's head, it speaks of the whole wonder.

### Proposed wonders: four accepted, twelve rejected

| Proposal | The user's comment |
|---|---|
| The Schools of Taxila | "i like the gameplay effect, lets call it solomon's temple." and "add: -10% renown to unlock great people." |
| The Stelae of Aksum | "rename: the great stelae of Aksum. revise: +2 culture and +2 faith on every trade route." |
| The Oracle Pits of Yin | "+1 culture on buildings that supply faith. +5 free rerolls on drafts." and "not sure where to unlock." |
| The Temple of Thoth | "Add. unlocked at divination?" |

Rejected (no comment): The Pillars of Seth, Chavín de Huántar, The Pillars of
Hercules, The Academy of Gundeshapur, Nalanda, The Maragheh Observatory, The
Hall of Light, The Brazen Head, The Observatory of Ulugh Beg, The Libraries of
Timbuktu, The Stone of the Five Suns, The Theatre of Memory.

**More age 2 wonders are wanted.**

### Existing wonders

| Wonder | Anchored on | The user's comment |
|---|---|---|
| The Temple of Artemis | the whole effect list | "Revise: +2 happiness." |
| The Oracle | "+1 faith in every city with The Oracle" | "remove +1 faith in every cit with the oracle. +3 renown (no type)" |
| The Pyramids | "+2 production" | "remove +2 production, add: +20% production towards wonders in all cities." |
| The Walls of Uruk | the cost line | "change: +10 city defence in the city it's built, not the capital. Remove +4 combat strength in your capitals borders, change to +2 combat strength in your own territory. Remove +2 culture" |
| The Great Ziggurat | the wonder | "+2 science in every city with a shrine. remove religious units cost -25%" and "add: rites are 30% cheaper to purchase in this city" |
| The Mausoleum | the wonder | "rework: great people improvement yields are doubled (applies after all other bonuses). +5 renown towards engineers." |
| The Great Lighthouse | the head | "revise: +1 gold on fishing boats, +3 combat strength and +1 movement for naval units" |
| The Great Library | "+1 science in every city with a Library" | "Revise: +8 science, your academies gain +2 science for every great scholar you've earned this game. On completion, receive a great scholar" |
| The Statue of Zeus | "+15% combat strength for all units against cities" | "revise: +4 combat strength for all units against cities. On completion, receive 3 melee units." |
| Petra | "+1 food, +1 production on every desert hex, in every city with Petra" | "+1 food and +1 production on all desert hexes. +1 gold on all floodplain hexes." |
| The Forbidden City | "+5 authority capacity" | "remove: +2 culture" |
| The Great Wall | "every hex you own exerts zone of control on enemy units…" | "revise: all cities +5 city defense and 25 health. Enemy units -1 movement while they're in your territory" |
| Angkor Wat | "+1 faith per 2 hexes worked here" | "+1 faith on all improved resource tiles. +3 faith on holy sites" |
| Chichen Itza | "+1 happiness" | "revise: rites last +50% longer. cities with an active rite gain +2 happiness and +20% culture." |
| The Circus Maximus | the head | "+1 happiness per military building" |
| The Water Clock of Su Song | the head | "Remove" |
| Machu Picchu | "+25% gold in every city with Machu Picchu" | "revise: +2 trade routes. +1 gold on tiles for each adjacent mountain" |
| Notre-Dame | "+1 happiness per Temple" | "+1 happiness on all buildings that supply faith" |
| The Alhambra | the head | "+10 culture, gain a military slot and a great general." |

A wonder with no comment stays as it is.

## The set after the user's comments

- This is the sheet for the build. It follows the comments above. Where a comment can be read two ways, the sheet takes my recommended reading and names the question.
- "Kept" and "removed" lines are today's Compendium text. "Added" lines are the user's words, put in the game's card wording.
- I checked each shape against the types and the evaluator (`grep -a`). I ran no test.
- 38 new or changed clauses: 31 use an existing shape, 5 need a small extension, 2 need a new shape.
- Not an existing shape:
  - (small extension) "on completion, 5 free rerolls of a draft are yours". A reroll for faith exists (`rerollOffer`), and a belief hand already has one free reroll. A stock of free rerolls on the player, and a grant that fills it, are new.
  - (small extension) "rites cost 30% less faith in this city". The rule `riteCost` exists (`religion.ts` 1506) and is read for the empire. It needs the city the rite is started in.
  - (new shape) "the yields of your great people's improvements are doubled". The hex test `greatWork` exists. A line that pays a hex's whole yield again does not: a new option in `explainTileYield`, placed last.
  - (small extension) "your Academies gain +2 science for each great scholar you have recruited". `pays` hex with a count is in the register. A count of great people by family exists for combat lines (`greatPeopleOfFamily`); the pay counts need it.
  - (small extension) "every city can take +25 more punishment". City hit points are a row field for the row's own city (`cityHp`). `cityStat` has `defense` and `sight` only; it needs a third stat.
  - (new shape) "enemy units in your territory have -1 movement". No rule changes an enemy's movement. A new rule read in `resetMovement`, with the tile owner field.
  - (small extension) "you have one more Military chair". `slotRider` opens Wildcard chairs only. Its own note says that a typed chair "earns its own field".
- The lines for renown are left out where they do not change.

### New wonders (4)

#### Solomon's Temple

- Proposed as: The Schools of Taxila.
- Age 2. Opens with: The High Temple (age 2, column 5): no wonder opens there today, and it is the technology of the Temple. Cost at that column: 382 production. Site: None.
- Base yields: +2 faith and +2 culture a turn (my suggestion; the user gave none).
- Added: **+1 choice in every great person offer** (existing shape). `offerRider` with `offer: greatPerson`; the arm is at `evaluator.ts` 13169.
- Added: **great people cost 10% less renown** (existing shape). `rulePercent` with rule `greatPersonCost`; read in `renown.ts` 386.
- Note: The Temple Mount is holy ground to living faiths, which is why I had moved the effect to another name. The user chose the name, and the game's frame is fantasy.

#### The Great Stelae of Aksum

- Proposed as: The Stelae of Aksum.
- Age 2. Opens with: Code of Laws (age 2, column 5): no wonder opens there today. It comes one column after Currency, which opens the Trader. Cost at that column: 382 production. Site: None.
- Base yields: +2 gold a turn (my suggestion).
- Added: **+2 culture, +2 faith on every trade route** (existing shape). `pays` with `where: route`, flat. The word "foreign" is gone, so no `crossing` test.

#### The Oracle Pits of Yin

- Age 2. Opens with: Chronology (age 2, column 4): no wonder opens there today (only Chart the Stars, an empire building). The oracle bones carry the oldest written day count in China. This also gives age 2 one more wonder. Cost at that column: 292 production. Site: None.
- Base yields: +2 faith a turn (my suggestion).
- Added: **+1 culture for each building that supplies faith** (existing shape). `pays` with `basis: count` and the count `buildingsSupplying` (faith); the arm is at `evaluator.ts` 3656.
- Added: **on completion, 5 free rerolls of a draft are yours** (small extension). A reroll for faith exists (`rerollOffer`), and a belief hand already has one free reroll. A stock of free rerolls on the player, and a grant that fills it, are new.
- Open: question 18.
- Note: The new effect replaces the wager effect, so this wonder no longer depends on wagers.

#### The Temple of Thoth

- Age 1. Opens with: Divination (age 1, column 2), as the user suggests. The Oracle opens there too. The other choice is Writing, beside The Great Ziggurat. No free age 1 technology fits (Fletching, Mining, Pottery, The Wheel), so I recommend Divination. Cost at that column: 170 production. Site: A city beside fresh water.
- Base yields: +2 faith a turn (my suggestion).
- Added: **this city gains science equal to half of its faith** (existing shape). `pays` with `where: city` and `basis: share`; the pair is in the register in `docs/yields.md` (step 10).

### Revised wonders (19)

#### The Temple of Artemis

- Age 1, Husbandry, column 1, 130 production. Site: none.
- Kept: +2 food, +1 faith
- Kept: +1 food on every hex with a Camp
- Kept: +1 food on every hex with a Pasture
- Removed: ~~+1 happiness per improved bonus resource in this city (at most +4 happiness)~~
- Added: **+2 happiness** (existing shape). The row field `happiness`.
- Open: question 1.

#### The Oracle

- Age 1, Divination, column 2, 170 production. Site: none.
- Kept: +2 culture, +2 faith
- Kept: +1 card in every Order hand
- Kept: +1 card in every Doctrine draft
- Removed: ~~+1 faith in every city with The Oracle~~
- Added: **+3 renown per turn (no kind of great person favoured)** (existing shape). The card kind `renown` carries no family. It replaces the row's `renown.perTurn` of 2.
- Open: question 2.

#### The Pyramids

- Age 1, Stonecraft, column 2, 170 production. Site: none.
- Kept: newly created workers gain +1 charge
- Removed: ~~+2 production~~
- Added: **+20% production toward wonders in every city** (existing shape). `productionBonus` with `category: wonder` (the Workshop has it); read at `evaluator.ts` 7415.

#### The Walls of Uruk

- Age 1, Bronzeworking, column 2, 170 production. Site: none.
- Kept: +2 authority capacity
- Kept: +50 to how much punishment the city can take
- Removed: ~~+2 culture~~
- Removed: ~~your capital: +10 city defence~~
- Removed: ~~+4 combat strength inside your capital’s borders~~
- Added: **this city: +10 city defence** (existing shape). `cityStat` `defense` with no scope, as The Great Wall has today.
- Added: **+2 combat strength in your own territory** (existing shape). `combatLine` with `ownTerritory`; arms at `evaluator.ts` 7602 and 8544.
- Open: question 3.

#### The Great Ziggurat

- Age 1, Writing, column 3, 223 production. Site: none.
- Kept: +2 science, +2 faith
- Removed: ~~religious units cost −25% to buy~~
- Removed: ~~+1 science in every city with a Shrine~~
- Added: **+2 science in every city with a Shrine** (existing shape). `pays` city, scope `hasBuilding`; the figure changes.
- Added: **rites cost 30% less faith in this city** (small extension). The rule `riteCost` exists (`religion.ts` 1506) and is read for the empire. It needs the city the rite is started in.
- Open: question 4.

#### The Mausoleum

- Age 2, Currency, column 4, 292 production. Site: none.
- Removed: ~~+2 gold~~
- Removed: ~~+1 gold per building in this city~~
- Removed: ~~+1 gold on every hex with a Quarry~~
- Removed: ~~+2 authority capacity~~
- Added: **the yields of your great people's improvements are doubled** (new shape). The hex test `greatWork` exists. A line that pays a hex's whole yield again does not: a new option in `explainTileYield`, placed last.
- Added: **+5 renown per turn, favouring engineers** (existing shape). The row's `renown` (family and figure change).
- Open: question 5, 6.

#### The Great Lighthouse

- Age 1, Sailing, column 2, 170 production. Site: a coastal city.
- Kept: +2 gold
- Kept: +1 gold on every hex with a Fishing Boat
- Removed: ~~all units: +1 movement while embarked~~
- Removed: ~~every coastal city: +1 city sight~~
- Removed: ~~+1 trade route~~
- Added: **naval units: +3 combat strength** (existing shape). `combatLine` with a `class` filter on the naval category.
- Added: **naval units: +1 movement** (existing shape). `unitStat` `movement` with the same filter (Chart the Stars has it).
- Open: question 7.
- Note: The row's design note about the trade route leaves with the clause.

#### The Great Library

- Age 3, Rhetoric, column 6, 501 production. Site: none.
- Removed: ~~+3 science~~
- Removed: ~~+1 science in every city with a Library~~
- Removed: ~~on completion, the technology you are researching is finished~~
- Added: **+8 science** (existing shape). The row field `science`.
- Added: **your Academies gain +2 science for each great scholar you have recruited** (small extension). `pays` hex with a count is in the register. A count of great people by family exists for combat lines (`greatPeopleOfFamily`); the pay counts need it.
- Added: **on completion, a great scholar joins you** (existing shape). The `greatPerson` grant with `family: scholar` (The Turning Heavens has it).
- Open: question 8.
- Note: `docs/wonders.md` lists "a wonder granting a great person directly" as refused. This ruling and The Alhambra's replace that line.

#### The Statue of Zeus

- Age 3, Iron Working, column 6, 501 production. Site: none.
- Kept: +1 culture
- Removed: ~~+15% combat strength for all units against cities~~
- Removed: ~~on completion, the best melee unit you can build joins you~~
- Added: **+4 combat strength for all units against cities** (existing shape). `combatLine` with `vsCity`.
- Added: **on completion, 3 of the best melee unit you can build join you** (existing shape). The `unit` grant with `bestMelee`, listed three times.
- Open: question 9.

#### Petra

- Age 3, Mathematics, column 7, 657 production. Site: a city built on or next to desert.
- Kept: +2 gold
- Removed: ~~+1 food, +1 production on every desert hex, in every city with Petra~~
- Removed: ~~+1 gold on every floodplain hex, in every city with Petra~~
- Added: **+1 food, +1 production on every desert hex** (existing shape). The same `pays` hex line with its `scope` removed.
- Added: **+1 gold on every floodplain hex** (existing shape). The same.
- Open: question 10.

#### The Forbidden City

- Age 3, Satrapies, column 7, 657 production. Site: none.
- Kept: you have one more wildcard chair
- Kept: +5 authority capacity
- Removed: ~~+2 culture~~

#### The Great Wall

- Age 3, Satrapies, column 7, 657 production. Site: none.
- Kept: +2 production
- Removed: ~~every hex you own exerts zone of control on enemy units, as a unit of yours would~~
- Removed: ~~this city: +10 city defence~~
- Removed: ~~+25 to how much punishment the city can take~~
- Added: **every city: +5 city defence** (existing shape). `cityStat` `defense` with the scope `always`.
- Added: **every city can take +25 more punishment** (small extension). City hit points are a row field for the row's own city (`cityHp`). `cityStat` has `defense` and `sight` only; it needs a third stat.
- Added: **enemy units in your territory have -1 movement** (new shape). No rule changes an enemy's movement. A new rule read in `resetMovement`, with the tile owner field.
- Open: question 11.
- Note: The `borders` rule then has no row that uses it.

#### Angkor Wat

- Age 3, Theology, column 8, 860 production. Site: none.
- Kept: +2 faith
- Kept: a hex costs 25% less to buy
- Removed: ~~+1 faith per 2 hexes worked here~~
- Added: **+1 faith on every improved hex with a resource** (existing shape). `pays` hex with the tests `improved` and `hasResource`.
- Added: **+3 faith on every Holy Site** (existing shape). `pays` hex with `improvement: holySite` (a founder belief has the same line).
- Open: question 12.

#### Chichen Itza

- Age 3, Theology, column 8, 860 production. Site: none.
- Kept: +2 culture, +2 faith
- Kept: rites last +50% longer
- Removed: ~~+1 happiness~~
- Added: **cities keeping a rite gain +2 happiness** (existing shape). `happiness` for each city with the scope `keepingRite` (Devotion cards have it).
- Added: **cities keeping a rite gain +20% culture** (existing shape). `percentYields` with the scope `keepingRite`.
- Open: question 13.

#### The Circus Maximus

- Age 3, Engineering, column 8, 860 production. Site: none.
- Kept: +4 happiness
- Removed: ~~+1 happiness per Barracks~~
- Added: **+1 happiness for each military building** (existing shape). `pays` empire, count `buildingsOfCategory` (military), to happiness. Confirm that the count leaves out wonders.
- Open: question 14.

#### The Water Clock of Su Song: removed

- Age 3, Horology, column 8, 860 production. Site: none.
- The whole wonder leaves the game. See question 19.

#### Machu Picchu

- Age 4, Natural Philosophy, column 10, 1477 production. Site: a city next to a mountain.
- Kept: +2 gold
- Removed: ~~+25% gold in every city with Machu Picchu~~
- Added: **+2 trade routes for your empire** (existing shape). The row field `routeSlots`.
- Added: **+1 gold on every hex here for each mountain beside it** (existing shape). `pays` hex, flat, with `perAdjacentMountain` (in the register in `docs/yields.md`), scoped to this city.
- Open: question 15.

#### Notre-Dame

- Age 4, The Holy Office, column 11, 1934 production. Site: none.
- Kept: +2 culture
- Kept: +3 culture and +1 happiness in every city with a Cathedral
- Removed: ~~+1 happiness per Temple~~
- Added: **+1 happiness for each building that supplies faith** (existing shape). `pays` empire, count `buildingsSupplying` (faith), to happiness.
- Open: question 16.

#### The Alhambra

- Age 4, Militant Orders, column 11, 1934 production. Site: none.
- Removed: ~~+3 culture~~
- Removed: ~~+4 combat strength for mounted units~~
- Removed: ~~+1 happiness~~
- Removed: ~~units raised here begin dug in, as if they had already fortified — not built yet~~
- Added: **+10 culture** (existing shape). The row field `culture`.
- Added: **you have one more Military chair** (small extension). `slotRider` opens Wildcard chairs only. Its own note says that a typed chair "earns its own field".
- Added: **on completion, a great general joins you** (existing shape). The `greatPerson` grant with `family: general`.
- Open: question 17.
- Note: The deferred clause and its row note leave.

### Unchanged wonders (8)

- Stonehenge, The Hanging Gardens, The Theatre of Dionysus, The Colossus, The Terracotta Army, Hagia Sophia, The Great Mosque of Djenné, The House of Wisdom.

### Where each wonder opens on the tree

- `docs/wonders.md` asks for one wonder for each technology where possible. Four sit on Theology today.

| Wonder | Today | Suggested | Why |
|---|---|---|---|
| The Temple of Thoth | new | Divination (age 1) | The user's suggestion. It shares the technology with The Oracle. |
| The Oracle Pits of Yin | new | Chronology (age 2) | No wonder there today. |
| Solomon's Temple | new | The High Temple (age 2) | No wonder there today. |
| The Great Stelae of Aksum | new | Code of Laws (age 2) | No wonder there today. |
| Chichen Itza | Theology | Horology (age 3, same column and cost) | Horology is empty when The Water Clock leaves, and the pyramid is a calendar. |
| The Great Mosque of Djenné | Theology | Guildhalls (age 3, same column and cost) | The masons' guild of Djenné rebuilds the mosque each year. |
| Angkor Wat | Theology | State Workforce (age 3, column 6; cost falls from 860 to 501) | A temple city built by organised labour. |
| Hagia Sophia | Theology | stays | Theology then opens one wonder. |
| The Great Wall | Satrapies | The Civil Service (age 3, same column and cost) | Satrapies keeps The Forbidden City. |
| The Pyramids | Stonecraft | Mining (age 1, column 1; cost falls from 170 to 130) | Stonecraft keeps Stonehenge. |
| The Statue of Zeus | Iron Working | Bronze Panoply (age 2, column 4; cost falls from 501 to 292) | Optional. It gives age 2 a war wonder, and Iron Working keeps The Terracotta Army. Three free units are worth more in age 2. |
| Petra | Mathematics | Irrigation (age 2, column 5; cost falls from 657 to 382) | Recommended. See the age 2 section. |

### Open questions, with the reading the sheet takes

1. **The Temple of Artemis.** The comment "+2 happiness" sits on the whole effect list. Does it replace every effect, or only the happiness clause?
   - Recommended, and taken in the sheet: Only the happiness clause. The wonder keeps its food and faith and gives a flat +2 happiness in place of "+1 for each improved bonus resource, at most +4".
2. **The Oracle.** "+3 renown (no type)": is this for each turn, and does it replace the +2 renown a turn toward scholars?
   - Recommended, and taken in the sheet: +3 renown a turn that favours no kind of great person, in place of the +2 toward scholars. The +10 on completion stays.
3. **The Walls of Uruk.** Does "+2 combat strength in your own territory" count when your units attack and when they defend?
   - Recommended, and taken in the sheet: Both, as the clause it replaces does today.
4. **The Great Ziggurat.** A rite has one price for the whole empire, and the price rises with each rite. What does "30% cheaper in this city" reach?
   - Recommended, and taken in the sheet: A rite started in the city that holds the Ziggurat costs 30% less. Rites started in other cities pay the full price.
5. **The Mausoleum.** "Rework": do all of today's clauses leave (the gold for each building, the quarry gold, +2 gold, +2 authority capacity)? And how does "doubled, after all other bonuses" sit with the rule that percentages work at two stages only?
   - Recommended, and taken in the sheet: All of today's clauses leave. The doubling is the last line on the hex itself: the hex's whole yield (its base and every flat bonus on it) is paid again. That happens before the city's and the empire's percentages, so the two-stage rule stays whole. It reaches every great person improvement you own, the Holy Site and the Citadel included.
6. **The Mausoleum.** "+5 renown towards engineers": for each turn?
   - Recommended, and taken in the sheet: Yes: +5 a turn toward engineers, in place of +1 a turn toward merchants.
7. **The Great Lighthouse.** The new list has no trade route, no city sight and no base gold. Do all three leave? Does "naval units" mean ships only?
   - Recommended, and taken in the sheet: The trade route and the sight leave, as does the movement for embarked land units. The base +2 gold stays, since the comment lists effects and not base yields. "Naval units" means ships.
8. **The Great Library.** Does the free technology on completion stay beside the new free great scholar?
   - Recommended, and taken in the sheet: No. The comment starts with "Revise" and gives a full list, so the scholar replaces the technology. The House of Wisdom keeps the free technology.
9. **The Statue of Zeus.** "3 melee units": the best melee unit you can build, three times?
   - Recommended, and taken in the sheet: Yes. Today it gives one. A unit that finds no free hex beside the city is not placed, as today.
10. **Petra.** "All desert hexes": in every city of yours, or in Petra's city?
   - Recommended, and taken in the sheet: Every city. The words "in every city with Petra" leave both clauses. The site rule (on or next to desert) stays.
11. **The Great Wall.** "25 health": more hit points for a city, or healing? And how does "-1 movement" work?
   - Recommended, and taken in the sheet: Every city of yours can take 25 more damage. An enemy unit that starts its turn in your territory has 1 less movement that turn, and never less than 1. Today's zone of control rule and the two lines for its own city leave.
12. **Angkor Wat.** Which hexes, and what is a holy site? Does "a hex costs 25% less to buy" stay?
   - Recommended, and taken in the sheet: Every improved hex with a resource, in every city. A holy site is the Holy Site improvement that a great prophet makes. The cheaper hexes stay, because the comment sits on the faith clause only. Say so if you want that clause to leave too.
13. **Chichen Itza.** "Cities with an active rite": every city of yours, or this city?
   - Recommended, and taken in the sheet: Every city of yours that keeps a rite. The flat +1 happiness leaves.
14. **The Circus Maximus.** Does the flat +4 happiness stay? Which buildings are military?
   - Recommended, and taken in the sheet: The +4 stays. A military building is any building of the military category that is not a wonder: Barracks, Stable, Palisade, Stone Walls, Armoury, Shipyard, Castle, War Hall and the charter ones. A wide empire could gain 20 to 30 happiness from this, so it may need a limit after a playtest.
15. **Machu Picchu.** "+2 trade routes" and "+1 gold on tiles for each adjacent mountain": which tiles?
   - Recommended, and taken in the sheet: Two more trade routes for the empire. Each hex that this city works gains +1 gold for each mountain beside it. In every city it would be very large on a mountain map.
16. **Notre-Dame.** The new clause replaces "+1 happiness per Temple". Does the Cathedral clause stay, so that a Cathedral counts twice?
   - Recommended, and taken in the sheet: Yes, it stays. The comment sits on the Temple clause only.
17. **The Alhambra.** "+10 culture": each turn or once? "A military slot": a chair of the Military type?
   - Recommended, and taken in the sheet: +10 culture a turn, as the base yield (it is +3 today). One more chair that takes Military cards. A great general joins you on completion. All of today's clauses leave.
18. **The Oracle Pits of Yin.** "+5 free rerolls on drafts": a stock of five, or five in each age?
   - Recommended, and taken in the sheet: A stock of five, given once on completion. A free reroll costs no faith and does not raise the price of the next one. It works on any draft that faith can reroll today.
19. **The Water Clock of Su Song.** What does "Remove" mean for a saved game?
   - Recommended, and taken in the sheet: The row stays in the data with `retired: true`, as the twelve withdrawn buildings do, and Horology stops offering it. A save that already holds one keeps it. The wager "The Wonder of the Age" then counts 11 wonders in age 3, which changes nothing.

## More age 2 wonders: candidates

- The user: "i think we need more age 2 wonders". Pick three or four.
- Age 2 has nine technologies. Three open a wonder today (Epic Poetry, Currency, Wayfinding). The three accepted wonders I place in age 2 take Chronology, Code of Laws and The High Temple. That leaves three free: Irrigation, Bronze Panoply and Siegecraft.
- The first three candidates sit on the free technologies. The other four share a technology with a wonder. If you pick one of those, a wonder on that technology should move.
- Each candidate has two short clauses on one subject, made of pieces the game already has. All seven use existing shapes.
- None is European or Greco-Roman. Two are from legend and are labelled: Mount Penglai (mythical) and The City of Brass (legendary). No rejected name returns.
- Sizes use the bot figures in the power bar: a seat in age 2 has 4 to 6 towns and makes about 225 yield a turn, and a regular card pays 15 to 25.

### The Pyramid of the Sun

- Culture and period: Teotihuacan, Mesoamerica; about 200 CE. Real.
- In its own tradition: The largest building of Teotihuacan, a city of perhaps 100,000 people laid out on one sacred line. A cave runs under the pyramid. Centuries later the Mexica held that the gods had made the sun at this place.
- Sought by: The city planner and the priest of the sun. They come to learn how a whole city is set to the sky.
- Opens with: Irrigation (free).
- Effect: **+2 faith in every city of 6 or more citizens. +1 happiness in every city of 6 or more citizens.**
- Shape: existing shape. `pays` city and `happiness`, both with the scope `populationAtLeast`.
- Size: With four such cities in age 2: 8 faith and 4 happiness a turn. A seat makes about 14 faith a turn in age 2.

### The Iron Pillar

- Culture and period: Gupta India; about 400 CE. Real.
- In its own tradition: A pillar of wrought iron seven metres tall, raised as a standard of Vishnu for a Gupta king. It has stood in the open for sixteen centuries and has not rusted. It now stands in a monument in Delhi and is not a place of worship.
- Sought by: The smith and the alchemist of metals. They come to learn how iron can be made that does not decay.
- Opens with: Bronze Panoply (free).
- Effect: **+2 production in every city with a Smithy. +15% production toward units in every city with a Smithy.**
- Shape: existing shape. `pays` city and `productionBonus`, both with the scope `hasBuilding` (smithy).
- Size: With five Smithies: 10 production a turn, where a seat makes about 48, and faster units.

### The Fire of Adur Gushnasp

- Culture and period: Sasanian Persia; fifth century CE. Real, now a ruin.
- In its own tradition: One of the three great fires of the Zoroastrian kings, kept on a hill beside a deep lake. It was the fire of the warriors, and a new king walked there on foot after he was crowned. The fire went out long ago and the site is a ruin.
- Sought by: The keeper of the flame and the captain. They come for the rite that makes a soldier's oath hold.
- Opens with: Siegecraft (free).
- Effect: **+2 faith in every garrisoned city. garrisoned cities gain +5 city defence.**
- Shape: existing shape. `pays` city and `cityStat` `defense`, both with the scope `garrisoned`.
- Size: With five garrisons: 10 faith a turn and stronger walls. It pays an empire for holding its towns.

### The Library of Ashurbanipal

- Culture and period: Assyria, ancient Near East; seventh century BCE. Real.
- In its own tradition: King Ashurbanipal of Assyria sent men to every temple in Babylonia to copy or seize their tablets. Most of what he gathered at Nineveh was omen lists, star records and spells, because the king wanted to read the signs himself.
- Sought by: The reader of omens. They come for ten thousand recorded signs and what followed each one.
- Opens with: Code of Laws or Chronology (shared with an accepted wonder).
- Effect: **+1 science and +1 culture in every city with a Library. +3 renown per turn, favouring scholars.**
- Shape: existing shape. `pays` city with the scope `hasBuilding` (library), and the row's `renown`.
- Size: With five Libraries: 5 science and 5 culture a turn, where a seat makes about 30 and 25.

### The Zodiac of Dendera

- Culture and period: Ptolemaic Egypt; about 50 BCE. Real.
- In its own tradition: A round map of the sky cut into the ceiling of a chapel in the temple of Hathor. It joins the Egyptian star gods to the twelve signs of Babylon and Greece, and marks two eclipses that date it.
- Sought by: The astrologer. They come to see three peoples' skies drawn as one.
- Opens with: The High Temple (shared with Solomon's Temple).
- Effect: **+2 science in every city with a Temple. this city gains +10% science while it keeps a rite.**
- Shape: existing shape. `pays` city with `hasBuilding` (temple), and `percentYields` with the scopes `hasBuilding` and `keepingRite` together.
- Size: With four Temples: 8 science a turn and more in its own city. It overlaps The Great Ziggurat (science from Shrines) in kind.

### Mount Penglai

- Culture and period: Chinese tradition; told from the fourth century BCE. Mythical.
- In its own tradition: An island mountain in the eastern sea where the immortals live and the herb of long life grows. The First Emperor sent Xu Fu with ships to find it in 219 BCE, and the ships did not return.
- Sought by: The alchemist of the elixir. They come for the herb that ends death.
- Opens with: Wayfinding (shared with The Colossus). Site: A coastal city.
- Effect: **+2 food and +1 faith in every coastal city. +1 happiness in every coastal city.**
- Shape: existing shape. `pays` city and `happiness`, both with the scope `coastal`.
- Size: With four coastal cities: 8 food, 4 faith and 4 happiness a turn. A second coastal wonder on the same technology as The Colossus.

### The City of Brass

- Culture and period: Arabic tradition (The Thousand and One Nights); a tale set about 700 CE. Legendary.
- In its own tradition: A tale tells of a caliph's men who cross the desert to find the brass jars in which Solomon sealed the jinn. On the way they come to a silent city with walls of brass, full of treasure, where every person sits dead in their place.
- Sought by: The binder of spirits and the treasure hunter. They come for the sealed jars, and the wise ones take nothing else.
- Opens with: Currency (shared with The Mausoleum).
- Effect: **+2 gold in every city with a Market. +1 happiness for each Market.**
- Shape: existing shape. `pays` city with `hasBuilding` (market), and `pays` empire with the count `buildingsOfKind` to happiness (The Circus Maximus has it).
- Size: With five Markets: 10 gold and 5 happiness a turn, where a seat makes about 19 gold.

### Existing wonders that could move to age 2

- **Petra.** Move it to age 2, on Irrigation. Recommended. With its new effect (every desert hex in every city) it is a wonder for an empire that settled dry land, and that choice is made early. Its cost falls from 657 to 382. If Petra takes Irrigation, The Pyramid of the Sun needs another technology.
- **The Great Library.** Leave it in age 3. Not recommended for age 2. Its new effect (+8 science, a free great scholar, science for each scholar) is sized for age 3: a seat makes about 30 science a turn in age 2, so +8 and an Academy would be more than a quarter of it.
- **The Statue of Zeus.** A possible move to Bronze Panoply (see the technology table). If it moves, The Iron Pillar needs another technology.

## What I could not confirm for the build sheet

- Whether the counts `buildingsOfCategory` and `buildingsSupplying` leave out wonders. The Circus Maximus and Notre-Dame depend on it.
- Whether a row's `renown` may have no family. If it may not, The Oracle's +3 uses the card kind `renown`.
- The exact filter that selects ships for a `combatLine` and a `unitStat`. Chart the Stars prints "ships: +1 movement", so one exists.
- Which drafts faith can reroll today. I read that the command exists and that a belief hand has one free reroll.
- What else reads The Water Clock's row (bots, the great person Su Song, the arena). A search for `waterClockOfSuSong` will show it.
- The base yields of the four new wonders are my suggestions. The user gave none.

## The user's second round of comments (2026-11-19)

The user commented on the rebuilt page and said in chat: "wonders should be
built by people and should be a singular constructed thing with a degree of
notoriety, we can use humankind and civ as sources of inspiration, many of
these dont fit those thematically. I think we have room for 1-2 more age 2
wonders." and, on who builds the set: "lets have astra take it once we make
the determinations."

**The rule for a wonder from now on:** people built it; it is one constructed
thing; it is famous. The games Humankind and Civilization are sources of
ideas. A mythical place, a natural place or a group of things (schools,
libraries of a city) does not fit.

### Age 2 candidates

| Candidate | The user's comment |
|---|---|
| The Pyramid of the Sun | "i like this wonder, lets change the effect, remove previous clauses and replace with: unlocks levy ability, levy one population for faith equal to 5 turns of this city's population. +2 culture on holy sites." |
| The Iron Pillar | "change ability: yields from production buildings +50%. +1 production on strategic resources empire-wide." |
| The Library of Ashurbanipal | "rework: +10 renown towards scholars. Conquered cities yield +5 renown towards scholars, quadrupled for cities with a wonder." |

No comment, so rejected: The Fire of Adur Gushnasp, The Zodiac of Dendera,
Mount Penglai, The City of Brass. One or two more age 2 wonders are wanted,
under the rule above.

On moves: "lets move statue of zeus to bronze panoply. Petra is anachronistic
with age 2 right?"

### Answers to the 19 readings

| # | Wonder | The user's answer | Result |
|---|---|---|---|
| 1 | The Temple of Artemis | "only the happiness clause" | As recommended. |
| 2 | The Oracle | "Yes, +3 per turn, replaces the +2 towards scholars" | As recommended. |
| 3 | The Walls of Uruk | "Yes both" | As recommended. |
| 4 | The Great Ziggurat | "yes" | As recommended. |
| 5 | The Mausoleum | "all of today's clauses leave." | As recommended. |
| 6 | The Mausoleum | "yes" | As recommended. |
| 7 | The Great Lighthouse | "yes" | As recommended. |
| 8 | The Great Library | "no" (to "does the free technology stay?") | The free technology leaves, as recommended. |
| 9 | The Statue of Zeus | "yes" | As recommended. |
| 10 | Petra | "every city" | As recommended. |
| 11 | The Great Wall | "yes" | As recommended. |
| 12 | Angkor Wat | "every city. previous clauses leave" | **Differs:** the cheaper hexes leave too. |
| 13 | Chichen Itza | "every city, flat +1 leaves" | As recommended. |
| 14 | The Circus Maximus | "yes" | As recommended: the +4 stays, and it counts every military building. |
| 15 | Machu Picchu | "every city" | **Differs:** the mountain gold is on hexes of every city. |
| 16 | Notre-Dame | "Remove cathedral clause" | **Differs:** the Cathedral clause leaves. |
| 17 | The Alhambra | "yes" | As recommended. |
| 18 | The Oracle Pits of Yin | "Yes, one time boon of 5 free rerolls" | As recommended. |
| 19 | The Water Clock of Su Song | "yes, remove the wonder as retired" | As recommended. |

## The user's third round (2026-11-19, in chat)

"petra can move to age 2. 5 times the city's citizens. +10 each turn, +5 per
turn in captured cities. Is there a famous building associated with the oracle
pits? maybe just a famous chinese building form the period that had some
religious significance?"

- **Petra** moves to age 2.
- **The Pyramid of the Sun:** the levy pays faith equal to five times the
  city's citizens.
- **The Library of Ashurbanipal:** +10 renown toward scholars each turn. Each
  captured city you hold gives +5 renown toward scholars each turn, four times
  that if the city has a wonder.
- **The Oracle Pits of Yin:** the user wants a famous building in its place,
  if one fits: a Chinese building of the period with religious meaning. The
  effect stays (+1 culture on buildings that supply faith; a one-time stock of
  five free rerolls). Open until the user picks a name.

## More age 2 wonders: five candidates under the new rule

- The rule: people built it, it is one constructed thing, and it is famous. Pick one or two.
- My view: age 2 does not need more. With Petra, The Statue of Zeus and the accepted new wonders, age 2 goes from 3 wonders to 9, one on each of its nine technologies (10 if the Yin wonder stays in age 2). Any pick from this list shares a technology.
- The ages would stand at 9, 9, 10 and 5. Age 4 is now the thin one, so a next round of candidates would do more good there.
- All five are single famous buildings that people built in the period of age 2. Three are wonders in Civilization or Humankind.
- The effects follow the style of your three: two short clauses, tied to walls, conquest, the capital, peace and building categories. All five use existing shapes.

### The Ishtar Gate

- Culture and period: Babylon, ancient Near East; about 575 BCE. A wonder in Humankind.
- What it is: The north gate of Babylon, built for Nebuchadnezzar II in blue glazed brick with rows of bulls and dragons. The king's New Year procession went through it.
- Opens with: Siegecraft (shared with The Iron Pillar).
- Effect: **+3 culture and +5 city defence in every city with walls. on completion, Stone Walls are raised in this city.**
- Shape: existing shape. `pays` city and `cityStat` `defense` with a `hasBuilding` scope; the `building` grant on completion. "Walls" needs one scope for Palisade or Stone Walls (`any`).
- Size: With five walled cities: 15 culture a turn, where a seat makes about 25. It pays an empire for doing what a careful one does anyway.

### The Apadana

- Culture and period: Achaemenid Persia; begun about 518 BCE. A wonder in Civilization VI.
- What it is: The audience hall of Darius at Persepolis: 72 columns twenty metres tall. Its stairs are carved with the peoples of 23 nations who bring their gifts to the king.
- Opens with: Code of Laws (shared).
- Effect: **captured cities gain +4 gold and +2 happiness. +3 authority capacity.**
- Shape: existing shape. `pays` city and `happiness` with the scope `captured`; the row field `authorityCapacity`.
- Size: With three captured cities: 12 gold and 6 happiness a turn, and room for one more town. A seat makes about 19 gold a turn in age 2.

### The Weiyang Palace

- Culture and period: Han China; built 200 BCE. Not in either game. It is the largest palace ever built, and the seat of the Han emperors for two centuries.
- What it is: The "Endless Palace" of Chang'an, raised for the first Han emperor. It covered almost five square kilometres, and the Silk Road was opened from its halls.
- Opens with: Currency or Bronze Panoply (shared).
- Effect: **+25% production toward buildings in your capital. your capital gains +1 culture for each building in it.**
- Shape: existing shape. `productionBonus` with the scope `capital`; `pays` city with the count `buildingsInCity` (The Mausoleum has it today), scoped to the capital.
- Size: A capital with ten buildings: 10 culture a turn and faster buildings. It is a wonder for a tall capital.

### The Great Stupa

- Culture and period: Maurya India; third century BCE. As well known as the games' own: the oldest stone building in India, at Sanchi.
- What it is: A great dome of brick and stone raised by the emperor Ashoka over relics of the Buddha, after his war in Kalinga turned him from conquest. Four carved gates were added later.
- Opens with: The High Temple (shared with Solomon's Temple).
- Effect: **while you are at peace, every city gains +2 faith and +1 happiness. +3 faith on every Holy Site.**
- Shape: existing shape. `pays` city and `happiness` with the scope `atPeace`; `pays` hex with `improvement: holySite`.
- Size: With five cities at peace: 10 faith and 5 happiness a turn. It is the opposite of The Library of Ashurbanipal.
- Note: Sanchi is a protected monument, and Buddhist pilgrims still visit it. Say if you want to leave it out for that reason. India also has The Iron Pillar.

### The Parthenon

- Culture and period: Classical Athens; finished 432 BCE. A wonder in every Civilization game.
- What it is: The temple of Athena on the Acropolis, built with the treasure of Athens' allies. It also held that treasure.
- Opens with: Epic Poetry (shared with The Theatre of Dionysus).
- Effect: **culture buildings produce 50% more of their own yields. +3 renown per turn, favouring artists.**
- Shape: existing shape. `buildingYieldPercent` with `category: culture`; the row's `renown`.
- Size: The culture twin of The Iron Pillar. It would be the thirteenth European or Greco-Roman wonder, so pick it only if fame matters more than spread here.

### The rule, applied to wonders already in the set

- A note only. Nothing is removed. The user decides.
- The Oracle Pits of Yin: pits, not one famous structure. Question 27 gives it a building.
- The Great Stelae of Aksum: a field of stones. "The Great Stela of Aksum" (the single 33-metre stone) would fit the rule.
- The Library of Ashurbanipal: a collection in palace rooms more than a famous building.
- The Terracotta Army: a group of figures. The Walls of Uruk and The Great Wall: long works, not one building.
- Petra, Chichen Itza, Machu Picchu and The Forbidden City: a city or a compound of many buildings.
- The Oracle: a seat of prophecy at Delphi more than one building. The Hanging Gardens: famous, but perhaps legendary.
- Solomon's Temple, The Temple of Thoth, The Pyramid of the Sun and The Iron Pillar are single built things and fit.

## Not ready: open questions

- 4 questions are open. The sheet below takes the recommended reading for each, so it is complete, but a builder must not start until the user answers.

21. **The Pyramid of the Sun.** Which cities may levy for faith: every city of yours, or only the city with the wonder?
   - Recommended, and taken in the sheet: Every city of yours, as a levy Order works. Each city keeps its own wait of 5 turns between levies. A city of 6 citizens gives 30 faith, where a seat makes about 14 faith a turn in age 2.
24. **The Iron Pillar.** Which buildings are "production buildings", and which hexes are "strategic resources"?
   - Recommended, and taken in the sheet: Every building of the production category (the Smithy, the Workshop, the Forge and the like). Every hex of yours that carries a strategic resource you can see, improved or not.
26. **Technologies.** Where do the new and moved wonders open? Only The Statue of Zeus (Bronze Panoply) and Petra (age 2) are ruled.
   - Recommended, and taken in the sheet: Petra on Irrigation: the Nabataeans lived by their cisterns and channels. The Iron Pillar on Siegecraft. The Library of Ashurbanipal on Code of Laws. The Pyramid of the Sun on Chronology. The Great Stelae of Aksum on The Silk Road in age 3. Then each of the nine age 2 technologies opens one wonder. The older suggestions stand: Chichen Itza to Horology, The Great Mosque of Djenné to Guildhalls, Angkor Wat to State Workforce, The Great Wall to The Civil Service, The Pyramids to Mining.
27. **The Oracle Pits of Yin.** Which famous building takes the place of the pits? The options are in the block below.
   - Recommended, and taken in the sheet: The Temple of Heaven, in age 4 on Geomancy. The effect stays as you wrote it.

### Question 27: a building for The Oracle Pits of Yin

- No single famous Shang building survives. At Yinxu, the last Shang capital, there are the rammed-earth foundations of a palace and ancestral temple, and the tomb of Lady Fu Hao. They are real and they are known as a site, not as one building that people can name. The oracle bones made the place famous. So a building with a name has to come from a later age.

| Option | Date | Age | What it was | How famous | What it does to the ages |
|---|---|---|---|---|---|
| **The Temple of Heaven (recommended)** | 1420, Ming Beijing | Age 4 | The round hall and altar where the emperor prayed each year for a good harvest and reported to Heaven. Its plan is a diagram: round for heaven, square for earth, with pillars for the seasons, the months and the hours. | The most famous religious building of China, and a wonder in Civilization IV and V. No rites are held there today. | Age 4 goes from 4 wonders to 5 and age 2 stays at 9. It would open on Geomancy, which no wonder uses. At column 9 it costs 1,127. |
| The Porcelain Tower of Nanjing | 1412 to 1431, Ming Nanjing | Age 4 | A Buddhist pagoda of nine floors, faced with white glazed brick and hung with lamps and bells. It was destroyed in the 1850s. | Travellers called it one of the wonders of the world, and it is a wonder in Civilization V. | The same as The Temple of Heaven for the age counts. |
| The Giant Wild Goose Pagoda | 652, Tang Chang'an | Age 3 | A brick pagoda built to hold the Buddhist books that the monk Xuanzang brought from India. | Very well known in China, less so abroad. It stands in a working Buddhist temple, so it is a place of worship today. | Age 3 goes to 11. |
| The Hall of Light | 688, Tang Luoyang | Age 3 | Empress Wu's great hall for the rites of heaven, the seasons and the calendar. It burned in 695. | Famous in Chinese history, little known abroad. You rejected this name once, with a different effect. | Age 3 goes to 11. |
| Keep The Oracle Pits of Yin | about 1250 to 1050 BCE, Shang | Age 2 (or age 1 by date) | The pits of inscribed bones at the last Shang capital. | A famous find, but not one built thing. | Age 2 goes to 10, and The Pyramid of the Sun shares a technology. |

### What the build does

- The set goes from 27 wonders to 33: 9 in age 1, 9 in age 2, 10 in age 3, 5 in age 4.
- 7 new rows: Solomon's Temple, The Great Stelae of Aksum, The Oracle Pits of Yin (name open), The Temple of Thoth, The Pyramid of the Sun, The Iron Pillar, The Library of Ashurbanipal.
- 18 revised rows. 8 rows do not change.
- 1 row to retire: The Water Clock of Su Song (`waterClockOfSuSong`). Set `retired: true`, keep the row for saves, and take it off Horology.
- 7 rows move to another technology: The Statue of Zeus to Bronze Panoply; Petra to Irrigation; Chichen Itza to Horology; The Great Mosque of Djenné to Guildhalls; Angkor Wat to State Workforce; The Great Wall to The Civil Service; The Pyramids to Mining. The Statue of Zeus and Petra are ruled; the technologies of the others are question 26.
- 44 new or changed clauses: 35 use an existing shape, 7 need a small extension, 2 need a new shape.
- Clauses that are not an existing shape:
  - (small extension) "on completion, 5 free rerolls of a draft are yours". A reroll for faith exists (`rerollOffer`), and a belief hand already has one free reroll. A stock of free rerolls on the player, and a grant that fills it, are new.
  - (small extension) "your cities may spend a citizen for faith: 5 faith for each citizen the city has". The `levy` kind and the levy verb exist (`levies.ts`); its uses are production, muster, opus, conscript, worker, settler, wonder and rite. A `faith` use is new. It shares the town's levy wait (5 turns) and the smallest town (2 citizens). Confirm that `cardLevyGrants` reads a wonder's effects.
  - (small extension) "+5 renown per turn, favouring scholars, for each city you captured; +20 if that city holds a wonder". The card kind `renown` pays for each city, but it has no scope and no family. It needs both (`captured` and `wonderTown` exist as city scopes).
  - (small extension) "rites cost 30% less faith in this city". The rule `riteCost` exists (`religion.ts` 1506) and is read for the empire. It needs the city the rite is started in.
  - (new shape) "the yields of your great people's improvements are doubled". The hex test `greatWork` exists. A line that pays a hex's whole yield again does not: a new option in `explainTileYield`, placed last.
  - (small extension) "your Academies gain +2 science for each great scholar you have recruited". `pays` hex with a count is in the register. A count of great people by family exists for combat lines (`greatPeopleOfFamily`); the pay counts need it.
  - (small extension) "every city can take +25 more punishment". City hit points are a row field for the row's own city (`cityHp`). `cityStat` has `defense` and `sight` only; it needs a third stat.
  - (new shape) "enemy units in your territory have -1 movement". No rule changes an enemy's movement. A new rule read in `resetMovement`, with the tile owner field.
  - (small extension) "you have one more Military chair". `slotRider` opens Wildcard chairs only. Its own note says that a typed chair "earns its own field".
- Every wonder keeps "+10 renown the turn it is finished" and its renown each turn as today, unless a clause below changes it. New wonders need a renown family: scholars for The Temple of Thoth, The Oracle Pits of Yin, Solomon's Temple and The Library of Ashurbanipal; merchants for The Great Stelae of Aksum; engineers for The Iron Pillar; artists for The Pyramid of the Sun (my suggestions).
- The base yields of the seven new wonders are my suggestions. The user gave none.
- Costs are the wonder size at the column: no figure goes on a row.

### Every wonder as it will stand

- "Today" marks a clause that is in the game now and stays. The other clauses are new, with their shape.

#### Age 1 (9)

- **The Pyramids** (revised, moves). Mining, column 1, 130 production. Site: none.
  - Today: newly created workers gain +1 charge
  - New: +20% production toward wonders in every city (existing shape). `productionBonus` with `category: wonder` (the Workshop has it); read at `evaluator.ts` 7415.
- **The Temple of Artemis** (revised). Husbandry, column 1, 130 production. Site: none.
  - Today: +2 food, +1 faith
  - Today: +1 food on every hex with a Camp
  - Today: +1 food on every hex with a Pasture
  - New: +2 happiness (existing shape). The row field `happiness`.
- **Stonehenge** (unchanged). Stonecraft, column 2, 170 production. Site: none.
  - Today: +3 faith
  - Today: +1 pantheon slot
  - Today: +1 faith on every hex carrying Stone or Marble
  - Today: on completion, a god is named, and your faith is not spent
- **The Great Lighthouse** (revised). Sailing, column 2, 170 production. Site: a coastal city.
  - Today: +2 gold
  - Today: +1 gold on every hex with a Fishing Boat
  - New: naval units: +3 combat strength (existing shape). `combatLine` with a `class` filter on the naval category.
  - New: naval units: +1 movement (existing shape). `unitStat` `movement` with the same filter (Chart the Stars has it).
- **The Hanging Gardens** (unchanged). Calendar, column 2, 170 production. Site: none.
  - Today: +3 food
  - Today: +25% food surplus stored toward growth
  - Today: +1 food on every hex with a Farm beside fresh water, in every city with The Hanging Gardens
- **The Oracle** (revised). Divination, column 2, 170 production. Site: none.
  - Today: +2 culture, +2 faith
  - Today: +1 card in every Order hand
  - Today: +1 card in every Doctrine draft
  - New: +3 renown per turn (no kind of great person favoured) (existing shape). The card kind `renown` carries no family. It replaces the row's `renown.perTurn` of 2.
- **The Temple of Thoth** (new). Divination, column 2, 170 production. Site: a city beside fresh water.
  - Base: +2 faith a turn (my suggestion).
  - New: this city gains science equal to half of its faith (existing shape). `pays` with `where: city` and `basis: share`; the pair is in the register in `docs/yields.md` (step 10).
- **The Walls of Uruk** (revised). Bronzeworking, column 2, 170 production. Site: none.
  - Today: +2 authority capacity
  - Today: +50 to how much punishment the city can take
  - New: this city: +10 city defence (existing shape). `cityStat` `defense` with no scope, as The Great Wall has today.
  - New: +2 combat strength in your own territory (existing shape). `combatLine` with `ownTerritory`; arms at `evaluator.ts` 7602 and 8544.
- **The Great Ziggurat** (revised). Writing, column 3, 223 production. Site: none.
  - Today: +2 science, +2 faith
  - New: +2 science in every city with a Shrine (existing shape). `pays` city, scope `hasBuilding`; the figure changes.
  - New: rites cost 30% less faith in this city (small extension). The rule `riteCost` exists (`religion.ts` 1506) and is read for the empire. It needs the city the rite is started in.

#### Age 2 (9)

- **The Mausoleum** (revised). Currency, column 4, 292 production. Site: none.
  - New: the yields of your great people's improvements are doubled (new shape). The hex test `greatWork` exists. A line that pays a hex's whole yield again does not: a new option in `explainTileYield`, placed last.
  - New: +5 renown per turn, favouring engineers (existing shape). The row's `renown` (family and figure change).
- **The Pyramid of the Sun** (new). Chronology, column 4, 292 production. Site: none.
  - Base: +2 faith a turn (my suggestion; the user gave none).
  - New: your cities may spend a citizen for faith: 5 faith for each citizen the city has (small extension). The `levy` kind and the levy verb exist (`levies.ts`); its uses are production, muster, opus, conscript, worker, settler, wonder and rite. A `faith` use is new. It shares the town's levy wait (5 turns) and the smallest town (2 citizens). Confirm that `cardLevyGrants` reads a wonder's effects.
  - New: +2 culture on every Holy Site (existing shape). `pays` hex with `improvement: holySite`.
  - Waits on question 21.
- **The Statue of Zeus** (revised, moves). Bronze Panoply, column 4, 292 production. Site: none.
  - Today: +1 culture
  - New: +4 combat strength for all units against cities (existing shape). `combatLine` with `vsCity`.
  - New: on completion, 3 of the best melee unit you can build join you (existing shape). The `unit` grant with `bestMelee`, listed three times.
- **The Theatre of Dionysus** (unchanged). Epic Poetry, column 4, 292 production. Site: none.
  - Today: +4 culture
  - Today: +1 happiness per Amphitheater
  - Today: on completion, a Doctrine draft opens
  - Today: on completion, an Amphitheater is raised here as well
- **Petra** (revised, moves). Irrigation, column 5, 382 production. Site: a city built on or next to desert.
  - Today: +2 gold
  - New: +1 food, +1 production on every desert hex (existing shape). The same `pays` hex line with its `scope` removed.
  - New: +1 gold on every floodplain hex (existing shape). The same.
- **Solomon's Temple** (new). The High Temple, column 5, 382 production. Site: none.
  - Base: +2 faith and +2 culture a turn (my suggestion; the user gave none).
  - New: +1 choice in every great person offer (existing shape). `offerRider` with `offer: greatPerson`; the arm is at `evaluator.ts` 13169.
  - New: great people cost 10% less renown (existing shape). `rulePercent` with rule `greatPersonCost`; read in `renown.ts` 386.
- **The Colossus** (unchanged). Wayfinding, column 5, 382 production. Site: a coastal city.
  - Today: +3 gold
  - Today: +1 trade route for your empire
  - Today: +1 production, +1 gold on every water hex carrying a resource
- **The Iron Pillar** (new). Siegecraft, column 5, 382 production. Site: none.
  - Base: +2 production a turn (my suggestion).
  - New: production buildings produce 50% more of their own yields (existing shape). `buildingYieldPercent` with `category: production` (a Commerce Order has the same line for gold buildings).
  - New: +1 production on every hex carrying a strategic resource (existing shape). `pays` hex with the test `resourceKind` (strategic), no scope.
  - Waits on question 24.
- **The Library of Ashurbanipal** (new). Code of Laws, column 5, 382 production. Site: none.
  - Base: +2 science a turn (my suggestion).
  - New: +10 renown per turn, favouring scholars (existing shape). The row's `renown`.
  - New: +5 renown per turn, favouring scholars, for each city you captured; +20 if that city holds a wonder (small extension). The card kind `renown` pays for each city, but it has no scope and no family. It needs both (`captured` and `wonderTown` exist as city scopes).

#### Age 3 (10)

- **Angkor Wat** (revised, moves). State Workforce, column 6, 501 production. Site: none.
  - Today: +2 faith
  - New: +1 faith on every improved hex with a resource (existing shape). `pays` hex with the tests `improved` and `hasResource`.
  - New: +3 faith on every Holy Site (existing shape). `pays` hex with `improvement: holySite` (a founder belief has the same line).
- **The Great Library** (revised). Rhetoric, column 6, 501 production. Site: none.
  - New: +8 science (existing shape). The row field `science`.
  - New: your Academies gain +2 science for each great scholar you have recruited (small extension). `pays` hex with a count is in the register. A count of great people by family exists for combat lines (`greatPeopleOfFamily`); the pay counts need it.
  - New: on completion, a great scholar joins you (existing shape). The `greatPerson` grant with `family: scholar` (The Turning Heavens has it).
- **The Great Stelae of Aksum** (new). The Silk Road, column 6, 501 production. Site: none.
  - Base: +2 gold a turn (my suggestion).
  - New: +2 culture, +2 faith on every trade route (existing shape). `pays` with `where: route`, flat. The word "foreign" is gone, so no `crossing` test.
- **The Terracotta Army** (unchanged). Iron Working, column 6, 501 production. Site: none.
  - Today: +2 production
  - Today: +6 combat strength when defending while standing in one of your cities
  - Today: newly created units in every city with The Terracotta Army gain +2 combat strength
  - Today: +2 authority capacity
- **The Forbidden City** (revised). Satrapies, column 7, 657 production. Site: none.
  - Today: you have one more wildcard chair
  - Today: +5 authority capacity
- **The Great Wall** (revised, moves). The Civil Service, column 7, 657 production. Site: none.
  - Today: +2 production
  - New: every city: +5 city defence (existing shape). `cityStat` `defense` with the scope `always`.
  - New: every city can take +25 more punishment (small extension). City hit points are a row field for the row's own city (`cityHp`). `cityStat` has `defense` and `sight` only; it needs a third stat.
  - New: enemy units in your territory have -1 movement (new shape). No rule changes an enemy's movement. A new rule read in `resetMovement`, with the tile owner field.
- **Chichen Itza** (revised, moves). Horology, column 8, 860 production. Site: none.
  - Today: +2 culture, +2 faith
  - Today: rites last +50% longer
  - New: cities keeping a rite gain +2 happiness (existing shape). `happiness` for each city with the scope `keepingRite` (Devotion cards have it).
  - New: cities keeping a rite gain +20% culture (existing shape). `percentYields` with the scope `keepingRite`.
- **Hagia Sophia** (unchanged). Theology, column 8, 860 production. Site: none.
  - Today: +3 faith
  - Today: +1 culture, +1 faith in every city with a Temple
  - Today: spreads your religion +4 faith to every city within 8 hexes
  - Today: on completion, a Prophet joins you
- **The Circus Maximus** (revised). Engineering, column 8, 860 production. Site: none.
  - Today: +4 happiness
  - New: +1 happiness for each military building (existing shape). `pays` empire, count `buildingsOfCategory` (military), to happiness. Confirm that the count leaves out wonders.
- **The Great Mosque of Djenné** (unchanged, moves). Guildhalls, column 8, 860 production. Site: none.
  - Today: +3 faith
  - Today: newly created prophets gain +1 charge
  - Today: newly created apostles gain +1 charge
  - Today: +1 pantheon slot

#### Age 4 (5)

- **The House of Wisdom** (unchanged). Scholarship, column 9, 1127 production. Site: none.
  - Today: +4 science
  - Today: +50% science in every city with The House of Wisdom
  - Today: on completion, the technology you are researching is finished
- **The Oracle Pits of Yin (name open)** (new). Geomancy, column 9, 1127 production. Site: none.
  - Base: +2 faith a turn (my suggestion).
  - New: +1 culture for each building that supplies faith (existing shape). `pays` with `basis: count` and the count `buildingsSupplying` (faith); the arm is at `evaluator.ts` 3656.
  - New: on completion, 5 free rerolls of a draft are yours (small extension). A reroll for faith exists (`rerollOffer`), and a belief hand already has one free reroll. A stock of free rerolls on the player, and a grant that fills it, are new.
  - Waits on question 27.
- **Machu Picchu** (revised). Natural Philosophy, column 10, 1477 production. Site: a city next to a mountain.
  - Today: +2 gold
  - New: +2 trade routes for your empire (existing shape). The row field `routeSlots`.
  - New: +1 gold on every hex for each mountain beside it (existing shape). `pays` hex, flat, with `perAdjacentMountain` (in the register in `docs/yields.md`), with no scope: every city.
- **Notre-Dame** (revised). The Holy Office, column 11, 1934 production. Site: none.
  - Today: +2 culture
  - New: +1 happiness for each building that supplies faith (existing shape). `pays` empire, count `buildingsSupplying` (faith), to happiness.
- **The Alhambra** (revised). Militant Orders, column 11, 1934 production. Site: none.
  - New: +10 culture (existing shape). The row field `culture`.
  - New: you have one more Military chair (small extension). `slotRider` opens Wildcard chairs only. Its own note says that a typed chair "earns its own field".
  - New: on completion, a great general joins you (existing shape). The `greatPerson` grant with `family: general`.

### Files that change with the build

| File | What changes |
|---|---|
| `data/buildings.json` | The 18 revised rows, 7 new rows, and `retired: true` on `waterClockOfSuSong`. Remove the `note` and `deferred` on The Alhambra and the `note` on The Great Lighthouse. A row carries a `size` and no cost. |
| `data/techs.json` | The `unlocks.buildings` lists: 7 new wonders, the 6 moves, and The Water Clock off Horology. |
| `src/sim/buildingData.ts` | The docblocks name most wonder rows; the grant union if the free-reroll grant is added. |
| `src/sim/statecraftData.ts`, `statecraft/evaluator.ts`, `statecraft/describers.ts` | The 7 extensions and 2 new shapes. A shape that is declared and never read fails the register test. |
| `src/sim/levies.ts`, `religion.ts`, `renown.ts`, `statecraft/council.ts`, `yields/hex.ts`, `cities.ts` | The faith levy; the city for `riteCost` and the free rerolls; the scoped renown; the typed chair; the doubled great work; the empire-wide city hit points and the movement rule. |
| `docs/wonders.md` | Out of date. Its cost band is from before the one cost standard, it names a Sistine row that does not exist, it lists "a wonder granting a great person directly" as refused (The Great Library and The Alhambra now do), and it calls the `borders` rule one of the four special shapes (no row uses it after The Great Wall changes). It has no sync test: `test/sim/wonders.test.ts` only cites it in a comment (line 570, "the twenty-seven rows"). |
| `docs/production-costs.md`, `docs/tech-tree.md`, `docs/README.md`, `docs/bot-priorities.md` | Each names wonders or their technologies. `docs/production-costs.md` has a sync test (`test/sim/productionCosts.test.ts`). |
| `test/sim/wonders.test.ts` | Names 17 of the changed rows and the count of twenty-seven. The main test to rework. |
| `test/fixtures/cardText.json` | The printed text of every row. Regenerate it. |
| `test/sim/tech.test.ts`, `test/sim/techUnlocks.test.ts`, `test/sim/statecraft.test.ts` | They name The Water Clock, The Circus Maximus, The Temple of Artemis and The Statue of Zeus by technology or by effect. |
| `test/ui/wonderGrants.test.ts`, `test/sim/upkeep.test.ts`, `test/sim/combat.test.ts` | The Statue of Zeus's free unit and combat line; The Great Library's grant. |
| `test/sim/trade.test.ts`, `test/sim/purchase.test.ts`, `test/sim/cities.test.ts`, `test/sim/empireLinesAtRest.test.ts`, `test/sim/religion.test.ts` | The Great Lighthouse's trade route, The Great Ziggurat's purchase rider, The Mausoleum's and Petra's gold, Chichen Itza's rites. |
| `test/ui/cityModifiers.test.ts`, `test/ui/ledgerScreen.test.ts`, `test/ui/meterBreakdown.test.ts`, `test/ui/cityPanelGlance.test.ts` | They use Machu Picchu's gold percent, The Circus Maximus's happiness and Chichen Itza as fixtures. |
| The many tests that name `pyramids` or `theOracle` | About 45 files use them as a handy wonder. Most ask only that a wonder exists; those that read The Pyramids' +2 production or The Oracle's +1 faith will fail. `test/sim/forbiddenCityChair.test.ts` and `test/sim/aiWonderRewards.test.ts` read The Forbidden City, whose chair does not change. |
| `data/wagers.json` | No change. "The Wonder of the Age" needs three wonders of the age; every age then has five or more. |

### Not confirmed

- The counts `buildingsSupplying` and `buildingsOfCategory` walk every building a town holds, wonders included. So Notre-Dame and The Oracle Pits of Yin count the wonders that supply faith, and The Circus Maximus counts the four military wonders. I read the first count's code and not the second's.
- Whether `cardLevyGrants` reads the effects of a wonder. If it reads Orders only, The Pyramid of the Sun needs that too.
- Whether a row's `renown` may have no family (The Oracle). If it may not, use the card kind `renown`.
- The exact filter for ships on a `combatLine` and a `unitStat` (The Great Lighthouse).
- Which drafts faith can reroll today (The Oracle Pits of Yin).
- The size of The Library of Ashurbanipal's renown and of Machu Picchu's mountain gold in every city. Both need a game run.
- The history in the candidates is from my own knowledge. I ran no web check, and I named a source game only where I am sure of it.

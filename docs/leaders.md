# Leaders — figures for the seats (worksheet, 2026-09-10)

A worksheet in the `wager.md` shape. The game has no civ uniques today — a seat
is a colour and a charge (`heraldryFor`) — so a leader is a new system, and this
file is the casting call before the mechanics: who, why they are interesting,
the **themes** they play to, and **possible bonuses** stated in the card
vocabulary the game already has, so each is one JSON row when the system
exists. ▢ is the user's; nothing here is ruled. The user: *"I know for sure i
want to include mithridates, king of pontus."*

Names already taken by great people (`data/greatPeople.json`) are avoided:
Imhotep, Hannibal, Boudica, Spartacus, Subutai, El Cid, Nzinga, Yi Sun-sin,
Leonardo and the rest of that roster stay great people.

**Conventions.** Bonuses are deliberately modest (a doctrine's weight, not a
civ's) so a leader shades a playstyle rather than dictating it. A leader would
take two or three of the bullets under it, not all. Each fits one of
`docs/playstyles.md`'s families first and a sub-identity second.

## The second cut — fixed identity (2026-09-11)

**Ruled with the user, 2026-09-11; built 2026-09-12 (batch L6a).** The first cut
(a bonus and a deck of twelve drafted cards a figure) is superseded by this
section, and its tables are gone with the deck. This section is the spec of
record: `data/leaders.json` mirrors "The thirteen", "The colours", "The cities"
and "The biases", and the sync tests in `test/sim/leaders.test.ts` and
`test/render/seatInks.test.ts` hold each pair together.

### Why

- **Density.** Civ VI launched eighteen civs at four designs each. The first cut
  is thirteen a figure — seventy-eight for six — and the twelfth card on any
  leader is filler. The roster was small *because* the deck was dense.
- **Legibility.** A leader is a known quantity: you know what Rome does before
  you meet Rome. A drafted or age-dealt figure is three possible figures.
- **The per-age choice already exists** — the wager deal, governments at tiers,
  Orders as offers, doctrines, beliefs, great people. A leader draft was a fifth
  "pick one of three" on the wager's turn.
- **No families, no ages.** A shared family pool was a second identity to learn
  and a second thing to announce; and the growth curve it promised is already
  there, because a unique still arrives when its technology does.

### The shape — Civ's, exactly

Leader and civ are **one thing** in this game. A figure is:

| what | count | reaches the seat |
|---|---|---|
| **abilities** | two passives (card effects, doctrine-weight) | turn one, for the game |
| **unique unit** | one | when its technology arrives |
| **unique building** | one | when its technology arrives |

Plus data that costs nothing: colours, cities, start bias, charge. Everything a
figure is fits on the landing screen in four lines. `Player.leaderOffer`, the
`leaderDraft` blocker, `chooseLeaderCard` and the `leaders` phase retire (rows
kept for saves); the abilities are the seat's held effects from `newGame`; the
uniques are `unlockedByLeader` rows opened by the seat's figure through the tech
gate every row already has. L2b's draft sheet goes; the leader sheet stays as
the record; the landing shows the four lines.

### The thirteen

The first six, remapped from what is built (every unit and building below has a
row and its rules); the second six proposed by the orchestrator — **the six are the user's picks** (2026-09-11); the abilities, units and
buildings of the last four are the orchestrator's drafts, ▢ to mark up.

| figure | civ | identity | ability I | ability II | unique unit | unique building |
|---|---|---|---|---|---|---|
| **Pachacuti** | Inca | wide · the mountain network — few citizens, much coin | *the Qhapaq Ñan*: cities joined to the capital by road +1 happiness +1 production | *the Gold of the Peaks*: farms +1 gold per adjacent mountain | the Slinger, unslowed by hills | Terraces — farms may be cut into hills |
| **Emperor Taizong** | Tang | wide · the imperium | *the Mandate*: melee +1 strength +1 movement | *the Garrison Towns*: garrisoned cities +1 happiness, +15% culture | Tang heavy cavalry | the Examination Court |
| **Modu Chanyu** | Xiongnu | wide · the steppe | *the Riders of the Steppe*: mounted +1 movement on grass and plains; pillaging +50% | *the Herds*: pastures +1 production +1 faith | the Xiongnu horse archer | the Horde Camp |
| **Akhenaten** | Egypt | tall · faith and wonders | *the Great Works*: cities with a holy site +20% production toward wonders | *the Nile's Gift*: +1 faith on farms drinking fresh water | the Khopesh | the Obelisk |
| **Al-Ma'mun** | Abbasid | tall · science and faith | *the Mu'tazila*: +1 science per five faith a turn, empire-wide | *the House of Wisdom*: faith and science buildings +2 food | the camel archer | the House of Learning |
| **Mithridates VI** | Pontus | tall · defence and growth | *the Poison King*: +2 strength against empires with more cities | *the Groves and the Hunt*: +2 food on plantations and camps | the Pontic peltast | the Mountain Hold |
| **Joan of Arc** | France | faith and war | *the Voices*: a kill pays faith and presses your faith on the nearest city | *the Maid*: +4 combat strength on any hex that follows your faith | the Gendarme — a heavy lance of the fourth age, +10 against cities | the Sainte-Chapelle — a temple line, +3 faith; military units may be bought here with faith |
| **Mansa Musa** | Mali | land commerce · gold and the hajj | *the Gold of Wangara*: mines and camps pay +2 gold; desert hexes worked pay +1 gold | *the Hajj*: routes to or from a city holding a holy site pay +2 gold +2 faith | the Mandekalu — a horseman line, pillaging pays double gold | the Sankore Madrasa — a library line, +1 science per four faith the city makes |
| **Zheng He** | Ming | wide · the sea | *the Treasure Fleet*: ships +2 movement and +1 sight | *Tribute of the Western Ocean*: sea routes pay +2 gold +1 culture; the first sea route to each foreign empire pays a lump of gold | the Treasure Ship — a great hull of the third age, strong and far-seeing (▢ carrying two passengers is a new escort shape) | the Longjiang Dockyard — a harbour line: ships built here +1 movement, routes to or from this city pay +2 gold |
| **Nezahualcoyotl** | Texcoco | tall · the engineer-poet | *the Dikes*: cities with an aqueduct pay +1 culture, and their farms +1 production | *Flower and Song*: +1 culture for every two citizens in the capital | the Eagle warrior — a swordsman line; a kill pays +5 culture | the Tetzcotzinco — replaces the garden, keeps its effects, and the city makes +15% food in total (the whole yield, not the surplus) |
| **Hypatia** | Alexandria | tall · the library city | *the Museion*: +25% renown | *the Commentaries*: great people's works pay +50% of their yields | the Alexandrian galley — a light hull with +1 sight | the Museion — replaces the library, keeps its effects, and pays +1 science for every great person your realm has called this game |
| **Hildegard of Bingen** | the Rhineland | tall · rites and song | *the Rites*: cities keeping a rite pay +20% culture | *Symphonia*: every faith building pays +2 culture +2 production | the Canoness — an apostle whose proclamation also grants a lump of production to every city | the Scriptorium of Rupertsberg — +3 faith and +2 culture (the monastery line is retired, so it stands alone); follower and founder effects are doubled in this city (▢ a new shape: a city-scoped amplifier on belief effects — deferred in L6a) |
| **Ibn Battuta** | the Maghreb | the traveller — the generalist who reacts to the map | *A guest at every court*: one more wildcard chair in every government | *the Rihla*: one free re-roll at every draft — Orders, doctrines, governments, great people — never a belief (▢ a re-roll verb: the draft is redrawn from the seat's own pool, once, the Magister's Dice shape) | the Rihla caravan — a trader whose routes pay +3 gold and which cannot be plundered (▢ the unplunderable rule and a route rider scoped to one trader row) | the Funduq — replaces the caravanserai and stands in any city (the site rule lifted); +1 route slot; each foreign route starting or ending here pays +2 food +2 production |

**Pachacuti, reworked (the user, 2026-09-11).** His first cut pulled two ways —
food from mountains (tall, few sites) and roads (wide, many). Now both lines
reward the same country: hills and peaks joined by road. The mountain farms
mint gold rather than food, and the gold is the width — traders, routes and
the odd army bought with coin from small terraced towns while the plain-dwellers
grow fat and slow. No food bonus anywhere: Inca towns are productive with few
citizens, which no other figure is, and the happiness line is what keeps a
twelve-town Inca content. Every piece is built (the per-mountain farm line from
L3c pays two peaks twice; the road-joined scope; the Terraces waiver; the
Slinger's hills) — a data change. The Qollqa and the Tambo go to the bench.

Notes on the second six: Joan of Arc replaces Basil II (the user, 2026-09-11:
*"i think i want a religion/war civ"*) — she was on the deferred list as a
whole-seat concept, and as two abilities, a unit and a building she is a sharp
seat rather than a warping one; every French piece lands in Æra IV, the
Cathedrals, where a faith-war figure should peak. Her lines are built shapes
(the Crusade's kill rider presses faith; the Khopesh fights harder on following
hexes) except **buying soldiers with faith in one building** — ▢ a small new
shape. Basil II and the Cataphract return to the bench. Mansa Musa is the land
commerce seat `docs/playstyles.md` names and no figure held. Zheng He is the sea's first seat and the roster's second Chinese figure (Ming,
eight centuries after Taizong — the user kept him for the fleets). Nezahualcoyotl
is the poet-king of Texcoco, engineer of the dikes of the lake — the tall growth
seat that is *water*, not faith. Hypatia is the library city with no faith
detour: where Al-Ma'mun turns faith into science, she turns great people and
their works into it. Hildegard is rites and song: where Akhenaten builds with
faith (holy sites, wonders), she keeps it (rites) and sings it (culture), with
no wonder bias at all. Ibn Battuta (the user, 2026-09-11: *"the
generalist, react to what you're given"*) is built out of *options*: a spare
chair for whatever the map asks, a second look at every hand the game deals
him, and routes that feed and build rather than only pay — so the map decides
what he becomes. He carries **no wants and no start bias**, since taking what he
is given is the point. Two of his four lean on new shapes (the re-roll verb, the
caravan's own route rider); the chair and the Funduq are built vocabulary. Thirteen is an odd count; the roster
carries it, or the user drops one later. Every ability above is written in the
card vocabulary the evaluator has today except the ▢ marks in the table (Joan's soldiers bought with faith in one
building, the Treasure Ship's second passenger, the Scriptorium's doubled belief
effects) — each a new shape, deferred-and-annotated if not built. Two of the
user's revisions of 2026-09-11 lean on shapes worth checking before the build:
the Tetzcotzinco's **+15% total food** is `percentYields` on food (the whole
yield — the same stage the House of Millions uses), and the Museion's **+1
science per great person called** is L3c's `greatPeopleCalled` count; the
Canoness's **production lump on proclamation** is a windfall rider on the
proclaim occasion (▢ if `proclaim` is not yet an occasion).

**Benched, still built**, for later figures: the Tambo, the Qollqa, the Fubing,
the Post Station, the Whistling Arrow, the Chanyu's Guard, the Sun Court, the
Valley of Kings, the Mihna Court, the Paper Mill, the Mithridatium, the scythed
chariot, the Great Poets, the Corvée and the rest of the first cut's passives.

**Not taken**: Basil II (Joan took the seat; Byzantium waits); Yongle (Ming, not Tang — a second Chinese seat in twelve while
the sea and West Africa had none). Still on the shelf: Tomyris, Sher Shah Suri, Zenobia, Rajendra
Chola, Dandolo, Hanno, Ezana, Djoser, Gwanggaeto, Sargon, Ulugh Beg, Abd
al-Rahman III, Bumin, Teuta, Justinian and Theodora, Jayavarman VII; and the
magi — Gerbert of Aurillac, Ramon Llull, John Dee, Paracelsus — with Enheduanna,
Al-Jazari, Shen Kuo, Su Song, Ibn Battuta, Piri Reis, Rabban Bar Sauma, Sun Tzu.


**Sketched for the shelf (2026-09-11) — the two magi the user asked after:**

| figure | civ | identity | ability I | ability II | unique unit | unique building |
|---|---|---|---|---|---|---|
| **Gerbert of Aurillac** | Reims and Rome | the magician pope — beads, faith and learning as one instrument | *the Reckoner*: every glass bead you hold pays +2 science +1 culture a turn | *the Brazen Head*: temples pay +2 science and libraries +2 faith | the Legate — an apostle whose proclamation also grants the city a lump of science | the Cathedral School — replaces the library, keeps its effects, +2 faith; the city's rites cost a quarter less faith (▢ a rite-price rider) |
| **Ramon Llull** | Majorca | the Ars Magna — convert by argument, always the right card | *the Ars Magna*: every Order draft shows one more card | *Blanquerna*: +1 science +1 culture per three foreign citizens following your faith | the Disputant — an apostle line with an extra charge; its proclamation on a foreign city also pays science | the Studium of Miramar — replaces the university, +3 science, +1 culture per congregation in the city (▢ a per-congregation count) |

Gerbert plays the wagers for the beads themselves rather than for the Opus, and
his faith and science are one pool. Llull's faith wants to be abroad, in rival
towns, where it pays science; the alchemical treatises falsely attributed to him
for three centuries are the Æra V hook if a figure ever leans toward the Opus.

### What it cost to build

**L6a, the simulation and the data (2026-09-12).** `LeaderDef` is
`{name, abilities[2], unit, building, colors, cities, startBias, charge?}`, and
an ability is `{id, name, text, effects, deferred?, note?}` — ordinary card
effects, validated at load. The seven new figures are rows, with the colours,
cities and biases in this doc's three tables and mirrored in the sheet. The
draft retired whole: `Player.leaderPicks`, `Player.leaderOffer`,
`chooseLeaderCard`, the `leaders` phase, the `leaderOffered` occasion, the
`LeaderCard`/`LeaderBoon`/deck types, `src/ai/leader.ts` and the bot's arm are
gone, and `state.ts`'s v113 paragraph is rewritten to the second cut (the schema
stays 115 — nothing of the draft ever reached a save). A unique's row carries
`unlockedByLeader` and is opened by `isUnlocked` for the one seat whose sheet
names it, once the row's own technology has come — or, for a row the tree names
nothing of, once the empire has researched something standing at the row's own
column. Fourteen new rows joined the roster and the buildings; a unit row may
now carry `effects` of its own, folded into the law of the figure that may field
it. **L6b is the screens.**

## The one the user named

- **Mithridates VI of Pontus** (r. 120–63 BC) — the Poison King. Fought Rome
  three times over four decades, lost every war and came back from every one;
  spoke twenty-two languages; dosed himself with poisons until none could kill
  him (*mithridatism*). 

  themes: tall/defensive
  possible bonuses: 
  - strength against empires with more cities (puppets don't count)
  - gardens provide increased happiness and +1 authority
  - science from military units
  - food bonuses to fit the poison theme

## Wide — the imperium

- **Pachacuti** (Inca, r. 1438–71) — the man who built the Qhapaq Ñan, forty
  thousand kilometres of road, and ruled through it; every province owed
  labour, and the roads carried runners, armies and grain.

  themes: wide/imperium, roads, growth
  possible bonuses:
  - domestic trade routes more effective for each hill in the origin city
  - a city joined to the capital by road pays +1 happiness and +1 production
  - roads cost nothing to maintain inside your borders
  - workers gain +1 charge (the corvée)
  - bonus to hills/farms on hills

- **Sargon of Akkad** (c. 2334–2279 BC) — the first empire, the first standing
  army ("5,400 men ate bread daily before him"), garrisons in every conquered
  city, and a daughter installed as high priestess to hold the south.

  themes: wide/imperium, garrisons and puppets
  possible bonuses:
  - a garrisoned puppet demands no happiness
  - a captured city costs 1 less authority
  - melee units +1 combat strength inside your borders
  - the first city you capture each age founds a holy site of your religion

- **Emperor Taizong of Tang** (Li Shimin, r. 626–49) — the Tang's real
  founder: killed his brothers at the Xuanwu Gate, took the throne from his
  father, crushed the Eastern Türks and was named Heavenly Khagan by the
  steppe, then ruled through a meritocratic bureaucracy, the fubing
  soldier-farmers and a road-and-post network; the East's Rome.

  themes: wide, the imperium, generically strong with a military bend (the eastern seat)
  possible bonuses:
  - garrisoned cities pay +1 production (the fubing — soldiers who farm)
  - a captured city costs 1 less authority, and puppets pay +1 culture each (the Heavenly Khagan's vassals)
  - melee units +1 combat strength; +1 more against mounted (the Türks broken)
  - Orders in military slots pay +1 science each (the examination court)
  - unique unit: the Tang heavy cavalry, a stronger horseman line
  ▢ (rec for the eastern wide seat)

- **Gwanggaeto the Great** (Goguryeo, r. 391–413) — the name means "broad
  expander of territory": doubled the kingdom in twenty years, took the
  Liaodong and the Han river, drove back Baekje and the Wa, and his stele
  still stands in Ji'an.

  themes: wide, conquest, the marches (the Korean alternative)
  possible bonuses:
  - a captured city keeps its walls and its garrison
  - +1 authority capacity for every 2 cities you captured
  - units heal fully inside your borders
  - +2 culture in every city for each war you have won
  ▢ (the alternative eastern wide seat)

- **Basil II** (Byzantium, r. 976–1025) — the soldier-emperor who never
  married, campaigned every year for forty, and left the treasury so full the
  floor had to be dug out to hold it.

  themes: wide/imperium, the hoard, religion
  possible bonuses:
  - military units -1 upkeep.
  - +20% production towards units in cities that follow your religion
  - +1 combat strength to all units after religion founded, +1 after enhancing, +1 after high temple is built
  - +1 authority capacity for each 50gpt empire-wide, no cap
  - unique unit: cataphracts
  - unique unit: better fire ships, galleass

- **Tigranes the Great** (Armenia, r. 95–55 BC) — Mithridates' son-in-law and
  the King of Kings for a decade; he emptied a dozen Greek cities to people his
  new capital, Tigranocerta, and kept four vassal kings as footmen.

  themes: wide/imperium, the annexer
  possible bonuses:
  - annexing a city moves one citizen from it to your capital
  - annexed cities demand less happiness while your capital is the largest city in the world
  - puppets pay +1 authority capacity each, at most +4
  - +2 culture in the capital for each city you have annexed
[less compelling, cut]

## Wide — the steppe

- **Modu Chanyu** (Xiongnu, r. 209–174 BC) — the first steppe emperor, who
  trained his horsemen to shoot wherever his whistling arrow flew, killed his
  father with it, and made the Han pay tribute for sixty years.

  themes: steppe, the horde, tribute, religion
  possible bonuses:
  - mounted units heal extra on hexes they pillage, pillaging requires no movement
  - +10% science and +10% culture in puppeted cities
  - mounted units gain +1 movement on grassland and plains
  - killing a unit with a mounted unit pays +10 culture
  - unique mounted archer units per age
  - pastures and camps +1 faith
  - units +1 combat strength when there is a rite active in your empire

- **Tomyris** (Massagetae, 6th c. BC) — the queen who refused Cyrus the
  Great's marriage offer, lost her son to his trick, then killed him in battle
  and, in Herodotus, put his head in a skin of blood.

  themes: steppe, aggression
  possible bonuses:
  - killing a unit pays its production cost in culture
  - mounted units +2 combat strength
  - +2 happiness in all cities for 10 turns upon capturing a city (does not stack)
  - pastures pay +1 food
  - extra production towards mounted units

- **Bumin Qaghan** (Göktürks, d. 552) — the blacksmith vassal who forged for
  his overlords, then overthrew them and founded the first Turkic khaganate
  from the Caspian to Manchuria.

  themes: steppe, the forge
  possible bonuses:
  - pastures pay +1 production
  - +2 combat strength on units that require strategic resources
  - mounted units cost 15% less production
  - the Smithy pays +1 production on pastures as well as mines
  - connected cities +10% production

## Wide — land commerce

- **Sher Shah Suri** (r. 1540–45) — five years on the throne and he rebuilt
  the Grand Trunk Road, planted its trees, built its caravanserais every few
  miles and minted the rupee that India still uses the name of.

  themes: land commerce, caravans, roads, tolls
  possible bonuses:
  - Caravanserai pays +1 gold for each 4 road hexes the city owns [caraanserai is 1 time building per empire]
  - faster travel along roads
  - trade routes cannot be plundered
  - +1 trade route slot in every city with a Market

- **Zenobia** (Palmyra, r. 267–72) — the caravan queen of the desert crossroads
  who took Egypt and half of Anatolia from Rome, minted her own coin, and was
  carried to Rome in golden chains.

  themes: commerce, war
  possible bonuses:
  - purchased units gain +2 combat strength
  - +50% gold in captured cities
  - +1 trade route when capturing a city
  - +2 gold on every luxury hex
  - the capital's Caravanserai and Bazaar pay half again

- **Mansa Musa** (Mali, r. 1312–37) — famous, but the fit is exact: the richest
  man in history, whose pilgrimage to Mecca gave away so much gold that Cairo's
  price for it fell for a decade.

  themes: gold and faith together
  possible bonuses:
  - a proclamation pays gold to every city it reaches
  - +1 faith and +1 gold on trade routes
  - +2 gold on mines on resources
  - gain +1 faith per 5gpt
  ▢ (famous; the user may prefer lesser-known)

- **Amanirenas** (Kush, r. c. 40–10 BC) — the one-eyed kandake who fought
  Augustus's legions to a treaty on her own terms, and kept his bronze head
  buried under her temple steps so every worshipper walked over it.

  themes: land commerce with iron; a border held
  possible bonuses:
  - mines and quarries carrying a resource pay +1 gold
  - a peace signed while you hold a captured city keeps the city
  - +3 combat strength for units defending within 2 hexes of a holy site
  - Iron and gold are revealed together
  [remove]

## Wide — sea commerce

- **The Yongle Emperor** (Ming, r. 1402–24) — took the throne from his nephew,
  sent Zheng He's treasure fleets to Calicut, Hormuz and Mogadishu with ships
  five times the length of a caravel, reopened the Grand Canal, moved the
  capital to Beijing and built the Forbidden City. Trade as tribute: the
  world came to him.

  themes: wide, sea commerce, tributary trade, the capital
  possible bonuses:
  - unique unit: the Treasure Ship — a heavy hull that runs a trade route while it sails, and every foreign harbour it visits pays gold once
  - foreign routes ending in your capital pay the host double (the tributary court)
  - a domestic route that crosses water pays +2 food and +2 production (the canal)
  - +1 authority capacity for every 3 foreign routes running
  - the capital's wonders cost 15% less while the capital is coastal
  ▢ (rec for the eastern seat)

- **Emperor Wu of Han** (r. 141–87 BC) — sent Zhang Qian west to find allies
  against the Xiongnu and opened the Silk Road instead; fought the steppe for
  forty years, took the Hexi corridor, monopolised salt and iron to pay for it.

  themes: wide, land commerce and war against the steppe
  possible bonuses:
  - international routes pay +1 science and +1 culture (Zhang Qian's road)
  - mines and quarries on salt and iron pay +2 gold (the monopolies)
  - +3 combat strength against mounted units inside your borders
  - a captured city on a route's road pays the route once more
  - unique unit: the Han crossbowman, a stronger bowman line
  ▢ (the alternative eastern seat; a foil to Modu at the same table)

- **Rajendra Chola I** (r. 1014–44) — the only Indian king to send a fleet
  across the Bay of Bengal, took Srivijaya's ports on the Malacca strait, and
  put the Ganges' water in his new capital's name.

  themes: sea commerce, the navy as trade
  possible bonuses:
  - a foreign route ending in a city where one of your hulls stands pays half again
  - heavy hulls cost 20% less production
  - capturing a coastal city grants a trade route slot there
  - +1 gold on every water hex a city with a Harbour works

- **Enrico Dandolo** (Venice, doge 1192–1205) — blind and past ninety, he led
  the Fourth Crusade himself, redirected it to Constantinople, and sacked the
  city for Venice's ledgers and a quarter and a half of the empire.

  themes: sea commerce, the entrepôt, the purse as a weapon
  possible bonuses:
  - the host's gold from international routes doubles in your capital
  - units may be bought with gold in any coastal city at 20% off
  - a war declared while a route runs to the enemy pays that route's gold once more
  - +1 trade route slot in the capital per 10 citizens

- **Teuta** (Illyria, r. 231–227 BC) — the pirate queen whose ships took Roman
  merchants at will, and who told Rome's envoys that piracy was a lawful trade
  among her people.

  themes: sea raiding, plunder
  possible bonuses:
  - plundering a trade route pays its bounty twice
  - your hulls take no counter-blow when striking a caravan or an embarked unit
  - light hulls +1 movement
  - pillaging a coastal hex pays +10 gold

- **Hanno the Navigator** (Carthage, 5th c. BC) — sailed past the Pillars of
  Heracles down the African coast with sixty ships, saw a burning mountain and
  "hairy people the interpreters called gorillas", and wrote it on a temple
  wall.

  themes: exploration, the sea
  possible bonuses:
  - light hulls see 2 hexes further
  - a hull that ends its turn beside a ruin claims it
  - the first hull to reach a foreign harbour pays +20 gold
  - Fishing boats pay +1 food

## Tall — the library city

- **Al-Ma'mun** (Abbasid, r. 813–33) — the caliph of the House of Wisdom, who
  set the price of a peace treaty at a copy of Ptolemy's Almagest, paid
  translators in gold by the weight of the book, and sent astronomers to
  measure the earth.

  themes: tall, science AND faith — the Mu'tazila caliph
  (accuracy: exact — he made rationalist theology the state's creed, ran the
  Mihna to enforce it, and the House of Wisdom was its instrument; faith and
  science were one policy under him)
  possible bonuses:
  - faith is gained again as science in the capital, at a fifth of the rate (the Mu'tazila)
  - a proclamation in a city with a Library pays science as well as pressure
  - a peace signed pays science
  - the capital's science buildings pay +1 science per 3 citizens more
  - a scholar great person costs a third less renown
  - +2 science per trade route ending in the capital

- **Ulugh Beg** (Timurid, r. 1447–49) — the astronomer-king of Samarkand, whose
  observatory's sextant was forty metres across and whose star catalogue stood
  for two centuries; murdered by his son a year after taking the throne.

  themes: tall, science, renaissance-punk
  (accuracy: science, not faith — Ulugh Beg's madrasa taught astronomy against
  the clerics' wishes, and the Naqshbandi establishment backed the son who
  murdered him; a science-and-faith seat is Al-Ma'mun's, above)
  possible bonuses:
  - the Observatory pays +3 renown a turn
  - science buildings in the capital pay +1 culture each
  - a technology completed in Æra IV or V pays +40 renown
  - The Turning Heavens and Uraniborg cost 25% less production

- **Abd al-Rahman III** (Córdoba, r. 912–61) — half a million people, seventy
  libraries, running water and street lighting, and a city the Christian north
  sent its sons to study in.

  themes: tall, the hub
  possible bonuses:
  - routes ending in your capital bring a copy of every luxury the sender holds (the Silk Road's rule, widened)
  - +1 science and +1 culture in the capital for each foreign route ending there
  - Public Baths pay +2 happiness more
  - the capital's happiness demand per citizen −10%

## Tall — the wonder city

- **Jayavarman VII** (Khmer, r. 1181–1218) — the builder of Angkor Thom, the
  Bayon and a hundred and two hospitals; the two hundred faces on the towers
  are his own.

  themes: tall, wonders and faith
  possible bonuses:
  - a wonder completed pays +2 faith to every city
  - the capital's rites last 5 turns longer
  - +1 happiness in every city per wonder held, at most +4
  - a Temple in the capital heals units resting there fully each turn

- **Justinian and Theodora** (Byzantium, r. 527–65) — the Hagia Sophia, the
  Code of law, the walls that held for a thousand years, and an empress who
  told the emperor that purple makes a fine shroud.

  themes: tall, the walled city, law, faith
  possible bonuses:
  - the capital's combat strength per citizen doubles
  - the Order in your first wildcard slot pays twice (the Code)
  - faith buildings grant +2 city strength and +1 additional faith
  - a city with walls demands −1 happiness
  - defensive buildings grant +2 food per age they're unlocked

- **Djoser** (Egypt, c. 2670 BC) — the first pyramid, the first great building
  in cut stone anywhere, with Imhotep (already a great person) as his vizier;
  the pair is the point.

  themes: tall, the wonder city
  possible bonuses:
  - the first wonder of every age costs a quarter less
  - quarries and mines pay +1 production
  - an engineer great person's work pays +2 production, +20% production towards wonders in cities with an engineer's great person work
  - +1 production on farms adjacent to a river
  - cities with a wonder +30% growth surplus

## Faith — the holy city

- **Akhenaten** (Egypt, r. c. 1353–36 BC) — invented a one-god religion, built a
  new capital for it in the desert, and was chiselled out of every monument by
  his successors.

  themes: faith, the wandering court, wonder building (egypt)
  possible bonuses:
  - unlocks prophets early with divination
  - holy sites +3 faith if built on desert
  - cities with a holy site gain +20% production towards wonders
  - the holy city presses its faith harder for every 3 citizens (the High Temple's line, from the start)
  - +1 faith on farms adjacent to a river (the nile)
  - khopesh, unique swordsman. combat strength when fighting in cities with your religion

- **Ezana of Aksum** (r. c. 320–60) — the first Christian king in Africa, whose
  obelisks still stand, whose coins carried the cross, and whose ports on the
  Red Sea traded with India and Rome.

  themes: faith and sea trade
  possible bonuses:
  - every gold building supplies +1 faith
  - trade routes +1 faith, +3 if they're by sea
  - Monuments supply +1 faith and cheaper to build
  - +1 faith on sea resources, an additional +1 in cities following your religion

- joan of arc:
  themes faith and war:
  - units gain combat strength in cities following your religion
  - +1 combat strength from every holy site in your lands
  - gain faith every time a unit engages in combat
  - military units can be purchased with faith
  - killing units spreads your faith

## The occult and the late game (Æra IV/V flavour)

defer these for later - these should have the most unique/game-warping abilities, i think. like 'the watcher' in slay the spire

- **Rudolf II** (Holy Roman Emperor, r. 1576–1612) — the alchemists' emperor,
  patron of Kepler, Tycho and John Dee, keeper of the Wunderkammer, who let the
  empire run itself while he sought the Stone in Prague.

  themes: the Great Work, the occult
  possible bonuses:
  - the four stages cost 25% less production
  - the Opus door opens one bead early
  - great people's works pay +1 science and +1 culture
  - the Wunderkammer pays renown per great person's work
  (the late-game's natural leader; `docs/late-game.md`)

- **Ludovico Sforza** (Milan, r. 1494–99) — Leonardo's patron, who wanted a
  bronze horse the size of a house and got the Last Supper, then lost Milan to
  the French and died in a French cell.

  themes: renaissance-punk, the Artificer
  possible bonuses:
  - great people's works pay +2 production
  - the Ornithopter and the Armoured Cart come one node early
  - an artist or engineer great person costs a third less renown
  - +15% production toward wonders in the capital

## Start biases — feasibility against the map script (2026-09-10)

How starts are chosen today (`src/sim/startPositions.ts`, `docs/mapgen.md`
"Starts"): every passable land tile is scored as a **site** — its ground yield
plus the best six worked tiles of rings one and two, each a labelled line
(`scoreStartSite`, rule 5's shape), plus two site bonuses already on the sheet:
`freshwaterBonus` (10) and `coastBonus` (6); seven hard **rejections** back the
score up (landmass, terrain, cold/arid share, water share, food and production
floors, room for the strategics). Sites are sorted and seated greedily with a
spacing; **no dice** — starts are deterministic in the map alone and are not
logged. Then the fairness passes (`resources.ts`) plant food, luxuries and the
promised strategics **at** the chosen starts.

What that means for a bias:

- **Feasible, and small.** A bias is extra labelled score lines per seat —
  `+coast × leader.coast`, `+river × leader.river`, `+hills`, `+grassland and
  plains`, `+floodplain and oasis` — folded into the same list the chooser
  already sorts. Every weight in `mapgen.starts` is data; a leader's bias is a
  data row beside them. Rule 5 holds: the mapgen page can print why a leader
  got its site.
- **A bias must be a score, never a rejection**, or the seed sweeps that prove
  every roster seats legally on every seed stop holding. Soft and capped (rec:
  a bias may add at most a fifth of the best site's score), so no leader is
  handed an unliveable coast for the sake of a coast.
- **Horses and iron need no bias**: every capital is already promised its
  strategics within `startStrategicRadius` (`ensureStartStrategics`), so
  Modu's pastures and Bumin's iron are met by construction.
- **Desert is a rejection today** (`hostileTerrain`, `maxHostileRingShare`
  0.45), so Akhenaten's bias is the river, the floodplain and the oasis — the
  Nile's valley, not the Sahara. **Built, and then retuned** (2026-09-11,
  `docs/flags.md` (uuuu), the user: *"i notice akhenaten rarely spawns in
  desert"*): the first cut weighted desert at a fraction and asked for one arid
  hex within two rings, which a river valley with a dune in sight answers — he
  held the want on every board and stood in sand on none of twenty-four. The
  want is now **`aridBeside: 3`**, three of the six hexes *touching* the capital,
  and the terrain weights are `river 4, floodplain 3, oasis 3, desert 2`. The
  site itself is still refused if it is desert, which is the point: what a figure
  of the sand can have is the last liveable hex before it. Measured, he now
  stands in three arid neighbours on 11 of 24 standard boards (mean 1.9, up from
  0.9) — the rest is the twenty-hex spacing spending the sites the ground grew.
  See `docs/mapgen.md`, "Hard wants, and the fallback", for the two want shapes
  and the whole table.
- **The seating becomes per-seat.** Today starts are chosen first and handed to
  seats in roster order; with biases each seat scores the board its own way,
  so the chooser seats **in roster order** (seat one takes its best site, seat
  two its best of what remains at spacing, …) — deterministic, and the order
  is the config's. ▢ or an assignment that maximises the sum, which is fairer
  and still deterministic but harder to read on the page. `chooseStartPositions(map,
  count)` keeps its old shape for the tools and tests; the biased call is a
  second entry taking the roster.
- **Cost**: one score term kind, a `bias` block per leader row, the per-seat
  seating, the mapgen page printing the lines, `docs/mapgen.md` "Starts" and
  its sync test, and the seed sweep re-run with every leader seated. A day's
  batch, after the leader system exists to carry the row.

The biases as built are the table **"The biases"** below, which is the spec of
record and is sync-tested against `data/leaders.json`. (The first cut's proposal
— Pachacuti hills and river, Taizong river and grassland, Modu grassland and
plains away from hills, Akhenaten river and floodplain and oasis, Al-Ma'mun
river with a mild coast, Mithridates coast and hills — is what those six rows
were written from, and the measured retunes since are noted above.)

**A bias toward improvements — plantations and camps — is possible, but it is
a furnishing, not a site** (the user, 2026-09-10: "mithridates: plantations and
camps, is that possible?"). The chooser scores the *ground* with resources
stripped, deliberately, because the fairness passes plant resources **at** the
starts afterwards; so "near plantations" cannot be a site score without the
guarantee chasing itself around the map. It can be a **start guarantee** in the
same seam that already promises every capital its strategics
(`ensureStartStrategics`, `resources.ts`): Mithridates' start is furnished with
one plantation-kind luxury and one camp-kind resource within the rings, drawn
from what the continent can host (the hostability filter never relaxes — a wine
grows on any grassland, so a plantation kind is near-certain; deer on forest is
the common camp). It costs the deal nothing it does not already do, it is
deterministic, and it reads on the mapgen page as "furnished for Mithridates:
Wine, Deer". ▢ rec: yes — his Æra I passive (+2 food on plantations and camps)
then always has something to stand on.
  **The three stages** (the user, 2026-09-10: "leader terrain spawn biases
  … resource spawn biases … and then a final pass to furnish resources to
  ensure all leaders have access to strategics"), each on a pass that
  exists, in the order the generator already runs them:
  1. **Terrain bias** — in the start chooser (`scoreStartSite`): score lines
     per leader (river, floodplain, oasis, grassland and plains, hills,
     coast), soft and capped, never a rejection. Starts are chosen on the
     ground before any resource exists, so terrain can be biased here only.
  2. **Resource bias** — two levers, because the game treats the two kinds
     differently. *Bonus resources* (cattle, wheat, deer, fish) are scattered
     freely (`placeResources`), so a leader's bias is a draw weight within a
     radius of its start (cattle and horses heavier for Modu; wine and deer
     for Mithridates), no cap to respect. *Luxuries* are dealt per continent
     under a cap (`dealContinentLuxuries`): the bias goes on **the hand's
     draw** — a continent seating Mithridates draws wine more heavily — so the
     cap and hostability hold unchanged and the copies land near him because
     the scatter is then weighted by his start. No kind appears where the
     deal said none grows.
  3. **The furnishing pass** — last, unchanged in shape (`ensureStartFood`,
     `ensureStartStrategics`, `ensureStartLuxuries`): every start keeps its
     strategics and its luxury floor. ▢ tighten the one loose clause while
     there: the luxury guarantee prefers the continent's hand today but falls
     through to the whole table when nothing dealt suits the ground — the one
     way a kind reaches a continent that was never dealt it. Hand or nothing;
     with a biased deal the miss is rare.
  Rule 2 holds: every stage draws from the map's own stream and the bias is
  config, so the same seed and roster draw the same world.


### The biases (2026-09-12, batch L6a)

One row a figure, and `data/leaders.json`'s `startBias` mirrors it — the sync
test in `test/sim/leaders.test.ts` holds the two together and the rows are the
user's to retune. **Terrain** weights are soft score lines, capped and never a
rejection; **wants** are the hard filter over accepted sites (`…Within` is a
radius, `…Beside` a count of the six touching hexes); **resources** weight the
scatter near the start, **luxuries** the continent's own hand, and **furnish**
is what the fairness pass plants at the start whatever else happens. A dash is
nothing asked for, and a row of dashes is a figure that takes what it is given.

| Leader | Terrain | Wants | Resources | Luxuries | Furnish |
|---|---|---|---|---|---|
| Pachacuti | river 6 · hills 1.5 · mountain 2.5 | mountainWithin 2 · riverWithin 1 | — | — | — |
| Emperor Taizong | grassland 0.9 · river 2 | grasslandWithin 2 | — | — | — |
| Modu Chanyu | grassland 0.45 · plains 0.4 · hills -0.3 | pastureGroundWithin 3 | horses 12 · cattle 4 | — | horses |
| Akhenaten | river 4 · floodplain 3 · oasis 3 · desert 2 | riverOrFloodplainWithin 1 · aridBeside 3 | — | — | — |
| Al-Ma'mun | river 5 · coast 0.6 | riverWithin 2 | — | — | — |
| Mithridates VI | river 9 · coast 0.4 · hills 0.6 | riverWithin 2 | deer 2 | wine 2.5 | plantation · camp |
| Joan of Arc | river 3 | — | — | — | — |
| Mansa Musa | desert 2 · river 2 · oasis 2 | aridWithin 2 | — | gold 3 | gold |
| Zheng He | coast 2 | coastalWithin 1 | — | — | — |
| Nezahualcoyotl | lake 2.5 · river 2 | riverOrFloodplainWithin 1 · lakeWithin 2 | — | — | — |
| Hypatia | coast 2 · river 3 | coastalWithin 1 · riverWithin 2 | — | — | — |
| Hildegard of Bingen | river 4 · forest 1.5 | riverWithin 1 | — | — | — |
| Ibn Battuta | — | — | — | — | — |

Ibn Battuta carries **nothing at all**, which is the design: taking what the
map gives him is the whole of the figure (`biasIsEmpty` answers `true` and the
chooser seats him unbiased). Zheng He and Hypatia are the first two to ask for
salt water — `coastalWithin`, new in L6a beside `lakeWithin`, which is what
Nezahualcoyotl wants the basin of the lake for.

## The colours (2026-09-11, `docs/flags.md` (oooo))

Two a figure, Civ's reading: the **primary** is the field — the territory
line, the sculpt of a piece, the plate's rim; the **secondary** is the device
and the trim — the charge on the canton, a piece's outline, the border's inner
stitch. Every row is a proposal the user may retune here; `data/leaders.json`'s
`colors` mirrors this table and a sync test holds the two together. No two
primaries may sit within the palette's hue distance of each other or of a
plain seat's ink.

The **hue distance is forty**, measured as `inkDistance` measures it
(`src/art/seatInks.ts`): a weighted RGB separation rather than a hue angle,
because two of these inks are greys and a grey has no hue. The register that
holds it is `test/render/seatInks.test.ts`, which names the offending pair.
A plain seat's second ink is **the board's own ink** (`palette.ink`), which is
what a charge is inked in today — so a roster with no figures in it wears the
colours it always wore.

| Leader | Primary | Secondary | Why |
|---|---|---|---|
| Pachacuti | maroon `#8b2635` | sun gold `#e0b21a` | the Sapa Inca's red fringe; the sun |
| Emperor Taizong | jade `#2e8b6e` | ivory `#f3ecd8` | Tang jade; court white |
| Modu Chanyu | sky blue `#3a78b5` | bone `#efe6d2` | Tengri's eternal blue sky; felt and bone |
| Akhenaten | sun orange `#e0852a` | lapis `#234b9a` | the Aten's disc; Egyptian blue |
| Al-Ma'mun | black `#1c1a1a` | gold `#d4a934` | the Abbasid black banner; gilt |
| Mithridates VI | Tyrian purple `#6b2d7a` | silver `#d8d8e0` | a Hellenistic king's purple; the star and crescent |
| Joan of Arc | royal azure `#2c3e9e` | gold `#d9a521` | the azure field of France, sown with gold lilies |
| Mansa Musa | Wangara gold `#e6c419` | indigo `#27306e` | the gold of the Bambuk washings; the indigo the Sahel dyes with |
| Zheng He | vermilion `#c8341b` | porcelain blue `#4a7fc1` | the cinnabar of the Ming seal; the blue of the wares the fleet carried |
| Nezahualcoyotl | turquoise `#1fb3a5` | ochre `#c98b2e` | the turquoise mosaic of an Acolhua crown; the reeds of the lake |
| Hypatia | papyrus `#e8dcae` | deep lapis `#1c3f7a` | the papyrus of the library; the sea under the Pharos |
| Hildegard of Bingen | viridian `#55a832` | vellum `#efe3c8` | *viriditas*, her own word for the greening; the leaf she wrote it on |
| Ibn Battuta | ochre `#b5651d` | sea teal `#0d6b78` | the mud brick of the Maghreb; the water he would not stop crossing |

## The cities (2026-09-11, `docs/flags.md` (pppp))

About fifteen a figure, in order of importance, from the empire the figure
ruled or the age it ruled in; a founded town takes the next name no standing
town anywhere wears, then the plain list, then a number. `data/leaders.json`'s
`cities` mirrors this table and a sync test holds the two together; the rows
are the user's to retune. Names are separated by ` · `.

| Leader | Cities, in order |
|---|---|
| Pachacuti | Cusco · Quito · Tumebamba · Cajamarca · Vilcashuamán · Huánuco Pampa · Hatun Xauxa · Machu Picchu · Ollantaytambo · Pisac · Pachacamac · Chan Chan · Vilcabamba · Choquequirao · Raqchi |
| Emperor Taizong | Chang'an · Luoyang · Yangzhou · Chengdu · Guangzhou · Taiyuan · Jiangling · Bianzhou · Hangzhou · Suzhou · Youzhou · Dunhuang · Liangzhou · Xiangyang · Fuzhou |
| Modu Chanyu | Longcheng · Ordos · Ivolga · Noin-Ula · Gol Mod · Terelzhiin Dörvölzhin · Boroo · Loulan · Turfan · Karashahr · Kucha · Barkol · Hami · Duurlig Nars · Yanran |
| Akhenaten | Akhetaten · Thebes · Memphis · Heliopolis · Abydos · Hermopolis · Elephantine · Thinis · Sais · Bubastis · Coptos · Edfu · Swenett · Buhen · Napata |
| Al-Ma'mun | Baghdad · Merv · Kufa · Basra · Raqqa · Damascus · Samarra · Mosul · Wasit · Rayy · Nishapur · Isfahan · Fustat · Aleppo · Bukhara |
| Mithridates VI | Sinope · Amaseia · Amisos · Trapezus · Cabira · Pharnacia · Eupatoria · Zela · Comana · Themiscyra · Panticapaeum · Phanagoria · Chersonesus · Laodicea · Gaziura |
| Joan of Arc | Orléans · Reims · Paris · Bourges · Chinon · Rouen · Tours · Poitiers · Blois · Compiègne · Troyes · Lyon · Bordeaux · Avignon · Domrémy |
| Mansa Musa | Niani · Timbuktu · Djenné · Gao · Walata · Kumbi Saleh · Kangaba · Taghaza · Tadmekka · Kukiya · Awdaghost · Takedda · Dia · Ségou · Bamako |
| Zheng He | Nanjing · Beijing · Taicang · Quanzhou · Ningbo · Changle · Zhangzhou · Malacca · Palembang · Calicut · Hormuz · Aden · Malindi · Semarang · Kunyang |
| Nezahualcoyotl | Texcoco · Tenochtitlan · Tlacopan · Huexotla · Coatlinchan · Teotihuacan · Otumba · Chimalhuacan · Acolman · Tepetlaoztoc · Chiconauhtla · Papalotla · Chiautla · Calpulalpan · Tepechpan |
| Hypatia | Alexandria · Cyrene · Ptolemais · Naucratis · Canopus · Pelusium · Antinoöpolis · Oxyrhynchus · Arsinoe · Berenice · Myos Hormos · Philae · Leontopolis · Nicopolis · Taposiris Magna |
| Hildegard of Bingen | Bingen · Rupertsberg · Disibodenberg · Mainz · Trier · Cologne · Worms · Speyer · Eibingen · Koblenz · Aachen · Frankfurt · Ingelheim · Lorsch · Sponheim |
| Ibn Battuta | Tangier · Fez · Marrakesh · Sijilmasa · Ceuta · Tlemcen · Tunis · Salé · Rabat · Meknes · Oujda · Bougie · Algiers · Tripoli · Kairouan |

Notes on the choices: Akhetaten leads Egypt's list because it is the city
Akhenaten built and ruled from, with Thebes and Memphis behind it. The
Xiongnu were a horse people with no cities of their own: Longcheng was their
gathering place, Ivolga and Terelzhiin Dörvölzhin their walled settlements,
Noin-Ula, Gol Mod and Duurlig Nars their great tomb grounds, and the Tarim
towns (Loulan, Turfan, Karashahr, Kucha, Hami) paid them tribute — ▢ the
user may prefer a shorter list here. Mithridates' list crosses to the
Bosporan kingdom he held (Panticapaeum, Phanagoria, Chersonesus). Al-Ma'mun
ruled first from Merv and then Baghdad; Samarra is the later Abbasid seat.

Notes on the second seven: Joan's list leads with Orléans, the town she
relieved, then Reims where she had the king crowned and Paris she never took;
Bourges is the seat Charles VII actually ruled from and Rouen is where she was
burnt, with Domrémy — the hamlet she was born in — last. Mansa Musa's is the
Mali of the hajj: Niani the capital, Timbuktu and Djenné the river towns,
Taghaza and Tadmekka the salt and the caravan stations, Kumbi Saleh the Ghana
capital his empire had swallowed. Zheng He's crosses the water on purpose — the
Ming ports first (Nanjing, where the Longjiang yard built the fleet, and Taicang
where it sailed from), then the stations of the seven voyages, Malacca to
Malindi, with Kunyang, the Yunnan town he was taken from as a boy, last.
Nezahualcoyotl's is the Acolhua half of the Triple Alliance, Texcoco first and
Tenochtitlan and Tlacopan beside it. Hypatia's is Greek Egypt and the ports of
the Red Sea run. Hildegard's is the middle Rhine: Bingen, the two houses she
founded or fled (Rupertsberg, Disibodenberg), then the sees. Ibn Battuta's is
the Maghreb he set out from and came home to, Tangier first.

## Notes for the system

- **Built state** (2026-09-12, batch L6a, `docs/flags.md` (xxxx)): the second
  cut is whole in `data/leaders.json` and read by the sim. Thirteen figures,
  each **two abilities** (live from the first turn, folded by `liveEffects`
  exactly as a doctrine is), **one unique unit** and **one unique building**
  (rows carrying `unlockedByLeader`, opened for the figure's seat by
  `isUnlocked` once the row's own technology has come — no age machinery). The
  draft is gone: no offer, no picks, no `leaders` phase, no `chooseLeaderCard`,
  no blocker. The first cut's other pieces (the Tambo, the Qollqa, the Fubing,
  the Post Station, the Whistling Arrow, the Chanyu's Guard, the Sun Court, the
  Valley of Kings, the Mihna Court, the Paper Mill, the Mithridatium, the
  scythed chariot) keep their marker, their rules and their prices and are
  opened by nobody — a bench, ready for a later figure.
  **Deferred, and annotated on the rows**: the Treasure Ship's second passenger
  (the escort clause counts one hull and one rider and takes no capacity from a
  row); the Scriptorium's doubled belief effects (there is no city-scoped
  amplifier over follower or founder lines); the Canoness's lump of production
  to every city (no occasion for a proclamation, and no grant shape that pays
  every town); Zheng He's lump for the first sea road to each foreign realm
  (nothing records a first contact); the Longjiang Dockyard's extra step for
  ships launched there (`unitStamp` carries hit points and strength, not
  movement).
- A leader is a seat's **persona** in the sim (`Player.persona` exists for
  bots) and a **charge and colour** in heraldry; each ability is a list of card
  effects on the seat, read by the same evaluator as a doctrine.
- Portraits are placeholders like everything visual; the heraldry canton
  carries the charge. No figure names one today (`LeaderDef.charge` is there
  and empty), so every seat falls back to its seat-order device.
- Three figures share a name with a great person on the roster (Zheng He,
  Hypatia, Ibn Battuta), so their sheet keys are `zhengHeOfMing`,
  `hypatiaOfAlexandria` and `ibnBattutaOfTangier`: an id is unique across the
  whole card table by construction. The **names** they print are the plain ones.
  ▢ the user may prefer the great-person rows renamed or retired instead.
- ▢ whether a leader locks a persona for bots (rec: yes — the spectator page
  then reads as a story).

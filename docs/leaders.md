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

**Ruled with the user, 2026-09-11.** The first cut (a bonus and a deck of twelve
drafted cards a figure) is superseded by this section; its tables under "The
starting six — the decks" stay until the second cut is built, because
`data/leaders.json` mirrors them and a sync test holds the two together.

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
| **Pachacuti** | Inca | wide · the mountain network — few citizens, much coin | cities joined to the capital by road +1 happiness +1 production | farms +1 gold per adjacent mountain | the Slinger, unslowed by hills | Terraces — farms may be cut into hills |
| **Emperor Taizong** | Tang | wide · the imperium | melee +1 strength +1 movement | garrisoned cities +1 happiness, +15% culture | Tang heavy cavalry | the Examination Court |
| **Modu Chanyu** | Xiongnu | wide · the steppe | mounted +1 movement on grass and plains; pillaging +50% | pastures +1 production +1 faith | the Xiongnu horse archer | the Horde Camp |
| **Akhenaten** | Egypt | tall · faith and wonders | cities with a holy site +20% production toward wonders | +1 faith on farms drinking fresh water | the Khopesh | the Obelisk |
| **Al-Ma'mun** | Abbasid | tall · science and faith | +1 science per five faith a turn, empire-wide | faith and science buildings +2 food | the camel archer | the House of Learning |
| **Mithridates VI** | Pontus | tall · defence and growth | +2 strength against empires with more cities | +2 food on plantations and camps | the Pontic peltast | the Mountain Hold |
| **Joan of Arc** | France | faith and war | *the Voices*: a kill pays faith and presses your faith on the nearest city | *the Maid*: +4 combat strength on any hex that follows your faith | the Gendarme — a heavy lance of the fourth age, +10 against cities | the Sainte-Chapelle — a temple line, +3 faith; military units may be bought here with faith |
| **Mansa Musa** | Mali | land commerce · gold and the hajj | *the Gold of Wangara*: mines and camps pay +2 gold; desert hexes worked pay +1 gold | *the Hajj*: routes to or from a city holding a holy site pay +2 gold +2 faith | the Mandekalu — a horseman line, pillaging pays double gold | the Sankore Madrasa — a library line, +1 science per four faith the city makes |
| **Zheng He** | Ming | wide · the sea | *the Treasure Fleet*: ships +2 movement and +1 sight | *Tribute of the Western Ocean*: sea routes pay +2 gold +1 culture; the first sea route to each foreign empire pays a lump of gold | the Treasure Ship — a great hull of the third age, strong and far-seeing (▢ carrying two passengers is a new escort shape) | the Longjiang Dockyard — a harbour line: ships built here +1 movement, +2 gold per sea route ending here |
| **Nezahualcoyotl** | Texcoco | tall · the engineer-poet | *the Dikes*: cities beside a lake or river pay +2 food +1 production | *Flower and Song*: +1 culture for every two citizens in the capital | the Eagle warrior — a swordsman line; a kill pays +5 culture | the Tetzcotzinco — an aqueduct line that waters the town, +2 culture, farms drinking fresh water +1 food |
| **Hypatia** | Alexandria | tall · the library city | *the Museion*: +25% renown; scholars' works pay +2 science | *the Commentaries*: every great person's work in your lands pays +2 science | the Alexandrian galley — a light hull with +1 sight | the Museion — a university line: +3 science, +2 renown toward scholars |
| **Hildegard of Bingen** | the Rhineland | tall · rites and song | *the Rites*: cities keeping a rite pay +2 culture +1 faith | *Symphonia*: temples and monasteries pay +2 culture | the Canoness — an apostle line with three charges | the Scriptorium — a monastery line: +2 faith +2 culture (▢ a rite said here presses twice as far — a new shape) |
| **Ibn Battuta** | the Maghreb | the traveller — the generalist who reacts to the map | *the Rihla*: meeting a new empire pays a lump of culture; the first route to each partner pays a lump of gold and science | *A guest at every court*: every distinct luxury your empire holds pays +1 gold +1 science +1 culture | the Rihla caravan — a trader that cannot be plundered | the Funduq — a caravanserai line, +1 route slot; each foreign route ending here pays +1 culture +1 science |

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
generalist, react to what you're given"*) pays off contact and variety rather
than any yield, so the map decides what he becomes; he carries **no wants and no
start bias**, since taking what he is given is the point, and every line is built
vocabulary (meeting and route lumps, the distinct-luxury count, the
unplunderable-trader rule, route riders). Thirteen is an odd count; the roster
carries it, or the user drops one later. Every ability above is written in the
card vocabulary the evaluator has today except the three marked ▢ in the table (Joan's soldiers bought with faith in one
building, the Treasure Ship's second passenger, the Scriptorium's farther rite) —
each a small new shape, deferred-and-annotated if not built.

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

### What building it costs

A held-stack change (nothing has landed): `LeaderDef` becomes `{abilities[2],
unit, building, colors, cities, startBias, charge}`; the six new figures are
rows (colours, cities and biases to write — this doc's tables the spec,
sync-tested); the draft command, offer, blocker and phase retire; the seat's
abilities join `liveEffects` from `newGame` (the bonus already does); a unique's
row opens for the figure's seat through `unlocksUnit`/`unlocksBuilding` at its
tech; the landing screen and leader sheet re-aimed; the mockup redrawn for four
lines; `docs/` follows.

## The starting six — the decks (2026-09-10; the first cut, superseded above — kept until the second cut is built)

Pachacuti · Taizong · Modu Chanyu · Akhenaten · Al-Ma'mun · Mithridates. Three
wide, three tall; the sea unrepresented in the first cut. **The draft**: when a
seat enters an age (its own tech age), it is shown that age's three cards from
its leader's deck — one **passive** (lasts the game), one **boon** (one time,
now), one **unique** (a unit or building of that age) — and takes one. Æra I's
row is offered at the first turn. Every line is written against a shape the
game has (a passive is a doctrine-weight card effect; a boon is a windfall or a
grant; a unique is a row with `unlockedByCard`-style gating). ▢ every figure.

### Pachacuti — wide, roads and growth (Inca)

leader bonus: farms gain +1 food for each adjacent mountain

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | workers gain +1 charge (the corvée) | +3 authority | **Terraces** — farms may be built on hills, +1 food |
| II | every city joined to the capital by road pays +1 happiness and +1 production | gain a random great engineer | slinger, replaces the age 2 ranged unit. +2 ranged combat strength and take no movement penalty from hills |
| III | cities connected to your capital cost 1 fewer authority | +10 production in every city joined to the capital | **The Tambo** — +1 route slot; domestic routes to or from here pay +1 food +1 production |
| IV | +10% science and +10% gold in every city with a mountain tile | a citizen in every city joined to the capital | **The Qollqa** — the city keeps a quarter of its food on growing, +2 production |

### Emperor Taizong — wide, the imperium (Tang)

leader bonus: melee units +1 combat strength and +1 movement, +2 culture in all cities (gain at the start of the game)

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | The great yangtze - cities settled next to rivers cost 1 fewer authority | +3 authority | **The Fubing** — a spearman line that costs no upkeep while garrisoned, cheaper to produce |
| II | garrisoned cities +1 happiness, +15% culture | the Xuanwu Gate: your next Order draft shows one more card and costs nothing | **The Examination Hall** — Orders in military slots pay +1 science each, +1 authority |
| III | a captured city costs 1 less authority; puppets pay +5 culture each | the Heavenly Khagan: every puppet pays 200 gold at once | **Tang heavy cavalry** — a horseman line, +2 strength, +2 combat strength if adjacent to a melee unit |
| IV | the great poets: great artist boons +100% culture and give +10% production and +10% culture for 5 turns | a knight musters in every city with a Barracks | **The Post Road** — +1 authority, +20% production in this city if connected to the capital |

### Modu Chanyu — wide, the steppe (Xiongnu)

leader bonus: mounted units +1 movement on grassland and plains, pillaging +50% yields

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | +1 prod and +1 faith on pastures | Horses are revealed, and a pasture is laid where your capital's nearest horses stand | **The Whistling Arrow** — a chariot archer line available from Husbandry, +1 range |
| II | pillaging costs no movement; pillaging gives extra health and +25 faith | every rival improvement within 2 hexes of your units is pillaged at once | **The Horde Camp** — improved pasture: +1 faith, military units regain all movement points when stepping on one |
| III | units +1 combat strength while a rite is active in your empire | a great general arrives | **The Xiongnu horse archer** — a horse archer line, +1 movement, hit and run |
| IV | puppets pay +30% science and +30% culture | every puppeted city gives 500 gold | **The Chanyu's Guard** — a stronger knight, +1 movement and +2 combat strength to adjacent ranged cavalry units |

### Akhenaten — tall, faith and wonders (Egypt)

leader bonus: +1 faith on farms adjacent to a river, cities with a holy site +20% production towards wonders

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | cities with an active rite +10% production towards wonders | a prophet arrives with Divination | **Obelisk** — a shrine that pays +2 faith and +2 production |
| II | holy sites +3 food and +3 faith on desert | gain 2 population in your capital | **The Khopesh** — a swordsman line, +3 strength in cities of your religion |
| III | cities with a wonder +10% food (total, not surplus) and +5 culture | gain a great engineer | **The Sun Court** — +3 happiness, +1 faith per 4 citizens |
| IV | cities following your religion -15% happiness cost | every foreign city that follows you converts fully | Valley of Kings - can only be built once in the empire. +10% culture in this city for every wonder in this city. Wonders can be rushed with faith |

### Al-Ma'mun — tall, science and faith (Abbasid)

leader bonus: faith and science buildings give +2 food, +10% science in cities with an active rite

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | +1 faith for every 2 population in your capital | your capital starts at 3 popultaion | Needs name: +2 food, gains +1 science for every great person you've recruited |
| II | +20% renown, faith buildings give +1 renown towards scholars | the Almagest: a peace signed pays a lump of science | **The Mihna Court** — +2 happiness; 10% of the cities faith is gained as science |
| III | gain +1 science per 5 faith per turn, empire-wide | +40 renown | Camel archer: replaces horse archer, +1 ranged strength for every great person improvement in your capital |
| IV | your orders that give faith are doubly effective | the Great Enquiry: a lump of science | **The Paper Mill** — +3 science +3 culture; routes ending here bring science |

### Mithridates VI — tall, defence and growth (Pontus)

leader bonus: +2 combat strength against empires with more cities (your own puppets not counted), +1 food on improved resources

| Æra | Passive | Boon | Unique |
|---|---|---|---|
| I | +2 food on plantations, camps | your capital starts at 3 population | **The Pontic peltast** — a spearman line that heals when it kills |
| II | +1 wildcard slot in every government | the royal physician: every city grows one citizen | **The Mithridatium** — replaces the garden, keeps all its effects and gains +2 happiness, +1 science per population in the city |
| III | internal trade routes supply +2 food and +2 science | your armies heal fully and a general arrives | **The scythed chariot** — a chariot line at Æra III, +3 against foot |
| IV | your units heal +5 every turn | the twenty-two tongues: gain +100 renown every time you perform a trade deal | **The Mountain Hold** — a citadel-building: +10 city strength, +2 food |

**Second set** (one per family, for later): Sher Shah Suri, Rajendra Chola,
Basil II, Sargon, Gwanggaeto, Tomyris, Bumin, Zenobia, Yongle, Emperor Wu,
Dandolo, Teuta, Hanno, Ulugh Beg, Abd al-Rahman III, Jayavarman VII, Justinian
and Theodora, Djoser, Ezana; Mansa Musa ▢. **Deferred** (the game-warping
seats): Joan of Arc, Rudolf II, Ludovico Sforza. **Cut**: Tigranes, Amanirenas.

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

Proposed biases (▢ each): Pachacuti — hills and river; Taizong — river and
grassland (the Yangtze passive); Modu Chanyu — grassland and plains, away from
hills; Akhenaten — river, floodplain, oasis; Al-Ma'mun — river, with a mild
coast; Mithridates — coast and hills (the Black Sea and the Pontic mountains).

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

Notes on the choices: Akhetaten leads Egypt's list because it is the city
Akhenaten built and ruled from, with Thebes and Memphis behind it. The
Xiongnu were a horse people with no cities of their own: Longcheng was their
gathering place, Ivolga and Terelzhiin Dörvölzhin their walled settlements,
Noin-Ula, Gol Mod and Duurlig Nars their great tomb grounds, and the Tarim
towns (Loulan, Turfan, Karashahr, Kucha, Hami) paid them tribute — ▢ the
user may prefer a shorter list here. Mithridates' list crosses to the
Bosporan kingdom he held (Panticapaeum, Phanagoria, Chersonesus). Al-Ma'mun
ruled first from Merv and then Baghdad; Samarra is the later Abbasid seat.

## Notes for the system

- **Built state** (2026-09-10, batches L2a → L3c, `docs/flags.md` (dddd)
  and (iiii)): every **leader bonus**, **passive** and **unique** line in
  the six tables above is whole in `data/leaders.json` and read by the
  sim; the **boons** are built where a windfall or grant could say them,
  and sixteen boon halves stand as a plain "not yet" line on the card
  (three boons do nothing yet: The Horse Lords, The Great Raid, The
  Great Conversion). ▢ the boons as a column
  at all is the user's open question. Two readings the tables left
  open were settled by the doc's own words: the Camel Archer counts the
  works **in the capital**; Pachacuti's farms pay **per** mountain.
- A leader is a seat's **persona** in the sim (`Player.persona` exists for
  bots) and a **charge and colour** in heraldry; each bonus is one card effect
  on the seat, read by the same evaluator as a doctrine.
- Portraits are placeholders like everything visual; the heraldry canton
  carries the charge.
- ▢ how many at launch (rec: eight, one per sub-identity plus Mithridates and
  Rudolf), ▢ whether a leader locks a persona for bots (rec: yes — the
  spectator page then reads as a story), ▢ two or three bonuses per leader.

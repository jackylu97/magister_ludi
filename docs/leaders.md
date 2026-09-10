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

## The starting six — the decks (2026-09-10)

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

**Built** (batch L2a, 2026-09-10; `docs/flags.md` (dddd), schema 113). The six
decks above are `data/leaders.json` beside each figure's `startBias`: a `bonus`
of ordinary card effects, live from the turn the seat sits down, and a `deck` of
four rows of three cards. `Player.leader` carries the figure, `Player.leaderPicks`
the card taken per age and `Player.leaderOffer` the three on the table now. The
row is dealt in a `leaders` phase directly after `advanceResearch` — the seat's
**own** age, `highestAge`, never the world's clock — Æra I's with the board;
`chooseLeaderCard {playerId, index}` takes one and the other two are gone. A
taken passive is `liveEffects`' twelfth source beside the bonus, a taken boon
pays once through the bead's `payWindfall` and the wonder's `payGrants`, and a
taken unique opens a row carrying `unlockedByLeader` — twenty-four new rows in
`units.json` and `buildings.json`, each with its own `column` because no
technology prices them. The Compendium walks the six on a `leader:id` shelf, one
page a figure. The bots appraise the three through `explainEffects`, `explainLump`
and the row's own appraiser (`src/ai/leader.ts`).

**The screens** (batch L2b, 2026-09-10; the mockup of the same day is the spec of
record). Three of them, and each walks the table rather than listing it — a
seventh figure appears on all three with no page edit, and nothing on any of them
names a leader or a card:

- **The new game** (`src/ui/leaderSelect.ts`, a second card on the landing beside
  the map's): one button a figure, each with the seat's canton, the leader bonus
  through `describeCard`, and — for the one chosen — the Æra I row's three cards
  in the three inks. *No leader* is the default, so the game that was one press of
  Start away still is and its config is byte-identical to one from before figures
  existed. The chosen figure goes onto seat 0 and **the rivals take the remaining
  figures in sheet order** (`rivalLeaders`) — no draw, because a leader rides into
  `GameConfig` and a table dealt from `Math.random` is a table a save cannot
  replay. Nobody is seated when you are not.
- **The age's draft** (`src/ui/leaderDraftSheet.ts`, the thirteenth sheet on
  `modalShell.ts`): raised by the `leaderDraft` blocker, three cards in the three
  inks, each with its clauses, what its lump hands over (`describeBeadBoon` and
  `grantWords` at this card's own moment), the row a unique opens in the row's own
  figures, and a **"today it would pay"** stamp — `explainCardImpact` with the
  pick ghosted into `Player.leaderPicks`, which is the empire's own ledger read
  twice and therefore the figure the turn resolution will bank. A card is picked
  up and the foot's button spends it: the sheet asks twice, because the two cards
  beside the one taken are gone. The capital rule speaks in the `.wanting` voice.
- **Your leader** (`src/ui/leaderSheet.ts`, the fourteenth, behind a fifth door on
  the HUD dock wearing the seat's own charge): the bonus and one block an age —
  the card taken, the two left greyed beside it, a locked row's three with a plain
  sentence naming the technologies that open the age — beside a ledger of **every
  line in the empire's books carrying the leader's name**, gathered from
  `readEmpire`'s own lists by the card id on the line (and from the two meters by
  the evaluator's class word, since `MeterContribution` carries no id). Nothing on
  it is computed. Because a row never expires, this sheet is also the way back to
  one the seat still owes.

The spectator page names each seat's leader in its roster and seats one a chair
in sheet order, so a leader draft is a decision the feed can show.

**One rule the sheet did not name**: a figure's row is on the table from the
first turn, but nobody may answer it until their realm has a town — three of the
six opening boons hand over something a *town* receives, and a pick taken before
the capital exists would pay them into nothing. The row waits; it is never lost.

**Every line the vocabulary could not carry**, deferred and annotated on the card
(never bent — CLAUDE.md rule 7). Three cards are deferred **whole** and do
nothing at all: Modu's *The Horse Lords* (nothing reveals a resource or lays an
improvement), Modu's *The Great Raid* and Akhenaten's *The Great Conversion*
(no shape empties or converts a neighbourhood at a stroke), and Mithridates'
*The King's Friends* (no card widens a government's slots). The rest are halves:

- **Pachacuti** — the bonus pays a farm once however many mountains ring it;
  Terraces do not make a hillside farmable that would otherwise refuse a farm;
  the Slinger is not quickened on hills; The Tribute Road makes *every* town
  cheaper to hold rather than only those joined by road, and The Storehouses
  Opened and The Levy of Hands likewise reach every town.
- **Taizong** — The Great Yangtze makes every town cheaper to hold rather than
  only those beside a river; the Fubing is free to keep anywhere in your own
  lands rather than only while garrisoned; The Xuanwu Gate widens every Order
  draft from now on rather than the next one alone, and does not make it free;
  The Heavenly Khagan's puppets send no culture; The Tribute of the Khaganate
  and The Muster of the Provinces each pay once at the seat rather than once per
  puppet or per barracks; The Great Poets lift every great person's act rather
  than the artists' alone, and hang no timed quickening.
- **Modu** — the bonus keeps its extra pace on any ground; the Horde Camp gives
  a column no marching back; The Rite of the Sky is kept whether or not a rite
  burns; The Tribute of the Han pays per puppet *citizen* rather than as a share
  of what puppets make; The Silk Tribute pays once at the seat; the Chanyu's
  Guard emboldens nobody beside it.
- **Akhenaten** — the bonus pays a farm beside any fresh water, lake or river;
  the prophet comes at once rather than with Divination; the Khopesh is stronger
  anywhere your faith is kept rather than only inside a town; The House of
  Millions of Years counts only a great work that pays culture; the Valley of
  Kings counts the realm's great works rather than its own town's, and cannot
  hurry one along with faith.
- **Al-Ma'mun** — The New City adds two citizens rather than setting the seat at
  three; the House of Learning does not read the great people you have called;
  The Almagest pays its science now rather than at the next peace; the camel
  archer's arrows do not sharpen for a great person's work.
- **Mithridates** — The King's Court adds two citizens rather than setting the
  seat at three; the Pontic peltast's mending on a kill is given to every piece
  rather than to the peltast alone; The Army Restored calls a general and mends
  nothing; The Twenty-Two Tongues pays its renown once rather than at every
  bargain struck.

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
  Nile's valley, not the Sahara.
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

**Built** (batch M1). The six rows are `data/leaders.json` (`leaderData.ts`), one
`startBias` each: ground weights, resource and luxury multipliers, furnishing
kinds. A seat names its figure in the game config (`PlayerSpec.leader`,
refused by `validateConfig` if the sheet does not carry it), which makes the
roster a fourth input to the map beside the seed, the size and the override
sheet — and a roster with no figures in it generates the map it always
generated, tile for tile. Stage one is `chooseStartPositionsFor`
(`startPositions.ts`), stage two the scatter's tile draw and the continent's hand
(`resources.ts`), stage three `ensureStartFurnishing` beside the other
guarantees. The cap is `starts.biasCap` and it is **approached, never reached**:
a hard clamp was measured to flatten every good site onto one number and hand the
choice back to the unbiased score. The reference is `docs/mapgen.md`, "The
leaders' three stages" — the knobs, the measured before-and-after table, and the
one ▢ that came back the other way: the luxury guarantee's fallthrough **stays**,
because hand-or-nothing left four per cent of the possible starts short of the
kinds they are promised. The mapgen page seats the six behind its Leaders switch
and prints each seat's bias lines and its furnishing.

**M1b — the wants.** The capped score was measured and it moves the odds a few
points; it cannot deliver a need. So a row may also carry `startBias.wants` — a
mountain within two, a river within one — and the chooser gives that seat the
best **accepted** site that answers all of them, falling back to the soft-scored
best where the map has none (never a rejection, so the legality sweeps hold).
The seats with the most wants are served first, ties by roster index. With the
wants and one furnishing that names a row rather than a kind (Modu's horses),
every criterion in the sweep holds on every one of twenty-four seeds, and the
seats pay at most a couple of points of site quality for it. Nothing else of a
leader is built: no deck, no passive, no boon, no unique.

## Notes for the system

- A leader is a seat's **persona** in the sim (`Player.persona` exists for
  bots) and a **charge and colour** in heraldry; each bonus is one card effect
  on the seat, read by the same evaluator as a doctrine.
- Portraits are placeholders like everything visual; the heraldry canton
  carries the charge.
- ▢ how many at launch (rec: eight, one per sub-identity plus Mithridates and
  Rudolf), ▢ whether a leader locks a persona for bots (rec: yes — the
  spectator page then reads as a story), ▢ two or three bonuses per leader.

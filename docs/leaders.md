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

## The starting six (re-decided 2026-09-10 on the user's second pass)

One per family, each drafting across at least two systems, on a spectrum from
"the game as usual, a little better" to "a different game"; one eastern and one
Middle Eastern seat among them. The user's own bullets under each entry below
are the deck; nothing is cut from them here.

| # | Leader | Family | Spectrum | Dimensions |
|---|---|---|---|---|
| 1 | **Pachacuti** | wide — the imperium | generically strong | roads, road-joined towns, the corvée, hills and growth |
| 2 | **Akhenaten** | tall — faith and wonders | generically strong | early prophets, desert holy sites, wonders in holy cities, the Nile's farms, the khopesh |
| 3 | **Mithridates VI** | tall — defensive, the come-back | middle | strength against wider realms, gardens (happiness, authority), science from soldiers, food |
| 4 | **Ulugh Beg** | tall — science and renown (the Middle Eastern seat; the user is reworking him) | middle | the Observatory, science buildings' culture, renown from technologies, the Turning Heavens |
| 5 | **Yongle** ▢ (rec) | wide — sea commerce (the eastern seat) | situational | the treasure fleet, tributary trade, the canal, the Forbidden City — entry below |
| 6 | **Modu Chanyu** | wide — the steppe | situationally very strong | pillage and mobility, tribute, rites → strength, mounted archers per age |

Djoser and Basil II step down to the second set (the user: faith + wonders is
the more interesting tall seat; Pachacuti the imperium). ▢ the Chinese wide
sea-commerce seat: **Yongle** (rec — the emperor behind Zheng He's treasure
fleets, the Grand Canal reopened, the capital moved to Beijing) or **Emperor
Wu of Han** (the Silk Road's opener and the Xiongnu's enemy — land commerce
and war, and a historical foil to Modu at the same table); both entries are
below. Joan of Arc joins the deferred set. Cut: Tigranes, Amanirenas.

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

  themes: tall, science by patronage
  possible bonuses:
  - a peace signed pays science
  - the capital's science buildings pay +1 science per 3 citizens more
  - a scholar great person costs a third less renown
  - +2 science per trade route ending in the capital

- **Ulugh Beg** (Timurid, r. 1447–49) — the astronomer-king of Samarkand, whose
  observatory's sextant was forty metres across and whose star catalogue stood
  for two centuries; murdered by his son a year after taking the throne.

  themes: tall, science, renaissance-punk
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

## Notes for the system

- A leader is a seat's **persona** in the sim (`Player.persona` exists for
  bots) and a **charge and colour** in heraldry; each bonus is one card effect
  on the seat, read by the same evaluator as a doctrine.
- Portraits are placeholders like everything visual; the heraldry canton
  carries the charge.
- ▢ how many at launch (rec: eight, one per sub-identity plus Mithridates and
  Rudolf), ▢ whether a leader locks a persona for bots (rec: yes — the
  spectator page then reads as a story), ▢ two or three bonuses per leader.

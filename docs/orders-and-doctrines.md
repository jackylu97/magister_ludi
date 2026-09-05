# Orders and Doctrines — the master list

Every Order, Doctrine and government in one place, tables only. **Regenerated from
`data/statecraft.json` 2026-09-05** — the Effect column is each row's own ratified `text`;
counts and tiers are the data's (pools: Chiefdom 11 · Gov I 29 · Gov II 45 · Gov III 46 ·
Gov IV 16 · Gov V 11; doctrine tiers ride the ladder 4/10/18/29/45). Edit here; the two working docs (`deprecated/statecraft-cards.md`, `deprecated/statecraft-ages-3-5.md`) keep the commentary and are no longer the source. Tier: ● defining · ◆ strong · ○ situational (blank = not yet tiered).

**As built, 2026-08-28 (second pass)** — six of those halves are built and the shapes are
generic:

- **Tyranny** *(−30% unit maintenance)* and **The Standing Army** *(no upkeep at all)* — the
  eighth `CardRule`, `unitUpkeep`, folded as its **own labelled line** in
  `explainEmpireGold` beside the gross payroll (`explainUnitUpkeepRebate`). The gross list
  stays gross, so the creditors' disband choice is the same under every government.
- **The Curia** *(faith buildings supply science equal to their faith)* — `mirrorYield`,
  read in `cityYields` off the buildings' own category and their own faith, never the town's
  total. A **flat** line, so it lands before Entry XVII's percentages.
- **The Commonwealth** and **The Magisterium** *(great people bought with gold / faith)* —
  a great person is still **called**: what is for sale is the *recruitment*. The new
  `purchaseGreatPersonOffer { playerId, currency }` charges the bank and pours the remaining
  renown through `settleRenownWindfall`, so there is one draft path and `chooseGreatPerson`
  still answers. Gated by `actionRule` `buyGreatPersonWithGold` / `…WithFaith`; priced at
  `rules.greatPeople.offerPriceGold` (300💰) / `offerPriceFaith` (150🕯).
- **The Commonwealth** *(great-person improvements pay +50% more)* — `tileYield.percent`
  plus `TileCondition.greatWork`, read in `explainTileYield` as one more labelled line
  computed off the **improvement's own** entries. It never multiplies the terrain, the river
  or another card.
- **The Empire** *(capturing a city with a wonder heals all your units)* —
  `WindfallOccasionFacts.capturedWonder` (read before the town changes hands, which is the
  only moment anything still knows) and `WindfallGrantSpec.healAll`.
- **The Encyclopaedia** *(science buildings cost −50%)* — `productionBonus.buildingCategory`,
  read off `BuildingDef.category`, so a second science building is a JSON row.
- **The Grand Tour II** *(+1🎵 per wonder in the world, seen or not)* —
  `CountKind.worldWonders`, off `GameState.wonders`: the claim register is the one place a
  wonder is written down and never moves, so there is no fog clause to get wrong.
- **The Academy of Deeds** *(every Triumph pays its renown twice over)* —
  `AmplifierTarget.triumphRenown`, folded into the printed figure in `awardTriumph` before
  `settleRenownWindfall` banks it, so the annal and the pool are one number.

**As built, 2026-09-04 (the card-shapes pass, `docs/card-shapes.md`)** — nine rows, two
retirements and five small vocabulary additions, each read by a live row:

- **The deck-readers** — The War Council · The Guild Charter · The Synod. One `CountKind`,
  `slottedOrdersOfSlot`, plus its twin on `CombatScale`, both answered by one reading
  (`slottedOrdersOfFlavour`): a card's **own** slot flavour, never the chair it sits in
  (the user's Senatus, verbatim). A reader counts itself, so its floor is one helping and
  its figure visibly moves when a card of its kind is slotted beside it.
- **The conversions** — The Harvest Songs (food → culture) · The Salting Houses (coastal
  food → production) · The Drafting Halls (production → science, in Library towns) · The
  Golden Scales (gold → science). All Thalassocracy's `yieldConversion` with a different
  pair and scope; no new shape at all. The building-scoped ones ride `CityScope`'s
  `hasBuilding`, which already existed.
- **The Arsenal Law** — `EmpireCondition`'s `atWar`, read off `state.wars` itself rather
  than through `atWar(a, b)`: the wild is never in the register, so a realm that has
  declared on nobody reads false however many camps it has burnt.
- **The Charter of the Marches** — `CityScope`'s `newest` (the last entry of
  `state.cities` this empire owns — founding order, the order every sweep walks) and
  `WindfallOccasion`'s `found`, fired at the end of `foundCityAt`. That occasion and
  `foundingRider` are two questions about one moment: the rider says what the **town** is
  founded with, the occasion says what the **realm** is paid for founding it.
- **`CardPayout`'s `capital`** — declared since the shape was written and read by nothing
  until The Guild Charter's hammers. An empire line has no basket for food or production
  (`collectYields` banks only gold, science, culture and faith), so a hammer counted across
  the realm has to name a town to be built in.
- **Retired**: The Salt Road (The Golden Scales stands in its place) and Hearth Songs (The
  Harvest Songs). Both rows stay for saves, out of every pool and out of the tables above.

**As built, 2026-09-04 (the growing cards and the war order, `docs/flags.md` queue item 6)**
— six rows out of the proposed blocks and into the pools above, on one new schema field
and no new effect shape:

- **The growing cards** — The Ballad-Weavers · The Bell-Founders · The Reliquary Rolls ·
  The Chroniclers of the Fallen · The Almoners' Book. One counter per **owned Order**
  (`PlayerStatecraft.tallies`, schema 65), written in one place
  (`recordScalingOccasion`) and **only while the card is in a slot** — the standing
  ruling: the bench is never productive, nothing is retroactive, and a card benched at
  seven resumes at seven. What it pays is an ordinary `countScaled` line reading
  `CountKind`'s new `tally`, so the card face, the ledger's `×7` label and the stamp are
  the ones every other counting card already uses.
- **The occasions are the seams that already existed** — the battle riders (a barbarian
  killed; one of yours fallen, in battle and not to famine or a disband), `claimWonderFor`
  (a wonder finished *anywhere*, written into every realm's books — the one world
  occasion the design allows), `spendGreatPerson`, and the gold branch of
  `purchaseItemAt`. The Almoners' Book banks the **coin**, not the purchase, so its
  divisor keeps the remainder and four small buys pay exactly as one large one.
- **The Casus Belli** — `WindfallOccasion`'s new `declareWar`, fired for the declaring
  seat in `declareWarAt`, hanging an ordinary `grant.timed` on the empire: a labelled
  strength line on the combat ledger and a city-stage production percentage, both
  expiring by comparison ten turns on. A benched Casus Belli sees the declaration and
  pays nothing; one unslotted afterwards keeps what it already bought.

**As built, 2026-09-04 (the eleven charters, `docs/flags.md` queue item 6)** — the second
half of the sheet's proposed blocks, out of them and into the pools above. **A charter is an
Order that opens a building while it is slotted** — the Gilded Court's mechanism
(`cardUnlocksBuilding`), with the Gilded Court's standing rule: built copies stand for ever,
and unslotting only stops you raising more. All eleven open a **new** row of their own; no
charter opens anything the tree names (the user's amendment of the same day — the batch
first had two of them opening the tree's Mint and Observatory *early*).

| Charter | Pool · Slot | Opens | Cost | What the building does | Where the fact is read |
|---|---|---|---|---|---|
| The Rites Charter | I · W | **Chapel** | 53 (temple) | +1🕯; a rite performed here pays +5🎵 | `ritePays` → `performRiteAt` |
| The Vigil Charter | I · M | **Keep** | 55 (stone walls) | +25 city hp; friendly units resting in or beside the town mend +5 | `cityHp` → `cityMaxHp`; `healsAdjacent` → `healUnits` |
| The Scriveners' Charter | II · W | **Scriptorium** | 134 (university) | +2🔬; +10%🔬 with an academy inside the borders | `percentYields` + `hasImprovement` |
| The Coin Charter | II · E | **Assay House** | 180 (bank) | +2💰; the town's **gold** purchases cost 5% less (the faith bank is untouched) | `purchaseDiscount` → `explainPurchaseCost` |
| The Waterwrights' Charter | II · E | **Cistern** | 59 (aqueduct) | +2🌾; the town counts as watered; desert hexes +1🌾 | `waters` → `cityIsWatered`; `tileYields` |
| The Senatus | II · W | **Assembly Hall** | 92 (examination hall) | capital only; +2 authority; +1🔬 +1🎵 per wildcard Order slotted | `requiresSite: capital`; `countScaled` · `slottedOrdersOfSlot` |
| The Toolmakers' Charter | II · E | **Smithy** | 69 (workshop) | +2⚒; +1⚒ per military Order slotted | `countScaled` · `slottedOrdersOfSlot` |
| The Mint Charter | III · E | **Coinworks** | 180 (bank) | +2💰; a tenth of the town's gold is paid again as culture | `yieldConversion` → `cardYieldConversions` |
| The Almshouse Charter | III · W | **Almshouse** | 106 (monastery) | civilians and caravans may be bought with faith here | `faithPurchases: 'civilian'` |
| The Stargazers' Charter | III · W | **Orrery** | 134 (university) | +1🔬; +10%🔬 with a mountain within two hexes | `percentYields` + `mountainAdjacent` radius |
| The Justices' Charter | III · M | **Assize Court** | 100 (courthouse) | +1 authority; −15% of the town's crowding | `crowdingRelief` → `explainHappiness` |

Three decisions worth the user's eye:

- **A charter's building is the charter's** (the user's amendment, 2026-09-04). The batch
  first pointed the Mint Charter and the Stargazers' Charter at the tree's own Æra IV Mint
  and Observatory (Paper Money, The Astrolabe), opening them *early* rather than shipping a
  second row with the same name. The user asked for different names instead, so those two
  charters now open the **Coinworks** and the **Orrery** — new rows, named by no node,
  priced off the vanilla building each is a variant of exactly as the other nine are. The
  Mint and the Observatory do exactly what they did before the charters shipped; the one
  edit either row keeps is the Observatory's own deferral, whose stated blocker (nothing
  could measure how far a peak was from a town) the Orrery's radius has since answered — so
  the line says what still waits and no longer says why. `isUnlocked`'s clause keeps the
  general rule it grew — a card stands in *front* of the tree's gate, never in place of it —
  read by no row today.
- **Every clause lives on the building**, not on the Order, all eleven times. A building's
  own `effects` are read city-locally (`cityBuildingEffects` → `liveCityEffects`), so the
  Senatus' and the Smithy's slotted-Order counts, the Coinworks' `yieldConversion` and the
  Orrery's mountain percentage all ride the row that pays them. An Order's text is one
  sentence — "Unlocks the …" — and a town that raised the building keeps what it does when
  the card leaves the spread, which is the standing rule stated once rather than twice.
- **A charter building pays no maintenance**, because `buildingUpkeep` prices a row off the
  age of the technology that names it and no technology names these. Deliberate for now and
  the user's call: a charter that also cost coin per turn is a different card.

**A deferred half still stands on**, and each waits on a system the game does not have: The
Curia (the Cathedral) · The Academy of Deeds' second half (a missed Triumph is closed for
good — reopening one is a change to `awardTriumph`'s `perAge` register) · Cuius Regio (two) ·
The Levée en Masse (nothing happens when a border is crossed) · Religious Mandate
(diplomacy) · **the Cistern's farms** (a building may water a *town* and nothing waters a
*hex* — `cityIsWatered` and `TileCondition.freshwater` are two different questions, and the
row ships the town's half with the field's half struck through).

**As built, 2026-09-05 (the cards pass, `docs/cards-pass-2.md`)** — the two late Order
pools, eight cuts, eight modifications, nine new rows and the deferred late Doctrines,
on **one** new vocabulary member.

- **Government IV and Government V are pools** (`OrderPool`, `ORDER_POOLS`,
  `poolOfGovernment`). Every rung of `tierLadder` now opens a shelf of its own: tier 29 →
  `governmentIV`, tier 45 → `governmentV`, where both used to fall through to Government
  III. A full game drew no card it had not seen after Æra III until this landed, and the
  reward for adopting at the fourth rung was a wider council with nothing new to seat.
  `livePool` is unchanged — the current pool alone, minus what the empire holds.
- **The one new shape** is `CountKind`'s `roadHexes`, The Long Roads' count: an index sweep
  over `Tile.road`, which `layRoad` is the only writer of. It counts the hexes *you laid*
  rather than the ratified "inside your borders to its nearest city" — a payout routed to a
  particular town would need a second answer to "which town is nearest", and the borders
  move under a road that does not.
- **Eight rows retired** (dead weight, duplicates or invisible): Militia Levies · Horse
  Lords · The Muster Roll · Land Grants · The Shield Wall · The Quartermasters · The Common
  Purse · Public Granaries. Kept for saves, out of every pool and out of the tables above.
- **Eight rows modified**: Far Runners pays for looking (every unit +1 sight, and a ruin
  claimed pays culture) · River Wardens lost its garrison clause · The Great Warring Tribes
  is two clauses · Spoils of the Wild prints the Camp Followers stack · Village Fairs is
  uncommon · Bread and Circuses pays 2 · The Scattered Hearths waives 2 · Conscription keeps
  its flat −2 (nothing can count only the cities past a fourth).
- **Nine new rows** fill the holes the pass found: The Founding Oath (the Chiefdom's first
  rare) · The Long Roads · The Reckless Levy · The Tithe of Iron · Bread Alone · The
  Congregation · The Granary Laws (Orders) and The Horse-Tribes (a Doctrine, carrying the
  mounted line Horse Lords left). **The Tide-Reckoning is not built**: no route knows
  whether it went by sea, and an amplifier on a route's pay has no scope to say so.
- **The late Doctrines pay what they print**: The Sea Charter, The Renaissance Court,
  Absolutism, Pax Magistri and The Philosopher's Stone ship their stock halves with the
  rest struck from the text; Blitz, which had no stock half at all, is retired.

## Themes (the archetype lines)

| Line | Playstyle | Ideas |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy |  |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates |  |
| 🌱 **The Green Belt** | tall growth |  |
| ⚒ **The Forge Levy** | wide production, war |  |
| ✶ **The Star Chart** | science |  |
| 🕯 **The Procession** | faith engine |  |
| 🧭 **The Wayfarers** | exploration |  |
| 🏛 **The Marble Court** | wonders, renown, great people |  |
| ⚓ **The Tide** | trade routes, the sea, coastal empire |  |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle |  |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work |  |
| ☽ **The Cloister** | spiritualism — faith + science |  |
| 📜 **The Charter** | expansionist — wide cities → authority → more settling |  |
| 🌾 **The Ploughshare** | agrarian — stacking yields on farms |  |
| ⛰ **The Highlands** | mountains — hills and mountain bonuses |  |

## Governments

| Tier | Government | Slots M/E/W | Signature |
|---|---|---|---|
| 0 | Chiefdom | 1/1/1 | — |
| 4 | Council of Elders | 0/2/3 | +3 happiness · +1 renown per turn per city |
|  | Priest-King | 1/2/2 | +2🕯 per city |
|  | War Chief | 3/1/1 | +1 combat strength per 2 cities you hold (max +3) · killing a unit grants +5🔬 and +5🎵 per slotted Order |
| 10 | Republic | 1/3/3 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 1/2/4 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a tenth of the rate. |
|  | Tyranny | 3/1/3 | +3 authority capacity. Pillaging pays +50%. |
| 18 | Divine Mandate | 3/3/5 | happiness tiers +5pp · +1🎵 per 5🕯 gained per turn |
|  | Imperium | 5/3/3 | +3 authority capacity. All units +1 movement. |
|  | Merchant League | 2/5/4 | +1 gold for each building that produces gold. Trade routes pay 50% more. |
| 29 | The Curia | 4/4/5 | +3 faith for each Cathedral. Faith buildings supply science equal to their faith. · †deferred |
|  | The Estates | 3/5/5 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 6/3/4 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 3/7/6 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 7/4/5 | +6 authority capacity. +1 combat strength for each great general you have earned this game. |
|  | The Magisterium | 4/5/7 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

## Doctrines

### Pool I (tier 4)

| Doctrine | Line | Effect |
|---|---|---|
| The Hermit Crown | 🌱 | While you hold at most 4 cities: +30% to every yield in your capital. |
| River Kings | 🌱 | +30% food in every city on fresh water; −10% food and −10% production in every city without it. |
| The Woodwrights | ⚒ | Clearing a forest or jungle pays +100% and grants +10 culture. |
| The Great Litany | 🕯 | +1 culture for each 3 faith you gain per turn. |
| Wolf-Mother's Pact | 🏹 | Barbarians you kill join you at full health. |
| The Founders' Road | — | Newly founded cities are joined to your nearest city by road · +1 culture in every city. |

### Pool II (tier 10)

| Doctrine | Line | Effect |
|---|---|---|
| Thalassocracy | 🐫 | Coastal cities gain 10% of their food yield as gold. |
| The Burning Way | ⚒ | Clearing a forest or jungle costs no worker charge. · †deferred |
| The Sacred Path | ⚒ | +1 faith on every forest hex · +1 culture on every jungle hex. |
| Bread and Circuses | 🌱 | While your authority is positive: +2 happiness in every city of 6 or more population. −2 gold in every city, always. |
| The Tithe | 🕯 | +1 gold for each faith you gain per turn. |
| Divine Inspiration | 🕯 | +1% science and +1% culture for each 200 banked faith. |
| The Gentle Yoke | 🌱 | −15% happiness demanded per citizen · every city costs 2 more authority. |
| The Scattered Hearths | 🌱 | The first 2 citizens in every city demand no happiness · −4 happiness in your capital. |
| The Horse-Tribes | ⚒ | Mounted units gain +1 movement. · †deferred |
| The Great Warring Tribes | ⚒ | While your authority is negative: +10% production toward units. Captured cities pay +5 science and +5 culture. |

### Pool III (tier 18)

| Doctrine | Line | Effect |
|---|---|---|
| The Iron Price | ⚒ | Killing a unit grants +15 culture · pillaging pays +15 gold. |
| Manifest of the Steppe | — | Settlers cost 40% less to train and have +2 movement · every city demands +1 happiness. |
| The Gilded Court | 🐫 | Unlocks the Gilded Hall, a building that is bought with gold and never built. +1 science and culture on all tiles that yield gold. +1 authority |
| The Grand Bazaar | 🐫 | Happiness from unique luxuries +50%. A second or later copy of a luxury pays 30% of its bonus instead of nothing. +2 gold for each unique luxury. |
| Master of Maps | 🧭 | All units +1 sight and +1 movement · all units −2 combat strength. |
| Hegemony | ⚒ | +1 authority capacity for each city you hold · a captured city costs one less authority. |
| Pax Imperia | 🌱 | +3 happiness and +3 culture in every city of 8 or more population. |
| The Wandering Court | 🌱 | −15% to every yield in your capital · +3 food, production, science, culture and faith, and +3 happiness, in every city but your capital. |

### Pool IV (tier 29)

| Doctrine | Line | Effect |
|---|---|---|
| The Academy | — | -10% culture, +20% science. Can purchase great scholar drafts with faith (1000 faith) |
| The Standing Army | ⚒ | +1 authority capacity for each 5 units you have in the field. −1 happiness in every city. Units cost no upkeep. |
| The Sea Charter | 🐫 | Trade routes pay 50% more. |
| The Renaissance Court | — | Great-person offers show one more card. |
| Cuius Regio | 🕯 | In cities that follow your religion, 15% of your faith yield is converted into science |
| The Yeomanry | 🌱 | +1 production on every hex with a Farm. Cities of 10 or more population −1 happiness. |
| Absolutism | — | +6 authority capacity. A newly placed Order is locked for 10 turns instead of 5. |

### Pool V (tier 45)

| Doctrine | Line | Effect |
|---|---|---|
| The Philosopher's Stone | — | The Magnum Opus is built 25% faster. |
| The Grand Tour | — | +3 renown per turn for each wonder you hold. +1 culture for each wonder in the world, seen or not. |
| Mare Nostrum | 🐫 | +1 food and +1 gold on every water hex you own. Coastal cities cost no authority. |
| Pax Magistri | 🌱 | +3 happiness in every city. +5 science and +5 culture in every city of 12 or more population. |
| The Encyclopaedia | ✶ | +1 science for each building in a city. Science buildings cost −50% production. |
| The Triumphal Way | ⚒ | Capturing a city grants +5 happiness in every city for 10 turns. |

### Parked (tier 0 — offered in no pool)

| Doctrine | Waits on | Effect |
|---|---|---|
| Religious Mandate | permanent war with empires of another faith; your cities cannot be converted; a powerful bonus toward the domination and religious beads | Permanent war with empires of a different majority religion · your cities cannot be converted. |
| The Closed Realm | your happiness is held at +5 whatever your cities ask for; your units cannot attack outside your own territory | Your happiness is fixed at +5, always · your units cannot attack outside your territory. |

## Orders

**Rarity** (built 2026-09-04): ● common · ◆ uncommon · ○ rare, and the mark in each row's
Rarity column **is** `OrderDef.rarity` in `data/statecraft.json` — a sync test pins the two
together, and a blank mark reads as common. Read by the draw as a *weight, never a
restriction* — 4 · 2 · 1 (`rarityWeights`) — applied inside the guaranteed military/economic/
wildcard spread, so a rare card is rare among cards of its own office and every hand still
holds one of each. **Passing a draft raises the weights**: each consecutive skip adds
`skipPity` (+1 uncommon, +1 rare) to the next draw, and taking a card puts the count back to
nought.

RULING (2026-09-04): orders are never upgraded. A card is what it prints, held once; a draft
is take one or pass.

### Chiefdom pool (11)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| Blooded Spears | M | 🏹 | ● | +1 combat strength, and +2 more against barbarians. |
| Camp Followers | M | 🏹 | ◆ | Clearing a barbarian camp grants +25 food and a random military unit. |
| Far Runners | M | 🧭 | ● | All your units gain +1 sight. Claiming a ruin grants +10 culture. |
| The Widow's Levy | M | — | ◆ | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. |
| Common Granary | E | 🌱 | ● | +1 food in every city holding an improved luxury resource. |
| Salt Tithes | E | 🐫 | ● | +2 gold for each unique luxury. |
| Boundary Stones | E | — | ● | +30% border expansion in every city with a Monument. |
| First Rites | W | 🕯 | ● | +1 faith in your capital, and +1 faith for each wildcard Order you have in a slot. |
| Fire-Keepers | W | 🕯 | ● | +1 faith in your capital, and +1 happiness there. |
| First Fruits | W | 🕯 | ◆ | The first citizen born in each city pays +10 faith once. |
| The Founding Oath | W | 📜 | ○ | Your capital pays +1 of every yield for each building standing in it, at most 3. |

### Government I pool (29)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Long Watch | M | — | ● | +1 happiness for each unit standing in one of your cities, and +1 more for each fortification a city has built. |
| Border Wardens | M | — | ● | +1 combat strength inside your territory, and +1 more for each military Order you have in a slot, at most +3 more. |
| Conscription | M | ⚒ | ◆ | +50% production toward units · −2 happiness. |
| Spoils of the Wild | M | 🏹 | ◆ | Clearing a barbarian camp pays +100%. |
| Weights & Measures | E | 🐫 | ● | +1 gold in every city. |
| Silk Roads | E | 🐫 | ◆ | +3 gold for each trade route you run. |
| The Tax Farm | E | 🐫 | ● | +1 gold for each 4 population in your empire. |
| Harbour Dues | E | 🐫 | ● | Coastal cities gain 5% of their gold again as culture. |
| Homestead Charters | E | — | ◆ | Newly founded cities start with 1 more population. |
| Granary Levies | E | 🌱 | ◆ | When a city grows, it gains +10 production. |
| The King's Table | E | 🌱 | ● | +1 happiness for every 2 citizens in your capital. |
| Tinkers' Guild | E | — | ◆ | Newly created workers gain +1 charge. · *neutral* |
| Festival Days | W | 🌱 | ● | +4 happiness. |
| Rites of Passage | W | 🕯 | ◆ | Buying or completing a unit grants +10 faith. |
| The Laureate | W | 🏛 | ○ | +1 renown per turn. Every great-person improvement pays +2 more of its own yield. |
| The Legion | M | ⚒ | ◆ | Melee units gain +1 movement and +1 combat strength, and cities put 15% more production behind them. |
| Statute Labour | E | ⚒ | ● | +1 production in every city for each 4 citizens living there. |
| The Almanac | W | ✶ | ● | +2 science in your capital, and +1 science in every city with a Library. |
| Village Fairs | W | 🌱 | ◆ | +1 happiness for each luxury you hold two or more copies of. |
| Hill Forts | M | ⛰ | ◆ | +2 combat strength when defending on hills, and a city on hills costs 1 less authority. |
| The Pilgrim's Purse | W | 🕯 | ◆ | +5 faith in every city standing beside a holy site. |
| Charter Towns | E | 📜 | ◆ | Newly founded cities are founded with a Granary. |
| Wayside Shrines | W | 🕯 | ● | +1 faith in every city. |
| The Unbroken Land | E | 🌱 | ◆ | +1 food and +1 production on every unimproved forest or jungle hex. |
| The Ballad-Weavers | W | 🏹 | ◆ | +1 culture per turn for each barbarian you have killed while this Order stands in a slot. |
| The Bell-Founders | W | 🏛 | ◆ | +1 culture per turn for each wonder finished anywhere in the world while this Order stands in a slot. |
| The Rites Charter | W | 🕯 | ◆ | Unlocks the Chapel. |
| The Vigil Charter | M | ⚒ | ◆ | Unlocks the Keep. |
| The Reckless Levy | M | ⚒ | ◆ | +50% production toward units · your army costs twice as much to keep. |

### Government II pool (45)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| River Wardens | E | 🌾 | ● | +1 food on every farm beside fresh water. |
| Field Surgeons | M | ⚒ | ● | All units heal +10 more per turn, anywhere. |
| March Discipline | M | ⚒ | ◆ | Military units gain +1 movement. |
| Siege Doctrine | M | ⚒ | ● | +4 combat strength when attacking cities. |
| Scorched Earth | M | — | ◆ | Pillaging heals a further 25 and pays a further +10 gold. |
| Sumptuary Laws | E | 🐫 | ● | +1 happiness for each unique luxury. |
| Publicani | E | 🐫 | ◆ | +2 gold for each point of positive authority. |
| Chartered Companies | E | 🐫 | ◆ | Buying a hex pays +5 science · buying a hex costs 15% less. |
| Ore Tithes | E | ⚒ | ● | +1 production on every hex carrying a strategic resource, and +1 production in your capital for each military Order you have in a slot, at most +3. |
| Terraced Hillsides | E | 🌱 | ● | +1 food on every hill hex. |
| Master Masons | E | ⚒ | ◆ | Completing a building grants +10 culture. |
| Royal Surveyors | E | — | ● | +50% border expansion · buying a hex costs 25% less. |
| Provincial Governors | E | — | ● | +1 authority capacity for each economic Order you have in a slot, at most +4. |
| Emergency Powers | E | — | ○ | While your authority is negative: capital +25% production, and borders do not freeze. |
| Pilgrim Roads | W | 🕯 | ◆ | +1 faith for every 3 citizens in your capital · +1 happiness for each 50 banked faith (at most +5). |
| Lamplighters | W | 🕯 | ◆ | +1 culture for each 5 faith you gain per turn. |
| Scholars' Stipend | W | ✶ | ● | +2 science in every city of 5 or more population holding a Library, and +2 more where a University stands. |
| The Choir | W | 🕯 | ● | +1 culture and +1 happiness in every city with a Temple. |
| Star-Gazers | W | ✶ | ● | +2 science in every city with a mountain hex inside its borders. |
| Cistern Works | E | 🌾 | ● | Every city of yours counts as standing on fresh water. |
| Ledger-Keepers | E | 🐫 | ● | +1 gold in every city with a Market, and +1 trade route. |
| Drums of War | M | ⚒ | ◆ | while slotted, newly created units gain +2 combat strength, and keep it for life. |
| The Cartographers | W | 🧭 | ◆ | +1 science for each 40 hexes you have revealed. |
| The Masons' Lodge | E | ⚒ | ◆ | Cities of 6 population or more put 10% more production behind buildings. |
| The Oath-Bound | M | ⚒ | ○ | Killing a unit heals the unit that struck the blow by 15. |
| The Orchard Tithe | E | 🌱 | ● | +1 food on every hex carrying a luxury resource. |
| The Quiet Fields | W | 🌱 | ● | +1 happiness for each unimproved hex your cities work. |
| The Last Hunt | W | 🏹 | ○ | +2 culture and +2 science for each barbarian camp you have cleared this game. |
| The Shipwright Shores | E | 🐫 |   | +1 production in every coastal city · +30% production toward ships there. |
| The Archives | W | — |   | +1 culture for each Order you have placed in a slot. |
| The War Council | M | — |   | +1 combat strength for each military Order you have in a slot, at most +3. |
| The Guild Charter | E | — |   | +2 gold for each economic Order you have in a slot, and +1 production in your capital for each. |
| The Synod | W | — |   | +1 faith and +1 culture for each wildcard Order you have in a slot. |
| The Harvest Songs | W | 🌱 |   | Every city gains 10% of its food yield again as culture. |
| The Reliquary Rolls | W | 🏛 | ◆ | +2 faith and +2 culture per turn for each great person you have spent while this Order stands in a slot. |
| The Chroniclers of the Fallen | M | — | ◆ | +1 gold per turn for each unit you have lost in battle while this Order stands in a slot. |
| The Scriveners' Charter | W | ✶ | ◆ | Unlocks the Scriptorium. |
| The Coin Charter | E | 🐫 | ◆ | Unlocks the Assay House. |
| The Waterwrights' Charter | E | 🌾 | ◆ | Unlocks the Cistern. |
| The Senatus | W | 📜 | ◆ | Unlocks the Assembly Hall. |
| The Toolmakers' Charter | E | ⚒ | ◆ | Unlocks the Smithy. |
| The Banner-Call | M | ⚒ | ◆ | While you are at war: +15% production toward units, and killing a unit grants +5 culture. |
| The Long Roads | E | 🐫 | ○ | +1 gold for each road hex you have laid. |
| The Tithe of Iron | E | ⚒ | ◆ | +2 production on every mine · −1 food in every city with one. |
| Bread Alone | W | 🌱 | ◆ | +3 food and −1 culture in every city. |

### Government III pool (46)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Marshals | M | ⚒ | ◆ | +2 combat strength for each adjacent friendly combat unit (at most +4). |
| Garrison State | M | ⚒ | ● | Each city gains +3 production for each combat unit standing in it (at most +6 per city). |
| Skirmishers' Creed | M | ⚒ | ○ | Ranged units gain +1 range. |
| The Finisher's Art | M | — | ● | +4 combat strength against units below half strength. |
| Frontier Forts | M | — | ● | +6 city defence in every city near another empire's territory. |
| The Standing Levy | M | — | ○ | Every 12 turns, a free melee unit musters in your capital. · *neutral* |
| Client Kings | E | — | ● | +2 authority capacity · a captured city costs one less authority. |
| Provincial Mints | E | 🐫 | ● | +2 gold for each improved copy of a luxury — duplicates count. |
| Quarrymen's Guild | E | ⚒ | ● | +4 production in every city with a quarry. |
| The Grain Dole | E | 🌱 | ● | +2 happiness in every city of 6 or more population. |
| Mandate of Heaven | W | 🕯 | ○ | The science and culture your happy cities pay rises 5% · +1 happiness for each 200 banked faith. |
| The Lyceum | W | ✶ | ◆ | Completing a technology grants an extra turn of culture. |
| Census of Souls | W | 🕯 | ◆ | +1 faith for each citizen in your capital. |
| Toleration Edicts | W | — | ● | −10% happiness demanded per citizen. |
| The Old Ways | W | 🌱 | ◆ | The yields of unimproved forests and jungles are doubled. [lets keep this, this is the payoff card] |
| First Fruits | E | 🌱 | ● | +1 food on every hex carrying a resource. |
| The War Chest | E | ⚒ |   | Military units cost 3 less gold in maintenance. |
| Forced Marches | M | ⚒ |   | Melee units gain +1 movement, and +2 instead inside your own territory. |
| The Escorted Roads | E | 🐫 |   | Trade routes pay 30% more. · †deferred |
| The Saints' Fields | W | 🕯 |   | +3 faith on every great-person improvement. |
| The Wayhouses | E | 🐫 |   | +2 gold and +1 culture for each trade route you run. |
| The Provisioners | E | 🐫 |   | +1 happiness for each trade route between your own cities. |
| The Prize Grounds | E | 📜 |   | +2 happiness in every city settled on a luxury resource. |
| The Census Eternal | W | ✶ |   | +1 science for every 4 citizens in your empire. |
| The Groundskeepers | E | 🏛 |   | +1 food and +1 production on every great-person improvement. |
| The Master's Presence | E | 🏛 |   | +10% to every yield in each city beside a great person's work. |
| The Wonder-Feasts | E | ⚒ |   | +2 food in every city while it is building a wonder · +10% production toward wonders. |
| The Master Builders | E | ⚒ |   | The Magnum Opus and cathedrals cost 15% less production. |
| The Dry Docks | E | 🐫 |   | +25% production toward ships in every city with a Harbour. · †deferred |
| The Wintering Grounds | M | — |   | Your units cost no gold in maintenance outside your territory |
| The Annals of Law | W | — |   | +2 culture for each Order you hold but have not placed in a slot. |
| The Auspicious Seal | W | — |   | The first time this Order is placed in a slot, a die of the Magister is yours. |
| The Salting Houses | E | 🐫 |   | Coastal cities gain 10% of their food yield again as production. |
| The Drafting Halls | E | ✶ |   | Cities with a Library gain 10% of their production again as science. |
| The Golden Scales | E | 🐫 |   | Every city gains 10% of its gold yield again as science. |
| The Arsenal Law | M | ⚒ | ○ | While you are at war, cities with a Barracks gain 15% of their production again as gold. |
| The Charter of the Marches | E | 📜 | ○ | Your newest city gains +2 of every yield. Founding a city grants +30 culture. |
| The Almoners' Book | W | ✶ | ◆ | +1 science per turn for each 400 gold you have spent buying while this Order stands in a slot. |
| The Casus Belli | M | ⚒ | ○ | Declaring war grants +2 combat strength to all your units and +10% production in every city, for 10 turns. |
| The Mint Charter | E | 🐫 | ◆ | Unlocks the Coinworks. |
| The Almshouse Charter | W | 🕯 | ◆ | Unlocks the Almshouse. |
| The Stargazers' Charter | W | ✶ | ◆ | Unlocks the Orrery. |
| The Justices' Charter | M | — | ◆ | Unlocks the Assize Court. |
| The Far Charts | W | 🧭 | ○ | +1 science for each 20 hexes you have revealed. |
| The Congregation | W | 🕯 | ○ | +1 culture and +1 science for each city in the world that follows your religion. |
| The Granary Laws | E | 🌱 | ◆ | Cities of 8 or more population gain 10% of their food yield again as science. |


### Government IV pool (16)

Built 2026-09-05 from the proposed table below it, for the first full
playthrough: every proposed row that rides the vocabulary the game already has,
with the rarity mark it was proposed under. `poolOfGovernment` maps tier 29 here
(The Curia · The Estates · The Sultanate), so adopting at the fourth rung turns
a shelf over instead of re-dealing Government III's.

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The King's Road | M | ⚒ | ◆ | Your units gain +1 movement inside your own territory. |
| Field Hospitals | M | ⚒ | ◆ | Units resting inside your own territory mend completely each turn. |
| Decisive Blows | M | ⚒ | ○ | +5 combat strength when attacking a unit below half strength. |
| The Marshals' Purse | M | ⚒ | ○ | Military units cost 25% less to buy. |
| Knightly Orders | M | ⚒ | ○ | Mounted units gain +5 combat strength inside your territory, and cities put 25% less production behind them. |
| The Siege Train | M | ⚒ | ◆ | Siege units gain +1 movement. |
| Patrons | E | 🏛 | ◆ | +2 culture for each wonder you hold. |
| The Guild of Masons | E | 🏛 | ● | +30% production toward wonders · −15% production toward units. |
| Harbourmasters | E | 🐫 | ◆ | +1 trade route · +1 gold on every fishing boat. |
| The Factor Houses | E | 🐫 | ○ | +3 science for each trade route you run to another empire. |
| Assize Courts | E | — | ◆ | +1 authority capacity for each 3 cities you hold · a captured city costs 1 authority. |
| The Grain Fleet | E | 🌱 | ○ | +2 food in every coastal city · +25% growth surplus there. |
| Cathedral Chapters | E | 🕯 | ◆ | +1 happiness for each Cathedral you hold · +2 culture in every city with one. |
| Court Astronomers | W | ✶ | ◆ | +2 science for each wonder you hold. |
| The Consistory | W | 🕯 | ◆ | +1 faith for each Temple you hold. |
| Scholastics | W | ✶ | ◆ | +2 science for each University you hold · completing a technology grants +15 faith. |

**Two renames and four rows still proposed.** *Star Readers* is the name of a
built pantheon belief, so the wonder-reading row is **Court Astronomers**; *The
Synod* is a built Government II Order, so the temples' row is **The
Consistory** (the ruling of 2026-09-05). *Levies* stays retired — the muster is
The Standing Levy, one pool down. Still proposed, each waiting on something the
game cannot say yet: **Trade Wardens** (nothing can protect a route, and no
strength line can ask how far a road is), **The Corvée** (a completion cannot
hand over a citizen), **Court Poets** (a Triumph pays no windfall, and no card
can name a great person).

### Government V pool (11)

The Æra IV shelf, built in the same pass and mapped from tier 45 (The
Commonwealth · The Empire · The Magisterium).

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| Forced March | M | ⚒ | ○ | Military units gain +1 movement outside your own territory. |
| Admiralty | M | 🐫 | ○ | Embarked units gain +1 movement · +5 defence in every coastal city. |
| The Salon | E | 🏛 | ● | Every great-person offer shows one more card. |
| The Silk Exchange | E | 🐫 | ◆ | +2 gold for each trade route you run. |
| Printing Houses | E | ✶ | ◆ | +1 culture for each Library you hold · +2 science in every city with a Printing House. |
| Tithe Barns | E | 🌱 | ○ | Cities keep 50% of their stored food when they grow · −1 faith in every city. |
| The Guild Compact | E | ⚒ | ○ | +2% production in a city for each production building standing in it, at most +6%. |
| Manufactories | E | ⚒ | ◆ | +2 production on every manufactory. |
| The Inquisition | W | 🕯 | ● | +2 happiness and +2 faith in every city with a Temple. |
| Universal Suffrage | W | 🌱 | ◆ | +1 happiness for each 4 citizens in your empire · happiness tiers +5 percentage points. |
| The Magister's Court | W | 🏛 | ○ | +10% production toward the Magnum Opus. |

**One rename and five rows still proposed.** *Guild Charters* clashed with the
built Government II Order, so the guilds' row is **The Guild Compact**. Still
proposed: **Muster** (there is no rally city), **The Provincial Estates** (a
count of cities cannot ask how big they are), **Pilgrimage** (its wonder half is
Patrons' shipped clause one pool down and its Triumph half has no count),
**Ancestor Cults (II)** (a count is asked of a realm or of a town and carries no
size gate), **The Long Peace** (nothing remembers how long it has been since a
unit fell).

### Government VI pool — PROPOSED (no rung exists yet) (10)

There is no adoption tier past 45 — this pool needs a seventh ladder rung (or a
different gate: the Opus opening, an Æra V entry) before it can be dealt.
Deliberately stocked with the rows that wait on Æra V content, so building the
pool and building the content are one decision.

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Corps | M | 🎖 | ● | two units of one type on one hex merge into a corps (+50% strength, one piece) · corps cost 2 authority · *(user: backburner, UX first)* |
| Bombardiers | M | 🎖 | ◆ | siege units +1 range · Bombards cost −25% ⚙ · *(waits: Bombards (Æra V, unbuilt))* |
| The Aerostat Corps | M | ✶ | ○ | Aerostats +2 sight · every city with an Observatory +1 sight · *(waits: Aerostats + Observatory sight (Æra V))* |
| Rocket Arrows | M | 🜍 | ○ | ranged units +10 combat vs units on open ground · −5 on hills |
| The Adepts | E | 🜍 | ◆ | the Distillery +3🔬 +1🕯 · +1 renown per turn to the Scholar family per Distillery · *(waits: the Distillery (cut with First Distillation))* |
| The Furnace | E | 🜍 | ● | every strategic resource counts as one more copy · Forges +2⚙ · −1 happiness per Forge · *(waits: the Forge (Æra V))* |
| The Porcelain Trade | E | ⚓ | ○ | the Porcelain Works' luxury counts twice · +3💰 per Porcelain Works · *(waits: the Porcelain Works (Æra V))* |
| The Clerks of the Engine | E | 🜍 | ◆ | the Engine +4🔬 · +1🔬 per 2 population in its city · *(waits: the Engine (Æra V))* |
| The Entranced Workforce (II) | E | 🜍 | ○ | the Entranced Workforce project pays double · −3 happiness while it runs · *(waits: the Entranced Workforce project (Æra V))* |
| The Encyclopaedists | W | ✶ | ● | every technology draft… → completing a technology grants +25🎵 and +10🕯 · science −10% |

### Notes and deferred halves (from the data rows)

- **Boundary Stones** — Border culture is the culture a city puts toward its own borders, not the culture your empire saves toward its next draft. This hurries your borders only.
- **Vanguard** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Border Wardens stands in its place, and grows with the war cards beside it.
- **The Wolf-Standard** — Not built: the bounty for a camp reaches your treasury and the nearest city, and there is no way yet to share one out among all of them. Retired until there is. † a cleared camp pays its bounty to every one of your cities, not only to the nearest
- **The Far Charts** — How far a caravan may be sent is settled by the two cities it joins and by the trading posts they have built. A law that let one route ignore that distance is not built yet. † your caravans may run one route to any city you have ever seen, however far away it is
- **Rites of Passage** — A unit bought with gold counts as completed, so it pays this too — but only once.
- **The Harvest Songs** — It reads the whole harvest rather than what is left after the citizens eat: a city's surplus is decided after every percentage on it, and a card that read the surplus would be reading a figure that reads the card back.
- **The Salt Road** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Golden Scales stands in its place.
- **Hearth Songs** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Harvest Songs stands in its place.
- **The Loose Rein** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Border Ballads** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Wolf-Runners** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Triumphs** — The renown a capture pays is not built: a windfall's grants are banked by a routine that cannot reach the renown ladder, so only the culture arrives. † capturing a city also grants 5 renown
- **The Laureate** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **Cistern Works** — It answers what is asked of a city — whether the town can drink. A hex out in the fields is still watered by the river or by nothing.
- **Sanctuary** — Not built: a city can only be captured in this game, never sacked. Retired until sacking exists. † your holy city is sacked rather than captured while it keeps your religion
- **The Greenwood Law** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Old Ways** — Not built: a percentage in this game lands on a whole city or on the whole empire, never on one hex. Doubling what a single hex pays is a new kind of arithmetic and is a design decision, not a number. Retired until it is made. † the yields of every unimproved hex are doubled
- **The Escorted Roads** — † trade routes within 3 hexes of your soldiers cannot be plundered — nothing in the game can say where a route is safe, only what it pays
- **The Saints' Fields** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Groundskeepers** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Master's Presence** — A city is beside a work when one stands on its own hex or on one of the six touching it. Two works never pay twice.
- **The Dry Docks** — † ships mend completely in a port — a heal that depends on where a piece is standing is a rule about a hex, and healing is a rule about a turn
- **The Great Warring Tribes** — The courthouse clause did nothing — there is no courthouse in the game — and is struck.
- **Athenaeum of the Road** — Retired: this Doctrine is no longer offered in a draft. A saved game that already holds it keeps it.
- **Mountain Hold** — Retired: this Doctrine is no longer offered in a draft. A saved game that already holds it keeps it. It was built for a mountain **next to** the city, where the ratified text said within two hexes. † the bonus reaching a city with a mountain two hexes away, rather than only one
- **The Burning Way** — Not built: the board does not remember a clearing. A felled forest leaves bare ground that looks exactly like ground nothing ever grew on, so nothing can tell the two apart to pay for one of them. † +1 food on every hex you have cleared of forest or jungle
- **Divine Inspiration** — Faith income today rarely reaches 200 banked faith, so this pays little until faith yields grow.
- **Religious Mandate** — None of this is built, and the card is never offered. † permanent war with empires of another faith † your cities cannot be converted † a powerful bonus toward the domination and religious beads
- **The Academy of Deeds** — A Triumph missed in one age is still closed for good; only the doubling is in effect. † Triumphs you missed by one age can still be earned in the next
- **The Sea Charter** — The clause about founding coastal cities with a Harbour is struck: nothing founds a city with a building it has not built.
- **The Renaissance Court** — The clause about stronger legacies is struck: nothing makes a legacy stronger.
- **Cuius Regio** — Nothing yet makes a rite itself stronger, so only the extra charge is in effect. The charge is decided in the city the augur is trained in. † their rites are 30% more effective
- **Blitz** — Retired: neither half is built — nothing gives a unit its movement back for a kill and nothing stops a unit fortifying — so the Doctrine is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Philosopher's Stone** — The clause about distilleries is struck: there is no distillery in the game.
- **The Levée en Masse** — Not built: nothing in the game happens when a foreign unit crosses your border. † cities with a Barracks muster a militia when an enemy enters your borders
- **The Closed Realm** — Not built, both halves. Nothing in this game can hold a meter at a number instead of adding to it, and nothing can refuse an attack for where it is being made. † your happiness is held at +5 whatever your cities ask for † your units cannot attack outside your own territory
- **Militia Levies** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The wild is answered by soldiers, not by a flat on every wall.
- **Horse Lords** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Horse-Tribes carries the mounted line now.
- **The Muster Roll** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Drums of War stands in its place.
- **Land Grants** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Royal Surveyors stands in its place.
- **The Shield Wall** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Hill Forts stands in its place.
- **The Quartermasters** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The War Chest stands in its place.
- **The Common Purse** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Public Granaries** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Conscription** — The unhappiness is a flat charge on the realm, not a charge per city: nothing can count only the cities past a fourth one.
- **Spoils of the Wild** — It adds to Camp Followers rather than replacing it: a camp cleared under both pays both.
- **The Founding Oath** — It counts the buildings standing in your capital rather than the first three ever raised there, and the third is the last that pays.
- **The Long Roads** — It counts the hexes you paved, wherever they lie: a road belongs to whoever laid it, and a border that later grows over one changes nothing.
- **The Horse-Tribes** — Neither struck clause is built: a strength line asks what the ground is and there is no word for open ground, and no building in the game is a stable. † mounted units gain +1 combat strength on flat ground † every stable pays +1 food
- **The King's Road** — The roads themselves are struck: a road step costs the same third of a point for everybody, and nothing bends that price. † your roads carry your units further than anybody else’s
- **Field Hospitals** — A piece mends only where it rests: one that moved or struck this turn heals nothing, here or anywhere.
- **Decisive Blows** — A fight is decided by points on one ledger rather than by a share of the blow, so what was written as extra damage is printed as a strength line.
- **The Siege Train** — Nothing can ask what is standing beside the piece that is fighting, so the struck clause is not built. † +5 combat strength against cities for units standing beside a siege engine
- **Patrons** — Renown is paid for each city or for each wonder and for nothing else, so the struck clause is not built. † +1 renown per turn for each culture building you hold
- **Harbourmasters** — A trade route belongs to the empire rather than to a town, so the extra route is the realm’s and not the coast’s.
- **Court Astronomers** — A completion pays for the kind of thing finished, and a wonder is a building, so a bounty on wonders alone is not built. † completing a wonder grants +30 science
- **The Consistory** — A rite is one act and has no length to lengthen, so the struck clause is not built. † rites last 25% longer
- **Forced March** — Nothing remembers how far a piece walked this turn, so the price is not built. † −5 combat strength on the turn a unit moved three hexes or more
- **Admiralty** — A strength line asks about the hex a fight is on and never about the piece standing on it, so the defence at sea is not built. † +5 combat strength for embarked units
- **The Salon** — What a great person costs in renown climbs on its own ladder, which no card can steepen, so the struck clause is not built. † great people cost 10% more renown
- **The Silk Exchange** — A route carries yields rather than goods, so nothing it brings in can be counted as a luxury you hold. † luxuries carried in by a trade route count as held
- **The Guild Compact** — Renown is paid for each city or for each wonder and for nothing else, so the engineers’ half is not built. † +1 renown per turn to the engineers for each workshop or forge you hold
- **Manufactories** — Renown is paid for each city or for each wonder and for nothing else, so the struck clause is not built. † +1 renown per turn for each manufactory you hold
- **The Inquisition** — A scope asks what a town has and never what it lacks, so the penalty on towns without a temple is not built. † −2 happiness in every city without a Temple
- **The Magister's Court** — A card may name a silhouette or a roster row but never a great person, so the second charge is not built. † great people arrive with a second charge

---

**As built, 2026-08-28 (copy pass).** The printed faces of every card in this
document are generated by `describeCard`, and its word tables were rewritten to
the Compendium's plain voice: *writ* → **authority**, *tile* → **hex**,
*hammers* → **production**, *the basket* → **stored food**, *the wild* →
**barbarians**, *chopping* → **clearing a forest or jungle**, *claiming a
discovery* → **claiming a ruin**, *garrisoned* → **standing in one of your
cities**, *seals* → **locked**. Numbers are unchanged throughout; the ratified
text in the tables above is the design record and reads in its own voice.


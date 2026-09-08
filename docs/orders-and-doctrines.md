# Orders and Doctrines — the master list

Every Order, Doctrine and government in one place, tables only. **Regenerated from
`data/statecraft.json` 2026-09-06** (batch F, the order pass) — the Effect column is each row's own ratified `text`;
counts and tiers are the data's (pools: Chiefdom 12 · Gov I 32 · Gov II 49 · Gov III 42 ·
Gov IV 20 · Gov V 18; doctrine tiers ride the ladder 4/10/18/29/45). The six wide-play rows
of batch H13 (2026-09-07, `docs/early-pacing.md` §2c and §2e) join the first two pools, and
The Founders' Charter joins tier 4. Edit here; the two working docs (`deprecated/statecraft-cards.md`, `deprecated/statecraft-ages-3-5.md`) keep the commentary and are no longer the source. Tier: ● defining · ◆ strong · ○ situational (blank = not yet tiered).

**As built, 2026-08-28 (second pass)** — six of those halves are built and the shapes are
generic:

- **Tyranny** *(−30% unit maintenance)* and **The Standing Army** *(no upkeep at all)* — the
  eighth `CardRule`, `unitUpkeep`, folded as its **own labelled line** in
  `explainEmpireGold` beside the gross payroll (`explainUnitUpkeepRebate`). The gross list
  stays gross, so the creditors' disband choice is the same under every government.
- **The Curia** *(faith buildings supply science equal to their faith)* — `mirrorYield`,
  read in `foldCity` off the buildings' own category and their own faith, never the town's
  total. A **flat** line, so it lands before Entry XVII's percentages.
- **The Commonwealth** and **The Magisterium** *(great people bought with gold / faith)* —
  a great person is still **called**: what is for sale is the *recruitment*. The new
  `purchaseGreatPersonOffer { playerId, currency }` charges the bank and pours the remaining
  renown through `settleRenownWindfall`, so there is one draft path and `chooseGreatPerson`
  still answers. Gated by `rule` `buyGreatPersonWithGold` / `…WithFaith`; priced at
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

**As built, 2026-09-04 (the card-shapes pass, `docs/history/card-shapes.md`)** — nine rows, two
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

**As built, 2026-09-05 (the cards pass, `docs/history/cards-pass-2.md`)** — the two late Order
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

**As built, 2026-09-05 (the Æra III fork, `docs/history/age-three.md` sections 1–3)** — the three
tier-18 signatures, six Pool III rows and one new occasion, on the vocabulary the
card-shapes pass left:

- **Each tier-18 government reads its own dominant chair** — one `countScaled` on
  `slottedOrdersOfSlot` apiece, the card's own flavour and never the chair's, so the
  signature *moves* when a card of the deck's kind is slotted beside it. Divine Mandate pays
  its capital 🕯 and 🎵 per wildcard Order (and +10%🕯 in cities of 6+ — there is no
  contentment scope, so the doc's own fallback shipped); Imperium pays every city a hammer
  per military Order and pays a conquest **+50💰 and `healAll`** on the existing `capture`
  occasion; the Merchant League pays 2💰 per economic Order and hands over a `routeRider`.
- **Pool III is eleven rows.** The Iron Price pays 20🎵 a kill and doubles a pillage (a
  percentage on the occasion's own figure). The Gilded Court dropped its authority. Master
  of Maps is the Geomancy row (+25🔬 per vein surfaced and per ruin claimed). Hegemony is
  the user's own rewrite — the captured price *set* to the writ's floor of one, and +5%⚒ in
  every city for ten turns after a capture. New: **The Pilgrim Ways** (🕯), **The Natural
  Philosophers** (✶) and **The Deep Delving** (⛰).
- **One new occasion** — `WindfallOccasion`'s `veinFound`, fired from `prospectAt` on a
  strike and only on a strike. `prospect` pays for the *asking* by design (certainty is what
  the assay buys), so the finding is a second occasion on the same verb rather than a flag
  on the first.
- **A `fromRate` grant may quote a share of a turn** — The Natural Philosophers' fifth,
  floored once in `windfallPayout` with every other figure and printed as a percentage
  rather than as a fraction of a turn. No new shape; The Lyceum's whole turn is unchanged.
- **Two rarity marks moved**: Cistern Works ● → ○, Mandate of Heaven ○ → ◆. **The seal
  lengthening was vetoed** by the user mid-build — a card you want to slot in and out is
  skill expression — so every shelf still seals for the same five turns.

**As built, 2026-09-07 (batch H3, `docs/audit/orchestrator.md`)** — the four Æra V bead
Orders and the great-person purchases, on **one** new vocabulary member.

- **A glass bead of your own, on a deed you choose to do** — `beadPerOccasion`, the shape
  all four rows were written for and waited on. The card names a **grant** bead row and one
  of four last-age deeds (`OrderBeadOccasion`: a technology of the last age finished, a
  draft turned down, a city razed, a prophet's proclamation), `cardBeadOccasions`
  (`statecraft.ts`) answers which rows a live card mints, and `awardBead` is still the one
  and only writer of `Player.beads` — so the bead is announced, registered and diffed onto
  the rod by the machinery every other bead uses. `every` is a rhythm, not a cap, and is
  paid only where the seam keeps a count: The Great Enquiry's is a read of the technologies
  of the last age this empire holds. The bead rows carry `repeatable`, which is the whole of
  what lets one empire mint one more than once (`BeadGrantDef.repeatable`). Each deed is
  hooked at its own single seam — `settleResearch`, `settleOrderSkip`, `razeCityAt`,
  `proclaimAt` — and none of the four knows anything about cards or beads.
- **"The last age" is Æra IV**, because that is the last age the chart has (`LAST_TECH_AGE`,
  read off `TECH_AGES` and never written as a numeral). Æra V is designed and has no nodes,
  so The Great Enquiry counts nodes of the fourth today and of the fifth the day one
  belongs to it. "Earned only there" is `OrderDef.fromAge` on the deal and nothing else: a
  card nobody can be holding earlier needs no second age gate.
- **The purchases have a surface at last.** `purchaseGreatPersonOffer` had been built in the
  simulation since The Commonwealth was written and no screen ever constructed the command —
  three live signature clauses doing nothing. They are a rail at the foot of the Reliquary
  (`reliquaryCalls`, the renown chip's own door), priced by `greatPersonOfferPrice`, banked
  by `greatPersonOfferBank`, refused with `greatPersonPurchaseError`'s own sentence, and
  drawn only under a law that opens one (`greatPersonPurchaseOpen`).
- **Religious Mandate and The Closed Realm stay as they are.** The audit read them as
  draftable rows paying nothing; they are tier 0, which `poolDoctrines` deals from never, so
  they are already out of every pool and out of every table. Marking them `retired` would
  say the wrong thing — that is for a row that *was* dealt and has been taken back out.

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
| 18 | Divine Mandate | 2/2/4 | +1 faith and +1 culture in your capital for each wildcard Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 4/2/2 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 1/4/3 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 29 | The Curia | 3/3/4 | +3 faith for each Cathedral. Faith buildings supply science equal to their faith. · †deferred |
|  | The Estates | 2/4/4 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 5/2/3 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 2/5/5 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 5/3/4 | +6 authority capacity. +1 combat strength for each great general you have earned this game. |
|  | The Magisterium | 3/4/5 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

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
| The Founders' Charter | 📜 | +2 authority capacity · newly founded cities are founded with a Monument. |

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
| The Iron Price | ⚒ | Killing a unit grants +20 culture · pillaging pays double. |
| Manifest of the Steppe | — | Settlers cost 40% less to train and have +2 movement · every city demands +1 happiness. |
| The Gilded Court | 🐫 | Unlocks the Gilded Hall, a building that is bought with gold and never built. +1 science and +1 culture on every hex that yields gold. |
| The Grand Bazaar | 🐫 | Happiness from unique luxuries +50%. A second or later copy of a luxury pays 30% of its bonus instead of nothing. +2 gold for each unique luxury. |
| Master of Maps | 🧭 | All units +1 sight and +1 movement · every vein you surface and every ruin you claim pays +25 science · all units −2 combat strength. |
| Hegemony | ⚒ | A captured city costs 1 authority · capturing a city grants +5% production in every city for 10 turns. |
| Pax Imperia | 🌱 | +3 happiness and +3 culture in every city of 8 or more population. |
| The Wandering Court | 🌱 | −15% to every yield in your capital · +3 food, production, science, culture and faith, and +3 happiness, in every city but your capital. |
| The Pilgrim Ways | 🕯 | +2 faith for each city in the world that follows your religion · +1 culture for each foreign city that follows you · +1 culture for each 5 faith you gain per turn. |
| The Natural Philosophers | ✶ | +1 science in your capital for each building standing in it · completing a technology grants 20% of a turn's culture. |
| The Deep Delving | ⛰ | +1 production on every mine and every quarry · surfacing a vein pays +40 gold, and a mine standing on rich ore pays +2 production more. |

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

**Role** (built 2026-09-06, batch F — `docs/history/orders-pass-3.md` §1): **E** an *engine*, a row
whose subject is the deck or the board's *kind* — a count of the chairs, the Order sitting in
one named chair, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar. **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted — a
count, a conversion, a share of a town's voice, a doubler taken last, a tally. **S** a
*standalone*, everything else: a flat, a site-scoped flat, a rule, an occasion, a charter, a
boon on the calendar. The mark is **derived from the row's own effects** and a sync test pins
the column against that derivation, so a row that changes shape changes its letter or fails
the build. The ruled share is 25% engines · 30% payoffs · 45% standalones **per game** rather
than per pool: the early pools lean standalone and the late ones lean multiplier, which is
the ladder `docs/history/orders-pass-3.md` §9 rules.

### Chiefdom pool (12)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Blooded Spears | M | 🏹 | ● | S | +1 combat strength, and +2 more against barbarians. |
| Camp Followers | M | 🏹 | ◆ | S | Clearing a barbarian camp grants +25 food and a random military unit. |
| Far Runners | M | 🧭 | ● | S | All your units gain +1 sight. Claiming a ruin grants +10 culture. |
| The Widow's Levy | M | — | ◆ | S | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. |
| Common Granary | E | 🌱 | ● | P | +2 food in every city holding an improved luxury resource. |
| Salt Tithes | E | 🐫 | ● | P | +3 gold for each unique luxury. |
| Boundary Stones | E | — | ● | S | +30% border expansion in every city with a Monument. |
| First Rites | W | 🕯 | ● | E | +1 faith in your capital, and +1 faith for each wildcard Order you have in a slot. |
| Fire-Keepers | W | 🕯 | ● | P | +1 faith in your capital for every 2 citizens living there. |
| The Founding Oath | W | 📜 | ○ | P | Your capital pays +1 of every yield for each building standing in it, at most 3. |
| The Elders' Writ | E | 📜 | ● | S | +1 authority capacity. |
| The Tally Sticks | E | ✶ | ● | P | +1 science in every city with a Monument. |

### Government I pool (32)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Long Watch | M | — | ● | P | +1 happiness for each unit standing in one of your cities, and +1 more for each fortification a city has built. |
| Border Wardens | M | — | ● | E | +1 combat strength inside your territory, and +1 more for each military Order you have in a slot, at most +3 more. |
| Conscription | M | ⚒ | ◆ | S | +50% production toward units · −2 happiness. |
| Spoils of the Wild | M | 🏹 | ◆ | S | Clearing a barbarian camp pays +100%. |
| Weights & Measures | E | 🐫 | ● | S | +1 gold in every city. |
| Silk Roads | E | 🐫 | ◆ | S | +5 gold on every trade route you run. |
| The Tax Farm | E | 🐫 | ● | P | +1 gold for each 3 population in your empire. |
| Harbour Dues | E | 🐫 | ● | P | Coastal cities gain 5% of their gold again as culture. |
| Homestead Charters | E | — | ◆ | S | Newly founded cities start with 1 more population. |
| Granary Levies | E | 🌱 | ◆ | S | When a city grows, it gains +10 production. |
| The King's Table | E | 🌱 | ● | P | +1 happiness for every 2 citizens in your capital. |
| Tinkers' Guild | E | — | ◆ | S | Newly created workers gain +1 charge. · *neutral* |
| Festival Days | W | 🌱 | ● | S | +4 happiness in your capital, and +2 culture in every city. |
| Rites of Passage | W | 🕯 | ◆ | S | Buying or completing a unit grants +10 faith. |
| The Laureate | W | 🏛 | ○ | S | +2 renown per turn. Every great-person improvement pays +3 more of its own yield. |
| The Legion | M | ⚒ | ◆ | S | Melee units gain +1 movement and +1 combat strength, and cities put 15% more production behind them. |
| The Almanac | W | ✶ | ● | P | +2 science in your capital, and +2 science in every city with a Library. |
| Village Fairs | W | 🌱 | ◆ | P | +1 happiness for each luxury you hold two or more copies of. |
| Hill Forts | M | ⛰ | ◆ | S | +2 combat strength when defending on hills, and a city on hills costs 1 less authority. |
| Wayside Shrines | W | 🕯 | ● | P | +1 faith in your capital for every city you hold. |
| The Unbroken Land | E | 🌱 | ◆ | S | +1 food and +1 production on every unimproved forest or jungle hex. |
| The Ballad-Weavers | W | 🏹 | ◆ | P | +2 culture per turn for each barbarian you have killed while this Order stands in a slot. |
| The Rites Charter | W | 🕯 | ◆ | S | Unlocks the Chapel. |
| The Vigil Charter | M | ⚒ | ◆ | S | Unlocks the Keep. |
| The Reckless Levy | M | ⚒ | ◆ | S | +50% production toward units · every unit costs one more coin to keep. |
| The Muster Rolls | M | ⚒ | ◆ | E | The Order in your first military slot pays twice. |
| The Harvest Home | E | 🌱 | ● | E | Your Orders that give food give an additional food. |
| The Reeve’s Bell | E | 🌾 | ● | S | Every 8 turns, your capital gains food for each citizen in your empire. |
| The Marches | M | 📜 | ◆ | S | +2 authority capacity · −1 happiness in every city. |
| The Census | E | 📜 | ◆ | P | +1 authority capacity for each 2 cities you hold. |
| The Scribes' Hall | E | ✶ | ◆ | P | +1 science in every city for each 3 citizens living there. |
| The Lamp Kept Lit | W | ✶ | ○ | P | +25% science in your capital. |

### Government II pool (49)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Field Surgeons | M | ⚒ | ● | S | All units heal +10 more per turn, anywhere. |
| March Discipline | M | ⚒ | ◆ | S | Military units gain +1 movement. |
| Siege Doctrine | M | ⚒ | ● | S | +4 combat strength when attacking cities. |
| Scorched Earth | M | — | ◆ | S | Pillaging heals a further 25 and pays a further +10 gold. |
| Sumptuary Laws | E | 🐫 | ● | P | +1 happiness for each unique luxury. |
| Chartered Companies | E | 🐫 | ◆ | S | Buying a hex pays +5 science · buying a hex costs 15% less. |
| Ore Tithes | E | ⚒ | ● | E | +2 production on every hex carrying a strategic resource, and +2 production in your capital for each military Order you have in a slot. |
| Terraced Hillsides | E | 🌱 | ● | S | +2 food on every hill hex. |
| Master Masons | E | ⚒ | ◆ | S | Completing a building grants +25 culture. |
| Royal Surveyors | E | — | ● | S | +50% border expansion · buying a hex costs 25% less. |
| Provincial Governors | E | — | ● | E | +1 authority capacity for each economic Order you have in a slot, at most +4. |
| Emergency Powers | E | — | ○ | S | While your authority is negative: capital +25% production, and borders do not freeze. · *neutral* |
| Pilgrim Roads | W | 🕯 | ◆ | P | +1 faith for each citizen in your capital · +1 happiness for each 50 banked faith (at most +5). |
| Lamplighters | W | 🕯 | ◆ | P | +1 culture for each 3 faith you gain per turn. |
| Scholars' Stipend | W | ✶ | ● | P | +3 science in every city of 5 or more population holding a Library, and +3 more where a University stands. |
| The Choir | W | 🕯 | ● | P | +3 culture and +1 happiness in every city with a Temple. |
| Star-Gazers | W | ✶ | ● | P | +15% science in every city with a mountain hex inside its borders. |
| Cistern Works | E | 🌾 | ◆ | S | Every city of yours counts as standing on fresh water. |
| Ledger-Keepers | E | 🐫 | ● | S | +1 science and +1 culture on every trade route sent from a city with a Market, and +1 trade route. |
| Drums of War | M | ⚒ | ◆ | S | While this Order is in a slot, units created from now on are born with +2 combat strength, and keep it for life. |
| The Cartographers | W | 🧭 | ◆ | P | +1 science for each 40 hexes you have revealed. |
| The Oath-Bound | M | ⚒ | ○ | S | Killing a unit heals the unit that struck the blow by 15. |
| The Orchard Tithe | E | 🌱 | ● | S | +2 food on every hex carrying a luxury resource. |
| The Last Hunt | W | 🏹 | ○ | P | +4 culture and +4 science for each barbarian camp you have cleared this game. |
| The Shipwright Shores | E | 🐫 | ● | P | +3 production in every coastal city · +30% production toward ships there. |
| The Archives | W | — | ● | E | +2 culture for each Order you have placed in a slot. |
| The War Council | M | — | ● | E | +1 combat strength for each military Order you have in a slot. |
| The Guild Charter | E | — | ● | E | +3 gold for each economic Order you have in a slot, and +2 production in your capital for each. |
| The Synod | W | — | ● | P | Your faith buildings give half again their yield, counted after every other share. |
| The Harvest Songs | W | 🌱 | ● | P | Every city gains 15% of its food yield again as culture. |
| The Reliquary Rolls | W | 🏛 | ◆ | P | +3 faith and +3 culture per turn for each great person you have spent while this Order stands in a slot. |
| The Chroniclers of the Fallen | M | — | ◆ | P | +1 gold per turn for each unit you have lost in battle while this Order stands in a slot. |
| The Scriveners' Charter | W | ✶ | ◆ | S | Unlocks the Scriptorium. |
| The Coin Charter | E | 🐫 | ◆ | S | Unlocks the Assay House. |
| The Waterwrights' Charter | E | 🌾 | ◆ | S | Unlocks the Cistern. |
| The Senatus | W | 📜 | ◆ | S | Unlocks the Assembly Hall. |
| The Toolmakers' Charter | E | ⚒ | ◆ | S | Unlocks the Smithy. |
| The Banner-Call | M | ⚒ | ◆ | S | While you are at war: +15% production toward units, and killing a unit grants +5 culture. |
| The Tithe of Iron | E | ⚒ | ◆ | P | +3 production on every mine · −3 food in every city with one. |
| The First Chair | E | 🏛 | ◆ | E | The Order in your first economic slot pays twice. |
| The Scriveners | W | ✶ | ◆ | E | Your science buildings give half again their yield, the per-citizen lines included. |
| The Sacred Ground | W | 🕯 | ● | E | +1 faith on every hex that already supplies faith. |
| The Assayer’s Rule | E | 🐫 | ● | E | +1 gold on every hex that already supplies gold. |
| The Counting Houses | E | 🐫 | ◆ | E | Your gold buildings give half again their yield. |
| The Almanac of Hours | W | 🏛 | ◆ | E | Your Orders that pay every so many turns come round 3 turns sooner. |
| The Foundry Days | E | ⚒ | ● | P | Every 10 turns, your capital gains production equal to half of what your empire makes in a turn. |
| The Nets’ Blessing | E | 🐫 | ○ | P | Every fishing boat pays double what it makes. |
| The High Chancery | W | 🏛 | ○ | E | Your Orders pay half again in your capital. |
| The Votive Tally | W | 🕯 | ◆ | E | +1 faith for each draft you have asked again while this Order stands in a slot. |

### Government III pool (42)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Marshals | M | ⚒ | ◆ | S | +2 combat strength for each adjacent friendly combat unit (at most +4). |
| Skirmishers' Creed | M | ⚒ | ○ | S | Ranged units gain +1 range. |
| The Standing Levy | M | — | ○ | S | Every 12 turns, a free melee unit musters in your capital. · *neutral* |
| Client Kings | E | — | ● | S | +4 authority capacity · a captured city costs one less authority. |
| Provincial Mints | E | 🐫 | ● | P | +10% gold in every city holding an improved luxury resource. |
| Quarrymen's Guild | E | ⚒ | ● | P | +4 production in every city with a quarry, and +1 production on every quarry. |
| The Grain Dole | E | 🌱 | ● | S | +2 happiness in every city of 6 or more population. |
| Mandate of Heaven | W | 🕯 | ◆ | P | The science and culture your happy cities pay rises 8 percentage points · +1 happiness for each 150 banked faith. |
| The Lyceum | W | ✶ | ◆ | S | Completing a technology grants an extra turn of culture. |
| Census of Souls | W | 🕯 | ◆ | P | +1 faith for each citizen in your capital. |
| Toleration Edicts | W | — | ● | S | −15% happiness demanded per citizen. |
| The Old Ways | W | 🌱 | ◆ | P | The yields of unimproved hexes are doubled. |
| First Fruits | E | 🌱 | ● | S | +2 food on every hex carrying a resource. |
| The War Chest | E | ⚒ | ● | S | Military units cost 2 less gold in maintenance. |
| Forced Marches | M | ⚒ | ● | S | Melee units gain +1 movement, and +2 instead inside your own territory. |
| The Escorted Roads | E | 🐫 | ● | P | Trade routes pay 30% more. |
| The Saints' Fields | W | 🕯 | ● | S | +3 faith on every great-person improvement. |
| The Wayhouses | E | 🐫 | ● | P | +1 gold and +3 culture for each trade route you run. |
| The Provisioners | E | 🐫 | ● | P | +1 happiness for each trade route between your own cities. |
| The Census Eternal | W | ✶ | ● | P | +1 science for every 2 citizens in your empire. |
| The Groundskeepers | E | 🏛 | ● | S | +2 food and +2 production on every great-person improvement. |
| The Master's Presence | E | 🏛 | ● | P | +15% to every yield in each city beside a great person’s work. |
| The Wonder-Feasts | E | ⚒ | ● | P | +4 food in every city while it is building a wonder · +20% production toward wonders. |
| The Master Builders | E | ⚒ | ● | S | The Magnum Opus and cathedrals cost 25% less production. |
| The Annals of Law | W | — | ● | E | +3 culture for each Order you hold but have not placed in a slot. |
| The Drafting Halls | E | ✶ | ● | P | Cities with a Library gain 20% of their production again as science. |
| The Golden Scales | E | 🐫 | ● | P | Every city gains 20% of its gold yield again as science. |
| The Arsenal Law | M | ⚒ | ○ | S | While you are at war, cities with a Barracks gain 15% of their production again as gold. |
| The Casus Belli | M | ⚒ | ○ | S | Declaring war grants +2 combat strength to all your units and +10% production in every city, for 10 turns. |
| The Mint Charter | E | 🐫 | ◆ | S | Unlocks the Coinworks. |
| The Almshouse Charter | W | 🕯 | ◆ | S | Unlocks the Almshouse. |
| The Stargazers' Charter | W | ✶ | ◆ | S | Unlocks the Orrery. |
| The Justices' Charter | M | — | ◆ | S | Unlocks the Assize Court. |
| The Far Charts | W | 🧭 | ○ | P | +1 science for each 20 hexes you have revealed. |
| The Granary Laws | E | 🌱 | ◆ | P | Cities of 8 or more population gain 20% of their food yield again as science. |
| The Workshops’ Rule | E | ⚒ | ◆ | E | Your production buildings give half again their yield. |
| The Wild Chair | W | 🏛 | ◆ | E | The Order in your first wildcard slot pays twice. |
| The Cantors’ Rule | W | 🕯 | ○ | E | Your Orders that give faith give half again. |
| The Golden Censer | W | 🕯 | ○ | P | Every 15 turns, gain faith equal to half the science your empire makes in a turn. |
| The Deep Seams | E | ⚒ | ○ | P | Every mine pays double what it makes. |
| The Exchange Charter | E | 🐫 | ○ | P | Your gold buildings give half again their yield, counted after every other share. |
| The Triumph | W | 🏛 | ● | P | Every 12 turns, gain culture equal to the production your empire makes in a turn. |

### Government IV pool (20)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The King's Road | M | ⚒ | ◆ | S | Your units gain +1 movement inside your own territory. |
| Field Hospitals | M | ⚒ | ◆ | S | Units resting inside your own territory mend completely each turn. |
| Decisive Blows | M | ⚒ | ○ | S | +5 combat strength when attacking a unit below half strength. |
| The Marshals' Purse | M | ⚒ | ○ | S | Military units cost 25% less to buy. |
| Knightly Orders | M | ⚒ | ○ | S | Mounted units gain +5 combat strength inside your territory, and cities put 25% less production behind them. |
| The Siege Train | M | ⚒ | ◆ | S | Siege units gain +1 movement. |
| Patrons | E | 🏛 | ◆ | P | +10 culture for each wonder you hold. |
| The Guild of Masons | E | 🏛 | ● | S | +50% production toward wonders · −15% production toward units. |
| Harbourmasters | E | 🐫 | ◆ | S | +1 trade route · +2 gold on every fishing boat. |
| Assize Courts | E | — | ◆ | P | +1 authority capacity for each 2 cities you hold · a captured city costs 1 authority. |
| The Grain Fleet | E | 🌱 | ○ | P | +6 food in every coastal city · +50% growth surplus there. |
| Cathedral Chapters | E | 🕯 | ◆ | P | +2 culture and +2 faith in every city with a Cathedral. |
| Court Astronomers | W | ✶ | ◆ | P | +10 science for each wonder you hold. |
| The Consistory | W | 🕯 | ○ | P | Your faith buildings pay double, counted after every other share. |
| Scholastics | W | ✶ | ◆ | P | +5 science for each University you hold · completing a technology grants +40 faith. |
| The Scholars’ Rule | W | ✶ | ◆ | E | Your Orders that give science give an additional science. |
| The Exchequer | E | 🐫 | ● | P | Your trade routes pay double. |
| The Assay | E | 🐫 | ○ | P | Every 20 turns, gain science equal to the gold your empire makes in a turn. |
| The Broad Acres | E | 🌱 | ○ | P | Every farm pays double what it makes. |
| The Jubilee | W | 🕯 | ◆ | S | Every 10 turns, gain faith for each citizen in your empire. |

### Government V pool (18)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Forced March | M | ⚒ | ○ | S | Military units gain +1 movement outside your own territory. |
| Admiralty | M | 🐫 | ○ | S | Embarked units gain +1 movement · +5 defence in every coastal city. |
| The Salon | E | 🏛 | ● | P | Every great person’s work pays double what it makes. |
| The Silk Exchange | E | 🐫 | ◆ | P | +2 gold for each trade route you run. |
| Printing Houses | E | ✶ | ◆ | P | +3 culture for each Library you hold · +10% science in every city. |
| The Guild Compact | E | ⚒ | ○ | P | +3% production in a city for each production building standing in it, at most +15%. |
| The Inquisition | W | 🕯 | ○ | P | +8 faith and +8 culture in every city with a Temple. |
| Universal Suffrage | W | 🌱 | ◆ | P | +1 happiness for each 3 citizens in your empire · happiness tiers +10 percentage points. |
| The Magister's Court | W | 🏛 | ○ | S | +30% production toward the Magnum Opus. |
| The Compact of Chairs | W | 🏛 | ○ | E | The Order in your first military, economic and wildcard slot each pay twice. |
| The Laureates’ Rule | W | 🏛 | ◆ | E | Your Orders that give culture give an additional culture. |
| The Great Clock | W | 🏛 | ○ | E | Your Orders that pay every so many turns come round 3 turns sooner and pay half again. |
| The Encyclopaedists | E | ✶ | ○ | P | Every 10 turns, gain culture equal to the science your empire makes in a turn. |
| The Colleges’ Rule | E | ✶ | ○ | P | Your science buildings pay double, counted after every other share. |
| The Great Enquiry | W | ✶ | ○ | S | The learning of the last age is counted toward the great work itself. |
| The Last Laurels | W | 🏛 | ○ | S | A draft turned down is counted toward the great work itself. |
| The Salted Earth | M | ⚒ | ○ | S | A city put to the torch is counted toward the great work itself. |
| The Final Proclamation | W | 🕯 | ○ | S | A prophet’s proclamation is counted toward the great work itself. |

### Government VI pool — PROPOSED (no rung exists yet) (10)

There is no adoption tier past 45 — this pool needs a seventh ladder rung (or a
different gate: the Opus opening, an Æra V entry) before it can be dealt.
Deliberately stocked with the rows that wait on Æra V content, so building the
pool and building the content are one decision.

**Name clash to settle**: batch F gave a live Government V Order the name *The
Encyclopaedists* (the periodic science-to-song conversion `docs/history/orders-pass-3.md`
§2 asked for). The proposal below of the same name is older and unbuilt; one of
the two wants renaming before this pool is ever dealt.

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

- **Militia Levies** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The wild is answered by soldiers, not by a flat on every wall.
- **Boundary Stones** — Border expansion is how fast a city claims its next hex, fed by that city’s own culture — separate from the culture your empire saves toward its next draft. This hurries the borders only.
- **Border Ballads** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Vanguard** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Border Wardens stands in its place, and grows with the war cards beside it.
- **Conscription** — The unhappiness is a flat charge on the realm, not a charge per city: nothing can count only the cities past a fourth one.
- **Spoils of the Wild** — It adds to Camp Followers rather than replacing it: a camp cleared under both pays both.
- **Horse Lords** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Horse-Tribes carries the mounted line now.
- **Silk Roads** — The coin rides on the road itself, so anything that raises what a route pays raises this with it.
- **The Salt Road** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Golden Scales stands in its place.
- **Land Grants** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Royal Surveyors stands in its place.
- **Public Granaries** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Curious Elders** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Rites of Passage** — A unit bought with gold counts as completed, so it pays this too — but only once.
- **The Loose Rein** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Shield Wall** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Hill Forts stands in its place.
- **Publicani** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Foreign Quarters** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Common Purse** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Garrison State** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Finisher's Art** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Decisive Blows says the same rule, and says it bigger.
- **Frontier Forts** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Triumphs** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. † capturing a city also grants 5 renown
- **The Laureate** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **Fire-Keepers** — The faith is paid in your capital, so anything that raises what your capital receives raises this with it.
- **Wolf-Runners** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Hearth Songs** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Harvest Songs stands in its place.
- **First Fruits** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. A tithe on a town’s first citizen pays nothing once the towns are grown.
- **Statute Labour** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **River Wardens** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The waterworks of the tree already water a farm beside fresh water.
- **The Muster Roll** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Drums of War stands in its place.
- **The Pilgrim's Purse** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Charter Towns** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. Homestead Charters already founds a town better than it was founded.
- **Cistern Works** — It answers what is asked of a city — whether the town can drink. A hex out in the fields is still watered by the river or by nothing.
- **Ledger-Keepers** — A road is read from the town that sent the caravan, so a Market at the far end of it pays nothing here.
- **The Masons' Lodge** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Sanctuary** — Not built: a city can only be captured in this game, never sacked. Retired until sacking exists. † your holy city is sacked rather than captured while it keeps your religion
- **Wayside Shrines** — The faith is gathered in your capital, so anything that raises what your capital receives raises this with it.
- **The Greenwood Law** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Quiet Fields** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It paid a wide realm far more contentment than any other card of its age.
- **The Quartermasters** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The War Chest stands in its place.
- **The Escorted Roads** — † trade routes within 3 hexes of your soldiers cannot be plundered — nothing in the game can say where a route is safe, only what it pays
- **The Saints' Fields** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Prize Grounds** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Groundskeepers** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Master's Presence** — A city is beside a work when one stands on its own hex or on one of the six touching it. Two works never pay twice.
- **The Dry Docks** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It is a line on a building the game rarely raises. † ships mend completely in a port — a heal that depends on where a piece is standing is a rule about a hex, and healing is a rule about a turn
- **The Wintering Grounds** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The War Chest is the card that pays an army’s keep.
- **The Auspicious Seal** — Retired: the dice of the Magister are gone from the game, so this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Synod** — A faith building is any building of yours that pays faith at all, and the share is taken last — after everything else that raised it.
- **The Harvest Songs** — It reads the whole harvest rather than what is left after the citizens eat: a city's surplus is decided after every percentage on it, and a card that read the surplus would be reading a figure that reads the card back.
- **The Salting Houses** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Grain Fleet is the coast’s card now.
- **The Charter of the Marches** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It reads only at a founding, and the founding age ends.
- **The Bell-Founders** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Almoners' Book** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It paid less in a whole game than a single flat pays in a turn.
- **The Wolf-Standard** — Not built: the bounty for a camp reaches your treasury and the nearest city, and there is no way yet to share one out among all of them. Retired until there is. † a cleared camp pays its bounty to every one of your cities, not only to the nearest
- **The Far Charts** — How far a caravan may be sent is settled by the two cities it joins and by the trading posts they have built. A law that let one route ignore that distance is not built yet. † your caravans may run one route to any city you have ever seen, however far away it is
- **The Founding Oath** — It counts the buildings standing in your capital rather than the first three ever raised there, and the third is the last that pays.
- **The Long Roads** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The Reckless Levy** — The coin is charged on each soldier the empire is already paying for, so a settler, a scout or a caravan is no dearer than it was.
- **Bread Alone** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. The Harvest Songs are the food deck’s card now.
- **The Congregation** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **The King's Road** — The roads themselves are struck: a road step costs the same third of a point for everybody, and nothing bends that price. † your roads carry your units further than anybody else’s
- **Field Hospitals** — A piece mends only where it rests: one that moved or struck this turn heals nothing, here or anywhere.
- **Decisive Blows** — A fight is decided by points on one ledger rather than by a share of the blow, so what was written as extra damage is printed as a strength line.
- **The Siege Train** — Nothing can ask what is standing beside the piece that is fighting, so the struck clause is not built. † +5 combat strength against cities for units standing beside a siege engine
- **Patrons** — Renown is paid for each city or for each wonder and for nothing else, so the struck clause is not built. † +1 renown per turn for each culture building you hold
- **Harbourmasters** — A trade route belongs to the empire rather than to a town, so the extra route is the realm’s and not the coast’s.
- **The Factor Houses** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It paid less than a common card of a much earlier age.
- **Court Astronomers** — A completion pays for the kind of thing finished, and a wonder is a building, so a bounty on wonders alone is not built. † completing a wonder grants +30 science
- **The Consistory** — A faith building is any building of yours that pays faith at all, and the doubling is taken last — after everything else that raised it.
- **Forced March** — Nothing remembers how far a piece walked this turn, so the price is not built. † −5 combat strength on the turn a unit moved three hexes or more
- **Admiralty** — A strength line asks about the hex a fight is on and never about the piece standing on it, so the defence at sea is not built. † +5 combat strength for embarked units
- **The Salon** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Silk Exchange** — A caravan’s line is read from the town that sent it, and nothing yet asks how big the town at the far end has grown. † a song for every second citizen of the city the caravan is sent to
- **Tithe Barns** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It cost an empire more to hold than it ever paid back.
- **The Guild Compact** — Nothing yet counts the specialists working in a town, so the compact is paid for the workshops instead. † the guilds were to be paid for the specialists a town keeps rather than for the halls it has raised
- **Manufactories** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it. It is a line on a great person’s work that few realms ever hold. † +1 renown per turn for each manufactory you hold
- **The Magister's Court** — A card may name a silhouette or a roster row but never a great person, so the second charge is not built. † great people arrive with a second charge
- **The Votive Tally** — Only the drafts you paid faith to see again are counted, and only while this Order sits in a chair.
- **The Jubilee** — One Order keeps one calendar, so a second boon on this row would never come round. † the same festival was to fill the archives with song as well as the shrines with faith
- **The Great Enquiry** — Dealt only once the last age is reached, and earned only there.
- **The Last Laurels** — Dealt only once the last age is reached, and earned only there.
- **The Salted Earth** — Dealt only once the last age is reached, and earned only there.
- **The Final Proclamation** — Dealt only once the last age is reached, and earned only there.

---

**As built, 2026-08-28 (copy pass).** The printed faces of every card in this
document are generated by `describeCard`, and its word tables were rewritten to
the Compendium's plain voice: *writ* → **authority**, *tile* → **hex**,
*hammers* → **production**, *the basket* → **stored food**, *the wild* →
**barbarians**, *chopping* → **clearing a forest or jungle**, *claiming a
discovery* → **claiming a ruin**, *garrisoned* → **standing in one of your
cities**, *seals* → **locked**. Numbers are unchanged throughout; the ratified
text in the tables above is the design record and reads in its own voice.


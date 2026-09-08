# Orders and Doctrines — as built

Lifted verbatim from `docs/orders-and-doctrines.md` (2026-09-08, batch O1), which
is the balance worksheet and holds tables only. Nothing here is current state:
these are the "As built" notes of each pass that filled the pools, the one ruling
they were written under, and the one Order pool that was only ever a proposal.
The rows themselves live in `data/statecraft.json` and in the worksheet's tables.

## The passes

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

**As built, 2026-09-07 (batch E4a, `docs/audit/deferred-rows.md`)** — the deferred rows
whose ruling was a data row, a one-field extension or a removal.

- **Five clauses built.** The Curia's Cathedral tithe (a `countScaled` on a building the
  table has had since the buildings pass) · Blitz, whose two halves are one `rule` apiece —
  `moveAfterKill` hands the walking back on a kill, read where an attack spends the turn, and
  `noFortify` is asked in `fortifyError`, the one gate the button and the reducer share ·
  The Siege Train's escort, on two new strength conditions (`beside`, a friendly silhouette
  standing next door, and `all`, the composite `CityScope` and `TileCondition` already had) ·
  Patrons' renown per culture house (`CardRenownEffect.per` gained a shelf) · Triumphs' 25
  renown on a capture (`WindfallGrantSpec.renown`, banked through `settleRenownWindfall`,
  which is still the one place renown is added).
- **Seven clauses cut.** Mountain Hold's second hex, The Burning Way's cleared ground, The
  Gentle Yoke's founded-after writ, Sanctuary's sacking, The Escorted Roads' safe route, The
  Far Charts' unlimited route and Forced March's price. Each row keeps its live half and
  says in its own note what it does *not* do; **Mountain Hold is dealt again**, since the
  clause was the whole of why it was withdrawn.
- **Five rows retired** by the user's word: The Dry Docks · The Wolf-Standard · Court
  Astronomers · The Jubilee · The Guild Compact. Bodies kept for saves, out of every pool
  and out of the tables above.
- **Religious Mandate moved to tier 10** (the user: *religion will be a nonfactor until
  then*) and is **withdrawn** at that rung until its clauses exist — tier 0 says "never
  finished" and this row is finished nowhere, but a live tier-10 row paying nothing would be
  a blank card in a real draft, which is exactly what H3 stopped doing.
- **The Magister's Court keeps a deferred half**, rewritten to the user's own words: the
  legacies of great people of the fifth age count twice. Æra V has no roster rows yet.
- **The Chiefdom says what it is** in its own note: the absence of a law.

**As built, 2026-08-28 (copy pass).** The printed faces of every card in this
document are generated by `describeCard`, and its word tables were rewritten to
the Compendium's plain voice: *writ* → **authority**, *tile* → **hex**,
*hammers* → **production**, *the basket* → **stored food**, *the wild* →
**barbarians**, *chopping* → **clearing a forest or jungle**, *claiming a
discovery* → **claiming a ruin**, *garrisoned* → **standing in one of your
cities**, *seals* → **locked**. Numbers are unchanged throughout; the ratified
text in the tables above is the design record and reads in its own voice.

**As built, 2026-09-08 (batch B1 — the Orders balance pass, `docs/flags.md` item
(xx)).** The user marked the worksheet by hand; the marginalia were the rulings.
Three new rows, one withdrawal, one deferral built, and eleven dials. Schema 93.

- **The Muses' Call** — a new Pool I Doctrine, in three clauses and three shapes.
  *Great people may be called before the technology that opens them* is one new
  **`grantsAbility { ability }`**: the great-person gate has always been an
  ability (`ABILITY_TECH`), and the ability union is a list of *verbs* precisely
  so a rule can ask "may this empire do that" without knowing which node teaches
  it — so the card joins the tree at the same door rather than bolting a clause
  onto the one seam that reads it. `hasAbility` (`tech.ts`) is the fold and the
  **only** reader; `renown.ts`'s gate and the renown card in the top bar were
  both moved off `techsGrant` and onto it in this pass. *Adopting this calls one
  great person* is **`DoctrineDef.onAdopt`**, `OrderDef.onSlot` at the
  Doctrine's scale, settled in the reducer through `settleRenownWindfall` by the
  same routine that settles The Laureate's gift (`payMomentGrants`). It is
  deliberately **not** a `windfallRider` on an adoption occasion: a standing
  rider would have paid a great person at every tier the empire ever reached,
  four more times over a game, for a card whose printed words say one — and an
  adoption needs no once-flag, because `settleDoctrineChoice` pushes onto a list
  that is never spliced. *Great-person improvements pay +1 production* is an
  ordinary `tileYield` on `TileCondition.greatWork`.
- **Boatwrights** (chiefdom, economic, common) and **Fish Weirs** (Government I,
  economic, common) — the first two rows of the worksheet's ⚓ **Tide** thread,
  which was named in the themes table from the day the threads were drawn and is
  declared in `CardLine` now that it has rows. Its mark (an anchor) and its ink
  joined `src/art/lineMarks.ts` and `style.css` in the same pass, so the flair
  gallery picked it up with no page edit.
- **Divine Inspiration withdrawn** — the user: *we want to encourage faith to be
  spent*. `retired: true`, row kept for saves, out of the tier-10 table.
- **The Horse-Tribes' struck strength clause built** — flat +1 for the mounted
  rather than the ratified *"on flat ground"*, which the strength ledger still
  has no word for; the stable half is dropped rather than carried, so the row
  keeps no dagger.
- **The dials.** Thalassocracy converts food to **production** where it minted
  gold · Mountain Hold reads `terrainInBorders: mountain` where it read
  `mountainAdjacent`, so the peak may be anywhere the bounds have taken in ·
  The Great Warring Tribes drops its `conditionRule` wrapper and the hammers
  stand whatever the authority book says · Manifest of the Steppe drops the
  happiness `meterRule`, which leaves `cityHappinessDemand` a rule with no live
  row · The Gilded Court gains **+2 authority capacity**, the writ the Æra III
  fork had taken off it · Master of Maps drops both science `windfallRider`s and
  is the eyes and the legs again, bought with the strength · Pax Imperia's flat
  +3 culture becomes **+10%**, scoped as before · The Pilgrim Ways pays **3**
  faith a congregation · The Natural Philosophers pays **half** a turn of
  culture a technology · The Elders' Writ seats **two**.

## The ruling they were written under

RULING (2026-09-04): orders are never upgraded. A card is what it prints, held once; a draft
is take one or pass.

## The pool that was never dealt

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

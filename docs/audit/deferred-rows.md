# E4 — the deferred rows, one recommendation each (2026-09-07)

Every row in the data that promises a clause the game does not do (`deferred`),
or draws with no effect at all, with the orchestrator's recommended
disposition. **User marginalia are rulings**: mark the exceptions, and the
batch builds what is marked *build*, retires what is marked *cut*, and leaves
the label on what is marked *keep*. The recommendation weighs one thing: does
a shape for the clause already exist in the evaluator? If it does, building is
a data row and cheap; if it needs a new shape, it is a design decision and
the row waits for one.

Dispositions: **build** (a shape exists, or a one-field extension of one) ·
**cut** (retire the clause or the row; the Compendium keeps it readable) ·
**keep** (the label stays until its system is designed).

## Orders and Doctrines (`data/statecraft.json`)

| Row | Pool | The deferred clause | Shape today | Recommend |
|---|---|---|---|---|
| Chiefdom | — | *(empty effects)* the starting government pays nothing | by design — the chiefdom is the absence of a law | **keep**, say so in its `note` |
| The Curia | 29 | +6 faith per Cathedral | `countScaled` on a building count | **build** |
| Mountain Hold | 10 | reaches a mountain two hexes away | scope reads adjacency only | **cut** the clause (one-hex stays) |
| The Burning Way | 10 | +1 food on every hex you cleared of forest or jungle | no memory of a chop on a tile | **cut** |
| Religious Mandate | tier 0 | permanent war with other faiths · cities cannot be converted · a bead bonus | diplomacy + a pressure rule + beads | **keep** (never dealt) | [this should be tier 2, no? Religion will be a nonfactor until then]
| Blitz | 45 | kill-and-move-again · cannot fortify | a unit rule with no reader | **build** as one `unitStat`-family rule (kill grants a move) and a `behavior` flag for fortify — H6 made these one `rule` kind |
| The Levée en Masse | 45 | rework: every 10 turns, receive a melee unit in your capital. It has +1 movement for the rest of the game. |
| The Gentle Yoke | 10 | the extra authority only of cities founded after taking it | the Doctrine's own adoption turn vs a city's founding turn — a city keeps no founding turn | **cut** the clause (the flat cost stays) |
| The Closed Realm | tier 0 | happiness held at +5 · no attacks outside your territory | never dealt | **keep** |
| The Horse-Tribes | 10 | mounted +1 on flat ground · every stable pays +1 food | `combatLine` with a terrain test; a per-building line | **build** both | [stable isn't in the game yet right? let's have it unlock at 'wheel'. Effect: pastures and camps gain +1 production. +10% production towards mounted units. Can only be built if the city has a pasture or camp improvement.]
| Triumphs | III | capturing a city also grants 25 renown | `windfallRider` on the capture occasion paying renown | **build** |
| Sanctuary | II | the holy city is sacked rather than captured | a capture rule | **cut** |
| The Escorted Roads | III | routes near your soldiers cannot be plundered | nothing can say where a route is safe | **cut** |
| The Dry Docks | III | ships mend completely in a port | heal is a turn rule, not a hex rule | **build** as a `unitStat heal` with `where: 'inCity'` and class naval (the Alchemical Codex's heal line has the `where`) | [remove, boring]
| The Wolf-Standard | II | a cleared camp's bounty to every city | the bounty pays the nearest city (`arriveOnTile`) | **cut** | [remove]
| The Far Charts | III | one route to any city ever seen, however far | a range exception per route | **cut** |
| The King's Road | IV | your roads carry units further | `roadStepCost` is one rule already (Machinery) | **build** as `rule: roadStepCost` on the Order — a fifth instead of a third while slotted | [rework: stepping in a friendly city replenishes a unit's movement.]
| The Siege Train | IV | +6 vs cities beside a siege engine | `combatLine` with an adjacency test | **build** (an "adjacent to a siege unit" `CombatSituation` is a small extension) |
| Patrons | IV | +3 renown per culture building | `countScaled` on buildings of a category paying renown | **build** |
| Court Astronomers | IV | completing a wonder grants +30 science | `windfallRider` on the wonder occasion | **build** | [remove, wrong shape for age 4]
| Forced March | V | −5 on the turn a unit moved three or more hexes | combat reads no movement history | **cut** |
| Admiralty | V | rework: units that disembark (ocean->land) gain +5 combat strength for 3 turns; disembarking requires no movement | `combatLine` with `where: 'embarked'` (the `unitStat` has it) | **build** |
| The Silk Exchange | V | trade routes gain +1 culture. trade routes give +100% science and culture. | `routeYield` reads the origin only | **build** with the Printing House: a `destination` scope on `routeYield` — one extension serves both |
| The Guild Compact | V | paid for specialists kept, not halls raised | `countScaled` on a `specialists` count | **build** (one new `CountKind`) | [remove this altogether, not a strong engine]
| Manufactories | V | cities with manufactories gain +30% production. |
| The Magister's Court | V | legacies of age 5 great people are doubly effective | `cardExtraCharges` exists | **build** |
| The Jubilee | IV | the festival fills the archives with song as well as faith | a second boon on one occasion — `windfallRider` pays a bag | [remove, not needed] |

## Buildings and wonders (`data/buildings.json`)

| Row | The deferred clause | Shape today | Recommend |
|---|---|---|---|
| The Terracotta Army | units built here start with +1 strength | `unitStamp` | **build** |
| The Statue of Zeus | +15% attacking cities | `combatLine` / attacker percent vs cities | **build** |
| Notre-Dame | +3 culture and +1 happiness in every city with a Cathedral | `cityYields` scoped `hasBuilding` | **build** (trivial) |
| The Forbidden City | one more Order slot | no shape moves the slot spread | **keep** — a slot grant is a design decision (it touches the chairs ruling) |
| The Alhambra | units built here start with the in-city bonus | `unitStamp` with a fortify stamp | **build** if the stamp carries `fortified`; else **keep** |
| Shipyard | a discount for ships alone | `productionBonus` names a category, not a class | **build** — one field (`class: naval`) |
| Printing House | routes ending here pay science and culture | with the Silk Exchange | **build** (the `destination` scope) |
| Observatory | a further share for one raised in sight of a mountain | `percentYields` with scope `terrainInBorders: mountain` (Star Gazers uses it) | **build** |
| Bank | rework, new effect: +4 gold. +20% gold in this city if there is a trade route to this city. |
| The Magnum Opus | culture contributions | culture is the draft basket — your own ruling | **cut** the clause |
| Cistern | farms irrigated by the city | freshwater is a hex fact | **cut** | [what makes this difficult? I think this mechanic is interesting]

## Great people (`data/greatPeople.json`)

| Row | Clause | Shape | Recommend |
|---|---|---|---|
| Dinocrates | +3 production in every city for 10 turns on building a wonder | `windfallRider` with a timed grant (the Casus Belli shape) | **build** |
| Mimar Sinan | cathedrals cost less | `productionBonus` naming one building | **build** |
| Yi Sun-sin | naval +5 | `unitStat` with class naval | **build** |

## Religion (`data/religion.json`)

| Row | Clause | Shape | Recommend |
|---|---|---|---|
| The Vigil | more science and culture while a rite runs | `cityRite` is a town fact now (batch C2); a `keepingRite` city scope is one clause | **build** |
| Holy Order | a faith-bought fighting order | a unit row with `purchase: faith` (the Reliquary opens faith purchases) | **keep** until the unit is designed |
| Theocratic Mandate | a claim on empires that follow you | diplomacy | **keep** |
| The Promised Land | founded cities start keeping your faith | `foundingRider` seeding a pressure lump | **build** (a rider that presses at the founding — `pressLump`'s third caller, stated) | [remove, its very easy to convert new cities, not needed]
new: Crusade: killing units spreads your faith. +2 combat in foreign cities following your religion.
| Blessing of Arms | soldiers mend faster in this city's bounds | a heal that asks the city | **cut** the heal half (the strength half stands) | 
| five empty rows | *(effects: [])* | — | **E4 enumerates and rules them with the rest** |

## Beads (`data/beads.json`)

All nine were "a die of the Magister" boons; the dice left in batch C1 and no
boon was written anew. Two carry a concrete alternative already (The
Encyclopaedia: a research grant banked as beakers; The Surveyor: a claimed
hex in every city). **Recommend keep the nine as labelled** and rule them
together when the beads are next designed — a boon vocabulary is a design
pass, not eleven rows.

## Techs and Triumphs and the rest

| Row | Clause | Recommend |
|---|---|---|
| Epic Poetry (tech) | verse sized by the fallen piece | **keep** (a one-time grant sized by a piece is a new shape) |
| Code of Laws (tech) | the King List — pay for years since founding | **cut** (a city keeps no founding turn; the Gentle Yoke's clause too) |
| Paper Money (tech) | the Bourse — coin into culture | **build** as `rateConversion` gold → culture on a building row (the shape exists for cards) |
| Satrapies (tech) | hammers toward a building the capital keeps | **keep** |
| Daughter Cities (tech) | a far city costs less authority | **cut** |
| Castellany (tech) | defenders shrug off arrows | **build** — a `combatLine` that names the attacker's weapon kind (ranged) is a small extension of `CombatSituation` |
| The Fallen Become Verse (triumph) | a unit lost in a battle you then win | **keep** (with Epic Poetry) | 
| The Long Road (triumph) | two cities joined by road | **build** — `connectedCities` exists; the occasion fires when the count first rises |
| The First Keel (triumph) | your first naval unit | **build** — the hulls exist; the occasion is a unit built of class naval |
| Floating Gardens (improvement) | beds on lake water | keep - lakes need an improvement |
| Ivory (resource) | the tusk trade and war elephants | **build** the hammer half as an ordinary luxury effect; the elephant exists now (H15) |

## The orchestrator's answers to the marginalia (2026-09-07)

- **Religious Mandate, "this should be tier 2"** — yes: the Doctrine tiers
  ride the ladder 4 / 10 / 18 / 29 / 45 and the second is **10**; the row
  moves to tier 10 and its clauses stay labelled until diplomacy exists.
- **Cistern, "what makes this difficult?"** — a farm's water is a hex fact
  today (`Tile.freshwater`: a river or lake beside it), read by the farm's
  own `freshwater` condition inside the hex fold. A Cistern makes the
  *working city* vouch for its farms instead. The fold already carries the
  owning city's context (`ctx`, `yieldContextFor`), so the condition gains
  one clause: *or the city working this hex holds a building that
  irrigates* (`BuildingDef.irrigates`, read where `freshwater` is read, and
  nowhere else). Small; **build**.
- **The rulings read as two batches.** *E4a* — every row whose ruling is a
  data row on an existing shape, a one-field extension, or a removal.
  *E4b* — the reworks that need a new shape or a new row: The Levée en
  Masse (a melee unit in the capital every ten turns, with +1 movement for
  life), the **Stable** building for The Horse-Tribes, The King's Road (a
  friendly city replenishes movement), Admiralty (a disembarking unit's
  three-turn +5 and free landing), the Bank's route scope, the
  **Manufactory** row, the Cistern, the Silk Exchange's route percent, and
  the new belief **Crusade**.

## Counts

Recommended: **build 30 · cut 13 · keep 22** (the nine beads and the five
empty religion rows counted as keep pending). The builds are mostly data rows
on existing shapes; the six that extend a shape by one field (a `destination`
route scope, `class: naval` on a production bonus, a `routesHere` and a
`specialists` count, an adjacency and a weapon-kind `CombatSituation`, a
`keepingRite` city scope) are named above so the batch can say what it added.

### As built — E4a (2026-09-07, schema 88)

**Built 17 · cut 11 · retired 6 · kept 9 · moved 1 · deferred 1 of the batch's
own.**

- **Built**: The Curia's Cathedral tithe · Blitz (both halves) · The Siege
  Train's escort · Patrons' renown per culture house · Triumphs' renown on a
  capture · the Terracotta Army's stamp · the Statue of Zeus' share at a wall ·
  Notre-Dame's Cathedral clause · the Shipyard's ships · the Observatory's
  mountain · Dinocrates · Mimar Sinan · Yi Sun-sin · The Vigil · Castellany ·
  Ivory's hammers · The Long Road and The First Keel (two Triumphs).
- **Cut**: Mountain Hold's second hex · The Burning Way's cleared ground · The
  Gentle Yoke's founded-after writ · Sanctuary · The Escorted Roads' safe route ·
  The Far Charts' unlimited route · Forced March's price · The Magnum Opus'
  culture · Code of Laws' King List · Daughter Cities' distance · Blessing of
  Arms' heal.
- **Retired**: The Dry Docks · The Wolf-Standard · Court Astronomers · The
  Jubilee · The Guild Compact (Orders) · The Promised Land (a belief — the row's
  extra citizen still pays whoever holds it).
- **Kept as labelled**: The Closed Realm · The Forbidden City · The Alhambra ·
  Holy Order · Theocratic Mandate · Epic Poetry · Satrapies · The Fallen Become
  Verse · Floating Gardens. The Magister's Court keeps a deferred half in the
  user's own words. The nine beads are untouched.
- **Moved**: Religious Mandate to tier 10 — and **withdrawn** there, because a
  live rung dealing a card with no effects is the thing H3 stopped doing.
- **The five `effects: []` religion rows**, enumerated: **The Vigil**
  (`beliefs.courtAugurs`) — *built*, a `keepingRite` city scope; **Holy Order**
  and **Theocratic Mandate** (enhancers) — *kept*, one waits on a roster row and
  one on diplomacy; **The Preaching** and **Recasting the Omens** (rites) — both
  already `retired`, bodies kept for saves, *kept as they are*.
- **Deferred by this batch**: **Paper Money's Bourse**. A `rateConversion` is an
  empire-scale line read only from `liveEffects`, and an ordinary building's
  effects reach `liveCityEffects` alone — so the Bourse needs a `oncePerEmpire`
  building row of its own, which is a new row rather than a data edit. The row's
  `deferred` now names that obstacle instead of the old one.
- **New vocabulary**, seven members and five fields: `CombatCondition`'s `beside`
  and `all` · `CityScope`'s `keepingRite` · `BehaviorRuleId`'s `moveAfterKill`
  and `noFortify` · `Occasion`'s `navalUnitBuilt` · `TriumphTrigger`'s
  `citiesConnected` becoming a standing count · `CardUnitStatEffect.when` ·
  `CardUnitStampEffect.scope` · `CardRenownEffect.per: 'buildingOfCategory'` ·
  `WindfallGrantSpec.renown` · `CardWindfallRiderEffect.wonder` ·
  `ProductionBonus.class` · `BeliefDef.retired`. **Castellany needed nothing**:
  `CardCombatLineEffect.vsClass` already names the other side's silhouette, and
  a defender's "other side" is whoever charged in.

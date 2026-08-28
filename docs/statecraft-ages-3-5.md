# Statecraft, Æra III–V — the later pools

Working doc (2026-08-27), first draft for the user to cut. Companion to
`docs/statecraft-cards.md` (the ratified Æra I–II content: Chiefdom / Gov I / Gov II / Gov III
pools, three Doctrine pools, nine governments), `docs/tech-tree-ages-2-5.md` (the systems each
age brings — the homes below assume it), `docs/wonders.md` and `docs/great-people.md` (the
renown economy the later cards plug into). **Nothing here is scheduled until the Revisions
section says so.** Numbers are first guesses in the pacing test's hands.

## The problem this solves

Two things the playtest surfaced (user, 2026-08-27): *"I find myself picking the same sets of
bonuses"* and *"unit movement/combat feels much slower compared to the scaling growth of the
empire."*

The first is structural before it is a weighting problem. Today every pool is keyed to a
**government tier** — Chiefdom (10) → Gov I (17) → Gov II (17) → Gov III (14) — and the live
pool is the current tier's cards plus the previous tier's. Gov III arrives at draft 15, around
turn 100 on the pacing empire, and from then on **every draft for the rest of the game is dealt
from one fourteen-card pool** (plus what remains of Gov II). By the third such draft you have
seen the whole pool; by the sixth the strong generic card has been offered four times. That is
what "the same sets" is. The second problem is that the empire's scaling is all percentage and
the army's is all flat — the war-pace note (design-notes discussion, 2026-08-27) — and the
cards are the vehicle for military scaling this game already has.

## The frame: two axes, and the pool is their union

Keep what exists and add one axis beside it.

- **Government tier** (as today) gates **slots**, **Doctrine drafts** and the four existing
  Order pools. Two more tiers: **Gov IV at draft 22** and **Gov V at draft 32** (Entry XV's
  ladder is 3/7/15; the measured cadence puts Gov III at turn ~97, so 22 and 32 land around
  turns 140 and 190 — the pacing test moves these, not the design).
- **Age** (`highestAge`, the tech axis) gates three **new Order pools**: `ageIII`, `ageIV`,
  `ageV`. A pool goes live the turn the empire enters the age and **retires two ages later**
  (the same two-deep window the government pools use). `OrderPool` grows three members; the
  live pool becomes *(government window) ∪ (age window)* — one filter in `livePool`, no second
  draw.
- The two axes are deliberately independent. A slow-culture, fast-science empire reaches
  `ageIII` cards under Gov II; a culture empire reaches Gov IV in Æra III. Neither is
  starved, and the *combination* is what makes two games' pools differ.

Why not simply key everything to age? Because the government ladder is the culture meter's
whole reward, and an Order pool that ignored it would make the fifteenth draft feel like the
fifth. Why not simply add Gov IV/V pools? Because a science empire would then see no new card
for sixty turns. The union is the honest answer to both.

**Pool sizes.** ~16 per age below (2× what should ship — cut to 8–10 each). Doctrine pools IV
and V at 6–7 each, offered at the tier-22 and tier-32 adoptions.

## The repetition fix, in three parts (the draw, not just the pool)

1. **Bigger, staggered pools** — the frame above. The single largest lever.
2. **An archetype guarantee in the offer.** `drawOrderOffer` deals `offerSize` cards from the
   live pool; add one rule: *at least one card in every offer is from a line the empire holds
   no card of* (when the pool can supply it). Deterministic, one pass over the draw, and it
   is the "archetype spread per offer" the balance ledger promised in 2026-08-21 — never a
   filter, a guarantee on one seat.
3. **Tier the Orders the way Doctrines and great people are tiered** — ● *defining*
   (game-shaping, with a malice), ◆ *strong* (never the wrong pick, never the best), ○
   *situational* (one map, one plan, no malice). Every card below carries one. The rule for
   the draw: **an offer never deals two ● cards**, and the strong generic card is the *safe*
   pick because the ● beside it is the *best* one for somebody. Today's Æra I–II Orders are
   untiered; tiering them is a prose pass over `statecraft-cards.md`, not a mechanism.

## The archetype lines, extended

The seven lines stand (`statecraft-cards.md`). 🏹 The Wild Hunt and 🧭 The Wayfarers retire
with Gov I, as ratified. Three lines are **new** for what the later ages bring:

| Line | Playstyle | Arrives | Orders thread → Doctrine payoff |
|---|---|---|---|
| 🏛 **The Marble Court** | wonders, renown, great people | Æra III | Patrons → The Guild of Masons → The Salon · doctrines: The Academy of Deeds, The Renaissance Court |
| ⚓ **The Tide** | trade routes, the sea, coastal empire | Æra III (trade begins at Currency; proper at The Silk Road) | Harbourmasters → The Factor Houses → Admiralty · doctrine: The Sea Charter |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle | Æra III | The King's Road → Levies → Muster → Decisive Blows · doctrines: The Standing Army, Blitz |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work | Æra V | The Adepts → The Furnace → The Calculating Engine's Clerks · doctrine: The Philosopher's Stone |

🎖 The Banner is the war-pace note made into cards: every one of its Orders either moves
armies faster, ends fights sooner, or raises troops without a queue — never "+X combat".

---

# ORDERS

Columns: Type (M/E/W slot) · Line · Tier (● ◆ ○) · Effect · Mechanism (existing shape, or
**(new)** with the shape named). "In every city" is the ordinary `cityYields`; "channel" is
border culture / growth; scopes are `CityScope` members.

## Age III pool — the Age of Empire (16; live at Æra III, retires at Æra V)

| Order | Type | Line | Tier | Effect | Mechanism |
|---|---|---|---|---|---|
| **The King's Road** | M | 🎖 | ◆ | units gain +1 movement when starting their turn in friendly territory. Roads are extra effective.
| **Levies** | M | 🎖 | ● | every city with a Barracks musters a free melee unit every 10 turns · −1 happiness per Barracks | **(new: `periodicSpawn`** — `periodicOffer`'s calendar shape, spawning through `realiseItem` instead of dealing) + `happiness per city` scoped `hasBuilding` |
| **Field Hospitals** | M | 🎖 | ◆ | units inside your borders heal to full each turn they do not move | `unitStat heal` (amount = full) `where: ownTerritory` |
| **Decisive Blows** | M | 🎖 | ○ | +15% damage dealt when attacking a unit already below full strength | **(new: `combatPercent` under a `CombatCondition` — the Zeus gap, `targetDamaged`)** |
| **The Marshals' Purse** | M | 🎖 | ○ | units cost −25% gold to purchase | `purchaseRider` (any combatant) |
| **Trade Wardens** | M | ⚓ | ○ | trade routes cannot be pillaged · +5 combat within 2 hexes of a road | *FUTURE: trade routes* (`behaviorRule` + `combatLine` route condition) — ships when routes do |
| **Patrons** | E | 🏛 | ◆ | +1 renown per turn per building of the 🎵 category · +2🎵 per wonder you hold | `renown per building` (`countScaled buildingsOfKind` → renown) + `countScaled wonders` |
| **The Guild of Masons** | E | 🏛 | ● | +30% ⚙ toward wonders · −15% ⚙ toward units | `productionBonus wonder` + `productionBonus unit` |
| **Harbourmasters** | E | ⚓ | ◆ | coastal cities +1 trade route · fishing boats +1💰 | *FUTURE: routes* + `tileYield improvement fishingBoats` |
| **The Factor Houses** | E | ⚓ | ○ | each trade route to another civilization pays +3🔬 | *FUTURE: routes* (`countScaled routesForeign`) |
| **The Corvée** | E | ⚒ | ● | completing a building grants +1 population in that city · −2 happiness | `windfallRider completion grant population` (**(new grant kind: population**, through `settlePopulationWindfall`) |
| **Assize Courts** | E | — | ◆ | +1 authority capacity per 3 cities · captured cities cost 1 | `countScaled cities` → authority + `meterRule capturedCityCost` |
| **The Grain Fleet** | E | 🌱 | ○ | coastal cities +2🌾 · +25% growth surplus in coastal cities | `cityYields` scoped coastal + `rulePercent growthSurplus` scoped (**scope on `rulePercent` — new field**) |
| **Star Readers** | W | ✶ | ◆ | +2🔬 per wonder you hold · completing a wonder grants +30🔬 | `countScaled wonders` + `windfallRider completion` (wonder) |
| **The Synod** | W | 🕯 | ◆ | rites last 25% longer · +1🕯 per temple | `effectAmplifier riteDuration` + `countScaled buildingsOfKind temple` |
| **Court Poets** | W | 🏛 | ○ | every Triumph you earn grants +20🎵 · great people arrive with +1 charge *(where they carry one)* | `windfallRider triumph` (**(new occasion: `triumph`)**) + `unitStat charges` filtered `greatWork` |

## Age IV pool — the Age of Cathedrals (16; live at Æra IV, retires with the game)

| Order | Type | Line | Tier | Effect | Mechanism |
|---|---|---|---|---|---|
| **Muster** | M | 🎖 | ● | a unit completed in any city may appear at your designated *rally city* instead · −2 happiness in the rally city | **(new: `actionRule rally`** — `spawnTileFor` asks the rally city when set; a `setRallyCity` command) + `happiness` scoped |
| **The Standing Levy (II)** | M | 🎖 | ◆ | units jump the queue when affordable *(the Gov III neutral card's face, upgraded: and cost −15%)* | `actionRule queue` + `productionBonus unit` |
| **Forced March** | M | 🎖 | ○ | combat units +1 movement outside your borders · −5 combat on the turn they moved 3+ hexes | `unitStat movement where: foreignTerritory` (**new `where`**) + **(new condition `marchedFar`)** |
| **The Siege Train** | M | ⚒ | ◆ | siege units +1 movement · +10 combat vs cities for units adjacent to a siege unit | `unitStat movement class siege` + `combatLine vsCity` scaled `adjacentFriendlies` filtered siege (**filter on the scale — new field**) |
| **Knightly Orders** | M | ⚒ | ○ | mounted units +5 combat inside your borders · mounted units cost +25% ⚙ | `combatLine class mounted ownTerritory` + `productionBonus unit modelClass mounted −25` |
| **Admiralty** | M | ⚓ | ○ | embarked units +1 movement and +5 defence · coastal cities +5 defence | `unitStat movement where: embarked` + `combatLine embarked` (**new condition**) + `cityStat defense` scoped coastal |
| **The Salon** | E | 🏛 | ● | every great-person draft shows one more card · great people cost +20% renown (the ladder steepens) | `offerRider greatPerson` + **(new: `meterRule renownLadder`** or `rulePercent renownThreshold`) |
| **Cathedral Chapters** | E | 🕯 | ◆ | +1 happiness per Cathedral · Cathedrals +2🎵 | `countScaled buildingsOfKind cathedral` + `cityYields` scoped `hasBuilding` |
| **The Silk Exchange** | E | ⚓ | ◆ | +2💰 per trade route · luxuries imported by route count as held | *FUTURE: routes* |
| **Printing Houses** | E | ✶ | ◆ | +1🎵 per Library · the Printing House +2🔬 | `countScaled buildingsOfKind library` → culture + `cityYields` scoped |
| **Tithe Barns** | E | 🌱 | ○ | cities keep 50% of the basket on growth · −1🕯 per city | `rulePercent growthCarryover` + `cityYields faith −1` |
| **The Provincial Estates** | E | — | ◆ | +1 authority capacity per city of 8+ population | `countScaled` (**new count: `citiesAtLeast` with a value**) |
| **Guild Charters** | E | ⚒ | ○ | each Workshop / Forge grants +1 renown per turn to the Engineer family · +5% ⚙ per Workshop in that city (max +15%) | `renown per building family engineer` + `countScaled buildingsInCity` → percent |
| **Scholastics** | W | ✶ | ◆ | +2🔬 per University · completing a technology grants +10🕯 | `countScaled buildingsOfKind university` + `windfallRider research` |
| **The Inquisition** | W | 🕯 | ● | cities with a Temple: +3 happiness and +2🕯 · cities without one: −2 happiness | `happiness per city` scoped `hasBuilding` + scoped `notHasBuilding` (**new scope**) |
| **Pilgrimage** | W | 🕯 | ○ | +1🎵 per wonder you hold · +1🕯 per Triumph earned | `countScaled wonders` + `countScaled triumphs` (**new count**) |

## Age V pool — the Age of the Magister (16; live at Æra V)

| Order | Type | Line | Tier | Effect | Mechanism |
|---|---|---|---|---|---|
| **The Corps** | M | 🎖 | ● | two units of one type on one hex merge into a corps (+50% strength, one piece) · corps cost 2 authority | **(new system: armies — Entry TBD; not before the tree passes)** |
| **Bombardiers** | M | 🎖 | ◆ | siege units +1 range · Bombards cost −25% ⚙ | `unitStat range class siege` + `productionBonus unit modelClass siege` |
| **The Aerostat Corps** | M | ✶ | ○ | Aerostats +2 sight · every city with an Observatory +1 sight | `unitStat sight` filtered + `cityStat sight` scoped |
| **Rocket Arrows** | M | 🜍 | ○ | ranged units +10 combat vs units on open ground · −5 on hills | `combatLine class ranged` with terrain conditions (**`onFlat` — new condition**) |
| **The Adepts** | E | 🜍 | ◆ | the Distillery +3🔬 +1🕯 · +1 renown per turn to the Scholar family per Distillery | `cityYields` scoped + `renown per building family scholar` |
| **The Furnace** | E | 🜍 | ● | every strategic resource counts as one more copy · Forges +2⚙ · −1 happiness per Forge | `effectAmplifier` (**new target `strategicCopies`**) + scoped yields + happiness |
| **The Porcelain Trade** | E | ⚓ | ○ | the Porcelain Works' luxury counts twice · +3💰 per Porcelain Works | `perCopy` reading on the minted luxury (**a data flag on the resource row**) + `cityYields` scoped |
| **The Clerks of the Engine** | E | 🜍 | ◆ | the Engine +4🔬 · +1🔬 per 2 population in its city | `cityYields` scoped `hasBuilding` + `countScaled population within city` |
| **Manufactories** | E | ⚒ | ◆ | +2⚙ per Manufactory (the great work) in your empire · Manufactories +1💰 | `countScaled` (**improvement count — `improvementsOfKind`, new**) + `tileYield improvement` |
| **The Entranced Workforce (II)** | E | 🜍 | ○ | the Entranced Workforce project pays double · −3 happiness while it runs | `projectRider` + *(conditional happiness on a running project — **new condition `projectRunning`**)* |
| **The Grand Tour** | W | 🏛 | ◆ | +1🎵 per wonder in the world *you have seen* · +2 renown per turn to the Artist family | `countScaled` (**`wondersSeen` — `citySightings`, new count**) + `renown` |
| **The Encyclopaedists** | W | ✶ | ● | every technology draft… *(no tech draft exists — reserve)* → completing a technology grants +25🎵 and +10🕯 · science −10% | `windfallRider research` ×2 + `percentYields science −10 stage empire` |
| **Universal Suffrage** *(placeholder name)* | W | 🌱 | ◆ | +1 happiness per 4 population, empire-wide · happiness tiers +5pp | `countScaled population` → happiness + `happinessTierBoost` |
| **The Magister's Court** | W | 🏛 | ○ | great people arrive with a second charge · the Magnum Opus +10% ⚙ | `unitStat charges greatWork` + *FUTURE: Entry VI* |
| **Ancestor Cults (II)** | W | 🕯 | ○ | +1🕯 per 2 population in every city of 10+ | `countScaled population within city` scoped `populationAtLeast` |
| **The Long Peace** | W | — | ● | +20% 🎵 and 🔬 empire-wide while you have lost no unit in 20 turns · lose it all the turn you do | `conditionRule` (**new condition `noLossesSince` — reads `Player.triumphs`-style stamped losses, a new turn-stamped field**) |

---

# GOVERNMENTS, tiers IV and V

Fixed triples as before; adoption = slot jump + amnesty + a Doctrine draft from the tier's
pool. Slots (M/E/W). Signatures follow the "no flat +X%" rule.

| Tier | Choice | Slots | Signature |
|---|---|---|---|
| 22 | **The Estates** | 2/5/4 | +1 happiness per 2 cities · every city with 8+ population +2🎵 |
| | **The Sultanate** | 5/3/3 | units +1 movement inside your territory · units cost −20% ⚙ · −1 happiness per 3 units |
| | **The Curia** | 2/4/5 | +3🕯 per Cathedral · rites last 50% longer |
| 32 | **The Commonwealth** | 3/6/5 | tile purchases −25% · +1🎵 per 5 population · no captured-city cost |
| | **The Empire** | 6/4/4 | +5 authority capacity · capturing a city grants +50🎵 and its garrison heals to full |
| | **The Magisterium** | 3/5/6 | every draft of every kind shows one more card · +2 renown per turn per wonder |

# DOCTRINES, pools IV and V

## Doctrine pool IV (offered at the tier-22 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| **The Academy of Deeds** | 🏛 | every Triumph grants a second helping of renown · Triumphs you missed by one age can still be earned in the next (the register keeps `(id, age)`) | `windfallRider triumph` + **(register rule)** |
| **The Standing Army** | 🎖 | units cost no upkeep *(when upkeep exists)* · every 5 units you hold grant +1 authority capacity · −10% 🎵 | *FUTURE: upkeep* + `countScaled units` (**new count**) + `percentYields` |
| **The Sea Charter** | ⚓ | every coastal city is founded with a Harbour · trade routes +50% yields | `foundingRider building` scoped coastal (**scope on foundingRider — new**) + *FUTURE: routes* |
| **The Renaissance Court** | 🏛 | great-person drafts show one more card · every great person's legacy is 50% stronger | `offerRider greatPerson` + `effectAmplifier` (**new target `legacy`**) |
| **Cuius Regio** | 🕯 | cities that share your majority belief… *(needs religious spread — reserve)* → your rites cost no charge every 3rd use · augurs +1 charge | **(new: a counter on rites — probably a `metaRule`)** + `unitStat charges consecrates` |
| **The Yeomanry** | 🌱 | every farm +1⚙ · cities of 10+ population −1 happiness | `tileYield improvement farm` + `happiness per city` scoped |
| **Absolutism** | — | +6 authority capacity · Orders seal for 10 turns instead of 5 · you may hold one more Order of any kind | `authority` + `metaRule sealTurns` + **the office grant (the Forbidden City's shape)** |

## Doctrine pool V (offered at the tier-32 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| **Blitz** | 🎖 | units that kill may move again that turn · units cannot fortify | **(new `actionRule killMove`** — one clause in `applyCombat`'s winner path) + `behaviorRule noFortify` |
| **The Philosopher's Stone** | 🜍 | the Great Work costs −25% · every Distillery mints +5💰 | *FUTURE: Entry VI* + `cityYields` scoped |
| **The Grand Tour (II)** | 🏛 | +1🎵 per wonder in the world, seen or not · wonders you hold +3 renown per turn | `countScaled wonders (world)` + `renown` |
| **Mare Nostrum** | ⚓ | every sea tile you own +1💰 +1🌾 · coastal cities cost no authority | `tileYield water` + `meterRule coastalCityCost 0` |
| **The Levée en Masse** | 🎖 | when an enemy unit enters your borders, every city with a Barracks musters a militia unit (once per 10 turns) | **(new: reactive spawn — `periodicSpawn` with an `on: incursion` trigger)** |
| **Pax Magistri** | 🌱 | +3 happiness per city · every city of 12+ population +5🔬 +5🎵 · you can no longer declare… *(no war state — reserve)* | `happiness per city` + scoped yields |
| **The Encyclopaedia** | ✶ | +1🔬 per building in every city · science buildings cost −50% | `countScaled buildingsInCity` → science (every city) + `productionBonus building` (**category filter by yield — new**) |

---

## Systems these cards assume, in the order the ages need them

| System | First card that needs it | Age |
|---|---|---|
| **Trade routes** (`docs/tech-tree-ages-2-5.md`, Currency → The Silk Road) | Trade Wardens, Harbourmasters, The Factor Houses, The Silk Exchange, The Sea Charter, Mare Nostrum | III–IV |
| **The rally city / muster** (`setRallyCity`, `spawnTileFor` asks it) | Muster | IV |
| **`periodicSpawn`** (a calendar spawn through `realiseItem`) | Levies, The Levée en Masse | III, V |
| **Conditional combat percentage** (the Zeus gap: `combatPercent` under a `CombatCondition`) | Decisive Blows, Rocket Arrows | III, V |
| **Armies / corps** | The Corps | V |
| **Upkeep** | The Standing Army | IV |
| **Entry VI (the Magnum Opus)** | The Magister's Court, The Philosopher's Stone | V |
| **A turn-stamped losses register** | The Long Peace | V |

Everything not in this table is a data row the day the pools exist. The **new shapes** the
list asks for, in order of how many cards want them: a **renown card effect** (shipped
2026-08-27 for the Council of Elders — `{ kind: 'renown', amount, per, family }`, so 🏛 is
already writable), `countScaled` counts for **wonders / triumphs / units / improvementsOfKind
/ citiesAtLeast**, a **scope on `rulePercent`**, the **`foreignTerritory` / `embarked`
combat conditions**, `notHasBuilding` as a scope, a **`triumph` windfall occasion**, and
`effectAmplifier` targets for **legacy** and **strategicCopies**.

## Refused, on purpose

Flat "+X% of a yield" Orders (pass four's rule holds); Orders that depend on barbarians or
discoveries (they fade by Æra III); any card that gives a *unit* a permanent property (that is
a promotions system, parked); cards that name a real religion or a real nation.

## Revisions

*(yours — edit away; ✎ marks what changed)*

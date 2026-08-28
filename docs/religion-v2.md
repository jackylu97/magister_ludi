# Religion v2 — prophets, religions and the tide of belief

Working doc (2026-08-27), first draft for the user's Revisions. Builds on `docs/religion.md`
(v1: the pantheon and the augur — **shipped**, ledger Entry XXVIII — and its **founder** and
**enhancer** pools and the 2026-08-26 scope ruling, which this doc keeps: the follower beliefs
below are v1's founder pool's *follower* half, and the enhancer pool is v1's) and on `docs/trade.md` (roads and routes
carry belief). Companions: `docs/tech-tree-ages-2-5.md` (The High Temple, Theology),
`docs/orders-and-doctrines.md` (the 🕯 Procession line and the two Doctrines that wait on this).
**Nothing here is scheduled until the Revisions section says so.**

## The ruling, as given (user, 2026-08-27)

> I want to keep religions fluid / not tied to historical world religions. There should be a
> technology to unlock prophets, which can update your pantheon → religion, but I want the
> pantheon beliefs to remain thematically important to the religion's identity. Prophets can
> create a holy site, unlock religious beliefs, faith bomb (converts all cities within 10
> tiles), or allow for a re-draft of existing religious beliefs. Augurs will stay relevant for
> performing rites. Missionaries seem too tedious and I don't want to add religious combat.

## Where we stand (v1, shipped)

Divination opens **two pantheon slots** (`slotsFromTech`; Stonehenge and Djenné add one
each). **18 beliefs on ten axes** (hearth, sky, stone, wild, water, war, road, sun, frost,
none), each a card in the Statecraft vocabulary read by `liveEffects`. The **augur** is
called with faith (40, +15 a rung), carries 3 charges, and performs **five rites** — timed
effects with absolute expiry on the city. Faith accumulates and augurs spend it. Nothing
spreads, nothing is followed; a religion is not a thing yet.

## The design

### One principle: **religion is a tide, not a verb**

No unit converts a city. What a city **follows** is recomputed every turn from *pressure* —
the same shape as `barbarianRoles` and `tileOwnerField`: derived from the board, explained as
a rule-5 list, with no piece to walk and nothing to fight. The player's levers are things they
already do (plant a great work, build a temple, send a caravan, perform a rite) plus the
prophet's four charges. Missionaries and theological combat are refused on purpose.

### The religion

- **Founded by a prophet's first charge**, from a pantheon with at least one belief. The
  religion is `Religion { id, founderId, name, pantheon: BeliefId[], follower: BeliefId[],
  enhancer?: BeliefId, foundedTurn }` in `GameState.religions` (array, founding order — one
  per empire, ever).
- **Identity is the pantheon.** The pantheon beliefs are kept, and become the religion's
  **founder beliefs** — they keep paying the founder exactly as they do today, *and* their
  axes name the religion. The name is **generated** from the pantheon's axes, deterministically
  from `state.rng` at founding ("the Hearth Cult", "the Way of the Reed", "the Children of
  Frost and Stone" — an axis → epithet table in `religion.json`, two-axis names when the
  pantheon spans two, the player free to rename through a command that is pure prose). Never
  a historical faith; never a fixed roster.
- **Founding draws two follower beliefs** — a belief draft (`drawBeliefOffer`, `offerSize
  'belief'`, so the Oracle-style riders already apply) from a **follower pool** that is new:
  ~12 beliefs whose effects are scoped *to the cities that follow* (a temple's yield, a
  happiness line, a tile line), not to the empire. The pantheon pool stays what it is.
- **Enhancing** (Theology) draws one **enhancer belief** from a pool of ~8 that are about
  *spread* — pressure range, road carriage, the founder's trickle.
- **Re-draft** (a prophet charge): the follower beliefs (or the enhancer) are returned and
  redrawn — the pantheon is never redrafted, because it is the identity.

### The prophet

- **`prophet`** unit row, unlocked by **The High Temple** (the tree doc's home; on the shipped
  tree, Philosophy until then). Civilian; `prophesies: true` is the marker (`consecrates`'
  sibling — nothing compares against `"prophet"`); called with **faith** on its own ladder
  (`purchase { currency: faith, cost: 120, increment: 60, exclusive }`), badge `religious`
  (the candle, with a gilt rim — the great person's laurel treatment one class over).
  **Two charges**, so every prophet is a real decision.
- **Four verbs**, one charge each, all through the reducer:
  1. **Found / Holy Site** — `plantHolySite { unitId }`: if the empire has no religion,
     founds it (the belief draft opens) **and** plants the **holy site** on the hex — a great
     work in the improvement table (`ImprovementDef.greatPerson: 'prophet'`, the family
     pattern; +2🕯 +1🎵 on the tile, claims the ring like a citadel does not — one hex). A
     later charge plants a second holy site elsewhere. A holy site is the strongest pressure
     source and the religion's anchor; pillaging it is the one way to hurt a religion.
  2. **Unlock religious beliefs** — `enhanceReligion { unitId }`: draws the enhancer
     (Theology required). A religion holds one enhancer.
  3. **Faith bomb** — `proclaim { unitId }`: a **pulse** — `Religion.pulses.push({ col, row,
     strength, expiresTurn: turn + 10 })` — projecting the religion's pressure over **10
     hexes**, decaying linearly to expiry (an absolute turn, the timed-effect rule; the
     `religion` phase is a broom for expired pulses). Cities in range will follow next turn
     unless something holds them, and keep following as long as ordinary pressure sustains
     it afterwards — a bomb converts, a holy site keeps. ✎ **Superseded
     2026-08-28**: the bomb is an instant *lump*, not a pulse — see "The
     proclamation is a lump" under As built.
  4. **Re-draft** — `redraftBeliefs { unitId, pool: 'follower' | 'enhancer' }`.
- Augurs are untouched: rites remain theirs, and one new rite, **The Preaching** (a small
  pulse, 4 hexes, 10 turns), gives faith a cheap conversion lever before a prophet.

### Following: the pressure model

`explainPressure(state, city)` → one list per religion with lines, the largest total wins;
below `rules.religion.followThreshold` the city follows **nothing** ("the old gods" — early
game stays quiet). Recomputed by the **`spreadReligion` phase** (the only writer of
`City.religion`, which is stored because a following city is itself a source next turn —
the one deliberate cache, like `assignCitizens`'s seating).

| Source | Pressure | Note |
|---|---|---|
| **Holy site** within `siteRange` (6) | `siteStrength` (6) | the anchor; a city may own several |
| **A following city** within `cityRange` (3) | `cityStrength` (2) | the slow tide |
| **A following city joined by road** (`connectedCities`'s fill, from any following city) | `roadStrength` (3), any distance | roads carry belief — trade's gift |
| **A trade route** from a following city to this one | `routeStrength` (3) | the caravan's other cargo |
| **A pulse** (faith bomb / The Preaching) in range | strength × remaining/duration | decays to expiry |
| **A temple in this city** | ×2 on the city's *current* religion's total, ×½ on every other | the defensive building, no combat |
| **The capital of the founder** | +`capitalStrength` (4) to its own religion | a founder's capital does not drift |
| **Wonders** (Hagia Sophia, Djenné, Angkor Wat …) | data rows: `{ kind: 'pressure', amount, range }` | one shape, read here only |

A city changes religion only when a *different* religion's total exceeds the current one's by
`switchMargin` (2) — hysteresis, so a border town does not flip every other turn. A newly
founded city follows the nearest pressure from its first turn.

### What following pays

- **The city's owner** gets the religion's **follower beliefs** in that city — whoever's
  religion it is. A rival's faith in your town is a bonus you did not choose, not a wound;
  that is Civ V's rule and it is what removes every reason for religious war. ✓ **This is
  what shipped**, after the 2026-08-28 correction; see "Who is paid" below.
- **The founder** (read: the holy city's owner) gets the **founder trickle**: `+1🕯 per foreign following city` and
  `+1💰 per 2 foreign following cities` (data; enhancer beliefs raise it) — a rule-5 list,
  `countScaled followingForeign` (new count). Spread is worth wanting with no victory bead
  attached to it yet.
- An empire's **majority religion** is derived (most followed among its cities) and is what
  a future Doctrine (Cuius Regio, Religious Mandate) or the Bead Race asks; nothing stores it.

### Shapes and seams (for the pass that builds it)

- `Religion`, `City.religion?`, `Religion.pulses` — schema bump. `GameState.religions` is
  the register; `foundReligion` is the one writer of a religion, from `plantHolySite`.
- `spreadReligion` phase: after `collectYields`? — **before** it, so a city that converts
  pays its new follower beliefs the same turn its banner changes (argue in the docblock).
- `liveCityEffects(state, city)` gains a **seventh source**: the follower beliefs of
  `city.religion`, whoever founded it — read through `anyCardDef` like every belief today.
  `liveEffects(player)` gains the founder trickle's lines through the pantheon it already reads.
- New shapes, each one union member: `{ kind: 'pressure', amount, range }` (wonders,
  enhancers — read only in `explainPressure`), the `followingForeign` count, a `pulse`
  rider for enhancers that widen a bomb.
- The holy site is an `ImprovementDef` row with `greatPerson: 'prophet'` — `improvementError`'s
  symmetric clause already refuses a worker; `greatPersonWorkError` needs the prophet family
  admitted (it is the third `greatWork` sibling: `greatWork`, `consecrates`, `prophesies`).
- Names: `religion.json` → `names: { epithets: Record<axis, string[]>, patterns: [...] }`,
  drawn once at founding from `state.rng`.

### Interface and board

- **Religion screen**: the wheel keeps the pantheon; a new right pane shows the religion —
  its generated name (editable), the follower and enhancer beliefs in their houses, the
  founder trickle, and a list of following cities (yours and foreign) with each one's
  pressure ledger on hover.
- **City banner**: a small glyph of the religion the city follows — drawn from the pantheon's
  *axis marks* (the wheel's own signs) combined into one device per religion, so a religion
  looks like what it is made of. Foreign religions show in their founder's ink.
- **A Faith lens** (the instrument rack): every hex tinted by the dominant pressure, holy
  sites and pulses ringed — the map the tide is read on.
- **Prophet piece**: the augur's sculpt with a gilt rim and a taller staff; badge `religious`.
  Holy site: a standing-stone ring with a gilt tip, the great-work treatment.

## Belief pools (the pass of 2026-08-27 — v1's rows carried over and rewritten, plus the scaling ones)

**Slots, superseding the drafting lines above.** Founding drafts **one founder + one follower**
belief (two offers, back to back, each `offerSize 'belief'`). Every later *unlock* charge
adds one more from the **follower** or **enhancer** pool — the prophet's owner chooses which
pool before the deal — to a cap of **2 followers and 2 enhancers**. A re-draft charge returns
one pool's beliefs and redraws them. The pantheon is never redrafted. A finished religion is
therefore pantheon (2–4) + 1 founder + 2 followers + 2 enhancers.

Who each pool pays: **founder** → the founding empire, wherever the followers are (the reward
for founding, immune to who owns the towns); **follower** → the *owner* of each following
city, yours or anyone's (the reason a rival's faith in your town is a gift); **enhancer** → the
tide itself (pressure, range, carriage, the trickle). Counts the scaling beliefs read, all
derived once per turn beside `spreadReligion`: `followingCities` (every city in the world
following, yours included), `followingForeign`, `followingPop` (their population summed),
`followingEmpires` (empires with at least one following city). `CityScope` gains
`{ test: 'follows' }` (this city follows *my* religion) for the follower pool.

### Founder pool (draft one at founding; ~10, cut to 6)

| Founder belief | Effect | Scales on | Shape |
|---|---|---|---|
| The Great Rite | your pantheon beliefs' numeric effects ×2 | — | `effectAmplifier pantheon` |
| Syncretism | +1 to every effect of a belief sharing an axis with another you hold | — | `effectAmplifier axisPairs` (flat +1) |
| Divine Right | +2 authority capacity · +1 per belief held | beliefs | `authority` + `countScaled beliefsHeld` |
| Tithe of the Faithful | +1💰 per following city, yours or not | followers | `countScaled followingCities → gold` |
| The Tithe of Nations | +2💰 and +1🔬 per **foreign** following city | foreign followers | `countScaled followingForeign` |
| Pilgrims' Coin | +1🕯 per following city · +1 more per following city with a Temple | followers | `countScaled followingCities`, `followingWithBuilding temple` |
| World Church | +1🔬 per 2 following cities · +1 happiness per empire that follows | followers, empires | `countScaled followingCities per 2`, `followingEmpires → happiness` |
| The Long Prayer | +1🎵 per following city of 5+ population | big followers | `countScaled followingCities` with a `populationAtLeast` filter (**new filter on a count**) |
| Sacred Census | +1 renown per turn per 4 following cities, to the Prophet family | followers | `renown` × `countScaled` (the Council's shape scaled) |
| Ecumene | +5% 🔬 and 🎵 empire-wide per empire that follows (max +15%) | empires | `countScaled followingEmpires → percent (empire stage)` |

### Follower pool (one at founding, up to two; ~13, cut to 8)

| Follower belief | Effect (in every city that follows) | Scales on | Shape |
|---|---|---|---|
| Cathedrals of the Sky | +2🔬 +2🎵 in following cities with a Temple | — | `cityYields` scoped `follows` ∧ `hasBuilding temple` |
| Pilgrimage | +1🕯 per luxury the city holds | luxuries | `countScaled` within city |
| Feast Days | +1 happiness · +1 more with a Temple | — | `happiness per city` scoped |
| Warrior Monks | units fortified in a following city +5 defence | — | `combatLine inCity` scoped (**scope on combatLine — new**) |
| Harvest Blessing | +1🌾 on farms | — | `tileYield improvement farm` scoped `follows` |
| Holy Water | +1🌾 +1🕯 in following cities on fresh water | — | `cityYields` scoped `follows` ∧ `freshwater` |
| Guild of the Faithful | +10% ⚙ toward buildings | — | `productionBonus building` scoped (**scope on productionBonus — the legacies' ask**) |
| Choirs | +1🎵 per 3 population | population | `countScaled population within city` |
| Tithe Houses | +1💰 per 4 population | population | same, gold |
| Sanctuary | +5 city defence · units in the city heal +5 | — | `cityStat defense` scoped + `unitStat heal where: inCity` (**new where**) |
| Lamps of the Shrine | Shrines +2🔬 | — | `cityYields` scoped `hasBuilding shrine` |
| Common Table | the city keeps 25% of its basket on growth | — | `rulePercent growthCarryover` scoped (**scope on rulePercent**) |
| Congregation | +1 happiness per 5 following cities in the world (max +3) | followers | `countScaled followingCities per 5 max 3 → happiness per city` scoped |

### Enhancer pool (up to two, Theology; ~10, cut to 6)

| Enhancer belief | Effect | Scales on | Shape |
|---|---|---|---|
| Reliquaries | +1🎵 per 3🕯 gained per turn | faith | `rateConversion faithPerTurn` |
| Inquisition | a Temple's resistance to foreign pressure ×2 (×4 total) | — | `pressureRule templeResist` |
| The Long Road | roads and caravans carry +2 pressure | — | `pressureRule roadStrength +2` |
| Itinerant Preachers | following cities project 2 hexes further | — | `pressureRule cityRange +2` |
| The Pulse of Bells | the faith bomb reaches 4 hexes further and presses 20 faith harder ✎ (was "pulses last 5 turns longer", schema 30) | — | `pressureRule bombRange`, `bombLump` |
| Ecclesia | holy sites +3 strength · +1🕯 each | — | `pressureRule siteStrength` + `tileYield improvement holySite` |
| Apostles | the founder trickle is doubled | followers | `effectAmplifier founderTrickle` |
| Sacred Cartography | a caravan carries pressure **both** ways | — | `pressureRule routeBothWays` |
| Holy Order | a faith-purchasable warrior-monk line | — | *deferred — a unit line* |
| Theocratic Mandate | the Religious Mandate Doctrine's partner | — | *deferred — war state, beads* |

One shape carries the enhancer pool: `{ kind: 'pressureRule', rule, delta }` over the
`rules.religion` numbers, read only in `explainPressure` — the `meterRule` pattern for the
tide. `followingWithBuilding` and the population filter are the two count extensions; the
three scopes marked **new** are the ones the wonders and legacies passes already asked for.

## Numbers (first guesses; `rules.religion`)

`followThreshold 4` · `switchMargin 2` · `siteRange 6` · `siteStrength 6` · `cityRange 3` ·
`cityStrength 2` · `roadStrength 3` · `routeStrength 3` · `capitalStrength 4` ·
`bombRange 10` · `bombStrength 12` · `bombTurns 10` · `preachingRange 4` · `preachingStrength
5` · `preachingTurns 10` · prophet `120🕯 +60` · founder trickle `1🕯/city, 1💰/2 cities`.

## Open questions for the ruling

1. Prophets at **The High Temple** (Æra II, the tree doc) — or on the shipped tree at
   **Philosophy** until The High Temple exists?
2. A city may follow **nothing** below the threshold (proposed) — or every city always
   follows the nearest religion once one exists?
3. Follower beliefs pay **the city's owner** (proposed, Civ V's rule) — or only the founder's
   own cities?
4. The holy site claims **one hex** (proposed) — or a ring like the citadel?
5. Should the **faith bomb** also plant a temporary holy site at the prophet's hex, so it
   keeps what it converts? (Proposed: no — a bomb converts, a site keeps; the difference is
   the point of having both.)
6. One religion per empire, ever (proposed) — or may an empire whose religion has died out
   (no holy site, no followers) found again?

## Revisions

Prophets at The High Temple yes
City follows nothing until majority citizens follow the religion, lets make religion spread more aggressive than in civ as that's the only way to spread religion.
~~follower beliefs pay the owner of the holy site of the city~~ ✎ **corrected
2026-08-28** — the line above was read as "follower beliefs pay the founder" and
built that way, which was wrong. The ruling, in the user's own words: *"Founder
beliefs pay the owner of the holy city (founding city) of the religion. Follower
beliefs apply at a city-local level, so a city following a religion gets all
follower beliefs."*
holy sites claim one hex
faith bomb only converts, it makes the decision more important between the two.
One religion per empire, there should be a max # of religions that can be founded, lets make 2/3rds of the players in the lobby, rounding up to the nearest integer.
## As built (2026-08-28)

Everything below is what the simulation actually does. Where it differs from the
body above, the Revisions ruled and this is the ruling.

### The technology

**The High Temple** — Æra II, cost 170 (the age's low rung, beside Iron Working),
prerequisites Divination + Stonecraft. It hands over the **prophet**, the
**Temple** (moved off Philosophy, which now unlocks the Great Library alone), a
**third pantheon slot** (`religion.json` `slotsFromTech`), and the augur's new
rite **The Preaching**. Its chart cell is column 3 (derived from the
prerequisites), lane 3; Mathematics and Currency moved up one lane each so that
no connector runs flat through it. The chart's crossing count went 11 → 15 as a
result — a saturated column gained a fifth node — and a proper re-tune of the sky
belongs to the interface pass.

### State

| Shape | Where | Note |
|---|---|---|
| `Religion { id, founderId, name, pantheon, follower[], enhancer[], holySite?, foundedTurn }` | `GameState.religions` | founding order **is** id order; one writer (`foundReligion`). ✎ 2026-08-28: `enhancer` is a **list** (two slots), and `holySite` is the hex the first stones went up on — `founderId` is history and a fallback, `religionFounder` is the payee. ✎ schema 30: **no `pulses`** — see "The proclamation is a lump" |
| `City.followers?: Partial<Record<ReligionId, number>>` | `state.ts` | citizens by religion; the rest follow nothing, derived |
| `City.pressureBank?: Partial<Record<ReligionId, number>>` | `state.ts` | faith banked toward the next convert; the only stored half of the tide |
| `Player.prophetsPurchased` | `state.ts` | the prophet's own faith ladder, separate from the augur's |
| `BeliefOffer.pool?: 'follower' \| 'enhancer'` | `religionData.ts` | absent means the pantheon — one offer field, one `chooseBelief` |

Schema **30** (26 when this pass landed; 27 and 28 are elsewhere in the ledger).
A v25 log is a different game rather than an older one: the temple moved onto a
technology that did not exist, so every research plan past the second age reaches
a different tree, and founding spends `state.rng` on a name.

✎ **29 (2026-08-28)**: `Religion.enhancer` becomes a list and `Religion.holySite`
appears. The migration note, said plainly because it cannot be inferred: a v28
scalar `enhancer` becomes a one-element list, and a v28 religion has **no**
`holySite` at all — the stones a faith was founded on are not marked on the map,
so a loaded snapshot could not re-derive it, while a replay of the log can.
`religionFounder` falls back to `founderId` for exactly that case, which is the
same fallback a pillaged site takes.

✎ **30 (2026-08-28)**: `Religion.pulses` and the `ReligionPulse` shape are
**deleted**. A proclamation is a lump paid at the moment it is made, so nothing
stands on the board with an expiry, and a field that could only ever be empty
would be a shape a future reader had to be told to ignore. The migration note: a
v29 save's standing pulses have no home here and the pressure they had not yet
paid cannot be reconstructed — the bank records what arrived, never what was
still coming. A replay of the log re-derives everything (the bomb is a command),
so the bump refuses the snapshot. It is a different game either way: a v29 bomb
pressed 12 a turn for ten turns and this one presses 60 once.

### Commands

`plantHolySite { unitId }` · `enhanceReligion { unitId }` · `proclaim { unitId }`
· `redraftBeliefs { unitId, pool }` · `renameReligion { name }` (pure prose, the
only such command). All five are turn-gated and all four prophet verbs wake the
piece through `orderedUnitId`. **A charge is the prophet's whole turn**, the
augur's rule one agent over.

`plantHolySite` is **one verb, two acts**: an empire with no religion founds one
here, because a holy site presses for a faith and the first one a realm plants is
necessarily the moment its faith exists. So all three founding refusals reach the
player at the ground — *"You have no gods to found a religion on"*, *"The world
has all the religions it will hold"*, and (from the gate, unreachable from the
verb by construction) *"… has already founded a religion"*.

### The citizen model

`cityReligion(city)` is **derived, never stored**: the religion more than half the
citizens follow, else `null`. `followers` and `pressureBank` are written through
**one converter, `bankPressure`**, and it has exactly **two** callers: the
`spreadReligion` phase, once per religion per town per turn, and `pressLump`,
once when a prophet or an augur speaks. Writing the division, the carry and the
cap twice is how a bomb and a tide come to disagree about what ten banked faith
buys; a source-reading test pins the pair.

The phase sits **before `collectYields`** so a town that turns this turn pays its
new majority's founder the same turn its banner changes. It measures **every**
town against one board and then moves every town — two passes, so the tide does
not run faster along founding order than against it.

Conversion order: the unconverted first, then the smallest congregation, ties by
founding order (`convertCitizen`). Growth adds an **unconverted** citizen — which
is why a big town is harder to convert — and starvation takes one from the
**largest** congregation (`shrinkFollowers`, called from `growCities`).

### The numbers, and the timeline they buy

`rules.religion`: `pressurePerConvert 10` · `siteRange 6` · `siteStrength 6` ·
`cityRange 3` · `cityStrength 2` · `roadStrength 4` · `routeStrength 3` ·
`capitalStrength 4` · `templeOwnPercent 200` / `templeForeignPercent 50` ·
`bombRange 10` · `bombLump 60` · `maxReligions 2/3`.
Prophet: 120🕯 +60. Holy site: +2🕯 +1🎵, one hex. The Preaching's lump is on the
rite's own row (`range 4`, `amount 20`), because a rite's numbers are the rite's
and a bomb's are the rules' — a rite that read the bomb's figures would preach
three times as hard the day somebody retuned a prophet.

Measured on the fixture (`test/sim/religion.test.ts`, "the tuning"):

* **A holy site alone converts a size-4 town in exactly five turns.** 6 a turn
  against 10 a convert: banks 6, 12→1 convert, 8, 14→1, 10→1 — three of four
  citizens on turn 5, which is the majority.
* **A road-joined following city converts the same town in exactly eight.** 4 a
  turn: the third convert lands on turn 8.
* A slow game measurement is in the slow tier: two seats reach two religions,
  four proclamations and **37** converts inside 170 turns, and the log replays
  byte for byte.

### The proclamation is a lump ✎ **new 2026-08-28**

The user's ruling: *"proclaim is an immediate burst of pressure applied
instantly, following the regular conversion rules, just as a lump sum."* So the
faith bomb is no longer a pulse parked on a hex for ten turns. `proclaimAt` asks
`bombFigures` for the reach and the weight (`rules.religion` shifted by the
enhancer pool through `cardPressureRule`) and hands them to **`pressLump`**,
which for every town within `bombRange`, in `state.cities` order:

1. takes the **temple's** share off the lump on the way in — `templeShare`, the
   *same* function `explainPressure` folds into the tide, so a Temple that turns
   away half a rival's slow tide turns away half a rival's bomb. A temple is the
   one number that decides whether a bomb lands;
2. **banks** what is left into `City.pressureBank` — banked, not counted, so what
   a town had already accumulated is still there on the other side of it;
3. runs the phase's own **`bankPressure`** on the spot: one citizen per
   `pressurePerConvert`, unconverted first and otherwise from the smallest
   congregation, ties by founding order; the remainder carries and the bank is
   capped just below the next convert when there is nobody left to turn;
4. calls `refreshCityDerived` on every town that turned a citizen — a town's
   banner is a fact about what its citizens are worth (follower beliefs apply
   city-locally), so a conversion at noon changes the panel before the turn ends.
   **Register entry 14.**

60 against 10 a convert is six citizens: a size-seven town with no Temple follows
the instant it is bombed, and the same town with a Temple takes three of seven
and does not. That gap is the decision the ruling wanted — a bomb converts, a
holy site keeps, and a temple is what a defender builds against the first.

**The Preaching is the same act at a smaller price.** `RiteGrantSpec.lump`
(`{ range, amount }`) replaces `pulse`, and `payRiteGrant` calls the same
`pressLump`; 20 within 4 hexes is two citizens, the cheap lever before a prophet.

Nothing lingers. `Religion.pulses` and the `ReligionPulse` shape are gone, the
`Proclamation` line has left `explainPressure`, and `spreadReligion` has no broom
any more — the absence is the ruling and is said so in the source. The
`pulseTurns` pressure rule went with them; `bombStrength` became **`bombLump`**,
and The Pulse of Bells now reads *"A proclamation reaches 4 hexes further and
presses 20 faith harder."*

**What it reports.** `CommandResult.proclaimed?: ProclamationReport` —
`{ religionId, cities: { cityId, converted, nowFollows }[] }` — from both
`proclaim` and `performRite`. It is `arrivals`' argument in a third currency: by
the time the command returns the citizens have turned and no diff of two boards
could tell a bomb's six converts from a turn of ordinary tide. Every town in
range is listed, including the ones a temple held to nothing, because "Nippur
resisted" is exactly the news a spent charge earns.

**What it promises.** `proclaimPreview(state, unitId)` →
`{ range, lump, cities: { cityId, population, wouldConvert, wouldFollow }[] }`,
or `null` when there is no prophet or no faith. The facts are the simulation's
and the sentence is the interface's ("Converts 3 cities within 10 hexes — Uruk,
Nippur, Ur"); every figure comes from the function that will pay it, including
the pressure the town has already banked.

### Who is paid ✎ **rewritten 2026-08-28**

**Follower beliefs apply city-locally.** `liveCityEffects(state, city)` gains a
source — the follower beliefs of `cityReligion(city)`, whoever founded that faith
— pushed as **ordinary city-scoped effects** through the same `pushEffects` walk
every other card takes (`followerBeliefEffects`, `statecraft.ts`). So every
reader that goes through `liveCityEffects` inherits them with no arm of its own:
`cardCityYields`, `cardPercentYields`, `cardProduction`, `cardRulePercent` (with
a town in hand), and the two that had to be widened — `cardHappiness`, which now
sweeps the realm's towns for their *local* cards beside the empire's law
(`cityLocalEffects`), and `cardCombatLines`, which asks the town standing on the
contested hex. A **sixth `TileLine` producer** (`followerCardTileLines`) joins
`cityContext`. The fold that summed follower beliefs to the founder
(`followerBeliefLines`) is **deleted rather than reworded**: a fold and a city
source would have been two answers to one question.

**Founder beliefs pay the owner of the holy city**, derived. `religionFounder(state,
religion)` is the owner of the city whose territory holds `Religion.holySite` —
the hex the *first* holy site went up on, recorded once at founding — and it
falls back to `Religion.founderId` under one rule: *no stones standing on owned
ground* (a religion older than schema 29, a pillaged site, a razed holy city).
`heldReligions(state, playerId)` is the sweep, and `liveEffects`' seventh source
is now "the religions whose holy city you hold": their **enhancer** beliefs and
the **founder's trickle** (`religion.json` `founderTrickle`: +1🕯 per foreign
following city, +1💰 per two). A captured holy city moves both, with nothing
transferred — the derivation asks the board. `explainPressure` asks it too, so
the enhancer pool's `pressureRule`s and a wonder's pressure follow the seat.
**The pantheon does not move**: it is native to the empire that consecrated it
(the 2026-08-26 ruling) and is read off `Player.pantheon`.

`CityScope`'s `{ test: 'follows' }` survives with its meaning corrected and its
`viewerId` gone: it is now "this town follows the religion this belief belongs
to", true by construction on a city the belief reached at all, and read of any
other card it asks whether the place keeps a faith at all.

`CardRulePercentEffect` gained `scope?: CityScope` (Common Table's ask), and
`growthCarryover` (`cities.ts`) hands its town in so the growth channel can read
it.

Five new `CountKind`s (`followingCities`, `followingForeign`, `followingPop`,
`followingEmpires`, `followingWithBuilding`) answer off one sweep, and
`AmplifierTarget` gained `founderTrickle` (Apostles) — folded before anything is
banked, and read off the list `liveEffects` has already built rather than through
`cardAmplifier`, which would be that function calling itself.

### The pools ✎ **re-sorted 2026-08-28**

`data/religion.json` holds `followerBeliefs` (12 rows) and `enhancerBeliefs`
(14), one id space with the pantheon.

**The four deferred follower rows are built**, because city-local evaluation is
the shape each of them was waiting for: Warrior Monks (`combatLine when inCity`,
side defend — the belief is live in the town, and `cardCombatLines` asks the town
on the contested hex), Harvest Blessing (`tileYield` on farms, scope `follows`),
Guild of the Faithful (`productionBonus building`, scope `follows`), Common Table
(`rulePercent growthCarryover`, scope `follows`, on the new field). Sanctuary was
never written into the table and is still unbuilt.

**Four rows moved to the enhancer pool** — Congregation, Pilgrims' Coin, World
Church and The Long Prayer. Each is written on a **world-scale count** (the
`following…` family), which is a question about *"the religions whose holy city
this empire holds"*; asked in a foreign town it answers nothing, so as a follower
belief each would have paid nothing and said nothing. The doc's own founder-pool
table lists three of them, so this is a filing correction rather than a design
change, and it keeps every ratified row alive with its printed text intact.

The three per-town payouts (Pilgrimage, Choirs, Tithe Houses) now pay
`where: 'city'` rather than `where: 'empire'`, which is what "in a city that
follows" always meant; `uniqueLuxuries` gained the `within: 'city'` reading the
population count already had, so Pilgrimage pays a town for the luxuries *it*
holds.

`religionDataProblems`' follower guard is **inverted**: it used to fail a follower
row that *scoped* a shape the founder's fold could not read, and now fails one
that pays an **empire** — an `empireYields`, a `countScaled` paying
`where: 'empire'`, or a world-scale count. Two enhancer rows are still deferred
for want of a system (Holy Order needs a card that adds a unit; Theocratic
Mandate needs diplomacy).

`pools: { followerSlots: 2, enhancerSlots: 2 }` is the dial: raising
`followerSlots` makes a prophet's later charge open a second follower draft with
no code change, because `plantHolySiteAt` asks whether a slot is open and never
how many.

### Two new shapes, read in one place each

`{ kind: 'pressureRule', rule, delta }` (the whole enhancer pool) and
`{ kind: 'pressure', amount, range }` (Hagia Sophia, which also now grants a real
prophet instead of the augur its note apologised for) are read only in
`explainPressure`, through `cardPressureRule` and `cardPressureSources`.
`statecraft.ts` is still the only module in the game that switches on
`effect.kind`.

### Names

Generated from the pantheon's axes at founding, from `state.rng`:
`religion.json` `names.epithets` (four per axis) and three `patterns` — *the
Hearth Cult*, *the Way of the Reed*, *the Children of Frost and Stone*. The
two-axis pattern is filtered **out before** the pattern is drawn rather than
drawn and rejected, so a one-god religion and a two-god one spend the generator
the same number of times.

### The work, and who may plant one

`ImprovementDef.greatPerson` widened from `Family` to **`WorkFamily = Family |
'prophet'`** — `Family` is the great-people roster's own word and keys
`renownByFamily`, so a sixth family there would have opened a renown bucket
nothing feeds. `improvementError`'s symmetric clause is now read off all four
markers (`plantingHandOf`): a worker plants ordinary improvements, a great person
its own family's work, a prophet the holy site, and an **augur nothing at all** —
which closes an old hole, since an augur has `charges` and could until now spend a
rite's charge on a farm.

### The register

`refreshCityDerived`'s register gains one entry: **taking a belief** refreshes
every town of that empire (`refreshBeliefDerived`, `religion.ts`), for
`settleResearchWindfall`'s reason exactly — a belief is an empire-wide fact about
what ground is worth (Ecclesia pays a holy site's hex), and the citizen who should
move is in whichever town stands on the seam. It covers the pantheon path too,
which had the same gap.

### What is not built

* ~~**Two follower slots and two enhancer slots.**~~ Built — `pools` is 2/2, and
  `Religion.enhancer` is a list so the second pick is actually held.
* ~~**The five deferred follower rows**~~ — four are built (2026-08-28); Sanctuary
  was never written into the table. **Two enhancer rows** are still deferred.
* **A wonder's pressure beyond Hagia Sophia's.** Djenné and Angkor Wat carry no
  `pressure` row yet; adding one is a JSON line.
* **Anything visual.** See below.

### What the renderer needs

* A **holy-site prop** — the ratified sculpt is a standing-stone ring with a gilt
  tip. It currently borrows the landmark's stele and cap (`IMPROVEMENT_PROPS` /
  `IMPROVEMENT_GILT` in `board3d.ts`, both marked as placeholders) with a
  `view3d.json` row of its own.
* A **prophet piece** — the augur's sculpt with a gilt rim and a taller staff,
  badge `religious`. It currently maps to the worker `modelClass` and to the
  `house` silhouette in `view.json`.
* A **per-city religion for the banner**: `cityReligion(city)` is the reading, and
  the device should be built from the pantheon's axis marks so a religion looks
  like what it is made of.
* A **faith lens**: `explainPressure` / `pressureTotals` give a per-hex-town
  reading; holy sites and live pulses want rings.
* Both fingerprints are untouched by this pass, and both will need a member: a
  town's followed religion belongs in `CityLook`, and nothing on `Unit` changed.

### What the interface needs

* A **religion pane** on the Religion screen: the generated name (editable
  through `renameReligion`), the follower and enhancer beliefs in their houses,
  the founder's trickle, and the following cities with `explainPressure` on hover.
* The **prophet's sheet**: four verb rows greyed with `plantHolySiteError`,
  `enhanceReligionError`, `proclaimError` and `redraftError`, so an offered row is
  a command the reducer takes.
* **Followers on the city sheet**: the counts, the unconverted remainder, and the
  bank's distance to the next convert.
* **Toasts** for a religion founded, a town converted, and a proclamation made.
* **Compendium rows** for the prophet, the holy site, The High Temple, The
  Preaching, and the two new belief pools — all of which `describeCard` already
  prints, deferrals struck through included.

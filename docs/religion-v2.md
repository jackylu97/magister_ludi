# Religion — reference

The shipped system (v2 + the one-charge clergy rework, Entries XXVIII/XL and
the Themes Build P2). Sources of truth: `data/religion.json` (pools, names,
trickle), `rules.religion` in `data/rules.json` (the tide's numbers),
`src/sim/religion.ts` (the phase and the verbs), `statecraft.ts` (the one
effect evaluator). Draft history and superseded designs: git and
`docs/design-history.md`. Every belief, rite and consecration as a row — the
balance worksheet, sync-tested against the data — is `docs/beliefs.md`.

## Principles

- **Religion is a tide, not a verb**: no missionaries, no theological combat.
  What a city follows is recomputed from pressure; the levers are things a
  player already does, plus the clergy's one-shot acts.
- **Religions are fluid, never historical**: name generated at founding from
  the pantheon's axes (`names.epithets` + `patterns`, drawn from `state.rng`;
  `renameReligion` is pure prose). The pantheon IS the identity and is never
  redrafted.
- Cap: `maxReligions` = ⌈2/3 × real players⌉.

## The clergy (schema 74)

| Unit | Called with | Acts |
|---|---|---|
| **Augur** | — | **Retired** (`UnitDef.retired`, row kept for replay). Its rites are a town's verbs and its consecration the faith ladder's; `buildError`, `purchaseError` and `consecrateError` all refuse it. |
| **Prophet** (The High Temple) | faith ladder 120 +60, own ladder | **TWO charges.** Both, whole: `plantHolySite` (founds the religion, raises the site, opens the founding drafts) · `gainBelief` (one belief rung, pool by `nextBeliefPool` — followers to 3, then enhancers to 2, enhancers gated on Theology). One charge each: `proclaim` · `empireRite` (one of the five city rites said over **every** town at once, one price). |
| **Apostle** (Theology) | faith ladder 90 +40 | **TWO charges**, movement 4, marker `proclaims`. One charge each: `proclaim` at half a prophet's lump within 6 hexes · `healAdjacent` (25 to every friendly piece on its hex and the six touching it) · `placeRelic` (one per town holding a cathedral). |
| **Inquisitor** (The Holy Office) | flat 200 faith | Purge: a negative lump vs rival pressure (range 5, `purgeLump` 60; unconverted go to **nobody**) + a standing +2 adjacency aura (the general-aura twin). |

`spendProphet` spends a whole piece and `spendCharge` spends one; which an act
uses is the whole of the two-charge rule. `plantingHandOf` says who may plant
what (worker → improvements, great person → its family's work, prophet → the
holy site, augur and apostle → nothing).

## Rites (schema 74)

A rite is a **city's verb**: `performRite {cityId, rite}`. The town must hold the
(the tree is the only gate — no building opens the verb), the empire must have been taught
the rite (`ABILITY_TECH`, the same five nodes), the town must not already be
keeping one (`cityRite`, derived off `City.timed` — the seal *is* the ten turns),
and the bank must cover `religion.rite.costByAge` for the empire's age
(**40 · 56 · 72 · 90** — the faith ladder's rungs read by age).

Five rows, ten turns each, **pure blessing** — no instant grant anywhere:
food (+1🌾 on every hex that feeds) · gold (+1💰 on seams) · science (+1🔬 per
building here) · culture (+1🎵 on luxuries, +30% border growth) · military
(+5 defence; the heal half is `deferred`).

Recasting the Omens and The Preaching are `retired: true` — rows kept, abilities
gone from the tree.

## The relic

A **building** (`BuildingDef.placed`): never built, never bought, left by an
apostle in a town that has topped out a cathedral, one per town. Pays
`religion.relicFaith` (3🕯) a turn through the ordinary building fold, and
follows the stones on a capture.

## The faith ladder (schema 71)

A consecration is **automatic**: no unit, no errand. `RELIGION.ladder`
(`costBase` 40 · `costLinear` 15 · `costExponent` 1.5) prices rung *n* as
`floor(40 + 15n + n^1.5)` — 40 · 56 · 72 — and `openFaithLadder`, inside the
`religion` phase, deals the ordinary belief hand the moment `Player.faithPool`
covers the next rung, **spending the rung at the deal** (the user, 2026-09-06,
evening) and climbing `PlayerPantheon.rungs` then; the pick charges nothing.
`rungs` counts rungs climbed, never gods held: a wonder's god (Stonehenge's
free rung) is not a rung. The offer carries the price it paid
(`BeliefOffer.rungCost`) as its record. Three rungs, because the pantheon has
three slots and the third opens at The High Temple — the ladder never learns
the number.

## The reroll (schema 71; the belief ladder the same evening; the heavy hands at 85)

`rerollOffer {playerId}` deals a draft again — one verb, four hands, two ladders:

- An **Order** hand costs faith — `RELIGION.reroll`,
  `floor(base × ageMultiplier[age] × exponent^rerollsTaken)`, 35 to start at
  ×1.35 a use, gated on Chronology's Long Count ability — and raises
  `PlayerStatecraft.rerollsTaken` (lifetime, never reset) and
  `SlottedOrder.rerollsSeen` on every chair.
- A **Doctrine** hand and a **great-person** hand cost **twice** that (item q,
  2026-09-07): the same ladder, the same age table, the same door and the same
  lifetime count, times `RELIGION.reroll.heavyMultiple` — printed as a line of
  `explainRerollCost`'s fold ("A Doctrine is kept for good", "A name the whole
  world is drawing on"), never as a hidden factor. **One ladder for the three**:
  rerolling any of them makes the next reroll of all of them dearer. Neither
  raises `rerollsSeen` — The Votive Tally is written on the Order draft and says
  so. The redeal is each hand's own dealer: a Doctrine at the seat's own
  government tier, a name into `GreatPersonOffer.family` when the hand was dealt
  narrow (The Academy's bought scholar draft is rerollable, and is redealt as
  scholars).
- A **belief** hand — the pantheon's or a prophet's — asks nothing the **first**
  time and faith after that: `explainBeliefRerollCost`, the same base and age
  multiplier with the exponent raised to the paid askings **on this hand**
  (`BeliefOffer.rerolls`), reset with the next hand, no door, entirely separate
  from the Order count. The offer card prints the next asking's price.

`rerollKindFor` decides which hand the verb answers when a seat holds several:
Order · Doctrine · belief · name, which is `firstBlocker`'s order — the order the
interface raises them in — so the free hand is behind every hand that charges the
bank and no button spends on a hand that is off screen.

The skip's pity, the culture meter and the tier are untouched by any of them.

## Founding

- `plantHolySite` on a prophet with no religion: founds it, raises the site
  (+2🕯 +1🎵, one hex, `WorkFamily 'prophet'`), and drafts the first two rungs
  of the belief ladder. Refusals are player-plain ("You have no gods…",
  "The world has all the religions it will hold").
- `Religion.holySite` is written once (`??=`) — a later site extends the tide
  but never moves the seat of the faith.
- A finished religion: pantheon (2–4, empire-native) + up to 3 followers + up
  to 2 enhancers. `pools: { followerSlots, enhancerSlots }` is the dial.

## Who is paid

- **Pantheon** → the empire that consecrated it (never moves).
- **Founder side** → the owner of the holy city, derived
  (`religionFounder`; falls back to `founderId` only when no stones stand on
  owned ground). Pays the enhancers' empire lines + the **founder trickle**
  (+1🕯 per foreign following city, +1💰 per two). Capture moves it.
- **Follower beliefs** → city-local, to whoever OWNS each following city
  (a rival's faith in your town is a gift). A follower row that pays an
  empire fails `religionDataProblems`.
- **Enhancers** → the tide itself: `{ kind: 'pressureRule', rule, delta }`
  over `rules.religion`, read only in `explainPressure`.

## The tide

`spreadReligion` runs before `collectYields`; measures every town against one
board, then moves every town. `bankPressure` (the one converter — division,
carry, cap) has exactly two callers: the phase and `pressLump`;
`purgePressure` is its negative sibling over the shared `writeBank`. Pinned by
source test.

Pressure sources (`explainPressure`, rule-5 list; numbers in
`rules.religion`):

| Source | Key | Default |
|---|---|---|
| Holy site in range | `siteRange`/`siteStrength` | 6 / 6 |
| Following city | `cityRange`/`cityStrength` | 3 / 2 |
| Road-joined following city | `roadStrength` (any distance) | 4 |
| Trade route from a following city | `routeStrength` | 3 |
| Founder's capital (own faith) | `capitalStrength` | 4 |
| Temple in the city | `templeOwnPercent`/`templeForeignPercent` | 200 / 75 |
| Wonders | `{ kind: 'pressure', amount, range }` rows | per row |

- `pressurePerConvert` 10; one citizen converts per full bank.
- `cityReligion(city)` is DERIVED: the faith more than half the citizens
  follow, else null. `City.followers`/`City.pressureBank` are the stored
  halves.
- Conversion order: unconverted first, then smallest congregation, ties by
  founding order. Growth adds an unconverted citizen; starvation shrinks the
  largest congregation.
- Taking a belief refreshes the whole empire (`refreshBeliefDerived` —
  register entry).

## Lumps (instant, nothing lingers)

- **Proclaim** (prophet charge): `bombRange` 10, `bombLump` 60, temple share
  taken on the way in (same `templeShare` as the tide), banked then converted
  on the spot. Reports `CommandResult.proclaimed`; previews via
  `proclaimPreview`. A bomb converts; a holy site keeps.
- **Proclaim** (apostle charge): the same act at `apostle.proclaimRange` 6 and
  `apostle.proclaimPercent` 50 — a *share* of whatever a prophet's lump is worth
  today, so a retune moves both together.
- **Purge** (inquisitor): the negative lump; converts to nobody.

## Buildings & wonders

- Temple: the defensive building (no combat) — doubles own pressure, cuts
  foreign to 75%.
- The High Temple (tech): prophet + Temple + third pantheon slot. (The great-person offer gate, `ancestorRites`, moved to Epic
  Poetry on 2026-09-05 — renown answered too early, and the poets read better.)
- Cathedral: 340⚙, contributions, five consecrations (`docs/design-notes.md`).
- Reliquary (The Holy Office): opens faith purchases for units
  (`faithPurchases`).
- Hagia Sophia grants a real prophet; pressure rows on wonders are one JSON
  line each (Djenné/Angkor still carry none — open).
- **The four faith houses** (batch B3, schema 97): the Mosque (Minarets), the
  Wat (Temple Spires), the Gurdwara (The Open Kitchen) and the Dar-e Mehr (The
  Eternal Flame). One follower belief apiece opens each row
  (`unlocksBuilding` + `BuildingDef.unlockedByCard`); no node names any of them,
  so each carries the Temple's column (5, medium — 117⚙) and prices off it.
  - **Bought with faith and never built.** `BuildingDef.purchaseOnly` keeps them
    out of every queue and `BuildingDef.purchase.currency` names the bank —
    `rosterBank`'s rule for a unit read of a building: *a row that names its own
    bank is sold out of that bank and no other*, so gold is refused in
    `purchaseError`'s own sentence. The price is the ordinary one converted at
    `production.faithPerHammer` (117🕯 today), a line of `explainPurchaseCost`'s
    list, so the age band and the column ride in for free.
  - **Only in a city that follows.** `BuildingDef.followingOnly`, read in
    `purchaseError` and nowhere else, answered by `cityBeliefUnlocksBuilding` —
    do the follower beliefs of the faith *this town keeps* open the row. A town
    that turns loses the offer; a captured one carries it.
  - **Whoever owns a following city may have the row.** A follower belief is
    never in `liveEffects`, so `cardUnlocksBuilding` walks the empire's own
    towns' beliefs after its law. Availability is the empire's question; where it
    may stand is the town's.
- Stonehenge: a pantheon slot, and a **free rung** on completion
  (`CompletionGrant` `{ grant: 'faithRung' }` → `openFreeRung`) — the ordinary
  consecration hand, with no `BeliefOffer.rungCost`, so the pick spends nothing
  and `PlayerPantheon.rungs` does not move (a wonder's god is not a rung). It
  granted an augur until 2026-09-06.

## Deferred

Theocratic Mandate (diplomacy) · Sanctuary (never written into the table).
See `docs/flags.md`.

**Holy Order is built** (batch B2, 2026-09-08). It opens the **Knights Templar**
— a roster row no technology names (`UnitDef.unlockedByCard`, handed over by the
belief's `unlocksUnit`), bought out of the faith bank and never queued
(`UnitPurchaseSpec.exclusive`). Its strength and its price are both the best
mounted row the empire's tree has taught it (`UnitDef.mirrors`, read once by
`mirrorRowFor`): the difference from its own floor is stamped on the piece at
`realiseItem`, and the price is that row's production cost taken at the mirror's
`costPercent`, in faith, as a line of `explainPurchaseCost`'s list. The belief's
second clause is an ordinary `combatLine` narrowed to the row, paid inside any
city that follows the religion.

# Religion v2 — prophets, religions and the tide of belief

Working doc (2026-08-27), first draft for the user's Revisions. Builds on Religion v1 (ledger
Entry XXVIII: the pantheon and the augur — **shipped**) and on `docs/trade.md` (roads and routes
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
     it afterwards — a bomb converts, a holy site keeps.
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
  that is Civ V's rule and it is what removes every reason for religious war.
- **The founder** gets the **founder trickle**: `+1🕯 per foreign following city` and
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

*(yours — edit away; ✎ marks what changed)*

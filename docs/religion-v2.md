# Religion — reference

The shipped system (v2 + the one-charge clergy rework, Entries XXVIII/XL and
the Themes Build P2). Sources of truth: `data/religion.json` (pools, names,
trickle), `rules.religion` in `data/rules.json` (the tide's numbers),
`src/sim/religion.ts` (the phase and the verbs), `statecraft.ts` (the one
effect evaluator). Draft history and superseded designs: git and
`docs/design-history.md`.

## Principles

- **Religion is a tide, not a verb**: no missionaries, no theological combat.
  What a city follows is recomputed from pressure; the levers are things a
  player already does, plus the clergy's one-shot acts.
- **Religions are fluid, never historical**: name generated at founding from
  the pantheon's axes (`names.epithets` + `patterns`, drawn from `state.rng`;
  `renameReligion` is pure prose). The pantheon IS the identity and is never
  redrafted.
- Cap: `maxReligions` = ⌈2/3 × real players⌉.

## The clergy (all one-shot)

| Unit | Called with | Act |
|---|---|---|
| **Augur** (Divination) | faith ladder 40 +15 | ONE charge: a consecration OR one rite; the act is its whole turn (`augurHasActed`). May plant nothing. |
| **Prophet** (The High Temple) | faith ladder 120 +60, own ladder | ONE charge. First prophet: `plantHolySite` founds the religion + raises the holy site + opens the founding drafts. Later prophets: one belief rung each (`gainBelief`, pool by `nextBeliefPool`'s ladder — followers to 3, then enhancers to 2; enhancers gated on Theology). `redraftBeliefs` kept (flagged in `docs/flags.md`). |
| **Inquisitor** (The Holy Office) | flat 200 faith | Purge: a negative lump vs rival pressure (range 5, `purgeLump` 60; unconverted go to **nobody**) + a standing +2 adjacency aura (the general-aura twin). |

`spendProphet` is the only spender; `plantingHandOf` says who may plant what
(worker → improvements, great person → its family's work, prophet → the holy
site, augur → nothing).

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
- **The Preaching** (augur rite): the same act at range 4 / lump 20 (numbers
  on the rite's own row).
- **Purge** (inquisitor): the negative lump; converts to nobody.

## Buildings & wonders

- Temple: the defensive building (no combat) — doubles own pressure, cuts
  foreign to 75%.
- The High Temple (tech): prophet + Temple + third pantheon slot + The
  Preaching; the great-person offer gate also lives here (`ancestorRites`
  ability, re-homed).
- Cathedral: 340⚙, contributions, five consecrations (`docs/design-notes.md`).
- Reliquary (The Holy Office): opens faith purchases for units
  (`faithPurchases`).
- Hagia Sophia grants a real prophet; pressure rows on wonders are one JSON
  line each (Djenné/Angkor still carry none — open).

## Deferred

Holy Order (a faith-bought unit line) · Theocratic Mandate (diplomacy) ·
Sanctuary (never written into the table). See `docs/flags.md`.

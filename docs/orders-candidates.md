# Orders — candidates and rarity (working doc, 2026-08-29)

Draft for the user to cut, answering the 8/29 note: *"we need more orders in the pool, as you
tend to see a lot of repeats currently. We may also want to introduce a rarity value for the
better orders."* Companion to `docs/orders-and-doctrines.md` (the master list; nothing here is
in it until it is moved there) and `docs/statecraft-cards.md` (the ratified Æra I–II content).
**Nothing here is scheduled until the master list says so.**

## Why the repeats happen

`livePool` is the current government's pool plus the previous one, minus what the seat holds,
and an offer is three cards drawn **uniformly without replacement** from it (`drawOrderOffer`).
Two things make the same faces come round:

1. **A declined card goes straight back.** Nothing remembers that you passed on Salt Tithes
   twice; on the third draft it has the same odds as a card you have never seen.
2. **The pools are small at the point you draft most.** Chiefdom (11) + Government I (22)
   is 33 live cards, and every card you *take* shrinks it. By tier 15 the live set is
   Government I + II (41) minus your six or seven held, and the militaries you decline every
   time are a third of it.

More rows help the second; only a draw rule helps the first. Both are proposed below.

## The rarity proposal

One field on the row, `rarity: 'common' | 'uncommon' | 'rare'`, read in exactly one place —
the draw — as a **weight, never a restriction** (the great-people rule: "weighted, never
restricted, and spills before it fails"). Proposed weights, as data in `rules.offers`:

| rarity | mark | weight | what goes here |
|---|---|---|---|
| common | ● | 4 | the workhorses — a flat yield, a per-city bonus, one number |
| uncommon | ◆ | 2 | a conditional engine — pays when you are *doing* something |
| rare | ○ | 1 | a rule-changer — an action rule, a slot, a draft rider, a build-around |

So a rare shows up about a third as often as a common, but a hand of three drawn from forty
still has a rare in it roughly two drafts out of five. Every existing row is marked below the
first time it is mentioned; the three marks already used for Æra III–V in the master list are
the same three, so the column exists and only needs a default (`common`) for the rows that
carry none.

**The decline rule** (the fix for repeats, separate from rarity): a card offered and not taken
gets a `passedTurn` stamp on the seat's Statecraft (`Map<OrderId, turn>` — presence is the
state, absolute turn, never a countdown), and the draw weight of a card passed within the last
20 turns is **halved** (floored at 1). Passing twice does not halve twice; the stamp is just
the latest. A seat that never passes a card sees no change and replays byte-identically.
`rules.offers.passedWeightTurns: 20`, `passedWeightDivisor: 2`.

Shape cost: one field on `OrderDef`, one map on `PlayerStatecraft` (schema bump), one weighted
draw beside `drawWithoutReplacement` — the great-people draw already has one to copy.

## Candidates

Format is the master list's: **Order | type | theme | rarity | effect | shape** — the last
column names the existing `CardEffect` shape the row would use, or **NEW** for one that does
not exist (a design decision, not a JSON row). Numbers are first guesses for the pacing test.
Type: M military · E economic · W wildcard. Themes are the master list's fourteen.

### Chiefdom pool (tier 0 · 11 today)

The opening pool is the one where repeats sting least — you hold it for four tiers — but it
is thin on E and W, and every M is about barbarians. Candidates lean the other way.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| Fire-Keepers | W | 🕯 | ● | +1🕯 +1 happiness in your capital | `cityYields` scoped capital + `conditionRule` (cities ≤1) → `happiness` |
| The Long Portage | E | ⚓ | ● | coastal cities +1⚙ · embarked units +1 movement | `cityYields` scoped coastal + `unitStat movement` filtered embarked (NEW filter) |
| Seed Corn | E | 🌾 | uncommon | newly founded cities start with an extra population | `foundingRider` `food: 5` (NEW field on the existing rider) |
| Wolf-Runners | M | 🏹 | ◆ | scouts +1 movement · claiming a ruin grants +10💰 | `unitStat movement` filtered explorer + `windfallRider occasion:'discovery'` |
| Hearth Songs | W | 🎵 | ◆ | +1🎵 per city in cities with <= 4 population | `countScaled cities` + `conditionRule` |

### Government I pool (tier 3 · 22 today)

Already the fattest pool, but eleven of its twenty-two are E and eight of those are 🐫; the
draft feels like a caravan catalogue. Candidates fill W and the non-caravan E lines.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| The Corvée | E | ⚒ | ● | +1⚙ in every city per 3 citizens | `countScaled where:'city'` on population (existing count) |
| River Wardens | E | 🌾 | ● | +1🌾 on every farm beside fresh water | `tileYields` with `freshwater` condition (exists for the renewal) |
| The Almanac | W | ✶ | ● | +2🔬 in your capital · +1🔬 per Library | `cityYields` scoped capital + `hasBuilding` scope |
| Village Fairs | W | 🌱 | ● | +1 happiness per luxury you hold two or more copies of | `countScaled` on duplicate luxuries (existing `resourceCopies`) |
| The Muster Roll | M | 🎖 | ● | newly created units gain +10 max hp (veteran on the day) | `unitStat` NEW stat `startHp` read in `createUnit`'s card fold |
| Hill Forts | M | ⛰ | ◆ | +2 combat strength defending on hills · cities on hills cost 1 fewer authority | `combatLine` terrain-conditioned + `countScaled cities` with terrain scope |
| The Pilgrim's Purse | W | 🕯 | ◆ | cities adjacent to a holy site gain +5 faith per turn | `foundingRider` NEW: adjacency to an improvement |
| Charter Towns | E | 📜 | ◆ | newly founded cities gain a free granary | `foundingRider {building:'granary', fromCity:3}` (NEW `fromCity`) |
| The Bronze Mirror | W | ✶ | ○ | completing a technology spawns one unique luxury within 3 hexes of your capital (one-time use, spawns a unique luxury that isn't in the game) | `actionRule` NEW |

### Government II pool (tier 7 · 19 today)

Solid M line, thin W (three). Candidates: four W, two E outside 🐫, one M with a twist.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| The Choir | W | 🕯 | ● | +1🎵 per Temple · Temples +1 happiness | `cityYields hasBuilding` + `happiness hasBuilding` |
| Star-Gazers | W | ✶ | ● | +2🔬 in cities beside a mountain | `cityYields` scoped `mountainAdjacent` (exists) |
| Cistern Works | E | 🌾 | ● | all cities gain freshwater access |
| Ledger-Keepers | E | 🐫 | ● | +1💰 per Market · while slotted, gain +1 route capacity | `cityYields hasBuilding` + `routeSlots` rider (NEW on a card; exists on buildings) |
| Drums of War | M | 🎖 | ◆ | newly trained units gain +1 combat strength | `combatLine` with a capital-radius condition (NEW) |
| The Cartographers | W | 🧭 | ◆ | +1🔬 per 40 hexes revealed (no cap) | `countScaled revealedTiles per 30 max 6` |
| Guild of Masons | E | ⚒ | ◆ | buildings cost −10%⚙ in cities of size 6+ | `productionBonus category:'building'` scoped by size (exists for The Estates) |
| The Oath-Bound | M | 🎖 | ○ | after killing a unit, units gain +15hp | `windfallRider occasion:'kill'` NEW grant kind `heal` |
| Sanctuary | W | 🕯 | ○ | your holy city cannot be captured while it follows your religion — it is sacked instead (walls to one, gold taken, town keeps its owner) | NEW rule; deferred until sacking exists |

### Government III pool (tier 15 · 15 today)

The thinnest pool at the tier where drafts are most frequent. Eight candidates, spread evenly.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| Provincial Levies | M | 🎖 | ● | every city with a Barracks +2⚙ toward units | `productionBonus category:'unit'` scoped `hasBuilding` |
| The Engineers | M | ⚒ | ● | siege units +1 movement · siege units cost −15%⚙ | `unitStat movement` filtered siege + `productionBonus modelClass:'siege'` |
| The Road Tax | E | 🐫 | ● | +1💰 per 3 paved hexes you own | `countScaled` NEW count `roads` |
| Granaries of the State | E | 🌾 | ● | cities of size 8+ keep 50% of their food basket on growth | `growthRule` (Public Granaries' shape) scoped by size |
| The Astronomers | W | ✶ | ◆ | Observatories… (deferred: no Observatory) · meanwhile: Libraries +2🔬 in cities of size 8+ | `cityYields hasBuilding` scoped by size |
| Panem | W | 🌱 | ◆ | +1 happiness per 2 citizens in your capital | `countScaled` capital population (exists via `capitalPop`?) — check |
| The Provincial Senate | E | 📜 | ○ | every fourth city you found grants +1 authority capacity permanently | `countScaled cities per 4` → authority |
| Amnesty | W | 📜 | ○ | adopting a government seals nothing this time (the next adoption's Orders are open at once) | `metaRule sealTurns` one-shot (NEW one-shot) |
| The Exarchs | M | 📜 | ○ | captured cities keep their buildings · a captured city costs one less authority | `captureRule` NEW + `meterRule capturedCityCost delta` |

### Government IV pool (tier 29 · the master list's Æra IV rows, none built)

The master list already holds ~20 rows for this pool waiting on the tree pass. Candidates add
what that list is short of — 🌾/⛰/☽/📜 themes, which the four new themes exist for.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| The Terraces | E | ⛰ | ● | hills +1🌾 when worked by a city of size 10+ | `tileYields terrain:'hills'` scoped by size |
| Mountain Passes | M | ⛰ | ● | units ignore hill movement cost | `unitStat` NEW `ignoresHills` or `moveRule` |
| The Enclosures | E | 🌾 | ◆ | pastures +1💰 +1⚙ · −1 happiness per 3 pastures | `tileYields improvement` + `countScaled improvements` → happiness |
| The Scriptorium | W | ☽ | ● | +1🔬 per 4🕯 gained per turn | `rateConversion faithPerTurn per 4` → science |
| Monastic Orders | W | ☽ | ◆ | Temples +2🔬 · cities that follow your religion +1🔬 per 4 citizens | `cityYields hasBuilding` + `countScaled where:'city'` scoped `follows` |
| The Assize | E | 📜 | ◆ | +1 authority capacity per 2 cities connected to the capital | `countScaled` NEW count `connectedCities` (exists in `explainEmpireGold`) |
| The Iron Crown | M | 🎖 | ○ | your capital may hold two military units | `stackingRule` NEW, capital only |
| The Concordat | W | ☽ | ○ | founder beliefs of a religion whose holy city you hold pay double | `effectAmplifier` NEW target |
| Free Cities | E | 📜 | ○ | cities founded from now on cost no authority but grow 25% slower | `meterRule foundedCityCost 0` + `growthPercent −25` scoped `foundedAfter` (NEW) |

### Government V pool (tier 45 · Æra V, none built)

Game-enders. Few, and every one rare-or-uncommon; commons here would be lost in the noise.

| Order | T | theme | rarity | effect | shape |
|---|---|---|---|---|---|
| The Magister's Table | W | 🜍 | ○ | every draft of every kind shows two more cards | `offerRider {offer:'all', extra:2}` |
| The Great Work's Shadow | E | 🜍 | ◆ | +5⚙ in every city while the Great Work is in a queue | `conditionRule` (project queued, NEW condition) → `cityYields` |
| The Dream of Engines | E | 🜍 | ○ | Manufactories… (deferred with the great work) · meanwhile: +10%⚙ empire-wide | `productionBonus` empire stage |
| Pax | W | 📜 | ◆ | +2 happiness per city while no city of yours has been attacked for 10 turns | `conditionRule` NEW (last-attacked stamp) |
| The Last Levy | M | 🎖 | ○ | once: every city musters its best melee unit now | `onSlot` grant, `bestMelee` per city (the Laureate's shape, per city) |
| The Annals | W | 🏛 | ◆ | +2 renown per turn per Triumph earned this age | `renown` × `countScaled triumphsThisAge` (NEW count) |
| Apotheosis | W | ☽ | ○ | your religion's follower beliefs apply in every city you own, following or not | `religionRule` NEW |

## What the tree pass has to bring before some of these are real

Observatory, Manufactory, the Great Work project (`docs/tech-tree-ages-2-5.md`), a war state
(Drums of War, Pax), sacking (Sanctuary). Everything else is an existing shape or a named
NEW one that is generic enough to be worth adding — the same bar the beliefs pass set.

## Suggested order of work

1. Rarity field + weighted draw + the decline stamp (one pass; schema bump).
2. The ● and ◆ rows whose shapes exist — Chiefdom and Government I first (they are the pools
   drafted most), then III (the thinnest).
3. The ○ rows with NEW shapes, each as its own decision.

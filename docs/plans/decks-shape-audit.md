# The decks — shape audit

**Measured 2026-09-17, branch `decks`, at the end of D1b.** Seven agents entered every card of `docs/six-decks-first-cut.md` as a data row: **live** where the card's text fits the effect vocabulary as it stands, **deferred** (in the data, in the Compendium, in no pool) where it does not. This document is the fold of their seven deferral lists. It is the input to D2, and its ranking is the order D2 should build in.

## What is live

| Deck | Rows | Live | Share |
|---|---|---|---|
| Dominion | 85 | 49 | 58% |
| Commons and cross-type | 55 | 30 | 55% |
| Magisterial | 77 | 24 | 31% |
| Devotion | 44 | 13 | 30% |
| Commerce | 49 | 11 | 22% |
| Expansionist | 49 | 11 | 22% |
| Scientific | 40 | 6 | 15% |
| **Total** | **399** | **144** | **36%** |

Dominion is nearly twice as buildable as any other deck because it was written against the game as it stands; the other five were written against the game as it could be. The commons are the safety net and are half live, which is what keeps a thin pool playable.

Bands 2 and 3 are the thin ones: Magisterial has 3 live rows across its last 36, Scientific 1 across its last 20. A seat in age 3 or 4 currently draws very little that is new.

## The ranking — shapes by cards freed

Counts are cards that become live (or lose their last blocking clause) when the shape lands. A card blocked by two shapes is counted under both.

### Wave 1 — scopes and counts (no new system, no new state)

These are extensions of readings the evaluator already performs. Together they are most of the deferred catalogue.

| # | The shape | Cards | Where it bites |
|---|---|---|---|
| 1 | **A threshold on a building count in a `CityScope`** — "cities with at least two culture buildings" | ~17 | Magisterial's whole civic line |
| 2 | **A worked-improvement `CityScope`** — "cities working a great-person improvement / a quarry / a Holy Site". Today the sim can ask whether an improvement lies inside a town's borders, never whether a citizen works it | ~15 | Magisterial 7, Scientific 3, Devotion 3, Expansionist |
| 3 | **`count` / `per` / `max` on effects that lack them** — `productionBonus`, `routeRider`, `basis:'share'`, hex `pays`, counted `happiness` (which ignores `scope`) | ~12 | every deck |
| 4 | **A once-per-empire selector** — no `CountKind` and no `CityScope` can say "an empire building", though the marker exists on the buildings | 7 | Scientific's Institutions line entire |
| 5 | **A `scope` on `CardRenownEffect`** — renown is empire-wide and cannot be asked of a town | ~8 | Magisterial 5, crosses 3 |
| 6 | **A per-city authority discount or surcharge** — `authority` is capacity only; "costs one less authority" cannot be said | ~10 | Commerce 4, Magisterial 2, Scientific 2, Devotion 2 |
| 7 | **A wonder-holding `CityScope`** — "a wonder stands in this town" is a count, never a predicate | 8 | Magisterial |
| 8 | **Distinct-kind counts** — feature types worked, building categories held, strategic kinds accessible, great-work kinds worked | ~8 | every deck |
| 9 | **Negation in scopes and empire conditions** — "cities without a rite", "while at peace" (only `atWar` exists) | ~7 | Dominion 3, Devotion, Magisterial |
| 10 | **Windfall grants scaled by the occasion's own facts** — a unit's strength, a captured town's population, the gold actually paid | ~7 | Dominion 4, Magisterial 2, Commerce |
| 11 | **`TallyOccasion` members** — kill, unit trained, camp cleared, growth, building completed, wonder completed | ~8 | the growing cards in Dominion, Magisterial, Expansionist, Scientific |
| 12 | **A `scope` and a building-category on `CardPurchaseRiderEffect`** — a price is asked of an empire, never of a town | ~5 | Magisterial, Commerce, crosses, Dominion |
| 13 | **`TileCondition` members for adjacency** — beside a road, beside a forest, beside a great work | ~6 | Expansionist, crosses |
| 14 | **`movement` and `sight` on `CardUnitStampEffect`** — the field exists on the stamp, no card may write it | 3 | Dominion, Commerce, Scientific |
| 15 | **A once-per-turn limiter on a windfall rider** | 3 | Dominion, crosses |

### Wave 2 — facts the world does not keep

Each needs new state, and each is cheap per card once kept.

| The shape | Cards | Note |
|---|---|---|
| **An age stamp** — "placed on turn", read as "at least twenty turns old" | ~12 | Scientific's maturity line, Commerce's route maturity, Expansionist's old growth. One fact, three decks. The cheapest system per card in the audit |
| **A per-empire commercial post** — the existing `tradingPost` flag is shared by both endpoints and cannot say "mine" | 7 | Commerce's Posts line entire |
| **Grants that pay another empire** — a foreign host, a partner's capital | ~8 | Commerce 6, Devotion 2. The bilateral cards, which are the multiplayer-safe ones |
| **A lifetime units-built count, and a captured-city count** | ~3 | Dominion |
| **A founding-trait record per city** | 2 | Expansionist's The Land Shapes Us and its finish |
| **First-of-a-kind records** — first improvement on a hex, first building of a kind in a city, first foreign city converted, first to research a technology | ~6 | across four decks |

### Wave 3 — systems

Each is a batch of its own, and each is a design decision before it is code.

- **The charter-keyed tree**: five off-lane technologies gated by a drafted charter (Optics, Alloys, Taxonomy, Mechanics, Chemistry). Frees the five Scientific charters and makes the deck's private-research line real.
- **Population payments and migration** — Expansionist's People line.
- **Planting, maturity and regrowth** — Expansionist's Woodland line, and the Coppice cycle.
- **Priced city commands (the miracles)** — Devotion's Miracles line.
- **Card-unlocked buildings that do not exist yet** — the Plantation House, the Purple Works, the Dye Vats, and the Devotion rites (Mourning, Watch, Passage).
- **A worker-built improvement and a claim rule** — Expansionist's Spade line.

## The build order — ruled 2026-09-17

The user: *"lets try and get broad coverage, but leave any new mechanics that are only needed for 1-2 cards."* So the filter is **three cards or it does not get built**, and the batches below are ordered by cards freed per unit of work. Counts are approximate and overlap: a card blocked by two shapes is freed only when both land.

| Batch | What it builds | Cards freed | Kind |
|---|---|---|---|
| **D2a — predicates** | Threshold on a building count · worked-improvement scope · wonder-holding scope · negation in scopes and empire conditions (at peace, without a rite) · adjacency members on a tile condition | ~50 | new members on existing unions |
| **D2b — counts and reach** | `count`/`per`/`max` on the effects that lack them · distinct-kind counts · the empire-building selector · a scope on renown · a scope and building-category on the purchase rider · a per-city authority discount or surcharge | ~45 | new fields on existing shapes |
| **D2c — occasions** | Tally members (kill, unit trained, camp cleared, growth, building completed, wonder completed) · windfall grants scaled by the occasion's own facts · first-of-a-kind records · a once-per-turn limiter | ~25 | new members and one record |
| **D2d — the age stamp** | "Placed on turn" on buildings, works, forests and routes, read as "at least twenty turns old" | ~12 | one new fact |
| **D2e — the bilateral grant** | A grant that pays another empire (a foreign host, a partner's capital) · the per-empire commercial post | ~15 | one new payee, one new record |
| **D2f — the systems** | Population payments · planting and regrowth · priced city commands · the charter-keyed tree · the three card-unlocked buildings and the three rites · the worker claim rule | ~30 | a batch apiece, design decisions first |

**Cut by the rule** (kept as deferred rows, never built): the founding-trait record (2 cards — Expansionist's The Land Shapes Us and its finish). Everything else in this audit clears three.

**Watch for**: D2a and D2b together are most of the catalogue and they are the same kind of work — growing the vocabulary rather than the world. They should be one agent each, run back to back, with the card files re-swept after each to un-defer whatever the batch freed. A row is un-deferred by deleting its `deferred` and writing its `effects`; nothing else about it changes.

## Two rules the batch hit, and what they cost

**Never bend a card.** Where one clause fit and its partner did not, the card deferred whole. That is the right rule and it cost real rows: six in Devotion, five in the commons, several in Scientific. Each is one line of data waiting on its partner, and the ranking above is exactly the order that frees them.

**A deferred charter is still dealt.** `orderIsDealt` says a charter with no effects is dealt, since its grant is the whole of the card. A *deferred* charter therefore sits in the pool and would write a dead id onto the player. Two agents worked around it by marking the row retired. The honest fix is one clause: a charter naming a thing that does not exist is not dealt.

## Smaller findings, worth recording

- **`line` is dead for the new rows.** The old fifteen threads are a closed union with a mark, an accent and a stylesheet cut apiece; the six decks' own labels are not members. Every new row carries no line. The deck is the thread now, and the one real reader (the bot's synergy bonus for cards sharing a thread) should read decks instead.
- **Ids collide with the retired shelf** wherever a card keeps its old name. Each agent invented its own scheme (a prefix, a dropped article, a suffix). Ids are internal; normalise once.
- **The flat `pays` describer has no capital case** and prints "in every city" for a capital line. Three agents routed around it by using a city scope instead. Worth fixing where the words are made.
- **`describeEffects` drops a combat line's side**, so a defence-only bonus prints as unconditional.
- **Flavour is required on every row**, and the design doc supplies none, so every flavour line in the seven files was written by an agent. They want a pass from whoever owns the voice.

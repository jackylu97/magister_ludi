# The fewer-things pass — the build plan (2026-09-06)

What the four marked-up docs rule, cut into batches with fences. The docs of
record: `docs/fewer-things.md` (buildings, religion, the deck's shapes, cadence),
`docs/balance-turn.md` (the standalones' numbers, the science cut),
`docs/tech-gifts.md` (the tree's gifts, the unique buildings),
`docs/orders-pass-3.md` (every Order's verdict, the grammar). Agents read those
files, never this chat. Each batch: typecheck + core + build in a clean
worktree, committed by explicit path; `TEST_TIER=all` before every push; the
pacing harnesses re-aimed **once per batch**, dated; one schema bump per
batch that changes a save's shape.

The order is dependency order. A and B and C run in parallel on disjoint
fences; D waits for A; E rides with D; F waits for A–E; G is last.

| # | batch | what lands | fence | schema | after |
|---|---|---|---|---|---|
| **A** | **The shapes** | the additive amplifier by voice over card yields (with a `capital` scope for "yields to your capital from Orders are 50% more effective") · the building-yield percent by category, with an `appliedLast` flag (a doubler is +100% applied last) · the `yields X` tile test · the slot-position reader over ordered slots · the periodic occasion (`everyTurns`, absolute `nextFiresTurn`, floor two) and its period modifier · a city-scoped renown percent · a route-yield line on the route object (so "double your trade route yields" has a thing to double) · the reroll tally count (reads batch C's counter; lands as a count with nothing to count until C). Every shape read by the evaluator, priced by the bot (`explainCounted` / a percent arm / a windfall over the period), worded by the describers, pinned in the fold registry. **Byte-identical: no row uses a shape yet** | `src/sim/statecraftData.ts`, `statecraft.ts`, `cities.ts` (the fold), `routeYields.ts`, `renown.ts`, `src/ai/value.ts`, `test/sim/statecraft*.test.ts`, `cardImpact.test.ts` | none (no row) | — |
| **B** | **The reveal** | a newly slotted card shows no stamp until Confirm; on Confirm the fold runs in order and the **aggregate** fires with the count-up in the Statecraft screen and the Ledger's deck band; slots ordered as drawn with position words on the face ("first economic slot"); rearranging is an unconfirmed placement | `src/ui/statecraftScreen.ts`, `cardStamp.ts`, `ledgerScreen.ts`, `offerCard.ts` (no), `style.css`, `test/ui/*` | none | — |
| **C1** | **Faith's currency** | the Magister's dice removed (`Player.dice`, `startingDice`, bead `dice`, The Long Count's die — rows retired for replay) · the **faith ladder**: the pantheon's three consecrations at faith thresholds (40, +15 a rung), drawn once, spent by a command, dealt with the tarot ceremony · the **reroll** of an Order draft for faith (35 to start, a slight exponent per reroll; a great prophet's draft free and uncounted; the button prints the next price) · the reroll counter the shrine engine reads | `src/sim/religion.ts`, `religionData.ts`, `beads.ts`/`beadData.ts` (dice out), `commands.ts` (`rerollOffer`), `data/religion.json`, `data/beads.json`, `data/techs.json` (The Long Count's die), `src/ui/offerCard.ts` (the reroll button), `main.ts` wiring, `src/ai/wants.ts` (`faithPlan`: the ladder joins the draft plan; the reroll unpriced at first, written down) | **71** | — |
| **C2** | **Rites, prophets, the apostle** | rites as **city verbs** (`performRite {cityId, rite}`), the five reworked rows at ten turns, the Chapel the door, per-city one rite at a time (the seal is the rite's ten turns), price the ladder's first rung rising a rung per age — *the one open number; default until re-ruled* · the augur retired (row kept for replay), `chargedAugurs` and Court Augurs re-cut (renamed; pays every city with an active rite) · the prophet's four acts (found/enhance both charges, plant a holy site both, proclamation one, an empire-wide rite one = the five rites cast everywhere) · `redraftBeliefs` removed · the **apostle** at Theology (two charges, 4 movement, half proclamation within six, heal 25, **relic**: one per cathedral, faith per turn) · the rite abilities stay on their nodes, bearer the city · bot `explainRites` as a per-city want | `src/sim/religion.ts`, `greatPeople.ts` (no), `units.json`, `religion.json`, `commands.ts`, `techs.json` (Theology's unit), `src/ui/cityPanel.ts` (the rite verb), `unitPanel.ts` (prophet/apostle acts), `src/ai/wants.ts`, tests | **72** | C1 (the ladder replaces the augur's consecration) |
| **D** | **Buildings with chains** | `BuildingDef.requiresBuilding` (read in `buildError`, shown on the add-list row and the compendium) · the ten chains · the cut list (twelve rows behind a `retired`-style marker for replay; `townCharter` never built — the founding artefact) · the kept rows' new shapes (Amphitheater +0.5🎵/citizen, Bank +0.5💰/citizen +10%, the Monument's writ line cut, the Granary's growth share, the Reliquary into the Cathedral) · balance-turn §4's marked numbers (base beaker 0.5, Library 0.5, the −25% flats where a row survives as a flat) · the **five unique buildings** (`oncePerEmpire`: Heroic Epic at Epic Poetry, Imperial Throne at Kingship, High Temple at The High Temple, Forum at Philosophy, the Caravanserai at Mathematics; each at half the age's wonder cost; effects per tech-gifts §7 — the Throne's authority empire-wide, its unit rebate at the free-unit seam; the Heroic Epic's renown percent from A) · the three bead deeds re-aimed · the wonder grants ignore chains · the bot's parent reading (`potentialTownsFor`) · `explainEmpireGold` unchanged in shape; the pacing fixtures re-aimed **once, after D and E together** | `data/buildings.json`, `src/sim/buildingData.ts`, `buildings.ts`/`purchase.ts` (`buildError`), `realiseItem` (the rebate), `data/beads.json` (three deeds), `data/rules.json` (`sciencePerPop`), `src/ui/cityPanel.ts` (the chain sentence), `compendium.ts`, `src/ai/wants.ts` (the parent), `docs/tech-tree.md` per-age tables, tests | **73** | A |
| **E** | **The tree's gifts** | per tech-gifts §7: Irrigation's tile line · Kingship's Pageants (⚒→🎵, the third project) and +3 writ · the Civil Service (rename; +5 authority; great-work improvements +1⚒ +1🌾 — the `greatWork` tile test) · Artisanry (+10% wonders; wonders +2🎵) · Horology (the Water Clock reworked: periodic effects 2 turns earlier, every 7 turns science = empire production — the `empireProduction` count; the tech: every 10 turns +5🔬 per production building) · The Long Count (every 15 turns renown = science + faith buildings) · Machinery (roads a fifth — the road fraction on `MoveProfile`, priced in `stepCost` only) · Geomancy (mines on resources +1⚒ +1🕯) · The Silk Road (routes +1💰 per luxury at either end — the endpoint count) · Movable Type (cheer out; connected cities +10% science and production — the `connected` city condition) · The Holy Office loses the apostle to Theology (C2) · the vein layer stays shelved · the Long Count's reroll door (C1) and the ladder's door at Divination (C1) named in the notes | `data/techs.json`, `data/buildings.json` (projects, the Water Clock), `src/sim/techData.ts`, `pathfind.ts` (the road fraction), `routeYields.ts`, `statecraftData.ts` (three small members), `src/ai/chain.ts` (pricing the gifts), `docs/tech-tree.md`, `test/sim/tech*.test.ts` | rides D's | A, D (one data commit with D where a node's building leaves) |
| **F** | **The order pass** | every verdict in orders-pass-3 §2 as marked and §9 as ruled: 26 + the user's cuts retired, the converts, the new rows (the Gov II rare capital payoff, the shrine reroll tally, the doublers, the periodic conversions, the four Gov V bead Orders), the rarity moves, slot-flavour counts uncapped where marked, lines untouched (marks only) · the balance-turn §3 numbers on every surviving standalone · `docs/orders-and-doctrines.md` regenerated with a **role** column and its sync · cardImpact stamps · the compendium's words · the arena unchanged | `data/statecraft.json`, `docs/orders-and-doctrines.md`, `test/sim/statecraftDocSync.test.ts`, `cardImpact.test.ts`, `src/sim/statecraft.ts` (words only) | **74** (the draw bag) | A–E |
| **F2** | **The bot drafts engines** | the marginal draft reading `V(deck ∪ card) − V(deck)` in `draftPlan` / `expectedBestOrder` (the fold askable hypothetically — the memo's print makes a scratch state cheap); the reroll priced; byte-identical on boards where no engine is offered | `src/ai/wants.ts`, `value.ts`, `test/sim/aiWants.test.ts`, `aiDecision.slow` | none | F |
| **G** | **Cadence and chairs** | `meter.costExponent` 2.25 → 2.8; chairs −25% (Gov III 11 → 8, Gov IV and V commensurately, every group ≥ 1); the pacing harnesses re-aimed against the finished deck | `data/statecraft.json` (meter, governments), `docs/design-notes.md` slot table, `test/sim/statecraftPacing.slow.test.ts`, `tech.slow`, `endgame.slow` | **75** | F |

## What the playtest sees, and when

- After **A + B + C**: the reveal and the faith currency — playable on the
  current deck; a short session would already tell whether Confirm-as-reveal
  reads.
- After **D + E**: the buildings and the tree — the "just building more
  buildings" sentence gets its answer here. Worth a session on its own.
- After **F + G**: the deck. The full second playthrough.

The play checkout (:5199) moves only when the user says; every batch lands in
`main` behind the gates and waits.

## Cross-cutting

| | |
|---|---|
| **Schema** | 71 · 72 · 73 · 74 · 75 — one per batch that changes a save; saves from before the pass do not load (the standing rule) |
| **Harness re-aims** | after D+E (upkeep relief, science cut, the tree's gifts), after F (the deck), after G (the ladder) — three re-aims, dated, never one per row |
| **Determinism** | A is byte-identical by construction (no row); C1's reroll and ladder are logged commands; the periodic occasion stamps absolute turns; D's markers keep cut rows for replay |
| **The bot** | prices every new shape the day it lands (A) or is written down as a debt in the batch doc (the reroll in C1; engines until F2) |
| **The compendium and the arena** | generated; no page edit in any batch; a new shape needs its words in the describers (A, E) |
| **Open numbers** | the rites' price and seal (C2, default proposed); Gov IV/V chair triples (G); the Gov II rare payoff's and the shrine tally's exact figures (F) |
| **Deferred, not forgotten** | veins (shelved); the wonder cut (a pass of its own); the Æra V acceleration beyond the four bead Orders; the incumbency margin on the focus arm; the command-budget warning |

## As shipped

### Batch C2 as shipped (2026-09-06) — schema 74

Rites, prophets, the apostle. The user's complaint was an **errand** — *"i never
wanted to invest in my chapel because i was so far ahead and didnt want to waste
time paying for augurs and using them in my cities"* — so the errand goes and the
season stays.

**The schema number.** The plan wrote C2 as 72; the buildings batch (D) reached
`main` first and took 73, so this lands as **74** and says so in `state.ts`'s
changelog. Batch F's 74 in the table above is now 75, and G's 75 is 76.

#### A rite is a city's verb

`performRite { playerId, cityId, rite }` — no unit, no target hex, no belief.
Four refusals, in the order a player thinks of them (`riteError`):

| gate | reading |
|---|---|
| the town is yours | `city.ownerId` |
| it holds **the door** | `cityPerformsRites` — the marker `BuildingDef.ritesDoor` on the Chapel's row. Nothing in `src/sim/` names a chapel |
| the empire knows the rite | `hasAbility` + `riteAbility`, the same five nodes the augur's rites sat on |
| it is not already keeping one | `cityRite(state, city)` — **derived** off `City.timed`, so the seal *is* the rite's ten turns and there is no second clock to keep |
| the faith is there | `riteCostFor` |

**The price, ruled by default and stated as a number**: `religion.rite.costByAge`
= **40 · 56 · 72 · 90**. That is not a second curve — it is `faithRungCost` read
off by *age* instead of by consecration, which is the ruled sentence ("the
ladder's first rung, rising a rung per age") taken literally. An empire in Æra I
pays for a rite what its first god costs; one in Æra IV pays what a fourth god
would ask. Written out in `data/religion.json` rather than derived in code,
because the two are design decisions that happen to agree today.

**The seal is the rite's own ten turns.** A town keeping a rite refuses another
by name ("Uruk is already keeping Omen Reading"); the turn it lapses, another may
be said. Nothing ticks: `cityRite` is a comparison over `City.timed`.

The five rows, reworked to ten turns of **pure blessing** — there is no instant
grant left anywhere in the table, so `RiteGrantSpec`, `payRiteGrant`,
`RiteTarget`, `riteCityTarget`/`riteUnitTarget` and the whole `redraws` machinery
are gone:

| rite | node | what it hangs |
|---|---|---|
| Rite of the Harvest | Divination | `tileYield` on `{test:'yields',yield:'food'}` — +1🌾 (batch A's tile test, already built) |
| Omen Reading | Divination | `countScaled buildingsInCity` → +1🔬 in this city per building |
| Rite of Plenty | Currency | `tileYield` on `hasResource` — +1💰 |
| Consecration of the Bounds | Stonecraft | `tileYield` on `resourceKind: luxury` — +1🎵 · `rulePercent borderCulture +30` |
| Blessing of Arms | Bronzeworking | `cityStat defense +5` |

**Retired for replay** (`RiteDef.retired`, rows kept so `anyCardDef` still
resolves a save's id): Recasting the Omens — its redraw is the faith reroll's job
now — and The Preaching — its lump is the prophet's. Their two abilities left
`AbilityId` and the tree entirely, because an ability nothing teaches is a gift
on a tech card promising a verb no surface offers. `AbilityBearer` gained
**`city`** and the star chart's heading for the five is now *"Your cities may"*.

#### The augur, withdrawn

`UnitDef.retired` (the row kept). `buildError` and `purchaseError` refuse it —
both clauses stand **in front of** the bank's sentence, because "bought with
faith, not gold" would send a player to a bank that no longer sells it — and
`consecrateError` refuses always, with the design's own sentence: *"Your gods
arrive on their own, once your faith is deep enough."* The `consecrate` arm and
`consecrateAt` are untouched below that clause and unreachable, so the day an
agent-bought god is wanted back, one clause comes out and nothing else moves.

**Court Augurs → The Vigil.** Renamed, re-worded, and its effect **deferred**:
the ruled text is *"+X in every city with an active rite"* and `CityScope` has no
way to ask a town whether it is keeping one. The row ships with `effects: []` and
a `deferred` line in player prose, which is the vocabulary's own convention for a
card whose shape does not exist yet.

#### The prophet, two charges, four acts

| act | charges | routine |
|---|---|---|
| found a religion (the stones) | **both** — the whole piece | `spendProphet` |
| draw another belief | **both** — the whole piece | `spendProphet` |
| proclaim | one | `spendCharge` |
| **a rite over the realm** (`empireRite`) | one | `spendCharge` |

Which is which is not a field: it is which routine the act ends with, and both
say so. The empire rite asks none of the town gate's first three clauses — no
Chapel anywhere, no town refused for keeping one already (`clearCityRite` takes
over from whatever it held), no target — and the **price is paid once**, not once
a town. `redraftBeliefs` is gone from the command union.

#### The apostle

`data/units.json`: civilian, **movement 4**, **2 charges**, marker
`proclaims: true` (deliberately *not* `prophesies` — the two share one act of
four), faith purchase **90 + 40** exclusive, `modelClass: 'worker'`. Named by
Theology's `units` list and nothing else in `data/techs.json`.

| act | charges | figures |
|---|---|---|
| proclaim | 1 | `religion.apostle.proclaimRange` **6** hexes, `proclaimPercent` **50** of whatever a prophet's lump is worth *today* — a share, so the ruled "half a prophet's strength" survives a retune |
| lay on hands | 1 | `religion.apostle.heal` **25** to every friendly piece on its hex and the six touching it, capped at `unitMaxHp` |
| leave a relic | 1 | one per town that has topped out a cathedral |

**The relic is a building.** `BuildingDef.placed` (a new marker): never built,
never bought, never unlocked by anything — `isUnlocked` answers false outright
and `buildError`/`purchaseError` say *"neither built nor bought — it is placed"*.
It pays `religion.relicFaith` = **3🕯** through the ordinary building fold, so it
follows the stones on a capture with no bookkeeping at all, and "one per
cathedral" is two readings of the board (`cityKeepsRelics` off the `consecrated`
marker, plus whether the placed row is already on the shelf) rather than a
register.

The sculpt is `apostleMini` — the prophet's body with a **book** at chest height
instead of the ringed staff, registered in `MINI_SCULPTS`/`EXTRA_SCULPT_IDS` and
named by `data/view3d.json`. `pieces.html` walks `SCULPT_IDS`, so it joined with
no page edit. Its badge is the worker's (no new atlas cell).

#### The bot

`explainRites` is gone; `ritePlan` replaces it as a **per-city, purchase-shaped
want** — `Want.rite = { cityId, rite }` beside `buy` and `ground`, priced at
`riteCostFor` and gated by `riteError` itself, ranked against every other faith
row by worth per coin. `bankSpend` fires it through `riteDecision`, the third
verb that bank now sends. The prophet's empire rite prices as
`explainEmpireRite` (the best rite this empire knows × the towns it would reach);
the other three acts keep the appetite. `augurCommand` stands down with its
reason written on it.

**The C1 debt closed**: the first god's `religion.prophetTechValue` appetite moved
from the augur's row to `ladderPlan`, because the ladder is now the only way to a
first god.

#### Debts

- **The military rite's heal is deferred.** *"+5 defence; units heal +5 inside
  the city's borders"* — the defence half is a `cityStat` line and lands; the
  heal half cannot, because `healUnits` (`turn.ts`) is the one place a heal is
  decided and `cardUnitStat` reads `liveEffects` (the *empire's* walk), which a
  city-timed effect never reaches. Closing it is one clause in `healUnits` asking
  the town the piece is standing in — `turn.ts` was batch A's fence this batch, so
  it is written on the row's own `deferred` line instead.
- **The Vigil pays nothing** until `CityScope` can ask "is a rite live here"
  (batch A's file, or F's pass). The row's `deferred` line says so in player
  prose. Until then it is a live god in the pantheon bag that does nothing — the
  cheapest interim fix, if that reads badly in play, is to give it a shape it
  *can* hold (`effectAmplifier riteDuration` would be the thematic one).
- **`chargedAugurs` counts nothing** and `augurHasActed` is read by nothing. Both
  stay: the count is `statecraftData.ts`'s (batch A's fence) and a `CountKind`
  removed would move every save's card table. Batch F retires them.
- **The apostle is unpriced by the bot.** No arm in `wants.ts` values a
  proclamation, a laying-on of hands or a relic, so the row prices at the faith
  it costs like every other unpriced faith row. A relic is the easy one when
  somebody wants it (a permanent 3🕯 in one town is `explainLump` over the
  horizon); the other two want a reading of the board this file does not have.
- **`BeliefOffer.givenBack`** is now produced by nothing — the recast was its one
  writer. The field and `showReligionOffer`'s clause stay for the shape; the
  reroll carries it over if a hand ever has one again.
- **`refreshCityDerived`'s register** (the docblock in `cities.ts`) gains two
  entries — the rite and the relic — and neither is written down there, because
  `cities.ts` was batch A's fence. One line each, next time that file is open.
- **The pacing harnesses were not re-aimed.** Nothing in this batch moves a
  scripted empire's cadence (a rite costs faith the harness does not spend), and
  the plan's re-aim schedule puts the next one after D+E.

Files: `src/sim/religion.ts` · `religionData.ts` · `commands.ts` · `state.ts`
(schema 74) · `unitData.ts` · `techData.ts` · `buildingData.ts` ·
`buildingEffects.ts` · `tech.ts` · `purchase.ts` · `data/religion.json` ·
`data/units.json` · `data/techs.json` · `data/buildings.json` (the relic row, the
Chapel's marker) · `data/view.json` · `data/view3d.json` ·
`src/render3d/geometry.ts` · `board3d.ts` · `src/ui/controls.ts` ·
`cityPanel.ts` · `unitPanel.ts` · `compendium.ts` · `religionScreen.ts` ·
`techTree.ts` · `src/main.ts` · `src/style.css` · `src/ai/wants.ts` · `bot.ts`.
Tests: `religion.test.ts` (rewritten through the rites, the empire rite and the
apostle), `charters`, `wonders`, `tech`, `techUnlocks`, `purchase`, `aiWants`,
`aiBot`, `religion.slow`, `test/ui/religionV2`, `riteFeedback`, `unitPanel`,
`cityScreen`, `offerFlow`, `test/render/pieces3d`.

### Batch D as shipped (2026-09-06) — schema 73

The ordinary building list was thirty-eight rows of which most were a flat with a
different name. It is twenty-six, ten of them behind a parent, five of them
once-to-a-realm.

#### The ten chains

`BuildingDef.requiresBuilding` — one field, one clause in `buildError` (asked
only when a town is in hand, beside `requiresSite` and for its reason), three
surfaces: the reducer, the add-list's greyed reason and the Compendium's **Needs
standing here** row. The sentence is *"University needs a Library standing in
Uruk"*, composed from the two rows' own names and `indefinite` (exported from
`statecraft.ts` so there is one article rule in the game).

| child | parent | | child | parent |
|---|---|---|---|---|
| Stone Walls | Palisade | | University | Library |
| Castle | Stone Walls | | Observatory | University |
| Amphitheater | Monument | | Forge | Workshop |
| Bazaar | Market | | Temple | Shrine |
| Bank | Market | | Shipyard | Harbour |

**A grant ignores the chain** and nothing had to be written to make it so: the
two paths that hand a town a building — `realiseItem`'s `CompletionGrant` (the
Theatre of Dionysus' Amphitheatre) and `cardFoundingRider`'s founding list
(Charter Towns' Granary) — never ask `buildError` about anything. Said out loud
in the field's docblock and pinned in `buildingChains.test.ts`.

**The chain is one link deep**: a Castle asks for Stone Walls and the walls' own
Palisade is the walls' problem. That falls out of the clause being a reading
rather than a walk, and it is right — a town holding Stone Walls held a Palisade
to build them.

#### The cut list — twelve rows, three markers

| marker | rows |
|---|---|
| `retired: true` (withdrawn; row kept for replay) | Funeral Games · Stele of Laws · Monastery · Baths · Examination Hall · Clocktower · The Reliquary · Mint · Armoury · Printing House |
| re-cut **in place** as a unique | Forum (Philosophy) · Caravanserai (Mathematics) |
| `grantedOnly: true` (never built, never bought) | Town Charter |

`retired` is `awaitsTech`'s mirror image and deliberately a second marker: one
says *not yet* and one says *never again*, and the two sentences a player reads
are opposites. It is refused in `buildError` (and so in `purchaseError`), hidden
from the add-list and from the Compendium, and invisible to the bot for free —
every one of the bot's building readings is gated on `buildError`, so
`potentialTownsFor` needed **no edit at all** and reads the chains for free too.
A copy already standing keeps paying: the refusal is about the *decision*.

`beadIsDormant` now derives dormancy from `retired` as well as `awaitsTech`, so a
deed left pointing at a cut row would be a race nobody is dealt rather than a
race nobody can finish.

The Town Charter was never honestly buildable — Daughter Cities' own
`foundingRider` is where a charter comes from — so the marker only stops the
queue and the bank selling what the law gives.

#### The kept rows' new shapes

| row | as shipped |
|---|---|
| Monument | 2🎵; **the writ line cut** (Entry LIV / balance-turn §4g) |
| Granary | 2🌾 + **20% of the basket kept on growing** (`rulePercent growthCarryover`, city-local) |
| Shrine | 1🕯; **the beaker cut** (the Library's job) |
| Library | 2🔬 + **0.5🔬 a citizen** (was 1) |
| Amphitheater | 2🎵 + **1🎵 per two citizens**; needs a Monument |
| Bank | 3💰 + **1💰 per two citizens** + **10%💰**; needs a Market |
| Observatory | 2🔬 + 10%🔬; **per-citizen line zeroed**; needs a University |
| Cathedral | 2🎵 2🕯 3😊 + **the Reliquary's faith bank** (`faithPurchases: 'all'`) |
| Market · Workshop · Courthouse · Gilded Hall · The Turning Heavens · The Magnum Opus | balance-turn §4a's −25% on the flat |

The two per-citizen lines are written as `countScaled` over `population` with
`per: 2` rather than as a fractional payout, because that is *exactly*
`Math.floor(pop × 0.5)` through the fold's own `helpings` floor — a card line
carrying 3.5 culture would have leaked a fraction into a bank of whole numbers.

#### The numbers

`rules.cities.sciencePerPop` **1 → 0.5** and the Library's own line **1 → 0.5**
(balance-turn §4b, ruled at §7's item 13). Every §4a delta on a row that survives
as a flat: Granary −1🌾 · Market −1💰 · Workshop −1⚒ · Amphitheater −1🎵 ·
Cathedral −1🎵 −1🕯 · Observatory −1🔬 · Bank −1💰 · Courthouse −1💰 · Town
Charter −1🌾 · Gilded Hall −2💰 · The Turning Heavens −1🔬 · The Magnum Opus
−1🎵. Withdrawn rows keep their numbers untouched, so a save that holds one
replays into the same board.

#### The five uniques

Each `oncePerEmpire`, each on its own node, each priced at about half the mean
wonder of its unlock age (Æra II ≈ 203⚒ → **100**, Æra III ≈ 261⚒ → **130**).

| node | row | cost | effect | shape |
|---|---|---|---|---|
| Epic Poetry (II) | **Heroic Epic** | 100 | this city +50% renown | `cityRenownPercent` (batch A) |
| Kingship (II) | **Imperial Throne** | 100 | +5 authority capacity for the realm; units raised here cost 1 less to keep, for life | `authorityCapacity` + `unitUpkeepRebate` (new) |
| The High Temple (II) | **High Temple** | 100 | presses as a holy site; +25% faith here | `pressure` + `percentYields` |
| Philosophy (III) | **Forum** | 130 | +10% science and +10% culture here | `percentYields` ×2 |
| Mathematics (III) | **Caravanserai** | 130 | routes leaving here +1🌾 +1⚒; a route slot | `routeYield` with an `origin` scope (batch A) |

The Caravanserai **moved two ages down**, from The Golden Roads to Mathematics —
those are the only two edits to `data/techs.json` beyond the three additions, and
The Golden Roads keeps its caravan rider and now hands over no building.

**The Throne's rebate** is `Unit.upkeepRebate`, a number and emphatically not
`Unit.freeUpkeep`: a flag would have made the Throne a way to field a free army.
It is stamped in `realiseItem` off the town's own buildings, because *where a
piece was raised* is a fact that leaves the board the moment the piece marches
and no later reading could recover it — so the stamp is permanent, a captured
legion carries its birthplace's bargain, and razing the Throne does not put the
army back on full pay. It is read in one place, `explainUnitUpkeepRebate`, as a
**give-back line** beside the law's and the salt's: the gross stays gross, so
`disbandCandidate` keeps picking the dearest piece by what it truly costs.
`explainEmpireGold` needed no edit — it is still four lines and one fold.

#### The three deeds

| deed | was | now |
|---|---|---|
| The Great Games | funeral games in every city | **an amphitheater in every city** |
| The Mint | a mint in every city | **a bank in every city** |
| The Muster of the Realm | an armoury in three cities | **a forge in three cities** |

`docs/beads.md` names no building and needed no edit; the endeavour rows' own
`text` was rewritten with them.

#### The pacing figures, measured and NOT re-aimed

Per the plan the harnesses are re-aimed **once, after D and E together**. The
three slow fixtures are therefore **red** on this branch and the measurements are
here for that one dated move.

First, a repair that is not a re-aim: both scripted `playEmpire`s filtered their
queue with `isUnlocked`, which answers about the *tree* alone. A queue is
validated row by row, so one chained row whose parent was not up yet refused the
whole `setCityProduction` command and the town built **nothing at all** — the
harness measured nothing. Both now filter with `buildError` and the town in hand,
which is what a scripted player would actually be allowed to do.

`tech.slow` (seed 4242, standard, five towns, 900 turns) — the four ages' closing
turns:

| | Æra I | Æra II | Æra III | Æra IV | techs at t900 |
|---|---|---|---|---|---|
| before this batch | 66 | 120 | 365 | 773 | 50 of 50 |
| **the science cut alone** | **186** | **250** | **524** | — | 45 |
| **all of batch D** | **236** | **347** | — | — | **34** |

`statecraftPacing.slow` (the same empire, 400 turns) — the drafts' turns:

| | first eight drafts | early cadence |
|---|---|---|
| before | 13 · 22 · 54 · 57 · 60 · 66 · 72 · 78 | 9.3 |
| **after** | 13 · 22 · 168 · 172 · 178 · 186 · 196 · 210 | **28.1** |

`endgame.slow` (the one-city seat, 1900 turns): the Opus **never opens** — the
seat holds 38 of 50 technologies at the horizon, against opening on t1689 before.

**The diagnosis, because the re-aim needs it.** The dominant cause is the base
beaker, not the buildings: on the same harness the science cut *alone* moves Æra
I from 66 to 186, and everything else in the batch adds 186 → 236. Two things
make it bite harder than balance-turn §7's "roughly a third" estimate:

- the rate is **floored per town**, so a hamlet of one citizen banks **nothing**
  at all rather than half a beaker — every new town contributes zero science
  until it reaches size two;
- science buys ground and ground buys science. A slower tree means later
  borders, fewer worked hexes and smaller towns, and the loss compounds down the
  ladder rather than scaling with it.

The Monument's writ cut is the second cause and is small on its own (Æra I 68 →
68 on the fast probe) but real in a wide empire: a Monument was the only writ a
small realm could *build*, so a three-town empire now sits at −2 writ where it sat
at +3, its borders freeze, and it works four hexes a town instead of eight.

Both are the ruling as written (§6.13 / balance-turn §7 item 13: *"science moves
into the orders; the next playtest calibrates how much science the order set must
carry"*, and Entry LIV: *"writ becomes a card decision"*). The cards are batch F.
**What the re-aim after E has to decide is whether E's gifts and F's deck put
enough back** — and if they do not, the two dials are `rules.cities.sciencePerPop`
and either the Monument's writ or `meters.authority`'s own capacity.

#### Debts and notes

- **A chain cannot be pre-queued.** `validateQueue` asks `buildError` of every
  row against the board *as it stands*, so a town may not queue [Library,
  University] in one command — the University is refused until the Library
  actually stands. That is the ruled reading ("read in `buildError`") and it is
  also the fewer-things thesis (three decisions, not one), but it is a real
  interface cost and the cheapest fix if the user dislikes it is a second gate:
  let the queue accept a chained row and have `advanceProduction` hold it, the
  way it already holds a row whose strategic resource was lost.
- **Six nodes now hand over no building.** The Examination Hall, Machinery and
  Movable Type hand over nothing buildable at all; Horology, Engineering and The
  Holy Office lost a row apiece. Withdrawn rows deliberately stayed on their
  nodes so a v72 log's `unlocks` reading is unchanged. Re-gifting them is batch
  E's, and `buildingChains.test.ts` pins the three empty ones so the debt shows
  up in a test run.
- **One edit outside the fence, and it was forced.** `printingHouses` (Gov V)
  scoped a clause to `hasBuilding: printingHouse`, which is now a row with no
  page — the keyword sweep fails on a mark that points nowhere. Its second clause
  is re-cut to the ruled shape (*"+10% science in every city"*, `docs/fewer-things.md`
  §2's own words) and its `text` and doc row follow. **The first clause's number
  is untouched**: the ruled re-aim is "+3🎵 per Library", and the 1 → 3 is batch
  F's number to derive.
- **Schema.** This batch's changelog entry is **v73**; batch C2 landed the same
  day and took **v74**, so `SCHEMA_VERSION` reads 74 and every witness pins 74.
- **The pop-1 town banks no science.** Worth a ruling of its own: if the intent
  is "half a beaker a citizen" rather than "nothing until size two", the floor
  could move to the empire's fold instead of the town's — one line in
  `cityQuote`, and a change to the "every source floored on its own" discipline
  that would need saying out loud.
- **`CityLook` untouched**, deliberately: a building is not a visual-affecting
  city property, and none of the five uniques carries a sculpt.


### Batch B as shipped (2026-09-06)

The reveal, the aggregate, the ordered offices and rearranging. UI only — nothing
under `src/sim/` moved, no schema, no data row.

| Ruling | As built |
|---|---|
| A newly slotted card shows no yield until Confirm | The arrangement's own `staged` flag splits "in a slot" in two (`drawCollection`). A **staged** card's face gets `pendCardStamp` — a new writer in `cardStamp.ts` that takes **no reading at all**, so there is no figure in scope to leak — and wears `— on Confirm` (`STAMP_PENDING_MARK`) where its digits will be. A card the law already holds keeps its landed stamp. `explainCardImpact` is not even asked for an unconfirmed card, which is the strict reading and the cheap one |
| Where the aggregate stands | At the **head of the Confirm block** — the office column's pinned foot. The offices scroll; a ceremony fired above the fold is one half the viewports never see, and the figure directly over the button that fires it is also the plainest way to say what the button is for |
| Confirm fires the aggregate | Confirm commits the batch, `commitStaging` now **answers the cards the signature made law** (read back from the live slots, so a batch the reducer stopped part-way celebrates only what went through), and the redraw plays: the **aggregate band** under the chairs counts up (`playCardStamp`), and every newly-confirmed card's own stamp counts up in the same beat. `justSlotted` (a card, armed by the drop) is gone; `justConfirmed` (a list, armed by the signature) replaces it |
| The aggregate's source | **`deckAggregate` in `ledgerScreen.ts`** — the Ledger's band-1 `deck` slice, one function read by both surfaces. *Why that and not a sum of per-card `explainCardImpact` stamps*: those are **marginal** readings (the empire with one card removed), and marginal readings do not sum to a total once anything multiplies, converts or reads another card — which is precisely the deck this pass is building; eleven cards each worth "what the empire loses without me" adds to more than the empire makes. The deck slice is the **banked** figure, `civYields`' own summands classified by the card that pays them, a sum by construction. Batch A's amplifier and building-percent lines join it the day they land with no edit here: they are `CardYieldLine`s folded in the evaluator's own order (base lines, then the modifiers that read them) and classified by their card |
| Slot order | `slotLayout` already groups a government's spread by flavour in `SLOT_TYPES` order, so **the array index is the position** and the screen already drew the column in array-index order — pinned rather than changed (`statecraftReveal.test.ts` walks every government). The topmost economic office is the first economic office on the screen and in the sim |
| The position word | `slotPositionWord(layout, index)` → "1st economic", counted within the flavour, printed as a quiet eyebrow on the office line in tabular mono. **Gated on the reading**: `deckReadsSlotPosition(sc)` walks this empire's *slotted* Orders' own effects through `POSITION_READING_COUNTS`, a `readonly CountKind[]` that is **empty today**. Batch A's slot-position member joins that one list and the word starts appearing; nothing else changes. The test slots every Order in the game one at a time and pins that the gate is closed on all of them |
| Rearranging | A card in an office is now **picked up from the collection** (`lift`) — `removeError` then `remove`, the same two staging verbs a fresh placement uses — so a move is an unconfirmed placement and Confirm signs it as one batch. The seal rules are untouched, because the refusal is the reducer's own sentence. The slotted face is no longer `disabled` |
| The Ledger's deck band | Band 1's head prints the same reading, landed (`drawDeckLine`) — "your cards" and the figure, through the same stamp printer. A deck that pays nothing says "nothing yet" rather than printing noughts |

Files: `src/ui/statecraftScreen.ts`, `src/ui/cardStamp.ts`, `src/ui/ledgerScreen.ts`,
`src/style.css`, `test/ui/cardStamp.test.ts` (the two office pins reworked to the
new ruling), `test/ui/statecraftReveal.test.ts` (new). No `main.ts` wiring was
needed — the band lives inside the screen and the Ledger's line inside the sheet.

Also fixed in passing: the screen now **cancels its counts** on the next draw, on
close and on dispose (`playCardStamp` returns a canceller for exactly that
reason, and this screen replaces its whole body whenever a turn resolves).

Debts and notes:

- The aggregate is the **whole deck's** standing figure, not "what the cards you
  just confirmed add". That is deliberate — it is the number the Ledger prints
  and the number a player can check — but it means a Confirm that changes the
  deck by a little still counts the whole fold up from zero. If the user wants
  the delta instead, it is a subtraction over two `deckAggregate` readings taken
  either side of the commit, and the seam is already there.
- The band prints the six voices only. A card's own happiness/authority points
  are on its face (the meter figures) and are not folded into "your cards",
  because `ledgerReading` is a reading of yields and a meter is not one.

### Batch C1 as shipped (2026-09-06) — schema 71

Faith's currency. The dice of the Magister are gone; faith deals the pantheon on
a ladder and buys a second look at an Order draft.

**The dice, removed.** `Player.dice` · `BeadRules.startingDice` · `BeadBoon.dice`
and `describeBeadBoon`'s die clause · `TechDef.ageEntryDice` and `payAgeEntryDice`
· Chronology's payout · the beads screen's rod line · the Compendium's mention.
The eight quests that paid a die keep their rows; the seven that paid **only** a
die now pay nothing and say so in a `deferred` line (the lint was widened to
allow an empty boon **iff** the row owns up to it — a silent empty boon is still
a data mistake). **The Auspicious Seal** — the one Order that paid a die — is
**retired** (`retired: true`, the row kept for saves), which is what
`docs/orders-pass-3.md` §2 marks it, and `OrderSlotGrant.grant` is one member
wide again.

**The faith ladder.** `RELIGION.ladder` = `costBase 40 · costLinear 15 ·
costExponent 1.5`, read by `faithRungCost(n) = floor(40 + 15n + n^1.5)`:

| rung | 1 | 2 | 3 | (4) |
|---|---|---|---|---|
| faith | 40 | 56 | 72 | 90 |
| the augur's old price | 40 | 55 | 70 | 85 |

168 faith across three rungs against the three augurs' 165 — the ruled shape
("40, +15 a rung") with a slight exponent so a fourth rung would rise faster than
a flat increment, which is the culture meter's argument.

Measured on the scripted empire (`statecraftPacing.slow.test.ts`'s `playEmpire`,
seed 4242, standard, five towns, the faith buildings queued): **rung 1 opens on
turn 67** (the bank first crosses 40), **rung 2 on turn 79** (bank 60), **rung 3
on turn 132** — and the third is gated by **The High Temple**, not by its 72
faith: the bank held 269 by then. That is the ruled design (the third pantheon
slot's tech is the third rung's door) and it is where the augur's third
consecration sat too.

`PlayerPantheon.rungs` is the counter; `openFaithLadder` runs inside the
`religion` phase (`openPeriodicOffers`, no new phase and no `turn.ts` edit) and
deals the ordinary belief hand carrying `BeliefOffer.rungCost`. The **pick** pays
— `settleBeliefChoice`, floored at nothing — because faith is a bank the player
also spends on units, so a threshold that emptied it on crossing would take the
choice away rather than offer one. The augur's `consecrate` is untouched and
stays for batch C2.

**The reroll.** `rerollOffer {playerId}`. `RELIGION.reroll` = `base 35 ·
exponent 1.35 · ageMultiplier [1, 1, 1.6, 2.2] · ability theLongCount`, folded as
`floor(35 × age × 1.35^taken)` and printed by `explainRerollCost` as ordered
difference lines (base · the age's numeral · the rerolls already taken):

| rerolls taken | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Æra I–II (×1) | 35 | 47 | 63 | 86 | 116 | 156 |
| Æra III (×1.6) | 56 | 75 | 102 | 137 | 186 | 251 |
| Æra IV (×2.2) | 77 | 103 | 140 | 189 | 255 | 344 |

The **door** is Chronology's Long Count ability (`docs/tech-gifts.md` §2 — the
node loses its die and gains this); Æra I is unreachable in practice and its
entry stands for the table's shape. `PlayerStatecraft.rerollsTaken` is the
empire's bill and is never zeroed. `orderSkips`, the meter and the tier are
untouched — a pass banks pity for giving a hand up, and paying for another one is
the opposite bargain. A **belief** hand (a prophet's draft, the ladder's, a
founding's second) rerolls for **nothing** and raises no count, carrying its
`rungCost` and `givenBack` over so an empire cannot reroll its way out of paying.
The tally batch A declared, `SlottedOrder.rerollsSeen`, is written here and
nowhere else: +1 on every **chair** at the moment the faith is paid.

**The button.** `Offer.reroll` in `offerCard.ts` — a third foot control beside
the pass, in plain ink rather than the pass's vermilion (a purchase, not the
irreversible half), the only control on the sheet that may be **greyed**, because
a price nobody can afford still has to be legible. It prints the **next** price
and the fold that made it. `main.ts`: `rerollControl` / `rerollOffer`, wired to
both the Order draft (paid) and the votive card (free, "Ask again"). The
Compendium's Orders shelf gains the three-answers sentence and the beliefs shelf
now says a god arrives on its own.

Files: `src/sim/religion.ts` · `religionData.ts` · `beads.ts` · `beadData.ts` ·
`state.ts` (schema, the dice out) · `statecraft.ts` (`rerollsTaken`, the die
clause out) · `statecraftData.ts` (the grant union) · `tech.ts` · `techData.ts` ·
`commands.ts` · `data/religion.json` · `data/beads.json` · `data/techs.json` ·
`data/statecraft.json` (the one retired row) · `src/ui/offerCard.ts` ·
`beadsScreen.ts` · `compendiumShelves.ts` · `src/main.ts` · `src/style.css` (the
reroll's ink) · `src/ai/wants.ts` · `docs/orders-and-doctrines.md` (the retired
row out of the table). Tests: `test/sim/faithLadder.test.ts` (new),
`test/sim/reroll.test.ts` (new), `test/ui/offerFlow.test.ts` (a reroll band), and
re-aims in `beads`, `religion`, `state`, `statecraft`, `tech`, `endgame`,
`beadsScreen`, `ledgerScreen`.

Debts and notes:

- **The bot does not reroll, and the reroll is unpriced.** `faithPlan` gains the
  ladder (`ladderPlan` — the best god still in the pool, over the faith the bank
  still owes, discounted by `delayTerm`, exactly `draftPlan`'s three lines), and
  nothing prices a second look at a hand. Pricing it wants the marginal draft
  reading batch **F2** builds (`V(deck ∪ card) − V(deck)`): a reroll is worth the
  difference between the best of *this* hand and the expected best of another,
  and until `expectedBestOrder` can be asked hypothetically that is a guess
  dressed as a price. The bot never sends `rerollOffer`.
- **The ladder row's two stated crudenesses**: it prices the **best god in the
  pool** rather than the expected best of a three-card hand (the bag is small and
  every god is permanent, so it errs high by the width of a hand); and it does
  **not** add `religion.prophetTechValue` for a first god, because the augur row
  already carries that appetite and counting it twice would have the bot value
  faith twice for one god. When the augur retires in C2 the appetite moves here.
- **A belief hand rerolls freely and without limit.** That is the ruling as
  written ("a great prophet's draft is free and does not raise the count"), and
  the consequence is worth saying out loud: with the End Turn blocker holding the
  offer, a player may keep asking until a god they want appears. If that reads as
  "pick any belief" in play, the cheap fix is a count with no price attached — a
  second field, or `rerollsTaken` raised without charging.
- **`OrderSlotGrant` and `PlayerStatecraft.grantedOnSlot` are live machinery with
  no live row**: The Auspicious Seal was the only card carrying an `onSlot`
  grant. The shape stands for the deck that wants it next (batch F adds none);
  the register test now pins the absence rather than the Seal.
- **`docs/codex.md` is stale in `main`** and was left that way. `npm run codex`
  regenerates far more than this batch's one retired row — it has not been run
  since the recent card passes — so the regeneration belongs in a commit of its
  own rather than buried here.

### Batch A as shipped (2026-09-06)

The seven engine shapes, the three counts and the one occasion that
`docs/fewer-things.md` §4, `docs/orders-pass-3.md` §9 and `docs/tech-gifts.md` §7
ruled. **No `data/` row uses any of them** — the rows are batches D through F —
so the batch is byte-identical by construction and no schema moved.

#### The shapes, and the JSON a row will write

| # | shape | the row |
|---|---|---|
| 1 | **the amplifier by voice over card yields** | `{"kind":"cardYieldAmplifier","yield":"food","amount":1}` · half again: `{"kind":"cardYieldAmplifier","yield":"faith","percent":50}` · the capital engine: `{"kind":"cardYieldAmplifier","yield":"all","percent":50,"scope":{"test":"capital"}}` |
| 2 | **the building-yield percent by category** | `{"kind":"buildingYieldPercent","pays":"faith","percent":50}` · the doubler: `{"kind":"buildingYieldPercent","pays":"faith","percent":100,"appliedLast":true}` · by category and voice: `{"kind":"buildingYieldPercent","category":"gold","yield":"gold","percent":50}` |
| 3 | **the `yields` tile test** | `{"test":"yields","yield":"faith"}` — **already built** (2026-09-03, The Gilded Court); this batch pinned it, added no member |
| 4 | **the slot-position reader** | `{"kind":"slotPosition","slot":"economic","position":1,"factor":2}` — `slot` absent means any chair |
| 5 | **the periodic occasion** | `{"kind":"periodic","everyTurns":10,"pays":"gold","amount":25}` · counted: `{"kind":"periodic","everyTurns":15,"pays":"renown","count":"buildingsOfCategories","categories":["science","faith"]}` · the ledger count: `{"kind":"periodic","everyTurns":7,"pays":"science","count":"empireYield","voice":"production"}` |
| 5b | **the period modifier** | `{"kind":"periodShorten","turns":3}` |
| 6 | **the city renown percent** | `{"kind":"cityRenownPercent","percent":50}` (+ optional `scope`) |
| 7 | **the route-yield line** | `{"kind":"routeYield","food":1,"production":1}` · the Caravanserai: `{"kind":"routeYield","food":1,"production":1,"origin":{"test":"hasBuilding","building":"caravanserai"}}`. The route **percent** already existed and is unchanged: `{"kind":"effectAmplifier","target":"routeYields","percent":100}` |
| 8 | **the reroll tally** | `{"kind":"countScaled","count":"rerollsWhileSlotted","pays":{…}}`, reading `SlottedOrder.rerollsSeen` |

Three `CountKind` members joined with them: `buildingsOfCategories` (argument
`categories: BuildingCategory[]`), `empireYield` (argument `voice`), and
`rerollsWhileSlotted`. One `WindfallOccasion` member joined: `periodic`, so
"your boons pay more" is an ordinary `windfallRider` and nothing else.

#### The rulings behind the shapes

- **Additive is the default** for the amplifier, and the docblock says why in the
  user's own terms: it is paid **once per line instance** — per town for a
  per-town line, per hex for a hex line, once for an empire line — so it stacks
  with a card that already dresses forty hexes, which a multiplication could
  never do. The share (`percent`) is the late, rare variant.
- The amplifier reaches **the Orders' lines only** (the ruled sentence is *your
  Orders*), **never its own card**, and every amplifier reads the fold **as it
  stood before any amplifier spoke** — so two of them never compound and their
  order in the walk cannot change what either pays. A row naming a `scope`
  reaches no empire line (an empire line lands in no town) and no ground (the
  tile pass holds no town): both cuts are stated on the shape and pinned.
- **`appliedLast` is two stages, never one**: `raised = base + Σ⌊base × ordinary%⌋`,
  then `paid = raised + Σ⌊raised × last%⌋`, floored per share, per building and
  per voice. A doubler is `percent: 100, appliedLast: true` and doubles what the
  Vestry raised rather than racing it.
- **"A faith building" is a row that pays faith.** `BuildingDef.category`'s seven
  words are what a row is *for* (a Cathedral is `culture`), so the voice selector
  `pays` is the honest reading of the ruled text — the same question
  `CityScope`'s `hasBuildingYielding` already asks of a town. `category` and
  `pays` compose; naming neither reaches every building.

#### The slot-order contract

Stated once, on `slotTypesOf` (`statecraft.ts`), which is the function every
surface already asks:

- `slotTypesOf(sc)` and `PlayerStatecraft.slots` are **the same order, index for
  index** — both are built by mapping over `slotLayout(government)`;
- **the index is the order the screen draws**, top to bottom. "The first economic
  slot" is the lowest-indexed slot whose *layout flavour* is economic — the
  **chair's** flavour, never the card's, so an economic Order in a wildcard chair
  is not in an economic chair;
- `orderAtSlotPosition(sc, position, slot?)` is the one reading of it.

#### The periodic rule, exactly

- **Two clocks.** A periodic effect on a **slotted Order** keeps an absolute
  stamp on its chair (`SlottedOrder.nextFiresTurn`), so its cadence runs from the
  turn it was placed. A periodic effect from **anything else** — a technology, a
  building, a Doctrine — is on the world's clock, `state.turn % period === 0`,
  which is `periodicMuster`'s and `periodicOffer`'s reading exactly (there is no
  chair to hang a stamp on and none was invented).
- `period = max(2, everyTurns − Σ periodShorten)`. **The floor of two is on the
  period, never on the stamp.**
- A chair with no stamp is stamped `state.turn + period` on the first phase after
  the card is placed, and pays nothing that turn. It fires when
  `state.turn >= nextFiresTurn` and re-stamps `state.turn + period`, read fresh.
- **A change of clock moves an outstanding stamp by the change in period and by
  nothing else**: `nextFiresTurn += newPeriod − oldPeriod`. Exact, symmetric and
  reversible, so slotting and unslotting a shortener is neither a way to farm a
  boon nor a way to lose one. `SlottedOrder.firePeriod` records the clock the
  stamp was made under, which is what lets the *phase* notice the change — so
  slotting a shortener needs no hook in the reducer.
- A card taken out of its chair **loses its clock with the chair** (the standing
  ruling: the bench is never productive).
- The boon is a **windfall** on the new `periodic` occasion: composed once with
  every rider before anything is banked (Entry XVIII.5), banked through
  `payWindfallGrants`, and the touched towns settled.
- The phase is `periodicBoons` in `turn.ts`, **between `advanceResearch` and
  `statecraft`**: culture from a boon reaches the very next phase's draft, renown
  reaches `renown` further down, hammers and food land in baskets the boon
  settles itself. Beakers wait for the next resolution, which is the ordinary
  reading of any windfall landing after `advanceResearch`.
- `settleRenownWindfall` is **handed in** by the phase rather than imported by
  `statecraft.ts` — renown is added in exactly one place and that file reads the
  card table, so `turn.ts` (which holds both) passes the seam.

#### What the bot prices, and how

Every arm reads **the board**, never `score.unknownEffect` — `explainCounted`'s
own rule one shape over.

| shape | priced as |
|---|---|
| `cardYieldAmplifier` | `(amount + percent% × nominal) × the line instances the seat's slotted Orders actually pay` in that voice — a per-town line counts `ctx.cities`, an empire line one, a hex line `score.nominalTiles` (the same stand-in the `tileYield` arm uses) |
| `buildingYieldPercent` | the share of what the matching shelves already pay, walked over the empire's own buildings through the simulation's own selector (`buildingMatchesYieldPercent`, exported for the bot on `countOf`'s licence) |
| `slotPosition` | `(factor − 1) ×` the appraisal of the card in that chair, with the two deck-reading kinds filtered out so an engine pointed at an engine cannot recur |
| `periodic` | a windfall over its period: what one firing pays (the count asked of `countOf` through the row's own probe) ÷ the period |
| `periodShorten` | the **difference**: `Σ worth × (1/shortened − 1/plain)` over the seat's own periodic Orders |
| `cityRenownPercent` | the share of what a **middling** town of this empire earns in renown (the shape is city-scoped and the scope is not evaluated — `cityYields`' own bargain) |
| `routeYield` | `valueOfYields(bag) ×` the caravans the seat is running (`tradeRoutes`, counted by the simulation) |
| the three counts | through `countOf` like every other count; `buildingsOfCategories` also gained the potential half (`potentialTownsFor` reads the list) |

**The written-down debt stands and is deliberate**: an engine appraised in
isolation is worth nearly nothing, because it multiplies a deck this reading
cannot see. That is `docs/fewer-things.md` §5's marginal reading and it is batch
F2's, not this batch's.

#### Byte-identity

Verified in an isolated copy of the working tree, the same snapshot of it twice:
the tree as shipped, and the tree with every one of this batch's call sites
neutralised (the two `deckModifierLines` folds, `tileAmplifierLines`, the
`cardBuildingYields` fold in `cityQuote`, the two `empireRates` accumulators, the
renown shares, the two `cardLines` calls in `routeYields.ts`, and the
`periodicBoons` phase). Sixty bot-driven turns, `sha256(snapshotState)`:

| game | with batch A | with it neutralised |
|---|---|---|
| duel, seed 20260906 | `ef583f16e55c4e312e22f074c61bc99b4197eaa1f7d1a57e710726641b2a2836` | identical |
| standard, seed 20260831 | `0397b358d5d725569eefd063fba7b20355345cf2aebc45a1e781bd5249b98a3f` | identical |

(The hashes themselves are a fact about the tree on the day, not a pin: C1's data
changes were landing beside this batch. What is pinned is the *pair*.)

The new `SlottedOrder` fields are absent until something writes one, so a save
from before this batch and one from after it serialise identically — which is
what "no schema bump" means here, and `statecraft.test.ts` pins it against
`snapshotState`.

#### One handover, for batch B

`POSITION_READING_COUNTS` in `src/ui/statecraftScreen.ts` gates the "1st
economic" eyebrow on a `readonly CountKind[]`, expecting batch A's position
reader to be a **count**. It is not: the ruled shape is a *modifier* over a
chair, `{"kind":"slotPosition",…}`. `readsSlotPosition` needs one more clause —
`effect.kind === 'slotPosition'` — and the register list can then stay empty.
Left untouched here: that file is batch B's fence.

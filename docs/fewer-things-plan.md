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
| **Harness re-aims** | after D+E+X (upkeep relief, science cut, exact yields, the tree's gifts) — **landed 2026-09-06**, see "Pacing re-aim after D, E, X" below; then after F (the deck), after G (the ladder) — three re-aims, dated, never one per row |
| **Determinism** | A is byte-identical by construction (no row); C1's reroll and ladder are logged commands; the periodic occasion stamps absolute turns; D's markers keep cut rows for replay |
| **The bot** | prices every new shape the day it lands (A) or is written down as a debt in the batch doc (the reroll in C1; engines until F2) |
| **The compendium and the arena** | generated; no page edit in any batch; a new shape needs its words in the describers (A, E) |
| **Open numbers** | the rites' price and seal (C2, default proposed); Gov IV/V chair triples (G); the Gov II rare payoff's and the shrine tally's exact figures (F) |
| **Deferred, not forgotten** | veins (shelved); the wonder cut (a pass of its own); the Æra V acceleration beyond the four bead Orders; the incumbency margin on the focus arm; the command-budget warning |

## As shipped

### Batch H11 as shipped (2026-09-07) — schema 82

The cost scale (`docs/flags.md`, "Rulings 2026-09-07, small hours", item aa, and
"the early-pacing doc, marked", item dd's cost half). Two rulings, one schema:
the age band becomes the user's own curve, and the once-per-empire rows are
priced against the realm they serve.

#### (aa) The band is a table

The complaint was about the level: *"production costs are way too low, they
probably need to be like 4–5× what they are now"*, corrected a minute later to
*"4–5× what they are now **in age 4 only**"*, and then, on being shown what a
fitted ratio produced, *"the curve needs to be fairly exponential"*. So the band
stopped being a rule and became four authored figures —
`production.costAgeBand` in `data/rules.json`, read by `ageCostBand`
(`cities.ts`) and by nothing else:

| | Æra I | Æra II | Æra III | Æra IV |
|---|---|---|---|---|
| **H10 (`1.25 ^ age`)** | ×1.25 | ×1.5625 | ×1.953125 | ×2.44140625 |
| **H11 (the table)** | **×1.25** | **×2.5** | **×4.5** | **×8.5** |

Æra I is untouched — that is the correction read literally, and it is why most
Æra I pins in the suite did not move. `costAgeBase` is gone; the doc table on
`ProductionRules.costAgeBand` mirrors the data row and carries a sync test
(`buildSinks.test.ts`), so a figure edited in one place and not the other fails
core.

Hammers the whole table asks for, by age — the printed rows in `data/*.json` are
untouched, so every figure below is the fold's second line (the *before* column
is today's rows under H10's power, so it differs by a hammer or two from the H10
section's own table where rows have moved since):

| | Æra I | Æra II | Æra III | Æra IV |
|---|---|---|---|---|
| units, before | 302 | 153 | 352 | 488 |
| units, after | **302** | **252** | **817** | **1715** |
| ordinary buildings, before | 3929 | 1484 | 2551 | 6751 |
| ordinary buildings, after | **3929** | **2381** | **5889** | **23527** |
| wonders, before | 947 | 951 | 6117 | 3161 |
| wonders, after | **947** | **1524** | **14104** | **11007** |

The four rows the user priced by hand when the curve was drawn, and four more to
read the shape:

| row | age | printed | H10 | H11 |
|---|---|---|---|---|
| Library | I | 28 | 35 | **35** |
| Market | II | 59 | 92 | **147** |
| Workshop | III | 69 | 134 | **310** |
| University | IV | 134 | 327 | **1139** |
| Warrior | I | 10 | 12 | **12** |
| Swordsman | II | 14 | 21 | **35** |
| Knight | IV | 22 | 53 | **187** |
| The Great Library | III | 205 | 400 | **922** |

**One printed line**, always: the fold says `Age band · Æra III ×4.5` and never
the designer's arithmetic. The rounding H10 settled stands — each line carries
the *difference* it makes to the running figure and floors there, so the list
sums to the price the basket is charged. Purchases followed with no edit
(`explainPurchaseCost` converts the folded list), and **projects are untouched**:
a project's cost is the size of one turn of a conversion, not the price of a
thing.

#### (dd) A unique is priced against the realm it serves

*"The once-per-empire buildings scale in COST with the number of cities, not in
effect."* One more line in `explainBuildingCost`, after the age band and floored
with it: `× √(cities held ÷ production.uniqueCostBreakeven)`, breakeven **4**.

| cities | 1 | 2 | 3 | 4 | 9 | 16 |
|---|---|---|---|---|---|---|
| **factor** | ×0.50 | ×0.71 | ×0.87 | ×1.00 | ×1.50 | ×2.00 |

It reads `Empire of 9 cities ×1.50` on its own line, and it touches the nine
`oncePerEmpire` rows only — Heroic Epic, Imperial Throne, High Temple, Forum,
Caravanserai, Chart the Stars, The Turning Heavens, The Alchemical Codex, The
Magnum Opus. The Throne's *effect* change in the same ruling is H13's.

**`explainBuildingCost` takes an empire now**, which reverses a statement H10's
docblock made deliberately ("it takes no player… the day a card cheapens
buildings this grows a third line and a `playerId` in the same breath"). The day
came; the docblock says so in those words rather than quietly losing the claim.
The empire is **optional** because two honest callers have none — a caller
pricing a row before it belongs to anybody, and the Compendium, which describes
rows rather than a game. Both get the **breakeven** reading, ×1: the book quotes
the row's own banded figure and its docblock declares the exception. Every
surface with a seat passes it: `queueItemCost`, the settlement plan,
`explainPurchaseCost`, the city panel's three prices, the star chart's two.

#### Schema and coverage

Schema **82**: Æra I costs what v81 charged and everything after it costs more,
so a v81 log diverges at the first thing an empire builds out of the opening age.

Re-aimed rather than deleted: `buildSinks.test.ts` (the band is a table again;
the roster's Æra II–IV figures; the fold's line reads `×8.5`; a new sync case for
the ruling's four figures and a new "a unique is priced against the empire it
will serve" suite), `cities.test.ts` · `cities.slow.test.ts` · `purchase.test.ts`
· `state.test.ts` · `tech.slow.test.ts` (every `costAgeBase` reading is the
table's entry now — all Æra I, so no figure moved), `cathedral.test.ts` (the
replay harness funded a cathedral with a flat 5000 gold and an Æra III row is
×4.5 now — it funds through the fold), `endgame.test.ts` (the Opus is a unique,
so the contribution case funds it *with the empire in hand*), and the eleven
schema pins.

Measured after, on the scripted harnesses (all green, no loop bound moved): the
five-town empire closes its ages on **76 · 142 · 470 · 950** (was 78 · 151 · 482
· 967 before the unique line, 80 · 156 · 481 · 999 at the H10 re-aim); Government
I t43, II t110, III t558 (this last pair read after H13's card rows landed
beside this batch — it was t124 · t610 with the deck H11 measured against); the
Æra III bead table opens t299; the one-city seat opens the Opus at **t3450**.

**Left for the bot** (`src/ai/*` is H12's fence this batch): the bot prices
buildings through `buildingProductionCost(id)` with no empire, so it reads a
unique at the breakeven — cheap for a wide empire, dear for a one-city seat.
One argument at each call site, whenever H12 frees the files.

### Batch H10 as shipped (2026-09-06) — schema 81

Early production (`docs/flags.md`, "Rulings 2026-09-06, late — early
production", items x, y, z). Three rulings, one schema: the tree's first paid
column, one age band over every hammer price, and whole figures in the top bar.

#### (x) The first column of technologies

Column 1 — the four nodes every empire buys before anything else — from 13 to
**10** beakers. The root's nominal 5 and every column from 2 up are untouched,
so the taper now carries an authored figure at each end and the measured ladder
in the middle.

| | column 0 | column 1 | columns 2–12 |
|---|---|---|---|
| **before** | 5 (never paid) | 13 | 30 · 69 · 135 · 225 · 400 · 540 · 680 · 1450 · 1700 · 1950 · 2200 |
| **after** | 5 (never paid) | **10** | unchanged |

Æra I costs 345 → **333**; the tree 35710 → **35698**. The nodes are Fletching,
Husbandry, Mining and Pottery. `COLUMN_COSTS` in `test/sim/tech.test.ts` is the
witness table and carries the ruling; `docs/tech-tree.md` mirrors it.

#### (y) One age band over every hammer price

`cost × costAgeBase ^ age`, base **1.25** in `data/rules.json` under
`production`. The band was a hand-authored four-entry ladder that only units
read; it is a power now, it is asked of buildings and wonders on the same terms,
and Æra I is no longer exempt.

| | Æra I | Æra II | Æra III | Æra IV |
|---|---|---|---|---|
| **units, before** | ×1 | ×1.5 | ×2 | ×2.5 |
| **buildings and wonders, before** | ×1 | ×1 | ×1 | ×1 |
| **everything, after** | **×1.25** | **×1.5625** | **×1.953125** | **×2.44140625** |

Hammers the whole table asks for, by age — the printed rows in `data/*.json` are
untouched, so every figure below is the fold's second line:

| | Æra I | Æra II | Æra III | Æra IV |
|---|---|---|---|---|
| units, before | 245 | 151 | 364 | 503 |
| units, after | **302** | **153** | **352** | **488** |
| ordinary buildings, before | 3100 | 903 | 911 | 2038 |
| ordinary buildings, after | **3868** | **1406** | **1775** | **4971** |
| wonders, before | 760 | 610 | 3135 | 1295 |
| wonders, after | **947** | **951** | **6117** | **3161** |

The two late ages of the *roster* land a hammer or two under the ladder they
replaced and the two early ages a quarter over it; what actually moved is the
building and wonder columns, which had no band at all. An Æra III building is
about twice its printed row, which is the ruling read literally ("Age 3 buildings
and units should probably be ~2× as expensive"). A few rows, to read the shape:

| row | age | printed | before | after |
|---|---|---|---|---|
| Warrior | I | 10 | 10 | **12** |
| Settler | I | 28 | 28 | **35** |
| Swordsman | II | 14 | 21 | 21 |
| Knight | IV | 22 | 55 | **53** |
| Granary | I | 21 | 21 | **26** |
| Amphitheater | II | 74 | 74 | **115** |
| The Great Library | III | 205 | 205 | **400** |
| University | IV | 134 | 134 | **327** |

**Rounding**: the band **floors**, once, at the fold's total. A cost is compared
against a basket in `planProduction` and printed on a button beside a turn
estimate, so it stays an integer — this is not batch X's exact-decimal rule,
which is about *yields*, and the docblocks on `explainBuildingCost` and
`ProductionRules.costAgeBase` say so. Each line carries the *difference* it
makes, so the list still sums to the price.

**Where it lands**: `explainBuildingCost` / `buildingProductionCost`
(`cities.ts`) are `explainUnitCost`'s shape one grade over, and take **no
player** — nothing an empire does changes what a building costs to build.
`queueItemCost` and `planProduction` charge through them, and so does every
surface that prints a price: the city panel's build list and its hover cards,
the star chart's unlock notes and its node cards, the Compendium's building and
tech entries. **Purchases** convert the folded list rather than the printed row
(`explainPurchaseCost`'s second shape), so a cathedral is bought in the money of
its own era. **Projects are untouched** — a project's cost is the size of one
turn of a conversion, not the price of a thing.

#### (z) Whole figures in the top bar

The six yield chips printed `String(totals[key])` — the raw exact fold, which
since batch X is a number like `2.6666666666666665`. They print through
`netFigure` and `poolFigure` now. The two meter chips printed
`signedMeterFigure`, which keeps a tenth; they print through `signedFigure` with
everything else on the strip.

The tenth is **withdrawn from the bar, not deleted**: `meterFigure` and
`signedMeterFigure` keep it, and the meters' hover cards, their click-through
ledgers and the authority card's capacity headline still print through them —
which is where the docblock's argument for the tenth lives (a fraction is worth
seeing against a rung, and a ledger is where a player counts). A chip is a
glance.

`netFigure` is new beside `figure` and `signedFigure`: whole, a true minus sign
kept, never a plus. `figure` is a **magnitude** and always was, which is right
for a cost and wrong for a chip — a food rate goes negative when a town starves
and a treasury goes negative on maintenance, and both printed as magnitudes read
as good news. `poolFigure`'s bank leads through it for the same reason.

#### Schema and coverage

Schema **81**: every research settlement banks against a different threshold and
every completion against a different basket, so a v80 log diverges at the first
town to finish anything.

Re-aimed rather than deleted: `tech.test.ts` (the column table and the Æra I
node prices), `buildSinks.test.ts` (the band is a power, the roster's figures,
the settler's fold now carries an Æra I band line) plus a new
"a building is priced in the money of its own age" suite, `cities.test.ts` (the
two escalation ladders read their rungs through the band; every basket set from
a row's printed cost now sets it from the folded price), `purchase.test.ts`,
`statecraft.test.ts`, `wonders.test.ts`, `cathedral.test.ts`, `endgame.test.ts`,
`state.test.ts`, and `figures.test.ts` / `yieldPrinters.test.ts` for the strip.

### Batch H9 as shipped (2026-09-06) — schema 79

The woods (`docs/flags.md` "Rulings 2026-09-06, evening" item h) and, folded in
on the same schema, the strategic start guarantee (`docs/flags.md` note 20,
RULED 2026-09-05 and never built).

#### The woods: measured, then ground

The complaint: *"currently forests spawn in huge patches, could we make them
more diffuse across the map? There should be smaller patches of forest across
the map, and some unforested tiles breaking up the large patches."*

The cause is in the shape of the pass, not in a number. `assignFeatures` dealt
the wettest `moisture.forestShare` of eligible ground, and moisture is a smooth
field — so the top third of it is, by construction, a handful of large blobs.

Five seeds, `standard`, before and after:

| | forest share of land | woods per map | mean wood | largest wood | enclosed hexes |
|---|---|---|---|---|---|
| **before** | 16.1% | 24.8 | 11.8 | 74.4 | 13.6% |
| **after** | 15.8% | 47.6 | 6.0 | 43.6 | 1.4% |

*Enclosed* = a forest hex whose six neighbours are all forest. It is the reading
the complaint actually names: a map of copses has almost none, and it fell by
**90%**. The share — the thing the ruling asked to keep — moved 0.3 points.

Isolating the two halves on the same seeds (the other switched off):

| | woods | mean | largest | enclosed |
|---|---|---|---|---|
| grain only | 47.6 | 6.1 | 45.4 | 3.9% |
| clearings only | 24.8 | 11.2 | 67.8 | 4.0% |

Both pull. The grain makes the patches; the clearings empty their insides.

#### The knobs

| Key | Value | Why this number |
|---|---|---|
| `woodland.grain` | **0.55** | Swept 0.35 / 0.45 / 0.55 / 0.65. 0.45 misses the mean-halved target (7.3); 0.65 reaches mean 5.0 but leaves moisture only a third of the say, and the regional read — wooded country against open steppe — is the thing the two-field design exists for. 0.55 is the smallest weight that hits every target. |
| `noise.woodlandGrain.cycleTiles` | **5** | A copse in hexes, fixed at every board size (`cycleTiles`, not `frequency`). Mean wood measured 3.7 / 7.2 / 6.1 at duel / standard / large — flat, which is the point. |
| `woodland.clearingChance` | **0.4** | Measured 41.0% of 134 offers over ten seeds. 0.5 was swept and moved nothing the grain had not already taken. |
| `woodland.clearingMinPatch` | **8** | A copse is what the pass is making; hollowing a five-hex wood would undo it. |

`grain: 0, clearingChance: 0` reproduces the pre-ruling woods **hex for hex** —
the `rainShadow.enabled` bargain, pinned by test.

#### Determinism

Both halves draw from streams keyed on the seed —
`webciv:mapgen:woodland:grain:<seed>` and `…:clearings:<seed>` — never from the
map's `rng`. So terrain, hills, elevation, moisture, rivers, jungle, oases and
floodplains on a given seed are **bit-identical** to v78, and so is every later
pass's dice stream. Pinned by generating one seed with the block on and off and
diffing every field (`forests.test.ts`).

What does move is the ground the later dice land on: a forest resource needs a
forest. `placeResources` therefore deals differently. Over the same five seeds
the resource **total** is unchanged (1848 → 1846 tiles) and the per-1000-land
budgets are untouched; individual kinds shuffle as the per-continent luxury hand
meets different ground (deer 83 → 95, furs 37 → 18, amber 12 → 31).

#### The capitals are armed (note 20)

`resources.startStrategics: ["horses", "iron"]`, `startStrategicRadius: 6`. The
fourth fairness guarantee (`ensureStartStrategics`), built like the three beside
it: **no dice**, nearest legal hex, ties by tile index, `minSpacing` given up
rather than the promise, the row's own terrain filter never. Five seeds × the
maximum twelve-seat roster = 120 seat-resource pairs a size:

| size | forced | seats short | of those, no legal ground |
|---|---|---|---|
| duel | 56 | 15 | 10 |
| standard | 68 | **0** | 0 |
| large | 69 | **0** | 0 |
| huge | 79 | **0** | 0 |
| giant | 73 | **0** | 0 |

Behind it, the start chooser gained its **seventh hard rejection**: a site with
no legal hex for a listed row within the radius (`strategicGround`, one dilation
per row per map, not a disc per candidate). **That clause is unreachable on the
standard sheet** — zero groundless seats at `standard` and above. It fires only
on `duel` seating twelve, where the chooser's own last-resort fallback then
seats those players on refused sites anyway because a 40×25 board with twelve
capitals has nowhere else. A duel map seating twelve is a dev harness.

`tileSuitsResource` moved from `resources.ts` to `resourceData.ts` (a leaf,
`Tile` imported type-only) so the chooser can read it without closing a runtime
cycle around `resources.ts → startPositions.ts`. `resources.ts` re-exports it.

#### Surfaces

- `mapgen.html` gained a **The woods** panel (share, woods, mean, largest,
  enclosed) and prints each seat's guaranteed strategics — in the refusal ink
  when one is missing. The three woodland knobs joined its Tuning panel; that
  page's knob list is a curated subset by its own docblock's design, unlike
  `arena.html`, so this is a page edit by intent rather than a walk that failed.
- `docs/mapgen.md`: pass 1c in the order table, "The grain of the woods, and the
  clearings", the `woodland` block in Every tunable, and the four guarantees.
- Schema **79** (`state.ts`), both halves in one changelog entry.

### Evening rulings i–m as shipped (2026-09-06) — schema 80

Built in main by the orchestrator, beside the H batches (`docs/flags.md`
"Rulings 2026-09-06, evening").

- **(m) A trader on its route is not in hand.** `ownUnitsAt` (the click's
  list) and `selectedUnit` in `controls.ts` both read `Unit.trade`; the
  selection drops the moment a route stands, and the trade screen's by-id
  Cancel (`cancelRouteOf`) is the way to call one home. No sim change —
  `unitAwaitsOrders` already skipped a routing trader.

- **(k) The rites shelf.** The verb was already on the city screen (left
  rail, "Rites"), closed and reading "—". Now the summary prints the price
  while a rite can be said here, and the shelf opens by itself until the
  player shuts it (`closedDisclosures` beside `openDisclosures`,
  `disclosure(…, defaultOpen)`). No sim change; the tree stays the gate.
- **(l) The bead Orders' age.** `OrderDef.fromAge` (the four pool-V bead rows
  carry 4), read by `drawablePool(sc, age)` — the bag `drawOrderOffer` deals
  from; `livePool` (the government's whole shelf, the bot's and the tests'
  reading) stays ungated, and a held row keeps its chair. Their `note` and
  the doc bullets say "dealt only once the last age is reached, and earned
  only there". Tests: `statecraft.test.ts` "an Order dealt only from its age".

- **(i) The belief hand's own ladder.** `openFaithLadder` spends the rung and
  climbs `PlayerPantheon.rungs` at the deal; `settleBeliefChoice` charges
  nothing (the offer's `rungCost` is the record). A belief hand's reroll —
  the ladder's, a prophet's, a founding's — is priced on `BeliefOffer.rerolls`:
  first asking free, then `explainBeliefRerollCost` (the Order draft's base
  and age multiplier, `exponent^(asked−1)`), through no door, never moving
  `rerollsTaken` or the chairs' `rerollsSeen`; the count dies with the hand.
  The votive card's foot prints "Ask again — free" and then the price with
  its fold. Tests: `faithLadder.test.ts` ("the deal spends the bank"),
  `reroll.test.ts` ("a belief hand's own ladder"), `offerFlow.test.ts`.
- **(f) Winter Mother** pays +1🌾 +1🕯 on every tundra hex — one `tileYield`
  row on terrain, no feature clause.
- **(j) No zoom on the city screen.** The wheel is the only zoom input; it
  returns while `openCity()` holds, by the pan's own derived lock
  (`panLocked`, `controls.ts`). Pinned in `cityScreen.test.ts`.
- **Rites**: the tree is the only gate (the Chapel's `ritesDoor` clause,
  C2's misreading, removed; the Chapel keeps `ritePays`).

### Batch G as shipped (2026-09-06) — schema 78

The last batch of the pass, and the only one that turns dials rather than
writing rows. `docs/fewer-things.md` §1 "The levers" and §6 item 9, RULED on the
third pass. Two numbers, no new shape, no `src/sim/` logic: the deck was
finished in F, so **how often a card arrives** and **how many can sit down** are
set against the finished deck.

#### The cadence

`meter.costExponent` **2.25 → 2.8**. Everything else in the meter is untouched —
`costBase` 12, `costLinear` 6, and the seal stays **5 turns** (RULED 2026-09-05
and again here: a card slotted in and out is skill expression).

| rung *n* | 0 | 1 | 2 | 3 | 4 | 9 | 13 | **19** |
|---|---|---|---|---|---|---|---|---|
| 12+6n+n^2.25 | 12 | 19 | 28 | 41 | 58 | 206 | 410 | **879** |
| **12+6n+n^2.8** | 12 | 19 | **30** | **51** | **84** | **535** | **1405** | **3932** |

**The opening does not move, by construction**: n^2.25 and n^2.8 are the same
number at n = 0 and n = 1, so the first two rungs are byte-identical and the
third is dearer by two culture. Run against §1's own culture curve fitted to the
user's game (2 at t0 · 15 at t20 · 45 at t40 · 90 at t60 · 195 at t92), the
ruling reproduces its stated figures exactly: **twenty drafts by turn 92 becomes
fourteen**, and the opening drafts still land on turns **4, 7, 11**.

#### The chairs

A quarter off Government III, IV and V, as ruled ("Gov III 11 → 8, and Gov IV
and V commensurately — a quarter off each slot group, rounded, every group
≥ 1"). The Chiefdom and tiers 4 and 10 are untouched: the ruling names III and
up, and three, five and seven chairs were never the crowded numbers.

**How "commensurately" was computed**, so the next pass can redo it: each
government's target total is `round(0.75 × old)`, and its own M/E/W spread is
apportioned off three quarters of each group by **largest remainder** — floor
every quarter-shaved group, then hand the leftover chairs to the largest
fractions. That keeps a government's *shape* through the cut (the Sultanate is
still the soldiers' government, the Merchant League still the counting-house)
where a plain round-each-group would have drifted the totals apart. No tie ever
arose, so the apportionment is unique; no group fell below one.

| tier | government | before | after |
|---|---|---|---|
| **18** (11 → 8) | Merchant League | 2/5/4 | **1/4/3** |
| | Imperium | 5/3/3 | **4/2/2** |
| | Divine Mandate | 3/3/5 | **2/2/4** |
| **29** (13 → 10) | The Estates | 3/5/5 | **2/4/4** |
| | The Sultanate | 6/3/4 | **5/2/3** |
| | The Curia | 4/4/5 | **3/3/4** |
| **45** (16 → 12) | The Commonwealth | 3/7/6 | **2/5/5** |
| | The Empire | 7/4/5 | **5/3/4** |
| | The Magisterium | 4/5/7 | **3/4/5** |

The ladder is still monotone (3 · 5 · 7 · 8 · 10 · 12), which
`statecraft.test.ts`'s "grows the slot spread monotonically" claim needed and
which the quarter came close to breaking at tier 18 — eight against seven is the
narrowest rung on the ladder, and it is deliberate: §1's argument is that at
fourteen drafts and eleven chairs the chairs stop being contested, and the seal
only bites when they are.

#### The pacing lines, printed

`TEST_TIER=slow npx vitest run test/sim/statecraftPacing.slow.test.ts`, seed
4242, standard map, the harness's own conservative script. **Reported, never
asserted** (the user's ruling of 2026-09-06):

```
[pacing] scripted empire: first draft t13, early cadence 11.71 turns a draft
[pacing] scripted empire reaches Government I on t43
[pacing] scripted empire reaches Government II on t131, Government III on t695
```

Against the batch-F reading (13 · 9.29 · 40 / 95 / 275). The full ladder on this
seed: 13, 22, 31, 43, 58, 67, 82, 95, 108, 131, 167, 213, 270, 341, 415, 503,
596, 695.

**Nothing in that file was re-aimed** — there is no band left in it to move. One
edit landed: the **horizon 400 → 800**, because the file's one surviving
assertion is that the three tiers its slice claims to reach do arrive inside the
window, and draft 18 now lands at t695. The horizon is the measurement's, not a
claim about the ladder (the file says so), and it has been extended three times
before for the same reason.

**Read the third figure as the script's rather than the game's.** `playEmpire`
never chases culture — it builds culture buildings only when the tree hands them
over — so it pays the steeper ladder in full and gets none of what the ladder
was steepened *for*. The user's own curve puts the same ruling at fourteen
drafts by t92 against twenty, which is the figure §1 asked for. The gap between
the two readings is the standing finding of the whole pass: a scripted seat
cannot measure a deck.

#### The doc tables, and a sync test that was missing

`docs/orders-and-doctrines.md`'s **Governments** table (the `Slots M/E/W`
column) is the table of record for the chairs and it re-prints here. It was
mirroring data with **no sync test** — the third such table in that file and the
only one unguarded — so it gains one (`statecraftDocSync.test.ts`, "prints every
government's chairs as the data lays them out"), both directions, per
`CLAUDE.md`'s rule.

`docs/design-notes.md` had no slot table, only the meter formula; it now carries
both — `12+6n+n^2.8` and a one-line chairs-by-tier summary pointing at the table
of record.

#### Files and tests

Files: `data/statecraft.json` (`meter.costExponent`, nine `slots` spreads) ·
`docs/orders-and-doctrines.md` (the Governments table) · `docs/design-notes.md`
(the Statecraft section) · `src/sim/state.ts` (schema **78** and its changelog
entry). **No `src/sim/` logic and no `src/ui/` edit** — a chair count and a
ladder exponent are both read straight off the sheet.

Tests: `statecraft.test.ts` (a new dated block, "the cadence and the chairs, as
ruled on the third pass" — the meter object, the ladder's arithmetic at both
ends, the nine triples, the untouched tiers and the ≥ 1 floor),
`statecraftDocSync.test.ts` (the governments' chairs), the twelve schema
witnesses, and `statecraftPacing.slow.test.ts`'s horizon. Green: the four named
statecraft files, the twelve witnesses, `statecraftStaging`, `reroll`, `aiWar`,
`ledgerScreen`, and the slow pacing harness.

### Batch F as shipped (2026-09-06) — schema 77

The deck itself. `docs/orders-pass-3.md` §2 as the user marked it and §9 as it
rules, with `docs/balance-turn.md` §3's marked numbers on every surviving
standalone. **No shape was invented**: batch A declared all seven and this is the
pass that puts them on cards, so `src/sim/` gained not one line — the batch is
`data/statecraft.json`, the doc, the schema number and the tests.

**The verdicts, counted**: 69 KEEP untouched · 64 CONVERT or re-priced · 24 CUT ·
34 NEW · 8 rows given a `deferred` line **by this pass** (4 of them deferred whole).

#### The census after the pass

Role is **derived from the row's own effects** (`statecraftDocSync.test.ts` owns
the derivation and pins the doc's new column against it): **E** an engine — its
subject is the deck or the board's *kind*; **P** a payoff — it scales with what
the empire has built, holds or slotted; **S** a standalone — a flat, a rule, an
occasion, a boon on the calendar.

| pool | rows | E | P | S | rarity ● / ◆ / ○ |
|---|---|---|---|---|---|
| Chiefdom | 10 | 1 | 4 | 5 | 70% / 20% / 10% |
| Government I | 28 | 3 | 8 | 17 | 39% / 57% / 4% |
| Government II | 49 | 13 | 16 | 20 | 43% / 47% / 10% |
| Government III | 42 | 4 | 19 | 19 | 50% / 29% / 21% |
| Government IV | 20 | 1 | 10 | 9 | 10% / 55% / 35% |
| Government V | 18 | 3 | 8 | 7 | 6% / 22% / 72% |
| **all** | **167** | **25 (15%)** | **65 (39%)** | **77 (46%)** | 38% / 41% / 22% |

Against the ruled **25 / 30 / 45** the standalones land on the number and the
engines are **ten points light** — the deck came out payoff-heavy. That is what
§9's withdrawal of the line readers cost it: the proposal's twenty-four engines
included eleven line-counting rows, and the ruling kept only the slot-flavour
counts. It is a design finding for the next markup, not a bug, and it is printed
in `statecraft.test.ts`'s own comment rather than asserted — a share is a thing
the user moves by striking rows, and a test that failed when they did would be a
test arguing with the designer.

Rarity climbs with the pool, which is the ruling ("rarity should correlate with
power/payoff") read up the ladder: a Chiefdom hand is seven-tenths common, a
Government V hand is seven-tenths rare.

#### The retired rows (24, kept for saves)

| pool | ids |
|---|---|
| Chiefdom | `firstFruitsOffering` |
| Government I | `charterTowns` · `statuteLabour` · `theBellFounders` · `thePilgrimsPurse` |
| Government II | `breadAlone` · `publicani` · `riverWardens` · `theLongRoads` · `theMasonsLodge` · `theQuietFields` |
| Government III | `frontierForts` · `garrisonState` · `theAlmonersBook` · `theCharterOfTheMarches` · `theCongregation` · `theDryDocks` · `theFinishersArt` · `thePrizeGrounds` · `theSaltingHouses` · `theWinteringGrounds` |
| Government IV | `theFactorHouses` |
| Government V | `manufactories` · `titheBarns` |

Each keeps its text untouched and gains `retired: true` plus the standing note
("A saved game that already holds it keeps it"). Two of them are the only live
rows for a `TallyOccasion` — `wonderAnywhere` (the Bell-Founders) and `goldSpent`
(the Almoners' Book) — so those two occasions are now written down and watched by
nothing that is dealt. The register in `growingOrders.test.ts` walks every row
rather than every live row, so it still holds; whether an unwatched occasion
should stay is a question for the next pass.

#### The new rows, with their JSON

| id | name | pool · rarity · line | effects |
|---|---|---|---|
| `theMusterRolls` | The Muster Rolls | I · ◆ · forge | `[{"kind":"slotPosition","slot":"military","position":1,"factor":2}]` |
| `theHarvestHome` | The Harvest Home | I · ● · green | `[{"kind":"cardYieldAmplifier","yield":"food","amount":1}]` |
| `theReevesBell` | The Reeve's Bell | I · ● · ploughshare | `[{"kind":"periodic","everyTurns":8,"pays":"food","count":"population"}]` |
| `theFirstChair` | The First Chair | II · ◆ · court | `[{"kind":"slotPosition","slot":"economic","position":1,"factor":2}]` |
| `theScriveners` | The Scriveners | II · ◆ · star | `[{"kind":"buildingYieldPercent","pays":"science","percent":50}]` |
| `theSacredGround` | The Sacred Ground | II · ● · procession | `[{"kind":"tileYield","faith":1,"on":{"test":"yields","yield":"faith"}}]` |
| `theAssayersRule` | The Assayer's Rule | II · ● · caravan | `[{"kind":"tileYield","gold":1,"on":{"test":"yields","yield":"gold"}}]` |
| `theCountingHouses` | The Counting Houses | II · ◆ · caravan | `[{"kind":"buildingYieldPercent","pays":"gold","percent":50}]` |
| `theAlmanacOfHours` | The Almanac of Hours | II · ◆ · court | `[{"kind":"periodShorten","turns":3}]` |
| `theFoundryDays` | The Foundry Days | II · ● · forge | `[{"kind":"periodic","everyTurns":10,"pays":"production","count":"empireYield","voice":"production","per":2}]` |
| `theNetsBlessing` | The Nets' Blessing | II · ○ · caravan | `[{"kind":"tileYield","on":{"test":"improvement","improvement":"fishingBoats"},"percent":100}]` |
| `theHighChancery` | The High Chancery | II · ○ · court | `[{"kind":"cardYieldAmplifier","yield":"all","percent":50,"scope":{"test":"capital"}}]` |
| `theVotiveTally` | The Votive Tally | II · ◆ · procession | `[{"kind":"countScaled","count":"rerollsWhileSlotted","pays":{"to":"yield","yield":"faith","amount":1,"where":"empire"}}]` |
| `theWorkshopsRule` | The Workshops' Rule | III · ◆ · forge | `[{"kind":"buildingYieldPercent","pays":"production","percent":50}]` |
| `theWildChair` | The Wild Chair | III · ◆ · court | `[{"kind":"slotPosition","slot":"wildcard","position":1,"factor":2}]` |
| `theCantorsRule` | The Cantors' Rule | III · ○ · procession | `[{"kind":"cardYieldAmplifier","yield":"faith","percent":50}]` |
| `theGoldenCenser` | The Golden Censer | III · ○ · procession | `[{"kind":"periodic","everyTurns":15,"pays":"faith","count":"empireYield","voice":"science","per":2}]` |
| `theDeepSeams` | The Deep Seams | III · ○ · forge | `[{"kind":"tileYield","on":{"test":"improvement","improvement":"mine"},"percent":100}]` |
| `theExchangeCharter` | The Exchange Charter | III · ○ · caravan | `[{"kind":"buildingYieldPercent","pays":"gold","percent":50,"appliedLast":true}]` |
| `theTriumph` | The Triumph | III · ● · court | `[{"kind":"periodic","everyTurns":12,"pays":"culture","count":"empireYield","voice":"production"}]` |
| `theScholarsRule` | The Scholars' Rule | IV · ◆ · star | `[{"kind":"cardYieldAmplifier","yield":"science","amount":1}]` |
| `theExchequer` | The Exchequer | IV · ● · caravan | `[{"kind":"effectAmplifier","target":"routeYields","percent":100}]` |
| `theAssay` | The Assay | IV · ○ · caravan | `[{"kind":"periodic","everyTurns":20,"pays":"science","count":"empireYield","voice":"gold"}]` |
| `theBroadAcres` | The Broad Acres | IV · ○ · green | `[{"kind":"tileYield","on":{"test":"improvement","improvement":"farm"},"percent":100}]` |
| `theJubilee` | The Jubilee | IV · ◆ · procession | `[{"kind":"periodic","everyTurns":10,"pays":"faith","count":"population"}]` |
| `theCompactOfChairs` | The Compact of Chairs | V · ○ · court | three `slotPosition` rows, one per flavour, `factor: 2` |
| `theLaureatesRule` | The Laureates' Rule | V · ◆ · court | `[{"kind":"cardYieldAmplifier","yield":"culture","amount":1}]` |
| `theGreatClock` | The Great Clock | V · ○ · court | `[{"kind":"periodShorten","turns":3},{"kind":"windfallRider","occasion":"periodic","percent":50}]` |
| `theEncyclopaedists` | The Encyclopaedists | V · ○ · star | `[{"kind":"periodic","everyTurns":10,"pays":"culture","count":"empireYield","voice":"science"}]` |
| `theCollegesRule` | The Colleges' Rule | V · ○ · star | `[{"kind":"buildingYieldPercent","pays":"science","percent":100,"appliedLast":true}]` |
| `theGreatEnquiry` · `theLastLaurels` · `theSaltedEarth` · `theFinalProclamation` | the four "just win now" Orders | V · ○ | `[]` — **deferred**, see below |

#### The grammar, on the board

§9's sentence — *put yields on a thing, then multiply the thing* — is the whole
shape of the pass, and it is visible in four objects:

| the object | what was put on it | what multiplies it |
|---|---|---|
| **the route** | Silk Roads' five coins · the Ledger-Keepers' beaker and song (scoped by `origin` to a Market town) | The Escorted Roads (+30%), **The Exchequer** (×2) |
| **a class of buildings** | the shelves' own figures | The Scriveners, The Counting Houses, The Workshops' Rule (+50%); **The Synod**, The Exchange Charter, The Consistory, The Colleges' Rule (`appliedLast`) |
| **the capital** | Wayside Shrines' candle per town · Fire-Keepers' candle per two citizens · the Guild Charter's hammers · Ore Tithes' hammers | **The High Chancery** (+50% of what the Orders pay there) |
| **the works on a hex** | the improvement's own lines | The Nets' Blessing, The Deep Seams, The Broad Acres, The Salon (×2) |

Two caps came off — **Ore Tithes** and **The War Council** — and no line reader
was built: `CardLine` stays a drawn mark, per §9's second answered question.
`slottedOrdersOfLine` does not exist and nothing asked for it.

#### Deferred, and why

| row | what is not built |
|---|---|
| `theGreatEnquiry` · `theLastLaurels` · `theSaltedEarth` · `theFinalProclamation` | **A bead cannot be handed to a card.** Beads are won by the deeds each age deals (`beads.ts`'s five card classes) and no `CardEffect` grants one; and none of the four occasions the rows want exists either — `TallyOccasion` has `barbarianKill`, `wonderAnywhere`, `greatPersonSpent`, `unitLost` and `goldSpent`, and nothing marks *a draft passed*, *a city razed*, *a proclamation* or *an Æra V technology*. All four ship with their text, a `deferred` line and a `note`, which is the vocabulary's own convention. **They are still dealt**, so the day the occasion lands they are already in the bag |
| `theRecklessLevy` | *"every unit +1 maintenance"* — a **flat surcharge per soldier**. `CardUpkeepRebateEffect` is a rebate and skips a non-positive amount, so a negative rebate is silently nothing. The row keeps its percentage on the payroll, which is the honest reading of what it does pay |
| `theSilkExchange` | *"+1🎵 per 2 population in the destination city"* — a route reading the **partner's size**. `routeYields.ts` can see the partner's buildings but a `CityScope` answers about one town and `origin` is deliberately the only one. `docs/balance-turn.md` §7 already named this as needing a new shape |
| `theGuildCompact` | *"+5% per specialist"* — there is no `specialists` count. The row takes the balance turn's other number (+3% a production hall, at most +15%) and says so |
| `theJubilee` | the second voice. **One chair keeps one clock**: `SlottedOrder.nextFiresTurn` is a single stamp, so a second `periodic` effect on one row would be skipped forever by the first one's re-stamp. The Jubilee pays faith and its `deferred` line says the song is missing |

#### Judgement calls

1. **`firstRites` and `theFoundingOath` were left alone**, against §2's printed
   verdicts, because the user's own bracketed marks are later and say so:
   *"keep the current effect for now"* on First Rites, and *"per city is way too
   strong … chiefdom may be too early for this"* on the Founding Oath. §2's
   "the user's re-cut" attribution on the Oath reads as the pass author's, not
   the user's.
2. **Rule 3 is withdrawn** (`docs/balance-turn.md` §7: *"the recommendation is
   neither rule 3 nor the clamp"*), so the pure-cheer rows — Census Rolls, the
   Long Watch, Village Fairs, Sumptuary Laws, the Grain Dole, the Provisioners —
   keep their cheer and gained no second yield clause. **Festival Days is the
   exception** and only because the user wrote the modification themselves
   (+4😊 in the capital, +2🎵 everywhere).
3. **Weights & Measures kept its flat.** Balance-turn §3 proposes "+1💰 per 3
   citizens" for it *and* for The Tax Farm, which would have made two identical
   rows in one pool. The Tax Farm takes the count; Weights & Measures stays the
   vanilla floor, which is also what §9's "early pools lean standalone" wants.
4. **The building doublers select by `pays`, not by `category`.** The shape's own
   docblock rules that *"a faith building is a building whose row pays faith"*,
   and §9's re-ruling of The Exchange Charter from "Markets" to "gold buildings"
   is the user reading it the same way. So The Consistory is "your faith
   buildings" rather than "your Temples", and The Colleges' Rule is "your science
   buildings" rather than "your Universities".
5. **Three periodic rows were reworded to what the shape can say.** A boon pays
   one bank, and food and hammers land in the **capital's** basket
   (`payWindfallGrants`), so *"every city gains food equal to its population"*
   became "your capital gains food for each citizen in your empire" — the same
   total, honestly printed. The Foundry Days' *"every mine and quarry pays its
   production again"* has no count to read (there is no improvement count), so it
   is half the realm's hammers, which lands within a few points of the figure
   §2 estimated for it.
6. **The Votive Tally lost its object.** The ruled text is *"+1🕯 on Shrines for
   every faith roll"*; `CardPayout` has no scope and `countScaled` no `where`
   beyond empire / city / capital, so the tally pays the realm rather than the
   shrines. The count itself is exactly the ruled one (`rerollsWhileSlotted`,
   batch C1's counter), and this is the one place the pass could not put a yield
   on a thing.
7. **The Ledger-Keepers' route reads the origin, not the destination.** The
   ruled text is "routes **to** cities with a Market"; a `CityScope` answers about
   the town the caravan *left*. Origin is the closest expressible reading and it
   is the one that puts the yield on the route object, which is what the mark
   ("modify to put bonuses on markets") was for.

#### No slow-tier measurement, by ruling

**The user's ruling of 2026-09-06 — *"stop using scripted bots for measuring
changes"* — landed while this batch was in flight, so step 7 of the brief was
withdrawn and no figure below it is claimed.** `statecraftPacing.slow`'s bands
are gone (it reports rather than asserts) and `aiDecision.slow`'s coverage set
was not touched. The batch's gate is the core tier and the typecheck.

What was read before the ruling landed, kept as a note rather than as a pin:
`statecraftPacing.slow` ran green and **identical to the turn** — first eight
drafts 13 · 22 · 31 · 40 · 53 · 61 · 68 · 78, early cadence 9.29, government
tiers 40 / 95 / 275 — which is exactly the dated re-aim of 2026-09-06.
`aiDecision.slow` ran green in 105s. `aiBot.slow` was never allowed to finish.

The reason nothing moved is the reason the ruling exists: `playEmpire` takes the
first legal card in every draft and never arranges a deck, so a pass whose whole
power is in engines and multipliers pays a scripted seat almost nothing. The
measurement that would matter — what a *played* deck is worth — is the hand
arithmetic in `docs/orders-pass-3.md` §6, and no harness in the repo can arrange
one until the bot drafts engines (batch F2). That is the pass's real open number.

#### The bot

`src/ai/value.ts` needed **no edit** — batch A armed every engine shape and this
pass used only those. The acceptance is a source-reading register in
`aiAppraisal.test.ts` (`has an arm for every shape batch F wrote onto a card`),
which reads `scoreEffect`'s own `case` labels and asserts every effect kind on
every touched row has one. Four named debts, all of them older than this batch
and all priced at the stand-in: `routeRider` (an extra caravan slot),
`rulePercent` (every rule but Machinery's road fraction), `effectAmplifier` (a
percentage on another table's figure — which is what **The Exchequer** is, so the
deck's clearest trade payoff is the one the bot most under-prices), and
`windfallRider` (an occasion's grant).

The standing debt is unchanged and is F2's: an engine appraised alone multiplies
a deck this reading cannot see, so the bot drafts a standalone-and-payoff deck.

Files: `data/statecraft.json` · `docs/orders-and-doctrines.md` (Orders
regenerated, with the new Role column) · `src/sim/state.ts` (schema 77 and its
changelog). Tests: `statecraft.test.ts` (a batch-F block of six, plus the shape
register turned into the list of which rows carry which shape, and every earlier
pass's ratified-words block re-aimed), `statecraftDocSync.test.ts` (the role
column's own sync), `cardImpact.test.ts` (a stamp fixture per shape, on the real
rows), `aiAppraisal.test.ts` (the bot register), `growingOrders.test.ts`,
`exactYields.test.ts` (the Harvest Songs' share), `test/ui/statecraftReveal.test.ts`
(the position word now has cards to appear for), and the twelve schema witnesses.


### Pacing re-aim after D, E, X (2026-09-06)

The one dated re-aim the plan holds the fixtures still for. Batches D (the
buildings cut, the halved base beaker), X (exact yields) and E (the tree's
gifts) all moved the scripted harnesses; each batch reported its measurement and
left the bands where they were, so that the size of what the science cut costs
is read once rather than absorbed a batch at a time. This is that reading.

**Seed 4242, standard map, each harness's own script.** "Before" is each
assertion's last dated pin (2026-09-05 for the first three files, 2026-09-02 for
`beads.slow`), not a re-run of the old tree.

| harness · assertion | before | after | band now |
|---|---|---|---|
| `tech.slow` — Æra I closes | 66 | **80** | 70 … 90 |
| `tech.slow` — Æra II closes | 120 | **156** | 141 … 171 |
| `tech.slow` — Æra III closes | 366 | **481** | 456 … 506 |
| `tech.slow` — Æra IV closes | 779 | **999** | 969 … 1029 (horizon 900 → 1100) |
| `statecraftPacing.slow` — first draft | 13 | **13** | 6 … 20 (unmoved) |
| `statecraftPacing.slow` — early cadence, drafts 1–8 | 9.3 | **9.29** | 5 … 13 (unmoved) |
| `statecraftPacing.slow` — Government I (draft 4) | 57 | **40** | 29 … 51 |
| `statecraftPacing.slow` — Government II (draft 10) | 94 | **95** | 76 … 108 (unmoved) |
| `statecraftPacing.slow` — Government III (draft 18) | 325 | **275** | 254 … 296 |
| `beads.slow` — the Æra III table opens | 211 | **308** | 20 … 420 (horizon 260 → 400) |
| `endgame.slow` — the Opus opens (one-city seat) | 1689 | **3959** | 100 … 4100 (horizon 1900 → 4200) |
| `endgame.slow` — the Opus is finished | 1690 | **3960** | > opened |
| `religion.slow` — the first consecration | — | **53** | 10 … 75 (the augur's old window) |

**The mechanism, in one paragraph.** D halved `rules.cities.sciencePerPop` and
cut the buildings down to chains, which on its own was ruinous rather than slow —
the base beaker was floored *per town*, so a size-1 village banked nothing at all
and Æra I slid to t236. X took the floor out of every fold and most of that came
back (Æra I from 236 to 80), because a half beaker is a half beaker again. What
is left is the halving itself, paid honestly: 80 against 66, 156 against 120. E's
gifts add a few turns at the far end — Horology's and the Water Clock's periodic
beakers arrive too late in these build orders to pay for themselves before Æra
III. And the Monument's writ leaving the buildings is the one that does not look
like science: a wide realm's borders grow slower, five towns work less ground,
five towns make fewer beakers — most of the difference between Æra III at 366 and
at 481.

The culture ladder is the exception and moves the *other* way: the cliff at
draft 3 (turn 54 → 31) was the happiness bill of a third town landing on an
empire that could not pay it, and D and E moved where a realm's cheer comes
from, so the third town is affordable when it lands.

#### Repairs, not re-aims

Two edits are repairs to a harness that was **wrong**, not bands moved around a
slower game. Both in `test/sim/religion.slow.test.ts`:

1. **The schema pin, 70 → 76.** It had stood at 70 since before C1 and the file
   never ran green long enough for anybody to move it. The dated line on the
   assertion names what landed on top of it: v71 the faith ladder and the
   reroll, v72–v74 the rites becoming a town's verb behind the Chapel's door,
   v75 exact yields, v76 the tree's gifts.
2. **The augur's errand becomes the faith ladder.** `playFaithful` bought an
   augur for forty faith the moment the pool covered one, walked it to a town
   and spent it on a rite or a god. C2 retired the augur, so the script bought
   nothing, said nothing and consecrated nothing — a refused purchase every turn
   for two hundred turns. It now banks its faith and takes the consecration the
   ladder deals (`openFaithLadder` → `chooseBelief`, the pick paying the rung),
   which lands the first god on **turn 53** — inside the window the augur's own
   purchase had, because the ladder deliberately wears the augur's old price.
   `playTwoFaiths` lost its dead augur purchase and its dead consecration loop
   the same way.

#### Claims changed

- **`endgame.slow` no longer claims the finish line "arrives inside a game".**
  It arrives — the chart runs out, the row appears in a build list, hammers and
  the treasury pay twelve hundred, the golden bead lands and the race settles —
  but the one-city seat needs **3960 turns**. A band around that number would be
  a pacing target nobody should read, so the assertion pins the *machinery* (the
  regression it was written for: a gate correct and unreachable) and the turn
  count is written up on the assertion as a finding.
- **`religion.slow`'s rite comes off the prophet, not a town.** A rite is a
  town's verb behind the Chapel, and the Chapel is behind The Rites Charter — an
  *uncommon wildcard* Order in the Government I pool, one wildcard drawn per
  hand, and the pool is gone the moment Government II is adopted. A scripted
  seat gets five or six chances at it and, on this seed, takes none. The
  determinism claim therefore rests on `empireRite`, which needs no Chapel
  anywhere; the town verb is scripted too and fires when the deck obliges.

#### Findings for the user (pacing, not fixtures)

- **The game's length.** The four-age tree is meant to close the game around the
  end of Æra IV. The five-town empire closes Æra IV at **t999**; the one-city
  seat opens the Opus at **t3959**. Both are longer than any ruling asked for,
  and the gap between them — four to one — is what a capital alone is worth.
- **The rite door.** Rites are a whole subsystem (five rows, a price ladder by
  age, a ten-turn seal) standing behind one uncommon wildcard card that leaves
  the bag at the second government. A seat that misses it never says a town rite
  for the rest of the game.
- **The purse is still under water.** The five-town empire crosses zero around
  turn 90 and never returns (−22528 gold at t900); the one-city seat crosses
  around t900. `treasuryInDebt`'s quarter is therefore a standing tax on both
  harnesses rather than an occasional pressure, and it is most of why the late
  ages are as long as they are.

Files: `test/sim/tech.slow.test.ts` · `statecraftPacing.slow.test.ts` ·
`endgame.slow.test.ts` · `beads.slow.test.ts` · `religion.slow.test.ts`.
No `src/` or `data/` edit — a slower game is a finding here, not a fix.

### Batch X as shipped (2026-09-06) — schema 75

Yields are exact. The ruling, in the user's words on the day batch D's science
cut was measured: *"could we just have yields be valid as decimals? Just don't
show this to the player, but behind the scenes all yields should be calculated
exactly."*

The measurement that caused it: D halved `rules.cities.sciencePerPop` to 0.5 and
the scripted five-town empire's Æra I close slid **t66 → t236**. Nothing about
the tree moved. What moved is that the base beaker was floored **per town**, so a
size-1 village at half a beaker banked *nothing at all* — and the same floor sat
under a card's tenth of a harvest, a writ's ten percent on three culture, a
luxury's half-point signature and a fifth of a turn's science. The ruling takes
the floor out of every fold and puts one rounding at the reader's eye.

#### The three halves

1. **Nothing rounds inside a fold.** `applyStages` (Entry XVII's two
   multiplications) returns the exact product; every per-citizen line, tile
   percentage share, card conversion, amplifier, route share, connection share,
   renown trickle share, upkeep rebate, luxury signature, growth surplus, growth
   carryover and border accrual carries the fraction.
2. **The banks hold it.** `Player.gold` · `sciencePool` · `culturePool` ·
   `faithPool` · `renownPool` · `City.foodBasket` · `hammerBasket` ·
   `City.culture` are JSON numbers that may be fractional. Every threshold beside
   them is still an integer and every comparison is the `<` / `>=` it always was
   — `floor(x) >= n` and `x >= n` are the same statement for integer `n`, which
   is why the pools' own readings could be left alone.
   `Player.pressureBank` is **not** yield-fed (lumps and the tide are integers)
   and is untouched.
3. **The surface rounds, and only the surface.** One formatter,
   `src/sim/yieldFormat.ts` — `roundYield` / `formatYield` / `signedYield` /
   `yieldShows` — in `src/sim/` rather than in `src/ui/` because the compendium's
   describers, a card's clause and a toast's sentence are composed sim-side.

#### The audit

Every `Math.floor` / `Math.round` / `Math.trunc` in `src/sim/` was classified —
185 call sites over 39 files. **Removed — 38, across 9 files**, each one a line
of a yield fold:

| file | what came out |
|---|---|
| `modifiers.ts` | `applyStages` — both floors, the idle path and the two-stage product |
| `cities.ts` | the two tile percentage shares (works · ground) · `cardBuildingYields`' per-pop base and its share · `explainBuildingPreview`'s per-pop line · `cityQuote`'s centre per-pop and buildings per-pop · `growthSurplus` · `borderGrowth.perTurn` · `growthCarryover` · a beaten wonder's gold refund |
| `statecraft.ts` | `amplifyTrickle` · the amplifier's percent · the slot-position factor · `cardYieldConversions` · the tile-line amplifier · `fromRate`'s share of a turn · `windfallPayout`'s rider percentage · `rateOf`'s five voices (a rate is divided *and* floored by `helpings` when it is a count, so unfloring it changes no count and pays a `fromRate` grant its fraction) |
| `routeYields.ts` | the route amplifier's five voices |
| `empireGold.ts` | the connection share, the luxury share of it, and its apportionment |
| `renown.ts` | the buildings' trickle share |
| `upkeep.ts` | the payroll rebate and its apportionment |
| `resourceEffects.ts` | a luxury's yield bag, scaled by copies |
| `triumphs.ts` | The Academy of Deeds' share of a Triumph's lump |

**Kept — the other 147**, because each is a price, a threshold, a count, an
index, a roll, movement or a display. The ones worth naming:

| kept | where | why |
|---|---|---|
| `growthThreshold` · `nextBorderCost` · `borderCostFor` | `cities.ts` | prices the basket and the culture bank are compared *against*; a fractional threshold makes every rail unreadable |
| `explainUnitCost`'s age band and settler law · `tilePurchasePrice` · `explainTilePurchase` (ring index, era step, luxury discount) | `cities.ts` | prices |
| `settlePopulationWindfall`'s `points` | `cities.ts` | a count of citizens |
| `specialistThreshold` | `specialists.ts` | the guild bar |
| `helpings` (`floor(total / step)`) · `countOf`'s pool and rate readings · `draftCost` · `skipPity` · offer sizes · every `every`/`turns` figure | `statecraft.ts` | counts and periods. **The `per: N` ruling stands**: "one point per two citizens" counts citizens; it did not become half a point a citizen (batch D chose `countScaled per: 2` deliberately) |
| `buildingsPerFood` · `buildingsPerProduction` · `goldPerCombinedPop` | `routeYields.ts` | "one X per N things" — the same count rule |
| `roadsPerMaintenance` | `empireGold.ts` | one coin of upkeep per N road hexes |
| `renownThreshold` | `renown.ts` | the great-person ladder's rung |
| the faith ladder · the reroll price · `pressurePerConvert` · the majority · the apostle's range and lump · `relicFaith` | `religion.ts` | prices, counts and pressure — pressure is not yield-fed |
| `Math.floor(player.faithPool)` in the three refusal sentences | `religion.ts` | a **shortfall** printed in a refusal must never round *up* into affordability ("asks 40 and has 40" would be a lie) |
| `routeTurns` | `turn.ts` | a duration |
| the luxury happiness lines | `meters.ts`, `resourceEffects.ts` | meters are not yields |
| `snapMovement`, every combat roll, every rng index | `movement.ts`, `combat.ts`, … | untouched by construction |

`test/sim/exactYields.test.ts` pins both columns by reading the source, so a
floor that comes back on a fold's line fails the build.

#### The formatter, and the two meters

`figure` and `signedFigure` (`src/ui/figures.ts`) now round **whole**, through
`roundYield`. They were the interface's two number printers already, so one edit
carried forty call sites. Everything that composes a figure itself — the town
rail's meters, the hex readout, the stamp's counted digits, a plunder's spoils,
the culture ladder, the pressure ledger, the spectator's seat line — names
`roundYield` / `signedYield` directly, and `test/ui/yieldPrinters.test.ts` is the
register of that list.

**The two meters keep their tenth**, on a printer of their own
(`meterFigure` / `signedMeterFigure`). Happiness and authority are not yields:
they are ledgers with a genuinely fractional crowding term
(`0.6 · 3 ^ 1.4`), they are compared against tier *rungs* rather than spent, and
a chip reading `+9` while the tenth below the rung is what a player is playing
around would be hiding the wrong thing.

**Lines may not visibly sum, and there is no "±".** Rule 5 is unchanged — a total
is the exact fold of its exact lines — but a *printed* breakdown rounds each line
on its own and the total from the exact fold, so three lines of 0.4 print as
`0 · 0 · 0` under a total of `1`. Apportioning the rounding back over the lines
would make each printed line disagree with what that source actually paid, which
is the worse lie. Said in `yieldFormat.ts`'s docblock.

**Entry XVIII.5 restated** in `windfallPayout`'s docblock: the rule was "one
printed figure"; it is now *one exact banked figure, printed rounded*. Base and
riders still compose before anything is banked — that was always the point — but
the composition no longer floors, so a fifth of a turn's science is paid.

#### The measurement (reported, not re-aimed)

The scripted five-town empire, seed 4242, standard map, `tech.slow.test.ts`'s own
harness. Measured **twice on today's tree** (batch E's nodes included on both
sides), by re-flooring the batch and running the same harness:

| | Æra I | Æra II | Æra III | Æra IV | techs by t900 |
|---|---|---|---|---|---|
| before the science cut (2026-09-05 pin) | 66 | 120 | 366 | 779 | 50 / 50 |
| batch D, floors in (measured today) | **236** | **343** | — | — | 34 / 50 |
| batch X, floors out (measured today) | **80** | **156** | **481** | — | 47 / 50 |

So the ruling recovers most of what the floor cost — Æra I from 236 back to 80
against a pre-cut 66 — and the game reaches Æra III again inside the harness's
horizon. It does **not** put the curve back where it was: the beaker really did
halve, and Æra II is 156 against 120. The three pacing harnesses
(`tech.slow`, `statecraftPacing.slow`, `endgame.slow`) are therefore still
outside their bands and are **left there deliberately** — the dated re-aim
follows E, and re-aiming inside this batch would have hidden the size of what the
cut actually costs. All three were already failing after D; `beads.slow`'s
age-3 opening fails identically with the floors in and out, so it is D/E's, not
this batch's.

The border curve moved too, and that one is re-pinned because it is a *core*
test: `test/sim/territory.test.ts`'s monument schedule was 2 · 5 · 9 · 16 · 25
and is now 2 · 4 · 8 · 15 · 24. No border cost changed; the town's own culture
simply stops being floored on its way through the stages.

#### The bot

`src/ai/value.ts` needed no edit. Its four floors are a median index, a label
formatter, a periodic period and a data amount — it prices yields as numbers and
made no integer assumption. `test/sim/aiBot.test.ts` and `aiWants.test.ts` pass
unchanged; the bot's own hashes are re-derived rather than re-pinned, because
those suites assert behaviour rather than a snapshot digest.

#### Debts

- **The arena's means stay at one decimal.** `src/arenaPage/main.ts` averages
  five headless games a seat, and a mean of five whole readings is honestly
  fractional — rounding it whole would destroy the signal the panel exists for.
  It is an instrument, not a player-facing figure, and it is the one place a
  decimal is still printed on purpose.
- **`test/sim/religion.slow.test.ts` carries a stale schema pin (70)** from
  before C1, and fixing the number reveals a deeper C2 breakage (the harness buys
  an augur, and the augur is retired). Left for C2's own debt list. —
  **Paid 2026-09-06** in the pacing re-aim above: pin 76, and the errand replaced
  by the faith ladder.
- **The city panel still prints `+0.5🔬/pop`** on a building's per-citizen line.
  That figure is a *rate off the row*, not a standing yield, and rounding it
  would print either a beaker a citizen (a lie) or nothing (worse). It has read
  that way since batch D halved the Library's line; if it reads badly in play the
  fix is a rate voice in the formatter, not a rounding.
- The three pacing harnesses above are red on purpose, pending the dated re-aim.
  — **Paid 2026-09-06**, with `beads.slow` and `religion.slow` beside them; see
  "Pacing re-aim after D, E, X".

Files: `src/sim/yieldFormat.ts` (new) · `modifiers.ts` · `cities.ts` ·
`statecraft.ts` · `routeYields.ts` · `empireGold.ts` · `renown.ts` · `upkeep.ts` ·
`resourceEffects.ts` · `triumphs.ts` · `state.ts` (schema 75) ·
`src/ui/figures.ts` · `topBar.ts` · `tileReadout.ts` · `cityPanel.ts` ·
`cardStamp.ts` · `controls.ts` · `tradeLines.ts` · `techTree.ts` ·
`statecraftScreen.ts` · `religionScreen.ts` · `src/spectate/main.ts`.

**The schema number.** This batch took **75**; batch E landed **76** on top of it
the same afternoon, so the twelve schema witnesses read 76 and the changelog in
`state.ts` carries both entries. Tests: `exactYields` (new), `yieldPrinters` (new),
`cities`, `modifiers`, `statecraft`, `meters`, `territory`, `religion`,
`resourceEffects`, `buildingChains`, `greatPeople`, `purchase`, `wonders`,
`figures`, `religionV2`, and the twelve schema witnesses.

### Batch E as shipped (2026-09-06) — schema 76

The tree's gifts, `docs/tech-gifts.md` §7 as the user marked it. Batch D left six
nodes handing over no building; this is what they hand over instead. **Every gift
is a row** — the effect vocabulary the tree has carried since the Age I rework
(`TechDef.effects`, `liveEffects`' tenth source) plus the engine shapes batch A
declared and nothing had used yet — so `src/sim/` gained no branch that names a
technology, and the whole batch is nine JSON rows, two shape members and one
denominator.

**The schema number.** The plan wrote E as riding D's. It does not: ten nodes
hand over different gifts, a project id joined the queue's vocabulary and an army
holding Machinery marches further on the same paving, so a v75 log replays into a
different empire. Batch X took **75** while this batch was in flight; E takes
**76**, and `state.ts`'s changelog says so. Eleven `expect(SCHEMA_VERSION)` pins
moved with it.

#### Node by node, and the JSON

| node | landed gift | the row |
|---|---|---|
| **Code of Laws** (`kingship`) | the third conversion project, and the crown's writ | `unlocks.projects: ["pageants"]` · `{"kind":"authority","amount":3}` |
| **The Civil Service** (`theExaminationHall`, **renamed**, id kept) | the writ, and a great person's works put to use | `{"kind":"authority","amount":5}` · `{"kind":"tileYield","on":{"test":"greatWork"},"food":1,"production":1}` (the happiness tier boost it always carried stays) |
| **Guildhalls** (`artisanry`) | wonders rise faster and sing louder | `{"kind":"productionBonus","category":"wonder","percent":10}` · `{"kind":"countScaled","count":"wonders","pays":{"to":"yield","yield":"culture","amount":2,"where":"empire"}}` |
| **Horology** | every ten turns, five beakers a production building | `{"kind":"periodic","everyTurns":10,"pays":"science","amount":5,"count":"buildingsOfCategories","categories":["production"]}` |
| **The Water Clock of Su Song** (`data/buildings.json`) | the wonder reworked around its own deferred chime | `{"kind":"periodShorten","turns":2}` · `{"kind":"periodic","everyTurns":7,"pays":"science","count":"empireYield","voice":"production"}` |
| **Chronology** (`theLongCount`) | every fifteen turns, renown by the realm's libraries and shrines | `{"kind":"periodic","everyTurns":15,"pays":"renown","count":"buildingsOfCategories","categories":["science","faith"]}` |
| **Machinery** | a road step at a fifth instead of a third | `{"kind":"rulePercent","rule":"roadStepCost","percent":-40}` |
| **Geomancy** (`prospecting`) | the seam under the mine (the mine's own renewal stays) | `{"kind":"tileYield","on":{"test":"all","of":[{"test":"improvement","improvement":"mine"},{"test":"hasResource"}]},"production":1,"faith":1}` |
| **The Golden Roads** (`theSilkRoad`) | a coin per good at either end (the caravan slot stays) | `{"kind":"routeYield","gold":1,"perEndpointLuxury":true}` |
| **Movable Type** | the cheer out, the presses in | two `{"kind":"percentYields","yield":…,"percent":10,"scope":{"test":"connected"}}` |
| **The Holy Office** | verified: `units: ["inquisitor"]`, the apostle is Theology's (C2) | — |
| **Divination** · **Chronology** | the faith ladder's door and the reroll's, named in the two nodes' own `note` prose | — |
| **Engineering** | **deliberately lean and not empty** — Aqueduct · Watermill · Circus Maximus | — |

Every re-gifted node's `note` is rewritten in plain words with no number in it,
and a test sweeps every `note` on the tree for a digit.

#### The two members, and what they cost

| member | where | why it is one member and not a shape |
|---|---|---|
| `CardRule`'s **`roadStepCost`** | `statecraftData.ts`, one word in `RULE_WORDS` | It is exactly what `settlerCost` and `unitUpkeep` are — a percentage on a constant the game already reads in one place, with the same sign convention (a negative percentage is a discount, so a third → a fifth is **−40**). A `roadStep` effect kind of its own would have wanted a `describeEffect` arm, a `statecraft.ts` reader and a fold-registry entry; `rulePercent` needed none of the three |
| `CardRouteYieldEffect`'s **`perEndpointLuxury`** | `statecraftData.ts`, carried through `cardRouteYieldLines`, folded in `routeYields.ts` | The thing counted is a fact about **the route**, and nothing else in the vocabulary can see both ends of one: `origin` is a `CityScope` asked of the town the caravan left, and there is deliberately no `destination` twin, because a scope answers about one town |

**Two members the batch expected to add and did not**: the `greatWork` tile test
and the `connected` city condition **already existed** (`TileCondition`'s
`greatWork` reads `ImprovementDef.greatPerson`; `CityScope`'s `connected` is what
Satrapies' cheer was scoped on). The brief's "one `statecraftData.ts` member you
may add" was spent on the road rule instead.

#### The road rule, exactly

- **`MOVEMENT_DENOMINATOR` is 15**, not 3 — the least common multiple of the two
  road fractions, so a third is five fifteenths and a fifth is three and both are
  exact. Nothing older moved: IEEE division is correctly rounded, so `5k / 15`
  and `k / 3` are the *same double* for every integer `k`, and every figure a
  pre-batch save holds still snaps to itself.
- **The price is an empire fact, folded once per sweep**: `MoveProfile.roadStep`,
  written only by `moveProfile` off
  `foldCardRulePercent(cardRulePercent(state, ownerId, 'roadStepCost'))` and
  snapped, clamped at one fifteenth so no edge is free.
- **Read in exactly two places** and no fifth reader prices a road anywhere:
  `stepCost` (`mover?.roadStep ?? roadStepCost`) and `cheapestStepCostFor`, which
  is A*'s heuristic floor — an empire with a cheaper edge than the constant would
  otherwise have made the estimate inadmissible and `findPath` would have stopped
  returning the cheapest route over exactly the ground it paved. `findPath`,
  `reachableTiles`, `advanceAlongPath` and `pathTurns` inherit it by
  construction, and `trade.test.ts` pins all four against one board.
- **Absent means the base**, which is a real answer: a caller with no mover is
  asking the ground's own price, and `layFoundingRoad`'s hand-built probe — which
  chooses where a *decreed* road goes over ground that has none yet — is
  deliberately left on it, because a Machinery empire's founding roads taking a
  different route is a behaviour change nothing ruled.

#### Pageants, and the door `projectData.ts` left open

`ProjectPayout` gained `culture`, and `payProject` pays it by calling
`settleCultureWindfall` — which is the sentence that docblock already wrote (*"the
day a culture project is wanted, it joins by calling that wrapper — never by
adding a field here and hoping"*). So the basket has no second filler, only one
more caller of its one settler. `PROJECT_GLYPHS`/`PROJECT_SPOKEN` are typed
`Record<keyof ProjectPayout, …>`, so the fourth bank was a compile error in the
two UI tables until it had a mark — which is what that typing exists for.

#### The bot

`chain.ts` needed **no edit**: `techChain` already sends `techDef(goal).effects`
through `explainEffects`, so a node's gift is priced by the same evaluator a card's
is. What moved is `value.ts`, two arms:

- **`rulePercent`**, and deliberately for one rule only. The road fraction is a
  discount on a *march* rather than on a town's books, priced as
  `(−percent/100) × weights.military × unitsInField`; every other `CardRule`
  returns `score.unknownEffect`, exactly as it did, so no existing appraisal moved
  by a point.
- **`routeYield`** now multiplies its bag by `uniqueLuxuries` when the row is
  `perEndpointLuxury` — the realm's own shelf as the stand-in for what the two
  ends of a road hold.

The acceptance is a **source-reading register** in `aiAppraisal.test.ts`: it reads
`scoreEffect`'s own `case` labels out of `src/ai/value.ts` and asserts every
effect kind on every re-gifted node has an arm. Arithmetic could not have asked
this — a percentage shape is *deliberately* priced against
`unknownEffect × nominalCount` (that is what "a nominal yield" means here), and
the flat shapes price in the same small integers the stand-in is written in, so
any number the test picked could have collided by luck.

#### The pacing figures, measured and NOT re-aimed

Per the plan the harnesses are re-aimed **once**, after D and E together, and that
move is the user's dated one — so the three slow fixtures are **red** on this
branch and these are the measurements for it. **Batch X's exact yields landed
under this batch**, and they dominate: D's own figures were taken before the
floors came out of the folds.

Every row measured twice on the same tree — once as shipped, once with
`data/techs.json` and `data/buildings.json` restored to their pre-E state — so
E's own contribution is separated from X's.

`tech.slow` (seed 4242, standard, five towns, 900 turns) — the four ages' closing
turns:

| | Æra I | Æra II | Æra III | Æra IV | techs at t900 |
|---|---|---|---|---|---|
| before batch D (the last green run) | 66 | 120 | 366 | 779 | 50 of 50 |
| **all of batch D** (D's own doc) | 236 | 347 | — | — | 34 |
| **X, without E's rows** | **80** | **157** | **487** | — | 45 |
| **X + E, as shipped** | **80** | **156** | **481** | — | **47** |
| the bands as written | 56–76 | 105–135 | 341–391 | 749–809 | — |

`statecraftPacing.slow` (the same empire, 400 turns) — **identical with and
without E**, to the turn: first eight drafts **13 · 22 · 31 · 40 · 53 · 61 · 68 ·
78**, early cadence **9.29** (band 5–13, green), government tiers **40 / 95 /
275** against a first-tier band of 46–68 (**red by six turns**).

`endgame.slow` (the one-city seat, 1900 turns) — **identical with and without E**:
the Opus **never opens**, the seat holding **40 of 50** technologies at the
horizon against opening on t1689 when the fixture was last aimed.

**What the figures say.** X's exact yields recovered nearly all of D's science
loss on the five-town harness (Æra I 236 → 80, against a pre-D 66) and E adds
almost nothing to it — six turns off Æra III and two more technologies at the
horizon. That is the honest reading rather than a disappointment: this harness's
scripted queue never raises a wonder, never builds the Water Clock and never runs
a caravan, so **three of E's ten gifts cannot fire in it at all** and two more
(the writ, the great-person works) pay a town this empire does not shape. The
gifts that would show up in a played game are exactly the ones a script cannot
reach. The one-city seat is untouched for the same reason and more strongly: a
single town with no caravan and no wonder receives nothing this batch hands out.

#### Judgement calls and debts

- **Irrigation was left alone, and that is a deliberate departure from §7's
  table.** The ruled gift is *"farms beside fresh water +1🌾, a `tileYield`,
  Raised Fields' shape"* — and that line **already stands**, as the farm's own
  renewal (`data/improvements.json`, `upgrades[].tech: irrigation`,
  `requiresFreshwater`), which is what §2's own "today" column says the node
  gives. Building it a second time as a card effect would pay **two** food;
  converting it would delete the only live demonstration of `requiresFreshwater`
  in the improvement vocabulary and re-aim a whole `describe` block that exists to
  test the renewal hook. So the node keeps its gift in the shape it has, its
  `note` says so in plain words, and the doc prints it. **If the user wants the
  conversion anyway** it is two edits: drop `improvements.json`'s `farm.upgrades`
  and add the `all` of `{improvement: farm}` and `{freshwater}` to the node — both
  tile tests already exist.
- **The Water Clock keeps its `projectRider`.** "Reworked" was read as *the
  deferred chime is finally built* rather than *the row is emptied*: the rider is
  the only live row using `projectRider`, and a shape declared with no reader
  fails the register test. Its `deferred` line is gone, because the thing it was
  waiting for is now on the row.
- **`routeRider` is still unpriced by the bot** — an extra caravan *slot* wants
  the marginal reading batch F2 builds, so it prices at the stand-in. Written into
  the register test as a named debt rather than swept under it.
- **The endpoint-luxury count is the union of the two towns' luxuries**, once
  each: wine at both ends of a road is one wine. That is the literal reading of
  *"in the origin or destination city"* and the one that cannot be farmed by
  pointing a caravan at a mirror of its own hinterland. The alternative (summing
  the two lists, which is what the luxury *signatures* do) is one line away if the
  user prefers it.
- **`layFoundingRoad`'s probe is on the base road price**, not the empire's — see
  the road rule above. A Machinery empire's decreed roads take the same route they
  took before, which is a behaviour nothing ruled either way.
- **`CLAUDE.md`'s movement trap line is stale**: it says *"A road step (both hexes
  paved) costs exact thirds inside `stepCost`"*. It is now exact fifteenths, and
  the price is a `MoveProfile` fact. One line, and it is the orchestrator's file.
- **Three edits outside the stated fence, each forced and each minimal.**
  `src/sim/cities.ts` — six lines in `payProject` for the culture basket (batch X
  was live in that file). `src/sim/projectData.ts` and `src/ui/figures.ts` — the
  `culture` payout and its two marks, without which the project cannot exist.
  `src/sim/resourceEffects.ts` — `endpointLuxuryCount`, which lives there rather
  than in `routeYields.ts` because that module's leaf rule forbids it importing
  `cities.ts` directly and it already reaches the city scale through this one.
- **`statecraft.ts` took four edits, not two.** The two describer words the brief
  budgeted were not needed (both members already existed), and what landed instead
  is: one `RULE_WORDS` entry, one clause on the `routeYield` describer, one word
  in `cardProjectPays`' voice list, and the `perEndpointLuxury` passthrough in
  `cardRouteYieldLines` (which also gained a named `CardRouteLine` interface, since
  the inline type was written out twice).
- **Batch A's byte-identity test is spent and became a register.**
  `statecraft.test.ts`'s *"no live row uses a shape this batch declared"* now lists
  exactly which rows use which shape — the deck still uses none of them, and the
  ten that do are named. A row that quietly picks one up fails there.
- **Two of X's files do not typecheck** (`test/ui/figures.test.ts`'s unused import;
  `exactYields.test.ts` and `yieldPrinters.test.ts` import `node:fs`, which this
  project has no typings for — `seatRoster.test.ts`'s `import.meta.glob('…?raw')`
  is the idiom). Not this batch's, reported and left.

Files: `data/techs.json` · `data/buildings.json` (the three projects, the Water
Clock) · `src/sim/statecraftData.ts` · `statecraft.ts` · `pathfind.ts` ·
`rulesData.ts` · `routeYields.ts` · `resourceEffects.ts` · `projectData.ts` ·
`cities.ts` (`payProject`) · `state.ts` (schema 76) · `src/ui/figures.ts` ·
`src/ai/value.ts` · `docs/tech-tree.md` (Part 2 regenerated). Tests:
`tech.test.ts` (a new batch-E block of twelve), `trade.test.ts` (the road at a
fifth across the four readers; the endpoint-luxury coin), `buildSinks.test.ts`
(Pageants' basket and its rate), `statecraft.test.ts` (the shape register; Movable
Type's two shares off the `connected` scope), `aiAppraisal.test.ts` (the
source-reading register, Machinery's price, the Golden Roads' goods),
`cityProjects.test.ts` (the fourth bank), and the eleven schema pins.

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
| ~~it holds the door~~ | **withdrawn the same day** — the Chapel was never meant to gate the verb (the user: "have the rites unlock in the tech tree where they used to be"); the tree is the only gate and `ritesDoor` is gone. Nothing in `src/sim/` names a chapel |
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

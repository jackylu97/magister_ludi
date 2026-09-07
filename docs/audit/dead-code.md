# Dead code — what is not built, what is deprecated, what nothing reads

A read-only audit of `magister_ludi` at `SCHEMA_VERSION = 78` (2026-09-06).
Scope: declared-never-built, long-deprecated, and unread. Bonus correctness and
simplification are two other audits and are deliberately not touched here.

Method: greps and reads, plus four throwaway scripts (union members × data rows,
exported symbols × importers, JSON leaf keys × code, CSS classes × markup). One
`npx tsc --noEmit -p .` — **exit 0, the tree typechecks clean**. No test run.

**Headline counts**

| | count |
|---|---|
| `deferred` data rows (declared, waiting on a shape) | **70** |
| `awaitsTech` rows (declared, waiting on an age) | **6** |
| union members / effect shapes with **zero** live rows | **19** |
| live draftable cards whose `effects` are `[]` | **6** |
| `retired: true` rows kept for a replay that cannot happen | **62** (≈1288 JSON lines) |
| exported functions/consts **nothing** reads | **33** (≈230 lines) |
| dead data keys | **3** |
| dead CSS classes | **4** |
| working docs already folded into code | **15** (6350 lines) |
| doc/comment statements now false | **9** |

---

## 1 · Unbuilt — declared and never built

### 1.1 `deferred` rows, by the shape they wait on

70 rows across nine data files carry `deferred` prose. Grouped by the engine
shape each one needs, the picture is that **five missing shapes account for
most of the table**.

| shape the rows wait on | rows | examples (`file:line`) | verdict |
|---|---|---|---|
| **a bead boon vocabulary** (the dice went at v71; seven quest boons were dice) | 9 | `data/beads.json:271,293,412,428,482,574,591,688,704` | **cut the dice prose, keep the rows.** Seven of the nine say only *"A die of the Magister — the dice are gone"*. That is a changelog note living in player-facing `deferred` text. Rewrite each to name the boon it actually wants, or drop the row. |
| **a unit-kind selector on a production/strength bonus** (ships, siege, mounted) | 6 | `data/buildings.json:1538` (Shipyard), `data/greatPeople.json:1602` (Yi Sun-sin), `data/statecraft.json:5485` (Admiralty), `:5340` (The Siege Train), `data/units.json` naval `awaitsTech` block | **build one shape**: `CardProductionBonusEffect`/`CardCombatLineEffect` already carry a category; a `unitKind` selector would light six rows and the four `awaitsTech` hulls at once. |
| **a rule that asks a city what it is keeping** (a rite, a religion) | 3 | `data/religion.json:496` (The Vigil), `:1096` (Blessing of Arms), `data/statecraft.json:397` (The Curia, +3 faith per Cathedral) | **build**: `liveCityEffects` already resolves live rites per city; the missing half is a `TileCondition`/`EmpireCondition`-style *city* condition. |
| **a route that can pay its destination** | 4 | `data/buildings.json:984` (Printing House, also retired), `:1978` (Bank), `data/statecraft.json:5559` (The Silk Exchange), `:4923` (The Escorted Roads) | **defer, keep the prose.** `routeYield`/`routeRider` exist; "which routes *end* here" is a genuine new count. |
| **a one-time grant sized by the thing that earned it** | 4 | `data/techs.json:326` (Epic Poetry), `:379` (Code of Laws / King List), `:701` (Satrapies), `:1039` (Castellany) | **defer.** Entry XVIII.5 forbids a modifier on a one-time grant by construction; these want a *scaled base*, which is a design ruling, not a shape. |
| singletons (each its own missing shape) | 44 | `data/improvements.json:324` (Floating Gardens — nothing may stand on a lake), `data/resources.json:763` (Ivory — no war elephant), `data/buildings.json:2091` (Cistern — city-water vs hex-water), `data/statecraft.json:5176` (The Guild Compact), `:1554` (The Closed Realm) | **keep as deferred rows with prose.** This is the rule working: the row prints "— not built yet" (`statecraft.ts:6237`) and nothing is bent. |

Three `deferred` strings in `data/triumphs.json` are **stale, not deferred**:

| row | `file:line` | its claim | reality |
|---|---|---|---|
| The Long Road | `data/triumphs.json:148` | *"there are no roads and no connections yet"* | roads shipped (`src/sim/roads.ts`, `Tile.road`), connections are a line of `explainEmpireGold` |
| The First Keel | `data/triumphs.json:184` | *"there are no naval units; Sailing embarks civilians only"* | four hulls exist in `data/units.json` behind `awaitsTech`; `militaryEmbark` and `oceanGoing` are live abilities |
| The Fallen Become Verse | `data/triumphs.json:136` | *"combat carries no memory of the exchange"* | true — `WindfallOccasion.death` fires but carries no piece identity |

Verdict: **The Long Road is buildable today** — `CountKind.roadHexes` and the
connection line both exist. The First Keel is buildable the moment the four
hulls lose `awaitsTech`. Only the third is honestly deferred.

### 1.2 `awaitsTech` rows — declared ahead of the age

| row | `file` | waits on |
|---|---|---|
| Bastion | `data/buildings.json` | an Æra V node (`src/sim/techData.ts:348`) |
| Hall of Deeds | `data/buildings.json` | an Æra V node |
| Corvette · Ship of the Line · Frigate | `data/units.json` | naval age (`src/sim/unitData.ts:820`) |
| Cataphract | `data/units.json` | — |

`awaitsTech` is a boolean, not a tech id, and is read in four places
(`src/ui/cityPanel.ts:2401,2493,2527`, `src/ui/compendium.ts:529`,
`src/sim/purchase.ts:535`, `src/sim/beadData.ts:594`). **Keep** — the marker is
temporary by construction and the docblocks say so.

### 1.3 Union members with live machinery and **no live row**

Walked every member against `data/*.json` (comment-stripped code corpus for the
reader count). 19 members have an evaluator arm and zero rows.

| union | member | live rows | reader | verdict |
|---|---|---|---|---|
| `CountKind` | `luxuryCopies` | 0 | `statecraft.ts:2561` | **keep** — `uniqueLuxuries`/`duplicateLuxuries` are its siblings and it is one `case` |
| `CountKind` | `garrisonWatch` | 0 | `statecraft.ts:2612`, register `:3197` | **keep** — pinned by the register test |
| `CountKind` | `workedHills` | 0 | `statecraft.ts:2624`, register `:3198` | **keep** — pinned |
| `CountKind` | `visibleCamps` | 0 | `statecraft.ts:2637` | **keep** — cheap, and the Wild Frontier sheet wants it |
| `CountKind` | `chargedAugurs` | 0 | `statecraft.ts:2644`, register `:3199` | **CUT.** The augur is retired (`data/units.json:622`); the count can never be non-zero. Delete the member, the arm and the register row. |
| `EmpireCondition` | `cityCountAtLeast` | 0 | `statecraft.ts:2093`, `:7246` | **keep** — `cityCountAtMost`'s mirror, one arm |
| `CardRule` | `borderCost` | 0 card rows | `cities.ts:3490,3491,5912`; also a `ResourceRule` (`resourceData.ts:177`) with 0 rows | **keep** — the fold is shared with the resource side |
| `WindfallOccasion` | `completion` | 0 | fired at `cities.ts:5456` | **keep** — it is the generic arm `unitCompletion`/`buildingCompletion` specialise |
| `WindfallOccasion` | `pillageTrader` | 0 | fired at `trade.ts:1028` | **keep** — the seam exists; a card is a JSON row |
| `ActionRuleId` | `unitJumpsQueue` | 0 | `statecraft.ts` | **keep** (one arm) |
| `ActionRuleId` | `barbariansPassive` | 0 | `statecraft.ts` | **keep** |
| `ActionRuleId` | `noCampClearing` | 0 | `statecraft.ts` | **keep** |
| `ActionRuleId` | `noHealAbroad` | 0 | `statecraft.ts` | **keep** |
| luxury `ResourceEffect` | `perPopulationYields` | 0 | `resourceEffects.ts` | **keep** — `docs/luxuries.md` is the reference and calls it a shape |
| luxury `ResourceEffect` | `authoritySupply` | 0 | `resourceEffects.ts` | **keep** |
| luxury `ResourceEffect` | `percentYields` | 0 | `resourceEffects.ts` | **keep** |
| luxury `ResourceEffect` | `happinessTierBoost` | 0 | `resourceEffects.ts` | **keep** |
| `OrderSlotGrant` / `OrderDef.onSlot` | — | **0** | `statecraft.ts:430,506,8589-8590`; `statecraftData.ts:3552,3591` | **keep, flagged.** Batch C1's "live machinery with no live row" still holds for this one alone. `PlayerStatecraft.grantedOnSlot` is a persisted array (`:506`) written by an arm nothing can reach; `test/sim/statecraft.test.ts:2271,2290` pins it as a shape. It is a schema field for a card that does not exist. |
| `BeliefOffer.givenBack` | — | **no writer** | read at `src/main.ts:2515,2521,2522`; propagated (never set) at `religion.ts:592`; typed at `religionData.ts:203`; documented at `state.ts:402` | **CUT.** Grepped the whole tree: no assignment anywhere except the copy-forward of a value that is always `undefined`. Two player-facing sentences in `main.ts` are unreachable. |

Batch C1's other two names are **no longer true**: `projectRider` has a live row
(`data/buildings.json:1292`) and `foundingRider` has six
(`data/greatPeople.json:1513`, `data/religion.json:1026`, `data/techs.json:696`,
`data/statecraft.json:668,2126,3417`).

### 1.4 The three purchases no surface offers — the biggest unbuilt thing

`Command` member `purchaseGreatPersonOffer` is fully implemented in the sim
(`src/sim/commands.ts:1267,3519,4118,4292`;
`purchaseGreatPersonOfferAt`/`OFFER_PURCHASES` at `src/sim/greatPeople.ts:337-406`),
three live data rows open it, and **no file under `src/ui/` or `src/main.ts`
ever constructs it**. `OfferPurchaseId`, `greatPersonOfferPrice` and
`greatPersonOfferError` have zero UI callers.

| card | `file:line` | clause | reachable? |
|---|---|---|---|
| The Commonwealth (Gov tier 45) | `data/statecraft.json:422` | `buyGreatPersonWithGold` | **no** |
| The Magisterium (Gov tier 45) | `data/statecraft.json:494` | `buyGreatPersonWithFaith` | **no** |
| The Academy (Doctrine, tier 29) | `data/statecraft.json:1083` | `buyScholarDraftWithFaith` | **no** |

Verdict: **build the button** (one control on the great-person ceremony), or
mark all three `deferred`. Today a player adopting a tier-45 government gets a
government whose signature clause is inert. CLAUDE.md's Great-people trap line
("The Academy's scholar draft goes through `OFFER_PURCHASES`") describes sim
machinery, not a playable verb.

### 1.5 Live cards that do nothing

Six rows are draftable (`retired` absent), carry `effects: []`, and are
`deferred`. `livePool` (`statecraft.ts:696`) filters on `retired` only, so these
**are dealt**; the describer prints one clause, "*<text>* — not built yet"
(`statecraft.ts:6237-6238`).

| row | `file` | pool |
|---|---|---|
| The Great Enquiry | `data/statecraft.json` | Government V |
| The Last Laurels | `data/statecraft.json` | Government V |
| The Salted Earth | `data/statecraft.json` | Government V |
| The Final Proclamation | `data/statecraft.json` | Government V |
| Religious Mandate | `data/statecraft.json` | Doctrine pool |
| The Closed Realm | `data/statecraft.json` | Doctrine pool |

The four Government V rows are the Æra V bead Orders and all four wait on the
same shape ("a bead of your own, while this Order stands in a slot") — one
`CardEffect` arm, `beadPerOccasion`, would light all four.

Verdict: **build the bead-per-occasion shape** (the four are one shape) and
**mark Religious Mandate and The Closed Realm `retired`** until their shapes
exist — a blank card in a draft of three is a wasted hand.

### 1.6 `PROPOSED` tables in docs

Exactly one: `docs/orders-and-doctrines.md:545`, *"Government VI pool — PROPOSED
(no rung exists yet) (10)"*. `data/statecraft.json` tops out at tier 45
(`theCommonwealth`, `theEmpire`, `theMagisterium`), and nothing in
`src/sim/statecraft.ts` reads a tier past it. The doc itself flags a name clash
(*The Encyclopaedists*, proposed here and also built in Government V).

Verdict: **keep the table, resolve the name clash now** — a duplicate name in a
future pool is a bug that will land silently.

### 1.7 The vein layer

Ruled **SHELVED 2026-09-06** (`docs/flags.md:537-543`, `docs/veins.md:1`), by
setting `data/mapgen.json:166` `veins.share = 0`. The code is entirely intact:

| piece | `file` | lines |
|---|---|---|
| the mapgen leaf | `src/sim/veins.ts` | 184 |
| the survey marks | `src/art/surveyMarks.ts` | 107 |
| the verb, spread across | `src/ui/controls.ts` (24 refs), `src/sim/improvements.ts` (20), `src/sim/commands.ts` (12), `src/sim/meters.ts` (12), `src/ui/unitPanel.ts` (12) | ≈128 references |
| the tests | `test/mapgen/veins.test.ts` (218) + `.slow.test.ts` (87) | 305 |
| the bot's stand-in | `data/ai.json` `workers.veinValue: 6`, read at `src/ai/plan.ts:386,387,395` | — |

Verdict: **keep all of it, delete nothing.** The shelving is a one-number change
and the doc says the drawer is open. What *is* dead weight: `workers.veinValue`
is a knob on the arena panel that can never move a score while `share` is 0, and
`data/statecraft.json`'s two `veinFound` rows are cards that can never fire.
Add a line to `docs/flags.md` saying so; do not cut.

---

## 2 · Deprecated — safe to delete now

### 2.1 The replay argument, answered honestly

`loadGame` and `restoreState` test **exact equality** on the schema
(`src/sim/game.ts:157`, `:190`) — not `>=`. `SCHEMA_VERSION = 78`
(`src/sim/state.ts:1556`). **No save written before this build loads at all.**

Retiring a row is itself a bump (the v52 precedent, `state.ts:809`: *"Curious
Elders and Triumphs retired… both leave the pool"*), because a row leaving a
pool changes every subsequent draw. So a row retired at bump *N* can only appear
in a save at schema *N−1* — already refused.

Therefore `retired: true` protects, in order of what is actually true:

1. **Tests.** `test/sim/statecraft.test.ts:311-316,1182-1196,2269-2320`,
   `test/sim/religion.test.ts:561-564,639,646`,
   `test/ui/religionV2.test.ts:827,903,930-931` all name withdrawn rows by id.
2. **Future saves.** A row retired *without* a bump (possible when the row was
   already unreachable) leaves a live save holding it; `anyCardDef` resolving is
   the guard.
3. **The Compendium's own sentence.** `src/ui/compendium.ts:1292` prints
   "Performed by — nobody — withdrawn" for a retired rite. That is a deliberate
   player-facing reading, not a leftover.
4. **Old saves — nothing.** This is the claim in most of the retirement
   docblocks and it is false today.

**Verdict**: the *marker* stays (readers at `statecraft.ts:691`,
`religion.ts:840,852,880,1054,1139`, `religionData.ts:518,677`,
`purchase.ts:548`, `tech.ts:581`, `beadData.ts:594`, `compendium.ts:1777`) —
it is the honest way to withdraw a row. The *bodies* do not.

| file | retired rows | ≈JSON lines | what a row still needs |
|---|---|---|---|
| `data/statecraft.json` | 49 | 1069 | `name` + `retired` + `note` |
| `data/buildings.json` | 10 | 179 | same |
| `data/religion.json` | 2 | 16 | same + the Compendium sentence |
| `data/units.json` | 1 (augur) | 24 | same, plus `modelClass` for a piece on an old board |

Cutting each retired row down to `{id, name, retired, note}` and dropping
`effects`, `epigram`, `flavor`, `deferred`, `rarity`, `slot`, `line` reclaims
**≈1000 JSON lines** with no reader loss — every live reader either skips the
row or asks only its name. **Do this against the register tests, in one pass.**

### 2.2 The schema changelog

`src/sim/state.ts:113-1555` is a **1443-line docblock** — 26 `v`-prefixed
entries plus the numbered milestones back to `3:` (`:118`). Entries v3 through
v77 describe migrations that cannot happen: `loadGame` refuses those saves.

Verdict: **move `:118`–`:1525` to `docs/design-history.md`, keep the header
(`:113-117`) and the v78 entry (`:1526-1555`).** −1408 lines from the sim's
largest-but-one file. Nothing reads a docblock; no test pins it.

### 2.3 The 2D renderers, `src/render/`

FROZEN per CLAUDE.md, 2375 lines, plus 1624 lines of test. They are **not dead**:

- `src/main.ts:61-63` imports `Renderer`, `loadSprites`, `createTileArtist`,
  and `createRenderer` (`:1653-1683`) still branches on `artMode()`
  (`:1583-1588`) — `?art=sprites` and `?art=flat` are live URL switches.
- `src/ui/controls.ts:312` imports `walkedPrefix` from `render/animation`.

Verdict: **keep the module; the `?art=` switch is a real dev surface.** But note
the cost: `render/tileVisuals.ts` alone is 701 lines of a pipeline whose art
direction is settled against. If the switch goes, `walkedPrefix` (145-line
`animation.ts`) is the one thing that must move to a leaf first.

**`src/proto3d/` is the real deprecation**: 2047 lines (9 TS + CSS + a 79-line
`proto3d.html`), a build input (`vite.config.ts:76`) that CLAUDE.md's "Eight
root pages" does not name — there are nine. It is the look-dev spike that
preceded `src/render3d/`, and `flair.html` + `pieces.html` have covered its job
since. Nothing under `src/` or `test/` imports it. Five of its own HTML ids are
orphaned (`proto3d.html`: `light-azimuth-value`, `light-elevation-value`,
`outline-value`, `ramp-value`, `saturation-value`).

Verdict: **delete `src/proto3d/`, `proto3d.html`, and the `vite.config.ts:76`
input line.** −2126 lines, zero risk, and CLAUDE.md's "eight pages" becomes true.

### 2.4 The dice

Gone at v71 (`docs/fewer-things.md` §1). What remains:

| leftover | `file:line` | verdict |
|---|---|---|
| `data/beads.json:4` `rules.startingDice: 2` | no reader in `src/` at all | **CUT** — a key the rules loader ignores |
| `data/ai.json` `weights.die: 60` | typed at `src/ai/aiConfig.ts:498`, read **nowhere** | **CUT** — and it currently ships as a live box on the arena panel (`KNOBS = knobsOf(AI)`, `src/arenaPage/panel.ts:58`), a dial that moves nothing |
| seven `deferred` strings in `data/beads.json` | `:412,428,482,574,591,689,706` | **rewrite** — see §1.1 |
| `data/statecraft.json:4197` note | The Auspicious Seal, retired | **keep** — an honest retirement note |
| `src/ui/beadsScreen.ts:748-749` | comment: *"The rod used to carry a line of dice"* | **keep** — a why-comment on an absence, the house style |

No `.bead-rod-dice` rule survives in `src/style.css` — that one was cleaned.

### 2.5 The augur

Retired 2026-09-06 (`data/units.json:612-635`), and the withdrawal is careful
and deliberate: `consecrateError` (`src/sim/religion.ts:270-297`) is documented
as a gate kept *so the arm is not deleted*, and `consecrateAt`
(`religion.ts:331`) is unreachable-by-design below it. **Keep both.**

What is *not* deliberate:

| leftover | `file:line` | verdict |
|---|---|---|
| `augurHasActed` | `src/sim/religion.ts:242-265` (24 lines) | **CUT** — exported, zero references in `src/` or `test/`. Named in CLAUDE.md's Religion trap; that line goes too. |
| `CountKind.chargedAugurs` | `statecraftData.ts:1021`, `statecraft.ts:2644`, `:3199` | **CUT** — see §1.3 |
| `def.consecrates` bot branch | `src/ai/wants.ts:642` `firstGod: def.consecrates === true` | dead branch: no live unit sets `consecrates`. **Leave to the bot audit.** |
| `.city-buildable-buy.is-offer` | `src/style.css:4277-4288` + its comment | still live — `src/ui/cityPanel.ts:2724` builds it for the prophet. **Keep, fix the comment** (it names the augur). |
| galleries | `pieces.html`, `flair.html` | **no augur entry exists.** Nothing to remove. |

### 2.6 Retired knob blocks in data

`data/mapgen.json:29-38` (8 keys) and `data/discoveries.json:2-5` (2 keys) are
`retired: Record<string,string>` blocks — a changelog-as-data convention typed at
`src/sim/mapgenData.ts:251` and `src/sim/discoveryData.ts:235`. Nothing reads
the values.

Verdict: **keep.** They are the only record of *why* a mapgen knob changed shape,
they cost 10 lines, and the docblock at `discoveryData.ts:231` names the
convention. `docs/mapgen.md` should cite them rather than repeat them.

---

## 3 · Unread — exports, knobs, keys, CSS, HTML

### 3.1 Exports nothing reads

Swept all 3202 `export function|const|class|interface|type|enum` declarations in
`src/` against every `.ts` in `src/` and `test/` (comments stripped). **33
functions/consts have exactly one occurrence in the whole tree — their own
declaration.** Types and interfaces are excluded (many are exported for the
docblock and used locally, which is fine).

| symbol | `file:line-line` | lines |
|---|---|---|
| `augurHasActed` | `src/sim/religion.ts:242-265` | 24 |
| `improvedCells` | `src/sim/improvements.ts:1485-1500` | 16 |
| `unitOnTile` | `src/sim/units.ts:73-87` | 15 |
| `placedBuildings` | `src/sim/buildingEffects.ts:151-164` | 14 |
| `medianTownProduction` | `src/ai/value.ts:454-466` | 13 |
| `yieldLabelNodes` | `src/ui/yieldMark.ts:292-302` | 11 |
| `dealsOf` | `src/sim/deals.ts:240-249` | 10 |
| `enemiesOf` | `src/sim/wars.ts:182-190` | 9 |
| `isHiddenFrom` | `src/sim/visibility.ts:190-197` | 8 |
| `dealById` | `src/sim/deals.ts:264-270` | 7 |
| `isDiscoveryKind` | `src/sim/discoveryData.ts:269-275` | 7 |
| `religionById` | `src/sim/state.ts:3062-3068` | 7 |
| `isTriumphId` | `src/sim/triumphData.ts:159-165` | 7 |
| `buildingUpkeepTotal` | `src/sim/upkeep.ts:333-338` | 6 |
| `METER_NAME` | `src/ui/figures.ts:128-132` | 5 |
| `warScore` | `src/ai/diplomacy.ts:228-231` | 4 |
| `campCells` | `src/sim/barbarians.ts:1128-1131` | 4 |
| `greatPersonOfferBank` | `src/sim/greatPeople.ts:403-406` | 4 |
| `hexLength` | `src/sim/hex.ts:98-101` | 4 |
| `tileAxial` | `src/sim/mapgen.ts:1130-1133` | 4 |
| `beliefsHeld` | `src/sim/religion.ts:172-175` | 4 |
| `liveTimedEffects` | `src/sim/religion.ts:1214-1217` | 4 |
| `anyCardName` | `src/sim/statecraft.ts:1191-1194` | 4 |
| `poolSizeOf` | `src/sim/statecraft.ts:8816-8819` | 4 |
| `missingPrereqs` | `src/sim/tech.ts:352-355` | 4 |
| `hasKeyword` | `src/ui/keywords.ts:105-108` | 4 |
| `hexEquals` / `hexSubtract` | `src/sim/hex.ts:47-49`, `:55-57` | 3 + 3 |
| `forEachTile` | `src/sim/map.ts:351-353` | 3 |
| `valueOfBuildingRow` / `valueOfProjectRow` | `src/ai/value.ts:1009-1011`, `:1034-1036` | 3 + 3 |
| `isOrderRarity` | `src/sim/statecraftData.ts:189-191` | 3 |
| `ORDER_RARITIES` | `src/sim/statecraftData.ts:186-187` | 2 |

≈230 lines. Verdict: **cut all except `hexEquals`/`hexSubtract`/`hexLength`**
(a complete hex-algebra leaf reads as a unit and the three are three lines each)
and `greatPersonOfferBank` (revive it with §1.4's button). `ORDER_RARITIES` and
`isOrderRarity` went dead when levels were axed at v63 — the rarity *weights*
(`rarityWeights` 4/2/1) are what survives.

Separately, 793 exported **types/interfaces** have no external importer. That is
mostly correct — a `*Spec` interface in `render3d/lookData.ts` is the schema of a
`data/view3d.json` block and is meant to be local. Not a finding.

### 3.2 Data keys

Every leaf key in `data/ai.json` (111), `data/rules.json` (169) and
`data/beads.json` (32) is named by code, **with one exception each way**:

| key | file | verdict |
|---|---|---|
| `rules.startingDice` | `data/beads.json:4` | **CUT** (§2.4) |
| `weights.die` | `data/ai.json` | **CUT** — typed `aiConfig.ts:498`, read nowhere |
| `palette.mere`, `.brook`, `.oxbloodDeep`, `.vellumDeep`, `.chartWash`, `.warRed` | `data/view3d.json` | six named colours no renderer names. `palette.raven` is test-only. **Keep** — a palette is a swatch book and `flair.html` shows it. |
| `retired.*` (8 keys) | `data/mapgen.json:29-38` | **keep** (§2.6) |
| `retired.*` (2 keys) | `data/discoveries.json:2-5` | **keep** |

`data/rules.json` is fully live — no dead keys at all.

### 3.3 CSS

`src/style.css` is 12731 lines and 914 distinct class names. 32 look unreferenced;
28 of those are built dynamically (`is-${key}`, `is-${tone}`, `is-${relation}`,
`is-${cls}`, `sc-slot-${type}`, `sc-group-${type}`, `city-banner-ring-${role}`)
or are named only in a comment recording their own absence
(`.is-replaced` at `:2130`, `.civ-yield-waiting` at `:8315` — both deliberate).

Genuinely dead:

| class | `src/style.css` | rules |
|---|---|---|
| `.card-stamp-figure.is-tick` + `@keyframes stamp-tick` | `:11936-11952`, `:12052` | 2 |
| `.city-specialist-pay` | `:3890-3894` | 1 |
| `.abacus-epigraph` | `:5592-5601` | 1 |
| `.unit-card-flavor` | `:6230-6236` | 1 |

≈35 lines. Verdict: **cut.** No `.rel-*` class is dead (the religion screen uses
all of them); no `augur`/`dice` selector survives — only comments.

The other stylesheets (`arenaPage` 551, `flairGallery` 655, `mapgenPage` 812,
`spectate` 422, `piecesGallery` 215) were not swept class-by-class; `proto3d`'s
175 go with §2.3.

### 3.4 HTML

Every `id` in `index.html` (150), `arena.html` (28), `mapgen.html` (34),
`spectate.html` (18), `abacus.html` (10), `pieces.html` (7), `flair.html` (2)
and `compendium.html` (1) is named by `src/`. **Nothing to cut** — this is the
cleanest surface in the repo.

`proto3d.html` has 5 orphaned ids of 18; the whole file goes at §2.3.

### 3.5 Test helpers

All 13 `test/**/*Helpers.ts` modules have ≥2 importers (2 to 13). The
"non-test module for a shared helper" rule is being followed. **No finding.**

Note for the orchestrator, not a finding: the working tree carries two
uncommitted scratch suites, `test/sim/zzMeasureScratch.test.ts` and
`test/sim/zzProbeScratch.test.ts`, which will run in the core tier if committed.

### 3.6 Commands with no issuing surface

| command | UI refs | AI refs | verdict |
|---|---|---|---|
| `purchaseGreatPersonOffer` | **0** | 0 | **unbuilt** — see §1.4 |
| `spawnUnit` | **0** | 0 | dev/test verb; 24 test refs. **Keep** — it is the test harness's placement primitive |
| `renameReligion` | 1 | 0 | live, untested |
| `healAdjacent` | 2 | 0 | live, untested |

Twenty-three of 59 commands have `ai=0` — a bot-coverage gap, not dead code, and
the bot audit's ground.

---

## 4 · Docs

### 4.1 Keep — current-state references

The 21 docs listed in `docs/README.md` plus `docs/bot-priorities.md` (2140
lines, "spec of record" per the head commit) and `docs/fewer-things-plan.md`
(1579, the live batch plan). No action.

### 4.2 Fold into history — proposals already built

15 working docs sit outside `docs/README.md`'s shelf, **6350 lines**. Each is a
proposal whose rulings are now code:

| doc | lines | status in its own header | verdict |
|---|---|---|---|
| `card-shapes.md` | 149 | *"BUILT 2026-09-04 (schema 61)"* | **fold** — it says so itself |
| `cards-pass-2.md` | 347 | folded at v68 | **fold** |
| `age-three.md` | 224 | folded at v70 | **fold** |
| `loop-review.md` | 224 | folded at v67 | **fold** |
| `doctrine-ideas.md` | 634 | brainstorm, 2026-09-03 | **fold** |
| `bot-audit.md` | 162 | superseded by `bot-priorities.md` | **fold** |
| `veins.md` | 243 | *"SHELVED (2026-09-06)"* | **move to `docs/deprecated/`** — the drawer is open, the doc is the drawer |
| `balance-turn.md` | 892 | MARKED UP, folded per `flags.md` | **fold after the batch closes** |
| `orders-pass-3.md` | 535 | MARKED UP 2026-09-06, folding now | keep until the batch closes |
| `tech-gifts.md` | 330 | folded at v76 | **fold** |
| `fewer-things.md` | 566 | folding now (v71-v78) | keep until the batch closes |
| `city-screen.md` | 281 | *"spec of record, ruled 2026-09-03"* | **promote** to `docs/README.md`'s shelf |
| `pamphlet.md` | 182 | *"spec of record, ruled 2026-09-03"* | **promote** |
| `bot-notes.md` | 2 | two user lines | **fold into `flags.md`** |
| `fewer-things-plan.md` | 1579 | live batch plan | keep |

`docs/deprecated/` already holds four superseded docs with a README pointing at
each master — the pattern exists; use it.

`docs/themes/` (18 sheets, 1125 lines) carries 31 `▢` blank cells and 22
*(planned)* entries. These are fill-in worksheets by construction
(`docs/themes/README.md`). **Keep, untouched.**

### 4.3 Statements that are now false

| statement | where | why it is false |
|---|---|---|
| *"No data row uses one yet — the rows are batches D through F"* | `src/sim/statecraftData.ts:3469-3472` | all seven batch-A shapes have live rows: `cardYieldAmplifier` 5, `buildingYieldPercent` 7, `slotPosition` 6, `periodic` 11, `periodShorten` 3, `cityRenownPercent` 1, `routeYield` 4 |
| *"Eight root pages, all named in `vite.config.ts` inputs"* | `CLAUDE.md:60` | there are **nine** inputs (`vite.config.ts:74-83`); `proto3d` is unnamed in the prose |
| *"One-charge prophet and augur; an augur's rite is its whole turn (`augurHasActed`)"* | `CLAUDE.md:245` | the augur is retired (`data/units.json:622`) and `augurHasActed` has no reader |
| *"`pressLump` (prophet/augur lumps…)"* | `CLAUDE.md:239` | no augur can press a lump |
| *"one-charge augur (consecrate OR one rite, the whole turn)"* | `docs/design-notes.md:106` | same |
| *"abilities head by their BEARER (the augur's rites stop hiding under 'Workers may…')"* | `docs/design-notes.md:209` | the bearer is gone; the rites are a city's verbs (`religion-v2.md:25` has this right) |
| *"there are no roads and no connections yet"* | `data/triumphs.json:148` | roads shipped; this is player-facing prose |
| *"there are no naval units; Sailing embarks civilians only"* | `data/triumphs.json:184` | four hulls exist behind `awaitsTech`; `militaryEmbark`/`oceanGoing` are live |
| the retirement docblocks' *"so a save that names one still resolves to a card"* | `src/sim/techData.ts:391`, `religionData.ts:157`, and the `state.ts` v-entries | true only for a same-schema save; no pre-78 save loads (`game.ts:157`) |

`docs/religion-v2.md:25` is **correct** on the augur (*"Retired (`UnitDef.retired`,
row kept for replay)"*) — only the replay clause is optimistic.

`docs/tech-tree.md`'s five `renewals:` lines (`:119,120,123,149,175`) are
**correct** — the v62 axe removed *card* renewals; improvement `upgrades` are
alive (`data/improvements.json` — farm/mine/pasture/plantation) and match the doc
row for row by name. Not a false statement.

---

## 5 · The ranked cut list — twenty deletions

Ordered by lines removed per unit of risk. "Pinned by" names the test that will
fail if the cut is wrong.

| # | cut | `file:line` | ≈lines | pinned by | risk |
|---|---|---|---|---|---|
| 1 | schema changelog v3–v77 → `design-history.md` | `src/sim/state.ts:118-1525` | 1408 | nothing (docblock) | **none** |
| 2 | retired Order/building bodies → `{id,name,retired,note}` | `data/statecraft.json` (49 rows, 1069), `data/buildings.json` (10 rows, 179) | ~1000 | `test/sim/statecraft.test.ts:311-320,1182-1196,2269-2320`; `test/sim/statecraftDocSync.test.ts` | low — every reader skips or asks the name |
| 3 | `src/proto3d/` + `proto3d.html` + input line | whole dir; `vite.config.ts:76` | 2126 | nothing imports it; `npm run build` | **none** |
| 4 | fold 9 built proposal docs into `design-history.md` / `deprecated/` | `docs/{card-shapes,cards-pass-2,age-three,loop-review,doctrine-ideas,bot-audit,tech-gifts,veins,bot-notes}.md` | 2115 | nothing | **none** |
| 5 | 30 exported symbols nothing reads | §3.1 table | 224 | `npx tsc --noEmit`; module cycle test `test/mapgen/moduleCycles.test.ts` | **none** |
| 6 | `CountKind.chargedAugurs` (member + arm + register row) | `statecraftData.ts:1021`, `statecraft.ts:2644`, `:3199` | 18 | `test/sim/statecraft.test.ts` register test | low — a register row moves with it |
| 7 | `BeliefOffer.givenBack` + its two unreachable sentences | `religionData.ts:203`, `religion.ts:592`, `main.ts:2510-2523`, `state.ts:402` | 22 | `test/sim/religion.test.ts`; `test/ui/religionV2.test.ts` | low |
| 8 | `augurHasActed` | `src/sim/religion.ts:242-265` | 24 | none | **none** |
| 9 | `weights.die` knob + its type | `data/ai.json`, `src/ai/aiConfig.ts:498` | 4 | arena panel walks the sheet (`src/arenaPage/panel.ts:58`) — a knob leaving is a panel row leaving, by design | low |
| 10 | `rules.startingDice` | `data/beads.json:4` | 1 | `test/sim/beads.test.ts:210,642` (assert its absence — read them first) | low |
| 11 | four dead CSS rules | `src/style.css:3890,5592,6230,11936-11952,12052` | 35 | none | **none** |
| 12 | rewrite 7 dice `deferred` strings to name real boons | `data/beads.json:412,428,482,574,591,689,706` | 0 net | compendium prose sweep (`[[` sweep) | low — player-facing text |
| 13 | `data/triumphs.json` stale deferreds; build The Long Road | `:148`, `:184` | 0 net | `test/sim/triumphs.test.ts` | low |
| 14 | mark Religious Mandate + The Closed Realm `retired` | `data/statecraft.json` | 0 net | `test/sim/statecraft.test.ts` pool tests; `statecraftDocSync` | low — pool sizes move, which is a schema bump |
| 15 | CLAUDE.md trap lines that name removed things | `CLAUDE.md:60,239,245` | 3 | nothing | **none** |
| 16 | `docs/design-notes.md` augur lines | `:106,209` | 2 | nothing | **none** |
| 17 | the batch-A "no data row uses one yet" comment | `src/sim/statecraftData.ts:3469-3472` | 4 | nothing | **none** |
| 18 | promote `city-screen.md` + `pamphlet.md` to the shelf | `docs/README.md` | +2 | nothing | **none** |
| 19 | resolve the *Encyclopaedists* name clash | `docs/orders-and-doctrines.md:545-560` | 0 | `statecraftDocSync` when the pool lands | low |
| 20 | `data/view3d.json` six unnamed palette colours | `palette.{mere,brook,oxbloodDeep,vellumDeep,chartWash,warRed}` | 6 | `test/render/lookData.test.ts` | low — **or keep**; a palette is a swatch book |

**Totals if 1–11 land: ≈6977 lines removed**, of which 3523 are dead
documentation inside source files, 1000 are JSON row bodies, 2126 are a
superseded prototype page, and 328 are unreachable code.

### What is deliberately *not* on the list

- `src/render/` — still reachable via `?art=sprites|flat` (`src/main.ts:1583`).
- `src/sim/veins.ts` and the `prospect` verb — shelved by a one-number ruling.
- `consecrateError` / `consecrateAt` — a documented, deliberate unreachable arm.
- The `retired: {}` blocks in `data/mapgen.json` / `data/discoveries.json` —
  changelog-as-data, 10 lines, the only record of why a knob changed shape.
- The 793 exported types with no external importer — a `*Spec` interface is the
  schema of a data block and belongs beside it.
- Zero-row union members with a live evaluator arm — one `case` each, all pinned
  by register tests, and a card is a JSON row away. Only `chargedAugurs` (whose
  subject no longer exists) is cut.

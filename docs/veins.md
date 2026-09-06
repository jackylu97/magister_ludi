# Veins — the hills' hidden layer, marked, and the rare minerals (2026-09-06)

The ruling (`docs/fewer-things.md` §6 item 12, the user): *"Mark them. Let's
have unique luxuries that can possibly be hidden in them that give powerful
bonuses. Start a doc with all of the vein mechanics and some proposed new
luxuries (rare minerals, like obsidian, mercury, etc.)"* — after the first
playthrough's *"I couldn't notice where the surveyable mines were in my
territory."*

Spec of record for the layer as built: `docs/themes/11-the-cartographers.md`
(ratified 2026-09-02) and `src/sim/veins.ts`'s docblock. This doc is the
current state, one finding, and a proposal for markup. **Nothing under `data/`
or `src/` moves until §7 is marked.**

---

## 1. The layer as it stands

### Placement — mapgen pass 8, the last pass

| Fact | Where | Detail |
|---|---|---|
| when | `placeVeins`, pass 8 after ruins | every draw is invisible to the passes before it, so a seed's terrain, features, rivers, resources and ruins are bit-identical to what they were before veins existed |
| where | every hill with no surface resource, that a buried row *could* legally sit on (`veinFitsTile`: terrain · feature · hills — the generator's own three questions) | a struck hill is a hill mapgen could have produced; `chopErrorAt` already refuses to strip a revealed seam's ground |
| how many | one roll per eligible hill against `veins.share` | **0.33** — a third of the bare hills |
| which | a second, independent draw from `veins.kinds` by weight | the split matters: the share roll and the kind roll are two draws, so retuning one never moves the other |
| written | `Tile.vein: ResourceId` (mutable tile field #5), read by **the survey only** | `test/mapgen/veins.test.ts` reads the sources and holds the reader list at `veins.ts` + `improvements.ts` |
| RNG | `state.rng` under the gameplay separator | the separator string is never renamed; a new sub-pass takes a new sub-key |

The kinds sheet (`data/mapgen.json` → `veins.kinds`):

| row | weight | share of veins | what it is |
|---|---|---|---|
| `richOre` | 62 | 62% | a `buried`-marker bonus row: +2⚒ +1💰 on the hill, worked by the mine; never on the surface (`frequency` 0) |
| `iron` | 26 | 26% | a buried copy of the strategic — map-luck insurance for the sword line |
| `gems` | 5 | 5% | a deep luxury |
| `silver` | 4 | 4% | a deep luxury (`perCopy` in Æra III+) |
| `gold` | 3 | 3% | a deep luxury (`perCopy`) |

Measured on the standard map, six seats, four seeds (this doc's own script,
deleted after):

| seed | hills | bare hills | veins | rich ore | iron | gems · silver · gold |
|---|---|---|---|---|---|---|
| 5 | 669 | 549 | 199 | 156 | 31 | 2 · 8 · 2 |
| 777 | 674 | 550 | 193 | 148 | 24 | 8 · 8 · 5 |
| 20260831 | 675 | 553 | 169 | 123 | 33 | 4 · 7 · 2 |
| 20260904 | 681 | 564 | 175 | 135 | 26 | 4 · 2 · 8 |

So a standard board hides **170–200 seams** — about thirty per seat — of
which a dozen are luxuries. `test/mapgen/veins.slow.test.ts` pins the share,
the lean toward common rows, and "never on the surface", across seeds and
sizes.

### The survey — `prospect`, a worker or scout verb

| Fact | Detail |
|---|---|
| who | a builder or an explorer standing on the hill (`prospectError`) |
| gate | **the technology `prospect.tech` = `prospecting`** — the node named **Geomancy**: Æra IV, column cost 1450, prerequisites Daughter Cities and Horology |
| cost | the unit's whole turn (`movesLeft = 0`); **no charge is spent** |
| what it does (`prospectAt`) | if a seam sleeps there, it **surfaces**: `tile.resource = tile.vein` (the ordinary reveal flow then governs who can *see* it — iron stays veiled until Bronze Panoply, gems until their reveal); `vein` is deleted; `surveyed = true` (a barren hill is marked surveyed too) |
| what it pays | the **assay**, `improvements.assayGold` **15💰** to the nearest owned city (a windfall on the `prospect` occasion, riders composed); on a strike, the **`veinFound` occasion** fires as well (base nothing — a card names the figure) |
| the interface | once an empire holds Geomancy, a Survey row on a hill with nothing under it is greyed "Nothing sleeps under this hill" (`barrenHillError`) — the reducer still accepts the survey; the sentence is the interface's |
| the bot | prospects only inside its own territory; a sleeping seam is priced at `workers.veinValue` a turn as a stand-in (`src/ai/plan.ts`) |

### The marks — already built, at Æra IV

`seatSeesSleepingVein(state, seat, tile)` (`improvements.ts`) answers *is there
a question here*: a seam is there · nobody has asked · it is a hill · **the
empire holds Geomancy**. The board plants a **survey note** (`sleepingVein`,
`src/art/surveyMarks.ts`, the only mark in that set) on the hex's shoulder
opposite the ruin pin, on any hex the seat has ever charted (the improvement
fog rule, `sites3d.ts`; `test/render/fog3d.test.ts` audits). It says *where*,
never *which*.

### The finding

**The user could not see the seams because the marks and the survey both
wait for Geomancy, an Æra IV node** (1450🔬; the turn-92 empire was in Æra
III). The theme ratified Prospecting as an **Æra III** node; the tree pass of
2026-08-30 placed it in IV and the lanes are the user's chart. Meanwhile the
layer holds thirty seams a seat from turn one, a third of them iron the sword
line wants in Æra II. The whole layer is late by an age, and the marks with
it.

---

## 2. Marking — the ruled half

The ruling is "mark them". The mark exists; the question is **when**, and the
answer changes the survey's gate with it, because a mark on a hill nobody may
yet survey is a promise the sheet cannot keep for an age.

| Option | The marks appear | The survey opens | Geomancy keeps | Reading |
|---|---|---|---|---|
| **A — the layer opens with Mining** | Mining (Æra I): every charted hill with a seam wears the note | Mining: a worker may survey; a **shallow** seam (rich ore, iron) comes up; a **deep** one (the luxuries, the minerals) resists — "the ground is harder than your tools" — until Geomancy | the deep layer: deep seams may be struck, mines +1⚒, the minerals' reveal | the layer is playable from the opening and Geomancy is still a real gift — the *second* half, which is what its name says |
| B — an Æra III node | at Engineering (Æra III), the theme's placement | same node | as today | honest to the theme; still invisible for two ages |
| C — marks early, survey late | Mining | Geomancy | as today | marks that cannot be acted on for three ages — the promise problem above |

**Recommended: A.** Two marks instead of one — `sleepingVein` (shallow) and a
second, **deeper** mark for a seam Geomancy is needed for — so the mark
itself answers the user's §6 question ("should the mark hint at richness"):
a deep mark *is* the hint, and it is the mineral lottery's tell. What it
never says is the row.

Rules the build keeps:

- **Rendering never touches sim randomness**: the mark is a per-seat derived
  reading off `Tile.vein` and the seat's techs (`seatSeesSleepingVein` grows
  a depth answer), planted off `BuiltBoard`'s cells the way gated-resource
  props are veiled per seat by `RevealView`.
- **Fog**: on charted hexes only (the improvement rule), never under
  unexplored vellum.
- **Determinism**: a seam's depth is a fact of its *row* (`ResourceDef.depth`
  — one field, `shallow | deep`, read by `prospectError` and by the mark),
  not of the hill; nothing new is rolled.
- **Saves**: `Tile.vein` already holds the row id; `surveyed` is unchanged;
  the gate moves from one tech to a depth test — **schema** (an old log's
  surveys replay under the old gate).
- The bot's `veinValue` stand-in becomes two numbers, one per depth, and the
  territory clause stands.

---

## 3. The rare minerals — hidden luxuries

The ruling: unique luxuries that appear **only in veins**, with **powerful**
bonuses — build-arounds. Every signature below uses a shape `docs/luxuries.md`
already has (`src/sim/resourceEffects.ts`'s one evaluator); **no new shape**.
Every row is `buried`, `frequency` 0, `depth: deep`, revealed by Geomancy,
worked by the mine, hills only.

| id | name | the build it makes | signature (existing shapes) | in Æra III+ (`fromAge: 3`) |
|---|---|---|---|---|
| `obsidian` | Obsidian | **the war seat** | `productionBonus` units 25% `scope: empire` · `unitUpkeepRebate` 1 | `extraHappiness` 1 per city at war? — no such `per`; instead `productionBonus` units +10% more |
| `quicksilver` | Quicksilver | **the alchemist's capital** | `percentYields` science 10% empire | `perPopulationYields` science 0.5 in the capital (`scope: capital`) |
| `alum` | Alum | **the trader** (the mordant every dye needs) | `routeYields` +3💰 per route · `connectionPercent` 20% | `routeYields` +2🔬 per route |
| `malachite` | Malachite | **the builder** | `productionBonus` buildings 15% empire | `buildingCategoryYields` +1⚒ per production building |
| `sulphur` | Sulphur | **the engineer** — siege, fire, the Opus | `productionBonus` wonders 20% empire | `productionBonus` units 10% (siege units when the category exists) |
| `jet` | Jet | **the faith seat** (mourning jewellery, relics) | `perCityYields` +2🕯 every city · `renownPerCity` 1 | `buildingCategoryYields` +2🎵 per faith building |
| `lodestone` | Lodestone | **the coast** | `perCityYields` +2💰 `scope: coastal` · `percentYields` gold coastal 10% | `routeYields` +1🌾 per route (the compass reaches further — a route slot would be a new shape; the yield is not) |
| `beryl` | Beryl | **the wide seat** | `extraHappiness` 3 · `rulePercent` happinessDemand −10% | `authoritySupply` +1 per city |

Design notes:

- **Power**: each row is worth a *card* — obsidian at t92 is ≈33⚒ of unit
  hammers and 4💰 of upkeep; quicksilver ≈20🔬 plus the capital's line; alum
  ≈9💰 + ≈7💰 of connection gold on three routes — the strongest luxuries in
  the game, as ruled, and each one pushes a *path* (`docs/fewer-things.md`
  §4: War, Learning, Trade, Works, Faith, Coast, Wide).
- **Unique**: one copy of each per map (`maxCopies` 1 — a placement knob, not
  a shape); they count as unique luxuries for the Bazaar and `uniqueLuxuries`
  and never as a duplicate; **not tradeable** (a deal cannot offer one —
  unique means yours; `deals.ts` refuses the row by marker, never by name).
- **Reveal**: Geomancy names them; a deep seam struck before Geomancy cannot
  happen (§2 A), so the reveal and the strike are one tech.
- **Amber and lapis** exist on the surface today and are not moved — a
  mineral is a *vein-only* row by construction.

---

## 4. Placement

| Rule | Proposed | Why |
|---|---|---|
| the deep share | `veins.kinds` gains the eight rows at weight **1 each** (≈4% of veins together, ≈7 seams a map) | a third of a seat sees one in a game; the lottery the ruling wants |
| one copy each | a second pass over the deep hits: each mineral placed at most once, the leftover deep hits fall back to the luxury draw | uniqueness is a placement rule, not a row fact |
| spread | one mineral per continent at least, where the continent has a seat | the user's "unique luxuries" reads as *somebody's*, not *the biggest landmass's* |
| guarantee vs lottery | **lottery** — no seat is promised a mineral; every seat is promised horses and iron within six (flags note 20) and that is the fairness rule | a guaranteed build-around is not a build-around; a seat that finds one has *found* something |
| the separator | `hashSeed('webciv:gameplay:veins:minerals')` — a new sub-key, the string never renamed | every seed's existing seams stay bit-identical; the minerals are a draw after them |
| the mapgen report | `test/mapgen/mapReport.slow.test.ts` prints the kinds per map; the minerals join the table | the report is how the user reads a map roll |

---

## 5. The survey as a decision

With marks visible from Mining, a survey is a real choice: a worker's turn
against a known place and an unknown seam.

| Question | Proposed |
|---|---|
| does the mark hint at the seam | **by depth only** (§2): shallow says *ore or iron*, deep says *a luxury or a mineral* — never the row |
| the assay | stays 15💰, riders composed; the `veinFound` occasion stays a card's to name |
| a great person's work | a scholar's or engineer's work placed on a marked hill **surveys it as part of the work** (the work already opens the seam it covers — "Iron · academy") — one clause in `greatPersonWorkAt`, no new rule |
| Geomancy's second gift | the deep strike, mines +1⚒ (the note claims it — **verify it is implemented; the row's `unlocks` is empty**), and the minerals' reveal |
| the theme's proposal batch | The Assayers (+5🔬 per survey), The Vein Maps (seams inside borders reveal without a survey — under A this becomes "deep seams too"), The Prospector (first to strike three) — all still fit; The Vein Maps is the Cartographers path's engine |

---

## 6. Interactions

| Surface | What moves |
|---|---|
| `data/resources.json` | eight rows (`buried`, `depth: deep`, `maxCopies: 1`, `requiresTech: prospecting`, `improvement: mine`); `richOre`/`iron`/`gems`/`silver`/`gold` gain `depth` |
| `data/mapgen.json` | `veins.kinds` grows eight rows; `veins.deep` (the once-each pass) |
| `data/improvements.json` | `prospect.tech` → `mining`; a `prospect.deepTech` → `prospecting` (two gates, both data) |
| `src/sim/veins.ts` | the once-each pass, its sub-key; `veinCells` reports depth |
| `src/sim/improvements.ts` | `prospectError` asks depth; `seatSeesSleepingVein` answers depth; `barrenHillError` unchanged |
| `src/sim/resourceEffects.ts` | nothing — every signature is an existing shape |
| `src/sim/deals.ts` | refuse a unique row by marker |
| `src/art/surveyMarks.ts` · `flair.html` | a second mark (`deepVein`); joins the flair gallery in the same pass (CLAUDE.md) |
| `src/render3d/sites3d.ts` · `RevealView` | plant by depth; the mineral's prop veiled until Geomancy like every gated resource |
| The compendium | rows → entries; `describeResource` says "found only underground; one in the world" from the markers |
| `docs/luxuries.md` | eight rows in the table; the sync test pins it |
| `src/ai/` | `workers.veinValue` → shallow/deep pair; `tileWants` prices a marked hill by depth; the arena panel walks the sheet, no page edit |
| Tests | `veins.test.ts` (the reader register — unchanged in shape), `veins.slow` (share, lean, surface — plus once-each and the spread), `prospect.test.ts` (the depth gate, the deep refusal sentence, the reveal), `resourceEffects.test.ts` (eight signatures fold), `reveal3d.test.ts` (the second mark) |
| Schema | the gate moves and depth is read — one bump, rides with the mapgen batch (flags notes 16 and 20) |

---

## 7. For your markup

1. **When the layer opens.** A (Mining: marks + shallow survey; Geomancy: the
   deep strike + minerals), B (an Æra III node), or C (marks early, survey
   late). *Recommended: A.*
2. **Two marks or one.** A depth mark is the richness hint. *Recommended:
   two.*
3. **The mineral set.** Eight proposed: obsidian · quicksilver · alum ·
   malachite · sulphur · jet · lodestone · beryl. Strike, rename, or add
   (mercury is quicksilver; cinnabar is its ore — one row, not two).
4. **Their power.** The table's numbers are pitched at "the strongest luxury
   in the game, worth a card". Mark any row up or down.
5. **Uniqueness scope.** One per map (recommended) or one per continent.
6. **Tradeable?** *Recommended: no.*
7. **Lottery or guarantee.** *Recommended: lottery*, with one per seated
   continent as the spread rule.
8. **Geomancy's mine bonus** — confirm it should exist (the note promises it;
   the data does not carry it).

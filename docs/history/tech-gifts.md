# Tech gifts — every node's gift after the cut (2026-09-06)

The ruling (`docs/history/fewer-things.md` §6 item 11, the user): the tech gift
table is its own doc, **before the order pass**. The rule for the pass
(fewer-things §5 step 5): **no tech node without a gift a player will
notice.** The lanes are the user's chart (2026-09-03) and do not move; a
column is a price; this doc changes what a node *hands over*, never where it
sits.

What the cut takes off the tree (fewer-things §2 and §3, ruled): the
buildings `funeralGames`, `steleOfLaws`, `monastery`, `baths`, `forum`,
`examinationHall`, `clocktower`, `mint`, `armoury`, `caravanserai`,
`printingHouse` (cut or merged), `reliquary` (into the Cathedral),
`townCharter` (never built — a founding artefact); the **augur**; the
**Magister's dice**. What it adds: chains (`requiresBuilding`), the three
projects (production → gold / science / culture), the faith ladder and the
reroll, the city rites, the apostle, the engine shapes a tech may carry as a
card effect (`TechDef.effects`), and the vein layer's two halves
(`docs/deprecated/veins.md`).

**Nothing under `data/` or `src/` moves until §6 is marked.**

---

## 1. The gift vocabulary

What a node can hand over, and whether the shape exists.

| Gift | Shape | Exists | Notes |
|---|---|---|---|
| a unit | `unlocks.units` | yes | the roster is `data/units.json`'s |
| a building | `unlocks.buildings` | yes | **with chains, one row is two gifts**: the Bank *exists* at Banking and is *buildable* once a Market stands. The doc tables say "needs X" |
| an improvement | `requiresTech` on the improvement row | yes | farm · mine · pasture · camp · quarry · fishing boats · plantation · lumber mill · floating gardens |
| a verb / ability | `unlocks.abilities` (`ABILITY_TECH`) | yes | embark · sea legs · siege · open borders · the great-person gate · The Long Count · ocean-going · **the five rites, one by one, on their current nodes — RULED** (the bearer becomes the city) |
| a reveal | `requiresTech` on a resource row | yes | horses (Husbandry) · iron (Bronze Panoply) · niter (Alchemy); the minerals (Geomancy, `docs/deprecated/veins.md`) |
| a project | `unlocks.projects` | yes | `tithes` (Calendar) · `scholarship` (Letters) today; **the third, production → culture, is ruled and has no node** — §2 places it |
| a card effect carried by the tech | `TechDef.effects` (`liveEffects`' tenth source) | yes | Epic Poetry's verse, Raised Fields' tile line, State Workforce's discount, the Imperial Post's rules, Daughter Cities' rider, The Qadi's Court's meter rule, Steel's stat, Movable Type's cheer. **The strongest tool for filling a gap**: the tree's own civic, an engine or payoff shape from fewer-things §4 granted passively. New *shapes* are the five ruled there; a tech using one is a row |
| a tile line | `effects[].kind: tileYield` | yes | Raised Fields is the precedent; the renewals were axed (schema 62) but a tech-gated tile line is honest when it is *the* gift, not a renewal beside a building |
| a chain unlock | `requiresBuilding` on the child row | new (fewer-things §2) | the child's node is where it *exists*; the chain is where it becomes buildable |
| a bead | `paysBead` | yes | Alchemy |
| a card into your pool | — | **no** | a tech that adds a named Order to your draw bag. Not proposed: a card the tree hands you is a card the draft did not — it takes the decision out of the draft, which is the wrong direction for this pass |
| a rung of the faith ladder · the reroll | — | ruled, not yet placed | §2: the ladder opens with the Shrine (Divination); the reroll opens at The Long Count |
| the vein layer | — | **shelved** (`docs/deprecated/veins.md`) | the survey stays greyed by the tree; the layer is off in data |

---

## 2. The ledger, node by node

Columns: what the node gives **today** (from `data/techs.json`) · what
**survives** the cut · **gap** (none / weak — a chain child alone, a single
unit, or a wonder alone / **empty**) · the **proposed** gift. "≡" means
unchanged. Chain children are written "X (needs Y)".

### Æra I — Omens (12 nodes)

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `agriculture` | Agriculture | root | settler · warrior · scout · worker · farm | ≡ | none | ≡ |
| `earthenware` | Earthenware | 13 | Granary | ≡ | none | ≡ (the Granary takes the growth shape — fewer-things §2) |
| `fletching` | Fletching | 13 | archer · camp | ≡ | none | ≡ |
| `husbandry` | Husbandry | 13 | pasture · Temple of Artemis · reveals horses | ≡ | none | ≡ |
| `mining` | Mining | 13 | mine | mine | **weak** — one improvement | ≡ — kept lean on purpose (veins shelved; the mine is the hills' whole economy) [keep as is]
| `bronzeWorking` | Bronze Working | 30 | spearman · Barracks · Funeral Games · Walls of Uruk · Blessing of Arms | spearman · Barracks · Walls of Uruk · the military rite | none (Funeral Games cut, three gifts remain) | ≡ |
| `calendar` | Calendar | 30 | Hanging Gardens · plantation · **Tithes** (⚒→💰) | ≡ | none | ≡ |
| `divination` | Divination | 30 | augur · Shrine · The Oracle · three rites | Shrine · The Oracle · three rites (city verbs) | none — but the augur's *act* needs a home | **+ the faith ladder opens** (the pantheon's first consecration at its first rung); the Shrine is the rung's door |
| `sailing` | Sailing | 30 | trireme · Lighthouse · Great Lighthouse · fishing boats · embark | ≡ | none | ≡ |
| `stonecraft` | Stonecraft | 30 | Monument · Palisade · Stonehenge · Pyramids · quarry · Consecration of the Bounds | ≡ | none | ≡ |
| `letters` | Letters | 69 | Library · Great Ziggurat · open borders · **Scholarship** (⚒→🔬) | ≡ | none | ≡ |
| `theWheel` | The Wheel | 69 | chariot · chariot archer | ≡ | none | ≡ |

**The arc**: Æra I teaches the doors — every door building, every early verb,
two of the three projects, the faith ladder's first rung, and (new) the hills.
No node is empty; Mining is the leanest and honestly so (veins shelved).

### Æra II — Heroes (9 nodes)

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `bronzePanoply` | Bronze Panoply | 135 | phalanx · swordsman · reveals iron | ≡ | none | ≡ |
| `currency` | Currency | 135 | trader · Market · Mausoleum · Rite of Plenty | ≡ | none | ≡ |
| `epicPoetry` | Epic Poetry | 135 | Amphitheater · Theatre of Dionysus · the great-person gate · verse (culture on a death) | Amphitheater (needs a Monument) · the rest | none | ≡ | [unlocks: heroic epic, can only be built once in your empire, this city gains +50% renown]
| `theLongCount` | The Long Count | 135 | Chart the Stars · The Long Count · **a die of the Magister** | Chart the Stars · The Long Count | every 15 turns, gain renown equal to the number of science and faith buildings in your empire | **+ the faith reroll opens here** — the Magister's replacement on the Magister's node; the count's two gifts stay |
| `irrigation` | Irrigation | 225 | farms beside fresh water gain +1 food |
| `kingship` | Kingship | 225 | Stele of Laws | — | **the third project, production → culture** ("Pageants" — the king's festivals), and **+3 writ capacity** as a tech effect (the Stele's writ, carried by the crown instead of a stone) | [+3, +1 is too inconsequential] Unlocks: imperial throne, can be built once in a city. +5 authority. units built in this city cost -1 maintenance.
| `siegecraft` | Siegecraft | 225 | bowman · Stone Walls · siege · lumber mill | bowman · Stone Walls (needs a Palisade) · siege · lumber mill | none | ≡ |
| `theHighTemple` | The High Temple | 225 | prophet · Temple · The Preaching · the third pantheon slot | prophet (two charges, four acts) · Temple (needs a Shrine) · The Preaching | none | ≡ | unlocks: high temple, can only be built once in your empire. Same religious pressure as a holy site, +25% faith in this city.
| `wayfinding` | Wayfinding | 225 | bireme · war galley · Harbour · Colossus · sea legs | ≡ | none | ≡ |

**The arc**: Æra II opens the lines — iron, trade, verse, the sea, the
temple, the crown. Two nodes were empty and are the two that now carry the
age's only *empire* gifts (a tile line, a project + writ); the reroll gives
The Long Count back its Magister.

### Æra III — Empire (14 nodes) — the fork

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `ironWorking` | Iron Working | 400 | legionary · spear wall · Terracotta Army · Statue of Zeus | ≡ | none | ≡ |
| `philosophy` | Philosophy | 400 | Forum · Great Library | Great Library | unlocks the Forum, can only be built once in your empire: +10% science and +10% culture in this city.
| `raisedFields` | Raised Fields | 400 | floating gardens · a tile line | ≡ | none | ≡ |
| `stateWorkforce` | State Workforce | 400 | a unit stat · purchases −25% | ≡ | none | ≡ |
| `mathematics` | Mathematics | 540 | catapult · composite bowman · Petra | ≡ | none | ≡ | [new, unlocks unique building, needs name: can only be built once in your empire, +1 food and +1 prod from trade routes originating from this city]
| `shipwrights` | Shipwrights | 540 | galley · tower ship · fire ship · Shipyard | ships · Shipyard (needs a Harbour) | none | ≡ |
| `theCataphract` | The Cataphract | 540 | horseman · horse archer · war elephant | ≡ | none | ≡ (the Æra II cavalry rung — flags note 18 — is a roster question, not this doc's) |
| `theExaminationHall` | The Examination Hall | 540 | Examination Hall · a happiness tier boost | the boost | rename to civil service, +5 authority, +1 production and +1 food on great work improvements|
| `theImperialPost` | The Imperial Post | 540 | Forbidden City · Great Wall · a behaviour rule · an amplifier · cheer | ≡ | none | ≡ |
| `artisanry` | Artisanry | 680 | Workshop | Workshop | **weak** — one building | +10% production towards wonders, wonders gain +2 culture |
| `colonialCharters` | Daughter Cities | 680 | Town Charter · a founding rider · settlers −33% | the founding artefact (the charter a daughter city brings) · the rider · the discount | none | ≡ |
| `engineering` | Engineering | 680 | Aqueduct · Baths · Watermill · Circus Maximus | Aqueduct · Watermill · Circus Maximus | none | ≡ |
| `horology` | Horology | 680 | Water Clock of Su Song · Clocktower | the Water Clock | water clock rework: your periodic effects trigger 2 turns earlier. Every 7 turns, gain science equal to your empire-wide production | every 10 turns, gain +5 science for every production building in your empire |
| `theology` | Theology | 680 | Monastery · Cathedral · Chichén Itzá · Hagia Sophia · Angkor Wat · Great Mosque | Cathedral (needs a Temple) · four wonders | none — the Æra III wonder bulge (fewer-things §2 flag) | ≡ | [unlock apostles here]

**The arc**: the fork. After the cut the age's gifts split cleanly: the
army (Iron Working, Mathematics, The Cataphract), the sea (Shipwrights), the
land (Raised Fields, Daughter Cities, Engineering), the crown (State
Workforce, The Civil Service, The Imperial Post), learning (Philosophy,
Horology), the faith (Theology), the works (Artisanry). The spike is now
visible *in the tree* too: three of the five engine shapes debut here
(building percent at Philosophy and Artisanry, the periodic boon at
Horology).

### Æra IV — Cathedrals (14 nodes)

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `education` | Education | 1450 | University · House of Wisdom · The Turning Heavens | University (needs a Library) · the rest | none | ≡ |
| `machinery` | Machinery | 1450 | crossbowman · Armoury | crossbowman | faster movement along roads (1/3rd movement -> 1/5th) |
| `paperMoney` | Paper Money | 1450 | Mint · Bazaar | Bazaar (needs a Market) | none | ≡ |
| `prospecting` | Geomancy | 1450 | the survey and the marks (`prospect.tech`, **shelved**) · mines +1⚒ (a tech-gated line on the mine row) | rework: mines +1 prod, mines on resources provide an additional +1 prod and +1 faith |
| `theQadisCourt` | The Qadi's Court | 1450 | Courthouse · a meter rule | ≡ | none | ≡ |
| `feudalism` | Feudalism | 1700 | pikeman · Castle | pikeman · Castle (needs Stone Walls) | none | ≡ |
| `physics` | Physics | 1700 | trebuchet · Machu Picchu | ≡ | none | ≡ |
| `steel` | Steel | 1700 | longswordsman · Forge · a unit stat | longswordsman · Forge (needs a Workshop) · the stat | none | ≡ |
| `theSilkRoad` | The Silk Road | 1700 | Caravanserai · a route rider | the rider |  — the road's node pays the roads, trade routes gain +1 gold from each luxury resource in the origin/destination city |
| `banking` | Banking | 1950 | Bank | Bank (needs a Market; +0.5💰 per citizen, +10%💰) | none | ≡ |
| `militantOrders` | Militant Orders | 1950 | knight · Alhambra | ≡ | none | ≡ |
| `movableType` | Movable Type | 1950 | Printing House · cheer | the cheer | rework: remove cheer, cities connected to the capital gain +10% science and +10% production. |
| `theAstrolabe` | The Astrolabe | 1950 | caravel · carrack · gun galley · Observatory · ocean-going | ships · Observatory (needs a University) · ocean-going | none | ≡ |
| `theHolyOffice` | The Holy Office | 1950 | inquisitor · Reliquary · Notre-Dame | inquisitor · Notre-Dame · (faith purchases move onto the Cathedral) | none | [move apostles to theology] |
| `alchemy` | Alchemy | 2200 | fire lance · Alchemical Society · Alchemical Codex · a bead · reveals niter | ≡ | none | ≡ |

**The arc**: acceleration toward the Opus. The two science engines (Movable
Type, with Philosophy behind it) and the route percent are the age's empire
gifts; the apostle lands where the theme said it would.

### The tally

| | nodes | empty today | weak today | after |
|---|---|---|---|---|
| Æra I | 12 | 0 | 1 (Mining) | 1 (Mining, by choice) |
| Æra II | 9 | 2 (Irrigation, Kingship) | 1 (The Long Count) | 0 |
| Æra III | 14 | 0 | 4 (Philosophy, The Examination Hall, Artisanry, Horology) | 0 |
| Æra IV | 14 | 0 | 3 (Machinery, The Silk Road, Movable Type) | 1 (Geomancy, until the minerals) |
| **all** | **49** | **2** | **9** | **2** |

Gap-fills by kind: **six card effects** (Philosophy, Artisanry, Machinery,
Movable Type — building percents; Irrigation — a tile line; The Silk Road —
a route percent) · **one periodic boon** (Horology) · **one project + writ**
(Kingship) · **one writ effect** (The Civil Service) · **the reroll** (The
Long Count) · **the faith ladder** (Divination) · **the apostle** (The Holy
Office). Veins shelved: Mining and Geomancy stay lean on purpose. No node is
too rich: the richest (Stonecraft, Bronze Working, Theology) were rich before
and lose a row each
or none.

---

## 3. The science question

The balance-turn markup halves `sciencePerPop` (the citizen's beaker) and the
Library's per-citizen line; the user ruled *"move more of the science yield
into orders; my next playtest will see how much science we need to add to the
orders set."* The tree is the other place science comes back from. The
arithmetic on the turn-92 empire (60 citizens, six Libraries, 200🔬):

| | today | after the cut | change |
|---|---|---|---|
| citizens' own beakers | 60 | 30 | −30 |
| six Libraries' per-citizen lines | 60 | 30 | −30 |
| everything else (buildings' flats, cards, techs, beads) | 80 | 80 | — |
| **total** | **200** | **140** | **−60 (−30%)** |

What the proposed tree gifts hand back, on the same empire:

| gift | node | at t92 | when it arrives |
|---|---|---|---|
| Libraries +25% | Philosophy (Æra III) | six Libraries × (2 flat + 30/6 per-citizen) × 25% ≈ **+11🔬** | mid Æra III — the user held it at t92 |
| Libraries and Universities +25% | Movable Type (Æra IV) | ≈ +11🔬 on the Libraries again, plus the Universities' share ≈ **+15🔬** | Æra IV |
| every ten turns +N🔬 to the capital | Horology | at N = 30, **+3🔬 a turn** averaged — a lump, not a line | late Æra III |
| **tree, at t92** | | **≈ +14🔬 of the 60** | |

**Recommended split: the tree hands back about a quarter of the cut, the
deck carries the rest** — ≈45🔬 across the Learning cards for a six-city
empire, which is what the next playtest measures. The reason not to hand more
back through the tree: a tech gift is automatic and every empire gets it, so
science on the tree is science that does not differentiate a build; science
on the cards is the Learning path. The tree's share exists so the *floor* is
not too low for a seat that never drafts Learning.

---

## 4. Interactions

| Surface | What moves |
|---|---|
| `docs/tech-tree.md` | the per-age tables list units · buildings · abilities & gifts per node; every row this doc changes re-prints (Irrigation, Kingship, The Long Count, Philosophy, The Civil Service, Artisanry, Horology, Machinery, The Silk Road, Movable Type, The Holy Office, Divination, Geomancy). The Civil Service rename is a name only (`theExaminationHall` keeps its id for saves) |
| `test/sim/tech.test.ts` | pins node unlocks, the ability register (`ABILITY_TECH`), the cut-ids list, the lane crossings — every changed row re-pins; the crossings are untouched (no lane moves) |
| `test/sim/statecraft.test.ts` | the fold registry: a tech carrying a building percent, a periodic boon or a route percent joins `liveEffects`' tenth source as it does today — the *shapes* are fewer-things §4's and join the registry there |
| The compendium | generated from rows and describers; a tech effect prints through `describeEffect` — each new shape needs its words once |
| `src/ai/chain.ts` — `techChain` | prices a node by what it unlocks; a card-effect gift needs a price — `explainCounted` covers count shapes, and a percent over buildings is the balance-turn's `{to:'percent'}` reading, so the two building-percent gifts price for free; the periodic boon prices as a windfall over its period; the tile line prices as Raised Fields' does |
| The bot's build order | the chains change which buildings a town *can* raise; `potentialTownsFor` reads the parent (fewer-things §2) |
| Pacing harnesses | `tech.slow` (age closes), `statecraftPacing.slow`, `endgame.slow` — the science split moves them; re-aim once per landed batch |
| Saves / schema | rides the pass's bumps; the rename keeps the id |

---

## 5. The order of work, and where this sits

Fewer-things §5 puts the tree gifts (step 5) after the order pass (step 4);
the user ruled the table **before** the order pass. The build order that
honours both: the *shapes* land first (step 1), then **this table's gifts
land with the building cut** (step 3 — the same data commit re-aims the
nodes whose buildings leave), so that when the order pass is written every
node already has its gift and the deck's science budget is known.

---

## 6. For your markup

1. **The gap-fills by kind.** Six card effects, one periodic boon, one
   project, two writ effects, the reroll, the ladder, the layer, the apostle.
   Strike or swap any; the alternatives for each empty node are in §2's
   "proposed" column's reasoning.
2. **The science split.** Tree ≈ a quarter of the cut back, deck ≈ three
   quarters. Mark the split, or mark a number.
3. **The Civil Service.** Rename `theExaminationHall` (id kept) since its
   building is cut — yes or no.
4. **Horology's boon.** Every ten turns, +N🔬 to the capital, N ≈ 30 at Æra
   III. Mark N, or make it culture (the Water Clock's deferred chime named
   beakers).
5. **Kingship's pair.** Pageants (⚒→🎵) *and* +1 writ, or one of the two.
6. **Any node to cut or merge rather than fill.** Two candidates argued
   against: The Long Count (its two gifts are small but it is the Magister's
   node and the reroll gives it weight) and The Examination Hall (renamed, it
   is the crown's second writ node and the spot on the chart is yours). *No
   cut recommended.*
7. **"A card into your pool" as a shape.** Not recommended (it takes a
   decision out of the draft). Say if you want it anyway.

---

## 7. The markup, folded (2026-09-06) — RULED

The user marked the ledger; the rows above carry the marks. Two moves came
out of it, and both are recorded here as the pass's rulings.

### Unique buildings — once per empire, the age's anchor

*"One balance mechanism is introducing strong buildings that can only be
built once per empire."* The shape exists: `BuildingDef.oncePerEmpire` (the
Opus and the three national rows already wear it; `buildError` refuses a
second; the bot's potential arm reads it). A unique building is a **decision
about where** — the one thing a multiplied flat never was — so its effect is
city-scoped and scales with the city it lands in.

| node | building | effect (city-scoped) | shape | new? |
|---|---|---|---|---|
| Epic Poetry (II) | **Heroic Epic** | this city gains +50% renown | a percent on the city's renown lines | **new** — renown is a flat per building today; a city-scoped renown percent is one arm in `explainCityRenown` |
| Kingship (II) | **Imperial Throne** | +5 authority; units built in this city cost −1 maintenance | authority capacity (`cityStat`, exists); a per-city unit-upkeep rebate stamped on the unit at build (`Unit.freeUpkeep`'s cousin) | **half new** — the rebate is written at one of the five free-unit seams, as a partial |
| The High Temple (II) | **High Temple** | pressure as a holy site; +25% faith in this city | building `pressure` (exists on the Temple); `percentYields` faith, city stage (exists) | no |
| Philosophy (III) | **Forum** (kept back from the cut as the unique) | +10% science and +10% culture in this city | city-stage percents (exist) | no |
| Mathematics (III) | *(unnamed — the Counting House? the Harbourmaster's Table?)* | routes **originating here** +1🌾 +1⚒ | route yields keyed on the origin city | **new** — `routeYields` is empire-wide today; an origin-scoped line is one field on the shape |

Rules for the set: one per age at most two; every effect says *this city*;
the Forum's cut is reversed only in this form (it is not an ordinary row
again). Each is a real build — the chains do not apply to them, and the
hammer cost should read as a small wonder's.

### Tech effects — the nodes' own gifts, as marked

| node | gift, as ruled | shape | new? |
|---|---|---|---|
| The Long Count | every 15 turns, renown equal to the number of science and faith buildings in your empire | the periodic occasion paying a `countScaled` over `buildingsOfKind` (two categories) into renown | the occasion is fewer-things §4's; the renown payout is `settleRenownWindfall`'s |
| Irrigation | farms beside fresh water +1🌾 | `tileYield` (Raised Fields' shape) | no |
| Kingship | Pageants (⚒→🎵) · **+3 writ capacity** ("+1 is too inconsequential") | project · `cityStat` authority as a tech effect | no |
| The Civil Service (renamed) | +5 authority · great-work improvements +1⚒ +1🌾 | authority; `tileYield` on the great-work improvements (academy · landmark · manufactory · customs house · citadel · holy site — one line per improvement, or a `greatWork` test) | a `greatWork` tile test is one member |
| Artisanry | +10% production toward wonders · wonders +2🎵 | `productionBonus` wonders (exists); `buildingCategoryYields` wonders (exists) | no |
| Horology | **the Water Clock reworked**: your periodic effects fire 2 turns earlier; every 7 turns, science equal to your empire-wide production. **The tech**: every 10 turns, +5🔬 per production building | the period shortener and the periodic occasion (fewer-things §4, ruled); a payout equal to a *yield total* needs a count `empireProduction` | the count is **new** (one member); the rest is the ruled periodic pair |
| Theology | **the apostle unlocks here** (moved from The Holy Office) | `unlocks.units` | no |
| Machinery | roads faster: a road step costs a fifth instead of a third | `stepCost`'s road fraction as an empire fact (`MoveProfile`) | **new** — one field read in the one place a step is priced |
| Geomancy | mines +1⚒ (as today); **mines on resources +1⚒ +1🕯 more** | `tileYield` with `improvement: mine` ∧ `hasResource` (`all` composes) | no |
| The Silk Road | routes +1💰 per luxury in the origin or destination city | route yields counting the endpoints' luxuries | **new** — a route-fold count over the partner's and origin's resources (the Silk Exchange's "partner population" reading is the same seam) |
| Movable Type | cheer removed; cities **connected to the capital** +10% science and +10% production | city-stage percents under a city condition `connected` | the condition is **new** (one member; `explainEmpireGold` already knows the connection) |

Withdrawn by the markup: the Library/Workshop/Barracks percents, the
Libraries-and-Universities press, the route +30% — the user's gifts are more
specific than the shapes I reached for, and better for it.

### Shapes this adds to the pass

| shape | where | cost |
|---|---|---|
| a city-scoped renown percent | `renown.ts` `explainCityRenown` | one arm |
| a per-city unit-upkeep rebate written at build | `realiseItem` → `Unit` | one field, one seam |
| origin-scoped route yields | `routeYields.ts` | one field on the shape |
| `empireProduction` (a yield total as a count) | `countOf` | one member |
| a `greatWork` tile test | `TileCondition` | one member |
| the road step fraction as an empire fact | `MoveProfile` / `stepCost` | one field |
| endpoint-luxury route count | `routeYields.ts` | one count |
| a `connected` city condition | the city-condition evaluator | one member |

Eight small members beside fewer-things' ten. None reaches a fold that
another shape does not already reach.

### Ruled on the second markup (2026-09-06)

- **The Throne's +5 authority is empire-wide**; the unit rebate is the
  placement half.
- **The Mathematics unique is the Caravanserai** — the row cut from the
  ordinary list returns as the once-per-empire route hub: routes originating
  here +1🌾 +1⚒ (the name was already the game's word for a caravan's house,
  and a hub is exactly one per realm).
- **Hammer costs**: each unique is priced at **about half a wonder of its
  age** (the age's wonder costs are the reference; the row tables print the
  figure when the pass lands).
- **Periodic bonuses are strong by design** — "their yields come in bursts";
  Horology's two figures stand, and the rule generalises to every periodic
  row the order pass writes.
- The science split stands: the deck carries what the tree no longer hands
  back through Library percents.

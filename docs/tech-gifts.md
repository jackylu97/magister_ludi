# Tech gifts — every node's gift after the cut (2026-09-06)

The ruling (`docs/fewer-things.md` §6 item 11, the user): the tech gift
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
(`docs/veins.md`).

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
| a reveal | `requiresTech` on a resource row | yes | horses (Husbandry) · iron (Bronze Panoply) · niter (Alchemy); the minerals (Geomancy, `docs/veins.md`) |
| a project | `unlocks.projects` | yes | `tithes` (Calendar) · `scholarship` (Letters) today; **the third, production → culture, is ruled and has no node** — §2 places it |
| a card effect carried by the tech | `TechDef.effects` (`liveEffects`' tenth source) | yes | Epic Poetry's verse, Raised Fields' tile line, State Workforce's discount, the Imperial Post's rules, Daughter Cities' rider, The Qadi's Court's meter rule, Steel's stat, Movable Type's cheer. **The strongest tool for filling a gap**: the tree's own civic, an engine or payoff shape from fewer-things §4 granted passively. New *shapes* are the five ruled there; a tech using one is a row |
| a tile line | `effects[].kind: tileYield` | yes | Raised Fields is the precedent; the renewals were axed (schema 62) but a tech-gated tile line is honest when it is *the* gift, not a renewal beside a building |
| a chain unlock | `requiresBuilding` on the child row | new (fewer-things §2) | the child's node is where it *exists*; the chain is where it becomes buildable |
| a bead | `paysBead` | yes | Alchemy |
| a card into your pool | — | **no** | a tech that adds a named Order to your draw bag. Not proposed: a card the tree hands you is a card the draft did not — it takes the decision out of the draft, which is the wrong direction for this pass |
| a rung of the faith ladder · the reroll | — | ruled, not yet placed | §2: the ladder opens with the Shrine (Divination); the reroll opens at The Long Count |
| the vein layer | `prospect.tech` · `prospect.deepTech` | `docs/veins.md` §2 A | Mining opens the marks and the shallow survey; Geomancy the deep strike and the minerals |

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
| `mining` | Mining | 13 | mine | mine | **weak** — one improvement | **+ the vein marks and the shallow survey** (`docs/veins.md` §2 A): the hills start answering in the opening |
| `bronzeWorking` | Bronze Working | 30 | spearman · Barracks · Funeral Games · Walls of Uruk · Blessing of Arms | spearman · Barracks · Walls of Uruk · the military rite | none (Funeral Games cut, three gifts remain) | ≡ |
| `calendar` | Calendar | 30 | Hanging Gardens · plantation · **Tithes** (⚒→💰) | ≡ | none | ≡ |
| `divination` | Divination | 30 | augur · Shrine · The Oracle · three rites | Shrine · The Oracle · three rites (city verbs) | none — but the augur's *act* needs a home | **+ the faith ladder opens** (the pantheon's first consecration at its first rung); the Shrine is the rung's door |
| `sailing` | Sailing | 30 | trireme · Lighthouse · Great Lighthouse · fishing boats · embark | ≡ | none | ≡ |
| `stonecraft` | Stonecraft | 30 | Monument · Palisade · Stonehenge · Pyramids · quarry · Consecration of the Bounds | ≡ | none | ≡ |
| `letters` | Letters | 69 | Library · Great Ziggurat · open borders · **Scholarship** (⚒→🔬) | ≡ | none | ≡ |
| `theWheel` | The Wheel | 69 | chariot · chariot archer | ≡ | none | ≡ |

**The arc**: Æra I teaches the doors — every door building, every early verb,
two of the three projects, the faith ladder's first rung, and (new) the hills.
No node is empty; Mining was the weakest and is now the layer's front door.

### Æra II — Heroes (9 nodes)

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `bronzePanoply` | Bronze Panoply | 135 | phalanx · swordsman · reveals iron | ≡ | none | ≡ |
| `currency` | Currency | 135 | trader · Market · Mausoleum · Rite of Plenty | ≡ | none | ≡ |
| `epicPoetry` | Epic Poetry | 135 | Amphitheater · Theatre of Dionysus · the great-person gate · verse (culture on a death) | Amphitheater (needs a Monument) · the rest | none | ≡ |
| `theLongCount` | The Long Count | 135 | Chart the Stars · The Long Count · **a die of the Magister** | Chart the Stars · The Long Count | **weak** (the die is gone) | **+ the faith reroll opens here** — the Magister's replacement on the Magister's node; the count's two gifts stay |
| `irrigation` | Irrigation | 225 | *(nothing — its renewal went with schema 62)* | — | **EMPTY** | **a tile line as the tech's own effect**: farms beside fresh water +1🌾 (the `tileYield` shape Raised Fields uses) — what the node was always for, restored as *the* gift rather than a renewal beside a building |
| `kingship` | Kingship | 225 | Stele of Laws | — | **EMPTY** (the Stele is cut) | **the third project, production → culture** ("Pageants" — the king's festivals), and **+1 writ capacity** as a tech effect (the Stele's writ, carried by the crown instead of a stone) |
| `siegecraft` | Siegecraft | 225 | bowman · Stone Walls · siege · lumber mill | bowman · Stone Walls (needs a Palisade) · siege · lumber mill | none | ≡ |
| `theHighTemple` | The High Temple | 225 | prophet · Temple · The Preaching · the third pantheon slot | prophet (two charges, four acts) · Temple (needs a Shrine) · The Preaching | none | ≡ |
| `wayfinding` | Wayfinding | 225 | bireme · war galley · Harbour · Colossus · sea legs | ≡ | none | ≡ |

**The arc**: Æra II opens the lines — iron, trade, verse, the sea, the
temple, the crown. Two nodes were empty and are the two that now carry the
age's only *empire* gifts (a tile line, a project + writ); the reroll gives
The Long Count back its Magister.

### Æra III — Empire (14 nodes) — the fork

| id | name | cost | today | survives | gap | proposed |
|---|---|---|---|---|---|---|
| `ironWorking` | Iron Working | 400 | legionary · spear wall · Terracotta Army · Statue of Zeus | ≡ | none | ≡ |
| `philosophy` | Philosophy | 400 | Forum · Great Library | Great Library | **weak** — a wonder alone | **a card effect: your Libraries pay +25%** (the building-yield percent by category — fewer-things §4's second shape) — the first science engine on the tree, where the science cut is felt |
| `raisedFields` | Raised Fields | 400 | floating gardens · a tile line | ≡ | none | ≡ |
| `stateWorkforce` | State Workforce | 400 | a unit stat · purchases −25% | ≡ | none | ≡ |
| `mathematics` | Mathematics | 540 | catapult · composite bowman · Petra | ≡ | none | ≡ |
| `shipwrights` | Shipwrights | 540 | galley · tower ship · fire ship · Shipyard | ships · Shipyard (needs a Harbour) | none | ≡ |
| `theCataphract` | The Cataphract | 540 | horseman · horse archer · war elephant | ≡ | none | ≡ (the Æra II cavalry rung — flags note 18 — is a roster question, not this doc's) |
| `theExaminationHall` | The Examination Hall | 540 | Examination Hall · a happiness tier boost | the boost | **weak** — a boost alone, and the building that named the node is cut | **+2 writ capacity as a tech effect** (the hall's +3, less one — writ lives in cards now and the tree's share is smaller) — and rename the node **The Civil Service**, since the hall is gone |
| `theImperialPost` | The Imperial Post | 540 | Forbidden City · Great Wall · a behaviour rule · an amplifier · cheer | ≡ | none | ≡ |
| `artisanry` | Artisanry | 680 | Workshop | Workshop | **weak** — one building | **+ the Forge exists here** (buildable at Steel? — no: the Forge's node stays Steel; the chain Workshop → Forge is Steel's gift). Instead: **a card effect: your Workshops pay +50%** — the hammer engine, on the hammer node |
| `colonialCharters` | Daughter Cities | 680 | Town Charter · a founding rider · settlers −33% | the founding artefact (the charter a daughter city brings) · the rider · the discount | none | ≡ |
| `engineering` | Engineering | 680 | Aqueduct · Baths · Watermill · Circus Maximus | Aqueduct · Watermill · Circus Maximus | none | ≡ |
| `horology` | Horology | 680 | Water Clock of Su Song · Clocktower | the Water Clock | **weak** — a wonder alone | **the tree's first periodic boon**: *every ten turns, +N🔬 to the capital* — the ruled periodic occasion, on the clock's own node; the Water Clock's deferred chime ("beakers on a fixed cadence") is exactly this and can stop being deferred |
| `theology` | Theology | 680 | Monastery · Cathedral · Chichén Itzá · Hagia Sophia · Angkor Wat · Great Mosque | Cathedral (needs a Temple) · four wonders | none — the Æra III wonder bulge (fewer-things §2 flag) | ≡ |

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
| `machinery` | Machinery | 1450 | crossbowman · Armoury | crossbowman | **weak** — one unit | **a card effect: your Barracks pay +50%** (their unit percent) — the armoury's identity carried by the node |
| `paperMoney` | Paper Money | 1450 | Mint · Bazaar | Bazaar (needs a Market) | none | ≡ |
| `prospecting` | Geomancy | 1450 | *(the survey and the marks — `unlocks` is empty; the note also promises mines +1⚒)* | the deep strike · the minerals' reveal · mines +1⚒ (**verify** — `docs/veins.md` §7.8) | none under veins §2 A | ≡ |
| `theQadisCourt` | The Qadi's Court | 1450 | Courthouse · a meter rule | ≡ | none | ≡ |
| `feudalism` | Feudalism | 1700 | pikeman · Castle | pikeman · Castle (needs Stone Walls) | none | ≡ |
| `physics` | Physics | 1700 | trebuchet · Machu Picchu | ≡ | none | ≡ |
| `steel` | Steel | 1700 | longswordsman · Forge · a unit stat | longswordsman · Forge (needs a Workshop) · the stat | none | ≡ |
| `theSilkRoad` | The Silk Road | 1700 | Caravanserai · a route rider | the rider | **weak** — a rider alone | **a card effect: routes +30%** (`routeYields` percent — the Escorted Roads' shape, which the balance-turn markup called a payoff) — the road's node pays the roads |
| `banking` | Banking | 1950 | Bank | Bank (needs a Market; +0.5💰 per citizen, +10%💰) | none | ≡ |
| `militantOrders` | Militant Orders | 1950 | knight · Alhambra | ≡ | none | ≡ |
| `movableType` | Movable Type | 1950 | Printing House · cheer | the cheer | **weak** — cheer alone, and cheer is dead above the clamp | **a card effect: your Libraries and Universities pay +25%** — the press; the second science engine, on the node whose building was the science flat |
| `theAstrolabe` | The Astrolabe | 1950 | caravel · carrack · gun galley · Observatory · ocean-going | ships · Observatory (needs a University) · ocean-going | none | ≡ |
| `theHolyOffice` | The Holy Office | 1950 | inquisitor · Reliquary · Notre-Dame | inquisitor · Notre-Dame · (faith purchases move onto the Cathedral) | none | **+ the apostle** — "later in the tree than the prophet" (RULED); this is the religion node after The High Temple, and the Office is where an apostle is sent from |
| `alchemy` | Alchemy | 2200 | fire lance · Alchemical Society · Alchemical Codex · a bead · reveals niter | ≡ | none | ≡ |

**The arc**: acceleration toward the Opus. The two science engines (Movable
Type, with Philosophy behind it) and the route percent are the age's empire
gifts; the apostle lands where the theme said it would.

### The tally

| | nodes | empty today | weak today | after |
|---|---|---|---|---|
| Æra I | 12 | 0 | 1 (Mining) | 0 |
| Æra II | 9 | 2 (Irrigation, Kingship) | 1 (The Long Count) | 0 |
| Æra III | 14 | 0 | 4 (Philosophy, The Examination Hall, Artisanry, Horology) | 0 |
| Æra IV | 14 | 0 | 3 (Machinery, The Silk Road, Movable Type) | 0 |
| **all** | **49** | **2** | **9** | **0** |

Gap-fills by kind: **six card effects** (Philosophy, Artisanry, Machinery,
Movable Type — building percents; Irrigation — a tile line; The Silk Road —
a route percent) · **one periodic boon** (Horology) · **one project + writ**
(Kingship) · **one writ effect** (The Civil Service) · **the reroll** (The
Long Count) · **the faith ladder** (Divination) · **the vein layer** (Mining)
· **the apostle** (The Holy Office). No node is too rich: the richest
(Stonecraft, Bronze Working, Theology) were rich before and lose a row each
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
| `docs/tech-tree.md` | the per-age tables list units · buildings · abilities & gifts per node; every row this doc changes re-prints (Irrigation, Kingship, The Long Count, Philosophy, The Civil Service, Artisanry, Horology, Machinery, The Silk Road, Movable Type, The Holy Office, Mining, Divination, Geomancy). The Civil Service rename is a name only (`theExaminationHall` keeps its id for saves) |
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

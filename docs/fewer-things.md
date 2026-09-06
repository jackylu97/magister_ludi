# Fewer things — the choice-size pass (2026-09-06)

The user's overriding impression of the first playthrough, verbatim, and the
authority for everything below (`docs/flags.md` §C, "The tedium thread" and
"Bigger, rarer choices; cards that combo"):

- *"many of the mechanics felt tedious i.e. we have so many buildings in the
  game that have similar effects, i never wanted to invest in my chapel because
  i was so far ahead and didnt want to waste time paying for augurs and using
  them in my cities"*
- *"how do we make the game feel like there are bigger and rarer choices? I
  think that also need to be reflected in the orders"*
- *"I ended up with generically strong orders across the board, it didn't feel
  like the cards had synergy with each other… the faith oriented build didn't
  make me really change how i played… I almost feel like we need to include a
  proportion of cards that don't really do much on their own, but combo nicely
  with other cards."*

**The thesis.** Tedium is *low value per decision*. Every click in this game is
priced by what it moves; a click that moves a twentieth of one voice is a chore
whatever it is called. The game today has many small frequent decisions
(a building that is a flat with a different name, an augur bought and walked and
told, a worker surveying) and one frequent large one — the draft — which hands
out cards that are mostly flats, so it reads as *take the biggest number*.
Three moves, one pass: **fewer things, each consequential; a ladder of choice
sizes; a deck that combos.**

**Nothing under `data/` or `src/` moves until this is marked.** Everything here
is a proposal; §6 is the list of decisions only the user can make. The master
row lists stay `docs/orders-and-doctrines.md` and `data/buildings.json`; the
measurement of record stays `docs/balance-turn.md`.

---

## 0. Where the data disagrees with the frame

Two of the assumptions this pass started from do not survive the arithmetic,
and both change what the pass should do.

| Assumption | What the data says | Consequence |
|---|---|---|
| "The draft is too rare — Entry XV wanted one every five turns and the harness measured 9.3" | Against the **user's** culture curve the ladder deals a draft every 4–5 turns from turn 4 to turn 90, and the model reproduces the user's t92 state exactly (20 drafts, 19 orders held) — see §1's ladder table. The 9.3 reading was the bot's | `docs/cards-pass-2.md` §E.3 ("more drafts, smaller cards") is **wrong for a human empire** and is superseded here. The cadence is already at target; the size is not |
| "The deck has readers and conversions; the pass is about ratio" | Of 158 live Order rows, **nine** read anything about the player's other cards — seven count slotted Orders by *slot flavour*, two amplify another system's figure. **Not one reads a card's line.** `CardLine` exists on every row and its own docblock says *"nothing in the simulation switches on a `line`"* | The synergy problem is not a ratio problem. The vocabulary for "this card reads my other cards" is one count wide and asks the wrong question |

The second finding is the pass's centre: **the tag family already exists as
data and is inert.** Making it readable is one new union member.

---

## 1. The choice-size ladder

### What a decision costs and what it moves, today

Estimates for the user's turn-92 empire (six cities, four military pieces,
three traders, two or three workers). Card weights are `docs/balance-turn.md`'s
audit; the rest is estimated from the board and marked as such.

| Tier | Decision | Per ten turns | What one moves | Clicks each |
|---|---|---|---|---|
| Era-defining | government adoption · founding a faith · a doctrine pick · a wonder started · the Opus | 1 | the shape of the game | 1–3 |
| **The draft** | take one Order or pass | **2.2** | 3–8% of one voice (the audit's median); 15%+ for four rows in the game | 2 |
| Empire | a research pick | 1.3 | large — a column is a price and a door | 1 |
| City | a production row chosen | ~10 | 2–3% of one voice, on completion | 1–2 |
| City | citizen focus · a tile lock | ~1 | under 1% | 2 |
| Ground | a worker verb | ~8 | 1–2 yield on one hex, ≈0.3% of a voice | 2–3 |
| Ground | a rite performed | ~1.5 | under 1% of a voice (§3's table) | 4–6 |
| Ground | a unit ordered | 40–70 | ≈0 at peace | 1 |

**The reading.** The two highest-frequency decisions move the least, and the
one frequent decision that could be large is sized like a small one. That is
the tedium, stated as arithmetic.

### The draft ladder, measured

`meter` = `costBase` 12 · `costLinear` 6 · `costExponent` 2.25; cost(n) =
12 + 6n + n^2.25, spent out of `Player.culturePool`. Run against a culture curve
fitted to the user's own game (2 at t0 · 15 at t20 · 45 at t40 · 90 at t60 ·
195 at t92):

| Draft | 1 | 3 | 5 | 8 | 11 | 14 | 17 | **20** | 23 | 26 | 29 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lands on turn | 4 | 11 | 19 | 33 | 46 | 60 | 75 | **89** | 105 | 122 | 141 |
| gap since the last | 4 | 4 | 4 | 5 | 4 | 4 | 5 | **5** | 5 | 6 | 7 |
| cost | 12 | 29 | 59 | 134 | 250 | 411 | 620 | **880** | 1192 | 1560 | 1983 |

The model puts the twentieth draft at t89; the user held nineteen Orders at t92.
The ladder is not the problem.

### The proposed target ladder

| Tier | Today, per ten turns | Target | How |
|---|---|---|---|
| Era-defining | 1 | 1 | unchanged |
| The draft | 2.2 | **1.4** | `costExponent` 2.25 → 2.8; each card worth roughly twice today |
| Research | 1.3 | 1.3 | unchanged (the queue already absorbs the clicks) |
| Production | ~10 | **5** | §2's cut list — half the rows, each a longer, larger build |
| Citizen focus / locks | 1 | 1 | unchanged |
| Worker verbs | ~8 | **3** | passive survey; no verb that only reveals |
| Rites | 1.5 at 4–6 clicks | **0.5 at 1 click** | §3 |
| Unit orders | 40–70 | 40–70 | not a design problem; sleep, fortify and route persistence already carry it |

### The levers, one per row

| Lever | Today | Proposed | What it does | Risk |
|---|---|---|---|---|
| Draft cadence (`meter.costExponent`) | 2.25 | **2.8** | 20 drafts by t92 → 14; opening drafts land on the same turns (4, 7, 11) so the teaching rate is untouched; late gaps open to 8–10 | culture's worth falls, and culture is also the border channel — the culture-paying cards get relatively weaker |
| Draft cadence, alternatives | — | ×1.5 on all three terms → 18 by t92 · exponent 3.0 → 13 by t92 | the multiplier barely moves the count (the ladder is super-linear); only the exponent does | — |
| Slot count | Gov III 11 chairs (2/5/4 · 5/3/3 · 3/3/5) | **−25%, Gov III to 8** | at 14 drafts by t92 and 11 chairs, chairs stop being contested; at 8 they stay contested and the seal keeps biting | `theAnnalsOfLaw` pays per benched card and gets better; `theArchives` pays per slotted card and gets worse |
| Seal length | 5 turns | **5 turns — RULED, untouched** | the user's veto of 2026-09-05 stands: slot-in/out is skill expression | — |
| Cards per offer | 3 (max 5) | 3, **plus a line guarantee** (§4) | a committed deck must see its own line often enough to build; with six tags and three faces the chance of seeing your line is 42% | a fourth draw rule, not a card shape — see §4 |
| The pass | spends the hand, `skipPity` +1 to uncommon and rare | unchanged, but it now has a *reason*: pass an off-line hand toward the rare payoff | — | the bot never conditions a pass on the hand it just saw (a written-down debt) |
| Ordinary buildings per age | 8 · 6 · 11 · 13 | **6 · 3 · 3 · 7** | §2 | three bead deeds and one wonder grant re-aim |
| Verbs that go passive | `prospect` on a vein; `survey` | a vein is marked once the tech is held, or surveyed when a worker rests | the user could not see where the surveyable mines were | a UI ruling, not a sim one |

### What "bigger and rarer" does to pacing and to the bot

- **Culture pacing.** Culture fills one pool for two purposes (the draft basket
  and, separately, `City.culture` for borders). Slowing the ladder makes the
  *basket* dearer without touching borders, so a culture empire converts less
  of its lead into cards. The four culture-conversion rows
  (`theHarvestSongs`, `theLyceum`, `theArchives`, `theAnnalsOfLaw`) sit in the
  feedback loop the balance turn already flagged: a stronger deck drafts faster,
  which strengthens the deck. A steeper exponent damps that loop, which is a
  second reason to prefer it over a flat multiplier.
- **The pacing harness.** `test/sim/statecraftPacing.slow.test.ts` bands the
  cadence (measured 9.3, band 5–13) and the three government tiers. A steeper
  exponent moves every one of them, and the tier bands are two-sided.
- **The bot's draft plan.** `draftPlan` (`src/ai/wants.ts`) prices a draft as
  `E[best of the hand] − the worst card it would bench`, discounted by
  `delayTerm` over how long the culture takes to fill. A steeper ladder raises
  that delay, so the bot values culture less early and more late — which is
  correct. The plan needs no edit for the cadence. It needs a real one for tags
  (§5).

---

## 2. The building cut list

**Target**: roughly half as many ordinary buildings; **no survivor is only a
flat**; every survivor is a *shape* (per-citizen · percentage · conditional ·
count) or a *door* (an enabler: a route slot, faith purchases, a site for
something else). The flats that go do not reappear — their power moves into
cards, which is the ruled direction (`docs/loop-review.md` §E,
`docs/flags.md` §A "the balance turn").

Counts today, from `data/buildings.json` (83 rows):

| Class | Rows |
|---|---|
| ordinary, tech-unlocked | 38 |
| wonders | 27 |
| card-unlocked (charters + the Gilded Hall) | 12 |
| once-per-empire national rows (`chartTheStars`, `theTurningHeavens`, `theAlchemicalCodex`) | 3 |
| the Magnum Opus | 1 |
| parked (`awaitsTech`: `bastion`, `hallOfDeeds`) | 2 |

The cut list below touches the **38 ordinary rows only**. Shape column:
`flat` · `per-citizen` · `%` · `cond` (a condition on site or state) ·
`count` · `door` · `def` (defensive).

### Æra I — Omens (8 rows → 6)

| id | Name | What it does | Shape | Verdict |
|---|---|---|---|---|
| `monument` | Monument | 2🎵, +1 writ capacity | flat | **KEEP** — the culture door; borders and the draft basket both start here. Re-shape the flat to a per-citizen line so a tall town's songs grow. Writ line **cut** (balance-turn §4g) |
| `granary` | Granary | 3🌾 | flat | **KEEP** — becomes the growth shape: a share of the basket kept on a growth (the clause cut with Public Granaries, at a number that reads). Absorbs `watermill` and `townCharter` |
| `shrine` | Shrine | 1🔬 1🕯 | flat | **KEEP** — the faith door (pantheon, the augur, and under §3 the cheapest rung of the rite verb). Science line **cut** — that is the Library's job |
| `barracks` | Barracks | +10% units, general renown | % | **KEEP** — the war door. Absorbs `armoury` |
| `palisade` | Palisade | +5 defence, +15 hp | def | **KEEP** — the one early defensive rung |
| `funeralGames` | Funeral Games | 3😊 | flat | **CUT** — cheer belongs in cards (Entry LIV). Effect goes **nowhere**; the deed `theGreatGames` re-aims (§2's interactions) |
| `library` | Library | 2🔬, 1🔬 per citizen | per-citizen | **KEEP** — the archetype. `sciencePerPop` takes balance-turn §4b's cut if that is marked |
| `lighthouse` | Lighthouse | 2💰, water hexes feed | flat + tile line | **MERGE INTO `harbour`** |

### Æra II — Heroes (6 rows → 3, plus one national row)

| id | Name | What it does | Shape | Verdict |
|---|---|---|---|---|
| `temple` | Temple | 2🕯; doubles own pressure, foreign to 75% | cond | **KEEP** — the faith engine's subject; five Order rows and Notre-Dame count it |
| `market` | Market | 3💰, a route slot | flat + door | **KEEP** — the coin door and the route slot. Absorbs `mint`, `bank`, `caravanserai` |
| `harbour` | Harbour | 1🌾, a route slot, every worked water hex feeds | door + tile line | **KEEP** — absorbs `lighthouse` and `shipyard`, and becomes the whole coastal build |
| `stoneWalls` | Stone Walls | +4 defence, +25 hp | def | **CUT** — one defensive rung per half of the game: `palisade`, then `castle`. Already flagged in `docs/flags.md` §B as mis-costed |
| `amphitheater` | Amphitheater | 3🎵 | flat | **CUT** — its culture goes to the Monument's per-citizen line. The Theatre of Dionysus **grants** one on completion and must re-aim |
| `steleOfLaws` | Stele of Laws | 3🎵, +1 writ | flat | **CUT** — the balance turn already reads it as worse per hammer than the Monument |
| `chartTheStars` | Chart the Stars | national, 2🔬, a bead, naval movement | door | **KEEP** — a bead row, not an ordinary building |

### Æra III — Empire (11 rows → 3)

| id | Name | What it does | Shape | Verdict |
|---|---|---|---|---|
| `aqueduct` | Aqueduct | waters the town, +15% growth surplus | % + cond | **KEEP** |
| `workshop` | Workshop | 3⚒, +10% toward buildings and wonders | % | **KEEP** — the hammer door |
| `cathedral` | Cathedral | 3🎵 3🕯 3😊, rolls one of five consecrations, takes contributions | cond + **a choice** | **KEEP** — the one ordinary building that hands the player a decision. Absorbs `reliquary` (faith purchases move onto it) |
| `watermill` | Watermill | 2🌾 1⚒ | flat | **MERGE INTO `granary`** |
| `monastery` | Monastery | 2🎵, 0.25🔬 per citizen | flat | **CUT** — the user's note 15 asks for a rework; the rework is the cut. Its faith identity is the Temple's, its culture the Monument's, its beakers the Library's |
| `baths` | Baths | 2🌾 2😊 | flat | **CUT** |
| `forum` | Forum | 3🎵 | flat | **CUT** |
| `examinationHall` | Examination Hall | 1🔬, +3 writ | flat | **CUT** — writ becomes a card decision (Entry LIV), which is what makes tall-vs-wide bite |
| `shipyard` | Shipyard | 1⚒, a route slot, +10% units, water resource hexes | door | **MERGE INTO `harbour`** |
| `townCharter` | Town Charter | 4🌾 2🎵 | flat | **CUT** — a founding artefact; the founding cards pay instead |
| `clocktower` | Clocktower | 2🔬 | flat | **CUT** |

### Æra IV — Cathedrals (13 rows → 7, plus two national rows)

| id | Name | What it does | Shape | Verdict |
|---|---|---|---|---|
| `university` | University | 0.75🔬 per citizen | per-citizen | **KEEP** — the second rung of the one science shape |
| `bazaar` | Bazaar | 2💰, +1💰 per unique luxury the town can reach | count | **KEEP** — a real count, and the luxuries system's building |
| `courthouse` | Courthouse | 3💰, +2 writ, **captured towns only** | cond | **KEEP** — the conquest door |
| `castle` | Castle | +5 defence, +25 hp | def | **KEEP** — the second and last defensive rung; absorbs `stoneWalls` |
| `forge` | Forge | 2⚒, +15% units | % | **KEEP** — absorbs `armoury` |
| `observatory` | Observatory | 3🔬, 1🔬 per citizen, +10%🔬 | % + per-citizen | **KEEP** |
| `alchemicalSociety` | The Alchemical Society | 1🔬 per citizen, +1⚒ per building in this town | count | **KEEP** — a count over the town's own build, and the Codex's site |
| `reliquary` | The Reliquary | 4😊, faith buys units here, +10%🕯 | door | **MERGE INTO `cathedral`** |
| `mint` | Mint | 3💰 | flat | **CUT** — `docs/flags.md` already asks for the Mint and the Coinworks to be reconciled; this is the answer. The deed `theMint` re-aims |
| `armoury` | Armoury | 1⚒, +15% units | % | **MERGE INTO `forge`**. The deed `theMusterOfTheRealm` re-aims |
| `caravanserai` | Caravanserai | 2💰, a route slot | door | **MERGE INTO `market`** |
| `printingHouse` | Printing House | 2🔬 2🎵 | flat | **CUT** — the Gov V order `printingHouses` names it and re-aims to the Library |
| `bank` | Bank | 4💰 | flat | **CUT** — its deferred half ("a coin per route ending here") was never buildable |
| `theTurningHeavens` · `theAlchemicalCodex` | — | national, bead-granting | door | **KEEP** |

### The tally

| | Today | After | Cut outright | Merged away |
|---|---|---|---|---|
| Æra I | 8 | 6 | 1 | 1 |
| Æra II | 6 | 3 | 2 | 1 |
| Æra III | 11 | 3 | 6 | 2 |
| Æra IV | 13 | 7 | 3 | 3 |
| **Ordinary total** | **38** | **19** | **12** | **7** |

Every survivor names what it is *for* in one clause: Monument the culture door ·
Granary growth · Shrine the faith door · Barracks the war door · Palisade and
Castle the two defensive rungs · Library and University the science shape ·
Temple the tide · Market and Harbour the two route doors · Aqueduct growth's
percentage · Workshop and Forge the two hammer shapes · Cathedral the one
building that asks a question · Bazaar luxuries · Courthouse conquest ·
Observatory and the Alchemical Society the two late counts.

### What the cut does to the charters

The twelve card-unlocked rows are untouched by the cut and become **more**
valuable, which is the direction: with `mint` and `bank` gone the Assay House
and the Coinworks are the gold line's only late shapes; with `clocktower` and
`printingHouse` gone the Scriptorium and the Orrery are the science line's.

| Charter row | Building | What the cut does |
|---|---|---|
| `coinCharter` · `mintCharter` | Assay House · Coinworks | become the whole late gold build; their balance-turn numbers should be re-derived after the cut, not before |
| `scrivenersCharter` · `stargazersCharter` | Scriptorium · Orrery | same, for science |
| `toolmakersCharter` | Smithy | unchanged — already the pool's one consequential row, and already a deck-reader |
| `waterwrightsCharter` | Cistern | unchanged |
| `theSenatus` | Assembly Hall | unchanged — a deck-reader, and with `examinationHall` cut it is one of two writ buildings left (with the Assize Court) |
| `justicesCharter` | Assize Court | rises: writ leaves buildings and lives in cards and these two rows |
| `vigilCharter` | Keep | rises: with `stoneWalls` cut, the Keep is the mid-game defensive answer |
| `almshouseCharter` | Almshouse | unchanged |
| `ritesCharter` | **Chapel** | **decided by §3** — under the recommended option the Chapel becomes the rite door and gains a real reason to be built |
| `gildedCourt` (doctrine) | Gilded Hall | unchanged (purchase-only) |

### What the cut does to the wonders

**No wonder is cut in this pass.** `docs/balance-turn.md` §4d already reads the
wonder line as the weak build — a wonder pays a few points of one voice for the
hammers of several ordinary buildings — and cutting the ordinary queue in half
*raises* a wonder's relative worth for free, because the town has fewer cheap
rows to prefer. Two consequences and one flag:

| | |
|---|---|
| **Grants that break** | `theatreOfDionysus` grants an Amphitheatre on completion. Re-aim to a Monument, or to a doctrine draft alone |
| **Counts that survive** | `circusMaximus` (barracks), `notreDame` (temples), `greatLibrary` (library), `greatZiggurat` (shrine), `hagiaSophia` (temple), `templeOfArtemis` (camps and pastures) all name kept rows |
| **The real duplication is Æra III** | twelve wonders open in one age and five of them at Theology alone (`chichenItza`, `hagiaSophia`, `angkorWat`, `greatMosqueOfDjenne`, and the Cathedral behind them). Flagged, not proposed — a wonder cut is its own pass |

### Maintenance, and the bot

| Surface | What moves |
|---|---|
| `explainEmpireGold` (`empireGold.ts`) | building upkeep is the age of the unlocking tech, one line per standing building. Cutting nineteen rows removes up to nineteen upkeep lines per fully-built town — at six towns this is the largest single gold change in any pass this year, and it lands on the *relief* side. It also shrinks the empire's gold sink, so `theLongRoads` and the coin cards get relatively stronger, and the Library's removed gold (flags note 8) stops threatening the scripted five-town empire with debt. **A re-run of the pacing fixtures is mandatory** |
| Bead deeds | three `prerequisite: buildingInEveryCity` deeds name cut rows — `theGreatGames` (`funeralGames`), `theMint` (`mint`), `theMusterOfTheRealm` (`armoury`, three cities). Each needs a new subject or a new prerequisite shape. `theCathedralOfTheAge` (cathedral) and `theEncyclopaedia` (university) are safe |
| The bot's building wants | the appraisal is per row through the sim's own explainers, so a shorter list needs no code — but `explainCounted`'s **potential** arm reads `potentialTownsFor` for any card naming a building, and a card naming a cut building would price a promise that can never arrive. Every `buildingsOfKind` / `hasBuilding` reference must be re-aimed in the same commit |
| The bot's build order | fewer, larger rows means `turns-amortisation` (Entry LXIV: a 109-point temple losing to an 80-point worker on the divide alone) bites harder. The OFAT baseline wants re-running after the cut |
| The compendium | generated from rows and describers; a cut row simply stops rendering. `retired`-style preservation is **not** available for buildings — a save holding a cut building must still replay, so the rows stay in `data/buildings.json` with a marker (`awaitsTech` is the existing precedent) rather than being deleted |

---

## 3. The augur and the rites

### The loop today

`docs/religion-v2.md` and the data. An augur is called with faith
(`purchase.cost` 40, `increment` 15, exclusive), has **one charge**, and its act
is its whole turn (`augurHasActed`). It may **consecrate** (open a pantheon
belief draft — `consecrateAt`) **or** perform **one rite** (`performRiteAt`).
Seven rites, each gated by a tech (`ABILITY_TECH`), the Chapel (`ritePays` 5)
paying a little culture on top wherever one is performed.

| Step | Clicks | Turns |
|---|---|---|
| call the augur (faith, exclusive, the ladder's next rung) | 1 | 0 |
| walk it to the town | 1–3 | 1–3 |
| choose the rite and target | 2 | 0 |
| **total** | **4–6** | **1–3** |

What it buys, for the turn-92 empire (six cities, 59🕯 a turn, 300 banked):

| Rite | Paid once | Paid per turn | Life | Worth at t92 |
|---|---|---|---|---|
| `riteOfTheHarvest` | +1 citizen | — | — | one citizen, ≈2% of one town |
| `omenReading` | 15🔬 | +1🔬 per science building here (≈3) | 20 | ≈75🔬 total, ≈0.4% of the empire's science a turn |
| `consecrationOfTheBounds` | 15 border culture | +30% of one town's border culture | 20 | roughly one tile |
| `blessingOfArms` | heals whole | +5 strength | 5 | ≈20% of one mid-age unit, once |
| `riteOfPlenty` | 25💰 | +1💰 per resource hex here (≈3) | 20 | ≈85💰 total, ≈0.6% of the empire's gold a turn |
| `thePreaching` | a pressure lump, range 4, 20 | — | — | a few converts |
| `recastingTheOmens` | redraws a pantheon belief | — | — | a real choice, once |

**Against a draft** — two clicks, 3–8% of a voice, and rising. Four to six
clicks for under one percent is the worst value-per-click in the game, and the
user's sentence *"I was so far ahead and didn't want to waste time"* is the
correct read of it: a rite is a chore whose payoff is invisible even when it
works. Note the shape of the failure — it is **not** that the numbers are small.
Doubling every rite would still leave a four-click errand.

### Three options

| | **A — the rite is a city verb** | **B — the augur folds into the prophet** | **C — one augur, era-scale** |
|---|---|---|---|
| **What it is** | no unit; a city with the door pays faith and performs a rite on itself. Cooldown as a per-city seal (absolute turn, `City.purchasedUnitTurns`' shape) | the augur is retired; the prophet is the one religious piece; rites fold into consecrations and follower beliefs, so faith is mostly passive | the augur stays, is dear and rare, and its rites run for an age rather than twenty turns |
| **Clicks per act** | 1 | 0 (passive) | 4–6, but a handful of times per game |
| **The Chapel** | **becomes the door** — the building that lets a town call a rite at all, and keeps its culture rider. A real build for the first time | **cut**; `ritesCharter` re-cut to something else | unchanged, still weak |
| **The prophet** | unchanged (founding, beliefs, the proclamation lump) | absorbs the consecration; the pantheon then arrives at The High Temple instead of Divination — **an age later**, which is a large pacing change | unchanged |
| **Consecrations** | stay on the augur, which survives as the **consecrator only**: a rare, decisive piece that drafts a pantheon belief | move to the prophet | unchanged |
| **The tech gifts** (`ABILITY_TECH` rites) | keep their meaning — a tech opens a rite the *city* may call. `docs/design-notes.md`'s Entry LXIII rule (abilities head by their bearer) re-heads them to the Chapel | **lost** — five ability-techs stop granting anything and need new gifts | unchanged |
| **The bot** | `faithPlan` / `explainRites` (`src/ai/wants.ts`) simplifies: a rite becomes a purchase-shaped want priced per city, not a roster walk. The known debt "rites in roster order" (Entry LXIV) closes | simplest of the three; the faith appetite becomes a belief plan alone | unchanged; the debt stays |
| **Saves / schema** | `performRite` changes shape (a city, not a unit); the augur row is kept for replay with its purchase gated; `chargedAugurs` (`CountKind`) loses its subject and the pantheon belief **Court Augurs** must be re-cut. **Schema bump** | larger: two unit rows retired, the belief ladder's gate moves. **Schema bump** | none |
| **Risk** | the city screen grows a verb; a rite performed on the city that pays for it removes the "walk it somewhere useful" decision — which was never a decision anyone enjoyed | the pantheon arriving an age late is a real loss; Æra I loses its one religious act | does nothing about clicks-per-value; the user's complaint stands |

### Recommendation — **A**, with the augur kept as the consecrator

- **Value per click** is the whole brief, and A is the only option that changes
  it by an order of magnitude (4–6 clicks → 1).
- The two acts an augur can perform have wildly different worth: the
  **consecration** opens a belief draft — an era-defining choice, worth walking
  a piece for and worth the exclusivity — and the **rite** is an errand. Split
  them by their size rather than cutting both. The augur then appears two to
  four times in a game, always for a big choice, which is exactly "bigger and
  rarer" applied to a unit.
- The Chapel finally has an answer to *what is it for*: it is the door, and it
  is a Æra I charter (`ritesCharter`), so a faith deck's first card buys a real
  building rather than a flat.
- B's cost is hidden and large: the pantheon is Æra I's only religious decision
  and moving it to The High Temple takes the identity out of the opening.
- C keeps the errand and only makes it rarer, which trades tedium for
  irrelevance.

**The dial A needs**: the faith price per rite (the augur's ladder, re-based per
city), and the per-city seal in turns. Both are `data/religion.json` rows and
both are the user's to set — §6.

---

## 4. The synergy proposal — engines, payoffs, and tags

### The finding this rests on

| Role, by classifier over the 158 live Order rows | Count | Share |
|---|---|---|
| reads the deck (counts slotted Orders by **slot flavour**) | 7 | 4% |
| amplifies another system's figure (`effectAmplifier`) | 2 | 1% |
| unlocks a building (a charter — a door, not a reader) | 11 | 7% |
| scales with something the empire built or holds | ~71 | 45% |
| pays a flat number, or a number scoped to a site | ~67 | 42% |

The seven readers are `firstRites`, `oreTithes`, `provincialGovernors`,
`theArchives`, `theAnnalsOfLaw`, `theGuildCharter`, `theSynod`; two more
(`borderWardens`, `theWarCouncil`) read the deck for *strength* through
`CombatScale`. **Every one of them counts slot flavour — military, economic,
wildcard — which is the least interesting fact about a card.** A wildcard slot
holds a faith card and a growth card and an exploration card; counting it says
nothing about a strategy.

Meanwhile `CardLine` — twelve threads, one on every Order, Doctrine and
Government row, each with a drawn mark in `src/art/lineMarks.ts` — is
**presentation only**, by its own docblock. The tag family is built, drawn, and
switched off.

### The proposed tags

Twelve lines is too many for an 8–11 chair government; the distribution today is
also badly lumpy (`forge` 35 rows, `highlands` 1) and `forge` conflates soldiers
with hammers, which makes it unusable as an engine's subject. Consolidate to
**six**, each a family a deck can commit to:

| Tag | From today's lines | Live Order rows | What the path *is* |
|---|---|---|---|
| **Procession** 🕯 | `procession` (+ `cloister`) | 18 | faith converted into the primary voices — only when stacked |
| **Forge** ⚒ | `forge` · `hunt` · `highlands` | 41 | hammers and soldiers; and the payoff that makes a war pay a **peacetime** voice |
| **Caravan** 💰 | `caravan` | 24 | gold, routes, roads, coast; the multiplier rides the map |
| **Ploughshare** 🌾 | `green` · `ploughshare` · `charter` | 26 | food and ground; growth itself pays a second voice |
| **Star** 🔬 | `star` · `wayfarers` | 15 | learning and reveal; a technology completing is the occasion |
| **Court** 🏛 | `court` (+ the untagged deck-readers) | 9 + the reassignment of `none` | wonders, great people, renown, and the deck reading itself |

The 25 rows carrying `line: 'none'` are reassigned by what they pay (the writ
rows to Court, the war rows to Forge, and so on). `forge` at 41 rows is still
the largest family and should probably be split at the pass — **flagged for
markup**, because a split is a naming decision, not an arithmetic one.

Doctrines carry a line too and would count; **beliefs should not** — a follower
belief is city-local and pays whoever owns the town, so counting it toward an
empire tag would pay a rival's faith to the wrong deck. Recommendation: the tag
count reads **slotted Orders only**; doctrines and beliefs act as payoffs
instead of as fuel.

### The three roles, and the share

| Role | What it is | Alone | With three friends | Rarity |
|---|---|---|---|---|
| **Engine** | reads the deck: "+1🕯 in every city for each Procession Order slotted", "your rites last twice as long", "each Forge card you hold pays +1⚒ in its town" | nearly nothing | multiplies | ● / ◆ |
| **Payoff** | scales with what is slotted, held or built: "+3% science per Star Order slotted", "your faith pays again as science, a share per Procession Order" | small | the reason the deck exists | ○ |
| **Standalone** | the honest flat, tagged | its number | its number, plus whatever counts it | ● / ◆ |

**Proposed share per pool: 25% engines · 30% payoffs · 45% standalones.**

This differs from the brief's 40/35/25 and the reason is the worked deck below:
a committed eleven-chair deck used **one engine, three payoffs and seven tagged
standalones**. Standalones are not the residue — they are the *fuel*, and a pool
that is mostly engines is a pool where nothing is ever worth slotting first.
What makes them fuel rather than filler is that every one carries a tag.

**And the power rule, which is the whole pass in one line:**

> **The multiplier rides the role.** A standalone keeps today's number. An
> engine and a payoff take the pool's multiplier (`docs/balance-turn.md` §3's
> table — Æra III at ×1.75). The deck's power rises only where the deck talks
> to itself.

Consequence: an uncommitted pile plays *exactly as it does today* — it is not
punished, it simply stops being the ceiling. A committed deck is the spike. That
is a better answer than making the generic pile worse, which would tax the
first-time player for not yet knowing the tags.

### The shapes this needs

| # | Shape | Where | Precedent | Verdict |
|---|---|---|---|---|
| 1 | **`slottedOrdersOfLine`** — a `CountKind` member with a `line` argument on `CardCountScaledEffect`, plus its twin in `CombatScaleCount` (a strength line must be able to read a tag too) | `statecraftData.ts` (two unions), one arm each in `countOf` and `combatScaleCount`, one entry in `COUNT_WORDS` | `slottedOrdersOfSlot` is this shape exactly, with `slot` where `line` would go — including the two-union split, which that member already pays for | **REQUIRED** |
| 2 | **`EmpireCondition: { test: 'slottedLineAtLeast', line, value }`** | one member, one arm in the condition evaluator; `conditionRule` already wraps any clause | `cityCountAtLeast`; and `docs/card-shapes.md` named this the biggest return in that doc and it was never built | **RECOMMENDED** — it buys threshold engines ("while three or more Procession Orders are slotted…") and the honest version of Border Wardens' switch, which shipped as a lie in 2026-09-05 |
| 3 | `AmplifierTarget: 'lineYields'` — "your Procession cards pay half again" | the central `liveEffects` fold would have to know which card each line came from | the Ledger's band 1 buckets by card id, so provenance exists | **DEFER** — it reaches the one fold every card passes through, and the bot cannot price it (it falls to `unknownEffect`) |

**A payoff needs no shape beyond #1.** `CardPayout` already carries
`{ to: 'percent', yield, percent, stage }` — `theGuildCompact` uses it — so
"+3% science for every Star Order slotted" is a `countScaled` over the new count
paying a percent, and it is expressible the day #1 lands.

One further change is a **draw rule**, not a card shape:

| Lever | Shape | Why |
|---|---|---|
| **The line guarantee** | one face of every hand drawn from the tag the player has the most of | with six tags and three faces, a committed player sees their own line on 42% of hands; a path that needs four cards then takes most of the game to assemble. `drawOrderOffer` already partitions into three guaranteed sub-bags, so this is that machinery asked a second question |

### Which existing rows fit which role

**Already engines (convert by swapping the count — a value change plus shape #1):**

| id | Today | Becomes |
|---|---|---|
| `firstRites` | +1🕯 per wildcard slotted | per **Procession** slotted |
| `theSynod` | +1🕯 +1🎵 per wildcard slotted | per **Procession** slotted |
| `theGuildCharter` | +2💰 +1⚒ per economic slotted | per **Caravan** slotted |
| `oreTithes` | +1⚒ capital per military slotted | per **Forge** slotted |
| `theWarCouncil` | +1 strength per military slotted | per **Forge** slotted (`CombatScale` twin) |
| `borderWardens` | +1 strength per military slotted | per **Forge** slotted, and with shape #2 the *switch* the row was written to have |
| `provincialGovernors` | +1 writ per economic slotted | per **Ploughshare** slotted (expansion as a deck commitment) |
| `theArchives` | +1🎵 per Order slotted | untagged reader — the deck's own floor; **keep** as the one tagless engine |
| `theAnnalsOfLaw` | +2🎵 per benched Order | unchanged — the bench reader, and it gets better as chairs shrink |
| `assemblyHall` · `smithy` (charter buildings) | count wildcard / military slotted | per **Court** / per **Forge** |
| `theEscortedRoads` · `theSalon` | amplifiers | unchanged |

Eleven rows, all of which become tag engines by editing two fields.

**Already payoffs (scale with what the empire built or holds — keep the shape,
take the multiplier):** `theOldWays`, `theMastersPresence`, `theHarvestSongs`,
`theGoldenScales`, `theDraftingHalls`, `theGranaryLaws`, `theSaltingHouses`,
`harbourDues`, `theCongregation`, `censusOfSouls`, `theCensusEternal`,
`theFarCharts`, `theCartographers`, `theLongRoads`, `provincialMints`,
`saltTithes`, `theTaxFarm`, `statuteLabour`, `theConsistory`, `theInquisition`,
`theChoir`, `lamplighters`, `theLyceum`, and the doctrines `theTithe`,
`cuiusRegio`, `thePilgrimWays`, `theAcademyOfDeeds`.

**Need shape #1 to exist at all — the missing role.** The pool has no card that
says "the more of this line you run, the better this is". Every tag needs one
engine and one tag-scaled payoff per pool from Government II up; that is the
new-row budget of this pass, and it is roughly **two rows per tag per pool**.

**What each path has to be**, so that no path is a side dish:

| Tag | The engine reads | The payoff converts | Why the path changes how you play |
|---|---|---|---|
| **Procession** | Procession cards slotted → faith in every city | faith → science · culture · production, a share per Procession card | faith stops being a fourth wheel and becomes the *source* of the primary voices; Temples everywhere, the Chapel, faith purchases |
| **Forge** | Forge cards slotted → hammers, and strength through `CombatScale` | production → gold and science in Barracks/Forge towns; a captured town pays yields, not just ground | the audit's 35 dead war rows read zero **at peace**; a Forge path must pay a peacetime voice or it will always be the trap it is today |
| **Caravan** | Caravan cards slotted → gold per route and per road hex | gold → every other voice, a share per Caravan card (`theGoldenScales` is the model) | roads and routes become the multiplier; the map is the deck |
| **Ploughshare** | Ploughshare cards slotted → food in every town | food → science and culture (`theGranaryLaws`, `theHarvestSongs` are already the model), and growth itself pays | the tall/wide question becomes a deck question |
| **Star** | Star cards slotted → beakers per Library and per hex revealed | a technology completing pays a share of a voice, sized per Star card (`theLyceum` is the model) | the tree's tempo becomes the payoff, so beelining is a build |
| **Court** | Court cards slotted → renown, offers, and percents beside great works | +1% to every yield per Court card slotted, and wonders paying twice | the wonder line stops being a trap without touching a wonder row |

### Three worked decks, against the turn-92 empire

The empire (`docs/flags.md` note 17): 🌾211 ⚒131 💰143 🔬200 🎵195 🕯59 —
939 points across the six voices. Assumptions are `docs/balance-turn.md` §0's
(six cities, sixty citizens, a Temple and a Library in each, three great works,
three routes, six unique luxuries).

**Deck 1 — the generic pile (today, eleven chairs, the strongest tag-blind set):**

| Row | Pays at t92 |
|---|---|
| `theLongRoads` | 45💰 |
| `theFarCharts` | 35🔬 |
| `scholarsStipend` | 20🔬 |
| `theGranaryLaws` | 18🔬 |
| `theCensusEternal` | 15🔬 |
| `theLyceum` | 24🎵 |
| `theHarvestSongs` | 21🎵 |
| `theAnnalsOfLaw` | 16🎵 |
| `theTaxFarm` | 15💰 |
| `statuteLabour` | 12⚒ |
| `censusOfSouls` | 12🕯 |
| **total** | **60💰 · 88🔬 · 61🎵 · 12⚒ · 12🕯 = 233 points, 25% of the empire** |

**Deck 2 — a committed Procession deck under the proposal (eleven chairs, all
six tagged Procession or better):**

| Row | Role | Pays |
|---|---|---|
| `waysideShrines` | standalone | 6🕯 |
| `thePilgrimsPurse` | standalone | 5🕯 |
| `theSaintsFields` | standalone | 9🕯 |
| `theConsistory` | payoff (per Temple) | 12🕯 |
| `censusOfSouls` | payoff (per capital citizen) | 12🕯 |
| `theChoir` | standalone | 12🎵 |
| `theInquisition` | payoff (per Temple town) | 18🕯 · 18🎵 |
| **The Litany** *(NEW engine)* — +1🕯 in every city per Procession Order slotted | engine | 11 × 6 = **66🕯** |
| `lamplighters` *(re-shaped, +1🎵 per 2🕯)* | payoff | 93🎵 |
| **The Golden Censer** *(NEW payoff)* — faith pays again as science, 3% per Procession Order | payoff | 33% of 187🕯 = **61🔬** |
| **The Masons of the Faith** *(NEW payoff)* — +2% production per Procession Order, in Temple towns | payoff | 22% of 131⚒ = **28⚒** |
| **total** | | **128🕯 · 123🎵 · 61🔬 · 28⚒ = 340 points, 27% of a much larger empire** |

The empire after: 🌾211 ⚒159 💰143 🔬261 🎵318 🕯187 — 1279 points against 939.
**The committed deck out-pays the generic pile by 46%**, and — the part the
numbers cannot show — it changes what gets built (a Temple in every town, a
Chapel worth raising, faith purchases worth opening) and what gets played (the
tide, the consecrations, the prophet's timing).

**The Litany alone**, in a deck with no other Procession card, pays 6🕯 — a
twentieth of what it pays above, and a tenth of what an honest flat would pay
for the same chair. **That is the card the user asked for.**

**Deck 3 — the uncommitted pile under the proposal (eleven chairs, one or two of
each tag):** the six standalones pay their unchanged numbers; the three payoffs
fire on one or two helpings each; the two engines pay almost nothing. Roughly
**110–130 points** — about half of Deck 1, and about a third of Deck 2. This is
the design working: the pile is not nerfed (its standalones kept their numbers);
it simply is no longer the best a hand can do.

### Making the combo visible at the draft

An engine that cannot be seen is a trap. The draft must show, on the face and in
the hand:

| Surface | What it must print | Status |
|---|---|---|
| The tarot face | the tag glyph and name in the eyebrow | `CardLine` already has drawn marks; a presentation change |
| The offer, per face | "you hold N of this line · M slotted" | new, one line per face |
| The standing face | "has produced" — the lifetime tally per owned order, per voice | `docs/flags.md` note 5, the stamp design's phase 2 — **schema, already specified, waiting on `cities.ts`** |
| The Ledger | the deck's slice per voice, already built (bands 1–2); band 3 is the same tally | `docs/loop-review.md` §3 |
| The Statecraft screen | chairs grouped by tag, so the council reads as a deck | new, presentation |

Without the tally and the per-face count, an engine is indistinguishable from a
weak flat, and the pass fails on legibility rather than on arithmetic. **Phase 2
of the stamp is a dependency of this pass, not a nice-to-have.**

### Rarity: engines common, payoffs rare

The recommendation, and the argument:

- An engine must be **reliably available** or a path cannot be assembled. A
  rare engine is a strategy that depends on a coin flip, and the pool's history
  already shows what that produces — `theFoundingOath` is a rare that pays less
  than a twentieth of any voice, and it is the Chiefdom pool's *only* rare.
- `docs/cards-pass-2.md` §E.6 ruled that ○ means **rule-changer, not bigger
  number**. A payoff that scales with a whole tag *is* a rule-changer: it turns
  every other card in that family into a multiplier. That ruling was never
  carried out (the balance turn's audit says so); this is the pass that carries
  it out.
- The **pass** becomes a real decision for the first time: a committed player
  who is dealt an off-line hand passes, banks `skipPity`, and is pushed by the
  weighting toward the rare payoff. That is the Balatro moment — turning down a
  good card because your deck wants a different one — and it only exists if the
  rares are the payoffs.
- The counter-argument, honestly: in Balatro the rare jokers *are* often the
  engines. It does not carry here, because Balatro deals a shop every round and
  we deal a hand every four to eight turns. At our cadence, reliability is worth
  more than surprise.

---

## 5. Interactions, and the order of work

### The balance turn: partly superseded

| `docs/balance-turn.md` | Verdict |
|---|---|
| §0–§2 — the scale, the row-by-row audit, the diagnosis, the six failure modes | **stands.** It is the measurement of record and this doc is built on it |
| §3 — the proposed multiplier per pool and the row-by-row new numbers | **held.** Do not apply it before the tag pass: it raises rows whose *role* is about to change, and a standalone that took the Æra III multiplier would then have to be cut back. Re-derive §3 after §4 lands, with the multiplier riding the role |
| §4a–§4g — the nerf side (building flats −25%, `library.sciencePerPop`, Entry LIV's supply trim, leave tiles/wonders/beliefs/techs) | **stands, and is subsumed.** §2's cut list is a larger version of the same move: it removes the flats rather than shrinking them. Entry LIV's trim (writ and cheer leaving buildings) is *implemented* by the cut list — `monument`, `steleOfLaws`, `examinationHall`, `funeralGames`, `baths` were the rows in question |
| §5 — interactions | **stands**, and everything in it applies twice over here |
| §6 — the six decisions | five of the six are re-asked in §6 below, in this pass's terms |

### What else moves

| Surface | What moves |
|---|---|
| `src/ai/wants.ts` — `draftPlan`, `expectedBestOrder` | **the largest bot debt this pass creates.** Both score a card *in isolation* through `inputs.cardWorth`. An engine scores near zero on its own, so the bot will never draft one, and will therefore never build a combo deck. The fix is a **marginal** reading — `V(deck ∪ card) − V(deck)` — which needs `countOf` to be askable hypothetically, and it is not (the same wall the "hypothetical percents unpriced" debt names). Write it down; it is a batch of its own |
| `src/ai/value.ts` — `explainCounted` | prices `countScaled` through the simulation's own `countOf`, so the new count is priced **honestly for free** the day it lands. This is why shape #1 is cheap and shape #3 is not (an amplifier falls to `score.unknownEffect`) |
| `src/ai/wants.ts` — `faithPlan`, `explainRites` | §3 option A simplifies both and closes the "rites in roster order" debt |
| The bot's building wants | §2 — every card naming a cut building must be re-aimed or `potentialTownsFor` prices a promise that cannot arrive |
| `test/sim/statecraftPacing.slow.test.ts` | the cadence band and all three tier bands move on the exponent alone; then again on the deck's power. Read the cadence band first |
| `test/sim/tech.slow.test.ts` · `endgame.slow.test.ts` | age turns and bead pace; the science payoffs are the largest movers, and the bands are two-sided |
| `test/sim/statecraftDocSync.test.ts` | pins name and rarity per pool. **A tag column is new data and wants its own sync**, on the doc-table pattern (`docs/orders-and-doctrines.md` grows a Line column, pinned) |
| `test/sim/statecraft.test.ts` | the fold registry is pinned there; a new `CountKind` arm and a new `EmpireCondition` arm each join it, and a shape declared but never read fails the register test |
| `test/sim/cardImpact.test.ts` · `growingOrders.test.ts` | every re-shaped row's stamp changes |
| The compendium | generated; it follows for free, except that a tag needs a word in the describers (`COUNT_WORDS` gets the line's name) |
| Saves | a new count, a new condition, twelve buildings retired, `performRite`'s shape, the tally: **one schema bump covers the batch if they land together**, several if they do not |
| The arena | no page edit — the panel walks `data/ai.json` and this pass adds no bot knob except, eventually, whatever the marginal draft reading needs |

### The order of work

The brief's suggested order was tags → orders → buildings → augur. One change
is recommended, for one reason: **the buildings the cards count should be
settled before the cards that count them are written**, but the *cut* is a pure
data pass with no new shape and no dependency on tags. So:

| | Step | Why here |
|---|---|---|
| 1 | **The augur** (§3 option A) | entirely self-contained, removes the worst clicks in the game, and answers the user's first sentence. One command shape, one schema, one belief re-cut |
| 2 | **Tags** — shape #1, the six-family consolidation, the tag on the face and in the offer | landing tags alone changes no number on the board (every row already carries a line), so it is the safest possible sim step, and everything downstream reads it |
| 3 | **The buildings cut** (§2) | pure data plus three bead re-aims and one wonder grant; must precede the order pass so the surviving cards count surviving rows |
| 4 | **The order pass** — roles, shares, the new engines and payoffs, shape #2, and `docs/balance-turn.md` §3's numbers re-derived on top | the big one; needs 2 and 3 settled |
| 5 | **Cadence and chairs** (§1's levers) | last, tuned against the pacing harness once the deck's real power is known — tuning cadence before step 4 would be tuning against the old deck |

Steps 1 and 2 can run in parallel on disjoint fences (`religion.ts` /
`statecraftData.ts`). Steps 3, 4, 5 are sequential.

---

## 6. For your markup — the decisions only you can make

1. **The augur.** §3 recommends **A**: rites become a city verb paid in faith
   with the Chapel as the door and a per-city seal, and the augur survives as
   the **consecrator only** — a rare piece bought two to four times a game for a
   pantheon belief. The alternatives are B (fold the augur into the prophet;
   faith goes passive; the pantheon arrives an age later) and C (keep the errand,
   make it rarer). **Recommended: A.** Two numbers ride on it and are yours: the
   faith a rite costs, and how many turns a town must wait between rites.

2. **How many buildings, and which.** §2 cuts the 38 ordinary rows to 19, of
   which 7 are merges. The list is per-age and per-row; strike any line. The one
   judgement worth a second look is **`examinationHall`** — cutting it puts writ
   entirely in cards and two charter buildings, which is Entry LIV's thesis
   carried out in full and is the single biggest change to tall-versus-wide in
   the cut. **Recommended: take the whole list**, since half a cut leaves the
   duplication the complaint was about.

3. **The tags: six families, and what to do with `forge`.** §4 proposes
   Procession · Forge · Caravan · Ploughshare · Star · Court, consolidating
   today's twelve lines. `forge` at 41 rows is nearly a third of the deck and
   mixes soldiers with hammers; splitting it into **War** and **Works** would
   give seven tags and a cleaner Forge path, at the cost of one more family for
   the player to track. **Recommended: split it** — a tag that means two things
   cannot be an engine's subject.

4. **The role shares, and the power rule.** §4 proposes **25% engines · 30%
   payoffs · 45% standalones** per pool, with the multiplier riding the role: a
   standalone keeps today's number, an engine and a payoff take
   `docs/balance-turn.md` §3's pool multiplier. The alternative is the brief's
   40/35/25, which the worked deck argues against — a committed deck needs more
   fuel than glue. **Recommended: 25/30/45 with the power rule.**

5. **Rarity.** §4 recommends **engines common and uncommon, payoffs rare**,
   which finally carries out `docs/cards-pass-2.md` §E.6's ruling that ○ means
   rule-changer. The alternative is the reverse (rare engines, common payoffs),
   which is Balatro's own distribution and does not survive our draft cadence.
   A rarity move changes the draw bag and therefore costs a schema bump either
   way. **Recommended: engines common, payoffs rare.**

6. **Cadence and chairs.** §1 proposes `meter.costExponent` 2.25 → 2.8 (20
   drafts by t92 → 14, opening drafts unmoved) **and** slot counts down a
   quarter (Gov III 11 chairs → 8), so that chairs stay contested at the lower
   draft count. They are one decision: moving either alone breaks the tension
   the other holds. The seal stays at 5 turns — ruled, untouched.
   **Recommended: take both, and tune them last, after the deck's power is
   known.**

7. **The line guarantee.** With six tags and three faces, a committed player
   sees their own line on 42% of hands. §4 proposes one guaranteed face drawn
   from the tag the player holds most of — the M/E/W sub-bag machinery asked a
   second question. It is a draw rule, not a card shape, and it is the
   difference between a path being buildable and being lucky.
   **Recommended: yes.** The alternative is a wider offer, which makes every
   draft slower rather than sharper.

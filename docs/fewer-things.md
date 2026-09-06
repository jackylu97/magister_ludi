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

**Status.** This is the second revision (the user's first markup and the
conversation of 2026-09-06 folded in). Every table marks its rows one of three
ways: **RULED** (the user marked it, or said it), **proposed** (unmarked —
stands until struck), **OPEN** (a question only the user can answer; all of
them are gathered in §6). **Nothing under `data/` or `src/` moves until §6 is
marked.** The master row lists stay `docs/orders-and-doctrines.md` and
`data/buildings.json`; the measurement of record stays `docs/balance-turn.md`
(marked up 2026-09-06; its §7 carries the answers to that markup).

---

## 0. Where the data disagrees with the frame

Two of the assumptions this pass started from do not survive the arithmetic.

| Assumption | What the data says | Consequence |
|---|---|---|
| "The draft is too rare — Entry XV wanted one every five turns and the harness measured 9.3" | Against the **user's** culture curve the ladder deals a draft every 4–5 turns from turn 4 to turn 90, and the model reproduces the user's t92 state exactly (20 drafts, 19 orders held) — §1's ladder table. The 9.3 reading was the bot's | `docs/cards-pass-2.md` §E.3 ("more drafts, smaller cards") is **wrong for a human empire** and is superseded here. The cadence is already at target; the size is not |
| "The deck has readers and conversions; the pass is about ratio" | Of 158 live Order rows, **nine** read anything about the player's other cards — seven count slotted Orders by *slot flavour*, two amplify another system's figure. **Not one reads a card's line.** `CardLine` exists on every row and is presentation only by its own docblock | The synergy problem is not a ratio problem. The vocabulary for "this card reads my other cards" is one count wide and asks the wrong question — and the user's answer (§4) is to read the *board* rather than the cards' colours |

---

## 1. The choice-size ladder

### What a decision costs and what it moves, today

Estimates for the user's turn-92 empire (six cities, four military pieces,
three traders, two or three workers). Card weights are `docs/balance-turn.md`'s
audit; the rest is estimated from the board.

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
one frequent decision that could be large is sized like a small one.

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
The ladder is not the problem; the size of what it deals is.

### The target ladder

| Tier | Today, per ten turns | Target | How | Status |
|---|---|---|---|---|
| Era-defining | 1 | 1 | unchanged | — |
| The draft | 2.2 | **1.4** | `costExponent` 2.25 → 2.8; each card worth roughly twice today | **RULED** (third pass) |
| Research | 1.3 | 1.3 | unchanged (the queue absorbs the clicks) | — |
| Production | ~10 | **6** | §2's cut list, with prerequisite chains — fewer rows, each a longer build | RULED in shape; the list is §2 |
| Citizen focus / locks | 1 | 1 | unchanged | — |
| Worker verbs | ~8 | **3** | prospectable hills are **marked** once the tech is held; the survey stays a choice (`docs/veins.md`, in flight) | **RULED** (third pass) |
| Rites | 1.5 at 4–6 clicks | **0.5 at 1 click** | rites are city verbs (§3) | **RULED** |
| Unit orders | 40–70 | 40–70 | not a design problem; sleep, fortify and route persistence carry it | — |

### The levers, one per row

| Lever | Today | Proposed | Status |
|---|---|---|---|
| Draft cadence (`meter.costExponent`) | 2.25 | **2.8** — 20 drafts by t92 → 14; opening drafts land on the same turns (4, 7, 11); late gaps open to 8–10. A multiplier on all three terms barely moves the count (the ladder is super-linear); only the exponent does | **RULED** (third pass), tuned last |
| Slot count | Gov III 11 chairs (2/5/4 · 5/3/3 · 3/3/5) | **−25%, Gov III to 8, and Gov IV and V down commensurately** — at 14 drafts and 11 chairs, chairs stop being contested; at 8 the seal keeps biting. `theAnnalsOfLaw` (per benched card) gets better; `theArchives` (per slotted) worse | **RULED** (third pass), one decision with the cadence |
| Seal length | 5 turns | 5 turns | **RULED, untouched** (2026-09-05: slot-in/out is skill expression) |
| Slot order | typed, unordered | **the arrangement the screen draws is the order**: the topmost economic slot is "the first economic slot". Rearranging is a placement like any other, unconfirmed until Confirm | **RULED** (2026-09-06) |
| The reveal | a card shows its stamp the moment it is slotted | **a newly slotted card shows no yields until Confirm.** On Confirm the fold runs in order — base lines, then modifiers — and the **aggregate** fires with the count-up ("your cards: +31⚒ +18🔬 +40🎵"). The draft keeps its per-card stamp; only the *slotting* waits | **RULED** (2026-09-06) |
| Cards per offer | 3 (max 5) | 3 | proposed |
| The pass | spends the hand, `skipPity` +1 to uncommon and rare | unchanged; it now has a *reason* — pass an off-line hand toward the payoff you want | proposed |
| **The reroll** | the Magister's dice (`Player.dice`, bead boons' `dice`, `startingDice`, Chronology's die) — nothing spends them | **the dice go entirely; faith rerolls a draft.** The price scales by age and by rerolls taken so far, and the button prints the *next* price so the rise is visible before the click — "used sparingly" is the design | **RULED** (2026-09-06); the price curve is **OPEN** (§6.5) |
| Ordinary buildings per age | 8 · 6 · 11 · 13 | **7 · 5 · 5 · 9** (§2, after the user's keeps) | RULED per row where marked; §2 says which |
| Verbs that go passive | `prospect` on a vein; `survey` | prospectable hills are marked once the tech is held; veins may hide **unique luxuries** (rare minerals) with powerful bonuses — `docs/veins.md` | **RULED** (third pass) |

### What "bigger and rarer" does to pacing and to the bot

- **Culture pacing.** Culture fills one pool for two purposes (the draft basket
  and, separately, `City.culture` for borders). Slowing the ladder makes the
  *basket* dearer without touching borders. The four culture-conversion rows
  (`theHarvestSongs`, `theLyceum`, `theArchives`, `theAnnalsOfLaw`) sit in the
  feedback loop the balance turn flagged: a stronger deck drafts faster, which
  strengthens the deck. A steeper exponent damps that loop.
- **The pacing harness.** `test/sim/statecraftPacing.slow.test.ts` bands the
  cadence and the three government tiers. A steeper exponent moves every one of
  them, and the tier bands are two-sided.
- **The bot's draft plan.** `draftPlan` (`src/ai/wants.ts`) prices a draft as
  `E[best of the hand] − the worst card it would bench`, discounted by
  `delayTerm`. A steeper ladder raises that delay, so the bot values culture
  less early and more late — correct without an edit. It needs a real one for
  engines (§5).

---

## 2. The building cut list

**Target**: fewer ordinary buildings, **no survivor only a flat**, every
survivor a *shape* (per-citizen · percentage · conditional · count) or a *door*
(a route slot, faith purchases, a site), and — **RULED** on the first markup —
**prerequisite chains**: a building that needs its parent standing in the same
town (Stone Walls need a Palisade; Amphitheater a Monument; University a
Library; Bazaar and Bank a Market; Shipyard a Harbour). The chain is the shape
that makes a tall town different from a wide one: three decisions in one town
where the flat list was three unrelated rows.

**The chain is a new schema field** — `BuildingDef.requiresBuilding` — read in
`buildError` (the sentence names the parent) and shown on the add-list row and
the compendium entry. One field, one clause, the doc tables say so.

Counts today, from `data/buildings.json` (83 rows):

| Class | Rows |
|---|---|
| ordinary, tech-unlocked | 38 |
| wonders | 27 |
| card-unlocked (charters + the Gilded Hall) | 12 |
| once-per-empire national rows (`chartTheStars`, `theTurningHeavens`, `theAlchemicalCodex`) | 3 |
| the Magnum Opus | 1 |
| parked (`awaitsTech`: `bastion`, `hallOfDeeds`) | 2 |

The tables touch the **38 ordinary rows only**. Shape: `flat` · `per-citizen`
· `%` · `cond` · `count` · `door` · `def`. Status: **RULED** where the user
edited the row; **proposed** where the row stands unmarked.

### Æra I — Omens (8 rows → 7)

| id | Name | What it does | Shape | Verdict | Status |
|---|---|---|---|---|---|
| `monument` | Monument | 2🎵, +1 writ capacity | flat | **KEEP** — the culture door; borders and the draft basket both start here. Keeps its flat (no per-citizen line). Writ line **cut** (balance-turn §4g) | RULED |
| `granary` | Granary | 3🌾 | flat | **KEEP** — becomes the growth shape: a share of the basket kept on a growth (the clause cut with Public Granaries, at a number that reads) | proposed |
| `shrine` | Shrine | 1🔬 1🕯 | flat | **KEEP** — the faith door (the pantheon, and under §3 the first rung of the faith ladder). Science line **cut** — the Library's job | proposed |
| `barracks` | Barracks | +10% units, general renown | % | **KEEP** — the war door. Absorbs `armoury` | proposed |
| `palisade` | Palisade | +5 defence, +15 hp | def | **KEEP** — the first defensive rung; Stone Walls chain from it | RULED (by the walls' chain) |
| `funeralGames` | Funeral Games | 3😊 | flat | **CUT** — cheer belongs in cards (Entry LIV). The deed `theGreatGames` re-aims | proposed |
| `library` | Library | 2🔬, 1🔬 per citizen | per-citizen | **KEEP** — the archetype. Takes balance-turn's numbers (the markup there cut `sciencePerPop` — see balance-turn §7's caution on the base beaker) | RULED |
| `lighthouse` | Lighthouse | 2💰, water hexes feed | flat + tile line | **KEEP** | RULED |

### Æra II — Heroes (6 rows → 5, plus one national row)

| id | Name | What it does | Shape | Verdict | Status |
|---|---|---|---|---|---|
| `temple` | Temple | 2🕯; doubles own pressure, foreign to 75% | cond | **KEEP** — the faith engine's subject; five Order rows and Notre-Dame count it; **needs a Shrine**. The user's balance-turn markup makes `theConsistory` "double the yields on your temples" | RULED |
| `market` | Market | 3💰, a route slot | flat + door | **KEEP** — the coin door and the route slot; Bazaar and Bank chain from it. Absorbs `mint`, `caravanserai` | RULED (by the chains) |
| `harbour` | Harbour | 1🌾, a route slot, every worked water hex feeds | door + tile line | **KEEP** — the coastal door; Shipyard chains from it. `lighthouse` stays beside it (the user's keep) | RULED |
| `stoneWalls` | Stone Walls | +4 defence, +25 hp | def | **KEEP** — **needs a Palisade** | RULED |
| `amphitheater` | Amphitheater | 3🎵 | flat → per-citizen | **KEEP** — **+0.5🎵 per citizen; needs a Monument.** The Theatre of Dionysus' completion grant stands (it grants a kept row; the chain is satisfied where a Monument stands, and where it is not the grant is the open question in §6.4) | RULED |
| `steleOfLaws` | Stele of Laws | 3🎵, +1 writ | flat | **CUT** — worse per hammer than the Monument (balance-turn) | proposed |
| `chartTheStars` | Chart the Stars | national, 2🔬, a bead, naval movement | door | **KEEP** — a bead row, not an ordinary building | — |

### Æra III — Empire (11 rows → 5, plus the founding artefact)

| id | Name | What it does | Shape | Verdict | Status |
|---|---|---|---|---|---|
| `aqueduct` | Aqueduct | waters the town, +15% growth surplus | % + cond | **KEEP** | proposed |
| `workshop` | Workshop | 3⚒, +10% toward buildings and wonders | % | **KEEP** — the hammer door | proposed |
| `cathedral` | Cathedral | 3🎵 3🕯 3😊, rolls one of five consecrations, takes contributions | cond + a choice | **KEEP as is** — its roll is its own thing (the *pantheon* consecration is what moves to the faith ladder, not this); absorbs `reliquary` (faith purchases move onto it) | RULED |
| `watermill` | Watermill | 2🌾 1⚒ | flat | **KEEP** | RULED |
| `shipyard` | Shipyard | 1⚒, a route slot, +10% units, water resource hexes | door | **KEEP** — **needs a Harbour** | RULED |
| `townCharter` | Town Charter | 4🌾 2🎵 | flat | **never built** — a founding artefact: gained only by founding a city after daughter cities (the founding cards' subject) | RULED |
| `monastery` | Monastery | 2🎵, 0.25🔬 per citizen | flat | **CUT** — the user's note 15 asks for a rework; the rework is the cut. Its faith identity is the Temple's, its culture the Monument's, its beakers the Library's | proposed (§6.4 asks) |
| `baths` | Baths | 2🌾 2😊 | flat | **CUT** | proposed |
| `forum` | Forum | 3🎵 | flat | **CUT** | proposed |
| `examinationHall` | Examination Hall | 1🔬, +3 writ | flat | **CUT** — writ becomes a card decision (Entry LIV). The single biggest tall-vs-wide change in the cut | proposed (§6.4 asks) |
| `clocktower` | Clocktower | 2🔬 | flat | **CUT** | proposed |

### Æra IV — Cathedrals (13 rows → 9, plus two national rows)

| id | Name | What it does | Shape | Verdict | Status |
|---|---|---|---|---|---|
| `university` | University | 0.75🔬 per citizen | per-citizen | **KEEP** — the second rung of the science shape; **needs a Library**; takes balance-turn's numbers | RULED |
| `bazaar` | Bazaar | 2💰, +1💰 per unique luxury the town can reach | count | **KEEP** — the luxuries system's building; **needs a Market** | RULED |
| `bank` | Bank | 4💰 | flat → per-citizen + % | **KEEP** — **+0.5💰 per citizen, +10%💰; needs a Market** | RULED |
| `courthouse` | Courthouse | 3💰, +2 writ, captured towns only | cond | **KEEP** — the conquest door | proposed |
| `castle` | Castle | +5 defence, +25 hp | def | **KEEP** — the third defensive rung; **needs Stone Walls** | RULED |
| `forge` | Forge | 2⚒, +15% units | % | **KEEP** — absorbs `armoury`; **needs a Workshop** | RULED |
| `observatory` | Observatory | 3🔬, 1🔬 per citizen, +10%🔬 | % + per-citizen | **KEEP** — the balance-turn markup zeroes its per-citizen line; **needs a University** | RULED |
| `alchemicalSociety` | The Alchemical Society | 1🔬 per citizen, +1⚒ per building in this town | count | **KEEP** — a count over the town's own build, and the Codex's site | proposed |
| `reliquary` | The Reliquary | 4😊, faith buys units here, +10%🕯 | door | **MERGE INTO `cathedral`** | proposed |
| `mint` | Mint | 3💰 | flat | **CUT** — the Mint and the Coinworks reconciled (flags §B). The deed `theMint` re-aims | proposed |
| `armoury` | Armoury | 1⚒, +15% units | % | **MERGE INTO `forge`**. The deed `theMusterOfTheRealm` re-aims | proposed |
| `caravanserai` | Caravanserai | 2💰, a route slot | door | **MERGE INTO `market`** | proposed |
| `printingHouse` | Printing House | 2🔬 2🎵 | flat | **CUT** — the Gov V order `printingHouses` re-aims to "+3🎵 per Library; +10% science" (the balance-turn markup already wrote it that way) | proposed |
| `theTurningHeavens` · `theAlchemicalCodex` | — | national, bead-granting | door | **KEEP** | — |

### The tally

| | Today | After | Cut outright | Merged away | Chains |
|---|---|---|---|---|---|
| Æra I | 8 | 7 | 1 | 0 | Palisade → Stone Walls (II) · Monument → Amphitheater (II) |
| Æra II | 6 | 5 | 1 | 0 | Market → Bazaar, Bank (IV) · Harbour → Shipyard (III) |
| Æra III | 11 | 5 (+ the founding artefact) | 5 | 1 | Library → University (IV) |
| Æra IV | 13 | 9 | 2 | 3 | — |
| **Ordinary total** | **38** | **26** | **9** | **4** | ten chains (+ Shrine → Temple · Stone Walls → Castle · University → Observatory · Workshop → Forge) |

What each survivor is *for*: Monument the culture door · Amphitheater the tall
town's second song · Granary growth · Shrine the faith door · Barracks the war
door · Palisade, Stone Walls, Castle the three defensive rungs · Library and
University the science shape · Temple the tide · Market, Harbour, Lighthouse,
Shipyard the trade and coastal doors · Aqueduct and Watermill growth's two
shapes · Workshop and Forge the two hammer shapes · Cathedral the faith
ladder's house · Bazaar and Bank the coin shapes · Courthouse conquest ·
Observatory and the Alchemical Society the two late counts.

### What the cut does to the charters

The twelve card-unlocked rows are untouched and become **more** valuable: with
`mint` gone the Assay House and the Coinworks are the gold line's late shapes
beside the Bank; with `clocktower` and `printingHouse` gone the Scriptorium and
the Orrery are the science line's.

| Charter row | Building | What the cut does |
|---|---|---|
| `coinCharter` · `mintCharter` | Assay House · Coinworks | the late gold build with the Bank; numbers re-derived after the cut |
| `scrivenersCharter` · `stargazersCharter` | Scriptorium · Orrery | same, for science |
| `toolmakersCharter` | Smithy | unchanged — already a deck-reader and the pool's one consequential row |
| `waterwrightsCharter` | Cistern | unchanged |
| `theSenatus` | Assembly Hall | unchanged — with `examinationHall` cut it is one of two writ buildings left |
| `justicesCharter` | Assize Court | rises: writ leaves buildings and lives in cards and these two rows |
| `vigilCharter` | Keep | with Stone Walls kept, the Keep is the *charter* defensive answer between the walls and the Castle — its number re-derived |
| `almshouseCharter` | Almshouse | unchanged |
| `ritesCharter` | **Chapel** | a rite performed in a town holding one pays culture too (`ritePays`) — **not a door**: the user's third-pass answer was "unlock rites where their corresponding augur bonuses were previously", i.e. the tree is the only gate (re-read 2026-09-06 after a misreading made the Chapel a gate) |
| `gildedCourt` (doctrine) | Gilded Hall | unchanged (purchase-only) |

### What the cut does to the wonders

**No wonder is cut in this pass.** `docs/balance-turn.md` §4d reads the wonder
line as the weak build, and halving the ordinary queue raises a wonder's
relative worth for free.

| | |
|---|---|
| **Grants** | `theatreOfDionysus` grants an Amphitheatre — kept; **a grant ignores the chain** (RULED), the sentence says so |
| **Counts that survive** | `circusMaximus` (barracks), `notreDame` (temples), `greatLibrary` (library), `greatZiggurat` (shrine), `hagiaSophia` (temple), `templeOfArtemis` (camps and pastures) all name kept rows |
| **The real duplication is Æra III** | twelve wonders open in one age, five at Theology alone. Flagged, not proposed — a wonder cut is its own pass |

### Maintenance, the deeds, and the bot

| Surface | What moves |
|---|---|
| `explainEmpireGold` | building upkeep is one line per standing building. Cutting thirteen rows removes up to thirteen upkeep lines per fully-built town — the largest gold change in any pass this year, on the *relief* side. **A re-run of the pacing fixtures is mandatory** (they were re-aimed on 2026-09-05 after the Library lost its gold; they move again) |
| Bead deeds | three `buildingInEveryCity` deeds name cut rows — `theGreatGames` (`funeralGames`), `theMint` (`mint`), `theMusterOfTheRealm` (`armoury`). Each needs a new subject. `theCathedralOfTheAge` and `theEncyclopaedia` are safe |
| The bot's building wants | per row through the sim's explainers — a shorter list needs no code; but `explainCounted`'s potential arm prices a card naming a cut building as a promise that never arrives, so every `buildingsOfKind` / `hasBuilding` reference re-aims in the same commit. **Chains are new to the bot**: a University's potential is gated on Libraries standing — `potentialTownsFor` reads the parent |
| The compendium | generated; a cut row stops rendering. A save holding a cut building must still replay, so cut rows stay in `data/buildings.json` behind a marker (`awaitsTech` is the precedent) rather than being deleted |

---

## 3. Religion — the ruled design

### The loop today, for the record

An augur is called with faith (`purchase.cost` 40, `increment` 15,
exclusive), has one charge, and its act is its whole turn. It consecrates (a
pantheon belief draft) **or** performs one of seven tech-gated rites; the
Chapel pays a little culture wherever one is performed.

| Step | Clicks | Turns |
|---|---|---|
| call the augur | 1 | 0 |
| walk it to the town | 1–3 | 1–3 |
| choose the rite and target | 2 | 0 |
| **total** | **4–6** | **1–3** |

For the turn-92 empire the best rite paid under one percent of a voice for
those clicks. The failure is the errand, not the numbers: doubling every rite
would still leave a four-click chore. (The three options this doc first
weighed — city verb / fold into the prophet / one rare augur — are superseded
by the design below; the old table is in git.)

### The design — RULED (the user, first markup)

- **Consecration is automatic**: it happens when a **faith threshold** is
  reached, the culture draft's twin — a faith ladder, the offer drawn once at
  the rung, spent by a command, the same deal-and-flip ceremony. The augur is
  gone.
- **Rites are city verbs**, ten turns each, paid in faith, reworked:

  | rite | what it does, for ten turns |
  |---|---|
  | food | tiles that supply food give one more |
  | gold | resource tiles +1💰 |
  | science | buildings in this city +1🔬 each |
  | culture | +1🎵 on luxury tiles; border growth +30% |
  | military | +5 defence; units heal +5 inside the city's borders |

- **Prophets stay purchasable**, two charges: found or enhance a belief (both
  charges; no holy site planted by it) · plant a holy site (both charges, a
  separate act) · proclamation (one charge, as today) · **an empire-wide rite**
  (one charge) — **one of the five city rites, cast on every city at once**
  (ruled 2026-09-06). `redraftBeliefs` is removed.
- **The apostle** joins later in the tree than the prophet: two charges, 4
  movement · a half-strength proclamation reaching cities within six hexes
  (one charge) · heal adjacent units 25 (one charge) · **places a relic** (the
  third act — RULED): a relic pays faith per turn, one per cathedral.
- **Faith is the magisterial supplement**: the reroll (§1), the rites, the
  apostle's relic. **The reroll price** (RULED): starts at 35 faith, rises per
  use at a slight exponent; a great prophet's draft is free and does not raise
  the count.

### What the design touches

| Surface | What moves |
|---|---|
| `performRite` | a city command (no unit); a per-city seal in absolute turns (`City.purchasedUnitTurns`' shape). **Schema** |
| The augur row · `chargedAugurs` (`CountKind`) · the belief **Court Augurs** · `augurHasActed` | retired for replay; the belief is **renamed and re-cut: its effect applies to every city with an active rite** (RULED) |
| The five rite abilities on the tree (`ABILITY_TECH`) | **keep opening the rites one by one, on the same nodes the augur's rites sat on** (RULED); the ability's bearer becomes the city |
| The Chapel (`ritesCharter`) | the rite's culture bonus, never its gate (RULED — the tree is the only gate) |
| The Cathedral's roll | **unchanged** — the Cathedral's consecration (its rolled bonus) is a different thing from the pantheon consecration the faith ladder now deals |
| The faith ladder | the pantheon's three consecrations arrive at faith thresholds **shaped like the augur's old price ladder** (40, +15 a rung — RULED); three rungs, three pantheon slots (the third opens at The High Temple as today) |
| The bot | `faithPlan` / `explainRites` (`src/ai/wants.ts`) simplify to a per-city purchase want; the "rites in roster order" debt closes; the faith ladder joins the draft plan's shape |

---

## 4. The deck — engines, payoffs, and what they read

### The finding this rests on

| Role, by classifier over the 158 live Order rows | Count | Share |
|---|---|---|
| reads the deck (counts slotted Orders by slot flavour) | 7 | 4% |
| amplifies another system's figure (`effectAmplifier`) | 2 | 1% |
| unlocks a building (a charter — a door, not a reader) | 11 | 7% |
| scales with something the empire built or holds | ~71 | 45% |
| pays a flat number, or a number scoped to a site | ~67 | 42% |

The seven readers count slot flavour — military, economic, wildcard — which is
the least interesting fact about a card. The user's answer is not to make the
cards' *colours* readable but to make the cards read **what the empire is
doing**.

### The engine shapes — RULED (the user's five, weighed)

| the card | shape it needs | precedent | verdict |
|---|---|---|---|
| "your Orders that give production give 50% more" | **an amplifier by voice over card yields** — a modifier applied *after* the card fold, "card ⚒ ×1.5". The fold keeps every card line labelled (`CardYieldLine`), so the multiplier is a pass over that list, printed as its own line | the Ledger's band 1 already buckets by card | **build** — the cleanest engine on the table; reads the deck without a tag |
| "your science buildings give +50% base yield, per-citizen lines included" | **a building-yield percent by category** — the luxury evaluator's category selector on a yield percent, applied to each building's own lines (flat and per-citizen) before the city fold | `buildingEffects.ts` category selectors | **build** — the same shape as the balance-turn markup's "double the yields on your temples / farms / mines / fishing boats / markets" (a doubler is +100%); one shape, five or six cards |
| "your tiles that supply faith give one more" | a `TileCondition` `{ test: 'yields', voice }` read against the tile's own fold | `hasResource` · `hills` · `feature` · `unimproved` | **build** — the smallest |
| "your first economic slot pays twice" · "the card to the left is doubled" | **a slot-position reader** — the fold knows each card's slot; with slots ordered as drawn (RULED) the position is a fact | `slottedOrdersOfSlot` | **build** — the most Balatro of the five |
| "every N turns, a boon" (standalone) · "your every-N-turn cards fire 3 turns earlier" (engine) · "your boons pay more" (engine) | a **periodic occasion** on `WindfallOccasion` (`everyTurns: N`) **and a period modifier** — its own small shape, read where the occasion is stamped. The boon-raiser is a rider on the windfall | `chop` · `camp` · `growth` · `found` · `completion` | **build** — ruled worthwhile: *frequency × size* is a second axis of scaling (chips × mult), and "every 5, shortened by 2" is a different card from "every 10" |

Discipline for the periodic build: the next firing is an **absolute turn
stamp** (`nextFiresTurn`; nothing ticks — the timed-effects rule); a shortener
re-stamps; the period has a **floor of two turns** so a stack cannot fire every
turn; the boon is a windfall, so a raiser is a rider composed into one printed
figure before banking (Entry XVIII.5) and modifier-immune like every grant.

**Five shapes, no tag system.** Every one of them combos with buildings and
tiles as well as cards, which a tag never could.

### Lines — RULED (third pass): all twelve readable

The user: *"why only three readable lines? We have 12 themes, lets keep those
for now."* So every `CardLine` becomes readable through one count shape —
`slottedOrdersOfLine` (a `CountKind` member with a `line` argument and its
`CombatScaleCount` twin; `slottedOrdersOfSlot` is the shape exactly) plus
`COUNT_WORDS` — and the line engines ("+1 strength per Forge card slotted",
"+1🕯 in every city per Procession card") sit **beside** the modifier engines
of the table above, which read the board. The bandwidth cost stands and is
accepted: not every line needs an engine in every pool; a line with no engine
is simply a mark until one is written. The seven flavour-counting readers
(`firstRites`, `theSynod`, `theGuildCharter`, `oreTithes`, `theWarCouncil`,
`borderWardens`, `provincialGovernors`) re-aim to their own line (the
balance-turn markup already cut `firstRites`' "per W order" as a snowball).

### The three roles, and the share — RULED

| Role | What it is | Alone | With three friends | Rarity |
|---|---|---|---|---|
| **Engine** | a modifier over what the empire does: "card ⚒ ×1.5", "science buildings +50%", "faith tiles +1", "your boons fire 3 turns sooner", "the first economic slot pays twice"; or a line reader for War/Faith/Trade | nearly nothing | multiplies | ● / ◆ |
| **Payoff** | scales with what is slotted, held or built: "double the yields on your temples", "+3% science per Star card", "each Temple pays its faith again as culture", the periodic boon | small | the reason the deck exists | ○ |
| **Standalone** | the honest flat | its number | its number, plus whatever multiplies it | ● / ◆ |

**Share per pool: 25% engines · 30% payoffs · 45% standalones** — the user:
"I agree with your mix". Standalones are the *fuel*, not the residue; a pool
that is mostly engines is a pool where nothing is worth slotting first.

**The power rule** (proposed, unmarked): *the multiplier rides the role.* A
standalone keeps today's number; an engine and a payoff take the pool's
multiplier from `docs/balance-turn.md` §3 (Æra III at seven-fourths). An
uncommitted pile then plays exactly as it does today — not punished, simply
no longer the ceiling.

**Rarity — RULED** (the balance-turn markup: "rarity should correlate with
power/payoff"): engines common and uncommon, payoffs rare. That also carries
out `docs/cards-pass-2.md` §E.6's ○ = rule-changer, which the audit found was
never done. The counter-argument (Balatro's rares are often the engines) does
not survive our cadence: a hand every four to eight turns wants reliable
engines, not surprising ones.

### What each path has to be

A path is a *different engine for the primary yields*, not a side dish. The
faith path is the worked example; the others follow the same template.

| Path | Engines read | Payoffs convert | Why it changes how you play |
|---|---|---|---|
| **Faith** | faith tiles +1 · temples doubled · "card 🕯 ×1.5" · Faith cards slotted (line) | faith → science / culture / production, a share per Faith card; the reroll and the rites are faith's *spend* | Temples everywhere, the Chapel worth raising, the faith ladder's rungs arrive sooner, rerolls shape the deck |
| **War** | War cards slotted → strength (line) · "units cost half" | production → gold and science in Barracks towns; a captured town pays yields | the 29 war rows read zero at peace today; a War path must pay a peacetime voice or it stays the trap it is |
| **Trade** | Trade cards slotted → gold per route and road (line) · "card 💰 ×1.5" | gold → every other voice (`theGoldenScales` is the model); route yields read the partner (the Silk Exchange's new reading) | roads and routes are the multiplier; the map is the deck |
| **Growth** | "food tiles +1" · granaries doubled · growth's occasion | food → science and culture (`theGranaryLaws`, `theHarvestSongs`) | the tall/wide question becomes a deck question |
| **Learning** | "science buildings +50%" · "card 🔬 ×1.5" · a technology completing as the occasion | a tech pays a share of a voice (`theLyceum`) | the tree's tempo becomes the payoff, so beelining is a build |
| **Court** | position engines ("first slot pays twice") · the periodic boons | +1% to every yield per Court card; wonders paying twice | the wonder line stops being a trap without touching a wonder row |

### Three worked decks, against the turn-92 empire

The empire: 🌾211 ⚒131 💰143 🔬200 🎵195 🕯59 — 939 points across the six
voices (assumptions: `docs/balance-turn.md` §0). The worked decks were built
under the tag design; under the modifier design the engine rows change name
but not size (a "+1🕯 in every city per Faith card" engine and a "faith tiles
+1 · temples doubled" pair land within a few points of each other on this
empire), so the arithmetic stands as an estimate.

**Deck 1 — the generic pile (today, eleven chairs, the strongest tag-blind set):**
`theLongRoads` 45💰 · `theFarCharts` 35🔬 · `scholarsStipend` 20🔬 ·
`theGranaryLaws` 18🔬 · `theCensusEternal` 15🔬 · `theLyceum` 24🎵 ·
`theHarvestSongs` 21🎵 · `theAnnalsOfLaw` 16🎵 · `theTaxFarm` 15💰 ·
`statuteLabour` 12⚒ · `censusOfSouls` 12🕯 — **233 points, 25% of the empire.**

**Deck 2 — a committed Faith deck under the proposal (eleven chairs):**

| Row | Role | Pays |
|---|---|---|
| `waysideShrines` · `thePilgrimsPurse` · `theSaintsFields` | standalones | 20🕯 |
| `theConsistory` (temples doubled — the user's own re-cut) | payoff | 12🕯 |
| `censusOfSouls` | payoff | 12🕯 |
| `theChoir` | standalone | 12🎵 |
| `theInquisition` (+8🕯 +8🎵 on temples — the user's re-cut) | payoff | 48🕯 · 48🎵 |
| **faith tiles +1 · "card 🕯 ×1.5"** (engines) | engines | ≈60🕯 |
| `lamplighters` (+1🎵 per 2🕯) | payoff | ≈80🎵 |
| **faith pays again as science, 3% per Faith card** (payoff) | payoff | ≈55🔬 |
| **+2% production per Faith card, in Temple towns** (payoff) | payoff | ≈28⚒ |
| **total** | | **≈150🕯 · 140🎵 · 55🔬 · 28⚒ ≈ 370 points** |

The empire after ≈ 1300 points against 939: **the committed deck out-pays the
generic pile by roughly half**, and it changes what gets built and played.
The engines alone, in a deck with no other Faith card, pay a tenth of that —
**the card the user asked for.**

**Deck 3 — the uncommitted pile under the proposal:** the standalones pay
their unchanged numbers, the payoffs fire on one or two helpings, the engines
pay almost nothing — roughly **110–130 points**, half of Deck 1. The pile is
not nerfed; it is no longer the best a hand can do. Whether that is tolerable
for a first-time player is **OPEN** (§6.10).

### Making the combo visible — RULED

| Surface | What it prints | Status |
|---|---|---|
| The tarot face at the draft | the per-card stamp (what this card is worth *now*), the line mark where the card has a readable line | built (the stamp); the mark is a presentation change |
| **The slot, unconfirmed** | **nothing** — a newly slotted card shows no yields until Confirm | **RULED** |
| **Confirm** | the fold runs in order — base lines, then modifiers — and **the aggregate fires with the count-up**: "your cards: +31⚒ +18🔬 +40🎵", the modifier lines listed after the base lines in fold order | **RULED** — the scoring ceremony |
| The standing face | "has produced" — the lifetime tally per owned order (flags note 5, stamp phase 2) | schema, specified, waiting on `cities.ts` — **a dependency of this pass** |
| The Ledger | the deck's slice per voice (bands 1–2, built); band 3 is the tally; the aggregate line joins band 1 | built / specified |
| The Statecraft screen | slots ordered as drawn, position words on the face ("first economic slot") | **RULED** (ordered slots) |

---

## 5. Interactions, and the order of work

### The balance turn (`docs/balance-turn.md`, marked up 2026-09-06)

| Section | Verdict |
|---|---|
| §0–§2 — the scale, the audit, the diagnosis | **stands** — the measurement of record |
| §3 — the row-by-row numbers, now the user's | **held until the roles are assigned**: a row's number rides its role (the power rule), so §3's figures apply to standalones as written and to engines/payoffs with the pool multiplier. Re-derive once §4's roles are on the rows |
| §4 — the nerf side, marked | **stands**: `sciencePerPop` base 1 → 0.5 and Library 1 → 0.5 (balance-turn §7 flags the base beaker as the largest single move — **OPEN** §6.13 to confirm), building flats −25% is **subsumed by §2's cut**, tiles/wonders/beliefs/techs left alone |
| §7 — rule 3 (cheer rows), the 29 war rows, what faith buys, the two new shapes | folded here: the pure-cheer rows are §2/§4's first cuts (**OPEN** §6.4 which); the war rows are the War line's fuel; faith's purchases are §3 and §1's reroll; the doubler and the partner-population route reading are two of §4's shapes |

### What else moves

| Surface | What moves |
|---|---|
| **Shapes** (all new, all small) | amplifier by voice over card yields · building-yield percent by category · `yields` tile test · slot-position reader · periodic occasion + period modifier · `slottedOrdersOfLine` (+ its combat twin) · `requiresBuilding` · route reading of the partner's population · the faith ladder · the faith reroll. **Ten** members across `statecraftData.ts`, `buildingEffects.ts`, `routeYields.ts`, `religionData.ts`; each declared shape must be read (the register test) and priced (the bot) |
| `src/ai/wants.ts` — `draftPlan`, `expectedBestOrder` | **the largest bot debt this pass creates.** Both price a card *in isolation* through `cardWorth`; an engine prices near zero alone, so the bot never drafts one and never builds a combo deck. The fix is a marginal reading `V(deck ∪ card) − V(deck)`, which needs the fold askable hypothetically — a batch of its own, after the shapes land |
| `src/ai/value.ts` — `explainCounted` | prices `countScaled` through the sim's own `countOf`, so the line count is priced honestly for free; the amplifier and the building percent need arms (`unknownEffect` otherwise); the periodic boon prices as a windfall over its period |
| The bot's faith plan | the augur leaves; rites are a per-city purchase want; the faith ladder joins the draft plan; the reroll is a new spend the bot must price (or ignore, at first) |
| Pacing harnesses | `statecraftPacing.slow` (cadence, tiers), `tech.slow`, `endgame.slow` — every one moves on the buildings cut (upkeep relief), the science cuts, the deck's power, and the cadence. Re-aim once per landed batch, not once per row |
| `statecraftDocSync.test.ts` | name + rarity per pool are pinned; a line column and a role column are new data and want their own sync on `docs/orders-and-doctrines.md` |
| `statecraft.test.ts` | the fold registry: every new arm joins it |
| Saves | the dice removed · the augur retired · `performRite` reshaped · the faith ladder · thirteen buildings behind a marker · chains · new counts and conditions · the tally: **one schema bump per landed batch** |
| The arena / compendium | no page edit; the compendium follows the describers, and each new shape needs its words |

### The order of work — proposed

| | Step | Why here |
|---|---|---|
| 1 | **The five engine shapes + the readable line + the Confirm reveal and aggregate + ordered slots** | changes no number on the board until a card uses a shape; everything downstream reads them. The reveal is UI on the existing Confirm |
| 2 | **Religion** (§3): the faith ladder, city rites, the prophet's acts, the apostle, the dice out and the faith reroll in | self-contained, removes the worst clicks in the game; disjoint fence from step 1 (`religion.ts` / `statecraftData.ts`) — can run in parallel |
| 3 | **The buildings cut with chains** (§2) | pure data plus `requiresBuilding`, three deed re-aims, the bot's parent reading; must precede the order pass so cards count surviving rows |
| 4 | **The order pass**: roles on every row, the new engines and payoffs per pool, the balance-turn numbers re-derived with the multiplier riding the role, the 29 war rows fuelling the War line | the big one; needs 1 and 3 |
| 5 | **The tech gift table** — every node's gift after the cut (a project, a rite, a card, a chain unlock, a tile line); the rule: **no node without a gift a player will notice** | the doc after this one (§6.11) |
| 6 | **Cadence and chairs** (§1's levers) | last, tuned against the harness once the deck's real power is known |

---

## 6. Ruled on the third pass (2026-09-06) — and what is still open

The user answered every item of the second revision's §6. The rulings, folded
above and listed here for the record:

| # | Ruled |
|---|---|
| 1 | The building tables stand as marked — every `proposed` row is confirmed |
| 2 | The four chains: Stone Walls → Castle · University → Observatory · Workshop → Forge · Shrine → Temple |
| 3 | The rites unlock **on the tree where the augur's did**, no building gates them; the **Chapel** pays culture on a rite · the **Cathedral** keeps its roll unchanged (its consecration is not the pantheon's) · **Court Augurs** is renamed and its effect applies to every city with an active rite · the rite abilities stay on the tree, unlocked one by one on the nodes the augur's rites sat on |
| 4 | A grant **ignores the chain** |
| 5 | The **faith ladder**: thresholds shaped like the augur's old price ladder (40, +15 a rung), three rungs for the pantheon's three slots. The **reroll**: 35 faith to start, rising per use at a slight exponent; a great prophet's draft is free and does not raise the count |
| 7 | The apostle's third act is the **relic** (faith per turn, one per cathedral); no other act |
| 8 | **All twelve lines readable**, not three — **re-ruled 2026-09-06 by the order pass (`docs/orders-pass-3.md` §9): lines stay drawn marks, nothing reads them; slot-flavour counts stay** |
| 9 | Cadence 2.25 → 2.8 **and** chairs down a quarter — Gov III to 8, **Gov IV and V commensurately** |
| 10 | *("what's a tag-blind hand?")* — a hand or deck chosen for each card's own number with no regard to what the other cards read: Deck 1 above, the strongest eleven flats. Under the proposal such a pile keeps its numbers and stops being the ceiling; the question was whether a first-time player who drafts that way should feel the gap. Left as recommended: leave it, and let the tutorial show one combo |
| 11 | The **tech gift table** is its own doc — `docs/tech-gifts.md`, in flight, before the order pass |
| 12 | **Veins are marked** once the tech is held; veins may hide **unique luxuries — rare minerals (obsidian, mercury, …) with powerful bonuses**. `docs/veins.md`, in flight: the vein mechanics and the proposed new luxuries |
| 13 | The base beaker halves **as marked**: science moves into the orders; the next playtest calibrates how much science the order set must carry |
| 14 | **Projects**: production → gold, production → science, production → culture. Kept simple; revisited later |

### Still open

- **6. The rites' numbers** — ten turns each is ruled; the **faith price per
  rite** and the **per-city seal** are not. *Proposed default until you say
  otherwise*: a rite costs the faith ladder's first rung (40🕯) rising a rung
  per age, and a city may hold **one rite at a time** — the seal is the rite's
  own ten turns.
- **Gov IV and V chair counts** — "commensurately" means a quarter off each
  slot group, rounded to keep every group at least one; the exact triples are
  data rows and print in the doc table when the pass lands.
- **Which new luxuries and which nodes** — the two docs in flight.

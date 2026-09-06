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

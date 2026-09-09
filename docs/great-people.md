# Great People — reference

The as-built great-people system, current state. Sources of truth:
`data/greatPeople.json` (the roster — names, families, ages, tiers, legacies),
`data/rules.json` (`greatPeople` and `renown` — every act, work and ladder
figure), `data/improvements.json` (the works), `data/triumphs.json` (the triumph
table), and `src/sim/renown.ts` / `greatPeople.ts` / `triumphs.ts` with
`statecraft/evaluator.ts` (the one effect evaluator — a legacy is a card that
walks). History lives in `docs/design-history.md` and git.

**The tables below are generated from the rows** — names, tiers, acts, works and
legacies alike; the *Legacy* column is the game's own printed words
(`describeCard`, the describer every screen prints from), never hand-written
prose about a number. The **Notes** column is blank and is the user's to write
in for a balance pass: a figure, a strike-through, a sentence. Nothing written
there is folded into the data until the user says ready.
`test/sim/greatPeopleDocSync.test.ts` keeps the two sides honest: every live row
appears in its age's table, every table row names a live row, and every figure in
the table of figures carries the value the rules charge.

## The machinery

**Renown** is one empire pool, banked in exactly one place
(`settleRenownWindfall`) and explained as one rule-5 list (`explainRenown`). It
arrives from building trickles (a `renown` column on the row, tagged with the
family it feeds), from wonders as both a lump and a trickle, from Triumphs, from
card and legacy clauses, from a town's specialists under the guild rules, and
from luxuries — the last of these family-less by construction, so it grows the
pool without weighting the draw. A new source joins that one fold; there is never
a second bank.

**The ladder** is the **draft ladder's arithmetic**, one currency over (the
user's ruling of 2026-09-09, batch B5: *"the first great person at 75 renown, and
have the costs scale in line with how our culture costs are scaled"*):

`renownThreshold(player) = floor(base + linear × n + n^exponent)`, `n` = great
people already recruited — `draftCost`'s line and `faithRungCost`'s, so the
culture pool, the faith bank and the renown pool all escalate the same way and a
player learns the shape once. It escalates by *recruits* rather than by turns, so
a wide empire's faster trickle buys the same names sooner and then pays more for
each one rather than earning them at a faster rate. Filling the threshold spends
it (the overflow carries) and opens an offer of names —
`rules.offers.greatPerson` wide, widened again by any rider.

The three figures are `rules.renown` — **base 75 · linear 225 · exponent 2.8** —
and they are the knob the whole rate turns on. The **first eight rungs**, and
what an empire must have banked in total to stand on each:

| Person | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th |
|---|---|---|---|---|---|---|---|---|
| Threshold | 75 | 301 | 531 | 771 | 1023 | 1290 | 1575 | 1882 |
| Banked in all | 75 | 376 | 907 | 1678 | 2701 | 3991 | 5566 | 7448 |

Why the linear term is three times the base where culture's is half of it is B4's
finding, and the arithmetic is in *The rate, measured*.

**The draw** is weighted and never restricted. Every name of the age is in the
bag; each family's weight is a base thousand plus that family's share of what the
empire's renown actually came from, so an empire that built libraries meets more
scholars without ever being refused a general. Names are world-shared and
consumed on the pick, resolved by log order — `chooseGreatPerson` is the
reducer's one refusal that mutates, redrawing when another empire has already
taken the name. A roster spent to the last name banks the renown rather than
blocking the recruitment.

**The spill** keeps a short age pool honest: the draw walks
`[the empire's age, the ages before it, the ages after it]`, so an early empire
meets "the forgotten" of an age it has passed and a late one meets a name ahead
of its time. An offer shrinks before it fails, and it fails only when the world
has no unclaimed name at all.

**Purchases** are three clauses on cards, one register (`OFFER_PURCHASES`), one
command (`purchaseGreatPersonOffer`) and one draft path. Two of them buy a *rung*
of the ladder — The Commonwealth's gold price and The Magisterium's faith price
pour renown to the threshold through the ordinary windfall, so the pool is spent
and the next recruitment is dearer. The third, The Academy's scholar draft, buys
the *hand*: it charges faith, deals a scholars-only offer on the spot, and leaves
the ladder exactly where it stood. All three are drawn as a rail of calls at the
foot of the Reliquary (`src/ui/reliquaryScreen.ts`, the only surface that
constructs the command), priced by `greatPersonOfferPrice`, greyed with
`greatPersonPurchaseError`'s own sentence, and drawn at all only where the
empire's law names them.

## The rate, measured

Two bot games — standard map, two balanced seats (Crimson and Teal), the wild in
the fog, driven by `createBotStepper` — played until every seat had left Æra III
and on to turn 150, counting the great people each seat had recruited and the
renown it had banked all told (the pool plus every rung it had already paid). Bot
figures are a *scale* rather than a baseline (the user, 2026-09-09: the bot is
not a yardstick), and they are here so a ruling about a rate can be read as a
number rather than as an intention. Each cell is the two seats of seed 1, then
the two seats of seed 20260903.

**What the old ladder bought.** Under the pre-B4 ladder — `first 40 · step 25`,
the shape every figure below is solved against — the four seats left Æra III on
turn 116 · 123 · 129 · 127, having banked **1359 · 2323 · 1963 · 1827** renown
(mean 1868) and recruited **9 · 12 · 11 · 10** people (mean 10.5).

**The solve.** A linear ladder's cumulative cost is Σ(first + step·i), which at
40 · 25 is 12.5N² + 27.5N — quadratic in N, which is B4's finding written as
algebra: the number of people a bank of renown buys goes as the square root of
that bank over the ladder's *linear* term, so tripling the rungs bought half the
arrivals rather than a third. Thirding the count at the same bank therefore
multiplies the linear term by **nine**: 25 × 9 = **225**, which is B4's own
prediction reached by arithmetic rather than by another sweep. With the ruled
`base` of 75 and culture's own `exponent` of 2.8, the rungs sum to 75 · 376 · 907
· 1678 · 2701 · 3991 · 5566 · 7448, so the four measured banks buy **3 · 4 · 4 ·
4** people against a target of 3 · 4 · 4 · 3 (each seat's own count ÷ 3,
rounded) — the fourth seat is one rounding over, on a bank of 1827 against a
fourth rung reached at 1678. The base pays for the first rung alone and the
exponent is worth 1 · 7 · 22 · 49 renown on rungs two to five — a tail rather
than a term, which is why the linear does the work at the scale a game reaches.

**Confirmation** — the same two games replayed under `base 75 · linear 225 ·
exponent 2.8`. (Play diverges once the arrivals do, so the Æra III doors fall on
turn 115 · 123 · 127 · 129 rather than the old ladder's 116 · 123 · 129 · 127.)

| Ladder | Recruited, end of Æra III | by t100 | by t150 |
|---|---|---|---|
| first 40 · step 25 (the pre-B4 ladder) | 9 · 12 · 11 · 10 — mean 10.5 | 6 · 7 · 7 · 6 — mean 6.5 | 15 · 18 · 14 · 15 — mean 15.5 |
| base 75 · linear 225 · exponent 2.8 (now) | 3 · 4 · 4 · 4 — mean 3.75 | 2 · 3 · 3 · 2 — mean 2.5 | 5 · 6 · 5 · 4 — mean 5.0 |

**Finding: the ruling lands.** The mean is 0.36 of the old ladder's at the Æra
III door, 0.38 at turn 100 and 0.32 at turn 150 — a third as often, where B4's ×3
on both rungs managed only a half. The count keeps climbing after the door
because renown income does: a seat that had banked 650–980 by turn 100 has banked
three to four times that by turn 150, which is what puts the fifth and sixth
names inside a long game rather than out of reach.

## The person — one charge, two verbs

A recruited person arrives as an agent with **one charge** (`units.json`'s
`greatPerson` row: `charges: 1`, the `greatWork` marker, `Unit.person` naming who
it is and riding the piece fingerprint). Either verb spends the charge and the
piece, and either verb leaves the legacy.

- The **act** pays now, through the bucket it belongs to (an Entry XVIII.5
  printed figure: composed once, immune to city percentages and staging).
- The **work** plants an improvement for good (`greatPerson: family` on the
  improvement row). It stands anywhere but water and mountain, and it **opens the
  seam it covers** — an academy on iron gives the empire the iron.
- Two acts are quoted in *turns of the empire's own rate* — the scholar's
  beakers and the artist's culture, read through `foldEmpireRates`, the same fold
  the top bar prints. They are deliberately un-aged, because a figure read off
  the empire's own books already grows with everything it builds.
- Every **flat** act figure ages with the tree instead: ×(1 + `actPerTech` ×
  technologies researched), composed once in `agedActFactor` before anything
  banks. Leonardo's amplifier (`greatPersonAct`) folds into the same figure, and
  reaches what an act *pays* — never a duration or a radius.
- A great general standing beside an army is a **separate, standing** aura
  (`generalAuraStrength` within `generalAuraRange`), a labelled strength line in
  `planCombat` — not the act above it.

## Legacies

- Every person leaves a **legacy** on the empire when spent, by either verb:
  ordinary card effects, `liveEffects`' sixth source, read only by the one
  evaluator. Tiers follow the Doctrine philosophy — ● game-defining with a
  malice, ◆ generic strong, ○ situational with no malice — and are bookkeeping:
  nothing in the simulation switches on a tier.
- **Revocation is marking, never deleting** (`LegacyRecord.revoked`,
  `revokeLegacies` the only writer). `GreatPersonDef.revokedWhen` names the
  occasion — `happinessNegative` (Hypatia) and `ageAdvanced` (Boudica), both
  swept in `reviewLegacies`. The roll of who was earned never shrinks.
  `enemyEntersCapital` is hooked at `arriveOnTile` and **no row names it**: give
  it back to a row or take the occasion and its hook out together — open, and the
  one open ruling on this system.
- **Deferred halves print struck through**, and are promises the game has not
  made. Twelve rows carry one after the pass of 2026-09-09, each waiting on a
  shape the vocabulary does not have: a share taken on a building's own yield, a
  fight described against the size of the realm opposite, and counts of the
  empires a road reaches, of the room left in a realm's authority, of the gold it
  has spent, of the length a caravan walks — plus a relief read off one town's own
  size and the faith bank opened to the buildings that supply science.
- A player reads a legacy in the **Reliquary** (the renown chip's own sheet): one
  tarot face at a time over a drawn stack, newest first, each carrying the
  legacy in `describeCard`'s words, its current per-turn figure from
  `explainCardImpact`, and the deed as a footnote. A revoked record stays in the
  pile, greyed under a vermilion band.
- Spending a person plays a ceremony (`src/ui/greatPersonCeremony.ts`) on the
  accepted command — presentation only. The **draft** carries no stamp at all: a
  legacy pays nothing until the person is spent.

## Triumphs

- `Player.triumphs` is append-only and turn-stamped, read by diffing
  (`triumphMarks` / `triumphsSince` / `triumphsAwarded`), never passed as a
  parameter.
- `triumphs.ts` owns the only trigger switch: **announced occasions** (hooked at
  the events that already report) against **standing counts** (swept in the
  `renown` phase). Scopes are once, per age, and contested — `state.contested`
  keys `(id, age)`, first by log order.
- The table is data (`data/triumphs.json`); the Academy of Deeds' doubling folds
  into the printed figure in `awardTriumph` before anything banks.

## The figures

Every tuned number this system reads, with what it does. The *Notes* column is
blank for the balance pass.

| Figure | Value | What it does | Notes |
|---|---|---|---|
| `actPerTech` | 0.05 | Every flat act figure grows by this share for each technology the empire has researched. |  |
| `actGainTurns` | 8 | How many turns of the empire’s own science or culture a rate-quoted act pays. |  |
| `engineerHammers` | 40 | Hammers an engineer’s act pays into the town it stands in, multiplied by the age. |  |
| `merchantGold` | 60 | Gold a merchant’s act pays into the treasury, multiplied by the age. |  |
| `artistHappiness` | 2 | Happiness an artist’s act hangs on the town it stands in. |  |
| `artistTurns` | 10 | How many turns that happiness lasts. |  |
| `generalRadius` | 2 | How far a general’s act reaches, in hexes. |  |
| `generalCombat` | 3 | Strength that act hangs on every friendly piece in reach. |  |
| `generalTurns` | 5 | How many turns that strength lasts. |  |
| `generalAuraRange` | 2 | How far a great general’s standing aura reaches while the piece is alive. |  |
| `generalAuraStrength` | 3 | Strength every friendly soldier inside that aura fights with. |  |
| `citadelClaimRadius` | 1 | How far a citadel claims ground around itself, in hexes. |  |
| `offerPriceGold` | 1000 | What The Commonwealth charges in gold to fill the threshold early. |  |
| `offerPriceFaith` | 750 | The same out of the faith bank — The Magisterium’s price. |  |
| `scholarDraftFaith` | 1000 | What The Academy charges in faith for a scholars-only hand, leaving the ladder where it stands. |  |
| `renown.base` | 75 | What the first great person costs in renown — the ladder’s floor. |  |
| `renown.linear` | 225 | What each person already recruited adds to the next one’s price, straight. |  |
| `renown.exponent` | 2.8 | The power the recruit count is raised to and added on top — culture’s own. |  |

## The roster

78 names across four ages and five families — the roster as the great-person
pass of 2026-09-09 left it (`docs/flags.md` (lll)). Eight further rows are
**retired** (`GreatPersonDef.retired`): out of every draw, kept in the data so a
save holding one of their legacies still loads, and out of the tables below,
which are the live roster and nothing else. Tier is the row's own and is
bookkeeping only. The act and the work are the family's, printed on every row so
a name can be judged whole. A **struck-through** legacy is a half this build does
not implement, said out loud on the card rather than quietly dropped.

### Æra II — The Age of Heroes

16 names — one row per name, in the data's own order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Imhotep | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +10% production toward wonders |  |
| Ahmes | Scholar | ○ situational | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +2 science in every city on fresh water |  |
| Kidinnu | Scholar | ● defining | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +15% science in your capital |  |
| Enheduanna | Artist | ◆ strong | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +1 culture in every city with a Shrine |  |
| Homer | Artist | ● defining | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +2 on every hex carrying a great person's work — science on an Academy, culture on a Landmark, production on a Manufactory, gold on a Customs House and production on a Citadel | read as each work's own voice (fold-in assumption) |
| Sin-lēqi-unninni | Artist | ◆ strong | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +30% production toward Amphitheaters |  |
| Ilimilku | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +1 production, +1 culture in every coastal city |  |
| Amenhotep son of Hapu | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +15% production toward wonders, in your capital |  |
| Bezalel | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +1 production in every city with a Temple |  |
| Ea-nāṣir | Merchant | ● defining | `merchantGold` 60💰 × age | **Customs House** +3💰 | -1 production, +3 gold on every hex with a Mine |  |
| Lamassī | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | +1 gold on every hex with a Pasture |  |
| Ahmose son of Ebana | General | ◆ strong | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +10% combat strength for melee units |  |
| Piyamaradu | General | ● defining | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +3 combat strength outside your territory · -2 authority capacity |  |
| Sinuhe | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | all units: +5 healing per turn |  |
| Deborah | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +4 combat strength within 2 hexes of one of your cities |  |
| Sappho | Artist | ◆ strong | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +3 culture in your capital · +1 happiness |  |

### Æra III — The Age of Empire

24 names — one row per name, in the data's own order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Epicurus | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | ~~A town of ten citizens or more asks a smaller share for its keep — a relief read off the size of one town, which nothing can say yet. — not built yet~~ | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Aristotle | Scholar | ● defining | `actGainTurns` 8 turns of science | **Academy** +3🔬 | ~~Buildings that supply science pay half as much again — a share taken on what a building itself yields, which nothing can say yet. — not built yet~~ | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Hemiunu | Engineer | ● defining | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +10% production toward wonders · -2 happiness in every city while it is building a wonder |  |
| Ptahhotep | Scholar | ○ situational | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 authority capacity per 2 Libraries |  |
| Archimedes | Scholar | ● defining | `actGainTurns` 8 turns of science | **Academy** +3🔬 | siege units: +1 movement · +3 combat strength for siege units |  |
| Hypatia | Scholar | ● defining | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +10% science in every city · lost the first turn your happiness goes negative |  |
| Zhang Heng | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 science in every city with a Library |  |
| Eratosthenes | Scholar | ○ situational | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 science per 80 hexes you have revealed |  |
| Qu Yuan | Artist | ● defining | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +10% culture in every city · -5 happiness in your capital |  |
| Phidias | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +3 culture per wonder you hold |  |
| Li Bing | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +1 production on every hex with a Farm beside fresh water, in every city with an Aqueduct |  |
| Dinocrates | Engineer | ◆ strong | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | completing a wonder grants +3 production in every city for 10 turns |  |
| Vitruvius | Engineer | ◆ strong | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | Aqueducts supply +1 happiness · Granaries supply +1 happiness |  |
| Eupalinos | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +1 food on every improved hex beside a mountain |  |
| Zhang Qian | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | +2 gold per 80 hexes you have revealed |  |
| Nanaivandak | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | each connected city pays +2 gold |  |
| Hippalus | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | +1 gold on every hex with a Fishing Boat |  |
| Crassus | Merchant | ● defining | `merchantGold` 60💰 × age | **Customs House** +3💰 | all units and buildings cost −30% to buy · buying anything costs your empire -1 happiness for 10 turns |  |
| Pytheas | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | trader units: +1 sight · ~~Your caravans cannot be plundered — a blow on a laden cart is still a blow, and nothing forbids it yet. — not built yet~~ |  |
| Hannibal | General | ● defining | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +5 combat strength outside your territory · -4 combat strength inside your territory |  |
| Gaius Marius | General | ◆ strong | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | all units: +1 movement inside your territory | proposed name (fold-in 2026-09-09) — yours to change |
| Boudica | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +4 combat strength inside your territory · lost when the age it was earned in closes |  |
| Spartacus | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | ~~Your soldiers strike harder at an empire that holds more cities than you — a battle line drawn against the size of the realm opposite, which nothing can say yet. — not built yet~~ |  |
| Ibn Sīnā | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 happiness in every city |  |

### Æra IV — The Age of Cathedrals

19 names — one row per name, in the data's own order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| al-Khwārizmī | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +10% faith in every city with a University · ~~You may hurry buildings that supply science out of the faith bank — the bank sells only what its own rows name, and nothing opens it to these yet. — not built yet~~ |  |
| Maimonides | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 happiness per building in your cities that supplies science | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Roger Bacon | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | completing a technology grants +30% food in every city; +30% production in every city for 3 turns | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Āryabhaṭa | Scholar | ○ situational | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +2 faith in every city per building there that supplies science |  |
| Murasaki Shikibu | Artist | ◆ strong | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +10 culture per melee unit in the field |  |
| Rūmī | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | ~~Temples pay twice over — a share taken on what a building itself yields, which nothing can say yet. — not built yet~~ |  |
| Sei Shōnagon | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +5% culture in every city per unique luxury there |  |
| al-Jazarī | Engineer | ◆ strong | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | ~~Buildings that supply work pay twice over — a share taken on what a building itself yields, which nothing can say yet. — not built yet~~ |  |
| Su Song | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +1 production, +1 science on every hex with a Mine, in every city with a Workshop |  |
| Villard de Honnecourt | Engineer | ◆ strong | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +15% production toward wonders |  |
| Benjamin of Tudela | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | +2 gold, +1 culture on every hex carrying a great person's work |  |
| Ibn Baṭṭūṭa | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | ~~More songs for every empire your caravans reach — nothing counts the realms at the far ends of your roads yet. — not built yet~~ |  |
| Marco Polo | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | ~~More gold the further a caravan walks — nothing reads the length of the road a cart is on yet. — not built yet~~ |  |
| Francesco Datini | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | +2 gold on every hex carrying a resource, in every city with a Bank |  |
| Subutai | General | ● defining | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | mounted units: +1 movement · +25% combat strength for mounted units |  |
| Tomoe Gozen | General | ◆ strong | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +15% combat strength for mounted units · +15% combat strength for ranged units |  |
| Jan Žižka | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +5 combat strength while fortified |  |
| El Cid | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +3 combat strength in a city you captured |  |
| Mimar Sinan | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +2 production, +2 culture in every city with a Temple · +30% production toward Temples · +30% production toward Cathedrals |  |

### Æra V — The Magister

19 names — one row per name, in the data's own order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Paracelsus | Scholar | ● defining | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +25% science in every city · -1 happiness in every city |  |
| Tycho Brahe | Scholar | ○ situational | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +2 science on every hill hex beside a mountain |  |
| John Dee | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +1 card in every offer of every kind |  |
| Copernicus | Scholar | ◆ strong | `actGainTurns` 8 turns of science | **Academy** +3🔬 | +2 science in every city |  |
| Christine de Pizan | Artist | ◆ strong | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +3 culture in your capital · +1 authority capacity |  |
| Dürer | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +2 culture per wonder you hold · ~~Wonders pay half as much again — a share taken on what a building itself yields, which nothing can say yet. — not built yet~~ |  |
| Bashō | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +1 culture on every forest or jungle hex |  |
| Sor Juana | Artist | ○ situational | `actGainTurns` 8 turns of culture · +2 happiness ×10 | **Landmark** +3🎵 | +1 science, +1 culture on every hex carrying a resource, in every city with a University |  |
| Leonardo | Engineer | ● defining | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +30% production toward wonders · a great person's act pays +100% |  |
| Taqī al-Dīn | Engineer | ◆ strong | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | +15% science in your capital · +15% science in every capital city beside a mountain |  |
| Vaucanson | Engineer | ○ situational | `engineerHammers` 40⚙ × age | **Manufactory** +3⚙ | newly created worker units gain +1 charge |  |
| Jakob Fugger | Merchant | ● defining | `merchantGold` 60💰 × age | **Customs House** +3💰 | +30% gold in every city · -1 authority capacity per 3 cities you hold · all units and buildings cost −20% to buy |  |
| Willem Beukelszoon | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | the works on every hex with a Fishing Boat pay +100% · the ground of every hex with a Fishing Boat pays double | proposed name (fold-in 2026-09-09) — yours to change |
| Gracia Mendes Nasi | Merchant | ◆ strong | `merchantGold` 60💰 × age | **Customs House** +3💰 | +8 authority capacity · ~~Gladness and gold for every point of authority you hold spare — nothing counts the room left in your authority yet. — not built yet~~ |  |
| Cosimo de' Medici | Merchant | ○ situational | `merchantGold` 60💰 × age | **Customs House** +3💰 | ~~Songs for every hundred gold you have spent all game — nothing remembers what the treasury has paid out yet. — not built yet~~ |  |
| Gustavus Adolphus | General | ◆ strong | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +15% combat strength for ranged units · siege units: +1 movement |  |
| Nzinga of Ndongo | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +5 combat strength in forest · +5 combat strength in jungle |  |
| Yi Sun-sin | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +5 combat strength for ships |  |
| Lautaro | General | ○ situational | heal + `generalCombat` +3 within 2 ×5 | **Citadel** +2⚙, +8 defence, claims its ring | +3 combat strength against mounted units |  |

## Extension rules

- A new legacy is a JSON row; a new **shape** is a design decision. Never bend a
  clause into a near-fit — defer it with prose, in the data's own player-plain
  words.
- A new triumph is a row plus one arm in the trigger switch.
- A new renown source joins `explainRenown`'s fold, never a second bank.
- A new name is a row in `data/greatPeople.json` **and** a row in its age's table
  above — the sync test fails otherwise. A name **withdrawn** is `retired: true`
  and leaves the table; the row itself is never deleted, because a save names a
  legacy by id.

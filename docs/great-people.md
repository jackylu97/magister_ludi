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

The three figures are `rules.renown`: **base 75 · linear 58 · exponent 2.65**.
They set the whole rate.
- 2026-09-15: the user scaled the tiers down by a fifth (linear 225 → 180,
  exponent 2.8 → 2.65).
- 2026-11-12, batch GP1 (`docs/flags.md` item (mmmmmmm)): linear 180 → 58. The
  user: *"instead of 4 great people at 2000 renown lets make it 7"*. The first
  price stays 75.

The **first eight prices**, and the renown an empire must have banked in all to
recruit each one:

| Person | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th |
|---|---|---|---|---|---|---|---|---|
| Threshold | 75 | 134 | 197 | 267 | 346 | 436 | 538 | 654 |
| Banked in all | 75 | 209 | 406 | 673 | 1019 | 1455 | 1993 | 2647 |

The linear term was three times the base after batch B4. *The rate, measured*
below gives B4's arithmetic and measurement, made at linear 225. Those games are
older than the cuts to 180 and to 58, so they do not describe the current rate.

**The draw** is weighted and never restricted. Every name of the age is in the
bag; each family's weight is a base thousand plus that family's share of what the
empire's renown actually came from, so an empire that built libraries meets more
scholars without ever being refused a general. Names are world-shared and
consumed in command order. If another empire took the chosen name, the command
redraws the offer. The save records this command and the player's next choice.
If the roster is empty, the offer closes and the empire keeps its banked renown.

**The odds** are on the Renown tab: the renown figure's hover card on the top
bar, and the Reliquary it opens (batch GP1 of 2026-11-12).
- For each family, the chance in whole percent that a name in the next offer
  comes from it. `greatPersonOdds` works it out exactly from `greatPersonBag`,
  the bag, weights and hand size the draw itself reads. A family with no name
  left shows 0.
- Which ages' names are in the bag, and how many unclaimed names the empire's
  own age has left.
- The renown ledger prints one line for each town (`explainRenownByTown`,
  `src/ui/renownTab.ts`). On the Reliquary a town's line opens to its sources.
  Lines that belong to no town (cards, legacies, luxuries, Triumphs) keep
  their own lines, and the total is the fold of every line.

**The spill** keeps a short age pool honest: the draw walks
`[the empire's age, the ages before it, the ages after it]`, so an early empire
meets "the forgotten" of an age it has passed and a late one meets a name ahead
of its time. An offer shrinks before it fails, and it fails only when the world
has no unclaimed name at all.

**Purchases** are three clauses on cards, one register (`OFFER_PURCHASES`), one
command (`purchaseGreatPersonOffer`) and one draft path. Two of them buy a *rung*
of the ladder — Merchant Princes' gold price and Sacred Patronage's faith price
pour renown to the threshold through the ordinary windfall, so the pool is spent
and the next recruitment is dearer. The third, The Academy's scholar draft, buys
the *hand*: it charges faith, deals a scholars-only offer on the spot, and leaves
the ladder exactly where it stood. All three are drawn as a rail of calls at the
foot of the Reliquary (`src/ui/reliquaryScreen.ts`, the only surface that
constructs the command), priced by `greatPersonOfferPrice`, greyed with
`greatPersonPurchaseError`'s own sentence, and drawn at all only where the
empire's law names them.

Merchant Princes requires the ordinary Great Person recruitment ability. Epic
Poetry grants it, and a card can grant it early. Until then, the Reliquary
shows the gold offer disabled. A rejected purchase leaves gold and renown
untouched. Sacred Patronage and The Academy retain their own purchase rules.

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

One card changes this. While The Universal Genius is seated (the action rule
`actThenWork`, Magisterial batch MG13), the act pays and the piece stays on the
board, marked `Unit.acted`. A marked piece cannot act again. It may still lay
its work, which spends it and leaves the legacy, once.

- The **act** pays now, through the bucket it belongs to (an Entry XVIII.5
  printed figure: composed once, immune to city percentages and staging).
- The **work** plants an improvement for good (`greatPerson: family` on the
  improvement row). It stands anywhere but water and mountain, and it **opens the
  seam it covers** — an academy on iron gives the empire the iron.
- Scholars, artists and merchants receive eight turns of the empire's current science, culture or gold. Each uses `foldEmpireRates`. If gold income is negative, the merchant pays zero.
- The Academy, Landmark, Manufactory and Customs House start with 4 of their yield. The Citadel starts with 3 production. Philosophy and Education each add 2 to that yield.
- Every **flat** act figure ages with the tree instead: ×(1 + `actPerTech` ×
  technologies researched), composed once in `agedActFactor` before anything
  banks. Leonardo's amplifier (`greatPersonAct`) folds into the same figure, and
  reaches what an act *pays* — never a duration or a radius.
- A great general standing beside an army is a **separate, standing** aura
  (`generalAuraStrength` within `generalAuraRange`), a labelled strength line in
  `planCombat` — not the act above it.

## Legacies

- Spending a person on either the act or the work records their name in the Reliquary. Most people add a standing legacy. John Dee and Aesop give their reward at once.
- A legacy's yield on a work counts as a card yield. Under The Spirit Way, a wonder receives lines that apply to any great person's work. Work multipliers also apply to those lines. A line that names a specific improvement applies only to that improvement.
- Hypatia adds science while the empire has zero or more happiness. If happiness falls below zero, her effect stops until the empire recovers.
- Boudica's legacy ends when the empire advances past the age recorded on her legacy. The record stays in the Reliquary.
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
| `actGainTurns` | 8 | How many turns of the empire’s own science, culture or gold a rate-quoted act pays. |  |
| `engineerHammers` | 60 | Hammers an engineer’s act pays into the town it stands in, multiplied by the age. |  |
| `artistHappiness` | 2 | Happiness an artist’s act hangs on the town it stands in. |  |
| `artistTurns` | 10 | How many turns that happiness lasts. |  |
| `generalRadius` | 2 | How far a general’s act reaches, in hexes. |  |
| `generalCombat` | 3 | Strength that act hangs on every friendly piece in reach. |  |
| `generalTurns` | 5 | How many turns that strength lasts. |  |
| `generalAuraRange` | 2 | How far a great general’s standing aura reaches while the piece is alive. |  |
| `generalAuraStrength` | 3 | Strength every friendly soldier inside that aura fights with. |  |
| `citadelClaimRadius` | 1 | How far a citadel claims ground around itself, in hexes. |  |
| `offerGoldPerRenown` | 10 | Gold per point of the next renown threshold, before purchase discounts. |  |
| `offerPriceFaith` | 750 | The same out of the faith bank, under Sacred Patronage. The price is flat: it does not rise. |  |
| `scholarDraftFaith` | 1000 | What The Academy charges in faith for a scholars-only hand, leaving the ladder where it stands. |  |
| `renown.base` | 75 | What the first great person costs in renown — the ladder’s floor. |  |
| `renown.linear` | 58 | What each person already recruited adds to the next one’s price, straight. |  |
| `renown.exponent` | 2.65 | The power the recruit count is raised to and added on top — culture’s own. |  |

## The roster

The 157 people below can appear in offers. Three retired rows remain in the data for saves. Each person uses the act and work of their family. The work column shows the starting yield. Philosophy and Education each add 2 to that yield. The tier is a design rating.

### Æra II — The Age of Heroes

50 names in roster order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Imhotep | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +15% production toward wonders · +3 science per wonder you hold |  |
| Ahmes | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +2 science in every city on fresh water |  |
| Kidinnu | Scholar | ● defining | 8 turns of science | Academy (+4 science) | +4 science and +15% science in your capital |  |
| Enheduanna | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 culture, +1 faith in every city with a Shrine |  |
| Homer | Artist | ● defining | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +3 on every hex carrying a great person's work — science on an Academy, culture on a Landmark, production on a Manufactory, gold on a Customs House, production on a Citadel and faith on a Holy Site |  |
| Sin-lēqi-unninni | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +50% production toward buildings that supply culture · Each building that supplies culture gains +1 renown per turn |  |
| Ilimilku | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 production, +2 culture in every coastal city |  |
| Senenmut | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +6 production in every city with a mountain hex inside its borders |  |
| Amenhotep son of Hapu | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +4 production and +15% production toward wonders, in your capital |  |
| Bezalel | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +1 production and +1 faith in every city per Temple there |  |
| Ea-nāṣir | Merchant | ● defining | 8 turns of gold | Customs House (+4 gold) | +2 gold on every hex with a Mine · -2 happiness |  |
| Kushim | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 gold in every city with a Granary |  |
| Aššur-idī | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +2 gold in every city but your capital |  |
| Lamassī | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 gold on every hex with a Pasture · +2 gold on every trade route you send |  |
| Ahmose son of Ebana | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for melee units · killing a unit grants +10 gold |  |
| Piyamaradu | General | ● defining | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength when defending |  |
| Sinuhe | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | all units: +10 healing per turn |  |
| Deborah | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength within 2 hexes of one of your cities |  |
| Sappho | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +3 culture in your capital · +3 happiness |  |
| Eupalinos | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +1 food on every improved hex beside a mountain |  |
| Thales of Miletus | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +2 science in every coastal city · +1 gold on every hex with a Plantation |  |
| Tapputi | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 gold, +2 science on every hex carrying a luxury resource |  |
| Pāṇini | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +2 science in your capital · completing a technology grants +30 culture |  |
| Lu Ban | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +15% production toward buildings · newly created workers gain +1 charge |  |
| Theodorus of Samos | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +3 production in every city with a Smithy |  |
| Hanno the Navigator | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 gold in every coastal city · founding a city grants +60 gold |  |
| Fan Li | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | buildings cost −15% to buy |  |
| Harkhuf | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +2 gold per unique luxury |  |
| Fu Hao | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength inside your territory · +2 faith in every city with a unit standing in it |  |
| Sun Tzu | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | military units: +1 sight · +4 combat strength against a wounded unit |  |
| Hippocrates | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +15% food surplus stored toward growth |  |
| Anaximander | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 science per foreign city you have sighted |  |
| Baudhāyana | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +2 science in every city with a Shrine |  |
| Peseshet | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +2 happiness · +1 food in every city |  |
| Solon | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +3 authority capacity · +2 science in your capital |  |
| Hesiod | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 food and +1 culture in every city per public work standing there |  |
| Aesop | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | when spent, gain 3 free rerolls · when spent, open 1 free Order draft |  |
| Exekias | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 culture on every trade route you send |  |
| Telesilla | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | every city: +5 city defence · +2 culture in every city with a unit standing in it |  |
| Thutmose the Sculptor | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 culture on every hex with a Quarry |  |
| Mandrocles of Samos | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | all units: +1 movement while embarked · +1 production in every coastal city |  |
| Ineni | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +1 production on every hex with a Quarry |  |
| Sunshu Ao | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +3 food in every city on fresh water |  |
| Colaeus of Samos | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 gold per foreign city you have sighted |  |
| Wenamun | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 production, +1 gold on every hex with a Lumbermill |  |
| Iddin-Marduk | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 gold on every hex with a Farm, in your capital |  |
| Leonidas | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength when defending while fortified |  |
| Djehuty | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength when attacking cities |  |
| Artemisia of Caria | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +1 combat strength for ships · +1 production on every hex with a Fishing Boat |  |
| Tomyris | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for mounted units · +1 faith on every hex with a Pasture |  |

### Æra III — The Age of Empire

50 names in roster order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Epicurus | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | -15% happiness demanded per citizen, in every city of 8 or more citizens | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Aristotle | Scholar | ● defining | 8 turns of science | Academy (+4 science) | your buildings that supply science pay +25% | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Hemiunu | Engineer | ● defining | 60 production × age | Manufactory (+4 production) | +25% production toward wonders · -2 happiness in every city while it is building a wonder |  |
| Ptahhotep | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 authority capacity per 2 Libraries |  |
| Archimedes | Engineer | ● defining | 60 production × age | Manufactory (+4 production) | siege units: +1 movement · +3 combat strength for siege units |  |
| Hypatia | Scholar | ● defining | 8 turns of science | Academy (+4 science) | while your happiness is zero or higher: +10% science in every city |  |
| Zhang Heng | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +1 gold per building in your cities that supplies science |  |
| Eratosthenes | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 science per 80 hexes you have revealed |  |
| Qu Yuan | Artist | ● defining | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +10% culture in every city · -3 happiness in your capital |  |
| Sima Qian | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | gaining a great person grants +80 culture |  |
| Phidias | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +5 culture per wonder you hold |  |
| Li Bing | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +1 production on every hex with a Farm beside fresh water |  |
| Dinocrates | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | completing a wonder grants +3 production in every city for 10 turns |  |
| Vitruvius | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | Aqueducts supply +1 happiness · Public Baths supply +1 happiness |  |
| Zhang Qian | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 gold per 80 hexes you have revealed |  |
| Nanaivandak | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | each connected city pays +2 gold |  |
| Hippalus | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +2 gold on every hex with a Fishing Boat |  |
| Crassus | Merchant | ● defining | 8 turns of gold | Customs House (+4 gold) | all units and buildings cost −20% to buy · buying anything costs your empire -1 happiness for 10 turns |  |
| Pytheas | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | your trade units cannot be attacked or plundered · +3 gold on every trade route that ends in another empire’s city |  |
| Hannibal | General | ● defining | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +5 combat strength when attacking outside your territory · -4 combat strength when defending inside your territory |  |
| Han Xin | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength beside fresh water |  |
| Gaius Marius | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | all units: +1 movement inside your territory | proposed name (fold-in 2026-09-09) — yours to change |
| Boudica | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +8 combat strength when defending inside your territory · lost when the age it was earned in closes |  |
| Spartacus | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +5 combat strength when attacking an empire with more cities than you |  |
| Ibn Sīnā | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +1 happiness in every city |  |
| Virgil | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 culture in every city · founding a city grants +100 culture |  |
| Kālidāsa | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +3 culture on every trade route you send · +2 happiness |  |
| Wang Xizhi | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 culture per building in your cities that supplies science |  |
| Cai Yan | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +4 culture per great person called by another empire |  |
| Julius Caesar | General | ● defining | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | capturing a city grants +200 gold · capturing a city grants +200 culture |  |
| Zhuge Liang | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for ranged units · +2 food in every city with a unit standing in it |  |
| Trưng Trắc | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +6 combat strength when defending against an empire with more cities than you |  |
| Lü Buwei | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 authority capacity · gain culture equal to 10% of your gold gained per turn |  |
| Cai Lun | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +2 science in every city per Library there · +1 culture in every city per Library there |  |
| Maria Hebraea | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 science on every hex with a Mine |  |
| Euclid | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +30% production toward Libraries · +30% production toward Universities · +30% production toward Observatories |  |
| Ban Zhao | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +3 science in your capital · +1 authority capacity |  |
| Sophocles | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | Amphitheaters supply +1 happiness · +1 culture in every city with an Amphitheater |  |
| Tiruvalluvar | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 culture on every hex with a Plantation |  |
| Auvaiyar | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | while you are at peace: +3 culture in every city |  |
| Hero of Alexandria | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +1 science per building in your cities that supplies production |  |
| Apollodorus of Damascus | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +2 production in every city joined to your capital by road |  |
| Sostratus of Cnidus | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +2 production, +2 gold in every city with a Harbour |  |
| Zheng Guo | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +1 food on every hex with a Farm, in every city without fresh water |  |
| Pasion | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +1 gold per 50 gold in the treasury (at most +20 gold) |  |
| Widow Qing of Ba | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +4 gold per improved strategic resource |  |
| Marcus Ulpius Yarhai | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +2 trade routes |  |
| Sang Hongyang | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +10% gold in every city with a Market |  |
| Modu Chanyu | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for mounted units · +20% production toward mounted units |  |
| Chanakya | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | all units cost no gold in maintenance while standing in one of your cities · +3 authority capacity |  |

### Æra IV — The Age of Cathedrals

53 names in roster order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| al-Khwārizmī | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +10% faith in every city with a University · you may buy buildings that supply science with faith |  |
| Maimonides | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +1 happiness per 2 buildings in your cities that supply science | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Roger Bacon | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | completing a technology grants +15% food in every city; +15% production in every city for 3 turns | proposed name, family and tier (fold-in 2026-09-09) — yours to change |
| Āryabhaṭa | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | Each building that supplies science gains +1 faith · Each building that supplies science gains +1 renown per turn |  |
| Murasaki Shikibu | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +4 culture per melee unit in the field |  |
| Rūmī | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | your Temples pay +100%, counted after every other bonus on them |  |
| Sei Shōnagon | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +5% culture in every city per unique luxury there |  |
| al-Jazarī | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | your buildings that supply production pay +40%, counted after every other bonus on them |  |
| Su Song | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +1 production, +1 science on every hex with a Mine, in every city with a Workshop |  |
| Villard de Honnecourt | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +15% production toward buildings · +15% production toward wonders |  |
| Benjamin of Tudela | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 gold, +1 culture on every hex carrying a great person's work |  |
| Ibn Jubayr | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +5% culture per other empire you trade with |  |
| Marco Polo | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 gold per 5 hexes between the two cities |  |
| Francesco Datini | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +2 gold on every hex carrying a resource, in every city with a Bank |  |
| Subutai | General | ● defining | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | mounted units: +1 movement · +2 combat strength for mounted units |  |
| Tomoe Gozen | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for mounted units · +3 combat strength for ranged units |  |
| Jan Žižka | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +5 combat strength when defending while fortified |  |
| El Cid | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +6 combat strength inside the borders of a city you captured |  |
| Mimar Sinan | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +2 production, +2 culture in every city with a Temple |  |
| Paracelsus | Scholar | ● defining | 8 turns of science | Academy (+4 science) | +20% science and -1 happiness in every city |  |
| Tycho Brahe | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +2 science on every hill hex beside a mountain |  |
| John Dee | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | when spent, open 2 free Order drafts |  |
| Copernicus | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | your Observatories pay +100%, counted after every other bonus on them |  |
| Christine de Pizan | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +3 culture per public work you hold |  |
| Dürer | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 culture per wonder you hold · your wonders pay +50% |  |
| Leonardo | Engineer | ● defining | 60 production × age | Manufactory (+4 production) | +20% production toward wonders · a great person's act pays +50% |  |
| Taqī al-Dīn | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +3 science in every city with a Workshop |  |
| Jakob Fugger | Merchant | ● defining | 8 turns of gold | Customs House (+4 gold) | +20% gold in every city · -1 authority capacity per 3 cities you hold · all units and buildings cost −10% to buy |  |
| Willem Beukelszoon | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | the works on every hex with a Fishing Boat pay +100% | proposed name (fold-in 2026-09-09) — yours to change |
| Gracia Mendes Nasi | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | +3 authority capacity · +1 happiness per spare authority · +5 gold per spare authority |  |
| Jacques Cœur | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 culture per 100 gold you have spent buying (at most +60 culture) |  |
| Nzinga of Ndongo | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +5 combat strength when defending in forest · +5 combat strength when defending in jungle |  |
| Yi Sun-sin | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 food in every coastal city · +3 combat strength for ships |  |
| Lautaro | General | ○ situational | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +5 combat strength against mounted units |  |
| Li Bai | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 culture on every hex beside a river or beside a mountain |  |
| Dante Alighieri | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | gain culture equal to 25% of your faith gained per turn |  |
| Ferdowsi | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +4 culture on every hex carrying a great person's work |  |
| Michelangelo | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +3 culture on every hex with a Quarry · +15% production toward wonders |  |
| Ibn al-Haytham | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | your Libraries pay +100%, counted after every other bonus on them |  |
| Ibn Khaldun | Scholar | ◆ strong | 8 turns of science | Academy (+4 science) | +3 authority capacity · +2 science per spare authority |  |
| Brahmagupta | Scholar | ○ situational | 8 turns of science | Academy (+4 science) | +1 gold in every city per building there that supplies science |  |
| Belisarius | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength when attacking cities · capturing a city grants a melee unit |  |
| Gajah Mada | General | ● defining | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +4 combat strength for military units · while you are at peace: -3 happiness |  |
| Amina of Zazzau | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | every city: +5 city defence · +3 gold in every city with a Stone Walls |  |
| Tlacaelel | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | killing a unit grants +50 faith · killing a unit grants +50 culture |  |
| Johannes Gutenberg | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +2 science, +2 culture in every city with a Printing House · +50% production toward Printing Houses |  |
| Jang Yeong-sil | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +1 food, +1 science on every hex with a Farm beside fresh water |  |
| Aḥmad ibn Mājid | Merchant | ○ situational | 8 turns of gold | Customs House (+4 gold) | +1 trade route · your trade routes by sea pay +50% |  |
| Fatima al-Fihri | Merchant | ◆ strong | 8 turns of gold | Customs House (+4 gold) | buildings that supply science or faith cost −30% to buy |  |
| Li Qingzhao | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +4 culture per unique luxury |  |
| Hildegard of Bingen | Artist | ◆ strong | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +2 food, +2 production, +2 science, +2 culture, +2 faith in every city with a Cathedral |  |
| Filippo Brunelleschi | Engineer | ◆ strong | 60 production × age | Manufactory (+4 production) | +25% production toward buildings and +25% production toward wonders, in your capital |  |
| Guo Shoujing | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | +2 food, +2 gold in every city joined to your capital by road |  |

### Æra V — The Magister

4 names in roster order.

| Person | Family | Tier | Act | Work | Legacy | Notes |
|---|---|---|---|---|---|---|
| Bashō | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 culture on every forest or jungle hex |  |
| Sor Juana | Artist | ○ situational | 8 turns of culture and 2 happiness for 10 turns | Landmark (+4 culture) | +1 science, +1 culture on every hex carrying a resource, in every city with a University |  |
| Vaucanson | Engineer | ○ situational | 60 production × age | Manufactory (+4 production) | newly created workers gain +2 charges |  |
| Gustavus Adolphus | General | ◆ strong | Heal units within 2 hexes and give them +3 strength for 5 turns | Citadel (+3 production, +8 defence, claims nearby hexes) | +3 combat strength for ranged units · siege units: +1 movement |  |

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

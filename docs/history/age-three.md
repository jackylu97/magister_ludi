# Æra III — the fork: tier-18 governments, Pool III doctrines, and the world age (2026-09-05)

The user's frame: hitting the third age should be a milestone — the moment
you lean into war or into a victory road — with many paths and drafts
consequential enough to shape the endgame. The standing constraint: **no
age gate on governments** (entering the tier-18 government early on culture
is a viable style). So the fork must be made *legible and sharp* where it
already sits: the three tier-18 governments, the eight Pool III doctrines,
and the Gov III order pool.

---

## 1. The three tier-18 governments — evaluated

What each is today (slots M/E/W · signature):

| Government | Slots | Signature today | Reading |
|---|---|---|---|
| Divine Mandate | 3/3/5 | happiness tiers +5pp · +1🎵 per 5🕯 gained per turn | The **W-heavy** government. The signature is half-invisible ("tiers +5pp" is a rule a player cannot see) and half a conversion. Its real identity is five wildcard chairs, and nothing says so. |
| Imperium | 5/3/3 | +3 authority capacity · all units +1 movement | The **M-heavy** government. Both clauses are generic utility any war player would take; nothing makes the five military chairs *pay*. |
| Merchant League | 2/5/4 | +1💰 per gold building · trade routes +50% | The **E-heavy** government. The most focused of the three — routes are its verb — but the building line is a flat, and two E chairs fewer than it has would draft the same. |

**The proposal: each tier-18 government is a deck-reader of its own
dominant chair.** The slot layout already says what the government is *for*;
the signature should make that chair's cards better, so "which government"
becomes "which deck" — the Balatro fork, using the `slottedOrdersOfSlot`
CountKind the card-shapes pass built.

| Government | Proposed signature | Why |
|---|---|---|
| **Divine Mandate** 3/3/5 | **+1🕯 and +1🎵 in your capital for every wildcard Order slotted** · your happy cities pay +10% faith | The five W chairs become an engine you can see counting up on the stamp; the tier clause goes (illegible). The faith→culture conversion moves to a doctrine (below), where a permanent pick belongs. |
| **Imperium** 5/3/3 | **+1⚒ in every city for every military Order slotted** · all units +1 movement · **capturing a city pays +50💰 and heals every unit of yours beside it** | The five M chairs feed the war economy directly (hammers), the movement stays as the war verb, and the third clause is the conquest payoff the war path lacks — capturing something now *builds* your empire. `+3 authority` moves to Hegemony (below) so the doctrine and the government stop overlapping. |
| **Merchant League** 2/5/4 | **+2💰 for every economic Order slotted** · trade routes pay +50% · +1 trade route | The route clause is right; the flat building line becomes the chair-reader; the extra route makes the government the one that *runs more*. |

these are great, lets keep these. **RULED — building.**

Vocabulary: all three ride `countScaled` on `slottedOrdersOfSlot` with
`where: 'capital'` or empire payouts (the Guild Charter's precedent), a
`percentYields` with a happiness-tier scope (check `CityScope` for
"content"/tier — if absent, Divine Mandate's second clause is "+10% faith in
cities of 6 or more"), a `routeSlots` grant (Ledger-Keepers' shape), and one
Imperium's third clause: **verified 2026-09-05 — buildings already
survive a capture** (`handOverCity`, combat.ts: "the walls a conqueror
inherits are the walls the town was defended with"), so "keeps its
buildings" would print a rule that is already the rule. Replaced with a
conquest windfall on the existing capture occasion (The Triumphal Way's
seam): +50💰 and `healAll` on the units beside the taken town (The Empire's
grant shape) — stock, and it makes the next siege start from strength. Government signatures are card effects on
the government row, read by the same evaluator.

---

## 2. Pool III doctrines — evaluated row by row

Today: The Iron Price · Manifest of the Steppe · The Gilded Court · The
Grand Bazaar · Master of Maps · Hegemony · Pax Imperia · The Wandering
Court. Two holes stand out before any row is read: **no 🕯 doctrine and no
✶ doctrine at tier 18** — the faith path and the science path have no
permanent pick at the fork. Marks: KEEP · MODIFY · CUT · ADD.

| Doctrine | Today | Verdict |
|---|---|---|
| The Iron Price ⚒ | Killing a unit +15🎵 · pillaging +15💰 | **MODIFY — sharpen**: +20🎵 per kill · pillaging pays double. The war path's economy doctrine should feel like one. |
| Manifest of the Steppe — | Settlers −40%, +2 movement · every city +1😊 demand | **KEEP** — the wide fork, clean trade. |
| The Gilded Court 🐫 | Gilded Hall unlock · +1🔬+1🎵 on gold tiles · +1 authority | **MODIFY — focus**: drop the authority clause. Two clauses, one identity (gold ground). |
| The Grand Bazaar 🐫 | luxury happiness +50% · duplicates pay 30% · +2💰 per unique | **KEEP** — the Caravan payoff; the best-designed row in the pool. |
| Master of Maps 🧭 | +1 sight and movement · −2 strength | **MODIFY — make it the Geomancy doctrine**: +1 sight and movement · **every vein you surface and every ruin you claim pays +25🔬** · −2 strength. The Æra III reveal becomes a path: prospecting is now a science plan, and the strength cost stays as the trade. |
| Hegemony ⚒ | +1 authority capacity per city · captured city −1 authority | **MODIFY — absorb Imperium's authority**: **+3 authority capacity, and +1 more per city you hold** · captured cities cost no authority. The wide-war doctrine, distinct from Client Kings (an order). | [way too strong, lets say: captured cities cost no authority, +5% production-wide after capturing a city]
| Pax Imperia 🌱 | +3😊 +3🎵 in cities of 8+ | **KEEP** — the tall floor at the fork. |
| The Wandering Court 🌱 | −15% capital · +3 everything elsewhere | **KEEP** — the most distinctive row here; the anti-capital identity. |
| **ADD — The Great Litany II** 🕯 (working name *The Pilgrim Ways*) | **+2🕯 in every city following your religion · converting a foreign city pays +30🎵 · +1🎵 per 5🕯 gained per turn** (the conversion Divine Mandate gives up) | The faith fork's permanent pick — spreading the faith becomes an engine. `following…` CountKind + a conversion occasion (check the religion windfall occasions; if "a foreign city converted" isn't an occasion, the clause is a count: "+1🎵 per foreign city following you"). |
| **ADD — The Natural Philosophers** ✶ | **+1🔬 for every 2 buildings in your capital · completing a technology pays +10🎵** | The science fork's permanent pick; the capital-buildings count is the Encyclopaedia's shape one age early and one city narrow. | [not strong enough, edit: +1 science per building in your capital, completing a technology grants a one time boon of 20% of your culture per turn]
| **ADD — The Deep Delving** ⛰ (Highlands) | **Mines and quarries +1⚒ · a vein you surface pays +40💰 and its mine +2⚒ for ever** | Geomancy's second home; with Master of Maps it makes prospecting a real Æra III playstyle. Vein-surfaced is an occasion (`prospect` verb) — check the windfall vocabulary; the standing +2⚒ is a tile line on `richOre`-marked hexes (marker exists). |

great, love these.

Pool III after: eleven rows, every line with a permanent pick, two Geomancy
paths, no orphan clauses.

---

## 3. The Gov III order pool — the drafts at the fork

The pool is the game's largest (44) and already holds its best
rule-changers (The Old Ways, Skirmishers' Creed, Mandate of Heaven, The
Casus Belli, Emergency Powers' cousin the Arsenal Law, the four charters).
Two changes make the drafts *consequential* rather than merely rich:

1. **Seals lengthen from tier 18: 5 → 10 turns** (data: the seal length
   per government tier, or per pool). A Gov III pick is a commitment you
   feel; early-game churn stays cheap. [veto - certain cards you want to slot in and out, should be part of the game's skill expression]
2. **Rarity tightening**: the ○ mark should be exactly the rule-changers.
   Promote Cistern Works (●→○ — it is the best rule-changer in Gov II),
   demote Mandate of Heaven (○→◆ — large, not rule-changing). Audit the
   rest against "changes how you play" when the cuts land.

No new rows are needed at the fork beyond the cards-pass-2 holes already
ruled (The Congregation, The Granary Laws land here).

---

## 4. The world age — the user's proposal, evaluated

**The idea**: a global age counter advanced by the progress of all players,
with an effect when the world advances. **My read: this is the one
mid-game mechanic worth adding, and it should wait for the first
playthrough** (the user's first-cut rule stands). What it buys, and the
minimal honest shape:

- **The shared rhythm**: Endless Legend's winters are the proof that a
  global clock everyone feels is the fix for a mid-game where each player
  is alone with their yields. "The world enters the Age of Iron" is a
  moment for *everyone* at once — the natural home for the deferred age
  scoreboard (the ceremony *is* the board).
- **The exam**: the wild's tier follows the WORLD age (today
  `barbarianTier` asks each seat's technology). When the world advances,
  the wild advances for everyone — the laggard who hasn't reached the age
  faces Æra III raiders with Æra II spears. Pressure that scales with the
  table, not with the player's own progress — the closest honest thing to
  a mid-game crisis, on a knob that exists.
- **Catch-up**: research toward techs of ages *at or below* the world age
  costs less (Civ V's tech spread, a percent in data). This is the
  anti-snowball lever the user has asked for twice ("later eras feel too
  fast") — the leader's lead is capped by the table's pace, not by rules
  against leading.
- **The derivation**: world age = the age the MEDIAN real player has
  entered (derived from `techsResearched`, no stored state; deterministic;
  replay-safe). With two players that is "both"; with four, the third.
  Firsts and beads stay per personal age — the race is still yours. 
  [for this to be meaningful, it needs to be the mean age of all players(including bots). For single player campaigns, it should punish you if you're behind the bots]
- **The effect on advance**, in this order of certainty: the ceremony (UI
  only), the wild's tier (one reader changes what it asks), the catch-up
  percent (one line in tech cost), and — later, if playtests want it — an
  age-entry draft for everyone (the Balatro "shop opens" beat, but that is
  a new draw and a design decision on its own).

**Not this**: gating anything a player *can do* on the world age (their
own governments, techs, buildings stay on their own progress — the user's
early-adopter rule). The world age only changes the *world*: the wild, the
costs of trailing, and what the screen announces.

---

## What I'd take from this doc, in order

1. The three government signatures as chair-readers (three data rows, one
   small rule for Imperium's capture clause) — this alone makes the fork.
2. The Pool III pass (three modifications, three additions).
3. Seals to 10 from tier 18; the two rarity moves.
4. The world age, after the playthrough, in its minimal shape: ceremony →
   wild's tier → catch-up.

---

## BUILT — sections 1, 2 and the rarity half of 3 (2026-09-05, schema 70)

Sections 1 and 2 are shipped whole; section 3 shipped its rarity half only —
**the seal lengthening was vetoed by the user mid-build** (*"certain cards you
want to slot in and out, should be part of the game's skill expression"*), so a
seal is still the table's five turns on every shelf and `sealTurnsFor` is
untouched. Section 4 (the world age) was out of scope and is not built.

**The three signatures, as shipped.** Each is a `countScaled` on
`slottedOrdersOfSlot` — the card's own flavour, never the chair's — so the
figure moves the moment a card of the deck's kind is slotted beside it:

| Government | Shipped signature |
|---|---|
| Divine Mandate 3/3/5 | +1🕯 and +1🎵 **in the capital** per wildcard Order slotted · **+10% faith in every city of 6 or more** |
| Imperium 5/3/3 | +1⚒ **in every city** per military Order slotted · all units +1 movement · capturing a city pays **+50💰 and heals every one of your units** |
| Merchant League 2/5/4 | +2💰 per economic Order slotted · routes pay +50% · +1 trade route |

Three notes on the shipping:

- **There is no contentment scope**, so Divine Mandate's second clause took the
  doc's own stated fallback (cities of 6 or more), with the reason on the row's
  `note`. A `CityScope` for "a contented town" is a design decision, not a
  number.
- **`healAll` is the whole army**, not the ring around the taken town — it is
  the shape The Empire already carries, and the row prints what it does
  ("heals every one of your units") rather than a reach the vocabulary cannot
  express.
- **Imperium's +3 authority is gone rather than moved.** Section 1's ruled table
  has no authority clause and section 2's Hegemony row carries the user's own
  bracketed rewrite, which drops the capacity ladder — so the point of writ the
  proposal moved between them is cut by both halves of the ruling. Worth the
  user's eye: the war path lost three points of capacity across this pass.

**Pool III, eleven rows.** The Iron Price pays 20🎵 a kill and doubles a
pillage (a percentage on the occasion's own figure, not a second flat). The
Gilded Court dropped the writ. Master of Maps is the Geomancy row: the eyes,
the legs, the −2 strength, and **+25🔬 for every vein surfaced and every ruin
claimed**. Hegemony is the user's bracket, with one departure stated below.
Three rows are new — **The Pilgrim Ways** (+2🕯 per following city · +1🎵 per
*foreign* following city · the +1🎵 per 5🕯 conversion Divine Mandate gave up),
**The Natural Philosophers** (+1🔬 in the capital per building there ·
completing a technology pays a fifth of a turn's culture — the user's
mid-build edit: *"not strong enough"*) and **The Deep Delving** (+1⚒ on every mine
and quarry · a vein surfaced pays +40💰 · +2⚒ on a mine standing on rich ore).

**One new occasion.** `WindfallOccasion`'s `veinFound`, fired from `prospectAt`
on a strike and only on a strike, after the seam has surfaced. It is
`prospect`'s other half rather than a flag on it: that occasion pays for the
*asking* by design — certainty is the thing being bought — and a rider that
fired only on ore would have been a second rule about what a survey is. Both
Geomancy rows ride it.

**Two open strokes, for the user:**

1. **"Captured cities cost no authority" ships as "costs 1 authority."** The
   meter floors a captured town at one point (`cityCosts`, Entry XIV.D.2 —
   deliberately, so two stacking cards cannot make conquest free), so zero is
   not sayable without lowering that floor, which is a rules decision and not a
   number. Hegemony *sets* the price to the floor (`meterRule` `value: 1`),
   which is the cheapest any law in the game can make a conquest. Say the word
   and it is one line.
2. **"+5% production-wide after capturing a city" ships as ten turns.** The
   bracket does not say how long, and nothing in the game can hold a standing
   bonus behind "you have captured a town at some point"; the honest shape is
   The Triumphal Way's — a capture hangs a timed effect on the empire — and its
   ten turns are what this borrowed. A different number is a one-line edit.

**The rarity half of section 3:** Cistern Works ● → ○, Mandate of Heaven ○ → ◆,
both marks pinned doc↔data by `statecraftDocSync.test.ts`.

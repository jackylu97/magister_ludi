# The loop review — the engine view, the synergy pass, the breadth audit (2026-09-05)

The user's ask, after the honest assessment of how the game will play: write
up items 3–5 for review. Items 1 (the age scoreboard) and 2 (a wolf in the
default game) are ruled on the flags board — deferred and queued respectively.

The thesis under all three: the pitch is *civ meets Balatro*, the Civ half is
nearly whole, and the Balatro half has its parts (drafts, rarity, stamps,
chains of conversions) without enough of the game *routing through* them. A
deck the player can see compounding, pools that read as archetypes, and a
system list where every entry feeds the deck loop — those are the three.

---

## 3. The engine view — watching your own snowball

> **BANDS 1-2 BUILT 2026-09-05.** `src/ui/ledgerScreen.ts` + `#ledger-overlay`,
> the **eighth** id in the capped-overlay rule, opened from any yield chip in the
> top bar but culture's (culture's chip already opens Statecraft). Band 1 is the
> six voices split eight ways — tiles - buildings - the deck - religion - great
> people - trade - wonders - other — bucketed off the simulation's own breakdown
> lines by **card id**, never by label; the one label read is
> `explainEmpireGold`'s, keyed on the head before the ` - ` as `empireTradeLines`
> already keys it. No new fold: the six totals are `civYields`' own. Entry
> XVII's multiplied **gain** (`banked − Σ flats`) is shared by **who supplied
> the percentages** — each `CityYieldPercent` and each `ProductionModifier` on
> that voice of that town, weighted by magnitude among the lines pushing the way
> the town actually moved (`percentWeights` + `shareGain`; a meter tier and the
> arrears are `other`'s, a building's own percent is the stones'); the flats keep
> their own split, and `shareOut` rounds the eight owed figures into whole slices
> that still add to the bank. A card's `tileYield` line is the **card's** and not
> the land's (`addWorkedTile`, off `TileYieldContribution.card`) — the centre
> stays whole and stays the land's, its inheritance being an excess rather than a
> sum. Both were ruled 2026-09-07 (`docs/flags.md` jj) after the user found that
> a card paying only a percentage, and every late Order paying on ground, added
> nothing to "your cards". Band 2 is a session ring buffer of 400 turns sampled at
> `onTurnResolved`, not saved, and the band says so. **Band 3 is still open** —
> it is drawn as a labelled empty band saying the lifetime figures are not kept
> yet, and it still wants the tally schema and the `collectYields` writer
> described below. `test/ui/ledgerScreen.test.ts` is the behaviour record.

**The problem.** Formidability is a feeling of *relative* growth, and the
game shows growth only as a top-bar number this turn. The stamps show one
card's contribution; nothing shows the deck's, the empire's, or the curve.
Balatro's score readout is what makes the multiplier felt; we have the
ingredients (rule-5 breakdowns everywhere, the abacus) and no screen.

**The proposal: the Ledger.** One sheet (the capped-overlay paper the
Reliquary borrowed — an eighth sheet id in the register), opened from the
top bar's yield strip, in three bands:

1. **This turn, by source class.** The six voices as a stacked bar each,
   split by WHERE the yield comes from — *tiles · buildings · the deck
   (orders + doctrines + government) · religion (beliefs, rites) · great
   people (legacies, works) · trade · wonders* — read off the same
   breakdown lists the yield readout prints (no new fold; the classes are
   the `source` labels bucketed). The deck's slice is drawn in the
   statecraft register's ink so the eye finds it. A caption under each bar:
   "your deck makes 41 of your 96 science".
2. **The curve.** Each voice's per-turn total across the game so far, one
   sparkline per voice, the deck's share shaded under it. The sim keeps no
   history and must not grow one for a view: the UI samples the six totals
   at every `onTurnResolved` into a session ring buffer (not saved — a
   reloaded game starts its curve at the reload, and says so in a footnote;
   an honest reading, and the cheap one). Age turns are ticks on the axis.
3. **What the deck has produced** — lifetime, per card, the "has produced"
   figure the stamp design of record names as phase 2. This band is the
   one that wants a stored tally per owned order (the growing cards' tally
   register is the shape — `PlayerStatecraft.tallies` keyed by card, a
   count per voice), written by `collectYields` from the card's own
   breakdown lines. **Schema.** Ships as band 3 behind a flag in the doc
   until the tally lands; bands 1–2 need nothing.

Specimen language throughout: ink bars, tabular figures, no colour beyond
the registers already in use. Mobile/narrow: bands stack.

**Why this and not a score.** A single score number invites optimizing the
number. Per-source bars answer the player's actual question — *is my deck
doing anything?* — and make the balance turn's target ("statecraft's share
of an empire's power rises over the game") a thing a player can watch.

**Cost.** Bands 1–2: a UI batch (~one agent), no sim change. Band 3: the
tally schema (small, already shaped) plus one writer in `collectYields`.

---

## 4. The synergy-density pass — pools that read as archetype decks

> **BUILT 2026-09-05 (schema 67).** Every unstruck row of the table below is in
> `data/statecraft.json` and in the tables of `docs/orders-and-doctrines.md`;
> the two rows the user struck (Statute Labour, Quarrymen's Guild) are
> untouched. **No `CardEffect` shape was added** — every row rides the
> vocabulary the card-shapes pass left. Four departures, each written out in
> **What shipped, row by row** below the table: Border Wardens' switch, Ore
> Tithes' reader, The Far Charts' second half, and The Wolf-Standard, which is
> deferred whole. `test/sim/statecraft.test.ts`'s "the synergy-density pass of
> 2026-09-05" block is the behaviour record; the built tables are the master
> list.


**The problem, in the pools' own rows.** Of the built Order rows marked ●
(common), the large majority are *unconditional flat numbers* — "+1 gold in
every city" (Weights & Measures), "+4 happiness" (Festival Days), "+1 faith
in every city" (Wayside Shrines), "+2 combat strength inside your
territory" (Border Wardens), "+3 authority capacity" (Provincial Governors),
"+2 science in every city of 5+" (Scholars' Stipend), "+4 production in
every city with a quarry" (Quarrymen's Guild), "+2 happiness in every city
of 6+" (The Grain Dole). A pool of flat numbers is a pool where no two
cards are better together than apart, so a draft is shopping, not
deck-building. The card-shapes pass added the first readers and
conversions; this pass is about *ratio*: what share of each pool creates a
decision.

**The target ratio per pool** (a proposal to argue with): roughly a third
flat floors (a pool needs vanilla), a third conditional/scoped rows (pay
for doing something), a third readers/conversions/payoffs (pay for what
else you drafted or built). Today the built pools sit nearer 60/30/10.

**The rework list — same power, sharper, row by row.** Marked so you can
strike; unstruck rows go to a data pass. Every replacement rides existing
vocabulary (countScaled, scoped percents, conversions, deck-readers,
building-category selectors, `hasBuilding` scopes) — no new shapes.

| Pool | Row today | Becomes | Why |
|---|---|---|---|
| Chiefdom | Salt Tithes (+2💰 per unique luxury) | keep — already a count | fine |
| Chiefdom | Boundary Stones (+30% borders) | +30% borders **in cities with a Monument** | ties the opener to the first build |
| Chiefdom | First Rites (+2🕯 capital) | +1🕯 capital, **+1🕯 per wildcard slotted** | a reader in the opening pool, so the deck talks from turn one |
| Gov I | Weights & Measures (+1💰 every city) | keep — the vanilla floor | fine |
| Gov I | Festival Days (+4😊) | keep — the vanilla floor | fine |
| Gov I | Wayside Shrines (+1🕯 every city) | keep — floor | fine |
| Gov I | Border Wardens / Vanguard | merge into one: **+2 strength inside, +2 outside — never both**: the card reads the slot beside it (M-slot count) | one row, one decision (do I run a second M card) |
| Gov I | Statute Labour (+1⚒ per 4 citizens) | +1⚒ per 4 citizens **in cities with a Workshop** | building-scoped, so it pairs with the Toolmakers' Charter | [workshops come later in the game, keep as is]
| Gov I | The Almanac (+2🔬 capital, +1 per Library) | keep — already a building count | fine |
| Gov I | The King's Table (+1😊 per 2 capital citizens) | keep | tall's floor |
| Gov I | Harbour Dues (+2💰 +1🎵 coastal) | **coastal cities pay 5% of their gold again as culture** | the Tide's conversion; pairs with Thalassocracy and the Salting Houses | [this might be too strong this early, but lets try it]
| Gov II | Scholars' Stipend (+2🔬 in cities of 5+) | +2🔬 in cities of 5+ **holding a Library**; +2 more with a University | a ladder a player builds toward |
| Gov II | Terraced Hillsides (+1🌾 hills) | keep — terrain floor | fine |
| Gov II | Ore Tithes (+1⚒ on strategic hexes) | **+1 prod per military Order slotted** (cap +3) on strategic resource tiles | the Forge Levy's reader |
| Gov II | Provincial Governors (+3 authority) | +1 authority **per economic Order slotted** (cap +4) | the Charter line's reader — expansion as a deck commitment |
| Gov II | The Choir (+1🎵 +1😊 per Temple town) | keep — already a building count | fine |
| Gov II | Star-Gazers (+2🔬 mountain towns) | keep — a site count | fine |
| Gov II | Cistern Works (every city on fresh water) | keep — a rule-changer, the good kind | fine |
| Gov II | Field Surgeons (+10 heal) | keep — utility floor | fine |
| Gov III | Quarrymen's Guild (+4⚒ per quarry town) | **+2⚒ per quarry town, and quarries pay 10% of the town's production again as gold** | a conversion on a site | [this is too strong, keep as is]
| Gov III | The Grain Dole (+2😊 in cities of 6+) | keep — floor | fine |
| Gov III | Client Kings (+2 authority, captured −1) | keep — the war line's | fine |
| Gov III | Provincial Mints (+2💰 per improved luxury copy) | keep — a count with a real decision (duplicates) | fine |
| Gov III | Toleration Edicts (−10% demand) | keep — floor | fine |
| Gov III | Frontier Forts (+6 defence near rivals) | keep — situational | fine |

**What shipped, row by row** (2026-09-05). Every row not named here is
untouched, and both struck rows (Statute Labour, Quarrymen's Guild) stand
exactly as they were.

| Row | Built as | Departure |
|---|---|---|
| Boundary Stones | `rulePercent` on `borderCulture`, scoped `hasBuilding: monument` | none |
| First Rites | +1🕯 capital (`cityYields`) + `countScaled` on `slottedOrdersOfSlot: wildcard` paying the empire | none — the reader counts itself, so a lone First Rites is the +2 it always printed |
| Border Wardens | +1 flat `combatLine` on `ownTerritory` + a second scaled by `slottedOrdersOfSlot: military`, `per: 1`, `max: 3`. **Vanguard is retired into it.** | **yes.** "+2 inside, +2 outside — never both" needs a *switch*, and a `CombatScale` is monotone: nothing in `CombatScale` or `EmpireCondition` can turn a line **off** above a count. The only encoding that expresses it exactly is a negative scaled line cancelling the flat one, which the describer prints as "−2 … (at most +2)" — a card that lies on its own page. So the brief's stated fallback shipped: +2 alone, +3 with a second war card, +4 with a third, capped there. A slotted-count `EmpireCondition` is the shape that would build the switch honestly, and it is a design decision, not a freebie. |
| Harbour Dues | `yieldConversion` gold → culture, 5%, `scope: coastal` | none |
| Scholars' Stipend | two `cityYields` lines, each `all: [populationAtLeast 5, hasBuilding …]` — Library, then University | none. It surfaced one copy bug: `indefinite` printed "an University", so `BuildingDef.article` is the field its own docblock said would be earned the day a name broke the vowel rule |
| Ore Tithes | the strategic-hex `tileYield` unchanged, **plus** a `countScaled` on `slottedOrdersOfSlot: military`, `max: 3`, paying `where: 'capital'` | **yes.** A `tileYield`'s bag is a printed number and a `CardPayout` has no tile destination, so a tile line cannot carry a count; and `countScaled` has no `CityScope`, so the hammers cannot be aimed at the towns that hold the seams either. The Guild Charter's precedent — a realm-wide count paid once, in the seat of government — is the closest honest shape. Being economic and counting the military bench, it does **not** count itself: an empire with no war cards reads nothing. |
| Provincial Governors | `countScaled` on `slottedOrdersOfSlot: economic`, `max: 4`, paying `authority` | none — it counts itself, so the floor is +1 |
| The Wolf-Standard (M, Gov II, ○) | **deferred whole**: the row ships `retired` with empty effects, its clause in `deferred` and a `note` | **yes.** A camp's bounty goes to the treasury and to `nearestOwnedCity` (`settleCampBounty`); `WindfallGrantSpec` has no scope at all, so "to every city" cannot be said. The doubling reading was rejected as a duplicate — Spoils of the Wild already prints it. |
| The Far Charts (W, Gov III, ○) | `countScaled` on `revealedTiles`, `per: 20`, paying science to the empire | **yes, the second half.** `routeRange(from, to)` is a pure function of two cities — no state, no seat — and the clause also wants a *count* ("one route") and a reach read off `citySightings`. That is a rule change to `trade.ts`, not a small honest override, so the half is `deferred` with prose on the row. |
| The Banner-Call (M, Gov II, ◆) | `conditionRule` on `atWar` wrapping a `productionBonus` (`category: 'unit'`, +15%) and a `windfallRider` on `kill` granting +5🎵 | none. `line: 'forge'` rather than 🎖 the Banner: `CardLine` is a closed union whose members each have a drawn mark, and adding one is an art pass. |

**One payoff engine per line per government** — the audit from
`card-shapes.md` found four lines without a payoff (Wild Hunt, Forge Levy,
Wayfarers, Charter). Two landed (Arsenal Law, Charter of the Marches). Still
open: **🏹 Wild Hunt** (the camps ruling is deferred on the bot side, but the
player's line needs its payoff — proposal: *The Wolf-Standard*, Gov II ○: "each
barbarian camp you clear pays its windfall to every city") and **🧭 Wayfarers**
(proposal: *The Far Charts*, Gov III ○: "+1🔬 per 20 hexes revealed, and
your traders may run one route to any city you have ever seen").

**Still open after the pass.** 🧭 Wayfarers has its payoff (The Far Charts,
half-built). **🏹 Wild Hunt still has none**: The Wolf-Standard is deferred
whole, so the line's payoff waits on either a scope on a windfall payout ("this
occasion pays every city") or a different card. 🎖 The Banner got its one card
from the breadth audit and has no drawn line mark yet, so it flies the Forge
Levy's.

**The reading to watch after it lands:** the draft's E[best-of-hand] the
bot now computes is exactly the number this pass moves — if a pool's
expected best card rises while its flat floors stay, the pass worked.

---

## 5. The breadth audit — does every system feed the deck?

The rule: one sentence per system saying how it changes what a player
drafts or what their cards pay. A system with no sentence is beside the
loop, not in it — a candidate to park for the first cut or to wire in.

| System | How it feeds the deck loop | Verdict |
|---|---|---|
| Cities, tiles, citizens | The chips the cards multiply; focus/locks are how a deck's conversion gets fed | **core** |
| The tech tree | Unlocks the buildings cards read and gates governments' arrival; techs carry card effects | **core** |
| Statecraft (orders, doctrines, governments, drafts, rarity, pass) | IS the loop | **core** |
| Beads · triumphs · the Opus | The scoreboard the deck is built toward; the race chain | **core** (once the age scoreboard lands, visibly) |
| Religion (pantheon, beliefs, rites, prophets, augurs) | Beliefs ARE cards; the faith bank buys augurs whose rites are card-shaped windfalls | **feeds** — but the pantheon/founder ceremony is a second draft UI; consider it rendering through the tarot face so it reads as one draw |
| Great people (renown, acts, works, legacies, Reliquary) | Legacies are cards (the Reliquary is the discard); acts are windfalls | **feeds** |
| Wonders | Beads and card-effect grants on completion; several wonders are card-shaped | **feeds** |
| Luxuries and strategics | Card counts read them (Salt Tithes, Sumptuary Laws, Ore Tithes); the deck's happiness plan runs on them | **feeds** |
| Trade routes (land, sea, international) | Cards read route counts (Silk Roads, Wayhouses, Provisioners); routes are a yield source the conversions multiply | **feeds, weakly** — no card changes what a route IS; the Tide line is the natural home for two |
| Meters (happiness, authority) | The constraints cards relieve — the whole Entry LIV thesis | **core constraint** |
| Barbarians and camps | Occasions for the Wild Hunt's cards and growing counters; the early exam | **feeds** — but at 50–60 standing pieces the wild is a *tax* more than a *test*; a camp-count cap per age or a decay is the first pacing knob to look at |
| War and warscore | The Casus Belli, the war-state conversions (Arsenal Law), the Banner line | **feeds** — thinly; a war changes almost nothing about your deck today |
| Diplomacy (met, deals, peace) | Nothing. No card reads a deal, a friend, a treaty | **beside the loop** — park deeper diplomacy for the first cut; keep war/peace/deals as they are |
| Puppets | A conquest sink that builds gold-leaning | **beside** — fine as is, small |
| Discoveries and ruins | Windfalls; the Athenaeum was axed | **feeds, early only** |
| Naval | Ships, embarkation, sea routes; the bot never floats one | **beside** — the Tide line gives it a deck home, but the player side needs the ships to *matter* (islands with luxuries do this already on pangaea) |
| City mode, pamphlet, tutorial, compendium | Legibility of all the above | **support** |

**The verdicts in one sentence each:** eleven of sixteen feed the loop
today. Three are beside it — diplomacy, puppets, naval — and the honest
first-cut answer is to leave them as built and not deepen them until the
deck loop is proven in playtest. Two feed it *thinly* enough to be worth
one card each in the synergy pass (trade: the Tide; war: the Banner). The
one pacing risk the audit surfaces outside the deck is the wild's standing
army — not a system to cut, a knob to look at.

---

## What I'd take from this doc, in order

1. The engine view bands 1–2 (a UI batch, no sim) — cheap, and it makes the
   balance turn's target visible.
2. The synergy pass as a data round on the table above, after your strikes.
3. The breadth audit's two "thinly" lines get their one card each inside
   that same round.
4. Band 3 (lifetime tallies) rides the next schema decision.

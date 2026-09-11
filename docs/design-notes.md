# The Design Ledger — current state (condensed 2026-09-03)

This is the reconciled CURRENT state of the design, kept short on purpose. The
unabridged 65-entry history it condenses is `docs/history/design-history.md` — cited
entry numbers (Entry XVII, LIV, …) refer to it; open it only when you need the
*why* behind a rule. Open rulings and deferred rows: `docs/flags.md`. Engine
traps and hard rules: `CLAUDE.md` (auto-loaded; not repeated here). Append new
rulings here as short dated lines; reconcile periodically rather than letting
the log grow back.

## The game

Civ V-style 4X in four ages — Omens, Heroes, Empire, Cathedrals (Æra V exists
as a shelf, deliberately unbuilt). Simultaneous turns, deterministic
`{config, log}` saves (SCHEMA_VERSION gates replay; bump on any
outcome-affecting change). Single-player vs bots is the product; hot-seat is
the dev harness; netcode later (lockstep-with-referee recorded, Entry XXIII).
Theme: the magister's study — hermetic, renaissance-punk, "vaguely alternate
history"; names mythologized, never historically over-specific (the user's
voice ruling; Æra IV ≈ the 1400s).

## Victory — the Bead Race

One win condition: beads on an abacus. **Two sources** since batch Q1 (schema
107, `docs/wager.md` §5): a **wager kept** — the age's three bars, staked one
each — and a **grant**, the handful of things that hand a bead over (Alchemy
pays every completer, the three great works of the sky, the Opus itself). The
deeds are retired with their decks: feats, endeavours, quests and reckonings keep
their rows for the Compendium's record and pay nobody, and the deal that put them
in front of a player is gone from the state. The endgame: first Alchemy
world-unlocks the **Magnum Opus** (once-per-empire 1200⚙ building, accepts
gold/faith contributions); completion → golden bead → the age closes → **the
builder wins outright** (ruled 2026-09-05, schema 69: the most-beads reading and
its tie rule are retired). `opusOpen` is derived, never stored. **The threshold
opens the Opus** (ruled 2026-09-04, schema 64): an empire may begin the great
work only while it holds that many, and the threshold's old reading — first seat
to it wins outright, which never decided a game — is retired. So beads gate the
door and the finished work decides the game. The figure is
`rules.threshold` = **7**, re-cut on the bench for a world
with no deeds in it (Q1; it was 20, which was priced for the decks).

## Economy

- Two-stage percents (Entry XVII): city then empire, floored once; growth
  surplus and border culture are separate channels.
- **Growth surplus is one fold of one list** (`explainGrowthPercent`): the site
  (`cities.drySettlePercent` −30% for a town off fresh water, lifted by a card
  granting freshwater or by a building marked `waters` — the aqueduct), the
  cards/buildings/wonders on `growthSurplus`, then the happiness stifle. Summed
  once, multiplied once; the city panel prints the lines.
- One-time grants are modifier-immune windfalls (Entry XVIII): base + riders
  compose into ONE printed figure; everything pays through a
  `settle…Windfall`; the mutation register lives in CLAUDE.md.
- Recurring costs are the four-line empire fold (connections, road/unit/
  building upkeep). Building upkeep = the age of the unlocking tech.
- **Purchases stamp per class** (v50): one military-gold, one civilian-gold,
  one faith purchase per city per turn; buildings uncounted.
- Crowding is removed (2026-09-09, (kkk)); a town's demand is linear in its
  citizens. The Assize Court forgives a share of that demand (`demandRelief`).
- Happiness/authority are meters with tier effects; the bulk of both supplies
  is Order-gated by ruling (Entry LIV); the per-city-happiness luxury class
  was the real oversupply and is flattened (schema 48).

## The technology tree (revision 4.2, schema 54)

- 50 nodes, 13 columns, ages 12/9/14/15. **A column IS a price**: one table —
  5·11·24·50·100·190·360·650·1150·1960·3250·5150·8000. Tree 68609 (68604 of it
  payable — the root's 5 is nobody's price); ages 269/1350/10440/56550. Every
  column is **one fitted curve** (2026-09-09, item (hhh) — "fit a curve …
  starting at 5 and ending around 8000"): a log-quadratic in the chart column,
  ln cost(n) = ln 5 + 0.8084n − 0.01613n², least-squares to the user's thirteen
  and pinned at both endpoints, `friendly`-rounded (nearest 1 below 30, 5 below
  300, 10 below 2000, 50 above). Still a taper, not an exponential: the ratio is
  itself a decaying exponential, 2.2× at the opening to 1.55× at the close, and
  the Æra III→IV seam (1.70×) is the same size of step as every other column. No
  authored figure is left in the table — retuning is re-fitting two constants,
  never editing a row; the table's witness is `test/sim/tech.test.ts` and the
  doc's is `test/sim/techDocSync.test.ts`.
- **The chart is the user's drawing**: lanes AND columns are authored
  (`row`, `columnShift`); the drawn layout is data, pinned exactly (the
  annealer only advises on new nodes). The packed-column layout renders it
  (606px, fits the fold); three connectors carry pinned 16px bows.
- Ages follow columns by ruling: columns 9–12 constitute Æra IV.
- Alchemy takes all five closing lines as parents — the sanctioned exception
  to the ≤2-parents convention.
- Adding a tech is placement, not archaeology: prereqs pick the column, the
  column prices it (see `techData.ts`'s placement docblock).
- Eight effect-carrying techs are the exceptions to the neutral-tree ruling
  (theme abilities live on cards/buildings, not nodes).

## Statecraft

- Culture fills one pool; draft meter 12+6n+n^2.8; offers drawn once, spent
  by command; adoption rebuilds slots (total amnesty); seals absolute (5 turns).
- Pools: Chiefdom → Government I/II/III (tier 18 is the last new pool —
  proposed IV/V/VI sit in `docs/orders-and-doctrines.md` awaiting review).
  Doctrine tiers ride the ladder 4/10/18/29/45.
- **Chairs by tier** (M/E/W; the table of record is
  `docs/orders-and-doctrines.md`'s Governments table, pinned by
  `statecraftDocSync.test.ts`): Chiefdom 1/1/1 · tier 4 five each · tier 10
  seven each · tier 18 **eight** each (1/4/3 · 4/2/2 · 2/2/4) · tier 29 ten
  each (2/4/4 · 5/2/3 · 3/3/4) · tier 45 twelve each (2/5/5 · 5/3/4 · 3/4/5).
  Tiers 18/29/45 came down a quarter on 2026-09-06 (`docs/history/fewer-things.md` §6
  item 9) so that chairs stay contested against the slower ladder.
- **No levels** (schema 63): a card is what its row prints, held once. A draft
  is take one or pass — `skipOrderOffer` spends the hand, raises `orderSkips`
  (absolute; zeroed by a pick), and each banked skip adds `skipPity` to the
  uncommon and rare weights of the next draw.
- **Rarity is the draw's weight**: `OrderDef.rarity` (● common · ◆ uncommon ·
  ○ rare, mirrored by the doc's Rarity column and pinned by a sync test), weighed
  4/2/1 (`rarityWeights`) inside each sub-bag of the guaranteed M/E/W spread.
- `retired: true` rows leave pools, keep rows for saves.

## Religion

One-charge prophet (plant founds; founding drafts two rungs of the belief
ladder). The augur is retired (`UnitDef.retired`, 2026-09-06): a rite is a
city's verb now, not a piece's.
Pressure is a tide (`spreadReligion`) plus lumps (`pressLump`); a city's
religion is derived majority. Follower beliefs pay the city's owner;
founder-side pay follows the holy site's stones. The Inquisitor purges
(pressure to nobody) with an adjacency aura; the Cathedral takes
contributions, rolls one of five consecrations on completion and — since the
fewer-things cut withdrew the Reliquary — opens faith purchases.

## Map & resources

Mapgen is two fields plus passes (`docs/mapgen.md`); resources place once,
ever. Luxuries: signatures are effect lists on rows, one evaluator; the
schema-48 rework flattened per-city lines to empire flats, added capital
scope, building-category tiers, and route/connection/upkeep hooks; perCopy
survives only on silver/gold Æra III (`docs/luxuries.md`). Veins
(`Tile.vein`) surface via the prospect verb (Geomancy); discovery kinds gate
on tech (antiquity → Geomancy; wrecks in deep ocean). Strategic reveals:
horses@Husbandry, iron@Bronze Panoply (moved 2026-09-04 so the
swordsman has a real window before its legionary), niter@Alchemy.

## Military

Combat is flat points on one ledger — labelled strength lines, never
multipliers (attacker-side percentages excepted). Cities fall in three beats
(walls → garrison → capture); siege is ability-gated (`siege` via
Siegecraft); ZoC is a toll; shore crossing is a pair-of-hexes price (ships
exempt); the wild never captures. Melee on a trading unit plunders. Unit
lines: Warrior → Swordsman → Legionary → Longswordsman (every rung above the
warrior needs improved iron since 2026-09-04); Spearman → Phalanx →
Spear Wall → Pikeman; Bowman → Composite → Crossbowman; Horseman (The
Saddle) → Knight (Militant Orders); the Fire Lance closes at Alchemy;
cataphract and bastion park behind `awaitsTech`.

## Trade

A trader's `Unit.trade` IS the route (no register); routes pay via one fold
(`routeYields.ts`); city connections pay in the empire fold; roads cost exact
thirds and are maintenance-free only when decreed.

## Great people & renown

Called, never built: renown accrues (one seam, `settleRenownWindfall`;
`explainRenown` is its fold), offers draw weighted by family feed, spills
across ages; a spent roster banks. The ladder is the **draft ladder's curve**,
`rules.renown` — `floor(75 + 225n + n^2.8)`: 75 · 301 · 531 · 771 · 1023 …
(B5, 2026-09-09). Its cumulative cost is quadratic in the count, so arrivals
fall with the *square root* of the rungs — a third as many needs nine times the
old step (25 × 9), which is what the linear term is; measured at 3–4 great
people a seat by the end of Æra III against 9–12 before (×0.36 there, ×0.32 by
t150). Works open the seams they cover; legacies
are live effects, revoked by marking. The Academy sells a scholar-only draft
for 1000🕯 (no renown moved). Triumphs are append-only, turn-stamped, diffed.
The reference is `docs/great-people.md` (generated roster, every figure).

## Pacing doctrine (the user's, distilled)

Æra III should be the *longest* age — wars and empire-building need room.
Nerf wide / buff tall through bonuses (per-city tech-cost scaling REJECTED).
Renewals (tech-gated free building upgrades) are DEAD — the nine rows and the
`BuildingDef.upgrades` shape were cut on 2026-09-04 (schema 62). A building is
worth its own row in every empire; a *worker's* renewals (the farm's irrigation
rider and its three siblings) stay, and so does a building's `tileYields` line,
because both pay only ground somebody went and worked. Late techs should scale
(percents, per-city, verbs), never
flat-pay. The bot is NOT a balance instrument (human ≈5–10× tier-1 yields;
t69 datum) — playtest is the judge; the arena is for regressions and floors.

## The AI

Tier-1 scored-greedy bot: per-age value weights in `data/ai.json` (the future
optimizer's surface), maintenance-aware production scoring through the sim's
own explainers, solvency rules, threat-aware defense, camp hunts, beelines,
draft synergy, religion appetite. Arena harness: scratch `zzArena` tests,
`driveBots` + curve readings, deleted after use.

## UI conventions

Ink/parchment specimen language; every number tabular mono. The star chart:
packed columns, compact faces (two unlock rows + "+N more"; flavor on the
hover card), age washes with breathing room. The Compendium is generated from
data rows and describers — never hand-written prose about a number — and
mounts as the in-game "?"; describers emit keyword refs. Per-game screens
register their window listeners in `gameDisposers`.

## Design rules (the standing doctrines)

1. **Defer, never bend**: a card/belief/wonder whose text needs a missing
   shape ships deferred with player-plain prose.
2. **Markers, not names**: behavior hangs on data markers, never on comparing
   a name string.
3. **One evaluator per vocabulary**: statecraft effects, resource effects,
   building effects — each read in exactly one place.
4. **Numbers live in data**: code holds algorithms; every tuned constant is a
   JSON row.
5. **Plain words to players**: rules in a first-timer's terms; numbers never
   in prose; flavour always labelled.
6. **Ids are forever**; renames touch `name` only.
7. **Explainable folds** (rule 5 of CLAUDE.md): every total is the fold of a
   printed list.
8. **The drawn chart is the user's**; deviations are decisions, pinned.

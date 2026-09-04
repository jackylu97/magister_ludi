# The Design Ledger — current state (condensed 2026-09-03)

This is the reconciled CURRENT state of the design, kept short on purpose. The
unabridged 65-entry history it condenses is `docs/design-history.md` — cited
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

One win condition: beads on an abacus. Sources: deeds (per-age decks, drawn
3|4), age-entry dice, contested triumphs (`(id, age)`, first by log order),
per-empire grants, Alchemy pays every completer. The endgame: first Alchemy
world-unlocks the **Magnum Opus** (once-per-empire 1200⚙ building, accepts
gold/faith contributions); completion → golden bead → the age closes →
reckonings → most beads wins, tie to the builder. `opusOpen` is derived, never
stored. Flagged: the 20-bead threshold never decides; winners hold 7–10.

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
- Crowding is disabled (weight 0, mechanism kept) — the user wants big cities.
- Happiness/authority are meters with tier effects; the bulk of both supplies
  is Order-gated by ruling (Entry LIV); the per-city-happiness luxury class
  was the real oversupply and is flattened (schema 48).

## The technology tree (revision 4.2, schema 54)

- 50 nodes, 13 columns, ages 12/9/14/15. **A column IS a price**: one table —
  5·13·30·69·135·225·400·540·680·1450·1700·1950·2200. Tree 35710; ages
  345/1665/7700/26000. Columns 0–5 are the taper's own figures
  (cost(1)=13, cost(n)=friendly(cost(n−1)×(1+1.3×0.72^max(0,n−3)))); columns
  6–12 are **authored above it** by ruling (2026-09-03: Æra I–II keep their
  scaling, Æra IV–V is extremely expensive). A late column is a ruling, not a
  taper value; the table's witness is `test/sim/tech.test.ts`.
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

- Culture fills one pool; draft meter 12+6n+n^2.25; offers drawn once, spent
  by command; adoption rebuilds slots (total amnesty); seals absolute.
- Pools: Chiefdom → Government I/II/III (tier 18 is the last new pool —
  proposed IV/V/VI sit in `docs/orders-and-doctrines.md` awaiting review).
  Doctrine tiers ride the ladder 4/10/18/29/45.
- **Deepening is authored** (schema 51): `OrderUpgrade[]` — a `CardEffect`
  appends a line per level; an `OrderDeepening` moves a printed number. Cap 3
  (`maxOrderLevel`) or the row's own. Additive rows read byte-identically.
- `retired: true` rows leave pools, keep rows for saves. Rarity marks are a
  proposal, not yet a draw weight.

## Religion

One-charge prophet (plant founds; founding drafts two rungs of the belief
ladder) and one-charge augur (consecrate OR one rite, the whole turn).
Pressure is a tide (`spreadReligion`) plus lumps (`pressLump`); a city's
religion is derived majority. Follower beliefs pay the city's owner;
founder-side pay follows the holy site's stones. The Inquisitor purges
(pressure to nobody) with an adjacency aura; the Reliquary opens faith
purchases; the Cathedral (340⚙) takes contributions and rolls one of five
consecrations on completion.

## Map & resources

Mapgen is two fields plus passes (`docs/mapgen.md`); resources place once,
ever. Luxuries: signatures are effect lists on rows, one evaluator; the
schema-48 rework flattened per-city lines to empire flats, added capital
scope, building-category tiers, and route/connection/upkeep hooks; perCopy
survives only on silver/gold Æra III (`docs/luxuries.md`). Veins
(`Tile.vein`) surface via the prospect verb (Geomancy); discovery kinds gate
on tech (antiquity → Geomancy; wrecks in deep ocean). Strategic reveals:
horses@Husbandry, iron@Iron Working, niter@Alchemy.

## Military

Combat is flat points on one ledger — labelled strength lines, never
multipliers (attacker-side percentages excepted). Cities fall in three beats
(walls → garrison → capture); siege is ability-gated (`siege` via
Siegecraft); ZoC is a toll; shore crossing is a pair-of-hexes price (ships
exempt); the wild never captures. Melee on a trading unit plunders. Unit
lines: Warrior → Swordsman → Legionary → Longswordsman; Spearman → Phalanx →
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
across ages; a spent roster banks. Works open the seams they cover; legacies
are live effects, revoked by marking. The Academy sells a scholar-only draft
for 1000🕯 (no renown moved). Triumphs are append-only, turn-stamped, diffed.

## Pacing doctrine (the user's, distilled)

Æra III should be the *longest* age — wars and empire-building need room.
Nerf wide / buff tall through bonuses (per-city tech-cost scaling REJECTED).
Renewals (tech-gated free building upgrades) are ruled DEAD — implementation
pending. Late techs should scale (percents, per-city, verbs), never
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

## Entry LXIII — the playtest-notes batch (2026-09-03, schema 55)

Thirteen of the user's live-play notes in one pass: plantations follow the
Calendar; Standing Stones leaves the ground (the belief keeps the name);
Raised Fields becomes mountain-side farming plus the Floating Gardens (whose
lake half waits on lakes anyone can reach — the honest hole is on the row);
the Workshop and the Stele of Laws reworked to the user's numbers; Stone
Walls joins the wall family at Siegecraft; the Spear Wall takes its
age-appropriate name. The tooltip half is the bigger deal: ability gifts
head by their BEARER (the augur's rites stop hiding under "Workers may
also"), effect-techs print their own hand-written notes — one clause per
line, the card and the Compendium reading identical words through one
function — and "buildings pay new ground" moves to the building entries
where a builder actually looks. A register test now refuses a new
effect-tech that ships without a note. Two addenda were lost in the message
queue and hand-finished; the lesson is already law in CLAUDE.md — rulings
land in files, and mid-flight messages are the exception that proves it.

## Entry LXIV — the bot shows its work (2026-09-03)

The spectate page (`spectate.html`, the seventh root page) and the discipline
under it: every bot choice point emits its command, a plain sentence, and
every candidate it weighed as labelled arithmetic — and the fold IS the
computation (`foldTerms(terms) === score`, strict equality, pinned across a
whole game; the arena replays byte-identical through the decision path, so
the spectacle can never drift from the play). Rejected candidates carry the
reducer's own refusal, which turns out to be the most informative column.
The page's first session already paid for it twice: **gold pressure pins at
full debt-aversion by turn 6** of a fresh game (a young empire with no income
reads as bleeding, quadrupling every upkeep line before there is anything to
be solvent about), and **turns-amortisation structurally buries wonders**
(a 109-point temple loses to an 80-point worker 3.41 to 13.33 on the divide
alone — the formula working as designed, and the design therefore never
starting a long row from an empty queue). Blind-spot roster for the
improvement queue: ruins take option 0 unappraised, charter faces
uncompared, ~17 of ~30 card-effect kinds scored as a guess, rites in roster
order, first-legal trade routes, fixed worker preference list, great people
asleep, one-ply combat. Next: personas (balanced/wide/tall/zealot/warmonger)
and the leak-plugging pass the fruit ranking named.

## Entry LXV — bot brain v1: the bot finishes games (2026-09-03)

Personas (five, sparse config overrides, per-seat, a typo'd key fails the
build), the improvement plan (workers priced by the actual ground; the flat
80, the preference list and nearest-tile all deleted), wonder patience, the
gold-pressure grace, great people that act or plant instead of sleeping, and
the citizen priced as the next tile it would work plus its real science
stream plus a small-city premium. The arena verdict, same seed both sides:
an undecided 200-turn stalemate became a win at t182, 15 beads to 5, eight
towns a side, worst late income −25/t → −7/t. The measured cost: a slower
opening tree (spades before libraries, converged by t160) — the two dials
are named in the arena docblock. The disband arm vanished from a healthy
100-turn game and its register pin says so as a finding. Interpretation
flag standing: growth.smallCityPop 9 = the threshold reading of the user's
"start with a value of 9"; the premium is its own knob.

## Entry LXVI — war exists (2026-09-03, schema 56)

The war core, whole: `wars` and `truces` registers, five verbs, and the one
big reversal — combat, pillage and border entry against a real player now ask
`atWar`, one clause in each existing refusal so the reducer, the forecast and
the highlights refuse as one voice. `settleDiplomacy` leads the turn phases:
truce broom, both-signed peace, and expulsion at PEACE (the ruled inversion —
war does not evict, peace does) through the one arrival seam before movement
resets. Capture makes a puppet (authority relief; the happiness relief is a
gain line said out loud, rule 5 over a quieter cost); annex is anytime and
irreversible; raze is immediate and refused for anything that was ever a
capital (`wasCapital`, one bit, because the palace stops being derivable the
instant it changes hands). The Diplomacy screen is the hud dock's third door;
enemies wear a war-red rim on ghost and outline while the sculpt keeps the
owner's ink, and the wild wears it too — consistent, and the first visible
change barbarians have had from a diplomacy pass. Chosen defaults recorded in
the agent's report: no met-ness gate (nothing to gate on), scouts blocked at
closed borders (Civ's rule — Open Borders is P2's answer), peace as two verbs.
Staging gaps, honestly: bots neither declare nor answer peace (P3), the
puppet auto-picker is P3, puppet purchases are unruled, and a unit engulfed
by border growth at peace can be stuck. P2 is deals; P3 is bots at war.

## Entry LXVII — deals (2026-09-03, schema 57)

The bargaining half: proposals written from the proposer's side of the table,
acceptance in command order, twenty-turn clocks, declaration voiding every
bargain between the pair. Every term is one labelled line in a fold that
already existed — tribute at the foot of the empire ledger, a lent luxury as
`openedResource`'s second clause (the KIND moves and the happiness follows;
two empires never hold three where there were two), open borders beside
`atWar` in the closed-borders read behind Writing on both sides, and a ceded
city arriving as a puppet through the capture machinery's handover WITHOUT
the conquest half — a treaty batters no walls and awards no Triumph. Peace
papers carry terms; writing new terms voids every signature on the old
paper. A capital is never on the table. P3 (in flight) closes the milestone:
bots that declare by advantage, sue by warscore, answer bargains, escort
settlers, open with a scout, run their puppets (which now buy nothing,
schema 58), slot by fit, compare charter faces, and settle by a two-ring
kind-aware score.

## Entry LXVIII — the milestone closes: the game is playtest-complete (2026-09-03, schema 58)

War & Diplomacy P3, and with it the last core system. Puppets buy nothing
and build gold-leaning through their owner's own appraisal; seats declare by
advantage with the ratio printed, sue by a six-line warscore with tribute
sized to the losing, and answer bargains by a price — except an only copy,
which is never for sale at any price, a clause and not a number. The opening
book ranges a scout first (the first cut counted a ladder scouts do not
climb and built scouts forever — caught in the arena); settlers refuse to
march past hostiles and walk escorted, which fixed a seat that had spent two
hundred turns feeding its settlers to the same raiders. Slotting is scored,
charter faces compared, the settle scorer reads two rings and craves kinds
it lacks. The arena now contains a real war story — declared at t115 when
reach allowed, fought, peace signed, re-declared the turn the truce lapsed,
byte-identical on replay. Two honest debts recorded: the warscore differences
lifetime proxies because the state keeps no loss register (a schema decision
when wanted), and the balanced endgame SLOWED (undecided at t200 where brain
v1 decided at t182; ringFalloff and escortRadius named first). The playtest
is now the judge of everything.

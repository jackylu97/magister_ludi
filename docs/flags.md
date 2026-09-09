# The Standing Flags

Every OPEN ruling, deferred half, and live thread — nothing here is done.
Pruned 2026-09-05 (second prune) on the user's standing order: a
ruled-and-built item leaves this page the day it lands (its story lives in
`docs/design-history.md`, the batch docs, and git). Three sections: **A** is
decisions only you can make, **B** is rows that ship deferred-with-prose,
**C** is open threads and playtest questions. The user edits this page
directly to confirm rulings — user marginalia are rulings.

## A. Awaiting your ruling

### In flight right now (2026-09-06)

- **The fewer-things pass — BUILDING** (`docs/fewer-things-plan.md`, the
  user: "ok lets implement the plan"): **A** (the shapes — byte-identical,
  no row uses one yet), **B** (the reveal on Confirm, ordered slots) and
  **C1** (the dice out, the faith ladder at 40 · 56 · 72, the reroll from 35
  at ×1.35 a use, schema 71) — LANDED in main. **C2** (rites as city verbs,
  the prophet's four acts, the apostle) and **D** (buildings with chains, the
  cut, the five uniques, schema 73) — in flight. E (the tree's gifts), F (the
  order pass), F2 (the bot drafts engines), G (cadence and chairs) follow.
  **C2 and D LANDED** (schema 74). D measured the science cut against the
  scripted empire: Æra I close 66 → 236 — the base beaker halved is floored
  per town, so a size-1 town banked nothing. **RULED (the user, 2026-09-06):
  "yields are valid as decimals — don't show this to the player, but behind
  the scenes all yields are calculated exactly."** A new batch, **X — exact
  yields**, lands before the pacing re-aim: every fold carries fractions
  (no per-source or per-stage floor), banks and pools hold the exact figure,
  every printed number rounds at the surface only. The floor question is
  closed by it; the beaker stays at 0.5. **E LANDED** in the tree (schema
  76; every gift a data row; Machinery's road step an empire fact in
  fifteenths; Irrigation's gift already stood as the farm's line and was
  left alone; the Water Clock keeps its rider). Measured with X under it:
  Æra I close 236 → 80 against a 56–76 band — exact yields recover nearly
  all of D's slide; E adds a few turns. **X and E LANDED together** (main
  3ede042). **The re-aim LANDED** (c1307fd): Æra closes 80 / 156 / 481 /
  999; Gov I 40, Gov III 275; the one-city seat's Opus at t3959;
  `religion.slow` repaired to the faith ladder. **F (the order pass) LANDED
  in the tree** (schema 77; 167 live rows, 45 retired, 34 new; the census
  reads 15% engines · 39% payoffs · 46% standalones — engines ten points
  light against the ruled 25 because the line readers were withdrawn; eight
  rows carry a `deferred` line: the four Æra V bead Orders (no bead-granting
  effect and no occasion for a draft passed / a city razed / a proclamation /
  an Æra V tech — dealt, paying nothing until those land), the Reckless
  Levy's per-unit surcharge, the Silk Exchange's destination reading, the
  Guild Compact's specialist count, the Jubilee's second boon (one chair
  keeps one clock). The bot under-prices the Exchequer (`effectAmplifier`
  is a stand-in) — F2's. **F and G LANDED in main** (F 9362cac, G 7bd4e1d:
  exponent 2.8, chairs 8 · 10 · 12 from Government III up, schema 78).
  **F2 LANDED** (b8a5ca2: a scratch-board margin for the fourteen engine
  rows; six of seven acceptance games byte-identical). **The pass is built.**
  The play checkout on :5199 is refreshed to b8a5ca2 for the second
  playthrough (schema 78 — the turn-92 save does not load). Main on GitHub
  is still at the vein shelving: the all-tier gate for the push is running
  (capped at three workers) on the user's word; the push follows on green.
  **The audit is in flight** (the user: "do a pass on the codebase —
  thoroughly read through bonus logic … feature bloat … simplified … unified
  … not built … long deprecated"): three read-only readers, one file each —
  `docs/audit/bonuses.md` (every bonus from row to fold to surface to the
  bot's price; previews computed beside a fold are findings),
  `docs/audit/simplify.md` (duplications, vocabulary sprawl, structural
  cuts, the brittle pins), `docs/audit/dead-code.md` (declared-never-built,
  deprecated-and-kept, unread exports and knobs, docs now false). **All
  three landed, plus the orchestrator's own pass — `docs/audit/
  orchestrator.md` is the summary and the fix queue.** Confirmed by reading:
  a route's science and culture never reach the city fold (Ledger Keepers
  pays nothing on a domestic route); a positive unit-upkeep percent is
  dropped (the Reckless Levy's cost is never charged); the top bar and the
  Ledger omit the sender's foreign-route income the turn banks; the bot
  prices 23 of 46 shapes with one stand-in and its margin is blind to
  empire lines. Surprises: three live signature clauses (The Commonwealth,
  The Magisterium, The Academy) open a great-person draft no surface ever
  offers; six draftable cards carry no effect; `src/proto3d/` is 2,126
  dead lines and a ninth root page. **H1 (the fold pays what the rows say)
  and H2 (the bot reads the whole deck) are in flight**; H3 (the draft the
  cards promise), H4 (dead weight), H5 (one modal shell, shared helpers),
  H6 (luxuries as cards — high risk) wait for your markup.
  **Rulings 2026-09-06, evening** (the user): (a) **the Reckless Levy's
  cost is +1 maintenance per unit** — a flat per-unit charge, not a percent
  (H1 carries it); (b) **the faith hover shows what the next pantheon rung
  costs** — the faith ladder's next threshold and how far the bank is from
  it; (c) **augurs leave Stonehenge and the religion panel** — Stonehenge's
  completion grant becomes a free rung of the faith ladder (the orchestrator's
  reading of "remove augurs": the same gift, a god, without the unit — say
  if you meant something else), the panel's augur block goes; (d) **the
  religion panel is reworked around the cards**: the pantheon's three faces
  and the belief rungs as the sheet's subject (full faces, stamps, the next
  rung's price and the bank's progress toward it), the tide and the
  purchases (prophet · apostle · inquisitor) secondary. Batch **H7 — the
  faith sheet** in flight. (e) **Pantheon rerolls are not free** — "it looks
  like I'm allowed unlimited rerolls on my pantheon beliefs?": C1 read "great
  prophets treated as free" as every belief hand; corrected in main — the
  ladder's hand (the one carrying a rung) pays the Order draft's price and
  counts, a prophet's hand stays free. (f) **Winter Mother pays +1 faith on
  every tundra hex**, not only wooded tundra (one tile line: +1🌾 +1🕯 on
  tundra). (g) **A barbarian camp keeps one unit fortified on the camp tile
  before sending units out** — a fourth derived role beside raider / thief /
  escort / cargo (`barbarianRoles` derives per turn, never stores): the
  camp's first standing unit is its **warden**, holds the camp hex and
  fortifies; every further muster raids as now. A camp whose warden dies
  keeps its next-mustered piece home. Batch **H8 — the warden** in flight.
  (h) **Forests more diffuse** (mapgen): "currently forests spawn in huge
  patches — smaller patches of forest across the map, and some unforested
  tiles breaking up the large patches." The feature pass's forest scatter
  gets a finer grain (smaller clumps, more of them) and a clearing rule
  inside a large patch; the density (forest share of land) stays where it
  is unless the mapgen page says otherwise. A map change moves every seed's
  replay — schema. Batch **H9 — the woods** in flight; `mapgen.html` is the
  eye. **Note 20 (horses and iron within six of every capital) rides H9** —
  it was queued, not built; the user asked after it tonight. (i) **Belief
  rerolls, re-ruled** (supersedes e): the pantheon hand opens by itself when
  the bank reaches the rung and **the rung is spent at the deal**; on that
  hand the **first reroll is free** and each further one costs faith rising
  per asking, reset with the next hand; a **prophet's hand** works the same
  way; both are entirely separate from the Order draft's lifetime count.
  **Built** (schema 80): `openFaithLadder` pays at the deal; `BeliefOffer.rerolls`
  + `explainBeliefRerollCost` in `religion.ts`; the votive card's foot is an
  "Ask again" button whose figure is the price — `free` on the first asking,
  the faith figure after (split into a label and a figure by H14);
  `docs/religion-v2.md` is current.
  (j) **No zoom on the city screen** — **built**: the wheel is the only zoom
  input, and it now returns while `openCity()` holds (the `panLocked` rule in
  `controls.ts`, extended from the pan to the wheel). (k) **"No option to
  purchase rites in cities"** — there was one, behind a closed "Rites —"
  shelf in the city screen's left rail. **Built**: the shelf's figure is the
  rite's price whenever one can be said here, and the shelf opens by itself
  until the player shuts it (`closedDisclosures`, `cityPanel.ts`). The gate
  stays the tree's (a pantheon is not a condition — a rite is a town's verb
  taught by the five nodes); the greyed rows name the node. (l) **The bead
  Orders show at Æra III** — governments carry no age gate (ruled), so a fast
  climb opened pool V early and the four last-age bead Orders were dealt.
  **Built**: `OrderDef.fromAge` (4 on the four rows), read by `drawablePool`
  alone (the bag the draw deals from; `livePool`, the shelf, stays ungated);
  "earned only there" rides their `deferred` text for whoever builds them.
  (m) **Traders unselectable while on a route** — **built**: `ownUnitsAt`
  (the click's list) and `selectedUnit` both read `Unit.trade`; the trade
  screen's by-id Cancel is the way to call one home, and End Turn already
  never nagged about one (`unitAwaitsOrders`). Pinned in `controls.test.ts`.
  **The second playtest's verdict and rulings** (the user, 2026-09-06, late):
  "the science nerfs were good, I no longer feel like I'm speeding through
  the tech tree … pacing feels more reasonable, orders feel more
  consequential, I'm having to decide between happiness in my cities vs
  strong bonuses, and the flat bonuses feel impactful". The problem: "my
  cities don't seem to have much to build (wonders included)" — and only
  three cities before the Stele. The proposal with numbers is
  **`docs/early-pacing.md`** — mark it up; nothing there moves until you do.
  Ruled outright: (n) **+1 authority back on the Monument** (`authorityCapacity`
  1) — **built (H13)**; (o) **the once-per-empire buildings scale with the number of cities**
  (shape per row in the doc); (p) **some authority into the Orders** (rows
  proposed in the doc, early pools); (q) **rerolls for Doctrines and great
  people at twice the Order price, on the same ladder** — one `rerollsTaken`
  count: rerolling any of the three raises the price of all three — **built
  (H14, schema 85)**: `RerollKind` is four members, the doubling is
  `religion.reroll.heavyMultiple` printed as a line of `explainRerollCost`'s
  fold, the precedence is `firstBlocker`'s (Order · Doctrine · belief · name),
  the shrine engine's `rerollsSeen` still counts Order drafts alone, and
  `GreatPersonOffer.family` keeps a bought scholar draft narrow through the
  redeal; (r) **the reroll and the pass are fully featured, decorated buttons** —
  "meant to be taken sometimes for optimal play", not foot links — **built
  (H14)**: both are the house's own `.btn`, a card wide each in a row under the
  hand, with the words and a tabular-mono figure on the face (the price through
  the yield printer; the pass's pity read off `rarityDrawWeight`), the greyed
  reroll keeping its ground and answering on hover with the reducer's sentence,
  and the Reliquary's calls following onto the same face. Inclined, not ruled:
  (s) **cheaper Æra I techs**; (t) **more science Orders early** — the doc
  argues where the lull actually is (the Æra I → II price step) and proposes
  numbers for both. (u) **Stale buildings out of the tech tree** ("I meant
  the Imperial Throne. Let's remove stele of laws — and any other stale
  buildings — from the tech tree UX") — **built**: ten retired rows still
  hung on their techs; `liveUnlocks` (`techData.ts`) is what the tree's
  faces print, the raw lists stay for the gates and the inverted tables.
  **Second half, 2026-09-07** ("I still see stele of laws in the tech
  tree"): the info card and the Compendium print `techGifts`, a second walk
  that kept the raw lists; it reads `liveUnlocks` now, pinned across every
  node in `techUnlocks.test.ts`.
  (v) **The phalanx needs its own unit icon** — it wore the spearman's.
  **Built (H15)**: six badges and six bodies, and both halves of
  `view3d.json`'s `byUnitType` now name each row after itself — the phalanx a
  shield rank, the spear wall three raked pikes, the legionary a tall shield
  and a short blade, the horse archer the chariot archer's arrow mirrored onto
  the other diagonal, the cataphract a couched lance the length of the box, the
  war elephant a raised trunk and a howdah; the marks join `flair.html` off
  `BADGE_LINES` and the sculpts join `pieces.html` off `SCULPT_IDS`, neither
  page edited.
  (w) **The unit purchase tag broke onto a second line** — **built**: a town
  with an open faith bank prints two tags beside a unit and the row's
  two-column grid wrapped the second; the row is a flex line now (every tag
  inline, the name is what gives), the work rail is 300px from 264 (244
  from 214 at the narrow breakpoint; `cityFrameBiasPx` 35 follows), and the
  tag prints the figure alone — no "or". (ff) **The pass at the bottom
  right, in a player's words** (2026-09-07, after H14's buttons: "make the
  pass button more prominent/decorated and put it in the bottom right … the
  'rare 1 -> 2' text isn't informative") — **built** in main by the
  orchestrator: the answers row places the reroll left and the pass at the
  sheet's bottom right, both answers wear one heavier plate (doubled border,
  a parchment hairline inset, small capitals — "keep the emphasis on the
  reroll and pass the same"), told apart by ground alone (vermilion for the
  spent hand, lapis for the purchase), and the pass's face says "See rarer
  cards next draft" — the bag's weights are still the reading, never the
  words. Pinned in `offerFlow.test.ts`. (gg) **The city screen zooms out a
  little further** ("some of the tiles sit behind the menu panels" — the
  work rail grew to 300px under ruling w and the frame fitted the radius to
  the whole canvas) — **built**: `camera.cityFrameInsetPx` (586, the two
  rails and their four gutters) narrows the fit in `frameCells`, so the
  radius lands in the clear ground between the rails; `frameBoard` is
  untouched. Pinned against the stylesheet in `cityScreen.test.ts`. (hh)
  **The Legionary no longer paves** ("my legionaries are creating roads
  wherever they walk" — a designed gift of the tree pass, withdrawn:
  `UnitDef.laysRoad` gone with its row's marker; only a carried land route
  paves) — **built**. (ii) **A city HP bar on the city banner** —
  **built** (batch **H16 — the banner's wound**): a channel on the foot of
  the banner pill, absent at full health, the fill `hp / cityMaxHp` in the
  alarm ink; walls are the same pool lengthened and never a second segment,
  "walls down" (`cityBeatenDown`) is a clause on the hover; a signature term
  on the DOM banner, not on `CityLook`. (jj) **"Your cards" misses what
  the cards show** ("my yields are simply not showing in the total … they
  seem to be calculated correctly on the cards themselves"). Measured: the
  deck's flats are right (beliefs and rites file under religion by design),
  but the Ledger shares each town's **multiplied gain** back over the
  *flats* that earned it — so a card paying a percentage (+25% science in
  the capital, an amplifier's share, a building-category percent) prints
  its figure on its own face and adds nothing to the total. Ruled by the
  finding: the gain is shared by **who supplied the percentages** — a
  percent line learns its card (`CityYieldPercent.card`), the deck's percent
  cards take the deck's share of the gain, meters and arrears stay `other`,
  a building's percent stays `buildings`; the flats keep their own split.
  The chips still sum to `civYields`. Batch **H17 — the deck's share of the
  gain** — **built**: `CityYieldPercent.card` /
  `ProductionModifier.card` / `TileLine.card` / `TileYieldContribution.card`
  carry the id down every seam, `percentWeights` + `shareGain` share the gain
  by magnitude among the lines pushing the way the town moved (a penalty earns
  no share of a rise), and `addWorkedTile` files a worked hex's card-sourced
  lines by their card — **widened** by the user's follow-up ("the age 3 and
  onwards orders are not being counted"): the later pools lean on
  `tileYield`, whose lines the Ledger filed under the land; a worked hex's
  card-sourced lines are the deck's now (H17). (kk) **The Sacred Ground
  reads a belief's faith** ("+1 faith on every hex that gives faith isn't
  applying to my desert tiles that have +1 faith from my religion") —
  **built**: `explainTileYield` lands the lines that ask nothing of the
  fold first, takes its reading again, then lands the lines that pay on
  what the hex already pays (`tileConditionReadsFold`); an asking line
  never sees another asking line. Pinned in `statecraft.test.ts`. (ll)
  **A building's share counts what the law put on it** ("the Synod … should
  count my religion bonuses on my temples, and great people improvements to
  temples") — **built**: every `buildingYieldPercent` (the Synod, the
  doublers, the Heroic Epic's kin) takes its share over the building's row
  **plus** every `cityYields` line whose scope names that building
  (`cardLinesOnBuilding`, `statecraft.ts`) — an Order's, a belief's, a
  legacy's alike; a line that reaches the town by category (The Curia's
  mirror) is a town fact and stays outside. Pinned in `statecraft.test.ts`.
  (mm) **A town at the floor does not mend under the enemy's eyes** ("once
  a city is at 0 hp, it should stop healing every turn — its walls are
  broken") — **built**: `healCities` skips a beaten-down town while any
  enemy stands adjacent (`enemyAtTheGate`, the siege field's smaller
  question); it mends the turn they withdraw, and a town above the floor
  still heals beside an enemy. Pinned in `combat.test.ts`. The orchestrator's
  reading of "stop healing": while an enemy is at the gate — say if you
  meant "until repaired" instead. **A miss to own** (f3e2e54): kk, ll and
  mm each change what a command log replays and shipped at schema 85 with
  the note "saves still load"; the user's game did not ("the latest changes
  were breaking, I lost my game"). The rule stands as CLAUDE.md states it —
  a save is `{config, log}` and replays — so every rule change bumps the
  schema, however small; the next batch takes 86. (nn) **A performance
  pass** ("it's starting to feel slow again. The Reliquary in particular is
  very slow") — batch **H18 — the performance pass** in flight: measure on
  a late board first, then the Reliquary's per-legacy ghost-diffs on every
  refresh, the per-card impact folds, the per-hex context, the effect-list
  hoists; speed only, byte-identity the gate. **Built** (a859dbb): the
  Reliquary 80 ms → 0.05 ms on open, nine stamps 120 → 55 ms; found and
  left: the bots' thinking ≈ 790 ms a turn at t150. (oo) **Empire additive
  lines take the empire stage** (the user, 2026-09-07: "empire additive
  bonuses should apply before empire multiplicative bonuses"): today the
  meter tiers and arrears multiply every *town's* basket as its second
  stage and the empire's own lines (an Order's empire-wide science, a
  luxury's empire signature, the caravans abroad, the treasury's four lines)
  bank flat. Ruled: the empire's additive lines fold first, then the empire
  stage multiplies that fold once — `(Σ empire lines) × (1 + Σ empire%)`,
  floored once, Entry XVII's shape at the empire's scale — with the stage
  printed as one reconciliation line in the Ledger's empire band, the
  ghost-diff and the bot's margin reading the same fold. Which lines the
  stage reaches is the design question left to the batch to state: the
  yields (science, culture, faith, gold in) yes; the treasury's *bills*
  (maintenance) are costs, not yields, and stay outside the multiplication.
  Schema **86**. Batch **H19 — the empire stage** — **built** (schema 86):
  `explainEmpireLines` (`cities.ts`) is the list — the luxuries' signatures,
  the caravans abroad, the treasury's ledger, the cards' empire payouts, then
  one `Empire stage · ×1.10` line a voice — and its fold is what
  `collectYields` banks and what the top bar, the Ledger, the ghost-diff and
  the bot's margin all read; every treasury line now declares itself income or
  bill (`TradeGoldKind`), the bills being maintenance, the levy's surcharge,
  the charter's rebate and the treaties (a tribute is what two empires agreed,
  so a stage would pay one side more than the other was charged); the stage is
  `empirePercents` — the meter tiers and the arrears — and not a card's
  empire-stage percentage, which is written about a town. Tables and the
  before/after in `docs/fewer-things-plan.md`. (pp) **The
  evaluations cleanup — RULED** (the user, 2026-09-07: "it looks good to
  me — please queue that up next. Please test thoroughly to ensure
  behavior remains the same (make these one-time tests for parity). Let's
  also include a suite of tests to ensure that these calculations are
  happening in the correct order"). The spec is `docs/audit/evaluations.md`
  §4 and §4b, in this order, each gated on the parity fixtures:
  **E1 — the sequence of record and the parity baseline**: `docs/yields.md`
  (§2, §2c as a numbered reference with a sync test on `cityQuote`'s order),
  `test/sim/yieldOrder.test.ts` (one test per layer boundary: a hex
  bonus lands before a town bonus, a building share before the stage, a
  conversion over the flats, the two stages in order, the empire fold
  before its stage — each built from real rows and asserting the *order*
  by the numbers), and the **parity harness**: a slow test that drives
  four boards (duel/standard, 2 seats, t30/t60/t150) and records to
  `test/fixtures/parity/*.json` every reading the refactor will move —
  `snapshotState` hashes, each town's flats/percents/total, `civYields`,
  `ledgerReading`, `deckAggregate`, `explainCardImpact` for every held card,
  every worked hex's fold — then compares on every later run. One-time:
  it is deleted when E3 lands. **E1 BUILT** (no behaviour, no number, no
  replay moved; schema stays 86): `docs/yields.md` states eighteen steps with
  `test/sim/yieldsDocSync.test.ts` walking the source in that order and
  classifying all 45 effect kinds, `test/sim/yieldOrder.test.ts` pins the eight
  boundaries on real rows, and `test/sim/parity.slow.test.ts` +
  `parityHelpers.ts` wrote 208 KB of fixtures over four boards in 92 s.
  **The harness is gone** (E3b, 2026-09-07), as this ruling said it would be:
  it held on all four boards through E2, E3a and each of E3b's three moves
  with the fixtures byte-untouched, and was deleted with them at the end.
  The standing gates are `yieldOrder.test.ts`, `yieldsDocSync.test.ts`,
  `readings.test.ts`, `benches.test.ts` and now `verbs.test.ts`.
  **E2 — the list is the artefact**:
  `state.revision` (bumped in `applyCommand` and once per phase; serialised;
  schema 87), `readCity`/`readEmpire` as the two memoised sources of truth
  returning the labelled list (`CityQuoteLine[]` with `source`, `card?`,
  `building?`, `resource?`, `class`, `step`), the readers (panel, Ledger,
  lens, card impact, bot) moved onto them, `cityFlatsByClass` and the
  refresh register gone. **E2 BUILT** (schema 87; parity holds on all four
  boards with only the twelve `snapshot` hashes regenerated, the state having
  gained a field): `cityQuote` publishes the ten-step labelled list its flats
  are the fold of, `src/sim/readings.ts` remembers a town's and an empire's
  reading on the revision, and the panel, the Ledger, the top bar, the
  ghost-diff and the bot all subscribe — `cityFlatsByClass` and the four
  private walks are deleted, `classifyCard` and the eight classes moved to the
  leaf `src/sim/ledgerClass.ts`. `refreshCityDerived` **stays**: it re-seats
  citizens, which is stored derived state and the one thing a counter cannot
  do; what it no longer claims is any part in keeping a yield fresh. Two things
  did not ship and are named in `docs/audit/evaluations.md` §4c: `collectYields`
  keeps its own readings (the leaf rule, and the phase prices its towns against
  a pre-banking treasury), and **§3c's death of the effect memo's print is
  deferred** — keying `liveReading` on the revision fails 322 tests in 27 files
  including E1's own `yieldOrder.test.ts`, because the suite's benches mutate a
  board by hand rather than through commands, so it wants a ruling and a batch
  of its own. **E3 — the three verbs and the files by layer**:
  `explain`/`fold`/`read` only; `yields/{hex,town,empire,stages}.ts`,
  `statecraft/{evaluator,describers,draft}.ts`; mechanical, parity the
  gate, the harness retired at its end. **E4 — the deferred rows ruled**
  (§3e's table, yours — **the proposal is `docs/audit/deferred-rows.md`**,
  one recommended disposition per row: build 30 · cut 13 · keep 22; mark
  the exceptions and the batch builds what is marked build). **E4a BUILT**
  (schema 88): every ruling that was a data row, a one-field extension, a
  removal or a move — 17 clauses built, 11 cut, 6 rows retired, 9 kept as
  labelled, Religious Mandate moved to tier 10 and withdrawn there; the
  batch's own counts and its one deferral (Paper Money's Bourse, which
  needs a `oncePerEmpire` building row before a `rateConversion` can reach
  `liveEffects`) are in the proposal's *As built* section. **E4b BUILT**
  (schema 95): the reworks that needed a new shape or a new row — The Levée
  en Masse's stamped levy, the **Stable** (which is what The Horse-Tribes'
  struck clause was waiting for), The King's Road, Admiralty's free landing
  and its three turns ashore, the Silk Exchange's route share with the
  **Printing House** un-retired beside it, the Bank's route scope,
  Manufactories, the Cistern's irrigated fields, the belief **Crusade**'s
  lump of faith on a kill, and E4a's own deferral, the **Bourse**. One new
  shape (`landfall`), one new composite in the scope union (`any`, for a
  *site* that admits either of two grounds) and the pair resolution moved to
  a leaf (`src/sim/routes.ts`); the batch's own counts are in the proposal's
  *As built (E4b)* section. **E5 — the yield family collapsed — BUILT**
  (no schema move; still 96). Eight kinds that said *pay a voice* —
  `cityYields`, `tileYield`, `empireYields`, `routeYield`, `mirrorYield`,
  `countScaled`, `yieldConversion`, `rateConversion` — are one **`pays`**
  shape with two dimensions, `where` (city · capital · hex · empire ·
  route) × `basis` (flat · count · mirror · share · rate); `CardPayout` is
  retired into five fields of it. **291 data rows migrated** by
  `scripts/migrate-pays.mjs` (committed, run once), and every one of them
  reverse-maps to its predecessor field for field. The evaluator's eleven
  loops, the describers' eight arms and the bot's eight arms are one each;
  `docs/yields.md`'s register carries one row per (`where`, `basis`) pair.
  The proposal and the counts are **`docs/audit/e5-yield-shape.md`**; as
  shipped is `docs/audit/evaluations.md` §4c.3. Both gates held: the parity
  harness (restored from git, re-baselined on the batch's base, a fifth
  reading added for `explainCity`'s own list line by line — four boards
  byte-identical at t30/t60/t150, **retired again** at the end as ruled)
  and the printed-text snapshot, which **stays** as the standing gate
  (`test/sim/cardTextSnapshot.test.ts` + `test/fixtures/cardText.json`:
  every card of every class and every luxury, both readings of every
  clause, byte-identical across the migration). **The queue, in order** (2026-09-08): P1 → W1 + D1
  together (different files; both change how the game feels) → E4b → E5. (qq) **Production
  costs standardised** (the user, 2026-09-07: "we need to scale them back
  … buildings should be sized small, medium, large, wonder … one set of
  scaling notation … scale this base production cost by column number in
  the tech tree"): the proposal is **`docs/production-costs.md`** — one
  base per size, one rate per column, the rows carry a size and never a
  number, charters carry their pool's column, uniques keep the
  √(cities ÷ 4) line, `costAgeBand` retired. **Ruled** (the user,
  2026-09-07, in the doc): sizes **30 / 40 / 60 / 130**, `columnRate`
  **1.31** ("I'll let you know if we need to tweak it") — a Market goes
  147 → 89, a Cathedral 1530 → 397, a column-12 wonder lands near today.
  Units ride the same curve (the user, 2026-09-07: "this is ok, lets
  playtest first, because things felt way too cheap during my playtest" —
  a knight 187 → 297); the gentler-unit-rate reading is kept in the doc
  for the retune. The batch is **P1 — the cost standard** (schema),
  queued behind E4a. (rr) **The audience** (the user, 2026-09-07: "a
  peace proposal like in civ, where the ai have to respond immediately,
  with an option for 'what would make this work?'"): spec is
  `docs/war-diplomacy.md` §12 — the bot's answer dispatched at once as its
  own logged command, `declinePeace`, a peace closing on the second
  signature, `counterTerms` for the two Civ questions, the envoy card;
  batch **D1** (schema). (ss) **The campaign** (the user, 2026-09-07: bots
  "declared war on me, and they're just being annoying … bots should have
  something of a threshold to declare war, and when declaring war, should
  send units to attack me"): diagnosis and rulings in §13 — a strike force
  and a road before a declaration, the march ungated from aggression, one
  target and a muster per enemy, the siege exchange, civilians fleeing,
  the war economy; batch **W1** (knobs only, no schema) — **built**
  (`src/ai/campaign.ts`; the strike force, the muster, the siege
  exchange, civilians fleeing, the campaign waking its own trenches;
  measured: on the duel arena the warmonger holds a force on 70 of 170
  turns and never declares, so `strikeForce` 4 is the playtest's first
  dial). Both fly after
  E4a lands; (rec) defaults stand unless marked. (tt) **A luxury is lent
  by the copy** (the user, 2026-09-08: "i have two copies of amber. I
  traded one amber to the bot for marble. I should be getting the +4
  happiness from having a unique amber and a unique marble"): the deal
  register lent the *kind* (`lentAwayBy`'s docblock: "an empire with two
  seams that lends silk keeps neither"), which is neither Civ's model nor
  the user's own "copies that it has duplicates of". Ruled: one deal row
  lends **one copy**; the giver keeps the kind while its net copies
  (opened tiles − copies lent + copies received) stay above zero; the
  tile itself goes on paying its yield (only the signature moves); a
  city-local signature follows the empire's net holding. Batch **T1**
  (schema) — **built (T1)**, schema 91: `lentCopiesAwayBy` /
  `lentCopiesToPlayer` replace the kind lists, the clause is gone from
  `openedResource`, and `resourceCopies` is the one subtraction
  `hasResource`, `controlledHoldings` and `cityResources` all read.
  (uu) **Petra's site relaxed** (the user, 2026-09-08: "To
  build petra, you only need to be settled on or adjacent to desert"):
  `requiresSite` becomes the centre on desert **or** desert adjacent to
  the centre — with T1; **built**, as the new `terrainBeside` scope
  beside `onTerrain` and `terrainInBorders`. (vv) **The tech ladder re-anchored at 10** (the
  user, 2026-09-08: "adjust the science tree costs according to the
  decreased cost from the first tech … let's go with A for now"): the
  taper `cost(1)=13, cost(n)=friendly(cost(n−1)×r(n)), r(n)=1+1.3×0.72^max(0,n−3)`
  re-run from **cost(1)=10** for the formula's columns (2–5: 23 · 53 ·
  105 · 175, from 30 · 69 · 135 · 225) and the authored late columns
  scaled by the same 10/13 (Æra III 310 · 415 · 525; Æra IV 1100 · 1300 ·
  1500 · 1700); ages 261 / 1295 / 5940 / 19900, tree 27396 (was 35693).
  Reading B (early columns only) kept in chat for the retune. Batch
  **S1** (schema). (ww) **The Orders doc consolidated** (the user,
  2026-09-08: "consolidate the orders and doctrines md file? I'd like to
  make some balance changes after playtesting"): the tables stay the
  worksheet (headings and columns verbatim — the sync test reads them),
  every "As built" block and the proposed Government VI pool move to
  `docs/history/`, the retired rows' notes go (they are out of the doc
  by rule). Batch **O1** (no schema) — **built** (a447686). (xx) **The
  Orders balance pass** (the user, 2026-09-08, marked in
  `docs/orders-and-doctrines.md` — the marginalia are the rulings): a
  new Pool I Doctrine (great people called early, one called on
  adoption, +1 production on their works — named The Muses' Call by the
  orchestrator), Thalassocracy's conversion to production, Mountain Hold
  scoped to a mountain in the borders, Divine Inspiration withdrawn ("we
  want to encourage faith to be spent"), The Horse-Tribes built as +1
  movement and +1 strength for the mounted, The Great Warring Tribes'
  authority condition dropped, Manifest of the Steppe's happiness clause
  dropped, The Gilded Court +2 authority, Master of Maps' science riders
  dropped, Pax Imperia +10% culture for +3, The Pilgrim Ways +3 faith,
  The Natural Philosophers 50%; two new Orders (Boatwrights: +1
  production in coastal cities, chiefdom pool; Fish Weirs: +1 food on
  fishing boats, Government I pool — names, slots and rarities the
  orchestrator's), The Elders' Writ +2. Batch **B1** (schema 93) —
  **built**: one new shape (`grantsAbility`, folded into `hasAbility`,
  which is its only reader) and one new field (`DoctrineDef.onAdopt`,
  `OrderDef.onSlot` at the Doctrine's scale — a `windfallRider` on an
  adoption occasion would have called a great person at every tier the
  empire reached), plus the ⚓ Tide line declared in `CardLine` with its
  mark and its ink, since the two new Orders are its first rows. The
  pass is written up in
  `docs/history/orders-and-doctrines-as-built.md`. (yy)
  **The beliefs worksheet** (the user, 2026-09-08: "draft a current copy
  of all the possible religious beliefs, i'd like to make some edits"):
  `docs/beliefs.md`, tables only from `data/religion.json` (pantheon,
  follower, enhancer beliefs; rites; consecrations), sync-tested by
  `test/sim/beliefsDocSync.test.ts` — batch **R0** (no schema); the
  user's marks become **B2** — **marked** (the user, 2026-09-08; the
  marginalia in `docs/beliefs.md` are the rulings): Star Readers +4,
  Keeper of the Calendar every 10 turns with a chosen unit spawning in
  the capital, Rites of Blood +25, Lord of the Hoard renamed (The Stone
  Hoard, the orchestrator's name) and widened to quarries, The Vigil
  +10% science and culture, The Living Rock withdrawn, two new pantheon
  beliefs (Vineyard Rites: +1 food +1 culture on plantations; Cult of
  Heroes: +15% renown — names the orchestrator's); Cathedrals of the Sky
  and Feast Days become lines **on the Temple** so temple multipliers
  reach them; Choirs per 4, Tithe Houses per 3; Itinerant Preachers 5
  hexes, Ecclesia +3 faith, Congregation per 3 up to 5, Pilgrims' Coin
  +4 gold per following city, World Church +15% culture per following
  empire; **Holy Order built** as the Knights Templar — a faith-called
  unit that takes the strength of the empire's best available cavalry,
  costs 0.8× that unit's production cost in faith, and fights +3 in
  cities that follow the religion. Also: the `cityHappinessDemand`
  meter rule and its readers go (the user: "Don't keep the useless
  rule"); the Muses' Call's great person is once, pinned (B1). Batch
  **B2 BUILT** (schema 96, after E4b's 95; the Templar's mirror skips a
  row that awaits a technology — the cataphract). **B3 — the second
  beliefs pass** (the user, 2026-09-08, "i've updated some more religious
  beliefs", marked in `docs/beliefs.md`; the marginalia are the rulings;
  names and axes the orchestrator's where the user left them blank):
  a pantheon belief paying +1 production +1 faith on pastures (Herd
  Gods); **four follower beliefs each unlocking a building bought with
  faith and never built, only in a city that follows** — the Mosque (+3
  faith, +2 production, +1 authority capacity), the Wat (+3 happiness,
  +1 faith per 2 citizens), the Gurdwara (+3 food, +3 faith, +2
  science), the Dar-e Mehr (+2 faith, +10% faith in the city) — the
  Gilded Hall's shape (`unlockedByCard` + `purchaseOnly`) with the faith
  bank and a **follows** gate on the purchase; The Crusade +3; two
  enhancer beliefs — +5 science +5 culture for every following city
  holding a wonder (Marvels of the Faith), +1 science per faith building
  in following cities (The Scriptoria). Batch **B3 BUILT** (schema 97).
  (aaa) **The legibility pass** (the user, 2026-09-08: "keep the effects
  of bonuses straightforward … give it a name and give it an entry in the
  compendium … '+X in this city' doesn't make sense because they should
  apply to all cities … '+X in this city' should probably be 'in cities
  that follow your religion'"): audit and rulings in
  `docs/audit/legibility.md` — 32 generated faces say "this city" where
  the card reaches the realm (the ratified texts are clean); the
  describer takes its subject from the card's class; same-shape sibling
  clauses fold; negative-percent phrasing re-said; the star chart prints
  numbered rules instead of the note, and a node whose rules run past
  two lines prints one **named rule** (`[[rule:…]]`) with a Rules shelf in
  the Compendium. Batch **L1** (no schema; the card-text snapshot
  regenerated and its diff reviewed face by face) — **built** (L1, 2026-09-08: 81
  faces changed, every one under its ruling in the audit's §4; five named
  rules on the Rules shelf).
  (bbb) **Standing orders walk on this turn's points, and say where they
  will be** (the user, 2026-09-08: "a unit's orders should only be
  performed at the end of the turn if they have available movement,
  currently the unit moves at the end of turn and uses movement points
  from next turn … queued orders take place at the end of a turn, if a
  unit has remaining movement, the user is prompted to give them further
  orders … queuing a movement should display badges showing how many
  turns until the destination, and where the unit will be on each turn
  … a circular icon, with a decorative border and the turn # in the
  middle"). Diagnosis: `resetMovement` (`turn.ts`) refills every
  allowance and then resumes every stored path on the **new** turn's
  points, so a column arrives at the player's turn already spent.
  Rulings: `spendLeftoverMovement` (this turn's leftover, before the
  refill) is the **only** phase that walks a standing order;
  `resetMovement` refills and resumes nothing; a unit with a stored path
  and movement at the turn's start is offered to the player in the
  next-unit cycle with its committed route drawn (rec — it keeps its
  orders and does not block End Turn); a unit that arrives with points
  left is idle next turn and prompted. The path preview and the committed
  route both draw **turn medallions** — a circular badge, decorative
  border, the turn number — on the hex where each turn's march ends
  (`pathTurns`), the destination's the largest; one drawn mark in one
  style, in the flair gallery. Batch **U1** (schema 98 — a replay's
  columns arrive a turn later) — **built** (U1: the refill resumes nothing;
  `unitOfferedForOrders` feeds the cycle; medallions on the route, a ninth
  atlas set, a gallery stall). (ccc) **The draft's two answers restyled**
  (the user, 2026-09-08: "the two buttons for rerolling/passing drafts
  look better, but they look boring/awkwardly placed. Lets make them
  more center-aligned and do a general styling check to make them look
  more consistent, their colors also currently feel out of place"):
  the offer foot becomes one centred row under the hand, both answers
  the same size in the specimen's button language, told apart by glyph
  and the parchment/ink primary-vs-quiet weight rather than by lapis and
  vermilion (rec — the earlier decorated colours withdrawn); checked
  against the confirm card's and the city panel's buttons. Batch **U2**
  (no schema) — **built** (the reroll takes the primary's weight in ink,
  not vermilion; the pass the quiet parchment; marks ⟳ / ⊘).
  (ddd) **The palace pays a beaker and a note** (the user, 2026-09-08:
  "lets have the starting palace supply 1 science and 1 culture"; asked
  "do cities give culture on their own currently" — yes, every town
  makes `baseCulturePerCity` 1 and half a beaker a citizen; the palace's
  gift is what the capital makes on top): `rules.cities.palaceScience`
  1, `palaceCulture` 1, on the one "Palace" line; and **+6 starting
  authority** (`meters.authority.palaceCapacity` 4 → 6 — "the player can
  settle 3 coastal or 2 regular cities without needing monuments", which
  is `foundedCity` 3 / `coastalCity` 2 exactly). Landed by the
  orchestrator (schema 99, landed after U1's 98). **Open:** the border
  target "a monument buys three or four tiles by turn 25–30" has been
  overtaken twice by rulings (the 2026-09-05 border boost, then the
  palace's note); both fixtures now measure **six** inside that window and
  the pins say so. Whether the target moves is a ruling, not a pin.
  (fff) **The Wager** (the user, 2026-09-08: a global age off the mean of
  all players with a 10-turn countdown; five turns into each age three
  targets dealt from an age-scaled deck; each seat chooses one — met pays
  2 beads, missed takes a malice; the other two met pay 1 each; four an
  age plus the deeds, an Æra IV win very possible): the worksheet is
  **`docs/wager.md`** with the ▢ decisions and the (rec) defaults —
  progress as the mean age, the choice window, the deck scaling off the
  world, what a malice is, reckonings retiring. Awaiting marginalia; the
  batches are G1 clock → G2 deal → G3 malice → W2 bots. The Abacus
  world-clock ruling folds into its §1. (ggg) **The bot's second pass**
  (the user, 2026-09-08: "do a pass on the bot considering all the changes
  we've made … squeeze as much performance as possible out of the bots …
  variables that are missing from its evaluation"): the audit is
  `docs/audit/bot-pass-2.md` — 33 mechanics matrixed (10 priced, 8 with a
  named defect, 15 ignored), three measured findings (the cost standard
  made two thirds of the tech table score negative and the beeline went
  military; a deal loop re-sends one refused paper 37 times; faith rides
  its ceiling and buys nothing), the missing variables (a CityScope is
  never evaluated — 222 of 731 rows priced × cities; `cityHp` unread; the
  citizen's happiness demand uncharged), 81–105 ms a turn measured, and a
  queue X1–X11. **X1, X2, X3 fly now** (each an arithmetic change inside
  an existing fold, each with its acceptance measurement); X4–X8 follow;
  X9–X11 wait. **X1, X2, X3 landed 2026-09-08** (63e0f96 · e8bfef4 ·
  71cdc46): the unit step charges the levy's shortfall in hammers and the
  military premium reads against it (military re-aims 63/67% → 40/44%,
  techs at t150 32/36 → 54/40; the negative-node share is the building
  side's and rose, recorded as a correction); every scoped clause is
  priced over the towns `cityScopeAdmits` admits and a hex clause over the
  worked hexes its condition admits (six of six boards move, five on a
  draft passed); the faith book folds a faith house's town and prices a
  Templar as its horse. Two findings for the queue: the audit's bench
  never founds a house-opening faith in 150 turns (why the bots reach
  t150 without a religion is upstream of the book), and the X1 bench's
  treasuries at t150 fell (315/404 → 198/153, 666/392 → 384/352) while
  the tree grew — solvent, watched. **X4 and X5 fly next** (2026-09-08),
  rulings: (X4) a paper the rival declined is remembered by the **driver**
  (the harness that runs the seats, `stepper.ts`/`driver.ts`), not the
  state — no schema; keyed on the paper's own JSON and a fingerprint of
  the rival's holdings, and forgotten when that fingerprint moves or after
  `ai.war.refusalMemoryTurns` (rec 20); a refused straight swap is
  answered by `counterTerms` **once** (the bot sweetens with coin by the
  rival's own `dealSideError` caps) before the memory closes it. A save
  loaded mid-game forgets — one re-send, accepted. (X5) `explainCitizen`
  charges `happinessDemand` at the live happiness price as a signed line;
  `explainBuildingRow` folds `cityHp` beside `cityStat` through the
  sim's own `buildingEffects` reading. **X4 and X5 landed 2026-09-08**
  (6bea7db · b35bcd3): the paper remembered by the harness at four seams
  (the local seat's Refuse in `controls.ts` among them — the user's
  re-sent-paper annoyance), proposals 14 → 2 and 77 → 8; the citizen's
  keep and the wall's hit points (the Palisade fronts a besieged town's
  queue where a warrior did). **X5's finding**: `explainCitizen` has one
  caller, the settler branch, which SUBTRACTS it — so the keep arrived as
  more expansion (eight-seed sweep: towns 96 → 109, Σ happiness at t150
  42 → 28, 9 of 16 seats at the ceiling); the growth channel
  (`growthTerm`, the focus arm; `tileWants`, the hex purchase) is still
  uncharged. **Ruled, X5b flies**: both charge the marginal keep of the
  citizen they would add — `happinessDemand(pop+1) − happinessDemand(pop)`
  at the live price, the same line — read at the town's *current*
  population so a focus order does not move its own appraisal (a citizen
  arrives by growth, never by a command); acceptance is the same sweep,
  Σ happiness at t150 above 42 and ceiling seats at or under 4 of 16,
  towns not below 96 by more than three. **X8 flies beside it** (the rows
  nobody reads: a register in the shape of the fold registry). **X8 and X5b
  landed 2026-09-08** (5da55ce · 3e3b687): 49 building-row fields priced or
  excused by name (the `unitStat` heal is a share of a piece, not points of
  strength); the citizen's keep folded by four arms at the town's current
  size, the expansion chain charging the new town's first citizen beside
  its threshold — happiness at t100 back to +2.9. **X5b's finding**: the
  split of X5 on the t100 probe shows the **wall half alone** costs the
  mean seat 9 citizens, 34 food and 9 science with the town count falling
  — palisades before granaries — because the `cityHp` line is priced as
  points × the military weight × (1 + threat), and a point of hp is not a
  point of strength. **Ruled, X5c flies**: the hp line is a **share of the
  town's bar** (X8's `healsAdjacent` shape — hp ÷ the town's max hp with
  the row, × the town's own strength line's worth), still × (1 + threat);
  acceptance is the t100 probe — the wall half alone within noise of shut
  on citizens/food/science, and the siege bench still fronting a wall at
  threat 4. **X6 and X7 fly beside it** (`tileWants` bounded to the town's
  own ring and its hypothetical hoisted; the march re-asked through
  `unitOfferedForOrders`, at most once a turn). **RULED** (the user,
  2026-09-09): *"science really only should be valued when its a gain in
  yields (science per turn, and not lump science used to spend on a
  technology) … we shouldn't be thinking about science spend with the
  same value we're thinking about science gain."* A tech's beakers are
  **time, never coin**: research always runs, so the cost of researching
  A is only that B arrives later, and the chain already carries that as
  its delay (beakers owed ÷ the science rate, discounting every payoff
  behind it). The `explainLump` subtraction of the beakers at
  `weights.science` is a second charge for the same thing and is the
  reason most of the tree scores negative — and a negative chain is
  mis-handled twice over: the incumbent's `switchMargin` (×1.1) makes a
  negative plan *easier* to displace, and a chain's per-step share pushes
  its own buildings down the queue. **Batch X1b** removes the beaker
  lump (hammers keep theirs — they compete for a queue); science *gained*
  keeps its weight as a yield. Acceptance: negative-scoring nodes fall to
  what hammers alone account for; military re-aims stay under 45%;
  technologies at t150 not below X1's; the t100 yields row. **X5c, X1b,
  X6, X7 landed 2026-09-09** (a57d143 · b7e0bd5 · f5f62ba · 74a2f26): the
  wall a share of the town's bar; the beaker lump gone and the unit gift
  discounted by the research delay (every remaining negative node is
  hammers-only; techs at t150 39/37 → 49/47); `tileWants` bounded to the
  four best hexes by worth per coin (late-game ms/turn −46/−59%, fourteen
  boards byte-identical); the march re-asked through
  `unitOfferedForOrders` once a turn. The t100 row (eight seeds, 16
  seats) on the landed tree: cities 5.5 · citizens 35.5 · food 115 · prod
  49 · gold 16 · sci 36.6 · culture 46 · faith 16.5 · treasury 335 · techs
  19.9 · happiness −1.0 — against the pre-pass 5.6 · 31.6 · 96 · 58 · 26 ·
  30.6 · 37 · 16 · 239 · 15.8 · +3.4. **The science-weight experiment**
  (the user, 2026-09-09: "massively increasing the value of science"):
  swept ×1.5/×2/×3/×4/×8 on the t100 probe — ×2 through ×3 plateau near
  43–48 science and 21.5 techs; past ×3 science itself falls (×8: 37,
  cities 4.0); on the landed tree ×2 buys +11.5 science and +1.5 techs
  for −0.8 cities, −3 citizens, −3.5 buildings, −14 food, −8 culture.
  **Not landed** — the blunt weight wants beakers everywhere, including
  where no road is left. **Ruled, X1c flies**: science's price is the
  weight plus a chain-derivative premium, `hammerPrice`'s twin — what one
  more beaker a turn saves in delay across the live chains' payoffs —
  so an empire with tech road ahead prices a beaker high and one with
  none prices it at the table. Acceptance: the t100 row's science and
  techs up on the landed tree with cities and buildings within noise,
  and the ×2 sweep re-run beside it. Written down from the batches: seed
  4242 spends 2,462 of 3,324 commands on a pre-existing march
  oscillation (X7's finding, a queue item); `controlledHoldings` and
  `meterEffects` are the bot's largest unmemoised costs (X6's finding, a
  sim batch); the bots on the audit's bench never found a house-opening
  faith in 150 turns (X3's finding). **The user, 2026-09-09: "I fear the
  bot is starting to get slow and we're adding too much to it … let's add
  X1c and the sim readings and do a performance comparison."** Ruled: no
  new arms after X1c; X9/X10 held until the user has played on this bot;
  **batch M1** memoises `controlledHoldings` (`cities.ts`) and
  `meterEffects` (`meters.ts`) per `(revision, seat)` in `readings.ts`'s
  slate — a sim batch, no schema, byte-identical outcomes — and the
  performance comparison is ms/turn before/after on the two benches
  (whole game and X2's identical-state method) plus the t100 probe's own
  ms/turn column; the five attribution doors (`scopeDoor`, `signDoor`,
  `keepDoor`, `hexDoor`, `rowDoor`) come out in a cleanup pass after M1.
  **Batch T1, the test suite's speed** (the user, 2026-09-09: "improve the
  speed of the testing suite … how much of it is actually necessary?"):
  the push-gate is 13 minutes and 12 of them are one file, the 200-turn
  bot arena (`aiBot.slow.test.ts`); the core tier is ~100 s. **RULED**
  (the user, 2026-09-09): "we shouldn't be using the bot to measure
  anything, it isn't a good baseline" and **"axe the pacing claims"** —
  every slow-tier assertion whose subject is the game's pacing read
  through the bot (a decided game or a live race by turn T, N cities by
  turn T) is deleted, listed in `docs/audit/test-suite-speed.md`; what
  stays is the bot-regression guards (solvency, no compounding deficit,
  driver/stepper byte-for-byte, log replay) at the shortest horizon that
  still catches the historic failure, the rules claims, and the arranged
  war boards. **RULED** (the user,
  2026-09-09: *"the value of a library is contingent on the city that
  builds it: a city in your capital with high population is worth a lot
  of science, and is built faster than a middling city. Also — the value
  of a tech path isn't just based on the thing the tech unlocks, it also
  includes the value of all the prerequisite techs that you research
  along the way."*) Both confirmed in `chain.ts` as it stands: a building
  step's payoff is the row's **flat** bag (a Library's `science: 2`; its
  `sciencePerPop: 0.5` and every percentage never enter) × the towns that
  would raise it, built at the **middling** town's production; and a
  goal's chain prices only `techDef(goal).unlocks` — the road's
  intermediate nodes contribute beakers and delay and no gifts. **Batch
  X1d, after X1c lands**: (a) a building step's payoff is the sum over
  the towns that would raise it of each town's own hypothetical fold
  (`townFolds`, X3's per-sitting `(town, row)` memo, shared with the build
  arm and the book), and its delay is the **first** town's build time
  (towns raise in parallel; the capital raises first); (b) a goal's chain
  is the whole road — every node on `researchExpansion(goal)` contributes
  its unlocks as steps at the delay its own beakers land at (cumulative
  along the road) — so a deep goal is worth what the road hands over,
  each gift discounted at its landing. Acceptance: the t100 probe
  (science, techs, buildings up; cities within noise), the negative-node
  share, and a bench where a pop-12 capital prices a Library at its real
  fold and a two-node road prices both nodes' gifts. **Refined** (the
  user, 2026-09-09): (a) is **per copy** — each town that would raise the
  row lands its own copy at its own build time and that copy's payoff is
  discounted at that time (neither the first town nor the middling one),
  and it holds for **every** building, not the science rows: a Lighthouse
  prices the fish of the town that raises it, a Market prices the route
  its slot opens (`routeSlotTerm` already prices a slot by the best
  unrun pair, so the step inherits it through the row); (b) a node's
  gifts are computed once per sitting and reused by every goal whose road
  passes it, only the discount differing. **The worker's craving**
  (`workers.planTopN` × `planFalloff`, the decay over the ranked entries)
  is questioned: *"the value of a worker should be the yields of the top
  improvable tiles based on the number of workers it has."* (rec) the
  craving for one more worker = the plan's **unclaimed** entries that
  worker would lay, taken in rank order for as many as its **charges**
  buy (`UnitDef.charges` ÷ each row's `chargeCost` — a Worker's three) and
  as fit inside the horizon, each discounted at the turn it lands (the tile pays
  only once improved — that delay is real; a decay over rank is not), the
  entries existing workers will reach — each one's **remaining** charges'
  worth of them, `Unit.chargesLeft` — removed first; `planFalloff`
  retires (the user, 2026-09-09: "taking into account the # of worker
  charges a worker has" — yes). Part of X1d, `plan.ts` and the worker arm in `bot.ts`.
  **Read off one game** (seed 1, standard, 2026-09-09, the user: "why is
  the bot so much worse than a human"): the capital built two wonders
  (t14–33, t37–54) before a Granary (t65, size 10) or a Library (t81, size
  13), the second town spent its first 29 turns on the Oracle, one settler
  left the capital between t14 and t62, fourteen research re-aims by t64,
  seven draft hands passed. Two causes found in the source: (1) **wonder
  patience** — `score.patienceTurns` (10) amortises every one-of-a-kind
  row over at most ten turns, so a 19-turn wonder is scored as a 10-turn
  one against a 4-turn Granary; the rule was written for the endgame
  capstones (a 109-point Opus over 32 turns) and applies to every wonder.
  (rec) patience only for a row that pays a bead or ends the game; an
  ordinary wonder is amortised over its real turns and its payoff
  discounted at its real delay like every other step. (2) **the worker's
  plan prices every owned-or-adjacent hex as if worked** — a size-2 town
  with eight farmable hexes reads eight entries and craves workers (the
  tech gate is already honest: `improvementErrorAt` refuses a row the
  seat cannot build); the user: "workers shouldn't really be built so
  early." (rec) an entry counts only on a hex a citizen works or the
  town's next few citizens would work (the town's own tile ranking,
  `pop + 2`), folded into X1d's worker rule. (The Granary carries no
  upkeep — `buildingUpkeep` charges only a renown-bearing row; the
  orchestrator misread it in chat.) **Two more places count ground
  nobody works** (the user, 2026-09-09: "values where we're overestimating
  the number of tiles a city could work"), (rec) both X1d's: (3) the
  **settle site** — `explainSite` (`bot.ts`) sums every hex inside
  `site.ringRadius` × `ringFalloff`, so a site with eighteen middling
  hexes outscores one with four rich ones; the honest reading ranks the
  ring's hexes and counts the top N a town would work inside the horizon
  (its growth curve — roughly the citizens it reaches by the horizon,
  read off `growthThreshold`), each discounted at the turn that citizen
  arrives; it also reads `explainTileYield(near)` context-less (the
  omniscient reading), which mis-prices reveal-gated resources — read
  through the seat's own ctx; (4) the **renewal survey** —
  `surveyUpgradeSites` (`plan.ts`) counts every farm standing or
  buildable in reach when pricing a renewal tech (Irrigation), so a rider
  is worth every hex a town could ever farm. **RULED** (the user,
  2026-09-09: "why isn't that using the already existing logic for
  pricing bonuses? All the other bonuses are priced as if they took
  effect immediately"): a renewal is priced exactly as a building is — the
  town's own **hypothetical fold with the tech held** (`TileYieldContext.
  techs` is the seat's list plus the candidate; `foldCity`/`explainCity`
  over the worked tiles), the delta against the standing fold, memoised
  per `(town, tech)` in the sitting the way `townFolds` memoises `(town,
  row)`; this prices the renewal AND the resource the tech reveals on the
  tiles a citizen actually works, and `surveyUpgradeSites` retires with
  `plannedRiderTerms` re-pointed at the same fold. The unworked-ground
  count for the *worker's* plan (2) still needs its own rule, because a
  farm not yet laid is not in any fold. Gated already and left alone: the hex purchase (`tileWants`, X5b
  and X6 skip a hex nobody would work), X2's hex-scoped pays (worked
  hexes), the rites (worked), the citizen's ground (`growthTerm`, the
  next tile). **The pass, mis-folded** (the user, 2026-09-09: "#3
  sounds like we're valuing orders incorrectly?" — yes): `skipCandidate`
  (`bot.ts`) prices a pass as *the best of the next hand dealt with one
  more pass of pity*, discounted by the meter's refill, and compares that
  against the card on the table. But the next hand comes either way;
  what a pass buys is only the **difference** the pity makes —
  `expectedBestOrder(pool, size, skips + 1) − expectedBestOrder(pool,
  size, skips)` — and what it costs is the whole card forgone. Folded as
  it is, a pass is credited with the entire next hand, so the bot passed
  seven hands in 120 turns where a person passes none. **RULED** (the user, 2026-09-09: "queue that up"; X1d) the
  pass's term is the pity's marginal gain, discounted; the card's worth
  stands against it; a pass then wins only when every card on the table
  is worth less than one rung of pity. The pity itself is the game's rule
  (`skipPity`, schema 63: each banked skip raises the uncommon and rare
  weights of the next deal, zeroed by a pick). **Potential** (the user,
  2026-09-09: "does the bot ever price the potential of a card? +1 science
  on libraries is good even if you don't have libraries built yet … does
  the bot price card effects when evaluating chains? … a human will take a
  suboptimal coastal spot over a slightly better inland spot if they
  suspect fishing boats later"). Read off the source: (1) a card scoped to
  a building (`buildingYieldPercent`, the `hasBuilding` scopes) walks the
  buildings **held** — a "+10% on libraries" card is worth nought to an
  empire with no library, one town under the wonder idiom; (2) today's
  chain reads a row's flats and `explainBuildingRow`, neither of which
  sees a slotted card — X1d's per-town hypothetical fold (`foldCity`
  honours live card effects) closes this without a further rule; (3) the
  site reads its ring as it stands plus a flat `site.coastBonus` prior —
  no potential. **Batch X1e, after X1d — potential, read off the register
  of intent, never a search**: a card's building-scoped effect counts the
  buildings held **plus the building steps of the live chains** (the
  libraries this empire is about to raise), each discounted at its step's
  delay; a site's ring hexes are priced at the best improvement each could
  take under the technologies **reachable inside the horizon** (the tree,
  not only the plan — a human "suspects"), discounted at the turn that
  tech would land, so a coast with four fish reads its boats before
  Sailing is chosen and `site.coastBonus` retires; the same reading
  replaces `plannedRiderTerms` in the worker plan. Still greedy: no
  lookahead over decisions, only payoffs the board can already name. **X1c, T1, M1 landed
  2026-09-09** (b488434 · 3cc96fe · 0a2cbf3): science's chain-derivative
  price (t100 science 36.6 → 43.6, techs 19.9 → 21.3, cities and
  buildings inside two SE); the suite 861 → 362 s with the pacing claims
  axed and five retirements; the slate — `controlledHoldings` and
  `meterEffects` memoised beneath the verb, byte-identical, whole-game
  ms/turn −24/−32%, the sim's core tier 150 → 110 s. **The price band
  ceiling** swept on the t100 probe (3× today · 6× · 10× · 10× with the
  floor at 0.25): faith doubles (16.5 → 32) and gold rises by half at 10×,
  science +2, production −8, cities −0.4 — the user's "small improvement";
  re-measured on X1c before choosing. **X1d flies next as two agents**
  on disjoint files: X1d-chain (`chain.ts`: per-copy town folds, the
  whole road, patience only for a bead or the curtain) and X1d-ground
  (`plan.ts` + the worker/site/pass arms in `bot.ts`: the worker's
  charges and worked hexes, the site's top-N, the renewal as a fold, the
  pass's marginal pity). **M2, X1d-ground, X1d-chain landed
  2026-09-09** (5e85688 · f0cbb32 · 62f116a): M2 is byte-identical and no
  faster — its counters found that after M1 a miss at rest costs under 2%
  of a game and the real cost is the **suspension window** (a tenth of
  all readings are asked inside a phase or a handler where the slate may
  remember nothing; End Turn puts the whole resolution inside one) —
  shrinking that window is **M3**, held for the user's call; X1d-ground:
  workers by t30 1.44 → 1.00, hands passed per 120 turns 3.4 → 0, food
  and citizens up, production down two SE (spades ploughing where
  citizens stand rather than mining hills nobody works — watched);
  X1d-chain: buildings +17%, cities up, culture and gold up, science and
  techs flat (the road buys the buildings and costs ~4 science —
  reported, not tuned), ms/turn +18% under identical load; seed 1's
  capital builds Library t47 · Monument t50 · Amphitheater t57 and no
  ordinary wonder inside 120 turns. `surveyUpgradeSites` and its three
  count pins retired with the swap. **X1e and D1 landed 2026-09-09**: potential read off the live chains
  (a card's building-scoped effect counts the shelves a chain still owes,
  at their discount) and the reachable tree (a site's ring hexes priced
  at the best improvement a node inside the horizon would open;
  `site.coastBonus` retired) — culture 55 → 63, gold 28 → 33, science 56
  → 58, nothing down beyond one SE, ms/turn +2%; coastal towns did not
  rise, and the open question is written down: what a coast is worth
  beyond its hexes (a harbour's routes, a lighthouse's food) is priced
  nowhere in the settle table. The five doors are out, byte-identical.
  **The queue is drained**: X9/X10 held until the user has played on
  this bot; M3 (the suspension window) held for the user's call; X11
  waits on the Wager. **RULED** (the user, 2026-09-09: "let's do M3 with
  the register and shadow mode"). **Batch M3 — the suspension window
  closes**: the bump moves from *after* a command or phase to *at the
  mutation*, so the slate is trustworthy at every instant and never
  switches itself off; a read after a write misses and recomputes, every
  read until the next write hits. Two guards, both required: (1) **the
  register** — a source-reading core test that lists every assignment in
  `src/sim/` to a field the slate's tenants fold (tile ownership, the six
  mutable tile fields, a city's buildings/population/tiles/specialists/
  queue, a player's cards/slots/beliefs/techs/deals/gold/meters) and
  requires each to sit inside an announcing helper or be followed by an
  announcement; (2) **shadow mode** — under a test-only switch every
  slate hit also recomputes the reading fresh and asserts identity, run
  over the whole slow tier once, so a missed announcement fails at the
  reading that went stale with the phase and turn named. First step: a
  probe counting, per phase and per command kind, the asks between
  consecutive writes — the ceiling before the reducer is touched;
  report it, then build. Outcomes byte-identical; no schema. **M3 built
  2026-09-09**: 89 announcements in 69 functions, the window gone; the
  register (27 field patterns, derived from the card evaluator's `count`
  vocabulary, not only what `meters.ts` reads) and the shadow run over
  the whole tier, which found **two staleness defects M2 had introduced**
  that a deterministic replay could not see — The Long Watch pays per
  garrison (a march moves happiness) and Pilgrim Roads per banked faith
  (the banking loop moves it between towns); both announce now, and a
  game holding either card changes, honestly. Gain: asked-while-suspended
  57,242 → 0, ms/turn −5%, the t100 probe identical. Open for the user:
  **two-pass `collectYields`** (assign every town, then price every town)
  measured byte-identical over 150 turns — a restructuring worth making
  for legibility, not speed. **Read off
  seed 1 on the landed tree (2026-09-09)**: the opening is fixed (Settler
  t16, Granary t27, no wonder before t79, no hand passed) and three things
  remain, each probed in the capital's own table. **RULED** (the user,
  2026-09-09: "yes, let's put in each of these fixes"), batch **X12**:
  (1) **conversion projects** (Scholarship 30 · Tithes 22 · Library 10 at
  t45; the Library waited from Writing at t41 to t88): a project's payout
  is a **lump** — science once, not science a turn — and goes through
  `explainLump`, the bot's one stock-to-flow exchange over the horizon,
  exactly as every other one-time thing does; a shelf's rate stays a rate
  (the user: "science once != science per turn"; libraries need no
  lifetime value — the currency is per turn and the lump exchange is the
  apples-to-apples). (2) **the faith rate** (pool 15 at t30/45/60/90, no
  Shrine ever built, no pantheon; the book values the pantheon at 385 for
  40 and nothing tells the build arm a Shrine is the step): a
  **faith-rate premium**, `sciencePrice`'s twin — what one more faith a
  turn saves in delay across the faith plan's wants (pantheon, founder,
  beliefs, rites), the rate floored at 1 so a zero-income empire prices
  its first Shrine as the door it is; the user: "religion and pantheons
  need to be priced into the value of faith." (3) **the late wobble**
  (t108–118: every chain −128 to −450, Satrapies ↔ Daughter Cities
  flipped six times in ten turns): the incumbent's margin applied
  **symmetrically** (a negative incumbent divided by `switchMargin`, not
  multiplied), and — the ruling that removes the cause — **hammers in the
  chains are time, not coin**, by the beakers argument (production is
  always spent on something; the cost of raising X is that Y waits, and
  the per-town cursor already carries that as delay): the `explainLump`
  subtraction of a step's hammers goes from the tech chain, the expansion
  chain's settler and the bead race alike; a step's hammers print at
  nothing beside the delay they bought. Also noted: the third city
  (founded t37) built a Settler at size 2 and stood at size 4 at t98 — the
  expansion chain pulling a settler from a town too small to spare one;
  X12 reports the arm without changing it. **X12 built 2026-09-09**: t100
  buildings 19.4 → 36.1, production 74 → 96, gold 33 → 50, science 55 →
  100, culture 61 → 87, treasury 336 → 506, techs 22.7 → 27.1, pantheons
  16 of 16 seats (cities 6.3 → 6.0, inside noise); seed 1's capital
  Shrine t24 · Granary t34 · Library t55, no conversion project in 120
  turns, the late wobble gone. Three findings for the queue: (a) **the
  settler's growth freeze** — the rules take no citizen for a settler
  (`minCityPop 2`, `haltsGrowth`), the bot charges a one-citizen stand-in
  (`explainCitizen`, ~25) against a chain share near 129, and
  `haltsGrowth` is read nowhere in `src/ai/` — the honest charge is the
  food the freeze costs over the raising's turns at the food weight,
  which is why a size-2 town spared a settler and stood at size 4 at t98;
  (b) `settleCandidate`'s own `hereScore × switchMargin` has the same
  sign asymmetry, left alone; (c) **wonder-race risk** priced nowhere —
  the reading it needs is public (rivals' age and production, whether
  the unlocking tech is held anywhere, this town's owed turns): a `P(lost)
  × payoff − (1 − refund) × stones sunk` term, X10's missing half. Also
  written down: a half-paid chain is now worth what is left — the
  sunk-cost defence was an artefact of the hammer ledger, and the
  symmetric margin alone defends a plan in flight. **Potential on a row's hex
  clause** (the user, 2026-09-09: "a wonder like the Great Lighthouse:
  are the potential fishing boats it affects priced into its value?"):
  no — a `pays` at `where: 'hex'` with an `on: improvement` test
  (`workedHexesAdmitting`, X2) counts the hexes a citizen works that
  carry the improvement **today**; a worked fish with no boat counts
  nothing, and X1e's potential reads only the live chains (cards) and the
  site's ring. (rec, **X1e-b**, after X12 lands — same file): a hex
  clause counts the worked hexes that admit now plus the worked hexes
  that *would* admit once an improvement the seat can lay (held tech) or
  a reachable node opens (X1e's `reachableTechs`, the per-hex potential
  memo) is laid, each discounted at max(the node's landing, the spade's
  landing off the plan) — so the Great Lighthouse in a town working four
  bare fish reads four boats' gold before the boats exist; the same
  reading serves every hex-scoped card. (eee)
- (hhh) **Playtest notes, 2026-09-09** (the user), each a ruling, three
  batches flying together: **B4 (balance)** — (1) *"science costs for age
  4 need to be scaled up significantly … so that age 4 is ~50% more
  expensive"*: the tech ladder's Æra IV columns (`src/sim/tech.ts`, the
  one tapered table; today `1100 · 1300 · 1500 · 1700` after `525`)
  ×1.5, the doc's table sync-tested; (2) *"great people need to be gained
  at roughly 1/3rd the rate they appear now"*: the renown ladder
  (`rules.renown`, `first 40 · step 25`) ×3 — first 120, step 75 — so a
  person arrives a third as often on the same renown; and
  `docs/great-people.md` regenerated as a current reference (roster,
  ladder, every act and work figure, the purchase offers) for the user's
  balance pass. **B4 built 2026-09-09**: the ladder is a *taper* (its
  ratio decays 2.3× → 1.09×), not an exponential, and Æra IV was the
  flattest stretch — now 1650 · 1950 · 2250 · 2550, a `techDocSync` test
  added; `rules.renown` 120 · 75, measured on two bot games at **half**
  the arrivals (12 → 6 a seat by t150), not a third — the ladder's
  cumulative cost is quadratic in the count, so a true third is of the
  order of **first 360 · step 225**: ▢ the user's call whether half is
  enough or the step goes again; `docs/great-people.md` regenerated as
  the reference (the offer prices had drifted: doc 300/150 vs data
  1000/750, fixed). **RULED** (the user, 2026-09-09): *"the first great
  person at 75 renown, and have the costs scale in line with how our
  culture costs are scaled. Aim for ~1/3rd of the previous amount of
  great people at the end of age 3."* **Batch B5**: the renown ladder
  takes the draft ladder's shape — `base + linear·n + n^exponent`
  (`draftCost`, `statecraft/draft.ts`: culture's is 12 + 6n + n^2.8) —
  with `base 75`; `linear` and `exponent` chosen so that the renown a
  seat banks by the turn it leaves Æra III (measured on the bot bench
  under the ORIGINAL 40 · 25 ladder) buys **one third** of the persons it
  bought then; the doc's ladder table and sync test follow. **U4 (UI)** — (3) *"rename the great people actions
  act/work because they're not informative enough"*: the two buttons
  print the family's own verbs (a scholar *Writes a treatise* / *Founds
  an academy*; the words from the family's data row, through the
  describer, never a literal in the UI); (4) *"On city capture, the
  player should be given a selection modal to either annex, raze or
  puppet a city, with their outcomes labelled"*: a sheet on
  `modalShell.ts` at the capture moment (today a captured town holds as a
  puppet until annexed, with a toast), three choices with the sim's own
  figures beside each — annex (the authority the town costs, the
  unhappiness it brings), puppet (what a puppet is: its production
  chosen for you, no authority? — read `docs/war-diplomacy.md` 9b and the
  reducer), raze (the town destroyed, whatever the rules pay); the
  choice a command already in the log (`annexCity`, `razeCity`, or
  nothing for puppet); a bot seat is unaffected; (5) *"cities that are
  puppeted should have an indicator in their banner"*: a puppet mark on
  the city banner, joins `CityLook`; (6) *"units stationed in a city
  should have their unit icon display on top of the banner"* (Civ 5/6's
  pattern): the garrison's badge above the banner, seat-tinted, the
  layer rebuilt off the units fingerprint, a new visual asset in the
  flair gallery in the same pass. **U4 built 2026-09-09**: the five
  families' verbs as data (a scholar Writes a Treatise / Founds an
  Academy; an artist Holds a Festival / Raises a Landmark; an engineer
  Rushes the Works / Raises a Manufactory; a merchant Strikes a Bargain /
  Builds a Customs House; a general Rallies the Army / Raises a Citadel),
  the capture sheet on the modal shell, a yoke on a puppet's banner, the
  garrison badge with a count boss and its own fingerprint, a new
  register that every seat-filtered layer rebuilds at all four doors. Two
  sim asks written down for the next reducer batch: `cityCosts` is
  private to `meters.ts` (the annex figure reads the rules row rather
  than a meter line) and a capture has no `CommandResult` channel (the
  sheet infers it as the toast does) — a `captures?:` field. The
  spectate feed's great-person summary (`greatPersonCommand`, `bot.ts`)
  still says act/work — R1's fence. **V2 (heraldry)** — (7) *"the
  barbarian colors and the crimson color are too similar … barbarian
  units having red as its icon base color instead of its outline; double
  check the icon is still legible, and invert the black to white if
  needed"*: the wild's pieces take red as the **base** (the seat colour
  `#3a3a42` in `seatBarbarians` moves to a red the crimson seat's
  `#d4502e` is not confusable with — a darker, bluer red), the outline
  no longer red, the glyph inverted to white where the contrast test
  says so; the flair gallery shows the piece beside the crimson seat's.
  **V2 built 2026-09-09**: the wild's red was on thin strokes only (a rim
  washed toward `warRed`, a `warRed` ghost, an oxblood badge ring) over a
  raven body; now `palette.wildRed #7a1f2b` is the base — ΔE2000 19.9
  from the crimson piece ink against the old rim's 8.6, 3.8–8.2:1 on
  every land ground, the ghost more legible than before — the glyph
  inverted to bone (8.15:1 where black read 1.36:1), the wild no longer
  counted hostile for the outline, the seat colour followed. (eee)
- (iii) **The trade screen** (the user, 2026-09-09): *"drastically
  improve the trade screen. The trade screen should have an icon next to
  the statecraft/religion/diplomacy buttons. Instead of building traders,
  lets have trade routes be purchasable with gold directly in the
  interface of the trade screen … having traders be gated by gold does
  make the decision making more interesting. Trader units should still
  appear and build roads when a route is sent, but we should give them a
  different shape icon (still semi-opaque) … trade routes should be
  entirely sent/managed on the trade route screen. Also, please look
  into the performance of the trade screen, it gets quite laggy. Also,
  trade routes that are unavailable shouldn't show in the main screen,
  they should be tucked away in an 'unavailable routes' tab."* Rulings:
  **a route is bought with gold on the trade screen** — a new command
  `buyRoute {playerId, fromCityId, toCityId, mode?}` (schema bump) that
  charges the treasury and spawns the caravan at the origin with its
  `trade` set, validating exactly as `startRoute` does (slots, range,
  the pair, the mode) plus the purse; `startRoute` stays for a caravan
  already standing (saves, the bot's teleport) and the Trader row leaves
  the production menu and the purchase book (a marker read in
  `buildError`/`purchaseError`, never a name; the bot's trade arm buys
  through `buyRoute`); (rec) **the price** is the caravan's own purchase
  price — `goldPerHammer × the Trader row's production cost` (the cost
  standard, so it climbs the columns with the age) — one knob
  `rules.trade.routePriceMultiplier` (rec 1.0) over it, printed by
  `explainPurchaseCost` as a route line; the caravan piece takes a
  **different sculpt** (a cart or a bale, not the unit disc), still
  semi-opaque, joins the flair gallery; the **top bar** gains a trade
  icon beside statecraft/religion/diplomacy opening the screen; the
  screen shows only the routes the seat could send now, with an
  **Unavailable** tab holding the rest and the reason each is unavailable
  (out of range, no slot, at war, blockaded, the road unbuilt); the
  screen's **performance** measured and fixed (the suspicion: every open
  re-prices every pair through `routeYields`/`findPath`; the fix is the
  slate — `readRoutes(state, seat)` per revision — and a render that
  rebuilds rows only when the revision moved); every send and cancel
  lives on the screen (the unit panel's route buttons retire in favour
  of a link to it). Batches **R1** (sim + bot: the command, the marker,
  the price, the bot's arm) and **R2** (UI + render: the screen, the
  icon, the tab, the sculpt, the perf), R2 after R1's command exists.
  **The user, 2026-09-09, on the screen's UX**: *"once you hit late game
  there's an overwhelming amount of trade routes available and I'd like
  to organize and surface the best ones for the player."* (rec, R2's
  brief): the available routes are **ranked by what they pay a turn**
  (`routeYields`' own fold, the bot's caravan appraisal is the same
  reading) and grouped **by origin town**, each group collapsed to its
  best three with a "show all" fold; a **Best routes** strip at the top
  names the empire's top five across every origin with their pay and
  price; a filter row (by partner: own towns / a rival's; by mode: land
  / sea; by what it pays most: food · hammers · gold · science · culture
  · faith); the search over pairs memoised on the revision so the
  ranking is free to redraw; a route already running shows its remaining
  turns and its pay in a **Running** tab; the Unavailable tab groups by
  reason. **Refined** (the user, 2026-09-09): the main screen is the
  **recommendations**, grouped by purpose in this priority — *Richest*
  (the first two or three caravans), *Paves a road* (a missing city
  connection, usually overlapping), *Feeds a town* (late game), *Most
  science and culture* (the foreign carts) — no "expires soon" group; the
  **full list** stays viewable behind a tab, grouped by origin town with
  collapsible groups and the slot tally; a *Running* tab; the
  *Unavailable* tab by reason. Mocked on invented figures at
  https://claude.ai/code/artifact/d5391716-5bfa-4fee-ac26-e3a8cd479f91
  (the spec of record for R2's layout once the user marks it). **Marked
  2026-09-09** ("very close"): bordered compact cards, the index tabs
  along the head styled as a ledger's cut tabs (a gilt hairline under
  the ink rule, a gilt inner edge on each tab, a hedera on the open one),
  facts only (hexes paved "(land)", the connection and its pay, what the
  host keeps, the fed town's size and next citizen, warships on the path,
  the trading post and the towns it brings into reach), no walk/sail
  turns, no "from" buildings, no turn in the masthead, a Land | Sea
  toggle on every route where both are possible. **Directions for R2**:
  the toggle **re-reads** the route — the yields and the facts are the
  fold for the chosen mode (a sea cart lays no road, a land cart's
  paving counts); an **empty purpose section does not appear at all**;
  ▢ **sea routes pay no more than land today** — `RouteMode` changes the
  path, the road laid and the blockade exposure only, and the rules carry
  no sea multiplier; if the user wants "+50% by sea" it is one knob
  (`rules.trade.seaYieldPercent`, rec 0 → 50) read in `routeYields`'
  fold and printed as its own line. **RULED** (the user, 2026-09-09):
  "sea routes should pay +50%" — `rules.trade.seaYieldPercent` 50, read
  in `routeYields`' fold as its own line, R1's. **Final marks
  (2026-09-09, "begin the implementation")**: no gilt hairline *under*
  the tab rule (the ink rule alone); keep the gilt inner edge on the tabs
  and the gilt accents elsewhere — the user: "that fits the theme of
  'trade routes are for gold/economy'" — so gilt is the trade screen's
  one accent; the **mode column** in the Running and All-routes tables
  is not prose ("land, road laid") but the same Land | Sea control the
  cards carry, or a single chip where only one mode is possible, with
  the road state as its own column. The mock is the spec of record. (eee)
  **The wanting voice** (the user, 2026-09-08: "have the 'taught by
  ____' in small red italicized script, similar to how tile yields
  display. Anywhere the game tells the player they're missing a
  prerequisite tech/building/condition, please keep the same
  styling"): one class, `.wanting` — small, vermilion, italic, the copy
  face — beside `.tile-requires.is-wanting`; the rite's "Taught by"
  wears it (landed with (ddd)), and a sweep puts it on every other line
  that says "you are missing X": the buildable rows' "needs …", the
  buildable preview's `info-card-state is-blocked`, the star chart's
  blocked state, the bead card's gate, the unit sheet's refusals, the
  Reliquary's closed door. Batch **U3** (no schema; after U2 lands, since
  both edit `style.css`) — **built** (eleven lines; three vermilions folded;
  `.wanting.wanting` for the cascade; `test/ui/wantingVoice.test.ts` resolves
  it).
  As built: the four houses take the **Temple's** column (5, medium — 117⚙,
  and 117🕯 through the bank, `faithPerHammer` 1); a building may now name
  its own bank (`BuildingDef.purchase`, the roster's marker one table over,
  read by `rosterBank` — the price stays the ordinary cost converted, so no
  figure is typed on a row) and its own congregation
  (`BuildingDef.followingOnly`, tested in `purchaseError` and printed by
  `describeBuildingRow`, nowhere else). The one design question — a follower
  belief is never in `liveEffects`, so who does its `unlocksBuilding` open the
  row for — is answered the pool's own way: **whoever owns a following city**,
  `cardUnlocksBuilding` walking the empire's towns' beliefs after its law, with
  *which* town may raise one left to the purchase. Two new counts on the
  `following…` sweep — `followingCitiesWithWonder` (towns, once each) and
  `followingBuildingsOfCategory` (roofs, `category` the argument, so nothing
  spells "faith" in a member name). `docs/religion-v2.md` §Buildings & wonders
  has the mechanism. (zz) **The Governments marks**
  (the user, 2026-09-08, in `docs/orders-and-doctrines.md`'s Governments
  table — missed by B1 because the marks rode into W1's commit before the
  pass was diffed; found on landing B1): **War Chief** "+3 authority, +2
  combat strength · killing a unit grants +5 science and +5 culture per
  slotted Order" (was +1 strength per 2 cities, max +3); **Theocracy**
  the capital's faith gained again as science and culture at a **fifth**
  of the rate (was a tenth); **Tyranny** "+5 authority capacity. +2
  combat strength. Pillaging pays +50% and costs no movement" (was +3,
  no strength, pillaging costs movement). The Governments table's
  Signature cells become each row's `text` and the sync test pins them.
  Batch **B1b** (schema 94) — **built** (2026-09-08): the three rows carry the
  marks, the strength lines are flat and pay from the first turn, Theocracy
  tithes at a fifth, and Tyranny's raids cost no movement through one new
  behaviour rule (`freePillage`) read in `pillageAt` and nowhere else. Every
  government carries a ratified `text` — the four early chairs gained one — and
  the Signature column is that string verbatim, sync-tested beside the chairs.
  `docs/history/orders-and-doctrines-as-built.md` has the pass.
  **E4b BUILT** (schema 95, its own worktree; the Horse-Tribes' stable clause
  yielded to the user's later mark — +1 movement and +1 strength, B1),
  **E5** alone after it lands. **E1 and E2 LANDED** (8d7075a,
  59f17e8, ec73ff6; schema 87). E2's one deferral ruled (the user,
  2026-09-07: "please continue" on the orchestrator's recommended reading):
  **the benches announce their hand mutations** — a test that mutates a
  board with no command behind it calls `bumpRevision`, and `liveReading`
  keys on the revision like every other memo, the print and its re-asked
  conditions gone. So E3 runs in two halves: **E3a — the law's memo on the
  revision and the honest benches** (the 27 files E2 measured, parity the
  gate) — **built** (schema stays 87, no number and no replay moved, the
  parity fixtures byte-untouched; `livePrint`/`printsAgree`/`gatesAgree` and
  the `asked` notebook deleted, 57 bench files and 4 helpers announcing,
  `test/sim/benches.test.ts` the lint; §4c.1 of `docs/audit/evaluations.md`) —
  then **E3b — the three verbs and the files by layer** (parity the
  gate; the harness retired at its end) — **built** (schema stays 87; no
  number, no replay, no fixture byte moved): `explain`/`fold`/`read` and
  nothing else, with `test/sim/verbs.test.ts` the register and the rename
  table in `docs/yields.md`; `civYields` deleted for
  `readEmpire(state, seat).totals`, `empireRateReading` folded into
  `foldEmpireRates`; `src/sim/yields/{hex,town,empire,stages}.ts` and
  `src/sim/statecraft/{evaluator,describers,draft}.ts`, `statecraft.ts` the
  index that re-exports **by name** (a star re-export comes out empty in a
  cycle — `moduleCycles.test.ts` measured it) while the fifty-nine files
  that imported a yield from `cities.ts` name the layer; the ghost-diff
  selects a card's flats by the line's own card over steps 3, 9 and 10
  rather than by a lone step number. §4c.2 of
  `docs/audit/evaluations.md` has the tables. Open, yours to rule: **the bead
  tables open on the world's clock** (the first empire into an age turns
  its hand face up for all; the Long Count shows the next hand early) — the
  user saw Æra IV draws in Æra III and asked for them only on reaching the
  age; the three readings are in the orchestrator's message of 2026-09-07.
  **Rulings 2026-09-06, late — early production** (the user, after the
  early-pacing discussion; these supersede `docs/early-pacing.md` §2a where
  they overlap): (x) **the first column of technologies slightly cheaper** —
  the four column-1 nodes (Earthenware, Fletching, Husbandry, Mining) from
  13 to **10** beakers; the root stays nominal, every other column stays.
  (y) **Production costs ×1.25 across the board, and rising by age** ("my
  cities had way more production than things cost by age 3 … Age 3
  buildings and units should probably be ~2× as expensive"): one rule for
  every hammer price — buildings, units, wonders — **cost × 1.25^age**,
  where `age` is the band of the row's unlocking technology (a row no tech
  unlocks is Æra I; the unit trap: the band reads the tech, never the unit
  row). Æra I ×1.25 · II ×1.56 · III ×1.95 · IV ×2.44. Rows in the data keep
  their printed base; the multiplier is a **line** in the cost fold
  (`explainUnitCost`'s shape, and the same for buildings), so every surface
  that prints a price prints the fold — the build list, the tech tree's
  unlock notes, the Compendium, the arena. Purchases price off the folded
  cost (`goldPerHammer` × full cost). Projects (conversions per hammer) are
  untouched. (z) **Every figure in the top bar rounds to the nearest
  integer for display** — the yield chips and both meters; the underlying
  fold keeps the full decimal (batch X's rule; the meters' kept tenth is
  withdrawn from the bar — the hover cards may keep it). Batch **H10 —
  early production** — **built** (schema 81): column 1 at 10; one band
  `costAgeBase` 1.25 in `data/rules.json`, `explainBuildingCost` beside
  `explainUnitCost` (floor once at the fold's total), every printing surface
  and the purchase price off the fold; `netFigure` for the chips, the hover
  ledgers keep the meters' tenth; the bot's seven printed-cost reads moved
  onto the fold by the orchestrator. Tables in `docs/fewer-things-plan.md`.
  **Finding from the push gate (the bot's faith book)**: under H2's
  whole-deck pass the arena bot stops buying a prophet on its seed — no
  religion is founded in two hundred turns, though both seats fill their
  pantheon. H2 traced it to a knife-edge (no single arm restores it), and
  H10's dearer hammers sharpen it. The arena's founding claim is now a
  printed `[arena]` reading; the fix is the faith book's deferred work (a
  prophet's worth, a rite's worth, a contribution priced by the book) —
  yours to schedule with H3–H6.
  **Rulings 2026-09-07, small hours** (the user, on the H10 numbers): (aa)
  **"production costs are way too low, they probably need to be like 4–5×
  what they are now (the live deployed version)"** — the live version is
  b8a5ca2: buildings and wonders at their printed base, units at the old
  ladder ×1 · 1.5 · 2 · 2.5. **Corrected a minute later: "they need to be
  4–5× what they are now in age 4 only."** So Æra I keeps ruling (y)'s
  ×1.25 and the band climbs steeper. **Re-ruled once more, with the curve
  written out** (the user, after seeing a Library at 35 and a University at
  599 under a 1.53 ratio: "the curve needs to be fairly exponential"): the
  band is the user's **table**, not a base — `production.costAgeBand`
  **[1.25, 2.5, 4.5, 8.5]** by Æra, replacing `costAgeBase`. A row's price
  is `floor(cost × costAgeBand[age − 1])`, age = the unlocking tech's band.
  A Library (28, Æra I) is 35; a Market (59, Æra II) 147; a Workshop (69,
  Æra III) 310; a University (134, Æra IV) 1139. One printed line in the
  fold ("Æra III ×4.5"), never two;
  purchases follow the fold (`goldPerHammer` × full cost); projects
  untouched. Batch **H11 — the cost scale** — **BUILT** (schema 82:
  `production.costAgeBand` in `data/rules.json`, one fold line, dd's unique
  line beside it; `docs/fewer-things-plan.md`, "Batch H11 as shipped"; the bot
  still prices a unique at the breakeven, H12's fence). (bb) **The bot's
  faith book learns the new faith** — the ladder that spends at the deal,
  the prophet's worth (founding: the holy site's yields, the follower and
  enhancer rungs, the founder trickle, the tide), **rites valued** (a rite is
  ten turns of its blessing, priced through the same appraisal a card's
  timed effect gets, against `religion.rite.costByAge`), the apostle and the
  relic, and the free first reroll. The arena's `[arena]` founding line is
  the reading it is measured against; the claim returns to a pin when the
  book buys a prophet again. Batch **H12 — the faith book** — **BUILT**
  (`docs/bot-priorities.md`, "Batch H12 as shipped": a prophet is the best
  act it has in it — the stones, the two rungs the founding deals, the
  founder trickle over the tide's reach, with the appetite as a printed
  floor; a rite the bank cannot yet pay stays in the book and is priced for
  one town; the ladder's rung is taken off what anything else may save; the
  apostle is its relic and has an arm; the free redeal is taken below the
  bag's mean; `religion.tideShare` is the one new knob. The arena's founding
  reading goes **1 → 2** and both seats found, so the claim is a pin again.
  One finding left for you: the appetite is diluted by the tree's new beaker
  prices — under H11's costs neither seat reaches The High Temple inside 140
  turns, so the door opens late and moving `religion.prophetTechValue` is a
  tuning call the arena may not be run to make).
  **Rulings 2026-09-07 — the early-pacing doc, marked** (the user's
  marginalia in `docs/early-pacing.md`, folded in; that doc's §2c–2e carry
  the tables): (cc) **authority in the Orders — all four rows as written**:
  The Elders' Writ (chiefdom, E, ●, +1 authority capacity) · The Marches
  (Government I, M, ◆, +2 capacity, −1 happiness in every city) · The Census
  (Government I, E, ◆, +1 capacity for each **2** cities held) · the
  Doctrine **The Founders' Charter** (tier 4, +2 capacity, a newly founded
  city starts with a Monument — a founding rider that places a building; a
  new shape if none fits, deferred-and-annotated if it needs a one-off).
  The Monument's `authorityCapacity` 1 (ruling n) rides the same batch.
  **BUILT with H13** (schema 83, nothing deferred): all four rows and the
  Monument's line are data — `foundingRider.building` already existed and had
  stood unread since The Founders' Road lost its own free Monument, so the
  Charter needed no new shape.
  (dd) **The once-per-empire buildings scale in COST with the number of
  cities**, not in effect (the effect-side table withdrawn): one more line
  in the hammer fold for every `oncePerEmpire` row, **× √(cities held ÷
  `production.uniqueCostBreakeven`)** with the breakeven **4** — 1 city
  ×0.5 · 3 ×0.87 · 4 ×1 · 9 ×1.5 · 16 ×2 — after the age band, floored once
  at the total; purchases follow the fold. **H11 carries the line** (it owns
  the fold) — **BUILT** with H11 (`explainBuildingCost` takes an empire now;
  a context-less asking, the Compendium's, prices at the breakeven). And **the Imperial Throne's effect becomes +3 authority
  capacity and +1 more for every 3 cities held** (was a flat +5; rebate and
  renown stay) — **BUILT with H13**: the flat 3 stays `authorityCapacity` and
  the count is a `countScaled` on the row's own `effects`, read once per realm
  as every `oncePerEmpire` row is. (ee) **the three early science Orders as written**:
  The Tally Sticks (chiefdom, E, ●, +1🔬 in every city with a Monument) ·
  The Scribes' Hall (Government I, E, ◆, +1🔬 for each 3 citizens in every
  city) · The Lamp Kept Lit (Government I, W, ○, +25% 🔬 in the capital
  while slotted). **BUILT with H13**: three data rows on standing shapes
  (`hasBuilding` scope, `population` per 3 `within: 'city'`, a capital-scoped
  `percentYields`); all three read as *payoffs* by the doc's derived Role
  column rather than as the engines §2e hoped for. Batch **H13 — the wide-play
  rows** built cc, ee and the Throne (schema 83); **H14 — the rerolls and the
  buttons** (rulings q, r) follows.
  **The audit's queue, kicked off** (the user, 2026-09-07: "lets kick off
  the rest of the queue (H3–H6)" — no markup on `docs/audit/orchestrator.md`;
  the fix-queue rows as written are the spec). Order, by collision with the
  batches in flight: **H3** (the great-person draft the cards promise, the
  six empty cards get their bead shape) starts now beside H11/H12/H13;
  **H4** (dead weight) starts with the next gate — its deletions run
  through every file the live batches hold; **H5** (one modal shell, the
  helpers into leaves) after H3 and H14 settle the offer surfaces; **H6**
  (one evaluator — luxuries as cards) alone and last, byte-identity over
  the acceptance games being its gate. **H3, H4, H5 landed** (main 55027c6 ·
  4d479e3 · 1597f7b). **H6 landed** with one line drawn: the luxury
  vocabulary is the cards' (yield bag, scope, rule union, three interfaces),
  the four flag-rule kinds are one `rule`, the bead and Triumph occasions
  are one union (`occasions.ts`), five private town walks are `citiesOf` —
  but a luxury is **not** a card class (`resourceEffects.ts`' docblock says
  why: fourteen folds whose flooring differs, a `CardId` widening — a
  milestone with its own gate, yours to schedule if wanted). Identity held
  byte for byte on four boards; schema 85. The audit's queue is closed.
  **H3 BUILT** (schema 84): the three signature clauses have a surface — a
  rail of **calls** at the foot of the Reliquary, one control per purchase
  the empire's law opens, priced and refused by the simulation's own
  (`reliquaryCalls`; an accepted call closes the sheet and deals the tarot
  hand). And the four Æra V bead Orders pay at last, on **one** new shape:
  `beadPerOccasion` mints a grant bead of the empire's own on a last-age
  deed, hooked at four seams — `settleResearch`, `settleOrderSkip`,
  `razeCityAt`, `proclaimAt`. `awardBead` is still the one writer of the rod;
  the four bead rows carry `repeatable`, which gives up the grant class's
  once-per-empire key and nothing else. **"The last age" is Æra IV**, read
  off the chart (`LAST_TECH_AGE`) rather than written as a numeral — Æra V is
  designed and has no nodes, so The Great Enquiry counts nodes of the fourth
  today and of the fifth the day one belongs to it; "earned only there" is
  `OrderDef.fromAge` on the deal (item l) and no second gate. **A
  correction**: the audit counted six empty cards; only four were ever dealt.
  Religious Mandate and The Closed Realm are tier-0 Doctrines, which
  `poolDoctrines` deals from never — they are already out of every bag, and
  marking them `retired` would say the wrong thing about a row that was never
  dealt. They stay parked until their shapes exist.
  **H4 BUILT** (no schema — nothing a save holds moved): `src/proto3d/` and
  `proto3d.html` deleted with their build input, so CLAUDE.md's "eight root
  pages" is true by counting; the schema changelog's entries 3–v78 moved to
  `docs/history/schema-changelog.md` behind a five-line pointer (−1432 lines
  from `state.ts`); 28 exported symbols nothing read deleted; four dead CSS
  rules and `beads.rules.startingDice` gone; nine false statements corrected in
  CLAUDE.md, `docs/design-notes.md`, `data/triumphs.json` and four docblocks;
  ten folded working docs moved to `docs/history/` and `veins.md` to
  `docs/deprecated/`. **One finding of the audit's does not hold**: retired row
  bodies **cannot** be trimmed to `{id, name, retired, note}`. The Compendium
  walks `ORDER_IDS` and `DOCTRINE_IDS` **unfiltered**, so a withdrawn card is
  still printed in full — which is exactly what `OrderDef.retired`'s "never
  dealt, and still fully readable" promises — and `BuildingDef.retired`'s own
  docblock keeps a standing copy's yields live. The ≈1000 JSON lines the audit
  costed are load-bearing; the two docblocks now say so out loud.
  **H5 BUILT** (no schema — structure only, no number and no word moved):
  `src/ui/modalShell.ts` is one frame under **eight** of the ten full-screen
  sheets — Statecraft, Religion, Trade, Diplomacy, the Ledger, the Reliquary,
  the Bead table and the Compendium — carrying the contract they each kept a
  copy of (`hidden` is the whole of the screen state, three doors into one
  `close`, Escape capturing on the window, the keyboard to the × and back to
  the trigger, the disposer into `gameDisposers`). It settles the four ways the
  copies had drifted: the ground-press is `mousedown` everywhere (a `click`
  also fires when a selection dragged from inside the paper is released past
  its edge), every sheet hands the keyboard back, `open` on a standing sheet
  repaints instead of re-running the HUD's shut-everything hook, and every
  sheet empties its body on the way out. **The star chart and the Abacus stay
  off it**, stated rather than forgotten: both size a stage after `hidden`
  clears, both give the keyboard back to whatever had it rather than to a bar
  control, and both claim Escape on the overlay precisely so the same handler
  can swallow `T`/`A` before `controls.ts` reopens what it just shut. The seven
  duplicated helpers are one each — `ui/dom.ts` (`element` ×23,
  `requireElement` ×5, `withArticle` ×2), `ui/motion.ts` (the reduced-motion
  query ×8 under two names), `yieldFormat.signedPlain` (×3), `ai/decision.ts`
  (`round`/`round1` ×6, `signed`), `ai/ground.ts` (`hasFoundedReligion`), and
  `test/ui/sourceHelpers.ts` for the suites' own `source`/`between`/brace-body
  readers — plus `yieldMark.yieldElement`, the deliberate second builder for
  the three panels that print composed figures. The capped-overlay rule is the
  paper's class now instead of eight ids repeated in five places, so a ninth
  sheet is capped by wearing `.statecraft-overlay`. **One finding does not
  hold**: `validateTable` ×4 is a shared *name*, not a shared implementation —
  the four bodies are entirely per-table rules and a generic would cost more
  than it saved. Two things fixed on the way: Statecraft, Religion, Trade and
  the Abacus were disposed by name in `showLanding` and by nothing in `boot`,
  so a save loaded straight onto a board leaked their listeners and the
  Abacus's WebGL context — all four are in the register now and nothing is
  disposed by name; and the bot's free belief-redeal arm is gated on the belief
  hand's own facts, with the "a heavier hand is on the table" clause kept and
  documented as a guard rather than as the gate (the verb redeals the heaviest
  hand, so sending it with a Doctrine standing would buy a Doctrine redeal for
  faith — and holding costs nothing, because `firstBlocker` puts the Doctrine
  first and the bot answers one blocker per step, so the free asking is still
  free on the next).
  Two findings from the re-aim, yours to rule:
  1. ~~The rite door is a lottery~~ — **my misreading, corrected**: the
     user's ruling was always "unlock rites in the tech tree where they used
     to be"; C2's Chapel gate is removed (the tree is the only gate; the
     Chapel keeps its culture-on-a-rite bonus). `religion.slow` re-aims
     once more to town rites.
  2. **Game length.** The scripted five-town empire closes Æra IV at t999
     (was 779); the one-city seat opens the Opus at t3959 (was 1689). Your
     own game runs 3–4× the bots' pace, so this is a harness reading, not a
     verdict — but "ends around the close of Æra IV" wants the next
     playtest's number.
  3. **The purse is under water.** The five-town harness crosses zero gold
     near t90 and ends at −22,000 by t900; the one-city seat near t900. The
     debt rule's quarter off science and culture is most of the late slide.
     The Library's gold left, Markets lost a coin, and no scripted empire
     buys or disbands. The bots stay solvent; you were +143 at t92. Worth a
     look at the coin side before the second playthrough — the Bank's per-
     citizen line and the Counting Houses are the deck's answer; the tree
     has none. One gate per batch; one schema per batch that
  changes a save (71 → 75). The play checkout on :5199 stays where it is.

- **H18 — the performance pass — BUILT** (the user, 2026-09-07: "could you do
  a performance pass on the game? I think it's starting to feel slow again.
  The Reliquary in particular is very slow."). Measured on a 150-turn
  `standard` board, two bot seats, five towns — the readings the interface
  takes per open and per accepted command. Nothing changed a replay: the
  `snapshotState` hashes at t50 / t100 / t150 are byte-identical before and
  after (`5d387bca` · `a96f27b7` · `d9e00cbf`). Four fixes, in order of
  ms × frequency. **The Reliquary asks the ledger for one card, not the
  whole pile**: the roll built a full face for every legacy on every draw and
  on every press of an arrow, and each face is a ghost-diff pricing every
  town twice — six legacies cost **81ms a draw, now 0.05ms**, with the one
  face-up card's figure asked separately (12ms for the whole draw) and
  remembered under `(the state object, game.log.length, the seat)`, so
  walking back through the pile is free; a struck legacy is no longer priced
  at all, its figure having always been thrown away for the flourish.
  **The knock-on ladder is not walked when the card moved neither meter**:
  three of the seven empire-wide town sweeps one stamp paid for were
  reporting three noughts — a card stamp **13.1ms → 9.6ms**. **The empire's
  card fold takes its rate reading lazily**: `empireRates` prices every town
  and only a `rateConversion` card reads it, so it is handed in as the
  *taking* of it — the top bar's headline now sweeps the meters once for a
  twelve-town empire instead of twice, and the same 150 bot turns ran 42.0s
  → 39.4s. **A screen of cards shares one reading of the real board**
  (`cardImpactSheet`, lifetime one draw): the Statecraft sheet's nine stamps
  **120ms → 55ms**, and the Religion sheet keeps the same bargain. Left alone
  and reported: `runEndOfTurn` is 85ms (collectYields 27 · barbarians 27 ·
  beads 15), and the bots' own thinking is **790ms a turn** at t150 — an
  order of magnitude more than the resolution, and the real answer to "the
  turn takes a moment". No sheet computes while hidden today: all eight
  `modalShell` screens gate `refresh` on `isOpen`, the Abacus only marks
  itself stale, the Compendium builds once.

### In flight earlier (2026-09-05, evening)

- **Æra III** — LANDED (schema 70, committed, in the push-gate queue). Three
  strokes for your eye from the build: (a) **Imperium's +3 authority is cut,
  not moved** — the ruled table had no authority clause and your Hegemony
  bracket dropped the capacity ladder, so the war path is 3 capacity poorer
  across this pass; (b) **"captured cities cost no authority" ships as
  costing 1** — `cityCosts` floors a captured town at one point by design
  (so stacking cards can't make conquest free); zero needs the floor
  lowered, one line on your word; (c) **Hegemony's capture bonus ships as
  +5% production for 10 turns** (the Triumphal Way's duration) — your
  bracket named no length.
- **Batch 9 — the late-game cost** (`docs/bot-priorities.md`) — LANDED,
  target not met: a 100-turn standard game 321s → 73s (t76–100 5×),
  byte-identical to t75 on six acceptance games. Two thirds of the old cost
  was ONE turn: a seat live-locked on research (392 re-aims in a turn,
  alternating two negative chains) until the command budget cut it off —
  bounded by `driver.reaimsPerTurn` (1). What is left is sim-side, not the
  bot's: `effectsOfKind` rebuilds the whole `liveEffects` list per query
  (115k–179k calls a turn for at most two distinct answers) — a hoist for a
  statecraft batch, next. Also queued: a warning when a seat exhausts its
  command budget, so the next live-lock is seen the turn it starts.
- **Batch 10 — the evaluator remembers** — LANDED: `liveEffects` memoised
  per seat on a value print of its inputs (a source register pins the two in
  step); 82s → 43s on the 100-turn game, seven hash pairs identical.
- **Batch 11 — the focus arm holds its word; the levy counts field
  soldiers** — LANDED (`docs/bot-priorities.md`): the border curve exposed a
  town being re-pointed 40+ times in one turn (a staged food total patched
  by a raw tile difference; a stale seat count the turn after growth; the
  board moving mid-turn) — fixed by construction, plus `BotSitting.focused`
  as the bound. And a seat with three scouts and one warrior read itself as
  half-levied, so a column at the gate lost to a worker by a third of a
  point — `isFieldSoldier` (combatant, not explorer, not naval) is now the
  one predicate the levy and the mix ask. One written-down gap: the focus
  arm has no incumbency margin, so a lean near zero can flip on consecutive
  turns (never twice in one).
- **The push-gate**: main on GitHub is at the re-aimed fixtures; everything
  since (border growth, the consecration line, camp cadence, civilian
  capture, the bot batch, the balance-turn doc) pushes on the running
  all-tier gate. The play checkout on :5199 stays frozen at the victory
  commit unless you say otherwise.

### From the first full playthrough (2026-09-05, live notes — queued as they arrive)

**Standing rule while the game is live**: nothing writes to the play checkout
(`/tmp/webciv-play`, :5199) — a file change forces a reload on the player.
Fixes queue in main for the next session unless the user says otherwise.


1. **Worker menu shows only what the ground accepts** (RULED): rows appear
   only where the hex's terrain/feature/hills/seam would take them — a city
   tile shows none, a silk hex shows the plantation alone — greyed only for
   empire/unit reasons (the tech, movement, charges) with the reducer's
   sentence. Implementation: a `groundError` reading in `improvements.ts`
   (the clauses before the tree's gate); the panel filters on it and greys
   on the full error. Lands after the Æra III agent frees the file.
2. **Yields never hide names** (RULED, in flight): The Founding Oath's six
   marks per row cut off building and wonder names in the add-list — the
   name always shows in full, the yields line truncates.
3. **An "All" tab on the add-list** — LANDED (cherry-picked onto the play
   checkout, save-safe).
4. **The tile readout bottom-right under the city mode** — LANDED, same.
5. **"Has produced" on order cards** (RULED): the stamp design's phase 2 —
   a lifetime tally per owned order, per voice, written by `collectYields`
   from the card's own breakdown lines (the growing cards' tally register
   is the shape), printed on the face as "has produced". Schema. Lands
   after the perf agent frees `cities.ts`.
6. **Doctrines wear the stamp** — LANDED. (Governments' charter block is
   prose, not a card, and "without your government" has no reading — a
   design ruling if you want a figure there.)
7. **Charter cards describe their building** — LANDED: the unlock clause
   composes the building's own describer at print time ("unlocks the Chapel —
   +1 faith; a rite performed in this city pays +5 culture"); the compendium's
   building entries read the same sim-side describer. (The Assembly Hall's
   capital-only gate stays on the compendium row, not the charter face — a
   third scope vocabulary otherwise; say the word if you want it on the face.)
8. **The Library's +2 gold** — REMOVED on your word (it had been on the row
   since the tree pass of 2026-08-30). **A side effect for your eye**: a
   library now costs its maintenance and pays no coin back, and the scripted
   five-town pacing empire (a library in every town, nothing else paying
   coin) crosses into debt around turn 90 and never climbs out — the debt
   rule docks science and culture a quarter from then on, so its Æra III/IV
   closes slipped ~90/105 turns (fixtures re-aimed, dated). Your empire at
   t92 is +143💰 and the bots stay solvent in the arena, so no action — but
   the balance turn's building trim should keep an eye on the coin side.
9. **The Ledger** — bands 1–2 LANDED (the eighth sheet; every yield chip but
   culture's opens it on its own voice; this turn's yields by source class
   with the deck's slice in grape, and the per-turn curve since the game
   opened, era ticks on the axis, page memory only). Band 3 ("has produced" —
   the lifetime tally per owned order, schema) follows the moment the perf
   agent frees `cities.ts`. Two data collisions the sheet found, yours:
   `theEncyclopaedia`, `theTithe`, `theStandingArmy` are Doctrine ids AND
   bead-row ids; `theTurningHeavens` is a building AND a bead grant — the
   id spaces are meant to be disjoint. Worth a browser look (no jsdom here).
10. **Religion cards join the ceremony** — LANDED: every class deals a full
    tarot face and flips (orders, charters, doctrines, great people already
    did; beliefs were the plain one — now their axis glyph sits on the plate
    and the eyebrow says "a god / a follower belief / an enhancer belief");
    standing faces stay compact and wear the landed stamp. Found and fixed on
    the way: a follower belief's stamp counted every town as keeping the
    faith (8 culture printed where 4 was true).
11. **The great-person gate moves to Epic Poetry** — LANDED (one JSON row:
    `ancestorRites` off The High Temple, onto Epic Poetry; renown answered
    too early, and the poets keeping the roll of names reads better than the
    temple). The queued `techDoc` sync is the only ripple.
12. **A worker may remove an improvement for free** (BUILT): a
    `removeImprovement` verb on the worker (builder units) that tears out an
    improvement on ground the empire owns, spends **no charge**, and pays
    nothing — the opposite of pillage, which is a raider's verb on foreign
    ground. It costs the worker's action for the turn like a build does. The
    hex goes bare (the monotone suppression rule: bare ground stays bare on
    the board, as after a pillage). No refund, no yield, no toast beyond the
    ordinary refresh; the tile's yield refreshes at once (register entry 22).
    The road stays: a raid takes the road up with the farm because a raid takes
    what has been built on the hex, and this is not a raid.
13. **The build queue is cut off once it is long enough to scroll** — FIXED
    in main (cause: note 4's readout, moved to the bottom-right corner, stood
    on the work rail's own footprint, so a queue long enough to reach the
    bottom of the screen vanished under the hex readout whenever a hex was
    hovered). The readout now sits clear of the rail — bottom edge, just left
    of it — at both rail widths. The rail itself scrolls as it always did.
    Your play checkout carries the old placement until the next session.
14. **End Turn holds the button down while the bots think** — LANDED: the
    press is two halves. Click → the button raises on its own frame and
    reads "The others are moving…" (disabled, raised, not the spent plate) →
    a frame and a timeout later the bots are driven → the turn advances with
    the three beats as before. ⏎ goes through the same press. One stated
    gap: a soft statecraft-pause press wears the working state for one frame
    before its card goes up. (The pause itself shrank 8× with batches 9 and
    10; the play checkout still runs the old bot unless you say otherwise.)
15. **Monasteries need a rework** (NOTED, no action yet — your call on the
    shape when you're back from the game).
16. **Players spawn too far apart** (NOTED, no action yet): try **six players
    on the standard map** as the next playtest's seating before touching
    `data/mapgen.json`'s start-position spacing — the same map with more seats
    is the cheaper experiment.
17. **"I'm just building more buildings in my cities"** (NOTED — a reading
    for the balance turn, `docs/history/loop-review.md`'s direction: cards carry more
    of the empire's power, building flats −25%). Your turn-92 snapshot, six
    cities, for the ledger:

    | food | prod | gold | science | culture | faith | happiness | authority |
    |---|---|---|---|---|---|---|---|
    | 211 | 131 | 143 | 200 | 195 | 59 | 28 | 6 |

    Against the bot at t75 (science 28–63 a seat, 3–5 towns) this is the
    3–4× gap the audit measured, now with a turn number on the human side.
    The balance turn's numbers are still yours to rule.
18. **An Æra II cavalry unit** (NOTED for the future, no action): the mounted
    line has no rung in the Age of Heroes. A row in `data/units.json` with
    its tech placement (a chart question — the lanes are yours) and an
    escalation ladder; joins `pieces.html` in the same pass. Needs a
    strategic (horses?) ruling — the seam is the resource row.
19. **Border growth +25%** — RULED and LANDED (your playtest, t92): the
    border cost curve's two height terms take a fifth off (6 · 4 · 1.45 →
    5 · 3.2 · 1.45; the exponent keeps the 2026-08-28 shape), so every tile
    costs ~80% and the same culture buys a quarter more ground. Schedule
    5 · 8 · 13 · 20 · 28 · 37 · 48 · 58 against 6 · 10 · 16 · 25 · 35 · 47 ·
    59 · 73.
20. **Mapgen: every capital has both horses and iron within six tiles**
    (RULED — "note for mapgen"; **BUILT 2026-09-06**, batch H9, schema 79):
    a start-position guarantee in `data/mapgen.json`'s terms —
    `resources.startStrategics: ["horses", "iron"]` and
    `startStrategicRadius: 6`, the fourth fairness pass
    (`ensureStartStrategics`), rolling no dice, nearest legal hex, giving up
    `minSpacing` rather than the promise and never the row's own terrain
    filter; the seat's reveal tech still gates seeing it. Measured over five
    seeds and the maximum twelve-seat roster: **no seat short at any size
    from `standard` up**. The chooser gained a seventh hard rejection for a
    site the ground cannot arm (`strategicGround`) — unreachable on the
    standard sheet, firing only on `duel` seating twelve. See
    `docs/mapgen.md` "The four guarantees" and
    `docs/fewer-things-plan.md` "Batch H9 as shipped".
21. **A city's consecration is printed nowhere after the toast** (BUG, in
    flight): the cathedral's roll lands on `City.consecration`, is announced
    once, and no surface names it again. The Built row (the town rail's
    standing facts) prints it under the Cathedral — "consecrated to the
    Hearth Mother" with the consecration's own clauses from its describer,
    as a keyword ref into the compendium's consecration entry.
22. **Archers capture civilians on right-click; today they shoot them** —
    LANDED: a hex holding only foreign civilians is taken by walking onto it
    (the one capture seam), for every combatant at war with their owner;
    right-click there is a move, the red tint and the fight card stay off,
    and the reducer refuses the shot ("A Settler is taken by walking onto
    it, not shot at" — a laden caravan "is plundered by walking onto it").
    A civilian beside a soldier is shielded as before; an embarked worker is
    still shot (nothing can stop on its hex). One follow-up, queued: the
    **wild's ranged thief** now has its blow refused where it used to kill
    the prey — the worker survives, so no regression, but the coherent fix
    is one line in `barbarians.ts` (the thief marches onto the hex, which
    the widening made legal).
24. **The bar's authority meter is cut off once the yields grow** — LANDED:
    the strip measures itself (scroll width against width — a container
    query cannot see *content* grow a digit) and takes the first of two
    smaller steps that fits (12.5 → 11.5 → 10.5px figures, gaps closing
    with them), re-measured on resize and whenever the printed figures
    change, stepping back up when a figure loses a digit. Meters step with
    the yields; chips stay buttons; every figure tabular mono. Not eyeballed
    live (no browser in the session) — a narrow-window drag on a running
    game is the quick human check.
23. **Barbarian camps refill too fast** — RULED and LANDED (your playtest,
    t92: "once you kill the barb standing on the camp, it respawns very
    quickly"): a camp musters a unit every **five** turns, not three
    (`barbarians.unitEveryTurns`). The camp-founding faucet (three camps
    every two turns, cap 24) is untouched — the complaint was the refill,
    not the count. If the wild now reads too thin, the faucet is the next
    dial and yours.

### RULED, awaiting build (after the playthrough)

- **The victory rule** — BUILT (schema 69): 20 beads open the door,
  completing the Great Work wins. One loose end: `src/ui/victoryModal.ts`
  still frames the win as "the frame is full / N of 20 beads" — true but
  reads bead-decided; a wording pass owed.
- **Æra V is acceleration, not content** — DEFERRED until you have had an
  empire reach Æra IV ("i'll need to feel out the pacing for what makes
  sense for age 5"). The game should end around the close of Æra IV; Æra
  V's rows become victory accelerators (Opus cost cuts, bead purses,
  tempo). Nothing Æra V is built or re-cut before then; Gov VI stays
  proposed.
- **The world age** (`docs/history/age-three.md` §4, your marginalia): the counter
  is the **MEAN age of all players including bots** — "for single player
  campaigns, it should punish you if you're behind the bots." The laggard's
  cost is the point: the wild's tier follows the world age, and a trailing
  human pays rather than catches up. Minimal shape after the playthrough:
  the ceremony → the wild's tier → the cost of trailing.
- **The age scoreboard + clock** — DEFERRED ("an easy fix that we can add
  after playtesting"); the world-age ceremony is its natural home.
- **A wolf in the default game** — RULED, queued: the warmonger seated by
  default, balanced bots less gentle (`war.declareThresholdPeaceful` 4.5 is
  the dial). Lands when the bot is judged threatening enough to seat.
- **Camps** — DEFERRED on the bot side ("a smaller concern"); a player-side
  Wild Hunt payoff (The Wolf-Standard) is deferred on the row until a camp's
  bounty can have more than one destination.
- **The engine view** (`docs/history/loop-review.md` §3, the Ledger) — bands 1–2
  are a UI batch with no sim change; band 3 wants the lifetime tally
  schema. Not yet scheduled.
- **The balance turn** — RULED in direction 2026-09-05 (turn 92 of the
  first playthrough): **orders get more powerful, everything else is nerfed
  a little** — "the orders don't feel very consequential currently outside
  of a few of them", and **the Æra III orders most of all** (the fork is
  meant to be the power spike). Earlier half of the same direction stands:
  ordinary building flats −25%, cards carry more of the empire's power.
  **Numbers not yet ruled**: `docs/balance-turn.md` — DRAFTED, awaiting
  your markup: every order weighed against the turn-92 reading (note 17), a
  diagnosis, a proposed column per pool, the nerf side, and the decisions
  only you can make. Nothing under `data/` moves until you mark it. Three
  findings from the audit worth reading first: (a) **eighteen live rows pay
  nothing** — the happiness tier clamp caps the bonus at the +10 rung and
  your empire reads 28, so every pure-cheer clause is dead; (b) faith is
  the smallest voice, so the same shape pays a fifth of faith and a
  thirtieth of science — the faith commons audit as the strongest cards by
  accident; (c) Æra III is not a spike because the *shapes* don't change at
  the fork, and Gov IV audits below Gov II. The −25% on building flats
  touches science not at all (science lives per citizen). **Entry LIV's supply trim** rides with it, deferred on your word:
  happiness and authority relief should live in cards, not buildings, so
  tall-vs-wide bites.

### Scripted harnesses — RULED 2026-09-06 ("can we stop using scripted bots for measuring changes")

- The scripted-empire harnesses (`tech.slow`, `statecraftPacing.slow`,
  `endgame.slow`, `beads.slow`, `religion.slow`) **report their figures and
  assert only machinery** (the ages close inside the horizon, the chart runs
  out, a draft is dealt, a faith is founded, a replay is byte-identical). No
  band, no re-aim after a pass. Pacing is judged by the user's playtests, as
  the 2026-09-04 ruling below already said. A batch that moves a figure
  prints the new one and says so in its report; nothing blocks on it.
- The bot arena (`aiBot.slow`, `aiDecision.slow`) is a real bot, not a
  script — its solvency and coverage claims stay.

### Pacing — RULED 2026-09-04 (your marginalia)

"The bot is a bad indicator for actual play… later eras feel too _fast_…
outrageous costs later in the game as part of the skill test. For now, only
look to my playtests as the source of truth." The harness findings are
closed as questions; no pacing knob moves on bot evidence alone.

### Open singles (still yours)

- **Gov VI** — no rung past tier 45; needs a seventh tier or another gate
  when Æra V's shape is decided (deferred with it).
- **The Harvest Songs re-cut** — ships as 10% of food yield, not surplus
  (the surplus reading is circular with the growth percents); say if the
  percent should drop.
- **The Guild Compact** (Gov V, built) ships its production-percent half;
  the Engineer-family renown feed per building is struck (no per-building
  family feed exists) — a shape decision if you want it back.
- **The Tide-Reckoning** (sea routes +50%) — deferred whole: a route's
  MODE is not readable by a card today; one small shape if wanted.
- **The Murmuration** (religion spreads along routes) — stays a proposal; a
  new pressure shape is a design decision for a calmer day.
- **`site.newLuxuryBonus` under the uniqueness reading** — re-swept 2026-09-05
  (14 and 21 both positive, 28 collapses); sits at 14. Sweep again after
  the playthrough with real seeds.

### Standing small items (earlier passes)

- **Settler discount** — "50% faster" ratified; shipped −33%. Confirm or
  move to −50%.
- **Temple** — −25% foreign-pressure defence semantics (was −50%).
- **`redraftBeliefs`** — kept through the faith rework; keep or retire.
- **The Sea Peoples** — waits on a plundering-costs-no-movement rule.
- **The Mint (Æra IV row) vs the Coinworks** — two gold-culture buildings
  now; reconcile at the balance turn.
- **Inquisitor badge** — wears the augur's candle; own art owed.
- **Rite windfall toast** — a rite's hammers can complete a wonder with no
  toast (`RiteResult` gap).
- **The Banner line has a card but no drawn mark** — The Banner-Call flies
  `forge` because `CardLine` is a closed union with drawn marks; adding 🎖
  is an art pass.

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is
the source. Regenerate with the scratchpad dump after any data pass. Your
ruling 2026-09-04 stands: every deferral stays; anything relying on a
removed system was re-cut with the levelling axe.

**Orders** — Triumphs (renown grant: a windfall's grants can't reach the
renown ladder) · Sanctuary (sacking doesn't exist; retired) · The Escorted
Roads (route safety is placeless) · The Dry Docks (heal-in-port is a hex
rule) · The Wolf-Standard (a camp's bounty has one destination) · The Far
Charts' second half (route reach off sightings is a `trade.ts` rule) · The
Tide-Reckoning (route mode unreadable) · the late-pool strikes (King's
Road's roads, Siege Train's adjacency, Patrons'/Guild Compact's/
Manufactories' family renown, Court Astronomers' wonder bounty, The
Consistory's rite duration, Forced March's penalty, Admiralty's embarked
defence, The Salon's renown price, The Silk Exchange's imported luxuries,
The Inquisition's temple-less penalty, The Magister's Court's second charge).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter's founded-with-Harbour half · The
Renaissance Court's stronger-legacies half · Absolutism's longer-seal half ·
Blitz (retired to proposed — no stock half) · The Philosopher's Stone's
Distillery half · The Closed Realm (both — parked tier 0) · The
Horse-Tribes' flat-ground and stable halves.

**Governments** — The Curia (+3🕯 per Cathedral).

**Techs** — Epic Poetry (verse sized by the fallen piece) · Kingship (the
King List needs founding turns) · Paper Money (the Bourse spends gold) ·
Empire-Building (capital-mirror hammers) · Colonial Charters
(distance-priced authority) · Castellany (anti-ranged defence line) ·
Fortification (walls that mend).

**Resources** — Ivory (war elephants; hammers toward a category) · Lapis
(renown ruling).

**Wonders/buildings** — Terracotta Army (born strength) · Statue of Zeus
(+15% vs cities) · Notre-Dame (Cathedral culture) · Forbidden City (an
Order slot) · Alhambra (born fortify bonus) · Water Clock (the chime
cadence) · Shipyard (ship-only discount) · Printing House (routes paying
the destination) · Observatory's mountain sight clause · Bank
(routes-ending-here count) · The Cistern's fields half (a building waters
its town, not its hexes) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength) · Dinocrates (a wonder-occasion legacy).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third
way to press).

**Numbers to tune (v55)** — Stele of Laws (50⚙, worse per hammer than the
Monument) · Stone Walls (55⚙) · Workshop (net −1 late vs the old renewal
path) · Floating Gardens (+1🌾+1💰; the lake half waits on lakes being
standable — a movement ruling; pit lakes now exist on big maps).

## C. Open threads

### The tedium thread (2026-09-06, the user's overriding impression of the first playthrough)

"Many of the mechanics felt tedious — so many buildings with similar effects;
I never wanted to invest in my chapel because I was so far ahead and didn't
want to waste time paying for augurs and using them in my cities. I couldn't
notice where the surveyable mines were in my territory." Three threads, no
rulings yet:

- **Buildings**: too many rows that are a flat with a different name. The
  balance turn's building trim is the wrong tool for this — the fix is
  *fewer* buildings, each a shape (a per-citizen line, a percentage, a
  district-like condition), with the flats folded into cards. Proposal owed:
  a cut list per age, with what each surviving building is *for*.
- **Augurs and rites**: a unit bought with faith, walked to a town, told to
  perform a timed rite — value per click too low, and worthless when ahead.
  Candidate shapes: rites become a city verb paid in faith (no unit; the
  Chapel is the door), or the augur folds into the prophet and rites into
  consecrations/beliefs (passive faith). The Chapel then has to be *for*
  something the leader still wants.
- **Veins**: the surveyable hills are invisible — nothing marks a hex that
  `prospect` would answer. Candidate: the lens (or the worker's reachable
  highlight) marks prospectable hills once the tech is held; or a survey is
  automatic when a worker rests on the hex. Small, and a UI ruling.
- **Bigger, rarer choices; cards that combo** (2026-09-06, the user): "I
  ended up with generically strong orders across the board, it didn't feel
  like the cards had synergy with each other… the faith-oriented build
  didn't make me really change how I played… I almost feel like we need to
  include a proportion of cards that don't really do much on their own, but
  combo nicely with other cards." Direction, not yet numbers: the deck gets
  **engines** (weak alone, read other cards by tag) and **payoffs** (scale
  with what is slotted beside them) beside a smaller share of standalone
  flats; a path (faith, war, trade, growth) has to be a different *engine*
  for the primary yields, not a side dish. `docs/history/fewer-things.md` — DRAFTED,
  awaiting your markup: the choice-size ladder, 38 → 19 buildings per age
  with a clause each, the augur options (recommends A split by act: rites a
  city verb, the augur a rare consecrator), the engine/payoff/standalone
  shares (25/30/45 — standalones are the fuel), one required new shape
  (`slottedOrdersOfLine` — the twelve `CardLine`s already on every row,
  switched on as a readable tag), and the finding that supersedes
  `cards-pass-2.md` §E.3: the draft cadence is NOT the problem (20 drafts by
  t92 on your own culture curve) — fewer, bigger drafts (`costExponent`
  2.25 → 2.8 with chairs down a quarter) is the coupled proposal. Largest
  bot debt: the draft plan prices cards alone, so it can never draft an
  engine — a marginal reading `V(deck ∪ card) − V(deck)` is the fix.
  **Rulings from the markup (2026-09-06)** — `docs/history/fewer-things.md` §7:
  the engine shapes are the user's five (amplifier by voice over card yields;
  building-yield percent by category; a "yields X" tile test; a periodic
  occasion with its own period-shortener; the slot-position reader — **slots
  are ordered as drawn, the topmost economic slot is the first**); lines stay
  drawn marks with three readable (War, Faith, Trade); **an unconfirmed card
  in a slot shows no yields — Confirm locks it and the aggregate fires**
  (the count-up is the scoring moment); **faith replaces the Magister's
  dice** — the dice go entirely, a faith reroll of a draft costs by age and
  by rerolls so far, printed as the rising price it is; the prophet's
  empire-wide rite is one of the five city rites cast everywhere; the
  apostle and a relic (faith per turn, once per cathedral) are faith's
  "magisterial supplement" ideas, open; buildings keep prerequisite chains.
  **Third pass (2026-09-06)** — every open item answered, folded into
  `docs/history/fewer-things.md` (§6 is the record): all twelve lines readable;
  cadence 2.8 and chairs down a quarter incl. Gov IV/V; ten chains; the
  Chapel pays culture on a rite (no gate — the tree is the only gate); the Cathedral keeps its roll; Court Augurs
  renamed to pay every city with an active rite; grants ignore chains; the
  faith ladder shaped like the augur's old prices; reroll from 35 faith at
  a slight exponent, prophets free; the apostle's third act is the relic;
  the base beaker halves and science moves into orders (the next playtest
  calibrates); three projects (production → gold / science / culture);
  veins marked, with hidden unique minerals. **Still open: the rites' faith
  price and per-city seal** (a default is proposed there).
  `docs/history/tech-gifts.md` — MARKED UP and folded (2026-09-06): **unique
  buildings, once per empire, as each age's anchor** (Heroic Epic · Imperial
  Throne · High Temple · Forum · the Caravanserai returned as the route hub;
  priced at half a wonder of the age; effects city-scoped bar the Throne's
  authority); the nodes' own gifts as the user wrote them (Movable Type's
  connected-city percents, Machinery's roads at a fifth, The Silk Road's
  endpoint luxuries, Horology's two periodic figures — "bursts are strong");
  the apostle at Theology; eight small shapes beside fewer-things' ten.
  `docs/history/orders-pass-3.md` — MARKED UP (2026-09-06), folded in its §9: the
  grammar is **put yields on a thing, then multiply the thing** (routes,
  Markets, the capital, great works, faith buildings — multipliers late,
  rare, applied last); **line readers withdrawn** for Orders (slot-flavour
  counts stay — CONFIRMED; `CardLine` is a drawn mark only); amplifiers stack additively; early pools
  lean standalone; periodic conversions (science↔faith↔culture, gold→science)
  as bursts; the cheer rows kept and the clamp left as is until the next playtest; the shrine engine tallies faith rerolls;
  four Gov V "just win now" bead Orders. All four questions in §9 answered. And
  `docs/deprecated/veins.md` — **SHELVED on your word (2026-09-06)**: the layer was
  unreachable for most of a game (its gate an Æra IV node) and a survey is
  the small frequent click this pass removes. `veins.share` is 0 (the last
  mapgen pass — every seed's ground stays bit-identical); the verb stays
  greyed by the tree; Geomancy keeps its mine line. In the drawer: the rare
  minerals as tech-revealed surface luxuries, no verb, when wanted.

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty — RULED into context**: the bot is not a balance baseline
  until significantly improved; playtests are the source of truth. The
  arena (`arena.html`) and the grid search (`scripts/gridSearch.ts`) are the
  instruments; the OFAT baseline needs re-running after the playthrough's
  tunings, on real seeds.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted; a wounded piece deep in enemy
  fields does not retreat; purchases don't read the unit mix; warscore
  wants a loss register (schema); the route reading under-reads a caravan
  (`score.caravanScale` 3 is the stand-in — the road's march and the
  destination's growth are the missing terms); naval is a hard null; the
  war economy's baselines sit outside the currency; the bot's culture plan
  prices drafts but a pass never conditions on the hand it just saw.
- **The opening build order, yours** (was `docs/flags.md`, folded here
  2026-09-07 by batch H4 — two lines are a flag, not a doc): *"ai needs to
  prioritize early scouts"* and *"my general build order is scout settler
  settler worker, that might not be optimal but first build being a scout
  should be hard-coded."* Unbuilt: nothing in `src/ai/` hard-codes a first
  build.
- **Late-game cost** — batch 9 in flight (above); if your game's End Turn
  drags past ~t100 on standard, say so and it jumps the queue.
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Closed by your marginalia, for the record**: mid-peace expulsion (not
  now) · barbarian red rim (keep) · 4.5× declare (tune in playtest) ·
  project-headed towns (Civ V behaviour, confirmed) · authority roominess
  (defer to playtest) · camera easing (not needed; pan lock shipped) ·
  the seal lengthening (vetoed — slot-in/out is skill expression).
- **Playtest questions live** — the seven-line log: turn of each draft, the
  first pass and why, when slots first feel contested, the turn the wild
  stops mattering, when each age turns, beads per age, any stamp that
  surprised you.

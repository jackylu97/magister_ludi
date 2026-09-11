# The Standing Flags — the log of rulings made

Every ruling of `docs/flags.md` that is **resolved or built**, whole and
unedited, moved here on 2026-09-11 (the docs condensation). Item letters are
kept, so a citation like "(pppp)" or "(eeee)" resolves in this file. Nothing
here is an open question — `docs/flags.md` keeps those.

Read it when a docblock or a test cites a letter and you need the ruling's own
words. It is a log: do not read it front to back.

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
  world-clock ruling folds into its §1. **G1 built 2026-09-09 (schema
  101); G2 built 2026-09-09 (schema 102)**: `data/wagers.json` (24 rows,
  two deferred — The Harvest and The Arsenal want folds the sequence
  does not print), `WagerCount` the closed reading vocabulary (29
  members, every one a fold the Ledger already prints — the Ledger's
  band-1 fold lifted into `src/sim/ledgerFold.ts` so a rule reads no
  screen), the `wagers` phase between `worldClock` and `beads` (totals →
  claims → judgement → deal; three cards from three lines by
  `state.rng`, never in Æra I; the deal writes every seat's opening
  figures, so "this age" is a subtraction, nothing ticks), `chooseWager
  {index}`, the fifth End Turn blocker with the phase's default filling
  an empty chair, beads through `awardBead` (2 stake / 1 other) and a
  `wagerClaimed` occasion, an unclaimed stake leaving `pendingMalice`
  for G3; the deal sheet (`wagerSheet.ts`, eleventh on modalShell), the
  Abacus reworked with the three cards and every seat's track (no
  "claimed by"), the reckonings' automatic banner retired (`retired:
  true` on eight bead rows; the deeds still reachable by their three
  doors). Bars measured on the bench, Æra IV extrapolated; The War
  Chest knowingly easy. `Player.renownEarned`/`unitsKilled`/`unitsLost`,
  `City.capturedOn` are new verb-written facts. The bot stakes index 0
  until W2. ▢ owed: the Compendium does not yet walk `data/wagers.json`
  (take with G3's malices). t100 (8 seeds): beads 5.8, wagers kept 0.8
  a seat. **G3 and C1 flew 2026-09-09** (the user: "the malices and
  census look good — go ahead and start those"; W2, the bots' wager
  want, held until the orders pass is folded in). G3 takes schema 105,
  C1 106, both with §11's (rec) defaults; the Compendium's walk of
  `data/wagers.json` rides G3. **G3 built 2026-09-09, schema 105**: a
  missed stake is dealt a malice at the judgement (`state.rng`, never
  one held, drawn before the stacking eviction), seated in the last
  chair of its flavour (the Order there back to the hand, seal broken,
  nothing refunded), a wildcard chair failing that, and a **ninth chair
  nobody has** failing that (`HeldMalice.chair` absent, the slots not
  grown, the effect paid in full — never refused); `slotOrder`/
  `unslotOrder` refuse it in one sentence (tooltip, click and reducer
  alike, byte-identical); stacks to `rules.stack` 2; survives adoption
  and re-seats; leaves at the next judgement if that stake is kept
  (`untilAge`, compared, nothing ticks — Æra IV's stands); the eleventh
  `liveEffects` source, credited "Malice · The Lean Years", classed with
  the deck in the Ledger; `maliceSeated` in the occasion union; the
  twelve sync-tested (§4's Broken Levies built as −50% toward units);
  the Compendium gained the malice **and wager** shelves (G2's debt
  paid). **C1 built 2026-09-09, schema 106**: thirteen figures in one
  closed union (technologies · the six voices a turn · drafts · the
  faithful · towns · citizens · army strength · beads); three rolls a
  census in a fixed order — the figure (a bag minus the last, none
  twice running), the taker (a live great person's name, unlabelled),
  the gap (13–17 inclusive, drawn last so a census naming nobody still
  moves the calendar); `GameState.census.nextTurn` absolute, drawn at
  `newGame` after the decks shuffle and at each census. Figures are
  folds already printed (`foldEmpireRates` once a seat, `wagerCount`);
  "followers of each religion" read as **a seat's own faithful** (the
  citizens following its capital's faith — a census ranks empires, and
  a conquest taking the palace takes the question). Ties by seat order,
  a tie for first still leads, a head row of nought leads nobody;
  eliminated seats uncounted. The `census` phase between `wagers` and
  `beads`; the leader's Triumph (`censusLeader`, +5 through
  `settleRenownWindfall`) is **quiet** — a `quiet` marker on the row
  read by `reportTriumphs`, never a name — and shown inside the twelfth
  sheet (masthead, every living seat ranked with a track, local row
  lifted); every door sends `dismissCensus {playerId}` which writes
  `Player.censusSeen` (absolute), the sixth and last blocker, bot
  answers at once, refused byte-identically twice; only the last census
  shows, kept on the Abacus in a band off the record. ▢ the census's
  figures have no Compendium shelf (one small pass). t100 (8 seeds)
  with G3 + C1: cities 5.9 · citizens 42.1 · buildings 31.8 · food 130
  · prod 88.5 · gold 40.5 · sci 104.3 · cul **61.6** (was 78.4) · faith
  23.4 · treasury 349 · techs 24.2 · happiness **+7.4** (was +14.4) —
  the malices bite: a bot stakes index 0 and mostly misses, so the
  Æra II judgement seats The Silent Choirs / The Restless Cities in
  most bot councils. **W2 flies now** for that reason (a bot-only
  fence): the bots' wager want. (ggg) **The bot's second pass**
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
  1000/750, fixed). **RULED** (the user, 2026-09-09: "can I edit the
  technology costs: it should be something like 5 10 23 53 105 195 380
  680 1060 1850 2800 4900 8000 (exponential scaling)"): the ladder is
  the user's thirteen figures, column for column, root to last — Æra III
  and IV steepen (175/310/415/525 → 195/380/680/1060; 1650…2550 →
  1850/2800/4900/8000); batch **B6** writes them into every row's `cost`
  by column, the doc's ladder and per-age tables, `COLUMN_COSTS` and the
  bands, the pacing notes re-measured. Then: *"could you fit a curve that
  fits roughly the shape, starting at 5 and ending around 8000?"* — the
  fit is log-quadratic through both ends, least-squares to the thirteen:
  `ln cost(n) = ln 5 + 0.8084·n − 0.01613·n²` (the ratio decays 2.2 →
  1.55), friendly-rounded: **5 · 11 · 24 · 50 · 100 · 190 · 360 · 650 ·
  1150 · 1960 · 3250 · 5150 · 8000** — these are B6's figures, the
  formula written beside the table. **B6 built 2026-09-09**: every row's
  `cost` rewritten by column through `techColumn` (49 lines, nothing
  else); the formula and its rounding (nearest 1 below 30, 5 below 300,
  10 below 2000, 50 above) written in `tech.ts`' docblock,
  `docs/tech-tree.md` and `docs/design-notes.md` so a retune re-fits two
  constants. Ages 266/1295/5940/29850 → **269/1350/10440/56550**, tree
  37351 → **68609**; the Æra III → IV seam falls from 3.1× to 1.70× (no
  cliff; the close is dear because it ends a curve); Æra III moves most
  (×1.76). t100 probe, 8 seeds: techs 25.6 → **23.9** (−1.7, 2 SE — the
  one column that moved), cities 6.4 → 6.1, citizens 45.5 → 42.4, every
  per-turn voice inside one SE. `endgame.slow`'s lone capital opens the
  Opus on t4833 (was t2667; horizon 6500); `beads.slow` Æra III at t220
  (was t211). ▢ whether ~4800 turns for a one-city Opus is the pacing
  wanted — the harness's finding since 2026-09-06, louder now.
  `src/sim/state.ts:404`'s "27401 beakers" line is stale (G2's fence;
  fix when G2 lands). **RULED** (the user, 2026-09-09): *"the first great
  person at 75 renown, and have the costs scale in line with how our
  culture costs are scaled. Aim for ~1/3rd of the previous amount of
  great people at the end of age 3."* **Batch B5**: the renown ladder
  takes the draft ladder's shape — `base + linear·n + n^exponent`
  (`draftCost`, `statecraft/draft.ts`: culture's is 12 + 6n + n^2.8) —
  with `base 75`; `linear` and `exponent` chosen so that the renown a
  seat banks by the turn it leaves Æra III (measured on the bot bench
  under the ORIGINAL 40 · 25 ladder) buys **one third** of the persons it
  bought then; the doc's ladder table and sync test follow. **B5 built 2026-09-09**:
  `rules.renown = { base 75, linear 225, exponent 2.8 }` — a linear
  ladder's cumulative cost is `12.5N² + 27.5N`, so a third of the people
  is ×9 on the linear term (B4's predicted 225 reached by arithmetic);
  rungs 75 · 301 · 531 · 771 · 1023 · 1290 · 1575 · 1882; measured on the
  same two games: persons at the Æra III door 10.5 → 3.75 a seat (×0.36),
  t100 6.5 → 2.5, t150 15.5 → 5.0. **U4 (UI)** — (3) *"rename the great people actions
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
  still says act/work — R1's fence. **(6) rebuilt again as U6** (the user,
  2026-09-09: "I don't like that placement … too subtle to spot … double
  check how Civ 5 handles it"): Civ V's city bar carries the **garrisoned
  unit's icon at the top left**, distinct and clickable (selecting the
  unit), and the unit's own flag is not drawn while it stands in the
  city — the banner's icon *is* the unit. Ruled the same: the garrison
  icon moves to the **hoist** (the left, beside the size badge), the
  size of the size badge, in the piece's seat ink with its badge mark,
  clickable to select the piece (the unit panel opens); and the piece's
  own roundel in the scene is **hidden** while it stands on a city hex
  whose banner shows it (the sculpt stays), so one icon is drawn in one
  place. **U5 and U6 built 2026-09-09**: the plate carries the garrison
  slot at the hoist beside the size badge at its size, the piece's badge
  mark on a parchment disc rimmed in the owner's ink with a count past
  one, a scout/worker/settler/caravan/great person taking it when nothing
  stronger stands there, gated by the banner's watched gate, clickable
  for your own piece (`selectOnTile`, the board badge's own path); the
  piece's roundel is not built while its banner carries it, the sculpt
  and hit bar staying; the 3D layer, its wiring and its view3d keys are
  gone. **(6) once more, U7** (the user, 2026-09-09: "it makes it look
  like the unit is part of the city … Civ 6's approach, with the icon
  just appearing over the tile of the city, vertically below the banner
  in screenspace … it needs to scale with multiple units in the city"):
  read off the code — the banner projects the hex's tile-top point and
  hangs its plate above it (`translate(-50%, -100%)`), and a piece's
  roundel floats above its sculpt at that same hex centre, so the plate
  covers the roundel; the fix is geometry, not a second icon: the banner
  anchors at the **pole's top** (`tileTopY + CITY.poleHeight`, the flag's
  own height) so the plate sits above the flag and the pieces' own
  roundels stand on the tile beneath it, fanned as the pieces layer
  already fans a stack; U6's roundel suppression and U5/U6's plate slot
  are **removed** — one icon in one place, the piece's own. **U7 built
  2026-09-09**: `projectCell(col, row, rise)`; the banner's rise is
  max(the pole 1.15, the tallest row's hit-bar top on screen with the
  stack fan's climb, 2.345) + `city.bannerClearance` 0.1 = 2.445, so the
  bar clears too (the user's added clause); a −46px pixel margin that
  had pinned the plate to one zoom is gone; U5/U6's slot and wiring and
  U6's suppression removed; a wounded warrior on the city hex draws its
  roundel and its bar beneath the plate; the gallery stall drives the
  real renderer and overlay. **U7b, 2026-09-09** (the user: "the city
  banner seems to be adjusted higher in height than it used to, now it
  feels awkward"; done by hand, not an agent): the fan term is dropped —
  `tallestPieceRise` is the tallest single roster row's badge/bar top,
  no stack climb; the rise is 1.92 (foot rows bar at 1.60, horse 1.78,
  the standee 1.82, pole 1.15), was 2.445; the pin holds both halves,
  above the bar and below the bar plus the climb. **V2
  (heraldry)** — (7) *"the
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
- (jjj) **The turn mark** (the user, 2026-09-09: "I don't love the look
  of the orders icon … draft a mock with a few proposal candidates …
  a magister giving orders to a tabletop piece"; seven drawn at
  https://claude.ai/code/artifact/272102b1-6df0-47b1-8690-5b13cf3355f9):
  **RULED — the counter.** A flat bone gaming counter — the object a
  magister moves on a table — with **one gilt hairline** inside an ink
  edge and the numeral in mono; no beads, no heavy rule. Batch **V3**:
  `drawMedallionCell` (`badges3d.ts`) repaints the ninth atlas set as
  the counter — the same outer radius every disc in the atlas draws to,
  the paper bone, the ink edge at `medallionRimWidth`, a gilt ring at
  ~0.8 of the radius (`icons.medallionGiltColor` gilt, `icons.
  medallionGiltRadius`, `icons.medallionGiltWidth` in `data/view3d.json`),
  the numeral as today; the flair gallery's stall follows; the legibility
  pin (`test/render/unitBars`/wherever the medallion is pinned) re-aimed
  to the gilt ring and no beads. **V3 built 2026-09-09**: the counter —
  bone, the ink edge at 0.03, a gilt ring at 0.8 of the paper radius
  and 0.04 wide (wider than the ink it sits inside: gilt on bone carries
  a third of ink's contrast), the numeral at 0.48 (ceiling 0.4987 for
  "9+"); the ring sits more than a mip texel inside the edge so the
  alpha test never touches it, and keeps 32% of its colour at the 20 px
  level; `medallionGeometry`/`paintMedallion` exported so the fit and
  the minification are measured, the gallery painting through them.
- (kkk) **Crowding removed — RULED** (the user, 2026-09-09: *"i think
  there's enough authority in the game, but not enough ways to get
  happiness in the tech tree. I think i need to buff some of the
  happiness orders too. Sit tight, i'm going to make a great person
  pass + an orders pass. Could we ease up on the crowding? Maybe for
  ease of balance and player expectations, lets remove crowding
  unhappiness altogether."*). The ruling: **the crowding term is gone,
  mechanism and all** — not weight zero (that was 2026-08-29's state,
  `docs/design-notes.md`'s "disabled, mechanism kept", and the playtest
  notes turned it back on; a curve nobody can see is a curve somebody
  will turn on again). A town's demand is `demandPerPop × citizens`
  and nothing else: the `crowdingWeight`/`crowdingFrom`/
  `crowdingExponent` rules leave `data/rules.json` and `MeterRules`,
  `crowdingDemand` and the "crowding" cost line leave `explainHappiness`
  and the founding projection, the puppet's gain line relieves the
  citizens alone, `meterBreakdown`/`cityDisplay`/`figures`' crowding
  prose goes with it, and the bot's `crowdingDemandOf` and its fold of
  the court are retired. **The Assize Court** carried the one
  `crowdingRelief` (15%) — the marker is retired (a marker read nowhere
  fails the register) and the court keeps a happiness effect of the
  same shape, **a share of its own town's citizen demand forgiven**
  (`demandRelief: 15`, folded as the same "the justices sit" gain line
  against the town's citizen cost, read through `buildingEffects.ts`
  and priced by the bot as that share at the happiness price); ▢ the
  figure is the user's to retune in the orders pass — 15% of the whole
  citizen line is more than 15% of a surcharge was, deliberately, since
  the court's reason to exist is happiness. The great-person and orders
  passes are the **user's own**, not agents' — sit tight. Batch **B7**.
  Schema bumps (a replay's happiness meter changes). **B7 built
  2026-09-09, schema 103**: the three rules left `data/rules.json` and
  `HappinessRules`; `happinessDemand` is one multiplication,
  `crowdingDemand` deleted, one cost line per town in `explainHappiness`
  and the founding preview; the Assize Court carries `demandRelief: 15`
  (`buildingDemandRelief`), folded as the same "the justices sit" gain
  line against the full citizen cost — the court's and the puppet's
  reliefs are both gains off the full line, never off each other's
  remainder (the old pair's arithmetic, now said in the docblock); the
  bot prices the court as relief × demand(size) × the happiness
  weight (worth something in a hamlet now, where the surcharge share
  was nothing below ten); the describer says the citizens ask less, the
  Compendium's crowding clause is gone; `cardText.json` moved one line
  (the Justices' Charter). t100 (8 seeds), B6 → B7: cities 6.1 → 5.9 ·
  citizens 42.4 → 42.2 · buildings 32.1 → 32.2 · food 126 → 121 · prod
  88.6 → 88.8 · gold 40.0 → 44.6 · sci 95.9 → 106.7 · cul 73.0 → 73.4 ·
  faith 20.2 → 20.3 · treasury 342 → 322 · techs 23.9 → 23.7 ·
  happiness +7.1 → +9.9. The headroom goes into the tier and out as
  science and gold; the bot spends it rather than banking it. (eee)
- (lll) **The great-person pass — RULED** (the user, 2026-09-09: *"i
  massively buffed the great people, since they're now much more rare.
  Please fold in my changes in the doc and queue these up for
  implementation."*). **The doc is the spec of record**: the *Legacy*
  column of `docs/great-people.md` as the user left it in the main tree
  (uncommitted at the time of ruling; the row-by-row diff against HEAD
  is the list below). The sync test reads names and figures only, so
  the legacy column is checked by hand here and by the describer after.
  **Removed (8)** — `retired: true`, the row kept for saves, out of
  every draw: Senenmut, Kushim, Aššur-idī, Sima Qian, Han Xin, Shen Kuo,
  Snorri Sturluson, Zheng He. **Renamed (2)** — the user wrote RENAME /
  NEW NAME; proposed names, ▢ the user's to change: the Æra III General
  ("units +1 movement if they start their turn in friendly territory")
  → **Gaius Marius**; the Æra V Merchant ("double the yields of your
  fishing boat tiles") → **Willem Beukelszoon**. **New rows (4)**, family
  and tier proposed (all Scholars, placed where the user wrote them;
  ▢ names/tiers the user's): Æra III **Epicurus** ◆ "−15% happiness
  cost in cities with 10+ population"; Æra III **Aristotle** ● "+50%
  yields from science buildings"; Æra IV **Maimonides** ◆ "+1 happiness
  from science buildings"; Æra IV **Roger Bacon** ◆ "+30% food and
  production for 3 turns on completing a technology". **Age moves (5)**:
  Sappho III→II, Hemiunu II→III, Ptahhotep II→III, Ibn Sīnā IV→III,
  Mimar Sinan V→IV. **Retunes in the existing vocabulary** (batch
  **GP1**, data only): Imhotep wonders 5→10%; Eratosthenes per 60→80
  hexes; Zhang Qian per 60→80; Crassus buy −20→−30%; Murasaki 2→10
  culture per melee unit; Tycho 1→2; Āryabhaṭa 1→2 faith per science
  building; Ilimilku +1 production beside the culture; Bashō forest
  **and jungle**; Su Song +1🔬+1⚙ on mines in a workshop town (hex pays,
  owner scope); Francesco Datini +2 gold on every resource hex in a bank
  town; Sor Juana +1🎵+1🔬 on every resource hex in a university town;
  Mimar Sinan temples +2🎵+2⚙ (city pays, hasBuilding) plus its two
  production bonuses; Vitruvius aqueducts and granaries +1 happiness
  (two `happiness` rows with `building`); Archimedes siege +1 movement
  (`unitStat`) and +3 strength always (`combatLine`); Homer the five
  works each +2 of its own voice (hex pays × 5: academy 🔬, landmark 🎵,
  manufactory ⚙, customs house 💰, citadel ⚙ — the assumption, ▢);
  Benjamin of Tudela +2💰+1🎵 on every great work (a `greatWork` tile
  test, one row); the new Beukelszoon row = fishing-boat hexes +100% of
  works and ground; Roger Bacon = `windfallRider` on `tech` with a
  3-turn timed +30% food/production; al-Khwārizmī's first half +10%
  faith in university towns; Gracia's first half +8 authority; Dinocrates
  is a wording fix (the data already *gives* +3 — the describer said
  "costs"). **New shapes** (batch **GP2**, design decisions the marks
  authorise; each a row in the register, the evaluator's one switch, a
  describer, a bot fold, `docs/yields.md` where a yield lands):
  (a) **`buildingYields`** — a percent on a building's *own* bag, by
  `building` | `category` | `yielding: voice` | `wonder: true`, folded
  at the building line before any stage: Rūmī temples ×2, Aristotle
  science buildings +50%, al-Jazarī production-base buildings ×2, Dürer
  wonders +50%; (b) `CombatCondition` **`vsWiderEmpire`** (the target's
  owner holds more cities than you): Spartacus; (c) a `rule` flag
  **`tradersUnplunderable`** (a blow on a trading unit neither plunders
  nor harms it — ▢ "cannot be pillaged" read as the plunder seam) and
  `unitStat` sight on the trader class: Pytheas; (d) a `rule` flag
  **`faithBuysScienceBuildings`** read where the faith bank opens:
  al-Khwārizmī's second half; (e) count kinds **`tradePartnerEmpires`**
  (Ibn Baṭṭūṭa, empire-wide +5% culture per — a new (empire, count,
  percent) pair in the register), **`authoritySurplus`** (Gracia's +1
  happiness and +10 gold per spare point), **`goldSpent`** (Cosimo, per
  100 — a new verb-written fact `Player.goldSpent`, raised at every gold
  purchase seam: items, tiles, routes, offers), **`routeLength`** on the
  route arm (Marco Polo, +1 gold per 2 hexes of the route's own path);
  (f) `meterRule` **with a city scope** (Epicurus, `populationAtLeast`
  10, the town's own demand ×0.85); (g) `happiness` per science
  building (Maimonides — `pays where:'empire' basis:'count'
  to:'happiness' count:'scienceBuildings'` if the count reads
  empire-wide, else a new arm). Rows needing a GP2 shape are **deferred
  and annotated** by GP1 (the describer strikes the half through) and
  filled by **GP3** once both land. Schema bumps with GP1 (the roster
  changes the draw) and the `goldSpent` field rides GP2. The doc is
  regenerated from the data at the end of GP3 and must reproduce the
  user's legacy column word for word where the vocabulary allows.
  **GP1 built 2026-09-09, schema 104**: 86 rows (78 live + 8
  `retired`, `GreatPersonDef.retired`; `rosterOfAge`/`ROSTER_AGES` read
  live rows only, the sync test excludes retired and checks the per-age
  tallies); every GP1 mark landed in the existing vocabulary — no new
  kind, count, condition, rule or (where, basis) pair (Benjamin is one
  `greatWork` tile row; Bashō `anyFeature`; Datini/Sor Juana
  `hasResource`; Pytheas' sight half via `category: 'trader'`;
  Maimonides works as a city-scoped count summed across the realm;
  Beukelszoon `percent` + `basePercent` 100 doubles the hex, pinned).
  Two fence excursions: `settleResearch` dropped a `tech` rider whose
  only payout was `timed` (Roger Bacon would never have fired —
  widened to mirror `purchase.ts`' guard); the describer's timed-grant
  clause read a `pays` bag as a bill ("costs" → "grants", Dinocrates
  only) and pluralised `Granarys` (now `buildingPlural`, fixing Feast
  Days too). 51 of 78 legacy lines byte-identical to the user's, 27
  differ in phrasing only, 12 halves struck through for GP2. ▢ the
  describer prints `unitStat ownTerritory` as "inside your territory"
  (Marius' "if they start their turn in" is what the sim does — the
  allowance is set at reset from the hex the piece stands on; the path
  preview's later turns can over-promise a point). ▢ three vocabulary
  members now unread by any row (`sightedCities`, `bankedGold`,
  `strongerTarget`). ▢ the Compendium lists retired great people (and
  the 47 retired Orders) while it hides retired buildings — one ruling
  for all three. t100 (8 seeds), B7 → GP1: cities 5.9 → 6.3 · citizens
  42.2 → 42.8 · buildings 32.2 → 33.1 · food 121 → 129 · prod 88.8 →
  87.7 · gold 44.6 → 50.7 · sci 106.7 → 99.5 · cul 73.4 → 75.6 · faith
  20.3 → 21.5 · treasury 322 → 305 · techs 23.7 → 23.4 · happiness +9.9
  → +11.4 — all inside a seed's noise, as a hundred turns holds at most
  one great person a seat. **GP2 built 2026-09-09** (no bump of its own;
  `Player.goldSpent` rides 104): three of the seven were smaller than
  ruled and one already worked — `buildingYieldPercent` existed with
  `category`/`pays` and gained `building?` and `wonder?: true` (one
  labelled line per card summing the matching buildings, the shipped
  convention); Maimonides' count already sums a town count across the
  realm (`isCityScopedCount`), pinned; `happinessDemand` is a
  `rulePercent` whose `scope` already existed, so the change is
  `explainHappiness` folding the factor per town under `cardRuleIsScoped`
  (the unscoped path byte-identical); `UnitFilter.category: 'trader'`
  existed. New: `vsWiderEmpire`; `tradersUnplunderable` read as **target
  selection** (`attackTargetAt` skips a protected laden cart — tint,
  forecast and reducer refuse as one, shot and sword alike — and
  `arriveOnTile` leaves it standing); `faithBuysScienceBuildings` at
  `faithBankOpen`'s building clause (`buildingPaysVoice`, a
  `buildingData.ts` leaf); counts `tradePartnerEmpires` (a live
  empire/count/percent pair, in the register), `authoritySurplus`,
  `goldSpent` (one `spendGold` in `state.ts`, five seams:
  `purchaseItemAt`, `contributeAt`, `purchaseTileAt`, `applyBuyRoute`,
  `chargeBank`'s gold arm; a diplomacy lump and the retool excluded, the
  reason on the field), `routeLength` on the route arm — **the distance
  between the two towns** (`routeHexes`), not the walked path, so the
  send preview can promise what a route earns. The bot prices the four
  counts through `explainCounted` for free, the by-mile row through one
  new arm, and names the two rules in `score.unknownEffect`'s list. GP3
  wires the rows (the first live `route/count` pair joins
  `statecraft.test.ts`'s pair sweep). **GP3 built 2026-09-09** (no
  bump): the twelve halves wired, zero `deferred` keys on the roster,
  no live row silent (a register pin says so); `route/count` in the
  pair sweep; one describer gap fixed — `payoutWords` had no arm for a
  counted row paying a *bag*, so Marco Polo printed "+0" (now reads the
  bag); the doc regenerated — 66 rows byte-identical, the 12 moved,
  the Notes kept; `cardText.json` moved exactly the twelve. Readings:
  Spartacus stays **attack-only** (the row's old posture; the mark
  changed only whom); Cosimo pays **culture** (the mark, not GP2's
  worked example); Pytheas reads "cannot be attacked or plundered";
  Marco Polo "per 2 hexes between the two cities". Every legacy on the
  roster prices off a fold bar the two rules and Leonardo's amplifier
  (pinned in `aiAppraisal.test.ts`). t100 (8 seeds) after GP3: cities
  6.4 · citizens 42.3 · buildings 32.2 · food 127 · prod 83.6 · gold
  48.8 · sci 104.3 · cul 78.4 · faith 20.8 · treasury 304 · techs 23.5 ·
  happiness +14.4 — inside noise against GP1, as expected at a hundred
  turns. (eee)
- (mmm) **The star chart's figures — RULED** (the user, 2026-09-09:
  *"I'm not sure what the yields next to the rows mean, but they don't
  seem to be accurate and are unformatted floating point values. Lets
  keep values there rounded to the nearest integer, and lets only
  include yields for technologies that supply yields (like irrigation's
  food on farms). The buildings don't need yield previews, as they need
  to be built in your empire."*). The figures were Entry VIII's
  `buildingYieldDelta` — "what this building would add to your empire
  today", `foldCity` twice per city per building, printed raw. The
  ruling: (1) **a building row on the chart prints its production cost
  and nothing else** — the delta leaves the node card and the hover
  card; `buildingYieldDelta`/`cityBaselines` stay for the city panel
  (its own caller) and the tests that pin them, and the chart's
  `Pass.baselines` and its revision-keyed carry-over go with the line
  (the chart's expensive half, gone); (2) **only a technology's own
  yields print** — the renewals (`kind: 'renewal'`, irrigation's food
  on farms), an ability that pays (`kind: 'ability'` with `pays`), and a
  node's `techEffect` rules where they pay a voice — and every figure
  on the chart is **whole**: `signedYield`/`yieldShows` (`roundYield`)
  on every voice, never a raw number in a template; (3) the hover
  card's unit and building rows keep their cost lines; the "now" word
  goes with the delta. Batch **T2**; the chart's tests re-aimed
  (`test/ui/techTree*.test.ts`, `techTreeCost`), a pin that no chart
  figure prints a non-integer, and one that a building row carries no
  yield. No schema. **T2 built 2026-09-09**: a building row is its
  price, node face and hover card through one expression; the delta,
  `is-delta`, `YIELD_GLYPHS`, `Pass.baselines` and the whole
  revision-keyed carry-over gone (`refreshNodes` is two price lookups a
  card); `buildingYieldDelta`/`cityBaselines` stay in `tech.ts` with no
  caller (the city panel never called them — the ruling's claim was
  wrong; their pins moved to `tech.test.ts`). Four raw floats found:
  the delta, and the science rate on the hover card, the HUD research
  card and its title (all `signedYield` now). One bug in passing:
  `tileYieldNote` printed three voices of a six-voice `TileYield`, so
  The Long Count's plantation renewal (+1 culture) rendered empty —
  widened to six. `test/ui/techTreeFigures.test.ts` sweeps every gift
  figure of every tech against a five-town empire (>200 figures, whole).
  **T3 built 2026-09-09** (the user: "update the tech tree md file too,
  with the latest technologies"): `docs/tech-tree.md` Part 2 is
  generated at last — `TECH_DOC_WRITE=1 npx vitest run
  test/sim/techDocSync.test.ts` rewrites it from the rows and the
  tree's own describers, and without the env the test asserts the
  region byte-for-byte (names, costs, prereqs, all three unlock
  columns, the rule bullets, a verbs table). The regeneration surfaced
  a whole unprinted class of gift (the nine improvements a worker may
  lay), the Bourse's ‡, the Trader's R1 status, a stale culture glyph,
  three † marks built out in E4a/E4b, and that the bullets had been the
  numberless note rather than the node's rules (now the rules with
  figures, the note in italics). Three Part 1 sentences corrected where
  the data had moved (seventeen effect-carrying techs; no hand-tuned
  prices since P1; `ageEntryDice` is gone — ▢ `docs/beads.md:61` still
  names it). Renewals: the *improvement* renewals stand (five rows on
  four improvements); the building renewals went 2026-09-04.
  (eee)
- (nnn) **The wager, second look — RULED** (the user, 2026-09-09: *"we
  need to tune the numbers for some of the wagers way down. The
  academies is too high, the contented realm is too high. Also — we
  have too much flavor text in the descriptions, could you tone it down
  and give a better description for them? I have no idea what bread and
  iron are referring to. I think i have more balance changes that are
  needed, i'll go through the doc and science tree in a bit. Could we
  remove the table of the previous win conditions and remove it from
  our code? the wager system seems way better to me. In the abacus
  screen, the abacus is a bit too large compared to the other
  wagers."*). Four rulings, two batches. **W3 (the deck's words and two
  bars, the Abacus's stage)**: (1) **bars** — The Academies 4000 · 16000
  · 20000 → **1500 · 5000 · 7000**, The Contented Realm 650 · 700 · 900
  → **200 · 250 · 300** (the bench's 1.5× of a bot's mean is a bot's
  bar; a human at half a bot's science and a third of its slack meets
  these — ▢ the user's own figures come with their doc pass; the doc's
  table is sync-tested, both places move); (2) **every wager's note says
  what is counted, in what span, and nothing else** — no flavour in
  `note`, the reading first ("Food to spare every turn and a standing
  army, both on the same turn" for Bread and Iron; "Science, added up
  over the age" for The Academies); a name that hides its reading keeps
  its name and ▢ a plainer one is proposed in the doc's Notes for the
  user; the deal sheet, the Abacus and the Compendium all print the
  note through the one describer; (3) **the Abacus's stage is a third
  of the sheet, not the sheet** — the bead rods' 3D stage takes at most
  about a third of the sheet's height and the wager band the rest, the
  cards first; the stage is measured after the cap (it projects into
  its own box). **Q1 (the deeds retire)**: (4) **the old victory
  conditions leave the game** — feats, quests and endeavours
  (`data/beads.json` `feats`/`quests`/`endeavours`, the per-age hand,
  `handSize`, `dealEveryTurns`, `drawAge`/`drawFeats`, the contested
  register `state.contested` if nothing else reads it, the Beads
  screen's deed tables and the deed sheet's three doors, the bead chip's
  count of deeds) — retired the reckonings' way (`retired: true`, rows
  kept for saves, out of every pool and every screen) where a save
  holds one, deleted where nothing can; **beads come from the wagers and
  the grants** (`grants`, the repeatable rows, stay — a wager's own four
  among them); the four Æra V **bead Orders** that count a deed are
  retired (they were waiting on deeds); the Beads screen becomes the
  bead ledger alone (rods, grants, the Opus door) or folds into the
  Abacus if that leaves it empty — the agent's call, said on the board;
  (5) **the Opus door** — `rules.threshold` 20 was cut for deeds; with
  wagers alone a perfect seat takes at most four an age over three
  ages; the agent measures the bench's top seat by Æra IV's close with
  deeds gone and sets the threshold at about **two-thirds of it**
  (▢ the user's figure comes with the balance pass), the doc's figure
  and `docs/wager.md` §5 following. Schema bumps (Q1). **W3 built
  2026-09-09**: the two bars cut (data and doc together, ▢ pending the
  user's pass); all 24 notes rewritten from the `WagerCount` docblocks
  and `wagerCount`'s arms — four corrected a real inaccuracy (The
  Caravanserai reads trade only, not roads; The Solvent Realm is the
  per-turn *net* take accumulated; The Worked Land the capital's worked
  tiles; The Marcher Lords' two meters at or above nought); the note
  contract on `WagerDef.note` (reading · span · nothing else; a
  `flavor`/`epigram` field on a wager row fails the build); one path
  confirmed (deal sheet, Abacus band, Compendium all read `wagerDef
  (id).note`); ▢ plainer names proposed in the doc's Notes column
  (Bread and Iron → Full Fields and a Standing Army, The Six Voices →
  The Whole Yield, …), names unchanged in data. The Abacus's stage is
  `flex: 0 0 33vh` and the register takes the rest, cap in CSS because
  the stage measures its box on first open; the frame still leads the
  sheet at a third, the wager band above the rods inside the register
  (▢ cards above the frame too is a DOM move if wanted). **The user's
  doc consolidated** (the user: "consolidate the wagers.md file into
  just the list of final wagers … I'd like to modify it directly"):
  `docs/wager.md` is now Rules (twelve current-state bullets, each
  naming its data key) · The Opus door (Q1's line) · The deck (one
  table, Æra II/III/IV as three editable columns, Note, Notes —
  sync-tested on bars **and** notes) · The malice deck (G3's table);
  the worksheet moved whole to `docs/audit/wager-worksheet.md` (the
  ~30 `§N` citations in src/test mean the worksheet's sections).
- (ooo) **The garrison above the banner — RULED** (the user, 2026-09-09:
  *"I'm still unhappy with the city banners and unit visibility. Is it
  difficult to have the list of units in a city appear _above_ the
  banner? If thats too hard, could we reposition the unit icon so that
  it appears in the center of the tile (with the banner moving back to
  the old position, where it used to sit lower and directly over the
  city)."*). Not difficult, and the first is the ruling. **U8**: the
  pieces on a city hex are listed **above the plate** as a row of
  roundels in the banner layer — DOM, the same drawn badge the atlas
  paints (`badges3d.ts`'s cell painters into a small canvas, one per
  unit type, cached), the seat's ink, a hit bar under a wounded piece's
  roundel, one roundel per piece, centred over the plate with a clear
  gap so it reads as *standing at* the city and not as part of the
  plate (the U6 objection), overlapping into a fan past four and "+N"
  past eight; the selected piece's roundel ringed as the board badge
  is. The piece's own 3D roundel and bar are **suppressed on a city
  hex** (U6's suppression, back — one icon in one place); the sculpt
  stays. The banner returns to the **old rise** — the pole's top
  (`poleHeight` + clearance), U7's `tallestPieceRise` and its pin
  retired — since nothing above the pole needs clearing any more. A
  click on a roundel selects that piece (`selectOnTile`'s path); the
  row rebuilds off `signUnits` (it is a fingerprint reader like the
  badge layer) and hides with the banner under fog. The gallery stall
  drives it. Tests: the row's count and order pin, the fan past four,
  the "+N", the bar on a wounded piece only, the suppression on the
  city hex and not beside it, the rise back at the pole. (eee)
  **U8 built** (2026-09-09): `src/ui/unitRoundels.ts` prints the atlas
  cell into a 96px canvas (one loader, `badges3d.loadIcon` exported);
  the row is a signature term on the banner, the walk cached behind
  `signUnits`; 26px roundels, fan past four (pitch 21px), "+N" past
  eight; a press on your own roundel → `controls.selectPiece` (asks
  `ownUnitsAt`). The board suppresses badge + charge boss + hit bar on a
  watched town's hex (`banneredTownCells`; sculpt stays); plate rise =
  `poleHeight + bannerClearance` (1.25). Known gaps: a worker's charge
  numeral goes with its suppressed roundel; a piece mid-march over a
  town hex keeps its walking tag until the walk lands.
  **U8b — RULED and built by hand** (the user, 2026-09-10: *"the garrison
  icon placement is sooo close, i like this version a lot better. Could
  we move the icon down, slightly overlapping with the city banner, so
  its clearer that the unit is 'in' the city. I'm mostly worried about
  newer players being able to read this clearly"*): the row's `bottom`
  goes from `calc(100% + 9px)` (a clear gap) to `calc(100% − 7px)` — the
  roundels overlap the plate's top edge by about a quarter of their
  height; the pin allows 1–12px of overlap. One CSS line.
- (ppp) **Ships, the taking of towns, the capture sheet, the two words —
  RULED** (the user, 2026-09-09: *"create a doc with every unit and their
  combat strengths … melee units should not be able to attack boats
  from land (a warrior cannot attack a water tile). Boats should take
  reduced damage from ranged attacks from land (archers, mounted
  archers) but should take increased damage from siege (catapults,
  trebuchet, etc). Boats should also take reduced damage when attacking
  embarked units, and embarked units should not be able to attack
  boats. Also, a melee unit attacking and killing the unit protecting a
  city should take the city. In the raze/annex/puppet screen: are you
  sure you're calculating the authority and happiness costs from
  absorbing the city correctly? I also dont understand why the raze
  option has a 'land' statistic, what is that referring to? Let's also
  use happiness and authority as the correct terminology instead of
  writ and cheer, its confusing to players to use multiple words."*).
  Three batches. **N1 — the naval rules** (`combat.ts`, `rules.naval`):
  (1) a **land melee or mounted** piece may not attack a target on a
  water hex (`attackTargetAt` refuses; the tint, the forecast and the
  reducer say one sentence: "a warrior cannot strike at the water");
  land ranged and siege may shoot at water within range as today;
  (2) **a ship struck from land**: a land ranged/mounted-ranged attacker
  fights at **−50%** against a naval target, a land siege attacker at
  **+50%** (`rules.naval.landRangedVsShipPercent` −50,
  `rules.naval.landSiegeVsShipPercent` 50 — attacker-side percentages,
  the ledger's one allowed kind, labelled lines; ▢ the figures are
  first cuts for the user's pass); (3) **a ship striking an embarked
  piece** takes half the counter-blow (`rules.naval.embarkedCounterPercent`
  50 — read where the defender's return strike is priced; state in the
  docblock how it composes with the at-sea penalty); (4) **an embarked
  piece may not attack a ship** (refused as (1), "a column afloat cannot
  fight a hull"); (5) **the taking of a town**: today walls → garrison →
  capture is three beats; now a **melee/mounted** blow that kills the
  garrison **takes the town in the same blow** (the winner advances
  through `arriveOnTile`, the capture off the plan) — the walls beat
  stays first where walls stand (▢ if the user meant walls too, say so);
  a ranged kill of the garrison still leaves the town to be walked into.
  `docs/war-diplomacy.md` §combat updated; the Compendium's rules through
  the describers. Schema bump (a replay's battles change). **K1 — the
  capture sheet and the two words**: (6) **every option prints the
  town's whole cost under that outcome, folded, never picked** — for
  Annex and Puppet, `explainAuthority`/`explainHappiness` evaluated on
  the outcome (the puppet flag set or cleared on a copy of the town — a
  pure what-if, no state written; rule 5's fold, twice), the lines
  named by the town summed: "Authority −N · Happiness −M"; Raze:
  "Authority 0 · Happiness 0" and the citizens lost; the "Ground" line
  becomes **"Territory released N⬡"** (the hexes the town holds that go
  unowned) or is dropped if the agent finds it says nothing a player
  acts on — say which; (7) **the words**: every player-facing "writ"
  and "cheer"/"contentment" becomes **authority** and **happiness** —
  the describers' word tables, `figures.ts`' meter names, the capture
  sheet, the city panel, the top bar, the unit sheet, the card stamps,
  the Compendium's written shelves (`compendiumText.ts`), the dock and
  meter marks' labels, the docs (`docs/*.md` current-state prose; not
  history) and the data rows' `note` prose; identifiers may keep their
  names (`puppetWrit` is code), and a `test/ui/vocabulary.test.ts`
  sweeps every player-facing string source for the two retired words.
  **D2 — the units doc**: `docs/units.md`, generated from
  `data/units.json` and the sim's own readers (`unitDef`, `unitMaxHp`,
  `unitRosterCost`, the unlocking tech via `worldUnlockTech`): one table
  per category — name · class · strength · ranged strength · range ·
  movement · hp · sight · size (cost) · escalation · unlocked by ·
  upgrades to · marks (`routeOnly`, `requiresResource`, `retired` off) —
  and the naval rules of N1 as a short rules section pointing at
  `rules.naval` keys; sync-tested (`test/sim/unitsDocSync.test.ts`, the
  `techDocSync` pattern with a `UNITS_DOC_WRITE=1` generator); the
  user edits it for balance. (eee)
  **D2 built** (2026-09-09): `docs/units.md` — 43 live rows (24 military ·
  12 naval · 6 civilian · 1 trader; the augur out), the rows' own
  strength lines (the whole naval triangle as data) and every
  `rules.combat`/`rules.naval` figure beside them; the generated region
  is asserted byte for byte and the Notes column round-trips. N1's new
  naval knobs will fail the sync until regenerated — `UNITS_DOC_WRITE=1
  npx vitest run test/sim/unitsDocSync.test.ts`. Hand-written head must
  never contain a line beginning `## The roster` (the region anchor).
  **K1 built** (2026-09-09): `captureFigures` folds `explainAuthority`/
  `explainHappiness` on two what-if realms (`heldAs`, the puppet flag set
  or cleared on a copy of the town) — Annex and Puppet print the town's
  whole bill, signed, exactly the relief apart; Raze prints nought on
  both, the citizens, and **"Territory released N⬡"** (kept: `razeCityAt`
  really releases the hexes). The words: every player-facing writ/cheer/
  contentment → authority/happiness across screens, popovers, meter
  lines, data notes and the reference docs; `test/ui/vocabulary.test.ts`
  is the register (titles, flavour and identifiers keep their names).
  Held back for other fences: `data/beads.json`'s two "contentment" rows
  (Q1) and the bot's appraisal words in `src/ai/value.ts`/`citizen.ts`
  (swept at W2's merge).
  **N1 built** (2026-09-09, schema **107** — Q1 takes 108): `waterlineError`
  is the one clause (tint, forecast, reducer): "Warrior cannot strike at
  the water" / "Spearman is afloat and cannot fight a ship"; an embarked
  piece may still strike a *land* target. `landVsShipPercent` reads
  `modelClass` (ranged/mountedRanged −50, siege +50) as an attacker line
  "Against a hull ±N%" before the river factor; `counterPercents` on the
  forecast ("Boarding at sea" 50) scales the counter alone, separate from
  `atSeaPenalty`. `capturesCityOnKill` = melee + garrison beat + not the
  wild + `canHoldTakenGround` with the garrison counted dead; step 4b of
  `applyCombat` captures through the same `captureCity`, so the capture
  sheet rises unchanged; the forecast says "kill the garrison and the
  city falls". `docs/war-diplomacy.md` §5b; `docs/units.md` regenerated
  (the three figures now in its table). ▢ the three percentages are
  first cuts; ▢ walls too? **Consequence to flag**: a land melee piece can
  no longer ride down an *embarked civilian* (a march onto the hex still
  captures it, a bow still shoots it). The bot needs nothing: its
  `decisive` already counts `kills`, which is the garrison-beat case.
  **W2 built** (2026-09-09): `src/ai/wager.ts` — score = margin × premium
  − (1 − margin) × malice; a flow projected off the phase's own
  accumulators re-read on the bot's side, a standing card off its drift;
  the malice priced through `explainEffects` × `score.lumpTurns`; the
  staked bar leans the voice weight (banded) and one appetite line.
  `data/ai.json` `wager` block: ageTurns 32 · malicePenalty 0 ·
  leanWeight 1 · driftWeight 1. Paired t100 (8 seeds, W2's branch, before
  W3's bars): wagers kept 0.25 → **0.44**, malices seated 0.38 → **0.19**,
  happiness +7.4 → +9.1; the lean itself trades ~2 prod/sci for ~2.5
  culture. The bot's appraisal words swept to authority/happiness here.
  Flagged: `turnReadings` is not exported from `wagers.ts`, so the flow
  bag is a second reading of the same fold.
  **t100 after D2 · U8 · K1 · N1 · W2 on top of W3/T3** (8 seeds, 16
  seats): cities 6.1 · citizens 43.9 · buildings 34.3 · units 26.6 · food
  129.4 · prod 89.3 · gold 42.1 · sci 112.6 · cul 78.1 · faith 25.1 ·
  treasury 322 · techs 24.6 · happiness +9.5 (C1's row: cul 61.6,
  happiness +7.4 — the wager want and W3's lower bars recovered the
  culture the malices had been costing).
- (qqq) **Puppets that decide — RULED** (the user, 2026-09-10: *"puppeted
  cities right now only work on 'tithe'. Could you give puppeted cities
  actual logic, you can re-use the bot logic so that they produce
  actually useful things (i.e. they should build monuments when
  authority is negative, prioritize buildings with the highest yields,
  etc)"*). Diagnosis: `puppetProduction` already runs the seat's own
  `productionTable` under `aiConfigForPuppet` (buildings only, no
  wonders/units/settlers, ruled 2026-09-03), and the appraisal already
  prices a row's `authorityCapacity` at the meter's live price — but
  **(a)** `autoPickPuppets` (`controls.ts`) fires only on an *empty*
  queue and a project never leaves the queue, so a puppet that once
  chose the tithe is frozen on it for the game; **(b)** the puppet
  profile's gold thumb (`puppetProfile.weights.gold` 6–8 vs science 3)
  makes the tithe win that first choice. **PP1** builds: (1) **a puppet
  re-decides** — at every End Turn (human seat: `autoPickPuppets`; bot
  seat: the same door from the driver's town pass) a puppet whose queue
  head is a **project** is re-appraised against the same table, and a
  building that outscores the conversion by `puppet.switchMargin`
  (a new `data/ai.json` knob, first cut 10%) replaces it through the
  ordinary `setCityProduction` command; a building **in progress is
  never abandoned** for a project or another building (hammers banked
  are hammers kept), and a completed building empties the queue as
  today; (2) **the thumb is measured, not guessed** — the agent re-cuts
  `puppetProfile.weights` on the bench so a puppet with unbuilt yield
  buildings raises them and falls back to the tithe only when nothing
  worth raising is left (the gold lean stays; it is the puppet's
  character); (3) **pinned behaviours**, each a core test on a fixture
  puppet: an empire over its authority capacity → the Monument (or
  whichever row carries `authorityCapacity`) beats the tithe; a town
  with a library/market available and the yields to feed it → the
  highest-yield row beats the tithe; a town with nothing left to raise
  → the tithe; a project-headed puppet re-decides the next turn a
  better row appears; a building mid-build is kept; (4) **visible** —
  the puppet's city panel shows what it is raising and the decision
  feed's "Uruk (puppet)" line carries the table (already the case;
  verify, add the switch as its own decision line "Uruk (puppet) turns
  from the tithe to a Library"). No schema (the choice is a logged
  command); replay unaffected. Arena: the new knob appears on the panel
  by walking the sheet. Report the t100 row.
  **PP1 built** (2026-09-10): `puppetRedecision` (one door: `autoPickPuppets`'s
  second arm and the driver's town pass), `queueAhead` promotes the building
  in front of the conversion (never cancels it), `ai.puppet.switchMargin`
  0.1 as a fraction of the incumbent's magnitude. Thumb re-cut on the bench:
  gold 6,6,7,8 → **4,4,5,6**, science 3 → 4,5,5,5, culture 1 → 2 (the table
  is 3,3,4,4 / 5,6,6,6 / 5,5,5,5) — the old gold weight doubled what a
  Library *cost* a puppet (wages at gold's shadow price) while halving what it
  paid. Bench: seven towns with cheap rows up — Tithes 0.20 · Library 0.10
  before, Library 0.26 · Tithes 0.20 after; over the cap the Monument wins.
  Ten pins in `test/sim/aiPuppet.test.ts`; the feed says "Uruk turns from
  Tithes to Library". City panel unchanged (already shows the queue, locked).
  Flagged by the agent, every seat's and untouched: a Market prices negative
  in most towns because `push` discounts a row's gain by build turns but not
  its wage. **t100 note**: the agent's row (sci 86.8 · cul 62.9 · happiness
  +4.7 · buildings 29.3) is the post-Q1 baseline, identical with the old
  thumb — the drop from the W2 row is Q1's; measured next.
  **The post-Q1 t100 drop, measured** (2026-09-10, same probe, same 8
  seeds): W2 row sci 112.6 · cul 78.1 · buildings 34.3 · happiness +9.5 →
  post-Q1 sci **86.8** · cul 62.9 · buildings 29.3 · happiness **+4.7**.
  Not the Opus door: threshold 7 and 20 give byte-identical rows (the bots'
  race term is inert at t100 either way). Not the bots' reading of the
  rows: `src/ai/` never read a deed, and un-retiring all 43 rows without
  the phase gives sci 86.3 · happiness +5.9. **It is the deeds' boons**:
  the retired quests and endeavours paid real yields when cleared — 300
  and 400 science windfalls, a citizen in every city, +5 happiness twice,
  +10 authority, 200 gold — and every seat, bot or human, was collecting
  them by t100. Q1 is working as ruled; the game is leaner for everyone.
  ▢ for the balance pass: the tech ladder (B6) and the happiness figures
  were fitted with those injections in place; the wagers now carry that
  weight alone (a wager pays beads, not yields). The **new baseline** is
  the post-Q1 row above.
- (uuuu) **Akhenaten starts in the desert — RULED** (the user,
  2026-09-11: *"i notice akhetaten rarely spawns in desert, could we
  give him a desert start bias?"*). He has one (M1c) but it is weak by
  construction: `startBias.terrain.desert` is **0.5** — a *penalty* on
  desert ground under the site score — and the want `aridWithin: 2` is
  met by a single desert, oasis or floodplain hex anywhere within two
  rings, so he sits on a river with one dune in sight. **Ruling**: the
  capital stands **beside the desert** — the want becomes a count in
  the first ring (`aridBeside: 3`: at least three desert/oasis/floodplain
  hexes among the six neighbours, a new want kind in the M1 vocabulary,
  data-declared), `riverOrFloodplainWithin: 1` kept so the town drinks;
  `terrain.desert` **2** (a preference, not a penalty), `floodplain` 3,
  `oasis` 3, `river` 4; the M1 fallback order stands (want met → want
  dropped → plain). M2's agent builds it with its measurement: the
  24-seed sweep prints Akhenaten's arid-neighbour count per seed and
  pins ≥3 wherever a standard map has such a site at all. `docs/leaders.md`
  start-bias section follows.
- (tttt) **New mapgen defaults — RULED** (the user, 2026-09-11: *"new
  defaults for mapgen: water minlength 5 minspringelevation 0.65
  pitlakemintiles 3500 maxSize 15, luxuriesmincopiespercontinent 4,
  mindistance 10"*). Set in `data/mapgen.json` by the orchestrator:
  `rivers.minLength` 4 → **5**, `rivers.minSpringElevation` 0.8 →
  **0.65**, `rivers.pitLakeMinTiles` 5000 → **3500**, `lakes.maxSize` 8 →
  **15**, `resources.luxuryMinCopiesPerContinent` 2 → **4**,
  `starts.minDistance` → **10** (this supersedes (rrrr)'s 12 as the
  floor; the ceiling 20 and the contact radius stand; M2 told). Every
  seeded map moves, so seeded fixtures re-pin where they must; a replay
  change on the held stack (schema stays 115). `docs/mapgen.md` follows
  the figures.
  **Set** (held `1688273`, on :5199). The full gate showed **21 seeded
  pins moved**: the orchestrator re-aimed two (pit lakes pool on
  standard now — the shape pinned; the forest deal's by-one invariant
  measured with ponds held still, since `traceRivers` runs after
  `assignFeatures` and a pond drowns a forest hex); an agent re-derives
  the seeded fixtures (statecraft's coastal towns, aiBot's grown game,
  the explore digests, the religion and finish-line replays, "the ground
  did not move" ×3) and re-examines three river claims (springs "on
  range ground" at 0.65; a too-short trace kept; the quota); M2's agent
  owns the start-side four (twelve seats at a floor of 10 on standard no
  longer all fit the mainland — the honest answer is the `shortfall`
  report, the pin narrowing to rosters the map can seat).
  ▢ **the twelve-seat roster at floor 10**: the floor is ruled for six;
  what a twelve-seat standard game does (relax with a report, or refuse
  the count in the stepper) is the user's — M2 reports the measurement.
- (rrrr) **Starts further apart — RULED, M2** (the user, 2026-09-11:
  *"another leader spawned 8 tiles from me -- ideally we should have some
  distance between players, maybe 15 tiles?"* → the diagnosis below →
  *"lets raise the floor to 12 and ceiling to 20, i can mess with the
  mapgen settings once i see some example starts at 12"*). **Today**
  `starts.spacingFactor` 0.55 × √land clamped to [`minDistance` 5,
  `maxDistance` 16] — the standard map aims at 16 — but the greedy sweep
  relaxes the spacing a hex at a time down to the floor whenever nothing
  fits, and a leader's want (M1: mountain, river, pasture, desert) is
  seated first, so a want with no hex at 16 pulled the spacing down
  before the want gave way; hence a rival at 8. **M2 builds**: (1)
  `minDistance` **12**, `maxDistance` **20** (standard still aims at 16
  and never accepts under 12; the user retunes from the lobby); (2)
  **wants yield before distance does** — the seating order of relaxation
  is: the want's criteria first (`meets` dropped, then the bias), and
  only then the spacing, never below the floor; (3) a **contact
  penalty** in the site score: a candidate loses `starts.contactPenalty`
  per rival start already chosen within `starts.contactRadius` (12)
  hexes, so distance is preferred before it is forced — a labelled line
  in `scoreStartSite`'s list (rule 5's shape), shown in the lobby's start
  rows; (4) **measured**: a slow sweep over 24 seeds × 6 figures on
  standard prints the minimum pairwise start distance per seed and its
  distribution, pinned to a floor of 12 everywhere the map can seat six
  at all; the mapgen lobby's start rows print each seat's distance to
  its nearest rival so the user sees the example starts. `docs/mapgen.md`
  follows the knobs.
  **M2 built** (2026-09-11, held). Findings first: (a) **standard aims at
  20, not 16** — `spacingFactor` 0.55 × √1813 land = 23, clamped to the
  new ceiling; 16 back would need `spacingFactor` ≈ 0.376, unruled;
  (b) the **crowding line is inert at radius 12**, because every
  candidate is already ≥ spacing (20) from every chosen start — measured
  0/6/12 penalty identical; the radius is what buys distance (12 → 15.33
  mean, 22 → 15.58, 26 → 15.83), so the orchestrator shipped
  `contactRadius` **26** with `contactPenalty` 6. **Distribution,
  standard × six figures × 24 seeds (min pairwise)**: before — min 10,
  median 14, three seeds under 12, thirteen under 15; after — **min 12,
  median 16**, none under 12, five under 15; no shortfall. The ladder:
  per chair, pool outer (accepted, then refused) and spacing inner
  (board's own → floor, wants met → wants dropped, then the floor gives
  way to 1 and the near neighbour is reported) — "bias kept → plain" is
  the rung the ladder deliberately lacks (a bias reorders, never filters,
  so it cannot fire); relaxation per chair (measured identical to shared).
  `planStartPositions`/`planStartPositionsFor` return `{starts,
  shortfall}`; the lobby's start table gains a **Rival** column and the
  shortfall sentence. **Akhenaten**: `aridBeside: 3` (a new want kind in
  `START_WANT_MEASURE`), terrain {river 4, floodplain 3, oasis 3, desert
  2}: three arid neighbours on **0 → 11 of 24** seeds, mean 0.9 → 1.9 —
  19 boards grow such a site, the spacing spends most before his chair.
  **Want rates the distance cost** (of 24): Al-Ma'mun river-within-2
  24 → 20, Mithridates 24 → 19, Akhenaten's river 24 → 23; every other
  criterion 24 → 24. Pins: core (spacing 20 and the clamp; the crowding
  line's value/fold/absence; "drops a want before it drops a hex" on a
  synthetic board; duel × 12 seats everyone with honest shortfalls), the
  slow distribution sweep (`startSpacing.slow.test.ts`), `leaderCriteria.ts`
  shared with the stress sweep (M1's flat 95% floor retired for a rate
  table). Duel × 4 cannot hold a floor of 10 (432 land) — its pin is the
  shortfall's honesty. ▢ `spacingFactor` if the user wants standard at
  16 rather than 20.
- (ssss) **The city banner's canton loses its shield — RULED** (the
  user, 2026-09-11: *"remove the banner from the left of the city
  screen, it looks awkward. Maybe just the icon (and not the outline of
  the shield motif) will do"*). The plate's canton (`.city-banner-canton`,
  H7: a shield-shaped field in the primary with the charge in the
  secondary) becomes the **charge alone** — no field, no shield shape —
  inked in the seat's **primary** on the plate's parchment; the plate's
  rim keeps the primary. The Heraldry trap's "never straight in seat
  ink" is amended: the *plate* is the parchment the charge sits on.
  Orchestrator's, small.
- (qqqq) **After the first look at H7 — five rulings** (the user,
  2026-09-11, on :5199: *"the unit icons are way too thick -- also the
  borders look off, the line border around the accent overdraws past
  where they meet. Could you take a look and fix yourself? Leader
  unlocked units should cost maintenance based on the age they're
  unlocked (which is how normal unit maintenance works, right?), horde
  camp should refill every time, please make sure to tell the user its
  ability in the selection. Great mosque of djenne should give an extra
  charge to prophets and apostles. barbarian war elephents are fine,
  xiongnu city list is fine. did the agent use the same colors as you
  listed, they look different in game"*). (1) **Badge** — the
  orchestrator retunes `pieces.badgeScale`/`badgeRing` by eye on :5199
  (thinner ring, a touch smaller). (2) **Border stitch overdraw** — the
  inner strip runs past the corner where two edges meet; the orchestrator
  fixes the strip's end caps in `cities3d.ts` (`stitchBand`) so the
  stitch stops where the line does (mitred or shortened by its own half
  width). (3) **Uniques' upkeep — RULED**: a unit no technology names is
  priced by **the age of the row that opens it** — for a leader's unique
  the age of its deck row (`leaderCardHome(card).age`), for a card's or a
  belief's the age its opener sits in where one is known, else the row's
  own `column`'s age — so a unique costs what a same-age unit costs
  (`unitUpkeep` reads one more source; `explainEmpireGold` untouched;
  pinned on the Fubing, the Khopesh and a plain spearman of the same
  age). (4) **Horde Camp — refills every time**, as built; the card's
  `text` and the building's `note` say it plainly ("a mounted unit that
  steps onto one of this town's pastures has its full movement again,
  every time") so the draft sheet and the leader sheet tell the player
  what they are taking. (5) **Great Mosque of Djenné**: its "+1 charge"
  reaches **prophets and apostles** — the class filter names the two
  rows (or the marker both carry and nobody else does, if one exists —
  never the model class); the walk-every-table pin in
  `test/sim/religion.test.ts` gains the exception (this one line may
  reach a prophet and an apostle, and only it). **Ruled fine**: barbarian
  war elephants in the third age; the Xiongnu city list. (6) **The
  colours** — the orchestrator checks the in-game inks against the doc's
  hexes (toon shading and the parchment wash may be the difference; if
  the data differs from the doc the sync test would have said so).
  **Done by the orchestrator** (2026-09-11): (1) the badge back to the
  grid's size with the ring a shade thicker (`badgeScale` 1 ·
  `badgeRing` 1.15 — the user: *"make them what they were before but a
  tiny smidge thicker"*), the pin re-aimed at the dials rather than a
  figure; (2) the border overdraw was a save from before H7 — the user
  confirmed the borders read right on a fresh board; nothing changed;
  (6) the data carries the doc's hexes exactly (the sync test holds; the
  literal hex reaches the board through `playerPieceColor`) — what
  differs in game is the toon shading and the line's opacity over
  vellum, not the ink. **And a sixth**: the **selection ring** on a
  chosen piece's hex wore the data file's terracotta; it now takes the
  seat's primary (`OverlayState.selectionColor`, handed down beside
  `lockedColor`), the hover ring keeping the accent — a cursor belongs
  to nobody; pinned in `overlays3d.test.ts`. **(3) (4) (5) built** (held):
  `ageThatOpens(type)` in `leaderData.ts` — the deck row's age, else the
  row's own column's age band — read by `unitUpkeep` after the tree's
  own clause; the ten uniques' deck ages and columns agree exactly, so
  the Fubing costs a spearman's keep and the Khopesh a swordsman's; the
  Templars (belief-opened) price off their column too; `awaitsTech`/
  retired hulls unchanged; ten pins. The Horde Camp's card and note say
  the refill plainly — and say **a soldier of yours**, not a mounted one:
  the built rule (`arriveOnTile`) is `isCombatant`, as `docs/leaders.md`'s
  row rules ("military units regain all movement") — ▢ if the user meant
  mounted only, that is a rule change. The Mosque's line became two
  (`type: prophet`, `type: apostle`); the walk-every-table pin carries a
  key path and grants the exception to those two lines alone, and
  nothing reaches an inquisitor. **Found beside it** — ▢ **the Great
  Ziggurat's `purchaseRider`** also targets `consecrates: true`: a −25%
  on the retired augur alone, dead the same way; needs a ruling (prophets
  and apostles too?).
- (pppp) **A figure's cities carry its empire's names — RULED** (the
  user, 2026-09-11: *"let's also create a list of ~15 names with
  historically accurate cities from the civ's empire (in order of
  importance/size) so that when new cities are founded, they take on
  historically accurate names"*). **Today** `nextCityName` hands every
  seat the same invented list (`rules.cities.cityNames`, twenty-four
  names) indexed by how many towns the seat holds — so two seats' first
  towns share a name, and a razed town's name comes round again. **L5
  builds**: `LeaderDef.cities: string[]` (about fifteen a figure, in
  order of importance; the table in `docs/leaders.md` "The cities" is
  the spec of record, doc ↔ data sync-tested, the user's to retune);
  `nextCityName(state, ownerId)` becomes: the seat's figure's list in
  order, **skipping any name a standing city anywhere already wears**,
  then the plain list the same way, then the numbered fallback — a pure
  function of the state as today, the result still stored on the city.
  A plain seat (no figure) walks the plain list with the same skip, so
  two plain seats no longer twin. Deterministic (array order, no dice);
  a replay change on the held stack (schema stays 115). The Compendium's
  leader shelf lists the figure's cities under the deck. Pins: a
  Pachacuti seat's first town is Cusco and its second Quito; a name a
  rival already wears is skipped; a razed town's name is reused only
  once no standing town wears it; a plain seat's first town is the plain
  list's first and a second plain seat's is its second; the fallback
  numbers as today; doc ↔ data; the replay pin.
  **L5 built** (2026-09-11, held): `LeaderDef.cities` (fifteen a row,
  validated non-empty, no blanks, no duplicates); `nextCityName` walks
  the figure's list, then the plain list, then numbers — each skipping
  any name a standing town wears (a `Set` as a membership test only,
  never iterated); the number counts the seat's towns past both lists,
  floored at one (new and load-bearing — under the skip the fallback can
  be reached early) and walks past any standing "<seat> <n>"; the
  Compendium's leader shelf says "Its towns are named …, in that order".
  `test/sim/cities.test.ts`' old pin that two seats twin on the first
  name was reworked to the new rule. Ten pins incl. a six-figure replay.
- (oooo) **Two colours a figure, and the board wears both — RULED** (the
  user, 2026-09-11: *"every leader should have a different color to
  differentiate them. Could we have them be two colors like civ 5/6 and
  update the banners/borders accordingly to accomodate two colors? Lets
  also make the unit banners show the colors with a larger/thicker
  accent, they're a bit hard to see currently. Try to make each civ's
  colors somewhat historically accurate."*). **Today** a seat has one
  ink (`PlayerSpec.color`, the palette's by index) and a charge on a
  parchment canton; a leader carries no colour. **H7 builds, after L4**
  (it reads L4's `SEATS` and `seatLeaders`): (1) `LeaderDef.colors:
  {primary, secondary}` in `data/leaders.json`, the table below the spec
  of record in `docs/leaders.md` (doc rows ↔ data rows, sync-tested);
  a seat under a figure takes the figure's pair, a plain seat the
  palette's ink with a derived secondary (ink on parchment); **two seats
  never share a primary** (the cast is distinct already; the palette's
  inks stay clear of the six primaries — pinned by a hue distance);
  (2) `PlayerSpec.secondary?` beside `color` (config, never state — the
  Heraldry trap), `heraldryFor` unchanged (the charge is a string),
  the canton draws the charge in the **secondary** on a **primary**
  field (Civ's reading: primary = the field/fill, secondary = the
  device/trim); (3) **borders**: the territory line in the primary with
  an inner stitch in the secondary (one extra instanced strip in
  `territory`'s layer, the width in `data/view3d.json`); (4) **city
  banners** (`cityBanners.ts`): the plate's rim in the primary, the name
  in ink as today, the canton primary-field/secondary-charge; (5) **unit
  pieces** (`pieces.ts`, three meshes over one buffer): the sculpt in
  the primary, the outline in the secondary — and the **roundel/badge
  over the piece larger and its ring thicker** (the user's ask; tunables
  `pieceBadgeScale`, `pieceBadgeRing` in `view3d.json`, the flair gallery
  gets a stall with both sliders and every figure's pair side by side);
  the hit bar untouched; (6) every roster surface (landing canton, leader
  sheet, spectator, arena seat labels, compendium leader shelf) prints
  the pair; (7) `signUnits`/`CityLook` unchanged — colours ride the
  owner. Determinism untouched (render only). **The palette** (the
  user: "somewhat historically accurate"; every figure is a proposal
  the user may retune in the doc — the sync test follows the doc):
  Pachacuti **maroon / sun gold** (the Sapa Inca's red fringe, the
  sun); Taizong **jade / ivory** (Tang jade, court white); Modu
  Chanyu **sky blue / bone** (Tengri's eternal blue sky, felt and
  bone); Akhenaten **sun orange / lapis** (the Aten's disc, Egyptian
  blue); Al-Ma'mun **black / gold** (the Abbasid black banner, gilt);
  Mithridates **Tyrian purple / silver** (a Hellenistic king's purple,
  the star-and-crescent in silver). Pins: doc ↔ data; six distinct
  primaries and none within the palette's hue distance; a seat's pair
  in `GameConfig` is what every surface reads (no second source); the
  canton's field and device inks; the border stitch instanced once per
  game; the badge tunables read from data; `signUnits`' list unchanged.
  **H7 built** (2026-09-11, held): `LeaderColors {primary, secondary,
  names}` validated at load (lower-case hex, the halves distinct, two
  words); `PlayerSpec.secondary?`/`Player.secondary?` copied iff present
  (a roster without it snapshots byte-for-byte); `src/art/seatInks.ts`
  the ONE fallback (`secondary ?? palette.ink` — the outline shell's own
  ink, so a plain seat's board is the board it was; a source sweep
  refuses a second `secondary ??` anywhere); the territory stitch a
  `stitchBand` strip hoisted once per board build (`territory.
  stitchWidth`); the plate's rim `--banner-color`, the canton
  `--canton-field`/`--canton-device`; the piece's outline washed in the
  trim; the badge **0.40 → 0.54** across, its rim **0.042 → 0.091**
  (`pieces.badgeScale` 1.35 · `pieces.badgeRing` 1.6), hit target and
  lift following; `playerPieceColor` gained a literal-hex clause below
  the named table (a figure's maroon could not otherwise reach the
  diorama — every palette ink pinned unchanged). **"Hue distance" is a
  weighted-RGB separation** (redmean), not a hue angle — a grey has no
  hue and the Abbasid black against the palette's ink is the pair that
  matters; `MIN_INK_DISTANCE` 40, tightest live pair Taizong/Teal at
  44.6, the doc's colours section says so. Twenty-one pins in
  `test/render/seatInks.test.ts`; the gallery stall "the seats' two
  inks" with three sliders. Not browser-checked.
- (nnnn) **Six seats by default; a stepper, not a mode list; every
  rival plays a figure — RULED** (the user, 2026-09-11: *"how are bot
  games constructed now? do they choose a leader when the player does? We
  should have 6 players default on the standard map (revise the options
  panel to add/subtract players instead of the current dropdown listing
  out all options, default to 6 players including the player on a
  standard map)"*). **Today**: the Seats control is a mode list (`You vs
  one bot` · `Full game (you and three bots)` · `Solo` · `Sandbox`),
  default one bot; the palette (`SEATS`, `gameSetup.ts`) is four inks;
  rivals in a full game cycle three personas; and rivals take a leader
  **only when the human does** (`rivalLeaders`: the rest of the sheet in
  order — *No leader* leaves every seat plain). **L4 builds**: (1) the
  Seats row is a **stepper** — `−  6  +` — counting players in total,
  you included, from the rules' `minPlayers` to `min(maxPlayers, the
  palette)`; **default 6**, and the default size **standard** (the
  landing's size select starts there); the `seats` select's id is kept on
  a hidden input or the stepper's value element so `currentConfig` and
  the tests read one place; (2) **one palette**: the six-plus inks the
  mapgen lobby already carries (`src/mapgenPage/main.ts`'s roster — pine,
  wheat beside the four) move to `gameSetup.ts`'s `SEATS` and the lobby
  reads them there (one roster, two pages); seat inks and charges by
  index (`heraldryFor`); (3) **every rival plays a figure**: rivals draw
  **distinct** leaders from the sheet minus the human's pick, in an order
  hashed from the seed (a pure hash in UI land — `hash3`/`hashUnit`'s
  family, never the sim's `Rng`, never the `webciv:gameplay:` separator),
  so a seed is a cast; with more rivals than figures the extras sit under
  none; *No leader* for the human still leaves the rivals their figures;
  (4) rivals' personas cycle the full game's three (wide · tall ·
  warmonger) then balanced; the single-opponent persona select shows only
  at two seats; (5) **hot-seat** (every seat human) stays reachable as a
  small labelled checkbox in the map card's fine print — a dev harness,
  not a mode in the list; solo is the stepper at one. `rosterFor` keeps
  its name and takes the count; `seatRoster.test.ts` (reads the UI
  sources for `realPlayers`), `gameSetup.test.ts`, `leaderScreens.test.ts`
  follow; the config's `players` array is the only output. Pins: default
  config is six seats on standard with six distinct figures; the stepper
  clamps; the same seed casts the same figures; a different seed may cast
  differently; the human's *No leader* writes no key on seat 0 and figures
  on the rest; hot-seat writes `isHuman` on every seat; the spectator and
  arena pages untouched.
  **L4 built** (2026-09-11, held): `SEATS` grows to twelve inks, each
  the exact hex of its seat-order fallback in `view3d.json` (Grape ·
  Brook · Timber · Steel · Ink · Brass · Sky · Earth join the four),
  pinned to `playerPieceColor`; `MIN_SEATS`/`MAX_SEATS`/`DEFAULT_SEATS`
  (6)/`clampSeats`, `DEFAULT_SIZE` standard, `rosterFor(count, {persona?,
  hotSeat?})`, `seatsAskPersona` (two seats alone); the mode list, its
  four names and `FULL_GAME_SIZE` gone (nothing else read them); the
  Seats row an `<output id="seats">` between two buttons, arrow/Home/End
  keys; the hot-seat checkbox in the fine print; rivals' figures sorted
  by `hash3(seed, sheetIndex, salt)` with sheet order the tie-break — a
  source pin holds it off the sim's `Rng`, the gameplay separator and
  `Math.random`; the mapgen lobby reads `SEATS` (its own palette
  deleted). Not browser-checked. ▢ `lobby.ts`'s `MAX_SEATS` is still the
  rules' figure (agrees at twelve today).
- (mmmm) **The wild's mount follows the tier — built** (the user,
  2026-09-11, on :5199: *"i see barbarian horseman spawning in age 1 …
  if anything it should be a war chariot"*). A camp in horse country
  mustered the **first** `mounted` military row in the unit table from
  `horsemanFromTurn` whatever the age — and that row is the horseman, an
  Æra III piece (The Cataphract's node). Now `barbarianMountType` mirrors
  `barbarianMeleeType`: the strongest mount **a technology names** that
  the median tier has reached, else the mildest the tree names (today the
  chariot of The Wheel); "named by a node" excludes every leader-,
  card- and belief-opened mount and every retired row without this file
  naming one. The turn gate still says *whether* there are riders; the
  tier says which. Note: the horseman's node also opens the war elephant
  (stronger), so a third-age camp rides elephants, resource gating
  ignored exactly as the footman ladder ignores iron — ▢ if the user
  would rather the wild never ride an elephant, a marker on the row.
  Pinned: Æ1 tier → the mildest tech-named mount, never the horseman;
  the median at the horseman's node → the strongest that node names; the
  whole tree → tech-named, unretired, no leader's or card's row. On the
  held stack.
- (llll) **A built unit's spill: never onto a contested hex, never
  under siege — RULED** (the user, 2026-09-11, on :5199: *"i see units
  still being spawned outside the city when there's a city garrison. The
  biggest issue with this is when the city is sieged, it can overwrite an
  attacking unit"* → offered three, chose *"1 and 2"*). Today
  `spawnTileFor`'s ring walk asks `hasStackingRoom`, which counts pieces
  of the **same category** and never asks whose — so a built spearman
  cannot land on an enemy spearman's hex but can on an enemy settler's,
  and a built worker on an enemy warrior's; under siege that ring is
  where the attackers stand. When no hex has room the unit already
  **waits** (the head item keeps its hammers until room appears). **P4
  builds**: (1) **a contested hex is never a spawn hex** — the ring walk
  skips any hex holding a unit of another owner, whatever its category
  (one reading, in `spawnTileFor`, shared by the naval and land arms;
  the city hex itself is never contested — a foreign piece cannot stand
  there); (2) **under siege, nothing spills** — when `underSiege(city)`
  (the derived reading, never stored) a built unit takes the city hex or
  waits; the purchase path is untouched (P3: the hex or refused). The
  city panel's head item says "waiting for room" in the quiet voice
  while a completed unit waits (production banked, no overflow lost, the
  turn the hex clears it lands); the bots' production chooser must not
  thrash on a waiting head (`chooseProduction` treats a waiting unit as
  progress, not a stall). Vanilla spill in peacetime stands (option 3,
  no spill ever, declined for daily play). Pins: a hex with an enemy
  civilian is skipped for a military spawn and vice versa; a hex with an
  own unit of another category is still taken; besieged → the unit waits
  with the centre garrisoned and lands the turn the garrison steps out;
  not besieged → the spill still happens; the head keeps its hammers
  across the wait; the panel's sentence. A replay change on the held
  stack (schema stays 115).
  **P4 built** (2026-09-11, held; gate 244 files / 6399): `foreignUnitAt`
  inside `spawnTileFor`'s ring walk, both arms — a skip, not a refusal,
  so every spawner (production, purchase, gifts, beads, great people)
  gets the contested-hex rule; `builtSpawnTileFor` passes `onCityHexOnly:
  underSiege(...)` for the completion alone (P3's option reused, the
  siege field built only on the turn a unit finishes); `payableUnitAt` +
  `productionAwaitingRoom` (the front row's finished-but-unplaced
  reading, one caller: the panel's "<Name> is waiting for room" in
  `--ink-faint`). **The bot needed nothing**: the `cityProduction`
  blocker fires on an empty queue only and both re-decision arms require
  a project at the front, so a waiting unit is progress already — pinned
  by a source register. Twelve core pins + a 120-turn replay.
- (kkkk) **The prophet's third charge, and the site it cannot plant —
  RULED** (the user, 2026-09-11, on :5199: *"it says my prophet has 3/2
  charges and i dont have the ability to plant a holy site"*). Two
  causes. (1) **"Workers gain +1 charge" reached the prophet** — the
  user was Akhenaten, so not the Corvée (a bot's card) but the same
  slip in four older rows: the prophet, apostle and inquisitor wear the
  worker's *model class*, and the worker-charge lines filtered by that
  model. Two of them (The Pyramids, State Workforce) carried a
  `consecrates: false` guard written when the augur was the consecrator
  — but the augur retired and the prophet never took the marker, so the
  guard excludes nothing; two (Tinkers' Guild, Vaucanson's legacy) had
  no guard at all. Every "workers +1 charge" line now names the worker
  row (`class: {type: 'worker'}`), the Corvée included; pinned for each.
  **The Great Mosque of Djenné** paid "+1 charge" to `consecrates: true`
  — the retired augur alone — so the line was dead; ruled and built
  under (qqqq): it reaches prophets and apostles. (2) **Planting a holy site for a
  faith already founded is unreachable by design** — Entry LVIII made
  planting *the* founding, `plantHolySiteError` asks `foundReligionError`
  unconditionally, and F2 priced the second arm (`plantHolySite` 2)
  without opening it. The user's F2 ruling stands as written:
  *"prophets can plant new holy sites that also consume 2 charges"*, and
  `docs/religion-v2.md` already says what a later site is — "a later
  site extends the tide but never moves the seat of the faith". **F3
  builds** the second arm: a prophet of an empire with a faith may plant
  a holy site (the `holySite` improvement, `WorkFamily 'prophet'`) on any
  own hex that takes it, off the city centre, for `prophetCosts.
  plantHolySite`; the site presses the faith as the first one does (the
  tide's sources are every holy site the faith holds — verify how
  `spreadReligion` finds its sources and make a second site one of them,
  never a second register), pays the site's yields, and moves nothing
  (`Religion.holySite` stays the seat; the belief drafts are the
  founding's alone). The unit sheet lists **Found religion** (no faith
  yet) or **Plant holy site** (a faith held) — one row, its name and
  price by `plantingCost`; the bots' prophet logic may plant a second
  site where it would otherwise idle (a want, priced like a work).
  Pins: refused with no faith on a second-site claim (it founds instead);
  accepted with a faith, two charges spent, the piece gone, the site
  standing and pressing; the seat unchanged; the city centre refused; a
  foreign hex refused. A replay change on the held stack (schema stays
  115).
  **Both built** (2026-09-11, held). (1) the five charge lines name the
  worker row; a walk over all five tables pins that no charge line
  reaches a prophet, apostle or inquisitor; the Tinkers' Guild pin keeps
  "newly created" and reads "workers". (2) **F3**: the tide never read
  `Religion.holySite` — `spreadReligion` walks the map for the
  `holySite` improvement per sweep, so a second site pressed the moment
  its stones were written and no register was needed; `plantHolySiteError`
  asks `foundReligionError` only on the founding arm, `plantHolySiteAt`
  has two arms (the drafts and the owed rung are the founding's alone,
  `holySite ??=` now load-bearing), `HolySitePlanting.founded` is
  two-valued and `CommandResult.planted` carries a later planting out
  for its own toast; the unit sheet's one row reads "Found religion" or
  "Plant holy site" by `plantingCost`; bots raise at most one site per
  town (`townWantingSite`), after founding and deepening; `explainStones`
  prices the want. Nine pins incl. a measured pressure rise and a
  byte-identical replay with second plantings in the log.
- (jjjj) **The landing screen composed to the mock — built** (the user,
  2026-09-10: *"could you do a design pass on the landing page? It's
  very different than the mock"*). On the held stack: the frontispiece
  becomes a masthead band (title, device, double rule, epigraph, stamp)
  with the map card and the seat card as siblings below it (`340px |
  1fr`, one column under 900px), both wearing the specimen's eyebrow ·
  title · hint; field rows label-left / control-right on a hairline (the
  clipped "OPPONE" mono column gone); Random beside the seed; **Begin
  as …** the one strong action, in ink, in a rail at the foot (keeps
  `id="start-game"`, `form="landing-setup"` so Enter still submits);
  the roster four across at 1440 wrapping to one, the repeated
  "from the first turn" eyebrows replaced by one lede, deferred clauses
  a size down; hover wash on unchosen faces. Fits 1440×900 without a
  scroll. ▢ `data/leaders.json` still carries no `family`/`spectrum`,
  so the mock's family line and spectrum bar print nothing.
- (iiii) **The leaders' deferred halves — RULED** (the user, 2026-09-10,
  on seeing the decks on :5199: *"it looks like many of the leader
  abilities aren't implemented?"* … *"let's implement every effect that
  isn't a one-time boon. I'm not sure about the one time boons, to be
  honest"*). L2a built 39 of the 72 cards whole, 29 with a half the
  evaluator could not say (printed on the card as a plain "not yet"
  line), 4 doing nothing, and three of the six bonuses short a clause.
  **Ruling**: every deferred line on a **passive**, a **unique** or a
  **leader bonus** is built — the design is the card's row in
  `docs/leaders.md` (the spec of record; `data/leaders.json`'s `text` was
  trimmed to what was built and is rewritten to the whole rule as each
  lands, the `deferred` line struck). The **boons' deferred lines are
  not built** — ▢ the user doubts one-time boons as a column at all
  (replace with a second passive? keep and finish? their call), so their
  sixteen "not yet" lines stand until that ruling. **L3, three fences on
  the held stack** (schema stays 115 — nothing on it has landed):
  **L3a — the evaluator's shapes** (`statecraft/evaluator.ts`,
  `describers.ts`, the types, `draft.ts`, the counts): a `CityScope` for
  *joined to the seat by road* (Pachacuti's Tribute Road) and *beside a
  river* (Taizong's Great Yangtze) so only those towns are cheaper to
  hold; puppets sending culture of their own (The Heavenly Khagan); the
  Tribute of the Han paid as a **share of what the puppets make** rather
  than per citizen; The Great Poets lifting the **artists'** acts alone
  and the quickened years of work and song the doc promises; The Rite of
  the Sky kept **only while a rite burns** in the empire; The House of
  Millions of Years counting a work only where it **sings** (pays
  culture); **The King's Friends** — every government opens one more
  free chair (a card rule widening the slots, read by `draft.ts`'s slot
  rebuild). **L3b — the unit rules** (`combat.ts`, `movement.ts`,
  `unitData.ts`, `data/units.json`): the Slinger unslowed by hills; the
  Khopesh's +3 **anywhere the seat's faith is kept** (every following
  hex, not only towns); the Fubing kept for nothing **only while it
  garrisons a town**; the Chanyu's Guard emboldening the horse archers
  beside it (an aura line, the general's shape); the Camel Archer's
  arrows keener per great work the realm has planted; the Pontic
  Peltast's mend on a kill **for the peltast alone** (the rider scoped to
  the row); Modu's +1 pace **on grass and plains only**. **L3c — the
  ground and the halls** (`yields/hex.ts`, `improvements.ts`,
  `buildingEffects.ts`, `data/buildings.json`, `purchase.ts`):
  Pachacuti's bonus paying a farm once for its mountains however many;
  Akhenaten's lake farm paid as a river farm; the Terraces letting a farm
  be cut into a hillside that refuses one; the Horde Camp's herds giving
  a column its marching back; the Valley of Kings counting only the works
  raised in **its own town** and letting works be hurried with faith; the
  House of Learning learning from the great people the realm has called.
  Each agent: merge the gate's `held` first; touch only its own rows in
  `data/leaders.json` (and `data/units.json`/`buildings.json` rows it
  opens); rewrite each landed card's `text` to the whole rule through the
  describers, strike the `deferred` line, regenerate
  `test/fixtures/cardText.json` only for its rows; every new shape is a
  JSON row read by ONE evaluator and fails the register test if declared
  unread; a half that truly cannot be said stays deferred with the
  reason. Pins per card: the rule fires where it should and not where it
  should not.
  **L3a built** (2026-09-10, held): all eight whole. `CityScope`
  `riverside` (the centre's river edges — a lake is not the Yangtze) and
  `puppet`; `CardAuthorityEffect.scope` (the Tribute Road narrowed to
  road-joined towns, the Yangtze to river towns — kept as L2a's
  *capacity* reading, since a cost cut is a scope-less `meterRule`);
  the Khagan's puppets pay culture as a puppet-scoped city line, the Han
  tribute two `city/share` rows scoped to puppets; `effectAmplifier`
  gained `family` (the Poets lift the artists alone) and the quickened
  years are a new `greatPersonAct` occasion with a family-narrowed rider
  hanging five turns of +10% production and culture; `EmpireCondition`
  `keepingRite` (absolute stamps) wraps the Rite of the Sky; the House of
  Millions' reading fixed — a wonder singing only through a clause
  (Hagia Sophia in temple towns) counted as silent; **The King's
  Friends** is a `slotRider` read once by `chairCount` (`draft.ts`),
  `refitSlots` resizing on the pick without an adoption's amnesty. Eleven
  pins in `test/sim/leaderHalves.test.ts`. **L3b built**: `UnitDef.
  ignoresHillCost` (the Slinger, priced as the flat land under the climb
  in `tileMoveCost`, the one place); `upkeepRebate where: 'garrison'`
  (the Fubing); the Khopesh's reach was already whole (stale note; a
  `null`-vs-`undefined` slip in `followingTerritory` fixed); the Guard's
  aura was sayable already (`combatLine` + `beside`); the Camel Archer
  +1 per great work **in the capital** (`CombatScaleCount
  capitalGreatWorks`, the doc's row over the board's paraphrase);
  `windfallRider.class` narrows a rider to the actor's row (the
  Peltast); `unitStat where: 'grassOrPlains'` (Modu's pace, an allowance
  read like the ship's — a point spendable only on some steps would be a
  second currency and a fifth pricer). Twenty-one pins in
  `test/sim/leaderUnits.test.ts`. `docs/leaders.md`'s deferred bullets
  for these fifteen are stale — ▢ the orchestrator's doc pass when L3c
  lands.
  **L3c built** (2026-09-10, held): Pachacuti's farms pay **per adjacent
  mountain** — the doc's row ("for each adjacent mountain") over this
  board's paraphrase, `Tile.mountainAdjacent` → `Tile.mountainsBeside`
  (a count; the seeded digests moved by the field name alone, proved by
  rewriting it back), `CardPaysEffect.perAdjacentMountain` multiplying
  the bag into ONE labelled hex line; Akhenaten's lake farm was already
  paid (the note was wrong — `computeFreshwater` marks lakes); the
  Terraces are a `BuildingDef.terraces` marker → `HillsWaiver
  'townTerraces'` in `hillsWaived`, asked of the town whose borders hold
  the hex; the Horde Camp is `BuildingDef.restoresMovementOn: 'pasture'`,
  a sixth clause in `arriveOnTile` beside The King's Road (a combatant
  of the town's owner resting on a pasture inside its borders is set to
  full movement) — ▢ **it fires per step**, so a column hopping pasture
  to pasture is refilled at each; the doc says "when stepping on one",
  so no cap was invented — the user's call whether once a turn; the
  Valley of Kings counts `wonders within: 'city'` and
  `BuildingDef.faithBuysWonders` lifts the wonder refusal for faith in
  that town alone (priced by the ordinary faith-per-hammer fold); the
  House of Learning pays +1 science per great person the realm has
  called (`CountKind greatPeopleCalled`, monotone). Thirty-two pins in
  `test/sim/leaderGround.test.ts`. With L3a and L3b: every passive,
  unique and bonus line is whole; the sixteen boon lines stand.
  The stack's gate found two things in L3a worth the register: the
  great-person act's payout emptiness check moved beside the composer
  (`windfallPayoutIsEmpty`, so the renown column keeps its six readers),
  and `adoptGovernmentAt` joined `forgetTheLaw`'s register — the chair
  count reads the law between the government changing and the chairs
  being rebuilt, and a memo warmed there let a benched Order go on
  paying. Held green: 242 files, 6374 tests; serving on :5199.
  **Found by L3b, needs a ruling** — ▢ **every leader-unlocked unit costs
  zero maintenance**: `unitUpkeep` prices a piece off its *unlocking
  tech's* age, and no tech names a leader unique (ten rows), so the
  Fubing's "kept for nothing while garrisoning" is true of every unique
  today. Recommendation: price a row the tree names nothing for off its
  own `column` — the standard `docs/production-costs.md` already uses
  for its hammers — so a unique costs what a same-column unit costs; a
  one-line change in `unitUpkeep` plus a pin. The user's call, since it
  is a balance figure landing on ten rows at once.
- (hhhh) **A bought unit stands on the city hex, or is not sold — RULED**
  (the user, 2026-09-10, mid-playtest: *"purchased units should spawn on
  the city tile. If a unit of it's type is already occupying the city
  tile, it should block purchasing"*). **P3 builds**: a unit bought with
  gold or faith is placed **on the city hex** and nowhere else; if the
  city hex already holds a unit of the same stacking category (the
  stacking rule's own reading — `hasStackingRoom`; a military piece
  blocks a military purchase, a worker a civilian one, a trader a
  trader), `purchaseError` refuses with one plain sentence ("A Warrior
  already stands in Uruk — move it first") **before** any coin moves
  (validate fully; a refused purchase is byte-identical); the city
  panel's buy buttons wear the `.wanting` voice with that sentence; the
  bots read the same gate (they already ask `purchaseError`). Production
  completion is untouched (a built unit keeps today's placement). Pins:
  a purchase lands on the hex; a blocked purchase is refused and the
  state unchanged; the panel's sentence; the purchase bucket stamp is not
  spent by a refusal.
  **P3 built** (2026-09-10), and it too is a **replay change (schema 115,
  held)**: a v110 log that bought into an occupied hex was accepted then
  and is refused now. `spawnTileFor` gained `onCityHexOnly` (cuts the
  neighbour ring in both arms; a *built* unit keeps its spill because the
  town worked on it for turns and the player was not looking; a bought
  one is the player's own act on that hex this turn); `purchaseError`
  names the blocker by category in `state.units` order; the panel's tag
  splits the refusal (vermilion, italic) from an ended turn (quiet). The
  bench needed a `marchOut` verb — nine purchase cases and four others
  had founded the town under its own escort and were refused. **Bot
  fallout**: the want book asks `purchaseError`, so a purchase want
  vanished in every garrisoned town. **Fixed**: `purchaseHexBlocker`
  (`purchase.ts`) answers the piece a sale was refused for, so the bot
  never rebuilds the sentence; `reachOf` keeps the want (out of reach
  only when the purse is short or the blocker has nowhere to go);
  `stepAsideFor` (`wants.ts`) picks the blocker's step — `canStopOn`,
  then friendly ground, then cheapest by `stepCost`, then direction
  order — and the buy arm issues that `moveUnit` and the purchase in the
  same turn's log; `undefendedCity` walks a piece back in. Four pins.
- (gggg) **Auto-explore spends the whole allowance; a siege mark on the
  banner — RULED** (the user, 2026-09-10, mid-playtest: *"units set on
  auto-explore should use all of their movement. Also, we need an icon
  for when a city is under siege"*). **X14 builds**: (1) an auto-exploring
  unit (`src/sim/explore.ts`, the standing order the End Turn runs)
  keeps stepping toward its aim while it has movement and a reachable
  unrevealed hex — a march, not a single step per turn; re-aim when the
  aim is reached or blocked; it never ends a turn with movement it could
  have spent (a hex it cannot enter, an enemy zone or fog with nothing
  left to see are the honest stops); pinned: a scout with 2 movement on
  open ground reveals more than one hex's worth per turn, and a march
  through the whole allowance costs the same as the equivalent moves
  (`stepCost`, no fifth pricer); (2) **a siege mark**: `underSiege` is
  derived (`siegeField`, never stored); the city banner (`cityBanners.ts`)
  shows a drawn mark on the plate when the town is besieged — a small
  vermilion ring of spears / a portcullis glyph in the atlas's own
  language (path data, never fetched), on the pill beside the name, with
  a hover word "Under siege"; the mark is a signature term (fingerprint,
  not per-frame); the 3D piece untouched; **the new mark joins the flair
  gallery in the same pass** (`src/flairGallery/`, a stall with the
  banner besieged and not); the city panel already says it — leave it.
  Pins: the banner shows the mark iff `underSiege`; the gallery stall;
  the signature changes when a siege begins and ends.
  **X14 built** (2026-09-10) — and it is a **replay change, so schema
  114** on the held stack rather than a hot-fix: an explorer that walked
  one hex a turn now walks two or three, so every ruin, camp and meeting
  lands on a different turn. The march is `marchExplorers` looping per
  piece (walk the route → recompute the seat's fog → re-aim → walk) with
  four honest exits (out of allowance · jammed · nothing to see · aimed
  but spent); the walk is a closure `turn.ts` hands down (`combat.ts`'s
  presser pattern) so `advanceAlongPath` stays the one mover and
  `collectCampBounties` the one camp reporter. The one discovery: a
  per-leg `recomputeVisibility` was necessary — re-aiming against the
  stale grid made the scout target the hex under its feet and stand down
  on an open map. Four seeds, ten turns: 10 → 17 and 12 → 14 hexes of
  displacement on the open maps, islands unchanged. The mark is a
  **portcullis** (a barred gate on three teeth, the yoke's construction,
  vermilion beside the name, "Under siege"), a second `CityMarkId`; the
  ring of spears was rejected as the `sun` charge at 13px. U8's "the
  badge stays on the panel" is overturned in the module docblock. The
  gallery stall shows quiet · besieged · besieged with walls down, one
  knob (the mark's size). Bots' explorers cover more ground per turn.
  **Cost checked** (2026-09-10): a reported 144 → 206 ms/turn did not
  reproduce — the whole march is ~7 ms of a turn (fog 1.05, search 5.5,
  path 0.3) and identical code varies ±14 ms cold-vs-warm on a loaded
  box; the search was still made 48% cheaper (what a hex is *for* asked
  before whether the piece may stand there; transit memoised per sweep)
  with byte-identical outcomes, pinned by two seeded 20-turn digests.
  The turn-100 happiness move (10.8 → 8.3 → 2.4 across X14 and P3 at
  eight seeds) was **sampling noise**: per-seat happiness has a standard
  deviation near 13, so sixteen seats read the mean to ±6.5; at 32 seeds
  pre-P3 and P3 sit at 10.1 and 8.3 (0.8σ), buys 1223 vs 1209, every
  step-aside followed by its purchase in the same turn, towns garrisoned
  99.5%. P3's `reachOf` was tidied into three ordered arms (money · the
  piece in the hex · everything else strikes the row as before), play
  byte-identical; two pins that the once-per-turn stamp and a standing
  shelf still strike the row. **Rule for the probe**: eight seeds cannot
  read happiness; a happiness question needs 32 seeds or a per-seat
  spread beside the mean.; the chariot's upgrade — RULED and built**
  (the user, 2026-09-10, mid-playtest: *"i'm finding it very hard to kill
  this city … was a palisade and stone walls always +10? Let's change
  them to be +5"*, then *"castle +5, bastion +5 too. Walls of uruk +10"*,
  and *"war chariots should upgrade into horseman"*). U9 had doubled the
  walls with the ladder (Palisade 5 → 10, Stone Walls 4 → 10, Castle 5 →
  10, Bastion 10 → 20, Uruk 10 → 20). Now **every wall line +5**, the
  Walls of Uruk **+10**; the War Chariot `upgradesTo: horseman`
  (`docs/units.md` regenerated). Data only, **no schema bump** (a playtest
  hot-fix: the user's current save keeps loading; the replay note rides
  with the held stack's next entry). Pushed f89d72b. Why a town felt like
  a fortress: the city's base is the *best unit its owner could train*
  (45 at Iron Working, 60 at Militant Orders), plus stacked walls (+20
  before this), 140 hp healing 20 a turn, and the garrison beat only
  below a quarter — ▢ the heal (`cityHealPerTurn` 20) and the capture
  fraction (0.25) are the next levers if towns stay stubborn.
- (eeee) **The Patronage reads the works — RULED** (the user, 2026-09-10,
  mid-playtest: *"does The Patronage not factor legacies from previous
  ages? my reading shows zero"*). Probed: legacies DO count — the ledger's
  `people` class (`ledgerClass.ts`, `classifyCard` → `isGreatPersonId`)
  takes every yield line whose card is a great person, and a legacy's
  lines carry the person's card (Enheduanna's +1 culture read as
  `people.culture` 1). **What does not count is the works themselves**: a
  great work's own tile yield (the academy's science, the landmark's
  culture, the manufactory's hammers) is a tile line and files under
  `tiles`, so a realm whose great people mostly stand as works reads near
  nought — against the doc's note ("their works, their gifts and their
  legacies"). **W4 builds**: the ledger classes a tile line whose
  improvement is a great person's work (`workForFamily`'s ids —
  academy, landmark, manufactory, customs house, citadel, holy site's?
  no, the prophet's is the faith's) as `people`; the works' card riders
  (Homer's "+2 on academies") already do; `docs/wager.md`'s note and
  `docs/yields.md`'s class table follow; pins: a work's tile line lands
  in `people`, a farm's still in `tiles`, The Patronage's standing moves
  when a work is placed. Also said plainly on the Abacus card: "since
  the deal" — a flow's opening is subtracted (`openingOf`).
  **W4 built** (2026-09-10, pushed 44ba14a, no schema): `classifyImprovement`
  in `ledgerClass.ts` reads `ImprovementDef.greatPerson` (the marker, never
  a name); step 2 of `explainCity` files a work's hex line under `people`;
  the prophet's holy site stays with the land; The Patronage's note now
  says "counted from the age's deal" (▢ the other flow rows' notes say
  "added up over the age" — the same thing, worded differently; the
  user's notes). Seven pins in `test/sim/patronage.test.ts`.
- (dddd) **Leaders — the system and the screens — RULED, queued** (the
  user, 2026-09-10: *"please queue up the leader and start screen
  implementation"*). Specs of record: `docs/leaders.md` (the six decks —
  Æra I–IV × passive · boon · unique, and each seat's **leader bonus** from
  turn one; the draft's shape: three cards when *you* enter an age, take
  one, the other two gone; player progression PARKED), the mockup
  (https://claude.ai/code/artifact/f38e46e5-e89a-4c77-9405-ffce47ff5364 —
  a new-game screen with the map card and the leader select, the age's
  draft sheet, the leader sheet with what each pick is giving you), and
  `data/leaders.json` (M1 — the rows exist with `startBias`; the decks
  join them). **Two batches, in order.** **L2a — the sim**: `LeaderDef`
  gains `bonus` (card effects, live from turn one — `liveEffects`'
  twelfth source) and `deck` (four rows × three cards, each a card with
  `kind: passive | boon | unique` and effects in the card vocabulary — a
  passive is a doctrine-weight effect list; a boon is a windfall/grant
  paid on the pick; a unique is `unlocksUnit`/`unlocksBuilding` of a row
  carrying `unlockedByLeader` — the rows for the uniques added to
  `units.json`/`buildings.json` with their sizes; a line the vocabulary
  cannot carry is **deferred and annotated** on the row, never bent);
  `Player.leader`, `Player.leaderPicks` (the card taken per age, absolute
  age keys), `Player.leaderOffer` (the three dealt when the seat's own
  tech age turned — drawn at the moment the age is entered, an announced
  occasion, an End Turn blocker `leaderDraft` like the wager's);
  `chooseLeaderCard {playerId, index}`; the bots appraise the three
  through `explainEffects` (W2's pattern) and pick; the Compendium walks
  the leaders (a `leader:id` shelf, every card from its row); schema
  bump. The six leaders' full decks as written in `docs/leaders.md` are
  the data; ▢ every figure. **L2b — the screens**, on L2a: the landing
  form becomes the mockup's new-game screen (the map card: seed, size,
  seats, the wild; the leader select with cantons, family, leader bonus
  and the Æra I row; Begin), the draft sheet on `modalShell.ts` (three
  cards in the three inks, "today it would be worth" lines folded from
  the sim, Take), the leader sheet (held picks with their live figures,
  the next age's three locked, the ledger of every line carrying the
  leader's name) behind a top-bar door, the spectator page naming the
  seat's leader. Both batches build on the held stack (S2 · F2 · M1) —
  the agent merges the gate clone's main into its worktree first.
  **L2a built** (2026-09-10, schema **113**; stacked on the held pile in
  the gate): `src/sim/leaders.ts` (the verbs), `src/ai/leader.ts` (the
  appraisal: a passive through `explainEffects`, a boon through the lump,
  a unique through the row it opens); `LeaderDef.bonus` + `deck` beside
  `startBias`; `LeaderCard.unlocks` declares a unique and the effect is
  composed from it; `LeaderBoon` = the bead's `windfall` and the wonder's
  `grants`, paid by `payWindfall`/`payGrants`; `Player.leader` ·
  `leaderPicks` · `leaderOffer` (presence-is-state); occasion
  `leaderOffered` from a new `leaders` phase directly after research (so
  the seat's *own* age is current; Æra I's row written in `newGame`, no
  dice — a leader draft cannot move a seed); blocker `leaderDraft` above
  `wager`; `chooseLeaderCard {playerId, index}`, the boon's things on
  `CommandResult.grants`; ten unique units and fourteen unique buildings
  (`unlockedByLeader`) with sizes and silhouettes; the Compendium's 21st
  shelf `leader:…`; 29 pins. **One rule the sheet did not name**: three
  Æra I boons hand a town something, so the Æra I pick waits (blocker
  silent, command refused) until the capital stands — L2b shows the row
  and says so. Deferred whole (do nothing, annotated): Modu's *The Horse
  Lords* and *The Great Raid*, Akhenaten's *The Great Conversion*,
  Mithridates' *The King's Friends* (nothing reveals a resource, lays an
  improvement, converts a neighbourhood at a stroke, or widens a
  government's slots); ~35 half-lines annotated; two gaps worth a ruling
  — ▢ a **scoped authority-cost** line ("cities of kind X cost 1 fewer
  authority", three cards) and ▢ a **per-puppet count**. Fixed beyond
  the brief: `moveAfterKill` never received the attacker's type (a
  class-narrowed row was skipped); the wild's footmen ladder could
  muster a leader-unique sword; "mounted archers" now prints as words;
  the building `mountainHold` renamed `ponticHold` (an Order had the id).
  A human seat with a leader sees "Your leader awaits" on End Turn with
  no sheet until L2b lands — L2b is building on top (agent flying
  2026-09-10, merged the gate's `held` branch first).
  **L2b built** (2026-09-10, no schema; on the held stack): the landing
  gains a second card (`#landing-leaders`, empty markup walked from
  `LEADER_IDS` by `src/ui/leaderSelect.ts` — a seventh figure appears
  with no page edit), one button a figure with the seat's canton, the
  bonus through `describeCard`, and the chosen one's Æra I row in three
  inks with the plain sentence that the pick itself lands on the first
  turn with a capital; *No leader* is default and writes no key (a
  leaderless config is byte-identical to before). **Rivals' figures**:
  the remaining leaders in sheet order behind yours, deterministic, no
  dice. Start's label reads "Begin as …". The **draft sheet**
  (`leaderDraftSheet.ts`, thirteenth on `modalShell`, raised by the
  `leaderDraft` blocker) — click to pick up, *Take* issues the command; a
  "today it would pay" stamp from `explainCardImpact` (a sixth
  `CardImpactSubject`, `leaderCard`; a boon is not ghosted — a lump is
  not a rate); refused cards greyed with the capital rule in `.wanting`.
  The **leader sheet** (`leaderSheet.ts`, fourteenth) behind a fifth HUD
  dock door wearing the seat's charge: the bonus, one block an age (taken
  marked, the two left greyed, locked rows with the techs that open the
  age), the ledger gathered from `readEmpire`'s lines by card id; a row
  never expires so the sheet can reopen the draft. Spectator roster names
  the figure. Notes: ▢ `data/leaders.json` carries no `family`/`spectrum`
  field, so the mockup's two lines are absent (a data decision); ▢ the
  Compendium's leader shelf prints a pure-boon card's effects only (the
  draft sheet composes the lump via `describeBeadBoon` + `grantWords`;
  `compendium.ts` could reuse the two calls); `grantWords` gained a
  moment lead ("when you take it"). Not browser-checked by the agent.
- (cccc) **Start biases in three stages — RULED** (the user, 2026-09-10:
  *"queue up the mapgen changes, and then verify that we can have
  satisfactory starts for the new leaders (the steppe leader is useless
  without horses, and relies on pastures, pachacuti relies on spawning
  near mountains, and mithridates is somewhat reliant on camps and
  plantations, wide leaders in general are going to have bad games if
  they don't have ample rivers near them)"* — corrected minutes later: **"tall leaders in general need rivers"**: the river criterion is the tall seats' — Akhenaten, Al-Ma'mun, Mithridates — with Pachacuti's river as his own growth line, not a wide rule). The spec of record is
  `docs/leaders.md` "Start biases — feasibility" and its "three stages"
  paragraph. **M1 builds** the mechanism before the leader system exists
  to carry it: (1) a new `data/leaders.json` — the six leaders by id
  (`pachacuti` · `taizong` · `moduChanyu` · `akhenaten` · `alMamun` ·
  `mithridates`), each row a `name`, a `startBias` { `terrain`: weights
  per line — river, floodplain, oasis, grassland, plains, hills,
  mountainAdjacent, coast — and `resources`: draw-weight multipliers per
  bonus kind within `startBiasRadius`, and `luxuries`: hand-draw
  multipliers per kind for the continent that seats them, and
  `furnish`: improvement kinds guaranteed within the rings — e.g.
  `["plantation", "camp"]` } — figures in data, never in code; the
  playstyle bonuses come later in their own batch and this file is where
  they will live; (2) `GameConfig.players[i].leader?: LeaderId` (a config
  field; a save carries its config, so no state schema); (3) **stage 1**,
  `startPositions.ts`: `chooseStartPositionsFor(map, seats)` seats in
  roster order, each seat scoring the board with its own bias as labelled
  score lines (soft, capped at `mapgen.starts.biasCap`, a share of the
  best unbiased site's score; never a rejection); the old
  `chooseStartPositions(map, count)` stays as the unbiased case; (4)
  **stage 2**, `resources.ts`: the bonus scatter's draw weight × the
  seated leader's `resources` multiplier within `startBiasRadius` of its
  start; the continent's luxury hand draw × the `luxuries` multiplier of
  every leader seated on that continent (cap and hostability unchanged);
  (5) **stage 3**, the furnishing: `ensureStartFurnishing` after the
  strategics — each `furnish` kind gets one suitable resource within the
  rings, **drawn from the continent's hand for a luxury** (hand or
  nothing) and freely for a bonus; and the base luxury guarantee tightened
  to hand-or-nothing (its whole-table fallthrough removed — ▢ if the
  sweep shows it starves a start, say so and keep the fallthrough); (6)
  the mapgen page prints each seat's bias lines and its furnishing; (7)
  `docs/mapgen.md` "Starts" and a `docs/leaders.md` note follow, both
  sync-tested where they mirror data. **The verification the user asked
  for**, as a slow test (`test/stress/leaderStarts.slow.test.ts`) and a
  report: over 24 seeds × standard × 6 seats each seated with one leader,
  the share of starts where — Modu has Horses within 4 and ≥ 2 pasture
  hexes; Pachacuti has a mountain within 2 and ≥ 3 hills within 2 and a
  river; Mithridates has a camp kind and a plantation kind within 3;
  Pachacuti a river within 1 (his growth line); the tall seats — Akhenaten
  a river or floodplain within 1, Al-Ma'mun a river within 2, Mithridates a
  river within 2 beside his coast and hills; Taizong grassland within 2 — **before (unbiased)
  and after**, and the mean unbiased site score of every seat before and
  after (a bias must not cost a seat more than the cap). Rule 2: every
  stage on the map's stream; same seed and roster, same world; the seed
  sweeps that prove every roster seats legally re-run with biases on.
  **M1 + M1b built** (2026-09-10; stacked on S2/F2 in the gate and
  **held**): `data/leaders.json` + `leaderData.ts`;
  `GameConfig.players[i].leader`; `chooseStartPositionsFor` (bias lines
  appended to `scoreSite`'s list, a **soft** cap `starts.biasCap` 0.2 —
  a hard clamp flattened every good site onto the cap and the bias did
  nothing; measured); **`startBias.wants`** — a closed vocabulary
  (`mountainWithin`, `riverWithin`, `riverOrFloodplainWithin`,
  `grasslandWithin`, `pastureGroundWithin`) read off the *ground*, a
  filter over the order in `seatOne`'s first arm (accepted + wants →
  accepted → refused → spacing floor), never a rejection; the needy seats
  choose first (`wantCount` desc, ties by roster index); stage 2's
  `resourcePull` field and `handBias` on the deal; stage 3's
  `ensureStartFurnishing` (an improvement kind or a resource row by name
  — Modu `horses`, Mithridates `plantation` + `camp`), hand first then
  the table (hand-only left Mithridates' camp at 22/24: flat plains'
  only camp row is ivory); the base luxury guarantee's fallthrough
  **kept** (hand-or-nothing left 4% of the max roster short). **24-seed
  verification, unseated → seated**: Pachacuti mountain 17 → **100%**,
  river 83 → 100%; Taizong grassland 79 → 100%; Modu horses 83 → 100%;
  Al-Ma'mun river 75 → 100%; Mithridates river 50 → 100%, camp 29 →
  100%, plantation 88 → 100%. Score cost (cap 9.3): Pachacuti −2.4
  (the mountain is the rarest ask), Taizong −0.2, Al-Ma'mun −0.1, Modu
  +0.9, Akhenaten +0.2, Mithridates +1.8. Legality on every seed. A
  leaderless roster draws exactly the old world (pinned). No
  `Player.leader` in state yet (S2's fence) — the mirror for an in-game
  surface is one field.
  **M1c** (the user, 2026-09-10: *"akhenaten should have a desert (or
  oasis/floodplain) spawn"*): a want `aridWithin 2` (desert terrain, or an
  oasis or floodplain feature) beside his river want, a filter over
  accepted sites so the hostile-ring rejection still holds — the Nile's
  edge, not the Sahara; in flight on the same worktree.
  **M1d** (the user: *"wire up these changes for inspection in mapgen.html.
  Allow me to toggle a lobby with specific leaders, add/subtract leaders
  and see how their spawns look"*): the page's Leaders switch becomes a
  **lobby** — seats added and removed, each a select over no leader + the
  leader table (walked, never listed), regenerating the seed through the
  game's own generator and chooser, each start row printing the seat's
  leader, bias lines, wants with ticks and furnishing; roster in the
  page's query state so a lobby is a link; queued on the same worktree
  after M1c. (the user, 2026-09-10: *"Prophets
  should have only two charges (i feel like i've said this before).
  Proclamations and empire-wide rites each take 1 charge. Founding a
  religion creates a holy site and consumes two charges. Drawing a new
  belief costs two charges. Additionally: prophets can plant new holy
  sites that also consume 2 charges."*). Today (`data/units.json`) the
  prophet already carries **2** charges and its four verbs
  (`ProphetVerbName`: plantHolySite · gainBelief · proclaim · empireRite,
  `religion.ts`) each spend **one** through `spendCharge`; founding a
  religion spends the piece whole (`spendProphet`) and places the holy
  site. **F2 builds a per-verb cost**: `proclaim` 1 · `empireRite` 1 ·
  `foundReligion` 2 (the holy site placed as today — verify and say so)
  · `gainBelief` 2 · `plantHolySite` 2 — figures in data
  (`rules.religion.prophetCosts` or on the unit row's `charges` beside a
  `verbCosts` map; never in prose), read in ONE place (`spendCharge`
  takes the verb; a verb whose cost exceeds the charges left is refused
  by the verb's own `…Error` with one sentence, "a prophet with one
  charge left cannot found a faith"). So a prophet either founds, draws
  a belief or plants a site — and is spent — or proclaims/rites twice.
  The city panel's and unit sheet's verbs print the cost ("2 charges");
  the Compendium's religion shelf says it in words; the bots' prophet
  logic (`src/ai/` where a prophet is spent) reads the same table; the
  apostle (2 charges: proclaim/rite) and the inquisitor (1: purge)
  unchanged. Pins per verb; schema bump if a replay's spend differs (it
  does: a two-charge draw); `docs/religion-v2.md` follows. Needed for
  Akhenaten's deck (`docs/leaders.md`).
  **F2 built** (2026-09-10, schema **112**, stacked on S2 in the gate and
  **held** with it): `rules.religion.prophetCosts` (found 2 · plant 2 ·
  belief 2 · proclaim 1 · rite 1), `chargeCostOf` the one reader,
  `spendCharge(state, unit, verb)` the one spender (`spendProphet`
  deleted — the split was the ladder), `agentProblem` the one refusal
  with the ruling's sentence, `chargeCostWords` the one printer; founding
  vs planting priced by whether the empire already has a faith; the
  apostle's and inquisitor's acts enumerated at one. Seven pins incl. a
  doc sync against `docs/religion-v2.md`'s table; `CLAUDE.md`'s stale
  "One-charge prophet" trap corrected.
- (aaaa) **Leaders — direction, and player progression PARKED** (the user,
  2026-09-10). `docs/leaders.md` is the casting call (26 figures, themes and
  possible bonuses in the user's format) and carries the draft's shape as
  discussed: one pick per age when *you* enter it, three cards of three
  kinds (passive · one-time boon · unique unit/building), from the leader's
  own deck. Nothing ruled; the user is reading the doc. **Parked**: player
  progression / meta-unlocks — "for the first cut lets just not have player
  progression be a thing"; when it returns, breadth never depth, outside the
  sim (local profile + export first, anonymous account + passkey later, the
  replay log verifies an unlock). Do not build.
- (zzz) **The trade sheet knows the Silk Road — RULED** (the user,
  2026-09-10: *"in the trade route menu: please note any luxury
  resources that can be gained once that ability is unlocked. Also -
  add a new recommendation section with routes to new unique luxuries
  once its unlocked"*). **R6 builds** in `src/ui/tradeScreen.ts` /
  `tradeLines.ts`: (1) every international pair whose destination holds
  an **improved luxury the sender does not control** carries a line on
  its card — "brings Silk (half a copy)" — with the luxury's own mark,
  read through the sim's one import reading (`importedLuxuries` /
  `resourceEffects.ts`'s rule, the destination's improved luxuries
  minus the sender's controlled kinds, one per route, unique kinds
  only), never a second walk in the UI; **before** The Silk Road is
  held the line still prints, in the `.wanting` voice: "would bring
  Silk — needs The Silk Road", so a player learns the ability exists
  from the sheet; (2) a new **Recommended** purpose group, **"New
  luxuries"**, listing routes whose import is a kind the sender lacks,
  best first (the half-copy's contentment priced by the existing route
  card score plus the luxury's line), shown only once The Silk Road is
  held (and a one-line hint in its place before: "Routes abroad will
  bring luxuries once The Silk Road is known"); a route already
  importing a kind excludes other routes to the same kind from the
  group (unique kinds only). The running-routes ledger shows the
  imported kind on the route's row. Sim untouched except a reader if
  one is missing (e.g. `wouldImportFor(state, seat, from, to)` beside
  `importedLuxuries`, the rule's own test). Pins: the card line with and
  without the tech; the group's membership and its uniqueness; the
  running row's mark; `test/ui/tradeScreen.test.ts`'s pattern. (the user, 2026-09-10,
  after U9's chart: *"chariot -> 33, chariot archer -> 20, 26, legionary
  -> 45, spear wall -> 42, composite bowman-> 30, 39, horseman -> 48,
  horse archer -> 32, 42, war elephant -> 50, catapult -> 35, 42,
  longswordsman: 55, pikeman: 52, knight: 60, crossbowman -> 45, 50"*;
  then *"all anti-cav should have +10 against mounted across the board.
  war chariot should be seen as an in-between age 1/2 unit, so it's
  positioned fine"*). **U9b builds** in `data/units.json`: War Chariot
  **33**, Chariot Archer **20/26** (stays — the chariots are the I/II
  bridge, so the archer's 26 over the Spearman's 25 is accepted);
  Legionary **45**, Spear Wall **42**, Composite Bowman **30/39**,
  Horseman **48**, Horse Archer **32/42**, War Elephant **50**, Catapult
  **35/42**; Longswordsman **55**, Pikeman **52**, Knight **60**,
  Crossbowman **45/50**; unchanged: Warrior 20, Scout 10, Archer 15/20,
  Spearman 25, Swordsman 35, Phalanx 30, Bowman 20/28, The Fire Lance
  80 (one-shots a Swordsman; 67 into a Knight now), naval as U9.
  **Every anti-cav line is +10 vs mounted**: the Spearman gains one,
  Phalanx 10, Spear Wall 12 → 10, Pikeman 15 → 10. **Trebuchet 40/48**
  (+20 vs cities) — **confirmed** (the user: "the trebuchet strength
  recommendation is good"): at 28/45 the Catapult → Trebuchet chain fell
  in melee and its bombard sat under the Crossbowman's 50. Knights
  Templar mirror (60 in Æra IV). **Naval, commensurate** (the user,
  minutes later: *"naval units should be stronger than the strongest
  land unit of its era (mounted units). This makes them very strong
  against embarked units and better against cities"*): the era's heavy
  hull stands above the era's best land unit (I 33 · II 35 · III 50 ·
  IV 60), the light hull beside it, the ranged hull's bombard under the
  heavy — light (hit and run, +10 vs ranged ships): Trireme **36** ·
  Bireme **40** · Galley **52** · Caravel **65** · Corvette **78**; heavy
  (blockade): War Galley **45** · Tower Ship **58** · Carrack **72** ·
  Ship of the Line **88**; ranged (fragile hull −10): Fire Ship **40/50**
  · Gun Galley **52/62** · Frigate **66/80** (+20 bombardment). An
  embarked Knight (60 − 20 at sea = 40) against a Carrack at 72 is a
  32-point gap — a kill, as asked. The era register
  and the monotone-chain pins stand; the matchup table re-pinned to the
  new figures; `docs/units.md` regenerated; the bot fixture re-checked
  (the Knight's drift narrows). No schema (109 already says a v108 log
  does not replay; ▢ if the user wants the exact figures replay-safe,
  bump — rec: no, U9 has not been played).
  **R6 built** (2026-09-10): the readers live in a new leaf
  `src/sim/routeImports.ts` (`wouldImportFor`, `runningRouteImports`
  memoised on the revision clock, `routesLendLuxuries`, `importRuleTech`
  found by scanning the tree — no surface names the rule or the node);
  the card line "Brings Silk — half a copy" / "Would bring Silk — needs
  The Silk Road" (refs, the `.wanting` voice, registered); the
  Recommended group **New luxuries** (one route per kind, best first)
  with its pre-tech hint; the running row's mark; fourteen pins in
  `test/ui/tradeImports.test.ts`. Follow-up: fold `importedLuxuries`
  onto the leaf once O2 lands (the sweep is duplicated, pinned kind for
  kind), and `src/ai/routes.ts`'s `importedLuxuryWorth` can ask
  `wouldImportFor`.
- (yyy) **The ladder, the user's figures — RULED** (the user, 2026-09-10,
  after U9's chart: *"chariot -> 33, chariot archer -> 20, 26, legionary
  -> 45, spear wall -> 42, composite bowman-> 30, 39, horseman -> 48,
  horse archer -> 32, 42, war elephant -> 50, catapult -> 35, 42,
  longswordsman: 55, pikeman: 52, knight: 60, crossbowman -> 45, 50"*;
  then *"all anti-cav should have +10 against mounted across the board.
  war chariot should be seen as an in-between age 1/2 unit, so it's
  positioned fine"*). **U9b builds** in `data/units.json`: War Chariot
  **33**, Chariot Archer **20/26** (stays — the chariots are the I/II
  bridge, so the archer's 26 over the Spearman's 25 is accepted);
  Legionary **45**, Spear Wall **42**, Composite Bowman **30/39**,
  Horseman **48**, Horse Archer **32/42**, War Elephant **50**, Catapult
  **35/42**; Longswordsman **55**, Pikeman **52**, Knight **60**,
  Crossbowman **45/50**; unchanged: Warrior 20, Scout 10, Archer 15/20,
  Spearman 25, Swordsman 35, Phalanx 30, Bowman 20/28, The Fire Lance
  80 (one-shots a Swordsman; 67 into a Knight now), naval as U9.
  **Every anti-cav line is +10 vs mounted**: the Spearman gains one,
  Phalanx 10, Spear Wall 12 → 10, Pikeman 15 → 10. **Trebuchet 40/48**
  (+20 vs cities) — **confirmed** (the user: "the trebuchet strength
  recommendation is good"): at 28/45 the Catapult → Trebuchet chain fell
  in melee and its bombard sat under the Crossbowman's 50. Knights
  Templar mirror (60 in Æra IV). **Naval, commensurate** (the user,
  minutes later: *"naval units should be stronger than the strongest
  land unit of its era (mounted units). This makes them very strong
  against embarked units and better against cities"*): the era's heavy
  hull stands above the era's best land unit (I 33 · II 35 · III 50 ·
  IV 60), the light hull beside it, the ranged hull's bombard under the
  heavy — light (hit and run, +10 vs ranged ships): Trireme **36** ·
  Bireme **40** · Galley **52** · Caravel **65** · Corvette **78**; heavy
  (blockade): War Galley **45** · Tower Ship **58** · Carrack **72** ·
  Ship of the Line **88**; ranged (fragile hull −10): Fire Ship **40/50**
  · Gun Galley **52/62** · Frigate **66/80** (+20 bombardment). An
  embarked Knight (60 − 20 at sea = 40) against a Carrack at 72 is a
  32-point gap — a kill, as asked. The era register
  and the monotone-chain pins stand; the matchup table re-pinned to the
  new figures; `docs/units.md` regenerated; the bot fixture re-checked
  (the Knight's drift narrows). No schema (109 already says a v108 log
  does not replay; ▢ if the user wants the exact figures replay-safe,
  bump — rec: no, U9 has not been played).
  **U9b built** (2026-09-10): every figure as ruled, naval included;
  Knights Templar mirror 60. Register pins hold unweakened (bows under
  the era's best *closer* — Æra I's is the War Chariot at 33, so the
  Chariot Archer's 26 is inside it); a third pin holds the anti-cavalry
  line at +10 everywhere and folds it on the ledger; the light-hull-on-
  gun-deck one-blow kill pinned as design (52+10 vs 40−10). Matchups
  (midpoint): Chariot → Chariot Archer 50/23 back; Swordsman → Bowman
  55/23; War Elephant → Catapult **55**/22 (the Catapult no longer
  folds to one charge); Trebuchet → Fire Lance 8; Fire Lance kills a
  Swordsman, **67** into a Knight. Bot fixture drift: land mean +13.6%
  (inside the band, `data/ai.json` untouched; the Knight −29% → +20%);
  hulls unpriced by the bot. **t100** (same probe, U9 → U9b): sci 86.4
  → **104.3**, food 125 → 141, prod 78.5 → 88.9, cul 70.5 → 75.0,
  buildings 30.3 → 33.0, citizens 41 → 45.5, happiness +7.1 → **+10.4**,
  units 23.2 → 25.7, treasury 348 → 332 (more standing army). No schema.
- (xxx) **The orders and doctrines pass — RULED, to fold** (the user,
  2026-09-10: *"i've made my changes to the orders/doctrines doc"*). The
  spec of record is the user's marks in the MAIN tree's
  `docs/orders-and-doctrines.md` (uncommitted; agents read
  `/Users/jacky/code/webciv/docs/orders-and-doctrines.md` directly and
  never write it). **Reading the diff**: the bracketed `[...]` lines and
  the three unbracketed edits below are the marks; every other
  plus/minus pair is U9's doubled combat figure against the user's older
  copy and is NOT a mark (the doc regenerates from data at the fold).
  **O2 builds**, each mark → data (`data/statecraft.json` unless said):
  (1) **Manifest of the Steppe** (doctrine) → *mounted units +1 movement,
  and pillaging pays double* (the settler clause goes); (2) **The Sea
  Charter** (doctrine) → *+2% science and +2% culture empire-wide for
  every trade route you run* (an empire-stage percent on the
  `activeRoutes` count — `percentYields` with a count, or the nearest
  shape; **renamed The Merchant Scholars** — the user, 2026-09-10: "sea
  charter you can just pick a name"); (3) **Mare
  Nostrum** → *+1 food and +2 gold on every water hex you own · +15%
  science in coastal cities* (the authority clause goes); (4) **The Long
  Watch** → renamed **Martial Law**: *+1 happiness for each military
  unit standing in one of your cities, and +1 more for each
  fortification a city has built* — counts field soldiers (X13's
  `isFieldSoldier`), **no cap**; (5) **First Fruits** → *+1 food and +1
  gold on every hex carrying a resource*; (6) **Fish Weirs** → *+1 gold
  on every fishing boat* (the orchestrator's (rec), unanswered = stands);
  (7) **Assize Courts** (the Order) → *+6 authority capacity · a
  captured city costs 1 authority*; (8) **Harbourmasters** → *+1 trade
  route in every coastal city with a Harbour · +2 gold on every fishing
  boat* (a `routeSlots` line scoped coastal-with-Harbour — the sea
  build's slots-by-count as a card); (9) **The Grain Fleet** → *+6 food
  in every coastal city · +1 gold per 3 citizens in your coastal
  cities*; kept as they are: Common Granary, The Orchard Tithe, The
  Escorted Roads, The Exchequer; (10) **The Toolmakers' Charter** is
  S2's (the Vizierate — not this batch). **New cards** (the user's
  texts): (11) **Tribute** (E ◆) *a puppet pays +1 gold per 2 citizens
  to you* — a `pays` on a count of puppet citizens, no relief clause;
  (12) **Riders of the Steppe** (M ○) *mounted units ignore zone of
  control and can pillage for zero movement cost* (a `zoc` flag rule +
  a pillage-cost rule, both mounted-scoped; Tyranny's "pillaging costs
  no movement" is the shape); (13) **Tolls** (E ●) *+1 gold for every 4
  road hexes you own* (new count `roadHexes`); (14) **Mercenaries** (E ○)
  *military units bought with gold gain +2 combat strength, and units
  cost 20% less gold to buy* (a `unitStamp` on purchase + a purchase
  discount rule — The Marshal's Purse's shape); (15) **The Entrepôt** (E
  ◆) *international routes ending in your cities pay the host +1 gold
  per 5 host citizens*; (16) **Patronage** (W ◆) *+1 renown per 4
  citizens in your capital*; (17) **The Holy City card is struck — the
  ability goes on the High Temple building**: *the holy city presses its
  faith harder for every 4 citizens it holds* (`data/buildings.json`, a
  pressure rule on the holy site, read where `spreadReligion` prices the
  tide); (18) **Pilgrims** (W ◆) *doubles the religious pressure range of
  your capital · +1 gold for every foreign citizen following your
  religion* (range rule + a `pays` on the foreign-followers count). Doc
  regenerated at the fold (its sync test), the card text snapshot,
  `docs/playstyles.md` §10 rows marked built, the Compendium by
  construction; bots: each new count/rule read by the appraisal where
  its shape already is (a new count joins `wantsOf`/`explainEffects` the
  way W2's did). Schema only if a stored field is added (Tribute and
  Tolls are readings; none expected).
  **O2 built** (2026-09-10, no schema): every mark as ruled — Manifest of
  the Steppe re-themed to the horse (mounted +1 movement, pillage ×2),
  **The Merchant Scholars** (+2% science and culture per route, empire
  stage), Mare Nostrum (+1🌾 +2💰 on water, +15% science coastal; no live
  row carries `coastalCityCost` now — the base relief stands unnamed),
  **Martial Law** (the `garrison` count narrowed by `fieldSoldier`, no
  cap), First Fruits, Fish Weirs (gold), Assize Courts (+6 capacity,
  captured city 1), Harbourmasters (a slot per coastal town with a
  Harbour), The Grain Fleet (+6🌾 coastal, gold per 3 coastal citizens).
  New cards: Tribute (Gov III, count `puppetPopulation`), Riders of the
  Steppe (Gov III; `ZocRuleId.ignored` + `freePillage`, mounted-scoped
  by the new `CardRuleEffect.class`), Tolls (Gov II, `roadHexes`),
  Mercenaries (Gov IV; a `unitStamp` narrowed by `bought: 'gold'` +2, a
  −20% purchase rider — "+20% purchasing power" read as "20% cheaper"),
  The Entrepôt (Gov IV; `routeEndsHere` gained `crossing`), Patronage
  (Gov III; `CardRenownEffect` gained a count), the High Temple's
  per-4-citizens pressure line (`CardPressureEffect` gained a count),
  Pilgrims (Gov III; `PressureRuleId.capitalRange` — the capital had NO
  range before, so the card grants a holy site's 6 over a base of 0, and
  `followingForeignPop`). `isFieldSoldier` moved to `unitData.ts` (the
  card and the levy count one thing). A silence closed: the counted
  arms of the city-yield folds now ask `scope`. Docs regenerated;
  `docs/playstyles.md` §10 marked. Flagged: `growthSurplus` and
  `coastalCityCost` have no live carrier (readers stand). t100 (this
  batch alone, vs T5's row): gold 61 → 51, prod 83 → 85.5, sci 90 → 87,
  cul 76 → 72, happiness +9.7 → +6.4 — ▢ the Merchant Scholars /
  Martial Law swap and the four "keep" rows are the likely movers; the
  playtest reads it.
- (www) **Sunk progress, and the Ministry of Works — RULED** (the user,
  2026-09-10: *"the pool of yields shouldn't swap over when reselecting
  something, i.e. science is placed into a tech, and that tech is
  committed at the end of turn, swapping to a different tech shouldn't
  allow you to keep your technology progress on the new tech, same for
  production"*; and the chartered building: *"the queue can never hold
  fewer than two items, purchases are allowed, but production is
  already sunk into the current queue per turn, and the queue cannot go
  below two items"*). **S2 — sunk progress** (a rules batch, after T5
  and U9 land; schema bump): beakers and hammers are **committed to the
  thing they were spent on** — (rec) **kept with that thing, not lost**
  (Civ V/VI's buckets: `Player.sciencePool` becomes progress per tech,
  `City`'s banked production becomes progress per queue item, keyed by
  the item; switching aims at a new thing at nought and the old thing
  keeps what it had for when you return — **kept, confirmed** by the
  user, 2026-09-10: "kept and not lost is what i was thinking too").
  The last turn's spend is committed at the end of turn, as today.
  Consequences the batch carries: the bot's research goal table and
  PP1's puppet re-decision each gain a term for the progress a switch
  would strand (`bestTechGoal`'s incumbent already holds by a margin —
  the stranded beakers join it as a cost); the Compendium's rule shelf
  says it; the city panel and the star chart show the banked figure on
  the item that holds it. **The Ministry of Works** (the chartered
  production building; ▢ name — the user asked for "state planning of
  production", then "not so modern", then "a vizier, or a censor's
  quarters" — **RULED: The Vizier's Hall**, the charter **The
  Vizierate** (the user, 2026-09-10: "lets do the viziers hall"); queued
  as S2's second half, behind T5 and U9 —
  Imhotep was vizier and architect at once, the office that ran the
  corvée and the king's building programme; the Roman censor let the
  public-works contracts (Appius Claudius's road and aqueduct), so *The
  Censor's Rolls* fits too but collides with the census sheet in a
  player's mind; earlier candidates *The King's Works* / *The Clerk of
  Works*):
  **+30% production while the city's queue holds two or more items**
  (a production percent gated on a new city condition, queue depth ≥
  2); **in a city that holds it the queue can never fall below two
  items** — a `setCityProduction` that would leave fewer than two is
  refused by the reducer, the city panel greys the last two removes;
  **purchases are allowed** (the bought head leaves; if that drops the
  queue under two the buy is refused until a second item is queued —
  the user: purchases allowed, the floor holds); hammers are sunk into
  the head per S2. The bot: in a town that holds it, always queue the
  table's runner-up behind the head (the driver's town pass), else
  bots never see the bonus. Replaces the Foundry proposal for the
  Toolmakers' Charter (`docs/orders-and-doctrines.md`'s inline mark).
  **S2 built** (2026-09-10, schema **111**; gated green, **held** until the
  user is between games — saves are `{config, log}` and a mismatched
  schema is refused, pre-release): `Player.techProgress` and
  `City.itemProgress` park every bucket but the live one; two seams in
  `state.ts` (`aimResearchAt`, `reaimProduction` — `kept: true` parks,
  `kept: false` overflows forward); the star chart draws the bar on the
  node that holds the beakers and the city panel prints "n⚙ set aside".
  The Vizier's Hall (`viziersHall`, large, column 4, `queueFloor: 2`,
  +30% production scoped to the holding town at queue depth ≥ 2 — a new
  `CityScope` `queueDepth`); The Vizierate is the un-retired
  `toolmakersCharter`. Judgement call: the reducer refuses a queue only
  when the command would *shorten* it below the floor (a strict floor
  deadlocks an emptied town) — ▢. Bot: `research.strandWeight` and
  `puppet.strandWeight` (0.35) charge a switch what it strands; the
  driver queues to the floor; a real bug fixed (every build candidate
  was quoted the front row's basket). t100: the rule alone costs ~8
  science; at the shipped weight sci 105 → 97, cul 78 → 67, happiness
  13.3 → 12.2 — ▢ an arena sweep of the two weights.
- (vvv) **The mounted line — RE-RULED** (the user, 2026-09-10, minutes
  later: *"this feels somewhat anachronistic. What if we moved chariots
  to age 2, horseman and horse archer to age 3 and removed
  cataphracts."* — then: *"i think we can keep chariots where they are,
  they're close enough to the start of age 2."*). **This supersedes the
  paragraph below.** **Nothing moves in the tree**: the chariots stay
  on The Wheel (the last column of Æra I, a step from Æra II), **The
  Saddle stays in Æra III** with Horseman, Horse Archer and War
  Elephant as today, and **the Cataphract is retired** (row kept for
  saves). Strengths (U9), (ttt)'s figures: War Chariot **28**, Chariot
  Archer **18/22** (under the Spearman's 25, since The Wheel is still
  Æra I's node); Horseman **38**, Horse Archer **25/32**, War Elephant
  **44** (+8 vs cities; over the Legionary's 40 only by the ivory
  gate); Knight 50. The mounted line reads War Chariot (I, late) ·
  Horseman, War Elephant (III) · Knight (IV); the ranged-cavalry line
  Chariot Archer (I, late) · Horse Archer (III). Æra II's cavalry is the
  chariot bought one column early — the user's call. *(The earlier ruling, for the record:* the user,
  2026-09-10: *"we move saddle to era 2, and re-introduce cataphracts in
  age 3"*, answering the Æra II cavalry gap — withdrawn.) **The Saddle → Æra II** (T5 places it: age 2,
  ▢ prereqs — rec Husbandry + Bronzeworking, the horse and the bronze
  bit, which puts it in the age's first column; the lanes are the
  user's chart, so the agent says where it landed), keeping its pillage
  rider from (uuu) and its pasture renewal, unlocking **Horseman** (36)
  and **Horse Archer** (22/30 — below the Swordsman's 35 and the
  Horseman's 36). **The Cataphract is un-retired** and returns as the
  Æra III heavy horse (U9: `retired` off, `awaitsTech` off, **42**, +5
  vs ranged, needs improved Horses **and Iron**), unlocked at ▢ **Iron
  Working** (rec: the armoured horse beside the Legionary and the Spear
  Wall), where the **War Elephant** (44, +8 vs cities, ivory) moves too,
  so Æra II is not carrying a 44. The mounted line then reads War
  Chariot (I) · Horseman (II) · Cataphract, War Elephant (III) · Knight
  (IV); the ranged-cavalry line Chariot Archer (I) · Horse Archer (II).
  (ttt)'s Æra III row is amended accordingly; the era pins read the
  rows' unlocking techs at test time, so the placement is data.
- (uuu) **The user's tree pass — RULED, to fold** (the user, 2026-09-10:
  *"could you fold in my changes to the tech tree, so we have a clean
  slate to rework the ordering of units?"*). The spec of record is the
  user's bracketed marks in the MAIN tree's `docs/tech-tree.md`
  (uncommitted; agents read `/Users/jacky/code/webciv/docs/tech-tree.md`
  directly and never overwrite it; the fold regenerates the doc with
  `TECH_DOC_WRITE=1`, which is what retires the marks). **T5 builds**, each
  mark → data: (1) **Barracks** `productionBonus` 10% all units → **+25%
  toward foot units** — the spear, warrior and archer lines, read as a
  class selector on `modelClass` melee | ranged (not mounted, not siege,
  not naval); (2) **Lighthouse** → **+2 food** base, **+1 gold on coastal
  tiles** (the water `tileYields` line pays gold, not food); (3)
  **Stable** keeps its abilities, `productionBonus` 10% → **+25% toward
  mounted**; (4) **Irrigation** unlocks a new building **Garden**: **+1
  happiness per 5 citizens in this city** (the Amphitheatre's `count:
  population, per: 5` shape, paying happiness) and **+15% renown from
  this city** (a city-scoped renown percent — `renownPercent` if the
  vocabulary has it, else a deferred note and the ▢); (5) **Harbour** →
  **+3 production** base, **+1 food and +1 gold on water resource tiles**
  (the all-water food line goes), keeps its route slot; (6) **Raised
  Fields is retired** and **a new node takes its place** in the same
  column with the same prereq (Wayfinding) and Shipwrights still
  chaining off it (the lanes are the user's chart — the slot is kept),
  ▢ **name** (rec: *The Silk Road*; the agent uses it and marks ▢):
  unlocks the **Caravanserai** (moved off Mathematics; Petra stays
  there), **+3 gold on international trade routes**, and **an
  international route gives a copy of a luxury the destination holds
  improved, with its effects halved** — the `docs/playstyles.md` §7 rule
  at the user's own figure: half the happiness and half every other
  effect of the luxury; one luxury per route; unique kinds only (a
  second copy pays as a second copy does today); lapses with the route;
  read where luxury copies are counted (`resourceEffects.ts`); the bots
  need a want for it (a W2-style line: an international route's
  appraisal carries the imported luxury's half-value); (7) **State
  Workforce** unlocks a new building **Public Bath**: **+3 food** base,
  **+2 happiness if the city is joined to the capital** (`scope`/`on` a
  connected-to-capital test — the Satrapies reading); (8) **Shipyard** →
  **no route slot**, **+3 production** base, `productionBonus` **+25%
  toward naval**, **+1 food and +1 production on fishing boats** (a
  `tileYields` line on the improvement); (9) **The Saddle** adds
  **pillaging a tile pays 15 science and 15 culture** — a tech effect on
  the pillage occasion, through the windfall vocabulary (`pillageBounty`
  in `rules.trade` is the gold/food/hammer bounty; this is a rider that
  joins it, `settleResearchWindfall`/`settleCultureWindfall` — numbers in
  data, never prose); (10) **Satrapies** loses "roads near your cities
  cost nothing to keep" (`roadFree`'s rule) and the deferred hammers
  clause (delete the row's `deferred` line) — a nerf to wide, the user's;
  (11) **Daughter Cities** adds **internal trade routes +1 food and +1
  production** — the Caravanserai's `pays where: route` shape restricted
  to domestic routes (both ends this empire's). The Compendium, the
  cards' text snapshot (`CARD_TEXT_WRITE=1` if a row's text changes),
  `docs/tech-tree.md` (regenerated), `docs/luxuries.md`/`docs/trade.md`
  where they state a rule, and the wager/luxury sync tests follow. Every
  new building joins `docs/production-costs.md`'s size table by size (no
  figure on a row). Schema bump (a replay's yields move). Report the t100
  row and, for the luxury rule, one bench sentence: how many imported
  copies the mean bot seat holds at t100.
  **Eight more marks** (the user, 2026-09-10, later the same day; T5
  folds these too): (12) **Calendar — plantations pay +2 gold, not +1
  food** (`data/improvements.json`; the §1 fix at the user's figure);
  (13) **Bronze Panoply unlocks a new building, the Forge** (Æra II):
  **+2 production** base and **+1 production on mines and quarries
  carrying a resource in this city** (`tileYields` on those
  improvements with `hasResource`); (14) **Market — +1 trade route
  slot per 8 citizens in this city** (a `routeSlots` line on a
  `population, per: 8` count — the §7 slot-per-size-band rule); (15)
  **Siegecraft — cities gain +1 combat strength per 4 citizens** (a
  tech effect: `cityStat defense` on a population count, or a rule that
  sets `rules.combat.cityStrengthPerPop`'s reading once Siegecraft is
  held — the agent picks the shape the evaluator already has and says
  which; ▢ with the ladder tripled the figure may want 1 per 2); (16)
  **Harbour gives no trade route** (its `routeSlots` line goes, with the
  Shipyard's); (17) **Caravanserai — +1 trade route slot per 8 citizens
  in this city** (as 14); (18) Mathematics loses the Caravanserai (as
  (6) said); (19) **Steel's Forge is renamed the Foundry** (id stays for
  saves, `name` changes; everything that names it follows), the new
  Æra II Forge being (13). ▢ noted for the user: with the Harbour and
  Shipyard slot-less and slots coming from Market/Caravanserai by size,
  a wide-and-thin sea empire runs few routes — the sea build's identity
  was foreign routes.
  **T5 built** (2026-09-10, schema **110**): all nineteen marks and the
  three answers, in data; Barracks/Stable/Shipyard +25% by class (a new
  `UnitFilter.modelClasses`); Garden (`cityRenownPercent` 15 — the shape
  existed, nothing deferred); Public Bath scoped `connected`; **The Silk
  Road** (`silkRoad`) in Raised Fields' slot — `raisedFields` deleted
  from `TechId` (no `retired` on a tech; Floating Gardens moved to
  Irrigation), the Caravanserai off Mathematics, `+3 gold` on
  `crossing: 'international'` routes (new `CardPaysEffect.crossing`),
  and the import rule `routesImportLuxuries`: `importedLuxuries` joins
  the one luxury walk with an `imported` mark and `copiesFor` returns
  `rules.trade.importedLuxuryPercent / 100` — every luxury fold halves
  without knowing the rule; Market/Caravanserai
  `routeSlotsPerPopulation` 8; Siegecraft `cityStat defense` on a
  population count (new `count`/`per`/`max` on `CardCityStatEffect`);
  The Saddle's pillage riders (15 science, 15 culture through the
  settle verbs); the Smithy in the tree, Toolmakers' Charter retired;
  plantations +2 gold. Judgement calls: Lighthouse kept its base 2
  gold beside the +2 food (▢ if the mark meant *instead*); Floating
  Gardens one age earlier. **t100** (8 seeds, before → after, this
  batch alone): gold 37.6 → **61.2**, treasury 270 → 400, cul 62.9 →
  76.4, prod 73.5 → 82.9, sci 86.8 → 90.4, happiness +4.7 → +9.7, faith
  20.1 → 16.0; the mean bot seat holds **0.25** imported luxuries at
  t100 (a late, occasional thing at this pacing). `docs/tech-tree.md`
  regenerated — the user's marks folded and gone (the clean slate).
  Merged behind U9 with the schema renumbered 109 → 110 and one bench
  re-pinned (the X7 worker at 36 turns).
  **Three answers** (the user, 2026-09-10): (a) *"rename the forge to
  smithy"* — the new Æra II building is the **Smithy**. A Smithy already
  exists as a charter building (`smithy`, unlocked by the Toolmakers'
  Charter: +2 production, medium, column 4, a count effect), so **the
  existing row moves into the tree**: unlocked by Bronze Panoply, its
  effects replaced by the user's (+2 production base, +1 production on
  mines and quarries carrying a resource in this city), `unlockedByCard`
  off, column read from the node; the **Toolmakers' Charter retires**
  (▢ or is re-aimed — the user); Steel's **Forge keeps its name** (the
  Foundry rename was only ever to free the word; ▢ if the user still
  wants it). (b) *"a sea empire is able to still build markets, but i'm
  ok with the harbour gaining one back"* — the **Harbour keeps its route
  slot**; mark 16 withdrawn; the Shipyard stays slot-less. (c) The city
  strength question withdrawn: damage is the *difference*, and the base
  is the best buildable unit, so **+1 per 4 citizens stands** as a
  modifier over keeping up in military tech — the user's reading.
- (ttt) **The strength ladder — RULED** (the user, 2026-09-10: *"do a pass
  through units.md? There should be a larger gap between units in combat
  strength. i'd love for the fire lancer to end as an 80 strength unit
  (should one-shot a swordsman, or nearly). Use inspiration from the civ
  6 values, a more expensive unit should be stronger, but also aim to
  maintain game balance within the era (ranged units should have weaker
  ranged strength than the premiere melee and cavalry units of the
  era)"*). The curve is Civ 6's — `baseDamage` 30 × e^(`strengthExponent`
  0.04 × difference) — so Civ 6's magnitudes are the natural scale: a
  gap of 10 is ×1.5 damage, 30 one-shots. **U9 builds the ladder below
  in `data/units.json`**, by the unlocking tech's era (read the tree;
  Bronzeworking, Castellany and Natural Philosophy the agent places),
  monotone within a class across eras, ranged strength always below the
  era's premiere melee and cavalry, cost (size) rising with strength.
  Melee/mounted (str) — Æra I: Scout 10 · Warrior 20 · Spearman 25 ·
  War Chariot 28. Æra II: Phalanx 30 (+10 vs mounted) · Swordsman 35.
  Æra III: Spear Wall 35 (+12 vs mounted) · Horseman 36 · Legionary 40 ·
  War Elephant 42 (+8 vs cities) (the Cataphract is **retired** — the
  user, 2026-09-10: "we replaced cataphracts with horsemen"; the row
  stays for saves, out of the doc and every pool). Æra IV:
  Pikeman 45 (+15 vs mounted) · Longswordsman 48 · Knight 50 · **The
  Fire Lance 80** (the era's capstone, a step above by design: one-shots
  a Swordsman and nearly a Knight; Knights Templar keep mirroring the
  best mounted). Ranged (melee/ranged) — Æra I: Archer 15/20 · Chariot
  Archer 18/22. Æra II: Bowman 20/28. Æra III: Horse Archer 25/32 ·
  Composite Bowman 25/33 · Catapult 20/35 (+15 vs cities). Æra IV:
  Crossbowman 32/42 · Trebuchet 28/45 (+20 vs cities). Naval — light
  (hit and run, +10 vs ranged ships): Trireme 22 · Bireme 28 · Galley 35
  · Caravel 45 · Corvette 55; heavy (blockade): War Galley 35 · Tower
  Ship 45 · Carrack 60 · Ship of the Line 75; ranged (fragile hull −10):
  Fire Ship 25/35 · Gun Galley 35/50 · Frigate 50/65 (+20 bombardment).
  **Every flat line beside the strengths scales with them or it
  silently shrinks** (the agent applies ×2–2.5 and says each): terrain
  hills 3 → 6, forest/jungle 2 → 5; `fortifyBonusPerTurn` 2 → 3,
  `fortifyMax` 4 → 6 (Civ 6's); `generalAuraStrength` 3 → 5;
  `cityMinStrength` 8 → 20; walls' `cityStat` Palisade 5 → 10, Stone
  Walls 4 → 10, Walls of Uruk 10 → 20 and its +2 line → +4; naval
  `atSeaPenalty` 10 → 20, `lineBonusPerHull` 2 → 4, `lineBonusMax` 4 → 8;
  every card/belief/rite/wonder/great-person combat line (God of the
  Forge +1, Warrior Monks +5, The Crusade +3, the Muster's +2, "+1
  combat strength" Orders, Blessing of Arms, the citadel's defender
  line) ×2–3, rounded, each named in the report. **The bot re-cut so its
  soldier valuation is unchanged in coin**: `weights.military` 5 → 2
  (and the warmonger persona's 9 in proportion), `score.combatScale`,
  `threat.techMilitaryFactor` checked against a fixture before/after;
  the wager bars on `armyStrength` (Bread and Iron 150/480/1000, The War
  Chest) ×2.5 in data and doc together, ▢ the user's figures. Hit
  points, `cityHp`, `siegeDamagePerTurn`, escalation unchanged. **Pins**:
  a matchup table in `test/sim/combat.test.ts` — expected damage,
  midpoint roll, for each era's premiere melee vs its ranged unit and
  the Fire Lance vs Swordsman (kills) and vs Knight (≥ 90); ranged
  strength < the era's best melee/mounted strength for every era (a
  register test over the rows); every strength monotone along
  `upgradesTo`. `docs/units.md` regenerated; `docs/war-diplomacy.md`
  §combat figures; schema bump (every battle's dice move). Report: the
  before/after t100 row, units per seat, and the matchup table.
  **U9 built** (2026-09-10, schema **109**): the ladder as ruled with
  (vvv)'s final mounted line; Knights Templar mirror at 38. Flat lines:
  forest/jungle 2 → 5, hills 3 → 6; fortify 2/4 → 3/6; `cityMinStrength`
  8 → 20; general aura 3 → 5, `generalCombat` 3 → 6; naval at-sea 10 →
  20, line 2/4 → 4/8; citadel 8 → 20; walls Palisade 5 → 10, Stone
  Walls 4 → 10, Castle 5 → 10, Bastion 10 → 20, Great Wall 5 → 10,
  Walls of Uruk 10 → 20 (+2 line → +4); Terracotta 3 → 6 (stamp 1 →
  2), Alhambra 2 → 4, Codex 3 → 6; every Order/doctrine/government/
  belief/great-person line ×2 (Siege Doctrine 8, Marshals 4 cap 8,
  Decisive Blows 10, Knightly Orders 10, Siege Train 12, Admiralty 10,
  Warrior Monks 10, Crusade 6, Blessing of Arms 10 …); Castellany's
  line 5 → 10; Thin Ranks −2; `armyStrength` wager bars 375/1200/2500
  ▢. Bot: `weights.military` 2, warmonger 3.6, `combatScale` 7.5, new
  `weights.unitEdge` 5 (the movement/sight/range arm's own unit of
  worth); soldier worth −2.4% on the mean, the Knight −29% (the ladder
  stretched the bottom more than the top — no single weight fits both
  ends). Matchups (midpoint): War Chariot → Chariot Archer 45 / 24
  back; Swordsman → Bowman 55 / 23; War Elephant → Catapult 78 / 21;
  Trebuchet → Fire Lance 7; **Fire Lance kills a Swordsman outright,
  100 into a Knight**. **t100**: happiness +4.7 → **+10.8**, prod 73.5 →
  82.8, sci 86.8 → 91.2, cul 62.9 → 72.7, treasury 270 → 361, buildings
  29.3 → 30.8, **units 24.3 → 24.1** (the split held), faith 20.1 →
  16.2. ▢ **the naval triangle now kills in one blow** (a light hull on a
  gun deck: a 10-point gap plus the ±10 lines = 30 = a kill) — the two
  naval lines at ×1.5 instead of ×2 if that is too sharp. ▢ **cost
  inversion**: the Legionary (40, 54⚙, column 6) is stronger *and*
  cheaper than the Horseman (38, 101⚙, column 7) — a column artefact for
  the tree pass.
- (sss) **The bot's build order and tech selection, audited — one root
  defect** (the user, 2026-09-10: *"could you take a look at bot build
  order and tech selection in it's current state? lets verify its still
  making reasonable decisions"*). Method: seat 0's full decision log
  over 120 turns on seeds 42 and 7 (research, every queue head, every
  completion), then the scoring tables and term trees behind the odd
  picks. **What is reasonable**: scout → settler → worker opening; a
  second city by t18–26 and 8–10 towns by t120; Writing by t42–49 with
  the Library following; Divination second (the pantheon); walls and
  archers with the wild on; workers plentiful (three charges each);
  wonders taken when the capital's table has nothing better; Currency →
  traders by t97. **What is not — and it is one root**:
  `garrisonWorth` (`bot.ts`) returns **null** whenever `garrisonAt` ≥
  `military.garrisonPerCity` (1), and `garrisonAt` (`campaign.ts`)
  counts **any combatant standing on the hex — a scout passing through
  included**. Three symptoms measured on seed 7: (1) **the shadow price
  of gold swings 36 ↔ 6 on alternate turns** — with no building yet
  purchasable the only gold wants are soldiers, and on the turn the
  fresh scout stands in the capital there are none, so `priceOf` falls
  to the band's floor ("nothing this empire could buy"); (2) **research
  thrashes** — Sailing scores 125 / absent / 125 / absent across t2–t7
  because its Lighthouse line is priced in gold, so the goal flips
  Divination ↔ Sailing every turn (the 1.1× incumbent margin cannot hold
  a 6× swing; beakers are a pool so nothing is lost, but the plan and
  the feed are unstable and every gold-paying row — Market, Lighthouse,
  Bank, the techs that unlock them — is undervalued six-fold on half the
  turns; PP1's "a Market prices negative in most towns" is the same
  root); (3) **extra scouts** — at t3 the Warrior candidate is dropped
  (null worth, the new scout on the hex) and the Scout wins the table by
  default, so seat 0 builds three scouts by t5 and seven by t66. **X13 —
  RULED**: (a) `garrisonAt` counts a **standing** garrison — a combatant
  that is not an explorer and is not mid-march (fortified, or with its
  full allowance unspent at the seat's own decision time is fine: the
  agent picks the reading that the campaign's own garrison logic
  already uses and says which) — never a scout; (b) `garrisonWorth`
  never returns null for a garrison already met: the garrison share is
  a **term** that reads nought when met, and the soldier keeps its field
  value, so the want survives and the table always holds a soldier row
  to compare against; (c) `priceOf` with **no want at all** prices the
  currency at the **prior** (`priorPrice`: the table × gold pressure),
  not the band's floor — "nothing to buy" is not "worthless"; (d) pins:
  the gold price is unchanged when a scout steps onto the capital hex;
  the Warrior row stays in the table with a scout in the town; seed 7's
  research goal does not flip in the first 30 turns without a change of
  knowledge; the opening builds at most one scout beyond the starting
  one before the first settler; (e) t100 row before/after and the seed-7
  first-30-turn research and build logs before/after in the report.
  **X13 built** (2026-09-10): `garrisonAt` counts **field soldiers**
  (`isFieldSoldier`: combatant, not an explorer, not naval — the
  campaign's own predicate, so the levy and the garrison agree; the
  mid-march clause deliberately not taken: an allowance is spent during
  the seat's own turn); `defendersAt` keeps the "any combatant here"
  reading for the enemy-town tie-break. `garrisonWorth`: the garrison is
  a term (`threat.garrisonValue × short`), and — beyond the ruling,
  measured — it now charges the **levy** like the queue and the faith
  bank do (ruling (b) alone put the mean seat at twice its levy: units
  24 → 32, sci 87 → 78). `priceOf` with no want → the **prior**. Six
  pins in `test/sim/aiGarrison.test.ts`, all failing on the old code.
  **t100** (8 seeds): happiness **+4.7 → +12.2**, prod 73.5 → 83.2, sci
  86.8 → 89.9, cul 62.9 → 69.6, buildings 29.3 → 30.9, treasury 270 →
  320, rangers 3.8 → 2.7, faith 20.1 → 18.2. Seed 7: the t3–t6 goal
  flip-flop gone; the opening is **warrior · scout · worker · settler**
  (every seat starts with a scout, so `openingScout`'s third clause has
  always declined — the "scout first" ruling was never in force; ▢ the
  user). ▢ `military.scoutCap` 3 — the seat now stops at its dial.
- (rrr) **The two families — worksheet opened** (the user, 2026-09-10, across
  the maritime / wide-land / imperium-and-steppe / land-commerce / tall /
  faith conversation: *"generally i see the game having two predominant
  playstyles: wide, with synergies for either melee or cavalry dominated
  militaries and support for land or sea commerce"* … *"the natural
  identity for taller cities is science/culture and wonder building"*).
  `docs/playstyles.md` is the worksheet of record: §1 improvements pay
  their voice (boats, plantations, Harbour, Lighthouse), §2–§5 the wide
  sub-identities, §6 tall's levers (`cityStrengthPerPop` is 0 today;
  happiness has no per-citizen row; renown and route slots scale by
  count), §7 routes by size and the luxuries-by-route rule (NOT in the
  game today, bounded: foreign, half a copy, one per route, unique kinds),
  §8 faith (the holy city presses by size, pilgrimage to the holy city,
  per-follower rows), §9 the proposed cut Y1 · R5 · L1 · T4 · F1. Every ▢
  is the user's, during their balance pass; nothing flies until marked.
  Corrections made in conversation: the Amphitheatre *already* pays
  culture per two citizens; luxuries do not travel by route today.
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
  the road state as its own column. The mock is the spec of record. **R1
  built 2026-09-09** (schema 100): `buyRoute` validates as `startRoute`
  does plus the purse, charges, spawns the caravan through `arriveOnTile`
  and writes the route; `explainRoutePrice` = the Trader's unit-cost
  lines × `goldPerHammer` × `rules.trade.routePriceMultiplier` (1.0);
  `UnitDef.routeOnly` refuses the Trader in `buildError` and
  `purchaseError` by marker; sea routes pay `rules.trade.seaYieldPercent`
  50 as their own line before the amplifier; the bot's book carries one
  route row bought through `buyRoute`; `readRoutes(state, seat)` on the
  revision clock is the screen's reading (619 ms fresh on a 13-town
  board, free every ask after); t100 routes running 0.88 → 1.00. ▢ a
  route now needs a **slot** rather than a Trader row, so Currency (the
  Market) gates it in practice — the user's call whether a tech should
  be named. **R2 built 2026-09-09**: the tenth sheet — four gilt-edged
  cut tabs, the purpose groups (an empty one never built), the Land | Sea
  control re-reading a card, facts off `readRoutes` and the rules, Send
  through `buyRoute`, the unit sheet's route verbs one link, a drawn
  cart on the top bar's chip and a fourth dock button, `E` opens it;
  redraw 33.5 → 0.29 ms. Two departures written down: no
  warships-on-path fact (the reading carries no path for refused pairs;
  a blockade at either end stands in), and no blockade heading under
  Unavailable (a blockade never refuses a hire). **R3** (the user,
  2026-09-09): (1) *"colorize the yields in the trade screen"* — the
  figures on every card and table take their voice's colour (the
  specimen's `--y-food/--y-prod/--y-gold/--y-sci/--y-cul` and faith),
  the mark and the number alike, as the mock drew them; (2) *"the
  unavailable routes tab should not display routes to cities that
  haven't been discovered by the player (city center needs to be
  revealed)"* — `readRoutes` rows to a partner whose centre hex the
  seat has not explored (`isExploredBy`, the seat's own chart; the bot's
  omniscience is the bot's, not the sheet's) are not offered at all, on
  any tab, and the counts follow. **R3 built 2026-09-09**: `tradeFigureRuns`
  cuts a figure at the marks and `setTradeFigures` prints each run in its
  voice's token (`--y-food` … `--y-faith`, the mark inheriting through
  `currentColor`), on the card and both tables; `readRoutes` skips a
  partner whose centre the seat has not explored (`isExploredBy`, the
  chart not the sight — a remembered town stays a partner); the bot never
  reads `readRoutes`. **R4 — RULED** (the user, 2026-09-09: *"this is a
  major bug: once a trade route completes, there's no way to re-send it.
  We need some notion of trade routes that have already been purchased
  in the trade screen. Sending a trade route should first aim to re-use
  a route that's already been purchased (an existing trader). Currently,
  the game still prompts you for orders on a trader unit once the route
  completes, the new behavior should prompt you to 'send an idle
  trader' and the send button opts to use an existing trader if one
  exists, and never ask for orders on a trader unit"*). The ruling:
  (1) **a bought cart is kept, not spent** — when a route lapses the
  caravan idles at home as it does today, and the Trade screen counts
  it: the purse line says how many carts stand idle beside the slots,
  and an **Idle carts** section (or a line on every card) makes the
  purchased-and-waiting state visible; (2) **Send re-uses before it
  buys** — the sheet's Send on any card dispatches `startRoute` with the
  seat's first idle `routeOnly` cart (by unit id order, deterministic;
  the reducer's teleport carries it to the origin) and only falls back
  to `buyRoute` and its price when no cart is idle; the button reads
  the difference ("Send · idle cart" vs "Hire · 120 gold" — the price
  only when it would be paid, and the gold gate applies only to the
  hire); (3) **a cart is never asked for orders** — `unitAwaitsOrders`
  and `unitOfferedForOrders` return false for a `routeOnly` piece
  whether routed or idle; instead End Turn's blocker for a seat with an
  idle cart and a sendable route says **"Send an idle trader"** and its
  click opens the Trade screen (the blocker is passable the way an idle
  worker's is — the sim reads nothing); an idle cart with nothing to
  send (no partner, no slot) blocks nothing; (4) the unit sheet on a
  cart offers no orders row but the sheet's own verbs (cancel route,
  disband when idle) as today; a cart is still unselectable on its
  route. No schema change (nothing new is stored). Tests: the Send
  choice pinned pure (`buyCommandFor`-style helper returns the
  `startRoute` when a cart idles, the `buyRoute` when none does), the
  blocker's text and the predicate's `routeOnly` clause pinned in
  `test/ui/turnBlockers.test.ts`/`test/sim/units.test.ts`. **R4 built
  2026-09-09** (no schema): `idleTraders` (`trade.ts`) is the reading —
  the seat's `routeOnly` pieces carrying no route, in `state.units`
  order; `sendCommandFor` (`tradeScreen.ts`) is the one choice every
  Send goes through (cards, All-routes rows, Running's Renew): the
  first idle cart by `startRoute`, else `buyRoute` at the price, the
  purse gating only the hire; the button reads "Send · idle cart" or
  "Hire · N gold", the masthead counts idle carts. `unitAwaitsOrders`
  takes a sixth clause (any `routeOnly` piece) and the wide predicate
  inherits it; a cart's sheet is the trade link plus Disband while
  idle. `firstBlocker` gains `idleTrader` — an awake cart and
  `hasSendablePair` (slot + partner clauses of `routeStartable`, no
  path/range/fog: it is asked once an ask by the bot's driver, where
  `readRoutes` is a hundred searches) — reading **"Send an idle
  trader"**, panning to the cart, opening the sheet, passable via the
  skip set. The bot answers it with `unitCommand` (it never hired
  beside an idle cart: `RouteOutlook.free` already subtracts them).
  `startRoute`/`buyRoute` already shared `routeStartable`, so a re-send
  abroad is legal exactly where a hire is (pinned). ▢ a seat whose only
  partners are out of range or unseen can be prompted and find the
  sheet offering nothing (the prompt is passable). (eee)
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

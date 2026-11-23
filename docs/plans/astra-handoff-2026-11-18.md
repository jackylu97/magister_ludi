# Handoff to Astra: bots, rendering, 3D models and code quality (2026-11-18)

The user's ruling, 2026-11-18: *"i'd like to pivot to using this session for UI
and gameplay related things, while i have astra work on 3d modelling and code
improvement things"*, and *"i'd like astra to handle the rest of the bot work
and work unrelated to UI or gameplay"*.

This document tells Astra what it owns, what state each piece of work is in,
and the rules of the repository. Read `CLAUDE.md` (or `AGENTS.md`, the same
text) and `docs/README.md` first. They are the briefing. This document does not
repeat them.

## 0. Build status on 2026-11-21

The Claude session checked the data and the history on `decks` on
2026-11-21. Read this section first. The numbered sections below hold the
detail of each item.

### 0.1 Handoff items

| # | Work | Spec | State |
|---|---|---|---|
| 1 | **The Commerce deck build** | 3.14, and `docs/plans/commerce-design-pass-2026-11-20.md`, "Ready for the build", "The pass is closed" and the two sections after it | 85 exclusive Orders, 25 shared Orders and 15 Doctrines. The live sheet is `docs/decks/commerce.md`. |
| 2 | **The Expansionist deck build** | 3.14, and `docs/plans/expansionist-design-pass-2026-11-20.md`, "Ready for the build" and "The pass is closed" | 82 exclusive Orders, 17 shared Orders and 21 Doctrines. The six works use the approved models. |
| 3 | **A city is coastal when it owns a coast hex within two hexes** | `docs/flags.md`, "A coastal city is a city that owns a coast hex within two hexes" | Buildings and bonuses use the city’s owned coast. Ship production and purchases share one launch rule. See `docs/flags.md`. |
| 4 | **Purchase discounts as "gold buys more", for gold and for faith** | `docs/flags.md`, "A purchase discount is 'gold buys more'" | Gold and faith buying power add before the price is rounded up. The Commerce sheet lists the revised card text. |
| 5 | **Fish Traps require their Order** | `docs/flags.md`, "Three rulings from the Compendium review" | The user confirmed the charter gate. The Gathering Grounds opens Fish Traps and orchards in the closed deck pass. |
| 6 | **Strategic resources may be traded** | the same flag | The sim and bots support strategic loans. Offers, counters and signed treaties name the resource. The diplomacy screen now includes a picker for strategic resources. |
| 7 | **The Volley Fire** | `docs/plans/scientific-design-pass-2026-11-20.md`, change 59; `docs/flags.md`, "The percentages of combat strength that remain" | Archers can attack twice and lose four strength when defending against a melee attack. The combat preview shows the loss. |
| 8 | **City site ranking** | section 0.3 below | The site ranking spaces legal settlements, caps the extra hill score and charges for proximity to known camps. |
| 9 | **Values for worker advice** | section 0.3 below | Selecting a worker requests advice in a background worker. The board marks up to three hexes. The hover panel shows the recommended build or repair and its yield changes. |
| 10 | **Test results to record again** | `SCHEMA_VERSION` 252 (the river and naval rules, commit `239af13d`) | The version 256 replay checks passed on `df460761`. Both six-seat maps completed turn 120 without warnings or stalls. |
| 11 | **The unit kit** | 3.16 | The [spearman and archer comparison](../../art/unit-kit-trial/astra-review/renders/comparison.png) is ready for review. The game keeps its current pieces. |
| 12 | **Wonders on the board** | 3.13 | One landmark per city. Ages I and II use the Sun Gate, Age III the Lantern Tower, and Age IV the Meridian Dial. [See the city at each age](../../art/terrain-study/wonder-options/wonder-age-progression.jpg). |

**Integration with the playtest branch.** The first 21 November playtest already had Claude’s Fortify until healed command at save version 253. Save version 254 includes that command, the settler and explorer lenses, the worker advice panel, and both deck passes.

**Performance.** See [the turn 73 camera trace](benchmarks/turn73-drag-and-city-shade-2026-11-21.md) and [worker advice timings and integration](benchmarks/turn73-worker-advice-2026-11-21.md). The camera trace measured submission to the graphics driver. The worker reader keeps a cold recommendation off the input thread. The diplomacy screen now includes the strategic resource picker. Claude owns the UI for showing the original and discounted prices together and offering a gold payment for The Brokers’ Redraw. The approved Scientific and Devotion specs are in sections 0.1a and 0.1b.

### 0.1a The Scientific deck is ready for the build (2026-11-21)

`docs/plans/scientific-design-pass-2026-11-20.md`. The pass is closed with
nothing open. Read "Ready for the build" and the three rulings sections at
the foot of the file. All 82 changes carry a ruling.

- A Scientific seat can be dealt 87 cards, own and shared together (37
  common, 36 uncommon, 14 rare). The user counts a deck by rarity, not by own
  cards against shared ones.
- 17 charters. Three open something new: the Smelters' (an improvement), the
  Observers' (the Night Watch, a rite shared with Devotion: for ten turns a
  city gains +1 science for each citizen) and the Archivists' (the Great
  Archive, an empire building). The Closed Book becomes a rare Tier III
  charter.
- Four new charter technologies, placed in the plan's table `ready-places`:
  Smelting (age I, column 2, parent Mining), Astronomy (age I, column 3,
  parent Calendar), Record-Keeping (age III, column 6, parent Code of Laws),
  Ciphers (age IV, column 9, parent Horology). None adds a crossing.
- **"Known strong combinations"** in the plan are left uncapped on purpose.
  The user: "i do want a few broken combos" and "For now, i want the game to
  be fun over balanced for playtesters." Do not add caps.
- The Herbalists' Charter is shared with Expansionist; The Blessed Forges is
  Tier I and shared with Devotion. Both change sheets you have just built.
- The Volley Fire is already built.
- Each new improvement and building needs a board model and an icon; a
  missing board prop stops the game at load.

### 0.1b The Devotion deck is ready for the build (2026-11-21)

`docs/plans/devotion-design-pass-2026-11-20.md`. The pass is closed with
nothing open. Read "Ready for the build" and the rulings sections at the foot
of the file.

- 78 cards of its own (9 Military, 22 Economic, 41 Civic, 6 Wildcard), 27
  shared, 17 Doctrines, 10 charters. Own and shared together a Devotion seat
  can be dealt 105 cards.
- **Three rules for every rite,** the user's: a town that keeps a rite cannot
  start another (the code already does this); a rite pays through its whole
  length, not once at its start; a rite that is kept counts as started for
  every card that reads "starting a rite" (such a card pays at the start and
  again for each ten turns the rite is kept; the rite's price rises only at a
  real start). All thirteen rites are restated under these rules in the plan.
- Consecration of the Bounds: resource hexes gain +1 culture, AND the town's
  borders grow 30% faster. The user confirmed that the border clause stays.
- Rite lengths add into one sum (The Octave +100%, the Chapel +50% in its
  town, Chichen Itza +50%).
- New rites: Hallowing, the Vigil of Arms, Naming. The Night Watch is shared
  with Scientific.
- Two unique improvements: the stone circle (The Megaliths) and the cliff
  monastery. Charters: The Bell Towers opens a building, the Bell Tower; The
  Call to Prayer opens a technology, Liturgy, which carries its rule.
- A seat with no religion of its own: the religion of its capital counts for
  "devout".
- The Caliphate: devout towns cost 1 authority. Three cards read spare
  authority with NO cap, on the user's word.
- Faith discounts take the "faith buys more" form.
- The Blessed Forges is Tier I on both sheets. The Field Mass is shared with
  Dominion.
- **"Known strong combinations"** in the plan are left uncapped on purpose.
  The user: "For now, i want the game to be fun over balanced for
  playtesters." Do not add caps.
- Models and icons needed: the stone circle, the cliff monastery, the Bell
  Tower. A missing board prop stops the game at load.
- Nothing in the deck needs age 5.

### Build report for Scientific and Devotion

- Scientific has 87 Orders and 15 Doctrines. Its 17 charters include the Smelter, Night Watch and Great Archive.
- Devotion has 105 Orders and 17 Doctrines. Its town rites report their duration, the turns left and the next ten-turn credit.
- The Gurdwara gives each town three food and three faith. It also gives one science for every three citizens. The House of Worship opens all four faith houses to devout towns.
- [Smelter, Stone Circle and Cliff Monastery](../../art/terrain-study/improvement-studies/charter-works.jpg) and [Bell Tower, Great Archive and Glasshouse](../../art/terrain-study/improvement-studies/charter-city-buildings.jpg) show the models in the board renderer.
- Six bots completed 120 turns on both the duel and standard boards. Both games finished without a rejected command or a stalled turn. The final state checks were `61fd7db6:346524` (duel) and `d5357525:1097051` (standard).
- On 2026-11-21, `npm run test:all` passed all 12,949 tests in 613 files on `df460761`. Typechecking and the production build also passed. The version 256 build went to port 5199 for fresh games.
- Save version 256 uses the new card pools. The wonder marker update also works on version 255.

### 0.1c A change in the bots and the save version, by the Claude session (2026-11-21)

The user ruled that plain Fortify wakes for an enemy in sight. The build is
on `decks` (the commit "A fortified unit asks for orders when an enemy comes
into its sight").

- Version 255 changed `Unit.untilHealed` to `Unit.dugIn` ('untilHealed' | 'awake') and added `enemyInSight`. The version 256 release recorded the expected states in `aiDigestPins.ts` and passed both replay checks.
- **One edit in `src/ai/bot.ts`** (about 30 lines): the bots pass over an
  awake dug-in piece as they pass over a skipped one. Without it, a bot unit
  that rests to heal would have hidden every blocker behind it in
  `firstBlocker`. The bots' decisions should not change. Eight core bot test
  files pass (`aiBot`, `aiDecision`, `aiDriverRepeat`, `aiEndCheckLoops`,
  `aiDriverEliminated`, `aiGarrison`, `aiEscorts`, `aiFrozenBoard`). The two six-seat games in the build report above completed without a stall.

### 0.1d City sites should prefer fresh water and the coast (2026-11-22, for your tuning run)

The user: "the city suggestions don't seem very good, it should prioritize
settling fresh water or coastal." Detail and figures: `docs/flags.md`, "City
sites should prefer fresh water and the coast".

- A dry city grows 30% slower, and the site score gives fresh water 6 points
  and the coast 4, against 14 for a luxury. The bots found by the same score
  (`explainSite`), so they share the fault.
- Proposed starting figures in `rules.sites`: `freshWater` 24, `coast` 12.
- They change where every bot founds. Take them at the start of your tuning
  run, or tune them in it. The user asked that you keep an eye on it.

The [settlement study](benchmarks/settlement-water-2026-11-21/report.md) found that the bot used its own fresh-water value and gave coast no direct bonus. The trial branch `codex/bot-settlement-water` shares those values with the settler lens. With 16 for fresh water and 8 for coast, 17 of 26 new towns had water access, up from 14 of 28. Total score fell 8.5% across the two version 257 maps. The trial remains separate for review.

### 0.1e The first age and the difficulty ladder (ruled 2026-11-22)

The user's words and the full tables: `docs/plans/wagers-and-first-age-options-2026-11-22.md`,
the section "The user's rulings" at its foot. Both change the bots' world, so
take them where they fit your tuning run.

**The first age: seven changes, ready to build.**
1. The Hall of Deeds: +4 culture, +2 authority. Units of yours that fall in
   combat yield culture equal to 50% of their combat strength. This replaces
   its present effects.
2. The Granary unlocks with Agriculture.
3. Calendar and Fletching swap places, so that plantations come earlier.
4. The Monument unlocks with Pottery.
5. The Shrine gives +2 faith and unlocks with Husbandry.
6. Sailing moves to the first column, with Agriculture as its only
   prerequisite.
7. The Lumber Mill unlocks with Bronze Working.
The tree's lanes are the user's chart, and crossings are pinned as a number:
say what the moves do to both. Later, not now: age II wants two or three more
technologies, and the user is toying with one that opens a Mill (+2 food, +2
gold) and a Public Fountain (+1 happiness, +1 more with a garrison).

**Difficulty: a ladder of fifteen tiers.** Each tier adds ONE rule to all the
tiers below it (the model is Slay the Spire's Ascension). A tier is part of a
game's config, so a save replays. No percentage of combat strength: flat
points only.
1. Rivals and barbarians gain +2 strength.
2. Rivals gain +20% growth and production.
3. When an age closes, barbarians spawn across the map, about as at the
   start of the game, each camp with two units.
4. Your buildings and units cost 25% more.
5. Rare and uncommon Orders appear less often.
6. Rivals start with one more Warrior and a Settler.
7. Rivals gain +30% to all yields.
8. Your Order drafts and great people cost 30% more.
9. Barbarians and rivals produce units 30% faster.
10. Rivals gain +50% production toward wonders.
11. Buying with faith and gold costs you 30% more.
12. Rivals gain +25% science and culture.
13. Wager milestones are 40% higher for you.
14. Technologies cost 30% more.
15. Rivals gain +50% to all yields.
The readings are confirmed (2026-11-22): every tier ADDS ("the hardest difficulty
should be brutal"), so tier 15 puts the rivals at +80% to all yields with tiers 2
and 12 on top; tier 8 raises the culture price of a draft and the renown price
of a great person; tier 14 is for the player only. The Shrine gives +2 faith in
all. Tier 13 waits for the wager rework.
Smallest version proposed for the beta: a gentler "First game" setting and
tiers 0 to 5, all open, with no record kept.
**A question from the user for you:** "Not sure if this is in, but barbarians
should opt to pillage your improvements before they attack your city." Do
they today?

**The wagers are NOT ready.** The user's direction: a fixed goal pays a bead,
leading the world at the age's end pays one more, a seat must stake one, and a
failed stake has a cost that is still being designed. The Field of Glory is
cut. Do not build yet. The user wants the format settled, then your tuning
loop, then the numbers.

**Also merged by the Claude session on 2026-11-22, in your files:** towns
count all six yields when they place citizens (`docs/flags.md`, "Towns count
all six yields"): save version 257; `src/ai/bot.ts`, `plan.ts` and `wants.ts`
read the new sheet; the digests and slow replay pins need a new recording.

The seven first-age changes and the barbarian change are on `codex/first-age-handoff` (save version 258). The Shrine gives two faith per turn in total. The regular Age I tree has no crossings. The whole chart keeps one crossing. Astronomy keeps Calendar as a prerequisite and moves one lane on the Scientific charter shelf to clear Smelting. Raiders fight adjacent soldiers first, then prefer a reachable, visible improvement over attacking a city. The [bot study](../audit/bot-play-2026-11-21.md) uses version 257 and records its replay checks separately.

Both six-seat version 258 games finished 120 turns and reloaded exactly. The duel used 6,291 commands and ended at `09201022:384334`. The standard board used 6,923 commands and ended at `7cc2deb2:1061977`. Neither driver reported a warning or a stall.

The difficulty rules for tiers zero through five are on `codex/beta-difficulty`, based on the first-age candidate. The tier is part of the save (version 259). Tier five uses the proposed 75/20/5 rarity weights before bonuses. Claude can set `GameConfig.tier` on the setup screen, read `game.state.tier ?? 0` on the ending screen and use `DIFFICULTY_RULES` for the rules list. The current draw and pass preview both use the acting player's odds. Higher tiers and the separate “First game” setting are outside this beta candidate.

The first full difficulty run found failures in 18 files. After the fixes, all 537 tests in those files passed. The repaired candidate is `ad26311a`. That candidate is included in the combined release below, which passed the full suite. The bot-strength comparisons use normal difficulty on the separate version 257 branch.

### 0.1f The wager is ruled and ready to build (2026-11-22)

**Spec: `docs/plans/wager-spec-2026-11-22.md`.** It replaces the note in
0.1e that the wagers are not ready. Read the spec; this is the short form.

- **Age I:** every seat has one bar, its score, from turn 1. Each of three
  marks that it passes pays 1 bead on that turn. No choice.
- **Ages II to IV:** when the age opens, a seat picks one of three wagers
  (two dealt, the same for every seat, and its score) and one of three marks:
  low 1 bead, middle 2, high 3. It is paid on the turn that its number reaches
  the mark, or not at all. No malice for a miss.
- **7 beads** open the door, as today.
- **The score changes:** the bead line goes; the card line counts every source
  on the In play screen, not Orders alone; two new lines: rival units and
  camps defeated, and army strength (base strength, plus rank, plus card lines
  that add strength with no condition).
- **Twelve dealt wagers** in four groups; the 24 of today, the secret stake
  and its malice retire.
- **You place the marks from bot games** (section 5 of the spec), and propose
  the weights of the two new score lines.
- The screens are the Claude session's. It needs readings for: a seat's
  offer, each wager's number now and its marks, the pick, and a mark reached.
- Difficulty tier 13 raises every mark of the player's bars by 40%.

### Combined play release, 2026-11-22

The user asked to merge the tested bot work, Age I changes and other ready
handoff items for a fresh game on port 5199. The branch is
`codex/bot-play-integration`, at save version 260. Camps now unlock at
Husbandry instead of Fletching. The Camp permission tests check both sides.

This combines the seven Age I changes, the raiders' pillage preference,
difficulty rules zero through five, and the reviewed bot worker, purchasing,
local-defense and ranged-combat fixes. The Arena leader picker also handles
leaders with no persona override. The difficulty setup and ending-screen
controls remain Claude's UI work. Normal setup still selects tier zero.

The full release check exposed a pre-existing bot pricing error: relief from
town losses was counted both in the happiness change and in a separate
forecast. It now uses the card stamp, as unit-loss relief already did. The
new core test checks both kinds of loss. The 120-turn duel and Standard games
kept the same commands after that correction and replayed exactly. Their
final digests are `4172463b:393230` and `64733584:1087655`.

The combined test run also found text expectations left behind by the new
unit-class links and labels. Those expectations and the reference documents
now use the current descriptions. Short card faces say "strength" on an
unconditional class-strength line; the full description keeps "combat
strength". Every live card still has to pass the existing fit test.

Release validation passed: typecheck, all 618 test files and 13,046 tests
(core and slow), and the production build. The rollback tag is
`codex/play-before-age1-2026-11-22`; the release tag is
`codex/age1-play-2026-11-22`. The separate score-accounting agent
uses `codex/wager-score-accounting` for section 0.1f. Wager marks and score
weights still need measurements. The science/Order planning experiments and
the water-site tuning trial are not in this play release.

### 0.1g Units heal faster at home and in a city (2026-11-22)

Ruling and detail: `docs/flags.md`, "Units heal faster at home and in a
city". The figures are totals, confirmed by the user: a rested unit heals 10
outside its owner's land, 20 on a hex that its owner owns, and 30 in its
owner's city. New labelled lines in `explainUnitHeal`: +10 for its own land,
and +10 more in its own city, but not while the city is under siege (then it
heals 20). Figures in `rules.healing`.

Implementation: `codex/home-healing-city-roads`; focused tests and TypeScript
checks pass. Parent integration is pending. See
`home-healing-city-roads-2026-11-22.md`.

### 0.1h A city hex counts as a road for movement (2026-11-22)

Ruling and detail: `docs/flags.md`, "A city hex counts as a road for
movement". A step between a city's hex and a paved neighbour is a road step.
Make it one derived reading in `stepCost` and `cheapestStepCostFor`; do not
write `Tile.road` on a city's hex.

Implementation: the same isolated branch. Movement profiles carry city tiles;
city centers are excluded from road maintenance. Validation is recorded in
`home-healing-city-roads-2026-11-22.md`.

### 0.2 Built, as far as the data shows (no action, unless you know otherwise)

- 3.6 the wonders rework (the new wonders have rows), 3.7 Dominion and
  Magisterial, 3.8 religion names, 3.9 great people, 3.10 the leader roster,
  3.11 a purchased unit beside a full city, 3.12 the citizens' hexes (built
  by you, then restyled by the Claude session: see 0.4).
- 3.15: science for each citizen 0.25, Library +3, University +6,
  Amphitheater +4, a soldier's surcharge 80%, the worker and the settler.
- A lumber mill gives +2 production. A terrace farm needs a mountain.
- 3.5: All 39 approved generic Orders are in the game. The live rows match
  `docs/decks/common.md`. See `test/sim/decks/common.test.ts`.

### 0.3 New notes from the Claude session's design work (2026-11-21)

**City site ranking** (`rankSites` in `src/sim/sites.ts`). The user: "i
notice the city recommendations are all close to one another" and
"sometimes they're not very good". On one seeded game at turn 76:
- the best site was two hexes from a barbarian camp: the score does not see
  camps;
- sites I and II were so close that only one could be founded: the three
  sites should be three places a seat can hold together;
- thirteen hills scored 26, more than fresh water, the coast and a luxury
  together at 24.
The settler lens now draws corner marks and pips on the ranked sites. The hover panel explains why each site qualifies.

**Worker advice.** The user wants a selected worker to show the best two or
three hexes to improve, as a quiet ground mark and one line in the hex's
tooltip ("Advice: Build a Camp here", with the gains and losses in yields).
The board and the hover panel read the same answer from `createWorkerAdviceReader`. It runs the bot’s improvement planner in a background worker. A change of seat, selection, game or revision prevents an old reply from drawing marks.

### 0.4 What the Claude session changed in your areas, so that you know

- **Combat** (`src/sim/combat.ts`, `data/rules.json`): the river is a flat
  −3 line; a land bow against a ship −6; land siege against a ship +6; a ship
  that attacks an embarked unit takes no counter-blow. `SCHEMA_VERSION` 252.
  The user asked the Claude session directly.
- **The painted board's fog shader** (`paintedFogLook.ts`, `paintedFog.js`,
  `paintedBoard.js`): two more channels and one block, for a natural
  set-back shade on the city screen. With the shade off, the shader does one
  more uniform test for each fragment. Measure it in your frame timings.
- **The city screen** (`citizenMarks.ts`, `lens3d.ts`, `overlays.ts`,
  `cityPanel.ts`): "Manage citizens" is a mode; a worked hex's yields sit on
  a parchment plaque; a pinned hex's plaque has a pin head. The old outlines'
  code (`citizenOutlines` and its call in `overlays.ts`) is dead and will be
  removed by the Claude session.
- **In flight in the Claude session now:** "Fortify until healed" (a unit
  order and the unit panel; it may raise `SCHEMA_VERSION` to 253), and the
  Compendium pass (`src/ui/compendium*.ts`, `describers.ts`: a new
  `describeUnitRow`).

## 1. Who owns what

| Area | Owner | Main folders |
|---|---|---|
| Bot play, bot speed, the spectator and arena pages | **Astra** | `src/ai/`, `src/spectate/`, `src/arenaPage/`, `data/ai.json`, `test/sim/ai*.test.ts` |
| Rendering speed and the 3D renderer | **Astra** | `src/render3d/`, `data/view3d.json`, `test/render/` |
| 3D models (unit pieces, towns, wonders, props) | **Astra** | `src/render3d/`, `src/piecesGallery/`, `pieces.html` |
| Code cleanliness and general performance | **Astra** | the whole tree, with the limits in section 5 |
| Screens and other DOM interface work | Claude session | `src/ui/`, `src/main.ts`, `index.html`, `src/style.css`, `src/flairGallery/`, `src/art/` |
| Game rules, cards, decks, balance data | Claude session | `src/sim/`, `data/` (not `ai.json`, not `view3d.json`), `docs/decks/` |

If a piece of Astra's work needs a change in a folder the Claude session owns
(or the reverse), keep the change small, name it in the report, and expect a
merge. Section 5 lists the files in flight today.

## 2. State of the repository

- Working branch: `decks`. HEAD at the time of writing: `120ddab8` plus this
  document. Nothing from this branch has been pushed since the last deploy.
- Last full gate on `decks`: typecheck 0, 518 test files and 12,017 tests, the
  bot digest slow test 0, build 0.
- `SCHEMA_VERSION` is 245.
- Bot digest pins (`test/sim/aiDigest.slow.test.ts`): duel `2fa80e05:339704`,
  standard `040c052c:1045966`. A change that should not alter bot play must
  keep both. A change that does alter bot play cuts new pins and says why.
- The play server for the user's playtests is the clone `~/code/webciv-play`
  on port 5199. Never kill a Vite process you did not start. Never run
  `pkill -f vite`.
- Shared measurement baselines: `/Users/jacky/code/webciv-baselines/` (read its
  README). Five seeds: 42, 999, 1, 7, 2026.

## 3. Work Astra takes over

### 3.1 Bots

**Follow-up.** The shared bot runner, worker planning and the 16-seed comparison are complete. Tests of delaying research decisions and pricing fewer Council candidates found no useful gain to ship. The November 19 report records the results for each item in the original queue below. [Bot performance report](bot-performance-and-cleanup-2026-11-19.md#performance-queue)

**In flight, finished by the Claude session before the handoff:**
- Stage C1, frozen-board play on one thread. An agent is building it. The
  Claude session gates and lands it, then stops bot work. Astra starts from
  the commit that lands C1. The landing commit and the agent's report will be
  added to section 7.

**Astra's first step (the user's words): reconcile the spectator and the
regular bot logic.**
- The game drives bots through `src/ai/driver.ts`, `src/ai/stepper.ts`,
  `src/ai/bot.ts` and `src/ai/sittingPhases.ts`.
- The spectator page is `spectate.html` with `src/spectate/main.ts`. The arena
  page is `arena.html` with `src/arenaPage/`.
- Find every place where the spectator or the arena runs a bot differently
  from the game, and make them one path. The digest pins must hold, because
  bot decisions must not change.
- `CLAUDE.md` rule: the arena panel is generated from `data/ai.json`. A new
  bot setting must appear there with no page edit.

**Queued after that, in this order (specs in `docs/flags.md`, lines near 101):**
1. Stage C2: bot seats on workers. It waits for a decision on the C1 report.
2. BP17: the bots think during the player's turn.
3. BP18: think about slow things less often.
4. BP19: price a shortlist of cards, not every card (audit finding T6).

**Read before any bot work:**
- `docs/bot-priorities.md`, section "The order of a sitting".
- `docs/plans/performance-pass-2026-11-06.md`: every bot batch so far, with
  measurements. Sections "Stage B" and "BP16b-fix: the order fault".
- `docs/flags.md`: "Bots after BP16 stage B", "BP16b-fix: the order fault,
  found and not shipped".

**Known and not shipped:** a bot's context memos can be stale (0.9% of kept
reads). The exact fix costs 5 to 8% of bot time, so the user did not ship it.
The patches are in `/Users/jacky/code/webciv-baselines/bp16fix/`.

**A warning about estimates:** speed estimates for bot batches have been wrong
several times in this project. Measure on the five seeds before you claim a
gain. See the memory note on probe noise: 8 seeds cannot read happiness, and
ms per turn varies by about 14 between a cold and a warm run.

**Open questions for the user on bots:** a 16-seed check against the build
before BP13; audit items T1, T5 and T6; a persona for each leader.

### 3.2 Rendering speed

**Follow-up.** Close-zoom ground paint has a playable trial and comparison images. The default still uses detailed land up close. The Giant-map trials are on hold. [Trial and measurements](close-terrain-trial-2026-11-19.md)

**In flight, finished by the Claude session before the handoff:**
- Ground paint texture, stages 1 and 2: plain textured land at the middle and
  farthest zoom, the cut mesh at the closest zoom, with a switch back. The
  Claude session gates and lands it. Section 7 will name the commit.

**Queued for Astra, first:**
- **Use the texture at every zoom and stop drawing the cut land** (the user,
  2026-11-19). The ruling and what the build must settle are in
  `docs/flags.md`, "Ground paint texture: use the texture at every zoom". The
  main question is sharpness at the closest zoom: show the user pictures
  before you remove the switch back.

**Queued for Astra, after that:**
- Ground paint texture, stages 3 and 4. Plan and measurements:
  `docs/plans/ground-paint-texture-2026-11-18.md`. Rulings: `docs/flags.md`,
  "Rendering focus: the ground paint texture" and "Ground paint texture: build
  stages 1 and 2".

**Deferred by the user (do not build without a new ruling):**
- Simpler trees ("way too simplified").
- The scroll cache and its zoom handling.
- Lower resolution while the camera moves.

**Read first:** `docs/plans/render-performance-2026-11-16.md` (five passes,
with what was measured). The main facts: a pan frame is limited by the GPU's
fragment work; multisampling costs 9 to 13 ms; the land is drawn with vertex
colour.

**The user tests in a WebKit browser now.** Check rendering work in Safari or
another WebKit browser as well as in Chromium.

### 3.3 3D models

- Art direction is settled: a toon diorama made of procedural primitives.
  `MeshToonMaterial` ignores `flatShading`, so facets are baked into geometry.
- The user's past rulings on models are in the memory note "Visual pass
  2026-11": unit pieces are chess pieces with small, readable changes. Visual
  changes must be simple to revert.
- A new visual asset joins `flair.html` or `pieces.html` in the same change
  that ships it.
- The 3D abacus (`src/render3d/abacus3d.ts`) is finished in look B. Its bead
  count waits for the wager rework, which is gameplay. Leave it.
- Wonders will later get painted splash art in the interface. That is an
  interface job. 3D wonder models on the map are Astra's.

### 3.4 Code cleanliness and general performance

- There is an untracked audit by the user, `docs/plans/code-quality-audit.md`.
  Ask the user if it is the starting list.
- `docs/plans/tidy-2026-10-26.md` records the last tidy pass.
- The register tests in `test/` pin many structures on purpose (one switch on
  `CardEffect.kind`, the exhaustiveness idiom in the reducer, re-exports by
  name, the list of yield mutations). Read the "Hard rules" and "Traps"
  sections of `CLAUDE.md` before you simplify anything. Several things that
  look like duplication are pinned and have a stated reason.
- `src/render/` is the frozen 2D renderer. Keep it compiling. Add nothing.
- Do not rename the RNG separator `hashSeed('webciv:gameplay:…')`.

### 3.5 The generic Orders build

The user, 2026-11-19: *"Lets leave the generic orders build for astra."*

- The approved set is 39 cards. The spec is
  `docs/plans/generic-orders-proposal-2026-11-18.md`: the user's ruling
  section, section 7 (the set after the ruling) and section 8 (the build
  list in three groups, the rows to retire and change, what the bots need in
  `src/ai/value.ts`, and section 8.6 on putting the sheet under a test). The
  current-state sheet is `docs/decks/common.md`.
- Read `.claude/skills/card-design/` for the card rules. A card whose text
  needs a one-off is deferred and annotated, never bent into a near fit.
- The user said the numbers are "to tune in playtest": do not run bot games to
  size them.
- **The Summer Palace (G2-7) is decided** (the user, 2026-11-19): "Cards that
  pay your capital pay 50% more." See the last section of the proposal file.
  Build it with the rest and update its row on `docs/decks/common.md`.
- Fix with it: an on-draft great-person grant is lost if another offer is
  waiting or every person of that family is taken. Send it through
  `grantGreatPersonOffer`. This also fixes The Wandering Muse.
- The build changes bot play, so it cuts the digest pins. See section 5 on
  who cuts them.

### 3.6 The wonders rework (ready)

The user, 2026-11-19: *"lets have astra take it once we make the
determinations."* The determinations are made.

- **The spec is the last section of `docs/plans/wonders-review-2026-11-18.md`,
  "Ready for the build".** It stands alone: 8 new wonders, 18 revised, 1
  retired (The Water Clock of Su Song, kept as a `retired` row), 6 technology
  moves, 34 wonders in all. The four sections of the user's comments above it
  are the source if a line is unclear.
- 46 new or changed clauses: 37 use shapes the game has, 7 need a small
  extension and 2 need a new shape. A clause that does not fit is deferred and
  annotated, never bent into a near fit.
- The age 1 wonder with the free rerolls is **The Great Sphinx**
  (`greatSphinx`). The user confirmed the name on 2026-11-19: "The great
  sphinx is fine." No name is open.
- The section ends with checks for the builder (things the designer did not
  confirm in the evaluator) and two numbers to watch in playtest. Do not run
  bot games to size numbers.
- `docs/wonders.md` is out of date and changes with the build.
  `test/sim/wonders.test.ts` pins twenty-seven rows.
- The build changes bot play, so it cuts the digest pins (section 5).

### 3.7 The Dominion and Magisterial deck passes (ready)

The user, 2026-11-19: *"yes, add them to the handoff doc."* Both decks had a
design pass. The user ruled on every change, in comments that the two files
keep word for word.

- **Dominion:** `docs/plans/dominion-design-pass-2026-11-19.md`, last section
  "Ready for the build". 46 entries: 38 are data only, 7 need a small
  extension, 1 needs a new shape (The Field of Mars). The deck goes from 73 to
  82 Orders and from 13 to 14 Doctrines. Nothing waits on the user.
- **Magisterial:** `docs/plans/magisterial-design-pass-2026-11-19.md`, section
  "Ready for the build". 41 changes and 7 rows to retire: 29 are data only, 10
  need a small extension, 2 need a new shape. The deck goes from 64 to 67
  Orders and stays at 17 Doctrines. Nothing waits on the user.
  - Build its main batch first.
  - Change 34 (The Paradise Garden's reward) and change 27 (The Spirit Way)
    come **after the wonders rework** (section 3.6), because they use the
    doubling line that The Mausoleum adds. The Spirit Way is its own batch:
    the section gives its rules (a "ghost work" for each wonder) and every
    reader that must learn them.
- **A wording batch across all decks:** card text says "a melee unit" or "a
  ranged unit", not "the best melee unit you can build". The rule does not
  change (a grant still picks the strongest unit of the class the empire can
  build then); it is stated once in the keyword tooltip. The Magisterial file
  lists where the phrase lives: 11 live card texts, 8 places in
  `statecraft/describers.ts`, the card text fixture, and lines of the approved
  generic set and wonders.
- Each "Ready for the build" section ends with points for the builder to check
  in the code. Treat them as checks, not as facts.
- Every new card needs a flavour line (a `flavor` field, labelled Flavour).
  None is written. Ask the user who writes them, or leave the field empty and
  list the cards.
- Numbers are "to tune in playtest". Do not run bot games to size them.
- A card whose text does not fit a shape is deferred and annotated, never bent
  into a near fit.

**A suggested order for all the card work** (each step cuts the digest pins):
1. the generic Orders (3.5);
2. the wonders rework (3.6);
3. Dominion;
4. Magisterial, main batch;
5. Magisterial change 34 and The Spirit Way;
6. the wording batch, last, so it also covers the new cards.

### 3.8 Religion names (ready)

- The user chose a roster of 59 short names that read as a religion, a school
  or an order, tied to the pantheon's axis. The spec is the last section of
  `docs/plans/religion-names-2026-11-19.md`, "Ready for the build", with the
  builder's notes in the same file. The ruling is in `docs/flags.md`,
  "Religion names: short names that sound like a religion (2026-11-19)"; it
  replaces the part of the 2026-08-27 ruling that forbade a fixed roster.
- It is small: a data shape, one function (`generateReligionName` in
  `src/sim/religion.ts`), a validator, a few tests and docs.
- A founding goes from two or three dice rolls to one, so every seeded game
  changes after the first founding. It needs a schema step and cuts the digest
  pins. Do it with any of the card batches.

### 3.9 The great people pass (ready, with two small points open)

The spec is `docs/plans/great-people-pass-2026-11-19.md`. Read the three
rulings sections at its end first ("The user's first rulings", "second
rulings", "third rulings"): they overrule the tables above them wherever the
two differ. A row the user did not comment on is approved as its table shows.

- **The roster:** 157 people, ten or eleven a family in each of Æra II to IV.
  Additions A01 to A74, changes C01 to C33, returned rows U1 to U5.
- **System changes that are approved:** S1 (deal each roster age in its own
  game age: remove the +1 in `rosterAgeFor`), S2, S3 as the user rewrote it (a
  work pays 4, and two technologies add 2 each; propose the two technologies),
  S4 at 8 turns, S5, S11.
- **Not adopted:** S6, S7, S8, S9, S10. Do not build them.
- **One rule for every legacy:** no percentage of combat strength. Flat points
  only.
- **Renown feeders:** five wonders change family (Stonehenge and Chichen Itza
  to the artist, The Great Ziggurat and Solomon's Temple to the engineer, The
  Great Sphinx to the general). The Library of Ashurbanipal keeps 10 a turn.
  This meets section 3.6 (the wonders rework): do the two in one batch or in
  that order.
- **New shapes are likely** for Li Bai (a hex beside a river or a mountain),
  Aḥmad ibn Mājid (sea routes), the "pays double" rows (Ibn al-Haytham,
  Copernicus), the spare-authority count (Ibn Khaldun), and the one-time
  grants on spending (Aesop, John Dee). Each is a design decision under
  CLAUDE.md: say which you add. A row that fits no shape is deferred and
  annotated, never bent.
- **Open with the user:** S12 (the ratings). It does not block the rest.
  Deborah stays as she is (ruled 2026-11-20).
- **The card:** `greatPersonCard.ts` no longer prints "When spent". Portraits
  are in `public/art/splash/people/`, one a row id; a new row needs no
  picture.
- **Schema:** the roster and the deal change saved games. Raise the schema.

### 3.10 The leader roster (ready, on the readings listed here)

The spec is `docs/plans/leader-roster-pass-2026-11-19.md`. Build from its
sections 1 to 6. The parts headed "Record" are the first pass, kept for the
reasoning; they are not the spec.

- **Sixteen leaders:** one for each pair of decks, and Ibn Battuta for every
  deck. Section 4 has each kit in full: two abilities, a unit, a building or
  improvement, the capital and town list, the colours and the bot persona.
- **Unchanged:** Joan of Arc, Pachacuti, Mansa Musa and Ibn Battuta keep the
  kit they have today. Nezahualcoyotl changes one ability.
- **New rows:** eleven leaders, seven units, seven buildings and one
  improvement (section 6, "For the builder", lists them and the five small
  extensions; the pass asks for no new effect shape).
- **Eight leaders leave and their rows stay, hidden.** A save is
  `{config, log}`, so a config that names a missing leader does not replay.
  Add a `retired` flag to `LeaderDef`, and make the leader screen, the random
  seat and the Compendium skip a retired row (section 5).
- **Six code points to check before you build** are in "For the builder". If
  one does not hold, say so before you bend a kit: a line that fits no shape
  is deferred and annotated.
- **The user ruled on the readings on 2026-11-20.** Read the plan's section
  "The user's rulings on the readings (2026-11-20)" before sections 1, 2 and
  4: it overrules them where they differ (eleven lines changed, among them all
  of Jayavarman VII's abilities and building, Lorenzo's caps, Cleopatra's
  deals and Sejong's Hall). The short section after it, "The user's last rulings on the
  readings", closes its open points and overrules it in turn. Nothing in the
  leader pass waits on the user. The great person Cosimo de' Medici is replaced by Jacques Cœur (in the
  great people pass).
- **The great person named Ibn Battuta** is renamed Ibn Jubayr (great people
  change C25), since the leader keeps the name.
- **UI that is already built:** the setup's leader step ("Choose your
  leader") and the diplomacy sheet read the roster and need no change. Their
  portrait windows read `src/ui/leaderPortraits.ts`; a portrait is
  `public/art/splash/leaders/<leader id>.jpg`, and a leader with none shows
  the seat's charge. Tell the Claude session the final leader ids, so the
  portrait files can be named to match.
- **Colours:** the table in section 6. The rule is 40 between primaries
  (`inkDistance`); the closest pair is at 59. `test/render/seatInks.test.ts`
  pins it.
- **Order:** build this after the deck passes (3.5 and 3.7). Several kits
  read cards that those passes change.
- **Schema:** the roster changes saved games. Raise the schema.

### 3.11 A purchased unit appears beside a full city (ready, small)

The ruling is in `docs/flags.md`, "A purchased unit appears beside a full
city (ruled 2026-11-20, not built)". It changes `purchaseError` and the
purchase path in `src/sim/purchase.ts`, and the sentence the city screen
prints. The city screen (`src/ui/cityPanel.ts`) prints whatever
`purchaseError` returns, so it needs no change.

### 3.12 The citizens' hexes on the board (ready)

The spec is `docs/plans/citizen-hex-marks-2026-11-20.md`, with drawings in
`docs/plans/mockups/citizen-hex-marks/`. While a city is open, worked hexes
are bright and outlined, free hexes are lightly shaded, and the rest are dark,
with yields on the hexes the city can use. A "Citizens" toggle adds one plain
dot to each worked hex. It replaces the small rings in
`src/render3d/overlays.ts`.

### 3.13 Models the board is missing (audit of 2026-11-20)

Art review, 2026-11-20. Keep the current painted unit models. Use them as the style reference for the missing units below. The Court Reader was a separate study. Revise the Nazca Lines so the hummingbird reads on the game's sand, and move the Wild Orchard's ladder into view at normal zoom. Review these two improvements before moving on to the unit models. Show the new models for review before adding them to play.

The revised orchard is approved. Draw the Nazca hummingbird from aerial photographs of the real figure. Give the line a white center and a dark gravel edge that stays visible against the sand at play zoom.

The user: "what are we missing in terms of 3d models? lets put that in the
handoff doc for astra. off the top, fish traps is one, and unique units that
we've since added to the game?" This is a read of the code on `decks`, for the
painted look (the default; the toon look is only the fallback for weak
graphics cards). Nobody ran the game for it, so how a borrowed prop looks on
the painted board is not judged here.

**How a model is chosen today.** A unit type draws its own model only if it is
in `paintedUnitTypes` (`src/terrainStudy/unitCatalog.js:65`); a type that is
not falls to the old toon class figure (`sculptFor`, `board3d.ts:590`). The
painted works layer draws fifteen improvements (`paintedWorks.ts:36`); every
other improvement is drawn by the toon layer's props (`board3d.ts:783-818`),
and an improvement with no prop at all stops the game at load
(`board3d.ts:831`). The Blender unit models in `art/terrain-study/` are not
loaded by the game (`NORTH_STAR_UNIT_MODELS = false`,
`src/terrainStudy/northStarAssets.js:108`).

**Missing or borrowed today**

| Thing | What draws now | Where |
|---|---|---|
| Fish traps | the toon fishing boat | `board3d.ts:799` |
| Wild orchard | toon trellis rows | `board3d.ts:800` |
| Floating gardens (Nezahualcoyotl) | toon farm furrows | `board3d.ts:783` |
| Physic garden | a toon fence ring, tinted green | `board3d.ts:812` |
| Qanat | the toon mine head | `board3d.ts:818` |
| Town keep, polder, outpost | their own placeholders, in the old toon style | `board3d.ts:805-807` |
| Plantation | the farm's barns | `northStarAssets.js:79` |
| Numidian Cavalry | the toon mounted figure | not in `paintedUnitTypes` |
| Company Guard | the toon melee figure | not in `paintedUnitTypes` |
| All 34 wonders | each takes the next of three monuments (obelisk, ziggurat, armillary), which are also the shrine, the temple and the capital | `paintedCities.ts:39, 515` |
| Twelve shrub resources | one shrub model, tinted | `settlementArt.js:279-317` |
| Sixteen ore resources | one crag rock, tinted (obsidian has its own) | the same |
| Wheat, rice, maize, reeds | one grain tuft, one colour | `settlementArt.js:54` |
| Pearls and Tyrian dye | one shell in two colours | `settlementArt.js:70` |
| Jungle | the forest's trees with another tint | `paintedBoard.js:666` |
| A pillaged work | seven works have a ruin; every other one leaves an ash patch | `northStarAssets.js:84` |

Buildings other than the palisade, shrine and temple are not drawn on the
board at all, so the 21 leader buildings need nothing.

**Every unique unit in the game today has its own painted model** (the audit
checked all thirteen leaders' units). The two units above are the only gaps.

**Coming, and will need a model**

| Thing | From | State |
|---|---|---|
| Hypaspist, Janissary, Condottiere, Qin Crossbowman, Sparabara, Hwacha | the leader roster (3.10) | Final. Each new unit id must join `paintedUnitTypes` with a model, or it draws as a toon figure. |
| Ballista Elephant | the leader roster | A `siegeElephant` model exists and no row uses it (`warElephantModel.js:131`). Map it to the new row. |
| Keshig | the leader roster | It keeps the Xiongnu Horse Archer's model only if the row keeps its id. |
| The School of Mieza, the other new leader buildings | the leader roster | Nothing: buildings are not drawn. |
| The Paradise Garden (Cyrus's improvement) | the leader roster | Final. It needs a prop, or the game stops at load. |
| Nazca lines, inuksuk, totem pole, stepwell, hillfort, baray | the Expansionist pass (3.14) | Final. Each needs a model. Root-crop grounds, hill groves, the date garden, the reindeer corral, the hammer pond and the vineyard were withdrawn: do not model them. |
| The eight new wonders | the wonders rework (3.6) | In the data already. They need models only if the user decides wonders get their own. |

**Unit art review, 20 November.** The user approved the white Nazca hummingbird with dark edges. For the remaining land units, use the [current roster studies](../../art/terrain-study/unit-roster-review/README.md) and the painted units in the game as the style reference. Check the leader and deck rosters for any missing pieces. Look up a historical visual reference for each new figure or siege engine before revising the model. Record what the source shows and which details the model uses. If a unit has a fictional name or combines historical elements, identify its closest documented reference. Keep the pieces readable at play zoom and show them for review before adding them to the game. Keshig keeps its existing mounted archer. Ballista Elephant uses the existing siege elephant.

**Wonder models, 21 November.** Keep the three shared monuments on each city tile.

**Playtest approval, 21 November.** Add the eight new leader and charter pieces from `art/terrain-study/unit-roster-review/` to the painted board. Use the existing siege elephant for the Ballista Elephant and the existing mounted archer for the Keshig. The archer and spearman in section 3.16 are a separate Blender study.

Include the nine approved models in `art/terrain-study/improvement-studies/` in the same playtest. Fish Traps, Wild Orchard and Paradise Garden already have improvement rows. Use the revised orchard and the white Nazca hummingbird with dark edges. Use the painted board gallery to show works that still await their Expansionist gameplay rows.

### 3.14 The Commerce and Expansionist deck passes (ready)

Both passes are closed. Each plan ends in "Ready for the build" and then a
short section "The pass is closed", which settles its last open points. Read
those two sections first; the numbered changes above them carry a ruling each.

- **Commerce:** `docs/plans/commerce-design-pass-2026-11-20.md`. 85 cards
  (27 unchanged, 26 changed, 32 new, 16 cut), 15 Doctrines, 25 shared cards.
  Trade routes fall from 36% of the deck to 18%. New themes: the sea (15
  cards, all buildable today), land hexes, customs houses, the purse, and
  bridges to each partner deck. A great person bought with gold costs 10 gold
  for each point of renown the next one costs. The Open Market also discounts
  that gold price. **There is no cap on stacked discounts:** every purchase discount becomes "your gold buys N% more" (`docs/flags.md`, "A purchase discount is 'gold buys more'"), for gold and for faith, in every deck. Change 118 is withdrawn. A
  single larger discount still applies on its own.
- **Expansionist:** `docs/plans/expansionist-design-pass-2026-11-20.md`. 82
  cards (9 cut, 17 new), 21 Doctrines, 17 shared cards. **Wild land and
  tended land leave the game as keywords;** there is no third state of land.
  The new theme is **unique improvements:** any improvement a charter or a
  leader opens (the keyword covers Pachacuti's terraces, Nezahualcoyotl's
  floating gardens, Cyrus's Paradise Garden, the physic garden and the
  qanat). The deck's own are fish traps, orchard, Nazca lines, inuksuk, totem
  pole, stepwell, hillfort, baray, polder, keep and outpost; the plan has a
  table of each one's ground, yield and neighbour rule.
- **Shared between the two:** The Founders' Stores ("Towns you found start
  with a Granary") is one card. The Hillforts is shared with Dominion. Both
  passes change shared cards on the Devotion, Magisterial, Scientific and
  Dominion sheets; each plan lists them.
- **Base rules these passes ruled, for every deck** (`docs/flags.md`):
  - a lumber mill gives +2 production;
  - a city is coastal when it owns a coast hex within two hexes (decide where
    a ship built there appears; the flag proposes the nearest owned water
    hex, by a fixed order);
  - a purchased unit appears beside a full city (3.11).
- **Each new improvement needs four things:** a data row, the way a worker
  builds it (a charter opens it), an icon, and a board model. An improvement
  with no board prop stops the game at load (3.13). The new ones are the
  Nazca lines, inuksuk, totem pole, stepwell, hillfort and baray; fish traps,
  the orchard, the keep, the polder and the outpost have rows and borrowed or
  placeholder models today.
- **New effect shapes** are listed once in each plan's "Ready for the build",
  with the cards that need them. Each is a design decision under CLAUDE.md:
  say which you add, and defer a card that fits no shape.
- **UI the Claude session owes after these builds:** the current value on a
  growing card (The Votive Accounts, Bought and Paid For, The Makers of
  Land). Tell the Claude session when the cards exist.
- **Order:** these two after the generic Orders, Dominion and Magisterial
  (3.5, 3.7), since several shared cards read what those passes change. The
  leader roster (3.10) comes after all the decks.
- **Schema:** both passes change saved games. Raise the schema.

### 3.15 Base science, culture and unit prices (ready, small)

`docs/flags.md`, "Base science, culture and unit prices". Five figures: science for each citizen 0.25; the Library +3
flat; the University +6 flat; the Amphitheater +4 flat; a soldier's
surcharge 80%. Technology prices stay, so the tree is slower on purpose.
Run the bots before and after, and report the measures that the flag lists.
The same flag rules the worker and the settler: a worker costs 14 and each
one built adds 4 (14, 18, 22, 26); a settler costs 36 and each one built adds
9 (36, 45, 54, 63). The user calls these a first step ("i'll see if we need a
further pass"), so keep every figure in data. The docs with sync tests
(`docs/production-costs.md`, `docs/yields.md`) change with the data.

### 3.16 Unit pieces from a shared kit (a trial to take further)

`art/unit-kit-trial/`: read its `README.md` first. The user likes the form
of three reference pieces from an image generator (`reference.png`: a turned
base with a gold band, a faceted cloak body, a plain sphere head, a mantle,
hood or helmet, block sleeves, one large prop), and wants "the overall form
and not the render quality". The Claude session built the archer and the
spearman from one Blender script kit in four passes.

- **Start from the third pass,** which is the state of the folder. The user
  judged the fourth pass worse; it is in `pass4/` so that nobody repeats it.
- The README lists what is right, what still does not match (the arms most
  of all, then how the archer's hood joins its cloak), the outline measured
  at five heights against the reference, and which changes of the fourth
  pass measured right and may be worth trying one at a time.
- You can open the models in Blender and adjust a part while you look at
  it. The Claude session worked from renders only, which is why its last
  pass disturbed as much as it fixed.
- The user's request: "give them to astra … to see if it can improve on
  them". Show the user the two pieces beside the reference, and at board
  size in three seat colours, before you build more units.
- If the user approves the pair: a new unit on foot is a new prop and new
  headgear on the same body. Mounted units, ships and siege engines need
  their own bodies; try one horse only after three or four more foot units
  hold. "Seat" and "SeatDark" are the two materials to recolour for a seat.
- The game does not load these models. Loading them is your decision with
  the user (3.13 describes what the board draws today).

## 4. Rules that apply to every change

- **Rulings go in a file before work starts.** `docs/flags.md` for open
  rulings; the system's reference document for the rest. A chat message is not
  a spec.
- **The gate for each landed change:** `npm run typecheck`, `npm run test`,
  `npm run build`. When sim or bot code changes, also
  `TEST_TIER=slow npx vitest run test/sim/aiDigest.slow.test.ts`. Check exit
  codes, not summary lines.
- **The push gate is `npm run test:all`.** The user must say yes to each push.
- **Machine load.** The laptop is slow under several jobs. Run every command
  behind `nice -n 15`. Run one gate at a time. Check `uptime` first: at a load
  above about 50, vitest tests time out for no real reason. Rerun a failed file
  alone at low load before you call it a failure. Keep the laptop on power for
  measurements.
- **Subagents** run only their own test files, never the whole suite, and
  never commit, stash, check out or reset.
- **Commit by explicit path.** Leave these alone: `.claude/settings.local.json`,
  `docs/playtest_notes.md`, the untracked `docs/*.md` files, `.impeccable/`.
  Do not edit `CLAUDE.md` or `AGENTS.md` without the user's approval.
- **Determinism.** Same config and command log give the same state, bit for
  bit. Rendering never reads sim randomness. `test/sim/explore.test.ts` pins
  hash the schema number, so a schema bump moves them with no change in play.
- **Writing.** Plain English, ASD-STE100 at about 75%, Orwell's six rules, no
  em dashes, they/them for people.
- **Pictures for the user** go in one page with the images embedded as
  `data:` URIs. Separate picture files do not load in the user's browser.

## 5. Files in flight in the Claude session (avoid, or expect a merge)

| Job | Files |
|---|---|
| Council and In play, stage 4, and the wonder plate | `src/ui/statecraftScreen.*`, `src/ui/councilLayout.ts`, `src/ui/inPlay*.ts`, `src/main.ts`, `index.html`, `src/flairGallery/` |
| A wonders rework (after the user's picks; spec `docs/plans/wonders-review-2026-11-18.md`) | `data/buildings.json`, `src/sim/statecraft/*`, `src/sim/buildingEffects.ts`, wonder tests. **It changes the digest pins.** |
| Later gameplay work (`docs/beta-checklist.md`) | `src/sim/`, `data/` |

Two meeting points to watch:
- **`src/ai/value.ts`.** A new card shape needs a bot value. The Claude session
  adds that line with the card. Astra owns the rest of the file.
- **The digest pins.** Both sides can move them. Whoever lands second merges
  `decks` first, reruns the digest test, and cuts the pins on the combined
  tree. Never copy a pin from a branch.

## 6. How to work beside the Claude session

- Work on a branch or worktree made from `decks`. Do not commit to `decks`
  directly while the other session has work in flight.
- To land: merge `decks` into the branch, run the whole gate there at low
  load, then fast-forward `decks` (or make a merge commit if `decks` moved by
  documents only). Then update the play clone:
  `cd ~/code/webciv-play && git pull -q --ff-only /Users/jacky/code/webciv decks`.
- Existing agent worktrees are in `.claude/worktrees/`. Do not edit or remove
  them.
- Record what landed, with the gate result, in the plan document for that
  area (`performance-pass-2026-11-06.md` for bots,
  `render-performance-2026-11-16.md` for rendering).

## 7. Handoff points (the Claude session fills these in)

| Work | Landed at | Notes |
|---|---|---|
| Bots stage C1 | `80287b38` on `decks` (2026-11-19) | Gate at `598dd0ee`: typecheck 0, 519 files and 12,025 tests, digest and stepper slow tests 0, build 0. **New digest pins: duel `790d090f:340520`, standard `56726d32:1056345`** (these replace the pins in section 2). C1 costs about 8% more bot time on one thread and gives no speed until C2. To watch: bot towns fell 10% on 4 of 5 seeds, not clear of chance; the likely cause is that a settler does not see towns founded earlier in the same step. A known gap that C1 did not cause: when a bot's whole great-person hand is spent, the refused pick that redraws it is not in the log, so such a save would not replay. The report and the C2 sketch are in `docs/plans/performance-pass-2026-11-06.md`, "Stage C: parallel bots from a frozen board", and `docs/bot-priorities.md`, "The turn's bot step: plans on a frozen board". Bot work is Astra's from this commit. |
| Ground paint texture, stages 1 and 2 | `085d5c13` on `decks` (2026-11-19) | Gate at `085d5c13`: typecheck 0, 520 files and 12,068 tests, build 0. A panning frame is about 19% shorter at the middle zoom, 15% at the farthest and 8% at the closest. **The timings were taken under heavy load and partly on battery with low power mode; rerun them on a quiet machine on power.** GPU memory falls by 91 MiB (standard map) and 363 MiB (Giant). Settings are under `painted.groundTexture` in `data/view3d.json`; `enabled: false` gives the old board. Open decisions, now Astra's to bring to the user: raise the band from 90 to 100 pixels a hex to 120 or 130; fix the beach and bank pieces that float among terraces on coastal and river hills (a fault that was on `decks` before this build); the Giant map's texture budget. Not measured: panning on the Giant map, another GPU or device ratio. All figures are in `docs/plans/ground-paint-texture-2026-11-18.md`, Part 3. Rendering work is Astra's from this commit. |

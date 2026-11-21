# Test repair after the paused test runs (2026-11-22)

For about three days the user paused test runs. In that time about twenty
pieces of UI work went into `decks` with tests "updated and not run". This
pass ran the UI and render tests on `decks`, sorted each failure into a test
fault or a code fault, and fixed the test faults. The user's ruling: "You're
free to modify tests at your pleasure." Code faults are written up here and
not fixed.

The run was on `decks` at `0984799e` ("Compendium: plain data notes and three
shorter rules pages").

## What was run

- Every core test file in `test/ui/` (163 files) and `test/render/` (107
  files), in batches of about 20 files.
- Seven files in `test/sim/` that this week's UI work changed:
  `combat.test.ts`, `state.test.ts`, `leaders.test.ts`, `tech.test.ts`,
  `prospect.test.ts`, `decks/devotionReview.test.ts`,
  `decks/devotionThemeCards.test.ts`.
- No `*.slow.test.ts` file, nothing in `test/stress/`, and no other file in
  `test/sim/` or `test/mapgen/`. Those belong to the other developer.
- The command, for each batch:
  `nice -n 15 npx vitest run <files> --reporter=dot --maxWorkers=4 --minWorkers=1`.
  With vitest 2.1.9, `--maxWorkers` alone fails with "options.minThreads and
  options.maxThreads must not conflict", so `--minWorkers=1` goes with it.

## Counts

| | Number |
|---|---|
| Files run | 277 (163 UI, 107 render, 7 sim) |
| Tests run | 5,446 (3,449 UI, 1,597 render, 400 sim) |
| Files that failed at first | 2 |
| Tests that failed at first | 2 |
| Tests fixed (test faults) | 1 |
| Code faults found | 1 |
| Expected failures left | 0 (none of the known pins is in the files run) |
| Unclear | 0 |

Final state, after the fix:

| Batch | First and last file | Files | Tests | Result |
|---|---|---|---|---|
| UI 00 | `abacusLayout` to `chairs` | 20 | 386 | pass |
| UI 01 | `charterShelf` to `compendium` | 20 | 471 | 1 fails (the code fault below) |
| UI 02 | `compendiumCharterTechs` to `faithPlates` | 20 | 433 | pass |
| UI 03 | `figures` to `keywordCards` | 20 | 376 | pass |
| UI 04 | `keywordCardStack` to `priceCell` | 20 | 537 | pass |
| UI 05 | `quietTable` to `seatNames` | 20 | 432 | pass |
| UI 06 | `seatRoster` to `topBarCost` | 20 | 308 | pass |
| UI 07 | `topBarSeatStrip` to `wonderPaintings` | 20 | 472 | pass |
| UI 08 | `workerMenu` to `yieldPrinters` | 3 | 34 | pass |
| Render 00 | `abacus3d` to `leaderBanners` | 20 | 445 | pass |
| Render 01 | `lens3d` to `paintedCitiesCache` | 20 | 264 | pass |
| Render 02 | `paintedFarLod` to `paintedShadows` | 20 | 167 | pass |
| Render 03 | `paintedShadowTargets` to `pantheonMarks` | 20 | 225 | pass |
| Render 04 | `picking3d` to `unitBars` | 20 | 404 | pass (1 failed before the fix) |
| Render 05 | `unitBodyStencil` to `yieldMarks` | 7 | 92 | pass |
| Sim | the seven named files | 7 | 400 | pass |

`npm run typecheck` passes (exit 0).

Most of the "not run" work was already put right before this pass. The
commit `8886505e` updated the replay and gallery checks, and `0984799e` ran
the eighteen Compendium and card text files and fixed five of their pins.

## Fixed tests

| File | Test | What it pinned | What it pins now | Why |
|---|---|---|---|---|
| `test/render/seatInks.test.ts` | every roster surface prints the pair > names a figure's colours on its shelf in the book, in words | The sentence "Its colours are X and Y." on each leader's Compendium page. | The label "Colours: X and Y." on the page, with the two words from the leader's row in the row's order. The check that no hex code reaches the page stays. | The Compendium pass `3e93b2dd` (2026-11-21) cut padding from leader pages on purpose. It moved the colours into the last clause, beside the city names: "Colours: Tyrian purple and sun gold. Cities, in the order you found them: ...". The fact the test protects, that a leader's colours are printed in words, still holds. |

## Code faults

### 1. A native tooltip on the city screen's citizen keys

- **Test:** `test/ui/cityPanelBuildList.test.ts` > no native tooltips, and
  Escape and scrolling > leaves no title on the city screen or the levy menu.
- **Symptom:** the source of `src/ui/cityPanel.ts` matches `/\.title = /`.
- **Cause:** `renderCitizenKeys` sets `key.title = label;` on each of the two
  keys (Worked, Pinned) that the bottom dock shows while Manage citizens is on
  (`src/ui/cityPanel.ts`, line 3705).
- **Commit:** `406e53e9` (2026-11-20), "City screen dock: keep every part
  inside the bar at narrow widths". Under 1360px the keys show the mark
  alone, and the commit put the word in a native tooltip and an
  `aria-label`.
- **The rule it breaks:** `docs/city-screen.md`, "No native tooltips": every
  `title` in `cityPanel.ts` and `levyMenu.ts` became a note in the panel's
  hover card (`noteOn`). This is problem 6 of `docs/plans/city-screen-audit.md`.
  Native tooltips take about a second, cannot be styled, and do not show on
  touch or on keyboard focus. The test dates from `bbf164e6` (UX7,
  2026-10-15).
- **Likely fix (not made):** replace `key.title = label;` with
  `noteOn(key, label);` and keep the `aria-label`. Then change the line in
  `docs/plans/citizen-hex-marks-2026-11-20.md` ("Narrow screens") that says
  the word is the key's tooltip.
- **The other reading:** the plan doc of the citizen marks names the tooltip,
  so the choice was deliberate. But it was the builder's way to fix an
  overflow, not a user ruling. The user's words were "check this overflow".
  If the user wants a native tooltip here, the test needs an exception for
  these two keys and `docs/city-screen.md` needs the same exception.

## Left for the other developer

- **Bot replay digests** (`test/sim/aiDigestPins.ts`) and **`RANGED_BOARDS`**
  in `test/sim/explore.test.ts` hold results from before the combat change of
  2026-11-21 (`SCHEMA_VERSION` 252, the flat river and naval rules). They need
  a new recording. This pass did not run them.
- **Whole-game replay pins** of any kind are in the same family. None was in
  the files run.
- **The rest of `test/sim/` and `test/mapgen/`** was not run. This week's UI
  work also changed `test/fixtures/cardText.json` and the notes in
  `data/units.json`, `data/buildings.json` and `data/techs.json`
  (`0984799e`). Its commit says that the eighteen files that pin Compendium and
  card text were run and pass. Readers of the fixture outside the files run
  here include `test/sim/cardTextSnapshot.test.ts` and five Dominion deck
  tests in `test/sim/decks/`.
- **The slow tier** (`*.slow.test.ts`, `test/stress/`) was not run.
- The branch that raises the schema to 253 is not merged, and this pass
  ignored it.

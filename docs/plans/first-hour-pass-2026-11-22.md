# The first hour: the guide and an old save (2026-11-22)

This pass covers rows 9 and 11 of `docs/plans/beta-checklist-2026-11-21.md`.
Rows 12 and 13 were not done (see the end).

**How it was checked: by reading the code only.** Nobody played the thirty
turns, and no screen was looked at in a browser. The user stopped the
play-through because of its cost. Each claim below is a reading of the source.

## 1. The guide

The guide a player meets is three things:

- the opening sequence, 11 steps (`STEPS` in `src/ui/tutorial.ts`);
- the one-time notes, 12 before this pass (`TIPS` in the same file);
- the pamphlet, 14 pages (`src/ui/pamphlet.ts`).

`src/ui/guideLessons.ts` (40 lesson rows, with `guideModel.ts`,
`guideSchedule.ts` and `guideStorage.ts`) is a second engine that nothing
mounts: `main.ts` imports none of it, and its rows have working titles and no
words. A player never sees it.

### The steps and notes

| Lesson | Does its trigger still fire? | State | Fix |
|---|---|---|---|
| Step `welcome` | Next button | Correct | None |
| Step `select` | `select:settler`, sent on each selection change | Correct | None |
| Step `found` | `foundCity` command | Did not explain the settler lens or the recommended sites | One sentence added: the tints, the key, the corner ticks |
| Steps `openChart`, `research`, `closeChart` | `techChartOpened`, `chooseResearch`, `techChartClosed`, all sent | Correct | None |
| Step `build` | `setCityProduction` command | Correct | None |
| Step `move` | `moveUnit` command | Did not explain the explorer lens | One sentence added: corner ticks on ruins and camps |
| Step `endTurn` | `endTurn` command | Correct | None |
| Step `meters` | Next button | Correct | None |
| Step `close` | Next button | Did not name the report | One sentence added: Report a problem, in the menu |
| Note `statecraft` | `statecraftOffer` event | Said "slots". The game says "chairs" | Word changed |
| Note `enemy` | `enemySeen` event | Named "the flag button". No such button exists: Diplomacy is the W key or a mark on the top-left panel | Sentence changed |
| Notes `discovery`, `combat`, `religion`, `trader`, `greatPerson`, `beads`, `starving`, `unhappy`, `overreach` | All their events are still sent from `main.ts` | Correct | None |

No step or note was impossible to complete. Two notes and two pamphlet pages
were wrong, and three steps did not explain new things.

The pamphlet: "slot" became "chair" on the Statecraft page, "the flag button"
became the W key and the Diplomacy mark on the War page, and the page "The fog
and the wild" is now "The fog and the barbarians".

Searched and not found in the guide's words: "tended", "wild land", the site
pennant, citizen outlines or dots, a percentage of combat strength, science
for each citizen, "costs N% less".

### The lesson row `tendedWork`

It is in the engine nobody mounts. Its id and its command tag stay, because
`guideStorage.ts` stores lesson ids. Its working title is now "Unique
improvement", with a comment that says why the id keeps the old word.

### What was new and not explained, and what covers it now

| New thing | Covered by |
|---|---|
| The settler lens and the recommended sites | Step `found` (one sentence) |
| The explorer lens | Step `move` (one sentence) |
| Manage citizens, Buy tiles, Leave city | New note `citizens`, raised by the first build order, when the player is in the city screen |
| Worker advice and the advice panel | New note `workerAdvice`, raised when a worker is first selected |
| Fortify until healed (U) | New note `healing`, raised by the player's first attack |
| Report a problem | Step `close` (one sentence) |

Not covered, on purpose, to keep the guide short: the first government, and
Doctrines. The first draft and the first pantheon already had notes.

### Not checked, and the user should look

- **The pamphlet's 13 pictures** (`public/pamphlet/*.png`) are screenshots
  from before the November builds. The city screen, the lenses and the corner
  panel look different now. They need a recapture.
- The note `citizens` appears on top of the city screen, at the same moment
  the `build` step completes. Its place on screen was not looked at.
- `docs/pamphlet.md` still says "the flag button" and "The fog and the wild".

## 2. An old save

`SCHEMA_VERSION` is 256 (`src/sim/state.ts`). The game converts nothing.

| Where the save enters | Before | After |
|---|---|---|
| Boot: Continue and "Recent worlds" on the title | The save was left out of the list with no word. Continue was hidden. To the player the save had vanished. No crash | The title prints: "A saved game in this browser is from another build of the game and cannot continue here. Start a new game. The saved game was not deleted." |
| The Load sheet | The same silent gap | The same sentence, under the list |
| Import a file | "That save is from rules version 255; this build plays version 256. This is a pre-release build: saves are not migrated between versions." | "This save is from an older build of the game and cannot continue here (save version 255; this build plays version 256). Start a new game. Your file is not changed." It says "a newer build" when the number is higher |
| Import a report file | The same sentence as a save | The same new sentence, then "Build abc1234 made this report." from the report's build stamp |

The code: `otherBuildSaves`, `otherBuildSavesNotice` and the new sentences in
`readSaveEnvelope` (`src/ui/saves.ts`); the two places that print the notice
(`refreshResumeRow` in `src/main.ts`, `refresh` in `src/ui/savesPanel.ts`);
two new elements in `index.html`. Nothing in `src/sim/` changed.

**One thing the sentence cannot promise.** A named save stays in the browser
until the player deletes it. An old *autosave* stays only until the next game
autosaves, because a new game writes the same autosave slot. The sentence is
true when it is shown. To keep an old autosave for longer, the game would have
to copy it to another slot first. That is not built.

The checkpoint store (`saveCheckpoints.ts`) already ignores a record of
another version and loads from the log. It needed no change.

## 3. The smallest window and a second browser (rows 12 and 13)

- **Not done.** The audit at 1280x720, 1152x720 and 1024x768 and the WebKit
  check were dropped because of their cost. The smallest usable size is still
  not known. Checked sizes remain 1440x900 and 1280x800.
- **Why:** each needs a browser session with many screenshots.
- **For the user to try by hand in WebKit**, most likely to differ first:
  - pictures loaded as separate files (leader portraits, government
    paintings, belief pictures, the pamphlet's pictures);
  - the report's clipboard copy (WebKit allows a clipboard write only inside
    the click that asked for it);
  - the report's file download, and the file input of Import a file;
  - the painted board (WebGL2: any float render target, instanced drawing,
    and the board's worker; this pass did not read which of these it uses);
  - saves kept in `localStorage` and IndexedDB (Safari clears site data after
    seven days without a visit);
  - CSS: `text-wrap: balance`, `:has()`, container queries, `backdrop-filter`
    (needs the `-webkit-` prefix on older Safari);
  - `structuredClone` and module workers (both need Safari 15.4 or later).

## 4. For the other developer

- **`data/decks/expansionist.json`: 14 rows say "tended" in their text, and
  all 14 are `retired: true`.** No live row in any deck file says it. The
  rows: Six Gardens, The Garden Frontier, The Landscape Garden, The Tended
  Country, The Long Tending, The Managed Wild, The Raising of the Land, The
  Garden of the World, The Heartland, The Inheritance of Fields, The Two
  Harvests, The Wildwood Compact, The Garden Peoples, Arcadia. A retired row
  keeps its Compendium page only if that shelf shows retired rows.
- `data/rules.json` line 70 has a condition `{ "test": "tended" }`. It is an
  identifier, not player text.
- Nothing wrong was found in sim text, but sim text was not read in this pass.

## 5. Tests

- `test/ui/tutorial.test.ts`: the three new notes, their triggers, the labels
  they name read from the screens' source, and no removed word.
- `test/ui/saves.test.ts`: an older save on Import; an older autosave at boot
  and in the Load sheet (in no list, counted, nothing deleted); both surfaces
  print the notice.
- `test/ui/problemReport.test.ts`: an older report names its build.

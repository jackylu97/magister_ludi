# Beta checklist (2026-11-21, updated 2026-11-22)

The closed beta is **single-player against bots** (the user, 2026-11-21:
"Single player for now yeah"). The user's principle for it: "For now, i want
the game to be fun over balanced for playtesters."

Owners: **A** is Astra (bots, rendering, models, rules and card builds).
**C** is the Claude session (UI and gameplay design). **U** is the user.

## A. Must be done

| # | Item | Owner | State |
|---|---|---|---|
| 1 | Build the Scientific deck | A | **Done** by Astra (save version 256): 87 Orders, 15 Doctrines, 17 charters. |
| 2 | Build the Devotion deck | A | **Done** by Astra (save version 256): 105 Orders, 17 Doctrines; rites report their length and the turns left. |
| 3 | Models and icons for the new Devotion and Scientific things | A | **Done** by Astra: the smelter, stone circle, cliff monastery, Bell Tower, Great Archive and Glasshouse have models and icons. |
| 4 | The cathedral rework | U, then A or C | **Not defined in any file.** The user asked for it on the list; the Claude session has asked what it holds. |
| 5 | The full test suite green (`npm run test:all`), with replay pins recorded | A | **To confirm with Astra.** The handoff reports two bot games and the build, and does not say that `npm run test:all` passed on version 256. |
| 6 | One whole game played by a person, to a win and to a loss | U | Not done on this build. The Claude session fixes what it finds. |
| 7 | Bots with all six new decks: they pick the cards, build the improvements and finish a game; late turns stay fast | A | **Done** on version 256: six bots completed 120 turns on the duel and the standard board with no rejected command and no stalled turn. Late turn time is not reported. |
| 8 | Plain Fortify wakes for an enemy in sight | C | **Done** (save version 255). Astra to run a bot game, because the change touched `src/ai/bot.ts`. |

## B. Should be done

| # | Item | Owner | State |
|---|---|---|---|
| 9 | The first hour: the guide's lessons and the Compendium agree with the game as built (no "tended", the new lenses, the city screen's mode, Fortify until healed, the advice panel) | C | **Done by reading the code, not by play** (`docs/plans/first-hour-pass-2026-11-22.md`). No step was impossible to complete. Two notes and two pamphlet pages named things that are gone ("slots", "the flag button") and are fixed. Three steps gained one sentence each, and three one-time notes are new (Manage citizens, worker advice, Fortify until healed). **Open:** nobody played the thirty turns, and the pamphlet's 13 pictures are from before the November builds. |
| 10 | A way to report: a version stamp on screen, and a button that exports the save with a note | C | Built. The game menu shows the build (the short git commit) and the save version. "Report a problem…" saves one file with the note, the screen, the last errors and the save, and copies a summary. Nothing is sent. Load, then Import a file, opens a report and replays it (`docs/README.md`, "The build stamp and Report a problem"). |
| 11 | An old save gives a clear message, not a crash; the save version holds still once the beta starts | A, C | **Message built, checked by unit tests, not seen in a browser.** Before, an older save or autosave vanished from Continue and the Load sheet with no word. Now the title and the Load sheet say that it is from another build, that the player can start a new game, and that it was not deleted. Import a file says the same with both version numbers, and an old report names the build that made it. **Open:** an old autosave is replaced when the next game autosaves, and the version (256) must hold still (A). |
| 12 | The smallest window the game supports, stated in the invitation or tested | C | **Not done.** The audit at 1280x720, 1152x720 and 1024x768 was dropped on 2026-11-22 because of its cost. Checked at 1440x900 and 1280x800 only. |
| 13 | A second browser (the user's is WebKit) | C, U | **Not done.** Only Chrome was used for checks. Section 3 of `docs/plans/first-hour-pass-2026-11-22.md` lists what the user should try by hand in WebKit. |
| 14 | A resource picker for composing a strategic resource offer on the diplomacy screen | C | Built. Each tray has a strategic group after the luxuries: the free copies on each chip, a struck chip with the sim's reason when none is free, and a hover note when the receiver cannot use it yet. The paper, the drawer and the peace terms name the loan (`docs/README.md`, "Strategic resources in an offer"). |
| 15 | Wonders on the board: one model for a city that holds any wonder | A | **Done** by Astra: one landmark a city, which changes with the owner's age. |

## C. Settled, no work

- The unit pieces stay as they are. The kit in `art/unit-kit-trial/` is shelved.
- A game of 118 to 150 turns is the right length.
- Age 5 comes after the beta.
- The coastal city rule is built. Watch it in the playtest; the user was
  undecided about it.
- Strong card combinations are left uncapped on purpose. Each closed deck
  plan lists its own under "Known strong combinations".

## D. After the beta starts

- The 137 great-person portraits, the 33 belief pictures and a title
  painting: prompts in `docs/plans/splash-art-prompts-2026-11-21.md`.
- Balance, from what playtesters report. First to look at: The Rites
  Commonwealth with long rites, the uncapped authority readers in Devotion,
  The Second Seat with The Royal Academies, the qanat against the stepwell,
  The Offered Stones (the user's first cut if cards must go).
- Data fields the Compendium pass asked for: flavour on units and buildings,
  what a leader's unit replaces, markers for the Temple and the Relic.
- Thirteen great-person rows whose id is another person's name
  (`heroOfAlexandria` is Amanitore, `ibnBattuta` is Ibn Jubayr,
  `cosimoDeMedici` is Jacques Cœur, and the ten other rows of
  `docs/plans/great-people-cultures-2026-11-21.md`): rename with a save
  version change.
- Remote multiplayer.

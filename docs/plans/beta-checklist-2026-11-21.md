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
| 5 | The full test suite green (`npm run test:all`), with replay pins recorded | A | The released version 256 passed 12,949 tests in 613 files on `df460761`. The bot review build on `c826d577` (version 257) passed all 12,996 tests in 615 files, typechecking and the production build. Both include the duel and standard replay checks. |
| 6 | One whole game played by a person, to a win and to a loss | U | Not done on this build. The Claude session fixes what it finds. |
| 7 | Bots with all six new decks: they pick the cards, build the improvements and finish a game; late turns stay fast | A | **A standard six-leader game finished.** Mansa Musa won seed 42 on turn 146 with no driver warnings or stalled turns. Its last 20 full turns took a median of 11.6 seconds and a 95th percentile of 20.4 seconds under concurrent load. Six-seat duel and standard replay checks also passed at turn 120 on the released build. The [bot audit](../audit/bot-play-2026-11-21.md) covers worker choices, deck results and captures. On the candidate, six named leaders took Orders from all six decks and built new works. On version 257, separate standard games timed the same turns (91–110) on the M4. The baseline median was 1.61 s (95th percentile 2.79 s). The candidate median was 1.92 s (95th percentile 2.39 s), with 17% more commands. |
| 8 | Plain Fortify wakes for an enemy in sight | C | **Done.** Version 255 added the wake condition. The version 256 six-seat games completed both maps with the change. |

## B. Should be done

| # | Item | Owner | State |
|---|---|---|---|
| 9 | The first hour: the guide's lessons and the Compendium agree with the game as built (no "tended", the new lenses, the city screen's mode, Fortify until healed, the advice panel) | C | **Done by reading the code, not by play** (`docs/plans/first-hour-pass-2026-11-22.md`). No step was impossible to complete. Two notes and two pamphlet pages named things that are gone ("slots", "the flag button") and are fixed. Three steps gained one sentence each, and three one-time notes are new (Manage citizens, worker advice, Fortify until healed). **Open:** nobody played the thirty turns, and the pamphlet's 13 pictures are from before the November builds. |
| 10 | A way to report: a version stamp on screen, and a button that exports the save with a note | C | Built. The game menu shows the build (the short git commit) and the save version. "Report a problem…" saves one file with the note, the screen, the last errors and the save, and copies a summary. Nothing is sent. **Playtest check, 2026-11-21.** The 5199 checkout was at `e09c6a35`, but its running Vite server sent `86813011` as the report commit. Recheck the stamp after a server restart. Load, then Import a file, opens a report and replays it (`docs/README.md`, "The build stamp and Report a problem"). |
| 11 | An old save gives a clear message, not a crash; the save version holds still once the beta starts | A, C | **Verified in an isolated Chrome profile on `e09c6a35` (2026-11-21).** The title and Load sheet showed the notice for a version 255 save. Import showed both versions, and a report named its original build. Reading or importing the files left them untouched. The first new autosave replaced the old rolling slot. The separate named save remained unchanged. Keep save version 256 during the beta. |
| 12 | The smallest window the game supports, stated in the invitation or tested | C | **Not done.** The audit at 1280x720, 1152x720 and 1024x768 was dropped on 2026-11-22 because of its cost. Checked at 1440x900 and 1280x800 only. |
| 13 | A second browser (the user's is WebKit) | C, U | **Not done.** Only Chrome was used for checks. Section 3 of `docs/plans/first-hour-pass-2026-11-22.md` lists what the user should try by hand in WebKit. |
| 14 | A resource picker for composing a strategic resource offer on the diplomacy screen | C | Built. Each tray has a strategic group after the luxuries: the free copies on each chip, a struck chip with the sim's reason when none is free, and a hover note when the receiver cannot use it yet. The paper, the drawer and the peace terms name the loan (`docs/README.md`, "Strategic resources in an offer"). |
| 15 | Wonders on the board: one model for a city that holds any wonder | A | **Done** by Astra: one landmark a city, which changes with the owner's age. |

## B2. Carried from the first checklist (`docs/beta-checklist.md`, 2026-11-16 to 2026-11-19)

The Claude session found on 2026-11-22 that an older checklist held items
that this file had missed. Their state today:

| Item | Owner | State |
|---|---|---|
| **Citizens count faith, science and culture when they choose a hex** | A, C | Claude merged all six yields and a food safeguard in save version 257. The bot's focus forecast still needs to use the same safeguard. See the [bot audit](../audit/bot-play-2026-11-21.md). |
| **Age I pacing** | A, C | The seven approved changes are on `codex/first-age-handoff` for review. Measure time in each age again on version 258. |
| **A check of the card yield figures** | C | **Still open.** The user saw figures on cards that looked wrong. Examples were never collected. |
| **Difficulty levels** | A, C | The fifteen cumulative tiers are specified. The beta proposal covers tiers zero through five. Tier thirteen depends on the wager rework. See the [difficulty rulings](wagers-and-first-age-options-2026-11-22.md). |
| **The wager rework** | U | The design pays for a fixed goal and for leading at the close of the age. The cost of a failed stake and the wager list are open. |
| **The tutorial** | C to design, A to build | In discussion (2026-11-22). The guide's stale lessons are being fixed now; the designed tutorial is a separate job. |
| **Changes to the other screens after In play shipped** (Faith sheet, Reliquary, Ledger overlap with In play) | C | Not done. Can wait for testers. |
| Deck polish; the leader roster; choosing worked hexes; the city screen | | **Done** (the six deck passes, the roster of sixteen, the city screen's mode and scrim). |
| A fifth age | | After the beta (ruled 2026-11-21). |

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

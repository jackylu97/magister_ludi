# Beta checklist (2026-11-21)

The closed beta is **single-player against bots** (the user, 2026-11-21:
"Single player for now yeah"). The user's principle for it: "For now, i want
the game to be fun over balanced for playtesters."

Owners: **A** is Astra (bots, rendering, models, rules and card builds).
**C** is the Claude session (UI and gameplay design). **U** is the user.

## A. Must be done

| # | Item | Owner | State |
|---|---|---|---|
| 1 | Build the Scientific deck | A | Design closed: `docs/plans/scientific-design-pass-2026-11-20.md`, "Ready for the build". |
| 2 | Build the Devotion deck | A | Design closed with the user's last comments: `docs/plans/devotion-design-pass-2026-11-20.md`, "Ready for the build". |
| 3 | Models and icons for the new Devotion and Scientific things | A | Needed: the stone circle, the cliff monastery, the smelter, the Bell Tower, the Great Archive, the Glasshouse (a rename). A missing board prop stops the game at load, so each needs a model or a safe fallback. The Expansionist improvements have their models. |
| 4 | The cathedral rework | U, then A or C | **Not defined in any file.** The user asked for it on the list; the Claude session has asked what it holds. |
| 5 | The full test suite green (`npm run test:all`), with replay pins recorded | A | The UI and render tests pass (277 files, `docs/plans/test-repair-2026-11-22.md`). The gate to `main`. |
| 6 | One whole game played by a person, to a win and to a loss | U | Not done on this build. The Claude session fixes what it finds. |
| 7 | Bots with all six new decks: they pick the cards, build the improvements and finish a game; late turns stay fast | A | Two six-seat maps reached turn 121 on version 254 with no stall. Repeat after the last two decks. |
| 8 | Plain Fortify wakes for an enemy in sight | C | **Done** (save version 255). Astra to run a bot game, because the change touched `src/ai/bot.ts`. |

## B. Should be done

| # | Item | Owner | State |
|---|---|---|---|
| 9 | The first hour: the guide's lessons and the Compendium agree with the game as built (no "tended", the new lenses, the city screen's mode, Fortify until healed, the advice panel) | C | Not started. After the two deck builds, so that it is done once. |
| 10 | A way to report: a version stamp on screen, and a button that exports the save with a note | C | Not started. |
| 11 | An old save gives a clear message, not a crash; the save version holds still once the beta starts | A, C | To check. The version is 254 today. |
| 12 | The smallest window the game supports, stated in the invitation or tested | C | Checked at 1440x900 and 1280x800 only. |
| 13 | A second browser (the user's is WebKit) | C, U | Only Chrome was used for checks. |
| 14 | A resource picker for composing a strategic resource offer on the diplomacy screen | C | Astra built the loans; offers and treaties already name the resource. |
| 15 | Wonders on the board: one model for a city that holds any wonder | A | Ruled 2026-11-21. |

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
- Eighteen great-person rows whose id is another person's name
  (`heroOfAlexandria` is Amanitore, `ibnBattuta` is Ibn Jubayr,
  `cosimoDeMedici` is Jacques Cœur, and the fifteen other rows of
  `docs/plans/great-people-cultures-2026-11-21.md`): rename with a save
  version change.
- Remote multiplayer.

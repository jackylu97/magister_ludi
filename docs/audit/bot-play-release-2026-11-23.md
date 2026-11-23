# Bot playtest release, 23 November

## User decision

The user considers the current bot strength acceptable and approved putting
the combat changes on the playtest branch. This replaces the earlier hold
on port 5199. Do not delay this release for further strength tuning.

Enable the tested per-unit tactical planner. Keep the tested combat weights
and existing economy settings. Useful sacrifices remain allowed. The original
policy stays available through `tactics.enabled: 0` for later comparisons.

## Integration

- Combat source: `fb94ab64`, branch `codex/bot-position-262`.
- Gameplay source: `7887ac4b`, branch `decks`, save version 266.
- Integration branch: `codex/bot-play-2026-11-23`.
- Previous play clone: `a033e91c`, branch `deck-themes`, save version 264.
- The clone at `/Users/jacky/code/webciv-play` serves port 5199. Its branch
  receives the validated `decks` head by a local fast-forward pull.
- Rollback tag: `codex/play-before-combat-2026-11-23` at `a033e91c`.
- Release tag: `codex/combat-play-2026-11-23`.
- Keep unrelated working files and the existing Vite process untouched.

The bot change does not alter save replay. The newer gameplay rules require
version 266 saves, so the previous version 264 game needs the older build.
The historical combat comparisons used version 262. Their strength and timing
results are not fresh measurements of the combined version 266 rules.

## Remaining bot work

1. Implement the new trade-pricing handoff: value gold now above deferred gold,
   price resources by actual need and copy count, value cities from their
   contents, and use the same fair-trade checks for humans and bots. The
   strategic-resource quantity rules have landed; the bot pricing remains open.
2. Price bought tiles from the simulation's current cost and the yields the
   tile adds to its city. The old estimate still reads an unscaled base price.
3. Reuse unaffected decisions after a changed combat situation interrupts a
   frozen plan. This is the main remaining runtime task.
4. Improve civilian escorts across turns. The new local check covers a civilian
   on the soldier's tile; it does not plan the civilian's escape or a handover.
5. Coordinate city assaults: ranged attacks first, useful melee trades, room
   for the next attacker, and a surviving unit to take the city.
6. Improve future-threat estimates without expanding the search. Alternate
   origins are covered, but projected blockers can change intermediate paths.
7. Revisit valuation gaps in weaker economies, especially Orders that require
   investment or delayed rewards. Keep the previous grid-search settings fixed
   until a separate experiment justifies a change.
8. Run a later balance comparison across all leaders. Record Orders, Doctrines,
   wonders and leader effects, including possible weak choices. Magisterial
   remains a priority for that review. This is separate from combat validation.

More maps and mixed-policy games can check regressions after release. They are
not an additional strength target that blocks this approved playtest.

## Validation

- Typecheck: exit 0.
- Core suite: 575 files and 13,045 tests passed, exit 0.
- Full suite: 625 files and 13,217 tests passed, exit 0.
- Production build: exit 0, with the existing large-chunk warning.
- Both six-seat games completed 120 turns without warnings or stalls. Their
  saved command logs replayed to the exact final state.
- Final replay pins: duel `c86d21d1:430323`; standard `3c17801f:1173951`.
- The full suite also passed the 100-turn spectator/driver comparison and
  the 60-turn worker/page comparison, including identical logs and states.

Checks ran serially at low priority, with at most three test workers. The full
suite took about twenty minutes. This is a correctness result, not a new
bot-strength or browser-performance measurement.

The integration adapts the planner to the fixed fortification bonus and the
renamed war-loss module. Tests of the original policy select it explicitly;
the per-unit planner keeps its own tactical tests and the shared driver checks.
Economy fixtures neutralize the new unhappiness penalty where the test checks
an unrelated yield source. The production grant test now expects every queued
item that the new production rules can complete.

The phase-end diagnostic also found a newly available resource swap after the
diplomacy phase had closed. Like a changed research choice, it waits until the
next sitting. The diagnostic still requires identical commands and state, and
rejects unfinished unit or city decisions. No scheduling rule changed here.

The first full run caught a spectator/driver mismatch in the 100-turn
comparison. `askForCommands` dropped the tactical origin when it discarded
the explanation tree. That changed the guards on attacks and omitted guards
on tactical moves. It now keeps the origin as execution metadata while still
releasing the scores. A focused regression compares the two plans' commands
and tactical guards. The separate 100-turn comparison then passed with an
identical command log and state. Its saved log replayed exactly, and the
personality comparison also passed.

The next duel exposed a repeated escort order at turn 62. An idle warrior
received a meeting order, stayed blocked behind a garrison, then received the
same move for a different settler. The idle-unit path had not marked the
escort order as sent. `escortDuty` now records it for both callers. The
captured turn completes without a repeated or refused command, and a compact
regression covers the changed settler assignment.
